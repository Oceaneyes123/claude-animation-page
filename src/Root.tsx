import React from "react";
import { Composition } from "remotion";
import { ShoeMartShort, SHOEMART_FRAMES } from "./videos/shoemart/ShoeMart";
import { PinatuboShort, PINATUBO_FRAMES } from "./videos/pinatubo/Pinatubo";
import { LapazShort, LAPAZ_FRAMES } from "./videos/lapaz/Lapaz";
import { BolinaoShort, BOLINAO_FRAMES } from "./videos/bolinao/Bolinao";
import { DavaoShort, DAVAO_FRAMES } from "./videos/davao/Davao";
import { CebuShort, CEBU_FRAMES } from "./videos/cebu/Cebu";
import { DivisoriaShort, DIVISORIA_FRAMES } from "./videos/divisoria/Divisoria";
import { TiwiShort, TIWI_FRAMES } from "./videos/tiwi/Tiwi";

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
      <Composition
        id="DavaoShort"
        component={DavaoShort}
        durationInFrames={DAVAO_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CebuShort"
        component={CebuShort}
        durationInFrames={CEBU_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="DivisoriaShort"
        component={DivisoriaShort}
        durationInFrames={DIVISORIA_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="TiwiShort"
        component={TiwiShort}
        durationInFrames={TIWI_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
