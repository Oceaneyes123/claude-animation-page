# Authoritative Tiwi timeline for audio synthesis (matches src/videos/tiwi/story.ts & shorts/09-tiwi/words.json).
import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_SHARED_AUDIO = os.path.join(_ROOT, "scripts", "audio")
if _SHARED_AUDIO not in sys.path:
    sys.path.insert(0, _SHARED_AUDIO)

from dsp import SR

FPS = 30
TOTAL_FRAMES = 1982
DUR = 66.044813  # exact duration of public/tiwi/voice.wav

BPM = 116.0
BEAT = 60.0 / BPM
BAR = 4.0 * BEAT

SHOTS = [
    (1, 0,    162,  "day",    "hook"),
    (2, 162,  384,  "day",    "plant_1979"),
    (3, 384,  735,  "day",    "wells_separator"),
    (4, 735,  912,  "day",    "pinwheel_analogy"),
    (5, 912,  1212, "golden", "turbine_coupled"),
    (6, 1212, 1395, "golden", "generator_inside"),
    (7, 1395, 1945, "day",    "energy_chain"),
    (8, 1945, 1982, "day",    "loop"),
]

XFADES = [a / FPS for (sid, a, _, _, _) in SHOTS if sid in (3, 4, 5, 6, 7, 8)]

HOOK_STEAM_T    = 3.16
FLASH_T         = 162 / FPS   # 5.400s
POWER_1979_T    = 7.96
PLANT_TIWI_T    = 10.26
WELL_DEEP_T     = 13.26
PIPE_FLOW_T     = 17.70
SEPARATE_T      = 20.76
STEAM_TURBINE_T = 22.52
PINWHEEL_IN_T   = 26.46
BLOW_SPIN_T     = 28.04
TURBINE_PUSH_T  = 33.50
GEN_COUPLE_T    = 37.62
MAGNET_SPIN_T   = 42.14
COIL_SPARK_T    = 44.82
CHAIN_HEAT_T    = 50.62
CHAIN_STEAM_T   = 53.30
CHAIN_GEN_T     = 56.14
CHAIN_GRID_T    = 58.74
BULB_LIGHT_T    = 63.34
QUESTION_T      = 65.02

__all__ = [
    "SR", "FPS", "TOTAL_FRAMES", "DUR", "BPM", "BEAT", "BAR", "SHOTS", "XFADES",
    "HOOK_STEAM_T", "FLASH_T", "POWER_1979_T", "PLANT_TIWI_T", "WELL_DEEP_T",
    "PIPE_FLOW_T", "SEPARATE_T", "STEAM_TURBINE_T", "PINWHEEL_IN_T", "BLOW_SPIN_T",
    "TURBINE_PUSH_T", "GEN_COUPLE_T", "MAGNET_SPIN_T", "COIL_SPARK_T",
    "CHAIN_HEAT_T", "CHAIN_STEAM_T", "CHAIN_GEN_T", "CHAIN_GRID_T",
    "BULB_LIGHT_T", "QUESTION_T",
]
