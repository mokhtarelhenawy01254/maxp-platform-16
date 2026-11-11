import React from 'react';
import type { ProductInfoProps } from './product-info/productInfoTypes';
import { useProductInfoController } from './product-info/useProductInfoController';
import { ProductInfoLoadingSkeleton } from './product-info/components/ProductInfoLoadingSkeleton';
import { ProductInfoErrorState } from './product-info/components/ProductInfoErrorState';

// Subcomponent buyboxes
import { SoftGracefulBuybox } from './product-info/buyboxes/SoftGracefulBuybox';
import { AtelierBuybox } from './product-info/buyboxes/AtelierBuybox';
import { BoutiqueLedgerBuybox } from './product-info/buyboxes/BoutiqueLedgerBuybox';
import { GearLoadoutBuybox } from './product-info/buyboxes/GearLoadoutBuybox';
import { ButcherAtelierBuybox } from './product-info/buyboxes/ButcherAtelierBuybox';
import { ZenOrganicBuybox } from './product-info/buyboxes/ZenOrganicBuybox';
import { PlayfulStoryBuybox } from './product-info/buyboxes/PlayfulStoryBuybox';
import { IntruderNftBuybox } from './product-info/buyboxes/IntruderNftBuybox';
import { ElessiBagBuybox } from './product-info/buyboxes/ElessiBagBuybox';
import { ElessiPlantBuybox } from './product-info/buyboxes/ElessiPlantBuybox';
import { ElessiOrganicBuybox } from './product-info/buyboxes/ElessiOrganicBuybox';
import { ElessiBikeBuybox } from './product-info/buyboxes/ElessiBikeBuybox';
import { ElessiSpecialtyBuybox } from './product-info/buyboxes/ElessiSpecialtyBuybox';
import { ElessiDigitalBuybox } from './product-info/buyboxes/ElessiDigitalBuybox';
import { ElessiMainBuybox } from './product-info/buyboxes/ElessiMainBuybox';
import { MarketplaceBuybox } from './product-info/buyboxes/MarketplaceBuybox';
import { StandardBuybox } from './product-info/buyboxes/StandardBuybox';
import { useRecordRecentlyViewed } from '../hooks/useRecentlyViewedProducts';

// Re-export conversion and navigation helpers for backwards compatibility and unit test suites
export {
  isProductInfoConversionModuleEnabled,
  shouldProductInfoAddToCartOpenCart,
  shouldProductInfoAddToCartOpenEmbeddedCheckout,
  shouldProductInfoMobileStickyOpenVariantSheet,
} from './product-info/productInfoHelpers';

export const ProductInfo: React.FC<ProductInfoProps> = (props) => {
  const ctrl = useProductInfoController(props);
  useRecordRecentlyViewed(ctrl.product);

  if (ctrl.isLoading) {
    return <ProductInfoLoadingSkeleton />;
  }

  if (ctrl.error || !ctrl.product) {
    return (
      <ProductInfoErrorState
        refetch={ctrl.refetch}
        homePath={ctrl.homePath}
        shopPath={ctrl.shopPath}
        prefersArabicCopy={ctrl.prefersArabicCopy}
      />
    );
  }

  // Route to the appropriate modular buybox according to theme and variant
  if (ctrl.isGracefulInfo) {
    return <SoftGracefulBuybox ctrl={ctrl} />;
  }

  if (ctrl.variant === 'atelier-buybox') {
    return <AtelierBuybox ctrl={ctrl} />;
  }

  if (ctrl.variant === 'boutique-ledger') {
    return <BoutiqueLedgerBuybox ctrl={ctrl} />;
  }

  if (ctrl.variant === 'gear-loadout') {
    return <GearLoadoutBuybox ctrl={ctrl} />;
  }

  if (ctrl.isButcherAtelier) {
    return <ButcherAtelierBuybox ctrl={ctrl} />;
  }

  if (ctrl.isZenOrganic) {
    return <ZenOrganicBuybox ctrl={ctrl} />;
  }

  if (ctrl.variant === 'playful-story') {
    return <PlayfulStoryBuybox ctrl={ctrl} />;
  }

  if (ctrl.isIntruderNft) {
    return <IntruderNftBuybox ctrl={ctrl} />;
  }

  if (ctrl.isElessiBagBuybox) {
    return <ElessiBagBuybox ctrl={ctrl} />;
  }

  if (ctrl.isElessiPlantBuybox) {
    return <ElessiPlantBuybox ctrl={ctrl} />;
  }

  if (ctrl.isElessiOrganicBuybox) {
    return <ElessiOrganicBuybox ctrl={ctrl} />;
  }

  if (ctrl.isElessiBikeBuybox) {
    return <ElessiBikeBuybox ctrl={ctrl} />;
  }

  if (
    ctrl.isElessiGiftBuybox ||
    ctrl.isElessiPetBuybox ||
    ctrl.isElessiWatchBuybox ||
    ctrl.isElessiGarageBuybox
  ) {
    return <ElessiSpecialtyBuybox ctrl={ctrl} />;
  }

  if (ctrl.isElessiDigitalBuybox) {
    return <ElessiDigitalBuybox ctrl={ctrl} />;
  }

  if (ctrl.isAnyElessiBuybox) {
    return <ElessiMainBuybox ctrl={ctrl} />;
  }

  if (
    ctrl.variant === 'marketplace-bazaar' ||
    ctrl.isMarketplaceBazaar ||
    ctrl.theme?.id?.includes('marketplace-avenue')
  ) {
    return <MarketplaceBuybox ctrl={ctrl} />;
  }

  return <StandardBuybox ctrl={ctrl} />;
};

ProductInfo.displayName = 'ProductInfo';

export default ProductInfo;
