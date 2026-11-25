// 3D world builder for "Ang Bulkang Nagpalamig sa Buong Mundo" (Mount Pinatubo, 1991):
// 1. Zambales valley town + Mount Pinatubo volcanic cone & animated eruption plume
// 2. Stratosphere cross-section (rainclouds below vs dry SO2 haze above)
// 3. Spinning painted Earth globe + expanding aerosol shell + thermometer
// 4. Parked car + unfolding silver sunshade + bouncing golden sunbeams
// 5. NASA/USGS observatory + climate graph board + giant Earth-umbrella finale
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng, ctex, facadeHD, roofHD, stoneHD, cobbleHD, grassHD, earthHD } from "./paint";
import { twoTone } from "../../shared/shade";
import { Pen, fxClimateBoard, fxThermo } from "./toon";
import { NOINK } from "../../shared/ink";
import { Z_ZAMBALES, Z_STRAT, Z_GLOBE, Z_CAR, Z_LAB, V3 } from "./story";

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

export const addBench = (b: Batch, x: number, y: number, z: number, yaw = 0) => {
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  const wood = lam("benchWood", () => ({ color: "#b57845" }));
  const iron = lam("lampIron", () => ({ color: "#3d424d" }));
  b.add(boxGeo(V(-1.1, 0.44, -0.28), V(1.1, 0.52, 0.28)), wood, m);
  b.add(boxGeo(V(-1.1, 0.56, -0.28), V(1.1, 0.94, -0.2)), wood, m);
  for (const sx of [-0.9, 0.9]) b.add(boxGeo(V(sx - 0.06, 0, -0.26), V(sx + 0.06, 0.45, 0.26)), iron, m);
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

export type BuiltWorld = {
  craterGlow: THREE.Mesh;
  plumeGroup: THREE.Group;
  plumeClouds: THREE.Mesh[];
  stratCloudDeck: THREE.Group;
  stratHazeBand: THREE.Group;
  earthGlobe: THREE.Mesh;
  earthHazeShell: THREE.Group;
  sunshadePivot: THREE.Group;
  sunbeamsIn: THREE.Group;
  sunbeamsOut: THREE.Group;
  thermoLow: THREE.Mesh;
  thermoHigh: THREE.Mesh;
  umbrellaCanopy: THREE.Group;
  radarDish: THREE.Group;
};

export const buildWorld = (root: THREE.Object3D, rays: Ray[]): BuiltWorld => {
  sight = rays;
  const b = new Batch();
  const M_grass = lam("grassHD", () => ({ map: grassHD() }));
  const M_cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
  const M_pave = lam("pave", () => ({ color: "#d8cdb8" }));
  const M_asphalt = lam("asphalt", () => ({ color: "#636875" }));
  const M_white = lam("labWhite", () => ({ color: "#f3ece0" }));
  const M_blue = lam("labBlue", () => ({ color: "#2d6fc4" }));
  const M_glass = lam("carGlass", () => ({ color: "#72aad9" }));
  const M_steel = lam("steel", () => ({ color: "#78808e" }));

  // Global grass horizon + gentle Zambales foothills
  b.add(quadUp(-800, 800, -800, 800, 400, 400, -0.02), M_grass);
  const hill = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const hm = [lam("hillA", () => ({ color: "#6ea850" })), lam("hillB", () => ({ color: "#5f9847" })), lam("hillC", () => ({ color: "#80b65c" }))];
  [[-160, -90, 95, 28, 70], [150, -85, 110, 32, 75], [-380, 220, 170, 48, 120], [380, 240, 190, 50, 130],
   [80, -490, 250, 60, 150], [-220, -480, 220, 52, 130]].forEach(([x, z, sx, sy, sz], i) =>
    b.add(hill, hm[i % 3], new THREE.Matrix4().compose(V(x, -2, z), new THREE.Quaternion(), V(sx, sy, sz))));

  // ================= 1) Z_ZAMBALES: Zambales Valley Town + Mount Pinatubo (0, 0, 0) =================
  b.add(quadUp(-90, 90, -18, 28, 22, 11, 0.01), M_cobble);
  b.add(boxGeo(V(-90, 0, -23), V(90, 0.14, -18), 2), M_pave);
  b.add(boxGeo(V(-90, 0, 18), V(90, 0.14, 24), 2), M_pave);

  // Town houses flanking valley street (leaving center sightline to Pinatubo clear!)
  for (const x of [-28, -19, -11, 11, 19, 28]) {
    house(b, x, -26, 0, 7.6, 6.8, 6.4 + (Math.abs(x) % 2) * 1.2, Math.abs(x));
    house(b, x, 26, Math.PI, 7.6, 6.8, 6.2 + (Math.abs(x) % 3) * 1.1, Math.abs(x) + 2);
  }
  addJeepney(b, -7.2, 0, -6.5, 1.48, "#d94b3d", "#f2c438");
  addJeepney(b, 8.5, 0, 4.2, -1.52, "#2f74c0", "#f4d24a");
  addBench(b, -4.5, 0, 7.5, 0.25);
  for (const x of [-14, -6.8, 6.8, 14]) addPalm(b, x, 0, -17.5, 7.8 + (Math.abs(x) % 2), x);
  for (let i = 0; i < 14; i++) {
    const tx = -44 + i * 6.8;
    if (Math.abs(tx) < 26) continue; // keep foothills clear of Pinatubo base cone
    addVeg(b, "round", tx, 0, -34 - (i % 3) * 4, 7.5 + (i % 3), i + 11, 1);
  }

  // Sculpted Mount Pinatubo volcano cone at (0, 0, -95) with layered ridges
  const vx = 0, vz = -95;
  const M_volcBase = lam("volcBase", () => ({ color: "#558c44" }));
  const M_volcMid = lam("volcMid", () => ({ color: "#688948" }));
  const M_volcTop = lam("volcTop", () => ({ color: "#8c7b6a" }));
  b.add(new THREE.CylinderGeometry(30, 62, 16, 28).translate(0, 8, 0), M_volcBase, new THREE.Matrix4().makeTranslation(vx, -0.5, vz));
  b.add(new THREE.CylinderGeometry(18, 31, 14, 24).translate(0, 22, 0), M_volcMid, new THREE.Matrix4().makeTranslation(vx, 0, vz));
  b.add(new THREE.CylinderGeometry(9.5, 18.5, 11, 22).translate(0, 34, 0), M_volcTop, new THREE.Matrix4().makeTranslation(vx, 0, vz));
  // Shoulder ridges for silhouette variety
  b.add(new THREE.ConeGeometry(24, 26, 16).translate(0, 13, 0), M_volcBase, new THREE.Matrix4().makeTranslation(vx - 26, -0.5, vz + 6));
  b.add(new THREE.ConeGeometry(22, 24, 16).translate(0, 12, 0), M_volcBase, new THREE.Matrix4().makeTranslation(vx + 28, -0.5, vz + 8));
  // Crater rim ring
  b.add(new THREE.TorusGeometry(9.2, 1.4, 10, 24).rotateX(Math.PI / 2), M_volcTop, new THREE.Matrix4().makeTranslation(vx, 39.2, vz));

  // Emissive lava/crater glow inside crater (blooms in eruption!)
  const craterGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(6.8, 5.2, 1.6, 20),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.85, 0.2) }),
  );
  craterGlow.position.set(vx, 38.4, vz);
  craterGlow.layers.set(NOINK);
  root.add(craterGlow);

  // Dynamic Eruption Plume & Cloud Deck (Shot 3-4)
  const plumeGroup = new THREE.Group();
  plumeGroup.position.set(vx, 38.5, vz);
  const plumeClouds: THREE.Mesh[] = [];
  const M_plume = lam("ashPlume", () => ({ color: "#9c949a" }));
  const M_plumeHot = lam("ashHot", () => ({ color: "#c99672" }));
  const M_gasHaze = new THREE.MeshLambertMaterial({ color: "#f2c672", transparent: true, opacity: 0.72 });
  for (let i = 0; i < 12; i++) {
    const rad = i < 4 ? 5.2 + i * 1.1 : i < 9 ? 7.5 + (i - 4) * 2.1 : 16 + (i - 9) * 3.5;
    const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 12), i < 2 ? M_plumeHot : i > 8 ? M_gasHaze : M_plume);
    const angle = i * 1.9;
    const spread = i > 8 ? 8.5 : 2.2;
    m.position.set(Math.cos(angle) * spread, i * 3.1, Math.sin(angle) * spread);
    m.scale.set(1.15, i > 8 ? 0.55 : 0.9, 1.15);
    if (i > 8) m.layers.set(NOINK);
    plumeGroup.add(m);
    plumeClouds.push(m);
  }
  root.add(plumeGroup);

  // Troposphere cloud deck ring around y = 55 in Zambales (so eruption punches visually PAST the clouds!)
  const cloudRingM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.05, 1.05, 1.1), transparent: true, opacity: 0.86 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.25 && Math.cos(a) > 0) continue;
    const cm = new THREE.Mesh(new THREE.SphereGeometry(9.5, 12, 8), cloudRingM);
    cm.position.set(vx + Math.cos(a) * 36, 54 + (i % 2) * 2, vz + Math.sin(a) * 24);
    cm.scale.set(1.8, 0.52, 1.1);
    cm.layers.set(NOINK);
    root.add(cm);
  }

  // ================= 2) Z_STRAT: Atmospheric Cross-Section (240, 0, 0) =================
  const sx = Z_STRAT[0];
  b.add(quadUp(sx - 60, sx + 60, -40, 40, 20, 20, 0.01), M_grass);
  // Miniature valley town below storm clouds (y = 0..4)
  [-10, -3.5, 3.5, 10].forEach((mx, i) => {
    house(b, sx + mx, -4, 0, 4.2, 3.8, 3.4, i + 1, 0, false);
  });
  // Raincloud deck at y = 7.6 (raindrops below, clear golden stratosphere above!)
  const stratCloudDeck = new THREE.Group();
  const M_stormCloud = lam("stormCloud", () => ({ color: "#96aac4" }));
  for (let i = 0; i < 9; i++) {
    const cm = new THREE.Mesh(new THREE.SphereGeometry(2.5 + (i % 3) * 0.5, 14, 10), M_stormCloud);
    cm.position.set(sx - 12 + i * 3.0, 7.4 + (i % 2) * 0.5, (i % 3 - 1) * 1.1);
    cm.scale.set(1.3, 0.62, 0.9);
    stratCloudDeck.add(cm);
  }
  root.add(stratCloudDeck);

  // Floating reflective SO2 sulfate-aerosol haze puffs high above the clouds (y = 14.2)
  const stratHazeBand = new THREE.Group();
  const M_stratHaze = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.18, 1.06, 0.72), transparent: true, opacity: 0.76 });
  for (let i = 0; i < 9; i++) {
    const hm2 = new THREE.Mesh(new THREE.SphereGeometry(2.1 + (i % 3) * 0.45, 14, 10), M_stratHaze);
    hm2.position.set(sx - 12 + i * 3.0, 14.3 + (i % 2) * 0.45, (i % 3 - 1) * 0.8);
    hm2.scale.set(1.5, 0.45, 0.8);
    hm2.layers.set(NOINK);
    stratHazeBand.add(hm2);
  }
  root.add(stratHazeBand);

  // ================= 3) Z_GLOBE: Spinning Painted Earth Globe + Aerosol Veil (240, 0, -240) =================
  const gx = Z_GLOBE[0], gz = Z_GLOBE[2];
  b.add(quadUp(gx - 70, gx + 70, gz - 70, gz + 70, 20, 20, 0.01), lam("plazaStone", () => ({ color: "#cfd8e6" })));
  b.add(new THREE.CylinderGeometry(5.5, 6.2, 1.2, 24).translate(0, 0.6, 0), M_white, new THREE.Matrix4().makeTranslation(gx, 0, gz));

  const earthGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(7.2, 36, 24),
    lam("earthMap", () => ({ map: earthHD() })),
  );
  earthGlobe.position.set(gx, 11.2, gz);
  earthGlobe.castShadow = true;
  root.add(earthGlobe);

  // Translucent global sulfate haze veil + swirling aerosol rings around Earth
  const earthHazeShell = new THREE.Group();
  earthHazeShell.position.set(gx, 11.2, gz);
  const M_earthHaze = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.15, 0.88), transparent: true, opacity: 0.24 });
  const outerVeil = new THREE.Mesh(new THREE.SphereGeometry(7.65, 32, 20), M_earthHaze);
  outerVeil.layers.set(NOINK);
  earthHazeShell.add(outerVeil);
  const M_ringHaze = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.22, 1.12, 0.78), transparent: true, opacity: 0.65 });
  for (const [ry, rx, rz] of [[0, 0.14, 0.08], [0.8, -0.22, 0.12], [1.6, 0.18, -0.15]] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.72, 0.42, 10, 36), M_ringHaze);
    ring.rotation.set(Math.PI / 2 + rx, ry, rz);
    ring.layers.set(NOINK);
    earthHazeShell.add(ring);
  }
  root.add(earthHazeShell);

  // Thermometer board beside Earth globe (Shot 8, NOINK unlit)
  const thermoHigh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 5.4),
    new THREE.MeshBasicMaterial({ map: ctex("thermoHi", 256, 400, (g) => fxThermo(new Pen(g), 0.15)), transparent: true }),
  );
  thermoHigh.position.set(gx + 9.2, 11.2, gz + 1.5);
  thermoHigh.layers.set(NOINK);
  root.add(thermoHigh);

  const thermoLow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 5.4),
    new THREE.MeshBasicMaterial({ map: ctex("thermoLo", 256, 400, (g) => fxThermo(new Pen(g), 0.88)), transparent: true }),
  );
  thermoLow.position.set(gx + 9.2, 11.2, gz + 1.5);
  thermoLow.layers.set(NOINK);
  root.add(thermoLow);

  // ================= 4) Z_CAR: Parked Car + Shiny Windshield Sunshade Analogy (-240, 0, 0) =================
  const cx = Z_CAR[0];
  b.add(quadUp(cx - 60, cx + 60, -25, 25, 20, 12, 0.01), M_asphalt);
  b.add(boxGeo(V(cx - 60, 0, -14), V(cx + 60, 0.15, -7), 2), M_pave);
  house(b, cx - 10, -18, 0, 8, 7, 6.8, 0);
  house(b, cx + 10, -18, 0, 8, 7, 7.2, 3);
  addPalm(b, cx - 4.5, 0, -8.0, 7.8, 0.5);
  addPalm(b, cx + 5.2, 0, -8.0, 8.0, 1.9);

  // Stylized cartoon parked car at (cx, 0, 0) facing +z/+x 3/4
  const M_carRed = lam("carRed", () => ({ color: "#d6453a" }));
  const M_tire = lam("tire", () => ({ color: "#2d3038" }));
  const M_silver = lam("sunshadeSilver", () => ({ color: "#edf3fc" }));
  const cm = new THREE.Matrix4().makeRotationY(0.35).setPosition(cx, 0, 0);
  b.add(boxGeo(V(-1.15, 0.42, -2.2), V(1.15, 1.18, 2.2)), M_carRed, cm);
  b.add(boxGeo(V(-0.98, 1.18, -1.2), V(0.98, 1.95, 0.85)), M_glass, cm);
  b.add(boxGeo(V(-1.02, 1.88, -1.24), V(1.02, 2.02, 0.88)), M_carRed, cm);
  const wg = new THREE.CylinderGeometry(0.4, 0.4, 0.28, 16); wg.rotateZ(Math.PI / 2);
  for (const wx of [-1.1, 1.1]) for (const wz of [-1.35, 1.35]) {
    b.add(wg, M_tire, cm.clone().multiply(new THREE.Matrix4().makeTranslation(wx, 0.4, wz)));
  }

  // Animated folding shiny silver sunshade over front windshield
  const sunshadePivot = new THREE.Group();
  sunshadePivot.position.set(cx, 1.56, 0.88);
  sunshadePivot.rotation.set(-0.35, 0.35, 0);
  const shadeMesh = new THREE.Mesh(boxGeo(V(-0.92, -0.38, 0), V(0.92, 0.38, 0.08)), M_silver);
  sunshadePivot.add(shadeMesh);
  root.add(sunshadePivot);

  // Sunbeams meeting cleanly at the windshield sunshade and bouncing back up!
  const sunbeamsIn = new THREE.Group();
  const sunbeamsOut = new THREE.Group();
  const M_beam = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.45, 1.25, 0.35) });
  for (let i = 0; i < 3; i++) {
    const bx = cx - 0.55 + i * 0.55;
    const beamDown = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.2, 8), M_beam);
    beamDown.position.set(bx - 0.42, 3.05, 0.95);
    beamDown.rotation.z = -0.38;
    beamDown.layers.set(NOINK);
    sunbeamsIn.add(beamDown);

    const beamBounce = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8), M_beam);
    beamBounce.position.set(bx + 0.42, 3.05, 1.05);
    beamBounce.rotation.z = 0.48;
    beamBounce.layers.set(NOINK);
    sunbeamsOut.add(beamBounce);
  }
  root.add(sunbeamsIn, sunbeamsOut);

  // ================= 5) Z_LAB: NASA & USGS Observatory + Pinatubo Earth-Umbrella Finale (0, 0, -240) =================
  const lx = Z_LAB[0], lz = Z_LAB[2];
  b.add(quadUp(lx - 70, lx + 70, lz - 65, lz + 65, 24, 24, 0.01), M_pave);
  // White observatory hall + front windows + dome on left
  b.add(boxGeo(V(lx - 14, 0, lz - 18), V(lx - 2, 7.5, lz - 8)), M_white);
  b.add(boxGeo(V(lx - 14.3, 6.2, lz - 18.3), V(lx - 1.7, 7.4, lz - 7.7)), M_blue);
  b.add(boxGeo(V(lx - 12.2, 2.2, lz - 8.05), V(lx - 4.0, 4.6, lz - 7.85)), M_glass);
  b.add(boxGeo(V(lx - 9.2, 0.05, lz - 8.05), V(lx - 7.0, 2.1, lz - 7.85)), M_blue);
  b.add(new THREE.SphereGeometry(4.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M_white, new THREE.Matrix4().makeTranslation(lx - 8, 7.4, lz - 13));
  // Rotating radar dish on right
  b.add(new THREE.CylinderGeometry(0.45, 0.7, 5.2, 10).translate(0, 2.6, 0), M_steel, new THREE.Matrix4().makeTranslation(lx + 9.5, 0, lz - 11));
  const radarDish = new THREE.Group();
  radarDish.position.set(lx + 9.5, 5.4, lz - 11);
  const dishM = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 0.4, 0.9, 18), M_white);
  dishM.rotation.x = Math.PI / 3;
  radarDish.add(dishM);
  root.add(radarDish);

  // Climate model graph chalkboard (NOINK unlit) placed right beside the scientists
  const boardMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 2.5),
    new THREE.MeshBasicMaterial({ map: ctex("climateBoard", 512, 340, (g) => fxClimateBoard(new Pen(g))) }),
  );
  boardMesh.position.set(lx + 4.4, 2.35, lz - 8.5);
  boardMesh.layers.set(NOINK);
  root.add(boardMesh);
  b.add(boxGeo(V(lx + 2.8, 0, lz - 8.7), V(lx + 3.05, 1.3, lz - 8.5)), M_steel);
  b.add(boxGeo(V(lx + 5.75, 0, lz - 8.7), V(lx + 6.0, 1.3, lz - 8.5)), M_steel);

  // Centerpiece Finale Diorama: Miniature Pinatubo + Earth Globe + Giant Reflective Umbrella Canopy!
  b.add(new THREE.CylinderGeometry(5.8, 6.4, 0.7, 24).translate(0, 0.35, 0), M_white, new THREE.Matrix4().makeTranslation(lx, 0, lz - 21));
  const miniGlobe = new THREE.Mesh(new THREE.SphereGeometry(2.8, 24, 18), lam("earthMap", () => ({ map: earthHD() })));
  miniGlobe.position.set(lx + 1.4, 3.8, lz - 21);
  miniGlobe.rotation.y = 3.8;
  root.add(miniGlobe);
  // Mini Pinatubo right beside the Earth globe on the pedestal
  b.add(new THREE.ConeGeometry(2.4, 3.6, 18).translate(0, 2.4, 0), M_volcBase, new THREE.Matrix4().makeTranslation(lx - 2.6, 0, lz - 21));

  const umbrellaCanopy = new THREE.Group();
  umbrellaCanopy.position.set(lx + 1.4, 8.2, lz - 21);
  const umbDome = new THREE.Mesh(
    new THREE.SphereGeometry(4.6, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    lam("umbCanopy", () => ({ color: "#e8f2fc", side: THREE.DoubleSide })),
  );
  const umbTip = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 12), lam("umbGold", () => ({ color: "#e6b845" })));
  umbTip.position.set(0, 4.85, 0);
  const umbHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 7.6, 8), M_steel);
  umbHandle.position.set(0, -3.7, -2.5);
  umbrellaCanopy.add(umbDome, umbTip, umbHandle);
  root.add(umbrellaCanopy);

  for (const px of [-14, 14]) addPalm(b, lx + px, 0, lz - 4, 7.2, px);

  b.build(root);
  sight = [];

  return {
    craterGlow,
    plumeGroup,
    plumeClouds,
    stratCloudDeck,
    stratHazeBand,
    earthGlobe,
    earthHazeShell,
    sunshadePivot,
    sunbeamsIn,
    sunbeamsOut,
    thermoLow,
    thermoHigh,
    umbrellaCanopy,
    radarDish,
  };
};
