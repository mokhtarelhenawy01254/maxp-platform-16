// Use shared database service instead of creating new PrismaClient
const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry, safeQuery } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Create alias for executeWithRetry to match usage
const withRetry = executeWithRetry;

const { processImage, isProcessableImage } = require('../utils/imageProcessor');
const path = require('path');
const internalSyncService = require('../services/internalSyncService');
const merchantService = require('../services/merchantService');
const fulfillmentService = require('../services/fulfillmentService');
const { safeJsonParse } = require('../utils/jsonUtils');
const { parseProductMetadata } = require('../utils/productMetadataUtils');
const {
  cloneImageCollection,
  cloneMetadataMedia,
  cloneStoredAssetUrl,
  mergeUniqueImages,
  normalizeImageCollection,
  normalizeStoredAssetUrl,
  resolveProductMediaState,
  sanitizeImageCollection,
  sanitizeMetadataMedia,
  sanitizeStoredAssetUrl,
  serializeJsonField,
} = require('../utils/productMediaUtils');
const { formatProductResponse } = require('../utils/productNormalizationUtils');
const { validateStock } = require('../utils/stockValidation');
const { MAX_PRODUCT_STOCK } = require('../utils/stockValidation');
const { INVALID_SLUG_ERROR_MESSAGE, isInvalidProductSlug } = require('../utils/productSlugValidation');
const ragKnowledgeMaintenanceService = require('../services/rag/RagKnowledgeMaintenanceService');
const aiServiceAdminClient = require('../services/aiServiceAdminClient');
const productOfferService = require('../services/whatsapp/productOfferService');
const {
  PRODUCT_WORKFLOW_STATUSES,
  resolveProductWorkflow,
  buildWorkflowTransition,
  withWorkflowMetadata,
  createWorkflowUpdatePayload,
  decorateProductWithWorkflow,
} = require('../utils/productWorkflowUtils');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');
const { filterProductsVisibleToAffiliate } = require('../utils/affiliateProductVisibility');
const {
  assertMerchantProductAccess,
  ensureMerchantWarehouse,
  getMerchantProductWhere,
  isMerchantUser,
  requireMerchantAccountForUser,
  resolveCompanyWarehouseForMerchant,
  resolveMerchantAccount,
  syncMerchantProductStock,
} = require('../utils/merchantAccountScope');
const { syncProductToInventory } = require('../services/inventorySyncService');
const redisCacheService = require('../services/redisCacheService');

// 🔤 Arabic to Franco mapping for slug generation
const arabicToFranco = {
  'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a', 'ء': 'a',
  'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'g', 'ح': '7', 'خ': 'kh',
  'د': 'd', 'ذ': 'dh',
  'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh',
  'ص': 's', 'ض': 'd',
  'ط': 't', 'ظ': 'z',
  'ع': '3', 'غ': 'gh',
  'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l',
  'م': 'm', 'ن': 'n',
  'ه': 'h', 'ة': 'a', 'و': 'o', 'ؤ': 'o',
  'ي': 'y', 'ى': 'a', 'ئ': 'e'
};

const transliterateArabicToFranco = (text) => {
  if (!text) return '';
  return text.split('').map(char => arabicToFranco[char] || char).join('');
};

const parseMultipartBoolean = (value, defaultValue = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return Boolean(value);
};

const parseOptionalNullableNumber = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseOptionalInteger = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const normalizeOptionalString = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
};

const SKU_CONFLICT_MESSAGE =
  'رمز SKU مستخدم بالفعل داخل هذه الشركة. اختر رمزًا مختلفًا أو اترك الحقل فارغًا.';

const findConflictingProductSku = async ({
  companyId,
  sku,
  excludeProductId = null,
}) => {
  if (!companyId || !sku) {
    return null;
  }

  return getSharedPrismaClient().product.findFirst({
    where: {
      companyId,
      sku,
      deletedAt: null,
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
    select: {
      id: true,
      sku: true,
    },
  });
};

const buildCategorySlug = async ({ name, slug, companyId, excludeCategoryId = null }) => {
  const rawSlug = typeof slug === 'string' ? slug.trim() : '';
  const rawName = typeof name === 'string' ? name.trim() : '';
  const baseSource = rawSlug || rawName;

  let normalizedSlug = baseSource
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-_]/gu, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalizedSlug) {
    normalizedSlug = `category-${Date.now()}`;
  }

  let uniqueSlug = normalizedSlug;
  let suffix = 1;

  while (true) {
    const existingCategory = await getSharedPrismaClient().category.findFirst({
      where: {
        companyId,
        slug: uniqueSlug,
        ...(excludeCategoryId ? { id: { not: excludeCategoryId } } : {})
      }
    });

    if (!existingCategory) {
      return uniqueSlug;
    }

    uniqueSlug = `${normalizedSlug}-${suffix}`;
    suffix += 1;
  }
};

const PRODUCT_LIST_SELECT = {
  id: true,
  name: true,
  description: true,
  sku: true,
  price: true,
  comparePrice: true,
  cost: true,
  images: true,
  mainImage: true,
  stock: true,
  trackInventory: true,
  weight: true,
  dimensions: true,
  categoryId: true,
  isActive: true,
  isFeatured: true,
  isHidden: true,
  tags: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  metadata: true,
  barcode: true,
  easyOrdersId: true,
  easyOrdersUrl: true,
  source: true,
  externalId: true,
  wooCommerceId: true,
  wooCommerceUrl: true,
  hasPromotedAd: true,
  enableCheckoutForm: true,
  showAddToCartButton: true,
  saleStartDate: true,
  saleEndDate: true,
  sizeGuide: true,
  isPreOrder: true,
  preOrderDate: true,
  preOrderMessage: true,
  slug: true,
  isDropshipped: true,
  merchantProductId: true,
  basePrice: true,
  allowAffiliateMarkup: true,
  affiliateVisibility: true,
  affiliateVisibleAffiliateIds: true,
  affiliateCommission: true,
  commissionType: true,
  showFakeStock: true,
  merchantProducts: {
    select: {
      id: true,
      productId: true,
      merchantId: true,
      merchantSku: true,
      merchantPrice: true,
      stock: true,
      isActive: true,
      syncEnabled: true,
      merchant: {
        select: {
          id: true,
          name: true,
          isActive: true,
          fulfillmentMode: true,
          defaultWarehouseId: true
        }
      }
    }
  },
  category: true,
  productVariants: {
    where: { isActive: true },
    orderBy: [
      { type: 'asc' },
      { sortOrder: 'asc' }
    ]
  }
};

const PRODUCT_RETRIEVAL_INCLUDE = {
  category: true,
  productVariants: {
    where: { isActive: true },
    orderBy: [
      { type: 'asc' },
      { sortOrder: 'asc' }
    ]
  }
};

const withActiveProductFilter = (where = {}) => ({
  ...where,
  deletedAt: null,
});

const withDeletedProductFilter = (where = {}) => ({
  ...where,
  deletedAt: { not: null },
});

const isFulfillableMerchantProduct = (merchantProduct) => (
  merchantProduct?.isActive &&
  merchantProduct?.syncEnabled &&
  merchantProduct?.merchant &&
  merchantProduct.merchant.isActive !== false
);

const buildManualOrderAvailabilityMap = async (products, companyId) => {
  if (!Array.isArray(products) || products.length === 0 || !companyId) {
    return {};
  }

  const companyWarehouseProductIds = new Set();

  products.forEach((product) => {
    (product.merchantProducts || [])
      .filter(isFulfillableMerchantProduct)
      .forEach((merchantProduct) => {
        const fulfillmentMode = fulfillmentService.normalizeFulfillmentMode(
          merchantProduct.merchant.fulfillmentMode,
        );

        if (fulfillmentMode === 'COMPANY_WAREHOUSE') {
          companyWarehouseProductIds.add(product.id);
        }
      });
  });

  const companyWarehouseStockByProductId = {};

  if (companyWarehouseProductIds.size > 0) {
    const inventoryRows = await safeQuery(() =>
      getSharedPrismaClient().inventory.groupBy({
        by: ['productId'],
        where: {
          productId: { in: Array.from(companyWarehouseProductIds) },
          available: { gt: 0 },
          warehouse: {
            companyId,
            isActive: true,
          },
        },
        _max: {
          available: true,
        },
      })
    );

    (inventoryRows || []).forEach((row) => {
      companyWarehouseStockByProductId[row.productId] = Number(row._max?.available || 0);
    });
  }

  return products.reduce((acc, product) => {
    const activeMerchantProducts = (product.merchantProducts || []).filter(
      isFulfillableMerchantProduct,
    );

    const merchantStock = activeMerchantProducts.reduce((maxStock, merchantProduct) => {
      const fulfillmentMode = fulfillmentService.normalizeFulfillmentMode(
        merchantProduct.merchant.fulfillmentMode,
      );

      if (fulfillmentMode === 'COMPANY_WAREHOUSE') {
        return maxStock;
      }

      return Math.max(maxStock, Number(merchantProduct.stock || 0));
    }, 0);

    const companyWarehouseStock = activeMerchantProducts.some((merchantProduct) => (
      fulfillmentService.normalizeFulfillmentMode(
        merchantProduct.merchant.fulfillmentMode,
      ) === 'COMPANY_WAREHOUSE'
    ))
      ? Number(companyWarehouseStockByProductId[product.id] || 0)
      : 0;

    const productStock = Number(product.stock || 0);
    const fulfillableStock = Math.max(productStock, merchantStock, companyWarehouseStock);

    acc[product.id] = {
      stock: fulfillableStock,
      availableStock: fulfillableStock,
      merchantStock,
      companyWarehouseStock,
    };

    return acc;
  }, {});
};

const applyManualOrderAvailability = (product, availability) => {
  if (!availability) {
    return product;
  }

  const stock = Number(availability.stock || 0);
  const shouldBackfillVariants =
    stock > 0 &&
    Array.isArray(product.variants) &&
    product.variants.length > 0 &&
    product.variants.every((variant) => Number(variant.stock || 0) <= 0);

  const variants = shouldBackfillVariants
    ? product.variants.map((variant) => ({
        ...variant,
        stock,
        availableStock: stock,
        fulfillableStock: stock,
      }))
    : product.variants;

  return {
    ...product,
    stock,
    availableStock: availability.availableStock,
    fulfillableStock: stock,
    fulfillmentAvailability: availability,
    ...(variants ? { variants, productVariants: variants } : {}),
  };
};

const refreshProductRetrievalArtifacts = async (
  productId,
  companyId
) => {
  if (!productId || !companyId) return null;

  try {
    const hydratedProduct = await getSharedPrismaClient().product.findUnique({
      where: { id: productId },
      include: PRODUCT_RETRIEVAL_INCLUDE
    });

    if (!hydratedProduct) {
      return null;
    }

    return hydratedProduct;
  } catch (error) {
    console.error(`❌ Failed to refresh retrieval artifacts for product ${productId}:`, error.message);
    return null;
  }
};

const refreshProductVectorKnowledge = (product, companyId) => {
  try {
    ragKnowledgeMaintenanceService.backfillProductEmbeddings(companyId, {
      productId: product.id,
      force: true,
    }).catch(() => {});

    aiServiceAdminClient.triggerProductEmbeddingSync(companyId).catch(() => {});

    aiServiceAdminClient.embedKnowledgeItem({
      sourceId: product.id,
      sourceType: 'product',
      companyId,
      title: product.name,
      content: product.description || '',
      category: product.category?.name || '',
      tags: product.tags || '',
    }).catch(() => {});
  } catch (_) {
    // fire and forget
  }
};

const getAllProducts = async (req, res) => {
  try {
    console.log('📦 [PRODUCT-LOG] getAllProducts called');
    console.log('📦 [PRODUCT-LOG] Query params:', req.query);
    console.log('📦 [PRODUCT-LOG] User:', req.user ? { id: req.user.id, email: req.user.email, companyId: req.user.companyId, role: req.user.role } : 'No user');

    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Extract sorting parameters
    const sortBy = req.query.sortBy || 'createdAt';
    let sortOrder = req.query.sortOrder || 'desc';

    if (typeof sortOrder === 'string') {
      sortOrder = sortOrder.split(':')[0].toLowerCase();
    }
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      sortOrder = 'desc';
    }

    // Build orderBy object
    const orderBy = {};
    const validSortFields = ['name', 'price', 'stock', 'createdAt', 'updatedAt'];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc'; // default
    }

    // Build filter object (Search)
    const where = withActiveProductFilter({ companyId });
    if (req.query.search) {
      const searchTerm = req.query.search;
      where.OR = [
        { name: { contains: searchTerm } },
        { sku: { contains: searchTerm } },
      ];
    }

    const isAffiliateUser = req.user.role === 'AFFILIATE';
    const isMerchantRequest = isMerchantUser(req.user);
    const isMarketplaceRequest = req.query.marketplace === 'true';
    const isManualOrderRequest = req.query.manualOrder === 'true';
    let currentAffiliate = null;
    let currentMerchant = null;

    if (isAffiliateUser) {
      currentAffiliate = await getSharedPrismaClient().affiliate.findUnique({
        where: { userId: req.user.id }
      });

      if (currentAffiliate) {
        if (isMarketplaceRequest) {
          where.allowAffiliateMarkup = true;
        }

        if (!isMarketplaceRequest && !isManualOrderRequest) {
          where.affiliate_products = {
            some: {
              affiliateId: currentAffiliate.id,
              isActive: true
            }
          };
        }
      } else {
        // If not found as affiliate, show nothing
        where.id = 'none';
      }
    }

    if (isMerchantRequest) {
      currentMerchant = await resolveMerchantAccount(req.user);

      if (currentMerchant) {
        Object.assign(where, getMerchantProductWhere(currentMerchant, where));
      } else {
        where.id = 'none';
      }
    }

    let total = 0;
    let products = [];
    const shouldApplyAffiliateVisibility = isAffiliateUser && currentAffiliate;

    if (shouldApplyAffiliateVisibility) {
      const allMatchedProducts = await safeQuery(() =>
        getSharedPrismaClient().product.findMany({
          where: where,
          select: PRODUCT_LIST_SELECT,
          orderBy: orderBy
        })
      );

      const visibleProducts = filterProductsVisibleToAffiliate(
        allMatchedProducts,
        currentAffiliate.id,
      );

      total = visibleProducts.length;
      products = visibleProducts.slice(skip, skip + limit);
    } else {
      // Get total count for pagination
      total = await safeQuery(() =>
        getSharedPrismaClient().product.count({
          where: where
        })
      );

      //console.log('📦 Fetching products for company:', companyId);

      products = await safeQuery(() =>
        getSharedPrismaClient().product.findMany({
          where: where, // فلترة بـ companyId + search + affiliate check
          select: PRODUCT_LIST_SELECT,
          orderBy: orderBy,
          skip: skip,
          take: limit
        })
      );
    }

    // Get storefront-published count (isActive=true + isHidden=false)
    const publishedCount = await safeQuery(() =>
      getSharedPrismaClient().product.count({
        where: { companyId, deletedAt: null, isActive: true, isHidden: false }
      })
    );

    // Get platform margin settings for calculations
    const affiliateSettings = await safeQuery(() =>
      getSharedPrismaClient().affiliateSetting.findUnique({
        where: { companyId }
      })
    );

    // 🎯 If viewing manual order, try to fetch base markup for affiliate (regardless of role)
    let affiliateProductMap = {};
    let backInStockCounts = {};
    if (req.query.manualOrder === 'true') {
      const affiliate =
        currentAffiliate ||
        await safeQuery(() =>
          getSharedPrismaClient().affiliate.findUnique({
            where: { userId: req.user.id }
          })
        );

      if (affiliate && products.length > 0) {
        const affiliateProducts = await safeQuery(() =>
          getSharedPrismaClient().affiliateProduct.findMany({
            where: {
              affiliateId: affiliate.id,
              productId: { in: products.map(p => p.id) }
            }
          })
        );

        // Map productId -> baseMarkup
        affiliateProductMap = affiliateProducts.reduce((acc, ap) => {
          acc[ap.productId] = Number(ap.markup);
          return acc;
        }, {});
      }

      // ✅ Fetch Back-in-Stock request counts
      if (products.length > 0) {
        const counts = await safeQuery(() =>
          getSharedPrismaClient().backInStockNotification.groupBy({
            by: ['productId'],
            where: {
              productId: { in: products.map(p => p.id) },
              isNotified: false
            },
            _count: {
              id: true
            }
          })
        );

        backInStockCounts = (counts || []).reduce((acc, c) => {
          acc[c.productId] = c._count.id;
          return acc;
        }, {});
      }
    }

    const manualOrderAvailabilityMap =
      isManualOrderRequest && products.length > 0 && !currentMerchant
        ? await buildManualOrderAvailabilityMap(products, companyId)
        : {};

    const merchantInventorySnapshotByProductId = new Map();
    if (currentMerchant && products.length > 0) {
      const merchantProductLinks = products.flatMap((product) =>
        (product.merchantProducts || [])
          .filter((merchantProduct) => merchantProduct.merchantId === currentMerchant.id)
          .map((merchantProduct) => ({
            ...merchantProduct,
            productId: merchantProduct.productId || product.id,
          }))
      );

      const decoratedMerchantProducts =
        await merchantService.decorateMerchantProductsWithInventorySnapshot(
          currentMerchant,
          merchantProductLinks,
        );

      decoratedMerchantProducts.forEach((merchantProduct) => {
        if (merchantProduct.productId) {
          merchantInventorySnapshotByProductId.set(
            merchantProduct.productId,
            merchantProduct.inventorySnapshot || null,
          );
        }
      });
    }

    res.json({
      success: true,
      data: products.map(p => {
        const normalized = formatProductResponse(p);
        const merchantProductLink = currentMerchant
          ? (p.merchantProducts || []).find(
              (merchantProduct) => merchantProduct.merchantId === currentMerchant.id
            ) || null
          : null;
        const parsedMetadata = safeJsonParse(p.metadata, {});
        const shippingClass = parsedMetadata?.shippingClass || 'standard';
        const excludeFromFreeShipping = parsedMetadata?.excludeFromFreeShipping || false;
        const workflow = resolveProductWorkflow(p);
        const manualOrderAvailability = manualOrderAvailabilityMap[p.id] || null;
        const productForResponse =
          manualOrderAvailability && !merchantProductLink
            ? applyManualOrderAvailability(normalized, manualOrderAvailability)
            : normalized;
        const inventorySnapshot = merchantProductLink
          ? merchantInventorySnapshotByProductId.get(p.id) || null
          : null;
        const merchantDisplayStock = inventorySnapshot
          ? Number(
              inventorySnapshot.availableForSale ??
              merchantProductLink?.stock ??
              normalized.stock ??
              0
            )
          : Number(merchantProductLink?.stock ?? normalized.stock ?? 0);

        return {
          ...productForResponse,
          ...(merchantProductLink
            ? {
                price: Number(merchantProductLink.merchantPrice ?? normalized.price ?? 0),
                stock: merchantDisplayStock,
                availableStock: merchantDisplayStock,
                fulfillableStock: merchantDisplayStock,
                sku: merchantProductLink.merchantSku || normalized.sku,
                inventorySnapshot,
              }
            : {}),
          platformMarginType: affiliateSettings?.platformMarginType || 'FIXED',
          platformMarginValue: affiliateSettings?.platformMarginValue || 0,
          baseMarkup: affiliateProductMap[p.id] || 0, // 🎯 Base commission for affiliate
          backInStockRequests: backInStockCounts[p.id] || 0, // ✅ Back-in-stock requests count
          shippingClass,
          excludeFromFreeShipping,
          workflow,
          merchantContext: currentMerchant
            ? {
                merchantId: currentMerchant.id,
                fulfillmentMode: currentMerchant.fulfillmentMode,
                defaultWarehouseId: currentMerchant.defaultWarehouseId,
                productLink: merchantProductLink,
                stockLocation: inventorySnapshot?.stockLocation,
                stockLocationLabel: inventorySnapshot?.stockLocationLabel,
                canEditStock: inventorySnapshot
                  ? inventorySnapshot.canEditStock
                  : !isCompanyWarehouseMerchant(currentMerchant),
                inventorySnapshot,
              }
            : undefined,
        };
      }),
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      },
      publishedCount,
      companyId: companyId,
      message: `تم جلب ${products.length} منتج للشركة`
    });
  } catch (error) {
    console.error('❌ [PRODUCT-ERROR] Error fetching products:', error);
    console.error('❌ [PRODUCT-ERROR] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المنتجات',
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const getCategory = async (req, res) => {
  try {
    //console.log('🔍 [server] GET /api/v1/products/categories');
    //console.log('🔍 [server] Request user:', req.user);
    //console.log('🔍 [server] Request headers:', req.headers);

    // 🔐 التحقق من المصادقة والشركة
    if (!req.user) {
      //console.log('❌ [server] No user found in request');
      return res.status(401).json({
        success: false,
        message: 'المصادقة مطلوبة للوصول لهذا المورد',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const companyId = req.user?.companyId;
    if (!companyId) {
      //console.log('❌ [server] No companyId found for user:', req.user);
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    //console.log('🏢 [server] Loading categories for company:', companyId);

    const categories = await withRetry(() =>
      getSharedPrismaClient().category.findMany({
        where: { companyId }, // 🔐 فلترة بـ companyId من المستخدم المصادق عليه
        include: {
          _count: {
            select: { products: true }
          }
        },
        orderBy: { name: 'asc' }
      })
    );

    //console.log(`✅ [server] Found ${categories.length} categories for company ${companyId}`);
    res.json({
      success: true,
      data: categories,
      companyId: companyId
    });
  } catch (error) {
    console.error('❌ [server] Error getting categories:', error);
    console.error('❌ [server] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const assertCategoryParent = async ({ companyId, parentId, categoryId = null }) => {
  if (parentId === undefined || parentId === null) {
    return { ok: true, value: null };
  }
  const raw = typeof parentId === 'string' ? parentId.trim() : String(parentId);
  if (!raw || raw === 'null' || raw === 'undefined') {
    return { ok: true, value: null };
  }
  const prisma = getSharedPrismaClient();

  if (categoryId && raw === categoryId) {
    return { ok: false, error: 'لا يمكن أن تكون الفئة تابعة لنفسها' };
  }

  const parent = await prisma.category.findFirst({ where: { id: raw, companyId } });
  if (!parent) {
    return { ok: false, error: 'الفئة الأب غير موجودة في شركتك' };
  }

  // منع الدوران: ممنوع اختيار فئة فرعية (أو حفيد) كأب
  if (categoryId) {
    let cursor = parent;
    let guard = 0;
    while (cursor && cursor.parentId && guard < 100) {
      if (cursor.parentId === categoryId) {
        return { ok: false, error: 'لا يمكن نقل الفئة داخل إحدى فئاتها الفرعية' };
      }
      cursor = await prisma.category.findFirst({ where: { id: cursor.parentId, companyId } });
      guard += 1;
    }
    if (cursor && cursor.parentId === categoryId) {
      return { ok: false, error: 'لا يمكن نقل الفئة داخل إحدى فئاتها الفرعية' };
    }
  }

  return { ok: true, value: raw };
};

const createNewCategory = async (req, res) => {
  try {
    //console.log('🔍 [server] POST /api/v1/products/categories');
    //console.log('📤 [server] Request body:', req.body);

    // 🔐 التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    let {
      name,
      slug,
      description,
      image,
      parentId,
      isActive,
      sortOrder,
      displayType,
      metaTitle,
      metaDescription
    } = req.body;

    if (req.file) {
      image = `/uploads/products/${req.file.filename}`;
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Check if category already exists in the same company
    const existingCategory = await getSharedPrismaClient().category.findFirst({
      where: {
        name: name.trim(),
        companyId // 🔐 فحص في نفس الشركة فقط
      }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists in your company'
      });
    }

    const categorySlug = await buildCategorySlug({
      name,
      slug,
      companyId
    });

    // تحقق من الفئة الأب (لازم تكون في نفس الشركة)
    const parentCheck = await assertCategoryParent({ companyId, parentId: parentId || null });
    if (!parentCheck.ok) {
        return res.status(400).json({ success: false, error: parentCheck.error });
    }

    //console.log('📦 Creating category for company:', companyId);

    // Create new category
    const newCategory = await getSharedPrismaClient().category.create({
      data: {
        name: name.trim(),
        slug: categorySlug,
        description: description?.trim() || null,
        image: image || null,
        parentId: parentCheck.value,
        isActive: parseMultipartBoolean(isActive, true),
        sortOrder: sortOrder || 0,
        displayType: displayType || 'default',
        metaTitle: metaTitle?.trim() || null,
        metaDescription: metaDescription?.trim() || null,
        companyId // 🔐 استخدام companyId من المستخدم المصادق عليه
      }
    });

    //console.log(`✅ [server] Created category: ${newCategory.name} for company ${companyId}`);
    res.status(201).json({
      success: true,
      data: newCategory,
      companyId: companyId
    });
  } catch (error) {
    console.error('❌ [server] Error creating category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    // 🔐 التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();

    // Check if category exists and belongs to the company
    const existingCategory = await prisma.category.findFirst({
      where: { id, companyId }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'الفئة غير موجودة'
      });
    }

    // ⚠️ تحديث جزئي: الحقول اللي مش واصلة بتفضل زي ما هي
    // (النسخة القديمة كانت بتكتب كل الحقول، فحفظ من المودال كان بيمسح
    //  الصورة والـsortOrder والـSEO والفئة الأب)
    const data = {};

    if (body.name !== undefined) {
      const trimmedName = String(body.name).trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, error: 'اسم الفئة مطلوب' });
      }
      const duplicateCategory = await prisma.category.findFirst({
        where: { name: trimmedName, companyId, id: { not: id } }
      });
      if (duplicateCategory) {
        return res.status(400).json({ success: false, error: 'توجد فئة بنفس الاسم في شركتك' });
      }
      data.name = trimmedName;
    }

    if (body.name !== undefined || body.slug !== undefined) {
      data.slug = await buildCategorySlug({
        name: body.name !== undefined ? String(body.name) : existingCategory.name,
        slug: body.slug,
        companyId,
        excludeCategoryId: id
      });
    }

    if (body.description !== undefined) {
      data.description = String(body.description).trim() || null;
    }

    // الصورة: رفع جديد > إزالة صريحة > تفضل زي ما هي
    if (req.file) {
      data.image = `/uploads/products/${req.file.filename}`;
    } else if (body.removeImage === true || body.removeImage === 'true') {
      data.image = null;
    }

    if (body.parentId !== undefined) {
      const parentCheck = await assertCategoryParent({
        companyId,
        parentId: body.parentId,
        categoryId: id
      });
      if (!parentCheck.ok) {
        return res.status(400).json({ success: false, error: parentCheck.error });
      }
      data.parentId = parentCheck.value;
    }

    if (body.isActive !== undefined) {
      data.isActive = parseMultipartBoolean(body.isActive, existingCategory.isActive);
    }

    if (body.sortOrder !== undefined) {
      const parsedSort = parseInt(body.sortOrder, 10);
      data.sortOrder = Number.isFinite(parsedSort) ? parsedSort : 0;
    }

    if (body.displayType !== undefined) {
      data.displayType = String(body.displayType).trim() || 'default';
    }

    if (body.metaTitle !== undefined) {
      data.metaTitle = String(body.metaTitle).trim() || null;
    }

    if (body.metaDescription !== undefined) {
      data.metaDescription = String(body.metaDescription).trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return res.json({ success: true, data: existingCategory });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data
    });

    res.json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    console.error('❌ [server] Error updating category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    //console.log(`🔍 [server] DELETE /api/v1/products/categories/${req.params.id}`);

    // 🔐 التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const { id } = req.params;

    // Check if category exists and belongs to the company
    const existingCategory = await getSharedPrismaClient().category.findFirst({
      where: {
        id,
        companyId // 🔐 التأكد أن الفئة تنتمي لنفس الشركة
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found or you do not have permission to delete it'
      });
    }

    // Check if category has products
    const productsCount = await getSharedPrismaClient().product.count({
      where: { categoryId: id }
    });

    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${productsCount} products assigned to it.`
      });
    }

    // Check if category has subcategories
    const subcategoriesCount = await getSharedPrismaClient().category.count({
      where: { parentId: id }
    });

    if (subcategoriesCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${subcategoriesCount} subcategories.`
      });
    }

    // Delete category
    await getSharedPrismaClient().category.delete({
      where: { id }
    });

    //console.log(`✅ [server] Deleted category: ${existingCategory.name}`);
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('❌ [server] Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const getSingleProduct = async (req, res) => {
  try {
    //console.log(`🔍 [server] GET /api/v1/products/${req.params.id}`);

    const { id } = req.params;
    const companyId = req.user?.companyId;
    const orConditions = [{ slug: id }];
    if (id.length > 20) {
      orConditions.unshift({ id });
    }
    const where = withActiveProductFilter({
      OR: orConditions,
    });

    if (req.user?.role !== 'SUPER_ADMIN' && companyId) {
      where.companyId = companyId;
    }

    let currentMerchant = null;
    if (isMerchantUser(req.user)) {
      currentMerchant = await requireMerchantAccountForUser(req.user);
      Object.assign(where, getMerchantProductWhere(currentMerchant, where));
    }

    const product = await getSharedPrismaClient().product.findFirst({
      where,
      include: {
        productVariants: {
          orderBy: { sortOrder: 'asc' }
        },
        category: true,
        merchantProducts: currentMerchant
          ? {
              where: { merchantId: currentMerchant.id },
              include: {
                merchant: {
                  select: {
                    id: true,
                    name: true,
                    fulfillmentMode: true,
                    defaultWarehouseId: true
                  }
                }
              }
            }
          : true
      }
    });

    //console.log(`📊 [server] Product query result:`, {
    //   found: !!product,
    //   name: product?.name,
    //   variantsCount: product?.product_variants?.length || 0,
    //   categoryName: product?.category?.name
    // });

    if (!product) {
      // Check if this product exists in another company accessible to this user
      if (req.user?.id) {
        try {
          const userCompanies = await getSharedPrismaClient().userCompany.findMany({
            where: { userId: req.user.id, isActive: true },
            select: { companyId: true, company: { select: { id: true, name: true, slug: true } } }
          });
          const accessibleCompanyIds = userCompanies
            .map(uc => uc.companyId)
            .filter(cid => cid && cid !== companyId);

          if (accessibleCompanyIds.length > 0) {
            const productInOtherCompany = await getSharedPrismaClient().product.findFirst({
              where: withActiveProductFilter({
                OR: orConditions,
                companyId: { in: accessibleCompanyIds }
              }),
              select: {
                id: true,
                name: true,
                companyId: true,
                company: { select: { id: true, name: true, slug: true } }
              }
            });

            if (productInOtherCompany) {
              return res.status(403).json({
                success: false,
                code: 'DIFFERENT_COMPANY_ACCESSIBLE',
                message: `هذا المنتج ("${productInOtherCompany.name}") يتبع لشركة "${productInOtherCompany.company?.name}". يمكنك التبديل إلى شركة "${productInOtherCompany.company?.name}" للوصول إليه.`,
                targetCompanyId: productInOtherCompany.companyId,
                targetCompanyName: productInOtherCompany.company?.name
              });
            }
          }
        } catch (switchCheckErr) {
          console.warn('[getSingleProduct] Error checking other accessible companies:', switchCheckErr.message);
        }
      }

      // Check if product exists anywhere in another company
      try {
        const productAnywhere = await getSharedPrismaClient().product.findFirst({
          where: withActiveProductFilter({ OR: orConditions }),
          select: { id: true, name: true, company: { select: { name: true } } }
        });
        if (productAnywhere) {
          return res.status(404).json({
            success: false,
            code: 'DIFFERENT_COMPANY_NO_ACCESS',
            message: `المنتج يتبع لشركة أخرى (${productAnywhere.company?.name || 'شركة أخرى'}) ولا تملك صلاحية الوصول إليه بحسابك الحالي.`
          });
        }
      } catch (errAnywhere) {
        // ignore
      }

      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    //console.log(`✅ [server] Product found: ${product.name}`);
    const normalized = formatProductResponse(product);
    const merchantProductLink = currentMerchant ? product.merchantProducts?.[0] || null : null;
    const decoratedMerchantProducts = merchantProductLink
      ? await merchantService.decorateMerchantProductsWithInventorySnapshot(
          currentMerchant,
          [{ ...merchantProductLink, productId: product.id }],
        )
      : [];
    const inventorySnapshot =
      decoratedMerchantProducts[0]?.inventorySnapshot || null;
    const merchantDisplayStock = inventorySnapshot
      ? Number(
          inventorySnapshot.availableForSale ??
          merchantProductLink?.stock ??
          normalized.stock ??
          0
        )
      : Number(merchantProductLink?.stock ?? normalized.stock ?? 0);
    const parsedMetadata = parseProductMetadata(product.metadata);
    const shippingClass = parsedMetadata?.shippingClass || 'standard';
    const excludeFromFreeShipping = parsedMetadata?.excludeFromFreeShipping || false;

    res.json({
      success: true,
      data: {
        ...normalized,
        ...(merchantProductLink
          ? {
              price: Number(merchantProductLink.merchantPrice ?? normalized.price ?? 0),
              stock: merchantDisplayStock,
              availableStock: merchantDisplayStock,
              fulfillableStock: merchantDisplayStock,
              sku: merchantProductLink.merchantSku || normalized.sku,
              inventorySnapshot,
            }
          : {}),
        shippingClass,
        excludeFromFreeShipping,
        workflow: resolveProductWorkflow(product),
        merchantContext: currentMerchant
            ? {
                merchantId: currentMerchant.id,
                fulfillmentMode: currentMerchant.fulfillmentMode,
                defaultWarehouseId: currentMerchant.defaultWarehouseId,
                productLink: merchantProductLink,
                stockLocation: inventorySnapshot?.stockLocation,
                stockLocationLabel: inventorySnapshot?.stockLocationLabel,
                canEditStock: inventorySnapshot
                  ? inventorySnapshot.canEditStock
                  : !isCompanyWarehouseMerchant(currentMerchant),
                inventorySnapshot,
              }
            : undefined,
      }
    });
  } catch (error) {
    console.error(`❌ [server] Error getting product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const getAuthorizedProductForMutation = async (req, productId, select = {}) => {
  const userId = req.user?.id;

  if (!userId) {
    const error = new Error('غير مصرح بالوصول - تسجيل الدخول مطلوب');
    error.statusCode = 403;
    throw error;
  }

  const existingProduct = await getSharedPrismaClient().product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      companyId: true,
      deletedAt: true,
      name: true,
      images: true,
      mainImage: true,
      metadata: true,
      isActive: true,
      isHidden: true,
      ...select,
    }
  });

  if (!existingProduct) {
    const error = new Error('المنتج غير موجود');
    error.statusCode = 404;
    throw error;
  }

  if (existingProduct.deletedAt) {
    const error = new Error('المنتج موجود في سلة المحذوفات');
    error.statusCode = 404;
    throw error;
  }

  if (req.user.role === 'SUPER_ADMIN') {
    return existingProduct;
  }

  if (req.user.companyId === existingProduct.companyId) {
    if (isMerchantUser(req.user)) {
      const merchant = await requireMerchantAccountForUser(req.user);
      await assertMerchantProductAccess(getSharedPrismaClient(), merchant, productId);
    }

    return existingProduct;
  }

  const userCompany = await getSharedPrismaClient().userCompany.findFirst({
    where: {
      userId,
      companyId: existingProduct.companyId,
      isActive: true,
    }
  });

  if (!userCompany) {
    const error = new Error('غير مصرح لك بالوصول إلى هذا المنتج');
    error.statusCode = 403;
    throw error;
  }

  return existingProduct;
};

const WORKFLOW_ACTION_MESSAGES = {
  save_draft: 'تم حفظ المنتج كمسودة',
  submit_review: 'تم إرسال المنتج للمراجعة',
  approve: 'تم اعتماد المنتج',
  reject: 'تم رفض المنتج',
  publish: 'تم نشر المنتج',
  unpublish: 'تم إلغاء نشر المنتج',
};

const MERCHANT_ALLOWED_WORKFLOW_ACTIONS = new Set(['save_draft', 'submit_review']);
const MERCHANT_RESTRICTED_PRODUCT_FIELDS = [
  'isActive',
  'isFeatured',
  'hasPromotedAd',
  'allowAffiliateMarkup',
  'affiliateCommission',
  'commissionType',
  'isDropshipped',
  'merchantProductId',
  'basePrice',
  'easyOrdersId',
  'easyOrdersUrl',
  'source',
  'externalId',
  'wooCommerceId',
  'wooCommerceUrl',
];

const assertProductWorkflowPermission = (user, action) => {
  if (isMerchantUser(user) && !MERCHANT_ALLOWED_WORKFLOW_ACTIONS.has(action)) {
    const error = new Error('صلاحيات التاجر تسمح بحفظ المنتج أو إرساله للمراجعة فقط');
    error.statusCode = 403;
    throw error;
  }
};

const stripMerchantRestrictedProductFields = (updateData) => {
  MERCHANT_RESTRICTED_PRODUCT_FIELDS.forEach((field) => {
    delete updateData[field];
  });
};

const getMerchantFulfillmentMode = (merchant) =>
  fulfillmentService.normalizeFulfillmentMode(merchant?.fulfillmentMode);

const isCompanyWarehouseMerchant = (merchant) =>
  getMerchantFulfillmentMode(merchant) === 'COMPANY_WAREHOUSE';

const updateSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - تسجيل الدخول مطلوب'
      });
    }

    const existingProduct = await getAuthorizedProductForMutation(req, id, {
      sku: true,
      slug: true,
    });
    const currentMerchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const stockManagedByCompanyWarehouse = isCompanyWarehouseMerchant(currentMerchant);

    const companyId = existingProduct.companyId;
    const existingMetadata = parseProductMetadata(existingProduct.metadata);
    const existingWorkflow = resolveProductWorkflow(existingProduct);

    // Log the incoming update attempt for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PRODUCT-UPDATE] Updating product ${id} for company ${companyId}. Payload keys:`, Object.keys(req.body));
    }

    // Whitelist of valid Prisma Product model fields to prevent update failures
    // caused by UI-only fields (like featuredPriority, shippingClass, etc.)
    const VALID_PRODUCT_FIELDS = [
      'name', 'description', 'sku', 'price', 'comparePrice', 'cost', 
      'images', 'mainImage', 'stock', 'trackInventory', 'weight', 
      'dimensions', 'categoryId', 'isActive', 'isFeatured', 'isHidden', 
      'tags', 'metadata', 'barcode', 'easyOrdersId', 'easyOrdersUrl', 
      'source', 'externalId', 'wooCommerceId', 'wooCommerceUrl', 
      'hasPromotedAd', 'enableCheckoutForm', 'showAddToCartButton', 
      'saleStartDate', 'saleEndDate', 'sizeGuide', 'isPreOrder', 
      'preOrderDate', 'preOrderMessage', 'slug', 'isDropshipped', 
      'merchantProductId', 'basePrice', 'allowAffiliateMarkup', 
      'affiliateVisibility', 'affiliateVisibleAffiliateIds', 
      'affiliateCommission', 'commissionType', 'showFakeStock'
    ];

    const updateData = {};
    
    // Only copy valid fields from request body
    VALID_PRODUCT_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (updateData.sku !== undefined) {
      const normalizedSku = normalizeOptionalString(updateData.sku);
      const existingSku = normalizeOptionalString(existingProduct.sku);

      if (normalizedSku === existingSku) {
        delete updateData.sku;
      } else {
        updateData.sku = normalizedSku;

        if (normalizedSku) {
          const skuConflict = await findConflictingProductSku({
            companyId,
            sku: normalizedSku,
            excludeProductId: id,
          });

          if (skuConflict) {
            return res.status(400).json({
              success: false,
              message: SKU_CONFLICT_MESSAGE,
            });
          }
        }
      }
    }

    if (currentMerchant) {
      stripMerchantRestrictedProductFields(updateData);
      if (stockManagedByCompanyWarehouse) {
        delete updateData.stock;
        // NOTE: trackInventory is intentionally preserved so a merchant's
        // choice to disable stock tracking (or enable pre-order) is honoured.
        // Removing it forced every product back to trackInventory=true and
        // broke pre-order / no-stock checkout on the storefront.
      }
    }

    // Handle special case where 'category' might be passed as an alias for categoryId
    if (req.body.category !== undefined && updateData.categoryId === undefined) {
      updateData.category = req.body.category;
    }

    // Handle tags array - convert to JSON string if it's an array
    if (updateData.tags && Array.isArray(updateData.tags)) {
      updateData.tags = JSON.stringify(updateData.tags);
      //console.log(`🏷️ [server] Converted tags array to JSON string`);
    }

    // Handle dimensions object - convert to JSON string if it's an object
    if (updateData.dimensions && typeof updateData.dimensions === 'object') {
      updateData.dimensions = JSON.stringify(updateData.dimensions);
      //console.log(`📏 [server] Converted dimensions object to JSON string`);
    }

    if (updateData.images !== undefined || updateData.mainImage !== undefined) {
      const resolvedMedia = resolveProductMediaState({
        currentImages: existingProduct.images,
        currentMainImage: existingProduct.mainImage,
        nextImages: updateData.images,
        nextMainImage: updateData.mainImage,
      });

      updateData.images = resolvedMedia.images.length > 0 ? JSON.stringify(resolvedMedia.images) : null;
      updateData.mainImage = resolvedMedia.mainImage;
    }

    const incomingVariantSettings = req.body.variantSettings;

    // Merge metadata + variantSettings into a single metadata payload
    let metadataChanged = false;
    let mergedMetadata = existingMetadata;

    if (updateData.metadata !== undefined) {
      mergedMetadata = {
        ...existingMetadata,
        ...parseProductMetadata(updateData.metadata),
      };
      metadataChanged = true;
    }

    if (incomingVariantSettings !== undefined) {
      mergedMetadata = { ...mergedMetadata, variantSettings: incomingVariantSettings };
      metadataChanged = true;
    }

    const incomingMetaTitle =
      req.body.metaTitle !== undefined
        ? req.body.metaTitle
          ? String(req.body.metaTitle).trim()
          : null
        : undefined;
    const incomingMetaDescription =
      req.body.metaDescription !== undefined
        ? req.body.metaDescription
          ? String(req.body.metaDescription).trim()
          : null
        : undefined;

    if (incomingMetaTitle !== undefined || incomingMetaDescription !== undefined) {
      mergedMetadata = { ...(mergedMetadata || {}) };
      if (incomingMetaTitle !== undefined) {
        mergedMetadata.metaTitle = incomingMetaTitle;
        if (!mergedMetadata.seo) mergedMetadata.seo = {};
        mergedMetadata.seo.metaTitle = incomingMetaTitle;
        mergedMetadata.seo.title = incomingMetaTitle;
      }
      if (incomingMetaDescription !== undefined) {
        mergedMetadata.metaDescription = incomingMetaDescription;
        if (!mergedMetadata.seo) mergedMetadata.seo = {};
        mergedMetadata.seo.metaDescription = incomingMetaDescription;
        mergedMetadata.seo.description = incomingMetaDescription;
      }
      metadataChanged = true;
    }

    if (metadataChanged) {
      const sanitized = sanitizeMetadataMedia(mergedMetadata || {});
      const shouldPublishOnUpdate =
        !currentMerchant && updateData.isActive !== undefined && Boolean(updateData.isActive);
      const nextWorkflow = shouldPublishOnUpdate
        ? {
            ...resolveProductWorkflow({
              metadata: sanitized,
              isActive: true,
            }),
            status: PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
            publishedAt: existingWorkflow.publishedAt || new Date().toISOString(),
            unpublishedAt: null,
            rejectionReason: null,
            lastActionAt: new Date().toISOString(),
          }
        : resolveProductWorkflow({
            metadata: sanitized,
            isActive:
              updateData.isActive !== undefined
                ? Boolean(updateData.isActive)
                : existingWorkflow.status === 'PUBLISHED',
          });
      const metadataWithWorkflow = withWorkflowMetadata(sanitized, nextWorkflow);
      updateData.metadata = serializeJsonField(metadataWithWorkflow);
      if (updateData.isActive === undefined) {
        updateData.isActive = metadataWithWorkflow.workflow.status === 'PUBLISHED';
      }
    }

    // Ensure numeric fields are properly typed
    if (updateData.price !== undefined) {
      updateData.price = parseFloat(updateData.price);
    }
    if (updateData.stock !== undefined) {
      // الحقل الفاضي من المدخل يعني صفر — نفس سلوك الإنشاء
      const stockValue = updateData.stock === '' || updateData.stock === null
        ? 0
        : updateData.stock;
      const stockResult = validateStock(stockValue);
      if (!stockResult.ok) {
        return res.status(400).json({
          success: false,
          message: stockResult.message,
          error: stockResult.message,
        });
      }
      updateData.stock = parseInt(stockValue);
    }
    if (updateData.comparePrice !== undefined) {
      updateData.comparePrice = parseFloat(updateData.comparePrice);
    }
    if (updateData.cost !== undefined) {
      updateData.cost = parseFloat(updateData.cost);
    }

    // Handle trackInventory field
    if (updateData.trackInventory !== undefined) {
      updateData.trackInventory = Boolean(updateData.trackInventory);
      //console.log(`📦 [server] Track inventory: ${updateData.trackInventory}`);
    }

    if (updateData.isActive !== undefined) {
      updateData.isActive = Boolean(updateData.isActive);

      if (updateData.metadata === undefined) {
        let nextWorkflow = existingWorkflow;

        if (updateData.isActive) {
          nextWorkflow = buildWorkflowTransition(
            existingWorkflow,
            'publish',
            req.user,
          );
        } else if (existingWorkflow.status === 'PUBLISHED') {
          nextWorkflow = buildWorkflowTransition(
            existingWorkflow,
            'unpublish',
            req.user,
          );
        }

        updateData.metadata = serializeJsonField(
          withWorkflowMetadata(existingMetadata, nextWorkflow),
        );
      }
    }

    // Handle hasPromotedAd field
    if (updateData.hasPromotedAd !== undefined) {
      updateData.hasPromotedAd = Boolean(updateData.hasPromotedAd);
      //console.log(`📢 [server] Has promoted ad: ${updateData.hasPromotedAd}`);
    }

    // Handle enableCheckoutForm and showAddToCartButton fields
    if (updateData.enableCheckoutForm !== undefined) {
      updateData.enableCheckoutForm = Boolean(updateData.enableCheckoutForm);
    }
    if (updateData.showAddToCartButton !== undefined) {
      updateData.showAddToCartButton = Boolean(updateData.showAddToCartButton);
    }
    if (updateData.isHidden !== undefined) {
      updateData.isHidden = Boolean(updateData.isHidden);
    }
    if (updateData.showFakeStock !== undefined) {
      updateData.showFakeStock = Boolean(updateData.showFakeStock);
    }

    // Handle sale dates - convert to Date objects if provided
    if (updateData.saleStartDate !== undefined) {
      updateData.saleStartDate = updateData.saleStartDate ? new Date(updateData.saleStartDate) : null;
    }
    if (updateData.saleEndDate !== undefined) {
      updateData.saleEndDate = updateData.saleEndDate ? new Date(updateData.saleEndDate) : null;
    }

    // Handle sizeGuide field - 📏 دليل المقاسات
    if (updateData.sizeGuide !== undefined) {
      updateData.sizeGuide = updateData.sizeGuide ? String(updateData.sizeGuide).trim() : null;
      //console.log(`📏 [server] Size guide: ${updateData.sizeGuide ? 'provided' : 'empty'}`);
    }

    // Handle Pre-order fields - 📦 الطلب المسبق
    if (updateData.isPreOrder !== undefined) {
      updateData.isPreOrder = Boolean(updateData.isPreOrder);
    }
    if (updateData.preOrderDate !== undefined) {
      updateData.preOrderDate = updateData.preOrderDate ? new Date(updateData.preOrderDate) : null;
    }
    if (updateData.preOrderMessage !== undefined) {
      updateData.preOrderMessage = updateData.preOrderMessage ? String(updateData.preOrderMessage).trim() : null;
    }

    // Handle category field - convert to categoryId for Prisma
    if (updateData.category !== undefined) {
      if (updateData.category && updateData.category.trim() !== '') {
        updateData.categoryId = updateData.category;
        //console.log(`🏷️ [server] Converted category to categoryId: ${updateData.categoryId}`);
      } else {
        // If category is empty string or null, set categoryId to null
        updateData.categoryId = null;
        //console.log(`🏷️ [server] Category is empty, setting categoryId to null`);
      }
      delete updateData.category;
    }

    // Handle slug update
    if (updateData.slug !== undefined) {
      if (updateData.slug && updateData.slug.trim() !== '') {
        const newSlug = updateData.slug.trim();
        const existingSlug = existingProduct.slug ? existingProduct.slug.trim() : null;

        // Reject if the slug is being changed and contains invalid patterns (spaces, encoded chars, digits-only)
        if (newSlug !== existingSlug && isInvalidProductSlug(newSlug)) {
          return res.status(400).json({
            success: false,
            message: INVALID_SLUG_ERROR_MESSAGE,
            error: INVALID_SLUG_ERROR_MESSAGE,
          });
        }

        // Ensure uniqueness
        const slugExists = await getSharedPrismaClient().product.findFirst({
          where: {
            slug: newSlug,
            companyId,
            id: { not: id }
          }
        });

        if (slugExists) {
          return res.status(400).json({
            success: false,
            message: 'رابط المنتج (slug) مستخدم بالفعل، يرجى اختيار رابط آخر'
          });
        }
        updateData.slug = newSlug;
      } else if (updateData.name || (existingProduct && existingProduct.name)) {
        // If slug is empty, try to generate it from the new name OR existing name
        const nameToUse = updateData.name || existingProduct.name;

        // 🔤 Transliterate name for slug generation
        const transliterated = transliterateArabicToFranco(nameToUse);

        let generatedSlug = transliterated.trim().toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');

        if (!generatedSlug) {
          generatedSlug = `product-${Date.now()}`;
        }

        // Check uniqueness for generated slug
        const generatedSlugExists = await getSharedPrismaClient().product.findFirst({
          where: {
            slug: generatedSlug,
            companyId,
            id: { not: id }
          }
        });

        if (!generatedSlugExists) {
          updateData.slug = generatedSlug;
        } else {
          // If generated one exists, append timestamp
          updateData.slug = `${generatedSlug}-${Math.floor(Date.now() / 1000)}`;
        }
      } else {
        // If slug is empty and no name update, we could leave it as null, OR fetch existing name. 
        // Assuming simpler case first: logic above handles when name is part of update.
        // If users explicitly clear slug without changing name, maybe they WANT it null? 
        // But usually they want a valid slug. 
        // Let's stick to: if explicitly cleared (empty string) -> null (unless name update is present)
        // Actually, wait, if updateData.name IS NOT present, we can't generate a slug from it.
        updateData.slug = null;
      }
    }

    // Validate categoryId if provided
    if (updateData.categoryId) {
      try {
        const categoryExists = await getSharedPrismaClient().category.findUnique({
          where: { id: updateData.categoryId }
        });

        if (!categoryExists) {
          //console.log(`⚠️ [server] Category ${updateData.categoryId} not found, removing from update`);
          delete updateData.categoryId;
        }
      } catch (error) {
        //console.log(`⚠️ [server] Error checking category, removing from update:`, error.message);
        delete updateData.categoryId;
      }
    }

    // Validate companyId if provided
    if (updateData.companyId) {
      try {
        const companyExists = await getSharedPrismaClient().company.findUnique({
          where: { id: updateData.companyId }
        });

        if (!companyExists) {
          //console.log(`⚠️ [server] Company ${updateData.companyId} not found, removing from update`);
          delete updateData.companyId;
        }
      } catch (error) {
        //console.log(`⚠️ [server] Error checking company, removing from update:`, error.message);
        delete updateData.companyId;
      }
    }

    const product = await getSharedPrismaClient().product.update({
      where: { id: id },
      data: updateData,
      include: {
        category: true
      }
    });

    if (currentMerchant) {
      const merchantProductUpdate = {};
      if (updateData.price !== undefined) {
        merchantProductUpdate.merchantPrice = updateData.price;
      }
      if (updateData.stock !== undefined && !stockManagedByCompanyWarehouse) {
        merchantProductUpdate.stock = Math.max(0, updateData.stock);
      }

      if (Object.keys(merchantProductUpdate).length > 0) {
        await getSharedPrismaClient().merchantProduct.updateMany({
          where: {
            merchantId: currentMerchant.id,
            productId: product.id
          },
          data: merchantProductUpdate
        });
      }

      if (updateData.stock !== undefined && !stockManagedByCompanyWarehouse) {
        const merchantWarehouse = await ensureMerchantWarehouse(
          getSharedPrismaClient(),
          currentMerchant,
        );
        const nextStock = Math.max(0, updateData.stock);
        await getSharedPrismaClient().inventory.upsert({
          where: {
            productId_warehouseId_batchNumber: {
              productId: product.id,
              warehouseId: merchantWarehouse.id,
              batchNumber: null
            }
          },
          update: {
            quantity: nextStock,
            available: nextStock,
            updatedAt: new Date()
          },
          create: {
            productId: product.id,
            warehouseId: merchantWarehouse.id,
            quantity: nextStock,
            available: nextStock,
            reserved: 0
          }
        });

        await syncMerchantProductStock(getSharedPrismaClient(), currentMerchant, product.id);
      }

      if (updateData.price !== undefined || updateData.stock !== undefined) {
        await merchantService.updateProductDropshippingPrice(product.id);
      }
    } else {
      if (updateData.stock !== undefined) {
        await syncProductToInventory(getSharedPrismaClient(), {
          productId: id,
          companyId,
          stock: updateData.stock,
          cost: updateData.cost !== undefined ? updateData.cost : product.cost,
          userId: req.user?.id || null,
          userName: req.user?.name || req.user?.email || 'System',
          isCreate: false,
        });
      }
    }

    await refreshProductRetrievalArtifacts(product.id, companyId);

    refreshProductVectorKnowledge(product, companyId);

    // 🔄 Sync update to consumer companies
    internalSyncService.syncProductUpdate(product.id, companyId, updateData).catch(err => {
      console.error(`❌ Failed to sync product update for ${product.id}:`, err.message);
    });

    // Invalidate public and storefront product Redis caches immediately
    redisCacheService.delPattern(`public_products:${companyId}:*`).catch(() => {});
    redisCacheService.del(`product_demand_signals:${product.id}`).catch(() => {});

    //console.log(`✅ [server] Product updated: ${product.name}`);
    res.json({
      success: true,
      data: decorateProductWithWorkflow(product)
    });
  } catch (error) {
    console.error(`❌ [server] Error updating product ${req.params.id}:`, error);
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
      return res.status(400).json({
        success: false,
        message: SKU_CONFLICT_MESSAGE,
      });
    }
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث المنتج - ' + (error.message || ''),
      error: error.message,
      details: error.stack
    });
  }
}

const deleteSingleProduct = async (req, res) => {
  try {
    //console.log(`🗑️ [server] DELETE /api/v1/products/${req.params.id}`);

    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[PRODUCT-DELETE] Missing companyId. req.user:`, req.user);
      }
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { id } = req.params;

    // Debug logging (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PRODUCT-DELETE] Deleting product ${id} for company ${companyId}`);
    }

    // التحقق من أن المنتج ينتمي للشركة ولسكوب التاجر عند الحاجة
    const existingProduct = await getAuthorizedProductForMutation(req, id);

    if (!existingProduct) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[PRODUCT-DELETE] Product ${id} not found or doesn't belong to company ${companyId}`);
      }
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود أو غير مصرح لك بالوصول إليه'
      });
    }

    await getSharedPrismaClient().product.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
      }
    });

    //console.log(`✅ [server] Product deleted: ${id}`);
    res.json({
      success: true,
      message: 'تم نقل المنتج إلى سلة المحذوفات بنجاح'
    });
  } catch (error) {
    console.error(`❌ [server] Error deleting product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// سلة المحذوفات - الحصول على جميع المنتجات المحذوفة
const getDeletedProducts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const where = withDeletedProductFilter({ companyId });
    if (isMerchantUser(req.user)) {
      const merchant = await requireMerchantAccountForUser(req.user);
      Object.assign(where, getMerchantProductWhere(merchant, where));
    }

    const deletedProducts = await getSharedPrismaClient().product.findMany({
      where,
      orderBy: {
        deletedAt: 'desc'
      },
      include: {
        category: true
      }
    });

    res.json({
      success: true,
      data: deletedProducts,
      count: deletedProducts.length
    });
  } catch (error) {
    console.error(`❌ [server] Error getting deleted products:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// استعادة منتج من سلة المحذوفات
const restoreProduct = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { id } = req.params;

    const where = withDeletedProductFilter({ id, companyId });
    if (isMerchantUser(req.user)) {
      const merchant = await requireMerchantAccountForUser(req.user);
      Object.assign(where, getMerchantProductWhere(merchant, where));
    }

    // التحقق من أن المنتج المحذوف ينتمي للشركة ولسكوب التاجر عند الحاجة
    const existingProduct = await getSharedPrismaClient().product.findFirst({ where });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود في سلة المحذوفات'
      });
    }

    await getSharedPrismaClient().product.update({
      where: { id: id },
      data: {
        deletedAt: null,
      }
    });

    res.json({
      success: true,
      message: 'تمت استعادة المنتج بنجاح'
    });
  } catch (error) {
    console.error(`❌ [server] Error restoring product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// حذف نهائي للمنتج من سلة المحذوفات
const permanentDeleteProduct = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { id } = req.params;

    const where = withDeletedProductFilter({ id, companyId });
    if (isMerchantUser(req.user)) {
      const merchant = await requireMerchantAccountForUser(req.user);
      Object.assign(where, getMerchantProductWhere(merchant, where));
    }

    // التحقق من أن المنتج المحذوف ينتمي للشركة ولسكوب التاجر عند الحاجة
    const existingProduct = await getSharedPrismaClient().product.findFirst({ where });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود في سلة المحذوفات'
      });
    }

    // حذف نهائي
    await getSharedPrismaClient().product.delete({
      where: { id: id }
    });

    res.json({
      success: true,
      message: 'Product permanently deleted'
    });
  } catch (error) {
    console.error(`❌ [server] Error permanently deleting product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const createProduct = async (req, res) => {
  try {
    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[PRODUCT-CREATE] Missing companyId. req.user:`, req.user);
      }
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // Debug logging (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PRODUCT-CREATE] Creating product for company ${companyId}`);
    }

    const currentMerchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;

    const { name, description, price, category, categoryId, stock, sku, images, tags, hasPromotedAd, showFakeStock, metadata, variantSettings } = req.body;

    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const parsedPrice = Number(price);

    // Validate required fields
    if (!normalizedName || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        error: 'Name is required and price must be a valid non-negative number'
      });
    }

    const productLimitCheck = await ensureWithinPlanLimit(companyId, 'products', 1);
    if (!productLimitCheck.allowed) {
      return res.status(400).json(productLimitCheck.payload);
    }

    // Generate unique SKU only if provided
    let productSku = normalizeOptionalString(sku) || null;
    if (productSku) {
      // Ensure SKU is unique within the company
      let skuExists = await findConflictingProductSku({
        companyId,
        sku: productSku,
      });
      if (skuExists) {
        return res.status(400).json({
          success: false,
          message: SKU_CONFLICT_MESSAGE,
          error: SKU_CONFLICT_MESSAGE,
        });
      }
    }

    // Generate or validate slug
    let productSlug = req.body.slug ? req.body.slug.trim() : null;
    if (productSlug && isInvalidProductSlug(productSlug)) {
      return res.status(400).json({
        success: false,
        message: INVALID_SLUG_ERROR_MESSAGE,
        error: INVALID_SLUG_ERROR_MESSAGE,
      });
    }
    if (!productSlug && normalizedName) {
      productSlug = normalizedName
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s\-_]/gu, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!productSlug) {
        productSlug = `product-${Date.now()}`;
      }
    }

    if (productSlug) {
      const slugExists = await getSharedPrismaClient().product.findFirst({
        where: {
          slug: productSlug,
          companyId
        }
      });

      if (slugExists) {
        // 🔄 Auto-resolve conflict by appending timestamp (important for product duplication)
        const baseSlug = productSlug;
        const timestamp = Math.floor(Date.now() / 1000);
        productSlug = `${baseSlug}-${timestamp}`;

        // Double-check the new slug is also unique
        const newSlugExists = await getSharedPrismaClient().product.findFirst({
          where: { slug: productSlug, companyId }
        });
        if (newSlugExists) {
          productSlug = `${baseSlug}-${Date.now()}`;
        }
      }
    }

    // معالجة الفئة - التحقق من وجودها
    const incomingCategoryId =
      (typeof category === 'string' && category.trim() !== '' && category.trim()) ||
      (typeof categoryId === 'string' && categoryId.trim() !== '' && categoryId.trim()) ||
      null;

    let resolvedCategoryId = null;
    if (incomingCategoryId) {
      const categoryExists = await getSharedPrismaClient().category.findFirst({
        where: {
          id: incomingCategoryId,
          companyId
        }
      });
      if (categoryExists) {
        resolvedCategoryId = incomingCategoryId;
      }
    }

    const resolvedMedia = resolveProductMediaState({
      currentImages: [],
      currentMainImage: null,
      nextImages: images,
      nextMainImage: req.body.mainImage,
    });

    let sanitizedMetadata = sanitizeMetadataMedia(metadata || {});
    if (variantSettings !== undefined) {
      sanitizedMetadata = { ...(sanitizedMetadata || {}), variantSettings };
    }

    const incomingCreateMetaTitle =
      req.body.metaTitle !== undefined
        ? req.body.metaTitle
          ? String(req.body.metaTitle).trim()
          : null
        : undefined;
    const incomingCreateMetaDescription =
      req.body.metaDescription !== undefined
        ? req.body.metaDescription
          ? String(req.body.metaDescription).trim()
          : null
        : undefined;

    if (incomingCreateMetaTitle !== undefined || incomingCreateMetaDescription !== undefined) {
      sanitizedMetadata = { ...(sanitizedMetadata || {}) };
      if (incomingCreateMetaTitle !== undefined) {
        sanitizedMetadata.metaTitle = incomingCreateMetaTitle;
        if (!sanitizedMetadata.seo) sanitizedMetadata.seo = {};
        sanitizedMetadata.seo.metaTitle = incomingCreateMetaTitle;
        sanitizedMetadata.seo.title = incomingCreateMetaTitle;
      }
      if (incomingCreateMetaDescription !== undefined) {
        sanitizedMetadata.metaDescription = incomingCreateMetaDescription;
        if (!sanitizedMetadata.seo) sanitizedMetadata.seo = {};
        sanitizedMetadata.seo.metaDescription = incomingCreateMetaDescription;
        sanitizedMetadata.seo.description = incomingCreateMetaDescription;
      }
    }
    const shouldPublishOnCreate =
      !currentMerchant && req.body.isActive !== undefined && Boolean(req.body.isActive);
    const initialWorkflow = currentMerchant
      ? { status: PRODUCT_WORKFLOW_STATUSES.DRAFT }
      : shouldPublishOnCreate
        ? { status: PRODUCT_WORKFLOW_STATUSES.PUBLISHED, publishedAt: new Date().toISOString() }
        : resolveProductWorkflow({
          metadata: sanitizedMetadata,
          isActive:
            req.body.isActive !== undefined ? Boolean(req.body.isActive) : false,
        });
    const workflowPayload = createWorkflowUpdatePayload({
      metadata: sanitizedMetadata,
      workflow: initialWorkflow,
    });

    if (stock !== undefined && stock !== null && stock !== '') {
      const stockResult = validateStock(stock);
      if (!stockResult.ok) {
        return res.status(400).json({
          success: false,
          message: stockResult.message,
          error: stockResult.message,
        });
      }
    }

    const now = new Date();
    let product = await getSharedPrismaClient().product.create({
      data: {
        name: normalizedName,
        description: description || '',
        price: parsedPrice,
        sku: productSku,
        stock: parseInt(stock) || 0,
        trackInventory: req.body.trackInventory !== undefined ? req.body.trackInventory : true,
        hasPromotedAd: hasPromotedAd !== undefined ? Boolean(hasPromotedAd) : false,
        slug: productSlug,
        companyId, // 
        categoryId: resolvedCategoryId, // 
        images: resolvedMedia.images.length > 0 ? JSON.stringify(resolvedMedia.images) : null,
        tags: tags ? JSON.stringify(tags) : null,
        enableCheckoutForm: req.body.enableCheckoutForm !== undefined ? Boolean(req.body.enableCheckoutForm) : true,
        showAddToCartButton: req.body.showAddToCartButton !== undefined ? Boolean(req.body.showAddToCartButton) : true,
        saleStartDate: req.body.saleStartDate ? new Date(req.body.saleStartDate) : null,
        saleEndDate: req.body.saleEndDate ? new Date(req.body.saleEndDate) : null,
        comparePrice: req.body.comparePrice ? parseFloat(req.body.comparePrice) : null,
        cost: req.body.cost ? parseFloat(req.body.cost) : null,
        isActive: workflowPayload.isActive,
        isFeatured: req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : false,
        isHidden: req.body.isHidden !== undefined ? Boolean(req.body.isHidden) : false,
        showFakeStock: showFakeStock !== undefined ? Boolean(showFakeStock) : false,
        allowAffiliateMarkup: req.body.allowAffiliateMarkup !== undefined ? Boolean(req.body.allowAffiliateMarkup) : false,
        weight: req.body.weight ? parseFloat(req.body.weight) : null,
        dimensions: req.body.dimensions ? JSON.stringify(req.body.dimensions) : null,
        metadata: workflowPayload.metadata,
        mainImage: resolvedMedia.mainImage,
        updatedAt: now
      },
      include: {
        category: true
      }
    });

    if (currentMerchant) {
      const stockManagedByCompanyWarehouse = isCompanyWarehouseMerchant(currentMerchant);
      const merchantWarehouse = stockManagedByCompanyWarehouse
        ? await resolveCompanyWarehouseForMerchant(
            getSharedPrismaClient(),
            currentMerchant,
          )
        : await ensureMerchantWarehouse(
            getSharedPrismaClient(),
            currentMerchant,
          );
      const initialStock = Math.max(0, parseInt(stock, 10) || 0);
      const merchantProduct = await getSharedPrismaClient().merchantProduct.create({
        data: {
          merchantId: currentMerchant.id,
          productId: product.id,
          merchantSku: productSku,
          merchantPrice: parsedPrice,
          stock: stockManagedByCompanyWarehouse ? 0 : initialStock,
          syncEnabled: true,
          isActive: true,
        }
      });

      if (!stockManagedByCompanyWarehouse || initialStock > 0) {
        await getSharedPrismaClient().inventory.upsert({
          where: {
            productId_warehouseId_batchNumber: {
              productId: product.id,
              warehouseId: merchantWarehouse.id,
              batchNumber: null
            }
          },
          update: {
            quantity: initialStock,
            available: initialStock,
            updatedAt: now
          },
          create: {
            productId: product.id,
            warehouseId: merchantWarehouse.id,
            quantity: initialStock,
            available: initialStock,
            reserved: 0
          }
        });
      }

      if (!stockManagedByCompanyWarehouse) {
        await syncMerchantProductStock(getSharedPrismaClient(), currentMerchant, product.id);
      }
      await getSharedPrismaClient().product.update({
        where: { id: product.id },
        data: {
          isDropshipped: true,
          merchantProductId: merchantProduct.id,
          basePrice: parsedPrice
        },
      });
      await merchantService.updateProductDropshippingPrice(product.id);

      product = await getSharedPrismaClient().product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          merchantProducts: {
            where: { merchantId: currentMerchant.id }
          }
        }
      });
    } else {
      const actorName = req.user?.name || req.user?.email || 'System';
      await syncProductToInventory(getSharedPrismaClient(), {
        productId: product.id,
        companyId,
        stock: product.stock,
        cost: product.cost,
        userId: req.user?.id || null,
        userName: actorName,
        isCreate: true,
      });
    }

    await refreshProductRetrievalArtifacts(product.id, companyId);

    refreshProductVectorKnowledge(product, companyId);

    // 🚀 إرسال تلقائي لمنتج جديد عبر الواتساب (عروض المنتجات) — لو الإعداد مفعّل.
    // fire-and-forget: مش بننتظرها عشان ما تؤخرش استجابة إنشاء المنتج.
    try {
        const productForOffer = {
            id: product.id,
            name: product.name,
            price: product.price,
            images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
        };
        productOfferService.autoSendNewProduct({ companyId, product: productForOffer })
            .catch((err) => console.error('[PRODUCT-CREATE] auto-send error:', err.message));
    } catch (err) {
        console.error('[PRODUCT-CREATE] auto-send trigger error:', err.message);
    }

    res.json({
      success: true,
      data: decorateProductWithWorkflow(product),
      companyId: companyId
    });
  } catch (error) {
    console.error('❌ [server] Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء المنتج - ' + (error.message || ''),
      error: error.message
    });
  }
}

const duplicateProduct = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { id } = req.params;
    const suffix = Date.now();
    const currentMerchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const sourceWhere = currentMerchant
      ? getMerchantProductWhere(currentMerchant, {
          id,
          companyId,
          deletedAt: null,
        })
      : {
          id,
          companyId,
          deletedAt: null,
        };
    const sourceInclude = {
      category: true,
      productVariants: {
        orderBy: [
          { type: 'asc' },
          { sortOrder: 'asc' },
        ],
      },
    };
    if (currentMerchant) {
      sourceInclude.merchantProducts = {
        where: { merchantId: currentMerchant.id },
      };
    }

    const sourceProduct = await getSharedPrismaClient().product.findFirst({
      where: sourceWhere,
      include: sourceInclude,
    });

    if (!sourceProduct) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    const productLimitCheck = await ensureWithinPlanLimit(companyId, 'products', 1);
    if (!productLimitCheck.allowed) {
      return res.status(400).json(productLimitCheck.payload);
    }

    const cloneCache = new Map();
    const sourceMetadata = parseProductMetadata(sourceProduct.metadata);
    const clonedMetadata = cloneMetadataMedia(
      sanitizeMetadataMedia(sourceMetadata),
      { cloneCache },
    ) || {};

    if (clonedMetadata && typeof clonedMetadata === 'object' && !Array.isArray(clonedMetadata)) {
      delete clonedMetadata.workflow;
    }

    const clonedImages = cloneImageCollection(sourceProduct.images, { cloneCache });
    const clonedMainImage = cloneStoredAssetUrl(sourceProduct.mainImage, { cloneCache });
    const resolvedMedia = resolveProductMediaState({
      currentImages: [],
      currentMainImage: null,
      nextImages: clonedImages,
      nextMainImage: clonedMainImage,
    });

    const workflowPayload = createWorkflowUpdatePayload({
      metadata: clonedMetadata,
      workflow: { status: PRODUCT_WORKFLOW_STATUSES.DRAFT },
    });
    const stockManagedByCompanyWarehouse = isCompanyWarehouseMerchant(currentMerchant);
    const sourceMerchantProduct = currentMerchant ? sourceProduct.merchantProducts?.[0] || null : null;
    const duplicateMerchantPrice = Number(
      sourceMerchantProduct?.merchantPrice ?? sourceProduct.price ?? 0
    );
    const rawDuplicateMerchantStock = Number(
      sourceMerchantProduct?.stock ?? sourceProduct.stock ?? 0
    );
    // قصّ المخزون للسقف المنطقي بدلاً من رفض العملية كلها (منتج قديم برقم خيالي)
    const duplicateMerchantStock = Number.isFinite(rawDuplicateMerchantStock)
      ? Math.min(Math.max(rawDuplicateMerchantStock, 0), MAX_PRODUCT_STOCK)
      : 0;

    const duplicatePayload = {
      name: buildDuplicateProductName(sourceProduct.name),
      description: sourceProduct.description || '',
      sku: buildDuplicateSku(sourceProduct.sku, suffix),
      price: currentMerchant ? duplicateMerchantPrice : Number(sourceProduct.price || 0),
      comparePrice:
        sourceProduct.comparePrice !== null && sourceProduct.comparePrice !== undefined
          ? Number(sourceProduct.comparePrice)
          : null,
      cost:
        sourceProduct.cost !== null && sourceProduct.cost !== undefined
          ? Number(sourceProduct.cost)
          : null,
      images: resolvedMedia.images.length > 0 ? JSON.stringify(resolvedMedia.images) : null,
      mainImage: resolvedMedia.mainImage,
      stock: currentMerchant ? duplicateMerchantStock : Number(sourceProduct.stock || 0),
      trackInventory: sourceProduct.trackInventory !== false,
      weight:
        sourceProduct.weight !== null && sourceProduct.weight !== undefined
          ? Number(sourceProduct.weight)
          : null,
      dimensions: sourceProduct.dimensions || null,
      categoryId: sourceProduct.categoryId || null,
      isActive: workflowPayload.isActive,
      isFeatured: sourceProduct.isFeatured === true,
      isHidden: sourceProduct.isHidden === true,
      tags: sourceProduct.tags || null,
      metadata: workflowPayload.metadata,
      companyId,
      hasPromotedAd: sourceProduct.hasPromotedAd === true,
      enableCheckoutForm: sourceProduct.enableCheckoutForm !== false,
      showAddToCartButton: sourceProduct.showAddToCartButton !== false,
      saleStartDate: sourceProduct.saleStartDate || null,
      saleEndDate: sourceProduct.saleEndDate || null,
      sizeGuide: sourceProduct.sizeGuide || null,
      slug: await buildDuplicateProductSlug({ sourceProduct, companyId, suffix }),
      allowAffiliateMarkup: sourceProduct.allowAffiliateMarkup === true,
      affiliateCommission:
        sourceProduct.affiliateCommission !== null && sourceProduct.affiliateCommission !== undefined
          ? Number(sourceProduct.affiliateCommission)
          : null,
      commissionType: sourceProduct.commissionType || 'PERCENTAGE',
      showFakeStock: sourceProduct.showFakeStock === true,
      updatedAt: new Date(),
    };

    const duplicatedProduct = await getSharedPrismaClient().product.create({
      data: duplicatePayload,
      include: {
        category: true,
      },
    });

    if (Array.isArray(sourceProduct.productVariants) && sourceProduct.productVariants.length > 0) {
      for (const variant of sourceProduct.productVariants) {
        const variantMetadata = cloneMetadataMedia(
          sanitizeMetadataMedia(safeJsonParse(variant.metadata, {})),
          { cloneCache },
        ) || {};
        const clonedVariantImages = cloneImageCollection(variant.images, { cloneCache });

        await getSharedPrismaClient().productVariant.create({
          data: {
            productId: duplicatedProduct.id,
            name: variant.name || '',
            type: variant.type || 'color',
            sku: buildDuplicateSku(variant.sku, suffix),
            price:
              variant.price !== null && variant.price !== undefined ? Number(variant.price) : null,
            comparePrice:
              variant.comparePrice !== null && variant.comparePrice !== undefined
                ? Number(variant.comparePrice)
                : null,
            cost: variant.cost !== null && variant.cost !== undefined ? Number(variant.cost) : null,
            images:
              clonedVariantImages.length > 0 ? JSON.stringify(clonedVariantImages) : null,
            stock: stockManagedByCompanyWarehouse ? 0 : Number(variant.stock || 0),
            trackInventory: variant.trackInventory !== false,
            isActive: variant.isActive !== false,
            sortOrder: Number(variant.sortOrder || 0),
            metadata: serializeJsonField(variantMetadata),
            updatedAt: new Date(),
          },
        });
      }
    }

    if (currentMerchant) {
      const prisma = getSharedPrismaClient();
      const merchantWarehouse = stockManagedByCompanyWarehouse
        ? await resolveCompanyWarehouseForMerchant(prisma, currentMerchant)
        : await ensureMerchantWarehouse(prisma, currentMerchant);
      const initialStock = Math.max(0, Number(duplicateMerchantStock || 0));
      const merchantProduct = await prisma.merchantProduct.create({
        data: {
          merchantId: currentMerchant.id,
          productId: duplicatedProduct.id,
          merchantSku: duplicatePayload.sku,
          merchantPrice: duplicateMerchantPrice,
          stock: stockManagedByCompanyWarehouse ? 0 : initialStock,
          syncEnabled: true,
          isActive: true,
        },
      });

      if (!stockManagedByCompanyWarehouse || initialStock > 0) {
        await prisma.inventory.upsert({
          where: {
            productId_warehouseId_batchNumber: {
              productId: duplicatedProduct.id,
              warehouseId: merchantWarehouse.id,
              batchNumber: null,
            },
          },
          update: {
            quantity: initialStock,
            available: initialStock,
            updatedAt: new Date(),
          },
          create: {
            productId: duplicatedProduct.id,
            warehouseId: merchantWarehouse.id,
            quantity: initialStock,
            available: initialStock,
            reserved: 0,
          },
        });
      }

      if (!stockManagedByCompanyWarehouse) {
        await syncMerchantProductStock(prisma, currentMerchant, duplicatedProduct.id);
      }
      await prisma.product.update({
        where: { id: duplicatedProduct.id },
        data: {
          isDropshipped: true,
          merchantProductId: merchantProduct.id,
          basePrice: duplicateMerchantPrice,
        },
      });
      await merchantService.updateProductDropshippingPrice(duplicatedProduct.id);
    }

    const hydratedInclude = {
      category: true,
      productVariants: {
        orderBy: [
          { type: 'asc' },
          { sortOrder: 'asc' },
        ],
      },
    };
    if (currentMerchant) {
      hydratedInclude.merchantProducts = {
        where: { merchantId: currentMerchant.id },
      };
    }

    const hydratedProduct = await getSharedPrismaClient().product.findUnique({
      where: { id: duplicatedProduct.id },
      include: hydratedInclude,
    });

    if (hydratedProduct) {
      await refreshProductRetrievalArtifacts(hydratedProduct.id, companyId);
    }

    res.status(201).json({
      success: true,
      data: decorateProductWithWorkflow({
        ...(hydratedProduct || duplicatedProduct),
        variants: hydratedProduct?.productVariants || [],
      }),
      message: 'تم نسخ المنتج بنجاح'
    });
  } catch (error) {
    console.error('❌ [PRODUCT-DUPLICATE] Error duplicating product:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في نسخ المنتج',
      error: error.message
    });
  }
}

const deleteImageFromOneProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    //console.log(`🗑️ [IMAGE-DELETE] Removing image from product ${id}:`, imageUrl);

    if (!imageUrl) {
      //console.log('❌ [IMAGE-DELETE] Error: Image URL is required');
      return res.status(400).json({
        success: false,
        error: 'Image URL is required',
        message: 'رابط الصورة مطلوب'
      });
    }

    const normalizedImageUrl = normalizeStoredAssetUrl(imageUrl);
    if (!normalizedImageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image URL',
        message: 'رابط الصورة غير صالح'
      });
    }

    const product = await getAuthorizedProductForMutation(req, id);

    if (!product) {
      //console.log(`❌ [IMAGE-DELETE] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: 'المنتج غير موجود'
      });
    }

    // Parse current images
    const currentImages = normalizeImageCollection(product.images);
    const currentMainImage = normalizeStoredAssetUrl(product.mainImage);

    // Remove image URL
    const initialCount = currentImages.length;
    const remainingImages = currentImages.filter(img => img !== normalizedImageUrl);
    const finalCount = remainingImages.length;

    if (initialCount === finalCount && currentMainImage !== normalizedImageUrl) {
      //console.log(`ℹ️ [IMAGE-DELETE] Image URL not found in product images`);
      return res.status(404).json({
        success: false,
        error: 'Image not found',
        message: 'الصورة غير موجودة'
      });
    }

    //console.log(`➖ [IMAGE-DELETE] Removed image. Images count: ${initialCount} → ${finalCount}`);

    const resolvedMedia = resolveProductMediaState({
      currentImages: remainingImages,
      currentMainImage: currentMainImage === normalizedImageUrl ? null : currentMainImage,
    });

    // Update product in database
    const updatedProduct = await getSharedPrismaClient().product.update({
      where: { id: id },
      data: {
        images: resolvedMedia.images.length > 0 ? JSON.stringify(resolvedMedia.images) : null,
        mainImage: resolvedMedia.mainImage
      }
    });

    //console.log(`✅ [IMAGE-DELETE] Successfully removed image from product ${id}`);
    //console.log(`📊 [IMAGE-DELETE] Final images array:`, currentImages);

    res.json({
      success: true,
      message: 'تم حذف الصورة بنجاح',
      data: {
        removedImageUrl: normalizedImageUrl,
        productId: id,
        remainingImages: resolvedMedia.images.length,
        allImages: resolvedMedia.images,
        mainImage: updatedProduct.mainImage
      }
    });

  } catch (error) {
    console.error('❌ [IMAGE-DELETE] Error removing image:', error);
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'خطأ في الخادم'
    });
  }
}

// Upload product images directly (multipart/form-data)
const uploadProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يرجى رفع صورة واحدة على الأقل'
      });
    }

    // Verify product exists and belongs to the current product scope
    const product = await getAuthorizedProductForMutation(req, id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Parse current images
    const currentImages = sanitizeImageCollection(product.images);

    // Process and add uploaded images URLs
    const newImageUrls = [];
    for (const file of req.files) {
      let currentFilename = file.filename;
      if (isProcessableImage(file.mimetype)) {
        try {
          const processed = await processImage(file.path, path.dirname(file.path));
          currentFilename = processed.filename;
        } catch (procError) {
          console.error(`❌ [IMAGE-PROC] Error processing product image:`, procError.message);
        }
      }
      newImageUrls.push(`/uploads/products/${currentFilename}`);
    }

    const mergedImages = mergeUniqueImages(currentImages, newImageUrls);
    const resolvedMedia = resolveProductMediaState({
      currentImages: mergedImages,
      currentMainImage: product.mainImage || mergedImages[0] || null,
    });

    // Update product
    await getSharedPrismaClient().product.update({
      where: { id },
      data: {
        images: resolvedMedia.images.length > 0 ? JSON.stringify(resolvedMedia.images) : null,
        mainImage: resolvedMedia.mainImage
      }
    });

    // Generate full URLs
    const fullUrls = newImageUrls.map(url => `${req.protocol}://${req.get('host')}${url}`);

    await refreshProductRetrievalArtifacts(id, companyId);

    res.json({
      success: true,
      message: `تم رفع ${newImageUrls.length} صورة بنجاح`,
      data: {
        uploadedImages: fullUrls,
        totalImages: resolvedMedia.images.length,
        mainImage: resolvedMedia.mainImage
      }
    });

  } catch (error) {
    console.error('Error uploading product images:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الصور'
    });
  }
};

const normalizeProductSlugSegment = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildDuplicateProductName = (name) => {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    return 'منتج (نسخة)';
  }

  return /\(نسخة\)$/u.test(trimmedName) ? trimmedName : `${trimmedName} (نسخة)`;
};

const buildDuplicateSku = (sku, suffix) => {
  if (typeof sku !== 'string' || !sku.trim()) {
    return null;
  }

  return `${sku.trim()}-copy-${suffix}`;
};

const buildDuplicateProductSlug = async ({ sourceProduct, companyId, suffix }) => {
  const rawSourceSlug =
    typeof sourceProduct?.slug === 'string' ? sourceProduct.slug.trim() : '';
  const baseSlug = rawSourceSlug.replace(/(?:-copy(?:-\d+)*)$/i, '');
  const baseName =
    typeof sourceProduct?.name === 'string' && sourceProduct.name.trim()
      ? transliterateArabicToFranco(sourceProduct.name)
      : `product-${suffix}`;
  const normalizedBase = normalizeProductSlugSegment(baseSlug || baseName);

  if (!normalizedBase) {
    return null;
  }

  let candidateSlug = `${normalizedBase}-copy-${suffix}`;
  let attempt = 1;

  while (true) {
    const existingProduct = await getSharedPrismaClient().product.findFirst({
      where: {
        companyId,
        slug: candidateSlug,
      },
      select: { id: true },
    });

    if (!existingProduct) {
      return candidateSlug;
    }

    candidateSlug = `${normalizedBase}-copy-${suffix}-${attempt}`;
    attempt += 1;
  }
};

const updateProductWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const action = String(req.body?.action || '').trim().toLowerCase();

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'إجراء الـ workflow مطلوب',
      });
    }

    assertProductWorkflowPermission(req.user, action);

    const existingProduct = await getAuthorizedProductForMutation(req, id, {
      description: true,
      categoryId: true,
      updatedAt: true,
    });
    const companyId = existingProduct.companyId;
    const currentWorkflow = resolveProductWorkflow(existingProduct);

    let nextWorkflow;
    try {
      nextWorkflow = buildWorkflowTransition(currentWorkflow, action, req.user, {
        rejectionReason: req.body?.rejectionReason,
      });
    } catch (transitionError) {
      transitionError.statusCode = transitionError.statusCode || 400;
      throw transitionError;
    }

    const workflowPayload = createWorkflowUpdatePayload({
      metadata: existingProduct.metadata,
      workflow: nextWorkflow,
    });
    const updateData = {
      metadata: workflowPayload.metadata,
      isActive: workflowPayload.isActive,
      updatedAt: new Date(),
    };

    const product = await getSharedPrismaClient().product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    await refreshProductRetrievalArtifacts(product.id, companyId);

    internalSyncService
      .syncProductUpdate(product.id, companyId, updateData)
      .catch((err) => {
        console.error(
          `❌ Failed to sync workflow update for ${product.id}:`,
          err.message,
        );
      });

    res.json({
      success: true,
      message: WORKFLOW_ACTION_MESSAGES[action] || 'تم تحديث حالة المنتج',
      data: decorateProductWithWorkflow(product),
    });
  } catch (error) {
    console.error(`❌ [server] Error updating product workflow ${req.params.id}:`, error);
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'فشل في تحديث حالة المنتج - ' + (error.message || ''),
      error: error.message,
    });
  }
};

const addImageToProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    //console.log(`➕ [IMAGE-ADD] Adding image to product ${id}:`, imageUrl);

    if (!imageUrl) {
      //console.log('❌ [IMAGE-ADD] Error: Image URL is required');
      return res.status(400).json({
        success: false,
        error: 'Image URL is required',
        message: 'رابط الصورة مطلوب'
      });
    }

    const normalizedImageUrl = sanitizeStoredAssetUrl(imageUrl);
    if (!normalizedImageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image URL',
        message: 'رابط الصورة غير صالح'
      });
    }

    const product = await getAuthorizedProductForMutation(req, id);

    if (!product) {
      //console.log(`❌ [IMAGE-ADD] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: 'المنتج غير موجود'
      });
    }

    // Parse current images
    const currentImages = sanitizeImageCollection(product.images);
    const currentMainImage = sanitizeStoredAssetUrl(product.mainImage);

    // Check if image already exists
    if (currentImages.includes(normalizedImageUrl)) {
      //console.log(`ℹ️ [IMAGE-ADD] Image URL already exists in product images`);
      return res.status(409).json({
        success: false,
        error: 'Image already exists',
        message: 'الصورة موجودة بالفعل'
      });
    }

    // Add new image URL
    const mergedImages = mergeUniqueImages(currentImages, [normalizedImageUrl]);
    const resolvedMedia = resolveProductMediaState({
      currentImages: mergedImages,
      currentMainImage: currentMainImage || normalizedImageUrl,
    });
    //console.log(`➕ [IMAGE-ADD] Added image. Images count: ${currentImages.length - 1} → ${currentImages.length}`);

    // Update product in database
    const updatedProduct = await getSharedPrismaClient().product.update({
      where: { id: id },
      data: {
        images: resolvedMedia.images.length > 0 ? JSON.stringify(resolvedMedia.images) : null,
        mainImage: resolvedMedia.mainImage
      }
    });

    //console.log(`✅ [IMAGE-ADD] Successfully added image to product ${id}`);
    //console.log(`📊 [IMAGE-ADD] Final images array:`, currentImages);

    res.json({
      success: true,
      message: 'تم إضافة الصورة بنجاح',
      data: {
        addedImageUrl: normalizedImageUrl,
        productId: id,
        totalImages: resolvedMedia.images.length,
        allImages: resolvedMedia.images,
        mainImage: updatedProduct.mainImage
      }
    });

  } catch (error) {
    console.error('❌ [IMAGE-ADD] Error adding image:', error);
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'خطأ في الخادم'
    });
  }
}

// Create product variant
const createProductVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة ولسكوب التاجر عند الحاجة
    const product = await getAuthorizedProductForMutation(req, id);
    const currentMerchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const stockManagedByCompanyWarehouse = isCompanyWarehouseMerchant(currentMerchant);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // إنشاء الـ variant
    const {
      name,
      type,
      sku,
      price,
      comparePrice,
      cost,
      images,
      stock,
      trackInventory,
      isActive,
      sortOrder,
      metadata
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'اسم المتغير مطلوب'
      });
    }

    const sanitizedVariantImages = sanitizeImageCollection(images);
    const imagesStr = sanitizedVariantImages.length > 0 ? JSON.stringify(sanitizedVariantImages) : null;

    if (stock !== undefined && stock !== null && stock !== '' && !stockManagedByCompanyWarehouse) {
      const stockResult = validateStock(stock);
      if (!stockResult.ok) {
        return res.status(400).json({
          success: false,
          message: stockResult.message,
          error: stockResult.message,
        });
      }
    }

    // إنشاء الـ variant الجديد
    const variant = await getSharedPrismaClient().productVariant.create({
      data: {
        productId: id,
        name,
        type: type || 'color',
        sku,
        price: price ? parseFloat(price) : null,
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        cost: cost ? parseFloat(cost) : null,
        images: imagesStr,
        stock: stockManagedByCompanyWarehouse
          ? 0
          : stock !== undefined ? parseInt(stock) : 0,
        trackInventory: stockManagedByCompanyWarehouse
          ? true
          : trackInventory !== undefined ? trackInventory : true,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        metadata,
        updatedAt: new Date()
      }
    });

    await refreshProductRetrievalArtifacts(id, companyId);

    res.status(201).json({
      success: true,
      data: variant,
      message: 'تم إضافة المتغير بنجاح'
    });

  } catch (error) {
    console.error('Error creating product variant:', error);

    // التحقق من خطأ SKU المكرر
    if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
      return res.status(400).json({
        success: false,
        message: 'رمز SKU موجود بالفعل'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة المتغير'
    });
  }
};

// Add image to product variant (receives imageUrl from frontend)
const addImageToVariantFromBody = async (req, res) => {
  try {
    const { id } = req.params;
    const { variantId, imageUrl } = req.body;
    const companyId = req.user?.companyId;

    console.log('🖼️ [VARIANT-IMAGE] Request:', {
      productId: id,
      variantId,
      imageUrl
    });

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    if (!variantId) {
      console.log('❌ [VARIANT-IMAGE] Missing variantId');
      return res.status(400).json({
        success: false,
        message: 'معرف المتغير مطلوب'
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'رابط الصورة مطلوب'
      });
    }

    const normalizedImageUrl = sanitizeStoredAssetUrl(imageUrl);
    if (!normalizedImageUrl) {
      return res.status(400).json({
        success: false,
        message: 'رابط الصورة غير صالح'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة ولسكوب التاجر عند الحاجة
    const product = await getAuthorizedProductForMutation(req, id);
    const currentMerchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const stockManagedByCompanyWarehouse = isCompanyWarehouseMerchant(currentMerchant);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Get the variant
    const variant = await getSharedPrismaClient().productVariant.findFirst({
      where: {
        id: variantId,
        productId: id
      }
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'المتغير غير موجود'
      });
    }

    // Parse current images
    const currentImages = sanitizeImageCollection(variant.images);

    // Check if image already exists
    if (currentImages.includes(normalizedImageUrl)) {
      return res.status(409).json({
        success: false,
        message: 'الصورة موجودة بالفعل'
      });
    }

    // Add new image URL
    const mergedImages = mergeUniqueImages(currentImages, [normalizedImageUrl]);

    // Update variant in database
    const updatedVariant = await getSharedPrismaClient().productVariant.update({
      where: { id: variantId },
      data: {
        images: mergedImages.length > 0 ? JSON.stringify(mergedImages) : null
      }
    });

    res.json({
      success: true,
      message: 'تم إضافة الصورة بنجاح',
      data: {
        variantId: variantId,
        imageUrl: normalizedImageUrl,
        totalImages: mergedImages.length,
        allImages: mergedImages
      }
    });

  } catch (error) {
    console.error('Error adding image to variant:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الصورة'
    });
  }
};

// Add image to product variant
const addImageToVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const { imageUrl } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'رابط الصورة مطلوب'
      });
    }

    const normalizedImageUrl = sanitizeStoredAssetUrl(imageUrl);
    if (!normalizedImageUrl) {
      return res.status(400).json({
        success: false,
        message: 'رابط الصورة غير صالح'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة ولسكوب التاجر عند الحاجة
    const product = await getAuthorizedProductForMutation(req, id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Get the variant
    const variant = await getSharedPrismaClient().productVariant.findFirst({
      where: {
        id: variantId,
        productId: id
      }
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'المتغير غير موجود'
      });
    }

    // Parse current images
    const currentImages = sanitizeImageCollection(variant.images);

    // Check if image already exists
    if (currentImages.includes(normalizedImageUrl)) {
      return res.status(409).json({
        success: false,
        message: 'الصورة موجودة بالفعل'
      });
    }

    // Add new image URL
    const mergedImages = mergeUniqueImages(currentImages, [normalizedImageUrl]);

    // Update variant in database
    const updatedVariant = await getSharedPrismaClient().productVariant.update({
      where: { id: variantId },
      data: {
        images: mergedImages.length > 0 ? JSON.stringify(mergedImages) : null
      }
    });

    res.json({
      success: true,
      message: 'تم إضافة الصورة بنجاح',
      data: {
        addedImageUrl: normalizedImageUrl,
        variantId: variantId,
        totalImages: mergedImages.length,
        allImages: mergedImages
      }
    });

  } catch (error) {
    console.error('Error adding image to variant:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الصورة'
    });
  }
};

// Delete image from product variant
const deleteImageFromVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const { imageUrl } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'رابط الصورة مطلوب'
      });
    }

    const normalizedImageUrl = normalizeStoredAssetUrl(imageUrl);
    if (!normalizedImageUrl) {
      return res.status(400).json({
        success: false,
        message: 'رابط الصورة غير صالح'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة ولسكوب التاجر عند الحاجة
    const product = await getAuthorizedProductForMutation(req, id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Get the variant
    const variant = await getSharedPrismaClient().productVariant.findFirst({
      where: {
        id: variantId,
        productId: id
      }
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'المتغير غير موجود'
      });
    }

    // Parse current images
    const currentImages = normalizeImageCollection(variant.images);

    // Remove the image
    const imageIndex = currentImages.indexOf(normalizedImageUrl);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'الصورة غير موجودة'
      });
    }

    currentImages.splice(imageIndex, 1);
    const sanitizedImages = sanitizeImageCollection(currentImages);

    // Update variant in database
    await getSharedPrismaClient().productVariant.update({
      where: { id: variantId },
      data: {
        images: sanitizedImages.length > 0 ? JSON.stringify(sanitizedImages) : null
      }
    });

    res.json({
      success: true,
      message: 'تم حذف الصورة بنجاح',
      data: {
        deletedImageUrl: normalizedImageUrl,
        variantId: variantId,
        remainingImages: sanitizedImages.length,
        allImages: sanitizedImages
      }
    });

  } catch (error) {
    console.error('Error deleting image from variant:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الصورة'
    });
  }
};

// Update product variant
const updateProductVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة ولسكوب التاجر عند الحاجة
    const product = await getAuthorizedProductForMutation(req, id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    const currentMerchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const stockManagedByCompanyWarehouse = isCompanyWarehouseMerchant(currentMerchant);

    // التحقق من أن الـ variant موجود
    const existingVariant = await getSharedPrismaClient().productVariant.findFirst({
      where: {
        id: variantId,
        productId: id
      }
    });

    if (!existingVariant) {
      return res.status(404).json({
        success: false,
        message: 'المتغير غير موجود'
      });
    }

    // إعداد بيانات التحديث
    const {
      name,
      type,
      sku,
      price,
      comparePrice,
      cost,
      images,
      stock,
      trackInventory,
      isActive,
      sortOrder,
      metadata
    } = req.body;

    if (stock !== undefined && stock !== null && stock !== '' && !stockManagedByCompanyWarehouse) {
      const stockResult = validateStock(stock);
      if (!stockResult.ok) {
        return res.status(400).json({
          success: false,
          message: stockResult.message,
          error: stockResult.message,
        });
      }
    }

    const imagesStr = images !== undefined
      ? (() => {
          const sanitizedImages = sanitizeImageCollection(images);
          return sanitizedImages.length > 0 ? JSON.stringify(sanitizedImages) : null;
        })()
      : existingVariant.images;

    // تحديث الـ variant
    const updateData = {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(sku !== undefined && { sku }),
      ...(price !== undefined && { price: parseOptionalNullableNumber(price) }),
      ...(comparePrice !== undefined && { comparePrice: parseOptionalNullableNumber(comparePrice) }),
      ...(cost !== undefined && { cost: parseOptionalNullableNumber(cost) }),
      ...(images !== undefined && { images: imagesStr }),
      ...(stock !== undefined && !stockManagedByCompanyWarehouse && { stock: parseOptionalInteger(stock) }),
      ...(trackInventory !== undefined && !stockManagedByCompanyWarehouse && { trackInventory }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder: parseOptionalInteger(sortOrder) }),
      ...(metadata !== undefined && { metadata }),
      updatedAt: new Date()
    };

    const updatedVariant = await getSharedPrismaClient().productVariant.update({
      where: { id: variantId },
      data: updateData
    });

    // 🔔 Swan Waitlist: مقاس 38 رجع متوفر → نبه Wishlist (variantId) عبر إشعارات العملاء
    if (existingVariant.stock <= 0 && updatedVariant.stock > 0 && updatedVariant.trackInventory !== false) {
      const prisma = getSharedPrismaClient();
      prisma.wishlist.findMany({
        where: { companyId, productId: id, variantId, sessionId: { not: 'anonymous' } },
        select: { sessionId: true, customerId: true, productId: true, variantId: true }
      }).then(async (waiters) => {
        if (!waiters || waiters.length === 0) return;
        // Resolve customers: try customerId first, fallback to sessionId-derived lookup
        const customerIds = waiters.map(w => w.customerId).filter(Boolean);
        let customers = [];
        if (customerIds.length > 0) {
          customers = await prisma.customer.findMany({ where: { id: { in: customerIds }, companyId }, select: { id: true, phone: true, firstName: true, lastName: true } });
        }
        // Also try to match wishlist session to customer by phone? Keep minimal
        const product = await prisma.product.findUnique({ where: { id }, select: { name: true } });
        const variantName = updatedVariant.name || 'المقاس المطلوب';
        for (const c of customers) {
          try {
            const { sendCustomerNotification } = require('../services/hr/customerNotificationScheduleService');
            await sendCustomerNotification({
              companyId,
              eventType: 'BACK_IN_STOCK_VARIANT',
              customer: { id: c.id, phone: c.phone, firstName: c.firstName, lastName: c.lastName, name: `${c.firstName||''} ${c.lastName||''}`.trim() },
              customerId: c.id,
              variables: {
                productName: product?.name || 'منتج',
                variantName,
                variantId,
                productId: id
              }
            });
          } catch (e) { console.warn('Waitlist notify failed', e.message); }
        }
        console.log(`✅ [WAITLIST] Notified ${customers.length}/${waiters.length} for variant ${variantId} restock`);
      }).catch(e => console.warn('Waitlist lookup failed', e.message));
    }

    res.json({
      success: true,
      data: updatedVariant,
      message: 'تم تحديث المتغير بنجاح'
    });

  } catch (error) {
    console.error('Error updating product variant:', error);

    // التحقق من خطأ SKU المكرر
    if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
      return res.status(400).json({
        success: false,
        message: 'رمز SKU موجود بالفعل'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المتغير'
    });
  }
};

// Delete product variant
const deleteProductVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة ولسكوب التاجر عند الحاجة
    const product = await getAuthorizedProductForMutation(req, id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // التحقق من أن الـ variant موجود
    const existingVariant = await getSharedPrismaClient().productVariant.findFirst({
      where: {
        id: variantId,
        productId: id
      }
    });

    if (!existingVariant) {
      return res.status(404).json({
        success: false,
        message: 'المتغير غير موجود'
      });
    }

    // حذف الـ variant
    await getSharedPrismaClient().productVariant.delete({
      where: { id: variantId }
    });

    await refreshProductRetrievalArtifacts(id, companyId);

    res.json({
      success: true,
      message: 'تم حذف المتغير بنجاح'
    });

  } catch (error) {
    console.error('Error deleting product variant:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المتغير'
    });
  }
};

// Delete all products for a company
const deleteAllProducts = async (req, res) => {
  try {
    console.log(`🗑️ [DELETE-ALL] Route called - Method: ${req.method}, Path: ${req.path}`);

    const companyId = req.user?.companyId;

    if (!companyId) {
      console.log(`❌ [DELETE-ALL] No companyId found`);
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    if (isMerchantUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'صلاحيات التاجر لا تسمح بحذف كل منتجات الشركة'
      });
    }

    console.log(`🗑️ [DELETE-ALL] Deleting all products for company: ${companyId}`);

    const prisma = getSharedPrismaClient();

    // First, get all products for this company
    const productsToDelete = await prisma.product.findMany({
      where: { companyId },
      select: { id: true }
    });

    const productIds = productsToDelete.map(p => p.id);
    let deletedVariantsCount = 0;

    // Delete all variants first (if there are any products)
    if (productIds.length > 0) {
      const deletedVariants = await prisma.productVariant.deleteMany({
        where: {
          productId: { in: productIds }
        }
      });
      deletedVariantsCount = deletedVariants.count;
      console.log(`   ✅ Deleted ${deletedVariantsCount} variants`);
    }

    // Now delete all products
    const deletedProducts = await prisma.product.deleteMany({
      where: { companyId }
    });

    console.log(`   ✅ Deleted ${deletedProducts.count} products`);

    res.json({
      success: true,
      message: `تم حذف ${deletedProducts.count} منتج و ${deletedVariantsCount} متغير بنجاح`,
      data: {
        deletedProductsCount: deletedProducts.count,
        deletedVariantsCount: deletedVariantsCount
      }
    });

  } catch (error) {
    console.error('❌ [DELETE-ALL] Error deleting all products:', error);
    console.error('❌ [DELETE-ALL] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المنتجات',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get product variants
const getProductVariants = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة ولسكوب التاجر عند الحاجة
    const product = await getAuthorizedProductForMutation(req, id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // جلب الـ variants
    const variants = await getSharedPrismaClient().productVariant.findMany({
      where: {
        productId: id
      },
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: variants,
      message: `تم جلب ${variants.length} variant`
    });

  } catch (error) {
    console.error('Error fetching product variants:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب variants المنتج'
    });
  }
};

const visualSearchProduct = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required' });
    }

    let imageBase64 = null;
    let mimeType = 'image/jpeg';

    if (req.file) {
      const fs = require('fs');
      imageBase64 = fs.readFileSync(req.file.path).toString('base64');
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (req.body?.imageUrl) {
      const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');
      const imageResponse = await fetchFn(req.body.imageUrl);
      if (!imageResponse.ok) {
        return res.status(400).json({ success: false, message: 'Failed to fetch image from URL' });
      }
      imageBase64 = Buffer.from(await imageResponse.arrayBuffer()).toString('base64');
      mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    } else if (req.body?.imageBase64) {
      imageBase64 = req.body.imageBase64;
      mimeType = req.body.mimeType || 'image/jpeg';
    } else {
      return res.status(400).json({ success: false, message: 'Image is required (file, URL, or base64)' });
    }

    const queryText = req.body?.query || '';
    const topK = Math.min(Math.max(Number(req.body?.topK) || 5, 1), 20);
    const minScore = req.body?.minScore != null ? Number(req.body.minScore) : 0.30;

    const result = await aiServiceAdminClient.visualSearch({
      company_id: companyId,
      query: queryText,
      image_base64: imageBase64,
      mime_type: mimeType,
      top_k: topK,
      min_score: minScore,
    });

    res.json({
      success: true,
      data: {
        results: result.data || [],
        topMatch: (result.data || [])[0] || null,
      },
    });
  } catch (error) {
    console.error('Error in visual search:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في البحث بالصورة'
    });
  }
};

const bulkUpdateVisibility = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const { productIds, isHidden } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'قائمة المنتجات مطلوبة' });
    }

    const prisma = getSharedPrismaClient();
    const result = await prisma.product.updateMany({
      where: { id: { in: productIds }, companyId },
      data: { isHidden: Boolean(isHidden) },
    });

    res.json({ success: true, data: { count: result.count } });
  } catch (err) {
    console.error('Bulk visibility update error:', err);
    res.status(500).json({ success: false, message: 'فشل في تحديث رؤية المنتجات' });
  }
};

const bulkUpdateAffiliateVisibility = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const { productIds, allowAffiliateMarkup, affiliateVisibility, affiliateVisibleAffiliateIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'قائمة المنتجات مطلوبة' });
    }

    const prisma = getSharedPrismaClient();
    const data = {};

    if (typeof allowAffiliateMarkup === 'boolean') {
      data.allowAffiliateMarkup = allowAffiliateMarkup;
    }

    if (affiliateVisibility && ['ALL', 'HIDDEN', 'SELECTED'].includes(affiliateVisibility)) {
      data.affiliateVisibility = affiliateVisibility;
    }

    if (affiliateVisibleAffiliateIds !== undefined) {
      data.affiliateVisibleAffiliateIds = JSON.stringify(affiliateVisibleAffiliateIds);
    }

    const result = await prisma.product.updateMany({
      where: { id: { in: productIds }, companyId },
      data,
    });

    res.json({ success: true, data: { count: result.count } });
  } catch (err) {
    console.error('Bulk affiliate visibility update error:', err);
    res.status(500).json({ success: false, message: 'فشل في تحديث رؤية المنتجات للمسوقين' });
  }
};

const bulkUpdateTrackInventory = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const { productIds, trackInventory, includeVariants = true } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'قائمة المنتجات مطلوبة' });
    }
    if (typeof trackInventory !== 'boolean') {
      return res.status(400).json({ success: false, message: 'trackInventory يجب أن يكون true أو false' });
    }

    const prisma = getSharedPrismaClient();

    if (isMerchantUser(req.user) && isCompanyWarehouseMerchant(await resolveMerchantAccount(req.user))) {
      return res.status(403).json({ success: false, message: 'صلاحيات التاجر (مخزن الشركة) لا تسمح بتعديل تتبع المخزون' });
    }

    const productResult = await prisma.product.updateMany({
      where: { id: { in: productIds }, companyId },
      data: { trackInventory: Boolean(trackInventory) },
    });

    let variantCount = 0;
    if (includeVariants) {
      const variantResult = await prisma.productVariant.updateMany({
        where: { productId: { in: productIds }, product: { companyId } },
        data: { trackInventory: Boolean(trackInventory) },
      });
      variantCount = variantResult.count;
    }

    // Swan use-case: 96 product bulk fix — log for audit
    console.log(`✅ [BULK-TRACK-INVENTORY] company=${companyId} trackInventory=${trackInventory} products=${productResult.count} variants=${variantCount}`);

    res.json({ success: true, data: { productsUpdated: productResult.count, variantsUpdated: variantCount, trackInventory: Boolean(trackInventory) } });
  } catch (err) {
    console.error('Bulk trackInventory update error:', err);
    res.status(500).json({ success: false, message: 'فشل في تحديث تتبع المخزون' });
  }
};

module.exports = {
  getAllProducts,
  getCategory,
  createNewCategory,
  updateCategory,
  deleteCategory,
  getSingleProduct,
  updateSingleProduct,
  updateProductWorkflow,
  deleteSingleProduct,
  deleteAllProducts,
  bulkUpdateVisibility,
  bulkUpdateAffiliateVisibility,
  bulkUpdateTrackInventory,
  createProduct,
  duplicateProduct,
  deleteImageFromOneProduct,
  uploadProductImages,
  addImageToProduct,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getProductVariants,
  addImageToVariant,
  addImageToVariantFromBody,
  deleteImageFromVariant,
  // سلة المحذوفات
  getDeletedProducts,
  restoreProduct,
  permanentDeleteProduct,
  // Visual Search
  visualSearchProduct
}

