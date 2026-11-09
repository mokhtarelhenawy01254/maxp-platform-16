import React from 'react';
import { useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';
import { useRecentlyViewed } from '../hooks/useRecentlyViewedProducts';

interface RecentlyViewedProps {
  section?: { variant?: string };
  settings?: {
    title?: string;
    subtitle?: string;
    limit?: number;
    [key: string]: unknown;
  };
}

/**
 * Recently viewed rail: renders the product snapshots the PDP recorded in local storage, in the
 * same compact row-card shape as the marketplace rails.
 */
export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ settings }) => {
  const location = useLocation();
  const { items } = useRecentlyViewed();
  const limit = Number(settings?.limit) || 6;
  const products = items.slice(0, limit);
  const title = (settings?.['title'] as string) || 'شوهدت مؤخرًا';

  if (!products.length) return null;

  return (
    <section className="w-full bg-white py-6 md:py-8">
      <div className="mx-auto w-full max-w-[1235px] px-4 md:px-6">
        <h2 className="mb-4 font-heading text-[18px] font-semibold text-[#333333] md:text-[22px]">{title}</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:grid-cols-6">
          {products.map((product) => {
            const href = buildStorefrontPath(
              location.pathname,
              product.slug ? `/product/${product.slug}` : '/shop',
              location.search,
            );
            const hasCompare =
              typeof product.comparePrice === 'number' && product.comparePrice > product.price;
            return (
              <a
                key={product.id}
                href={href}
                className="group flex items-center gap-3 bg-white p-2 transition-colors hover:bg-[#fafafa]"
              >
                <span className="block h-[74px] w-[74px] shrink-0 overflow-hidden bg-[#f5f5f5]">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 text-start">
                  <span className="line-clamp-2 block text-[13px] font-semibold leading-[1.5] text-[#333333] group-hover:text-[#ad7d61] md:text-[15px]">
                    {product.name}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    {hasCompare ? (
                      <span className="text-[12px] font-medium text-[#a3a3a3] line-through">
                        {product.comparePrice?.toLocaleString('ar-EG')} ج.م
                      </span>
                    ) : null}
                    <span className="text-[13px] font-semibold text-[#e14a5c] md:text-[15px]">
                      {product.price.toLocaleString('ar-EG')} ج.م
                    </span>
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
