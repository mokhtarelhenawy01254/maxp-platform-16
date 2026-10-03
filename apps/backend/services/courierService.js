const { getSharedPrismaClient } = require('./sharedDatabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getJwtSecret } = require('../utils/jwtSecret');
const { buildInstalledMarketplaceAppSettings } = require('../utils/marketplaceAppSettings');

const DELIVERED_STATUSES = ['DELIVERED', 'COMPLETED', 'REMITTED'];

// Field-facing statuses a courier may set — anything else is rejected instead of stored verbatim
const ALLOWED_FIELD_STATUSES = ['DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'REMITTED', 'RETURNED', 'FAILED', 'DELAYED'];

// Run states whose shipments are financially or operationally closed
const LOCKED_RUN_STATUSES = ['SETTLED', 'CANCELLED'];

const serviceError = (message, statusCode) => {
  const err = new Error(message);
  if (statusCode) err.statusCode = statusCode;
  return err;
};

const normalizeAmount = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

/**
 * List couriers with live performance metrics and pending custody
 */
async function listCouriers(companyId, { search, status, isActive, restrictToCourierId } = {}) {
  const prisma = getSharedPrismaClient();

  const where = { companyId };
  // Field couriers may only ever see their own record
  if (restrictToCourierId) where.id = restrictToCourierId;
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

  if (couriers.length === 0) return [];

  // Set-level metrics: 4 queries total instead of 4 per courier (the old N+1 hit ~201
  // queries against connection_limit=40 with 50 couriers).
  const courierIds = couriers.map((c) => c.id);
  const [activeShipments, unsettledDelivered, deliveredGroups, returnedGroups] = await Promise.all([
    prisma.shipment.findMany({
      where: {
        companyId,
        courierId: { in: courierIds },
        status: { in: ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PENDING'] }
      },
      select: { courierId: true, order: { select: { total: true } } }
    }),
    prisma.shipment.findMany({
      where: {
        companyId,
        courierId: { in: courierIds },
        status: { in: DELIVERED_STATUSES },
        settlementStatus: { not: 'SETTLED' }
      },
      select: { courierId: true, collectedAmount: true, order: { select: { total: true } } }
    }),
    prisma.shipment.groupBy({
      by: ['courierId'],
      where: { companyId, courierId: { in: courierIds }, status: { in: DELIVERED_STATUSES } },
      _count: { _all: true }
    }),
    prisma.shipment.groupBy({
      by: ['courierId'],
      where: { companyId, courierId: { in: courierIds }, status: { in: ['RETURNED', 'FAILED', 'CANCELLED'] } },
      _count: { _all: true }
    })
  ]);

  const activeByCourier = new Map();
  for (const s of activeShipments) {
    if (!activeByCourier.has(s.courierId)) activeByCourier.set(s.courierId, []);
    activeByCourier.get(s.courierId).push(s);
  }
  const unsettledByCourier = new Map();
  for (const s of unsettledDelivered) {
    if (!unsettledByCourier.has(s.courierId)) unsettledByCourier.set(s.courierId, []);
    unsettledByCourier.get(s.courierId).push(s);
  }
  const deliveredCountByCourier = new Map(deliveredGroups.map((g) => [g.courierId, g._count._all]));
  const returnedCountByCourier = new Map(returnedGroups.map((g) => [g.courierId, g._count._all]));

  const couriersWithMetrics = couriers.map((courier) => {
    const courierActive = activeByCourier.get(courier.id) || [];
    const courierUnsettled = unsettledByCourier.get(courier.id) || [];

    const activeShipmentsCount = courierActive.length;
    const expectedCashInTransit = courierActive.reduce(
      (sum, s) => sum + normalizeAmount(s.order?.total),
      0
    );

    const pendingSettlementCash = courierUnsettled.reduce(
      (sum, s) => sum + (s.collectedAmount !== null ? normalizeAmount(s.collectedAmount) : normalizeAmount(s.order?.total)),
      0
    );

    const deliveredCount = deliveredCountByCourier.get(courier.id) || 0;
    const returnedCount = returnedCountByCourier.get(courier.id) || 0;

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
  });

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

  await prisma.courier.updateMany({
    where: { id: courierId, companyId },
    data: updateData
  });

  return getCourierById(companyId, courierId);
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
    // Find or create shipments for these orders (supports both cuid and orderNumber)
    for (const orderRef of orderIds) {
      if (!orderRef) continue;
      const order = await prisma.order.findFirst({
        where: {
          companyId,
          OR: [{ id: String(orderRef) }, { orderNumber: String(orderRef) }]
        }
      });

      if (order) {
        let shipment = await prisma.shipment.findFirst({
          where: { companyId, orderId: order.id }
        });

        if (!shipment) {
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

        if (shipment && !targetShipmentIds.includes(shipment.id)) {
          targetShipmentIds.push(shipment.id);
        }
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

  // A shipment whose cash was already collected and remitted must never enter a new run —
  // otherwise it would be collected a second time. Delivered/cancelled shipments are closed too.
  const unassignable = shipments.filter(
    (s) =>
      s.settlementStatus === 'SETTLED' ||
      DELIVERED_STATUSES.includes(s.status) ||
      s.status === 'CANCELLED'
  );
  if (unassignable.length > 0) {
    const samples = unassignable
      .slice(0, 5)
      .map((s) => s.order?.orderNumber || s.id)
      .join('، ');
    throw serviceError(`لا يمكن إسناد شحنات مسوّاة ماليًا أو منتهية لرحلة جديدة: ${samples}`, 400);
  }

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

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = { companyId };
  if (courierId) where.courierId = courierId;
  // UNSETTLED is the operationally critical view: runs whose cash has not been remitted yet
  if (status === 'UNSETTLED') where.status = { notIn: ['SETTLED', 'CANCELLED'] };
  else if (status && status !== 'ALL') where.status = status;
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
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
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
    returnedCount: run.shipments.filter((s) => ['RETURNED', 'FAILED', 'CANCELLED'].includes(s.status)).length,
    pendingCount: run.shipments.filter((s) => !DELIVERED_STATUSES.includes(s.status) && !['RETURNED', 'FAILED', 'CANCELLED'].includes(s.status)).length
  }));

  return {
    data: formattedRuns,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 1
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
              orderItems: {
                select: {
                  id: true,
                  productName: true,
                  quantity: true,
                  price: true
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

  const { pinHash: _courierPinHash, ...courierSafe } = run.courier || {};

  // Field PIN gating: exposed as a flag so the mobile page asks for the PIN upfront
  const pinRequired = run.courierId ? await isCourierPinRequired(companyId, run.courierId) : false;

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
      // 7 days: long enough for a full run lifecycle, short enough that a leaked
      // WhatsApp link does not stay a valid courier identity for a month.
      { expiresIn: '7d' }
    );
  } catch (err) {
    console.warn('⚠️ Could not sign mobileToken:', err?.message);
  }

  return {
    ...run,
    mobileToken,
    pinRequired,
    totalCODExpected: normalizeAmount(run.totalCODExpected),
    totalCODCollected: normalizeAmount(run.totalCODCollected),
    courier: {
      ...courierSafe,
      commissionAmount: normalizeAmount(run.courier?.commissionAmount)
    },
    shipments: (run.shipments || []).map((s) => ({
      ...s,
      order: s.order
        ? {
            ...s.order,
            items: (s.order.orderItems || []).map((item) => ({
              id: item.id,
              name: item.productName || 'منتج',
              quantity: item.quantity,
              price: normalizeAmount(item.price)
            }))
          }
        : null
    }))
  };
}

/**
 * Field Update: Courier records delivery attempt (Full delivery, partial, delay, or return)
 * - runId and courierId (when the caller is a field courier) are enforced as ownership filters
 * - shipments of SETTLED/CANCELLED runs are locked
 */
async function updateDeliveryRunShipment(companyId, { shipmentId, runId, status, collectedAmount, deliveryNotes, userId, courierId, pin }) {
  const prisma = getSharedPrismaClient();

  const normalizedStatus = String(status || '').toUpperCase();
  if (!ALLOWED_FIELD_STATUSES.includes(normalizedStatus)) {
    throw serviceError(`حالة تسليم غير معروفة: ${normalizedStatus || '(فارغة)'}`, 400);
  }

  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      companyId,
      ...(runId ? { deliveryRunId: runId } : {}),
      ...(courierId ? { courierId } : {})
    },
    include: {
      order: true,
      deliveryRun: true,
      courier: { select: { id: true, pinHash: true } }
    }
  });

  if (!shipment) {
    throw serviceError('الشحنة غير موجودة أو لا تتبع هذه المأمورية', 404);
  }

  if (
    shipment.settlementStatus === 'SETTLED' ||
    LOCKED_RUN_STATUSES.includes(shipment.deliveryRun?.status || '')
  ) {
    throw serviceError('لا يمكن تعديل شحنة بعد تسويتها ماليًا أو إلغاء مأموريتها', 409);
  }

  // 🔐 Field PIN: when the fleet setting requires it and the courier has a PIN set,
  // every field status update must carry the matching PIN — a leaked run link alone
  // can no longer flip deliveries.
  if (shipment.courierId && shipment.courier?.pinHash) {
    const pinRequired = await isCourierPinRequired(companyId, shipment.courierId);
    if (pinRequired) {
      const provided = String(pin || '').trim();
      if (!provided || !bcrypt.compareSync(provided, shipment.courier.pinHash)) {
        throw serviceError('رمز PIN مطلوب وغير صحيح', 403);
      }
    }
  }

  const updateData = {
    deliveryNotes: deliveryNotes?.trim() || shipment.deliveryNotes
  };

  const isDelivered = DELIVERED_STATUSES.includes(normalizedStatus) || normalizedStatus === 'PARTIALLY_DELIVERED';

  if (isDelivered) {
    updateData.status = 'DELIVERED';
    const orderTotal = normalizeAmount(shipment.order?.total);
    let cash = collectedAmount !== undefined ? normalizeAmount(collectedAmount) : orderTotal;
    // Collected cash can neither be negative nor exceed the order total
    cash = Math.max(0, orderTotal > 0 ? Math.min(cash, orderTotal) : cash);
    updateData.collectedAmount = cash;
    updateData.collectedAt = new Date();
  } else if (normalizedStatus === 'RETURNED' || normalizedStatus === 'FAILED') {
    updateData.status = 'RETURNED';
    const priorCollected = normalizeAmount(shipment.collectedAmount);
    // Never silently erase cash already collected — it stays on the shipment for reconciliation
    updateData.collectedAmount = priorCollected > 0 ? priorCollected : 0;
  } else {
    updateData.status = 'DELAYED';
  }

  return prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: updateData
    });

    if (shipment.orderId) {
      let orderStatus = 'OUT_FOR_DELIVERY';
      let customStatusCode = null;

      if (updateData.status === 'DELIVERED') {
        orderStatus = 'DELIVERED';
      } else if (updateData.status === 'RETURNED') {
        orderStatus = 'RETURNED';
      } else if (updateData.status === 'DELAYED') {
        orderStatus = 'OUT_FOR_DELIVERY';
        customStatusCode = 'DELAYED_WITH_CAPTAIN';
      }

      await tx.order.update({
        where: { id: shipment.orderId },
        data: {
          status: orderStatus,
          ...(customStatusCode ? { customStatusCode } : {})
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: shipment.orderId,
          status: orderStatus,
          oldStatus: shipment.order?.status || null,
          changedBy: userId || null,
          reason: `تحديث ميداني للشحنة عبر أسطول المناديب: ${updateData.status}`
        }
      });
    }

    // If all shipments in delivery run are resolved, check if run can be marked COMPLETED
    if (shipment.deliveryRunId && !LOCKED_RUN_STATUSES.includes(shipment.deliveryRun?.status || '')) {
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
    throw serviceError('تمت تسوية هذه الوردية وتوريدها بالفعل سابقاً', 409);
  }

  // 🛡️ Custody discipline: a run still holding parcels in the field cannot be closed —
  // the cash of undelivered parcels has no honest reconciliation yet.
  const pendingShipments = run.shipments.filter((s) =>
    ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PENDING'].includes(s.status)
  );
  if (pendingShipments.length > 0) {
    throw serviceError(
      `لا يمكن توريد الوردية وما زالت فيها ${pendingShipments.length} طرد في الميدان — سجل حالتها (تسليم/تأجيل/مرتجع) أولًا`,
      409
    );
  }

  // 💰 Backend-enforced remittance policies from the fleet app settings (no longer UI-only)
  const cashAmount = normalizeAmount(actualCashReceived);
  const expectedCash = run.shipments
    .filter((s) => DELIVERED_STATUSES.includes(s.status))
    .reduce(
      (sum, s) =>
        sum + (s.collectedAmount !== null && s.collectedAmount !== undefined ? normalizeAmount(s.collectedAmount) : normalizeAmount(s.order?.total)),
      0
    );
  const variance = Math.round((expectedCash - cashAmount) * 100) / 100;

  let remittancePolicy = {
    shortagePolicy: 'DEDUCT_FROM_COURIER',
    allowPartialRemittance: true,
    requireTreasuryNoteOnVariance: true
  };
  try {
    const fleetApp = await prisma.companyApp.findFirst({
      where: { companyId, app: { slug: 'internal-courier-fleet' } },
      select: { settings: true }
    });
    const installed = buildInstalledMarketplaceAppSettings('internal-courier-fleet', fleetApp?.settings || {}, {});
    if (installed?.remittance) {
      remittancePolicy = { ...remittancePolicy, ...installed.remittance };
    }
  } catch {
    // fall back to defaults
  }

  if (variance > 0.009) {
    if (remittancePolicy.allowPartialRemittance === false) {
      throw serviceError(
        `التوريد الجزئي معطل وفق إعدادات الأسطول — المطلوب توريد ${expectedCash} والمستلم فعليًا ${cashAmount}`,
        400
      );
    }
    if (remittancePolicy.shortagePolicy === 'HOLD_SETTLEMENT') {
      throw serviceError(`التسوية موقوفة بسبب عجز نقدي بقيمة ${variance} (سياسة HOLD_SETTLEMENT)`, 409);
    }
    if (remittancePolicy.requireTreasuryNoteOnVariance && !String(notes || '').trim()) {
      throw serviceError('مطلوب ملاحظة توضح سبب الفرق النقدي قبل إتمام التسوية (إعدادات الأسطول)', 400);
    }
  }

  return prisma.$transaction(async (tx) => {
    // Claim the run atomically BEFORE any money moves — two concurrent settles can never
    // both pass: only the first updateMany matching status != SETTLED flips the row.
    const claimed = await tx.deliveryRun.updateMany({
      where: { id: run.id, companyId, status: { notIn: ['SETTLED'] } },
      data: {
        status: 'SETTLED',
        settledAt: new Date(),
        settledBy: userId || null,
        totalCODCollected: cashAmount,
        notes: notes?.trim() || run.notes,
        treasuryAccountId: treasuryAccountId || null
      }
    });

    if (claimed.count === 0) {
      throw serviceError('تمت تسوية هذه الوردية وتوريدها بالفعل سابقاً', 409);
    }

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
    const deliveredShipments = run.shipments.filter((s) => DELIVERED_STATUSES.includes(s.status));
    const deliveredShipmentIds = deliveredShipments.map((s) => s.id);

    if (deliveredShipmentIds.length > 0) {
      await tx.shipment.updateMany({
        where: { id: { in: deliveredShipmentIds } },
        data: {
          settlementStatus: 'SETTLED',
          settledAt: new Date(),
          settledBy: userId || null
        }
      });

      // Order payment status must reflect what was actually collected, not blindly mark PAID:
      // full collection → COMPLETED, partial collection → PARTIALLY_PAID, nothing → untouched.
      const fullyCollectedOrderIds = deliveredShipments
        .filter((s) => s.orderId && normalizeAmount(s.collectedAmount) >= normalizeAmount(s.order?.total))
        .map((s) => s.orderId);
      const partiallyCollectedOrderIds = deliveredShipments
        .filter((s) => {
          if (!s.orderId) return false;
          const collected = normalizeAmount(s.collectedAmount);
          return collected > 0 && collected < normalizeAmount(s.order?.total);
        })
        .map((s) => s.orderId);

      if (fullyCollectedOrderIds.length > 0) {
        await tx.order.updateMany({
          where: { id: { in: fullyCollectedOrderIds } },
          data: { paymentStatus: 'COMPLETED' }
        });
      }

      if (partiallyCollectedOrderIds.length > 0) {
        await tx.order.updateMany({
          where: { id: { in: partiallyCollectedOrderIds } },
          data: { paymentStatus: 'PARTIALLY_PAID' }
        });
      }
    }

    // 2.5 Record the courier's commission payables (DUE) — previously the commission
    // fields were stored and displayed but never computed anywhere.
    let commissionTotal = 0;
    let commissionCount = 0;
    const courierCommissionType = run.courier?.commissionType;
    if (courierCommissionType && courierCommissionType !== 'SALARY_ONLY' && deliveredShipments.length > 0) {
      const perOrder = normalizeAmount(run.courier.commissionAmount);
      const commissionRows = deliveredShipments.map((s) => {
        let amount = 0;
        if (courierCommissionType === 'PERCENTAGE') {
          const base =
            s.collectedAmount !== null && s.collectedAmount !== undefined
              ? normalizeAmount(s.collectedAmount)
              : normalizeAmount(s.order?.total);
          amount = (base * perOrder) / 100;
        } else {
          amount = perOrder;
        }
        amount = Math.round(amount * 100) / 100;
        commissionTotal += amount;
        return {
          companyId,
          courierId: run.courierId,
          deliveryRunId: run.id,
          shipmentId: s.id,
          orderId: s.orderId || null,
          commissionType: courierCommissionType,
          amount,
          status: 'DUE',
          notes: `عمولة مأمورية ${run.runNumber}`
        };
      });
      commissionTotal = Math.round(commissionTotal * 100) / 100;
      if (commissionTotal > 0) {
        await tx.courierCommission.createMany({ data: commissionRows });
        commissionCount = commissionRows.length;
      }
    }

    // 2.6 RECORD_AS_EXPENSE shortage policy: book the cash shortage as a pending expense
    if (variance > 0.009 && remittancePolicy.shortagePolicy === 'RECORD_AS_EXPENSE' && treasuryAccountId) {
      await tx.companyExpense.create({
        data: {
          companyId,
          expenseNumber: `EXP-COURIER-${run.runNumber}`,
          title: `عجز نقدية مأمورية ${run.runNumber} - ${run.courier?.name || ''}`,
          amount: variance,
          treasuryAccountId,
          type: 'OPEX',
          beneficiary: run.courier?.name || null,
          status: 'PENDING',
          notes: notes?.trim() || null,
          createdById: userId || null
        }
      });
    }

    // 3. Attach the treasury transaction reference (run row already claimed as SETTLED above)
    const settledRun = await tx.deliveryRun.update({
      where: { id: run.id },
      data: {
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
      treasuryTransaction,
      commission: { total: commissionTotal, shipments: commissionCount, type: courierCommissionType || 'SALARY_ONLY' },
      reconciliation: { expectedCash, actualCash: cashAmount, variance }
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

  // Unsettled cash in delivered status — aggregated in the database instead of
  // streaming every unsettled row into JS (grows ~2,000 rows/day with delayed settlement)
  const [collectedAgg, fallbackAgg] = await Promise.all([
    prisma.shipment.aggregate({
      where: {
        companyId,
        courierId: { not: null },
        status: { in: DELIVERED_STATUSES },
        settlementStatus: { not: 'SETTLED' },
        collectedAmount: { not: null }
      },
      _sum: { collectedAmount: true }
    }),
    prisma.order.aggregate({
      where: {
        companyId,
        shipments: {
          some: {
            courierId: { not: null },
            status: { in: DELIVERED_STATUSES },
            settlementStatus: { not: 'SETTLED' },
            collectedAmount: null
          }
        }
      },
      _sum: { total: true }
    })
  ]);

  const totalCashAwaitingRemittance =
    normalizeAmount(collectedAgg._sum.collectedAmount) + normalizeAmount(fallbackAgg._sum.total);

  return {
    totalCouriers,
    activeCouriers,
    availableCouriers: Math.max(0, totalCouriers - activeCouriers),
    totalParcelsInField,
    totalExpectedCashInField,
    totalCashAwaitingRemittance
  };
}

/**
 * Set or clear a courier's field PIN (4-6 digits, stored as bcrypt hash).
 * Managers set it; couriers cannot see or retrieve it.
 */
async function setCourierPin(companyId, courierId, pin) {
  const prisma = getSharedPrismaClient();

  const courier = await prisma.courier.findFirst({ where: { id: courierId, companyId } });
  if (!courier) {
    throw serviceError('المندوب غير موجود', 404);
  }

  let pinHash = null;
  if (pin !== null && pin !== undefined && pin !== '') {
    const normalized = String(pin).trim();
    if (!/^\d{4,6}$/.test(normalized)) {
      throw serviceError('رمز PIN يجب أن يكون من 4 إلى 6 أرقام', 400);
    }
    pinHash = bcrypt.hashSync(normalized, 10);
  }

  await prisma.courier.update({
    where: { id: courierId },
    data: { pinHash }
  });

  return { courierId, pinSet: Boolean(pinHash) };
}

/**
 * Does this courier need a PIN for field updates? (fleet setting + courier has a PIN set)
 */
async function isCourierPinRequired(companyId, courierId) {
  try {
    const prisma = getSharedPrismaClient();
    const [courier, fleetApp] = await Promise.all([
      prisma.courier.findFirst({ where: { id: courierId, companyId }, select: { pinHash: true } }),
      prisma.companyApp.findFirst({
        where: { companyId, app: { slug: 'internal-courier-fleet' } },
        select: { settings: true }
      })
    ]);
    const installed = buildInstalledMarketplaceAppSettings('internal-courier-fleet', fleetApp?.settings || {}, {});
    return Boolean(installed?.fieldWorkflow?.requireCourierPin) && Boolean(courier?.pinHash);
  } catch {
    return false;
  }
}

/**
 * List courier commission ledger: per-courier DUE/PAID totals + paginated entries
 */
async function listCourierCommissions(companyId, { courierId, status, page = 1, limit = 20 } = {}) {
  const prisma = getSharedPrismaClient();

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const entryWhere = { companyId };
  if (courierId) entryWhere.courierId = courierId;
  if (status && status !== 'ALL') entryWhere.status = status;

  const [groups, total, entries] = await Promise.all([
    prisma.courierCommission.groupBy({
      by: ['courierId', 'status'],
      where: { companyId, ...(courierId ? { courierId } : {}) },
      _sum: { amount: true },
      _count: { _all: true }
    }),
    prisma.courierCommission.count({ where: entryWhere }),
    prisma.courierCommission.findMany({
      where: entryWhere,
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: {
        courier: { select: { id: true, name: true, phone: true } }
      }
    })
  ]);

  const courierIds = [...new Set(groups.map((g) => g.courierId))];
  const couriers = courierIds.length
    ? await prisma.courier.findMany({
        where: { companyId, id: { in: courierIds } },
        select: { id: true, name: true, phone: true }
      })
    : [];
  const courierById = new Map(couriers.map((c) => [c.id, c]));

  const summaryMap = new Map();
  for (const g of groups) {
    const row =
      summaryMap.get(g.courierId) ||
      { courierId: g.courierId, name: courierById.get(g.courierId)?.name || 'مندوب', phone: courierById.get(g.courierId)?.phone || null, dueAmount: 0, dueCount: 0, paidAmount: 0, paidCount: 0 };
    const amount = normalizeAmount(g._sum.amount);
    if (g.status === 'DUE') {
      row.dueAmount += amount;
      row.dueCount += g._count._all;
    } else if (g.status === 'PAID') {
      row.paidAmount += amount;
      row.paidCount += g._count._all;
    }
    summaryMap.set(g.courierId, row);
  }

  return {
    summary: [...summaryMap.values()].sort((a, b) => b.dueAmount - a.dueAmount),
    data: entries.map((e) => ({ ...e, amount: normalizeAmount(e.amount) })),
    pagination: { total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) || 1 }
  };
}

/**
 * Pay out a courier's DUE commissions. When a treasury account is supplied the payout
 * is booked as a WITHDRAWAL from that account; otherwise it is marked paid off-books.
 */
async function payCourierCommissions(companyId, courierId, { treasuryAccountId, userId, notes } = {}) {
  const prisma = getSharedPrismaClient();

  return prisma.$transaction(async (tx) => {
    const courier = await tx.courier.findFirst({ where: { id: courierId, companyId } });
    if (!courier) {
      throw serviceError('المندوب غير موجود', 404);
    }

    const dueEntries = await tx.courierCommission.findMany({
      where: { companyId, courierId, status: 'DUE' }
    });
    if (dueEntries.length === 0) {
      throw serviceError('لا توجد مستحقات غير مدفوعة لهذا المندوب', 400);
    }

    const total = Math.round(dueEntries.reduce((sum, e) => sum + normalizeAmount(e.amount), 0) * 100) / 100;

    let treasuryTransaction = null;
    if (treasuryAccountId) {
      const account = await tx.treasuryAccount.findFirst({
        where: { id: treasuryAccountId, companyId }
      });
      if (!account) {
        throw serviceError('حساب الخزينة المحدد غير موجود أو غير تابع للشركة', 400);
      }

      const previousBalance = normalizeAmount(account.balance);
      const newBalance = previousBalance - total;
      await tx.treasuryAccount.update({
        where: { id: treasuryAccountId },
        data: { balance: newBalance }
      });
      treasuryTransaction = await tx.treasuryTransaction.create({
        data: {
          companyId,
          treasuryAccountId,
          amount: total,
          type: 'WITHDRAWAL',
          runningBalance: newBalance,
          referenceType: 'COURIER_COMMISSION_PAYOUT',
          referenceId: courierId,
          description: `صرف مستحقات عمولات المندوب ${courier.name}${notes ? ` - ${notes}` : ''}`,
          createdById: userId || null,
          date: new Date()
        }
      });
    }

    const paid = await tx.courierCommission.updateMany({
      where: { companyId, courierId, status: 'DUE' },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidBy: userId || null,
        ...(treasuryTransaction ? { notes: `صرفت عبر الخزينة (${treasuryTransaction.id})` } : {})
      }
    });

    return {
      courierId,
      courierName: courier.name,
      paidCount: paid.count,
      total,
      treasuryTransaction
    };
  });
}

/**
 * Time-ranged courier performance report. Movement window is shipment.updatedAt
 * (the last field transition), and collected cash is summed from collectedAmount.
 */
async function getCouriersPerformance(companyId, { from, to } = {}) {
  const prisma = getSharedPrismaClient();

  const range = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(to);
  const hasRange = Boolean(from || to);
  const updatedWhere = hasRange ? { updatedAt: range } : {};

  const baseWhere = { companyId, courierId: { not: null }, ...updatedWhere };

  const [deliveredGroups, returnedGroups, openGroups, couriers] = await Promise.all([
    prisma.shipment.groupBy({
      by: ['courierId'],
      where: { ...baseWhere, status: { in: DELIVERED_STATUSES } },
      _count: { _all: true },
      _sum: { collectedAmount: true }
    }),
    prisma.shipment.groupBy({
      by: ['courierId'],
      where: { ...baseWhere, status: { in: ['RETURNED', 'FAILED', 'CANCELLED'] } },
      _count: { _all: true }
    }),
    prisma.shipment.groupBy({
      by: ['courierId'],
      where: { ...baseWhere, status: { in: ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PENDING', 'DELAYED'] } },
      _count: { _all: true }
    }),
    prisma.courier.findMany({
      where: { companyId },
      select: { id: true, name: true, phone: true, isActive: true }
    })
  ]);

  const deliveredByCourier = new Map(deliveredGroups.map((g) => [g.courierId, g]));
  const returnedByCourier = new Map(returnedGroups.map((g) => [g.courierId, g]));
  const openByCourier = new Map(openGroups.map((g) => [g.courierId, g]));

  const rows = couriers.map((c) => {
    const delivered = deliveredByCourier.get(c.id)?._count._all || 0;
    const returned = returnedByCourier.get(c.id)?._count._all || 0;
    const open = openByCourier.get(c.id)?._count._all || 0;
    const collectedCash = normalizeAmount(deliveredByCourier.get(c.id)?._sum.collectedAmount);
    const finished = delivered + returned;
    return {
      courierId: c.id,
      name: c.name,
      phone: c.phone,
      isActive: c.isActive,
      deliveredCount: delivered,
      returnedCount: returned,
      openCount: open,
      collectedCash,
      successRate: finished > 0 ? Math.round((delivered / finished) * 100) : null
    };
  });

  rows.sort((a, b) => b.deliveredCount - a.deliveredCount);

  return {
    range: { from: from || null, to: to || null },
    totals: {
      delivered: rows.reduce((s, r) => s + r.deliveredCount, 0),
      returned: rows.reduce((s, r) => s + r.returnedCount, 0),
      collectedCash: Math.round(rows.reduce((s, r) => s + r.collectedCash, 0) * 100) / 100
    },
    rows
  };
}

module.exports = {
  listCouriers,
  getCourierById,
  createCourier,
  updateCourier,
  deleteCourier,
  setCourierPin,
  isCourierPinRequired,
  createDeliveryRun,
  listDeliveryRuns,
  getDeliveryRunById,
  updateDeliveryRunShipment,
  settleDeliveryRun,
  getCourierDashboardSummary,
  listCourierCommissions,
  payCourierCommissions,
  getCouriersPerformance
};
