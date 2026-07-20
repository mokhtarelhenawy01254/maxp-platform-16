import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStorefrontTheme } from './ThemeProvider';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';

/** Map of route segments to human-readable page names */
const PAGE_NAME_MAP: Record<string, string> = {
  '': 'الرئيسية',
  shop: 'المتجر',
  cart: 'السلة',
  checkout: 'الدفع',
  product: 'المنتج',
  sale: 'التخفيضات',
  collections: 'التصنيفات',
  lookbook: 'اللوك بوك',
  'size-guide': 'دليل المقاسات',
  'thank-you': 'تم الطلب بنجاح',
};

/**
 * Apply a title template that supports both `%s` and `{{page}}`/`{{store}}` syntax.
 * Falls back to `pageTitle | storeName` if no template is set.
 */
const applyTitleTemplate = (
  template: string,
  pageTitle: string,
  storeName: string,
): string =>
  template
    .replace(/%s/g, pageTitle)
    .replace(/\{\{page\}\}/gi, pageTitle)
    .replace(/\{\{store\}\}/gi, storeName);

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveTitleTemplate = ({
  runtimeSeo,
  themeSeo,
  themeBrandNames,
  storeName,
}: {
  runtimeSeo: Record<string, unknown>;
  themeSeo: Record<string, unknown>;
  themeBrandNames: string[];
  storeName: string;
}): string => {
  const runtimeTitleTemplate =
    typeof runtimeSeo.titleTemplate === 'string'
      ? runtimeSeo.titleTemplate.trim()
      : '';
  if (runtimeTitleTemplate) {
    return runtimeTitleTemplate;
  }

  const themeTitleTemplate =
    typeof themeSeo.titleTemplate === 'string'
      ? themeSeo.titleTemplate.trim()
      : '';
  if (!themeTitleTemplate) {
    return `%s | ${storeName}`;
  }

  return themeBrandNames.reduce((template, brandName) => {
    const trimmedBrandName = brandName.trim();
    if (!trimmedBrandName || trimmedBrandName === storeName) {
      return template;
    }

    return template.replace(
      new RegExp(escapeRegExp(trimmedBrandName), 'g'),
      '{{store}}',
    );
  }, themeTitleTemplate);
};

/** Safely set or create a <meta> tag */
const setMetaTag = (
  selector: string,
  attribute: string,
  attributeValue: string,
  content: string,
): HTMLMetaElement => {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, attributeValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return el;
};

/** Safely set or create a <link> tag */
const setLinkTag = (
  rel: string,
  href: string,
): HTMLLinkElement => {
  const selector = `link[rel="${rel}"]`;
  let el = document.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  return el;
};

export const StorefrontHead: React.FC = () => {
  const { theme } = useStorefrontTheme();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const location = useLocation();

  useEffect(() => {
    if (!theme) return;

    const runtimeSeo = storefrontSettings?.storefront?.settings?.seo || {};
    const themeSeo = theme.seo || {};
    const seo = {
      ...themeSeo,
      ...(typeof runtimeSeo === 'object' && runtimeSeo !== null ? runtimeSeo : {}),
    };
    const companySettings =
      storefrontSettings?.company?.settings &&
      typeof storefrontSettings.company.settings === 'object'
        ? storefrontSettings.company.settings
        : {};

    // Use storefront settings name → theme brand name → theme name as fallback
    const storeName =
      storefrontSettings?.storefront?.settings?.storeName ||
      storefrontSettings?.storefrontSettings?.storeName ||
      theme.header?.brandName ||
      storefrontSettings?.company?.name ||
      theme.name ||
      '';
    const titleTemplate = resolveTitleTemplate({
      runtimeSeo:
        typeof runtimeSeo === 'object' && runtimeSeo !== null
          ? (runtimeSeo as Record<string, unknown>)
          : {},
      themeSeo: themeSeo as Record<string, unknown>,
      themeBrandNames: [theme.header?.brandName, theme.name].filter(
        (value): value is string => Boolean(value),
      ),
      storeName,
    });
    const defaultDescription =
      seo.description ||
      storefrontSettings?.storefront?.settings?.description ||
      storefrontSettings?.storefrontSettings?.description ||
      (typeof companySettings.description === 'string' ? companySettings.description : '') ||
      `${storeName} — تسوق أونلاين بأفضل الأسعار والعروض. شحن لكل المحافظات.`;
    const faviconUrl =
      seo.faviconUrl ||
      theme.header?.logoUrl ||
      storefrontSettings?.storefront?.settings?.['logoUrl'] ||
      storefrontSettings?.company?.logo ||
      undefined;

    const segments = location.pathname.split('/').filter(Boolean);
    const routeSegments = segments[0] === 'store' ? segments.slice(1) : segments;
    const pageSegment =
      routeSegments[0] === 'product'
        ? 'product'
        : routeSegments[0] || '';
    const pageTitle =
      PAGE_NAME_MAP[pageSegment] ||
      pageSegment.charAt(0).toUpperCase() + pageSegment.slice(1);

    // Apply Title
    const finalTitle = pageSegment
      ? applyTitleTemplate(titleTemplate, pageTitle, storeName)
      : storeName;
    const originalTitle = document.title;
    document.title = finalTitle;

    // Meta Description
    setMetaTag('meta[name="description"]', 'name', 'description', defaultDescription);

    // Favicon — use store logo as favicon if no dedicated favicon
    let faviconLink: HTMLLinkElement | null = null;
    if (faviconUrl) {
      faviconLink = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = faviconUrl;
    }

    // Dynamic og:url — use current page URL
    const currentUrl = window.location.href;
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', currentUrl);
    setMetaTag(
      'meta[property="og:type"]',
      'property',
      'og:type',
      pageSegment === 'product' ? 'product' : 'website',
    );

    // OG Tags
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', finalTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', defaultDescription);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', storeName);

    const defaultOgImage =
      seo.defaultOgImage ||
      storefrontSettings?.company?.logo ||
      undefined;

    if (defaultOgImage) {
      setMetaTag('meta[property="og:image"]', 'property', 'og:image', defaultOgImage);
      setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', defaultOgImage);
    }

    // Twitter Card Tags
    setMetaTag(
      'meta[name="twitter:card"]',
      'name',
      'twitter:card',
      defaultOgImage ? 'summary_large_image' : 'summary',
    );
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', finalTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', defaultDescription);

    // Canonical URL — strip presentation slug if present
    const PRESENTATION_PATH_PATTERN = /^\/(?:store\/)?(?:product|products|shop\/products)\/([^/?#]+)\/([^/?#]+)/;
    const presMatch = window.location.pathname.match(PRESENTATION_PATH_PATTERN);
    const canonicalUrl = presMatch
      ? `${window.location.origin}${presMatch[0].replace(/\/[^/?#]+$/, '')}${window.location.search}`
      : currentUrl;
    setLinkTag('canonical', canonicalUrl);

    // Cleanup on unmount: restore original title
    return () => {
      document.title = originalTitle;
    };
  }, [theme, location, storefrontSettings]);

  return null;
};
