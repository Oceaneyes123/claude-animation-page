// Timeline of "Ang Disyertong Gawa ng Ilog at Hangin" (La Paz Sand Dunes, Ilocos Norte):
// Exact 68.400 s (2052 frames @ 30 fps), snapped 0-3 frames before trigger words in video3/words.json.
// Camera grammar: continuous slow push-ins on every hold, symmetric smootherstep glides (18-40 f),
// hard cuts on big reframes, 7-frame flip kicks on impacts, thin-lens DOF on close-ups/mediums,
// and recognizable foreground framing props in ~1/3 of shots.
export const FPS = 30;
export const TOTAL = 2052;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// District origins (separated by >=240 m so scenes never collide)
export const Z_DUNES: V3      = [0, 0, 0];       // La Paz Sand Dunes meeting West Philippine Sea & Laoag coast
export const Z_STORM: V3      = [0, 0, -240];    // Rainy Laoag coastal street right beside towering sand dunes
export const Z_CONVEYOR: V3   = [240, 0, 0];     // Cordillera -> Padsan River sediment -> Ocean waves -> Wind dunes
export const Z_COAST_TOWN: V3 = [480, 0, 0];     // Suwerte: green Ilocos farms & fishermen with outrigger bancas
export const Z_FAN: V3        = [-240, 0, 0];    // Analogy: wooden porch table, spinning electric fan & sand pile

// Key story event times (seconds), snapped 0-3 frames before trigger words in video3/words.json
export const FLASH_AT = 165;        // 5.500s — right before "Ganito kasi yan." @ 5.56s
export const RAIN_T = 20.00;        // "malalakas na bagyo at ulan" @ 20.20s
export const RIVER_T = 24.08;       // "Padsan River" @ 24.18s
export const WAVE_T = 32.20;        // "alon" @ 32.30s
export const WIND_T = 44.72;        // "Amihan at Habagat" @ 44.82s
export const FAN_T = 51.14;         // "electric fan" @ 51.24s
export const PILE_T = 56.48;        // "itinutumpok" @ 56.58s
export const QUESTION_T = 67.12;    // "Kaya ang tanong..." @ 67.22s

export type Light = "day" | "golden";
export type District =
  | "hook"
  | "sahara"
  | "typhoon"
  | "conveyor"
  | "suwerte"
  | "malas"
  | "fan"
  | "living"
  | "loop";

export type ShotDef = { id: number; a: number; b: number; light: Light; district: District; sunAz?: number; sunEl?: number };

export const SHOTS: ShotDef[] = [
  { id: 1, a: 0,    b: 165,   light: "day",    district: "hook",     sunAz: 68,  sunEl: 46 },
  { id: 2, a: 165,  b: 432,   light: "day",    district: "sahara",   sunAz: 80,  sunEl: 48 },
  { id: 3, a: 432,  b: 684,   light: "day",    district: "typhoon",  sunAz: 65,  sunEl: 42 },
  { id: 4, a: 684,  b: 1020,  light: "day",    district: "conveyor", sunAz: 74,  sunEl: 48 },
  { id: 5, a: 1020, b: 1185,  light: "day",    district: "suwerte",  sunAz: 72,  sunEl: 48 },
  { id: 6, a: 1185, b: 1437,  light: "golden", district: "malas",    sunAz: 48,  sunEl: 16 },
  { id: 7, a: 1437, b: 1770,  light: "day",    district: "fan",      sunAz: 58,  sunEl: 52 },
  { id: 8, a: 1770, b: 2013,  light: "golden", district: "living",   sunAz: -42, sunEl: 15 },
  { id: 9, a: 2013, b: TOTAL, light: "day",    district: "loop",     sunAz: 70,  sunEl: 46 },
];

export const XFADE: Record<number, number> = { 3: 8, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8 };

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
// Shot 1 (Hook): Puzzled tourist with umbrella standing in the La Paz dunes -> tilt up to sweeping desert ridges
const S1a = (f: number) => dolly([1.8, 2.2, 13.5], [-0.2, 1.5, 4.0], pushK(f, 0, 0.0024), { fov: 40, roll: -0.03 });
const S1b = (f: number) => dolly([-4.0, 5.2, 18.0], [0.0, 4.0, -32.0], pushK(f, 78, 0.0026, 0.006, 30), { fov: 44, roll: 0.035 });

// Shot 2 (Sahara contrast): Aerial sweep over golden La Paz Sand Dunes meeting the turquoise sea & 4x4 jeepney
const S2a = (f: number) => dolly([-22.0, 16.0, 26.0], [0.0, 3.0, -18.0], pushK(f, 165, 0.0023), { fov: 45 });
const S2b = (f: number) => dolly([7.5, 3.2, 16.5], [-2.0, 2.2, -9.5], pushK(f, 270, 0.0024), { fov: 42, roll: -0.035 });

// Shot 3 (Typhoon puzzle): Rainy coastal Laoag street right next to dry sand dunes (Z_STORM)
const S3a = (f: number) => dolly([-3.5, 2.3, -225.0], [0.5, 2.2, -241.0], pushK(f, 428, 0.0023), { fov: 40, roll: 0.03 });
const S3b = (f: number) => dolly([7.0, 6.2, -221.0], [0.0, 4.0, -252.0], pushK(f, 540, 0.0025), { fov: 43 });

// Shot 4 (Padsan River + Ocean waves conveyor): Z_CONVEYOR
const S4a = (f: number) => dolly([240 + 4.5, 14.5, 34.0], [240 - 2.5, 2.0, -5.0], pushK(f, 680, 0.0023, 0.005, 30), { fov: 45, roll: -0.03 });
const S4b = (f: number) => dolly([240 + 6.0, 9.8, 29.5], [240 - 1.5, 1.5, 2.5], pushK(f, 915, 0.0025, 0.005, 28), { fov: 44, roll: 0.035 });

// Shot 5 (Suwerte — lush farms & bancas): Z_COAST_TOWN (at 480, 0, 0)
const S5a = (f: number) => dolly([480 - 2.2, 2.8, 16.0], [480 + 0.8, 1.6, -4.5], pushK(f, 1016, 0.0024), { fov: 42, roll: -0.03 });

// Shot 6 (Malas — Amihan/Habagat wind blowing dry beach sand inland, golden): Z_CONVEYOR
const S6a = (f: number) => dolly([240 - 6.0, 6.8, 22.0], [240 + 11.0, 3.2, -9.0], pushK(f, 1181, 0.0024, 0.006, 30), { fov: 44, roll: 0.035 });
const S6b = (f: number) => dolly([240 + 4.0, 8.2, 24.0], [240 + 13.0, 3.8, -12.0], pushK(f, 1320, 0.0024), { fov: 44, roll: -0.03 });

// Shot 7 (Analogy — Electric fan blowing dry sand into a mini dune hill on porch table): Z_FAN
const S7a = (f: number) => dolly([-240 + 1.8, 2.7, 12.2], [-240.0, 1.85, 0.0], pushK(f, 1433, 0.0022), { fov: 44 });
const S7b = (f: number) => dolly([-240 - 1.5, 2.8, 11.8], [-240.0, 1.85, 0.0], pushK(f, 1560, 0.0024, 0.005, 30), { fov: 44, roll: -0.035 });

// Shot 8 (Living, shifting La Paz Sand Dunes, golden): Z_DUNES
const S8a = (f: number) => dolly([15.0, 7.2, 21.0], [-2.0, 4.0, -18.0], pushK(f, 1766, 0.0025), { fov: 44, roll: 0.03 });

// Shot 9 (Loop Question — "Kaya ang tanong..."): Return to tourist with umbrella matching Shot 1's loop!
const S9a = (f: number) => dolly([-1.4, 2.2, 13.8], [0.2, 1.6, 4.0], pushK(f, 2009, 0.0028, 0.005, 28), { fov: 40, roll: -0.025 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 78, dur: 28, s: S1b }],
  2: [{ f: 165, s: S2a }, { f: 270, cut: true, s: S2b }],
  3: [{ f: 428, s: S3a }, { f: 540, dur: 28, s: S3b }],
  4: [{ f: 680, s: S4a }, { f: 915, dur: 30, s: S4b }],
  5: [{ f: 1016, s: S5a }],
  6: [{ f: 1181, s: S6a }, { f: 1320, dur: 28, s: S6b }],
  7: [{ f: 1433, s: S7a }, { f: 1560, dur: 26, s: S7b }],
  8: [{ f: 1766, s: S8a }],
  9: [{ f: 2009, s: S9a }],
};

// 7-frame impact kicks (flip sign every frame) on key dramatic hits
const KICKS: [number, number][] = [
  [RIVER_T, 0.55],
  [WAVE_T, 0.65],
  [WIND_T, 0.75],
  [FAN_T, 0.6],
  [PILE_T, 0.65],
  [QUESTION_T, 0.5],
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
  { f: 0, cInf: 13, focus: () => [-0.2, 1.5, 4.0] },
  { f: 78, dur: 28, cInf: 0 },
  { f: 270, cInf: 8, focus: () => [-1.5, 1.6, -8.0] },
  { f: 432, cInf: 10, focus: () => [0.5, 1.7, -241.0] },
  { f: 540, cInf: 0 },
  { f: 684, cInf: 0 },
  { f: 1020, cInf: 9, focus: () => [480.0, 1.6, -2.0] },
  { f: 1185, cInf: 6 },
  { f: 1437, cInf: 12, focus: () => [-240.0, 1.6, 0.0] },
  { f: 1770, cInf: 5 },
  { f: 2013, cInf: 13, focus: () => [0.2, 1.6, 4.0] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kind: "bush" | "crate" | "pot" | "cone"; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 0,    b: 78,   kind: "pot",  pos: [3.3, 0, 8.4],        s: 0.7,  yaw: 0.4 },
  { a: 432,  b: 540,  kind: "cone", pos: [2.6, 0, -230.2],     s: 0.65, yaw: 0.2 },
  { a: 1020, b: 1185, kind: "crate",pos: [480 + 2.8, 0, 8.5],  s: 0.72, yaw: 0.3 },
  { a: 1437, b: 1770, kind: "pot",  pos: [-240 - 2.7, 0, 4.6], s: 0.65, yaw: 0.5 },
];
