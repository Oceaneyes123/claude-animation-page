# BolinaoShort Foley, Coastal/Museum Ambience Beds & Frame-Synced Story SFX.
import numpy as np
from dsp import SR, ns, tt, rng, dbg, fades, pan, st, place, lp, hp, colored, curve
from sfx_gen import whoosh, hammer_hit, clink, wood_crack, rattle, water_bed, splash_big, breeze, bird_chirps, crickets
from instruments import m2f, glock, triangle
from timeline import (
    DUR, SHOTS, XFADES, FLASH_T, DIG_T, SKULL_T, TEETH_GOLD_T, FISH_T,
    KNIFE_T, RIVET_T, ALTER_T, PEG_T, SCALE_FORM_T, JEWEL_T, TOOTH_FLIP_T, FINDS_T, HERITAGE_T, QUESTION_T,
)


def _bed_mask(t0, t1, N, fade=0.45):
    """Smooth trapezoidal envelope spanning [t0, t1] inside N-sample timeline."""
    t = np.arange(N) / SR
    w = np.ones(N, dtype=np.float64)
    if t0 > 0:
        u = np.clip((t - (t0 - fade * 0.5)) / fade, 0.0, 1.0)
        w *= np.where(t < t0 - fade * 0.5, 0.0, np.where(t < t0 + fade * 0.5, 0.5 - 0.5 * np.cos(np.pi * u), 1.0))
    if t1 < DUR:
        u = np.clip((t - (t1 - fade * 0.5)) / fade, 0.0, 1.0)
        w *= np.where(t > t1 + fade * 0.5, 0.0, np.where(t > t1 - fade * 0.5, 0.5 + 0.5 * np.cos(np.pi * u), 1.0))
    return w[None, :]


def build(dur=DUR, seed=405):
    r = rng(seed)
    N = ns(dur)
    buf = np.zeros((2, N))

    # 1. Layered Environment Ambience Beds (never dry dead air!)
    # Museum room tone (Shots 1, 3, 9, 10)
    room_air = lp(hp(colored(N, r, slope=-0.8), 75.0), 650.0) * dbg(-32.0)
    room_st = np.stack([room_air, room_air * 0.96])
    for t0, t1 in [(0.0, 4.95), (11.55, 18.2), (59.55, dur)]:
        buf += room_st * _bed_mask(t0, t1, N, fade=0.5)

    # Balingasay coastal breeze + distant birds (Shots 2 & 8)
    breeze_st = st(breeze(dur, r, level=0.7, gust=0.22, bright=780))[:, :N]
    birds_st = st(bird_chirps(dur, r, density=0.45, kind="sparrow"))[:, :N]
    dig_bed = breeze_st * dbg(-22.0) + birds_st * dbg(-24.0)
    buf += dig_bed * _bed_mask(4.85, 11.6, N, fade=0.45)
    buf += dig_bed * _bed_mask(54.15, 59.65, N, fade=0.45)

    # Bolinao Fishing Pier ocean surf + sea breeze (Shot 4)
    surf_st = st(water_bed(dur, r, close=0.72, slosh_rate=0.65))[:, :N]
    pier_bed = surf_st * dbg(-17.5) + breeze_st * dbg(-23.0)
    buf += pier_bed * _bed_mask(18.1, 22.5, N, fade=0.4)

    # Workshop courtyard afternoon breeze + soft cricket warmth (Shots 5 & 6)
    crick_st = st(crickets(dur, r, voices=2))[:, :N]
    shop_bed = breeze_st * dbg(-24.0) + crick_st * dbg(-27.0)
    buf += shop_bed * _bed_mask(22.4, 45.0, N, fade=0.45)

    # Burial Shrine courtyard hushed evening wind (Shot 7)
    shrine_bed = lp(st(breeze(dur, r, level=0.65, gust=0.28, bright=640))[:, :N], 720.0) * dbg(-21.0)
    buf += shrine_bed * _bed_mask(44.9, 54.25, N, fade=0.45)

    # 2. Flash Cut & Scene Crossfade Transitions
    # Big dramatic flash into Balingasay dig site
    fl = whoosh(0.55, r, peak=0.38, f_lo=260, f_hi=2600, width=0.85, air=0.25)
    place(buf, pan(fl, 0.0), FLASH_T - 0.15, gain=dbg(-10.0))

    # Crisp subtle transition air whooshes across major location shifts
    for i, tx in enumerate(XFADES):
        dir_pan = -0.35 if i % 2 == 0 else 0.35
        wh = whoosh(0.36, r, peak=0.35, f_lo=320, f_hi=1950, width=0.65, tail=0.22, air=0.14)
        place(buf, pan(wh, dir_pan), tx - 0.14, gain=dbg(-17.5))

    # 3. Hero Frame-Synced Story Foley & Punctuation
    # Shot 2: Dig scrape & Balingasay skull unearthing
    earth_rattle = fades(rattle(0.95, r, density=26.0, env=curve(ns(0.95), [(0.0, 0.2), (0.35, 1.0), (1.0, 0.05)]), heavy=False), 0.03, 0.12)
    place(buf, pan(earth_rattle, -0.15), DIG_T - 0.1, gain=dbg(-12.5))
    skull_pop = fades(wood_crack(r), 0.004, 0.05) * dbg(-14.0)
    place(buf, pan(skull_pop, 0.0), SKULL_T - 0.03, gain=1.0)
    place(buf, pan(glock(m2f(86), vel=0.6, r=r, dur=1.1), 0.18), SKULL_T, gain=dbg(-16.0))

    # Shot 3: Golden teeth inlay crystalline shimmer
    for idx, dt in enumerate([0.0, 0.16, 0.34, 0.56]):
        gl = glock(m2f([86, 91, 93, 98][idx]), vel=0.58, r=r, dur=1.2)
        place(buf, pan(gl, -0.3 + idx * 0.2), TEETH_GOLD_T + dt, gain=dbg(-15.5))

    # Shot 4: Ocean splash + gleaming reef-fish scales shimmer
    sp = fades(splash_big(r), 0.01, 0.25)
    place(buf, pan(sp, -0.2), FISH_T - 0.25, gain=dbg(-17.5))
    for k, dt in enumerate([0.0, 0.14, 0.28]):
        place(buf, pan(triangle(vel=0.45, r=r, dur=0.9, f=1480 + k * 240), 0.2 - k * 0.15), FISH_T + dt, gain=dbg(-18.0))

    # Shot 5: Craftsman Knife intro scrape + 5 Hammered Steel Rivets!
    place(buf, pan(clink(r, f0=1420, dur=0.16, bright=0.8), 0.1), KNIFE_T - 0.04, gain=dbg(-14.5))
    for i in range(5):
        hit_t = RIVET_T + i * 0.68
        pan_x = -0.28 + i * 0.14
        hm = fades(hammer_hit(r, big=0.72), 0.002, 0.05)
        ck = fades(clink(r, f0=1850 + i * 110, dur=0.14, bright=1.1), 0.002, 0.04)
        place(buf, pan(hm, pan_x), hit_t, gain=dbg(-10.5))
        place(buf, pan(ck, pan_x), hit_t + 0.01, gain=dbg(-14.0))
    place(buf, pan(whoosh(0.32, r, peak=0.35, f_lo=450, f_hi=1700), 0.2), ALTER_T - 0.06, gain=dbg(-16.0))

    # Shot 6: 9 Staggered Gold Pegs locking cleanly into the Enlarged Tooth Model!
    scale_notes = [79, 81, 82, 86, 88, 91, 93, 94, 98]
    for i in range(9):
        pt = PEG_T + i * 0.28
        px = ((i % 3) - 1) * 0.24
        pop_ck = fades(clink(r, f0=2200 + i * 95, dur=0.09, bright=1.15), 0.002, 0.03)
        note = glock(m2f(scale_notes[i]), vel=0.52, r=r, dur=0.85)
        place(buf, pan(pop_ck, px), pt, gain=dbg(-15.5))
        place(buf, pan(note, px), pt + 0.01, gain=dbg(-16.5))
    place(buf, pan(triangle(vel=0.5, r=r, dur=1.4, f=1660), 0.0), SCALE_FORM_T, gain=dbg(-16.0))

    # Shot 7: Burial Gold Treasures chime + contrast pan to skull tooth ornament
    place(buf, pan(clink(r, f0=2400, dur=0.18, bright=1.2), 0.15), JEWEL_T, gain=dbg(-15.0))
    place(buf, pan(glock(m2f(91), vel=0.55, r=r, dur=1.2), -0.15), JEWEL_T + 0.22, gain=dbg(-16.5))
    place(buf, pan(whoosh(0.38, r, peak=0.35, f_lo=350, f_hi=2100), -0.25), TOOTH_FLIP_T - 0.1, gain=dbg(-14.0))
    place(buf, pan(glock(m2f(86), vel=0.62, r=r, dur=1.1), -0.25), TOOTH_FLIP_T + 0.04, gain=dbg(-15.5))

    # Shot 8: Balingasay 5 specimen teeth velvet taps
    for k in range(3):
        place(buf, pan(clink(r, f0=1750 + k * 140, dur=0.1, bright=0.8), -0.2 + k * 0.2), FINDS_T + k * 0.26, gain=dbg(-17.0))

    # Shot 9: Golden-hour heritage shimmer
    place(buf, pan(triangle(vel=0.45, r=r, dur=1.5, f=1320), 0.2), HERITAGE_T, gain=dbg(-17.5))

    # Shot 10: Loop question sting
    place(buf, pan(whoosh(0.32, r, peak=0.35, f_lo=420, f_hi=2200), 0.12), QUESTION_T - 0.08, gain=dbg(-15.5))
    place(buf, pan(triangle(vel=0.42, r=r, dur=0.85, f=1560), 0.0), QUESTION_T, gain=dbg(-17.0))

    buf = hp(buf, 36.0, order=2)
    return buf
