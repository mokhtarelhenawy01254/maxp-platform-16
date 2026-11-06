const { getSharedPrismaClient } = require('./sharedDatabase');
const courierService = require('./courierService');
const { getPolicy } = require('./shipping/policyService');
const { parseCourierGovernorates } = require('./shipping/autoAssignService');
const { normalizeGovernorateName } = require('../utils/orderLocationNormalizer');

const OPEN_LOAD_STATUSES = ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PENDING', 'ASSIGNED'];
const ACTIVE_PLAN_STATUSES = ['DRAFT', 'READY', 'ASSIGNED', 'DISPATCHED'];

function serviceError(message, statusCode, code) {
  const err = new Error(message);
  if (statusCode) err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function generatePlanNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RPL-${dateStr}-${rand}`;
}

/**
 * Creates a route plan with optional auto-suggested shipments in the specified governorate.
 */
async function createRoutePlan(companyId, { name, planDate, branchId, governorate, suggestShipments = true, userId }) {
  const prisma = getSharedPrismaClient();

  if (!name || !String(name).trim()) {
    throw serviceError('اسم خط السير مطلوب', 400, 'VALIDATION_ERROR');
  }

  const pDate = planDate ? new Date(planDate) : new Date();
  const planNumber = generatePlanNumber();
  const normalizedGov = governorate ? normalizeGovernorateName(governorate) || String(governorate).trim() : null;

  // Find candidate shipments if requested
  let suggestedStopsData = [];
  if (suggestShipments && normalizedGov) {
    // 1. Get IDs of shipments already in active plans
    const activeStops = await prisma.routeStop.findMany({
      where: {
        companyId,
        shipmentId: { not: null },
        routePlan: { status: { in: ACTIVE_PLAN_STATUSES } }
      },
      select: { shipmentId: true }
    });
    const activeShipmentIds = new Set(activeStops.map(s => s.shipmentId).filter(Boolean));

    // 2. Query available candidate shipments
    const shipments = await prisma.shipment.findMany({
      where: {
        companyId,
        courierId: null,
        deliveryRunId: null,
        destinationGovernorate: { contains: normalizedGov, mode: 'insensitive' },
        status: { in: ['READY', 'READY_TO_SHIP', 'READY_FOR_SHIPPING', 'PACKAGED', 'PACKED', 'PENDING'] },
        ...(branchId ? { branchId } : {})
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            customerAddress: true,
            city: true,
            governorate: true
          }
        }
      },
      take: 200
    });

    const unassigned = shipments.filter(s => !activeShipmentIds.has(s.id));

    suggestedStopsData = unassigned.map((s, index) => {
      const addr = s.destinationAddress || s.order?.customerAddress || 'العنوان غير محدد';
      const city = s.destinationCity || s.order?.city || null;
      const gov = s.destinationGovernorate || s.order?.governorate || normalizedGov;
      const cName = s.order?.customerName || 'عميل';
      const cPhone = s.order?.customerPhone || '';

      return {
        companyId,
        seq: index + 1,
        shipmentId: s.id,
        address: addr,
        city,
        governorate: gov,
        contactName: cName,
        contactPhone: cPhone,
        status: 'PENDING'
      };
    });
  }

  const plan = await prisma.routePlan.create({
    data: {
      companyId,
      planNumber,
      name: String(name).trim(),
      planDate: pDate,
      status: suggestedStopsData.length > 0 ? 'READY' : 'DRAFT',
      branchId: branchId || null,
      governorate: normalizedGov,
      totalStops: suggestedStopsData.length,
      totalShipments: suggestedStopsData.length,
      createdBy: userId || null,
      stops: {
        create: suggestedStopsData
      }
    },
    include: {
      stops: {
        orderBy: { seq: 'asc' }
      }
    }
  });

  return plan;
}

/**
 * Adds stops (either manual or linked to shipmentIds) to an existing plan.
 * Strictly prevents the same shipment from existing in two active plans (409 Conflict).
 */
async function addStopsToPlan(companyId, planId, { shipmentIds, stops }) {
  const prisma = getSharedPrismaClient();

  const plan = await prisma.routePlan.findFirst({
    where: { id: planId, companyId }
  });
  if (!plan) {
    throw serviceError('خط السير غير موجود أو لا يتبع هذه الشركة', 404, 'NOT_FOUND');
  }
  if (plan.status === 'CANCELLED' || plan.status === 'COMPLETED') {
    throw serviceError('لا يمكن إضافة وقفات لخط سير ملغي أو مكتمل', 400, 'INVALID_STATE');
  }

  const targetShipmentIds = Array.isArray(shipmentIds) ? shipmentIds.filter(Boolean) : [];

  // Check 409: Shipment in another active plan
  if (targetShipmentIds.length > 0) {
    const conflictingStop = await prisma.routeStop.findFirst({
      where: {
        companyId,
        shipmentId: { in: targetShipmentIds },
        routePlan: {
          id: { not: planId },
          status: { in: ACTIVE_PLAN_STATUSES }
        }
      },
      include: {
        routePlan: { select: { planNumber: true, name: true, status: true } }
      }
    });

    if (conflictingStop) {
      throw serviceError(
        `الشحنة موجودة بالفعل في خط سير نشط (${conflictingStop.routePlan?.planNumber || conflictingStop.routePlan?.name})`,
        409,
        'SHIPMENT_ALREADY_IN_ACTIVE_PLAN'
      );
    }
  }

  // Find current max seq
  const existingStops = await prisma.routeStop.findMany({
    where: { routePlanId: planId },
    select: { seq: true, shipmentId: true }
  });
  let maxSeq = existingStops.reduce((max, s) => Math.max(max, s.seq || 0), 0);
  const existingPlanShipmentIds = new Set(existingStops.map(s => s.shipmentId).filter(Boolean));

  const newStopsToCreate = [];

  // 1. From shipmentIds
  if (targetShipmentIds.length > 0) {
    const shipments = await prisma.shipment.findMany({
      where: { companyId, id: { in: targetShipmentIds } },
      include: {
        order: {
          select: {
            customerName: true,
            customerPhone: true,
            customerAddress: true,
            city: true,
            governorate: true
          }
        }
      }
    });

    for (const sh of shipments) {
      if (existingPlanShipmentIds.has(sh.id)) continue;
      maxSeq += 1;
      newStopsToCreate.push({
        companyId,
        routePlanId: planId,
        seq: maxSeq,
        shipmentId: sh.id,
        address: sh.destinationAddress || sh.order?.customerAddress || 'العنوان غير محدد',
        city: sh.destinationCity || sh.order?.city || null,
        governorate: sh.destinationGovernorate || sh.order?.governorate || plan.governorate || 'القاهرة',
        contactName: sh.order?.customerName || 'عميل',
        contactPhone: sh.order?.customerPhone || '',
        status: 'PENDING'
      });
    }
  }

  // 2. From manual stops array
  if (Array.isArray(stops) && stops.length > 0) {
    for (const st of stops) {
      if (!st.address || !st.contactName) continue;
      maxSeq += 1;
      newStopsToCreate.push({
        companyId,
        routePlanId: planId,
        seq: maxSeq,
        shipmentId: st.shipmentId || null,
        address: String(st.address).trim(),
        city: st.city ? String(st.city).trim() : null,
        governorate: st.governorate ? String(st.governorate).trim() : (plan.governorate || 'القاهرة'),
        contactName: String(st.contactName).trim(),
        contactPhone: st.contactPhone ? String(st.contactPhone).trim() : '',
        timeWindowFrom: st.timeWindowFrom || null,
        timeWindowTo: st.timeWindowTo || null,
        notes: st.notes ? String(st.notes).trim() : null,
        status: 'PENDING'
      });
    }
  }

  if (newStopsToCreate.length > 0) {
    await prisma.routeStop.createMany({
      data: newStopsToCreate
    });
  }

  // Recalculate totals
  const allStops = await prisma.routeStop.findMany({
    where: { routePlanId: planId }
  });
  const totalShipments = allStops.filter(s => Boolean(s.shipmentId)).length;

  const updatedPlan = await prisma.routePlan.update({
    where: { id: planId },
    data: {
      totalStops: allStops.length,
      totalShipments,
      status: plan.status === 'DRAFT' && allStops.length > 0 ? 'READY' : plan.status
    },
    include: {
      stops: { orderBy: { seq: 'asc' } }
    }
  });

  return updatedPlan;
}

/**
 * Reorders stops manually or automatically by governorate & city.
 */
async function reorderStops(companyId, planId, { stops, auto }) {
  const prisma = getSharedPrismaClient();

  const plan = await prisma.routePlan.findFirst({
    where: { id: planId, companyId },
    include: { stops: true }
  });
  if (!plan) {
    throw serviceError('خط السير غير موجود', 404, 'NOT_FOUND');
  }

  let orderedStops = [...plan.stops];

  if (auto) {
    // Sort stops alphabetically/hierarchically by governorate -> city -> address
    orderedStops.sort((a, b) => {
      const govA = a.governorate || '';
      const govB = b.governorate || '';
      if (govA !== govB) return govA.localeCompare(govB, 'ar');
      const cityA = a.city || '';
      const cityB = b.city || '';
      if (cityA !== cityB) return cityA.localeCompare(cityB, 'ar');
      return (a.address || '').localeCompare(b.address || '', 'ar');
    });

    for (let i = 0; i < orderedStops.length; i++) {
      await prisma.routeStop.update({
        where: { id: orderedStops[i].id },
        data: { seq: i + 1 }
      });
    }
  } else if (Array.isArray(stops) && stops.length > 0) {
    const seqMap = new Map(stops.map(s => [s.id, Number(s.seq)]));
    for (const stop of plan.stops) {
      if (seqMap.has(stop.id)) {
        await prisma.routeStop.update({
          where: { id: stop.id },
          data: { seq: seqMap.get(stop.id) }
        });
      }
    }
  }

  const finalStops = await prisma.routeStop.findMany({
    where: { routePlanId: planId },
    orderBy: { seq: 'asc' }
  });

  return finalStops;
}

/**
 * Assigns a courier to the route plan with strict coverage and capacity checks.
 */
async function assignCourierToPlan(companyId, planId, { courierId }) {
  const prisma = getSharedPrismaClient();

  const plan = await prisma.routePlan.findFirst({
    where: { id: planId, companyId },
    include: { stops: true }
  });
  if (!plan) {
    throw serviceError('خط السير غير موجود', 404, 'NOT_FOUND');
  }

  if (!courierId) {
    // Unassign courier
    return prisma.routePlan.update({
      where: { id: planId },
      data: { courierId: null, status: plan.stops.length > 0 ? 'READY' : 'DRAFT' }
    });
  }

  const courier = await prisma.courier.findFirst({
    where: { id: courierId, companyId }
  });
  if (!courier || !courier.isActive || courier.status === 'OFF_DUTY') {
    throw serviceError('المندوب غير موجود أو خارج الخدمة', 400, 'COURIER_INACTIVE');
  }

  // 1. Coverage Check (Governorate)
  const courierGovernorates = parseCourierGovernorates(courier.governorates);
  const targetGov = plan.governorate ? normalizeGovernorateName(plan.governorate) || plan.governorate : null;

  if (targetGov) {
    const isCovered = courierGovernorates.some(
      g => g === targetGov || g.toLowerCase() === targetGov.toLowerCase()
    );
    if (!isCovered) {
      throw serviceError(
        `المندوب (${courier.name}) لا يغطي محافظة خط السير (${plan.governorate}). المناطق المتاحة له: [${courierGovernorates.join('، ')}]`,
        400,
        'COURIER_ZONE_MISMATCH'
      );
    }
  }

  // 2. Capacity Check
  const policy = await getPolicy(companyId, prisma);
  const maxCapacity = Number(policy?.maxShipmentsPerCourierPerDay) || 60;

  const currentLoad = await prisma.shipment.count({
    where: {
      companyId,
      courierId,
      status: { in: OPEN_LOAD_STATUSES }
    }
  });

  if (currentLoad + plan.totalShipments > maxCapacity) {
    throw serviceError(
      `تجاوز سعة المندوب: الحمل الحالي (${currentLoad}) + شحنات الخطة (${plan.totalShipments}) يتجاوز الحد الأقصى اليومي (${maxCapacity})`,
      400,
      'COURIER_CAPACITY_EXCEEDED'
    );
  }

  const updatedPlan = await prisma.routePlan.update({
    where: { id: planId },
    data: {
      courierId: courier.id,
      status: 'ASSIGNED'
    },
    include: {
      stops: { orderBy: { seq: 'asc' } }
    }
  });

  return updatedPlan;
}

/**
 * Dispatches a planned route into an official DeliveryRun.
 * Creates the DeliveryRun from shipments and links the plan without breaking W8.
 */
async function dispatchRoutePlan(companyId, planId, { userId, notes }) {
  const prisma = getSharedPrismaClient();

  const plan = await prisma.routePlan.findFirst({
    where: { id: planId, companyId },
    include: { stops: { orderBy: { seq: 'asc' } } }
  });
  if (!plan) {
    throw serviceError('خط السير غير موجود', 404, 'NOT_FOUND');
  }

  if (plan.status === 'DISPATCHED' || plan.status === 'COMPLETED') {
    throw serviceError('خط السير تم تحويله إلى رحلة بالفعل', 400, 'ALREADY_DISPATCHED');
  }

  if (!plan.courierId) {
    throw serviceError('يجب إسناد مندوب للخطة قبل التحويل إلى رحلة', 400, 'NO_COURIER_ASSIGNED');
  }

  const shipmentIds = plan.stops.map(s => s.shipmentId).filter(Boolean);
  if (shipmentIds.length === 0) {
    throw serviceError('لا توجد شحنات مرتبطة بالخطة لتحويلها إلى رحلة توزيع', 400, 'NO_SHIPMENTS_IN_PLAN');
  }

  // Call courierService.createDeliveryRun to create the run with full W8 integrity
  const deliveryRun = await courierService.createDeliveryRun(companyId, {
    courierId: plan.courierId,
    shipmentIds,
    notes: notes || plan.notes || `تم الإنشاء من خط السير ${plan.planNumber}`,
    userId
  });

  // Link RoutePlan to DeliveryRun and advance status
  const updatedPlan = await prisma.routePlan.update({
    where: { id: planId },
    data: {
      deliveryRunId: deliveryRun.id,
      status: 'DISPATCHED'
    },
    include: {
      stops: { orderBy: { seq: 'asc' } }
    }
  });

  return {
    success: true,
    plan: updatedPlan,
    deliveryRun
  };
}

/**
 * Lists route plans with filtering.
 */
async function listRoutePlans(companyId, { date, status, courierId, page = 1, limit = 50 } = {}) {
  const prisma = getSharedPrismaClient();

  const where = { companyId };
  if (status) where.status = status;
  if (courierId) where.courierId = courierId;

  if (date) {
    const d = new Date(date);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    where.planDate = { gte: startOfDay, lte: endOfDay };
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const [total, plans] = await Promise.all([
    prisma.routePlan.count({ where }),
    prisma.routePlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
      include: {
        stops: {
          select: { id: true, seq: true, shipmentId: true, address: true, city: true, status: true }
        }
      }
    })
  ]);

  // Load couriers for plans
  const courierIds = [...new Set(plans.map(pl => pl.courierId).filter(Boolean))];
  const couriers = courierIds.length > 0
    ? await prisma.courier.findMany({
        where: { id: { in: courierIds }, companyId },
        select: { id: true, name: true, phone: true }
      })
    : [];
  const courierMap = new Map(couriers.map(c => [c.id, c]));

  const enrichedPlans = plans.map(pl => ({
    ...pl,
    courier: pl.courierId ? courierMap.get(pl.courierId) || null : null
  }));

  return {
    total,
    page: p,
    limit: l,
    plans: enrichedPlans
  };
}

/**
 * Gets a route plan by ID with stops ordered by seq.
 */
async function getRoutePlanById(companyId, planId) {
  const prisma = getSharedPrismaClient();

  const plan = await prisma.routePlan.findFirst({
    where: { id: planId, companyId },
    include: {
      stops: {
        orderBy: { seq: 'asc' }
      }
    }
  });

  if (!plan) return null;

  let courier = null;
  if (plan.courierId) {
    courier = await prisma.courier.findFirst({
      where: { id: plan.courierId, companyId },
      select: { id: true, name: true, phone: true, governorates: true, vehicleType: true }
    });
  }

  let deliveryRun = null;
  if (plan.deliveryRunId) {
    deliveryRun = await prisma.deliveryRun.findFirst({
      where: { id: plan.deliveryRunId, companyId },
      select: { id: true, runNumber: true, status: true, totalShipments: true, totalCODExpected: true }
    });
  }

  return {
    ...plan,
    courier,
    deliveryRun
  };
}

module.exports = {
  createRoutePlan,
  addStopsToPlan,
  reorderStops,
  assignCourierToPlan,
  dispatchRoutePlan,
  listRoutePlans,
  getRoutePlanById
};
