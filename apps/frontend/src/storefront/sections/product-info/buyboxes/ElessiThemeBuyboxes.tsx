import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, ShieldCheck, Truck, RefreshCw, Eye, Sparkles, Heart, Share2,
  Lock, Clock, Award, CheckCircle, Package, ArrowRight, Phone, MessageSquare
} from 'lucide-react';
import type { Product, ProductVariant } from '../../../hooks/useProducts';
import type { StorefrontTheme } from '../../../types/theme.types';
import { formatStorefrontCurrency } from '../../../utils/currency';
import { sanitizeStorefrontHtml } from '../../../utils/html';
import VariantSelector from '../../../components/VariantSelector';
import QuantitySelector from '../../../components/QuantitySelector';
import Button from '../../../components/Button';
import StorefrontProductImage from '../../../components/StorefrontProductImage';
import ProductDescription from '../components/ProductDescription';
import ConfigurableTrustBadges from '../components/ConfigurableTrustBadges';
import StickyMobileCTA from '../components/StickyMobileCTA';

export interface ElessiThemeBuyboxesProps {
  product: Product;
  theme: StorefrontTheme;
  variant: string;
  isElessiBagBuybox: boolean;
  isElessiPlantBuybox: boolean;
  isElessiOrganicBuybox: boolean;
  isElessiBikeBuybox: boolean;
  isElessiGiftBuybox: boolean;
  isElessiPetBuybox: boolean;
  isElessiWatchBuybox: boolean;
  isElessiGarageBuybox: boolean;
  isAnyElessiBuybox: boolean;
  isElessiDigitalBuybox: boolean;
  prefersArabicCopy: boolean;
  currency: string;
  activePrice: number;
  activeComparePrice: number | null;
  discount: number | null;
  selectedVariant: ProductVariant | null;
  selectedAttributes: Record<string, string>;
  setSelectedAttributes: (attrs: Record<string, string>) => void;
  variantSettings: any;
  quantity: number;
  setQuantity: (val: number | ((prev: number) => number)) => void;
  isAddingToCart: boolean;
  handleAddToCart: () => Promise<void>;
  handleBuyNow: () => Promise<void>;
  specs: Array<{ label: string; value: string }>;
  shortDescription?: string;
  descriptionPreviewText?: string;
  safeDescription: string;
  homePath: string;
  shopPath: string;
  breadcrumbHomeLabel: string;
  breadcrumbShopLabel: string;
  productSku?: string;
  productCategoryLabel?: string;
  productTagValues: string[];
  elessiMetadataRows: Array<{ label: string; value: string }>;
  elessiLowerPanelsAnchorId: string;
  isMobileDescriptionExpanded: boolean;
  setIsMobileDescriptionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSizeGuideDialogOpen: (open: boolean) => void;
  setIsShippingDialogOpen: (open: boolean) => void;
  setIsQuestionDialogOpen: (open: boolean) => void;
  showStickyMobileAddToCart: boolean;
  showStickyCta: boolean;
  activeStock?: number | null;
  stockStatusLabel?: string;
  onSelectVariantAttribute?: (name: string, value: string) => void;
  handleShareAction?: (channel: 'facebook' | 'twitter' | 'copy') => Promise<void>;
  readMoreText?: string;
  readLessText?: string;
  sizeGuideText?: string;
  shippingDialogTitle?: string;
  askQuestionText?: string;
  viewingCount?: number;
  ordersInLastHours?: number;
  ordersTimeWindowHours?: number;
  countdownHours?: number;
  countdownMinutes?: number;
  countdownSeconds?: number;
  countdownTargetDate?: string;
  guaranteesTitle?: string;
  guaranteesSubtitle?: string;
  guaranteeItems?: string[];
  guaranteeStyle?: any;
  shippingTitle?: string;
  shippingText?: string;
  deliveryRangeText?: string;
  trustBadgesTitle?: string;
  trustBadgesSubtitle?: string;
  trustBadgeList?: string[];
  inlineQuantityOffers?: React.ReactNode;
  mergedInlinePdpQuickOrder?: React.ReactNode;
  externalOnlyProduct?: boolean;
}

export const ElessiThemeBuyboxes: React.FC<ElessiThemeBuyboxesProps> = (props) => {
  const {
    product,
    theme,
    variant,
    isElessiBagBuybox,
    isElessiPlantBuybox,
    isElessiOrganicBuybox,
    isElessiBikeBuybox,
    isElessiGiftBuybox,
    isElessiPetBuybox,
    isElessiWatchBuybox,
    isElessiGarageBuybox,
    isAnyElessiBuybox,
    isElessiDigitalBuybox,
    prefersArabicCopy,
    currency,
    activePrice,
    activeComparePrice,
    discount,
    selectedVariant,
    selectedAttributes,
    setSelectedAttributes,
    variantSettings,
    quantity,
    setQuantity,
    isAddingToCart,
    handleAddToCart,
    handleBuyNow,
    specs,
    shortDescription,
    descriptionPreviewText,
    safeDescription,
    homePath,
    shopPath,
    breadcrumbHomeLabel,
    breadcrumbShopLabel,
    productSku,
    productCategoryLabel,
    productTagValues,
    elessiMetadataRows,
    elessiLowerPanelsAnchorId,
    isMobileDescriptionExpanded,
    setIsMobileDescriptionExpanded,
    setIsSizeGuideDialogOpen,
    setIsShippingDialogOpen,
    setIsQuestionDialogOpen,
    showStickyMobileAddToCart,
    showStickyCta,
    activeStock,
    stockStatusLabel,
    onSelectVariantAttribute,
    handleShareAction,
    readMoreText,
    readLessText,
    sizeGuideText,
    shippingDialogTitle,
    askQuestionText,
    viewingCount,
    ordersInLastHours,
    ordersTimeWindowHours,
    countdownHours,
    countdownMinutes,
    countdownSeconds,
    countdownTargetDate,
    guaranteesTitle,
    guaranteesSubtitle,
    guaranteeItems = [],
    guaranteeStyle,
    shippingTitle,
    shippingText,
    deliveryRangeText,
    trustBadgesTitle,
    trustBadgesSubtitle,
    trustBadgeList = [],
    inlineQuantityOffers,
    mergedInlinePdpQuickOrder,
    externalOnlyProduct,
  } = props;

  if (isElessiBagBuybox) {
    const bagRating =
      typeof product.rating === 'number'
        ? product.rating
        : typeof product.reviewSummary?.averageRating === 'number'
          ? product.reviewSummary.averageRating
          : typeof product.reviewAverage === 'number'
            ? product.reviewAverage
            : null;
    const bagReviewsCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : typeof product.reviewsCount === 'number'
          ? product.reviewsCount
          : typeof product.ratingCount === 'number'
            ? product.ratingCount
            : typeof product.reviewSummary?.totalReviews === 'number'
              ? product.reviewSummary.totalReviews
              : 0;
    const bagStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : null,
      showUtilitySoldCounter
        ? prefersArabicCopy
          ? `${soldCount} طلب مكتمل`
          : `${soldCount} completed orders`
        : null,
      utilityViewerMessage || null,
      ...productTagValues.slice(0, 2),
    ].filter(Boolean) as string[];
    const bagDecisionFacts = [
      {
        label: prefersArabicCopy ? 'الاختيار' : 'Selection',
        value:
          selectedOptionSummary ||
          (product.productVariants && product.productVariants.length > 0
            ? prefersArabicCopy
              ? 'ألوان ومقاسات متعددة'
              : 'Multiple colors and sizes'
            : prefersArabicCopy
              ? 'جاهزة للإضافة مباشرة'
              : 'Ready to add'),
      },
      {
        label: prefersArabicCopy ? 'التوفر' : 'Availability',
        value:
          typeof activeStock === 'number'
            ? activeStock <= 10
              ? prefersArabicCopy
                ? `متبقي ${activeStock}`
                : `${activeStock} left`
              : prefersArabicCopy
                ? 'متاح الآن'
                : 'Available now'
            : prefersArabicCopy
              ? 'حسب التوفر'
              : 'Subject to stock',
      },
      {
        label: prefersArabicCopy ? 'التوصيل' : 'Delivery',
        value:
          utilityDeliveryRange ||
          (prefersArabicCopy ? 'يظهر قبل الدفع' : 'Shown before checkout'),
      },
    ];

    return (
      <section className="w-full border-y border-[#efe2d7] bg-white py-2">
        <div className="space-y-6">
          <div className="border-b border-[#efe2d7] pb-5">
            {commonHeader}
            <div className="mt-4 flex flex-wrap gap-2">
              {bagStatusChips.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="rounded-full border border-[#eadfd4] bg-white px-3 py-1.5 text-xs font-bold text-[#6f5a50]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-4">
              {bagRating ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#6f5a50]">
                  <span className="text-[#d89d35]">
                    {'★★★★★'.slice(0, Math.round(bagRating))}
                  </span>
                  <span className="font-bold text-[#241815]">
                    {bagRating.toFixed(1)}
                  </span>
                  <span>
                    {prefersArabicCopy
                      ? `(${bagReviewsCount} مراجعة)`
                      : `(${bagReviewsCount} reviews)`}
                  </span>
                </div>
              ) : null}
              {commonPrice}
              <p className="max-w-3xl text-sm leading-7 text-[#6f5a50] md:text-base">
                {shortDescription || descriptionPreviewText}
              </p>
            </div>

            {commonVariantSelector ? (
              <div className="border-b border-[#efe2d7] pb-5">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="rounded-[1.6rem] border border-[#eadfd4] bg-[linear-gradient(180deg,#fffdfa,#f8f0e8)] p-4 shadow-[0_24px_64px_-52px_rgba(61,37,25,0.2)] md:p-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9a7666]">
                    {prefersArabicCopy ? 'اختيار الشراء' : 'Purchase setup'}
                  </p>
                  <p className="text-sm leading-7 text-[#6f5a50]">
                    {prefersArabicCopy
                      ? 'اختَر اللون أو المقاس، ثم أكمل الإضافة أو راجع الشحن والاستبدال من نفس السطح.'
                      : 'Choose the right color or size, then complete the add-to-cart decision from the same surface.'}
                  </p>
                </div>

                {commonActionsWithRef}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {bagDecisionFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="space-y-2 border-b border-[#efe2d7] pb-3 sm:border-b-0 sm:pb-0"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9a7666]">
                    {fact.label}
                  </p>
                  <p className="text-sm font-black leading-6 text-[#241815]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-[#6f5a50]">
              <button
                type="button"
                onClick={() => setIsShippingDialogOpen(true)}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#241815]"
              >
                <Truck className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'الشحن والاستبدال' : 'Delivery & Return'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#241815]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'آراء العملاء' : 'Customer reviews'}</span>
              </button>
            </div>

            <div className="grid gap-5 border-t border-[#efe2d7] pt-5 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#241815]">{shippingTitle}</h3>
                <p className="text-sm leading-7 text-[#6f5a50]">{shippingText}</p>
                <p className="text-sm leading-7 text-[#6f5a50]">{returnsPolicyBody}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#241815]">{guaranteesTitle}</h3>
                {showGuarantees ? (
                  <div className="space-y-3">
                    {guaranteeItems.slice(0, 3).map((item, index) => (
                      <div
                        key={`${item.title}-${index}`}
                        className="border-b border-[#efe2d7] pb-3 last:border-b-0 last:pb-0"
                      >
                        <p className="text-sm font-bold text-[#241815]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#6f5a50]">{item.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[#6f5a50]">{guaranteesSubtitle}</p>
                )}
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="border-t border-[#efe2d7] pt-5">
                <p className="text-sm font-black text-[#241815]">
                  {prefersArabicCopy ? 'تفاصيل سريعة' : 'Quick details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 border-b border-[#efe2d7] py-2 last:border-b-0"
                    >
                      <span className="text-sm font-bold text-[#6f5a50]">{spec.label}</span>
                      <span className="text-sm font-black text-[#241815]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (isElessiPlantBuybox) {
    const plantRating =
      typeof product.rating === 'number'
        ? product.rating
        : typeof product.reviewSummary?.averageRating === 'number'
          ? product.reviewSummary.averageRating
          : typeof product.reviewAverage === 'number'
            ? product.reviewAverage
            : null;
    const plantReviewsCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : typeof product.reviewsCount === 'number'
          ? product.reviewsCount
          : typeof product.ratingCount === 'number'
            ? product.ratingCount
            : typeof product.reviewSummary?.totalReviews === 'number'
              ? product.reviewSummary.totalReviews
              : 0;
    const plantStatusChips = [
      showUtilitySoldCounter
        ? prefersArabicCopy
          ? `${soldCount} تم بيعها`
          : `${soldCount} sold`
        : null,
      utilityViewerMessage || null,
      utilityDeliveryRange
        ? prefersArabicCopy
          ? `${utilityDeliveryLabel}: ${utilityDeliveryRange}`
          : `${utilityDeliveryLabel}: ${utilityDeliveryRange}`
        : null,
      ...productTagValues.slice(0, 2),
    ].filter(Boolean) as string[];
    const plantDecisionFacts = [
      {
        label: prefersArabicCopy ? 'الاختيار' : 'Selection',
        value:
          selectedOptionSummary ||
          (product.productVariants && product.productVariants.length > 0
            ? prefersArabicCopy
              ? 'متوفر بأكثر من خيار'
              : 'Multiple options available'
            : prefersArabicCopy
              ? 'جاهز للشراء مباشرة'
              : 'Ready to add'),
      },
      {
        label: prefersArabicCopy ? 'الحالة' : 'Availability',
        value:
          typeof activeStock === 'number'
            ? activeStock <= 10
              ? prefersArabicCopy
                ? `متبقي ${activeStock}`
                : `${activeStock} left`
              : prefersArabicCopy
                ? 'متاح الآن'
                : 'Available now'
            : prefersArabicCopy
              ? 'متاح للطلب'
              : 'Available to order',
      },
      {
        label: prefersArabicCopy ? 'التوصيل' : 'Delivery',
        value:
          utilityDeliveryRange ||
          (prefersArabicCopy ? 'يظهر قبل الدفع' : 'Shown before checkout'),
      },
    ];

    return (
      <section className="w-full border-y border-[#e7efe4] bg-white py-2">
        <div className="space-y-6">
          <div className="border-b border-[#e7efe4] pb-5">
            {commonHeader}
            <div className="mt-4 flex flex-wrap gap-2">
              {plantStatusChips.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="rounded-full border border-[#d8e6d8] bg-white px-3 py-1.5 text-xs font-bold text-[#43604b]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-4">
              {plantRating ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#56715e]">
                  <span className="text-[#f5a623]">
                    {'★★★★★'.slice(0, Math.round(plantRating))}
                  </span>
                  <span className="font-bold text-[#203528]">
                    {plantRating.toFixed(1)}
                  </span>
                  <span>
                    {prefersArabicCopy
                      ? `(${plantReviewsCount} مراجعة)`
                      : `(${plantReviewsCount} reviews)`}
                  </span>
                </div>
              ) : null}
              {commonPrice}
              {showUtilitySoldCounter ? (
                <p className="text-sm font-bold text-[#6c8b13]">
                  {prefersArabicCopy
                    ? `${soldCount} عملية بيع خلال آخر 12 ساعة`
                    : `${soldCount} sold in the last 12 hours`}
                </p>
              ) : null}
              <p className="max-w-3xl text-sm leading-7 text-[#56715e] md:text-base">
                {shortDescription || descriptionPreviewText}
              </p>
            </div>

            {commonVariantSelector ? (
              <div className="border-b border-[#e7efe4] pb-5">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="border-y border-[#e7efe4] py-5">
              {commonActionsWithRef}
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-[#56715e]">
              <button
                type="button"
                onClick={() => setIsShippingDialogOpen(true)}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#203528]"
              >
                <Truck className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'الشحن والاستبدال' : 'Delivery & Return'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#203528]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'اسأل أو راجع التقييمات' : 'Ask or view reviews'}</span>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {plantDecisionFacts.map((fact) => (
                <div key={fact.label} className="space-y-2 border-b border-[#e7efe4] pb-3 sm:border-b-0 sm:pb-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#99a392]">
                    {fact.label}
                  </p>
                  <p className="text-sm font-black leading-6 text-[#203528]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 border-t border-[#e7efe4] pt-5 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#203528]">{shippingTitle}</h3>
                <p className="text-sm leading-7 text-[#56715e]">{shippingText}</p>
                <p className="text-sm leading-7 text-[#56715e]">{returnsPolicyBody}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#203528]">{guaranteesTitle}</h3>
                {showGuarantees ? (
                  <div className="space-y-3">
                    {guaranteeItems.slice(0, 3).map((item, index) => (
                      <div key={`${item.title}-${index}`} className="border-b border-[#e7efe4] pb-3 last:border-b-0 last:pb-0">
                        <p className="text-sm font-bold text-[#203528]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#56715e]">{item.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[#56715e]">{guaranteesSubtitle}</p>
                )}
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="border-t border-[#e7efe4] pt-5">
                <p className="text-sm font-black text-[#203528]">
                  {prefersArabicCopy ? 'تفاصيل النبات' : 'Plant details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 border-b border-[#e7efe4] py-2 last:border-b-0"
                    >
                      <span className="text-sm font-bold text-[#56715e]">{spec.label}</span>
                      <span className="text-sm font-black text-[#203528]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-[#e7efe4] pt-5">
              <p className="text-sm font-black text-[#203528]">
                {prefersArabicCopy ? 'دفع آمن' : 'Guaranteed safe checkout'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['VISA', 'PayPal', 'Apple Pay', 'COD'].map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center rounded-[0.45rem] border border-[#d8e6d8] bg-white px-3 py-2 text-xs font-black text-[#43604b]"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isElessiOrganicBuybox) {
    const organicRating =
      typeof product.rating === 'number'
        ? product.rating
        : typeof product.reviewSummary?.averageRating === 'number'
          ? product.reviewSummary.averageRating
          : typeof product.reviewAverage === 'number'
            ? product.reviewAverage
            : null;
    const organicReviewsCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : typeof product.reviewsCount === 'number'
          ? product.reviewsCount
          : typeof product.ratingCount === 'number'
            ? product.ratingCount
            : typeof product.reviewSummary?.totalReviews === 'number'
              ? product.reviewSummary.totalReviews
              : 0;
    const organicStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : null,
      utilityDeliveryRange
        ? prefersArabicCopy
          ? `${utilityDeliveryLabel}: ${utilityDeliveryRange}`
          : `${utilityDeliveryLabel}: ${utilityDeliveryRange}`
        : null,
      showUtilitySoldCounter
        ? prefersArabicCopy
          ? `${soldCount} طلب مكتمل`
          : `${soldCount} completed orders`
        : null,
      ...productTagValues.slice(0, 2),
    ].filter(Boolean) as string[];
    const organicDecisionFacts = [
      {
        label: prefersArabicCopy ? 'الحجم' : 'Pack',
        value:
          selectedOptionSummary ||
          (product.productVariants && product.productVariants.length > 0
            ? prefersArabicCopy
              ? 'أكثر من عبوة متاحة'
              : 'Multiple pack sizes'
            : prefersArabicCopy
              ? 'عبوة جاهزة'
              : 'Ready pack'),
      },
      {
        label: prefersArabicCopy ? 'الطزاجة' : 'Freshness',
        value:
          soldCount > 0
            ? prefersArabicCopy
              ? `تجهيز يومي حسب الطلب`
              : 'Prepared fresh for recurring orders'
            : prefersArabicCopy
              ? 'تجهيز سريع حسب التوفر'
              : 'Quick prep subject to stock',
      },
      {
        label: prefersArabicCopy ? 'التخزين' : 'Storage',
        value:
          specs[0]?.value ||
          (prefersArabicCopy ? 'يحفظ في مكان بارد أو الثلاجة حسب النوع' : 'Store in a cool place or refrigerate by product type'),
      },
    ];

    return (
      <section className="w-full border-y border-[#eadfcd] bg-white py-2">
        <div className="space-y-6">
          <div className="border-b border-[#efe4d6] pb-5">
            {commonHeader}
            <div className="mt-4 flex flex-wrap gap-2">
              {organicStatusChips.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="rounded-full border border-[#eadfcd] bg-[#fff9f2] px-3 py-1.5 text-xs font-bold text-[#6c5b49]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-4">
              {organicRating ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#6c5b49]">
                  <span className="text-[#d39c4d]">
                    {'★★★★★'.slice(0, Math.round(organicRating))}
                  </span>
                  <span className="font-bold text-[#2d3b27]">
                    {organicRating.toFixed(1)}
                  </span>
                  <span>
                    {prefersArabicCopy
                      ? `(${organicReviewsCount} مراجعة)`
                      : `(${organicReviewsCount} reviews)`}
                  </span>
                </div>
              ) : null}
              {commonPrice}
              <p className="max-w-3xl text-sm leading-7 text-[#67705e] md:text-base">
                {shortDescription || descriptionPreviewText}
              </p>
            </div>

            {commonVariantSelector ? (
              <div className="border-b border-[#efe4d6] pb-5">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="rounded-[1.6rem] border border-[#eadfcd] bg-[linear-gradient(180deg,#fffdf9,#f8f1e8)] p-4 shadow-[0_24px_64px_-52px_rgba(45,59,39,0.18)] md:p-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6546]">
                    {prefersArabicCopy ? 'اختيار الطلب' : 'Order setup'}
                  </p>
                  <p className="text-sm leading-7 text-[#67705e]">
                    {prefersArabicCopy
                      ? 'اختر العبوة أو الصندوق المناسب، ثم أضف المنتج أو راجع الشحن والاستبدال من نفس السطح.'
                      : 'Choose the right pack or crate, then complete the add-to-cart decision from the same surface.'}
                  </p>
                </div>

                {commonActionsWithRef}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {organicDecisionFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="space-y-2 border-b border-[#efe4d6] pb-3 sm:border-b-0 sm:pb-0"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b7d6d]">
                    {fact.label}
                  </p>
                  <p className="text-sm font-black leading-6 text-[#2d3b27]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-[#6c5b49]">
              <button
                type="button"
                onClick={() => setIsShippingDialogOpen(true)}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#2d3b27]"
              >
                <Truck className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'الشحن والاستبدال' : 'Delivery & Return'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#2d3b27]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'آراء العملاء' : 'Customer reviews'}</span>
              </button>
            </div>

            <div className="grid gap-5 border-t border-[#efe4d6] pt-5 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#2d3b27]">{shippingTitle}</h3>
                <p className="text-sm leading-7 text-[#67705e]">{shippingText}</p>
                <p className="text-sm leading-7 text-[#67705e]">{returnsPolicyBody}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#2d3b27]">{guaranteesTitle}</h3>
                {showGuarantees ? (
                  <div className="space-y-3">
                    {guaranteeItems.slice(0, 3).map((item, index) => (
                      <div
                        key={`${item.title}-${index}`}
                        className="border-b border-[#efe4d6] pb-3 last:border-b-0 last:pb-0"
                      >
                        <p className="text-sm font-bold text-[#2d3b27]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#67705e]">{item.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[#67705e]">{guaranteesSubtitle}</p>
                )}
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="border-t border-[#efe4d6] pt-5">
                <p className="text-sm font-black text-[#2d3b27]">
                  {prefersArabicCopy ? 'تفاصيل سريعة' : 'Quick details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 border-b border-[#efe4d6] py-2 last:border-b-0"
                    >
                      <span className="text-sm font-bold text-[#6c5b49]">{spec.label}</span>
                      <span className="text-sm font-black text-[#2d3b27]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (isElessiBikeBuybox) {
    const bikeRating = typeof product.rating === 'number' ? product.rating : 0;
    const bikeReviewsCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : parseMaybeNumber(product.reviewCount) ?? 0;
    const bikeStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : prefersArabicCopy
          ? 'جاهز للشحن'
          : 'Ready to ship',
      utilityDeliveryRange || (prefersArabicCopy ? 'شحن خلال 24-48 ساعة' : 'Ships in 24-48 hours'),
      commonVariantSelector ? (prefersArabicCopy ? 'مقاسات متعددة' : 'Multi sizes') : prefersArabicCopy ? 'اختيار سريع' : 'Quick pick',
    ];
    const bikeDecisionFacts = [
      {
        label: prefersArabicCopy ? 'الاستعمال' : 'Use case',
        value: product.category?.name || (prefersArabicCopy ? 'دراجات ومعدات' : 'Bikes & gear'),
      },
      {
        label: prefersArabicCopy ? 'التوصيل' : 'Delivery',
        value: utilityDeliveryRange || (prefersArabicCopy ? 'يظهر قبل الدفع' : 'Shown before checkout'),
      },
      {
        label: prefersArabicCopy ? 'الخدمة' : 'Support',
        value:
          guaranteeItems[0]?.title?.trim() ||
          (prefersArabicCopy ? 'تركيب وضمان أقرب للشراء' : 'Assembly and warranty support'),
      },
    ];

    return (
      <section className="w-full border-y border-[#e3e7eb] bg-white py-2">
        <div className="space-y-6">
          <div className="border-b border-[#e3e7eb] pb-5">
            {commonHeader}
            <div className="mt-4 flex flex-wrap gap-2">
              {bikeStatusChips.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="border border-[#d9dee4] bg-[#f8fafb] px-3 py-1.5 text-xs font-bold text-[#516170]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-4">
              {bikeRating ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#60717f]">
                  <span className="text-[#f4b74a]">
                    {'★★★★★'.slice(0, Math.round(bikeRating))}
                  </span>
                  <span className="font-bold text-[#1d2a33]">
                    {bikeRating.toFixed(1)}
                  </span>
                  <span>
                    {prefersArabicCopy
                      ? `(${bikeReviewsCount} مراجعة)`
                      : `(${bikeReviewsCount} reviews)`}
                  </span>
                </div>
              ) : null}
              {commonPrice}
              {showUtilitySoldCounter ? (
                <p className="text-sm font-bold text-[#1d2a33]">
                  {prefersArabicCopy
                    ? `${soldCount} طلب مكتمل على هذا الموديل`
                    : `${soldCount} completed orders on this model`}
                </p>
              ) : null}
              <p className="max-w-3xl text-sm leading-7 text-[#60717f] md:text-base">
                {shortDescription || descriptionPreviewText}
              </p>
            </div>

            {commonVariantSelector ? (
              <div className="border-b border-[#e3e7eb] pb-5">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="border-y border-[#e3e7eb] py-5">
              {commonActionsWithRef}
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-[#60717f]">
              <button
                type="button"
                onClick={() => setIsShippingDialogOpen(true)}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#1d2a33]"
              >
                <Truck className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'الشحن والاستبدال' : 'Delivery & return'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
                className="inline-flex items-center gap-2 font-bold transition-colors hover:text-[#1d2a33]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{prefersArabicCopy ? 'راجع التقييمات' : 'View reviews'}</span>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {bikeDecisionFacts.map((fact) => (
                <div key={fact.label} className="space-y-2 border-b border-[#e3e7eb] pb-3 sm:border-b-0 sm:pb-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a97a2]">
                    {fact.label}
                  </p>
                  <p className="text-sm font-black leading-6 text-[#1d2a33]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 border-t border-[#e3e7eb] pt-5 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#1d2a33]">{shippingTitle}</h3>
                <p className="text-sm leading-7 text-[#60717f]">{shippingText}</p>
                <p className="text-sm leading-7 text-[#60717f]">{returnsPolicyBody}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-[#1d2a33]">{guaranteesTitle}</h3>
                {showGuarantees ? (
                  <div className="space-y-3">
                    {guaranteeItems.slice(0, 3).map((item, index) => (
                      <div key={`${item.title}-${index}`} className="border-b border-[#e3e7eb] pb-3 last:border-b-0 last:pb-0">
                        <p className="text-sm font-bold text-[#1d2a33]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#60717f]">{item.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[#60717f]">{guaranteesSubtitle}</p>
                )}
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="border-t border-[#e3e7eb] pt-5">
                <p className="text-sm font-black text-[#1d2a33]">
                  {prefersArabicCopy ? 'تفاصيل الدراجة' : 'Bike details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 border-b border-[#e3e7eb] py-2 last:border-b-0"
                    >
                      <span className="text-sm font-bold text-[#60717f]">{spec.label}</span>
                      <span className="text-sm font-black text-[#1d2a33]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-[#e3e7eb] pt-5">
              <p className="text-sm font-black text-[#1d2a33]">
                {prefersArabicCopy ? 'دفع آمن' : 'Guaranteed safe checkout'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['VISA', 'PayPal', 'Apple Pay', 'COD'].map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center border border-[#d9dee4] bg-white px-3 py-2 text-xs font-black text-[#516170]"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isElessiGiftBuybox || isElessiPetBuybox || isElessiWatchBuybox || isElessiGarageBuybox) {
    const isPetCommerce = isElessiPetBuybox;
    const isWatchCommerce = isElessiWatchBuybox;
    const isGarageCommerce = isElessiGarageBuybox;
    const giftStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : null,
      stockStatusLabel,
      selectedOptionSummary,
      ...productTagValues.slice(0, 1),
    ].filter(Boolean) as string[];
    const giftFactCards = (
      commandFacts.length > 0
        ? commandFacts
        : specs.length > 0
          ? specs
          : [
              {
                label: prefersArabicCopy ? 'السعر الحالي' : 'Current price',
                value: displayPrice,
              },
              {
                label: prefersArabicCopy ? 'الشحن' : 'Shipping',
                value: prefersArabicCopy ? 'يظهر قبل الدفع' : 'Shown before checkout',
              },
              {
                label: prefersArabicCopy ? 'التخصيص' : 'Options',
                value:
                  product.productVariants && product.productVariants.length > 0
                    ? prefersArabicCopy
                      ? 'متاح باختيارات متعددة'
                      : 'Multiple variants available'
                    : prefersArabicCopy
                      ? 'جاهز للشراء مباشرة'
                      : 'Ready for direct purchase',
              },
              {
                label: prefersArabicCopy ? 'الدعم' : 'Support',
                value:
                  guaranteeItems[0]?.title?.trim() ||
                  (prefersArabicCopy ? 'دعم واضح بعد الشراء' : 'Clear post-purchase support'),
              },
            ]
    ).slice(0, 4);
    const giftSupportCards = (
      guaranteeItems.length
        ? guaranteeItems
        : [
            {
              title: isPetCommerce
                ? prefersArabicCopy
                  ? 'روتين أوضح'
                  : 'Clearer routine'
                : isGarageCommerce
                  ? prefersArabicCopy
                    ? 'توافق أوضح'
                    : 'Clearer fitment'
                : isWatchCommerce
                  ? prefersArabicCopy
                    ? 'مقارنة أسرع'
                    : 'Faster comparison'
                : prefersArabicCopy
                  ? 'تغليف مرتب'
                  : 'Tidy packaging',
              description: prefersArabicCopy
                ? isPetCommerce
                  ? 'الحجم، الوجبة، أو الاستخدام يبقون قريبين من قرار الشراء المتكرر.'
                  : isGarageCommerce
                    ? 'المقاس، التوافق، ونوع الاستخدام يظلون قريبين من قرار الإضافة حتى تقل أخطاء الطلب.'
                  : isWatchCommerce
                    ? 'الحجم، اللمعة، أو النسخة يبقون أمام العميل في مسار أقصر وأوضح.'
                  : 'التغليف والهدية وخيارات التوصيل يبقون قريبين من قرار الشراء.'
                : isPetCommerce
                  ? 'Size, meal, or usage cues stay close to the repeat-purchase decision.'
                  : isGarageCommerce
                    ? 'Fitment, size, and use-case cues stay close to the add-to-cart decision to reduce ordering mistakes.'
                  : isWatchCommerce
                    ? 'Size, finish, or model cues stay visible in a shorter, clearer decision path.'
                  : 'Packaging, gifting, and delivery details stay close to the purchase decision.',
            },
            {
              title: isPetCommerce
                ? prefersArabicCopy
                  ? 'اختيار أسهل'
                  : 'Faster choice'
                : isGarageCommerce
                  ? prefersArabicCopy
                    ? 'قرار أسرع'
                    : 'Faster decision'
                : isWatchCommerce
                  ? prefersArabicCopy
                    ? 'تفاصيل أوضح'
                    : 'Clearer details'
                : prefersArabicCopy
                  ? 'ثقة أوضح'
                  : 'Clearer confidence',
              description: prefersArabicCopy
                ? isPetCommerce
                  ? 'النوع، السعر، والكمية يظهرون معًا داخل صفحة واحدة بدون تشتيت.'
                  : isGarageCommerce
                    ? 'السعر، البديل المناسب، وخدمة ما بعد البيع يظلون ظاهرين داخل صفحة واحدة بدون لف.'
                  : isWatchCommerce
                    ? 'الاسم، السعر، والمقاس أو اللون يظلون معًا داخل صفحة واحدة بدون تشتيت.'
                  : 'المقاس والسعر والمعدن ظاهرون داخل صفحة واحدة بدون تشتيت.'
                : isPetCommerce
                  ? 'Type, price, and pack size stay visible together without extra friction.'
                  : isGarageCommerce
                    ? 'Price, the right alternative, and after-purchase support stay visible in one page without extra loops.'
                  : isWatchCommerce
                    ? 'Name, price, and size or finish stay together in one page without extra friction.'
                  : 'Size, price, and material stay visible together without extra friction.',
            },
            {
              title: prefersArabicCopy ? 'خدمة بعد الشراء' : 'After-purchase support',
              description: prefersArabicCopy
                ? 'الاستبدال والمتابعة يظلان واضحين قبل إغلاق الطلب.'
                : 'Exchange and follow-up support remain clear before checkout closes.',
            },
          ]
    ).slice(0, 3);
    const showStickyMobileAddToCart =
      shouldRenderPrimaryBuyBox && !externalOnlyProduct && !isCartOpen;

    return (
      <>
        <section className="w-full px-1 py-4">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.9rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffefb_0%,#f9f0e8_100%)] p-5 shadow-[0_30px_80px_-62px_rgba(91,57,40,0.22)]">
              <span className="inline-flex rounded-full border border-[#ead8ca] bg-white px-3 py-1 text-[11px] font-black tracking-[0.14em] text-[#8f5c44]">
                {isPetCommerce
                  ? prefersArabicCopy
                    ? 'روتين الشراء'
                    : 'Routine setup'
                  : isGarageCommerce
                    ? prefersArabicCopy
                      ? 'قرار القطعة'
                      : 'Part setup'
                  : isWatchCommerce
                    ? prefersArabicCopy
                      ? 'قرار الساعة'
                      : 'Watch setup'
                  : prefersArabicCopy
                    ? 'اختيار الهدية'
                    : 'Gift setup'}
              </span>
              <h2 className="mt-4 text-[2rem] font-black leading-[1.02] tracking-tight text-[#2d211e] md:text-[2.35rem]">
                {isPetCommerce
                  ? prefersArabicCopy
                    ? 'اختيارات أقرب لروتين المربي'
                    : 'Choices closer to the pet routine'
                  : isGarageCommerce
                    ? prefersArabicCopy
                      ? 'اعرف التوافق قبل الشراء'
                      : 'Confirm fit before checkout'
                  : isWatchCommerce
                    ? prefersArabicCopy
                      ? 'قرار شراء دافئ ومباشر'
                      : 'A warm, direct watch decision'
                  : prefersArabicCopy
                    ? 'سلة هدية أقرب للحسم'
                    : 'A gift setup closer to checkout'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#6f5a54] md:text-base">
                {shortDescription ||
                  (isPetCommerce
                    ? prefersArabicCopy
                      ? 'الوجبة، الاستخدام، والحجم يبقون أمام المربي داخل مسار أقصر وأوضح حتى يعيد الطلب بسرعة.'
                      : 'Meal type, usage, and pack size stay together in a shorter, clearer repeat-order path.'
                    : isGarageCommerce
                      ? prefersArabicCopy
                        ? 'رقم القطعة، المقاس، ومدى التوافق يظلون أمام العميل في مسار واضح حتى يحسم الطلب بثقة أكبر.'
                        : 'Part number, sizing, and fitment stay visible in a clearer path for more confident ordering.'
                    : isWatchCommerce
                      ? prefersArabicCopy
                        ? 'الاسم، المقاس، والنسخة يظلون أمام العميل في مسار أوضح حتى يحسم المقارنة والشراء بسرعة.'
                        : 'Name, size, and selected finish stay together in a clearer path for faster watch comparison and purchase.'
                    : prefersArabicCopy
                      ? 'القطعة، السعر، وخيارات الهدية يظلون أمام العميل في مسار أقصر وأهدأ حتى يقرر بسرعة.'
                      : 'The piece, price, and gifting options stay together in a calmer, shorter purchase path.')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {giftStatusChips.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full border border-[#ead8ca] bg-white/92 px-3 py-1.5 text-xs font-bold text-[#6b4a3c]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.65rem] border border-[#ead8ca] bg-white/96 p-5 shadow-[0_22px_60px_-48px_rgba(91,57,40,0.16)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f5c44]">
                    {isPetCommerce
                      ? prefersArabicCopy
                        ? 'المنتج المختار'
                        : 'Selected item'
                      : isGarageCommerce
                        ? prefersArabicCopy
                          ? 'القطعة المختارة'
                          : 'Selected part'
                      : isWatchCommerce
                        ? prefersArabicCopy
                          ? 'الموديل المختار'
                          : 'Selected model'
                      : prefersArabicCopy
                        ? 'القطعة المختارة'
                        : 'Selected piece'}
                  </p>
                  <h3 className="mt-2 text-2xl font-black leading-tight text-[#2d211e]">
                    {product.name}
                  </h3>
                </div>
                {selectedOptionSummary ? (
                  <span className="rounded-full border border-[#ead8ca] bg-[#fffaf6] px-3 py-2 text-xs font-bold text-[#6b4a3c]">
                    {selectedOptionSummary}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 space-y-3">
                {commonPrice}
                {discountAmount > 0 ? (
                  <p className="text-sm font-bold text-[#8f5c44]">
                    {prefersArabicCopy
                      ? `وفر ${formatStorefrontCurrency(discountAmount, currency)} على سعر القطعة الحالي.`
                      : `Save ${formatStorefrontCurrency(discountAmount, currency)} on the current piece.`}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {giftFactCards.map((fact, index) => (
                  <div
                    key={`${String(fact.label)}-${index}`}
                    className="rounded-[1.1rem] border border-[#ead8ca] bg-[#fffaf6] px-4 py-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-sm font-black leading-6 text-[#2d211e]">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {commonVariantSelector ? (
              <div className="rounded-[1.65rem] border border-[#ead8ca] bg-white/96 p-5 shadow-[0_22px_60px_-48px_rgba(91,57,40,0.14)]">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="rounded-[1.65rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffefb,#fff7f0)] p-5 shadow-[0_24px_64px_-50px_rgba(91,57,40,0.18)]">
              <div className="lg:hidden">{compactMobileCommerceActions}</div>
              <div className="hidden lg:block">{commonActionsWithRef}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-[1.45rem] border border-[#ead8ca] bg-[#fffaf6] p-4">
                <p className="text-sm font-black text-[#2d211e]">{shippingTitle}</p>
                <p className="mt-2 text-sm leading-7 text-[#6f5a54]">{shippingText}</p>
              </div>
              <div className="rounded-[1.45rem] border border-[#ead8ca] bg-[#fffaf6] p-4">
                <p className="text-sm font-black text-[#2d211e]">{guaranteesTitle}</p>
                <div className="mt-3 space-y-2">
                  {giftSupportCards.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className="rounded-[1rem] border border-[#efe0d4] bg-white/88 px-3 py-3"
                    >
                      <p className="text-sm font-bold text-[#2d211e]">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#6f5a54]">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="rounded-[1.45rem] border border-[#ead8ca] bg-white/96 p-4 shadow-[0_18px_44px_-34px_rgba(91,57,40,0.12)]">
                <p className="text-sm font-black text-[#2d211e]">
                  {isPetCommerce
                    ? prefersArabicCopy
                      ? 'تفاصيل المنتج'
                      : 'Product details'
                    : isGarageCommerce
                      ? prefersArabicCopy
                        ? 'تفاصيل التوافق'
                        : 'Fitment details'
                    : isWatchCommerce
                      ? prefersArabicCopy
                        ? 'تفاصيل الساعة'
                        : 'Watch details'
                    : prefersArabicCopy
                      ? 'تفاصيل القطعة'
                      : 'Piece details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-[1rem] border border-[#efe0d4] bg-[#fffaf6] px-3 py-3"
                    >
                      <span className="text-sm font-bold text-[#6b4a3c]">{spec.label}</span>
                      <span className="text-sm font-black text-[#2d211e]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {showStickyMobileAddToCart ? (
          <>
            <div className="h-24 lg:hidden" aria-hidden="true" />
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ead8ca] bg-[rgba(255,251,247,0.96)] px-3 py-3 shadow-[0_-24px_60px_-40px_rgba(91,57,40,0.32)] backdrop-blur lg:hidden">
              <div className="mx-auto flex max-w-md items-center gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
                    {prefersArabicCopy ? 'السعر الحالي' : 'Current price'}
                  </p>
                  <p className="mt-1 text-sm font-black text-[#2d211e]">{displayPrice}</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 h-12 rounded-xl bg-primary px-4 text-sm font-black uppercase tracking-[0.18em] text-primary-foreground shadow-[0_18px_44px_-26px_hsl(var(--primary)/0.48)] transition-transform hover:opacity-95 active:scale-[0.98]"
                >
                  {addToCartText}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </>
    );
  }

  if (isAnyElessiBuybox) {
    const elessiIntroBadge = isElessiGiftBuybox
      ? prefersArabicCopy
        ? 'اختيار الهدية'
        : 'Gift setup'
      : isElessiSpecBuybox
        ? prefersArabicCopy
          ? 'قرار المواصفات'
          : 'Spec summary'
        : isElessiCareBuybox
          ? prefersArabicCopy
            ? 'العناية والدعم'
            : 'Care & support'
          : prefersArabicCopy
            ? 'ملخص الشراء'
            : 'Purchase summary';
    const elessiStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : null,
      isElessiGiftBuybox
        ? prefersArabicCopy
          ? 'جاهز للإهداء'
          : 'Gift-ready'
        : isElessiSpecBuybox
          ? prefersArabicCopy
            ? 'مواصفات أوضح'
            : 'Spec-led'
          : isElessiCareBuybox
            ? prefersArabicCopy
              ? 'خدمة أقرب'
              : 'Care-led'
            : prefersArabicCopy
              ? 'قرار أسرع'
              : 'Quick decision',
      ...productTagValues.slice(0, 2),
    ].filter(Boolean) as string[];
    const elessiSupportCards = (
      guaranteeItems.length
        ? guaranteeItems
        : [
            {
              title: prefersArabicCopy ? 'شحن واضح' : 'Clear shipping',
              description: prefersArabicCopy
                ? 'رسوم الشحن والتوصيل تظهر بوضوح داخل المسار.'
                : 'Shipping cost and delivery details stay visible in the flow.',
            },
            {
              title: prefersArabicCopy ? 'ثقة أعلى' : 'More confidence',
              description: prefersArabicCopy
                ? 'صور، اختيارات، وسعر أوضح قبل الحسم.'
                : 'Visuals, options, and price remain clearer before checkout.',
            },
            {
              title: prefersArabicCopy ? 'خدمة بعد الشراء' : 'After-purchase support',
              description: prefersArabicCopy
                ? 'سياسة الاستبدال والدعم أقرب لقرار الشراء.'
                : 'Exchange policy and support stay close to the purchase decision.',
            },
          ]
    ).slice(0, 3);
    const shouldUseInlineOrderFormOnly =
      isKhemetInlineQuickOrderBuybox && Boolean(mergedInlinePdpQuickOrder);
    const showStickyMobileAddToCart =
      isElessiCareBuybox &&
      shouldRenderPrimaryBuyBox &&
      !externalOnlyProduct &&
      !isGalleryZoomOpen &&
      !isInlineQuickOrderVisible &&
      !isCartOpen;
    const canOpenMobileVariantSheet =
      showStickyMobileAddToCart && Boolean(product.productVariants?.length);
    const shouldOpenMobileVariantSheetFromSticky =
      shouldProductInfoMobileStickyOpenVariantSheet(
        canOpenMobileVariantSheet,
        Boolean(selectedVariant),
      );
    const elessiSocialProofItems = initialElessiSocialProofItems;
    const activeElessiSocialProof =
      elessiSocialProofItems.length > 0
        ? elessiSocialProofItems[elessiSocialProofStep % elessiSocialProofItems.length]
        : null;
    const mobileBulkDiscountSource =
      selectedVariant && getProductVolumeDiscounts(selectedVariant).length > 0
        ? getProductVolumeDiscounts(selectedVariant)
        : getProductVolumeDiscounts(product);
    const mobileBulkSavingsOffers = (() => {
      const unitPrice =
        typeof selectedVariant?.price === 'number' && Number.isFinite(selectedVariant.price)
          ? selectedVariant.price
          : Number(product.price) || 0;

      if (unitPrice <= 0) {
        return [];
      }

      const breakpointQuantities = Array.from(
        new Set([1, ...mobileBulkDiscountSource.map((discount) => Math.max(1, discount.minQuantity))]),
      )
        .sort((left, right) => left - right)
        .slice(0, 3);

      if (breakpointQuantities.length <= 1) {
        return [];
      }

      const nextBreakpoints = [...breakpointQuantities.slice(1), Number.POSITIVE_INFINITY];

      return breakpointQuantities.map((offerQuantity, index) => {
        const pricing = calculateVolumeDiscountPricing({
          unitPrice,
          quantity: offerQuantity,
          discounts: mobileBulkDiscountSource,
        });
        const nextBreakpoint = nextBreakpoints[index];
        const isSelected =
          quantity >= offerQuantity &&
          (Number.isFinite(nextBreakpoint) ? quantity < nextBreakpoint : true);

        return {
          id: `mobile-bulk-${offerQuantity}`,
          quantity: offerQuantity,
          label:
            offerQuantity === 1
              ? prefersArabicCopy
                ? 'قطعة 1'
                : 'BUY 1'
              : Number.isFinite(nextBreakpoint)
                ? prefersArabicCopy
                  ? `${offerQuantity} قطع`
                  : `BUY ${offerQuantity}`
                : prefersArabicCopy
                  ? `${offerQuantity}+ قطع`
                  : `BUY ${offerQuantity}+`,
          unitPriceText: prefersArabicCopy
            ? `${formatStorefrontCurrency(pricing.effectiveUnitPrice, currency)} للوحدة`
            : `${formatStorefrontCurrency(pricing.effectiveUnitPrice, currency)} each`,
          helperText:
            pricing.totalDiscount > 0
              ? prefersArabicCopy
                ? `وفري ${formatStorefrontCurrency(pricing.totalDiscount, currency)}`
                : `Save ${formatStorefrontCurrency(pricing.totalDiscount, currency)}`
              : undefined,
          isSelected,
        };
      });
    })();
    const mobileVariantSheet = canOpenMobileVariantSheet ? (
      <MobileVariantSheet
        open={isMobileVariantSheetOpen}
        onOpenChange={setIsMobileVariantSheetOpen}
        mode={mobileVariantSheetMode}
        productName={product.name}
        imageUrl={selectedPrimaryImage}
        displayPrice={displayPrice}
        selectedOptionSummary={selectedOptionSummary}
        variants={product.productVariants || []}
        selectedAttributes={selectedAttributes}
        onVariantChange={setSelectedAttributes}
        variantSettings={elessiVariantSettings}
        quantity={quantity}
        onQuantityChange={setQuantity}
        primaryActionText={
          mobileVariantSheetMode === 'checkout' ? buyNowText : addToCartText
        }
        onPrimaryAction={
          mobileVariantSheetMode === 'checkout' ? handleBuyNow : handleAddToCart
        }
        sizeGuideText={sizeGuideText}
        onOpenSizeGuide={canOpenSizeGuide ? () => setIsSizeGuideDialogOpen(true) : undefined}
        availabilityText={stockStatusLabel}
        prefersArabicCopy={prefersArabicCopy}
        bulkSavingsOffers={mobileBulkSavingsOffers}
        onSelectBulkSavingsOffer={setQuantity}
      />
    ) : null;

    const elessiExtendedSupportCards = (
      supportSections.length
        ? supportSections
        : elessiSupportCards.map((item) => ({
            label: '',
            title: item.title,
            description: item.description,
          }))
    ).slice(0, 3);
    const elessiRatingSummary = commonRatingValue ? (
      <button
        type="button"
        onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
        className="inline-flex items-center gap-2 rounded-full border border-[#e7d8c8] bg-[#fffdfb] px-3 py-1.5 text-sm text-[#6f5a54] shadow-[0_1px_0_rgba(45,33,30,0.02)] transition-colors hover:border-[#d3b8a9] hover:text-[#2d211e]"
      >
        <span className="text-[#d49011] tracking-tight">★★★★★</span>
        <span className="font-black text-[#2d211e]">{commonRatingValue.toFixed(1)}</span>
        <span className="text-muted-foreground">
          {prefersArabicCopy
            ? `(${commonReviewCount} تقييم)`
            : `(${commonReviewCount} reviews)`}
        </span>
      </button>
    ) : null;
    const elessiBrandSpotlightCard = (() => {
      const spotlightTitle = brandSpotlight?.title || brandName;
      const spotlightHref = brandSpotlight?.href || brandUrl;

      if (!spotlightTitle) {
        return null;
      }

      const spotlightContent = (
        <>
          {brandSpotlight?.image ? (
            <img
              src={brandSpotlight.image}
              alt={spotlightTitle}
              className="h-5 w-5 rounded-full border border-[#ead8ca] object-cover"
            />
          ) : null}
          <span className="text-xs font-black text-[#2d211e]">{spotlightTitle}</span>
        </>
      );

      const className =
        'inline-flex items-center gap-2 rounded-full border border-[#ead8ca] bg-[#fffaf6] px-3 py-1.5 transition-colors hover:border-[#d3b8a9]';

      if (spotlightHref) {
        return isExternalHref(spotlightHref) ? (
          <a href={spotlightHref} target="_blank" rel="noreferrer" className={className}>
            {spotlightContent}
          </a>
        ) : (
          <Link to={spotlightHref} reloadDocument className={className}>
            {spotlightContent}
          </Link>
        );
      }

      return <div className={className}>{spotlightContent}</div>;
    })();
    const elessiPrimaryActionsWithRef = shouldUseInlineOrderFormOnly ? null : externalOnlyProduct ? (
      <div
        ref={buyActionsRef}
        id={!hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
        className="flex flex-col gap-3"
      >
        {renderExternalPurchaseCta('card')}
      </div>
    ) : shouldRenderPrimaryBuyBox ? (
      <div
        ref={buyActionsRef}
        id={!hasEmbeddedPdpCheckout ? STOREFRONT_BUYBOX_ID : undefined}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <QuantitySelector value={quantity} onChange={setQuantity} />
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleAddToCart}
              className="h-14 rounded-[0.95rem] bg-primary px-4 text-sm font-black uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:opacity-95"
            >
              {addToCartText}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="h-14 rounded-[0.95rem] bg-[#78aa00] px-4 text-sm font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#6e9b00]"
            >
              {buyNowText}
            </button>
          </div>
        </div>
      </div>
    ) : null;
    const elessiPersonalizationPanel =
      personalizationEnabled && personalizationFields.length > 0 ? (
        <details className="group space-y-0 rounded-[0.6rem] border border-[#ead8ca] bg-white/60 overflow-hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 select-none">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 shrink-0 rounded-full border border-[#ead8ca] bg-white group-open:bg-[#8f5c44] group-open:border-[#8f5c44] transition-colors" />
              <div className="space-y-1">
                <p className="text-sm font-black text-[#2d211e]">{personalizationTitle}</p>
                {personalizationSubtitle ? (
                  <p className="text-sm leading-6 text-[#6f5a54]">{personalizationSubtitle}</p>
                ) : null}
              </div>
            </div>
            <svg className="h-4 w-4 shrink-0 text-[#8f5c44] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </summary>

          <div className="grid gap-3 border-t border-[#efe0d4] p-4 sm:grid-cols-2">
            {personalizationFields.map((field) => (
              <label key={`elessi-personalization-${field.key}`} className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8f5c44]">
                  {field.label}
                </span>
                <select
                  value={selectedPersonalizationOptions[field.key] || field.options[0] || ''}
                  onChange={(event) => updatePersonalizationOption(field.key, event.target.value)}
                  className="h-11 rounded-[0.95rem] border border-[#ead8ca] bg-white px-3 text-sm font-medium text-[#2d211e] outline-none transition-colors focus:border-[#8f5c44]"
                >
                  {field.options.map((option) => (
                    <option key={`${field.key}-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <label className="grid gap-1.5 sm:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8f5c44]">
                {personalizationTextLabel}
              </span>
              <input
                type="text"
                value={personalizationText}
                onChange={(event) =>
                  setPersonalizationText(event.target.value.slice(0, personalizationMaxLength))
                }
                placeholder={personalizationTextPlaceholder}
                className="h-11 rounded-[0.95rem] border border-[#ead8ca] bg-white px-3 text-sm font-medium text-[#2d211e] outline-none transition-colors placeholder:text-[#9e857a] focus:border-[#8f5c44]"
              />
            </label>
          </div>
        </details>
      ) : null;
    const hasElessiLowerDetails =
      (Boolean(safeDescription) && !shouldHideDuplicateDescriptionSection) ||
      featureHighlights.length > 0 ||
      safeCheckoutItems.length > 0 ||
      elessiExtendedSupportCards.length > 0 ||
      elessiMetadataRows.length > 0;

    return (
      <>
        {sizeGuideDialog}
        {shippingPolicyDialog}
        {questionDialog}
        {mobileVariantSheet}
        <section className="w-full overflow-hidden px-1 py-1.5 sm:py-4">
          <div className={isKhemetLuxeTheme ? "space-y-2.5 sm:space-y-4" : "space-y-3.5 sm:space-y-5"}>
            {commonHeader}

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 border-b border-[#ead8ca] pb-2.5 sm:pb-4">
              {elessiRatingSummary}
              {elessiBrandSpotlightCard}
            </div>

            <div className="space-y-2.5 sm:space-y-4 border-b border-[#ead8ca] pb-3 sm:pb-5">
              {commonPrice}
              {!isKhemetInlineQuickOrderBuybox && activeElessiSocialProof ? (
                <StaticMotionDiv
                  key={`${activeElessiSocialProof.key}-${elessiSocialProofStep}-${activeElessiSocialProof.label}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  data-testid="elessi-social-proof-ticker"
                  aria-live="polite"
                  className="flex items-center gap-2 text-sm font-bold text-[#8f5c44]"
                >
                  <StaticMotionSpan
                    aria-hidden="true"
                    animate={
                      activeElessiSocialProof.key === 'sold'
                        ? { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }
                        : { opacity: [0.55, 1, 0.55], y: [0, -1, 0] }
                    }
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    className={`inline-flex text-base leading-none ${activeElessiSocialProof.accentClassName}`}
                  >
                    {activeElessiSocialProof.emoji}
                  </StaticMotionSpan>
                  <span>{activeElessiSocialProof.label}</span>
                </StaticMotionDiv>
              ) : null}
              {!isKhemetInlineQuickOrderBuybox ? elessiLowStockNotice : null}
              {!isKhemetInlineQuickOrderBuybox &&
              (!safeDescription ||
              !isKhemetLuxeTheme ||
              shouldHideDuplicateDescriptionSection) ? (
                <p className="text-sm leading-7 text-[#6f5a54]">
                  {shortDescription || descriptionPreviewText}
                </p>
              ) : null}
              {brandSubtitle ? (
                <p className="text-sm leading-6 text-[#8f5c44]">{brandSubtitle}</p>
              ) : null}
              {shouldHideDuplicateDescriptionSection || isKhemetInlineQuickOrderBuybox ? null : (
                <button
                  type="button"
                  onClick={() => {
                    setElessiLowerSection('details');
                    queueQuickScroll(STOREFRONT_PRODUCT_DESCRIPTION_ID, 'start');
                  }}
                  className="inline-flex items-center gap-2 text-sm font-black text-[#8f5c44] transition-colors hover:text-[#2d211e]"
                >
                  {readMoreText}
                </button>
              )}
              {elessiSaleCountdown && !isKhemetInlineQuickOrderBuybox ? (
                <div className="border-t border-[#efe0d4] pt-3 sm:pt-4">
                  <div className="flex items-center justify-end gap-2 text-[16px] font-black text-[#2d211e]">
                    <StaticMotionSpan
                      animate={{ rotate: [0, -12, 10, 0], scale: [1, 1.06, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      className="inline-flex text-[#c59a7a]"
                    >
                      <AlarmClock className="h-[15px] w-[15px]" />
                    </StaticMotionSpan>
                    <span>{elessiSaleCountdown.label}</span>
                  </div>
                  <div dir="ltr" className="mt-3 grid grid-cols-4 gap-2.5 sm:gap-3">
                    {elessiSaleCountdown.units.map((unit) => (
                      <StaticMotionDiv
                        key={`${unit.key}-${unit.value}`}
                        initial={{ opacity: 0.7, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="rounded-[1.05rem] border border-[#e7d8cb] bg-[linear-gradient(180deg,#fffdfa_0%,#fcf7f1_100%)] px-2.5 py-3 text-center shadow-[0_1px_0_rgba(45,33,30,0.02)]"
                      >
                        <div className="text-[22px] font-black leading-none tracking-[0.02em] text-[#2d211e] tabular-nums">
                          {unit.value}
                        </div>
                        <div className="mt-2 text-[10px] font-semibold tracking-[0.04em] text-[#967a6c]">
                          {unit.label}
                        </div>
                      </StaticMotionDiv>
                    ))}
                  </div>
                  <p className="sr-only">
                    {prefersArabicCopy
                      ? `العرض الحالي ينتهي في ${elessiSaleCountdown.srDateLabel}`
                      : `Current offer ends on ${elessiSaleCountdown.srDateLabel}`}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 border-b border-[#ead8ca] pb-5">
              <div>{elessiVariantSelector}</div>
              {elessiPersonalizationPanel ? (
                <div className='border-t border-[#efe0d4] pt-3 sm:pt-4'>
                  {elessiPersonalizationPanel}
                </div>
              ) : null}
              <div className='border-t border-[#efe0d4] pt-3 sm:pt-4'>
                {elessiPrimaryActionsWithRef}
                {mergedInlinePdpQuickOrder ? (
                  <div className={shouldUseInlineOrderFormOnly ? "" : "pt-3 sm:pt-4"}>
                    {mergedInlinePdpQuickOrder}
                  </div>
                ) : null}
                <div className="mt-3.5 flex flex-wrap items-center justify-around gap-2 rounded-[0.95rem] border border-[#ead8ca]/70 bg-[#fffdfa] px-3 py-2.5 text-[11px] font-bold text-[#6f5a54] sm:text-xs">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-[#8f5c44]" />
                    <span>{prefersArabicCopy ? 'شحن 48 ساعة' : '48h Shipping'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#8f5c44]" />
                    <span>{prefersArabicCopy ? 'معاينة وقياس مع المندوب' : 'Inspect before paying'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5 text-[#8f5c44]" />
                    <span>{prefersArabicCopy ? 'استبدال 14 يوم' : '14-Day Exchange'}</span>
                  </div>
                </div>
              </div>
            </div>

            {elessiUtilityRail}
            {inlinePdpQuickOrderBeforeDescription ? (
              <div className="pt-1 sm:pt-2">{inlinePdpQuickOrderBeforeDescription}</div>
            ) : null}
          </div>
        </section>

        {hasElessiLowerDetails ? (
          <section id={elessiLowerPanelsAnchorId} className="w-full px-1 pb-3 sm:pb-4">
            <div className="space-y-4 sm:space-y-5 border-t border-[#ead8ca] pt-4 sm:pt-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setElessiLowerSection('details')}
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-black transition-colors ${
                    elessiLowerSection === 'details'
                      ? 'border-[#d3b8a9] bg-[#fff8f2] text-[#2d211e]'
                      : 'border-[#ead8ca] bg-white text-[#6f5a54] hover:border-[#d3b8a9] hover:bg-[#fff8f2] hover:text-[#2d211e]'
                  }`}
                >
                  {descriptionTitle}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickScroll(STOREFRONT_REVIEWS_SECTION_ID, 'start')}
                  className="inline-flex items-center justify-center rounded-full border border-[#ead8ca] bg-white px-4 py-2 text-xs font-black text-[#2d211e] transition-colors hover:border-[#d3b8a9] hover:bg-[#fff8f2]"
                >
                  {reviewsTabLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setElessiLowerSection('support')}
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-black transition-colors ${
                    elessiLowerSection === 'support'
                      ? 'border-[#d3b8a9] bg-[#fff8f2] text-[#2d211e]'
                      : 'border-[#ead8ca] bg-white text-[#6f5a54] hover:border-[#d3b8a9] hover:bg-[#fff8f2] hover:text-[#2d211e]'
                  }`}
                >
                  {prefersArabicCopy ? 'الضمان والخدمة' : 'Support & warranty'}
                </button>
              </div>

              {elessiLowerSection === 'details' ? (
                <div id={STOREFRONT_PRODUCT_DESCRIPTION_ID} className="space-y-4 border-b border-[#ead8ca] pb-5">
                  {shouldHideDuplicateDescriptionSection ? null : (
                    <ProductDescription
                      safeDescription={safeDescription}
                      emptyText={descriptionPreviewText}
                    />
                  )}
                  {featureHighlights.length ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      {featureHighlights.slice(0, 3).map((item) => (
                        <div
                          key={item.title}
                          className="space-y-2 border-s-2 border-[#ead8ca] ps-3"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#8f5c44]" />
                            <p className="text-sm font-black text-[#2d211e]">{item.title}</p>
                          </div>
                          <p className="text-sm leading-6 text-[#6f5a54]">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {inlinePdpQuickOrderAfterDescription ? (
                    <div>{inlinePdpQuickOrderAfterDescription}</div>
                  ) : null}
                </div>
              ) : null}

              {elessiLowerSection === 'support' && (elessiExtendedSupportCards.length || safeCheckoutItems.length || elessiMetadataRows.length) ? (
                <div id={elessiSupportAnchorId} className="space-y-4">
                  {safeCheckoutItems.length ? (
                    <div className="flex flex-wrap gap-2">
                      {safeCheckoutItems.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-2 rounded-full border border-[#ead8ca] bg-[#fffaf6] px-3 py-2 text-xs font-black text-[#5f473e]"
                        >
                          <BadgeCheck className="h-4 w-4 text-[#8f5c44]" />
                          <span>{item}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {elessiExtendedSupportCards.length ? (
                    <div className="grid gap-4 border-b border-[#ead8ca] pb-5 md:grid-cols-3">
                      {elessiExtendedSupportCards.map((item) => (
                        <div
                          key={`${item.title}-${item.label}`}
                          className="space-y-2 border-s-2 border-[#ead8ca] ps-3"
                        >
                          {item.label ? (
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
                              {item.label}
                            </p>
                          ) : null}
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-[#8f5c44]" />
                            <p className="text-sm font-black text-[#2d211e]">{item.title}</p>
                          </div>
                          <p className="text-sm leading-6 text-[#6f5a54]">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {elessiMetadataRows.length ? (
                    <div className="space-y-3">
                      <div className="divide-y divide-[#ead8ca] border-y border-[#ead8ca]">
                        {elessiMetadataRows.map((row) => (
                          <div
                            key={row.label}
                            className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between"
                          >
                            <span className="text-xs font-black uppercase tracking-[0.14em] text-[#8f5c44]">
                              {row.label}
                            </span>
                            <span className="text-sm font-medium text-[#2d211e]">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {showStickyMobileAddToCart ? (
          <>
            <div
              className={
                isKhemetLuxeTheme
                  ? "h-[calc(3.5rem+env(safe-area-inset-bottom))] lg:hidden"
                  : "h-28 lg:hidden"
              }
              aria-hidden="true"
            />
            <div
              className={
                isKhemetLuxeTheme
                  ? "fixed inset-x-0 bottom-0 z-40 border-t border-[#ead8ca] bg-[rgba(255,251,247,0.96)] pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_46px_-36px_rgba(91,57,40,0.28)] backdrop-blur lg:hidden"
                  : "fixed inset-x-0 bottom-0 z-40 border-t border-[#ead8ca] bg-[rgba(255,251,247,0.96)] px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-24px_60px_-40px_rgba(91,57,40,0.32)] backdrop-blur lg:hidden"
              }
            >
              {!isKhemetLuxeTheme ? (
                <div className="mx-auto mb-2 flex max-w-md items-center justify-between gap-3 px-0.5 text-start">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-black leading-5 text-[#2d211e]">
                      {product.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-bold text-[#8f5c44]">
                      {displayPrice}
                      {selectedOptionSummary ? ` / ${selectedOptionSummary}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#d8c3b4] bg-white px-2.5 py-1 text-[10px] font-black text-[#5f473e]">
                    {prefersArabicCopy ? '\u062C\u0627\u0647\u0632 \u0644\u0644\u0634\u062D\u0646' : 'Ready'}
                  </span>
                </div>
              ) : null}
              {shouldOpenMobileVariantSheetFromSticky ? (
                <div
                  className={
                    isKhemetLuxeTheme
                      ? "w-full"
                      : "mx-auto max-w-md overflow-hidden rounded-[1.1rem] shadow-[0_18px_44px_-30px_rgba(91,57,40,0.24)]"
                  }
                >
                  <div className="grid grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileVariantSheetMode('cart');
                        setIsMobileVariantSheetOpen(true);
                      }}
                      className={`${isKhemetLuxeTheme ? 'h-14 text-sm tracking-normal' : 'h-12 text-[11px] uppercase tracking-[0.18em]'} bg-primary px-4 font-black text-primary-foreground transition-opacity hover:opacity-95 active:opacity-90`}
                    >
                      {addToCartText}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileVariantSheetMode('checkout');
                        setIsMobileVariantSheetOpen(true);
                      }}
                      className={`${isKhemetLuxeTheme ? 'h-14 text-sm tracking-normal' : 'h-12 text-[11px] uppercase tracking-[0.18em]'} border-s border-white/10 bg-[#78aa00] px-4 font-black text-white transition-colors hover:bg-[#6d9a01]`}
                    >
                      {buyNowText}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={
                    isKhemetLuxeTheme
                      ? "w-full"
                      : "mx-auto max-w-md overflow-hidden rounded-[1.1rem] shadow-[0_18px_44px_-30px_rgba(91,57,40,0.24)]"
                  }
                >
                  <div className="grid grid-cols-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className={`${isKhemetLuxeTheme ? 'h-14 tracking-normal' : 'h-12 uppercase tracking-[0.18em]'} bg-primary px-4 text-sm font-black text-primary-foreground transition-opacity hover:opacity-95 active:opacity-90`}
                    >
                      {addToCartText}
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className={`${isKhemetLuxeTheme ? 'h-14 tracking-normal' : 'h-12 uppercase tracking-[0.18em]'} border-s border-white/10 bg-[#78aa00] px-4 text-sm font-black text-white transition-colors hover:bg-[#6d9a01]`}
                    >
                      {buyNowText}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </>
    );
  }

  if (isElessiDigitalBuybox) {
    const digitalFacts = (
      commandFacts.length > 0
        ? commandFacts
        : specs.length > 0
          ? specs
          : [
              {
                label: prefersArabicCopy ? 'السعر الحالي' : 'Current price',
                value: displayPrice,
              },
              {
                label: prefersArabicCopy ? 'الضمان' : 'Warranty',
                value: prefersArabicCopy ? 'موضح قبل الطلب' : 'Shown before checkout',
              },
              {
                label: prefersArabicCopy ? 'الشحن' : 'Shipping',
                value: prefersArabicCopy ? '24-48 ساعة' : '24-48 hours',
              },
              {
                label: prefersArabicCopy ? 'الدعم' : 'Support',
                value:
                  guaranteeItems[0]?.title?.trim() ||
                  (prefersArabicCopy ? 'دعم واضح بعد الشراء' : 'Clear post-purchase support'),
              },
            ]
    ).slice(0, 4);
    const digitalSupportCards = (
      guaranteeItems.length
        ? guaranteeItems
        : [
            {
              title: prefersArabicCopy ? 'شحن سريع' : 'Fast shipping',
              description: prefersArabicCopy
                ? 'خيارات التوصيل والرسوم تظهر بوضوح قبل إغلاق الطلب.'
                : 'Delivery choices and cost stay visible before checkout closes.',
            },
            {
              title: prefersArabicCopy ? 'ضمان موثق' : 'Documented warranty',
              description: prefersArabicCopy
                ? 'مدة الضمان والدعم الفني أقرب لزر الإضافة.'
                : 'Warranty duration and support stay close to the add-to-cart action.',
            },
            {
              title: prefersArabicCopy ? 'اختيار أسهل' : 'Faster selection',
              description: prefersArabicCopy
                ? 'المواصفات والنسخ الأساسية تبقى ظاهرة طوال مسار القرار.'
                : 'Core specs and configurations remain visible throughout the decision flow.',
            },
          ]
    ).slice(0, 3);
    const digitalStatusChips = [
      discount && discount > 0
        ? prefersArabicCopy
          ? `وفر ${discount}%`
          : `Save ${discount}%`
        : null,
      stockStatusLabel,
      ...productTagValues.slice(0, 2),
    ].filter(Boolean) as string[];

    return (
      <section className="w-full overflow-hidden px-1 py-4">
        <div className="overflow-hidden border border-[#e4e9f0] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] shadow-[0_30px_86px_-64px_rgba(15,23,42,0.18)]">
          <div className="hidden">
            <div className="space-y-3">
              <span className="inline-flex border border-[#dce3ec] bg-white px-3 py-1 text-[11px] font-black tracking-[0.14em] text-[#516170]">
                {prefersArabicCopy ? 'اختيار تقني موثوق' : 'Trusted tech pick'}
              </span>
              <h2 className="max-w-[16ch] font-heading text-3xl font-black tracking-tight text-[#161c26] md:text-[2.2rem]">
                {prefersArabicCopy ? 'المواصفات الأقرب للحسم' : 'Specs closest to the decision'}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[#536172] md:text-base">
                {shortDescription || descriptionPreviewText}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {digitalStatusChips.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="border border-[#e4e9f0] bg-[#fbfcfe] px-3 py-1.5 text-xs font-bold text-[#516170]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {digitalFacts.map((fact, index) => (
                <div
                  key={`${String(fact.label)}-${index}`}
                  className="border border-[#dce3ec] bg-white px-4 py-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.1)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7a8595]">
                    {fact.label}
                  </p>
                  <p className="mt-2 text-sm font-black leading-6 text-[#161c26]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            {commonHeader}

            <div className="border border-[#e4e9f0] bg-white p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.08)]">
              <div className="space-y-3">
                {commonPrice}
                <p className="text-sm leading-7 text-[#536172]">
                  {shortDescription || descriptionPreviewText}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {digitalFacts.map((fact, index) => (
                <div
                  key={`${String(fact.label)}-${index}`}
                  className="border border-[#dce3ec] bg-[#fbfcfe] px-4 py-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.08)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7a8595]">
                    {fact.label}
                  </p>
                  <p className="mt-2 text-sm font-black leading-6 text-[#161c26]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            {commonVariantSelector ? (
              <div className="border border-[#e4e9f0] bg-white p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.08)]">
                {commonVariantSelector}
              </div>
            ) : null}

            <div className="border border-[#e4e9f0] bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.14)]">
              {commonActionsWithRef}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="border border-[#e4e9f0] bg-[#fbfcfe] p-4">
                <p className="text-sm font-black text-[#161c26]">{shippingTitle}</p>
                <p className="mt-2 text-sm leading-7 text-[#536172]">{shippingText}</p>
              </div>

              <div className="border border-[#e4e9f0] bg-white p-4">
                <p className="text-sm font-black text-[#161c26]">{guaranteesTitle}</p>
                <p className="mt-1 text-sm leading-6 text-[#607184]">{guaranteesSubtitle}</p>
                <div className="mt-3 space-y-2">
                  {digitalSupportCards.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="border border-[#edf1f6] bg-[#fbfcfe] px-3 py-3">
                      <p className="text-sm font-bold text-[#161c26]">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#536172]">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {specs.length > 0 ? (
              <div className="border border-[#e4e9f0] bg-[#fbfcfe] p-4">
                <p className="text-sm font-black text-[#161c26]">
                  {prefersArabicCopy ? 'تفاصيل سريعة' : 'Quick details'}
                </p>
                <div className="mt-3 space-y-2">
                  {specs.slice(0, 4).map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="flex items-start justify-between gap-3 border border-[#e4e9f0] bg-white px-3 py-3"
                    >
                      <span className="text-sm font-bold text-[#516170]">{spec.label}</span>
                      <span className="text-sm font-black text-[#161c26]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {showStickyMobileAddToCart ? (
          <StickyMobileCTA
            activePrice={activePrice}
            currency={currency}
            onAddToCart={handleAddToCart}
            isVisible={showStickyCta}
            label={prefersArabicCopy ? 'ابدئي الطلب' : 'Start checkout'}
          />
        ) : null}
      </section>
    );
  }

  return null;
};

export default ElessiThemeBuyboxes;