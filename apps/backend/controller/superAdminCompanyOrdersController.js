const moment = require("moment-timezone");
const { getSharedPrismaClient } = require("../services/sharedDatabase");

const getPrisma = () => getSharedPrismaClient();

/**
 * Standardize status classification across MaxP platform
 */
const categorizeStatus = (status) => {
  const s = String(status || "").toUpperCase();
  if (["PENDING", "DRAFT", "ON_HOLD", "PENDING_PREPARATION"].includes(s)) {
    return "pending";
  }
  if ([
    "CONFIRMED",
    "PROCESSING",
    "READY_FOR_PROCESSING",
    "SCHEDULED",
    "PREPARING",
    "READY",
    "PACKAGED",
    "QUALITY_CHECK",
    "WOO_TAGHEZ",
  ].includes(s)) {
    return "confirmed";
  }
  if (["SHIPPED", "OUT_FOR_DELIVERY", "READY_TO_SHIP", "NOT_SHIPPED"].includes(s)) {
    return "inDelivery";
  }
  if (["DELIVERED", "PARTIALLY_DELIVERED"].includes(s)) {
    return "delivered";
  }
  if ([
    "CANCELLED",
    "RETURNED",
    "REFUNDED",
    "DUPLICATE_ORDER",
    "PARTIALLY_RETURNED",
    "EXCHANGED",
    "PARTIALLY_REFUNDED",
    "LOST",
    "STOCK_SHORTAGE",
    "SHORTAGE_FAILED",
    "PENDING_CANCELLATION",
    "TRASH",
  ].includes(s)) {
    return "cancelled";
  }
  return "other";
};

/**
 * Resolve date ranges for selected period and previous comparison period
 */
const resolveDateRanges = (period, customStart, customEnd, tz = "Africa/Cairo") => {
  const now = moment().tz(tz);
  let currentStart;
  let currentEnd;
  let prevStart;
  let prevEnd;
  let isSingleDay = false;

  switch (period) {
    case "yesterday": {
      isSingleDay = true;
      currentStart = now.clone().subtract(1, "day").startOf("day");
      currentEnd = now.clone().subtract(1, "day").endOf("day");
      prevStart = now.clone().subtract(2, "days").startOf("day");
      prevEnd = now.clone().subtract(2, "days").endOf("day");
      break;
    }
    case "7d": {
      currentStart = now.clone().subtract(6, "days").startOf("day");
      currentEnd = now.clone().endOf("day");
      prevStart = now.clone().subtract(13, "days").startOf("day");
      prevEnd = now.clone().subtract(7, "days").endOf("day");
      break;
    }
    case "30d": {
      currentStart = now.clone().subtract(29, "days").startOf("day");
      currentEnd = now.clone().endOf("day");
      prevStart = now.clone().subtract(59, "days").startOf("day");
      prevEnd = now.clone().subtract(30, "days").endOf("day");
      break;
    }
    case "month": {
      currentStart = now.clone().startOf("month");
      currentEnd = now.clone().endOf("day");
      prevStart = now.clone().subtract(1, "month").startOf("month");
      prevEnd = now.clone().subtract(1, "month").endOf("month");
      break;
    }
    case "custom": {
      if (customStart && customEnd) {
        currentStart = moment.tz(customStart, tz).startOf("day");
        currentEnd = moment.tz(customEnd, tz).endOf("day");
        const diffDays = Math.max(1, currentEnd.diff(currentStart, "days") + 1);
        isSingleDay = diffDays === 1;
        prevStart = currentStart.clone().subtract(diffDays, "days");
        prevEnd = currentStart.clone().subtract(1, "millisecond");
      } else {
        isSingleDay = true;
        currentStart = now.clone().startOf("day");
        currentEnd = now.clone().endOf("day");
        prevStart = now.clone().subtract(1, "day").startOf("day");
        prevEnd = now.clone().subtract(1, "day").endOf("day");
      }
      break;
    }
    case "today":
    default: {
      isSingleDay = true;
      currentStart = now.clone().startOf("day");
      currentEnd = now.clone().endOf("day");
      prevStart = now.clone().subtract(1, "day").startOf("day");
      prevEnd = now.clone().subtract(1, "day").endOf("day");
      break;
    }
  }

  return {
    currentStart: currentStart.toDate(),
    currentEnd: currentEnd.toDate(),
    prevStart: prevStart.toDate(),
    prevEnd: prevEnd.toDate(),
    isSingleDay,
    currentStartStr: currentStart.format("YYYY-MM-DD HH:mm:ss"),
    currentEndStr: currentEnd.format("YYYY-MM-DD HH:mm:ss"),
  };
};

/**
 * GET /api/v1/super-admin/company-orders/daily-summary
 * Get platform-wide daily and period order statistics per company
 */
const getDailyOrdersSummary = async (req, res) => {
  try {
    const prisma = getPrisma();
    const {
      period = "today",
      startDate,
      endDate,
      tz = "Africa/Cairo",
      search = "",
      withOrdersOnly = "false",
    } = req.query;

    const ranges = resolveDateRanges(period, startDate, endDate, tz);
    const { currentStart, currentEnd, prevStart, prevEnd, isSingleDay } = ranges;

    // Parallel fetch: Companies, Order Aggregates, Status Aggregates, Prev Period Aggregates, Timeline Orders
    const [
      companies,
      orderAggregates,
      statusAggregates,
      platformCurrentTotals,
      platformPrevTotals,
      timelineOrders,
    ] = await Promise.all([
      prisma.company.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          slug: true,
          logo: true,
          isActive: true,
          currency: true,
          createdAt: true,
          platformSubscription: {
            select: {
              status: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.order.groupBy({
        by: ["companyId"],
        _count: { id: true },
        _sum: { total: true },
        _max: { createdAt: true },
        where: {
          createdAt: { gte: currentStart, lte: currentEnd },
        },
      }),
      prisma.order.groupBy({
        by: ["companyId", "status"],
        _count: { id: true },
        where: {
          createdAt: { gte: currentStart, lte: currentEnd },
        },
      }),
      prisma.order.aggregate({
        _count: { id: true },
        _sum: { total: true },
        where: {
          createdAt: { gte: currentStart, lte: currentEnd },
        },
      }),
      prisma.order.aggregate({
        _count: { id: true },
        _sum: { total: true },
        where: {
          createdAt: { gte: prevStart, lte: prevEnd },
        },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: currentStart, lte: currentEnd },
        },
        select: {
          createdAt: true,
          total: true,
        },
      }),
    ]);

    // Build fast lookup map for company aggregates
    const companyAggregatesMap = new Map();
    for (const item of orderAggregates) {
      if (item.companyId) {
        companyAggregatesMap.set(item.companyId, {
          ordersCount: item._count.id || 0,
          ordersGMV: parseFloat(item._sum.total || 0),
          latestOrderAt: item._max.createdAt || null,
        });
      }
    }

    // Build status breakdown map per company
    const companyStatusMap = new Map();
    for (const item of statusAggregates) {
      if (!item.companyId) continue;
      if (!companyStatusMap.has(item.companyId)) {
        companyStatusMap.set(item.companyId, {
          pending: 0,
          confirmed: 0,
          inDelivery: 0,
          delivered: 0,
          cancelled: 0,
          other: 0,
          raw: {},
        });
      }
      const entry = companyStatusMap.get(item.companyId);
      const count = item._count.id || 0;
      const cat = categorizeStatus(item.status);
      entry[cat] = (entry[cat] || 0) + count;
      entry.raw[item.status] = count;
    }

    // Compile companies records
    let companiesReport = companies.map((c) => {
      const stats = companyAggregatesMap.get(c.id) || {
        ordersCount: 0,
        ordersGMV: 0,
        latestOrderAt: null,
      };
      const statuses = companyStatusMap.get(c.id) || {
        pending: 0,
        confirmed: 0,
        inDelivery: 0,
        delivered: 0,
        cancelled: 0,
        other: 0,
        raw: {},
      };
      const aov =
        stats.ordersCount > 0 ? stats.ordersGMV / stats.ordersCount : 0;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        slug: c.slug,
        logo: c.logo,
        isActive: c.isActive,
        currency: c.currency || "EGP",
        createdAt: c.createdAt,
        subscriptionStatus: c.platformSubscription?.status || "NONE",
        ordersCount: stats.ordersCount,
        ordersGMV: Math.round(stats.ordersGMV * 100) / 100,
        avgOrderValue: Math.round(aov * 100) / 100,
        latestOrderAt: stats.latestOrderAt,
        statusBreakdown: statuses,
      };
    });

    // Optional filtering by search query
    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim().toLowerCase();
      companiesReport = companiesReport.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.slug && c.slug.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }

    // Optional filtering: with orders only
    if (withOrdersOnly === "true") {
      companiesReport = companiesReport.filter((c) => c.ordersCount > 0);
    }

    // Sort: highest order count first, then highest GMV
    companiesReport.sort((a, b) => {
      if (b.ordersCount !== a.ordersCount) {
        return b.ordersCount - a.ordersCount;
      }
      return b.ordersGMV - a.ordersGMV;
    });

    // Platform totals
    const currentTotalOrders = platformCurrentTotals._count.id || 0;
    const currentTotalGMV = parseFloat(platformCurrentTotals._sum.total || 0);
    const prevTotalOrders = platformPrevTotals._count.id || 0;
    const prevTotalGMV = parseFloat(platformPrevTotals._sum.total || 0);

    const ordersGrowthPercent =
      prevTotalOrders > 0
        ? Math.round(
            ((currentTotalOrders - prevTotalOrders) / prevTotalOrders) * 1000
          ) / 10
        : currentTotalOrders > 0
        ? 100
        : 0;

    const gmvGrowthPercent =
      prevTotalGMV > 0
        ? Math.round(((currentTotalGMV - prevTotalGMV) / prevTotalGMV) * 1000) /
          10
        : currentTotalGMV > 0
        ? 100
        : 0;

    const activeStoresWithOrdersCount = companiesReport.filter(
      (c) => c.ordersCount > 0
    ).length;

    const topMerchant =
      companiesReport.length > 0 && companiesReport[0].ordersCount > 0
        ? {
            id: companiesReport[0].id,
            name: companiesReport[0].name,
            slug: companiesReport[0].slug,
            ordersCount: companiesReport[0].ordersCount,
            ordersGMV: companiesReport[0].ordersGMV,
          }
        : null;

    // Build timeline chart buckets (hourly if single day, daily if multi-day)
    let timelineChart = [];
    if (isSingleDay) {
      // 24 hourly buckets: 00:00 to 23:00
      const hourlyMap = new Array(24).fill(0).map((_, i) => ({
        label: `${String(i).padStart(2, "0")}:00`,
        hour: i,
        ordersCount: 0,
        gmv: 0,
      }));

      for (const order of timelineOrders) {
        const h = moment.tz(order.createdAt, tz).hour();
        if (h >= 0 && h < 24) {
          hourlyMap[h].ordersCount += 1;
          hourlyMap[h].gmv += parseFloat(order.total || 0);
        }
      }
      timelineChart = hourlyMap.map((b) => ({
        ...b,
        gmv: Math.round(b.gmv * 100) / 100,
      }));
    } else {
      // Group by date (YYYY-MM-DD)
      const dateMap = new Map();
      let curr = moment(currentStart).tz(tz);
      const end = moment(currentEnd).tz(tz);

      while (curr.isSameOrBefore(end, "day")) {
        const key = curr.format("YYYY-MM-DD");
        const displayLabel = curr.format("DD/MM");
        dateMap.set(key, {
          label: displayLabel,
          date: key,
          ordersCount: 0,
          gmv: 0,
        });
        curr.add(1, "day");
      }

      for (const order of timelineOrders) {
        const dKey = moment.tz(order.createdAt, tz).format("YYYY-MM-DD");
        if (dateMap.has(dKey)) {
          const entry = dateMap.get(dKey);
          entry.ordersCount += 1;
          entry.gmv += parseFloat(order.total || 0);
        }
      }

      timelineChart = Array.from(dateMap.values()).map((b) => ({
        ...b,
        gmv: Math.round(b.gmv * 100) / 100,
      }));
    }

    return res.json({
      success: true,
      meta: {
        period,
        timezone: tz,
        isSingleDay,
        startDate: ranges.currentStartStr,
        endDate: ranges.currentEndStr,
        generatedAt: new Date().toISOString(),
      },
      summary: {
        totalOrders: currentTotalOrders,
        totalGMV: Math.round(currentTotalGMV * 100) / 100,
        avgOrderValue:
          currentTotalOrders > 0
            ? Math.round((currentTotalGMV / currentTotalOrders) * 100) / 100
            : 0,
        activeCompaniesCount: activeStoresWithOrdersCount,
        totalCompaniesCount: companies.length,
        activeRatePercent:
          companies.length > 0
            ? Math.round(
                (activeStoresWithOrdersCount / companies.length) * 1000
              ) / 10
            : 0,
        ordersGrowthPercent,
        gmvGrowthPercent,
        prevTotalOrders,
        prevTotalGMV: Math.round(prevTotalGMV * 100) / 100,
        topMerchant,
      },
      timeline: timelineChart,
      companies: companiesReport,
    });
  } catch (error) {
    console.error("[SA] daily-orders error:", error);
    return res.status(500).json({
      success: false,
      error: "فشل استخراج ملخص الطلبات اليومية للمنصة",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * GET /api/v1/super-admin/dashboard/operations-pulse
 * Live multi-domain pulse telemetry for Super Admin command center
 */
const getOperationsPulse = async (req, res) => {
  try {
    const prisma = getPrisma();
    const tz = req.query.tz || "Africa/Cairo";
    const now = moment().tz(tz);
    const todayStart = now.clone().startOf("day").toDate();
    const todayEnd = now.clone().endOf("day").toDate();
    const in48h = now.clone().add(48, "hours").toDate();

    // Parallel fetch across domains with safe fallbacks
    const [
      ordersTodayAgg,
      topMerchantAgg,
      waConnectedCount,
      waDisconnectedSessions,
      todayCartsAgg,
      todayRecoveredCount,
      aiLogsAgg,
      trialsEndingSoon,
    ] = await Promise.all([
      // 1. Orders today
      prisma.order
        .aggregate({
          _count: { id: true },
          _sum: { total: true },
          where: { createdAt: { gte: todayStart, lte: todayEnd } },
        })
        .catch(() => ({ _count: { id: 0 }, _sum: { total: 0 } })),

      // 2. Top merchant today
      prisma.order
        .groupBy({
          by: ["companyId"],
          _count: { id: true },
          _sum: { total: true },
          where: { createdAt: { gte: todayStart, lte: todayEnd } },
          orderBy: { _count: { id: "desc" } },
          take: 1,
        })
        .catch(() => []),

      // 3. WhatsApp Connected sessions
      prisma.whatsAppSession
        .count({
          where: { status: "CONNECTED" },
        })
        .catch(() => 0),

      // 4. WhatsApp Disconnected / Needs QR sessions
      prisma.whatsAppSession
        .findMany({
          where: { status: { not: "CONNECTED" } },
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            status: true,
            company: {
              select: { id: true, name: true, slug: true },
            },
          },
          take: 6,
        })
        .catch(() => []),

      // 5. Abandoned Guest Carts today
      prisma.guestCart
        .aggregate({
          _count: { id: true },
          _sum: { total: true },
          where: { createdAt: { gte: todayStart, lte: todayEnd } },
        })
        .catch(() => ({ _count: { id: 0 }, _sum: { total: 0 } })),

      // 6. Recovered carts today
      prisma.cartConversionLog
        .count({
          where: { convertedAt: { gte: todayStart, lte: todayEnd } },
        })
        .catch(() => 0),

      // 7. AI provider logs today
      prisma.aiProviderLog
        .aggregate({
          _count: { id: true },
          _avg: { latencyMs: true },
          where: { createdAt: { gte: todayStart, lte: todayEnd } },
        })
        .catch(() => ({ _count: { id: 0 }, _avg: { latencyMs: 0 } })),

      // 8. Trials ending in <= 48 hours
      prisma.company
        .findMany({
          where: {
            isActive: true,
            OR: [
              { trialEndsAt: { gte: now.toDate(), lte: in48h } },
              {
                platformSubscription: {
                  trialEndDate: { gte: now.toDate(), lte: in48h },
                },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            trialEndsAt: true,
            platformSubscription: {
              select: { trialEndDate: true },
            },
          },
          take: 5,
        })
        .catch(() => []),
    ]);

    // Top merchant resolution
    let topMerchant = null;
    if (topMerchantAgg.length > 0 && topMerchantAgg[0].companyId) {
      const topComp = await prisma.company
        .findUnique({
          where: { id: topMerchantAgg[0].companyId },
          select: { id: true, name: true, slug: true },
        })
        .catch(() => null);

      if (topComp) {
        topMerchant = {
          ...topComp,
          ordersCount: topMerchantAgg[0]._count.id || 0,
          ordersGMV: Math.round(parseFloat(topMerchantAgg[0]._sum.total || 0)),
        };
      }
    }

    const totalOrdersToday = ordersTodayAgg._count.id || 0;
    const totalGMVToday = Math.round(parseFloat(ordersTodayAgg._sum.total || 0));

    const totalWaSessions =
      waConnectedCount + waDisconnectedSessions.length;

    const cartsCountToday = todayCartsAgg._count.id || 0;
    const cartsValueToday = Math.round(parseFloat(todayCartsAgg._sum.total || 0));
    const recoveryRate =
      cartsCountToday > 0
        ? Math.round((todayRecoveredCount / cartsCountToday) * 1000) / 10
        : 0;

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      pulse: {
        orders: {
          todayOrders: totalOrdersToday,
          todayGMV: totalGMVToday,
          avgOrderValue:
            totalOrdersToday > 0 ? Math.round(totalGMVToday / totalOrdersToday) : 0,
          topMerchant,
        },
        whatsapp: {
          totalSessions: totalWaSessions,
          connected: waConnectedCount,
          disconnected: waDisconnectedSessions.length,
          hasDisconnectedAlert: waDisconnectedSessions.length > 0,
          disconnectedList: waDisconnectedSessions.map((s) => ({
            id: s.id,
            companyName: s.company?.name || "متجر",
            companyId: s.company?.id,
            phoneNumber: s.phoneNumber || "بدون رقم",
            status: s.status,
          })),
        },
        abandonedCarts: {
          todayCount: cartsCountToday,
          todayValue: cartsValueToday,
          todayRecovered: todayRecoveredCount,
          recoveryRatePercent: recoveryRate,
        },
        aiActivity: {
          todayInteractions: aiLogsAgg._count.id || 0,
          avgLatencyMs: Math.round(aiLogsAgg._avg.latencyMs || 0),
        },
        trials: {
          expiringCount: trialsEndingSoon.length,
          hasExpiringAlert: trialsEndingSoon.length > 0,
          expiringList: trialsEndingSoon.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            endsAt: c.trialEndsAt || c.platformSubscription?.trialEndDate,
          })),
        },
      },
    });
  } catch (error) {
    console.error("[SA] operations-pulse error:", error);
    return res.status(500).json({
      success: false,
      error: "فشل استخراج نبض عمليات المنصة",
    });
  }
};

module.exports = {
  getDailyOrdersSummary,
  getOperationsPulse,
  resolveDateRanges,
  categorizeStatus,
};
