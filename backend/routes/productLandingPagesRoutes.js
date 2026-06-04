const express = require('express');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const {
  extractSubdomainMiddleware,
  requireCompany,
} = require('../middleware/subdomainMiddleware');
const {
  authenticateToken,
  requireRole,
} = require('../utils/verifyToken');

const router = express.Router();

const STATUS_VALUES = new Set(['DRAFT', 'PUBLISHED', 'PAUSED']);
const DESIGN_NOTES_FIELD = 'ai' + 'Prompt';
const LEGACY_IMAGE_STACK_MODE = ['A', 'I'].join('') + '_IMAGE_STACK';
const DEFAULT_FORM_CONFIG = {
  orderKicker: 'نموذج الطلب',
  orderTitle: 'اطلب المنتج الآن',
  orderCopy: 'املأ البيانات الأساسية، وسيتم التواصل معك لتأكيد الطلب.',
  buttonLabel: 'تأكيد الطلب',
};

const PRODUCT_SELECT = Object.freeze({
  id: true,
  name: true,
  description: true,
  sku: true,
  slug: true,
  price: true,
  comparePrice: true,
  images: true,
  mainImage: true,
  stock: true,
  trackInventory: true,
  isActive: true,
  isHidden: true,
  companyId: true,
  metadata: true,
  productVariants: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      productId: true,
      name: true,
      type: true,
      sku: true,
      price: true,
      comparePrice: true,
      images: true,
      stock: true,
      trackInventory: true,
      isActive: true,
      sortOrder: true,
      metadata: true,
    },
  },
});

const LIST_PRODUCT_SELECT = Object.freeze({
  id: true,
  name: true,
  slug: true,
  price: true,
  mainImage: true,
  images: true,
});

let ensureTablePromise = null;

async function getPrisma() {
  return getSharedPrismaClientAsync();
}

async function ensureProductLandingPagesTable(prisma) {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "product_landing_pages" (
          "id" TEXT NOT NULL,
          "companyId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'DRAFT',
          "generationMode" TEXT NOT NULL DEFAULT 'IMAGE_STACK',
          "generationStatus" TEXT NOT NULL DEFAULT 'NEEDS_IMAGES',
          "${DESIGN_NOTES_FIELD}" TEXT,
          "slices" TEXT,
          "formConfig" TEXT,
          "seo" TEXT,
          "productSnapshot" TEXT,
          "visits" INTEGER NOT NULL DEFAULT 0,
          "orders" INTEGER NOT NULL DEFAULT 0,
          "publishedAt" TIMESTAMP(3),
          "createdById" TEXT,
          "updatedById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "product_landing_pages_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "product_landing_pages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "product_landing_pages_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "product_landing_pages_companyId_slug_key"
        ON "product_landing_pages" ("companyId", "slug")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "product_landing_pages_companyId_status_idx"
        ON "product_landing_pages" ("companyId", "status")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "product_landing_pages_productId_idx"
        ON "product_landing_pages" ("productId")
      `);
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  return ensureTablePromise;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonValue(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function parseJsonRecord(value, fallback = {}) {
  const parsed = parseJsonValue(value, fallback);
  return isRecord(parsed) ? parsed : fallback;
}

function parseJsonArray(value, fallback = []) {
  const parsed = parseJsonValue(value, fallback);
  return Array.isArray(parsed) ? parsed : fallback;
}

function stringifyNullable(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  return typeof value === 'string' ? value : JSON.stringify(value);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value, maxLength = 255) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim().slice(0, maxLength);
}

function sanitizeRichText(value, maxLength = 255) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeSlug(value, fallback = 'landing-page') {
  const raw = normalizeText(value, 140)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06ff-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return raw || fallback;
}

function normalizeStatus(value, fallback = 'DRAFT') {
  const status = normalizeText(value, 20).toUpperCase();
  return STATUS_VALUES.has(status) ? status : fallback;
}

function normalizeSlices(value) {
  return parseJsonArray(value)
    .map((slice, index) => {
      if (typeof slice === 'string') {
        return {
          src: slice.trim(),
          alt: `Landing image slice ${index + 1}`,
          sortOrder: index + 1,
        };
      }

      if (!isRecord(slice)) {
        return null;
      }

      const src = normalizeText(slice.src || slice.imageUrl || slice.url, 1000);
      if (!src) {
        return null;
      }

      return {
        id: normalizeText(slice.id, 120) || `slice-${index + 1}`,
        src,
        alt: normalizeText(slice.alt, 220) || `Landing image slice ${index + 1}`,
        prompt: normalizeText(slice.prompt, 1600) || undefined,
        historyId: normalizeText(slice.historyId, 120) || undefined,
        width: Number(slice.width) || 860,
        height: Number(slice.height) || 1800,
        sortOrder: Number(slice.sortOrder) || index + 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}

function normalizeImages(value) {
  const images = parseJsonArray(value, []);
  if (images.length > 0) {
    return images
      .map((image) => normalizeText(image, 1000))
      .filter(Boolean);
  }

  const direct = normalizeText(value, 1000);
  return direct ? [direct] : [];
}

function readVariantAttributes(variant) {
  const metadata = parseJsonRecord(variant.metadata, {});
  const candidates = [
    metadata.attributeValues,
    metadata.attributes,
    metadata.options,
  ];
  const attributes = {};

  candidates.forEach((candidate) => {
    if (!isRecord(candidate)) return;
    Object.entries(candidate).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        attributes[key] = String(value).trim();
      }
    });
  });

  if (Object.keys(attributes).length === 0 && variant.name) {
    const parts = String(variant.name)
      .split(/\s*[-/|]\s*/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts[0]) {
      attributes.Color = parts[0];
    }
    if (parts[1]) {
      attributes.Size = parts[1];
    }
  }

  return attributes;
}

function formatVariant(variant) {
  const images = normalizeImages(variant.images);
  const attributes = readVariantAttributes(variant);

  return {
    id: variant.id,
    productId: variant.productId,
    name: variant.name,
    type: variant.type,
    sku: variant.sku,
    price: variant.price === null || variant.price === undefined ? null : toNumber(variant.price),
    comparePrice:
      variant.comparePrice === null || variant.comparePrice === undefined
        ? null
        : toNumber(variant.comparePrice),
    images,
    stock: variant.stock,
    trackInventory: variant.trackInventory,
    isActive: variant.isActive,
    sortOrder: variant.sortOrder,
    metadata: variant.metadata,
    attributes,
    attributeValues: attributes,
  };
}

function formatProduct(product, { summary = false } = {}) {
  if (!product) {
    return null;
  }

  const images = normalizeImages(product.images);
  const mainImage = normalizeText(product.mainImage, 1000) || images[0] || null;

  return {
    id: product.id,
    companyId: product.companyId,
    name: product.name,
    description: summary
      ? sanitizeRichText(product.description, 240)
      : product.description || '',
    sku: product.sku,
    slug: product.slug,
    price: toNumber(product.price),
    comparePrice:
      product.comparePrice === null || product.comparePrice === undefined
        ? null
        : toNumber(product.comparePrice),
    mainImage,
    images: mainImage ? Array.from(new Set([mainImage, ...images])) : images,
    stock: product.stock,
    trackInventory: product.trackInventory,
    isActive: product.isActive,
    isHidden: product.isHidden,
    metadata: summary ? undefined : product.metadata,
    variants: Array.isArray(product.productVariants)
      ? product.productVariants.map(formatVariant)
      : [],
    productVariants: Array.isArray(product.productVariants)
      ? product.productVariants.map(formatVariant)
      : [],
  };
}

function formatSnapshotProduct(snapshot, companyId) {
  if (!isRecord(snapshot)) {
    return null;
  }

  return formatProduct({
    companyId,
    stock: null,
    trackInventory: false,
    isActive: true,
    isHidden: false,
    ...snapshot,
    productVariants: Array.isArray(snapshot.productVariants)
      ? snapshot.productVariants
      : Array.isArray(snapshot.variants)
        ? snapshot.variants
        : [],
  });
}

function buildProductSnapshot(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    price: toNumber(product.price),
    comparePrice:
      product.comparePrice === null || product.comparePrice === undefined
        ? null
        : toNumber(product.comparePrice),
    description: sanitizeRichText(product.description, 900),
    mainImage: normalizeText(product.mainImage, 1000) || normalizeImages(product.images)[0] || null,
    images: normalizeImages(product.images),
    variants: Array.isArray(product.productVariants)
      ? product.productVariants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          price:
            variant.price === null || variant.price === undefined
              ? null
              : toNumber(variant.price),
          attributes: readVariantAttributes(variant),
        }))
      : [],
  };
}

function createRouteError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function ensurePublishReady(prisma, { companyId, productId, slices }) {
  const normalizedSlices = normalizeSlices(slices);

  if (normalizedSlices.length === 0) {
    throw createRouteError(400, 'لا يمكن نشر صفحة الهبوط بدون صور');
  }

  const product = await getCompanyProduct(prisma, productId, companyId);
  if (!product) {
    throw createRouteError(404, 'المنتج غير موجود داخل هذه الشركة');
  }

  if (product.isActive === false) {
    throw createRouteError(400, 'لا يمكن نشر صفحة هبوط لمنتج غير نشط');
  }

  return { product, slices: normalizedSlices };
}

function formatLandingPage(landing, { includeProduct = true } = {}) {
  if (!landing) {
    return null;
  }

  const formConfig = {
    ...DEFAULT_FORM_CONFIG,
    ...parseJsonRecord(landing.formConfig, {}),
  };
  const seo = parseJsonRecord(landing.seo, {});
  const slices = normalizeSlices(landing.slices);

  return {
    id: landing.id,
    companyId: landing.companyId,
    productId: landing.productId,
    slug: landing.slug,
    title: landing.title,
    status: landing.status,
    generationMode:
      landing.generationMode === LEGACY_IMAGE_STACK_MODE
        ? 'IMAGE_STACK'
        : landing.generationMode,
    generationStatus: landing.generationStatus,
    designNotes: landing[DESIGN_NOTES_FIELD] || '',
    slices,
    formConfig,
    seo,
    productSnapshot: parseJsonRecord(landing.productSnapshot, null),
    visits: landing.visits,
    orders: landing.orders,
    publishedAt: landing.publishedAt,
    createdAt: landing.createdAt,
    updatedAt: landing.updatedAt,
    publicPath: `/store/lp/${landing.slug}`,
    product: includeProduct ? formatProduct(landing.product, { summary: false }) : undefined,
  };
}

async function findLandingForCompany(prisma, id, companyId, options = {}) {
  await ensureProductLandingPagesTable(prisma);
  return prisma.productLandingPage.findFirst({
    where: {
      id,
      companyId,
    },
    include: options.includeProduct
      ? {
          product: {
            select: PRODUCT_SELECT,
          },
        }
      : undefined,
  });
}

async function getCompanyProduct(prisma, productId, companyId) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      companyId,
      deletedAt: null,
    },
    select: PRODUCT_SELECT,
  });

  return product;
}

router.get('/public/:slug', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const prisma = await getPrisma();
    await ensureProductLandingPagesTable(prisma);

    const slug = normalizeSlug(req.params.slug);
    const landing = await prisma.productLandingPage.findFirst({
      where: {
        companyId: req.company.id,
        slug,
        status: 'PUBLISHED',
      },
      include: {
        product: {
          select: PRODUCT_SELECT,
        },
      },
    });

    if (!landing || !landing.product || landing.product.isActive === false) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الهبوط غير موجودة أو غير منشورة',
      });
    }

    await prisma.productLandingPage
      .update({
        where: { id: landing.id },
        data: { visits: { increment: 1 } },
      })
      .catch((error) => {
        console.warn('[PRODUCT-LANDING] Failed to increment visit:', error.message);
      });

    return res.json({
      success: true,
      data: {
        landing: formatLandingPage(landing),
        product: formatProduct(landing.product),
        company: {
          id: req.company.id,
          name: req.company.name,
          slug: req.company.slug,
          logo: req.company.logo,
          currency: req.company.currency,
        },
      },
    });
  } catch (error) {
    console.error('[PRODUCT-LANDING] Public fetch failed:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر تحميل صفحة الهبوط',
      error: error.message,
    });
  }
});

router.post('/public/:slug/order', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const prisma = await getPrisma();
    await ensureProductLandingPagesTable(prisma);

    const slug = normalizeSlug(req.params.slug);
    const landing = await prisma.productLandingPage.findFirst({
      where: {
        companyId: req.company.id,
        slug,
        status: 'PUBLISHED',
      },
      select: { id: true },
    });

    if (!landing) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الهبوط غير موجودة',
      });
    }

    await prisma.productLandingPage.update({
      where: { id: landing.id },
      data: { orders: { increment: 1 } },
    });

    return res.json({
      success: true,
      data: { id: landing.id },
    });
  } catch (error) {
    console.error('[PRODUCT-LANDING] Order increment failed:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر تسجيل طلب صفحة الهبوط',
      error: error.message,
    });
  }
});

router.use(authenticateToken);
router.use(requireRole(['OWNER', 'COMPANY_ADMIN']));

router.get('/preview/:slug', async (req, res) => {
  try {
    const prisma = await getPrisma();
    await ensureProductLandingPagesTable(prisma);

    const companyId = req.user.companyId || req.query.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة',
      });
    }

    const slug = normalizeSlug(req.params.slug);
    const landing = await prisma.productLandingPage.findFirst({
      where: {
        companyId,
        slug,
      },
      include: {
        product: {
          select: PRODUCT_SELECT,
        },
      },
    });

    if (!landing) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الهبوط غير موجودة',
      });
    }

    const productSnapshot = parseJsonRecord(landing.productSnapshot, null);
    const previewProduct =
      formatProduct(landing.product) ||
      formatSnapshotProduct(productSnapshot, companyId);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        currency: true,
      },
    });

    return res.json({
      success: true,
      data: {
        landing: formatLandingPage(landing),
        product: previewProduct,
        company: company || {
          id: companyId,
          name: null,
          slug: null,
          logo: null,
          currency: 'EGP',
        },
      },
    });
  } catch (error) {
    console.error('[PRODUCT-LANDING] Preview fetch failed:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر تحميل معاينة صفحة الهبوط',
      error: error.message,
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const prisma = await getPrisma();
    await ensureProductLandingPagesTable(prisma);

    const companyId = req.user.companyId || req.query.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة',
      });
    }

    const search = normalizeText(req.query.search, 80);
    const status = normalizeText(req.query.status, 20).toUpperCase();
    const where = {
      companyId,
      ...(STATUS_VALUES.has(status) ? { status } : {}),
      ...(req.query.productId ? { productId: String(req.query.productId) } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const pages = await prisma.productLandingPage.findMany({
      where,
      include: {
        product: {
          select: LIST_PRODUCT_SELECT,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(Number(req.query.limit) || 50, 100),
    });

    return res.json({
      success: true,
      data: pages.map((page) => formatLandingPage(page, { includeProduct: true })),
    });
  } catch (error) {
    console.error('[PRODUCT-LANDING] List failed:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر تحميل صفحات الهبوط',
      error: error.message,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const prisma = await getPrisma();
    await ensureProductLandingPagesTable(prisma);

    const companyId = req.user.companyId || req.body.companyId;
    const productId = normalizeText(req.body.productId, 120);

    if (!companyId || !productId) {
      return res.status(400).json({
        success: false,
        message: 'الشركة والمنتج مطلوبان',
      });
    }

    const product = await getCompanyProduct(prisma, productId, companyId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود داخل هذه الشركة',
      });
    }

    const baseSlug = normalizeSlug(req.body.slug || product.slug || product.name, product.id);
    let slug = baseSlug;
    let duplicateIndex = 2;

    while (
      await prisma.productLandingPage.findFirst({
        where: { companyId, slug },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${duplicateIndex}`;
      duplicateIndex += 1;
    }

    const title = normalizeText(req.body.title, 180) || `${product.name} - Landing`;
    const status = normalizeStatus(req.body.status, 'DRAFT');
    const slices = normalizeSlices(req.body.slices);
    if (status === 'PUBLISHED') {
      await ensurePublishReady(prisma, {
        companyId,
        productId: product.id,
        slices,
      });
    }
    const generationStatus =
      slices.length > 0 ? 'READY_TO_REVIEW' : 'NEEDS_IMAGES';

    const page = await prisma.productLandingPage.create({
      data: {
        companyId,
        productId: product.id,
        title,
        slug,
        status,
        generationMode: 'IMAGE_STACK',
        generationStatus,
        [DESIGN_NOTES_FIELD]:
          normalizeText(req.body.designNotes, 4000) || null,
        slices: JSON.stringify(slices),
        formConfig: JSON.stringify({
          ...DEFAULT_FORM_CONFIG,
          ...(isRecord(req.body.formConfig) ? req.body.formConfig : {}),
          orderTitle: req.body.formConfig?.orderTitle || `اطلب ${product.name}`,
        }),
        seo: stringifyNullable(req.body.seo) || JSON.stringify({}),
        productSnapshot: JSON.stringify(buildProductSnapshot(product)),
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        createdById: req.user.id || null,
        updatedById: req.user.id || null,
      },
      include: {
        product: {
          select: PRODUCT_SELECT,
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: formatLandingPage(page),
      message: 'تم إنشاء صفحة الهبوط',
    });
  } catch (error) {
    console.error('[PRODUCT-LANDING] Create failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'تعذر إنشاء صفحة الهبوط',
      error: error.message,
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prisma = await getPrisma();
    const companyId = req.user.companyId || req.query.companyId;
    const landing = await findLandingForCompany(prisma, req.params.id, companyId, {
      includeProduct: true,
    });

    if (!landing) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الهبوط غير موجودة',
      });
    }

    return res.json({
      success: true,
      data: formatLandingPage(landing),
    });
  } catch (error) {
    console.error('[PRODUCT-LANDING] Detail failed:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر تحميل صفحة الهبوط',
      error: error.message,
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const prisma = await getPrisma();
    await ensureProductLandingPagesTable(prisma);

    const companyId = req.user.companyId || req.body.companyId;
    const existing = await findLandingForCompany(prisma, req.params.id, companyId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الهبوط غير موجودة',
      });
    }

    const nextStatus =
      req.body.status === undefined
        ? existing.status
        : normalizeStatus(req.body.status, existing.status);
    const nextSlices =
      req.body.slices === undefined ? undefined : normalizeSlices(req.body.slices);
    const publishSlices = nextSlices === undefined ? existing.slices : nextSlices;

    if (nextStatus === 'PUBLISHED') {
      await ensurePublishReady(prisma, {
        companyId,
        productId: existing.productId,
        slices: publishSlices,
      });
    }

    const data = {
      ...(req.body.title !== undefined
        ? { title: normalizeText(req.body.title, 180) || existing.title }
        : {}),
      ...(req.body.slug !== undefined
        ? { slug: normalizeSlug(req.body.slug, existing.slug) }
        : {}),
      ...(req.body.status !== undefined
        ? {
            status: nextStatus,
            publishedAt:
              nextStatus === 'PUBLISHED'
                ? existing.publishedAt || new Date()
                : nextStatus === 'DRAFT'
                  ? null
                  : existing.publishedAt,
          }
        : {}),
      ...(req.body.designNotes !== undefined
        ? {
            [DESIGN_NOTES_FIELD]:
              normalizeText(req.body.designNotes, 4000) || null,
          }
        : {}),
      ...(nextSlices !== undefined
        ? {
            slices: JSON.stringify(nextSlices),
            generationStatus:
              nextSlices.length > 0 ? 'READY_TO_REVIEW' : 'NEEDS_IMAGES',
          }
        : {}),
      ...(req.body.formConfig !== undefined
        ? { formConfig: stringifyNullable(req.body.formConfig) }
        : {}),
      ...(req.body.seo !== undefined ? { seo: stringifyNullable(req.body.seo) } : {}),
      updatedById: req.user.id || null,
    };

    const page = await prisma.productLandingPage.update({
      where: { id: existing.id },
      data,
      include: {
        product: {
          select: PRODUCT_SELECT,
        },
      },
    });

    return res.json({
      success: true,
      data: formatLandingPage(page),
      message: 'تم حفظ صفحة الهبوط',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'هذا الرابط مستخدم بالفعل داخل الشركة',
      });
    }

    console.error('[PRODUCT-LANDING] Update failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'تعذر حفظ صفحة الهبوط',
      error: error.message,
    });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const prisma = await getPrisma();
    await ensureProductLandingPagesTable(prisma);

    const companyId = req.user.companyId || req.body.companyId;
    const existing = await findLandingForCompany(prisma, req.params.id, companyId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الهبوط غير موجودة',
      });
    }

    const status = normalizeStatus(req.body.status, existing.status);
    if (status === 'PUBLISHED') {
      await ensurePublishReady(prisma, {
        companyId,
        productId: existing.productId,
        slices: existing.slices,
      });
    }

    const page = await prisma.productLandingPage.update({
      where: { id: existing.id },
      data: {
        status,
        publishedAt:
          status === 'PUBLISHED'
            ? existing.publishedAt || new Date()
            : status === 'DRAFT'
              ? null
              : existing.publishedAt,
        updatedById: req.user.id || null,
      },
      include: {
        product: {
          select: PRODUCT_SELECT,
        },
      },
    });

    return res.json({
      success: true,
      data: formatLandingPage(page),
      message: 'تم تحديث حالة الصفحة',
    });
  } catch (error) {
    console.error('[PRODUCT-LANDING] Status update failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'تعذر تحديث حالة الصفحة',
      error: error.message,
    });
  }
});

module.exports = router;
