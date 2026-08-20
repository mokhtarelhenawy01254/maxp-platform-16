const { getSharedPrismaClient } = require('./sharedDatabase');

async function fetchTransitionAggregates({ companyId, start, end }) {
  const prisma = getSharedPrismaClient();
  const rows = await prisma.$queryRaw`
    SELECT
      COALESCE(h."oldStatus", '__start__') AS "fromStatus",
      h."status" AS "toStatus",
      COUNT(*)::int AS "count",
      COALESCE(SUM(o."total"), 0)::float AS "revenue",
      COALESCE(SUM(o."total") FILTER (
        WHERE UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%SYSTEM%'
           OR UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%AUTO%'
           OR UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%CRON%'
      ), 0)::float AS "autoRevenue",
      COUNT(*) FILTER (
        WHERE UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%SYSTEM%'
           OR UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%AUTO%'
           OR UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%CRON%'
      )::int AS "autoCount"
    FROM "OrderStatusHistory" h
    JOIN "orders" o ON o."id" = h."orderId"
    WHERE o."companyId" = ${String(companyId)}
      AND h."createdAt" >= ${start}
      AND h."createdAt" <= ${end}
    GROUP BY 1, 2
  `;

  const totals = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS "transitions",
      COUNT(DISTINCT h."orderId")::int AS "orders",
      COUNT(DISTINCT h."orderId") FILTER (
        WHERE NOT (
          UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%SYSTEM%'
          OR UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%AUTO%'
          OR UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%CRON%'
        )
      )::int AS "manualOrders",
      COUNT(DISTINCT h."orderId") FILTER (
        WHERE UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%SYSTEM%'
           OR UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%AUTO%'
           OR UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%CRON%'
      )::int AS "autoOrders"
    FROM "OrderStatusHistory" h
    JOIN "orders" o ON o."id" = h."orderId"
    WHERE o."companyId" = ${String(companyId)}
      AND h."createdAt" >= ${start}
      AND h."createdAt" <= ${end}
  `;

  const agg = rows.map((r) => ({
    fromStatus: String(r.fromStatus || '__start__').trim().toUpperCase(),
    toStatus: String(r.toStatus || '').trim().toUpperCase(),
    count: Number(r.count || 0),
    revenue: Number(r.revenue || 0),
    autoRevenue: Number(r.autoRevenue || 0),
    autoCount: Number(r.autoCount || 0)
  }));

  const t = totals && totals[0] ? totals[0] : {};
  return {
    rows: agg,
    totals: {
      transitions: Number(t.transitions || 0),
      orders: Number(t.orders || 0),
      manualOrders: Number(t.manualOrders || 0),
      autoOrders: Number(t.autoOrders || 0)
    }
  };
}

async function fetchOutcomeRows({ companyId, start, end }) {
  const prisma = getSharedPrismaClient();
  const rows = await prisma.$queryRaw`
    SELECT
      oc."status" AS "status",
      oc."reason" AS "reason",
      oc."auto" AS "auto",
      o."total" AS "total"
    FROM "orders" o
    JOIN (
      SELECT DISTINCT ON (h."orderId")
        h."orderId",
        h."status" AS "status",
        h."reason" AS "reason",
        (
          UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%SYSTEM%'
          OR UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%AUTO%'
          OR UPPER(COALESCE(h."changedBy",'') || ' ' || COALESCE(h."userName",'')) LIKE '%CRON%'
        ) AS "auto"
      FROM "OrderStatusHistory" h
      WHERE h."createdAt" >= ${start}
        AND h."createdAt" <= ${end}
      ORDER BY h."orderId", h."createdAt" DESC
    ) oc ON oc."orderId" = o."id"
    WHERE o."companyId" = ${String(companyId)}
  `;
  return rows.map((r) => ({
    status: String(r.status || '').trim().toUpperCase(),
    reason: r.reason ? String(r.reason).replace(/\s+/g, ' ').trim() : '',
    auto: Boolean(r.auto),
    total: Number(r.total || 0)
  }));
}

module.exports = {
  fetchTransitionAggregates,
  fetchOutcomeRows
};
