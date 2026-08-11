const core = require('../../services/orderMovementCore');

const DWELL_OUTLIER_HOURS = 2160;

const buildStatusRow = (status, values, manualEntries, autoEntries) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    status,
    entries: values.length,
    avgHours: core.calcMean(values),
    p50Hours: core.calcPercentile(sorted, 50),
    p90Hours: core.calcPercentile(sorted, 90),
    maxHours: sorted.length ? sorted[sorted.length - 1] : 0,
    manualEntries,
    autoEntries
  };
};

const buildCycleTime = (cycleValues) => {
  const sorted = [...cycleValues.all].sort((a, b) => a - b);
  return {
    avgHours: core.calcMean(cycleValues.all),
    p50Hours: core.calcPercentile(sorted, 50),
    p90Hours: core.calcPercentile(sorted, 90),
    sampleSize: cycleValues.all.length,
    manualAvgHours: core.calcMean(cycleValues.manual),
    autoAvgHours: core.calcMean(cycleValues.auto)
  };
};

const handler = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const { startDate, endDate, mode } = req.query;
    const { start, end } = core.normalizeDateRange({ startDate, endDate });
    const { orders, truncated } = await core.fetchOrderMovementData({
      companyId,
      startDate,
      endDate,
      historyFilter: 'full',
      maxOrders: 30000
    });

    const statusMap = new Map();
    const cycleValues = { all: [], manual: [], auto: [] };

    for (const order of orders) {
      const history = order.statusHistory || [];
      const last = history[history.length - 1];

      for (let i = 0; i < history.length - 1; i += 1) {
        const current = history[i];
        const next = history[i + 1];
        const auto = core.isAutoChange(next);
        if (mode === 'manual' && auto) continue;
        if (mode === 'auto' && !auto) continue;

        let from = new Date(current.createdAt).getTime();
        let to = new Date(next.createdAt).getTime();
        if (start && from < start.getTime()) from = start.getTime();
        if (end && to > end.getTime()) to = end.getTime();
        if (to <= from) continue;

        const hours = (to - from) / (1000 * 60 * 60);
        if (hours > DWELL_OUTLIER_HOURS) continue;

        const status = core.normalizeStatus(current.status);
        let row = statusMap.get(status);
        if (!row) {
          row = { status, values: [], manualEntries: 0, autoEntries: 0 };
          statusMap.set(status, row);
        }
        row.values.push(hours);
        if (auto) row.autoEntries += 1;
        else row.manualEntries += 1;
      }

      if (last && core.TERMINAL_STATUSES.has(core.normalizeStatus(last.status))) {
        const lastAuto = core.isAutoChange(last);
        if (mode === 'manual' && lastAuto) continue;
        if (mode === 'auto' && !lastAuto) continue;
        const hours = core.hoursBetween(order.createdAt, last.createdAt);
        cycleValues.all.push(hours);
        if (lastAuto) cycleValues.auto.push(hours);
        else cycleValues.manual.push(hours);
      }
    }

    const statuses = Array.from(statusMap.values())
      .map((row) => buildStatusRow(row.status, row.values, row.manualEntries, row.autoEntries))
      .sort((a, b) => b.avgHours - a.avgHours);

    res.json({
      success: true,
      data: {
        truncated,
        totalOrders: orders.length,
        statuses,
        cycleTime: buildCycleTime(cycleValues)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحليل زمن المكوث' });
  }
};

module.exports = handler;
