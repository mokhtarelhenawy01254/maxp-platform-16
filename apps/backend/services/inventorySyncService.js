const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Ensures a company has an active primary warehouse.
 * If none exists, creates 'المخزن الرئيسي'.
 *
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @param {string} companyId
 * @returns {Promise<object|null>}
 */
const ensureCompanyPrimaryWarehouse = async (prisma, companyId) => {
  if (!companyId) return null;
  const db = prisma || getSharedPrismaClient();

  let warehouse = await db.warehouse.findFirst({
    where: {
      companyId,
      merchantId: null,
      isActive: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!warehouse) {
    try {
      warehouse = await db.warehouse.create({
        data: {
          name: 'المخزن الرئيسي',
          type: 'main',
          companyId,
          isActive: true,
        },
      });
    } catch (createErr) {
      // Handle potential race condition if another request created it simultaneously
      warehouse = await db.warehouse.findFirst({
        where: {
          companyId,
          merchantId: null,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!warehouse) {
        throw createErr;
      }
    }
  }

  return warehouse;
};

/**
 * Synchronizes product stock and cost from product catalog to warehouse inventory.
 * Creates opening stock movement for new records or adjustment movement when stock changes.
 *
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @param {object} params
 * @param {string} params.productId
 * @param {string} params.companyId
 * @param {number|string} params.stock
 * @param {number|string} [params.cost]
 * @param {string} [params.userId]
 * @param {string} [params.userName]
 * @param {boolean} [params.isCreate=false]
 * @returns {Promise<object|null>}
 */
const syncProductToInventory = async (
  prisma,
  { productId, companyId, stock, cost, userId, userName, isCreate = false, warehouseId = null } = {}
) => {
  if (!productId || !companyId || stock === undefined || stock === null) {
    return null;
  }

  const stockNumber = Math.max(0, parseInt(stock, 10));
  if (Number.isNaN(stockNumber)) {
    return null;
  }

  const costNumber =
    cost !== undefined && cost !== null && cost !== '' && !Number.isNaN(Number(cost))
      ? Number(cost)
      : null;

  const db = prisma || getSharedPrismaClient();
  let warehouse = null;
  if (warehouseId) {
    warehouse = await db.warehouse.findFirst({
      where: {
        id: warehouseId,
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        location: true,
      },
    });
  }
  if (!warehouse) {
    warehouse = await ensureCompanyPrimaryWarehouse(db, companyId);
  }
  if (!warehouse) {
    return null;
  }

  const inventory = await db.inventory.findFirst({
    where: {
      productId,
      warehouseId: warehouse.id,
      batchNumber: null,
    },
    include: {
      warehouse: {
        select: {
          id: true,
          name: true,
          location: true,
        },
      },
    },
  });

  // If new product or no inventory row exists
  if (isCreate || !inventory) {
    if (stockNumber > 0) {
      let savedInventory;
      if (inventory) {
        savedInventory = await db.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: stockNumber,
            available: stockNumber,
            ...(costNumber !== null && { cost: costNumber }),
            updatedAt: new Date(),
          },
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        });
      } else {
        savedInventory = await db.inventory.create({
          data: {
            productId,
            warehouseId: warehouse.id,
            quantity: stockNumber,
            available: stockNumber,
            reserved: 0,
            cost: costNumber,
            batchNumber: null,
          },
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        });
      }

      await db.stockMovement.create({
        data: {
          productId,
          warehouseId: warehouse.id,
          type: 'IN',
          reason: 'PURCHASE',
          quantity: stockNumber,
          cost: costNumber,
          notes: 'رصيد افتتاحي تلقائي للمنتج',
          isApproved: true,
          userId: userId || null,
          userName: userName || 'System',
          approvedBy: userId || null,
          approvedAt: new Date(),
        },
      });

      return savedInventory;
    }

    return inventory || null;
  }

  // If updating existing product and inventory exists
  const delta = stockNumber - inventory.quantity;
  if (delta !== 0) {
    const nextQty = Math.max(0, inventory.quantity + delta);
    const nextAvailable = Math.max(0, inventory.available + delta);

    const updatedInv = await db.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: nextQty,
        available: nextAvailable,
        ...(costNumber !== null && { cost: costNumber }),
        updatedAt: new Date(),
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    await db.stockMovement.create({
      data: {
        productId,
        warehouseId: warehouse.id,
        type: delta > 0 ? 'IN' : 'OUT',
        reason: 'ADJUSTMENT',
        quantity: Math.abs(delta),
        cost: costNumber !== null ? costNumber : (inventory.cost ? Number(inventory.cost) : null),
        notes: 'تعديل رصيد المنتج من بطاقة المنتج',
        isApproved: true,
        userId: userId || null,
        userName: userName || 'System',
        approvedBy: userId || null,
        approvedAt: new Date(),
      },
    });

    return updatedInv;
  }

  // Delta is 0, but cost might have been updated
  if (costNumber !== null && Number(inventory.cost) !== costNumber) {
    const updatedInv = await db.inventory.update({
      where: { id: inventory.id },
      data: {
        cost: costNumber,
        updatedAt: new Date(),
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });
    return updatedInv;
  }

  return inventory;
};

/**
 * Calculates the total stock of a product from its active variants,
 * updates Product.stock in the database, and syncs to warehouse Inventory.
 *
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @param {string} productId
 * @param {object} [options]
 * @param {string} [options.companyId]
 * @param {string} [options.userId]
 * @param {string} [options.userName]
 * @returns {Promise<number>} Returns the total stock
 */
const syncProductVariantsStock = async (
  prisma,
  productId,
  { companyId, userId, userName, warehouseId = null } = {}
) => {
  if (!productId) return 0;
  const db = prisma || getSharedPrismaClient();

  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      productVariants: {
        where: { isActive: true },
        select: { stock: true },
      },
    },
  });

  if (!product) return 0;

  const resolvedCompanyId = companyId || product.companyId;
  const variants = product.productVariants || [];
  if (variants.length === 0) {
    return product.stock || 0;
  }

  const totalStock = variants.reduce(
    (sum, v) => sum + Math.max(0, parseInt(v.stock, 10) || 0),
    0
  );

  // Update product.stock if changed
  if (product.stock !== totalStock) {
    await db.product.update({
      where: { id: productId },
      data: { stock: totalStock },
    }).catch(err => {
      console.error(`⚠️ [INVENTORY] Failed to update product.stock for ${productId}:`, err.message);
    });
  }

  // Resolve target warehouse: explicit warehouseId or existing inventory row for this product
  let targetWarehouseId = warehouseId || null;
  if (!targetWarehouseId) {
    const existingInventory = await db.inventory.findFirst({
      where: { productId },
      orderBy: { updatedAt: 'desc' },
      select: { warehouseId: true },
    });
    if (existingInventory?.warehouseId) {
      targetWarehouseId = existingInventory.warehouseId;
    }
  }

  // Sync to warehouse inventory
  await syncProductToInventory(db, {
    productId,
    companyId: resolvedCompanyId,
    stock: totalStock,
    cost: product.cost,
    userId,
    userName,
    isCreate: false,
    warehouseId: targetWarehouseId,
  });

  return totalStock;
};

/**
 * Automatically heals orphan products that have stock > 0 but no inventory row in warehouses,
 * taking into account variant stock sums when variants exist.
 *
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @param {object} params
 * @param {object} params.product
 * @param {string} params.companyId
 * @returns {Promise<object|null>}
 */
const autoHealProductInventory = async (prisma, { product, companyId } = {}) => {
  if (!product || !companyId) return null;
  const db = prisma || getSharedPrismaClient();

  let effectiveStock =
    typeof product.stock === 'number' ? product.stock : parseInt(product.stock, 10) || 0;

  let variants = product.productVariants || product.variants;
  if (!variants || !Array.isArray(variants)) {
    try {
      variants = await db.productVariant.findMany({
        where: { productId: product.id, isActive: true },
        select: { stock: true },
      });
    } catch (e) {
      variants = [];
    }
  }

  if (Array.isArray(variants) && variants.length > 0) {
    const variantSum = variants.reduce(
      (sum, v) => sum + Math.max(0, parseInt(v.stock, 10) || 0),
      0
    );
    if (variantSum > 0 || (effectiveStock === 0 && variantSum > 0)) {
      effectiveStock = variantSum;
      if (product.stock !== effectiveStock) {
        await db.product.update({
          where: { id: product.id },
          data: { stock: effectiveStock },
        }).catch(err => console.error(`⚠️ [AUTO-HEAL] Failed to update product.stock:`, err.message));
      }
    }
  }

  if (effectiveStock > 0 && (!product.inventories || product.inventories.length === 0)) {
    const cost =
      product.cost !== undefined && product.cost !== null ? product.cost : null;
    return syncProductToInventory(db, {
      productId: product.id,
      companyId,
      stock: effectiveStock,
      cost,
      userId: null,
      userName: 'النظام (مزامنة تلقائية)',
      isCreate: true,
    });
  }

  return null;
};

module.exports = {
  ensureCompanyPrimaryWarehouse,
  syncProductToInventory,
  syncProductVariantsStock,
  autoHealProductInventory,
};
