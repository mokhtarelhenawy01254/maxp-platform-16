import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ProductCard from '../../components/ProductCard';
import { buildStorefrontPath } from '../../utils/paths';
import type { ProductGridController } from './useProductGridController';

/**
 * Marketplace rail: a dense six-up grid of the compact row card, the shape the department-store
 * demo uses for "latest / top appliances / recommended" rails.
 */
export const MarketplaceRailGrid: React.FC<{ controller: ProductGridController }> = ({ controller }) => {
  const location = useLocation();
  const scoped = (path?: string) =>
    path ? buildStorefrontPath(location.pathname, path.startsWith('/') ? path : `/${path}`, location.search) : '#';

  const {
    filteredProducts,
    settings,
    shopProductCardStyleOverrides,
    resolveGridCardImageLoading,
    resolveGridCardImageFetchPriority,
    gridFrameClassName,
  } = controller;

  const isRtl = typeof document !== 'undefined' ? document.documentElement.dir === 'rtl' : false;
  const title = (settings?.['title'] as string) || '';
  const ctaText = settings?.['ctaText'] as string | undefined;
  const ctaLink = settings?.['ctaLink'] as string | undefined;

  return (
    <section className="w-full bg-white py-6 md:py-8">
      <div className="mx-auto w-full max-w-[1235px] px-4 md:px-6">
        {title ? (
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-heading text-[18px] font-semibold text-[#333333] md:text-[22px]">{title}</h2>
            {ctaText && ctaLink ? (
              <Link to={scoped(ctaLink)} className="text-[12px] font-semibold text-[#ad7d61] underline-offset-4 hover:underline">
                {ctaText}
              </Link>
            ) : null}
          </div>
        ) : null}

        {filteredProducts.length > 0 ? (
          <div className={`grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 lg:grid-cols-6 ${gridFrameClassName}`}>
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                variant="marketplace-tile"
                styleOverrides={shopProductCardStyleOverrides}
                quickViewLabel={settings?.['quickViewLabel'] as string}
                addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                imageLoading={resolveGridCardImageLoading(index)}
                imageFetchPriority={resolveGridCardImageFetchPriority(index)}
              />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[#8a8a8a]">
            {isRtl ? 'لا توجد منتجات في هذا القسم الآن.' : 'No products available in this section.'}
          </p>
        )}
      </div>
    </section>
  );
};

export default MarketplaceRailGrid;
