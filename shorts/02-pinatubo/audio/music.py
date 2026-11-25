# Original story score in Bb major (120 bpm) for "Ang Bulkang Nagpalamig sa Buong Mundo",
# synthesized via numpy/scipy using instruments.py.
import numpy as np
from dsp import SR, ns, rng, pan, place, lp
import instruments as I
import timeline as T

N = ns(T.DUR)
Q = 0.5  # 120 bpm quarter note

THEME = [
    (1, 0, 1, 82), (1, 1, .75, 82), (1, 1.75, .25, 84), (1, 2, 1, 86), (1, 3, 1, 82),
    (2, 0, 1, 77), (2, 1, .5, 79), (2, 1.5, .5, 81), (2, 2, 1, 82), (2, 3.5, .5, 77),
    (3, 0, .75, 79), (3, .75, .25, 81), (3, 1, .5, 82), (3, 1.5, .5, 79), (3, 2, 1, 87), (3, 3, .5, 86), (3, 3.5, .5, 84),
    (4, 0, 2, 84), (4, 3.5, .5, 77),
    (5, 0, 1, 82), (5, 1, .75, 82), (5, 1.75, .25, 84), (5, 2, 1, 86), (5, 3, 1, 89),
    (6, 0, .5, 87), (6, .5, .5, 86), (6, 1, .5, 84), (6, 1.5, .5, 82), (6, 2, 1, 81), (6, 3, .5, 82), (6, 3.5, .5, 84),
    (7, 0, .75, 86), (7, .75, .25, 84), (7, 1, .5, 82), (7, 1.5, .5, 81), (7, 2, 1, 79), (7, 3, 1, 84),
    (8, 0, 1, 82), (8, 1, .5, 77), (8, 1.5, .5, 74), (8, 2, 1, 70),
]

CHB = {
    1: ["Bb"] * 4, 2: ["F", "F", "Bb", "Bb"], 3: ["Cm", "Cm", "Eb", "Eb"], 4: ["F7"] * 4,
    5: ["Bb"] * 4, 6: ["Eb", "Eb", "F", "F"], 7: ["Gm", "Gm", "Cm", "F7"], 8: ["Bb"] * 4,
}
CH = {
    "Bb": dict(oom=(34, 41), pah=[53, 58, 62]),
    "F": dict(oom=(41, 36), pah=[53, 57, 60]),
    "F7": dict(oom=(41, 36), pah=[51, 57, 60]),
    "Cm": dict(oom=(36, 43), pah=[55, 60, 63]),
    "Eb": dict(oom=(39, 46), pah=[55, 58, 63]),
    "Gm": dict(oom=(43, 38), pah=[55, 58, 62]),
}
F = I.m2f

SECTIONS = [
    ("hook",        0.0,               T.FLASH),
    ("dormant",     T.FLASH,           T.shot_t(3)[0]),
    ("smoke",       T.shot_t(3)[0],    T.shot_t(4)[0]),
    ("eruption",    T.shot_t(4)[0],    T.shot_t(5)[0]),
    ("suwerte",     T.shot_t(5)[0],    T.shot_t(6)[0]),
    ("malas",       T.shot_t(6)[0],    T.shot_t(7)[0]),
    ("sunshade",    T.shot_t(7)[0],    T.shot_t(8)[0]),
    ("cooling",     T.shot_t(8)[0],    T.shot_t(9)[0]),
    ("observatory", T.shot_t(9)[0],    T.DUR),
]


def theme(t_bar1, bars=range(1, 9), transpose=0):
    ev = []
    for (b, beat, d, m) in THEME:
        if b in bars:
            ev.append((t_bar1 + (b - 1) * 4 * Q + beat * Q, d * Q, m + transpose))
    return sorted(ev)


class Band:
    def __init__(self):
        self.tr = {}
        self.send = {}
        self.cues = []

    def track(self, name, send):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
            self.send[name] = send
        return self.tr[name]

    def add(self, name, x, t, p=0.0, g=1.0, send=0.15):
        buf = self.track(name, send)
        place(buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)


R = rng(1991)
def _r(): return rng(int(R.integers(1 << 30)))


def oompah(b, t_bar, chords, vel=0.55, every=True, pah_vel=0.35):
    for beat in range(4):
        c = CH[chords[beat]]
        t = t_bar + beat * Q
        if t >= T.DUR - 0.1:
            break
        if every or beat in (0, 2):
            m = c["oom"][beat % 2] if every else c["oom"][0 if beat == 0 else 1]
            b.add("tuba", I.brass(F(m), 0.28, vel * (1.0 if beat in (0, 2) else 0.85), _r(), "tuba"), t, -0.1)
        if every or beat in (1, 3):
            off = Q / 2 if every else 0.0
            for k, m in enumerate(c["pah"]):
                b.add("pluck", I.pluck(F(m), pah_vel, _r(), 0.45, 0.4), t + off + 0.005 * k, 0.3 - 0.15 * k)


SN = {
    "light": [1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 1, 1],
    "march": [3, 0, 1, 1, 2, 0, 1, 0, 3, 0, 1, 1, 2, 0, 1, 0],
    "drive": [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1],
}


def snare_bar(b, t_bar, pat, vel, steps=range(16), brush=False):
    for s in steps:
        v = SN[pat][s]
        if not v:
            continue
        t = t_bar + s * Q / 4
        if t >= T.DUR - 0.1:
            break
        vv = vel * {1: 0.5, 2: 0.9, 3: 0.95}[v] * R.uniform(0.93, 1.05)
        snd = I.brush(vv, _r(), swish=(v == 2)) if brush else I.snare(vv, _r())
        b.add("snare", snd, t, 0.05)


def melody(b, name, notes, vel, transpose=0, fn="glock", p=0.0):
    for (t, d, m) in notes:
        if t >= T.DUR - 0.1:
            break
        m = m + transpose
        if fn == "glock":
            x = I.glock(F(m), vel * R.uniform(0.92, 1.05), _r())
        elif fn == "fife":
            x = I.fife(F(m), d * 0.88, vel * R.uniform(0.94, 1.04), _r())
        elif fn == "vibes":
            x = I.vibes(F(m), vel * R.uniform(0.92, 1.05), _r(), dur=max(1.1, d + 0.7), damp=d + 0.3)
        elif fn == "musicbox":
            x = I.musicbox(F(m), vel * R.uniform(0.92, 1.05), _r())
        elif fn == "pluck":
            x = I.pluck(F(m), vel * R.uniform(0.92, 1.05), _r(), dur=max(0.7, d + 0.3))
        b.add(name, x, t, p)


def roll(b, t0, t1, v0, v1, accent=None, at=None):
    for t, v in I.snare_roll(t0, t1, v0, v1, _r()):
        b.add("snare", I.snare(v, _r(), dur=0.14, buzz=True), t, 0.05)
    if accent:
        at = t1 if at is None else at
        b.add("snare", I.snare(accent, _r()), at, 0.05)


def build():
    b = Band()
    for name, send in [("fife", 0.16), ("glock", 0.22), ("tuba", 0.10), ("snare", 0.13),
                       ("cymbal", 0.16), ("stab", 0.16), ("timpani", 0.18), ("pad", 0.25),
                       ("vibes", 0.26), ("musicbox", 0.26), ("pluck", 0.18), ("triangle", 0.25)]:
        b.track(name, send)

    # 1. HOOK (0.0 - FLASH)
    h = theme(0.0, bars=[1, 2, 3])
    melody(b, "glock", h, 0.50, 12, "glock", -0.25)
    melody(b, "vibes", h, 0.44, 0, "vibes", 0.2)
    for bar in (1, 2, 3):
        tb = (bar - 1) * 2.0
        if tb < T.FLASH - 0.5:
            oompah(b, tb, CHB[bar], 0.55, True, 0.38)
            snare_bar(b, tb, "march", 0.5)
    roll(b, max(0.5, T.FLASH - 1.1), T.FLASH - 0.05, 0.25, 0.62)
    b.add("cymbal", I.cymbal(0.45, _r()), 0.0, 0.0)
    hook_cut = np.ones(N)
    a, z = ns(T.FLASH - 0.03), ns(T.FLASH + 0.015)
    hook_cut[a:z] = np.linspace(1, 0, z - a)
    hook_cut[z:] = 0
    for k in b.tr:
        b.tr[k] *= hook_cut[None, :]
    for m in [46, 53, 58, 62, 65]:
        b.add("stab", I.brass(F(m), 0.2, 0.7, _r(), "stab", scoop=-15), T.FLASH, (m - 56) / 20)
    b.add("glock", I.glock(F(94), 0.55, _r()), T.FLASH, -0.3)

    # 2. DORMANT & SMOKE (FLASH - eruption)
    s_dorm, s_smoke, s_erupt = T.FLASH + 0.3, T.shot_t(3)[0], T.shot_t(4)[0]
    n_bars = max(1, int((s_smoke - s_dorm) / 2.0))
    m1 = theme(s_dorm, bars=range(1, min(9, n_bars + 1)))
    melody(b, "pluck", m1, 0.52, 0, "pluck", -0.2)
    melody(b, "vibes", m1, 0.36, 12, "vibes", 0.25)
    for bar in range(1, min(9, n_bars + 1)):
        tb = s_dorm + (bar - 1) * 2.0
        oompah(b, tb, CHB[bar], 0.42, False, 0.3)
        snare_bar(b, tb, "light", 0.35, brush=True)

    # Smoke tension
    b.add("pad", I.pad([F(55), F(58), F(62)], max(2.0, s_erupt - s_smoke), 0.42, _r(), att=0.4, rel=0.5), s_smoke, 0.0)
    for tk in np.arange(s_smoke + 0.2, s_erupt - 0.3, 1.1):
        b.add("timpani", I.timpani(F(43), 0.48, _r()), float(tk), 0.0)

    # 3. ERUPTION (s_erupt - s_suwerte)
    s_suw = T.shot_t(5)[0]
    roll(b, s_erupt - 0.8, T.ERUPT_T - 0.04, 0.2, 0.68, accent=0.8, at=T.ERUPT_T)
    for m in [46, 53, 58, 62, 67]:
        b.add("stab", I.brass(F(m), 0.45, 0.78, _r(), "stab", scoop=-12), T.ERUPT_T, (m - 58) / 20)
    b.add("cymbal", I.cymbal(0.58, _r(), dur=2.2), T.ERUPT_T, 0.0)
    for bar in range(1, 6):
        tb = T.ERUPT_T + (bar - 1) * 2.0
        if tb >= s_suw - 0.4:
            break
        oompah(b, tb, CHB[(bar - 1) % 8 + 1], 0.6, True, 0.42)
        snare_bar(b, tb, "drive", 0.5)
    melody(b, "glock", theme(T.ERUPT_T, bars=[1, 2, 3, 4]), 0.48, 12, "glock", 0.0)

    # 4. SUWERTE & MALAS (s_suw - s_car)
    s_car = T.shot_t(7)[0]
    n_sb = max(1, int((s_car - s_suw) / 2.0))
    ms = theme(s_suw + 0.1, bars=range(1, min(9, n_sb + 1)))
    melody(b, "vibes", ms, 0.46, 0, "vibes", -0.25)
    melody(b, "musicbox", ms, 0.42, 12, "musicbox", 0.25)
    for bar in range(1, min(9, n_sb + 1)):
        tb = s_suw + 0.1 + (bar - 1) * 2.0
        oompah(b, tb, CHB[bar], 0.42, False, 0.3)
        snare_bar(b, tb, "light", 0.34, brush=True)

    # 5. SUNSHADE ANALOGY + COOLING + OBSERVATORY FINALE (s_car - DUR)
    n_cb = max(1, int((T.DUR - s_car - 1.2) / 2.0))
    for blk in range(0, n_cb, 8):
        tb0 = s_car + blk * 2.0
        bars = range(1, min(9, n_cb - blk + 1))
        f1 = theme(tb0, bars=bars)
        melody(b, "glock", f1, 0.52, 12, "glock", -0.2)
        melody(b, "fife", f1, 0.5, 0, "fife", 0.22)
        for bar in bars:
            tb = tb0 + (bar - 1) * 2.0
            oompah(b, tb, CHB[bar], 0.58, True, 0.42)
            snare_bar(b, tb, "march", 0.48)
    b.add("triangle", I.triangle(0.55, _r()), T.SUNSHADE_T, 0.2)
    b.add("triangle", I.triangle(0.6, _r()), T.UMBRELLA_T, -0.2)

    t_btn = T.DUR - 0.55
    roll(b, max(s_car, t_btn - 0.9), t_btn - 0.04, 0.25, 0.65, accent=0.75, at=t_btn)
    for m in [46, 53, 58, 62, 65]:
        b.add("stab", I.brass(F(m), 0.25, 0.72, _r(), "stab", scoop=-10), t_btn, (m - 58) / 20)
    b.add("glock", I.glock(F(82), 0.6, _r()), t_btn, 0.0)
    b.add("cymbal", I.cymbal(0.4, _r(), dur=0.9), t_btn, 0.0)
    return b


def render(b, ref=-20.0):
    from dsp import make_ir, convolve_st, integrated, fades
    ir = make_ir(0.95, 19, pre=0.015, hf=1.4)
    dry, wet = np.zeros((2, N)), np.zeros((2, N))
    for k, x in b.tr.items():
        dry += x
        wet += x * b.send[k]
    out = dry + convolve_st(wet, ir) * 0.25
    out = lp(out, 16000, 1)
    L = integrated(out)
    if np.isfinite(L):
        out *= 10.0 ** ((ref - L) / 20.0)
    return fades(out, 0.005, 0.04), {k: integrated(x) for k, x in b.tr.items()}
