// Stages animated 2D bean-head Filipino keepers, biologists, and kids on the NOINK layer for DavaoShort.
import * as THREE from "three";
import { NOINK } from "../../shared/ink";
import { cardShade, blobMaterial, CARD_K } from "../../shared/cardshade";
import {
  Pen, type Outfit, type Expr, type FrontOpts, type Prop,
  KID, WORKER, SCIENTIST, FARMER, filipino,
  bodyFront, fxShadow, fxContact, fxBurst, fxPuff,
} from "../lapaz/toon";
import {
  Z_CENTER, Z_NEST1992, Z_NURSERY, Z_NEST2013, Z_FOREST,
  EGG_HOOK_T, HATCH_92_T, PAGASA_T, CHICK_NEWS_T, MATCH_EGG_T,
  SEED1_T, SEED2_T, GEN2_T, PARENTS_EGG_T, HATCH_13_T, MABUHAY_T, FOREST_WIDE_T, LINK_T,
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
  extra: Partial<FrontOpts> = {}, lean = 0, scale = 0.88,
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

// Davao Sanctuary Cast Outfits
const O_KEEPER_A: Outfit = { ...filipino(0), jacket: "#497b4c", hat: "cap", cap: "#365f3b" };
const O_KEEPER_B: Outfit = { ...SCIENTIST, jacket: "#e2e6dc", glasses: true };
const O_BIOLOGIST: Outfit = { ...filipino(1), jacket: "#547c99", hat: "hair", hair: "#2b1d18" };
const O_GARDENER: Outfit = FARMER;
const O_RANGER: Outfit = { ...WORKER, jacket: "#4f7a44", hat: "cap", cap: "#7a5330" };

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const places: Place[] = [];
  const fx: FxPlace[] = [];
  const bob = (spd: number, amp = 0.026) => Math.abs(Math.sin(t * spd)) * amp;

  if (id === 1 || id === 9) {
    // Shot 1 & Shot 9: Philippine Eagle Center keepers & young visitor admiring hero egg & forest link
    const [ox, , oz] = Z_CENTER;
    const exprK: Expr = id === 9 ? (t >= LINK_T ? "grin" : "shock") : (t >= EGG_HOOK_T ? "shock" : "grin");
    addActor(places, "keep1a", O_KEEPER_A, ox - 1.55, bob(2.8), oz - 0.45, exprK, 1, cam, { prop: "blueprint", lift: 0.25 }, 0.04);
    addActor(places, "kid1", KID, ox + 1.45, bob(4.0, 0.04), oz + 0.05, "shock", -1, cam, { lift: 0.35, wave: 0.4 }, -0.05);
    addActor(places, "keep1b", O_BIOLOGIST, ox + 2.15, bob(2.5, 0.02), oz - 1.65, "grin", -1, cam, { wave: 0.25 });
    sparkleFx(fx, "eg1", ox + 0.38, 1.95, oz + 0.32, t * 0.72, 0.52);
  } else if (id === 2) {
    // Shot 2: 1992 Hatchery — keepers watching closely as Pag-asa hatches!
    const [ox, , oz] = Z_NEST1992;
    const hatched = t >= HATCH_92_T;
    const named = t >= PAGASA_T;
    addActor(places, "bio92a", O_KEEPER_B, ox - 1.55, bob(2.6, 0.02), oz - 1.25, named ? "laugh" : hatched ? "shock" : "stern", 1, cam, { prop: "blueprint", lift: hatched ? 0.3 : 0.1 });
    addActor(places, "keep92b", O_KEEPER_A, ox + 1.55, bob(3.0, 0.022), oz - 1.25, hatched ? "shock" : "grin", -1, cam, { wave: named ? 0.45 : 0.15 });
    if (hatched && t <= PAGASA_T + 1.2) {
      const k = q((t - HATCH_92_T) / 2.2, 0.08);
      fx.push({ key: `pf92:${k}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: ox, y: 1.75, z: oz + 0.15, w: 1.35, h: 1.35 });
    }
    if (named) sparkleFx(fx, "pag92", ox + 0.42, 2.08, oz + 0.22, (t - PAGASA_T) * 0.9, 0.52);
  } else if (id === 3) {
    // Shot 3: 1992 Breeding team celebration around chick Pag-asa!
    const [ox, , oz] = Z_NEST1992;
    const joy = t >= CHICK_NEWS_T;
    addActor(places, "bio93a", O_KEEPER_B, ox - 1.65, bob(3.6, joy ? 0.05 : 0.025), oz - 1.25, joy ? "laugh" : "grin", 1, cam, { lift: 0.4, wave: 0.45 });
    addActor(places, "keep93b", O_KEEPER_A, ox + 1.55, bob(3.9, joy ? 0.055 : 0.025), oz - 1.25, "laugh", -1, cam, { lift: 0.42, wave: 0.5 });
    addActor(places, "kid93", KID, ox + 2.35, bob(4.5, 0.06), oz - 0.45, "shock", -1, cam, { lift: 0.45, wave: 0.6 });
    sparkleFx(fx, "joy93", ox + 0.42, 2.05, oz + 0.25, t * 0.95, 0.55);
  } else if (id === 4) {
    // Shot 4: Golden-hour 2013 match-cut egg -> Pag-asa standing beside nest
    const [ox, , oz] = Z_NEST2013;
    if (t >= MATCH_EGG_T) {
      sparkleFx(fx, "m13", ox + 0.36, 1.98, oz + 0.32, (t - MATCH_EGG_T) * 0.9, 0.48);
    }
  } else if (id === 5) {
    // Shot 5: Nursery "Punlaan" Analogy — Gardener & kid watching seed -> tree -> 2nd seed -> sapling
    const [ox, , oz] = Z_NURSERY;
    const s2 = t >= SEED2_T;
    const g2 = t >= GEN2_T;
    addActor(places, "gard5", O_GARDENER, ox - 1.85, bob(2.7, 0.02), oz - 1.15, g2 ? "laugh" : s2 ? "shock" : "grin", 1, cam, { lift: 0.3, wave: g2 ? 0.4 : 0.15 });
    addActor(places, "kid5", KID, ox + 1.85, bob(3.8, 0.04), oz - 1.15, g2 ? "shock" : "grin", -1, cam, { lift: 0.38, wave: 0.45 });
    if (t >= SEED1_T && t <= SEED1_T + 1.2) {
      const k = q((t - SEED1_T) / 1.2, 0.08);
      fx.push({ key: `pf5a:${k}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: ox - 0.85, y: 1.8, z: oz + 0.2, w: 1.0, h: 1.0 });
    }
    if (g2) sparkleFx(fx, "gen2", ox + 0.85, 2.35, oz + 0.25, (t - GEN2_T) * 1.0, 0.55);
  } else if (id === 6) {
    // Shot 6: Breeding team behind blind observing Pag-asa & Kalinawan with their egg
    const [ox, , oz] = Z_NEST2013;
    const eggHit = t >= PARENTS_EGG_T;
    addActor(places, "bio6a", O_KEEPER_B, ox - 0.48, 0.58 + bob(2.4, 0.015), oz - 4.2, eggHit ? "shock" : "grin", 1, cam, { prop: "blueprint" });
    addActor(places, "keep6b", O_KEEPER_A, ox + 0.48, 0.58 + bob(2.5, 0.015), oz - 4.2, "grin", -1, cam, { wave: 0.25 });
    if (eggHit) sparkleFx(fx, "pe6", ox + 0.35, 1.98, oz + 0.32, (t - PARENTS_EGG_T) * 0.9, 0.48);
  } else if (id === 7) {
    // Shot 7: Golden-hour 2013 Mabuhay hatching between Pag-asa & Kalinawan
    const [ox, , oz] = Z_NEST2013;
    const hatched = t >= HATCH_13_T;
    const named = t >= MABUHAY_T;
    if (hatched && t <= MABUHAY_T + 1.1) {
      const k = q((t - HATCH_13_T) / 1.9, 0.08);
      fx.push({ key: `pf13:${k}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: ox, y: 1.82, z: oz + 0.15, w: 1.35, h: 1.35 });
    }
    if (named) sparkleFx(fx, "mab13", ox + 0.42, 2.15, oz + 0.24, (t - MABUHAY_T) * 0.85, 0.54);
  } else if (id === 8) {
    // Shot 8: Protected Mindanao rainforest canopy & soaring eagles (pure aerial vista)
    const [ox, , oz] = Z_FOREST;
    if (t >= FOREST_WIDE_T) {
      sparkleFx(fx, "for8", ox - 1.4, 8.2, oz - 8.5, (t - FOREST_WIDE_T) * 0.7, 0.68);
    }
  }

  return { places, fx };
};
