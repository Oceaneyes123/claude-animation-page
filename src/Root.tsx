import React from "react";
import { Composition } from "remotion";
import { ShoeMartShort, SHOEMART_FRAMES } from "./videos/shoemart/ShoeMart";
import { PinatuboShort, PINATUBO_FRAMES } from "./videos/pinatubo/Pinatubo";
import { LapazShort, LAPAZ_FRAMES } from "./videos/lapaz/Lapaz";
import { BolinaoShort, BOLINAO_FRAMES } from "./videos/bolinao/Bolinao";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ShoeMartShort"
        component={ShoeMartShort}
        durationInFrames={SHOEMART_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="PinatuboShort"
        component={PinatuboShort}
        durationInFrames={PINATUBO_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LapazShort"
        component={LapazShort}
        durationInFrames={LAPAZ_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="BolinaoShort"
        component={BolinaoShort}
        durationInFrames={BOLINAO_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
