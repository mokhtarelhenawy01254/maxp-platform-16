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
 *   city, customerRating, combo (AND of conditions),
 *   preset (champions | atRisk | loyal | new) — RFM-ready smart templates
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

const ORDER_EXCLUDED_STATUSES = ['CANCELLED', 'TRASH', 'DRAFT', 'DUPLICATE_ORDER'];

const PRESETS = {
  champions: {
    label: 'أفضل العملاء',
    description: 'عملاء نشطون، كثر الطلبات، وأنفاقهم مرتفع — استهدفهم بعروض الولاء',
    icon: 'crown',
    criteria: {
      type: 'combo',
      conditions: [
        { type: 'all' },
        { type: 'minTotalSpent', amount: 2000 },
        { type: 'minOrdersCount', count: 3 },
      ],
    },
  },
  loyal: {
    label: 'العملاء الأوفياء',
    description: 'عملاء يطلبون بانتظام (5 طلبات أو أكثر) — رشّحهم لبرنامج الولاء',
    icon: 'heart',
    criteria: {
      type: 'combo',
      conditions: [
        { type: 'all' },
        { type: 'minOrdersCount', count: 5 },
      ],
    },
  },
  atRisk: {
    label: 'عملاء معرضون للفقدان',
    description: 'كانوا مشترين لكن لم يتواصلوا منذ 30 يوم — أرسل حملة إعادة تنشيط',
    icon: 'alert',
    criteria: {
      type: 'combo',
      conditions: [
        { type: 'inactive', days: 30 },
        { type: 'orderStatus', status: 'DELIVERED' },
      ],
    },
  },
  new: {
    label: 'عملاء جدد',
    description: 'أحدث 100 عميل — رحّب بهم وعرّفهم على منتجاتك',
    icon: 'sparkle',
    criteria: {
      type: 'latest',
      limit: 100,
    },
  },
};

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

      // اجمع الـ where الأساسية بـ AND، مع تمرير علامات الـ aggregation
      const simpleWheres = parts.filter((p) => !p._minTotalSpent && !p._minOrdersCount).map((p) => p.where);
      const aggregateFlags = parts.filter((p) => p._minTotalSpent || p._minOrdersCount);

      const where = simpleWheres.length === 1
        ? simpleWheres[0]
        : simpleWheres.length > 1
          ? { AND: simpleWheres }
          : base;

      if (aggregateFlags.length === 0) return { where };

      // شروط الـ aggregation داخل combo
      const minSpent = aggregateFlags.find((p) => p._minTotalSpent != null)?._minTotalSpent;
      const minCount = aggregateFlags.find((p) => p._minOrdersCount != null)?._minOrdersCount;
      const out = { where };
      if (minSpent != null) out._minTotalSpent = minSpent;
      if (minCount != null) out._minOrdersCount = minCount;
      return out;
    }

    case 'preset': {
      const presetKey = criteria.preset || criteria.name;
      const preset = PRESETS[presetKey];
      if (!preset) return { where: { ...base, status: 'ACTIVE' } };
      // وسّع الـ preset إلى بنيته الفعلية
      const expanded = { ...preset.criteria };
      return buildCustomerListWhere(companyId, expanded);
    }

    default:
      return { where: { ...base, status: 'ACTIVE' } };
  }
}

/**
 * استخراج كل شروط الـ aggregation (minTotalSpent / minOrdersCount) من معايير
 * قد تكون متداخلة (combo / preset). يعيد مصفوفة من
 *   { type: 'minTotalSpent'|'minOrdersCount', value }
 * بترتيب الظهور.
 */
function extractAggregates(rawCriteria, acc = []) {
  const criteria = parseCriteria(rawCriteria);
  const type = criteria.type || 'all';

  if (type === 'minTotalSpent') {
    const amount = parseFloat(criteria.amount);
    if (Number.isFinite(amount) && amount >= 0) acc.push({ type, value: amount });
    return acc;
  }
  if (type === 'minOrdersCount') {
    const count = toPositiveInt(criteria.count, null);
    if (count) acc.push({ type, value: count });
    return acc;
  }
  if (type === 'combo' && Array.isArray(criteria.conditions)) {
    for (const c of criteria.conditions) extractAggregates(c, acc);
    return acc;
  }
  if (type === 'preset') {
    const preset = PRESETS[criteria.preset || criteria.name];
    if (preset) return extractAggregates(preset.criteria, acc);
  }
  return acc;
}

/**
 * حل شروط الـ aggregation وإرجاع العملاء المطابقين لكل شرط (AND).
 * القيمة النهائية: قائمة معرفات تمر عبر كل الشروط، أو null إن لم توجد aggregations.
 */
async function resolveAggregateCustomerIds(prisma, companyId, rawCriteria) {
  const aggregates = extractAggregates(rawCriteria);
  if (aggregates.length === 0) return null;

  const baseOrderFilter = {
    companyId,
    status: { notIn: ORDER_EXCLUDED_STATUSES },
  };

  const rows = await prisma.order.groupBy({
    by: ['customerId'],
    where: baseOrderFilter,
    _sum: { total: true },
    _count: { customerId: true },
  });

  const valid = rows.filter((r) => r.customerId);

  // لكل شرط، مجموعة معرفات (Set) مطابقة
  const candidateSets = aggregates.map((agg) => {
    if (agg.type === 'minTotalSpent') {
      return new Set(valid.filter((r) => Number(r._sum?.total ?? 0) >= agg.value).map((r) => r.customerId));
    }
    return new Set(valid.filter((r) => (r._count?.customerId ?? 0) >= agg.value).map((r) => r.customerId));
  });

  // تقاطع كل المجموعات (AND)
  if (candidateSets.length === 0) return [];
  const intersection = [...candidateSets[0]].filter((id) => candidateSets.every((s) => s.has(id)));
  return intersection;
}

/**
 * تطبيق شرط الاستثناء (excludeContactedInDays):
 * يستبعد العملاء الذين تواصل معهم أو تواصلوا خلال آخر N يوم —
 * أي لديهم رسالة (واردة أو صادرة) داخل الفترة.
 * يُعدّل الـ where كـ NOT على conversations.messages.
 */
function applyContactExclusion(where, criteria) {
  const excludeDays = toPositiveInt(criteria.excludeContactedInDays, null);
  if (!excludeDays) return where;

  const threshold = daysAgo(excludeDays);
  const contactedFilter = {
    conversations: {
      some: {
        messages: {
          some: {
            createdAt: { gte: threshold },
          },
        },
      },
    },
  };

  if (where.NOT) {
    return { ...where, NOT: [where.NOT, contactedFilter].flat() };
  }
  return { ...where, NOT: contactedFilter };
}

/**
 * Combine where + aggregation into a single Customer where usable by count/findMany.
 */
async function buildEffectiveCustomerListWhere(prisma, companyId, rawCriteria) {
  const criteria = parseCriteria(rawCriteria);
  const built = buildCustomerListWhere(companyId, rawCriteria);
  let where = built.where;

  if (built._minTotalSpent != null || built._minOrdersCount != null) {
    const ids = await resolveAggregateCustomerIds(prisma, companyId, rawCriteria);
    if (ids !== null && ids.length === 0) {
      return { where: { companyId, id: { in: [] } }, orderBy: built.orderBy, take: built.take };
    }
    if (ids !== null) {
      where = { ...where, id: { in: ids } };
    }
  }

  where = applyContactExclusion(where, criteria);

  return { where, orderBy: built.orderBy, take: built.take };
}

function criteriaToSummary(criteria) {
  const c = parseCriteria(criteria);
  const type = c.type || 'all';
  let summary;
  switch (type) {
    case 'all':
      summary = 'جميع العملاء النشطين';
      break;
    case 'active':
      summary = `نشط خلال آخر ${toPositiveInt(c.hours ?? c.lastActivity, 24)} ساعة`;
      break;
    case 'inactive':
      summary = `غير نشط منذ ${toPositiveInt(c.days ?? c.lastActivity, 30)} يوم`;
      break;
    case 'tag':
      summary = `يحمل وسم: ${c.tag || ''}`;
      break;
    case 'orderStatus':
      summary = c.days
        ? `طلبات بحالة ${c.status} خلال آخر ${c.days} يوم`
        : `طلبات بحالة ${c.status}`;
      break;
    case 'returnRequest':
      summary = c.days
        ? `مرتجعات بحالة ${c.status || 'الكل'} خلال آخر ${c.days} يوم`
        : `مرتجعات بحالة ${c.status || 'الكل'}`;
      break;
    case 'paymentStatus':
      summary = c.days
        ? `دفع بحالة ${c.status} خلال آخر ${c.days} يوم`
        : `دفع بحالة ${c.status}`;
      break;
    case 'city':
      summary = `من مدينة: ${c.city || ''}`;
      break;
    case 'customerRating':
      summary = `التقييم: ${c.rating || ''}`;
      break;
    case 'latest':
      summary = `أحدث ${toPositiveInt(c.limit, 100)} عميل`;
      break;
    case 'oldest':
      summary = `أقدم ${toPositiveInt(c.limit, 100)} عميل`;
      break;
    case 'minTotalSpent':
      summary = `إجمالي إنفاق ≥ ${c.amount}`;
      break;
    case 'minOrdersCount':
      summary = `عدد طلبات ≥ ${c.count}`;
      break;
    case 'combo':
      summary = 'قائمة مخصّصة (شروط متعددة)';
      break;
    case 'preset': {
      const preset = PRESETS[c.preset || c.name];
      summary = preset ? preset.label : 'قائمة جاهزة';
      break;
    }
    default:
      summary = 'جميع العملاء النشطين';
  }

  if (toPositiveInt(c.excludeContactedInDays, null)) {
    summary += ` | بدون مراسلة خلال آخر ${c.excludeContactedInDays} يوم`;
  }
  return summary;
}

module.exports = {
  ORDER_STATUSES,
  RETURN_STATUSES,
  PAYMENT_STATUSES,
  CUSTOMER_RATINGS,
  CUSTOMER_STATUSES,
  PRESETS,
  parseCriteria,
  buildCustomerListWhere,
  buildEffectiveCustomerListWhere,
  resolveAggregateCustomerIds,
  extractAggregates,
  applyContactExclusion,
  criteriaToSummary,
};
