import React, { useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import { useRecentlyViewed } from '../hooks/useRecentlyViewedProducts';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import type { Product } from '../hooks/useProducts';
import type { ProductCardVariant } from '../components/product-card/productCardTypes';

interface RecentlyViewedProps {
  section?: { variant?: string };
  settings?: {
    title?: string;
    subtitle?: string;
    limit?: number;
    variant?: string;
    cardVariant?: string;
    quickViewLabel?: string;
    addToWishlistLabel?: string;
    [key: string]: unknown;
  };
}

/**
 * Recently viewed rail: renders the product snapshots the PDP recorded in local storage.
 * Automatically aligns with the active theme card variant (e.g. marketplace-tile in Marketplace Avenue)
 * and displays in a clean responsive grid matching the original template design.
 */
export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ section, settings }) => {
  const { items } = useRecentlyViewed();
  const { theme } = useStorefrontTheme();
  const isRtl = typeof document !== 'undefined' ? document.documentElement.dir === 'rtl' : false;

  const limit = Number(settings?.limit) || 6;
  const title = (settings?.['title'] as string) || (isRtl ? 'شوهدت مؤخرًا' : 'Recently Viewed');

  const isMarketplace =
    theme.id.startsWith('marketplace') ||
    theme.id === 'tpl-002-marketplace-multi-women-fashion';

  const cardVariant: ProductCardVariant =
    (settings?.cardVariant as ProductCardVariant) ||
    (settings?.variant as ProductCardVariant) ||
    (section?.variant as ProductCardVariant) ||
    (isMarketplace ? 'marketplace-tile' : 'standard');

  const isRowLayout = cardVariant === 'marketplace-row' || cardVariant === 'list';
  const gridClassName = isRowLayout
    ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'
    : 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-6';

  const products: Product[] = useMemo(() => {
    return items.slice(0, limit).map((item) => ({
      id: item.id,
      name: item.name,
      description: '',
      price: item.price,
      comparePrice:
        typeof item.comparePrice === 'number' && item.comparePrice > item.price
          ? item.comparePrice
          : undefined,
      images: item.image ? [item.image] : [],
      image: item.image,
      mainImage: item.image,
      slug: item.slug || item.id,
      rating: item.rating,
      category: item.category ? { id: '', name: item.category } : undefined,
    }));
  }, [items, limit]);

  if (!products.length) return null;

  return (
    <section className="w-full bg-white py-6 md:py-8">
      <div className="mx-auto w-full max-w-[1235px] px-4 md:px-6">
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#e7e7e7] pb-3">
          <h2 className="font-heading text-[20px] font-semibold text-[#242424] md:text-[24px]">
            {title}
          </h2>
        </div>
        <div className={gridClassName}>
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              variant={cardVariant}
              quickViewLabel={settings?.['quickViewLabel'] as string}
              addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
              imageLoading={index < 6 ? 'eager' : 'lazy'}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
