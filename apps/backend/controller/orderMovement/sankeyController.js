const core = require('../../services/orderMovementCore');

const START_KEY = 'START';

const filterByMode = (transitions, mode) => mode === 'manual' ? transitions.filter((t) => !t.auto) : mode === 'auto' ? transitions.filter((t) => t.auto) : transitions;

const handler = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const { startDate, endDate } = req.query;
    const mode = req.query.mode === 'manual' ? 'manual' : req.query.mode === 'auto' ? 'auto' : 'all';
    const { start, end } = core.normalizeDateRange({ startDate, endDate });
    const { orders, truncated } = await core.fetchOrderMovementData({ companyId, startDate, endDate });

    const edges = new Map();
    const inflow = new Map();
    const outflow = new Map();
    let totalTransitions = 0;
    let totalOrders = 0;
    let manualTransitions = 0;
    let autoTransitions = 0;

    for (const order of orders) {
      const list = filterByMode(core.buildTransitions(order, { start, end }), mode);
      if (list.length === 0) continue;
      totalOrders += 1;
      for (const t of list) {
        totalTransitions += 1;
        if (t.auto) autoTransitions += 1;
        else manualTransitions += 1;
        const from = t.oldStatus ? t.oldStatus : START_KEY;
        const to = t.status;
        if (from === to) continue;
        const key = `${from}\u0000${to}`;
        const agg = edges.get(key) || { from, to, count: 0, manual: 0, auto: 0, revenue: 0 };
        agg.count += 1;
        agg.manual += t.auto ? 0 : 1;
        agg.auto += t.auto ? 1 : 0;
        agg.revenue += Number(t.orderTotal || 0);
        edges.set(key, agg);
      }
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

    const nodes = [{ id: 'START', name: 'بداية' }, ...statuses.map((s) => ({ id: s, name: s }))];
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
      .sort((a, b) => b.count - a.count);

    const topOutflows = [...outflow.entries()]
      .filter(([s]) => s !== START_KEY)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    return res.json({
      success: true,
      data: {
        truncated,
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
