import timings from "../../../shorts/04-bolinao/words.json";

export type CaptionCue = { start: number; end: number; text: string };

const words = timings.words;
export const CAPTIONS: CaptionCue[] = [];

for (let index = 0; index < words.length; index++) {
  const current = words[index];
  const next = words[index + 1];
  const pair = next ? current.word + " " + next.word : "";
  if (next && pair.length <= 15 && !/[.!?,…:;]$/.test(current.word) && next.start - current.end <= 0.22) {
    CAPTIONS.push({ start: current.start, end: next.end, text: pair });
    index++;
  } else {
    CAPTIONS.push({ start: current.start, end: current.end, text: current.word });
  }
}
