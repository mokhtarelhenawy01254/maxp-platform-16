const moment = require('moment-timezone');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { buildDateRangeFilter } = require('../utils/dateUtils');

const DEFAULT_TIMEZONE = 'Africa/Cairo';

/**
 * Format a Date object to YYYY-MM-DD in the company timezone
 */
const toDateStrInTz = (date, tz = DEFAULT_TIMEZONE) => {
  return moment(date).tz(tz).format('YYYY-MM-DD');
};

/**
 * Categorize the calendar age difference between creation date and shipped date
 */
const getVintageBucketKey = (diffDays) => {
  if (diffDays <= 0) return 'same_day';
  if (diffDays === 1) return 'day_1';
  if (diffDays === 2) return 'day_2';
  if (diffDays === 3) return 'day_3';
  if (diffDays >= 4 && diffDays <= 7) return 'days_4_to_7';
  return 'days_over_7';
};

const VINTAGE_BUCKETS_META = [
  { key: 'same_day', label: 'نفس اليوم (0 يوم)', shortLabel: 'نفس اليوم', color: '#10B981' },
  { key: 'day_1', label: 'أمس (1 يوم)', shortLabel: '1 يوم', color: '#3B82F6' },
  { key: 'day_2', label: 'قبل يومين (2 يوم)', shortLabel: '2 يوم', color: '#6366F1' },
  { key: 'day_3', label: 'قبل 3 أيام', shortLabel: '3 أيام', color: '#F59E0B' },
  { key: 'days_4_to_7', label: '4 إلى 7 أيام', shortLabel: '4-7 أيام', color: '#F97316' },
  { key: 'days_over_7', label: 'أكثر من 7 أيام (متأخر)', shortLabel: '> 7 أيام', color: '#EF4444' },
];

/**
 * GET /api/v1/analytics/fulfillment-velocity
 * الملخص التشغيلي لسرعة الإنجاز وتوزيع أعمار الطلبات المشحونة في يوم محدد
 */
const getFulfillmentVelocitySummary = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.company?.id;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const prisma = getSharedPrismaClient();
    const { date, startDate, endDate, tz, milestone: rawMilestone } = req.query;
    const timezone = tz || req.user?.company?.timezone || DEFAULT_TIMEZONE;
    const milestone = rawMilestone === 'SHIPPED' ? 'SHIPPED' : 'READY_TO_SHIP';
    const targetStatuses = milestone === 'SHIPPED' ? ['SHIPPED'] : ['READY_TO_SHIP', 'READY', 'PACKAGED'];

    // Default to today if no date provided
    const targetStartDate = startDate || date || moment().tz(timezone).format('YYYY-MM-DD');
    const targetEndDate = endDate || date || targetStartDate;

    const shipDateFilter = buildDateRangeFilter(targetStartDate, targetEndDate, timezone);

    // 1. Fetch all status changes matching the milestone in this window
    const historyRows = await prisma.orderStatusHistory.findMany({
      where: {
        order: { companyId },
        status: { in: targetStatuses },
        createdAt: shipDateFilter,
      },
      select: {
        id: true,
        orderId: true,
        guestOrderId: true,
        status: true,
        oldStatus: true,
        userName: true,
        changedBy: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also check guest order status history
    const guestHistoryRows = await prisma.orderStatusHistory.findMany({
      where: {
        guestOrder: { companyId },
        status: { in: targetStatuses },
        createdAt: shipDateFilter,
      },
      select: {
        id: true,
        orderId: true,
        guestOrderId: true,
        status: true,
        oldStatus: true,
        userName: true,
        changedBy: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const allHistories = [...historyRows, ...guestHistoryRows];

    // Deduplicate by orderId or guestOrderId (keep latest transition in this window)
    const orderHistoryMap = new Map();
    for (const h of allHistories) {
      const key = h.orderId ? `reg_${h.orderId}` : `gst_${h.guestOrderId}`;
      if (!orderHistoryMap.has(key)) {
        orderHistoryMap.set(key, h);
      }
    }

    const uniqueOrderIds = [];
    const uniqueGuestOrderIds = [];
    for (const h of orderHistoryMap.values()) {
      if (h.orderId) uniqueOrderIds.push(h.orderId);
      else if (h.guestOrderId) uniqueGuestOrderIds.push(h.guestOrderId);
    }

    // 2. Fetch Order and GuestOrder details, plus current waiting carrier inventory
    const [regularOrders, guestOrders, inflowRegCount, inflowGstCount, waitingRegular, waitingGuest] = await Promise.all([
      uniqueOrderIds.length > 0
        ? prisma.order.findMany({
            where: { id: { in: uniqueOrderIds }, companyId },
            select: {
              id: true,
              orderNumber: true,
              total: true,
              createdAt: true,
              status: true,
              customerName: true,
              customerPhone: true,
              governorate: true,
            },
          })
        : [],
      uniqueGuestOrderIds.length > 0
        ? prisma.guestOrder.findMany({
            where: { id: { in: uniqueGuestOrderIds }, companyId },
            select: {
              id: true,
              orderNumber: true,
              finalTotal: true,
              createdAt: true,
              status: true,
              guestName: true,
              guestPhone: true,
            },
          })
        : [],
      // Inflow orders created in the same window
      prisma.order.count({
        where: { companyId, createdAt: shipDateFilter },
      }),
      prisma.guestOrder.count({
        where: { companyId, createdAt: shipDateFilter },
      }),
    ]);

    // Active orders in warehouse waiting for carrier pickup (Safe query with fallback)
    let waitingCarrierCount = 0;
    let waitingCarrierRevenue = 0;
    try {
      const [activeReg, activeGst] = await Promise.all([
        prisma.order.findMany({
          where: {
            companyId,
            status: { in: ['READY_TO_SHIP', 'READY', 'PACKAGED', 'PROCESSING'] },
          },
          select: { id: true, status: true, total: true, metadata: true },
        }),
        prisma.guestOrder.findMany({
          where: {
            companyId,
            status: { in: ['READY_TO_SHIP', 'READY', 'PACKAGED', 'PROCESSING', 'processing'] },
          },
          select: { id: true, status: true, finalTotal: true, metadata: true },
        }),
      ]);

      const isReadyOrder = (o) => {
        const s = String(o.status || '').toUpperCase();
        if (['READY_TO_SHIP', 'READY', 'PACKAGED'].includes(s)) return true;
        if (typeof o.metadata === 'string' && (o.metadata.includes('READY_TO_SHIP') || o.metadata.includes('PACKAGED'))) {
          return true;
        }
        return false;
      };

      const matchedReg = (activeReg || []).filter(isReadyOrder);
      const matchedGst = (activeGst || []).filter(isReadyOrder);
      waitingCarrierCount = matchedReg.length + matchedGst.length;
      waitingCarrierRevenue =
        matchedReg.reduce((s, o) => s + Number(o.total || 0), 0) +
        matchedGst.reduce((s, g) => s + Number(g.finalTotal || 0), 0);
    } catch (carrierErr) {
      console.warn('⚠️ [FULFILLMENT-VELOCITY] waitingCarrier query fallback:', carrierErr.message);
    }

    const regularMap = new Map(regularOrders.map((o) => [o.id, o]));
    const guestMap = new Map(guestOrders.map((g) => [g.id, g]));

    // 3. Process each order matching the milestone
    let totalShippedCount = 0;
    let totalShippedRevenue = 0;
    let totalLeadTimeHours = 0;
    let handoffDoneCount = 0;
    let handoffPendingCount = 0;

    const bucketsMap = {
      same_day: { count: 0, revenue: 0 },
      day_1: { count: 0, revenue: 0 },
      day_2: { count: 0, revenue: 0 },
      day_3: { count: 0, revenue: 0 },
      days_4_to_7: { count: 0, revenue: 0 },
      days_over_7: { count: 0, revenue: 0 },
    };

    const cohortMap = new Map(); // key = creationDate (YYYY-MM-DD)
    const teamMap = new Map(); // key = employee name

    for (const h of orderHistoryMap.values()) {
      const order = h.orderId ? regularMap.get(h.orderId) : guestMap.get(h.guestOrderId);
      if (!order) continue;

      totalShippedCount++;
      const orderTotal = Number(order.total || order.finalTotal || 0);
      totalShippedRevenue += orderTotal;

      const isHandoffDone = ['SHIPPED', 'DELIVERED'].includes(order.status);
      if (isHandoffDone) handoffDoneCount++;
      else handoffPendingCount++;

      const eventAt = new Date(h.createdAt);
      const createdAt = new Date(order.createdAt);

      const leadHours = Math.max(0, (eventAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
      totalLeadTimeHours += leadHours;

      const eventDayStr = toDateStrInTz(eventAt, timezone);
      const createDayStr = toDateStrInTz(createdAt, timezone);

      const eventMoment = moment.tz(eventDayStr, timezone);
      const createMoment = moment.tz(createDayStr, timezone);
      const diffDays = Math.max(0, eventMoment.diff(createMoment, 'days'));

      const bucketKey = getVintageBucketKey(diffDays);
      bucketsMap[bucketKey].count++;
      bucketsMap[bucketKey].revenue += orderTotal;

      // Group by exact creation date
      if (!cohortMap.has(createDayStr)) {
        cohortMap.set(createDayStr, {
          creationDate: createDayStr,
          diffDays,
          ordersCount: 0,
          totalRevenue: 0,
          totalLeadHours: 0,
        });
      }
      const cohort = cohortMap.get(createDayStr);
      cohort.ordersCount++;
      cohort.totalRevenue += orderTotal;
      cohort.totalLeadHours += leadHours;

      // Group by team member who took this action
      const actor = h.userName || h.changedBy || (milestone === 'READY_TO_SHIP' ? 'موظف التجهيز' : 'النظام');
      if (!teamMap.has(actor)) {
        teamMap.set(actor, { name: actor, totalShipped: 0, freshOrders: 0, agedOrders: 0 });
      }
      const teamRecord = teamMap.get(actor);
      teamRecord.totalShipped++;
      if (diffDays <= 1) teamRecord.freshOrders++;
      else teamRecord.agedOrders++;
    }

    const avgLeadTimeHours =
      totalShippedCount > 0 ? Math.round((totalLeadTimeHours / totalShippedCount) * 10) / 10 : 0;

    // Prepare buckets array
    const vintageBuckets = VINTAGE_BUCKETS_META.map((b) => {
      const data = bucketsMap[b.key];
      const percent = totalShippedCount > 0 ? Math.round((data.count / totalShippedCount) * 100) : 0;
      return {
        key: b.key,
        label: b.label,
        shortLabel: b.shortLabel,
        color: b.color,
        count: data.count,
        revenue: Math.round(data.revenue),
        percent,
      };
    });

    // Prepare cohorts array sorted descending by creation date
    const cohortsList = Array.from(cohortMap.values())
      .map((c) => ({
        creationDate: c.creationDate,
        diffDays: c.diffDays,
        ordersCount: c.ordersCount,
        totalRevenue: Math.round(c.totalRevenue),
        percentOfBatch: totalShippedCount > 0 ? Math.round((c.ordersCount / totalShippedCount) * 1000) / 10 : 0,
        avgLeadTimeHours: Math.round((c.totalLeadHours / c.ordersCount) * 10) / 10,
      }))
      .sort((a, b) => b.creationDate.localeCompare(a.creationDate));

    // Inflow vs Outflow
    const inflowTotalCount = inflowRegCount + inflowGstCount;
    const netBacklogDelta = totalShippedCount - inflowTotalCount; // Positive means clearing backlog

    const teamList = Array.from(teamMap.values()).sort((a, b) => b.totalShipped - a.totalShipped);

    res.json({
      success: true,
      data: {
        dateRange: {
          startDate: targetStartDate,
          endDate: targetEndDate,
          isSingleDay: targetStartDate === targetEndDate,
        },
        kpis: {
          milestone,
          milestoneLabel: milestone === 'READY_TO_SHIP' ? 'جاهز للشحن (تجهيز المخزن)' : 'تم الشحن (استلام شركة الشحن)',
          actionVerb: milestone === 'READY_TO_SHIP' ? 'تجهيز' : 'شحن',
          totalShippedCount,
          totalCount: totalShippedCount,
          totalShippedRevenue: Math.round(totalShippedRevenue),
          totalRevenue: Math.round(totalShippedRevenue),
          avgLeadTimeHours,
          sameDayCount: bucketsMap.same_day.count,
          sameDayRate: totalShippedCount > 0 ? Math.round((bucketsMap.same_day.count / totalShippedCount) * 100) : 0,
          agedBacklogCount: bucketsMap.days_4_to_7.count + bucketsMap.days_over_7.count,
          agedBacklogRate:
            totalShippedCount > 0
              ? Math.round(
                  ((bucketsMap.days_4_to_7.count + bucketsMap.days_over_7.count) / totalShippedCount) * 100
                )
              : 0,
          inflowCount: inflowTotalCount,
          outflowCount: totalShippedCount,
          netBacklogDelta,
          waitingCarrierCount,
          waitingCarrierRevenue: Math.round(waitingCarrierRevenue),
          handoffDoneCount,
          handoffPendingCount,
        },
        vintageBuckets,
        cohorts: cohortsList,
        teamBreakdown: teamList,
      },
    });
  } catch (err) {
    console.error('❌ [FULFILLMENT-VELOCITY] Error:', err);
    res.status(500).json({
      success: false,
      message: 'فشل تحميل بيانات سرعة الإنجاز وأعمار الطلبات',
      error: err?.message,
    });
  }
};

/**
 * GET /api/v1/analytics/fulfillment-velocity/orders
 * جلب تفاصيل الطلبات لشريحة عمرية أو تاريخ ورود محدد (Drill-down)
 */
const getFulfillmentVelocityOrders = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.company?.id;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const prisma = getSharedPrismaClient();
    const {
      date,
      startDate,
      endDate,
      vintageBucket,
      creationDate,
      milestone: rawMilestone,
      search = '',
      page = 1,
      limit = 30,
      tz,
    } = req.query;

    const timezone = tz || req.user?.company?.timezone || DEFAULT_TIMEZONE;
    const milestone = rawMilestone === 'SHIPPED' ? 'SHIPPED' : 'READY_TO_SHIP';
    const targetStatuses = milestone === 'SHIPPED' ? ['SHIPPED'] : ['READY_TO_SHIP', 'READY', 'PACKAGED'];

    const targetStartDate = startDate || date || moment().tz(timezone).format('YYYY-MM-DD');
    const targetEndDate = endDate || date || targetStartDate;

    const shipDateFilter = buildDateRangeFilter(targetStartDate, targetEndDate, timezone);

    // 1. Fetch histories in this window matching target milestone
    const [historyRows, guestHistoryRows] = await Promise.all([
      prisma.orderStatusHistory.findMany({
        where: { order: { companyId }, status: { in: targetStatuses }, createdAt: shipDateFilter },
        select: { orderId: true, userName: true, changedBy: true, createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.orderStatusHistory.findMany({
        where: { guestOrder: { companyId }, status: { in: targetStatuses }, createdAt: shipDateFilter },
        select: { guestOrderId: true, userName: true, changedBy: true, createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const defaultActor = milestone === 'READY_TO_SHIP' ? 'موظف التجهيز' : 'النظام';
    const orderShipMap = new Map();
    for (const h of historyRows) {
      if (h.orderId && !orderShipMap.has(h.orderId)) {
        orderShipMap.set(h.orderId, { shippedAt: h.createdAt, shippedBy: h.userName || h.changedBy || defaultActor });
      }
    }
    const guestShipMap = new Map();
    for (const g of guestHistoryRows) {
      if (g.guestOrderId && !guestShipMap.has(g.guestOrderId)) {
        guestShipMap.set(g.guestOrderId, { shippedAt: g.createdAt, shippedBy: g.userName || g.changedBy || defaultActor });
      }
    }

    const regIds = Array.from(orderShipMap.keys());
    const gstIds = Array.from(guestShipMap.keys());

    // 2. Fetch full order records
    const [regularOrders, guestOrders] = await Promise.all([
      regIds.length > 0
        ? prisma.order.findMany({
            where: { id: { in: regIds }, companyId },
            select: {
              id: true,
              orderNumber: true,
              total: true,
              createdAt: true,
              status: true,
              customerName: true,
              customerPhone: true,
              governorate: true,
              city: true,
            },
          })
        : [],
      gstIds.length > 0
        ? prisma.guestOrder.findMany({
            where: { id: { in: gstIds }, companyId },
            select: {
              id: true,
              orderNumber: true,
              finalTotal: true,
              createdAt: true,
              status: true,
              guestName: true,
              guestPhone: true,
            },
          })
        : [],
    ]);

    // 3. Normalize & calculate lead times
    const allOrders = [];

    for (const o of regularOrders) {
      const shipInfo = orderShipMap.get(o.id);
      const shippedAt = new Date(shipInfo.shippedAt);
      const createdAt = new Date(o.createdAt);
      const shipDayStr = toDateStrInTz(shippedAt, timezone);
      const createDayStr = toDateStrInTz(createdAt, timezone);
      const diffDays = Math.max(0, moment.tz(shipDayStr, timezone).diff(moment.tz(createDayStr, timezone), 'days'));
      const bucket = getVintageBucketKey(diffDays);
      const leadHours = Math.max(0, Math.round(((shippedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) * 10) / 10);
      const isHandoffDone = ['SHIPPED', 'DELIVERED'].includes(o.status);

      allOrders.push({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName || 'عميل',
        customerPhone: o.customerPhone || '',
        governorate: o.governorate || o.city || '-',
        total: Number(o.total || 0),
        status: o.status,
        createdAt: o.createdAt,
        shippedAt: shipInfo.shippedAt,
        shippedBy: shipInfo.shippedBy,
        createDayStr,
        shipDayStr,
        diffDays,
        vintageBucket: bucket,
        leadTimeHours: leadHours,
        isGuest: false,
        milestone,
        handoffStatus: isHandoffDone ? 'SHIPPED' : 'WAITING_PICKUP',
      });
    }

    for (const g of guestOrders) {
      const shipInfo = guestShipMap.get(g.id);
      const shippedAt = new Date(shipInfo.shippedAt);
      const createdAt = new Date(g.createdAt);
      const shipDayStr = toDateStrInTz(shippedAt, timezone);
      const createDayStr = toDateStrInTz(createdAt, timezone);
      const diffDays = Math.max(0, moment.tz(shipDayStr, timezone).diff(moment.tz(createDayStr, timezone), 'days'));
      const bucket = getVintageBucketKey(diffDays);
      const leadHours = Math.max(0, Math.round(((shippedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) * 10) / 10);
      const isHandoffDone = ['SHIPPED', 'DELIVERED'].includes(g.status);

      allOrders.push({
        id: g.id,
        orderNumber: g.orderNumber,
        customerName: g.guestName || 'عميل (ضيف)',
        customerPhone: g.guestPhone || '',
        governorate: '-',
        total: Number(g.finalTotal || 0),
        status: g.status,
        createdAt: g.createdAt,
        shippedAt: shipInfo.shippedAt,
        shippedBy: shipInfo.shippedBy,
        createDayStr,
        shipDayStr,
        diffDays,
        vintageBucket: bucket,
        leadTimeHours: leadHours,
        isGuest: true,
        milestone,
        handoffStatus: isHandoffDone ? 'SHIPPED' : 'WAITING_PICKUP',
      });
    }

    // 4. Filter by bucket or creationDate if provided
    let filtered = allOrders;
    if (vintageBucket && vintageBucket !== 'ALL') {
      filtered = filtered.filter((o) => o.vintageBucket === vintageBucket);
    }
    if (creationDate) {
      filtered = filtered.filter((o) => o.createDayStr === creationDate);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q)
      );
    }

    // Sort by shippedAt desc
    filtered.sort((a, b) => new Date(b.shippedAt).getTime() - new Date(a.shippedAt).getTime());

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const total = filtered.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedOrders = filtered.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: {
        orders: paginatedOrders,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    console.error('❌ [FULFILLMENT-VELOCITY-ORDERS] Error:', err);
    res.status(500).json({ success: false, message: 'فشل جلب قائمة الطلبات' });
  }
};

module.exports = {
  getFulfillmentVelocitySummary,
  getFulfillmentVelocityOrders,
};
