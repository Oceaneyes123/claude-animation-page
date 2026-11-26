# Bright, curious F-major / D-minor engineering-discovery score for TiwiShort.
import numpy as np
from dsp import SR, ns, rng, dbg, pan, place, lp, hp, make_ir, convolve_st
from instruments import m2f, vibes, pluck, glock, musicbox, brass, pad, brush, timpani, triangle, cymbal
from timeline import (
    DUR, BEAT, HOOK_STEAM_T, FLASH_T, POWER_1979_T, SEPARATE_T,
    BLOW_SPIN_T, TURBINE_PUSH_T, COIL_SPARK_T, BULB_LIGHT_T, QUESTION_T,
)

# Fmaj7 | C/E | Dm7 | Bbmaj7
CHORDS_DAY = [
    [53, 57, 60, 64],  # Fmaj7
    [52, 55, 60, 64],  # C/E
    [50, 53, 57, 60],  # Dm7
    [46, 50, 53, 57],  # Bbmaj7
]
# Dm7 | Bbmaj7 | Gm7 | A7sus4
CHORDS_DRIVE = [
    [50, 53, 57, 60],  # Dm7
    [46, 50, 53, 58],  # Bb
    [43, 46, 50, 53],  # Gm7
    [45, 50, 52, 57],  # A7sus4
]
BASS_DAY   = [41, 40, 38, 34]  # F2, E2, D2, Bb1
BASS_DRIVE = [38, 34, 31, 33]  # D2, Bb1, G1, A1


def build(dur=DUR, seed=906):
    r = rng(seed)
    N = ns(dur)
    dry = np.zeros((2, N))
    wet = np.zeros((2, N))
    total_beats = int(dur / BEAT) + 1

    # 1. Warm Tuba / Bass Pulse
    for b in range(total_beats):
        t = b * BEAT
        if t < 0.65 or t >= dur - 0.85:
            continue
        bar = b // 4
        beat_in_bar = b % 4
        is_drive = (30.4 <= t <= 46.4)
        roots = BASS_DRIVE if is_drive else BASS_DAY
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
        energy = 1.06 if (30.4 <= t <= 46.4 or 52.8 <= t <= 63.5) else 0.90
        if in_bar in (0, 3, 6):
            br = brush(vel=0.42 * energy, r=r, dur=0.16, swish=(in_bar == 6))
            place(dry, pan(br, 0.14 if in_bar % 2 else -0.14), t, gain=dbg(-17.4))
        if in_bar in (2, 6) and t >= 26.0:
            br2 = brush(vel=0.44 * energy, r=r, dur=0.22, swish=True)
            place(dry, pan(br2, 0.22), t, gain=dbg(-16.2))

    # 3. Plucked Arpeggio & Vibes Texture
    arp_pat = [0, 1, 2, 3, 2, 1, 2, 3]
    for step in range(total_beats * 2):
        t = step * (BEAT * 0.5)
        if t >= dur - 0.6:
            break
        bar = (step // 8) % 4
        is_drive = (30.4 <= t <= 46.4)
        chords = CHORDS_DRIVE if is_drive else CHORDS_DAY
        midi = chords[bar][arp_pat[step % 8]]
        if step % 2 == 0 or t >= 12.8:
            pl = pluck(m2f(midi + (12 if step % 4 == 3 else 0)), vel=0.54, r=r, dur=0.65, bright=0.48)
            place(wet, pan(pl, -0.26 if step % 2 == 0 else 0.26), t, gain=dbg(-14.8))
        if step % 4 == 0:
            vb = vibes(m2f(midi + 12), vel=0.46, r=r, dur=1.2, trem=4.8, trem_depth=0.22)
            place(wet, pan(vb, -0.16 if bar % 2 == 0 else 0.16), t, gain=dbg(-14.6))

    # 4. Storytelling Melody Phrases (Vibes + Musicbox)
    phrases = [
        # Hook (0.25 - 5.1s)
        (0.25, [(0.0, 69, 0.68), (0.65, 72, 0.66), (1.30, 77, 0.76), (2.05, 76, 0.68), (2.85, 74, 0.72), (3.70, 72, 0.68), (4.45, 74, 0.74)]),
        # 1979 Plant + Wells & Separator (5.6 - 24.2s)
        (5.60, [(0.0, 69, 0.65), (0.85, 72, 0.70), (1.75, 77, 0.78), (2.70, 76, 0.74), (3.70, 74, 0.72), (4.75, 72, 0.70),
                (5.90, 69, 0.68), (7.10, 72, 0.72), (8.30, 74, 0.76), (9.60, 77, 0.80), (10.90, 79, 0.82), (12.30, 77, 0.76),
                (13.70, 76, 0.74), (15.10, 74, 0.76), (16.50, 72, 0.74), (17.90, 74, 0.76)]),
        # Pinwheel Analogy (24.6 - 30.0s)
        (24.6, [(0.0, 72, 0.68), (0.75, 76, 0.74), (1.50, 79, 0.80), (2.35, 77, 0.76), (3.25, 76, 0.74), (4.20, 74, 0.76)]),
        # Golden Turbine & Inside Generator (30.5 - 46.2s)
        (30.5, [(0.0, 74, 0.74), (0.85, 77, 0.78), (1.70, 81, 0.82), (2.65, 79, 0.78), (3.65, 77, 0.76), (4.70, 74, 0.74),
                (5.85, 72, 0.72), (7.00, 74, 0.76), (8.20, 77, 0.80), (9.45, 81, 0.84), (10.75, 79, 0.78), (12.10, 77, 0.76),
                (13.50, 76, 0.74), (14.80, 77, 0.78)]),
        # Full Energy Chain -> Lightbulb & Loop Question (46.8 - 65.4s)
        (46.8, [(0.0, 69, 0.68), (0.90, 72, 0.72), (1.85, 74, 0.76), (2.85, 77, 0.80), (3.90, 76, 0.74), (5.00, 74, 0.74),
                (6.15, 77, 0.78), (7.35, 79, 0.82), (8.60, 81, 0.84), (9.90, 79, 0.80), (11.20, 77, 0.78),
                (12.55, 74, 0.74), (13.90, 77, 0.80), (15.30, 81, 0.86), (16.70, 84, 0.88), (18.10, 77, 0.76)]),
    ]
    for base_t, notes in phrases:
        for dt, midi, vel in notes:
            t = base_t + dt
            if t >= dur - 0.25:
                continue
            vb = vibes(m2f(midi), vel=vel, r=r, dur=1.4, trem=4.8, trem_depth=0.22)
            place(wet, pan(vb, 0.14), t, gain=dbg(-12.2))
            if midi >= 74 or (24.6 <= t <= 30.0):
                mb = musicbox(m2f(midi + 12), vel=vel * 0.62, r=r, dur=1.1)
                place(wet, pan(mb, -0.22), t, gain=dbg(-17.8))

    # 5. Warm String Pads + Beat Accents
    pad_spans = [
        (0.0,  5.3,  [53, 57, 60, 64], -18.5),
        (5.4,  30.3, [46, 50, 53, 57], -17.5),
        (30.4, 46.4, [50, 53, 57, 60], -15.8),
        (46.5, dur,  [53, 57, 60, 64], -17.0),
    ]
    for t0, t1, notes_m, gdb in pad_spans:
        p = pad([m2f(m) for m in notes_m], max(1.0, t1 - t0), vel=0.52, r=r, att=0.45, rel=0.75, warm=950.0)
        place(wet, p, t0, gain=dbg(gdb))

    for tm, midi in [(HOOK_STEAM_T, 72), (POWER_1979_T, 77), (SEPARATE_T, 76), (BLOW_SPIN_T, 79), (COIL_SPARK_T, 81), (BULB_LIGHT_T, 84)]:
        gl = glock(m2f(midi + 12), vel=0.62, r=r, dur=1.2)
        place(wet, pan(gl, 0.18), tm, gain=dbg(-14.5))

    for tm in [TURBINE_PUSH_T]:
        tp = timpani(m2f(38), vel=0.76, r=r, dur=1.4)
        place(dry, pan(tp, -0.1), tm, gain=dbg(-11.5))

    place(wet, pan(triangle(vel=0.52, r=r, dur=1.2, f=1480.0), 0.2), QUESTION_T, gain=dbg(-15.5))
    place(wet, pan(cymbal(vel=0.42, r=r, dur=1.6, bright=0.8), 0.0), FLASH_T - 0.12, gain=dbg(-17.5))

    ir = make_ir(rt60=1.05, seed=seed + 9, pre=0.014, hf=0.78)
    room = convolve_st(wet, ir)[:, :N]
    total = dry + wet * 0.68 + room * 0.40
    total = lp(hp(total, 34.0, order=2), 13500.0, order=2)
    return total[:, :N]
