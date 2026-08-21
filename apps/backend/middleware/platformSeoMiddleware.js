/**
 * platformSeoMiddleware.js
 *
 * Server-side Open Graph / Twitter Card meta injector for MaxP platform routes.
 *
 * Runs BEFORE the catch-all storefrontHtmlController so that requests made
 * by social-media crawlers (Telegram, WhatsApp, Facebook, Twitter/X, LinkedIn)
 * receive a properly customised HTML head — even though the SPA JavaScript
 * never executes in their headless context.
 *
 * Route matching strategy:
 *  - Exact segments are tested first (e.g. /landing/ai-inbox)
 *  - Prefix fallbacks are tested second (e.g. /landing/*)
 *  - If nothing matches we fall back to the default MaxP platform cover.
 *
 * The injected tags ONLY replace existing values — they never remove tags that
 * storefrontSeoService or the static index.html already set.
 */

"use strict";

const path = require("path");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_BASE_URL = "https://maxp.online";
const PLATFORM_OG_COVER = `${PLATFORM_BASE_URL}/og-cover.png`;
const PLATFORM_DEFAULT_TITLE = "MaxP — منصة إدارة التواصل والتجارة الإلكترونية";
const PLATFORM_DEFAULT_DESCRIPTION =
  "منصة متكاملة لإدارة المحادثات، الذكاء الاصطناعي، والمتاجر الرقمية في مكان واحد.";

// ---------------------------------------------------------------------------
// Route → SEO metadata map
// Each entry defines: title, description, image (optional — falls back to og-cover)
// ---------------------------------------------------------------------------

const ROUTE_SEO_MAP = [
  // ── Landing Pages ──────────────────────────────────────────────────────────
  {
    match: "/landing/ai-inbox",
    title: "Max P AI + Inbox — AI Agent + Unified Inbox في باقة واحدة",
    description:
      "الذكاء الاصطناعي للمحادثات + صندوق وارد موحد لكل المنصات. AI Agent يرد وينشئ الطلبات تلقائياً. ٩٩٩ ج.م/شهر.",
    image: `${PLATFORM_BASE_URL}/og-messaging.svg`,
  },
  {
    match: "/landing/messaging",
    title: "Max P Inbox — كل رسايل واتساب وتلجرام وانستجرام وماسنجر في مكان واحد",
    description:
      "صندوق وارد موحّد للرد على كل المنصات · AI Agent يعمل حجوزات وطلبات. من ٩٩٩ ج.م/شهر.",
    image: `${PLATFORM_BASE_URL}/og-messaging.svg`,
  },
  {
    match: "/landing/medical",
    title: "Max P الباقة الطبية — النظام الطبي المتكامل + واتساب + AI Agents",
    description:
      "نظام طبي متكامل يضم إدارة المواعيد، سجلات المرضى، واتساب، وأعوان الذكاء الاصطناعي للعيادات والمستشفيات.",
  },
  {
    match: "/landing/employees",
    title: "Max P — إدارة الموظفين والحضور والإجازات بالذكاء الاصطناعي",
    description:
      "نظام إدارة الموظفين من MaxP — الحضور والانصراف، الإجازات، الرواتب، وكل ما يحتاجه فريق العمل.",
  },
  {
    match: "/landing/marketing",
    title: "Max P — منصة التسويق الرقمي وإدارة الإعلانات",
    description:
      "إدارة حملاتك التسويقية، إعلانات فيسبوك وانستجرام وجوجل، وتحليل الأداء من مكان واحد مع AI Agent.",
  },
  {
    match: "/landing",
    title: "MaxP — باقات ومنتجات المنصة",
    description: PLATFORM_DEFAULT_DESCRIPTION,
  },

  // ── Super Admin ─────────────────────────────────────────────────────────────
  {
    match: "/super-admin",
    title: "MaxP Super Admin",
    description: "لوحة تحكم المنصة — إدارة الشركات، الباقات، والإعدادات.",
    noIndex: true,
  },

  // ── Regular Admin ───────────────────────────────────────────────────────────
  {
    match: "/admin",
    title: "MaxP — لوحة التحكم",
    description: "إدارة محادثاتك وطلباتك ومتجرك الإلكتروني من مكان واحد.",
    noIndex: true,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const upsertMeta = (html, attribute, key, value) => {
  const escaped = escapeHtml(value);
  const pattern = new RegExp(
    `<meta[^>]+${attribute}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "i"
  );
  const tag = `<meta ${attribute}="${key}" content="${escaped}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `  ${tag}\n</head>`);
};

const upsertTitle = (html, title) =>
  html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);

const injectSeoTags = (html, { title, description, image, url, noIndex }) => {
  let h = upsertTitle(html, title);
  h = upsertMeta(h, "name", "description", description);
  h = upsertMeta(h, "property", "og:title", title);
  h = upsertMeta(h, "property", "og:description", description);
  h = upsertMeta(h, "property", "og:url", url);
  h = upsertMeta(h, "property", "og:image", image);
  h = upsertMeta(h, "property", "og:image:width", "1200");
  h = upsertMeta(h, "property", "og:image:height", "630");
  h = upsertMeta(h, "name", "twitter:title", title);
  h = upsertMeta(h, "name", "twitter:description", description);
  h = upsertMeta(h, "name", "twitter:image", image);
  h = upsertMeta(h, "name", "twitter:card", "summary_large_image");

  if (noIndex) {
    const robotsPattern = /<meta[^>]+name=["']robots["'][^>]*>/i;
    const robotsTag = `<meta name="robots" content="noindex, nofollow" />`;
    h = robotsPattern.test(h)
      ? h.replace(robotsPattern, robotsTag)
      : h.replace("</head>", `  ${robotsTag}\n</head>`);
  }

  return h;
};

const resolveRouteSeo = (pathname) => {
  const normalized = (pathname || "/").split("?")[0];

  // Exact match first, then longest prefix match.
  let best = null;
  let bestLen = -1;

  for (const entry of ROUTE_SEO_MAP) {
    if (normalized === entry.match || normalized.startsWith(entry.match + "/")) {
      if (entry.match.length > bestLen) {
        best = entry;
        bestLen = entry.match.length;
      }
    }
  }

  return best;
};

// ---------------------------------------------------------------------------
// Index HTML loader (simple in-process cache — shared across requests)
// ---------------------------------------------------------------------------

const INDEX_HTML_CANDIDATES = [
  process.env.STOREFRONT_INDEX_HTML,
  "/var/www/frontend2/dist/index.html",
  path.resolve(__dirname, "../../frontend/dist/index.html"),
  "/var/www/frontend/dist/index.html",
].filter(Boolean);

const fs = require("fs/promises");

let _cachedHtml = null;
let _cachedPath = null;
let _cachedMtime = null;

function clearPlatformSeoHtmlCache() {
  _cachedHtml = null;
  _cachedPath = null;
  _cachedMtime = null;
}

const loadIndexHtml = async () => {
  for (const candidate of INDEX_HTML_CANDIDATES) {
    try {
      const stats = await fs.stat(candidate);
      if (_cachedHtml && _cachedPath === candidate && _cachedMtime === stats.mtimeMs) {
        return _cachedHtml;
      }
      const content = await fs.readFile(candidate, "utf8");
      _cachedHtml = content;
      _cachedPath = candidate;
      _cachedMtime = stats.mtimeMs;
      return content;
    } catch {
      // try next
    }
  }
  return null; // let next() handle it
};

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware.
 *
 * Only intercepts GET / HEAD requests that look like HTML navigation requests
 * (i.e. Accept: text/html) AND that match a known platform route.
 * All other requests are passed through unchanged.
 */
exports.clearPlatformSeoHtmlCache = clearPlatformSeoHtmlCache;

exports.handlePlatformSeo = async (req, res, next) => {
  // Only handle HTML-looking GET/HEAD requests.
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
  if (path.posix.extname(req.path)) return next();

  const accept = String(req.headers.accept || "").toLowerCase();
  if (accept && !accept.includes("text/html") && !accept.includes("*/*")) return next();

  const routeSeo = resolveRouteSeo(req.path);
  if (!routeSeo) return next();

  try {
    const indexHtml = await loadIndexHtml();
    if (!indexHtml) return next();

    const currentUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const finalImage = routeSeo.image || PLATFORM_OG_COVER;

    const html = injectSeoTags(indexHtml, {
      title: routeSeo.title,
      description: routeSeo.description,
      image: finalImage,
      url: currentUrl,
      noIndex: routeSeo.noIndex || false,
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).send(html);
  } catch (err) {
    console.error("❌ [PLATFORM-SEO] Error injecting SEO tags:", err?.message);
    return next();
  }
};
