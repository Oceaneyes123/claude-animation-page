// Timeline of "Bolinao · Ang ngiting may gintong kaliskis" (Bolinao Skull, Pangasinan):
// Exact 79.333 s (2380 frames @ 30 fps, matching voice.wav 79.316 s), snapped 0-3 frames before trigger words in video4/words.json.
// Camera grammar: continuous slow push-ins on every hold, symmetric smootherstep glides,
// hard cuts on dramatic reframes, 7-frame flip kicks on key story beats, thin-lens DOF, and foreground framing props.
export const FPS = 30;
export const TOTAL = 2380;
export const BOLINAO_FRAMES = TOTAL;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// District origins (separated by >=240 m so worlds never collide)
export const Z_MUSEUM: V3   = [0, 0, 0];       // National Museum sunlit gallery hall & ceremonial Bolinao skull pedestal
export const Z_DIG: V3      = [240, 0, 0];     // Balingasay, Pangasinan coastal riverbank dig site & specimen table
export const Z_PIER: V3     = [-240, 0, 0];    // Bolinao fishing pier, turquoise bay, bancas & hero reef fish with scales
export const Z_WORKSHOP: V3 = [0, 0, -240];    // Coastal craftsman & goldsmith courtyard (knife rivets + tooth gold inlay)
export const Z_TREASURE: V3 = [480, 0, 0];     // Ancient Pangasinan stone burial shrine with gold necklace/ring/earring

// Key story event times (seconds), snapped 0-3 frames before trigger words in video4/words.json
export const FLASH_AT     = 146;    // 4.867 s — right before "Sa Balingasay..." @ 4.92 s
export const DIG_T        = 7.00;   // "nahukay" @ 7.06 s
export const SKULL_T      = 7.60;   // "bungo" @ 7.66 s
export const TEETH_GOLD_T = 14.08;  // "ginto" @ 14.16 s
export const FISH_T       = 21.14;  // "kaliskis ng isda" @ 21.22 s
export const KNIFE_T      = 25.20;  // "kutsilyo" @ 25.28 s
export const RIVET_T      = 28.28;  // "Nakabaon" @ 28.36 s
export const ALTER_T      = 32.42;  // "salit-salit" @ 32.50 s
export const PEG_T        = 39.64;  // "nakabaon" @ 39.72 s
export const SCALE_FORM_T = 43.60;  // "hugis-kaliskis" @ 43.68 s
export const JEWEL_T      = 50.00;  // "singsing o kuwintas" @ 50.10 s
export const TOOTH_FLIP_T = 52.46;  // "ngipin mismo" @ 52.54 s
export const FINDS_T      = 56.70;  // "ngiping may bakas" @ 56.78 s
export const HERITAGE_T   = 70.10;  // "daan-daang taon" @ 70.18 s
export const QUESTION_T   = 78.30;  // "Kaya ang tanong" @ 78.38 s

export type Light = "day" | "golden";
export type District =
  | "hook"
  | "dig"
  | "teeth"
  | "scales"
  | "knife"
  | "inlay"
  | "jewels"
  | "finds"
  | "mystery"
  | "loop";

export type ShotDef = { id: number; a: number; b: number; light: Light; district: District; sunAz?: number; sunEl?: number };

export const SHOTS: ShotDef[] = [
  { id: 1,  a: 0,    b: 146,   light: "day",    district: "hook",    sunAz: 62,  sunEl: 46 },
  { id: 2,  a: 146,  b: 347,   light: "day",    district: "dig",     sunAz: 74,  sunEl: 48 },
  { id: 3,  a: 347,  b: 544,   light: "day",    district: "teeth",   sunAz: 108, sunEl: 44 },
  { id: 4,  a: 544,  b: 673,   light: "day",    district: "scales",  sunAz: 112, sunEl: 46 },
  { id: 5,  a: 673,  b: 1067,  light: "day",    district: "knife",   sunAz: 108, sunEl: 48 },
  { id: 6,  a: 1067, b: 1349,  light: "golden", district: "inlay",   sunAz: 122, sunEl: 22 },
  { id: 7,  a: 1349, b: 1625,  light: "golden", district: "jewels",  sunAz: 118, sunEl: 22 },
  { id: 8,  a: 1625, b: 1788,  light: "day",    district: "finds",   sunAz: 110, sunEl: 46 },
  { id: 9,  a: 1788, b: 2245,  light: "golden", district: "mystery", sunAz: 122, sunEl: 24 },
  { id: 10, a: 2245, b: TOTAL, light: "day",    district: "loop",    sunAz: 62,  sunEl: 46 },
];

export const XFADE: Record<number, number> = { 3: 8, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8, 10: 8 };

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
// Shot 1 (Hook): Museum gallery hall with visitors admiring Bolinao Skull -> push in to golden smile
const S1a = (f: number) => dolly([1.8, 2.35, 11.4], [0.0, 1.55, 0.0], pushK(f, 0, 0.0024), { fov: 40, roll: -0.025 });
const S1b = (f: number) => dolly([-0.6, 1.85, 5.2], [0.0, 1.55, 0.0], pushK(f, 62, 0.0028, 0.005, 28), { fov: 36, roll: 0.025 });

// Shot 2 (Dig site — Balingasay, Pangasinan): coastal bay, palms, river & excavation trench
const S2a = (f: number) => dolly([240 + 4.8, 4.6, 17.5], [240 - 0.2, 1.4, -1.5], pushK(f, 146, 0.0024), { fov: 44, roll: -0.025 });
const S2b = (f: number) => dolly([240 - 1.6, 2.35, 7.2], [240 + 0.0, 0.85, -0.4], pushK(f, 224, 0.0028, 0.006, 28), { fov: 39, roll: 0.03 });

// Shot 3 (Teeth close-up — Museum skull macro): glittering gold squares on front incisors
const S3a = (f: number) => dolly([0.85, 1.68, 3.65], [0.0, 1.42, 0.12], pushK(f, 343, 0.0025), { fov: 34, roll: -0.02 });
const S3b = (f: number) => dolly([-0.75, 1.48, 2.55], [0.0, 1.38, 0.14], pushK(f, 430, 0.0027, 0.005, 28), { fov: 32, roll: 0.025 });

// Shot 4 (Fish scales — Bolinao pier): coastal dock, bancas, fisherman & helper + big 3D fish
const S4a = (f: number) => dolly([-240 + 1.8, 3.25, 13.8], [-240 + 0.0, 1.55, 0.0], pushK(f, 540, 0.0025, 0.005, 28), { fov: 43, roll: -0.025 });

// Shot 5 (Knife rivets — Artisan porch workshop): workbench, craftsman hammering + apprentice + full knife & rivets
const S5a = (f: number) => dolly([1.8, 2.8, -240 + 11.4], [0.0, 1.45, -240.0], pushK(f, 669, 0.0020), { fov: 42, roll: 0.02 });
const S5b = (f: number) => dolly([-1.1, 2.75, -240 + 9.2], [0.15, 1.50, -240.0], pushK(f, 845, 0.0022, 0.004, 28), { fov: 40, roll: -0.025 });

// Shot 6 (Tooth inlay — Goldsmith golden-hour bench @ x=+14, z=-240): goldsmiths + tooth + staggered gold pegs
const S6a = (f: number) => dolly([14 + 1.6, 2.75, -240 + 10.6], [14.0, 1.55, -240.0], pushK(f, 1063, 0.0022), { fov: 41, roll: 0.02 });
const S6b = (f: number) => dolly([14 - 1.5, 2.45, -240 + 8.4], [14.0, 1.58, -240.0], pushK(f, 1195, 0.0024, 0.004, 28), { fov: 38, roll: -0.02 });

// Shot 7 (Burial gold jewelry vs tooth ornament — Ancient shrine @ Z_TREASURE): stone altar, arch, gold jewels & cast
const S7a = (f: number) => dolly([480 + 1.8, 2.85, 9.6], [480 + 0.1, 1.38, -0.4], pushK(f, 1345, 0.0023), { fov: 41, roll: -0.025 });
const S7b = (f: number) => dolly([480 - 2.0, 2.35, 7.2], [480 - 2.35, 1.42, -0.4], pushK(f, 1555, 0.0026, 0.005, 26), { fov: 39, roll: 0.025 });

// Shot 8 (Other Balingasay teeth finds @ x=240+14, Z_DIG): field sorting table with 5 gold-flecked specimen teeth & team
const S8a = (f: number) => dolly([240 + 14 + 1.4, 2.95, 9.4], [240 + 14.0, 1.32, 0.0], pushK(f, 1621, 0.0024, 0.005, 26), { fov: 40, roll: -0.025 });

// Shot 9 (Mystery & endurance — Golden hour Museum reveal): intimate golden smile -> pull out across grand sunlit museum hall
const S9a = (f: number) => dolly([0.85, 1.85, 4.1], [0.0, 1.55, 0.0], pushK(f, 1784, 0.0020), { fov: 36, roll: -0.02 });
const S9b = (f: number) => dolly([-4.2, 3.8, 12.6], [0.0, 1.75, 0.0], pushK(f, 2030, 0.0018, 0.004, 30), { fov: 43, roll: 0.025 });

// Shot 10 (Loop question — "Kaya ang tanong..."): Return to bright daytime museum matching Shot 1
const S10a = (f: number) => dolly([1.4, 2.25, 10.6], [0.0, 1.55, 0.0], pushK(f, 2241, 0.0028, 0.005, 28), { fov: 40, roll: -0.025 });

const CAMS: Record<number, Key[]> = {
  1:  [{ f: 0,    s: S1a }, { f: 62,   dur: 28, s: S1b }],
  2:  [{ f: 146,  s: S2a }, { f: 224,  cut: true, s: S2b }],
  3:  [{ f: 343,  s: S3a }, { f: 430,  dur: 26, s: S3b }],
  4:  [{ f: 540,  s: S4a }],
  5:  [{ f: 669,  s: S5a }, { f: 845,  dur: 30, s: S5b }],
  6:  [{ f: 1063, s: S6a }, { f: 1195, dur: 28, s: S6b }],
  7:  [{ f: 1345, s: S7a }, { f: 1555, dur: 24, s: S7b }],
  8:  [{ f: 1621, s: S8a }],
  9:  [{ f: 1784, s: S9a }, { f: 2030, dur: 38, s: S9b }],
  10: [{ f: 2241, s: S10a }],
};

// 7-frame impact kicks (flip sign every frame) on key dramatic story beats
const KICKS: [number, number][] = [
  [SKULL_T, 0.55],
  [FISH_T, 0.60],
  [RIVET_T, 0.55],
  [PEG_T, 0.55],
  [JEWEL_T, 0.50],
  [TOOTH_FLIP_T, 0.55],
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
  { f: 0,    cInf: 11, focus: () => [0.0, 1.55, 0.0] },
  { f: 146,  cInf: 7,  focus: () => [240.0, 1.1, -0.5] },
  { f: 347,  cInf: 15, focus: () => [0.0, 1.40, 0.14] },
  { f: 544,  cInf: 10, focus: () => [-240.0, 1.75, 0.0] },
  { f: 673,  cInf: 11, focus: () => [0.0, 1.50, -240.0] },
  { f: 1067, cInf: 13, focus: () => [14.0, 1.60, -240.0] },
  { f: 1349, cInf: 11, focus: () => [480.0, 1.38, 0.0] },
  { f: 1555, dur: 22, cInf: 12, focus: () => [480 - 2.35, 1.45, -0.4] },
  { f: 1625, cInf: 12, focus: () => [254.0, 1.32, 0.0] },
  { f: 1788, cInf: 10, focus: () => [0.0, 1.55, 0.0] },
  { f: 2030, dur: 38, cInf: 4 },
  { f: 2245, cInf: 11, focus: () => [0.0, 1.55, 0.0] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kind: "bush" | "crate" | "pot" | "cone"; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 0,    b: 146,  kind: "pot",   pos: [2.8, 0, 5.2],         s: 0.68, yaw: 0.4 },
  { a: 146,  b: 347,  kind: "crate", pos: [240 + 4.4, 0, 7.6],   s: 0.72, yaw: -0.3 },
  { a: 544,  b: 673,  kind: "crate", pos: [-240 + 2.6, 0, 4.6],  s: 0.66, yaw: 0.35 },
  { a: 673,  b: 1067, kind: "pot",   pos: [2.3, 0, -240 + 3.8],  s: 0.62, yaw: 0.5 },
  { a: 1349, b: 1625, kind: "pot",   pos: [480 - 2.3, 0, 3.6],   s: 0.64, yaw: -0.4 },
  { a: 2245, b: 2380, kind: "pot",   pos: [2.6, 0, 5.0],         s: 0.66, yaw: 0.4 },
];
