// 3D world builder for "From Shoes to Malls": Manila shophouses, jeepneys, tropical palms,
// cartoon vegetation, SM supermalls, indoor atrium, Manila Bay MOA globe + Ferris wheel,
// and Banking/Hotel/Real Estate skyline, all using two-tone painted materials.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng, ctex, rep, facadeHD, roofHD, stoneHD, cobbleHD, grassHD } from "./paint";
import { twoTone } from "../../shared/shade";
import { Pen, fxShoeSign, fxSMEmblem, fxCinema, fxBankEmblem } from "./toon";
import { NOINK } from "../../shared/ink";
import { Z_MANILA, Z_QC, Z_MALL, Z_ATRIUM, Z_MOA, Z_EMPIRE, V3 } from "./story";

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

// ---------------- sight-line culling ----------------
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

// ---------------- cartoon vegetation & palms ----------------
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

/** Tropical royal palm: curved segmented trunk + arched fronds */
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

// ---------------- houses ----------------
type Style = { wall: string; shutter: string; roof: string; timber?: boolean; brick?: boolean };
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
  const st = STYLES[si % STYLES.length];
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

// ---------------- custom Philippine & Mall props ----------------
/** Classic colorful Philippine jeepney */
export const addJeepney = (b: Batch, x: number, y: number, z: number, yaw: number, bodyCol = "#d94b3d", stripeCol = "#f2c438") => {
  if (inTheWay(x - 1.6, x + 1.6, y, y + 2.2, z - 2.6, z + 2.6, true)) return;
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  const bodyM = lam("jeep_" + bodyCol, () => ({ color: bodyCol }));
  const stripeM = lam("jeepS_" + stripeCol, () => ({ color: stripeCol }));
  const chromeM = lam("chrome", () => ({ color: "#cfd6de" }));
  const glassM = lam("glass", () => ({ color: "#6e9bd6" }));
  const tireM = lam("tire", () => ({ color: "#32353d" }));
  // hood & cab
  b.add(boxGeo(V(-0.85, 0.42, 0.8), V(0.85, 1.25, 2.1)), chromeM, m);
  b.add(boxGeo(V(-0.8, 1.25, 0.55), V(0.8, 1.95, 0.95)), glassM, m);
  // passenger body
  b.add(boxGeo(V(-0.92, 0.42, -2.0), V(0.92, 1.32, 0.8)), bodyM, m);
  b.add(boxGeo(V(-0.94, 0.85, -2.02), V(0.94, 1.08, 0.82)), stripeM, m);
  // roof + posts
  b.add(boxGeo(V(-0.9, 1.92, -2.05), V(0.9, 2.08, 0.9)), stripeM, m);
  for (const sx of [-0.84, 0.84]) for (const sz of [-1.92, -0.7, 0.55]) {
    b.add(boxGeo(V(sx - 0.05, 1.32, sz - 0.05), V(sx + 0.05, 1.94, sz + 0.05)), chromeM, m);
  }
  // wheels
  const wg = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 14); wg.rotateZ(Math.PI / 2);
  for (const sx of [-0.88, 0.88]) for (const sz of [-1.35, 1.4]) {
    b.add(wg, tireM, m.clone().multiply(new THREE.Matrix4().makeTranslation(sx, 0.38, sz)));
  }
};

/** Sculpted 3D pair of classic shoes on a display pedestal (Hook & Finale Callback!) */
export const addShoePedestal = (b: Batch, x: number, y: number, z: number) => {
  const m = new THREE.Matrix4().makeTranslation(x, y, z);
  const pedM = lam("pedStone", () => ({ color: "#ede2cc" }));
  const cushM = lam("velvet", () => ({ color: "#9e2f38" }));
  const shoeM = lam("shoeRed", () => ({ color: "#cf3f35" }));
  const soleM = lam("shoeSole", () => ({ color: "#f5efe2" }));
  b.add(boxGeo(V(-0.55, 0, -0.55), V(0.55, 0.88, 0.55)), pedM, m);
  b.add(boxGeo(V(-0.62, 0.88, -0.62), V(0.62, 0.98, 0.62)), pedM, m);
  b.add(boxGeo(V(-0.46, 0.98, -0.46), V(0.46, 1.07, 0.46)), cushM, m);
  // two crisp 3D cartoon shoes angled toward camera
  for (const [sx, yaw] of [[-0.18, 0.25], [0.18, -0.18]] as const) {
    const sm = m.clone().multiply(new THREE.Matrix4().makeTranslation(sx, 1.07, 0)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    b.add(boxGeo(V(-0.11, 0, -0.24), V(0.11, 0.07, 0.24)), soleM, sm);
    b.add(boxGeo(V(-0.1, 0.07, -0.22), V(0.1, 0.2, 0.05)), shoeM, sm);
    b.add(new THREE.SphereGeometry(0.11, 12, 10), shoeM, sm.clone().multiply(new THREE.Matrix4().compose(V(0, 0.13, 0.1), new THREE.Quaternion(), V(0.95, 0.72, 1.4))));
    b.add(boxGeo(V(-0.07, 0.2, -0.02), V(0.07, 0.22, 0.14)), soleM, sm); // laces
  }
};

/** Plaza lamp post */
export const addLamp = (b: Batch, x: number, y: number, z: number, cull = true) => {
  if (cull && inTheWay(x - 0.3, x + 0.3, y, y + 3.5, z - 0.3, z + 0.3, true)) return;
  const iron = lam("lampIron", () => ({ color: "#3d424d" }));
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.1, 0.85) });
  b.add(new THREE.CylinderGeometry(0.06, 0.1, 3.2, 8).translate(0, 1.6, 0), iron, new THREE.Matrix4().makeTranslation(x, y, z));
  b.add(new THREE.SphereGeometry(0.24, 12, 10), glow, new THREE.Matrix4().makeTranslation(x, y + 3.35, z));
};

/** Park / mall bench */
export const addBench = (b: Batch, x: number, y: number, z: number, yaw = 0) => {
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  const wood = lam("benchWood", () => ({ color: "#b57845" }));
  const iron = lam("lampIron", () => ({ color: "#3d424d" }));
  b.add(boxGeo(V(-1.1, 0.44, -0.28), V(1.1, 0.52, 0.28)), wood, m);
  b.add(boxGeo(V(-1.1, 0.56, -0.28), V(1.1, 0.94, -0.2)), wood, m);
  for (const sx of [-0.9, 0.9]) b.add(boxGeo(V(sx - 0.06, 0, -0.26), V(sx + 0.06, 0.45, 0.26)), iron, m);
};

/** Foreground framing object factory (outside sight-line culling) */
export const makeForeground = (kind: "bush" | "crate" | "pot" | "cone", h: number): THREE.Object3D => {
  const b = new Batch(), grp = new THREE.Group();
  if (kind === "bush") {
    addVeg(b, "bush", 0, 0, 0, h, 42, 0, false);
  } else if (kind === "crate") {
    const wood = lam("crateWood", () => ({ color: "#b8824c" })), shoe = lam("shoeRed", () => ({ color: "#cf3f35" }));
    b.add(boxGeo(V(-0.45 * h, 0, -0.45 * h), V(0.45 * h, 0.85 * h, 0.45 * h)), wood);
    b.add(boxGeo(V(-0.3 * h, 0.85 * h, -0.22 * h), V(0.3 * h, 1.15 * h, 0.22 * h)), shoe);
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

// ---------------- district builders ----------------
export type BuiltWorld = {
  expandedGroup: THREE.Group;
  mallWings: THREE.Group;
  flywheelKiosks: THREE.Group;
  qcFloors: THREE.Group[];
  qcCranes: THREE.Group[];
  doorL: THREE.Mesh;
  doorR: THREE.Mesh;
  ribbonL: THREE.Mesh;
  ribbonR: THREE.Mesh;
  ferrisWheel: THREE.Group;
  flags: THREE.Mesh[];
};

export const buildWorld = (root: THREE.Object3D, rays: Ray[]): BuiltWorld => {
  sight = rays;
  const b = new Batch();
  const r = rng(1958);
  const M_grass = lam("grassHD", () => ({ map: grassHD() }));
  const M_cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
  const M_pave = lam("pave", () => ({ color: "#d8cdb8" }));
  const M_asphalt = lam("asphalt", () => ({ color: "#636875" }));
  const M_white = lam("mallWhite", () => ({ color: "#f3ece0" }));
  const M_blue = lam("smBlue", () => ({ color: "#1d5ec4" }));
  const M_glass = lam("mallGlass", () => ({ color: "#79b4e3" }));
  const M_gold = lam("gold", () => ({ color: "#e6b845" }));
  const M_steel = lam("steel", () => ({ color: "#78808e" }));

  // Global grass horizon plane + distant hills
  b.add(quadUp(-800, 800, -800, 800, 400, 400, -0.02), M_grass);
  const hill = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const hm = [lam("hillA", () => ({ color: "#78b257" })), lam("hillB", () => ({ color: "#6aa24e" })), lam("hillC", () => ({ color: "#8bbf63" }))];
  [[-380, 220, 170, 48, 120], [340, 260, 210, 56, 140], [440, -140, 180, 46, 130], [-450, -140, 190, 44, 140],
   [80, -490, 250, 60, 150], [-220, -480, 220, 52, 130], [180, 420, 240, 58, 140]].forEach(([x, z, sx, sy, sz], i) =>
    b.add(hill, hm[i % 3], new THREE.Matrix4().compose(V(x, -2, z), new THREE.Quaternion(), V(sx, sy, sz))));

  // ================= 1) AREA A: 1958 Carriedo Manila Street (0, 0, 0) =================
  b.add(quadUp(-100, 100, -15, 15, 25, 7.5, 0.01), M_cobble);
  b.add(boxGeo(V(-100, 0, -21), V(100, 0.14, -15), 2), M_pave);
  b.add(boxGeo(V(-100, 0, 15), V(100, 0.14, 21), 2), M_pave);
  // Shophouses flanking Carriedo Street (leaving center x=-4..4 open for ShoeMart 1958!)
  for (const zSide of [-24.5, 24.5]) {
    const yaw = zSide < 0 ? 0 : Math.PI;
    for (let x = -48; x <= 48; x += 10) {
      if (zSide < 0 && Math.abs(x) < 11) continue;
      house(b, x, zSide, yaw, 8.5, 7.5, 7.2 + (Math.abs(x) % 3) * 1.4, Math.abs(x));
    }
  }
  // 1958 Small ShoeMart Store at (0, 0, -21.5)
  const smWall = lam("sm58wall", () => ({ color: "#f2dec0" }));
  const smRed = lam("smRed", () => ({ color: "#cf3f35" }));
  const smCream = lam("smCream", () => ({ color: "#f7f0df" }));
  b.add(boxGeo(V(-3.4, 0, -26.5), V(3.4, 6.2, -19.2)), smWall);
  b.add(boxGeo(V(-3.6, 6.0, -26.7), V(3.6, 6.5, -19.0)), smCream);
  // Striped awning
  for (let i = 0; i < 6; i++) {
    b.add(boxGeo(V(-3.2 + i * 1.07, 2.75, -19.2), V(-3.2 + (i + 1) * 1.07, 3.05, -17.8)), i % 2 ? smCream : smRed);
  }
  // Glass display window + mini colorful shoes inside!
  b.add(boxGeo(V(-2.9, 0.6, -19.22), V(-0.9, 2.35, -19.1)), M_glass);
  for (let i = 0; i < 3; i++) {
    b.add(boxGeo(V(-2.5 + i * 0.6, 0.9, -19.12), V(-2.2 + i * 0.6, 1.15, -18.92)), i === 1 ? smRed : M_blue);
  }
  // Doorway
  b.add(boxGeo(V(-0.4, 0.05, -19.22), V(1.1, 2.45, -19.12)), lam("woodDoor", () => ({ color: "#7a4a2c" })));
  // Unlit crisp ShoeMart sign board above awning (NOINK)
  const smSignMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.6),
    new THREE.MeshBasicMaterial({ map: ctex("shoeSign", 512, 256, (g) => fxShoeSign(new Pen(g))) }),
  );
  smSignMesh.position.set(0, 4.15, -19.14);
  smSignMesh.layers.set(NOINK);
  root.add(smSignMesh);

  addJeepney(b, -8.5, 0, -9.5, 1.5, "#d6453a", "#f2c438");
  addJeepney(b, 11.5, 0, 5.5, -1.55, "#2f74c0", "#f4d24a");
  for (const x of [-15, -6.5, 6.5, 15, 25]) {
    addPalm(b, x, 0, -15.8, 7.5 + (Math.abs(x) % 2) * 1.5, x);
    addLamp(b, x + 2.5, 0, -15.4);
  }

  // Expanded ShoeMart (Shot 3 only, toggled by World)
  const expandedGroup = new THREE.Group();
  const eb = new Batch();
  eb.add(boxGeo(V(-9.5, 0, -26.5), V(-3.5, 6.6, -19.2)), lam("expW1", () => ({ color: "#e8c488" })));
  eb.add(boxGeo(V(3.5, 0, -26.5), V(9.5, 6.6, -19.2)), lam("expW2", () => ({ color: "#d68d68" })));
  eb.add(boxGeo(V(-9.6, 2.75, -19.2), V(-3.6, 3.05, -17.9)), M_blue);
  eb.add(boxGeo(V(3.6, 2.75, -19.2), V(9.6, 3.05, -17.9)), smRed);
  // Outdoor clothing racks & colorful bags/parasols (visible inside vertical frame)
  for (const rx of [-3.9, -2.5, 2.5, 3.9]) {
    eb.add(boxGeo(V(rx - 0.65, 0.14, -17.2), V(rx + 0.65, 0.24, -16.6)), M_steel);
    eb.add(boxGeo(V(rx - 0.6, 1.65, -16.95), V(rx + 0.6, 1.72, -16.85)), M_steel);
    for (let k = 0; k < 4; k++) {
      const shirtCol = ["#d94b3d", "#3f7ec2", "#e6b845", "#4b945c"][k];
      eb.add(boxGeo(V(rx - 0.55 + k * 0.3, 0.88, -17.02), V(rx - 0.32 + k * 0.3, 1.6, -16.78)), lam("rack_" + shirtCol, () => ({ color: shirtCol })));
    }
  }
  eb.build(expandedGroup);
  root.add(expandedGroup);

  // ================= 2) AREA B: 1980s Crisis & QC Construction (200, 0, 0) =================
  b.add(quadUp(Z_QC[0] - 80, Z_QC[0] + 100, -50, 80, 40, 30, 0.005), lam("qcDirt", () => ({ color: "#c2b08e" })));
  b.add(quadUp(Z_QC[0] - 80, Z_QC[0] + 100, -14, -4, 40, 2.5, 0.012), M_asphalt);
  // Shuttered 1980s corner shops on left
  house(b, Z_QC[0] - 5, -16, 0, 8, 7, 7, 2);
  house(b, Z_QC[0] - 14, -16, 0, 8, 7, 6.5, 4);
  addJeepney(b, Z_QC[0] + 5, 0, -8.5, 1.55, "#c98540", "#f4d24a");
  // Sparse distant houses in undeveloped QC
  house(b, Z_QC[0] + 55, 42, Math.PI, 7, 6, 5.5, 1);
  house(b, Z_QC[0] - 28, 48, 0.2, 6, 6, 5.0, 5);
  for (let i = 0; i < 18; i++) addVeg(b, "round", Z_QC[0] - 40 + i * 7, 0, 38 + (i % 3) * 10, 7 + (i % 3), i + 77, 1);

  // Rising SM North EDSA construction open steel-and-concrete skeleton (Shot 5)
  const qcFloors: THREE.Group[] = [];
  for (let fl = 0; fl < 3; fl++) {
    const fg = new THREE.Group();
    const fb = new Batch();
    const y0 = fl * 3.8;
    fb.add(boxGeo(V(Z_QC[0] + 3, y0 + 3.4, 13), V(Z_QC[0] + 29, y0 + 3.8, 26)), lam("conc", () => ({ color: "#cfc9be" })));
    for (let cx = 4; cx <= 28; cx += 6) for (let cz = 14; cz <= 25; cz += 5.5) {
      fb.add(boxGeo(V(Z_QC[0] + cx - 0.35, y0, cz - 0.35), V(Z_QC[0] + cx + 0.35, y0 + 3.6, cz + 0.35)), M_steel);
    }
    fb.build(fg);
    root.add(fg);
    qcFloors.push(fg);
  }
  const qcCranes: THREE.Group[] = [];
  for (const [cx, cz, h] of [[Z_QC[0] + 5, 14, 16], [Z_QC[0] + 24, 22, 19]] as const) {
    b.add(boxGeo(V(cx - 0.5, 0, cz - 0.5), V(cx + 0.5, h, cz + 0.5)), lam("craneYel", () => ({ color: "#e5a92e" })));
    const cg = new THREE.Group();
    cg.position.set(cx, h, cz);
    const cb = new Batch();
    cb.add(boxGeo(V(-4, 0, -0.45), V(13, 0.85, 0.45)), lam("craneRed", () => ({ color: "#d44438" })));
    cb.add(boxGeo(V(-3.8, -0.8, -0.7), V(-1.5, 0, 0.7)), M_steel);
    cb.build(cg);
    root.add(cg);
    qcCranes.push(cg);
  }

  // ================= 3) AREA C: SM North EDSA / Megamall Plaza (0, 0, -240) =================
  b.add(quadUp(-120, 120, Z_MALL[2] - 40, Z_MALL[2] + 65, 60, 26, 0.01), M_pave);
  b.add(quadUp(-120, 120, Z_MALL[2] + 28, Z_MALL[2] + 45, 60, 4, 0.015), M_asphalt);
  // Main SM Supermall landmark facade (z = -268..-252) with glass bays & cream fins
  b.add(boxGeo(V(-30, 0, Z_MALL[2] - 28), V(30, 14.5, Z_MALL[2] - 12)), M_white);
  b.add(boxGeo(V(-30.5, 10.6, Z_MALL[2] - 28.4), V(30.5, 13.0, Z_MALL[2] - 11.6)), M_blue);
  for (let fx = -26; fx <= 26; fx += 4.5) {
    if (Math.abs(fx) < 7) continue;
    b.add(boxGeo(V(fx - 0.3, 0, Z_MALL[2] - 12), V(fx + 0.3, 10.6, Z_MALL[2] - 11.2)), M_white);
    b.add(boxGeo(V(fx + 0.5, 0.8, Z_MALL[2] - 12.05), V(fx + 3.7, 9.6, Z_MALL[2] - 11.85)), M_glass);
  }
  // Glass entrance pavilion (center) with warm glowing lobby behind sliding doors
  b.add(boxGeo(V(-6.5, 0, Z_MALL[2] - 12), V(-2.2, 6.4, Z_MALL[2] - 9.8)), M_white);
  b.add(boxGeo(V(2.2, 0, Z_MALL[2] - 12), V(6.5, 6.4, Z_MALL[2] - 9.8)), M_white);
  b.add(boxGeo(V(-2.4, 3.6, Z_MALL[2] - 12), V(2.4, 6.4, Z_MALL[2] - 9.8)), M_white);
  b.add(boxGeo(V(-2.3, 0, Z_MALL[2] - 11.8), V(2.3, 3.6, Z_MALL[2] - 11.4)), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.1, 0.78) }));
  b.add(boxGeo(V(-5.6, 5.2, Z_MALL[2] - 12.2), V(5.6, 6.1, Z_MALL[2] - 9.4)), M_blue);
  // Circular unlit SM emblem centered over the grand entrance (NOINK)
  const smEmblemMesh = new THREE.Mesh(
    new THREE.CircleGeometry(2.3, 32),
    new THREE.MeshBasicMaterial({ map: ctex("smEmblem", 512, 512, (g) => fxSMEmblem(new Pen(g))) }),
  );
  smEmblemMesh.position.set(0, 9.0, Z_MALL[2] - 11.4);
  smEmblemMesh.layers.set(NOINK);
  root.add(smEmblemMesh);

  // Animated glass doors + ceremonial red ribbon (Shot 6)
  const doorMat = lam("doorGlass", () => ({ color: "#8ac6f2" }));
  const doorL = new THREE.Mesh(boxGeo(V(-2.2, 0, -0.08), V(0, 3.6, 0.08)), doorMat);
  const doorR = new THREE.Mesh(boxGeo(V(0, 0, -0.08), V(2.2, 3.6, 0.08)), doorMat);
  doorL.position.set(0, 0, Z_MALL[2] - 10.6);
  doorR.position.set(0, 0, Z_MALL[2] - 10.6);
  root.add(doorL, doorR);

  const ribMat = lam("ribbon", () => ({ color: "#e03636" }));
  const ribbonL = new THREE.Mesh(boxGeo(V(-2.5, -0.08, -0.05), V(0, 0.08, 0.05)), ribMat);
  const ribbonR = new THREE.Mesh(boxGeo(V(0, -0.08, -0.05), V(2.5, 0.08, 0.05)), ribMat);
  ribbonL.position.set(0, 1.35, Z_MALL[2] - 10.2);
  ribbonR.position.set(0, 1.35, Z_MALL[2] - 10.2);
  root.add(ribbonL, ribbonR);

  // Shoe display pedestal in plaza foreground (Shots 1 & 14)
  addShoePedestal(b, 0, 0, Z_MALL[2] + 15.8);

  // Plaza palms, lamps, benches
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
    addPalm(b, sx * 9.5, 0, Z_MALL[2] - 6 + k * 9.5, 8.2, k * 1.4);
    addLamp(b, sx * 7.2, 0, Z_MALL[2] - 4 + k * 9.5);
  }
  addBench(b, -5.2, 0, Z_MALL[2] + 8, Math.PI / 2);
  addBench(b, 5.2, 0, Z_MALL[2] + 8, -Math.PI / 2);

  // Megamall flanking wings (visible in Shot 11 & 14)
  const mallWings = new THREE.Group();
  const wb = new Batch();
  wb.add(boxGeo(V(-76, 0, Z_MALL[2] - 28), V(-30, 13.5, Z_MALL[2] - 13)), M_white);
  wb.add(boxGeo(V(30, 0, Z_MALL[2] - 28), V(76, 13.5, Z_MALL[2] - 13)), M_white);
  wb.add(boxGeo(V(-76.3, 10.2, Z_MALL[2] - 28.3), V(-30, 12.2, Z_MALL[2] - 12.7)), M_blue);
  wb.add(boxGeo(V(30, 10.2, Z_MALL[2] - 28.3), V(76.3, 12.2, Z_MALL[2] - 12.7)), M_blue);
  wb.build(mallWings);
  root.add(mallWings);

  // Flywheel glowing kiosks & shop awnings (Shot 10)
  const flywheelKiosks = new THREE.Group();
  const kb = new Batch();
  const kioskCols = ["#e85d4a", "#f2b838", "#35a4b8", "#65b357"];
  for (let i = 0; i < 4; i++) {
    const kx = -11 + i * 7.3, kz = Z_MALL[2] - 9.5;
    kb.add(boxGeo(V(kx - 2.2, 0, kz - 1.2), V(kx + 2.2, 2.8, kz + 1.2)), M_white);
    kb.add(boxGeo(V(kx - 2.4, 2.8, kz - 1.4), V(kx + 2.4, 3.4, kz + 1.6)), lam("kiosk_" + i, () => ({ color: kioskCols[i] })));
    kb.add(boxGeo(V(kx - 1.8, 1.0, kz + 1.21), V(kx + 1.8, 2.4, kz + 1.3)), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.2, 0.8) }));
  }
  kb.build(flywheelKiosks);
  root.add(flywheelKiosks);

  // ================= 4) AREA D: Cool Indoor Mall Atrium (-220, 0, 0) =================
  const ax = Z_ATRIUM[0];
  b.add(quadUp(ax - 18, ax + 18, -18, 18, 18, 18, 0.01), lam("atriumFloor", () => ({ color: "#efe7d6" })));
  // 2-story gallery walls + skylight beams (leaving +z open for cameras)
  b.add(boxGeo(V(ax - 18, 0, -18), V(ax + 18, 10, -16)), M_white);
  b.add(boxGeo(V(ax - 18, 0, -16), V(ax - 16, 10, 16)), M_white);
  b.add(boxGeo(V(ax + 16, 0, -16), V(ax + 18, 10, 16)), M_white);
  // 2nd floor balcony ledges (at y = 4.2 so never crossing ground-floor character faces)
  b.add(boxGeo(V(ax - 16, 4.0, -16), V(ax + 16, 4.4, -12.5)), M_blue);
  b.add(boxGeo(V(ax - 16, 4.0, -12.5), V(ax - 12.5, 4.4, 12)), M_blue);
  b.add(boxGeo(V(ax + 12.5, 4.0, -12.5), V(ax + 16, 4.4, 12)), M_blue);
  // Cinema marquee on left-back wall
  b.add(boxGeo(V(ax - 11, 0, -15.9), V(ax - 2, 4.0, -14.2)), lam("cineWall", () => ({ color: "#3d335c" })));
  b.add(boxGeo(V(ax - 10.6, 3.0, -14.2), V(ax - 2.4, 3.8, -13.6)), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.15, 0.5) }));
  const cineSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.MeshBasicMaterial({ map: ctex("cineEmblem", 256, 256, (g) => fxCinema(new Pen(g))) }),
  );
  cineSign.position.set(ax - 6.5, 2.0, -14.12);
  cineSign.layers.set(NOINK);
  root.add(cineSign);
  // Food court stall on right-back
  b.add(boxGeo(V(ax + 2, 0, -15.8), V(ax + 11, 3.4, -13.8)), lam("foodWall", () => ({ color: "#e89238" })));
  b.add(boxGeo(V(ax + 1.8, 3.2, -13.8), V(ax + 11.2, 3.7, -12.4)), smRed);
  // AC vents along upper soffit (y = 5.4)
  for (let i = 0; i < 4; i++) {
    b.add(boxGeo(V(ax - 9 + i * 6, 5.1, -12.4), V(ax - 7 + i * 6, 5.6, -11.9)), lam("acVent", () => ({ color: "#d6ebff" })));
  }
  // Indoor fountain at (ax, 0, 0) + benches
  b.add(new THREE.CylinderGeometry(2.3, 2.5, 0.48, 24).translate(0, 0.24, 0), lam("fountainStone", () => ({ color: "#dfd5c0" })), new THREE.Matrix4().makeTranslation(ax, 0, 0));
  b.add(new THREE.CylinderGeometry(1.9, 1.9, 0.4, 24).translate(0, 0.21, 0), lam("fountainWater", () => ({ color: "#4ac0e6" })), new THREE.Matrix4().makeTranslation(ax, 0, 0));
  b.add(new THREE.CylinderGeometry(0.45, 0.65, 1.3, 14).translate(0, 0.65, 0), M_white, new THREE.Matrix4().makeTranslation(ax, 0, 0));
  addBench(b, ax - 3.6, 0, 1.2, Math.PI / 3);
  addBench(b, ax + 3.4, 0, 1.4, -Math.PI / 3);
  addPalm(b, ax - 11.5, 0, 5, 6.2, 0.4, false);
  addPalm(b, ax + 11.5, 0, 5, 6.2, 2.1, false);

  // ================= 5) AREA E: Mall of Asia Waterfront (-220, 0, -240) =================
  const mx = Z_MOA[0], mz = Z_MOA[2];
  b.add(quadUp(mx - 32, mx + 40, mz - 45, mz + 35, 20, 20, 0.01), M_pave);
  // Bay seawall & curved Mall of Asia facade
  b.add(boxGeo(V(mx - 32, 0, mz - 36), V(mx + 32, 12.5, mz - 18)), M_white);
  b.add(boxGeo(V(mx - 32.3, 9.2, mz - 36.3), V(mx + 32.3, 11.4, mz - 17.7)), M_blue);
  // Iconic MOA Globe Monument
  b.add(new THREE.CylinderGeometry(3.2, 3.6, 1.4, 24).translate(0, 0.7, 0), M_white, new THREE.Matrix4().makeTranslation(mx - 4, 0, mz - 2));
  b.add(new THREE.SphereGeometry(3.1, 24, 18), lam("moaGlobe", () => ({ color: "#2d78d8" })), new THREE.Matrix4().makeTranslation(mx - 4, 4.6, mz - 2));
  b.add(new THREE.TorusGeometry(3.6, 0.25, 10, 32).rotateX(Math.PI / 2.6), M_gold, new THREE.Matrix4().makeTranslation(mx - 4, 4.6, mz - 2));
  addPalm(b, mx + 9, 0, mz - 6, 8.5, 0.8);
  addPalm(b, mx + 14, 0, mz + 4, 8.2, 2.1);

  // Giant Ferris Wheel (MOA Eye)
  const ferrisWheel = new THREE.Group();
  ferrisWheel.position.set(mx - 22, 13.5, mz - 10);
  const fwb = new Batch();
  fwb.add(new THREE.TorusGeometry(10.5, 0.28, 10, 36), M_white);
  fwb.add(new THREE.TorusGeometry(7.2, 0.18, 8, 24), M_blue);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12;
    const spoke = new THREE.BoxGeometry(0.14, 21, 0.14);
    if (i < 6) fwb.add(spoke, M_steel, new THREE.Matrix4().makeRotationZ(a));
    const podCol = ["#e85d4a", "#f2c438", "#35a4b8", "#65b357"][i % 4];
    fwb.add(boxGeo(V(-0.65, -0.75, -0.65), V(0.65, 0.75, 0.65)), lam("pod_" + (i % 4), () => ({ color: podCol })),
      new THREE.Matrix4().makeTranslation(Math.cos(a) * 10.5, Math.sin(a) * 10.5, 0));
  }
  fwb.build(ferrisWheel);
  root.add(ferrisWheel);
  // Ferris wheel A-frame legs (static)
  b.add(boxGeo(V(mx - 22.4, 0, mz - 11.4), V(mx - 21.6, 14, mz - 10.6)), M_steel);
  b.add(boxGeo(V(mx - 22.4, 0, mz - 9.4), V(mx - 21.6, 14, mz - 8.6)), M_steel);

  // ================= 6) AREA F: Empire Banking / Hotels / Real Estate (200, 0, -240) =================
  const ex = Z_EMPIRE[0], ez = Z_EMPIRE[2];
  b.add(quadUp(ex - 60, ex + 60, ez - 50, ez + 55, 30, 26, 0.01), M_pave);
  // 1. Bank Building (ex - 18)
  b.add(boxGeo(V(ex - 25, 0, ez - 18), V(ex - 11, 13, ez - 6)), lam("bankStone", () => ({ color: "#e9dec6" })));
  for (const cx of [-23.5, -20.5, -17.5, -14.5, -12.5]) {
    b.add(new THREE.CylinderGeometry(0.45, 0.55, 11.5, 12).translate(0, 5.75, 0), M_white, new THREE.Matrix4().makeTranslation(ex + cx, 0, ez - 5.4));
  }
  b.add(boxGeo(V(ex - 25.6, 12.6, ez - 18.4), V(ex - 10.4, 14.4, ez - 5.0)), M_blue);
  const bankSign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 3.2),
    new THREE.MeshBasicMaterial({ map: ctex("bankEmblem", 256, 256, (g) => fxBankEmblem(new Pen(g))) }),
  );
  bankSign.position.set(ex - 18, 10.2, ez - 4.9);
  bankSign.layers.set(NOINK);
  root.add(bankSign);

  // 2. Luxury Hotel Tower (ex)
  b.add(boxGeo(V(ex - 7, 0, ez - 18), V(ex + 7, 22, ez - 6)), lam("hotelWall", () => ({ map: facadeHD("hotel", 14, 22, { wall: "#e2b886", shutter: "#2f5f6a" }) })));
  b.add(boxGeo(V(ex - 5, 0, ez - 6), V(ex + 5, 3.6, ez - 2.5)), smRed);
  for (let i = 0; i < 5; i++) {
    b.add(new THREE.OctahedronGeometry(0.55), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.25, 0.4) }),
      new THREE.Matrix4().makeTranslation(ex - 4 + i * 2, 23.2, ez - 5.8));
  }

  // 3. Real Estate Skyscrapers (ex + 18..34)
  b.add(boxGeo(V(ex + 11, 0, ez - 20), V(ex + 23, 28, ez - 8)), lam("re1", () => ({ color: "#6ea4d6" })));
  b.add(boxGeo(V(ex + 13, 28, ez - 18), V(ex + 21, 33, ez - 10)), M_white);
  b.add(boxGeo(V(ex + 25, 0, ez - 24), V(ex + 37, 24, ez - 12)), lam("re2", () => ({ color: "#e5d5b6" })));
  b.add(boxGeo(V(ex + 16.8, 33, ez - 14.2), V(ex + 17.2, 38, ez - 13.8)), M_gold);

  // Festive flags on SM plaza
  const flags: THREE.Mesh[] = [];
  const flagMat = lam("plazaFlag", () => ({ color: "#1d5ec4", side: THREE.DoubleSide }));
  for (const fx of [-10, 10]) {
    b.add(boxGeo(V(fx - 0.08, 0, Z_MALL[2] + 6), V(fx + 0.08, 12, Z_MALL[2] + 6.16)), M_steel);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2, 10, 1), flagMat);
    fl.position.set(fx, 11.2, Z_MALL[2] + 6.08);
    fl.castShadow = true; fl.frustumCulled = false;
    flags.push(fl);
    root.add(fl);
  }

  b.build(root);
  sight = [];

  return { expandedGroup, mallWings, flywheelKiosks, qcFloors, qcCranes, doorL, doorR, ribbonL, ribbonR, ferrisWheel, flags };
};
