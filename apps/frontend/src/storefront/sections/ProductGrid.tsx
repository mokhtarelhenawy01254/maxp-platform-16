import React from 'react';
import type { ProductGridProps } from './product-grid/gridTypes';
import { MarketplaceTabsGrid } from './product-grid/MarketplaceTabsGrid';
import {
  useProductGridController,
  ProductGridLoadingSection,
  ProductGridErrorSection,
  ButcherAtelierProductGrid,
  ProductGridHeader,
  ProductGridCards,
  ProductGridPagination,
  ProductGridEmptyState,
  resolveProductGridSectionBackground,
} from './product-grid';

export type { ProductGridProps };

export const ProductGrid: React.FC<ProductGridProps> = (props) => {
  const controller = useProductGridController(props);

  if (controller.isLoading) {
    return <ProductGridLoadingSection controller={controller} />;
  }

  if (controller.error) {
    return <ProductGridErrorSection error={controller.error} />;
  }

  if (controller.isButcherAtelierGrid) {
    return <ButcherAtelierProductGrid controller={controller} />;
  }

  if (controller.variant === 'marketplace-tabs') {
    return <MarketplaceTabsGrid controller={controller} />;
  }

  const backgroundClass = resolveProductGridSectionBackground({
    isBiteRush: controller.isBiteRush,
    isAnyElessiBagGrid: controller.isAnyElessiBagGrid,
    isButcherCutGrid: controller.isButcherCutGrid,
    isAnyElessiOrganicGrid: controller.isAnyElessiOrganicGrid,
    isElessiPlantFavorites: controller.isElessiPlantFavorites,
    isElessiPlantNurseryGrid: controller.isElessiPlantNurseryGrid,
    isElessiGrid: controller.isElessiGrid,
    variant: controller.variant,
    isVelaQuickViewFashionGrid: controller.isVelaQuickViewFashionGrid,
    isDistrictMarket: controller.isDistrictMarket,
    isNovaMobile: controller.isNovaMobile,
  });

  return (
    <section
      className={`w-full pt-1 pb-24 md:py-12 ${backgroundClass} ${controller.stableCatalogMinHeightClassName}`}
    >
      <div className={controller.containerClassName}>
        <ProductGridHeader controller={controller} />

        {controller.filteredProducts.length > 0 ? (
          <>
            <ProductGridCards controller={controller} />
            <ProductGridPagination controller={controller} />
          </>
        ) : (
          <ProductGridEmptyState controller={controller} />
        )}
      </div>
    </section>
  );
};

export default ProductGrid;
