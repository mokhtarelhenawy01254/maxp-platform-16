import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';
import { useRecentlyViewed } from '../hooks/useRecentlyViewedProducts';
import { formatStorefrontCurrency } from '../utils/currency';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { useStorefrontLocale } from '../i18n/useStorefrontLocale';

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
 * same compact horizontal row-card shape as the marketplace rails.
 */
export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ settings }) => {
  const location = useLocation();
  const { items } = useRecentlyViewed();
  const { data: storefrontSettings } = useStorefrontSettings();
  const { isRtl, locale } = useStorefrontLocale();
  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency;

  const limit = Number(settings?.limit) || 6;
  const products = items.slice(0, limit);
  const localizedSettings =
    locale && settings?.['i18n'] && typeof settings['i18n'] === 'object'
      ? (settings['i18n'] as Record<string, Record<string, unknown>>)[locale]
      : undefined;
  const title =
    (typeof localizedSettings?.['title'] === 'string' && localizedSettings['title'].trim()) ||
    (typeof settings?.['title'] === 'string' && settings['title'].trim()) ||
    (isRtl ? 'شوهدت مؤخرًا' : 'Recently Viewed');

  if (!products.length) return null;

  return (
    <section className="w-full bg-white py-6 md:py-8">
      <div className="mx-auto w-full max-w-[1235px] px-4 md:px-6">
        <h2 className="mb-4 font-heading text-[18px] font-semibold text-[#333333] md:text-[22px]">{title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {products.map((product) => {
            const href = buildStorefrontPath(
              location.pathname,
              product.slug ? `/product/${product.slug}` : '/shop',
              location.search,
            );
            const hasCompare =
              typeof product.comparePrice === 'number' && product.comparePrice > product.price;
            const ratingValue =
              typeof product.rating === 'number' && Number.isFinite(product.rating)
                ? Math.max(0, Math.min(5, Math.round(product.rating)))
                : 0;
            return (
              <Link
                key={product.id}
                to={href}
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
                  {/* Keep line-clamp-2 without `block` so Tailwind's `-webkit-box` truncation works */}
                  <span className="line-clamp-2 text-[13px] font-semibold leading-[1.45] text-[#333333] group-hover:text-[#ad7d61] md:text-[14px]">
                    {product.name}
                  </span>
                  {ratingValue > 0 ? (
                    <span className="mt-0.5 flex items-center gap-[1px]" aria-label={`${ratingValue} / 5`}>
                      {Array.from({ length: 5 }).map((_, starIdx) => (
                        <span
                          key={starIdx}
                          className={`text-[10px] leading-none ${
                            starIdx < ratingValue ? 'text-[#f59e0b]' : 'text-[#d8d8d8]'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    {hasCompare ? (
                      <span className="text-[12px] font-medium text-[#a3a3a3] line-through">
                        {formatStorefrontCurrency(product.comparePrice as number, currency)}
                      </span>
                    ) : null}
                    <span className="text-[13px] font-semibold text-[#e14a5c] md:text-[14px]">
                      {formatStorefrontCurrency(product.price, currency)}
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
