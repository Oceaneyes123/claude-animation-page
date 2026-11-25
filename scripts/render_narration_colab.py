#!/usr/bin/env python3
"""Render narration on a Google Colab GPU via google-colab-cli.

Connects to Google Colab through ``colab`` (directly on Linux/WSL, or via
``wsl -d Ubuntu-22.04`` on Windows, matching ``untold-stories/tools/narrate-colab.md``),
automatically resolves saved voice profile settings and reference audio from
VoiceStudio's local database (defaulting to ``Reid``), batches the script with
``scripts/render_narration.py``, executes ``openbmb/VoxCPM2`` on the Colab GPU,
downloads the rendered batch WAVs, stitches the final ``narration.wav``, and
stops the Colab VM when finished.

Examples:
    python scripts/render_narration_colab.py --status
    python scripts/render_narration_colab.py --list-voices
    python scripts/render_narration_colab.py shorts/03-lapaz/SCRIPT.md --dry-run
    python scripts/render_narration_colab.py shorts/04-bolinao/SCRIPT.md --preview --keep
    python scripts/render_narration_colab.py shorts/04-bolinao/SCRIPT.md -o shorts/04-bolinao/narration.wav
    python scripts/render_narration_colab.py --stop-session claude-animated-narration
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import re
import shlex
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from zipfile import ZipFile

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from render_narration import (  # noqa: E402
    DEFAULT_VOICE,
    build_batches,
    log,
    parse_script_text,
    read_wav_float32,
    stitch_batches,
)

DEFAULT_WSL_DISTRO = "Ubuntu-22.04"
DEFAULT_GPU = "L4"
DEFAULT_SESSION_PREFIX = "narrate"
DEFAULT_MODEL = "openbmb/VoxCPM2"
VOXCPM_PIP_SPEC = "voxcpm==2.0.3"
REMOTE_DIR = "narrate_job"
_WINDOWS_DRIVE_RE = re.compile(r"^([A-Za-z]):[\\/](.*)$")
_BALANCE_RE = re.compile(r"Current\s+balance:\s*([0-9]+(?:\.[0-9]+)?)\s*compute\s+units", re.IGNORECASE)
_USAGE_RATE_RE = re.compile(r"Usage\s+rate:\s*([0-9]+(?:\.[0-9]+)?)\s*/hr", re.IGNORECASE)
_ACTIVE_ASSIGNMENTS_RE = re.compile(r"Active\s+assignments:\s*([0-9]+)", re.IGNORECASE)


def parse_usage_info(usage_output: str) -> dict[str, float | int | None]:
    """Parse compute unit balance, burn rate, and active assignments from `colab usage`."""
    balance_m = _BALANCE_RE.search(usage_output)
    rate_m = _USAGE_RATE_RE.search(usage_output)
    active_m = _ACTIVE_ASSIGNMENTS_RE.search(usage_output)
    return {
        "balance": float(balance_m.group(1)) if balance_m else None,
        "usage_rate": float(rate_m.group(1)) if rate_m else None,
        "active_assignments": int(active_m.group(1)) if active_m else None,
    }


def _safe_usage_info(cli: ColabCLI) -> dict[str, float | int | None] | None:
    try:
        return parse_usage_info(cli.usage())
    except Exception as exc:  # noqa: BLE001 — usage reporting must never fail a render
        log(f"Warning: could not read Colab compute unit balance ({exc})")
        return None


def _read_omnivoice_env_dir() -> str | None:
    env_file = Path.home() / ".config" / "omnivoice" / "env"
    if not env_file.is_file():
        return None
    for raw_line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        if key.strip() == "OMNIVOICE_DATA_DIR":
            return val.strip().strip("'\"").replace("\\\\", "\\")
    return None


def find_voicestudio_data_dir() -> Path | None:
    """Locate VoiceStudio/OmniVoice data directory containing omnivoice.db."""
    candidates: list[Path] = []
    if env_val := os.environ.get("OMNIVOICE_DATA_DIR", "").strip():
        candidates.append(Path(env_val))
    if cfg_val := _read_omnivoice_env_dir():
        candidates.append(Path(cfg_val))
    if sys.platform == "win32":
        if appdata := os.environ.get("APPDATA"):
            candidates.append(Path(appdata) / "OmniVoice")
        candidates.append(Path(r"D:\VoiceStudio\OmniVoice"))
    else:
        candidates.append(Path.home() / ".omnivoice")
        candidates.append(Path("/mnt/d/VoiceStudio/OmniVoice"))

    for cand in candidates:
        if (cand / "omnivoice.db").is_file():
            return cand
    return None


def load_voicestudio_profiles(data_dir: Path | None = None) -> tuple[Path | None, list[dict[str, Any]]]:
    """Load saved VoiceStudio voice profiles from omnivoice.db."""
    root = data_dir or find_voicestudio_data_dir()
    if root is None:
        return None, []
    db_path = root / "omnivoice.db"
    if not db_path.is_file():
        return root, []

    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT id, name, ref_audio_path, ref_text, instruct, language, "
            "locked_audio_path, seed, is_locked, kind "
            "FROM voice_profiles ORDER BY created_at ASC"
        ).fetchall()
        return root, [dict(r) for r in rows]
    finally:
        conn.close()


def resolve_voicestudio_voice(voice: str, data_dir: Path | None = None) -> dict[str, Any]:
    """Resolve a VoiceStudio voice name or ID and its reference audio path."""
    root, profiles = load_voicestudio_profiles(data_dir)
    if not profiles:
        raise SystemExit(
            "Could not find VoiceStudio profiles (omnivoice.db). "
            "Pass --ref-audio explicitly or set OMNIVOICE_DATA_DIR."
        )

    match: dict[str, Any] | None = None
    for p in profiles:
        if p.get("id") == voice:
            match = p
            break
    if match is None:
        key = voice.strip().casefold()
        matches = [p for p in profiles if (p.get("name") or "").strip().casefold() == key]
        if len(matches) == 1:
            match = matches[0]
        elif len(matches) > 1:
            ids = ", ".join(f"{m['id']} ({m['name']})" for m in matches)
            raise SystemExit(f"Ambiguous voice name {voice!r}. Pass an exact ID: {ids}")

    if match is None:
        available = ", ".join(f"{p['name']} [{p['id']}]" for p in profiles)
        raise SystemExit(f"Voice profile {voice!r} not found. Available: {available}")

    voices_dir = root / "voices"
    rel_audio = (
        match.get("locked_audio_path")
        if match.get("is_locked") and match.get("locked_audio_path")
        else match.get("ref_audio_path")
    )
    ref_audio_path: Path | None = None
    if rel_audio:
        candidate = Path(rel_audio)
        ref_audio_path = candidate if candidate.is_absolute() else (voices_dir / candidate)
        if not ref_audio_path.is_file():
            raise SystemExit(f"Reference audio for voice {match['name']!r} not found: {ref_audio_path}")
    elif match.get("kind") != "design":
        raise SystemExit(f"Voice profile {match['name']!r} has no reference audio file.")

    return {
        "data_dir": root,
        "id": match["id"],
        "name": match["name"],
        "kind": match.get("kind"),
        "ref_audio_path": ref_audio_path,
        "ref_text": (match.get("ref_text") or "").strip(),
        "instruct": (match.get("instruct") or "").strip(),
        "language": match.get("language") or "Auto",
        "seed": match.get("seed"),
    }


def cmd_list_voices(data_dir: Path | None = None) -> None:
    root, profiles = load_voicestudio_profiles(data_dir)
    if not profiles:
        print("No VoiceStudio profiles found (omnivoice.db not located).")
        return
    print(f"VoiceStudio profiles ({root / 'omnivoice.db'}):")
    for p in profiles:
        audio = p.get("ref_audio_path") or "-"
        has_text = "yes" if (p.get("ref_text") or "").strip() else "no"
        print(
            f"  - {p.get('id')} | {p.get('name')!r:14s} "
            f"| kind={p.get('kind')} | lang={p.get('language')} "
            f"| seed={p.get('seed')} | ref_text={has_text} | audio={audio}"
        )


def to_wsl_path(path: Path) -> str:
    """Convert a Windows path to a WSL /mnt/<drive>/... path."""
    resolved = str(path.resolve())
    match = _WINDOWS_DRIVE_RE.match(resolved)
    if match:
        drive = match.group(1).lower()
        rest = match.group(2).replace("\\", "/")
        return f"/mnt/{drive}/{rest}"
    return resolved.replace("\\", "/")


class ColabCLI:
    """Thin wrapper around google-colab-cli running natively or inside WSL."""

    def __init__(self, *, wsl_distro: str = DEFAULT_WSL_DISTRO, verbose: bool = False) -> None:
        self.wsl_distro = wsl_distro
        self.verbose = verbose
        self.use_wsl = sys.platform == "win32" and shutil.which("colab") is None

    def to_cli_path(self, path: Path) -> str:
        return to_wsl_path(path) if self.use_wsl else str(path.resolve())

    def _build_cmd(self, args: list[str], *, env: dict[str, str] | None = None) -> list[str]:
        if not self.use_wsl:
            return ["colab", *args]
        exports = ['export PATH="$HOME/.local/bin:$PATH"']
        if env:
            for k, v in env.items():
                exports.append(f"export {k}={shlex.quote(str(v))}")
        quoted = " ".join(shlex.quote(a) for a in args)
        bash_cmd = "; ".join(exports) + f"; colab {quoted}"
        return ["wsl", "-d", self.wsl_distro, "--", "bash", "-lc", bash_cmd]

    def run(
        self,
        args: list[str],
        *,
        stdin_text: str | None = None,
        stream: bool = True,
        check: bool = True,
        env: dict[str, str] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        cmd = self._build_cmd(args, env=env)
        sub_env = ({**os.environ, **env} if (env and not self.use_wsl) else None)
        if self.verbose:
            log(f"CMD: {' '.join(cmd)}")

        if not stream:
            proc = subprocess.run(
                cmd,
                input=stdin_text,
                text=True,
                capture_output=True,
                encoding="utf-8",
                errors="replace",
                env=sub_env,
            )
            if check and proc.returncode != 0:
                detail = (proc.stderr or proc.stdout or "").strip()
                raise RuntimeError(f"colab {' '.join(args[:2])} failed (exit {proc.returncode}): {detail}")
            return proc

        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE if stdin_text is not None else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
            env=sub_env,
        )
        assert proc.stdout is not None
        if stdin_text is not None and proc.stdin is not None:
            proc.stdin.write(stdin_text)
            proc.stdin.close()

        lines: list[str] = []
        for line in proc.stdout:
            lines.append(line)
            print(line, end="", flush=True)
        returncode = proc.wait()
        output = "".join(lines)
        if check and returncode != 0:
            raise RuntimeError(f"colab {' '.join(args[:2])} failed (exit {returncode}): {output.strip()}")
        return subprocess.CompletedProcess(cmd, returncode, stdout=output, stderr="")

    def sessions(self) -> str:
        return self.run(["sessions"], stream=False).stdout

    def usage(self) -> str:
        return self.run(["usage"], stream=False).stdout

    def new(
        self,
        session: str,
        *,
        gpu: str | None = DEFAULT_GPU,
        high_mem: bool = False,
        assign_retries: int | None = None,
    ) -> None:
        args = ["new", "-s", session]
        if gpu and gpu.upper() != "CPU":
            args.extend(["--gpu", gpu.upper()])
        if high_mem:
            args.append("--high-mem")
        env = {"COLAB_CLI_ASSIGN_RETRIES": str(assign_retries)} if assign_retries is not None else None
        self.run(args, stream=True, env=env)

    def stop(self, session: str) -> None:
        self.run(["stop", "-s", session], stream=True, check=False)

    def upload(self, session: str, local_path: Path, remote_path: str) -> None:
        self.run(["upload", "-s", session, self.to_cli_path(local_path), remote_path], stream=True)

    def download(self, session: str, remote_path: str, local_path: Path) -> None:
        local_path.parent.mkdir(parents=True, exist_ok=True)
        self.run(["download", "-s", session, remote_path, self.to_cli_path(local_path)], stream=True)

    def install(self, session: str, packages: list[str]) -> None:
        self.run(["install", "-s", session, *packages], stream=True)

    def exec_code(self, session: str, code: str, *, timeout: float = 3600.0) -> str:
        res = self.run(
            ["exec", "-s", session, "--timeout", str(timeout)],
            stdin_text=code if code.endswith("\n") else code + "\n",
            stream=True,
        )
        return res.stdout


def _session_exists(sessions_output: str, session: str) -> bool:
    pattern = re.compile(rf"(?:^|[\s\[]){re.escape(session)}(?:[\s\]]|$)")
    return any(pattern.search(line) for line in sessions_output.splitlines())


def _default_session_name(output_path: Path) -> str:
    slug = re.sub(r"[^a-z0-9-]+", "-", output_path.parent.name.lower()).strip("-")
    slug = (slug or "short")[:16]
    digest = hashlib.sha1(str(output_path.resolve()).encode("utf-8")).hexdigest()[:6]
    return f"{DEFAULT_SESSION_PREFIX}-{slug}-{digest}"


def _config_fingerprint(
    *,
    voice_id: str | None,
    ref_audio_path: Path | None,
    ref_text: str | None,
    instruct: str | None,
    seed: int | None,
    num_step: int,
    guidance_scale: float,
    use_prompt_continuation: bool,
    trim_silence: bool,
) -> str:
    ref_sha = hashlib.sha256(ref_audio_path.read_bytes()).hexdigest()[:16] if ref_audio_path else None
    payload = {
        "model": DEFAULT_MODEL,
        "voice_id": voice_id,
        "ref_sha256": ref_sha,
        "ref_text": ref_text or "",
        "instruct": instruct or "",
        "seed": seed,
        "num_step": num_step,
        "guidance_scale": guidance_scale,
        "use_prompt_continuation": use_prompt_continuation,
        "trim_silence": trim_silence,
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:16]


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Spin up Google Colab via google-colab-cli and render narration with VoxCPM2."
    )
    p.add_argument("inputs", nargs="*", help="Path(s) to SCRIPT.md / .txt, or '-' for stdin")
    p.add_argument("--text", help="Direct narration text instead of an input file")
    p.add_argument("--raw-text", action="store_true", help="Do not strip SCRIPT.md headers or [t0-t1] prefixes")

    p.add_argument("--status", action="store_true", help="Print active Colab sessions and compute balance, then exit")
    p.add_argument("--stop-session", metavar="NAME", help="Stop an existing Colab session and exit")
    p.add_argument("--list-voices", action="store_true", help="List saved VoiceStudio voices and exit")
    p.add_argument("--voicestudio-dir", type=Path, help="Override VoiceStudio OmniVoice data directory")

    p.add_argument("--voice", help=f"Saved VoiceStudio voice name or ID (default: {DEFAULT_VOICE})")
    p.add_argument("--ref-audio", type=Path, help="Explicit reference WAV/MP3 path instead of VoiceStudio profile")
    p.add_argument("--ref-text", help="Transcript of --ref-audio (overrides VoiceStudio profile ref_text)")
    p.add_argument(
        "--no-ref-text",
        action="store_true",
        help="Clone from reference audio only without prompt_text continuation (like untold-stories)",
    )
    p.add_argument("--instruct", help="Optional VoxCPM2 style instruction")
    p.add_argument("--seed", type=int, default=None, help="Shared RNG seed across batches")
    p.add_argument("--vary-seed", action="store_true", help="Allow unseeded per-batch variation")
    p.add_argument("--num-step", type=int, default=16, help="VoxCPM2 inference_timesteps (1-64, default: 16)")
    p.add_argument("--guidance-scale", type=float, default=2.0, help="VoxCPM2 cfg_value (default: 2.0)")
    p.add_argument("--no-trim", action="store_true", help="Disable -50 dBFS leading/trailing silence trimming")

    p.add_argument("--min-seconds", type=float, default=15.0, help="Target minimum seconds per batch (default: 15)")
    p.add_argument("--target-seconds", type=float, default=22.0, help="Target seconds per batch (default: 22)")
    p.add_argument("--max-seconds", type=float, default=30.0, help="Maximum estimated seconds per batch (default: 30)")
    p.add_argument("--wps", type=float, default=None, help="Estimated words/second for batching (default: 2.8)")
    p.add_argument("--wpm", type=float, default=None, help="Estimated words/minute (e.g. 190 from untold-stories)")
    p.add_argument("--max-chars", type=int, default=520, help="Hard character cap per batch (default: 520)")

    p.add_argument("-o", "--output", type=Path, help="Final stitched WAV path (single input; default: narration.wav next to input)")
    p.add_argument("--batches-dir", type=Path, help="Directory for batch WAVs and manifest.json (single input)")
    p.add_argument("--no-concat", action="store_true", help="Keep batch WAVs without stitching final WAV")
    p.add_argument("--gap-ms", type=float, default=150.0, help="Silence gap (ms) between stitched batches (default: 150)")
    p.add_argument("--crossfade-ms", type=float, default=25.0, help="Crossfade (ms) when --gap-ms is 0 (default: 25)")
    p.add_argument("--sample-rate", type=int, default=48000, help="Final WAV sample rate Hz, 0=native (default: 48000)")
    p.add_argument("--channels", type=int, default=1, choices=(1, 2), help="Final WAV channels (default: 1)")
    p.add_argument("--wav-bits", default="16", choices=("16", "24", "32"), help="WAV bit depth (default: 16)")

    p.add_argument("--wsl-distro", default=DEFAULT_WSL_DISTRO, help=f"WSL distro hosting colab CLI (default: {DEFAULT_WSL_DISTRO})")
    p.add_argument("--session", help="Colab session name (default: auto-derived from first output path)")
    p.add_argument("--gpu", default=DEFAULT_GPU, choices=("L4", "T4", "A100", "G4", "H100", "CPU"), help="Colab GPU type (default: L4)")
    p.add_argument("--fallback-gpu", choices=("T4", "L4", "CPU", "none"), default="T4", help="Fallback GPU if primary quota/capacity fails (default: T4)")
    p.add_argument("--high-mem", action="store_true", help="Request high-RAM runtime shape when supported")
    p.add_argument("--reuse", action="store_true", help="Reuse an already-running Colab session with --session")
    p.add_argument("--keep", action="store_true", help="Keep the Colab VM running after completion (e.g. after --preview)")
    p.add_argument("--timeout", type=float, default=3600.0, help="colab exec idle timeout seconds (default: 3600)")
    p.add_argument("--preview", action="store_true", help="Render only batch 1 to verify voice & pacing")
    p.add_argument("--force", action="store_true", help="Re-render batches even if matching files already exist")
    p.add_argument("--dry-run", action="store_true", help="Resolve voice & batches and exit without starting Colab")
    p.add_argument("--verbose", action="store_true", help="Print wrapped colab CLI commands")
    return p.parse_args(argv)


def _provision_session(cli: ColabCLI, session: str, *, gpu: str, fallback_gpu: str | None, high_mem: bool, reuse: bool) -> bool:
    """Ensure Colab session exists. Returns True if we created a fresh session."""
    existing = cli.sessions()
    if _session_exists(existing, session):
        if reuse:
            log(f"Reusing existing Colab session '{session}'.")
            return False
        raise SystemExit(
            f"Colab session '{session}' is already active. "
            f"Pass --reuse to attach to it, or --stop-session {session} to release it first."
        )

    fb = None if not fallback_gpu or fallback_gpu.lower() == "none" else fallback_gpu
    has_fallback = bool(fb and fb.upper() != gpu.upper())
    try:
        log(f"Creating Colab session '{session}' (--gpu {gpu})...")
        # Fail fast on primary GPU when a fallback is configured so 503s don't stall for minutes.
        cli.new(session, gpu=gpu, high_mem=high_mem, assign_retries=0 if has_fallback else None)
        return True
    except RuntimeError as exc:
        msg = str(exc).lower()
        if has_fallback and ("400" in msg or "503" in msg or "quota" in msg or "unavailable" in msg):
            assert fb is not None
            log(f"{gpu} allocation failed ({exc}); retrying with --gpu {fb}...")
            cli.new(session, gpu=fb, high_mem=high_mem)
            return True
        raise


def _ensure_remote_deps(cli: ColabCLI, session: str) -> None:
    check_code = (
        "import importlib.metadata as m\n"
        "try:\n"
        "    v = m.version('voxcpm')\n"
        "    import soundfile, scipy\n"
        "    print('COLAB_DEPS_OK', v)\n"
        "except Exception as exc:\n"
        "    print('COLAB_DEPS_MISSING', exc)\n"
    )
    out = cli.exec_code(session, check_code, timeout=120.0)
    if "COLAB_DEPS_OK 2.0.3" in out:
        log("Remote VM already has voxcpm==2.0.3, soundfile, and scipy.")
        return
    log(f"Installing {VOXCPM_PIP_SPEC} + soundfile + scipy on Colab VM...")
    cli.install(session, [VOXCPM_PIP_SPEC, "soundfile", "scipy"])


@dataclass
class _NarrationJob:
    label: str
    batches: list[Any]
    output_path: Path
    batches_dir: Path
    manifest_path: Path
    existing_by_idx: dict[int, dict[str, Any]]
    shared_seed: int | None
    cfg_hash: str
    all_cached: bool


def _resolve_voice_settings(args: argparse.Namespace) -> dict[str, Any]:
    voice_id: str | None = None
    voice_name: str | None = None
    profile_seed: int | None = None
    ref_text = args.ref_text
    instruct = args.instruct
    ref_audio_path = args.ref_audio

    if ref_audio_path is not None:
        if not ref_audio_path.is_file():
            raise SystemExit(f"Reference audio not found: {ref_audio_path}")
        voice_name = ref_audio_path.stem
    else:
        selected_voice = args.voice or DEFAULT_VOICE
        prof = resolve_voicestudio_voice(selected_voice, data_dir=args.voicestudio_dir)
        voice_id = prof["id"]
        voice_name = prof["name"]
        ref_audio_path = prof["ref_audio_path"]
        profile_seed = prof["seed"]
        if ref_text is None:
            ref_text = prof["ref_text"] or None
        if instruct is None:
            instruct = prof["instruct"] or None

    if args.no_ref_text:
        ref_text = None
    if ref_audio_path is None:
        raise SystemExit("Colab VoxCPM2 worker requires a reference audio file (clone profile or --ref-audio).")

    use_prompt_continuation = bool(ref_text and not (instruct and instruct.strip()))
    return {
        "voice_id": voice_id,
        "voice_name": voice_name,
        "profile_seed": profile_seed,
        "ref_audio_path": ref_audio_path,
        "ref_text": ref_text,
        "instruct": instruct,
        "use_prompt_continuation": use_prompt_continuation,
    }


def _prepare_job(
    source: str,
    *,
    is_text: bool,
    args: argparse.Namespace,
    wps: float,
    voice_cfg: dict[str, Any],
) -> _NarrationJob:
    if is_text:
        raw_input = source
        default_dir = Path.cwd()
        label = "<text>"
    elif source == "-":
        raw_input = sys.stdin.read()
        default_dir = Path.cwd()
        label = "<stdin>"
    else:
        in_path = Path(source)
        if not in_path.is_file():
            raise SystemExit(f"Input file not found: {in_path}")
        raw_input = in_path.read_text(encoding="utf-8-sig")
        default_dir = in_path.parent
        label = source

    narration_text = parse_script_text(raw_input, raw_text=args.raw_text)
    if not narration_text:
        raise SystemExit(f"No narration text found after parsing {label}.")

    batches = build_batches(
        narration_text,
        min_seconds=args.min_seconds,
        target_seconds=args.target_seconds,
        max_seconds=args.max_seconds,
        wps=wps,
        max_chars=args.max_chars,
    )
    if not batches:
        raise SystemExit(f"Script {label} produced 0 batches.")

    output_path = Path(args.output) if args.output else (default_dir / "narration.wav")
    batches_dir = (
        Path(args.batches_dir)
        if args.batches_dir
        else (output_path.parent / f"{output_path.stem}_batches")
    )
    manifest_path = batches_dir / "manifest.json"
    old_manifest: dict[str, Any] = {}
    existing_by_idx: dict[int, dict[str, Any]] = {}
    if manifest_path.is_file() and not args.force:
        try:
            old_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            for row in old_manifest.get("batches", []):
                if isinstance(row, dict) and "index" in row:
                    existing_by_idx[int(row["index"])] = row
        except (ValueError, OSError):
            old_manifest = {}
            existing_by_idx = {}

    if args.vary_seed:
        shared_seed = None
    elif args.seed is not None:
        shared_seed = args.seed
    elif voice_cfg["profile_seed"] is not None:
        shared_seed = int(voice_cfg["profile_seed"])
    elif isinstance(old_manifest.get("shared_seed"), int):
        shared_seed = old_manifest["shared_seed"]
    else:
        shared_seed = random.randint(1, 2**31 - 1)

    cfg_hash = _config_fingerprint(
        voice_id=voice_cfg["voice_id"],
        ref_audio_path=voice_cfg["ref_audio_path"],
        ref_text=voice_cfg["ref_text"],
        instruct=voice_cfg["instruct"],
        seed=shared_seed,
        num_step=args.num_step,
        guidance_scale=args.guidance_scale,
        use_prompt_continuation=voice_cfg["use_prompt_continuation"],
        trim_silence=not args.no_trim,
    )

    all_cached = not args.force and all(
        (existing_by_idx.get(b.index) or {}).get("text") == b.text
        and (existing_by_idx.get(b.index) or {}).get("config_hash") == cfg_hash
        and (batches_dir / f"batch_{b.index:03d}.wav").is_file()
        and (batches_dir / f"batch_{b.index:03d}.wav").stat().st_size > 44
        for b in (batches[:1] if args.preview else batches)
    )

    total_est = sum(b.est_seconds for b in batches)
    total_words = sum(b.word_count for b in batches)
    log(
        f"[{label}] Planned {len(batches)} batch(es) ({total_words} words, ~{total_est:.1f}s total, "
        f"wps={wps:.2f}, seed={shared_seed}) -> {batches_dir}"
    )
    for b in batches:
        preview = b.text if len(b.text) <= 88 else b.text[:85] + "..."
        print(
            f"  [{b.index:03d}/{len(batches):03d}] ~{b.est_seconds:4.1f}s "
            f"({b.word_count:2d}w, {b.char_count:3d}c): {preview}"
        )

    return _NarrationJob(
        label=label,
        batches=batches,
        output_path=output_path,
        batches_dir=batches_dir,
        manifest_path=manifest_path,
        existing_by_idx=existing_by_idx,
        shared_seed=shared_seed,
        cfg_hash=cfg_hash,
        all_cached=all_cached,
    )


def _write_manifest(
    job: _NarrationJob,
    *,
    args: argparse.Namespace,
    voice_cfg: dict[str, Any],
    worker_results_by_idx: dict[int, dict[str, Any]],
    compute_usage_summary: dict[str, Any] | None,
) -> None:
    rendered_batches = job.batches[:1] if args.preview else job.batches
    manifest_batches: list[dict[str, Any]] = []
    for b in rendered_batches:
        wav_name = f"batch_{b.index:03d}.wav"
        wav_path = job.batches_dir / wav_name
        w_row = worker_results_by_idx.get(b.index)
        if w_row is not None:
            actual_sec = w_row["actual_seconds"]
            sr = w_row["sample_rate"]
            channels = w_row.get("channels", 1)
            gen_time_s = w_row.get("gen_time_s")
        elif wav_path.is_file():
            arr, sr = read_wav_float32(wav_path)
            actual_sec = round(len(arr) / sr, 3)
            channels = arr.shape[1]
            gen_time_s = (job.existing_by_idx.get(b.index) or {}).get("gen_time_s")
        else:
            continue

        manifest_batches.append(
            {
                **asdict(b),
                "filename": wav_name,
                "actual_seconds": actual_sec,
                "sample_rate": sr,
                "channels": channels,
                "seed": str(job.shared_seed) if job.shared_seed is not None else None,
                "gen_time_s": gen_time_s,
                "config_hash": job.cfg_hash,
            }
        )

    manifest_payload = {
        "backend": "google-colab-cli",
        "model": DEFAULT_MODEL,
        "engine": "voxcpm2",
        "voice_id": voice_cfg["voice_id"],
        "voice_name": voice_cfg["voice_name"],
        "profile_id": voice_cfg["voice_id"],
        "shared_seed": job.shared_seed,
        "num_step": args.num_step,
        "guidance_scale": args.guidance_scale,
        "config_hash": job.cfg_hash,
        "compute_units": compute_usage_summary,
        "batches": manifest_batches,
    }
    tmp_manifest = job.manifest_path.with_suffix(".json.tmp")
    tmp_manifest.write_text(json.dumps(manifest_payload, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp_manifest, job.manifest_path)


def _stitch_job_if_ready(job: _NarrationJob, args: argparse.Namespace) -> None:
    if args.preview or args.no_concat:
        return
    batch_wav_paths = [job.batches_dir / f"batch_{b.index:03d}.wav" for b in job.batches]
    total_dur, final_sr = stitch_batches(
        batch_wav_paths,
        job.output_path,
        target_sr=args.sample_rate,
        target_channels=args.channels,
        gap_ms=args.gap_ms,
        crossfade_ms=args.crossfade_ms,
        wav_bits=int(args.wav_bits),
    )
    log(
        f"Stitched {len(batch_wav_paths)} batch(es) -> {job.output_path} "
        f"({total_dur:.3f}s, {final_sr} Hz, {args.channels}ch, {args.wav_bits}-bit)"
    )


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if args.list_voices:
        cmd_list_voices(args.voicestudio_dir)
        return 0

    cli = ColabCLI(wsl_distro=args.wsl_distro, verbose=args.verbose)
    if args.status:
        print(cli.sessions(), end="")
        print(cli.usage(), end="")
        return 0
    if args.stop_session:
        log(f"Stopping Colab session '{args.stop_session}'...")
        cli.stop(args.stop_session)
        return 0

    if args.wps is not None and args.wpm is not None:
        raise SystemExit("Pass either --wps or --wpm, not both.")
    wps = args.wps if args.wps is not None else ((args.wpm / 60.0) if args.wpm is not None else 2.8)

    if args.text is not None:
        if args.inputs:
            raise SystemExit("Do not pass positional input files together with --text.")
        sources = [(args.text, True)]
    elif args.inputs:
        if len(args.inputs) > 1 and (args.output or args.batches_dir):
            raise SystemExit("-o/--output and --batches-dir can only be used with a single input script.")
        sources = [(src, False) for src in args.inputs]
    else:
        raise SystemExit("Provide one or more script paths, '-', or --text (or --status / --list-voices / --stop-session).")

    voice_cfg = _resolve_voice_settings(args)
    ref_audio_path: Path = voice_cfg["ref_audio_path"]
    log(
        f"Voice={voice_cfg['voice_name']}"
        + (f" ({voice_cfg['voice_id']})" if voice_cfg["voice_id"] else "")
        + f" | ref={ref_audio_path.name}"
        + f" | continuation={'on' if voice_cfg['use_prompt_continuation'] else 'off'}"
        + f" | steps={args.num_step} | cfg={args.guidance_scale}"
    )

    jobs = [_prepare_job(src, is_text=is_text, args=args, wps=wps, voice_cfg=voice_cfg) for src, is_text in sources]
    if args.dry_run:
        return 0

    pending_jobs = [j for j in jobs if not j.all_cached]
    cached_jobs = [j for j in jobs if j.all_cached]
    results_by_job: dict[Path, dict[int, dict[str, Any]]] = {j.output_path: {} for j in jobs}
    completed_remote_jobs: list[_NarrationJob] = []

    for job in cached_jobs:
        job.batches_dir.mkdir(parents=True, exist_ok=True)
        log(f"[{job.label}] All requested batch WAVs match manifest locally; skipping Colab GPU run.")
        _write_manifest(job, args=args, voice_cfg=voice_cfg, worker_results_by_idx={}, compute_usage_summary=None)
        _stitch_job_if_ready(job, args)

    if pending_jobs:
        worker_script = SCRIPTS_DIR / "colab_narrate_worker.py"
        if not worker_script.is_file():
            raise SystemExit(f"Missing worker script: {worker_script}")

        session = args.session or _default_session_name(pending_jobs[0].output_path)
        start_usage = _safe_usage_info(cli)
        if start_usage and start_usage["balance"] is not None:
            log(f"Colab balance before run: {start_usage['balance']:.2f} compute units")

        compute_usage_summary: dict[str, Any] | None = None
        try:
            _provision_session(
                cli,
                session,
                gpu=args.gpu,
                fallback_gpu=args.fallback_gpu,
                high_mem=args.high_mem,
                reuse=args.reuse,
            )

            shared_dir = f"/content/{REMOTE_DIR}_shared"
            remote_worker = f"{shared_dir}/colab_narrate_worker.py"
            remote_ref = f"{shared_dir}/{ref_audio_path.name}"
            cli.exec_code(
                session,
                f"from pathlib import Path; Path('{shared_dir}').mkdir(parents=True, exist_ok=True)",
                timeout=60.0,
            )
            log(f"Uploading worker and reference audio ({ref_audio_path.name}) to Colab...")
            cli.upload(session, worker_script, remote_worker)
            cli.upload(session, ref_audio_path, remote_ref)
            _ensure_remote_deps(cli, session)

            for job_idx, job in enumerate(pending_jobs, start=1):
                job.batches_dir.mkdir(parents=True, exist_ok=True)
                job_hash = hashlib.sha1(str(job.output_path.resolve()).encode("utf-8")).hexdigest()[:8]
                remote_job_dir = f"/content/{REMOTE_DIR}_{job_hash}"
                remote_plan = f"{remote_job_dir}/plan.json"
                remote_out = f"{remote_job_dir}/out"

                plan_payload = {
                    "model": DEFAULT_MODEL,
                    "voice_id": voice_cfg["voice_id"],
                    "voice_name": voice_cfg["voice_name"],
                    "ref_text": voice_cfg["ref_text"],
                    "instruct": voice_cfg["instruct"],
                    "seed": job.shared_seed,
                    "num_step": args.num_step,
                    "guidance_scale": args.guidance_scale,
                    "use_prompt_continuation": voice_cfg["use_prompt_continuation"],
                    "trim_silence": not args.no_trim,
                    "batches": [asdict(b) for b in job.batches],
                }
                t_job = time.time()
                with tempfile.TemporaryDirectory() as tmp_dir:
                    local_plan = Path(tmp_dir) / "plan.json"
                    local_plan.write_text(json.dumps(plan_payload, indent=2, ensure_ascii=False), encoding="utf-8")
                    cli.exec_code(
                        session,
                        f"from pathlib import Path; Path('{remote_job_dir}').mkdir(parents=True, exist_ok=True)",
                        timeout=60.0,
                    )
                    cli.upload(session, local_plan, remote_plan)

                run_cmd = (
                    f"%run {remote_worker} "
                    f"--plan {remote_plan} "
                    f"--reference {remote_ref} "
                    f"--out {remote_out}"
                )
                if args.preview:
                    run_cmd += " --preview"
                if args.force:
                    run_cmd += " --force"

                log(f"[{job_idx}/{len(pending_jobs)}] Running VoxCPM2 for {job.label} on '{session}'...")
                cli.exec_code(session, run_cmd, timeout=args.timeout)

                job_results = results_by_job[job.output_path]
                if args.preview:
                    preview_wav = job.batches_dir / "batch_001.wav"
                    preview_results = job.batches_dir / "worker_results.json"
                    cli.download(session, f"{remote_out}/batch_001.wav", preview_wav)
                    cli.download(session, f"{remote_out}/worker_results.json", preview_results)
                    for row in json.loads(preview_results.read_text(encoding="utf-8")).get("results", []):
                        job_results[int(row["index"])] = row
                    log(f"[{job.label}] Preview saved -> {preview_wav} ({time.time() - t_job:.1f}s)")
                else:
                    local_zip = job.batches_dir / "batches.zip"
                    cli.download(session, f"{remote_out}/batches.zip", local_zip)
                    with ZipFile(local_zip) as archive:
                        archive.extractall(job.batches_dir)
                    results_file = job.batches_dir / "worker_results.json"
                    if results_file.is_file():
                        for row in json.loads(results_file.read_text(encoding="utf-8")).get("results", []):
                            job_results[int(row["index"])] = row
                    log(f"[{job.label}] Downloaded {len(job.batches)} batch(es) in {time.time() - t_job:.1f}s")

                _write_manifest(
                    job,
                    args=args,
                    voice_cfg=voice_cfg,
                    worker_results_by_idx=job_results,
                    compute_usage_summary=None,
                )
                _stitch_job_if_ready(job, args)
                completed_remote_jobs.append(job)
        finally:
            if not args.keep:
                log(f"Stopping Colab session '{session}'...")
                cli.stop(session)
            else:
                log(
                    f"Keeping Colab session '{session}' alive (--keep). "
                    f"Resume with --session {session} --reuse, or stop with --stop-session {session}"
                )

            end_usage = _safe_usage_info(cli)
            start_bal = start_usage.get("balance") if start_usage else None
            end_bal = end_usage.get("balance") if end_usage else None
            end_rate = end_usage.get("usage_rate") if end_usage else None
            if start_bal is not None and end_bal is not None:
                used = round(max(0.0, float(start_bal) - float(end_bal)), 4)
                compute_usage_summary = {
                    "balance_before": float(start_bal),
                    "balance_after": float(end_bal),
                    "used": used,
                }
                if len(pending_jobs) > 1:
                    compute_usage_summary["scope"] = f"batch_run ({len(pending_jobs)} videos)"
                rate_note = f" | current rate: {end_rate:.2f}/hr" if end_rate is not None else ""
                log(
                    f"Compute units used by this run: {used:.2f} "
                    f"(balance: {start_bal:.2f} -> {end_bal:.2f}{rate_note})"
                )
            elif end_bal is not None:
                compute_usage_summary = {
                    "balance_before": None,
                    "balance_after": float(end_bal),
                    "used": None,
                }
                log(f"Colab balance after run: {end_bal:.2f} compute units")

            if compute_usage_summary is not None:
                for job in completed_remote_jobs:
                    _write_manifest(
                        job,
                        args=args,
                        voice_cfg=voice_cfg,
                        worker_results_by_idx=results_by_job[job.output_path],
                        compute_usage_summary=compute_usage_summary,
                    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
