// Full multi-district 3D cartoon World + dynamic Divisoria firebreak & paper-strip animations + cast staging.
import * as THREE from "three";
import { NOINK } from "../../shared/ink";
import { cloudHD } from "../lapaz/paint";
import { LIGHTS, LOOK } from "../../shared/lights";
import { TONE, CHAR, untone } from "../../shared/shade";
import { Actor, Fx, Pool, stage, type CamInfo } from "./cast";
import { buildAllDistricts, type BuiltDivisoria } from "./build";
import {
  SHOTS, camAt, clamp01, smooth, easeOut,
  Z_PLAZA, Z_PAPER, Z_EMBER, Z_MAP,
  HOOK_FIRE_T, DIVIDE_T, FIRE_SIDE_T, BLOCK_GAP_T,
  PACK_CLOSE_T, IGNITE_1_T, GAP_SLIDE_T, GAP_BURN_T,
  EMBER_WIND_T, WIDTH_COMPARE_T, MATERIAL_T, PLAN_DRAW_T, MAP_HIGHLIGHT_T, QUESTION_T,
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
  [[240 - 18, 22, -74], 22, 11], [[240 + 18, 25, -80], 24, 12],
  [[-240 - 18, 23, -76], 22, 11], [[-240 + 20, 26, -84], 25, 12],
  [[-16, 24, -240 - 74], 22, 11], [[20, 27, -240 - 82], 25, 12],
];

const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _sunV = new THREE.Vector3();
const _target = new THREE.Vector3(), _fog = new THREE.Color();

export class World {
  root = new THREE.Group();
  built: BuiltDivisoria;
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
    const { plaza, paper, ember, map } = this.built;

    // 1. Divisoria Promenade & Left-Block Blaze (Shots 1, 2, 3, 4, 9)
    const fireOn = (id === 1 && t >= HOOK_FIRE_T) || (id === 4 && t >= FIRE_SIDE_T) || (id === 9 && t >= QUESTION_T);
    const blazeStart = id === 1 ? HOOK_FIRE_T : id === 4 ? FIRE_SIDE_T : QUESTION_T;
    const growK = fireOn ? easeOut((t - blazeStart) / 0.45) : 0;
    plaza.flames.forEach((fm, idx) => {
      fm.visible = fireOn;
      if (fireOn) {
        const flicker = 0.88 + 0.24 * Math.sin(t * 17 + idx * 1.9);
        fm.scale.set(growK * (0.9 + 0.1 * Math.cos(t * 13 + idx)), growK * flicker, growK);
        fm.rotation.z = Math.sin(t * 11 + idx) * 0.12;
      }
    });
    const [px, , pz] = Z_PLAZA;
    plaza.smokePuffs.forEach((sm, idx) => {
      sm.visible = fireOn;
      if (fireOn) {
        const u = ((t - blazeStart) * 0.45 + idx * 0.17) % 1;
        sm.position.set(px - 4.6 + Math.sin(t * 2 + idx) * 0.35 + u * 0.8, 4.9 + u * 3.8, pz - 5.6 + idx * 0.15);
        sm.scale.setScalar((0.6 + u * 0.8) * growK);
      }
    });
    const showLine = id === 4 && t >= DIVIDE_T;
    const pulseLine = id === 4 && t >= BLOCK_GAP_T ? 1.2 + 0.25 * Math.sin(t * 8) : 1.0;
    plaza.firebreakLine.forEach((bar) => {
      bar.visible = showLine;
      if (showLine) bar.scale.set(pulseLine, 1, 1);
    });
    plaza.bunting.visible = id === 3;

    // 2. Workshop Table & Paper Strips (Shots 5 & 6)
    const [tx] = Z_PAPER;
    if (id === 5) {
      // Shot 5: 6 paper strips pack closely -> ignite sequentially 0..5
      const packK = smooth((t - (PACK_CLOSE_T - 0.6)) / 0.7);
      const spacing = 0.60 - 0.22 * packK; // narrows from 0.60 m to 0.38 m!
      paper.strips.forEach((st, idx) => {
        const x = tx + (idx - 2.5) * spacing;
        st.group.position.x = x;
        const litAt = IGNITE_1_T + idx * 0.36;
        const lit = t >= litAt;
        const charK = clamp01((t - litAt) / 0.35);
        st.charOverlay.visible = lit;
        st.charOverlay.scale.y = Math.max(0.05, charK);
        st.flame.visible = lit && t <= litAt + 2.4;
        if (st.flame.visible) {
          const fOut = clamp01(1 - (t - (litAt + 1.5)) / 0.9);
          st.flame.scale.setScalar(fOut * (0.92 + 0.16 * Math.sin(t * 18 + idx)));
        }
        st.group.rotation.z = lit ? -0.10 * charK : 0;
      });
      const hopU = clamp01((t - IGNITE_1_T) / (5 * 0.36));
      paper.spark.visible = t >= IGNITE_1_T && hopU < 1;
      paper.spark.position.x = tx + (-2.5 + hopU * 5) * spacing;
      paper.spark.position.y = 2.25 + Math.abs(Math.sin(hopU * Math.PI * 5)) * 0.35;
    } else if (id === 6) {
      // Shot 6: Left 3 & Right 3 slide apart cleanly -> left 3 burn, spark fizzles in gap, right 3 stay crisp white!
      const slideK = smooth((t - GAP_SLIDE_T) / 0.65);
      const halfGap = 0.22 + slideK * 0.85;
      paper.strips.forEach((st, idx) => {
        const isRight = idx >= 3;
        const localIdx = isRight ? idx - 3 : idx;
        const x = isRight
          ? tx + halfGap + localIdx * 0.42
          : tx - halfGap - (2 - localIdx) * 0.42;
        st.group.position.x = x;

        const litAt = GAP_BURN_T + localIdx * 0.34;
        const lit = !isRight && t >= litAt;
        const charK = clamp01((t - litAt) / 0.35);
        st.charOverlay.visible = lit;
        st.charOverlay.scale.y = Math.max(0.05, charK);
        st.flame.visible = lit && t <= litAt + 1.8;
        if (st.flame.visible) {
          const fOut = clamp01(1 - (t - (litAt + 1.1)) / 0.7);
          st.flame.scale.setScalar(fOut * (0.9 + 0.16 * Math.sin(t * 18 + idx)));
        }
        st.group.rotation.z = lit ? -0.09 * charK : 0;
      });
      // Spark fails to cross gap after strip 2
      const failT = GAP_BURN_T + 2 * 0.34;
      const failU = clamp01((t - failT) / 0.55);
      paper.spark.visible = t >= failT && failU < 1;
      paper.spark.position.x = tx - halfGap + failU * 0.75;
      paper.spark.position.y = 2.22 - failU * failU * 0.95;
      paper.spark.scale.setScalar(Math.max(0.1, 1 - failU));
    }

    // 3. Golden Wind, Embers & Stone vs Timber Materials (Shot 7)
    const [ex, , ez] = Z_EMBER;
    const emberOn = t >= EMBER_WIND_T;
    const wideOn = t >= WIDTH_COMPARE_T - 0.5;
    ember.narrowFlames.forEach((fm, idx) => {
      fm.visible = true;
      fm.scale.setScalar(0.9 + 0.18 * Math.sin(t * 16 + idx));
    });
    ember.narrowRoofFire.forEach((fm, idx) => {
      const k = easeOut((t - (EMBER_WIND_T + 0.55)) / 0.5);
      fm.visible = t >= EMBER_WIND_T + 0.55;
      if (fm.visible) fm.scale.setScalar(k * (0.88 + 0.2 * Math.sin(t * 15 + idx)));
    });
    ember.narrowEmbers.forEach((eb, idx) => {
      eb.visible = emberOn;
      if (emberOn) {
        const u = ((t - EMBER_WIND_T) * 0.95 + idx * 0.1) % 1;
        eb.position.set(ex - 3.6 + u * 2.5, 4.0 + Math.sin(u * Math.PI) * 0.75 + (idx % 3 - 1) * 0.18, ez - 0.4 + ((idx % 5) - 2) * 0.32);
        eb.scale.setScalar(0.7 + 0.4 * Math.sin(t * 14 + idx));
      }
    });
    ember.wideFlames.forEach((fm, idx) => {
      fm.visible = true;
      fm.scale.setScalar(0.9 + 0.18 * Math.sin(t * 16 + idx));
    });
    ember.wideEmbers.forEach((eb, idx) => {
      eb.visible = emberOn && wideOn;
      if (eb.visible) {
        const u = ((t - EMBER_WIND_T) * 0.85 + idx * 0.1) % 1;
        const reach = t >= MATERIAL_T ? 3.5 : 2.9;
        // Embers drop to the stone cobbles or bounce harmlessly off the brick wall
        const dropY = 3.9 - u * u * 3.45;
        eb.position.set(ex + 1.1 + u * reach, Math.max(0.28, dropY), ez - 0.4 + ((idx % 5) - 2) * 0.35);
        eb.scale.setScalar(Math.max(0.15, 1.0 - u * 0.8));
      }
    });
    ember.windStreaks.forEach((ws, idx) => {
      ws.visible = emberOn;
      if (emberOn) {
        const u = ((t - EMBER_WIND_T) * 1.1 + idx * 0.16) % 1;
        ws.position.set(ex - 5.2 + u * 10.6, 3.3 + (idx % 3) * 0.55, ez + 0.55 - (idx % 2) * 1.1);
      }
    });

    // 4. 3D Relief Map Highlight (Shot 8)
    const [mx, , mz] = Z_MAP;
    const planOn = id === 8 && t >= PLAN_DRAW_T - 1.0;
    const mapPulse = id === 8 && t >= MAP_HIGHLIGHT_T ? 1.25 + 0.25 * Math.sin(t * 9) : 1.0;
    map.highlightRails.forEach((rail) => {
      rail.visible = planOn;
      if (planOn) rail.scale.set(mapPulse, 1, 1);
    });
    map.planBeacons.forEach((bc, idx) => {
      bc.visible = id === 8 && t >= MAP_HIGHLIGHT_T;
      if (bc.visible) {
        bc.position.set(mx + 0.6, 1.4 + Math.sin(t * 5 + idx) * 0.12, mz + (idx - 1) * 2.4);
      }
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
