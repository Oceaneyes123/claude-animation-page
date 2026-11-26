# Authoritative Divisoria timeline for audio synthesis (matches src/videos/divisoria/story.ts & shorts/08-divisoria/words.json).
import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_SHARED_AUDIO = os.path.join(_ROOT, "scripts", "audio")
if _SHARED_AUDIO not in sys.path:
    sys.path.insert(0, _SHARED_AUDIO)

from dsp import SR

FPS = 30
TOTAL_FRAMES = 1847
DUR = 61.5605  # exact duration of public/divisoria/voice.wav

BPM = 114.0
BEAT = 60.0 / BPM
BAR = 4.0 * BEAT

SHOTS = [
    (1, 0,    198,  "day",    "hook"),
    (2, 198,  438,  "day",    "town_overview"),
    (3, 438,  684,  "day",    "plaza_gather"),
    (4, 684,  894,  "golden", "firebreak"),
    (5, 894,  1164, "day",    "paper_close"),
    (6, 1164, 1278, "day",    "paper_gap"),
    (7, 1278, 1530, "golden", "ember_wind"),
    (8, 1530, 1812, "day",    "city_map"),
    (9, 1812, 1847, "day",    "loop"),
]

XFADES = [a / FPS for (sid, a, _, _, _) in SHOTS if sid in (4, 5, 7, 8, 9)]

HOOK_FIRE_T     = 4.36
FLASH_T         = 198 / FPS   # 6.600s
OPEN_SPACE_T    = 9.46
DIVISORIA_T     = 13.64
PLAZA_GATHER_T  = 16.84
PLAN_PAKAY_T    = 21.60
DIVIDE_T        = 22.92
FIRE_SIDE_T     = 26.32
BLOCK_GAP_T     = 28.20
PAPER_IN_T      = 31.56
PACK_CLOSE_T    = 34.04
IGNITE_1_T      = 35.64
GAP_SLIDE_T     = 39.32
GAP_BURN_T      = 40.70
EMBER_WIND_T    = 43.62
WIDTH_COMPARE_T = 47.20
MATERIAL_T      = 49.08
PLAN_DRAW_T     = 53.04
MAP_HIGHLIGHT_T = 57.14
QUESTION_T      = 60.46

__all__ = [
    "SR", "FPS", "TOTAL_FRAMES", "DUR", "BPM", "BEAT", "BAR", "SHOTS", "XFADES",
    "HOOK_FIRE_T", "FLASH_T", "OPEN_SPACE_T", "DIVISORIA_T", "PLAZA_GATHER_T",
    "PLAN_PAKAY_T", "DIVIDE_T", "FIRE_SIDE_T", "BLOCK_GAP_T", "PAPER_IN_T",
    "PACK_CLOSE_T", "IGNITE_1_T", "GAP_SLIDE_T", "GAP_BURN_T", "EMBER_WIND_T",
    "WIDTH_COMPARE_T", "MATERIAL_T", "PLAN_DRAW_T", "MAP_HIGHLIGHT_T", "QUESTION_T",
]
