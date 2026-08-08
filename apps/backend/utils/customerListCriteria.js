/**
 * Customer list criteria engine.
 *
 * Converts a stored list `criteria` object into a Prisma `Customer` where clause
 * plus optional ordering/limit. Pure functions for unit testing + an async
 * resolver for the DB-backed criteria types.
 *
 * Supported criteria types:
 *   all, active (hours), inactive (days), tag,
 *   orderStatus (status + days), returnRequest (status + days),
 *   latest (limit), oldest (limit), minTotalSpent (amount),
 *   minOrdersCount (count), paymentStatus (status + days),
 *   city, customerRating, combo (AND of conditions)
 */

const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING',
  'SHIPPED', 'DELIVERED', 'CANCELLED', 'DUPLICATE_ORDER', 'REFUNDED',
  'RETURNED', 'PARTIALLY_RETURNED', 'EXCHANGED', 'PARTIALLY_REFUNDED',
  'WOO_TAGHEZ', 'DRAFT', 'TRASH', 'READY_TO_SHIP', 'ON_HOLD', 'NOT_SHIPPED',
  'OUT_FOR_DELIVERY', 'LOST', 'PENDING_PREPARATION', 'PREPARING', 'READY',
  'QUALITY_CHECK', 'PACKAGED', 'ON_HOLD_PREP', 'PARTIALLY_DELIVERED',
  'STOCK_SHORTAGE', 'SHORTAGE_FAILED', 'PENDING_CANCELLATION',
];

const RETURN_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];

const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED'];

const CUSTOMER_RATINGS = ['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR', 'UNKNOWN'];

const CUSTOMER_STATUSES = ['LEAD', 'ACTIVE', 'INACTIVE', 'BLOCKED'];

function parseCriteria(criteria) {
  if (!criteria) return { type: 'all' };
  if (typeof criteria === 'string') {
    try {
      return JSON.parse(criteria);
    } catch {
      return { type: 'all' };
    }
  }
  return criteria;
}

function toPositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) return fallback;
  return n;
}

function hoursAgo(hours) {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Build the Prisma Customer where clause (+ orderBy/take) for a criteria.
 * Pure — no DB access. Returns:
 *   { where, orderBy?, take? }
 */
function buildCustomerListWhere(companyId, rawCriteria) {
  const criteria = parseCriteria(rawCriteria);
  const type = criteria.type || 'all';
  const base = { companyId };

  switch (type) {
    case 'all': {
      return { where: { ...base, status: 'ACTIVE' } };
    }

    case 'active': {
      const hours = toPositiveInt(criteria.hours ?? criteria.lastActivity, 24);
      const threshold = hoursAgo(hours);
      return {
        where: {
          ...base,
          conversations: {
            some: {
              status: 'ACTIVE',
              messages: {
                some: {
                  isFromCustomer: true,
                  createdAt: { gte: threshold },
                },
              },
            },
          },
        },
      };
    }

    case 'inactive': {
      const days = toPositiveInt(criteria.days ?? criteria.lastActivity, 30);
      const threshold = daysAgo(days);
      return {
        where: {
          ...base,
          conversations: {
            none: { updatedAt: { gte: threshold } },
          },
        },
      };
    }

    case 'tag': {
      const tag = (criteria.tag || '').trim();
      if (!tag) return { where: { ...base, status: 'ACTIVE' } };
      return {
        where: {
          ...base,
          tags: { contains: `"${tag}"` },
        },
      };
    }

    case 'orderStatus': {
      const status = criteria.status;
      if (!status) return { where: { ...base, status: 'ACTIVE' } };
      const days = toPositiveInt(criteria.days, null);
      const orderFilter = { status };
      if (days) orderFilter.createdAt = { gte: daysAgo(days) };
      return {
        where: {
          ...base,
          orders: { some: orderFilter },
        },
      };
    }

    case 'returnRequest': {
      const status = criteria.status;
      const days = toPositiveInt(criteria.days, null);
      const returnFilter = {};
      if (status) returnFilter.status = status;
      if (days) returnFilter.createdAt = { gte: daysAgo(days) };
      return {
        where: {
          ...base,
          returnRequests: { some: returnFilter },
        },
      };
    }

    case 'paymentStatus': {
      const status = criteria.status;
      if (!status) return { where: { ...base, status: 'ACTIVE' } };
      const days = toPositiveInt(criteria.days, null);
      const orderFilter = { paymentStatus: status };
      if (days) orderFilter.createdAt = { gte: daysAgo(days) };
      return {
        where: {
          ...base,
          orders: { some: orderFilter },
        },
      };
    }

    case 'city': {
      const city = (criteria.city || '').trim();
      if (!city) return { where: { ...base, status: 'ACTIVE' } };
      return {
        where: {
          ...base,
          orders: { some: { city } },
        },
      };
    }

    case 'customerRating': {
      const rating = criteria.rating;
      if (!rating) return { where: { ...base, status: 'ACTIVE' } };
      return {
        where: { ...base, customerRating: rating },
      };
    }

    case 'latest': {
      const limit = toPositiveInt(criteria.limit, 100);
      return {
        where: base,
        orderBy: { createdAt: 'desc' },
        take: limit,
      };
    }

    case 'oldest': {
      const limit = toPositiveInt(criteria.limit, 100);
      return {
        where: base,
        orderBy: { createdAt: 'asc' },
        take: limit,
      };
    }

    case 'minTotalSpent': {
      const amount = parseFloat(criteria.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        return { where: { ...base, status: 'ACTIVE' } };
      }
      return { where: { ...base, status: 'ACTIVE' }, _minTotalSpent: amount };
    }

    case 'minOrdersCount': {
      const count = toPositiveInt(criteria.count, null);
      if (!count) return { where: { ...base, status: 'ACTIVE' } };
      return { where: { ...base, status: 'ACTIVE' }, _minOrdersCount: count };
    }

    case 'combo': {
      const conditions = Array.isArray(criteria.conditions) ? criteria.conditions : [];
      if (conditions.length === 0) return { where: { ...base, status: 'ACTIVE' } };
      const parts = conditions.map((c) => buildCustomerListWhere(companyId, c));
      const where = { AND: parts.map((p) => p.where) };
      return { where };
    }

    default:
      return { where: { ...base, status: 'ACTIVE' } };
  }
}

/**
 * Resolve customer IDs for criteria that require aggregation (minTotalSpent /
 * minOrdersCount). Returns null when the criteria type needs no aggregation.
 */
async function resolveAggregateCustomerIds(prisma, companyId, rawCriteria) {
  const criteria = parseCriteria(rawCriteria);
  const type = criteria.type || 'all';

  if (type === 'minTotalSpent') {
    const amount = parseFloat(criteria.amount);
    if (!Number.isFinite(amount) || amount < 0) return null;

    const rows = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        companyId,
        status: { notIn: ['CANCELLED', 'TRASH', 'DRAFT', 'DUPLICATE_ORDER'] },
      },
      _sum: { total: true },
    });

    return rows
      .filter((r) => r.customerId && Number(r._sum?.total ?? 0) >= amount)
      .map((r) => r.customerId);
  }

  if (type === 'minOrdersCount') {
    const count = toPositiveInt(criteria.count, null);
    if (!count) return null;

    const rows = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        companyId,
        status: { notIn: ['CANCELLED', 'TRASH', 'DRAFT', 'DUPLICATE_ORDER'] },
      },
      _count: { customerId: true },
    });

    return rows
      .filter((r) => r.customerId && (r._count?.customerId ?? 0) >= count)
      .map((r) => r.customerId);
  }

  return null;
}

/**
 * Combine where + aggregation into a single Customer where usable by count/findMany.
 */
async function buildEffectiveCustomerListWhere(prisma, companyId, rawCriteria) {
  const built = buildCustomerListWhere(companyId, rawCriteria);
  if (built._minTotalSpent != null || built._minOrdersCount != null) {
    const ids = await resolveAggregateCustomerIds(prisma, companyId, rawCriteria);
    if (ids !== null && ids.length === 0) {
      return { where: { companyId, id: { in: [] } }, orderBy: built.orderBy, take: built.take };
    }
    if (ids !== null) {
      return { where: { ...built.where, id: { in: ids } }, orderBy: built.orderBy, take: built.take };
    }
  }
  return { where: built.where, orderBy: built.orderBy, take: built.take };
}

function criteriaToSummary(criteria) {
  const c = parseCriteria(criteria);
  const type = c.type || 'all';
  switch (type) {
    case 'all':
      return 'جميع العملاء النشطين';
    case 'active':
      return `نشط خلال آخر ${toPositiveInt(c.hours ?? c.lastActivity, 24)} ساعة`;
    case 'inactive':
      return `غير نشط منذ ${toPositiveInt(c.days ?? c.lastActivity, 30)} يوم`;
    case 'tag':
      return `يحمل وسم: ${c.tag || ''}`;
    case 'orderStatus':
      return c.days
        ? `طلبات بحالة ${c.status} خلال آخر ${c.days} يوم`
        : `طلبات بحالة ${c.status}`;
    case 'returnRequest':
      return c.days
        ? `مرتجعات بحالة ${c.status || 'الكل'} خلال آخر ${c.days} يوم`
        : `مرتجعات بحالة ${c.status || 'الكل'}`;
    case 'paymentStatus':
      return c.days
        ? `دفع بحالة ${c.status} خلال آخر ${c.days} يوم`
        : `دفع بحالة ${c.status}`;
    case 'city':
      return `من مدينة: ${c.city || ''}`;
    case 'customerRating':
      return `التقييم: ${c.rating || ''}`;
    case 'latest':
      return `أحدث ${toPositiveInt(c.limit, 100)} عميل`;
    case 'oldest':
      return `أقدم ${toPositiveInt(c.limit, 100)} عميل`;
    case 'minTotalSpent':
      return `إجمالي إنفاق ≥ ${c.amount}`;
    case 'minOrdersCount':
      return `عدد طلبات ≥ ${c.count}`;
    case 'combo':
      return 'قائمة مخصّصة (شروط متعددة)';
    default:
      return 'جميع العملاء النشطين';
  }
}

module.exports = {
  ORDER_STATUSES,
  RETURN_STATUSES,
  PAYMENT_STATUSES,
  CUSTOMER_RATINGS,
  CUSTOMER_STATUSES,
  parseCriteria,
  buildCustomerListWhere,
  buildEffectiveCustomerListWhere,
  resolveAggregateCustomerIds,
  criteriaToSummary,
};
