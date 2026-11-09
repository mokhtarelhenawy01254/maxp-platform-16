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
  category: 'التصنيف',
  collections: 'التصنيفات',
  articles: 'المدونة',
  article: 'المقال',
  blog: 'المدونة',
  sale: 'التخفيضات',
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

let activeStorefrontHeadInstances = 0;
let originalTitleSnapshot: string | null = null;
let originalRobotsSnapshot: { exists: boolean; content: string | null } | null = null;
let originalDescSnapshot: { exists: boolean; content: string | null } | null = null;
let originalCanonicalSnapshot: { exists: boolean; href: string | null } | null = null;
let originalOgTitleSnapshot: { exists: boolean; content: string | null } | null = null;
let originalOgDescSnapshot: { exists: boolean; content: string | null } | null = null;
let originalOgImageSnapshot: { exists: boolean; content: string | null } | null = null;

export const __resetStorefrontHeadStateForTests__ = () => {
  activeStorefrontHeadInstances = 0;
  originalTitleSnapshot = null;
  originalRobotsSnapshot = null;
  originalDescSnapshot = null;
  originalCanonicalSnapshot = null;
  originalOgTitleSnapshot = null;
  originalOgDescSnapshot = null;
  originalOgImageSnapshot = null;
};

export interface StorefrontHeadProps {
  settings?: any;
  theme?: any;
  activePageKey?: string;
  productImage?: string;
}

export const StorefrontHead: React.FC<StorefrontHeadProps> = ({
  settings: propSettings,
  theme: propTheme,
  activePageKey: propActivePageKey,
  productImage,
}) => {
  const themeContext = useStorefrontTheme();
  const settingsContext = useStorefrontSettings();
  const location = useLocation();

  const theme = propTheme ?? themeContext?.theme ?? null;
  const storefrontSettings = propSettings ?? settingsContext?.settings ?? null;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!theme && !storefrontSettings) return;

    activeStorefrontHeadInstances += 1;

    // PAGE-1.2 & PAGE-1.3: Capture original head metadata for unmount restoration
    const currentRobotsEl = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const currentDescEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const currentCanonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const currentOgTitleEl = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const currentOgDescEl = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    const currentOgImageEl = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');

    if (activeStorefrontHeadInstances === 1 && originalTitleSnapshot === null) {
      originalTitleSnapshot = document.title;
      originalRobotsSnapshot = {
        exists: Boolean(currentRobotsEl),
        content: currentRobotsEl ? currentRobotsEl.getAttribute('content') : null,
      };
      originalDescSnapshot = {
        exists: Boolean(currentDescEl),
        content: currentDescEl ? currentDescEl.getAttribute('content') : null,
      };
      originalCanonicalSnapshot = {
        exists: Boolean(currentCanonicalEl),
        href: currentCanonicalEl ? currentCanonicalEl.getAttribute('href') : null,
      };
      originalOgTitleSnapshot = {
        exists: Boolean(currentOgTitleEl),
        content: currentOgTitleEl ? currentOgTitleEl.getAttribute('content') : null,
      };
      originalOgDescSnapshot = {
        exists: Boolean(currentOgDescEl),
        content: currentOgDescEl ? currentOgDescEl.getAttribute('content') : null,
      };
      originalOgImageSnapshot = {
        exists: Boolean(currentOgImageEl),
        content: currentOgImageEl ? currentOgImageEl.getAttribute('content') : null,
      };
    }

    const originalTitle = originalTitleSnapshot ?? document.title;

    const runtimeSeo =
      storefrontSettings?.storefront?.settings?.seo ||
      storefrontSettings?.storefront?.designTokens?.seo ||
      storefrontSettings?.storefrontSettings?.designTokens?.seo ||
      (storefrontSettings as any)?.designTokens?.seo ||
      (storefrontSettings as any)?.seo ||
      {};
    const themeSeo = theme?.seo || {};
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
      storefrontSettings?.storefront?.designTokens?.storeName ||
      (storefrontSettings as any)?.storeName ||
      theme?.header?.brandName ||
      storefrontSettings?.company?.name ||
      theme?.name ||
      '';
    const titleTemplate = resolveTitleTemplate({
      runtimeSeo:
        typeof runtimeSeo === 'object' && runtimeSeo !== null
          ? (runtimeSeo as Record<string, unknown>)
          : {},
      themeSeo: themeSeo as Record<string, unknown>,
      themeBrandNames: [theme?.header?.brandName, theme?.name].filter(
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
      theme?.header?.logoUrl ||
      storefrontSettings?.storefront?.settings?.['logoUrl'] ||
      storefrontSettings?.company?.logo ||
      undefined;

    const segments = location.pathname.split('/').filter(Boolean);
    let routeSegments = segments[0] === 'store' ? segments.slice(1) : segments;
    if (
      segments[0] === 'store' &&
      routeSegments.length > 0 &&
      !['shop', 'products', 'product', 'cart', 'checkout', 'pages'].includes(routeSegments[0])
    ) {
      routeSegments = routeSegments.slice(1);
    }
    const pageSegment =
      routeSegments[0] === 'product'
        ? 'product'
        : routeSegments[0] || '';
    const pageTitle =
      PAGE_NAME_MAP[pageSegment] ||
      pageSegment.charAt(0).toUpperCase() + pageSegment.slice(1);

    // PAGE-1.2 & PAGE-1.3: Resolve active page configuration across theme & designTokens
    const allPages: Record<string, any> = {};
    const candidateSources = [
      theme?.pages,
      (theme as any)?.designTokens?.pages,
      (storefrontSettings as any)?.pages,
      (storefrontSettings as any)?.storefront?.pages,
      (storefrontSettings as any)?.storefrontSettings?.pages,
      (storefrontSettings?.storefront?.settings as any)?.pages,
      (storefrontSettings as any)?.settings?.pages,
      (storefrontSettings as any)?.designTokens?.pages,
      (storefrontSettings?.storefront?.settings as any)?.designTokens?.pages,
      (storefrontSettings as any)?.settings?.designTokens?.pages,
      storefrontSettings?.storefrontSettings?.designTokens?.pages,
      storefrontSettings?.storefront?.designTokens?.pages,
    ];

    for (const candidate of candidateSources) {
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        for (const [key, val] of Object.entries(candidate)) {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            allPages[key] = {
              ...(allPages[key] || {}),
              ...val,
              seo: {
                ...((allPages[key] as any)?.seo || {}),
                ...((val as any)?.seo || {}),
              },
            };
          }
        }
      }
    }

    let activePageKey = propActivePageKey || 'home';
    if (!propActivePageKey) {
      if (routeSegments.length === 0) {
        activePageKey = 'home';
      } else if (routeSegments[0] === 'pages' && routeSegments[1]) {
        activePageKey = routeSegments.slice(1).join('/');
      } else if (routeSegments[0] === 'shop' && routeSegments[1] === 'page' && routeSegments[2]) {
        activePageKey = routeSegments.slice(2).join('/');
      } else {
        const fullPath = routeSegments.join('/');
        if (allPages[fullPath]) {
          activePageKey = fullPath;
        } else if (allPages[routeSegments[0]]) {
          activePageKey = routeSegments[0];
        } else {
          activePageKey = routeSegments[0] || 'home';
        }
      }
    }

    const activePage =
      allPages[activePageKey] ||
      (activePageKey === 'pdp' ? allPages['product'] : undefined) ||
      (activePageKey === 'product' ? allPages['pdp'] : undefined);
    const pageSeo = activePage?.seo;

    const isDynamicDetailRoute =
      pageSegment === 'product' ||
      pageSegment === 'article' ||
      pageSegment === 'articles' ||
      (pageSegment === 'category' && routeSegments.length > 1);

    const genericTitles = new Set([
      'المنتج',
      `المنتج | ${storeName}`,
      'المقال',
      `المقال | ${storeName}`,
      'التصنيف',
      `التصنيف | ${storeName}`,
    ]);

    const isCorruptedTitle = (t: string) => {
      const s = t.trim();
      return !s || /^\?{2,}/.test(s) || s.includes('???');
    };

    const shouldPreserveExistingTitle =
      isDynamicDetailRoute &&
      Boolean(originalTitle.trim()) &&
      !genericTitles.has(originalTitle.trim()) &&
      !isCorruptedTitle(originalTitle);

    // Apply Title: prefer pageSeo.title if configured, else fallback
    let finalTitle: string;
    if (pageSeo?.title?.trim()) {
      const customTitle = pageSeo.title.trim();
      finalTitle =
        storeName && !customTitle.includes(storeName)
          ? `${customTitle} | ${storeName}`
          : customTitle;
    } else if (shouldPreserveExistingTitle) {
      finalTitle = originalTitle;
    } else if (activePage?.title?.trim() && activePageKey !== 'home') {
      finalTitle = `${activePage.title.trim()} | ${storeName}`;
    } else if (pageSegment) {
      finalTitle = applyTitleTemplate(titleTemplate, pageTitle, storeName);
    } else {
      finalTitle = storeName;
    }

    // SEO: صفحة المنتج/المقال تعرض اسم العنصر فقط بدون لاحقة "| اسم المتجر"
    if (isDynamicDetailRoute && storeName) {
      const storeSuffix = `| ${storeName}`;
      const trimmedTitle = finalTitle.trim();
      if (trimmedTitle.toLowerCase().endsWith(storeSuffix.toLowerCase())) {
        finalTitle = trimmedTitle.slice(0, trimmedTitle.length - storeSuffix.length).trim();
      }
    }

    if (pageSeo?.title?.trim() || !shouldPreserveExistingTitle || isDynamicDetailRoute) {
      document.title = finalTitle;
    }

    // Robots Tag: noindex in pageSeo -> "noindex, nofollow"
    const searchParams = new URLSearchParams(location.search);
    const hasSearchFilterParams =
      searchParams.has('search') ||
      searchParams.has('q') ||
      searchParams.has('minPrice') ||
      searchParams.has('maxPrice') ||
      searchParams.has('sortBy') ||
      searchParams.has('sort') ||
      searchParams.has('preview') ||
      searchParams.has('previewTheme');

    if (pageSeo?.noindex) {
      setMetaTag('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow');
    } else if (hasSearchFilterParams) {
      setMetaTag('meta[name="robots"]', 'name', 'robots', 'noindex, follow');
    } else {
      setMetaTag(
        'meta[name="robots"]',
        'name',
        'robots',
        'index, follow, max-image-preview:large',
      );
    }

    // Meta Description: prefer pageSeo.description if available.
    // Dynamic detail routes (product/article) receive a server-rendered
    // description specific to the entity; preserve it instead of replacing it
    // with the generic store description on hydration.
    const preservedDescription = (originalDescSnapshot?.content || '').trim();
    const shouldPreserveExistingDescription =
      isDynamicDetailRoute &&
      Boolean(preservedDescription) &&
      preservedDescription !== defaultDescription.trim();
    const finalDescription =
      pageSeo?.description?.trim() ||
      (shouldPreserveExistingDescription
        ? preservedDescription
        : defaultDescription);
    setMetaTag('meta[name="description"]', 'name', 'description', finalDescription);

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

    // OG & Twitter Tags
    const ogTitle = pageSeo?.title?.trim() || finalTitle;
    const ogDescription = pageSeo?.description?.trim() || finalDescription;
    const defaultOgImage =
      seo.defaultOgImage ||
      storefrontSettings?.company?.logo ||
      undefined;
    const ogImage = productImage?.trim() || pageSeo?.ogImage?.trim() || defaultOgImage;

    setMetaTag('meta[property="og:title"]', 'property', 'og:title', ogTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', ogDescription);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', storeName);

    if (ogImage) {
      setMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImage);
      setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);
    }

    // Twitter Card Tags
    setMetaTag(
      'meta[name="twitter:card"]',
      'name',
      'twitter:card',
      ogImage ? 'summary_large_image' : 'summary',
    );
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', ogTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', ogDescription);

    // Canonical URL — prefer pageSeo.canonical if provided, otherwise clean URL
    let canonicalUrl = currentUrl;
    if (pageSeo?.canonical?.trim()) {
      canonicalUrl = pageSeo.canonical.trim();
    } else {
      try {
        const parsedUrl = new URL(window.location.href);
        const trackingParams = [
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'utm_term',
          'utm_content',
          'fbclid',
          'gclid',
          'msclkid',
          'preview',
          'previewTheme',
          '_ga',
          '_gl',
        ];
        trackingParams.forEach((param) => parsedUrl.searchParams.delete(param));
        canonicalUrl = parsedUrl.toString();
      } catch {
        canonicalUrl = `${window.location.origin}${window.location.pathname}`;
      }
    }
    setLinkTag('canonical', canonicalUrl);

    // PAGE-1.3: Proof of execution marker
    document.documentElement.setAttribute('data-seo-applied', '1');
    document.documentElement.setAttribute('data-storefront-seo', activePageKey);

    // Cleanup on unmount — restore previous title and meta/link tags
    return () => {
      activeStorefrontHeadInstances = Math.max(0, activeStorefrontHeadInstances - 1);

      if (activeStorefrontHeadInstances === 0) {
        document.documentElement.removeAttribute('data-seo-applied');
        document.documentElement.removeAttribute('data-storefront-seo');

        if (originalTitleSnapshot !== null) {
          document.title = originalTitleSnapshot;
        }

        const livingRobotsEl = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
        if (livingRobotsEl) {
          if (originalRobotsSnapshot?.exists && originalRobotsSnapshot.content !== null) {
            livingRobotsEl.setAttribute('content', originalRobotsSnapshot.content);
          } else {
            livingRobotsEl.remove();
          }
        }

        const livingDescEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (livingDescEl) {
          if (originalDescSnapshot?.exists && originalDescSnapshot.content !== null) {
            livingDescEl.setAttribute('content', originalDescSnapshot.content);
          } else {
            livingDescEl.remove();
          }
        }

        const livingCanonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (livingCanonicalEl) {
          if (originalCanonicalSnapshot?.exists && originalCanonicalSnapshot.href !== null) {
            livingCanonicalEl.setAttribute('href', originalCanonicalSnapshot.href);
          } else {
            livingCanonicalEl.remove();
          }
        }

        const livingOgTitleEl = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
        if (livingOgTitleEl) {
          if (originalOgTitleSnapshot?.exists && originalOgTitleSnapshot.content !== null) {
            livingOgTitleEl.setAttribute('content', originalOgTitleSnapshot.content);
          } else {
            livingOgTitleEl.remove();
          }
        }

        const livingOgDescEl = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
        if (livingOgDescEl) {
          if (originalOgDescSnapshot?.exists && originalOgDescSnapshot.content !== null) {
            livingOgDescEl.setAttribute('content', originalOgDescSnapshot.content);
          } else {
            livingOgDescEl.remove();
          }
        }

        const livingOgImageEl = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
        if (livingOgImageEl) {
          if (originalOgImageSnapshot?.exists && originalOgImageSnapshot.content !== null) {
            livingOgImageEl.setAttribute('content', originalOgImageSnapshot.content);
          } else {
            livingOgImageEl.remove();
          }
        }

        originalTitleSnapshot = null;
        originalRobotsSnapshot = null;
        originalDescSnapshot = null;
        originalCanonicalSnapshot = null;
        originalOgTitleSnapshot = null;
        originalOgDescSnapshot = null;
        originalOgImageSnapshot = null;
      }
    };
  }, [theme, location, storefrontSettings, propSettings, propTheme, propActivePageKey, productImage]);

  return null;
};