// Cast staging for "From Shoes to Malls" (Henry Sy / SM Mall Empire):
// Camera-facing lit 2D character cards on NOINK layer + contact shadow blobs + 2D effects.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, HENRY_YOUNG, HENRY_OLDER, WORKER, KID, filipino,
  fxBurst, fxCreak, fxRing, fxContact, fxShadow, fxCoolAir, fxHeat, fxCoin,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, SHOTS, Z_MANILA, Z_QC, Z_MALL, Z_ATRIUM, Z_MOA, Z_EMPIRE, RIBBON_CUT, V3,
  smooth, clamp01,
} from "./story";
import { LIGHTS } from "../../shared/lights";
import { NOINK } from "../../shared/ink";
import { cardShade, blobMaterial, CARD_K } from "../../shared/cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
const ROOTS = new Set<THREE.Object3D>();

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}

export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const FOLK = Array.from({ length: 12 }, (_, v) => filipino(v));
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.4 ? [1800, 3000, 3.0] : d < 7.0 ? [1080, 1800, 1.8] : d < 18 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light & view ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.52, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- blinks ----------------
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return { key, x, y, z, scale, mirror, draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)), size: [w, h, k] };
};

const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

/** helper: strolling crowd around an area */
const strollers = (cam: CamInfo, t: number, out: Stage, count: number, seedBase: number, x0: number, x1: number, z0: number, z1: number, dirZ = -1, bags = true) => {
  for (let i = 0; i < count; i++) {
    const sp = 0.7 + hh(i + seedBase, 1) * 0.55;
    const px = x0 + hh(i + seedBase, 2) * (x1 - x0);
    const span = z1 - z0;
    const pz = z0 + (((hh(i + seedBase, 3) * span + (dirZ > 0 ? 1 : -1) * sp * t) % span) + span) % span;
    const kid = i % 5 === 4;
    const o = kid ? KID : FOLK[i % FOLK.length];
    const who: Who = { i: i + seedBase, o, okey: kid ? "kid" : `fil${i % FOLK.length}` };
    const phase = q((t * sp / 1.4 + hh(i + seedBase, 4)) % 1, 120);
    const prop = bags ? (i % 3 === 0 ? "bag" : i % 7 === 2 ? "shoebox" : null) : null;
    const expr: Expr = (["smile", "grin", "smile_closed", "relief"] as Expr[])[i % 4];
    const view = viewOf(cam, px, pz, 0, dirZ);
    const fo: FrontOpts = { mode: "stroll", phase, expr, prop, blink: lidAt(t, i + seedBase) };
    const so: SideOpts = { mode: "march", phase, expr, stomp: 0.6, stride: 0.85 * view.fs };
    out.places.push(person(cam, who, px, 0, pz, view, fo, so, kid ? 0.72 : 1));
    blob(out, px, 0, pz, kid ? 0.72 : 1);
  }
};

// ---------------- district staging ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);

  // 1) Hook & Finale Mall Plaza (Shots 1, 14)
  if (s.district === "mall_hook" || s.district === "mall_finale") {
    const finale = s.district === "mall_finale";
    const henry: Who = { i: 1, o: finale ? HENRY_OLDER : HENRY_YOUNG, okey: finale ? "henry_old" : "henry_y" };
    // Henry stands right beside the shoe pedestal at (0, 0, -224.2)
    const wave = finale && t > 64.5 ? q(Math.sin(t * 7), 30) : undefined;
    out.places.push(person(cam, henry, 1.05, 0, Z_MALL[2] + 15.8, { side: false, mirror: false },
      { mode: "stand", expr: finale ? "grin" : "smile", prop: finale ? null : "shoebox", wave, blink: lidAt(t, 1), facing: -1 }, {}));
    blob(out, 1.05, 0, Z_MALL[2] + 15.8, 1.05);
    // Weekend crowd strolling across the grand SM plaza
    strollers(cam, t, out, finale ? 34 : 18, 100, -14, 14, Z_MALL[2] - 8, Z_MALL[2] + 22, -1, true);
    if (finale) {
      // Joyful families right beside the plaza foreground
      for (let i = 0; i < 6; i++) {
        const px = -6 + i * 2.4, pz = Z_MALL[2] + 10 + (i % 2) * 2.5;
        const kid = i % 3 === 1;
        const o = kid ? KID : FOLK[(i + 2) % FOLK.length];
        out.places.push(person(cam, { i: 50 + i, o, okey: kid ? "kid" : `f${(i + 2) % 12}` }, px, 0, pz, { side: false, mirror: false },
          { mode: "stand", expr: "laugh", prop: i % 2 === 0 ? "bag" : "icecream", wave: q(Math.sin(t * 8 + i), 30), blink: lidAt(t, 50 + i) }, {}, kid ? 0.72 : 1));
        blob(out, px, 0, pz, kid ? 0.72 : 1);
      }
    }
  }

  // 2) 1958 Carriedo Manila Street (Shot 2)
  if (s.district === "manila") {
    const henry: Who = { i: 1, o: HENRY_YOUNG, okey: "henry_y" };
    // Henry proudly outside ShoeMart doorway (on sidewalk y = 0.14) holding a shoebox
    out.places.push(person(cam, henry, 0.25, 0.14, -17.5, { side: false, mirror: false },
      { mode: "stand", expr: "grin", prop: "shoebox", blink: lidAt(t, 1), facing: 0 }, {}));
    blob(out, 0.25, 0.14, -17.5);
    // Early customers admiring the display window & walking along Carriedo
    out.places.push(person(cam, { i: 12, o: FOLK[0], okey: "fil0" }, -1.5, 0.14, -16.2, { side: false, mirror: false },
      { mode: "stand", expr: "smile", look: 1, blink: lidAt(t, 12), facing: 1 }, {}));
    blob(out, -1.5, 0.14, -16.2);
    out.places.push(person(cam, { i: 13, o: FOLK[3], okey: "fil3" }, 2.1, 0.14, -15.8, { side: false, mirror: false },
      { mode: "stand", expr: "smile_closed", prop: "shoebox", blink: lidAt(t, 13), facing: -1 }, {}));
    blob(out, 2.1, 0.14, -15.8);
    strollers(cam, t, out, 10, 200, -14, 14, -14, -4, 1, false);
  }

  // 3) 1970s Expanded ShoeMart (Shot 3)
  if (s.district === "manila_exp") {
    const henry: Who = { i: 1, o: HENRY_YOUNG, okey: "henry_y" };
    out.places.push(person(cam, henry, -2.5, 0.14, -17.2, { side: false, mirror: false },
      { mode: "stand", expr: "laugh", wave: q(Math.sin(t * 7), 30), blink: lidAt(t, 1) }, {}));
    blob(out, -2.5, 0.14, -17.2);
    // Happy family of 4 walking toward camera laden with bags/shoeboxes
    const famX = [-0.7, 0.15, 0.9, 1.65];
    famX.forEach((fx, idx) => {
      const kid = idx === 1 || idx === 2;
      const o = kid ? KID : FOLK[(idx + 4) % FOLK.length];
      const ph = q((t * 1.1 + idx * 0.2) % 1, 120);
      const pz = -14.0 + (t - 12.1) * 0.15;
      out.places.push(person(cam, { i: 30 + idx, o, okey: kid ? "kid" : `fil${(idx + 4) % 12}` }, fx, 0, pz, { side: false, mirror: false },
        { mode: "stroll", phase: ph, expr: "grin", prop: idx === 0 ? "bag" : idx === 3 ? "shoebox" : "icecream", blink: lidAt(t, 30 + idx) }, {}, kid ? 0.72 : 1));
      blob(out, fx, 0, pz, kid ? 0.72 : 1);
    });
    // Background strollers on left/right wings so none wrap into S3c close-up
    strollers(cam, t, out, 8, 250, -13, -4.5, -17.5, -13.5, -1, true);
    strollers(cam, t, out, 8, 265, 4.5, 13, -17.5, -13.5, -1, true);
  }

  // 4) 1980s Economic Crisis Corner (Shot 4, golden)
  if (s.district === "qc_crisis") {
    const henry: Who = { i: 1, o: HENRY_OLDER, okey: "henry_old" };
    out.places.push(person(cam, henry, Z_QC[0] - 1.5, 0, -1.8, { side: false, mirror: false },
      { mode: "stand", expr: "stern", prop: "blueprint", blink: lidAt(t, 1), facing: 1 }, {}));
    blob(out, Z_QC[0] - 1.5, 0, -1.8);
    // Worried/shocked townsfolk pointing & shaking heads
    const spots: [number, number, Expr][] = [
      [Z_QC[0] - 3.6, -2.6, "nervous"],
      [Z_QC[0] + 0.8, -0.8, "shock"],
      [Z_QC[0] + 2.5, 1.4, "nervous"],
      [Z_QC[0] - 2.4, 2.2, "pained"],
    ];
    spots.forEach(([x, z, ex], i) => {
      out.places.push(person(cam, { i: 300 + i, o: FOLK[i % FOLK.length], okey: `fil${i % FOLK.length}` }, x, 0, z, { side: false, mirror: false },
        { mode: "stand", expr: ex, look: 1, blink: lidAt(t, 300 + i), facing: -1 }, {}));
      blob(out, x, 0, z);
    });
  }

  // 5) Quezon City Construction Site (Shot 5)
  if (s.district === "qc_build") {
    const henry: Who = { i: 1, o: { ...HENRY_OLDER, hat: "hardhat" }, okey: "henry_hh" };
    out.places.push(person(cam, henry, Z_QC[0] + 6.5, 0, 8.2, { side: false, mirror: false },
      { mode: "stand", expr: "grin", prop: "blueprint", blink: lidAt(t, 1), facing: 1 }, {}));
    blob(out, Z_QC[0] + 6.5, 0, 8.2);
    // Construction workers hammering & building
    const workSpots: [number, number][] = [[Z_QC[0] + 9.2, 10.5], [Z_QC[0] + 12.8, 11.2], [Z_QC[0] + 16.5, 9.8], [Z_QC[0] + 11.0, 14.0]];
    workSpots.forEach(([x, z], i) => {
      const hk = q(Math.abs(Math.sin((t * 2.4 + i * 0.4) * Math.PI)), 20);
      out.places.push(person(cam, { i: 400 + i, o: WORKER, okey: "worker" }, x, 0, z, { side: false, mirror: false },
        { mode: "stand", expr: "stern", prop: ["hammer", hk], blink: lidAt(t, 400 + i), facing: 1 }, {}));
      blob(out, x, 0, z);
      if (hk > 0.92) {
        out.fx.push({ key: `burst${q(hk - 0.9, 10)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, (hk - 0.9) * 10), x: x + 0.4, y: 1.4, z, w: 0.7, h: 0.7 });
      }
    });
  }

  // 6) 1985 SM North EDSA Opens Its Doors (Shot 6)
  if (s.district === "mall_open") {
    const henry: Who = { i: 1, o: HENRY_OLDER, okey: "henry_old" };
    const opened = t >= RIBBON_CUT;
    out.places.push(person(cam, henry, -1.6, 0, Z_MALL[2] - 10.2, { side: false, mirror: false },
      { mode: "stand", expr: opened ? "laugh" : "smile", wave: opened ? q(Math.sin(t * 8), 30) : undefined, blink: lidAt(t, 1), facing: 1 }, {}));
    blob(out, -1.6, 0, Z_MALL[2] - 10.2);
    if (opened && t < RIBBON_CUT + 0.5) {
      const u = (t - RIBBON_CUT) / 0.5;
      out.fx.push({ key: `burst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x: 0, y: 1.5, z: Z_MALL[2] - 10.8, w: 1.8, h: 1.8 });
    }
    // Crowd rushing inside once the doors open!
    const rush = opened ? Math.min(6, (t - RIBBON_CUT) * 2.2) : 0;
    for (let i = 0; i < 16; i++) {
      const fx = -3.4 + (i % 5) * 1.7 + (hh(i, 2) - 0.5) * 0.4;
      const fz = Z_MALL[2] - 7.5 + Math.floor(i / 5) * 1.6 - rush;
      const kid = i % 4 === 3;
      const o = kid ? KID : FOLK[i % FOLK.length];
      const ph = opened ? q((t * 1.5 + i * 0.17) % 1, 120) : 0;
      out.places.push(person(cam, { i: 500 + i, o, okey: kid ? "kid" : `fil${i % FOLK.length}` }, fx, 0, fz, { side: false, mirror: false },
        { mode: opened ? "march" : "stand", phase: ph, expr: opened ? "grin" : "smile", blink: lidAt(t, 500 + i) }, {}, kid ? 0.72 : 1));
      blob(out, fx, 0, fz, kid ? 0.72 : 1);
    }
  }

  // 7) Hot Sunny City Street Contrast (Shot 7)
  if (s.district === "manila_hot") {
    for (let i = 0; i < 8; i++) {
      const px = -4 + i * 1.3 + (hh(i, 7) - 0.5) * 0.5, pz = -13 + (i % 3) * 3.2;
      const ph = q((t * 0.7 + i * 0.25) % 1, 120);
      out.places.push(person(cam, { i: 600 + i, o: FOLK[i % FOLK.length], okey: `fil${i % FOLK.length}` }, px, 0, pz, { side: false, mirror: false },
        { mode: "stroll", phase: ph, expr: "pained", prop: i % 2 === 0 ? "sweat" : null, blink: lidAt(t, 600 + i) }, {}));
      blob(out, px, 0, pz);
      if (i % 3 === 0) {
        const u = q((t * 0.9 + i * 0.3) % 1, 20);
        out.fx.push({ key: `heat${u}`, cw: 300, ch: 300, draw: (p) => fxHeat(p, u), x: px, y: 2.3, z: pz, w: 0.9, h: 0.9, soft: true });
      }
    }
  }

  // 8-9) Cool Indoor Mall Atrium (Shots 8, 9)
  if (s.district === "atrium" || s.district === "atrium_relax") {
    const relax = s.district === "atrium_relax";
    // Cool air wisps drifting down from upper AC vents
    for (let i = 0; i < 5; i++) {
      const u = q((t * 0.75 + i * 0.2) % 1, 25);
      out.fx.push({ key: `cool${u}`, cw: 400, ch: 300, draw: (p) => fxCoolAir(p, u),
        x: Z_ATRIUM[0] - 6 + i * 3.0, y: 3.4 - u * 0.4, z: -6 + (i % 2) * 5, w: 1.6, h: 1.2, soft: true });
    }
    if (relax) {
      // Non-shoppers enjoying the cool mall IN FRONT of the fountain (z = +3.2..+4.2, clear of fountain radius 2.5)
      out.places.push(person(cam, { i: 701, o: KID, okey: "kid" }, Z_ATRIUM[0] - 1.5, 0, 3.8, { side: false, mirror: false },
        { mode: "stand", expr: "lick", prop: "icecream", blink: lidAt(t, 701) }, {}, 0.72));
      blob(out, Z_ATRIUM[0] - 1.5, 0, 3.8, 0.72);
      out.places.push(person(cam, { i: 702, o: FOLK[4], okey: "fil4" }, Z_ATRIUM[0] - 0.1, 0, 3.5, { side: false, mirror: false },
        { mode: "sit", expr: "relief", prop: "newspaper", blink: lidAt(t, 702) }, {}));
      blob(out, Z_ATRIUM[0] - 0.1, 0, 3.5);
      out.places.push(person(cam, { i: 703, o: FOLK[2], okey: "fil2" }, Z_ATRIUM[0] - 2.6, 0, 3.4, { side: false, mirror: false },
        { mode: "sit", expr: "relief_open", blink: lidAt(t, 703), facing: 1 }, {}));
      blob(out, Z_ATRIUM[0] - 2.6, 0, 3.4);
      out.places.push(person(cam, { i: 704, o: FOLK[6], okey: "fil6" }, Z_ATRIUM[0] + 1.2, 0, 3.3, { side: false, mirror: false },
        { mode: "stand", expr: "smile_closed", blink: lidAt(t, 704), facing: -1 }, {}));
      blob(out, Z_ATRIUM[0] + 1.2, 0, 3.3);
    } else {
      // Shoppers, diners, cinema-goers with popcorn, families strolling
      strollers(cam, t, out, 22, 720, Z_ATRIUM[0] - 10, Z_ATRIUM[0] + 10, -10, 8, -1, true);
      // Cinema popcorn duo on the left near cinema marquee
      for (let i = 0; i < 3; i++) {
        const px = Z_ATRIUM[0] - 6.5 + i * 1.4, pz = -8.5 + (i % 2) * 0.9;
        out.places.push(person(cam, { i: 750 + i, o: i === 1 ? KID : FOLK[i + 1], okey: i === 1 ? "kid" : `fil${i + 1}` },
          px, 0, pz, { side: false, mirror: false },
          { mode: "stand", expr: "laugh", prop: i === 0 ? "popcorn" : i === 2 ? "icecream" : null, blink: lidAt(t, 750 + i) }, {}, i === 1 ? 0.72 : 1));
        blob(out, px, 0, pz, i === 1 ? 0.72 : 1);
      }
    }
  }

  // 10-11) Flywheel Plaza & Megamall (Shots 10, 11)
  if (s.district === "mall_flywheel" || s.district === "mall_mega") {
    const cnt = s.district === "mall_flywheel" ? 28 : 24;
    strollers(cam, t, out, cnt, 800, -18, 18, Z_MALL[2] - 8, Z_MALL[2] + 22, -1, true);
    if (s.district === "mall_flywheel") {
      // Spinning coins / growth bursts above new storefronts
      for (let i = 0; i < 4; i++) {
        const u = q((t * 1.1 + i * 0.25) % 1, 24);
        out.fx.push({ key: `coin${u}`, cw: 200, ch: 200, draw: (p) => fxCoin(p, u),
          x: -11 + i * 7.3, y: 4.5 + 0.3 * Math.sin(t * 4 + i), z: Z_MALL[2] - 10, w: 1.0, h: 1.0 });
      }
    }
  }

  // 12) Mall of Asia Waterfront (Shot 12)
  if (s.district === "moa") {
    strollers(cam, t, out, 20, 900, Z_MOA[0] - 14, Z_MOA[0] + 14, Z_MOA[2] + 3, Z_MOA[2] + 18, -1, true);
    const henry: Who = { i: 1, o: HENRY_OLDER, okey: "henry_old" };
    out.places.push(person(cam, henry, Z_MOA[0] + 4.5, 0, Z_MOA[2] + 6, { side: false, mirror: false },
      { mode: "stand", expr: "grin", blink: lidAt(t, 1) }, {}));
    blob(out, Z_MOA[0] + 4.5, 0, Z_MOA[2] + 6);
  }

  // 13) Empire Sectors: Banking, Hotels, Real Estate (Shot 13, golden)
  if (s.district === "empire") {
    strollers(cam, t, out, 16, 950, Z_EMPIRE[0] - 24, Z_EMPIRE[0] + 24, Z_EMPIRE[2] + 6, Z_EMPIRE[2] + 22, 1, false);
    for (let i = 0; i < 3; i++) {
      const u = q((t * 1.0 + i * 0.33) % 1, 24);
      out.fx.push({ key: `coin${u}`, cw: 200, ch: 200, draw: (p) => fxCoin(p, u),
        x: Z_EMPIRE[0] - 18 + i * 18, y: 12.5, z: Z_EMPIRE[2] + 2, w: 1.3, h: 1.3 });
    }
  }

  // Water ripples at MOA waterfront (Shot 12) or indoor fountain (Shots 8, 9)
  if (s.district === "atrium" || s.district === "atrium_relax") {
    const u = q((t * 0.6) % 1, 30);
    out.fx.push({ key: `ring${u}`, cw: 600, ch: 600, draw: (p) => fxRing(p, u), x: Z_ATRIUM[0], y: 0.42, z: Z_ATRIUM[2], w: 2.6, h: 2.6, flat: true });
  }

  return out;
};
