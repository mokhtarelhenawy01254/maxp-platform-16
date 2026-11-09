import React from 'react';
import QuickViewModal from './QuickViewModal';
import { useProductCardController } from './product-card/useProductCardController';
import type {
  ProductCardController,
  ProductCardProps,
  ProductCardVariant,
} from './product-card/productCardTypes';

// Subcomponent Variants
import { RedlineProductCard } from './product-card/variants/RedlineProductCard';
import { CompactProductCard } from './product-card/variants/CompactProductCard';
import { LuxuryProductCard } from './product-card/variants/LuxuryProductCard';
import { EditorialProductCard } from './product-card/variants/EditorialProductCard';
import { ButcherProductCard } from './product-card/variants/ButcherProductCard';
import { RetailProductCard } from './product-card/variants/RetailProductCard';
import { FastlyProductCard } from './product-card/variants/FastlyProductCard';
import { FashionProductCard } from './product-card/variants/FashionProductCard';
import { SpecialtyFrameProductCard } from './product-card/variants/SpecialtyFrameProductCard';
import { MinimalProductCard } from './product-card/variants/MinimalProductCard';
import { StandardProductCard } from './product-card/variants/StandardProductCard';
import { MarketplaceRowCard } from './product-card/variants/MarketplaceRowCard';

export type { ProductCardProps, ProductCardVariant, ProductCardController };

const renderVariant = (ctrl: ProductCardController): React.ReactNode => {
  if (ctrl.isRedLine) {
    return <RedlineProductCard ctrl={ctrl} />;
  }

  switch (ctrl.variant) {
    case 'compact':
      return <CompactProductCard ctrl={ctrl} />;
    case 'luxury':
      return <LuxuryProductCard ctrl={ctrl} />;
    case 'editorial':
    case 'editorial-bare':
      return <EditorialProductCard ctrl={ctrl} />;
    case 'butcher-black-label':
      return <ButcherProductCard ctrl={ctrl} />;
    case 'retail-air':
    case 'retail-direct':
      return <RetailProductCard ctrl={ctrl} />;
    case 'fastly-offer':
      return <FastlyProductCard ctrl={ctrl} />;
    case 'glass':
    case 'list':
    case 'playful':
    case 'pastel-fashion':
    case 'boutique-air':
      return <FashionProductCard ctrl={ctrl} />;
    case 'plant-bare':
    case 'harvest-crate':
    case 'carry-frame':
    case 'pedal-frame':
    case 'signal-rack':
      return <SpecialtyFrameProductCard ctrl={ctrl} />;
    case 'minimal':
      return <MinimalProductCard ctrl={ctrl} />;
    case 'marketplace-row':
      return <MarketplaceRowCard ctrl={ctrl} />;
    case 'overlay':
    case 'standard':
    default:
      return <StandardProductCard ctrl={ctrl} />;
  }
};

const ProductCard: React.FC<ProductCardProps> = React.memo((props) => {
  const ctrl = useProductCardController(props);

  return (
    <>
      {renderVariant(ctrl)}
      <QuickViewModal
        product={ctrl.product}
        isOpen={ctrl.isQuickViewOpen}
        onClose={() => ctrl.setIsQuickViewOpen(false)}
        currency={ctrl.currency}
        addToCartLabel={ctrl.storefrontSettings?.['addToCartLabel']}
        viewFullDetailsLabel={ctrl.storefrontSettings?.['viewFullDetailsLabel']}
      />
    </>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
