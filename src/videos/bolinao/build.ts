// Builds all 5 cartoon-3D Bolinao districts + hero archaeological props into batched & hero meshes.
// Static surfaces go through Batch (merged by material and two-tone shaded); dynamic hero props are returned for animation.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twoTone } from "../../shared/shade";
import { NOINK } from "../../shared/ink";
import {
  rng, ctex, rep, facadeHD, roofHD, stoneHD, cobbleHD, grassHD, sandHD, seaHD, beamHD,
} from "../lapaz/paint";
import {
  Z_MUSEUM, Z_DIG, Z_PIER, Z_WORKSHOP, Z_TREASURE, FOREGROUND, type V3,
} from "./story";

// Material helper: NEVER pass undefined map (avoids THREE.Material: parameter 'map' has value of undefined).
// twoTone works on MeshLambertMaterial (matte) and MeshPhongMaterial (metallic/glossy highlight).
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

// ---------------- Geometry batcher ----------------
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
  box(m: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
    this.add(new THREE.BoxGeometry(w, h, d), m, (g) => {
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

// ---------------- Shared coastal palette & textures ----------------
const makePal = () => {
  const plaster = [
    facadeHD("pl0", 5, 4, { wall: "#f2dfc2", shutter: "#3f6c88" }),
    facadeHD("pl1", 5, 4, { wall: "#e8cfb0", shutter: "#7c4734" }),
    facadeHD("pl2", 5, 4, { wall: "#d8ead8", shutter: "#3a7054" }),
    facadeHD("pl3", 5, 4, { wall: "#f2e6c8", shutter: "#5d4b72" }),
    facadeHD("pl4", 5, 4, { wall: "#d8e8f2", shutter: "#35688a" }),
    facadeHD("pl5", 5, 4, { wall: "#f4dac2", shutter: "#8b4b32" }),
  ].map((tex, i) => lam([0xf2dfc2, 0xe8cfb0, 0xd8ead8, 0xf2e6c8, 0xd8e8f2, 0xf4dac2][i], tex));
  const roof = ["#b64b34", "#c8643a", "#3b6e88", "#7b563c"].map((hex, i) =>
    lam([0xb64b34, 0xc8643a, 0x3b6e88, 0x7b563c][i], roofHD(hex)),
  );
  const trim = lam(0xfff4e0);
  const wood = lam(0xc49562, beamHD());
  const darkWood = lam(0x7c5334, beamHD());
  const trunk = lam(0x6b4b34);
  const stone = lam(0xb8ab98, stoneHD("stoneHD"));
  const marble = lam(0xebe3d3, stoneHD("marbleHD", ["#ede5d6", "#e2d9c8", "#f3ede0", "#dad0bf"], "#bfb4a0"));
  const marbleDark = lam(0xc5b8a4, stoneHD("marbleDk", ["#cbbda9", "#bfb19c", "#d5c7b4", "#b4a690"], "#968a77"));
  const cobble = lam(0xb8ad9c, cobbleHD());
  const ruinStone = lam(0x9a8f7b, stoneHD("ruinHD", ["#a49a86", "#958a76", "#b1a792", "#887e6c"], "#665e50"));
  const brass = twoTone(matStd({ color: 0xd9a83e, roughness: 0.35, metalness: 0.72 }));
  const velvet = lam(0x7e222e);
  const velvetNavy = lam(0x213552);
  const glass = twoTone(matStd({ color: 0xd6eef7, roughness: 0.14, metalness: 0.1, transparent: true, opacity: 0.22 }));
  const trenchEarth = lam(0x8a5d3b, sandHD());
  const grass = lam(0x79b24c, grassHD());
  const sand = lam(0xe5c886, sandHD());
  const seaMat = twoTone(matStd({ color: 0x329cc2, roughness: 0.28, metalness: 0.1, map: rep(seaHD(), 8, 5) }));
  const canvasAwning = lam(0xf4ead2);
  const bancaBlue = lam(0x3a82b4);
  const bancaRed = lam(0xc94a38);
  const bancaYellow = lam(0xebba46);
  const leaf = [0x3d8a3b, 0x4ea345, 0x67b652, 0x2f7231].map((c) => lam(c));
  const leafWarm = [0x4c963c, 0x62aa44, 0x7ebe50].map((c) => lam(c));
  const rope = lam(0xcab282);
  const rock = lam(0x7d766d, stoneHD("rockHD", ["#8a8278", "#7c756b", "#968e83", "#6f6960"], "#555048"));
  const hillGreen = lam(0x5b9647, grassHD());
  return {
    plaster, roof, trim, wood, darkWood, trunk, stone, marble, marbleDark,
    cobble, ruinStone, brass, velvet, velvetNavy, glass, trenchEarth, grass,
    sand, seaMat, canvasAwning, bancaBlue, bancaRed, bancaYellow, leaf, leafWarm, rope, rock, hillGreen,
  };
};
type Pal = ReturnType<typeof makePal>;

// ---------------- Architectural & landscape helpers ----------------
const house = (b: Batch, p: Pal, x: number, y: number, z: number, w: number, h: number, d: number, ry: number, r: number, pi: number, ri: number) => {
  const pm = p.plaster[pi % p.plaster.length], rm = p.roof[ri % p.roof.length];
  const win = matStd({ color: 0x3b4d63, roughness: 0.35, emissive: 0xffe49e, emissiveIntensity: 0.18 });
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const pt = (lx: number, ly: number, lz: number): V3 => [x + lx * cos + lz * sin, y + ly, z - lx * sin + lz * cos];
  b.box(pm, w, h, d, ...pt(0, h / 2, 0), ry);
  b.box(p.stone, w + 0.18, 0.34, d + 0.18, ...pt(0, 0.17, 0), ry);
  const s = new THREE.Shape().moveTo(-w / 2 - 0.25, 0).lineTo(0, r).lineTo(w / 2 + 0.25, 0).closePath();
  const rg = new THREE.ExtrudeGeometry(s, { depth: d + 0.5, bevelEnabled: false }).translate(0, h, -(d + 0.5) / 2);
  b.add(rg, rm, (g) => g.rotateY(ry).translate(x, y, z));
  const cols = Math.max(1, Math.round(w / 1.9));
  for (let i = 0; i < cols; i++) {
    const wx = -w * 0.34 + ((i + 0.5) / cols) * w * 0.68;
    b.box(win, 0.55, 0.72, 0.08, ...pt(wx, h * 0.64, d / 2 + 0.03), ry);
    b.box(p.trim, 0.66, 0.1, 0.12, ...pt(wx, h * 0.64 - 0.38, d / 2 + 0.04), ry);
  }
  b.box(p.darkWood, 0.78, 1.38, 0.08, ...pt(0, 0.69, d / 2 + 0.03), ry);
};

const addPalm = (b: Batch, p: Pal, x: number, y: number, z: number, h: number, lean: number, yaw: number, R: () => number) => {
  const segs = 7;
  let cx = x, cy = y, cz = z;
  const dx = Math.cos(yaw) * lean, dz = Math.sin(yaw) * lean;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < segs; i++) {
    const t = (i + 1) / segs, rad = 0.21 - (i / segs) * 0.1;
    const nx = x + dx * (t ** 1.45), nz = z + dz * (t ** 1.45), ny = y + t * h;
    const dir = new THREE.Vector3(nx - cx, ny - cy, nz - cz);
    const len = dir.length() + 0.08;
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize());
    b.add(new THREE.CylinderGeometry(rad * 0.88, rad, len, 8), p.trunk, (g) =>
      g.applyQuaternion(q).translate((cx + nx) / 2, (cy + ny) / 2, (cz + nz) / 2),
    );
    cx = nx; cy = ny; cz = nz;
  }
  const fCount = 7;
  for (let i = 0; i < fCount; i++) {
    const a = (i / fCount) * Math.PI * 2 + R() * 0.25;
    const lm = p.leaf[i % p.leaf.length];
    for (let k = 0; k < 3; k++) {
      const dist = 0.45 + k * 0.52, drop = k * k * 0.17;
      b.sph(lm, 0.48 - k * 0.08, cx + Math.cos(a) * dist, cy + 0.16 - drop, cz + Math.sin(a) * dist, 1.45, 0.22, 0.72, 6);
    }
  }
};

const addVeg = (b: Batch, p: Pal, x: number, y: number, z: number, s: number, R: () => number, warm = false) => {
  const lm = (warm ? p.leafWarm : p.leaf)[Math.floor(R() * (warm ? p.leafWarm : p.leaf).length)];
  b.sph(lm, 0.46 * s, x, y + 0.34 * s, z, 1.2, 0.85, 1.1, 7);
  b.sph(lm, 0.36 * s, x + 0.26 * s, y + 0.26 * s, z + 0.18 * s, 1.1, 0.8, 1.1, 7);
};

const addBanca = (b: Batch, p: Pal, x: number, y: number, z: number, ry: number, hullMat: THREE.Material) => {
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const pt = (lx: number, ly: number, lz: number): V3 => [x + lx * cos + lz * sin, y + ly, z - lx * sin + lz * cos];
  b.box(hullMat, 0.9, 0.38, 3.8, ...pt(0, 0.18, 0), ry);
  b.cone(hullMat, 0.48, 1.15, ...pt(0, 0.22, 2.3), 7);
  b.box(p.wood, 0.82, 0.1, 3.2, ...pt(0, 0.39, 0), ry);
  for (const bz of [-0.9, 0.9]) b.box(p.rope, 3.8, 0.07, 0.09, ...pt(0, 0.22, bz), ry);
  for (const ox of [-1.88, 1.88]) b.cyl(p.rope, 0.07, 0.07, 3.7, ...pt(ox, 0.06, 0), 7, Math.PI / 2, 0, ry);
};

const addPot = (b: Batch, p: Pal, x: number, y: number, z: number, s = 1) => {
  const clay = lam(0xa65336);
  b.cyl(clay, 0.24 * s, 0.16 * s, 0.42 * s, x, y + 0.21 * s, z, 10);
  b.cyl(clay, 0.27 * s, 0.24 * s, 0.09 * s, x, y + 0.42 * s, z, 10);
  b.sph(p.leaf[0], 0.26 * s, x, y + 0.56 * s, z, 1.15, 0.85, 1.15, 7);
};

const makeMuseumPoster = (title: string, bgHex: string, motif: "fish" | "skull" | "map") => {
  const tex = ctex(`poster:${motif}:${title}`, 512, 384, (ctx) => {
    const w = 512, h = 384;
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#5b3b24";
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = "#2b1d14";
    ctx.font = "bold 30px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(title, w / 2, 56);
    if (motif === "fish") {
      ctx.fillStyle = "#3a8cb8";
      ctx.beginPath();
      ctx.ellipse(w / 2 - 20, h / 2 + 15, 110, 58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f2c34f";
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        ctx.arc(w / 2 - 60 + c * 32 + (r % 2) * 14, h / 2 - 12 + r * 26, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (motif === "skull") {
      ctx.fillStyle = "#efe0be";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 68, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#221a14";
      ctx.fillRect(w / 2 - 36, h / 2 + 48, 72, 22);
      ctx.fillStyle = "#efb734";
      for (let i = -2; i <= 2; i++) ctx.fillRect(w / 2 + i * 14 - 5, h / 2 + 52, 9, 10);
    } else {
      ctx.fillStyle = "#76b064";
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 20, 130, 74, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d9503b";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(w / 2 + 15, h / 2 + 15, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  return matStd({ map: tex, roughness: 0.72 });
};

// ---------------- Hero Archaeological Models (from Bolinao provenance) ----------------
export type HeroSkull = {
  group: THREE.Group;
  jaw: THREE.Group;
  goldInlays: THREE.Mesh[];
};

const buildHeroSkull = (scale = 1): HeroSkull => {
  const boneMat = twoTone(matStd({ color: 0xead8b5, roughness: 0.84 }));
  const boneShade = twoTone(matStd({ color: 0xc2ab84, roughness: 0.9 }));
  const enamelMat = twoTone(matStd({ color: 0xf7f1e0, roughness: 0.45 }));
  const cavityMat = matStd({ color: 0x1b110d, roughness: 0.96 });
  const goldMat = twoTone(matStd({ color: 0xffc633, roughness: 0.22, metalness: 0.78, emissive: 0x5c3900, emissiveIntensity: 0.18 }));

  const group = new THREE.Group();
  group.scale.setScalar(scale);

  // Cranium dome
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.46, 26, 20), boneMat);
  cranium.scale.set(0.92, 1.04, 1.14);
  cranium.position.set(0, 0.26, -0.04);
  cranium.castShadow = true;
  group.add(cranium);

  // Sculpted brow ridges & cheekbones (tucked smoothly into cranium above eye rims)
  for (const side of [-1, 1]) {
    const browArch = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 12), boneMat);
    browArch.scale.set(1.18, 0.36, 0.82);
    browArch.position.set(side * 0.16, 0.165, 0.35);
    browArch.rotation.z = side * -0.1;
    group.add(browArch);

    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), boneMat);
    cheek.scale.set(0.88, 0.72, 0.92);
    cheek.position.set(side * 0.24, -0.02, 0.33);
    group.add(cheek);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 10, 22), boneShade);
    rim.position.set(side * 0.17, 0.08, 0.41);
    group.add(rim);

    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), cavityMat);
    socket.scale.set(1, 0.88, 0.54);
    socket.position.set(side * 0.17, 0.08, 0.37);
    group.add(socket);
  }

  // Nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.16, 3), cavityMat);
  nose.position.set(0, -0.055, 0.435);
  group.add(nose);

  // Subtle archaeological suture line
  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.22, 0.04), boneShade);
  crack.position.set(0.12, 0.46, 0.34);
  crack.rotation.z = 0.24;
  group.add(crack);

  // Upper maxilla + upper teeth row
  const maxilla = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.18, 18, 1, false, -Math.PI * 0.55, Math.PI * 1.1), boneMat);
  maxilla.position.set(0, -0.17, 0.22);
  group.add(maxilla);

  const goldInlays: THREE.Mesh[] = [];
  const toothSpecs = [
    { x: -0.21, z: 0.34, ry: -0.58, w: 0.058, inlay: false },
    { x: -0.145, z: 0.405, ry: -0.34, w: 0.06, inlay: true },
    { x: -0.075, z: 0.438, ry: -0.14, w: 0.064, inlay: true },
    { x: 0.0, z: 0.448, ry: 0.0, w: 0.066, inlay: true },
    { x: 0.075, z: 0.438, ry: 0.14, w: 0.064, inlay: true },
    { x: 0.145, z: 0.405, ry: 0.34, w: 0.06, inlay: true },
    { x: 0.21, z: 0.34, ry: 0.58, w: 0.058, inlay: false },
  ];

  toothSpecs.forEach((t, ti) => {
    const tooth = new THREE.Group();
    tooth.position.set(t.x, -0.285, t.z);
    tooth.rotation.y = t.ry;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(t.w, 0.088, 0.042), enamelMat);
    tooth.add(crown);
    if (t.inlay) {
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const sq = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.014, 0.01), goldMat.clone());
          sq.position.set((c - 1) * 0.018 + (r === 1 ? 0.008 : -0.003), (r - 0.5) * 0.025, 0.024);
          tooth.add(sq);
          goldInlays.push(sq);
        }
      }
      if (ti >= 2 && ti <= 4) {
        const extra = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.013, 0.01), goldMat.clone());
        extra.position.set(-0.018, 0.024, 0.024);
        tooth.add(extra);
        goldInlays.push(extra);
      }
    }
    group.add(tooth);
  });

  // Lower mandible
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.31, 0.04);
  const chin = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.14, 18, 1, false, -Math.PI * 0.52, Math.PI * 1.04), boneMat);
  chin.position.set(0, -0.14, 0.18);
  jaw.add(chin);
  for (let i = -3; i <= 3; i++) {
    const lt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.072, 0.036), enamelMat);
    lt.position.set(i * 0.064, -0.06, 0.39 - Math.abs(i) * 0.035);
    lt.rotation.y = i * 0.18;
    jaw.add(lt);
  }
  group.add(jaw);

  return { group, jaw, goldInlays };
};

export type HeroFish = { group: THREE.Group; scales: THREE.Mesh[]; tail: THREE.Mesh };
const buildHeroFish = (): HeroFish => {
  const bodyMat = twoTone(matStd({ color: 0x3b8bb6, roughness: 0.42, metalness: 0.15 }));
  const bellyMat = twoTone(matStd({ color: 0xdcf0f6, roughness: 0.5 }));
  const finMat = twoTone(matStd({ color: 0x26658b, roughness: 0.48 }));
  const scaleMat = twoTone(matStd({ color: 0xf4c84b, roughness: 0.22, metalness: 0.72, emissive: 0x452d00, emissiveIntensity: 0.16 }));
  const scaleRimMat = twoTone(matStd({ color: 0x99d6eb, roughness: 0.3, metalness: 0.35 }));
  const eyeWhite = matStd({ color: 0xffffff, roughness: 0.3 });
  const eyePupil = matStd({ color: 0x161922, roughness: 0.25 });

  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.54, 24, 18), bodyMat);
  body.scale.set(1.85, 0.96, 0.62);
  body.castShadow = true;
  group.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 14), bellyMat);
  belly.scale.set(1.65, 0.58, 0.54);
  belly.position.set(0.05, -0.18, 0);
  group.add(belly);

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.52, 4), finMat);
  dorsal.scale.set(1.2, 1, 0.25);
  dorsal.rotation.z = -0.35;
  dorsal.position.set(-0.08, 0.58, 0);
  group.add(dorsal);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.68, 4), finMat);
  tail.scale.set(1, 1, 0.22);
  tail.rotation.z = -Math.PI / 2;
  tail.position.set(-1.12, 0, 0);
  group.add(tail);

  for (const sz of [-1, 1]) {
    const ew = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), eyeWhite);
    ew.position.set(0.56, 0.14, sz * 0.22);
    group.add(ew);
    const ep = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), eyePupil);
    ep.position.set(0.61, 0.14, sz * 0.27);
    group.add(ep);
  }

  // Sleek gill arc separating head from scaled flank
  const gill = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.022, 8, 18, Math.PI * 0.9), finMat);
  gill.rotation.z = -Math.PI * 0.45;
  gill.position.set(0.42, 0.0, 0.26);
  group.add(gill);

  // Gleaming staggered fish-scale domes fitted cleanly across mid-body behind gill
  const scales: THREE.Mesh[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const u = -0.58 + col * 0.21 + (row % 2 === 1 ? 0.1 : 0);
      const v = (row - 1.5) * 0.16;
      const sc = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 10), col % 2 === 0 ? scaleMat.clone() : scaleRimMat.clone());
      sc.scale.set(1.05, 0.88, 0.24);
      const depthZ = Math.max(0.14, 0.33 - u * u * 0.24 - v * v * 0.32);
      sc.position.set(u, v + 0.02, depthZ);
      group.add(sc);
      scales.push(sc);
    }
  }
  return { group, scales, tail };
};

export type HeroKnife = { group: THREE.Group; rivets: THREE.Group[] };
const buildHeroKnife = (): HeroKnife => {
  const woodMat = twoTone(matStd({ color: 0x734224, roughness: 0.72 }));
  const bladeMat = twoTone(matStd({ color: 0xdbe3eb, roughness: 0.22, metalness: 0.78 }));
  const rivetMat = twoTone(matStd({ color: 0xc2cbd4, roughness: 0.26, metalness: 0.85 }));
  const brassMat = twoTone(matStd({ color: 0xd9a83e, roughness: 0.32, metalness: 0.74 }));

  const group = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.34, 0.28), woodMat);
  handle.position.set(-0.75, 0, 0);
  handle.castShadow = true;
  group.add(handle);

  const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.31), brassMat);
  bolster.position.set(0.14, 0, 0);
  group.add(bolster);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.28, 0.05), bladeMat);
  blade.position.set(1.12, 0.02, 0);
  blade.castShadow = true;
  group.add(blade);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.145, 0.45, 4), bladeMat);
  tip.rotation.z = -Math.PI / 2;
  tip.scale.set(1, 1, 0.18);
  tip.position.set(2.26, 0.03, 0);
  group.add(tip);

  const rivets: THREE.Group[] = [];
  for (let i = 0; i < 5; i++) {
    const rGrp = new THREE.Group();
    const rx = -1.42 + i * 0.32;
    const rz = (i % 2 === 0 ? 1 : -1) * 0.048;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.34, 14), rivetMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 10), rivetMat);
    head.scale.set(1, 0.55, 1);
    head.position.set(0, 0.18, 0);
    rGrp.add(shaft, head);
    rGrp.position.set(rx, 0, rz);
    group.add(rGrp);
    rivets.push(rGrp);
  }
  return { group, rivets };
};

export type HeroTooth = { group: THREE.Group; pegs: { mesh: THREE.Mesh; targetPos: V3 }[] };
const buildHeroTooth = (): HeroTooth => {
  const enamel = twoTone(matStd({ color: 0xf7f0dd, roughness: 0.42 }));
  const dentin = twoTone(matStd({ color: 0xdcc38f, roughness: 0.72 }));
  const holeMat = matStd({ color: 0x2a1b12, roughness: 0.95 });
  const gold = twoTone(matStd({ color: 0xffc633, roughness: 0.2, metalness: 0.82, emissive: 0x623d00, emissiveIntensity: 0.18 }));

  const group = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.56, 22, 18), enamel);
  crown.scale.set(0.88, 1.08, 0.44);
  crown.position.set(0, 0.34, 0);
  crown.castShadow = true;
  group.add(crown);

  const cuspLeft = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), enamel);
  cuspLeft.scale.set(0.9, 0.72, 0.72);
  cuspLeft.position.set(-0.22, 0.74, 0);
  const cuspRight = cuspLeft.clone();
  cuspRight.position.x = 0.22;
  group.add(cuspLeft, cuspRight);

  const root = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.88, 16), dentin);
  root.rotation.x = Math.PI;
  root.position.set(0, -0.52, 0);
  group.add(root);

  const pegs: { mesh: THREE.Mesh; targetPos: V3 }[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const px = (c - 1) * 0.21 + (r === 1 ? 0.09 : -0.03);
      const py = 0.12 + r * 0.22;
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.06, 16), holeMat);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(px, py, 0.22);
      group.add(hole);

      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.05, 0.15, 16), gold.clone());
      peg.rotation.x = Math.PI / 2;
      peg.position.set(px, py, 0.255);
      group.add(peg);
      pegs.push({ mesh: peg, targetPos: [px, py, 0.255] });
    }
  }
  return { group, pegs };
};

const buildJewels = (): THREE.Group => {
  const gold = twoTone(matStd({ color: 0xffc633, roughness: 0.2, metalness: 0.82 }));
  const gem = twoTone(matStd({ color: 0xdf3b3b, roughness: 0.25, metalness: 0.2 }));
  const g = new THREE.Group();

  // Beaded gold necklace
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), gold);
    bead.position.set(Math.cos(a) * 0.52, 0.14, Math.sin(a) * 0.42 - 0.15);
    g.add(bead);
  }
  const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 16), gold);
  pendant.position.set(0, 0.14, 0.34);
  g.add(pendant);

  // Gold ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.044, 12, 24), gold);
  ring.rotation.x = 0.6;
  ring.position.set(-0.62, 0.18, 0.36);
  g.add(ring);
  const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), gem);
  stone.position.set(-0.62, 0.31, 0.46);
  g.add(stone);

  // Spiral ear ornament
  const ear = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.032, 10, 20, Math.PI * 1.65), gold);
  ear.rotation.x = Math.PI / 2;
  ear.position.set(0.62, 0.15, 0.35);
  g.add(ear);
  return g;
};

const buildSpecimenFinds = (): THREE.Group[] => {
  const enamel = twoTone(matStd({ color: 0xf6eedb, roughness: 0.45 }));
  const dentin = twoTone(matStd({ color: 0xd5bc8a, roughness: 0.72 }));
  const gold = twoTone(matStd({ color: 0xffc633, roughness: 0.22, metalness: 0.8 }));
  const out: THREE.Group[] = [];
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), enamel);
    crown.scale.set(0.86, 1.12, 0.48);
    crown.position.y = 0.18;
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.30, 12), dentin);
    root.rotation.x = Math.PI;
    root.position.y = -0.11;
    t.add(crown, root);
    for (let j = 0; j < 2 + (i % 3); j++) {
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.025, 10), gold);
      dot.rotation.x = Math.PI / 2;
      dot.position.set((j - 0.8) * 0.056, 0.12 + (j % 2) * 0.08, 0.085);
      t.add(dot);
    }
    t.position.set((i - 2) * 0.56, 1.18, Math.abs(i - 2) * 0.12);
    t.rotation.y = (i - 2) * -0.16;
    out.push(t);
  }
  return out;
};

// ---------------- Foreground framing props (corner silhouettes on lens blur edge) ----------------
const makeForeground = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  for (const fg of FOREGROUND) {
    const [x, y, z] = fg.pos, s = fg.s ?? 1;
    if (fg.kind === "crate") b.box(p.wood, 0.9 * s, 0.72 * s, 0.85 * s, x, y + 0.36 * s, z, fg.yaw ?? 0);
    else addPot(b, p, x, y, z, s * 1.15);
  }
  b.flush(parent);
};

// ---------------- District Builders ----------------
const buildMuseum = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  const [ox, , oz] = Z_MUSEUM;
  // Checkerboard limestone courtyard & gallery floor
  b.box(p.marble, 36, 0.25, 36, ox, -0.125, oz);
  for (let gx = -10; gx <= 10; gx += 4) for (let gz = -12; gz <= 8; gz += 4) {
    b.box(p.marbleDark, 2.0, 0.04, 2.0, ox + gx, 0.01, oz + gz);
  }
  // Distant tropical horizon beyond open gallery courtyard
  b.box(p.grass, 140, 0.4, 90, ox, -0.25, oz - 54);
  b.sph(p.hillGreen, 26, ox - 28, -4, oz - 68, 2.2, 0.7, 1.3, 12);
  b.sph(p.hillGreen, 24, ox + 26, -3, oz - 72, 2.0, 0.65, 1.2, 12);

  // Grand central Bolinao Skull pedestal
  b.box(p.stone, 1.95, 0.24, 1.95, ox, 0.12, oz);
  b.box(p.darkWood, 1.35, 0.88, 1.35, ox, 0.68, oz);
  b.box(p.brass, 1.42, 0.07, 1.42, ox, 1.14, oz);
  b.box(p.velvet, 1.18, 0.12, 1.18, ox, 1.21, oz);

  // Stanchion posts around the pedestal
  const stanchions: V3[] = [
    [ox - 1.55, 0, oz + 1.55],
    [ox + 1.55, 0, oz + 1.55],
    [ox - 1.55, 0, oz - 1.45],
    [ox + 1.55, 0, oz - 1.45],
  ];
  for (const [sx, sy, sz] of stanchions) {
    b.cyl(p.brass, 0.18, 0.22, 0.06, sx, sy + 0.03, sz, 12);
    b.cyl(p.brass, 0.04, 0.04, 0.92, sx, sy + 0.5, sz, 10);
    b.sph(p.brass, 0.08, sx, sy + 0.98, sz, 1, 1, 1, 10);
  }
  // Draped velvet ropes
  const addRope = (a: V3, c: V3) => {
    const mid: V3 = [(a[0] + c[0]) / 2, 0.72, (a[2] + c[2]) / 2];
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(a[0], 0.92, a[2]), new THREE.Vector3(...mid), new THREE.Vector3(c[0], 0.92, c[2])]);
    b.add(new THREE.TubeGeometry(curve, 12, 0.035, 7, false), p.velvet);
  };
  addRope(stanchions[0], stanchions[2]);
  addRope(stanchions[1], stanchions[3]);

  // Open colonnade pillars + exhibition facade behind
  for (const px of [-6.2, -3.4, 3.4, 6.2]) {
    b.box(p.stone, 0.95, 0.45, 0.95, ox + px, 0.22, oz - 5.2);
    b.cyl(p.marble, 0.34, 0.38, 4.4, ox + px, 2.6, oz - 5.2, 12);
    b.box(p.stone, 0.95, 0.35, 0.95, ox + px, 4.95, oz - 5.2);
  }
  b.box(p.marbleDark, 14.2, 0.55, 1.2, ox, 5.4, oz - 5.2);

  // Heritage coastal houses / museum annex buildings framing back left & right
  house(b, p, ox - 8.5, 0, oz - 12.5, 5.2, 3.8, 4.2, 0.28, 1.5, 0, 0);
  house(b, p, ox + 8.5, 0, oz - 12.5, 5.2, 3.8, 4.2, -0.28, 1.5, 3, 2);

  // Display easels with educational illustrations
  const leftPoster = makeMuseumPoster("BOLINAO · PANGASINAN", "#f4e6c7", "map");
  const rightPoster = makeMuseumPoster("HUGIS-KALISKIS", "#e7f1f6", "fish");
  for (const [ex, ez, ry, mat] of [
    [-4.3, -2.5, 0.38, leftPoster],
    [4.3, -2.5, -0.38, rightPoster],
  ] as [number, number, number, THREE.Material][]) {
    b.box(p.darkWood, 0.12, 1.75, 0.12, ox + ex - 0.55, 0.88, oz + ez - 0.15);
    b.box(p.darkWood, 0.12, 1.75, 0.12, ox + ex + 0.55, 0.88, oz + ez - 0.15);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.08), mat);
    board.position.set(ox + ex, 1.65, oz + ez);
    board.rotation.y = ry;
    board.castShadow = true;
    parent.add(board);
  }

  // Potted courtyard plants & tropical palms visible over the colonnade
  const R = rng(4101);
  addPot(b, p, ox - 2.3, 0, oz - 2.6, 1.15);
  addPot(b, p, ox + 2.3, 0, oz - 2.6, 1.15);
  addPalm(b, p, ox - 5.2, 0, oz - 10.5, 7.2, 1.4, 0.5, R);
  addPalm(b, p, ox + 5.6, 0, oz - 10.8, 7.6, 1.6, 2.3, R);
  addPalm(b, p, ox - 1.2, 0, oz - 18.0, 8.2, 1.2, 1.1, R);
  for (let i = 0; i < 6; i++) addVeg(b, p, ox - 7 + i * 2.8, 0, oz - 8.2 - (i % 2) * 1.4, 1.1, R);

  b.flush(parent);

  const heroSkull = buildHeroSkull(1.02);
  heroSkull.group.position.set(ox, 1.72, oz);
  parent.add(heroSkull.group);
  return heroSkull;
};

const buildDig = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  const [ox, , oz] = Z_DIG;
  const R = rng(4202);

  // Balingasay ground terrain + distant coastal river/bay
  b.box(p.grass, 120, 0.4, 90, ox, -0.2, oz - 8);
  b.box(p.sand, 28, 0.14, 24, ox + 5, 0.01, oz - 2);
  // Coastal bay behind dig site
  const seaMesh = new THREE.Mesh(new THREE.PlaneGeometry(150, 70), p.seaMat);
  seaMesh.rotation.x = -Math.PI / 2;
  seaMesh.position.set(ox, -0.06, oz - 54);
  seaMesh.layers.set(NOINK);
  parent.add(seaMesh);
  b.box(p.sand, 150, 0.24, 10, ox, 0.02, oz - 19);
  addBanca(b, p, ox - 8.5, 0.14, oz - 22.5, 0.25, p.bancaBlue);
  addBanca(b, p, ox + 9.5, 0.14, oz - 24.5, -0.35, p.bancaYellow);

  // Excavation pit berm & wooden plank perimeter at (ox, 0, oz - 0.5)
  b.box(p.trenchEarth, 4.6, 0.22, 3.8, ox, 0.11, oz - 0.5);
  b.box(p.wood, 4.9, 0.28, 0.18, ox, 0.22, oz + 1.45);
  b.box(p.wood, 4.9, 0.28, 0.18, ox, 0.22, oz - 2.45);
  b.box(p.wood, 0.18, 0.28, 4.0, ox - 2.4, 0.22, oz - 0.5);
  b.box(p.wood, 0.18, 0.28, 4.0, ox + 2.4, 0.22, oz - 0.5);
  // Corner stakes & sand mounds
  for (const [sx, sz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 1.5], [2.5, 1.5]]) {
    b.cyl(p.darkWood, 0.06, 0.06, 0.95, ox + sx, 0.45, oz + sz, 7);
  }
  b.sph(p.sand, 1.35, ox - 3.3, 0.18, oz - 1.2, 1.2, 0.55, 1.1, 9);
  b.sph(p.sand, 1.15, ox + 3.2, 0.18, oz - 0.8, 1.1, 0.52, 1.1, 9);

  // Field tent awning over dig pit
  for (const ax of [-3.4, 3.4]) {
    b.cyl(p.darkWood, 0.07, 0.07, 3.1, ox + ax, 1.55, oz - 3.9, 7);
    b.cyl(p.darkWood, 0.07, 0.07, 2.7, ox + ax, 1.35, oz - 0.8, 7);
  }
  b.box(p.canvasAwning, 7.4, 0.1, 3.8, ox, 2.95, oz - 2.35);

  // Shovel + specimen crates
  b.cyl(p.wood, 0.035, 0.035, 1.25, ox - 1.8, 0.65, oz + 0.4, 7, 0.12, -0.2);
  b.box(p.rock, 0.28, 0.34, 0.04, ox - 1.92, 0.22, oz + 0.44, 0.2);
  b.box(p.wood, 0.95, 0.68, 0.72, ox + 3.6, 0.34, oz - 2.6, 0.25);

  // Coastal village houses & palms
  house(b, p, ox - 10.5, 0, oz - 13.0, 4.4, 2.9, 3.6, 0.32, 1.4, 1, 1);
  house(b, p, ox + 7.5, 0, oz - 13.5, 4.8, 3.0, 3.8, -0.28, 1.4, 4, 0);
  addPalm(b, p, ox - 6.5, 0, oz - 11.5, 6.8, 1.6, 0.4, R);
  addPalm(b, p, ox + 12.0, 0, oz - 11.0, 7.2, 1.8, 2.2, R);
  addPalm(b, p, ox + 2.5, 0, oz - 15.2, 6.4, 1.2, 1.5, R);
  for (let i = 0; i < 8; i++) addVeg(b, p, ox - 9 + i * 2.6, 0, oz - 9.2 - (i % 2) * 1.8, 0.95, R);

  // Bay B (x = ox + 14, z = oz): Field Sorting Table for Shot 8 ("other Balingasay teeth finds")
  const fx = ox + 14;
  b.box(p.wood, 3.6, 0.14, 1.65, fx, 0.96, oz);
  b.box(p.velvetNavy, 3.2, 0.06, 1.35, fx, 1.04, oz);
  for (const lx of [-1.5, 1.5]) for (const lz of [-0.65, 0.65]) b.box(p.darkWood, 0.14, 0.95, 0.14, fx + lx, 0.48, oz + lz);
  // Table awning & specimen props
  b.cyl(p.darkWood, 0.07, 0.07, 2.9, fx - 2.3, 1.45, oz - 1.5, 7);
  b.cyl(p.darkWood, 0.07, 0.07, 2.9, fx + 2.3, 1.45, oz - 1.5, 7);
  b.box(p.canvasAwning, 5.2, 0.1, 2.9, fx, 2.85, oz - 0.5);
  b.box(p.wood, 0.88, 0.6, 0.65, fx - 2.7, 0.3, oz - 0.6, 0.3);
  house(b, p, fx + 7.5, 0, oz - 13.0, 4.5, 3.1, 3.8, -0.3, 1.4, 2, 3);
  addPalm(b, p, fx - 5.2, 0, oz - 10.5, 7.0, 1.5, 2.5, R);

  b.flush(parent);

  // Dynamic dig skull (Shot 2)
  const digSkull = buildHeroSkull(0.88);
  digSkull.group.position.set(ox, 0.42, oz - 0.45);
  digSkull.group.rotation.set(-0.22, 0.16, 0);
  parent.add(digSkull.group);

  // Dynamic 5 specimen teeth (Shot 8)
  const finds = buildSpecimenFinds();
  const findsGrp = new THREE.Group();
  findsGrp.position.set(fx, 0, oz);
  for (const t of finds) findsGrp.add(t);
  parent.add(findsGrp);

  return { digSkull, finds };
};

const buildPier = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  const [ox, , oz] = Z_PIER;
  const R = rng(4303);

  // Turquoise sea + pier pilings & wooden boardwalk
  const seaMesh = new THREE.Mesh(new THREE.PlaneGeometry(150, 95), p.seaMat);
  seaMesh.rotation.x = -Math.PI / 2;
  seaMesh.position.set(ox, -0.1, oz - 18);
  seaMesh.layers.set(NOINK);
  parent.add(seaMesh);

  b.box(p.sand, 140, 0.45, 34, ox, 0.02, oz + 22);
  // Main timber pier extending over water
  b.box(p.wood, 6.2, 0.22, 16.0, ox, 0.56, oz + 1.5);
  for (let pz = -5; pz <= 7; pz += 3) for (const px of [-2.7, 2.7]) {
    b.cyl(p.darkWood, 0.18, 0.2, 1.8, ox + px, -0.1, oz + pz, 8);
  }
  // Display bench on pier for hero fish
  b.box(p.wood, 3.4, 0.14, 1.45, ox, 1.15, oz);
  for (const lx of [-1.4, 1.4]) for (const lz of [-0.55, 0.55]) b.box(p.darkWood, 0.14, 0.58, 0.14, ox + lx, 0.86, oz + lz);
  // Woven rattan baskets & barrels beside bench
  b.cyl(p.rope, 0.36, 0.28, 0.52, ox - 2.1, 0.92, oz + 0.35, 10);
  b.cyl(p.rope, 0.32, 0.25, 0.45, ox + 2.2, 0.88, oz - 0.5, 10);

  // Moored bancas + coastal houses & palms behind pier
  addBanca(b, p, ox - 6.8, 0.05, oz - 7.5, 0.35, p.bancaBlue);
  addBanca(b, p, ox + 7.2, 0.05, oz - 9.0, -0.4, p.bancaRed);
  b.box(p.sand, 60, 0.35, 16, ox - 14, 0.06, oz - 24);
  house(b, p, ox - 9.0, 0.2, oz - 22.0, 4.4, 2.8, 3.4, 0.25, 1.4, 5, 2);
  house(b, p, ox + 8.5, 0.2, oz - 23.0, 4.6, 2.9, 3.5, -0.3, 1.4, 0, 0);
  addPalm(b, p, ox - 5.2, 0.2, oz - 21.0, 6.8, 1.7, 0.7, R);
  addPalm(b, p, ox + 4.8, 0.2, oz - 21.5, 7.2, 1.6, 2.1, R);

  b.flush(parent);

  const heroFish = buildHeroFish();
  heroFish.group.position.set(ox, 1.78, oz);
  heroFish.group.scale.setScalar(1.18);
  parent.add(heroFish.group);
  return heroFish;
};

const buildWorkshop = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  const [ox, , oz] = Z_WORKSHOP;
  const R = rng(4404);

  // Stone-cobbled workshop plaza + coastal houses + lush greenery
  b.box(p.cobble, 46, 0.25, 34, ox + 7, -0.125, oz);
  b.box(p.grass, 140, 0.4, 80, ox + 7, -0.25, oz - 44);
  b.sph(p.hillGreen, 28, ox - 16, -4, oz - 62, 2.1, 0.65, 1.2, 12);
  b.sph(p.hillGreen, 26, ox + 28, -4, oz - 60, 2.0, 0.65, 1.2, 12);

  // Bay A (ox, oz): Craftsman's Knife Workbench (Shot 5)
  b.box(p.wood, 3.9, 0.16, 1.75, ox, 0.96, oz);
  for (const lx of [-1.65, 1.65]) for (const lz of [-0.68, 0.68]) b.box(p.darkWood, 0.16, 0.96, 0.16, ox + lx, 0.48, oz + lz);
  b.box(p.darkWood, 1.1, 0.12, 0.75, ox - 0.4, 1.1, oz); // chopping block
  b.cyl(p.stone, 0.28, 0.28, 0.14, ox - 1.5, 1.11, oz + 0.35, 12); // whetstone
  addPot(b, p, ox - 2.6, 0, oz - 1.8, 1.1);
  house(b, p, ox - 5.2, 0, oz - 9.2, 4.8, 3.4, 4.0, 0.22, 1.4, 2, 1);
  addPalm(b, p, ox - 1.8, 0, oz - 10.5, 6.8, 1.5, 0.4, R);

  // Bay B (ox + 14, oz): Goldsmith's Tooth Inlay Bench (Shot 6)
  const gx = ox + 14;
  b.box(p.wood, 3.6, 0.16, 1.65, gx, 0.96, oz);
  b.box(p.velvet, 1.4, 0.05, 1.05, gx, 1.06, oz);
  for (const lx of [-1.5, 1.5]) for (const lz of [-0.65, 0.65]) b.box(p.darkWood, 0.15, 0.96, 0.15, gx + lx, 0.48, oz + lz);
  // Gold tray + lamp
  b.cyl(p.brass, 0.22, 0.18, 0.06, gx + 1.15, 1.07, oz + 0.22, 12);
  b.cyl(p.brass, 0.14, 0.18, 0.24, gx - 1.15, 1.16, oz - 0.25, 10);
  house(b, p, gx + 5.5, 0, oz - 9.5, 4.8, 3.4, 4.0, -0.25, 1.4, 3, 0);
  addPalm(b, p, gx + 1.6, 0, oz - 10.8, 7.2, 1.4, 2.3, R);
  for (let i = 0; i < 7; i++) addVeg(b, p, ox - 4 + i * 3.6, 0, oz - 6.8 - (i % 2) * 1.4, 1.0, R, true);

  b.flush(parent);

  const heroKnife = buildHeroKnife();
  heroKnife.group.position.set(ox + 0.15, 1.56, oz);
  heroKnife.group.rotation.set(0.32, 0.12, -0.05);
  parent.add(heroKnife.group);

  const heroTooth = buildHeroTooth();
  heroTooth.group.position.set(gx, 1.66, oz);
  heroTooth.group.scale.setScalar(0.84);
  parent.add(heroTooth.group);

  return { heroKnife, heroTooth };
};

const buildTreasure = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  const [ox, , oz] = Z_TREASURE;
  const R = rng(4505);

  // Ancient Pangasinan stone burial shrine courtyard
  b.box(p.stone, 30, 0.24, 24, ox, -0.12, oz);
  b.box(p.grass, 120, 0.4, 80, ox, -0.25, oz - 42);
  // Ruin arch wall behind
  b.box(p.ruinStone, 8.6, 3.6, 0.85, ox, 1.8, oz - 6.5);
  b.box(p.ruinStone, 1.4, 4.3, 1.05, ox - 3.6, 2.15, oz - 6.5);
  b.box(p.ruinStone, 1.4, 4.3, 1.05, ox + 3.6, 2.15, oz - 6.5);

  // Main Burial Gold Altar Plinth (center)
  b.box(p.ruinStone, 2.0, 0.26, 1.6, ox, 0.13, oz);
  b.box(p.ruinStone, 1.55, 0.82, 1.25, ox, 0.67, oz);
  b.box(p.velvet, 1.45, 0.1, 1.15, ox, 1.12, oz);

  // Contrast Bolinao Skull pedestal (left) for Shot 7b ("Pero dito, nasa ngipin mismo ang palamuti")
  b.box(p.ruinStone, 1.25, 0.96, 1.25, ox - 2.35, 0.48, oz - 0.4);
  b.box(p.velvetNavy, 1.05, 0.08, 1.05, ox - 2.35, 0.99, oz - 0.4);

  // Earthenware tapayan pots & palms
  addPot(b, p, ox + 1.85, 0, oz - 1.1, 1.35);
  addPot(b, p, ox - 3.6, 0, oz - 1.6, 1.25);
  addPalm(b, p, ox - 4.8, 0, oz - 9.2, 6.9, 1.5, 0.6, R);
  addPalm(b, p, ox + 4.9, 0, oz - 9.6, 7.2, 1.6, 2.1, R);
  for (let i = 0; i < 6; i++) addVeg(b, p, ox - 6.5 + i * 2.6, 0, oz - 5.2 - (i % 2) * 1.4, 1.0, R, true);

  b.flush(parent);

  const heroJewels = buildJewels();
  heroJewels.position.set(ox, 1.24, oz);
  heroJewels.scale.setScalar(1.22);
  parent.add(heroJewels);

  const compareSkull = buildHeroSkull(0.84);
  compareSkull.group.position.set(ox - 2.35, 1.46, oz - 0.4);
  compareSkull.group.rotation.y = 0.25;
  parent.add(compareSkull.group);

  return { heroJewels, compareSkull };
};

export type BuiltBolinao = {
  heroSkull: HeroSkull;
  digSkull: HeroSkull;
  finds: THREE.Group[];
  heroFish: HeroFish;
  heroKnife: HeroKnife;
  heroTooth: HeroTooth;
  heroJewels: THREE.Group;
  compareSkull: HeroSkull;
};

export const buildAllDistricts = (parent: THREE.Object3D): BuiltBolinao => {
  const p = makePal();
  makeForeground(parent, p);
  const heroSkull = buildMuseum(parent, p);
  const { digSkull, finds } = buildDig(parent, p);
  const heroFish = buildPier(parent, p);
  const { heroKnife, heroTooth } = buildWorkshop(parent, p);
  const { heroJewels, compareSkull } = buildTreasure(parent, p);
  return { heroSkull, digSkull, finds, heroFish, heroKnife, heroTooth, heroJewels, compareSkull };
};
