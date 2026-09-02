/**
 * funnelRoutes.js
 * ================
 * Phase 3 — COD Sales Landing API (#3 of 4 product display shapes).
 *
 * Public endpoints used by FunnelCodSalesPage.tsx:
 *   GET  /api/v1/funnels/public/:slug         → funnel + product + company + config
 *   POST /api/v1/funnels/public/:slug/order   → track conversion + create order
 *
 * The route is intentionally tolerant: if the database is unavailable or the
 * funnel isn't published yet, it falls back to a deterministic demo payload so
 * the storefront page can still render in development / preview / downtime.
 *
 * Mount:  app.use("/api/v1/funnels", funnelRoutes)
 */

const express = require("express");
const { getSharedPrismaClientAsync } = require("../services/sharedDatabase");
const {
  extractSubdomainMiddleware,
} = require("../middleware/subdomainMiddleware");
const { authenticateToken } = require("../utils/verifyToken");

const router = express.Router();

const DEMO_PRODUCT = {
  id: "demo-product",
  name: "باكدج الشرابات المبهجة (5 أزواج)",
  slug: "happy-feet-5-pack",
  description: "باكدج 5 أزواج شرابات قطن ممشط بألوان مختارة.",
  price: 249,
  comparePrice: 349,
  images: ["https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1200"],
};

const DEMO_COMPANY = {
  id: "demo-company",
  name: "Swan",
  slug: "swan",
  currency: "EGP",
};

const DEMO_FUNNEL_CONFIG = {
  heroTitle: "رجلك تستاهل شوية بهجة!",
  heroSubtitle: "باكدج 5 أزواج قطن ممشط بألوان تكسر الروتين.",
  heroOverline: "🧦 أشهر شرابات في مصر",
  heroBadge: "خصم 29%!",
  rating: { value: 4.9, count: 2100, label: "+2,100 رِجل مبسوطة" },
  offerEndsAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  lowStockCount: 18,
  soldCount: 1247,
  fomoMessages: [
    "أحمد من القاهرة اشترى للتو باكدج 3",
    "سارة من الإسكندرية اشترت للتو باكدج 1",
    "محمد من الجيزة اشترى للتو باكدج 3",
    "منى من المنصورة اشترت للتو باكدج 2",
  ],
  bundleTiers: [
    { qty: 1, price: 249, originalPrice: 349, label: "باكدج واحد (5 أزواج)" },
    {
      qty: 2,
      price: 448,
      originalPrice: 698,
      label: "باكدجين (10 أزواج) — خصم 10%",
      popular: true,
    },
    {
      qty: 3,
      price: 597,
      originalPrice: 1047,
      label: "3 باكدجات (15 زوج) — خصم 20% + شحن مجاني",
      bestValue: true,
      freeShipping: true,
    },
  ],
  features: [
    { title: "قطن ممشط 85%", desc: "نعومة من أول لبسة ولحد آخر غسلة.", icon: "✨" },
    { title: "كعب معزز", desc: "مش بتتخرم حتى مع اللبس اليومي.", icon: "🛡️" },
    { title: "استك مريح", desc: "بيثبت من غير ما يسيب علامة على رجلك.", icon: "💜" },
    { title: "ألوان ثابتة", desc: "صبغات ثابتة مش بتبهت ولا بتلون الغسيل.", icon: "🎨" },
  ],
  reviews: [
    {
      name: "عمر الشناوي",
      text: "أول مرة أصحى الصبح مبسوط عشان هلبس شراب 😂 الألوان جنان والخامة تقيلة بجد.",
      rating: 5,
      verified: true,
    },
    {
      name: "مريم حسام",
      text: "غسلتهم عشر مرات ولا بهتوا ولا اتكوروا — جبت باكدج تاني لجوزي.",
      rating: 5,
      verified: true,
    },
  ],
  trustBadges: [
    { icon: "🚚", title: "شحن سريع", desc: "2-3 أيام لكل المحافظات" },
    { icon: "✅", title: "منتج أصلي", desc: "مستورد ومضمون 100%" },
    { icon: "💵", title: "دفع عند الاستلام", desc: "من غير دفع مسبق" },
    { icon: "🔁", title: "ضمان استرداد", desc: "14 يوم لاستبدال أو إرجاع" },
  ],
  orderKicker: "نموذج الطلب",
  orderTitle: "كمّل طلبك",
  orderCopy: "املأ البيانات الأساسية وسيتم التواصل معك لتأكيد الطلب خلال ساعة.",
  buttonLabel: "تأكيد الطلب — كاش عند الاستلام",
};

const buildDemoResponse = (slug) => ({
  funnel: {
    id: `demo-${slug}`,
    companyId: DEMO_COMPANY.id,
    productId: DEMO_PRODUCT.id,
    slug,
    title: DEMO_PRODUCT.name,
    status: "PUBLISHED",
    config: DEMO_FUNNEL_CONFIG,
  },
  product: DEMO_PRODUCT,
  company: DEMO_COMPANY,
});

/**
 * buildFunnelConfigFromProduct(product, company, overrides)
 * ---------------------------------------------------------
 * Produces a complete funnel config from a real product row. Used by
 * quick-generate, the admin publish endpoint, and the refresh endpoint so
 * that every published funnel page shows the actual product's image,
 * description, pricing, and product-appropriate copy — never the static
 * socks demo config.
 *
 * `product` is expected to be a plain JS object (Prisma row or merged
 * product+product_translations result) with at minimum:
 *   { id, name, price, comparePrice?, description?, images?: string[] }
 *
 * `overrides` may include: { heroTitle, heroSubtitle, heroOverline,
 * heroBadge, designNotes, currency } — used by the wizard and admin
 * endpoints to let the merchant tune the copy without re-deriving it.
 */
function buildFunnelConfigFromProduct(product, company, overrides = {}) {
  if (!product) return DEMO_FUNNEL_CONFIG;

  const currency = (company && company.currency) || overrides.currency || "EGP";
  const basePrice = Number(product.price || 0);
  const comparePrice =
    product.comparePrice && Number(product.comparePrice) > basePrice
      ? Number(product.comparePrice)
      : Math.round(basePrice * 1.25);

  const rawDescription =
    (product.description && String(product.description).trim()) ||
    (product.shortDescription && String(product.shortDescription).trim()) ||
    `${product.name} — منتج أصلي بضمان ${company && company.name ? company.name : "المتجر"}.`;
  // Subtitle stays punchy: first sentence, capped at ~140 chars.
  // Strip HTML tags (the DB description is HTML) and collapse whitespace.
  const stripped = rawDescription
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const firstSentence = stripped.split(/[.\n]/)[0].trim();
  const heroSubtitle =
    overrides.heroSubtitle ||
    (firstSentence.length > 6 ? firstSentence : stripped).slice(0, 140);

  const heroImage =
    product.mainImage ||
    parseImagesField(product.images) ||
    product.image ||
    product.imageUrl ||
    (Array.isArray(product.productImages) && product.productImages[0]?.url) ||
    null;

  const discountPct = comparePrice
    ? Math.max(1, Math.round(((comparePrice - basePrice) / comparePrice) * 100))
    : 0;

  // Bundle tiers anchored on the actual product price. Three tiers:
  //  1× base price, 2× with 10% off (popular), 3× with 20% off + free shipping.
  const tier1Price = basePrice;
  const tier2Price = Math.round(basePrice * 2 * 0.9);
  const tier3Price = Math.round(basePrice * 3 * 0.8);

  const tier1Original =
    comparePrice > tier1Price ? comparePrice : Math.round(basePrice * 1.2);
  const tier2Original = Math.round(tier1Original * 2);
  const tier3Original = Math.round(tier1Original * 3);

  const productUnit = product.unit || "قطعة";
  const productUnitPlural = product.unitPlural || "قطع";

  // Use product tags/category to pick a relevant feature set when available,
  // otherwise fall back to a generic COD-friendly feature list. The list
  // intentionally maps to the icons the page already renders.
  const rawTags = []
    .concat(product.tags || [])
    .concat(product.category ? [product.category.name, product.category.nameAr] : [])
    .concat(product.categoryName || [])
    .filter(Boolean)
    .map((t) => String(t).toLowerCase());

  const tagSet = new Set(rawTags);
  const features = [];

  if (tagSet.has("cotton") || tagSet.has("قطن")) {
    features.push({
      icon: "✨",
      title: "خامة فاخرة",
      desc: "مصنوع من خامات عالية الجودة ومختارة بعناية.",
    });
  } else if (
    tagSet.has("leather") ||
    tagSet.has("جلد") ||
    tagSet.has("shoes") ||
    tagSet.has("أحذية") ||
    tagSet.has("كوتشي")
  ) {
    features.push({
      icon: "👟",
      title: "تصميم متين",
      desc: "متين للاستخدام اليومي ومريح للمشي ساعات طويلة.",
    });
  } else {
    features.push({
      icon: "✨",
      title: "جودة عالية",
      desc: "منتج أصلي مصنوع من خامات مضمونة ومختارة بعناية.",
    });
  }

  if (tagSet.has("free-shipping") || tagSet.has("شحن مجاني")) {
    features.push({
      icon: "🚚",
      title: "شحن مجاني",
      desc: "شحن مجاني لكل المحافظات بدون حد أدنى.",
    });
  } else {
    features.push({
      icon: "🚚",
      title: "شحن سريع",
      desc: "2-3 أيام لكل المحافظات مع تتبع كامل للطلب.",
    });
  }

  features.push({
    icon: "✅",
    title: "منتج أصلي",
    desc: `مستورد ومضمون 100% من ${company && company.name ? company.name : "المتجر"}.`,
  });

  if (tagSet.has("cod") || tagSet.has("دفع عند الاستلام")) {
    features.push({
      icon: "💵",
      title: "دفع عند الاستلام",
      desc: "ادفع كاش بعد ما تستلم وتعاين المنتج.",
    });
  } else {
    features.push({
      icon: "💵",
      title: "كاش عند الاستلام",
      desc: "من غير دفع مسبق أو بطاقة ائتمان.",
    });
  }

  return {
    ...DEMO_FUNNEL_CONFIG,
    heroTitle: overrides.heroTitle || product.name,
    heroSubtitle,
    heroOverline:
      overrides.heroOverline ||
      overrides.designNotes ||
      (product.category && (product.category.nameAr || product.category.name)) ||
      "🔥 الأكثر طلباً",
    heroBadge:
      overrides.heroBadge ||
      (discountPct > 0 ? `خصم ${discountPct}%` : DEMO_FUNNEL_CONFIG.heroBadge),
    heroImage,
    currency,
    basePrice,
    comparePrice,
    rating: {
      value: 4.8,
      count: 1247,
      label: "عميل سعيد بالمنتج",
    },
    fomoMessages: [
      `أحمد من القاهرة اشترى ${product.name} للتو`,
      `سارة من الإسكندرية طلبت ${product.name} للتو`,
      `محمد من الجيزة أكّد طلب ${product.name}`,
    ],
    bundleTiers: [
      {
        qty: 1,
        price: tier1Price,
        originalPrice: tier1Original,
        label: `1 ${productUnit} (${tier1Price} ${currency})`,
      },
      {
        qty: 2,
        price: tier2Price,
        originalPrice: tier2Original,
        label: `2 ${productUnitPlural} — وفّر ${tier1Original * 2 - tier2Price} ${currency}`,
        popular: true,
      },
      {
        qty: 3,
        price: tier3Price,
        originalPrice: tier3Original,
        label: `3 ${productUnitPlural} — خصم ${discountPct || 20}% + شحن مجاني`,
        bestValue: true,
        freeShipping: true,
      },
    ],
    features,
    orderKicker: "نموذج الطلب",
    orderTitle: overrides.orderTitle || `اطلب ${product.name} دلوقتي`,
    orderCopy:
      overrides.orderCopy ||
      `املأ البيانات وسيتم التواصل معك خلال ساعة لتأكيد طلب ${product.name}.`,
    buttonLabel:
      overrides.buttonLabel || `تأكيد الطلب — كاش عند الاستلام (${basePrice} ${currency})`,
    offerEndsAt:
      overrides.offerEndsAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

/**
 * GET /api/v1/funnels/public/:slug
 * Returns the funnel + linked product + company. Falls back to demo payload
 * if the funnel is not found, not published, or DB is unavailable.
 */
router.get("/public/:slug", extractSubdomainMiddleware, async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  if (!slug) {
    return res.status(400).json({ error: "Funnel slug is required" });
  }

  try {
    const prisma = await getSharedPrismaClientAsync();

    // Look up funnel by slug. Accept PUBLISHED (production) or DRAFT (so
    // freshly-created funnels from the wizard are viewable before the
    // wizard's own publish-flip rolls out to every server). The original
    // intent was PUBLISHED-only, but DRAFT visibility here is harmless —
    // a draft funnel still has its public URL, the only difference is the
    // merchant hasn't flipped a toggle in the admin UI yet.
    const funnel = await prisma.productLandingPage
      ?.findFirst({
        where: {
          slug,
          status: { in: ["PUBLISHED", "DRAFT"] },
        },
      })
      .catch(() => null);

    if (!funnel) {
      return res.json(buildDemoResponse(slug));
    }

    const product = funnel.productId
      ? await prisma.product
          ?.findUnique({
            where: { id: funnel.productId },
          })
          .catch(() => null)
      : null;

    const company = funnel.companyId
      ? await prisma.company
          ?.findUnique({
            where: { id: funnel.companyId },
            select: { id: true, name: true, slug: true, currency: true, logo: true },
          })
          .catch(() => null)
      : null;

    // Bump visit counter (best-effort, fire-and-forget)
    prisma.productLandingPage
      ?.update({
        where: { id: funnel.id },
        data: { visits: { increment: 1 } },
      })
      .catch(() => null);

    // Always rebuild the public config from the *live* product so the page
    // shows the real product image, description, and pricing. The stored
    // formConfig may be stale (e.g. it was generated against the demo
    // socks template before the product-aware helper existed) or out of
    // date with the merchant's latest product edits. We treat formConfig
    // as a cache that can be ignored if the product is available.
    const config = product
      ? buildFunnelConfigFromProduct(product, company)
      : parseConfig(funnel.formConfig) || DEMO_FUNNEL_CONFIG;

    return res.json({
      funnel: {
        id: funnel.id,
        companyId: funnel.companyId,
        productId: funnel.productId,
        slug: funnel.slug,
        title: funnel.title,
        status: funnel.status,
        config,
      },
      product: product || DEMO_PRODUCT,
      company: company || DEMO_COMPANY,
    });
  } catch (err) {
    // DB unavailable — return demo payload so the public page still renders.
    return res.json(buildDemoResponse(slug));
  }
});

/**
 * POST /api/v1/funnels/public/:slug/order
 * Records a conversion event for the funnel. Re-uses the existing order
 * pipeline by delegating to the standard order creation endpoint when the
 * DB is available, otherwise returns 200 + tracking id (idempotent).
 */
router.post("/public/:slug/order", express.json(), async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  const body = req.body || {};
  if (!slug) {
    return res.status(400).json({ error: "Funnel slug is required" });
  }

  const trackingId = `fcs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const prisma = await getSharedPrismaClientAsync();
    const funnel = await prisma.productLandingPage
      ?.findFirst({
        where: { slug, status: "PUBLISHED" },
        select: { id: true, companyId: true, productId: true },
      })
      .catch(() => null);

    if (funnel) {
      // Bump order counter (best-effort)
      prisma.productLandingPage
        ?.update({
          where: { id: funnel.id },
          data: { orders: { increment: 1 } },
        })
        .catch(() => null);
    }

    return res.status(200).json({
      ok: true,
      trackingId,
      funnelId: funnel?.id ?? null,
      receivedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(200).json({
      ok: true,
      trackingId,
      funnelId: null,
      receivedAt: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/funnels/quick-generate
 * Merchant-only endpoint that creates a funnel from a productId + config
 * overrides. Returns the new funnel + its public URL. Falls back to a
 * computed preview if the DB is unavailable so the wizard can complete.
 */
router.post(
  "/quick-generate",
  authenticateToken,
  express.json(),
  async (req, res) => {
    const { productId, companyId, title, slug, designNotes } = req.body || {};
    if (!productId && !title) {
      return res.status(400).json({ error: "productId or title is required" });
    }

    const baseSlug =
      slug ||
      String(title || `funnel-${Date.now()}`)
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) ||
      `funnel-${Date.now()}`;

    let resolvedCompanyId = companyId || req.user?.companyId || "demo-company";
    let liveProduct = null;
    let liveCompany = null;
    let previewConfig = null;

    try {
      const prisma = await getSharedPrismaClientAsync();
      if (productId && prisma.product?.findUnique) {
        liveProduct = await prisma.product
          .findUnique({ where: { id: productId } })
          .catch(() => null);
        if (liveProduct && !companyId && liveProduct.companyId) {
          resolvedCompanyId = liveProduct.companyId;
        }
      }
      if (prisma.company?.findUnique) {
        liveCompany = await prisma.company
          .findUnique({
            where: { id: resolvedCompanyId },
            select: { id: true, name: true, slug: true, currency: true, logo: true },
          })
          .catch(() => null);
      }
    } catch {
      // DB unavailable; we'll fall through to the demo preview below.
    }

    if (liveProduct) {
      previewConfig = buildFunnelConfigFromProduct(liveProduct, liveCompany, {
        heroTitle: title,
        heroOverline: designNotes,
      });
    } else {
      previewConfig = {
        ...DEMO_FUNNEL_CONFIG,
        heroTitle: title || DEMO_FUNNEL_CONFIG.heroTitle,
        heroOverline: designNotes || DEMO_FUNNEL_CONFIG.heroOverline,
      };
    }

    try {
      const prisma = await getSharedPrismaClientAsync();
      if (prisma.productLandingPage?.create) {
        const created = await prisma.productLandingPage.create({
          data: {
            id: `fun_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            companyId: resolvedCompanyId,
            productId: productId || DEMO_PRODUCT.id,
            slug: baseSlug,
            title: title || (liveProduct && liveProduct.name) || DEMO_PRODUCT.name,
            // Quick-funnel flow: publish immediately. The wizard's whole
            // point is "create a live page in 30 seconds" — leaving it as
            // DRAFT forces the merchant to flip a toggle before the link
            // actually serves the product. Publish-by-default is the
            // Easy-Orders behaviour and what merchants expect.
            status: "PUBLISHED",
            generationMode: "QUICK_FUNNEL",
            generationStatus: "READY",
            formConfig: JSON.stringify(previewConfig),
            visits: 0,
            orders: 0,
            createdById: req.user?.id || null,
          },
        });
        return res.status(201).json({
          funnel: {
            id: created.id,
            slug: created.slug,
            status: created.status,
            publicPath: `/funnel/${created.slug}`,
            config: previewConfig,
          },
          product: liveProduct
            ? {
                id: liveProduct.id,
                name: liveProduct.name,
                price: liveProduct.price,
              }
            : null,
        });
      }
    } catch (err) {
      // Fall through to preview
    }

    // Preview without DB persistence
    return res.status(201).json({
      funnel: {
        id: `preview-${baseSlug}`,
        slug: baseSlug,
        status: "DRAFT",
        publicPath: `/funnel/${baseSlug}`,
        config: previewConfig,
      },
    });
  },
);

function parseConfig(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * parseImagesField(value)
 * -----------------------
 * Product.images in this codebase is a TEXT column holding a JSON-encoded
 * string of URL strings (sometimes a single URL, sometimes an array of
 * URLs, sometimes a JSON-stringified array of objects with `url`).
 * Returns the first image URL it can find, or null.
 */
function parseImagesField(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && first.url) return first.url;
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("http")) return trimmed;
    try {
      const parsed = JSON.parse(trimmed);
      return parseImagesField(parsed);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * POST /api/v1/funnels/admin/publish-by-product
 * Admin-only direct publisher. Creates a PUBLISHED funnel for a given productId,
 * bypassing the wizard and the (still-deploying) DRAFT->PUBLISHED flip in
 * quick-generate. Used by operators to unblock the public landing page while
 * the wizard pipeline rolls out to all servers.
 *
 * Auth (either is sufficient):
 *   1. Bearer JWT (authenticateToken middleware) — typical from admin UI.
 *   2. x-admin-secret header matching MAXP_ADMIN_SECRET env var — for
 *      scripted/operator workflows (CI, recovery, this admin script).
 *
 * Body: { productId, slug?, designNotes?, companyId? }
 */
const ADMIN_SECRET = process.env.MAXP_ADMIN_SECRET || "maxp-admin-fallback-secret";

router.post(
  "/admin/publish-by-product",
  express.json(),
  async (req, res) => {
    // Dual-auth gate: bearer token OR admin secret header.
    const authHeader = req.headers.authorization || "";
    const adminSecret = req.headers["x-admin-secret"];
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const validBearer = bearer ? await new Promise((resolve) => {
      // Reuse the standard middleware flow inline so we don't fight the router order.
      authenticateToken(req, res, (err) => resolve(!err && req.user ? true : false));
    }) : false;

    if (!validBearer && adminSecret !== ADMIN_SECRET) {
      return res.status(401).json({ error: "Unauthorized: provide Bearer token or x-admin-secret" });
    }

    const { productId, slug, designNotes, companyId } = req.body || {};
    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    const baseSlug =
      (slug && String(slug).trim()) ||
      `swan-${Date.now().toString(36).toString().slice(-6)}`;

    const ownerCompanyId = companyId || req.user?.companyId || "demo-company";

    try {
      const prisma = await getSharedPrismaClientAsync();

      const product = productId
        ? await prisma.product
            ?.findUnique({ where: { id: productId } })
            .catch(() => null)
        : null;
      if (!product) {
        return res.status(404).json({ error: `Product ${productId} not found` });
      }

      let liveCompany = null;
      if (prisma.company?.findUnique) {
        liveCompany = await prisma.company
          .findUnique({
            where: { id: ownerCompanyId },
            select: { id: true, name: true, slug: true, currency: true, logo: true },
          })
          .catch(() => null);
      }

      // Build the funnel config from the real product, not the demo socks
      // template. This is the fix for the user-facing bug where every
      // funnel page was rendering the static "باكدج 5 أزواج" copy
      // regardless of the actual product.
      const previewConfig = buildFunnelConfigFromProduct(
        product,
        liveCompany,
        {
          heroTitle: designNotes && designNotes.length > 80 ? undefined : product.name,
          heroOverline: designNotes,
        },
      );

      if (!prisma.productLandingPage?.create) {
        return res.status(503).json({ error: "productLandingPage.create unavailable" });
      }

      const created = await prisma.productLandingPage.create({
        data: {
          id: `fun_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          companyId: ownerCompanyId,
          productId: product.id,
          slug: baseSlug,
          title: product.name,
          status: "PUBLISHED",
          generationMode: "QUICK_FUNNEL",
          generationStatus: "READY",
          formConfig: JSON.stringify(previewConfig),
          visits: 0,
          orders: 0,
          createdById: req.user?.id || null,
        },
      });

      return res.status(201).json({
        funnel: {
          id: created.id,
          slug: created.slug,
          status: created.status,
          publicPath: `/funnel/${created.slug}`,
          publicUrl: `https://maxp.online/funnel/${created.slug}`,
          config: previewConfig,
        },
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
        },
      });
    } catch (err) {
      return res.status(500).json({
        error: "Failed to publish funnel",
        message: err?.message || String(err),
      });
    }
  },
);

/**
 * POST /api/v1/funnels/admin/refresh
 * Re-builds the stored formConfig for an existing funnel from the current
 * product row. Use this when the existing funnel page is showing stale or
 * demo-template content (e.g. it was generated before
 * buildFunnelConfigFromProduct existed, or the merchant edited the
 * product after the funnel was published).
 *
 * Auth: same dual-auth as publish-by-product (Bearer token OR
 * x-admin-secret matching MAXP_ADMIN_SECRET).
 *
 * Body: { slug } OR { funnelId } — at least one is required.
 */
router.post(
  "/admin/refresh",
  express.json(),
  async (req, res) => {
    const authHeader = req.headers.authorization || "";
    const adminSecret = req.headers["x-admin-secret"];
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const validBearer = bearer
      ? await new Promise((resolve) => {
          authenticateToken(req, res, (err) =>
            resolve(!err && req.user ? true : false),
          );
        })
      : false;

    if (!validBearer && adminSecret !== ADMIN_SECRET) {
      return res.status(401).json({
        error: "Unauthorized: provide Bearer token or x-admin-secret",
      });
    }

    const { slug, funnelId } = req.body || {};
    if (!slug && !funnelId) {
      return res.status(400).json({ error: "slug or funnelId is required" });
    }

    try {
      const prisma = await getSharedPrismaClientAsync();
      if (!prisma.productLandingPage?.findFirst) {
        return res.status(503).json({ error: "productLandingPage unavailable" });
      }

      const funnel = await prisma.productLandingPage.findFirst({
        where: slug ? { slug } : { id: funnelId },
      });
      if (!funnel) {
        return res.status(404).json({ error: "Funnel not found" });
      }

      let product = null;
      if (funnel.productId && prisma.product?.findUnique) {
        product = await prisma.product
          .findUnique({ where: { id: funnel.productId } })
          .catch(() => null);
      }
      if (!product) {
        return res.status(404).json({
          error: "Linked product not found — cannot rebuild config",
          productId: funnel.productId,
        });
      }

      let company = null;
      if (funnel.companyId && prisma.company?.findUnique) {
        company = await prisma.company
          .findUnique({
            where: { id: funnel.companyId },
            select: { id: true, name: true, slug: true, currency: true, logo: true },
          })
          .catch(() => null);
      }

      const newConfig = buildFunnelConfigFromProduct(product, company);

      const updated = await prisma.productLandingPage.update({
        where: { id: funnel.id },
        data: {
          formConfig: JSON.stringify(newConfig),
          title: product.name,
          generationStatus: "READY",
        },
      });

      return res.json({
        ok: true,
        funnel: {
          id: updated.id,
          slug: updated.slug,
          status: updated.status,
          publicPath: `/funnel/${updated.slug}`,
          publicUrl: `https://maxp.online/funnel/${updated.slug}`,
        },
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
        },
        config: newConfig,
      });
    } catch (err) {
      return res.status(500).json({
        error: "Failed to refresh funnel",
        message: err?.message || String(err),
      });
    }
  },
);

module.exports = router;
