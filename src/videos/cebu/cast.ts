// Stages animated 2D bean-head Filipino townsfolk, priest/caretaker, engineer, and kids on the NOINK layer for CebuShort.
import * as THREE from "three";
import { NOINK } from "../../shared/ink";
import { cardShade, blobMaterial, CARD_K } from "../../shared/cardshade";
import {
  Pen, type Outfit, type Expr, type FrontOpts,
  KID, WORKER, SCIENTIST, filipino,
  bodyFront, fxShadow, fxContact, fxBurst, fxPuff,
} from "../lapaz/toon";
import {
  Z_BASILICA, Z_TABLE, Z_COMPARE,
  HOOK_SHAKE_T, BELL_SWAY_T, COLLAPSE_T, TAP_T, TOWER_WOBBLE_T, COMPARE_T, QUESTION_T,
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

const O_CARETAKER: Outfit = { ...filipino(0), jacket: "#4f7296", hat: "hair", hair: "#342622" };
const O_VISITOR: Outfit = { ...filipino(2), jacket: "#d46a4e", hat: "hair", hair: "#241d24" };
const O_TEACHER: Outfit = { ...SCIENTIST, jacket: "#f2ece0", glasses: true };
const O_ENGINEER: Outfit = { ...WORKER, jacket: "#e07b2e", hat: "hardhat" };

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const places: Place[] = [];
  const fx: FxPlace[] = [];
  const bob = (spd: number, amp = 0.025) => Math.abs(Math.sin(t * spd)) * amp;

  if (id === 1 || id === 9) {
    // Basilica courtyard: caretaker, visitor, and kid looking up at the bell tower
    const [ox, , oz] = Z_BASILICA;
    const shook = id === 1 ? t >= HOOK_SHAKE_T : t >= QUESTION_T;
    addActor(places, "care1", O_CARETAKER, ox - 0.8, bob(2.8), oz - 2.2, shook ? "shock" : "grin", 1, cam, { lift: 0.25, wave: shook ? 0.45 : 0.15 }, 0.03);
    addActor(places, "kid1", KID, ox + 0.55, bob(3.9, 0.035), oz - 1.5, shook ? "shock" : "grin", 1, cam, { lift: 0.32, wave: 0.35 }, -0.04);
    addActor(places, "vis1", O_VISITOR, ox + 4.8, bob(2.6, 0.022), oz - 2.6, shook ? "shock" : "neutral", -1, cam, { wave: 0.2 });
    if (shook) sparkleFx(fx, "hk", ox + 2.6, 8.6, oz - 6.0, t * 0.9, 1.1, "#ffd86b");
  } else if (id === 4) {
    // Golden collapse: shocked caretaker & townsfolk backing away as belfry top crashes down
    const [ox, , oz] = Z_BASILICA;
    const fell = t >= COLLAPSE_T;
    const sway = t >= BELL_SWAY_T;
    addActor(places, "care4", O_CARETAKER, ox - 1.6, bob(4.2, 0.035), oz - 1.6, "shock", 1, cam, { lift: 0.48, wave: 0.55 }, -0.06);
    addActor(places, "vis4", O_VISITOR, ox + 5.1, bob(4.0, 0.035), oz - 1.8, "shock", -1, cam, { lift: 0.45, wave: 0.5 }, 0.06);
    addActor(places, "kid4", KID, ox - 0.3, bob(4.6, 0.04), oz - 0.9, "shock", 1, cam, { lift: 0.5, wave: 0.6 }, -0.05);
    if (fell && t <= COLLAPSE_T + 1.8) {
      const k = q((t - COLLAPSE_T) / 1.8, 0.07);
      fx.push({ key: `dust4a:${k}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: ox + 2.6, y: 1.4, z: oz - 5.2, w: 3.6, h: 2.8 });
      fx.push({ key: `dust4b:${k}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: ox + 2.6, y: 6.2, z: oz - 6.8, w: 2.8, h: 2.4 });
    }
    if (sway) sparkleFx(fx, "col4", ox + 2.6, 8.2, oz - 6.2, t * 1.1, 1.1, "#ff9248");
  } else if (id === 5) {
    // Table & block tower analogy: teacher & kid behind table watching the tap & wobble
    const [ox, , oz] = Z_TABLE;
    const tapped = t >= TAP_T;
    const wob = t >= TOWER_WOBBLE_T;
    addActor(places, "teach5", O_TEACHER, ox - 1.1, bob(2.7, 0.02), oz - 1.85, wob ? "shock" : "grin", 1, cam, { prop: "blueprint", lift: tapped ? 0.35 : 0.15 });
    addActor(places, "kid5", KID, ox + 1.0, 0.35 + bob(3.8, 0.035), oz - 1.75, wob ? "shock" : "grin", 1, cam, { lift: 0.35, wave: wob ? 0.5 : 0.2 });
    if (tapped && t <= TAP_T + 0.9) {
      sparkleFx(fx, "tap5", ox - 2.75, 1.55, oz + 0.2, (t - TAP_T) * 1.6, 0.85, "#ffd55c");
    }
    if (wob) {
      sparkleFx(fx, "wob5", ox + 2.55, 3.65, oz + 0.2, (t - TOWER_WOBBLE_T) * 1.1, 0.85, "#ff9b4a");
    }
  } else if (id === 8) {
    // 3-pad comparison: engineer & kid inspecting bedrock vs soft soil vs braced building
    const [ox, , oz] = Z_COMPARE;
    const shook = t >= COMPARE_T;
    addActor(places, "eng8", O_ENGINEER, ox - 1.9, bob(2.9, 0.02), oz + 2.2, shook ? "shock" : "stern", 1, cam, { prop: "blueprint", lift: 0.25 });
    addActor(places, "kid8", KID, ox + 1.9, bob(3.9, 0.035), oz + 2.3, shook ? "shock" : "grin", -1, cam, { lift: 0.32, wave: 0.4 });
    if (shook) sparkleFx(fx, "cmp8", ox, 3.4, oz + 0.4, (t - COMPARE_T) * 0.95, 0.95, "#ff7840");
  }

  return { places, fx };
};
