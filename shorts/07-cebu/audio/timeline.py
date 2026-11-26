# Authoritative Cebu timeline for audio synthesis (matches src/videos/cebu/story.ts & shorts/07-cebu/words.json).
import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_SHARED_AUDIO = os.path.join(_ROOT, "scripts", "audio")
if _SHARED_AUDIO not in sys.path:
    sys.path.insert(0, _SHARED_AUDIO)

from dsp import SR

FPS = 30
TOTAL_FRAMES = 1830
DUR = 60.9915  # exact duration of public/cebu/voice.wav

BPM = 116.0
BEAT = 60.0 / BPM
BAR = 4.0 * BEAT

SHOTS = [
    (1, 0,    144,  "day",    "hook"),
    (2, 144,  363,  "day",    "bohol_map"),
    (3, 363,  456,  "day",    "strait_cross"),
    (4, 456,  594,  "golden", "collapse"),
    (5, 594,  948,  "day",    "table_demo"),
    (6, 948,  1269, "day",    "fault_cutaway"),
    (7, 1269, 1580, "golden", "inertia_rig"),
    (8, 1580, 1796, "day",    "damage_compare"),
    (9, 1796, 1830, "day",    "loop"),
]

XFADES = [a / FPS for (sid, a, _, _, _) in SHOTS if sid >= 4]

HOOK_SHAKE_T   = 2.76
FLASH_T        = 144 / FPS   # 4.800s
BOHOL_SHOCK_T  = 8.90
MAG_PULSE_T    = 10.40
CEBU_SHAKE_T   = 13.40
BELL_SWAY_T    = 15.98
COLLAPSE_T     = 16.94
BLOCKS_IN_T    = 22.10
TAP_T          = 24.58
TOWER_WOBBLE_T = 26.44
FAULT_SLIP_T   = 32.52
FAULT_CRACK_T  = 33.80
WAVES_OUT_T    = 36.42
ACROSS_T       = 39.62
BASE_JOLT_T    = 42.58
TOP_LAG_T      = 44.94
STRESS_T       = 49.64
SWAY_T         = 51.30
COMPARE_T      = 55.88
QUESTION_T     = 59.96

__all__ = [
    "SR", "FPS", "TOTAL_FRAMES", "DUR", "BPM", "BEAT", "BAR", "SHOTS", "XFADES",
    "HOOK_SHAKE_T", "FLASH_T", "BOHOL_SHOCK_T", "MAG_PULSE_T", "CEBU_SHAKE_T",
    "BELL_SWAY_T", "COLLAPSE_T", "BLOCKS_IN_T", "TAP_T", "TOWER_WOBBLE_T",
    "FAULT_SLIP_T", "FAULT_CRACK_T", "WAVES_OUT_T", "ACROSS_T", "BASE_JOLT_T",
    "TOP_LAG_T", "STRESS_T", "SWAY_T", "COMPARE_T", "QUESTION_T",
]
