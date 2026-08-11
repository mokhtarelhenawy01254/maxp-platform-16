
const core = require('../../services/orderMovementCore');

const round2 = (n) => Math.round(n * 100) / 100;

const normalizeReason = (reason) => String(reason || '').replace(/\s+/g, ' ').trim();

const handler = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, mode = 'all' } = req.query;

    const { orders, truncated } = await core.fetchOrderMovementData({ companyId, startDate, endDate });

    const scoped = [];
    for (const order of orders) {
      const history = order.statusHistory || [];
      const last = history.length ? history[history.length - 1] : null;
      const lastAuto = last ? core.isAutoChange(last) : false;
      if (mode === 'manual' && lastAuto) continue;
      if (mode === 'auto' && !lastAuto) continue;
      scoped.push({ order, last, lastAuto });
    }

    const totalOrders = scoped.length;
    const statusMap = new Map();
    const reasonMap = new Map();
    let delivered = 0;
    let failed = 0;
    let deliveredRevenue = 0;
    let failedRevenue = 0;
    let manual = 0;
    let auto = 0;

    for (const { order, last, lastAuto } of scoped) {
      const status = core.normalizeStatus(last ? last.status : order.status);
      const total = Number(order.total ?? 0);

      const statusRow = statusMap.get(status) || { status, count: 0, revenue: 0 };
      statusRow.count += 1;
      statusRow.revenue += total;
      statusMap.set(status, statusRow);

      if (lastAuto) auto += 1;
      else manual += 1;

      if (core.SUCCESS_STATUSES.has(status)) {
        delivered += 1;
        deliveredRevenue += total;
      } else if (core.FAILURE_STATUSES.has(status)) {
        failed += 1;
        failedRevenue += total;
      }

      if (core.FAILURE_STATUSES.has(status)) {
        const reason = last ? normalizeReason(last.reason) : '';
        if (reason) {
          const reasonRow = reasonMap.get(reason) || { reason, count: 0, revenue: 0, status };
          reasonRow.count += 1;
          reasonRow.revenue += total;
          reasonMap.set(reason, reasonRow);
        }
      }
    }

    const outcomes = [...statusMap.values()]
      .map((row) => ({
        status: row.status,
        count: row.count,
        percent: totalOrders ? round2((row.count / totalOrders) * 100) : 0,
        revenue: round2(row.revenue),
        avgOrderValue: row.count ? round2(row.revenue / row.count) : 0,
        isTerminal: core.TERMINAL_STATUSES.has(row.status)
      }))
      .sort((a, b) => b.count - a.count);

    const reasons = [...reasonMap.values()].sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        truncated,
        summary: {
          totalOrders,
          delivered,
          failed,
          pending: totalOrders - delivered - failed,
          successRate: totalOrders ? round2((delivered / totalOrders) * 100) : 0,
          deliveredRevenue: round2(deliveredRevenue),
          lostRevenue: round2(failedRevenue),
          failedRevenue: round2(failedRevenue)
        },
        outcomes,
        reasons,
        modeSplit: { manual, auto }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حساب النتائج النهائية' });
  }
};

module.exports = handler;
