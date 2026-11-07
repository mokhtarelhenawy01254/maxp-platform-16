import React from 'react';
import type { ProductInfoController } from '../productInfoTypes';
import PlayfulStory from '../components/PlayfulStory';
import ProductDescription from '../components/ProductDescription';

export interface PlayfulStoryBuyboxProps {
  ctrl: ProductInfoController;
}

export const PlayfulStoryBuybox: React.FC<PlayfulStoryBuyboxProps> = ({ ctrl }) => {
  const {
    product,
    displayPrice,
    originalPrice,
    commonVariantSelector,
    commonActions,
    safeDescription,
    prefersArabicCopy,
    mergedInlinePdpQuickOrder,
  } = ctrl;

  // The PDP renders before the product query resolves. Every sibling buybox returns null
  // here; without this guard `product.category` throws and the whole PDP screen goes blank.
  if (!product) return null;

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
            {mergedInlinePdpQuickOrder ?? null}
            <div className="prose prose-sm dark:prose-invert">
              <ProductDescription
                safeDescription={safeDescription}
                emptyText={
                  prefersArabicCopy
                    ? 'لسه مفيش وصف للمنتج ده، هيتضاف قريب.'
                    : 'No description is available for this product yet.'
                }
              />
            </div>
          </div>
        }
        actions={commonActions}
      />
    </section>
  );
};

export default PlayfulStoryBuybox;
