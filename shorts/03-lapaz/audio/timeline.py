# Picture timeline mirrored from src/videos/lapaz/story.ts so every sound lands on the frame.
import json

FPS = 30
TOTAL = 2052
DUR = TOTAL / FPS  # 68.400 s
fr = lambda f: f / FPS

FLASH = fr(165)     # 5.500 s
RAIN_T = 20.00      # "malalakas na bagyo at ulan"
RIVER_T = 24.08     # "Padsan River"
WAVE_T = 32.20      # "alon"
WIND_T = 44.72      # "Amihan at Habagat"
FAN_T = 51.14       # "electric fan"
PILE_T = 56.48      # "itinutumpok"
QUESTION_T = 67.12  # "Kaya ang tanong..."

SHOTS = {
    1: (0,    165,  "day",    "hook"),
    2: (165,  432,  "day",    "sahara"),
    3: (432,  684,  "day",    "typhoon"),
    4: (684,  1020, "day",    "conveyor"),
    5: (1020, 1185, "day",    "suwerte"),
    6: (1185, 1437, "golden", "malas"),
    7: (1437, 1770, "day",    "fan"),
    8: (1770, 2013, "golden", "living"),
    9: (2013, TOTAL,"day",    "loop"),
}
XFADE = {3: 8, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8}


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def words(path):
    raw = json.load(open(path, encoding="utf-8"))
    out = []
    for w in raw["words"]:
        out.append({"w": w["word"], "s": float(w["start"]), "e": float(w["end"])})
    return out
