import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { storefrontFetch } from "../../utils/storefrontApi";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { useCartStore } from "../store/useCartStore";
import {
  filterThemePreviewProducts,
  resolveActiveThemePreviewDataset,
} from "../preview/themePreviewData";
import { buildStorefrontPath } from "../utils/paths";
import { formatStorefrontCurrency } from "../utils/currency";
import type { Product } from "../hooks/useProducts";
import StorefrontProductImage from "./StorefrontProductImage";
import { getPrimaryProductImage } from "../utils/productImages";
import { trackStorefrontAppUsage } from "../utils/appUsageTracking";
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "../utils/marketplaceApps";
import { formatCountdownParts, formatCountdownText } from "../utils/countdown";
import { isPharmacyThemeId } from "../utils/pharmacyThemes";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { STOREFRONT_PDP_CHECKOUT_VISIBILITY_EVENT } from "../utils/pdpCheckout";
import { isMarketplaceThemePreview } from "../preview/previewContext";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
// ponytail: promotion bar extracted to StorePromotionBar.tsx (eager import)

// formatCountdownParts and formatCountdownText imported from ../utils/countdown

const hasCheckoutLikePath = (pathname: string): boolean =>
  pathname.endsWith("/checkout") || pathname.endsWith("/thank-you");

const SALE_POPUP_NAMES = [
  "Nora",
  "Sara",
  "Mona",
  "Omar",
  "Lina",
  "Kareem",
  "Salma",
  "Youssef",
];

const SALE_POPUP_CITIES = [
  "Cairo",
  "Alexandria",
  "Giza",
  "Mansoura",
  "Jeddah",
  "Dubai",
  "Riyadh",
  "Amman",
];

const INLINE_PDP_COUNTDOWN_THEME_IDS = new Set(["khemet-luxe-eg"]);
const QUIET_DISCOVERY_CHROME_THEME_IDS = new Set([
  "khemet-luxe-eg",
  "creative-portfolio",
]);

const hashSeed = (value: string): number =>
  value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);

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

type ConversionSettingsSection = Record<string, unknown>;

const NowTicker: React.FC<{
  endsAt: string;
  className: string;
  onExpired?: () => void;
}> = ({ endsAt, className, onExpired }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const parts = useMemo(() => formatCountdownParts(endsAt, now), [endsAt, now]);

  useEffect(() => {
    if (!parts && onExpired) {
      onExpired();
    }
  }, [parts, onExpired]);

  return <div className={className}>{formatCountdownText(parts)}</div>;
};

const GlobalConversionHost: React.FC = () => {
  const location = useLocation();
  const { settings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const prefersArabicCopy = theme.direction === "rtl";
  const isSoleaFemme = theme.id === "solea-femme";
  const isBiteRush = theme.id === "restaurant-demo";
  const isCafeDemo = theme.id === "cafe-demo";
  const isPharmacy = isPharmacyThemeId(theme.id);
  const isRedlineAuto = theme.id === "redline-auto";
  const isKhemetLuxe = theme.id === "khemet-luxe-eg";
  const subtotal = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.price * item.quantity, 0),
  );
  const cartItems = useCartStore((state) => state.items);
  const currency =
    settings?.storefront?.settings?.currency || settings?.company?.currency || "EGP";
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    settings,
    "conversion-suite",
  );
  const isEnabled = isStorefrontMarketplaceAppEnabled(settings, "conversion-suite");
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [salePopupProducts, setSalePopupProducts] = useState<Product[]>([]);
  const [salePopupIndex, setSalePopupIndex] = useState(0);
  const [showSalePopup, setShowSalePopup] = useState(false);
  const [couponCopied, setCouponCopied] = useState(false);
  const [isEmbeddedCheckoutActive, setIsEmbeddedCheckoutActive] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const previewDataset = useMemo(
    () => resolveActiveThemePreviewDataset(location.search),
    [location.search],
  );
  const isMarketplacePreview = useMemo(() => {
    return isMarketplaceThemePreview(location.search);
  }, [location.search]);
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const isHomePath =
    normalizedPath === "/" || normalizedPath.endsWith("/store");
  const isQuietDiscoveryChrome =
    QUIET_DISCOVERY_CHROME_THEME_IDS.has(theme.id) ||
    theme.header?.showCart === false;
  const isCompactMarketplacePreviewChrome = useMemo(() => {
    const params = new URLSearchParams(location.search);

    return (
      isSoleaFemme &&
      params.get("previewSource") === "marketplace" &&
      params.has("previewTheme")
    );
  }, [isSoleaFemme, location.search]);
  // ponytail: promotion bar extracted to StorePromotionBar.tsx (eager import, no lazy delay)
  // add when: need promotion data inside conversion host logic

  const modules =
    (conversionSettings["modules"] as ConversionSettingsSection | undefined) ||
    {};
  const ui =
    (conversionSettings["ui"] as ConversionSettingsSection | undefined) || {};
  const general =
    (conversionSettings["general"] as ConversionSettingsSection | undefined) ||
    {};
  const copy =
    (conversionSettings["copy"] as ConversionSettingsSection | undefined) || {};
  const thresholds =
    (conversionSettings["thresholds"] as ConversionSettingsSection | undefined) ||
    {};
  const countdown =
    (conversionSettings["countdown"] as ConversionSettingsSection | undefined) ||
    {};
  const attachToThemeShell = general["attachToThemeShell"] !== false;
  const inactiveTabEnabled = Boolean(modules["inactiveTab"]);
  const exitIntentPopupEnabled = Boolean(modules["exitIntentPopup"]);
  const freeShippingBarEnabled = Boolean(modules["freeShippingBar"]);
  const fakeSalePopupEnabled =
    Boolean(modules["fakeSalePopup"]) && !isQuietDiscoveryChrome;
  const popupStyle = String(ui["popupStyle"] || "minimal");
  const countdownEndsAt = String(countdown["endsAt"] || "");
  const [countdownExpired, setCountdownExpired] = useState(() => {
    const parts = formatCountdownParts(countdownEndsAt, Date.now());
    return !parts;
  });
  const handleCountdownExpired = useCallback(() => {
    setCountdownExpired(true);
  }, []);
  const barPosition = ui["barPosition"] === "bottom" ? "bottom" : "top";
  const thresholdAmount = Number(thresholds["freeShippingAmount"] || 0);
  const remainingToFreeShipping = Math.max(thresholdAmount - subtotal, 0);
  const freeShippingTemplate = resolveDirectionalCopy({
    value: copy["freeShippingMessage"],
    englishFallback: "Add {{remaining}} to unlock free shipping",
    arabicFallback: "أضف {{remaining}} للحصول على شحن مجاني",
    prefersArabicCopy,
  });
  const freeShippingMessage = useMemo(
    () =>
      remainingToFreeShipping > 0
        ? freeShippingTemplate.replace(
            "{{remaining}}",
            formatStorefrontCurrency(remainingToFreeShipping, currency),
          )
        : resolveDirectionalCopy({
            value: copy["freeShippingReachedMessage"],
            englishFallback: "You unlocked free shipping",
            arabicFallback: "مبروك! تم تفعيل الشحن المجاني",
            prefersArabicCopy,
          }),
    [remainingToFreeShipping, freeShippingTemplate, currency, copy, prefersArabicCopy],
  );
  const shopPath = buildStorefrontPath(location.pathname, "/shop", location.search);
  const cartPath = buildStorefrontPath(location.pathname, "/cart", location.search);
  const freeShippingProgress = useMemo(
    () => (thresholdAmount > 0 ? Math.min(100, Math.max(0, (subtotal / thresholdAmount) * 100)) : 0),
    [thresholdAmount, subtotal],
  );
  const exitPopupStorageKey = `sf-exit-intent:${settings?.company?.id || "store"}`;
  const trackingScope = settings?.company?.id || "store";
  const isProductPage = location.pathname.includes("/product/");
  const shouldRenderShellMount =
    isEnabled &&
    attachToThemeShell &&
    !hasCheckoutLikePath(location.pathname) &&
    !isEmbeddedCheckoutActive &&
    !(isMarketplacePreview && isMobileViewport);
  const shouldOffsetTopUtilityBarForHeader =
    barPosition === "top" &&
    theme.header?.variant === "floating-dark" &&
    (theme.header?.transparentOnHome ?? true) &&
    isHomePath;
  const activeSaleProduct = useMemo(
    () =>
      salePopupProducts.length > 0
        ? salePopupProducts[salePopupIndex % salePopupProducts.length]
        : null,
    [salePopupProducts, salePopupIndex],
  );
  const activeSaleSeed = useMemo(
    () => (activeSaleProduct?.id ? hashSeed(`${activeSaleProduct.id}:${salePopupIndex}`) : 0),
    [activeSaleProduct, salePopupIndex],
  );
  const salePopupNames = useMemo(
    () =>
      prefersArabicCopy
        ? ["نور", "سارة", "منة", "عمر", "لينا", "كريم", "سلمى", "يوسف"]
        : SALE_POPUP_NAMES,
    [prefersArabicCopy],
  );
  const salePopupCities = useMemo(
    () =>
      prefersArabicCopy
        ? ["القاهرة", "الجيزة", "المعادي", "مدينة نصر", "المهندسين", "التجمع"]
        : SALE_POPUP_CITIES,
    [prefersArabicCopy],
  );
  const salePopupPositionClass = isProductPage
    ? "bottom-32 left-4 md:bottom-24"
    : "bottom-24 left-4 md:bottom-6";
  const activeSaleName =
    salePopupNames[activeSaleSeed % salePopupNames.length] ||
    (prefersArabicCopy ? "عميل" : "Customer");
  const activeSaleCity =
    salePopupCities[Math.floor(activeSaleSeed / 3) % salePopupCities.length] ||
    (prefersArabicCopy ? "مدينتك" : "your city");
  const activeSaleMinutesAgo = 2 + (activeSaleSeed % 24);
  const activeSalePath = useMemo(
    () =>
      activeSaleProduct
        ? buildStorefrontPath(
            location.pathname,
            `/product/${activeSaleProduct.slug || activeSaleProduct.id}`,
            location.search,
          )
        : shopPath,
    [activeSaleProduct, location.pathname, location.search, shopPath],
  );
  const exitIntentCouponCode = String(copy["exitIntentCouponCode"] || "").trim();
  const exitIntentTitle = resolveDirectionalCopy({
    value: copy["exitIntentTitle"],
    englishFallback: "Before you go",
    arabicFallback: "قبل ما تغادر",
    prefersArabicCopy,
  });
  const exitIntentDescription = resolveDirectionalCopy({
    value: copy["exitIntentDescription"],
    englishFallback:
      "Your offer is still live. Finish the order now and enjoy the current deal.",
    arabicFallback:
      "عرضك ما زال شغال. كمّل الطلب الآن واستفد من السعر الحالي قبل ما يفوتك.",
    prefersArabicCopy,
  });
  const exitIntentPrimaryLabel = resolveDirectionalCopy({
    value: copy["exitIntentPrimaryLabel"],
    englishFallback: "Continue shopping",
    arabicFallback: "أكمل التسوق",
    prefersArabicCopy,
  });
  const exitIntentSecondaryLabel = resolveDirectionalCopy({
    value: copy["exitIntentSecondaryLabel"],
    englishFallback: "Dismiss",
    arabicFallback: "إغلاق",
    prefersArabicCopy,
  });
  const exitIntentBadge = resolveDirectionalCopy({
    value: copy["exitIntentBadge"],
    englishFallback: "Exit Intent",
    arabicFallback: "تنبيه قبل المغادرة",
    prefersArabicCopy,
  });
  const exitIntentCouponHint = resolveDirectionalCopy({
    value: copy["exitIntentCouponHint"],
    englishFallback: "Copy this code and apply it at checkout.",
    arabicFallback: "انسخ هذا الكود واستخدمه عند إتمام الطلب.",
    prefersArabicCopy,
  });
  const inactiveTabTitle = resolveDirectionalCopy({
    value: copy["inactiveTabTitle"],
    englishFallback: "Come back before this offer ends",
    arabicFallback: "ارجع قبل ما ينتهي العرض",
    prefersArabicCopy,
  });
  const countdownLabel = resolveDirectionalCopy({
    value: countdown["label"],
    englishFallback: "Offer ends in",
    arabicFallback: "ينتهي العرض خلال",
    prefersArabicCopy,
  });
  const countdownDescription = prefersArabicCopy
    ? "العرض الحالي شغّال لفترة محدودة على الأصناف الأكثر طلبًا."
    : "The current deal is live for a limited time on top-selling picks.";
  const shouldHideGlobalCountdownOnPdp =
    INLINE_PDP_COUNTDOWN_THEME_IDS.has(theme.id) &&
    location.pathname.includes("/product/");
  const shouldRenderGlobalCountdown =
    Boolean(modules["saleCountdown"]) &&
    !countdownExpired &&
    !shouldHideGlobalCountdownOnPdp &&
    !isQuietDiscoveryChrome;
  const closeLabel = prefersArabicCopy ? "إغلاق" : "Close";
  const couponCodeLabel = prefersArabicCopy ? "كود الخصم" : "Coupon code";
  const copyLabel = prefersArabicCopy ? "نسخ" : "Copy";
  const copiedLabel = prefersArabicCopy ? "تم النسخ" : "Copied";
  const suggestedHookLabel = prefersArabicCopy ? "عرض إضافي" : "Extra offer";
  const suggestedHookDescription = prefersArabicCopy
    ? "كمّل الطلب الآن واستفد من العرض الحالي قبل انتهاء الوقت."
    : "Complete the order now and use the current deal before time runs out.";
  const freeShippingCtaLabel =
    subtotal > 0
      ? prefersArabicCopy
        ? "كمّل الطلب"
        : "View cart"
      : prefersArabicCopy
        ? "ابدأ الطلب"
        : "Start order";
  const freeShippingCtaPath = subtotal > 0 ? cartPath : shopPath;
  const freeShippingSupportNote = isBiteRush
    ? prefersArabicCopy
      ? "كل جنيه زيادة يقربك من توصيل مجاني وطلب أعلى قيمة."
      : "Every extra item moves the order closer to free shipping."
    : isCafeDemo
      ? prefersArabicCopy
        ? "كمّل الطلب بحلو أو أداة تحضير وخلي التوصيل علينا."
        : "Add a pastry or brew tool to unlock free delivery."
    : isPharmacy
      ? prefersArabicCopy
        ? "كل منتج إضافي يقربك من توصيل مجاني وتجهيز أسرع لطلبك."
        : "Each extra essential moves the order closer to free shipping."
    : isKhemetLuxe
      ? prefersArabicCopy
        ? "أضيفي لسلتك لتصلي إلى الشحن المجاني لكافة المحافظات."
        : "Add more to your cart to unlock free shipping across Egypt."
      : prefersArabicCopy
        ? "كل جنيه زيادة يقربك من توصيل مجاني وطلب أعلى قيمة."
        : "Every extra item moves the order closer to free shipping.";
  const freeShippingPrimaryCtaLabel =
    subtotal > 0 && (isBiteRush || isPharmacy || isCafeDemo)
      ? prefersArabicCopy
        ? "افتح السلة"
        : "View cart"
      : freeShippingCtaLabel;
  const salePopupBadgeLabel = isPharmacy
    ? prefersArabicCopy
      ? "طلب حديث"
      : "Recent Order"
    : isCafeDemo
      ? prefersArabicCopy
        ? "طلب قهوة الآن"
        : "Coffee Order"
    : theme.direction === "rtl"
      ? "طلب مباشر الآن"
      : "Live Sale";

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleEmbeddedCheckoutVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      setIsEmbeddedCheckoutActive(customEvent.detail?.open === true);
    };

    window.addEventListener(
      STOREFRONT_PDP_CHECKOUT_VISIBILITY_EVENT,
      handleEmbeddedCheckoutVisibility as EventListener,
    );

    return () => {
      window.removeEventListener(
        STOREFRONT_PDP_CHECKOUT_VISIBILITY_EVENT,
        handleEmbeddedCheckoutVisibility as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!shouldRenderShellMount || !inactiveTabEnabled) {
      return undefined;
    }

    const originalTitle = document.title;
    const handleVisibilityChange = () => {
      document.title = document.hidden ? inactiveTabTitle : originalTitle;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.title = originalTitle;
    };
  }, [inactiveTabEnabled, inactiveTabTitle, shouldRenderShellMount]);

  useEffect(() => {
    if (!shouldRenderShellMount || !exitIntentPopupEnabled) {
      return undefined;
    }

    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(exitPopupStorageKey) === "shown";
    } catch {
      alreadyShown = false;
    }

    if (alreadyShown) {
      return undefined;
    }

    const handleMouseOut = (event: MouseEvent) => {
      if (window.innerWidth < 1024 || showExitPopup) {
        return;
      }

      if (event.relatedTarget || event.clientY > 8) {
        return;
      }

      setShowExitPopup(true);

      try {
        window.sessionStorage.setItem(exitPopupStorageKey, "shown");
      } catch {
        // Ignore storage failures in restrictive environments.
      }
    };

    document.addEventListener("mouseout", handleMouseOut);
    return () => document.removeEventListener("mouseout", handleMouseOut);
  }, [
    exitIntentPopupEnabled,
    exitPopupStorageKey,
    shouldRenderShellMount,
    showExitPopup,
  ]);

  useEffect(() => {
    if (!showExitPopup) {
      setCouponCopied(false);
    }
  }, [showExitPopup]);

  useEffect(() => {
    if (
      !shouldRenderShellMount ||
      !freeShippingBarEnabled ||
      thresholdAmount <= 0
    ) {
      return;
    }

    void trackStorefrontAppUsage({
      slug: "conversion-suite",
      feature: "free_shipping_bar_view",
      dedupeKey: `free-shipping-bar:${trackingScope}:${location.pathname}`,
      metadata: {
        barPosition,
        thresholdAmount,
      },
    });
  }, [
    barPosition,
    freeShippingBarEnabled,
    location.pathname,
    shouldRenderShellMount,
    thresholdAmount,
    trackingScope,
  ]);

  useEffect(() => {
    if (!showExitPopup) {
      return;
    }

    void trackStorefrontAppUsage({
      slug: "conversion-suite",
      feature: "exit_intent_popup_view",
      dedupeKey: `exit-intent-popup:${trackingScope}:${location.pathname}`,
      metadata: {
        popupStyle,
      },
    });
  }, [location.pathname, popupStyle, showExitPopup, trackingScope]);

  useEffect(() => {
    if (!shouldRenderShellMount && isEmbeddedCheckoutActive) {
      setShowExitPopup(false);
      setShowSalePopup(false);
    }
  }, [isEmbeddedCheckoutActive, shouldRenderShellMount]);

  useEffect(() => {
    if (!shouldRenderShellMount || !fakeSalePopupEnabled) {
      setSalePopupProducts([]);
      setShowSalePopup(false);
      return undefined;
    }

    let cancelled = false;

    const loadProducts = async () => {
      if (previewDataset) {
        const previewResponse = filterThemePreviewProducts(previewDataset, {
          limit: 6,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        setSalePopupProducts(previewResponse.data);
        return;
      }

      try {
        if (isMarketplacePreview) {
          const { getMarketplacePreviewProducts } = await import(
            "../preview/marketplaceSampleData"
          );
          const previewProducts = getMarketplacePreviewProducts({
            limit: 6,
            sortBy: "createdAt",
            sortOrder: "desc",
          });

          if (previewProducts) {
            setSalePopupProducts(previewProducts.data);
            return;
          }
        }

        const response = await storefrontFetch("/products", {
          query: {
            limit: 6,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
        });

        if (cancelled) {
          return;
        }

        const products = Array.isArray(response?.data)
          ? (response.data as Product[]).filter((product) => product?.id && product?.name)
          : [];
        setSalePopupProducts(products);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load fake sale popup products:", error);
          setSalePopupProducts([]);
        }
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [
    fakeSalePopupEnabled,
    isMarketplacePreview,
    previewDataset,
    shouldRenderShellMount,
  ]);

  useEffect(() => {
    if (
      !shouldRenderShellMount ||
      !fakeSalePopupEnabled ||
      salePopupProducts.length === 0 ||
      showExitPopup
    ) {
      setShowSalePopup(false);
      return undefined;
    }

    let hideTimeoutId = 0;

    const showNextPopup = () => {
      setSalePopupIndex((current) => (current + 1) % salePopupProducts.length);
      setShowSalePopup(true);

      window.clearTimeout(hideTimeoutId);
      hideTimeoutId = window.setTimeout(() => {
        setShowSalePopup(false);
      }, 4200);
    };

    const initialTimeoutId = window.setTimeout(showNextPopup, 6500);
    const intervalId = window.setInterval(showNextPopup, 16000);

    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearTimeout(hideTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [
    fakeSalePopupEnabled,
    salePopupProducts.length,
    shouldRenderShellMount,
    showExitPopup,
  ]);

  const renderFreeShippingBar = useMemo(() => {
    if (!freeShippingBarEnabled || thresholdAmount <= 0) {
      return null;
    }

    if (isRedlineAuto) {
      // 2026 UX Rule: Never pollute or push down the product page hero above the fold when cart is empty
      if (isProductPage && subtotal === 0) {
        return null;
      }

      return (
        <div
          className={`w-full border-b border-red-600/30 bg-[#0c0d10] text-white shadow-xs ${
            barPosition === "bottom"
              ? "fixed inset-x-4 bottom-4 z-[70] rounded-xl border border-red-500/30 px-4 py-2.5 shadow-2xl md:inset-x-auto md:right-6 md:w-[420px]"
              : shouldOffsetTopUtilityBarForHeader
                ? "pt-24"
                : ""
          }`}
        >
          <div className="mx-auto max-w-6xl px-3 py-2 md:px-6">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-red-600/20 text-red-400 p-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                    <path d="M15 18H9" />
                    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
                    <circle cx="17" cy="18.5" r="2.5" />
                    <circle cx="7" cy="18.5" r="2.5" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-neutral-200">
                      {subtotal > 0
                        ? freeShippingMessage
                        : prefersArabicCopy
                          ? `شحن مجاني لكافة محافظات مصر للطلبات من ${formatStorefrontCurrency(thresholdAmount, currency)}`
                          : `Free shipping on all orders over ${formatStorefrontCurrency(thresholdAmount, currency)}`}
                    </span>
                  </div>
                  {subtotal > 0 && (
                    <div className="mt-1 h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-red-500 transition-[width] duration-500"
                        style={{ width: `${freeShippingProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-neutral-300">
                  {subtotal > 0
                    ? formatStorefrontCurrency(subtotal, currency)
                    : formatStorefrontCurrency(thresholdAmount, currency)}
                </span>
                {subtotal > 0 && (
                  <Link
                    to={cartPath}
                    className="inline-flex items-center rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold text-white transition hover:bg-red-700"
                  >
                    {prefersArabicCopy ? "السلة" : "Cart"}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`w-full animate-conversion-card ${
          isBiteRush
            ? "border-b border-[#f8c08c] bg-[linear-gradient(135deg,#111111_0%,#2b160b_100%)] text-white"
            : isCafeDemo
              ? "border-b border-[#e6d0bc] bg-[linear-gradient(135deg,#2b1b12_0%,#4b2e1f_52%,#6f4a33_100%)] text-white"
              : isPharmacy
                ? "border-b border-[#99f6e4] bg-[linear-gradient(135deg,#f7fffe_0%,#d8fbf4_100%)] text-slate-900"
                : isKhemetLuxe
                  ? "border-b border-[#183f31]/30 bg-[#183f31] text-[#fff8ee]"
                  : "border-b border-primary/10 bg-primary text-primary-foreground"
        } ${
          barPosition === "bottom"
            ? "fixed inset-x-4 bottom-4 z-[70] rounded-2xl border px-4 py-3 shadow-2xl md:inset-x-auto md:right-6 md:w-[420px]"
            : shouldOffsetTopUtilityBarForHeader
              ? "pt-24"
            : ""
        }`}
      >
        <div
          className={`mx-auto max-w-6xl ${
            isCompactMarketplacePreviewChrome && barPosition === "top"
              ? "px-3 py-2 md:px-6 md:py-2.5"
              : "px-4 py-3 md:px-6"
          }`}
        >
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center justify-center rounded-full ${
                  isCompactMarketplacePreviewChrome && barPosition === "top"
                    ? "h-7 w-7 text-[10px]"
                    : "h-8 w-8 text-xs font-bold"
                } ${
                  isBiteRush
                    ? "bg-white/12 text-white"
                    : isCafeDemo
                      ? "bg-white/12 text-[#f8eadf]"
                    : isPharmacy
                      ? "bg-[#0f766e]/10 text-[#0f766e]"
                      : isKhemetLuxe
                        ? "bg-[#c5a470]/25 text-[#f5ecd9]"
                        : "bg-white/15"
                }`}>
                  {isBiteRush || isPharmacy ? "توصيل" : isCafeDemo ? "قهوة" : isKhemetLuxe ? "شحن مجاني" : "شحن"}
                </span>
                <span className="truncate">{freeShippingMessage}</span>
              </div>
                <div
                  className={`mt-2 h-1.5 overflow-hidden rounded-full ${
                  isBiteRush
                    ? "bg-white/10"
                    : isCafeDemo
                      ? "bg-white/10"
                    : isPharmacy
                      ? "bg-[#0f766e]/12"
                      : isKhemetLuxe
                        ? "bg-white/15"
                        : "bg-white/20"
                }`}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${
                    isBiteRush
                      ? "bg-[linear-gradient(90deg,#f97316_0%,#facc15_100%)]"
                      : isCafeDemo
                        ? "bg-[linear-gradient(90deg,#d6a77a_0%,#f4dfcc_100%)]"
                      : isPharmacy
                        ? "bg-[linear-gradient(90deg,#14b8a6_0%,#0f766e_100%)]"
                        : isKhemetLuxe
                          ? "bg-[linear-gradient(90deg,#c5a470_0%,#f0dfc4_100%)]"
                          : "bg-white"
                  }`}
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
            <span className={`shrink-0 rounded-full ${
              isCompactMarketplacePreviewChrome && barPosition === "top"
                ? "px-2.5 py-1 text-[11px]"
                : "px-3 py-1 text-xs"
            } font-bold tracking-wide ${
              isBiteRush
                ? "bg-white/10 text-white"
                : isCafeDemo
                  ? "bg-white/12 text-[#f8eadf]"
                : isPharmacy
                  ? "bg-white text-[#0f766e] shadow-[0_10px_24px_-16px_rgba(15,118,110,0.45)]"
                  : isKhemetLuxe
                    ? "bg-[#c5a470]/20 text-[#fff8ee]"
                    : "bg-white/15 uppercase"
            }`}>
              {subtotal > 0
                ? formatStorefrontCurrency(subtotal, currency)
                : formatStorefrontCurrency(thresholdAmount, currency)}
            </span>
          </div>
          <div
            className={`mt-3 items-center justify-between gap-3 ${
              isCompactMarketplacePreviewChrome && barPosition === "top"
                ? "hidden md:flex"
                : "flex"
            }`}
          >
            <p
              className={`text-[11px] ${
                isBiteRush
                  ? "text-white/70"
                  : isCafeDemo
                    ? "text-[#f5e2cf]"
                  : isPharmacy
                    ? "text-[#0f766e]/75"
                    : isKhemetLuxe
                      ? "text-[#f5ecd9]/90"
                      : "text-primary-foreground/80"
              }`}
            >
              {freeShippingSupportNote}
            </p>
            <Link
              to={freeShippingCtaPath}
              className={`inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-xs font-black transition ${
                isBiteRush
                  ? "bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] text-white shadow-[0_16px_34px_-20px_rgba(239,68,68,0.9)]"
                  : isCafeDemo
                    ? "bg-[linear-gradient(135deg,#d6a77a_0%,#f4dfcc_100%)] text-[#2c1d14] shadow-[0_16px_34px_-20px_rgba(214,167,122,0.42)] hover:bg-[#f7dec6]"
                  : isPharmacy
                    ? "bg-[#0f766e] text-white shadow-[0_16px_34px_-20px_rgba(15,118,110,0.45)] hover:bg-[#0b5f59]"
                    : isKhemetLuxe
                      ? "bg-[#c5a470] text-[#183f31] shadow-[0_16px_34px_-20px_rgba(197,164,112,0.6)] hover:bg-[#d6b785]"
                      : "bg-white/15 text-primary-foreground hover:bg-white/20"
              }`}
            >
              {freeShippingPrimaryCtaLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  }, [
    freeShippingBarEnabled,
    thresholdAmount,
    isBiteRush,
    isCafeDemo,
    isPharmacy,
    isRedlineAuto,
    isProductPage,
    barPosition,
    shouldOffsetTopUtilityBarForHeader,
    isCompactMarketplacePreviewChrome,
    freeShippingMessage,
    freeShippingProgress,
    freeShippingSupportNote,
    freeShippingPrimaryCtaLabel,
    freeShippingCtaPath,
    subtotal,
    currency,
    cartPath,
    prefersArabicCopy,
  ]);

  if (!shouldRenderShellMount) {
    return null;
  }

  const handleCopyCoupon = async () => {
    if (!exitIntentCouponCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(exitIntentCouponCode);
      setCouponCopied(true);
      window.setTimeout(() => setCouponCopied(false), 2200);
    } catch {
      setCouponCopied(false);
    }
  };

  return (
    <>
      {barPosition === "top" ? renderFreeShippingBar : null}

      {shouldRenderGlobalCountdown ? (
        <section
          className={`border-b border-border animate-conversion-card conversion-stagger-1 ${
            isCompactMarketplacePreviewChrome
              ? "bg-secondary/60"
              : "bg-secondary/70"
          }`}
        >
          <div
            className={`container flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between ${
              isCompactMarketplacePreviewChrome
                ? "px-3 py-2 md:px-6"
                : "px-4 py-3 md:px-6"
            }`}
          >
            <div className="flex items-center gap-3 text-foreground">
              <span
                className={`inline-flex items-center justify-center rounded-full bg-primary/10 font-black uppercase text-primary ${
                  isCompactMarketplacePreviewChrome ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]"
                }`}
              >
                {theme.direction === 'rtl' ? 'الآن' : 'Hot'}
              </span>
              <div>
                <p className="font-semibold text-foreground">
                  {countdownLabel}
                </p>
                <p
                  className={`text-xs text-muted-foreground ${
                    isCompactMarketplacePreviewChrome ? "hidden md:block" : ""
                  }`}
                >
                  {countdownDescription}
                </p>
              </div>
            </div>
            <NowTicker
              endsAt={countdownEndsAt}
              className={`rounded-full border border-border bg-background font-black tracking-wide text-foreground ${
                isCompactMarketplacePreviewChrome ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-sm"
              }`}
              onExpired={handleCountdownExpired}
            />
          </div>
        </section>
      ) : null}

      {barPosition === "bottom" ? renderFreeShippingBar : null}

      {fakeSalePopupEnabled && (
        <AnimatePresence>
          {showSalePopup && activeSaleProduct && (
            <motion.div
              initial={{ x: theme.direction === 'rtl' ? 100 : -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: theme.direction === 'rtl' ? 100 : -100, opacity: 0 }}
              className={`fixed ${salePopupPositionClass} z-[75] w-[calc(100vw-2rem)] max-w-sm pointer-events-none`}
            >
              <Link
                to={activeSalePath}
                className={`flex items-center gap-4 rounded-[2rem] p-3 pointer-events-auto ${
                  isBiteRush
                    ? 'border border-[#f8c08c] bg-[linear-gradient(135deg,rgba(255,249,243,0.97),rgba(255,236,214,0.96))] shadow-[0_24px_60px_-22px_rgba(247,115,22,0.34)]'
                    : isCafeDemo
                      ? 'border border-[#e6d0bc] bg-[linear-gradient(135deg,rgba(255,252,248,0.97),rgba(245,233,220,0.96))] shadow-[0_24px_60px_-22px_rgba(111,74,51,0.22)]'
                    : 'border border-border/40 bg-background/80 backdrop-blur-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]'
                }`}
              >
                <div className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ${isBiteRush ? 'bg-[#fff1e2]' : isCafeDemo ? 'bg-[#f5e7d9]' : 'bg-secondary/40'} shadow-inner`}>
                  <StorefrontProductImage
                    candidates={[getPrimaryProductImage(activeSaleProduct)]}
                    alt={activeSaleProduct.name}
                    className="h-full w-full object-cover"
                  />
                  <div className={`absolute top-1 right-1 rounded-lg p-1 ${
                    isBiteRush
                      ? 'bg-[#111111] text-white'
                      : isCafeDemo
                        ? 'bg-[#4b2e1f] text-[#f8eadf]'
                      : isPharmacy
                        ? 'bg-[#0f766e] text-white'
                        : 'bg-primary text-white'
                  }`}>
                    <ShoppingCart size={10} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
                    isBiteRush
                      ? 'bg-[#111111] text-white'
                      : isCafeDemo
                        ? 'bg-[#4b2e1f] text-[#f8eadf]'
                      : isPharmacy
                        ? 'bg-[#0f766e]/10 text-[#0f766e]'
                        : 'bg-primary/10 text-primary'
                  }`}>
                    {salePopupBadgeLabel}
                  </span>
                  <p className="mt-1 line-clamp-2 text-xs font-black text-foreground">
                    {theme.direction === 'rtl' 
                      ? `${activeSaleName} من ${activeSaleCity} اشترى ${activeSaleProduct.name}`
                      : `${activeSaleName} from ${activeSaleCity} purchased ${activeSaleProduct.name}`}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground font-medium opacity-60">
                    {theme.direction === 'rtl' 
                      ? `منذ ${activeSaleMinutesAgo} دقائق`
                      : `${activeSaleMinutesAgo} minutes ago`}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-xs font-black text-primary">
                    {formatStorefrontCurrency(activeSaleProduct.price || 0, currency)}
                  </span>
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {showExitPopup ? (
        <div className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm">
          <div className="flex min-h-screen items-center justify-center px-4">
            <div
              className={`w-full max-w-md rounded-[1.75rem] p-6 shadow-2xl animate-conversion-card ${
                isBiteRush
                  ? 'border border-[#f8c08c] bg-[linear-gradient(135deg,#fffaf5_0%,#fff0e0_100%)] shadow-[0_40px_90px_-42px_rgba(17,17,17,0.35)]'
                  : isCafeDemo
                    ? 'border border-[#e6d0bc] bg-[linear-gradient(135deg,#fffdfb_0%,#f5ebdf_100%)] shadow-[0_40px_90px_-42px_rgba(111,74,51,0.22)]'
                  : 'border border-border bg-card'
              } ${
                !isBiteRush && ui["popupStyle"] === "promo"
                  ? "border-primary/15 bg-[linear-gradient(135deg,hsl(var(--background)),hsl(var(--primary)/0.08))]"
                  : !isBiteRush && ui["popupStyle"] === "coupon"
                    ? "border-emerald-300/30 bg-[linear-gradient(135deg,#fbfffc,hsl(var(--background)))]"
                    : ""
              }`}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    isBiteRush ? 'bg-[#111111] text-white' : isCafeDemo ? 'bg-[#4b2e1f] text-[#f8eadf]' : 'bg-primary/10 text-primary'
                  }`}>
                    {exitIntentBadge}
                  </span>
                  <h3 className="mt-3 text-2xl font-black text-foreground">
                    {exitIntentTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {exitIntentDescription}
                  </p>
                </div>
                  <button
                    type="button"
                    onClick={() => setShowExitPopup(false)}
                    className={`rounded-full px-3 py-2 text-sm font-semibold ${
                      isBiteRush
                        ? 'border border-[#f8c08c] text-[#8a4b1f] hover:text-[#111111]'
                        : isCafeDemo
                          ? 'border border-[#e6d0bc] text-[#6f4a33] hover:text-[#2c1d14]'
                        : 'border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {closeLabel}
                  </button>
              </div>

              {exitIntentCouponCode ? (
                <div className={`rounded-2xl border border-dashed p-4 text-sm text-foreground ${
                  isBiteRush ? 'border-[#f8c08c] bg-white/70' : isCafeDemo ? 'border-[#e6d0bc] bg-white/80' : 'border-primary/30 bg-primary/5'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{couponCodeLabel}</p>
                      <p className="mt-1 text-muted-foreground">{exitIntentCouponHint}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCoupon}
                      className={`inline-flex shrink-0 items-center justify-center rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] ${
                        isBiteRush
                          ? 'border border-[#111111] bg-[#111111] text-white hover:bg-[#f97316] hover:border-[#f97316]'
                          : isCafeDemo
                            ? 'border border-[#4b2e1f] bg-[#4b2e1f] text-white hover:bg-[#6f4a33] hover:border-[#6f4a33]'
                          : 'border border-primary/20 bg-background text-primary hover:bg-primary/5'
                      }`}
                    >
                      {couponCopied ? copiedLabel : copyLabel}
                    </button>
                  </div>
                  <div className={`mt-4 rounded-2xl px-4 py-3 text-center text-lg font-black tracking-[0.28em] text-foreground ${
                    isBiteRush ? 'bg-[#111111] text-white' : isCafeDemo ? 'bg-[#2b1b12] text-[#f8eadf]' : 'bg-background'
                  }`}>
                    {exitIntentCouponCode}
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl border border-dashed p-4 text-sm text-foreground ${
                  isBiteRush ? 'border-[#f8c08c] bg-white/70' : isCafeDemo ? 'border-[#e6d0bc] bg-white/80' : 'border-primary/30 bg-primary/5'
                }`}>
                  <p className="font-semibold">{suggestedHookLabel}</p>
                  <p className="mt-1 text-muted-foreground">
                    {suggestedHookDescription}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={shopPath}
                  onClick={() => setShowExitPopup(false)}
                  className={`inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold ${
                    isBiteRush
                      ? 'bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] text-white'
                      : isCafeDemo
                        ? 'bg-[linear-gradient(135deg,#6f4a33_0%,#d6a77a_100%)] text-white'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  }`}
                >
                  {exitIntentPrimaryLabel}
                </Link>
                <button
                  type="button"
                  onClick={() => setShowExitPopup(false)}
                  className={`inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isBiteRush
                      ? 'border border-[#111111]/15 bg-white text-[#111111] hover:bg-[#fff3e6]'
                      : isCafeDemo
                        ? 'border border-[#e6d0bc] bg-white text-[#4b2e1f] hover:bg-[#fff5eb]'
                      : 'border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {exitIntentSecondaryLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default GlobalConversionHost;
