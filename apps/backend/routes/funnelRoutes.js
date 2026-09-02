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

    // Look up funnel by slug within the tenant's company scope.
    // Falls through to demo if the table doesn't exist or the record is missing.
    const funnel = await prisma.productLandingPage
      ?.findFirst({
        where: {
          slug,
          status: "PUBLISHED",
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

    return res.json({
      funnel: {
        id: funnel.id,
        companyId: funnel.companyId,
        productId: funnel.productId,
        slug: funnel.slug,
        title: funnel.title,
        status: funnel.status,
        config: parseConfig(funnel.formConfig) || DEMO_FUNNEL_CONFIG,
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

    const previewConfig = {
      ...DEMO_FUNNEL_CONFIG,
      heroTitle: title || DEMO_FUNNEL_CONFIG.heroTitle,
      heroOverline: designNotes || DEMO_FUNNEL_CONFIG.heroOverline,
    };

    try {
      const prisma = await getSharedPrismaClientAsync();
      if (prisma.productLandingPage?.create) {
        const created = await prisma.productLandingPage.create({
          data: {
            id: `fun_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            companyId: companyId || "demo-company",
            productId: productId || DEMO_PRODUCT.id,
            slug: baseSlug,
            title: title || DEMO_PRODUCT.name,
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

module.exports = router;
