const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const merchantService = require('../services/merchantService');
const {
  assertMerchantProductAccess,
  assertMerchantWarehouseAccess,
  ensureMerchantWarehouse,
  resolveCompanyWarehouseForMerchant,
  getMerchantProductWhere,
  getMerchantWarehouseWhere,
  isMerchantUser,
  requireMerchantAccountForUser,
  syncMerchantProductStock
} = require('../utils/merchantAccountScope');
const fulfillmentService = require('../services/fulfillmentService');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');
const {
  PRODUCT_WORKFLOW_STATUSES,
  createWorkflowUpdatePayload,
  decorateProductWithWorkflow
} = require('../utils/productWorkflowUtils');
const {
  syncProductStockFromInventory
} = require('../utils/productInventorySync');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const INVENTORY_PRODUCT_ROLES = new Set([
  'SUPER_ADMIN',
  'OWNER',
  'COMPANY_ADMIN',
  'MANAGER',
  'MERCHANT'
]);

const normalizeRole = (role) => String(role || '').trim().toUpperCase();

const parseOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseNonNegativeInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
};

const STOCK_INCREASE_TYPES = new Set(['IN', 'PURCHASE', 'RETURN', 'ADJUSTMENT_IN']);
const STOCK_DECREASE_TYPES = new Set(['OUT', 'SALE', 'DAMAGE', 'ADJUSTMENT_OUT']);
const VALID_STOCK_MOVEMENT_REASONS = new Set([
  'PURCHASE',
  'SALE',
  'DAMAGE',
  'EXPIRED',
  'LOST',
  'FOUND',
  'TRANSFER',
  'RETURN',
  'ADJUSTMENT'
]);

const PERSISTED_STOCK_MOVEMENT_TYPE = {
  IN: 'IN',
  PURCHASE: 'IN',
  RETURN: 'RETURN',
  ADJUSTMENT_IN: 'IN',
  OUT: 'OUT',
  SALE: 'OUT',
  DAMAGE: 'OUT',
  ADJUSTMENT_OUT: 'OUT',
};

const getStockMovementDirection = (type) => {
  const normalizedType = normalizeString(type).toUpperCase();
  if (STOCK_INCREASE_TYPES.has(normalizedType)) {
    return 'IN';
  }
  if (STOCK_DECREASE_TYPES.has(normalizedType)) {
    return 'OUT';
  }
  return null;
};

const createInventoryValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeString = (value) => String(value || '').trim();

const normalizeBatchNumber = (value) => normalizeString(value) || null;

const getPersistedStockMovementType = (type) =>
  PERSISTED_STOCK_MOVEMENT_TYPE[normalizeString(type).toUpperCase()] || null;

const normalizeStockMovementReason = (reason, requestedType) => {
  const normalizedReason = normalizeString(reason).toUpperCase();
  if (VALID_STOCK_MOVEMENT_REASONS.has(normalizedReason)) {
    return normalizedReason;
  }

  const normalizedType = normalizeString(requestedType).toUpperCase();
  if (normalizedType === 'PURCHASE') return 'PURCHASE';
  if (normalizedType === 'SALE') return 'SALE';
  if (normalizedType === 'DAMAGE') return 'DAMAGE';
  if (normalizedType === 'RETURN') return 'RETURN';
  return 'ADJUSTMENT';
};

const findInventoryByProductWarehouseBatch = (prisma, { productId, warehouseId, batchNumber }) => {
  const normalizedBatchNumber = normalizeBatchNumber(batchNumber);

  if (normalizedBatchNumber) {
    return prisma.inventory.findUnique({
      where: {
        productId_warehouseId_batchNumber: {
          productId,
          warehouseId,
          batchNumber: normalizedBatchNumber,
        },
      },
    });
  }

  return prisma.inventory.findFirst({
    where: {
      productId,
      warehouseId,
      OR: [
        { batchNumber: null },
        { batchNumber: '' },
      ],
    },
  });
};

const normalizeImageList = (value) => {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,]+/)
      : [];

  return Array.from(
    new Set(
      rawItems
        .map((item) => {
          if (typeof item === 'string') {
            return item.trim();
          }

          if (item && typeof item === 'object') {
            return normalizeString(item.fullUrl || item.url || item.path);
          }

          return '';
        })
        .filter(Boolean),
    ),
  );
};

const normalizeInventoryVariants = (value) => {
  let rawVariants = value;
  if (typeof rawVariants === 'string') {
    try {
      rawVariants = JSON.parse(rawVariants);
    } catch {
      rawVariants = [];
    }
  }

  if (!Array.isArray(rawVariants)) {
    return [];
  }

  return rawVariants
    .map((variant, index) => {
      const name = normalizeString(variant?.name);
      if (!name) {
        return null;
      }

      const quantity = parseNonNegativeInteger(variant?.quantity ?? variant?.stock, 0);
      const salePrice =
        parseOptionalNumber(variant?.salePrice) ??
        parseOptionalNumber(variant?.price);
      const wholesalePrice =
        parseOptionalNumber(variant?.wholesalePrice) ??
        parseOptionalNumber(variant?.cost);

      return {
        name,
        type: normalizeString(variant?.type) || 'option',
        sku: normalizeString(variant?.sku) || null,
        quantity,
        price: salePrice,
        cost: wholesalePrice,
        images: normalizeImageList(variant?.images),
        sortOrder: Number.isFinite(Number(variant?.sortOrder))
          ? Number(variant.sortOrder)
          : index,
      };
    })
    .filter(Boolean);
};

const resolveInventoryScope = async (req) => {
  if (!isMerchantUser(req.user)) {
    const companyId = req.user.companyId || req.user.effectiveCompanyId;
    return {
      merchant: null,
      isMerchantScope: false,
      companyId,
      warehouseWhere: { companyId },
      productWhere: { companyId },
      merchantWarehouse: null,
      canEditStock: true,
      stockLocation: 'COMPANY',
      stockLocationLabel: 'مخازن الشركة'
    };
  }

  const merchant = await requireMerchantAccountForUser(req.user);
  const fulfillmentMode = fulfillmentService.normalizeFulfillmentMode(merchant.fulfillmentMode);
  const usesCompanyWarehouse = fulfillmentMode === 'COMPANY_WAREHOUSE';
  const merchantWarehouse = usesCompanyWarehouse
    ? await resolveCompanyWarehouseForMerchant(getSharedPrismaClient(), merchant)
    : await ensureMerchantWarehouse(getSharedPrismaClient(), merchant);
  const scopedMerchant = {
    ...merchant,
    defaultWarehouseId: merchantWarehouse.id
  };

  return {
    merchant: scopedMerchant,
    merchantWarehouse,
    isMerchantScope: true,
    companyId: merchant.companyId,
    warehouseWhere: usesCompanyWarehouse
      ? {
          companyId: merchant.companyId,
          id: merchantWarehouse.id,
          isActive: true
        }
      : getMerchantWarehouseWhere(scopedMerchant),
    productWhere: getMerchantProductWhere(scopedMerchant),
    canEditStock: !usesCompanyWarehouse,
    stockLocation: usesCompanyWarehouse ? 'COMPANY_WAREHOUSE' : 'MERCHANT',
    stockLocationLabel: usesCompanyWarehouse ? 'في مخزن الشركة' : 'في مخزن التاجر'
  };
};

const syncRegularProductStock = async (prisma, scope, productId) => {
  if (scope.isMerchantScope) {
    return syncMerchantProductStock(prisma, scope.merchant, productId);
  }

  return syncProductStockFromInventory(prisma, {
    productId,
    companyId: scope.companyId
  });
};

// Create a lightweight product from the inventory workflow.
exports.createInventoryProduct = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (!INVENTORY_PRODUCT_ROLES.has(role)) {
      return res.status(403).json({
        success: false,
        message: 'صلاحياتك لا تسمح بإضافة منتج من المخزن'
      });
    }

    const scope = await resolveInventoryScope(req);
    const canInferCompanyFromWarehouse = role === 'SUPER_ADMIN' && !scope.companyId;
    if (!scope.companyId && !canInferCompanyFromWarehouse) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب لإضافة المنتج'
      });
    }

    const {
      name,
      sku,
      barcode,
      warehouseId,
      quantity,
      batchNumber,
      expiryDate,
      reorderPoint,
      minStock,
      maxStock,
      notes,
      images,
      variants,
    } = req.body || {};

    const productName = normalizeString(name);
    const targetWarehouseId = normalizeString(warehouseId);

    if (!productName) {
      return res.status(400).json({
        success: false,
        message: 'اسم المنتج مطلوب'
      });
    }

    if (!targetWarehouseId) {
      return res.status(400).json({
        success: false,
        message: 'اختيار المخزن مطلوب'
      });
    }

    const normalizedVariants = normalizeInventoryVariants(variants);
    const baseQuantity = parseNonNegativeInteger(quantity, 0);
    const totalQuantity = normalizedVariants.length > 0
      ? normalizedVariants.reduce((sum, variant) => sum + variant.quantity, 0)
      : baseQuantity;

    if (totalQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'الكمية يجب أن تكون أكبر من صفر'
      });
    }

    const salePrice =
      parseOptionalNumber(req.body.salePrice) ??
      parseOptionalNumber(req.body.price);
    const wholesalePrice =
      parseOptionalNumber(req.body.wholesalePrice) ??
      parseOptionalNumber(req.body.cost);
    const productPrice = salePrice ?? wholesalePrice ?? 0;
    const productSku = normalizeString(sku) || null;
    const productImages = normalizeImageList(images);
    const now = new Date();
    const nowIso = now.toISOString();
    const actorName =
      req.user?.name ||
      `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() ||
      req.user?.email ||
      'System';

    if (scope.companyId) {
      const productLimitCheck = await ensureWithinPlanLimit(scope.companyId, 'products', 1);
      if (!productLimitCheck.allowed) {
        return res.status(400).json(productLimitCheck.payload);
      }
    }

    const result = await getSharedPrismaClient().$transaction(async (prisma) => {
      const warehouse = await prisma.warehouse.findFirst({
        where: {
          id: targetWarehouseId,
          ...(canInferCompanyFromWarehouse ? {} : scope.warehouseWhere),
          isActive: true
        },
        select: {
          id: true,
          name: true,
          companyId: true,
          merchantId: true
        }
      });

      if (!warehouse) {
        const error = new Error('غير مصرح لك باستخدام هذا المخزن أو أنه غير نشط');
        error.statusCode = 403;
        throw error;
      }

      const productCompanyId = scope.companyId || warehouse.companyId;
      if (!productCompanyId) {
        const error = new Error('معرف الشركة مطلوب لإضافة المنتج');
        error.statusCode = 403;
        throw error;
      }

      if (!scope.companyId) {
        const productLimitCheck = await ensureWithinPlanLimit(productCompanyId, 'products', 1);
        if (!productLimitCheck.allowed) {
          const error = new Error(productLimitCheck.payload?.message || 'تم تجاوز حد المنتجات المسموح به');
          error.statusCode = 400;
          error.payload = productLimitCheck.payload;
          throw error;
        }
      }

      if (productSku) {
        const existingSku = await prisma.product.findFirst({
          where: {
            companyId: productCompanyId,
            sku: productSku,
            deletedAt: null
          },
          select: { id: true }
        });

        if (existingSku) {
          const error = new Error('SKU مستخدم بالفعل داخل هذه الشركة');
          error.statusCode = 400;
          throw error;
        }
      }

      const workflowPayload = createWorkflowUpdatePayload({
        metadata: {
          source: 'inventory-intake',
          inventoryIntake: {
            createdFromInventory: true,
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            quantity: totalQuantity,
            baseQuantity,
            hasVariants: normalizedVariants.length > 0,
            salePriceProvided: salePrice !== null,
            wholesalePriceProvided: wholesalePrice !== null,
            submittedByRole: role,
            submittedByName: actorName,
            submittedAt: nowIso,
            notes: normalizeString(notes) || null,
          },
        },
        workflow: {
          status: PRODUCT_WORKFLOW_STATUSES.IN_REVIEW,
          submittedAt: nowIso,
          lastActionAt: nowIso,
          lastActionById: req.user?.id || null,
          lastActionByName: actorName,
          lastActionByRole: role,
        },
      });

      let product = await prisma.product.create({
        data: {
          name: productName,
          description: '',
          price: productPrice,
          cost: wholesalePrice,
          sku: productSku,
          barcode: normalizeString(barcode) || null,
          stock: totalQuantity,
          trackInventory: true,
          companyId: productCompanyId,
          images: productImages.length > 0 ? JSON.stringify(productImages) : null,
          mainImage: productImages[0] || null,
          metadata: workflowPayload.metadata,
          isActive: workflowPayload.isActive,
          isHidden: true,
          source: 'inventory-intake',
          updatedAt: now,
        },
        include: {
          category: true,
        },
      });

      const createdVariants = [];
      for (const variant of normalizedVariants) {
        const createdVariant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: variant.name,
            type: variant.type,
            sku: variant.sku,
            price: variant.price,
            cost: variant.cost,
            images: variant.images.length > 0 ? JSON.stringify(variant.images) : null,
            stock: variant.quantity,
            trackInventory: true,
            isActive: true,
            sortOrder: variant.sortOrder,
            metadata: JSON.stringify({
              inventoryIntake: {
                warehouseId: warehouse.id,
                quantity: variant.quantity,
                salePriceProvided: variant.price !== null,
                wholesalePriceProvided: variant.cost !== null,
              },
            }),
          },
        });
        createdVariants.push(createdVariant);
      }

      const inventory = await prisma.inventory.upsert({
        where: {
          productId_warehouseId_batchNumber: {
            productId: product.id,
            warehouseId: warehouse.id,
            batchNumber: normalizeString(batchNumber) || null,
          },
        },
        update: {
          quantity: { increment: totalQuantity },
          available: { increment: totalQuantity },
          reorderPoint: parseNonNegativeInteger(reorderPoint, 0),
          minStock: parseNonNegativeInteger(minStock, 0),
          maxStock: maxStock === undefined || maxStock === null || maxStock === ''
            ? undefined
            : parseNonNegativeInteger(maxStock, 0),
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          updatedAt: now,
        },
        create: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: totalQuantity,
          available: totalQuantity,
          reserved: 0,
          reorderPoint: parseNonNegativeInteger(reorderPoint, 0),
          minStock: parseNonNegativeInteger(minStock, 0),
          maxStock: maxStock === undefined || maxStock === null || maxStock === ''
            ? null
            : parseNonNegativeInteger(maxStock, 0),
          batchNumber: normalizeString(batchNumber) || null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        },
      });

      const movement = await prisma.stockMovement.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          type: 'IN',
          reason: 'PURCHASE',
          quantity: totalQuantity,
          reference: `inventory-product-${product.id}`,
          notes: normalizeString(notes) || 'إضافة منتج جديد من المخزن',
          batchNumber: normalizeString(batchNumber) || null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          isApproved: true,
          userId: req.user?.id || null,
          userName: actorName,
          approvedBy: req.user?.id || null,
          approvedAt: now,
        },
      });

      if (scope.isMerchantScope) {
        const merchantProduct = await prisma.merchantProduct.create({
          data: {
            merchantId: scope.merchant.id,
            productId: product.id,
            merchantSku: productSku,
            merchantPrice: productPrice,
            stock: totalQuantity,
            syncEnabled: true,
            isActive: true,
          },
        });

        product = await prisma.product.update({
          where: { id: product.id },
          data: {
            isDropshipped: true,
            merchantProductId: merchantProduct.id,
            basePrice: productPrice,
          },
          include: {
            category: true,
          },
        });
      }

      const productScope = scope.companyId
        ? scope
        : { ...scope, companyId: productCompanyId };
      const syncedProduct = await syncRegularProductStock(prisma, productScope, product.id);

      return {
        product: scope.isMerchantScope ? product : (syncedProduct || product),
        inventory,
        movement,
        variants: createdVariants,
      };
    });

    if (scope.isMerchantScope) {
      await merchantService.updateProductDropshippingPrice(result.product.id).catch((error) => {
        console.error(`❌ Failed to update merchant dropshipping price for ${result.product.id}:`, error.message);
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم إضافة المنتج من المخزن وإرساله للمراجعة',
      data: {
        ...decorateProductWithWorkflow(result.product),
        inventory: result.inventory,
        stockMovement: result.movement,
        productVariants: result.variants,
      },
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    const isExpectedBusinessError = statusCode < 500;
    const logMethod = isExpectedBusinessError ? console.warn : console.error;
    logMethod(
      isExpectedBusinessError
        ? '⚠️ [INVENTORY] Product creation rejected:'
        : '❌ [INVENTORY] Error creating inventory product:',
      error,
    );

    res.status(statusCode).json({
      ...(error?.payload || { success: false }),
      message: isExpectedBusinessError
        ? error.payload?.message || error.message
        : 'فشل في إضافة المنتج من المخزن',
      error: error.message,
    });
  }
};

// Get all inventory items with filters
exports.getInventory = async (req, res) => {
  try {
    const { warehouseId, lowStock, outOfStock, search } = req.query;
    const scope = await resolveInventoryScope(req);

    if (scope.isMerchantScope && warehouseId && scope.canEditStock) {
      await assertMerchantWarehouseAccess(getSharedPrismaClient(), scope.merchant, warehouseId);
    }
    if (
      scope.isMerchantScope &&
      warehouseId &&
      !scope.canEditStock &&
      warehouseId !== scope.merchantWarehouse?.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بعرض هذا المخزن'
      });
    }

    // Build the WHERE clause for Products
    const productWhere = {
      ...scope.productWhere,
      deletedAt: null
    };

    if (search) {
      productWhere.OR = [
        { name: { contains: search } },
        { sku: { contains: search } }
      ];
    }

    // Build the WHERE clause for Inventory (nested)
    const inventoryWhere = {
      warehouse: scope.warehouseWhere
    };
    if (warehouseId) {
      inventoryWhere.warehouseId = warehouseId;
    }

    // If we are filtering by stock status, we might need a different approach 
    // but for now let's fetch products and their related inventory
    const products = await getSharedPrismaClient().product.findMany({
      where: productWhere,
      include: {
        inventories: {
          where: inventoryWhere,
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                location: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transform products into a flat inventory-like structure for the frontend
    // If a product has no inventory records, we show it with 0 quantities
    const flatInventory = [];

    products.forEach(product => {
      // If product has inventory records, create entries for each
      if (product.inventories && product.inventories.length > 0) {
        product.inventories.forEach(inv => {
          flatInventory.push({
            id: inv.id,
            productId: product.id,
            warehouseId: inv.warehouseId,
            quantity: inv.quantity,
            available: inv.available,
            reserved: inv.reserved,
            minStock: inv.minStock,
            reorderPoint: inv.reorderPoint,
            batchNumber: inv.batchNumber,
            expiryDate: inv.expiryDate,
            updatedAt: inv.updatedAt,
            products: {
              id: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
              images: product.images
            },
            warehouses: inv.warehouse,
            canEditStock: scope.canEditStock,
            stockLocation: scope.stockLocation,
            stockLocationLabel: scope.stockLocationLabel
          });
        });
      } else {
        const virtualWarehouse = scope.isMerchantScope
          ? scope.merchantWarehouse
          : null;
        // Product exists but no stock records yet - add a "virtual" entry
        flatInventory.push({
          id: `virtual-${product.id}`,
          productId: product.id,
          warehouseId: warehouseId || virtualWarehouse?.id || scope.merchant?.defaultWarehouseId || 'INITIAL',
          quantity: 0,
          available: 0,
          reserved: 0,
          minStock: 0,
          reorderPoint: 0,
          batchNumber: null,
          expiryDate: null,
          updatedAt: product.updatedAt,
          products: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            images: product.images
          },
          warehouses: {
            id: virtualWarehouse?.id || 'NONE',
            name: virtualWarehouse?.name || 'لم يتم التخصيص',
            location: virtualWarehouse?.location || ''
          },
          canEditStock: scope.canEditStock,
          stockLocation: scope.stockLocation,
          stockLocationLabel: scope.stockLocationLabel
        });
      }
    });

    // Post-aggregation filtering for stock status (if requested)
    let filteredResults = flatInventory;
    if (lowStock === 'true') {
      filteredResults = filteredResults.filter(item => item.available <= (item.reorderPoint || 0));
    }
    if (outOfStock === 'true') {
      filteredResults = filteredResults.filter(item => item.available === 0);
    }

    res.json({
      success: true,
      data: filteredResults
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب المخزون',
      error: error.message
    });
  }
};

// Get inventory alerts (low stock / out of stock)
exports.getAlerts = async (req, res) => {
  try {
    const scope = await resolveInventoryScope(req);
    const inventories = await getSharedPrismaClient().inventory.findMany({
      where: {
        warehouse: scope.warehouseWhere,
        product: {
          ...scope.productWhere,
          deletedAt: null
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const normalizedItems = inventories.map((item) => ({
      id: item.id,
      productId: item.productId,
      warehouseId: item.warehouseId,
      quantity: item.quantity,
      available: item.available,
      minStock: item.minStock,
      reorderPoint: item.reorderPoint,
      productName: item.product?.name || "منتج بدون اسم",
      sku: item.product?.sku || "",
      warehouseName: item.warehouse?.name || "مخزن غير معروف",
      updatedAt: item.updatedAt,
    }));

    const lowStockItems = normalizedItems
      .filter(
        (item) =>
          Number(item.available || 0) > 0 &&
          Number(item.available || 0) <= Number(item.reorderPoint || 0),
      )
      .sort((a, b) => Number(a.available || 0) - Number(b.available || 0));

    const outOfStockItems = normalizedItems.filter(
      (item) => Number(item.available || 0) === 0,
    );

    res.json({
      success: true,
      data: {
        lowStock: lowStockItems,
        outOfStock: outOfStockItems,
        total: lowStockItems.length + outOfStockItems.length
      }
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب التنبيهات',
      error: error.message
    });
  }
};

// Update stock quantity
exports.updateStock = async (req, res) => {
  try {
    const { productId, warehouseId, quantity, type, reason, notes, batchNumber, expiryDate, isApproved = true } = req.body;
    const companyId = req.user.companyId;
    const scope = await resolveInventoryScope(req);
    const prisma = getSharedPrismaClient();
    const movementType = normalizeString(type).toUpperCase();
    const movementDirection = getStockMovementDirection(movementType);
    const persistedMovementType = getPersistedStockMovementType(movementType);
    const movementReason = normalizeStockMovementReason(reason, movementType);
    const quantityNumber = parseNonNegativeInteger(quantity, 0);
    const actorName =
      req.user?.name ||
      `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() ||
      req.user?.email ||
      null;

    if (!productId || !warehouseId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد المنتج والمخزن'
      });
    }

    if (!movementDirection) {
      return res.status(400).json({
        success: false,
        message: 'نوع حركة المخزون غير صالح'
      });
    }

    if (quantityNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: 'الكمية يجب أن تكون أكبر من صفر'
      });
    }

    if (scope.isMerchantScope && !scope.canEditStock) {
      return res.status(403).json({
        success: false,
        message: 'رصيد هذا المنتج يدار من مخزن الشركة، ويمكن للتاجر المتابعة فقط'
      });
    }

    if (scope.isMerchantScope) {
      await assertMerchantProductAccess(prisma, scope.merchant, productId);
      await assertMerchantWarehouseAccess(prisma, scope.merchant, warehouseId);
    }

    // Verify warehouse belongs to company
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        ...scope.warehouseWhere
      }
    });

    if (!warehouse) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث هذا المخزن'
      });
    }

    const normalizedBatchNumber = normalizeBatchNumber(batchNumber);
    const result = await prisma.$transaction(async (tx) => {
      let updatedInventory = null;
      let inventory = await findInventoryByProductWarehouseBatch(tx, {
        productId,
        warehouseId,
        batchNumber: normalizedBatchNumber
      });

      if (movementDirection === 'OUT' && Number(inventory?.available || 0) < quantityNumber) {
        throw createInventoryValidationError(
          `الكمية المطلوبة أكبر من الرصيد المتاح. المتاح حالياً ${Number(inventory?.available || 0)} قطعة`
        );
      }

      // Only update Inventory counts if approved
      if (isApproved) {
        // Get or create inventory record (including batch)
        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              productId,
              warehouseId,
              batchNumber: normalizedBatchNumber,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
              quantity: 0,
              available: 0,
              reserved: 0
            }
          });
        }

        // Calculate new quantity based on type
        let newQuantity = Number(inventory.quantity || 0);
        let newAvailable = Number(inventory.available || 0);

        if (movementDirection === 'IN') {
          newQuantity += quantityNumber;
          newAvailable += quantityNumber;
        } else if (movementDirection === 'OUT') {
          newQuantity -= quantityNumber;
          newAvailable -= quantityNumber;
        }

        // Update inventory
        updatedInventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: Math.max(0, newQuantity),
            available: Math.max(0, newAvailable),
            updatedAt: new Date()
          },
          include: {
            product: true,
            warehouse: true
          }
        });
      }

      // Create stock movement record (always created, but flagged if not approved)
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          warehouseId,
          type: persistedMovementType,
          reason: movementReason,
          quantity: quantityNumber,
          notes,
          batchNumber: normalizedBatchNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          isApproved,
          userId: req.user.id,
          userName: actorName,
          approvedBy: isApproved ? req.user.id : null,
          approvedAt: isApproved ? new Date() : null
        }
      });

      return { inventory: updatedInventory, movement };
    });

    await syncRegularProductStock(prisma, scope, productId);

    res.json({
      success: true,
      message: isApproved ? 'تم تحديث المخزون بنجاح' : 'تم تسجيل الطلب بانتظار الموافقة',
      data: {
        inventory: result.inventory,
        movement: result.movement
      }
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      console.warn('⚠️ [INVENTORY] Stock update validation failed:', error.message);
    } else {
      console.error('❌ [INVENTORY] Error updating stock:', error);
    }
    res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : 'فشل في تحديث المخزون',
      error: error.message
    });
  }
};

// Get inventory for specific product
exports.getProductInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const companyId = req.user.companyId;
    const scope = await resolveInventoryScope(req);

    if (scope.isMerchantScope) {
      await assertMerchantProductAccess(getSharedPrismaClient(), scope.merchant, productId);
    }

    const inventory = await getSharedPrismaClient().inventory.findMany({
      where: {
        productId,
        warehouse: scope.warehouseWhere
      },
      include: {
        warehouse: true,
        product: true
      }
    });

    // Calculate totals
    const totals = inventory.reduce((acc, item) => ({
      quantity: acc.quantity + item.quantity,
      available: acc.available + item.available,
      reserved: acc.reserved + item.reserved
    }), { quantity: 0, available: 0, reserved: 0 });

    res.json({
      success: true,
      data: {
        inventory,
        totals
      }
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching product inventory:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب مخزون المنتج',
      error: error.message
    });
  }
};

// Get stock movements
exports.getStockMovements = async (req, res) => {
  try {
    const { productId, warehouseId, type, startDate, endDate } = req.query;
    const scope = await resolveInventoryScope(req);

    const where = {
      warehouse: scope.warehouseWhere,
      product: {
        ...scope.productWhere,
        deletedAt: null
      }
    };

    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (scope.isMerchantScope) {
      if (productId) {
        await assertMerchantProductAccess(getSharedPrismaClient(), scope.merchant, productId);
      }
      if (warehouseId) {
        await assertMerchantWarehouseAccess(getSharedPrismaClient(), scope.merchant, warehouseId);
      }
    }

    const movements = await getSharedPrismaClient().stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            sku: true
          }
        },
        warehouse: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    res.json({
      success: true,
      data: movements
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching movements:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب حركات المخزون',
      error: error.message
    });
  }
};

// Approve a pending stock movement
exports.approveMovement = async (req, res) => {
  try {
    const { movementId } = req.body;
    const companyId = req.user.companyId;
    const scope = await resolveInventoryScope(req);

    // 1. Find the movement
    const movement = await getSharedPrismaClient().stockMovement.findUnique({
      where: { id: movementId },
      include: {
        warehouse: true
      }
    });

    if (
      !movement ||
      !movement.warehouse ||
      movement.warehouse.companyId !== companyId ||
      (scope.isMerchantScope && movement.warehouse.merchantId !== scope.merchant.id)
    ) {
      return res.status(404).json({ success: false, message: 'الحركة غير موجودة' });
    }

    if (scope.isMerchantScope) {
      await assertMerchantProductAccess(
        getSharedPrismaClient(),
        scope.merchant,
        movement.productId
      );
    }

    if (movement.isApproved) {
      return res.status(400).json({ success: false, message: 'هذه الحركة معتمدة بالفعل' });
    }

    // 2. Perform atomic transaction: Approve and Update Inventory
    const result = await getSharedPrismaClient().$transaction(async (prisma) => {
      const movementDirection = getStockMovementDirection(movement.type);
      if (!movementDirection) {
        throw createInventoryValidationError('نوع حركة المخزون غير صالح');
      }

      // Get or create inventory record
      let inventory = await findInventoryByProductWarehouseBatch(prisma, {
        productId: movement.productId,
        warehouseId: movement.warehouseId,
        batchNumber: movement.batchNumber,
      });

      if (movementDirection === 'OUT' && Number(inventory?.available || 0) < Number(movement.quantity || 0)) {
        throw createInventoryValidationError(
          `لا يمكن اعتماد الحركة لأن الكمية أكبر من الرصيد المتاح. المتاح حالياً ${Number(inventory?.available || 0)} قطعة`
        );
      }

      if (!inventory) {
        inventory = await prisma.inventory.create({
          data: {
            productId: movement.productId,
            warehouseId: movement.warehouseId,
            batchNumber: normalizeBatchNumber(movement.batchNumber),
            expiryDate: movement.expiryDate || null,
            quantity: 0,
            available: 0,
            reserved: 0
          }
        });
      }

      // Calculate new quantity
      let newQuantity = Number(inventory.quantity || 0);
      let newAvailable = Number(inventory.available || 0);
      const movementQuantity = Number(movement.quantity || 0);

      if (movementDirection === 'IN') {
        newQuantity += movementQuantity;
        newAvailable += movementQuantity;
      } else if (movementDirection === 'OUT') {
        newQuantity -= movementQuantity;
        newAvailable -= movementQuantity;
      }

      // Update inventory
      const updatedInventory = await prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: Math.max(0, newQuantity),
          available: Math.max(0, newAvailable),
          updatedAt: new Date()
        }
      });

      // Update movement
      const updatedMovement = await prisma.stockMovement.update({
        where: { id: movement.id },
        data: {
          isApproved: true,
          approvedBy: req.user.id,
          approvedAt: new Date()
        }
      });

      return { updatedInventory, updatedMovement };
    });

    await syncRegularProductStock(getSharedPrismaClient(), scope, movement.productId);

    res.json({
      success: true,
      message: 'تم اعتماد الحركة وتحديث المخزون',
      data: result
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      console.warn('⚠️ [INVENTORY] Movement approval validation failed:', error.message);
    } else {
      console.error('❌ [INVENTORY] Error approving movement:', error);
    }
    res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : 'فشل في اعتماد الحركة',
      error: error.message
    });
  }
};

// Transfer stock between warehouses
exports.transferStock = async (req, res) => {
  try {
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes, batchNumber } = req.body;
    const companyId = req.user.companyId;
    const scope = await resolveInventoryScope(req);
    const quantityNumber = Number(quantity);
    const actorName =
      req.user?.name ||
      `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() ||
      req.user?.email ||
      'System';

    if (scope.isMerchantScope && !scope.canEditStock) {
      return res.status(403).json({
        success: false,
        message: 'نقل هذا المخزون يدار من مخزن الشركة، ويمكن للتاجر المتابعة فقط'
      });
    }

    if (!productId || !fromWarehouseId || !toWarehouseId) {
      return res.status(400).json({
        success: false,
        message: 'المنتج ومخزن المصدر والوجهة مطلوبون'
      });
    }

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: 'الكمية يجب أن تكون أكبر من صفر'
      });
    }

    if (fromWarehouseId === toWarehouseId) {
      return res.status(400).json({ success: false, message: 'مخزن المصدر والوجهة متطابقان' });
    }

    const [fromWarehouse, toWarehouse] = await Promise.all([
      getSharedPrismaClient().warehouse.findFirst({
        where: { id: fromWarehouseId, ...scope.warehouseWhere },
        select: { id: true }
      }),
      getSharedPrismaClient().warehouse.findFirst({
        where: { id: toWarehouseId, ...scope.warehouseWhere },
        select: { id: true }
      })
    ]);

    if (!fromWarehouse || !toWarehouse) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالنقل بين هذه المخازن'
      });
    }

    if (scope.isMerchantScope) {
      await assertMerchantProductAccess(getSharedPrismaClient(), scope.merchant, productId);
    }

    // Perform atomic transaction for transfer
    const result = await getSharedPrismaClient().$transaction(async (prisma) => {
      // 1. Deduct from source
      const sourceInv = await prisma.inventory.findFirst({
        where: {
          productId,
          warehouseId: fromWarehouseId,
          batchNumber: batchNumber || null
        }
      });

      if (!sourceInv) {
        const error = new Error('المنتج غير موجود في مخزن المصدر');
        error.statusCode = 404;
        throw error;
      }

      if (sourceInv.available < quantityNumber) {
        const error = new Error('مخزون غير كاف في مخزن المصدر');
        error.statusCode = 400;
        throw error;
      }

      await prisma.inventory.update({
        where: { id: sourceInv.id },
        data: {
          quantity: { decrement: quantityNumber },
          available: { decrement: quantityNumber }
        }
      });

      // 2. Add to destination
      let destInv = await prisma.inventory.findFirst({
        where: {
          productId,
          warehouseId: toWarehouseId,
          batchNumber: batchNumber || null
        }
      });

      if (!destInv) {
        destInv = await prisma.inventory.create({
          data: {
            productId,
            warehouseId: toWarehouseId,
            batchNumber: batchNumber || null,
            expiryDate: sourceInv.expiryDate || null,
            quantity: quantityNumber,
            available: quantityNumber,
            reserved: 0
          }
        });
      } else {
        await prisma.inventory.update({
          where: { id: destInv.id },
          data: {
            quantity: { increment: quantityNumber },
            available: { increment: quantityNumber }
          }
        });
      }

      // 3. Create movement logs
      await prisma.stockMovement.create({
        data: {
          productId,
          warehouseId: fromWarehouseId,
          type: 'TRANSFER',
          reason: 'TRANSFER',
          quantity: quantityNumber,
          notes: `نقل إلى الوجهة. ${notes || ''}`,
          batchNumber: batchNumber || null,
          isApproved: true,
          userId: req.user.id,
          userName: actorName
        }
      });

      await prisma.stockMovement.create({
        data: {
          productId,
          warehouseId: toWarehouseId,
          type: 'TRANSFER',
          reason: 'TRANSFER',
          quantity: quantityNumber,
          notes: `استلام من المصدر. ${notes || ''}`,
          batchNumber: batchNumber || null,
          isApproved: true,
          userId: req.user.id,
          userName: actorName
        }
      });

      return { success: true };
    });

    await syncRegularProductStock(getSharedPrismaClient(), scope, productId);

    res.json({
      success: true,
      message: 'تم نقل المخزون بنجاح'
    });
  } catch (error) {
    const isExpectedBusinessError = Boolean(error?.statusCode) && error.statusCode < 500;
    const logMethod = isExpectedBusinessError ? console.warn : console.error;
    const logPrefix = isExpectedBusinessError
      ? '⚠️ [INVENTORY] Transfer rejected:'
      : '❌ [INVENTORY] Error transferring stock:';

    logMethod(logPrefix, error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'فشل في نقل المخزون',
      error: error.message
    });
  }
};

