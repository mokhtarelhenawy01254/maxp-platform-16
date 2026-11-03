/**
 * Auto-Assign Engine for Couriers (SHIP-W8)
 * Suggests and applies automatic courier assignments for unassigned shipments
 * based on governorate coverage, courier capacity, and load balancing strategies.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { normalizeGovernorateName } = require('../../utils/orderLocationNormalizer');
const { recordShipmentEvent } = require('./shipmentEventService');
const { getPolicy } = require('./policyService');

const TERMINAL_STATUSES = ['DELIVERED', 'COMPLETED', 'REMITTED', 'RETURNED', 'CANCELLED'];
const OPEN_LOAD_STATUSES = ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PENDING', 'ASSIGNED'];

/**
 * Parses courier governorates field (JSON array, comma-separated, or single string)
 * and normalizes all names to canonical Egyptian governorates.
 * @param {string|Array} raw
 * @returns {string[]}
 */
function parseCourierGovernorates(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((g) => normalizeGovernorateName(String(g)) || String(g).trim())
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((g) => normalizeGovernorateName(String(g)) || String(g).trim())
            .filter(Boolean);
        }
      } catch (_) {}
    }
    return trimmed
      .split(/[,،]+/)
      .map((g) => normalizeGovernorateName(g.trim()) || g.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Generates a unique delivery run number formatted as RUN-YYYYMMDD-XXX
 * @param {Object} prismaClient
 * @param {string} companyId
 * @returns {Promise<string>}
 */
async function generateRunNumber(prismaClient, companyId) {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `RUN-${todayStr}-`;
  const countToday = await prismaClient.deliveryRun.count({
    where: {
      companyId,
      runNumber: { startsWith: prefix },
    },
  });
  const nextSeq = String(countToday + 1).padStart(3, '0');
  let candidate = `${prefix}${nextSeq}`;

  const existing = await prismaClient.deliveryRun.findFirst({
    where: { companyId, runNumber: candidate },
  });
  if (existing) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    candidate = `${prefix}${String(countToday + 1).padStart(2, '0')}-${randomSuffix}`;
  }
  return candidate;
}

/**
 * Suggest courier assignments based on coverage zones, capacity, and strategy.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string[]} [params.shipmentIds]
 * @param {Object} [params.filters]
 * @param {string} [params.strategy='LEAST_LOAD'] - 'LEAST_LOAD' | 'ROUND_ROBIN' | 'ZONE_PRIORITY'
 * @param {string|Date} [params.date]
 * @param {string} [params.governorate]
 * @returns {Promise<{ assignments: Array, unassigned: Array }>}
 */
async function suggest({
  companyId,
  shipmentIds,
  filters,
  strategy = 'LEAST_LOAD',
  date,
  governorate,
}) {
  if (!companyId) {
    const err = new Error('معرف الشركة مطلوب');
    err.statusCode = 400;
    throw err;
  }

  const prisma = getSharedPrismaClient();
  const effectiveFilters = {
    ...(filters || {}),
    ...(date ? { date } : {}),
    ...(governorate ? { governorate } : {}),
  };

  let shipments = [];

  if (Array.isArray(shipmentIds) && shipmentIds.length > 0) {
    const uniqueIds = Array.from(new Set(shipmentIds));
    shipments = await prisma.shipment.findMany({
      where: { id: { in: uniqueIds } },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            governorate: true,
            city: true,
            shippingAddress: true,
            total: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // Multi-tenant check: all must exist and belong to companyId
    if (shipments.length !== uniqueIds.length || shipments.some((s) => s.companyId !== companyId)) {
      const err = new Error('واحد أو أكثر من الشحنات غير موجود أو لا يتبع هذه الشركة');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
  } else {
    // Filter open unassigned shipments
    const where = {
      companyId,
      status: { notIn: TERMINAL_STATUSES },
      courierId: null,
    };

    if (effectiveFilters.date) {
      const d = new Date(effectiveFilters.date);
      if (!isNaN(d.getTime())) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        where.createdAt = { gte: start, lte: end };
      }
    }

    shipments = await prisma.shipment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            governorate: true,
            city: true,
            shippingAddress: true,
            total: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (effectiveFilters.governorate) {
      const normGovFilter = normalizeGovernorateName(effectiveFilters.governorate);
      if (normGovFilter) {
        shipments = shipments.filter((s) => {
          const sGov = normalizeGovernorateName(
            s.destinationGovernorate || s.order?.governorate,
            s.destinationCity || s.order?.city,
            s.destinationAddress || s.order?.shippingAddress
          );
          return sGov === normGovFilter;
        });
      }
    }
  }

  // 1. Policy settings & courier daily capacity
  const policy = await getPolicy(companyId, prisma);
  const maxCapacity = Number(policy?.maxShipmentsPerCourierPerDay) || 60;

  // 2. Couriers (active, not off duty)
  const couriers = await prisma.courier.findMany({
    where: {
      companyId,
      isActive: true,
      status: { not: 'OFF_DUTY' },
    },
  });

  const courierIds = couriers.map((c) => c.id);

  // 3. Current load per courier
  const loadCounts = await prisma.shipment.groupBy({
    by: ['courierId'],
    where: {
      companyId,
      courierId: { in: courierIds },
      status: { in: OPEN_LOAD_STATUSES },
    },
    _count: { id: true },
  });

  const currentLoadMap = new Map();
  courierIds.forEach((id) => currentLoadMap.set(id, 0));
  loadCounts.forEach((lc) => {
    if (lc.courierId) {
      currentLoadMap.set(lc.courierId, lc._count.id || 0);
    }
  });

  // 4. Courier zones mapping
  const courierZonesMap = new Map();
  couriers.forEach((courier) => {
    courierZonesMap.set(courier.id, parseCourierGovernorates(courier.governorates));
  });

  const assignments = [];
  const unassigned = [];
  const roundRobinIndexByZone = new Map();

  for (const shipment of shipments) {
    // Check terminal/invalid status
    if (TERMINAL_STATUSES.includes(shipment.status)) {
      unassigned.push({
        shipmentId: shipment.id,
        orderNumber: shipment.order?.orderNumber || null,
        reason: 'INVALID_STATUS',
        status: shipment.status,
      });
      continue;
    }

    // Resolve normalized governorate
    const rawGov = shipment.destinationGovernorate || shipment.order?.governorate;
    const rawCity = shipment.destinationCity || shipment.order?.city;
    const rawAddress = shipment.destinationAddress || shipment.order?.shippingAddress;
    const normalizedGov = normalizeGovernorateName(rawGov, rawCity, rawAddress);

    if (!normalizedGov) {
      unassigned.push({
        shipmentId: shipment.id,
        orderNumber: shipment.order?.orderNumber || null,
        reason: 'NO_COURIER_IN_ZONE',
        details: 'Governorate not specified or unresolvable',
      });
      continue;
    }

    // Find eligible couriers who cover this governorate
    const eligibleCouriers = couriers.filter((courier) => {
      if (!courier.isActive || courier.status === 'OFF_DUTY') return false;
      const zones = courierZonesMap.get(courier.id) || [];
      return zones.some(
        (z) => z === normalizedGov || z.toLowerCase() === normalizedGov.toLowerCase()
      );
    });

    if (eligibleCouriers.length === 0) {
      unassigned.push({
        shipmentId: shipment.id,
        orderNumber: shipment.order?.orderNumber || null,
        destinationGovernorate: normalizedGov,
        reason: 'NO_COURIER_IN_ZONE',
      });
      continue;
    }

    // Filter by capacity
    const couriersWithCapacity = eligibleCouriers.filter((courier) => {
      const load = currentLoadMap.get(courier.id) || 0;
      return load < maxCapacity;
    });

    if (couriersWithCapacity.length === 0) {
      unassigned.push({
        shipmentId: shipment.id,
        orderNumber: shipment.order?.orderNumber || null,
        destinationGovernorate: normalizedGov,
        reason: 'ALL_AT_CAPACITY',
      });
      continue;
    }

    // Strategy selection
    let selectedCourier = null;
    const normStrategy = String(strategy || 'LEAST_LOAD').toUpperCase();

    if (normStrategy === 'ROUND_ROBIN') {
      const idx = roundRobinIndexByZone.get(normalizedGov) || 0;
      selectedCourier = couriersWithCapacity[idx % couriersWithCapacity.length];
      roundRobinIndexByZone.set(normalizedGov, idx + 1);
    } else if (normStrategy === 'ZONE_PRIORITY') {
      // Prioritize closer zone index (0 is primary), then least load
      const sorted = [...couriersWithCapacity].sort((a, b) => {
        const zonesA = courierZonesMap.get(a.id) || [];
        const zonesB = courierZonesMap.get(b.id) || [];
        const idxA = zonesA.findIndex(
          (z) => z === normalizedGov || z.toLowerCase() === normalizedGov.toLowerCase()
        );
        const idxB = zonesB.findIndex(
          (z) => z === normalizedGov || z.toLowerCase() === normalizedGov.toLowerCase()
        );
        if (idxA !== idxB) {
          return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
        }
        const loadA = currentLoadMap.get(a.id) || 0;
        const loadB = currentLoadMap.get(b.id) || 0;
        return loadA - loadB;
      });
      selectedCourier = sorted[0];
    } else {
      // LEAST_LOAD (default)
      const sorted = [...couriersWithCapacity].sort((a, b) => {
        const loadA = currentLoadMap.get(a.id) || 0;
        const loadB = currentLoadMap.get(b.id) || 0;
        return loadA - loadB;
      });
      selectedCourier = sorted[0];
    }

    // Increment simulated load for batch
    const updatedLoad = (currentLoadMap.get(selectedCourier.id) || 0) + 1;
    currentLoadMap.set(selectedCourier.id, updatedLoad);

    assignments.push({
      shipmentId: shipment.id,
      courierId: selectedCourier.id,
      courierName: selectedCourier.name,
      courierPhone: selectedCourier.phone,
      destinationGovernorate: normalizedGov,
      orderNumber: shipment.order?.orderNumber || null,
      codAmount: Number(shipment.codAmount || shipment.order?.total || 0),
    });
  }

  return { assignments, unassigned };
}

/**
 * Apply courier assignments: associates shipments with courier and delivery run,
 * records timeline events, and updates delivery run counters.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {Array<{ shipmentId: string, courierId: string }>} params.assignments
 * @param {string} [params.userId]
 * @returns {Promise<Object>}
 */
async function apply({ companyId, assignments = [], userId = null }) {
  if (!companyId) {
    const err = new Error('معرف الشركة مطلوب');
    err.statusCode = 400;
    throw err;
  }

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return {
      success: true,
      assignedCount: 0,
      failedCount: 0,
      applied: [],
      unassigned: [],
    };
  }

  const prisma = getSharedPrismaClient();

  const shipmentIds = Array.from(
    new Set(assignments.map((a) => a.shipmentId).filter(Boolean))
  );
  const courierIds = Array.from(
    new Set(assignments.map((a) => a.courierId).filter(Boolean))
  );

  // Multi-tenant check: Couriers
  const couriers = await prisma.courier.findMany({
    where: { id: { in: courierIds } },
  });
  if (
    couriers.length !== courierIds.length ||
    couriers.some((c) => c.companyId !== companyId)
  ) {
    const err = new Error('واحد أو أكثر من المناديب غير موجود أو لا يتبع هذه الشركة');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const courierMap = new Map(couriers.map((c) => [c.id, c]));

  // Multi-tenant check: Shipments
  const shipments = await prisma.shipment.findMany({
    where: { id: { in: shipmentIds } },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          total: true,
        },
      },
    },
  });
  if (
    shipments.length !== shipmentIds.length ||
    shipments.some((s) => s.companyId !== companyId)
  ) {
    const err = new Error('واحد أو أكثر من الشحنات غير موجود أو لا يتبع هذه الشركة');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const shipmentMap = new Map(shipments.map((s) => [s.id, s]));

  const validAssignments = [];
  const unassigned = [];

  for (const item of assignments) {
    const s = shipmentMap.get(item.shipmentId);
    if (!s || TERMINAL_STATUSES.includes(s.status)) {
      unassigned.push({
        shipmentId: item.shipmentId,
        reason: 'INVALID_STATUS',
        status: s ? s.status : 'UNKNOWN',
      });
    } else {
      validAssignments.push({
        shipmentId: item.shipmentId,
        courierId: item.courierId,
        shipment: s,
      });
    }
  }

  const assignmentsByCourier = new Map();
  validAssignments.forEach((item) => {
    if (!assignmentsByCourier.has(item.courierId)) {
      assignmentsByCourier.set(item.courierId, []);
    }
    assignmentsByCourier.get(item.courierId).push(item);
  });

  const applied = [];

  await prisma.$transaction(async (tx) => {
    for (const [courierId, items] of assignmentsByCourier.entries()) {
      const courier = courierMap.get(courierId);

      // Find or create DRAFT run for this courier
      let run = await tx.deliveryRun.findFirst({
        where: {
          companyId,
          courierId,
          status: 'DRAFT',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!run) {
        const runNumber = await generateRunNumber(tx, companyId);
        run = await tx.deliveryRun.create({
          data: {
            companyId,
            courierId,
            runNumber,
            status: 'DRAFT',
            dispatchDate: new Date(),
            totalShipments: 0,
            totalCODExpected: 0,
          },
        });
      }

      for (const { shipment } of items) {
        await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            courierId: courier.id,
            deliveryRunId: run.id,
            status: 'ASSIGNED',
          },
        });

        await recordShipmentEvent(tx, {
          companyId,
          shipmentId: shipment.id,
          fromStatus: shipment.status,
          toStatus: 'ASSIGNED',
          actorType: 'SYSTEM',
          actorId: userId || null,
          notes: `Auto-assigned to courier ${courier.name} (Run ${run.runNumber})`,
        });

        applied.push({
          shipmentId: shipment.id,
          courierId: courier.id,
          courierName: courier.name,
          deliveryRunId: run.id,
          runNumber: run.runNumber,
        });
      }

      // Update delivery run totals
      const runShipments = await tx.shipment.findMany({
        where: { deliveryRunId: run.id },
        select: {
          id: true,
          codAmount: true,
          order: {
            select: {
              total: true,
            },
          },
        },
      });

      const totalShipments = runShipments.length;
      const totalCODExpected = runShipments.reduce(
        (sum, s) => sum + Number(s.codAmount || s.order?.total || 0),
        0
      );

      await tx.deliveryRun.update({
        where: { id: run.id },
        data: {
          totalShipments,
          totalCODExpected,
        },
      });
    }
  });

  return {
    success: true,
    assignedCount: applied.length,
    failedCount: unassigned.length,
    applied,
    unassigned,
  };
}

/**
 * Suggests and immediately applies courier assignments
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string|Date} [params.date]
 * @param {string} [params.governorate]
 * @param {string} [params.strategy='LEAST_LOAD']
 * @param {string} [params.userId]
 * @returns {Promise<Object>}
 */
async function autoAssign({
  companyId,
  date,
  governorate,
  strategy = 'LEAST_LOAD',
  userId = null,
}) {
  const suggestResult = await suggest({
    companyId,
    filters: { date, governorate },
    strategy,
  });

  const { assignments: suggestedAssignments = [], unassigned: suggestUnassigned = [] } =
    suggestResult;

  if (suggestedAssignments.length === 0) {
    return {
      success: true,
      assignedCount: 0,
      failedCount: suggestUnassigned.length,
      assignments: [],
      unassigned: suggestUnassigned,
    };
  }

  const applyResult = await apply({
    companyId,
    assignments: suggestedAssignments.map((a) => ({
      shipmentId: a.shipmentId,
      courierId: a.courierId,
    })),
    userId,
  });

  const allUnassigned = [...suggestUnassigned, ...(applyResult.unassigned || [])];

  return {
    success: true,
    assignedCount: applyResult.assignedCount,
    failedCount: allUnassigned.length,
    assignments: applyResult.applied,
    unassigned: allUnassigned,
  };
}

module.exports = {
  suggest,
  apply,
  autoAssign,
  parseCourierGovernorates,
  generateRunNumber,
};
