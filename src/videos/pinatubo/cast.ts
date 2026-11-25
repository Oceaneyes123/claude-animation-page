// Cast staging for "Ang Bulkang Nagpalamig sa Buong Mundo" (Mount Pinatubo, 1991):
// Camera-facing lit 2D character cards on NOINK layer + contact shadow blobs + 2D effects.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, KID, filipino, GEOLOGIST, SCIENTIST, CHILLY_FOLK,
  fxBurst, fxCreak, fxFrost, fxAshPuff, fxRain, fxHeat, fxCoolAir, fxContact, fxShadow,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, SHOTS, Z_STRAT, Z_CAR, Z_LAB, SMOKE_T, ERUPT_T, SUNSHADE_T, UMBRELLA_T,
  clamp01,
} from "./story";
import { NOINK } from "../../shared/ink";
import { cardShade, blobMaterial, CARD_K } from "../../shared/cardshade";

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
const CHILLY = Array.from({ length: 4 }, (_, v) => CHILLY_FOLK(v));
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.4 ? [1800, 3000, 3.0] : d < 7.0 ? [1080, 1800, 1.8] : d < 18 ? [480, 800, 0.8] : [240, 400, 0.4];

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

const strollers = (cam: CamInfo, t: number, out: Stage, count: number, seedBase: number, x0: number, x1: number, z0: number, z1: number, dirX = 1) => {
  for (let i = 0; i < count; i++) {
    const sp = 0.65 + hh(i + seedBase, 1) * 0.45;
    const span = x1 - x0;
    const px = x0 + (((hh(i + seedBase, 2) * span + (dirX > 0 ? 1 : -1) * sp * t) % span) + span) % span;
    const pz = z0 + hh(i + seedBase, 3) * (z1 - z0);
    const kid = i % 5 === 4;
    const o = kid ? KID : FOLK[i % FOLK.length];
    const who: Who = { i: i + seedBase, o, okey: kid ? "kid" : `fil${i % FOLK.length}` };
    const phase = q((t * sp / 1.4 + hh(i + seedBase, 4)) % 1, 120);
    const expr: Expr = (["smile", "grin", "smile_closed", "relief"] as Expr[])[i % 4];
    const view = viewOf(cam, px, pz, dirX, 0);
    const fo: FrontOpts = { mode: "stroll", phase, expr, blink: lidAt(t, i + seedBase) };
    const so: SideOpts = { mode: "march", phase, expr, stomp: 0.6, stride: 0.85 * view.fs };
    out.places.push(person(cam, who, px, 0, pz, view, fo, so, kid ? 0.72 : 1));
    blob(out, px, 0, pz, kid ? 0.72 : 1);
  }
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);

  // 1) Hook: Chilly townsfolk shivering in Zambales plaza with icy breath wisps
  if (s.district === "hook") {
    const spots: [number, number, number][] = [[-1.6, 4.2, 1], [-0.3, 3.8, -1], [1.1, 4.4, -1]];
    spots.forEach(([x, z, facing], i) => {
      const shiver = q(Math.sin(t * 28 + i * 1.4) * 2.5, 16);
      out.places.push(person(cam, { i: 10 + i, o: CHILLY[i], okey: `chilly${i}` }, x, 0, z, { side: false, mirror: false },
        { mode: "stand", expr: "pained", tilt: shiver, headTilt: -shiver * 0.6, blink: lidAt(t, 10 + i), facing: facing as -1 | 1 }, {}));
      blob(out, x, 0, z);
      const u = q((t * 0.8 + i * 0.33) % 1, 20);
      out.fx.push({ key: `frost${u}`, cw: 300, ch: 300, draw: (p) => fxFrost(p, u), x: x + 0.35, y: 1.45, z: z + 0.15, w: 0.9, h: 0.9, soft: true });
    });
  }

  // 2) Dormant: Peaceful Zambales valley town
  if (s.district === "dormant") {
    strollers(cam, t, out, 14, 100, -18, 18, -14, 10, 1);
  }

  // 3) April 1991 Smoke: Geologist & townsfolk watching summit + steam puffs rising
  if (s.district === "smoke") {
    const geo: Who = { i: 21, o: GEOLOGIST, okey: "geologist" };
    out.places.push(person(cam, geo, -0.4, 0, 3.2, { side: false, mirror: false },
      { mode: "stand", expr: "nervous", prop: "blueprint", headTilt: -8, blink: lidAt(t, 21), facing: 1 }, {}));
    blob(out, -0.4, 0, 3.2);
    out.places.push(person(cam, { i: 22, o: FOLK[2], okey: "fil2" }, 1.2, 0, 3.6, { side: false, mirror: false },
      { mode: "stand", expr: "shock", headTilt: -10, blink: lidAt(t, 22), facing: -1 }, {}));
    blob(out, 1.2, 0, 3.6);
    out.fx.push({ key: `creak${q(t * 2, 12)}`, cw: 300, ch: 300, draw: (p) => fxCreak(p, t), x: -0.4, y: 2.25, z: 3.2, w: 0.85, h: 0.85 });

    // Small steam/ash puffs above Pinatubo crater
    for (let i = 0; i < 3; i++) {
      const u = q(((t - SMOKE_T) * 0.32 + i * 0.33 + 10) % 1, 20);
      out.fx.push({ key: `ashSm${u}`, cw: 400, ch: 400, draw: (p) => fxAshPuff(p, u, "#c4c8d1"),
        x: (i - 1) * 3.5, y: 41 + u * 12, z: -95, w: 12, h: 12, soft: true });
    }
  }

  // 4) June 15 Eruption (golden): Townsfolk marveling far from volcano + massive burst at ERUPT_T
  if (s.district === "eruption") {
    if (t >= ERUPT_T && t < ERUPT_T + 1.1) {
      const u = q((t - ERUPT_T) / 1.1, 24);
      out.fx.push({ key: `eruptBurst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#ffe08a"),
        x: 0, y: 41, z: -95, w: 28, h: 28 });
    }
    for (let i = 0; i < 4; i++) {
      const u = q((t * 0.45 + i * 0.25) % 1, 20);
      out.fx.push({ key: `ashBig${u}`, cw: 400, ch: 400, draw: (p) => fxAshPuff(p, u, "#a89894"),
        x: (i - 1.5) * 6, y: 42 + u * 28, z: -92, w: 24, h: 24, soft: true });
    }
  }

  // 5) Suwerte (rain below clouds, dry SO2 above): Rain streaks under Z_STRAT storm clouds
  if (s.district === "suwerte") {
    for (let i = 0; i < 5; i++) {
      const u = q((t * 1.2 + i * 0.2) % 1, 24);
      out.fx.push({ key: `rain${u}`, cw: 400, ch: 400, draw: (p) => fxRain(p, u),
        x: Z_STRAT[0] - 10 + i * 5.0, y: 3.6, z: 0.4, w: 4.8, h: 5.8, soft: true });
    }
  }

  // 7) Sunshade Car Analogy: Driver beside car + heat waves before sunshade -> cool air after!
  if (s.district === "sunshade") {
    const shaded = t >= SUNSHADE_T;
    out.places.push(person(cam, { i: 51, o: FOLK[4], okey: "fil4" }, Z_CAR[0] - 2.1, 0, 0.8, { side: false, mirror: false },
      { mode: "stand", expr: shaded ? "relief" : "pained", prop: shaded ? null : "sweat", blink: lidAt(t, 51), facing: 1 }, {}));
    blob(out, Z_CAR[0] - 2.1, 0, 0.8);
    if (!shaded) {
      const u = q((t * 0.9) % 1, 20);
      out.fx.push({ key: `heat${u}`, cw: 300, ch: 300, draw: (p) => fxHeat(p, u),
        x: Z_CAR[0] - 0.1, y: 2.5, z: 0.6, w: 1.4, h: 1.4, soft: true });
    } else {
      const u = q((t * 0.85) % 1, 24);
      out.fx.push({ key: `coolCar${u}`, cw: 400, ch: 300, draw: (p) => fxCoolAir(p, u),
        x: Z_CAR[0] - 0.6, y: 2.2, z: 1.2, w: 1.8, h: 1.35, soft: true });
    }
  }

  // 8) Global Cooling: Cool breeze wisps sweeping across globe
  if (s.district === "cooling") {
    for (let i = 0; i < 3; i++) {
      const u = q((t * 0.7 + i * 0.33) % 1, 24);
      out.fx.push({ key: `coolGlobe${u}`, cw: 400, ch: 300, draw: (p) => fxCoolAir(p, u),
        x: 240 - 4 + i * 4, y: 11 + (i % 2) * 3, z: -231.5, w: 3.6, h: 2.7, soft: true });
    }
  }

  // 9) NASA & USGS Observatory + Earth-Umbrella Finale
  if (s.district === "observatory") {
    const cheer = t >= UMBRELLA_T;
    out.places.push(person(cam, { i: 81, o: SCIENTIST, okey: "sci1" }, Z_LAB[0] + 0.6, 0, Z_LAB[2] - 8.2, { side: false, mirror: false },
      { mode: "stand", expr: cheer ? "grin" : "smile", prop: "blueprint", wave: cheer ? q(Math.sin(t * 7), 24) : undefined, blink: lidAt(t, 81), facing: 1 }, {}));
    blob(out, Z_LAB[0] + 0.6, 0, Z_LAB[2] - 8.2);
    out.places.push(person(cam, { i: 82, o: GEOLOGIST, okey: "geo2" }, Z_LAB[0] + 2.1, 0, Z_LAB[2] - 7.8, { side: false, mirror: false },
      { mode: "stand", expr: "laugh", wave: cheer ? q(Math.sin(t * 7 + 1), 24) : undefined, blink: lidAt(t, 82), facing: -1 }, {}));
    blob(out, Z_LAB[0] + 2.1, 0, Z_LAB[2] - 7.8);
    if (cheer && t < UMBRELLA_T + 0.8) {
      const u = q((t - UMBRELLA_T) / 0.8, 24);
      out.fx.push({ key: `umbBurst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#d8f0ff"),
        x: Z_LAB[0], y: 8.2, z: Z_LAB[2] - 20, w: 3.5, h: 3.5 });
    }
  }

  return out;
};
