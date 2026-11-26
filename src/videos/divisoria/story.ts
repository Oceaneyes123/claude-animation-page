// Timeline of "Divisoria · Ang liwasang ginawa para hadlangan ang apoy" (Cagayan de Oro Firebreak Plaza):
// Exact 61.567 s (1847 frames @ 30 fps, matching narration.wav 61.5605 s), snapped 0-3 frames before trigger words in shorts/08-divisoria/words.json.
// Camera grammar: continuous slow push-ins on every hold, symmetric smootherstep glides,
// hard cuts on dramatic reframes, 7-frame flip kicks on key story beats, thin-lens DOF, and foreground framing props.
export const FPS = 30;
export const TOTAL = 1847;
export const DIVISORIA_FRAMES = TOTAL;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// District origins (separated by >=240 m so worlds never collide)
export const Z_PLAZA: V3 = [0, 0, 0];         // Early 20th-c. Cagayan de Oro town split by wide Divisoria plaza (Shots 1, 2, 3, 4, 9)
export const Z_PAPER: V3 = [240, 0, 0];       // Sunlit workshop table + upright paper-strip row analogy (Shots 5, 6)
export const Z_EMBER: V3 = [-240, 0, 0];      // Golden-hour wind-blown ember & stone vs timber material comparison (Shot 7)
export const Z_MAP: V3   = [0, 0, -240];      // 3D architectural relief map of Cagayan de Oro showing Divisoria stripe (Shot 8)

// Key story event times (seconds), snapped 0-3 frames before trigger words in shorts/08-divisoria/words.json
export const HOOK_FIRE_T     = 4.36;   // "mapigil" @ 4.44 s / "pagkalat ng apoy" @ 5.08 s
export const FLASH_AT        = 198;    // 6.600 s — right before "Noong unang bahagi" @ 6.78 s
export const OPEN_SPACE_T    = 9.46;   // "espasyong iniwang bukas" @ 9.54 s
export const DIVISORIA_T     = 13.64;  // "Divisoria" @ 13.72 s
export const PLAZA_GATHER_T  = 16.84;  // "plaza" @ 16.92 s
export const PLAN_PAKAY_T    = 21.60;  // "pakay" @ 21.68 s
export const DIVIDE_T        = 22.92;  // "Hinati" @ 23.00 s
export const FIRE_SIDE_T     = 26.32;  // "sunog" @ 26.40 s
export const BLOCK_GAP_T     = 28.20;  // "patungo sa kabila" @ 28.30 s
export const PAPER_IN_T      = 31.56;  // "may hanay ng mga piraso ng papel" @ 31.64 s
export const PACK_CLOSE_T    = 34.04;  // "magkakadikit" @ 34.12 s
export const IGNITE_1_T      = 35.64;  // "umabot ang liyab" @ 35.72 s
export const GAP_SLIDE_T     = 39.32;  // "sapat na puwang" @ 39.40 s
export const GAP_BURN_T      = 40.70;  // "tumawid nang direkta ang apoy" @ 40.78 s
export const EMBER_WIND_T    = 43.62;  // "tumawid ang baga" @ 43.70 s
export const WIDTH_COMPARE_T = 47.20;  // "kalawak ang puwang" @ 47.28 s
export const MATERIAL_T      = 49.08;  // "materyal" @ 49.16 s
export const PLAN_DRAW_T     = 53.04;  // "pagitan ang bahagi ng plano" @ 53.12 s
export const MAP_HIGHLIGHT_T = 57.14;  // "mapa ang guhit" @ 57.22 s
export const QUESTION_T      = 60.46;  // "Kaya ang tanong..." @ 60.54 s

export type Light = "day" | "golden";
export type District =
  | "hook"
  | "town_overview"
  | "plaza_gather"
  | "firebreak"
  | "paper_close"
  | "paper_gap"
  | "ember_wind"
  | "city_map"
  | "loop";

export type ShotDef = { id: number; a: number; b: number; light: Light; district: District; sunAz?: number; sunEl?: number };

export const SHOTS: ShotDef[] = [
  { id: 1, a: 0,    b: 198,   light: "day",    district: "hook",          sunAz: 68,  sunEl: 48 },
  { id: 2, a: 198,  b: 438,   light: "day",    district: "town_overview", sunAz: 76,  sunEl: 50 },
  { id: 3, a: 438,  b: 684,   light: "day",    district: "plaza_gather",  sunAz: 72,  sunEl: 48 },
  { id: 4, a: 684,  b: 894,   light: "golden", district: "firebreak",     sunAz: 118, sunEl: 21 },
  { id: 5, a: 894,  b: 1164,  light: "day",    district: "paper_close",   sunAz: 74,  sunEl: 46 },
  { id: 6, a: 1164, b: 1278,  light: "day",    district: "paper_gap",     sunAz: 74,  sunEl: 46 },
  { id: 7, a: 1278, b: 1530,  light: "golden", district: "ember_wind",    sunAz: 116, sunEl: 20 },
  { id: 8, a: 1530, b: 1812,  light: "day",    district: "city_map",      sunAz: 72,  sunEl: 50 },
  { id: 9, a: 1812, b: TOTAL, light: "day",    district: "loop",          sunAz: 68,  sunEl: 48 },
];

export const XFADE: Record<number, number> = { 4: 8, 5: 8, 7: 8, 8: 8, 9: 8 };

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
// Shot 1 (Hook): Wide view down Divisoria promenade showing burning left houses, wide green gap, and safe right houses
const S1a = (f: number) => dolly([0.6, 5.6, 17.6], [-0.8, 2.1, -5.2], pushK(f, 0, 0.0020), { fov: 46, roll: -0.022 });
const S1b = (f: number) => dolly([-0.4, 5.1, 15.0], [-1.0, 2.1, -5.4], pushK(f, 118, 0.0025, 0.005, 28), { fov: 44, roll: 0.024 });

// Shot 2 (Early 20th-c. Town Overview): Elevated look along the open central plaza dividing old Cagayan de Oro
const S2a = (f: number) => dolly([0.8, 9.8, 18.6], [0.0, 1.5, -3.5], pushK(f, 198, 0.0021), { fov: 44, roll: -0.022 });
const S2b = (f: number) => dolly([-0.6, 7.6, 14.4], [0.0, 1.7, -4.0], pushK(f, 320, 0.0025, 0.005, 28), { fov: 41, roll: 0.022 });

// Shot 3 (Plaza Gathering -> Hidden Purpose): Lively plaza kiosk & families -> glide to planner with blueprints
const S3a = (f: number) => dolly([1.8, 2.85, 11.2], [0.3, 1.75, -1.8], pushK(f, 438, 0.0022), { fov: 40, roll: -0.02 });
const S3b = (f: number) => dolly([-1.6, 2.75, 8.8], [-0.4, 1.75, -2.0], pushK(f, 575, 0.0026, 0.005, 26), { fov: 39, roll: 0.024 });

// Shot 4 (Golden Firebreak): Left row ablaze while wide plaza keeps right row & townsfolk safe in golden light
const S4a = (f: number) => dolly([1.4, 5.5, 17.2], [-0.8, 2.1, -4.8], pushK(f, 680, 0.0023), { fov: 46, roll: 0.024 });
const S4b = (f: number) => dolly([1.8, 4.8, 14.6], [-0.4, 2.1, -4.6], pushK(f, 780, 0.0026, 0.005, 28), { fov: 44, roll: -0.024 });

// Shot 5 (Paper Strip Analogy — Packed Row): Sunlit table -> strips close together -> teacher & kid clearly visible above
const S5a = (f: number) => dolly([240 - 0.5, 3.65, 11.6], [240.0, 1.85, -0.4], pushK(f, 890, 0.0021), { fov: 42, roll: -0.02 });
const S5b = (f: number) => dolly([240 + 0.5, 3.45, 9.8], [240.0, 1.85, -0.4], pushK(f, 1015, 0.0025, 0.005, 28), { fov: 40, roll: 0.022 });

// Shot 6 (Paper Strip Analogy — Wide Gap): All 6 separated strips fit comfortably in frame -> flame stops at gap
const S6a = (f: number) => dolly([240 + 0.2, 3.55, 11.4], [240.0, 1.85, -0.4], pushK(f, 1164, 0.0023, 0.005, 26), { fov: 41, roll: -0.022 });

// Shot 7 (Golden Wind, Embers & Materials): Narrow alley embers jump roofs -> wide stone firebreak + brick stops embers
const S7a = (f: number) => dolly([-240 - 2.6, 4.3, 14.2], [-240 - 2.6, 2.4, -0.4], pushK(f, 1274, 0.0022), { fov: 43, roll: 0.022 });
const S7b = (f: number) => dolly([-240 + 2.8, 4.1, 14.2], [-240 + 2.8, 2.1, -0.2], pushK(f, 1405, 0.0025, 0.005, 28), { fov: 43, roll: -0.024 });

// Shot 8 (3D Cagayan de Oro Relief Map): Overhead angle revealing river, blocks & Divisoria stripe down the grid
const S8a = (f: number) => dolly([1.8, 10.6, -240 + 15.2], [-0.2, 1.1, -240 - 0.4], pushK(f, 1526, 0.0021), { fov: 44, roll: -0.022 });
const S8b = (f: number) => dolly([-1.0, 9.4, -240 + 12.8], [-0.1, 1.1, -240 - 0.4], pushK(f, 1685, 0.0025, 0.005, 28), { fov: 42, roll: 0.022 });

// Shot 9 (Loop back to Divisoria Promenade): Match Shot 1 framing smoothly
const S9a = (f: number) => dolly([0.6, 5.6, 17.6], [-0.8, 2.1, -5.2], pushK(f, 1808, 0.0025, 0.005, 22), { fov: 46, roll: -0.022 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0,    s: S1a }, { f: 118,  dur: 28, s: S1b }],
  2: [{ f: 198,  s: S2a }, { f: 320,  dur: 34, s: S2b }],
  3: [{ f: 438,  s: S3a }, { f: 575,  dur: 32, s: S3b }],
  4: [{ f: 680,  s: S4a }, { f: 780,  dur: 30, s: S4b }],
  5: [{ f: 890,  s: S5a }, { f: 1015, dur: 28, s: S5b }],
  6: [{ f: 1164, s: S6a }],
  7: [{ f: 1274, s: S7a }, { f: 1405, dur: 34, s: S7b }],
  8: [{ f: 1526, s: S8a }, { f: 1685, dur: 32, s: S8b }],
  9: [{ f: 1808, s: S9a }],
};

// 7-frame impact kicks (flip sign every frame) on key story & physics beats
const KICKS: [number, number][] = [
  [HOOK_FIRE_T, 0.55],
  [OPEN_SPACE_T, 0.45],
  [DIVISORIA_T, 0.50],
  [FIRE_SIDE_T, 0.65],
  [BLOCK_GAP_T, 0.55],
  [IGNITE_1_T, 0.60],
  [GAP_BURN_T, 0.55],
  [EMBER_WIND_T, 0.60],
  [MATERIAL_T, 0.48],
  [MAP_HIGHLIGHT_T, 0.50],
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
  { f: 0,    cInf: 7,  focus: () => [-0.8, 2.1, -3.5] },
  { f: 118,  dur: 26, cInf: 10, focus: () => [-2.2, 2.2, -5.0] },
  { f: 198,  cInf: 0,  focus: () => [0.0, 1.5, -3.5] },
  { f: 438,  dur: 22, cInf: 10, focus: () => [0.4, 1.7, -1.6] },
  { f: 684,  cInf: 9,  focus: () => [-1.8, 2.1, -4.5] },
  { f: 894,  cInf: 12, focus: () => [240.0, 1.7, 0.0] },
  { f: 1164, cInf: 12, focus: () => [240.0, 1.7, 0.0] },
  { f: 1278, cInf: 10, focus: () => [-242.6, 2.0, 0.0] },
  { f: 1405, dur: 28, cInf: 10, focus: () => [-237.2, 2.0, 0.0] },
  { f: 1530, cInf: 0,  focus: () => [0.0, 1.1, -240.5] },
  { f: 1812, cInf: 7,  focus: () => [-0.8, 2.1, -3.5] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kind: "crate" | "pot"; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 0,    b: 198,   kind: "pot",   pos: [3.6, 0, 7.6],        s: 0.72, yaw: -0.3 },
  { a: 438,  b: 684,   kind: "pot",   pos: [-3.3, 0, 5.2],       s: 0.68, yaw: 0.35 },
  { a: 684,  b: 894,   kind: "pot",   pos: [4.2, 0, 6.2],        s: 0.70, yaw: -0.25 },
  { a: 894,  b: 1278,  kind: "crate", pos: [240 - 3.3, 0, 4.1],  s: 0.66, yaw: 0.3 },
  { a: 1812, b: TOTAL, kind: "pot",   pos: [3.6, 0, 7.6],        s: 0.72, yaw: -0.3 },
];
