const { getSharedPrismaClient } = require('./sharedDatabase');

const MAX_ORDERS_DEFAULT = 50000;
const BATCH_SIZE = 1000;

const AUTO_ACTOR_MARKERS = ['SYSTEM_AUTO', 'SYSTEM', 'AUTO', 'CRON'];

const TERMINAL_STATUSES = new Set([
  'DELIVERED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED',
  'PARTIALLY_REFUNDED', 'EXCHANGED', 'LOST', 'DUPLICATE_ORDER', 'TRASH',
  'SHORTAGE_FAILED', 'NOT_SHIPPED', 'PENDING_CANCELLATION'
]);

const SUCCESS_STATUSES = new Set(['DELIVERED', 'PARTIALLY_DELIVERED']);

const FAILURE_STATUSES = new Set([
  'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED',
  'LOST', 'SHORTAGE_FAILED', 'TRASH', 'DUPLICATE_ORDER', 'NOT_SHIPPED'
]);

const normalizeStatus = (raw) => String(raw ?? '').trim().toUpperCase();

const isAutoChange = (entry) => {
  const who = String(entry.changedBy || entry.userName || '');
  const up = who.toUpperCase();
  return AUTO_ACTOR_MARKERS.some((marker) => up.includes(marker));
};

const normalizeDateRange = ({ startDate, endDate }) => {
  let start = startDate ? new Date(startDate) : null;
  let end = endDate ? new Date(endDate) : null;
  if (start && Number.isNaN(start.getTime())) start = null;
  if (end && Number.isNaN(end.getTime())) end = null;
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);
  return { start, end };
};

const buildHistoryRangeWhere = ({ start, end }) => {
  const where = { createdAt: {} };
  if (start) where.createdAt.gte = start;
  if (end) where.createdAt.lte = end;
  return where;
};

async function fetchOrderMovementData({
  companyId,
  startDate,
  endDate,
  maxOrders = MAX_ORDERS_DEFAULT,
  historyTake,
  historyFilter = 'range'
}) {
  const prisma = getSharedPrismaClient();
  const { start, end } = normalizeDateRange({ startDate, endDate });

  const rangeWhere = buildHistoryRangeWhere({ start, end });
  const historyWhere = historyFilter === 'full' ? {} : rangeWhere;

  const where = {
    companyId: String(companyId),
    statusHistory: { some: rangeWhere }
  };

  const orders = [];
  let cursor;
  while (orders.length < maxOrders) {
    const page = await prisma.order.findMany({
      where,
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        customerName: true,
        customerPhone: true,
        governorate: true,
        sourceType: true,
        paymentMethod: true,
        confirmedAt: true,
        assignedTo: true,
        assignedBy: true,
        assignedAt: true,
        createdBy: true,
        createdByName: true,
        turboShipmentId: true,
        statusHistory: {
          ...(historyFilter === 'full' ? {} : { where: historyWhere }),
          ...(historyTake ? { take: historyTake } : {}),
          orderBy: { createdAt: 'asc' },
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
    if (page.length === 0) break;
    orders.push(...page);
    cursor = page[page.length - 1].id;
    if (page.length < BATCH_SIZE) break;
  }

  return { orders, start, end, truncated: orders.length >= maxOrders };
}

const buildTransitions = (order, { filterRange = true, start, end } = {}) => {
  const rows = order.statusHistory || [];
  return rows
    .filter((h) => {
      if (!filterRange) return true;
      const t = new Date(h.createdAt).getTime();
      if (start && t < start.getTime()) return false;
      if (end && t > end.getTime()) return false;
      return true;
    })
    .map((h) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: normalizeStatus(h.status),
      oldStatus: h.oldStatus ? normalizeStatus(h.oldStatus) : null,
      changedBy: h.changedBy || null,
      userName: h.userName || null,
      reason: h.reason || null,
      createdAt: h.createdAt,
      auto: isAutoChange(h),
      orderTotal: Number(order.total ?? 0),
      orderStatus: order.status,
      customerName: order.customerName || null,
      governorate: order.governorate || null,
      paymentMethod: order.paymentMethod || null,
      sourceType: order.sourceType || null
    }));
};

const calcPercentile = (sortedArr, pct) => {
  if (!sortedArr.length) return 0;
  const index = Math.min(sortedArr.length - 1, Math.max(0, Math.ceil((pct / 100) * sortedArr.length) - 1));
  return sortedArr[index];
};

const calcMean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

const hoursBetween = (a, b) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, ms) / (1000 * 60 * 60);
};

module.exports = {
  AUTO_ACTOR_MARKERS,
  TERMINAL_STATUSES,
  SUCCESS_STATUSES,
  FAILURE_STATUSES,
  MAX_ORDERS_DEFAULT,
  normalizeStatus,
  isAutoChange,
  normalizeDateRange,
  buildHistoryRangeWhere,
  fetchOrderMovementData,
  buildTransitions,
  calcPercentile,
  calcMean,
  hoursBetween,
  getSharedPrismaClient
};
