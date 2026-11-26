# Warm F-major / D-minor rainforest sanctuary storytelling score for DavaoShort.
import numpy as np
from dsp import SR, ns, rng, dbg, pan, place, lp, hp, make_ir, convolve_st
from instruments import m2f, vibes, pluck, glock, musicbox, brass, pad, brush, timpani, triangle, cymbal
from timeline import (
    DUR, BEAT, FLASH_T, HATCH_92_T, PAGASA_T, CHICK_NEWS_T, MATCH_EGG_T,
    SEED2_T, GEN2_T, HATCH_13_T, MABUHAY_T, FOREST_WIDE_T, LINK_T, QUESTION_T,
)

# Warm pastoral F major / Dm7 progression:
# Dm7 | Bbmaj7 | Fmaj7 | Csus4 -> C7
CHORDS_WARM = [
    [50, 53, 57, 60],  # Dm7 (D3, F3, A3, C4)
    [46, 50, 53, 57],  # Bbmaj7 (Bb2, D3, F3, A3)
    [53, 57, 60, 64],  # Fmaj7 (F3, A3, C4, E4)
    [48, 53, 55, 60],  # Csus4 (C3, F3, G3, C4)
]
CHORDS_HOPE = [
    [53, 57, 60, 64],  # Fmaj7
    [48, 52, 55, 60],  # C6/C
    [50, 53, 57, 60],  # Dm7
    [46, 50, 53, 57],  # Bbmaj7
]
BASS_WARM = [38, 34, 41, 36]  # D2, Bb1, F2, C2
BASS_HOPE = [41, 36, 38, 34]  # F2, C2, D2, Bb1


def build(dur=DUR, seed=606):
    r = rng(seed)
    N = ns(dur)
    dry = np.zeros((2, N))
    wet = np.zeros((2, N))
    total_beats = int(dur / BEAT) + 1

    # 1. Warm Upright Tuba / Bass Foundation
    for b in range(total_beats):
        t = b * BEAT
        if t < 1.0 or t >= dur - 1.2:
            continue
        bar = b // 4
        beat_in_bar = b % 4
        is_hope = (22.5 <= t <= 36.8 or t >= 44.0)
        roots = BASS_HOPE if is_hope else BASS_WARM
        root = roots[bar % 4]
        if beat_in_bar == 0:
            note = brass(m2f(root), min(BEAT * 1.45, 0.75), vel=0.56, r=r, kind="tuba", scoop=-7.0)
            place(dry, pan(note, 0.0), t, gain=dbg(-11.0))
        elif beat_in_bar == 2 and t >= 6.8:
            note = brass(m2f(root + 7 if bar % 2 == 0 else root + 12), min(BEAT * 0.9, 0.45), vel=0.42, r=r, kind="tuba", scoop=-5.0)
            place(dry, pan(note, -0.05), t, gain=dbg(-14.0))

    # 2. Gentle Brush Groove (propulsive yet warm under voice)
    for step in range(total_beats * 2):
        t = step * (BEAT * 0.5)
        if t < FLASH_T or t >= dur - 0.8:
            continue
        in_bar = step % 8
        energy = 0.72 if (23.0 <= t < 28.4) else (1.12 if t >= 55.0 else 0.95)
        if in_bar in (0, 3, 6):
            br = brush(vel=0.40 * energy, r=r, dur=0.16, swish=(in_bar == 6))
            place(dry, pan(br, 0.15 if in_bar % 2 else -0.14), t, gain=dbg(-17.5))
        if in_bar in (2, 6) and (28.4 <= t <= 42.5 or t >= 51.8):
            br2 = brush(vel=0.48 * energy, r=r, dur=0.22, swish=True)
            place(dry, pan(br2, 0.22), t, gain=dbg(-16.0))

    # 3. Acoustic Pluck Arpeggio & Vibes Texture
    arp_pat = [0, 1, 2, 3, 2, 1, 2, 3]
    for step in range(total_beats * 2):
        t = step * (BEAT * 0.5)
        if t >= dur - 0.7:
            break
        bar = (step // 8) % 4
        chords = CHORDS_HOPE if (22.5 <= t <= 36.8 or t >= 44.0) else CHORDS_WARM
        midi = chords[bar][arp_pat[step % 8]]
        if step % 2 == 0 or t >= 22.5:
            pl = pluck(m2f(midi + (12 if step % 4 == 3 else 0)), vel=0.54, r=r, dur=0.68, bright=0.46)
            place(wet, pan(pl, -0.30 if step % 2 == 0 else 0.30), t, gain=dbg(-15.0))
        if step % 4 == 0:
            vb = vibes(m2f(midi + 12), vel=0.50, r=r, dur=1.25, trem=4.6, trem_depth=0.22)
            place(wet, pan(vb, -0.20 if bar % 2 == 0 else 0.20), t, gain=dbg(-14.2))

    # 4. Catchy Storytelling Melody Phrases (Vibes + Musicbox)
    phrases = [
        # Hook (0.3 - 6.2s): curious egg question motif
        (0.30, [(0.0, 69, 0.65), (0.60, 72, 0.60), (1.20, 74, 0.72), (1.95, 72, 0.65), (2.70, 69, 0.70), (3.45, 67, 0.62), (4.20, 69, 0.78)]),
        # 1992 Hatchery Pag-asa (7.0 - 15.8s): tender awakening -> bright triumph
        (7.10, [(0.0, 65, 0.62), (0.65, 69, 0.68), (1.35, 72, 0.75), (2.20, 77, 0.80), (3.10, 76, 0.72), (3.95, 74, 0.75), (4.90, 72, 0.70), (5.80, 74, 0.78)]),
        # Team joy (16.8 - 22.4s): warm celebratory bounce
        (16.80, [(0.0, 74, 0.70), (0.55, 76, 0.68), (1.10, 77, 0.80), (1.85, 81, 0.82), (2.65, 79, 0.74), (3.55, 77, 0.78)]),
        # Match cut golden egg 2013 (23.2 - 28.0s): shimmering echo of hook
        (23.20, [(0.0, 77, 0.70), (0.75, 76, 0.65), (1.50, 74, 0.72), (2.30, 72, 0.70), (3.15, 74, 0.76)]),
        # Nursery "Punlaan" analogy (28.6 - 36.4s): playful growing steps
        (28.60, [(0.0, 69, 0.65), (0.55, 72, 0.68), (1.10, 74, 0.72), (1.80, 77, 0.78), (2.60, 79, 0.75), (3.40, 81, 0.82), (4.30, 79, 0.75), (5.20, 77, 0.80)]),
        # Pag-asa & Kalinawan + 2013 Mabuhay hatch (37.2 - 51.0s): radiant family motif
        (37.20, [(0.0, 72, 0.68), (0.85, 74, 0.72), (1.70, 77, 0.78), (2.65, 76, 0.72), (3.60, 74, 0.75)]),
        (43.20, [(0.0, 74, 0.72), (0.75, 77, 0.78), (1.45, 81, 0.84), (2.40, 84, 0.86), (3.40, 81, 0.80), (4.50, 79, 0.78), (5.60, 77, 0.82)]),
        # Vast Mindanao Forest & Soaring Climax (52.0 - 65.2s)
        (52.20, [(0.0, 77, 0.75), (0.90, 79, 0.78), (1.80, 81, 0.84), (2.80, 84, 0.88), (4.00, 86, 0.90), (5.10, 84, 0.84), (6.20, 81, 0.84),
                 (7.40, 79, 0.80), (8.40, 77, 0.82), (9.50, 74, 0.78), (10.60, 72, 0.76), (11.60, 69, 0.74)]),
    ]
    for base_t, notes in phrases:
        for dt, midi, vel in notes:
            t = base_t + dt
            if t >= dur - 0.25:
                continue
            vb = vibes(m2f(midi), vel=vel, r=r, dur=1.45, trem=4.8, trem_depth=0.24)
            place(wet, pan(vb, 0.14), t, gain=dbg(-11.8))
            if midi >= 74 or (23.0 <= t <= 28.4) or (43.0 <= t <= 51.5):
                mb = musicbox(m2f(midi + 12), vel=vel * 0.65, r=r, dur=1.2)
                place(wet, pan(mb, -0.24), t, gain=dbg(-17.8))

    # 5. Warm String Pads + Soaring Horn Counter-lines
    pad_spans = [
        (0.0,  6.8,  [50, 53, 57, 60], -18.5),
        (6.8,  16.5, [53, 57, 60, 64], -17.0),
        (23.0, 28.4, [46, 50, 53, 57], -16.5),
        (37.0, 51.8, [53, 57, 60, 64], -15.5),
        (51.8, 62.5, [50, 53, 57, 64], -14.5),
        (62.5, dur,  [48, 53, 55, 60], -16.8),  # open Csus4 turnaround back to Dm7 hook!
    ]
    for t0, t1, notes, g_db in pad_spans:
        d = min(t1, dur) - t0
        if d <= 0.4:
            continue
        p_sig = pad([m2f(m) for m in notes], d, vel=0.58, r=r, att=0.65, rel=0.85, warm=950.0)
        place(wet, p_sig, t0, gain=dbg(g_db))

    for t, midi, d, g_db in [
        (44.5, 65, 2.0, -16.5), (48.0, 69, 2.0, -15.5),
        (55.5, 69, 2.4, -14.5), (58.8, 72, 2.5, -14.0), (61.8, 67, 2.2, -15.0),
    ]:
        h_sig = brass(m2f(midi), d, vel=0.66, r=r, kind="horn", scoop=-9.0, rel=0.14)
        place(wet, pan(h_sig, -0.18), t, gain=dbg(g_db))

    # 6. Musical Punctuation
    for t_hit, strength in [
        (FLASH_T, 0.62), (PAGASA_T, 0.72), (CHICK_NEWS_T, 0.68),
        (MABUHAY_T, 0.78), (FOREST_WIDE_T, 0.82), (LINK_T, 0.72),
    ]:
        tp = timpani(m2f(41), vel=strength, r=r, dur=1.8)
        place(dry, pan(tp, -0.08), t_hit, gain=dbg(-12.8))
        cym = cymbal(vel=strength * 0.50, r=r, dur=2.0, bright=0.85)
        place(wet, pan(cym, 0.12), t_hit, gain=dbg(-21.0))

    for t_gl, midi in [
        (3.85, 86), (HATCH_92_T, 89), (PAGASA_T, 93), (MATCH_EGG_T, 89),
        (SEED2_T, 88), (GEN2_T, 93), (HATCH_13_T, 89), (MABUHAY_T, 93), (QUESTION_T, 89),
    ]:
        gl = glock(m2f(midi), vel=0.70, r=r, dur=1.4)
        place(wet, pan(gl, 0.25), t_gl, gain=dbg(-15.5))
        tr = triangle(vel=0.45, r=r, dur=1.2)
        place(wet, pan(tr, -0.25), t_gl, gain=dbg(-20.0))

    ir = make_ir(rt60=1.15, seed=seed + 9, pre=0.014, hf=0.78)
    wet_rev = convolve_st(wet, ir)[:, :N]
    mix = dry + wet * 0.65 + wet_rev * 0.42
    mix = hp(mix, 34.0, order=2)
    mix = lp(mix, 13500.0, order=2)
    return mix
