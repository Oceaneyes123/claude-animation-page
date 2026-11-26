# Warm, curious D-minor / F-major urban-history storytelling score for DivisoriaShort.
import numpy as np
from dsp import SR, ns, rng, dbg, pan, place, lp, hp, make_ir, convolve_st
from instruments import m2f, vibes, pluck, glock, musicbox, brass, pad, brush, timpani, triangle, cymbal
from timeline import (
    DUR, BEAT, HOOK_FIRE_T, FLASH_T, OPEN_SPACE_T, DIVISORIA_T,
    FIRE_SIDE_T, IGNITE_1_T, GAP_BURN_T, EMBER_WIND_T, MAP_HIGHLIGHT_T, QUESTION_T,
)

# Dm7 | Bbmaj7 | Fmaj7 | Csus4
CHORDS_CURIOUS = [
    [50, 53, 57, 60],  # Dm7
    [46, 50, 53, 57],  # Bbmaj7
    [53, 57, 60, 64],  # Fmaj7
    [48, 53, 55, 60],  # Csus4
]
CHORDS_URGENT = [
    [50, 53, 57, 62],  # Dm
    [46, 50, 53, 58],  # Bb
    [43, 46, 50, 53],  # Gm7
    [45, 48, 52, 57],  # Am7
]
BASS_CURIOUS = [38, 34, 41, 36]  # D2, Bb1, F2, C2
BASS_URGENT  = [38, 34, 31, 33]  # D2, Bb1, G1, A1


def build(dur=DUR, seed=806):
    r = rng(seed)
    N = ns(dur)
    dry = np.zeros((2, N))
    wet = np.zeros((2, N))
    total_beats = int(dur / BEAT) + 1

    # 1. Warm Tuba / Bass Pulse
    for b in range(total_beats):
        t = b * BEAT
        if t < 0.7 or t >= dur - 0.9:
            continue
        bar = b // 4
        beat_in_bar = b % 4
        is_urgent = (22.8 <= t <= 29.5) or (42.8 <= t <= 49.0)
        roots = BASS_URGENT if is_urgent else BASS_CURIOUS
        root = roots[bar % 4]
        if beat_in_bar == 0:
            note = brass(m2f(root), min(BEAT * 1.4, 0.7), vel=0.56, r=r, kind="tuba", scoop=-7.0)
            place(dry, pan(note, 0.0), t, gain=dbg(-11.4))
        elif beat_in_bar == 2 and t >= FLASH_T:
            note = brass(m2f(root + 7 if bar % 2 == 0 else root + 12), min(BEAT * 0.85, 0.42), vel=0.42, r=r, kind="tuba", scoop=-5.0)
            place(dry, pan(note, -0.05), t, gain=dbg(-14.2))

    # 2. Light Brush Groove
    for step in range(total_beats * 2):
        t = step * (BEAT * 0.5)
        if t < FLASH_T or t >= dur - 0.7:
            continue
        in_bar = step % 8
        energy = 1.06 if (22.8 <= t <= 29.5 or 42.8 <= t <= 48.0) else 0.90
        if in_bar in (0, 3, 6):
            br = brush(vel=0.42 * energy, r=r, dur=0.16, swish=(in_bar == 6))
            place(dry, pan(br, 0.14 if in_bar % 2 else -0.14), t, gain=dbg(-17.4))
        if in_bar in (2, 6) and t >= 29.8:
            br2 = brush(vel=0.44 * energy, r=r, dur=0.22, swish=True)
            place(dry, pan(br2, 0.22), t, gain=dbg(-16.2))

    # 3. Plucked Arpeggio & Vibes Texture
    arp_pat = [0, 1, 2, 3, 2, 1, 2, 3]
    for step in range(total_beats * 2):
        t = step * (BEAT * 0.5)
        if t >= dur - 0.6:
            break
        bar = (step // 8) % 4
        is_urgent = (22.8 <= t <= 29.5) or (42.8 <= t <= 48.0)
        chords = CHORDS_URGENT if is_urgent else CHORDS_CURIOUS
        midi = chords[bar][arp_pat[step % 8]]
        if step % 2 == 0 or t >= 14.5:
            pl = pluck(m2f(midi + (12 if step % 4 == 3 else 0)), vel=0.54, r=r, dur=0.65, bright=0.48)
            place(wet, pan(pl, -0.26 if step % 2 == 0 else 0.26), t, gain=dbg(-14.8))
        if step % 4 == 0:
            vb = vibes(m2f(midi + 12), vel=0.46, r=r, dur=1.2, trem=4.8, trem_depth=0.22)
            place(wet, pan(vb, -0.16 if bar % 2 == 0 else 0.16), t, gain=dbg(-14.6))

    # 4. Storytelling Melody Phrases (Vibes + Musicbox)
    phrases = [
        # Hook (0.25 - 6.1s)
        (0.25, [(0.0, 69, 0.68), (0.65, 72, 0.65), (1.30, 74, 0.74), (2.10, 72, 0.66), (2.95, 69, 0.72), (3.85, 67, 0.68), (4.70, 69, 0.76)]),
        # Early 20th-c. CDO + Plaza (6.8 - 22.0s)
        (6.80, [(0.0, 65, 0.65), (0.85, 69, 0.70), (1.70, 72, 0.76), (2.65, 74, 0.78), (3.65, 77, 0.80), (4.75, 76, 0.74),
                (5.85, 74, 0.76), (7.10, 72, 0.72), (8.30, 74, 0.76), (9.60, 77, 0.80), (11.00, 74, 0.74), (12.40, 72, 0.75)]),
        # Golden Firebreak (22.9 - 29.4s)
        (22.9, [(0.0, 77, 0.80), (0.80, 74, 0.78), (1.65, 72, 0.80), (2.55, 69, 0.76), (3.55, 74, 0.78), (4.65, 72, 0.74)]),
        # Paper Strip Analogy (30.0 - 42.2s)
        (30.0, [(0.0, 69, 0.66), (0.75, 72, 0.72), (1.50, 74, 0.76), (2.35, 77, 0.80), (3.25, 74, 0.74), (4.20, 72, 0.76),
                (5.20, 69, 0.70), (6.15, 72, 0.74), (7.15, 74, 0.78), (8.20, 77, 0.82), (9.30, 76, 0.76), (10.50, 74, 0.78)]),
        # Golden Wind & Embers (42.8 - 50.6s)
        (42.8, [(0.0, 67, 0.70), (0.85, 70, 0.74), (1.70, 74, 0.78), (2.65, 77, 0.82), (3.65, 76, 0.76), (4.75, 74, 0.74), (5.90, 72, 0.76)]),
        # City Relief Map & Loop Question (51.2 - 61.0s)
        (51.2, [(0.0, 72, 0.74), (0.90, 74, 0.78), (1.85, 77, 0.82), (2.85, 81, 0.86), (3.90, 79, 0.80), (5.00, 77, 0.78),
                (6.15, 74, 0.76), (7.35, 72, 0.74), (8.55, 69, 0.72)]),
    ]
    for base_t, notes in phrases:
        for dt, midi, vel in notes:
            t = base_t + dt
            if t >= dur - 0.25:
                continue
            vb = vibes(m2f(midi), vel=vel, r=r, dur=1.4, trem=4.8, trem_depth=0.22)
            place(wet, pan(vb, 0.14), t, gain=dbg(-12.2))
            if midi >= 72 or (30.0 <= t <= 42.2):
                mb = musicbox(m2f(midi + 12), vel=vel * 0.62, r=r, dur=1.1)
                place(wet, pan(mb, -0.22), t, gain=dbg(-17.8))

    # 5. Warm String Pads + Beat Accents
    pad_spans = [
        (0.0,  6.5,  [50, 53, 57, 60], -18.5),
        (6.6,  22.7, [46, 50, 53, 57], -17.5),
        (22.8, 29.7, [50, 53, 57, 62], -15.8),
        (42.6, 50.9, [43, 46, 50, 53], -16.2),
        (51.0, dur,  [53, 57, 60, 64], -17.2),
    ]
    for t0, t1, notes_m, gdb in pad_spans:
        p = pad([m2f(m) for m in notes_m], max(1.0, t1 - t0), vel=0.52, r=r, att=0.45, rel=0.75, warm=950.0)
        place(wet, p, t0, gain=dbg(gdb))

    for tm, midi in [(HOOK_FIRE_T, 69), (OPEN_SPACE_T, 74), (DIVISORIA_T, 77), (IGNITE_1_T, 74), (GAP_BURN_T, 77), (MAP_HIGHLIGHT_T, 81)]:
        gl = glock(m2f(midi + 12), vel=0.62, r=r, dur=1.2)
        place(wet, pan(gl, 0.18), tm, gain=dbg(-14.5))

    for tm in [FIRE_SIDE_T, EMBER_WIND_T]:
        tp = timpani(m2f(38), vel=0.78, r=r, dur=1.4)
        place(dry, pan(tp, -0.1), tm, gain=dbg(-11.5))

    place(wet, pan(triangle(vel=0.52, r=r, dur=1.2, f=1480.0), 0.2), QUESTION_T, gain=dbg(-15.5))
    place(wet, pan(cymbal(vel=0.42, r=r, dur=1.6, bright=0.8), 0.0), FLASH_T - 0.12, gain=dbg(-17.5))

    ir = make_ir(rt60=1.05, seed=seed + 9, pre=0.014, hf=0.78)
    room = convolve_st(wet, ir)[:, :N]
    total = dry + wet * 0.68 + room * 0.40
    total = lp(hp(total, 34.0, order=2), 13500.0, order=2)
    return total[:, :N]
