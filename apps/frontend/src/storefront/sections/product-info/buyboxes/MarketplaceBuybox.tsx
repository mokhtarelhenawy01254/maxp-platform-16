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
} from 'lucide-react';
import type { ProductInfoController } from '../productInfoTypes';
import StickyMobileCTA from '../components/StickyMobileCTA';
import ConfigurableTrustBadges from '../components/ConfigurableTrustBadges';
import VariantSelector from '../../../components/VariantSelector';
import QuantitySelector from '../../../components/QuantitySelector';
import Accordion from '../components/Accordion';
import ProductDescription from '../components/ProductDescription';
import Button from '../../../components/Button';
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

  const isDeliveryBannerEnabled = Boolean(deliveryBanner?.enabled);
  const deliveryBannerText =
    !prefersArabicCopy && deliveryBanner?.i18n?.en?.text
      ? deliveryBanner.i18n.en.text
      : deliveryBanner?.text || '';
  const deliveryBannerSubtext =
    !prefersArabicCopy && deliveryBanner?.i18n?.en?.subtext
      ? deliveryBanner.i18n.en.subtext
      : deliveryBanner?.subtext || '';

  // 2. Sold-today indicator (flame icon + {n} {label}). Never invent a number.
  const rawSoldLast24h = (product as any)?.soldLast24h;
  const soldLast24h = typeof rawSoldLast24h === 'number' && rawSoldLast24h > 0 ? rawSoldLast24h : 0;

  // 3. Short description
  const shortDesc =
    (product as any)?.shortDescription ||
    ctrlShortDescription ||
    descriptionPreviewText ||
    '';

  // 4. Shipping methods & guarantees for the shipping rail
  const shippingMethods = Array.isArray(sectionSettings.shippingMethods)
    ? sectionSettings.shippingMethods
    : null;

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
        {/* 1. Delivery Banner (Orange/Amber box, truck icon, bold text) */}
        {isDeliveryBannerEnabled && (deliveryBannerText || deliveryBannerSubtext) ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-[#e1c33d] px-4 py-2.5 text-white shadow-sm">
            <Truck className="h-5 w-5 shrink-0 text-white" />
            <div className="min-w-0 text-xs sm:text-sm">
              {deliveryBannerText ? (
                <span className="font-bold">{deliveryBannerText}</span>
              ) : null}
              {deliveryBannerSubtext ? (
                <span className="opacity-90 block sm:inline sm:ms-2">
                  {deliveryBannerSubtext}
                </span>
              ) : null}
            </div>
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
          <span className="text-3xl sm:text-4xl font-black text-red-600 dark:text-red-500 tabular-nums">
            {displayPrice}
          </span>
          {discount && discount > 0 ? (
            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
              {prefersArabicCopy ? `وفر ${discount}%` : `SAVE ${discount}%`}
            </span>
          ) : null}
        </div>

        {/* 4. Short Description */}
        {shortDesc ? (
          <div className="text-sm leading-relaxed text-muted-foreground line-clamp-4">
            {shortDesc}
          </div>
        ) : null}

        {/* 5. Sold-today counter (flame icon + text). Renders NOTHING if 0 or missing. */}
        {soldLast24h > 0 ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
            <Flame className="h-4 w-4 shrink-0 text-rose-500 animate-pulse" />
            <span>
              {prefersArabicCopy
                ? `${soldLast24h} قطعة انباعت في آخر 24 ساعة`
                : `${soldLast24h} items sold in last day`}
            </span>
          </div>
        ) : null}

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

        {/* Variant Selector */}
        {product.productVariants && product.productVariants.length > 0 && (
          <div id={STOREFRONT_BUYBOX_ID} className="space-y-4 pt-1">
            <VariantSelector
              variants={product.productVariants}
              selectedAttributes={selectedAttributes}
              onChange={setSelectedAttributes}
              variantSettings={variantSettings}
            />
          </div>
        )}

        {/* 6. Quantity Stepper + Add to Cart + Buy Now Buttons */}
        {externalOnlyProduct ? (
          <div className="pt-2">{renderExternalPurchaseCta('card')}</div>
        ) : shouldRenderStandaloneBuyBox ? (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <QuantitySelector value={quantity} onChange={setQuantity} />
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  size="lg"
                  className={addToCartButtonClassName}
                  onClick={handleAddToCart}
                >
                  {addToCartText}
                </Button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className={buyNowButtonClassName}
                >
                  {buyNowText}
                </button>
              </div>
            </div>
            {showExternalAffiliateCta ? renderExternalPurchaseCta('block') : null}
          </div>
        ) : showExternalAffiliateCta ? (
          renderExternalPurchaseCta('block')
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
          <Accordion title={descriptionTitle} defaultOpen={true}>
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
          Header "Shipping & Delivery" -> Courier Rows -> Warranty/Returns -> Promo Cover Block
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
                const isExpress = idx > 0 || String(label).toLowerCase().includes('express');
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

        {/* Promo Cover Box (WoodMart Black Friday / Special Deals Banner) */}
        <div className="rounded-[20px] p-6 text-white bg-gradient-to-br from-[#1c1d21] via-[#24252a] to-[#17181c] border border-white/10 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[170px]">
          <div className="absolute -end-8 -top-8 h-28 w-28 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
              {prefersArabicCopy ? 'عروض حصرية' : 'Unbeatable offers'}
            </span>
            <h3 className="text-xl font-black text-white leading-tight">
              {prefersArabicCopy ? 'خصومات مميزة لفترة محدودة!' : 'Special Deals & Discounts!'}
            </h3>
          </div>
          <div className="relative z-10 pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer">
              {prefersArabicCopy ? 'تسوق العروض الآن ←' : 'Shop the deals now →'}
            </span>
          </div>
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
