import React, { useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import type { StorefrontPageConfig } from "../types/theme.types";
import { PageComposer, type RenderSectionFrameArgs } from "../engine/PageComposer";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { useStorePage } from "../../hooks/useStorePage";
import StorefrontSkeleton from "../components/StorefrontSkeleton";
import { createStorefrontThemeTextReplacer } from "../utils/runtimeBrandText";
import { resolveStorefrontPageLayout, StorefrontSectionFrame } from "../StorefrontShell";
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



export default DynamicStorefrontPage;
