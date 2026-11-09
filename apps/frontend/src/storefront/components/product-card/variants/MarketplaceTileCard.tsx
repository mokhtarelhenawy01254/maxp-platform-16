import React from 'react';
import { Eye, Heart, ShoppingCart } from 'lucide-react';
import StorefrontProductImage from '../../StorefrontProductImage';
import { ProductCardController } from '../productCardTypes';

/**
 * Marketplace tile card: the vertical product card the department-store demo uses inside every
 * grid (5-up tabbed grid, 6-up recommended grid). Image occupies roughly the top half like the
 * source (149x170 inside a 178x310 card), title 15px, stars, red price line, hover action bar.
 */
export const MarketplaceTileCard: React.FC<{ ctrl: ProductCardController }> = ({ ctrl }) => {
  const {
    CardShell,
    name,
    imageCandidates,
    renderImageFallback,
    formattedPrice,
    formattedComparePrice,
    discountPercentage,
    hasVariantChoices,
    handleAddToCart,
    handleQuickView,
    handleWishlist,
    isWishlisted,
    finalWishlistLabel,
    detailLabel,
    actionLabel,
    features,
    product,
  } = ctrl;

  const ratingValue = Number((product as unknown as Record<string, unknown>)?.['rating']);
  const rating = Number.isFinite(ratingValue) && ratingValue > 0 ? Math.min(5, ratingValue) : 0;

  return (
    <CardShell className="group flex h-full flex-col bg-white p-3 transition-shadow hover:shadow-[0_18px_40px_-30px_rgba(51,51,51,0.35)]">
      <div className="relative mb-3 overflow-hidden rounded-[20px] bg-white">
        <div className="aspect-[149/170] w-full">
          <StorefrontProductImage
            candidates={imageCandidates}
            alt={name}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            fallback={renderImageFallback()}
          />
        </div>

        {discountPercentage ? (
          <span className="absolute start-2 top-2 rounded-full bg-[#e14a5c] px-2 py-[2px] text-[10px] font-bold text-white">
            -{discountPercentage}%
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={actionLabel}
            title={actionLabel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#333333] text-white hover:bg-[#ad7d61]"
          >
            <ShoppingCart size={14} />
          </button>
          <button
            type="button"
            onClick={handleQuickView}
            aria-label={detailLabel}
            title={detailLabel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#333333] shadow-sm hover:bg-[#ad7d61] hover:text-white"
          >
            <Eye size={14} />
          </button>
          {features?.wishlistEnabled ? (
            <button
              type="button"
              onClick={handleWishlist}
              aria-label={finalWishlistLabel}
              title={finalWishlistLabel}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm hover:bg-[#ad7d61] hover:text-white ${
                isWishlisted ? 'text-[#e14a5c]' : 'text-[#333333]'
              }`}
            >
              <Heart size={14} className={isWishlisted ? 'fill-current' : ''} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col text-start">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.5] text-[#333333] transition-colors group-hover:text-[#ad7d61]">
          {name}
        </h3>
        {rating > 0 ? (
          <div className="mt-1 flex items-center gap-[1px]">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={`text-[11px] leading-none ${index < Math.round(rating) ? 'text-[#ad7d61]' : 'text-[#dcdcdc]'}`}
              >
                ★
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-auto pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {formattedComparePrice ? (
              <span className="text-[13px] font-medium text-[#a3a3a3] line-through">{formattedComparePrice}</span>
            ) : null}
            <span className="text-[15px] font-semibold text-[#e14a5c]">{formattedPrice}</span>
          </div>
          {hasVariantChoices ? (
            <p className="mt-1 text-[11px] font-semibold text-[#8a8a8a]">خيارات متعددة</p>
          ) : null}
        </div>
      </div>
    </CardShell>
  );
};
