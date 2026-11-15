import React from 'react';
import { Link } from 'react-router-dom';
import type { ProductInfoController } from '../productInfoTypes';
import StickyMobileCTA from '../components/StickyMobileCTA';
import ConfigurableTrustBadges from '../components/ConfigurableTrustBadges';
import VariantSelector from '../../../components/VariantSelector';
import QuantitySelector from '../../../components/QuantitySelector';
import Accordion from '../components/Accordion';
import ProductDescription from '../components/ProductDescription';
import Button from '../../../components/Button';
import {
  STOREFRONT_BUYBOX_ID,
  STOREFRONT_PRODUCT_DESCRIPTION_ID,
  formatStorefrontCurrency,
  isExternalHref,
} from '../productInfoHelpers';

export interface StandardBuyboxProps {
  ctrl: ProductInfoController;
}

export const StandardBuybox: React.FC<StandardBuyboxProps> = ({ ctrl }) => {
  const {
    product,
    variant,
    prefersArabicCopy,
    homePath,
    shopPath,
    breadcrumbHomeLabel,
    breadcrumbShopLabel,
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
    shippingTitle,
    shippingText,
    descriptionTitle,
    safeDescription,
    descriptionPreviewText,
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

  if (!product) return null;

  return (
    <section className="w-full bg-background py-4 px-1 selection:bg-primary selection:text-primary-foreground">
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="space-y-3">
          <nav className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Link to={homePath} className="transition-colors hover:text-foreground">
              {breadcrumbHomeLabel}
            </Link>
            <span>/</span>
            <Link to={shopPath} className="transition-colors hover:text-foreground">
              {breadcrumbShopLabel}
            </Link>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
              {product.category?.name || (prefersArabicCopy ? 'منتج مميز' : 'Featured')}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-black text-foreground tabular-nums">
              {displayPrice}
            </span>
            {originalPrice && (
              <div className="flex items-center gap-2">
                <span className="text-lg text-muted-foreground line-through decoration-muted-foreground/40 tabular-nums">
                  {originalPrice}
                </span>
                {discount && discount > 0 ? (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    {prefersArabicCopy ? `وفر ${discount}%` : `SAVE ${discount}%`}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Size Guide Note / Link */}
        {rawSizeGuideHref ? (
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-foreground">
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

        {/* Buy Actions & Variant Section with STOREFRONT_BUYBOX_ID */}
        <div id={STOREFRONT_BUYBOX_ID} className="space-y-4">
          {/* Variant Selector */}
          {product.productVariants && product.productVariants.length > 0 && (
            <div className="space-y-4">
              <VariantSelector
                variants={product.productVariants}
                selectedAttributes={selectedAttributes}
                onChange={setSelectedAttributes}
                variantSettings={variantSettings}
              />
            </div>
          )}

          {/* Actions */}
          {externalOnlyProduct ? (
            <div className="pt-2">{renderExternalPurchaseCta('card')}</div>
          ) : shouldRenderStandaloneBuyBox ? (
            <div className="space-y-3 pt-2">
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
        </div>

        {/* Description Accordion */}
        <div id={STOREFRONT_PRODUCT_DESCRIPTION_ID} className="space-y-3 pt-4 border-t border-border">
          <Accordion title={descriptionTitle} defaultOpen={true}>
            <ProductDescription
              safeDescription={safeDescription}
              emptyText={descriptionPreviewText}
            />
          </Accordion>

          <Accordion title={shippingTitle} defaultOpen={false}>
            <p className="text-sm leading-7 text-muted-foreground">{shippingText}</p>
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
      </div>

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
    </section>
  );
};
