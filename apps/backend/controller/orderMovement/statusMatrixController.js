const core = require('../../services/orderMovementCore');

const CANONICAL = ['PENDING', 'DRAFT', 'CONFIRMED', 'SCHEDULED', 'PENDING_PREPARATION', 'PREPARING', 'READY', 'QUALITY_CHECK', 'PACKAGED', 'READY_TO_SHIP', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'PARTIALLY_DELIVERED', 'DELIVERED', 'REFUNDED', 'RETURNED', 'PARTIALLY_RETURNED', 'EXCHANGED', 'CANCELLED', 'DUPLICATE_ORDER', 'LOST', 'TRASH', 'NOT_SHIPPED', 'ON_HOLD', 'ON_HOLD_PREP', 'STOCK_SHORTAGE', 'SHORTAGE_FAILED', 'PENDING_CANCELLATION'];

const KIND_PRIORITY = { invalid: 0, backward: 1, skip: 2, forward: 3, start: 4, same: 5, other: 6 };

const CANONICAL_INDEX = {};
CANONICAL.forEach((code, index) => { CANONICAL_INDEX[code] = index; });

const EXIT_STATUSES = new Set([
  'CANCELLED', 'DUPLICATE_ORDER', 'NOT_SHIPPED', 'LOST', 'TRASH',
  'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED',
  'EXCHANGED', 'SHORTAGE_FAILED', 'STOCK_SHORTAGE', 'PENDING_CANCELLATION'
]);

const POST_DELIVERY_ORIGINS = new Set(['DELIVERED', 'PARTIALLY_DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY']);

const filterByMode = (transitions, mode) => mode === 'manual' ? transitions.filter((t) => !t.auto) : mode === 'auto' ? transitions.filter((t) => t.auto) : transitions;

const parseAllowedList = (raw) => {
  if (!raw) return [];
  let list = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.map((s) => String(s || '').trim().toUpperCase()).filter(Boolean);
};

const classifyKind = (from, to) => {
  if (!from) return 'start';
  const fromUpper = String(from).trim().toUpperCase();
  const toUpper = String(to).trim().toUpperCase();
  if (fromUpper === toUpper) return 'same';

  if (EXIT_STATUSES.has(toUpper)) {
    return POST_DELIVERY_ORIGINS.has(fromUpper) ? 'backward' : 'forward';
  }

  const fi = CANONICAL_INDEX[fromUpper];
  const ti = CANONICAL_INDEX[toUpper];
  if (fi !== undefined && ti !== undefined) {
    if (ti > fi) return ti - fi > 1 ? 'skip' : 'forward';
    return 'backward';
  }
  return 'other';
};

const handler = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, mode = 'all' } = req.query;
    const { start, end } = core.normalizeDateRange({ startDate, endDate });
    const { orders } = await core.fetchOrderMovementData({ companyId, startDate, endDate });

    let transitions = [];
    for (const order of orders) {
      const rows = core.buildTransitions(order, { start, end });
      if (rows) transitions.push(...rows);
    }
    transitions = filterByMode(transitions, mode);

    if (transitions.length === 0) {
      return res.json({
        success: true,
        data: {
          totalTransitions: 0,
          totalOrders: 0,
          forwardCount: 0,
          backwardCount: 0,
          skipCount: 0,
          invalidCount: 0,
          startCount: 0,
          sameCount: 0,
          otherCount: 0,
          rows: [],
          statuses: [],
          modes: { manual: 0, auto: 0 }
        }
      });
    }

    const prisma = core.getSharedPrismaClient();
    const configs = await prisma.orderStatusConfig.findMany({
      where: { companyId, isActive: true },
      select: { code: true, allowedNextStatuses: true }
    });

    const allowedMap = {};
    for (const cfg of configs || []) {
      const code = String(cfg.code || '').trim().toUpperCase();
      if (code) allowedMap[code] = parseAllowedList(cfg.allowedNextStatuses);
    }

    const rowMap = new Map();
    const counts = { forward: 0, backward: 0, skip: 0, invalid: 0, start: 0, same: 0, other: 0 };
    let manualTotal = 0;
    let autoTotal = 0;

    for (const t of transitions) {
      const from = t.oldStatus ? String(t.oldStatus).trim().toUpperCase() : null;
      const to = String(t.status || '').trim().toUpperCase();
      let kind = classifyKind(from, to);
      if (from && allowedMap[from] && allowedMap[from].length > 0 && !allowedMap[from].includes(to)) {
        kind = 'invalid';
      }

      counts[kind] += 1;
      if (t.auto) autoTotal += 1;
      else manualTotal += 1;

      const fromKey = from || '__start__';
      const key = `${fromKey}|${to}`;
      let row = rowMap.get(key);
      if (!row) {
        row = { fromStatus: fromKey, toStatus: to, count: 0, revenue: 0, manualCount: 0, autoCount: 0, kind };
        rowMap.set(key, row);
      }
      row.count += 1;
      row.revenue += Number(t.orderTotal || 0);
      if (t.auto) row.autoCount += 1;
      else row.manualCount += 1;
    }

    const rows = Array.from(rowMap.values());
    rows.sort((a, b) => b.count - a.count || KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);

    const seen = new Set();
    const inCanonical = [];
    const otherStatuses = [];
    for (const row of rows) {
      const codes = [row.fromStatus === '__start__' ? null : row.fromStatus, row.toStatus];
      for (const code of codes) {
        if (!code || seen.has(code)) continue;
        seen.add(code);
        if (CANONICAL_INDEX[code] !== undefined) inCanonical.push(code);
        else otherStatuses.push(code);
      }
    }
    inCanonical.sort((a, b) => CANONICAL_INDEX[a] - CANONICAL_INDEX[b]);
    otherStatuses.sort();
    const statuses = [...inCanonical, ...otherStatuses];

    res.json({
      success: true,
      data: {
        totalTransitions: transitions.length,
        totalOrders: new Set(transitions.map((t) => t.orderId)).size,
        forwardCount: counts.forward,
        backwardCount: counts.backward,
        skipCount: counts.skip,
        invalidCount: counts.invalid,
        startCount: counts.start,
        sameCount: counts.same,
        otherCount: counts.other,
        rows,
        statuses,
        modes: { manual: manualTotal, auto: autoTotal }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحليل مصفوفة الانتقالات' });
  }
};

module.exports = handler;
