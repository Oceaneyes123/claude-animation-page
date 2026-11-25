# Final audio mix for "Ang Bulkang Nagpalamig sa Buong Mundo":
# voice (shorts/02-pinatubo/narration.wav, gain only) + music (ducked -3 dB under speech) + SFX (-6 dB events),
# mastered to -15.0 LUFS integrated, <= -1.2 dBTP, exact T.DUR / 48 kHz / stereo / 24-bit.
import os
import sys
import time
import numpy as np
from scipy import ndimage, signal

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO_DIR = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(VIDEO_DIR))
sys.path.insert(0, os.path.join(ROOT, "scripts", "audio"))

from dsp import (SR, ns, st, dbg, read_wav, write_wav, integrated, true_peak, fades)
import timeline as T

N = ns(T.DUR)
TARGET_LUFS = -15.0
CEIL_DBTP = -1.2
DUCK_DB = -3.0

MUSIC_TARGET = {
    "hook": -9.5, "dormant": -10.5, "smoke": -11.0, "eruption": -9.5,
    "suwerte": -10.5, "malas": -10.5, "sunshade": -10.0, "cooling": -10.5,
    "observatory": -9.5,
}


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


def load_voice():
    x, sr = read_wav(os.path.join(VIDEO_DIR, "narration.wav"))
    assert sr == SR, sr
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return st(out)


def speech_spans(words, merge=0.3):
    sp = []
    for w in words:
        s, e = float(w["s"]), float(w["e"])
        if sp and s - sp[-1][1] < merge:
            sp[-1][1] = max(sp[-1][1], e)
        else:
            sp.append([s, e])
    return sp


def duck_db(spans, depth=DUCK_DB, pre=0.08, post=0.12, att=0.07, rel=0.45):
    ctrl = 1000
    nc = int(T.DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        tgt = va[i]
        e += (tgt - e) * (ka if tgt > e else kr)
        env[i] = e
    return np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env)


def section_db(m_ducked, v):
    import music
    secs = music.SECTIONS
    gains = {}
    for name, a, b in secs:
        seg = slice(ns(a), ns(b))
        Lm, Lv = integrated(m_ducked[:, seg]), integrated(v[:, seg])
        gains[name] = (Lv + MUSIC_TARGET[name] - Lm) if np.isfinite(Lm) and np.isfinite(Lv) else 0.0
    curve = np.zeros(N)
    t = np.arange(N) / SR
    for name, a, _b in secs:
        curve[t >= a] = gains[name]
    sm = ndimage.uniform_filter1d(curve, ns(0.4), mode="nearest")
    hard = np.zeros(N, bool)
    hard[ns(max(0.0, T.FLASH - 0.25)): ns(min(T.DUR, T.FLASH + 0.25))] = True
    return np.where(hard, curve, sm), gains


def limiter(x, ceil_db=CEIL_DBTP, look=0.003, rel=0.08):
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g2 = g1.copy()
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        kr = 1 - np.exp(-1 / (rel * SR))
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest")
    g3 = np.minimum(g3, 1.0)
    return x * g3[None, :], g3


def lufs(x):
    v = integrated(x)
    return v if np.isfinite(v) else -99.0


def main():
    t0 = time.time()
    words = T.words(os.path.join(VIDEO_DIR, "words.json"))
    spans = speech_spans(words)
    v = load_voice()
    v_ref = integrated(v)
    log(f"voice: {v_ref:.2f} LUFS (as stereo), TP {true_peak(v):.2f} dBTP")

    import music
    b = music.build()
    m_raw, _ = music.render(b, ref=-20.0)
    log(f"music raw: {lufs(m_raw):.2f} LUFS")
    m_d = m_raw * dbg(duck_db(spans))[None, :]
    sec_curve, _ = section_db(m_d, v)
    m = m_d * dbg(sec_curve)[None, :]
    end = ns(T.DUR - 0.03)
    m[:, end:] *= np.linspace(1, 0, N - end)[None, :]

    import sfx
    s_st, C = sfx.render(v_ref)
    log(f"sfx rendered: {lufs(s_st):.2f} LUFS ({len(C)} cues)")

    mix0 = v + m + s_st
    G = TARGET_LUFS - lufs(mix0)
    for it in range(5):
        y, g3 = limiter(mix0 * dbg(G))
        L = lufs(y)
        log(f"master iter {it}: gain {G:+.2f} dB -> {L:.2f} LUFS, TP {true_peak(y):.2f} dBTP")
        if abs(L - TARGET_LUFS) < 0.02:
            break
        G += TARGET_LUFS - L

    g = dbg(G)
    write_wav(os.path.join(HERE, "mix.wav"), fades(y, 0.003, 0.03))
    write_wav(os.path.join(HERE, "stem_voice.wav"), fades(v * g, 0.003, 0.03))
    write_wav(os.path.join(HERE, "stem_music.wav"), fades(m * g, 0.003, 0.03))
    write_wav(os.path.join(HERE, "stem_sfx.wav"), fades(s_st * g, 0.003, 0.03))
    log(f"wrote mix.wav + stems in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
