#!/usr/bin/env python3
"""Remote Colab GPU worker for rendering narration batches with OpenBMB VoxCPM2.

Uploaded to and executed on a Google Colab GPU VM by
``scripts/render_narration_colab.py``. Mirrors the Colab execution flow of
``untold-stories/tools/narrate_colab.py`` while applying VoiceStudio's VoxCPM2
generation parameters (``num_step``, ``guidance_scale``, ``seed``, optional
continuation ``prompt_wav_path``/``prompt_text``, and silence edge trimming).
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

# Avoid hanging on Colab's interactive secret-vault prompt in headless CLI runs.
os.environ.setdefault("HF_HUB_DISABLE_IMPLICIT_TOKEN", "1")

DEFAULT_MODEL = "openbmb/VoxCPM2"
SILENCE_FLOOR_DBFS = -50.0
EDGE_PAD_SECONDS = 0.04
_MODEL_CACHE_KEY = "_colab_voxcpm_model_cache"


def _trim_silence_edges(audio, sample_rate: int, pad_s: float = EDGE_PAD_SECONDS):
    """Trim leading and trailing near-silence below -50 dBFS, keeping a short pad."""
    import numpy as np

    if audio.size == 0:
        return audio
    threshold = 10.0 ** (SILENCE_FLOOR_DBFS / 20.0)
    active = np.flatnonzero(np.abs(audio) > threshold)
    if active.size == 0:
        return audio
    pad_samples = int(round(sample_rate * pad_s))
    start = max(0, int(active[0]) - pad_samples)
    end = min(len(audio), int(active[-1]) + 1 + pad_samples)
    trimmed = audio[start:end]
    return trimmed if trimmed.size > 0 else audio


def _resolve_sample_rate(model) -> int:
    for owner in (model, getattr(model, "tts_model", None)):
        sr = getattr(owner, "sample_rate", None)
        if isinstance(sr, int) and sr > 0:
            return sr
    return 48000


def _build_generate_kwargs(
    text: str,
    *,
    reference_path: Path,
    ref_text: str | None,
    instruct: str | None,
    num_step: int,
    guidance_scale: float,
    use_prompt_continuation: bool,
) -> dict:
    """Map VoiceStudio VoxCPM2 parameters to VoxCPM.generate() arguments."""
    controls = []
    if instruct and instruct.strip():
        controls.append(instruct.strip())
    inline = re.match(r"^\s*\(([^()]*)\)\s*(.*)$", text, re.DOTALL)
    if inline:
        controls.append(inline.group(1))
        text = inline.group(2)

    control = ", ".join(part.strip() for part in controls if part.strip())
    control = " ".join(control.replace("(", " ").replace(")", " ").split())
    clean_ref_text = (ref_text or "").strip()
    continuation = bool(use_prompt_continuation and clean_ref_text and not control)

    steps = max(1, min(64, int(num_step)))
    max_len = min(4096, max(256, len(text) * 6))

    return {
        "text": f"({control}){text}" if control else text,
        "cfg_value": float(guidance_scale),
        "max_len": max_len,
        "inference_timesteps": steps,
        "retry_badcase": False,
        "retry_badcase_max_times": 1,
        "reference_wav_path": str(reference_path),
        "prompt_wav_path": str(reference_path) if continuation else None,
        "prompt_text": clean_ref_text if continuation else None,
    }


def _plan_fingerprint(plan: dict, reference_bytes: bytes) -> bytes:
    payload = {
        "model": plan.get("model", DEFAULT_MODEL),
        "reference_sha256": hashlib.sha256(reference_bytes).hexdigest(),
        "ref_text": plan.get("ref_text") or "",
        "instruct": plan.get("instruct") or "",
        "seed": plan.get("seed"),
        "num_step": int(plan.get("num_step", 16)),
        "guidance_scale": float(plan.get("guidance_scale", 2.0)),
        "use_prompt_continuation": bool(plan.get("use_prompt_continuation", True)),
        "trim_silence": bool(plan.get("trim_silence", True)),
        "batches": [[b["index"], b["text"]] for b in plan["batches"]],
    }
    return json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")


def _atomic_write_bytes(path: Path, data: bytes) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    tmp.replace(path)


def _show_progress(completed: int, total: int, status: str) -> None:
    width = 24
    filled = completed * width // max(1, total)
    bar = "#" * filled + "-" * (width - filled)
    print(f"[{bar}] {completed}/{total} {status}", flush=True)


def render(
    plan_path: Path,
    reference_path: Path,
    output_dir: Path,
    *,
    preview: bool = False,
    force: bool = False,
) -> None:
    import numpy as np
    import soundfile as sf

    plan = json.loads(plan_path.read_text(encoding="utf-8-sig"))
    batches = plan.get("batches") or []
    if not batches:
        raise ValueError("Plan contains no batches.")

    ref_info = sf.info(reference_path)
    if not ref_info.frames:
        raise ValueError(f"Reference recording is empty: {reference_path}")

    output_dir.mkdir(parents=True, exist_ok=True)
    fingerprint = _plan_fingerprint(plan, reference_path.read_bytes())
    fp_path = output_dir / "plan_hash.json"
    if force or not fp_path.exists():
        if not force and any(output_dir.glob("batch_*.wav")):
            raise ValueError("Existing batch WAVs have no plan_hash.json. Pass --force or use a fresh output dir.")
        _atomic_write_bytes(fp_path, fingerprint)
    elif fp_path.read_bytes() != fingerprint:
        raise ValueError("Script, reference, or settings changed. Pass --force or use a fresh output dir.")

    model_id = plan.get("model") or DEFAULT_MODEL
    seed = plan.get("seed")
    num_step = int(plan.get("num_step", 16))
    guidance_scale = float(plan.get("guidance_scale", 2.0))
    ref_text = plan.get("ref_text") or None
    instruct = plan.get("instruct") or None
    use_prompt_continuation = bool(plan.get("use_prompt_continuation", True))
    trim_silence = bool(plan.get("trim_silence", True))

    selected = batches[:1] if preview else batches
    total = len(selected)
    model = None
    torch_mod = None
    sample_rate = 48000
    results: list[dict] = []

    print(
        f"{reference_path.stem} | {model_id} | {len(batches)} planned batch(es) "
        f"| steps={num_step} cfg={guidance_scale} seed={seed}",
        flush=True,
    )

    for idx_pos, item in enumerate(selected, start=1):
        batch_idx = int(item["index"])
        wav_name = f"batch_{batch_idx:03d}.wav"
        wav_path = output_dir / wav_name
        est_s = float(item.get("est_seconds", 0.0))

        reused = False
        if not force and wav_path.exists():
            info = sf.info(wav_path)
            if info.duration > 0:
                reused = True
                sample_rate = info.samplerate
                results.append(
                    {
                        "index": batch_idx,
                        "filename": wav_name,
                        "actual_seconds": round(info.duration, 3),
                        "sample_rate": info.samplerate,
                        "channels": info.channels,
                        "gen_time_s": None,
                        "reused": True,
                    }
                )
                _show_progress(idx_pos, total, f"Reused {wav_name} ({info.duration:.2f}s)")

        if reused:
            continue

        if model is None:
            import torch
            from voxcpm import VoxCPM

            if not torch.cuda.is_available():
                raise RuntimeError("This runtime has no CUDA GPU. Create a Colab GPU session.")
            torch_mod = torch
            # Keep the loaded model in sys.modules across `%run` calls in the same Jupyter kernel.
            cache = sys.modules.setdefault(_MODEL_CACHE_KEY, {})
            cache_entry = cache.get(model_id)
            if cache_entry is not None and cache_entry[0] is VoxCPM:
                model = cache_entry[1]
                print(f"Reusing cached {model_id} in kernel VRAM.", flush=True)
            else:
                print(f"Loading {model_id} on {torch.cuda.get_device_name(0)}...", flush=True)
                model = VoxCPM.from_pretrained(model_id, device="cuda", load_denoiser=False, optimize=False)
                cache[model_id] = (VoxCPM, model)
            sample_rate = _resolve_sample_rate(model)

        _show_progress(idx_pos - 1, total, f"Rendering {wav_name} (~{est_s:.1f}s est)")
        t0 = time.time()
        if seed is not None and torch_mod is not None:
            torch_mod.manual_seed(int(seed))

        kwargs = _build_generate_kwargs(
            item["text"],
            reference_path=reference_path,
            ref_text=ref_text,
            instruct=instruct,
            num_step=num_step,
            guidance_scale=guidance_scale,
            use_prompt_continuation=use_prompt_continuation,
        )
        audio = model.generate(**kwargs)
        if hasattr(audio, "detach"):
            audio = audio.detach().float().cpu().numpy()
        audio = np.asarray(audio, dtype=np.float32).squeeze()
        if audio.ndim != 1 or not audio.size or not np.isfinite(audio).all() or not np.any(audio):
            raise RuntimeError(f"{wav_name} returned invalid audio. Retry the render.")
        if trim_silence:
            audio = _trim_silence_edges(audio, sample_rate)
        audio = np.clip(audio, -1.0, 1.0)

        tmp_wav = wav_path.with_suffix(".tmp.wav")
        sf.write(tmp_wav, audio, sample_rate, subtype="PCM_16")
        tmp_wav.replace(wav_path)
        gen_s = round(time.time() - t0, 2)
        duration = sf.info(wav_path).duration
        if duration <= 0:
            raise RuntimeError(f"{wav_name} is empty after writing.")

        results.append(
            {
                "index": batch_idx,
                "filename": wav_name,
                "actual_seconds": round(duration, 3),
                "sample_rate": sample_rate,
                "channels": 1,
                "gen_time_s": gen_s,
                "reused": False,
            }
        )
        _show_progress(idx_pos, total, f"Saved {wav_name} ({duration:.2f}s in {gen_s:.1f}s)")

    results_path = output_dir / "worker_results.json"
    _atomic_write_bytes(results_path, json.dumps({"results": results}, indent=2).encode("utf-8"))

    if preview:
        print(f"PREVIEW TEXT: {selected[0]['text']}", flush=True)
        return

    csv_path = output_dir / "narration-takes.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(["file", "start_seconds", "duration_seconds", "text"])
        cursor = 0.0
        for item, row in zip(selected, results):
            dur = float(row["actual_seconds"])
            writer.writerow([row["filename"], f"{cursor:.3f}", f"{dur:.3f}", item["text"]])
            cursor += dur

    zip_path = output_dir / "batches.zip"
    tmp_zip = zip_path.with_suffix(".zip.tmp")
    with ZipFile(tmp_zip, "w", compression=ZIP_DEFLATED) as archive:
        archive.write(results_path, results_path.name)
        archive.write(csv_path, csv_path.name)
        for row in results:
            p = output_dir / row["filename"]
            archive.write(p, p.name)
    tmp_zip.replace(zip_path)
    print(f"Packaged {len(results)} batch(es) into {zip_path}", flush=True)


def main() -> int:
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--plan", type=Path, required=True, help="Path to plan.json")
    cli.add_argument("--reference", type=Path, required=True, help="Path to reference audio")
    cli.add_argument("--out", type=Path, required=True, help="Remote output directory")
    cli.add_argument("--preview", action="store_true", help="Render only the first batch")
    cli.add_argument("--force", action="store_true", help="Ignore cached WAVs and plan hash")
    args = cli.parse_args()
    render(args.plan, args.reference, args.out, preview=args.preview, force=args.force)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
