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

  const cacheKey = `${req.companyId}:${req.path}`;
  const cached = htmlPageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < HTML_CACHE_TTL_MS) {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("X-HTML-Cache", "HIT");
    res.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
    );
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
    ]);

    const isHomepage = !routeContext.productKey && !routeContext.storePageSlug;

    const [template, storefrontSettings, product, storePage, indexHtml] =
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
                  OR: [{ id: routeContext.productKey }, { slug: routeContext.productKey }],
                },
                select: compatibleProductSelect,
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
        loadIndexHtml(),
      ]);

    const currentUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const metadata = buildStorefrontSeoMetadata({
      pathname: req.path,
      currentUrl,
      company: req.company,
      storefrontSettings,
      templateContent: template?.publishedContent || template?.content || {},
      product,
      storePage,
    });
    const html = injectStorefrontSeoTags(indexHtml, metadata);

    // Evict oldest if cache exceeds 1000 items
    if (htmlPageCache.size >= 1000) {
      const oldestKey = htmlPageCache.keys().next().value;
      if (oldestKey) htmlPageCache.delete(oldestKey);
    }
    htmlPageCache.set(cacheKey, {
      html,
      timestamp: Date.now(),
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("X-HTML-Cache", "MISS");
    res.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
    );
    return res.status(200).send(html);
  } catch (error) {
    console.error("❌ [STOREFRONT-HTML] Failed to render storefront shell:", error);
    return next(error);
  }
};

module.exports.clearStorefrontHtmlCache = clearStorefrontHtmlCache;
module.exports.loadIndexHtml = loadIndexHtml;
