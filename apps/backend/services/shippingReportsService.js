/**
 * Shipping Reports Service (SHIP-W7)
 * Operational analytics by Governorate, Client, and Courier.
 * STRICT LAW: Zero N+1 queries. All queries scoped to companyId.
 * No company internal cost margins leaked.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const { normalizeGovernorateName } = require('../utils/orderLocationNormalizer');
const { parseCourierGovernorates } = require('./shipping/autoAssignService');

function round2(num) {
  const n = Number(num);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function round1(num) {
  const n = Number(num);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

function buildDateFilter(from, to) {
  if (!from && !to) return {};
  const filter = {};
  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      filter.gte = fromDate;
    }
  }
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      if (typeof to === 'string' && to.length === 10) {
        toDate.setHours(23, 59, 59, 999);
      }
      filter.lte = toDate;
    }
  }
  return Object.keys(filter).length > 0 ? { createdAt: filter } : {};
}

/**
 * 1. Summary Report
 */
async function getSummaryReport(companyId, { from, to } = {}) {
  const prisma = getSharedPrismaClient();
  const dateFilter = buildDateFilter(from, to);
  const whereShipments = { companyId, ...dateFilter };

  // 1. Group shipments by status (single query)
  const statusGroups = await prisma.shipment.groupBy({
    by: ['status'],
    where: whereShipments,
    _count: { _all: true },
  });

  let delivered = 0;
  let returned = 0;
  let failed = 0;
  let pending = 0;
  let inProgress = 0;
  let totalShipments = 0;

  for (const group of statusGroups) {
    const count = group._count._all;
    totalShipments += count;
    const st = String(group.status || '').toUpperCase();
    if (st === 'DELIVERED') {
      delivered += count;
    } else if (st === 'RETURNED') {
      returned += count;
    } else if (st === 'FAILED' || st === 'FAILED_ATTEMPT') {
      failed += count;
    } else if (st === 'PENDING') {
      pending += count;
      inProgress += count;
    } else {
      inProgress += count;
    }
  }

  // 2. Query ShipmentEvent using groupBy & findMany to calculate first-attempt success and delivery times
  // معدل نجاح المحاولة الأولى = (شحنات اتسلّمت وattemptCount=0) ÷ (إجمالي محاولات التسليم) — من ShipmentEvent مش من الحقل
  const [eventGroups, timelineEvents] = await Promise.all([
    prisma.shipmentEvent.groupBy({
      by: ['shipmentId', 'toStatus'],
      where: {
        companyId,
        toStatus: { in: ['DELIVERED', 'FAILED', 'FAILED_ATTEMPT'] },
      },
      _count: { _all: true },
    }),
    prisma.shipmentEvent.findMany({
      where: {
        companyId,
        OR: [
          { toStatus: 'DELIVERED' },
          { reasonCode: 'CREATED' },
          { toStatus: 'PENDING' },
        ],
      },
      select: {
        shipmentId: true,
        toStatus: true,
        reasonCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const deliveredShipmentIds = new Set();
  const failedShipmentIds = new Set();
  const attemptedShipmentIds = new Set();

  for (const eg of eventGroups) {
    const sId = eg.shipmentId;
    const st = String(eg.toStatus || '').toUpperCase();
    attemptedShipmentIds.add(sId);
    if (st === 'DELIVERED') {
      deliveredShipmentIds.add(sId);
    } else if (st === 'FAILED' || st === 'FAILED_ATTEMPT') {
      failedShipmentIds.add(sId);
    }
  }

  let deliveredFirstAttempt = 0;
  for (const sId of deliveredShipmentIds) {
    if (!failedShipmentIds.has(sId)) {
      deliveredFirstAttempt++;
    }
  }

  // Acceptance Criterion 2: "شحنتان اتسلّمتا بعد محاولة فاشلة من 10 → معدل نجاح أول محاولة = 80% بالظبط."
  // When 10 delivered shipments and 2 had a prior failed attempt: 8 / 10 = 80%.
  const totalAttempted = attemptedShipmentIds.size;
  const totalDeliveredFromEvents = deliveredShipmentIds.size;
  const attemptDenominator = totalAttempted > 0
    ? totalAttempted
    : (totalDeliveredFromEvents > 0 ? totalDeliveredFromEvents : delivered);

  const firstAttemptSuccessRate = attemptDenominator > 0
    ? round1((deliveredFirstAttempt / attemptDenominator) * 100)
    : (delivered > 0 ? 100 : 0);

  // نسبة RTO = مرتجعة ÷ (مسلّمة + مرتجعة)
  const rtoDenominator = delivered + returned;
  const rtoRate = rtoDenominator > 0
    ? round1((returned / rtoDenominator) * 100)
    : 0;

  // متوسط زمن التسليم (ساعات) = AVG(حدث DELIVERED − حدث CREATED)
  const eventsByShipment = new Map();
  for (const ev of timelineEvents) {
    if (!eventsByShipment.has(ev.shipmentId)) {
      eventsByShipment.set(ev.shipmentId, []);
    }
    eventsByShipment.get(ev.shipmentId).push(ev);
  }

  let totalDeliveryDurationMs = 0;
  let deliveryDurationCount = 0;

  for (const sEvents of eventsByShipment.values()) {
    const delEvent = sEvents.find(e => String(e.toStatus).toUpperCase() === 'DELIVERED');
    if (delEvent && delEvent.createdAt) {
      const createdEvent = sEvents.find(e => String(e.reasonCode).toUpperCase() === 'CREATED' || String(e.toStatus).toUpperCase() === 'PENDING') || sEvents[0];
      if (createdEvent && createdEvent.createdAt) {
        const diff = new Date(delEvent.createdAt).getTime() - new Date(createdEvent.createdAt).getTime();
        if (diff >= 0) {
          totalDeliveryDurationMs += diff;
          deliveryDurationCount++;
        }
      }
    }
  }

  const avgDeliveryHours = deliveryDurationCount > 0
    ? round1(totalDeliveryDurationMs / (deliveryDurationCount * 3600 * 1000))
    : 0;

  const totals = {
    total: totalShipments,
    totalShipments,
    delivered,
    returned,
    failed,
    pending,
    inProgress,
    firstAttemptSuccessRate,
    rtoRate,
    avgDeliveryHours,
  };

  const rows = [
    { key: 'delivered', label: 'مسلّمة', count: delivered, percentage: totalShipments > 0 ? round1((delivered / totalShipments) * 100) : 0 },
    { key: 'returned', label: 'مرتجعة', count: returned, percentage: totalShipments > 0 ? round1((returned / totalShipments) * 100) : 0 },
    { key: 'failed', label: 'فاشلة', count: failed, percentage: totalShipments > 0 ? round1((failed / totalShipments) * 100) : 0 },
    { key: 'inProgress', label: 'قيد التنفيذ', count: inProgress, percentage: totalShipments > 0 ? round1((inProgress / totalShipments) * 100) : 0 },
  ];

  return {
    range: { from: from || null, to: to || null },
    rows,
    totals,
    summary: totals,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 2. By Governorate Report
 */
async function getByGovernorateReport(companyId, { from, to } = {}) {
  const prisma = getSharedPrismaClient();
  const dateFilter = buildDateFilter(from, to);
  const whereShipments = { companyId, ...dateFilter };

  const [govGroups, deliveredShipments] = await Promise.all([
    prisma.shipment.groupBy({
      by: ['destinationGovernorate', 'status'],
      where: whereShipments,
      _count: { _all: true },
    }),
    prisma.shipment.findMany({
      where: {
        ...whereShipments,
        status: 'DELIVERED',
      },
      select: {
        id: true,
        destinationGovernorate: true,
        createdAt: true,
        collectedAt: true,
        updatedAt: true,
        events: {
          where: {
            OR: [
              { toStatus: 'DELIVERED' },
              { reasonCode: 'CREATED' },
              { toStatus: 'PENDING' },
            ],
          },
          select: { toStatus: true, reasonCode: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  ]);

  // Aggregate delivery hours by governorate
  const govDurationMap = new Map();
  for (const s of deliveredShipments) {
    const gov = String(s.destinationGovernorate || '').trim() || 'غير محدد';
    if (!govDurationMap.has(gov)) {
      govDurationMap.set(gov, { totalMs: 0, count: 0 });
    }
    const stat = govDurationMap.get(gov);

    let delTime = null;
    let createTime = null;

    if (s.events && s.events.length > 0) {
      const delEv = s.events.find(e => String(e.toStatus).toUpperCase() === 'DELIVERED');
      const crEv = s.events.find(e => String(e.reasonCode).toUpperCase() === 'CREATED' || String(e.toStatus).toUpperCase() === 'PENDING') || s.events[0];
      if (delEv && delEv.createdAt) delTime = new Date(delEv.createdAt).getTime();
      if (crEv && crEv.createdAt) createTime = new Date(crEv.createdAt).getTime();
    }

    if (!delTime && (s.collectedAt || s.updatedAt)) {
      delTime = new Date(s.collectedAt || s.updatedAt).getTime();
    }
    if (!createTime && s.createdAt) {
      createTime = new Date(s.createdAt).getTime();
    }

    if (delTime && createTime && delTime >= createTime) {
      stat.totalMs += (delTime - createTime);
      stat.count++;
    }
  }

  // Group by governorate
  const govMap = new Map();
  for (const group of govGroups) {
    const gov = String(group.destinationGovernorate || '').trim() || 'غير محدد';
    if (!govMap.has(gov)) {
      govMap.set(gov, {
        governorate: gov,
        shipments: 0,
        delivered: 0,
        returned: 0,
        failed: 0,
        pending: 0,
      });
    }
    const target = govMap.get(gov);
    const count = group._count._all;
    target.shipments += count;

    const st = String(group.status || '').toUpperCase();
    if (st === 'DELIVERED') {
      target.delivered += count;
    } else if (st === 'RETURNED') {
      target.returned += count;
    } else if (st === 'FAILED' || st === 'FAILED_ATTEMPT') {
      target.failed += count;
    } else {
      target.pending += count;
    }
  }

  const rows = Array.from(govMap.values()).map(row => {
    const finished = row.delivered + row.returned;
    const successRate = finished > 0
      ? round1((row.delivered / finished) * 100)
      : (row.shipments > 0 ? round1((row.delivered / row.shipments) * 100) : 0);

    const dur = govDurationMap.get(row.governorate);
    const avgDeliveryHours = dur && dur.count > 0
      ? round1(dur.totalMs / (dur.count * 3600 * 1000))
      : 0;

    return {
      governorate: row.governorate,
      shipments: row.shipments,
      totalShipments: row.shipments,
      delivered: row.delivered,
      returned: row.returned,
      failed: row.failed,
      successRate,
      avgDeliveryHours,
    };
  });

  rows.sort((a, b) => b.shipments - a.shipments);

  const totalShipments = rows.reduce((s, r) => s + r.shipments, 0);
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);
  const totalReturned = rows.reduce((s, r) => s + r.returned, 0);
  const totalFinished = totalDelivered + totalReturned;
  const overallSuccessRate = totalFinished > 0
    ? round1((totalDelivered / totalFinished) * 100)
    : (totalShipments > 0 ? round1((totalDelivered / totalShipments) * 100) : 0);

  let overallDurMs = 0;
  let overallDurCount = 0;
  for (const d of govDurationMap.values()) {
    overallDurMs += d.totalMs;
    overallDurCount += d.count;
  }
  const overallAvgHours = overallDurCount > 0
    ? round1(overallDurMs / (overallDurCount * 3600 * 1000))
    : 0;

  const totals = {
    totalShipments,
    shipments: totalShipments,
    delivered: totalDelivered,
    returned: totalReturned,
    successRate: overallSuccessRate,
    avgDeliveryHours: overallAvgHours,
  };

  return {
    range: { from: from || null, to: to || null },
    rows,
    totals,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 3. By Client Report
 */
async function getByClientReport(companyId, { from, to } = {}) {
  const prisma = getSharedPrismaClient();
  const dateFilter = buildDateFilter(from, to);
  const whereShipments = { companyId, ...dateFilter };

  const [clientGroups, merchants, rateCards, settlementLines] = await Promise.all([
    prisma.shipment.groupBy({
      by: ['merchantId', 'status'],
      where: whereShipments,
      _count: { _all: true },
      _sum: {
        collectedAmount: true,
        codAmount: true,
        cost: true,
      },
    }),
    prisma.merchant.findMany({
      where: { companyId },
      select: { id: true, name: true, phone: true },
    }),
    prisma.clientRateCard.findMany({
      where: { companyId, isActive: true },
      select: { merchantId: true, returnFee: true },
    }),
    prisma.shippingSettlementLine.findMany({
      where: {
        shipment: { companyId, ...dateFilter },
      },
      select: {
        returnFee: true,
        shippingFee: true,
        shipment: { select: { merchantId: true, status: true } },
      },
    }),
  ]);

  const merchantMap = new Map(merchants.map(m => [m.id, m]));
  const rateCardByMerchant = new Map(rateCards.map(rc => [rc.merchantId, rc]));

  // Sum settlement return fees if present
  const settlementReturnFeeByMerchant = new Map();
  for (const line of settlementLines) {
    const mId = line.shipment?.merchantId || '__none__';
    const cur = settlementReturnFeeByMerchant.get(mId) || 0;
    settlementReturnFeeByMerchant.set(mId, cur + Number(line.returnFee || 0));
  }

  // Aggregate by merchant
  const clientDataMap = new Map();

  for (const group of clientGroups) {
    const mId = group.merchantId || '__none__';
    if (!clientDataMap.has(mId)) {
      clientDataMap.set(mId, {
        merchantId: mId === '__none__' ? null : mId,
        shipments: 0,
        delivered: 0,
        returned: 0,
        codCollected: 0,
        shippingFees: 0,
        returnFees: 0,
      });
    }

    const target = clientDataMap.get(mId);
    const count = group._count._all;
    target.shipments += count;

    const st = String(group.status || '').toUpperCase();
    if (st === 'DELIVERED') {
      target.delivered += count;
      const collected = group._sum.collectedAmount !== null && group._sum.collectedAmount !== undefined
        ? Number(group._sum.collectedAmount)
        : Number(group._sum.codAmount || 0);
      target.codCollected += collected;
      target.shippingFees += Number(group._sum.cost || 0);
    } else if (st === 'RETURNED') {
      target.returned += count;
      target.shippingFees += Number(group._sum.cost || 0);
    } else {
      target.shippingFees += Number(group._sum.cost || 0);
    }
  }

  const rows = Array.from(clientDataMap.values()).map(row => {
    const mId = row.merchantId;
    const merchant = mId ? merchantMap.get(mId) : null;

    let returnFee = 0;
    if (settlementReturnFeeByMerchant.has(mId || '__none__')) {
      returnFee = settlementReturnFeeByMerchant.get(mId || '__none__');
    } else if (mId && rateCardByMerchant.has(mId)) {
      const rc = rateCardByMerchant.get(mId);
      returnFee = Number(rc.returnFee || 0) * row.returned;
    }

    const codCollected = round2(row.codCollected);
    const shippingFees = round2(row.shippingFees);
    const returnFees = round2(returnFee);
    // Acceptance criterion 4: صافي كل صف = محصّل − رسوم − مرتجع (اختبار بكسور)
    const net = round2(codCollected - shippingFees - returnFees);

    return {
      clientId: mId,
      merchantId: mId,
      clientName: merchant?.name || (mId ? 'عميل محذوف' : 'بدون عميل'),
      name: merchant?.name || (mId ? 'عميل محذوف' : 'بدون عميل'),
      phone: merchant?.phone || null,
      shipments: row.shipments,
      totalShipments: row.shipments,
      delivered: row.delivered,
      returned: row.returned,
      codCollected,
      collected: codCollected,
      shippingFees,
      fees: shippingFees,
      returnFees,
      returnedAmount: returnFees,
      net,
      netPayout: net,
    };
  });

  rows.sort((a, b) => b.shipments - a.shipments);

  const totalShipments = rows.reduce((s, r) => s + r.shipments, 0);
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);
  const totalReturned = rows.reduce((s, r) => s + r.returned, 0);
  const totalCodCollected = round2(rows.reduce((s, r) => s + r.codCollected, 0));
  const totalShippingFees = round2(rows.reduce((s, r) => s + r.shippingFees, 0));
  const totalReturnFees = round2(rows.reduce((s, r) => s + r.returnFees, 0));
  const totalNet = round2(totalCodCollected - totalShippingFees - totalReturnFees);

  const totals = {
    totalShipments,
    shipments: totalShipments,
    delivered: totalDelivered,
    returned: totalReturned,
    codCollected: totalCodCollected,
    collected: totalCodCollected,
    shippingFees: totalShippingFees,
    fees: totalShippingFees,
    returnFees: totalReturnFees,
    returnedAmount: totalReturnFees,
    net: totalNet,
    netPayout: totalNet,
  };

  return {
    range: { from: from || null, to: to || null },
    rows,
    totals,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 4. By Courier Report
 */
async function getByCourierReport(companyId, { from, to } = {}) {
  const prisma = getSharedPrismaClient();
  const dateFilter = buildDateFilter(from, to);
  const whereShipments = { companyId, courierId: { not: null }, ...dateFilter };

  const [couriers, shipmentGroups, commissionGroups] = await Promise.all([
    prisma.courier.findMany({
      where: { companyId },
      select: { id: true, name: true, phone: true },
    }),
    prisma.shipment.groupBy({
      by: ['courierId', 'status'],
      where: whereShipments,
      _count: { _all: true },
    }),
    prisma.courierCommission.groupBy({
      by: ['courierId', 'status'],
      where: {
        companyId,
        ...(from || to ? { createdAt: dateFilter.createdAt } : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  const courierShipmentMap = new Map();
  for (const group of shipmentGroups) {
    const cId = group.courierId;
    if (!courierShipmentMap.has(cId)) {
      courierShipmentMap.set(cId, { shipments: 0, delivered: 0, returned: 0 });
    }
    const stat = courierShipmentMap.get(cId);
    const count = group._count._all;
    stat.shipments += count;
    const st = String(group.status || '').toUpperCase();
    if (st === 'DELIVERED') {
      stat.delivered += count;
    } else if (st === 'RETURNED') {
      stat.returned += count;
    }
  }

  const courierCommissionMap = new Map();
  for (const cg of commissionGroups) {
    const cId = cg.courierId;
    if (!courierCommissionMap.has(cId)) {
      courierCommissionMap.set(cId, { due: 0, paid: 0 });
    }
    const stat = courierCommissionMap.get(cId);
    const amt = Number(cg._sum.amount || 0);
    const st = String(cg.status || '').toUpperCase();
    if (st === 'PAID') {
      stat.paid += amt;
    } else {
      stat.due += amt;
    }
  }

  const rows = couriers.map(courier => {
    const sStat = courierShipmentMap.get(courier.id) || { shipments: 0, delivered: 0, returned: 0 };
    const cStat = courierCommissionMap.get(courier.id) || { due: 0, paid: 0 };

    const commissionsDue = round2(cStat.due);
    const commissionsPaid = round2(cStat.paid);
    const totalCommissions = round2(commissionsDue + commissionsPaid);

    return {
      courierId: courier.id,
      courierName: courier.name,
      name: courier.name,
      phone: courier.phone,
      shipments: sStat.shipments,
      totalShipments: sStat.shipments,
      delivered: sStat.delivered,
      returned: sStat.returned,
      commissionsDue,
      commissionsPaid,
      due: commissionsDue,
      paid: commissionsPaid,
      totalCommissions,
    };
  });

  rows.sort((a, b) => b.delivered - a.delivered);

  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);
  const totalReturned = rows.reduce((s, r) => s + r.returned, 0);
  const totalCommissionsDue = round2(rows.reduce((s, r) => s + r.commissionsDue, 0));
  const totalCommissionsPaid = round2(rows.reduce((s, r) => s + r.commissionsPaid, 0));
  const totalCommissions = round2(totalCommissionsDue + totalCommissionsPaid);

  const totals = {
    delivered: totalDelivered,
    returned: totalReturned,
    commissionsDue: totalCommissionsDue,
    commissionsPaid: totalCommissionsPaid,
    totalCommissions,
    due: totalCommissionsDue,
    paid: totalCommissionsPaid,
  };

  return {
    range: { from: from || null, to: to || null },
    rows,
    totals,
    generatedAt: new Date().toISOString(),
  };
}


/**
 * 5. Courier Coverage by Governorate Report (SHIP-W12)
 * لكل محافظة: شحنات مفتوحة · مناديب نشطين · نسبة التغطية · أقدم شحنة بلا مندوب
 * Scoped strictly to companyId. Zero N+1 queries.
 */
async function getCoverageReport(companyId, { from, to, governorate } = {}) {
  const prisma = getSharedPrismaClient();

  // 1. Fetch active couriers for this company
  const couriers = await prisma.courier.findMany({
    where: {
      companyId,
      isActive: true,
      status: { not: 'OFF_DUTY' },
    },
    select: {
      id: true,
      name: true,
      governorates: true,
      status: true,
      isActive: true,
    },
  });

  // Map couriers to normalized governorates
  const couriersByGov = new Map();
  for (const courier of couriers) {
    const zones = parseCourierGovernorates(courier.governorates);
    for (const zone of zones) {
      if (!couriersByGov.has(zone)) {
        couriersByGov.set(zone, new Set());
      }
      couriersByGov.get(zone).add(courier.id);
    }
  }

  // 2. Fetch open shipments for this company
  const TERMINAL_STATUSES = ['DELIVERED', 'COMPLETED', 'REMITTED', 'RETURNED', 'CANCELLED'];
  const dateFilter = buildDateFilter(from, to);
  const whereShipments = {
    companyId,
    status: { notIn: TERMINAL_STATUSES },
    ...dateFilter,
  };

  const shipments = await prisma.shipment.findMany({
    where: whereShipments,
    select: {
      id: true,
      courierId: true,
      status: true,
      createdAt: true,
      destinationGovernorate: true,
      destinationCity: true,
      destinationAddress: true,
      order: {
        select: {
          governorate: true,
          city: true,
          shippingAddress: true,
          orderNumber: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // 3. Aggregate metrics per governorate
  const govStats = new Map();

  const getOrCreateGov = (name) => {
    if (!govStats.has(name)) {
      govStats.set(name, {
        governorate: name,
        openShipments: 0,
        assignedShipments: 0,
        unassignedShipments: 0,
        oldestUnassignedAt: null,
        oldestUnassignedShipmentId: null,
        oldestUnassignedOrderNumber: null,
      });
    }
    return govStats.get(name);
  };

  for (const s of shipments) {
    const rawGov = s.destinationGovernorate || s.order?.governorate;
    const rawCity = s.destinationCity || s.order?.city;
    const rawAddr = s.destinationAddress || s.order?.shippingAddress;
    const normGov = normalizeGovernorateName(rawGov, rawCity, rawAddr) || 'غير محددة';

    const entry = getOrCreateGov(normGov);
    entry.openShipments += 1;

    if (s.courierId) {
      entry.assignedShipments += 1;
    } else {
      entry.unassignedShipments += 1;
      if (!entry.oldestUnassignedAt || s.createdAt < entry.oldestUnassignedAt) {
        entry.oldestUnassignedAt = s.createdAt;
        entry.oldestUnassignedShipmentId = s.id;
        entry.oldestUnassignedOrderNumber = s.order?.orderNumber || null;
      }
    }
  }

  // Ensure any governorate with active couriers is also represented
  for (const govName of couriersByGov.keys()) {
    getOrCreateGov(govName);
  }

  const now = Date.now();
  let rows = Array.from(govStats.values()).map((entry) => {
    const activeCouriersCount = couriersByGov.get(entry.governorate)?.size || 0;

    let coverageRate = 0;
    if (activeCouriersCount === 0) {
      coverageRate = 0;
    } else if (entry.openShipments === 0) {
      coverageRate = 100;
    } else {
      coverageRate = round1((entry.assignedShipments / entry.openShipments) * 100);
    }

    let oldestUnassignedShipment = null;
    if (entry.oldestUnassignedAt) {
      const diffMs = now - new Date(entry.oldestUnassignedAt).getTime();
      const ageHours = round1(Math.max(0, diffMs / (1000 * 60 * 60)));
      const ageDays = round1(ageHours / 24);
      oldestUnassignedShipment = {
        shipmentId: entry.oldestUnassignedShipmentId,
        orderNumber: entry.oldestUnassignedOrderNumber,
        createdAt: entry.oldestUnassignedAt,
        ageHours,
        ageDays,
      };
    }

    return {
      governorate: entry.governorate,
      openShipments: entry.openShipments,
      assignedShipments: entry.assignedShipments,
      unassignedShipments: entry.unassignedShipments,
      activeCouriers: activeCouriersCount,
      coverageRate,
      isCovered: activeCouriersCount > 0,
      oldestUnassignedShipment,
    };
  });

  if (governorate) {
    const normFilter = normalizeGovernorateName(governorate);
    if (normFilter) {
      rows = rows.filter((r) => r.governorate === normFilter);
    }
  }

  rows.sort((a, b) => {
    if (b.unassignedShipments !== a.unassignedShipments) {
      return b.unassignedShipments - a.unassignedShipments;
    }
    return b.openShipments - a.openShipments;
  });

  const totalOpenShipments = rows.reduce((sum, r) => sum + r.openShipments, 0);
  const totalAssignedShipments = rows.reduce((sum, r) => sum + r.assignedShipments, 0);
  const totalUnassignedShipments = rows.reduce((sum, r) => sum + r.unassignedShipments, 0);
  const uniqueActiveCourierIds = new Set();
  couriers.forEach((c) => uniqueActiveCourierIds.add(c.id));

  const summary = {
    totalGovernorates: rows.length,
    coveredGovernorates: rows.filter((r) => r.activeCouriers > 0).length,
    uncoveredGovernorates: rows.filter((r) => r.activeCouriers === 0).length,
    totalOpenShipments,
    totalAssignedShipments,
    totalUnassignedShipments,
    totalActiveCouriers: uniqueActiveCourierIds.size,
    overallCoverageRate:
      totalOpenShipments > 0
        ? round1((totalAssignedShipments / totalOpenShipments) * 100)
        : uniqueActiveCourierIds.size > 0
        ? 100
        : 0,
  };

  return {
    summary,
    rows,
    data: rows,
    range: { from: from || null, to: to || null },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 6. Geographic Distribution Report (SHIP-T4)
 * Rows: (محافظة · مدينة · شحنات · مسلّمة · RTO · متوسط أيام)
 */
async function getGeoReport(companyId, { from, to } = {}) {
  const prisma = getSharedPrismaClient();
  const dateFilter = buildDateFilter(from, to);
  const where = { companyId, ...dateFilter };

  const shipments = await prisma.shipment.findMany({
    where,
    select: {
      id: true,
      destinationGovernorate: true,
      destinationCity: true,
      destinationAddress: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const DELIVERED_STATUSES = ['DELIVERED', 'COMPLETED', 'REMITTED'];
  const RTO_STATUSES = ['RETURNED', 'RTO', 'FAILED'];

  const groups = new Map();

  for (const s of shipments) {
    const rawGov = s.destinationGovernorate;
    const rawCity = s.destinationCity || 'غير محدد';
    const gov = normalizeGovernorateName(rawGov, rawCity, s.destinationAddress) || rawGov || 'أخرى';
    const city = (s.destinationCity || 'غير محدد').trim();
    const key = `${gov}___${city}`;

    if (!groups.has(key)) {
      groups.set(key, {
        governorate: gov,
        city,
        totalShipments: 0,
        deliveredCount: 0,
        rtoCount: 0,
        totalDeliveryDays: 0,
        deliveredWithDaysCount: 0,
      });
    }

    const g = groups.get(key);
    g.totalShipments += 1;

    const st = String(s.status || '').toUpperCase();
    if (DELIVERED_STATUSES.includes(st)) {
      g.deliveredCount += 1;
      const createdTime = new Date(s.createdAt).getTime();
      const endTime = new Date(s.updatedAt).getTime();
      const days = Math.max(0, (endTime - createdTime) / (1000 * 60 * 60 * 24));
      g.totalDeliveryDays += days;
      g.deliveredWithDaysCount += 1;
    } else if (RTO_STATUSES.includes(st)) {
      g.rtoCount += 1;
    }
  }

  const rows = Array.from(groups.values()).map((g) => {
    const avgDays = g.deliveredWithDaysCount > 0 ? round1(g.totalDeliveryDays / g.deliveredWithDaysCount) : 0;
    const deliveryRate = g.totalShipments > 0 ? round1((g.deliveredCount / g.totalShipments) * 100) : 0;
    return {
      governorate: g.governorate,
      city: g.city,
      totalShipments: g.totalShipments,
      deliveredCount: g.deliveredCount,
      rtoCount: g.rtoCount,
      avgDays,
      deliveryRate,
    };
  });

  rows.sort((a, b) => b.totalShipments - a.totalShipments);

  const summary = {
    totalShipments: shipments.length,
    totalDelivered: rows.reduce((s, r) => s + r.deliveredCount, 0),
    totalRto: rows.reduce((s, r) => s + r.rtoCount, 0),
    citiesCount: rows.length,
  };

  return {
    summary,
    rows,
    data: rows,
    range: { from: from || null, to: to || null },
    generatedAt: new Date().toISOString(),
  };
}

function geoReportToCsv(report) {
  const lines = [];
  lines.push('﻿"المحافظة","المدينة","إجمالي الشحنات","المسلمة","المرتجعة (RTO)","متوسط أيام التسليم","نسبة التسليم %"');
  for (const r of report.rows || []) {
    lines.push([
      `"${(r.governorate || '').replace(/"/g, '""')}"`,
      `"${(r.city || '').replace(/"/g, '""')}"`,
      r.totalShipments,
      r.deliveredCount,
      r.rtoCount,
      r.avgDays,
      `${r.deliveryRate}%`,
    ].join(','));
  }
  return lines.join('\r\n');
}

/**
 * 7. Best Sellers Report (SHIP-T4)
 * Analyzes items from orders associated with shipments.
 * Fallback to «غير متاح» if no order items exist.
 */
async function getBestSellersReport(companyId, { from, to, limit = 20 } = {}) {
  const prisma = getSharedPrismaClient();
  const dateFilter = buildDateFilter(from, to);
  const where = { companyId, ...dateFilter };
  const takeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

  const shipments = await prisma.shipment.findMany({
    where,
    select: {
      id: true,
      codAmount: true,
      declaredValue: true,
      pieces: true,
      order: {
        select: {
          id: true,
          orderItems: {
            select: {
              productName: true,
              quantity: true,
              price: true,
              total: true,
            },
          },
        },
      },
    },
  });

  const productMap = new Map();

  for (const s of shipments) {
    const items = s.order?.orderItems;
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const name = (item.productName || 'غير متاح').trim() || 'غير متاح';
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const total = item.total !== undefined && item.total !== null ? Number(item.total) : (qty * price);

        if (!productMap.has(name)) {
          productMap.set(name, {
            productName: name,
            quantity: 0,
            totalValue: 0,
            shipmentCount: 0,
          });
        }
        const record = productMap.get(name);
        record.quantity += qty;
        record.totalValue += total;
        record.shipmentCount += 1;
      }
    } else {
      const name = 'غير متاح';
      const qty = s.pieces || 1;
      const total = Number(s.codAmount || s.declaredValue || 0);

      if (!productMap.has(name)) {
        productMap.set(name, {
          productName: name,
          quantity: 0,
          totalValue: 0,
          shipmentCount: 0,
        });
      }
      const record = productMap.get(name);
      record.quantity += qty;
      record.totalValue += total;
      record.shipmentCount += 1;
    }
  }

  const rows = Array.from(productMap.values()).map((p) => ({
    productName: p.productName,
    quantity: p.quantity,
    totalValue: round2(p.totalValue),
    shipmentCount: p.shipmentCount,
  }));

  rows.sort((a, b) => b.quantity - a.quantity || b.totalValue - a.totalValue);
  const slicedRows = rows.slice(0, takeLimit);

  return {
    rows: slicedRows,
    data: slicedRows,
    totalProducts: productMap.size,
    range: { from: from || null, to: to || null },
    generatedAt: new Date().toISOString(),
  };
}

function bestSellersReportToCsv(report) {
  const lines = [];
  lines.push('﻿"اسم المنتج","الكمية المباعة","إجمالي القيمة (ج.م)","عدد الشحنات"');
  for (const r of report.rows || []) {
    lines.push([
      `"${(r.productName || '').replace(/"/g, '""')}"`,
      r.quantity,
      r.totalValue,
      r.shipmentCount,
    ].join(','));
  }
  return lines.join('\r\n');
}

/**
 * 8. Missions / Delivery Runs Report (SHIP-T4)
 * Analyzes courier delivery runs: (مندوب · شحنات · مسلّم · فاشل · تحصيل · مدة).
 */
async function getMissionsReport(companyId, { from, to } = {}) {
  const prisma = getSharedPrismaClient();
  const dateFilter = buildDateFilter(from, to, 'dispatchDate');
  const where = { companyId, ...dateFilter };

  const runs = await prisma.deliveryRun.findMany({
    where,
    include: {
      courier: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      shipments: {
        select: {
          id: true,
          status: true,
          collectedAmount: true,
          codAmount: true,
        },
      },
    },
    orderBy: { dispatchDate: 'desc' },
  });

  const DELIVERED_STATUSES = ['DELIVERED', 'COMPLETED', 'REMITTED'];
  const FAILED_STATUSES = ['FAILED', 'FAILED_ATTEMPT', 'RETURNED', 'CANCELLED'];

  const rows = runs.map((run) => {
    const totalShipments = run.totalShipments || run.shipments.length;
    let deliveredCount = 0;
    let failedCount = 0;
    let sumCollected = 0;

    for (const s of run.shipments) {
      const st = String(s.status || '').toUpperCase();
      if (DELIVERED_STATUSES.includes(st)) {
        deliveredCount += 1;
        sumCollected += Number(s.collectedAmount || s.codAmount || 0);
      } else if (FAILED_STATUSES.includes(st)) {
        failedCount += 1;
      }
    }

    const collectedTotal = run.totalCODCollected ? Number(run.totalCODCollected) : sumCollected;

    let durationHours = 0;
    let durationText = 'جارية';
    if (run.settledAt || run.status === 'COMPLETED' || run.status === 'SETTLED') {
      const endDate = run.settledAt || run.updatedAt;
      const hours = Math.max(0, (new Date(endDate).getTime() - new Date(run.dispatchDate).getTime()) / (1000 * 60 * 60));
      durationHours = round1(hours);
      durationText = `${durationHours} ساعة`;
    }

    return {
      runId: run.id,
      runNumber: run.runNumber,
      courierName: run.courier?.name || 'غير محدد',
      courierPhone: run.courier?.phone || null,
      status: run.status,
      dispatchDate: run.dispatchDate,
      totalShipments,
      deliveredCount,
      failedCount,
      collectedAmount: round2(collectedTotal),
      durationHours,
      duration: durationText,
    };
  });

  const summary = {
    totalRuns: runs.length,
    totalShipments: rows.reduce((s, r) => s + r.totalShipments, 0),
    totalDelivered: rows.reduce((s, r) => s + r.deliveredCount, 0),
    totalFailed: rows.reduce((s, r) => s + r.failedCount, 0),
    totalCollected: round2(rows.reduce((s, r) => s + r.collectedAmount, 0)),
  };

  return {
    summary,
    rows,
    data: rows,
    range: { from: from || null, to: to || null },
    generatedAt: new Date().toISOString(),
  };
}

function missionsReportToCsv(report) {
  const lines = [];
  lines.push('﻿"رقم الرحلة","المندوب","الهاتف","الحالة","تاريخ الانطلاق","إجمالي الشحنات","مسلمة","فاشلة","التحصيل (ج.م)","المدة"');
  for (const r of report.rows || []) {
    lines.push([
      `"${(r.runNumber || '').replace(/"/g, '""')}"`,
      `"${(r.courierName || '').replace(/"/g, '""')}"`,
      `"${(r.courierPhone || '').replace(/"/g, '""')}"`,
      `"${r.status || ''}"`,
      r.dispatchDate ? new Date(r.dispatchDate).toISOString().substring(0, 10) : '',
      r.totalShipments,
      r.deliveredCount,
      r.failedCount,
      r.collectedAmount,
      `"${r.duration || ''}"`,
    ].join(','));
  }
  return lines.join('\r\n');
}

module.exports = {
  getSummaryReport,
  getCoverageReport,
  getByGovernorateReport,
  getByClientReport,
  getByCourierReport,
  getGeoReport,
  geoReportToCsv,
  getBestSellersReport,
  bestSellersReportToCsv,
  getMissionsReport,
  missionsReportToCsv,
};
