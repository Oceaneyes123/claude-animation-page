# Synthesized SFX + ambience beds for "Ang Bulkang Nagpalamig sa Buong Mundo", timed to timeline.py.
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, colored)
import sfx_gen as G
import timeline as T

N = ns(T.DUR)
SFX_DB = -6.0


class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, extra=0.0, lpf=None, send=0.12, group=None, cut=None):
        self.t, self.name, self.desc, self.gen, self.naive = t, name, desc, gen, naive
        self.kind, self.p, self.extra, self.lpf, self.send, self.cut = kind, p, extra, lpf, send, cut
        self.group = group or name
        self.applied = naive + (SFX_DB if kind == "event" else 0.0) + extra
        self.measured = None


def _cut(gen, dur, fin, fout):
    def g():
        x, a = gen()
        return fades(x, fin, fout), a
    return g


def _flash(r):
    dur = 0.72
    y = G.whoosh(dur, r, 0.32, 500, 4200, 0.9, 0.09, 0.4)
    t = tt(dur)
    boom = np.where(t > 0.32, np.exp(-(t - 0.32) / 0.12) * np.sin(2 * np.pi * 62 * (t - 0.32)), 0) * 0.75
    return widen(y + boom, r, 12, 0.9), 0.32


def _eruption_boom(r):
    dur = 3.2
    t = tt(dur)
    sub = np.exp(-t / 0.65) * np.sin(2 * np.pi * (56 * np.exp(-t * 0.4) + 26) * t) * 0.9
    roar = bp(colored(len(t), r, 1.4), 70, 520, 2) * np.exp(-t / 1.4) * 0.85
    crackle = hp(colored(len(t), r, 0.2), 1400, 1) * np.exp(-t / 0.75) * 0.25
    return widen(fades(sub + roar + crackle, 0.015, 0.6), r, 14, 0.85), 0.04


def _volcanic_rumble(dur, r):
    n = ns(dur)
    x = bp(colored(n, r, 1.6), 45, 240, 2) * 0.8 + lp(colored(n, r, 1.0), 650, 1) * 0.35
    return fades(st(x), 0.35, 0.5)


def _rain_bed(dur, r):
    n = ns(dur)
    x = bp(colored(n, r, 0.3), 700, 4800, 1) * 0.45 + lp(colored(n, r, 1.1), 400, 1) * 0.35
    return fades(st(x), 0.3, 0.4)


def _mix_clips(*xs):
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[: len(x)] += x
    return out


def cues():
    C = []
    R = rng(1991)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append

    # Ambience beds per shot span
    def amb_valley(dur, seed=1, birds=True):
        def g():
            r = rng(seed)
            x = G.breeze(dur, r, 0.9, 0.14, 850)
            if birds:
                x += pan(G.bird_chirps(dur, r, 0.32, "sparrow") * 0.08, 0.35)
            return fades(x, 0.3, 0.4), 0.0
        return g

    t_flash = T.FLASH
    t_erupt_a, t_erupt_b = T.shot_t(4)
    t_rain_a, t_rain_b = T.shot_t(5)
    t_globe_a, t_globe_b = T.shot_t(6)
    t_car_a, t_car_b = T.shot_t(7)
    t_cool_a, t_cool_b = T.shot_t(8)
    t_lab_a, t_lab_b = T.shot_t(9)

    add(Cue(0.0, "amb_hook", "chilly wind in Zambales plaza", _cut(amb_valley(t_flash + 0.1, 10, False), t_flash + 0.1, 0.05, 0.2), -28, "bed", send=0.0))
    add(Cue(t_flash, "amb_valley", "Zambales valley breeze & birds", _cut(amb_valley(t_erupt_a - t_flash, 20, True), t_erupt_a - t_flash, 0.3, 0.35), -29, "bed", send=0.0))
    add(Cue(t_erupt_a, "amb_eruption", "Pinatubo eruption rumble bed", lambda: (_volcanic_rumble(t_erupt_b - t_erupt_a, rng(30)), 0.0), -25, "bed", send=0.1))
    add(Cue(t_rain_a, "amb_rain", "troposphere rainclouds below", lambda: (_rain_bed(t_rain_b - t_rain_a, rng(40)), 0.0), -26, "bed", send=0.05))
    add(Cue(t_globe_a, "amb_strat", "high stratosphere air drift", lambda: (fades(G.breeze(t_globe_b - t_globe_a, rng(50), 0.7, 0.15, 700), 0.3, 0.3), 0.0), -29, "bed", send=0.0))
    add(Cue(t_car_a, "amb_street", "warm Philippine street breeze", _cut(amb_valley(t_car_b - t_car_a, 60, True), t_car_b - t_car_a, 0.3, 0.3), -29, "bed", send=0.0))
    add(Cue(t_cool_a, "amb_cool", "global cooling breeze", lambda: (fades(G.breeze(t_lab_b - t_cool_a, rng(70), 0.75, 0.12, 950), 0.3, 0.1), 0.0), -29, "bed", send=0.0))

    # Hook flash
    add(Cue(t_flash, "flash_whoosh", "white flash swell", lambda: _flash(rng(174)), -5, send=0.2))

    # Crossfade & camera whooshes
    for i in sorted(T.XFADE):
        add(Cue(T.shot_t(i)[0], "whoosh_xfade", f"xfade to shot {i}", (lambda r=rr(): (G.whoosh(0.75, r, 0.3, 280, 1500, 0.9, 0.2, 0.1), 0.3)), -12, send=0.15))

    # Story SFX events
    add(Cue(T.SMOKE_T, "steam_hiss", "April 1991 fumarole steam hiss",
            lambda: (fades(bp(colored(ns(1.5), rng(145), 0.4), 900, 3600, 1) * 0.5, 0.15, 0.45), 0.05), -11, send=0.18))
    add(Cue(T.ERUPT_T, "eruption_boom", "June 15 climactic volcanic blast",
            lambda: _eruption_boom(rng(196)), -3, send=0.25))
    add(Cue(T.PLUME_HIGH_T, "plume_rise", "plume punching above clouds",
            lambda: (G.whoosh(1.1, rng(252), 0.45, 220, 1800, 0.85, 0.25, 0.3), 0.45), -9, send=0.2))
    add(Cue(T.SUNSHADE_T, "sunshade_snap", "windshield sunshade snaps open + sunbounce chime",
            lambda: (_mix_clips(G.push_thump(rng(468)) * 0.65, G.clink(rng(469), 1950, 0.35)), 0.0), -8, send=0.2))
    add(Cue(T.SUNSHADE_T + 0.25, "sunbeam_bounce", "bright sunbeam reflection sparkle",
            lambda: (G.clink(rng(472), 2400, 0.28), 0.0), -11, p=0.25, send=0.22))
    add(Cue(T.COOL_T, "thermo_drop", "global temperature drop chime",
            lambda: (G.clink(rng(546), 1480, 0.45), 0.0), -8, send=0.25))
    add(Cue(T.UMBRELLA_T, "umbrella_pop", "Earth umbrella canopy pops open",
            lambda: (_mix_clips(G.push_thump(rng(612)) * 0.6, G.clink(rng(613), 2100, 0.38)), 0.0), -7, send=0.25))

    return C


def render(v_ref):
    C = cues()
    ir = make_ir(0.95, 1991, pre=0.015, hf=1.4)
    dry, wet = np.zeros((2, N)), np.zeros((2, N))
    for c in C:
        x, anc = c.gen()
        x = st(x)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        m = integrated(x) if c.kind == "bed" else momentary_max(x)
        if np.isfinite(m) and m > -90:
            x *= dbg(v_ref + c.applied - m)
        c.measured = c.applied
        if c.p:
            x = pan(x.mean(0), c.p)
        t0 = c.t - anc
        if c.cut is not None:
            k = ns(c.cut - t0)
            if 0 < k < x.shape[1]:
                x = fades(x[:, :k], 0.0, 0.025)
        place(dry, x, t0)
        if c.send:
            place(wet, x * c.send, t0)
    out = dry + convolve_st(wet, ir) * 0.25
    return fades(out, 0.005, 0.04), C
