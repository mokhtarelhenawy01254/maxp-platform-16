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
  { productId, companyId, stock, cost, userId, userName, isCreate = false } = {}
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
  const warehouse = await ensureCompanyPrimaryWarehouse(db, companyId);
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
      const savedInventory = await db.inventory.upsert({
        where: {
          productId_warehouseId_batchNumber: {
            productId,
            warehouseId: warehouse.id,
            batchNumber: null,
          },
        },
        update: {
          quantity: stockNumber,
          available: stockNumber,
          ...(costNumber !== null && { cost: costNumber }),
          updatedAt: new Date(),
        },
        create: {
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
 * Automatically heals orphan products that have stock > 0 but no inventory row in warehouses.
 *
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @param {object} params
 * @param {object} params.product
 * @param {string} params.companyId
 * @returns {Promise<object|null>}
 */
const autoHealProductInventory = async (prisma, { product, companyId } = {}) => {
  if (!product || !companyId) return null;
  const stock =
    typeof product.stock === 'number' ? product.stock : parseInt(product.stock, 10);

  if (stock > 0 && (!product.inventories || product.inventories.length === 0)) {
    const cost =
      product.cost !== undefined && product.cost !== null ? product.cost : null;
    return syncProductToInventory(prisma, {
      productId: product.id,
      companyId,
      stock,
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
  autoHealProductInventory,
};
