// Timeline of "Tiwi · Ang singaw na nagpaikot ng generator" (Tiwi Geothermal Power Plant, Albay 1979):
// Exact 66.067 s (1982 frames @ 30 fps, matching narration.wav 66.0448 s), snapped 0-3 frames before trigger words in shorts/09-tiwi/words.json.
// Camera grammar: continuous slow push-ins on every hold, symmetric smootherstep glides,
// hard cuts on dramatic reframes, 7-frame flip kicks on key story beats, thin-lens DOF, and foreground framing props.
export const FPS = 30;
export const TOTAL = 1982;
export const TIWI_FRAMES = TOTAL;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// District origins (separated by >=240 m so worlds never collide)
export const Z_HOOK: V3     = [0, 0, 0];          // Tiwi cutaway hill + 1979 geothermal plant + cooling tower (Shots 1, 2, 8)
export const Z_WELLS: V3    = [240, 0, 0];        // Deep underground heat + well casing + cyclone separator (Shot 3)
export const Z_PINWHEEL: V3 = [-240, 0, 0];       // Sunlit Tiwi plaza wooden table + toy pinwheel ("laruang elisi") analogy (Shot 4)
export const Z_TURBINE: V3  = [0, 0, -240];       // Golden-hour high-pressure steam nozzle + spinning turbine + coupled generator (Shot 5)
export const Z_GEN: V3      = [240, 0, -240];     // Golden-hour generator cutaway: spinning magnet + copper coils + electric pulses (Shot 6)
export const Z_CHAIN: V3    = [-240, 0, -240];    // Full energy chain diorama: magma -> steam -> turbine -> generator -> lightbulb (Shot 7)

// Key story event times (seconds), snapped 0-3 frames before trigger words in shorts/09-tiwi/words.json
export const HOOK_STEAM_T    = 3.16;   // "singaw mula sa ilalim ng lupa?" @ 3.24 s
export const FLASH_AT        = 162;    // 5.400 s — right before "Noong 1979" @ 5.44 s
export const POWER_1979_T    = 7.96;   // "kuryente" @ 8.04 s
export const PLANT_TIWI_T    = 10.26;  // "geothermal plant sa Tiwi, Albay" @ 10.34 s
export const WELL_DEEP_T     = 13.26;  // "balong umaabot sa mainit na bahagi" @ 13.34 s
export const PIPE_FLOW_T     = 17.70;  // "dinadala sa planta ang likido at singaw" @ 17.78 s
export const SEPARATE_T      = 20.76;  // "Paghiwalayin ang dalawa" @ 20.84 s
export const STEAM_TURBINE_T = 22.52;  // "singaw ang papasok sa turbine" @ 22.60 s
export const PINWHEEL_IN_T   = 26.46;  // "laruang elisi" @ 26.54 s
export const BLOW_SPIN_T     = 28.04;  // "hinipan mo, umiikot ito" @ 28.12 s
export const TURBINE_PUSH_T  = 33.50;  // "tumutulak sa mga talim ng turbine" @ 33.58 s
export const GEN_COUPLE_T    = 37.62;  // "iikot din ang nakakabit na generator" @ 37.70 s
export const MAGNET_SPIN_T   = 42.14;  // "paggalaw ng magnet" @ 42.22 s
export const COIL_SPARK_T    = 44.82;  // "lumilikha ng kuryente" @ 44.90 s
export const CHAIN_HEAT_T    = 50.62;  // "init na nasa ilalim ng lupa" @ 50.70 s
export const CHAIN_STEAM_T   = 53.30;  // "singaw ang enerhiya patungo sa mga talim" @ 53.38 s
export const CHAIN_GEN_T     = 56.14;  // "pag-ikot ang nagpatakbo sa generator" @ 56.22 s
export const CHAIN_GRID_T    = 58.74;  // "kuryente sa labas ng planta" @ 58.82 s
export const BULB_LIGHT_T    = 63.34;  // "makailaw ang bumbilya" @ 63.42 s
export const QUESTION_T      = 65.02;  // "Kaya ang tanong..." @ 65.10 s

export type Light = "day" | "golden";
export type District =
  | "hook"
  | "plant_1979"
  | "wells_separator"
  | "pinwheel_analogy"
  | "turbine_coupled"
  | "generator_inside"
  | "energy_chain"
  | "loop";

export type ShotDef = { id: number; a: number; b: number; light: Light; district: District; sunAz?: number; sunEl?: number };

export const SHOTS: ShotDef[] = [
  { id: 1, a: 0,    b: 162,   light: "day",    district: "hook",             sunAz: 70,  sunEl: 48 },
  { id: 2, a: 162,  b: 384,   light: "day",    district: "plant_1979",       sunAz: 76,  sunEl: 50 },
  { id: 3, a: 384,  b: 735,   light: "day",    district: "wells_separator",  sunAz: 72,  sunEl: 46 },
  { id: 4, a: 735,  b: 912,   light: "day",    district: "pinwheel_analogy", sunAz: 74,  sunEl: 48 },
  { id: 5, a: 912,  b: 1212,  light: "golden", district: "turbine_coupled",  sunAz: 118, sunEl: 21 },
  { id: 6, a: 1212, b: 1395,  light: "golden", district: "generator_inside", sunAz: 116, sunEl: 20 },
  { id: 7, a: 1395, b: 1945,  light: "day",    district: "energy_chain",     sunAz: 72,  sunEl: 49 },
  { id: 8, a: 1945, b: TOTAL, light: "day",    district: "loop",             sunAz: 70,  sunEl: 48 },
];

export const XFADE: Record<number, number> = { 3: 8, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8 };

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
// Shot 1 (Hook): Tiwi geothermal cutaway hill + steam plume rising to turbine & glowing power pole
const S1a = (f: number) => dolly([0.8, 5.5, 17.6], [0.2, 2.7, -3.5], pushK(f, 0, 0.0021), { fov: 46, roll: -0.022 });
const S1b = (f: number) => dolly([0.2, 4.9, 15.0], [0.2, 2.8, -3.7], pushK(f, 92, 0.0026, 0.005, 26), { fov: 45, roll: 0.024 });

// Shot 2 (1979 Tiwi, Albay Geothermal Plant): Wide establishing view with green hills, volcano & energized pylon
const S2a = (f: number) => dolly([2.2, 7.2, 18.6], [0.2, 2.6, -3.8], pushK(f, 162, 0.0021), { fov: 46, roll: -0.02 });
const S2b = (f: number) => dolly([-0.8, 5.6, 15.4], [0.4, 2.8, -3.8], pushK(f, 270, 0.0025, 0.005, 28), { fov: 44, roll: 0.022 });

// Shot 3 (Wells, Underground Heat & Steam Separator): Deep hot rock -> rising liquid+steam -> cyclone separator split
const S3a = (f: number) => dolly([240 - 1.8, 3.0, 10.6], [240 - 1.5, 2.1, -2.0], pushK(f, 380, 0.0021), { fov: 43, roll: -0.02 });
const S3b = (f: number) => dolly([240 + 0.1, 3.4, 11.4], [240 + 0.0, 2.5, -2.0], pushK(f, 510, 0.0024, 0.005, 26), { fov: 43, roll: 0.02 });
const S3c = (f: number) => dolly([240 + 1.5, 3.5, 10.6], [240 + 1.3, 2.7, -2.0], pushK(f, 620, 0.0026, 0.005, 28), { fov: 42, roll: -0.022 });

// Shot 4 (Analogy: Toy Pinwheel / "laruang elisi"): Sunlit table + teacher & kid blowing pinwheel into rapid spin
const S4a = (f: number) => dolly([-240 - 0.1, 3.1, 9.6], [-240 + 0.1, 1.9, -0.3], pushK(f, 731, 0.0021), { fov: 42, roll: 0.02 });
const S4b = (f: number) => dolly([-240 + 0.2, 2.8, 8.4], [-240 + 0.15, 2.0, -0.2], pushK(f, 835, 0.0026, 0.005, 26), { fov: 41, roll: -0.024 });

// Shot 5 (Golden Turbine + Coupled Generator): High-pressure steam nozzle pushing turbine blades -> coupled generator spins
const S5a = (f: number) => dolly([-0.6, 3.4, -240 + 11.6], [0.2, 2.1, -240 - 0.3], pushK(f, 908, 0.0022), { fov: 44, roll: -0.022 });
const S5b = (f: number) => dolly([0.8, 3.3, -240 + 11.2], [0.75, 2.1, -240 - 0.3], pushK(f, 1105, 0.0026, 0.005, 28), { fov: 43, roll: 0.024 });

// Shot 6 (Golden Inside Generator): Close-up cutaway of spinning magnet inside copper coils creating electricity
const S6a = (f: number) => dolly([240 + 0.3, 3.0, -240 + 9.2], [240 + 0.6, 2.1, -240 - 0.2], pushK(f, 1208, 0.0022), { fov: 43, roll: 0.022 });
const S6b = (f: number) => dolly([240 + 0.8, 2.8, -240 + 8.4], [240 + 0.8, 2.1, -240 - 0.2], pushK(f, 1330, 0.0026, 0.005, 26), { fov: 42, roll: -0.024 });

// Shot 7 (Full Energy Chain -> Lightbulb): Overview -> underground heat -> steam/turbine -> generator/grid -> glowing house bulb
const S7a = (f: number) => dolly([-240 + 0.0, 4.9, -240 + 17.6], [-240 + 0.0, 2.2, -240 - 1.0], pushK(f, 1391, 0.0021), { fov: 46, roll: -0.02 });
const S7b = (f: number) => dolly([-240 - 4.4, 3.0, -240 + 9.6], [-240 - 4.4, 1.8, -240 - 1.0], pushK(f, 1510, 0.0024, 0.005, 26), { fov: 42, roll: 0.022 });
const S7c = (f: number) => dolly([-240 - 1.2, 3.2, -240 + 9.8], [-240 - 1.2, 2.2, -240 - 1.0], pushK(f, 1595, 0.0024, 0.005, 26), { fov: 42, roll: -0.022 });
const S7d = (f: number) => dolly([-240 + 2.4, 3.4, -240 + 10.2], [-240 + 2.4, 2.3, -240 - 1.0], pushK(f, 1680, 0.0024, 0.005, 26), { fov: 42, roll: 0.022 });
const S7e = (f: number) => dolly([-240 + 4.4, 3.1, -240 + 10.6], [-240 + 4.4, 2.2, -240 - 0.5], pushK(f, 1820, 0.0026, 0.005, 28), { fov: 43, roll: -0.024 });

// Shot 8 (Loop back to Hook): Match Shot 1 framing smoothly
const S8a = (f: number) => dolly([0.8, 5.5, 17.6], [0.2, 2.7, -3.5], pushK(f, 1941, 0.0025, 0.005, 22), { fov: 46, roll: -0.022 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0,    s: S1a }, { f: 92,   dur: 28, s: S1b }],
  2: [{ f: 162,  s: S2a }, { f: 270,  dur: 34, s: S2b }],
  3: [{ f: 380,  s: S3a }, { f: 510,  dur: 32, s: S3b }, { f: 620, dur: 32, s: S3c }],
  4: [{ f: 731,  s: S4a }, { f: 835,  dur: 26, s: S4b }],
  5: [{ f: 908,  s: S5a }, { f: 1105, dur: 32, s: S5b }],
  6: [{ f: 1208, s: S6a }, { f: 1330, dur: 26, s: S6b }],
  7: [
    { f: 1391, s: S7a },
    { f: 1510, dur: 30, s: S7b },
    { f: 1595, dur: 30, s: S7c },
    { f: 1680, dur: 32, s: S7d },
    { f: 1820, dur: 32, s: S7e },
  ],
  8: [{ f: 1941, s: S8a }],
};

// 7-frame impact kicks (flip sign every frame) on key story & physics beats
const KICKS: [number, number][] = [
  [HOOK_STEAM_T, 0.55],
  [POWER_1979_T, 0.50],
  [WELL_DEEP_T, 0.48],
  [SEPARATE_T, 0.52],
  [BLOW_SPIN_T, 0.55],
  [TURBINE_PUSH_T, 0.62],
  [GEN_COUPLE_T, 0.55],
  [MAGNET_SPIN_T, 0.52],
  [COIL_SPARK_T, 0.60],
  [CHAIN_HEAT_T, 0.48],
  [CHAIN_STEAM_T, 0.50],
  [CHAIN_GEN_T, 0.52],
  [BULB_LIGHT_T, 0.65],
  [QUESTION_T, 0.45],
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
  { f: 0,    cInf: 7,  focus: () => [0.0, 2.5, -3.2] },
  { f: 92,   dur: 24, cInf: 10, focus: () => [-0.8, 2.6, -3.5] },
  { f: 162,  cInf: 0,  focus: () => [0.0, 2.5, -4.0] },
  { f: 384,  dur: 24, cInf: 10, focus: () => [240 - 1.5, 2.0, -2.0] },
  { f: 620,  dur: 24, cInf: 10, focus: () => [240 + 1.3, 2.7, -2.0] },
  { f: 735,  dur: 20, cInf: 12, focus: () => [-240 + 0.2, 2.0, 0.0] },
  { f: 912,  cInf: 10, focus: () => [-0.4, 2.2, -240 - 0.3] },
  { f: 1105, dur: 26, cInf: 10, focus: () => [0.8, 2.2, -240 - 0.3] },
  { f: 1212, cInf: 13, focus: () => [240 + 0.2, 2.1, -240 - 0.1] },
  { f: 1395, cInf: 0,  focus: () => [-240.0, 2.2, -240 - 1.0] },
  { f: 1510, dur: 24, cInf: 9,  focus: () => [-240 - 4.6, 1.8, -240 - 1.0] },
  { f: 1820, dur: 26, cInf: 11, focus: () => [-240 + 5.2, 2.3, -240 - 0.7] },
  { f: 1945, cInf: 7,  focus: () => [0.0, 2.5, -3.2] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kind: "crate" | "pot"; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 0,    b: 162,   kind: "pot",   pos: [3.4, 0, 5.8],            s: 0.72, yaw: -0.3 },
  { a: 384,  b: 735,   kind: "crate", pos: [240 - 3.2, 0, 3.8],      s: 0.68, yaw: 0.28 },
  { a: 735,  b: 912,   kind: "pot",   pos: [-240 + 3.0, 0, 3.2],     s: 0.66, yaw: -0.25 },
  { a: 912,  b: 1212,  kind: "crate", pos: [-3.3, 0, -240 + 3.8],    s: 0.68, yaw: 0.3 },
  { a: 1395, b: 1945,  kind: "pot",   pos: [-240 + 4.4, 0, -240 + 6.4], s: 0.72, yaw: -0.2 },
  { a: 1945, b: TOTAL, kind: "pot",   pos: [3.4, 0, 5.8],            s: 0.72, yaw: -0.3 },
];
