const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Stock Audit Service for Cafe & Restaurant Suite
 * Manages physical inventory count sessions, snapshots, discrepancy calculations, and automated reconciliations.
 */

/**
 * Start a new stock audit session
 */
async function startAuditSession(companyId, { warehouseId, title, notes, userId, categoryId = null }) {
  const prisma = getSharedPrismaClient();

  if (!warehouseId) {
    throw new Error('يجب تحديد المخزن المراد جرده');
  }

  // Verify warehouse belongs to company
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, companyId }
  });

  if (!warehouse) {
    throw new Error('المخزن غير موجود أو لا تملك صلاحية الوصول إليه');
  }

  // Generate session number: AUD-YYYYMMDD-XXXX
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const sessionNumber = `AUD-${datePrefix}-${randomSuffix}`;

  // Fetch current inventory records for this warehouse
  const whereInventory = {
    warehouseId,
    warehouse: { companyId },
    product: {
      isActive: true,
      ...(categoryId ? { categoryId } : {})
    }
  };

  const inventories = await prisma.inventory.findMany({
    where: whereInventory,
    include: {
      product: {
        select: { id: true, name: true, sku: true, cost: true, price: true }
      }
    }
  });

  let totalExpectedValue = 0;
  const auditItemsData = inventories.map((inv) => {
    const expectedQty = Number(inv.quantity || 0);
    const unitCost = Number(inv.cost || inv.product?.cost || 0);
    const expectedCost = expectedQty * unitCost;
    totalExpectedValue += expectedCost;

    return {
      productId: inv.productId,
      productName: inv.product?.name || 'صنف غير معروف',
      productSku: inv.product?.sku || null,
      expectedQuantity: expectedQty,
      actualQuantity: null,
      varianceQuantity: 0,
      unitCost: unitCost,
      varianceCost: 0,
      isReconciled: false
    };
  });

  const session = await prisma.stockAuditSession.create({
    data: {
      companyId,
      warehouseId,
      sessionNumber,
      title: title || `جرد مخزن ${warehouse.name}`,
      notes: notes || null,
      status: 'IN_PROGRESS',
      startedBy: userId,
      totalExpectedValue: Math.round(totalExpectedValue * 100) / 100,
      totalActualValue: 0,
      totalVarianceValue: 0,
      items: {
        create: auditItemsData
      }
    },
    include: {
      warehouse: { select: { id: true, name: true } },
      items: true
    }
  });

  return session;
}

/**
 * Update physical counts for an audit session
 */
async function updateAuditCounts(companyId, sessionId, { items = [], notes = null, isFinalSubmission = false }) {
  const prisma = getSharedPrismaClient();

  const session = await prisma.stockAuditSession.findFirst({
    where: { id: sessionId, companyId },
    include: { items: true }
  });

  if (!session) {
    throw new Error('جلسة الجرد غير موجودة');
  }

  if (session.status === 'APPROVED' || session.status === 'CANCELLED') {
    throw new Error(`لا يمكن تعديل جلسة جرد بحالة: ${session.status}`);
  }

  // Update item counts in transaction
  await prisma.$transaction(async (tx) => {
    for (const countItem of items) {
      if (!countItem.id) continue;

      const existingItem = session.items.find((i) => i.id === countItem.id);
      if (!existingItem) continue;

      const actualQty = countItem.actualQuantity !== undefined && countItem.actualQuantity !== null && countItem.actualQuantity !== ''
        ? Number(countItem.actualQuantity)
        : null;

      if (actualQty !== null) {
        const expectedQty = Number(existingItem.expectedQuantity || 0);
        const unitCost = Number(existingItem.unitCost || 0);
        const varianceQty = actualQty - expectedQty;
        const varianceCost = varianceQty * unitCost;

        await tx.stockAuditItem.update({
          where: { id: countItem.id },
          data: {
            actualQuantity: actualQty,
            varianceQuantity: varianceQty,
            varianceCost: Math.round(varianceCost * 100) / 100,
            notes: countItem.notes !== undefined ? countItem.notes : existingItem.notes
          }
        });
      }
    }

    // Recalculate session totals
    const updatedItems = await tx.stockAuditItem.findMany({
      where: { sessionId }
    });

    let totalActualValue = 0;
    let totalVarianceValue = 0;

    for (const it of updatedItems) {
      if (it.actualQuantity !== null) {
        const actualVal = Number(it.actualQuantity) * Number(it.unitCost);
        totalActualValue += actualVal;
        totalVarianceValue += Number(it.varianceCost);
      }
    }

    const newStatus = isFinalSubmission ? 'SUBMITTED' : session.status;

    await tx.stockAuditSession.update({
      where: { id: sessionId },
      data: {
        totalActualValue: Math.round(totalActualValue * 100) / 100,
        totalVarianceValue: Math.round(totalVarianceValue * 100) / 100,
        status: newStatus,
        notes: notes !== null ? notes : session.notes,
        ...(isFinalSubmission ? { completedAt: new Date() } : {})
      }
    });
  });

  return await getAuditSessionById(companyId, sessionId);
}

/**
 * Approve audit session and automatically reconcile inventory discrepancies
 */
async function approveAndReconcileAudit(companyId, sessionId, userId) {
  const prisma = getSharedPrismaClient();

  const session = await prisma.stockAuditSession.findFirst({
    where: { id: sessionId, companyId },
    include: {
      warehouse: true,
      items: true
    }
  });

  if (!session) {
    throw new Error('جلسة الجرد غير موجودة');
  }

  if (session.status === 'APPROVED') {
    throw new Error('تم اعتماد وتسوية هذه الجلسة مسبقاً');
  }

  return await prisma.$transaction(async (tx) => {
    const uncountedItems = session.items.filter((i) => i.actualQuantity === null);
    if (uncountedItems.length > 0) {
      throw new Error(`يوجد ${uncountedItems.length} صنف لم يتم إدخال العد الفعلي لها`);
    }

    for (const item of session.items) {
      const varianceQty = Number(item.varianceQuantity || 0);
      const roundedVariance = Math.round(varianceQty);

      if (roundedVariance !== 0 && !item.isReconciled) {
        // Find inventory record
        const inv = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            warehouseId: session.warehouseId
          }
        });

        if (inv) {
          if (roundedVariance > 0) {
            // Surplus (زيادة) -> ADJUSTMENT_IN
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                quantity: { increment: roundedVariance },
                available: { increment: roundedVariance }
              }
            });

            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: roundedVariance }
              }
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                warehouseId: session.warehouseId,
                type: 'IN',
                reason: 'ADJUSTMENT',
                quantity: roundedVariance,
                reference: session.sessionNumber,
                notes: `تسوية زيادة جرد فعلي (جلسة ${session.sessionNumber})`,
                userId,
                isApproved: true
              }
            });
          } else {
            // Shortage (عجز) -> ADJUSTMENT_OUT
            const shortageUnits = Math.abs(roundedVariance);

            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                quantity: { decrement: shortageUnits },
                available: { decrement: shortageUnits }
              }
            });

            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { decrement: shortageUnits }
              }
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                warehouseId: session.warehouseId,
                type: 'OUT',
                reason: 'ADJUSTMENT',
                quantity: shortageUnits,
                reference: session.sessionNumber,
                notes: `تسوية عجز جرد فعلي (جلسة ${session.sessionNumber})`,
                userId,
                isApproved: true
              }
            });
          }

          await tx.stockAuditItem.update({
            where: { id: item.id },
            data: { isReconciled: true }
          });
        }
      }
    }

    const updatedSession = await tx.stockAuditSession.update({
      where: { id: sessionId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: userId
      },
      include: {
        warehouse: true,
        items: true
      }
    });

    return updatedSession;
  });
}

/**
 * Get audit session details
 */
async function getAuditSessionById(companyId, sessionId) {
  const prisma = getSharedPrismaClient();
  const session = await prisma.stockAuditSession.findFirst({
    where: { id: sessionId, companyId },
    include: {
      warehouse: { select: { id: true, name: true, location: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, images: true } }
        },
        orderBy: { productName: 'asc' }
      }
    }
  });

  return session;
}

/**
 * List audit sessions
 */
async function listAuditSessions(companyId, { page = 1, limit = 20, warehouseId = null, status = null } = {}) {
  const prisma = getSharedPrismaClient();
  const where = {
    companyId,
    ...(warehouseId ? { warehouseId } : {}),
    ...(status ? { status } : {})
  };

  const [total, sessions] = await Promise.all([
    prisma.stockAuditSession.count({ where }),
    prisma.stockAuditSession.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        warehouse: { select: { id: true, name: true } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return { total, page, limit, sessions };
}

module.exports = {
  startAuditSession,
  updateAuditCounts,
  approveAndReconcileAudit,
  getAuditSessionById,
  listAuditSessions
};
