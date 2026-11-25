// Cast staging for "Ang Disyertong Gawa ng Ilog at Hangin" (La Paz Sand Dunes, Ilocos Norte):
// Camera-facing lit 2D character cards on NOINK layer + contact shadow blobs + 2D effects.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, KID, filipino, TOURIST, FARMER, FISHERMAN,
  fxBurst, fxCreak, fxRain, fxWind, fxSandPuff, fxWaveFoam, fxContact, fxShadow,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, SHOTS, Z_STORM, Z_CONVEYOR, Z_COAST_TOWN, Z_FAN,
  WAVE_T, WIND_T, FAN_T, PILE_T, QUESTION_T, clamp01,
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
const TOURISTS = Array.from({ length: 3 }, (_, v) => TOURIST(v));
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

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);

  // 1) Hook: Puzzled tourist holding umbrella in desert dunes
  if (s.district === "hook") {
    out.places.push(person(cam, { i: 1, o: TOURISTS[0], okey: "tour0" }, -0.3, 0, 4.0, { side: false, mirror: false },
      { mode: "stand", expr: "shock", prop: "umbrella", headTilt: -7, blink: lidAt(t, 1), facing: 1 }, {}));
    blob(out, -0.3, 0, 4.0);
    out.places.push(person(cam, { i: 2, o: KID, okey: "kid" }, 1.1, 0, 4.4, { side: false, mirror: false },
      { mode: "stand", expr: "nervous", headTilt: 6, blink: lidAt(t, 2), facing: -1 }, {}, 0.72));
    blob(out, 1.1, 0, 4.4, 0.72);
    out.fx.push({ key: `creakH${q(t * 2, 12)}`, cw: 300, ch: 300, draw: (p) => fxCreak(p, t), x: -0.3, y: 2.35, z: 4.0, w: 0.85, h: 0.85 });
  }

  // 2) Sahara contrast: Tourists exploring 85 sq km dunes near 4x4 jeepney
  if (s.district === "sahara") {
    for (let i = 0; i < 4; i++) {
      const px = -3.0 + i * 2.2, pz = -8.5 + (i % 2) * 1.4;
      out.places.push(person(cam, { i: 10 + i, o: i === 3 ? KID : TOURISTS[i % 3], okey: i === 3 ? "kid" : `tour${i % 3}` },
        px, 0, pz, { side: false, mirror: false },
        { mode: "stroll", phase: q((t * 0.45 + i * 0.25) % 1, 80), expr: "smile", blink: lidAt(t, 10 + i), facing: i % 2 ? -1 : 1 }, {}, i === 3 ? 0.72 : 1));
      blob(out, px, 0, pz, i === 3 ? 0.72 : 1);
    }
  }

  // 3) Typhoon puzzle: Rain streaks pouring on Laoag street right next to dry dunes
  if (s.district === "typhoon") {
    out.places.push(person(cam, { i: 21, o: FOLK[0], okey: "fil0" }, -0.8, 0, Z_STORM[2] - 1.2, { side: false, mirror: false },
      { mode: "stand", expr: "shock", prop: "umbrella", headTilt: -6, blink: lidAt(t, 21), facing: 1 }, {}));
    blob(out, -0.8, 0, Z_STORM[2] - 1.2);
    out.places.push(person(cam, { i: 22, o: FOLK[4], okey: "fil4" }, 1.2, 0, Z_STORM[2] - 0.8, { side: false, mirror: false },
      { mode: "stand", expr: "nervous", prop: "umbrella", headTilt: 5, blink: lidAt(t, 22), facing: -1 }, {}));
    blob(out, 1.2, 0, Z_STORM[2] - 0.8);
    for (let i = 0; i < 6; i++) {
      const u = q((t * 1.3 + i * 0.18) % 1, 24);
      out.fx.push({ key: `rainS${u}`, cw: 400, ch: 400, draw: (p) => fxRain(p, u),
        x: Z_STORM[0] - 9 + i * 3.6, y: 4.5, z: Z_STORM[2] - 1.8, w: 4.5, h: 6.2, soft: true });
    }
  }

  // 4) Conveyor (Padsan River + Ocean Waves): surf foam pushing sand up the beach
  if (s.district === "conveyor") {
    if (t >= WAVE_T) {
      for (let i = 0; i < 3; i++) {
        const u = q((t * 0.85 + i * 0.33) % 1, 20);
        out.fx.push({ key: `foam${u}`, cw: 500, ch: 200, draw: (p) => fxWaveFoam(p, u),
          x: Z_CONVEYOR[0] + 4 + i * 5.5, y: 0.45, z: 12.5 - u * 4.5, w: 5.5, h: 1.5, flat: true, soft: true });
      }
    }
  }

  // 5) Suwerte: Farmer & Fisherman thriving beside canal and bancas
  if (s.district === "suwerte") {
    out.places.push(person(cam, { i: 31, o: FARMER, okey: "farmer" }, Z_COAST_TOWN[0] - 2.2, 0, Z_COAST_TOWN[2] - 2.0, { side: false, mirror: false },
      { mode: "stand", expr: "grin", wave: q(Math.sin(t * 6), 20), blink: lidAt(t, 31), facing: 1 }, {}));
    blob(out, Z_COAST_TOWN[0] - 2.2, 0, Z_COAST_TOWN[2] - 2.0);
    out.places.push(person(cam, { i: 32, o: FISHERMAN, okey: "fisher" }, Z_COAST_TOWN[0] + 1.8, 0, Z_COAST_TOWN[2] - 2.4, { side: false, mirror: false },
      { mode: "stand", expr: "laugh", prop: "bag", blink: lidAt(t, 32), facing: -1 }, {}));
    blob(out, Z_COAST_TOWN[0] + 1.8, 0, Z_COAST_TOWN[2] - 2.4);
  }

  // 6) Malas (Golden): Amihan/Habagat wind sweeping dried shore sand inland into rising dunes
  if (s.district === "malas") {
    for (let i = 0; i < 4; i++) {
      const u = q((t * 1.15 + i * 0.25) % 1, 24);
      out.fx.push({ key: `windM${u}`, cw: 500, ch: 300, draw: (p) => fxWind(p, u, true),
        x: Z_CONVEYOR[0] + 2 + i * 4.5, y: 2.2 + (i % 2) * 1.6, z: 3.0 - i * 4.5, w: 8.5, h: 4.8, soft: true });
    }
    const pu = q((t * 0.9) % 1, 20);
    out.fx.push({ key: `sandPuffM${pu}`, cw: 400, ch: 300, draw: (p) => fxSandPuff(p, pu),
      x: Z_CONVEYOR[0] + 10, y: 2.0, z: -2.0, w: 7.5, h: 5.5, soft: true });
  }

  // 7) Fan Analogy: Amazed onlooker behind-right of table (clear of sand stream) + wind ribbons building mini-dune
  if (s.district === "fan") {
    const blown = t >= FAN_T;
    const piled = t >= PILE_T;
    out.places.push(person(cam, { i: 51, o: FOLK[3], okey: "fil3" }, Z_FAN[0] + 1.55, 0.35, -1.85, { side: false, mirror: false },
      { mode: "stand", expr: piled ? "grin" : "shock", headTilt: -5, blink: lidAt(t, 51), facing: -1 }, {}));
    if (blown) {
      const wu = q((t * 1.4) % 1, 24);
      out.fx.push({ key: `windFan${wu}`, cw: 500, ch: 300, draw: (p) => fxWind(p, wu, true),
        x: Z_FAN[0] + 0.05, y: 2.02, z: 0.45, w: 2.8, h: 1.65, soft: true });
    }
    if (piled && t < PILE_T + 0.8) {
      const bu = q((t - PILE_T) / 0.8, 24);
      out.fx.push({ key: `pileBurst${bu}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, bu, "#ffe296"),
        x: Z_FAN[0] + 1.15, y: 2.15, z: 0.2, w: 2.0, h: 2.0 });
    }
  }

  // 8) Living Dunes (Golden): Sweeping coastal wind across La Paz Sand Dunes
  if (s.district === "living") {
    for (let i = 0; i < 3; i++) {
      const u = q((t * 0.95 + i * 0.33) % 1, 24);
      out.fx.push({ key: `windL${u}`, cw: 500, ch: 300, draw: (p) => fxWind(p, u, true),
        x: -6 + i * 6.5, y: 3.5 + (i % 2) * 1.4, z: -12 + i * 2, w: 9.0, h: 5.0, soft: true });
    }
  }

  // 9) Loop Question ("Kaya ang tanong..."): Return cleanly to puzzled tourist with umbrella!
  if (s.district === "loop") {
    out.places.push(person(cam, { i: 1, o: TOURISTS[0], okey: "tour0" }, 0.2, 0, 4.0, { side: false, mirror: false },
      { mode: "stand", expr: t >= QUESTION_T ? "shock" : "smile", prop: "umbrella", headTilt: t >= QUESTION_T ? -8 : 0, blink: lidAt(t, 1), facing: -1 }, {}));
    blob(out, 0.2, 0, 4.0);
  }

  return out;
};
