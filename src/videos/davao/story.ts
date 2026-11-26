// Timeline of "Davao City · Ang agilang naging ama" (Pag-asa & Mabuhay, Philippine Eagle Center):
// Exact 65.733 s (1972 frames @ 30 fps, matching narration.wav 65.715 s), snapped 0-3 frames before trigger words in shorts/06-davao/words.json.
// Camera grammar: continuous slow push-ins on every hold, symmetric smootherstep glides,
// hard cuts on dramatic reframes, 7-frame flip kicks on key story beats, thin-lens DOF, and foreground framing props.
export const FPS = 30;
export const TOTAL = 1972;
export const DAVAO_FRAMES = TOTAL;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// District origins (separated by >=240 m so worlds never collide)
export const Z_CENTER: V3   = [0, 0, 0];       // Philippine Eagle Center Malagos sanctuary pavilion & egg pedestal
export const Z_NEST1992: V3 = [240, 0, 0];     // 1992 hatchery nest table where Pag-asa hatched
export const Z_NURSERY: V3  = [-240, 0, 0];    // Botanical nursery ("punlaan"): seed -> tree -> second seed -> sapling
export const Z_NEST2013: V3 = [0, 0, -240];    // 2013 breeding aviary: Pag-asa & Kalinawan + Mabuhay's egg & hatch
export const Z_FOREST: V3   = [480, 0, 0];     // Expansive Mindanao dipterocarp rainforest canopy & soaring eagles

// Key story event times (seconds), snapped 0-3 frames before trigger words in shorts/06-davao/words.json
export const EGG_HOOK_T    = 3.85;   // "itlog" @ 3.92 s
export const FLASH_AT      = 204;    // 6.800 s — right before "Noong 1992," @ 6.92 s
export const HATCH_92_T    = 8.44;   // "napisa" @ 8.54 s
export const PAGASA_T      = 10.34;  // "Pag-asa." @ 10.44 s
export const CHICK_NEWS_T  = 21.10;  // "malaking balita" @ 21.20 s
export const MATCH_EGG_T   = 24.72;  // "itlog" @ 24.80 s (2013 match-cut egg)
export const SEED1_T       = 28.68;  // "puno sa punlaan" @ 28.76 s
export const SEED2_T       = 32.65;  // "bagong buto" @ 32.74 s
export const GEN2_T        = 34.76;  // "ikalawang henerasyon" @ 34.84 s
export const PARENTS_EGG_T = 40.86;  // "itlog sina Pag-asa" @ 40.94 s
export const HATCH_13_T    = 44.46;  // "napisa" @ 44.54 s
export const MABUHAY_T     = 45.70;  // "Mabuhay." @ 45.78 s
export const FOREST_WIDE_T = 56.25;  // "kagubatan" @ 56.34 s
export const LINK_T        = 60.45;  // "Magkaugnay" @ 60.52 s
export const QUESTION_T    = 64.88;  // "Kaya ang tanong..." @ 64.97 s

export type Light = "day" | "golden";
export type District =
  | "hook"
  | "hatch1992"
  | "team_joy"
  | "match_egg"
  | "nursery"
  | "parents"
  | "mabuhay"
  | "forest"
  | "unity_loop";

export type ShotDef = { id: number; a: number; b: number; light: Light; district: District; sunAz?: number; sunEl?: number };

export const SHOTS: ShotDef[] = [
  { id: 1, a: 0,    b: 204,   light: "day",    district: "hook",       sunAz: 66,  sunEl: 46 },
  { id: 2, a: 204,  b: 496,   light: "day",    district: "hatch1992",  sunAz: 78,  sunEl: 48 },
  { id: 3, a: 496,  b: 690,   light: "day",    district: "team_joy",   sunAz: 72,  sunEl: 46 },
  { id: 4, a: 690,  b: 852,   light: "golden", district: "match_egg",  sunAz: 120, sunEl: 22 },
  { id: 5, a: 852,  b: 1110,  light: "day",    district: "nursery",    sunAz: 88,  sunEl: 48 },
  { id: 6, a: 1110, b: 1290,  light: "day",    district: "parents",    sunAz: 74,  sunEl: 46 },
  { id: 7, a: 1290, b: 1555,  light: "golden", district: "mabuhay",    sunAz: 118, sunEl: 21 },
  { id: 8, a: 1555, b: 1812,  light: "day",    district: "forest",     sunAz: 68,  sunEl: 48 },
  { id: 9, a: 1812, b: TOTAL, light: "day",    district: "unity_loop", sunAz: 66,  sunEl: 46 },
];

export const XFADE: Record<number, number> = { 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8 };

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) {
      return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
    }
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };

const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3,
  look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;

const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};

const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

// ---- Shot framings ----
// Shot 1 (Hook): Philippine Eagle Center sanctuary pavilion & heroic egg on nest pedestal -> push into egg
const S1a = (f: number) => dolly([1.6, 2.35, 10.6], [0.0, 1.48, 0.0], pushK(f, 0, 0.0022), { fov: 40, roll: -0.025 });
const S1b = (f: number) => dolly([-0.45, 1.75, 4.35], [0.0, 1.45, 0.0], pushK(f, 105, 0.0028, 0.005, 28), { fov: 35, roll: 0.025 });

// Shot 2 (1992 Hatchery): 1992 egg in warm mossy cradle -> close hatch & reveal of fluffy chick Pag-asa
const S2a = (f: number) => dolly([240 + 0.85, 1.88, 4.35], [240.0, 1.42, 0.0], pushK(f, 204, 0.0024), { fov: 37, roll: -0.02 });
const S2b = (f: number) => dolly([240 - 1.15, 2.35, 6.8], [240.0, 1.50, -0.35], pushK(f, 310, 0.0024, 0.005, 28), { fov: 39, roll: 0.025 });

// Shot 3 (Breeding team joy): Pull back to full 1992 team celebrating around chick Pag-asa
const S3a = (f: number) => dolly([240 + 1.4, 2.75, 11.8], [240.2, 1.55, -0.5], pushK(f, 496, 0.0025, 0.005, 28), { fov: 43, roll: -0.025 });

// Shot 4 (Match-cut egg 2013): Same tight egg framing as S1b/S2a, golden-hour nest -> glide back to show adult Pag-asa
const S4a = (f: number) => dolly([-0.35, 1.82, -240 + 4.15], [0.0, 1.48, -240.0], pushK(f, 686, 0.0024), { fov: 35, roll: 0.02 });
const S4b = (f: number) => dolly([1.45, 2.45, -240 + 8.6], [0.0, 1.72, -240.2], pushK(f, 765, 0.0022, 0.004, 24), { fov: 40, roll: -0.025 });

// Shot 5 (Nursery "Punlaan" Analogy): Pot 1 seed -> tree -> drops 2nd seed -> Pot 2 sapling
const S5a = (f: number) => dolly([-240 - 1.1, 2.25, 7.8], [-240 - 0.65, 1.45, 0.0], pushK(f, 848, 0.0022), { fov: 40, roll: -0.02 });
const S5b = (f: number) => dolly([-240 + 0.9, 2.75, 10.6], [-240.0, 1.68, -0.2], pushK(f, 975, 0.0023, 0.005, 28), { fov: 42, roll: 0.025 });

// Shot 6 (Breeding Team + Pag-asa & Kalinawan): Keepers observing from wooden blind while Pag-asa & Kalinawan guard nest
const S6a = (f: number) => dolly([-2.1, 2.75, -240 + 11.2], [0.0, 1.68, -240.2], pushK(f, 1106, 0.0023), { fov: 42, roll: 0.02 });
const S6b = (f: number) => dolly([1.3, 2.35, -240 + 7.8], [0.0, 1.58, -240.0], pushK(f, 1210, 0.0025, 0.005, 26), { fov: 38, roll: -0.02 });

// Shot 7 (2013 Mabuhay Hatch - Golden Hour): Tight nest hatch -> reveal Mabuhay between Pag-asa & Kalinawan
const S7a = (f: number) => dolly([0.45, 1.92, -240 + 4.4], [0.0, 1.52, -240.0], pushK(f, 1286, 0.0023), { fov: 36, roll: -0.02 });
const S7b = (f: number) => dolly([-1.6, 2.65, -240 + 9.4], [0.0, 1.82, -240.3], pushK(f, 1415, 0.0021, 0.004, 28), { fov: 41, roll: 0.025 });

// Shot 8 (Mindanao Forest Canopy): Wide soaring glide over deep green dipterocarp forest & eagles in flight
const S8a = (f: number) => dolly([480 - 2.4, 7.6, 17.5], [480.0, 4.6, -7.0], pushK(f, 1551, 0.0020), { fov: 44, roll: -0.025 });
const S8b = (f: number) => dolly([480 + 2.4, 11.8, 22.0], [480.0, 6.0, -13.0], pushK(f, 1650, 0.0022, 0.004, 30), { fov: 45, roll: 0.025 });

// Shot 9 (Unity & Loop): Center pavilion + keepers + forest ridge + soaring eagle -> gentle push back to match Shot 1
const S9a = (f: number) => dolly([-2.4, 3.35, 13.4], [0.0, 1.75, -1.5], pushK(f, 1808, 0.0022), { fov: 42, roll: 0.02 });
const S9b = (f: number) => dolly([1.4, 2.35, 10.2], [0.0, 1.52, 0.0], pushK(f, 1905, 0.0028, 0.005, 28), { fov: 40, roll: -0.025 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0,    s: S1a }, { f: 105,  dur: 30, s: S1b }],
  2: [{ f: 204,  s: S2a }, { f: 310,  dur: 28, s: S2b }],
  3: [{ f: 496,  s: S3a }],
  4: [{ f: 686,  s: S4a }, { f: 765,  dur: 32, s: S4b }],
  5: [{ f: 848,  s: S5a }, { f: 975,  dur: 32, s: S5b }],
  6: [{ f: 1106, s: S6a }, { f: 1210, dur: 26, s: S6b }],
  7: [{ f: 1286, s: S7a }, { f: 1415, dur: 34, s: S7b }],
  8: [{ f: 1551, s: S8a }, { f: 1650, dur: 45, s: S8b }],
  9: [{ f: 1808, s: S9a }, { f: 1905, dur: 32, s: S9b }],
};

// 7-frame impact kicks (flip sign every frame) on key story beats
const KICKS: [number, number][] = [
  [HATCH_92_T, 0.55],
  [CHICK_NEWS_T, 0.55],
  [MATCH_EGG_T, 0.50],
  [SEED2_T, 0.50],
  [HATCH_13_T, 0.60],
  [FOREST_WIDE_T, 0.50],
  [QUESTION_T, 0.50],
];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};

export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens: depth of field + foreground framing ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0,    cInf: 11, focus: () => [0.0, 1.48, 0.0] },
  { f: 105,  dur: 28, cInf: 14, focus: () => [0.0, 1.45, 0.0] },
  { f: 204,  cInf: 14, focus: () => [240.0, 1.42, 0.0] },
  { f: 310,  dur: 26, cInf: 10, focus: () => [240.0, 1.50, 0.0] },
  { f: 496,  cInf: 8,  focus: () => [240.0, 1.55, -0.3] },
  { f: 690,  cInf: 15, focus: () => [0.0, 1.48, -240.0] },
  { f: 765,  dur: 30, cInf: 10, focus: () => [0.0, 1.68, -240.1] },
  { f: 852,  cInf: 11, focus: () => [-240.6, 1.42, 0.0] },
  { f: 975,  dur: 28, cInf: 9, focus: () => [-239.8, 1.55, 0.0] },
  { f: 1110, cInf: 9,  focus: () => [0.0, 1.65, -240.1] },
  { f: 1290, cInf: 14, focus: () => [0.0, 1.52, -240.0] },
  { f: 1415, dur: 30, cInf: 8, focus: () => [0.0, 1.75, -240.2] },
  { f: 1555, cInf: 2,  focus: () => [480.0, 3.0, -4.0] },
  { f: 1675, dur: 32, cInf: 0 },
  { f: 1812, cInf: 8,  focus: () => [0.0, 1.65, -0.5] },
  { f: 1905, dur: 28, cInf: 11, focus: () => [0.0, 1.48, 0.0] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kind: "crate" | "pot"; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 0,    b: 204,   kind: "pot",   pos: [2.7, 0, 4.9],         s: 0.68, yaw: 0.4 },
  { a: 496,  b: 690,   kind: "crate", pos: [240 + 3.2, 0, 5.2],   s: 0.68, yaw: -0.3 },
  { a: 852,  b: 1110,  kind: "pot",   pos: [-240 - 2.6, 0, 4.4],  s: 0.66, yaw: 0.35 },
  { a: 1110, b: 1290,  kind: "crate", pos: [-3.1, 0, -240 + 5.6], s: 0.66, yaw: 0.3 },
  { a: 1812, b: TOTAL, kind: "pot",   pos: [2.6, 0, 5.0],         s: 0.66, yaw: 0.4 },
];
