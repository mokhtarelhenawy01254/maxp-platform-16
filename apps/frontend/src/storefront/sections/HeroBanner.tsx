import React from 'react';
import { HeroBannerProps } from './hero-banner/heroTypes';
import { useHeroBannerController } from './hero-banner/useHeroBannerController';
import {
  CenteredHero,
  GracefulBannerHero,
  LegacyImageSliderHero,
  RetailCommandHero,
  RetailDirectBannerHero,
  SpeedBannerHero,
} from './hero-banner/RetailAndMediaHeroes';
import {
  RunwayGridHero,
  WardrobePlannerHero,
  ModestCascadeHero,
  SoftShowcaseHero,
  BoutiqueMuseHero,
  FashionBillboardHero,
  StyleLedgerHero,
} from './hero-banner/FashionHeroVariants';
import {
  DropBoardHero,
  LayeredParallaxSkyHero,
  SplitPanelHero,
  ScentPortraitHero,
  NatureBreezeHero,
  CinematicPlinthHero,
  GroomingProHero,
} from './hero-banner/SpecializedEditorialHeroes';
import {
  ElessiSpotlightHero,
  ElessiDualMerchHero,
  ElessiPromoCascadeHero,
  ElessiUtilityStageHero,
  ElessiSoftDepartmentsHero,
  ElessiOrganicHarvestHero,
  ElessiPlantSliderHero,
  ElessiBikeHero,
} from './hero-banner/ElessiLifestyleHeroes';
import {
  ElessiDigitalLaunchHero,
  ElessiBagHero,
  ElessiBeautyRitualHero,
  ElessiGarageCommandHero,
  ElessiJewelSalonHero,
  ElessiPetSunroomHero,
} from './hero-banner/ElessiSpecialtyHeroes';
import {
  ButcherCounterHero,
  ButcherAtelierHero,
} from './hero-banner/ButcherHeroes';
import { DentalPrecisionHero } from './hero-banner/DentalPrecisionHero';
import { EasyOrdersMasonryHero } from './hero-banner/EasyOrdersMasonryHero';
import { DawnImageBanner } from './hero-banner/DawnImageBanner';

export * from './hero-banner';

export const HeroBanner: React.FC<HeroBannerProps> = ({ section, settings }) => {
  const { variant, props } = useHeroBannerController(section, settings);

  if (variant === 'legacy-image-slider') return <LegacyImageSliderHero {...props} />;
  if (variant === 'drop-board') return <DropBoardHero {...props} />;
  if (variant === 'layered-parallax-sky') return <LayeredParallaxSkyHero {...props} />;
  if (variant === 'cinematic-plinth') return <CinematicPlinthHero {...props} />;
  if (variant === 'speed-banner') return <SpeedBannerHero {...props} />;
  if (variant === 'split-panel') return <SplitPanelHero {...props} />;
  if (variant === 'fashion-billboard') return <FashionBillboardHero {...props} />;
  if (variant === 'easyorders-masonry') return <EasyOrdersMasonryHero {...props} />;
  if (variant === 'dawn-image-banner') return <DawnImageBanner {...props} />;
  if (variant === 'style-ledger') return <StyleLedgerHero {...props} />;
  if (variant === 'graceful-banner') return <GracefulBannerHero {...props} />;
  if (variant === 'retail-command') return <RetailCommandHero {...props} />;
  if (variant === 'runway-grid') return <RunwayGridHero {...props} />;
  if (variant === 'wardrobe-planner') return <WardrobePlannerHero {...props} />;
  if (variant === 'modest-cascade') return <ModestCascadeHero {...props} />;
  if (variant === 'soft-showcase') return <SoftShowcaseHero {...props} />;
  if (variant === 'boutique-muse') return <BoutiqueMuseHero {...props} />;
  if (variant === 'retail-direct-banner') return <RetailDirectBannerHero {...props} />;
  if (variant === 'scent-portrait') return <ScentPortraitHero {...props} />;
  if (variant === 'nature-breeze') return <NatureBreezeHero {...props} />;
  if (variant === 'elessi-bag-hero') return <ElessiBagHero {...props} />;
  if (variant === 'elessi-spotlight') return <ElessiSpotlightHero {...props} />;
  if (variant === 'elessi-dual-merch') return <ElessiDualMerchHero {...props} />;
  if (variant === 'elessi-promo-cascade') return <ElessiPromoCascadeHero {...props} />;
  if (variant === 'elessi-utility-stage') return <ElessiUtilityStageHero {...props} />;
  if (variant === 'elessi-soft-departments') return <ElessiSoftDepartmentsHero {...props} />;
  if (variant === 'elessi-organic-harvest') return <ElessiOrganicHarvestHero {...props} />;
  if (variant === 'butcher-counter') return <ButcherCounterHero {...props} />;
  if (variant === 'butcher-atelier') return <ButcherAtelierHero {...props} />;
  if (variant === 'elessi-plant-slider') return <ElessiPlantSliderHero {...props} />;
  if (variant === 'elessi-bike-hero') return <ElessiBikeHero {...props} />;
  if (variant === 'elessi-digital-launch') return <ElessiDigitalLaunchHero {...props} />;
  if (variant === 'elessi-beauty-ritual') return <ElessiBeautyRitualHero {...props} />;
  if (variant === 'elessi-garage-command') return <ElessiGarageCommandHero {...props} />;
  if (variant === 'elessi-jewel-salon') return <ElessiJewelSalonHero {...props} />;
  if (variant === 'elessi-pet-sunroom') return <ElessiPetSunroomHero {...props} />;
  if (variant === 'grooming-hero') return <GroomingProHero {...props} />;
  if (variant === 'dental-precision-hero') return <DentalPrecisionHero {...props} />;

  return <CenteredHero {...props} />;
};

export default HeroBanner;
