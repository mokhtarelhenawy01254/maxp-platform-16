/**
 * platformSeoMiddleware.js
 *
 * Server-side Open Graph / Twitter Card meta injector for MaxP platform routes.
 *
 * Runs BEFORE the catch-all storefrontHtmlController so that requests made
 * by social-media crawlers (Telegram, WhatsApp, Facebook, Twitter/X, LinkedIn)
 * receive a properly customised HTML head ΓÇö even though the SPA JavaScript
 * never executes in their headless context.
 *
 * Route matching strategy:
 *  - Exact segments are tested first (e.g. /landing/ai-inbox)
 *  - Prefix fallbacks are tested second (e.g. /landing/*)
 *  - If nothing matches we fall back to the default MaxP platform cover.
 *
 * The injected tags ONLY replace existing values ΓÇö they never remove tags that
 * storefrontSeoService or the static index.html already set.
 */

"use strict";

const path = require("path");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_BASE_URL = "https://maxp.online";
const PLATFORM_OG_COVER = `${PLATFORM_BASE_URL}/og-cover.png`;
const PLATFORM_DEFAULT_TITLE = "MaxP ΓÇö ┘à┘å╪╡╪⌐ ╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪¬┘ê╪º╪╡┘ä ┘ê╪º┘ä╪¬╪¼╪º╪▒╪⌐ ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪⌐";
const PLATFORM_DEFAULT_DESCRIPTION =
  "┘à┘å╪╡╪⌐ ┘à╪¬┘â╪º┘à┘ä╪⌐ ┘ä╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à╪¡╪º╪»╪½╪º╪¬╪î ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è╪î ┘ê╪º┘ä┘à╪¬╪º╪¼╪▒ ╪º┘ä╪▒┘é┘à┘è╪⌐ ┘ü┘è ┘à┘â╪º┘å ┘ê╪º╪¡╪».";

// ---------------------------------------------------------------------------
// Route ΓåÆ SEO metadata map
// Each entry defines: title, description, image (optional ΓÇö falls back to og-cover)
// ---------------------------------------------------------------------------

const ROUTE_SEO_MAP = [
  // ΓöÇΓöÇ Landing Pages ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    match: "/landing/ai-inbox",
    title: "Max P AI + Inbox ΓÇö AI Agent + Unified Inbox ┘ü┘è ╪¿╪º┘é╪⌐ ┘ê╪º╪¡╪»╪⌐",
    description:
      "╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ┘ä┘ä┘à╪¡╪º╪»╪½╪º╪¬ + ╪╡┘å╪»┘ê┘é ┘ê╪º╪▒╪» ┘à┘ê╪¡╪» ┘ä┘â┘ä ╪º┘ä┘à┘å╪╡╪º╪¬. AI Agent ┘è╪▒╪» ┘ê┘è┘å╪┤╪ª ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï. ┘⌐┘⌐┘⌐ ╪¼.┘à/╪┤┘ç╪▒.",
    image: `${PLATFORM_BASE_URL}/og-messaging.svg`,
  },
  {
    match: "/landing/messaging",
    title: "Max P Inbox ΓÇö ┘â┘ä ╪▒╪│╪º┘è┘ä ┘ê╪º╪¬╪│╪º╪¿ ┘ê╪¬┘ä╪¼╪▒╪º┘à ┘ê╪º┘å╪│╪¬╪¼╪▒╪º┘à ┘ê┘à╪º╪│┘å╪¼╪▒ ┘ü┘è ┘à┘â╪º┘å ┘ê╪º╪¡╪»",
    description:
      "╪╡┘å╪»┘ê┘é ┘ê╪º╪▒╪» ┘à┘ê╪¡┘æ╪» ┘ä┘ä╪▒╪» ╪╣┘ä┘ë ┘â┘ä ╪º┘ä┘à┘å╪╡╪º╪¬ ┬╖ AI Agent ┘è╪╣┘à┘ä ╪¡╪¼┘ê╪▓╪º╪¬ ┘ê╪╖┘ä╪¿╪º╪¬. ┘à┘å ┘⌐┘⌐┘⌐ ╪¼.┘à/╪┤┘ç╪▒.",
    image: `${PLATFORM_BASE_URL}/og-messaging.svg`,
  },
  {
    match: "/landing/medical",
    title: "Max P ╪º┘ä╪¿╪º┘é╪⌐ ╪º┘ä╪╖╪¿┘è╪⌐ ΓÇö ╪º┘ä┘å╪╕╪º┘à ╪º┘ä╪╖╪¿┘è ╪º┘ä┘à╪¬┘â╪º┘à┘ä + ┘ê╪º╪¬╪│╪º╪¿ + AI Agents",
    description:
      "┘å╪╕╪º┘à ╪╖╪¿┘è ┘à╪¬┘â╪º┘à┘ä ┘è╪╢┘à ╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à┘ê╪º╪╣┘è╪»╪î ╪│╪¼┘ä╪º╪¬ ╪º┘ä┘à╪▒╪╢┘ë╪î ┘ê╪º╪¬╪│╪º╪¿╪î ┘ê╪ú╪╣┘ê╪º┘å ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ┘ä┘ä╪╣┘è╪º╪»╪º╪¬ ┘ê╪º┘ä┘à╪│╪¬╪┤┘ü┘è╪º╪¬.",
  },
  {
    match: "/landing/employees",
    title: "Max P ΓÇö ╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à┘ê╪╕┘ü┘è┘å ┘ê╪º┘ä╪¡╪╢┘ê╪▒ ┘ê╪º┘ä╪Ñ╪¼╪º╪▓╪º╪¬ ╪¿╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è",
    description:
      "┘å╪╕╪º┘à ╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à┘ê╪╕┘ü┘è┘å ┘à┘å MaxP ΓÇö ╪º┘ä╪¡╪╢┘ê╪▒ ┘ê╪º┘ä╪º┘å╪╡╪▒╪º┘ü╪î ╪º┘ä╪Ñ╪¼╪º╪▓╪º╪¬╪î ╪º┘ä╪▒┘ê╪º╪¬╪¿╪î ┘ê┘â┘ä ┘à╪º ┘è╪¡╪¬╪º╪¼┘ç ┘ü╪▒┘è┘é ╪º┘ä╪╣┘à┘ä.",
  },
  {
    match: "/landing/marketing",
    title: "Max P ΓÇö ┘à┘å╪╡╪⌐ ╪º┘ä╪¬╪│┘ê┘è┘é ╪º┘ä╪▒┘é┘à┘è ┘ê╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪Ñ╪╣┘ä╪º┘å╪º╪¬",
    description:
      "╪Ñ╪»╪º╪▒╪⌐ ╪¡┘à┘ä╪º╪¬┘â ╪º┘ä╪¬╪│┘ê┘è┘é┘è╪⌐╪î ╪Ñ╪╣┘ä╪º┘å╪º╪¬ ┘ü┘è╪│╪¿┘ê┘â ┘ê╪º┘å╪│╪¬╪¼╪▒╪º┘à ┘ê╪¼┘ê╪¼┘ä╪î ┘ê╪¬╪¡┘ä┘è┘ä ╪º┘ä╪ú╪»╪º╪í ┘à┘å ┘à┘â╪º┘å ┘ê╪º╪¡╪» ┘à╪╣ AI Agent.",
  },
  {
    match: "/landing",
    title: "MaxP ΓÇö ╪¿╪º┘é╪º╪¬ ┘ê┘à┘å╪¬╪¼╪º╪¬ ╪º┘ä┘à┘å╪╡╪⌐",
    description: PLATFORM_DEFAULT_DESCRIPTION,
  },

  // ΓöÇΓöÇ Super Admin ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    match: "/super-admin",
    title: "MaxP Super Admin",
    description: "┘ä┘ê╪¡╪⌐ ╪¬╪¡┘â┘à ╪º┘ä┘à┘å╪╡╪⌐ ΓÇö ╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪┤╪▒┘â╪º╪¬╪î ╪º┘ä╪¿╪º┘é╪º╪¬╪î ┘ê╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬.",
    noIndex: true,
  },

  // ΓöÇΓöÇ Regular Admin ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    match: "/admin",
    title: "MaxP ΓÇö ┘ä┘ê╪¡╪⌐ ╪º┘ä╪¬╪¡┘â┘à",
    description: "╪Ñ╪»╪º╪▒╪⌐ ┘à╪¡╪º╪»╪½╪º╪¬┘â ┘ê╪╖┘ä╪¿╪º╪¬┘â ┘ê┘à╪¬╪¼╪▒┘â ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ┘à┘å ┘à┘â╪º┘å ┘ê╪º╪¡╪».",
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
// Index HTML loader (simple in-process cache ΓÇö shared across requests)
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
    console.error("Γ¥î [PLATFORM-SEO] Error injecting SEO tags:", err?.message);
    return next();
  }
};
