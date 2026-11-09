import React from 'react';
import { Eye, Heart, ShoppingCart } from 'lucide-react';
import StorefrontProductImage from '../../StorefrontProductImage';
import { ProductCardController } from '../productCardTypes';

/**
 * Marketplace row card: the compact horizontal tile the department-store demo uses in every rail
 * and grid (74px image, two-line title, red price line, hover action stack).
 */
export const MarketplaceRowCard: React.FC<{ ctrl: ProductCardController }> = ({ ctrl }) => {
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
    <CardShell className="group flex items-center gap-3 bg-white p-2 transition-colors hover:bg-[#fafafa]">
      <div className="relative h-[74px] w-[74px] shrink-0 overflow-hidden bg-white">
        <StorefrontProductImage
          candidates={imageCandidates}
          alt={name}
          loading="lazy"
          className="h-full w-full object-contain p-[3px] transition-transform duration-500 group-hover:scale-105"
          fallback={renderImageFallback()}
        />
        {discountPercentage ? (
          <span className="absolute inset-x-0 top-0 bg-[#e14a5c] py-[1px] text-center text-[9px] font-bold text-white">
            -{discountPercentage}%
          </span>
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center gap-1 bg-white/85 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={actionLabel}
            title={actionLabel}
            className="inline-flex h-7 w-7 items-center justify-center bg-[#333333] text-white hover:bg-[#ad7d61]"
          >
            <ShoppingCart size={13} />
          </button>
          <button
            type="button"
            onClick={handleQuickView}
            aria-label={detailLabel}
            title={detailLabel}
            className="inline-flex h-7 w-7 items-center justify-center bg-white text-[#333333] hover:bg-[#ad7d61] hover:text-white"
          >
            <Eye size={13} />
          </button>
          {features?.wishlistEnabled ? (
            <button
              type="button"
              onClick={handleWishlist}
              aria-label={finalWishlistLabel}
              title={finalWishlistLabel}
              className={`inline-flex h-7 w-7 items-center justify-center bg-white hover:bg-[#ad7d61] hover:text-white ${
                isWishlisted ? 'text-[#e14a5c]' : 'text-[#333333]'
              }`}
            >
              <Heart size={13} className={isWishlisted ? 'fill-current' : ''} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 flex-1 text-start">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.5] text-[#333333] transition-colors group-hover:text-[#ad7d61] md:text-[15px]">
          {name}
        </h3>
        {rating > 0 ? (
          <div className="mt-[2px] flex items-center gap-[1px]">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={`text-[10px] leading-none ${index < Math.round(rating) ? 'text-[#ad7d61]' : 'text-[#dcdcdc]'}`}
              >
                ★
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {formattedComparePrice ? (
            <span className="text-[12px] font-medium text-[#a3a3a3] line-through">{formattedComparePrice}</span>
          ) : null}
          <span className="text-[13px] font-semibold text-[#e14a5c] md:text-[15px]">{formattedPrice}</span>
          {hasVariantChoices ? (
            <span className="text-[10px] font-semibold text-[#8a8a8a]">خيارات متعددة</span>
          ) : null}
        </div>
      </div>
    </CardShell>
  );
};
