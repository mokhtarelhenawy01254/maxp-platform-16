const fs = require("fs/promises");
const path = require("path");

const {
  getSharedPrismaClientAsync,
  safeQuery,
} = require("../services/sharedDatabase");
const {
  buildStorefrontSeoMetadata,
  injectStorefrontSeoTags,
  isHtmlRouteRequest,
  resolveRouteContext,
} = require("../services/storefrontSeoService");

const INDEX_HTML_CANDIDATES = [
  process.env.STOREFRONT_INDEX_HTML,
  "/var/www/frontend2/dist/index.html",
  path.resolve(__dirname, "../../frontend/dist/index.html"),
  "/var/www/frontend/dist/index.html",
].filter(Boolean);

let cachedIndexHtml = null;
let cachedIndexHtmlPath = null;
let cachedIndexHtmlMtimeMs = null;
let cachedIndexHtmlSize = null;

const HTML_CACHE_TTL_MS = 60 * 1000; // 60s in-memory TTL
const htmlPageCache = new Map();

// Called by deploy-remote.sh touch or /api/v1/internal/purge-storefront-cache
function clearStorefrontHtmlCache() {
  cachedIndexHtml = null;
  cachedIndexHtmlPath = null;
  cachedIndexHtmlMtimeMs = null;
  cachedIndexHtmlSize = null;
  htmlPageCache.clear();
}

const buildCompatibleSelect = (prisma, modelName, desiredFields) => {
  const modelFields = prisma?._runtimeDataModel?.models?.[modelName]?.fields;

  if (!Array.isArray(modelFields) || modelFields.length === 0) {
    return desiredFields.reduce((select, fieldName) => {
      select[fieldName] = true;
      return select;
    }, {});
  }

  const availableFieldNames = new Set(modelFields.map((field) => field.name));
  return desiredFields.reduce((select, fieldName) => {
    if (availableFieldNames.has(fieldName)) {
      select[fieldName] = true;
    }
    return select;
  }, {});
};

const loadIndexHtml = async () => {
  for (const candidate of INDEX_HTML_CANDIDATES) {
    try {
      const stats = await fs.stat(candidate);

      if (
        cachedIndexHtml &&
        cachedIndexHtmlPath === candidate &&
        cachedIndexHtmlMtimeMs === stats.mtimeMs &&
        cachedIndexHtmlSize === stats.size
      ) {
        return cachedIndexHtml;
      }

      const fileContents = await fs.readFile(candidate, "utf8");
      cachedIndexHtml = fileContents;
      cachedIndexHtmlPath = candidate;
      cachedIndexHtmlMtimeMs = stats.mtimeMs;
      cachedIndexHtmlSize = stats.size;
      return fileContents;
    } catch {
      // Try the next known location.
    }
  }

  throw new Error(
    `Unable to find storefront index.html. Checked: ${INDEX_HTML_CANDIDATES.join(", ")}`,
  );
};

exports.handleStorefrontShell = async (req, res, next) => {
  if (!isHtmlRouteRequest(req)) {
    return next();
  }

  if (!req.companyId || !req.company) {
    return next();
  }

  // The landing builder embeds the live storefront page as an iframe.
  // Frame protection stays on, scoped to the platform admin origin
  // instead of hard-deny, so only the merchant's own editor can embed.
  const platformAdminOrigin =
    process.env.PLATFORM_ADMIN_ORIGIN || "https://maxp.online";
  res.removeHeader("X-Frame-Options");
  const existingCsp = res.getHeader("Content-Security-Policy");
  const adjustedCsp = (Array.isArray(existingCsp)
    ? existingCsp
    : existingCsp
      ? [String(existingCsp)]
      : []
  ).map((csp) =>
    csp.includes("frame-ancestors")
      ? csp.replace(
          /frame-ancestors[^;]*/i,
          `frame-ancestors 'self' ${platformAdminOrigin}`,
        )
      : csp,
  );
  if (adjustedCsp.length) {
    res.setHeader("Content-Security-Policy", adjustedCsp);
  }

  const cacheKey = `${req.companyId}:${req.path}`;
  const cached = htmlPageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < HTML_CACHE_TTL_MS) {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("X-HTML-Cache", "HIT");
    res.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate",
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    return res.status(200).send(cached.html);
  }

  try {
    const prisma = await getSharedPrismaClientAsync();
    const routeContext = resolveRouteContext(req.path);
    const compatibleProductSelect = buildCompatibleSelect(prisma, "Product", [
      "name",
      "description",
      "metadata",
      "image",
      "mainImage",
      "images",
      "price",
      "currency",
      "sku",
      "barcode",
      "stock",
      "trackInventory",
      "comparePrice",
      "saleEndDate",
      "updatedAt",
    ]);

    const isHomepage =
      !routeContext.productKey &&
      !routeContext.categorySlug &&
      !routeContext.articleSlug &&
      !routeContext.storePageSlug &&
      !routeContext.landingSlug;

    const [template, storefrontSettings, product, category, article, storePage, landing, indexHtml] =
      await Promise.all([
        isHomepage
          ? safeQuery(() =>
              prisma.homepageTemplate.findFirst({
                where: {
                  companyId: req.companyId,
                  isActive: true,
                  pageType: "HOMEPAGE",
                },
                select: {
                  publishedContent: true,
                  content: true,
                },
              }),
            )
          : Promise.resolve(null),
        safeQuery(() =>
          prisma.storefrontSettings.findUnique({
            where: { companyId: req.companyId },
            select: {
              designTokens: true,
            },
          }),
        ),
        routeContext.productKey
          ? safeQuery(() =>
              prisma.product.findFirst({
                where: {
                  companyId: req.companyId,
                  isActive: true,
                  deletedAt: null,
                  isHidden: false,
                  OR: [{ id: routeContext.productKey }, { slug: routeContext.productKey }],
                },
                select: {
                  ...compatibleProductSelect,
                  category: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                  productReviews: {
                    where: { isApproved: true },
                    select: { rating: true },
                  },
                },
              }),
            )
          : Promise.resolve(null),
        routeContext.categorySlug
          ? safeQuery(() =>
              prisma.category.findFirst({
                where: {
                  companyId: req.companyId,
                  isActive: true,
                  OR: [{ id: routeContext.categorySlug }, { slug: routeContext.categorySlug }],
                },
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  description: true,
                  image: true,
                  metaTitle: true,
                  metaDescription: true,
                },
              }),
            )
          : Promise.resolve(null),
        routeContext.articleSlug
          ? safeQuery(() =>
              prisma.article.findFirst({
                where: {
                  companyId: req.companyId,
                  isPublished: true,
                  slug: routeContext.articleSlug,
                },
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  excerpt: true,
                  heroImage: true,
                  authorName: true,
                  publishedAt: true,
                  updatedAt: true,
                  seoTitle: true,
                  seoDescription: true,
                },
              }),
            )
          : Promise.resolve(null),
        routeContext.storePageSlug
          ? safeQuery(() =>
              prisma.storePage.findFirst({
                where: {
                  companyId: req.companyId,
                  slug: routeContext.storePageSlug,
                  isActive: true,
                },
                select: {
                  title: true,
                  metaTitle: true,
                  metaDescription: true,
                },
              }),
            )
          : Promise.resolve(null),
        routeContext.landingSlug
          ? safeQuery(() =>
              prisma.productLandingPage.findFirst({
                where: {
                  companyId: req.companyId,
                  slug: routeContext.landingSlug,
                  status: "PUBLISHED",
                },
                select: {
                  slug: true,
                  title: true,
                  seo: true,
                  formConfig: true,
                  product: {
                    select: {
                      name: true,
                      description: true,
                      mainImage: true,
                      images: true,
                      price: true,
                    },
                  },
                },
              }),
            ).catch((error) => {
              // Landing meta must never break the page shell — degrade to
              // the no-meta version (the SPA renders its own state anyway).
              console.warn(
                "[STOREFRONT-HTML] Landing meta query failed:",
                error?.message || error,
              );
              return null;
            })
          : Promise.resolve(null),
        loadIndexHtml(),
      ]);

    // A missing/preview-mode landing must NOT hard-404: the merchant preview
    // flow (?preview=1) loads the same shell for unpublished pages. Instead
    // the shell is served with noIndex so scrapers skip it while the SPA
    // renders the preview or its own not-found state.
    const landingMissing = Boolean(routeContext.landingSlug && !landing);

    // If a single slug was requested (e.g. /car-sunshades) and it didn't match a custom store page,
    // check if it matches an active product or published landing page for this store and redirect seamlessly.
    if (routeContext.storePageSlug && !storePage) {
      const matchedProduct = await safeQuery(() =>
        prisma.product.findFirst({
          where: {
            companyId: req.companyId,
            isActive: true,
            deletedAt: null,
            isHidden: false,
            OR: [
              { id: routeContext.storePageSlug },
              { slug: routeContext.storePageSlug },
            ],
          },
          select: { slug: true },
        }),
      );

      if (matchedProduct?.slug) {
        const queryIdx = req.url.indexOf("?");
        const queryString = queryIdx !== -1 ? req.url.slice(queryIdx) : "";
        return res.redirect(301, `/product/${matchedProduct.slug}${queryString}`);
      }

      const matchedLanding = await safeQuery(() =>
        prisma.productLandingPage.findFirst({
          where: {
            companyId: req.companyId,
            slug: routeContext.storePageSlug,
            status: "PUBLISHED",
          },
          select: { slug: true },
        }),
      );

      if (matchedLanding?.slug) {
        const queryIdx = req.url.indexOf("?");
        const queryString = queryIdx !== -1 ? req.url.slice(queryIdx) : "";
        return res.redirect(301, `/lp/${matchedLanding.slug}${queryString}`);
      }
    }

    const isNotFound =
      (routeContext.productKey && !product) ||
      (routeContext.categorySlug && !category) ||
      (routeContext.articleSlug && !article) ||
      (routeContext.storePageSlug && !storePage);

    let reviews = null;
    if (Array.isArray(product?.productReviews) && product.productReviews.length > 0) {
      const count = product.productReviews.length;
      const sum = product.productReviews.reduce(
        (acc, r) => acc + (Number(r.rating) || 0),
        0,
      );
      reviews = {
        count,
        avgRating: count > 0 ? sum / count : 0,
      };
    }

    // Product landing meta for the SEO shell (slug/seo/product-derived
    // fallbacks). Product.images is a TEXT JSON column.
    let landingMeta = null;
    if (landing) {
      const parseJsonText = (value) => {
        if (!value) return null;
        if (typeof value === "object") return value;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      };
      const productImages = parseJsonText(landing.product?.images);
      const firstImage = Array.isArray(productImages)
        ? typeof productImages[0] === "string"
          ? productImages[0]
          : productImages[0]?.url
        : typeof productImages === "string"
          ? productImages
          : null;
      landingMeta = {
        slug: landing.slug,
        title: landing.title,
        seo: parseJsonText(landing.seo) || {},
        productDescription: landing.product?.description || "",
        productImage: landing.product?.mainImage || firstImage || null,
        productPrice: landing.product?.price,
      };
    }

    const currentUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const isPortalRoute = req.path.startsWith("/portal") || req.path.startsWith("/academy");
    const metadata = buildStorefrontSeoMetadata({
      pathname: req.path,
      currentUrl,
      company: req.company,
      storefrontSettings,
      templateContent: template?.publishedContent || template?.content || {},
      product,
      category,
      article,
      storePage,
      landing: landingMeta,
      reviews,
      noIndex: isNotFound || landingMissing || isPortalRoute,
    });

    let html = injectStorefrontSeoTags(indexHtml, metadata);

    // Semantic body snippet for non-JS crawlers
    let semanticSnippet = "";
    if (product) {
      const escape = (s) => (s ? String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "");
      semanticSnippet = `<div class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0" aria-hidden="true"><h1>${escape(metadata.title)}</h1><p>${escape(metadata.description)}</p><span>${metadata.price ? `${metadata.price} ${metadata.currency || "EGP"}` : ""}</span></div>`;
    } else if (category) {
      const escape = (s) => (s ? String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "");
      semanticSnippet = `<div class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0" aria-hidden="true"><h1>${escape(metadata.title)}</h1><p>${escape(metadata.description)}</p></div>`;
    } else if (article) {
      const escape = (s) => (s ? String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "");
      semanticSnippet = `<div class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0" aria-hidden="true"><h1>${escape(metadata.title)}</h1><p>${escape(metadata.description)}</p></div>`;
    } else if (landingMeta) {
      const escape = (s) => (s ? String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "");
      semanticSnippet = `<div class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0" aria-hidden="true"><h1>${escape(metadata.title)}</h1><p>${escape(metadata.description)}</p><span>${metadata.price ? `${metadata.price} ${metadata.currency || "EGP"}` : ""}</span></div>`;
    } else if (metadata.title) {
      const escape = (s) => (s ? String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "");
      semanticSnippet = `<div class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0" aria-hidden="true"><h1>${escape(metadata.title)}</h1><p>${escape(metadata.description || "")}</p></div>`;
    }

    if (semanticSnippet && html.includes('<div id="root"></div>')) {
      html = html.replace('<div id="root"></div>', `<div id="root">${semanticSnippet}</div>`);
    }

    res.set("Content-Type", "text/html; charset=utf-8");

    if (isNotFound) {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.status(404).send(html);
    }

    // Evict oldest if cache exceeds 1000 items
    if (htmlPageCache.size >= 1000) {
      const oldestKey = htmlPageCache.keys().next().value;
      if (oldestKey) htmlPageCache.delete(oldestKey);
    }
    htmlPageCache.set(cacheKey, {
      html,
      timestamp: Date.now(),
    });

    res.set("X-HTML-Cache", "MISS");
    res.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate",
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    return res.status(200).send(html);
  } catch (error) {
    console.error("❌ [STOREFRONT-HTML] Failed to render storefront shell:", error);
    return next(error);
  }
};

module.exports.clearStorefrontHtmlCache = clearStorefrontHtmlCache;
module.exports.loadIndexHtml = loadIndexHtml;
