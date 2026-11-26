// Builds all 6 cartoon-3D Tiwi geothermal districts & articulated hero props:
// 1. Tiwi geothermal cutaway hillside + 1979 power plant + cooling tower (Shots 1, 2, 8)
// 2. Deep well & cyclone steam separator cutaway (Shot 3)
// 3. Sunlit Tiwi plaza wooden table with toy pinwheel ("laruang elisi") (Shot 4)
// 4. Golden-hour open turbine + brass steam nozzle + coupled generator (Shot 5)
// 5. Golden-hour generator cutaway: spinning magnet + copper coils + electric pulses (Shot 6)
// 6. Full left-to-right geothermal energy chain ending at a glowing house lightbulb (Shot 7)
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twoTone } from "../../shared/shade";
import { NOINK } from "../../shared/ink";
import {
  rng, facadeHD, roofHD, stoneHD, cobbleHD, grassHD, beamHD,
} from "../lapaz/paint";
import {
  Z_HOOK, Z_WELLS, Z_PINWHEEL, Z_TURBINE, Z_GEN, Z_CHAIN, FOREGROUND, type V3,
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
    facadeHD("tw_pl0", 5, 4, { wall: "#eedcc0", shutter: "#3b6578", door: true }),
    facadeHD("tw_pl1", 5, 4, { wall: "#e2cfb0", shutter: "#7c4c34" }),
    facadeHD("tw_pl2", 5, 4, { wall: "#dcd2be", shutter: "#4a6c4b" }),
  ].map((tex, i) => lam([0xeedcc0, 0xe2cfb0, 0xdcd2be][i], tex));
  const brick = lam(0xb76348, stoneHD("tw_brick", ["#c26c50", "#b25d42", "#c8775a", "#a3533a"], "#7a4435"));
  const roof = ["#b85838", "#4b7150", "#5b6d7c"].map((hex, i) =>
    lam([0xb85838, 0x4b7150, 0x5b6d7c][i], roofHD(hex)),
  );
  const stone = lam(0x9a9184, stoneHD("tw_stone"));
  const darkEarth = lam(0x5b4638);
  const soil = lam(0x7c5a40);
  const cobble = lam(0xb8ac98, cobbleHD());
  const wood = lam(0xc48b52, beamHD());
  const darkWood = lam(0x6d472c, beamHD());
  const trunk = lam(0x6b482e);
  const grass = lam(0x66a344, grassHD());
  const leaf = [0x3d8b3b, 0x4ea346, 0x62b44e].map((c) => lam(c));
  const steel = twoTone(matStd({ color: 0x7d8a96, roughness: 0.38, metalness: 0.55 }));
  const darkSteel = twoTone(matStd({ color: 0x414852, roughness: 0.45, metalness: 0.5 }));
  const brass = twoTone(matStd({ color: 0xdca83b, roughness: 0.34, metalness: 0.72 }));
  const copper = twoTone(matStd({ color: 0xc96e38, roughness: 0.32, metalness: 0.75 }));
  const pipeBlue = lam(0x3a7ca5);
  const waterBlue = lam(0x46a2d4);
  const redMag = lam(0xd9433b);
  const blueMag = lam(0x366dc2);
  const steamWhite = lam(0xf4f7fa);
  const magmaGlow = matStd({ color: 0xff6a22, emissive: 0xff4810, emissiveIntensity: 1.55, roughness: 0.35 });
  const electricGlow = matStd({ color: 0xffe46b, emissive: 0xffbf24, emissiveIntensity: 1.7, roughness: 0.25 });
  const bulbLitMat = matStd({ color: 0xfff2a6, emissive: 0xffcc33, emissiveIntensity: 2.25, roughness: 0.2 });
  const bulbOffMat = lam(0xcbd5df);
  const pinwheelColors = [lam(0xe34c42), lam(0xf2b638), lam(0x3a88c8), lam(0x4ca658)];
  return {
    plaster, brick, roof, stone, darkEarth, soil, cobble, wood, darkWood, trunk,
    grass, leaf, steel, darkSteel, brass, copper, pipeBlue, waterBlue,
    redMag, blueMag, steamWhite, magmaGlow, electricGlow, bulbLitMat, bulbOffMat, pinwheelColors,
  };
};
type Pal = ReturnType<typeof makePal>;

const addHouse = (
  b: Batch, p: Pal, x: number, y: number, z: number,
  w: number, h: number, d: number, ry: number, pi: number, ri: number, isBrick = false,
) => {
  const wm = isBrick ? p.brick : p.plaster[pi % p.plaster.length];
  const rm = p.roof[ri % p.roof.length];
  const win = matStd({ color: 0x3a4d60, roughness: 0.32, emissive: 0xffdc92, emissiveIntensity: 0.14 });
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const pt = (lx: number, ly: number, lz: number): V3 => [x + lx * cos + lz * sin, y + ly, z - lx * sin + lz * cos];
  b.box(wm, w, h, d, ...pt(0, h / 2, 0), ry);
  b.box(p.stone, w + 0.2, 0.36, d + 0.2, ...pt(0, 0.18, 0), ry);
  const s = new THREE.Shape().moveTo(-w / 2 - 0.3, 0).lineTo(0, 1.2).lineTo(w / 2 + 0.3, 0).closePath();
  const rg = new THREE.ExtrudeGeometry(s, { depth: d + 0.55, bevelEnabled: false }).translate(0, h, -(d + 0.55) / 2);
  b.add(rg, rm, (g) => g.rotateY(ry).translate(x, y, z));
  const cols = Math.max(1, Math.round(w / 1.8));
  for (let i = 0; i < cols; i++) {
    const wx = -w * 0.28 + ((i + 0.5) / cols) * w * 0.56;
    b.box(win, 0.55, 0.72, 0.08, ...pt(wx, h * 0.64, d / 2 + 0.03), ry);
    b.box(p.stone, 0.64, 0.08, 0.12, ...pt(wx, h * 0.64 - 0.40, d / 2 + 0.04), ry);
  }
  b.box(p.darkWood, 0.76, 1.32, 0.08, ...pt(0, 0.66, d / 2 + 0.03), ry);
};

const addTree = (b: Batch, p: Pal, x: number, y: number, z: number, h: number, R: () => number) => {
  b.cyl(p.trunk, 0.16, 0.24, h, x, y + h / 2, z, 7);
  const lm = p.leaf[Math.floor(R() * p.leaf.length)];
  b.sph(lm, 1.15, x, y + h + 0.45, z, 1.35, 0.8, 1.25, 8);
  b.sph(p.leaf[2], 0.78, x + 0.48, y + h + 0.62, z - 0.22, 1.15, 0.7, 1.1, 7);
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

const makeTurbineWheel = (p: Pal, radius = 0.95, blades = 8): THREE.Group => {
  const grp = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.36, 12), p.brass);
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  grp.add(hub);
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    const arm = new THREE.Group();
    arm.rotation.z = a;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, radius, 0.30), p.steel);
    blade.position.y = radius * 0.56;
    blade.rotation.y = 0.38;
    blade.castShadow = true;
    arm.add(blade);
    grp.add(arm);
  }
  return grp;
};

// ---------------- Hero Structures ----------------
export type HeroHook = {
  steamPuffs: THREE.Mesh[];
  coolingPuffs: THREE.Mesh[];
  turbineRotor: THREE.Group;
  bulbOrb: THREE.Mesh;
  bulbLitMat: THREE.MeshPhongMaterial;
  bulbOffMat: THREE.MeshLambertMaterial;
  magmaRocks: THREE.Mesh[];
};

export type HeroWells = {
  liquidDrops: THREE.Mesh[];
  mixedSteam: THREE.Mesh[];
  pureSteam: THREE.Mesh[];
  drainDrops: THREE.Mesh[];
  magmaCores: THREE.Mesh[];
};

export type HeroPinwheel = {
  rotor: THREE.Group;
  windPuffs: THREE.Mesh[];
};

export type HeroTurbine = {
  turbineRotor: THREE.Group;
  shaftCollars: THREE.Group;
  genRotorMarker: THREE.Group;
  steamJets: THREE.Mesh[];
};

export type HeroGen = {
  magnetRotor: THREE.Group;
  sparks: THREE.Mesh[];
  coilGlows: THREE.Mesh[];
  meterBulb: THREE.Mesh;
  bulbLitMat: THREE.MeshPhongMaterial;
  bulbOffMat: THREE.MeshLambertMaterial;
};

export type HeroChain = {
  magmaRocks: THREE.Mesh[];
  steamPuffs: THREE.Mesh[];
  turbineRotor: THREE.Group;
  genRing: THREE.Group;
  wirePulses: THREE.Mesh[];
  houseBulb: THREE.Mesh;
  bulbLitMat: THREE.MeshPhongMaterial;
  bulbOffMat: THREE.MeshLambertMaterial;
};

export type BuiltTiwi = {
  hook: HeroHook;
  wells: HeroWells;
  pinwheel: HeroPinwheel;
  turbine: HeroTurbine;
  gen: HeroGen;
  chain: HeroChain;
};

// 1. Hook & 1979 Tiwi Geothermal Plant (Shots 1, 2, 8)
const buildHook = (parent: THREE.Object3D, p: Pal): HeroHook => {
  const b = new Batch();
  const [ox, , oz] = Z_HOOK;
  const R = rng(9101);

  b.box(p.cobble, 36, 0.24, 34, ox, -0.12, oz);
  b.box(p.grass, 160, 0.4, 95, ox, -0.25, oz - 50);
  // Bicol hills & iconic Mayon-style cone far in background
  b.sph(p.leaf[0], 26, ox - 30, -3, oz - 68, 2.0, 0.85, 1.3, 12);
  b.sph(p.leaf[1], 28, ox + 28, -3, oz - 72, 2.0, 0.9, 1.3, 12);
  b.cone(p.leaf[2], 18, 20, ox + 4, 8, oz - 84, 14);

  // Geological cutaway terrace block sitting cleanly at y = 0..2.2 (z = oz - 4.2)
  b.box(p.darkEarth, 10.6, 1.3, 3.2, ox, 0.65, oz - 4.2);
  b.box(p.soil, 10.8, 0.9, 3.4, ox, 1.75, oz - 4.2);
  b.box(p.grass, 11.2, 0.24, 3.8, ox, 2.30, oz - 4.2);

  // Cutaway front cavern frame revealing glowing magma pocket at x = ox - 2.0
  b.box(p.stone, 4.2, 0.22, 0.35, ox - 1.9, 1.85, oz - 2.55);
  b.box(p.stone, 0.28, 1.85, 0.35, ox - 3.9, 0.92, oz - 2.55);
  b.box(p.stone, 0.28, 1.85, 0.35, ox + 0.1, 0.92, oz - 2.55);

  // Deep geothermal wellhead pipe from underground pocket up into separator & powerhouse
  b.cyl(p.darkSteel, 0.24, 0.24, 3.8, ox - 1.9, 2.1, oz - 3.4, 10);
  b.cyl(p.steel, 0.28, 0.28, 0.35, ox - 1.9, 3.9, oz - 3.4, 10); // flange
  b.cyl(p.steel, 0.18, 0.18, 2.4, ox - 0.7, 3.9, oz - 3.4, 10, 0, Math.PI / 2); // horizontal feed pipe

  // Cooling tower (left rear on plant terrace y = 2.4)
  b.cyl(p.stone, 0.95, 1.35, 2.8, ox - 3.8, 3.8, oz - 4.8, 14);
  b.cyl(p.darkSteel, 1.02, 1.02, 0.22, ox - 3.8, 5.15, oz - 4.8, 14);

  // Cyclone separator tank (center, y = 2.4..4.6)
  b.cyl(p.pipeBlue, 0.56, 0.56, 2.1, ox - 0.1, 3.45, oz - 3.5, 12);
  b.cyl(p.steel, 0.16, 0.16, 1.6, ox + 0.9, 4.2, oz - 3.5, 8, 0, Math.PI / 2);

  // Powerhouse turbine hall (open front arch at ox + 2.0, y = 2.4..4.6)
  b.box(p.plaster[0], 3.0, 2.2, 2.4, ox + 2.0, 3.5, oz - 4.3);
  b.box(p.roof[2], 3.4, 0.32, 2.8, ox + 2.0, 4.75, oz - 4.3);
  b.box(p.darkSteel, 1.8, 1.5, 0.2, ox + 2.0, 3.25, oz - 3.12); // recessed turbine bay backing

  // Transmission pylon & streetlamp pole on right edge (ox + 4.4)
  b.cyl(p.darkSteel, 0.12, 0.18, 3.8, ox + 4.4, 4.2, oz - 3.6, 8);
  b.box(p.darkSteel, 1.2, 0.12, 0.12, ox + 4.4, 5.8, oz - 3.6);
  b.cyl(p.copper, 0.05, 0.05, 1.9, ox + 3.6, 5.1, oz - 3.6, 6, 0, 1.15);

  // Flanking trees & small 1979 service house on ground level
  addTree(b, p, ox - 6.6, 0, oz - 5.2, 3.2, R);
  addTree(b, p, ox + 6.4, 0, oz - 5.4, 3.0, R);
  addHouse(b, p, ox + 6.2, 0, oz - 1.5, 2.8, 2.8, 2.6, -Math.PI / 2, 1, 0);
  b.flush(parent);

  // Dynamic magma rocks inside cutaway
  const magmaRocks: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + (i % 2) * 0.14, 0), p.magmaGlow);
    m.position.set(ox - 3.1 + i * 0.62, 0.52 + (i % 2) * 0.24, oz - 2.75);
    m.layers.set(NOINK);
    parent.add(m);
    magmaRocks.push(m);
  }

  // Turbine wheel inside open powerhouse bay
  const turbineRotor = makeTurbineWheel(p, 0.68, 8);
  turbineRotor.position.set(ox + 2.0, 3.35, oz - 2.95);
  parent.add(turbineRotor);

  // Glowing power-pole bulb orb
  const bulbOrb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), p.bulbOffMat);
  bulbOrb.position.set(ox + 4.4, 6.25, oz - 3.6);
  bulbOrb.layers.set(NOINK);
  parent.add(bulbOrb);

  // Rising steam puffs from wellhead/separator and cooling tower
  const steamPuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const sm = new THREE.Mesh(new THREE.SphereGeometry(0.30 + (i % 3) * 0.1, 8, 7), p.steamWhite);
    sm.layers.set(NOINK);
    sm.visible = false;
    parent.add(sm);
    steamPuffs.push(sm);
  }
  const coolingPuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const cm = new THREE.Mesh(new THREE.SphereGeometry(0.42 + (i % 2) * 0.12, 8, 7), p.steamWhite);
    cm.layers.set(NOINK);
    parent.add(cm);
    coolingPuffs.push(cm);
  }

  return {
    steamPuffs, coolingPuffs, turbineRotor, bulbOrb,
    bulbLitMat: p.bulbLitMat, bulbOffMat: p.bulbOffMat, magmaRocks,
  };
};

// 2. Deep Wells + Liquid/Steam Cyclone Separator (Shot 3)
const buildWells = (parent: THREE.Object3D, p: Pal): HeroWells => {
  const b = new Batch();
  const [ox, , oz] = Z_WELLS;
  const R = rng(9202);

  b.box(p.cobble, 30, 0.24, 26, ox, -0.12, oz);
  b.box(p.grass, 130, 0.4, 90, ox, -0.25, oz - 45);
  addTree(b, p, ox - 6.0, 0, oz - 6.0, 3.5, R);
  addTree(b, p, ox + 6.0, 0, oz - 6.0, 3.6, R);

  // Clean geological cross-section wall at z = oz - 2.6
  b.box(p.darkEarth, 9.2, 1.5, 2.2, ox, 0.75, oz - 2.6);
  b.box(p.soil, 9.4, 1.2, 2.4, ox, 2.1, oz - 2.6);
  b.box(p.grass, 9.8, 0.24, 2.8, ox, 2.82, oz - 2.6);

  // Underground heat chamber recess (left: x = ox - 1.9, y = 0.2..1.5)
  b.box(p.stone, 3.2, 0.2, 0.4, ox - 1.9, 1.65, oz - 1.4);
  b.box(p.stone, 0.24, 1.5, 0.4, ox - 3.4, 0.85, oz - 1.4);
  b.box(p.stone, 0.24, 1.5, 0.4, ox - 0.4, 0.85, oz - 1.4);

  // Vertical glass-cutaway well casing rising from hot rock (y = 0.9 .. 4.3)
  b.box(p.darkSteel, 0.14, 3.6, 0.45, ox - 2.25, 2.55, oz - 1.45);
  b.box(p.darkSteel, 0.14, 3.6, 0.45, ox - 1.55, 2.55, oz - 1.45);
  b.cyl(p.steel, 0.44, 0.44, 0.22, ox - 1.9, 4.35, oz - 1.45, 12);

  // Horizontal delivery pipe from wellhead (ox - 1.9) to separator drum (ox + 1.3)
  b.cyl(p.steel, 0.24, 0.24, 3.2, ox - 0.3, 4.15, oz - 1.45, 10, 0, Math.PI / 2);

  // Hero Cyclone Steam Separator Drum (ox + 1.3, y = 2.0..4.5)
  b.cyl(p.pipeBlue, 0.85, 0.85, 2.3, ox + 1.3, 3.45, oz - 1.45, 16);
  b.cyl(p.steel, 0.92, 0.92, 0.18, ox + 1.3, 4.58, oz - 1.45, 16);
  b.cyl(p.steel, 0.92, 0.92, 0.18, ox + 1.3, 2.32, oz - 1.45, 16);

  // Bottom liquid drain pipe -> reinjection tank (ox + 2.7, y = 0.6..1.9)
  b.cyl(p.pipeBlue, 0.18, 0.18, 1.5, ox + 1.3, 1.65, oz - 1.45, 10);
  b.cyl(p.pipeBlue, 0.16, 0.16, 1.3, ox + 1.95, 0.95, oz - 1.45, 10, 0, Math.PI / 2);
  b.cyl(p.waterBlue, 0.68, 0.68, 1.15, ox + 2.8, 0.58, oz - 1.45, 12);

  // Top pure-steam outlet pipe -> turbine nozzle on right (ox + 1.3 .. + 3.4, y = 4.75)
  b.cyl(p.brass, 0.20, 0.20, 0.6, ox + 1.3, 4.85, oz - 1.45, 10);
  b.cyl(p.steel, 0.18, 0.18, 2.0, ox + 2.3, 4.95, oz - 1.45, 10, 0, Math.PI / 2);
  b.flush(parent);

  const magmaCores: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42 + (i % 2) * 0.12, 0), p.magmaGlow);
    m.position.set(ox - 2.7 + i * 0.55, 0.52 + (i % 2) * 0.2, oz - 1.6);
    m.layers.set(NOINK);
    parent.add(m);
    magmaCores.push(m);
  }

  const liquidDrops: THREE.Mesh[] = [];
  const mixedSteam: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const ld = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), p.waterBlue);
    ld.layers.set(NOINK);
    ld.visible = false;
    parent.add(ld);
    liquidDrops.push(ld);

    const ms = new THREE.Mesh(new THREE.SphereGeometry(0.20, 8, 7), p.steamWhite);
    ms.layers.set(NOINK);
    ms.visible = false;
    parent.add(ms);
    mixedSteam.push(ms);
  }

  const drainDrops: THREE.Mesh[] = [];
  const pureSteam: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const dd = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 7), p.waterBlue);
    dd.layers.set(NOINK);
    dd.visible = false;
    parent.add(dd);
    drainDrops.push(dd);

    const ps = new THREE.Mesh(new THREE.SphereGeometry(0.25 + (i % 2) * 0.08, 8, 7), p.steamWhite);
    ps.layers.set(NOINK);
    ps.visible = false;
    parent.add(ps);
    pureSteam.push(ps);
  }

  return { liquidDrops, mixedSteam, pureSteam, drainDrops, magmaCores };
};

// 3. Sunlit Plaza Table & Toy Pinwheel ("laruang elisi", Shot 4)
const buildPinwheel = (parent: THREE.Object3D, p: Pal): HeroPinwheel => {
  const b = new Batch();
  const [ox, , oz] = Z_PINWHEEL;
  const R = rng(9303);

  b.box(p.cobble, 28, 0.24, 24, ox, -0.12, oz);
  b.box(p.grass, 130, 0.4, 90, ox, -0.25, oz - 45);
  addHouse(b, p, ox - 6.8, 0, oz - 8.2, 4.2, 3.6, 3.6, 0.25, 0, 0);
  addHouse(b, p, ox + 6.8, 0, oz - 8.2, 4.2, 3.6, 3.6, -0.25, 2, 1);
  addTree(b, p, ox - 4.8, 0, oz - 5.0, 3.3, R);
  addTree(b, p, ox + 4.8, 0, oz - 5.0, 3.4, R);

  // Wooden plaza table (top at y = 0.92) + pinwheel stand base
  b.box(p.wood, 5.2, 0.18, 1.8, ox, 0.92, oz);
  for (const lx of [-2.2, 2.2]) for (const lz of [-0.68, 0.68]) {
    b.box(p.darkWood, 0.18, 0.82, 0.18, ox + lx, 0.41, oz + lz);
  }
  b.cyl(p.darkWood, 0.34, 0.40, 0.14, ox + 0.3, 1.08, oz + 0.1, 12);
  b.cyl(p.wood, 0.06, 0.07, 1.25, ox + 0.3, 1.72, oz + 0.1, 8);
  b.flush(parent);

  // Colorful 4-blade toy pinwheel rotor at (ox + 0.3, 2.35, oz + 0.22)
  const rotor = new THREE.Group();
  rotor.position.set(ox + 0.3, 2.35, oz + 0.22);
  const centerCap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), p.brass);
  rotor.add(centerCap);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.30, 0.72, 4), p.pinwheelColors[i]);
    petal.scale.set(0.75, 1.0, 0.18);
    petal.position.set(0.16, 0.38, 0);
    petal.rotation.z = -0.35;
    petal.rotation.y = 0.28;
    petal.castShadow = true;
    arm.add(petal);
    rotor.add(arm);
  }
  parent.add(rotor);

  const windPuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const wp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), p.steamWhite);
    wp.layers.set(NOINK);
    wp.visible = false;
    parent.add(wp);
    windPuffs.push(wp);
  }

  return { rotor, windPuffs };
};

// 4. Golden-Hour Pressurized Steam Turbine + Coupled Generator (Shot 5)
const buildTurbine = (parent: THREE.Object3D, p: Pal): HeroTurbine => {
  const b = new Batch();
  const [ox, , oz] = Z_TURBINE;
  const R = rng(9404);

  b.box(p.cobble, 32, 0.24, 26, ox, -0.12, oz);
  b.box(p.grass, 140, 0.4, 90, ox, -0.25, oz - 45);
  addTree(b, p, ox - 7.0, 0, oz - 6.5, 3.6, R);
  addTree(b, p, ox + 7.0, 0, oz - 6.5, 3.6, R);

  // Heavy powerhouse concrete plinth (top y = 0.65)
  b.box(p.stone, 7.8, 0.65, 3.2, ox + 0.2, 0.325, oz - 0.5);

  // High-pressure steam inlet pipe & brass nozzle on left (ox - 2.7 -> ox - 1.4, y = 2.25)
  b.cyl(p.darkSteel, 0.24, 0.24, 1.6, ox - 2.7, 1.45, oz - 0.5, 10);
  b.cyl(p.steel, 0.24, 0.24, 1.2, ox - 2.2, 2.25, oz - 0.5, 10, 0, Math.PI / 2);
  b.cyl(p.brass, 0.18, 0.30, 0.48, ox - 1.45, 2.25, oz - 0.5, 12, 0, Math.PI / 2);

  // Open cutaway lower turbine cradle around x = ox - 0.35
  b.box(p.darkSteel, 1.9, 0.9, 1.5, ox - 0.35, 1.1, oz - 0.5);
  b.box(p.steel, 0.22, 1.3, 1.3, ox - 1.15, 1.85, oz - 0.5);
  b.box(p.steel, 0.22, 1.3, 1.3, ox + 0.45, 1.85, oz - 0.5);

  // Stationary generator stator housing on right (ox + 1.9, y = 2.25)
  b.box(p.darkSteel, 1.8, 0.8, 1.5, ox + 1.9, 1.05, oz - 0.5);
  b.cyl(p.pipeBlue, 0.85, 0.85, 1.75, ox + 1.9, 2.25, oz - 0.5, 16, 0, 0, Math.PI / 2);
  b.cyl(p.copper, 0.90, 0.90, 0.22, ox + 1.2, 2.25, oz - 0.5, 16, 0, 0, Math.PI / 2);
  b.cyl(p.copper, 0.90, 0.90, 0.22, ox + 2.6, 2.25, oz - 0.5, 16, 0, 0, Math.PI / 2);
  b.flush(parent);

  // Spinning multi-blade turbine rotor at (ox - 0.35, 2.25, oz - 0.3)
  const turbineRotor = makeTurbineWheel(p, 0.96, 8);
  turbineRotor.position.set(ox - 0.35, 2.25, oz - 0.25);
  parent.add(turbineRotor);

  // Coupled shaft & collars bridging turbine -> generator (rotates on Z/X cleanly)
  const shaftCollars = new THREE.Group();
  shaftCollars.position.set(ox + 0.75, 2.25, oz - 0.25);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.2, 10), p.brass);
  shaft.rotation.z = Math.PI / 2;
  shaftCollars.add(shaft);
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 0.52), p.redMag);
  shaftCollars.add(collar);
  parent.add(shaftCollars);

  // Generator front rotor indicator disk so coupling rotation is visually obvious
  const genRotorMarker = new THREE.Group();
  genRotorMarker.position.set(ox + 1.9, 2.25, oz + 0.42);
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 12), p.brass);
  disk.rotation.x = Math.PI / 2;
  genRotorMarker.add(disk);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.16), p.redMag);
  genRotorMarker.add(bar);
  parent.add(genRotorMarker);

  const steamJets: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const sj = new THREE.Mesh(new THREE.SphereGeometry(0.20 + (i % 2) * 0.08, 8, 7), p.steamWhite);
    sj.layers.set(NOINK);
    sj.visible = false;
    parent.add(sj);
    steamJets.push(sj);
  }

  return { turbineRotor, shaftCollars, genRotorMarker, steamJets };
};

// 5. Golden-Hour Cutaway Inside Generator: Magnet + Copper Coils (Shot 6)
const buildGen = (parent: THREE.Object3D, p: Pal): HeroGen => {
  const b = new Batch();
  const [ox, , oz] = Z_GEN;
  const R = rng(9505);

  b.box(p.cobble, 28, 0.24, 24, ox, -0.12, oz);
  b.box(p.grass, 130, 0.4, 90, ox, -0.25, oz - 45);
  addTree(b, p, ox - 6.0, 0, oz - 6.0, 3.4, R);
  addTree(b, p, ox + 6.0, 0, oz - 6.0, 3.4, R);

  // Generator cradle + open cutaway circular stator ring (center y = 2.15)
  b.box(p.stone, 5.2, 0.55, 2.4, ox, 0.275, oz - 0.3);
  b.box(p.darkSteel, 3.2, 0.6, 1.4, ox, 0.85, oz - 0.3);

  // Outer stator housing blocks (top, bottom, left, right) holding wound copper coils
  b.box(p.pipeBlue, 2.6, 0.28, 1.3, ox, 3.55, oz - 0.3);
  b.box(p.pipeBlue, 2.6, 0.28, 1.3, ox, 0.82, oz - 0.3);
  b.box(p.pipeBlue, 0.28, 2.7, 1.3, ox - 1.38, 2.18, oz - 0.3);
  b.box(p.pipeBlue, 0.28, 2.7, 1.3, ox + 1.38, 2.18, oz - 0.3);

  // Output copper busbars running right to voltage meter post
  b.cyl(p.copper, 0.08, 0.08, 1.4, ox + 2.05, 2.5, oz - 0.2, 8, 0, Math.PI / 2);
  b.cyl(p.copper, 0.08, 0.08, 1.4, ox + 2.05, 1.9, oz - 0.2, 8, 0, Math.PI / 2);
  b.box(p.darkSteel, 0.65, 1.75, 0.65, ox + 2.75, 1.42, oz - 0.2);
  b.flush(parent);

  // Thick copper wire coil windings ("mga likaw ng kawad") inside stator walls
  const coilGlows: THREE.Mesh[] = [];
  const coilSpots: [number, number, number, number][] = [
    [ox, 3.22, oz - 0.15, 0],
    [ox, 1.15, oz - 0.15, 0],
    [ox - 1.05, 2.18, oz - 0.15, Math.PI / 2],
    [ox + 1.05, 2.18, oz - 0.15, Math.PI / 2],
  ];
  for (const [cx, cy, cz, rz] of coilSpots) {
    for (let k = -2; k <= 2; k++) {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 8, 14), p.copper);
      wrap.position.set(cx + (rz ? 0 : k * 0.22), cy + (rz ? k * 0.22 : 0), cz);
      if (rz) wrap.rotation.z = rz;
      else wrap.rotation.y = Math.PI / 2;
      parent.add(wrap);
      coilGlows.push(wrap);
    }
  }

  // Spinning Red (N) / Blue (S) bar magnet rotor inside the generator bore
  const magnetRotor = new THREE.Group();
  magnetRotor.position.set(ox, 2.18, oz - 0.05);
  const redHalf = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.72, 0.44), p.redMag);
  redHalf.position.y = 0.36;
  const blueHalf = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.72, 0.44), p.blueMag);
  blueHalf.position.y = -0.36;
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 10), p.brass);
  axle.rotation.x = Math.PI / 2;
  magnetRotor.add(redHalf, blueHalf, axle);
  parent.add(magnetRotor);

  // Glowing electric pulses traveling out of coils to the meter bulb
  const sparks: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), p.electricGlow);
    sp.layers.set(NOINK);
    sp.visible = false;
    parent.add(sp);
    sparks.push(sp);
  }

  const meterBulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), p.bulbOffMat);
  meterBulb.position.set(ox + 2.75, 2.55, oz - 0.2);
  meterBulb.layers.set(NOINK);
  parent.add(meterBulb);

  return {
    magnetRotor, sparks, coilGlows, meterBulb,
    bulbLitMat: p.bulbLitMat, bulbOffMat: p.bulbOffMat,
  };
};

// 6. Full Left-to-Right Energy Chain Diorama -> Lightbulb (Shot 7)
const buildChain = (parent: THREE.Object3D, p: Pal): HeroChain => {
  const b = new Batch();
  const [ox, , oz] = Z_CHAIN;
  const R = rng(9606);

  b.box(p.cobble, 34, 0.24, 24, ox, -0.12, oz);
  b.box(p.grass, 150, 0.4, 95, ox, -0.25, oz - 48);
  b.sph(p.leaf[0], 22, ox - 20, -3, oz - 60, 2.0, 0.8, 1.3, 10);
  b.sph(p.leaf[2], 24, ox + 20, -3, oz - 64, 2.0, 0.9, 1.3, 10);
  addTree(b, p, ox - 8.2, 0, oz - 5.5, 3.4, R);
  addTree(b, p, ox + 8.4, 0, oz - 5.5, 3.4, R);

  // 1) Left: Underground heat cutaway (ox - 5.0)
  b.box(p.darkEarth, 3.4, 1.4, 2.2, ox - 5.0, 0.7, oz - 1.2);
  b.box(p.grass, 3.6, 0.22, 2.4, ox - 5.0, 1.5, oz - 1.2);
  b.cyl(p.darkSteel, 0.20, 0.20, 2.2, ox - 4.6, 2.1, oz - 1.1, 10);

  // 2) Separator & steam conduit (ox - 2.6)
  b.cyl(p.pipeBlue, 0.56, 0.56, 1.8, ox - 2.6, 2.2, oz - 1.1, 12);
  b.cyl(p.steel, 0.16, 0.16, 2.0, ox - 3.6, 3.0, oz - 1.1, 8, 0, Math.PI / 2);
  b.cyl(p.steel, 0.16, 0.16, 2.1, ox - 1.5, 2.8, oz - 1.1, 8, 0, Math.PI / 2);

  // 3) Turbine pedestal + 4) Generator block (ox - 0.4 .. ox + 2.0)
  b.box(p.stone, 4.4, 0.65, 2.2, ox + 0.8, 0.325, oz - 1.1);
  b.box(p.darkSteel, 1.0, 1.0, 1.2, ox - 0.4, 1.15, oz - 1.1);
  b.cyl(p.pipeBlue, 0.72, 0.72, 1.4, ox + 1.9, 2.05, oz - 1.1, 14, 0, 0, Math.PI / 2);
  b.cyl(p.brass, 0.12, 0.12, 1.8, ox + 0.7, 2.05, oz - 1.1, 8, 0, Math.PI / 2);

  // 5) Transmission pylon & overhead wire (ox + 3.4 -> ox + 5.2)
  b.cyl(p.darkSteel, 0.10, 0.14, 3.4, ox + 3.4, 1.7, oz - 1.1, 8);
  b.box(p.darkSteel, 0.9, 0.10, 0.10, ox + 3.4, 3.25, oz - 1.1);
  b.cyl(p.copper, 0.04, 0.04, 1.6, ox + 2.7, 2.7, oz - 1.1, 6, 0, 0.8);
  b.cyl(p.copper, 0.04, 0.04, 1.9, ox + 4.35, 3.2, oz - 0.95, 6, 0, Math.PI / 2);

  // 6) Cozy Tiwi House on right (ox + 5.6) with front porch & giant hanging lightbulb!
  addHouse(b, p, ox + 5.6, 0, oz - 1.0, 3.0, 3.0, 2.8, 0, 0, 0);
  b.box(p.wood, 1.4, 0.12, 0.9, ox + 5.2, 2.85, oz + 0.65); // porch eave
  b.cyl(p.darkSteel, 0.06, 0.06, 0.38, ox + 5.2, 2.65, oz + 0.85, 8); // bulb socket
  b.flush(parent);

  const magmaRocks: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), p.magmaGlow);
    m.position.set(ox - 5.9 + i * 0.56, 0.5 + (i % 2) * 0.2, oz - 0.2);
    m.layers.set(NOINK);
    parent.add(m);
    magmaRocks.push(m);
  }

  const steamPuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const sm = new THREE.Mesh(new THREE.SphereGeometry(0.22 + (i % 2) * 0.08, 8, 7), p.steamWhite);
    sm.layers.set(NOINK);
    sm.visible = false;
    parent.add(sm);
    steamPuffs.push(sm);
  }

  const turbineRotor = makeTurbineWheel(p, 0.78, 8);
  turbineRotor.position.set(ox - 0.4, 2.05, oz - 0.95);
  parent.add(turbineRotor);

  const genRing = new THREE.Group();
  genRing.position.set(ox + 1.9, 2.05, oz - 0.35);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.14), p.redMag);
  genRing.add(bar);
  parent.add(genRing);

  const wirePulses: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const wp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), p.electricGlow);
    wp.layers.set(NOINK);
    wp.visible = false;
    parent.add(wp);
    wirePulses.push(wp);
  }

  // Hero glass lightbulb under the house porch eave (ox + 5.2, y = 2.22, z = oz + 0.85)
  const houseBulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), p.bulbOffMat);
  houseBulb.position.set(ox + 5.2, 2.22, oz + 0.85);
  houseBulb.layers.set(NOINK);
  parent.add(houseBulb);

  return {
    magmaRocks, steamPuffs, turbineRotor, genRing, wirePulses, houseBulb,
    bulbLitMat: p.bulbLitMat, bulbOffMat: p.bulbOffMat,
  };
};

export const buildAllDistricts = (parent: THREE.Object3D): BuiltTiwi => {
  const p = makePal();
  makeForeground(parent, p);
  const hook = buildHook(parent, p);
  const wells = buildWells(parent, p);
  const pinwheel = buildPinwheel(parent, p);
  const turbine = buildTurbine(parent, p);
  const gen = buildGen(parent, p);
  const chain = buildChain(parent, p);
  return { hook, wells, pinwheel, turbine, gen, chain };
};
