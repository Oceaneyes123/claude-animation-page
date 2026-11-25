# Picture timeline mirrored from src/videos/pinatubo/story.ts so every sound lands on the frame.
import json

FPS = 30
TOTAL = 2070
DUR = TOTAL / FPS  # 69.000 s
fr = lambda f: f / FPS

FLASH = fr(174)        # 5.800 s
SMOKE_T = 16.38        # "umusok"
ERUPT_T = 19.90        # "sumabog"
PLUME_HIGH_T = 24.90   # "lampas sa mga ulap"
SPREAD_T = 40.20       # "kumalat"
SUNSHADE_T = 49.20     # "sunshade"
COOL_T = 56.10         # "bumagsak ang temperatura"
UMBRELLA_T = 67.18     # "payong"

SHOTS = {
    1: (0,    174,  "day",    "hook"),
    2: (174,  414,  "day",    "dormant"),
    3: (414,  585,  "day",    "smoke"),
    4: (585,  930,  "golden", "eruption"),
    5: (930,  1149, "day",    "suwerte"),
    6: (1149, 1335, "golden", "malas"),
    7: (1335, 1659, "day",    "sunshade"),
    8: (1659, 1821, "day",    "cooling"),
    9: (1821, TOTAL,"day",    "observatory"),
}
XFADE = {4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8}


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def words(path):
    raw = json.load(open(path, encoding="utf-8"))
    out = []
    for w in raw["words"]:
        out.append({"w": w["word"], "s": float(w["start"]), "e": float(w["end"])})
    return out
