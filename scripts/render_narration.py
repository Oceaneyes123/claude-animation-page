#!/usr/bin/env python3
"""Render narration audio through local VoiceStudio in small GPU-friendly batches.

Long narration scripts are split along sentence/clause boundaries into batches
targeting ~15-30 seconds of speech per audio file, rendered sequentially via
VoiceStudio's local HTTP API (with optional memory flush between batches), saved
individually with a resumable manifest, and stitched into a final WAV.

Examples:
    python scripts/render_narration.py --list-voices
    python scripts/render_narration.py --list-engines
    python scripts/render_narration.py shorts/01-shoemart/SCRIPT.md --dry-run
    python scripts/render_narration.py shorts/01-shoemart/SCRIPT.md -o shorts/01-shoemart/narration_new.wav
    python scripts/render_narration.py shorts/01-shoemart/SCRIPT.md --language Tagalog -o shorts/01-shoemart/narration_tl.wav
    python scripts/render_narration.py my_script.txt --voice Nathan --min-seconds 15 --max-seconds 25
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import random
import re
import sys
import threading
import time
import wave
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np
import requests
from scipy import signal
from scipy.io import wavfile

DEFAULT_URL = os.environ.get("VOICESTUDIO_URL", "http://127.0.0.1:3900")
DEFAULT_API_KEY = os.environ.get("VOICESTUDIO_API_KEY", "").strip() or None
DEFAULT_VOICE = "Reid"
DEFAULT_LANGUAGE = "English"

_ABBREVIATIONS = frozenset({
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "ave", "blvd",
    "inc", "ltd", "corp", "dept", "est", "approx", "vs", "etc",
    "e.g", "i.e", "a.m", "p.m", "u.s", "u.s.a", "u.k",
})

_TIMESTAMP_PREFIX_RE = re.compile(
    r"^\s*\[\s*\d+(?::\d+)*(?:\.\d+)?\s*-\s*\d+(?::\d+)*(?:\.\d+)?\s*\]\s*"
)
_VOICEOVER_HEADER_RE = re.compile(r"^\s*(?:#+\s*)?voiceover\b.*:\s*$", re.IGNORECASE)
_ALT_NARRATION_HEADER_RE = re.compile(
    r"^\s*#{1,6}\s*(?:hakbang\s*2\b.*|draft\s+na\s+salaysay\b.*|narration\b.*|script\b.*)$",
    re.IGNORECASE,
)
_HEADING_RE = re.compile(r"^\s*#{1,6}\s+")
_BRACKET_TAG_RE = re.compile(r"\[[^\]]*\]")


@dataclass
class BatchItem:
    index: int
    text: str
    word_count: int
    char_count: int
    est_seconds: float


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def _fmt_hms(seconds: float) -> str:
    seconds = max(0, int(round(seconds)))
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


class ProgressBar:
    """Live single-line progress bar + ETA across narration batches."""

    def __init__(self, batches: list[BatchItem], *, device: str | None) -> None:
        self.total_batches = len(batches)
        self.total_words = max(1, sum(b.word_count for b in batches))
        self.done_words = 0
        self.done_gen_s = 0.0
        self.measured_words = 0
        # Initial prior before batch 1 completes (observed ~9.5s/word on voxcpm2 CPU, ~0.6s/word on GPU)
        dev = (device or "").lower()
        self.prior_spw = 0.6 if any(k in dev for k in ("cuda", "gpu", "mps", "rocm", "xpu")) else 9.5
        self.t0 = time.time()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._last_len = 0
        enc = (sys.stdout.encoding or "").lower()
        try:
            "█░".encode(enc or "ascii")
            self._fill, self._empty = "█", "░"
        except (LookupError, UnicodeEncodeError):
            self._fill, self._empty = "#", "-"

    def spw(self) -> float:
        return (self.done_gen_s / self.measured_words) if self.measured_words > 0 else self.prior_spw

    def _render_line(self, batch_idx: int, batch_words: int, batch_elapsed: float) -> str:
        spw = self.spw()
        min_cpu = 120.0 if (self.measured_words == 0 and self.prior_spw > 2.0) else 1.0
        est_batch = max(min_cpu, batch_words * spw)
        batch_frac = min(0.95, batch_elapsed / est_batch)
        eff_words = self.done_words + batch_words * batch_frac
        pct = min(0.999, eff_words / self.total_words)
        rem_words = max(0.0, self.total_words - self.done_words)
        rem_s = max(0.0, max(est_batch, rem_words * spw) - batch_elapsed)
        elapsed_total = time.time() - self.t0
        width = 24
        filled = int(round(width * pct))
        bar = self._fill * filled + self._empty * (width - filled)
        return (
            f"[{bar}] {pct * 100:5.1f}% | "
            f"batch {batch_idx}/{self.total_batches} ({_fmt_hms(batch_elapsed)}/~{_fmt_hms(est_batch)}) | "
            f"elapsed {_fmt_hms(elapsed_total)} | ETA ~{_fmt_hms(rem_s)}"
        )

    def start_batch(self, batch_idx: int, batch_words: int) -> None:
        self.stop_batch(clear=False)
        self._stop = threading.Event()
        b_start = time.time()
        is_tty = sys.stdout.isatty()

        def run() -> None:
            last_non_tty = -30.0
            while not self._stop.is_set():
                b_el = time.time() - b_start
                line = self._render_line(batch_idx, batch_words, b_el)
                if is_tty:
                    pad = max(0, self._last_len - len(line))
                    sys.stdout.write(f"\r{line}{' ' * pad}")
                    sys.stdout.flush()
                    self._last_len = len(line)
                elif b_el - last_non_tty >= 30.0:
                    last_non_tty = b_el
                    log(line)
                self._stop.wait(0.5)

        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()

    def stop_batch(self, *, clear: bool = True) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=1.5)
            self._thread = None
        if clear and sys.stdout.isatty() and self._last_len > 0:
            sys.stdout.write("\r" + " " * self._last_len + "\r")
            sys.stdout.flush()
            self._last_len = 0

    def mark_reused(self, batch_words: int) -> None:
        self.done_words += batch_words

    def mark_done(self, batch_words: int, gen_s: float) -> None:
        self.stop_batch(clear=True)
        self.done_words += batch_words
        self.done_gen_s += gen_s
        self.measured_words += batch_words
        pct = min(100.0, 100.0 * self.done_words / self.total_words)
        rem_s = max(0.0, (self.total_words - self.done_words) * self.spw())
        filled = int(round(24 * pct / 100.0))
        bar = self._fill * filled + self._empty * (24 - filled)
        log(
            f"[{bar}] {pct:5.1f}% | done {self.done_words}/{self.total_words} words | "
            f"elapsed {_fmt_hms(time.time() - self.t0)} | ETA ~{_fmt_hms(rem_s)}"
        )


def make_headers(api_key: str | None) -> dict[str, str]:
    if not api_key:
        return {}
    return {
        "Authorization": f"Bearer {api_key}",
        "X-API-Key": api_key,
    }


def parse_script_text(raw: str, *, raw_text: bool = False) -> str:
    """Extract clean narration text from plain text or repo SCRIPT.md files."""
    if raw_text:
        return raw.strip()

    lines = raw.splitlines()

    # Check if this looks like a project SCRIPT.md with a "Voiceover (...):" section
    # or a fallback narration heading (e.g. "## Hakbang 2 · Draft na salaysay").
    vo_start = None
    for header_re in (_VOICEOVER_HEADER_RE, _ALT_NARRATION_HEADER_RE):
        for idx, line in enumerate(lines):
            if header_re.match(line):
                vo_start = idx + 1
                break
        if vo_start is not None:
            break

    if vo_start is not None:
        collected: list[str] = []
        for line in lines[vo_start:]:
            if _HEADING_RE.match(line):
                break
            stripped = _TIMESTAMP_PREFIX_RE.sub("", line).strip()
            if stripped:
                collected.append(stripped)
        if collected:
            return "\n\n".join(collected)

    # Otherwise, strip any [t0-t1] prefixes on individual lines if present,
    # preserving paragraph breaks.
    paragraphs: list[str] = []
    cur: list[str] = []
    for line in lines:
        cleaned = _TIMESTAMP_PREFIX_RE.sub("", line).strip()
        if not cleaned:
            if cur:
                paragraphs.append(" ".join(cur))
                cur = []
        else:
            cur.append(cleaned)
    if cur:
        paragraphs.append(" ".join(cur))
    return "\n\n".join(paragraphs).strip()


def _is_sentence_boundary(text: str, dot_pos: int) -> bool:
    ch = text[dot_pos]
    if ch != ".":
        return True
    # Skip ellipses ("...")
    if (dot_pos + 1 < len(text) and text[dot_pos + 1] == ".") or (
        dot_pos > 0 and text[dot_pos - 1] == "."
    ):
        return False
    # Skip decimals (e.g. 19.5)
    if (
        dot_pos > 0
        and text[dot_pos - 1].isdigit()
        and dot_pos + 1 < len(text)
        and text[dot_pos + 1].isdigit()
    ):
        return False
    # Check preceding word for abbreviations like Dr., Mr., U.S., e.g.
    start = dot_pos - 1
    while start >= 0 and (text[start].isalpha() or text[start] == "."):
        start -= 1
    token = text[start + 1 : dot_pos].lower()
    if token in _ABBREVIATIONS:
        return False
    # Single-letter initials like "J."
    if len(token) == 1 and token.isalpha():
        return False
    return True


def _inside_brackets(text: str, pos: int) -> bool:
    for m in _BRACKET_TAG_RE.finditer(text):
        if m.start() < pos < m.end():
            return True
    return False


def split_sentences(text: str) -> list[str]:
    """Split narration into sentence units while keeping abbreviations & tags intact."""
    paragraphs = [p.strip() for p in re.split(r"\r?\n\s*\r?\n", text.strip()) if p.strip()]
    sentences: list[str] = []

    for para in paragraphs:
        para = re.sub(r"\s+", " ", para).strip()
        if not para:
            continue
        start = 0
        i = 0
        n = len(para)
        while i < n:
            ch = para[i]
            if ch in ".!?" and not _inside_brackets(para, i) and _is_sentence_boundary(para, i):
                end = i + 1
                while end < n and para[end] in "\"')]\u201d\u2019":
                    end += 1
                if end == n or para[end].isspace():
                    piece = para[start:end].strip()
                    if piece:
                        sentences.append(piece)
                    while end < n and para[end].isspace():
                        end += 1
                    start = end
                    i = end
                    continue
            i += 1
        tail = para[start:].strip()
        if tail:
            sentences.append(tail)

    return sentences


def _split_long_sentence(sentence: str, max_words: int, max_chars: int) -> list[str]:
    """Split a single oversized sentence on clause punctuation or whitespace."""
    if len(sentence.split()) <= max_words and len(sentence) <= max_chars:
        return [sentence]

    parts: list[str] = []
    remaining = sentence.strip()
    while remaining:
        words = remaining.split()
        if len(words) <= max_words and len(remaining) <= max_chars:
            parts.append(remaining)
            break

        # Find a character limit that satisfies both max_chars and max_words.
        char_cap = min(len(remaining), max_chars)
        if len(words) > max_words:
            # Approximate char position of max_words-th word
            word_matches = list(re.finditer(r"\S+", remaining))
            if len(word_matches) > max_words:
                char_cap = min(char_cap, word_matches[max_words].start())

        window = remaining[: max(1, char_cap)]
        # Prefer clause punctuation outside [tags]
        split_at = -1
        for m in re.finditer(r"[;:,—–](?:\s|$)", window):
            if not _inside_brackets(window, m.start()):
                split_at = m.start() + 1
        if split_at <= 0:
            # Fallback to last whitespace (not inside [tag])
            for m in re.finditer(r"\s+", window):
                if not _inside_brackets(window, m.start()):
                    split_at = m.start()
        if split_at <= 0:
            split_at = char_cap

        head = remaining[:split_at].strip()
        if head:
            parts.append(head)
        remaining = remaining[split_at:].strip()

    return parts


def build_batches(
    text: str,
    *,
    min_seconds: float = 15.0,
    target_seconds: float = 22.0,
    max_seconds: float = 30.0,
    wps: float = 2.8,
    max_chars: int = 520,
) -> list[BatchItem]:
    """Group sentences into batches targeting ~15-30 seconds of audio each."""
    if wps <= 0:
        raise ValueError("--wps must be > 0")
    if not (0 < min_seconds <= target_seconds <= max_seconds):
        raise ValueError("Expected 0 < min_seconds <= target_seconds <= max_seconds")

    raw_sentences = split_sentences(text)
    max_words = max(1, int(math.floor(max_seconds * wps)))

    units: list[str] = []
    for s in raw_sentences:
        units.extend(_split_long_sentence(s, max_words=max_words, max_chars=max_chars))

    if not units:
        return []

    batches_raw: list[list[str]] = []
    current: list[str] = []

    def batch_stats(pieces: list[str]) -> tuple[int, int, float]:
        joined = " ".join(pieces)
        wc = len(joined.split())
        return wc, len(joined), wc / wps

    for unit in units:
        if not current:
            current.append(unit)
            continue

        _, _, cur_sec = batch_stats(current)
        cand = current + [unit]
        _, cand_chars, cand_sec = batch_stats(cand)

        if cand_chars > max_chars or cand_sec > max_seconds:
            batches_raw.append(current)
            current = [unit]
            continue

        # Add if we are still under min_seconds, or if adding moves us closer
        # to target_seconds (or keeps us under target_seconds).
        if cur_sec < min_seconds or cand_sec <= target_seconds:
            current.append(unit)
        elif abs(cand_sec - target_seconds) < abs(cur_sec - target_seconds):
            current.append(unit)
        else:
            batches_raw.append(current)
            current = [unit]

    if current:
        batches_raw.append(current)

    # Rebalance a short trailing batch (< min_seconds) when possible without
    # exceeding max_seconds / max_chars.
    if len(batches_raw) >= 2:
        _, _, last_sec = batch_stats(batches_raw[-1])
        if last_sec < min_seconds:
            merged = batches_raw[-2] + batches_raw[-1]
            _, m_chars, m_sec = batch_stats(merged)
            if m_chars <= max_chars and m_sec <= max_seconds:
                batches_raw[-2] = merged
                batches_raw.pop()
            else:
                # Try shifting trailing sentences from the second-to-last batch
                # into the last batch to balance them.
                while len(batches_raw[-2]) > 1:
                    prev_cand = batches_raw[-2][:-1]
                    last_cand = [batches_raw[-2][-1]] + batches_raw[-1]
                    _, _, p_sec = batch_stats(prev_cand)
                    _, l_chars, l_sec = batch_stats(last_cand)
                    if l_chars <= max_chars and l_sec <= max_seconds and l_sec <= p_sec:
                        batches_raw[-2] = prev_cand
                        batches_raw[-1] = last_cand
                    else:
                        break

    items: list[BatchItem] = []
    for idx, pieces in enumerate(batches_raw, start=1):
        joined = " ".join(pieces).strip()
        wc = len(joined.split())
        items.append(
            BatchItem(
                index=idx,
                text=joined,
                word_count=wc,
                char_count=len(joined),
                est_seconds=round(wc / wps, 2),
            )
        )
    return items


# ------------------------------------------------------------------ VoiceStudio API


def api_get(
    session: requests.Session,
    base_url: str,
    path: str,
    *,
    headers: dict[str, str],
    timeout: float = 45.0,
) -> Any:
    resp = session.get(f"{base_url}{path}", headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def resolve_voice_profile(
    session: requests.Session,
    base_url: str,
    voice: str,
    *,
    headers: dict[str, str],
) -> dict[str, Any]:
    profiles = api_get(session, base_url, "/profiles", headers=headers)
    for p in profiles:
        if p.get("id") == voice:
            return p

    key = voice.strip().casefold()
    matches = [p for p in profiles if (p.get("name") or "").strip().casefold() == key]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        ids = ", ".join(f"{m['id']} ({m['name']})" for m in matches)
        raise SystemExit(f"Ambiguous voice name {voice!r}. Pass an exact profile ID: {ids}")

    available = ", ".join(f"{p['name']} [{p['id']}]" for p in profiles)
    raise SystemExit(f"Voice profile {voice!r} not found. Available profiles: {available}")


def flush_memory(
    session: requests.Session,
    base_url: str,
    *,
    headers: dict[str, str],
    unload_model: bool = False,
    verbose: bool = False,
) -> None:
    try:
        resp = session.post(
            f"{base_url}/system/flush-memory",
            params={"unload_model": "true" if unload_model else "false"},
            headers=headers,
            timeout=30.0,
        )
        if resp.ok:
            data = resp.json()
            if verbose:
                log(
                    f"Flushed memory (unload={unload_model}): "
                    f"vram_after={data.get('vram_after')} GB"
                )
        elif verbose:
            log(f"Flush memory returned HTTP {resp.status_code}: {resp.text[:200]}")
    except requests.RequestException as exc:
        if verbose:
            log(f"Flush memory skipped ({exc})")


def generate_batch_wav(
    session: requests.Session,
    base_url: str,
    *,
    headers: dict[str, str],
    text: str,
    profile_id: str | None,
    ref_audio_path: str | None,
    ref_text: str | None,
    engine: str | None,
    preset_voice: str | None,
    language: str | None,
    instruct: str | None,
    speed: float,
    seed: int | None,
    num_step: int | None,
    guidance_scale: float | None,
    effect_preset: str,
    wav_bits: str,
    denoise: bool,
    pronounce: bool,
    internal_max_chunk_chars: int,
    timeout: float,
    retries: int,
) -> tuple[bytes, dict[str, str]]:
    data: dict[str, str] = {
        "text": text,
        "speed": str(speed),
        "effect_preset": effect_preset,
        "wav_bits": wav_bits,
        "denoise": "true" if denoise else "false",
        "pronounce": "true" if pronounce else "false",
        "max_chunk_chars": str(internal_max_chunk_chars),
    }
    if profile_id:
        data["profile_id"] = profile_id
    if ref_text:
        data["ref_text"] = ref_text
    if engine:
        data["engine"] = engine
    if preset_voice:
        data["preset_voice"] = preset_voice
    if language:
        data["language"] = language
    if instruct:
        data["instruct"] = instruct
    if seed is not None:
        data["seed"] = str(seed)
    if num_step is not None:
        data["num_step"] = str(num_step)
    if guidance_scale is not None:
        data["guidance_scale"] = str(guidance_scale)

    attempt = 0
    while True:
        attempt += 1
        files = None
        f_handle = None
        try:
            if ref_audio_path and not profile_id:
                f_handle = open(ref_audio_path, "rb")
                files = {"ref_audio": (Path(ref_audio_path).name, f_handle, "application/octet-stream")}
            resp = session.post(
                f"{base_url}/generate",
                data=data,
                files=files,
                headers=headers,
                timeout=timeout,
            )
        except requests.RequestException as exc:
            if attempt <= retries:
                wait_s = min(30.0, 2.0 * attempt)
                log(f"Request error ({exc}); retrying in {wait_s:.1f}s ({attempt}/{retries})...")
                time.sleep(wait_s)
                continue
            raise RuntimeError(f"VoiceStudio request failed after {retries} retries: {exc}") from exc
        finally:
            if f_handle is not None:
                f_handle.close()

        if resp.status_code in (429, 503) and attempt <= retries:
            retry_after = resp.headers.get("Retry-After")
            try:
                wait_s = max(1.0, float(retry_after)) if retry_after else 3.0 * attempt
            except ValueError:
                wait_s = 3.0 * attempt
            log(f"VoiceStudio busy (HTTP {resp.status_code}); retrying in {wait_s:.1f}s ({attempt}/{retries})...")
            time.sleep(wait_s)
            continue

        if not resp.ok:
            detail = resp.text.strip()
            try:
                detail = resp.json().get("detail", detail)
            except ValueError:
                pass
            raise RuntimeError(f"VoiceStudio /generate failed (HTTP {resp.status_code}): {detail}")

        return resp.content, {k.lower(): v for k, v in resp.headers.items()}


# ------------------------------------------------------------------ WAV I/O & stitching


def read_wav_float32(path: Path) -> tuple[np.ndarray, int]:
    """Read 16/24/32-bit WAV as float32 shaped (samples, channels) in [-1, 1]."""
    try:
        sr, arr = wavfile.read(str(path))
        if arr.dtype == np.int16:
            f = arr.astype(np.float32) / 32768.0
        elif arr.dtype == np.int32:
            f = arr.astype(np.float32) / 2147483648.0
        elif arr.dtype == np.uint8:
            f = (arr.astype(np.float32) - 128.0) / 128.0
        else:
            f = arr.astype(np.float32)
        if f.ndim == 1:
            f = f[:, None]
        return f, int(sr)
    except ValueError:
        # Fallback for 24-bit PCM WAV when older scipy raises ValueError
        with wave.open(str(path), "rb") as w:
            sr = w.getframerate()
            ch = w.getnchannels()
            sw = w.getsampwidth()
            frames = w.readframes(w.getnframes())
        if sw != 3:
            raise
        raw = np.frombuffer(frames, dtype=np.uint8).reshape(-1, 3)
        b0 = raw[:, 0].astype(np.int32)
        b1 = raw[:, 1].astype(np.int32) << 8
        b2 = raw[:, 2].astype(np.int8).astype(np.int32) << 16
        vals = (b0 | b1 | b2).astype(np.float32) / 8388608.0
        return vals.reshape(-1, ch), int(sr)


def write_wav_atomic(path: Path, audio: np.ndarray, sample_rate: int, bits: int = 16) -> None:
    """Write float32 (samples, channels) audio atomically as 16/24/32-bit WAV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    clipped = np.clip(audio, -1.0, 1.0)
    if clipped.ndim == 1:
        clipped = clipped[:, None]

    if bits == 32:
        wavfile.write(str(tmp_path), sample_rate, clipped.astype(np.float32))
    elif bits == 24:
        pcm = np.round(clipped * 8388607.0).astype(np.int32)
        b0 = (pcm & 0xFF).astype(np.uint8)
        b1 = ((pcm >> 8) & 0xFF).astype(np.uint8)
        b2 = ((pcm >> 16) & 0xFF).astype(np.uint8)
        packed = np.stack([b0, b1, b2], axis=-1).tobytes()
        with wave.open(str(tmp_path), "wb") as w:
            w.setnchannels(clipped.shape[1])
            w.setsampwidth(3)
            w.setframerate(sample_rate)
            w.writeframes(packed)
    else:
        pcm16 = np.round(clipped * 32767.0).astype(np.int16)
        wavfile.write(str(tmp_path), sample_rate, pcm16)

    os.replace(tmp_path, path)


def convert_channels(audio: np.ndarray, target_channels: int) -> np.ndarray:
    ch = audio.shape[1]
    if ch == target_channels:
        return audio
    if target_channels == 1:
        return audio.mean(axis=1, keepdims=True)
    if ch == 1 and target_channels == 2:
        return np.repeat(audio, 2, axis=1)
    raise ValueError(f"Unsupported channel conversion: {ch} -> {target_channels}")


def resample_audio(audio: np.ndarray, src_sr: int, dst_sr: int) -> np.ndarray:
    if dst_sr <= 0 or src_sr == dst_sr:
        return audio
    g = math.gcd(src_sr, dst_sr)
    up = dst_sr // g
    down = src_sr // g
    return signal.resample_poly(audio, up, down, axis=0).astype(np.float32)


def _apply_edge_fades(audio: np.ndarray, sr: int, fade_ms: float = 4.0) -> np.ndarray:
    n = min(int(sr * fade_ms / 1000.0), len(audio) // 4)
    if n <= 1:
        return audio
    out = audio.copy()
    ramp = 0.5 * (1.0 - np.cos(np.linspace(0.0, np.pi, n, dtype=np.float32)))[:, None]
    out[:n] *= ramp
    out[-n:] *= ramp[::-1]
    return out


def stitch_batches(
    batch_paths: list[Path],
    output_path: Path,
    *,
    target_sr: int,
    target_channels: int,
    gap_ms: float,
    crossfade_ms: float,
    wav_bits: int,
) -> tuple[float, int]:
    """Load all batch WAVs, align format, concatenate, and write output_path."""
    clips: list[np.ndarray] = []
    chosen_sr = target_sr

    for p in batch_paths:
        audio, sr = read_wav_float32(p)
        if chosen_sr <= 0:
            chosen_sr = sr
        audio = convert_channels(audio, target_channels)
        audio = resample_audio(audio, sr, chosen_sr)
        clips.append(audio)

    if not clips:
        raise RuntimeError("No audio clips to stitch.")

    if len(clips) == 1:
        joined = clips[0]
    elif gap_ms > 0:
        gap = np.zeros((int(round(chosen_sr * gap_ms / 1000.0)), target_channels), dtype=np.float32)
        pieces: list[np.ndarray] = []
        for idx, clip in enumerate(clips):
            pieces.append(_apply_edge_fades(clip, chosen_sr))
            if idx < len(clips) - 1:
                pieces.append(gap)
        joined = np.concatenate(pieces, axis=0)
    else:
        xfade_n = int(round(chosen_sr * crossfade_ms / 1000.0))
        joined = clips[0]
        for nxt in clips[1:]:
            ov = min(xfade_n, len(joined), len(nxt))
            if ov > 0:
                fade_out = np.linspace(1.0, 0.0, ov, dtype=np.float32)[:, None]
                fade_in = np.linspace(0.0, 1.0, ov, dtype=np.float32)[:, None]
                overlap = joined[-ov:] * fade_out + nxt[:ov] * fade_in
                joined = np.concatenate([joined[:-ov], overlap, nxt[ov:]], axis=0)
            else:
                joined = np.concatenate([joined, nxt], axis=0)

    write_wav_atomic(output_path, joined, chosen_sr, bits=wav_bits)
    duration_s = len(joined) / chosen_sr
    return duration_s, chosen_sr


# ------------------------------------------------------------------ CLI


def config_fingerprint(args: argparse.Namespace, profile_id: str | None, seed: int | None) -> str:
    payload = {
        "profile_id": profile_id,
        "ref_audio": str(Path(args.ref_audio).resolve()) if args.ref_audio else None,
        "ref_text": args.ref_text,
        "engine": args.engine,
        "preset_voice": args.preset_voice,
        "language": args.language,
        "instruct": args.instruct,
        "speed": args.speed,
        "seed": seed,
        "num_step": args.num_step,
        "guidance_scale": args.guidance_scale,
        "effect_preset": args.effect_preset,
        "wav_bits": args.wav_bits,
        "denoise": not args.no_denoise,
        "pronounce": not args.no_pronounce,
    }
    raw = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:16]


def cmd_list_voices(session: requests.Session, base_url: str, headers: dict[str, str]) -> None:
    profiles = api_get(session, base_url, "/profiles", headers=headers)
    if not profiles:
        print("No saved voice profiles found in VoiceStudio.")
        return
    print(f"Saved voice profiles at {base_url}:")
    for p in profiles:
        print(
            f"  - {p.get('id')} | {p.get('name')!r} "
            f"| kind={p.get('kind')} | lang={p.get('language')} | seed={p.get('seed')}"
        )


def cmd_list_engines(session: requests.Session, base_url: str, headers: dict[str, str]) -> None:
    engines = api_get(session, base_url, "/engines", headers=headers)
    tts = engines.get("tts", {})
    active = tts.get("active")
    print(f"TTS engines at {base_url} (active={active}):")
    for b in tts.get("backends", []):
        mark = "*" if b.get("id") == active else " "
        avail = "ready" if b.get("available") else "unavailable"
        dev = b.get("effective_device") or "?"
        print(f" {mark} {b.get('id'):22s} [{avail:11s} | device={dev}]  {b.get('display_name')}")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Render narration through local VoiceStudio in ~15-30s batches."
    )
    p.add_argument("input", nargs="?", help="Path to narration .txt / SCRIPT.md file, or '-' for stdin")
    p.add_argument("--text", help="Direct narration text instead of an input file")
    p.add_argument("--raw-text", action="store_true", help="Do not strip SCRIPT.md headers or [t0-t1] prefixes")

    p.add_argument("--list-voices", action="store_true", help="List saved VoiceStudio voice profiles and exit")
    p.add_argument("--list-engines", action="store_true", help="List VoiceStudio TTS engines and exit")

    p.add_argument("--url", default=DEFAULT_URL, help=f"VoiceStudio server URL (default: {DEFAULT_URL})")
    p.add_argument("--api-key", default=DEFAULT_API_KEY, help="Optional API key for non-loopback servers")

    p.add_argument(
        "--voice",
        help=f"Saved VoiceStudio voice name or ID (default: {DEFAULT_VOICE} unless --ref-audio/--preset-voice is set)",
    )
    p.add_argument("--preset-voice", help="Engine built-in preset voice name (e.g. KittenTTS)")
    p.add_argument("--ref-audio", help="One-shot reference audio file (if not using --voice)")
    p.add_argument("--ref-text", help="Transcript for --ref-audio")
    p.add_argument("--engine", help="Override VoiceStudio active TTS engine (e.g. voxcpm2, omnivoice)")
    p.add_argument(
        "--language",
        default=DEFAULT_LANGUAGE,
        help=f"Language name/code (default: {DEFAULT_LANGUAGE}; pass e.g. Tagalog to override)",
    )
    p.add_argument("--instruct", help="Style instruction for engines that support it")
    p.add_argument("--speed", type=float, default=1.0, help="Speech speed multiplier (default: 1.0)")
    p.add_argument("--seed", type=int, default=None, help="Shared RNG seed across batches for consistent voice")
    p.add_argument("--vary-seed", action="store_true", help="Allow a fresh random seed per batch")
    p.add_argument("--num-step", type=int, default=None, help="Sampling steps override (engine-dependent)")
    p.add_argument("--guidance-scale", type=float, default=None, help="Guidance scale override")
    p.add_argument(
        "--effect-preset",
        default="broadcast",
        choices=("broadcast", "raw", "podcast", "cinematic", "warm", "bright"),
        help="VoiceStudio DSP preset (default: broadcast)",
    )
    p.add_argument("--wav-bits", default="16", choices=("16", "24", "32"), help="WAV bit depth (default: 16)")
    p.add_argument("--no-denoise", action="store_true", help="Disable VoiceStudio reference denoising")
    p.add_argument("--no-pronounce", action="store_true", help="Disable VoiceStudio pronunciation dictionary")

    p.add_argument("--min-seconds", type=float, default=15.0, help="Target minimum seconds per batch (default: 15)")
    p.add_argument("--target-seconds", type=float, default=22.0, help="Target seconds per batch (default: 22)")
    p.add_argument("--max-seconds", type=float, default=30.0, help="Maximum estimated seconds per batch (default: 30)")
    p.add_argument("--wps", type=float, default=2.8, help="Estimated words/second for batching (default: 2.8)")
    p.add_argument("--max-chars", type=int, default=520, help="Hard character cap per batch (default: 520)")
    p.add_argument(
        "--internal-max-chunk-chars",
        type=int,
        default=0,
        help="VoiceStudio's internal max_chunk_chars per request (default: 0, handled by this script)",
    )

    p.add_argument("-o", "--output", help="Final stitched WAV path (default: narration.wav next to input)")
    p.add_argument("--batches-dir", help="Directory for batch WAVs and manifest.json")
    p.add_argument("--no-concat", action="store_true", help="Only render batch WAV files without stitching")
    p.add_argument("--gap-ms", type=float, default=150.0, help="Silence gap (ms) between stitched batches (default: 150)")
    p.add_argument("--crossfade-ms", type=float, default=25.0, help="Crossfade (ms) when --gap-ms is 0 (default: 25)")
    p.add_argument("--sample-rate", type=int, default=48000, help="Final stitched sample rate Hz, 0=keep native (default: 48000)")
    p.add_argument("--channels", type=int, default=1, choices=(1, 2), help="Final stitched channels (default: 1)")

    p.add_argument("--timeout", type=float, default=600.0, help="Per-batch HTTP timeout seconds (default: 600)")
    p.add_argument("--retries", type=int, default=3, help="Retries per batch on 429/503/network errors (default: 3)")
    p.add_argument("--no-flush", action="store_true", help="Do not call /system/flush-memory between batches")
    p.add_argument("--unload-between-batches", action="store_true", help="Unload TTS model from memory after each batch")
    p.add_argument("--force", action="store_true", help="Re-render batches even if matching files exist")
    p.add_argument("--dry-run", action="store_true", help="Print planned batches and exit without calling VoiceStudio")
    p.add_argument("--verbose", action="store_true", help="Verbose logging")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    base_url = args.url.rstrip("/")
    headers = make_headers(args.api_key)
    session = requests.Session()

    if args.list_voices or args.list_engines:
        try:
            if args.list_voices:
                cmd_list_voices(session, base_url, headers)
            if args.list_engines:
                cmd_list_engines(session, base_url, headers)
        except requests.RequestException as exc:
            raise SystemExit(f"Could not reach VoiceStudio at {base_url}: {exc}") from exc
        return 0

    if args.text is not None:
        raw_input = args.text
        default_dir = Path.cwd()
    elif args.input == "-":
        raw_input = sys.stdin.read()
        default_dir = Path.cwd()
    elif args.input:
        in_path = Path(args.input)
        if not in_path.is_file():
            raise SystemExit(f"Input file not found: {in_path}")
        raw_input = in_path.read_text(encoding="utf-8")
        default_dir = in_path.parent
    else:
        raise SystemExit("Provide an input script path, '-', or --text (or use --list-voices / --list-engines).")

    narration_text = parse_script_text(raw_input, raw_text=args.raw_text)
    if not narration_text:
        raise SystemExit("No narration text found after parsing input.")

    batches = build_batches(
        narration_text,
        min_seconds=args.min_seconds,
        target_seconds=args.target_seconds,
        max_seconds=args.max_seconds,
        wps=args.wps,
        max_chars=args.max_chars,
    )
    if not batches:
        raise SystemExit("Script produced 0 batches.")

    output_path = Path(args.output) if args.output else (default_dir / "narration.wav")
    batches_dir = (
        Path(args.batches_dir)
        if args.batches_dir
        else (output_path.parent / f"{output_path.stem}_batches")
    )

    total_est = sum(b.est_seconds for b in batches)
    total_words = sum(b.word_count for b in batches)
    log(
        f"Planned {len(batches)} batch(es) ({total_words} words, ~{total_est:.1f}s total) "
        f"-> {batches_dir}"
    )
    for b in batches:
        preview = b.text if len(b.text) <= 88 else b.text[:85] + "..."
        print(
            f"  [{b.index:03d}/{len(batches):03d}] ~{b.est_seconds:4.1f}s "
            f"({b.word_count:2d}w, {b.char_count:3d}c): {preview}"
        )

    if args.dry_run:
        return 0

    # Verify VoiceStudio server and resolve voice/engine.
    try:
        engines_info = api_get(session, base_url, "/engines", headers=headers)
    except requests.RequestException as exc:
        raise SystemExit(f"Could not connect to local VoiceStudio at {base_url}: {exc}") from exc

    tts_info = engines_info.get("tts", {})
    active_engine = args.engine or tts_info.get("active")
    matching_engine = next(
        (b for b in tts_info.get("backends", []) if b.get("id") == active_engine), None
    )
    if matching_engine is None:
        raise SystemExit(f"Unknown TTS engine {active_engine!r}. Run --list-engines to inspect.")
    if not matching_engine.get("available"):
        raise SystemExit(
            f"TTS engine {active_engine!r} is unavailable: {matching_engine.get('reason')}"
        )
    log(
        f"Using VoiceStudio {base_url} | engine={active_engine} "
        f"(device={matching_engine.get('effective_device')})"
    )

    profile_id: str | None = None
    profile_seed: int | None = None
    selected_voice = args.voice
    if not selected_voice and not args.ref_audio and not args.preset_voice:
        selected_voice = DEFAULT_VOICE

    if selected_voice:
        prof = resolve_voice_profile(session, base_url, selected_voice, headers=headers)
        profile_id = prof["id"]
        profile_seed = prof.get("seed")
        log(
            f"Voice profile: {prof.get('name')} ({profile_id}, "
            f"profile_lang={prof.get('language')}, request_lang={args.language})"
        )
    elif args.ref_audio:
        if not Path(args.ref_audio).is_file():
            raise SystemExit(f"Reference audio not found: {args.ref_audio}")
        log(f"One-shot reference audio: {args.ref_audio} (request_lang={args.language})")
    elif args.preset_voice:
        log(f"Engine preset voice: {args.preset_voice} (request_lang={args.language})")

    batches_dir.mkdir(parents=True, exist_ok=True)
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
    elif profile_seed is not None:
        shared_seed = int(profile_seed)
    elif isinstance(old_manifest.get("shared_seed"), int):
        shared_seed = old_manifest["shared_seed"]
    else:
        shared_seed = random.randint(1, 2**31 - 1)
    if shared_seed is not None:
        log(f"Using shared seed {shared_seed} across all batches for voice consistency.")

    cfg_hash = config_fingerprint(args, profile_id, shared_seed)
    manifest_batches: list[dict[str, Any]] = []
    batch_wav_paths: list[Path] = []
    t_start = time.time()
    progress = ProgressBar(batches, device=matching_engine.get("effective_device"))

    for pos, item in enumerate(batches):
        wav_name = f"batch_{item.index:03d}.wav"
        wav_path = batches_dir / wav_name
        batch_wav_paths.append(wav_path)

        prev = existing_by_idx.get(item.index)
        if (
            not args.force
            and prev is not None
            and wav_path.is_file()
            and wav_path.stat().st_size > 44
            and prev.get("text") == item.text
            and prev.get("config_hash") == cfg_hash
        ):
            log(f"[{item.index:03d}/{len(batches):03d}] Reusing existing {wav_name} ({prev.get('actual_seconds')}s)")
            manifest_batches.append(prev)
            progress.mark_reused(item.word_count)
            continue

        log(f"[{item.index:03d}/{len(batches):03d}] Rendering ~{item.est_seconds:.1f}s ({item.word_count} words)...")
        batch_t0 = time.time()
        progress.start_batch(item.index, item.word_count)
        try:
            wav_bytes, resp_headers = generate_batch_wav(
                session,
                base_url,
                headers=headers,
                text=item.text,
                profile_id=profile_id,
                ref_audio_path=args.ref_audio,
                ref_text=args.ref_text,
                engine=args.engine,
                preset_voice=args.preset_voice,
                language=args.language,
                instruct=args.instruct,
                speed=args.speed,
                seed=shared_seed,
                num_step=args.num_step,
                guidance_scale=args.guidance_scale,
                effect_preset=args.effect_preset,
                wav_bits=args.wav_bits,
                denoise=not args.no_denoise,
                pronounce=not args.no_pronounce,
                internal_max_chunk_chars=args.internal_max_chunk_chars,
                timeout=args.timeout,
                retries=args.retries,
            )
        finally:
            progress.stop_batch(clear=True)

        dropped = resp_headers.get("x-omnivoice-dropped-chunks")
        if dropped:
            lost = resp_headers.get("x-omnivoice-dropped-text", "")
            log(f"WARNING: batch {item.index} dropped {dropped} chunk(s): {lost}")

        tmp_wav = wav_path.with_suffix(".wav.tmp")
        tmp_wav.write_bytes(wav_bytes)
        os.replace(tmp_wav, wav_path)

        audio_arr, batch_sr = read_wav_float32(wav_path)
        actual_sec = round(len(audio_arr) / batch_sr, 3)
        gen_time = resp_headers.get("x-gen-time")
        batch_gen_s = float(gen_time) if gen_time is not None else (time.time() - batch_t0)
        gen_suffix = f" (gen={gen_time}s)" if gen_time is not None else ""
        log(
            f"[{item.index:03d}/{len(batches):03d}] Saved {wav_name}: "
            f"{actual_sec:.2f}s @ {batch_sr} Hz{gen_suffix}"
        )
        progress.mark_done(item.word_count, batch_gen_s)

        entry = {
            **asdict(item),
            "filename": wav_name,
            "actual_seconds": actual_sec,
            "sample_rate": batch_sr,
            "channels": audio_arr.shape[1],
            "audio_id": resp_headers.get("x-audio-id"),
            "seed": resp_headers.get("x-seed"),
            "gen_time_s": float(gen_time) if gen_time else None,
            "config_hash": cfg_hash,
        }
        manifest_batches.append(entry)

        # Persist manifest after each batch so crashes/interrupts remain resumable.
        manifest_payload = {
            "url": base_url,
            "engine": active_engine,
            "profile_id": profile_id,
            "shared_seed": shared_seed,
            "config_hash": cfg_hash,
            "batches": manifest_batches,
        }
        tmp_manifest = manifest_path.with_suffix(".json.tmp")
        tmp_manifest.write_text(json.dumps(manifest_payload, indent=2), encoding="utf-8")
        os.replace(tmp_manifest, manifest_path)

        if not args.no_flush and pos < len(batches) - 1:
            flush_memory(
                session,
                base_url,
                headers=headers,
                unload_model=args.unload_between_batches,
                verbose=args.verbose,
            )

    if not args.no_concat:
        total_dur, final_sr = stitch_batches(
            batch_wav_paths,
            output_path,
            target_sr=args.sample_rate,
            target_channels=args.channels,
            gap_ms=args.gap_ms,
            crossfade_ms=args.crossfade_ms,
            wav_bits=int(args.wav_bits),
        )
        log(
            f"Stitched {len(batch_wav_paths)} batch(es) -> {output_path} "
            f"({total_dur:.3f}s, {final_sr} Hz, {args.channels}ch, {args.wav_bits}-bit) "
            f"in {time.time() - t_start:.1f}s"
        )
    else:
        log(f"Finished rendering {len(batch_wav_paths)} batch(es) in {time.time() - t_start:.1f}s")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
