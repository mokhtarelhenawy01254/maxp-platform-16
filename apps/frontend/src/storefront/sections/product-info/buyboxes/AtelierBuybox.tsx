import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, Truck, RefreshCw, Eye, Sparkles } from 'lucide-react';
import type { Product } from '../../../hooks/useProducts';
import type { StorefrontTheme } from '../../../types/theme.types';
import { formatStorefrontCurrency } from '../../../utils/currency';
import VariantSelector from '../../components/VariantSelector';
import QuantitySelector from '../../components/QuantitySelector';
import Button from '../../components/Button';
import StorefrontProductImage from '../../components/StorefrontProductImage';
import { getProductImageCandidates } from '../../../utils/productImages';
import { buildStorefrontPath } from '../../../utils/paths';

export interface AtelierBuyboxProps {
  product: Product;
  theme: StorefrontTheme;
  variant: string;
  activePrice: number;
  activeComparePrice: number | null;
  activeStock: number | null;
  stockStatusLabel: string;
  selectedVariant: any;
  selectedAttributes: Record<string, string>;
  quantity: number;
  setQuantity: (val: number | ((prev: number) => number)) => void;
  isAddingToCart: boolean;
  handleAddToCart: () => Promise<void>;
  handleBuyNow: () => Promise<void>;
  prefersArabicCopy: boolean;
  currency: string;
  activeDiscount: number | null;
  specs: Array<{ label: string; value: string }>;
  onSelectVariantAttribute: (name: string, value: string) => void;
  shortDescription?: string;
  descriptionPreviewText?: string;
  activeImage?: string;
  productImages?: string[];
  location?: any;
  settings?: any;
  onOpenSizeGuide?: () => void;
  onOpenShipping?: () => void;
  onOpenQuestion?: () => void;
}

export const AtelierBuybox: React.FC<AtelierBuyboxProps> = (props) => {
  const {
    product,
    theme,
    variant,
    activePrice,
    activeComparePrice,
    activeStock,
    stockStatusLabel,
    selectedVariant,
    selectedAttributes,
    quantity,
    setQuantity,
    isAddingToCart,
    handleAddToCart,
    handleBuyNow,
    prefersArabicCopy,
    currency,
    activeDiscount,
    specs,
    onSelectVariantAttribute,
    shortDescription,
    descriptionPreviewText,
    activeImage,
    productImages,
    location,
    settings,
    onOpenSizeGuide,
    onOpenShipping,
    onOpenQuestion,
  } = props;
    const boutiqueRating =
      typeof product.rating === 'number'
        ? product.rating
        : typeof product.reviewSummary?.averageRating === 'number'
          ? product.reviewSummary.averageRating
          : typeof product.reviewAverage === 'number'
            ? product.reviewAverage
            : null;
    const boutiqueReviewCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : typeof product.reviewsCount === 'number'
          ? product.reviewsCount
          : typeof product.ratingCount === 'number'
            ? product.ratingCount
            : typeof product.reviewSummary?.totalReviews === 'number'
              ? product.reviewSummary.totalReviews
              : 0;
    const boutiqueBadge =
      typeof product['editorialBadge'] === 'string' && product['editorialBadge'].trim()
        ? String(product['editorialBadge']).trim()
        : prefersArabicCopy
          ? 'تحرير روزا'
          : 'Roza editorial';
    const boutiqueCategoryLabel =
      typeof product.category?.name === 'string' && product.category.name.trim()
        ? product.category.name.trim()
        : typeof product.categoryId === 'string' && product.categoryId.trim()
          ? product.categoryId.trim()
          : prefersArabicCopy
            ? 'اختيار هادئ'
            : 'Editorial selection';
    const boutiqueNote =
      typeof product['editorialNote'] === 'string' && product['editorialNote'].trim()
        ? String(product['editorialNote']).trim()
        : shortDescription || descriptionPreviewText;
    const boutiqueFitNote =
      typeof product['fitNote'] === 'string' && product['fitNote'].trim()
        ? String(product['fitNote']).trim()
        : prefersArabicCopy
          ? 'قصة مريحة وواضحة في الصور واللبس.'
          : 'A calmer fit that stays clear in both imagery and wear.';
    const boutiqueStylingNote =
      typeof product['stylingNote'] === 'string' && product['stylingNote'].trim()
        ? String(product['stylingNote']).trim()
        : prefersArabicCopy
          ? 'اختاري معه قطعة أو اثنتين فقط حتى يبقى الجو العام نظيفًا وهادئًا.'
          : 'Keep styling to one or two soft add-ons so the overall look stays clean.';
    const boutiqueCareNote =
      typeof product['careNote'] === 'string' && product['careNote'].trim()
        ? String(product['careNote']).trim()
        : prefersArabicCopy
          ? 'راجعي العناية المناسبة قبل الاستخدام الأول للحفاظ على القماش واللون.'
          : 'Review the care note before first wear to keep fabric and color at their best.';
    const boutiqueStyleWith = (
      Array.isArray(product['styleWith']) && product['styleWith'].length
        ? product['styleWith']
        : productTagValues
    )
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    const boutiqueFacts = (
      Array.isArray(product['boutiqueFacts']) && product['boutiqueFacts'].length
        ? product['boutiqueFacts']
        : [
            {
              label: prefersArabicCopy ? 'الفئة' : 'Category',
              value: boutiqueCategoryLabel,
            },
            {
              label: prefersArabicCopy ? 'الاختيار' : 'Selection',
              value:
                selectedOptionSummary ||
                (product.productVariants && product.productVariants.length > 0
                  ? prefersArabicCopy
                    ? 'ألوان ومقاسات متعددة'
                    : 'Multiple colors and sizes'
                  : prefersArabicCopy
                    ? 'جاهز للطلب مباشرة'
                    : 'Ready for direct checkout'),
            },
            {
              label: prefersArabicCopy ? 'الشحن' : 'Shipping',
              value: prefersArabicCopy ? 'تجهيز واضح داخل مصر' : 'Clear Egypt-wide shipping',
            },
            {
              label: prefersArabicCopy ? 'الدعم' : 'Support',
              value:
                guaranteeItems[0]?.title?.trim() ||
                (prefersArabicCopy ? 'خدمة واضحة بعد الشراء' : 'Clear post-purchase support'),
            },
          ]
    )
      .map((fact) => ({
        label: String(fact?.label || '').trim(),
        value: String(fact?.value || '').trim(),
      }))
      .filter((fact) => fact.label && fact.value)
      .slice(0, 4);
    const boutiqueGuaranteeCards = (
      guaranteeItems.length
        ? guaranteeItems
        : [
            {
              title: prefersArabicCopy ? 'صور أقرب للواقع' : 'Closer imagery',
              description: prefersArabicCopy
                ? 'نحاول إبقاء الأقمشة والدرجات أوضح حتى يكون القرار أهدأ.'
                : 'Imagery stays closer to real fabric and tone so the decision feels calmer.',
            },
            {
              title: prefersArabicCopy ? 'استبدال أوضح' : 'Clear exchanges',
              description: prefersArabicCopy
                ? 'إذا احتجت تغيير المقاس، تبقى الخطوات أبسط قبل وما بعد الشراء.'
                : 'If you need a size change, the path stays clearer before and after checkout.',
            },
            {
              title: prefersArabicCopy ? 'توصيل داخل مصر' : 'Egypt-wide delivery',
              description: prefersArabicCopy
                ? 'رسالة الشحن وخطوات التوصيل تبقى ظاهرة خلال الرحلة كلها.'
                : 'Delivery expectations stay visible through the purchase flow.',
            },
          ]
    ).slice(0, 3);
    const boutiqueSpecs = specs
      .map((spec) => ({
        label: String(spec?.label || '').trim(),
        value: String(spec?.value || '').trim(),
      }))
      .filter((spec) => spec.label && spec.value)
      .slice(0, 4);
    const atelierUtilityActionClassName =
      'font-sans text-[0.8rem] font-black tracking-[0.04em] text-[#5c4747] transition-colors hover:text-[#3f2f33]';
    const atelierVariantSelector =
      product.productVariants &&
      product.productVariants.length > 0 &&
      !isPrimaryQuantityOffersDecision ? (
        <div className="space-y-3">
          <p className="text-[10px] font-black tracking-[0.24em] text-[#9c6274]">
            {prefersArabicCopy ? 'الاختيار' : 'Selection'}
          </p>
          <VariantSelector
            variants={product.productVariants}
            selectedAttributes={selectedAttributes}
            onChange={setSelectedAttributes}
            density="compact"
            layout="inline-compact"
            variantSettings={variantSettings}
          />
        </div>
      ) : null;
    const renderAtelierSizeGuideLink = () => {
      if (sizeGuideInteraction === 'modal' && canOpenSizeGuide) {
        return (
          <button
            type="button"
            onClick={() => setIsSizeGuideDialogOpen(true)}
            className={atelierUtilityActionClassName}
          >
            {sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide')}
          </button>
        );
      }

      if (!sizeGuideHref) {
        return null;
      }

      if (isExternalHref(sizeGuideHref)) {
        return (
          <a
            href={sizeGuideHref}
            target="_blank"
            rel="noreferrer"
            className={atelierUtilityActionClassName}
          >
            {sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide')}
          </a>
        );
      }

      return (
        <Link
          to={sizeGuideHref}
          className={atelierUtilityActionClassName}
        >
          {sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide')}
        </Link>
      );
    };
    const atelierUtilityLinks = [renderAtelierSizeGuideLink()].filter(Boolean);
    const atelierShareActions = [
      {
        id: 'facebook' as const,
        label: prefersArabicCopy ? 'شاركي على فيسبوك' : 'Share on Facebook',
        icon: Facebook,
      },
      {
        id: 'twitter' as const,
        label: prefersArabicCopy ? 'شاركي على إكس' : 'Share on X',
        icon: Twitter,
      },
      {
        id: 'copy' as const,
        label: prefersArabicCopy ? 'انسخي رابط المنتج' : 'Copy product link',
        icon: Share2,
      },
    ];
    const atelierDecisionMeta =
      selectedOptionSummary || discount || stockStatusLabel ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#eadfd9] pb-4">
          {selectedOptionSummary ? (
            <span className="inline-flex rounded-full border border-[#dfcfc7] bg-white/92 px-3 py-1 text-[11px] font-black text-[#3f2f33]">
              {prefersArabicCopy
                ? `الاختيار: ${selectedOptionSummary}`
                : `Selected: ${selectedOptionSummary}`}
            </span>
          ) : null}
          <span className="inline-flex rounded-full border border-[#dfcfc7] bg-white/92 px-3 py-1 text-[11px] font-black text-[#6e5757]">
            {stockStatusLabel}
          </span>
          {discount && discount > 0 ? (
            <span className="inline-flex rounded-full bg-[#3f2f33] px-3 py-1 text-[11px] font-black text-white">
              {prefersArabicCopy ? `وفر ${discount}%` : `Save ${discount}%`}
            </span>
          ) : null}
        </div>
      ) : null;
    const atelierFactsGrid =
      boutiqueFacts.length > 0 ? (
        <dl className="grid gap-x-8 gap-y-4 border-t border-[#eadfd9] pt-5 sm:grid-cols-2">
          {boutiqueFacts.map((fact, index) => (
            <div key={`${fact.label}-${index}`} className="border-b border-[#f1e4df] pb-3">
              <dt className="text-[10px] font-black tracking-[0.2em] text-[#9c6274]">
                {fact.label}
              </dt>
              <dd className="mt-2 text-sm font-bold leading-6 text-[#4a383b]">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null;
    const showStickyMobileAddToCart =
      shouldRenderStandaloneBuyBox && !externalOnlyProduct && !isCartOpen;

    return (
      <section className="w-full px-1 py-4">
        <div className="space-y-6">
          {canOpenSizeGuide && sizeGuideInteraction === 'modal' ? sizeGuideDialog : null}
          {shippingInteraction === 'modal' ? shippingPolicyDialog : null}

          <div className="hidden space-y-4 lg:block">
            <p className="text-[10px] font-black tracking-[0.28em] text-[#9c6274]">
              {boutiqueBadge}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-[#6e5757]">
              <span>{boutiqueCategoryLabel}</span>
              {boutiqueRating ? (
                <>
                  <span className="text-[#dfcfc7]">/</span>
                  <span>
                    {prefersArabicCopy
                      ? `★ ${boutiqueRating.toFixed(1)} من ${boutiqueReviewCount} تقييم`
                      : `★ ${boutiqueRating.toFixed(1)} from ${boutiqueReviewCount} reviews`}
                  </span>
                </>
              ) : null}
            </div>

            <div className="space-y-4">
              <h1 className="font-heading text-[2.3rem] font-black leading-[1.02] tracking-tight text-[#3f2f33] md:text-[3rem]">
                {product.name}
              </h1>
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-[2.35rem] font-black text-[#3f2f33] md:text-[2.95rem]">
                  {displayPrice}
                </span>
                {originalPrice ? (
                  <span className="text-base font-bold text-[#9d857f] line-through decoration-[#dfc4bd]">
                    {originalPrice}
                  </span>
                ) : null}
                {discount && discount > 0 ? (
                  <span className="text-[11px] font-black tracking-[0.2em] text-[#9c6274]">
                    {prefersArabicCopy ? `خصم ${discount}%` : `${discount}% off`}
                  </span>
                ) : null}
              </div>
              <p className="max-w-2xl text-[0.98rem] leading-8 text-[#6e5757]">
                {boutiqueNote}
              </p>
            </div>
          </div>

          <div className="space-y-5 border-y border-[#eadfd9] py-5">
            <div
              id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
              ref={buyActionsRef}
              className="space-y-5"
            >
              {atelierDecisionMeta}

              {atelierVariantSelector ? (
                <div className="border-b border-[#eadfd9] pb-4">{atelierVariantSelector}</div>
              ) : null}

              {inlineQuantityOffers ? (
                <div className="border-b border-[#eadfd9] pb-4">{inlineQuantityOffers}</div>
              ) : null}

              {externalOnlyProduct ? (
                renderExternalPurchaseCta('card')
              ) : shouldRenderStandaloneBuyBox ? (
                <div className="space-y-4 border-b border-[#eadfd9] pb-5">
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className={`${buyNowButtonClassName} !bg-primary !text-white border-none`}
                    >
                      {buyNowText}
                    </button>
                    <div className="flex items-center gap-3">
                      <QuantitySelector value={quantity} onChange={setQuantity} />
                      <Button
                        size="lg"
                        fullWidth
                        variant="outline"
                        className={`${addToCartButtonClassName} !bg-white !text-primary !border-primary/30`}
                        onClick={handleAddToCart}
                      >
                        {addToCartText}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : showExternalAffiliateCta ? (
                renderExternalPurchaseCta('inline')
              ) : null}

              {mergedInlinePdpQuickOrder ? (
                <div className="border-b border-[#eadfd9] pb-5">
                  {mergedInlinePdpQuickOrder}
                </div>
              ) : null}

              <p className="max-w-2xl text-sm leading-7 text-[#6e5757]">
                {prefersArabicCopy
                  ? 'الشراء يظل قريبًا من المقاس واللون، حتى لا تتحول الصفحة إلى قراءة طويلة قبل الحسم.'
                  : 'Buying stays close to size and color so the page never turns into a long read before checkout.'}
              </p>

              {boutiqueStyleWith.length > 0 ? (
                <p className="max-w-2xl text-xs leading-6 text-[#6e5757]">
                  <span className="font-black text-[#3f2f33]">
                    {prefersArabicCopy ? 'تنسيق مقترح:' : 'Suggested pairing:'}
                  </span>{' '}
                  {boutiqueStyleWith.join(' • ')}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#eadfd9] pt-4">
                {atelierUtilityLinks.map((item, index) => (
                  <React.Fragment key={index}>{item}</React.Fragment>
                ))}
                {shippingInteraction === 'modal' ? (
                  <button
                    type="button"
                    onClick={() => setIsShippingDialogOpen(true)}
                    className={atelierUtilityActionClassName}
                  >
                    {shippingTitle}
                  </button>
                ) : null}
                <div className="flex items-center gap-4 sm:ms-auto">
                  <span className="text-[10px] font-black tracking-[0.2em] text-[#9c6274]">
                    {prefersArabicCopy ? 'شاركي' : 'Share'}
                  </span>
                  <div className="flex gap-3 text-[#6e5757]">
                    {atelierShareActions.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            void handleShareAction(item.id);
                          }}
                          aria-label={item.label}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dbc5be] bg-white text-[#5c4747] shadow-[0_12px_28px_-24px_rgba(63,47,51,0.28)] transition-all hover:-translate-y-0.5 hover:border-[#9c6274] hover:bg-[#fff8f5] hover:text-[#3f2f33]"
                        >
                          <Icon size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#eadfd9] pt-4">
                <p className="text-[10px] font-black tracking-[0.2em] text-[#9c6274]">
                  {shippingTitle}
                </p>
                <p className="mt-2 text-sm leading-7 text-[#6e5757]">{shippingText}</p>
              </div>
            </div>

            {atelierFactsGrid}
          </div>

          <div className="space-y-8 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(20rem,22rem)] xl:items-start xl:gap-10 xl:space-y-0">
            <div className="space-y-5">
              <div
                id={STOREFRONT_PRODUCT_DESCRIPTION_ID}
                className="space-y-3 border-b border-[#eadfd9] pb-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black tracking-[0.22em] text-[#9c6274]">
                    {descriptionTitle}
                  </p>
                  {safeDescription ? (
                    <button
                      type="button"
                      onClick={() => setIsMobileDescriptionExpanded((current) => !current)}
                      className={atelierUtilityActionClassName}
                    >
                      {isMobileDescriptionExpanded ? readLessText : readMoreText}
                    </button>
                  ) : null}
                </div>
                {safeDescription && isMobileDescriptionExpanded ? (
                  <ProductDescription
                    safeDescription={safeDescription}
                    emptyText={descriptionPreviewText}
                  />
                ) : (
                  <p className="text-sm leading-7 text-[#6e5757]">
                    {descriptionPreviewText}
                  </p>
                )}
              </div>

              {[
                {
                  label: prefersArabicCopy ? 'القصّة' : 'Fit',
                  value: boutiqueFitNote,
                },
                {
                  label: prefersArabicCopy ? 'التنسيق' : 'Styling',
                  value: boutiqueStylingNote,
                },
                {
                  label: prefersArabicCopy ? 'العناية' : 'Care',
                  value: boutiqueCareNote,
                },
              ].map((item) => (
                <div key={item.label} className="border-b border-[#f1e4df] pb-5">
                  <p className="text-[10px] font-black tracking-[0.2em] text-[#9c6274]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#6e5757]">{item.value}</p>
                </div>
              ))}
            </div>

            {showGuarantees ? (
              <div className="space-y-5 xl:border-s xl:border-[#f1e4df] xl:ps-8">
                <div className="border-b border-[#eadfd9] pb-4">
                  <p className="text-sm font-black text-[#433134]">{guaranteesTitle}</p>
                  <p className="mt-2 text-sm leading-7 text-[#766060]">
                    {guaranteesSubtitle}
                  </p>
                </div>

                {boutiqueGuaranteeCards.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="flex gap-4 border-b border-[#f1e4df] pb-5">
                    <span className="pt-0.5 text-[11px] font-black tracking-[0.22em] text-[#9c6274]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-sm font-black text-[#433134]">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-[#6e5757]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}

                {boutiqueSpecs.length > 0 ? (
                  <div className="space-y-3 border-t border-[#eadfd9] pt-4">
                    <p className="text-[10px] font-black tracking-[0.2em] text-[#9c6274]">
                      {prefersArabicCopy ? 'تفاصيل سريعة' : 'Quick details'}
                    </p>
                    <dl className="space-y-3">
                      {boutiqueSpecs.map((spec, index) => (
                        <div
                          key={`${spec.label}-${index}`}
                          className="flex items-start justify-between gap-4 border-b border-[#f1e4df] pb-3 text-sm"
                        >
                          <dt className="font-black text-[#433134]">{spec.label}</dt>
                          <dd className="text-left leading-6 text-[#6e5757]">{spec.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
};

export default AtelierBuybox;
