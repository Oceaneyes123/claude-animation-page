// Builds all 4 cartoon-3D Divisoria districts & articulated hero firebreak props:
// 1. Early 20th-c. Cagayan de Oro & Divisoria promenade + burning timber house (Shots 1, 2, 3, 4, 9)
// 2. Workshop table with 6 animated standing paper strips (Shots 5, 6)
// 3. Golden-hour narrow alley vs wide stone firebreak + wind-blown embers (Shot 7)
// 4. 3D architectural relief map of downtown Cagayan de Oro (Shot 8)
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twoTone } from "../../shared/shade";
import { NOINK } from "../../shared/ink";
import {
  rng, facadeHD, roofHD, stoneHD, cobbleHD, grassHD, beamHD, seaHD, sandHD,
} from "../lapaz/paint";
import {
  Z_PLAZA, Z_PAPER, Z_EMBER, Z_MAP, FOREGROUND, type V3,
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
    facadeHD("dv_pl0", 5, 4, { wall: "#eedcc0", shutter: "#7c4c34", door: true }),
    facadeHD("dv_pl1", 5, 4, { wall: "#e4d2b4", shutter: "#3b6578" }),
    facadeHD("dv_pl2", 5, 4, { wall: "#dfc6a4", shutter: "#4a6c4b" }),
  ].map((tex, i) => lam([0xeedcc0, 0xe4d2b4, 0xdfc6a4][i], tex));
  const brick = lam(0xb76348, stoneHD("dv_brick", ["#c26c50", "#b25d42", "#c8775a", "#a3533a"], "#7a4435"));
  const roof = ["#b85838", "#8f4a32", "#4b7150"].map((hex, i) =>
    lam([0xb85838, 0x8f4a32, 0x4b7150][i], roofHD(hex)),
  );
  const nipa = lam(0xc49c62, roofHD("#c49c62"));
  const stone = lam(0x9a9184, stoneHD("dv_stone"));
  const darkStone = lam(0x635d56);
  const cobble = lam(0xb8ac98, cobbleHD());
  const wood = lam(0xc48b52, beamHD());
  const darkWood = lam(0x6d472c, beamHD());
  const trunk = lam(0x6b482e);
  const grass = lam(0x68a344, grassHD());
  const sea = lam(0x2d8bb5, seaHD());
  const sand = lam(0xd8b882, sandHD());
  const leaf = [0x3d8b3b, 0x4ea346, 0x62b44e].map((c) => lam(c));
  const brass = twoTone(matStd({ color: 0xdca83b, roughness: 0.34, metalness: 0.72 }));
  const iron = twoTone(matStd({ color: 0x3b4048, roughness: 0.48, metalness: 0.5 }));
  const paper = lam(0xf5eedb);
  const paperChar = lam(0x302624);
  const flameGlow = matStd({ color: 0xff8c2a, emissive: 0xff6218, emissiveIntensity: 1.55, roughness: 0.3 });
  const emberGlow = matStd({ color: 0xffb440, emissive: 0xff5a18, emissiveIntensity: 1.65, roughness: 0.25 });
  const planGlow = matStd({ color: 0xffe46b, emissive: 0xffbe2e, emissiveIntensity: 1.35, roughness: 0.35 });
  const smoke = lam(0x6e6a74);
  return {
    plaster, brick, roof, nipa, stone, darkStone, cobble, wood, darkWood, trunk,
    grass, sea, sand, leaf, brass, iron, paper, paperChar, flameGlow, emberGlow, planGlow, smoke,
  };
};
type Pal = ReturnType<typeof makePal>;

const addHouse = (
  b: Batch, p: Pal, x: number, y: number, z: number,
  w: number, h: number, d: number, ry: number, pi: number, ri: number, isBrick = false, isNipa = false,
) => {
  const wm = isBrick ? p.brick : p.plaster[pi % p.plaster.length];
  const rm = isNipa ? p.nipa : p.roof[ri % p.roof.length];
  const win = matStd({ color: 0x3a4d60, roughness: 0.32, emissive: 0xffdc92, emissiveIntensity: 0.14 });
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const pt = (lx: number, ly: number, lz: number): V3 => [x + lx * cos + lz * sin, y + ly, z - lx * sin + lz * cos];
  b.box(wm, w, h, d, ...pt(0, h / 2, 0), ry);
  b.box(p.stone, w + 0.2, 0.36, d + 0.2, ...pt(0, 0.18, 0), ry);
  const s = new THREE.Shape().moveTo(-w / 2 - 0.32, 0).lineTo(0, 1.35).lineTo(w / 2 + 0.32, 0).closePath();
  const rg = new THREE.ExtrudeGeometry(s, { depth: d + 0.6, bevelEnabled: false }).translate(0, h, -(d + 0.6) / 2);
  b.add(rg, rm, (g) => g.rotateY(ry).translate(x, y, z));
  const cols = Math.max(1, Math.round(w / 1.9));
  for (let i = 0; i < cols; i++) {
    const wx = -w * 0.3 + ((i + 0.5) / cols) * w * 0.6;
    b.box(win, 0.58, 0.78, 0.08, ...pt(wx, h * 0.64, d / 2 + 0.03), ry);
    b.box(p.stone, 0.68, 0.09, 0.12, ...pt(wx, h * 0.64 - 0.42, d / 2 + 0.04), ry);
  }
  b.box(p.darkWood, 0.82, 1.4, 0.08, ...pt(0, 0.7, d / 2 + 0.03), ry);
};

const addAcacia = (b: Batch, p: Pal, x: number, y: number, z: number, h: number, R: () => number) => {
  b.cyl(p.trunk, 0.18, 0.26, h, x, y + h / 2, z, 7);
  const lm = p.leaf[Math.floor(R() * p.leaf.length)];
  b.sph(lm, 1.25, x, y + h + 0.45, z, 1.45, 0.72, 1.35, 8);
  b.sph(p.leaf[2], 0.85, x + 0.55, y + h + 0.6, z - 0.25, 1.25, 0.65, 1.15, 7);
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
export type HeroPlaza = {
  flames: THREE.Mesh[];
  smokePuffs: THREE.Mesh[];
  firebreakLine: THREE.Mesh[];
  bunting: THREE.Group;
};

export type PaperStrip = {
  group: THREE.Group;
  charOverlay: THREE.Mesh;
  flame: THREE.Mesh;
};
export type HeroPaper = {
  strips: PaperStrip[];
  spark: THREE.Mesh;
};

export type HeroEmber = {
  narrowFlames: THREE.Mesh[];
  narrowRoofFire: THREE.Mesh[];
  narrowEmbers: THREE.Mesh[];
  wideFlames: THREE.Mesh[];
  wideEmbers: THREE.Mesh[];
  windStreaks: THREE.Mesh[];
};

export type HeroMap = {
  highlightRails: THREE.Mesh[];
  planBeacons: THREE.Mesh[];
};

export type BuiltDivisoria = {
  plaza: HeroPlaza;
  paper: HeroPaper;
  ember: HeroEmber;
  map: HeroMap;
};

const makeFlameCluster = (parent: THREE.Object3D, p: Pal, positions: [number, number, number, number][]): THREE.Mesh[] => {
  const list: THREE.Mesh[] = [];
  for (const [x, y, z, s] of positions) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.42 * s, 1.35 * s, 7), p.flameGlow);
    m.position.set(x, y, z);
    m.layers.set(NOINK);
    m.visible = false;
    parent.add(m);
    list.push(m);
  }
  return list;
};

// ---------------- District Builders ----------------
const buildPlaza = (parent: THREE.Object3D, p: Pal): HeroPlaza => {
  const b = new Batch();
  const [ox, , oz] = Z_PLAZA;
  const R = rng(8101);

  // Ground: wide cobble street flanking central grass Divisoria promenade + distant Cagayan hills
  b.box(p.cobble, 38, 0.24, 48, ox, -0.12, oz);
  b.box(p.grass, 150, 0.4, 90, ox, -0.25, oz - 54);
  b.sph(p.leaf[0], 26, ox - 30, -4, oz - 72, 2.2, 0.75, 1.3, 12);
  b.sph(p.leaf[2], 30, ox + 28, -3, oz - 78, 2.1, 0.9, 1.3, 12);

  // Central green Divisoria park strip (width 4.0 m, stone curb border so flanking houses frame 9:16 cleanly)
  b.box(p.stone, 4.4, 0.24, 34, ox, 0.12, oz - 4);
  b.box(p.grass, 3.9, 0.28, 33, ox, 0.14, oz - 4);
  // Central cobblestone cross-walkway
  b.box(p.cobble, 4.6, 0.30, 3.2, ox, 0.15, oz - 2.0);

  // Park benches & vintage iron street lamps along the Divisoria curbs
  for (const bz of [-8.5, -5.2, 2.2, 6.0]) {
    for (const side of [-1, 1]) {
      b.box(p.wood, 0.50, 0.12, 1.5, ox + side * 1.65, 0.56, oz + bz);
      b.box(p.iron, 0.40, 0.42, 0.12, ox + side * 1.65, 0.34, oz + bz - 0.58);
      b.box(p.iron, 0.40, 0.42, 0.12, ox + side * 1.65, 0.34, oz + bz + 0.58);
    }
  }
  for (const lz of [-11, -3.5, 4.0]) {
    for (const side of [-1, 1]) {
      b.cyl(p.iron, 0.08, 0.12, 3.2, ox + side * 2.35, 1.6, oz + lz, 8);
      b.sph(p.planGlow, 0.22, ox + side * 2.35, 3.3, oz + lz, 1, 1.15, 1, 8);
    }
  }

  // Heritage monument / plaza kiosk slightly offset to right-center background so central sightline stays open
  b.box(p.stone, 1.6, 0.6, 1.6, ox + 1.2, 0.54, oz - 10.5);
  b.cyl(p.stone, 0.38, 0.52, 2.6, ox + 1.2, 2.1, oz - 10.5, 8);
  b.cone(p.brass, 0.42, 0.85, ox + 1.2, 3.8, oz - 10.5, 8);

  // Acacia trees framing the distant plaza edges (clear of front sightlines & burning left house)
  for (const tz of [-13.5, -9.2]) {
    addAcacia(b, p, ox - 3.0, 0.1, oz + tz, 3.0, R);
    addAcacia(b, p, ox + 3.0, 0.1, oz + tz, 3.1, R);
  }
  addAcacia(b, p, ox + 3.1, 0.1, oz - 1.2, 2.9, R);

  // Left town block (x = -5.8 .. -11.0): tightly packed early-1900s timber & nipa-roofed houses!
  addHouse(b, p, ox - 5.9, 0, oz - 11.5, 4.0, 3.8, 3.8, Math.PI / 2, 0, 0, false, true);
  addHouse(b, p, ox - 5.9, 0, oz - 5.8,  4.2, 4.1, 4.0, Math.PI / 2, 2, 1, false, true);  // Hero burning house!
  addHouse(b, p, ox - 5.9, 0, oz + 0.2,  4.0, 3.9, 3.8, Math.PI / 2, 1, 0, false, false);
  addHouse(b, p, ox - 5.9, 0, oz + 6.2,  4.2, 3.8, 3.8, Math.PI / 2, 0, 2, false, true);

  // Right town block (x = +5.9 .. +11.0): safe opposite side of Divisoria
  addHouse(b, p, ox + 5.9, 0, oz - 11.2, 4.2, 4.2, 4.0, -Math.PI / 2, 1, 2, false, false);
  addHouse(b, p, ox + 5.9, 0, oz - 5.4,  4.0, 4.0, 3.8, -Math.PI / 2, 0, 0, true, false);
  addHouse(b, p, ox + 5.9, 0, oz + 0.6,  4.2, 4.1, 4.0, -Math.PI / 2, 2, 1, false, false);
  addHouse(b, p, ox + 5.9, 0, oz + 6.4,  4.0, 3.8, 3.8, -Math.PI / 2, 1, 0, false, false);

  b.flush(parent);

  // Festive plaza bunting with overhead string (visible during Shot 3 gathering)
  const bunting = new THREE.Group();
  const bb = new Batch();
  bb.box(p.iron, 5.2, 0.04, 0.04, ox, 3.72, oz - 3.5);
  for (let i = -3; i <= 3; i++) {
    const bx = ox + i * 0.72;
    const sag = 0.20 * (1 - (i / 3.5) ** 2);
    bb.box(i % 2 ? p.roof[0] : p.brass, 0.34, 0.38, 0.06, bx, 3.56 - sag, oz - 3.5, 0, (i % 2 ? 0.1 : -0.1));
  }
  bb.flush(bunting);
  parent.add(bunting);

  // Hero flames on left timber house (ox - 4.7, z = oz - 5.8)
  const flames = makeFlameCluster(parent, p, [
    [ox - 4.7, 3.8, oz - 5.8, 1.35],
    [ox - 4.3, 4.3, oz - 5.0, 1.2],
    [ox - 5.2, 4.6, oz - 6.3, 1.4],
    [ox - 4.0, 3.2, oz - 6.1, 1.05],
    [ox - 4.5, 4.9, oz - 5.6, 1.3],
  ]);

  // Rising smoke puffs above the burning left house
  const smokePuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const sm = new THREE.Mesh(new THREE.SphereGeometry(0.62 + (i % 3) * 0.18, 8, 6), p.smoke);
    sm.position.set(ox - 4.7, 5.2 + i * 0.7, oz - 5.8);
    sm.visible = false;
    parent.add(sm);
    smokePuffs.push(sm);
  }

  // Glowing golden firebreak boundary markers along the plaza edges (Shot 4)
  const firebreakLine: THREE.Mesh[] = [];
  for (const sx of [-2.3, 2.3]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 18.0), p.planGlow);
    bar.position.set(ox + sx, 0.32, oz - 4.0);
    bar.layers.set(NOINK);
    bar.visible = false;
    parent.add(bar);
    firebreakLine.push(bar);
  }

  return { flames, smokePuffs, firebreakLine, bunting };
};

const buildPaper = (parent: THREE.Object3D, p: Pal): HeroPaper => {
  const b = new Batch();
  const [ox, , oz] = Z_PAPER;
  const R = rng(8202);

  b.box(p.cobble, 28, 0.24, 24, ox, -0.12, oz);
  b.box(p.grass, 130, 0.4, 90, ox, -0.25, oz - 45);
  addHouse(b, p, ox - 8.5, 0, oz - 10.5, 5.0, 4.0, 4.0, 0.26, 0, 1);
  addHouse(b, p, ox + 8.5, 0, oz - 10.5, 5.0, 4.0, 4.0, -0.26, 2, 0);
  addAcacia(b, p, ox - 5.5, 0, oz - 6.2, 3.6, R);
  addAcacia(b, p, ox + 5.5, 0, oz - 6.2, 3.8, R);

  // Sunlit wooden workshop table (lowered top at y = 0.92 so characters behind are clearly visible)
  b.box(p.wood, 6.8, 0.20, 2.0, ox, 0.92, oz);
  for (const lx of [-2.9, 2.9]) for (const lz of [-0.75, 0.75]) {
    b.box(p.darkWood, 0.20, 0.82, 0.20, ox + lx, 0.41, oz + lz);
  }
  // Wooden slotted rail along tabletop
  b.box(p.darkWood, 5.8, 0.08, 0.56, ox, 1.06, oz);
  b.flush(parent);

  // 6 upright standing paper strips ("hanay ng mga piraso ng papel")
  const strips: PaperStrip[] = [];
  for (let i = 0; i < 6; i++) {
    const group = new THREE.Group();
    group.position.set(ox - 1.25 + i * 0.50, 1.10, oz);

    const card = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.82, 0.58), p.paper);
    card.position.y = 0.41;
    card.castShadow = true;
    card.receiveShadow = true;

    const charOverlay = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.83, 0.60), p.paperChar);
    charOverlay.position.y = 0.415;
    charOverlay.visible = false;

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.64, 7), p.flameGlow);
    flame.position.y = 1.02;
    flame.layers.set(NOINK);
    flame.visible = false;

    group.add(card, charOverlay, flame);
    parent.add(group);
    strips.push({ group, charOverlay, flame });
  }

  // Traveling spark / heat hop indicator
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), p.emberGlow);
  spark.position.set(ox - 1.5, 2.1, oz);
  spark.layers.set(NOINK);
  spark.visible = false;
  parent.add(spark);

  return { strips, spark };
};

const buildEmber = (parent: THREE.Object3D, p: Pal): HeroEmber => {
  const b = new Batch();
  const [ox, , oz] = Z_EMBER;
  const R = rng(8303);

  b.box(p.cobble, 32, 0.24, 24, ox, -0.12, oz);
  b.box(p.grass, 140, 0.4, 90, ox, -0.25, oz - 45);
  addAcacia(b, p, ox - 8.0, 0, oz - 7.0, 3.8, R);
  addAcacia(b, p, ox + 8.0, 0, oz - 7.0, 3.8, R);

  // LEFT PAIR (ox - 2.6): Narrow alley (1.2 m gap) between two flammable timber/nipa houses facing camera!
  addHouse(b, p, ox - 4.4, 0, oz - 0.4, 2.6, 3.3, 2.8, 0, 0, 0, false, true);
  addHouse(b, p, ox - 0.8, 0, oz - 0.4, 2.6, 3.3, 2.8, 0, 2, 1, false, true);

  // RIGHT PAIR (ox + 2.8): Wide stone-paved plaza gap (3.2 m) + brick/stone masonry building facing camera!
  b.box(p.stone, 4.4, 0.22, 4.8, ox + 3.0, 0.11, oz - 0.4);
  addHouse(b, p, ox + 0.6, 0, oz - 0.4, 2.2, 3.3, 2.8, 0, 1, 0, false, true);
  addHouse(b, p, ox + 5.6, 0, oz - 0.4, 2.8, 3.7, 3.0, 0, 0, 2, true, false); // Brick masonry!
  b.flush(parent);

  const narrowFlames = makeFlameCluster(parent, p, [
    [ox - 4.0, 3.9, oz - 0.4, 1.15],
    [ox - 3.6, 4.2, oz + 0.1, 1.0],
  ]);
  const narrowRoofFire = makeFlameCluster(parent, p, [
    [ox - 1.2, 3.8, oz - 0.3, 1.05],
    [ox - 0.8, 4.1, oz + 0.1, 0.9],
  ]);
  const wideFlames = makeFlameCluster(parent, p, [
    [ox + 0.9, 3.8, oz - 0.4, 1.15],
    [ox + 1.1, 4.1, oz + 0.1, 1.0],
  ]);

  const narrowEmbers: THREE.Mesh[] = [];
  const wideEmbers: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), p.emberGlow);
    e1.layers.set(NOINK);
    e1.visible = false;
    parent.add(e1);
    narrowEmbers.push(e1);

    const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), p.emberGlow);
    e2.layers.set(NOINK);
    e2.visible = false;
    parent.add(e2);
    wideEmbers.push(e2);
  }

  // Stylized wind streak bars sweeping left -> right
  const windStreaks: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const ws = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), p.planGlow);
    ws.layers.set(NOINK);
    ws.visible = false;
    parent.add(ws);
    windStreaks.push(ws);
  }

  return { narrowFlames, narrowRoofFire, narrowEmbers, wideFlames, wideEmbers, windStreaks };
};

const buildMap = (parent: THREE.Object3D, p: Pal): HeroMap => {
  const b = new Batch();
  const [ox, , oz] = Z_MAP;
  const R = rng(8404);

  b.box(p.cobble, 30, 0.24, 26, ox, -0.12, oz);
  b.box(p.grass, 130, 0.4, 90, ox, -0.25, oz - 45);

  // Raised architectural relief map plinth (top at y = 0.85)
  b.box(p.darkWood, 11.4, 0.85, 8.6, ox, 0.425, oz);
  b.box(p.cobble, 10.6, 0.14, 7.8, ox, 0.92, oz);

  // Cagayan River curved/straight channel along west edge of city map
  b.box(p.sea, 1.5, 0.18, 7.8, ox - 4.2, 0.94, oz);

  // Central straight Divisoria strip running cleanly across the city grid (x = ox - 2.6 .. ox + 4.4, z = oz - 0.65 .. oz + 0.65)!
  // Let's orient Divisoria East-West (x-axis) OR North-South (z-axis): North-South along z makes an iconic stripe down the vertical 9:16 screen!
  b.box(p.stone, 1.85, 0.20, 7.4, ox + 0.6, 0.97, oz);
  b.box(p.grass, 1.45, 0.24, 7.1, ox + 0.6, 0.98, oz);

  // Miniature city blocks on West (left of Divisoria) & East (right of Divisoria)
  for (let r = -3; r <= 3; r++) {
    const mz = oz + r * 0.98;
    // West block between river and Divisoria
    for (const mx of [ox - 2.6, ox - 1.35]) {
      const h = 0.45 + R() * 0.45;
      const mat = R() > 0.4 ? p.plaster[Math.floor(R() * 3)] : p.brick;
      b.box(mat, 0.85, h, 0.72, mx, 1.0 + h / 2, mz);
      b.box(p.roof[Math.floor(R() * 3)], 0.92, 0.16, 0.78, mx, 1.0 + h + 0.08, mz);
    }
    // East block (right of Divisoria)
    for (const mx of [ox + 2.55, ox + 3.85]) {
      const h = 0.48 + R() * 0.48;
      const mat = R() > 0.4 ? p.plaster[Math.floor(R() * 3)] : p.brick;
      b.box(mat, 0.85, h, 0.72, mx, 1.0 + h / 2, mz);
      b.box(p.roof[Math.floor(R() * 3)], 0.92, 0.16, 0.78, mx, 1.0 + h + 0.08, mz);
    }
    // Tiny trees lining Divisoria stripe
    b.sph(p.leaf[1], 0.22, ox - 0.05, 1.24, mz, 1, 1.1, 1, 6);
    b.sph(p.leaf[2], 0.22, ox + 1.25, 1.24, mz, 1, 1.1, 1, 6);
  }
  b.flush(parent);

  // Glowing golden highlight rails outlining the Divisoria stripe on the map (Shot 8)
  const highlightRails: THREE.Mesh[] = [];
  for (const sx of [-0.32, 1.52]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 7.3), p.planGlow);
    rail.position.set(ox + sx, 1.14, oz);
    rail.layers.set(NOINK);
    rail.visible = false;
    parent.add(rail);
    highlightRails.push(rail);
  }
  const planBeacons: THREE.Mesh[] = [];
  for (const bz of [-2.4, 0.0, 2.4]) {
    const bc = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.55, 8), p.planGlow);
    bc.position.set(ox + 0.6, 1.35, oz + bz);
    bc.layers.set(NOINK);
    bc.visible = false;
    parent.add(bc);
    planBeacons.push(bc);
  }

  return { highlightRails, planBeacons };
};

export const buildAllDistricts = (parent: THREE.Object3D): BuiltDivisoria => {
  const p = makePal();
  makeForeground(parent, p);
  const plaza = buildPlaza(parent, p);
  const paper = buildPaper(parent, p);
  const ember = buildEmber(parent, p);
  const map = buildMap(parent, p);
  return { plaza, paper, ember, map };
};
