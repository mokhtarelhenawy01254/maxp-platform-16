import React, { useEffect, useMemo } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import type { StorefrontPageConfig } from "../types/theme.types";
import { PageComposer, type RenderSectionFrameArgs } from "../engine/PageComposer";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { useStorePage } from "../../hooks/useStorePage";
import StorefrontSkeleton from "../components/StorefrontSkeleton";
import StorefrontNotFound from "../components/StorefrontNotFound";
import { createStorefrontThemeTextReplacer } from "../utils/runtimeBrandText";
import { resolveStorefrontPageLayout, StorefrontSectionFrame } from "../layout/StorefrontSectionFrame";
import { buildStorefrontPath } from "../utils/paths";
import { sanitizeStorefrontHtml } from "../utils/html";
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

  const hasSections = Boolean(
    pageConfig && Array.isArray(pageConfig.sections) && pageConfig.sections.length > 0
  );

  // If page exists in designTokens/theme with sections, render via PageComposer directly.
  // Otherwise fall back to DB page content (rich-text).
  const shouldFetchDbPage = !hasSections && resolvedPageKey !== "home" && resolvedPageKey !== "shop";
  const { page: dbPage, loading: dbLoading } = useStorePage(
    shouldFetchDbPage ? pageSlug : undefined,
    shouldFetchDbPage ? settings?.company?.id : undefined,
  );

  // Sync dynamic page metadata with browser head
  useEffect(() => {
    const storeName =
      settings?.storefront?.settings?.storeName ||
      settings?.storefront?.name ||
      theme.header?.brandName ||
      theme.name ||
      '';

    if (hasSections && pageConfig) {
      const pageTitle =
        (pageConfig as any).title?.trim() ||
        (pageConfig as any).label?.trim() ||
        pageSlug ||
        '';
      document.title = pageTitle ? `${pageTitle} | ${storeName}` : storeName;
      return;
    }

    if (!dbPage) return;
    const pageTitle =
      dbPage.metaTitle?.trim() ||
      (dbPage.title ? `${dbPage.title} | ${storeName}` : storeName);
    document.title = pageTitle;

    const metaDesc =
      dbPage.metaDescription?.trim() ||
      dbPage.content?.replace(/<[^>]*>/g, '').slice(0, 160).trim();
    if (metaDesc) {
      let descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!descEl) {
        descEl = document.createElement('meta');
        descEl.setAttribute('name', 'description');
        document.head.appendChild(descEl);
      }
      descEl.setAttribute('content', metaDesc);
    }
  }, [dbPage, settings, theme, hasSections, pageConfig, pageSlug]);

  if (hasSections && pageConfig) {
    return (
      <PageComposer
        pageConfig={pageConfig}
        layout={resolveStorefrontPageLayout(pageConfig)}
        runtimeText={runtimeText}
        renderSectionFrame={StorefrontSectionFrame}
      />
    );
  }

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
    return <StorefrontNotFound />;
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
