import React, { useState } from 'react';
import type { ProductInfoController } from '../productInfoTypes';
import VariantSelector from '../../../components/VariantSelector';
import QuantitySelector from '../../../components/QuantitySelector';
import Button from '../../../components/Button';
import ProductDescription from '../components/ProductDescription';
import {
  STOREFRONT_BUYBOX_ID,
  STOREFRONT_PRODUCT_DESCRIPTION_ID,
} from '../productInfoHelpers';
import {
  Share2,
  ChevronDown,
  Sparkles,
  Scissors,
  Ruler,
  Truck,
  ShieldCheck,
  Check,
} from 'lucide-react';

export interface AtelierBuyboxProps {
  ctrl: ProductInfoController;
}

export const AtelierBuybox: React.FC<AtelierBuyboxProps> = ({ ctrl }) => {
  const {
    product,
    theme,
    prefersArabicCopy,
    displayPrice,
    originalPrice,
    discount,
    selectedOptionSummary,
    stockStatusLabel,
    selectedAttributes,
    setSelectedAttributes,
    quantity,
    setQuantity,
    handleAddToCart,
    handleBuyNow,
    handleShareAction,
    addToCartText,
    buyNowText,
    addToCartButtonClassName,
    buyNowButtonClassName,
    descriptionTitle,
    shippingTitle,
    shippingText,
    shippingInteraction,
    guaranteesTitle,
    guaranteesSubtitle,
    guaranteeItems,
    showGuarantees,
    canOpenSizeGuide,
    sizeGuideInteraction,
    sizeGuideText,
    sizeGuideDialog,
    shippingPolicyDialog,
    openShippingModal,
    openSizeGuideModal,
    externalOnlyProduct,
    showExternalAffiliateCta,
    renderExternalPurchaseCta,
    shortDescription,
    descriptionPreviewText,
    safeDescription,
    shouldRenderStandaloneBuyBox,
    hasEmbeddedPdpCheckout,
    inlinePdpQuickOrderFallback,
    specs,
  } = ctrl;

  const [openAccordion, setOpenAccordion] = useState<string | null>('fabric');
  const [isMobileDescriptionExpanded, setIsMobileDescriptionExpanded] = useState(false);

  const toggleAccordion = (id: string) => {
    setOpenAccordion((current) => (current === id ? null : id));
  };

  if (!product) return null;

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
        ? 'تحرير الأتيليه'
        : 'Atelier editorial';

  const boutiqueCategoryLabel =
    typeof product.category?.name === 'string' && product.category.name.trim()
      ? product.category.name.trim()
      : typeof product.categoryId === 'string' && product.categoryId.trim()
        ? product.categoryId.trim()
        : prefersArabicCopy
          ? 'إصدارات خاصة'
          : 'Exclusive editions';

  const boutiqueNote =
    typeof product['editorialNote'] === 'string' && product['editorialNote'].trim()
      ? String(product['editorialNote']).trim()
      : shortDescription || '';

  const boutiqueFitNote =
    typeof product['fitNote'] === 'string' && product['fitNote'].trim()
      ? String(product['fitNote']).trim()
      : prefersArabicCopy
        ? 'قصة مريحة مستقيمة تعطي حضوراً واثقاً ومقاس دقيق مطابق لجدول المقاسات المصري.'
        : 'A relaxed straight cut providing confident posture and true-to-size Egyptian measurements.';

  const boutiqueStylingNote =
    typeof product['stylingNote'] === 'string' && product['stylingNote'].trim()
      ? String(product['stylingNote']).trim()
      : prefersArabicCopy
        ? 'ينسق بأناقة مع بنطال سيريت تراكوتا وحقيبة ساحل جلد طبيعي لإطلالة متكاملة.'
        : 'Styles elegantly with relaxed trousers and natural leather accessories.';

  const boutiqueCareNote =
    typeof product['careNote'] === 'string' && product['careNote'].trim()
      ? String(product['careNote']).trim()
      : prefersArabicCopy
        ? 'تنظيف جاف أو غسيل يدوي بماء بارد ومكواة بخار خفيفة للحفاظ على رونق الألياف الطبيعية.'
        : 'Dry clean or cold hand wash with light steam to preserve natural fibers.';

  const productTagValues = Array.isArray(product.tags) ? product.tags : [];
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
            label: prefersArabicCopy ? 'الخامة' : 'Fabric',
            value: prefersArabicCopy ? 'كتان مصري نقي 100%' : '100% Pure Egyptian Linen',
          },
          {
            label: prefersArabicCopy ? 'المنشأ' : 'Origin',
            value: prefersArabicCopy ? 'ورش الأتيليه بالقاهرة' : 'Cairo Atelier Workshops',
          },
          {
            label: prefersArabicCopy ? 'المعاينة' : 'Try-on',
            value: prefersArabicCopy ? 'متاحة قبل الدفع' : 'Available with courier',
          },
          {
            label: prefersArabicCopy ? 'الاستبدال' : 'Exchange',
            value: prefersArabicCopy ? 'فوري خلال 24 ساعة' : '24h Home Exchange',
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
            title: prefersArabicCopy ? 'أقمشة طبيعية 100%' : '100% Natural Fabrics',
            description: prefersArabicCopy
              ? 'كتان وحرير طبيعي معالج لا يسبب حرارة.'
              : 'Pure linen and silk free from synthetic heat traps.',
          },
          {
            title: prefersArabicCopy ? 'معاينة وقياس منزلي' : 'Home Try-On',
            description: prefersArabicCopy
              ? 'حق كامل في قياس القطعة وفحصها قبل الدفع.'
              : 'Full right to try size and inspect stitching before payment.',
          },
          {
            title: prefersArabicCopy ? 'استبدال فوري 24 ساعة' : '24h Instant Exchange',
            description: prefersArabicCopy
              ? 'مندوبنا يصلك لتسليم المقاس البديل فوراً.'
              : 'Courier delivers replacement size to your doorstep.',
          },
        ]
  ).slice(0, 3);

  const atelierUtilityActionClassName =
    'font-sans text-[0.8rem] font-black tracking-[0.04em] text-[#5c4747] transition-colors hover:text-[#201612]';

  const atelierVariantSelector =
    product.productVariants && product.productVariants.length > 0 ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black tracking-[0.2em] text-[#9c6274] uppercase">
            {prefersArabicCopy ? 'المقاس واللون' : 'Size & Color'}
          </p>
          {canOpenSizeGuide ? (
            <button
              type="button"
              onClick={openSizeGuideModal}
              className="inline-flex items-center gap-1.5 text-xs font-black text-[#9c6274] hover:text-[#3f2f33] transition-colors"
            >
              <Ruler size={13} />
              <span>{sizeGuideText || (prefersArabicCopy ? 'جدول المقاسات' : 'Size guide')}</span>
            </button>
          ) : null}
        </div>
        <VariantSelector
          variants={product.productVariants}
          selectedAttributes={selectedAttributes}
          onChange={setSelectedAttributes}
          density="compact"
        />
      </div>
    ) : null;

  return (
    <section className="w-full px-1 py-2" data-testid="atelier-buybox">
      <div className="space-y-6">
        {canOpenSizeGuide && sizeGuideInteraction === 'modal' ? sizeGuideDialog : null}
        {shippingInteraction === 'modal' ? shippingPolicyDialog : null}

        {/* 1. Header Information */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#eadfd9] bg-[#fffaf8] px-3 py-1 text-[11px] font-black tracking-[0.16em] text-[#8c5663]">
              <Sparkles size={11} className="text-[#a46876]" />
              {boutiqueBadge}
            </span>

            {boutiqueRating ? (
              <span className="text-xs font-black tracking-wide text-[#6e5757]">
                ★ {boutiqueRating.toFixed(1)} ({boutiqueReviewCount} {prefersArabicCopy ? 'تقييم' : 'reviews'})
              </span>
            ) : null}
          </div>

          <h1 className="font-heading text-[2.2rem] font-black leading-[1.1] tracking-tight text-[#201612] sm:text-[2.6rem]">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-baseline gap-3 pt-1">
            <span className="font-heading text-[2.2rem] font-black tabular-nums tracking-tight text-[#201612] sm:text-[2.6rem]">
              {displayPrice}
            </span>
            {originalPrice ? (
              <span className="text-base font-bold tabular-nums text-[#9d857f] line-through decoration-[#dfc4bd]">
                {originalPrice}
              </span>
            ) : null}
            {discount && discount > 0 ? (
              <span className="rounded-full bg-[#8c5663]/10 px-2.5 py-0.5 text-xs font-black tracking-wide text-[#8c5663]">
                {prefersArabicCopy ? `وفر ${discount}%` : `Save ${discount}%`}
              </span>
            ) : null}
          </div>

          {boutiqueNote ? (
            <p className="max-w-2xl text-[0.95rem] leading-7 text-[#6e5757]">
              {boutiqueNote}
            </p>
          ) : null}
        </div>

        {/* 2. Interactive Buybox Chassis */}
        <div
          id={hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
          className="space-y-5 rounded-2xl border border-[#eadfd9] bg-white/95 p-5 shadow-[0_16px_40px_-24px_rgba(32,22,16,0.08)]"
        >
          {/* Status & Options Pill */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#201612]/10 bg-[#faf6f2] px-3 py-1 text-[#201612]">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              {stockStatusLabel}
            </span>
            {selectedOptionSummary ? (
              <span className="inline-flex rounded-full border border-[#eadfd9] bg-white px-3 py-1 text-[#6e5757]">
                {selectedOptionSummary}
              </span>
            ) : null}
          </div>

          {/* Color & Size Variant Picker */}
          {atelierVariantSelector}

          {/* Action Buttons Area */}
          {externalOnlyProduct ? (
            renderExternalPurchaseCta('card')
          ) : shouldRenderStandaloneBuyBox ? (
            <div className="space-y-3 pt-1">
              {/* Primary: Full-Width Buy Now */}
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full flex items-center justify-center gap-2 h-14 rounded-full bg-[#201612] text-[#fbf8f5] font-black text-sm sm:text-base tracking-wide shadow-[0_14px_30px_-10px_rgba(32,22,16,0.35)] transition-all hover:bg-[#382620] active:scale-[0.98]"
              >
                <span>{buyNowText || (prefersArabicCopy ? 'اشترِ الآن (معاينة قبل الدفع)' : 'Buy Now (Inspect on Delivery)')}</span>
              </button>

              {/* Secondary: Quantity + Add to Cart */}
              <div className="flex items-center gap-3">
                <QuantitySelector value={quantity} onChange={setQuantity} />
                <Button
                  size="lg"
                  fullWidth
                  variant="outline"
                  className="h-14 rounded-full border-2 border-[#201612] bg-transparent text-[#201612] font-black text-sm tracking-wide hover:bg-[#201612] hover:text-[#fbf8f5] transition-all active:scale-[0.98]"
                  onClick={handleAddToCart}
                >
                  {addToCartText || (prefersArabicCopy ? 'أضف لحقيبة التسوق' : 'Add to Shopping Bag')}
                </Button>
              </div>
            </div>
          ) : showExternalAffiliateCta ? (
            renderExternalPurchaseCta('inline')
          ) : null}

          {inlinePdpQuickOrderFallback ? (
            <div className="border-t border-[#eadfd9] pt-4">
              {inlinePdpQuickOrderFallback}
            </div>
          ) : null}

          {/* Reassurance Micro-Strip */}
          <div className="flex items-center justify-between rounded-xl bg-[#faf6f2] px-3.5 py-2.5 text-xs font-bold text-[#5c4747]">
            <span className="inline-flex items-center gap-2">
              <Truck size={14} className="text-[#8c5663]" />
              <span>{prefersArabicCopy ? 'معاينة وقياس منزلي مجاني قبل الدفع' : 'Free home inspection & try-on before payment'}</span>
            </span>
            <span className="text-[11px] font-black text-[#8c5663]">
              {prefersArabicCopy ? 'استبدال 24 س' : '24h exchange'}
            </span>
          </div>

          {/* Utility Share Bar */}
          <div className="flex items-center justify-between border-t border-[#eadfd9] pt-3 text-xs">
            <span className="font-black text-[#8c5663]">
              {prefersArabicCopy ? 'مشاركة الإطلالة' : 'Share piece'}
            </span>
            <div className="flex gap-2">
              {['facebook', 'twitter', 'copy'].map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => {
                    void handleShareAction(platform);
                  }}
                  aria-label={platform}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eadfd9] bg-white text-[#6e5757] transition-all hover:border-[#8c5663] hover:text-[#201612]"
                >
                  <Share2 size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Collapsible Luxury Accordions (Structured & Compact) */}
        <div className="space-y-3 rounded-2xl border border-[#eadfd9] bg-[#fffaf8] p-4 sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8c5663]">
            {prefersArabicCopy ? 'مواصفات القطعة والخدمات' : 'Garment Specs & Services'}
          </p>

          {/* Accordion 1: Fabric & Craftsmanship */}
          <div className="overflow-hidden rounded-xl border border-[#eadfd9] bg-white transition-all">
            <button
              type="button"
              onClick={() => toggleAccordion('fabric')}
              className="flex w-full items-center justify-between p-4 text-start font-black text-sm text-[#201612] hover:bg-[#faf6f2] transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <Scissors size={15} className="text-[#8c5663]" />
                <span>{prefersArabicCopy ? 'الخامة وميثاق الصنع' : 'Fabric & Craftsmanship'}</span>
              </span>
              <ChevronDown
                size={16}
                className={`text-[#8c5663] transition-transform duration-200 ${
                  openAccordion === 'fabric' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openAccordion === 'fabric' ? (
              <div className="border-t border-[#eadfd9] p-4 text-xs space-y-4">
                <dl className="grid grid-cols-2 gap-3">
                  {boutiqueFacts.map((fact, i) => (
                    <div key={i} className="rounded-lg bg-[#faf6f2] p-2.5">
                      <dt className="text-[10px] font-black uppercase tracking-wider text-[#8c5663]">
                        {fact.label}
                      </dt>
                      <dd className="mt-1 font-bold text-[#201612] text-xs">
                        {fact.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {safeDescription ? (
                  <div className="pt-2 text-xs leading-6 text-[#6e5757]">
                    <ProductDescription
                      safeDescription={safeDescription}
                      emptyText={shortDescription}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Accordion 2: Fit & Sizing */}
          <div className="overflow-hidden rounded-xl border border-[#eadfd9] bg-white transition-all">
            <button
              type="button"
              onClick={() => toggleAccordion('sizing')}
              className="flex w-full items-center justify-between p-4 text-start font-black text-sm text-[#201612] hover:bg-[#faf6f2] transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <Ruler size={15} className="text-[#8c5663]" />
                <span>{prefersArabicCopy ? 'القصّة وتفاصيل المقاس والتنسيق' : 'Fit, Sizing & Styling'}</span>
              </span>
              <ChevronDown
                size={16}
                className={`text-[#8c5663] transition-transform duration-200 ${
                  openAccordion === 'sizing' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openAccordion === 'sizing' ? (
              <div className="border-t border-[#eadfd9] p-4 text-xs space-y-3">
                <div className="rounded-lg bg-[#faf6f2] p-3 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#8c5663]">
                    {prefersArabicCopy ? 'القصّة المعتمدة' : 'Tailoring Fit'}
                  </p>
                  <p className="font-bold text-[#201612] leading-5">{boutiqueFitNote}</p>
                </div>

                <div className="rounded-lg bg-[#faf6f2] p-3 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#8c5663]">
                    {prefersArabicCopy ? 'اقتراح التنسيق' : 'Styling Suggestion'}
                  </p>
                  <p className="text-[#5c4747] leading-5">{boutiqueStylingNote}</p>
                </div>

                {canOpenSizeGuide ? (
                  <button
                    type="button"
                    onClick={openSizeGuideModal}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#8c5663] underline pt-1 hover:text-[#201612]"
                  >
                    <Ruler size={13} />
                    <span>{prefersArabicCopy ? 'عرض جدول المقاسات بالسنتيمتر' : 'View full measurement chart'}</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Accordion 3: Shipping & Home Try-on */}
          <div className="overflow-hidden rounded-xl border border-[#eadfd9] bg-white transition-all">
            <button
              type="button"
              onClick={() => toggleAccordion('shipping')}
              className="flex w-full items-center justify-between p-4 text-start font-black text-sm text-[#201612] hover:bg-[#faf6f2] transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <Truck size={15} className="text-[#8c5663]" />
                <span>{prefersArabicCopy ? 'الشحن والمعاينة المنزلية والاستبدال' : 'Delivery & Home Try-On'}</span>
              </span>
              <ChevronDown
                size={16}
                className={`text-[#8c5663] transition-transform duration-200 ${
                  openAccordion === 'shipping' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openAccordion === 'shipping' ? (
              <div className="border-t border-[#eadfd9] p-4 text-xs space-y-3">
                <p className="leading-6 text-[#5c4747]">{shippingText}</p>
                <div className="grid grid-cols-2 gap-2 pt-1 font-bold">
                  <div className="rounded-lg bg-[#faf6f2] p-2 text-center text-[11px] text-[#201612]">
                    {prefersArabicCopy ? 'معاينة النسيج قبل الدفع' : 'Inspect before payment'}
                  </div>
                  <div className="rounded-lg bg-[#faf6f2] p-2 text-center text-[11px] text-[#201612]">
                    {prefersArabicCopy ? 'استبدال فوري خلال 24 ساعة' : 'Instant 24h exchange'}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Accordion 4: Care Guide */}
          <div className="overflow-hidden rounded-xl border border-[#eadfd9] bg-white transition-all">
            <button
              type="button"
              onClick={() => toggleAccordion('care')}
              className="flex w-full items-center justify-between p-4 text-start font-black text-sm text-[#201612] hover:bg-[#faf6f2] transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <ShieldCheck size={15} className="text-[#8c5663]" />
                <span>{prefersArabicCopy ? 'إرشادات العناية بالملابس' : 'Garment Care Instructions'}</span>
              </span>
              <ChevronDown
                size={16}
                className={`text-[#8c5663] transition-transform duration-200 ${
                  openAccordion === 'care' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openAccordion === 'care' ? (
              <div className="border-t border-[#eadfd9] p-4 text-xs leading-6 text-[#5c4747]">
                <p>{boutiqueCareNote}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* 4. Minimalist 3-Pill Assurance Row */}
        {showGuarantees ? (
          <div className="grid grid-cols-3 gap-2 border-t border-[#eadfd9] pt-4 text-center">
            {boutiqueGuaranteeCards.map((item, index) => (
              <div key={index} className="space-y-1">
                <p className="text-[11px] font-black text-[#201612]">{item.title}</p>
                <p className="text-[10px] text-[#6e5757] line-clamp-1">{item.description}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default AtelierBuybox;
