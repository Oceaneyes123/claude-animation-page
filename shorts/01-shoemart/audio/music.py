# Original upbeat story score in Bb major (120 bpm) for "From Shoes to Malls",
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
    ("hook", 0.0, T.FLASH),
    ("manila", T.FLASH, 12.0),
    ("expand", 12.0, 19.5),
    ("crisis", 19.5, 25.5),
    ("build", 25.5, 31.0),
    ("open", 31.0, 34.83),
    ("atrium", 34.83, 47.60),
    ("flywheel", 47.60, 57.73),
    ("empire", 57.73, 62.50),
    ("finale", 62.50, T.DUR),
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


R = rng(1958)
def _r(): return rng(int(R.integers(1 << 30)))


def oompah(b, t_bar, chords, vel=0.55, every=True, pah_vel=0.35):
    for beat in range(4):
        c = CH[chords[beat]]
        t = t_bar + beat * Q
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
        vv = vel * {1: 0.5, 2: 0.9, 3: 0.95}[v] * R.uniform(0.93, 1.05)
        snd = I.brush(vv, _r(), swish=(v == 2)) if brush else I.snare(vv, _r())
        b.add("snare", snd, t, 0.05)


def melody(b, name, notes, vel, transpose=0, fn="glock", p=0.0):
    for (t, d, m) in notes:
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

    # 1. HOOK (0.0 - 4.20 s)
    h = theme(0.0, bars=[1, 2])
    melody(b, "glock", h, 0.52, 12, "glock", -0.25)
    melody(b, "vibes", h, 0.45, 0, "vibes", 0.2)
    for bar in (1, 2):
        tb = (bar - 1) * 2.0
        oompah(b, tb, CHB[bar], 0.58, True, 0.4)
        snare_bar(b, tb, "march", 0.55, steps=range(16) if bar == 1 else range(8))
    roll(b, 3.0, 4.15, 0.25, 0.62)
    b.add("cymbal", I.cymbal(0.45, _r()), 0.0, 0.0)
    b.cues.append((0.0, "hook: upbeat Bb theme (glock + vibes + plucked rhythm)"))
    hook_cut = np.ones(N)
    a, z = ns(T.FLASH - 0.03), ns(T.FLASH + 0.015)
    hook_cut[a:z] = np.linspace(1, 0, z - a)
    hook_cut[z:] = 0
    for k in b.tr:
        b.tr[k] *= hook_cut[None, :]
    for m in [46, 53, 58, 62, 65]:
        b.add("stab", I.brass(F(m), 0.2, 0.72, _r(), "stab", scoop=-15), T.FLASH, (m - 56) / 20)
    b.add("glock", I.glock(F(94), 0.55, _r()), T.FLASH, -0.3)
    b.add("cymbal", I.cymbal(0.38, _r(), dur=1.2), T.FLASH, 0.0)
    b.cues.append((T.FLASH, "Bb flash button on frame 126"))

    # 2. MANILA 1958 + EXPANSION (4.4 - 19.5 s)
    s0 = 4.5
    m1 = theme(s0, bars=[1, 2, 3, 4])
    melody(b, "pluck", m1, 0.55, 0, "pluck", -0.2)
    melody(b, "glock", m1, 0.35, 12, "glock", 0.25)
    for bar in range(1, 5):
        tb = s0 + (bar - 1) * 2.0
        oompah(b, tb, CHB[bar], 0.45, False, 0.32)
        snare_bar(b, tb, "light", 0.4, brush=True)
    m2 = theme(12.5, bars=[5, 6, 7, 8])
    melody(b, "fife", m2, 0.48, 0, "fife", 0.2)
    melody(b, "glock", m2, 0.46, 12, "glock", -0.2)
    for bar in range(5, 9):
        tb = 12.5 + (bar - 5) * 2.0
        oompah(b, tb, CHB[bar], 0.56, True, 0.4)
        snare_bar(b, tb, "march", 0.46, brush=True)
    b.cues.append((4.5, "1958 Manila & 1970s expansion: warm plucks, brush rhythm, glock"))

    # 3. 1980s ECONOMIC CRISIS (19.5 - 25.5 s): moody Gm / Cm / F7 pad + low timpani
    b.add("pad", I.pad([F(55), F(58), F(62)], 3.0, 0.45, _r(), att=0.4, rel=0.6), 19.6, 0.0)
    b.add("pad", I.pad([F(48), F(55), F(60), F(63)], 3.0, 0.48, _r(), att=0.4, rel=0.6), 22.5, 0.0)
    for tk in [19.7, 21.2, 22.7, 24.2]:
        b.add("timpani", I.timpani(F(43), 0.5, _r()), tk, 0.0)
    b.cues.append((19.5, "1980s crisis: minor-key warm pad + slow timpani pulse"))

    # 4. QC CONSTRUCTION (25.5 - 31.0 s) & SM NORTH EDSA OPENING (31.0 - 34.83 s)
    for bar in range(1, 4):
        tb = 25.5 + (bar - 1) * 2.0
        oompah(b, tb, CHB[bar], 0.58, True, 0.42)
        snare_bar(b, tb, "drive", 0.48)
    melody(b, "glock", theme(25.5, bars=[1, 2, 3]), 0.48, 12, "glock", 0.0)
    roll(b, 31.2, 33.42, 0.2, 0.65, accent=0.75, at=T.RIBBON_CUT)
    for m in [46, 53, 58, 62, 65, 70]:
        b.add("stab", I.brass(F(m), 0.35, 0.78, _r(), "stab", scoop=-12), T.RIBBON_CUT, (m - 58) / 20)
    b.add("cymbal", I.cymbal(0.55, _r(), dur=2.0), T.RIBBON_CUT, 0.0)
    b.add("triangle", I.triangle(0.65, _r()), T.RIBBON_CUT, 0.3)
    b.cues.append((25.5, "QC construction drive -> celebratory brass fanfare on ribbon cut (33.47 s)"))

    # 5. ATRIUM & NON-SHOPPERS (34.83 - 47.60 s): breezy vibes + musicbox
    a1 = theme(35.0, bars=[1, 2, 3, 4, 5, 6])
    melody(b, "vibes", a1, 0.46, 0, "vibes", -0.25)
    melody(b, "musicbox", a1, 0.42, 12, "musicbox", 0.25)
    for bar in range(1, 7):
        tb = 35.0 + (bar - 1) * 2.0
        oompah(b, tb, CHB[bar], 0.42, False, 0.3)
        snare_bar(b, tb, "light", 0.32, brush=True)
    b.cues.append((35.0, "Cool air-conditioned atrium: breezy vibes + musicbox"))

    # 6. FLYWHEEL -> MEGAMALL -> MOA -> EMPIRE -> FINALE (47.60 - 69.00 s)
    f1 = theme(47.6, bars=[1, 2, 3, 4, 5, 6, 7, 8])
    melody(b, "glock", f1, 0.52, 12, "glock", -0.2)
    melody(b, "fife", f1, 0.54, 0, "fife", 0.25)
    for bar in range(1, 9):
        tb = 47.6 + (bar - 1) * 2.0
        oompah(b, tb, CHB[bar], 0.6, True, 0.44)
        snare_bar(b, tb, "march", 0.5)
    b.add("cymbal", I.cymbal(0.45, _r()), 47.6, 0.0)

    # Final reprise (63.6 - 69.0 s) ending on a crisp Bb button at 68.55 s
    fin = theme(63.6, bars=[1, 2])
    melody(b, "glock", fin, 0.55, 12, "glock", -0.2)
    melody(b, "vibes", fin, 0.5, 0, "vibes", 0.2)
    for bar in (1, 2):
        tb = 63.6 + (bar - 1) * 2.0
        oompah(b, tb, CHB[bar], 0.62, True, 0.45)
        snare_bar(b, tb, "march", 0.54)
    roll(b, 67.6, 68.50, 0.25, 0.65, accent=0.75, at=68.55)
    for m in [46, 53, 58, 62, 65]:
        b.add("stab", I.brass(F(m), 0.25, 0.72, _r(), "stab", scoop=-10), 68.55, (m - 58) / 20)
    b.add("glock", I.glock(F(82), 0.6, _r()), 68.55, 0.0)
    b.add("cymbal", I.cymbal(0.4, _r(), dur=0.9), 68.55, 0.0)
    b.cues.append((47.6, "Flywheel, Megamall, MOA, Empire & Weekend Finale reprise"))
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
