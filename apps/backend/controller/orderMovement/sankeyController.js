const core = require('../../services/orderMovementCore');
const sql = require('../../services/orderMovementSql');

const START_KEY = 'START';

const handler = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const { startDate, endDate } = req.query;
    const mode = req.query.mode === 'manual' ? 'manual' : req.query.mode === 'auto' ? 'auto' : 'all';
    const { start, end } = core.normalizeDateRange({ startDate, endDate });

    const { rows, totals } = await sql.fetchTransitionAggregates({ companyId, start, end });

    const edges = new Map();
    const inflow = new Map();
    const outflow = new Map();
    let manualTransitions = 0;
    let autoTransitions = 0;

    for (const r of rows) {
      const from = r.fromStatus === '__start__' ? START_KEY : r.fromStatus;
      const to = r.toStatus;
      if (from === to) continue;

      const manualCount = Math.max(0, r.count - r.autoCount);
      let value = r.count;
      let manual = manualCount;
      let auto = r.autoCount;
      let revenue = r.revenue;

      if (mode === 'manual') {
        value = manualCount;
        auto = 0;
        revenue = r.revenue - r.autoRevenue;
        if (value <= 0) continue;
      } else if (mode === 'auto') {
        value = r.autoCount;
        manual = 0;
        revenue = r.autoRevenue;
        if (value <= 0) continue;
      }

      manualTransitions += manual;
      autoTransitions += auto;

      const key = `${from}\u0000${to}`;
      const agg = edges.get(key) || { from, to, count: 0, manual: 0, auto: 0, revenue: 0 };
      agg.count += value;
      agg.manual += manual;
      agg.auto += auto;
      agg.revenue += revenue;
      edges.set(key, agg);
    }

    for (const agg of edges.values()) {
      outflow.set(agg.from, (outflow.get(agg.from) || 0) + agg.count);
      if (agg.to !== START_KEY) inflow.set(agg.to, (inflow.get(agg.to) || 0) + agg.count);
    }

    const statuses = [];
    const seen = new Set();
    for (const agg of edges.values()) {
      if (agg.from !== START_KEY && !seen.has(agg.from)) {
        seen.add(agg.from);
        statuses.push(agg.from);
      }
      if (!seen.has(agg.to)) {
        seen.add(agg.to);
        statuses.push(agg.to);
      }
    }
    statuses.sort((a, b) => (outflow.get(b) || 0) - (outflow.get(a) || 0) || a.localeCompare(b));

    const nodes = [{ id: START_KEY, name: 'بداية' }, ...statuses.map((s) => ({ id: s, name: s }))];
    const indexMap = new Map(nodes.map((n, i) => [n.id, i]));

    const links = [];
    for (const agg of edges.values()) {
      links.push({
        source: indexMap.get(agg.from),
        target: indexMap.get(agg.to),
        value: agg.count,
        manual: agg.manual,
        auto: agg.auto,
        revenue: Math.round(agg.revenue * 100) / 100
      });
    }
    links.sort((a, b) => a.source - b.source || a.target - b.target);

    const topInflows = [...inflow.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));

    const topOutflows = [...outflow.entries()]
      .filter(([s]) => s !== START_KEY)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));

    const totalTransitions = mode === 'manual' ? manualTransitions : mode === 'auto' ? autoTransitions : totals.transitions;
    const totalOrders = mode === 'manual' ? totals.manualOrders : mode === 'auto' ? totals.autoOrders : totals.orders;

    return res.json({
      success: true,
      data: {
        truncated: false,
        totalTransitions,
        totalOrders,
        modes: { manual: manualTransitions, auto: autoTransitions },
        nodes,
        links,
        topInflows,
        topOutflows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحليل حركة الطلبات' });
  }
};

module.exports = handler;
