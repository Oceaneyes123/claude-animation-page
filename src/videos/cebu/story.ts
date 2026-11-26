// Timeline of "Cebu City · Ang toreng bumagsak dahil sa lindol sa Bohol" (2013 Bohol M7.2 Earthquake & Basilica Bell Tower):
// Exact 61.000 s (1830 frames @ 30 fps, matching narration.wav 60.9915 s), snapped 0-3 frames before trigger words in shorts/07-cebu/words.json.
// Camera grammar: continuous slow push-ins on every hold, symmetric smootherstep glides,
// hard cuts on dramatic reframes, 7-frame flip kicks on key story beats, thin-lens DOF, and foreground framing props.
export const FPS = 30;
export const TOTAL = 1830;
export const CEBU_FRAMES = TOTAL;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// District origins (separated by >=240 m so worlds never collide)
export const Z_BASILICA: V3 = [0, 0, 0];       // Basilica del Santo Niño courtyard & coral-stone bell tower (Shots 1, 4, 9)
export const Z_STRAIT: V3   = [240, 0, 0];     // 3D relief map of Bohol (Chocolate Hills) -> Cebu Strait -> Cebu City (Shots 2, 3)
export const Z_TABLE: V3    = [-240, 0, 0];    // Sunlit workshop table ("mesa") + block tower ("tore ng mga bloke") analogy (Shot 5)
export const Z_FAULT: V3    = [0, 0, -240];    // Geological cutaway: Bohol underground fault slip + seismic waves across strait (Shot 6)
export const Z_INERTIA: V3  = [480, 0, 0];     // Golden-hour shake-table rig ("gumagalaw na patungan") showing top-heavy inertia (Shot 7)
export const Z_COMPARE: V3  = [-480, 0, 0];    // 3-pad comparison: bedrock vs soft soil vs braced structure (Shot 8)

// Key story event times (seconds), snapped 0-3 frames before trigger words in shorts/07-cebu/words.json
export const HOOK_SHAKE_T   = 2.76;   // "lindol" @ 2.84 s
export const FLASH_AT       = 144;    // 4.800 s — right before "Oktubre kinse," @ 4.94 s
export const BOHOL_SHOCK_T  = 8.90;   // "lindol" @ 8.98 s
export const MAG_PULSE_T    = 10.40;  // "pito punto dalawa" @ 10.48 s
export const CEBU_SHAKE_T   = 13.40;  // "yumanig" @ 13.48 s
export const BELL_SWAY_T    = 15.98;  // "bumagsak" @ 16.06 s
export const COLLAPSE_T     = 16.94;  // "kampanaryo" @ 17.02 s
export const BLOCKS_IN_T    = 22.10;  // "tore ng mga bloke" @ 22.18 s
export const TAP_T          = 24.58;  // "Tapikin mo" @ 24.66 s
export const TOWER_WOBBLE_T = 26.44;  // "manginig" @ 26.52 s
export const FAULT_SLIP_T   = 32.52;  // "gumagalaw" @ 32.60 s
export const FAULT_CRACK_T  = 33.80;  // "bitak" @ 33.88 s
export const WAVES_OUT_T    = 36.42;  // "kumakalat" @ 36.50 s
export const ACROSS_T       = 39.62;  // "Umabot" @ 39.70 s
export const BASE_JOLT_T    = 42.58;  // "biglang gumalaw" @ 42.66 s
export const TOP_LAG_T      = 44.94;  // "naiiwan" @ 45.02 s
export const STRESS_T       = 49.64;  // "puwersa" @ 49.72 s
export const SWAY_T         = 51.30;  // "umuuga" @ 51.38 s
export const COMPARE_T      = 55.88;  // "tindi ng pagyanig" @ 55.96 s
export const QUESTION_T     = 59.96;  // "Kaya ang tanong..." @ 60.04 s

export type Light = "day" | "golden";
export type District =
  | "hook"
  | "bohol_map"
  | "strait_cross"
  | "collapse"
  | "table_demo"
  | "fault_cutaway"
  | "inertia_rig"
  | "damage_compare"
  | "loop";

export type ShotDef = { id: number; a: number; b: number; light: Light; district: District; sunAz?: number; sunEl?: number };

export const SHOTS: ShotDef[] = [
  { id: 1, a: 0,    b: 144,   light: "day",    district: "hook",           sunAz: 68,  sunEl: 48 },
  { id: 2, a: 144,  b: 363,   light: "day",    district: "bohol_map",      sunAz: 76,  sunEl: 50 },
  { id: 3, a: 363,  b: 456,   light: "day",    district: "strait_cross",   sunAz: 72,  sunEl: 48 },
  { id: 4, a: 456,  b: 594,   light: "golden", district: "collapse",       sunAz: 118, sunEl: 22 },
  { id: 5, a: 594,  b: 948,   light: "day",    district: "table_demo",     sunAz: 74,  sunEl: 46 },
  { id: 6, a: 948,  b: 1269,  light: "day",    district: "fault_cutaway",  sunAz: 82,  sunEl: 48 },
  { id: 7, a: 1269, b: 1580,  light: "golden", district: "inertia_rig",    sunAz: 120, sunEl: 21 },
  { id: 8, a: 1580, b: 1796,  light: "day",    district: "damage_compare", sunAz: 70,  sunEl: 48 },
  { id: 9, a: 1796, b: TOTAL, light: "day",    district: "loop",           sunAz: 68,  sunEl: 48 },
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
// Shot 1 (Hook): Basilica del Santo Niño courtyard & coral-stone bell tower -> push toward belfry (keeping cross inside frame)
const S1a = (f: number) => dolly([-1.8, 3.3, 14.2], [1.6, 4.4, -7.2], pushK(f, 0, 0.0022), { fov: 42, roll: -0.025 });
const S1b = (f: number) => dolly([0.2, 4.2, 9.6], [2.4, 5.1, -7.2], pushK(f, 68, 0.0028, 0.005, 28), { fov: 40, roll: 0.025 });

// Shot 2 (Bohol M7.2 Epicenter Map): Elevated relief view of Bohol (Chocolate Hills) & Cebu Strait
const S2a = (f: number) => dolly([240 + 4.8, 10.4, 16.6], [240 + 2.0, 1.0, -1.0], pushK(f, 144, 0.0022), { fov: 44, roll: -0.025 });
const S2b = (f: number) => dolly([240 + 5.8, 8.2, 13.2], [240 + 4.2, 1.0, -0.5], pushK(f, 240, 0.0025, 0.005, 28), { fov: 41, roll: 0.02 });

// Shot 3 (Seismic Waves Crossing Strait): Glide left from Bohol Strait onto trembling Cebu City
const S3a = (f: number) => dolly([240 - 1.0, 7.0, 13.8], [240 - 4.8, 1.4, -0.8], pushK(f, 363, 0.0026, 0.005, 26), { fov: 42, roll: -0.025 });

// Shot 4 (Golden Collapse): Basilica belfry sways & upper tiers collapse into coral-stone rubble
const S4a = (f: number) => dolly([-2.4, 3.3, 12.6], [2.3, 4.8, -7.2], pushK(f, 452, 0.0024), { fov: 41, roll: 0.025 });
const S4b = (f: number) => dolly([-0.8, 3.0, 10.8], [2.6, 3.8, -6.8], pushK(f, 505, 0.0028, 0.006, 26), { fov: 42, roll: -0.03 });

// Shot 5 (Table & Block Tower Analogy): Full table view (mallet left + block tower right) -> push toward tower on wobble
const S5a = (f: number) => dolly([-240 - 0.1, 3.6, 15.6], [-240 + 0.0, 1.9, 0.0], pushK(f, 590, 0.0021), { fov: 44, roll: -0.02 });
const S5b = (f: number) => dolly([-240 - 0.3, 3.4, 14.6], [-240 + 0.0, 1.9, 0.0], pushK(f, 720, 0.0023), { fov: 44, roll: 0.022 });
const S5c = (f: number) => dolly([-240 + 1.0, 3.2, 12.2], [-240 + 1.4, 2.05, 0.0], pushK(f, 795, 0.0026, 0.005, 28), { fov: 42, roll: -0.025 });

// Shot 6 (Underground Fault Cutaway): Wide cross-section showing Cebu coast left, strait middle, Bohol fault right
const S6a = (f: number) => dolly([0.8, 5.0, -240 + 23.0], [-0.4, 2.3, -240.0], pushK(f, 944, 0.0022), { fov: 45, roll: 0.02 });
const S6b = (f: number) => dolly([-2.2, 5.2, -240 + 22.0], [-1.8, 2.5, -240.0], pushK(f, 1095, 0.0024, 0.005, 28), { fov: 45, roll: -0.025 });

// Shot 7 (Golden-hour Inertia Rig): Shake-table sliding base vs lagging heavy top tier + stress glow
const S7a = (f: number) => dolly([480 - 1.0, 3.0, 10.4], [480.0, 2.3, 0.0], pushK(f, 1265, 0.0023), { fov: 40, roll: -0.02 });
const S7b = (f: number) => dolly([480 + 0.9, 2.85, 8.6], [480.0, 2.4, 0.0], pushK(f, 1415, 0.0026, 0.005, 28), { fov: 39, roll: 0.025 });

// Shot 8 (Damage Comparison): Wide framing showing all 3 pads (bedrock left, soft soil middle, braced right) + cast
const S8a = (f: number) => dolly([-480 + 0.3, 4.0, 19.6], [-480.0, 2.1, 0.0], pushK(f, 1576, 0.0022), { fov: 45, roll: -0.02 });
const S8b = (f: number) => dolly([-480 - 0.2, 3.7, 17.8], [-480.0, 2.1, 0.0], pushK(f, 1690, 0.0026, 0.005, 26), { fov: 44, roll: 0.025 });

// Shot 9 (Loop back to Basilica): Match Shot 1 framing smoothly
const S9a = (f: number) => dolly([-1.8, 3.3, 14.2], [1.6, 4.4, -7.2], pushK(f, 1792, 0.0028, 0.005, 24), { fov: 42, roll: -0.025 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0,    s: S1a }, { f: 68,   dur: 28, s: S1b }],
  2: [{ f: 144,  s: S2a }, { f: 240,  dur: 34, s: S2b }],
  3: [{ f: 363,  s: S3a }],
  4: [{ f: 452,  s: S4a }, { f: 505,  dur: 26, s: S4b }],
  5: [{ f: 590,  s: S5a }, { f: 720,  dur: 28, s: S5b }, { f: 795, dur: 26, s: S5c }],
  6: [{ f: 944,  s: S6a }, { f: 1095, dur: 38, s: S6b }],
  7: [{ f: 1265, s: S7a }, { f: 1415, dur: 32, s: S7b }],
  8: [{ f: 1576, s: S8a }, { f: 1690, dur: 32, s: S8b }],
  9: [{ f: 1792, s: S9a }],
};

// 7-frame impact kicks (flip sign every frame) on key earthquake & physics beats
const KICKS: [number, number][] = [
  [HOOK_SHAKE_T, 0.55],
  [BOHOL_SHOCK_T, 0.65],
  [MAG_PULSE_T, 0.55],
  [CEBU_SHAKE_T, 0.65],
  [COLLAPSE_T, 0.85],
  [TAP_T, 0.55],
  [TOWER_WOBBLE_T, 0.55],
  [FAULT_SLIP_T, 0.70],
  [ACROSS_T, 0.55],
  [BASE_JOLT_T, 0.65],
  [STRESS_T, 0.55],
  [COMPARE_T, 0.55],
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
  { f: 0,    cInf: 7,  focus: () => [2.2, 4.2, -7.2] },
  { f: 68,   dur: 26, cInf: 10, focus: () => [2.6, 5.2, -7.2] },
  { f: 144,  cInf: 4,  focus: () => [244.6, 1.2, -0.5] },
  { f: 363,  dur: 24, cInf: 6, focus: () => [235.0, 1.4, -0.8] },
  { f: 456,  cInf: 9,  focus: () => [2.6, 4.4, -7.2] },
  { f: 594,  cInf: 11, focus: () => [-239.8, 1.9, 0.0] },
  { f: 795,  dur: 24, cInf: 13, focus: () => [-237.2, 2.1, 0.0] },
  { f: 948,  cInf: 8,  focus: () => [0.2, 2.2, -240.0] },
  { f: 1269, cInf: 12, focus: () => [480.0, 2.3, 0.0] },
  { f: 1580, cInf: 7,  focus: () => [-480.0, 2.1, 0.0] },
  { f: 1796, cInf: 7,  focus: () => [1.8, 4.1, -7.2] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kind: "crate" | "pot"; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 0,    b: 144,   kind: "pot",   pos: [-4.6, 0, 5.6],       s: 0.72, yaw: 0.3 },
  { a: 456,  b: 594,   kind: "pot",   pos: [4.6, 0, 4.8],        s: 0.70, yaw: -0.3 },
  { a: 594,  b: 948,   kind: "crate", pos: [-240 + 3.4, 0, 4.2], s: 0.68, yaw: -0.35 },
  { a: 1269, b: 1580,  kind: "crate", pos: [480 - 3.2, 0, 4.0],  s: 0.66, yaw: 0.3 },
  { a: 1796, b: TOTAL, kind: "pot",   pos: [-4.6, 0, 5.6],       s: 0.72, yaw: 0.3 },
];
