# Synthesized SFX + ambience beds for "From Shoes to Malls", timed to timeline.py.
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, colored, smooth_noise)
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


def _murmur(dur, r, voices):
    n = ns(dur)
    out = np.zeros((2, n))
    for v in range(voices):
        base = r.uniform(100, 260)
        scale = r.uniform(0.95, 1.25)
        y = G.babble(dur, r, base, scale, r.uniform(3.4, 4.8), r.uniform(0.5, 0.75), fmax=3200)
        out += pan(lp(y, r.uniform(2200, 3400), 1) * r.uniform(0.35, 1.0), r.uniform(-0.85, 0.85))
    return fades(out, 0.25, 0.6)


def _cheer(dur, r):
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for v in range(20):
        kid = v % 5 == 4
        base = r.uniform(260, 330) if kid else r.uniform(115, 240)
        h = G.hurrah(r, base, 1.25 if kid else 1.05, kid)
        place(out, pan(lp(h, 3800, 1) * r.uniform(0.4, 1.0), r.uniform(-0.85, 0.85)), r.uniform(0.05, 0.9))
    env = np.interp(t, [0, 0.3, 1.0, 2.0, dur], [0.0, 0.7, 1.0, 0.7, 0.0])
    out += G.applause(dur, r, 32, env) * 0.85
    return fades(out, 0.05, 0.4)


def cues():
    C = []
    R = rng(1958)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append

    # Ambience beds
    def amb_city(dur, seed=1, crowd=0.45):
        def g():
            r = rng(seed)
            x = G.breeze(dur, r, 0.9, 0.16, 850)
            x += pan(G.bird_chirps(dur, r, 0.35, "sparrow") * 0.07, 0.4)
            x += _murmur(dur, r, 10) * crowd
            return fades(x, 0.35, 0.45), 0.0
        return g

    add(Cue(0.0, "amb_hook", "plaza breeze + happy crowd bed", _cut(amb_city(4.25, 10, 0.35), 4.25, 0.1, 0.2), -29, "bed", send=0.0))
    add(Cue(4.2, "amb_manila", "1958-70s Manila street breeze + chatter", _cut(amb_city(15.3, 20, 0.42), 15.3, 0.3, 0.4), -29, "bed", send=0.0))
    add(Cue(19.5, "amb_golden", "1980s golden-hour wind", lambda: (fades(G.breeze(6.0, rng(30), 1.1, 0.25, 650), 0.3, 0.4), 0.0), -28, "bed", send=0.0))
    add(Cue(25.5, "amb_qc", "Quezon City open-air construction breeze", lambda: (fades(G.breeze(5.5, rng(40), 1.0, 0.2, 800), 0.3, 0.4), 0.0), -29, "bed", send=0.0))
    add(Cue(31.0, "amb_plaza", "SM North EDSA plaza opening crowd", _cut(amb_city(6.2, 50, 0.45), 6.2, 0.25, 0.35), -28, "bed", send=0.0))
    add(Cue(37.2, "amb_atrium", "cool air-conditioned atrium + indoor fountain",
            lambda: (fades(G.water_bed(10.4, rng(60), 0.6, 0.5) * 0.45 + G.breeze(10.4, rng(61), 0.55, 0.05, 1200), 0.3, 0.4), 0.0), -27, "bed", send=0.0))
    add(Cue(47.6, "amb_empire", "bustling mall promenade & Manila Bay breeze", _cut(amb_city(21.4, 70, 0.4), 21.4, 0.35, 0.1), -28, "bed", send=0.0))

    # Hook flash
    add(Cue(T.FLASH, "flash_whoosh", "white flash swell at frame 126", lambda: _flash(rng(126)), -5, send=0.2))

    # Camera move / crossfade whooshes
    for f, desc in [(36, "hook push"), (78, "hook to shoes"), (206, "into 1958 ShoeMart"), (294, "closer on ShoeMart"),
                    (422, "expanded store pop"), (512, "family with bags"), (650, "crisis lot pan"),
                    (838, "QC wide aerial"), (992, "mall entrance"), (1116, "into cool atrium"),
                    (1185, "to cinema marquee"), (1232, "across families"), (1482, "flywheel storefronts"),
                    (1648, "to Mall of Asia"), (1794, "across Bank/Hotel/Towers"), (1932, "pullback to Henry"), (1982, "grand crane out")]:
        add(Cue(T.fr(f), "whoosh_cam", f"camera {desc}", (lambda r=rr(): (G.whoosh(0.55, r, 0.09, 340, 2100, 0.8, 0.16, 0.15), 0.09)), -12, send=0.12))

    for f, desc in [(585, "xfade to 1980s golden"), (765, "xfade to QC site"), (930, "xfade to SM North EDSA"),
                    (1428, "xfade to flywheel golden"), (1560, "xfade to Megamall"), (1732, "xfade to Empire"), (1875, "xfade to finale")]:
        add(Cue(T.fr(f), "whoosh_xfade", desc, (lambda r=rr(): (G.whoosh(0.75, r, 0.3, 280, 1500, 0.9, 0.2, 0.1), 0.3)), -12, send=0.15))

    # Specific story SFX events
    # Store expansion pop + cash chime (f422 = 14.07 s)
    add(Cue(14.07, "expand_pop", "storefront expansion pop + chime", lambda: (G.clink(rng(422), 1850, 0.30) + G.push_thump(rng(423)) * 0.5, 0.0), -10, send=0.2))

    # Construction hammers in Shot 5 (26.2 - 30.2 s)
    for k in range(6):
        tm = 26.2 + k * 0.65
        add(Cue(tm, "hammer", f"construction hammer {k+1}", (lambda r=rr(): (G.hammer_hit(r, 0.85), 0.0)), -11, p=(k % 3 - 1) * 0.3, send=0.2, group="hammers"))

    # Ribbon cut + doors opening + celebratory cheer (33.47 s)
    add(Cue(T.RIBBON_CUT, "ribbon_snap", "ceremonial ribbon snap + doors open", lambda: (G.clink(rng(1004), 2400, 0.45) + G.whoosh(0.45, rng(1005), 0.12, 400, 2400, 0.8, 0.15, 0.2), 0.0), -8, send=0.2))
    add(Cue(T.RIBBON_CUT + 0.08, "opening_cheer", "crowd cheers as SM North EDSA opens", lambda: (_cheer(2.4, rng(1006)), 0.0), -7, lpf=4800, send=0.25))

    # Cool AC air rush inside mall (Shot 8 & 9)
    for tm in [37.4, 41.8, 44.8]:
        add(Cue(tm, "ac_breeze", "cool AC vent breeze", (lambda r=rr(): (G.whoosh(0.75, r, 0.35, 650, 2600, 0.7, 0.25, 0.45), 0.35)), -13, send=0.2, group="ac"))

    # Flywheel kiosk pop sparkles (Shot 10)
    for k in range(4):
        add(Cue(49.1 + k * 0.38, "kiosk_pop", f"shop pop {k+1}", (lambda r=rr(), k=k: (G.clink(r, 1500 + k * 240, 0.22), 0.0)), -12, p=-0.4 + k * 0.26, send=0.22, group="kiosks"))

    # Joyful footsteps in finale (Shots 12-14)
    for k in range(18):
        tm = 63.0 + k * 0.31
        add(Cue(tm, "stroll_step", "weekend plaza footsteps", (lambda r=rr(): (G.stroll_step(r, 0.45), 0.0)), -15, p=float(R.uniform(-0.6, 0.6)), send=0.18, group="stroll"))

    return C


def render(v_ref):
    C = cues()
    ir = make_ir(0.95, 1958, pre=0.015, hf=1.4)
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
