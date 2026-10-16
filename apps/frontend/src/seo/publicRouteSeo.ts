/**
 * Per-route SEO for the public marketing pages on the MaxP apex domain.
 *
 * Why this lives in the client: nginx serves ONE static index.html for every
 * apex path (maxp.online / www.maxp.online) and never proxies HTML to the
 * backend, so the server-side route map
 * (apps/backend/middleware/platformSeoMiddleware.js) never runs there. Google
 * executes JS, so this module fixes the rendered tags:
 *   - per-route <title> + description (+ og/twitter),
 *   - a SELF-referencing canonical. The static file ships
 *     `<link rel="canonical" href="https://maxp.online">` for EVERY route, which
 *     told Google every marketing page was a duplicate of the homepage.
 *
 * Tenant storefronts (swan.maxp.online, …) receive their tags server-side
 * (storefrontHtmlController) — this module is a no-op on any other host, so it
 * can never canonicalize a store page to the platform domain.
 */

const APEX_HOSTS = ["maxp.online", "www.maxp.online"];
export const SITE_ORIGIN = "https://maxp.online";

export interface RouteSeo {
  title: string;
  description: string;
  /** Canonical path when it differs from the route itself (alias pages). */
  canonicalPath?: string;
}

/**
 * Ad-only landing pages (/lp/clothing-store-bundle, /lp/clothing-taste,
 * /lp/fashion-os) and review drafts (/lp/clothing-bundle-*) are intentionally
 * NOT listed here: those components set their own tags + noindex.
 */
export const ROUTE_SEO: Record<string, RouteSeo> = {
  "/": {
    title: "MaxP — منصة إدارة التواصل والتجارة الإلكترونية",
    description:
      "المنصة المتكاملة للشركات والتجار: إدارة المحادثات، أعوان الذكاء الاصطناعي، المتاجر الرقمية السريعة، وتأكيد طلبات الدفع عند الاستلام.",
  },
  "/for-merchants": {
    title: "Max P للتجارة الإلكترونية — حوّل زوارك ومحادثاتك إلى مبيعات مؤكدة",
    description:
      "حلول متطورة للتجار وأصحاب المتاجر: تأكيد أوردرات الدفع عند الاستلام عبر واتساب، شحن أسرع، وتقليل المرتجعات.",
  },
  "/lp/ai-inbox": {
    title: "Max P AI + Inbox | الذكاء الاصطناعي وصندوق الوارد الموحد",
    description:
      "الذكاء الاصطناعي للمحادثات + صندوق وارد موحد لكل المنصات (واتساب، انستجرام، فيسبوك، تلجرام). AI Agent يرد فورًا وينشئ الطلبات تلقائيًا.",
  },
  "/lp/messaging": {
    title: "Max P Inbox | واتساب وتلجرام وانستجرام وماسنجر في صندوق واحد",
    description:
      "صندوق وارد موحّد للرد على كل المنصات · توزيع المحادثات على الفريق · ردود سريعة وحجوزات تلقائية.",
  },
  "/lp/medical": {
    title: "Max P الباقة الطبية | النظام الطبي + واتساب + AI Agents",
    description:
      "نظام طبي متكامل يضم إدارة المواعيد، سجلات المرضى الإلكترونية، تأكيد الحجوزات عبر واتساب، وأعوان الذكاء الاصطناعي للعيادات.",
  },
  "/lp/mg": {
    title: "Max P للوكالات الإعلانية — إدارة المحادثات والحملات لعملاء الميديا باينج",
    description:
      "النظام المخصص لوكالات التسويق والميديا بايرز: بوابات مخصصة لكل عميل، تتبع دقيق للمبيعات، وتأكيد فوري للطلبات المحققة من الإعلانات.",
  },
  "/lp/mg-agency": {
    title: "Max P للوكالات الإعلانية — إدارة المحادثات والحملات لعملاء الميديا باينج",
    description:
      "النظام المخصص لوكالات التسويق والميديا بايرز: بوابات مخصصة لكل عميل، تتبع دقيق للمبيعات، وتأكيد فوري للطلبات المحققة من الإعلانات.",
  },
  "/lp/store-complete-bundle": {
    title: "باقة المتجر الكاملة — 17 أداة في باقة واحدة | MaxP",
    description:
      "متجر إلكتروني، كاشير فروع، مخزون، شحن، واتساب، وذكاء اصطناعي — كل أدوات تشغيل المتجر في باقة واحدة بسعر واحد.",
  },
  "/register/merchant": {
    title: "سجّل متجرك على MaxP — ابدأ مجانًا وبدون بطاقة بنكية",
    description:
      "أنشئ حساب تاجر في دقائق: متجر إلكتروني، صندوق محادثات موحّد، وتأكيد أوردرات الدفع عند الاستلام.",
  },
  "/register/affiliate": {
    title: "برنامج المسوّقين بالعمولة | MaxP Affiliate",
    description:
      "شارك رابطك واكسب عمولة متكررة على كل تاجر يشترك في MaxP.",
  },
  "/faq": {
    title: "الأسئلة الشائعة | MaxP",
    description:
      "أجوبة عن الاشتراك والأسعار، ربط واتساب، تأكيد الطلبات، والشحن في منصة MaxP.",
  },
  "/support/faq": {
    title: "الأسئلة الشائعة | MaxP",
    description:
      "أجوبة عن الاشتراك والأسعار، ربط واتساب، تأكيد الطلبات، والشحن في منصة MaxP.",
    canonicalPath: "/faq",
  },
  "/privacy": {
    title: "سياسة الخصوصية | MaxP",
    description: "كيف تجمع MaxP البيانات وتستخدمها وتحميها.",
  },
  "/privacy-policy": {
    title: "سياسة الخصوصية | MaxP",
    description: "كيف تجمع MaxP البيانات وتستخدمها وتحميها.",
    canonicalPath: "/privacy",
  },
  "/policies": {
    title: "سياسة الخصوصية | MaxP",
    description: "كيف تجمع MaxP البيانات وتستخدمها وتحميها.",
    canonicalPath: "/privacy",
  },
  "/terms": {
    title: "الشروط والأحكام | MaxP",
    description: "شروط استخدام منصة MaxP، الاشتراكات، والمسؤوليات.",
  },
  "/terms-of-service": {
    title: "الشروط والأحكام | MaxP",
    description: "شروط استخدام منصة MaxP، الاشتراكات، والمسؤوليات.",
    canonicalPath: "/terms",
  },
  "/data-deletion": {
    title: "حذف البيانات | MaxP",
    description: "طلب حذف بيانات حسابك من منصة MaxP — الخطوات ومدة التنفيذ.",
  },
};

/** Thin auth pages — keep them out of the index (they used to rank with the generic title). */
export const NOINDEX_PREFIXES = ["/auth/"];

const normalizePath = (pathname: string): string => {
  const clean = (pathname || "/").split("?")[0].split("#")[0];
  if (!clean || clean === "/") return "/";
  return clean.replace(/\/+$/, "") || "/";
};

const upsertMeta = (
  attr: "name" | "property",
  key: string,
  content: string,
): void => {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertCanonical = (href: string): void => {
  // Exactly one canonical is allowed — update the one from index.html.
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

export function buildCanonicalUrl(pathname: string): string {
  const path = normalizePath(pathname);
  const entry = ROUTE_SEO[path];
  const canonicalPath = entry?.canonicalPath ?? path;
  return `${SITE_ORIGIN}${canonicalPath === "/" ? "/" : canonicalPath}`;
}

/**
 * Applies the SEO tags for `pathname`. No-op outside the apex domain, so
 * tenant storefronts and the admin shell keep the tags the backend injected.
 */
export function applyPublicRouteSeo(pathname: string): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const host = (window.location.hostname || "").toLowerCase();
  if (!APEX_HOSTS.includes(host)) return;

  const path = normalizePath(pathname);
  const entry = ROUTE_SEO[path];
  const canonicalUrl = buildCanonicalUrl(path);

  upsertCanonical(canonicalUrl);

  if (entry) {
    document.title = entry.title;
    upsertMeta("name", "description", entry.description);
    upsertMeta("property", "og:title", entry.title);
    upsertMeta("property", "og:description", entry.description);
    upsertMeta("name", "twitter:title", entry.title);
    upsertMeta("name", "twitter:description", entry.description);
    upsertMeta("property", "og:url", canonicalUrl);
  }

  if (NOINDEX_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    upsertMeta("name", "robots", "noindex, follow");
  }
}
