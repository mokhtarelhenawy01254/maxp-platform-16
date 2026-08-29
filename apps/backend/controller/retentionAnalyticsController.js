const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * Retention Analytics for Swan — RPR / Cohort / RFM
 * GET /api/v1/analytics/retention?period=90
 */
async function getRetentionAnalytics(req, res) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'companyId مطلوب' });

    const prisma = getSharedPrismaClient();
    const periodDays = Math.max(7, Math.min(365, parseInt(req.query.period, 10) || 90));
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    // --- RPR (Repeat Purchase Rate) ---
    const [totalCustomersWithOrders, repeatCustomers, totalOrders, deliveredOrders] = await Promise.all([
      prisma.customer.count({ where: { companyId, orders: { some: {} } } }),
      prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM (SELECT "customerId" FROM "orders" WHERE "companyId" = ${companyId} GROUP BY "customerId" HAVING COUNT(*) > 1) t`,
      prisma.order.count({ where: { companyId } }),
      prisma.order.count({ where: { companyId, status: 'DELIVERED' } })
    ]);
    const repeatCount = repeatCustomers?.[0]?.cnt || 0;
    const rpr = totalCustomersWithOrders > 0 ? (repeatCount / totalCustomersWithOrders) * 100 : 0;

    // Avg orders per customer
    const avgOrdersPerCustomer = totalCustomersWithOrders > 0 ? (totalOrders / totalCustomersWithOrders) : 0;

    // --- RFM Snapshot (sample 200 customers) ---
    const rfmRows = await prisma.$queryRaw`
      SELECT c.id, c."firstName", c."lastName", c.phone,
             COUNT(o.id)::int as frequency,
             COALESCE(SUM(o.total),0)::float as monetary,
             MAX(o."createdAt") as lastOrderAt,
             MIN(o."createdAt") as firstOrderAt,
             EXTRACT(DAY FROM NOW() - MAX(o."createdAt"))::int as recencyDays
      FROM "customers" c
      JOIN "orders" o ON o."customerId" = c.id
      WHERE c."companyId" = ${companyId}
      GROUP BY c.id, c."firstName", c."lastName", c.phone
      ORDER BY monetary DESC
      LIMIT 200
    `;

    const rfmTiers = { champions: 0, loyal: 0, atRisk: 0, new: 0, hibernating: 0 };
    const rfmList = (rfmRows || []).map(r => {
      const f = r.frequency || 0;
      const recency = r.recencydays || 999;
      let tier = 'hibernating';
      if (f >= 5 && recency <= 30 && r.monetary >= 1000) { tier = 'champions'; rfmTiers.champions++; }
      else if (f >= 5) { tier = 'loyal'; rfmTiers.loyal++; }
      else if (f >= 1 && recency <= 60) { tier = 'new'; rfmTiers.new++; }
      else if (recency >= 30 && recency < 90) { tier = 'atRisk'; rfmTiers.atRisk++; }
      else { rfmTiers.hibernating++; }
      return {
        id: r.id,
        name: `${r.firstName||''} ${r.lastName||''}`.trim() || '—',
        phone: r.phone,
        frequency: f,
        monetary: parseFloat(r.monetary||0),
        recencyDays: recency,
        tier,
        firstOrderAt: r.firstorderat,
        lastOrderAt: r.lastorderat
      };
    });

    // --- Cohort (monthly) — first order month -> retention in next 3 months ---
    const cohortRows = await prisma.$queryRaw`
      SELECT to_char(first_order, 'YYYY-MM') as cohort,
             COUNT(*)::int as customers,
             COUNT(CASE WHEN has_second THEN 1 END)::int as retained
      FROM (
        SELECT c.id,
               MIN(o."createdAt") as first_order,
               (COUNT(o.id) > 1) as has_second
        FROM "customers" c
        JOIN "orders" o ON o."customerId" = c.id
        WHERE c."companyId" = ${companyId}
        GROUP BY c.id
      ) t
      GROUP BY cohort
      ORDER BY cohort DESC
      LIMIT 12
    `;

    const cohorts = (cohortRows || []).map(r => ({
      cohort: r.cohort,
      customers: r.customers,
      retained: r.retained,
      retentionRate: r.customers > 0 ? parseFloat(((r.retained / r.customers) * 100).toFixed(1)) : 0
    }));

    // --- Repeat distribution ---
    const repeatDist = await prisma.$queryRaw`
      SELECT orders_cnt as cnt, COUNT(*)::int as customers
      FROM (SELECT "customerId", COUNT(*)::int as orders_cnt FROM "orders" WHERE "companyId" = ${companyId} GROUP BY "customerId") t
      GROUP BY orders_cnt
      ORDER BY orders_cnt ASC
      LIMIT 10
    `;

    res.json({
      success: true,
      data: {
        periodDays,
        rpr: { rate: parseFloat(rpr.toFixed(1)), repeatCustomers: repeatCount, totalCustomersWithOrders, avgOrdersPerCustomer: parseFloat(avgOrdersPerCustomer.toFixed(2)), totalOrders, deliveredOrders },
        rfm: { tiers: rfmTiers, sample: rfmList.slice(0, 20), totalSampled: rfmList.length },
        cohorts,
        repeatDistribution: (repeatDist || []).map(r => ({ orders: r.cnt, customers: r.customers }))
      }
    });
  } catch (error) {
    console.error('Retention analytics error', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getRetentionAnalytics };