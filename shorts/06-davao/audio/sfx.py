# DavaoShort Foley, Mindanao Forest & Sanctuary Ambience Beds & Frame-Synced Story SFX.
import numpy as np
from dsp import SR, ns, rng, dbg, fades, pan, st, place, lp, hp, colored
from sfx_gen import whoosh, wood_crack, clink, breeze, bird_chirps, crickets
from instruments import m2f, glock, triangle
from timeline import (
    DUR, XFADES, FLASH_T, EGG_HOOK_T, HATCH_92_T, PAGASA_T, CHICK_NEWS_T,
    MATCH_EGG_T, SEED1_T, SEED2_T, GEN2_T, PARENTS_EGG_T, HATCH_13_T, MABUHAY_T,
    FOREST_WIDE_T, QUESTION_T,
)


def _bed_mask(t0, t1, N, fade=0.45):
    t = np.arange(N) / SR
    w = np.ones(N, dtype=np.float64)
    if t0 > 0:
        u = np.clip((t - (t0 - fade * 0.5)) / fade, 0.0, 1.0)
        w *= np.where(t < t0 - fade * 0.5, 0.0, np.where(t < t0 + fade * 0.5, 0.5 - 0.5 * np.cos(np.pi * u), 1.0))
    if t1 < DUR:
        u = np.clip((t - (t1 - fade * 0.5)) / fade, 0.0, 1.0)
        w *= np.where(t > t1 + fade * 0.5, 0.0, np.where(t > t1 - fade * 0.5, 0.5 + 0.5 * np.cos(np.pi * u), 1.0))
    return w[None, :]


def build(dur=DUR, seed=607):
    r = rng(seed)
    N = ns(dur)
    buf = np.zeros((2, N))

    # 1. Layered Sanctuary & Mindanao Rainforest Ambience Beds
    breeze_st = st(breeze(dur, r, level=0.72, gust=0.22, bright=780))[:, :N]
    birds_st = st(bird_chirps(dur, r, density=0.52, kind="sparrow"))[:, :N]
    crick_st = st(crickets(dur, r, voices=2))[:, :N]
    room_air = lp(hp(colored(N, r, slope=-0.8), 75.0), 650.0) * dbg(-32.0)
    room_st = np.stack([room_air, room_air * 0.96])

    # Center sanctuary & nursery breeze + birds
    sanctuary_bed = breeze_st * dbg(-23.0) + birds_st * dbg(-24.0)
    buf += sanctuary_bed * _bed_mask(0.0, 6.9, N, fade=0.45)
    buf += sanctuary_bed * _bed_mask(28.3, 37.2, N, fade=0.45)
    buf += sanctuary_bed * _bed_mask(60.2, dur, N, fade=0.45)

    # 1992 Hatchery indoor warm room tone (Shots 2 & 3)
    buf += room_st * _bed_mask(6.7, 23.1, N, fade=0.45)

    # 2013 Aviary golden-hour warmth & crickets (Shots 4, 6, 7)
    aviary_bed = breeze_st * dbg(-24.0) + crick_st * dbg(-26.5) + birds_st * dbg(-26.0)
    buf += aviary_bed * _bed_mask(22.9, 28.5, N, fade=0.45)
    buf += aviary_bed * _bed_mask(36.9, 51.9, N, fade=0.45)

    # Deep Mindanao Rainforest wind & canopy birds (Shot 8)
    forest_bed = breeze_st * dbg(-19.0) + birds_st * dbg(-21.5)
    buf += forest_bed * _bed_mask(51.7, 60.5, N, fade=0.45)

    # 2. Flash Cut & Scene Crossfades
    fl = whoosh(0.55, r, peak=0.38, f_lo=260, f_hi=2500, width=0.85, air=0.25)
    place(buf, pan(fl, 0.0), FLASH_T - 0.15, gain=dbg(-10.5))

    for i, tx in enumerate(XFADES):
        dir_pan = -0.35 if i % 2 == 0 else 0.35
        wh = whoosh(0.36, r, peak=0.35, f_lo=320, f_hi=1950, width=0.65, tail=0.22, air=0.14)
        place(buf, pan(wh, dir_pan), tx - 0.14, gain=dbg(-17.5))

    # 3. Hero Frame-Synced Story Foley
    # Shot 1: Hook egg shimmer
    place(buf, pan(glock(m2f(86), vel=0.58, r=r, dur=1.1), 0.12), EGG_HOOK_T, gain=dbg(-16.0))

    # Shot 2: 1992 Egg crack -> Pag-asa chick hatch!
    place(buf, pan(fades(wood_crack(r), 0.004, 0.05), -0.05), HATCH_92_T - 0.02, gain=dbg(-13.5))
    place(buf, pan(fades(wood_crack(r), 0.004, 0.04), 0.08), HATCH_92_T + 0.28, gain=dbg(-15.0))
    for k, dt in enumerate([0.0, 0.15, 0.32]):
        place(buf, pan(glock(m2f([86, 89, 93][k]), vel=0.58, r=r, dur=1.0), -0.15 + k * 0.15), PAGASA_T + dt, gain=dbg(-15.8))

    # Shot 3: Team celebratory flutter & chime
    place(buf, pan(triangle(vel=0.5, r=r, dur=1.2, f=1420), 0.15), CHICK_NEWS_T, gain=dbg(-16.5))

    # Shot 4: 2013 Match-cut golden egg chime
    place(buf, pan(glock(m2f(89), vel=0.6, r=r, dur=1.2), 0.0), MATCH_EGG_T, gain=dbg(-15.5))
    place(buf, pan(triangle(vel=0.45, r=r, dur=1.0, f=1560), -0.2), MATCH_EGG_T + 0.18, gain=dbg(-17.5))

    # Shot 5: Nursery ("Punlaan") Seed 1 sprout -> Seed 2 drop -> Gen 2 sapling chime
    place(buf, pan(whoosh(0.32, r, peak=0.32, f_lo=420, f_hi=1800), -0.22), SEED1_T, gain=dbg(-17.5))
    place(buf, pan(clink(r, f0=1800, dur=0.12, bright=0.8), 0.1), SEED2_T, gain=dbg(-16.5))
    for k, dt in enumerate([0.0, 0.14]):
        place(buf, pan(glock(m2f([86, 93][k]), vel=0.55, r=r, dur=1.0), 0.1 + k * 0.12), GEN2_T + dt, gain=dbg(-16.0))

    # Shot 6: Pag-asa & Kalinawan egg shimmer
    place(buf, pan(glock(m2f(88), vel=0.52, r=r, dur=1.1), 0.0), PARENTS_EGG_T, gain=dbg(-16.5))

    # Shot 7: 2013 Egg crack -> Mabuhay chick hatch!
    place(buf, pan(fades(wood_crack(r), 0.004, 0.05), 0.0), HATCH_13_T - 0.02, gain=dbg(-13.0))
    for k, dt in enumerate([0.0, 0.14, 0.30]):
        place(buf, pan(glock(m2f([89, 93, 96][k]), vel=0.6, r=r, dur=1.1), -0.15 + k * 0.15), MABUHAY_T + dt, gain=dbg(-15.5))

    # Shot 8: Soaring eagles wind sweep over rainforest
    place(buf, pan(whoosh(0.65, r, peak=0.4, f_lo=220, f_hi=1450, width=0.9), -0.2), FOREST_WIDE_T - 0.1, gain=dbg(-14.5))
    place(buf, pan(triangle(vel=0.45, r=r, dur=1.4, f=1320), 0.2), FOREST_WIDE_T + 0.15, gain=dbg(-17.5))

    # Shot 9: Loop question sting
    place(buf, pan(whoosh(0.32, r, peak=0.35, f_lo=420, f_hi=2200), 0.12), QUESTION_T - 0.08, gain=dbg(-15.5))
    place(buf, pan(triangle(vel=0.42, r=r, dur=0.85, f=1560), 0.0), QUESTION_T, gain=dbg(-17.0))

    buf = hp(buf, 36.0, order=2)
    return buf
