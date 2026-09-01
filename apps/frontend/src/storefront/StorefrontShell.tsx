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
            {theme.direction === "rtl" ? "آخر تحديث" : "Last updated"}:{" "}
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