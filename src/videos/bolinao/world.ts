// Full multi-district 3D cartoon World + dynamic Bolinao hero animations & cast staging.
import * as THREE from "three";
import { NOINK } from "../../shared/ink";
import { cloudHD } from "../lapaz/paint";
import { LIGHTS, LOOK } from "../../shared/lights";
import { TONE, CHAR, untone } from "../../shared/shade";
import { Actor, Fx, Pool, stage, type CamInfo } from "./cast";
import { buildAllDistricts, type BuiltBolinao } from "./build";
import {
  SHOTS, camAt, clamp01, smooth, easeOut,
  DIG_T, SKULL_T, TEETH_GOLD_T, FISH_T, RIVET_T, ALTER_T, PEG_T, SCALE_FORM_T, FINDS_T,
  Z_MUSEUM, Z_DIG, Z_PIER, Z_WORKSHOP, Z_TREASURE, FPS, type Light, type V3,
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
  [[480 - 18, 23, -72], 22, 11], [[480 + 16, 25, -78], 24, 12],
];

const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _sunV = new THREE.Vector3();
const _target = new THREE.Vector3(), _fog = new THREE.Color();

export class World {
  root = new THREE.Group();
  built: BuiltBolinao;
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

    // Sanity check unused district constants only for clean grouping
    void [Z_MUSEUM, Z_DIG, Z_PIER, Z_WORKSHOP, Z_TREASURE];
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
    const { heroSkull, digSkull, finds, heroFish, heroKnife, heroTooth, heroJewels, compareSkull } = this.built;

    // 1. Museum Hero Skull (Shots 1, 3, 9, 10)
    const skullTurn = Math.sin(t * 0.65) * 0.14;
    heroSkull.group.rotation.y = skullTurn;
    heroSkull.group.position.y = 1.72 + Math.sin(t * 1.4) * 0.015;
    heroSkull.jaw.rotation.x = id === 3 ? 0.08 + Math.sin(t * 1.2) * 0.025 : 0.02;
    heroSkull.goldInlays.forEach((m, idx) => {
      const mat = m.material as THREE.MeshPhongMaterial;
      const wave = id === 3 && t >= TEETH_GOLD_T
        ? 0.55 + 0.45 * Math.sin(t * 5.0 - idx * 0.4)
        : 0.16 + 0.12 * Math.sin(t * 2.2 + idx * 0.5);
      mat.emissiveIntensity = wave;
    });

    // 2. Balingasay Dig Skull (Shot 2)
    const digK = smooth((t - (DIG_T - 0.6)) / 1.45);
    digSkull.group.position.y = 0.25 + digK * 0.52;
    digSkull.group.rotation.x = -0.35 + digK * 0.24;
    digSkull.group.rotation.y = 0.25 - digK * 0.18 + Math.sin(t * 1.2) * 0.03;

    // 3. Reef Fish & Shimmering Scales (Shot 4)
    heroFish.group.position.y = 1.78 + Math.sin(t * 2.1) * 0.06;
    heroFish.group.rotation.y = 0.18 * Math.sin(t * 0.9);
    heroFish.tail.rotation.y = Math.sin(t * 6.5) * 0.22;
    heroFish.scales.forEach((sc, idx) => {
      const mat = sc.material as THREE.MeshPhongMaterial;
      const k = t >= FISH_T ? 0.55 + 0.45 * Math.sin(t * 6.2 - idx * 0.35) : 0.14;
      mat.emissiveIntensity = k;
    });

    // 4. Knife & Animated Steel Rivets (Shot 5)
    heroKnife.group.rotation.y = id === 5 && t >= ALTER_T - 0.4
      ? 0.12 + smooth((t - (ALTER_T - 0.4)) / 1.2) * 0.32
      : 0.12 + Math.sin(t * 0.8) * 0.04;
    heroKnife.rivets.forEach((rv, i) => {
      const hitT = RIVET_T + i * 0.68;
      const drop = easeOut((t - hitT) / 0.48);
      rv.position.y = (1 - drop) * 0.85;
      rv.scale.setScalar(drop < 0.02 ? 0.85 : 1.0);
    });

    // 5. Enlarged Tooth Model & 9 Staggered Gold Pegs (Shot 6)
    heroTooth.group.rotation.y = Math.sin(t * 0.7) * 0.18;
    heroTooth.pegs.forEach(({ mesh, targetPos }, idx) => {
      const pT = PEG_T + idx * 0.28;
      const k = easeOut((t - pT) / 0.52);
      mesh.position.set(targetPos[0], targetPos[1], targetPos[2] + (1 - k) * 0.85);
      const mat = mesh.material as THREE.MeshPhongMaterial;
      mat.emissiveIntensity = t >= SCALE_FORM_T ? 0.45 + 0.3 * Math.sin(t * 4.5 + idx) : 0.18;
    });

    // 6. Burial Gold Treasures & Compare Skull (Shot 7)
    heroJewels.rotation.y = Math.sin(t * 0.75) * 0.14;
    compareSkull.group.rotation.y = 0.25 + Math.sin(t * 0.8) * 0.08;

    // 7. 5 Balingasay Specimen Teeth Finds (Shot 8)
    finds.forEach((tooth, idx) => {
      const lift = t >= FINDS_T ? Math.max(0, Math.sin(t * 2.5 - idx * 0.75)) * 0.08 : 0;
      tooth.position.y = 1.2 + lift;
      tooth.rotation.y = (idx - 2) * -0.16 + Math.sin(t * 1.1 + idx) * 0.18;
    });
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

    // Freeze camera-relative sun from the first frame of this shot so shadows never swim as the camera moves
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

    // Stage 2D cast & FX relative to live camera
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
