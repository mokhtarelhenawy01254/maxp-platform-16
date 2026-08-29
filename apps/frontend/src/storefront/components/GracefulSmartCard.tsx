import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { buildStorefrontPath } from '../utils/paths';
import { getProductImageCandidates } from '../utils/productImages';
import { getProductVolumeDiscounts } from '../utils/volumeDiscounts';
import { useStorefrontFacebookTracking } from '../hooks/useStorefrontFacebookTracking';
import { formatStorefrontCurrency } from '../utils/currency';
import type { Product } from '../hooks/useProducts';
import QuickViewModal from './QuickViewModal';
import StorefrontProductImage from './StorefrontProductImage';

interface GracefulSmartCardProps {
  product: Product;
  index?: number;
  quickViewLabel?: string;
  addToWishlistLabel?: string;
  showVendor?: boolean;
}

const isRtlLabel = (themeDirection?: string) => themeDirection === 'rtl';

/**
 * GracefulSmartCard — Texture-style catalog card:
 * media with a right-side thumbnail rail, hover-revealed quick actions,
 * and a soft grey footer plate holding the title + price (range or compare).
 */
const GracefulSmartCard: React.FC<GracefulSmartCardProps> = ({
  product,
  index = 0,
  quickViewLabel,
  addToWishlistLabel,
}) => {
  const { theme } = useStorefrontTheme();
  const { settings } = useStorefrontSettings();
  const { addItem } = useCartStore();
  const { toggleItem, hasItem } = useWishlistStore();
  const { trackAddToCartEvent } = useStorefrontFacebookTracking();
  const navigate = useNavigate();
  const location = useLocation();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const { id, name, price, slug } = product;
  const currency =
    settings?.storefront?.settings?.currency ||
    settings?.company?.currency ||
    'EGP';
  const rtl = isRtlLabel(theme?.direction);

  const variantOptions = product.productVariants || product.variants || [];

  // Images (main + gallery)
  const imageCandidates = getProductImageCandidates(product);
  const images = useMemo(
    () => Array.from(new Set(imageCandidates.filter(Boolean))),
    [imageCandidates],
  );

  const currentImage = images[Math.min(activeImage, images.length - 1)] || '';
  const isWishlisted = hasItem(id);
  const hasVariantChoices = variantOptions.length > 0;

  // Price — show a min–max range like the Texture original when variants differ
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  const variantPrices = variantOptions
    .map((v) => (typeof v?.price === 'number' ? v.price : parseFloat(String(v?.price ?? ''))))
    .filter((value) => Number.isFinite(value) && value > 0) as number[];
  const pricePool = variantPrices.length > 0 ? variantPrices : [numericPrice];
  const minPrice = Math.min(...pricePool);
  const maxPrice = Math.max(...pricePool);
  const showPriceRange = pricePool.length > 1 && maxPrice > minPrice;
  const formattedPrice = formatStorefrontCurrency(numericPrice, currency);
  const formattedRange = `${formatStorefrontCurrency(minPrice, currency)} - ${formatStorefrontCurrency(maxPrice, currency)}`;
  const numericComparePrice =
    typeof product.comparePrice === 'string' ? parseFloat(product.comparePrice) : product.comparePrice;
  const hasDiscount =
    typeof numericComparePrice === 'number' &&
    Number.isFinite(numericComparePrice) &&
    numericComparePrice > numericPrice;
  const formattedComparePrice =
    hasDiscount && typeof numericComparePrice === 'number'
      ? formatStorefrontCurrency(numericComparePrice, currency)
      : null;
  const discountPercentage =
    hasDiscount && typeof numericComparePrice === 'number'
      ? Math.round(((numericComparePrice - numericPrice) / numericComparePrice) * 100)
      : null;

  const productPath = buildStorefrontPath(
    location.pathname,
    `/product/${slug || id}`,
    location.search,
  );

  const openProduct = () => navigate(productPath);

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariantChoices) {
      openProduct();
      return;
    }
    addItem({
      productId: id,
      name,
      price: numericPrice,
      basePrice: numericPrice,
      comparePrice: numericComparePrice,
      quantity: 1,
      imageUrl: currentImage,
      volumeDiscounts: getProductVolumeDiscounts(product),
    });
    trackAddToCartEvent({ id, name, price: numericPrice, quantity: 1, category: product.category?.name });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(id);
  };

  const quickLabel = quickViewLabel || (rtl ? 'نظرة سريعة' : 'Quick view');
  const wishLabel = addToWishlistLabel || (rtl ? 'أضف للمفضلة' : 'Add to wishlist');
  const addLabel = hasVariantChoices
    ? rtl
      ? 'اختر الخيارات'
      : 'Choose options'
    : rtl
      ? 'أضف للسلة'
      : 'Add to cart';

  return (
    <div className="group relative flex h-full flex-col">
      <style>{`
        .sfg-thumb { transition: transform .3s, box-shadow .3s; }
        .sfg-thumb:hover, .sfg-thumb.active { box-shadow: 0 0 0 2px #171717; }
        .sfg-quick { opacity: 0; transform: translateY(-4px); transition: opacity .3s ease, transform .3s ease; }
        .sfg-card:hover .sfg-quick, .sfg-quick:focus-within { opacity: 1; transform: translateY(0); }
        @media (hover: none) { .sfg-quick { opacity: 1; transform: none; } }
      `}</style>

      {/* Media area */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-[#f5f5f5]">
        <a
          href={productPath}
          onClick={(e) => {
            e.preventDefault();
            openProduct();
          }}
          aria-label={name}
          className="absolute inset-0 z-[1]"
        >
          <StorefrontProductImage
            candidates={currentImage ? [currentImage] : imageCandidates}
            alt={name}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchpriority={index === 0 ? 'high' : undefined}
            width="440"
            height="550"
            className="h-full w-full object-cover"
            fallback={<div className="h-full w-full bg-[#eee]" />}
          />
        </a>

        {/* Discount badge */}
        {discountPercentage ? (
          <span className="absolute left-3 top-3 z-[2] rounded-[4px] bg-[#e33629] px-2 py-1 text-[11px] font-bold text-white">
            {discountPercentage}% OFF
          </span>
        ) : null}

        {/* Right-side thumbnail rail */}
        {images.length > 1 ? (
          <div className="absolute right-2 top-2 z-[2] flex flex-col gap-1.5">
            {images.slice(0, 3).map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveImage(idx);
                }}
                aria-label={`Image ${idx + 1}`}
                className={`sfg-thumb h-11 w-11 overflow-hidden rounded-[8px] border border-white/70 bg-white/90 p-[2px] ${
                  activeImage === idx ? 'active' : 'opacity-85'
                }`}
              >
                <img src={img} alt="" loading="lazy" className="h-full w-full rounded-[6px] object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        {/* Quick actions — hover-revealed, bottom right */}
        <div className="sfg-quick absolute bottom-3 right-3 z-[2] flex flex-col gap-2">
          <button
            type="button"
            onClick={handleQuickView}
            aria-label={quickLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#171717] shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition-transform hover:scale-110"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={addLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171717] text-white transition-transform hover:scale-110"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={wishLabel}
            className={`flex h-9 w-9 items-center justify-center rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition-transform hover:scale-110 ${
              isWishlisted ? 'bg-[#e16244] text-white' : 'bg-white text-[#171717]'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20s-7-4.5-9.5-9C.8 7.3 2.7 4 6 4c2 0 3.5 1 4 2.5C10.5 5 12 4 14 4c3.3 0 5.2 3.3 3.5 7-2.5 4.5-9.5 9-9.5 9z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grey footer plate — title + price, like the Texture catalog card */}
      <div className="mt-2 rounded-[10px] bg-[#f6f6f6] px-4 py-4">
        <a
          href={productPath}
          onClick={(e) => {
            e.preventDefault();
            openProduct();
          }}
          className="line-clamp-2 text-[15px] font-medium leading-6 text-[#2f2f2f] transition-colors hover:text-[#e16244]"
        >
          {name}
        </a>
        <div dir="ltr" className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[15px] font-semibold text-[#2f2f2f]">
            {showPriceRange ? formattedRange : formattedPrice}
          </span>
          {formattedComparePrice ? (
            <span className="text-xs text-[#9a9a9a] line-through">{formattedComparePrice}</span>
          ) : null}
        </div>
      </div>

      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        currency={currency}
      />
    </div>
  );
};

export default GracefulSmartCard;
