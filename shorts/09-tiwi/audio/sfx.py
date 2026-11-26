# TiwiShort Foley: Underground Geothermal Steam Hisses, Bubbling Brine, Pinwheel Whoosh, Turbine Whir, Generator Hum & Lightbulb Chime.
import numpy as np
from dsp import SR, ns, rng, dbg, fades, pan, st, place, lp, hp, bp, colored
from sfx_gen import whoosh, clink, rattle, creak, breeze, bird_chirps, crickets, bubbles
from instruments import m2f, glock, triangle, timpani
from timeline import (
    DUR, XFADES, HOOK_STEAM_T, FLASH_T, POWER_1979_T, PLANT_TIWI_T, WELL_DEEP_T,
    PIPE_FLOW_T, SEPARATE_T, STEAM_TURBINE_T, PINWHEEL_IN_T, BLOW_SPIN_T,
    TURBINE_PUSH_T, GEN_COUPLE_T, MAGNET_SPIN_T, COIL_SPARK_T,
    CHAIN_HEAT_T, CHAIN_STEAM_T, CHAIN_GEN_T, CHAIN_GRID_T, BULB_LIGHT_T, QUESTION_T,
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


def _steam_hiss(dur, r, bright=2400.0):
    n = ns(dur)
    nz = bp(colored(n, r, -0.4), 520.0, bright, 1)
    return fades(nz * 0.55, 0.08, 0.25)


def _turbine_hum(dur, f0=110.0, f1=165.0):
    n = ns(dur)
    t = np.arange(n) / SR
    freq = np.linspace(f0, f1, n)
    ph = np.cumsum(2.0 * np.pi * freq / SR)
    y = 0.55 * np.sin(ph) + 0.25 * np.sin(2.0 * ph) + 0.12 * np.sin(3.0 * ph)
    return fades(y * 0.45, 0.15, 0.35)


def build(dur=DUR, seed=907):
    r = rng(seed)
    N = ns(dur)
    buf = np.zeros((2, N))

    # 1. Layered Bicol Hills Breeze, Birds & Golden Powerhouse Hum / Crickets
    breeze_st = st(breeze(dur, r, level=0.68, gust=0.24, bright=840))[:, :N]
    birds_st = st(bird_chirps(dur, r, density=0.42, kind="sparrow"))[:, :N]
    crick_st = st(crickets(dur, r, voices=2))[:, :N]

    day_bed = breeze_st * dbg(-23.5) + birds_st * dbg(-25.0)
    buf += day_bed * _bed_mask(0.0, 30.4, N, fade=0.4)
    buf += day_bed * _bed_mask(46.5, dur, N, fade=0.4)
    buf += (breeze_st * dbg(-22.0) + crick_st * dbg(-26.5)) * _bed_mask(30.4, 46.5, N, fade=0.4)

    # 2. Flash Cut & Scene Crossfades
    fl = whoosh(0.55, r, peak=0.38, f_lo=260, f_hi=2500, width=0.85, air=0.25)
    place(buf, pan(fl, 0.0), FLASH_T - 0.14, gain=dbg(-10.5))

    for i, tx in enumerate(XFADES):
        dir_pan = -0.35 if i % 2 == 0 else 0.35
        wh = whoosh(0.35, r, peak=0.34, f_lo=300, f_hi=1900, width=0.65, tail=0.22, air=0.14)
        place(buf, pan(wh, dir_pan), tx - 0.14, gain=dbg(-17.0))

    # 3. Hero Frame-Synced Story Foley
    # Shot 1 & 2: Underground steam burst & 1979 plant energizing
    place(buf, pan(_steam_hiss(1.8, r, 2100.0), -0.15), HOOK_STEAM_T, gain=dbg(-14.5))
    place(buf, pan(whoosh(0.5, r, peak=0.36, f_lo=240, f_hi=1800), 0.25), HOOK_STEAM_T + 0.1, gain=dbg(-14.5))
    place(buf, pan(glock(m2f(81), vel=0.58, r=r, dur=1.0), 0.2), POWER_1979_T, gain=dbg(-15.5))
    place(buf, pan(triangle(vel=0.5, r=r, dur=1.0, f=1380.0), 0.15), PLANT_TIWI_T, gain=dbg(-17.0))

    # Shot 3: Deep well heat rumble, rising two-phase bubbles, cyclone separator split
    place(buf, pan(timpani(m2f(38), vel=0.68, r=r, dur=1.2), -0.25), WELL_DEEP_T, gain=dbg(-14.0))
    place(buf, pan(bubbles(3.2, r, rate=11.0, f_lo=280, f_hi=1500), -0.18), PIPE_FLOW_T, gain=dbg(-16.0))
    place(buf, pan(_steam_hiss(2.2, r, 2200.0), -0.1), PIPE_FLOW_T + 0.2, gain=dbg(-17.5))
    place(buf, pan(clink(r, f0=1150, dur=0.20, bright=0.75), 0.15), SEPARATE_T, gain=dbg(-16.0))
    place(buf, pan(_steam_hiss(1.6, r, 2600.0), 0.25), STEAM_TURBINE_T, gain=dbg(-14.8))

    # Shot 4: Toy Pinwheel ("laruang elisi") & blow spin
    place(buf, pan(creak(0.35, r, 140, 210), 0.05), PINWHEEL_IN_T, gain=dbg(-19.5))
    place(buf, pan(whoosh(0.95, r, peak=0.40, f_lo=350, f_hi=2400, width=0.75), -0.1), BLOW_SPIN_T, gain=dbg(-13.8))
    place(buf, pan(rattle(1.2, r, density=16.0, heavy=False), 0.12), BLOW_SPIN_T + 0.15, gain=dbg(-21.0))

    # Shot 5: Golden High-pressure Steam Jet -> Turbine Blades -> Coupled Generator
    place(buf, pan(_steam_hiss(4.2, r, 2800.0), -0.25), TURBINE_PUSH_T, gain=dbg(-13.8))
    place(buf, pan(_turbine_hum(5.4, 95.0, 155.0), 0.05), TURBINE_PUSH_T, gain=dbg(-15.5))
    place(buf, pan(clink(r, f0=1400, dur=0.22, bright=0.8), 0.25), GEN_COUPLE_T, gain=dbg(-15.2))

    # Shot 6: Inside Generator — Magnet Spinning & Electric Sparks
    place(buf, pan(_turbine_hum(4.2, 130.0, 175.0), 0.0), MAGNET_SPIN_T, gain=dbg(-15.8))
    for k in range(3):
        place(buf, pan(clink(r, f0=1850 + k * 240, dur=0.14, bright=0.9), 0.28), COIL_SPARK_T + k * 0.18, gain=dbg(-15.5))
    place(buf, pan(glock(m2f(84), vel=0.60, r=r, dur=1.0), 0.28), COIL_SPARK_T + 0.1, gain=dbg(-15.0))

    # Shot 7 & 8: Full Energy Chain -> House Lightbulb Illumination & Loop Question
    place(buf, pan(timpani(m2f(40), vel=0.65, r=r, dur=1.1), -0.35), CHAIN_HEAT_T, gain=dbg(-14.2))
    place(buf, pan(_steam_hiss(1.8, r, 2300.0), -0.15), CHAIN_STEAM_T, gain=dbg(-15.8))
    place(buf, pan(_turbine_hum(2.5, 110.0, 160.0), 0.10), CHAIN_GEN_T, gain=dbg(-16.0))
    place(buf, pan(whoosh(0.65, r, peak=0.35, f_lo=450, f_hi=2200), 0.25), CHAIN_GRID_T, gain=dbg(-15.0))
    place(buf, pan(glock(m2f(86), vel=0.68, r=r, dur=1.3), 0.30), BULB_LIGHT_T, gain=dbg(-13.8))
    place(buf, pan(triangle(vel=0.58, r=r, dur=1.2, f=1520.0), 0.25), BULB_LIGHT_T + 0.04, gain=dbg(-14.5))
    place(buf, pan(triangle(vel=0.52, r=r, dur=1.1, f=1440.0), 0.15), QUESTION_T, gain=dbg(-16.0))

    return buf[:, :N]
