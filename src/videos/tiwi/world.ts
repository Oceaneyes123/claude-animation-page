// Full multi-district 3D cartoon World + dynamic Tiwi geothermal animations & cast staging.
import * as THREE from "three";
import { NOINK } from "../../shared/ink";
import { cloudHD } from "../lapaz/paint";
import { LIGHTS, LOOK } from "../../shared/lights";
import { TONE, CHAR, untone } from "../../shared/shade";
import { Actor, Fx, Pool, stage, type CamInfo } from "./cast";
import { buildAllDistricts, type BuiltTiwi } from "./build";
import {
  SHOTS, camAt, clamp01, smooth,
  Z_HOOK, Z_WELLS, Z_PINWHEEL, Z_TURBINE, Z_GEN, Z_CHAIN,
  HOOK_STEAM_T, POWER_1979_T, WELL_DEEP_T, PIPE_FLOW_T, SEPARATE_T, STEAM_TURBINE_T,
  BLOW_SPIN_T, TURBINE_PUSH_T, GEN_COUPLE_T, MAGNET_SPIN_T, COIL_SPARK_T,
  CHAIN_HEAT_T, CHAIN_STEAM_T, CHAIN_GEN_T, CHAIN_GRID_T, BULB_LIGHT_T, QUESTION_T,
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
  [[-18, 22, -75], 22, 11], [[18, 26, -82], 24, 12], [[0, 31, -96], 28, 14],
  [[240 - 18, 22, -74], 22, 11], [[240 + 18, 25, -80], 24, 12],
  [[-240 - 18, 23, -76], 22, 11], [[-240 + 20, 26, -84], 25, 12],
  [[-16, 24, -240 - 74], 22, 11], [[20, 27, -240 - 82], 25, 12],
  [[240 - 16, 23, -240 - 74], 22, 11], [[-240 + 16, 25, -240 - 76], 24, 12],
];

const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _sunV = new THREE.Vector3();
const _target = new THREE.Vector3(), _fog = new THREE.Color();

export class World {
  root = new THREE.Group();
  built: BuiltTiwi;
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
    const { hook, wells, pinwheel, turbine, gen, chain } = this.built;

    // 1. Hook & 1979 Tiwi Plant (Shots 1, 2, 8)
    const [hx, , hz] = Z_HOOK;
    const hookSteamOn = (id === 1 && t >= HOOK_STEAM_T) || id === 2 || (id === 8 && t >= QUESTION_T);
    const plantLit = (id === 1 && t >= HOOK_STEAM_T) || (id === 2 && t >= POWER_1979_T) || (id === 8 && t >= QUESTION_T);
    hook.magmaRocks.forEach((r, idx) => {
      r.scale.setScalar(0.92 + 0.14 * Math.sin(t * 4.5 + idx));
    });
    hook.coolingPuffs.forEach((cm, idx) => {
      const u = (t * 0.35 + idx * 0.2) % 1;
      cm.position.set(hx - 3.8 + Math.sin(t * 1.8 + idx) * 0.25, 5.25 + u * 2.8, hz - 4.8);
      cm.scale.setScalar(0.65 + u * 0.9);
    });
    hook.steamPuffs.forEach((sm, idx) => {
      sm.visible = hookSteamOn;
      if (hookSteamOn) {
        const u = (t * 0.7 + idx * 0.14) % 1;
        // Rise up well pipe (hx - 1.9, y = 1.4 -> 3.9) then across into turbine
        if (u < 0.55) {
          const k = u / 0.55;
          sm.position.set(hx - 1.9, 1.2 + k * 2.7, hz - 3.0);
        } else {
          const k = (u - 0.55) / 0.45;
          sm.position.set(hx - 1.9 + k * 3.8, 3.9 + Math.sin(k * Math.PI) * 0.25, hz - 3.0);
        }
        sm.scale.setScalar(0.75 + 0.25 * Math.sin(t * 8 + idx));
      }
    });
    hook.turbineRotor.rotation.z = hookSteamOn ? -t * 7.5 : -t * 1.8;
    hook.bulbOrb.material = plantLit ? hook.bulbLitMat : hook.bulbOffMat;

    // 2. Deep Wells & Cyclone Separator (Shot 3)
    const [wx, , wz] = Z_WELLS;
    const flowOn = t >= PIPE_FLOW_T - 2.0;
    const sepOn = t >= SEPARATE_T;
    const steamOutOn = t >= STEAM_TURBINE_T;
    const deepPulse = t >= WELL_DEEP_T ? 1.12 : 0.95;
    wells.magmaCores.forEach((m, idx) => {
      m.scale.setScalar(deepPulse + 0.12 * Math.sin(t * 5 + idx));
    });
    wells.liquidDrops.forEach((ld, idx) => {
      ld.visible = flowOn;
      if (flowOn) {
        const u = (t * 0.55 + idx * 0.14) % 1;
        if (u < 0.58) {
          const k = u / 0.58;
          ld.position.set(wx - 1.95 + Math.sin(t * 5 + idx) * 0.08, 1.0 + k * 3.1, wz - 1.25);
        } else {
          const k = (u - 0.58) / 0.42;
          ld.position.set(wx - 1.95 + k * 3.1, 4.15, wz - 1.25);
        }
      }
    });
    wells.mixedSteam.forEach((ms, idx) => {
      ms.visible = flowOn;
      if (flowOn) {
        const u = (t * 0.62 + idx * 0.14 + 0.07) % 1;
        if (u < 0.58) {
          const k = u / 0.58;
          ms.position.set(wx - 1.82 + Math.cos(t * 5 + idx) * 0.08, 1.0 + k * 3.1, wz - 1.2);
        } else {
          const k = (u - 0.58) / 0.42;
          ms.position.set(wx - 1.82 + k * 3.0, 4.15, wz - 1.2);
        }
      }
    });
    wells.drainDrops.forEach((dd, idx) => {
      dd.visible = sepOn;
      if (sepOn) {
        const u = ((t - SEPARATE_T) * 0.75 + idx * 0.16) % 1;
        if (u < 0.55) {
          const k = u / 0.55;
          dd.position.set(wx + 1.3, 2.3 - k * 1.35, wz - 1.2);
        } else {
          const k = (u - 0.55) / 0.45;
          dd.position.set(wx + 1.3 + k * 1.45, 0.95, wz - 1.2);
        }
      }
    });
    wells.pureSteam.forEach((ps, idx) => {
      ps.visible = steamOutOn || sepOn;
      if (ps.visible) {
        const spd = steamOutOn ? 1.05 : 0.55;
        const u = (t * spd + idx * 0.16) % 1;
        ps.position.set(wx + 1.3 + u * 2.4, 4.95 + Math.sin(u * Math.PI) * 0.2, wz - 1.2);
        ps.scale.setScalar(0.8 + u * 0.5);
      }
    });

    // 3. Toy Pinwheel ("laruang elisi", Shot 4)
    const [px, , pz] = Z_PINWHEEL;
    const spinSpeed = t >= BLOW_SPIN_T ? 11.5 : 1.2;
    pinwheel.rotor.rotation.z = -t * spinSpeed;
    pinwheel.windPuffs.forEach((wp, idx) => {
      wp.visible = t >= BLOW_SPIN_T;
      if (wp.visible) {
        const u = ((t - BLOW_SPIN_T) * 1.4 + idx * 0.16) % 1;
        wp.position.set(px - 1.15 + u * 1.45, 2.32 + Math.sin(u * 8 + idx) * 0.12, pz + 0.28);
        wp.scale.setScalar(0.55 + (1 - u) * 0.55);
      }
    });

    // 4. Golden Turbine + Coupled Generator (Shot 5)
    const [tx, , tz] = Z_TURBINE;
    const tPush = t >= TURBINE_PUSH_T;
    const gCouple = t >= GEN_COUPLE_T;
    const tRate = tPush ? 10.5 : 2.8;
    turbine.turbineRotor.rotation.z = -t * tRate;
    turbine.shaftCollars.rotation.x = t * tRate;
    turbine.genRotorMarker.rotation.z = gCouple ? -t * tRate : -t * 2.8;
    turbine.steamJets.forEach((sj, idx) => {
      sj.visible = true;
      const u = (t * (tPush ? 1.8 : 0.8) + idx * 0.125) % 1;
      sj.position.set(tx - 1.25 + u * 1.1, 2.25 + Math.sin(u * 6 + idx) * 0.18, tz - 0.18);
      sj.scale.setScalar((tPush ? 1.05 : 0.65) * (0.7 + u * 0.6));
    });

    // 5. Golden Generator Interior: Spinning Magnet + Copper Coils (Shot 6)
    const [gx, , gz] = Z_GEN;
    const magFast = t >= MAGNET_SPIN_T;
    const sparked = t >= COIL_SPARK_T;
    gen.magnetRotor.rotation.z = -t * (magFast ? 9.5 : 2.5);
    gen.sparks.forEach((sp, idx) => {
      sp.visible = sparked || magFast;
      if (sp.visible) {
        const u = (t * (sparked ? 1.4 : 0.7) + idx * 0.16) % 1;
        const laneY = idx % 2 === 0 ? 2.5 : 1.9;
        sp.position.set(gx + 1.35 + u * 1.35, laneY, gz - 0.12);
        sp.scale.setScalar(sparked ? 0.95 + 0.35 * Math.sin(t * 18 + idx) : 0.6);
      }
    });
    gen.meterBulb.material = sparked ? gen.bulbLitMat : gen.bulbOffMat;

    // 6. Full Energy Chain -> House Lightbulb (Shot 7)
    const [cx, , cz] = Z_CHAIN;
    const cHeat = t >= CHAIN_HEAT_T;
    const cSteam = t >= CHAIN_STEAM_T;
    const cGen = t >= CHAIN_GEN_T;
    const cGrid = t >= CHAIN_GRID_T;
    const cBulb = t >= BULB_LIGHT_T;
    chain.magmaRocks.forEach((r, idx) => {
      r.scale.setScalar((cHeat ? 1.18 : 0.92) + 0.12 * Math.sin(t * 5 + idx));
    });
    chain.steamPuffs.forEach((sm, idx) => {
      sm.visible = true;
      const u = (t * (cSteam ? 0.95 : 0.45) + idx * 0.16) % 1;
      if (u < 0.45) {
        const k = u / 0.45;
        sm.position.set(cx - 4.6 + k * 1.9, 2.95, cz - 0.95);
      } else {
        const k = (u - 0.45) / 0.55;
        sm.position.set(cx - 2.6 + k * 2.1, 2.8 + Math.sin(k * Math.PI) * 0.25, cz - 0.95);
      }
      sm.scale.setScalar(cSteam ? 0.95 : 0.65);
    });
    chain.turbineRotor.rotation.z = -t * (cGen ? 10.0 : cSteam ? 6.5 : 2.5);
    chain.genRing.rotation.z = -t * (cGen ? 10.0 : 2.5);
    chain.wirePulses.forEach((wp, idx) => {
      wp.visible = cGen || cGrid || cBulb;
      if (wp.visible) {
        const u = (t * (cGrid ? 1.35 : 0.75) + idx * 0.2) % 1;
        wp.position.set(cx + 2.4 + u * 2.8, 2.9 + Math.sin(u * Math.PI) * 0.35, cz - 0.6 + u * 1.3);
      }
    });
    chain.houseBulb.material = cBulb ? chain.bulbLitMat : chain.bulbOffMat;
    const bulbPulse = cBulb ? 1.0 + 0.08 * Math.sin(t * 10) : 1.0;
    chain.houseBulb.scale.setScalar(bulbPulse);
    void smooth; void clamp01;
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
