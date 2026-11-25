// 3D world builder for "Ang Disyertong Gawa ng Ilog at Hangin" (La Paz Sand Dunes, Ilocos Norte):
// 1. Z_DUNES: Rolling La Paz coastal sand dunes meeting the West Philippine Sea & Laoag palms
// 2. Z_STORM: Rainy coastal street with storm cloud deck right beside dry sand dunes
// 3. Z_CONVEYOR: Cordillera mountains -> Padsan River carrying sand -> Ocean waves -> Wind-sculpted dunes
// 4. Z_COAST_TOWN: Green Ilocos farmlands & outrigger bancas on the coast
// 5. Z_FAN: Porch table diorama with spinning electric fan, pouring sand & growing mini-dune mound
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng, ctex, facadeHD, roofHD, stoneHD, cobbleHD, grassHD, sandHD, seaHD } from "./paint";
import { twoTone } from "../../shared/shade";
import { NOINK } from "../../shared/ink";
import { Z_DUNES, Z_STORM, Z_CONVEYOR, Z_COAST_TOWN, Z_FAN } from "./story";

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const mats = new Map<string, THREE.Material>();
export const lam = (key: string, make: () => THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) {
    m = twoTone(new THREE.MeshLambertMaterial(make()));
    mats.set(key, m);
  }
  return m;
};

const f32 = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.Float32BufferAttribute(out, a.itemSize);
};

export const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u1 = 1, v1 = 1, u0 = 0, v0 = 0) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2));
  return g;
};

export const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  return g;
};

export const boxGeo = (min: THREE.Vector3, max: THREE.Vector3, tile = 0, bottom = false) => {
  const [x0, y0, z0] = [min.x, min.y, min.z], [x1, y1, z1] = [max.x, max.y, max.z];
  const t = (a: number) => (tile ? a / tile : 1);
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const faces = [
    quad(V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1), t(w), t(h)),
    quad(V(x1, y0, z0), V(x0, y0, z0), V(x0, y1, z0), V(x1, y1, z0), t(w), t(h)),
    quad(V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0), t(d), t(h)),
    quad(V(x1, y0, z1), V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1), t(d), t(h)),
    quad(V(x0, y1, z1), V(x1, y1, z1), V(x1, y1, z0), V(x0, y1, z0), t(w), t(d)),
  ];
  if (bottom) faces.push(quad(V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1), t(w), t(d)));
  return mergeGeometries(faces, false);
};

export const quadUp = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
};

export class Batch {
  private g = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const x = new THREE.BufferGeometry();
    x.setAttribute("position", f32(src.attributes.position));
    if (src.attributes.normal) x.setAttribute("normal", f32(src.attributes.normal)); else x.computeVertexNormals();
    x.setAttribute("uv", src.attributes.uv ? f32(src.attributes.uv) : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat);
    if (l) l.push(x); else this.g.set(mat, [x]);
  }
  build(parent: THREE.Object3D, cast = true) {
    for (const [mat, list] of this.g) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.g.clear();
  }
}

export type Ray = { o: THREE.Vector3; d: THREE.Vector3; len: number; core: boolean };
let sight: Ray[] = [];
const inTheWay = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, coreOnly = false) => {
  for (const { o, d, len, core } of sight) {
    if (coreOnly && !core) continue;
    let t0 = 0, t1 = len;
    for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
      if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) t0 = Infinity; continue; }
      const ta = (a - oo) / dd, tb = (b - oo) / dd;
      t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (t0 <= t1) return true;
  }
  return false;
};

const LEAF = ["#5aa83c", "#4c9a37", "#69b545", "#55a243", "#3f8f3c"];
const leafTex = (i: number) => ctex("leafHD" + i, 256, 128, (g, r) => {
  const base = new THREE.Color(LEAF[i]), top = base.clone().offsetHSL(0.012, 0.03, 0.08), bot = base.clone().offsetHSL(-0.015, 0.0, -0.08);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#" + top.getHexString()); gr.addColorStop(0.42, "#" + base.getHexString()); gr.addColorStop(1, "#" + bot.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  for (let k = 0; k < 46; k++) {
    const x = r() * 256, y = 10 + r() * 108, rad = 5 + r() * 9, light = y < 64 ? r() < 0.7 : r() < 0.25;
    for (const ox of [-256, 0, 256]) {
      g.strokeStyle = light ? "rgba(225,255,170,0.22)" : "rgba(20,70,30,0.2)"; g.lineWidth = 2.5; g.lineCap = "round";
      g.beginPath(); g.arc(x + ox, y + rad * 0.6, rad, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    }
  }
});
const leafMat = (i: number) => lam("leafHD" + i, () => ({ map: leafTex(i) }));
const barkMat = () => lam("barkHD", () => ({ color: "#8f5d3b" }));
const vegGeo = new Map<string, THREE.BufferGeometry>();
const lobeGeo = (q: number) => {
  const k = "lobe" + q;
  let g = vegGeo.get(k);
  if (!g) { g = new THREE.SphereGeometry(1, [18, 12, 9][q], [12, 9, 7][q]); vegGeo.set(k, g); }
  return g;
};
const trunkGeo = () => {
  let g = vegGeo.get("trunk");
  if (!g) { g = new THREE.CylinderGeometry(0.6, 1, 1, 10, 1, true).translate(0, 0.5, 0); vegGeo.set("trunk", g); }
  return g;
};
const yawQ = (a: number) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);

export const addVeg = (b: Batch, k: "round" | "bush", x: number, y: number, z: number, h: number, seed: number, q = 0, cull = true) => {
  const rad = k === "bush" ? 0.85 * h : 0.4 * h;
  if (cull && inTheWay(x - rad, x + rad, y, y + h, z - rad, z + rad, true)) return;
  const r = rng(Math.abs(Math.floor(seed)) % 200000 + 7), U = (a: number, c: number) => a + (c - a) * r();
  const leaf = leafMat(Math.floor(r() * 4)), lobe = lobeGeo(q);
  const put = (px: number, py: number, pz: number, r2: number, sy = 0.9) =>
    b.add(lobe, leaf, new THREE.Matrix4().compose(V(x + px, y + py, z + pz), yawQ(r() * 6.28), V(r2, r2 * sy, r2)));
  if (k === "bush") {
    put(0, 0.45 * h, 0, 0.5 * h);
    for (let i = 0; i < 3; i++) { const a = (i * 6.28) / 3 + r(); put(Math.cos(a) * 0.38 * h, 0.32 * h, Math.sin(a) * 0.38 * h, 0.35 * h); }
  } else {
    b.add(trunkGeo(), barkMat(), new THREE.Matrix4().compose(V(x, y - 0.1, z), yawQ(r() * 6.28), V(0.055 * h, 0.48 * h, 0.055 * h)));
    put(0, 0.64 * h, 0, 0.26 * h);
    for (let i = 0; i < 4; i++) { const a = (i * 6.28) / 4 + U(-0.3, 0.3); put(Math.cos(a) * 0.18 * h, 0.59 * h, Math.sin(a) * 0.18 * h, 0.2 * h); }
    put(0, 0.8 * h, 0, 0.18 * h);
  }
};

export const addPalm = (b: Batch, x: number, y: number, z: number, h: number, yaw = 0, cull = true) => {
  if (cull && inTheWay(x - 1.5, x + 1.5, y, y + h, z - 1.5, z + 1.5, true)) return;
  const r = rng(Math.abs(Math.floor(x * 37 + z * 91)) + 3);
  const lean = (r() - 0.5) * 0.6;
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const y0 = y + t0 * h * 0.86, y1 = y + t1 * h * 0.86;
    const x0 = x + Math.sin(t0 * 1.4) * lean, x1 = x + Math.sin(t1 * 1.4) * lean;
    const r0 = 0.22 * (1 - t0 * 0.45), r1 = 0.22 * (1 - t1 * 0.45);
    const seg = new THREE.CylinderGeometry(r1, r0, (y1 - y0) * 1.05, 8);
    b.add(seg, barkMat(), new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, z));
  }
  const topX = x + Math.sin(1.4) * lean, topY = y + h * 0.86;
  const frondG = new THREE.BoxGeometry(0.55, 0.12, h * 0.36);
  const lm = leafMat(Math.floor(r() * 4));
  for (let i = 0; i < 7; i++) {
    const a = yaw + (i * Math.PI * 2) / 7 + (r() - 0.5) * 0.2;
    const droop = 0.25 + (i % 2) * 0.18;
    const m = new THREE.Matrix4()
      .makeTranslation(topX, topY, z)
      .multiply(new THREE.Matrix4().makeRotationY(a))
      .multiply(new THREE.Matrix4().makeRotationX(droop))
      .multiply(new THREE.Matrix4().makeTranslation(0, 0, h * 0.17));
    b.add(frondG, lm, m);
  }
  b.add(lobeGeo(1), lm, new THREE.Matrix4().compose(V(topX, topY + 0.1, z), new THREE.Quaternion(), V(0.55, 0.42, 0.55)));
};

type Style = { wall: string; shutter: string; roof: string; timber?: boolean };
const STYLES: Style[] = [
  { wall: "#ecdab2", shutter: "#3f6fb5", roof: "#d27a62" },
  { wall: "#d8a95f", shutter: "#2f6a43", roof: "#b8644f" },
  { wall: "#c47a5c", shutter: "#2f5f6a", roof: "#8f97a8" },
  { wall: "#efdcb8", shutter: "#2f5f6a", roof: "#c9775a", timber: true },
  { wall: "#ddbd78", shutter: "#5a3b2a", roof: "#d27a62" },
  { wall: "#e2c49a", shutter: "#8c3b4a", roof: "#c9775a" },
];
const roofMat = (col: string) => lam("roof" + col, () => ({ map: roofHD(col, col === "#8f97a8"), side: THREE.DoubleSide }));
const UB = new THREE.BoxGeometry(1, 1, 1);
const trimM = () => lam("trimStone", () => ({ color: "#efe3c8" }));
const plinthM = () => lam("plinthHD", () => ({ map: stoneHD("copeHD") }));
const ub = (b: Batch, mat: THREE.Material, m: THREE.Matrix4, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
  b.add(UB, mat, m.clone().multiply(new THREE.Matrix4().compose(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new THREE.Quaternion(), V(x1 - x0, y1 - y0, z1 - z0))));

export const house = (b: Batch, x: number, z: number, yaw: number, w: number, d: number, h: number, si: number, y = 0, cull = true) => {
  const across = Math.abs(Math.sin(yaw)) > 0.5, hx = (across ? d : w) / 2 + 0.6, hz = (across ? w : d) / 2 + 0.6;
  if (cull && inTheWay(x - hx, x + hx, y, y + h + d * 0.42 + 1.2, z - hz, z + hz)) return;
  const st = STYLES[Math.abs(Math.round(si)) % STYLES.length];
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  const front = lam(`hf${si}_${w}_${h}`, () => ({ map: facadeHD(`hf${si}_${w}_${h}`, w, h, { ...st, door: true }) }));
  const side = lam(`hs${si}_${h}`, () => ({ map: facadeHD(`hs${si}_${h}`, 8, h, st) }));
  const wall = lam("wall" + st.wall, () => ({ color: st.wall }));
  const hw = w / 2, hd = d / 2, rh = d * 0.42, o = 0.35;
  b.add(quad(V(-hw, 0, hd), V(hw, 0, hd), V(hw, h, hd), V(-hw, h, hd)), front, m);
  b.add(quad(V(hw, 0, -hd), V(-hw, 0, -hd), V(-hw, h, -hd), V(hw, h, -hd)), side, m);
  b.add(quad(V(-hw, 0, -hd), V(-hw, 0, hd), V(-hw, h, hd), V(-hw, h, -hd)), side, m);
  b.add(quad(V(hw, 0, hd), V(hw, 0, -hd), V(hw, h, -hd), V(hw, h, hd)), side, m);
  b.add(tri(V(-hw, h, -hd), V(-hw, h, hd), V(-hw, h + rh, 0)), wall, m);
  b.add(tri(V(hw, h, hd), V(hw, h, -hd), V(hw, h + rh, 0)), wall, m);
  const ru = (w + 2 * o) / 4, rv = Math.hypot(hd + o, rh) / 4, rm = roofMat(st.roof);
  b.add(quad(V(-hw - o, h - 0.25, hd + o), V(hw + o, h - 0.25, hd + o), V(hw + o, h + rh, 0), V(-hw - o, h + rh, 0), ru, rv), rm, m);
  b.add(quad(V(hw + o, h - 0.25, -hd - o), V(-hw - o, h - 0.25, -hd - o), V(-hw - o, h + rh, 0), V(hw + o, h + rh, 0), ru, rv), rm, m);
  b.add(boxGeo(V(-hw - 0.07, -0.05, -hd - 0.07), V(hw + 0.07, 0.45, hd + 0.07), 2), plinthM(), m);
  ub(b, trimM(), m, -hw - 0.12, hw + 0.12, h - 0.48, h - 0.22, hd, hd + 0.16);
};

export const addJeepney = (b: Batch, x: number, y: number, z: number, yaw: number, bodyCol = "#d94b3d", stripeCol = "#f2c438") => {
  if (inTheWay(x - 1.6, x + 1.6, y, y + 2.2, z - 2.6, z + 2.6, true)) return;
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  const bodyM = lam("jeep_" + bodyCol, () => ({ color: bodyCol }));
  const stripeM = lam("jeepS_" + stripeCol, () => ({ color: stripeCol }));
  const chromeM = lam("chrome", () => ({ color: "#cfd6de" }));
  const glassM = lam("glass", () => ({ color: "#6e9bd6" }));
  const tireM = lam("tire", () => ({ color: "#32353d" }));
  b.add(boxGeo(V(-0.85, 0.42, 0.8), V(0.85, 1.25, 2.1)), chromeM, m);
  b.add(boxGeo(V(-0.8, 1.25, 0.55), V(0.8, 1.95, 0.95)), glassM, m);
  b.add(boxGeo(V(-0.92, 0.42, -2.0), V(0.92, 1.32, 0.8)), bodyM, m);
  b.add(boxGeo(V(-0.94, 0.85, -2.02), V(0.94, 1.08, 0.82)), stripeM, m);
  b.add(boxGeo(V(-0.9, 1.92, -2.05), V(0.9, 2.08, 0.9)), stripeM, m);
  for (const sx of [-0.84, 0.84]) for (const sz of [-1.92, -0.7, 0.55]) {
    b.add(boxGeo(V(sx - 0.05, 1.32, sz - 0.05), V(sx + 0.05, 1.94, sz + 0.05)), chromeM, m);
  }
  const wg = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 14); wg.rotateZ(Math.PI / 2);
  for (const sx of [-0.88, 0.88]) for (const sz of [-1.35, 1.4]) {
    b.add(wg, tireM, m.clone().multiply(new THREE.Matrix4().makeTranslation(sx, 0.38, sz)));
  }
};

export const addBanca = (b: Batch, x: number, y: number, z: number, yaw = 0, hullCol = "#e35a44") => {
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  const hullM = lam("banca_" + hullCol, () => ({ color: hullCol }));
  const bambooM = lam("bamboo", () => ({ color: "#cfa15a" }));
  const stripeM = lam("bancaStripe", () => ({ color: "#f5ebd4" }));
  b.add(boxGeo(V(-0.55, 0.15, -2.2), V(0.55, 0.65, 2.2)), hullM, m);
  b.add(boxGeo(V(-0.58, 0.52, -2.1), V(0.58, 0.68, 2.1)), stripeM, m);
  b.add(new THREE.ConeGeometry(0.58, 1.2, 8).rotateX(Math.PI / 2), hullM, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.4, 2.7)));
  b.add(new THREE.ConeGeometry(0.58, 1.2, 8).rotateX(-Math.PI / 2), hullM, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.4, -2.7)));
  // Outrigger crossbars + bamboo floats
  for (const sz of [-1.1, 1.1]) b.add(boxGeo(V(-1.7, 0.42, sz - 0.06), V(1.7, 0.5, sz + 0.06)), bambooM, m);
  for (const sx of [-1.7, 1.7]) {
    b.add(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 8).rotateX(Math.PI / 2), bambooM, m.clone().multiply(new THREE.Matrix4().makeTranslation(sx, 0.25, 0)));
  }
};

export const makeForeground = (kind: "bush" | "crate" | "pot" | "cone", h: number): THREE.Object3D => {
  const b = new Batch(), grp = new THREE.Group();
  if (kind === "bush") {
    addVeg(b, "bush", 0, 0, 0, h, 42, 0, false);
  } else if (kind === "crate") {
    const wood = lam("crateWood", () => ({ color: "#b8824c" }));
    b.add(boxGeo(V(-0.45 * h, 0, -0.45 * h), V(0.45 * h, 0.85 * h, 0.45 * h)), wood);
  } else if (kind === "pot") {
    const potM = lam("terracotta", () => ({ color: "#c46b4b" }));
    b.add(new THREE.CylinderGeometry(0.42 * h, 0.3 * h, 0.55 * h, 12).translate(0, 0.275 * h, 0), potM);
    addVeg(b, "bush", 0, 0.45 * h, 0, h * 0.75, 19, 0, false);
  } else {
    const coneM = lam("coneOrg", () => ({ color: "#e36832" }));
    b.add(new THREE.CylinderGeometry(0.08 * h, 0.32 * h, h, 12).translate(0, h / 2, 0), coneM);
  }
  b.build(grp, false);
  return grp;
};

const duneRidge = (b: Batch, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0) => {
  const dome = new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  b.add(dome, mat, new THREE.Matrix4().compose(V(x, y - 0.3, z), yawQ(yaw), V(sx, sy, sz)));
};

export type BuiltWorld = {
  riverSand: THREE.Mesh[];
  waveBars: THREE.Mesh[];
  growingDunes: THREE.Mesh[];
  fanBlades: THREE.Group;
  sandStream: THREE.Mesh[];
  miniDune: THREE.Mesh;
};

export const buildWorld = (root: THREE.Object3D, rays: Ray[]): BuiltWorld => {
  sight = rays;
  const b = new Batch();
  const M_grass = lam("grassHD", () => ({ map: grassHD() }));
  const M_cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
  const M_sand = lam("sandHD", () => ({ map: sandHD() }));
  const M_sandDark = lam("sandDark", () => ({ color: "#c9a267" }));
  const M_sea = lam("seaHD", () => ({ map: seaHD() }));
  const M_pave = lam("pave", () => ({ color: "#d8cdb8" }));
  const M_wood = lam("porchWood", () => ({ color: "#b57c48" }));
  const M_steel = lam("steel", () => ({ color: "#78808e" }));
  const M_fanBlue = lam("fanBlue", () => ({ color: "#3b82d6" }));
  const M_fanBlade = lam("fanBlade", () => ({ color: "#90cdf4" }));

  // Global grass horizon + distant Cordillera foothills (far away so coastal sea horizons stay open)
  b.add(quadUp(-800, 800, -800, 800, 360, 360, -0.04), M_grass);
  const hill = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const hm = [lam("hillA", () => ({ color: "#6ea850" })), lam("hillB", () => ({ color: "#5f9847" })), lam("hillC", () => ({ color: "#80b65c" }))];
  [[-380, -340, 140, 38, 100], [380, -340, 145, 40, 105], [-420, 260, 170, 48, 120], [420, 260, 190, 50, 130],
   [80, -540, 250, 60, 150], [-220, -540, 220, 52, 130]].forEach(([x, z, sx, sy, sz], i) =>
    b.add(hill, hm[i % 3], new THREE.Matrix4().compose(V(x, -2, z), new THREE.Quaternion(), V(sx, sy, sz))));

  // ================= 1) Z_DUNES: La Paz Sand Dunes + West Philippine Sea (0, 0, 0) =================
  b.add(quadUp(-90, 90, -80, 35, 16, 12, 0.0), M_sand);
  b.add(quadUp(-240, 240, -200, -56, 16, 8, -0.02), M_sea); // West Philippine Sea stretching cleanly to horizon!
  // Sculpted sweeping sand dune hills
  duneRidge(b, M_sand, -18, 0, -16, 16, 4.8, 11, 0.3);
  duneRidge(b, M_sand, 16, 0, -22, 19, 5.8, 12, -0.25);
  duneRidge(b, M_sandDark, -2, 0, -36, 28, 7.6, 15, 0.12);
  duneRidge(b, M_sand, -34, 0, -34, 22, 6.2, 14, -0.2);
  duneRidge(b, M_sand, 32, 0, -38, 24, 6.8, 14, 0.25);
  duneRidge(b, M_sand, -26, 0, 8, 12, 3.2, 9, 0.4);
  duneRidge(b, M_sand, 24, 0, 6, 13, 3.6, 10, -0.35);
  // 4x4 tourist jeepney + coastal palms flanking the edge of the dunes
  addJeepney(b, -8.2, 0, -5.5, 0.78, "#e36832", "#f5e39e");
  for (const [px, pz] of [[-18, -3], [16, -2], [-22, -12], [21, -12]]) addPalm(b, px, 0, pz, 7.5, px);
  for (const [bx, bz] of [[5.8, -8], [-12, -14], [10, -16]]) addVeg(b, "bush", bx, 0, bz, 1.4, bx * 7 + bz, 1);

  // ================= 2) Z_STORM: Rainy Laoag Coastal Street Next to Dunes (0, 0, -240) =================
  const sx = Z_STORM[0], sz = Z_STORM[2];
  b.add(quadUp(sx - 70, sx + 70, sz - 45, sz + 35, 16, 12, 0.01), M_cobble);
  b.add(quadUp(sx - 70, sx + 70, sz - 95, sz - 24, 14, 10, 0.02), M_sand);
  duneRidge(b, M_sand, sx - 16, 0, sz - 38, 18, 6.2, 12, 0.2);
  duneRidge(b, M_sandDark, sx + 14, 0, sz - 42, 22, 7.0, 14, -0.2);
  for (const x of [-15, -7.5, 7.5, 15]) house(b, sx + x, sz - 22, 0, 6.8, 6.2, 6.0, Math.abs(x));
  addJeepney(b, sx - 6.5, 0, sz - 4.0, 1.45, "#2f74c0", "#f4d24a");
  for (const x of [-11, 11]) addPalm(b, sx + x, 0, sz - 12, 7.6, x);
  // Storm cloud deck overhead (y = 8.4)
  const M_stormCloud = lam("stormCloud", () => ({ color: "#8c9fb8" }));
  for (let i = 0; i < 8; i++) {
    b.add(new THREE.SphereGeometry(2.6 + (i % 2) * 0.5, 12, 8), M_stormCloud,
      new THREE.Matrix4().compose(V(sx - 11 + i * 3.1, 8.6 + (i % 2) * 0.4, sz - 2), new THREE.Quaternion(), V(1.35, 0.58, 0.95)));
  }

  // ================= 3) Z_CONVEYOR: Cordillera -> Padsan River -> Ocean Waves -> Wind Dunes (240, 0, 0) =================
  const cx = Z_CONVEYOR[0];
  // Left: green Cordillera valley with river cutting down toward the sea (front-right)
  b.add(quadUp(cx - 80, cx + 80, -70, 50, 16, 14, 0.0), M_sand);
  b.add(quadUp(cx - 80, cx - 2, -70, 50, 14, 14, 0.02), M_grass);
  // Cordillera mountain peaks in background left (kept back at z=-38..-42 so lenses stay clear!)
  const M_mtn = lam("cordillera", () => ({ color: "#4e8a43" }));
  b.add(new THREE.ConeGeometry(10, 14, 14).translate(0, 7, 0), M_mtn, new THREE.Matrix4().makeTranslation(cx - 21, -0.2, -36));
  b.add(new THREE.ConeGeometry(12, 16, 14).translate(0, 8, 0), M_mtn, new THREE.Matrix4().makeTranslation(cx - 9, -0.2, -40));
  // Padsan River curving from (-14, -26) down to (+6, +12) sea shore
  b.add(quadUp(cx - 17, cx - 7, -30, 16, 3, 8, 0.06), M_sea);
  // West Philippine Sea on front/right edge
  b.add(quadUp(cx - 45, cx + 65, 12, 65, 10, 6, 0.04), M_sea);
  // Animated golden sand spheres riding the Padsan River down to the sea
  const riverSand: THREE.Mesh[] = [];
  const M_grain = lam("sandGrain", () => ({ color: "#ebbf6b" }));
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), M_grain);
    m.position.set(cx - 12 + (i % 3 - 1) * 1.6, 0.35, -24 + i * 2.6);
    root.add(m);
    riverSand.push(m);
  }
  // Animated ocean wave crests pushing sand onto shore (kept on beach/sea side x >= cx)
  const waveBars: THREE.Mesh[] = [];
  const M_foam = new THREE.MeshBasicMaterial({ color: "#e8f8ff", transparent: true, opacity: 0.85 });
  const waveGeo = new THREE.CylinderGeometry(0.16, 0.16, 22, 10).rotateZ(Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(waveGeo, M_foam);
    m.scale.set(1, 0.4, 1.1);
    m.position.set(cx + 10, 0.14, 17 - i * 2.0);
    m.layers.set(NOINK);
    root.add(m);
    waveBars.push(m);
  }
  // Growing inland dunes on the right side (cx + 12..24) driven by Amihan/Habagat winds
  const growingDunes: THREE.Mesh[] = [];
  const duneMeshGeo = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  [[cx + 11, -3, 7.5, 3.2, 6.0], [cx + 18, -11, 10.5, 4.8, 7.8], [cx + 14, -20, 12.5, 5.8, 9.0]].forEach(([dx, dz, sx2, sy2, sz2]) => {
    const dm = new THREE.Mesh(duneMeshGeo, M_sand);
    dm.position.set(dx, -0.2, dz);
    dm.scale.set(sx2, sy2, sz2);
    dm.castShadow = true; dm.receiveShadow = true;
    root.add(dm);
    growingDunes.push(dm);
  });

  // ================= 4) Z_COAST_TOWN: Suwerte — Green Ilocos Farms & Fishing Bancas (480, 0, 0) =================
  const tx = Z_COAST_TOWN[0], tz = Z_COAST_TOWN[2];
  b.add(quadUp(tx - 60, tx + 60, tz - 60, tz + 40, 18, 16, 0.01), M_grass);
  b.add(quadUp(tx + 0.2, tx + 65, tz - 60, tz + 40, 10, 12, 0.03), M_sand);
  b.add(quadUp(tx + 5.2, tx + 65, tz - 60, tz + 40, 8, 10, 0.04), M_sea);
  // Irrigation canal + green paddy beds on left
  b.add(quadUp(tx - 14, tx - 9, tz - 35, tz + 15, 2, 8, 0.05), M_sea);
  house(b, tx - 8, tz - 14, 0.15, 6.8, 6.0, 5.8, 1);
  addBanca(b, tx + 3.6, 0.05, tz - 6.5, 0.25, "#e35a44");
  addBanca(b, tx + 6.4, 0.05, tz - 13.5, -0.15, "#3b82d6");
  for (const [px, pz] of [[-12, -4], [-4, -10], [4, -15]]) addPalm(b, tx + px, 0, tz + pz, 7.4, px);

  // ================= 5) Z_FAN: Analogy — Porch Table, Spinning Electric Fan & Growing Mini-Dune (-240, 0, 0) =================
  const fx = Z_FAN[0];
  b.add(quadUp(fx - 50, fx + 50, -35, 35, 16, 14, 0.01), M_cobble);
  house(b, fx - 9, -15, 0, 8, 7, 6.5, 3);
  house(b, fx + 9, -15, 0, 8, 7, 6.5, 0);
  addPalm(b, fx - 5, 0, -7, 7.8, 0.4);
  addPalm(b, fx + 5, 0, -7, 7.8, 2.1);

  // Wooden porch table at (fx, 0, 0) — compact width so fan + stream + mini-dune all fit in 9:16 frame
  b.add(boxGeo(V(fx - 2.3, 1.02, -1.1), V(fx + 2.3, 1.18, 1.1)), M_wood);
  for (const lx of [-2.0, 2.0]) for (const lz of [-0.85, 0.85]) {
    b.add(boxGeo(V(fx + lx - 0.14, 0, lz - 0.14), V(fx + lx + 0.14, 1.02, lz + 0.14)), M_wood);
  }
  // Retro blue electric fan on left side of table (fx - 1.45, 1.18, 0) blowing +X!
  b.add(new THREE.CylinderGeometry(0.38, 0.48, 0.16, 16).translate(0, 0.08, 0), M_fanBlue, new THREE.Matrix4().makeTranslation(fx - 1.45, 1.18, 0));
  b.add(new THREE.CylinderGeometry(0.1, 0.13, 0.68, 10).translate(0, 0.42, 0), M_steel, new THREE.Matrix4().makeTranslation(fx - 1.45, 1.18, 0));
  b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.44, 12).rotateZ(Math.PI / 2), M_fanBlue, new THREE.Matrix4().makeTranslation(fx - 1.58, 1.94, 0));
  b.add(new THREE.TorusGeometry(0.58, 0.045, 8, 24).rotateY(Math.PI / 2), M_steel, new THREE.Matrix4().makeTranslation(fx - 1.28, 1.94, 0));

  const fanBlades = new THREE.Group();
  fanBlades.position.set(fx - 1.28, 1.94, 0);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(boxGeo(V(-0.03, 0.06, -0.12), V(0.03, 0.5, 0.12)), M_fanBlade);
    blade.rotation.x = (i * Math.PI) / 2;
    blade.rotation.y = 0.28;
    fanBlades.add(blade);
  }
  root.add(fanBlades);

  // Hopper / scoop pouring dry sand grains at (fx - 0.2, 2.75, 0) mounted on a bracket arm!
  b.add(boxGeo(V(fx - 0.26, 1.18, -0.82), V(fx - 0.14, 2.82, -0.70)), M_steel);
  b.add(boxGeo(V(fx - 0.26, 2.74, -0.82), V(fx - 0.14, 2.86, 0.05)), M_steel);
  b.add(new THREE.ConeGeometry(0.36, 0.68, 12).rotateX(Math.PI), lam("scoop", () => ({ color: "#e36832" })),
    new THREE.Matrix4().makeTranslation(fx - 0.2, 2.78, 0));

  // Animated falling + blowing sand grain spheres
  const sandStream: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i++) {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 6), M_grain);
    sp.position.set(fx - 0.2, 2.38 - i * 0.07, 0);
    root.add(sp);
    sandStream.push(sp);
  }

  // Growing miniature sand dune mound on the right side of the table!
  const miniDune = new THREE.Mesh(duneMeshGeo, M_sand);
  miniDune.position.set(fx + 1.15, 1.16, 0);
  miniDune.scale.set(1.05, 0.85, 0.85);
  miniDune.castShadow = true; miniDune.receiveShadow = true;
  root.add(miniDune);

  b.build(root);
  sight = [];

  return {
    riverSand,
    waveBars,
    growingDunes,
    fanBlades,
    sandStream,
    miniDune,
  };
};
