const core = require('../../services/orderMovementCore');

const filterByMode = (transitions, mode) => mode === 'manual' ? transitions.filter((t) => !t.auto) : mode === 'auto' ? transitions.filter((t) => t.auto) : transitions;

const handler = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const { startDate, endDate } = req.query;
    const mode = req.query.mode === 'manual' ? 'manual' : req.query.mode === 'auto' ? 'auto' : 'all';
    const { start, end } = core.normalizeDateRange({ startDate, endDate });
    const { orders, truncated } = await core.fetchOrderMovementData({ companyId, startDate, endDate });

    const pathMap = new Map();
    const hoursByOrder = [];
    let totalOrders = 0;
    let maxPathLength = 0;
    let pathLengthSum = 0;
    let successPathCount = 0;
    let failedPathCount = 0;

    for (const order of orders) {
      const list = filterByMode(core.buildTransitions(order, { start, end }), mode);
      if (list.length === 0) continue;
      totalOrders += 1;

      const statuses = list.map((t) => t.status);
      const path = statuses.join('→');
      const last = list[list.length - 1];
      const hours = core.hoursBetween(order.createdAt, last.createdAt);
      const terminal = statuses[statuses.length - 1];

      if (core.SUCCESS_STATUSES.has(terminal)) successPathCount += 1;
      else if (core.FAILURE_STATUSES.has(terminal)) failedPathCount += 1;

      maxPathLength = Math.max(maxPathLength, statuses.length);
      pathLengthSum += statuses.length;
      hoursByOrder.push(hours);

      let agg = pathMap.get(path);
      if (!agg) {
        agg = {
          path,
          orderCount: 0,
          hoursArr: [],
          totalRevenue: 0,
          manualTransitions: 0,
          autoTransitions: 0,
          terminalStatus: terminal
        };
        pathMap.set(path, agg);
      }
      agg.orderCount += 1;
      agg.hoursArr.push(hours);
      agg.totalRevenue += Number(order.total ?? 0);
      agg.manualTransitions += list.filter((t) => !t.auto).length;
      agg.autoTransitions += list.filter((t) => t.auto).length;
    }

    const topPaths = [...pathMap.values()]
      .map((p) => {
        const sortedHours = [...p.hoursArr].sort((a, b) => a - b);
        const avgOrderValue = p.orderCount ? p.totalRevenue / p.orderCount : 0;
        const percent = totalOrders ? (p.orderCount / totalOrders) * 100 : 0;
        return {
          path: p.path,
          orderCount: p.orderCount,
          percent: Math.round(percent * 10) / 10,
          avgHours: Math.round(core.calcMean(p.hoursArr) * 100) / 100,
          medianHours: Math.round(core.calcPercentile(sortedHours, 50) * 100) / 100,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          totalRevenue: Math.round(p.totalRevenue * 100) / 100,
          terminalStatus: p.terminalStatus,
          manualTransitions: p.manualTransitions,
          autoTransitions: p.autoTransitions
        };
      })
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 15);

    res.json({
      success: true,
      data: {
        truncated,
        totalOrders,
        uniquePaths: pathMap.size,
        stats: {
          maxPathLength,
          avgPathLength: totalOrders ? Math.round((pathLengthSum / totalOrders) * 100) / 100 : 0,
          avgPathHours: totalOrders ? Math.round(core.calcMean(hoursByOrder) * 100) / 100 : 0,
          successPathCount,
          failedPathCount,
          pendingPathCount: totalOrders - successPathCount - failedPathCount
        },
        topPaths
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحليل مسارات الطلبات' });
  }
};

module.exports = handler;
