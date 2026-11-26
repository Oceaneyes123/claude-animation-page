# CebuShort Foley, Strait & Plaza Ambience Beds, Seismic Rumbles, Belfry Collapse, Table Tap & Physics SFX.
import numpy as np
from dsp import SR, ns, tt, rng, dbg, fades, pan, st, place, lp, hp, colored, phase, modal
from sfx_gen import whoosh, wood_crack, clink, rattle, creak, boot, breeze, bird_chirps, crickets
from instruments import m2f, glock, triangle, timpani
from timeline import (
    DUR, XFADES, HOOK_SHAKE_T, FLASH_T, BOHOL_SHOCK_T, MAG_PULSE_T, CEBU_SHAKE_T,
    BELL_SWAY_T, COLLAPSE_T, BLOCKS_IN_T, TAP_T, TOWER_WOBBLE_T, FAULT_SLIP_T,
    FAULT_CRACK_T, WAVES_OUT_T, ACROSS_T, BASE_JOLT_T, TOP_LAG_T, STRESS_T,
    SWAY_T, COMPARE_T, QUESTION_T,
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


def _quake_rumble(dur, r, f_base=44.0):
    n = ns(dur)
    t = np.arange(n) / SR
    sub = np.sin(phase(np.full(n, f_base) + 6.0 * np.sin(2 * np.pi * 3.5 * t))) * 0.8
    grit = lp(colored(n, r, -1.2), 180.0) * 0.9
    return fades((sub + grit) * 0.5, 0.04, 0.25)


def _church_bell(r, f0=520.0, dur=1.8):
    modes = [(f0, 1.0, 1.2), (f0 * 2.0, 0.55, 0.8), (f0 * 2.4, 0.4, 0.55), (f0 * 3.9, 0.22, 0.3)]
    return fades(modal(dur, modes, r), 0.002, 0.15)


def build(dur=DUR, seed=707):
    r = rng(seed)
    N = ns(dur)
    buf = np.zeros((2, N))

    # 1. Layered Cebu Plaza, Strait Breeze & Geological Beds
    breeze_st = st(breeze(dur, r, level=0.70, gust=0.25, bright=780))[:, :N]
    birds_st = st(bird_chirps(dur, r, density=0.45, kind="sparrow"))[:, :N]
    crick_st = st(crickets(dur, r, voices=2))[:, :N]
    deep_air = lp(hp(colored(N, r, slope=-1.0), 42.0), 360.0) * dbg(-28.0)
    deep_st = np.stack([deep_air, deep_air * 0.95])

    plaza_bed = breeze_st * dbg(-23.0) + birds_st * dbg(-24.5)
    buf += plaza_bed * _bed_mask(0.0, 4.9, N, fade=0.4)
    buf += plaza_bed * _bed_mask(19.6, 31.8, N, fade=0.4)
    buf += plaza_bed * _bed_mask(52.4, dur, N, fade=0.4)

    # Strait map wind
    buf += (breeze_st * dbg(-20.0)) * _bed_mask(4.7, 15.4, N, fade=0.4)
    # Golden collapse & physics stage warm air
    buf += (breeze_st * dbg(-23.0) + crick_st * dbg(-27.0)) * _bed_mask(15.0, 20.0, N, fade=0.4)
    buf += (breeze_st * dbg(-23.0) + crick_st * dbg(-26.5)) * _bed_mask(42.1, 52.9, N, fade=0.4)
    # Underground tectonic room rumble
    buf += deep_st * _bed_mask(31.4, 42.5, N, fade=0.4)

    # 2. Flash Cut & Scene Crossfades
    fl = whoosh(0.55, r, peak=0.38, f_lo=260, f_hi=2500, width=0.85, air=0.25)
    place(buf, pan(fl, 0.0), FLASH_T - 0.14, gain=dbg(-10.5))

    for i, tx in enumerate(XFADES):
        dir_pan = -0.35 if i % 2 == 0 else 0.35
        wh = whoosh(0.35, r, peak=0.34, f_lo=300, f_hi=1900, width=0.65, tail=0.22, air=0.14)
        place(buf, pan(wh, dir_pan), tx - 0.14, gain=dbg(-17.0))

    # 3. Hero Frame-Synced Story Foley
    # Shot 1: Hook tremor & Basilica bell ring
    place(buf, pan(_quake_rumble(1.2, r, 46.0), 0.0), HOOK_SHAKE_T, gain=dbg(-15.5))
    place(buf, pan(_church_bell(r, 587.0, 1.5), 0.18), HOOK_SHAKE_T + 0.04, gain=dbg(-18.5))

    # Shot 2: Bohol M7.2 epicenter shock & magnitude pulse
    place(buf, pan(timpani(m2f(36), vel=0.85, r=r, dur=1.6), 0.25), BOHOL_SHOCK_T, gain=dbg(-11.5))
    place(buf, pan(_quake_rumble(1.8, r, 40.0), 0.2), BOHOL_SHOCK_T, gain=dbg(-13.5))
    place(buf, pan(whoosh(0.7, r, peak=0.25, f_lo=180, f_hi=1200), 0.15), MAG_PULSE_T, gain=dbg(-14.5))

    # Shot 3: Waves crossing strait & hitting Cebu
    place(buf, pan(whoosh(0.85, r, peak=0.45, f_lo=200, f_hi=1500), -0.25), CEBU_SHAKE_T - 0.25, gain=dbg(-14.0))
    place(buf, pan(_quake_rumble(1.4, r, 48.0), -0.22), CEBU_SHAKE_T, gain=dbg(-14.5))

    # Shot 4: Basilica Belfry Collapse! Creak -> bell clang -> stone/timber crash -> rubble settle
    place(buf, pan(creak(0.85, r, 60, 120), 0.1), BELL_SWAY_T, gain=dbg(-16.0))
    place(buf, pan(_church_bell(r, 523.0, 1.8), 0.14), BELL_SWAY_T + 0.15, gain=dbg(-16.0))
    place(buf, pan(fades(wood_crack(r), 0.003, 0.08), 0.06), COLLAPSE_T, gain=dbg(-9.5))
    place(buf, pan(_quake_rumble(1.6, r, 38.0), 0.0), COLLAPSE_T + 0.04, gain=dbg(-11.5))
    place(buf, pan(rattle(0.95, r, density=36.0, heavy=True), 0.12), COLLAPSE_T + 0.18, gain=dbg(-14.5))

    # Shot 5: Block tower stack -> Mallet tap on table -> traveling wave -> block tower wobble!
    for k in range(4):
        place(buf, pan(boot(r, 0.5), 0.25), BLOCKS_IN_T - 0.7 + k * 0.15, gain=dbg(-19.5))
    place(buf, pan(boot(r, 1.0), -0.35), TAP_T, gain=dbg(-12.5))
    place(buf, pan(whoosh(0.55, r, peak=0.35, f_lo=360, f_hi=1700), 0.0), TAP_T + 0.15, gain=dbg(-16.5))
    place(buf, pan(rattle(0.85, r, density=24.0, heavy=False), 0.3), TOWER_WOBBLE_T, gain=dbg(-15.5))
    place(buf, pan(clink(r, f0=1400, dur=0.14, bright=0.7), 0.32), TOWER_WOBBLE_T + 0.08, gain=dbg(-17.0))

    # Shot 6: Underground fault slip -> rock crack -> seismic waves to Cebu
    place(buf, pan(fades(wood_crack(r), 0.004, 0.06), 0.15), FAULT_SLIP_T, gain=dbg(-11.5))
    place(buf, pan(_quake_rumble(2.0, r, 36.0), 0.1), FAULT_SLIP_T, gain=dbg(-13.0))
    place(buf, pan(creak(0.75, r, 45, 95), 0.05), FAULT_CRACK_T, gain=dbg(-15.5))
    place(buf, pan(whoosh(0.9, r, peak=0.4, f_lo=180, f_hi=1300), -0.15), WAVES_OUT_T, gain=dbg(-14.5))
    place(buf, pan(_quake_rumble(1.3, r, 48.0), -0.28), ACROSS_T, gain=dbg(-15.0))

    # Shot 7: Shake-table jolt -> inertia lag -> structural stress rings -> sway
    place(buf, pan(clink(r, f0=950, dur=0.16, bright=0.6), -0.1), BASE_JOLT_T, gain=dbg(-14.5))
    place(buf, pan(_quake_rumble(1.6, r, 45.0), 0.0), BASE_JOLT_T, gain=dbg(-15.5))
    place(buf, pan(glock(m2f(83), vel=0.55, r=r, dur=0.9), 0.12), TOP_LAG_T, gain=dbg(-16.5))
    place(buf, pan(creak(0.85, r, 95, 165), 0.0), STRESS_T, gain=dbg(-15.5))
    place(buf, pan(rattle(0.75, r, density=22.0, heavy=True), 0.05), SWAY_T, gain=dbg(-16.5))

    # Shot 8: 3-pad comparison shake
    place(buf, pan(_quake_rumble(1.7, r, 44.0), 0.0), COMPARE_T, gain=dbg(-14.8))
    place(buf, pan(rattle(0.8, r, density=20.0, heavy=False), 0.0), COMPARE_T + 0.25, gain=dbg(-17.0))

    # Shot 9: Loop question sting
    place(buf, pan(whoosh(0.32, r, peak=0.32, f_lo=420, f_hi=2100), 0.1), QUESTION_T - 0.06, gain=dbg(-16.0))
    place(buf, pan(triangle(vel=0.45, r=r, dur=0.9, f=1480), 0.0), QUESTION_T, gain=dbg(-17.2))

    buf = hp(buf, 34.0, order=2)
    return buf
