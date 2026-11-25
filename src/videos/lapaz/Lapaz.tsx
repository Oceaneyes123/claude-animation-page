// "Ang Disyertong Gawa ng Ilog at Hangin" (La Paz Sand Dunes, Ilocos Norte): cartoon-3D vertical short.
// Post-processing chain: RenderPass -> InkPass -> LensBlur.pre -> LensBlur.main -> Bloom + NEUTRAL ToneMapping + Grade (MSAA 4).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass,
  ToneMappingEffect, ToneMappingMode,
} from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "../../shared/ink";
import { LensBlur, GrainEffect } from "../../shared/lensblur";
import { GradeEffect, GRADES, gradeFor } from "../../shared/grade";
import { TOTAL, FLASH_AT, SHOTS, FPS, layersAt, dofAt } from "./story";
import { CAPTIONS } from "./captions";

export const LAPAZ_FRAMES = TOTAL;

type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean };
const toggles = (): PostToggles => ({
  ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false,
  ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}),
});

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { gl, camera, scene, size } = useThree();
  const world = useMemo(() => new World(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);

  const fx = useMemo(() => {
    gl.toneMapping = THREE.NoToneMapping;
    const ink = new InkPass(scene, camera as THREE.PerspectiveCamera);
    const lens = new LensBlur({ maxCoC: 24, nearScale: 1.2 });
    const bloom = makeBloom();
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
    const grade = new GradeEffect(GRADES.day, 1);
    const grain = new GrainEffect({ amount: 0.025, cellPx: 1.5 });
    const composer = new EffectComposer(gl, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
    composer.addPass(new RenderPass(scene, camera));
    if (on.ink) composer.addPass(ink);
    if (on.lens && on.pre) composer.addPass(new EffectPass(camera, lens.pre));
    if (on.lens) composer.addPass(new EffectPass(camera, lens.main));
    const tailEffects = [
      ...(on.bloom ? [bloom] : []),
      tone,
      ...(on.grade ? [grade] : []),
      ...(on.grain ? [grain] : []),
    ];
    composer.addPass(new EffectPass(camera, ...tailEffects));
    composer.setSize(size.width, size.height);
    return { composer, ink, lens, bloom, tone, grade, grain };
  }, [gl, camera, scene, on]);

  useEffect(() => () => {
    fx.ink.dispose();
    fx.lens.dispose();
    fx.composer.dispose();
  }, [fx]);

  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene));
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  fx.grain.seed = f;

  useFrame((_, delta) => {
    fx.composer.setSize(size.width, size.height);
    fx.composer.render(delta);
  }, 1);

  return <primitive object={world.root} dispose={null} />;
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas
      width={1080}
      height={1920}
      {...(dprOverride() ? { dpr: dprOverride() } : {})}
      shadows
      gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.2, far: 1500 }}
    >
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

const captionAt = (t: number) => {
  for (const c of CAPTIONS) {
    if (t >= c.start && t <= c.end) return c;
  }
  return null;
};

export const LapazShort: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0;
  const cap = captionAt(t);
  const pop = cap ? Math.min(1, Math.max(0.92, 0.92 + ((t - cap.start) / 0.08) * 0.08)) : 1;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      {cap && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 310,
            paddingLeft: 70,
            paddingRight: 70,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: "'Arial Black', 'Trebuchet MS', sans-serif",
              fontWeight: 900,
              fontSize: 82,
              lineHeight: 1.12,
              textAlign: "center",
              color: "#fffdf5",
              WebkitTextStroke: "15px #241726",
              paintOrder: "stroke fill",
              textShadow: "0 8px 18px rgba(24, 15, 28, 0.48)",
              transform: `scale(${pop.toFixed(3)})`,
              letterSpacing: "-0.5px",
            }}
          >
            {cap.text}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
