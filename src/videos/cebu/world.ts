// Full multi-district 3D cartoon World + dynamic Cebu/Bohol seismic & physics hero animations + cast staging.
import * as THREE from "three";
import { NOINK } from "../../shared/ink";
import { cloudHD } from "../lapaz/paint";
import { LIGHTS, LOOK } from "../../shared/lights";
import { TONE, CHAR, untone } from "../../shared/shade";
import { Actor, Fx, Pool, stage, type CamInfo } from "./cast";
import { buildAllDistricts, type BuiltCebu } from "./build";
import {
  SHOTS, camAt, clamp01, smooth, easeOut,
  Z_BASILICA, Z_STRAIT, Z_TABLE, Z_FAULT, Z_INERTIA, Z_COMPARE,
  HOOK_SHAKE_T, BOHOL_SHOCK_T, MAG_PULSE_T, CEBU_SHAKE_T, BELL_SWAY_T, COLLAPSE_T,
  BLOCKS_IN_T, TAP_T, TOWER_WOBBLE_T, FAULT_SLIP_T, FAULT_CRACK_T, WAVES_OUT_T, ACROSS_T,
  BASE_JOLT_T, TOP_LAG_T, STRESS_T, SWAY_T, COMPARE_T,
  FPS, type Light, type V3,
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
  [[480 - 20, 24, -78], 24, 12], [[480 + 18, 26, -86], 26, 13],
  [[-480 - 18, 24, -76], 24, 12], [[-480 + 18, 27, -84], 26, 13],
];

const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _sunV = new THREE.Vector3();
const _target = new THREE.Vector3(), _fog = new THREE.Color();

export class World {
  root = new THREE.Group();
  built: BuiltCebu;
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

    void [Z_BASILICA, Z_STRAIT, Z_TABLE, Z_FAULT, Z_INERTIA, Z_COMPARE];
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
    const { bellTower, strait, table, fault, inertia, compare } = this.built;

    // 1. Basilica Bell Tower (Shots 1, 4, 9)
    if (id === 4) {
      const preSway = t >= BELL_SWAY_T ? Math.sin((t - BELL_SWAY_T) * 20) * 0.08 : 0;
      const fallK = easeOut((t - COLLAPSE_T) / 1.05);
      bellTower.midTier.rotation.z = preSway * (1 - fallK * 0.7);
      bellTower.bell.rotation.z = Math.sin(t * 14) * 0.35;

      // Upper belfry tilts forward & crashes down into rubble
      bellTower.upperBelfry.position.set(0.35 * fallK, 7.02 - 6.35 * fallK * fallK, 2.4 * fallK);
      bellTower.upperBelfry.rotation.set(1.25 * fallK, 0.25 * fallK, -0.55 * fallK);
      bellTower.upperBelfry.visible = fallK < 0.92;

      bellTower.rubble.forEach((rb, i) => {
        const drop = clamp01((t - COLLAPSE_T - 0.12 - i * 0.015) / 0.35);
        rb.visible = drop > 0.02;
        if (rb.visible) {
          const d = rb.userData as { dx: number; dz: number; ry: number; rx: number };
          rb.position.set(d.dx * drop, 7.0 * (1 - drop * drop) + 0.22, d.dz * drop);
          rb.rotation.set(d.rx * drop, d.ry, d.rx * 0.5 * drop);
        }
      });
    } else {
      const hookTremor = id === 1 && t >= HOOK_SHAKE_T ? Math.sin((t - HOOK_SHAKE_T) * 24) * 0.035 : 0;
      bellTower.midTier.rotation.z = hookTremor * 0.6;
      bellTower.upperBelfry.position.set(0, 7.02, 0);
      bellTower.upperBelfry.rotation.set(0, 0, hookTremor);
      bellTower.upperBelfry.visible = true;
      bellTower.bell.rotation.z = id === 1 && t >= HOOK_SHAKE_T ? Math.sin(t * 16) * 0.24 : Math.sin(t * 1.8) * 0.04;
      bellTower.rubble.forEach((rb) => { rb.visible = false; });
    }

    // 2. Bohol & Cebu Strait Relief Map (Shots 2 & 3)
    const shockActive = t >= BOHOL_SHOCK_T;
    strait.boholShockRings.forEach((ring, i) => {
      ring.visible = shockActive;
      if (shockActive) {
        const u = ((t - BOHOL_SHOCK_T) * 0.85 + i * 0.33) % 1;
        const boost = t >= MAG_PULSE_T ? 1.35 : 1.0;
        ring.scale.setScalar((0.35 + u * 3.8) * boost);
      }
    });

    const crossActive = t >= BOHOL_SHOCK_T + 1.0;
    const [sx, , sz] = Z_STRAIT;
    strait.travelWaves.forEach((w, i) => {
      w.visible = crossActive;
      if (crossActive) {
        const u = ((t - BOHOL_SHOCK_T) * 0.55 + i * 0.25) % 1;
        w.position.set(sx + 3.4 - u * 7.8, 0.36, sz - 0.5);
        w.scale.setScalar(0.8 + u * 1.3);
      }
    });

    const cebuShk = t >= CEBU_SHAKE_T ? Math.sin((t - CEBU_SHAKE_T) * 28) * 0.09 : 0;
    strait.cebuMiniTower.rotation.z = cebuShk * 1.4;
    strait.cebuBuildings.position.x = sx - 5.0 + cebuShk * 0.55;

    // 3. Table & Block Tower Analogy (Shot 5)
    const [tx] = Z_TABLE;
    const tapK = clamp01((t - TAP_T) / 0.22);
    const tapRet = clamp01((t - (TAP_T + 0.22)) / 0.35);
    table.malletArm.rotation.z = -0.58 + 0.58 * easeOut(tapK) - 0.42 * smooth(tapRet);

    const waveGo = clamp01((t - (TAP_T + 0.12)) / (TOWER_WOBBLE_T - TAP_T));
    table.waveRing.visible = t >= TAP_T + 0.12 && waveGo < 1;
    table.waveRing.position.x = tx - 2.65 + waveGo * 5.15;

    const wobAmp = t >= TOWER_WOBBLE_T ? Math.exp(-(t - TOWER_WOBBLE_T) * 0.42) * 0.14 : 0;
    table.towerBlocks.forEach((blk) => {
      const { baseX, baseY, level } = blk.userData as { baseX: number; baseY: number; level: number };
      const dropIn = easeOut((t - (BLOCKS_IN_T - 1.2 + level * 0.12)) / 0.45);
      const sway = wobAmp * (level + 1) * 0.36 * Math.sin((t - TOWER_WOBBLE_T) * 18 - level * 0.5);
      blk.position.set(baseX + sway, baseY + (1 - dropIn) * 0.9, Z_TABLE[2]);
      blk.rotation.z = -sway * 0.35;
    });

    // 4. Underground Fault Cross-Section (Shot 6)
    const [fx, , fz] = Z_FAULT;
    const slipK = easeOut((t - FAULT_SLIP_T) / 0.55);
    const jolt = t >= FAULT_SLIP_T && t <= FAULT_SLIP_T + 0.7 ? Math.sin(t * 36) * 0.08 : 0;
    fault.rightBlock.position.set(fx + 3.6 + 0.28 * slipK + jolt, 0.36 * slipK, fz);
    fault.crackGlow.visible = t >= FAULT_CRACK_T - 0.5;
    fault.crackGlow.scale.x = 0.8 + 0.5 * Math.abs(Math.sin(t * 9));

    const fwActive = t >= WAVES_OUT_T;
    fault.waves.forEach((w, i) => {
      w.visible = fwActive;
      if (fwActive) {
        const u = ((t - WAVES_OUT_T) * 0.65 + i * 0.25) % 1;
        w.scale.setScalar(0.4 + u * 5.8);
      }
    });
    const coastShk = t >= ACROSS_T ? Math.sin((t - ACROSS_T) * 26) * 0.07 : 0;
    fault.cebuTopBuildings.position.x = fx - 5.6 + coastShk;

    // 5. Golden-hour Inertia Rig (Shot 7)
    const [ix, , iz] = Z_INERTIA;
    const activeShake = t >= BASE_JOLT_T;
    const freq = t >= SWAY_T ? 14 : 11;
    const baseShift = activeShake ? Math.sin((t - BASE_JOLT_T) * freq) * 0.65 : 0;
    inertia.carriage.position.x = ix + baseShift;

    // Key physics: foundation moves with carriage immediately, while heavy top lags behind in opposite phase!
    const lagPhase = t >= TOP_LAG_T ? 1.0 : 0.35;
    inertia.tiers.forEach((tg, idx) => {
      const follow = 1 - idx * 0.30 * lagPhase;
      const whip = t >= SWAY_T ? Math.sin((t - BASE_JOLT_T) * freq - idx * 0.75) * 0.22 * idx : 0;
      tg.position.x = ix + baseShift * follow + whip;
      tg.rotation.z = -(baseShift * (1 - follow) + whip) * 0.22;
    });

    const stressOn = t >= STRESS_T;
    inertia.stressRings.forEach((sr, idx) => {
      sr.visible = stressOn;
      if (stressOn) {
        sr.position.x = ix + baseShift * (0.7 - idx * 0.2);
        sr.scale.setScalar(0.95 + 0.2 * Math.abs(Math.sin(t * 10 + idx)));
      }
    });

    // 6. Three-Pad Comparison (Shot 8)
    const cmpActive = t >= COMPARE_T;
    const cmpOsc = cmpActive ? Math.sin((t - COMPARE_T) * 22) : 0;
    compare.rockTower.rotation.z = cmpOsc * 0.015;
    compare.softTower.rotation.z = cmpOsc * 0.13;
    compare.softCrack.visible = cmpActive;
    compare.bracedTower.rotation.z = cmpOsc * 0.035;
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
