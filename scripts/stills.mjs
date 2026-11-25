// usage: node scripts/stills.mjs <outPrefix> <frame,frame,...> [scale] [compId]
import fs from "node:fs";
const tmpDir = process.env.REMOTION_TMP || "E:/remotion-tmp";
fs.mkdirSync(tmpDir, { recursive: true });
process.env.TEMP = process.env.TMP = tmpDir;
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [prefix, frames, scale = "0.5", compId = process.env.COMP_ID || "ShoeMartShort"] = process.argv.slice(2);
const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({
  entryPoint: path.resolve(process.env.BRIDGE_ENTRY || "src/index.ts"),
  publicDir: path.resolve("public"),
});
const composition = await selectComposition({ serveUrl, id: compId, browserExecutable, chromiumOptions });
const onBrowserLog = (l) => {
  if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300));
};
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({
    composition,
    serveUrl,
    frame: f,
    output: `${prefix}${f}.jpg`,
    imageFormat: "jpeg",
    jpegQuality: 88,
    scale: Number(scale),
    browserExecutable,
    chromiumOptions,
    timeoutInMilliseconds: 180000,
    onBrowserLog,
  });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
