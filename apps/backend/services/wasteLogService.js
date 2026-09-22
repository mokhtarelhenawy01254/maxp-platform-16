const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Operational Waste & Spoilage Service
 * Records daily calibration waste (dial-in), barista drops/spills, expired items, and samples.
 * Automatically decrements inventory and logs a StockMovement.
 */

async function recordWaste({
  companyId,
  warehouseId,
  productId,
  quantity,
  unit = 'G',
  reason = 'CALIBRATION_DIAL_IN',
  notes,
  loggedBy
}) {
  const prisma = getSharedPrismaClient();

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch Product details for cost calculation
    const product = await tx.product.findFirst({
      where: { id: productId, companyId }
    });

    if (!product) {
      throw new Error('المنتج أو المادة الخام غير موجودة');
    }

    const costPerUnit = Number(product.cost || 0);
    const numQty = Number(quantity);
    const totalCost = Math.round(numQty * costPerUnit * 100) / 100;

    // 2. Create OperationalWasteLog entry
    const wasteLog = await tx.operationalWasteLog.create({
      data: {
        companyId,
        warehouseId,
        productId,
        quantity: numQty,
        unit: unit || product.unit || 'G',
        reason,
        costPerUnit,
        totalCost,
        loggedBy: loggedBy || 'system',
        notes
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, unit: true }
        },
        warehouse: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    // 3. Decrement Product Stock
    const intQty = Math.max(1, Math.round(numQty));
    await tx.product.update({
      where: { id: productId },
      data: {
        stock: { decrement: intQty }
      }
    });

    // 4. Decrement Warehouse Inventory
    const inv = await tx.inventory.findFirst({
      where: { warehouseId, productId }
    });

    if (inv) {
      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          quantity: { decrement: intQty },
          available: { decrement: intQty }
        }
      });
    }

    // 5. Create StockMovement (type: OUT, reason: DAMAGE)
    await tx.stockMovement.create({
      data: {
        companyId,
        warehouseId,
        productId,
        type: 'OUT',
        reason: 'DAMAGE',
        quantity: intQty,
        cost: totalCost,
        reference: `WASTE-${wasteLog.id.slice(-8).toUpperCase()}`,
        notes: `هدر تشغيلي: ${reason} - ${notes || 'لا توجد ملاحظات إضافية'}`,
        userId: loggedBy
      }
    });

    return wasteLog;
  });
}

async function listWasteLogs(companyId, { page = 1, limit = 50, reason, warehouseId } = {}) {
  const prisma = getSharedPrismaClient();
  const where = {
    companyId,
    ...(reason ? { reason } : {}),
    ...(warehouseId ? { warehouseId } : {})
  };

  const [total, logs] = await Promise.all([
    prisma.operationalWasteLog.count({ where }),
    prisma.operationalWasteLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: {
          select: { id: true, name: true, sku: true, unit: true }
        },
        warehouse: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  // Aggregate total financial waste cost
  const aggregate = await prisma.operationalWasteLog.aggregate({
    where,
    _sum: { totalCost: true, quantity: true }
  });

  return {
    total,
    page,
    limit,
    totalWasteValue: Number(aggregate._sum.totalCost || 0),
    totalWasteQuantity: Number(aggregate._sum.quantity || 0),
    logs
  };
}

module.exports = {
  recordWaste,
  listWasteLogs
};
