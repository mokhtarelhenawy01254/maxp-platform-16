import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Flame,
  Heart,
  ArrowRightLeft,
  ShieldCheck,
  RotateCcw,
  Zap,
  Star,
} from 'lucide-react';
import type { ProductInfoController } from '../productInfoTypes';
import StickyMobileCTA from '../components/StickyMobileCTA';
import ConfigurableTrustBadges from '../components/ConfigurableTrustBadges';
import VariantSelector from '../../../components/VariantSelector';
import QuantitySelector from '../../../components/QuantitySelector';
import Accordion from '../components/Accordion';
import ProductDescription from '../components/ProductDescription';
import { ProductInfoShareRow } from '../ProductInfoShareActions';
import { useWishlistStore } from '../../../store/useWishlistStore';
import {
  STOREFRONT_BUYBOX_ID,
  STOREFRONT_PRODUCT_DESCRIPTION_ID,
  isExternalHref,
} from '../productInfoHelpers';

export interface MarketplaceBuyboxProps {
  ctrl: ProductInfoController;
}

export const MarketplaceBuybox: React.FC<MarketplaceBuyboxProps> = ({ ctrl }) => {
  const {
    product,
    prefersArabicCopy,
    displayPrice,
    originalPrice,
    discount,
    selectedAttributes,
    setSelectedAttributes,
    variantSettings,
    quantity,
    setQuantity,
    addToCartText,
    buyNowText,
    addToCartButtonClassName,
    buyNowButtonClassName,
    handleAddToCart,
    handleBuyNow,
    descriptionTitle,
    safeDescription,
    descriptionPreviewText,
    shortDescription: ctrlShortDescription,
    guaranteesTitle,
    guaranteesSubtitle,
    guaranteeItems,
    guaranteeStyle,
    isStickyAddToCartEnabled,
    showStickyCta,
    activePrice,
    currency,
    canOpenSizeGuide,
    sizeGuideText,
    rawSizeGuideHref,
    sizeGuideDialog,
    shippingPolicyDialog,
    questionDialog,
    externalOnlyProduct,
    showExternalAffiliateCta,
    renderExternalPurchaseCta,
    shouldRenderStandaloneBuyBox,
    mergedInlinePdpQuickOrder,
    inlineQuantityOffers,
    isPrimaryQuantityOffersDecision,
  } = ctrl;

  const [isCompared, setIsCompared] = useState(false);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const hasWishlistItem = useWishlistStore((state) => state.hasItem);

  if (!product) return null;

  const isWishlisted = hasWishlistItem(product.id);

  // Resolve section settings from controller or active theme PDP section
  const fallbackPdpSection = ctrl.theme?.pages?.pdp?.sections?.find(
    (s: any) => s.type === 'product-info' || s.variant === 'marketplace-bazaar',
  );
  const sectionSettings = (ctrl.settings || ctrl.sectionSettings || fallbackPdpSection?.settings || {}) as Record<string, any>;

  // 1. Delivery banner (above the title)
  const deliveryBanner = sectionSettings.deliveryBanner as
    | {
        enabled?: boolean;
        text?: string;
        subtext?: string;
        i18n?: { en?: { text?: string; subtext?: string } };
      }
    | undefined;

  const isDeliveryBannerEnabled = deliveryBanner?.enabled !== false;
  const deliveryBannerText =
    (!prefersArabicCopy && deliveryBanner?.i18n?.en?.text) ||
    deliveryBanner?.text ||
    (prefersArabicCopy ? 'توصيل سريع خلال 72 ساعة' : 'Fast delivery within 72 Hours');
  const deliveryBannerSubtext =
    (!prefersArabicCopy && deliveryBanner?.i18n?.en?.subtext) ||
    deliveryBanner?.subtext ||
    '';

  // 2. Sold-today indicator (flame icon + {n} {label})
  const rawSoldLast24h = (product as any)?.soldLast24h;
  const soldLast24h = typeof rawSoldLast24h === 'number' && rawSoldLast24h > 0 ? rawSoldLast24h : 0;
  const displaySoldCount = soldLast24h > 0
    ? soldLast24h
    : (product?.id ? ((product.id.charCodeAt(product.id.length - 1) % 12) + 4) : 6);

  // 3. Short description
  const cleanPreview = safeDescription
    ? safeDescription.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 260)
    : '';
  const isGenericPreviewPlaceholder =
    !descriptionPreviewText ||
    descriptionPreviewText.includes('لا يوجد وصف') ||
    descriptionPreviewText.includes('No product description');

  const shortDesc =
    (product as any)?.shortDescription ||
    ctrlShortDescription ||
    (!isGenericPreviewPlaceholder ? descriptionPreviewText : '') ||
    (cleanPreview && cleanPreview.length > 20 && !cleanPreview.includes('لا يوجد وصف') ? cleanPreview : (
      prefersArabicCopy
        ? (product.name
            ? `${product.name} — تصميم عملي عالي الجودة يلبي احتياجاتك اليومية بأعلى معايير الكفاءة والمتانة.`
            : 'منتج متميز وعالي الجودة يلبي احتياجاتك اليومية بأعلى معايير الكفاءة والمتانة.')
        : (product.name
            ? `Discover the exceptional quality and sleek design of ${product.name}. Built for everyday reliability and top performance.`
            : 'Exceptional quality product built for everyday reliability and top performance.')
    ));

  // 4. Shipping methods & guarantees for the shipping rail
  const rawShippingMethods = Array.isArray(sectionSettings.shippingMethods) && sectionSettings.shippingMethods.length > 0
    ? sectionSettings.shippingMethods
    : [
        {
          label: prefersArabicCopy ? 'توصيل عادي' : 'Standard Delivery',
          meta: prefersArabicCopy ? '2-3 أيام | من 65 ج.م' : '2-3 Days | From 65 EGP',
          note: prefersArabicCopy ? 'مندوبنا هيوصل الطلب لحد العنوان المحدد' : 'Delivered directly to your door',
        },
        {
          label: prefersArabicCopy ? 'توصيل إكسبريس (DHL)' : 'Express Delivery (DHL)',
          meta: prefersArabicCopy ? '1-3 أيام | من 80 ج.م' : '1-3 Days | From 80 EGP',
          note: prefersArabicCopy ? 'شحن سريع مؤمن لباب البيت' : 'Fast, insured express shipping',
        },
      ];
  const shippingMethods = rawShippingMethods;

  const rawShippingWarranty =
    (!prefersArabicCopy && sectionSettings.i18n?.en?.shippingWarranty) ||
    sectionSettings.shippingWarranty ||
    (!prefersArabicCopy ? '1 year product warranty' : 'ضمان سنة على المنتج');
  const shippingWarranty = typeof rawShippingWarranty === 'string' ? rawShippingWarranty : '';

  const rawShippingReturns =
    (!prefersArabicCopy && sectionSettings.i18n?.en?.shippingReturns) ||
    sectionSettings.shippingReturns ||
    (!prefersArabicCopy ? 'Free returns within 30 days' : 'إرجاع مجاني خلال 30 يوم');
  const shippingReturns = typeof rawShippingReturns === 'string' ? rawShippingReturns : '';

  const shippingRailTitle = prefersArabicCopy ? 'الشحن والتوصيل' : 'Shipping & Delivery';
  const moreDetailsLabel = prefersArabicCopy ? 'تفاصيل أكثر' : 'More details';

  return (
    <div className="lg:contents flex flex-col gap-[30px]">
      {/* ========================================================
          COLUMN 2: Information Column (Exact WoodMart sequence)
          Order: Delivery Banner -> Title -> Price (red) -> Short Desc -> Sold Counter -> Buy Actions -> Compare/Wishlist/Share
         ======================================================== */}
      <section className="min-w-0 w-full space-y-5 selection:bg-primary selection:text-primary-foreground">
        {/* 1. Delivery Banner (WoodMart amber pill) */}
        {isDeliveryBannerEnabled ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f97316] to-[#f59e0b] px-4 py-1.5 text-white shadow-sm font-bold max-w-fit">
            <Truck className="h-4 w-4 shrink-0 text-white" />
            <span className="text-xs sm:text-sm">
              {deliveryBannerText}
            </span>
            {deliveryBannerSubtext ? (
              <span className="text-xs opacity-90 hidden sm:inline font-normal">
                • {deliveryBannerSubtext}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 2. Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-[2.15rem] font-black text-foreground tracking-tight leading-snug">
          {product.name}
        </h1>

        {/* 3. Price: Strikethrough original price + sale price in bold RED */}
        <div className="flex flex-wrap items-baseline gap-3">
          {originalPrice && (
            <del className="text-lg sm:text-xl text-muted-foreground line-through decoration-muted-foreground/50 tabular-nums">
              {originalPrice}
            </del>
          )}
          <span className="text-3xl sm:text-4xl font-black text-[#eb485b] dark:text-[#f87171] tabular-nums">
            {displayPrice}
          </span>
          {discount && discount > 0 ? (
            <span className="rounded-full bg-[#eb485b] px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
              {prefersArabicCopy ? `وفر ${discount}%` : `SAVE ${discount}%`}
            </span>
          ) : null}
        </div>

        {/* Reviews / Star Rating (WoodMart exact placement below price) */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-muted-foreground font-medium">
            ({(product as any)?.ratingCount || (product as any)?.ratingsCount || 2} {prefersArabicCopy ? 'تقييمات العملاء' : 'customer reviews'})
          </span>
        </div>

        {/* 4. Short Description */}
        {shortDesc ? (
          <div className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {shortDesc}
          </div>
        ) : null}

        {/* 5. Sold-today counter (flame icon + text) */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
          <Flame className="h-4 w-4 shrink-0 text-rose-500 animate-pulse" />
          <span>
            {prefersArabicCopy
              ? `${displaySoldCount} قطع بيعت في آخر 24 ساعة`
              : `${displaySoldCount} items sold in last day`}
          </span>
        </div>

        {/* Size Guide Note / Link */}
        {rawSizeGuideHref ? (
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs sm:text-sm font-bold text-foreground">
                {prefersArabicCopy ? 'دليل المقاسات السريع' : 'Size guide'}
              </span>
              {isExternalHref(rawSizeGuideHref) ? (
                <a
                  href={rawSizeGuideHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  {sizeGuideText || (prefersArabicCopy ? 'فتح الدليل' : 'Open guide')}
                </a>
              ) : (
                <Link
                  to={rawSizeGuideHref}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  {sizeGuideText || (prefersArabicCopy ? 'فتح الدليل' : 'Open guide')}
                </Link>
              )}
            </div>
          </div>
        ) : null}

        {/* Inline Quantity Offers (Bundle / Tier Deals) */}
        {inlineQuantityOffers ? (
          <div className="pt-2 space-y-2">
            {inlineQuantityOffers}
          </div>
        ) : null}

        {/* Variant Selector */}
        {!isPrimaryQuantityOffersDecision && product.productVariants && product.productVariants.length > 0 && (
          <div id={STOREFRONT_BUYBOX_ID} className="space-y-4 pt-1">
            <VariantSelector
              variants={product.productVariants}
              selectedAttributes={selectedAttributes}
              onChange={setSelectedAttributes}
              variantSettings={variantSettings}
            />
          </div>
        )}

        {/* 6. Quantity Stepper + Add to Cart + Buy Now Buttons (WoodMart layout) */}
        {externalOnlyProduct ? (
          <div className="pt-2">{renderExternalPurchaseCta('card')}</div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                className="rounded-full h-12 bg-card border border-border shrink-0"
              />
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={ctrl.isStrictlyOutOfStock}
                  className="flex-1 w-full !bg-[#eb485b] hover:!bg-[#d93a4d] disabled:opacity-50 !text-white font-bold rounded-full py-3.5 px-6 shadow-sm transition-all text-sm flex items-center justify-center gap-2 cursor-pointer border-0"
                >
                  {addToCartText}
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={ctrl.isStrictlyOutOfStock}
                  className="flex-1 w-full !bg-[#fdeef0] hover:!bg-[#fbdde1] disabled:opacity-50 !text-[#eb485b] font-bold rounded-full py-3.5 px-6 border border-[#fbdde1] transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {buyNowText}
                </button>
              </div>
            </div>
            {showExternalAffiliateCta ? renderExternalPurchaseCta('block') : null}
          </div>
        )}

        {/* Merged Inline PDP Quick Order Checkout */}
        {mergedInlinePdpQuickOrder ? (
          <div className="pt-3">
            {mergedInlinePdpQuickOrder}
          </div>
        ) : null}

        {/* 7. Divider */}
        <hr className="border-border/60 my-2" />

        {/* 8. Compare / Wishlist / Share Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-4">
            {/* Compare */}
            <button
              type="button"
              onClick={() => setIsCompared((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
              aria-label={prefersArabicCopy ? 'مقارنة' : 'Compare'}
            >
              <ArrowRightLeft
                className={`h-4 w-4 transition-colors ${
                  isCompared ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
              <span>
                {isCompared
                  ? prefersArabicCopy ? 'تمت الإضافة' : 'Added'
                  : prefersArabicCopy ? 'قارن' : 'Compare'}
              </span>
            </button>

            {/* Wishlist */}
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
              aria-label={prefersArabicCopy ? 'المفضلة' : 'Wishlist'}
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  isWishlisted
                    ? 'fill-rose-500 text-rose-500'
                    : 'text-muted-foreground'
                }`}
              />
              <span>
                {isWishlisted
                  ? prefersArabicCopy ? 'في المفضلة' : 'Saved'
                  : prefersArabicCopy ? 'إضافة للمفضلة' : 'Add to wishlist'}
              </span>
            </button>
          </div>

          {/* Share */}
          <ProductInfoShareRow
            productName={product.name}
            prefersArabicCopy={prefersArabicCopy}
            className="inline-flex items-center gap-2"
          />
        </div>

        {/* Description Accordion */}
        <div id={STOREFRONT_PRODUCT_DESCRIPTION_ID} className="pt-3 border-t border-border">
          <Accordion title={descriptionTitle} defaultOpen={false}>
            <ProductDescription
              safeDescription={safeDescription}
              emptyText={descriptionPreviewText}
            />
          </Accordion>
        </div>

        {/* Trust Badges */}
        <div className="pt-2">
          <ConfigurableTrustBadges
            title={guaranteesTitle}
            subtitle={guaranteesSubtitle}
            items={guaranteeItems.length ? guaranteeItems : undefined}
            variant={guaranteeStyle}
          />
        </div>
      </section>

      {/* ========================================================
          COLUMN 3: Shipping Rail (WoodMart 3rd column)
          Header "Shipping & Delivery" -> Courier Rows -> Warranty/Returns
         ======================================================== */}
      <aside className="min-w-0 w-full space-y-5">
        <div className="rounded-[20px] border border-border/80 bg-card/60 p-6 space-y-5 shadow-sm">
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            {shippingRailTitle}
          </h2>

          {shippingMethods && shippingMethods.length > 0 ? (
            <div className="space-y-4">
              {shippingMethods.map((method: any, idx: number) => {
                const label =
                  (!prefersArabicCopy && method.i18n?.en?.label) || method.label;
                const meta =
                  (!prefersArabicCopy && method.i18n?.en?.meta) || method.meta;
                const note =
                  (!prefersArabicCopy && method.i18n?.en?.note) || method.note;
                const isExpress = idx > 0 || String(label).toLowerCase().includes('express') || String(label).includes('إكسبريس') || String(label).includes('DHL');
                return (
                  <div key={idx} className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {isExpress ? (
                        <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                          <Zap className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                          <Truck className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-[13px]">{label}</p>
                        {note ? (
                          <p className="text-muted-foreground text-[11px] mt-0.5 leading-snug">{note}</p>
                        ) : null}
                      </div>
                    </div>
                    {meta ? (
                      <div className="text-end shrink-0">
                        <span className="font-bold text-foreground text-[12px] whitespace-nowrap">{meta}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <hr className="border-border/60 my-3" />

              {/* Warranty Row */}
              {shippingWarranty ? (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-foreground text-[12px]">{shippingWarranty}</span>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground hover:underline cursor-pointer">
                    {moreDetailsLabel}
                  </span>
                </div>
              ) : null}

              {/* Free Returns Row */}
              {shippingReturns ? (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-foreground text-[12px]">{shippingReturns}</span>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground hover:underline cursor-pointer">
                    {moreDetailsLabel}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3 text-xs text-muted-foreground">
              <p className="leading-relaxed">{ctrl.shippingText}</p>
              {shippingWarranty ? (
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{shippingWarranty}</span>
                </div>
              ) : null}
              {shippingReturns ? (
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <RotateCcw className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>{shippingReturns}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </aside>

      {/* Sticky Mobile CTA & Dialogs */}
      {isStickyAddToCartEnabled && (
        <StickyMobileCTA
          activePrice={activePrice}
          currency={currency}
          onAddToCart={handleAddToCart}
          isVisible={showStickyCta}
          label={prefersArabicCopy ? 'اشتر الآن' : 'Buy Now'}
        />
      )}

      {canOpenSizeGuide ? sizeGuideDialog : null}
      {shippingPolicyDialog}
      {questionDialog}
    </div>
  );
};
