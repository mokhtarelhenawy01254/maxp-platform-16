const path = require("path");

const DEFAULT_THEME_ID = "modern-minimal";

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
};

const RESERVED_PAGE_SEGMENTS = new Set([
  "shop",
  "cart",
  "checkout",
  "product",
  "sale",
  "collections",
  "lookbook",
  "size-guide",
  "thank-you",
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
    trimToNull(templateSettings.storeName) ||
    trimToNull(templateContent.storeName) ||
    trimToNull(company?.name) ||
    "Storefront"
  );
};

const resolveCompanyDescription = ({ company, storefrontSettings, templateSettings }) => {
  const companySettings = parseJsonObject(company?.settings);
  const designTokens = parseJsonObject(storefrontSettings?.designTokens);
  const templateSeo = parseJsonObject(templateSettings.seo);

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
    pageSegment === "product" && routeSegments[1]
      ? decodePathSegment(routeSegments[1])
      : null;
  const storePageSlug =
    routeSegments.length === 1 && !RESERVED_PAGE_SEGMENTS.has(pageSegment)
      ? decodePathSegment(pageSegment)
      : null;

  return {
    normalizedPath,
    rawSegments,
    routeSegments,
    pageSegment,
    productKey,
    storePageSlug,
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
  storePage = null,
}) => {
  const routeContext = resolveRouteContext(pathname);
  const templateSettings = extractTemplateSettings(templateContent);
  const templateSeo = parseJsonObject(templateSettings.seo);
  const themeId = resolveThemeId({
    designTokens: parseJsonObject(storefrontSettings?.designTokens),
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
  const defaultImage =
    resolveAbsoluteUrl(templateSeo.defaultOgImage, currentUrl) ||
    resolveAbsoluteUrl(company?.logo, currentUrl) ||
    null;
  const faviconUrl =
    resolveAbsoluteUrl(templateSeo.faviconUrl, currentUrl) ||
    resolveAbsoluteUrl(company?.logo, currentUrl) ||
    null;

  let title = storeName;
  let description = fallbackDescription;
  let image = defaultImage;
  let type = "website";

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
  } else if (!routeContext.isHomePage) {
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
    url: currentUrl,
    type,
    themeId,
    routeContext,
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
  }

  nextHtml = setLinkTag(nextHtml, "canonical", metadata.url);

  if (metadata.faviconUrl) {
    nextHtml = upsertTag(
      nextHtml,
      /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/i,
      `<link rel="icon" href="${escapeHtml(metadata.faviconUrl)}" />`,
    );
  }

  return nextHtml;
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

  if (path.posix.extname(req.path)) {
    return false;
  }

  const accept = String(req.headers.accept || "").toLowerCase();
  return !accept || accept.includes("text/html") || accept.includes("*/*");
};

module.exports = {
  PAGE_NAME_MAP,
  applyTitleTemplate,
  buildStorefrontSeoMetadata,
  injectStorefrontSeoTags,
  isHtmlRouteRequest,
  parseJsonObject,
  resolveRouteContext,
  resolveProductSeoOverrides,
  stripHtml,
};
