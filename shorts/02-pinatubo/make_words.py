"""Generate shorts/02-pinatubo/words.json from narration.wav via local faster-whisper (cached 'small' model)."""
import json
import wave
from pathlib import Path
from faster_whisper import WhisperModel

HERE = Path(__file__).resolve().parent
WAV = HERE / "narration.wav"
OUT = HERE / "words.json"

with wave.open(str(WAV), "rb") as w:
    dur = round(w.getnframes() / w.getframerate(), 3)

prompt = (
    "Bakit nga ba gininaw ang buong planeta noong 1991 dahil lang sa isang pagsabog sa Zambales? "
    "Ganito kasi yan. Limandaang taon nang natutulog ang Mount Pinatubo. "
    "Pero noong Abril 1991, biglang umusok ang tuktok nito. Hunyo 15, sulfur dioxide, stratosphere. "
    "Suwerte, Malas, Earth, sunshade, windshield, degree Celsius, NASA, USGS, climate model."
)

model = WhisperModel("small", device="cpu", compute_type="int8")
segments, info = model.transcribe(
    str(WAV),
    language="tl",
    word_timestamps=True,
    initial_prompt=prompt,
    vad_filter=False,
)

words = []
texts = []
for seg in segments:
    texts.append(seg.text.strip())
    for w in seg.words or []:
        tok = w.word.strip()
        if tok:
            words.append({"word": tok, "start": round(float(w.start), 3), "end": round(float(w.end), 3)})

out = {"text": " ".join(texts).strip(), "duration": dur, "words": words}
OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {OUT} ({len(words)} words, {dur:.3f}s)")
