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
const {
  ensureCompanyPrimaryWarehouse,
  autoHealProductInventory,
} = require('../services/inventorySyncService');
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
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
};

const parseOptionalNonNegativeInteger = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
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
    const { warehouseId, lowStock, outOfStock, search, productIds } = req.query;
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

    if (productIds) {
      const ids = productIds.split(',').map(id => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        productWhere.id = { in: ids };
      }
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

    let companyPrimaryWarehouse = null;
    if (!scope.isMerchantScope && scope.companyId) {
      try {
        companyPrimaryWarehouse = await ensureCompanyPrimaryWarehouse(
          getSharedPrismaClient(),
          scope.companyId
        );
      } catch (whErr) {
        console.error('⚠️ [INVENTORY] Failed to ensure primary warehouse:', whErr.message);
      }
    }

    for (const product of products) {
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
            cost: inv.cost ? Number(inv.cost) : (product.cost ? Number(product.cost) : null),
            products: {
              id: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
              cost: product.cost,
              images: product.images
            },
            warehouses: inv.warehouse,
            canEditStock: scope.canEditStock,
            stockLocation: scope.stockLocation,
            stockLocationLabel: scope.stockLocationLabel
          });
        });
      } else {
        let healedInv = null;
        if (
          !scope.isMerchantScope &&
          (product.stock || 0) > 0 &&
          (!warehouseId || warehouseId === companyPrimaryWarehouse?.id)
        ) {
          try {
            healedInv = await autoHealProductInventory(getSharedPrismaClient(), {
              product,
              companyId: product.companyId || scope.companyId
            });
          } catch (healErr) {
            console.error(`⚠️ [INVENTORY] Auto-healing failed for product ${product.id}:`, healErr.message);
          }
        }

        if (healedInv) {
          flatInventory.push({
            id: healedInv.id,
            productId: product.id,
            warehouseId: healedInv.warehouseId,
            quantity: healedInv.quantity,
            available: healedInv.available,
            reserved: healedInv.reserved,
            minStock: healedInv.minStock,
            reorderPoint: healedInv.reorderPoint,
            batchNumber: healedInv.batchNumber,
            expiryDate: healedInv.expiryDate,
            updatedAt: healedInv.updatedAt,
            cost: healedInv.cost ? Number(healedInv.cost) : (product.cost ? Number(product.cost) : null),
            products: {
              id: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
              cost: product.cost,
              images: product.images
            },
            warehouses: healedInv.warehouse || {
              id: companyPrimaryWarehouse?.id || healedInv.warehouseId,
              name: companyPrimaryWarehouse?.name || 'المخزن الرئيسي',
              location: companyPrimaryWarehouse?.location || ''
            },
            canEditStock: scope.canEditStock,
            stockLocation: scope.stockLocation,
            stockLocationLabel: scope.stockLocationLabel
          });
        } else {
          const virtualWarehouse = scope.isMerchantScope
            ? scope.merchantWarehouse
            : companyPrimaryWarehouse;
          const fallbackWarehouseName = scope.isMerchantScope
            ? 'لم يتم التخصيص'
            : (companyPrimaryWarehouse?.name || 'المخزن الرئيسي');

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
            cost: product.cost ? Number(product.cost) : null,
            products: {
              id: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
              cost: product.cost,
              images: product.images
            },
            warehouses: {
              id: virtualWarehouse?.id || 'NONE',
              name: virtualWarehouse?.name || fallbackWarehouseName,
              location: virtualWarehouse?.location || ''
            },
            canEditStock: scope.canEditStock,
            stockLocation: scope.stockLocation,
            stockLocationLabel: scope.stockLocationLabel
          });
        }
      }
    }

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
    const { productId, warehouseId, quantity, type, reason, notes, batchNumber, expiryDate, isApproved = true, cost } = req.body;
    const companyId = req.user.companyId;
    const scope = await resolveInventoryScope(req);
    const prisma = getSharedPrismaClient();
    const movementType = normalizeString(type).toUpperCase();
    const movementDirection = getStockMovementDirection(movementType);
    const persistedMovementType = getPersistedStockMovementType(movementType);
    const movementReason = normalizeStockMovementReason(reason, movementType);
    const quantityNumber = parseNonNegativeInteger(quantity, 0);
    const parsedCost = parseOptionalNumber(cost);
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
              reserved: 0,
              ...(parsedCost !== null && { cost: parsedCost }),
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
            ...(parsedCost !== null && { cost: parsedCost }),
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
          cost: parsedCost !== null ? parsedCost : (inventory?.cost || null),
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

    if (req.query.search) {
      const search = String(req.query.search).trim();
      where.product = {
        ...(where.product || {}),
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

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

const normalizeReorderView = (value) => {
  const normalized = normalizeString(value).toLowerCase();
  if (['warehouse', 'preorder'].includes(normalized)) return normalized;
  return 'product';
};

const normalizeReorderSortBy = (value) => {
  const normalized = normalizeString(value).toLowerCase();
  const allowed = new Set(['name', 'available', 'reserved', 'reorderPoint', 'daysUntilStockout', 'suggestedReorder']);
  return allowed.has(normalized) ? normalized : 'available';
};

const resolveProductImage = (product) => {
  const candidates = [];
  if (typeof product.mainImage === 'string' && product.mainImage.trim()) {
    candidates.push(product.mainImage.trim());
  }
  if (typeof product.images === 'string' && product.images.trim()) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          const value = typeof item === 'string' ? item : item?.fullUrl || item?.url || '';
          if (value) candidates.push(value);
        });
      } else if (typeof parsed === 'string' && parsed.trim()) {
        candidates.push(parsed.trim());
      }
    } catch {
      product.images.split(',').forEach((part) => {
        const trimmed = part.trim();
        if (trimmed) candidates.push(trimmed);
      });
    }
  }
  return candidates[0] || null;
};

const resolveReorderStatus = ({ available, reorderPoint, trackInventory }) => {
  if (trackInventory === false) return 'untracked';
  if (available === 0) return 'out';
  if (reorderPoint > 0 && available <= reorderPoint) return 'low';
  return 'safe';
};

const resolveReorderDays = ({ available, dailyAvgSales, status }) => {
  if (status === 'out') return 0;
  if (dailyAvgSales > 0) return Math.floor(available / dailyAvgSales);
  return 999;
};

const resolveReorderUrgency = (daysUntilStockout) => {
  if (daysUntilStockout <= 7) return 'critical';
  if (daysUntilStockout <= 14) return 'warning';
  if (daysUntilStockout <= 30) return 'moderate';
  return 'safe';
};

const buildReorderSummaryRow = (product, inventoryRecords, salesStats) => {
  const totalAvailable = inventoryRecords.reduce((sum, record) => sum + Number(record.available || 0), 0);
  const totalReserved = inventoryRecords.reduce((sum, record) => sum + Number(record.reserved || 0), 0);
  const totalQuantity = inventoryRecords.reduce((sum, record) => sum + Number(record.quantity || 0), 0);
  const effectiveReorderPoint = Math.max(0, ...inventoryRecords.map((record) => Number(record.reorderPoint || 0)));
  const effectiveMinStock = Math.max(0, ...inventoryRecords.map((record) => Number(record.minStock || 0)));

  const sales = salesStats?.get(String(product.id)) || { totalSold: 0 };
  const dailyAvgSales = sales.totalSold > 0 ? sales.totalSold / 30 : 0;
  const status = resolveReorderStatus({
    available: totalAvailable,
    reorderPoint: effectiveReorderPoint,
    trackInventory: product.trackInventory !== false,
  });
  const daysUntilStockout = resolveReorderDays({
    available: totalAvailable,
    dailyAvgSales,
    status,
  });
  const suggestedReorder = Math.ceil(dailyAvgSales * 30);

  return {
    productId: product.id,
    name: product.name,
    sku: product.sku || '',
    price: Number(product.price || 0),
    cost: Number(product.cost || 0),
    image: resolveProductImage(product),
    categoryName: product.category?.name || '',
    trackInventory: product.trackInventory !== false,
    isPreOrder: Boolean(product.isPreOrder),
    preOrderDate: product.preOrderDate || null,
    preOrderMessage: product.preOrderMessage || '',
    status,
    urgency: resolveReorderUrgency(daysUntilStockout),
    available: totalAvailable,
    reserved: totalReserved,
    quantity: totalQuantity,
    reorderPoint: effectiveReorderPoint,
    minStock: effectiveMinStock,
    dailyAvgSales: Number(dailyAvgSales.toFixed(2)),
    daysUntilStockout,
    suggestedReorder,
    warehouses: inventoryRecords.map((record) => ({
      inventoryId: record.id,
      warehouseId: record.warehouseId,
      warehouseName: record.warehouse?.name || '',
      available: Number(record.available || 0),
      reserved: Number(record.reserved || 0),
      quantity: Number(record.quantity || 0),
      reorderPoint: Number(record.reorderPoint || 0),
      minStock: Number(record.minStock || 0),
      batchNumber: record.batchNumber || null,
    })),
  };
};

const buildReorderWarehouseRow = (record, product, salesStats) => {
  const available = Number(record.available || 0);
  const reorderPoint = Number(record.reorderPoint || 0);
  const sales = salesStats?.get(String(product.id)) || { totalSold: 0 };
  const dailyAvgSales = sales.totalSold > 0 ? sales.totalSold / 30 : 0;
  const status = resolveReorderStatus({
    available,
    reorderPoint,
    trackInventory: product.trackInventory !== false,
  });
  const daysUntilStockout = resolveReorderDays({
    available,
    dailyAvgSales,
    status,
  });

  return {
    inventoryId: record.id,
    productId: product.id,
    name: product.name,
    sku: product.sku || '',
    price: Number(product.price || 0),
    cost: Number(product.cost || 0),
    image: resolveProductImage(product),
    categoryName: product.category?.name || '',
    trackInventory: product.trackInventory !== false,
    isPreOrder: Boolean(product.isPreOrder),
    preOrderDate: product.preOrderDate || null,
    status,
    urgency: resolveReorderUrgency(daysUntilStockout),
    warehouseId: record.warehouseId,
    warehouseName: record.warehouse?.name || '',
    batchNumber: record.batchNumber || null,
    available,
    reserved: Number(record.reserved || 0),
    quantity: Number(record.quantity || 0),
    reorderPoint,
    minStock: Number(record.minStock || 0),
    dailyAvgSales: Number(dailyAvgSales.toFixed(2)),
    daysUntilStockout,
  };
};

const buildReorderSalesStats = async (prisma, companyId, productIds) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orderIds = await prisma.order.findMany({
    where: {
      companyId,
      createdAt: { gte: thirtyDaysAgo },
      status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'] },
    },
    select: { id: true },
  });

  if (orderIds.length === 0) return new Map();

  const orderItems = await prisma.orderItem.findMany({
    where: {
      orderId: { in: orderIds.map((order) => order.id) },
      productId: { in: productIds },
    },
    select: { productId: true, quantity: true },
  });

  const statsByProduct = new Map();
  orderItems.forEach((item) => {
    const key = String(item.productId);
    const current = statsByProduct.get(key) || { totalSold: 0 };
    current.totalSold += Number(item.quantity || 0);
    statsByProduct.set(key, current);
  });

  return statsByProduct;
};

// إدارة نقاط إعادة الطلب / عجز المخزون (مجمع أو بالمخزن أو للطلب المسبق)
exports.getReorderPoints = async (req, res) => {
  try {
    const scope = await resolveInventoryScope(req);
    const view = normalizeReorderView(req.query.view);
    const search = normalizeString(req.query.search).toLowerCase();
    const categoryId = normalizeString(req.query.categoryId);
    const stockFilter = normalizeString(req.query.stockFilter).toLowerCase();
    const warehouseId = normalizeString(req.query.warehouseId);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const sortBy = normalizeReorderSortBy(req.query.sortBy);
    const sortDir = normalizeString(req.query.sortDir).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const inventoryWhere = {
      warehouse: {
        ...scope.warehouseWhere,
        ...(warehouseId ? { id: warehouseId } : {}),
      },
    };

    const productWhere = {
      ...scope.productWhere,
      deletedAt: null,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(categoryId ? { categoryId } : {}),
    };

    const products = await getSharedPrismaClient().product.findMany({
      where: productWhere,
      include: {
        inventories: {
          where: inventoryWhere,
          include: {
            warehouse: { select: { id: true, name: true } },
          },
        },
        category: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // فقط المنتجات ذات سجلات مخزون تظهر في عرض المخزن؛ باقي العروض تعرض كل المنتجات
    // (المنتجات بلا سجلات تظهر بكمية صفر مثل صفحة المخزون الحالية).
    const inventoryRecords = products.flatMap((product) =>
      product.inventories.map((record) => ({
        ...record,
        product,
      })),
    );

    const groupedByProduct = new Map();
    products.forEach((product) => {
      groupedByProduct.set(String(product.id), {
        product,
        records: product.inventories,
      });
    });

    const productIds = products.map((product) => String(product.id));
    const salesStats = await buildReorderSalesStats(
      getSharedPrismaClient(),
      scope.companyId,
      productIds,
    );

    let rows = [];
    if (view === 'warehouse') {
      rows = inventoryRecords.map((record) =>
        buildReorderWarehouseRow(record, record.product, salesStats),
      );
    } else if (view === 'preorder') {
      rows = Array.from(groupedByProduct.entries())
        .map(([productId, entry]) => buildReorderSummaryRow(entry.product, entry.records, salesStats))
        .filter((row) => row.isPreOrder);
    } else {
      rows = Array.from(groupedByProduct.entries()).map(([productId, entry]) =>
        buildReorderSummaryRow(entry.product, entry.records, salesStats),
      );
    }

    const summaryTotal = rows.length;
    const lowStockCount = rows.filter((row) => row.status === 'low').length;
    const outOfStockCount = rows.filter((row) => row.status === 'out').length;
    const preOrderCount = rows.filter((row) => row.isPreOrder).length;
    const untrackedCount = rows.filter((row) => row.status === 'untracked').length;
    const atRiskRows = rows.filter((row) => row.status === 'low' || row.status === 'out');
    const atRiskValue = atRiskRows.reduce((sum, row) => {
      const unitPrice = Number(row.price || 0);
      const gap = Math.max(0, (row.reorderPoint || 0) - row.available);
      return sum + gap * unitPrice;
    }, 0);

    if (stockFilter && stockFilter !== 'all') {
      if (stockFilter === 'low') rows = rows.filter((row) => row.status === 'low');
      else if (stockFilter === 'out') rows = rows.filter((row) => row.status === 'out');
      else if (stockFilter === 'safe') rows = rows.filter((row) => row.status === 'safe');
      else if (stockFilter === 'untracked') rows = rows.filter((row) => row.status === 'untracked');
      else if (stockFilter === 'preorder') rows = rows.filter((row) => row.isPreOrder);
    }

    const sortAccessors = {
      name: (row) => String(row.name || '').toLowerCase(),
      available: (row) => Number(row.available || 0),
      reserved: (row) => Number(row.reserved || 0),
      reorderPoint: (row) => Number(row.reorderPoint || 0),
      daysUntilStockout: (row) => Number(row.daysUntilStockout ?? 999),
      suggestedReorder: (row) => Number(row.suggestedReorder || 0),
    };
    const accessor = sortAccessors[sortBy] || sortAccessors.available;
    rows.sort((left, right) => {
      const leftValue = accessor(left);
      const rightValue = accessor(right);
      const comparison =
        typeof leftValue === 'number' ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue));
      return sortDir === 'asc' ? comparison : -comparison;
    });

    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);
    const startIndex = (safePage - 1) * limit;
    const paginatedRows = rows.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: {
        items: paginatedRows,
        pagination: { total, page: safePage, limit, pages },
        summary: {
          totalProducts: summaryTotal,
          lowStockCount,
          outOfStockCount,
          preOrderCount,
          untrackedCount,
          safeCount: summaryTotal - lowStockCount - outOfStockCount - untrackedCount,
          atRiskValue: Number(atRiskValue.toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching reorder points:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب نقاط إعادة الطلب',
      error: error.message,
    });
  }
};

// تحديث نقطة إعادة الطلب لمنتج كامل (كل المخازن) أو لسجل مخزن واحد
exports.updateReorderPoint = async (req, res) => {
  try {
    const scope = await resolveInventoryScope(req);
    const prisma = getSharedPrismaClient();
    const { reorderPoint, minStock } = req.body || {};
    const { inventoryId, productId } = req.params;
    const parsedReorderPoint = parseOptionalNonNegativeInteger(reorderPoint);
    const parsedMinStock = parseOptionalNonNegativeInteger(minStock);

    if (parsedReorderPoint === undefined && parsedMinStock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'حدد نقطة إعادة الطلب أو الحد الأدنى للمخزون',
      });
    }

    const inventoryWhere = {
      ...(inventoryId
        ? { id: inventoryId }
        : { productId }),
      warehouse: scope.warehouseWhere,
      product: {
        ...scope.productWhere,
        deletedAt: null,
      },
    };

    const updateData = {};
    if (parsedReorderPoint !== undefined) updateData.reorderPoint = parsedReorderPoint;
    if (parsedMinStock !== undefined) updateData.minStock = parsedMinStock;
    updateData.updatedAt = new Date();

    const result = await prisma.inventory.updateMany({
      where: inventoryWhere,
      data: updateData,
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'لا يوجد مخزون مطابق للتحديث',
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث نقطة إعادة الطلب بنجاح',
      data: { count: result.count },
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error updating reorder point:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode && error.statusCode < 500 ? error.message : 'فشل في تحديث نقطة إعادة الطلب',
      error: error.message,
    });
  }
};

// تحديث جماعي لنقاط إعادة الطلب
exports.bulkUpdateReorderPoints = async (req, res) => {
  try {
    const scope = await resolveInventoryScope(req);
    const prisma = getSharedPrismaClient();
    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'أرسل قائمة عناصر على الأقل',
      });
    }

    if (items.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'الحد الأقصى للتحديث الجماعي هو 500 عنصر',
      });
    }

    let updatedCount = 0;
    const failures = [];

    for (const item of items) {
      const { inventoryId, productId, reorderPoint, minStock } = item || {};
      const parsedReorderPoint = parseOptionalNonNegativeInteger(reorderPoint);
      const parsedMinStock = parseOptionalNonNegativeInteger(minStock);

      if (parsedReorderPoint === undefined && parsedMinStock === undefined) {
        failures.push({ inventoryId, productId, reason: 'no-values' });
        continue;
      }

      if (!inventoryId && !productId) {
        failures.push({ inventoryId, productId, reason: 'no-target' });
        continue;
      }

      const updateData = {};
      if (parsedReorderPoint !== undefined) updateData.reorderPoint = parsedReorderPoint;
      if (parsedMinStock !== undefined) updateData.minStock = parsedMinStock;
      updateData.updatedAt = new Date();

      const where = {
        ...(inventoryId ? { id: inventoryId } : { productId }),
        warehouse: scope.warehouseWhere,
        product: { ...scope.productWhere, deletedAt: null },
      };

      try {
        const result = await prisma.inventory.updateMany({ where, data: updateData });
        updatedCount += result.count;
      } catch (error) {
        failures.push({ inventoryId, productId, reason: error.message });
      }
    }

    res.json({
      success: true,
      message: `تم تحديث ${updatedCount} سجل مخزون`,
      data: { updatedCount, failures },
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error in bulk reorder update:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode && error.statusCode < 500 ? error.message : 'فشل في التحديث الجماعي لنقاط إعادة الطلب',
      error: error.message,
    });
  }
};

