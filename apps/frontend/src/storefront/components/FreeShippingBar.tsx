import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Truck, Check } from "lucide-react";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { useCartStore } from "../store/useCartStore";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "../utils/marketplaceApps";
import { formatStorefrontCurrency } from "../utils/currency";
import { buildStorefrontPath } from "../utils/paths";
import { isPharmacyThemeId } from "../utils/pharmacyThemes";
import { trackStorefrontAppUsage } from "../utils/appUsageTracking";

const hasCheckoutLikePath = (pathname: string): boolean =>
  pathname.endsWith("/checkout") || pathname.endsWith("/thank-you");

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

export const FreeShippingBar: React.FC = () => {
  const location = useLocation();
  const { settings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const prefersArabicCopy = theme.direction === "rtl";

  const isBiteRush = theme.id === "restaurant-demo";
  const isCafeDemo = theme.id === "cafe-demo";
  const isPharmacy = isPharmacyThemeId(theme.id);
  const isRedlineAuto = theme.id === "redline-auto";
  const isKhemetLuxe = theme.id === "khemet-luxe-eg" || theme.id === "khemet-luxe-v2";

  const subtotal = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.price * item.quantity, 0),
  );

  const currency =
    settings?.storefront?.settings?.currency || settings?.company?.currency || "EGP";

  const isEnabled = isStorefrontMarketplaceAppEnabled(settings, "conversion-suite");
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    settings,
    "conversion-suite",
  );

  const modules =
    (conversionSettings["modules"] as Record<string, unknown> | undefined) || {};
  const ui =
    (conversionSettings["ui"] as Record<string, unknown> | undefined) || {};
  const general =
    (conversionSettings["general"] as Record<string, unknown> | undefined) || {};
  const copy =
    (conversionSettings["copy"] as Record<string, unknown> | undefined) || {};
  const thresholds =
    (conversionSettings["thresholds"] as Record<string, unknown> | undefined) || {};

  const attachToThemeShell = general["attachToThemeShell"] !== false;
  const freeShippingBarEnabled = Boolean(modules["freeShippingBar"]);
  const thresholdAmount = Number(thresholds["freeShippingAmount"] || 0);
  const barPosition = ui["barPosition"] === "bottom" ? "bottom" : "top";

  const isProductPage = location.pathname.includes("/product/");
  const isHomePage =
    location.pathname === "/" ||
    location.pathname === "" ||
    location.pathname.endsWith("/store") ||
    location.pathname.endsWith("/store/");
  const shouldRender =
    isEnabled &&
    attachToThemeShell &&
    freeShippingBarEnabled &&
    thresholdAmount > 0 &&
    !hasCheckoutLikePath(location.pathname) &&
    !(isRedlineAuto && isProductPage && subtotal === 0) &&
    !isKhemetLuxe;

  const remainingToFreeShipping = Math.max(thresholdAmount - subtotal, 0);
  const isQualified = subtotal >= thresholdAmount && thresholdAmount > 0;

  const freeShippingTemplate = resolveDirectionalCopy({
    value: copy["freeShippingMessage"],
    englishFallback: "Add {{remaining}} to unlock free shipping",
    arabicFallback: "أضف {{remaining}} للحصول على شحن مجاني",
    prefersArabicCopy,
  });

  const freeShippingMessage = useMemo(() => {
    if (isQualified) {
      return resolveDirectionalCopy({
        value: copy["freeShippingReachedMessage"],
        englishFallback: "You unlocked free shipping",
        arabicFallback: "مبروك! تم تفعيل الشحن المجاني",
        prefersArabicCopy,
      });
    }
    return freeShippingTemplate.replace(
      "{{remaining}}",
      formatStorefrontCurrency(remainingToFreeShipping, currency),
    );
  }, [isQualified, remainingToFreeShipping, freeShippingTemplate, currency, copy, prefersArabicCopy]);

  const freeShippingProgress = useMemo(
    () => (thresholdAmount > 0 ? Math.min(100, Math.max(0, (subtotal / thresholdAmount) * 100)) : 0),
    [thresholdAmount, subtotal],
  );

  const shopPath = buildStorefrontPath(location.pathname, "/shop", location.search);
  const cartPath = buildStorefrontPath(location.pathname, "/cart", location.search);
  const ctaPath = subtotal > 0 ? cartPath : shopPath;
  const trackingScope = settings?.company?.id || "store";

  React.useEffect(() => {
    if (!shouldRender) {
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
  }, [barPosition, location.pathname, shouldRender, thresholdAmount, trackingScope]);

  const ctaLabel = subtotal > 0
    ? (prefersArabicCopy ? "كمّل الطلب" : "View cart")
    : (prefersArabicCopy ? "ابدأ التسوق" : "Shop now");

  if (!shouldRender) {
    return null;
  }

  // Theme-specific color schemes complying with 2026 Single-Surface Architecture
  const themeClasses = isBiteRush
    ? "border-b border-[#f8c08c] bg-[linear-gradient(135deg,#111111_0%,#2b160b_100%)] text-white"
    : isCafeDemo
      ? "border-b border-[#e6d0bc] bg-[linear-gradient(135deg,#2b1b12_0%,#4b2e1f_52%,#6f4a33_100%)] text-white"
      : isPharmacy
        ? "border-b border-[#99f6e4] bg-[linear-gradient(135deg,#f7fffe_0%,#d8fbf4_100%)] text-slate-900"
        : isKhemetLuxe
          ? "border-b border-[#c5a470]/30 bg-[#183f31] text-[#fff8ee]"
          : isRedlineAuto
            ? "border-b border-red-500/20 bg-[#0a0d10] text-white"
            : "border-b border-primary/10 bg-primary text-primary-foreground";

  const progressTrackBg = isBiteRush || isCafeDemo
    ? "bg-white/10"
    : isPharmacy
      ? "bg-[#0f766e]/12"
      : isKhemetLuxe
        ? "bg-black/25"
        : isRedlineAuto
          ? "bg-white/10"
          : "bg-white/20";

  const progressFillBg = isBiteRush
    ? "bg-[linear-gradient(90deg,#f97316_0%,#facc15_100%)]"
    : isCafeDemo
      ? "bg-[linear-gradient(90deg,#d6a77a_0%,#f4dfcc_100%)]"
      : isPharmacy
        ? "bg-[linear-gradient(90deg,#14b8a6_0%,#0f766e_100%)]"
        : isKhemetLuxe
          ? "bg-[linear-gradient(90deg,#c5a470_0%,#f0dfc4_100%)]"
          : isRedlineAuto
            ? "bg-[linear-gradient(90deg,#e11d48_0%,#ef4444_100%)]"
            : "bg-white";

  const badgeClasses = isBiteRush
    ? "bg-white/10 text-white"
    : isCafeDemo
      ? "bg-white/12 text-[#f8eadf]"
      : isPharmacy
        ? "bg-[#0f766e]/10 text-[#0f766e]"
        : isKhemetLuxe
          ? "bg-[#c5a470]/20 text-[#fff8ee] border border-[#c5a470]/30"
          : isRedlineAuto
            ? "bg-red-500/20 text-red-400 border border-red-500/30"
            : "bg-white/15 text-white";

  const ctaClasses = isBiteRush
    ? "bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] text-white shadow-sm hover:brightness-110"
    : isCafeDemo
      ? "bg-[linear-gradient(135deg,#d6a77a_0%,#f4dfcc_100%)] text-[#2c1d14] shadow-sm hover:bg-[#f7dec6]"
      : isPharmacy
        ? "bg-[#0f766e] text-white shadow-sm hover:bg-[#0b5f59]"
        : isKhemetLuxe
          ? "bg-[#c5a470] text-[#183f31] font-black hover:bg-[#d6b785] transition-colors"
          : isRedlineAuto
            ? "bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-[0_0_15px_rgba(225,29,72,0.4)]"
            : "bg-white/20 text-white hover:bg-white/30";

  return (
    <div
      role="region"
      aria-label={prefersArabicCopy ? "شريط الشحن المجاني" : "Free shipping progress bar"}
      className={`w-full select-none transition-[background-color,border-color] duration-200 ${themeClasses} ${
        barPosition === "bottom"
          ? "fixed inset-x-4 bottom-4 z-[70] rounded-2xl border px-4 py-3 shadow-2xl md:inset-x-auto md:right-6 md:w-[420px]"
          : "relative z-[45]"
      }`}
    >
      <div className="mx-auto max-w-7xl px-3 py-2 sm:py-2.5 sm:px-6">
        <div className="flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={`inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeClasses}`}
            >
              {isQualified ? (
                <Check className="h-4 w-4 text-emerald-300" />
              ) : (
                <Truck className="h-3.5 w-3.5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-bold tracking-tight text-white/95 tabular-nums">
                  {freeShippingMessage}
                </span>
                <span className="shrink-0 hidden xs:inline text-[11px] font-bold tabular-nums opacity-80">
                  {formatStorefrontCurrency(subtotal, currency)} / {formatStorefrontCurrency(thresholdAmount, currency)}
                </span>
              </div>
              <div className={`mt-1.5 h-1.5 w-full overflow-hidden rounded-full ${progressTrackBg}`}>
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ease-out ${progressFillBg}`}
                  style={{ width: `${Math.max(freeShippingProgress > 0 ? 5 : 0, freeShippingProgress)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={ctaPath}
              className={`inline-flex items-center justify-center rounded-full px-3 py-1 sm:px-4 sm:py-1.5 text-xs font-bold tracking-wide active:scale-[0.97] transition-[transform,background-color] duration-150 ${ctaClasses}`}
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeShippingBar;
