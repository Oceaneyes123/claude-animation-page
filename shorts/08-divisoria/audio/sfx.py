# DivisoriaShort Foley, Plaza Breeze Beds, Fire Crackle, Paper Ignitions, Wind & Map Reveal SFX.
import numpy as np
from dsp import SR, ns, rng, dbg, fades, pan, st, place, lp, hp, colored, phase
from sfx_gen import whoosh, wood_crack, clink, rattle, creak, boot, breeze, bird_chirps, crickets
from instruments import m2f, glock, triangle, timpani
from timeline import (
    DUR, XFADES, HOOK_FIRE_T, FLASH_T, OPEN_SPACE_T, DIVISORIA_T,
    PLAZA_GATHER_T, PLAN_PAKAY_T, DIVIDE_T, FIRE_SIDE_T, BLOCK_GAP_T,
    PAPER_IN_T, PACK_CLOSE_T, IGNITE_1_T, GAP_SLIDE_T, GAP_BURN_T,
    EMBER_WIND_T, WIDTH_COMPARE_T, MATERIAL_T, PLAN_DRAW_T, MAP_HIGHLIGHT_T, QUESTION_T,
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


def _fire_bed(dur, r, roar=0.65):
    n = ns(dur)
    low = lp(hp(colored(n, r, -1.2), 55.0), 420.0) * roar
    crackle = rattle(dur, r, density=26.0, heavy=False) * 0.45
    return fades((low + crackle) * 0.55, 0.06, 0.25)


def build(dur=DUR, seed=807):
    r = rng(seed)
    N = ns(dur)
    buf = np.zeros((2, N))

    # 1. Layered Cagayan de Oro Plaza Breeze, Birds & Golden-hour Crickets
    breeze_st = st(breeze(dur, r, level=0.72, gust=0.26, bright=820))[:, :N]
    birds_st = st(bird_chirps(dur, r, density=0.45, kind="sparrow"))[:, :N]
    crick_st = st(crickets(dur, r, voices=2))[:, :N]

    plaza_bed = breeze_st * dbg(-23.0) + birds_st * dbg(-24.5)
    buf += plaza_bed * _bed_mask(0.0, 22.8, N, fade=0.4)
    buf += plaza_bed * _bed_mask(29.8, 42.6, N, fade=0.4)
    buf += plaza_bed * _bed_mask(51.0, dur, N, fade=0.4)
    buf += (breeze_st * dbg(-21.0) + crick_st * dbg(-26.5)) * _bed_mask(22.6, 30.0, N, fade=0.4)
    buf += (breeze_st * dbg(-19.5) + crick_st * dbg(-26.5)) * _bed_mask(42.4, 51.2, N, fade=0.4)

    # 2. Flash Cut & Scene Crossfades
    fl = whoosh(0.55, r, peak=0.38, f_lo=260, f_hi=2500, width=0.85, air=0.25)
    place(buf, pan(fl, 0.0), FLASH_T - 0.14, gain=dbg(-10.5))

    for i, tx in enumerate(XFADES):
        dir_pan = -0.35 if i % 2 == 0 else 0.35
        wh = whoosh(0.35, r, peak=0.34, f_lo=300, f_hi=1900, width=0.65, tail=0.22, air=0.14)
        place(buf, pan(wh, dir_pan), tx - 0.14, gain=dbg(-17.0))

    # 3. Hero Frame-Synced Story Foley
    # Shot 1: Hook fire bursts on left block, halted at plaza
    place(buf, pan(whoosh(0.65, r, peak=0.45, f_lo=220, f_hi=1700), -0.35), HOOK_FIRE_T, gain=dbg(-12.5))
    place(buf, pan(_fire_bed(2.0, r, 0.7), -0.35), HOOK_FIRE_T, gain=dbg(-15.5))

    # Shot 2 & 3: Open plaza reveal & planner blueprint rustle
    place(buf, pan(glock(m2f(81), vel=0.55, r=r, dur=0.9), 0.15), OPEN_SPACE_T, gain=dbg(-17.5))
    place(buf, pan(triangle(vel=0.5, r=r, dur=1.0, f=1380.0), 0.18), DIVISORIA_T, gain=dbg(-17.0))
    place(buf, pan(creak(0.45, r, 110, 175), -0.15), PLAZA_GATHER_T, gain=dbg(-19.5))
    place(buf, pan(boot(r, 0.65), -0.2), PLAN_PAKAY_T, gain=dbg(-18.5))

    # Shot 4: Golden firebreak division & left-block blaze
    place(buf, pan(whoosh(0.55, r, peak=0.36, f_lo=250, f_hi=1600), 0.0), DIVIDE_T, gain=dbg(-14.5))
    place(buf, pan(timpani(m2f(38), vel=0.75, r=r, dur=1.3), -0.3), FIRE_SIDE_T, gain=dbg(-12.5))
    place(buf, pan(_fire_bed(3.2, r, 0.8), -0.35), FIRE_SIDE_T, gain=dbg(-14.2))
    place(buf, pan(clink(r, f0=1200, dur=0.18, bright=0.7), 0.25), BLOCK_GAP_T, gain=dbg(-16.5))

    # Shot 5: Paper strip row -> close pack -> chain ignition hops 0..5
    place(buf, pan(rattle(0.45, r, density=18.0, heavy=False), 0.0), PAPER_IN_T, gain=dbg(-18.5))
    place(buf, pan(boot(r, 0.55), 0.0), PACK_CLOSE_T, gain=dbg(-17.5))
    for idx in range(6):
        ti = IGNITE_1_T + idx * 0.36
        p = -0.35 + idx * 0.14
        place(buf, pan(whoosh(0.28, r, peak=0.35, f_lo=450, f_hi=2200), p), ti, gain=dbg(-15.5))
        place(buf, pan(fades(wood_crack(r), 0.002, 0.06), p), ti + 0.04, gain=dbg(-18.0))

    # Shot 6: Gap slide -> left 3 burn & fizzle
    place(buf, pan(creak(0.55, r, 85, 145), 0.1), GAP_SLIDE_T, gain=dbg(-16.5))
    for idx in range(3):
        ti = GAP_BURN_T + idx * 0.34
        place(buf, pan(whoosh(0.28, r, peak=0.35, f_lo=420, f_hi=2100), -0.32 + idx * 0.1), ti, gain=dbg(-15.5))
    place(buf, pan(whoosh(0.45, r, peak=0.24, f_lo=600, f_hi=250), 0.05), GAP_BURN_T + 1.0, gain=dbg(-17.0))

    # Shot 7: Golden wind gusts, embers & stone/brick clinks
    place(buf, pan(whoosh(1.1, r, peak=0.45, f_lo=260, f_hi=1800), -0.15), EMBER_WIND_T, gain=dbg(-13.5))
    place(buf, pan(_fire_bed(3.5, r, 0.65), -0.25), EMBER_WIND_T, gain=dbg(-15.5))
    place(buf, pan(whoosh(0.7, r, peak=0.34, f_lo=300, f_hi=1600), 0.15), WIDTH_COMPARE_T, gain=dbg(-15.0))
    for k in range(3):
        place(buf, pan(clink(r, f0=1550 + k * 140, dur=0.14, bright=0.8), 0.32), MATERIAL_T + k * 0.18, gain=dbg(-16.5))

    # Shot 8 & 9: City map reveal chimes & question sting
    place(buf, pan(glock(m2f(77), vel=0.55, r=r, dur=0.9), 0.0), PLAN_DRAW_T, gain=dbg(-16.5))
    place(buf, pan(glock(m2f(81), vel=0.60, r=r, dur=1.1), 0.12), MAP_HIGHLIGHT_T, gain=dbg(-15.5))
    place(buf, pan(triangle(vel=0.55, r=r, dur=1.2, f=1480.0), 0.18), QUESTION_T, gain=dbg(-16.0))

    return buf[:, :N]
