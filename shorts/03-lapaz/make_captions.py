"""Generate src/videos/lapaz/captions.ts (1-2 word cues) from shorts/03-lapaz/words.json."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
WORDS_PATH = HERE / "words.json"
OUT_PATH = ROOT / "src" / "videos" / "lapaz" / "captions.ts"

raw = json.loads(WORDS_PATH.read_text(encoding="utf-8"))
words = raw["words"]

cues = []
i = 0
while i < len(words):
    w1 = words[i]
    t1 = w1["word"].strip()
    if i + 1 < len(words):
        w2 = words[i + 1]
        t2 = w2["word"].strip()
        gap = float(w2["start"]) - float(w1["end"])
        ends_punct = t1.endswith((".", "?", "!", "—", ","))
        combined = f"{t1} {t2}"
        if gap <= 0.22 and not ends_punct and len(combined) <= 15:
            cues.append({"start": round(float(w1["start"]), 3), "end": round(float(w2["end"]), 3), "text": combined})
            i += 2
            continue
    cues.append({"start": round(float(w1["start"]), 3), "end": round(float(w1["end"]), 3), "text": t1})
    i += 1

lines = [
    "// Auto-generated 1-2 word subtitle cues from shorts/03-lapaz/words.json",
    "export type CaptionCue = { start: number; end: number; text: string };",
    f"export const CAPTIONS: CaptionCue[] = {json.dumps(cues, indent=2, ensure_ascii=False)};",
    "",
]
OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {OUT_PATH} ({len(cues)} cues)")
