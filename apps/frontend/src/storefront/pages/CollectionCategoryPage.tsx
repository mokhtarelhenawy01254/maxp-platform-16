import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useSearchParams, Link } from "react-router-dom";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import type { StorefrontPageConfig, StorefrontSectionConfig } from "../types/theme.types";
import { PageComposer } from "../engine/PageComposer";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { useCategories } from "../hooks/useCategories";
import StorefrontSkeleton from "../components/StorefrontSkeleton";
import StorefrontNotFound from "../components/StorefrontNotFound";
import { resolveCatalogCategoryBySlug } from "../utils/catalogCategories";
import { createStorefrontThemeTextReplacer } from "../utils/runtimeBrandText";
import { resolveStorefrontPageLayout, StorefrontSectionFrame } from "../layout/StorefrontSectionFrame";
import { buildStorefrontPath } from "../utils/paths";

const LegacyCollectionProductGrid = React.lazy(
  () => import("../sections/ProductGrid"),
);
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

  // Dynamic Category SEO sync for client-side transitions
  useEffect(() => {
    const storeName =
      settings?.storefront?.settings?.storeName ||
      settings?.storefront?.name ||
      theme.header?.brandName ||
      theme.name ||
      '';

    const rawMetaTitle = (matchedCategory as Record<string, unknown> | undefined)?.metaTitle;
    const pageTitle =
      (typeof rawMetaTitle === 'string' && rawMetaTitle.trim()) ||
      (categoryTitle ? `${categoryTitle} | ${storeName}` : storeName);

    document.title = pageTitle;

    const rawMetaDesc = (matchedCategory as Record<string, unknown> | undefined)?.metaDescription;
    const metaDesc =
      (typeof rawMetaDesc === 'string' && rawMetaDesc.trim()) ||
      matchedCategory?.description?.trim() ||
      `${categoryTitle} — تسوق أحدث المنتجات والعروض من ${storeName}`;

    let descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descEl) {
      descEl = document.createElement('meta');
      descEl.setAttribute('name', 'description');
      document.head.appendChild(descEl);
    }
    descEl.setAttribute('content', metaDesc);

    let ogTitleEl = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (!ogTitleEl) {
      ogTitleEl = document.createElement('meta');
      ogTitleEl.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitleEl);
    }
    ogTitleEl.setAttribute('content', pageTitle);
  }, [categoryTitle, matchedCategory, settings, theme]);

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
    return <StorefrontNotFound />;
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

export default CollectionCategoryPage;
