const core = require('../../services/orderMovementCore');

const BUCKETS = [
  { key: '<1d', label: '╪ú┘é┘ä ┘à┘å ┘è┘ê┘à', max: 24 },
  { key: '1-3d', label: '1-3 ╪ú┘è╪º┘à', max: 72 },
  { key: '3-7d', label: '3-7 ╪ú┘è╪º┘à', max: 168 },
  { key: '7-30d', label: '7-30 ┘è┘ê┘à', max: 720 },
  { key: '>30d', label: '╪ú┘â╪½╪▒ ┘à┘å 30 ┘è┘ê┘à', max: Infinity }
];

const bucketKeyFor = (ageHours) => {
  const bucket = BUCKETS.find((b) => ageHours < b.max);
  return bucket ? bucket.key : BUCKETS[BUCKETS.length - 1].key;
};

const toAsc = (history) => {
  if (!history || history.length < 2) return history || [];
  const first = new Date(history[0].createdAt).getTime();
  const last = new Date(history[history.length - 1].createdAt).getTime();
  return first <= last ? history : history.slice().reverse();
};

const round2 = (n) => Math.round(n * 100) / 100;

const handler = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });
    }

    const { startDate, endDate } = req.query;
    const mode = req.query.mode === 'manual' ? 'manual' : req.query.mode === 'auto' ? 'auto' : 'all';
    const { start, end } = core.normalizeDateRange({ startDate, endDate });

    const rawMin = req.query.minAgeHours;
    const minAgeHours =
      rawMin !== undefined && rawMin !== '' && Number.isFinite(Number(rawMin))
        ? Math.max(0, Number(rawMin))
        : 24;

    const prisma = core.getSharedPrismaClient();
    const rangeWhere = core.buildHistoryRangeWhere({ start, end });

    const orders = await prisma.order.findMany({
      where: {
        companyId,
        status: { notIn: [...core.TERMINAL_STATUSES] },
        statusHistory: { some: rangeWhere }
      },
      orderBy: { updatedAt: 'desc' },
      take: 500000,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        customerName: true,
        governorate: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 60,
          select: {
            status: true,
            oldStatus: true,
            changedBy: true,
            userName: true,
            reason: true,
            createdAt: true
          }
        }
      }
    });

    const now = new Date();
    const rows = [];
    const truncated = orders.length >= 50000;

    for (const order of orders) {
      if (core.TERMINAL_STATUSES.has(core.normalizeStatus(order.status))) continue;

      const transitions = core.buildTransitions({ ...order, statusHistory: toAsc(order.statusHistory) }, { filterRange: false });
      if (!transitions.length) continue;

      const last = transitions[transitions.length - 1];
      if (mode === 'manual' && last.auto) continue;
      if (mode === 'auto' && !last.auto) continue;

      const hasMovementInRange = transitions.some((t) => {
        const time = new Date(t.createdAt).getTime();
        if (start && time < start.getTime()) return false;
        if (end && time > end.getTime()) return false;
        return true;
      });
      if (!hasMovementInRange) continue;

      const ageHours = core.hoursBetween(last.createdAt, now);
      if (ageHours < minAgeHours) continue;

      rows.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        ageHours,
        total: Number(order.total ?? 0),
        customerName: order.customerName || null,
        governorate: order.governorate || null,
        lastTransitionAt: last.createdAt,
        lastTransitionBy: last.userName || last.changedBy,
        lastTransitionAuto: last.auto,
        updatedAt: order.updatedAt
      });
    }

    rows.sort((a, b) => b.ageHours - a.ageHours);

    const bucketsMap = new Map(BUCKETS.map((b) => [b.key, { key: b.key, label: b.label, count: 0, revenue: 0 }]));
    let oldestHours = 0;
    let totalRevenue = 0;

    for (const row of rows) {
      if (row.ageHours > oldestHours) oldestHours = row.ageHours;
      totalRevenue += row.total;
      const bucket = bucketsMap.get(bucketKeyFor(row.ageHours));
      bucket.count += 1;
      bucket.revenue += row.total;
    }

    const stuckOver7d = bucketsMap.get('7-30d').count + bucketsMap.get('>30d').count;

    res.json({
      success: true,
      data: {
        truncated,
        summary: {
          totalAged: rows.length,
          oldestHours,
          totalRevenue: round2(totalRevenue),
          stuckOver7d
        },
        buckets: BUCKETS.map((b) => {
          const bucket = bucketsMap.get(b.key);
          return { key: bucket.key, label: bucket.label, count: bucket.count, revenue: round2(bucket.revenue) };
        }),
        orders: rows.slice(0, 100)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪¡╪│╪º╪¿ ╪¬╪¡┘ä┘è┘ä ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪╣┘ä┘é╪⌐' });
  }
};

module.exports = handler;
