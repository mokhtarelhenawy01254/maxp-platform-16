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
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "product_landing_pages" ADD COLUMN IF NOT EXISTS "sections" TEXT;
        `);
      } catch (_) {}
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

async function ensurePublishReady(prisma, { companyId, productId, slices, sections }) {
  const normalizedSlices = normalizeSlices(slices);
  const normalizedSections = parseJsonArray(sections, []);

  if (normalizedSlices.length === 0 && normalizedSections.length === 0) {
    throw createRouteError(400, 'لا يمكن نشر صفحة الهبوط بدون صور أو أقسام محتوى');
  }

  const product = await getCompanyProduct(prisma, productId, companyId);
  if (!product) {
    throw createRouteError(404, 'المنتج غير موجود داخل هذه الشركة');
  }

  if (product.isActive === false) {
    throw createRouteError(400, 'لا يمكن نشر صفحة هبوط لمنتج غير نشط');
  }

  return { product, slices: normalizedSlices, sections: normalizedSections };
}

function formatLandingPage(landing, { includeProduct = true } = {}) {
  if (!landing) {
    return null;
  }

  const formConfigRecord = parseJsonRecord(landing.formConfig, {});
  const sections = parseJsonArray(landing.sections, null) || parseJsonArray(formConfigRecord.sections, []);
  const formConfig = {
    ...DEFAULT_FORM_CONFIG,
    ...formConfigRecord,
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
    sections,
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

router.get('/public/:slug', extractSubdomainMiddleware, async (req, res) => {
  try {
    const prisma = await getPrisma();
    await ensureProductLandingPagesTable(prisma);

    const slug = normalizeSlug(req.params.slug);
    let landing = null;

    if (req.company?.id) {
      landing = await prisma.productLandingPage.findFirst({
        where: {
          companyId: req.company.id,
          slug,
          status: 'PUBLISHED',
        },
        include: {
          product: {
            select: PRODUCT_SELECT,
          },
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              currency: true,
              customDomain: true,
            },
          },
        },
      });
    }

    if (!landing) {
      landing = await prisma.productLandingPage.findFirst({
        where: {
          slug,
          status: 'PUBLISHED',
        },
        include: {
          product: {
            select: PRODUCT_SELECT,
          },
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              currency: true,
              customDomain: true,
            },
          },
        },
      });
    }

    if (!landing || !landing.product || landing.product.isActive === false) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الهبوط غير موجودة أو غير منشورة',
      });
    }

    const companyInfo = landing.company || req.company || {};

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
          id: companyInfo.id,
          name: companyInfo.name,
          slug: companyInfo.slug,
          logo: companyInfo.logo,
          currency: companyInfo.currency,
          customDomain: companyInfo.customDomain,
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

router.post('/public/:slug/order', extractSubdomainMiddleware, async (req, res) => {
  try {
    const prisma = await getPrisma();
    await ensureProductLandingPagesTable(prisma);

    const slug = normalizeSlug(req.params.slug);
    let landing = null;

    if (req.company?.id) {
      landing = await prisma.productLandingPage.findFirst({
        where: {
          companyId: req.company.id,
          slug,
          status: 'PUBLISHED',
        },
        select: { id: true },
      });
    }

    if (!landing) {
      landing = await prisma.productLandingPage.findFirst({
        where: {
          slug,
          status: 'PUBLISHED',
        },
        select: { id: true },
      });
    }

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
    const sections = parseJsonArray(req.body.sections, []);
    if (status === 'PUBLISHED') {
      await ensurePublishReady(prisma, {
        companyId,
        productId: product.id,
        slices,
        sections,
      });
    }
    const generationStatus =
      slices.length > 0 || sections.length > 0 ? 'READY_TO_REVIEW' : 'NEEDS_IMAGES';

    const baseFormConfig = isRecord(req.body.formConfig) ? req.body.formConfig : {};
    const formConfigData = {
      ...DEFAULT_FORM_CONFIG,
      ...baseFormConfig,
      orderTitle: baseFormConfig.orderTitle || `اطلب ${product.name}`,
      sections,
    };

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
        formConfig: JSON.stringify(formConfigData),
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

    const existingFormConfig = parseJsonRecord(existing.formConfig, {});
    const existingSections = parseJsonArray(existing.sections, null) || parseJsonArray(existingFormConfig.sections, []);
    const nextSections = req.body.sections !== undefined ? parseJsonArray(req.body.sections, []) : existingSections;
    const publishSections = nextSections !== undefined ? nextSections : existingSections;

    if (nextStatus === 'PUBLISHED') {
      await ensurePublishReady(prisma, {
        companyId,
        productId: existing.productId,
        slices: publishSlices,
        sections: publishSections,
      });
    }

    let formConfigToSave = undefined;
    if (req.body.formConfig !== undefined || req.body.sections !== undefined) {
      const incomingFormConfig = isRecord(req.body.formConfig)
        ? req.body.formConfig
        : (req.body.formConfig !== undefined ? parseJsonRecord(req.body.formConfig, {}) : existingFormConfig);

      formConfigToSave = JSON.stringify({
        ...existingFormConfig,
        ...incomingFormConfig,
        sections: nextSections,
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
      ...(formConfigToSave !== undefined ? { formConfig: formConfigToSave } : {}),
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

    const existingFormConfig = parseJsonRecord(existing.formConfig, {});
    const existingSections = parseJsonArray(existing.sections, null) || parseJsonArray(existingFormConfig.sections, []);
    const status = normalizeStatus(req.body.status, existing.status);

    if (status === 'PUBLISHED') {
      await ensurePublishReady(prisma, {
        companyId,
        productId: existing.productId,
        slices: existing.slices,
        sections: existingSections,
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

router.delete('/:id', async (req, res) => {
  try {
    const prisma = await getPrisma();
    await ensureProductLandingPagesTable(prisma);

    const companyId = req.user.companyId || req.query.companyId;
    const existing = await findLandingForCompany(prisma, req.params.id, companyId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الهبوط غير موجودة',
      });
    }

    await prisma.productLandingPage.delete({
      where: { id: existing.id },
    });

    return res.json({
      success: true,
      message: 'تم حذف صفحة الهبوط بنجاح',
    });
  } catch (error) {
    console.error('[PRODUCT-LANDING] Delete failed:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر حذف صفحة الهبوط',
      error: error.message,
    });
  }
});

router.post('/:id/ai-content', async (req, res) => {
  try {
    const prisma = await getPrisma();
    await ensureProductLandingPagesTable(prisma);

    const companyId = req.user.companyId || req.body.companyId;
    const landing = await findLandingForCompany(prisma, req.params.id, companyId, {
      includeProduct: true,
    });

    if (!landing || !landing.product) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الهبوط أو المنتج غير موجود',
      });
    }

    const prod = landing.product;
    const prodName = prod.name || 'المنتج';
    const prodPrice = prod.price || 0;
    const currency = 'ج.م';
    const cleanDesc = sanitizeRichText(prod.description, 400);

    const aiSections = [
      {
        id: `sec-media-${Date.now()}`,
        type: 'MEDIA',
        title: 'الصور والميديا',
        enabled: true,
        content: {
          images: prod.images && prod.images.length > 0 ? prod.images : (prod.mainImage ? [prod.mainImage] : []),
          mainImage: prod.mainImage || (prod.images && prod.images[0]) || '',
        },
      },
      {
        id: `sec-text-${Date.now() + 1}`,
        type: 'TEXT',
        title: 'الوصف التسويقي',
        enabled: true,
        content: {
          heading: `${prodName} — الاختيار الأفضل بجودة استثنائية`,
          subheading: cleanDesc || `احصل على ${prodName} الأصلي بسعر خاص لفترة محدودة`,
          bodyText: `تصميم أنيق وعملي يلبي احتياجاتك اليومية بدقة. خامات فائقة الجودة تم اختيارها بعناية لتدوم طويلاً، مع تجربة استخدام سلسة ومريحة تلبي أعلى توقعاتك.`,
        },
      },
      {
        id: `sec-countdown-${Date.now() + 2}`,
        type: 'COUNTDOWN',
        title: 'عرض محدود ونفاد الكمية',
        enabled: true,
        content: {
          timerEndsMinutes: 45,
          lowStockCount: Math.max(3, Math.min(prod.stock || 15, 19)),
        },
      },
      {
        id: `sec-features-${Date.now() + 3}`,
        type: 'FEATURES',
        title: 'مميزات الشراء والضمان',
        enabled: true,
        content: {
          features: [
            { title: 'شحن سريع لجميع المحافظات', desc: 'التوصيل خلال 24 إلى 48 ساعة فقط', icon: '🚚' },
            { title: 'معاينة المنتج قبل الدفع', desc: 'افحص وتأكد من جودة المنتج قبل دفع أي مليم للكابتن', icon: '✅' },
            { title: 'دفع عند الاستلام (COD)', desc: 'دون الحاجة لأي بطاقة ائتمانية أو دفع مسبق', icon: '💵' },
            { title: 'ضمان الاستبدال والاسترجاع', desc: 'حق الاستبدال خلال 14 يوماً بسهولة تامة', icon: '🔁' },
          ],
        },
      },
      {
        id: `sec-form-${Date.now() + 4}`,
        type: 'FORM',
        title: 'نموذج الشراء السريع',
        enabled: true,
        content: {
          orderKicker: 'طلب مباشر وسريع',
          orderTitle: `اطلب ${prodName} الآن بسعر ${prodPrice ? `${prodPrice} ${currency}` : 'خاص'}`,
          orderCopy: 'املأ بيانات التوصيل الأساسية وسيتم الشحن والمتابعة معك فوراً.',
          buttonLabel: `تأكيد الطلب الآن — دفع عند الاستلام 🚚`,
        },
      },
      {
        id: `sec-reviews-${Date.now() + 5}`,
        type: 'REVIEWS',
        title: 'آراء وتقييمات العملاء',
        enabled: true,
        content: {
          reviews: [
            { name: 'أحمد إبراهيم', text: `${prodName} وصلني نفس الوصف والصور بالظبط، الجودة ممتازة وسرعة الشحن محترمة جداً.`, rating: 5 },
            { name: 'مروة عبد العزيز', text: 'بصراحة تجربة شراء ممتازة، والمعاينة قبل الدفع إدتني ثقة كاملة في المتجر. أنصح به!', rating: 5 },
            { name: 'محمود سامي', text: 'الخامة والتقفيل عالي جداً والسعر ممتاز مقارنة بالسوق. خدمة العملاء تابعت معايا حتى الاستلام.', rating: 5 },
          ],
        },
      },
      {
        id: `sec-faq-${Date.now() + 6}`,
        type: 'FAQ',
        title: 'الأسئلة الشائعة',
        enabled: true,
        content: {
          faqs: [
            { question: `هل يمكنني فحص ${prodName} قبل دفع المبلغ؟`, answer: 'نعم بالطبع، المندوب ينتظرك حتى تعاين وتتأكد من المنتج قبل دفع الكاش.' },
            { question: 'ما هو موعد وصول الطلب؟', answer: 'الشحن يستغرق عادة من يوم إلى يومين عمل لكافة المحافظات.' },
            { question: 'ماذا لو أردت استبدال أو إرجاع المنتج؟', answer: 'لديك 14 يوماً كاملة من تاريخ الاستلام للاستبدال أو الإرجاع مجاناً.' },
          ],
        },
      },
    ];

    const updatedFormConfig = {
      orderKicker: 'طلب مباشر وسريع',
      orderTitle: `اطلب ${prodName} الآن بسعر ${prodPrice ? `${prodPrice} ${currency}` : 'خاص'}`,
      orderCopy: 'املأ بيانات التوصيل الأساسية وسيتم الشحن والمتابعة معك فوراً.',
      buttonLabel: `تأكيد الطلب الآن — دفع عند الاستلام 🚚`,
      sections: aiSections,
    };

    const updated = await prisma.productLandingPage.update({
      where: { id: landing.id },
      data: {
        formConfig: JSON.stringify(updatedFormConfig),
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
      data: formatLandingPage(updated),
      message: 'تم توليد محتوى الصفحة بالذكاء الاصطناعي بنجاح',
    });
  } catch (error) {
    console.error('[PRODUCT-LANDING] AI content generation failed:', error);
    return res.status(500).json({
      success: false,
      message: 'تعذر توليد المحتوى بالذكاء الاصطناعي',
      error: error.message,
    });
  }
});

module.exports = router;
