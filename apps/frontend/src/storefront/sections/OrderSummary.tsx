import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import Button from "../components/Button";
import StorefrontProductImage from "../components/StorefrontProductImage";
import QuantitySelector from "../components/QuantitySelector";
import {
  DEFAULT_STOREFRONT_CART_STORAGE_NAME,
  useCartStore,
} from "../store/useCartStore";
import { useCheckoutStore } from "../store/useCheckoutStore";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { useMinimumOrderSettings } from "../hooks/useMinimumOrderSettings";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { formatStorefrontCurrency } from "../utils/currency";
import { buildStorefrontPath } from "../utils/paths";
import { isKhemetLuxeTheme } from "../utils/navigationGuards";
import { getCartItemImageCandidates } from "../utils/productImages";
import { calculateVolumeDiscountPricing } from "../utils/volumeDiscounts";
import { storefrontApi } from "../../utils/storefrontApi";
import { trackStorefrontAppUsage } from "../utils/appUsageTracking";
import { useCheckoutShippingQuote } from "../hooks/useCheckoutShippingQuote";
import TierProgressBanner from "../components/TierProgressBanner";
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "../utils/marketplaceApps";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import {
  getActiveStorePromotionFromCompany,
  calculateStorePromotionDiscount,
} from "../utils/storePromotion";

type StorefrontSettingsRecord = Record<string, unknown>;

type CouponValidationError = {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
};

interface OrderSummaryProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    shippingHelpText?: string;
    couponPlaceholder?: string;
    couponButtonText?: string;
    checkoutButtonText?: string;
    subtotalLabel?: string;
    shippingLabel?: string;
    shippingValueText?: string;
    totalLabel?: string;
    secureCheckoutText?: string;
    returnsText?: string;
    freeShippingTitle?: string;
    freeShippingReachedText?: string;
    showTrustRow?: string | boolean;
    showCouponField?: string | boolean;
    showFreeShippingProgress?: string | boolean;
    hideCheckoutButton?: string | boolean;
    showLineItems?: string | boolean;
    lineItemsEditable?: string | boolean;
    lineItemsTitle?: string;
    showAssuranceCard?: string | boolean;
    showNextSteps?: string | boolean;
    headerBadge?: string;
    assuranceTitle?: string;
    assuranceItems?: string[] | string;
    nextStepsTitle?: string;
    nextSteps?: string[] | string;
    [key: string]: unknown;
  };
}

const normalizeVariant = (
  value: unknown,
):
  | "standard"
  | "highlighted"
  | "minimal"
  | "market-summary"
  | "nature-summary"
  | "command-summary"
  | "boutique-summary"
  | "fitting-room-summary" => {
  if (typeof value !== "string") {
    return "standard";
  }

  const normalizedValue = value.trim().toLowerCase();
  if (
    normalizedValue === "highlighted" ||
    normalizedValue === "minimal" ||
    normalizedValue === "standard" ||
    normalizedValue === "market-summary" ||
    normalizedValue === "nature-summary" ||
    normalizedValue === "command-summary" ||
    normalizedValue === "boutique-summary" ||
    normalizedValue === "fitting-room-summary"
  ) {
    return normalizedValue;
  }

  return "standard";
};

const parseBooleanSetting = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "true") {
      return true;
    }
    if (normalizedValue === "false") {
      return false;
    }
  }

  return fallback;
};

const parseListSetting = (value: unknown, fallback: string[]) => {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/,|\n/)
      : fallback;

  return items.map((item) => String(item).trim()).filter(Boolean);
};

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return numericValue;
};

const isSameAmount = (left: number, right: number) =>
  Math.abs(left - right) < 0.01;

const replaceCurrencyToken = (
  template: string,
  remainingAmount: number,
  currency: string,
) =>
  template.replace(
    "{{remaining}}",
    formatStorefrontCurrency(remainingAmount, currency),
  );

const DEFAULT_FREE_SHIPPING_MESSAGE_VARIANTS = [
  "Add {{remaining}} to unlock free shipping",
  "Add {{remaining}} to unlock free shipping!",
];

const DEFAULT_FREE_SHIPPING_REACHED_VARIANTS = ["You unlocked free shipping"];

const normalizeDirectionalCopy = (value: string) =>
  value.trim().replace(/\s+/g, " ");

const resolveDirectionalFreeShippingCopy = ({
  value,
  direction,
  rtlFallback,
  ltrFallback,
  knownEnglishDefaults,
}: {
  value: unknown;
  direction: "rtl" | "ltr";
  rtlFallback: string;
  ltrFallback: string;
  knownEnglishDefaults: string[];
}) => {
  if (typeof value !== "string" || !value.trim()) {
    return direction === "rtl" ? rtlFallback : ltrFallback;
  }

  const trimmedValue = value.trim();
  if (
    direction === "rtl" &&
    knownEnglishDefaults.some(
      (candidate) =>
        normalizeDirectionalCopy(candidate) ===
        normalizeDirectionalCopy(trimmedValue),
    )
  ) {
    return rtlFallback;
  }

  return trimmedValue;
};

const getCouponValidationMessage = (error: unknown) => {
  const candidate = error as CouponValidationError | null;
  return String(
    candidate?.response?.data?.error ||
      candidate?.message ||
      "تعذر التحقق من كود الخصم الآن.",
  );
};

const getPersistedCartItemCount = () => {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const rawCart = window.localStorage.getItem(
      DEFAULT_STOREFRONT_CART_STORAGE_NAME,
    );
    if (!rawCart) {
      return 0;
    }

    const parsedCart = JSON.parse(rawCart) as {
      state?: { items?: unknown[] };
    };

    return Array.isArray(parsedCart.state?.items)
      ? parsedCart.state.items.length
      : 0;
  } catch {
    return 0;
  }
};

const getWrapperClassName = (
  variant:
    | "standard"
    | "highlighted"
    | "minimal"
    | "market-summary"
    | "nature-summary"
    | "command-summary"
    | "boutique-summary"
    | "fitting-room-summary",
) => {
  switch (variant) {
    case "highlighted":
      return "rounded-[1.6rem] border border-border bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.26))] p-6 space-y-5 sticky top-24 shadow-[0_26px_80px_-55px_hsl(var(--primary)/0.35)]";
    case "minimal":
      return "rounded-[1.1rem] border border-border bg-background p-5 space-y-5 sticky top-24";
    case "market-summary":
      return "rounded-[2rem] border border-[#f0d4b0] bg-[linear-gradient(180deg,#fffdf8_0%,#fff6ec_54%,#ffffff_100%)] p-6 space-y-5 sticky top-24 shadow-[0_34px_100px_-76px_rgba(154,93,34,0.14)]";
    case "nature-summary":
      return "rounded-[2rem] border border-[#dbe3d4] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8f2_56%,#ffffff_100%)] p-6 space-y-5 sticky top-24 shadow-[0_34px_100px_-76px_rgba(26,51,40,0.14)]";
    case "command-summary":
      return "rounded-[2rem] border border-[#e7d7b6] bg-[linear-gradient(180deg,#fffdf9_0%,#fff7e9_54%,#ffffff_100%)] p-6 space-y-5 sticky top-24 shadow-[0_34px_100px_-76px_rgba(90,62,24,0.24)]";
    case "boutique-summary":
      return "rounded-[2rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffdfc_0%,#fff7f4_56%,#ffffff_100%)] p-6 space-y-5 sticky top-24 shadow-[0_34px_100px_-76px_rgba(107,33,49,0.14)]";
    case "fitting-room-summary":
      return "mx-auto w-full max-w-[25.5rem] rounded-[2.2rem] border border-[#efe5dd] bg-white p-5 space-y-4 shadow-[0_28px_90px_-52px_rgba(42,38,35,0.22)]";
    default:
      return "rounded-[var(--radius)] border border-border bg-card p-6 space-y-5 sticky top-24";
  }
};

const getProgressBarClassName = (
  variant:
    | "standard"
    | "highlighted"
    | "minimal"
    | "market-summary"
    | "nature-summary"
    | "command-summary"
    | "boutique-summary"
    | "fitting-room-summary",
) => {
  switch (variant) {
    case "highlighted":
      return "h-2 rounded-full bg-primary/10";
    case "minimal":
      return "h-1.5 rounded-full bg-muted";
    case "market-summary":
      return "h-2 rounded-full bg-[#f2dfc6]";
    case "nature-summary":
      return "h-2 rounded-full bg-[#dce4d5]";
    case "command-summary":
      return "h-2 rounded-full bg-[#eadcbc]";
    case "boutique-summary":
      return "h-2 rounded-full bg-[#f1dfdc]";
    case "fitting-room-summary":
      return "h-1.5 rounded-full bg-[#eee8e2]";
    default:
      return "h-2 rounded-full bg-muted";
  }
};

const OrderSummary: React.FC<OrderSummaryProps> = ({
  section,
  settings: sectionSettings,
}) => {
  const couponFieldId = React.useId();
  const [couponCode, setCouponCode] = useState("");
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  const location = useLocation();
  const { items, getSubtotal, hasQuantityOfferFreeShipping, updateQuantity } =
    useCartStore();
  const persistedCartItemCount =
    items.length === 0 ? getPersistedCartItemCount() : 0;
  const { appliedCoupon, setAppliedCoupon, clearAppliedCoupon, paymentMethod, pendingCouponCode, setPendingCouponCode } =
    useCheckoutStore();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const isAirlume = theme.id === "airlume-ai";
  const isZenOrganic = theme.id === "zen-organic";
  const isBiteRush = theme.id === "restaurant-demo";
  const isSproutRoom = theme.id === "elessi-sprout-room";
  const isWomenFashionSummary = theme.id === "women-fashion-eg";
  const isKhemetLuxe = isKhemetLuxeTheme(theme.id);
  const checkoutPath = buildStorefrontPath(
    location.pathname,
    "/checkout",
    location.search,
  );
  const subtotal = getSubtotal();
  const quantityOfferFreeShippingActive = hasQuantityOfferFreeShipping();
  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    "EGP";
  const minimumOrder = useMinimumOrderSettings(subtotal, currency);
  const prefersArabicCopy = theme.direction === "rtl";
  const variant = normalizeVariant(section?.variant);
  const isMarketSummary = variant === "market-summary";
  const isNatureSummary = variant === "nature-summary";
  const isCommandSummary = variant === "command-summary";
  const isBoutiqueSummary = variant === "boutique-summary";
  const isFittingRoomSummary = variant === "fitting-room-summary";
  const hasNatureSummaryTone = isZenOrganic || isNatureSummary;
  const hasEnhancedSummaryTone =
    isCommandSummary ||
    isBoutiqueSummary ||
    isFittingRoomSummary ||
    isMarketSummary ||
    isNatureSummary;
  const activeCoupon =
    appliedCoupon &&
    isSameAmount(Number(appliedCoupon.orderAmount || 0), subtotal)
      ? appliedCoupon
      : null;
  const storePromotion = getActiveStorePromotionFromCompany(
    storefrontSettings?.company,
  );
  const { discount: storePromotionDiscount, tier: storePromotionTier } =
    calculateStorePromotionDiscount(items, storePromotion);
  const couponDiscount = storePromotion?.disableOtherDiscounts
    ? 0
    : Number(activeCoupon?.discountAmount || 0);

  // مزايا مستوى الولاء (شحن مجاني + خصم تلقائي) — كل نظام مستقل (ممكن يشتغلوا مع بعض)
  const tierProgress = useCheckoutStore((s) => s.tierProgress);
  const tiersEnabled = tierProgress?.tiersEnabled === true;
  const autoDiscountEnabled = tierProgress?.autoDiscountEnabled === true;
  const loyaltyFreeShipping = tiersEnabled ? Boolean(tierProgress?.rewards?.freeShipping) : false;
  const loyaltyDiscountPercent = tiersEnabled ? Number(tierProgress?.rewards?.discountPercent || 0) : 0;
  let loyaltyDiscount =
    loyaltyDiscountPercent > 0 ? (Number(subtotal) || 0) * (loyaltyDiscountPercent / 100) : 0;
  let voucherDiscount =
    autoDiscountEnabled && tierProgress?.activeVoucher
      ? (Number(subtotal) || 0) * (Number(tierProgress.activeVoucher.percent) / 100)
      : 0;
  // مطابقة منطق الباك-إند: دمج الخصم حسب discountCombination + حد أقصى
  const combination = tierProgress?.discountCombination || 'ADDITIVE';
  const maxTotalPct = Number(tierProgress?.maxTotalDiscountPercent || 0);
  const base = Number(subtotal) || 0;
  let combined = 0;
  if (combination === 'BEST') {
    combined = Math.max(loyaltyDiscount, voucherDiscount);
  } else if (combination === 'COMPOUND') {
    const lp = base > 0 ? (loyaltyDiscount / base) * 100 : 0;
    const vp = base > 0 ? (voucherDiscount / base) * 100 : 0;
    combined = base * (1 - (1 - lp / 100) * (1 - vp / 100));
  } else {
    combined = loyaltyDiscount + voucherDiscount;
  }
  if (maxTotalPct > 0) {
    const cap = base * (maxTotalPct / 100);
    if (combined > cap) combined = cap;
  }
  if (combined !== loyaltyDiscount + voucherDiscount) {
    loyaltyDiscount = combined;
    voucherDiscount = 0;
  }

  const conversionEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    "conversion-suite",
  );
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    "conversion-suite",
  );
  const modules = useMemo(
    () =>
      (conversionSettings["modules"] as StorefrontSettingsRecord | undefined) ||
      {},
    [conversionSettings],
  );
  const thresholds = useMemo(
    () =>
      (conversionSettings["thresholds"] as
        | StorefrontSettingsRecord
        | undefined) || {},
    [conversionSettings],
  );
  const copy = useMemo(
    () =>
      (conversionSettings["copy"] as StorefrontSettingsRecord | undefined) ||
      {},
    [conversionSettings],
  );
  const conversionFreeShippingEnabled =
    conversionEnabled &&
    modules["freeShippingBar"] !== false &&
    parsePositiveNumber(thresholds["freeShippingAmount"], 0) > 0;
  const freeShippingEnabled =
    quantityOfferFreeShippingActive || conversionFreeShippingEnabled;
  const freeShippingAmount = parsePositiveNumber(
    thresholds["freeShippingAmount"],
    0,
  );
  const freeShippingRemaining = quantityOfferFreeShippingActive
    ? 0
    : Math.max(freeShippingAmount - subtotal, 0);
  const freeShippingProgress = quantityOfferFreeShippingActive
    ? 100
    : freeShippingEnabled && freeShippingAmount > 0
      ? Math.min((subtotal / freeShippingAmount) * 100, 100)
      : 0;

  const showTrustRow = parseBooleanSetting(sectionSettings?.showTrustRow, true);
  const showCouponField = !storePromotion?.disableOtherDiscounts && parseBooleanSetting(
    sectionSettings?.showCouponField,
    true,
  );
  const showFreeShippingProgress = parseBooleanSetting(
    sectionSettings?.showFreeShippingProgress,
    freeShippingEnabled,
  );
  const hideCheckoutButton = parseBooleanSetting(
    sectionSettings?.hideCheckoutButton,
    false,
  );
  const shouldShowAssuranceCard =
    hasEnhancedSummaryTone && (!isWomenFashionSummary || !hideCheckoutButton);
  const shouldShowNextStepsCard =
    hasEnhancedSummaryTone && !isWomenFashionSummary;
  const shouldShowTrustSummaryRow =
    showTrustRow && (!isWomenFashionSummary || !hideCheckoutButton);

  const trustedItems = useMemo(
    () =>
      String(copy["trustedBadgeItems"] || "")
        .split(/,|\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    [copy],
  );

  const title =
    typeof sectionSettings?.title === "string"
      ? sectionSettings.title
      : isBiteRush
        ? "مراجعة الطلب"
        : "ملخص السلة";
  const subtitle =
    typeof sectionSettings?.subtitle === "string"
      ? sectionSettings.subtitle
      : (() => {
          if (isSproutRoom) {
            return "إجمالي النباتات والإضافات المختارة مع شحن واضح وخطوة دفع أخيرة بسيطة.";
          }
          if (isBiteRush) {
            return "راجع الإجمالي، فعّل الخصم، ثم كمّل الطلب قبل ما يبرد.";
          }
          if (isMarketSummary) {
            return "ملخص واضح للسعر والشحن والخطوة التالية بطريقة مألوفة وسريعة.";
          }
          if (isNatureSummary) {
            return "ملخص هادئ يجمع السعر والشحن والخطوة التالية بدون ضوضاء بصرية.";
          }
          if (isCommandSummary) {
            return "سعر واضح، شحن محسوب، وخطوات متابعة ثابتة قبل اعتماد الطلب.";
          }
          if (isBoutiqueSummary) {
            return "ملخص هادئ يضم السعر والشحن والخطوة التالية من غير ازدحام بصري.";
          }
          return "ملخص مرتب يجمع السعر والشحن والكوبون في مكان واحد.";
        })();
  const shippingHelpText =
    sectionSettings?.shippingHelpText ||
    (isBiteRush
      ? "رسوم التوصيل تتثبت حسب المحافظة في خطوة الدفع التالية."
      : "سيظهر الشحن بعد اختيار المحافظة داخل صفحة الدفع.");
  const couponPlaceholder =
    sectionSettings?.couponPlaceholder ||
    (isBiteRush ? "عندك كود؟" : "كود الخصم");
  const couponButtonText =
    sectionSettings?.couponButtonText || (isBiteRush ? "فعّل" : "تطبيق");
  const checkoutButtonText =
    sectionSettings?.checkoutButtonText ||
    (isBiteRush ? "كمّل الطلب" : "إتمام الطلب");
  const subtotalLabel = sectionSettings?.subtotalLabel || "المجموع الفرعي";
  const shippingLabel = sectionSettings?.shippingLabel || "الشحن";
  const shippingValueText =
    sectionSettings?.shippingValueText || "يحسب عند الدفع";
  const totalLabel =
    sectionSettings?.totalLabel ||
    (isBiteRush ? "الإجمالي المتوقع الآن" : "الإجمالي المتوقع");
  const secureCheckoutText =
    sectionSettings?.secureCheckoutText ||
    (isBiteRush ? "إرسال آمن للطلب" : trustedItems[0]) ||
    "بياناتك محمية";
  const returnsText =
    sectionSettings?.returnsText ||
    (isBiteRush
      ? "دعم سريع لو احتجت تعديل"
      : trustedItems[trustedItems.length - 1]) ||
    "دعم سريع بعد الطلب";
  const freeShippingTitle =
    sectionSettings?.freeShippingTitle ||
    resolveDirectionalFreeShippingCopy({
      value: isBiteRush
        ? "أضف {{remaining}} للحصول على شحن مجاني"
        : copy["freeShippingMessage"],
      direction: prefersArabicCopy ? "rtl" : "ltr",
      rtlFallback: "أضف {{remaining}} للحصول على شحن مجاني",
      ltrFallback: "Add {{remaining}} to unlock free shipping",
      knownEnglishDefaults: DEFAULT_FREE_SHIPPING_MESSAGE_VARIANTS,
    });
  const freeShippingReachedText =
    sectionSettings?.freeShippingReachedText ||
    resolveDirectionalFreeShippingCopy({
      value: isBiteRush
        ? "رائع، تم تفعيل الشحن المجاني"
        : copy["freeShippingReachedMessage"],
      direction: prefersArabicCopy ? "rtl" : "ltr",
      rtlFallback: "رائع، تم تفعيل الشحن المجاني",
      ltrFallback: "You unlocked free shipping",
      knownEnglishDefaults: DEFAULT_FREE_SHIPPING_REACHED_VARIANTS,
    });
  const quantityOfferFreeShippingText =
    "تم تفعيل الشحن المجاني بواسطة عرض الكميات";
  const headerBadge =
    sectionSettings?.headerBadge !== undefined
      ? String(sectionSettings.headerBadge)
      : isSproutRoom
        ? "Order details"
        : isMarketSummary
          ? "مراجعة السلة"
          : isNatureSummary
            ? "خلاصة هادئة"
            : isCommandSummary
              ? "قرار الشراء"
              : isBoutiqueSummary
                ? "خلاصة الطلب"
                : undefined;
  const assuranceTitle =
    sectionSettings?.assuranceTitle ||
    (isSproutRoom
      ? "يشملك مع الطلب"
      : hasEnhancedSummaryTone
        ? "يشملك مع الطلب"
        : "نقاط ثقة");
  const assuranceItems = parseListSetting(sectionSettings?.assuranceItems, [
    ...(isSproutRoom
      ? [
          "تغليف مناسب للنباتات والأصص",
          "تأكيد المقاس أو ملاحظات الهدية قبل التجهيز",
          "دعم بعد الاستلام لو احتجت عناية إضافية",
        ]
      : isBoutiqueSummary
        ? [
            "تغليف مرتب يحافظ على القطعة أثناء الوصول",
            "مراجعة المقاس أو الملاحظة قبل التجهيز عند الحاجة",
            "متابعة واضحة حتى الاستلام",
          ]
        : isMarketSummary
          ? [
              "تأكيد واضح للعنوان ورقم الهاتف",
              "تثبيت تكلفة الشحن حسب المحافظة",
              "متابعة سريعة حتى الاستلام",
            ]
          : isNatureSummary
            ? [
                "تغليف مناسب للمنتجات الحساسة",
                "تأكيد هادئ للعناوين والملاحظات",
                "متابعة واضحة بعد الاستلام عند الحاجة",
              ]
            : [
                "تغليف محمي للأجهزة الحساسة",
                "ضمان مكتوب على القطع المعتمدة",
                "تأكيد هاتفي قبل الشحن عند الحاجة",
              ]),
  ]);
  const nextStepsTitle =
    sectionSettings?.nextStepsTitle ||
    (isSproutRoom
      ? "بعد تأكيد الطلب"
      : isMarketSummary
        ? "الخطوة التالية"
        : isNatureSummary
          ? "بعد المتابعة"
          : isCommandSummary
            ? "ما الذي يحدث بعد ذلك"
            : isBoutiqueSummary
              ? "بعد الضغط على المتابعة"
              : "الخطوة التالية");
  const nextSteps = parseListSetting(sectionSettings?.nextSteps, [
    ...(isSproutRoom
      ? [
          "نراجع العنوان والمقاس المطلوب قبل التجهيز",
          "نثبت تكلفة الشحن حسب المحافظة",
          "نرسل متابعة حتى التسليم أو الاستلام",
        ]
      : isBoutiqueSummary
        ? [
            "نراجع القطع والعنوان قبل التجهيز",
            "نثبت الشحن حسب المحافظة",
            "نرسل متابعة حتى الاستلام",
          ]
        : isMarketSummary
          ? [
              "نراجع العنوان قبل التنفيذ",
              "نثبت الشحن حسب المحافظة",
              "نرسل تحديثًا واضحًا حتى الاستلام",
            ]
          : isNatureSummary
            ? [
                "نراجع العنوان والملاحظات بهدوء",
                "نثبت الشحن النهائي بوضوح",
                "نتابع معك حتى التسليم",
              ]
            : [
                "نراجع الموديل والعنوان قبل التنفيذ",
                "نثبت تكلفة الشحن حسب المحافظة",
                "نرسل متابعة حتى الاستلام",
              ]),
  ]);
  const {
    shippingCost,
    freeShippingDiscount,
    shippingMessage,
    isShippingLoading,
    trimmedGovernorate,
    freeShippingActive: checkoutFreeShippingActive,
  } = useCheckoutShippingQuote({
    shippingPromptText: shippingHelpText,
    shippingCalculatedText: "تم حساب الشحن إلى {{governorate}} بنجاح.",
    noShippingChargeText: "لا توجد تكلفة شحن مضافة لهذه المحافظة حاليًا.",
    shippingErrorText: "تعذر حساب الشحن الآن وسيتم تأكيده مع الطلب.",
    storefrontLoadingText:
      hasNatureSummaryTone || isKhemetLuxe
        ? "سيتم حساب الشحن بمجرد اكتمال تحميل بيانات المتجر."
        : "Shipping will be calculated once storefront details finish loading.",
  });
  const effectiveShipping =
    loyaltyFreeShipping && Number(shippingCost) > 0 ? 0 : Number(shippingCost);
  const walletPaymentSettings = (storefrontSettings?.storefront?.settings?.['walletPaymentSettings'] as
    | { enabled?: boolean; walletNumber?: string; discountEnabled?: boolean; discountPercent?: number; showDiscountBadge?: boolean }
    | undefined) || null;
  const dbEnabledMethods =
    storefrontSettings?.storefront?.storefrontFeatures?.enabledPaymentMethods;
  const isWalletActiveInSettings =
    walletPaymentSettings?.enabled !== false &&
    (
      Array.isArray(dbEnabledMethods)
        ? dbEnabledMethods.includes('wallet')
        : walletPaymentSettings?.enabled === true
    );
  const isWalletAvailable =
    Boolean(walletPaymentSettings?.walletNumber) && isWalletActiveInSettings;
  const walletDiscountEnabled = Boolean(walletPaymentSettings?.discountEnabled);
  const walletDiscountPercent = Math.max(
    0,
    Number(walletPaymentSettings?.discountPercent || 0),
  );
  const walletDiscountActive =
    walletDiscountEnabled &&
    walletDiscountPercent > 0 &&
    (paymentMethod === "card" || (paymentMethod === "wallet" && isWalletAvailable));
  const walletDiscount =
    walletDiscountActive
      ? (Number(subtotal) || 0) * (walletDiscountPercent / 100)
      : 0;
  const showLineItems = parseBooleanSetting(
    sectionSettings?.showLineItems,
    isFittingRoomSummary,
  );
  const lineItemsEditable = parseBooleanSetting(
    sectionSettings?.lineItemsEditable,
    true,
  );
  const lineItemsTitle =
    typeof sectionSettings?.lineItemsTitle === "string"
      ? sectionSettings.lineItemsTitle
      : prefersArabicCopy
        ? "المنتجات"
        : "Items";
  const showAssuranceCard = parseBooleanSetting(
    sectionSettings?.showAssuranceCard,
    shouldShowAssuranceCard,
  );
  const showNextStepsCard = parseBooleanSetting(
    sectionSettings?.showNextSteps,
    shouldShowNextStepsCard,
  );
  const estimatedTotal = Math.max(0, subtotal + effectiveShipping - couponDiscount - storePromotionDiscount - loyaltyDiscount - voucherDiscount - walletDiscount);
  const resolvedFreeShippingText = quantityOfferFreeShippingActive
    ? quantityOfferFreeShippingText
    : freeShippingReachedText;
  const resolvedShippingValueText = (() => {
    if (quantityOfferFreeShippingActive) {
      return "مجاني عبر عرض الكميات";
    }

    if (!trimmedGovernorate) {
      return shippingValueText;
    }

    if (isShippingLoading) {
      return "جارٍ الحساب...";
    }

    if (checkoutFreeShippingActive) {
      return freeShippingDiscount > 0
        ? `-${formatStorefrontCurrency(freeShippingDiscount, currency)}`
        : "مجاني";
    }

    return formatStorefrontCurrency(shippingCost, currency);
  })();
  const resolvedShippingHelpText = shippingMessage || shippingHelpText;
  const wrapperClassName = `${getWrapperClassName(variant)}${
    isFittingRoomSummary
      ? " border-[#efe5dd] bg-white text-[#242220]"
      : isWomenFashionSummary
      ? " space-y-4 p-4 sm:p-5"
      : isBiteRush
        ? " border-[#f8c08c] bg-[linear-gradient(180deg,#fffaf4_0%,#fff1e4_100%)] shadow-[0_38px_110px_-78px_rgba(247,115,22,0.42)]"
      : isSproutRoom
        ? " border-[#d8e6d8] bg-white shadow-[0_28px_80px_-70px_rgba(32,53,40,0.18)]"
      : isAirlume
        ? " border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.82))] shadow-[0_38px_110px_-78px_hsl(var(--primary)/0.44)]"
      : isKhemetLuxe
        ? " bg-transparent shadow-none p-0"
      : hasNatureSummaryTone
        ? " border-[#dbe3d4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,247,242,0.96))] shadow-[0_38px_110px_-82px_rgba(26,51,40,0.32)]"
              : isMarketSummary
                ? " border-[#f0d4b0] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,239,0.96))] shadow-[0_38px_110px_-82px_rgba(154,93,34,0.16)]"
                : isBoutiqueSummary
                  ? " border-[#ead8cf] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,246,0.96))] shadow-[0_38px_110px_-82px_rgba(107,33,49,0.16)]"
                  : ""
  }${isKhemetLuxe ? " min-h-[46rem] lg:min-h-0" : ""}`;
  const sectionClassName = `w-full ${
    isFittingRoomSummary
      ? "bg-[linear-gradient(180deg,#f5ece4_0%,#f7efe8_48%,#ffffff_100%)] py-6"
      : isSproutRoom
      ? "bg-[linear-gradient(180deg,#fbfaf5_0%,#eef5ea_42%,#ffffff_100%)]"
      : hasNatureSummaryTone
        ? "bg-[linear-gradient(180deg,#f8fbf7_0%,#eef5ea_42%,#ffffff_100%)]"
      : isMarketSummary
          ? "bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ef_46%,#ffffff_100%)]"
          : isKhemetLuxe
            ? "bg-transparent"
          : isBoutiqueSummary
            ? "bg-[linear-gradient(180deg,#fffdfc_0%,#fff8f6_46%,#ffffff_100%)]"
            : "bg-background"
  }`;
  const progressCardClassName = isWomenFashionSummary
    ? "space-y-2.5 rounded-[1.25rem] border border-[#ead8cf] bg-white/94 p-3.5 shadow-[0_16px_42px_-40px_rgba(107,33,49,0.1)]"
    : isBiteRush
      ? "space-y-3 rounded-[1.5rem] border border-[#f8c08c] bg-white/88 p-4 shadow-[0_18px_50px_-40px_rgba(247,115,22,0.32)]"
      : isSproutRoom
      ? "space-y-3 border border-[#d8e6d8] bg-[#f8fbf7] p-4"
      : isAirlume
        ? "space-y-3 rounded-[1.2rem] border border-primary/10 bg-white/88 p-4 shadow-[0_18px_50px_-44px_rgba(15,23,42,0.28)]"
      : isKhemetLuxe
        ? "space-y-3 rounded-[0.95rem] border border-[#e7ddd0] bg-transparent p-0 shadow-none"
      : hasNatureSummaryTone
        ? "space-y-3 rounded-[1.3rem] border border-[#dce4d5] bg-white/92 p-4 shadow-[0_18px_50px_-42px_rgba(26,51,40,0.2)]"
            : isMarketSummary
              ? "space-y-3 rounded-[1.5rem] border border-[#f0d4b0] bg-white/92 p-4 shadow-[0_18px_50px_-42px_rgba(154,93,34,0.14)]"
              : isBoutiqueSummary
                ? "space-y-3 rounded-[1.5rem] border border-[#ead8cf] bg-white/92 p-4 shadow-[0_18px_50px_-42px_rgba(107,33,49,0.12)]"
                : isCommandSummary
                  ? "space-y-3 rounded-[1.5rem] border border-[#ead8b1] bg-white/92 p-4 shadow-[0_18px_50px_-42px_rgba(90,62,24,0.16)]"
                  : "space-y-3 rounded-[1rem] border border-border bg-background/75 p-4";
  const couponInputClassName = isWomenFashionSummary
    ? "flex-1 min-h-[44px] rounded-[1rem] border border-[#ead8cf] bg-white/96 px-3 py-2.5 text-sm text-[#3d2a2f] placeholder:text-[#9a7671] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d77d6a]/18"
    : isFittingRoomSummary
      ? "min-h-[44px] flex-1 rounded-[1rem] border border-transparent bg-[#f7f4f1] px-4 py-2.5 text-sm text-[#242220] placeholder:text-[#b8b1aa] shadow-inner focus:border-[#d8cec4] focus:outline-none focus:ring-2 focus:ring-[#242220]/10"
    : isBiteRush
      ? "flex-1 rounded-[1.1rem] border border-[#f8c08c] bg-white px-3 py-2.5 text-sm text-[#111111] placeholder:text-[#a14a14] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
      : isSproutRoom
        ? "flex-1 rounded-full border border-[#d8e6d8] bg-white px-4 py-2.5 text-sm text-[#203528] placeholder:text-[#6b8a74] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7fa178]/20"
      : isAirlume
      ? "flex-1 rounded-[1rem] border border-primary/10 bg-white/92 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      : isKhemetLuxe
        ? "flex-1 min-h-[44px] rounded-[0.7rem] border border-[#ddd3c5] bg-white px-3 py-2.5 text-sm text-[#2c241b] placeholder:text-[#9a8c75] focus:outline-none focus:ring-2 focus:ring-[#b89255]/14"
      : hasNatureSummaryTone
        ? "flex-1 rounded-[1rem] border border-[#d8e0d1] bg-white/96 px-3 py-2.5 text-sm text-foreground placeholder:text-[#8b9783] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#88a876]/20"
            : isMarketSummary
              ? "flex-1 rounded-[1.1rem] border border-[#f0d4b0] bg-white/96 px-3 py-2.5 text-sm text-[#4b3321] placeholder:text-[#a67d56] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#c9874a]/18"
              : isBoutiqueSummary
                ? "flex-1 rounded-[1.1rem] border border-[#ead8cf] bg-white/96 px-3 py-2.5 text-sm text-[#3d2a2f] placeholder:text-[#9a7671] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d77d6a]/18"
                : isCommandSummary
                  ? "flex-1 rounded-[1.1rem] border border-[#ead8b1] bg-white/96 px-3 py-2.5 text-sm text-[#1f1f1b] placeholder:text-[#8c7341] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d4a64a]/20"
                  : "flex-1 rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const checkoutButtonClassName = isWomenFashionSummary
    ? "h-11.5 rounded-full border-none bg-[linear-gradient(135deg,#3d2a2f_0%,#8f4d41_100%)] text-sm font-black text-white shadow-[0_20px_64px_-34px_rgba(107,33,49,0.24)] transition-all hover:opacity-95 sm:h-12 sm:text-base"
    : isFittingRoomSummary
      ? "h-12 rounded-[1rem] border-none bg-[#2b2b2b] text-sm font-bold text-white shadow-[0_18px_44px_-28px_rgba(31,31,31,0.42)] transition-all hover:bg-[#1f1f1f]"
    : isBiteRush
      ? "h-12 rounded-full border-none bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] text-white shadow-[0_24px_80px_-34px_rgba(239,68,68,0.6)] transition-all hover:shadow-[0_28px_86px_-30px_rgba(249,115,22,0.68)]"
      : isSproutRoom
        ? "h-12 rounded-full border-none bg-[#203528] text-[#f4fbf5] shadow-[0_22px_56px_-36px_rgba(32,53,40,0.42)] transition-all hover:opacity-95"
      : isAirlume
        ? "h-12 rounded-full border-none bg-[linear-gradient(135deg,#0f172a_0%,hsl(var(--primary))_58%,#60a5fa_100%)] text-white shadow-[0_24px_80px_-38px_hsl(var(--primary)/0.7)] transition-all hover:opacity-95"
      : isKhemetLuxe
        ? "h-11.5 rounded-[0.85rem] border-none bg-[linear-gradient(135deg,#2c241b_0%,#7b6030_48%,#b89255_100%)] text-sm font-black text-white shadow-none transition-all hover:opacity-95 sm:h-12"
      : hasNatureSummaryTone
        ? "h-12 rounded-full border-none bg-[linear-gradient(135deg,#1a3328_0%,#476343_100%)] text-white shadow-[0_24px_70px_-36px_rgba(26,51,40,0.55)] transition-all hover:opacity-95"
            : isMarketSummary
              ? "h-12 rounded-full border-none bg-[linear-gradient(135deg,#6b4423_0%,#c9874a_100%)] text-white shadow-[0_24px_70px_-36px_rgba(154,93,34,0.34)] transition-all hover:opacity-95"
              : isBoutiqueSummary
                ? "h-12 rounded-full border-none bg-[linear-gradient(135deg,#3d2a2f_0%,#8f4d41_100%)] text-white shadow-[0_24px_80px_-36px_rgba(107,33,49,0.3)] transition-all hover:opacity-95"
                : isCommandSummary
                  ? "h-12 rounded-full border-none bg-[linear-gradient(135deg,#1f1f1b_0%,#725523_52%,#d5ac58_100%)] text-white shadow-[0_24px_80px_-36px_rgba(90,62,24,0.5)] transition-all hover:opacity-95"
                  : undefined;
  const trustRowClassName = isWomenFashionSummary
    ? "flex flex-wrap items-center justify-center gap-2 rounded-[1rem] border border-[#ead8cf] bg-white/92 px-3 py-2 text-[11px] text-[#8b5f59] shadow-sm"
    : isBiteRush
      ? "flex items-center justify-center gap-4 rounded-full border border-[#f8c08c] bg-white/88 px-4 py-3 text-xs text-[#8a4b1f] shadow-sm"
      : isSproutRoom
      ? "flex flex-wrap items-center justify-center gap-3 rounded-full border border-[#d8e6d8] bg-[#f8fbf7] px-4 py-3 text-xs text-[#56715e]"
      : isAirlume
        ? "flex items-center justify-center gap-4 rounded-full border border-primary/10 bg-white/88 px-4 py-3 text-xs text-muted-foreground shadow-sm"
      : isKhemetLuxe
        ? "flex flex-wrap items-center justify-center gap-3 rounded-[0.85rem] border border-[#e7ddd0] bg-[#fcf8f2] px-4 py-3 text-xs text-[#725523]"
      : hasNatureSummaryTone
        ? "flex items-center justify-center gap-4 rounded-full border border-[#dbe3d4] bg-white/88 px-4 py-3 text-xs text-[#64725f] shadow-sm"
            : isMarketSummary
              ? "flex flex-wrap items-center justify-center gap-3 rounded-[1.2rem] border border-[#f0d4b0] bg-white/92 px-4 py-3 text-xs text-[#8b6037] shadow-sm"
              : isBoutiqueSummary
                ? "flex flex-wrap items-center justify-center gap-3 rounded-[1.2rem] border border-[#ead8cf] bg-white/92 px-4 py-3 text-xs text-[#8b5f59] shadow-sm"
                : isCommandSummary
                  ? "flex flex-wrap items-center justify-center gap-3 rounded-[1.2rem] border border-[#ead8b1] bg-white/92 px-4 py-3 text-xs text-[#6d5527] shadow-sm"
                  : "flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground";
  const checkingCouponText = "جارٍ التحقق...";
  const totalsCardClassName = isWomenFashionSummary
    ? "space-y-2.5 rounded-[1.25rem] border border-[#ead8cf] bg-white/95 p-3.5 shadow-[0_16px_44px_-40px_rgba(107,33,49,0.1)]"
    : isFittingRoomSummary
      ? "space-y-3 border-t border-[#f0ebe6] pt-4 text-sm"
    : isKhemetLuxe
      ? "space-y-3 rounded-[0.95rem] border border-[#e7ddd0] bg-transparent p-0 shadow-none"
    : isCommandSummary
      ? "space-y-3 rounded-[1.5rem] border border-[#ead8b1] bg-white/94 p-4 shadow-[0_18px_50px_-42px_rgba(90,62,24,0.16)]"
      : isBoutiqueSummary
        ? "space-y-3 rounded-[1.5rem] border border-[#ead8cf] bg-white/95 p-4 shadow-[0_18px_50px_-42px_rgba(107,33,49,0.12)]"
        : isMarketSummary
          ? "space-y-3 rounded-[1.5rem] border border-[#f0d4b0] bg-white/95 p-4 shadow-[0_18px_50px_-42px_rgba(154,93,34,0.12)]"
          : isSproutRoom
            ? "space-y-3 border border-[#d8e6d8] bg-white p-4 text-sm"
            : hasNatureSummaryTone
              ? "space-y-3 rounded-[1.5rem] border border-[#dbe3d4] bg-white/95 p-4 shadow-[0_18px_50px_-42px_rgba(26,51,40,0.12)]"
              : "space-y-3 text-sm";
  const notesCardClassName = isWomenFashionSummary
    ? "rounded-[1.25rem] border border-[#ead8cf] bg-white/94 p-3.5 shadow-[0_16px_44px_-40px_rgba(107,33,49,0.1)]"
    : isFittingRoomSummary
      ? "rounded-[1.25rem] border border-[#f0ebe6] bg-[#fbf8f5] p-4 text-[#6f6962]"
    : isSproutRoom
      ? "border border-[#d8e6d8] bg-[#f8fbf7] p-4"
    : isKhemetLuxe
      ? "rounded-[0.95rem] border border-[#e7ddd0] bg-transparent p-0 shadow-none"
    : isBoutiqueSummary
      ? "rounded-[1.5rem] border border-[#ead8cf] bg-white/94 p-4 shadow-[0_18px_50px_-42px_rgba(107,33,49,0.12)]"
        : isMarketSummary
          ? "rounded-[1.5rem] border border-[#f0d4b0] bg-white/94 p-4 shadow-[0_18px_50px_-42px_rgba(154,93,34,0.12)]"
          : hasNatureSummaryTone
            ? "rounded-[1.5rem] border border-[#dbe3d4] bg-white/94 p-4 shadow-[0_18px_50px_-42px_rgba(26,51,40,0.12)]"
            : "rounded-[1.5rem] border border-[#ead8b1] bg-white/92 p-4 shadow-[0_18px_50px_-42px_rgba(90,62,24,0.16)]";
  const couponRowClassName = isWomenFashionSummary
    ? "flex flex-col gap-2 sm:flex-row"
    : isFittingRoomSummary
      ? "flex items-center gap-2"
    : isKhemetLuxe
      ? "flex flex-col items-stretch gap-3 sm:flex-row"
    : "flex gap-2";
  const titleClassName = isWomenFashionSummary
    ? "font-heading text-base font-bold text-foreground sm:text-lg"
    : isFittingRoomSummary
      ? "text-center font-heading text-base font-black text-[#242220]"
    : isKhemetLuxe
      ? "font-heading text-[1.05rem] font-bold text-foreground"
    : "font-heading text-lg font-bold text-foreground";
  const subtitleClassName = isWomenFashionSummary
    ? "text-sm leading-5 text-muted-foreground"
    : isFittingRoomSummary
      ? "text-center text-xs leading-5 text-[#8a837c]"
    : isKhemetLuxe
      ? "text-sm leading-6 text-[#6f6455]"
    : "text-sm leading-6 text-muted-foreground";
  const shippingHelpClassName = isWomenFashionSummary
    ? "text-[11px] leading-5 text-muted-foreground"
    : isFittingRoomSummary
      ? "text-[11px] leading-5 text-[#a69f98]"
    : isKhemetLuxe
      ? "text-xs leading-5 text-[#7b6d58]"
    : "text-xs text-muted-foreground";
  const lineItemsCardClassName = isKhemetLuxe
    ? "space-y-4 bg-transparent p-0 shadow-none"
    : isFittingRoomSummary
      ? "space-y-3"
    : "space-y-3 rounded-[1.2rem] border border-border bg-white/95 p-4";
  const lineItemRowClassName = isKhemetLuxe
    ? "flex items-start gap-3 bg-transparent py-2"
    : isFittingRoomSummary
      ? "flex items-center gap-3 rounded-[1.25rem] bg-white p-1.5"
    : "flex items-start gap-3 rounded-[1rem] border border-border/70 bg-background p-3";
  const lineItemMetaClassName = isKhemetLuxe
    ? "text-[11px] leading-5 text-[#7b6d58]"
    : isFittingRoomSummary
      ? "text-[11px] leading-5 text-[#a39a92]"
    : "text-[11px] leading-5 text-muted-foreground";
  const showSummaryHeading =
    !isFittingRoomSummary && Boolean(headerBadge || title || subtitle);
  const showLineItemsHeading =
    !isFittingRoomSummary && Boolean(lineItemsTitle);

  useEffect(() => {
    setCouponCode(activeCoupon?.code || "");
  }, [activeCoupon?.code]);

  useEffect(() => {
    if (
      appliedCoupon &&
      Number.isFinite(Number(appliedCoupon.orderAmount)) &&
      !isSameAmount(Number(appliedCoupon.orderAmount), subtotal)
    ) {
      clearAppliedCoupon();
    }
  }, [appliedCoupon, clearAppliedCoupon, subtotal]);

  // ⚡ Auto-apply coupon from URL or pending state when cart has subtotal > 0
  useEffect(() => {
    const codeToApply =
      pendingCouponCode ||
      new URLSearchParams(location.search).get("coupon") ||
      new URLSearchParams(location.search).get("apply_coupon");

    const companyId = storefrontSettings?.company?.id;

    if (
      codeToApply &&
      subtotal > 0 &&
      companyId &&
      (!appliedCoupon || appliedCoupon.code !== codeToApply.trim().toUpperCase()) &&
      !isCouponLoading
    ) {
      const normalizedCode = codeToApply.trim().toUpperCase();
      setCouponCode(normalizedCode);
      void (async () => {
        try {
          setIsCouponLoading(true);
          const response = await storefrontApi.validateCoupon(
            companyId,
            normalizedCode,
            subtotal,
          );
          const coupon = response?.data?.coupon;
          if (coupon) {
            const discountAmount = Number(response?.data?.discountAmount || 0);
            const finalAmount = Number(response?.data?.finalAmount || subtotal);
            setAppliedCoupon({
              code: String(coupon.code || normalizedCode).trim().toUpperCase(),
              name: typeof coupon.name === "string" ? coupon.name : "",
              discountAmount,
              finalAmount,
              orderAmount: subtotal,
            });
            setPendingCouponCode(null);
            toast.success("تم تطبيق كوبون الخصم تلقائياً ✓");
          }
        } catch {
          // Keep pending or fail silently if cart subtotal doesn't meet requirements yet
        } finally {
          setIsCouponLoading(false);
        }
      })();
    }
  }, [
    subtotal,
    pendingCouponCode,
    storefrontSettings?.company?.id,
    appliedCoupon,
    isCouponLoading,
    location.search,
    setAppliedCoupon,
    setPendingCouponCode,
  ]);

  useEffect(() => {
    if (
      !showFreeShippingProgress ||
      !freeShippingEnabled ||
      (!quantityOfferFreeShippingActive && freeShippingAmount <= 0)
    ) {
      return;
    }

    const milestones = [25, 50, 75, 100];
    const reachedMilestone = milestones.reduce(
      (lastReached, milestone) =>
        freeShippingProgress >= milestone ? milestone : lastReached,
      0,
    );

    if (reachedMilestone <= 0) {
      return;
    }

    void trackStorefrontAppUsage({
      slug: "conversion-suite",
      feature: "free_shipping_progress_milestone",
      dedupeKey: `free-shipping-progress:${storefrontSettings?.company?.id || "store"}:${reachedMilestone}:${subtotal}`,
      metadata: {
        milestone: reachedMilestone,
        subtotal,
      },
    });
  }, [
    freeShippingAmount,
    freeShippingEnabled,
    freeShippingProgress,
    quantityOfferFreeShippingActive,
    showFreeShippingProgress,
    storefrontSettings?.company?.id,
    subtotal,
  ]);

  const handleApplyCoupon = async () => {
    const normalizedCouponCode = couponCode.trim();

    if (!normalizedCouponCode) {
      clearAppliedCoupon();
      toast.error(theme.direction === "rtl" ? "يرجى إدخال كود الخصم" : "Please enter a coupon code");
      return;
    }

    void trackStorefrontAppUsage({
      slug: "conversion-suite",
      feature: "coupon_validation_attempt",
      metadata: {
        subtotal,
      },
    });

    try {
      setIsCouponLoading(true);
      const response = await storefrontApi.validateCoupon(
        storefrontSettings?.company?.id || "",
        normalizedCouponCode,
        subtotal,
      );

      const discountAmount = Number(response?.data?.discountAmount || 0);
      const finalAmount = Number(response?.data?.finalAmount || subtotal);
      const coupon = response?.data?.coupon;

      setAppliedCoupon({
        code: String(coupon?.code || normalizedCouponCode)
          .trim()
          .toUpperCase(),
        name: typeof coupon?.name === "string" ? coupon.name : "",
        discountAmount,
        finalAmount,
        orderAmount: subtotal,
      });

      void trackStorefrontAppUsage({
        slug: "conversion-suite",
        feature: "coupon_validation_success",
        metadata: {
          subtotal,
          discountAmount,
        },
      });

      toast.success(
        discountAmount > 0
          ? isBiteRush
            ? `الكود اشتغل. وفّرت ${formatStorefrontCurrency(discountAmount, currency)} من الطلب.`
            : `تم تطبيق الكوبون بنجاح. وفّرت ${formatStorefrontCurrency(discountAmount, currency)}.`
          : "الكوبون صالح.",
      );
    } catch (error: unknown) {
      clearAppliedCoupon();

      void trackStorefrontAppUsage({
        slug: "conversion-suite",
        feature: "coupon_validation_failure",
        metadata: {
          subtotal,
        },
      });

      toast.error(getCouponValidationMessage(error));
    } finally {
      setIsCouponLoading(false);
    }
  };

  const handleCheckoutClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (minimumOrder.blocked) {
      event.preventDefault();
      toast.error(minimumOrder.message);
      return;
    }

    void trackStorefrontAppUsage({
      slug: "conversion-suite",
      feature: "checkout_cta_click",
      metadata: {
        subtotal,
        couponApplied: Boolean(activeCoupon),
      },
    });
  };

  if (!items.length) {
    if (persistedCartItemCount > 0) {
      return (
        <section className={sectionClassName}>
          <div className={wrapperClassName} aria-busy="true">
            <div className="space-y-4" aria-hidden="true">
              <div className="h-4 w-28 animate-pulse rounded-full bg-[#eee5d9]" />
              <div className="h-7 w-40 animate-pulse rounded-full bg-[#e8ddcf]" />
              <div className="h-20 animate-pulse rounded-[0.95rem] bg-[#f3ece3]" />
              <div className="h-28 animate-pulse rounded-[0.95rem] bg-[#f3ece3]" />
              <div className="space-y-3">
                <div className="h-5 animate-pulse rounded-full bg-[#eee5d9]" />
                <div className="h-5 animate-pulse rounded-full bg-[#eee5d9]" />
                <div className="h-6 animate-pulse rounded-full bg-[#e8ddcf]" />
              </div>
            </div>
          </div>
        </section>
      );
    }

    return null;
  }

  return (
    <section className={sectionClassName}>
      <div className={wrapperClassName}>
        {isFittingRoomSummary ? (
          <div className="flex items-center justify-between gap-4 pb-1">
            <Link
              to={buildStorefrontPath(location.pathname, "/shop", location.search)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#45413d] transition-colors hover:bg-[#f7f4f1]"
              aria-label="Back to shop"
            >
              <ArrowLeft size={18} strokeWidth={2.2} />
            </Link>
            <h2 className="font-heading text-base font-black text-[#242220]">
              {title || "Shopping Bag"}
            </h2>
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#45413d]">
              <ShoppingBag size={18} strokeWidth={2.2} />
              <span className="absolute end-1 top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#8fcac0] px-1 text-[8px] font-black text-white">
                {items.length}
              </span>
            </span>
          </div>
        ) : null}

        {showSummaryHeading ? (
          <div className="space-y-2">
            {isBiteRush ? (
              <span className="inline-flex rounded-full bg-[#111111] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                إجمالي الطلب
              </span>
            ) : isSproutRoom && headerBadge ? (
              <span className="inline-flex rounded-full border border-[#d8e6d8] bg-[#f8fbf7] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#43604b]">
                {headerBadge}
              </span>
            ) : isMarketSummary && headerBadge ? (
              <span className="inline-flex rounded-full border border-[#f0d4b0] bg-[#fff8ef] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6037]">
                {headerBadge}
              </span>
            ) : isKhemetLuxe && headerBadge ? (
              <span className="inline-flex rounded-full border border-[#d9c8ad] bg-[#fffaf2] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#725523]">
                {headerBadge}
              </span>
            ) : isNatureSummary && headerBadge ? (
              <span className="inline-flex rounded-full border border-[#dbe3d4] bg-[#f6f8f2] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#4a6843]">
                {headerBadge}
              </span>
            ) : isCommandSummary && headerBadge ? (
              <span className="inline-flex rounded-full border border-[#ead8b1] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#6d5527]">
                {headerBadge}
              </span>
            ) : isBoutiqueSummary && headerBadge ? (
              <span className="inline-flex rounded-full border border-[#f0ddd5] bg-[#fff7f4] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b5f59]">
                {headerBadge}
              </span>
            ) : null}
            {title ? <h2 className={titleClassName}>{title}</h2> : null}
            {subtitle ? <p className={subtitleClassName}>{subtitle}</p> : null}
          </div>
        ) : null}

        {showFreeShippingProgress && freeShippingEnabled ? (
          <div className={progressCardClassName}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  ميزة الشحن
                </p>
                <p className="text-sm text-foreground">
                  {freeShippingRemaining > 0
                    ? replaceCurrencyToken(
                        freeShippingTitle,
                        freeShippingRemaining,
                        currency,
                      )
                    : resolvedFreeShippingText}
                </p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {Math.round(freeShippingProgress)}%
              </span>
            </div>
            <div className={getProgressBarClassName(variant)}>
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>
        ) : null}

        {showLineItems ? (
          <div className={lineItemsCardClassName}>
            {showLineItemsHeading ? (
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-foreground">
                  {lineItemsTitle}
                </h3>
                <span className={lineItemMetaClassName}>
                  {prefersArabicCopy
                    ? `${items.length} قطعة`
                    : `${items.length} items`}
                </span>
              </div>
            ) : null}
            <div className="space-y-3">
              {items.map((item) => {
                const pricing = calculateVolumeDiscountPricing({
                  unitPrice: item.basePrice ?? item.price,
                  quantity: item.quantity,
                  discounts: item.volumeDiscounts,
                });
                const attributeSummary = Object.entries(
                  item.attributes || {},
                )
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" • ");
                const canEditQuantity =
                  lineItemsEditable && !item.quantityOffer?.groupId;

                return (
                  <div
                    key={item.id}
                    className={`${lineItemRowClassName} ${
                      isFittingRoomSummary
                        ? "justify-between"
                      : isKhemetLuxe
                        ? "flex flex-col gap-3 sm:flex-row sm:items-center"
                        : "flex items-start gap-3"
                    }`}
                    dir={isKhemetLuxe ? "ltr" : undefined}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div
                        className={`relative shrink-0 overflow-hidden border border-[#eadfcf] ${
                          isFittingRoomSummary
                            ? "h-16 w-16 rounded-[1rem] bg-[#f6f3ef] p-1"
                          : isKhemetLuxe
                            ? "h-[4.5rem] w-[4.5rem] rounded-[0.9rem] bg-[#fbf5ed] p-1"
                            : "h-16 w-16 rounded-[0.85rem] bg-white"
                        }`}
                      >
                        <StorefrontProductImage
                          candidates={getCartItemImageCandidates(item)}
                          alt={item.name}
                          width="64"
                          height="64"
                          requestedWidth={isKhemetLuxe ? 120 : 72}
                          className={`h-full w-full ${
                            isFittingRoomSummary || isKhemetLuxe
                              ? "object-contain"
                              : "object-cover"
                          }`}
                        />
                        {isFittingRoomSummary ? null : (
                          <span className="absolute -end-2 -top-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border border-[#d9c8ad] bg-[#2c241b] px-1.5 text-[10px] font-black text-white">
                            {item.quantity}
                          </span>
                        )}
                      </div>
                      <div
                        className={`min-w-0 flex-1 ${
                          isFittingRoomSummary ? "space-y-1" : "space-y-2"
                        }`}
                      >
                        <div
                          className={`gap-3 ${
                            isFittingRoomSummary
                              ? "flex items-start justify-between"
                            : isKhemetLuxe
                              ? "flex flex-col items-start sm:flex-row sm:items-start sm:justify-between"
                              : "flex items-start justify-between"
                          }`}
                        >
                          <div
                            className={`min-w-0 space-y-1 ${
                              isKhemetLuxe || isFittingRoomSummary ? "text-left" : ""
                            }`}
                          >
                            <p
                              className={`line-clamp-2 font-semibold text-foreground ${
                                isFittingRoomSummary
                                  ? "text-[0.82rem] leading-5"
                                : isKhemetLuxe
                                  ? "text-[0.95rem] leading-6"
                                  : "text-sm"
                              }`}
                            >
                              {item.name}
                            </p>
                            {attributeSummary ? (
                              <p className={lineItemMetaClassName}>
                                {attributeSummary}
                              </p>
                            ) : null}
                          </div>
                          {isKhemetLuxe ? (
                            <span className="shrink-0 whitespace-nowrap text-[0.98rem] font-bold text-foreground sm:hidden">
                              {formatStorefrontCurrency(
                                pricing.lineSubtotal,
                                currency,
                              )}
                            </span>
                          ) : null}
                        </div>
                        {canEditQuantity ? (
                          <QuantitySelector
                            value={item.quantity}
                            onChange={(value) => updateQuantity(item.id, value)}
                            size={isKhemetLuxe || isFittingRoomSummary ? "compact" : "default"}
                            className={
                              isFittingRoomSummary
                                ? "border-none bg-transparent shadow-none"
                              : isKhemetLuxe
                                ? "border-[#e2d4c0] bg-[#fffdf8]"
                                : undefined
                            }
                            buttonClassName={
                              isFittingRoomSummary
                                ? "text-[#77706a] hover:text-[#242220]"
                              : isKhemetLuxe
                                ? "text-[#725523]"
                                : undefined
                            }
                            valueClassName={
                              isFittingRoomSummary
                                ? "border-none bg-transparent text-[#242220]"
                              : isKhemetLuxe
                                ? "border-[#e2d4c0] bg-[#fffdf8] text-[#2c241b]"
                                : undefined
                            }
                          />
                        ) : (
                          <p className={lineItemMetaClassName}>
                            {prefersArabicCopy
                              ? `الكمية: ${item.quantity}`
                              : `Qty: ${item.quantity}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap font-bold text-foreground ${
                        isFittingRoomSummary
                          ? "text-[0.82rem]"
                        : isKhemetLuxe
                          ? "hidden text-[0.98rem] sm:block"
                          : "text-sm"
                      }`}
                    >
                      {formatStorefrontCurrency(
                        pricing.lineSubtotal,
                        currency,
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {showCouponField && isKhemetLuxe ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#111111]">
              هل لديك كود خصم؟
            </p>
            <div className={couponRowClassName} dir="ltr">
            <input
              id={couponFieldId}
              name="couponCode"
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder={couponPlaceholder}
              className={`${couponInputClassName} text-right [direction:rtl]`}
            />
            <Button
              variant="default"
              size="md"
              onClick={handleApplyCoupon}
              disabled={isCouponLoading}
              className="min-h-[44px] w-full rounded-[0.5rem] bg-[#2c241b] px-6 font-bold text-white shadow-none hover:bg-[#1f1a14] disabled:bg-[#e8d8c2] disabled:text-[#7b6030] disabled:opacity-100 sm:min-w-[96px] sm:w-auto"
            >
              {isCouponLoading ? checkingCouponText : "تطبيق"}
            </Button>
            </div>
          </div>
        ) : null}

        <div className="mb-3">
          <TierProgressBanner />
        </div>
        <div className={totalsCardClassName}>
          <div className="flex justify-between text-foreground">
            <span className="text-[#6f6455]">{subtotalLabel}</span>
            <span>{formatStorefrontCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-foreground">
            <span className="text-[#6f6455]">{shippingLabel}</span>
            <span
              className={
                (checkoutFreeShippingActive || loyaltyFreeShipping) && trimmedGovernorate && !isShippingLoading
                  ? "text-emerald-600"
                  : "text-[#6f6455]"
              }
            >
              {loyaltyFreeShipping && Number(shippingCost) > 0
                ? "مجاني (مستوى الولاء)"
                : resolvedShippingValueText}
            </span>
          </div>
          {loyaltyDiscount > 0 ? (
            <div className="flex justify-between text-foreground">
              <span className="text-[#6f6455]">
                {tiersEnabled ? 'خصم مستوى ' : ''}{loyaltyDiscountPercent}%
              </span>
              <span className="text-emerald-600">
                -{formatStorefrontCurrency(loyaltyDiscount, currency)}
              </span>
            </div>
          ) : null}
          {voucherDiscount > 0 ? (
            <div className="flex justify-between text-foreground">
              <span className="text-[#6f6455]">
                خصم الكوبون ({tierProgress?.activeVoucher?.percent}%)
              </span>
              <span className="text-emerald-600">
                -{formatStorefrontCurrency(voucherDiscount, currency)}
              </span>
            </div>
          ) : null}
          {couponDiscount > 0 ? (
            <div className="flex justify-between text-foreground">
              <span className="text-[#6f6455]">
                {activeCoupon?.name || activeCoupon?.code || "كوبون"}
              </span>
              <span className="text-emerald-600">
                -{formatStorefrontCurrency(couponDiscount, currency)}
              </span>
            </div>
          ) : null}
          {storePromotionDiscount > 0 ? (
            <div className="flex justify-between text-foreground">
              <span className="text-[#6f6455]">
                {storePromotionTier?.label || "عرض الكمية"}
              </span>
              <span className="text-emerald-600">
                -{formatStorefrontCurrency(storePromotionDiscount, currency)}
              </span>
            </div>
          ) : null}
          {walletDiscount > 0 && walletPaymentSettings?.showDiscountBadge !== false ? (
            <div className="flex justify-between text-foreground">
              <span className="text-[#6f6455]">
                خصم الدفع الإلكتروني ({walletDiscountPercent}%)
              </span>
              <span className="text-emerald-600">
                -{formatStorefrontCurrency(walletDiscount, currency)}
              </span>
            </div>
          ) : walletDiscount === 0 && walletDiscountEnabled && walletDiscountPercent > 0 && walletPaymentSettings?.showDiscountBadge !== false && (Number(subtotal) || 0) > 0 ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50/80 px-2.5 py-1.5 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/40">
              <span className="flex items-center gap-1 font-medium">
                <span>🎁</span>
                <span>خصم {walletDiscountPercent}% بالدفع الإلكتروني</span>
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                وفر {formatStorefrontCurrency(((Number(subtotal) || 0) * walletDiscountPercent) / 100, currency)}
              </span>
            </div>
          ) : null}
          <div
            className={`flex justify-between border-t pt-3 text-[1.05rem] font-bold text-foreground ${
              isCommandSummary
                ? "border-[#ead8b1]"
                : isKhemetLuxe
                  ? "border-[#d9c8ad]"
                : isBoutiqueSummary
                  ? "border-[#ead8cf]"
                  : isMarketSummary
                    ? "border-[#f0d4b0]"
                    : hasNatureSummaryTone
                      ? "border-[#dbe3d4]"
                      : "border-border"
            }`}
          >
            <span>{totalLabel}</span>
            <span
              className={
                isCommandSummary
                  ? "text-[#6d5527]"
                  : isKhemetLuxe
                    ? "text-[#725523]"
                  : isBoutiqueSummary
                    ? "text-[#8b5f59]"
                  : isMarketSummary
                      ? "text-[#8b6037]"
                      : hasNatureSummaryTone
                        ? "text-[#4a6843]"
                        : undefined
              }
            >
              {formatStorefrontCurrency(estimatedTotal, currency)}
            </span>
          </div>
        </div>

        <p className={shippingHelpClassName}>{resolvedShippingHelpText}</p>

        {showAssuranceCard ? (
          <div className={notesCardClassName}>
            <h3 className="text-sm font-black text-foreground">
              {assuranceTitle}
            </h3>
            <div className="mt-3 space-y-2">
              {assuranceItems.map((item) => (
                <p
                  key={item}
                  className={`flex items-start gap-2 text-sm ${
                    isKhemetLuxe
                      ? "text-[#6d5a44]"
                      : isBoutiqueSummary
                      ? "text-[#72545b]"
                      : isMarketSummary
                        ? "text-[#7b5531]"
                        : hasNatureSummaryTone
                          ? "text-[#4a6843]"
                          : "text-[#5b4a28]"
                  }`}
                >
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      isKhemetLuxe
                        ? "bg-[#b89255]"
                      : isBoutiqueSummary
                        ? "bg-[#d77d6a]"
                        : isMarketSummary
                          ? "bg-[#c9874a]"
                          : hasNatureSummaryTone
                            ? "bg-[#88a876]"
                            : "bg-[#d4a64a]"
                    }`}
                  />
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {showCouponField && !isKhemetLuxe ? (
          <div className={couponRowClassName}>
            <input
              id={couponFieldId}
              name="couponCode"
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder={couponPlaceholder}
              className={couponInputClassName}
            />
            <Button
              variant="outline"
              size="md"
              onClick={handleApplyCoupon}
              disabled={isCouponLoading}
              className={
                isBiteRush
                  ? "rounded-full border-[#111111] bg-[#111111] px-5 font-black text-white shadow-sm hover:border-[#f97316] hover:bg-[#f97316]"
                  : isFittingRoomSummary
                    ? "min-h-[44px] rounded-[1rem] border-[#2b2b2b] bg-[#2b2b2b] px-5 text-sm font-bold text-white shadow-none hover:border-[#1f1f1f] hover:bg-[#1f1f1f]"
                  : isAirlume
                    ? "rounded-full border-primary/12 bg-white/88 px-5 font-bold text-foreground shadow-sm hover:border-primary/30 hover:bg-white"
                    : isKhemetLuxe
                      ? "rounded-[0.95rem] border-[#d9c8ad] bg-[#2c241b] px-5 font-bold text-white shadow-sm hover:border-[#b89255] hover:bg-[#6d5527]"
                    : hasNatureSummaryTone
                      ? "rounded-full border-[#d8e0d1] bg-[#f6f7f2] px-5 font-bold text-[#1a3328] shadow-sm hover:border-[#88a876] hover:bg-white"
                      : isMarketSummary
                        ? "rounded-full border-[#f0d4b0] bg-white px-5 font-bold text-[#8b6037] shadow-sm hover:border-[#c9874a] hover:bg-[#fff8ef]"
                        : isBoutiqueSummary
                          ? "rounded-full border-[#ead8cf] bg-white px-5 font-bold text-[#72545b] shadow-sm hover:border-[#d77d6a] hover:bg-[#fff8f5]"
                          : isCommandSummary
                            ? "rounded-full border-[#ead8b1] bg-white px-5 font-bold text-[#5b4a28] shadow-sm hover:border-[#d4a64a] hover:bg-[#fff8ea]"
                            : undefined
              }
            >
              {isCouponLoading ? checkingCouponText : couponButtonText}
            </Button>
          </div>
        ) : null}

        {minimumOrder.blocked ? (
          <div className="space-y-3 rounded-[1rem] border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold leading-6 text-amber-900">
              {minimumOrder.message}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-amber-200">
              <div
                className="h-full rounded-full bg-amber-600 transition-[width] duration-500"
                style={{ width: `${minimumOrder.progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {!hideCheckoutButton ? (
          <Link
            to={checkoutPath}
            className="block"
            onClick={handleCheckoutClick}
            aria-disabled={minimumOrder.blocked}
          >
            <Button
              fullWidth
              size="lg"
              className={checkoutButtonClassName}
              disabled={minimumOrder.blocked}
            >
              {minimumOrder.blocked
                ? `${prefersArabicCopy ? "متبقي" : "Remaining"} ${formatStorefrontCurrency(minimumOrder.remaining, currency)}`
                : checkoutButtonText}
            </Button>
          </Link>
        ) : null}

        {showNextStepsCard ? (
          <div className={notesCardClassName}>
            <h3 className="text-sm font-black text-foreground">
              {nextStepsTitle}
            </h3>
            <div className="mt-3 space-y-2">
              {nextSteps.map((item, index) => (
                <p
                  key={item}
                  className={`flex items-start gap-2 text-sm ${
                    isKhemetLuxe
                      ? "text-[#6d5a44]"
                      : isBoutiqueSummary
                      ? "text-[#72545b]"
                      : isMarketSummary
                        ? "text-[#7b5531]"
                        : hasNatureSummaryTone
                          ? "text-[#4a6843]"
                          : "text-[#5b4a28]"
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                      isKhemetLuxe
                        ? "bg-[#f5ead7] text-[#725523]"
                      : isBoutiqueSummary
                        ? "bg-[#fff1ed] text-[#b06456]"
                        : isMarketSummary
                          ? "bg-[#fff2df] text-[#a36a34]"
                          : hasNatureSummaryTone
                            ? "bg-[#edf5e8] text-[#4a6843]"
                            : "bg-[#fff4d8] text-[#8d6a2c]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {shouldShowTrustSummaryRow ? (
          <div className={trustRowClassName}>
            <span className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {secureCheckoutText}
            </span>
            <span>&bull;</span>
            <span>{returnsText}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default OrderSummary;
