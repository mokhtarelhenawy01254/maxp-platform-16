"use strict";

const path = require("path");

const DEFAULT_THEME_ID = "modern-minimal";

/** Absolute URL for the MaxP platform OG cover — used as ultimate fallback when
 *  a storefront has no logo/theme image configured. */
const PLATFORM_OG_COVER = "https://maxp.online/og-cover.png";

const PAGE_NAME_MAP = {
  "": "الرئيسية",
  shop: "المتجر",
  cart: "السلة",
  checkout: "الدفع",
  product: "المنتج",
  sale: "التخفيضات",
  collections: "التصنيفات",
  lookbook: "اللوك بوك",
  "size-guide": "دليل المقاسات",
  "thank-you": "تم الطلب بنجاح",
  "order-offer": "العرض الخاص",
  articles: "المقالات",
  blog: "المدونة",
};

const RESERVED_PAGE_SEGMENTS = new Set([
  "shop",
  "cart",
  "checkout",
  "product",
  "products",
  "sale",
  "collections",
  "category",
  "lookbook",
  "size-guide",
  "thank-you",
  "order-offer",
  "articles",
  "blog",
]);

const isRecord = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseJsonObject = (value) => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const trimToNull = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

const stripHtml = (value) =>
  typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";

const decodePathSegment = (segment) => {
  if (typeof segment !== "string") {
    return "";
  }

  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const titleizeSegment = (segment) =>
  segment
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const applyTitleTemplate = (template, pageTitle, storeName) =>
  template
    .replace(/%s/g, pageTitle)
    .replace(/\{\{page\}\}/gi, pageTitle)
    .replace(/\{\{store\}\}/gi, storeName);

const extractTemplateSettings = (templateContent) => {
  const safeTemplateContent = isRecord(templateContent) ? templateContent : {};
  return isRecord(safeTemplateContent.settings) ? safeTemplateContent.settings : {};
};

const resolveThemeId = ({ designTokens, templateSettings, templateContent }) =>
  trimToNull(designTokens.themeId) ||
  trimToNull(templateSettings.themeId) ||
  trimToNull(templateContent.themeId) ||
  DEFAULT_THEME_ID;

const resolveStoreName = ({ company, storefrontSettings, templateSettings, templateContent }) => {
  const designTokens = parseJsonObject(storefrontSettings?.designTokens);

  return (
    trimToNull(designTokens.storeName) ||
    trimToNull(templateSettings?.storeName) ||
    trimToNull(templateContent?.storeName) ||
    trimToNull(company?.name) ||
    "Storefront"
  );
};

const resolveCompanyDescription = ({ company, storefrontSettings, templateSettings }) => {
  const companySettings = parseJsonObject(company?.settings);
  const designTokens = parseJsonObject(storefrontSettings?.designTokens);
  const templateSeo = parseJsonObject(templateSettings?.seo);

  return (
    trimToNull(templateSeo.description) ||
    trimToNull(companySettings.description) ||
    trimToNull(designTokens.description) ||
    null
  );
};

const resolveAbsoluteUrl = (value, currentUrl) => {
  const normalized = trimToNull(value);
  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized, currentUrl).toString();
  } catch {
    return normalized;
  }
};

const cleanCanonicalUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  try {
    const u = new URL(rawUrl);
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "previewTheme",
      "previewProductId",
      "previewSource",
      "previewAdminOrigin",
      "session",
      "_ga",
      "_gl",
      "ref",
      "mc_cid",
      "mc_eid",
    ];
    trackingParams.forEach((param) => u.searchParams.delete(param));
    const clean = `${u.origin}${u.pathname}`;
    const remaining = u.searchParams.toString();
    return remaining ? `${clean}?${remaining}` : clean;
  } catch {
    return rawUrl.split("?")[0] || rawUrl;
  }
};

const extractImageList = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim());
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string" && item.trim());
    }
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const resolveProductImage = (product, currentUrl) => {
  const candidates = [
    product?.mainImage,
    product?.image,
    ...extractImageList(product?.images),
  ];

  const selected = candidates.find((item) => trimToNull(item));
  return selected ? resolveAbsoluteUrl(selected, currentUrl) : null;
};

const resolveProductSeoOverrides = (product) => {
  if (!isRecord(product)) {
    return {};
  }

  const metadata = parseJsonObject(product.metadata);
  const metadataSeo = parseJsonObject(metadata.seo);

  return {
    ...product,
    metaTitle:
      trimToNull(product.metaTitle) ||
      trimToNull(metadata.metaTitle) ||
      trimToNull(metadataSeo.metaTitle) ||
      trimToNull(metadataSeo.title) ||
      null,
    metaDescription:
      trimToNull(product.metaDescription) ||
      trimToNull(metadata.metaDescription) ||
      trimToNull(metadataSeo.metaDescription) ||
      trimToNull(metadataSeo.description) ||
      null,
  };
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const upsertTag = (html, pattern, replacement) => {
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }

  return html.replace("</head>", `  ${replacement}\n</head>`);
};

const setMetaTag = (html, attribute, key, value) =>
  upsertTag(
    html,
    new RegExp(
      `<meta[^>]+${attribute}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
      "i",
    ),
    `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`,
  );

const setLinkTag = (html, rel, href) =>
  upsertTag(
    html,
    new RegExp(
      `<link[^>]+rel=["']${rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
      "i",
    ),
    `<link rel="${rel}" href="${escapeHtml(href)}" />`,
  );

const resolveRouteContext = (pathname = "/") => {
  const normalizedPath = pathname.split("?")[0] || "/";
  const rawSegments = normalizedPath.split("/").filter(Boolean);
  const routeSegments = rawSegments[0] === "store" ? rawSegments.slice(1) : rawSegments;
  const pageSegment = routeSegments[0] || "";
  const productKey =
    (pageSegment === "product" || pageSegment === "products") && routeSegments[1]
      ? decodePathSegment(routeSegments[1])
      : null;
  const categorySlug =
    (pageSegment === "collections" || pageSegment === "category") && routeSegments[1]
      ? decodePathSegment(routeSegments[1])
      : null;
  const articleSlug =
    (pageSegment === "articles" || pageSegment === "blog") && routeSegments[1]
      ? decodePathSegment(routeSegments[1])
      : null;
  const storePageSlug =
    routeSegments.length === 1 && !RESERVED_PAGE_SEGMENTS.has(pageSegment)
      ? decodePathSegment(pageSegment)
      : null;
  const landingSlug =
    pageSegment === "lp" && routeSegments[1] ? decodePathSegment(routeSegments[1]) : null;

  return {
    normalizedPath,
    rawSegments,
    routeSegments,
    pageSegment,
    productKey,
    categorySlug,
    articleSlug,
    storePageSlug,
    landingSlug,
    isHomePage: routeSegments.length === 0,
  };
};

const buildStorefrontSeoMetadata = ({
  pathname = "/",
  currentUrl,
  company,
  storefrontSettings,
  templateContent,
  product = null,
  category = null,
  article = null,
  storePage = null,
  landing = null,
  reviews = null,
  noIndex = false,
}) => {
  const routeContext = resolveRouteContext(pathname);
  const templateSettings = extractTemplateSettings(templateContent);
  const templateSeo = parseJsonObject(templateSettings.seo);
  const designTokens = parseJsonObject(storefrontSettings?.designTokens);
  const companySettings = parseJsonObject(company?.settings);
  const themeId = resolveThemeId({
    designTokens,
    templateSettings,
    templateContent: isRecord(templateContent) ? templateContent : {},
  });
  const storeName = resolveStoreName({
    company,
    storefrontSettings,
    templateSettings,
    templateContent,
  });
  const fallbackDescription =
    resolveCompanyDescription({ company, storefrontSettings, templateSettings }) ||
    `${storeName} — تسوق أونلاين واكتشف أحدث المنتجات والعروض المتاحة الآن.`;
  const titleTemplate = trimToNull(templateSeo.titleTemplate) || "%s | {{store}}";
  const direction =
    trimToNull(designTokens?.direction) ||
    trimToNull(templateSettings?.direction) ||
    trimToNull(templateContent?.direction) ||
    "rtl";
  const defaultImage =
    resolveAbsoluteUrl(templateSeo.defaultOgImage, currentUrl) ||
    resolveAbsoluteUrl(company?.logo, currentUrl) ||
    PLATFORM_OG_COVER;
  const faviconUrl =
    resolveAbsoluteUrl(templateSeo.faviconUrl, currentUrl) ||
    resolveAbsoluteUrl(company?.logo, currentUrl) ||
    null;

  const urlObj = new URL(currentUrl);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

  // Clean canonical URL without tracking params
  let canonicalUrl = cleanCanonicalUrl(currentUrl);
  let title = storeName;
  let description = fallbackDescription;
  let image = defaultImage;
  let type = "website";
  let jsonLd = null;
  let price = null;
  let currency = product?.currency || company?.currency || "EGP";
  let availability = null;
  let sku = null;

  // Verification codes
  const googleSiteVerification =
    trimToNull(companySettings?.googleSiteVerification) ||
    trimToNull(designTokens?.googleSiteVerification) ||
    trimToNull(templateSeo?.googleSiteVerification) ||
    null;
  const facebookDomainVerification =
    trimToNull(companySettings?.facebookDomainVerification) ||
    trimToNull(designTokens?.facebookDomainVerification) ||
    trimToNull(templateSeo?.facebookDomainVerification) ||
    null;

  // Product landing pages (/store/lp/:slug): title/description/og-image come
  // from the landing's own seo field with product-derived fallbacks, and the
  // canonical URL is the landing URL itself.
  if (landing) {
    const landingSeo = parseJsonObject(landing.seo);
    const landingTitle =
      trimToNull(landingSeo.title) || trimToNull(landing.title) || storeName;
    title = trimToNull(landingSeo.title)
      ? landingTitle
      : applyTitleTemplate(titleTemplate, landingTitle, storeName);
    description =
      trimToNull(landingSeo.description) ||
      trimToNull(stripHtml(landing.productDescription)) ||
      fallbackDescription;
    image =
      resolveAbsoluteUrl(landingSeo.ogImage, currentUrl) ||
      resolveAbsoluteUrl(landing.productImage, currentUrl) ||
      defaultImage;
    type = "product";
    canonicalUrl = `${baseUrl}/store/lp/${encodeURIComponent(
      landing.slug || routeContext.landingSlug || "",
    )}`;

    const landingPriceNumber = Number(landing.productPrice);
    price =
      Number.isFinite(landingPriceNumber) && landingPriceNumber > 0
        ? landingPriceNumber
        : null;
    availability = "https://schema.org/InStock";

    jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: landingTitle,
      description,
      image: image ? [image] : [],
      brand: { "@type": "Brand", name: storeName },
      offers: {
        "@type": "Offer",
        price: price ?? undefined,
        priceCurrency: landing.currency || company?.currency || "EGP",
        availability,
        itemCondition: "https://schema.org/NewCondition",
        url: canonicalUrl,
      },
    };

    return {
      title,
      description,
      image,
      faviconUrl,
      siteName: storeName,
      url: canonicalUrl,
      type,
      themeId,
      direction,
      routeContext,
      jsonLd,
      price,
      currency: landing.currency || company?.currency || "EGP",
      availability,
      noIndex,
      googleSiteVerification,
      facebookDomainVerification,
    };
  }

  if (product) {
    const productWithSeoOverrides = resolveProductSeoOverrides(product);
    const productTitle =
      trimToNull(productWithSeoOverrides.metaTitle) ||
      trimToNull(productWithSeoOverrides.name) ||
      storeName;
    title = trimToNull(productWithSeoOverrides.metaTitle)
      ? productTitle
      : applyTitleTemplate(titleTemplate, productTitle, storeName);
    description =
      trimToNull(productWithSeoOverrides.metaDescription) ||
      trimToNull(stripHtml(productWithSeoOverrides.description)) ||
      fallbackDescription;
    image = resolveProductImage(productWithSeoOverrides, currentUrl) || defaultImage;
    type = "product";
    sku = trimToNull(product.sku);

    const priceNumber = Number(product.price);
    price = Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber : null;

    const isOutOfStock =
      product.trackInventory && Number(product.stock) <= 0;
    availability = isOutOfStock
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock";

    const prodSlug = product.slug || routeContext.productKey;
    canonicalUrl = `${baseUrl}/product/${encodeURIComponent(prodSlug)}`;

    const offers = {
      "@type": "Offer",
      price: price ?? undefined,
      priceCurrency: currency,
      availability,
      itemCondition: "https://schema.org/NewCondition",
      url: canonicalUrl,
    };

    if (product.saleEndDate) {
      try {
        offers.priceValidUntil = new Date(product.saleEndDate)
          .toISOString()
          .split("T")[0];
      } catch {}
    }

    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: productTitle,
      description,
      image: image ? [image] : [],
      brand: {
        "@type": "Brand",
        name: storeName,
      },
      offers,
    };

    if (sku) productSchema.sku = sku;
    if (product.barcode) productSchema.gtin = String(product.barcode).trim();

    if (reviews && Number(reviews.count) > 0 && Number(reviews.avgRating) > 0) {
      productSchema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Number(reviews.avgRating).toFixed(1),
        reviewCount: Number(reviews.count),
        bestRating: "5",
        worstRating: "1",
      };
    }

    const breadcrumbs = [
      {
        "@type": "ListItem",
        position: 1,
        name: "الرئيسية",
        item: `${baseUrl}/`,
      },
    ];

    if (product.category?.name) {
      const catSlug = product.category.slug || product.category.id;
      breadcrumbs.push({
        "@type": "ListItem",
        position: 2,
        name: product.category.name,
        item: `${baseUrl}/collections/${encodeURIComponent(catSlug)}`,
      });
    }

    breadcrumbs.push({
      "@type": "ListItem",
      position: breadcrumbs.length + 1,
      name: productTitle,
      item: canonicalUrl,
    });

    jsonLd = productSchema;
    const breadcrumbsJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs,
    };

    return {
      title,
      description,
      image,
      faviconUrl,
      siteName: storeName,
      url: canonicalUrl,
      type,
      themeId,
      direction,
      routeContext,
      jsonLd,
      breadcrumbsJsonLd,
      price,
      currency,
      availability,
      sku,
      noIndex,
      googleSiteVerification,
      facebookDomainVerification,
    };
  } else if (category) {
    const categoryTitle =
      trimToNull(category.metaTitle) ||
      trimToNull(category.name) ||
      storeName;
    title = trimToNull(category.metaTitle)
      ? categoryTitle
      : applyTitleTemplate(titleTemplate, categoryTitle, storeName);
    description =
      trimToNull(category.metaDescription) ||
      trimToNull(category.description) ||
      fallbackDescription;
    image = resolveAbsoluteUrl(category.image, currentUrl) || defaultImage;
    type = "website";

    const catSlug = category.slug || routeContext.categorySlug;
    canonicalUrl = `${baseUrl}/collections/${encodeURIComponent(catSlug)}`;

    jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: categoryTitle,
      description,
      url: canonicalUrl,
    };
    const breadcrumbsJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${baseUrl}/` },
        { "@type": "ListItem", position: 2, name: categoryTitle, item: canonicalUrl },
      ],
    };

    return {
      title,
      description,
      image,
      faviconUrl,
      siteName: storeName,
      url: canonicalUrl,
      type,
      themeId,
      direction,
      routeContext,
      jsonLd,
      breadcrumbsJsonLd,
      noIndex,
      googleSiteVerification,
      facebookDomainVerification,
    };
  } else if (article) {
    const articleTitle =
      trimToNull(article.seoTitle) ||
      trimToNull(article.title) ||
      storeName;
    title = trimToNull(article.seoTitle)
      ? articleTitle
      : applyTitleTemplate(titleTemplate, articleTitle, storeName);
    description =
      trimToNull(article.seoDescription) ||
      trimToNull(article.excerpt) ||
      fallbackDescription;
    image = resolveAbsoluteUrl(article.heroImage, currentUrl) || defaultImage;
    type = "article";

    canonicalUrl = `${baseUrl}/articles/${encodeURIComponent(article.slug || routeContext.articleSlug)}`;

    jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: articleTitle,
      description,
      image: image ? [image] : [],
      datePublished: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : undefined,
      dateModified: article.updatedAt
        ? new Date(article.updatedAt).toISOString()
        : undefined,
      author: {
        "@type": "Person",
        name: article.authorName || storeName,
      },
      publisher: {
        "@type": "Organization",
        name: storeName,
        logo: defaultImage ? { "@type": "ImageObject", url: defaultImage } : undefined,
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonicalUrl,
      },
    };
    const breadcrumbsJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${baseUrl}/` },
        { "@type": "ListItem", position: 2, name: "المقالات", item: `${baseUrl}/articles` },
        { "@type": "ListItem", position: 3, name: articleTitle, item: canonicalUrl },
      ],
    };

    return {
      title,
      description,
      image,
      faviconUrl,
      siteName: storeName,
      url: canonicalUrl,
      type,
      themeId,
      direction,
      routeContext,
      jsonLd,
      breadcrumbsJsonLd,
      noIndex,
      googleSiteVerification,
      facebookDomainVerification,
    };
  } else if (storePage) {
    const pageTitle =
      trimToNull(storePage.metaTitle) ||
      trimToNull(storePage.title) ||
      titleizeSegment(routeContext.pageSegment) ||
      storeName;
    title = trimToNull(storePage.metaTitle)
      ? pageTitle
      : applyTitleTemplate(titleTemplate, pageTitle, storeName);
    description = trimToNull(storePage.metaDescription) || fallbackDescription;
    canonicalUrl = `${baseUrl}/${encodeURIComponent(storePage.slug || routeContext.storePageSlug)}`;
  } else if (routeContext.isHomePage) {
    title = storeName;
    description = fallbackDescription;
    canonicalUrl = `${baseUrl}/`;

    jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: storeName,
      url: `${baseUrl}/`,
      potentialAction: {
        "@type": "SearchAction",
        target: `${baseUrl}/shop?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };

    const footerSocial = isRecord(templateContent?.footer?.socialLinks)
      ? templateContent.footer.socialLinks
      : isRecord(templateSettings?.footer?.socialLinks)
      ? templateSettings.footer.socialLinks
      : {};
    const socialCandidates = [
      companySettings?.facebook,
      companySettings?.instagram,
      companySettings?.tiktok,
      companySettings?.twitter,
      companySettings?.youtube,
      companySettings?.snapchat,
      footerSocial?.facebook,
      footerSocial?.instagram,
      footerSocial?.tiktok,
      footerSocial?.twitter,
      footerSocial?.youtube,
      footerSocial?.snapchat,
    ];
    const sameAs = Array.from(
      new Set(
        socialCandidates
          .filter((url) => typeof url === "string" && url.trim().startsWith("http"))
          .map((url) => url.trim()),
      ),
    );

    const contactPhone = trimToNull(
      company?.phone ||
      companySettings?.phone ||
      companySettings?.whatsapp ||
      templateContent?.footer?.phoneText,
    );
    const contactEmail = trimToNull(
      company?.email ||
      companySettings?.email ||
      templateContent?.footer?.emailText,
    );

    const secondaryJsonLd = {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: storeName,
      url: `${baseUrl}/`,
      logo: defaultImage || undefined,
      description: fallbackDescription || undefined,
      telephone: contactPhone || undefined,
      email: contactEmail || undefined,
      priceRange: "$$",
      sameAs: sameAs.length > 0 ? sameAs : undefined,
    };

    return {
      title,
      description,
      image,
      faviconUrl,
      siteName: storeName,
      url: canonicalUrl,
      type,
      themeId,
      direction,
      routeContext,
      jsonLd,
      secondaryJsonLd,
      noIndex,
      googleSiteVerification,
      facebookDomainVerification,
    };
  } else {
    const pageTitle =
      PAGE_NAME_MAP[routeContext.pageSegment] ||
      titleizeSegment(routeContext.pageSegment) ||
      storeName;
    title = applyTitleTemplate(titleTemplate, pageTitle, storeName);
  }

  return {
    title,
    description,
    image,
    faviconUrl,
    siteName: storeName,
    url: canonicalUrl,
    type,
    themeId,
    direction,
    routeContext,
    jsonLd,
    price,
    currency,
    availability,
    sku,
    noIndex,
    googleSiteVerification,
    facebookDomainVerification,
  };
};

const injectStorefrontSeoTags = (html, metadata) => {
  let nextHtml = html.replace(
    /<title>.*?<\/title>/i,
    `<title>${escapeHtml(metadata.title)}</title>`,
  );

  nextHtml = setMetaTag(nextHtml, "name", "description", metadata.description);
  nextHtml = setMetaTag(nextHtml, "property", "og:title", metadata.title);
  nextHtml = setMetaTag(nextHtml, "property", "og:description", metadata.description);
  nextHtml = setMetaTag(nextHtml, "property", "og:type", metadata.type || "website");
  nextHtml = setMetaTag(nextHtml, "property", "og:url", metadata.url);
  nextHtml = setMetaTag(nextHtml, "property", "og:site_name", metadata.siteName);
  nextHtml = setMetaTag(
    nextHtml,
    "name",
    "twitter:card",
    metadata.image ? "summary_large_image" : "summary",
  );
  nextHtml = setMetaTag(nextHtml, "name", "twitter:title", metadata.title);
  nextHtml = setMetaTag(nextHtml, "name", "twitter:description", metadata.description);

  if (metadata.image) {
    nextHtml = setMetaTag(nextHtml, "property", "og:image", metadata.image);
    nextHtml = setMetaTag(nextHtml, "name", "twitter:image", metadata.image);
    nextHtml = setMetaTag(nextHtml, "property", "og:image:width", "1200");
    nextHtml = setMetaTag(nextHtml, "property", "og:image:height", "630");
  }

  nextHtml = setLinkTag(nextHtml, "canonical", metadata.url);

  // OpenGraph commerce tags for products
  if (metadata.type === "product") {
    if (metadata.price !== undefined && metadata.price !== null) {
      nextHtml = setMetaTag(nextHtml, "property", "product:price:amount", String(metadata.price));
      nextHtml = setMetaTag(nextHtml, "property", "product:price:currency", metadata.currency || "EGP");
    }
    if (metadata.availability) {
      nextHtml = setMetaTag(nextHtml, "property", "product:availability", metadata.availability);
    }
    if (metadata.sku) {
      nextHtml = setMetaTag(nextHtml, "property", "product:retailer_item_id", metadata.sku);
    }
  }

  // Preload primary image for PDP
  if (metadata.type === "product" && metadata.image) {
    nextHtml = upsertTag(
      nextHtml,
      /<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]*>/i,
      `<link rel="preload" as="image" href="${escapeHtml(metadata.image)}" fetchpriority="high" />`,
    );
  }

  // Preload critical storefront settings API so browser fetches it concurrently with script chunks
  nextHtml = upsertTag(
    nextHtml,
    /<link[^>]+rel=["']preload["'][^>]+as=["']fetch["'][^>]*>/i,
    `<link rel="preload" href="/api/v1/public/storefront/settings" as="fetch" crossorigin="use-credentials" />`,
  );

  // Verification tags
  if (metadata.googleSiteVerification) {
    nextHtml = setMetaTag(nextHtml, "name", "google-site-verification", metadata.googleSiteVerification);
  }
  if (metadata.facebookDomainVerification) {
    nextHtml = setMetaTag(nextHtml, "name", "facebook-domain-verification", metadata.facebookDomainVerification);
  }

  // Robots noindex if requested (e.g. 404s, sensitive pages)
  if (metadata.noIndex) {
    nextHtml = setMetaTag(nextHtml, "name", "robots", "noindex, follow");
  }

  const allJsonLd = [
    metadata.jsonLd,
    metadata.breadcrumbsJsonLd,
    metadata.secondaryJsonLd,
  ].filter(Boolean);

  if (allJsonLd.length > 0) {
    const scripts = allJsonLd
      .map(
        (item) =>
          `<script type="application/ld+json">${JSON.stringify(item).replace(/</g, "\\u003c")}</script>`,
      )
      .join("\n  ");

    nextHtml = upsertTag(
      nextHtml,
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>.*?<\/script>/is,
      scripts,
    );
  }

  // Replace both standard and SVG icons so store logo always represents the site
  if (metadata.faviconUrl) {
    nextHtml = upsertTag(
      nextHtml,
      /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/i,
      `<link rel="icon" href="${escapeHtml(metadata.faviconUrl)}" />\n  <link rel="apple-touch-icon" href="${escapeHtml(metadata.faviconUrl)}" />`,
    );
  }

  // Dynamic html lang and dir matching theme
  const htmlLang = metadata.direction === "ltr" ? "en" : "ar";
  const htmlDir = metadata.direction === "ltr" ? "ltr" : "rtl";
  nextHtml = nextHtml.replace(/<html([^>]*)>/i, (_match, attrs) => {
    let newAttrs = attrs;
    if (/lang=["'][^"']*["']/i.test(newAttrs)) {
      newAttrs = newAttrs.replace(/lang=["'][^"']*["']/i, `lang="${htmlLang}"`);
    } else {
      newAttrs = ` lang="${htmlLang}"` + newAttrs;
    }
    if (/dir=["'][^"']*["']/i.test(newAttrs)) {
      newAttrs = newAttrs.replace(/dir=["'][^"']*["']/i, `dir="${htmlDir}"`);
    } else {
      newAttrs = ` dir="${htmlDir}"` + newAttrs;
    }
    return `<html${newAttrs}>`;
  });

  // Resource hints (preconnect & dns-prefetch) for external CDN image origins
  const resourceHints = [];
  const knownOrigins = new Set();

  if (metadata.image && typeof metadata.image === "string" && metadata.image.startsWith("http")) {
    try {
      const imgOrigin = new URL(metadata.image).origin;
      const pageOrigin =
        metadata.url && typeof metadata.url === "string" && metadata.url.startsWith("http")
          ? new URL(metadata.url).origin
          : null;
      if (imgOrigin && imgOrigin !== pageOrigin && !knownOrigins.has(imgOrigin)) {
        knownOrigins.add(imgOrigin);
        resourceHints.push(`<link rel="preconnect" href="${escapeHtml(imgOrigin)}" crossorigin />`);
        resourceHints.push(`<link rel="dns-prefetch" href="${escapeHtml(imgOrigin)}" />`);
      }
    } catch {}
  }

  if (nextHtml.includes("unsplash.com") && !knownOrigins.has("https://images.unsplash.com")) {
    knownOrigins.add("https://images.unsplash.com");
    resourceHints.push(`<link rel="preconnect" href="https://images.unsplash.com" crossorigin />`);
    resourceHints.push(`<link rel="dns-prefetch" href="https://images.unsplash.com" />`);
  }

  if (resourceHints.length > 0) {
    const hintTags = resourceHints.join("\n  ");
    if (nextHtml.includes("</head>")) {
      nextHtml = nextHtml.replace("</head>", `  ${hintTags}\n</head>`);
    }
  }

  return nextHtml;
};

const STATIC_ASSET_EXTENSIONS = new Set([
  ".js", ".mjs", ".cjs", ".css", ".map",
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico", ".avif", ".bmp", ".tiff",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".mp4", ".webm", ".ogv", ".mp3", ".wav", ".flac", ".aac",
  ".json", ".xml", ".txt", ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z",
  ".wasm"
]);

const hasStaticFileExtension = (requestPath) => {
  if (!requestPath || typeof requestPath !== "string") return false;
  const ext = path.posix.extname(requestPath).toLowerCase();
  if (!ext) return false;
  return STATIC_ASSET_EXTENSIONS.has(ext);
};

const isHtmlRouteRequest = (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }

  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/socket.io") ||
    req.path.startsWith("/uploads")
  ) {
    return false;
  }

  if (hasStaticFileExtension(req.path)) {
    return false;
  }

  const accept = String(req.headers.accept || "").toLowerCase();
  return !accept || accept.includes("text/html") || accept.includes("*/*");
};

module.exports = {
  PAGE_NAME_MAP,
  applyTitleTemplate,
  buildStorefrontSeoMetadata,
  cleanCanonicalUrl,
  hasStaticFileExtension,
  injectStorefrontSeoTags,
  isHtmlRouteRequest,
  parseJsonObject,
  resolveRouteContext,
  resolveProductSeoOverrides,
  stripHtml,
};
