// Builds all 5 cartoon-3D Cebu/Bohol districts & articulated hero physics props
// (Basilica del Santo Niño & collapsing bell tower, Bohol-Cebu Strait relief map, table & block tower,
// underground fault cross-section, shake-table inertia rig, 3-pad comparison).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twoTone } from "../../shared/shade";
import { NOINK } from "../../shared/ink";
import {
  rng, facadeHD, roofHD, stoneHD, cobbleHD, grassHD, beamHD, seaHD, sandHD,
} from "../lapaz/paint";
import {
  Z_BASILICA, Z_STRAIT, Z_TABLE, Z_FAULT, Z_INERTIA, Z_COMPARE, FOREGROUND, type V3,
} from "./story";

const lam = (c: number, map?: THREE.CanvasTexture) =>
  twoTone(new THREE.MeshLambertMaterial({
    color: c,
    ...(map ? { map } : {}),
  }));

const matStd = (opts: THREE.MeshPhongMaterialParameters & { roughness?: number; metalness?: number }) => {
  const { roughness = 0.7, metalness = 0, ...rest } = opts;
  if (rest.map === undefined) delete rest.map;
  const shininess = Math.max(4, Math.round((1 - roughness) * 95 + metalness * 40));
  const specular = metalness > 0.4 ? new THREE.Color(0xfff1c4) : new THREE.Color(0x444444);
  return new THREE.MeshPhongMaterial({ shininess, specular, ...rest });
};

export class Batch {
  buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(g: THREE.BufferGeometry, m: THREE.Material, tr?: (g: THREE.BufferGeometry) => THREE.BufferGeometry) {
    let x = tr ? tr(g.clone()) : g.clone();
    if (x.index) x = x.toNonIndexed();
    x.deleteAttribute("uv");
    x.deleteAttribute("tangent");
    const l = this.buckets.get(m) ?? [];
    l.push(x);
    this.buckets.set(m, l);
  }
  box(m: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, rz = 0) {
    this.add(new THREE.BoxGeometry(w, h, d), m, (g) => {
      if (rz) g.rotateZ(rz);
      if (ry) g.rotateY(ry);
      return g.translate(x, y, z);
    });
  }
  cyl(m: THREE.Material, r0: number, r1: number, h: number, x: number, y: number, z: number, seg = 10, rx = 0, rz = 0, ry = 0) {
    this.add(new THREE.CylinderGeometry(r0, r1, h, seg), m, (g) => {
      if (rx) g.rotateX(rx);
      if (rz) g.rotateZ(rz);
      if (ry) g.rotateY(ry);
      return g.translate(x, y, z);
    });
  }
  cone(m: THREE.Material, r: number, h: number, x: number, y: number, z: number, seg = 10) {
    this.add(new THREE.ConeGeometry(r, h, seg), m, (g) => g.translate(x, y, z));
  }
  sph(m: THREE.Material, r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, seg = 10) {
    this.add(new THREE.SphereGeometry(r, seg, 7), m, (g) => g.scale(sx, sy, sz).translate(x, y, z));
  }
  flush(parent: THREE.Object3D) {
    let n = 0;
    for (const [mat, list] of this.buckets) {
      const m = mergeGeometries(list, false);
      if (!m) continue;
      const mesh = new THREE.Mesh(m, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      n++;
    }
    this.buckets.clear();
    return n;
  }
}

const makePal = () => {
  const plaster = [
    facadeHD("cb_pl0", 5, 4, { wall: "#f2e1c4", shutter: "#7c4c34", door: true }),
    facadeHD("cb_pl1", 5, 4, { wall: "#ead7b8", shutter: "#3b6578" }),
    facadeHD("cb_pl2", 5, 4, { wall: "#e2cfb0", shutter: "#4a6c4b" }),
  ].map((tex, i) => lam([0xf2e1c4, 0xeedcc0, 0xe4d2b4][i], tex));
  const roof = ["#b85838", "#8f4a32", "#4b7150"].map((hex, i) =>
    lam([0xb85838, 0x8f4a32, 0x4b7150][i], roofHD(hex)),
  );
  const coral = lam(0xd7c7ad, stoneHD("cb_coral", ["#dfd1b8", "#cfc0a4", "#e5d8c2", "#c4b498"]));
  const coralTrim = lam(0xf2e8d4);
  const stone = lam(0x9a9184, stoneHD("cb_stone"));
  const darkStone = lam(0x635d56);
  const cobble = lam(0xb8ac98, cobbleHD());
  const wood = lam(0xc48b52, beamHD());
  const darkWood = lam(0x72492c, beamHD());
  const trunk = lam(0x6e4b30);
  const grass = lam(0x6ea946, grassHD());
  const chocoHill = lam(0x887447);
  const chocoHillG = lam(0x6a9042);
  const sea = lam(0x2d8bb5, seaHD());
  const sand = lam(0xd8b882, sandHD());
  const leaf = [0x3d8b3b, 0x4ea346, 0x62b44e].map((c) => lam(c));
  const brass = twoTone(matStd({ color: 0xdca83b, roughness: 0.34, metalness: 0.72 }));
  const steel = twoTone(matStd({ color: 0x7b8696, roughness: 0.38, metalness: 0.65 }));
  const quakeGlow = matStd({ color: 0xff6e2e, emissive: 0xff5a1f, emissiveIntensity: 1.55, roughness: 0.4 });
  const stressGlow = matStd({ color: 0xff4228, emissive: 0xff3b20, emissiveIntensity: 1.65, roughness: 0.35 });
  const archVoid = lam(0x3a2e34);
  const blockCols = [0xd85842, 0x3b78b8, 0xe2a838, 0x4b9458, 0xf2e6cf].map((c) => lam(c));
  return {
    plaster, roof, coral, coralTrim, stone, darkStone, cobble, wood, darkWood, trunk,
    grass, chocoHill, chocoHillG, sea, sand, leaf, brass, steel, quakeGlow, stressGlow, archVoid, blockCols,
  };
};
type Pal = ReturnType<typeof makePal>;

const addHouse = (b: Batch, p: Pal, x: number, y: number, z: number, w: number, h: number, d: number, ry: number, pi: number, ri: number) => {
  const pm = p.plaster[pi % p.plaster.length], rm = p.roof[ri % p.roof.length];
  const win = matStd({ color: 0x3a4d60, roughness: 0.32, emissive: 0xffdc92, emissiveIntensity: 0.14 });
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const pt = (lx: number, ly: number, lz: number): V3 => [x + lx * cos + lz * sin, y + ly, z - lx * sin + lz * cos];
  b.box(pm, w, h, d, ...pt(0, h / 2, 0), ry);
  b.box(p.stone, w + 0.18, 0.35, d + 0.18, ...pt(0, 0.175, 0), ry);
  const s = new THREE.Shape().moveTo(-w / 2 - 0.3, 0).lineTo(0, 1.4).lineTo(w / 2 + 0.3, 0).closePath();
  const rg = new THREE.ExtrudeGeometry(s, { depth: d + 0.6, bevelEnabled: false }).translate(0, h, -(d + 0.6) / 2);
  b.add(rg, rm, (g) => g.rotateY(ry).translate(x, y, z));
  const cols = Math.max(1, Math.round(w / 1.9));
  for (let i = 0; i < cols; i++) {
    const wx = -w * 0.3 + ((i + 0.5) / cols) * w * 0.6;
    b.box(win, 0.58, 0.78, 0.08, ...pt(wx, h * 0.64, d / 2 + 0.03), ry);
    b.box(p.coralTrim, 0.68, 0.09, 0.12, ...pt(wx, h * 0.64 - 0.42, d / 2 + 0.04), ry);
  }
  b.box(p.darkWood, 0.8, 1.4, 0.08, ...pt(0, 0.7, d / 2 + 0.03), ry);
};

const addPalm = (b: Batch, p: Pal, x: number, y: number, z: number, h: number, lean = 0.08, R: () => number) => {
  b.cyl(p.trunk, 0.16, 0.24, h, x, y + h / 2, z, 7, 0, lean);
  const topX = x - Math.sin(lean) * h * 0.5;
  const topY = y + h;
  const lm = p.leaf[Math.floor(R() * p.leaf.length)];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + R() * 0.3;
    b.sph(lm, 0.78, topX + Math.cos(a) * 0.65, topY + 0.12, z + Math.sin(a) * 0.65, 1.35, 0.32, 0.62, 6);
  }
};

const addPot = (b: Batch, p: Pal, x: number, y: number, z: number, s = 1) => {
  b.cyl(p.roof[0], 0.26 * s, 0.18 * s, 0.44 * s, x, y + 0.22 * s, z, 10);
  b.cyl(p.roof[0], 0.30 * s, 0.26 * s, 0.10 * s, x, y + 0.44 * s, z, 10);
  b.sph(p.leaf[0], 0.30 * s, x, y + 0.60 * s, z, 1.18, 0.85, 1.18, 7);
};

const makeForeground = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  for (const fg of FOREGROUND) {
    const [x, y, z] = fg.pos, s = fg.s ?? 1;
    if (fg.kind === "crate") b.box(p.wood, 0.9 * s, 0.72 * s, 0.85 * s, x, y + 0.36 * s, z, fg.yaw ?? 0);
    else addPot(b, p, x, y, z, s * 1.15);
  }
  b.flush(parent);
};

// ---------------- Hero Structures & Physics Props ----------------
export type HeroBellTower = {
  root: THREE.Group;
  midTier: THREE.Group;
  upperBelfry: THREE.Group;
  bell: THREE.Group;
  rubble: THREE.Mesh[];
};

const buildHeroBellTower = (p: Pal): HeroBellTower => {
  const root = new THREE.Group();

  // Tier 1: Solid coral-stone base (stays standing during collapse)
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.0, 4.2, 3.0), p.coral);
  base.position.y = 2.1;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 3.4), p.stone);
  plinth.position.y = 0.25;
  plinth.receiveShadow = true;
  root.add(plinth);

  const cornice1 = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.26, 3.3), p.coralTrim);
  cornice1.position.y = 4.25;
  root.add(cornice1);

  // Arched base doorway
  const doorArch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.18), p.darkWood);
  doorArch.position.set(0, 1.25, 1.52);
  root.add(doorArch);

  // Tier 2: Mid belfry stage (sways slightly)
  const midTier = new THREE.Group();
  midTier.position.y = 4.38;
  const midCore = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.5, 2.45), p.coral);
  midCore.position.y = 1.25;
  midCore.castShadow = true;
  midTier.add(midCore);
  for (const side of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.15, 0.14), p.archVoid);
    win.position.set(side * 0.55, 1.25, 1.24);
    midTier.add(win);
  }
  const cornice2 = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.24, 2.75), p.coralTrim);
  cornice2.position.y = 2.55;
  midTier.add(cornice2);
  root.add(midTier);

  // Tier 3: Iconic octagonal upper belfry + dome + cross (the part that collapsed in 2013!)
  const upperBelfry = new THREE.Group();
  upperBelfry.position.set(0, 7.02, 0);

  // 4 corner pillars framing the open belfry arch
  for (const px of [-0.72, 0.72]) for (const pz of [-0.72, 0.72]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.36, 2.05, 0.36), p.coral);
    pil.position.set(px, 1.02, pz);
    pil.castShadow = true;
    upperBelfry.add(pil);
  }
  const archVoid = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.55, 1.15), p.archVoid);
  archVoid.position.y = 0.85;
  upperBelfry.add(archVoid);

  const upperCornice = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.32, 0.26, 8), p.coralTrim);
  upperCornice.position.y = 2.15;
  upperBelfry.add(upperCornice);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), p.roof[0]);
  dome.position.y = 2.24;
  dome.castShadow = true;
  upperBelfry.add(dome);

  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.95, 6), p.brass);
  finial.position.y = 3.55;
  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, 0.09), p.brass);
  crossBar.position.y = 3.72;
  upperBelfry.add(finial, crossBar);

  // Swinging bronze bell inside upper belfry
  const bell = new THREE.Group();
  bell.position.set(0, 1.65, 0.22);
  const bellCup = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.55, 10), p.brass);
  bellCup.position.y = -0.25;
  bell.add(bellCup);
  upperBelfry.add(bell);

  root.add(upperBelfry);

  // Rubble blocks hidden until COLLAPSE_T
  const rubble: THREE.Mesh[] = [];
  const R = rng(7111);
  for (let i = 0; i < 14; i++) {
    const rb = new THREE.Mesh(
      new THREE.BoxGeometry(0.45 + R() * 0.45, 0.34 + R() * 0.28, 0.42 + R() * 0.38),
      i % 3 === 0 ? p.roof[0] : p.coral,
    );
    rb.castShadow = true;
    rb.visible = false;
    rb.userData = {
      dx: (R() - 0.5) * 3.8,
      dz: 1.4 + R() * 3.2,
      ry: R() * Math.PI * 2,
      rx: (R() - 0.5) * 0.8,
    };
    root.add(rb);
    rubble.push(rb);
  }

  return { root, midTier, upperBelfry, bell, rubble };
};

export type HeroStrait = {
  boholShockRings: THREE.Mesh[];
  travelWaves: THREE.Mesh[];
  cebuMiniTower: THREE.Group;
  cebuBuildings: THREE.Group;
};

export type HeroTable = {
  malletArm: THREE.Group;
  waveRing: THREE.Mesh;
  towerBlocks: THREE.Mesh[];
};

export type HeroFault = {
  rightBlock: THREE.Group;
  crackGlow: THREE.Mesh;
  waves: THREE.Mesh[];
  cebuTopBuildings: THREE.Group;
};

export type HeroInertia = {
  carriage: THREE.Group;
  tiers: THREE.Group[];
  stressRings: THREE.Mesh[];
};

export type HeroCompare = {
  rockTower: THREE.Group;
  softTower: THREE.Group;
  bracedTower: THREE.Group;
  softCrack: THREE.Mesh;
};

export type BuiltCebu = {
  bellTower: HeroBellTower;
  strait: HeroStrait;
  table: HeroTable;
  fault: HeroFault;
  inertia: HeroInertia;
  compare: HeroCompare;
};

// ---------------- District Builders ----------------
const buildBasilica = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  const [ox, , oz] = Z_BASILICA;
  const R = rng(7101);

  // Plaza Sugbo cobbles + tropical green + distant Cebu hills
  b.box(p.cobble, 36, 0.24, 36, ox, -0.12, oz);
  b.box(p.grass, 140, 0.4, 90, ox, -0.25, oz - 50);
  b.sph(p.leaf[0], 26, ox - 28, -4, oz - 68, 2.2, 0.75, 1.3, 12);
  b.sph(p.leaf[2], 30, ox + 26, -3, oz - 74, 2.1, 0.9, 1.3, 12);

  // Basilica del Santo Niño main coral-stone church facade (left of bell tower)
  const cx = ox - 4.0, cz = oz - 9.5;
  b.box(p.coral, 9.2, 7.2, 5.4, cx, 3.6, cz);
  b.box(p.stone, 9.6, 0.45, 5.8, cx, 0.225, cz);
  const ped = new THREE.Shape().moveTo(-4.8, 0).lineTo(0, 2.3).lineTo(4.8, 0).closePath();
  const pedGeo = new THREE.ExtrudeGeometry(ped, { depth: 5.8, bevelEnabled: false }).translate(0, 7.2, -2.9);
  b.add(pedGeo, p.roof[0], (g) => g.translate(cx, 0, cz));
  // Front pilasters, arched church door, rose window
  for (const px of [-3.6, -1.6, 1.6, 3.6]) b.box(p.coralTrim, 0.45, 7.1, 0.35, cx + px, 3.55, cz + 2.75);
  b.box(p.darkWood, 1.75, 2.9, 0.25, cx, 1.45, cz + 2.75);
  b.cyl(p.brass, 0.72, 0.72, 0.24, cx, 5.2, cz + 2.78, 16, Math.PI / 2);
  b.cyl(p.archVoid, 0.56, 0.56, 0.28, cx, 5.2, cz + 2.8, 16, Math.PI / 2);

  // Flanking Cebu colonial houses & palm trees
  addHouse(b, p, ox - 10.6, 0, oz - 6.0, 4.4, 4.2, 3.8, 0.45, 0, 1);
  addHouse(b, p, ox + 8.6, 0, oz - 6.8, 4.6, 4.5, 4.0, -0.42, 1, 2);
  addPalm(b, p, ox - 7.8, 0, oz - 2.6, 5.4, 0.1, R);
  addPalm(b, p, ox + 6.4, 0, oz - 2.4, 5.8, -0.09, R);
  addPot(b, p, ox - 1.2, 0, oz - 4.8, 1.0);
  addPot(b, p, ox + 5.2, 0, oz - 4.8, 1.0);

  b.flush(parent);

  const bellTower = buildHeroBellTower(p);
  bellTower.root.position.set(ox + 2.6, 0, oz - 7.5);
  parent.add(bellTower.root);

  return bellTower;
};

const buildStrait = (parent: THREE.Object3D, p: Pal): HeroStrait => {
  const b = new Batch();
  const [ox, , oz] = Z_STRAIT;
  const R = rng(7202);

  // Painted turquoise Bohol/Cebu Strait sea
  b.box(p.sea, 90, 0.3, 80, ox, -0.15, oz);

  // Bohol Island (right side, ox + 5.2) with iconic Chocolate Hills!
  b.box(p.sand, 11.4, 0.45, 13.0, ox + 5.2, 0.2, oz - 0.8);
  b.box(p.grass, 10.6, 0.45, 12.2, ox + 5.2, 0.52, oz - 0.8);
  const hills: [number, number, number, boolean][] = [
    [5.8, -2.5, 1.45, true], [7.2, -0.2, 1.65, false], [4.0, -3.4, 1.35, true],
    [6.6, 2.2, 1.5, false], [3.6, 1.8, 1.25, true],
  ];
  for (const [hx, hz, hr, brown] of hills) {
    b.sph(brown ? p.chocoHill : p.chocoHillG, hr, ox + hx, 0.65, oz + hz, 1.15, 0.85, 1.15, 10);
  }
  addPalm(b, p, ox + 3.2, 0.72, oz - 1.5, 1.8, 0.08, R);
  addPalm(b, p, ox + 6.4, 0.72, oz + 0.8, 1.7, -0.07, R);

  // Bohol epicenter fault scar
  b.box(p.quakeGlow, 1.9, 0.14, 0.24, ox + 4.5, 0.78, oz - 0.4, 0.42);

  // Cebu Island (left side, ox - 5.6)
  b.box(p.sand, 10.6, 0.45, 14.5, ox - 5.6, 0.2, oz - 0.8);
  b.box(p.grass, 9.8, 0.45, 13.5, ox - 5.6, 0.52, oz - 0.8);
  b.box(p.cobble, 5.2, 0.14, 6.2, ox - 4.8, 0.78, oz - 0.6);

  b.flush(parent);

  // Bohol concentric shockwave rings
  const boholShockRings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.09, 8, 28), p.quakeGlow);
    m.rotation.x = Math.PI / 2;
    m.position.set(ox + 4.5, 0.88, oz - 0.4);
    m.layers.set(NOINK);
    m.visible = false;
    parent.add(m);
    boholShockRings.push(m);
  }

  // Traveling wave crests crossing Cebu Strait (ox + 3.2 -> ox - 4.8)
  const travelWaves: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 8, 24, Math.PI * 0.7), p.quakeGlow);
    m.rotation.x = Math.PI / 2;
    m.rotation.z = Math.PI * 0.65;
    m.position.set(ox + 2.0, 0.35, oz - 0.5);
    m.layers.set(NOINK);
    m.visible = false;
    parent.add(m);
    travelWaves.push(m);
  }

  // Articulated Cebu City mini-buildings + mini bell tower so they visibly rattle on CEBU_SHAKE_T
  const cebuBuildings = new THREE.Group();
  cebuBuildings.position.set(ox - 5.0, 0.85, oz - 0.6);
  const cbBatch = new Batch();
  cbBatch.box(p.plaster[0], 1.1, 1.0, 1.0, -1.2, 0.5, -1.2);
  cbBatch.cone(p.roof[0], 0.85, 0.6, -1.2, 1.3, -1.2, 4);
  cbBatch.box(p.plaster[1], 1.0, 1.3, 0.9, 0.6, 0.65, -1.5);
  cbBatch.box(p.coral, 1.6, 1.1, 1.1, -0.6, 0.55, 0.5);
  cbBatch.flush(cebuBuildings);
  parent.add(cebuBuildings);

  const cebuMiniTower = new THREE.Group();
  cebuMiniTower.position.set(ox - 4.0, 0.85, oz - 0.2);
  const tMesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.8, 0.65), p.coral);
  tMesh.position.y = 0.9;
  const tDome = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.55, 8), p.roof[0]);
  tDome.position.y = 2.05;
  cebuMiniTower.add(tMesh, tDome);
  parent.add(cebuMiniTower);

  return { boholShockRings, travelWaves, cebuMiniTower, cebuBuildings };
};

const buildTable = (parent: THREE.Object3D, p: Pal): HeroTable => {
  const b = new Batch();
  const [ox, , oz] = Z_TABLE;
  const R = rng(7303);

  b.box(p.cobble, 28, 0.24, 24, ox, -0.12, oz);
  b.box(p.grass, 130, 0.4, 90, ox, -0.25, oz - 45);
  b.sph(p.leaf[0], 26, ox - 28, -4, oz - 66, 2.2, 0.72, 1.3, 12);
  b.sph(p.leaf[2], 30, ox + 26, -3, oz - 72, 2.1, 0.85, 1.3, 12);

  // Open timber pavilion background
  addHouse(b, p, ox - 8.5, 0, oz - 10.5, 5.2, 4.0, 4.0, 0.26, 0, 1);
  addHouse(b, p, ox + 8.5, 0, oz - 10.5, 5.2, 4.0, 4.0, -0.26, 2, 0);
  addPalm(b, p, ox - 6.0, 0, oz - 6.0, 4.8, 0.08, R);
  addPalm(b, p, ox + 6.0, 0, oz - 6.0, 5.0, -0.08, R);

  // Long heavy timber table ("mesa"): tabletop at y = 1.15
  b.box(p.wood, 7.6, 0.22, 2.2, ox, 1.15, oz);
  for (const lx of [-3.3, 3.3]) for (const lz of [-0.85, 0.85]) {
    b.box(p.darkWood, 0.22, 1.04, 0.22, ox + lx, 0.52, oz + lz);
  }
  b.flush(parent);

  // Left-end wooden mallet pivoted to tap the table
  const malletArm = new THREE.Group();
  malletArm.position.set(ox - 3.6, 1.75, oz);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 8), p.darkWood);
  handle.rotation.z = Math.PI / 2;
  handle.position.x = 0.45;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.55, 10), p.wood);
  head.position.set(0.95, -0.18, 0);
  head.castShadow = true;
  malletArm.add(handle, head);
  parent.add(malletArm);

  // Traveling wave ring along the tabletop
  const waveRing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 2.15), p.quakeGlow);
  waveRing.position.set(ox - 2.6, 1.32, oz);
  waveRing.layers.set(NOINK);
  waveRing.visible = false;
  parent.add(waveRing);

  // 5-tier colorful stacked wooden block tower ("tore ng mga bloke") on right end (ox + 2.55)
  const towerBlocks: THREE.Mesh[] = [];
  const specs: [number, number, number][] = [
    [1.05, 0.46, 1.05],
    [0.92, 0.44, 0.92],
    [0.80, 0.44, 0.80],
    [0.68, 0.42, 0.68],
    [0.56, 0.48, 0.56],
  ];
  let cy = 1.26;
  specs.forEach(([w, h, d], idx) => {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), p.blockCols[idx % p.blockCols.length]);
    blk.position.set(ox + 2.55, cy + h / 2, oz);
    blk.userData = { baseX: ox + 2.55, baseY: cy + h / 2, level: idx };
    blk.castShadow = true;
    parent.add(blk);
    towerBlocks.push(blk);
    cy += h;
  });

  return { malletArm, waveRing, towerBlocks };
};

const buildFault = (parent: THREE.Object3D, p: Pal): HeroFault => {
  const b = new Batch();
  const [ox, , oz] = Z_FAULT;

  b.box(p.grass, 140, 0.4, 90, ox, -0.25, oz - 40);

  // Left static rock crust (Cebu side + Cebu Strait water trough)
  b.box(p.darkStone, 7.5, 1.8, 3.6, ox - 3.9, 0.9, oz);
  b.box(p.stone, 7.5, 1.4, 3.6, ox - 3.9, 2.5, oz);
  b.box(p.grass, 3.5, 0.35, 3.6, ox - 5.9, 3.35, oz);
  // Strait water channel resting in trough between Cebu & Bohol
  b.box(p.sea, 4.2, 0.45, 3.5, ox - 2.0, 3.3, oz);
  b.flush(parent);

  // Right mobile rock crust (Bohol side, slips up/down along fault plane)
  const rightBlock = new THREE.Group();
  rightBlock.position.set(ox + 3.6, 0, oz);
  const rb = new Batch();
  rb.box(p.darkStone, 6.8, 1.8, 3.6, 0, 0.9, 0);
  rb.box(p.stone, 6.8, 1.4, 3.6, 0, 2.5, 0);
  rb.box(p.grass, 6.8, 0.35, 3.6, 0, 3.35, 0);
  rb.sph(p.chocoHill, 1.15, 0.4, 3.55, -0.3, 1.1, 0.85, 1.1, 9);
  rb.sph(p.chocoHillG, 0.95, 2.0, 3.55, 0.4, 1.1, 0.85, 1.1, 9);
  rb.flush(rightBlock);
  parent.add(rightBlock);

  // Cebu buildings perched on top-left of cutaway
  const cebuTopBuildings = new THREE.Group();
  cebuTopBuildings.position.set(ox - 5.6, 3.5, oz);
  const cb = new Batch();
  cb.box(p.coral, 0.9, 1.6, 0.9, 0.7, 0.8, 0);
  cb.cone(p.roof[0], 0.65, 0.6, 0.7, 1.85, 0, 6);
  cb.box(p.plaster[0], 1.2, 1.0, 1.0, -0.8, 0.5, -0.2);
  cb.cone(p.roof[1], 0.85, 0.5, -0.8, 1.25, -0.2, 4);
  cb.flush(cebuTopBuildings);
  parent.add(cebuTopBuildings);

  // Glowing fault crack seam at x = ox + 0.15
  const crackGlow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 3.72), p.quakeGlow);
  crackGlow.position.set(ox + 0.1, 1.75, oz);
  crackGlow.rotation.z = -0.22;
  crackGlow.layers.set(NOINK);
  crackGlow.visible = false;
  parent.add(crackGlow);

  // Concentric seismic waves radiating from fault hypocenter across to Cebu
  const waves: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.055, 8, 28), p.quakeGlow);
    m.position.set(ox + 0.3, 1.7, oz + 1.88);
    m.layers.set(NOINK);
    m.visible = false;
    parent.add(m);
    waves.push(m);
  }

  return { rightBlock, crackGlow, waves, cebuTopBuildings };
};

const buildInertia = (parent: THREE.Object3D, p: Pal): HeroInertia => {
  const b = new Batch();
  const [ox, , oz] = Z_INERTIA;

  b.box(p.cobble, 30, 0.24, 24, ox, -0.12, oz);
  b.box(p.grass, 130, 0.4, 90, ox, -0.25, oz - 45);
  b.sph(p.leaf[0], 26, ox - 28, -4, oz - 66, 2.2, 0.72, 1.3, 12);
  b.sph(p.leaf[2], 30, ox + 26, -3, oz - 72, 2.1, 0.85, 1.3, 12);
  addHouse(b, p, ox - 8.5, 0, oz - 10.5, 5.0, 3.8, 3.8, 0.3, 1, 0);
  addHouse(b, p, ox + 8.5, 0, oz - 10.5, 5.0, 3.8, 3.8, -0.3, 0, 2);

  // Steel shake-table rails on stone plinth
  b.box(p.stone, 6.2, 0.36, 2.8, ox, 0.18, oz);
  b.box(p.steel, 5.6, 0.12, 0.14, ox, 0.42, oz - 0.85);
  b.box(p.steel, 5.6, 0.12, 0.14, ox, 0.42, oz + 0.85);
  b.flush(parent);

  // Sliding carriage ("gumagalaw na patungan")
  const carriage = new THREE.Group();
  carriage.position.set(ox, 0.56, oz);
  const cb = new Batch();
  cb.box(p.wood, 3.1, 0.24, 2.2, 0, 0.2, 0);
  for (const wx of [-1.1, 1.1]) for (const wz of [-0.85, 0.85]) {
    cb.cyl(p.steel, 0.14, 0.14, 0.14, wx, 0, wz, 10, Math.PI / 2);
  }
  cb.flush(carriage);
  parent.add(carriage);

  // 4-tier model masonry bell tower that shears/lags at the top!
  const tiers: THREE.Group[] = [];
  const tierDefs: [number, number, number][] = [
    [1.65, 0.82, 0.8],
    [1.42, 0.78, 1.62],
    [1.22, 0.74, 2.40],
    [1.18, 0.92, 3.14], // heavy top belfry with brass weight crown!
  ];
  tierDefs.forEach(([w, h, y0], idx) => {
    const tg = new THREE.Group();
    tg.position.set(ox, y0, oz);
    const tb = new Batch();
    tb.box(idx === 3 ? p.brass : p.coral, w, h, w, 0, h / 2, 0);
    tb.box(p.coralTrim, w + 0.14, 0.12, w + 0.14, 0, h, 0);
    if (idx === 3) {
      tb.cone(p.roof[0], w * 0.65, 0.65, 0, h + 0.35, 0, 8);
    }
    tb.flush(tg);
    parent.add(tg);
    tiers.push(tg);
  });

  // Stress glow rings between tiers
  const stressRings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.95 - i * 0.1, 0.06, 8, 24), p.stressGlow);
    m.rotation.x = Math.PI / 2;
    m.position.set(ox, 1.62 + i * 0.78, oz);
    m.layers.set(NOINK);
    m.visible = false;
    parent.add(m);
    stressRings.push(m);
  }

  return { carriage, tiers, stressRings };
};

const buildCompare = (parent: THREE.Object3D, p: Pal): HeroCompare => {
  const b = new Batch();
  const [ox, , oz] = Z_COMPARE;
  const R = rng(7505);

  b.box(p.grass, 140, 0.4, 90, ox, -0.25, oz - 35);
  b.box(p.cobble, 18, 0.16, 12, ox, -0.08, oz);
  b.sph(p.leaf[0], 26, ox - 28, -4, oz - 66, 2.2, 0.72, 1.3, 12);
  b.sph(p.leaf[2], 30, ox + 26, -3, oz - 72, 2.1, 0.85, 1.3, 12);

  // 3 distinct ground pads: Left = solid bedrock, Center = soft sandy soil, Right = reinforced concrete pad
  b.box(p.darkStone, 3.2, 0.52, 3.2, ox - 3.6, 0.26, oz);
  b.box(p.sand, 3.2, 0.52, 3.2, ox, 0.26, oz);
  b.box(p.stone, 3.2, 0.52, 3.2, ox + 3.6, 0.26, oz);

  for (let i = 0; i < 5; i++) addPalm(b, p, ox - 7 + i * 3.5, 0, oz - 7.5 - (i % 2), 4.6, (i % 2 ? 1 : -1) * 0.08, R);
  b.flush(parent);

  // Left: Sturdy low rock-founded building
  const rockTower = new THREE.Group();
  rockTower.position.set(ox - 3.6, 0.52, oz);
  const rb = new Batch();
  rb.box(p.plaster[0], 1.8, 2.2, 1.6, 0, 1.1, 0);
  rb.cone(p.roof[2], 1.35, 0.9, 0, 2.65, 0, 4);
  rb.flush(rockTower);
  parent.add(rockTower);

  // Center: Tall slender unreinforced coral tower on soft sand
  const softTower = new THREE.Group();
  softTower.position.set(ox, 0.52, oz);
  const sb = new Batch();
  sb.box(p.coral, 1.3, 3.6, 1.3, 0, 1.8, 0);
  sb.box(p.coralTrim, 1.5, 0.18, 1.5, 0, 3.65, 0);
  sb.cone(p.roof[0], 0.95, 0.8, 0, 4.1, 0, 8);
  sb.flush(softTower);
  parent.add(softTower);

  const softCrack = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.16, 1.36), p.stressGlow);
  softCrack.position.set(0, 1.9, 0);
  softCrack.layers.set(NOINK);
  softCrack.visible = false;
  softTower.add(softCrack);

  // Right: Braced modern structure with steel cross-braces
  const bracedTower = new THREE.Group();
  bracedTower.position.set(ox + 3.6, 0.52, oz);
  const bb = new Batch();
  bb.box(p.plaster[1], 1.65, 3.1, 1.5, 0, 1.55, 0);
  bb.box(p.steel, 1.72, 0.14, 1.56, 0, 1.1, 0);
  bb.box(p.steel, 1.72, 0.14, 1.56, 0, 2.1, 0);
  bb.box(p.steel, 0.14, 3.2, 0.14, -0.82, 1.6, 0.76);
  bb.box(p.steel, 0.14, 3.2, 0.14, 0.82, 1.6, 0.76);
  bb.box(p.roof[1], 1.85, 0.25, 1.7, 0, 3.2, 0);
  bb.flush(bracedTower);
  parent.add(bracedTower);

  return { rockTower, softTower, bracedTower, softCrack };
};

export const buildAllDistricts = (parent: THREE.Object3D): BuiltCebu => {
  const p = makePal();
  makeForeground(parent, p);
  const bellTower = buildBasilica(parent, p);
  const strait = buildStrait(parent, p);
  const table = buildTable(parent, p);
  const fault = buildFault(parent, p);
  const inertia = buildInertia(parent, p);
  const compare = buildCompare(parent, p);
  return { bellTower, strait, table, fault, inertia, compare };
};
