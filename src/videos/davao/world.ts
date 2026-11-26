// Full multi-district 3D cartoon World + dynamic Davao hero animations (eagles, hatching eggs, nursery saplings) & cast staging.
import * as THREE from "three";
import { NOINK } from "../../shared/ink";
import { cloudHD } from "../lapaz/paint";
import { LIGHTS, LOOK } from "../../shared/lights";
import { TONE, CHAR, untone } from "../../shared/shade";
import { Actor, Fx, Pool, stage, type CamInfo } from "./cast";
import { buildAllDistricts, type BuiltDavao, type HeroEgg } from "./build";
import {
  SHOTS, camAt, clamp01, smooth, easeOut,
  HATCH_92_T, PAGASA_T, SEED1_T, SEED2_T, GEN2_T, HATCH_13_T, MABUHAY_T,
  Z_CENTER, Z_NEST1992, Z_NURSERY, Z_NEST2013, Z_FOREST, FPS, type Light, type V3,
} from "./story";

const SKY_V = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vDir = w.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const SKY_F = /* glsl */ `
uniform vec3 uC[5];
uniform float uE[5];
uniform vec3 uSun;
uniform vec3 uSunCol;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float el = degrees(asin(clamp(d.y, -1.0, 1.0)));
  vec3 col = uC[0];
  for (int i = 1; i < 5; i++) col = mix(col, uC[i], smoothstep(uE[i - 1], uE[i], el));
  float sd = max(dot(d, uSun), 0.0);
  col += uSunCol * (smoothstep(0.9978, 0.9994, sd) + 0.14 * pow(sd, 22.0));
  gl_FragColor = vec4(col, 1.0);
}`;

type Cloud = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; base: V3; seed: number; drift: number };
const makeSky = () => {
  const geo = new THREE.SphereGeometry(720, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uC: { value: Array.from({ length: 5 }, () => new THREE.Color()) },
      uE: { value: [0, 3, 8, 16, 40] },
      uSun: { value: new THREE.Vector3(0.4, 0.6, -0.7).normalize() },
      uSunCol: { value: new THREE.Color(0x000000) },
    },
    vertexShader: SKY_V,
    fragmentShader: SKY_F,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.layers.set(NOINK);
  mesh.frustumCulled = false;
  return { mesh, mat };
};

const CLOUD_SPOTS: [V3, number, number][] = [
  [[-18, 22, -75], 22, 11], [[16, 26, -82], 24, 12], [[0, 31, -96], 28, 14],
  [[240 - 20, 24, -76], 22, 11], [[240 + 18, 25, -80], 24, 12],
  [[-240 - 16, 22, -72], 22, 11], [[-240 + 20, 26, -84], 25, 12],
  [[-16, 24, -240 - 74], 22, 11], [[22, 27, -240 - 80], 25, 12],
  [[480 - 20, 26, -78], 24, 12], [[480 + 18, 28, -86], 26, 13],
];

const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _sunV = new THREE.Vector3();
const _target = new THREE.Vector3(), _fog = new THREE.Color();

const animateHatchEgg = (egg: HeroEgg, t: number, crackT: number, revealT: number) => {
  const wobble = t < crackT ? Math.sin(t * 2.5) * 0.03 : 0;
  const crackK = smooth((t - crackT) / 0.85);
  const openK = easeOut((t - revealT) / 0.75);

  egg.eggRoot.rotation.z = wobble + (crackK > 0 && openK < 0.3 ? Math.sin(t * 28) * 0.08 * (1 - openK) : 0);
  egg.topShell.position.set(0.28 * openK, 0.34 * crackK + 0.16 * openK, -0.18 * openK);
  egg.topShell.rotation.z = -1.1 * openK - 0.15 * crackK;
  egg.topShell.visible = openK < 0.96;

  egg.chick.visible = crackK > 0.1;
  const pop = 0.25 + 0.75 * easeOut((t - crackT) / 0.95);
  egg.chick.scale.setScalar(pop);
  egg.chick.position.y = 0.02 + 0.03 * openK + Math.abs(Math.sin(t * 6.5)) * 0.025 * openK;
  const flap = Math.sin(t * 14) * 0.45 * openK;
  egg.chickWings[0].rotation.z = 0.25 + flap;
  egg.chickWings[1].rotation.z = -0.25 - flap;
};

export class World {
  root = new THREE.Group();
  built: BuiltDavao;
  pool = new Pool();
  actors: Actor[] = [];
  fxs: Fx[] = [];
  sky: ReturnType<typeof makeSky>;
  sun = new THREE.DirectionalLight(0xfff3e0, 2.8);
  hemi = new THREE.HemisphereLight(0xdcecff, 0xb49a78, 0.55);
  clouds: Cloud[] = [];
  lastMode: Light | null = null;

  constructor() {
    this.sky = makeSky();
    this.root.add(this.sky.mesh);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 160;
    const d = 32;
    Object.assign(this.sun.shadow.camera, { left: -d, right: d, top: d, bottom: -d });
    this.root.add(this.sun, this.sun.target, this.hemi);

    this.built = buildAllDistricts(this.root);

    for (let i = 0; i < 6; i++) {
      const a = new Actor(this.pool);
      this.actors.push(a);
      this.root.add(a.card, a.shd);
    }
    for (let i = 0; i < 8; i++) {
      const fx = new Fx();
      this.fxs.push(fx);
      this.root.add(fx.mesh);
    }

    CLOUD_SPOTS.forEach(([pos, w, h], idx) => {
      const mat = new THREE.MeshBasicMaterial({ map: cloudHD(idx + 1, LOOK.day.cloud), transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.set(...pos);
      mesh.layers.set(NOINK);
      this.root.add(mesh);
      this.clouds.push({ mesh, mat, base: pos, seed: idx + 1, drift: (idx % 2 ? 1 : -1) * 0.25 });
    });

    void [Z_CENTER, Z_NEST1992, Z_NURSERY, Z_NEST2013, Z_FOREST];
  }

  applyLook(mode: Light, scene: THREE.Scene) {
    const P = LIGHTS[mode], L = LOOK[mode];
    TONE.uLitCol.value.set(...P.lit);
    TONE.uShadeCol.value.set(...P.shade);
    TONE.uShadeLift.value.set(...P.lift);
    TONE.uLambert.value = P.lambert;
    TONE.uSideK.value = P.sideK;
    TONE.uTerm.value = P.term;
    TONE.uBounce.value.set(...L.bounce);
    TONE.uSat.value = L.sat;

    CHAR.uCharTint.value.set(...P.charTint);
    CHAR.uCharShade.value = P.charShade;
    CHAR.uGrad.value = P.charGrad;
    CHAR.uBodyGrad.value = P.bodyGrad;
    CHAR.uSideTint.value.set(...P.sideTint);

    this.sun.color.set(P.sunCol);
    this.sun.intensity = P.sunI;
    this.sun.shadow.bias = P.bias;
    this.sun.shadow.normalBias = P.normalBias;
    this.hemi.color.set(P.sky);
    this.hemi.groundColor.set(P.ground);
    this.hemi.intensity = P.hemiI;

    L.sky.c.forEach((hex, i) => untone(hex, this.sky.mat.uniforms.uC.value[i]));
    this.sky.mat.uniforms.uE.value = L.sky.e;
    untone(P.sunDisc, this.sky.mat.uniforms.uSunCol.value);
    untone(P.fog, _fog);
    scene.fog = new THREE.Fog(_fog.getHex(), P.fogNear, P.fogFar);

    if (this.lastMode !== mode) {
      for (const cl of this.clouds) {
        cl.mat.map?.dispose();
        cl.mat.map = cloudHD(cl.seed, L.cloud);
        cl.mat.needsUpdate = true;
      }
      this.lastMode = mode;
    }
  }

  animateHeroes(id: number, t: number) {
    const { hookEgg, centerSoarEagle, egg1992, nursery, egg2013, pagasa, kalinawan, soarA, soarB } = this.built;

    // 1. Center Sanctuary Egg (Shots 1 & 9)
    hookEgg.eggRoot.rotation.z = Math.sin(t * 2.2) * 0.04;
    hookEgg.eggRoot.rotation.y = Math.sin(t * 0.9) * 0.12;

    // Center background soaring eagle (Shots 1 & 9)
    const cAng = t * 0.35;
    centerSoarEagle.group.position.set(Math.sin(cAng) * 5.2, 6.4 + Math.sin(t * 1.4) * 0.35, -16 + Math.cos(cAng) * 2.8);
    centerSoarEagle.group.rotation.y = Math.cos(cAng) * 0.45;
    centerSoarEagle.leftWing.rotation.z = Math.sin(t * 4.5) * 0.22;
    centerSoarEagle.rightWing.rotation.z = -Math.sin(t * 4.5) * 0.22;

    // 2. 1992 Hatchery Egg -> Pag-asa Chick (Shots 2 & 3)
    animateHatchEgg(egg1992, t, HATCH_92_T, PAGASA_T);

    // 3. Nursery ("Punlaan") Two-Generation Tree Growth (Shot 5)
    const [nx, , nz] = Z_NURSERY;
    const grow1 = easeOut((t - SEED1_T) / 1.8);
    const seedDrop = clamp01((t - SEED2_T) / 1.2);
    const grow2 = easeOut((t - GEN2_T) / 1.6);

    nursery.seed1.visible = grow1 < 0.35;
    nursery.seed1.scale.setScalar(1 - grow1 * 0.6);
    nursery.tree1.scale.setScalar(Math.max(0.01, grow1));
    nursery.tree1.visible = grow1 > 0.02;

    nursery.dropSeed.visible = t >= SEED2_T - 0.3 && grow2 < 0.35;
    nursery.dropSeed.position.set(
      nx - 0.55 + seedDrop * 1.40,
      2.65 - 1.32 * seedDrop + Math.sin(seedDrop * Math.PI) * 0.65,
      nz,
    );
    nursery.tree2.scale.setScalar(Math.max(0.01, grow2));
    nursery.tree2.visible = grow2 > 0.02;

    // 4. 2013 Aviary: Pag-asa, Kalinawan & Mabuhay Hatch (Shots 4, 6, 7)
    animateHatchEgg(egg2013, t, HATCH_13_T, MABUHAY_T);
    const headLook = id === 7 && t >= HATCH_13_T ? -0.18 : Math.sin(t * 1.2) * 0.08;
    pagasa.head.rotation.y = 0.24 + Math.sin(t * 1.1) * 0.1;
    pagasa.head.rotation.x = headLook;
    pagasa.leftWing.rotation.z = Math.sin(t * 2.1) * 0.05;
    kalinawan.head.rotation.y = -0.24 + Math.cos(t * 1.0) * 0.1;
    kalinawan.head.rotation.x = headLook;
    kalinawan.rightWing.rotation.z = -Math.sin(t * 2.0) * 0.05;

    // 5. Mindanao Rainforest Soaring Eagles (Shot 8)
    const [fx, , fz] = Z_FOREST;
    const fAngA = t * 0.38;
    soarA.group.position.set(fx + Math.sin(fAngA) * 5.6, 7.6 + Math.sin(t * 1.6) * 0.45, fz - 9 + Math.cos(fAngA) * 3.8);
    soarA.group.rotation.y = Math.cos(fAngA) * 0.5;
    soarA.leftWing.rotation.z = Math.sin(t * 4.8) * 0.26;
    soarA.rightWing.rotation.z = -Math.sin(t * 4.8) * 0.26;

    const fAngB = t * 0.32 + 1.8;
    soarB.group.position.set(fx + Math.sin(fAngB) * 6.4, 8.8 + Math.cos(t * 1.3) * 0.4, fz - 15 + Math.cos(fAngB) * 4.2);
    soarB.group.rotation.y = Math.cos(fAngB) * 0.5;
    soarB.leftWing.rotation.z = Math.sin(t * 4.2 + 0.8) * 0.24;
    soarB.rightWing.rotation.z = -Math.sin(t * 4.2 + 0.8) * 0.24;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS;
    const def = SHOTS[id - 1];
    this.applyLook(def.light, scene);

    const c = camAt(id, f);
    cam.position.set(...c.pos);
    cam.fov = c.fov;
    cam.updateProjectionMatrix();
    _target.set(...c.look);
    cam.lookAt(_target);
    if (c.roll) cam.rotateZ(c.roll);
    cam.updateMatrixWorld();

    // Freeze camera-relative sun from the first frame of this shot
    const refC = camAt(id, def.a);
    _fwd.set(refC.look[0] - refC.pos[0], 0, refC.look[2] - refC.pos[2]).normalize();
    _right.set(-_fwd.z, 0, _fwd.x);
    const P = LIGHTS[def.light];
    const az = ((def.sunAz ?? P.az) * Math.PI) / 180;
    const el = ((def.sunEl ?? P.el) * Math.PI) / 180;
    _sunV.set(
      Math.cos(el) * (_fwd.x * Math.cos(az) + _right.x * Math.sin(az)),
      Math.sin(el),
      Math.cos(el) * (_fwd.z * Math.cos(az) + _right.z * Math.sin(az)),
    ).normalize();

    this.sun.position.copy(_target).addScaledVector(_sunV, 55);
    this.sun.target.position.copy(_target);
    this.sun.target.updateMatrixWorld();
    this.sky.mesh.position.copy(cam.position);
    this.sky.mat.uniforms.uSun.value.copy(_sunV);

    this.clouds.forEach((cl) => {
      cl.mesh.position.set(cl.base[0] + cl.drift * t, cl.base[1], cl.base[2]);
      cl.mesh.lookAt(cam.position);
    });

    this.animateHeroes(id, t);

    cam.getWorldDirection(_fwd);
    _right.crossVectors(_fwd, cam.up).normalize();
    const camInfo: CamInfo = { pos: cam.position, right: _right, sun: this.sun.position };
    const st = stage(id, t, camInfo);

    this.actors.forEach((a, i) => {
      if (i < st.places.length) a.place(this.pool, st.places[i], camInfo);
      else a.hide();
    });
    this.fxs.forEach((fx, i) => {
      if (i < st.fx.length) fx.place(this.pool, st.fx[i], camInfo);
      else fx.hide();
    });

    return _target.clone();
  }
}
