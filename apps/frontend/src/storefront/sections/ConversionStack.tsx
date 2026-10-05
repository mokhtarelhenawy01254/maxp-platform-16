import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useProduct } from "../hooks/useProduct";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "../utils/marketplaceApps";
import VolumeDiscountBadge from "../../components/VolumeDiscountBadge";
import BackInStockSignupCard from "../components/BackInStockSignupCard";
import TrustedBadgePanel from "../components/TrustedBadgePanel";
import { trackStorefrontAppUsage } from "../utils/appUsageTracking";
import { resolveSectionVariant } from '../variants';
import { cn as cx } from "../../lib/utils";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { isProductPageCheckoutEnabledForProduct } from "../../utils/productPageCheckout";
import { resolveSectionContentAlign } from "../utils/contentAlignment";

import CountdownBlock from "./ConversionBlocks/CountdownBlock";
import LowStockBlock from "./ConversionBlocks/LowStockBlock";
import DeliveryBlock from "./ConversionBlocks/DeliveryBlock";
import FakeVisitorBlock from "./ConversionBlocks/FakeVisitorBlock";
import SoldCounterBlock from "./ConversionBlocks/SoldCounterBlock";
import PurchaseFomoBlock from "./ConversionBlocks/PurchaseFomoBlock";
import PreOrderBlock from "./ConversionBlocks/PreOrderBlock";

interface ConversionStackProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    countdownLabel?: string;
    countdownStyle?: string;
    preOrderLabel?: string;
    preOrderStyle?: string;
    lowStockLabel?: string;
    lowStockMessage?: string;
    lowStockStyle?: string;
    estimatedDeliveryLabel?: string;
    estimatedDeliveryStyle?: string;
    fakeVisitorMessage?: string;
    fakeVisitorStyle?: string;
    soldCounterMessage?: string;
    soldCounterStyle?: string;
    purchaseFomoMessage?: string;
    purchaseFomoStyle?: string;
    backInStockTitle?: string;
    backInStockDescription?: string;
    backInStockSuccessMessage?: string;
    backInStockStyle?: string;
    trustedBadgeTitle?: string;
    trustedBadgeSubtitle?: string;
    trustedBadgeItems?: string;
    trustedBadgeStyle?: string;
    contentAlign?: string;
    [key: string]: unknown;
  };
}

type JsonRecord = Record<string, unknown>;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};

const parseMaybeNumber = (value: unknown): number | null => {
  if (isFiniteNumber(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hashProductSeed = (value: string): number =>
  value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const parseBadgeItems = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseBooleanSetting = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
};

const normalizeLowStockStyle = (
  value: unknown,
): "alert" | "meter" | "minimal" => {
  if (typeof value !== "string") {
    return "alert";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "meter" || normalized === "minimal") {
    return normalized;
  }

  return "alert";
};

const normalizeEstimatedDeliveryStyle = (
  value: unknown,
): "card" | "timeline" | "pill" => {
  if (typeof value !== "string") {
    return "card";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "timeline" || normalized === "pill") {
    return normalized;
  }

  return "card";
};

const normalizeSoldCounterStyle = (
  value: unknown,
): "spotlight" | "badge" | "minimal" => {
  if (typeof value !== "string") {
    return "spotlight";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "badge" || normalized === "minimal") {
    return normalized;
  }

  return "spotlight";
};

const normalizeBackInStockStyle = (
  value: unknown,
): "panel" | "inline" | "accent" => {
  if (typeof value !== "string") {
    return "panel";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "inline" || normalized === "accent") {
    return normalized;
  }

  return "panel";
};

const normalizeCountdownStyle = (
  value: unknown,
): "timer" | "split" | "minimal" => {
  if (typeof value !== "string") {
    return "timer";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "split" || normalized === "minimal") {
    return normalized;
  }

  return "timer";
};

const normalizeFakeVisitorStyle = (
  value: unknown,
): "pulse" | "ticker" | "minimal" => {
  if (typeof value !== "string") {
    return "pulse";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "ticker" || normalized === "minimal") {
    return normalized;
  }

  return "pulse";
};

const normalizePurchaseFomoStyle = (
  value: unknown,
): "alert" | "timeline" | "minimal" => {
  if (typeof value !== "string") {
    return "alert";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "timeline" || normalized === "minimal") {
    return normalized;
  }

  return "alert";
};

const interpolateTemplate = (
  template: unknown,
  tokens: Record<string, string | number>,
  fallback: string,
): string => {
  const source =
    typeof template === "string" && template.trim().length > 0 ? template : fallback;

  return Object.entries(tokens).reduce((output, [key, value]) => {
    return output.replace(
      new RegExp(`\\{+\\s*${key}\\s*\\}+`, "gi"),
      String(value),
    );
  }, source);
};

const interpolateCount = (template: unknown, count: number, fallback: string): string =>
  interpolateTemplate(template, { count }, fallback);

const resolveDirectionalCopy = ({
  value,
  englishFallback,
  arabicFallback,
  prefersArabicCopy,
}: {
  value: unknown;
  englishFallback: string;
  arabicFallback: string;
  prefersArabicCopy: boolean;
}) => {
  if (typeof value === "string" && value.trim()) {
    const trimmedValue = value.trim();
    if (prefersArabicCopy && trimmedValue === englishFallback) {
      return arabicFallback;
    }

    return trimmedValue;
  }

  return prefersArabicCopy ? arabicFallback : englishFallback;
};

const formatCountdownParts = (endsAt: string) => {
  const target = new Date(endsAt).getTime();
  if (!Number.isFinite(target)) {
    return null;
  }

  const diff = target - Date.now();
  if (diff <= 0) {
    return null;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return { days, hours, minutes };
};

const resolveDateLocale = (currency: string): string => {
  const map: Record<string, string> = {
    EGP: "ar-EG",
    SAR: "ar-SA",
    AED: "ar-AE",
    KWD: "ar-KW",
    QAR: "ar-QA",
    BHD: "ar-BH",
    OMR: "ar-OM",
    JOD: "ar-JO",
    IQD: "ar-IQ",
    LBP: "ar-LB",
    USD: "en-US",
    GBP: "en-GB",
    EUR: "en-IE",
    CAD: "en-CA",
    AUD: "en-AU",
    TRY: "tr-TR",
  };
  return map[currency?.toUpperCase()] || "ar-EG";
};

const formatDateRange = (minDays: number, maxDays: number, locale: string): string => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + minDays);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + maxDays);

  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
};

type ConversionStackVariant = 'balanced' | 'editorial' | 'minimal' | 'seamless' | 'couture-minimal';

const normalizeConversionStackVariant = (
  rawVariant: unknown,
): ConversionStackVariant =>
  resolveSectionVariant<ConversionStackVariant>('ConversionStack', rawVariant, 'balanced');

type ConversionBlockId =
  | "countdown"
  | "low-stock"
  | "delivery"
  | "fake-visitor"
  | "sold-counter"
  | "purchase-fomo"
  | "pre-order"
  | "back-in-stock"
  | "trusted-badges";

type StandaloneConversionBlockId = ConversionBlockId | "bulk-savings";

type StandaloneConversionSectionType =
  | "countdown"
  | "low-stock"
  | "delivery-proof"
  | "viewer-counter"
  | "sold-counter"
  | "purchase-fomo"
  | "pre-order"
  | "back-in-stock"
  | "trusted-badges"
  | "bulk-savings";

type UrgencyBlockId =
  | "countdown"
  | "low-stock"
  | "pre-order"
  | "sold-counter"
  | "purchase-fomo"
  | "fake-visitor";

interface ConversionBlock {
  id: ConversionBlockId;
  node: React.ReactNode;
  wrapperClassName?: string;
}

interface ConversionUrgencyBlock {
  id: UrgencyBlockId;
  dominantNode: React.ReactNode;
  secondaryNode: React.ReactNode;
}

const URGENCY_PRIORITY: readonly UrgencyBlockId[] = [
  "countdown",
  "low-stock",
  "pre-order",
  "sold-counter",
  "purchase-fomo",
  "fake-visitor",
];

const STANDALONE_CONVERSION_SECTION_BLOCK_MAP: Record<
  StandaloneConversionSectionType,
  StandaloneConversionBlockId
> = {
  countdown: "countdown",
  "low-stock": "low-stock",
  "delivery-proof": "delivery",
  "viewer-counter": "fake-visitor",
  "sold-counter": "sold-counter",
  "purchase-fomo": "purchase-fomo",
  "pre-order": "pre-order",
  "back-in-stock": "back-in-stock",
  "trusted-badges": "trusted-badges",
  "bulk-savings": "bulk-savings",
};

const resolveStandaloneConversionBlock = (
  sectionType: unknown,
): StandaloneConversionBlockId | null => {
  if (typeof sectionType !== "string") {
    return null;
  }

  const normalized = sectionType.trim().toLowerCase();
  return (
    STANDALONE_CONVERSION_SECTION_BLOCK_MAP[
      normalized as StandaloneConversionSectionType
    ] || null
  );
};


const ConversionStack: React.FC<ConversionStackProps> = ({
  section,
  settings: sectionSettings,
}) => {
  const { id } = useParams<{ id: string }>();
  const { product, isLoading } = useProduct(id);
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const isPcHubTheme = theme.id === "pc-hub-eg";
  const sectionType =
    typeof section?.type === "string" && section.type.trim()
      ? section.type.trim().toLowerCase()
      : "conversion-stack";
  const standaloneBlockId = resolveStandaloneConversionBlock(sectionType);
  const isNovaMobile = theme.id === 'nova-mobile';
  const prefersArabicCopy = theme.direction === "rtl";
  const variant = normalizeConversionStackVariant(section?.variant);
  const conversionEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    "conversion-suite",
  );
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    "conversion-suite",
  );
  const commerceAdvancedEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    "commerce-advanced",
  );
  const commerceAdvancedSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    "commerce-advanced",
  );

  const modules = useMemo(
    () => asRecord(conversionSettings["modules"]),
    [conversionSettings],
  );
  const general = useMemo(
    () => asRecord(conversionSettings["general"]),
    [conversionSettings],
  );
  const ui = useMemo(
    () => asRecord(conversionSettings["ui"]),
    [conversionSettings],
  );
  const copy = useMemo(
    () => asRecord(conversionSettings["copy"]),
    [conversionSettings],
  );
  const thresholds = useMemo(
    () => asRecord(conversionSettings["thresholds"]),
    [conversionSettings],
  );
  const countdown = useMemo(
    () => asRecord(conversionSettings["countdown"]),
    [conversionSettings],
  );
  const estimatedDelivery = useMemo(
    () => asRecord(conversionSettings["estimatedDelivery"]),
    [conversionSettings],
  );
  const productMetadata = product?.["metadata"];
  const metadata = useMemo(() => {
    try {
      return typeof productMetadata === "string"
        ? asRecord(JSON.parse(productMetadata))
        : asRecord(productMetadata);
    } catch {
      return {};
    }
  }, [productMetadata]);

  const productSocialProofRef = product?.["socialProof"];
  const socialProof = useMemo(() => {
    const topLevel = asRecord(productSocialProofRef);
    const metaProof = asRecord(metadata["socialProof"]);
    
    // Favor non-zero/non-null metadata values for preview injection
    return {
      ...topLevel,
      soldCount: topLevel["soldCount"] || metaProof["soldCount"] || 0,
      activeCartCount: topLevel["activeCartCount"] || metaProof["activeCartCount"] || 0,
      recentOrderCount: topLevel["recentOrderCount"] || metaProof["recentOrderCount"] || 0,
      orderCount: topLevel["orderCount"] || metaProof["orderCount"] || 0,
      backInStockRequests: topLevel["backInStockRequests"] || metaProof["backInStockRequests"] || 0,
      recentPurchases: topLevel["recentPurchases"] || metaProof["recentPurchases"] || 0,
      recentOrderUnits: topLevel["recentOrderUnits"] || metaProof["recentOrderUnits"] || 0,
      activeCartUnits: topLevel["activeCartUnits"] || metaProof["activeCartUnits"] || 0,
    };
  }, [productSocialProofRef, metadata]);
  const commerceModules =
    asRecord(commerceAdvancedSettings["modules"]);
  const commerceCopy =
    asRecord(commerceAdvancedSettings["copy"]);
  const lowStockLimit = Number(thresholds["lowStockLimit"] || 5);
  const purchaseFomoCartWindowHours = Math.max(
    1,
    Number(thresholds["purchaseFomoCartWindowHours"] || 24),
  );
  const purchaseFomoRecentPurchaseWindowHours = Math.max(
    1,
    Number(thresholds["purchaseFomoRecentPurchaseWindowHours"] || 48),
  );
  const purchaseFomoWaitlistFallbackLimit = Math.max(
    1,
    Number(thresholds["purchaseFomoWaitlistFallbackLimit"] || 18),
  );
  const fakeVisitorMin = Math.max(1, Number(thresholds["fakeVisitorMin"] || 6));
  const fakeVisitorMax = Math.max(
    fakeVisitorMin + 1,
    Number(thresholds["fakeVisitorMax"] || 22),
  );
  const stockCount = parseMaybeNumber(product?.["stock"]);
  const fakeStockEnabled = Boolean(product?.["showFakeStock"]);
  const fakeStockCount = useMemo(() => {
    if (!product?.id) {
      return null;
    }

    const seed = hashProductSeed(product.id);
    return Math.max(3, Math.min(lowStockLimit + 2, 3 + (seed % Math.max(lowStockLimit, 3))));
  }, [lowStockLimit, product?.id]);
  const productSeed = product?.id ? hashProductSeed(product.id) : 0;
  const soldCount =
    parseMaybeNumber(product?.["soldCount"]) ??
    parseMaybeNumber(socialProof["soldCount"]) ??
    0;
  const orderCount =
    parseMaybeNumber(product?.["orderCount"]) ??
    parseMaybeNumber(socialProof["orderCount"]) ??
    0;
  const recentPurchases =
    parseMaybeNumber(socialProof["recentPurchases"]) ??
    (soldCount > 0
      ? Math.max(1, Math.min(soldCount, Math.max(orderCount, 2 + (productSeed % 6))))
      : 0);
  const recentOrderCount =
    parseMaybeNumber(product?.["recentOrderCount"]) ??
    parseMaybeNumber(socialProof["recentOrderCount"]) ??
    recentPurchases;
  const backInStockRequests =
    parseMaybeNumber(product?.["backInStockRequests"]) ??
    parseMaybeNumber(socialProof["backInStockRequests"]) ??
    0;
  const activeCartCount =
    parseMaybeNumber(product?.["activeCartCount"]) ??
    parseMaybeNumber(socialProof["activeCartCount"]) ??
    0;
  const viewerFloor =
    soldCount > 0
      ? clamp(Math.ceil(soldCount * 0.12), fakeVisitorMin, Math.max(fakeVisitorMin, fakeVisitorMax - 1))
      : clamp(fakeVisitorMin + (productSeed % Math.max(2, fakeVisitorMax - fakeVisitorMin)), fakeVisitorMin, Math.max(fakeVisitorMin, fakeVisitorMax - 1));
  const viewerCeiling = Math.max(
    viewerFloor + 1,
    clamp(viewerFloor + 5 + (productSeed % 4), viewerFloor + 1, fakeVisitorMax),
  );
  const [viewerCount, setViewerCount] = useState(viewerFloor);
  const lowStockDisplayCount = fakeStockEnabled ? fakeStockCount : stockCount;
  const showLowStock =
    modules["lowStockNotice"] &&
    lowStockDisplayCount !== null &&
    lowStockDisplayCount > 0 &&
    lowStockDisplayCount <= Math.max(lowStockLimit, 8);
  const countdownParts = formatCountdownParts(String(countdown["endsAt"] || ""));
  const showCountdown = modules["saleCountdown"] && Boolean(countdownParts);
  const showEstimatedDelivery =
    modules["estimatedDelivery"] &&
    Number.isFinite(Number(estimatedDelivery["minDays"])) &&
    Number.isFinite(Number(estimatedDelivery["maxDays"]));
  const isPreOrder = Boolean(product?.["isPreOrder"] || metadata?.["isPreOrder"]);
  const showPreOrder =
    commerceAdvancedEnabled && Boolean(commerceModules["preOrder"]) && isPreOrder;

  const showBackInStock =
    modules["backInStock"] && stockCount !== null && stockCount <= 0 && !showPreOrder;
  const showTrustedBadges = Boolean(modules["trustedBadges"]);
  const showFakeVisitor = modules["fakeVisitorCounter"] && viewerCount > 0;
  const showSoldCounter = modules["soldCounter"] && soldCount > 0;
  const purchaseFomoSource =
    activeCartCount > 0
      ? "active_carts"
      : recentOrderCount > 0
        ? "recent_orders"
        : backInStockRequests > 0
          ? "waitlist"
          : null;
  const purchaseFomoCount =
    purchaseFomoSource === "active_carts"
      ? activeCartCount
      : purchaseFomoSource === "recent_orders"
        ? recentOrderCount
        : purchaseFomoSource === "waitlist"
          ? Math.min(backInStockRequests, purchaseFomoWaitlistFallbackLimit)
          : 0;
  const showPurchaseFomo = modules["purchaseFomo"] && purchaseFomoCount > 0;
  const fakeVisitorCounterEnabled = Boolean(modules["fakeVisitorCounter"]);
  const renderInTemplates = general["renderInTemplates"] !== false;
  const activeUrgencyIds = [
    showCountdown ? "countdown" : null,
    showLowStock ? "low-stock" : null,
    showPreOrder ? "pre-order" : null,
    showSoldCounter ? "sold-counter" : null,
    showPurchaseFomo ? "purchase-fomo" : null,
    showFakeVisitor ? "fake-visitor" : null,
  ].filter(Boolean) as UrgencyBlockId[];
  const dominantUrgencyId =
    URGENCY_PRIORITY.find((blockId) => activeUrgencyIds.includes(blockId)) || null;
  const surfaceClass =
    isNovaMobile
      ? "space-y-5"
      : variant === "seamless"
        ? "space-y-10 bg-transparent py-2"
        : variant === "couture-minimal"
          ? "space-y-3 rounded-[1.7rem] border border-[#ead9d8] bg-[linear-gradient(180deg,#fffdfc_0%,#fff7f4_100%)] p-4 shadow-[0_24px_80px_-62px_rgba(107,33,49,0.16)]"
        : variant === "editorial"
          ? "space-y-4 rounded-[1.75rem] border border-primary/10 bg-[linear-gradient(145deg,hsl(var(--background)),hsl(var(--secondary)/0.4))] p-5 shadow-[0_24px_90px_-60px_hsl(var(--primary)/0.55)]"
        : variant === "minimal"
          ? "space-y-3"
          : "space-y-4";
  const primaryShellClass =
    isNovaMobile
      ? "space-y-4"
      : variant === "seamless"
        ? "rounded-[1.75rem] border border-border/40 bg-background/40 p-6 backdrop-blur-sm"
        : variant === "couture-minimal"
          ? "space-y-3"
        : variant === "minimal"
          ? "space-y-3"
          : variant === "editorial"
            ? "rounded-[1.6rem] border border-border/70 bg-background/75 p-5"
            : "rounded-[1.45rem] border border-border/70 bg-background/80 p-4";


  const headerClass =
    variant === "minimal" || variant === "seamless" || variant === "couture-minimal"
      ? "mb-3 flex flex-col gap-1"
      : "mb-5 flex flex-col gap-2";
  const heading =
    (typeof sectionSettings?.title === "string" && sectionSettings.title.trim()) || "";
  const subtitle =
    (typeof sectionSettings?.subtitle === "string" && sectionSettings.subtitle.trim()) || "";
  const countdownStyle = normalizeCountdownStyle(
    typeof sectionSettings?.countdownStyle === "string"
      ? sectionSettings.countdownStyle
      : ui["countdownStyle"],
  );
  const countdownLabel =
    resolveDirectionalCopy({
      value: sectionSettings?.countdownLabel || countdown["label"],
      englishFallback: "Offer ends in",
      arabicFallback: "ينتهي العرض خلال",
      prefersArabicCopy,
    });
  const lowStockLabel =
    (typeof sectionSettings?.lowStockLabel === "string" &&
      sectionSettings.lowStockLabel.trim()) ||
    (prefersArabicCopy ? "الكمية محدودة" : "Low Stock");
  const lowStockStyle = normalizeLowStockStyle(
    typeof sectionSettings?.lowStockStyle === "string"
      ? sectionSettings.lowStockStyle
      : ui["lowStockStyle"],
  );
  const estimatedDeliveryLabel =
    (typeof sectionSettings?.estimatedDeliveryLabel === "string" &&
      sectionSettings.estimatedDeliveryLabel.trim()) ||
    resolveDirectionalCopy({
      value: estimatedDelivery["label"],
      englishFallback: "Estimated delivery",
      arabicFallback: "موعد التوصيل المتوقع",
      prefersArabicCopy,
    });
  const estimatedDeliveryStyle = normalizeEstimatedDeliveryStyle(
    typeof sectionSettings?.estimatedDeliveryStyle === "string"
      ? sectionSettings.estimatedDeliveryStyle
      : ui["estimatedDeliveryStyle"],
  );
  const fakeVisitorMessage = interpolateCount(
    sectionSettings?.fakeVisitorMessage || copy["fakeVisitorMessage"],
    viewerCount,
    prefersArabicCopy
      ? `${viewerCount} شخص يشاهدون هذا المنتج الآن`
      : `${viewerCount} people are viewing this right now`,
  );
  const fakeVisitorStyle = normalizeFakeVisitorStyle(
    typeof sectionSettings?.fakeVisitorStyle === "string"
      ? sectionSettings.fakeVisitorStyle
      : ui["fakeVisitorStyle"],
  );
  const soldCounterMessage = interpolateCount(
    sectionSettings?.soldCounterMessage || copy["soldCounterMessage"],
    soldCount,
    prefersArabicCopy ? `تم بيع هذا المنتج ${soldCount} مرة` : `Sold ${soldCount} times`,
  );
  const soldCounterStyle = normalizeSoldCounterStyle(
    typeof sectionSettings?.soldCounterStyle === "string"
      ? sectionSettings.soldCounterStyle
      : ui["soldCounterStyle"],
  );
  const purchaseFomoMessage = interpolateTemplate(
    sectionSettings?.purchaseFomoMessage ||
      (purchaseFomoSource === "active_carts"
        ? copy["purchaseFomoCartMessage"]
        : purchaseFomoSource === "recent_orders"
            ? copy["purchaseFomoRecentMessage"]
            : copy["purchaseFomoWaitlistMessage"]),
    {
      count: purchaseFomoCount,
      hours:
        purchaseFomoSource === "recent_orders"
          ? purchaseFomoRecentPurchaseWindowHours
          : purchaseFomoCartWindowHours,
    },
    purchaseFomoSource === "active_carts"
      ? prefersArabicCopy
        ? `${purchaseFomoCount} عميل أضافوا هذا المنتج إلى سلتهم الآن`
        : `${purchaseFomoCount} shoppers currently have this in their cart`
      : purchaseFomoSource === "recent_orders"
        ? prefersArabicCopy
          ? `${purchaseFomoCount} طلب تضمّن هذا المنتج خلال الساعات الأخيرة`
          : `${purchaseFomoCount} orders included this product in the last hours`
        : prefersArabicCopy
          ? `${purchaseFomoCount} عميل طلبوا تنبيهًا عند عودة المنتج`
          : `${purchaseFomoCount} shoppers asked to be notified when this product returns`,
  );
  const purchaseFomoStyle = normalizePurchaseFomoStyle(
    typeof sectionSettings?.purchaseFomoStyle === "string"
      ? sectionSettings.purchaseFomoStyle
      : ui["purchaseFomoStyle"],
  );
  const trustedBadgeItems = parseBadgeItems(
    (isPcHubTheme ? product?.["trustedBadgeItems"] : undefined) ||
      sectionSettings?.trustedBadgeItems ||
      copy["trustedBadgeItems"],
  );
  const trustedBadgeStyleSource =
    typeof sectionSettings?.trustedBadgeStyle === "string"
      ? sectionSettings.trustedBadgeStyle
      : ui["trustedBadgeStyle"];
  const trustedBadgeStyle =
    trustedBadgeStyleSource === "grid" ||
    trustedBadgeStyleSource === "minimal" ||
    trustedBadgeStyleSource === "perfume-minimal"
      ? trustedBadgeStyleSource
      : "strip";
  const productPageCheckoutEnabled =
    isProductPageCheckoutEnabledForProduct(
      product as { metadata?: unknown } | null,
      storefrontSettings,
    );
  const showPulseRow = parseBooleanSetting(
    sectionSettings?.["showPulseRow"],
    !productPageCheckoutEnabled,
  );
  const showUrgencyTicker = parseBooleanSetting(
    sectionSettings?.["showUrgencyTicker"],
    true,
  );
  const showConfidenceGrid = parseBooleanSetting(
    sectionSettings?.["showConfidenceGrid"],
    true,
  );

  const backInStockStyle = normalizeBackInStockStyle(
    typeof sectionSettings?.["backInStockStyle"] === "string"
      ? (sectionSettings["backInStockStyle"] as string)
      : (ui["backInStockStyle"] as string),
  );


  const countdownSummary = countdownParts
    ? prefersArabicCopy
      ? `${countdownParts.days > 0 ? `${countdownParts.days} يوم ` : ""}${countdownParts.hours} ساعة ${countdownParts.minutes} دقيقة متبقية`
      : `${countdownParts.days > 0 ? `${countdownParts.days}d ` : ""}${countdownParts.hours}h ${countdownParts.minutes}m left`
    : "";
  const lowStockProgress =
    showLowStock && lowStockDisplayCount !== null
      ? Math.max(
          8,
          Math.min(
            100,
            Math.round(
              (lowStockDisplayCount /
                Math.max(lowStockLimit, Math.max(lowStockDisplayCount, 1))) *
                100,
            ),
          ),
        )
      : 0;
  const storefrontLocale = resolveDateLocale(
    storefrontSettings?.storefront?.settings?.currency ||
      storefrontSettings?.company?.currency ||
      "EGP",
  );
  const deliveryRange = showEstimatedDelivery
    ? formatDateRange(
        Number(estimatedDelivery["minDays"] || 2),
        Number(estimatedDelivery["maxDays"] || 4),
        storefrontLocale,
      )
    : "";
  const preOrderDate = showPreOrder && product?.["preOrderDate"]
    ? new Intl.DateTimeFormat(storefrontLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(String(product["preOrderDate"])))
    : "";
  const preOrderTitle = String(
    commerceCopy["preOrderLabel"] ||
      (prefersArabicCopy ? "متاح للطلب المسبق" : "Available for pre-order"),
  );
  const preOrderDescription = String(
    product?.["preOrderMessage"] ||
      (preOrderDate
        ? prefersArabicCopy
          ? `التوفر المتوقع تقريبًا في ${preOrderDate}.`
          : `Expected availability around ${preOrderDate}.`
        : prefersArabicCopy
          ? "احجز المنتج قبل وصوله."
          : "Reserve your item before it arrives."),
  );

  useEffect(() => {
    setViewerCount(viewerFloor);
  }, [viewerFloor]);

  useEffect(() => {
    if (!product?.id || !fakeVisitorCounterEnabled) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setViewerCount((current) => {
        const delta = (Date.now() + productSeed) % 2 === 0 ? 1 : -1;
        return clamp(current + delta, viewerFloor, viewerCeiling);
      });
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [
    fakeVisitorCounterEnabled,
    product?.id,
    productSeed,
    viewerCeiling,
    viewerFloor,
  ]);

  useEffect(() => {
    if (
      isLoading ||
      !product?.id ||
      !conversionEnabled ||
      !renderInTemplates
    ) {
      return;
    }

    void trackStorefrontAppUsage({
      slug: "conversion-suite",
      feature: "conversion_stack_view",
      dedupeKey: `conversion-stack:${sectionType}:${product.id}:${variant}`,
      metadata: {
        productId: product.id,
        sectionType,
        standaloneBlock: standaloneBlockId || "stack",
        variant,
        countdown: Boolean(showCountdown),
        countdownStyle,
        lowStock: Boolean(showLowStock),
        delivery: Boolean(showEstimatedDelivery),
        preOrder: Boolean(showPreOrder),
        backInStock: Boolean(showBackInStock),
        backInStockStyle,
        fakeVisitor: Boolean(showFakeVisitor),
        fakeVisitorStyle,
        trustedBadges: Boolean(showTrustedBadges),
        soldCounter: Boolean(showSoldCounter),
        soldCounterStyle,
        lowStockStyle,
        estimatedDeliveryStyle,
        purchaseFomo: Boolean(showPurchaseFomo),
        purchaseFomoStyle,
        purchaseFomoSource: purchaseFomoSource || "none",
        pulseRow: Boolean(showPulseRow),
        urgencyTicker: Boolean(showUrgencyTicker),
        confidenceGrid: Boolean(showConfidenceGrid),
        dominantUrgency: dominantUrgencyId || "none",
      },
    });
  }, [
    conversionEnabled,
    dominantUrgencyId,
    isLoading,
    product?.id,
    renderInTemplates,
    showCountdown,
    showBackInStock,
    backInStockStyle,
    countdownStyle,
    estimatedDeliveryStyle,
    fakeVisitorStyle,
    lowStockStyle,
    showEstimatedDelivery,
    showFakeVisitor,
    showLowStock,
    showPreOrder,
    showPurchaseFomo,
    purchaseFomoStyle,
    showPulseRow,
    showUrgencyTicker,
    showConfidenceGrid,
    showSoldCounter,
    soldCounterStyle,
    showTrustedBadges,
    purchaseFomoSource,
    sectionType,
    standaloneBlockId,
    variant,
  ]);

  if (
    isLoading ||
    !product ||
    !conversionEnabled ||
    !renderInTemplates
  ) {
    return null;
  }




  const primaryBlocks: ConversionBlock[] = [];
  if (showEstimatedDelivery) {
    primaryBlocks.push({
      id: "delivery",
      node: <DeliveryBlock
        key="delivery"
        style={estimatedDeliveryStyle}
        label={estimatedDeliveryLabel}
        range={deliveryRange}
        headerLabel={isNovaMobile ? "موعد الوصول التقديري" : undefined}
      />,
      wrapperClassName: isNovaMobile ? "col-span-2" : undefined,
    });
  }
  if (showPreOrder && dominantUrgencyId !== "pre-order") {
    primaryBlocks.push({
      id: "pre-order",
      node: (
        <PreOrderBlock
          key="pre-order-primary"
          mode="primary"
          title={preOrderTitle}
          description={preOrderDescription}
        />
      ),
    });
  }
  if (showBackInStock) {
    primaryBlocks.push({
      id: "back-in-stock",
      node: <BackInStockSignupCard
        key="back-in-stock"
        className="h-full"
        productId={product.id}
        productName={product.name}
        variant={backInStockStyle}
        title={resolveDirectionalCopy({
          value: copy["backInStockTitle"],
          englishFallback: "Notify me when it's back",
          arabicFallback: "نبهني عند توفره مرة أخرى",
          prefersArabicCopy,
        })}
        description={String(
          copy["backInStockDescription"] ||
            (prefersArabicCopy
              ? "اترك اسمك مع البريد أو الهاتف وسنخبرك فور عودة المخزون."
              : "Leave your name plus email or phone and we'll let you know once inventory returns."),
        )}
        successMessage={String(
          copy["backInStockSuccessMessage"] ||
            (prefersArabicCopy
              ? "تم تسجيلك في قائمة الانتظار. سنخبرك عند عودة المنتج للمخزون."
              : "You're on the waitlist. We'll let you know when this product is back in stock."),
        )}
      />,
      wrapperClassName: variant === "minimal" ? undefined : "sm:col-span-2",
    });
  }
  if (showTrustedBadges) {
    primaryBlocks.push({
      id: "trusted-badges",
      node: <TrustedBadgePanel
        key="trusted-badges"
        variant={trustedBadgeStyle}
        title={resolveDirectionalCopy({
          value:
            (isPcHubTheme ? product?.["trustedBadgeTitle"] : undefined) ??
            sectionSettings?.trustedBadgeTitle ??
            copy["trustedBadgeTitle"],
          englishFallback: "Trusted checkout",
          arabicFallback: "دفع آمن وموثوق",
          prefersArabicCopy,
        })}
        subtitle={resolveDirectionalCopy({
          value:
            (isPcHubTheme ? product?.["trustedBadgeSubtitle"] : undefined) ??
            sectionSettings?.trustedBadgeSubtitle ??
            copy["trustedBadgeSubtitle"],
          englishFallback:
            "Secure payment methods and reassurance messages connected to your store policy.",
          arabicFallback: "طرق دفع آمنة ورسائل طمأنة مرتبطة بسياسات متجرك.",
          prefersArabicCopy,
        })}
        items={trustedBadgeItems}
      />,
      wrapperClassName: isNovaMobile ? "col-span-2" : (variant === "minimal" ? undefined : "sm:col-span-2"),
    });
  }

  const urgencyBlocks: ConversionUrgencyBlock[] = [];
  if (showCountdown) {
    urgencyBlocks.push({
      id: "countdown",
      dominantNode: <CountdownBlock
        key="countdown-dominant"
        label={countdownLabel}
        summary={countdownSummary}
      />,
      secondaryNode: <CountdownBlock
        key="countdown-secondary"
        label={countdownLabel}
        summary={countdownSummary}
      />,
    });
  }
  if (showLowStock) {
    urgencyBlocks.push({
      id: "low-stock",
      dominantNode: <LowStockBlock
        key="low-stock-dominant"
        count={lowStockDisplayCount || 0}
        label={lowStockLabel}
        style={lowStockStyle}
        progress={lowStockProgress}
      />,
      secondaryNode: <LowStockBlock
        key="low-stock-secondary"
        count={lowStockDisplayCount || 0}
        label={lowStockLabel}
        style={lowStockStyle}
        progress={lowStockProgress}
      />,
    });
  }
  if (showPreOrder) {
    urgencyBlocks.push({
      id: "pre-order",
      dominantNode: (
        <PreOrderBlock
          key="pre-order-dominant"
          mode="dominant"
          title={preOrderTitle}
          description={preOrderDescription}
        />
      ),
      secondaryNode: (
        <PreOrderBlock
          key="pre-order-secondary"
          mode="primary"
          title={preOrderTitle}
          description={preOrderDescription}
        />
      ),
    });
  }
  if (showSoldCounter) {
    urgencyBlocks.push({
      id: "sold-counter",
      dominantNode: <SoldCounterBlock
        key="sold-counter-dominant"
        count={soldCount}
        message={soldCounterMessage}
      />,
      secondaryNode: <SoldCounterBlock
        key="sold-counter-secondary"
        count={soldCount}
        message={soldCounterMessage}
      />,
    });
  }
  if (showPurchaseFomo) {
    urgencyBlocks.push({
      id: "purchase-fomo",
      dominantNode: (
        <PurchaseFomoBlock
          key="purchase-fomo-dominant"
          count={purchaseFomoCount}
          message={purchaseFomoMessage}
        />
      ),
      secondaryNode: (
        <PurchaseFomoBlock
          key="purchase-fomo-secondary"
          count={purchaseFomoCount}
          message={purchaseFomoMessage}
        />
      ),
    });
  }
  if (showFakeVisitor) {
    urgencyBlocks.push({
      id: "fake-visitor",
      dominantNode: <FakeVisitorBlock
        key="fake-visitor-dominant"
        count={viewerCount}
        message={fakeVisitorMessage}
      />,
      secondaryNode: <FakeVisitorBlock
        key="fake-visitor-secondary"
        count={viewerCount}
        message={fakeVisitorMessage}
      />,
    });
  }

  const dominantUrgency = showUrgencyTicker
    ? urgencyBlocks.find((block) => block.id === dominantUrgencyId) || null
    : null;
  const secondaryProofBlocks = showPulseRow
    ? urgencyBlocks
        .filter((block) => block.id !== dominantUrgencyId)
        .map<ConversionBlock>((block) => ({
          id: block.id,
          node: block.secondaryNode,
        }))
    : [];
  const visiblePrimaryBlocks = showConfidenceGrid ? primaryBlocks : [];
  const standaloneSectionNode =
    standaloneBlockId === "bulk-savings"
      ? modules["bulkSavings"] && product?.id
        ? <VolumeDiscountBadge productId={product.id} quantity={1} />
        : null
      : primaryBlocks.find((block) => block.id === standaloneBlockId)?.node ||
        urgencyBlocks.find((block) => block.id === standaloneBlockId)?.dominantNode ||
        null;

  const resolvedPrimaryGridClass =
    variant === "minimal" || variant === "seamless" || variant === "couture-minimal"
      ? "grid gap-2.5 sm:grid-cols-2"
      : variant === "editorial" || visiblePrimaryBlocks.length > 2
        ? "grid gap-4 md:grid-cols-2 lg:grid-cols-2"
        : "grid gap-3";
  const primaryUsesMultiColumnLayout =
    isNovaMobile ||
    (variant !== "minimal" &&
      variant !== "couture-minimal" &&
      (variant === "editorial" || visiblePrimaryBlocks.length > 2));

  if (
    visiblePrimaryBlocks.length === 0 &&
    !dominantUrgency &&
    secondaryProofBlocks.length === 0 &&
    !modules["bulkSavings"]
  ) {
    return null;
  }

  const leadStackClass = variant === "minimal" || variant === "seamless" ? "space-y-3" : "space-y-4";
  const isContentCentered =
    resolveSectionContentAlign(sectionSettings?.contentAlign) === "center";
  const sectionTestId = standaloneBlockId
    ? `conversion-section-${sectionType}`
    : "conversion-stack";

  if (standaloneBlockId) {
    if (!standaloneSectionNode) {
      return null;
    }

    return (
      <section
        className={cx(
          "w-full",
          variant === "minimal" || variant === "couture-minimal" ? "pt-1 pb-1" : "pt-2 pb-2",
        )}
        data-testid={sectionTestId}
      >
        {heading || subtitle ? (
          <div
            className={cx(
              variant === "minimal" || variant === "couture-minimal" ? "mb-2 flex flex-col gap-1" : headerClass,
              isContentCentered ? "items-center text-center" : "",
            )}
          >
            {heading ? (
                <h2
                  className={cx(
                    variant === "minimal" ? "text-base" : "text-xl",
                    variant === "minimal" || variant === "couture-minimal" ? "text-base" : "text-xl",
                    "font-black text-foreground",
                    isContentCentered ? "mx-auto" : "",
                )}
              >
                {heading}
              </h2>
            ) : null}
            {subtitle ? (
              <p
                className={cx(
                  "max-w-2xl text-sm leading-6 text-muted-foreground",
                  isContentCentered ? "mx-auto text-center" : "",
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}

        {standaloneSectionNode}
      </section>
    );
  }

  return (
    <section
      className={cx(
        "w-full",
        variant === "minimal" || variant === "couture-minimal" ? "pt-3 pb-2" : "pt-4 pb-3",
      )}
      data-testid={sectionTestId}
    >
      <div className={surfaceClass}>
        {heading || subtitle ? (
          <div className={cx(headerClass, isContentCentered ? "items-center text-center" : "")}>
            {heading ? (
                <h2
                  className={cx(
                    variant === "minimal" ? "text-lg" : "text-xl",
                    variant === "minimal" || variant === "couture-minimal" ? "text-lg" : "text-xl",
                    "font-black text-foreground",
                    isContentCentered ? "mx-auto" : "",
                )}
              >
                {heading}
              </h2>
            ) : null}
            {subtitle ? (
                <p className={cx("max-w-2xl text-sm leading-6 text-muted-foreground", isContentCentered ? "mx-auto text-center" : "")}>{subtitle}</p>
              ) : null}
            </div>
        ) : null}

        <div className={leadStackClass}>
          {/* Layer 1: Pulse Row (High-Density Social Proof) */}
          {secondaryProofBlocks.length > 0 && (
            <div 
              className={cx(
                "flex flex-wrap items-center gap-2 animate-in fade-in duration-700 slide-in-from-bottom-2 fill-mode-forwards delay-75",
                isContentCentered ? "justify-center" : "",
              )}
              data-testid="conversion-pulse-row"
            >
              {secondaryProofBlocks.map((block) => (
                <div key={block.id}>{block.node}</div>
              ))}
            </div>
          )}

          {/* Layer 2: Urgency Ticker (Dominant Signals) */}
          {dominantUrgency && (
            <div 
              className="space-y-2 animate-in fade-in duration-700 slide-in-from-bottom-3 fill-mode-forwards delay-150"
              data-testid="conversion-urgency-ticker"
            >
              {[dominantUrgencyId]
                .filter(Boolean)
                .map((id) => {
                  const block = urgencyBlocks.find(b => b.id === id);
                  return block ? <div key={id}>{id === dominantUrgencyId ? block.dominantNode : block.secondaryNode}</div> : null;
                })}
            </div>
          )}

          {/* Layer 3: Confidence Grid (Reassurance) */}
          {showConfidenceGrid && visiblePrimaryBlocks.length > 0 && (
            <div 
              className={cx(
                primaryShellClass,
                "mt-4 animate-in fade-in duration-700 slide-in-from-bottom-4 fill-mode-forwards delay-300"
              )}
              data-testid="conversion-confidence-grid"
            >
              <div className={resolvedPrimaryGridClass}>
                {visiblePrimaryBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={primaryUsesMultiColumnLayout ? block.wrapperClassName : undefined}
                  >
                    {block.node}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {modules["bulkSavings"] && product?.id ? (
          <div
            aria-label={prefersArabicCopy ? "إضافة ختامية" : "Footer add-on"}
            className={cx(
              "mt-4",
              variant === "editorial"
                ? "rounded-[1.1rem] bg-background/70 p-3"
                : variant === "couture-minimal"
                  ? "rounded-[1rem] border border-[#f0d7d2] bg-white/90 p-3"
                  : "",
            )}
            data-testid="conversion-footer"
          >
            <VolumeDiscountBadge productId={product.id} quantity={1} />
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ConversionStack;
