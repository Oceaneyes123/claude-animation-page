// Timeline of "Ang Bulkang Nagpalamig sa Buong Mundo" (Mount Pinatubo, 1991):
// Exact 69.000 s (2070 frames @ 30 fps), snapped 0-3 frames before trigger words in video2/words.json.
// Keeps the bridge short's camera grammar: continuous slow push-ins on every hold, symmetric smootherstep
// glides (18-40 f), hard cuts on big reframes, 7-frame flip kicks on impacts, thin-lens DOF on close-ups/mediums,
// and recognizable foreground framing props in ~1/3 of shots.
export const FPS = 30;
export const TOTAL = 2070;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// District origins (separated by >=240 m so eras/scales never collide)
export const Z_ZAMBALES: V3 = [0, 0, 0];       // Zambales valley town + Mount Pinatubo at (0, 0, -95)
export const Z_STRAT: V3    = [240, 0, 0];     // Atmospheric cross-section: valley + rainclouds + dry stratosphere
export const Z_GLOBE: V3    = [240, 0, -240];  // Spinning Earth globe + expanding aerosol veil + thermometer
export const Z_CAR: V3      = [-240, 0, 0];    // Parked car + unfolding silver sunshade + bouncing sunbeams
export const Z_LAB: V3      = [0, 0, -240];    // NASA/USGS observatory + climate curve + Pinatubo Earth-umbrella finale

// Key story event times (seconds), snapped to video2/words.json
export const SMOKE_T = 16.38;     // "umusok" @ 16.48s
export const ERUPT_T = 19.90;     // "sumabog" @ 20.00s
export const PLUME_HIGH_T = 24.90;// "lampas sa mga ulap" @ 25.02s
export const SPREAD_T = 40.20;    // "kumalat" @ 41.68s
export const SUNSHADE_T = 49.20;  // "sunshade" @ 49.30s
export const COOL_T = 56.10;      // "bumagsak ang temperatura" @ 55.80s
export const UMBRELLA_T = 67.18;  // "payong" @ 67.28s

export type Light = "day" | "golden";
export type District =
  | "hook"
  | "dormant"
  | "smoke"
  | "eruption"
  | "suwerte"
  | "malas"
  | "sunshade"
  | "cooling"
  | "observatory";

export type ShotDef = { id: number; a: number; b: number; light: Light; district: District; sunAz?: number; sunEl?: number };

export const SHOTS: ShotDef[] = [
  { id: 1, a: 0,    b: 174,  light: "day",    district: "hook",        sunAz: 68,  sunEl: 46 },
  { id: 2, a: 174,  b: 414,  light: "day",    district: "dormant",     sunAz: 85,  sunEl: 48 },
  { id: 3, a: 414,  b: 585,  light: "day",    district: "smoke",       sunAz: 65,  sunEl: 44 },
  { id: 4, a: 585,  b: 930,  light: "golden", district: "eruption",    sunAz: 10,  sunEl: 9  },
  { id: 5, a: 930,  b: 1149, light: "day",    district: "suwerte",     sunAz: 72,  sunEl: 48 },
  { id: 6, a: 1149, b: 1335, light: "golden", district: "malas",       sunAz: -12, sunEl: 10 },
  { id: 7, a: 1335, b: 1659, light: "day",    district: "sunshade",    sunAz: 55,  sunEl: 54 },
  { id: 8, a: 1659, b: 1821, light: "day",    district: "cooling",     sunAz: 78,  sunEl: 46 },
  { id: 9, a: 1821, b: TOTAL,light: "day",    district: "observatory", sunAz: 70,  sunEl: 48 },
];

export const XFADE: Record<number, number> = { 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8 };
export const FLASH_AT = 174;

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
// Shot 1 (Hook): Chilly shivering townsfolk in Zambales plaza -> pan/push toward looming Mount Pinatubo
const S1a = (f: number) => dolly([1.8, 2.0, 14.2], [-0.4, 1.5, 4.0], pushK(f, 0, 0.0024), { fov: 40, roll: -0.03 });
const S1b = (f: number) => dolly([0.0, 3.6, 17.0], [0.0, 11.0, -45.0], pushK(f, 82, 0.0026, 0.006, 30), { fov: 44, roll: 0.035 });

// Shot 2 (Dormant 500 years): Lush green Pinatubo aerial -> peaceful Zambales valley street & jeepney
const S2a = (f: number) => dolly([-22.0, 20.0, 28.0], [0.0, 15.0, -82.0], pushK(f, 174, 0.0022), { fov: 44 });
const S2b = (f: number) => dolly([5.2, 2.3, 14.5], [-1.2, 2.2, -16.0], pushK(f, 275, 0.0024), { fov: 38, roll: -0.035 });

// Shot 3 (April 1991 smoke): Geologist noticing summit -> push toward smoking crater rim
const S3a = (f: number) => dolly([-4.2, 2.0, 11.2], [0.5, 3.8, -18.0], pushK(f, 414, 0.0023), { fov: 40, roll: 0.03 });
const S3b = (f: number) => dolly([12.0, 26.0, -34.0], [0.0, 36.0, -95.0], pushK(f, 490, 0.0026, 0.005, 30), { fov: 42 });

// Shot 4 (June 15 Climactic Eruption, golden): Wide base -> tilt UP with 40 km plume punching above cloud deck
const S4a = (f: number) => dolly([18.0, 5.2, 22.0], [0.0, 22.0, -95.0], pushK(f, 581, 0.0022, 0.006, 32), { fov: 46, roll: -0.04 });
const S4b = (f: number) => dolly([28.0, 34.0, 12.0], [0.0, 44.0, -95.0], pushK(f, 680, 0.0022), { fov: 46 });
const S4c = (f: number) => dolly([-24.0, 54.0, -2.0], [0.0, 54.0, -95.0], pushK(f, 790, 0.0024), { fov: 44, roll: 0.035 });

// Shot 5 (Suwerte — rain below clouds, dry SO2 above): Atmospheric cross-section at Z_STRAT
const S5a = (f: number) => dolly([240 - 4.0, 10.2, 36.0], [240.0, 9.5, 0.0], pushK(f, 926, 0.0022), { fov: 44 });
const S5b = (f: number) => dolly([240 + 6.0, 13.5, 34.0], [240.0, 11.8, 0.0], pushK(f, 1018, 0.0024, 0.005, 28), { fov: 42, roll: -0.03 });

// Shot 6 (Malas — aerosol spreads around Earth, golden): Spinning Earth globe at Z_GLOBE
const S6a = (f: number) => dolly([240 + 8.0, 13.0, -200.0], [240.0, 11.2, -240.0], pushK(f, 1145, 0.0022), { fov: 44, roll: 0.035 });
const S6b = (f: number) => dolly([240 - 10.0, 14.5, -198.0], [240.0, 11.2, -240.0], pushK(f, 1245, 0.0025), { fov: 44, roll: -0.03 });

// Shot 7 (Analogy — Parked car + silver sunshade bouncing sunlight): Z_CAR
const S7a = (f: number) => dolly([-240 + 4.8, 2.2, 11.5], [-240 - 0.6, 1.5, 0.2], pushK(f, 1331, 0.0022), { fov: 40 });
const S7b = (f: number) => dolly([-240 - 3.6, 2.7, 11.8], [-240 - 0.4, 2.0, 0.2], pushK(f, 1465, 0.0024, 0.005, 30), { fov: 42, roll: -0.035 });

// Shot 8 (Global cooling -0.5°C): Back to Z_GLOBE + thermometer drop
const S8a = (f: number) => dolly([240 + 5.0, 12.0, -195.0], [240 + 3.2, 11.2, -240.0], pushK(f, 1655, 0.0025, 0.005, 30), { fov: 44, roll: 0.03 });

// Shot 9 (NASA/USGS Observatory + Pinatubo Earth-Umbrella Finale): Z_LAB
const S9a = (f: number) => dolly([-0.4, 2.0, -225.0], [1.4, 2.1, -246.0], pushK(f, 1817, 0.0022), { fov: 42, roll: -0.025 });
const CRANE: V3[] = [[14, 10, -214], [22, 18, -200], [0, 7.5, -246]];
const S9b = (f: number): Shot => {
  const a = S9a(1940), s = glide((f - 1940) / 130), r = 1 - s, [C, B, L] = CRANE;
  return {
    pos: [0, 1, 2].map((i) => r * r * a.pos[i] + 2 * s * r * C[i] + s * s * B[i]) as V3,
    look: [0, 1, 2].map((i) => a.look[i] + (L[i] - a.look[i]) * s) as V3,
    fov: (a.fov ?? 42) + (45 - (a.fov ?? 42)) * s,
    roll: 0,
  };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 82, dur: 28, s: S1b }],
  2: [{ f: 174, s: S2a }, { f: 275, cut: true, s: S2b }],
  3: [{ f: 414, s: S3a }, { f: 490, cut: true, s: S3b }],
  4: [{ f: 581, s: S4a }, { f: 680, dur: 32, s: S4b }, { f: 790, dur: 30, s: S4c }],
  5: [{ f: 926, s: S5a }, { f: 1018, dur: 28, s: S5b }],
  6: [{ f: 1145, s: S6a }, { f: 1245, dur: 32, s: S6b }],
  7: [{ f: 1331, s: S7a }, { f: 1465, dur: 26, s: S7b }],
  8: [{ f: 1655, s: S8a }],
  9: [{ f: 1817, s: S9a }, { f: 1940, dur: 32, s: S9b }],
};

// 7-frame impact kicks (flip sign every frame) on key dramatic hits
const KICKS: [number, number][] = [
  [ERUPT_T, 1.25],      // "sumabog" @ 20.00s
  [PLUME_HIGH_T, 0.7],  // "lampas sa mga ulap" @ 25.02s
  [SUNSHADE_T, 0.55],   // "sunshade" @ 49.30s
  [COOL_T, 0.55],       // "bumagsak ang temperatura" @ 55.80s
  [UMBRELLA_T, 0.55],   // "payong" @ 67.28s
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
  { f: 0, cInf: 13, focus: () => [-0.4, 1.5, 4.0] },
  { f: 82, dur: 28, cInf: 0 },
  { f: 275, cInf: 9, focus: () => [-1.2, 1.6, -12.0] },
  { f: 414, cInf: 11, focus: () => [0.5, 1.8, 3.0] },
  { f: 490, cInf: 0 },
  { f: 585, cInf: 0 },
  { f: 930, cInf: 7 },
  { f: 1149, cInf: 5 },
  { f: 1335, cInf: 11, focus: () => [-240.0, 1.4, 0.0] },
  { f: 1659, cInf: 6 },
  { f: 1821, cInf: 10, focus: () => [1.4, 1.7, -246.0] },
  { f: 1940, dur: 32, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kind: "bush" | "crate" | "pot" | "cone"; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 0,    b: 90,   kind: "pot",  pos: [3.2, 0, 9.2],        s: 0.7,  yaw: 0.4 },
  { a: 275,  b: 414,  kind: "crate",pos: [2.8, 0.14, 9.0],     s: 0.75, yaw: 0.3 },
  { a: 1335, b: 1659, kind: "cone", pos: [-240 + 3.4, 0, 4.8], s: 0.7,  yaw: 0.2 },
  { a: 1821, b: 1940, kind: "pot",  pos: [-2.8, 0, -233.5],    s: 0.65, yaw: 0.5 },
];
