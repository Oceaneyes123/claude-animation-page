// Stages animated 2D bean-head Filipino engineers, scientists, townsfolk, and kids on the NOINK layer for TiwiShort.
import * as THREE from "three";
import { NOINK } from "../../shared/ink";
import { cardShade, blobMaterial, CARD_K } from "../../shared/cardshade";
import {
  Pen, type Outfit, type Expr, type FrontOpts,
  KID, WORKER, SCIENTIST, filipino,
  bodyFront, fxShadow, fxContact, fxBurst, fxWind,
} from "../lapaz/toon";
import {
  Z_HOOK, Z_WELLS, Z_PINWHEEL, Z_TURBINE, Z_GEN, Z_CHAIN,
  HOOK_STEAM_T, POWER_1979_T, WELL_DEEP_T, SEPARATE_T,
  PINWHEEL_IN_T, BLOW_SPIN_T, TURBINE_PUSH_T, GEN_COUPLE_T,
  MAGNET_SPIN_T, COIL_SPARK_T, CHAIN_GEN_T, BULB_LIGHT_T, QUESTION_T,
} from "./story";

export type Req = { key: string; w: number; h: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
export const SU = 0.00216;
const HASH_CAP = 512;
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
const BODY_GEO = (() => {
  const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU);
  g.translate(0, (975 - 500) * SU, 0);
  return g;
})();

export class Pool {
  entries = new Map<string, Req>();
  order: string[] = [];
  tex(req: Req): THREE.CanvasTexture {
    const e = this.entries.get(req.key);
    if (e?.tex) return e.tex;
    const c = document.createElement("canvas");
    c.width = req.w; c.height = req.h;
    const ctx = c.getContext("2d")!;
    req.draw(new Pen(ctx));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 4;
    req.tex = tex;
    this.entries.set(req.key, req);
    this.order.push(req.key);
    while (this.order.length > HASH_CAP) {
      const k = this.order.shift()!;
      this.entries.get(k)?.tex?.dispose();
      this.entries.delete(k);
    }
    return tex;
  }
}

export class Actor {
  card: THREE.Mesh;
  shd: THREE.Mesh;
  mat: THREE.MeshLambertMaterial;
  dmat: THREE.MeshDepthMaterial;
  shMat: THREE.MeshBasicMaterial;
  constructor(pool: Pool) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide }));
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.card = new THREE.Mesh(BODY_GEO, this.mat);
    this.card.customDepthMaterial = this.dmat;
    this.card.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.card.castShadow = false;
    this.card.receiveShadow = true;
    this.card.rotation.order = "YXZ";
    this.card.renderOrder = 1;
    this.card.layers.set(NOINK);

    this.shMat = blobMaterial(blank);
    this.shd = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.shMat);
    this.shd.rotation.x = -Math.PI / 2;
    this.shd.layers.set(NOINK);
    void pool;
  }
  place(pool: Pool, p: Place, cam: CamInfo) {
    const tex = pool.tex(p.req);
    this.mat.map = tex;
    this.mat.needsUpdate = true;
    this.dmat.map = tex;
    this.dmat.needsUpdate = true;
    const sc = p.scale ?? 1;
    this.card.scale.set(p.mirror ? -sc : sc, sc, 1);
    const dx = cam.pos.x - p.x, dz = cam.pos.z - p.z;
    const yaw = Math.atan2(dx, dz);
    this.card.position.set(p.x, p.y, p.z);
    this.card.rotation.set(0, yaw, p.lean ?? 0);
    this.card.visible = true;

    this.shMat.map = pool.tex(p.shReq);
    this.shMat.needsUpdate = true;
    const sw = (p.shW ?? 1.15) * sc;
    this.shd.scale.set(sw, sw * 0.56, 1);
    this.shd.position.set(p.x, p.y + 0.025, p.z);
    this.shd.visible = p.shadow !== false;
  }
  hide() { this.card.visible = false; this.shd.visible = false; }
}

export class Fx {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  constructor() {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.layers.set(NOINK);
  }
  place(pool: Pool, f: FxPlace, cam: CamInfo) {
    this.mat.map = pool.tex({ key: f.key, w: f.cw, h: f.ch, draw: f.draw });
    this.mat.needsUpdate = true;
    this.mesh.scale.set(f.w, f.h, 1);
    this.mesh.position.set(f.x, f.y, f.z);
    if (f.flat) {
      this.mesh.rotation.set(-Math.PI / 2, 0, f.rot ?? 0);
    } else {
      const yaw = Math.atan2(cam.pos.x - f.x, cam.pos.z - f.z);
      this.mesh.rotation.set(0, yaw, f.rot ?? 0);
    }
    this.mesh.visible = true;
  }
  hide() { this.mesh.visible = false; }
}

export type Place = { req: Req; shReq: Req; x: number; y: number; z: number; scale?: number; mirror?: boolean; lean?: number; shW?: number; shadow?: boolean };
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const q = (v: number, s = 0.05) => Math.round(v / s) * s;

const mkReq = (name: string, o: Outfit, opts: FrontOpts): Req => ({
  key: `${name}:${opts.expr ?? "neutral"}:${opts.facing ?? 0}:${q(opts.tilt ?? 0, 0.04)}:${q(opts.phase ?? 0, 0.08)}:${q(opts.lift ?? 0, 0.08)}:${q(opts.wave ?? 0, 0.08)}:${opts.prop ? (Array.isArray(opts.prop) ? `hm:${q(opts.prop[1], 0.08)}` : opts.prop) : "0"}`,
  w: 600,
  h: 1000,
  draw: (p) => bodyFront(p, o, opts),
});

const mkShadow = (col = "#4a4458", contact = false): Req => ({
  key: `${contact ? "c" : "s"}:${col}`,
  w: 128,
  h: contact ? 128 : 256,
  draw: (p) => (contact ? fxContact(p, col) : fxShadow(p, col)),
});

const lightAngle = (cam: CamInfo, x: number, z: number) => {
  if (!cam.sun) return 0.7;
  const sx = cam.sun.x - x, sz = cam.sun.z - z;
  const rx = cam.right.x, rz = cam.right.z;
  return Math.atan2(cam.sun.y, sx * rx + sz * rz);
};

const addActor = (
  places: Place[], name: string, o: Outfit,
  x: number, y: number, z: number, expr: Expr, facing: -1 | 1, cam: CamInfo,
  extra: Partial<FrontOpts> = {}, lean = 0, scale = 0.90,
) => {
  const lgt = lightAngle(cam, x, z);
  const opts: FrontOpts = { mode: "stand", expr, facing, light: lgt, ...extra };
  places.push({
    req: mkReq(name, o, opts),
    shReq: mkShadow("#4c465c", true),
    x, y, z, lean,
    scale: o.build === "kid" ? scale * 0.92 : scale,
    shW: o.build === "kid" ? 0.85 : 1.15,
  });
};

const sparkleFx = (fx: FxPlace[], key: string, x: number, y: number, z: number, phase: number, size = 0.85, col = "#ffe474") => {
  const k = q(phase % 1, 0.06);
  fx.push({
    key: `sp:${key}:${k}:${col}`,
    cw: 500, ch: 500,
    draw: (p) => fxBurst(p, k, col, 8, 22, 110),
    x, y, z, w: size, h: size,
  });
};

const O_ENGINEER: Outfit = { ...WORKER, jacket: "#e07b2e", hat: "hardhat" };
const O_SCIENTIST: Outfit = { ...SCIENTIST, jacket: "#f2ece0", glasses: true };
const O_TOWN_A: Outfit = { ...filipino(0), jacket: "#4f7296", hat: "hair", hair: "#342622" };
const O_TOWN_B: Outfit = { ...filipino(2), jacket: "#d46a4e", hat: "hair", hair: "#241d24" };

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const places: Place[] = [];
  const fx: FxPlace[] = [];
  const bob = (spd: number, amp = 0.024) => Math.abs(Math.sin(t * spd)) * amp;

  if (id === 1 || id === 8) {
    // Hook & Loop: Engineer & Kid in front of the Tiwi geothermal cutaway hillside
    const [ox, , oz] = Z_HOOK;
    const steamOn = id === 1 ? t >= HOOK_STEAM_T : t >= QUESTION_T;
    addActor(places, "eng1", O_ENGINEER, ox - 2.1, bob(2.8), oz - 0.6, steamOn ? "shock" : "grin", 1, cam, { prop: "blueprint", lift: 0.3, wave: steamOn ? 0.4 : 0.15 });
    addActor(places, "kid1", KID,        ox + 1.0, bob(3.8, 0.032), oz - 0.4, steamOn ? "laugh" : "grin", -1, cam, { lift: 0.35, wave: 0.45 });
    addActor(places, "sci1", O_SCIENTIST, ox + 2.2, bob(2.6), oz - 0.9, "grin", -1, cam, { wave: 0.2 });
    if (steamOn) sparkleFx(fx, "hk", ox + 4.4, 6.25, oz - 3.6, t * 1.1, 1.1, "#ffe46b");
  } else if (id === 2) {
    // 1979 Tiwi, Albay Geothermal Plant establishing scene
    const [ox, , oz] = Z_HOOK;
    const powered = t >= POWER_1979_T;
    addActor(places, "eng2", O_ENGINEER,  ox - 1.5, bob(2.9), oz + 0.5, powered ? "laugh" : "stern", 1, cam, { prop: "blueprint", lift: 0.34 });
    addActor(places, "tw2a", O_TOWN_A,    ox + 1.8, bob(3.1), oz + 0.4, powered ? "laugh" : "grin", -1, cam, { lift: 0.32, wave: 0.4 });
    addActor(places, "tw2b", O_TOWN_B,    ox + 3.2, bob(2.7), oz + 0.9, "grin", -1, cam, { prop: "bag" });
    addActor(places, "kid2", KID,         ox + 0.4, bob(4.0, 0.032), oz + 1.0, powered ? "laugh" : "grin", 1, cam, { lift: 0.36, wave: 0.45 });
    if (powered) sparkleFx(fx, "pw2", ox + 4.4, 6.25, oz - 3.6, t * 1.2, 1.25, "#ffe46b");
  } else if (id === 3) {
    // Deep Wells & Cyclone Separator Cutaway
    const [ox, , oz] = Z_WELLS;
    const deep = t >= WELL_DEEP_T;
    const split = t >= SEPARATE_T;
    addActor(places, "eng3", O_ENGINEER,  ox - 3.6, bob(2.8), oz + 0.4, deep ? "stern" : "grin", 1, cam, { prop: "blueprint", lift: 0.32 });
    addActor(places, "sci3", O_SCIENTIST, ox + 3.8, bob(2.6), oz + 0.3, split ? "laugh" : "grin", -1, cam, { lift: 0.3, wave: split ? 0.45 : 0.2 });
    if (split) sparkleFx(fx, "sp3", ox + 1.3, 4.9, oz - 1.2, t * 1.1, 0.95, "#e8f6ff");
  } else if (id === 4) {
    // Toy Pinwheel Analogy ("laruang elisi") on sunlit plaza table
    const [ox, , oz] = Z_PINWHEEL;
    const blow = t >= BLOW_SPIN_T;
    const show = t >= PINWHEEL_IN_T - 0.8;
    addActor(places, "sci4", O_SCIENTIST, ox - 1.3, 0.30 + bob(2.7, 0.02), oz - 1.3, blow ? "whistle" : (show ? "grin" : "neutral"), 1, cam, { lift: 0.3, wave: 0.25 }, 0.03, 1.0);
    addActor(places, "kid4", KID,         ox + 1.5, 0.48 + bob(3.9, 0.032), oz - 1.2, blow ? "laugh" : "grin", -1, cam, { lift: 0.35, wave: blow ? 0.55 : 0.25 }, -0.02, 1.02);
    if (blow) {
      const wk = q((t * 1.2) % 1, 0.07);
      fx.push({ key: `pwnd:${wk}`, cw: 400, ch: 220, draw: (p) => fxWind(p, wk, false), x: ox - 0.35, y: 2.35, z: oz + 0.35, w: 1.55, h: 0.75 });
      sparkleFx(fx, "pw4", ox + 0.3, 2.35, oz + 0.3, t * 1.5, 0.85, "#ffe474");
    }
  } else if (id === 5) {
    // Golden-Hour Turbine + Coupled Generator
    const [ox, , oz] = Z_TURBINE;
    const push = t >= TURBINE_PUSH_T;
    const coupled = t >= GEN_COUPLE_T;
    addActor(places, "eng5", O_ENGINEER, ox - 2.6, bob(2.9), oz + 1.4, push ? "shock" : "stern", 1, cam, { prop: "blueprint", lift: 0.34 }, 0, 0.9);
    addActor(places, "kid5", KID,        ox + 3.2, bob(4.0, 0.03), oz + 1.5, coupled ? "laugh" : "grin", -1, cam, { lift: 0.36, wave: coupled ? 0.55 : 0.25 }, 0, 0.9);
    if (coupled) sparkleFx(fx, "tb5", ox + 1.9, 2.3, oz + 0.5, t * 1.3, 1.0, "#ffe46b");
  } else if (id === 6) {
    // Golden-Hour Inside Generator: Magnet + Coils
    const [ox, , oz] = Z_GEN;
    const spinning = t >= MAGNET_SPIN_T;
    const sparked = t >= COIL_SPARK_T;
    addActor(places, "sci6", O_SCIENTIST, ox - 2.3, bob(2.7), oz + 1.1, sparked ? "laugh" : (spinning ? "shock" : "grin"), 1, cam, { lift: 0.32 }, 0, 0.9);
    addActor(places, "kid6", KID,         ox + 2.2, bob(3.9, 0.03), oz + 1.2, sparked ? "laugh" : "shock", -1, cam, { lift: 0.38, wave: sparked ? 0.55 : 0.3 }, 0, 0.9);
    if (sparked) sparkleFx(fx, "gn6", ox + 2.75, 2.55, oz - 0.1, t * 1.4, 1.15, "#ffe46b");
  } else if (id === 7) {
    // Full Energy Chain -> House Lightbulb
    const [ox, , oz] = Z_CHAIN;
    const lit = t >= BULB_LIGHT_T;
    const genOn = t >= CHAIN_GEN_T;
    addActor(places, "eng7", O_ENGINEER,  ox - 3.6, bob(2.8), oz + 0.9, "grin", 1, cam, { prop: "blueprint", lift: 0.28 }, 0, 0.88);
    addActor(places, "sci7", O_SCIENTIST, ox + 1.0, bob(2.6), oz + 1.1, genOn ? "laugh" : "grin", 1, cam, { lift: 0.3 }, 0, 0.88);
    addActor(places, "kid7", KID,         ox + 4.1, bob(4.1, 0.035), oz + 1.3, lit ? "laugh" : "grin", -1, cam, { lift: lit ? 0.48 : 0.28, wave: lit ? 0.65 : 0.25 }, 0, 0.92);
    if (lit) sparkleFx(fx, "bl7", ox + 5.2, 2.22, oz + 0.95, t * 1.4, 1.35, "#ffe46b");
  }

  return { places, fx };
};
