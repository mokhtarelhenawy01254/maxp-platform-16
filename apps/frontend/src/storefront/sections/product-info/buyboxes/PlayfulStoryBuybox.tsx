import React from 'react';
import type { Product } from '../../../hooks/useProducts';
import type { StorefrontTheme } from '../../../types/theme.types';
import PlayfulStory from '../components/PlayfulStory';
import ProductDescription from '../components/ProductDescription';

export interface PlayfulStoryBuyboxProps {
  product: Product;
  theme: StorefrontTheme;
  displayPrice: string;
  originalPrice: string | null;
  commonVariantSelector: React.ReactNode;
  inlinePdpQuickOrderBeforeDescription?: React.ReactNode;
  inlinePdpQuickOrderAfterDescription?: React.ReactNode;
  commonActions: React.ReactNode;
  safeDescription: string;
  prefersArabicCopy: boolean;
}

export const PlayfulStoryBuybox: React.FC<PlayfulStoryBuyboxProps> = ({
  product,
  theme,
  displayPrice,
  originalPrice,
  commonVariantSelector,
  inlinePdpQuickOrderBeforeDescription,
  inlinePdpQuickOrderAfterDescription,
  commonActions,
  safeDescription,
  prefersArabicCopy,
}) => {
  return (
    <section className="w-full py-4 px-1">
      <PlayfulStory
        header={
          <div className="space-y-2">
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              {product.category?.name || 'Playtime'}
            </span>
            <h1 className="font-heading text-3xl font-black tracking-tight text-foreground md:text-5xl">
              {product.name}
            </h1>
          </div>
        }
        price={
          <div className="flex items-center gap-4">
            <span className="text-4xl font-black text-primary">{displayPrice}</span>
            {originalPrice && (
              <span className="text-xl font-bold text-muted-foreground line-through opacity-40">
                {originalPrice}
              </span>
            )}
          </div>
        }
        variants={commonVariantSelector}
        description={
          <div className="space-y-6">
            {inlinePdpQuickOrderBeforeDescription}
            <div className="prose prose-sm dark:prose-invert">
              <ProductDescription
                safeDescription={safeDescription}
                emptyText={
                  prefersArabicCopy
                    ? '?? ???? ??? ???? ???? ?????? ??? ????.'
                    : 'No description is available for this product yet.'
                }
              />
            </div>
            {inlinePdpQuickOrderAfterDescription}
          </div>
        }
        actions={commonActions}
      />
    </section>
  );
};

export default PlayfulStoryBuybox;