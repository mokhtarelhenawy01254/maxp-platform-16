/**
 * Shipping Profit Service (SHIP-W9)
 * Calculates courier cost, margins, applies profitability to shipments,
 * and generates profitability analytics.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { recordShipmentEvent } = require('./shipmentEventService');

function round2(num) {
  const n = Number(num);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
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
 * Compute the courier cost and gross profit margin for a shipment
 * @param {Object} shipment 
 * @param {Object|null} courier 
 * @returns {Promise<{ courierCost: number, costSource: string, marginAmount: number }>}
 */
async function computeCourierCost(shipment, courier = null) {
  if (!shipment) {
    return { courierCost: 0, costSource: 'NONE', marginAmount: 0 };
  }

  const prisma = getSharedPrismaClient();
  let courierObj = courier;

  if (!courierObj && shipment.courierId) {
    courierObj = await prisma.courier.findUnique({
      where: { id: shipment.courierId }
    });
  }

  let courierCost = 0;
  let costSource = 'NONE';

  if (courierObj) {
    if (courierObj.commissionType === 'FIXED_PER_ORDER') {
      courierCost = Number(courierObj.commissionAmount || 0);
      costSource = 'COMMISSION';
    } else if (courierObj.commissionType === 'PERCENTAGE') {
      courierCost = (Number(shipment.cost || 0) * Number(courierObj.commissionAmount || 0)) / 100;
      costSource = 'COMMISSION';
    } else if (courierObj.commissionType === 'SALARY_ONLY') {
      courierCost = 0;
      costSource = 'SALARY';
    } else {
      courierCost = Number(courierObj.commissionAmount || 0);
      costSource = 'COMMISSION';
    }
  } else if (shipment.shippingCompanyId) {
    courierCost = 0;
    costSource = 'PARTNER_RATE';
  } else {
    courierCost = 0;
    costSource = 'NONE';
  }

  courierCost = round2(courierCost);
  const marginAmount = round2(Number(shipment.cost || 0) - courierCost);

  return {
    courierCost,
    costSource,
    marginAmount
  };
}

/**
 * Apply profit calculations to a specific shipment and persist in database
 * @param {Object} prismaClient 
 * @param {string} shipmentId 
 * @param {Object} options 
 */
async function applyProfitToShipment(prismaClient, shipmentId, options = {}) {
  const prisma = prismaClient || getSharedPrismaClient();

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      courier: true,
      merchant: true
    }
  });

  if (!shipment) {
    throw new Error(`Shipment with id ${shipmentId} not found`);
  }

  const { courierCost, costSource, marginAmount } = await computeCourierCost(shipment, shipment.courier);

  const updated = await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      courierCost,
      costSource,
      marginAmount
    },
    include: {
      courier: true,
      merchant: true
    }
  });

  // Check if a COST_APPLIED event already exists for this shipment
  const existingEvent = await prisma.shipmentEvent.findFirst({
    where: {
      shipmentId: shipment.id,
      toStatus: 'COST_APPLIED'
    }
  });

  if (!existingEvent) {
    await recordShipmentEvent(prisma, {
      companyId: shipment.companyId,
      shipmentId: shipment.id,
      fromStatus: shipment.status,
      toStatus: 'COST_APPLIED',
      reasonCode: 'COST_APPLIED',
      notes: 'تطبيق تكلفة وهامش الشحنة',
      actorType: 'SYSTEM',
      metadata: {
        courierCost,
        costSource,
        marginAmount
      }
    });
  }

  return {
    shipment: updated,
    courierCost,
    costSource,
    marginAmount
  };
}

/**
 * Recalculate profit for delivered shipments within a date range
 * @param {Object} params
 */
async function recalcForPeriod({ companyId, from, to, forceAll = false }) {
  const prisma = getSharedPrismaClient();

  const where = {
    companyId,
    OR: [
      { status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] } },
      { status: 'RETURNED', rtoCost: { not: null } },
    ],
  };

  if (!forceAll) {
    where.courierCost = null;
  }

  const dateFilter = buildDateFilter(from, to);
  if (dateFilter.createdAt) {
    where.createdAt = dateFilter.createdAt;
  }

  const shipments = await prisma.shipment.findMany({
    where,
    select: { id: true }
  });

  let updatedCount = 0;
  for (const item of shipments) {
    await applyProfitToShipment(prisma, item.id);
    updatedCount++;
  }

  return {
    updatedCount,
    totalFound: shipments.length
  };
}

/**
 * Get profit report grouped by client, governorate, or courier
 * @param {Object} params
 */
async function getProfitReport({ companyId, from, to, groupBy = 'client' }) {
  const prisma = getSharedPrismaClient();

  const where = {
    companyId,
    OR: [
      { status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] } },
      { status: 'RETURNED', rtoCost: { not: null } },
    ],
  };

  const dateFilter = buildDateFilter(from, to);
  if (dateFilter.createdAt) {
    where.createdAt = dateFilter.createdAt;
  }

  const shipments = await prisma.shipment.findMany({
    where,
    include: {
      merchant: true,
      courier: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  const groupMap = new Map();

  for (const s of shipments) {
    let key = 'غير محدد';
    if (groupBy === 'governorate') {
      key = s.destinationGovernorate?.trim() || 'غير محدد';
    } else if (groupBy === 'courier') {
      key = s.courier?.name?.trim() || 'بدون مندوب';
    } else {
      // default: client
      key = s.merchant?.businessName?.trim() || s.merchant?.name?.trim() || 'عميل افتراضي';
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        shipments: 0,
        revenue: 0,
        courierCost: 0,
        rtoCostTotal: 0,
        margin: 0,
      });
    }

    const item = groupMap.get(key);
    item.shipments += 1;

    const rev = Number(s.cost || 0);
    const rCost = s.rtoCost !== null && s.rtoCost !== undefined ? Number(s.rtoCost) : 0;
    let cCost = s.courierCost !== null && s.courierCost !== undefined
      ? Number(s.courierCost)
      : 0;
    let mAmount = s.marginAmount !== null && s.marginAmount !== undefined
      ? Number(s.marginAmount)
      : round2(rev - cCost - rCost);

    // If courierCost was never applied, compute dynamically
    if (s.courierCost === null || s.courierCost === undefined) {
      const computed = await computeCourierCost(s, s.courier);
      cCost = computed.courierCost;
      mAmount = round2(rev - cCost - rCost);
    }

    item.revenue = round2(item.revenue + rev);
    item.courierCost = round2(item.courierCost + cCost);
    item.rtoCostTotal = round2(item.rtoCostTotal + rCost);
    item.margin = round2(item.margin + mAmount);
  }

  const rows = Array.from(groupMap.values()).map(r => {
    const marginPct = r.revenue > 0 ? round2((r.margin / r.revenue) * 100) : 0;
    return {
      key: r.key,
      shipments: r.shipments,
      revenue: round2(r.revenue),
      courierCost: round2(r.courierCost),
      rtoCostTotal: round2(r.rtoCostTotal),
      margin: round2(r.margin),
      marginPct
    };
  });

  // Calculate totals strictly matching sum of rows to the penny
  let totalShipments = 0;
  let totalRevenue = 0;
  let totalCourierCost = 0;
  let totalRtoCost = 0;
  let totalMargin = 0;

  for (const row of rows) {
    totalShipments += row.shipments;
    totalRevenue = round2(totalRevenue + row.revenue);
    totalCourierCost = round2(totalCourierCost + row.courierCost);
    totalRtoCost = round2(totalRtoCost + (row.rtoCostTotal || 0));
    totalMargin = round2(totalMargin + row.margin);
  }

  const totalMarginPct = totalRevenue > 0 ? round2((totalMargin / totalRevenue) * 100) : 0;

  return {
    success: true,
    groupBy,
    range: { from: from || null, to: to || null },
    rows,
    totals: {
      shipments: totalShipments,
      revenue: totalRevenue,
      courierCost: totalCourierCost,
      rtoCostTotal: totalRtoCost,
      margin: totalMargin,
      marginPct: totalMarginPct
    },
    generatedAt: new Date().toISOString()
  };
}

/**
 * Get delivered shipments with uncovered profit (courierCost is null)
 * @param {Object} params
 */
async function getUncoveredProfit({ companyId, from, to }) {
  const prisma = getSharedPrismaClient();

  const where = {
    companyId,
    status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] },
    courierCost: null
  };

  const dateFilter = buildDateFilter(from, to);
  if (dateFilter.createdAt) {
    where.createdAt = dateFilter.createdAt;
  }

  const shipments = await prisma.shipment.findMany({
    where,
    include: {
      merchant: { select: { id: true, name: true, businessName: true } },
      courier: { select: { id: true, name: true, phone: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    success: true,
    count: shipments.length,
    range: { from: from || null, to: to || null },
    shipments
  };
}

module.exports = {
  computeCourierCost,
  applyProfitToShipment,
  recalcForPeriod,
  getProfitReport,
  getUncoveredProfit
};
