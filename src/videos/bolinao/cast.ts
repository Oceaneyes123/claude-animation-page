// Stages animated 2D bean-head Filipino characters, contact shadows, and comic FX on the NOINK layer.
import * as THREE from "three";
import { NOINK } from "../../shared/ink";
import { cardShade, blobMaterial, CARD_K } from "../../shared/cardshade";
import {
  Pen, type Outfit, type Expr, type FrontOpts, type Prop,
  KID, WORKER, SCIENTIST, TOURIST, FISHERMAN, filipino,
  bodyFront, fxShadow, fxContact, fxBurst, fxPuff, fxSandPuff, fxCreak, fxWaveFoam,
} from "../lapaz/toon";
import {
  Z_MUSEUM, Z_DIG, Z_PIER, Z_WORKSHOP, Z_TREASURE,
  DIG_T, SKULL_T, TEETH_GOLD_T, FISH_T, RIVET_T, PEG_T, SCALE_FORM_T, JEWEL_T, TOOTH_FLIP_T, FINDS_T,
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

// ---------------- Deterministic character card builder ----------------
const q = (v: number, s = 0.05) => Math.round(v / s) * s;

const mkReq = (name: string, o: Outfit, opts: FrontOpts): Req => ({
  key: `${name}:${opts.expr ?? "neutral"}:${opts.facing ?? 0}:${q(opts.tilt ?? 0, 0.04)}:${q(opts.phase ?? 0, 0.08)}:${q(opts.lift ?? 0, 0.08)}:${q(opts.wave ?? 0, 0.08)}:${opts.prop ? (Array.isArray(opts.prop) ? `hm:${q(opts.prop[1], 0.08)}` : opts.prop) : "0"}`,
  w: 600,
  h: 1000,
  draw: (p) => bodyFront(p, o, opts),
});

const mkShadow = (col = "#4a4458", contact = false): Req => ({
  key: `${contact ? "c" : "s"}:${col}`,
  w: contact ? 128 : 128,
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

// Outfits tailored to Bolinao cast
const O_VISITOR_A: Outfit = TOURIST(1);
const O_VISITOR_B: Outfit = TOURIST(0);
const O_LOCAL_GUIDE: Outfit = { ...filipino(1), jacket: "#4f7ea8", hat: "hair", hair: "#2b1d18" };
const O_ARCH_LEAD: Outfit = SCIENTIST;
const O_ARCH_B: Outfit = { ...SCIENTIST, jacket: "#c99d62", glasses: true };
const O_DIGGER: Outfit = WORKER;
const O_FISHER: Outfit = FISHERMAN;
const O_HELPER: Outfit = filipino(2);
const O_GOLDSMITH: Outfit = { ...filipino(0), jacket: "#965336", hat: "cap", cap: "#66402a" };
const O_VILLAGER: Outfit = filipino(3);

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const places: Place[] = [];
  const fx: FxPlace[] = [];
  const bob = (spd: number, amp = 0.028) => Math.abs(Math.sin(t * spd)) * amp;

  if (id === 1 || id === 10) {
    // Shot 1 & Shot 10: Museum gallery hall visitors marveling at the Bolinao Skull pedestal
    const [ox, , oz] = Z_MUSEUM;
    addActor(places, "visA", O_VISITOR_A, ox - 2.15, bob(3.1), oz - 0.15, id === 10 ? "shock" : "grin", 1, cam, { prop: "bag", wave: 0.25 }, 0.05);
    addActor(places, "kidM", KID, ox + 1.85, bob(4.2, 0.045), oz + 0.15, "shock", -1, cam, { lift: 0.35, wave: 0.45 }, -0.06);
    addActor(places, "guideM", O_LOCAL_GUIDE, ox + 2.7, bob(2.6, 0.02), oz - 1.55, "grin", -1, cam, { prop: "blueprint" });
    sparkleFx(fx, "m1", ox + Math.sin(t * 1.4) * 0.12, 1.48, oz + 0.48, t * 0.75, 0.72);
  } else if (id === 2) {
    // Shot 2: Balingasay excavation dig pit (stepped cleanly in behind pit rim so team frames inside 9:16)
    const [ox, , oz] = Z_DIG;
    const found = t >= DIG_T;
    const exprA: Expr = t >= SKULL_T ? "shock" : found ? "grin" : "stern";
    addActor(places, "archA", O_ARCH_LEAD, ox - 1.45, bob(3.2, 0.02), oz - 1.35, exprA, 1, cam, { prop: "blueprint", lift: found ? 0.25 : 0 }, 0.05);
    addActor(places, "archB", O_ARCH_B, ox + 1.45, bob(2.9, 0.02), oz - 1.4, found ? "grin" : "stern", -1, cam, { wave: found ? 0.35 : 0.1 });
    const digSwing = found ? 0.15 : Math.sin(t * 7.2) * 0.48;
    addActor(places, "digW", O_DIGGER, ox + 0.2, bob(3.8, 0.025), oz - 1.95, found ? "shock" : "stern", -1, cam, { prop: ["hammer", digSwing] as Prop });

    if (t >= DIG_T - 0.2 && t <= DIG_T + 1.4) {
      const k = q((t - (DIG_T - 0.2)) / 1.6, 0.06);
      fx.push({ key: `spuf:${k}`, cw: 400, ch: 300, draw: (p) => fxSandPuff(p, k), x: ox, y: 0.75, z: oz - 0.2, w: 1.5, h: 1.3 });
    }
    if (t >= SKULL_T) {
      sparkleFx(fx, "digsk", ox + 0.55, 1.35, oz - 0.25, (t - SKULL_T) * 0.9, 0.55);
    }
  } else if (id === 3) {
    // Shot 3: Museum macro — softened visitors behind pedestal, delicate corner tooth sparkles
    const [ox, , oz] = Z_MUSEUM;
    addActor(places, "vis3a", O_VISITOR_A, ox - 2.3, bob(2.4, 0.015), oz - 2.75, "shock", 1, cam);
    addActor(places, "vis3b", O_VISITOR_B, ox + 2.25, bob(2.5, 0.015), oz - 2.85, "grin", -1, cam);
    const burstPhase = t >= TEETH_GOLD_T ? (t - TEETH_GOLD_T) * 1.1 : t * 0.55;
    sparkleFx(fx, "t1", ox - 0.32, 1.58, oz + 0.42, burstPhase, 0.26);
    sparkleFx(fx, "t2", ox + 0.32, 1.56, oz + 0.42, burstPhase + 0.45, 0.26);
  } else if (id === 4) {
    // Shot 4: Bolinao fishing pier — Fisherman & helper behind pier bench admiring the gleaming 3D reef fish
    const [ox, , oz] = Z_PIER;
    const hit = t >= FISH_T;
    addActor(places, "fisher", O_FISHER, ox - 1.75, 0.56 + bob(3.0, 0.025), oz - 0.95, hit ? "laugh" : "grin", 1, cam, { lift: 0.3, wave: hit ? 0.45 : 0.2 });
    addActor(places, "phelp", O_HELPER, ox + 1.75, 0.56 + bob(3.4, 0.025), oz - 1.0, hit ? "shock" : "grin", -1, cam, { wave: 0.35 });
    for (const [wx, wz, off] of [[-4.8, -5.8, 0.0], [5.0, -7.2, 0.45]] as [number, number, number][]) {
      const k = q((t * 0.65 + off) % 1, 0.08);
      fx.push({ key: `wf:${k}`, cw: 500, ch: 200, draw: (p) => fxWaveFoam(p, k), x: ox + wx, y: 0.08, z: oz + wz, w: 2.8, h: 1.5, flat: true });
    }
    if (hit) sparkleFx(fx, "fsh", ox + 0.72, 2.38, oz + 0.25, (t - FISH_T) * 1.2, 0.52);
  } else if (id === 5) {
    // Shot 5: Artisan workshop knife rivets — craftsman hammering + apprentice standing right behind workbench
    const [ox, , oz] = Z_WORKSHOP;
    const arm = Math.sin(t * 7.8) * 0.55;
    addActor(places, "smith", O_DIGGER, ox - 1.45, bob(3.2, 0.02), oz - 1.05, "stern", 1, cam, { prop: ["hammer", arm] as Prop });
    addActor(places, "appr", KID, ox + 1.45, bob(4.1, 0.03), oz - 1.0, t >= RIVET_T ? "shock" : "grin", -1, cam, { lift: 0.35 });
    for (let i = 0; i < 5; i++) {
      const hitT = RIVET_T + i * 0.68;
      if (t >= hitT && t <= hitT + 0.52) {
        const k = q((t - hitT) / 0.52, 0.08);
        const rx = ox - 1.25 + i * 0.32;
        fx.push({ key: `cr:${i}:${k}`, cw: 300, ch: 300, draw: (p) => fxCreak(p, k), x: rx, y: 2.02, z: oz + 0.15, w: 0.9, h: 0.9 });
      }
    }
  } else if (id === 6) {
    // Shot 6: Goldsmith golden-hour bench — goldsmith & helper flanking behind enlarged tooth model
    const [ox, , oz] = Z_WORKSHOP;
    const gx = ox + 14;
    const done = t >= SCALE_FORM_T;
    addActor(places, "goldsm", O_GOLDSMITH, gx - 1.45, bob(2.7, 0.02), oz - 1.05, done ? "laugh" : "stern", 1, cam, { lift: 0.32 });
    addActor(places, "ghelp", O_HELPER, gx + 1.45, bob(3.1, 0.02), oz - 1.1, done ? "shock" : "grin", -1, cam, { wave: 0.25 });
    if (t >= PEG_T) {
      const p = (t - PEG_T) * 1.1;
      sparkleFx(fx, "pg1", gx - 0.58, 2.35, oz + 0.12, p, 0.42);
      sparkleFx(fx, "pg2", gx + 0.58, 2.28, oz + 0.12, p + 0.42, 0.42);
    }
  } else if (id === 7) {
    // Shot 7: Ancient burial shrine — gold ring & necklace vs skull tooth ornament
    const [ox, , oz] = Z_TREASURE;
    const flip = t >= TOOTH_FLIP_T;
    addActor(places, "arch7", O_ARCH_LEAD, ox + 1.45, bob(2.6, 0.02), oz - 1.25, flip ? "shock" : "grin", -1, cam, { prop: "blueprint" });
    addActor(places, "vil7", O_VILLAGER, ox - 3.35, bob(2.9, 0.02), oz - 1.15, flip ? "grin" : "neutral", 1, cam, { wave: 0.35 });
    if (t >= JEWEL_T && !flip) sparkleFx(fx, "jw", ox + 0.58, 1.85, oz + 0.15, (t - JEWEL_T) * 1.2, 0.52);
    if (flip) sparkleFx(fx, "sk7", ox - 2.35, 2.02, oz - 0.12, (t - TOOTH_FLIP_T) * 1.3, 0.48);
  } else if (id === 8) {
    // Shot 8: Balingasay field sorting table with 5 gold-flecked specimen teeth & team behind table
    const [ox, , oz] = Z_DIG;
    const fxX = ox + 14;
    addActor(places, "arch8", O_ARCH_B, fxX - 1.35, bob(2.8, 0.02), oz - 1.15, t >= FINDS_T ? "shock" : "grin", 1, cam, { prop: "blueprint" });
    addActor(places, "wkr8", O_DIGGER, fxX + 1.35, bob(3.0, 0.02), oz - 1.2, "grin", -1, cam, { lift: 0.25 });
    if (t >= FINDS_T - 0.3) sparkleFx(fx, "fn8", fxX + Math.sin(t * 2.2) * 0.6, 1.85, oz + 0.12, (t - FINDS_T + 0.3) * 1.1, 0.42);
  } else if (id === 9) {
    // Shot 9: Golden-hour grand museum reveal — visitors standing in awe around Bolinao Skull
    const [ox, , oz] = Z_MUSEUM;
    addActor(places, "vis9a", O_VISITOR_B, ox - 2.35, bob(2.2, 0.015), oz - 0.35, "shock", 1, cam, { prop: "bag" });
    addActor(places, "vis9b", O_HELPER, ox + 2.15, bob(2.4, 0.015), oz - 0.2, "grin", -1, cam);
    addActor(places, "kid9", KID, ox + 2.85, bob(3.3, 0.03), oz + 0.35, "shock", -1, cam);
    sparkleFx(fx, "m9", ox + Math.sin(t * 1.5) * 0.14, 1.52, oz + 0.48, t * 0.85, 0.78);
    if (t >= 69.8 && t <= 71.2) {
      const k = q((t - 69.8) / 1.4, 0.08);
      fx.push({ key: `pf9:${k}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: ox, y: 1.95, z: oz - 0.4, w: 1.6, h: 1.6 });
    }
  }

  return { places, fx };
};
