# Driving yet curious E-minor / G-major storytelling score for CebuShort.
import numpy as np
from dsp import SR, ns, rng, dbg, pan, place, lp, hp, make_ir, convolve_st
from instruments import m2f, vibes, pluck, glock, musicbox, brass, pad, brush, timpani, triangle, cymbal
from timeline import (
    DUR, BEAT, HOOK_SHAKE_T, FLASH_T, BOHOL_SHOCK_T, CEBU_SHAKE_T, COLLAPSE_T,
    TAP_T, TOWER_WOBBLE_T, FAULT_SLIP_T, BASE_JOLT_T, STRESS_T, COMPARE_T, QUESTION_T,
)

# Em7 | Cmaj7 | Gmaj7 | Dsus4
CHORDS_CURIOUS = [
    [52, 55, 59, 62],  # Em7 (E3, G3, B3, D4)
    [48, 52, 55, 59],  # Cmaj7 (C3, E3, G3, B3)
    [43, 47, 50, 54],  # Gmaj7 (G2, B2, D3, F#3)
    [50, 55, 57, 62],  # Dsus4 (D3, G3, A3, D4)
]
CHORDS_URGENT = [
    [52, 55, 59, 64],  # Em
    [48, 52, 55, 60],  # C
    [45, 48, 52, 55],  # Am7
    [47, 50, 54, 59],  # Bm7 / D
]
BASS_CURIOUS = [40, 36, 43, 38]  # E2, C2, G2, D2
BASS_URGENT = [40, 36, 33, 35]   # E2, C2, A1, B1


def build(dur=DUR, seed=706):
    r = rng(seed)
    N = ns(dur)
    dry = np.zeros((2, N))
    wet = np.zeros((2, N))
    total_beats = int(dur / BEAT) + 1

    # 1. Warm Tuba / Bass Pulse
    for b in range(total_beats):
        t = b * BEAT
        if t < 0.8 or t >= dur - 1.0:
            continue
        bar = b // 4
        beat_in_bar = b % 4
        is_urgent = (8.0 <= t <= 20.0) or (32.0 <= t <= 42.0) or (48.0 <= t <= 56.0)
        roots = BASS_URGENT if is_urgent else BASS_CURIOUS
        root = roots[bar % 4]
        if beat_in_bar == 0:
            note = brass(m2f(root), min(BEAT * 1.4, 0.7), vel=0.58, r=r, kind="tuba", scoop=-7.0)
            place(dry, pan(note, 0.0), t, gain=dbg(-11.2))
        elif beat_in_bar == 2 and t >= FLASH_T:
            note = brass(m2f(root + 7 if bar % 2 == 0 else root + 12), min(BEAT * 0.85, 0.42), vel=0.44, r=r, kind="tuba", scoop=-5.0)
            place(dry, pan(note, -0.05), t, gain=dbg(-14.2))

    # 2. Brush Groove (light and propulsive)
    for step in range(total_beats * 2):
        t = step * (BEAT * 0.5)
        if t < FLASH_T or t >= dur - 0.8:
            continue
        in_bar = step % 8
        energy = 1.08 if (14.5 <= t <= 20.2 or 32.0 <= t <= 42.0) else 0.90
        if in_bar in (0, 3, 6):
            br = brush(vel=0.42 * energy, r=r, dur=0.16, swish=(in_bar == 6))
            place(dry, pan(br, 0.14 if in_bar % 2 else -0.14), t, gain=dbg(-17.2))
        if in_bar in (2, 6) and (t >= 20.2):
            br2 = brush(vel=0.46 * energy, r=r, dur=0.22, swish=True)
            place(dry, pan(br2, 0.22), t, gain=dbg(-16.0))

    # 3. Plucked Arpeggio & Vibes Texture
    arp_pat = [0, 1, 2, 3, 2, 1, 2, 3]
    for step in range(total_beats * 2):
        t = step * (BEAT * 0.5)
        if t >= dur - 0.6:
            break
        bar = (step // 8) % 4
        is_urgent = (8.0 <= t <= 20.0) or (32.0 <= t <= 42.0)
        chords = CHORDS_URGENT if is_urgent else CHORDS_CURIOUS
        midi = chords[bar][arp_pat[step % 8]]
        if step % 2 == 0 or t >= 20.0:
            pl = pluck(m2f(midi + (12 if step % 4 == 3 else 0)), vel=0.55, r=r, dur=0.65, bright=0.48)
            place(wet, pan(pl, -0.28 if step % 2 == 0 else 0.28), t, gain=dbg(-14.8))
        if step % 4 == 0:
            vb = vibes(m2f(midi + 12), vel=0.48, r=r, dur=1.2, trem=4.8, trem_depth=0.22)
            place(wet, pan(vb, -0.18 if bar % 2 == 0 else 0.18), t, gain=dbg(-14.4))

    # 4. Storytelling Melody Phrases (Vibes + Musicbox)
    phrases = [
        # Hook (0.25 - 4.4s): curious bell-tower motif
        (0.25, [(0.0, 71, 0.68), (0.55, 74, 0.64), (1.10, 76, 0.74), (1.80, 74, 0.66), (2.50, 71, 0.72), (3.20, 69, 0.65), (3.85, 71, 0.78)]),
        # Bohol M7.2 + Strait Crossing (5.0 - 14.8s): tense rising intervals
        (5.00, [(0.0, 67, 0.65), (0.65, 71, 0.70), (1.30, 74, 0.76), (2.10, 76, 0.80), (3.00, 79, 0.82), (4.00, 78, 0.74), (4.90, 76, 0.78),
                (6.00, 74, 0.72), (7.00, 76, 0.76), (8.00, 79, 0.82), (9.00, 76, 0.75)]),
        # Basilica Collapse (15.4 - 19.6s): dramatic descent
        (15.40, [(0.0, 79, 0.80), (0.70, 76, 0.78), (1.45, 74, 0.82), (2.25, 71, 0.78), (3.10, 67, 0.74)]),
        # Table & Block Tower Analogy (20.2 - 31.2s): playful discovery bounce
        (20.20, [(0.0, 71, 0.66), (0.55, 74, 0.70), (1.15, 76, 0.75), (1.85, 79, 0.80), (2.65, 76, 0.72), (3.45, 74, 0.75),
                 (4.40, 71, 0.70), (5.20, 74, 0.74), (6.00, 76, 0.78), (6.90, 79, 0.82), (7.90, 78, 0.76), (8.90, 76, 0.78)]),
        # Underground Fault & Waves (32.0 - 41.8s): pulsing drive
        (32.00, [(0.0, 64, 0.68), (0.75, 67, 0.72), (1.50, 71, 0.78), (2.35, 74, 0.80), (3.25, 76, 0.82), (4.30, 79, 0.84),
                 (5.40, 76, 0.76), (6.50, 74, 0.74), (7.60, 71, 0.76), (8.60, 74, 0.78)]),
        # Inertia Physics Rig (42.5 - 52.2s): analytical rhythmic syncopation
        (42.50, [(0.0, 71, 0.72), (0.70, 74, 0.75), (1.40, 76, 0.78), (2.25, 79, 0.82), (3.20, 81, 0.84), (4.20, 79, 0.78),
                 (5.30, 76, 0.76), (6.40, 74, 0.74), (7.50, 76, 0.78), (8.60, 74, 0.76)]),
        # Damage Comparison & Question Turnaround (52.8 - 60.5s)
        (52.80, [(0.0, 74, 0.74), (0.80, 76, 0.78), (1.65, 79, 0.82), (2.60, 83, 0.86), (3.60, 81, 0.80), (4.70, 79, 0.78),
                 (5.80, 76, 0.76), (6.80, 74, 0.74)]),
    ]
    for base_t, notes in phrases:
        for dt, midi, vel in notes:
            t = base_t + dt
            if t >= dur - 0.25:
                continue
            vb = vibes(m2f(midi), vel=vel, r=r, dur=1.4, trem=4.8, trem_depth=0.22)
            place(wet, pan(vb, 0.14), t, gain=dbg(-12.0))
            if midi >= 74 or (20.2 <= t <= 31.2):
                mb = musicbox(m2f(midi + 12), vel=vel * 0.62, r=r, dur=1.1)
                place(wet, pan(mb, -0.22), t, gain=dbg(-17.8))

    # 5. Warm String Pads + Horn Accents
    pad_spans = [
        (0.0,  4.8,  [52, 55, 59, 62], -18.5),
        (4.8,  15.2, [48, 52, 55, 59], -17.0),
        (15.2, 20.0, [52, 55, 59, 64], -15.5),
        (31.8, 42.3, [45, 48, 52, 55], -16.0),
        (42.3, 52.6, [52, 55, 59, 62], -16.0),
        (52.6, 58.5, [43, 47, 50, 54], -15.5),
        (58.5, dur,  [50, 55, 57, 62], -16.5),  # open Dsus4 turnaround back to Em7 hook!
    ]
    for t0, t1, notes, g_db in pad_spans:
        d = min(t1, dur) - t0
        if d <= 0.4:
            continue
        p_sig = pad([m2f(m) for m in notes], d, vel=0.56, r=r, att=0.6, rel=0.8, warm=950.0)
        place(wet, p_sig, t0, gain=dbg(g_db))

    for t, midi, d, g_db in [
        (8.9, 64, 1.8, -16.0), (16.8, 67, 2.2, -14.2), (32.5, 64, 2.0, -15.0),
        (42.6, 67, 2.0, -15.5), (55.8, 71, 2.2, -14.5),
    ]:
        h_sig = brass(m2f(midi), d, vel=0.66, r=r, kind="horn", scoop=-9.0, rel=0.14)
        place(wet, pan(h_sig, -0.18), t, gain=dbg(g_db))

    # 6. Musical Punctuation
    for t_hit, strength in [
        (HOOK_SHAKE_T, 0.55), (FLASH_T, 0.62), (BOHOL_SHOCK_T, 0.78),
        (CEBU_SHAKE_T, 0.72), (COLLAPSE_T, 0.85), (FAULT_SLIP_T, 0.78),
        (BASE_JOLT_T, 0.72), (COMPARE_T, 0.74),
    ]:
        tp = timpani(m2f(40), vel=strength, r=r, dur=1.8)
        place(dry, pan(tp, -0.08), t_hit, gain=dbg(-12.5))
        cym = cymbal(vel=strength * 0.48, r=r, dur=1.8, bright=0.85)
        place(wet, pan(cym, 0.12), t_hit, gain=dbg(-21.2))

    for t_gl, midi in [
        (TAP_T, 88), (TOWER_WOBBLE_T, 91), (STRESS_T, 88), (QUESTION_T, 91),
    ]:
        gl = glock(m2f(midi), vel=0.68, r=r, dur=1.3)
        place(wet, pan(gl, 0.24), t_gl, gain=dbg(-15.5))
        tr = triangle(vel=0.45, r=r, dur=1.1)
        place(wet, pan(tr, -0.24), t_gl, gain=dbg(-20.0))

    ir = make_ir(rt60=1.12, seed=seed + 9, pre=0.014, hf=0.78)
    wet_rev = convolve_st(wet, ir)[:, :N]
    mix = dry + wet * 0.65 + wet_rev * 0.42
    mix = hp(mix, 34.0, order=2)
    mix = lp(mix, 13500.0, order=2)
    return mix
