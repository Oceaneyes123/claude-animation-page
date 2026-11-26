# Authoritative Davao timeline for audio synthesis (matches src/videos/davao/story.ts & shorts/06-davao/words.json).
import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_SHARED_AUDIO = os.path.join(_ROOT, "scripts", "audio")
if _SHARED_AUDIO not in sys.path:
    sys.path.insert(0, _SHARED_AUDIO)

from dsp import SR

FPS = 30
TOTAL_FRAMES = 1972
DUR = 65.71466666666667  # exact duration of public/davao/voice.wav

BPM = 112.0
BEAT = 60.0 / BPM
BAR = 4.0 * BEAT

SHOTS = [
    (1, 0,    204,  "day",    "hook"),
    (2, 204,  496,  "day",    "hatch1992"),
    (3, 496,  690,  "day",    "team_joy"),
    (4, 690,  852,  "golden", "match_egg"),
    (5, 852,  1110, "day",    "nursery"),
    (6, 1110, 1290, "day",    "parents"),
    (7, 1290, 1555, "golden", "mabuhay"),
    (8, 1555, 1812, "day",    "forest"),
    (9, 1812, 1972, "day",    "unity_loop"),
]

XFADES = [a / FPS for (sid, a, _, _, _) in SHOTS if sid >= 4]

FLASH_T       = 204 / FPS   # 6.800s
EGG_HOOK_T    = 3.85
HATCH_92_T    = 8.44
PAGASA_T      = 10.34
CHICK_NEWS_T  = 21.10
MATCH_EGG_T   = 24.72
SEED1_T       = 28.68
SEED2_T       = 32.65
GEN2_T        = 34.76
PARENTS_EGG_T = 40.86
HATCH_13_T    = 44.46
MABUHAY_T     = 45.70
FOREST_WIDE_T = 56.25
LINK_T        = 60.45
QUESTION_T    = 64.88

__all__ = [
    "SR", "FPS", "TOTAL_FRAMES", "DUR", "BPM", "BEAT", "BAR", "SHOTS", "XFADES",
    "FLASH_T", "EGG_HOOK_T", "HATCH_92_T", "PAGASA_T", "CHICK_NEWS_T", "MATCH_EGG_T",
    "SEED1_T", "SEED2_T", "GEN2_T", "PARENTS_EGG_T", "HATCH_13_T", "MABUHAY_T",
    "FOREST_WIDE_T", "LINK_T", "QUESTION_T",
]
