const core = require('../../services/orderMovementCore');
const sql = require('../../services/orderMovementSql');

const round2 = (n) => Math.round(n * 100) / 100;

const handler = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });
    }

    const { startDate, endDate, mode = 'all' } = req.query;
    const { start, end } = core.normalizeDateRange({ startDate, endDate });

    const rows = await sql.fetchOutcomeRows({ companyId, start, end });

    const scoped = rows.filter((r) => {
      if (mode === 'manual' && r.auto) return false;
      if (mode === 'auto' && !r.auto) return false;
      return true;
    });

    const totalOrders = scoped.length;
    const statusMap = new Map();
    const reasonMap = new Map();
    let delivered = 0;
    let failed = 0;
    let deliveredRevenue = 0;
    let failedRevenue = 0;
    let manual = 0;
    let auto = 0;

    for (const row of scoped) {
      const status = row.status;
      const total = row.total;

      const statusRow = statusMap.get(status) || { status, count: 0, revenue: 0 };
      statusRow.count += 1;
      statusRow.revenue += total;
      statusMap.set(status, statusRow);

      if (row.auto) auto += 1;
      else manual += 1;

      if (core.SUCCESS_STATUSES.has(status)) {
        delivered += 1;
        deliveredRevenue += total;
      } else if (core.FAILURE_STATUSES.has(status)) {
        failed += 1;
        failedRevenue += total;
      }

      if (core.FAILURE_STATUSES.has(status) && row.reason) {
        const reasonRow = reasonMap.get(row.reason) || { reason: row.reason, count: 0, revenue: 0, status };
        reasonRow.count += 1;
        reasonRow.revenue += total;
        reasonMap.set(row.reason, reasonRow);
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
        truncated: false,
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
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪¡╪│╪º╪¿ ╪º┘ä┘å╪¬╪º╪ª╪¼ ╪º┘ä┘å┘ç╪º╪ª┘è╪⌐' });
  }
};

module.exports = handler;
