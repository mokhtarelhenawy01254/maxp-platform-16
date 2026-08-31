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
import ReturnsPage from "./pages/ReturnsPage";
import { useStorePage } from "../hooks/useStorePage";
import i18n from "../i18n";
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

const STOREFRONT_CART_DRAWER_IDLE_DELAY_MS = 2500;
const STOREFRONT_CART_DRAWER_INTENT_EVENTS = [
  "click",
  "pointerdown",
  "touchstart",
  "keydown",
] as const;
const STOREFRONT_CONVERSION_HOST_IDLE_DELAY_MS = 8000;
const STOREFRONT_CONVERSION_HOST_INTENT_EVENTS = [
  "click",
  "pointerdown",
  "touchstart",
  "wheel",
] as const;

const ARABIC_SCRIPT_PATTERN = /[\u0600-\u06FF]/;
const STOREFRONT_RUNTIME_PHARMACY_THEME_IDS = new Set([
  "max-care-go",
  "pharmacy-demo",
]);

const isRuntimePharmacyThemeId = (themeId?: string | null): boolean =>
  Boolean(themeId && STOREFRONT_RUNTIME_PHARMACY_THEME_IDS.has(themeId));

export const shouldStorefrontHeaderForceDocumentNavigation =
  shouldStorefrontForceDocumentNavigation;
export { shouldStorefrontForceDocumentNavigation };

const DeferredCartDrawerHost: React.FC = () => {
  const shouldActivateCartDrawer = useCartStore(
    (state) => state.isOpen || state.items.length > 0,
  );
  const [canRenderCartDrawer, setCanRenderCartDrawer] = useState(() =>
    typeof window !== "undefined" ? useCartStore.getState().items.length > 0 : false,
  );

  useEffect(() => {
    if (canRenderCartDrawer || typeof window === "undefined") {
      return undefined;
    }

    if (shouldActivateCartDrawer) {
      setCanRenderCartDrawer(true);
      return undefined;
    }

    let isActive = true;
    let idleId: number | null = null;
    let timerId: number | null = null;

    const activate = () => {
      if (isActive) {
        setCanRenderCartDrawer(true);
      }
    };

    const onFirstIntent = () => {
      window.setTimeout(activate, 0);
    };
    const options: AddEventListenerOptions = { once: true, passive: true };

    STOREFRONT_CART_DRAWER_INTENT_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onFirstIntent, options);
    });

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(activate, {
        timeout: STOREFRONT_CART_DRAWER_IDLE_DELAY_MS,
      });
    } else {
      timerId = window.setTimeout(
        activate,
        STOREFRONT_CART_DRAWER_IDLE_DELAY_MS,
      );
    }

    return () => {
      isActive = false;
      STOREFRONT_CART_DRAWER_INTENT_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onFirstIntent);
      });
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [canRenderCartDrawer, shouldActivateCartDrawer]);

  if (!canRenderCartDrawer) {
    return null;
  }

  return (
    <React.Suspense fallback={null}>
      <LazyCartDrawer />
    </React.Suspense>
  );
};

const useDeferredStorefrontConversionHosts = () => {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    if (canRender || typeof window === "undefined") {
      return undefined;
    }

    let isActive = true;
    let idleId: number | null = null;
    let timerId: number | null = null;

    const activate = () => {
      if (!isActive) {
        return;
      }

      setCanRender(true);
    };

    const onFirstIntent = () => {
      window.setTimeout(activate, 0);
    };
    const options: AddEventListenerOptions = { once: true, passive: true };
    const keyOptions: AddEventListenerOptions = { once: true };

    STOREFRONT_CONVERSION_HOST_INTENT_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onFirstIntent, options);
    });
    window.addEventListener("keydown", onFirstIntent, keyOptions);

    timerId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(activate, { timeout: 800 });
        return;
      }

      activate();
    }, STOREFRONT_CONVERSION_HOST_IDLE_DELAY_MS);

    return () => {
      isActive = false;
      STOREFRONT_CONVERSION_HOST_INTENT_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onFirstIntent);
      });
      window.removeEventListener("keydown", onFirstIntent);

      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }

      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [canRender]);

  return canRender;
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

type StorefrontHomeLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "reloadDocument" | "to"
> & {
  forceDocumentNavigation?: boolean;
  pathname: string;
  search?: string;
};

const StorefrontHomeLink: React.FC<StorefrontHomeLinkProps> = ({
  children,
  forceDocumentNavigation = false,
  pathname,
  search = "",
  ...linkProps
}) => (
  <Link
    {...linkProps}
    to={buildStorefrontPath(pathname, "/", search)}
    reloadDocument={forceDocumentNavigation}
  >
    {children}
  </Link>
);
const resolveStorefrontDocumentLanguage = (
  theme: StorefrontTheme,
): "ar" | "en" => {
  if (theme.direction === "rtl") {
    return "ar";
  }

  const languageHints = [
    theme.name,
    theme.header?.brandName,
    theme.header?.announcementText,
    ...(theme.header?.navigation || []).map((link) => link.label),
    ...(theme.footer?.navigation || []).flatMap((group) => [
      group.title,
      ...group.links.map((link) => link.label),
    ]),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  return ARABIC_SCRIPT_PATTERN.test(languageHints) ? "ar" : "en";
};

const SearchResults: React.FC<{
  results: Product[];
  isLoading: boolean;
  close: () => void;
}> = ({ results, isLoading, close }) => {
  const { settings } = useStorefrontSettings();
  const location = useLocation();

  const currency =
    settings?.storefront?.settings?.currency ||
    settings?.company?.currency ||
    "EGP";

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground italic">
        لا توجد منتجات تطابق بحثك.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {results.map((product) => (
        <Link
          key={product.id}
          to={buildStorefrontPath(
            location.pathname,
            `/product/${product.slug || product.id}`,
            location.search,
          )}
          onClick={close}
          className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors group"
        >
          <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
            <StorefrontProductImage
              candidates={getProductImageCandidates(product)}
              alt={product.name}
              loading="lazy"
              width="48"
              height="48"
              className="h-full w-full object-cover"
              fallback={
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
              }
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors text-start">
              {product.name}
            </h4>
            <p dir="ltr" className="text-xs text-muted-foreground text-start">
              {formatStorefrontCurrency(product.price, currency)}
            </p>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground group-hover:translate-x-1 transition-transform rtl:rotate-180"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      ))}
    </div>
  );
};

/* ─────────────────── Header ─────────────────── */
const StorefrontHeader: React.FC<{
  isMinimal?: boolean;
  search: UseSearchResult;
}> = ({ isMinimal, search }) => {
  const { theme } = useStorefrontTheme();
  const { settings } = useStorefrontSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    query,
    setQuery,
    results,
    isLoading,
    isOpen: searchOpen,
    setIsOpen: setSearchOpen,
  } = search;
  const location = useLocation();
  const navigate = useNavigate();
  const setIsOpen = useCartStore((s) => s.setIsOpen);
  const totalItems = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const isSoleaFemme = theme.id === "solea-femme";
  const isIntruderNft = theme.id === "intruder-nft";
  const isBiteRush = theme.id === "restaurant-demo";
  const isCutlineClub = theme.id === "cutline-club";
  const isClosetOs = theme.id === "closet-os";
  const isAtelierNova = theme.id === "atelier-nova";
  const isElegantLuxe = theme.id === "elegant-luxe";
  const isKhemetLuxe = isKhemetLuxeTheme(theme.id);

  const isPcHub = theme.id === "pc-hub-eg";
  const isFastlyTheme = theme.id === "fastly-eg";
  const isMensGroomingPro = theme.id === "mens-grooming-pro";
  const isGracefulTheme = theme.id === "soft-graceful";
  const headerVariant =
    theme.header?.variant?.trim().toLowerCase() || "default";
  const isEditorialSoftHeader = headerVariant === "editorial-soft";
  const isUtilityFrameHeader = headerVariant === "utility-frame";
  const isRetailDirectHeader = headerVariant === "retail-direct";
  const isDigitalCommandHeader = headerVariant === "digital-command";
  const isFashionRetailHeader = headerVariant === "fashion-retail";
  const isButcherAtelierHeader = headerVariant === "butcher-atelier";
  const isLegacyDefaultOldHeader = headerVariant === "legacy-default-old";
  const isVelaFashionHeader = headerVariant === "vela-fashion";
  const isElessiPackTheme = theme.id?.startsWith("elessi-") === true;
  const isThemePreview = new URLSearchParams(location.search).has(
    "previewTheme",
  );
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const isHomePath =
    normalizedPath === "/" || normalizedPath.endsWith("/store");
  const isVelaInnerPath = isVelaFashionHeader && !isHomePath;
  const isCheckoutPath = normalizedPath.endsWith("/checkout");
  const isKhemetUnifiedHeaderPath = isKhemetLuxe && !isMinimal;
  const isProductDetailPath = Boolean(
    getStorefrontProductRouteKey(normalizedPath),
  );
  const shouldForceDocumentNavigation =
    shouldStorefrontHeaderForceDocumentNavigation(theme.id, isProductDetailPath);
  const isFloatingDarkHeader =
    !isBiteRush &&
    theme.header?.variant === "floating-dark" &&
    (theme.header?.transparentOnHome ?? true) &&
    isHomePath;
  const isKhemetFloatingDarkHeader = isKhemetLuxe && isFloatingDarkHeader;
  const brandHomeLinkProps = {
    forceDocumentNavigation: shouldForceDocumentNavigation,
    pathname: location.pathname,
    search: location.search,
  };



  // Resolve display name: storefront settings storeName → company name → theme name (fallback)
  const displayStoreName =
    (isThemePreview && theme.header?.brandName) ||
    settings?.storefront?.settings?.storeName ||
    theme.header?.brandName ||
    settings?.company?.name ||
    theme.name;
  const storefrontCurrency =
    settings?.storefront?.settings?.currency || settings?.company?.currency || "EGP";
  const conversionEnabled = isStorefrontMarketplaceAppEnabled(
    settings,
    "conversion-suite",
  );
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    settings,
    "conversion-suite",
  );
  const conversionModules =
    (conversionSettings["modules"] as Record<string, unknown> | undefined) || {};
  const conversionThresholds =
    (conversionSettings["thresholds"] as Record<string, unknown> | undefined) ||
    {};
  const khemetFreeShippingThreshold = parsePositiveNumber(
    conversionThresholds["freeShippingAmount"],
    0,
  );
  const showKhemetFreeShippingSignal =
    isKhemetLuxe &&
    conversionEnabled &&
    conversionModules["freeShippingBar"] !== false &&
    khemetFreeShippingThreshold > 0;
  const khemetFreeShippingThresholdText =
    storefrontCurrency === "EGP"
      ? `${new Intl.NumberFormat("ar-EG", {
          maximumFractionDigits: 0,
        }).format(khemetFreeShippingThreshold)} جنيه`
      : formatStorefrontCurrency(khemetFreeShippingThreshold, storefrontCurrency);
  const khemetUtilityShopPath = buildStorefrontPath(
    location.pathname,
    "/shop",
    location.search,
  );
  const hideUtilityBar = settings?.storefrontSettings?.hideUtilityBar === true;
  const khemetUtilityBar = isKhemetLuxe && !isMinimal && !hideUtilityBar ? (
    <div className="border-t border-[#efe6dc] bg-[#fffaf4]" dir="rtl">
      <div className="container px-0 md:px-6">
        <div className="flex min-h-10 items-center gap-3 overflow-x-auto px-4 py-2 text-[11px] text-[#5e5045] [scrollbar-width:none] md:min-h-11 md:justify-center md:gap-5 md:text-xs">
          <Link
            to={khemetUtilityShopPath}
            reloadDocument={shouldForceDocumentNavigation}
            className="inline-flex shrink-0 items-center rounded-full bg-[#183f31] px-3.5 py-2 font-black text-[#fff8ee] transition-colors hover:bg-[#112d23]"
          >
            ابدئي الطلب
          </Link>
          {showKhemetFreeShippingSignal ? (
            <>
              <span className="shrink-0 font-semibold text-[#1f1916]">
                شحن مجاني فوق {khemetFreeShippingThresholdText}
              </span>
              <span className="h-1 w-1 shrink-0 rounded-full bg-[#c5a470]" />
            </>
          ) : null}
          <span className="shrink-0">تبديل مقاس خلال 14 يوم</span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-[#c5a470]" />
          <span className="shrink-0">تأكيد الطلب قبل التجهيز</span>
        </div>
      </div>
    </div>
  ) : null;

  // Resolve logo: theme header logoUrl → storefront settings logoUrl → company logo
  const displayLogoUrl =
    theme.header?.logoUrl ||
    settings?.storefront?.settings?.["logoUrl"] ||
    (settings?.company?.logo ? settings.company.logo : null);

  // Use dynamic nav links from theme if available, otherwise default
  const navLinks = theme.header?.navigation?.map((nav) => ({
    label: nav.label,
    to: buildStorefrontPath(location.pathname, nav.to, location.search),
  })) || [
    {
      label: theme.direction === "rtl" ? "الرئيسية" : "Home",
      to: buildStorefrontPath(location.pathname, "/", location.search),
    },
    {
      label: theme.direction === "rtl" ? "المتجر" : "Shop",
      to: buildStorefrontPath(location.pathname, "/shop", location.search),
    },
  ];

  // Soft Graceful — dedicated Texture-style fashion header (utility bar + mega menu)
  if (isGracefulTheme && !isMinimal) {
    return <GracefulHeader search={search} />;
  }

  // Mens Grooming Pro — dark navy header identical to mensgroomingpro.com
  if (isMensGroomingPro && !isMinimal) {
    return (
      <>
        <header className="sticky top-0 z-50 w-full bg-[#19212B] text-white shadow-[0_2px_8px_rgba(0,0,0,.2)]">
          <div className="mx-auto flex h-[60px] max-w-[1100px] items-center justify-between px-4 md:px-6">
            <StorefrontHomeLink {...brandHomeLinkProps} className="flex items-center gap-2 text-[19px] font-bold tracking-[-0.5px] text-white">
              {displayStoreName}
            </StorefrontHomeLink>
            <nav className="hidden items-center gap-6 md:flex">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} reloadDocument={shouldForceDocumentNavigation} className="text-[14px] font-medium text-white/85 transition-colors hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="inline-flex h-9 w-9 items-center justify-center text-white md:hidden" aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
          </div>
          {mobileMenuOpen ? (
            <div className="border-t border-white/10 bg-[#19212B] px-4 py-3 md:hidden">
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link key={link.to} to={link.to} reloadDocument={shouldForceDocumentNavigation} onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-white/85 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}
        </header>
      </>
    );
  }

  const currentCategory = new URLSearchParams(location.search).get("category");
  const parseThemePath = (value: string) => {
    try {
      return new URL(value, "http://localhost");
    } catch {
      return null;
    }
  };
  const isKhemetInnerNavActive = (href: string) => {
    const parsed = parseThemePath(href);
    if (!parsed) return false;
    const targetPath = parsed.pathname.replace(/\/+$/, "") || "/";
    const targetCategory = parsed.searchParams.get("category");

    if (targetPath.endsWith("/sale")) {
      return normalizedPath.endsWith("/sale");
    }

    if (!normalizedPath.endsWith("/shop")) {
      return false;
    }

    if (targetCategory) {
      return currentCategory === targetCategory;
    }

    return currentCategory === null;
  };
  const headerActions = (theme.header?.actions || []).map((action) => ({
    ...action,
    href: buildStorefrontPath(location.pathname, action.to, location.search),
  }));
  const legacyMenuLinks = [
    ...navLinks,
    ...(theme.footer?.legalLinks || []).map((link) => ({
      label: link.label,
      to: buildStorefrontPath(location.pathname, link.to, location.search),
    })),
  ].filter(
    (link, index, links) =>
      links.findIndex(
        (candidate) =>
          candidate.to === link.to && candidate.label === link.label,
      ) === index,
  );
  const showSearch = theme.header?.showSearch !== false;
  const showCart = theme.header?.showCart !== false;
  const showDigitalCommandMobileSearch =
    showSearch && !(isElessiPackTheme && isProductDetailPath);
  const headerTagline =
    typeof theme.header?.tagline === "string" && theme.header.tagline.trim()
      ? theme.header.tagline.trim()
      : null;
  const headerRailLabel =
    typeof theme.header?.railLabel === "string" && theme.header.railLabel.trim()
      ? theme.header.railLabel.trim()
      : null;
  const customHeaderRailItems = useMemo(
    () =>
      Array.isArray(theme.header?.railItems)
        ? theme.header.railItems
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    [theme.header?.railItems],
  );
  const cutlineClubRailItems = useMemo(
    () =>
      theme.direction === "rtl"
        ? ["POSTER MODE 05", "دروب أسبوعي", "شحن 48 ساعة", "مقاسات تتحرك بسرعة"]
        : [
            "POSTER MODE 05",
            "Weekly drop",
            "48h shipping",
            "Fast-moving sizes",
          ],
    [theme.direction],
  );
  const closetOsRailItems = useMemo(
    () =>
      theme.direction === "rtl"
        ? ["WEEK MAP", "لبسات تتكرر", "غسيل بارد", "شحن 48 ساعة"]
        : ["WEEK MAP", "Repeat wear", "Wash cold", "48h shipping"],
    [theme.direction],
  );
  const editorialHeaderRail = useMemo(
    () =>
      theme.direction === "rtl"
        ? ["دروب محسوبة", "صور حقيقية", "تبديل أسهل", "مقاسات أوضح"]
        : ["Curated drops", "Real imagery", "Easy exchanges", "Clear sizing"],
    [theme.direction],
  );
  const utilityHeaderRail = useMemo(
    () => {
      if (customHeaderRailItems.length > 0) {
        return customHeaderRailItems;
      }

      return theme.direction === "rtl"
        ? ["جاهز للحسم", "مقاسات مباشرة", "شحن سريع", "قرار أسرع"]
        : [
            "Ready to move",
            "Straight sizing",
            "Fast shipping",
            "Quicker decision",
          ];
    },
    [customHeaderRailItems, theme.direction],
  );
  const retailDirectRail = useMemo(
    () =>
      theme.direction === "rtl"
        ? ["شحن مجاني", "خصومات السنة الجديدة", "طلب سريع من صفحة المنتج"]
        : ["Free shipping", "New year discounts", "Direct product-page order"],
    [theme.direction],
  );
  const digitalCommandRail = useMemo(
    () =>
      theme.direction === "rtl"
        ? ["شحن 48 ساعة", "مواصفات أوضح", "ضمان موثق", "ترقيات سريعة"]
        : [
            "48h shipping",
            "Clearer specs",
            "Documented warranty",
            "Fast upgrades",
          ],
    [theme.direction],
  );

  const isActive = (path: string) => {
    const current = location.pathname;
    return (
      current === path || (path.endsWith("/") && current === path.slice(0, -1))
    );
  };

  const closeSearchOverlay = () => {
    setSearchOpen(false);
    setQuery("");
  };
  const moreResultsPath = buildStorefrontPath(
    location.pathname,
    `/shop?search=${encodeURIComponent(query.trim())}`,
    location.search,
  );

  const handlePcHubSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(
      query.trim()
        ? moreResultsPath
        : buildStorefrontPath(location.pathname, "/shop", location.search),
    );
  };

  const khemetSearchOverlay = searchOpen ? (
    <div
      className="fixed inset-0 z-[100] bg-[#1f1916]/35 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={theme.direction === "rtl" ? "بحث المنتجات" : "Search products"}
    >
      <div className="mx-auto max-w-2xl pt-14 md:pt-20">
        <div
          className="rounded-[1.35rem] border border-[#e6dccf] bg-[#fffdfa] p-3 shadow-[0_38px_110px_-58px_rgba(44,36,27,0.42)]"
          dir={theme.direction}
        >
          <div className="relative">
            <svg
              className={`absolute ${theme.direction === "rtl" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-[#8a765f]`}
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              autoFocus
              type="text"
              placeholder={
                theme.direction === "rtl"
                  ? "ابحثي عن منتج أو مقاس..."
                  : "Search products or sizes..."
              }
              className={`h-14 w-full rounded-[1rem] border border-[#d9cbb8] bg-white text-base text-[#241d18] outline-none transition-colors placeholder:text-[#a8947b] focus:border-[#173f31] ${
                theme.direction === "rtl" ? "pe-12 ps-12" : "ps-12 pe-12"
              }`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) =>
                event.key === "Escape" && closeSearchOverlay()
              }
            />
            <button
              type="button"
              onClick={closeSearchOverlay}
              className={`absolute ${theme.direction === "rtl" ? "left-3" : "right-3"} top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#725523] transition-colors hover:bg-[#f4ede6] hover:text-[#173f31]`}
              aria-label={theme.direction === "rtl" ? "إغلاق البحث" : "Close search"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {query.length > 2 ? (
            <div className="mt-3 rounded-[1rem] border border-[#e7ddd0] bg-white p-3">
              <p className="mb-3 text-start text-sm font-semibold text-[#725523]">
                {theme.direction === "rtl"
                  ? `نتائج البحث عن "${query}"`
                  : `Results for "${query}"`}
              </p>
              <SearchResults
                results={results}
                isLoading={isLoading}
                close={closeSearchOverlay}
              />
              <Link
                to={moreResultsPath}
                onClick={closeSearchOverlay}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-[#d9cbb8] px-4 py-2 text-sm font-bold text-[#173f31] transition-colors hover:border-[#173f31]"
              >
                {theme.direction === "rtl" ? "عرض كل النتائج" : "View all results"}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  if (isKhemetLuxe && isMinimal) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-[#e6dccf] bg-white">
        <div className="container px-4 md:px-6">
          <div
            className="flex items-center justify-between gap-4 py-5"
            dir="ltr"
          >
            <StorefrontHomeLink
              {...brandHomeLinkProps}
              className="shrink-0"
            >
              {displayLogoUrl ? (
                <img
                  src={displayLogoUrl}
                  alt={displayStoreName}
                  className="h-10 w-auto object-contain md:h-11"
                />
              ) : (
                <span className="font-heading text-[2rem] font-black tracking-[-0.04em] text-[#1a1714]">
                  {displayStoreName}
                </span>
              )}
            </StorefrontHomeLink>

            {showCart && isCheckoutPath ? (
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e6dccf] text-[#7b6747] transition-colors hover:border-[#b89255] hover:text-[#2c241b]"
                aria-label={
                  theme.direction === "rtl" ? "فتح السلة" : "Open cart"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
                {totalItems > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#2c241b] px-1 text-[10px] font-black text-white">
                    {totalItems}
                  </span>
                ) : null}
              </button>
            ) : (
              <div className="h-11 w-11" aria-hidden="true" />
            )}
          </div>
        </div>
      </header>
    );
  }

  if (isKhemetUnifiedHeaderPath) {
    return (
      <>
        <header className="sticky top-0 z-50 w-full border-b border-[#e6dccf] bg-[rgba(255,255,255,0.96)] backdrop-blur">
          <div className="container px-4 md:px-6">
            <div className="flex flex-nowrap items-center gap-3 py-4 md:gap-5 md:py-5">
              <StorefrontHomeLink
                {...brandHomeLinkProps}
                className="shrink-0"
              >
              {displayLogoUrl ? (
                <img
                  src={displayLogoUrl}
                  alt={displayStoreName}
                  className="h-9 w-auto object-contain md:h-10"
                />
              ) : (
                <span className="font-heading text-[1.9rem] font-black tracking-[-0.04em] text-[#1a1714] md:text-[2rem]">
                  {displayStoreName}
                </span>
              )}
            </StorefrontHomeLink>

            {navLinks.length > 0 ? (
              <nav className="hidden min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] md:block">
                <div className="flex min-w-max flex-nowrap items-center gap-1 whitespace-nowrap px-3 md:justify-center md:px-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      reloadDocument={shouldForceDocumentNavigation}
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors md:px-3 md:text-sm ${
                        isKhemetInnerNavActive(link.to)
                          ? "bg-[#1f1916] text-white"
                          : "text-[#6e6257] hover:bg-[#f4ede6] hover:text-[#241d18]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </nav>
            ) : (
              <div className="hidden flex-1 md:block" />
            )}
            <div className="min-w-0 flex-1 md:hidden" aria-hidden="true" />

            <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
              {!isIntruderNft && showSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSearchOpen(true);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6dccf] text-[#7b6747] transition-colors hover:border-[#b89255] hover:text-[#2c241b]"
                  aria-label={
                    theme.direction === "rtl" ? "فتح البحث" : "Open search"
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              ) : null}

              {!isIntruderNft && showCart ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsOpen(true);
                  }}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6dccf] text-[#7b6747] transition-colors hover:border-[#b89255] hover:text-[#2c241b]"
                  aria-label={
                    theme.direction === "rtl"
                      ? `سلة التسوق (${totalItems} منتجات)`
                      : `Shopping cart (${totalItems} items)`
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                  {totalItems > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#2c241b] px-1 text-[10px] font-black text-white">
                      {totalItems}
                    </span>
                  ) : null}
                </button>
              ) : null}

              {navLinks.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((value) => !value)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6dccf] text-[#7b6747] transition-colors hover:border-[#b89255] hover:text-[#2c241b] md:hidden"
                  aria-label={
                    theme.direction === "rtl"
                      ? mobileMenuOpen
                        ? "إغلاق القائمة"
                        : "فتح القائمة"
                      : mobileMenuOpen
                        ? "Close menu"
                        : "Open menu"
                  }
                >
                  {mobileMenuOpen ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="4" x2="20" y1="12" y2="12" />
                      <line x1="4" x2="20" y1="6" y2="6" />
                      <line x1="4" x2="20" y1="18" y2="18" />
                    </svg>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {khemetUtilityBar}
      </header>
      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[90] bg-[#1f1916]/30 backdrop-blur-[1px] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={theme.direction === "rtl" ? "إغلاق القائمة" : "Close menu"}
          />
          <div
            className={`fixed inset-y-0 ${theme.direction === "rtl" ? "right-0 border-l" : "left-0 border-r"} z-[95] w-full max-w-sm overflow-y-auto border-[#e6dccf] bg-[#fffdfa] shadow-[0_36px_100px_-54px_rgba(44,36,27,0.46)] md:hidden`}
            role="dialog"
            aria-modal="true"
            aria-label={theme.direction === "rtl" ? "قائمة المتجر" : "Store navigation"}
            dir={theme.direction}
          >
            <div className="flex items-center justify-between border-b border-[#e6dccf] px-5 py-4">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8a765f]">
                  {theme.direction === "rtl" ? "التصفح" : "Browse"}
                </p>
                <p className="font-heading text-xl font-black text-[#1a1714]">
                  {displayStoreName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6dccf] text-[#725523] transition-colors hover:border-[#b89255] hover:text-[#173f31]"
                aria-label={theme.direction === "rtl" ? "إغلاق القائمة" : "Close menu"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <nav className="px-5 py-5">
              <div className="space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={`khemet-mobile-menu-${link.to}`}
                    to={link.to}
                    reloadDocument={shouldForceDocumentNavigation}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-[1rem] px-4 py-3 text-sm font-bold transition-colors ${
                      isKhemetInnerNavActive(link.to)
                        ? "bg-[#173f31] text-[#fff7eb]"
                        : "text-[#5f4c38] hover:bg-[#f4ede6] hover:text-[#173f31]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {legacyMenuLinks.length > navLinks.length ? (
                <div className="mt-6 border-t border-[#e6dccf] pt-5">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a765f]">
                    {theme.direction === "rtl" ? "روابط مهمة" : "Useful links"}
                  </p>
                  <div className="space-y-1">
                    {legacyMenuLinks.slice(navLinks.length).map((link) => (
                      <Link
                        key={`khemet-mobile-policy-${link.to}`}
                        to={link.to}
                        reloadDocument={shouldForceDocumentNavigation}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block rounded-[0.9rem] px-4 py-2.5 text-sm font-semibold text-[#725523] transition-colors hover:bg-[#f4ede6] hover:text-[#173f31]"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </nav>
          </div>
        </>
      ) : null}
      {khemetSearchOverlay}
      </>
    );
  }

  if (isButcherAtelierHeader && !isMinimal) {
    return (
      <>
        <header
          dir={theme.direction}
          className="sticky top-0 z-50 w-full border-b border-[#37312c] bg-[#080706]/96 text-[#f4ead8] shadow-[0_24px_70px_-54px_rgba(0,0,0,0.86)] backdrop-blur-xl"
        >
          <div className="hidden border-b border-[#37312c] bg-[#0b0908] md:block">
            <div className="container flex h-9 items-center justify-between gap-5 overflow-hidden px-4 md:px-6">
              <span className="shrink-0 border border-[#8b6b3e] bg-[#15110f] px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b674]">
                {headerRailLabel || "BLACK LABEL"}
              </span>
              <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ab9c]">
                {utilityHeaderRail.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 ? <span className="text-[#4a4138]">/</span> : null}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="container flex h-20 items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex items-center gap-4 lg:gap-8">
              <button
                className="md:hidden -ms-2 inline-flex h-11 w-11 items-center justify-center border border-[#37312c] text-[#d7b674] transition-colors hover:border-[#8b6b3e] hover:text-[#fff7e8]"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={
                  theme.direction === "rtl"
                    ? mobileMenuOpen
                      ? "إغلاق القائمة"
                      : "فتح القائمة"
                    : mobileMenuOpen
                      ? "Close menu"
                      : "Open menu"
                }
              >
                {mobileMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                )}
              </button>

              <StorefrontHomeLink
                {...brandHomeLinkProps}
                className="group flex items-center gap-3"
              >
                <span className="grid h-11 w-11 place-items-center border border-[#8b6b3e] bg-[#15110f] text-[10px] font-black uppercase tracking-[0.22em] text-[#d7b674] transition-colors group-hover:bg-[#5f1118]">
                  PB
                </span>
                <span className="flex flex-col text-start leading-none">
                  <span className="font-heading text-[1.18rem] font-black text-[#fff7e8] sm:text-[1.35rem]">
                    {displayStoreName}
                  </span>
                  <span className="mt-1 text-[10px] font-black uppercase tracking-[0.32em] text-[#d7b674]">
                    {headerTagline || "Premium butcher shop"}
                  </span>
                </span>
              </StorefrontHomeLink>

              <nav className="hidden items-center gap-1 md:flex">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    reloadDocument={shouldForceDocumentNavigation}
                    className={`px-3 py-2 text-sm font-bold transition-colors ${
                      isActive(link.to)
                        ? "border border-[#8b6b3e] bg-[#15110f] text-[#d7b674]"
                        : "text-[#b7ab9c] hover:bg-[#15110f] hover:text-[#fff7e8]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {headerActions.length > 0 ? (
                <div className="hidden items-center gap-2 md:flex">
                  {headerActions.map((action) => (
                    <Link
                      key={`${action.label}-${action.href}`}
                      to={action.href}
                      reloadDocument={shouldForceDocumentNavigation}
                      className={
                        action.style === "primary"
                          ? "inline-flex min-h-[2.75rem] items-center justify-center border border-[#8f1d2b] bg-[#7a131d] px-5 text-sm font-black text-[#fff4dc] transition-colors hover:bg-[#9a1d2a]"
                          : action.style === "outline"
                            ? "inline-flex min-h-[2.75rem] items-center justify-center border border-[#4a4138] bg-[#15110f] px-5 text-sm font-bold text-[#d6cbbb] transition-colors hover:border-[#8b6b3e] hover:text-[#fff7e8]"
                            : "inline-flex min-h-[2.75rem] items-center justify-center px-3 text-sm font-bold text-[#d6cbbb] transition-colors hover:text-[#d7b674]"
                      }
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              ) : null}
              {showSearch ? (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center border border-[#37312c] text-[#d7b674] transition-colors hover:border-[#8b6b3e] hover:text-[#fff7e8]"
                  aria-label={theme.direction === "rtl" ? "بحث" : "Search products"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              ) : null}
              {showCart ? (
                <button
                  onClick={() => setIsOpen(true)}
                  className="relative inline-flex h-11 w-11 items-center justify-center border border-[#37312c] text-[#d7b674] transition-colors hover:border-[#8b6b3e] hover:text-[#fff7e8]"
                  aria-label={
                    theme.direction === "rtl"
                      ? `سلة التسوق (${totalItems} منتجات)`
                      : `Shopping cart (${totalItems} items)`
                  }
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                  {totalItems > 0 ? (
                    <span className="absolute -end-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center bg-[#7a131d] px-1 text-[10px] font-black text-[#fff4dc]">
                      {totalItems}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>
          </div>

          {mobileMenuOpen ? (
            <div className="border-t border-[#37312c] bg-[#0b0908] px-4 py-4 md:hidden">
              <nav className="space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    reloadDocument={shouldForceDocumentNavigation}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block border px-3 py-3 text-sm font-bold ${
                      isActive(link.to)
                        ? "border-[#8b6b3e] bg-[#15110f] text-[#d7b674]"
                        : "border-transparent text-[#b7ab9c] hover:border-[#37312c] hover:text-[#fff7e8]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {headerActions.map((action) => (
                  <Link
                    key={`mobile-${action.label}-${action.href}`}
                    to={action.href}
                    reloadDocument={shouldForceDocumentNavigation}
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-2 block border border-[#8f1d2b] bg-[#7a131d] px-4 py-3 text-center text-sm font-black text-[#fff4dc]"
                  >
                    {action.label}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}
        </header>

        {searchOpen ? (
          <div className="fixed inset-0 z-[100] bg-[#080706]/88 px-4 pt-20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="mx-auto max-w-2xl border border-[#37312c] bg-[#0b0908] p-3 shadow-[0_36px_100px_-58px_rgba(0,0,0,0.92)]" dir={theme.direction}>
              <div className="relative">
                <svg
                  className={`absolute ${theme.direction === "rtl" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-[#8b6b3e]`}
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder={theme.direction === "rtl" ? "ابحث عن قطعية أو وزن..." : "Search cuts or weights..."}
                  className={`h-14 w-full border border-[#4a4138] bg-[#15110f] text-base font-bold text-[#fff7e8] outline-none transition-colors placeholder:text-[#81756b] focus:border-[#b99154] ${
                    theme.direction === "rtl" ? "pe-12 ps-12" : "ps-12 pe-12"
                  }`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Escape" && closeSearchOverlay()}
                />
                <button
                  onClick={closeSearchOverlay}
                  className={`absolute ${theme.direction === "rtl" ? "left-3" : "right-3"} top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center text-[#b7ab9c] transition-colors hover:text-[#fff7e8]`}
                  aria-label={theme.direction === "rtl" ? "إغلاق البحث" : "Close search"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {query.length > 2 ? (
                <div className="mt-3 border border-[#37312c] bg-[#080706] p-3">
                  <p className="mb-3 text-start text-sm font-semibold text-[#d7b674]">
                    {theme.direction === "rtl"
                      ? `نتائج البحث عن "${query}"`
                      : `Results for "${query}"`}
                  </p>
                  <SearchResults
                    results={results}
                    isLoading={isLoading}
                    close={closeSearchOverlay}
                  />
                  <Link
                    to={moreResultsPath}
                    onClick={closeSearchOverlay}
                    className="mt-3 inline-flex items-center justify-center border border-[#8b6b3e] px-4 py-2 text-sm font-bold text-[#d7b674] transition-colors hover:bg-[#15110f]"
                  >
                    {theme.direction === "rtl" ? "عرض كل النتائج" : "View all results"}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (isLegacyDefaultOldHeader && !isMinimal) {
    return (
      <>
        <header
          dir={theme.direction}
          className="sticky top-0 z-50 w-full border-b border-[#111111]/8 bg-white shadow-[0_14px_36px_-34px_rgba(17,17,17,0.4)]"
        >
          {theme.header?.announcementText ? (
            <div className="bg-black px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white">
              <div className="container flex flex-wrap items-center justify-center gap-2 md:px-6">
                <span>{theme.header.announcementText}</span>
                {theme.header.announcementLinkText &&
                theme.header.announcementLinkTo ? (
                  <Link
                    to={buildStorefrontPath(
                      location.pathname,
                      theme.header.announcementLinkTo,
                      location.search,
                    )}
                    className="text-white/78 underline underline-offset-4 transition-colors hover:text-white"
                  >
                    {theme.header.announcementLinkText}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="container px-4 md:px-6">
            {isFastlyTheme ? (
              <div className="flex items-center justify-between gap-3 py-4">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((value) => !value)}
                  className="inline-flex h-10 w-10 items-center justify-center text-[#111111] transition-colors hover:text-[#555555]"
                  aria-label={
                    theme.direction === 'rtl'
                      ? mobileMenuOpen
                        ? 'إغلاق القائمة'
                        : 'فتح القائمة'
                      : mobileMenuOpen
                        ? 'Close menu'
                        : 'Open menu'
                  }
                >
                  {mobileMenuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" x2="20" y1="12" y2="12" />
                      <line x1="4" x2="20" y1="6" y2="6" />
                      <line x1="4" x2="20" y1="18" y2="18" />
                    </svg>
                  )}
                </button>

                <StorefrontHomeLink
                  {...brandHomeLinkProps}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center"
                >
                  {displayLogoUrl ? (
                    <img
                      src={displayLogoUrl}
                      alt={displayStoreName}
                      className="h-10 w-auto object-contain sm:h-11"
                    />
                  ) : (
                    <span className="font-heading text-xl font-bold text-[#111111]">
                      {displayStoreName}
                    </span>
                  )}
                </StorefrontHomeLink>

                <div className="flex items-center justify-end gap-1">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 items-center justify-center text-[#111111]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 21-1.45-1.32C5.4 15.02 2 11.93 2 8.13 2 5.04 4.42 2.62 7.5 2.62c1.74 0 3.41.81 4.5 2.09 1.09-1.28 2.76-2.09 4.5-2.09 3.08 0 5.5 2.42 5.5 5.51 0 3.8-3.4 6.89-8.55 11.56L12 21Z" />
                    </svg>
                  </span>
                  {showSearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setSearchOpen(true);
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center text-[#111111] transition-colors hover:text-[#555555]"
                      aria-label={theme.direction === 'rtl' ? 'فتح البحث' : 'Open search'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                      </svg>
                    </button>
                  ) : null}
                  {showCart ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setIsOpen(true);
                      }}
                      className="relative inline-flex h-10 w-10 items-center justify-center text-[#111111] transition-colors hover:text-[#555555]"
                      aria-label={
                        theme.direction === 'rtl'
                          ? `سلة التسوق (${totalItems} منتجات)`
                          : `Shopping cart (${totalItems} items)`
                      }
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="21" r="1" />
                        <circle cx="19" cy="21" r="1" />
                        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                      </svg>
                      {totalItems > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-black px-1 text-[10px] font-black text-white">
                          {totalItems}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
            <div className="flex items-center justify-between gap-3 py-4 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="inline-flex h-10 w-10 items-center justify-center text-[#111111] transition-colors hover:text-[#555555]"
                aria-label={
                  theme.direction === "rtl"
                    ? mobileMenuOpen
                      ? "إغلاق القائمة"
                      : "فتح القائمة"
                    : mobileMenuOpen
                      ? "Close menu"
                      : "Open menu"
                }
              >
                {mobileMenuOpen ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                )}
              </button>

              <StorefrontHomeLink
                {...brandHomeLinkProps}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center"
              >
                {displayLogoUrl ? (
                  <img
                    src={displayLogoUrl}
                    alt={displayStoreName}
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <span className="font-heading text-base font-black uppercase tracking-[0.08em] text-[#111111] sm:text-lg">
                    {displayStoreName}
                  </span>
                )}
              </StorefrontHomeLink>

              <div className="flex items-center justify-end gap-2">
                {showSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setSearchOpen(true);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center text-[#111111] transition-colors hover:text-[#555555]"
                    aria-label={
                      theme.direction === "rtl" ? "فتح البحث" : "Open search"
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>
                ) : null}
                {showCart ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsOpen(true);
                    }}
                    className="relative inline-flex h-10 w-10 items-center justify-center text-[#111111] transition-colors hover:text-[#555555]"
                    aria-label={
                      theme.direction === "rtl"
                        ? `سلة التسوق (${totalItems} منتجات)`
                        : `Shopping cart (${totalItems} items)`
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                    {totalItems > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-black px-1 text-[10px] font-black text-white">
                        {totalItems}
                      </span>
                    ) : null}
                  </button>
                ) : null}
              </div>
            </div>
            )}

            {!isFastlyTheme ? (
            <div className="hidden items-center justify-between gap-6 py-4 lg:flex">
              <StorefrontHomeLink
                {...brandHomeLinkProps}
                className="shrink-0"
              >
                {displayLogoUrl ? (
                  <img
                    src={displayLogoUrl}
                    alt={displayStoreName}
                    className="h-11 w-auto object-contain"
                  />
                ) : (
                  <span className="font-heading text-xl font-semibold tracking-tight text-[#111111]">
                    {displayStoreName}
                  </span>
                )}
              </StorefrontHomeLink>

              <nav className="flex min-w-0 flex-1 items-center justify-center gap-5 text-[12px] font-medium normal-case text-[#111111] xl:gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={`legacy-desktop-${link.to}`}
                    to={link.to}
                    className={`normal-case transition-colors hover:text-[#555555] ${isActive(link.to) ? "text-[#111111]" : "text-[#111111]"}`}
                  >
                    {link.label}
                  </Link>
                ))}
                {showSearch ? (
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="normal-case transition-colors hover:text-[#555555]"
                  >
                    Search
                  </button>
                ) : null}
              </nav>

              {showCart ? (
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className="inline-flex shrink-0 items-center gap-2 text-[12px] font-medium normal-case text-[#111111] transition-colors hover:text-[#555555]"
                  aria-label={
                    theme.direction === "rtl"
                      ? `سلة التسوق (${totalItems} منتجات)`
                      : `Shopping cart (${totalItems} items)`
                  }
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                  <span className="flex items-center gap-1">
                    <span className="font-bold">{totalItems}</span>
                    <span>
                      {theme.direction === "rtl"
                        ? "منتجات في السلة"
                        : "items in cart"}
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
            ) : null}
          </div>

          {mobileMenuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[90] bg-black/25"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={
                  theme.direction === "rtl" ? "إغلاق القائمة" : "Close menu"
                }
              />
              <div
                className={`fixed inset-y-0 ${theme.direction === "rtl" ? "right-0 border-l" : "left-0 border-r"} z-[95] w-full max-w-sm overflow-y-auto border-[#111111]/10 bg-white shadow-[0_32px_90px_-48px_rgba(17,17,17,0.5)]`}
              >
                <div className="flex items-center justify-between border-b border-[#111111]/8 px-5 py-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7a7a7a]">
                      {theme.direction === "rtl" ? "التصفح" : "Browse"}
                    </p>
                    <p className="font-heading text-lg font-semibold tracking-tight text-[#111111]">
                      {displayStoreName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center text-[#111111] transition-colors hover:text-[#555555]"
                    aria-label={
                      theme.direction === "rtl" ? "إغلاق القائمة" : "Close menu"
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>

                <div className="px-5 py-5">
                  <div className="space-y-1">
                    {navLinks.map((link) => (
                      <Link
                        key={`legacy-menu-${link.to}`}
                        to={link.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block border-b border-[#111111]/6 py-3 text-sm font-medium normal-case transition-colors ${
                          isActive(link.to)
                            ? "text-[#111111]"
                            : "text-[#666666] hover:text-[#111111]"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                    {showCart ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setIsOpen(true);
                        }}
                        className="flex w-full items-center justify-between border-b border-[#111111]/6 py-3 text-sm font-medium normal-case text-[#666666] transition-colors hover:text-[#111111]"
                      >
                        <span className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="8" cy="21" r="1" />
                            <circle cx="19" cy="21" r="1" />
                            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                          </svg>
                          {theme.direction === "rtl" ? "سلة التسوق" : "Shopping Cart"}
                        </span>
                        {totalItems > 0 ? (
                          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-black px-1.5 text-[10px] font-black text-white">
                            {totalItems}
                          </span>
                        ) : null}
                      </button>
                    ) : null}
                  </div>

                  {legacyMenuLinks.length > navLinks.length ? (
                    <div className="mt-6 space-y-1 border-t border-[#111111]/8 pt-5">
                      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#7a7a7a]">
                        {theme.direction === "rtl" ? "السياسات" : "Policies"}
                      </p>
                      {legacyMenuLinks.slice(navLinks.length).map((link) => (
                        <Link
                          key={`legacy-policy-${link.to}`}
                          to={link.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block py-2 text-sm font-medium text-[#555555] transition-colors hover:text-[#111111]"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </header>

        {searchOpen && (
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="container max-w-2xl px-4 pt-20">
              <div className="relative group" dir={theme.direction}>
                <svg
                  className={`absolute ${theme.direction === "rtl" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors`}
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder={
                    theme.direction === "rtl"
                      ? "ابحث عن المنتجات..."
                      : "Search products..."
                  }
                  className={`h-14 w-full ${theme.direction === "rtl" ? "pe-12 ps-12" : "ps-12 pe-12"} rounded-xl border-2 border-border bg-card text-lg outline-none transition-all focus:border-primary shadow-xl`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) =>
                    event.key === "Escape" && closeSearchOverlay()
                  }
                />
                <button
                  onClick={closeSearchOverlay}
                  className={`absolute ${theme.direction === "rtl" ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {query.length > 2 ? (
                <div className="mt-4 animate-in zoom-in-95 rounded-xl border border-border bg-card p-4 shadow-2xl duration-200">
                  <p className="mb-4 text-start text-sm font-medium text-muted-foreground">
                    {theme.direction === "rtl"
                      ? `النتائج لـ "${query}"`
                      : `Results for "${query}"`}
                  </p>
                  <SearchResults
                    results={results}
                    isLoading={isLoading}
                    close={closeSearchOverlay}
                  />
                  <Link
                    to={moreResultsPath}
                    onClick={closeSearchOverlay}
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/25 hover:text-primary"
                  >
                    {theme.direction === "rtl"
                      ? "عرض مزيد من النتائج"
                      : "More results"}
                  </Link>
                </div>
              ) : null}

              <button
                className="mx-auto mt-6 block text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={closeSearchOverlay}
              >
                {theme.direction === "rtl" ? (
                  <span>
                    اضغط{" "}
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans">
                      ESC
                    </kbd>{" "}
                    للإغلاق
                  </span>
                ) : (
                  <span>
                    Press{" "}
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans">
                      ESC
                    </kbd>{" "}
                    to close
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (isPcHub && !isMinimal) {
    return (
      <>
        <header
          dir={theme.direction}
          className="sticky top-0 z-50 w-full border-b border-[#e8edf3] bg-white/95 shadow-[0_16px_40px_-36px_rgba(15,23,42,0.32)] backdrop-blur"
        >
          <div className="container px-4 md:px-6">
            <div className="hidden items-center gap-6 py-4 md:grid md:grid-cols-[auto_minmax(18rem,1fr)_auto]">
              <StorefrontHomeLink
                {...brandHomeLinkProps}
                className="flex items-center gap-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-[#facc15] text-[#111827] shadow-[0_12px_24px_-18px_rgba(250,204,21,0.75)]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="8" rx="2" />
                    <path d="M7 4h10" />
                    <path d="M12 19v2" />
                    <path d="M9 21h6" />
                  </svg>
                </span>
                <span className="font-heading text-2xl font-semibold tracking-tight text-[#111827]">
                  {displayStoreName}
                </span>
              </StorefrontHomeLink>

              <form
                onSubmit={handlePcHubSearchSubmit}
                className="flex items-center overflow-hidden rounded-full border border-[#e5e7eb] bg-[#f8fafc] shadow-[0_10px_24px_-22px_rgba(15,23,42,0.18)]"
              >
                <button
                  type="button"
                  className="px-5 py-3 text-sm font-medium text-[#6b7280] transition-colors hover:text-[#111827]"
                >
                  {theme.direction === "rtl" ? "كل الأقسام" : "All Depts"}
                </button>
                <div className="h-5 w-px bg-[#e5e7eb]" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    theme.direction === "rtl"
                      ? "ابحث عن لابتوب، شاشة، أو إكسسوار..."
                      : "Search electronics, gadgets, and more..."
                  }
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
                />
                <button
                  type="submit"
                  className="flex h-12 w-14 items-center justify-center bg-[#facc15] text-[#111827] transition-colors hover:bg-[#f5c000]"
                  aria-label={theme.direction === "rtl" ? "بحث" : "Search"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              </form>

              <div className="flex items-center gap-6 text-[#111827]">
                <div className="hidden cursor-default flex-col text-start lg:flex">
                  <span className="text-[11px] font-light text-[#9ca3af]">
                    {theme.direction === "rtl"
                      ? "مرحبًا، سجّل دخولك"
                      : "Hello, Sign in"}
                  </span>
                  <span className="text-sm font-medium">
                    {theme.direction === "rtl"
                      ? "الحساب والقوائم"
                      : "Account & Lists"}
                  </span>
                </div>
                <div className="hidden cursor-default flex-col text-start lg:flex">
                  <span className="text-[11px] font-light text-[#9ca3af]">
                    {theme.direction === "rtl" ? "الاسترجاع" : "Returns"}
                  </span>
                  <span className="text-sm font-medium">
                    {theme.direction === "rtl" ? "والطلبات" : "& Orders"}
                  </span>
                </div>
                {showCart ? (
                  <button
                    onClick={() => setIsOpen(true)}
                    className="relative flex items-center gap-2 text-[#111827] transition-colors hover:text-[#f59e0b]"
                    aria-label={
                      theme.direction === "rtl"
                        ? `سلة التسوق (${totalItems} منتجات)`
                        : `Shopping cart (${totalItems} items)`
                    }
                  >
                    <div className="relative">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="8" cy="21" r="1" />
                        <circle cx="19" cy="21" r="1" />
                        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                      </svg>
                      {totalItems > 0 ? (
                        <span className="absolute -end-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#facc15] text-[11px] font-semibold text-[#111827]">
                          {totalItems}
                        </span>
                      ) : null}
                    </div>
                    <span className="pt-2 text-sm font-medium">
                      {theme.direction === "rtl" ? "السلة" : "Cart"}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between py-3 md:hidden">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-full p-2 text-[#111827] transition-colors hover:bg-[#f3f4f6]"
                  onClick={() => setMobileMenuOpen((value) => !value)}
                  aria-label={
                    theme.direction === "rtl"
                      ? mobileMenuOpen
                        ? "إغلاق القائمة"
                        : "فتح القائمة"
                      : mobileMenuOpen
                        ? "Close menu"
                        : "Open menu"
                  }
                >
                  {mobileMenuOpen ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="4" x2="20" y1="12" y2="12" />
                      <line x1="4" x2="20" y1="6" y2="6" />
                      <line x1="4" x2="20" y1="18" y2="18" />
                    </svg>
                  )}
                </button>
                <StorefrontHomeLink
                  {...brandHomeLinkProps}
                  className="flex items-center gap-2"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-[#facc15] text-[#111827]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="18" height="11" x="3" y="8" rx="2" />
                      <path d="M7 4h10" />
                    </svg>
                  </span>
                  <span className="font-heading text-lg font-semibold text-[#111827]">
                    {displayStoreName}
                  </span>
                </StorefrontHomeLink>
              </div>
              <div className="flex items-center gap-1">
                {showSearch ? (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="rounded-full p-2 text-[#111827] transition-colors hover:bg-[#f3f4f6]"
                    aria-label={theme.direction === "rtl" ? "بحث" : "Search"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>
                ) : null}
                {showCart ? (
                  <button
                    onClick={() => setIsOpen(true)}
                    className="relative rounded-full p-2 text-[#111827] transition-colors hover:bg-[#f3f4f6]"
                    aria-label={
                      theme.direction === "rtl"
                        ? `سلة التسوق (${totalItems} منتجات)`
                        : `Shopping cart (${totalItems} items)`
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                    {totalItems > 0 ? (
                      <span className="absolute -end-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#facc15] text-[10px] font-semibold text-[#111827]">
                        {totalItems}
                      </span>
                    ) : null}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="pb-3 md:hidden">
              <form
                onSubmit={handlePcHubSearchSubmit}
                className="flex items-center overflow-hidden rounded-full border border-[#e5e7eb] bg-[#f8fafc] shadow-[0_10px_24px_-22px_rgba(15,23,42,0.18)]"
              >
                <button
                  type="button"
                  className="px-3.5 py-2.5 text-[12px] font-medium text-[#6b7280] transition-colors hover:text-[#111827]"
                >
                  {theme.direction === "rtl" ? "الكل" : "All"}
                </button>
                <div className="h-4 w-px bg-[#e5e7eb]" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    theme.direction === "rtl"
                      ? "ابحث عن لابتوب، شاشة، أو إكسسوار..."
                      : "Search electronics, gadgets, and more..."
                  }
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
                />
                <button
                  type="submit"
                  className="flex h-10 w-11 items-center justify-center rounded-full bg-[#facc15] text-[#111827] transition-colors hover:bg-[#f5c000]"
                  aria-label={theme.direction === "rtl" ? "بحث" : "Search"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          <div className="border-t border-[#edf1f4] bg-white">
            <div className="container px-4 md:px-6">
              <div className="hidden items-center gap-5 overflow-x-auto py-3 text-sm md:flex">
                <span className="inline-flex items-center gap-2 font-medium text-[#111827]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                  {theme.direction === "rtl" ? "الكل" : "All"}
                </span>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`whitespace-nowrap transition-colors ${
                      isActive(link.to)
                        ? "font-medium text-[#111827]"
                        : "font-light text-[#6b7280] hover:text-[#111827]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {mobileMenuOpen ? (
                <div className="space-y-1 border-t border-[#edf1f4] bg-white py-3 md:hidden">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block rounded-2xl px-3 py-2.5 text-sm transition-colors ${
                        isActive(link.to)
                          ? "bg-[#111827] text-white"
                          : "text-[#374151] hover:bg-[#f3f4f6]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {searchOpen && (
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="container max-w-2xl pt-20 px-4">
              <div className="relative group" dir={theme.direction}>
                <svg
                  className={`absolute ${theme.direction === "rtl" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors`}
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder={
                    theme.direction === "rtl"
                      ? "ابحث عن المنتجات..."
                      : "Search products..."
                  }
                  className={`w-full h-14 ${theme.direction === "rtl" ? "pe-12 ps-12" : "ps-12 pe-12"} bg-card border-2 border-border focus:border-primary rounded-xl text-lg outline-none transition-all shadow-xl`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && closeSearchOverlay()}
                />
                <button
                  onClick={closeSearchOverlay}
                  className={`absolute ${theme.direction === "rtl" ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {query.length > 2 && (
                <div className="mt-4 p-4 bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
                  <p className="text-sm text-muted-foreground mb-4 font-medium text-start">
                    {theme.direction === "rtl"
                      ? `النتائج لـ "${query}"`
                      : `Results for "${query}"`}
                  </p>
                  <SearchResults
                    results={results}
                    isLoading={isLoading}
                    close={closeSearchOverlay}
                  />
                  <Link
                    to={moreResultsPath}
                    onClick={closeSearchOverlay}
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/25 hover:text-primary"
                  >
                    {theme.direction === "rtl"
                      ? "عرض مزيد من النتائج"
                      : "More results"}
                  </Link>
                </div>
              )}

              <button
                className="mt-6 mx-auto block text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={closeSearchOverlay}
              >
                {theme.direction === "rtl" ? (
                  <span>
                    اضغط{" "}
                    <kbd className="font-sans px-1.5 py-0.5 rounded border border-border bg-muted">
                      ESC
                    </kbd>{" "}
                    للإغلاق
                  </span>
                ) : (
                  <span>
                    Press{" "}
                    <kbd className="font-sans px-1.5 py-0.5 rounded border border-border bg-muted">
                      ESC
                    </kbd>{" "}
                    to close
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (isDigitalCommandHeader && !isMinimal) {
    return (
      <>
        <header
          dir={theme.direction}
          className="sticky top-0 z-50 w-full border-b border-[#dfe6ef] bg-[rgba(255,255,255,0.96)] shadow-[0_18px_48px_-34px_rgba(15,23,42,0.18)] backdrop-blur-xl"
        >
          <div className="border-b border-[#edf1f6] bg-[linear-gradient(180deg,#fbfcfe_0%,#f7f9fc_100%)]">
            <div className="container hidden h-10 items-center justify-between gap-4 overflow-hidden px-4 md:flex md:px-6">
              <span className="inline-flex items-center gap-2 border border-[#dce3ec] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#516170]">
                <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
                Digital Desk
              </span>
              <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.22em] text-[#607184]">
                {digitalCommandRail.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 ? <span className="opacity-30">/</span> : null}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="container px-4 md:px-6">
            <div className="hidden items-center gap-6 py-4 md:grid md:grid-cols-[auto_minmax(18rem,1fr)_auto]">
              <StorefrontHomeLink
                {...brandHomeLinkProps}
                className="flex items-center gap-3"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#dce3ec] bg-[linear-gradient(180deg,#161c26_0%,#253246_100%)] text-[11px] font-black uppercase tracking-[0.22em] text-[#f8fafc] shadow-[0_18px_40px_-28px_rgba(15,23,42,0.34)]">
                  SD
                </span>
                <span className="flex flex-col text-start leading-none">
                  <span className="font-heading text-[1.22rem] font-black tracking-[0.04em] text-[#161c26]">
                    {displayStoreName}
                  </span>
                  <span className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-[#8a97a7]">
                    أجهزة وملحقات
                  </span>
                </span>
              </StorefrontHomeLink>

              {showSearch ? (
                <form
                  onSubmit={handlePcHubSearchSubmit}
                  className="flex items-center overflow-hidden rounded-full border border-[#dce3ec] bg-[#f8fafc] shadow-[0_12px_28px_-24px_rgba(15,23,42,0.14)]"
                >
                  <button
                    type="button"
                    className="px-5 py-3 text-sm font-bold text-[#516170] transition-colors hover:text-[#161c26]"
                  >
                    {theme.direction === "rtl" ? "كل الأقسام" : "All sections"}
                  </button>
                  <div className="h-5 w-px bg-[#dce3ec]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      theme.direction === "rtl"
                        ? "ابحث عن Laptop أو Keyboard أو Hub..."
                        : "Search laptop, keyboard, or hub..."
                    }
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-[#161c26] outline-none placeholder:text-[#8a97a7]"
                  />
                  <button
                    type="submit"
                    className="flex h-12 w-14 items-center justify-center bg-[#161c26] text-white transition-colors hover:bg-[#0f141c]"
                    aria-label={theme.direction === "rtl" ? "بحث" : "Search"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>
                </form>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <div className="hidden rounded-[1rem] border border-[#dce3ec] bg-white px-4 py-2.5 text-start shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)] lg:block">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a97a7]">
                    {theme.direction === "rtl" ? "الدعم" : "Support"}
                  </p>
                  <p className="mt-1 text-sm font-black text-[#161c26]">
                    {theme.direction === "rtl"
                      ? "رد أسرع قبل الشراء"
                      : "Fast pre-purchase help"}
                  </p>
                </div>
                {showCart ? (
                  <button
                    onClick={() => setIsOpen(true)}
                    className="relative inline-flex items-center gap-2 rounded-full border border-[#dce3ec] bg-white px-4 py-2.5 text-sm font-black text-[#161c26] shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)] transition-colors hover:border-[#f59e0b] hover:text-[#b45309]"
                    aria-label={
                      theme.direction === "rtl"
                        ? `سلة التسوق (${totalItems} منتجات)`
                        : `Shopping cart (${totalItems} items)`
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                    <span>{theme.direction === "rtl" ? "السلة" : "Cart"}</span>
                    {totalItems > 0 ? (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#161c26] px-1.5 text-[10px] font-black text-white">
                        {totalItems}
                      </span>
                    ) : null}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between py-3 md:hidden">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-full p-2 text-[#161c26] transition-colors hover:bg-[#f3f6fa]"
                  onClick={() => setMobileMenuOpen((value) => !value)}
                  aria-label={
                    theme.direction === "rtl"
                      ? mobileMenuOpen
                        ? "إغلاق القائمة"
                        : "فتح القائمة"
                      : mobileMenuOpen
                        ? "Close menu"
                        : "Open menu"
                  }
                >
                  {mobileMenuOpen ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="4" x2="20" y1="12" y2="12" />
                      <line x1="4" x2="20" y1="6" y2="6" />
                      <line x1="4" x2="20" y1="18" y2="18" />
                    </svg>
                  )}
                </button>
                <StorefrontHomeLink
                  {...brandHomeLinkProps}
                  className="flex items-center gap-2"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-[0.9rem] bg-[#161c26] text-[10px] font-black uppercase tracking-[0.18em] text-white">
                    SD
                  </span>
                  <span className="font-heading text-lg font-black text-[#161c26]">
                    {displayStoreName}
                  </span>
                </StorefrontHomeLink>
              </div>
              <div className="flex items-center gap-1">
                {showSearch ? (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="rounded-full p-2 text-[#161c26] transition-colors hover:bg-[#f3f6fa]"
                    aria-label={theme.direction === "rtl" ? "بحث" : "Search"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>
                ) : null}
                {showCart ? (
                  <button
                    onClick={() => setIsOpen(true)}
                    className="relative rounded-full p-2 text-[#161c26] transition-colors hover:bg-[#f3f6fa]"
                    aria-label={
                      theme.direction === "rtl"
                        ? `سلة التسوق (${totalItems} منتجات)`
                        : `Shopping cart (${totalItems} items)`
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                    {totalItems > 0 ? (
                      <span className="absolute -end-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#161c26] text-[10px] font-black text-white">
                        {totalItems}
                      </span>
                    ) : null}
                  </button>
                ) : null}
              </div>
            </div>

            {showDigitalCommandMobileSearch ? (
              <div className="pb-3 md:hidden">
                <form
                  onSubmit={handlePcHubSearchSubmit}
                  className="flex items-center overflow-hidden rounded-full border border-[#dce3ec] bg-[#f8fafc] shadow-[0_10px_24px_-22px_rgba(15,23,42,0.14)]"
                >
                  <button
                    type="button"
                    className="px-3.5 py-2.5 text-[12px] font-bold text-[#607184] transition-colors hover:text-[#161c26]"
                  >
                    {theme.direction === "rtl" ? "الكل" : "All"}
                  </button>
                  <div className="h-4 w-px bg-[#dce3ec]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      theme.direction === "rtl"
                        ? "ابحث عن Laptop أو Mouse أو Hub..."
                        : "Search laptop, mouse, or hub..."
                    }
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#161c26] outline-none placeholder:text-[#8a97a7]"
                  />
                  <button
                    type="submit"
                    className="flex h-10 w-11 items-center justify-center rounded-full bg-[#161c26] text-white transition-colors hover:bg-[#0f141c]"
                    aria-label={theme.direction === "rtl" ? "بحث" : "Search"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>
                </form>
              </div>
            ) : null}
          </div>

          <div className="border-t border-[#edf1f6] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
            <div className="container px-4 md:px-6">
              <div className="hidden items-center gap-5 overflow-x-auto py-3 text-sm md:flex">
                <span className="inline-flex items-center gap-2 font-black text-[#161c26]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                  {theme.direction === "rtl"
                    ? "تسوق حسب الفئة"
                    : "Shop by category"}
                </span>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`whitespace-nowrap rounded-full px-4 py-2 transition-colors ${
                      isActive(link.to)
                        ? "border border-[#dce3ec] bg-white font-black text-[#161c26] shadow-[0_14px_30px_-24px_rgba(15,23,42,0.12)]"
                        : "font-bold text-[#607184] hover:bg-white hover:text-[#161c26]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {mobileMenuOpen ? (
                <div className="space-y-1 border-t border-[#edf1f6] bg-white py-3 md:hidden">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block rounded-2xl px-3 py-2.5 text-sm transition-colors ${
                        isActive(link.to)
                          ? "bg-[#161c26] text-white"
                          : "text-[#374151] hover:bg-[#f3f6fa]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {searchOpen && (
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="container max-w-2xl px-4 pt-20">
              <div className="relative group" dir={theme.direction}>
                <svg
                  className={`absolute ${theme.direction === "rtl" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors`}
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder={
                    theme.direction === "rtl"
                      ? "ابحث عن المنتجات..."
                      : "Search products..."
                  }
                  className={`w-full h-14 ${theme.direction === "rtl" ? "pe-12 ps-12" : "ps-12 pe-12"} bg-card border-2 border-border focus:border-primary rounded-xl text-lg outline-none transition-all shadow-xl`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && closeSearchOverlay()}
                />
                <button
                  onClick={closeSearchOverlay}
                  className={`absolute ${theme.direction === "rtl" ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {query.length > 2 && (
                <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-2xl animate-in zoom-in-95 duration-200">
                  <p className="mb-4 text-start text-sm font-medium text-muted-foreground">
                    {theme.direction === "rtl"
                      ? `النتائج لـ "${query}"`
                      : `Results for "${query}"`}
                  </p>
                  <SearchResults
                    results={results}
                    isLoading={isLoading}
                    close={closeSearchOverlay}
                  />
                  <Link
                    to={moreResultsPath}
                    onClick={closeSearchOverlay}
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/25 hover:text-primary"
                  >
                    {theme.direction === "rtl"
                      ? "عرض مزيد من النتائج"
                      : "More results"}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  if (isVelaFashionHeader && !isMinimal) {
    return (
      <header
        dir={theme.direction}
        className="sticky top-0 z-50 w-full border-b border-[#ebe4dd] bg-white/98 shadow-[0_16px_40px_-36px_rgba(18,18,18,0.18)] backdrop-blur"
      >
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-4 md:py-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#171717] transition-colors hover:bg-[#f5f1ed] md:hidden"
                aria-label={
                  mobileMenuOpen ? "Close menu" : "Open menu"
                }
              >
                {mobileMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                )}
              </button>

              {showSearch && !isVelaInnerPath ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen((value) => !value);
                    setMobileMenuOpen(false);
                  }}
                  className="hidden text-sm font-medium text-[#171717] transition-colors hover:text-[#0abb45] md:inline-flex"
                >
                  Search
                </button>
              ) : null}
            </div>

            <StorefrontHomeLink
              {...brandHomeLinkProps}
              className="flex justify-center"
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(false);
              }}
            >
              {displayLogoUrl ? (
                <img
                  src={displayLogoUrl}
                  alt={displayStoreName}
                  className="h-8 w-auto object-contain md:h-10"
                />
              ) : (
                <span className="font-heading text-lg font-semibold lowercase tracking-[-0.04em] text-[#171717] md:text-xl">
                  {displayStoreName}
                </span>
              )}
            </StorefrontHomeLink>

            <div className="flex items-center justify-end gap-1.5">
              {showSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen((value) => !value);
                    setMobileMenuOpen(false);
                  }}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[#171717] transition-colors hover:bg-[#f5f1ed] ${
                    isVelaInnerPath ? "md:inline-flex" : "md:hidden"
                  }`}
                  aria-label="Search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              ) : null}

              {showCart ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#171717] transition-colors hover:bg-[#f5f1ed]"
                  aria-label="items in cart, view bag"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                  {totalItems > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#171717] px-1 text-[10px] font-bold text-white">
                      {totalItems}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>
          </div>

          <div className="hidden border-t border-[#f1ece7] md:block">
            <nav className="flex items-center justify-center gap-5 py-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`font-heading text-[14px] font-semibold normal-case tracking-normal transition-colors ${
                    isActive(link.to)
                      ? 'text-[#171717]'
                      : 'text-[#4f4f4f] hover:text-[#171717]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-[#f1ece7] bg-white md:hidden">
            <div className="container grid gap-2 px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={`${link.to}-mobile`}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-[0.9rem] px-3 py-3 text-sm font-medium text-[#171717] transition-colors hover:bg-[#f7f3ef]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {searchOpen ? (
          <div className="border-t border-[#f1ece7] bg-white">
            <div className="container px-4 py-4 md:px-6">
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex items-center gap-3 rounded-full border border-[#e7dfd7] bg-[#fcfaf8] px-4 py-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7b7b7b]">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search products"
                    className="w-full bg-transparent text-sm text-[#171717] outline-none placeholder:text-[#9a9a9a]"
                  />
                  <button
                    type="button"
                    onClick={closeSearchOverlay}
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b7b7b] transition-colors hover:text-[#171717]"
                  >
                    Close
                  </button>
                </div>

                {query.length > 2 ? (
                  <div className="rounded-[1.1rem] border border-[#ece4dd] bg-white p-4 shadow-[0_20px_46px_-38px_rgba(18,18,18,0.2)]">
                    <SearchResults
                      results={results}
                      isLoading={isLoading}
                      close={closeSearchOverlay}
                    />
                    <Link
                      to={moreResultsPath}
                      onClick={closeSearchOverlay}
                      className="mt-4 inline-flex items-center justify-center rounded-full border border-[#e6ddd5] px-4 py-2 text-sm font-medium text-[#171717] transition-colors hover:border-[#171717]"
                    >
                      More results
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-[#6c6c6c]">
                    Type at least 3 characters to start searching.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <>
      <header
        dir={theme.direction}
        className={`z-50 w-full ${
          isFloatingDarkHeader
            ? "absolute inset-x-0 top-0 bg-transparent"
            : isCutlineClub
              ? "sticky top-0 border-b border-[#2d3329] bg-[#111510]/95 text-[#f8f1e3] shadow-[0_26px_70px_-42px_rgba(0,0,0,0.76)] backdrop-blur-xl"
              : isBiteRush
                ? "sticky top-0 border-b-4 border-[#ff6b2c] bg-white/95 shadow-[0_22px_60px_-34px_rgba(17,17,17,0.55)] backdrop-blur"
                : isVelaFashionHeader
                  ? "sticky top-0 border-b border-[#ebdfd6] bg-white/96 shadow-[0_14px_40px_-36px_rgba(18,18,18,0.16)] backdrop-blur"
                  : isEditorialSoftHeader
                    ? "sticky top-0 border-b border-[#ead8e0] bg-[linear-gradient(180deg,rgba(255,251,252,0.97),rgba(252,244,247,0.94))] shadow-[0_18px_56px_-40px_rgba(104,49,73,0.2)] backdrop-blur"
                    : isUtilityFrameHeader
                      ? "sticky top-0 border-b border-[#d8ccc0] bg-[linear-gradient(180deg,rgba(249,244,238,0.98),rgba(245,237,229,0.95))] shadow-[0_18px_56px_-42px_rgba(31,38,43,0.24)] backdrop-blur"
                      : isRetailDirectHeader
                        ? "sticky top-0 border-b border-[#eadfce] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(252,247,240,0.96))] shadow-[0_18px_52px_-42px_rgba(18,18,18,0.18)] backdrop-blur"
                        : "sticky top-0 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        } ${
          isSoleaFemme
            ? "border-primary/10 bg-[linear-gradient(180deg,hsl(var(--background)/0.97),hsl(var(--secondary)/0.86))] shadow-[0_12px_40px_-30px_hsl(var(--primary)/0.55)]"
            : theme.id === "intruder-nft"
              ? "border-b border-primary/20 bg-background/80"
              : isFloatingDarkHeader
                ? "border-none bg-transparent shadow-none"
                : isCutlineClub ||
                    isVelaFashionHeader ||
                    isEditorialSoftHeader ||
                    isUtilityFrameHeader ||
                    isRetailDirectHeader
                  ? ""
                  : "bg-background/95"
        }`}
      >
        {/* Top Promo Bar (Specific to Zen Organic / Reference Image) */}
        {theme.id === "zen-organic" && (
          <div className="hidden md:flex items-center justify-between px-6 py-2.5 bg-[#1b4332] text-white text-[11px] font-medium tracking-wide">
            <div className="flex items-center gap-2">
              <span>
                {theme.direction === "rtl"
                  ? "اتصل بنا : +123-456-789"
                  : "Call Us : +123-456-789"}
              </span>
            </div>
            <div className="flex items-center gap-1 font-semibold opacity-90">
              <span>
                {theme.direction === "rtl"
                  ? "اشترك الآن واحصل على خصم 20٪ على طلبك الأول."
                  : "Sign up and GET 20% OFF for your first order."}
              </span>
              <Link
                to="/auth/register"
                className="text-lime-400 hover:text-white transition-colors underline underline-offset-2"
              >
                {theme.direction === "rtl" ? "سجل الآن" : "Sign up now"}
              </Link>
            </div>
            <div className="flex items-center gap-3 opacity-90">
              <a
                href="#"
                aria-label="Facebook"
                className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white hover:text-[#1b4332] transition-colors text-[10px]"
              >
                f
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white hover:text-[#1b4332] transition-colors text-[10px]"
              >
                x
              </a>
              <a
                href="#"
                aria-label="Pinterest"
                className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white hover:text-[#1b4332] transition-colors text-[10px]"
              >
                P
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white hover:text-[#1b4332] transition-colors text-[10px]"
              >
                in
              </a>
            </div>
          </div>
        )}

        {isCutlineClub && (
          <div className="border-b border-[#d9eb67]/18 bg-[#d9eb67] text-[#111510]">
            <div className="container hidden h-10 items-center justify-between gap-4 overflow-hidden px-4 md:flex md:px-6">
              <span className="inline-flex rounded-full bg-[#111510] px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#d9eb67]">
                Poster Mode
              </span>
              <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.26em]">
                {cutlineClubRailItems.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 ? <span className="opacity-35">/</span> : null}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {isClosetOs && (
          <div className="border-b border-[#d7cdbd] bg-[#eef3ed] text-[#22312d]">
            <div className="container hidden h-10 items-center justify-between gap-4 overflow-hidden px-4 md:flex md:px-6">
              <span className="inline-flex rounded-full bg-[#22312d] px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#fff8ee]">
                Closet Map
              </span>
              <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.26em]">
                {closetOsRailItems.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 ? <span className="opacity-35">/</span> : null}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {isEditorialSoftHeader && !isMinimal && (
          <div className="border-b border-[#efdee5] bg-[linear-gradient(180deg,rgba(255,252,252,0.92),rgba(253,244,247,0.88))] text-[#7b4f5f]">
            <div className="container hidden h-10 items-center justify-between gap-4 overflow-hidden px-4 md:flex md:px-6">
              <span className="inline-flex rounded-full border border-[#e8d3dc] bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#8f5168]">
                Style Edit
              </span>
              <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.22em]">
                {editorialHeaderRail.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 ? <span className="opacity-35">/</span> : null}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {isUtilityFrameHeader && !isMinimal && (
          <div className="border-b border-[#d9cec2] bg-[#f1e8de] text-[#4b3b30]">
            <div className="container hidden h-10 items-center justify-between gap-4 overflow-hidden px-4 md:flex md:px-6">
              <span className="inline-flex rounded-[0.8rem] border border-[#d4c5b7] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#1f262b]">
                {headerRailLabel || "Utility Rail"}
              </span>
              <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.22em]">
                {utilityHeaderRail.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 ? <span className="opacity-35">/</span> : null}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {isRetailDirectHeader &&
          !isMinimal &&
          theme.header?.announcementText && (
            <div className="border-b border-[#eadfce] bg-[#171717] text-[#fff7ed]">
              <div className="container flex h-10 items-center justify-between gap-4 overflow-hidden px-4 text-[11px] font-semibold md:px-6">
                <span className="truncate">
                  {theme.header.announcementText}
                </span>
                <div className="hidden items-center gap-3 whitespace-nowrap md:flex">
                  {retailDirectRail.map((item, index) => (
                    <React.Fragment key={item}>
                      {index > 0 ? <span className="opacity-35">/</span> : null}
                      <span>{item}</span>
                    </React.Fragment>
                  ))}
                  {theme.header?.announcementLinkText &&
                  theme.header?.announcementLinkTo ? (
                    <Link
                      to={buildStorefrontPath(
                        location.pathname,
                        theme.header.announcementLinkTo,
                        location.search,
                      )}
                      className="rounded-full bg-[#f97316] px-3 py-1 text-[10px] font-black text-white transition-colors hover:bg-[#ea580c]"
                    >
                      {theme.header.announcementLinkText}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          )}

        <div
          className={`container flex items-center justify-between px-4 md:px-6 ${
            isFloatingDarkHeader
              ? "h-24 border-b border-white/10"
              : isCutlineClub
                ? "h-24 border-b border-[#262c22]"
                : isBiteRush
                  ? "h-24"
                  : isVelaFashionHeader
                    ? "h-16"
                    : isEditorialSoftHeader
                      ? "h-24 border-b border-[#f0dde6]"
                      : isUtilityFrameHeader
                        ? "h-20 border-b border-[#ddd0c2]"
                        : isRetailDirectHeader
                          ? "h-20 border-b border-[#efe4d5]"
                          : "h-20 border-b border-border/50"
          }`}
        >
          {/* Left: Logo + Nav */}
          <div
            className={`flex items-center ${
              isKhemetFloatingDarkHeader
                ? "gap-6 lg:gap-7 xl:gap-10"
                : isFloatingDarkHeader
                  ? "gap-10"
                  : "gap-8"
            }`}
          >
            {/* Mobile menu toggle */}
            <button
              className={`md:hidden rounded-[var(--radius)] p-2 -ms-2 transition-colors ${
                isBiteRush
                  ? "text-[#171717] hover:bg-[#fff1ea]"
                  : isVelaFashionHeader
                    ? "text-[#171717] hover:bg-[#fff4ef]"
                    : isCutlineClub
                      ? "text-[#f8f1e3] hover:bg-white/[0.05] hover:text-[#d9eb67]"
                      : isFloatingDarkHeader
                        ? "text-white hover:bg-white/10"
                        : "hover:bg-muted"
              }`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={
                theme.direction === "rtl"
                  ? mobileMenuOpen
                    ? "إغلاق القائمة"
                    : "فتح القائمة"
                  : mobileMenuOpen
                    ? "Close menu"
                    : "Open menu"
              }
            >
              {mobileMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              )}
            </button>

            {/* Logo */}
            <StorefrontHomeLink
              {...brandHomeLinkProps}
              className="flex items-center gap-2"
            >
              {displayLogoUrl ? (
                <img
                  src={displayLogoUrl}
                  alt={displayStoreName}
                  className="h-8 w-auto object-contain"
                />
              ) : isVelaFashionHeader ? (
                <span className="font-heading text-[1.12rem] font-black lowercase tracking-[-0.04em] text-[#171717] sm:text-[1.28rem]">
                  vela-fashion
                </span>
              ) : isCutlineClub ? (
                <>
                  <span className="grid h-11 w-11 place-items-center rounded-[1rem] border border-[#d9eb67]/45 bg-[#171b14] text-[11px] font-black uppercase tracking-[0.22em] text-[#d9eb67] shadow-[0_18px_44px_-28px_rgba(0,0,0,0.72)]">
                    05
                  </span>
                  <span className="flex flex-col text-start leading-none">
                    <span className="font-heading text-[1.12rem] font-black tracking-[0.04em] text-[#f8f1e3] sm:text-[1.25rem]">
                      {displayStoreName}
                    </span>
                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.32em] text-[#d9eb67]">
                      أحدث الموديلات
                    </span>
                  </span>
                </>
              ) : isClosetOs ? (
                <>
                  <span className="grid h-11 w-11 place-items-center rounded-[1rem] border border-[#d7cdbd] bg-[#eef3ed] text-[11px] font-black uppercase tracking-[0.22em] text-[#22312d] shadow-[0_18px_44px_-28px_rgba(34,49,45,0.18)]">
                    W1
                  </span>
                  <span className="flex flex-col text-start leading-none">
                    <span className="font-heading text-[1.12rem] font-black tracking-[0.04em] text-foreground sm:text-[1.25rem]">
                      {displayStoreName}
                    </span>
                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.32em] text-[#52685e]">
                      اختيارات الأسبوع
                    </span>
                  </span>
                </>
              ) : isBiteRush ? (
                <>
                  <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-[#dc2626] text-xl font-black italic text-white shadow-[0_18px_40px_-20px_rgba(220,38,38,0.9)]">
                    B
                  </span>
                  <span className="flex flex-col text-start leading-none">
                    <span className="font-heading text-[1.4rem] font-black italic text-[#171717]">
                      {displayStoreName}
                    </span>
                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.34em] text-[#ff6b2c]">
                      طلب سريع وساخن
                    </span>
                  </span>
                </>
              ) : (
                <span
                  className={`inline-flex items-center gap-2 font-heading tracking-tight ${
                    isEditorialSoftHeader
                      ? "flex-col items-start rounded-[1.2rem] border border-[#ecd8e1] bg-white/88 px-4 py-2 text-[#5c263b] shadow-[0_20px_52px_-38px_rgba(92,38,59,0.22)]"
                      : isUtilityFrameHeader
                        ? "rounded-[0.95rem] border border-[#d8ccc0] bg-white px-3.5 py-2 text-[#1f262b] shadow-[0_18px_42px_-34px_rgba(31,38,43,0.18)]"
                        : isVelaFashionHeader
                          ? "text-[1.12rem] font-black lowercase tracking-[-0.04em] text-[#171717] sm:text-[1.26rem]"
                          : isFashionRetailHeader
                            ? "text-[1.15rem] font-semibold text-[#2c2426] sm:text-[1.3rem]"
                            : isRetailDirectHeader
                              ? "flex-col items-start rounded-[1rem] border border-[#151515] bg-white px-4 py-2 text-[#171717] shadow-[0_20px_48px_-36px_rgba(18,18,18,0.16)]"
                              : isSoleaFemme
                                ? "rounded-full border border-primary/10 bg-background/80 px-3 py-1.5 text-lg font-black shadow-sm"
                                : isIntruderNft
                                  ? "rounded-full border border-primary/20 bg-background/75 px-3.5 py-1.5 text-lg font-black uppercase tracking-[0.28em] text-foreground shadow-[0_0_24px_hsl(var(--primary)/0.18)]"
                                  : isFloatingDarkHeader
                                    ? "text-base font-black tracking-[0.02em] text-white sm:text-lg"
                                    : "text-xl font-bold text-foreground"
                  }`}
                >
                  {displayStoreName}
                  {isEditorialSoftHeader ? (
                    <span className="font-sans text-[10px] font-black uppercase tracking-[0.24em] text-[#a05170]">
                      خصومات نسائية
                    </span>
                  ) : null}
                  {isUtilityFrameHeader ? (
                    <span className="font-sans text-[10px] font-black uppercase tracking-[0.24em] text-[#f57a1d]">
                      {headerTagline || "كوتشيات رجالي"}
                    </span>
                  ) : null}
                  {isVelaFashionHeader ? (
                    <span className="font-sans text-[10px] font-bold uppercase tracking-[0.26em] text-[#d77a82]">
                      fashion store
                    </span>
                  ) : null}
                  {isFashionRetailHeader ? (
                    <span className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#d05d4b]">
                      {isAtelierNova
                        ? "Atelier edit"
                        : isElegantLuxe
                          ? "صالون تحريري"
                          : "Everyday fashion"}
                    </span>
                  ) : null}
                  {isRetailDirectHeader ? (
                    <span className="font-sans text-[10px] font-black uppercase tracking-[0.24em] text-[#c15d12]">
                      طلب مباشر
                    </span>
                  ) : null}
                </span>
              )}
            </StorefrontHomeLink>

            {/* Desktop Nav */}
            {!isMinimal && (
              <nav
                className={`hidden md:flex items-center whitespace-nowrap ${
                  isKhemetFloatingDarkHeader ? "gap-0.5 lg:gap-1" : "gap-1"
                } ${isVelaFashionHeader ? "opacity-0 pointer-events-none w-0 overflow-hidden" : ""}`}
              >
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`rounded-[var(--radius)] font-medium transition-colors ${
                      isKhemetFloatingDarkHeader
                        ? "shrink-0 px-2.5 py-2 text-[13px] tracking-[0.01em] lg:px-3 lg:text-sm"
                        : "px-3 py-2 text-sm"
                    } ${
                      isActive(link.to)
                        ? isCutlineClub
                          ? "rounded-full border border-[#d9eb67]/60 bg-[#d9eb67] text-[#111510] shadow-[0_18px_48px_-30px_rgba(217,235,103,0.55)]"
                          : isBiteRush
                            ? "rounded-full bg-[#fff1ea] text-[#dc2626]"
                            : isEditorialSoftHeader
                              ? "rounded-full border border-[#ebd5de] bg-white text-[#8f5168] shadow-[0_18px_46px_-34px_rgba(104,49,73,0.2)]"
                              : isUtilityFrameHeader
                                ? "rounded-[0.9rem] border border-[#d8ccc0] bg-[#1f262b] text-white shadow-[0_18px_46px_-34px_rgba(31,38,43,0.28)]"
                                : isVelaFashionHeader
                                  ? "rounded-full bg-[#171717] text-white shadow-[0_18px_40px_-30px_rgba(23,23,23,0.18)]"
                                  : isFashionRetailHeader
                                    ? "rounded-full bg-[#2c2426] text-white shadow-[0_18px_40px_-30px_rgba(44,36,38,0.34)]"
                                    : isSoleaFemme
                                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15"
                                      : isIntruderNft
                                        ? "border border-primary/25 bg-primary/10 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.16)]"
                                        : isFloatingDarkHeader
                                          ? "text-white"
                                          : "bg-primary/10 text-primary"
                        : isCutlineClub
                          ? "rounded-full border border-transparent text-[#f8f1e3]/72 hover:border-[#2f342a] hover:bg-white/[0.03] hover:text-[#f8f1e3]"
                          : isBiteRush
                            ? "rounded-full text-[#171717] hover:bg-[#fff1ea] hover:text-[#dc2626]"
                            : isEditorialSoftHeader
                              ? "rounded-full text-[#7b5a67] hover:bg-white/85 hover:text-[#5c263b]"
                              : isUtilityFrameHeader
                                ? "rounded-[0.9rem] text-[#54473c] hover:bg-white hover:text-[#1f262b]"
                                : isVelaFashionHeader
                                  ? "rounded-full text-[#7e666d] hover:bg-[#fff4ef] hover:text-[#171717]"
                                  : isFashionRetailHeader
                                    ? "rounded-full text-[#6b5a5f] hover:bg-[#fff1ea] hover:text-[#2c2426]"
                                    : isSoleaFemme
                                      ? "text-muted-foreground hover:bg-background hover:text-foreground"
                                      : isIntruderNft
                                        ? "border border-transparent text-muted-foreground hover:border-primary/15 hover:bg-muted/50 hover:text-foreground"
                                        : isFloatingDarkHeader
                                          ? "text-white/70 hover:bg-white/8 hover:text-white"
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Right: Search + Cart */}
          <div className="flex items-center gap-2">
            {!isMinimal && headerActions.length > 0 && (
              <div className="hidden md:flex items-center gap-2">
                {headerActions.map((action) => (
                  <Link
                    key={`${action.label}-${action.href}`}
                    to={action.href}
                    className={
                      action.style === "primary"
                        ? isCutlineClub
                          ? "inline-flex items-center justify-center rounded-full bg-[#d9eb67] px-5 py-2.5 text-sm font-black text-[#111510] shadow-[0_20px_50px_-28px_rgba(217,235,103,0.62)] transition-all hover:-translate-y-0.5 hover:brightness-105"
                          : isBiteRush
                            ? "inline-flex items-center justify-center rounded-full bg-[#171717] px-5 py-2.5 text-sm font-black text-white shadow-[0_18px_48px_-24px_rgba(23,23,23,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#dc2626]"
                            : isFloatingDarkHeader
                              ? "inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-[#0b1670] shadow-[0_24px_70px_-40px_rgba(255,255,255,0.95)] transition-transform hover:-translate-y-0.5"
                              : "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
                        : action.style === "outline"
                          ? isCutlineClub
                            ? "inline-flex items-center justify-center rounded-full border border-[#2f342a] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-[#f8f1e3] transition-colors hover:border-[#d9eb67] hover:text-[#d9eb67]"
                            : isBiteRush
                              ? "inline-flex items-center justify-center rounded-full border border-[#171717]/10 bg-white px-5 py-2.5 text-sm font-semibold text-[#171717] transition-colors hover:border-[#ff6b2c] hover:text-[#dc2626]"
                              : isFloatingDarkHeader
                                ? "inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/88 backdrop-blur transition-colors hover:bg-white/10"
                                : "inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                          : isCutlineClub
                            ? "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[#f8f1e3] transition-colors hover:text-[#d9eb67]"
                            : isBiteRush
                              ? "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[#171717] transition-colors hover:text-[#dc2626]"
                              : isFloatingDarkHeader
                                ? "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:text-white"
                                : "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                    }
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            )}
            {!isMinimal ? (
              <>
                {/* Search */}
                {!isIntruderNft && showSearch && (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className={`rounded-full p-2 transition-colors ${
                      isBiteRush
                        ? "text-[#171717] hover:bg-[#fff1ea] hover:text-[#dc2626]"
                        : isCutlineClub
                          ? "text-[#f8f1e3]/78 hover:bg-white/[0.05] hover:text-[#d9eb67]"
                          : isEditorialSoftHeader
                            ? "text-[#7b5a67] hover:bg-white/80 hover:text-[#5c263b]"
                            : isUtilityFrameHeader
                              ? "text-[#54473c] hover:bg-white hover:text-[#1f262b]"
                              : isVelaFashionHeader
                                ? "text-[#6c575e] hover:bg-[#fff4ef] hover:text-[#171717]"
                                : isFashionRetailHeader
                                  ? "text-[#7b6b70] hover:bg-[#fff1ea] hover:text-[#2c2426]"
                                  : isSoleaFemme
                                    ? "text-muted-foreground hover:bg-background hover:text-foreground"
                                    : isFloatingDarkHeader
                                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-label={
                      theme.direction === "rtl" ? "بحث" : "Search products"
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>
                )}

                {/* Cart or Auth */}
                {!isIntruderNft && showCart && (
                  <button
                    onClick={() => setIsOpen(true)}
                    className={`relative rounded-full p-2 transition-colors ${
                      isBiteRush
                        ? "text-[#171717] hover:bg-[#fff1ea] hover:text-[#dc2626]"
                        : isCutlineClub
                          ? "text-[#f8f1e3]/78 hover:bg-white/[0.05] hover:text-[#d9eb67]"
                          : isEditorialSoftHeader
                            ? "text-[#7b5a67] hover:bg-white/80 hover:text-[#5c263b]"
                            : isUtilityFrameHeader
                              ? "text-[#54473c] hover:bg-white hover:text-[#1f262b]"
                              : isVelaFashionHeader
                                ? "text-[#6c575e] hover:bg-[#fff4ef] hover:text-[#171717]"
                                : isFashionRetailHeader
                                  ? "text-[#7b6b70] hover:bg-[#fff1ea] hover:text-[#2c2426]"
                                  : isSoleaFemme
                                    ? "text-muted-foreground hover:bg-background hover:text-foreground"
                                    : isFloatingDarkHeader
                                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-label={
                      theme.direction === "rtl"
                        ? `سلة التسوق (${totalItems} منتجات)`
                        : `Shopping cart (${totalItems} items)`
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                    {totalItems > 0 && (
                      <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                        {totalItems}
                      </span>
                    )}
                  </button>
                )}
              </>
            ) : (
              <>
                {showCart && isCheckoutPath && !isIntruderNft ? (
                  <button
                    onClick={() => setIsOpen(true)}
                    className="relative rounded-full border border-primary/10 bg-secondary/50 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={
                      theme.direction === "rtl" ? "فتح السلة" : "Open cart"
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                    {totalItems > 0 && (
                      <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {totalItems}
                      </span>
                    )}
                  </button>
                ) : null}
                <div className="hidden md:flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 py-2 border border-primary/10 rounded-full bg-secondary/50">
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
                    className="text-primary"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {theme.direction === "rtl" ? "دفع آمن" : "Secure Checkout"}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div
            className={`animate-in slide-in-from-top-2 space-y-1 border-t px-4 py-3 md:hidden ${
              isBiteRush
                ? "border-[#ffd2bd] bg-white/98"
                : isCutlineClub
                  ? "border-[#2d3329] bg-[#111510]/98 text-[#f8f1e3]"
                  : isEditorialSoftHeader
                    ? "border-[#ecd8e1] bg-[linear-gradient(180deg,rgba(255,251,252,0.98),rgba(252,243,246,0.97))]"
                    : isUtilityFrameHeader
                      ? "border-[#d9cec2] bg-[linear-gradient(180deg,rgba(249,244,238,0.98),rgba(245,237,229,0.98))] text-[#1f262b]"
                      : isFashionRetailHeader
                        ? "border-[#f0ddd4] bg-[linear-gradient(180deg,rgba(255,252,250,0.98),rgba(255,245,240,0.97))] text-[#2c2426]"
                        : isRetailDirectHeader
                          ? "border-[#efe4d5] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(252,247,240,0.97))] text-[#171717]"
                          : isSoleaFemme
                            ? "border-primary/10 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.68))]"
                            : isFloatingDarkHeader
                              ? "border-white/10 bg-[#09113c]/95 backdrop-blur-xl"
                              : "border-border bg-background"
            }`}
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 text-sm font-medium rounded-[var(--radius)] transition-colors ${
                  isActive(link.to)
                    ? isCutlineClub
                      ? "rounded-full border border-[#d9eb67]/60 bg-[#d9eb67] text-[#111510]"
                      : isBiteRush
                        ? "rounded-full bg-[#fff1ea] text-[#dc2626]"
                        : isEditorialSoftHeader
                          ? "rounded-full bg-white text-[#8f5168]"
                          : isUtilityFrameHeader
                            ? "rounded-[0.9rem] bg-[#1f262b] text-white"
                            : isFashionRetailHeader
                              ? "rounded-full bg-[#2c2426] text-white"
                              : isSoleaFemme
                                ? "bg-primary text-primary-foreground"
                                : isFloatingDarkHeader
                                  ? "bg-white/10 text-white"
                                  : "bg-primary/10 text-primary"
                    : isCutlineClub
                      ? "rounded-full text-[#f8f1e3]/74 hover:bg-white/[0.04] hover:text-[#d9eb67]"
                      : isBiteRush
                        ? "rounded-full text-[#171717] hover:bg-[#fff1ea] hover:text-[#dc2626]"
                        : isEditorialSoftHeader
                          ? "rounded-full text-[#7b5a67] hover:bg-white/80 hover:text-[#5c263b]"
                          : isUtilityFrameHeader
                            ? "rounded-[0.9rem] text-[#54473c] hover:bg-white hover:text-[#1f262b]"
                            : isFashionRetailHeader
                              ? "rounded-full text-[#6b5a5f] hover:bg-white hover:text-[#2c2426]"
                              : isSoleaFemme
                                ? "text-muted-foreground hover:bg-background hover:text-foreground"
                                : isFloatingDarkHeader
                                  ? "text-white/72 hover:bg-white/8 hover:text-white"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {headerActions.map((action) => (
              <Link
                key={`mobile-${action.label}-${action.href}`}
                to={action.href}
                onClick={() => setMobileMenuOpen(false)}
                className={
                  action.style === "primary"
                    ? isCutlineClub
                      ? "mt-2 block rounded-full bg-[#d9eb67] px-4 py-3 text-center text-sm font-black text-[#111510]"
                      : isBiteRush
                        ? "mt-2 block rounded-full bg-[#171717] px-4 py-3 text-center text-sm font-black text-white"
                        : "mt-2 block rounded-full bg-white px-4 py-3 text-center text-sm font-black text-[#0b1670]"
                    : isCutlineClub
                      ? "block px-3 py-2.5 text-sm font-medium text-[#f8f1e3]"
                      : isBiteRush
                        ? "block px-3 py-2.5 text-sm font-medium text-[#171717]"
                        : "block px-3 py-2.5 text-sm font-medium text-white/80"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="container max-w-2xl pt-20 px-4">
            <div className="relative group" dir={theme.direction}>
              <svg
                className={`absolute ${theme.direction === "rtl" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors`}
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder={
                  theme.direction === "rtl"
                    ? "ابحث عن المنتجات..."
                    : "Search products..."
                }
                className={`w-full h-14 ${theme.direction === "rtl" ? "pe-12 ps-12" : "ps-12 pe-12"} bg-card border-2 border-border focus:border-primary rounded-xl text-lg outline-none transition-all shadow-xl`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeSearchOverlay()}
              />
              <button
                onClick={closeSearchOverlay}
                className={`absolute ${theme.direction === "rtl" ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {query.length > 2 && (
              <div className="mt-4 p-4 bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
                <p className="text-sm text-muted-foreground mb-4 font-medium text-start">
                  {theme.direction === "rtl"
                    ? `النتائج لـ "${query}"`
                    : `Results for "${query}"`}
                </p>
                <SearchResults
                  results={results}
                  isLoading={isLoading}
                  close={closeSearchOverlay}
                />
                <Link
                  to={moreResultsPath}
                  onClick={closeSearchOverlay}
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/25 hover:text-primary"
                >
                  {theme.direction === "rtl"
                    ? "\u0639\u0631\u0636 \u0645\u0632\u064A\u062F \u0645\u0646 \u0627\u0644\u0646\u062A\u0627\u0626\u062C"
                    : "More results"}
                </Link>
              </div>
            )}

            <button
              className="mt-6 mx-auto block text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={closeSearchOverlay}
            >
              {theme.direction === "rtl" ? (
                <span>
                  اضغط{" "}
                  <kbd className="font-sans px-1.5 py-0.5 rounded border border-border bg-muted">
                    ESC
                  </kbd>{" "}
                  للإغلاق
                </span>
              ) : (
                <span>
                  Press{" "}
                  <kbd className="font-sans px-1.5 py-0.5 rounded border border-border bg-muted">
                    ESC
                  </kbd>{" "}
                  to close
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const MemoStorefrontHeader = React.memo(StorefrontHeader);

/* ─────────────────── Footer ─────────────────── */
const StorefrontFooter: React.FC<{ isMinimal?: boolean }> = ({ isMinimal }) => {
  const { theme } = useStorefrontTheme();
  const { settings } = useStorefrontSettings();
  const location = useLocation();

  // Fetch footerSettings from API (user's custom footer data from settings page)
  const [footerSettings, setFooterSettings] = useState<FooterSettings | null>(null);

  useEffect(() => {
    const companyId = settings?.company?.id;
    if (!companyId) return;

    footerSettingsService.getPublicSettings(companyId)
      .then((res) => {
        if (res?.success && res?.data) {
          setFooterSettings(res.data as FooterSettings);
        }
      })
      .catch(() => {
        // Ignore errors, theme.footer will be used as fallback
      });
  }, [settings?.company?.id]);
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const shouldForceDocumentNavigation =
    shouldStorefrontForceDocumentNavigation(
      theme.id,
      Boolean(getStorefrontProductRouteKey(normalizedPath)),
    );
  const isHomePath = normalizedPath === '/' || normalizedPath.endsWith('/store');
  const isAtelierNova = theme.id === 'atelier-nova';
  const isCartPath = normalizedPath.endsWith('/cart');
  const isCheckoutPath = normalizedPath.endsWith('/checkout');
  const isThankYouPath = normalizedPath.endsWith('/thank-you');
  const isAtelierNovaCommercePath =
    isAtelierNova && (isCartPath || isCheckoutPath || isThankYouPath);
  const isSoleaFemme = theme.id === 'solea-femme';
  const isIntruderNft = theme.id === 'intruder-nft';
  const isMenShoes = theme.id === 'men-shoes-eg';
  const isPcHub = theme.id === 'pc-hub-eg';
  const isMensGroomingPro = theme.id === 'mens-grooming-pro';
  const footerVariant = theme.footer?.variant?.trim().toLowerCase() || 'default';
  // Soft Graceful — dedicated Texture-style dark footer
  if (theme.id === 'soft-graceful') {
    return <GracefulFooter />;
  }
  const isEditorialSoftFooter = footerVariant === 'editorial-soft';
  const isUtilityFrameFooter = footerVariant === 'utility-frame';
  const isSignaturePanelFooter = footerVariant === 'signature-panel';
  const isDigitalCommandFooter = footerVariant === 'digital-command';
  const isFashionRetailFooter = footerVariant === 'fashion-retail';
  const isButcherAtelierFooter = footerVariant === 'butcher-atelier';
  const isLegacyDefaultOldFooter = footerVariant === 'legacy-default-old';
  const isVelaFashionFooter = footerVariant === 'vela-fashion';
  const isThemePreview = new URLSearchParams(location.search).has('previewTheme');
  const isFastlyTheme = theme.id === 'fastly-eg';
  const homePath = buildStorefrontPath(location.pathname, '/', location.search);
  const shopPath = buildStorefrontPath(location.pathname, '/shop', location.search);
  const displayStoreName =
    (isThemePreview && theme.header?.brandName) ||
    settings?.storefront?.settings?.storeName ||
    theme.header?.brandName ||
    settings?.company?.name ||
    theme.name;
  const runtimeStoreName =
    settings?.storefront?.settings?.storeName ||
    settings?.company?.name ||
    '';
  const themeBrandNames = [theme.header?.brandName, theme.name].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  const isAppliedRuntimeStorefront =
    !isThemePreview &&
    Boolean(runtimeStoreName) &&
    themeBrandNames.some((brandName) => brandName.trim() !== runtimeStoreName.trim());
  const replaceThemeBrandText = (value?: string | null): string => {
    if (!value) {
      return '';
    }

    return themeBrandNames.reduce((text, brandName) => {
      const trimmedBrandName = brandName.trim();
      if (!trimmedBrandName || trimmedBrandName === displayStoreName) {
        return text;
      }

      const escapedBrandName = trimmedBrandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return text.replace(new RegExp(escapedBrandName, 'g'), displayStoreName);
    }, value);
  };

  // Build merged footer: footerSettings (user's data from settings page) takes priority over theme.footer
  const mergedFooterDescription = footerSettings?.aboutStore
    ? replaceThemeBrandText(footerSettings.aboutStore)
    : replaceThemeBrandText(theme.footer?.description);

  const mergedFooterCopyright = footerSettings?.copyrightText
    ? replaceThemeBrandText(footerSettings.copyrightText.replace('{year}', new Date().getFullYear().toString()))
    : replaceThemeBrandText(theme.footer?.copyrightText);

  // Build contact rows from footerSettings (user settings) or fall back to theme
  const mergedFooterContactRows = (() => {
    const rows: Array<{ label: string; value: string; href?: string }> = [];
    if (footerSettings?.phone && footerSettings.showPhone) {
      rows.push({
        label: i18n.t('common.phone'),
        value: footerSettings.phone,
        href: `tel:${footerSettings.phone}`,
      });
    }
    if (footerSettings?.email && footerSettings.showEmail) {
      rows.push({
        label: i18n.t('common.email'),
        value: footerSettings.email,
        href: `mailto:${footerSettings.email}`,
      });
    }
    if (footerSettings?.address && footerSettings.showAddress) {
      rows.push({
        label: i18n.t('common.address'),
        value: footerSettings.address,
      });
    }
    // If no user settings, fall back to theme contact rows
    if (rows.length === 0 && theme.footer?.contactRows) {
      return theme.footer.contactRows.filter(
        (row): row is { label: string; value: string; href?: string } => Boolean(row?.label && row?.value),
      );
    }
    return rows;
  })();

  // Build social links: merge theme social links with footerSettings links (user settings override)
  // Only known social platforms are picked up — footerSettings also carries
  // non-social string fields (aboutStore/email/phone/copyrightText/address).
  const mergedFooterSocialLinks = {
    ...(theme.footer?.socialLinks || {}),
    ...normalizeSocialLinks(footerSettings?.socialLinks || footerSettings, [
      'facebook', 'instagram', 'whatsapp', 'messenger', 'x', 'twitter',
      'youtube', 'tiktok', 'snapchat', 'linkedin', 'telegram', 'pinterest',
      'ticktok', 'snap', 'x.com', 'twitter.com', 'instagram.com',
      'facebook.com', 'whatsapp.com', 'wa.me', 'tiktok.com', 'youtube.com',
      'linkedin.com', 'telegram.com', 'pinterest.com',
    ]),
  };

  const runtimeStorefrontSettings =
    settings?.storefront?.settings && typeof settings.storefront.settings === 'object'
      ? (settings.storefront.settings as Record<string, unknown>)
      : {};
  const runtimeDesignTokens =
    settings?.storefront?.designTokens && typeof settings.storefront.designTokens === 'object'
      ? (settings.storefront.designTokens as Record<string, unknown>)
      : {};
  function normalizeSocialLinks(
    value: unknown,
    allowedKeys?: string[],
  ): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const allowed = allowedKeys?.length
      ? new Set(allowedKeys.map((key) => key.toLowerCase()))
      : null;

    return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
      (links, [key, url]) => {
        if (typeof url === 'string' && url.trim()) {
          if (allowed && !allowed.has(key.trim().toLowerCase())) {
            return links;
          }
          links[key] = url.trim();
        }
        return links;
      },
      {},
    );
  }
  const getRuntimeFooterValue = (...keys: string[]): string =>
    keys
      .map((key) => runtimeStorefrontSettings[key])
      .find((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      ?.trim() || '';
  const runtimePhoneValue = getRuntimeFooterValue(
    'phone',
    'phoneNumber',
    'supportPhone',
    'whatsapp',
    'whatsappNumber',
  );
  const runtimeEmailValue = getRuntimeFooterValue(
    'email',
    'supportEmail',
    'contactEmail',
  );
  const runtimeFooterContactRows = [
    runtimePhoneValue
      ? {
          label: theme.direction === 'rtl' ? 'واتساب' : 'WhatsApp',
          value: runtimePhoneValue,
          href: runtimePhoneValue.replace(/\D/g, '')
            ? `https://wa.me/${runtimePhoneValue.replace(/\D/g, '')}`
            : undefined,
        }
      : null,
    runtimeEmailValue
      ? {
          label: theme.direction === 'rtl' ? 'البريد' : 'Email',
          value: runtimeEmailValue,
          href: `mailto:${runtimeEmailValue}`,
        }
      : null,
  ].filter(
    (
      row,
    ): row is {
      label: string;
      value: string;
      href?: string;
    } => Boolean(row?.value),
  );
  const footerCopyrightText = mergedFooterCopyright;
  const footerDescriptionText = mergedFooterDescription;

  const footerLinksData = theme.footer?.navigation?.map((group) => ({
    title: group.title,
    links: group.links.map((link) => ({
      label: link.label,
      to: buildStorefrontPath(location.pathname, link.to, location.search),
    })),
  })) || [
    {
      title: theme.direction === "rtl" ? "المتجر" : "Shop",
      links: [
        {
          label: theme.direction === "rtl" ? "كل المنتجات" : "All Products",
          to: shopPath,
        },
        {
          label: theme.direction === "rtl" ? "وصل حديثاً" : "New Arrivals",
          to: shopPath,
        },
      ],
    },
    {
      title: theme.direction === "rtl" ? "الدعم" : "Support",
      links: [
        {
          label: theme.direction === "rtl" ? "اتصل بنا" : "Contact Us",
          to: homePath,
        },
        {
          label: theme.direction === "rtl" ? "الأسئلة الشائعة" : "FAQs",
          to: homePath,
        },
      ],
    },
  ];

  const socialIcons = {
    ...(isAppliedRuntimeStorefront ? {} : theme.footer?.socialLinks || {}),
    ...normalizeSocialLinks(runtimeStorefrontSettings.socialLinks),
    ...normalizeSocialLinks(runtimeDesignTokens.socialLinks),
    ...mergedFooterSocialLinks, // User footer settings take priority
  };
  const legalLinks = theme.footer?.legalLinks?.map((link) => ({
    label: link.label,
    to: buildStorefrontPath(location.pathname, link.to, location.search),
  })) || [];
  const themeFooterContactRows = Array.isArray(theme.footer?.contactRows)
    ? theme.footer.contactRows.filter(
        (
          row,
        ): row is {
          label: string;
          value: string;
          href?: string;
        } => Boolean(row?.label && row?.value),
      )
    : [];
  const footerContactRows = mergedFooterContactRows.length
    ? mergedFooterContactRows
    : runtimeFooterContactRows.length
      ? runtimeFooterContactRows
      : isAppliedRuntimeStorefront
        ? []
        : themeFooterContactRows;
  const velaFooterContactRows = [
    {
      key: 'address',
      label: 'Address',
      value: theme.footer?.addressText,
      href: undefined as string | undefined,
    },
    {
      key: 'phone',
      label: 'Phone',
      value: theme.footer?.phoneText,
      href: theme.footer?.phoneText ? `tel:${theme.footer.phoneText}` : undefined,
    },
    {
      key: 'email',
      label: 'Email',
      value: theme.footer?.emailText,
      href: theme.footer?.emailText ? `mailto:${theme.footer.emailText}` : undefined,
    },
  ].filter(
    (
      row,
    ): row is {
      key: 'address' | 'phone' | 'email';
      label: string;
      value: string;
      href?: string;
    } => Boolean(row.value),
  );
  const resolveVelaFooterHref = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return '#';
    }

    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
      return trimmed;
    }

    return buildStorefrontPath(
      location.pathname,
      trimmed.startsWith('/') ? trimmed : `/${trimmed}`,
      location.search,
    );
  };
  const renderVelaFooterIcon = (icon: 'address' | 'phone' | 'email' | 'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'tiktok' | 'snapchat' | 'whatsapp') => {
    switch (icon) {
      case 'address':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
            <circle cx="12" cy="11" r="2.5" />
          </svg>
        );
      case 'phone':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.77 19.77 0 0 1-8.63-3.07 19.3 19.3 0 0 1-6-6A19.77 19.77 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.79.62 2.65a2 2 0 0 1-.45 2.11L8 9.77a16 16 0 0 0 6.23 6.23l1.29-1.28a2 2 0 0 1 2.11-.45c.86.29 1.75.5 2.65.62A2 2 0 0 1 22 16.92Z" />
          </svg>
        );
      case 'email':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m4 7 8 6 8-6" />
          </svg>
        );
      case 'facebook':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M13.5 22v-8.1h2.7l.4-3.1h-3.1V8.8c0-.9.3-1.6 1.7-1.6h1.5V4.4c-.3 0-1.1-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.9v2.2H8v3.1h2.8V22h2.7Z" />
          </svg>
        );
      case 'instagram':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
            <circle cx="12" cy="12" r="3.8" />
            <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
          </svg>
        );
      case 'youtube':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M21.4 7.2a2.9 2.9 0 0 0-2-2C17.7 4.7 12 4.7 12 4.7s-5.7 0-7.4.5a2.9 2.9 0 0 0-2 2C2 8.9 2 12 2 12s0 3.1.6 4.8a2.9 2.9 0 0 0 2 2c1.7.5 7.4.5 7.4.5s5.7 0 7.4-.5a2.9 2.9 0 0 0 2-2c.6-1.7.6-4.8.6-4.8s0-3.1-.6-4.8ZM10 15.6V8.4l6 3.6-6 3.6Z" />
          </svg>
        );
      case 'linkedin':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A2.06 2.06 0 1 0 5.3 7.12 2.06 2.06 0 0 0 5.25 3ZM20.44 12.5c0-3.47-1.85-5.08-4.32-5.08-2 0-2.89 1.1-3.39 1.88V8.5H9.35V20h3.38v-6.37c0-1.67.31-3.29 2.39-3.29 2.05 0 2.08 1.92 2.08 3.4V20h3.38l-.14-7.5Z" />
          </svg>
        );
      case 'twitter':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="currentColor">
            <path d="M18.9 2H22l-6.77 7.74L23 22h-6.06l-4.74-6.2L6.77 22H3.66l7.23-8.27L1 2h6.22l4.28 5.67L18.9 2Zm-1.07 18h1.68L6.31 3.9H4.5L17.83 20Z" />
          </svg>
        );
      case 'tiktok':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M14.7 3h2.9c.2 1.7 1.3 3.2 3 3.8v2.9a7.06 7.06 0 0 1-3-.8v5.6a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v3a2.5 2.5 0 1 0 1.7 2.4V3Z" />
          </svg>
        );
      case 'snapchat':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M12 2.7c2.5 0 4.3 1.9 4.3 4.4 0 .7-.1 1.4-.3 2 .3.4.7.7 1.3.9.6.2 1.2.4 1.8.5.3.1.5.3.5.6 0 .6-1 .9-1.7 1.1-.4.1-.8.3-.9.5-.5 1.1-1.5 1.9-2.8 2.2-.2.8-.9 1.4-1.8 1.4s-1.6-.6-1.8-1.4c-1.3-.3-2.3-1.1-2.8-2.2-.1-.2-.5-.4-.9-.5-.7-.2-1.7-.5-1.7-1.1 0-.3.2-.5.5-.6.6-.1 1.2-.3 1.8-.5.6-.2 1-.5 1.3-.9-.2-.6-.3-1.3-.3-2C7.7 4.6 9.5 2.7 12 2.7Z" />
          </svg>
        );
      case 'whatsapp':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M20 11.8A8 8 0 0 1 8.3 19l-4.3 1.3L5.4 16A8 8 0 1 1 20 11.8Zm-4.7 1.9c-.2-.1-1.2-.6-1.4-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.9-.1.1-.3.1-.5 0a6.5 6.5 0 0 1-1.9-1.2 7.26 7.26 0 0 1-1.3-1.6c-.1-.2 0-.3.1-.5l.3-.4.2-.4c.1-.1 0-.3 0-.4s-.5-1.3-.7-1.8c-.2-.4-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4a9.94 9.94 0 0 0 3.8 3.3c.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.2-.5 1.4-.9.2-.4.2-.8.1-.9-.1-.1-.3-.2-.5-.3Z" />
          </svg>
        );
      default:
        return null;
    }
  };
  const renderStorefrontSocialBrandIcon = (
    social: string,
    className = 'h-[15px] w-[15px]',
  ): React.ReactNode => {
    const key = String(social || '').trim().toLowerCase();
    const filledSvg = (path: string, size = '15') => (
      <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d={path} />
      </svg>
    );

    if (key === 'facebook' || key === 'fb' || key === 'facebook.com') {
      return filledSvg('M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z');
    }

    if (key === 'instagram' || key === 'insta' || key === 'ig') {
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="3.8" />
          <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    }

    if (key === 'whatsapp' || key === 'wa' || key === 'whatsapp.com' || key === 'واتساب') {
      return filledSvg('M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z');
    }

    if (key === 'messenger' || key === 'm.me' || key === 'facebook-messenger') {
      return filledSvg('M12 0C5.373 0 0 4.974 0 11.111c0 3.353 1.655 6.353 4.242 8.305V24l3.895-2.135c1.16.325 2.384.502 3.672.502h.09C18.438 22.367 24 17.4 24 11.111 24 4.974 18.627 0 12 0zm0 2c5.514 0 10 4.088 10 9.111 0 5.035-4.486 9.122-10 9.122-1.19 0-2.34-.189-3.418-.536l-.417-.135-2.586 1.418.502-2.403-.267-.427A8.926 8.926 0 012 11.11C2 6.089 6.486 2 12 2zm.874 7.283l-5.119 5.432 4.646-2.583 2.35 2.625 5.014-5.36-4.677 2.48z');
    }

    if (key === 'x' || key === 'twitter' || key === 'x.com' || key === 'twitter.com') {
      return filledSvg('M18.9 2H22l-6.77 7.74L23 22h-6.06l-4.74-6.2L6.77 22H3.66l7.23-8.27L1 2h6.22l4.28 5.67L18.9 2Zm-1.07 18h1.68L6.31 3.9H4.5L17.83 20Z', '14');
    }

    if (key === 'youtube' || key === 'yt' || key === 'youtube.com') {
      return filledSvg('M21.4 7.2a2.9 2.9 0 0 0-2-2C17.7 4.7 12 4.7 12 4.7s-5.7 0-7.4.5a2.9 2.9 0 0 0-2 2C2 8.9 2 12 2 12s0 3.1.6 4.8a2.9 2.9 0 0 0 2 2c1.7.5 7.4.5 7.4.5s5.7 0 7.4-.5a2.9 2.9 0 0 0 2-2c.6-1.7.6-4.8.6-4.8s0-3.1-.6-4.8ZM10 15.6V8.4l6 3.6-6 3.6Z');
    }

    if (key === 'tiktok' || key === 'ticktok' || key === 'tiktok.com') {
      return filledSvg('M14.7 3h2.9c.2 1.7 1.3 3.2 3 3.8v2.9a7.06 7.06 0 0 1-3-.8v5.6a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v3a2.5 2.5 0 1 0 1.7 2.4V3Z');
    }

    if (key === 'snapchat' || key === 'snap') {
      return filledSvg('M12 2.7c2.5 0 4.3 1.9 4.3 4.4 0 .7-.1 1.4-.3 2 .3.4.7.7 1.3.9.6.2 1.2.4 1.8.5.3.1.5.3.5.6 0 .6-1 .9-1.7 1.1-.4.1-.8.3-.9.5-.5 1.1-1.5 1.9-2.8 2.2-.2.8-.9 1.4-1.8 1.4s-1.6-.6-1.8-1.4c-1.3-.3-2.3-1.1-2.8-2.2-.1-.2-.5-.4-.9-.5-.7-.2-1.7-.5-1.7-1.1 0-.3.2-.5.5-.6.6-.1 1.2-.3 1.8-.5.6-.2 1-.5 1.3-.9-.2-.6-.3-1.3-.3-2C7.7 4.6 9.5 2.7 12 2.7Z');
    }

    if (key === 'linkedin' || key === 'linkedin.com') {
      return filledSvg('M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A2.06 2.06 0 1 0 5.3 7.12 2.06 2.06 0 0 0 5.25 3ZM20.44 12.5c0-3.47-1.85-5.08-4.32-5.08-2 0-2.89 1.1-3.39 1.88V8.5H9.35V20h3.38v-6.37c0-1.67.31-3.29 2.39-3.29 2.05 0 2.08 1.92 2.08 3.4V20h3.38l-.14-7.5Z');
    }

    if (key === 'telegram' || key === 'tg' || key === 'telegram.com') {
      return filledSvg('M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z');
    }

    if (key === 'pinterest' || key === 'pinterest.com') {
      return filledSvg('M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z');
    }

    return null;
  };
  const velaSocialOrder = [
    'facebook',
    'instagram',
    'youtube',
    'linkedin',
    'twitter',
    'tiktok',
    'snapchat',
    'whatsapp',
  ] as const;
  const velaSocialEntries = velaSocialOrder
    .map((key) => [key, socialIcons[key]] as const)
    .filter((entry): entry is readonly [typeof velaSocialOrder[number], string] => Boolean(entry[1]));

  if (isMensGroomingPro && !isMinimal) {
    const mgSocialIcons: Record<string, { href: string; label: string; d: string }> = {
      facebook: { href: socialIcons.facebook, label: 'Facebook', d: 'M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8v-6.93H7.9V12H10V9.8c0-2.07 1.23-3.22 3.12-3.22.9 0 1.85.16 1.85.16v2.03h-1.04c-1.03 0-1.35.64-1.35 1.29V12h2.3l-.37 2.87h-1.93v6.93c4.56-.93 8-4.96 8-9.8Z' },
      instagram: { href: socialIcons.instagram, label: 'Instagram', d: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07Zm0 4.5a5.34 5.34 0 1 0 0 10.68 5.34 5.34 0 0 0 0-10.68Zm0 8.8a3.46 3.46 0 1 1 0-6.92 3.46 3.46 0 0 1 0 6.92Zm6.8-9.2a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z' },
      twitter: { href: socialIcons.twitter || socialIcons.x, label: 'Twitter', d: 'M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z' },
      youtube: { href: socialIcons.youtube, label: 'YouTube', d: 'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z' },
    };
    const mgSocialEntries = Object.entries(mgSocialIcons).filter(([, v]) => Boolean(v.href));
    return (
      <footer dir={theme.direction} className="border-t border-[#e8e8e8] bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-3 px-4 py-6 md:flex-row md:justify-between md:px-6">
          <p className="text-sm text-[#666]">{footerCopyrightText}</p>
          <nav className="flex flex-wrap items-center justify-center gap-5">
            {legalLinks.map((link) => (
              <Link key={link.label} to={link.to} reloadDocument={shouldForceDocumentNavigation} className="text-sm text-[#19212B] hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
          {mgSocialEntries.length ? (
            <div className="flex items-center gap-3">
              {mgSocialEntries.map(([key, v]) => (
                <a key={key} href={v.href} target="_blank" rel="noopener noreferrer" aria-label={v.label} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f1f1] text-[#19212B] transition-colors hover:bg-[#19212B] hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={v.d} /></svg>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </footer>
    );
  }

  if (isButcherAtelierFooter) {
    return (
      <footer dir={theme.direction} className="border-t border-[#37312c] bg-[#080706] text-[#f4ead8]">
        <div className="container px-4 py-10 md:px-6 md:py-14">
          <div className="grid gap-8 border-y border-[#37312c] py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)]">
            <div className="space-y-5">
              <span className="inline-flex border border-[#8b6b3e] bg-[#15110f] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b674]">
                Premium butcher shop
              </span>
              <h2 className="font-heading text-[2.2rem] font-black leading-tight text-[#fff7e8] md:text-[3rem]">
                {displayStoreName}
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[#b7ab9c]">
                {footerDescriptionText}
              </p>
              {footerContactRows.length ? (
                <div className="flex flex-wrap gap-2">
                  {footerContactRows.map((row) =>
                    row.href ? (
                      <a
                        key={`${row.label}-${row.value}`}
                        href={row.href}
                        className="border border-[#37312c] bg-[#15110f] px-3 py-2 text-sm font-bold text-[#d6cbbb] transition-colors hover:border-[#8b6b3e] hover:text-[#fff7e8]"
                      >
                        {row.label}: {row.value}
                      </a>
                    ) : (
                      <span
                        key={`${row.label}-${row.value}`}
                        className="border border-[#37312c] bg-[#15110f] px-3 py-2 text-sm font-bold text-[#d6cbbb]"
                      >
                        {row.label}: {row.value}
                      </span>
                    ),
                  )}
                </div>
              ) : null}
            </div>

            {!isMinimal &&
              footerLinksData.map((group) => (
                <div key={group.title} className="border-s border-[#37312c] ps-5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b674]">
                    {group.title}
                  </h3>
                  <ul className="mt-5 space-y-3">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          to={link.to}
                          reloadDocument={shouldForceDocumentNavigation}
                          className="text-sm font-bold text-[#b7ab9c] transition-colors hover:text-[#fff7e8]"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>

          <div className="flex flex-col gap-4 border-b border-[#37312c] py-5 text-sm text-[#8f8579] md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  reloadDocument={shouldForceDocumentNavigation}
                  className="transition-colors hover:text-[#f4ead8]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(socialIcons).map(([social, url]) =>
                url ? (
                  <a
                    key={social}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center border border-[#37312c] text-xs font-black uppercase text-[#d7b674] transition-colors hover:border-[#8b6b3e] hover:text-[#fff7e8]"
                    aria-label={
                      theme.direction === "rtl"
                        ? `تابعنا على ${social}`
                        : `Follow us on ${social}`
                    }
                  >
                    {renderStorefrontSocialBrandIcon(social) ?? social[0]?.toUpperCase()}
                  </a>
                ) : null,
              )}
            </div>
          </div>

          <p className="pt-5 text-sm text-[#8f8579]">
            {footerCopyrightText}
          </p>
        </div>
      </footer>
    );
  }

  if (isLegacyDefaultOldFooter && !isMinimal) {
    if (isFastlyTheme) {
      return (
        <footer dir={theme.direction} className="border-t border-[#111111]/10 bg-white text-[#111111]">
          <div className="container px-4 py-6 text-center md:px-6">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#111111]">
              <span>{footerCopyrightText}</span>
            </div>
          </div>
        </footer>
      );
    }

    return (
      <footer
        dir={theme.direction}
        className="border-t border-[#111111]/10 bg-white text-[#111111]"
      >
        <div className="container px-4 py-8 text-center md:px-6 md:py-10">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#111111]">
              {legalLinks.map((link) => (
                <Link
                  key={`legacy-footer-${link.to}`}
                  to={link.to}
                  reloadDocument={shouldForceDocumentNavigation}
                  className="transition-colors hover:text-[#555555]"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {footerContactRows.length ? (
              <div className="flex flex-col items-center gap-1.5 text-sm text-[#5f5f5f]">
                {footerContactRows.map((row) =>
                  row.href ? (
                    <a
                      key={`${row.label}-${row.value}`}
                      href={row.href}
                      className="transition-colors hover:text-[#111111]"
                    >
                      {row.label}: {row.value}
                    </a>
                  ) : (
                    <p key={`${row.label}-${row.value}`}>
                      {row.label}: {row.value}
                    </p>
                  ),
                )}
              </div>
            ) : null}

            <p className="text-sm text-[#5f5f5f]">
              {footerCopyrightText}
            </p>
          </div>
        </div>
      </footer>
    );
  }

  if (isFashionRetailFooter && isAtelierNovaCommercePath) {
    return (
      <footer
        dir={theme.direction}
        className="border-t border-[#ead5cd] bg-[#f8eee9] text-[#2c2426]"
      >
        <div className="container px-4 py-6 md:px-6 md:py-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2.5">
              <span className="font-heading text-xl font-semibold tracking-tight text-[#2c2426] md:text-2xl">
                {displayStoreName}
              </span>
              <p className="max-w-xl text-sm leading-7 text-[#6f5960]">
                {theme.direction === "rtl"
                  ? "مسار الشراء هنا يظل هادئًا: مراجعة أوضح، متابعة حتى الاستلام، وروابط الخدمة الأساسية قريبة عند الحاجة."
                  : "The purchase flow stays quiet here: clearer review, follow-up through delivery, and the key service links close at hand."}
              </p>
              {footerContactRows.length ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#5c4b4f]">
                  {footerContactRows.slice(0, 2).map((row) =>
                    row.href ? (
                      <a
                        key={`${row.label}-${row.value}`}
                        href={row.href}
                        className="transition-colors hover:text-[#2c2426]"
                      >
                        {row.label}: {row.value}
                      </a>
                    ) : (
                      <p key={`${row.label}-${row.value}`}>
                        {row.label}: {row.value}
                      </p>
                    ),
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 md:items-end">
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#6f5960]">
                {legalLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    reloadDocument={shouldForceDocumentNavigation}
                    className="transition-colors hover:text-[#2c2426]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {Object.entries(socialIcons).map(([social, url]) =>
                  url ? (
                    <a
                      key={social}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8cbc1] bg-[#fff8f5] text-[#7a5d63] transition-colors hover:border-[#c78672] hover:text-[#2c2426]"
                      aria-label={
                        theme.direction === "rtl"
                          ? `تابعنا على ${social}`
                          : `Follow us on ${social}`
                      }
                    >
                      <span className="inline-flex items-center justify-center" aria-hidden="true">
                        {renderStorefrontSocialBrandIcon(social) ?? (
                          <span className="text-xs capitalize">{social[0]?.toUpperCase()}</span>
                        )}
                      </span>
                    </a>
                  ) : null,
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-[#e8cbc1] pt-4 text-sm text-[#7a5d63]">
            <p>{footerCopyrightText}</p>
          </div>
        </div>
      </footer>
    );
  }

  if (isVelaFashionFooter) {
    const isVelaInnerPage = !isHomePath;
    const velaFooterShellClassName = isVelaInnerPage
      ? 'mt-10 border-t border-[#e8cfd3] bg-[#f6dadd] text-[#111111]'
      : 'mt-10 border-t border-[#ece7e3] bg-white text-[#111111]';
    const velaCardClassName = isVelaInnerPage
      ? 'flex items-start gap-3 rounded-[1.2rem] border border-[#ecd9dd] bg-white/92 px-4 py-4'
      : 'flex items-start gap-3 rounded-[1.2rem] border border-[#efebe8] bg-white px-4 py-4';
    const velaIconClassName = isVelaInnerPage
      ? 'mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#ead7db] text-[#151515]'
      : 'mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#ece7e3] text-[#151515]';
    const velaDividerClassName = isVelaInnerPage
      ? 'border-[#ead3d8]'
      : 'border-[#ece7e3]';

    return (
      <footer dir={theme.direction} className={velaFooterShellClassName}>
        <div className="container px-4 py-10 md:px-6 md:py-12">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)]">
            <div className="space-y-3">
              {velaFooterContactRows.map((row) => {
                const content = (
                  <div className={velaCardClassName}>
                    <span className={velaIconClassName}>
                      {renderVelaFooterIcon(row.key)}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-[#111111]">
                        {row.label}
                        <span className="text-[#777777]"> : </span>
                        <span className="font-normal text-[#5c5c5c]">{row.value}</span>
                      </p>
                    </div>
                  </div>
                );

                return row.href ? (
                  <a
                    key={row.key}
                    href={row.href}
                    className="block transition-colors hover:text-[#111111]"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={row.key}>
                    {content}
                  </div>
                );
              })}
            </div>

            {!isMinimal && footerLinksData.map((group) => (
              <div key={group.title}>
                <h3 className="text-lg font-semibold text-[#111111]">{group.title}</h3>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        reloadDocument={shouldForceDocumentNavigation}
                        className="text-sm text-[#5c5c5c] transition-colors hover:text-[#111111]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {!isMinimal && velaSocialEntries.length ? (
            <div className={`mt-8 flex flex-wrap items-center justify-center gap-3 border-t pt-6 ${velaDividerClassName}`}>
              {velaSocialEntries.map(([social, url]) => (
                <a
                  key={social}
                  href={resolveVelaFooterHref(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-[#111111] transition-colors hover:border-[#111111] ${
                    isVelaInnerPage ? 'border-[#ead3d8] bg-white/88' : 'border-[#ece7e3]'
                  }`}
                  aria-label={`Follow us on ${social}`}
                >
                  {renderVelaFooterIcon(social)}
                </a>
              ))}
            </div>
          ) : null}

        </div>
      </footer>
    );
  }

  if (isPcHub && !isMinimal) {
    return (
      <footer
        dir={theme.direction}
        className="border-t border-[#d8dee8] bg-[#1f2937] text-white"
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex w-full items-center justify-center border-b border-white/10 bg-[#334155] px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-[#3b4758] hover:text-white"
        >
          {theme.direction === "rtl" ? "العودة للأعلى" : "Back to top"}
        </button>

        <div className="container px-4 py-10 md:px-6 md:py-14">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-[#facc15] text-[#111827]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="8" rx="2" />
                    <path d="M7 4h10" />
                  </svg>
                </span>
                <span className="font-heading text-xl font-semibold tracking-tight text-white">
                  {displayStoreName}
                </span>
              </div>
              <p className="max-w-xs text-sm leading-7 text-white/68">
                {theme.footer?.description}
              </p>
              <div className="flex items-center gap-3">
                {Object.entries(socialIcons).map(([social, url]) =>
                  url ? (
                    <a
                      key={social}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/70 transition-colors hover:border-[#facc15] hover:bg-[#facc15] hover:text-[#111827]"
                      aria-label={
                        theme.direction === "rtl"
                          ? `تابعنا على ${social}`
                          : `Follow us on ${social}`
                      }
                    >
                      {renderVelaFooterIcon(social as 'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'tiktok' | 'snapchat' | 'whatsapp') ?? (
                        <span className="inline-flex items-center justify-center" aria-hidden="true">
                          {renderStorefrontSocialBrandIcon(social) ?? (
                            <span className="text-xs capitalize">{social[0]?.toUpperCase()}</span>
                          )}
                        </span>
                      )}
                    </a>
                  ) : null,
                )}
              </div>
            </div>

            {footerLinksData.map((group) => (
              <div key={group.title}>
                <h3 className="mb-4 text-sm font-semibold text-white">
                  {group.title}
                </h3>
                <ul className="space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        reloadDocument={shouldForceDocumentNavigation}
                        className="text-sm text-white/62 transition-colors hover:text-[#facc15]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#111827]">
          <div className="container flex flex-col gap-4 px-4 py-5 text-sm text-white/58 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex flex-wrap items-center gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  reloadDocument={shouldForceDocumentNavigation}
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <p>{theme.footer?.copyrightText}</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      dir={theme.direction}
      className={`relative overflow-hidden border-t ${
        isMenShoes ? "py-8 md:py-14" : "py-12 md:py-16"
      } ${
        isSoleaFemme
          ? "border-primary/10 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.72)_100%)]"
          : isIntruderNft
            ? "border-primary/15 bg-[linear-gradient(180deg,rgba(8,10,16,0.98)_0%,rgba(10,8,18,1)_100%)]"
            : isEditorialSoftFooter
              ? "border-[#ead8e0] bg-[linear-gradient(180deg,#fffafb_0%,#fcf2f6_100%)]"
              : isMenShoes
                ? "border-[#e7d8cb] bg-[linear-gradient(180deg,#f9f1ea_0%,#fffdfa_100%)]"
                : isSignaturePanelFooter
                  ? "border-[#ded1c5] bg-[linear-gradient(180deg,#faf4ee_0%,#fffdf9_100%)]"
                  : "border-border bg-card"
      }`}
    >
      {isIntruderNft ? (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-secondary/10 blur-[150px]" />
        </div>
      ) : null}
      <div className="container relative z-10 px-4 md:px-6">
        <div
          className={`grid gap-6 md:grid-cols-4 ${
            isSoleaFemme
              ? "rounded-[2rem] border border-white/65 bg-white/58 p-6 shadow-[0_26px_90px_-60px_hsl(var(--primary)/0.8)] backdrop-blur md:p-8"
              : isIntruderNft
                ? "rounded-[1.75rem] border border-primary/15 bg-background/55 p-6 shadow-[0_0_70px_-45px_hsl(var(--primary)/0.55)] backdrop-blur md:p-8"
                : isEditorialSoftFooter
                  ? "rounded-[2.1rem] border border-[#ead8e0] bg-white/82 p-6 shadow-[0_32px_90px_-64px_rgba(104,49,73,0.26)] backdrop-blur md:p-8"
                  : isMenShoes
                    ? "grid-cols-1 rounded-[1.6rem] border border-[#eadccf] bg-white/92 p-5 shadow-[0_24px_70px_-46px_rgba(31,38,43,0.18)] md:p-8"
                    : isSignaturePanelFooter
                      ? "rounded-[2rem] border border-[#e3d5ca] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(250,243,237,0.92))] p-6 shadow-[0_34px_96px_-64px_rgba(65,35,58,0.28)] backdrop-blur md:p-8"
                      : ""
          }`}
        >
          {/* Brand Column */}
          <div
            className={`space-y-4 ${
              isMenShoes
                ? "col-span-1 md:col-span-1"
                : "col-span-2 md:col-span-1"
            }`}
          >
            {/* Footer brand: use logo if available, else storeName */}
            {theme.header?.logoUrl ||
            settings?.storefront?.settings?.["logoUrl"] ||
            settings?.company?.logo ? (
              <img
                src={
                  theme.header?.logoUrl ||
                  (settings?.storefront?.settings?.["logoUrl"] as string) ||
                  (settings?.company?.logo as string)
                }
                alt={displayStoreName}
                loading="lazy"
                width="112"
                height="28"
                className="h-7 w-auto object-contain"
              />
            ) : (
              <span
                className={`font-heading text-foreground ${
                  isEditorialSoftFooter
                    ? "text-2xl font-black text-[#5c263b]"
                    : isSignaturePanelFooter
                      ? "text-2xl font-semibold tracking-[0.06em] text-[#41233a]"
                      : isSoleaFemme
                        ? "text-xl font-black"
                        : isIntruderNft
                          ? "text-xl font-black uppercase tracking-[0.28em]"
                          : "text-lg font-bold"
                }`}
              >
                {displayStoreName}
              </span>
            )}
            <p
              className={`max-w-xs text-sm leading-relaxed ${
                isIntruderNft
                  ? "text-white/65"
                  : isMenShoes
                    ? "text-[#675548]"
                    : "text-muted-foreground"
              } ${
                isEditorialSoftFooter
                  ? "text-[#745767]"
                  : isSignaturePanelFooter
                    ? "text-[#6d5658]"
                    : ""
              }`}
            >
              {footerDescriptionText ||
                (theme.direction === "rtl"
                  ? "مجموعات مختارة مصممة للحياة العصرية. الجودة تلتقي بالجمال البسيط."
                  : "Curated collections designed for modern living. Quality meets minimal aesthetic.")}
            </p>
            {footerContactRows.length ? (
              <div
                className={`space-y-1.5 text-sm ${
                  isIntruderNft
                    ? "text-white/65"
                    : isMenShoes
                      ? "text-[#675548]"
                      : "text-muted-foreground"
                } ${
                  isEditorialSoftFooter
                    ? "text-[#745767]"
                    : isSignaturePanelFooter
                      ? "text-[#6d5658]"
                      : ""
                }`}
              >
                {footerContactRows.map((row) =>
                  row.href ? (
                    <a
                      key={`${row.label}-${row.value}`}
                      href={row.href}
                      className="block transition-colors hover:text-foreground"
                    >
                      {row.label}: {row.value}
                    </a>
                  ) : (
                    <p key={`${row.label}-${row.value}`}>
                      {row.label}: {row.value}
                    </p>
                  ),
                )}
              </div>
            ) : null}
            {/* Social icons */}
            <div className="flex items-center gap-3">
              {Object.entries(socialIcons).map(
                ([social, url]) =>
                  url && (
                    <a
                      key={social}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                        isIntruderNft
                          ? "border border-primary/20 bg-background/70 text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_18px_hsl(var(--primary)/0.45)]"
                          : isEditorialSoftFooter
                            ? "border border-[#ead8e0] bg-white text-[#8f5168] hover:border-[#d58ba8] hover:bg-[#fbeaf0] hover:text-[#5c263b]"
                            : isMenShoes
                              ? "border border-[#eadccf] bg-[#fff8f2] text-[#4f4034] hover:border-[#f57a1d] hover:bg-[#f57a1d] hover:text-white"
                              : isSignaturePanelFooter
                                ? "border border-[#e3d5ca] bg-white text-[#6d454d] hover:border-[#c09758] hover:bg-[#fff6ea] hover:text-[#41233a]"
                                : "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                      }`}
                      aria-label={
                        theme.direction === "rtl"
                          ? `تابعنا على ${social}`
                          : `Follow us on ${social}`
                      }
                    >
                      <span className="inline-flex items-center justify-center" aria-hidden="true">
                        {renderStorefrontSocialBrandIcon(social) ?? (
                          <span className="text-xs capitalize">{social[0]?.toUpperCase()}</span>
                        )}
                      </span>
                    </a>
                  ),
              )}
            </div>
          </div>

          {/* Link Columns */}
          {!isMinimal &&
            footerLinksData.map((group) => (
              <div
                key={group.title}
                className={isMenShoes ? "hidden md:block" : undefined}
              >
                <h3
                  className={`mb-4 text-sm font-semibold font-heading uppercase tracking-wide ${
                    isIntruderNft
                      ? "text-white/75"
                      : isEditorialSoftFooter
                        ? "text-[#8f5168]"
                        : isMenShoes
                          ? "text-[#1f262b]"
                          : isSignaturePanelFooter
                            ? "text-[#6d454d]"
                            : "text-foreground"
                  }`}
                >
                  {group.title}
                </h3>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        reloadDocument={shouldForceDocumentNavigation}
                        className={`text-sm transition-colors ${
                          isIntruderNft
                            ? "text-white/60 hover:text-primary"
                            : isEditorialSoftFooter
                              ? "text-[#745767] hover:text-[#5c263b]"
                              : isMenShoes
                                ? "text-[#675548] hover:text-[#f57a1d]"
                                : isSignaturePanelFooter
                                  ? "text-[#6d5658] hover:text-[#41233a]"
                                  : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>

        {/* Bottom bar */}
        <div
          className={`flex flex-col items-center justify-between gap-4 border-t md:flex-row ${
            isMenShoes ? "mt-6 pt-5" : "mt-12 pt-8"
          } ${
            isSoleaFemme
              ? "border-primary/10"
              : isIntruderNft
                ? "border-primary/10"
                : isEditorialSoftFooter
                  ? "border-[#ead8e0]"
                  : isMenShoes
                    ? "border-[#eadccf]"
                    : isSignaturePanelFooter
                      ? "border-[#e3d5ca]"
                      : "border-border"
          }`}
        >
          <p
            className={`text-sm ${isIntruderNft ? "text-white/50" : isEditorialSoftFooter ? "text-[#876674]" : isMenShoes ? "text-[#7b6556]" : isSignaturePanelFooter ? "text-[#7d6967]" : "text-muted-foreground"}`}
          >
            {footerCopyrightText ||
              (theme.direction === "rtl"
                ? `© ٢٠٢٦ ${theme.name}. جميع الحقوق محفوظة.`
                : `© 2026 ${theme.name}. All rights reserved.`)}
          </p>
          <div
            className={`flex flex-wrap items-center justify-center gap-4 text-sm ${
              isIntruderNft
                ? "text-white/50"
                : isEditorialSoftFooter
                  ? "text-[#876674]"
                  : isMenShoes
                    ? "text-[#7b6556]"
                    : isSignaturePanelFooter
                      ? "text-[#7d6967]"
                      : "text-muted-foreground"
            }`}
          >
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                reloadDocument={shouldForceDocumentNavigation}
                className={`transition-colors ${
                  isIntruderNft
                    ? "hover:text-primary"
                    : isEditorialSoftFooter
                      ? "hover:text-[#5c263b]"
                      : isMenShoes
                        ? "hover:text-[#f57a1d]"
                        : isSignaturePanelFooter
                          ? "hover:text-[#41233a]"
                          : "hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

/* ─────────────────── Dynamic Page ─────────────────── */
const resolveStorefrontPageLayout = (
  pageConfig: StorefrontPageConfig | undefined,
  fallback: StorefrontPageLayout = "stack",
): StorefrontPageLayout => pageConfig?.layoutHint || fallback;

// Scroll-reveal is intentionally opt-in: only themes that ship a reveal-enabled
// layout (e.g. soft-graceful) animate sections. Applying `sf-reveal` globally
// forces `transform`/`will-change` on every section, which turns each section
// into a containing block for `position: fixed` children — breaking the mobile
// sticky add-to-cart bar (it can no longer stick to the viewport). See
// storefront-layout.css `.sf-reveal-in`.
const REVEAL_ENABLED_THEMES = new Set<string>(['soft-graceful']);
const isRevealEnabledTheme = (themeId?: string) =>
  Boolean(themeId) && REVEAL_ENABLED_THEMES.has(String(themeId));

const StorefrontSectionFrame: React.FC<RenderSectionFrameArgs> = ({
  element,
  index,
}) => {
  const { theme } = useStorefrontTheme();
  const reveal = isRevealEnabledTheme(theme?.id);
  return (
    <div
      className={reveal ? `sf-reveal ${index > 0 ? 'mt-12' : ''}` : index > 0 ? 'mt-12' : ''}
      data-reveal-delay={reveal ? (index % 5) + 1 : undefined}
    >
      {element}
    </div>
  );
};

const DynamicStorefrontPage: React.FC = () => {
  const { theme } = useStorefrontTheme();
  const { settings, isLoading: settingsLoading } = useStorefrontSettings();
  const { pageSlug, "*": pageSplat } = useParams<{
    pageSlug: string;
    "*": string;
  }>();
  const location = useLocation();
  const runtimeText = useMemo(
    () =>
      createStorefrontThemeTextReplacer({
        theme,
        settings,
        isThemePreview: new URLSearchParams(location.search).has("previewTheme"),
      }),
    [location.search, settings, theme],
  );
  const resolvedPageKey = [pageSlug, pageSplat].filter(Boolean).join("/");
  const pageConfig = resolvedPageKey
    ? theme.pages[resolvedPageKey] || theme.pages[pageSlug]
    : undefined;

  // Unconditional call to hook but with conditional parameter
  const shouldFetchDbPage = !pageConfig && resolvedPageKey !== "home" && resolvedPageKey !== "shop";
  const { page: dbPage, loading: dbLoading } = useStorePage(
    shouldFetchDbPage ? pageSlug : undefined,
    shouldFetchDbPage ? settings?.company?.id : undefined,
  );

  if (shouldFetchDbPage && (settingsLoading || dbLoading)) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (shouldFetchDbPage && dbPage) {
    return (
      <div className="custom-store-page container max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-8 text-start" dir={theme.direction}>
        <div className="border-b border-muted pb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold font-heading text-foreground">
            {dbPage.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-2">
            {i18n.t("storePages.lastUpdated")}:{" "}
            {new Date(dbPage.updatedAt).toLocaleDateString(theme.direction === "rtl" ? "ar-EG" : "en-US", {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div 
          className="prose dark:prose-invert max-w-none text-foreground leading-relaxed space-y-6"
          dangerouslySetInnerHTML={{ __html: sanitizeStorefrontHtml(dbPage.content) }}
        />
      </div>
    );
  }

  if (!resolvedPageKey || (!pageConfig && !dbPage)) {
    return (
      <div className="container py-20 text-center space-y-4">
        <h1 className="text-4xl font-bold font-heading text-foreground">404</h1>
        <p className="text-muted-foreground">
          {theme.direction === "rtl" ? "الصفحة غير موجودة" : "Page not found"}
        </p>
        <Link
          to={buildStorefrontPath(location.pathname, "/", location.search)}
          className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {theme.direction === "rtl" ? "العودة للرئيسية" : "Back to Home"}
        </Link>
      </div>
    );
  }

  return (
    <PageComposer
      pageConfig={pageConfig}
      layout={resolveStorefrontPageLayout(pageConfig)}
      runtimeText={runtimeText}
      renderSectionFrame={StorefrontSectionFrame}
    />
  );
};


const prettifyCollectionSlug = (slug: string, isRtl: boolean): string => {
  const normalized = slug.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

  if (!normalized) {
    return isRtl ? "التصنيف" : "Collection";
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => `${token.charAt(0).toUpperCase()}${token.slice(1)}`)
    .join(" ");
};

const CollectionCategoryPage: React.FC = () => {
  const { theme } = useStorefrontTheme();
  const { settings } = useStorefrontSettings();
  const { categories } = useCategories();
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const runtimeText = useMemo(
    () =>
      createStorefrontThemeTextReplacer({
        theme,
        settings,
        isThemePreview: new URLSearchParams(location.search).has("previewTheme"),
      }),
    [location.search, settings, theme],
  );
  const collectionsPage = theme.pages.collections;
  const isLegacyDefaultOldTheme = theme.id === "legacy-default-old";
  const isVelaFashionTheme = theme.id === "vela-fashion-eg";
  const isFastlyCollectionTheme = theme.id === "fastly-eg";
  const [legacySortOpen, setLegacySortOpen] = useState(false);
  const categoryTitleOverrides =
    collectionsPage?.settings &&
    typeof collectionsPage.settings["categoryTitles"] === "object" &&
    collectionsPage.settings["categoryTitles"] !== null
      ? (collectionsPage.settings["categoryTitles"] as Record<string, unknown>)
      : null;
  const matchedCategory = resolveCatalogCategoryBySlug(
    categories,
    categorySlug,
  );
  const categoryTitle = categorySlug
    ? (typeof categoryTitleOverrides?.[categorySlug] === "string"
        ? String(categoryTitleOverrides[categorySlug])
        : matchedCategory?.name) ||
      prettifyCollectionSlug(categorySlug, theme.direction === "rtl")
    : theme.direction === "rtl"
      ? "التصنيف"
      : "Collection";
  const legacySortLabel =
    collectionsPage?.settings &&
    typeof collectionsPage.settings["sortLabel"] === "string"
      ? String(collectionsPage.settings["sortLabel"])
      : theme.direction === "rtl"
        ? "الأعلى تقييمًا"
        : "Highest Rate";
  const legacySortOptions = useMemo(
    () => [
      {
        key: "highest-rate",
        label: legacySortLabel,
      },
      {
        key: "price-asc",
        label:
          theme.direction === "rtl"
            ? "السعر: من الأقل إلى الأعلى"
            : "Price: Low to High",
      },
      {
        key: "price-desc",
        label:
          theme.direction === "rtl"
            ? "السعر: من الأعلى إلى الأقل"
            : "Price: High to Low",
      },
      {
        key: "latest",
        label: theme.direction === "rtl" ? "الأحدث" : "Latest",
      },
    ],
    [legacySortLabel, theme.direction],
  );
  const activeLegacySortKey =
    searchParams.get("sortBy") === "price" &&
    searchParams.get("sortOrder") === "asc"
      ? "price-asc"
      : searchParams.get("sortBy") === "price" &&
          searchParams.get("sortOrder") === "desc"
        ? "price-desc"
        : searchParams.get("sortBy") === "createdAt" &&
            searchParams.get("sortOrder") === "desc"
          ? "latest"
          : "highest-rate";
  const activeLegacySortLabel =
    legacySortOptions.find((option) => option.key === activeLegacySortKey)
      ?.label || legacySortLabel;
  const simpleCollectionGridSection =
    useMemo<StorefrontSectionConfig | null>(() => {
      if (!categorySlug) {
        return null;
      }

      if (isLegacyDefaultOldTheme) {
        return {
          type: "product-grid",
          variant: "standard",
          settings: {
            defaultCategorySlug: categorySlug,
            hideHeader: true,
            limit: 20,
            productsFoundLabel: theme.direction === "rtl" ? "منتج" : "products",
            clearButtonText:
              theme.direction === "rtl"
                ? "عرض كل المنتجات"
                : "View all products",
          },
        };
      }

      if (isVelaFashionTheme) {
        return {
          type: "product-grid",
          variant: "quick-view-fashion-grid",
          settings: {
            defaultCategorySlug: categorySlug,
            hideHeader: true,
            limit: 20,
            productsFoundLabel: theme.direction === "rtl" ? "منتج" : "products",
            clearButtonText:
              theme.direction === "rtl"
                ? "عرض كل المنتجات"
                : "View all products",
          },
        };
      }

      if (isFastlyCollectionTheme) {
        return {
          type: "product-grid",
          variant: "fastly-offer-wall",
          settings: {
            defaultCategorySlug: categorySlug,
            hideHeader: true,
            limit: 20,
            productsFoundLabel: theme.direction === "rtl" ? "منتج" : "products",
            clearButtonText:
              theme.direction === "rtl"
                ? "عرض كل المنتجات"
                : "View all products",
          },
        };
      }

      return null;
    }, [
      categorySlug,
      isFastlyCollectionTheme,
      isLegacyDefaultOldTheme,
      isVelaFashionTheme,
      theme.direction,
    ]);
  const pageConfig = useMemo<StorefrontPageConfig | null>(() => {
    if (!collectionsPage || !categorySlug) {
      return null;
    }

    const nextSections = collectionsPage.sections
      .map((section): string | StorefrontSectionConfig | null => {
        if (typeof section === "string") {
          if (section === "featured-collections") {
            return null;
          }
          return section;
        }

        if (section.type === "featured-collections") {
          return null;
        }

        const nextSettings = { ...(section.settings || {}) };

        if (section.type === "shop-command-bar") {
          return {
            ...section,
            variant: section.variant || "minimal-toolbar",
            settings: {
              ...nextSettings,
              title: categoryTitle,
              subtitle: "",
              stickyLabel: theme.direction === "rtl" ? "التصنيف" : "Collection",
              hideSearch: true,
              hideDesktopCategoryChips: true,
              clearButtonText:
                theme.direction === "rtl"
                  ? "عرض كل المنتجات"
                  : "View all products",
              resultsLabel: theme.direction === "rtl" ? "منتج" : "products",
            },
          };
        }

        if (section.type === "product-grid") {
          return {
            ...section,
            settings: {
              ...nextSettings,
              defaultCategorySlug: categorySlug,
              hideHeader: true,
              productsFoundLabel:
                theme.direction === "rtl" ? "منتج" : "products",
            },
          };
        }

        return {
          ...section,
          settings: nextSettings,
        };
      })
      .filter(Boolean) as Array<string | StorefrontSectionConfig>;

    if (
      !nextSections.some(
        (section) =>
          typeof section !== "string" && section.type === "shop-command-bar",
      )
    ) {
      nextSections.unshift({
        type: "shop-command-bar",
        variant: "minimal-toolbar",
        settings: {
          title: categoryTitle,
          subtitle: "",
          stickyLabel: theme.direction === "rtl" ? "التصنيف" : "Collection",
          hideSearch: true,
          hideDesktopCategoryChips: true,
          clearButtonText:
            theme.direction === "rtl" ? "عرض كل المنتجات" : "View all products",
          resultsLabel: theme.direction === "rtl" ? "منتج" : "products",
        },
      });
    }

    if (
      !nextSections.some(
        (section) =>
          typeof section !== "string" && section.type === "product-grid",
      )
    ) {
      nextSections.push({
        type: "product-grid",
        variant: "standard",
        settings: {
          defaultCategorySlug: categorySlug,
          hideHeader: true,
          productsFoundLabel: theme.direction === "rtl" ? "منتج" : "products",
        },
      });
    }

    return {
      ...collectionsPage,
      sections: nextSections,
    };
  }, [categorySlug, categoryTitle, collectionsPage, theme.direction]);

  if (!categorySlug || !pageConfig) {
    return (
      <div className="container py-20 text-center space-y-4">
        <h1 className="text-4xl font-bold font-heading text-foreground">404</h1>
        <p className="text-muted-foreground">
          {theme.direction === "rtl" ? "الصفحة غير موجودة" : "Page not found"}
        </p>
        <Link
          to={buildStorefrontPath(location.pathname, "/", location.search)}
          className="inline-block rounded-[var(--radius)] bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {theme.direction === "rtl" ? "العودة للرئيسية" : "Back to Home"}
        </Link>
      </div>
    );
  }

  if (
    (isLegacyDefaultOldTheme || isVelaFashionTheme || isFastlyCollectionTheme) &&
    simpleCollectionGridSection
  ) {
    const applyLegacySort = (sortKey: string) => {
      setSearchParams((prev) => {
        const nextParams = new URLSearchParams(prev);

        if (sortKey === "highest-rate") {
          nextParams.delete("sortBy");
          nextParams.delete("sortOrder");
          return nextParams;
        }

        if (sortKey === "price-asc") {
          nextParams.set("sortBy", "price");
          nextParams.set("sortOrder", "asc");
          return nextParams;
        }

        if (sortKey === "price-desc") {
          nextParams.set("sortBy", "price");
          nextParams.set("sortOrder", "desc");
          return nextParams;
        }

        nextParams.set("sortBy", "createdAt");
        nextParams.set("sortOrder", "desc");
        return nextParams;
      });
      setLegacySortOpen(false);
    };

    return (
      <div
        className={
          isVelaFashionTheme
            ? "bg-[#fcf8f6] text-[#171717]"
            : "bg-white text-[#111111]"
        }
      >
        <div className="container px-4 pt-8 md:px-6 md:pt-10">
          <div
            className={
              isVelaFashionTheme
                ? "flex flex-col gap-4 border-b border-[#eadfd9] pb-4 md:flex-row md:items-center md:justify-between"
                : isFastlyCollectionTheme
                  ? "flex flex-col gap-4 border-b border-[#111111]/12 pb-4 md:flex-row md:items-center md:justify-between"
                  : "flex flex-col gap-4 border-b border-[#111111]/10 pb-4 md:flex-row md:items-center md:justify-between"
            }
          >
            <h1
              className={
                isVelaFashionTheme
                  ? "font-heading text-[1.95rem] font-black text-[#171717] md:text-[2.2rem]"
                  : isFastlyCollectionTheme
                    ? "font-heading text-[1.85rem] font-black text-[#111111] md:text-[2.15rem]"
                    : "font-heading text-[1.85rem] font-black uppercase tracking-[0.08em] text-[#111111] md:text-[2.1rem]"
              }
            >
              {categoryTitle}
            </h1>

            <div className="relative w-fit">
              <button
                type="button"
                onClick={() => setLegacySortOpen((value) => !value)}
                className={
                  isVelaFashionTheme
                    ? "inline-flex items-center gap-2 rounded-full border border-[#e6d8d1] bg-white px-4 py-2 text-sm font-semibold text-[#171717] transition-colors hover:border-[#c8b2aa] hover:bg-[#fffaf8]"
                    : isFastlyCollectionTheme
                      ? "inline-flex items-center gap-2 rounded-full border border-[#111111]/16 bg-white px-4 py-2 text-sm font-semibold text-[#111111] transition-colors hover:border-[#111111]/30 hover:bg-[#fafafa]"
                      : "inline-flex items-center gap-2 rounded-sm border border-[#111111]/18 bg-white px-4 py-2 text-sm font-semibold text-[#111111] transition-colors hover:border-[#111111]/30 hover:bg-[#fafafa]"
                }
                aria-haspopup="menu"
                aria-expanded={legacySortOpen}
              >
                <span>{activeLegacySortLabel}</span>
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
                  className={`transition-transform ${legacySortOpen ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {legacySortOpen ? (
                <div
                  className={
                    isVelaFashionTheme
                      ? "absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[13rem] overflow-hidden rounded-[1rem] border border-[#eadfd9] bg-white shadow-[0_24px_64px_-44px_rgba(23,23,23,0.24)]"
                      : isFastlyCollectionTheme
                        ? "absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[13rem] overflow-hidden rounded-[1rem] border border-[#111111]/12 bg-white shadow-[0_24px_64px_-44px_rgba(17,17,17,0.28)]"
                        : "absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[13rem] overflow-hidden rounded-sm border border-[#111111]/12 bg-white shadow-[0_24px_64px_-44px_rgba(17,17,17,0.45)]"
                  }
                >
                  {legacySortOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => applyLegacySort(option.key)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-start text-sm transition-colors ${
                        option.key === activeLegacySortKey
                          ? isVelaFashionTheme
                            ? "bg-[#fcf4f1] font-semibold text-[#171717]"
                            : isFastlyCollectionTheme
                              ? "bg-[#f5f5f5] font-semibold text-[#111111]"
                              : "bg-[#f5f5f5] font-semibold text-[#111111]"
                          : isVelaFashionTheme
                            ? "text-[#6d5a57] hover:bg-[#fff8f4] hover:text-[#171717]"
                            : isFastlyCollectionTheme
                              ? "text-[#555555] hover:bg-[#fafafa] hover:text-[#111111]"
                              : "text-[#555555] hover:bg-[#fafafa] hover:text-[#111111]"
                      }`}
                    >
                      <span>{option.label}</span>
                      {option.key === activeLegacySortKey &&
                      !isFastlyCollectionTheme ? (
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-[#111111]">
                          {theme.direction === "rtl" ? "نشط" : "Active"}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <React.Suspense
          fallback={
            <div
              className="mx-auto min-h-[32rem] w-full max-w-7xl animate-pulse rounded-lg bg-black/5"
              aria-hidden="true"
            />
          }
        >
          <LegacyCollectionProductGrid
            section={simpleCollectionGridSection}
            settings={simpleCollectionGridSection.settings}
          />
        </React.Suspense>
      </div>
    );
  }

  return (
    <PageComposer
      pageConfig={pageConfig}
      layout={resolveStorefrontPageLayout(pageConfig)}
      runtimeText={runtimeText}
      renderSectionFrame={StorefrontSectionFrame}
    />
  );
};


const StorefrontPreviewBanner: React.FC<{ previewThemeId: string }> = ({
  previewThemeId,
}) => {
  const { theme } = useStorefrontTheme();
  const location = useLocation();
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const isSoleaFemme = theme.id === "solea-femme";
  const isBiteRush = theme.id === "restaurant-demo";
  const isCafeDemo = theme.id === "cafe-demo";
  const isMenShoes = theme.id === "men-shoes-eg";
  const isWomenFashion = theme.id === "women-fashion-eg";
  const isVelaFashion = theme.id === "vela-fashion-eg";
  const isPcHub = theme.id === "pc-hub-eg";
  const isAtelierNova = theme.id === "atelier-nova";
  const isRoseBoutique = theme.id === "rose-boutique-eg";
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
  const isPharmacy = isRuntimePharmacyThemeId(theme.id);
  const hasExplicitAdminOrigin = Boolean(
    resolveStorefrontPreviewAdminOrigin(location.search),
  );
  const marketplaceThemesUrl = buildStorefrontPreviewAdminPath(
    `/marketplace/themes?theme=${encodeURIComponent(previewThemeId)}`,
    location.search,
  );
  const storefrontSettingsUrl = buildStorefrontPreviewAdminPath(
    `/settings/storefront?theme=${encodeURIComponent(previewThemeId)}`,
    location.search,
  );

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

  if (isVelaFashion || theme.id === "fastly-eg") {
    return null;
  }

  if (isMobileViewport) {
    const mobileDockClassName = isBiteRush
      ? "border-[#f8c08c]/55 bg-[#111111]/92"
      : isCafeDemo
        ? "border-[#d9c1ab]/70 bg-[rgba(36,25,18,0.92)]"
        : isPharmacy
          ? "border-[#99f6e4]/70 bg-[rgba(247,255,253,0.94)]"
          : "border-border/70 bg-background/94";
    const mobileBackClassName = isBiteRush
      ? "bg-[#f97316] text-white shadow-[0_16px_34px_-18px_rgba(249,115,22,0.95)] hover:bg-[#ea580c]"
      : isCafeDemo
        ? "bg-[#d6a77a] text-[#2c1d14] shadow-[0_16px_34px_-18px_rgba(214,167,122,0.7)] hover:bg-[#c99666]"
        : isPharmacy
          ? "bg-[#0f766e] text-white shadow-[0_16px_34px_-18px_rgba(15,118,110,0.5)] hover:bg-[#0b5f59]"
          : "bg-primary text-primary-foreground shadow-[0_16px_34px_-18px_rgba(17,17,17,0.22)] hover:opacity-95";
    const mobileCustomizeClassName = isBiteRush
      ? "border-white/12 bg-white/8 text-[#ffd7bb] hover:bg-white/12"
      : isCafeDemo
        ? "border-[#d9c1ab]/45 bg-white/8 text-[#f4dfcc] hover:bg-white/12"
        : isPharmacy
          ? "border-[#99f6e4] bg-white text-[#0f766e] hover:bg-[#ecfdf9]"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:text-primary";

    return (
      <div className="pointer-events-none fixed inset-x-0 top-24 z-[76] flex justify-end px-3">
        <div
          className={`pointer-events-auto inline-flex items-center gap-1 rounded-full border p-1.5 shadow-[0_26px_80px_-34px_rgba(17,17,17,0.32)] backdrop-blur-xl ${mobileDockClassName}`}
        >
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 ${mobileBackClassName}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-transform hover:-translate-y-0.5 ${mobileCustomizeClassName}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  if (isElessiPackTheme) {
    return (
      <div className="pointer-events-none fixed bottom-4 start-4 z-[76]">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/92 p-1 shadow-[0_18px_48px_-34px_rgba(17,17,17,0.26)] backdrop-blur-xl">
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5 hover:opacity-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-transform hover:-translate-y-0.5 hover:border-primary/45 hover:text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  if (isVelaFashion) {
    return (
      <div className="pointer-events-none fixed bottom-3 start-3 z-[76]">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-[#edd5cc] bg-white/92 p-1 shadow-[0_18px_48px_-34px_rgba(60,43,46,0.18)] backdrop-blur-xl">
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2c2426] text-white transition-transform hover:-translate-y-0.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#edd5cc] bg-[#fff7f2] text-[#7a5d63] transition-transform hover:-translate-y-0.5 hover:border-[#d05d4b] hover:text-[#d05d4b]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  if (hasExplicitAdminOrigin && !isBiteRush && !isPharmacy && !isCafeDemo) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-24 z-[76] flex justify-end px-3 md:px-6">
        <Link
          to={marketplaceThemesUrl}
          className={`pointer-events-auto inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold shadow-[0_24px_60px_-30px_rgba(17,17,17,0.45)] transition-transform hover:-translate-y-0.5 ${
            isSoleaFemme
              ? "bg-primary text-primary-foreground"
              : "bg-amber-600 text-white hover:bg-amber-700"
          }`}
        >
          العودة إلى متجر القوالب
        </Link>
      </div>
    );
  }

  if (isBiteRush || isPharmacy || isCafeDemo) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-24 z-[76] flex justify-end px-3 md:px-6">
        <div
          className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border p-1.5 shadow-[0_26px_80px_-34px_rgba(17,17,17,0.72)] backdrop-blur-xl ${
            isBiteRush
              ? "border-[#f8c08c]/55 bg-[#111111]/92"
              : isCafeDemo
                ? "border-[#d9c1ab]/75 bg-[rgba(36,25,18,0.92)]"
                : "border-[#99f6e4]/70 bg-[rgba(247,255,253,0.94)]"
          }`}
        >
          <span
            className={`hidden items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] sm:inline-flex ${
              isBiteRush
                ? "bg-white/8 text-[#ffd7bb]"
                : isCafeDemo
                  ? "bg-white/8 text-[#f4dfcc]"
                  : "bg-[#14b8a6]/10 text-[#0f766e]"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isBiteRush ? "bg-[#f97316]" : isCafeDemo ? "bg-[#d6a77a]" : "bg-[#14b8a6]"}`}
            />
            وضع المعاينة
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:-translate-y-0.5 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5 ${
              isBiteRush
                ? "bg-[#f97316] shadow-[0_16px_34px_-18px_rgba(249,115,22,0.95)] hover:bg-[#ea580c]"
                : isCafeDemo
                  ? "bg-[#d6a77a] text-[#2c1d14] shadow-[0_16px_34px_-18px_rgba(214,167,122,0.7)] hover:bg-[#c99666]"
                  : "bg-[#0f766e] shadow-[0_16px_34px_-18px_rgba(15,118,110,0.5)] hover:bg-[#0b5f59]"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-transform hover:-translate-y-0.5 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5 ${
              isBiteRush
                ? "border-white/12 bg-white/8 text-[#ffd7bb] hover:bg-white/12"
                : isCafeDemo
                  ? "border-[#d9c1ab]/45 bg-white/8 text-[#f4dfcc] hover:bg-white/12"
                  : "border-[#99f6e4] bg-white text-[#0f766e] hover:bg-[#ecfdf9]"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isMenShoes) {
    return (
      <div className="border-b border-[#eadccf] bg-[linear-gradient(180deg,#f9f1ea_0%,#fffdfa_100%)] backdrop-blur">
        <div className="container px-4 py-3 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1 text-right">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#eadccf] bg-white px-3 py-1 text-[11px] font-black text-[#8d5d2f] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#f57a1d]" />
                معاينة سريعة
              </div>
              <p className="text-sm font-bold text-[#3b2414]">
                أنت تشاهد قالب {theme.name} قبل التطبيق.
              </p>
              <p className="text-xs leading-6 text-[#8c5f34]">
                هذه نسخة مراجعة فقط. ارجع للقوالب أو التخصيص عند الحاجة.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Link
                to={marketplaceThemesUrl}
                className="inline-flex items-center justify-center rounded-full bg-[#1f262b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#12181c]"
              >
                القوالب
              </Link>
              <Link
                to={storefrontSettingsUrl}
                className="inline-flex items-center justify-center rounded-full border border-[#ded0c2] bg-white px-4 py-2.5 text-sm font-bold text-[#4f4034] hover:border-[#f57a1d] hover:text-[#f57a1d]"
              >
                تخصيص
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isWomenFashion) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#ead9d8] bg-white/92 p-1.5 shadow-[0_24px_70px_-36px_rgba(107,33,49,0.22)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#fff4f0] px-3 py-2 text-[10px] font-black tracking-[0.22em] text-[#8b3d33] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#d86b55]" />
            معاينة
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#3f2f35] text-white shadow-[0_16px_34px_-18px_rgba(63,47,53,0.45)] transition-transform hover:-translate-y-0.5 hover:bg-[#2e2227] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead9d8] bg-[#fff7f5] text-[#8b3d33] shadow-[0_16px_34px_-18px_rgba(216,107,85,0.18)] transition-transform hover:-translate-y-0.5 hover:border-[#d86b55] hover:bg-white md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isSoleaFemme) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#ead8cf] bg-[rgba(255,252,248,0.94)] p-1.5 shadow-[0_24px_70px_-36px_rgba(47,35,45,0.22)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#2f232d] px-3 py-2 text-[10px] font-black tracking-[0.22em] text-white sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#d8b28a]" />
            Solea Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2f232d] text-white shadow-[0_16px_34px_-18px_rgba(47,35,45,0.44)] transition-transform hover:-translate-y-0.5 hover:bg-[#241a22] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8cf] bg-white text-[#6f5448] shadow-[0_16px_34px_-18px_rgba(111,84,72,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#d8b28a] hover:text-[#2f232d] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isRoseBoutique || isAtelierNova) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-center px-3 md:top-24 md:justify-end md:px-6">
        <div
          className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border bg-white/92 p-1.5 backdrop-blur-xl ${
            isAtelierNova
              ? "border-[#ddd2ca] shadow-[0_24px_70px_-36px_rgba(44,36,38,0.16)]"
              : "border-[#ead8d2] shadow-[0_24px_70px_-36px_rgba(91,42,58,0.18)]"
          }`}
        >
          <span
            className={`hidden items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black tracking-[0.22em] sm:inline-flex ${
              isAtelierNova
                ? "bg-[#faf4ef] text-[#7b6257]"
                : "bg-[#fff5f4] text-[#8d5568]"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isAtelierNova ? "bg-[#b78f79]" : "bg-[#d9a2b1]"
              }`}
            />
            معاينة
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:-translate-y-0.5 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5 ${
              isAtelierNova
                ? "bg-[#2c2426] shadow-[0_16px_34px_-18px_rgba(44,36,38,0.38)] hover:bg-[#1f191b]"
                : "bg-[#5c263b] shadow-[0_16px_34px_-18px_rgba(92,38,59,0.38)] hover:bg-[#4a1d30]"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-transform hover:-translate-y-0.5 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5 ${
              isAtelierNova
                ? "border-[#ddd2ca] bg-[#fffaf7] text-[#7b6257] shadow-[0_16px_34px_-18px_rgba(123,98,87,0.14)] hover:border-[#b78f79] hover:bg-white"
                : "border-[#ead8d2] bg-[#fffaf8] text-[#8d5568] shadow-[0_16px_34px_-18px_rgba(160,97,120,0.14)] hover:border-[#d9a2b1] hover:bg-white"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isCarryLane) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#e7dacd] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(61,41,29,0.22)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#fbf3ea] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a5b40] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#c77b48]" />
            Carry Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2a211d] text-white shadow-[0_16px_34px_-18px_rgba(42,33,29,0.54)] transition-transform hover:-translate-y-0.5 hover:bg-[#1d1714] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e7dacd] bg-white text-[#7a5340] shadow-[0_16px_34px_-18px_rgba(122,83,64,0.16)] transition-transform hover:-translate-y-0.5 hover:border-[#c77b48] hover:text-[#a25f39] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isHarvestFold) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#eadfcd] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(45,59,39,0.22)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#fff8ef] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6546] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#d39c4d]" />
            Harvest Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2d3b27] text-white shadow-[0_16px_34px_-18px_rgba(45,59,39,0.52)] transition-transform hover:-translate-y-0.5 hover:bg-[#202a1c] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#eadfcd] bg-white text-[#6c5b49] shadow-[0_16px_34px_-18px_rgba(108,91,73,0.16)] transition-transform hover:-translate-y-0.5 hover:border-[#d39c4d] hover:text-[#8c5d1e] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isSignalDeck) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#dce3ec] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(15,23,42,0.2)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#f7f9fc] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#516170] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
            معاينة
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#161c26] text-white shadow-[0_16px_34px_-18px_rgba(22,28,38,0.5)] transition-transform hover:-translate-y-0.5 hover:bg-[#0d1219] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dce3ec] bg-white text-[#516170] shadow-[0_16px_34px_-18px_rgba(81,97,112,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#f59e0b] hover:text-[#b45309] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isPedalLab) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#d9dee4] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(18,34,48,0.22)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#f5f7fa] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#516170] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#d97706]" />
            Ride Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1d2a33] text-white shadow-[0_16px_34px_-18px_rgba(29,42,51,0.52)] transition-transform hover:-translate-y-0.5 hover:bg-[#121d24] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d9dee4] bg-white text-[#516170] shadow-[0_16px_34px_-18px_rgba(81,97,112,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#d97706] hover:text-[#b45309] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isGlowRoutine) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#ead7d1] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(91,57,40,0.18)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#fff6f1] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#9a6354] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#eb8b73]" />
            Glow Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2f2422] text-white shadow-[0_16px_34px_-18px_rgba(47,36,34,0.44)] transition-transform hover:-translate-y-0.5 hover:bg-[#241b1a] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead7d1] bg-white text-[#9a6354] shadow-[0_16px_34px_-18px_rgba(154,99,84,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#d78b74] hover:text-[#8e5548] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isGemAtelier) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#e7d7cf] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(56,36,38,0.18)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#fff6f1] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#8f5c44] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#d8a56a]" />
            Gem Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2d211e] text-white shadow-[0_16px_34px_-18px_rgba(45,33,30,0.44)] transition-transform hover:-translate-y-0.5 hover:bg-[#211816] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e7d7cf] bg-white text-[#8f5c44] shadow-[0_16px_34px_-18px_rgba(143,92,68,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#d8a56a] hover:text-[#7b4f3d] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isTailSupply) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#d9e3d7] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(34,62,49,0.2)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#f4faf4] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#35624a] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
            Tail Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#234233] text-white shadow-[0_16px_34px_-18px_rgba(35,66,51,0.44)] transition-transform hover:-translate-y-0.5 hover:bg-[#183126] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d9e3d7] bg-white text-[#35624a] shadow-[0_16px_34px_-18px_rgba(53,98,74,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#f59e0b] hover:text-[#9a5f05] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isChronoGallery) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#d8ddd7] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(28,38,48,0.2)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#f7f8fa] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#5f6974] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#c59d52]" />
            Chrono Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1f2731] text-white shadow-[0_16px_34px_-18px_rgba(31,39,49,0.44)] transition-transform hover:-translate-y-0.5 hover:bg-[#151b22] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8ddd7] bg-white text-[#5f6974] shadow-[0_16px_34px_-18px_rgba(95,105,116,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#c59d52] hover:text-[#8e6b1f] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isGarageFit) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#3b2a24] bg-[rgba(20,19,18,0.92)] p-1.5 shadow-[0_22px_64px_-34px_rgba(12,12,12,0.48)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#261d1a] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#f6b26b] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#f97316]" />
            Garage Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f97316] text-white shadow-[0_16px_34px_-18px_rgba(249,115,22,0.48)] transition-transform hover:-translate-y-0.5 hover:bg-[#ea580c] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#4b3329] bg-[#181614] text-[#f5d6b4] shadow-[0_16px_34px_-18px_rgba(20,19,18,0.42)] transition-transform hover:-translate-y-0.5 hover:border-[#f97316] hover:text-[#ffb76c] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isSproutRoom) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#dfe7d5] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(42,62,35,0.28)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#f6fbf1] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7d24] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#83b735]" />
            Plant Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#83b735] text-white shadow-[0_16px_34px_-18px_rgba(131,183,53,0.7)] transition-transform hover:-translate-y-0.5 hover:bg-[#73a32b] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe7d5] bg-white text-[#48603d] shadow-[0_16px_34px_-18px_rgba(72,96,61,0.18)] transition-transform hover:-translate-y-0.5 hover:border-[#83b735] hover:text-[#6b9a29] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isPcHub) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-center px-3 md:top-24 md:justify-end md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#d7dde7] bg-white/92 p-1.5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#111827] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#facc15]" />
            Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#111827] text-white shadow-[0_16px_34px_-18px_rgba(17,24,39,0.72)] transition-transform hover:-translate-y-0.5 hover:bg-[#1f2937] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#f5d76c] bg-[#facc15] text-[#111827] shadow-[0_16px_34px_-18px_rgba(250,204,21,0.62)] transition-transform hover:-translate-y-0.5 hover:bg-[#f5c400] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-b backdrop-blur ${
        isSoleaFemme
          ? "border-primary/10 bg-[linear-gradient(90deg,hsl(var(--secondary)/0.95),hsl(var(--background)/0.98),hsl(var(--secondary)/0.95))]"
          : "border-amber-200 bg-amber-50/95 dark:border-amber-900 dark:bg-amber-950/40"
      }`}
    >
      <div className="container px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-right">
            <div
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                isSoleaFemme
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
              }`}
            >
              معاينة مؤقتة
            </div>
            <p
              className={`text-sm font-semibold ${
                isSoleaFemme
                  ? "text-foreground"
                  : "text-amber-950 dark:text-amber-50"
              }`}
            >
              أنت تشاهد الآن قالب {theme.name} قبل تطبيقه على متجرك.
            </p>
            <p
              className={`text-xs leading-6 ${
                isSoleaFemme
                  ? "text-muted-foreground"
                  : "text-amber-800 dark:text-amber-200"
              }`}
            >
              هذه المعاينة لا تغيّر القالب الحالي. ارجع إلى متجر القوالب عندما
              تريد الشراء أو التطبيق.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={marketplaceThemesUrl}
              className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
            >
              العودة إلى متجر القوالب
            </Link>
            <Link
              to={storefrontSettingsUrl}
              className="inline-flex items-center justify-center rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-900/40"
            >
              تخصيص القالب من الإدارة
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const StorefrontProductPreviewBanner: React.FC<{
  previewProductId?: string | null;
}> = ({ previewProductId }) => {
  const { theme } = useStorefrontTheme();
  const location = useLocation();
  const isSoleaFemme = theme.id === "solea-femme";
  const isVelaFashion = theme.id === "vela-fashion-eg";

  const productRouteKey = getStorefrontProductRouteKey(location.pathname);
  const { product } = useProduct(productRouteKey || undefined, {
    enabled: Boolean(productRouteKey) && !previewProductId,
  });

  const effectiveProductId = previewProductId || product?.id;

  const editLink = effectiveProductId
    ? `/products/${encodeURIComponent(effectiveProductId)}/edit`
    : "/products";
  const editUrl = buildStorefrontPreviewAdminPath(editLink, location.search);
  const productsUrl = buildStorefrontPreviewAdminPath(
    "/products",
    location.search,
  );

  if (isVelaFashion) {
    return (
      <div className="pointer-events-none fixed bottom-3 end-3 z-[75]">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-[#edd5cc] bg-white/92 p-1 shadow-[0_18px_48px_-34px_rgba(60,43,46,0.16)] backdrop-blur-xl">
          <Link
            to={editUrl}
            aria-label="تعديل المنتج"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#d05d4b] text-white transition-transform hover:-translate-y-0.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </Link>
          <Link
            to={productsUrl}
            aria-label="قائمة المنتجات"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#edd5cc] bg-[#fff7f2] text-[#7a5d63] transition-transform hover:-translate-y-0.5 hover:border-[#d05d4b] hover:text-[#d05d4b]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M7 12h10" />
              <path d="M10 18h4" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  const previewShellClassName = isSoleaFemme
    ? "pointer-events-auto inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white/95 p-1 text-rose-950 shadow-[0_18px_48px_-30px_rgba(190,18,60,0.28)] backdrop-blur-xl"
    : "pointer-events-auto inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 text-slate-800 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl";
  const editActionClassName = isSoleaFemme
    ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white transition-transform hover:-translate-y-0.5"
    : "inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white transition-transform hover:-translate-y-0.5";
  const productsActionClassName = isSoleaFemme
    ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-900 transition-transform hover:-translate-y-0.5"
    : "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-transform hover:-translate-y-0.5";

  return (
    <div className="pointer-events-none fixed bottom-3 end-3 z-[75] max-w-[calc(100vw-1.5rem)]">
      <div className={previewShellClassName} dir={theme.direction}>
        <span className="hidden max-w-[8rem] truncate px-2 text-xs font-bold sm:inline">
          {theme.direction === "rtl" ? "معاينة المنتج" : "Product preview"}
        </span>
        <Link
          to={editUrl}
          aria-label={
            theme.direction === "rtl" ? "تعديل المنتج" : "Edit product"
          }
          className={editActionClassName}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </Link>
        <Link
          to={productsUrl}
          aria-label={
            theme.direction === "rtl" ? "قائمة المنتجات" : "Products list"
          }
          className={productsActionClassName}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
          </svg>
        </Link>
      </div>
    </div>
  );
};


const MARKETPLACE_PREVIEW_CART_SEED_PREFIX =
  "sf-marketplace-preview-cart-seeded";

type PreviewCartSignatureItem = {
  id: string;
  productId: string;
  variantId?: string | null;
  imageUrl?: string | null;
  price: number;
  basePrice?: number | null;
  quantity: number;
  attributes?: Record<string, unknown> | null;
};

const serializeMarketplacePreviewCartItems = (
  items: PreviewCartSignatureItem[],
) =>
  items
    .map((item) =>
      [
        item.id,
        item.productId,
        item.variantId || "",
        item.imageUrl || "",
        item.price,
        item.basePrice ?? item.price,
        item.quantity,
        JSON.stringify(item.attributes || {}),
      ].join("::"),
    )
    .join("||");

const MarketplacePreviewCartBootstrap: React.FC<{
  previewThemeId?: string | null;
}> = ({ previewThemeId }) => {
  const marketplacePreviewThemeId = previewThemeId || "";
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const shouldShowPreviewCartSeed =
    normalizedPath.endsWith("/cart") ||
    normalizedPath.endsWith("/checkout") ||
    normalizedPath.endsWith("/thank-you");

  useEffect(() => {
    const persistApi = useCartStore.persist;
    if (!persistApi) {
      return;
    }

    const targetStorageName = marketplacePreviewThemeId
      ? getStorefrontPreviewCartStorageName(marketplacePreviewThemeId)
      : DEFAULT_STOREFRONT_CART_STORAGE_NAME;

    if (persistApi.getOptions().name === targetStorageName) {
      return;
    }

    useCartStore.setState({ items: [], isOpen: false });
    persistApi.setOptions({ name: targetStorageName });
    void persistApi.rehydrate();
  }, [marketplacePreviewThemeId]);

  useEffect(() => {
    if (!marketplacePreviewThemeId) {
      return;
    }

    let cancelled = false;

    void import("./preview/marketplacePreviewCart").then(
      ({ getMarketplacePreviewCartItems }) => {
        if (cancelled) {
          return;
        }

        const previewItems =
          getMarketplacePreviewCartItems(marketplacePreviewThemeId);
        if (previewItems.length === 0) {
          return;
        }

        const seedSignature =
          serializeMarketplacePreviewCartItems(previewItems);
        const activeSeedKey = `${MARKETPLACE_PREVIEW_CART_SEED_PREFIX}:active:${marketplacePreviewThemeId}`;
        const currentItems = useCartStore.getState().items;
        const currentSignature = serializeMarketplacePreviewCartItems(currentItems);

        if (!shouldShowPreviewCartSeed) {
          if (
            currentSignature === seedSignature ||
            (typeof window !== "undefined" &&
              window.sessionStorage.getItem(activeSeedKey) === "1")
          ) {
            useCartStore.setState({ items: [], isOpen: false });
            if (typeof window !== "undefined") {
              window.sessionStorage.removeItem(activeSeedKey);
            }
          }
          return;
        }

        if (currentSignature !== seedSignature) {
          useCartStore.setState({ items: previewItems, isOpen: false });
        }
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(activeSeedKey, "1");
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [marketplacePreviewThemeId, shouldShowPreviewCartSeed]);

  return null;
};

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
    captureStorefrontAttribution();
  }, [location.pathname, location.search]);

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
  const shouldWarmLayoutCategories =
    layoutStorefrontSegments.length === 0 ||
    layoutStorefrontSegments[0] === "shop" ||
    layoutStorefrontSegments[0] === "collections" ||
    layoutStorefrontSegments[0] === "sale";

  useCategories(undefined, { enabled: shouldWarmLayoutCategories });

  const isMinimal =
    isProductImageLandingPage ||
    normalizedPath.endsWith("/checkout") ||
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
  const elessiCompactProductCrumbs = (trail: string[]) => (
    <div className="w-full border-b border-border/70 bg-background/96">
      <div className="container px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground md:text-xs">
          {trail.map((crumb, index) => (
            <React.Fragment key={`${crumb}-${index}`}>
              {index > 0 ? <span className="opacity-35">/</span> : null}
              <span
                className={
                  index === trail.length - 1 ? "text-foreground" : undefined
                }
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#7d6a60] md:text-[0.95rem]">
            {trail.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                {index > 0 ? <span className="opacity-45">/</span> : null}
                <span
                  className={
                    index === trail.length - 1
                      ? "font-medium text-[#34231d]"
                      : undefined
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#6c7568] md:text-[0.95rem]">
            {trail.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                {index > 0 ? <span className="opacity-45">/</span> : null}
                <span
                  className={
                    index === trail.length - 1
                      ? "font-medium text-[#2b362a]"
                      : undefined
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#6c5b49] md:text-[0.95rem]">
            {trail.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                {index > 0 ? <span className="opacity-45">/</span> : null}
                <span
                  className={
                    index === trail.length - 1
                      ? "font-medium text-[#2d3b27]"
                      : undefined
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#607184] md:text-[0.95rem]">
            {trail.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                {index > 0 ? <span className="opacity-45">/</span> : null}
                <span
                  className={
                    index === trail.length - 1
                      ? "font-medium text-[#161c26]"
                      : undefined
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#677684] md:text-[0.95rem]">
            {trail.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                {index > 0 ? <span className="opacity-45">/</span> : null}
                <span
                  className={
                    index === trail.length - 1
                      ? "font-medium text-[#1d2a33]"
                      : undefined
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#87686b] md:text-[0.95rem]">
            {trail.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                {index > 0 ? <span className="opacity-45">/</span> : null}
                <span
                  className={
                    index === trail.length - 1
                      ? "font-medium text-[#382426]"
                      : undefined
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#856a6d] md:text-[0.95rem]">
            {trail.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                {index > 0 ? <span className="opacity-45">/</span> : null}
                <span
                  className={
                    index === trail.length - 1
                      ? "font-medium text-[#352427]"
                      : undefined
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#5f7a67] md:text-[0.95rem]">
            {trail.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                {index > 0 ? <span className="opacity-45">/</span> : null}
                <span
                  className={
                    index === trail.length - 1
                      ? "font-medium text-[#254235]"
                      : undefined
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#6a727b] md:text-[0.95rem]">
            {trail.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                {index > 0 ? <span className="opacity-45">/</span> : null}
                <span
                  className={
                    index === trail.length - 1
                      ? "font-medium text-[#1f2731]"
                      : undefined
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#dcc4ad] md:text-[0.95rem]">
            {trail.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                {index > 0 ? <span className="opacity-45">/</span> : null}
                <span
                  className={
                    index === trail.length - 1
                      ? "font-medium text-[#fff6ea]"
                      : undefined
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
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
  const notFoundElement = (
    <div className="container py-20 text-center space-y-4">
      <h1 className="text-4xl font-bold font-heading text-foreground">404</h1>
      <p className="text-muted-foreground">
        {theme.direction === "rtl" ? "الصفحة غير موجودة" : "Page not found"}
      </p>
      <Link
        to={buildStorefrontPath(location.pathname, "/", location.search)}
        className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {theme.direction === "rtl" ? "العودة للرئيسية" : "Back to Home"}
      </Link>
    </div>
  );
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
          path={scopedPath("shop/products/:id")}
          element={productPageElement}
        />
        <Route path={scopedPath("cart")} element={cartPageElement} />
        <Route path={scopedPath("checkout")} element={checkoutPageElement} />
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
      <MarketplacePreviewCartBootstrap previewThemeId={previewThemeId} />
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

      {!isProductImageLandingPage ? (
        <MemoStorefrontHeader isMinimal={isMinimal} search={search} />
      ) : null}
      {isProductPreview ? (
        <StorefrontProductPreviewBanner previewProductId={previewProductId} />
      ) : null}
      {showPreviewThemeBanner && previewThemeId ? (
        <StorefrontPreviewBanner previewThemeId={previewThemeId} />
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
  const shouldPrefetchCategories =
    storefrontSegments.length === 0 ||
    storefrontSegments[0] === "shop" ||
    storefrontSegments[0] === "collections" ||
    storefrontSegments[0] === "sale";

  // Keep catalog data warm on browsing pages, but avoid competing with PDP critical requests.
  useCategories(undefined, { enabled: shouldPrefetchCategories });

  const { settings, isLoading, error, previewThemeId } =
    useStorefrontSettings({ enabled: !isStandaloneProductLanding });
  const initialTheme = useMemo(
    () =>
      (settings?.storefront || undefined) as StorefrontThemeInput | undefined,
    [settings],
  );
  useFacebookPixel(settings?.storefrontSettings ?? null);
  useGoogleAnalytics(settings?.storefrontSettings ?? null);
  useClarityAnalytics(settings?.storefrontSettings ?? null);
  useStorefrontVisitTracking(settings);

  if (isStandaloneProductLanding) {
    return <ProductImageLandingPage />;
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
