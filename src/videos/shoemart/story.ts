// Timeline of "From Shoes to Malls" (Henry Sy / SM Mall Empire): 69.000 s (2070 frames @ 30 fps),
// timed to video1/words.json. Keeps the bridge short's camera grammar: continuous slow push-ins on every hold,
// symmetric smootherstep glides (18-40 f), hard cuts on big reframes, 7-frame flip kicks on impacts,
// thin-lens DOF on close-ups/mediums, and foreground framing props in ~1/3 of shots.
export const FPS = 30;
export const TOTAL = 2070;
export const D0 = 0; // ground level y = 0 across the city/mall districts
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// District origins (separated by >=200 m so eras never collide)
export const Z_MANILA: V3 = [0, 0, 0];        // 1958 ShoeMart & 1970s expanded store
export const Z_QC: V3 = [200, 0, 0];          // 1980s economic crisis corner & QC construction site
export const Z_MALL: V3 = [0, 0, -240];       // SM North EDSA / Megamall grand plaza
export const Z_ATRIUM: V3 = [-220, 0, 0];     // Cool air-conditioned mall interior atrium
export const Z_MOA: V3 = [-220, 0, -240];     // Manila Bay Mall of Asia waterfront
export const Z_EMPIRE: V3 = [200, 0, -240];   // Banking, Hotels & Real Estate golden skyline

// Key story event times (seconds)
export const RIBBON_CUT = 33.47; // f1004: "opened its doors"

export type Light = "day" | "golden";
export type District = "manila" | "manila_exp" | "manila_hot" | "qc_crisis" | "qc_build" | "mall_hook" | "mall_open" | "mall_flywheel" | "mall_mega" | "mall_finale" | "atrium" | "atrium_relax" | "moa" | "empire";
export type ShotDef = { id: number; a: number; b: number; light: Light; district: District; sunAz?: number; sunEl?: number };

export const SHOTS: ShotDef[] = [
  { id: 1,  a: 0,    b: 126,  light: "day",    district: "mall_hook",     sunAz: 65,  sunEl: 48 },
  { id: 2,  a: 126,  b: 362,  light: "day",    district: "manila",        sunAz: 115, sunEl: 46 },
  { id: 3,  a: 362,  b: 585,  light: "day",    district: "manila_exp",    sunAz: 75,  sunEl: 48 },
  { id: 4,  a: 585,  b: 765,  light: "golden", district: "qc_crisis",     sunAz: 12,  sunEl: 8  },
  { id: 5,  a: 765,  b: 930,  light: "day",    district: "qc_build",      sunAz: 80,  sunEl: 48 },
  { id: 6,  a: 930,  b: 1045, light: "day",    district: "mall_open",     sunAz: 72,  sunEl: 46 },
  { id: 7,  a: 1045, b: 1116, light: "day",    district: "manila_hot",    sunAz: 68,  sunEl: 54 },
  { id: 8,  a: 1116, b: 1320, light: "day",    district: "atrium",        sunAz: 55,  sunEl: 52 },
  { id: 9,  a: 1320, b: 1428, light: "day",    district: "atrium_relax",  sunAz: 55,  sunEl: 50 },
  { id: 10, a: 1428, b: 1560, light: "golden", district: "mall_flywheel", sunAz: -18, sunEl: 8  },
  { id: 11, a: 1560, b: 1648, light: "day",    district: "mall_mega",     sunAz: 95,  sunEl: 48 },
  { id: 12, a: 1648, b: 1732, light: "day",    district: "moa",           sunAz: 78,  sunEl: 46 },
  { id: 13, a: 1732, b: 1875, light: "golden", district: "empire",        sunAz: 16,  sunEl: 8  },
  { id: 14, a: 1875, b: TOTAL,light: "day",    district: "mall_finale",   sunAz: 70,  sunEl: 48 },
];

/** Crossfades (frames) at place / time-of-day changes; white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 4: 8, 5: 8, 6: 8, 10: 8, 11: 8, 13: 8, 14: 8 };
export const FLASH_AT = 126;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
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
// Shot 1 (Hook): wide supermall plaza -> push to Henry & red shoes on pedestal
const S1a = (f: number) => dolly([0.8, 4.4, -203.0], [0, 7.6, -248.0], pushK(f, 0, 0.0025), { fov: 44 });
const S1b = (f: number) => dolly([5.2, 2.2, -213.5], [0, 2.2, -234.0], pushK(f, 36, 0.0022), { fov: 40, roll: -0.04 });
const S1c = (f: number) => dolly([0.7, 1.45, -219.8], [0, 1.15, -224.0], pushK(f, 78, 0.0025, 0.006, 30), { fov: 36, roll: 0.04 });

// Shot 2 (1958 Manila ShoeMart): aerial Carriedo -> street Henry Sy -> ShoeMart sign/window
const S2a = (f: number) => dolly([15.5, 10.2, 16.0], [0, 4.0, -16.5], pushK(f, 126, 0.002), { fov: 42 });
const S2b = (f: number) => dolly([3.1, 1.85, -10.2], [0.2, 1.55, -17.5], pushK(f, 206, 0.0022), { fov: 38, roll: -0.03 });
const S2c = (f: number) => dolly([-1.1, 2.05, -12.6], [0, 1.95, -18.8], pushK(f, 294, 0.0025, 0.005, 30), { fov: 35, roll: 0.035 });

// Shot 3 (Expansion): crowd streaming -> wider 3-bay storefront & racks -> family with bags
const S3a = (f: number) => dolly([-9.2, 2.6, -4.5], [1.5, 2.2, -18.5], pushK(f, 362, 0.0022), { fov: 42 });
const S3b = (f: number) => dolly([5.4, 2.1, -8.5], [-0.4, 1.7, -18.5], pushK(f, 422, 0.002), { fov: 38, roll: -0.035 });
const S3c = (f: number) => dolly([-1.1, 1.65, -8.2], [0.3, 1.4, -13.6], pushK(f, 512, 0.0024, 0.005, 30), { fov: 36, roll: 0.035 });

// Shot 4 (1980s Crisis, golden): Henry with blueprint at corner -> pan to worried crowd & empty lot
const S4a = (f: number) => dolly([193.5, 1.85, -7.8], [198.2, 1.5, -1.6], pushK(f, 581, 0.002), { fov: 38, roll: -0.04 });
const S4b = (f: number) => dolly([202.5, 2.2, -10.0], [211.0, 1.7, 7.0], pushK(f, 650, 0.0022), { fov: 42, roll: 0.04 });

// Shot 5 (QC Construction): low 3/4 with Henry & rising skeleton -> high wide showing empty QC plains
const S5a = (f: number) => dolly([201.5, 2.3, 0.5], [212.5, 4.2, 14.5], pushK(f, 761, 0.0022), { fov: 44 });
const S5b = (f: number) => dolly([184.0, 14.5, -14.0], [215.0, 4.0, 18.0], pushK(f, 838, 0.002), { fov: 42, roll: -0.03 });

// Shot 6 (1985 SM North EDSA opens): grand facade -> close on doors + ribbon burst
const S6a = (f: number) => dolly([2.8, 2.5, -230.0], [0, 4.4, -252.0], pushK(f, 926, 0.002, 0.0055, 32), { fov: 44 });
const S6b = (f: number) => dolly([-2.4, 2.1, -238.5], [0, 2.4, -251.0], pushK(f, 992, 0.0024), { fov: 42, roll: 0.03 });

// Shot 7 (Hot city street contrast): scattered sunny shops
const S7a = (f: number) => dolly([6.8, 2.0, 3.5], [-3.2, 1.6, -15.5], pushK(f, 1045, 0.0025), { fov: 40, roll: -0.03 });

// Shot 8 (Cool indoor mall atrium): shop/eat -> cinema -> families & AC vents
const S8a = (f: number) => dolly([-225.5, 2.2, 12.2], [-219.2, 1.85, -4.5], pushK(f, 1116, 0.0024), { fov: 42 });
const S8b = (f: number) => dolly([-213.8, 2.1, -2.2], [-226.0, 2.6, -11.5], pushK(f, 1185, 0.0024), { fov: 38, roll: -0.035 });
const S8c = (f: number) => dolly([-220.0, 2.6, 8.6], [-220.0, 3.3, -7.0], pushK(f, 1232, 0.002, 0.005, 30), { fov: 44, roll: 0.035 });

// Shot 9 (Non-shoppers relaxing): bench, ice cream, fountain, AC breeze
const S9a = (f: number) => dolly([-216.2, 1.65, 8.6], [-220.4, 1.45, 2.0], pushK(f, 1320, 0.0022), { fov: 38 });

// Shot 10 (Flywheel, golden): visitors streaming in -> storefronts lighting up
const S10a = (f: number) => dolly([-7.4, 2.1, -214.0], [1.8, 3.6, -246.0], pushK(f, 1424, 0.0022), { fov: 42, roll: -0.03 });
const S10b = (f: number) => dolly([7.0, 2.4, -225.0], [-1.8, 3.2, -250.0], pushK(f, 1482, 0.0024, 0.005, 30), { fov: 40, roll: 0.035 });

// Shot 11 (SM Megamall aerial)
const S11a = (f: number) => dolly([26.0, 14.5, -198.0], [0, 6.5, -256.0], pushK(f, 1556, 0.0022), { fov: 42, roll: -0.025 });

// Shot 12 (Mall of Asia waterfront + globe + Ferris wheel + Manila Bay)
const S12a = (f: number) => dolly([-206.0, 8.4, -202.0], [-227.0, 5.8, -242.0], pushK(f, 1648, 0.0025), { fov: 46, roll: 0.03 });

// Shot 13 (Empire sectors, golden): Bank -> Hotel -> Real Estate skyscrapers
const S13a = (f: number) => dolly([176.0, 4.8, -204.0], [182.0, 7.0, -246.0], pushK(f, 1728, 0.0022), { fov: 42, roll: -0.03 });
const S13b = (f: number) => dolly([218.0, 7.2, -196.0], [204.0, 10.5, -246.0], pushK(f, 1794, 0.0024), { fov: 46, roll: 0.03 });

// Shot 14 (Finale callback): shoes + Henry -> pullback to weekend crowd -> crane out
const S14a = (f: number) => dolly([1.1, 1.45, -220.4], [0, 1.2, -224.0], pushK(f, 1871, 0.0022), { fov: 36 });
const S14b = (f: number) => dolly([-5.2, 2.7, -214.0], [0, 2.3, -238.0], pushK(f, 1932, 0.0022, 0.005, 30), { fov: 40, roll: -0.03 });
const CRANE: V3[] = [[14, 13, -198], [26, 22, -172], [0, 8, -248]];
const S14c = (f: number): Shot => {
  const a = S14b(1982), s = glide((f - 1982) / 88), r = 1 - s, [C, B, L] = CRANE;
  return {
    pos: [0, 1, 2].map((i) => r * r * a.pos[i] + 2 * s * r * C[i] + s * s * B[i]) as V3,
    look: [0, 1, 2].map((i) => a.look[i] + (L[i] - a.look[i]) * s) as V3,
    fov: (a.fov ?? 40) + (45 - (a.fov ?? 40)) * s,
    roll: 0,
  };
};

const CAMS: Record<number, Key[]> = {
  1:  [{ f: 0, s: S1a }, { f: 36, dur: 28, s: S1b }, { f: 78, dur: 26, s: S1c }],
  2:  [{ f: 126, s: S2a }, { f: 206, dur: 24, s: S2b }, { f: 294, dur: 24, s: S2c }],
  3:  [{ f: 362, s: S3a }, { f: 422, cut: true, s: S3b }, { f: 512, dur: 24, s: S3c }],
  4:  [{ f: 581, s: S4a }, { f: 650, dur: 28, s: S4b }],
  5:  [{ f: 761, s: S5a }, { f: 838, cut: true, s: S5b }],
  6:  [{ f: 926, s: S6a }, { f: 992, cut: true, s: S6b }],
  7:  [{ f: 1045, s: S7a }],
  8:  [{ f: 1116, s: S8a }, { f: 1185, cut: true, s: S8b }, { f: 1232, dur: 24, s: S8c }],
  9:  [{ f: 1320, s: S9a }],
  10: [{ f: 1424, s: S10a }, { f: 1482, dur: 26, s: S10b }],
  11: [{ f: 1556, s: S11a }],
  12: [{ f: 1648, s: S12a }],
  13: [{ f: 1728, s: S13a }, { f: 1794, dur: 26, s: S13b }],
  14: [{ f: 1871, s: S14a }, { f: 1932, dur: 28, s: S14b }, { f: 1982, cut: true, s: S14c }],
};

// 7-frame impact kicks (flip sign every frame) on key dramatic hits
const KICKS: [number, number][] = [
  [RIBBON_CUT, 1.1], // SM North EDSA ribbon cut / doors burst open
  [14.07, 0.5],      // expansion pop (f422)
  [27.4, 0.6],       // construction crane drop / beam slam (f822)
  [50.4, 0.55],      // glowing storefront pop-up burst (f1512)
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

export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field + foreground framing ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 78, dur: 26, cInf: 14, focus: () => [0, 1.15, -224.0] },
  { f: 126, cInf: 0 },
  { f: 206, dur: 24, cInf: 11, focus: () => [0.2, 1.55, -17.5] },
  { f: 294, dur: 24, cInf: 13, focus: () => [0, 1.85, -18.8] },
  { f: 362, cInf: 0 },
  { f: 512, dur: 24, cInf: 12, focus: () => [0.3, 1.4, -13.6] },
  { f: 585, cInf: 10, focus: () => [198.2, 1.5, -1.6] },
  { f: 650, dur: 28, cInf: 7 },
  { f: 765, cInf: 0 },
  { f: 930, cInf: 0 },
  { f: 992, cInf: 10, focus: () => [0, 2.0, -251.0] },
  { f: 1045, cInf: 8 },
  { f: 1116, cInf: 0 },
  { f: 1320, cInf: 13, focus: () => [-220.4, 1.35, 3.6] },
  { f: 1428, cInf: 0 },
  { f: 1875, cInf: 14, focus: () => [0, 1.2, -224.0] },
  { f: 1932, dur: 28, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kind: "bush" | "crate" | "pot" | "cone"; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  // 1958 Manila corner crate / potted palm framing bottom-left/right
  { a: 206, b: 362, kind: "crate", pos: [-2.6, 0.14, -14.8], s: 0.75, yaw: 0.3 },
  // 1980s crisis corner traffic cone framing
  { a: 585, b: 765, kind: "cone", pos: [195.2, 0, -5.6], s: 0.7, yaw: 0.2 },
  // Indoor non-shopper bench shot: small pot clear of center characters
  { a: 1320, b: 1428, kind: "pot", pos: [-215.2, 0, 5.2], s: 0.65, yaw: 0.5 },
  // Finale shoes callback: pot framing
  { a: 1875, b: 1940, kind: "pot", pos: [-0.9, 0, -221.8], s: 0.7, yaw: 0.3 },
];
