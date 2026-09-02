import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, Truck, RefreshCw, Eye, Sparkles } from 'lucide-react';
import type { Product } from '../../../hooks/useProducts';
import type { StorefrontTheme } from '../../../types/theme.types';
import { formatStorefrontCurrency } from '../../../utils/currency';
import { sanitizeStorefrontHtml } from '../../../utils/html';
import VariantSelector from '../../../components/VariantSelector';
import QuantitySelector from '../../../components/QuantitySelector';
import Button from '../../../components/Button';
import StorefrontProductImage from '../../../components/StorefrontProductImage';
import { getProductImageCandidates } from '../../../utils/productImages';
import { buildStorefrontPath } from '../../../utils/paths';
import ProductDescription from '../components/ProductDescription';

export interface BoutiqueLedgerBuyboxProps {
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

export const BoutiqueLedgerBuybox: React.FC<BoutiqueLedgerBuyboxProps> = (props) => {
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

  const [isMobileDescriptionExpanded, setIsMobileDescriptionExpanded] = useState(false);
  const safeDescription = sanitizeStorefrontHtml(product.description);
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
          ? 'اختيار روزا'
          : 'Boutique select';
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
              value:
                typeof product.category?.name === 'string' && product.category.name.trim()
                  ? product.category.name.trim()
                  : typeof product.categoryId === 'string' && product.categoryId.trim()
                    ? product.categoryId.trim()
                    : prefersArabicCopy
                      ? 'مختارات البوتيك'
                      : 'Boutique edit',
            },
            {
              label: prefersArabicCopy ? 'التهيئة' : 'Setup',
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
    const boutiqueProofs = (
      Array.isArray(product['boutiqueProofs']) && product['boutiqueProofs'].length
        ? product['boutiqueProofs']
        : [
            {
              label: prefersArabicCopy ? 'القصّة' : 'Fit',
              title: prefersArabicCopy ? 'تظهر أوضح في اللقطات القريبة' : 'Clearer in close-up',
              description: boutiqueFitNote,
            },
            {
              label: prefersArabicCopy ? 'التنسيق' : 'Styling',
              title: prefersArabicCopy ? 'تكمل الإطلالة بدون ازدحام' : 'Completes without clutter',
              description: boutiqueStylingNote,
            },
            {
              label: prefersArabicCopy ? 'العناية' : 'Care',
              title: prefersArabicCopy ? 'تفصيلة صغيرة تطيل عمر القطعة' : 'A small note that helps it last',
              description: boutiqueCareNote,
            },
          ]
    )
      .map((proof) => ({
        label: String(proof?.label || '').trim(),
        title: String(proof?.title || '').trim(),
        description: String(proof?.description || '').trim(),
      }))
      .filter((proof) => proof.label && proof.title && proof.description)
      .slice(0, 3);
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

    return (
      <section className="w-full overflow-hidden px-1 py-4">
        <div className="overflow-hidden rounded-[2rem] border border-[#ead8d3] bg-[linear-gradient(180deg,#fffefc_0%,#fff7f3_100%)] shadow-[0_36px_96px_-74px_rgba(86,58,58,0.2)]">
          <div className="space-y-4 border-b border-[#efe1da] px-5 py-5">
            <nav className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#9f8c86]">
              <Link to={homePath} className="transition-colors hover:text-[#8f5e6c]">
                {breadcrumbHomeLabel}
              </Link>
              <span>/</span>
              <Link to={shopPath} className="transition-colors hover:text-[#8f5e6c]">
                {breadcrumbShopLabel}
              </Link>
              <span>/</span>
              <span className="max-w-[18rem] truncate text-[#6e5757]">{product.name}</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[#e6c7d0] bg-white/92 px-3 py-1 text-[10px] font-black tracking-[0.22em] text-[#9c6274] shadow-[0_14px_28px_-24px_rgba(122,77,89,0.3)]">
                {boutiqueBadge}
              </span>
              {boutiqueRating ? (
                <span className="inline-flex rounded-full border border-[#efe1da] bg-[#fffaf7] px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-[#7b6262]">
                  {prefersArabicCopy
                    ? `★ ${boutiqueRating.toFixed(1)} من ${boutiqueReviewCount} تقييم`
                    : `★ ${boutiqueRating.toFixed(1)} from ${boutiqueReviewCount} reviews`}
                </span>
              ) : null}
              {selectedOptionSummary ? (
                <span className="inline-flex rounded-full border border-[#efe1da] bg-white/86 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-[#8d6d68]">
                  {prefersArabicCopy ? `المحدد: ${selectedOptionSummary}` : `Selected: ${selectedOptionSummary}`}
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-[1.95rem] font-black leading-[1.08] tracking-tight text-[#3f2f33] md:text-[2.45rem]">
                {product.name}
              </h1>
              <p className="text-sm leading-7 text-[#6e5757] md:text-base md:leading-8">
                {boutiqueNote}
              </p>
            </div>

            {boutiqueStyleWith.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {boutiqueStyleWith.map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className="rounded-full border border-[#efdcd6] bg-white/86 px-3 py-1.5 text-xs font-bold text-[#6e5757]"
                  >
                    {prefersArabicCopy
                      ? index === 0
                        ? `يتماشى مع ${item}`
                        : `وأيضًا ${item}`
                      : index === 0
                        ? `Pairs with ${item}`
                        : `Also ${item}`}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {boutiqueFacts.map((fact, index) => (
                <div
                  key={`${fact.label}-${index}`}
                  className="rounded-[1.2rem] border border-[#efe0da] bg-white/90 px-4 py-3 shadow-[0_18px_40px_-34px_rgba(86,58,58,0.14)]"
                >
                  <p className="text-[10px] font-black tracking-[0.22em] text-[#a06a77]">
                    {fact.label}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#4a383b]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {boutiqueProofs.length > 0 ? (
            <div className="grid gap-3 border-b border-[#efe1da] px-5 py-4 md:grid-cols-2">
              {boutiqueProofs.map((proof, index) => (
                <div
                  key={`${proof.label}-${index}`}
                  className="rounded-[1.25rem] border border-[#efe0da] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,244,0.9))] px-4 py-4 shadow-[0_18px_36px_-32px_rgba(86,58,58,0.14)]"
                >
                  <p className="text-[10px] font-black tracking-[0.22em] text-[#a06a77]">
                    {proof.label}
                  </p>
                  <h3 className="mt-2 text-base font-black leading-6 text-[#433134]">
                    {proof.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#6e5757]">
                    {proof.description}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-4 p-3 md:p-4">
            <div className="rounded-[1.75rem] border border-[#ead9d2] bg-[linear-gradient(180deg,#fffdfb_0%,#fff5ef_100%)] p-5 shadow-[0_26px_82px_-62px_rgba(86,58,58,0.18)]">
              <div className="space-y-3 border-b border-[#efe1da] pb-4">
                <div className="flex flex-wrap items-end gap-3">
                  <span className="text-[2.35rem] font-black text-[#3f2f33] md:text-[2.8rem]">
                    {displayPrice}
                  </span>
                  {originalPrice ? (
                    <span className="text-base font-bold text-[#9d857f] line-through decoration-[#dfc4bd]">
                      {originalPrice}
                    </span>
                  ) : null}
                  {discount && discount > 0 ? (
                    <span className="inline-flex rounded-full bg-[#3f2f33] px-3 py-1 text-[10px] font-black tracking-[0.18em] text-white shadow-[0_18px_32px_-24px_rgba(63,47,51,0.4)]">
                      {prefersArabicCopy ? `خصم ${discount}%` : `${discount}% off`}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-7 text-[#6e5757]">
                  {shortDescription || descriptionPreviewText}
                </p>
              </div>

              <div className="pt-4">{commonActionsWithRef}</div>
            </div>

            {commonVariantSelector ? (
              <div className="rounded-[1.7rem] border border-[#efe0da] bg-white/92 p-5 shadow-[0_24px_72px_-58px_rgba(86,58,58,0.14)]">
                <div className="mb-3 space-y-1">
                  <p className="text-[10px] font-black tracking-[0.22em] text-[#a06a77]">
                    {prefersArabicCopy ? 'اختيارك' : 'Selection'}
                  </p>
                  <p className="text-sm leading-6 text-[#766060]">
                    {prefersArabicCopy
                      ? 'اختاري اللون أو المقاس المناسب ثم أغلقي الطلب بهدوء.'
                      : 'Choose the right color or size, then complete checkout calmly.'}
                  </p>
                </div>
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.65rem] border border-[#efe0da] bg-[#fffaf7] p-5">
                <p className="text-sm font-black text-[#433134]">
                  {prefersArabicCopy ? 'ملاحظات روزا' : 'Roza notes'}
                </p>
                <div className="mt-4 space-y-3">
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
                    <div
                      key={item.label}
                      className="rounded-[1.05rem] border border-[#f1e3dd] bg-white/88 px-4 py-3"
                    >
                      <p className="text-[10px] font-black tracking-[0.2em] text-[#a06a77]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#6e5757]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.65rem] border border-[#efe0da] bg-[#fffaf7] p-5">
                <p className="text-sm font-black text-[#433134]">{guaranteesTitle}</p>
                <p className="mt-2 text-sm leading-6 text-[#766060]">
                  {guaranteesSubtitle}
                </p>
                <div className="mt-4 space-y-3">
                  {boutiqueGuaranteeCards.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className="rounded-[1.05rem] border border-[#f1e3dd] bg-white/88 px-4 py-3"
                    >
                      <p className="text-sm font-black text-[#433134]">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#6e5757]">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {boutiqueSpecs.length > 0 ? (
              <div className="rounded-[1.65rem] border border-[#efe0da] bg-white/92 p-5 shadow-[0_22px_60px_-54px_rgba(86,58,58,0.12)]">
                <p className="text-sm font-black text-[#433134]">
                  {prefersArabicCopy ? 'تفاصيل سريعة' : 'Quick details'}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {boutiqueSpecs.map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="rounded-[1rem] border border-[#f1e3dd] bg-[#fffaf7] px-4 py-3"
                    >
                      <p className="text-[10px] font-black tracking-[0.2em] text-[#a06a77]">
                        {spec.label}
                      </p>
                      <p className="mt-2 text-sm font-bold text-[#4a383b]">
                        {spec.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[1.55rem] border border-[#efe0da] bg-white/92 p-4 shadow-[0_18px_50px_-44px_rgba(86,58,58,0.12)]">
              <p className="text-sm font-black text-[#433134]">{shippingTitle}</p>
              <p className="mt-2 text-sm leading-6 text-[#6e5757]">{shippingText}</p>
            </div>
          </div>
        </div>
      </section>
    );
};

export default BoutiqueLedgerBuybox;
