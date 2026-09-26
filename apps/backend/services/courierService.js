const { getSharedPrismaClient } = require('./sharedDatabase');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwtSecret');

const DELIVERED_STATUSES = ['DELIVERED', 'COMPLETED', 'REMITTED'];

const normalizeAmount = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

/**
 * List couriers with live performance metrics and pending custody
 */
async function listCouriers(companyId, { search, status, isActive } = {}) {
  const prisma = getSharedPrismaClient();

  const where = { companyId };
  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }
  if (status && status !== 'ALL') {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { nationalId: { contains: search } },
      { plateNumber: { contains: search, mode: 'insensitive' } }
    ];
  }

  const couriers = await prisma.courier.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          shipments: true,
          deliveryRuns: true
        }
      }
    }
  });

  // Calculate live custody and telemetry for each courier
  const couriersWithMetrics = await Promise.all(
    couriers.map(async (courier) => {
      // 1. Active shipments currently in field
      const activeShipments = await prisma.shipment.findMany({
        where: {
          companyId,
          courierId: courier.id,
          status: { in: ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PENDING'] }
        },
        select: {
          id: true,
          cost: true,
          order: { select: { total: true } }
        }
      });

      const activeShipmentsCount = activeShipments.length;
      const expectedCashInTransit = activeShipments.reduce(
        (sum, s) => sum + normalizeAmount(s.order?.total),
        0
      );

      // 2. Delivered shipments pending financial settlement
      const unsettledDelivered = await prisma.shipment.findMany({
        where: {
          companyId,
          courierId: courier.id,
          status: { in: DELIVERED_STATUSES },
          settlementStatus: { not: 'SETTLED' }
        },
        select: {
          id: true,
          collectedAmount: true,
          order: { select: { total: true } }
        }
      });

      const pendingSettlementCash = unsettledDelivered.reduce(
        (sum, s) => sum + (s.collectedAmount !== null ? normalizeAmount(s.collectedAmount) : normalizeAmount(s.order?.total)),
        0
      );

      // 3. Lifetime success rate
      const deliveredCount = await prisma.shipment.count({
        where: {
          companyId,
          courierId: courier.id,
          status: { in: DELIVERED_STATUSES }
        }
      });

      const returnedCount = await prisma.shipment.count({
        where: {
          companyId,
          courierId: courier.id,
          status: { in: ['RETURNED', 'FAILED', 'CANCELLED'] }
        }
      });

      const totalFinished = deliveredCount + returnedCount;
      const successRate = totalFinished > 0 ? Math.round((deliveredCount / totalFinished) * 100) : 100;

      return {
        ...courier,
        commissionAmount: normalizeAmount(courier.commissionAmount),
        activeShipmentsCount,
        expectedCashInTransit,
        pendingSettlementCash,
        deliveredCount,
        returnedCount,
        successRate
      };
    })
  );

  return couriersWithMetrics;
}

/**
 * Get courier details by ID
 */
async function getCourierById(companyId, courierId) {
  const prisma = getSharedPrismaClient();

  const courier = await prisma.courier.findFirst({
    where: { id: courierId, companyId },
    include: {
      deliveryRuns: {
        orderBy: { dispatchDate: 'desc' },
        take: 10,
        include: {
          _count: {
            select: { shipments: true }
          }
        }
      }
    }
  });

  if (!courier) return null;

  return {
    ...courier,
    commissionAmount: normalizeAmount(courier.commissionAmount)
  };
}

/**
 * Create a new internal courier
 */
async function createCourier(companyId, data) {
  const prisma = getSharedPrismaClient();

  return prisma.courier.create({
    data: {
      companyId,
      name: data.name?.trim(),
      phone: data.phone?.trim(),
      nationalId: data.nationalId?.trim() || null,
      vehicleType: data.vehicleType || 'MOTORCYCLE',
      plateNumber: data.plateNumber?.trim() || null,
      governorates: typeof data.governorates === 'object' ? JSON.stringify(data.governorates) : (data.governorates || null),
      commissionType: data.commissionType || 'FIXED_PER_ORDER',
      commissionAmount: normalizeAmount(data.commissionAmount),
      isActive: data.isActive !== false,
      status: 'AVAILABLE',
      notes: data.notes?.trim() || null,
      userId: data.userId || null
    }
  });
}

/**
 * Update an existing courier
 */
async function updateCourier(companyId, courierId, data) {
  const prisma = getSharedPrismaClient();

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name?.trim();
  if (data.phone !== undefined) updateData.phone = data.phone?.trim();
  if (data.nationalId !== undefined) updateData.nationalId = data.nationalId?.trim() || null;
  if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType;
  if (data.plateNumber !== undefined) updateData.plateNumber = data.plateNumber?.trim() || null;
  if (data.governorates !== undefined) {
    updateData.governorates = typeof data.governorates === 'object' ? JSON.stringify(data.governorates) : data.governorates;
  }
  if (data.commissionType !== undefined) updateData.commissionType = data.commissionType;
  if (data.commissionAmount !== undefined) updateData.commissionAmount = normalizeAmount(data.commissionAmount);
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
  if (data.userId !== undefined) updateData.userId = data.userId || null;

  return prisma.courier.updateMany({
    where: { id: courierId, companyId },
    data: updateData
  });
}

/**
 * Delete or deactivate courier
 */
async function deleteCourier(companyId, courierId) {
  const prisma = getSharedPrismaClient();

  const hasShipments = await prisma.shipment.count({
    where: { companyId, courierId }
  });

  if (hasShipments > 0) {
    // Soft delete to protect financial and historical records
    return prisma.courier.updateMany({
      where: { id: courierId, companyId },
      data: { isActive: false, status: 'OFF_DUTY' }
    });
  }

  return prisma.courier.deleteMany({
    where: { id: courierId, companyId }
  });
}

/**
 * Generate unique run number: e.g. RUN-20260923-001 or CAI-20260923-001 based on app settings
 */
async function generateRunNumber(prisma, companyId) {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let codePrefix = 'RUN';

  try {
    const fleetApp = await prisma.companyApp.findFirst({
      where: {
        companyId,
        app: { slug: 'internal-courier-fleet' }
      },
      select: { settings: true }
    });
    const customPrefix = fleetApp?.settings?.general?.runCodePrefix;
    if (customPrefix && typeof customPrefix === 'string' && customPrefix.trim()) {
      codePrefix = customPrefix.trim().toUpperCase();
    }
  } catch {
    // fallback to RUN
  }

  const prefix = `${codePrefix}-${todayStr}-`;

  const countToday = await prisma.deliveryRun.count({
    where: {
      companyId,
      runNumber: { startsWith: prefix }
    }
  });

  const nextSeq = String(countToday + 1).padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

/**
 * Create a delivery run (Manifest) and assign shipments
 */
async function createDeliveryRun(companyId, { courierId, shipmentIds, orderIds, notes, userId }) {
  const prisma = getSharedPrismaClient();

  const courier = await prisma.courier.findFirst({
    where: { id: courierId, companyId }
  });

  if (!courier) {
    throw new Error('المندوب غير موجود أو لا يتبع هذه الشركة');
  }

  // Resolve target shipments: either directly by shipmentIds or by orderIds
  let targetShipmentIds = Array.isArray(shipmentIds) ? [...shipmentIds] : [];

  if (Array.isArray(orderIds) && orderIds.length > 0) {
    // Find or create shipments for these orders
    for (const orderId of orderIds) {
      let shipment = await prisma.shipment.findFirst({
        where: { companyId, orderId }
      });

      if (!shipment) {
        const order = await prisma.order.findFirst({
          where: { id: orderId, companyId }
        });

        if (order) {
          shipment = await prisma.shipment.create({
            data: {
              companyId,
              orderId: order.id,
              carrierType: 'INTERNAL_COURIER',
              status: 'READY_FOR_SHIPPING',
              cost: order.shipping || 0,
              destinationGovernorate: order.governorate || null,
              destinationCity: order.city || null,
              destinationAddress: order.customerAddress || order.shippingAddress || null
            }
          });
        }
      }

      if (shipment && !targetShipmentIds.includes(shipment.id)) {
        targetShipmentIds.push(shipment.id);
      }
    }
  }

  if (targetShipmentIds.length === 0) {
    throw new Error('يجب تحديد شحنة واحدة على الأقل لإنشاء رحلة التوزيع');
  }

  const shipments = await prisma.shipment.findMany({
    where: { companyId, id: { in: targetShipmentIds } },
    include: { order: { select: { id: true, total: true, status: true } } }
  });

  const totalCODExpected = shipments.reduce(
    (sum, s) => sum + normalizeAmount(s.order?.total),
    0
  );

  const runNumber = await generateRunNumber(prisma, companyId);

  // Execute in interactive transaction for atomic integrity
  return prisma.$transaction(async (tx) => {
    const deliveryRun = await tx.deliveryRun.create({
      data: {
        companyId,
        courierId,
        runNumber,
        status: 'DISPATCHED',
        dispatchDate: new Date(),
        totalShipments: shipments.length,
        totalCODExpected,
        notes: notes?.trim() || null
      }
    });

    // Update shipments to associate with courier and run
    await tx.shipment.updateMany({
      where: { companyId, id: { in: targetShipmentIds } },
      data: {
        courierId,
        deliveryRunId: deliveryRun.id,
        carrierType: 'INTERNAL_COURIER',
        status: 'OUT_FOR_DELIVERY',
        settlementStatus: 'PENDING'
      }
    });

    // Update orders status if applicable
    const relatedOrderIds = shipments.map((s) => s.orderId).filter(Boolean);
    if (relatedOrderIds.length > 0) {
      await tx.order.updateMany({
        where: { companyId, id: { in: relatedOrderIds } },
        data: { status: 'OUT_FOR_DELIVERY' }
      });
    }

    // Set courier status to ON_DUTY
    await tx.courier.update({
      where: { id: courierId },
      data: { status: 'ON_DUTY' }
    });

    return deliveryRun;
  });
}

/**
 * List delivery runs with filters & pagination
 */
async function listDeliveryRuns(companyId, { courierId, status, dateFrom, dateTo, search, page = 1, limit = 20 } = {}) {
  const prisma = getSharedPrismaClient();

  const where = { companyId };
  if (courierId) where.courierId = courierId;
  if (status && status !== 'ALL') where.status = status;
  if (search) {
    where.OR = [
      { runNumber: { contains: search, mode: 'insensitive' } },
      { courier: { name: { contains: search, mode: 'insensitive' } } },
      { courier: { phone: { contains: search } } }
    ];
  }
  if (dateFrom || dateTo) {
    where.dispatchDate = {};
    if (dateFrom) where.dispatchDate.gte = new Date(dateFrom);
    if (dateTo) where.dispatchDate.lte = new Date(dateTo);
  }

  const [total, runs] = await Promise.all([
    prisma.deliveryRun.count({ where }),
    prisma.deliveryRun.findMany({
      where,
      orderBy: { dispatchDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            plateNumber: true
          }
        },
        shipments: {
          select: {
            id: true,
            status: true,
            settlementStatus: true,
            collectedAmount: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                customerName: true,
                customerPhone: true,
                total: true
              }
            }
          }
        }
      }
    })
  ]);

  const formattedRuns = runs.map((run) => ({
    ...run,
    totalCODExpected: normalizeAmount(run.totalCODExpected),
    totalCODCollected: normalizeAmount(run.totalCODCollected),
    deliveredCount: run.shipments.filter((s) => DELIVERED_STATUSES.includes(s.status)).length,
    returnedCount: run.shipments.filter((s) => ['RETURNED', 'FAILED', 'CANCELLED'].length).length,
    pendingCount: run.shipments.filter((s) => !DELIVERED_STATUSES.includes(s.status) && !['RETURNED', 'FAILED', 'CANCELLED'].includes(s.status)).length
  }));

  return {
    data: formattedRuns,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1
    }
  };
}

/**
 * Get single delivery run with full manifest details
 */
async function getDeliveryRunById(companyId, runId) {
  const prisma = getSharedPrismaClient();

  const run = await prisma.deliveryRun.findFirst({
    where: { id: runId, companyId },
    include: {
      courier: true,
      shipments: {
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              customerPhone: true,
              governorate: true,
              city: true,
              customerAddress: true,
              shippingAddress: true,
              total: true,
              shipping: true,
              status: true,
              items: {
                select: {
                  id: true,
                  name: true,
                  quantity: true,
                  price: true,
                  variantTitle: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!run) return null;

  let mobileToken = null;
  try {
    mobileToken = jwt.sign(
      {
        role: 'COURIER',
        courierId: run.courierId,
        runId: run.id,
        companyId: run.companyId
      },
      getJwtSecret(),
      { expiresIn: '30d' }
    );
  } catch (err) {
    console.warn('⚠️ Could not sign mobileToken:', err?.message);
  }

  return {
    ...run,
    mobileToken,
    totalCODExpected: normalizeAmount(run.totalCODExpected),
    totalCODCollected: normalizeAmount(run.totalCODCollected),
    courier: {
      ...run.courier,
      commissionAmount: normalizeAmount(run.courier?.commissionAmount)
    }
  };
}

/**
 * Field Update: Courier records delivery attempt (Full delivery, partial, delay, or return)
 */
async function updateDeliveryRunShipment(companyId, { shipmentId, status, collectedAmount, deliveryNotes, userId }) {
  const prisma = getSharedPrismaClient();

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, companyId },
    include: { order: true, deliveryRun: true }
  });

  if (!shipment) {
    throw new Error('الشحنة غير موجودة');
  }

  const normalizedStatus = String(status || '').toUpperCase();
  const updateData = {
    status: normalizedStatus,
    deliveryNotes: deliveryNotes?.trim() || shipment.deliveryNotes
  };

  const isDelivered = DELIVERED_STATUSES.includes(normalizedStatus) || normalizedStatus === 'PARTIALLY_DELIVERED';

  if (isDelivered) {
    updateData.status = 'DELIVERED';
    updateData.collectedAmount = collectedAmount !== undefined ? normalizeAmount(collectedAmount) : normalizeAmount(shipment.order?.total);
    updateData.collectedAt = new Date();
  } else if (normalizedStatus === 'RETURNED' || normalizedStatus === 'FAILED') {
    updateData.status = 'RETURNED';
    updateData.collectedAmount = 0;
  } else if (normalizedStatus === 'DELAYED') {
    updateData.status = 'DELAYED';
  }

  return prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: updateData
    });

    if (shipment.orderId) {
      await tx.order.update({
        where: { id: shipment.orderId },
        data: { status: updateData.status }
      });
    }

    // If all shipments in delivery run are resolved, check if run can be marked COMPLETED
    if (shipment.deliveryRunId) {
      const remainingPending = await tx.shipment.count({
        where: {
          deliveryRunId: shipment.deliveryRunId,
          status: { in: ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PENDING'] }
        }
      });

      if (remainingPending === 0) {
        await tx.deliveryRun.update({
          where: { id: shipment.deliveryRunId },
          data: { status: 'COMPLETED' }
        });
      }
    }

    return updatedShipment;
  });
}

/**
 * End-of-Day Financial Remittance and Run Settlement (توريد الخزينة وتصفير عهدة المندوب)
 */
async function settleDeliveryRun(companyId, runId, { treasuryAccountId, actualCashReceived, notes, userId }) {
  const prisma = getSharedPrismaClient();

  const run = await prisma.deliveryRun.findFirst({
    where: { id: runId, companyId },
    include: {
      courier: true,
      shipments: {
        include: { order: { select: { id: true, orderNumber: true, total: true } } }
      }
    }
  });

  if (!run) {
    throw new Error('رحلة التوصيل غير موجودة');
  }

  if (run.status === 'SETTLED') {
    throw new Error('تمت تسوية هذه الوردية وتوريدها بالفعل سابقاً');
  }

  const cashAmount = normalizeAmount(actualCashReceived);

  return prisma.$transaction(async (tx) => {
    let treasuryTransaction = null;

    // 1. If Treasury Account is provided and cash is received, deposit into TreasuryAccount
    if (treasuryAccountId && cashAmount > 0) {
      const account = await tx.treasuryAccount.findFirst({
        where: { id: treasuryAccountId, companyId }
      });

      if (!account) {
        throw new Error('حساب الخزينة المحدد غير موجود أو غير تابع للشركة');
      }

      const previousBalance = normalizeAmount(account.balance);
      const newBalance = previousBalance + cashAmount;

      // Update TreasuryAccount balance
      await tx.treasuryAccount.update({
        where: { id: treasuryAccountId },
        data: { balance: newBalance }
      });

      // Create TreasuryTransaction audit record
      treasuryTransaction = await tx.treasuryTransaction.create({
        data: {
          companyId,
          treasuryAccountId,
          amount: cashAmount,
          type: 'DEPOSIT',
          runningBalance: newBalance,
          referenceType: 'COURIER_REMITTANCE',
          referenceId: run.id,
          description: `توريد نقدية مأمورية رقم ${run.runNumber} - المندوب: ${run.courier.name}`,
          createdById: userId || null,
          date: new Date()
        }
      });
    }

    // 2. Mark all delivered shipments in this run as SETTLED
    const deliveredShipmentIds = run.shipments
      .filter((s) => DELIVERED_STATUSES.includes(s.status))
      .map((s) => s.id);

    if (deliveredShipmentIds.length > 0) {
      await tx.shipment.updateMany({
        where: { id: { in: deliveredShipmentIds } },
        data: {
          settlementStatus: 'SETTLED',
          settledAt: new Date(),
          settledBy: userId || null
        }
      });
    }

    // 3. Mark delivery run as SETTLED
    const settledRun = await tx.deliveryRun.update({
      where: { id: run.id },
      data: {
        status: 'SETTLED',
        settledAt: new Date(),
        settledBy: userId || null,
        totalCODCollected: cashAmount,
        notes: notes?.trim() || run.notes,
        treasuryAccountId: treasuryAccountId || null,
        treasuryTransactionId: treasuryTransaction ? treasuryTransaction.id : null
      }
    });

    // 4. Check if courier has any other active runs; if not, return to AVAILABLE
    const otherActiveRuns = await tx.deliveryRun.count({
      where: {
        courierId: run.courierId,
        companyId,
        status: 'DISPATCHED',
        id: { not: run.id }
      }
    });

    if (otherActiveRuns === 0) {
      await tx.courier.update({
        where: { id: run.courierId },
        data: { status: 'AVAILABLE' }
      });
    }

    return {
      run: settledRun,
      treasuryTransaction
    };
  });
}

/**
 * Fleet Cockpit telemetry summary
 */
async function getCourierDashboardSummary(companyId) {
  const prisma = getSharedPrismaClient();

  const [totalCouriers, activeCouriers, dispatchedRuns] = await Promise.all([
    prisma.courier.count({ where: { companyId, isActive: true } }),
    prisma.courier.count({ where: { companyId, isActive: true, status: 'ON_DUTY' } }),
    prisma.deliveryRun.findMany({
      where: { companyId, status: 'DISPATCHED' },
      select: {
        id: true,
        totalShipments: true,
        totalCODExpected: true
      }
    })
  ]);

  const totalParcelsInField = dispatchedRuns.reduce((sum, r) => sum + r.totalShipments, 0);
  const totalExpectedCashInField = dispatchedRuns.reduce((sum, r) => sum + normalizeAmount(r.totalCODExpected), 0);

  // Unsettled cash in delivered status
  const deliveredUnsettled = await prisma.shipment.findMany({
    where: {
      companyId,
      courierId: { not: null },
      status: { in: DELIVERED_STATUSES },
      settlementStatus: { not: 'SETTLED' }
    },
    select: {
      collectedAmount: true,
      order: { select: { total: true } }
    }
  });

  const totalCashAwaitingRemittance = deliveredUnsettled.reduce(
    (sum, s) => sum + (s.collectedAmount !== null ? normalizeAmount(s.collectedAmount) : normalizeAmount(s.order?.total)),
    0
  );

  return {
    totalCouriers,
    activeCouriers,
    availableCouriers: Math.max(0, totalCouriers - activeCouriers),
    totalParcelsInField,
    totalExpectedCashInField,
    totalCashAwaitingRemittance
  };
}

module.exports = {
  listCouriers,
  getCourierById,
  createCourier,
  updateCourier,
  deleteCourier,
  createDeliveryRun,
  listDeliveryRuns,
  getDeliveryRunById,
  updateDeliveryRunShipment,
  settleDeliveryRun,
  getCourierDashboardSummary
};
