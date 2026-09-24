import React, { useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  StorefrontThemeProvider,
  useStorefrontTheme,
} from "./engine/ThemeProvider";
import type { StorefrontThemeInput } from "./engine/runtimeThemeResolver";
import { PageComposer, type RenderSectionFrameArgs } from "./engine/PageComposer";
import { useCartStore } from "./store/useCartStore";
import { useCheckoutStore } from "./store/useCheckoutStore";
import {
  DEFAULT_STOREFRONT_CART_STORAGE_NAME,
  getStorefrontPreviewCartStorageName,
} from "./store/useCartStore";
import {
  buildStorefrontPath,
  buildStorefrontPreviewAdminPath,
  getStorefrontProductRouteKey,
  resolveStorefrontPreviewAdminOrigin,
} from "./utils/paths";
import { useStorefrontSettings } from "./hooks/useStorefrontSettings";
import tokenManager from "../utils/tokenManager";
import { formatStorefrontCurrency } from "./utils/currency";
import { sanitizeStorefrontHtml } from "./utils/html";
import { StorefrontHead } from "./engine/StorefrontHead";
import type {
  StorefrontPageConfig,
  StorefrontPageLayout,
  StorefrontSectionConfig,
  StorefrontTheme,
} from "./types/theme.types";
import { useClarityAnalytics } from "../hooks/useClarityAnalytics";
import { useFacebookPixel } from "../hooks/useFacebookPixel";
import { useGoogleAnalytics } from "../hooks/useGoogleAnalytics";
import { useTikTokPixel } from "../hooks/useTikTokPixel";
import {
  isRevealEnabledTheme,
  resolveStorefrontPageLayout,
  StorefrontSectionFrame,
} from "./layout/StorefrontSectionFrame";
const StorefrontArticlePage = React.lazy(
  () => import("./pages/StorefrontArticlePage"),
);
import { useCategories } from "./hooks/useCategories";
import StorefrontProductImage from "./components/StorefrontProductImage";
import StorefrontSkeleton from "./components/StorefrontSkeleton";
import { getProductImageCandidates } from "./utils/productImages";
import MobileBottomNav from "./components/MobileBottomNav";
import GracefulHeader from "./components/GracefulHeader";
import GracefulFooter from "./components/GracefulFooter";
import GracefulScrollTop from "./components/GracefulScrollTop";
import "./styles/conversion-animations.css";
import {
  extractShopStudioConfig,
  hasShopStudioConfig,
  resolveShopPageLayoutHint,
} from "../utils/shopPageStudioConfig";
import { useSearch, type UseSearchResult } from "./hooks/useSearch";
import { useStorefrontProductRouteScrollReset } from "./hooks/useStorefrontProductRouteScrollReset";
import { useScrollReveal } from "./hooks/useScrollReveal";
import { useStorefrontVisitTracking } from "./hooks/useStorefrontVisitTracking";
import { captureStorefrontAttribution } from "./utils/orderAttribution";
import { shouldStorefrontForceDocumentNavigation } from "./utils/navigationGuards";
import { isKhemetLuxeTheme } from "./utils/navigationGuards";
import { resolveCatalogCategoryBySlug } from "./utils/catalogCategories";
import { resolveLegacyProductSlugAlias } from "./utils/productSlugAliases";
import { createStorefrontThemeTextReplacer } from "./utils/runtimeBrandText";
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "./utils/marketplaceApps";
import ProductImageLandingPage from "./pages/ProductImageLandingPage";
import FunnelCodSalesPage from "./pages/FunnelCodSalesPage";
import ReturnsPage from "./pages/ReturnsPage";
import PostPurchaseOfferPage from "./pages/PostPurchaseOfferPage";
import StorefrontNotFound from "./components/StorefrontNotFound";
import { useStorePage } from "../hooks/useStorePage";
import { footerSettingsService, type FooterSettings } from "../services/footerSettingsService";

import "./styles/storefront-layout.css";

/* ─────────────────── Search Results ─────────────────── */
import type { Product } from "./hooks/useProducts";
import { useProduct, setGlobalPresentationSlug } from "./hooks/useProduct";

const GlobalConversionHost = React.lazy(
  () => import("./components/GlobalConversionHost"),
);
import StorePromotionBar from "./components/StorePromotionBar";
const StickyAddToCartHost = React.lazy(
  () => import("./components/StickyAddToCartHost"),
);
const LazyCartDrawer = React.lazy(() => import("./components/CartDrawer"));
const LegacyCollectionProductGrid = React.lazy(
  () => import("./sections/ProductGrid"),
);

import { DeferredCartDrawerHost } from "./components/DeferredCartDrawerHost";
import { useDeferredStorefrontConversionHosts } from "./hooks/useDeferredStorefrontConversionHosts";

export const shouldStorefrontHeaderForceDocumentNavigation =
  shouldStorefrontForceDocumentNavigation;
export { shouldStorefrontForceDocumentNavigation };

import MemoStorefrontHeader, { StorefrontHomeLink, resolveStorefrontDocumentLanguage, parsePositiveNumber, ARABIC_SCRIPT_PATTERN, isRuntimePharmacyThemeId } from './components/header/StorefrontHeader';

import StorefrontFooter from './components/footer/StorefrontFooter';
/* ─────────────────── Footer extracted to ./components/footer/StorefrontFooter.tsx ─────────────────── */

export { resolveStorefrontPageLayout, StorefrontSectionFrame };


import DynamicStorefrontPage from './pages/DynamicStorefrontPage';
import CollectionCategoryPage from './pages/CollectionCategoryPage';




const StorefrontPreviewBanner = React.lazy(() =>
  import('./components/preview/StorefrontPreviewBanner').then((m) => ({
    default: m.StorefrontPreviewBanner,
  })),
);
const StorefrontProductPreviewBanner = React.lazy(() =>
  import('./components/preview/StorefrontPreviewBanner').then((m) => ({
    default: m.StorefrontProductPreviewBanner,
  })),
);
const MarketplacePreviewCartBootstrap = React.lazy(() =>
  import('./components/preview/StorefrontPreviewBanner').then((m) => ({
    default: m.MarketplacePreviewCartBootstrap,
  })),
);


/* ─────────────────── Layout ─────────────────── */
const StorefrontLayout: React.FC<{ previewThemeId?: string | null }> = ({
  previewThemeId,
}) => {
  const { theme } = useStorefrontTheme();
  const { settings } = useStorefrontSettings();
  const location = useLocation();
  const navigate = useNavigate();
  useStorefrontProductRouteScrollReset();
  useScrollReveal(isRevealEnabledTheme(theme?.id) ? { enabled: true } : { enabled: false });
  const search = useSearch();
  const canRenderConversionHosts = useDeferredStorefrontConversionHosts();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const documentLanguage = useMemo(
    () => resolveStorefrontDocumentLanguage(theme),
    [theme],
  );
  const runtimeText = useMemo(
    () =>
      createStorefrontThemeTextReplacer({
        theme,
        settings,
        isThemePreview: searchParams.has("previewTheme"),
      }),
    [searchParams, settings, theme],
  );

  useEffect(() => {
    captureStorefrontAttribution(settings?.companyId);

    // ⚡ Auto-hydrate coupon, phone, and customer name from destination links
    const urlCoupon = searchParams.get("coupon") || searchParams.get("apply_coupon");
    if (urlCoupon) {
      useCheckoutStore.getState().setPendingCouponCode(urlCoupon.trim().toUpperCase());
    }
    const urlPhone = searchParams.get("phone");
    if (urlPhone) {
      useCheckoutStore.getState().updateFormData({ phone: urlPhone.trim() });
    }
    const urlName = searchParams.get("name") || searchParams.get("customerName");
    if (urlName) {
      useCheckoutStore.getState().updateFormData({ customerName: urlName.trim() });
    }
    const urlToken = searchParams.get("token");
    if (urlToken) {
      tokenManager.setAccessToken(urlToken);
    }
  }, [location.pathname, location.search, searchParams, settings?.companyId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      try {
        if (location.hash) {
          const targetId = decodeURIComponent(location.hash.slice(1));
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ block: "start" });
          }
          return;
        }

        const isJsdom =
          typeof navigator !== "undefined" &&
          navigator.userAgent.toLowerCase().includes("jsdom");
        if (!isJsdom) {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
      } catch {
        // Some test browsers do not implement scrolling APIs.
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlDir = html.getAttribute("dir");
    const previousHtmlLang = html.getAttribute("lang");
    const previousBodyDir = body?.getAttribute("dir") ?? null;

    html.setAttribute("dir", theme.direction);
    html.setAttribute("lang", documentLanguage);
    body?.setAttribute("dir", theme.direction);

    return () => {
      if (previousHtmlDir === null) {
        html.removeAttribute("dir");
      } else {
        html.setAttribute("dir", previousHtmlDir);
      }

      if (previousHtmlLang === null) {
        html.removeAttribute("lang");
      } else {
        html.setAttribute("lang", previousHtmlLang);
      }

      if (!body) {
        return;
      }

      if (previousBodyDir === null) {
        body.removeAttribute("dir");
      } else {
        body.setAttribute("dir", previousBodyDir);
      }
    };
  }, [documentLanguage, theme.direction]);

  const shopLayoutFallback = useMemo(() => {
    if (!hasShopStudioConfig(settings?.storefront)) {
      return "sidebar-left" as StorefrontPageLayout;
    }

    return resolveShopPageLayoutHint(
      extractShopStudioConfig(settings?.storefront),
      "sidebar-left",
    );
  }, [settings]);

  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const routePageKey = `${normalizedPath}${location.search}`;
  const layoutRouteSegments = normalizedPath.split("/").filter(Boolean);
  const layoutStorefrontSegments =
    layoutRouteSegments[0] === "store"
      ? layoutRouteSegments.slice(1)
      : layoutRouteSegments;
  const isProductImageLandingPage =
    layoutStorefrontSegments[0] === "lp" ||
    layoutStorefrontSegments[0] === "landing";
  const isFunnelPage =
    layoutStorefrontSegments[0] === "funnel" ||
    layoutStorefrontSegments[0] === "p";
  const shouldWarmLayoutCategories =
    layoutStorefrontSegments.length === 0 ||
    layoutStorefrontSegments[0] === "shop" ||
    layoutStorefrontSegments[0] === "collections" ||
    layoutStorefrontSegments[0] === "sale";

  useCategories(undefined, { enabled: shouldWarmLayoutCategories });

  const isMinimal =
    isProductImageLandingPage ||
    isFunnelPage ||
    normalizedPath.endsWith("/checkout") ||
    normalizedPath.endsWith("/order-offer") ||
    normalizedPath.endsWith("/thank-you");
  const isKhemetLuxe = isKhemetLuxeTheme(theme.id);
  const isKhemetLuxeInnerRoute =
    isKhemetLuxe &&
    normalizedPath !== "/" &&
    !normalizedPath.endsWith("/store") &&
    !isMinimal;
  const isKhemetMinimalCommerce =
    isKhemetLuxe && normalizedPath.endsWith("/checkout");
  const isIntruderNft = theme.id === "intruder-nft";
  const isBiteRush = theme.id === "restaurant-demo";
  const isMenShoes = theme.id === "men-shoes-eg";
  const isCarryLane = theme.id === "elessi-carry-lane";
  const isHarvestFold = theme.id === "elessi-harvest-fold";
  const isSproutRoom = theme.id === "elessi-sprout-room";
  const isSignalDeck = theme.id === "elessi-signal-deck";
  const isPedalLab = theme.id === "elessi-pedal-lab";
  const isGlowRoutine = theme.id === "elessi-glow-routine";
  const isGemAtelier = theme.id === "elessi-gem-atelier";
  const isTailSupply = theme.id === "elessi-tail-supply";
  const isChronoGallery = theme.id === "elessi-chrono-gallery";
  const isGarageFit = theme.id === "elessi-garage-fit";
  const isElessiPackTheme = theme.id?.startsWith("elessi-") === true;
  const isProductPreview =
    searchParams.get("productPreview") === "1" ||
    searchParams.get("preview") === "1";
  const previewProductId = searchParams.get("previewProductId");
  const isFastlyTheme = theme.id === "fastly-eg";
  const isGracefulTheme = theme.id === "soft-graceful";
  const productRouteKey = getStorefrontProductRouteKey(normalizedPath);
  const legacyProductSlugAliasTarget = useMemo(
    () =>
      resolveLegacyProductSlugAlias(productRouteKey, {
        companyId: searchParams.get("companyId") || settings?.company?.id,
        companySlug: settings?.company?.slug,
        hostname:
          typeof window === "undefined" ? null : window.location.hostname,
      }),
    [
      productRouteKey,
      searchParams,
      settings?.company?.id,
      settings?.company?.slug,
    ],
  );

  useEffect(() => {
    if (!legacyProductSlugAliasTarget) {
      return;
    }

    const basePath = normalizedPath.startsWith("/store") ? "/store" : "";
    navigate(
      `${basePath}/product/${encodeURIComponent(legacyProductSlugAliasTarget)}${location.search}${location.hash}`,
      { replace: true },
    );
  }, [
    legacyProductSlugAliasTarget,
    location.hash,
    location.search,
    navigate,
    normalizedPath,
  ]);

  const isProductDetailPage = Boolean(productRouteKey);
  const [previewProductName, setPreviewProductName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!productRouteKey || !previewThemeId) {
      setPreviewProductName(null);
      return;
    }

    let cancelled = false;

    void import("./preview/marketplaceSampleData").then(
      ({ getMarketplacePreviewProduct }) => {
        if (cancelled) {
          return;
        }

        const product = getMarketplacePreviewProduct(
          productRouteKey,
          previewThemeId,
        );
        setPreviewProductName(product?.name || null);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [productRouteKey, previewThemeId]);

  const previewProduct = previewProductName
    ? { name: previewProductName }
    : null;

  if (legacyProductSlugAliasTarget) {
    return null;
  }

  const isDistrictMarketShopRoute =
    theme.id === "district-market" && normalizedPath.endsWith("/shop");
  const showMobileBottomNav =
    !isMinimal &&
    !isProductDetailPage &&
    !isDistrictMarketShopRoute &&
    !isElessiPackTheme &&
    !isFastlyTheme &&
    !isGracefulTheme;
  const showPreviewThemeBanner =
    Boolean(previewThemeId) &&
    !isKhemetMinimalCommerce &&
    !isKhemetLuxeInnerRoute;
  const showFooter = !isKhemetMinimalCommerce && !isProductImageLandingPage;
  const renderBreadcrumbTrail = (
    trail: string[],
    options: {
      crumbColor?: string;
      activeColor?: string;
      slashColor?: string;
      justify?: "center" | "start";
      textSize?: string;
    } = {},
  ) => {
    const {
      crumbColor = "",
      activeColor = "font-medium text-foreground",
      slashColor = "opacity-45",
      justify = "center",
      textSize = "text-sm md:text-[0.95rem]",
    } = options;

    return (
      <nav aria-label="Breadcrumb" className="w-full">
        <ol
          itemScope
          itemType="https://schema.org/BreadcrumbList"
          className={`flex flex-wrap items-center ${justify === "start" ? "justify-start" : "justify-center"} gap-2 ${textSize}`}
        >
          {trail.map((crumb, index) => {
            const isLast = index === trail.length - 1;
            let href: string | undefined;
            if (index === 0) {
              href = buildStorefrontPath(location.pathname, "/", location.search);
            } else if (!isLast && trail.length > 2) {
              href = buildStorefrontPath(location.pathname, "/shop", location.search);
            }

            return (
              <li
                key={`${crumb}-${index}`}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
                className="inline-flex items-center gap-2"
              >
                {index > 0 ? (
                  <span className={slashColor} aria-hidden="true">
                    /
                  </span>
                ) : null}
                {href ? (
                  <Link
                    to={href}
                    itemProp="item"
                    className={`hover:underline ${crumbColor}`}
                  >
                    <span itemProp="name">{crumb}</span>
                  </Link>
                ) : (
                  <span
                    itemProp="name"
                    aria-current={isLast ? "page" : undefined}
                    className={isLast ? activeColor : crumbColor}
                  >
                    {crumb}
                  </span>
                )}
                <meta itemProp="position" content={String(index + 1)} />
              </li>
            );
          })}
        </ol>
      </nav>
    );
  };

  const elessiCompactProductCrumbs = (trail: string[]) => (
    <div className="w-full border-b border-border/70 bg-background/96">
      <div className="container px-4 py-3 md:px-6 md:py-4">
        {renderBreadcrumbTrail(trail, {
          crumbColor: "text-muted-foreground",
          activeColor: "font-medium text-foreground",
          slashColor: "opacity-35",
          justify: "start",
          textSize: "text-[11px] font-bold md:text-xs",
        })}
      </div>
    </div>
  );
  const carryLanePageBanner = (title: string, trail: string[]) => (
    <div className="w-full overflow-hidden border-b border-[#eadfd3] bg-[#fbf7f1]">
      <div className="relative isolate py-10 md:py-14">
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(251,247,241,0.94)_54%,rgba(246,238,228,0.96))]" />
        <div className="absolute -left-10 top-0 hidden h-full w-44 overflow-hidden rounded-br-[3.25rem] opacity-45 md:block">
          <img
            src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute -right-10 top-0 hidden h-full w-44 overflow-hidden rounded-bl-[3.25rem] opacity-45 md:block">
          <img
            src="https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="container relative z-10 flex flex-col items-center gap-3 px-4 text-center md:px-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#231915] md:text-[2.75rem]">
            {title}
          </h1>
          {renderBreadcrumbTrail(trail, {
            crumbColor: "text-[#7d6a60]",
            activeColor: "font-medium text-[#34231d]",
            slashColor: "opacity-45",
          })}
        </div>
      </div>
    </div>
  );
  const sproutRoomPageBanner = (title: string, trail: string[]) => (
    <div className="w-full overflow-hidden border-b border-[#ece5d9] bg-[#f7f4ee]">
      <div className="relative isolate py-10 md:py-14">
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(247,244,238,0.88)_58%,rgba(242,237,229,0.92))]" />
        <div className="absolute -left-8 top-0 hidden h-full w-40 overflow-hidden rounded-br-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute -right-8 top-0 hidden h-full w-40 overflow-hidden rounded-bl-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="container relative z-10 flex flex-col items-center gap-3 px-4 text-center md:px-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#1f261f] md:text-[2.7rem]">
            {title}
          </h1>
          {renderBreadcrumbTrail(trail, {
            crumbColor: "text-[#6c7568]",
            activeColor: "font-medium text-[#2b362a]",
            slashColor: "opacity-45",
          })}
        </div>
      </div>
    </div>
  );
  const harvestFoldPageBanner = (title: string, trail: string[]) => (
    <div className="w-full overflow-hidden border-b border-[#eadfcd] bg-[#fbf8f2]">
      <div className="relative isolate py-10 md:py-14">
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(251,248,242,0.9)_56%,rgba(246,239,227,0.94))]" />
        <div className="absolute -left-8 top-0 hidden h-full w-40 overflow-hidden rounded-br-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute -right-8 top-0 hidden h-full w-40 overflow-hidden rounded-bl-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="container relative z-10 flex flex-col items-center gap-3 px-4 text-center md:px-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#2d3b27] md:text-[2.7rem]">
            {title}
          </h1>
          {renderBreadcrumbTrail(trail, {
            crumbColor: "text-[#6c5b49]",
            activeColor: "font-medium text-[#2d3b27]",
            slashColor: "opacity-45",
          })}
        </div>
      </div>
    </div>
  );
  const signalDeckPageBanner = (title: string, trail: string[]) => (
    <div className="w-full overflow-hidden border-b border-[#e4e9f0] bg-white">
      <div className="relative isolate py-10 md:py-14">
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(247,249,252,0.94)_58%,rgba(238,242,247,0.96))]" />
        <div className="absolute -left-8 top-0 hidden h-full w-44 overflow-hidden rounded-br-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute -right-8 top-0 hidden h-full w-44 overflow-hidden rounded-bl-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="container relative z-10 flex flex-col items-center gap-3 px-4 text-center md:px-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#161c26] md:text-[2.7rem]">
            {title}
          </h1>
          {renderBreadcrumbTrail(trail, {
            crumbColor: "text-[#607184]",
            activeColor: "font-medium text-[#161c26]",
            slashColor: "opacity-45",
          })}
        </div>
      </div>
    </div>
  );
  const pedalLabPageBanner = (title: string, trail: string[]) => (
    <div className="w-full overflow-hidden border-b border-[#e3e7eb] bg-white">
      <div className="relative isolate py-10 md:py-14">
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(249,250,251,0.94)_58%,rgba(243,246,248,0.96))]" />
        <div className="absolute -left-8 top-0 hidden h-full w-44 overflow-hidden rounded-br-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute -right-8 top-0 hidden h-full w-44 overflow-hidden rounded-bl-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="container relative z-10 flex flex-col items-center gap-3 px-4 text-center md:px-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#1d2a33] md:text-[2.7rem]">
            {title}
          </h1>
          {renderBreadcrumbTrail(trail, {
            crumbColor: "text-[#677684]",
            activeColor: "font-medium text-[#1d2a33]",
            slashColor: "opacity-45",
          })}
        </div>
      </div>
    </div>
  );
  const glowRoutinePageBanner = (title: string, trail: string[]) => (
    <div className="w-full overflow-hidden border-b border-[#eadfd8] bg-[#fffaf7]">
      <div className="relative isolate py-10 md:py-14">
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(255,247,242,0.92)_56%,rgba(250,240,233,0.94))]" />
        <div className="absolute -left-8 top-0 hidden h-full w-40 overflow-hidden rounded-br-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute -right-8 top-0 hidden h-full w-40 overflow-hidden rounded-bl-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="container relative z-10 flex flex-col items-center gap-3 px-4 text-center md:px-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#382426] md:text-[2.7rem]">
            {title}
          </h1>
          {renderBreadcrumbTrail(trail, {
            crumbColor: "text-[#87686b]",
            activeColor: "font-medium text-[#382426]",
            slashColor: "opacity-45",
          })}
        </div>
      </div>
    </div>
  );
  const gemAtelierPageBanner = (title: string, trail: string[]) => (
    <div className="w-full overflow-hidden border-b border-[#eadfd8] bg-[#fffaf7]">
      <div className="relative isolate py-10 md:py-14">
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(255,248,242,0.92)_56%,rgba(247,239,232,0.94))]" />
        <div className="absolute -left-8 top-0 hidden h-full w-40 overflow-hidden rounded-br-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute -right-8 top-0 hidden h-full w-40 overflow-hidden rounded-bl-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="container relative z-10 flex flex-col items-center gap-3 px-4 text-center md:px-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#352427] md:text-[2.7rem]">
            {title}
          </h1>
          {renderBreadcrumbTrail(trail, {
            crumbColor: "text-[#856a6d]",
            activeColor: "font-medium text-[#352427]",
            slashColor: "opacity-45",
          })}
        </div>
      </div>
    </div>
  );
  const tailSupplyPageBanner = (title: string, trail: string[]) => (
    <div className="w-full overflow-hidden border-b border-[#dfe7dc] bg-[#fbfdf9]">
      <div className="relative isolate py-10 md:py-14">
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(247,252,247,0.92)_56%,rgba(239,247,240,0.94))]" />
        <div className="absolute -left-8 top-0 hidden h-full w-40 overflow-hidden rounded-br-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute -right-8 top-0 hidden h-full w-40 overflow-hidden rounded-bl-[3rem] opacity-40 md:block">
          <img
            src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=900"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="container relative z-10 flex flex-col items-center gap-3 px-4 text-center md:px-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#254235] md:text-[2.7rem]">
            {title}
          </h1>
          {renderBreadcrumbTrail(trail, {
            crumbColor: "text-[#5f7a67]",
            activeColor: "font-medium text-[#254235]",
            slashColor: "opacity-45",
          })}
        </div>
      </div>
    </div>
  );
  const chronoGalleryPageBanner = (title: string, trail: string[]) => (
    <div className="w-full overflow-hidden border-b border-[#dde2e6] bg-[#fbfcfd]">
      <div className="relative isolate py-10 md:py-14">
        <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(246,248,250,0.92)_56%,rgba(236,240,244,0.94))]" />
        <div className="absolute -left-8 top-0 hidden h-full w-40 overflow-hidden rounded-br-[3rem] opacity-40 md:block">
          <img
            src="/assets/themes/style-store-eg/products/velvet-link-watch-1.jpg"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute -right-8 top-0 hidden h-full w-40 overflow-hidden rounded-bl-[3rem] opacity-40 md:block">
          <img
            src="/assets/themes/style-store-eg/products/mono-sport-watch-1.jpg"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="container relative z-10 flex flex-col items-center gap-3 px-4 text-center md:px-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#1f2731] md:text-[2.7rem]">
            {title}
          </h1>
          {renderBreadcrumbTrail(trail, {
            crumbColor: "text-[#6a727b]",
            activeColor: "font-medium text-[#1f2731]",
            slashColor: "opacity-45",
          })}
        </div>
      </div>
    </div>
  );
  const garageFitPageBanner = (title: string, trail: string[]) => (
    <div className="w-full overflow-hidden border-b border-[#2b211c] bg-[#120f0e]">
      <div className="relative isolate py-10 md:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(66,42,30,0.42),rgba(18,15,14,0.95)_58%,rgba(10,10,10,1))]" />
        <div className="absolute inset-y-0 left-0 hidden w-44 overflow-hidden md:block">
          <div className="absolute inset-y-0 left-8 w-px bg-gradient-to-b from-transparent via-[#f97316] to-transparent opacity-60" />
          <div className="absolute left-14 top-10 h-12 w-12 rounded-full border border-[#f97316]/40" />
          <div className="absolute left-24 top-24 h-20 w-20 rounded-full border border-[#fbbf24]/20" />
        </div>
        <div className="absolute inset-y-0 right-0 hidden w-48 items-center justify-center md:flex">
          <div className="grid gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#f7d7b6]">
            <span className="rounded-full border border-[#4b3329] bg-[#181614] px-3 py-2 text-center">
              Oil
            </span>
            <span className="rounded-full border border-[#4b3329] bg-[#181614] px-3 py-2 text-center">
              Filter
            </span>
            <span className="rounded-full border border-[#4b3329] bg-[#181614] px-3 py-2 text-center">
              LED
            </span>
          </div>
        </div>
        <div className="container relative z-10 flex flex-col items-center gap-3 px-4 text-center md:px-6">
          <span className="inline-flex rounded-full border border-[#4b3329] bg-[#181614] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#f7b26a]">
            Garage Fit
          </span>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#fff6ea] md:text-[2.7rem]">
            {title}
          </h1>
          {renderBreadcrumbTrail(trail, {
            crumbColor: "text-[#dcc4ad]",
            activeColor: "font-medium text-[#fff6ea]",
            slashColor: "opacity-45",
          })}
        </div>
      </div>
    </div>
  );
  const homePageElement = (
    <PageComposer
      key={`home:${routePageKey}`}
      pageConfig={theme.pages.home}
      layout={resolveStorefrontPageLayout(theme.pages.home)}
      runtimeText={runtimeText}
      renderSectionFrame={StorefrontSectionFrame}
    />
  );
  const shopPageElement = (
    <div key={`shop:${routePageKey}`} className="w-full flex flex-col">
      {isSproutRoom
        ? sproutRoomPageBanner(
            "Plants",
            theme.direction === "rtl"
              ? ["الرئيسية", "النباتات"]
              : ["Home", "Plants"],
          )
        : isHarvestFold
          ? harvestFoldPageBanner(
              theme.direction === "rtl" ? "الخضار والفاكهة" : "Fresh produce",
              theme.direction === "rtl"
                ? ["الرئيسية", "الخضار والفاكهة"]
                : ["Home", "Fresh produce"],
            )
          : isSignalDeck
            ? signalDeckPageBanner(
                theme.direction === "rtl"
                  ? "الأجهزة والملحقات"
                  : "Devices & accessories",
                theme.direction === "rtl"
                  ? ["الرئيسية", "الأجهزة والملحقات"]
                  : ["Home", "Devices & accessories"],
              )
            : isPedalLab
              ? pedalLabPageBanner(
                  theme.direction === "rtl"
                    ? "الدراجات والمعدات"
                    : "Bikes & gear",
                  theme.direction === "rtl"
                    ? ["الرئيسية", "الدراجات"]
                    : ["Home", "Bikes"],
                )
              : isGlowRoutine
                ? glowRoutinePageBanner(
                    theme.direction === "rtl"
                      ? "العناية اليومية والمجموعات"
                      : "Daily care & gift sets",
                    theme.direction === "rtl"
                      ? ["الرئيسية", "العناية اليومية"]
                      : ["Home", "Daily care"],
                  )
                : isGemAtelier
                  ? gemAtelierPageBanner(
                      theme.direction === "rtl"
                        ? "المجوهرات والهدايا"
                        : "Jewelry & gifts",
                      theme.direction === "rtl"
                        ? ["الرئيسية", "المجوهرات والهدايا"]
                        : ["Home", "Jewelry & gifts"],
                    )
                  : isTailSupply
                    ? tailSupplyPageBanner(
                        theme.direction === "rtl"
                          ? "مستلزمات الحيوانات"
                          : "Pet essentials",
                        theme.direction === "rtl"
                          ? ["الرئيسية", "مستلزمات الحيوانات"]
                          : ["Home", "Pet essentials"],
                      )
                    : isGarageFit
                      ? garageFitPageBanner(
                          theme.direction === "rtl"
                            ? "قطع الغيار والإضافات"
                            : "Parts & add-ons",
                          theme.direction === "rtl"
                            ? ["الرئيسية", "قطع الغيار والإضافات"]
                            : ["Home", "Parts & add-ons"],
                        )
                      : isChronoGallery
                        ? chronoGalleryPageBanner(
                            theme.direction === "rtl"
                              ? "الساعات والإضافات"
                              : "Watches & accessories",
                            theme.direction === "rtl"
                              ? ["الرئيسية", "الساعات والإضافات"]
                              : ["Home", "Watches & accessories"],
                          )
                        : isCarryLane
                          ? carryLanePageBanner(
                              theme.direction === "rtl"
                                ? "الحقائب والإكسسوارات"
                                : "Bags & accessories",
                              theme.direction === "rtl"
                                ? ["الرئيسية", "الحقائب والإكسسوارات"]
                                : ["Home", "Bags & accessories"],
                            )
                          : null}
      {theme.id === "zen-organic" && (
        <div className="w-full bg-[#fdfdfc] py-14 md:py-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#f1f3ee]/80 via-[#fdfdfc] to-[#fdfdfc] relative overflow-hidden border-b border-[#e9ebe5]">
          <div
            className="absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, #88a876 1.5px, transparent 0)",
              backgroundSize: "30px 30px",
              backgroundPosition: "center",
              maskImage:
                "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
            }}
          />
          <div className="container relative z-10 text-center flex flex-col items-center justify-center space-y-4">
            <h1 className="text-4xl md:text-[2.6rem] font-bold font-sans text-[#1a3328] tracking-tight">
              Shop
            </h1>
            <div className="text-sm md:text-[0.95rem] font-medium text-muted-foreground flex items-center justify-center gap-2.5 tracking-wide">
              <span className="hover:text-[#1a3328] cursor-pointer transition-colors">
                Home
              </span>
              <span className="opacity-60 text-xs">/</span>
              <span className="text-[#1a3328]">Shop</span>
            </div>
          </div>
        </div>
      )}
      <PageComposer
        pageConfig={theme.pages.shop}
        layout={resolveStorefrontPageLayout(
          theme.pages.shop,
          shopLayoutFallback,
        )}
        runtimeText={runtimeText}
        renderSectionFrame={StorefrontSectionFrame}
      />
    </div>
  );
  const PresentationRouteWrapper: React.FC<{ element: React.ReactElement }> = ({ element }) => {
    const { presentationSlug } = useParams<{ presentationSlug: string }>();
    React.useEffect(() => {
      setGlobalPresentationSlug(presentationSlug || null);
      return () => setGlobalPresentationSlug(null);
    }, [presentationSlug]);
    return element;
  };

  const productPageElement = (
    <div key={`product:${routePageKey}`} className="w-full flex flex-col">
      {isElessiPackTheme
        ? elessiCompactProductCrumbs(
            isSproutRoom
              ? theme.direction === "rtl"
                ? ["الرئيسية", "النباتات", previewProduct?.name || "التفاصيل"]
                : ["Home", "Plants", previewProduct?.name || "Details"]
              : isHarvestFold
                ? theme.direction === "rtl"
                  ? [
                      "الرئيسية",
                      "الخضار والفاكهة",
                      previewProduct?.name || "التفاصيل",
                    ]
                  : ["Home", "Fresh produce", previewProduct?.name || "Details"]
                : isSignalDeck
                  ? theme.direction === "rtl"
                    ? [
                        "الرئيسية",
                        "الأجهزة والملحقات",
                        previewProduct?.name || "التفاصيل",
                      ]
                    : [
                        "Home",
                        "Devices & accessories",
                        previewProduct?.name || "Details",
                      ]
                  : isPedalLab
                    ? theme.direction === "rtl"
                      ? [
                          "الرئيسية",
                          "الدراجات",
                          previewProduct?.name || "التفاصيل",
                        ]
                      : ["Home", "Bikes", previewProduct?.name || "Details"]
                    : isGlowRoutine
                      ? theme.direction === "rtl"
                        ? [
                            "الرئيسية",
                            "العناية اليومية",
                            previewProduct?.name || "التفاصيل",
                          ]
                        : [
                            "Home",
                            "Daily care",
                            previewProduct?.name || "Details",
                          ]
                      : isGemAtelier
                        ? theme.direction === "rtl"
                          ? [
                              "الرئيسية",
                              "المجوهرات والهدايا",
                              previewProduct?.name || "التفاصيل",
                            ]
                          : [
                              "Home",
                              "Jewelry & gifts",
                              previewProduct?.name || "Details",
                            ]
                        : isTailSupply
                          ? theme.direction === "rtl"
                            ? [
                                "الرئيسية",
                                "مستلزمات الحيوانات",
                                previewProduct?.name || "التفاصيل",
                              ]
                            : [
                                "Home",
                                "Pet essentials",
                                previewProduct?.name || "Details",
                              ]
                          : isGarageFit
                            ? theme.direction === "rtl"
                              ? [
                                  "الرئيسية",
                                  "قطع الغيار والإضافات",
                                  previewProduct?.name || "التفاصيل",
                                ]
                              : [
                                  "Home",
                                  "Parts & add-ons",
                                  previewProduct?.name || "Details",
                                ]
                            : isChronoGallery
                              ? theme.direction === "rtl"
                                ? [
                                    "الرئيسية",
                                    "الساعات والإضافات",
                                    previewProduct?.name || "التفاصيل",
                                  ]
                                : [
                                    "Home",
                                    "Watches & accessories",
                                    previewProduct?.name || "Details",
                                  ]
                              : isCarryLane
                                ? theme.direction === "rtl"
                                  ? [
                                      "الرئيسية",
                                      "الحقائب",
                                      previewProduct?.name || "التفاصيل",
                                    ]
                                  : [
                                      "Home",
                                      "Bags",
                                      previewProduct?.name || "Details",
                                    ]
                                : theme.direction === "rtl"
                                  ? [
                                      "الرئيسية",
                                      previewProduct?.name || "التفاصيل",
                                    ]
                                  : ["Home", previewProduct?.name || "Details"],
          )
        : null}
      {theme.id === "zen-organic" && (
        <div className="w-full bg-[#fdfdfc] py-14 md:py-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#f1f3ee]/80 via-[#fdfdfc] to-[#fdfdfc] relative overflow-hidden border-b border-[#e9ebe5] mb-8">
          <div
            className="absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, #88a876 1.5px, transparent 0)",
              backgroundSize: "30px 30px",
              backgroundPosition: "center",
              maskImage:
                "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
            }}
          />
          <div className="container relative z-10 text-center flex flex-col items-center justify-center space-y-4">
            <h1 className="text-4xl md:text-[2.6rem] font-bold font-sans text-[#1a3328] tracking-tight">
              Shop
            </h1>
            <div className="text-sm md:text-[0.95rem] font-medium text-muted-foreground flex items-center justify-center gap-2.5 tracking-wide">
              <span className="hover:text-[#1a3328] cursor-pointer transition-colors">
                Home
              </span>
              <span className="opacity-60 text-xs">/</span>
              <span className="hover:text-[#1a3328] cursor-pointer transition-colors">
                Plants
              </span>
              <span className="opacity-60 text-xs">/</span>
              <span className="text-[#1a3328]">Product Details</span>
            </div>
          </div>
        </div>
      )}
      <PageComposer
        pageConfig={theme.pages.pdp}
        layout={resolveStorefrontPageLayout(theme.pages.pdp, "product-detail")}
        runtimeText={runtimeText}
        renderSectionFrame={StorefrontSectionFrame}
      />
    </div>
  );
  const cartPageElement = (
    <div key={`cart:${routePageKey}`} className="w-full flex flex-col">
      {isSproutRoom
        ? sproutRoomPageBanner(
            theme.direction === "rtl" ? "السلة" : "Cart",
            theme.direction === "rtl"
              ? ["الرئيسية", "السلة"]
              : ["Home", "Cart"],
          )
        : isHarvestFold
          ? harvestFoldPageBanner(
              theme.direction === "rtl" ? "سلة الشراء" : "Shopping cart",
              theme.direction === "rtl"
                ? ["الرئيسية", "السلة"]
                : ["Home", "Cart"],
            )
          : isSignalDeck
            ? signalDeckPageBanner(
                theme.direction === "rtl" ? "سلة الشراء" : "Shopping cart",
                theme.direction === "rtl"
                  ? ["الرئيسية", "السلة"]
                  : ["Home", "Cart"],
              )
            : isPedalLab
              ? pedalLabPageBanner(
                  theme.direction === "rtl" ? "سلة الشراء" : "Shopping cart",
                  theme.direction === "rtl"
                    ? ["الرئيسية", "السلة"]
                    : ["Home", "Cart"],
                )
              : isGlowRoutine
                ? glowRoutinePageBanner(
                    theme.direction === "rtl" ? "سلة الشراء" : "Shopping cart",
                    theme.direction === "rtl"
                      ? ["الرئيسية", "السلة"]
                      : ["Home", "Cart"],
                  )
                : isGemAtelier
                  ? gemAtelierPageBanner(
                      theme.direction === "rtl"
                        ? "سلة الشراء"
                        : "Shopping cart",
                      theme.direction === "rtl"
                        ? ["الرئيسية", "السلة"]
                        : ["Home", "Cart"],
                    )
                  : isTailSupply
                    ? tailSupplyPageBanner(
                        theme.direction === "rtl"
                          ? "سلة الشراء"
                          : "Shopping cart",
                        theme.direction === "rtl"
                          ? ["الرئيسية", "السلة"]
                          : ["Home", "Cart"],
                      )
                    : isGarageFit
                      ? garageFitPageBanner(
                          theme.direction === "rtl"
                            ? "سلة الشراء"
                            : "Shopping cart",
                          theme.direction === "rtl"
                            ? ["الرئيسية", "السلة"]
                            : ["Home", "Cart"],
                        )
                      : isChronoGallery
                        ? chronoGalleryPageBanner(
                            theme.direction === "rtl"
                              ? "سلة الشراء"
                              : "Shopping cart",
                            theme.direction === "rtl"
                              ? ["الرئيسية", "السلة"]
                              : ["Home", "Cart"],
                          )
                        : isCarryLane
                          ? carryLanePageBanner(
                              theme.direction === "rtl"
                                ? "سلة الشراء"
                                : "Shopping cart",
                              theme.direction === "rtl"
                                ? ["الرئيسية", "السلة"]
                                : ["Home", "Cart"],
                            )
                          : null}
      <PageComposer
        pageConfig={theme.pages.cart}
        layout={resolveStorefrontPageLayout(theme.pages.cart, "sidebar-right")}
        runtimeText={runtimeText}
        renderSectionFrame={StorefrontSectionFrame}
      />
    </div>
  );
  const khemetCheckoutSteps =
    theme.direction === "rtl"
      ? ["السلة", "البيانات", "الشحن", "الدفع"]
      : ["Cart", "Information", "Shipping", "Payment"];
  const khemetCheckoutProgress = isKhemetLuxe ? (
    <div className="w-full border-b border-[#e9dfd2] bg-white">
      <div className="container px-4 py-4 md:px-6">
        <div
          className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
          dir={theme.direction === "rtl" ? "rtl" : "ltr"}
        >
          {khemetCheckoutSteps.map((step, index) => (
            <React.Fragment key={step}>
              {index > 0 ? <span className="text-[#cbbba4]">›</span> : null}
              <span className={index === 1 ? "text-[#111111]" : "text-[#b29667]"}>
                {step}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  ) : null;
  const checkoutPageElement = (
    <div key={`checkout:${routePageKey}`} className="w-full flex flex-col">
      {khemetCheckoutProgress}
      <PageComposer
        pageConfig={theme.pages.checkout}
        layout={resolveStorefrontPageLayout(
          theme.pages.checkout,
          "sidebar-right",
        )}
        prioritizeSidebarOnMobile={isKhemetLuxe}
        runtimeText={runtimeText}
        renderSectionFrame={StorefrontSectionFrame}
      />
    </div>
  );
  const thankYouPageElement = (
    <PageComposer
      key={`thank-you:${routePageKey}`}
      pageConfig={
        theme.pages["thank-you"] || { sections: ["order-confirmation"] }
      }
      layout={resolveStorefrontPageLayout(theme.pages["thank-you"], "stack")}
      runtimeText={runtimeText}
      renderSectionFrame={StorefrontSectionFrame}
    />
  );
  const registrationPageElement = (
    <PageComposer
      key={`registration:${routePageKey}`}
      pageConfig={
        theme.pages["registration"] || { sections: ["member-registration"] }
      }
      layout={resolveStorefrontPageLayout(theme.pages["registration"], "stack")}
      runtimeText={runtimeText}
      renderSectionFrame={StorefrontSectionFrame}
    />
  );
  const notFoundElement = <StorefrontNotFound />;
  const renderScopedRoutes = (scopePrefix?: string) => {
    const scopedPath = (route?: string): string => {
      if (!scopePrefix) {
        return route || "";
      }

      return route ? `${scopePrefix}/${route}` : scopePrefix;
    };

    return (
      <>
        {scopePrefix ? (
          <Route path={scopedPath()} element={homePageElement} />
        ) : (
          <Route index element={homePageElement} />
        )}
        <Route path={scopedPath("shop")} element={shopPageElement} />
        <Route path={scopedPath("products")} element={shopPageElement} />
        <Route path={scopedPath("catalog")} element={shopPageElement} />
        <Route path={scopedPath("product/:id")} element={productPageElement} />
        <Route path={scopedPath("products/:id")} element={productPageElement} />
        <Route path={scopedPath("product/:id/:presentationSlug")} element={<PresentationRouteWrapper element={productPageElement} />} />
        <Route path={scopedPath("products/:id/:presentationSlug")} element={<PresentationRouteWrapper element={productPageElement} />} />
        <Route path={scopedPath("shop/products/:id/:presentationSlug")} element={<PresentationRouteWrapper element={productPageElement} />} />
        <Route
          path={scopedPath("lp/:id")}
          element={<ProductImageLandingPage />}
        />
        <Route
          path={scopedPath("landing/:id")}
          element={<ProductImageLandingPage />}
        />
        <Route
          path={scopedPath("funnel/:slug")}
          element={<FunnelCodSalesPage />}
        />
        <Route
          path={scopedPath("p/:slug")}
          element={<FunnelCodSalesPage />}
        />
        <Route
          path={scopedPath("shop/products/:id")}
          element={productPageElement}
        />
        <Route path={scopedPath("cart")} element={cartPageElement} />
        <Route path={scopedPath("checkout")} element={checkoutPageElement} />
        <Route path={scopedPath("order-offer")} element={<PostPurchaseOfferPage />} />
        <Route path={scopedPath("thank-you")} element={thankYouPageElement} />
        <Route
          path={scopedPath("registration")}
          element={registrationPageElement}
        />
        <Route
          path={scopedPath("collections/:categorySlug")}
          element={<CollectionCategoryPage />}
        />
        <Route
          path={scopedPath("shop/page/:pageSlug/*")}
          element={<DynamicStorefrontPage />}
        />
        <Route
          path={scopedPath("pages/:pageSlug/*")}
          element={<DynamicStorefrontPage />}
        />
        <Route
          path={scopedPath("articles/:slug")}
          element={
            <React.Suspense fallback={<div className="container py-20 text-center">جاري التحميل...</div>}>
              <StorefrontArticlePage embedded />
            </React.Suspense>
          }
        />
        <Route
          path={scopedPath("returns")}
          element={<ReturnsPage />}
        />
        <Route
          path={scopedPath(":pageSlug/*")}
          element={<DynamicStorefrontPage />}
        />
      </>
    );
  };

  return (
    <div
      className="storefront-shell flex min-h-screen flex-col relative"
      dir={theme.direction}
    >
      {previewThemeId ? (
        <React.Suspense fallback={null}>
          <MarketplacePreviewCartBootstrap previewThemeId={previewThemeId} />
        </React.Suspense>
      ) : null}
      {isIntruderNft && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-background mix-blend-multiply" />
          <svg
            className="absolute w-full h-full opacity-60 mix-blend-lighten"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="neonGradient1"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0.4"
                />
                <stop offset="50%" stopColor="transparent" />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--secondary))"
                  stopOpacity="0.4"
                />
              </linearGradient>
            </defs>
            <path
              d="M-100,200 Q400,0 800,400 T1920,200"
              fill="none"
              stroke="url(#neonGradient1)"
              strokeWidth="80"
              filter="blur(60px)"
            />
            <path
              d="M-100,600 Q500,800 1000,500 T1920,800"
              fill="none"
              stroke="url(#neonGradient1)"
              strokeWidth="60"
              filter="blur(40px)"
            />
          </svg>
        </div>
      )}

      {showPreviewThemeBanner && previewThemeId ? (
        <React.Suspense fallback={null}>
          <StorefrontPreviewBanner previewThemeId={previewThemeId} />
        </React.Suspense>
      ) : null}
      {!isProductImageLandingPage ? (
        <MemoStorefrontHeader isMinimal={isMinimal} search={search} />
      ) : null}
      {isProductPreview ? (
        <React.Suspense fallback={null}>
          <StorefrontProductPreviewBanner previewProductId={previewProductId} />
        </React.Suspense>
      ) : null}
      {isGracefulTheme ? <GracefulScrollTop /> : null}
      {!isProductImageLandingPage && !isFastlyTheme && !isElessiPackTheme && !isGracefulTheme ? <StorePromotionBar /> : null}
      {!isProductImageLandingPage && !isFastlyTheme && !isGracefulTheme && canRenderConversionHosts ? (
        <>
          <React.Suspense fallback={null}>
            {!isElessiPackTheme ? <GlobalConversionHost /> : null}
            <StickyAddToCartHost />
          </React.Suspense>
        </>
      ) : null}

      <main className="flex-1">
        <Routes>
          {renderScopedRoutes("store")}
          {renderScopedRoutes()}
          <Route path="*" element={notFoundElement} />
        </Routes>
      </main>

      {showFooter ? <StorefrontFooter isMinimal={isMinimal} /> : null}
      {!isProductImageLandingPage && theme.id !== "intruder-nft" && <DeferredCartDrawerHost />}

      {showMobileBottomNav && (
        <MobileBottomNav onSearchOpen={() => search.setIsOpen(true)} />
      )}
      {/* Safe-area spacer for mobile bottom nav */}
      {showMobileBottomNav && (
        <div
          className={
            isBiteRush
              ? "h-24 md:hidden"
              : isMenShoes
                ? "h-24 md:hidden"
                : "h-16 md:hidden"
          }
          aria-hidden="true"
        />
      )}
    </div>
  );
};

/* ─────────────────── Shell ─────────────────── */
interface StorefrontShellProps {
  subdomain?: string;
}

const StorefrontShell: React.FC<StorefrontShellProps> = ({
  subdomain: _subdomain,
}) => {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const routeSegments = normalizedPath.split("/").filter(Boolean);
  const storefrontSegments =
    routeSegments[0] === "store" ? routeSegments.slice(1) : routeSegments;
  const isStandaloneProductLanding =
    storefrontSegments[0] === "lp" || storefrontSegments[0] === "landing";
  const isStandaloneFunnel =
    storefrontSegments[0] === "funnel" || storefrontSegments[0] === "p";
  const shouldPrefetchCategories =
    storefrontSegments.length === 0 ||
    storefrontSegments[0] === "shop" ||
    storefrontSegments[0] === "collections" ||
    storefrontSegments[0] === "sale";

  // Keep catalog data warm on browsing pages, but avoid competing with PDP critical requests.
  useCategories(undefined, { enabled: shouldPrefetchCategories });

  const { settings, isLoading, error, previewThemeId } =
    useStorefrontSettings({ enabled: !isStandaloneProductLanding && !isStandaloneFunnel });
  const initialTheme = useMemo(
    () =>
      (settings?.storefront || undefined) as StorefrontThemeInput | undefined,
    [settings],
  );
  useFacebookPixel(settings?.storefrontSettings ?? null);
  useTikTokPixel(settings?.company?.id);
  useGoogleAnalytics(settings?.storefrontSettings ?? null);
  useClarityAnalytics(settings?.storefrontSettings ?? null);
  useStorefrontVisitTracking(settings);

  if (isStandaloneProductLanding) {
    return <ProductImageLandingPage />;
  }

  if (isStandaloneFunnel) {
    return <FunnelCodSalesPage />;
  }

  if (isLoading) {
    return <StorefrontSkeleton />;
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8 text-center">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Error Loading Storefront</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          We couldn't load the storefront settings. Please try refreshing or
          contact support.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <StorefrontThemeProvider initialTheme={initialTheme} blockUntilResolved>
      <StorefrontHead />
      <StorefrontLayout previewThemeId={previewThemeId} />
    </StorefrontThemeProvider>
  );
};

export default StorefrontShell;