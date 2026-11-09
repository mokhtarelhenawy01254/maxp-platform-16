import React from 'react';
import ProductCard from '../../components/ProductCard';
import type { ProductGridController } from './useProductGridController';

/**
 * Marketplace rail: a dense six-up grid of the compact row card, the shape the department-store
 * demo uses for "latest / top appliances / recommended" rails.
 */
export const MarketplaceRailGrid: React.FC<{ controller: ProductGridController }> = ({ controller }) => {
  const {
    filteredProducts,
    settings,
    shopProductCardStyleOverrides,
    resolveGridCardImageLoading,
    resolveGridCardImageFetchPriority,
    gridFrameClassName,
  } = controller;

  const title = (settings?.['title'] as string) || '';
  const ctaText = settings?.['ctaText'] as string | undefined;
  const ctaLink = settings?.['ctaLink'] as string | undefined;

  return (
    <section className="w-full bg-white py-6 md:py-8">
      <div className="container px-4 md:px-6">
        {title ? (
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-heading text-[18px] font-semibold text-[#333333] md:text-[22px]">{title}</h2>
            {ctaText && ctaLink ? (
              <a href={ctaLink} className="text-[12px] font-semibold text-[#ad7d61] underline-offset-4 hover:underline">
                {ctaText}
              </a>
            ) : null}
          </div>
        ) : null}

        {filteredProducts.length > 0 ? (
          <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 ${gridFrameClassName}`}>
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                variant="marketplace-row"
                styleOverrides={shopProductCardStyleOverrides}
                quickViewLabel={settings?.['quickViewLabel'] as string}
                addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                imageLoading={resolveGridCardImageLoading(index)}
                imageFetchPriority={resolveGridCardImageFetchPriority(index)}
              />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[#8a8a8a]">لا توجد منتجات في هذا القسم الآن.</p>
        )}
      </div>
    </section>
  );
};
