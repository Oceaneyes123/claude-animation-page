"""Generate shorts/03-lapaz/words.json from narration.wav via local faster-whisper (cached 'small' model)."""
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
    "Bakit nga ba may malawak na disyerto sa gitna ng maulan at laging binabagyong Ilocos Norte? "
    "Ganito kasi yan. Sa baybayin ng Laoag, may walumpu't limang kilometro kuwadradong buhanginang "
    "parang piraso ng Sahara—ang La Paz Sand Dunes. Padsan River, West Philippine Sea, "
    "Suwerte, Malas, Amihan, Habagat, electric fan, Ilocos, buhangin, kaya ang tanong."
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
