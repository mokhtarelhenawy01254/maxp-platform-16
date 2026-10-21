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
} from "../../engine/ThemeProvider";
import type { StorefrontThemeInput } from "../../engine/runtimeThemeResolver";
import { PageComposer, type RenderSectionFrameArgs } from "../../engine/PageComposer";
import { useCartStore } from "../../store/useCartStore";
import {
  DEFAULT_STOREFRONT_CART_STORAGE_NAME,
  getStorefrontPreviewCartStorageName,
} from "../../store/useCartStore";
import {
  buildStorefrontPath,
  buildStorefrontPreviewAdminPath,
  getStorefrontProductRouteKey,
  resolveStorefrontPreviewAdminOrigin,
} from "../../utils/paths";
import { useStorefrontSettings } from "../../hooks/useStorefrontSettings";
import { formatStorefrontCurrency } from "../../utils/currency";
import { sanitizeStorefrontHtml } from "../../utils/html";
import { StorefrontHead } from "../../engine/StorefrontHead";
import type {
  StorefrontPageConfig,
  StorefrontPageLayout,
  StorefrontSectionConfig,
  StorefrontTheme,
} from "../../types/theme.types";
import { useClarityAnalytics } from "../../../hooks/useClarityAnalytics";
import { useFacebookPixel } from "../../../hooks/useFacebookPixel";
import { useGoogleAnalytics } from "../../../hooks/useGoogleAnalytics";
const StorefrontArticlePage = React.lazy(
  () => import("../../pages/StorefrontArticlePage"),
);
import { useCategories } from "../../hooks/useCategories";
import StorefrontProductImage from "../StorefrontProductImage";
import StorefrontSkeleton from "../StorefrontSkeleton";
import { getProductImageCandidates } from "../../utils/productImages";
import MobileBottomNav from "../MobileBottomNav";
import GracefulHeader from "../GracefulHeader";
import GracefulFooter from "../GracefulFooter";
import GracefulScrollTop from "../GracefulScrollTop";
import LanguageSwitcher from "../LanguageSwitcher";
import "../../styles/conversion-animations.css";
import {
  extractShopStudioConfig,
  hasShopStudioConfig,
  resolveShopPageLayoutHint,
} from "../../../utils/shopPageStudioConfig";
import { useSearch, type UseSearchResult } from "../../hooks/useSearch";
import { useStorefrontProductRouteScrollReset } from "../../hooks/useStorefrontProductRouteScrollReset";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useStorefrontVisitTracking } from "../../hooks/useStorefrontVisitTracking";
import {
  shouldStorefrontForceDocumentNavigation,
  shouldStorefrontForceDocumentNavigation as shouldStorefrontHeaderForceDocumentNavigation,
  isKhemetLuxeTheme,
} from "../../utils/navigationGuards";
import { resolveCatalogCategoryBySlug } from "../../utils/catalogCategories";
import { resolveLegacyProductSlugAlias } from "../../utils/productSlugAliases";
import { createStorefrontThemeTextReplacer } from "../../utils/runtimeBrandText";
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "../../utils/marketplaceApps";
import ProductImageLandingPage from "../../pages/ProductImageLandingPage";
import ReturnsPage from "../../pages/ReturnsPage";
import { useStorePage } from "../../../hooks/useStorePage";
import { footerSettingsService, type FooterSettings } from "../../../services/footerSettingsService";

import "../../styles/storefront-layout.css";

/* ─────────────────── Search Results ─────────────────── */
import type { Product } from "../../hooks/useProducts";
import { useProduct, setGlobalPresentationSlug } from "../../hooks/useProduct";

const GlobalConversionHost = React.lazy(
  () => import("../GlobalConversionHost"),
);
import StorePromotionBar from "../StorePromotionBar";
const StickyAddToCartHost = React.lazy(
  () => import("../StickyAddToCartHost"),
);
const LazyCartDrawer = React.lazy(() => import("../CartDrawer"));
const LegacyCollectionProductGrid = React.lazy(
  () => import("../../sections/ProductGrid"),
);

import { DeferredCartDrawerHost } from "../DeferredCartDrawerHost";
import { useDeferredStorefrontConversionHosts } from "../../hooks/useDeferredStorefrontConversionHosts";

const ARABIC_SCRIPT_PATTERN = /[\u0600-\u06FF]/;
const STOREFRONT_RUNTIME_PHARMACY_THEME_IDS = new Set([
  "max-care-go",
  "pharmacy-demo",
]);

const isRuntimePharmacyThemeId = (themeId?: string | null): boolean =>
  Boolean(themeId && STOREFRONT_RUNTIME_PHARMACY_THEME_IDS.has(themeId));
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

import { StorefrontSearchResults } from "../StorefrontSearchResults";
const SearchResults = StorefrontSearchResults;

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
  const isRedlineAutoHeader =
    theme.id === "redline-auto" || headerVariant === "automotive-chassis";
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
    <div className="border-t border-white/10 bg-[#090b0e] text-white" dir="rtl">
      <div className="container px-4 md:px-6">
        <div className="flex min-h-9 items-center justify-between text-xs text-white/80 [scrollbar-width:none]">
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto py-1">
            {showKhemetFreeShippingSignal ? (
              <span className="font-semibold text-white tracking-wide shrink-0">
                شحن مجاني فوق <span className="tabular-nums">{khemetFreeShippingThresholdText}</span>
              </span>
            ) : null}
            <span className="hidden sm:inline text-white/30 shrink-0">·</span>
            <span className="shrink-0 text-white/70">معاينة واستبدال المقاس عند الاستلام</span>
            <span className="hidden md:inline text-white/30 shrink-0">·</span>
            <span className="hidden md:inline text-white/70">تأكيد الطلب قبل التجهيز</span>
          </div>
          <Link
            to={khemetUtilityShopPath}
            reloadDocument={shouldForceDocumentNavigation}
            className="inline-flex shrink-0 items-center rounded-full bg-white px-3.5 py-1 text-[11px] font-bold text-black transition-all hover:bg-neutral-200 active:scale-[0.97]"
          >
            ابدئي الطلب
          </Link>
        </div>
      </div>
    </div>
  ) : null;

  // Resolve logo: theme header logoUrl → storefront settings logoUrl → company logo
  const displayLogoUrl =
    theme.header?.logoUrl ||
    settings?.storefront?.settings?.["logoUrl"] ||
    (settings?.company?.logo ? settings.company.logo : null);

  // Use dynamic nav links from theme if available, otherwise check designTokens.navigation.menu, then fallback
  const menuFromDesignTokens =
    (settings?.storefront?.settings?.["designTokens"] as any)?.navigation?.menu ||
    (settings?.["designTokens"] as any)?.navigation?.menu ||
    (settings?.storefront?.designTokens as any)?.navigation?.menu;

  const resolvedNavItems =
    Array.isArray(theme.header?.navigation) && theme.header.navigation.length > 0
      ? theme.header.navigation
      : Array.isArray(menuFromDesignTokens) && menuFromDesignTokens.length > 0
      ? menuFromDesignTokens.map((m: any) => ({ label: m.label || "", to: m.url || m.to || "/" }))
      : null;

  const navLinks = resolvedNavItems?.map((nav) => ({
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

  if (isRedlineAutoHeader && !isMinimal) {
    const announcementText =
      theme.header?.announcementText ||
      (theme.direction === "rtl"
        ? "عزل حراري 98% تفصيل فابريقة بالمللي • معاينة وتجربة على باب سيارتك قبل الدفع • ضمان 14 يوم استبدال"
        : "98% Thermal Insulation • Factory Custom Fit • Inspect & Try Before Payment • 14-Day Warranty");

    return (
      <>
        <header
          dir={theme.direction}
          className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0a0d10]/95 text-white shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all"
        >
          {/* Top Automotive Telemetry & Announcement Rail */}
          <div className="border-b border-white/[0.08] bg-[#06080a] py-2 px-4 text-[11px] font-medium text-white/80 select-none">
            <div className="container mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto [scrollbar-width:none]">
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-600/15 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-bold text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  عزل حراري 98%
                </span>
                <span className="shrink-0 text-white/90 font-semibold">
                  {announcementText}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3 text-[11px]">
                <a
                  href="https://wa.me/201500073277"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 text-white/75 hover:text-red-400 transition-colors"
                >
                  <span className="font-bold">واتساب المبيعات:</span>
                  <span dir="ltr" className="font-mono text-white/90">015 0007 3277</span>
                </a>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[10px] sm:text-[11px]">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  ضمان 14 يوم
                </span>
              </div>
            </div>
          </div>

          {/* Main Navigation Bar */}
          <div className="container flex h-16 sm:h-20 items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex items-center gap-3 lg:gap-6">
              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
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

              {/* Brand Logo & Emblem */}
              <StorefrontHomeLink {...brandHomeLinkProps} className="flex items-center gap-3 shrink-0">
                {displayLogoUrl ? (
                  <img
                    src={displayLogoUrl}
                    alt={displayStoreName}
                    className="h-9 w-auto object-contain"
                  />
                ) : (
                  <>
                    <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-red-500/40 bg-gradient-to-br from-[#1c0808] via-[#0d0f12] to-[#1a1e24] shadow-[0_0_20px_rgba(225,29,72,0.35)]">
                      <span className="font-heading text-sm sm:text-base font-black italic tracking-tighter text-white">RL</span>
                      <span className="absolute -bottom-0.5 inset-x-2 h-0.5 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444]" />
                    </div>
                    <div className="flex flex-col text-start leading-none">
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading text-lg sm:text-xl font-black italic tracking-wide text-white">
                          {displayStoreName || "RED LINE"}
                        </span>
                        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-black italic tracking-wider text-white shadow-sm">
                          AUTO
                        </span>
                      </div>
                      <span className="mt-1 text-[10px] font-bold tracking-wider text-white/50">
                        ستائر سيارات فابريقة
                      </span>
                    </div>
                  </>
                )}
              </StorefrontHomeLink>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
                {navLinks.map((link) => {
                  const active = isActive(link.to);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      reloadDocument={shouldForceDocumentNavigation}
                      className={`rounded-full px-3.5 py-1.5 text-xs lg:text-sm font-semibold transition-all ${
                        active
                          ? "bg-red-600/20 text-white border border-red-500/40 shadow-[0_0_15px_rgba(225,29,72,0.3)]"
                          : "text-white/75 hover:text-white hover:bg-white/[0.07]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Actions & Tools */}
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="https://wa.me/201500073277"
                target="_blank"
                rel="noreferrer"
                className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10 transition-colors"
              >
                <span>واتساب</span>
              </a>

              <Link
                to={buildStorefrontPath(location.pathname, "/shop", location.search)}
                reloadDocument={shouldForceDocumentNavigation}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-4 sm:px-5 py-2 text-xs sm:text-sm font-black text-white shadow-[0_0_24px_rgba(225,29,72,0.5)] hover:from-red-500 hover:to-rose-500 hover:scale-[1.02] active:scale-[0.97] transition-all"
              >
                اطلب ستارتك
              </Link>

              {showSearch ? (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="rounded-full p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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
                  className="relative rounded-full p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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
                    <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm">
                      {totalItems}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="border-t border-white/10 bg-[#0a0d10]/98 px-4 py-5 backdrop-blur-2xl md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-bold text-white/60">أقسام وموديلات الستائر</span>
                <span className="rounded-full bg-red-600/20 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400">
                  معاينة وتجربة قبل الدفع
                </span>
              </div>
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    reloadDocument={shouldForceDocumentNavigation}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors ${
                      isActive(link.to)
                        ? "bg-red-600/20 text-white border border-red-500/30 font-bold"
                        : "text-white/80 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{link.label}</span>
                    <svg className="w-4 h-4 rtl:rotate-180 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                ))}
              </nav>
              <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                <Link
                  to={buildStorefrontPath(location.pathname, "/shop", location.search)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-3 text-sm font-black text-white shadow-[0_0_24px_rgba(225,29,72,0.4)]"
                >
                  اطلب ستارة سيارتك الآن
                </Link>
                <a
                  href="https://wa.me/201500073277"
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-white/90 hover:bg-white/10"
                >
                  واتساب المبيعات: 01500073277
                </a>
              </div>
            </div>
          )}
        </header>

        {/* Search Overlay */}
        {searchOpen ? (
          <div className="fixed inset-0 z-[100] bg-[#0a0d10]/88 px-4 pt-20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="mx-auto max-w-2xl border border-white/15 bg-[#0f1318] p-3 rounded-2xl shadow-[0_36px_100px_-58px_rgba(0,0,0,0.95)]" dir={theme.direction}>
              <div className="relative">
                <svg
                  className={`absolute ${theme.direction === "rtl" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-red-500`}
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
                      ? "ابحث عن موديل سيارتك أو باقة الستائر..."
                      : "Search your car model or curtain set..."
                  }
                  className={`h-14 w-full rounded-xl border border-white/15 bg-[#141920] text-base text-white outline-none transition-colors placeholder:text-white/40 focus:border-red-500 ${
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
                  className={`absolute ${theme.direction === "rtl" ? "left-3" : "right-3"} top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white`}
                  aria-label={theme.direction === "rtl" ? "إغلاق البحث" : "Close search"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {query.length > 2 ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-[#141920] p-3">
                  <p className="mb-3 text-start text-sm font-semibold text-white/70">
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
                    className="mt-3 inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-500"
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

                <LanguageSwitcher />
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
export default MemoStorefrontHeader;
export { StorefrontHomeLink, resolveStorefrontDocumentLanguage, parsePositiveNumber, ARABIC_SCRIPT_PATTERN, isRuntimePharmacyThemeId };
