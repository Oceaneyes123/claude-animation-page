import fs from "node:fs";
const tmpDir = process.env.REMOTION_TMP || "E:/remotion-tmp";
fs.mkdirSync(tmpDir, { recursive: true });
process.env.TEMP = process.env.TMP = tmpDir;

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";

const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };
const scale = 4 / 3;
console.log("Target dims:", 1080 * scale, 1920 * scale);

const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  publicDir: path.resolve("public"),
  onProgress: (p) => { if (p % 25 === 0) console.log("Bundle", p + "%"); },
});

const [compId = "ShoeMartShort", outPath = "out/shoemart/video.mp4"] = process.argv.slice(2);

const composition = await selectComposition({
  serveUrl,
  id: compId,
  browserExecutable,
  chromiumOptions,
});

let lastPct = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  crf: 16,
  scale,
  outputLocation: outPath,
  browserExecutable,
  chromiumOptions,
  timeoutInMilliseconds: 180000,
  onProgress: ({ progress, renderedFrames, encodedFrames }) => {
    const pct = Math.floor(progress * 20) * 5;
    if (pct !== lastPct) {
      lastPct = pct;
      console.log(`Progress ${pct}% (rendered ${renderedFrames}, encoded ${encodedFrames})`);
    }
  },
});
console.log("Rendered", outPath);
