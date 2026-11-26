// Builds all 5 cartoon-3D Davao districts & hero wildlife models (eagles, eggs, chicks, nursery saplings, rainforest).
// Static surfaces go through Batch (merged by material and two-tone shaded); dynamic hero props are returned for animation.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twoTone } from "../../shared/shade";
import { NOINK } from "../../shared/ink";
import {
  rng, ctex, facadeHD, roofHD, stoneHD, cobbleHD, grassHD, beamHD,
} from "../lapaz/paint";
import {
  Z_CENTER, Z_NEST1992, Z_NURSERY, Z_NEST2013, Z_FOREST, FOREGROUND, type V3,
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

const makePal = () => {
  const plaster = [
    facadeHD("dv_pl0", 5, 4, { wall: "#f2e2c6", shutter: "#3f6e4e" }),
    facadeHD("dv_pl1", 5, 4, { wall: "#e6d2b4", shutter: "#7c4c34" }),
    facadeHD("dv_pl2", 5, 4, { wall: "#dce8d6", shutter: "#3a7054" }),
  ].map((tex, i) => lam([0xf2e2c6, 0xe6d2b4, 0xdce8d6][i], tex));
  const roof = ["#8a5436", "#3d6e4a", "#b65a38"].map((hex, i) =>
    lam([0x8a5436, 0x3d6e4a, 0xb65a38][i], roofHD(hex)),
  );
  const trim = lam(0xfbf2de);
  const wood = lam(0xc49460, beamHD());
  const darkWood = lam(0x744c2e, beamHD());
  const trunk = lam(0x63452f);
  const stone = lam(0xb8ab98, stoneHD("dv_stone"));
  const cobble = lam(0xb6ac9b, cobbleHD());
  const grass = lam(0x6ea946, grassHD());
  const forestFloor = lam(0x477d38, grassHD());
  const moss = lam(0x528d3e);
  const soil = lam(0x69452d);
  const clay = lam(0xb55d3b);
  const brass = twoTone(matStd({ color: 0xd9a83e, roughness: 0.35, metalness: 0.72 }));
  const nestTwig = lam(0x7e5a38);
  const leaf = [0x3b8939, 0x4ca144, 0x62b44e, 0x2f7130].map((c) => lam(c));
  const hillGreen = lam(0x528c42, grassHD());
  const farRidge = lam(0x3f7443);
  const canvasAwning = lam(0xf2e8cf);
  return {
    plaster, roof, trim, wood, darkWood, trunk, stone, cobble, grass, forestFloor,
    moss, soil, clay, brass, nestTwig, leaf, hillGreen, farRidge, canvasAwning,
  };
};
type Pal = ReturnType<typeof makePal>;

const pavilion = (b: Batch, p: Pal, x: number, y: number, z: number, w: number, h: number, d: number, ry: number, pi: number, ri: number) => {
  const pm = p.plaster[pi % p.plaster.length], rm = p.roof[ri % p.roof.length];
  const win = matStd({ color: 0x3a4f5e, roughness: 0.32, emissive: 0xffdf94, emissiveIntensity: 0.16 });
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const pt = (lx: number, ly: number, lz: number): V3 => [x + lx * cos + lz * sin, y + ly, z - lx * sin + lz * cos];
  b.box(pm, w, h, d, ...pt(0, h / 2, 0), ry);
  b.box(p.stone, w + 0.2, 0.32, d + 0.2, ...pt(0, 0.16, 0), ry);
  const s = new THREE.Shape().moveTo(-w / 2 - 0.35, 0).lineTo(0, 1.5).lineTo(w / 2 + 0.35, 0).closePath();
  const rg = new THREE.ExtrudeGeometry(s, { depth: d + 0.7, bevelEnabled: false }).translate(0, h, -(d + 0.7) / 2);
  b.add(rg, rm, (g) => g.rotateY(ry).translate(x, y, z));
  const cols = Math.max(1, Math.round(w / 2.0));
  for (let i = 0; i < cols; i++) {
    const wx = -w * 0.32 + ((i + 0.5) / cols) * w * 0.64;
    b.box(win, 0.62, 0.78, 0.08, ...pt(wx, h * 0.62, d / 2 + 0.03), ry);
    b.box(p.trim, 0.72, 0.1, 0.12, ...pt(wx, h * 0.62 - 0.42, d / 2 + 0.04), ry);
  }
  b.box(p.darkWood, 0.85, 1.45, 0.08, ...pt(0, 0.72, d / 2 + 0.03), ry);
};

const addForestTree = (b: Batch, p: Pal, x: number, y: number, z: number, h: number, rScale: number, R: () => number) => {
  b.cyl(p.trunk, 0.28 * rScale, 0.44 * rScale, h, x, y + h / 2, z, 8);
  const lm0 = p.leaf[Math.floor(R() * p.leaf.length)];
  const lm1 = p.leaf[(Math.floor(R() * p.leaf.length) + 1) % p.leaf.length];
  b.sph(lm0, 1.65 * rScale, x, y + h + 0.45 * rScale, z, 1.25, 0.82, 1.2, 8);
  b.sph(lm1, 1.25 * rScale, x - 0.85 * rScale, y + h + 0.05 * rScale, z + 0.4 * rScale, 1.15, 0.78, 1.1, 7);
  b.sph(lm1, 1.20 * rScale, x + 0.82 * rScale, y + h + 0.1 * rScale, z - 0.35 * rScale, 1.15, 0.78, 1.1, 7);
};

const addFern = (b: Batch, p: Pal, x: number, y: number, z: number, s: number, R: () => number) => {
  const lm = p.leaf[Math.floor(R() * p.leaf.length)];
  b.sph(lm, 0.48 * s, x, y + 0.32 * s, z, 1.25, 0.75, 1.2, 7);
  b.sph(lm, 0.36 * s, x + 0.3 * s, y + 0.24 * s, z + 0.2 * s, 1.15, 0.7, 1.1, 7);
};

const addPot = (b: Batch, p: Pal, x: number, y: number, z: number, s = 1) => {
  b.cyl(p.clay, 0.25 * s, 0.17 * s, 0.42 * s, x, y + 0.21 * s, z, 10);
  b.cyl(p.clay, 0.28 * s, 0.25 * s, 0.09 * s, x, y + 0.42 * s, z, 10);
  b.sph(p.leaf[0], 0.28 * s, x, y + 0.56 * s, z, 1.18, 0.85, 1.18, 7);
};

// Icon-only sanctuary poster (zero 3D text labels!)
const makeSanctuaryBoard = (bgHex: string, motif: "egg" | "eagle") => {
  const tex = ctex(`dv_poster:${motif}`, 512, 384, (ctx) => {
    const w = 512, h = 384;
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#5c3f26";
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    if (motif === "egg") {
      ctx.fillStyle = "#528d3e";
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 88, 128, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f7eedb";
      ctx.strokeStyle = "#241726";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 4, 68, 92, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cbb593";
      for (const [sx, sy, r] of [[-22, -26, 7], [20, 12, 9], [-12, 34, 6], [26, -34, 5]]) {
        ctx.beginPath(); ctx.arc(w / 2 + sx, h / 2 + sy, r, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = "#62b44e";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 + 12, 118, 0, Math.PI * 2);
      ctx.fill();
      // Stylized eagle crest & wing silhouette
      ctx.fillStyle = "#5c3e2a";
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 24, 64, 72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4ebd4";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 44, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8b33c";
      ctx.beginPath();
      ctx.moveTo(w / 2 + 28, h / 2 - 48);
      ctx.lineTo(w / 2 + 64, h / 2 - 34);
      ctx.lineTo(w / 2 + 28, h / 2 - 22);
      ctx.closePath();
      ctx.fill();
    }
  });
  return matStd({ map: tex, roughness: 0.7 });
};

// ---------------- Hero Eagle Egg & Hatching Chick ----------------
export type HeroEgg = {
  group: THREE.Group;
  eggRoot: THREE.Group;
  topShell: THREE.Group;
  botShell: THREE.Mesh;
  chick: THREE.Group;
  chickWings: [THREE.Mesh, THREE.Mesh];
};

const buildHeroEgg = (scale = 1, withChick = true): HeroEgg => {
  const shellMat = twoTone(matStd({ color: 0xf7efe0, roughness: 0.48 }));
  const speckMat = twoTone(matStd({ color: 0xcab08a, roughness: 0.72 }));
  const nestMat = lam(0x7c5836);
  const mossMat = lam(0x569142);

  const downMat = twoTone(matStd({ color: 0xf9f3e4, roughness: 0.85 }));
  const crestMat = twoTone(matStd({ color: 0xebd09a, roughness: 0.75 }));
  const beakMat = twoTone(matStd({ color: 0x4f5c6b, roughness: 0.4 }));
  const eyeMat = matStd({ color: 0x1a151c, roughness: 0.25 });

  const group = new THREE.Group();
  group.scale.setScalar(scale);

  // Woven nest bowl
  const nest = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.14, 10, 22), nestMat);
  nest.rotation.x = Math.PI / 2;
  nest.position.y = 0.08;
  nest.castShadow = true;
  group.add(nest);
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.36, 0.14, 16), mossMat);
  cushion.position.y = 0.04;
  group.add(cushion);

  const eggRoot = new THREE.Group();
  eggRoot.position.y = 0.36;
  group.add(eggRoot);

  // Bottom half of egg
  const botGeo = new THREE.SphereGeometry(0.28, 22, 16, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52);
  const botShell = new THREE.Mesh(botGeo, shellMat);
  botShell.scale.set(1, 1.32, 1);
  botShell.castShadow = true;
  eggRoot.add(botShell);

  // Top half of egg (pivots open during hatch!)
  const topShell = new THREE.Group();
  const topGeo = new THREE.SphereGeometry(0.28, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const topMesh = new THREE.Mesh(topGeo, shellMat);
  topMesh.scale.set(1, 1.32, 1);
  topMesh.castShadow = true;
  topShell.add(topMesh);
  for (const [sx, sy, sz] of [[-0.14, 0.18, 0.18], [0.15, 0.12, 0.19], [0.02, 0.28, 0.15]] as V3[]) {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), speckMat);
    sp.position.set(sx, sy, sz);
    topShell.add(sp);
  }
  eggRoot.add(topShell);

  // Fluffy Philippine Eagle chick tucked inside
  const chick = new THREE.Group();
  chick.visible = withChick;
  if (withChick) {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), downMat);
    body.scale.set(1, 1.05, 0.92);
    body.position.set(0, 0.05, 0);
    chick.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), downMat);
    head.position.set(0, 0.27, 0.04);
    chick.add(head);

    // Cute spiky crest feathers on chick head
    for (let i = -2; i <= 2; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.15, 6), crestMat);
      f.position.set(i * 0.038, 0.44 - Math.abs(i) * 0.015, 0.01 - Math.abs(i) * 0.015);
      f.rotation.z = -i * 0.22;
      f.rotation.x = -0.25;
      chick.add(f);
    }

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.12, 6), beakMat);
    beak.rotation.x = Math.PI * 0.56;
    beak.position.set(0, 0.25, 0.21);
    chick.add(beak);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), eyeMat);
      eye.position.set(side * 0.075, 0.29, 0.175);
      chick.add(eye);
    }

    const wL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), downMat);
    wL.scale.set(0.45, 1.15, 0.8);
    wL.position.set(-0.22, 0.09, 0.02);
    const wR = wL.clone();
    wR.position.x = 0.22;
    chick.add(wL, wR);
    eggRoot.add(chick);
    return { group, eggRoot, topShell, botShell, chick, chickWings: [wL, wR] };
  }

  const dummyW = new THREE.Mesh();
  return { group, eggRoot, topShell, botShell, chick, chickWings: [dummyW, dummyW] };
};

// ---------------- Hero Adult Philippine Eagle ----------------
export type HeroEagle = {
  group: THREE.Group;
  head: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
};

const buildAdultEagle = (scale = 1, flying = false): HeroEagle => {
  const featherDark = twoTone(matStd({ color: 0x5c3e2a, roughness: 0.72 }));
  const featherMid = twoTone(matStd({ color: 0x7d583c, roughness: 0.72 }));
  const breastCream = twoTone(matStd({ color: 0xf5eedb, roughness: 0.78 }));
  const crestLight = twoTone(matStd({ color: 0xf1ddb3, roughness: 0.74 }));
  const beakBlue = twoTone(matStd({ color: 0x506278, roughness: 0.35 }));
  const talonGold = twoTone(matStd({ color: 0xe2b245, roughness: 0.52 }));
  const eyeBlue = matStd({ color: 0x3b6e8c, roughness: 0.25 });
  const pupil = matStd({ color: 0x15151a, roughness: 0.2 });

  const group = new THREE.Group();
  group.scale.setScalar(scale);

  // Body + creamy chest
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 16), featherDark);
  body.scale.set(0.88, 1.32, 0.92);
  body.position.set(0, 0.72, 0);
  body.castShadow = true;
  group.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 14), breastCream);
  chest.scale.set(0.84, 1.18, 0.62);
  chest.position.set(0, 0.68, 0.18);
  group.add(chest);

  // Tail fan
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 0.09), featherDark);
  tail.position.set(0, 0.18, -0.28);
  tail.rotation.x = flying ? 1.25 : 0.35;
  group.add(tail);

  // Articulated Wings (sleek tapered feather shells when perched, broad soaring wings in flight)
  const leftWing = new THREE.Group();
  leftWing.position.set(-0.34, 0.88, -0.04);
  if (flying) {
    const wLMesh = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 0.56), featherMid);
    wLMesh.position.set(-0.68, 0.04, 0);
    wLMesh.castShadow = true;
    leftWing.add(wLMesh);
    const tipL = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 4), featherDark);
    tipL.rotation.z = Math.PI / 2;
    tipL.scale.set(0.35, 1, 0.8);
    tipL.position.set(-1.55, 0.06, -0.05);
    leftWing.add(tipL);
  } else {
    const wLMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), featherMid);
    wLMesh.scale.set(0.42, 1.48, 0.72);
    wLMesh.position.set(-0.04, -0.24, -0.02);
    wLMesh.rotation.z = -0.1;
    wLMesh.castShadow = true;
    leftWing.add(wLMesh);
  }
  group.add(leftWing);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.34, 0.88, -0.04);
  if (flying) {
    const wRMesh = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 0.56), featherMid);
    wRMesh.position.set(0.68, 0.04, 0);
    wRMesh.castShadow = true;
    rightWing.add(wRMesh);
    const tipR = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 4), featherDark);
    tipR.rotation.z = -Math.PI / 2;
    tipR.scale.set(0.35, 1, 0.8);
    tipR.position.set(1.55, 0.06, -0.05);
    rightWing.add(tipR);
  } else {
    const wRMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), featherMid);
    wRMesh.scale.set(0.42, 1.48, 0.72);
    wRMesh.position.set(0.04, -0.24, -0.02);
    wRMesh.rotation.z = 0.1;
    wRMesh.castShadow = true;
    rightWing.add(wRMesh);
  }
  group.add(rightWing);

  // Articulated Head + Iconic Philippine Eagle Shaggy Crest!
  const head = new THREE.Group();
  head.position.set(0, 1.32, 0.1);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), crestLight);
  skull.scale.set(0.95, 1.0, 1.08);
  skull.castShadow = true;
  head.add(skull);

  // Fan of 7 shaggy crest feathers sweeping back & up
  for (let i = -3; i <= 3; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.28, 6), i % 2 === 0 ? featherMid : crestLight);
    f.position.set(i * 0.055, 0.19 - Math.abs(i) * 0.022, -0.09 - Math.abs(i) * 0.02);
    f.rotation.x = -0.68;
    f.rotation.z = -i * 0.18;
    head.add(f);
  }

  // Deep hooked Philippine Eagle beak
  const upperBeak = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 7), beakBlue);
  upperBeak.rotation.x = Math.PI * 0.52;
  upperBeak.scale.set(0.7, 1, 1.15);
  upperBeak.position.set(0, -0.01, 0.27);
  const hookTip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 6), beakBlue);
  hookTip.rotation.x = Math.PI * 0.92;
  hookTip.position.set(0, -0.055, 0.37);
  head.add(upperBeak, hookTip);

  for (const side of [-1, 1]) {
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), eyeBlue);
    iris.position.set(side * 0.145, 0.04, 0.16);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), pupil);
    pup.position.set(side * 0.162, 0.04, 0.19);
    head.add(iris, pup);
  }
  group.add(head);

  // Legs & talons when perched
  if (!flying) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.32, 8), talonGold);
      leg.position.set(side * 0.14, 0.16, 0.06);
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.16), talonGold);
      claw.position.set(side * 0.14, 0.02, 0.10);
      group.add(leg, claw);
    }
  } else {
    group.rotation.x = 1.28;
  }

  return { group, head, leftWing, rightWing };
};

// ---------------- Nursery ("Punlaan") Two-Generation Sapling Analogy ----------------
export type HeroNursery = {
  seed1: THREE.Mesh;
  tree1: THREE.Group;
  dropSeed: THREE.Mesh;
  tree2: THREE.Group;
};

const buildHeroNursery = (p: Pal): HeroNursery => {
  const [ox, , oz] = Z_NURSERY;
  const seedMat = twoTone(matStd({ color: 0x9b5a24, roughness: 0.45 }));
  const leafA = p.leaf[1];
  const leafB = p.leaf[2];

  const seed1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), seedMat);
  seed1.scale.set(0.85, 1.25, 0.85);
  seed1.position.set(ox - 0.85, 1.32, oz);

  const makeSapling = (h: number, r: number) => {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * r, 0.10 * r, h, 8), p.trunk);
    stem.position.y = h / 2;
    stem.castShadow = true;
    g.add(stem);
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.56 * r, 14, 10), leafA);
    c1.position.set(0, h + 0.18 * r, 0);
    c1.scale.set(1.15, 0.85, 1.15);
    c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.42 * r, 12, 9), leafB);
    c2.position.set(0.28 * r, h + 0.36 * r, 0.14 * r);
    const c3 = c2.clone();
    c3.position.set(-0.26 * r, h + 0.3 * r, -0.1 * r);
    g.add(c1, c2, c3);
    return g;
  };

  const tree1 = makeSapling(1.45, 1.15);
  tree1.position.set(ox - 0.85, 1.28, oz);

  const dropSeed = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), seedMat);
  dropSeed.scale.set(0.85, 1.25, 0.85);
  dropSeed.position.set(ox - 0.4, 2.55, oz);

  const tree2 = makeSapling(1.15, 0.88);
  tree2.position.set(ox + 0.85, 1.28, oz);

  return { seed1, tree1, dropSeed, tree2 };
};

// ---------------- Foreground framing props ----------------
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
const buildCenter = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  const [ox, , oz] = Z_CENTER;
  const R = rng(6101);

  // Sanctuary stone courtyard + lush Davao forest lawn + Mount Apo ridge behind
  b.box(p.cobble, 34, 0.24, 34, ox, -0.12, oz);
  b.box(p.grass, 140, 0.4, 90, ox, -0.25, oz - 50);
  b.sph(p.hillGreen, 28, ox - 26, -4, oz - 68, 2.2, 0.75, 1.3, 12);
  b.sph(p.farRidge, 30, ox + 22, -3, oz - 74, 2.1, 0.9, 1.3, 12);

  // Central sanctuary pedestal for the hero egg
  b.box(p.stone, 1.9, 0.24, 1.9, ox, 0.12, oz);
  b.box(p.darkWood, 1.35, 0.84, 1.35, ox, 0.66, oz);
  b.box(p.brass, 1.42, 0.06, 1.42, ox, 1.11, oz);
  b.box(p.moss, 1.18, 0.08, 1.18, ox, 1.18, oz);

  // Timber eco-sanctuary archways & pavilions behind
  for (const px of [-5.8, -3.2, 3.2, 5.8]) {
    b.box(p.stone, 0.85, 0.42, 0.85, ox + px, 0.21, oz - 5.2);
    b.cyl(p.darkWood, 0.26, 0.3, 4.3, ox + px, 2.55, oz - 5.2, 10);
  }
  b.box(p.wood, 13.4, 0.45, 1.1, ox, 4.9, oz - 5.2);

  pavilion(b, p, ox - 8.8, 0, oz - 12.0, 5.2, 3.6, 4.2, 0.28, 0, 1);
  pavilion(b, p, ox + 8.8, 0, oz - 12.0, 5.2, 3.6, 4.2, -0.28, 2, 0);

  // Educational icon easels (no text labels!)
  const leftBoard = makeSanctuaryBoard("#f4e8cd", "egg");
  const rightBoard = makeSanctuaryBoard("#e6f0e4", "eagle");
  for (const [ex, ez, ry, mat] of [
    [-4.1, -2.5, 0.36, leftBoard],
    [4.1, -2.5, -0.36, rightBoard],
  ] as [number, number, number, THREE.Material][]) {
    b.box(p.darkWood, 0.12, 1.75, 0.12, ox + ex - 0.55, 0.88, oz + ez - 0.15);
    b.box(p.darkWood, 0.12, 1.75, 0.12, ox + ex + 0.55, 0.88, oz + ez - 0.15);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.18, 0.08), mat);
    board.position.set(ox + ex, 1.65, oz + ez);
    board.rotation.y = ry;
    board.castShadow = true;
    parent.add(board);
  }

  addPot(b, p, ox - 2.3, 0, oz - 2.4, 1.1);
  addPot(b, p, ox + 2.3, 0, oz - 2.4, 1.1);
  for (let i = 0; i < 6; i++) addForestTree(b, p, ox - 10 + i * 4.0, 0, oz - 10.5 - (i % 2) * 3.5, 4.6 + (i % 3) * 0.9, 1.1, R);
  for (let i = 0; i < 7; i++) addFern(b, p, ox - 6.5 + i * 2.2, 0, oz - 7.5 - (i % 2) * 1.2, 1.15, R);

  b.flush(parent);

  const hookEgg = buildHeroEgg(1.05, false);
  hookEgg.group.position.set(ox, 1.22, oz);
  parent.add(hookEgg.group);

  const centerSoarEagle = buildAdultEagle(0.95, true);
  centerSoarEagle.group.position.set(ox + 2.2, 6.2, oz - 16);
  parent.add(centerSoarEagle.group);

  return { hookEgg, centerSoarEagle };
};

const buildNest1992 = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  const [ox, , oz] = Z_NEST1992;
  const R = rng(6202);

  b.box(p.grass, 120, 0.4, 90, ox, -0.2, oz - 10);
  b.box(p.wood, 10, 0.22, 8, ox, 0.0, oz - 0.5);

  // 1992 Hatchery Lab table & brooding canopy
  b.box(p.wood, 3.6, 0.16, 1.8, ox, 0.98, oz);
  for (const lx of [-1.5, 1.5]) for (const lz of [-0.7, 0.7]) b.box(p.darkWood, 0.16, 0.98, 0.16, ox + lx, 0.49, oz + lz);
  b.box(p.moss, 1.4, 0.08, 1.2, ox, 1.10, oz);
  // Brooding lamp arch & lab supplies
  b.cyl(p.brass, 0.05, 0.05, 1.35, ox - 1.2, 1.65, oz - 0.4, 8);
  b.cone(p.brass, 0.24, 0.26, ox - 0.9, 2.28, oz - 0.35, 10);
  b.box(p.wood, 0.55, 0.12, 0.42, ox + 1.25, 1.12, oz + 0.15, 0.2);

  // Open timber hatchery shelter behind
  for (const ax of [-3.6, 3.6]) {
    b.cyl(p.darkWood, 0.09, 0.09, 3.1, ox + ax, 1.55, oz - 3.6, 8);
    b.cyl(p.darkWood, 0.09, 0.09, 2.8, ox + ax, 1.4, oz - 0.8, 8);
  }
  b.box(p.canvasAwning, 7.8, 0.12, 3.5, ox, 2.95, oz - 2.2);

  pavilion(b, p, ox - 8.5, 0, oz - 12.5, 4.8, 3.2, 3.8, 0.3, 1, 2);
  pavilion(b, p, ox + 8.5, 0, oz - 12.5, 4.8, 3.2, 3.8, -0.3, 0, 1);
  for (let i = 0; i < 6; i++) addForestTree(b, p, ox - 9 + i * 3.6, 0, oz - 9.5 - (i % 2) * 2.5, 4.4, 1.0, R);
  for (let i = 0; i < 7; i++) addFern(b, p, ox - 6 + i * 2.0, 0, oz - 6.5 - (i % 2), 1.0, R);

  b.flush(parent);

  const egg1992 = buildHeroEgg(1.02, true);
  egg1992.group.position.set(ox, 1.14, oz);
  parent.add(egg1992.group);

  return { egg1992 };
};

const buildNursery = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  const [ox, , oz] = Z_NURSERY;
  const R = rng(6303);

  b.box(p.grass, 130, 0.4, 90, ox, -0.2, oz - 10);
  b.box(p.cobble, 14, 0.2, 10, ox, -0.02, oz);

  // Nursery potting bench
  b.box(p.wood, 4.6, 0.16, 1.85, ox, 0.94, oz);
  for (const lx of [-2.0, 2.0]) for (const lz of [-0.72, 0.72]) b.box(p.darkWood, 0.16, 0.94, 0.16, ox + lx, 0.47, oz + lz);

  // Two large planter pots for Generation 1 & Generation 2!
  for (const px of [-0.85, 0.85]) {
    b.cyl(p.clay, 0.45, 0.32, 0.42, ox + px, 1.18, oz, 12);
    b.cyl(p.soil, 0.41, 0.41, 0.06, ox + px, 1.38, oz, 12);
  }

  // Timber nursery trellis pergola behind
  for (const tx of [-3.4, 0, 3.4]) b.cyl(p.darkWood, 0.1, 0.1, 3.3, ox + tx, 1.65, oz - 2.6, 8);
  b.box(p.wood, 7.6, 0.14, 0.32, ox, 3.25, oz - 2.6);
  for (let i = 0; i < 5; i++) addPot(b, p, ox - 3.2 + i * 1.6, 0, oz - 3.2, 1.05);
  for (let i = 0; i < 6; i++) addForestTree(b, p, ox - 8.5 + i * 3.4, 0, oz - 9.2 - (i % 2) * 2.2, 4.5, 1.05, R);

  b.flush(parent);

  const nursery = buildHeroNursery(p);
  parent.add(nursery.seed1, nursery.tree1, nursery.dropSeed, nursery.tree2);
  return nursery;
};

const buildNest2013 = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  const [ox, , oz] = Z_NEST2013;
  const R = rng(6404);

  b.box(p.forestFloor, 130, 0.4, 90, ox, -0.2, oz - 10);

  // Elevated mossy breeding aviary platform & sturdy nest branches
  b.cyl(p.trunk, 0.42, 0.52, 1.15, ox, 0.57, oz, 10);
  b.box(p.darkWood, 3.8, 0.2, 2.2, ox, 1.18, oz);
  // Flanking eagle perches for Pag-asa & Kalinawan
  b.cyl(p.trunk, 0.12, 0.14, 1.6, ox - 1.35, 1.28, oz - 0.15, 8, 0, 0, 0);
  b.cyl(p.trunk, 0.12, 0.14, 1.6, ox + 1.35, 1.28, oz - 0.15, 8, 0, 0, 0);
  b.cyl(p.trunk, 0.1, 0.12, 1.2, ox - 1.35, 1.42, oz - 0.15, 8, 0, Math.PI / 2, 0);
  b.cyl(p.trunk, 0.1, 0.12, 1.2, ox + 1.35, 1.42, oz - 0.15, 8, 0, Math.PI / 2, 0);

  // Wooden observation blind / aviary mesh posts in background
  for (const bx of [-4.5, 4.5]) b.cyl(p.darkWood, 0.11, 0.12, 4.2, ox + bx, 2.1, oz - 4.2, 8);
  b.box(p.wood, 9.6, 0.9, 0.25, ox, 0.45, oz - 3.6);
  for (let i = 0; i < 7; i++) addForestTree(b, p, ox - 10 + i * 3.3, 0, oz - 8.5 - (i % 2) * 3.0, 5.2 + (i % 2) * 1.1, 1.15, R);
  for (let i = 0; i < 8; i++) addFern(b, p, ox - 7 + i * 2.0, 0, oz - 5.2 - (i % 2), 1.2, R);

  b.flush(parent);

  const egg2013 = buildHeroEgg(1.04, true);
  egg2013.group.position.set(ox, 1.28, oz);
  parent.add(egg2013.group);

  const pagasa = buildAdultEagle(1.02, false);
  pagasa.group.position.set(ox - 1.35, 1.48, oz - 0.15);
  pagasa.group.rotation.y = 0.28;
  parent.add(pagasa.group);

  const kalinawan = buildAdultEagle(0.98, false);
  kalinawan.group.position.set(ox + 1.35, 1.48, oz - 0.15);
  kalinawan.group.rotation.y = -0.28;
  parent.add(kalinawan.group);

  return { egg2013, pagasa, kalinawan };
};

const buildForest = (parent: THREE.Object3D, p: Pal) => {
  const b = new Batch();
  const [ox, , oz] = Z_FOREST;
  const R = rng(6505);

  // Sweeping Mindanao rainforest terrain + layered mountain ridges
  b.box(p.forestFloor, 180, 0.5, 140, ox, -0.25, oz - 30);
  b.sph(p.hillGreen, 34, ox - 32, -5, oz - 64, 2.0, 0.9, 1.4, 12);
  b.sph(p.hillGreen, 36, ox + 30, -4, oz - 68, 2.0, 0.95, 1.4, 12);
  b.sph(p.farRidge, 44, ox, -3, oz - 92, 2.4, 1.25, 1.4, 12);

  // Outer sanctuary wooden fence at near edge ("sa labas ng sentro")
  for (let fx = -6; fx <= 6; fx += 2.4) {
    b.cyl(p.darkWood, 0.08, 0.09, 1.35, ox + fx, 0.68, oz + 7.5, 7);
  }
  b.box(p.wood, 13.5, 0.12, 0.12, ox, 1.15, oz + 7.5);
  b.box(p.wood, 13.5, 0.12, 0.12, ox, 0.65, oz + 7.5);

  // Dense multi-layered rainforest dipterocarp canopy
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 7; col++) {
      const tx = ox - 18 + col * 6.0 + (row % 2) * 2.8 + (R() - 0.5) * 1.4;
      const tz = oz - 5 - row * 7.5 + (R() - 0.5) * 2.0;
      const h = 4.2 + row * 0.7 + R() * 1.8;
      addForestTree(b, p, tx, 0, tz, h, 1.15 + R() * 0.35, R);
    }
  }
  for (let i = 0; i < 10; i++) addFern(b, p, ox - 9 + i * 2.0, 0, oz + 4.5 - (i % 3) * 1.4, 1.25, R);

  b.flush(parent);

  const soarA = buildAdultEagle(1.08, true);
  soarA.group.position.set(ox - 2.2, 7.5, oz - 8);
  parent.add(soarA.group);

  const soarB = buildAdultEagle(0.95, true);
  soarB.group.position.set(ox + 3.4, 8.6, oz - 14);
  parent.add(soarB.group);

  return { soarA, soarB };
};

export type BuiltDavao = {
  hookEgg: HeroEgg;
  centerSoarEagle: HeroEagle;
  egg1992: HeroEgg;
  nursery: HeroNursery;
  egg2013: HeroEgg;
  pagasa: HeroEagle;
  kalinawan: HeroEagle;
  soarA: HeroEagle;
  soarB: HeroEagle;
};

export const buildAllDistricts = (parent: THREE.Object3D): BuiltDavao => {
  const p = makePal();
  makeForeground(parent, p);
  const { hookEgg, centerSoarEagle } = buildCenter(parent, p);
  const { egg1992 } = buildNest1992(parent, p);
  const nursery = buildNursery(parent, p);
  const { egg2013, pagasa, kalinawan } = buildNest2013(parent, p);
  const { soarA, soarB } = buildForest(parent, p);
  return { hookEgg, centerSoarEagle, egg1992, nursery, egg2013, pagasa, kalinawan, soarA, soarB };
};
