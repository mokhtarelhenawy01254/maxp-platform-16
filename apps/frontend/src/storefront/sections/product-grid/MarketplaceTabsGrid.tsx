import React, { useMemo, useState } from 'react';
import ProductCard from '../../components/ProductCard';
import type { ProductGridController } from './useProductGridController';

/**
 * Marketplace tabs grid: the product rail of the department-store layout.
 *
 * The source theme keeps four merchandising pills above one grid. Our catalogue does not expose
 * view/sales counters, so the tabs are real client-side buckets over the products the section
 * already loaded (all / discounted / cheapest / priciest) instead of a decorative dead tab bar.
 */
type MarketplaceTabKey = 'featured' | 'discount' | 'lowest' | 'highest';

const TABS: Array<{ key: MarketplaceTabKey; label: string }> = [
  { key: 'featured', label: 'مميز' },
  { key: 'discount', label: 'عليه خصم' },
  { key: 'lowest', label: 'الأقل سعرًا' },
  { key: 'highest', label: 'الأعلى سعرًا' },
];

const compareValue = (product: unknown): number => {
  const record = product as Record<string, unknown>;
  const raw = record?.['comparePrice'] ?? record?.['compareAtPrice'];
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
};

const priceValue = (product: unknown): number => {
  const numeric = Number((product as Record<string, unknown>)?.['price']);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const MarketplaceTabsGrid: React.FC<{ controller: ProductGridController }> = ({ controller }) => {
  const [activeTab, setActiveTab] = useState<MarketplaceTabKey>('featured');
  const {
    filteredProducts,
    settings,
    resolvedCardVariant,
    shopProductCardStyleOverrides,
    resolveGridCardImageLoading,
    resolveGridCardImageFetchPriority,
    gridFrameClassName,
  } = controller;

  const products = useMemo(() => {
    const list = [...filteredProducts];
    if (activeTab === 'discount') {
      return list.filter((product) => compareValue(product) > priceValue(product));
    }
    if (activeTab === 'lowest') {
      return list.sort((a, b) => priceValue(a) - priceValue(b));
    }
    if (activeTab === 'highest') {
      return list.sort((a, b) => priceValue(b) - priceValue(a));
    }
    return list;
  }, [filteredProducts, activeTab]);

  const title = (settings?.['title'] as string) || 'المنتجات المميزة';
  const ctaText = settings?.['ctaText'] as string | undefined;
  const ctaLink = settings?.['ctaLink'] as string | undefined;

  return (
    <section className="w-full bg-white py-8 md:py-10">
      <div className="container px-4 md:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#e7e7e7] pb-4">
          <div className="flex flex-wrap items-center gap-6">
            <h2 className="font-heading text-[20px] font-semibold text-[#333333] md:text-[24px]">{title}</h2>
            <div className="flex flex-wrap items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    activeTab === tab.key
                      ? 'text-[#ad7d61] underline decoration-2 underline-offset-8'
                      : 'text-[#8a8a8a] hover:text-[#333333]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {ctaText && ctaLink ? (
            <a
              href={ctaLink}
              className="text-[12px] font-semibold text-[#ad7d61] underline-offset-4 hover:underline"
            >
              {ctaText}
            </a>
          ) : null}
        </div>

        {products.length > 0 ? (
          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${gridFrameClassName}`}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                variant={resolvedCardVariant}
                styleOverrides={shopProductCardStyleOverrides}
                quickViewLabel={settings?.['quickViewLabel'] as string}
                addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                imageLoading={resolveGridCardImageLoading(index)}
                imageFetchPriority={resolveGridCardImageFetchPriority(index)}
              />
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-[#8a8a8a]">لا توجد منتجات في هذا التصنيف الآن.</p>
        )}
      </div>
    </section>
  );
};
