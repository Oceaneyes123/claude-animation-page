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
import { AsinShort, ASIN_FRAMES } from "./videos/asin/Asin";
import { PalawanShort, PALAWAN_FRAMES } from "./videos/palawan/Palawan";
import { BambooShort, BAMBOO_FRAMES } from "./videos/bamboo/Bamboo";

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
      <Composition
        id="AsinShort"
        component={AsinShort}
        durationInFrames={ASIN_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="BambooShort"
        component={BambooShort}
        durationInFrames={BAMBOO_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="PalawanShort"
        component={PalawanShort}
        durationInFrames={PALAWAN_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
