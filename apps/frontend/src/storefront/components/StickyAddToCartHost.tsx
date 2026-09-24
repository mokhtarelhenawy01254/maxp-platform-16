import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useProduct } from "../hooks/useProduct";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import type { Product } from "../hooks/useProducts";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "../utils/marketplaceApps";
import { formatStorefrontCurrency } from "../utils/currency";
import { trackStorefrontAppUsage } from "../utils/appUsageTracking";
import { parseProductMetadata } from "../utils/productMetadata";
import { STOREFRONT_BUYBOX_ID } from "../utils/pdpCheckout";
import { getStorefrontProductRouteKey } from "../utils/paths";
import { isProductPageCheckoutEnabledForProduct } from "../../utils/productPageCheckout";
import { usePdpSelectionStore } from "../store/usePdpSelectionStore";
import { useCartStore } from "../store/useCartStore";

const STICKY_ADD_EVENT = "storefront:sticky-add-to-cart";
const STICKY_BUY_NOW_EVENT = "storefront:sticky-buy-now";
type JsonRecord = Record<string, unknown>;

// parseProductMetadata imported from ../utils/productMetadata

const normalizeExternalPurchaseUrl = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return "";
};

const normalizeStickyStyle = (
  value: unknown,
): "compact" | "balanced" | "minimal" => {
  if (typeof value !== "string") {
    return "compact";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "balanced" || normalized === "minimal") {
    return normalized;
  }

  return "compact";
};

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};

const resolveExternalProductAction = (product: Product | null | undefined) => {
  const metadata = parseProductMetadata(product?.["metadata"]);

  return {
    url: normalizeExternalPurchaseUrl(
      metadata["externalUrl"] ??
        metadata["affiliateUrl"] ??
        metadata["partnerUrl"] ??
        metadata["buyUrl"] ??
        product?.["externalUrl"] ??
        product?.["affiliateUrl"] ??
        product?.["partnerUrl"] ??
        product?.["buyUrl"],
    ),
    label:
      typeof metadata["externalButtonLabel"] === "string"
        ? metadata["externalButtonLabel"].trim()
        : typeof metadata["affiliateButtonLabel"] === "string"
          ? metadata["affiliateButtonLabel"].trim()
          : typeof metadata["externalLabel"] === "string"
            ? metadata["externalLabel"].trim()
            : typeof metadata["affiliateLabel"] === "string"
              ? metadata["affiliateLabel"].trim()
              : "",
    externalOnly: Boolean(
      metadata["externalOnly"] ||
        metadata["externalAffiliateOnly"] ||
        metadata["isExternalProduct"] ||
        product?.["source"] === "EXTERNAL" ||
        product?.["source"] === "AFFILIATE",
    ),
  };
};

const StickyAddToCartHost: React.FC = () => {
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const { settings } = useStorefrontSettings();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const productId = useMemo(
    () => getStorefrontProductRouteKey(location.pathname),
    [location.pathname],
  );
  const { product } = useProduct(productId || undefined);
  const [isBuyBoxVisible, setIsBuyBoxVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isGalleryZoomOpen, setIsGalleryZoomOpen] = useState(false);
  const isCartOpen = useCartStore((state) => state.isOpen);
  const selectionReady = usePdpSelectionStore(
    (state) =>
      state.selection?.productId === product?.id
        ? Boolean(state.selection?.isSelectionReady)
        : false,
  );
  const selectionUnitPrice = usePdpSelectionStore(
    (state) =>
      state.selection?.productId === product?.id
        ? state.selection?.unitPrice
        : undefined,
  );
  const selectionAttributes = usePdpSelectionStore(
    (state) =>
      state.selection?.productId === product?.id
        ? state.selection?.attributes
        : undefined,
    (a, b) => {
      if (a === b) return true;
      if (!a || !b) return false;
      const aK = Object.keys(a);
      const bK = Object.keys(b);
      if (aK.length !== bK.length) return false;
      return aK.every((k) => a[k] === b[k]);
    },
  );
  const quantity = usePdpSelectionStore((state) => state.quantity);

  const conversionEnabled = isStorefrontMarketplaceAppEnabled(
    settings,
    "conversion-suite",
  );
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    settings,
    "conversion-suite",
  );
  const commerceAdvancedEnabled = isStorefrontMarketplaceAppEnabled(
    settings,
    "commerce-advanced",
  );
  const commerceAdvancedSettings = getStorefrontMarketplaceAppSettings(
    settings,
    "commerce-advanced",
  );
  const modules = asRecord(conversionSettings["modules"]);
  const ui = asRecord(conversionSettings["ui"]);
  const commerceModules =
    asRecord(commerceAdvancedSettings["modules"]);
  const commerceCopy =
    asRecord(commerceAdvancedSettings["copy"]);
  const stickyEnabled = conversionEnabled && Boolean(modules["stickyAddToCart"]);
  const productPageCheckoutEnabled =
    isProductPageCheckoutEnabledForProduct(product, settings);
  const stickyStyle = normalizeStickyStyle(ui["stickyStyle"]);
  const hasVariants = Boolean(product?.productVariants?.length || product?.variants?.length);
  const isBiteRushPreview = searchParams.get("previewTheme") === "restaurant-demo";
  const isMenShoes = theme.id === "men-shoes-eg";
  const isKhemetLuxe = theme.id === "khemet-luxe-eg";
  const prefersArabicCopy =
    isBiteRushPreview ||
    (typeof document !== "undefined" && document.documentElement?.dir === "rtl") ||
    location.pathname.startsWith("/ar");
  const currency =
    settings?.storefront?.settings?.currency || settings?.company?.currency || "EGP";
  const externalProductAction = resolveExternalProductAction(product);
  const externalAffiliateEnabled =
    commerceAdvancedEnabled &&
    Boolean(commerceModules["externalAffiliate"]) &&
    Boolean(externalProductAction.url);
  const externalOnlyProduct =
    externalAffiliateEnabled && Boolean(externalProductAction.externalOnly);
  const canTriggerDirectPurchaseActions =
    externalOnlyProduct || !hasVariants || selectionReady;
  const activeSelectionSummary = useMemo(() => {
    if (!selectionAttributes) {
      return "";
    }

    return Object.values(selectionAttributes)
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(" • ");
  }, [selectionAttributes]);
  const stickyUnitPrice =
    typeof selectionUnitPrice === "number" && Number.isFinite(selectionUnitPrice)
      ? selectionUnitPrice
      : Number(product?.price) || 0;
  const primaryLabel = externalOnlyProduct
    ? externalProductAction.label ||
      String(commerceCopy["affiliateLabel"] || (prefersArabicCopy ? "اشتري من الشريك" : "Buy from partner"))
    : !canTriggerDirectPurchaseActions
      ? prefersArabicCopy
        ? isBiteRushPreview
          ? "اختر الإضافات"
          : "اختر الخيارات"
        : "Choose options"
      : prefersArabicCopy
        ? isBiteRushPreview
          ? "أضف للطلب"
          : "أضف للسلة"
        : "Add to cart";
  const secondaryLabel = !externalOnlyProduct && canTriggerDirectPurchaseActions
    ? prefersArabicCopy
      ? isBiteRushPreview
        ? "اطلب الآن"
        : "اشتر الآن"
      : "Buy now"
    : prefersArabicCopy
      ? "شاهد التفاصيل"
      : "View details";
  const stickyEtaText = prefersArabicCopy
    ? isBiteRushPreview
      ? "جاهز خلال 20-25 دقيقة"
      : isMenShoes
        ? "شحن واستبدال أوضح من نفس الشاشة"
      : "توصيل سريع"
    : "Ready in 20-25 min";
  const stickyHintText = prefersArabicCopy
    ? isBiteRushPreview
      ? "اسحب الزر وكمّل الطلب بسرعة"
      : isMenShoes
        ? "CTA ثابتة بتصرف أقرب لتطبيقات التسوق"
      : "أكمل الطلب بخطوة واحدة"
    : "Finish your order in one tap";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleZoomState = (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      setIsGalleryZoomOpen(Boolean(customEvent.detail?.open));
    };

    window.addEventListener(
      "storefront:pdp-gallery-zoom-open",
      handleZoomState as EventListener,
    );

    return () => {
      window.removeEventListener(
        "storefront:pdp-gallery-zoom-open",
        handleZoomState as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!stickyEnabled || !productId) {
      setIsBuyBoxVisible(true);
      return undefined;
    }

    let observer: IntersectionObserver | null = null;
    let retryTimer: ReturnType<typeof setInterval> | null = null;

    const attachObserver = () => {
      const target = document.getElementById(STOREFRONT_BUYBOX_ID);
      if (!target) {
        return false;
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          setIsBuyBoxVisible(Boolean(entry?.isIntersecting));
        },
        {
          threshold: 0.2,
        },
      );

      observer.observe(target);
      return true;
    };

    if (!attachObserver()) {
      retryTimer = setInterval(() => {
        if (attachObserver() && retryTimer !== null) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
      }, 300);
    }

    return () => {
      observer?.disconnect();
      if (retryTimer !== null) {
        clearInterval(retryTimer);
      }
    };
  }, [productId, stickyEnabled]);

  const handlePrimaryAction = () => {
    void trackStorefrontAppUsage({
      slug: externalOnlyProduct ? "commerce-advanced" : "conversion-suite",
      feature: externalOnlyProduct
        ? "sticky_external_click"
        : !canTriggerDirectPurchaseActions
          ? "sticky_choose_options_click"
          : "sticky_add_to_cart_click",
      metadata: {
        productId: product?.id,
        hasVariants,
        externalOnly: externalOnlyProduct,
        quantity,
        selectionReady,
      },
    });

    if (externalOnlyProduct && externalProductAction.url) {
      window.open(externalProductAction.url, "_blank", "noopener,noreferrer");
      return;
    }

    const target = document.getElementById(STOREFRONT_BUYBOX_ID);

    if (!canTriggerDirectPurchaseActions) {
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    window.dispatchEvent(
      new CustomEvent(STICKY_ADD_EVENT, {
        detail: {
          productId,
        },
      }),
    );
  };

  const handleSecondaryAction = () => {
    if (!externalOnlyProduct && canTriggerDirectPurchaseActions) {
      void trackStorefrontAppUsage({
        slug: "conversion-suite",
        feature: "sticky_buy_now_click",
        metadata: {
          productId: product?.id,
          hasVariants,
          externalOnly: externalOnlyProduct,
          quantity,
          selectionReady,
        },
      });

      window.dispatchEvent(
        new CustomEvent(STICKY_BUY_NOW_EVENT, {
          detail: {
            productId,
          },
        }),
      );
      return;
    }

    document.getElementById(STOREFRONT_BUYBOX_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  if (
    !mounted ||
    !stickyEnabled ||
    !productId ||
    !product ||
    isCartOpen ||
    isGalleryZoomOpen ||
    isBuyBoxVisible ||
    (productPageCheckoutEnabled && !isBiteRushPreview && !isKhemetLuxe)
  ) {
    return null;
  }

  const shellClassName =
    isBiteRushPreview
      ? "rounded-[1.8rem] border border-[#f8c08c] bg-[linear-gradient(135deg,rgba(255,250,244,0.98),rgba(255,236,214,0.96))] p-3 shadow-[0_26px_80px_-34px_rgba(247,115,22,0.48)] backdrop-blur"
      : isKhemetLuxe
        ? "rounded-[1.35rem] border border-[#e5d7ca] bg-[rgba(255,251,247,0.97)] px-5 py-3 shadow-[0_28px_80px_-48px_rgba(91,57,40,0.3)] backdrop-blur"
      : isMenShoes
        ? "rounded-[1.9rem] border border-[#d9c7b7] bg-[linear-gradient(135deg,rgba(255,252,248,0.98),rgba(248,240,233,0.97))] p-3.5 shadow-[0_30px_90px_-42px_rgba(31,38,43,0.36)] backdrop-blur"
      : stickyStyle === "minimal"
      ? "rounded-[1.2rem] border border-primary/10 bg-background/95 p-2.5 shadow-xl backdrop-blur"
      : stickyStyle === "balanced"
        ? "rounded-[1.8rem] border border-border bg-background/95 p-4 shadow-2xl backdrop-blur"
        : "rounded-[1.6rem] border border-border bg-background/95 p-3 shadow-2xl backdrop-blur";
  const titleClassName =
    isBiteRushPreview
      ? "truncate text-sm font-black text-[#171717]"
      : isKhemetLuxe
        ? "truncate text-sm font-black uppercase tracking-[0.14em] text-[#2d211e]"
      : isMenShoes
        ? "truncate text-sm font-black text-[#1f262b]"
      : stickyStyle === "minimal"
      ? "truncate text-[13px] font-black text-foreground"
      : "truncate text-sm font-black text-foreground";
  const priceClassName =
    isBiteRushPreview
      ? "text-sm font-bold text-[#8a4b1f]"
      : isKhemetLuxe
        ? "text-base font-black text-[#2d211e]"
      : isMenShoes
        ? "text-sm font-semibold text-[#5a4738]"
      : stickyStyle === "minimal"
      ? "text-xs text-muted-foreground"
      : "text-sm text-muted-foreground";
  const secondaryButtonClassName =
    isBiteRushPreview
      ? "inline-flex items-center justify-center rounded-full border border-[#171717] bg-white px-4 py-2.5 text-sm font-black text-[#171717] hover:border-[#f97316] hover:text-[#f97316]"
      : isKhemetLuxe
        ? "inline-flex h-12 items-center justify-center rounded-[0.95rem] bg-[#78aa00] px-5 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#6d9a01]"
      : isMenShoes
        ? "inline-flex items-center justify-center rounded-full border border-[#d9c7b7] bg-white px-4 py-2.5 text-sm font-bold text-[#1f262b] hover:border-[#f57a1d] hover:text-[#f57a1d]"
      : stickyStyle === "minimal"
      ? "inline-flex items-center justify-center rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
      : "inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted";
  const primaryButtonClassName =
    isBiteRushPreview
      ? "inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] px-5 py-2.5 text-sm font-black text-white shadow-[0_18px_40px_-24px_rgba(239,68,68,0.9)] hover:opacity-95"
      : isKhemetLuxe
        ? "inline-flex h-12 items-center justify-center rounded-[0.95rem] bg-primary px-5 text-sm font-black uppercase tracking-[0.16em] text-primary-foreground shadow-[0_18px_44px_-26px_hsl(var(--primary)/0.48)] transition-colors hover:opacity-95"
      : isMenShoes
        ? "inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#f57a1d_0%,#d65700_100%)] px-5 py-2.5 text-sm font-black text-white shadow-[0_18px_44px_-26px_rgba(245,122,29,0.55)] hover:opacity-95"
      : stickyStyle === "minimal"
      ? "inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground hover:opacity-90"
      : "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-black text-primary-foreground hover:opacity-90";
  const actionGroupClassName =
    !externalOnlyProduct && canTriggerDirectPurchaseActions
      ? "grid w-full grid-cols-2 gap-2 md:w-auto"
      : "flex items-center gap-2";

  return (
    <div className={`${isKhemetLuxe ? "hidden md:block" : ""} fixed inset-x-3 z-[75] md:inset-x-auto md:left-1/2 ${isKhemetLuxe ? "md:w-[min(920px,calc(100vw-4rem))]" : "md:w-[min(720px,calc(100vw-3rem))]"} md:-translate-x-1/2 ${
      isBiteRushPreview
        ? "bottom-[5.25rem] md:bottom-3"
        : isMenShoes
          ? "bottom-4"
          : "bottom-3"
    }`}>
      <div className={shellClassName}>
        <div className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${isKhemetLuxe ? "md:gap-5" : ""}`}>
          <div className="min-w-0">
            <p className={titleClassName}>
              {product.name}
            </p>
            <p className={priceClassName}>
              {formatStorefrontCurrency(stickyUnitPrice, currency)}
            </p>
            {isKhemetLuxe ? (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#8f5c44]">
                {activeSelectionSummary ? <span>{activeSelectionSummary}</span> : null}
                {activeSelectionSummary ? <span>&bull;</span> : null}
                <span>
                  {selectionReady
                    ? prefersArabicCopy
                      ? `الكمية ${quantity}`
                      : `Qty ${quantity}`
                    : stickyHintText}
                </span>
              </div>
            ) : (
              <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${
                isBiteRushPreview
                  ? "text-[#8a4b1f]"
                  : isMenShoes
                    ? "text-[#6d594a]"
                    : "text-muted-foreground"
              }`}>
                <span>{stickyEtaText}</span>
                <span>&bull;</span>
                <span>{stickyHintText}</span>
              </div>
            )}
          </div>

          <div className={actionGroupClassName}>
            <button
              type="button"
              onClick={handleSecondaryAction}
              className={secondaryButtonClassName}
            >
              {secondaryLabel}
            </button>
            <button
              type="button"
              onClick={handlePrimaryAction}
              className={primaryButtonClassName}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyAddToCartHost;
