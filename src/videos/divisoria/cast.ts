// Stages animated 2D bean-head Filipino townsfolk, planner/engineer, teacher, and kids on the NOINK layer for DivisoriaShort.
import * as THREE from "three";
import { NOINK } from "../../shared/ink";
import { cardShade, blobMaterial, CARD_K } from "../../shared/cardshade";
import {
  Pen, type Outfit, type Expr, type FrontOpts,
  KID, WORKER, SCIENTIST, filipino,
  bodyFront, fxShadow, fxContact, fxBurst, fxPuff, fxWind,
} from "../lapaz/toon";
import {
  Z_PLAZA, Z_PAPER, Z_EMBER, Z_MAP,
  HOOK_FIRE_T, PLAZA_GATHER_T, PLAN_PAKAY_T, FIRE_SIDE_T, BLOCK_GAP_T,
  IGNITE_1_T, GAP_BURN_T, EMBER_WIND_T, MATERIAL_T, MAP_HIGHLIGHT_T, QUESTION_T,
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

const O_CITIZEN_A: Outfit = { ...filipino(0), jacket: "#4f7296", hat: "hair", hair: "#342622" };
const O_CITIZEN_B: Outfit = { ...filipino(2), jacket: "#d46a4e", hat: "hair", hair: "#241d24" };
const O_TEACHER: Outfit   = { ...SCIENTIST, jacket: "#f2ece0", glasses: true };
const O_PLANNER: Outfit   = { ...WORKER, jacket: "#e07b2e", hat: "hardhat" };

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const places: Place[] = [];
  const fx: FxPlace[] = [];
  const bob = (spd: number, amp = 0.025) => Math.abs(Math.sin(t * spd)) * amp;

  if (id === 1 || id === 9) {
    // Hook & Loop: Townsfolk on safe right edge of Divisoria watching the fire halted across the plaza
    const [ox, , oz] = Z_PLAZA;
    const burning = id === 1 ? t >= HOOK_FIRE_T : t >= QUESTION_T;
    addActor(places, "cit1a", O_CITIZEN_A, ox + 1.8, 0.28 + bob(3.0), oz - 2.6, burning ? "shock" : "grin", -1, cam, { lift: 0.28, wave: burning ? 0.5 : 0.2 }, 0.04);
    addActor(places, "kid1",  KID,         ox + 0.8, 0.28 + bob(3.9, 0.035), oz - 1.9, burning ? "shock" : "grin", -1, cam, { lift: 0.32, wave: 0.35 }, -0.04);
    addActor(places, "cit1b", O_CITIZEN_B, ox + 3.4, 0.05 + bob(2.6, 0.022), oz - 3.6, burning ? "nervous" : "neutral", -1, cam, { wave: 0.15 });
    if (burning) sparkleFx(fx, "hk", ox - 5.8, 4.6, oz - 5.4, t * 1.1, 1.15, "#ffaa44");
  } else if (id === 2) {
    // Early 1900s Town Overview: townsfolk strolling through the open central plaza
    const [ox, , oz] = Z_PLAZA;
    addActor(places, "cit2a", O_CITIZEN_A, ox - 0.8 + Math.sin(t * 0.4) * 0.4, 0.28 + bob(3.2), oz - 2.4, "grin", 1, cam, { wave: 0.2 });
    addActor(places, "cit2b", O_CITIZEN_B, ox + 1.1 - Math.sin(t * 0.35) * 0.3, 0.28 + bob(2.9), oz - 4.2, "grin", -1, cam, { prop: "bag" });
    addActor(places, "kid2",  KID,         ox + 0.1, 0.28 + bob(4.0, 0.03), oz - 0.8, "laugh", 1, cam, { lift: 0.25, wave: 0.45 });
  } else if (id === 3) {
    // Plaza Gathering -> Hidden Firebreak Purpose (planner with blueprint)
    const [ox, , oz] = Z_PLAZA;
    const planFocus = t >= PLAN_PAKAY_T - 1.4;
    const gather = t >= PLAZA_GATHER_T;
    addActor(places, "cit3a", O_CITIZEN_B, ox + 1.2, 0.28 + bob(3.1), oz - 2.1, gather ? "laugh" : "grin", -1, cam, { prop: "bag", wave: 0.35 });
    addActor(places, "kid3",  KID,         ox + 0.2, 0.28 + bob(4.1, 0.035), oz - 1.4, "laugh", 1, cam, { prop: "icecream", lift: 0.3 });
    addActor(places, "plan3", O_PLANNER,   ox - 1.1, 0.28 + bob(2.7, 0.02), oz - 2.4, planFocus ? "stern" : "grin", 1, cam, { prop: "blueprint", lift: planFocus ? 0.38 : 0.18 });
    if (planFocus) sparkleFx(fx, "pl3", ox - 1.1, 2.3, oz - 2.4, t * 0.9, 0.85, "#ffe46b");
  } else if (id === 4) {
    // Golden Firebreak: Left side ablaze while right side stays safe across Divisoria
    const [ox, , oz] = Z_PLAZA;
    const blazed = t >= FIRE_SIDE_T;
    const blocked = t >= BLOCK_GAP_T;
    addActor(places, "plan4", O_PLANNER,   ox + 1.9, 0.28 + bob(3.5), oz - 2.2, blazed ? "shock" : "stern", -1, cam, { prop: "blueprint", lift: 0.35 }, 0.04);
    addActor(places, "cit4b", O_CITIZEN_B, ox + 3.2, 0.05 + bob(3.8, 0.03), oz - 3.0, blocked ? "relief" : "shock", -1, cam, { lift: 0.42, wave: 0.5 }, 0.05);
    addActor(places, "kid4",  KID,         ox + 2.4, 0.28 + bob(4.2, 0.035), oz - 1.2, blazed ? "shock" : "nervous", -1, cam, { lift: 0.38, wave: 0.45 });
    if (blazed) {
      const k = q(((t - FIRE_SIDE_T) * 0.65) % 1, 0.07);
      fx.push({ key: `smk4:${k}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: ox - 5.6, y: 4.5, z: oz - 5.4, w: 3.4, h: 2.8 });
      sparkleFx(fx, "fr4", ox - 5.6, 4.4, oz - 5.4, t * 1.15, 1.25, "#ff8b38");
    }
  } else if (id === 5 || id === 6) {
    // Workshop table with paper strips: teacher & kid clearly visible behind the lowered tabletop
    const [ox, , oz] = Z_PAPER;
    const burning = id === 5 ? t >= IGNITE_1_T : t >= GAP_BURN_T;
    addActor(places, "teach5", O_TEACHER, ox - 1.3, 0.32 + bob(2.7, 0.02), oz - 1.9, burning ? "shock" : "grin", 1, cam, { prop: "blueprint", lift: 0.32 }, 0, 1.0);
    addActor(places, "kid5",   KID,       ox + 1.3, 0.52 + bob(3.8, 0.035), oz - 1.8, id === 6 && t >= GAP_BURN_T + 0.6 ? "relief" : (burning ? "shock" : "grin"), -1, cam, { lift: 0.35, wave: burning ? 0.5 : 0.25 }, 0, 1.02);
    if (id === 5 && burning) {
      sparkleFx(fx, "p5", ox, 2.3, oz + 0.1, (t - IGNITE_1_T) * 1.4, 0.9, "#ff9e3d");
    } else if (id === 6 && burning) {
      sparkleFx(fx, "p6", ox - 1.4, 2.2, oz + 0.1, (t - GAP_BURN_T) * 1.2, 0.85, "#ff9e3d");
    }
  } else if (id === 7) {
    // Golden-hour wind, embers & stone vs timber comparison
    const [ox, , oz] = Z_EMBER;
    const windy = t >= EMBER_WIND_T;
    const matFocus = t >= MATERIAL_T;
    addActor(places, "plan7", O_PLANNER, ox + 1.7, bob(2.8, 0.02), oz + 2.4, matFocus ? "grin" : (windy ? "shock" : "stern"), -1, cam, { prop: "blueprint", lift: 0.28 }, 0, 0.86);
    addActor(places, "kid7",  KID,       ox + 3.4, bob(3.8, 0.035), oz + 2.5, matFocus ? "relief" : "shock", -1, cam, { lift: 0.32, wave: 0.4 }, 0, 0.86);
    if (windy) {
      const wk = q((t * 0.9) % 1, 0.07);
      fx.push({ key: `wnd7:${wk}`, cw: 400, ch: 220, draw: (p) => fxWind(p, wk, false), x: ox - 2.6, y: 3.8, z: oz + 0.4, w: 3.4, h: 1.5 });
      fx.push({ key: `wnd7b:${wk}`, cw: 400, ch: 220, draw: (p) => fxWind(p, wk, false), x: ox + 2.4, y: 3.8, z: oz + 0.4, w: 3.8, h: 1.5 });
    }
  } else if (id === 8) {
    // 3D City Relief Map: planner & teacher standing clearly behind the map table
    const [ox, , oz] = Z_MAP;
    const lit = t >= MAP_HIGHLIGHT_T;
    addActor(places, "plan8",  O_PLANNER, ox - 2.2, 0.35 + bob(2.7, 0.02), oz - 4.7, "grin", 1, cam, { prop: "blueprint", lift: 0.32 }, 0, 1.05);
    addActor(places, "teach8", O_TEACHER, ox + 2.6, 0.35 + bob(2.6, 0.02), oz - 4.6, lit ? "laugh" : "grin", -1, cam, { lift: 0.28, wave: 0.35 }, 0, 1.05);
    if (lit) sparkleFx(fx, "mp8", ox + 0.6, 2.2, oz, (t - MAP_HIGHLIGHT_T) * 1.1, 1.0, "#ffe46b");
  }

  return { places, fx };
};
