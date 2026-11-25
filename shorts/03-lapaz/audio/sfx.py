# Synthesized SFX + ambience beds for "Ang Disyertong Gawa ng Ilog at Hangin", timed to timeline.py.
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


def _rain_bed(dur, r):
    n = ns(dur)
    x = bp(colored(n, r, 0.3), 700, 4800, 1) * 0.45 + lp(colored(n, r, 1.1), 400, 1) * 0.35
    return fades(st(x), 0.3, 0.4)


def _river_bed(dur, r):
    n = ns(dur)
    x = bp(colored(n, r, 0.7), 220, 1900, 1) * 0.55 + lp(colored(n, r, 1.2), 320, 1) * 0.35
    return fades(st(x), 0.3, 0.4)


def _wave_crash(r):
    dur = 2.0
    t = tt(dur)
    env = np.sin(np.minimum(1.0, t / 0.65) * (np.pi / 2)) * np.exp(-np.maximum(0.0, t - 0.45) / 0.65)
    surf = bp(colored(len(t), r, 0.45), 260, 2600, 1) * env * 0.85
    sub = lp(colored(len(t), r, 1.4), 160, 1) * env * 0.6
    return widen(fades(surf + sub, 0.02, 0.35), r, 12, 0.85), 0.38


def _fan_whir(dur, r):
    n = ns(dur)
    t = tt(dur)
    hum = 0.25 * np.sin(2 * np.pi * 120 * t) + 0.12 * np.sin(2 * np.pi * 240 * t)
    air = bp(colored(n, r, 0.5), 300, 1800, 1) * 0.48
    return fades(st(hum + air), 0.25, 0.35)


def _mix_clips(*xs):
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[: len(x)] += x
    return out


def cues():
    C = []
    R = rng(2026)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append

    def amb_coast(dur, seed=1, birds=True):
        def g():
            r = rng(seed)
            x = G.breeze(dur, r, 0.9, 0.14, 900)
            if birds:
                x += pan(G.bird_chirps(dur, r, 0.28, "sparrow") * 0.08, 0.35)
            return fades(x, 0.3, 0.35), 0.0
        return g

    t_flash = T.FLASH
    t_typ_a, t_typ_b = T.shot_t(3)
    t_conv_a, t_conv_b = T.shot_t(4)
    t_suw_a, t_suw_b = T.shot_t(5)
    t_mal_a, t_mal_b = T.shot_t(6)
    t_fan_a, t_fan_b = T.shot_t(7)
    t_liv_a, t_liv_b = T.shot_t(8)
    t_loop_a, t_loop_b = T.shot_t(9)

    add(Cue(0.0, "amb_hook", "coastal desert wind at hook", _cut(amb_coast(t_flash + 0.1, 10, False), t_flash + 0.1, 0.05, 0.2), -28, "bed", send=0.0))
    add(Cue(t_flash, "amb_sahara", "sunny dunes breeze", _cut(amb_coast(t_typ_a - t_flash, 20, True), t_typ_a - t_flash, 0.3, 0.35), -29, "bed", send=0.0))
    add(Cue(t_typ_a, "amb_typhoon", "tropical rain squall", lambda: (_rain_bed(t_typ_b - t_typ_a, rng(30)), 0.0), -25, "bed", send=0.08))
    add(Cue(t_conv_a, "amb_river", "Padsan River flow & ocean surf", lambda: (_river_bed(t_conv_b - t_conv_a, rng(40)), 0.0), -27, "bed", send=0.05))
    add(Cue(t_suw_a, "amb_suwerte", "Ilocos farms and coastal breeze", _cut(amb_coast(t_suw_b - t_suw_a, 50, True), t_suw_b - t_suw_a, 0.3, 0.3), -29, "bed", send=0.0))
    add(Cue(t_mal_a, "amb_gale", "Amihan/Habagat coastal wind", lambda: (fades(G.breeze(t_mal_b - t_mal_a, rng(60), 1.0, 0.22, 1300), 0.25, 0.35), 0.0), -25, "bed", send=0.08))
    add(Cue(t_fan_a, "amb_fan", "electric fan whir on wooden porch", lambda: (_fan_whir(t_fan_b - t_fan_a, rng(70)), 0.0), -27, "bed", send=0.04))
    add(Cue(t_liv_a, "amb_living", "shifting dunes golden wind", _cut(amb_coast(t_loop_b - t_liv_a, 80, False), t_loop_b - t_liv_a, 0.3, 0.12), -28, "bed", send=0.0))

    # Hook flash + crossfade whooshes
    add(Cue(t_flash, "flash_whoosh", "white flash swell", lambda: _flash(rng(156)), -5, send=0.2))
    for i in sorted(T.XFADE):
        add(Cue(T.shot_t(i)[0], "whoosh_xfade", f"xfade to shot {i}", (lambda r=rr(): (G.whoosh(0.75, r, 0.3, 280, 1500, 0.9, 0.2, 0.1), 0.3)), -12, send=0.15))

    # Story SFX events
    add(Cue(T.RAIN_T, "rain_squall", "monsoon downpour swell",
            lambda: (G.whoosh(1.0, rng(210), 0.4, 350, 2600, 0.8, 0.2, 0.2), 0.4), -10, send=0.15))
    add(Cue(T.RIVER_T, "river_rush", "Padsan River carrying sand downstream",
            lambda: (G.whoosh(1.2, rng(310), 0.45, 220, 1600, 0.85, 0.25, 0.25), 0.45), -9, send=0.18))
    add(Cue(T.WAVE_T, "wave_crash", "ocean wave pushing sand ashore",
            lambda: _wave_crash(rng(410)), -6, send=0.22))
    add(Cue(T.WIND_T, "monsoon_gust", "Amihan & Habagat gust sweeping inland",
            lambda: (G.whoosh(1.4, rng(510), 0.5, 280, 2400, 0.9, 0.3, 0.35), 0.5), -6, send=0.2))
    add(Cue(T.FAN_T, "fan_click_on", "electric fan clicks on",
            lambda: (_mix_clips(G.push_thump(rng(610)) * 0.6, G.clink(rng(611), 1750, 0.3)), 0.0), -8, send=0.18))
    add(Cue(T.PILE_T, "sand_pile_pop", "mini sand dune piles up",
            lambda: (G.clink(rng(710), 2100, 0.38), 0.0), -8, send=0.22))
    add(Cue(T.QUESTION_T, "loop_chime", "Kaya ang tanong loop prompt",
            lambda: (G.clink(rng(810), 1650, 0.42), 0.0), -8, send=0.22))

    return C


def render(v_ref):
    C = cues()
    ir = make_ir(0.95, 2026, pre=0.015, hf=1.4)
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
