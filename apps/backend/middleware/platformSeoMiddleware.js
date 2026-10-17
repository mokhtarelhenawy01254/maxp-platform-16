/**
 * platformSeoMiddleware.js
 *
 * ⚠️ ملاحظة معمارية هامة (Source of Truth):
 * خريطة المسارات العامة الثابتة (ROUTE_SEO_MAP) أدناه أصبحت طبقة قديمة ومكررة للدومين الرئيسي؛
 * فالدومين الرئيسي (maxp.online / www.maxp.online) يعتمد الآن كلياً على:
 * `apps/frontend/src/seo/public-routes.json`
 * كمصدر الحقيقة الوحيد لجميع المسارات العامة، حيث يتم توليد أغلفة SEO ثابتة (.seo.html)
 * وسجلات sitemap.xml أثناء الـ build وتُخدم مباشرة عبر Nginx (try_files).
 *
 * تم الإبقاء على هذا الملف لدعم مسارات الفانل الديناميكية (/funnel/:slug و /funnels/:slug)
 * وتجاوز المتاجر والشركات دون تغيير أي سلوك شغال أو مسارات فانل تجارية.
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
const { hasStaticFileExtension } = require("../services/storefrontSeoService");

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
  // ── Platform Homepage ───────────────────────────────────────────────────────
  {
    match: "/",
    title: "MaxP — منصة إدارة التواصل والتجارة الإلكترونية والذكاء الاصطناعي",
    description:
      "المنصة المتكاملة للشركات والتجار: إدارة المحادثات، أعوان الذكاء الاصطناعي، المتاجر الرقمية السريعة، وتأكيد طلبات الدفع عند الاستلام.",
    image: PLATFORM_OG_COVER,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "MaxP",
      operatingSystem: "Cloud, Web, Mobile",
      applicationCategory: "BusinessApplication, eCommerceApplication",
      description: PLATFORM_DEFAULT_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "999",
        priceCurrency: "EGP",
      },
    },
  },

  // ── Academy Portal Public Routes ──────────────────────────────────────────
  {
    match: "/portal/course/cmuzmwaxs07r2juml2v04xon5",
    title: "كورس MaxP — من أول إعلان لأول نظام",
    description:
      "25 درس لصاحب المحل المصري: تعرف سوقك، تبني عرضك، تجيب عملاء بإعلانات مقاسة، وترجّعهم بنظام — كله جوه ماكس بي.",
    image: `${PLATFORM_BASE_URL}/og/p1_course-path_1200x628.png`,
    canonical: "https://maxp.online/portal/course/cmuzmwaxs07r2juml2v04xon5",
    type: "product",
    noIndex: false,
    robots: "index, follow",
  },
  {
    match: "/portal/catalog",
    title: "أكاديمية MaxP — كورسات لأصحاب المشاريع",
    description:
      "25 درس لصاحب المحل المصري: تعرف سوقك، تبني عرضك، تجيب عملاء بإعلانات مقاسة، وترجّعهم بنظام — كله جوه ماكس بي.",
    image: `${PLATFORM_BASE_URL}/og/p1_course-path_1200x628.png`,
    canonical: "https://maxp.online/portal",
    type: "website",
    noIndex: false,
    robots: "index, follow",
  },
  {
    match: "/portal",
    title: "أكاديمية MaxP — كورسات لأصحاب المشاريع",
    description:
      "25 درس لصاحب المحل المصري: تعرف سوقك، تبني عرضك، تجيب عملاء بإعلانات مقاسة، وترجّعهم بنظام — كله جوه ماكس بي.",
    image: `${PLATFORM_BASE_URL}/og/p1_course-path_1200x628.png`,
    canonical: "https://maxp.online/portal",
    type: "website",
    noIndex: false,
    robots: "index, follow",
  },

  // ── Landing Pages (Both /lp/* and /landing/* aliases) ───────────────────────
  {
    match: "/lp/ai-inbox",
    title: "Max P AI + Inbox — أعوان الذكاء الاصطناعي وصندوق الوارد الموحد",
    description:
      "الذكاء الاصطناعي للمحادثات + صندوق وارد موحد لكل المنصات (واتساب، انستجرام، فيسبوك، تلجرام). AI Agent يرد فوراً وينشئ الطلبات تلقائياً.",
    image: `${PLATFORM_BASE_URL}/og-messaging.svg`,
  },
  {
    match: "/landing/ai-inbox",
    title: "Max P AI + Inbox — أعوان الذكاء الاصطناعي وصندوق الوارد الموحد",
    description:
      "الذكاء الاصطناعي للمحادثات + صندوق وارد موحد لكل المنصات (واتساب، انستجرام، فيسبوك، تلجرام). AI Agent يرد فوراً وينشئ الطلبات تلقائياً.",
    image: `${PLATFORM_BASE_URL}/og-messaging.svg`,
  },
  {
    match: "/lp/messaging",
    title: "Max P Inbox — كل رسائل واتساب وتلجرام وانستجرام وماسنجر في مكان واحد",
    description:
      "صندوق وارد موحّد للرد على كل المنصات · توزيع المحادثات على الفريق · ردود سريعة وحجوزات تلقائية من ٩٩٩ ج.م/شهر.",
    image: `${PLATFORM_BASE_URL}/og-messaging.svg`,
  },
  {
    match: "/landing/messaging",
    title: "Max P Inbox — كل رسائل واتساب وتلجرام وانستجرام وماسنجر في مكان واحد",
    description:
      "صندوق وارد موحّد للرد على كل المنصات · توزيع المحادثات على الفريق · ردود سريعة وحجوزات تلقائية من ٩٩٩ ج.م/شهر.",
    image: `${PLATFORM_BASE_URL}/og-messaging.svg`,
  },
  {
    match: "/lp/medical",
    title: "Max P الباقة الطبية — النظام الطبي المتكامل للعيادات والمراكز + واتساب",
    description:
      "نظام طبي متكامل يضم إدارة المواعيد، سجلات المرضى الإلكترونية، تأكيد الحجوزات عبر واتساب، وأعوان الذكاء الاصطناعي للعيادات.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/landing/medical",
    title: "Max P الباقة الطبية — النظام الطبي المتكامل للعيادات والمراكز + واتساب",
    description:
      "نظام طبي متكامل يضم إدارة المواعيد، سجلات المرضى الإلكترونية، تأكيد الحجوزات عبر واتساب، وأعوان الذكاء الاصطناعي للعيادات.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/lp/mg-agency",
    title: "Max P للوكالات الإعلانية — إدارة المحادثات والحملات لعملاء الميديا باينج",
    description:
      "النظام المخصص لوكالات التسويق والميديا بايرز: بوابات مخصصة لكل عميل، تتبع دقيق للمبيعات، وتأكيد فوري للطلبات المحققة من الإعلانات.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/lp/mg",
    title: "Max P للوكالات الإعلانية — إدارة المحادثات والحملات لعملاء الميديا باينج",
    description:
      "النظام المخصص لوكالات التسويق والميديا بايرز: بوابات مخصصة لكل عميل، تتبع دقيق للمبيعات، وتأكيد فوري للطلبات المحققة من الإعلانات.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/lp/employees",
    title: "Max P — إدارة الموظفين والحضور والإجازات بالذكاء الاصطناعي",
    description:
      "نظام إدارة الموظفين من MaxP — الحضور والانصراف، الإجازات، الرواتب، وتقييم أداء فريق العمل في لوحة واحدة.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/landing/employees",
    title: "Max P — إدارة الموظفين والحضور والإجازات بالذكاء الاصطناعي",
    description:
      "نظام إدارة الموظفين من MaxP — الحضور والانصراف، الإجازات، الرواتب، وتقييم أداء فريق العمل في لوحة واحدة.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/lp/marketing",
    title: "Max P Marketing — أتمتة التسويق وإدارة الحملات الإعلانية",
    description:
      "إدارة حملاتك التسويقية، إعلانات فيسبوك وانستجرام وتيك توك، وتحليل العائد الإعلاني ROAS من مكان واحد مع AI Agent.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/landing/marketing",
    title: "Max P Marketing — أتمتة التسويق وإدارة الحملات الإعلانية",
    description:
      "إدارة حملاتك التسويقية، إعلانات فيسبوك وانستجرام وتيك توك، وتحليل العائد الإعلاني ROAS من مكان واحد مع AI Agent.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/for-merchants",
    title: "Max P للتجارة الإلكترونية — حوّل زوارك ومحادثاتك إلى مبيعات مؤكدة",
    description:
      "حلول متطورة للتجار وأصحاب المتاجر: تأكيد أوردرات الدفع عند الاستلام عبر واتساب، شحن أسرع، وتقليل المرتجعات.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/pricing",
    title: "باقات وأسعار Max P — اختر الخطة المناسبة لنمو أعمالك",
    description:
      "خطط اشتراك مرنة تناسب الشركات والمتاجر والعيادات. ابدأ الآن واكتشف القوة الكاملة لمنصة MaxP.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/features",
    title: "مميزات Max P — أدوات ذكية متكاملة لإدارة البيع والتواصل",
    description:
      "المتاجر الإلكترونية السريعة، الذكاء الاصطناعي، الربط مع شركات الشحن، الفواتير الإلكترونية، وإعلانات فيسبوك CAPI.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/affiliates",
    title: "برنامج التسويق بالعمولة — Max P Affiliate Program",
    description:
      "شارك في نجاح MaxP واحصل على عمولات شهرية متكررة من خلال دعوة التجار والشركات للانضمام للمنصة.",
    image: PLATFORM_OG_COVER,
  },
  {
    match: "/landing",
    title: "MaxP — باقات ومنتجات المنصة",
    description: PLATFORM_DEFAULT_DESCRIPTION,
    image: PLATFORM_OG_COVER,
  },

  // ── Public Auth ─────────────────────────────────────────────────────────────
  {
    match: "/login",
    title: "تسجيل الدخول | MaxP",
    description: "سجّل دخولك إلى لوحة تحكم MaxP لمتابعة رسائلك ومبيعاتك ومتجرك.",
    noIndex: true,
  },
  {
    match: "/register",
    title: "إنشاء حساب جديد | MaxP",
    description: "ابدأ رحلتك مع MaxP — أنشئ حسابك الآن وابدأ في أتمتة مبيعاتك وتواصلك.",
    noIndex: true,
  },

  // ── Merchant Dashboard & Admin Routes (noIndex) ─────────────────────────────
  {
    match: "/orders",
    title: "الطلبات والمبيعات | MaxP Dashboard",
    description: "إدارة ومتابعة طلبات المتجر، حالات الشحن، وتأكيد أوردرات الدفع عند الاستلام.",
    noIndex: true,
  },
  {
    match: "/products",
    title: "إدارة المنتجات والكتالوج | MaxP Dashboard",
    description: "إضافة وتعديل المنتجات، الأسعار، المخزون، وسيو المنتجات في متجرك.",
    noIndex: true,
  },
  {
    match: "/customers",
    title: "سجلات وقاعدة بيانات العملاء | MaxP Dashboard",
    description: "بيانات العملاء، سجل الطلبات، وتقسيم الشرائح التسويقية.",
    noIndex: true,
  },
  {
    match: "/conversations",
    title: "صندوق المحادثات والرسائل | MaxP Dashboard",
    description: "متابعة والرد على رسائل واتساب، فيسبوك، انستجرام، وتلجرام الموحدة.",
    noIndex: true,
  },
  {
    match: "/inbox",
    title: "صندوق المحادثات والرسائل | MaxP Dashboard",
    description: "متابعة والرد على رسائل واتساب، فيسبوك، انستجرام، وتلجرام الموحدة.",
    noIndex: true,
  },
  {
    match: "/analytics",
    title: "التقارير وتحليلات الأداء | MaxP Dashboard",
    description: "تقارير المبيعات، معدل التحويل، أداء الحملات، وتحليلات الموظفين.",
    noIndex: true,
  },
  {
    match: "/advertising",
    title: "إعلانات فيسبوك والبكسل CAPI | MaxP Dashboard",
    description: "إدارة بكسل فيسبوك، واجهة التحويلات CAPI، وحملات الكتالوج الإعلاني.",
    noIndex: true,
  },
  {
    match: "/inventory",
    title: "المخزون والمستودعات | MaxP Dashboard",
    description: "تتبع جرد المنتجات، تنبيهات نفاد المخزون، وإدارة المستودعات.",
    noIndex: true,
  },
  {
    match: "/settings",
    title: "إعدادات المتجر والمنصة | MaxP Dashboard",
    description: "تخصيص الثيم، طرق الدفع، الشحن، والنطاقات المخصصة.",
    noIndex: true,
  },
  {
    match: "/agency",
    title: "لوحة تحكم الوكالات وإدارة العملاء | MaxP Dashboard",
    description: "إدارة حسابات عملاء الوكالة وتتبع أدائهم وحملاتهم الإعلانية.",
    noIndex: true,
  },
  {
    match: "/dashboard",
    title: "لوحة التحكم الرئيسية | MaxP Dashboard",
    description: "نظرة عامة على مبيعات اليوم، الطلبات الجديدة، وأداء المتجر.",
    noIndex: true,
  },
  {
    match: "/super-admin",
    title: "لوحة تحكم النظام الفائقة | MaxP Super Admin",
    description: "لوحة تحكم المنصة — إدارة الشركات، الباقات، والإعدادات العامة.",
    noIndex: true,
  },
  {
    match: "/admin",
    title: "لوحة الإدارة | MaxP Admin",
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
  if (!value) return html;
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

// Self-referencing canonical: the static index.html ships
// `<link rel="canonical" href="https://maxp.online">`, which tells Google that
// EVERY route is a copy of the homepage. Replace it with the requested URL.
const upsertCanonical = (html, url) => {
  if (!url) return html;
  const clean = String(url).split("?")[0].split("#")[0];
  const tag = `<link rel="canonical" href="${escapeHtml(clean)}" />`;
  const pattern = /<link[^>]+rel=["']canonical["'][^>]*>/i;
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);
};

const injectSeoTags = (html, { title, description, image, url, noIndex, robots, price, currency, type, jsonLd }) => {
  let h = upsertTitle(html, title);
  h = upsertMeta(h, "name", "description", description);
  h = upsertMeta(h, "property", "og:title", title);
  h = upsertMeta(h, "property", "og:description", description);
  h = upsertMeta(h, "property", "og:url", url);
  h = upsertCanonical(h, url);
  h = upsertMeta(h, "property", "og:image", image);
  h = upsertMeta(h, "property", "og:image:width", "1200");
  h = upsertMeta(h, "property", "og:image:height", "630");
  h = upsertMeta(h, "property", "og:type", type || "website");
  h = upsertMeta(h, "name", "twitter:title", title);
  h = upsertMeta(h, "name", "twitter:description", description);
  h = upsertMeta(h, "name", "twitter:image", image);
  h = upsertMeta(h, "name", "twitter:card", "summary_large_image");

  if (price !== undefined && price !== null) {
    h = upsertMeta(h, "property", "product:price:amount", String(price));
    h = upsertMeta(h, "property", "product:price:currency", currency || "EGP");
  }

  if (robots) {
    const robotsPattern = /<meta[^>]+name=["']robots["'][^>]*>/i;
    const robotsTag = `<meta name="robots" content="${escapeHtml(robots)}" />`;
    h = robotsPattern.test(h)
      ? h.replace(robotsPattern, robotsTag)
      : h.replace("</head>", `  ${robotsTag}\n</head>`);
  } else if (noIndex) {
    const robotsPattern = /<meta[^>]+name=["']robots["'][^>]*>/i;
    const robotsTag = `<meta name="robots" content="noindex, nofollow" />`;
    h = robotsPattern.test(h)
      ? h.replace(robotsPattern, robotsTag)
      : h.replace("</head>", `  ${robotsTag}\n</head>`);
  } else if (noIndex === false) {
    const robotsPattern = /<meta[^>]+name=["']robots["'][^>]*>/i;
    const robotsTag = `<meta name="robots" content="index, follow" />`;
    h = robotsPattern.test(h)
      ? h.replace(robotsPattern, robotsTag)
      : h.replace("</head>", `  ${robotsTag}\n</head>`);
  }

  if (jsonLd) {
    const scriptTag = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`;
    h = h.replace("</head>", `  ${scriptTag}\n</head>`);
  }

  return h;
};

const resolveRouteSeo = (pathname) => {
  const normalized = (pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";

  // Exact match first, then longest prefix match.
  let best = null;
  let bestLen = -1;

  for (const entry of ROUTE_SEO_MAP) {
    if (normalized === entry.match || (entry.match !== "/" && normalized.startsWith(entry.match + "/"))) {
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

const handlePlatformSeo = async (req, res, next) => {
  // Only handle HTML-looking GET/HEAD requests.
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
  if (hasStaticFileExtension(req.path)) return next();

  // If request belongs to a tenant company (subdomain or custom domain) and is NOT a funnel,
  // let storefrontHtmlController handle it.
  const isFunnelRoute = req.path.startsWith("/funnel/") || req.path.startsWith("/funnels/");
  if (req.companyId && req.company && req.company.slug !== "main" && req.company.slug !== "platform" && !isFunnelRoute) {
    return next();
  }

  const accept = String(req.headers.accept || "").toLowerCase();
  if (accept && !accept.includes("text/html") && !accept.includes("*/*")) return next();

  // Handle dynamic Funnel COD sales pages (/funnel/:slug)
  if (isFunnelRoute) {
    const slug = req.path.replace(/^\/funnels?\//, "").split("/")[0].trim();
    if (slug) {
      try {
        const { getSharedPrismaClientAsync } = require("../services/sharedDatabase");
        const prisma = await getSharedPrismaClientAsync();
        const funnel = await prisma.productLandingPage?.findFirst({
          where: { slug, status: { in: ["PUBLISHED", "DRAFT"] } },
        });

        let product = null;
        let company = null;

        if (funnel?.productId) {
          product = await prisma.product?.findUnique({
            where: { id: funnel.productId },
            select: { name: true, description: true, price: true, currency: true, mainImage: true, images: true },
          });
        }
        if (funnel?.companyId) {
          company = await prisma.company?.findUnique({
            where: { id: funnel.companyId },
            select: { name: true, currency: true, logo: true },
          });
        }

        if (funnel || product) {
          const funnelConfig = typeof funnel?.config === "object" && funnel?.config !== null ? funnel.config : {};
          let productImages = [];
          if (product?.images) {
            try {
              const parsed = JSON.parse(product.images);
              if (Array.isArray(parsed)) productImages = parsed;
            } catch {}
          }

          const heroTitle = funnelConfig?.heroTitle || funnel?.title || product?.name || "عرض خاص";
          const storeName = company?.name || "طلب سريع";
          const title = `${heroTitle} | ${storeName}`;
          const description =
            funnelConfig?.heroSubtitle ||
            product?.description?.replace(/<[^>]*>/g, "").slice(0, 160) ||
            "اطلب الآن والدفع كاش عند الاستلام مع شحن سريع وضمان المعاينة قبل الاستلام.";
          const image =
            funnelConfig?.heroImage ||
            product?.mainImage ||
            productImages[0] ||
            PLATFORM_OG_COVER;

          const price = product?.price ? Number(product.price) : null;
          const currency = product?.currency || company?.currency || "EGP";

          const currentUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
          const indexHtml = await loadIndexHtml();
          if (indexHtml) {
            const html = injectSeoTags(indexHtml, {
              title,
              description,
              image,
              url: currentUrl,
              noIndex: false,
              price,
              currency,
              type: "product",
            });
            res.set("Content-Type", "text/html; charset=utf-8");
            res.set("Cache-Control", "public, max-age=60, s-maxage=300");
            return res.status(200).send(html);
          }
        }
      } catch (err) {
        console.error("❌ [PLATFORM-SEO] Error querying dynamic funnel:", err?.message);
      }
    }
  }

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
      url: routeSeo.canonical || currentUrl,
      noIndex: routeSeo.noIndex !== undefined ? routeSeo.noIndex : false,
      robots: routeSeo.robots,
      type: routeSeo.type || "website",
      jsonLd: routeSeo.jsonLd,
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).send(html);
  } catch (err) {
    console.error("❌ [PLATFORM-SEO] Error injecting SEO tags:", err?.message);
    return next();
  }
};

module.exports = {
  handlePlatformSeo,
  loadIndexHtml,
  resolveRouteSeo,
  ROUTE_SEO_MAP,
  injectSeoTags,
  clearPlatformSeoHtmlCache,
};


