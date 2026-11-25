# Picture timeline mirrored from src/videos/shoemart/story.ts so every sound lands on the frame.
import json

FPS = 30
TOTAL = 2070
DUR = TOTAL / FPS  # 69.000 s exactly
fr = lambda f: f / FPS

FLASH = fr(126)        # 4.200 s
RIBBON_CUT = 33.47     # f1004: SM North EDSA doors open

# id: (first frame, end frame, light, district)
SHOTS = {
    1:  (0,    126,  "day",    "mall_hook"),
    2:  (126,  362,  "day",    "manila"),
    3:  (362,  585,  "day",    "manila_exp"),
    4:  (585,  765,  "golden", "qc_crisis"),
    5:  (765,  930,  "day",    "qc_build"),
    6:  (930,  1045, "day",    "mall_open"),
    7:  (1045, 1116, "day",    "manila_hot"),
    8:  (1116, 1320, "day",    "atrium"),
    9:  (1320, 1428, "day",    "atrium_relax"),
    10: (1428, 1560, "golden", "mall_flywheel"),
    11: (1560, 1648, "day",    "mall_mega"),
    12: (1648, 1732, "day",    "moa"),
    13: (1732, 1875, "golden", "empire"),
    14: (1875, TOTAL,"day",    "mall_finale"),
}
XFADE = {4: 8, 5: 8, 6: 8, 10: 8, 11: 8, 13: 8, 14: 8}


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def words(path):
    raw = json.load(open(path, encoding="utf-8"))
    out = []
    for w in raw["words"]:
        out.append({"w": w["word"], "s": float(w["start"]), "e": float(w["end"])})
    return out
