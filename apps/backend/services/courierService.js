const { getSharedPrismaClient } = require('./sharedDatabase');
const { recordShipmentEvent } = require('./shipping/shipmentEventService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getJwtSecret } = require('../utils/jwtSecret');
const { buildInstalledMarketplaceAppSettings } = require('../utils/marketplaceAppSettings');
const { notifyRunDispatched, notifyFieldUpdate, sendCourierNotification, COURIER_NOTIFICATION_EVENTS } = require('./courierNotificationService');

const DELIVERED_STATUSES = ['DELIVERED', 'COMPLETED', 'REMITTED'];

// Field-facing statuses a courier may set — anything else is rejected instead of stored verbatim
const ALLOWED_FIELD_STATUSES = ['DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'REMITTED', 'RETURNED', 'FAILED', 'DELAYED'];

// Run states whose shipments are financially or operationally closed
const LOCKED_RUN_STATUSES = ['SETTLED', 'CANCELLED'];

const serviceError = (message, statusCode, code) => {
  const err = new Error(message);
  if (statusCode) err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
};

const normalizeAmount = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

function formatCourier(courier) {
  if (!courier) return null;
  let parsedGovernorates = null;
  if (courier.governorates) {
    if (Array.isArray(courier.governorates)) {
      parsedGovernorates = courier.governorates;
    } else if (typeof courier.governorates === 'string') {
      const trimmed = courier.governorates.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsedGovernorates = parsed;
          }
        } catch (_) {}
      }
      if (!parsedGovernorates) {
        parsedGovernorates = trimmed.split(/[,،]+/).map((g) => g.trim()).filter(Boolean);
      }
    }
  }

  return {
    ...courier,
    governorates: parsedGovernorates,
    commissionAmount: normalizeAmount(courier.commissionAmount),
    salaryBase: courier.salaryBase !== null && courier.salaryBase !== undefined ? normalizeAmount(courier.salaryBase) : null,
    bonusPerOrder: courier.bonusPerOrder !== null && courier.bonusPerOrder !== undefined ? normalizeAmount(courier.bonusPerOrder) : null,
    bonusStartsAfterOrders: courier.bonusStartsAfterOrders !== null && courier.bonusStartsAfterOrders !== undefined ? Number(courier.bonusStartsAfterOrders) : null,
    documentsStatus: courier.documentsStatus || 'INCOMPLETE',
    hireDate: courier.hireDate || null,
    compensationModel: courier.compensationModel || (courier.commissionType === 'SALARY_ONLY' ? 'SALARY_ONLY' : 'COMMISSION_ONLY'),
    bonusTiers: courier.bonusTiers || null
  };
}

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
      ...formatCourier(courier),
      commissionAmount: normalizeAmount(courier.commissionAmount),
    salaryBase: courier.salaryBase !== null && courier.salaryBase !== undefined ? normalizeAmount(courier.salaryBase) : null,
    bonusPerOrder: courier.bonusPerOrder !== null && courier.bonusPerOrder !== undefined ? normalizeAmount(courier.bonusPerOrder) : null,
    bonusStartsAfterOrders: courier.bonusStartsAfterOrders !== null && courier.bonusStartsAfterOrders !== undefined ? Number(courier.bonusStartsAfterOrders) : null,
    documentsStatus: courier.documentsStatus || 'INCOMPLETE',
    hireDate: courier.hireDate || null,
    compensationModel: courier.compensationModel || (courier.commissionType === 'SALARY_ONLY' ? 'SALARY_ONLY' : 'COMMISSION_ONLY'),
    bonusTiers: courier.bonusTiers || null,
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

  return formatCourier(courier);
}

/**
 * Create a new internal courier
 */
async function createCourier(companyId, data) {
  const prisma = getSharedPrismaClient();

  let resolvedGovernorates = data.governorates;
  if (resolvedGovernorates === undefined && data.governorate !== undefined) {
    resolvedGovernorates = Array.isArray(data.governorate) ? data.governorate : [data.governorate];
  }

  let storedGovernorates = null;
  if (resolvedGovernorates !== undefined && resolvedGovernorates !== null) {
    if (typeof resolvedGovernorates === 'object') {
      storedGovernorates = JSON.stringify(resolvedGovernorates);
    } else if (typeof resolvedGovernorates === 'string') {
      const trimmed = resolvedGovernorates.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        storedGovernorates = trimmed;
      } else {
        const list = trimmed.split(/[,،]+/).map((g) => g.trim()).filter(Boolean);
        storedGovernorates = JSON.stringify(list);
      }
    }
  }

  const parseHireDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const created = await prisma.courier.create({
    data: {
      companyId,
      name: data.name?.trim(),
      phone: data.phone?.trim(),
      nationalId: data.nationalId?.trim() || null,
      vehicleType: data.vehicleType || 'MOTORCYCLE',
      plateNumber: data.plateNumber?.trim() || null,
      governorates: storedGovernorates,
      commissionType: data.commissionType || 'FIXED_PER_ORDER',
      commissionAmount: normalizeAmount(data.commissionAmount),
      isActive: data.isActive !== false,
      documentsStatus: data.documentsStatus || 'INCOMPLETE',
      hireDate: parseHireDate(data.hireDate),
      salaryBase: data.salaryBase !== undefined && data.salaryBase !== null ? normalizeAmount(data.salaryBase) : null,
      compensationModel: data.compensationModel || (data.commissionType === 'SALARY_ONLY' ? 'SALARY_ONLY' : 'COMMISSION_ONLY'),
      bonusPerOrder: data.bonusPerOrder !== undefined && data.bonusPerOrder !== null ? normalizeAmount(data.bonusPerOrder) : null,
      bonusStartsAfterOrders: data.bonusStartsAfterOrders !== undefined && data.bonusStartsAfterOrders !== null ? parseInt(data.bonusStartsAfterOrders, 10) : null,
      bonusTiers: data.bonusTiers ? (typeof data.bonusTiers === 'object' ? JSON.stringify(data.bonusTiers) : String(data.bonusTiers)) : null,
      status: data.status || 'AVAILABLE',
      notes: data.notes?.trim() || null,
      userId: data.userId || null
    }
  });

  return formatCourier(created);
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

  let resolvedGovernorates = data.governorates;
  if (resolvedGovernorates === undefined && data.governorate !== undefined) {
    resolvedGovernorates = Array.isArray(data.governorate) ? data.governorate : [data.governorate];
  }
  if (resolvedGovernorates !== undefined) {
    if (resolvedGovernorates === null) {
      updateData.governorates = null;
    } else if (typeof resolvedGovernorates === 'object') {
      updateData.governorates = JSON.stringify(resolvedGovernorates);
    } else if (typeof resolvedGovernorates === 'string') {
      const trimmed = resolvedGovernorates.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        updateData.governorates = trimmed;
      } else {
        const list = trimmed.split(/[,،]+/).map((g) => g.trim()).filter(Boolean);
        updateData.governorates = JSON.stringify(list);
      }
    }
  }

  if (data.commissionType !== undefined) updateData.commissionType = data.commissionType;
  if (data.commissionAmount !== undefined) updateData.commissionAmount = normalizeAmount(data.commissionAmount);
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
  if (data.userId !== undefined) updateData.userId = data.userId || null;
  if (data.documentsStatus !== undefined) updateData.documentsStatus = data.documentsStatus;
  if (data.hireDate !== undefined) {
    if (!data.hireDate) {
      updateData.hireDate = null;
    } else {
      const parsed = new Date(data.hireDate);
      updateData.hireDate = isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  if (data.salaryBase !== undefined) updateData.salaryBase = data.salaryBase !== null ? normalizeAmount(data.salaryBase) : null;
  if (data.compensationModel !== undefined) updateData.compensationModel = data.compensationModel;
  if (data.bonusPerOrder !== undefined) updateData.bonusPerOrder = data.bonusPerOrder !== null ? normalizeAmount(data.bonusPerOrder) : null;
  if (data.bonusStartsAfterOrders !== undefined) updateData.bonusStartsAfterOrders = data.bonusStartsAfterOrders !== null ? parseInt(data.bonusStartsAfterOrders, 10) : null;
  if (data.bonusTiers !== undefined) {
    updateData.bonusTiers = data.bonusTiers ? (typeof data.bonusTiers === 'object' ? JSON.stringify(data.bonusTiers) : String(data.bonusTiers)) : null;
  }

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
async function createDeliveryRun(companyId, { courierId, shipmentIds, orderIds, notes, userId, allowUnverifiedCouriers }) {
  const prisma = getSharedPrismaClient();

  const courier = await prisma.courier.findFirst({
    where: { id: courierId, companyId }
  });

  if (!courier) {
    throw new Error('المندوب غير موجود أو لا يتبع هذه الشركة');
  }

  // Resolve target shipments: either directly by shipmentIds or by orderIds
  // 🛡️ Business Rule: Documents verification check before field assignment
  if (courier.documentsStatus !== 'VERIFIED') {
    const fleetApp = await prisma.installedApp.findFirst({
      where: { companyId, appId: 'internal-courier-fleet' },
      select: { settings: true }
    });
    const installed = buildInstalledMarketplaceAppSettings('internal-courier-fleet', fleetApp?.settings || {}, {});
    const isPolicyAllowed = Boolean(
      allowUnverifiedCouriers ||
      installed?.general?.allowUnverifiedCouriers ||
      installed?.allowUnverifiedCouriers ||
      fleetApp?.settings?.general?.allowUnverifiedCouriers ||
      fleetApp?.settings?.allowUnverifiedCouriers
    );

    if (!isPolicyAllowed) {
      throw serviceError(
        `لا يمكن إسناد مأمورية للمندوب "${courier.name}" لعدم اكتمال واعتماد مستنداته (حالة المستندات: ${courier.documentsStatus || 'غير معتمد'}). يرجى اعتماد البطاقة ووصل الأمانة أولاً أو تفعيل سياسة السماح بالمناديب غير المعتمدين في إعدادات الأسطول.`,
        400,
        'UNVERIFIED_COURIER'
      );
    }
  }

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
    include: {
      order: {
        select: {
          id: true,
          total: true,
          status: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true
        }
      }
    }
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

  // ✈️ International customs acknowledgment guard (SHIP-T4)
  // شحنة دولية لا تخرج للرحلة قبل intlAckStatus=APPROVED (رفض 409 بسبب INTL_ACK_PENDING)
  const unapprovedIntl = shipments.filter(
    (s) => s.isInternational && s.intlAckStatus !== 'APPROVED'
  );
  if (unapprovedIntl.length > 0) {
    const samples = unapprovedIntl
      .slice(0, 5)
      .map((s) => s.trackingNumber || s.id)
      .join('، ');
    throw serviceError(
      `لا يمكن إسناد شحنة دولية لرحلة توزيع قبل الموافقة على الإقرار الجمركي: ${samples}`,
      409,
      'INTL_ACK_PENDING'
    );
  }

  const totalCODExpected = shipments.reduce(
    (sum, s) => sum + normalizeAmount(s.order?.total),
    0
  );

  const runNumber = await generateRunNumber(prisma, companyId);

  // 🔑 OTP delivery proof: populated inside the transaction below, read by the
  // post-commit dispatch notification. Declared here so it outlives the tx callback.
  const otpByShipment = new Map();

  // Execute in interactive transaction for atomic integrity
  const deliveryRun = await prisma.$transaction(async (tx) => {
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

    // 🔑 OTP delivery proof: a 4-digit code texted to the customer on dispatch;
    // marking the parcel DELIVERED requires this code when the setting is on.
    for (const s of shipments) {
      if (!s.order?.customerPhone) continue;
      const otp = String(crypto.randomInt(1000, 10000));
      otpByShipment.set(s.id, otp);
      await tx.shipment.update({
        where: { id: s.id },
        data: {
          otpHash: bcrypt.hashSync(otp, 10),
          otpExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }

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

  // 📣 Customer WhatsApp notifications after the dispatch commits — fire-and-forget,
  // gated by fleet settings + the company's WhatsApp notification settings.
  notifyRunDispatched(companyId, { run: deliveryRun, shipments, courier, otpByShipment });

  return deliveryRun;
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
  // OTP delivery proof gating: exposed so the mobile page collects the customer's code
  const otpRequired = await isDeliveryOtpRequired(companyId);

  let mobileToken = null;
  try {
    mobileToken = jwt.sign(
      {
        role: 'COURIER',
        // verifyToken requires a subject (id/userId) BEFORE dispatching to the COURIER
        // branch — without it every mobile link 401s with INVALID_TOKEN_PAYLOAD
        id: run.courierId,
        userId: run.courierId,
        courierId: run.courierId,
        runId: run.id,
        companyId: run.companyId,
        mobileTokenVersion: run.mobileTokenVersion || 0,
        linkToken: true
      },
      getJwtSecret(),
      // 72 hours: shortened from 7 days, revokable via mobileTokenVersion
      { expiresIn: '72h' }
    );
  } catch (err) {
    console.warn('⚠️ Could not sign mobileToken:', err?.message);
  }

  return {
    ...run,
    mobileToken,
    pinRequired,
    otpRequired,
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
async function updateDeliveryRunShipment(companyId, { shipmentId, runId, status, collectedAmount, deliveryNotes, userId, courierId, pin, otp, failureReasonCode, nextAttemptDate, localId }) {
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
      courier: { select: { id: true, pinHash: true, name: true, phone: true } }
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

  // 🔑 OTP delivery proof (SHIP-W11 / SHP-21/22)
  if (isDelivered) {
    const otpRequired = await isDeliveryOtpRequired(companyId);
    if (otpRequired) {
      const providedOtp = String(otp || '').trim();
      if (!providedOtp) {
        throw serviceError('كود الاستلام مطلوب لإتمام التسليم', 400, 'OTP_REQUIRED');
      }

      // 5 wrong attempts guard & 30-min auto unlock
      const currentAttempts = shipment.otpAttempts || 0;
      if (currentAttempts >= 5) {
        const now = new Date();
        if (shipment.otpLockedUntil && new Date(shipment.otpLockedUntil) <= now) {
          // 30 min passed -> auto unlock
          await prisma.shipment.update({
            where: { id: shipmentId },
            data: { otpAttempts: 0, otpLockedUntil: null }
          });
          shipment.otpAttempts = 0;
          shipment.otpLockedUntil = null;
        } else {
          throw serviceError('تم قفل إدخال الكود لتجاوز 5 محاولات خاطئة (OTP_LOCKED)', 429, 'OTP_LOCKED');
        }
      }

      const otpExpired = shipment.otpExpiresAt && new Date(shipment.otpExpiresAt) < new Date();
      if (otpExpired) {
        throw serviceError('انتهت صلاحية كود الاستلام — اطلب من المدير إعادة إرسال كود جديد', 409, 'OTP_EXPIRED');
      }

      const isMatch = Boolean(shipment.otpHash && bcrypt.compareSync(providedOtp, shipment.otpHash));
      if (!isMatch) {
        const newAttempts = (shipment.otpAttempts || 0) + 1;
        const isNowLocked = newAttempts >= 5;
        const lockUntil = isNowLocked ? new Date(Date.now() + 30 * 60 * 1000) : null;

        await prisma.shipment.update({
          where: { id: shipmentId },
          data: {
            otpAttempts: newAttempts,
            ...(lockUntil ? { otpLockedUntil: lockUntil } : {})
          }
        });

        if (isNowLocked) {
          throw serviceError('تم قفل إدخال الكود لتجاوز 5 محاولات خاطئة (OTP_LOCKED)', 429, 'OTP_LOCKED');
        }

        const attemptsLeft = Math.max(0, 5 - newAttempts);
        throw serviceError(`كود الاستلام غير صحيح (OTP_INVALID) — متبقي ${attemptsLeft} محاولة`, 400, 'OTP_INVALID');
      }

      updateData.otpAttempts = 0;
      updateData.otpLockedUntil = null;
    }
  }

  if (isDelivered) {
    updateData.status = 'DELIVERED';
    const orderTotal = normalizeAmount(shipment.order?.total);
    let cash = collectedAmount !== undefined ? normalizeAmount(collectedAmount) : orderTotal;
    // Collected cash can neither be negative nor exceed the order total
    cash = Math.max(0, orderTotal > 0 ? Math.min(cash, orderTotal) : cash);
    updateData.collectedAmount = cash;
    updateData.collectedAt = new Date();
    updateData.otpAttempts = 0;
  } else if (normalizedStatus === 'RETURNED' || normalizedStatus === 'FAILED') {
    updateData.status = normalizedStatus === 'FAILED' ? 'FAILED' : 'RETURNED';
    const priorCollected = normalizeAmount(shipment.collectedAmount);
    // Never silently erase cash already collected — it stays on the shipment for reconciliation
    updateData.collectedAmount = priorCollected > 0 ? priorCollected : 0;

    if (normalizedStatus === 'RETURNED') {
      try {
        const policyService = require('./shipping/policyService');
        const policy = await policyService.getPolicy(companyId, prisma);
        if (policy?.rtoChargeReturnLeg) {
          const rtoPrice = Number(policy.rtoReturnLegPrice !== null && policy.rtoReturnLegPrice !== undefined ? policy.rtoReturnLegPrice : 0);
          updateData.rtoCost = rtoPrice;
          const currentCost = Number(shipment.cost || 0);
          const courierCost = Number(shipment.courierCost || 0);
          updateData.marginAmount = Math.round((currentCost - rtoPrice - courierCost) * 100) / 100;
        }
      } catch (rtoErr) {
        console.warn('⚠️ [COURIER-SERVICE] Error applying RTO cost on return:', rtoErr.message);
      }
    }

    if (normalizedStatus === 'FAILED') {
      const cleanReason = String(failureReasonCode || '').trim();
      if (!cleanReason) {
        throw serviceError('سبب الفشل مطلوب عند تسجيل عدم التسليم (FAILED)', 400, 'FAILURE_REASON_REQUIRED');
      }
      updateData.failureReasonCode = cleanReason;
      updateData.attemptCount = { increment: 1 };

      let calculatedNextAttempt = nextAttemptDate ? new Date(nextAttemptDate) : null;
      if (!calculatedNextAttempt) {
        let requiresReschedule = true;
        if (failureReasonCode) {
          const reason = await prisma.deliveryFailureReason.findFirst({
            where: { companyId, code: String(failureReasonCode).trim() }
          });
          if (reason) {
            requiresReschedule = Boolean(reason.requiresReschedule);
          } else if (String(failureReasonCode).trim() === 'REFUSED') {
            requiresReschedule = false;
          }
        }
        if (requiresReschedule) {
          calculatedNextAttempt = new Date(Date.now() + 24 * 3600 * 1000);
        }
      }
      if (calculatedNextAttempt) {
        updateData.nextAttemptDate = calculatedNextAttempt;
      }
    }
  } else {
    updateData.status = 'DELAYED';
  }

  return prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: updateData
    });

    const eventMetadata = {};
    if (localId) eventMetadata.localId = localId;
    if (failureReasonCode) eventMetadata.failureReasonCode = failureReasonCode;
    if (normalizedStatus === 'FAILED') {
      eventMetadata.attemptCount = (shipment.attemptCount || 0) + 1;
    }
    if (updateData.nextAttemptDate) {
      eventMetadata.nextAttemptDate = updateData.nextAttemptDate;
    }

    await recordShipmentEvent(tx, {
      companyId,
      shipmentId,
      fromStatus: shipment.status,
      toStatus: updateData.status,
      reasonCode: failureReasonCode || null,
      notes: deliveryNotes?.trim() || null,
      actorType: 'COURIER',
      actorId: courierId || userId || null,
      actorName: shipment.courier?.name || null,
      metadata: Object.keys(eventMetadata).length > 0 ? eventMetadata : null,
    });

    if (shipment.orderId) {
      const { syncNetworkShipmentToStore } = require('./shipping/networkShipmentSyncService');
      const networkSync = await syncNetworkShipmentToStore(tx, shipment, updateData.status, {
        actorId: courierId || userId || null,
        actorType: 'COURIER',
            reason: `تحديث ميداني للشحنة عبر أسطول المناديب: ${updateData.status}`,
      }).catch((err) => {
        console.warn('⚠️ [COURIER_SERVICE] Network sync notice:', err.message);
        return { success: false, skipped: true };
      });

      if (networkSync?.skipped) {
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
        }).catch(() => {});

        await tx.orderStatusHistory.create({
          data: {
            orderId: shipment.orderId,
            status: orderStatus,
            oldStatus: shipment.order?.status || null,
            changedBy: userId || null,
            reason: `تحديث ميداني للشحنة عبر أسطول المناديب: ${updateData.status}`,
          }
        }).catch(() => {});
      }
    }

    if (isDelivered) {
      try {
        const { applyProfitToShipment } = require('./shipping/profitService');
        await applyProfitToShipment(tx, shipmentId);
      try {
        const { ensureShipmentFeedbackToken } = require('./shipping/feedbackService');
        await ensureShipmentFeedbackToken(tx, companyId, shipmentId, { channel: 'WHATSAPP' });
      } catch (feedbackErr) {
        console.warn('⚠️ [COURIER_SERVICE] Feedback token creation warning:', feedbackErr.message);
      }
      } catch (profitErr) {
        console.warn('⚠️ [COURIER_SERVICE] Profit calculation warning:', profitErr.message);
      }
    } else if (updateData.status === 'RETURNED') {
      try {
        const policyService = require('./shipping/policyService');
        const policy = await policyService.getPolicy(companyId, tx);
        if (policy?.rtoChargeReturnLeg) {
          const rtoPrice = Number(policy.rtoReturnLegPrice !== null && policy.rtoReturnLegPrice !== undefined ? policy.rtoReturnLegPrice : 0);
          const currentCost = Number(shipment.cost || 0);
          const courierCost = Number(updatedShipment.courierCost || 0);
          const marginAmount = Math.round((currentCost - rtoPrice - courierCost) * 100) / 100;

          await tx.shipment.update({
            where: { id: shipmentId },
            data: {
              rtoCost: rtoPrice,
              marginAmount
            }
          });

          const existingRtoEvent = await tx.shipmentEvent.findFirst({
            where: {
              shipmentId,
              reasonCode: 'RTO_COST_APPLIED'
            }
          });

          if (!existingRtoEvent) {
            const { recordShipmentEvent } = require('./shipping/shipmentEventService');
            await recordShipmentEvent(tx, {
              companyId,
              shipmentId,
              fromStatus: shipment.status,
              toStatus: 'RETURNED',
              reasonCode: 'RTO_COST_APPLIED',
              notes: `تطبيق تكلفة رحلة العودة (RTO): ${rtoPrice} ج.م`,
              actorType: 'COURIER',
              metadata: {
                rtoCost: rtoPrice,
                marginAmount,
                courierCost
              }
            });
          }
        }
      } catch (rtoErr) {
        console.warn('⚠️ [COURIER_SERVICE] RTO cost apply notice:', rtoErr.message);
      }
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

  // 📣 Customer WhatsApp notification for delivery/return — post-commit, fire-and-forget
  notifyFieldUpdate(companyId, {
    status: updateData.status,
    order: shipment.order,
    courier: shipment.courier,
    collectedAmount: updateData.collectedAmount,
    reason: deliveryNotes?.trim() || ''
  });

  return updatedShipment;
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

  // Auto-resolve treasury account if not explicitly passed and cash was collected
  let resolvedTreasuryAccountId = treasuryAccountId || null;
  if (!resolvedTreasuryAccountId && cashAmount > 0) {
    const existingTreasury = await prisma.treasuryAccount.findFirst({
      where: { companyId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
    });
    if (existingTreasury) {
      resolvedTreasuryAccountId = existingTreasury.id;
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
        treasuryAccountId: resolvedTreasuryAccountId
      }
    });

    if (claimed.count === 0) {
      throw serviceError('تمت تسوية هذه الوردية وتوريدها بالفعل سابقاً', 409);
    }

    let treasuryTransaction = null;

    // 1. If Treasury Account is provided (or auto-resolved) and cash is received, deposit into TreasuryAccount
    if (resolvedTreasuryAccountId && cashAmount > 0) {
      const account = await tx.treasuryAccount.findFirst({
        where: { id: resolvedTreasuryAccountId, companyId }
      });

      if (!account) {
        throw new Error('حساب الخزينة المحدد غير موجود أو غير تابع للشركة');
      }

      // Atomic balance move — two runs settling concurrently on the same treasury
      // account must never read-then-write over each other's deposit.
      const updatedAccount = await tx.treasuryAccount.update({
        where: { id: resolvedTreasuryAccountId },
        data: { balance: { increment: cashAmount } }
      });
      const newBalance = normalizeAmount(updatedAccount.balance);

      // Create TreasuryTransaction audit record
      treasuryTransaction = await tx.treasuryTransaction.create({
        data: {
          companyId,
          treasuryAccountId: resolvedTreasuryAccountId,
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
 * Is OTP delivery proof enabled for this company? (fleet setting fieldWorkflow.requireDeliveryOtp)
 */
async function isDeliveryOtpRequired(companyId) {
  try {
    const prisma = getSharedPrismaClient();
    const policy = await prisma.shippingPolicySettings.findUnique({
      where: { companyId },
      select: { requireDeliveryOtp: true }
    });
    if (policy && policy.requireDeliveryOtp !== null && policy.requireDeliveryOtp !== undefined) {
      if (Boolean(policy.requireDeliveryOtp)) return true;
    }
    const fleetApp = await prisma.companyApp.findFirst({
      where: { companyId, app: { slug: 'internal-courier-fleet' } },
      select: { settings: true }
    });
    const installed = buildInstalledMarketplaceAppSettings('internal-courier-fleet', fleetApp?.settings || {}, {});
    return Boolean(installed?.fieldWorkflow?.requireDeliveryOtp);
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

      // Atomic balance move — concurrent payouts on the same treasury account
      // must never read-then-write over each other's withdrawal.
      const updatedAccount = await tx.treasuryAccount.update({
        where: { id: treasuryAccountId },
        data: { balance: { decrement: total } }
      });
      const newBalance = normalizeAmount(updatedAccount.balance);
      await tx.treasuryTransaction.create({
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

/**
 * Reassign internal-courier shipments to another courier. Settled parcels and parcels
 * inside settled/cancelled runs are rejected; the parcels detach from their manifest
 * (the target courier's next run picks them up) and manifest counters are refreshed.
 * The customer's delivery OTP travels with the parcel — the code belongs to the order.
 */
async function reassignShipments(companyId, { shipmentIds, toCourierId, userId }) {
  const prisma = getSharedPrismaClient();

  if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
    throw serviceError('حدد طرودًا لإعادة الإسناد', 400);
  }

  const target = await prisma.courier.findFirst({
    where: { id: toCourierId, companyId, isActive: true }
  });
  if (!target) {
    throw serviceError('المندوب الجديد غير موجود أو غير نشط', 404);
  }

  const shipments = await prisma.shipment.findMany({
    where: { companyId, id: { in: shipmentIds }, carrierType: 'INTERNAL_COURIER' },
    include: { deliveryRun: { select: { id: true, status: true } } }
  });
  if (shipments.length === 0) {
    throw serviceError('لا توجد طرود داخلية مطابقة لإعادة الإسناد', 404);
  }

  const blocked = shipments.filter(
    (s) =>
      s.settlementStatus === 'SETTLED' ||
      ['SETTLED', 'CANCELLED'].includes(s.deliveryRun?.status || '')
  );
  if (blocked.length > 0) {
    throw serviceError('لا يمكن إعادة إسناد طرود مسوّاة ماليًا أو داخل ورديات مقفولة', 409);
  }

  const sourceRunIds = [...new Set(shipments.map((s) => s.deliveryRunId).filter(Boolean))];

  await prisma.$transaction(async (tx) => {
    await tx.shipment.updateMany({
      where: { companyId, id: { in: shipments.map((s) => s.id) } },
      data: { courierId: toCourierId, deliveryRunId: null }
    });

    // Refresh stored manifest counters of the source runs
    for (const runId of sourceRunIds) {
      const remaining = await tx.shipment.count({ where: { deliveryRunId: runId } });
      await tx.deliveryRun.update({
        where: { id: runId },
        data: { totalShipments: remaining }
      });
    }

    await tx.courier.update({
      where: { id: toCourierId },
      data: { status: 'ON_DUTY' }
    });
  });

  return {
    moved: shipments.length,
    toCourier: { id: target.id, name: target.name }
  };
}

/**
 * Regenerate + resend the delivery OTP for a parcel (managers). This is the escape
 * hatch when the WhatsApp message failed (no session, wrong number) and the courier
 * is locked out of marking the parcel DELIVERED — without it, an OTP parcel whose
 * message was lost can never be delivered. Runs synchronously so the manager sees
 * the real send result, resets the wrong-attempt counter, and voids the old code.
 */
async function resendShipmentOtp(companyId, { shipmentId, userId }) {
  const prisma = getSharedPrismaClient();

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, companyId, carrierType: 'INTERNAL_COURIER' },
    include: {
      order: { select: { id: true, orderNumber: true, customerName: true, customerPhone: true, total: true } },
      courier: { select: { id: true, name: true, phone: true } },
      deliveryRun: { select: { id: true, status: true, runNumber: true } }
    }
  });

  if (!shipment) {
    throw serviceError('الشحنة غير موجودة', 404);
  }
  if (shipment.settlementStatus === 'SETTLED' || LOCKED_RUN_STATUSES.includes(shipment.deliveryRun?.status || '')) {
    throw serviceError('لا يمكن إعادة إرسال كود لشحنة بعد تسويتها ماليًا أو إلغاء مأموريتها', 409);
  }
  if (DELIVERED_STATUSES.includes(shipment.status)) {
    throw serviceError('الطرد تم تسليمه بالفعل — لا حاجة لكود جديد', 409);
  }
  if (!shipment.order?.customerPhone) {
    throw serviceError('الطلب بلا رقم هاتف — لا يمكن إرسال كود استلام', 400);
  }

  const otp = String(crypto.randomInt(1000, 10000));
  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      otpHash: bcrypt.hashSync(otp, 10),
      otpExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      otpAttempts: 0,
      otpLockedUntil: null
    }
  });

  // Synchronous send so the manager sees the real result (not fire-and-forget)
  const sendResult = await sendCourierNotification({
    companyId,
    eventType: COURIER_NOTIFICATION_EVENTS.OUT_FOR_DELIVERY,
    order: shipment.order,
    courier: shipment.courier,
    amount: shipment.order?.total,
    otpLine: `🔑 كود الاستلام الجديد: ${otp} — اعرضه للكابتن عند استلام الطلب`
  });

  return {
    shipmentId: shipment.id,
    runNumber: shipment.deliveryRun?.runNumber || null,
    sent: Boolean(sendResult?.success),
    reason: sendResult?.reason || sendResult?.error || (sendResult?.success ? 'sent' : 'unknown')
  };
}

/**
 * Revoke mobile share links for a delivery run by bumping mobileTokenVersion
 */
async function revokeDeliveryRunLink(companyId, runId) {
  const prisma = getSharedPrismaClient();

  const run = await prisma.deliveryRun.findFirst({
    where: { id: runId, companyId }
  });

  if (!run) {
    throw serviceError('مأمورية التوصيل غير موجودة', 404);
  }

  const updatedRun = await prisma.deliveryRun.update({
    where: { id: runId },
    data: {
      mobileTokenVersion: { increment: 1 }
    }
  });

  return {
    runId: updatedRun.id,
    mobileTokenVersion: updatedRun.mobileTokenVersion
  };
}

let courierTablesEnsured = false;
async function ensureCourierTables(prismaClient) {
  if (courierTablesEnsured) return;
  const prisma = prismaClient || getSharedPrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='couriers' AND column_name='documentsStatus') THEN
          ALTER TABLE "couriers" ADD COLUMN "documentsStatus" TEXT NOT NULL DEFAULT 'INCOMPLETE';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='couriers' AND column_name='hireDate') THEN
          ALTER TABLE "couriers" ADD COLUMN "hireDate" TIMESTAMP(3);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='couriers' AND column_name='salaryBase') THEN
          ALTER TABLE "couriers" ADD COLUMN "salaryBase" DECIMAL(10, 2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='couriers' AND column_name='compensationModel') THEN
          ALTER TABLE "couriers" ADD COLUMN "compensationModel" TEXT DEFAULT 'COMMISSION_ONLY';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='couriers' AND column_name='bonusPerOrder') THEN
          ALTER TABLE "couriers" ADD COLUMN "bonusPerOrder" DECIMAL(10, 2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='couriers' AND column_name='bonusStartsAfterOrders') THEN
          ALTER TABLE "couriers" ADD COLUMN "bonusStartsAfterOrders" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='couriers' AND column_name='bonusTiers') THEN
          ALTER TABLE "couriers" ADD COLUMN "bonusTiers" TEXT;
        END IF;
      END $$;
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "courier_documents" (
        "id" TEXT PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "courierId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "fileUrl" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "sizeBytes" INTEGER NOT NULL,
        "expiryDate" TIMESTAMP(3),
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "reviewedBy" TEXT,
        "reviewedAt" TIMESTAMP(3),
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "courier_documents_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "courier_documents_companyId_idx" ON "courier_documents"("companyId");
      CREATE INDEX IF NOT EXISTS "courier_documents_courierId_idx" ON "courier_documents"("courierId");
      CREATE INDEX IF NOT EXISTS "courier_documents_status_idx" ON "courier_documents"("status");
      CREATE INDEX IF NOT EXISTS "courier_documents_type_idx" ON "courier_documents"("type");
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "courier_payrolls" (
        "id" TEXT PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "courierId" TEXT NOT NULL,
        "month" TEXT NOT NULL,
        "compensationModel" TEXT NOT NULL DEFAULT 'COMMISSION_ONLY',
        "baseSalary" DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
        "bonus" DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
        "commission" DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
        "deductions" DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
        "netPayable" DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
        "deliveredOrdersCount" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "calculationDetails" TEXT,
        "treasuryAccountId" TEXT,
        "treasuryTransactionId" TEXT,
        "approvedBy" TEXT,
        "approvedAt" TIMESTAMP(3),
        "paidBy" TEXT,
        "paidAt" TIMESTAMP(3),
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "courier_payrolls_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "courier_payrolls_companyId_courierId_month_key" ON "courier_payrolls"("companyId", "courierId", "month");
      CREATE INDEX IF NOT EXISTS "courier_payrolls_companyId_month_idx" ON "courier_payrolls"("companyId", "month");
      CREATE INDEX IF NOT EXISTS "courier_payrolls_courierId_idx" ON "courier_payrolls"("courierId");
      CREATE INDEX IF NOT EXISTS "courier_payrolls_status_idx" ON "courier_payrolls"("status");
    `).catch(() => {});

    courierTablesEnsured = true;
  } catch (err) {
    console.warn('[COURIER-DB] ensureCourierTables notice:', err.message);
  }
}

async function recalculateCourierDocumentsStatus(prismaClient, companyId, courierId) {
  const prisma = prismaClient || getSharedPrismaClient();

  const docs = await prisma.courierDocument.findMany({
    where: { companyId, courierId },
  });

  if (docs.length === 0) {
    await prisma.courier.update({
      where: { id: courierId },
      data: { documentsStatus: 'INCOMPLETE' },
    });
    return 'INCOMPLETE';
  }

  const hasVerifiedNationalId = docs.some(
    (d) => ['NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK'].includes(d.type) && d.status === 'VERIFIED'
  );
  const hasVerifiedCustody = docs.some(
    (d) => d.type === 'CUSTODY_RECEIPT' && d.status === 'VERIFIED'
  );

  const hasRejected = docs.some((d) => d.status === 'REJECTED');
  const hasPending = docs.some((d) => d.status === 'PENDING');

  let newStatus = 'INCOMPLETE';
  if (hasVerifiedNationalId && hasVerifiedCustody && !hasRejected) {
    newStatus = 'VERIFIED';
  } else if (hasPending || docs.length > 0) {
    newStatus = 'PENDING_REVIEW';
  } else {
    newStatus = 'INCOMPLETE';
  }

  await prisma.courier.update({
    where: { id: courierId },
    data: { documentsStatus: newStatus },
  });

  return newStatus;
}

async function uploadCourierDocument(companyId, courierId, { file, type, expiryDate, notes }, userId) {
  const prisma = getSharedPrismaClient();
  await ensureCourierTables(prisma);

  const courier = await prisma.courier.findFirst({
    where: { id: courierId, companyId },
  });
  if (!courier) {
    throw serviceError('المندوب غير موجود', 404, 'COURIER_NOT_FOUND');
  }

  if (!file) {
    throw serviceError('ملف المستند مطلوب', 400, 'FILE_REQUIRED');
  }

  const allowedTypes = [
    'NATIONAL_ID_FRONT',
    'NATIONAL_ID_BACK',
    'CRIMINAL_RECORD',
    'DRIVING_LICENSE',
    'CUSTODY_RECEIPT',
    'CONTRACT',
    'MEDICAL',
    'OTHER'
  ];
  const docType = (type || 'OTHER').toUpperCase();
  if (!allowedTypes.includes(docType)) {
    throw serviceError('نوع المستند غير مدعوم', 400, 'INVALID_DOCUMENT_TYPE');
  }

  const fileUrl = `/uploads/courier-documents/${file.filename}`;

  const document = await prisma.courierDocument.create({
    data: {
      companyId,
      courierId,
      type: docType,
      fileUrl,
      fileName: file.originalname || file.filename,
      mimeType: file.mimetype || 'application/octet-stream',
      sizeBytes: file.size || 0,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      status: 'PENDING',
      notes: notes?.trim() || null,
      reviewedBy: null,
      reviewedAt: null,
    },
  });

  const documentsStatus = await recalculateCourierDocumentsStatus(prisma, companyId, courierId);

  return {
    document,
    documentsStatus,
  };
}

async function listCourierDocuments(companyId, courierId) {
  const prisma = getSharedPrismaClient();
  await ensureCourierTables(prisma);

  const courier = await prisma.courier.findFirst({
    where: { id: courierId, companyId },
    select: { id: true, name: true, documentsStatus: true },
  });
  if (!courier) {
    throw serviceError('المندوب غير موجود', 404, 'COURIER_NOT_FOUND');
  }

  const documents = await prisma.courierDocument.findMany({
    where: { companyId, courierId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    courier,
    documents,
  };
}

async function updateCourierDocumentStatus(companyId, courierId, docId, { status, notes }, userId) {
  const prisma = getSharedPrismaClient();
  await ensureCourierTables(prisma);

  const existing = await prisma.courierDocument.findFirst({
    where: { id: docId, companyId, courierId },
  });
  if (!existing) {
    throw serviceError('المستند غير موجود', 404, 'DOCUMENT_NOT_FOUND');
  }

  const validStatuses = ['PENDING', 'VERIFIED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    throw serviceError('حالة المستند يجب أن تكون PENDING أو VERIFIED أو REJECTED', 400, 'INVALID_STATUS');
  }

  const updatedDoc = await prisma.courierDocument.update({
    where: { id: docId },
    data: {
      status,
      notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
      reviewedBy: userId || 'SYSTEM',
      reviewedAt: new Date(),
    },
  });

  const documentsStatus = await recalculateCourierDocumentsStatus(prisma, companyId, courierId);

  return {
    document: updatedDoc,
    documentsStatus,
  };
}

async function deleteCourierDocument(companyId, courierId, docId) {
  const prisma = getSharedPrismaClient();
  await ensureCourierTables(prisma);

  const existing = await prisma.courierDocument.findFirst({
    where: { id: docId, companyId, courierId },
  });
  if (!existing) {
    throw serviceError('المستند غير موجود', 404, 'DOCUMENT_NOT_FOUND');
  }

  await prisma.courierDocument.delete({
    where: { id: docId },
  });

  const documentsStatus = await recalculateCourierDocumentsStatus(prisma, companyId, courierId);

  return {
    deletedId: docId,
    documentsStatus,
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
  updateShipmentStatus: updateDeliveryRunShipment,
  updateShipmentFieldStatus: updateDeliveryRunShipment,
  settleDeliveryRun,
  getCourierDashboardSummary,
  listCourierCommissions,
  payCourierCommissions,
  getCouriersPerformance,
  reassignShipments,
  resendShipmentOtp,
  revokeDeliveryRunLink,
  ensureCourierTables,
  uploadCourierDocument,
  listCourierDocuments,
  updateCourierDocumentStatus,
  deleteCourierDocument,
  recalculateCourierDocumentsStatus
};
