# G-minor / Dorian archaeological storytelling score for BolinaoShort.
# Expressive cartoon-short ensemble: vibes, marimba/pluck arpeggios, glockenspiel gold sparkles,
# musicbox mystery shimmer, warm brass horn/tuba foundation, string pads, and crisp brush/timpani groove.
import numpy as np
from dsp import SR, ns, tt, rng, dbg, st, pan, place, lp, hp, widen, make_ir, convolve_st
from instruments import m2f, vibes, pluck, glock, musicbox, brass, pad, brush, timpani, triangle, cymbal
from timeline import (
    DUR, BEAT, BAR, FLASH_T, SKULL_T, TEETH_GOLD_T, FISH_T, RIVET_T,
    PEG_T, SCALE_FORM_T, JEWEL_T, TOOTH_FLIP_T, FINDS_T, HERITAGE_T, QUESTION_T,
)

# G minor progression per 2-bar phrase:
# Gm7 | Ebmaj7 | Cm7 | D7 (with Dorian lift C7 in pier/craft scenes)
GM_CHORDS = [
    [55, 58, 62, 65],  # Gm7 (G3, Bb3, D4, F4)
    [51, 55, 58, 62],  # Ebmaj7 (Eb3, G3, Bb3, D4)
    [48, 51, 55, 58],  # Cm7 (C3, Eb3, G3, Bb3)
    [50, 54, 57, 60],  # D7 (D3, F#3, A3, C4)
]
DORIAN_CHORDS = [
    [55, 58, 62, 67],  # Gm (G3, Bb3, D4, G4)
    [53, 57, 60, 64],  # Fmaj7
    [51, 55, 58, 62],  # Ebmaj7
    [50, 54, 57, 62],  # D7sus/D7
]
BASS_ROOTS_GM = [43, 39, 36, 38]      # G2, Eb2, C2, D2
BASS_ROOTS_DOR = [43, 41, 39, 38]     # G2, F2, Eb2, D2


def build(dur=DUR, seed=404):
    r = rng(seed)
    N = ns(dur)
    dry = np.zeros((2, N))
    wet = np.zeros((2, N))

    total_beats = int(dur / BEAT) + 1

    # 1. Warm Bass Foundation (soft upright tuba + octave bounce)
    for b in range(total_beats):
        t = b * BEAT
        if t >= dur - 0.3:
            break
        bar = b // 4
        beat_in_bar = b % 4
        if t < 1.2 or t > dur - 1.5:
            continue
        is_dorian = (18.0 <= t <= 36.0)
        roots = BASS_ROOTS_DOR if is_dorian else BASS_ROOTS_GM
        root = roots[bar % 4]
        fifth = root + 7

        # Landing on beat 0 & playful push on beat 2.5 in active scenes
        if beat_in_bar == 0:
            note = brass(m2f(root), min(BEAT * 1.4, 0.72), vel=0.58, r=r, kind="tuba", scoop=-8.0)
            place(dry, pan(note, 0.0), t, gain=dbg(-10.5))
        elif beat_in_bar == 2 and t >= 4.8:
            note = brass(m2f(fifth if bar % 2 == 0 else root + 12), min(BEAT * 0.9, 0.45), vel=0.45, r=r, kind="tuba", scoop=-6.0)
            place(dry, pan(note, -0.05), t, gain=dbg(-13.5))

    # 2. Rhythmic Brush & Percussion Pulse (keeps forward storytelling energy!)
    for step in range(total_beats * 2):  # eighth notes
        t = step * (BEAT * 0.5)
        if t < 4.86 or t >= dur - 0.9:
            continue
        in_bar = step % 8
        energy = 1.0
        if 11.5 <= t < 18.2 or 45.0 <= t < 54.0:
            energy = 0.68  # slightly airier under mystery & jewel moments
        elif t >= 59.6:
            energy = 1.15  # grand peak

        if in_bar in (0, 3, 6):
            br = brush(vel=0.42 * energy, r=r, dur=0.16, swish=(in_bar == 6))
            place(dry, pan(br, 0.16 if in_bar % 2 else -0.14), t, gain=dbg(-17.0))
        if in_bar in (2, 6) and (22.0 <= t <= 45.0 or t >= 59.6):
            br2 = brush(vel=0.5 * energy, r=r, dur=0.22, swish=True)
            place(dry, pan(br2, 0.22), t, gain=dbg(-15.5))

    # 3. Pluck Acoustic Arpeggio + Vibes Mystery Pulse (constant melodic texture!)
    arp_pat = [0, 1, 2, 3, 2, 1, 2, 3]
    for step in range(total_beats * 2):
        t = step * (BEAT * 0.5)
        if t >= dur - 0.8:
            break
        bar = (step // 8) % 4
        idx = arp_pat[step % 8]
        chords = DORIAN_CHORDS if (18.0 <= t <= 36.0) else GM_CHORDS
        chord = chords[bar]
        midi = chord[idx]

        # Alternating warm pluck & soft vibes
        if step % 2 == 0 or t >= 18.0:
            pl = pluck(m2f(midi + (12 if step % 4 == 3 else 0)), vel=0.55, r=r, dur=0.65, bright=0.48)
            p_pos = -0.32 if (step % 2 == 0) else 0.32
            place(wet, pan(pl, p_pos), t, gain=dbg(-15.0))
        if step % 4 == 0:
            vb = vibes(m2f(midi + 12), vel=0.52, r=r, dur=1.25, trem=4.8, trem_depth=0.22)
            place(wet, pan(vb, -0.22 if (bar % 2 == 0) else 0.22), t, gain=dbg(-14.0))

    # 4. Catchy Lead Storytelling Motif (Vibes + Glock + Musicbox)
    # Recurring G-minor hook motif: D5 - Eb5 - D5 - Bb4 - G4 - A4 - Bb4 - D5
    hook_phrases = [
        # Intro Hook (0 - 4.8s): curious question motif
        (0.25, [(0.0, 74, 0.65), (0.55, 75, 0.45), (1.05, 74, 0.6), (1.60, 70, 0.7), (2.35, 67, 0.75), (3.10, 69, 0.55), (3.65, 70, 0.8)]),
        # Balingasay discovery (5.2 - 11.2s): upward wonder
        (5.15, [(0.0, 67, 0.65), (0.55, 70, 0.65), (1.10, 74, 0.75), (1.85, 79, 0.8), (2.60, 77, 0.7), (3.45, 74, 0.75), (4.30, 75, 0.65), (5.00, 74, 0.8)]),
        # Gold-inlay teeth macro (11.8 - 17.8s): shimmering glock/musicbox repeats
        (11.80, [(0.0, 79, 0.7), (0.60, 77, 0.6), (1.20, 74, 0.7), (2.00, 79, 0.75), (2.60, 75, 0.65), (3.20, 74, 0.7), (4.00, 72, 0.65), (4.80, 74, 0.8)]),
        # Fish scales pier (18.4 - 22.2s): flowing triplets / Dorian lift
        (18.40, [(0.0, 74, 0.7), (0.50, 76, 0.65), (1.00, 79, 0.8), (1.70, 77, 0.7), (2.35, 74, 0.7), (3.00, 72, 0.65)]),
        # Knife rivets workshop (23.0 - 35.0s): playful rhythmic workshop melody
        (23.00, [(0.0, 74, 0.65), (0.52, 74, 0.55), (1.04, 70, 0.7), (1.80, 72, 0.65), (2.32, 74, 0.75), (3.10, 79, 0.8), (4.20, 77, 0.7), (5.00, 74, 0.75)]),
        # Tooth gold inlay golden-hour (36.2 - 44.5s): radiant rising theme
        (36.20, [(0.0, 70, 0.65), (0.65, 74, 0.7), (1.30, 75, 0.75), (2.10, 79, 0.82), (3.10, 82, 0.85), (4.20, 81, 0.78), (5.30, 79, 0.82)]),
        # Burial shrine reflection (45.6 - 53.8s): warm expressive motif
        (45.60, [(0.0, 72, 0.68), (0.85, 75, 0.72), (1.70, 74, 0.7), (2.60, 70, 0.72), (3.50, 69, 0.68), (4.40, 74, 0.78), (5.60, 79, 0.8)]),
        # Balingasay finds (54.8 - 59.2s): active discovery bounce
        (54.80, [(0.0, 74, 0.7), (0.60, 75, 0.65), (1.20, 79, 0.8), (2.00, 77, 0.75), (2.80, 74, 0.78)]),
        # Grand museum heritage climax (60.2 - 74.2s): full soaring theme
        (60.20, [(0.0, 79, 0.8), (0.90, 77, 0.75), (1.80, 74, 0.8), (2.90, 75, 0.75), (3.80, 74, 0.72), (4.80, 70, 0.8),
                 (6.10, 74, 0.82), (7.10, 79, 0.86), (8.20, 82, 0.9), (9.40, 81, 0.84), (10.60, 79, 0.88), (11.80, 74, 0.85)]),
        # Loop ending ("Nasa ngiti pala... Kaya ang tanong..." -> resolves gently to D7 for seamless loop to Gm!)
        (74.90, [(0.0, 79, 0.75), (0.65, 75, 0.7), (1.30, 74, 0.72), (2.05, 72, 0.7), (2.80, 69, 0.72), (3.45, 74, 0.78)]),
    ]
    for base_t, notes in hook_phrases:
        for dt, midi, vel in notes:
            t = base_t + dt
            if t >= dur - 0.25:
                continue
            vb = vibes(m2f(midi), vel=vel, r=r, dur=1.45, trem=5.0, trem_depth=0.25)
            place(wet, pan(vb, 0.14), t, gain=dbg(-11.5))
            if midi >= 74 or (11.5 <= t <= 22.5) or (36.0 <= t <= 45.0) or (60.0 <= t <= 74.5):
                mb = musicbox(m2f(midi + 12), vel=vel * 0.68, r=r, dur=1.2)
                place(wet, pan(mb, -0.24), t, gain=dbg(-17.5))

    # 5. Warm String Pads + Brass Swells on Emotional Anchors
    pad_spans = [
        (0.0,  4.9,  [55, 58, 62, 67], -18.5),   # Museum hook
        (11.6, 18.2, [51, 55, 58, 62], -17.5),   # Teeth gold
        (35.6, 45.0, [53, 57, 60, 67], -15.5),   # Golden inlay sunset
        (45.0, 54.2, [48, 51, 55, 62], -15.5),   # Burial shrine
        (59.6, 75.0, [55, 58, 62, 67], -14.0),   # Grand heritage peak
        (75.0, dur,  [50, 54, 57, 62], -16.5),   # Open D7 turnaround for seamless loop!
    ]
    for t0, t1, notes, g_db in pad_spans:
        d = min(t1, dur) - t0
        if d <= 0.4:
            continue
        p_sig = pad([m2f(m) for m in notes], d, vel=0.6, r=r, att=0.65, rel=0.85, warm=950.0)
        place(wet, p_sig, t0, gain=dbg(g_db))

    # Heroic warm horn counter-line in Shot 7 & Shot 9 climax
    for t, midi, d, g_db in [
        (46.0, 60, 1.8, -17.0), (49.2, 62, 1.9, -16.5), (52.4, 67, 1.6, -15.5),
        (60.0, 67, 2.2, -14.5), (64.2, 63, 2.1, -15.0), (68.7, 62, 2.8, -13.5), (71.8, 67, 2.4, -14.0),
    ]:
        h_sig = brass(m2f(midi), d, vel=0.68, r=r, kind="horn", scoop=-10.0, rel=0.14)
        place(wet, pan(h_sig, -0.18), t, gain=dbg(g_db))

    # 6. Musical Punctuation (Timpani swells, Triangle & Cymbal sparkles synced to key story hits!)
    for t_hit, strength in [
        (FLASH_T, 0.65), (SKULL_T, 0.72), (FISH_T, 0.68), (SCALE_FORM_T, 0.75),
        (JEWEL_T, 0.62), (HERITAGE_T, 0.85),
    ]:
        tp = timpani(m2f(43), vel=strength, r=r, dur=1.8)
        place(dry, pan(tp, -0.08), t_hit, gain=dbg(-12.5))
        cym = cymbal(vel=strength * 0.52, r=r, dur=2.1, bright=0.85)
        place(wet, pan(cym, 0.12), t_hit, gain=dbg(-21.0))

    for t_gl, midi in [
        (3.15, 86), (SKULL_T, 91), (TEETH_GOLD_T, 91), (TEETH_GOLD_T + 0.25, 94),
        (FISH_T, 88), (PEG_T + 2.4, 91), (TOOTH_FLIP_T, 91), (FINDS_T, 86), (QUESTION_T, 86),
    ]:
        gl = glock(m2f(midi), vel=0.72, r=r, dur=1.4)
        place(wet, pan(gl, 0.25), t_gl, gain=dbg(-15.5))
        tr = triangle(vel=0.45, r=r, dur=1.2)
        place(wet, pan(tr, -0.25), t_gl, gain=dbg(-20.0))

    # Apply subtle studio hall reverb to wet stem and combine dry + wet
    ir = make_ir(rt60=1.15, seed=seed + 9, pre=0.014, hf=0.78)
    wet_rev = convolve_st(wet, ir)[:, :N]
    mix = dry + wet * 0.65 + wet_rev * 0.42
    mix = hp(mix, 34.0, order=2)
    mix = lp(mix, 13500.0, order=2)
    return mix
