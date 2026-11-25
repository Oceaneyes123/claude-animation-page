# Authoritative Bolinao timeline for audio synthesis (matches src/videos/bolinao/story.ts & shorts/04-bolinao/words.json).
import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_SHARED_AUDIO = os.path.join(_ROOT, "scripts", "audio")
if _SHARED_AUDIO not in sys.path:
    sys.path.insert(0, _SHARED_AUDIO)

from dsp import SR

FPS = 30
TOTAL_FRAMES = 2380
DUR = 79.31583333333333  # exact duration of public/bolinao/voice.wav

BPM = 114.0
BEAT = 60.0 / BPM
BAR = 4.0 * BEAT

# Shot start/end frames & modes
SHOTS = [
    (1,  0,    146,   "day",    "hook"),
    (2,  146,  347,   "day",    "dig"),
    (3,  347,  544,   "day",    "teeth"),
    (4,  544,  673,   "day",    "scales"),
    (5,  673,  1067,  "day",    "knife"),
    (6,  1067, 1349,  "golden", "inlay"),
    (7,  1349, 1625,  "golden", "jewels"),
    (8,  1625, 1788,  "day",    "finds"),
    (9,  1788, 2245,  "golden", "mystery"),
    (10, 2245, 2380,  "day",    "loop"),
]

# Crossfade boundaries (seconds)
XFADES = [a / FPS for (sid, a, _, _, _) in SHOTS if sid >= 3]

# Key visual & narration event timestamps (seconds)
FLASH_T      = 146 / FPS   # 4.867s
DIG_T        = 7.00
SKULL_T      = 7.60
TEETH_GOLD_T = 14.08
FISH_T       = 21.14
KNIFE_T      = 25.20
RIVET_T      = 28.28
ALTER_T      = 32.42
PEG_T        = 39.64
SCALE_FORM_T = 43.60
JEWEL_T      = 50.00
TOOTH_FLIP_T = 52.46
FINDS_T      = 56.70
HERITAGE_T   = 70.10
QUESTION_T   = 78.30

__all__ = [
    "SR", "FPS", "TOTAL_FRAMES", "DUR", "BPM", "BEAT", "BAR", "SHOTS", "XFADES",
    "FLASH_T", "DIG_T", "SKULL_T", "TEETH_GOLD_T", "FISH_T", "KNIFE_T", "RIVET_T",
    "ALTER_T", "PEG_T", "SCALE_FORM_T", "JEWEL_T", "TOOTH_FLIP_T", "FINDS_T",
    "HERITAGE_T", "QUESTION_T",
]
