# Original story score in C major (120 bpm) for "Ang Disyertong Gawa ng Ilog at Hangin",
# synthesized via numpy/scipy using instruments.py.
import numpy as np
from dsp import SR, ns, rng, pan, place, lp
import instruments as I
import timeline as T

N = ns(T.DUR)
Q = 0.5  # 120 bpm quarter note

# Bright breezy theme in C major (MIDI notes)
THEME = [
    (1, 0, 1, 79), (1, 1, .75, 79), (1, 1.75, .25, 81), (1, 2, 1, 84), (1, 3, 1, 79),
    (2, 0, 1, 76), (2, 1, .5, 77), (2, 1.5, .5, 79), (2, 2, 1, 81), (2, 3.5, .5, 76),
    (3, 0, .75, 77), (3, .75, .25, 79), (3, 1, .5, 81), (3, 1.5, .5, 77), (3, 2, 1, 86), (3, 3, .5, 84), (3, 3.5, .5, 83),
    (4, 0, 2, 83), (4, 3.5, .5, 79),
    (5, 0, 1, 84), (5, 1, .75, 84), (5, 1.75, .25, 86), (5, 2, 1, 88), (5, 3, 1, 91),
    (6, 0, .5, 89), (6, .5, .5, 88), (6, 1, .5, 86), (6, 1.5, .5, 84), (6, 2, 1, 83), (6, 3, .5, 84), (6, 3.5, .5, 86),
    (7, 0, .75, 88), (7, .75, .25, 86), (7, 1, .5, 84), (7, 1.5, .5, 83), (7, 2, 1, 81), (7, 3, 1, 86),
    (8, 0, 1, 84), (8, 1, .5, 79), (8, 1.5, .5, 76), (8, 2, 1, 79),
]

CHB = {
    1: ["C"] * 4, 2: ["G", "G", "C", "C"], 3: ["Dm", "Dm", "F", "F"], 4: ["G7"] * 4,
    5: ["C"] * 4, 6: ["F", "F", "G", "G"], 7: ["Am", "Am", "Dm", "G7"], 8: ["C", "C", "G7", "G7"],
}
CH = {
    "C":  dict(oom=(36, 43), pah=[55, 60, 64]),
    "G":  dict(oom=(43, 38), pah=[55, 59, 62]),
    "G7": dict(oom=(43, 38), pah=[53, 59, 62]),
    "Dm": dict(oom=(38, 45), pah=[57, 62, 65]),
    "F":  dict(oom=(41, 48), pah=[57, 60, 65]),
    "Am": dict(oom=(45, 40), pah=[57, 60, 64]),
}
F = I.m2f

SECTIONS = [
    ("hook",     0.0,            T.FLASH),
    ("sahara",   T.FLASH,        T.shot_t(3)[0]),
    ("typhoon",  T.shot_t(3)[0], T.shot_t(4)[0]),
    ("conveyor", T.shot_t(4)[0], T.shot_t(5)[0]),
    ("suwerte",  T.shot_t(5)[0], T.shot_t(6)[0]),
    ("malas",    T.shot_t(6)[0], T.shot_t(7)[0]),
    ("fan",      T.shot_t(7)[0], T.shot_t(8)[0]),
    ("living",   T.shot_t(8)[0], T.shot_t(9)[0]),
    ("loop",     T.shot_t(9)[0], T.DUR),
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

    def track(self, name, send):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
            self.send[name] = send
        return self.tr[name]

    def add(self, name, x, t, p=0.0, g=1.0, send=0.15):
        buf = self.track(name, send)
        place(buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)


R = rng(2026)
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
    for m in [48, 55, 60, 64, 67]:
        b.add("stab", I.brass(F(m), 0.2, 0.7, _r(), "stab", scoop=-15), T.FLASH, (m - 58) / 20)
    b.add("glock", I.glock(F(96), 0.55, _r()), T.FLASH, -0.3)

    # 2. SAHARA CONTRAST & TYPHOON PUZZLE (FLASH - CONVEYOR)
    s_sah, s_typ, s_conv = T.FLASH + 0.3, T.shot_t(3)[0], T.shot_t(4)[0]
    n_bars = max(1, int((s_typ - s_sah) / 2.0))
    m1 = theme(s_sah, bars=range(1, min(9, n_bars + 1)))
    melody(b, "pluck", m1, 0.52, 0, "pluck", -0.2)
    melody(b, "vibes", m1, 0.36, 12, "vibes", 0.25)
    for bar in range(1, min(9, n_bars + 1)):
        tb = s_sah + (bar - 1) * 2.0
        oompah(b, tb, CHB[bar], 0.42, False, 0.3)
        snare_bar(b, tb, "light", 0.35, brush=True)

    b.add("pad", I.pad([F(57), F(60), F(64)], max(2.0, s_conv - s_typ), 0.42, _r(), att=0.4, rel=0.5), s_typ, 0.0)
    for tk in np.arange(s_typ + 0.2, s_conv - 0.3, 1.1):
        b.add("timpani", I.timpani(F(45), 0.46, _r()), float(tk), 0.0)

    # 3. CONVEYOR (Padsan River + Ocean Waves, s_conv - s_suw)
    s_suw = T.shot_t(5)[0]
    n_cb = max(1, int((s_suw - s_conv) / 2.0))
    for bar in range(1, min(9, n_cb + 1)):
        tb = s_conv + (bar - 1) * 2.0
        oompah(b, tb, CHB[(bar - 1) % 8 + 1], 0.54, True, 0.38)
        snare_bar(b, tb, "march", 0.44)
    melody(b, "glock", theme(s_conv, bars=range(1, min(9, n_cb + 1))), 0.46, 12, "glock", 0.0)
    b.add("triangle", I.triangle(0.5, _r()), T.WAVE_T, 0.2)

    # 4. SUWERTE & MALAS (s_suw - s_fan)
    s_fan = T.shot_t(7)[0]
    n_sb = max(1, int((s_fan - s_suw) / 2.0))
    ms = theme(s_suw + 0.1, bars=range(1, min(9, n_sb + 1)))
    melody(b, "vibes", ms, 0.46, 0, "vibes", -0.25)
    melody(b, "musicbox", ms, 0.42, 12, "musicbox", 0.25)
    for bar in range(1, min(9, n_sb + 1)):
        tb = s_suw + 0.1 + (bar - 1) * 2.0
        oompah(b, tb, CHB[(bar - 1) % 8 + 1], 0.42, False, 0.3)
        snare_bar(b, tb, "light", 0.34, brush=True)
    b.add("cymbal", I.cymbal(0.48, _r(), dur=1.8), T.WIND_T, 0.0)

    # 5. FAN ANALOGY + LIVING DUNES + LOOP QUESTION (s_fan - DUR)
    n_fb = max(1, int((T.DUR - s_fan - 1.0) / 2.0))
    for blk in range(0, n_fb, 8):
        tb0 = s_fan + blk * 2.0
        bars = range(1, min(9, n_fb - blk + 1))
        f1 = theme(tb0, bars=bars)
        melody(b, "glock", f1, 0.52, 12, "glock", -0.2)
        melody(b, "fife", f1, 0.48, 0, "fife", 0.22)
        for bar in bars:
            tb = tb0 + (bar - 1) * 2.0
            oompah(b, tb, CHB[(bar - 1) % 8 + 1], 0.56, True, 0.4)
            snare_bar(b, tb, "march", 0.46)
    b.add("triangle", I.triangle(0.55, _r()), T.FAN_T, 0.2)
    b.add("triangle", I.triangle(0.58, _r()), T.PILE_T, -0.2)

    # Open dominant G7 chime at "Kaya ang tanong..." so it loops smoothly back to Beat 1 C major!
    t_btn = T.DUR - 0.45
    roll(b, max(s_fan, T.QUESTION_T - 0.4), t_btn - 0.04, 0.2, 0.58, accent=0.65, at=t_btn)
    for m in [43, 55, 59, 62, 65]:
        b.add("stab", I.brass(F(m), 0.22, 0.68, _r(), "stab", scoop=-8), t_btn, (m - 58) / 20)
    b.add("glock", I.glock(F(83), 0.58, _r()), t_btn, 0.0)
    return b


def render(b, ref=-20.0):
    from dsp import make_ir, convolve_st, integrated, fades
    ir = make_ir(0.95, 21, pre=0.015, hf=1.4)
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
