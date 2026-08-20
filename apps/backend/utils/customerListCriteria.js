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
 *   preset (champions | atRisk | loyal | new) ΓÇö RFM-ready smart templates
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
    label: '╪ú┘ü╪╢┘ä ╪º┘ä╪╣┘à┘ä╪º╪í',
    description: '╪╣┘à┘ä╪º╪í ┘å╪┤╪╖┘ê┘å╪î ┘â╪½╪▒ ╪º┘ä╪╖┘ä╪¿╪º╪¬╪î ┘ê╪ú┘å┘ü╪º┘é┘ç┘à ┘à╪▒╪¬┘ü╪╣ ΓÇö ╪º╪│╪¬┘ç╪»┘ü┘ç┘à ╪¿╪╣╪▒┘ê╪╢ ╪º┘ä┘ê┘ä╪º╪í',
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
    label: '╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä╪ú┘ê┘ü┘è╪º╪í',
    description: '╪╣┘à┘ä╪º╪í ┘è╪╖┘ä╪¿┘ê┘å ╪¿╪º┘å╪¬╪╕╪º┘à (5 ╪╖┘ä╪¿╪º╪¬ ╪ú┘ê ╪ú┘â╪½╪▒) ΓÇö ╪▒╪┤┘æ╪¡┘ç┘à ┘ä╪¿╪▒┘å╪º┘à╪¼ ╪º┘ä┘ê┘ä╪º╪í',
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
    label: '╪╣┘à┘ä╪º╪í ┘à╪╣╪▒╪╢┘ê┘å ┘ä┘ä┘ü┘é╪»╪º┘å',
    description: '┘â╪º┘å┘ê╪º ┘à╪┤╪¬╪▒┘è┘å ┘ä┘â┘å ┘ä┘à ┘è╪¬┘ê╪º╪╡┘ä┘ê╪º ┘à┘å╪░ 30 ┘è┘ê┘à ΓÇö ╪ú╪▒╪│┘ä ╪¡┘à┘ä╪⌐ ╪Ñ╪╣╪º╪»╪⌐ ╪¬┘å╪┤┘è╪╖',
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
    label: '╪╣┘à┘ä╪º╪í ╪¼╪»╪»',
    description: '╪ú╪¡╪»╪½ 100 ╪╣┘à┘è┘ä ΓÇö ╪▒╪¡┘æ╪¿ ╪¿┘ç┘à ┘ê╪╣╪▒┘æ┘ü┘ç┘à ╪╣┘ä┘ë ┘à┘å╪¬╪¼╪º╪¬┘â',
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
 * Pure ΓÇö no DB access. Returns:
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

      // ╪º╪¼┘à╪╣ ╪º┘ä┘Ç where ╪º┘ä╪ú╪│╪º╪│┘è╪⌐ ╪¿┘Ç AND╪î ┘à╪╣ ╪¬┘à╪▒┘è╪▒ ╪╣┘ä╪º┘à╪º╪¬ ╪º┘ä┘Ç aggregation
      const simpleWheres = parts.filter((p) => !p._minTotalSpent && !p._minOrdersCount).map((p) => p.where);
      const aggregateFlags = parts.filter((p) => p._minTotalSpent || p._minOrdersCount);

      const where = simpleWheres.length === 1
        ? simpleWheres[0]
        : simpleWheres.length > 1
          ? { AND: simpleWheres }
          : base;

      if (aggregateFlags.length === 0) return { where };

      // ╪┤╪▒┘ê╪╖ ╪º┘ä┘Ç aggregation ╪»╪º╪«┘ä combo
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
      // ┘ê╪│┘æ╪╣ ╪º┘ä┘Ç preset ╪Ñ┘ä┘ë ╪¿┘å┘è╪¬┘ç ╪º┘ä┘ü╪╣┘ä┘è╪⌐
      const expanded = { ...preset.criteria };
      return buildCustomerListWhere(companyId, expanded);
    }

    default:
      return { where: { ...base, status: 'ACTIVE' } };
  }
}

/**
 * ╪º╪│╪¬╪«╪▒╪º╪¼ ┘â┘ä ╪┤╪▒┘ê╪╖ ╪º┘ä┘Ç aggregation (minTotalSpent / minOrdersCount) ┘à┘å ┘à╪╣╪º┘è┘è╪▒
 * ┘é╪» ╪¬┘â┘ê┘å ┘à╪¬╪»╪º╪«┘ä╪⌐ (combo / preset). ┘è╪╣┘è╪» ┘à╪╡┘ü┘ê┘ü╪⌐ ┘à┘å
 *   { type: 'minTotalSpent'|'minOrdersCount', value }
 * ╪¿╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪╕┘ç┘ê╪▒.
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
 * ╪¡┘ä ╪┤╪▒┘ê╪╖ ╪º┘ä┘Ç aggregation ┘ê╪Ñ╪▒╪¼╪º╪╣ ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘à╪╖╪º╪¿┘é┘è┘å ┘ä┘â┘ä ╪┤╪▒╪╖ (AND).
 * ╪º┘ä┘é┘è┘à╪⌐ ╪º┘ä┘å┘ç╪º╪ª┘è╪⌐: ┘é╪º╪ª┘à╪⌐ ┘à╪╣╪▒┘ü╪º╪¬ ╪¬┘à╪▒ ╪╣╪¿╪▒ ┘â┘ä ╪º┘ä╪┤╪▒┘ê╪╖╪î ╪ú┘ê null ╪Ñ┘å ┘ä┘à ╪¬┘ê╪¼╪» aggregations.
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

  // ┘ä┘â┘ä ╪┤╪▒╪╖╪î ┘à╪¼┘à┘ê╪╣╪⌐ ┘à╪╣╪▒┘ü╪º╪¬ (Set) ┘à╪╖╪º╪¿┘é╪⌐
  const candidateSets = aggregates.map((agg) => {
    if (agg.type === 'minTotalSpent') {
      return new Set(valid.filter((r) => Number(r._sum?.total ?? 0) >= agg.value).map((r) => r.customerId));
    }
    return new Set(valid.filter((r) => (r._count?.customerId ?? 0) >= agg.value).map((r) => r.customerId));
  });

  // ╪¬┘é╪º╪╖╪╣ ┘â┘ä ╪º┘ä┘à╪¼┘à┘ê╪╣╪º╪¬ (AND)
  if (candidateSets.length === 0) return [];
  const intersection = [...candidateSets[0]].filter((id) => candidateSets.every((s) => s.has(id)));
  return intersection;
}

/**
 * ╪¬╪╖╪¿┘è┘é ╪┤╪▒╪╖ ╪º┘ä╪º╪│╪¬╪½┘å╪º╪í (excludeContactedInDays):
 * ┘è╪│╪¬╪¿╪╣╪» ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä╪░┘è┘å ╪¬┘ê╪º╪╡┘ä ┘à╪╣┘ç┘à ╪ú┘ê ╪¬┘ê╪º╪╡┘ä┘ê╪º ╪«┘ä╪º┘ä ╪ó╪«╪▒ N ┘è┘ê┘à ΓÇö
 * ╪ú┘è ┘ä╪»┘è┘ç┘à ╪▒╪│╪º┘ä╪⌐ (┘ê╪º╪▒╪»╪⌐ ╪ú┘ê ╪╡╪º╪»╪▒╪⌐) ╪»╪º╪«┘ä ╪º┘ä┘ü╪¬╪▒╪⌐.
 * ┘è┘Å╪╣╪»┘æ┘ä ╪º┘ä┘Ç where ┘â┘Ç NOT ╪╣┘ä┘ë conversations.messages.
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
      summary = '╪¼┘à┘è╪╣ ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘å╪┤╪╖┘è┘å';
      break;
    case 'active':
      summary = `┘å╪┤╪╖ ╪«┘ä╪º┘ä ╪ó╪«╪▒ ${toPositiveInt(c.hours ?? c.lastActivity, 24)} ╪│╪º╪╣╪⌐`;
      break;
    case 'inactive':
      summary = `╪║┘è╪▒ ┘å╪┤╪╖ ┘à┘å╪░ ${toPositiveInt(c.days ?? c.lastActivity, 30)} ┘è┘ê┘à`;
      break;
    case 'tag':
      summary = `┘è╪¡┘à┘ä ┘ê╪│┘à: ${c.tag || ''}`;
      break;
    case 'orderStatus':
      summary = c.days
        ? `╪╖┘ä╪¿╪º╪¬ ╪¿╪¡╪º┘ä╪⌐ ${c.status} ╪«┘ä╪º┘ä ╪ó╪«╪▒ ${c.days} ┘è┘ê┘à`
        : `╪╖┘ä╪¿╪º╪¬ ╪¿╪¡╪º┘ä╪⌐ ${c.status}`;
      break;
    case 'returnRequest':
      summary = c.days
        ? `┘à╪▒╪¬╪¼╪╣╪º╪¬ ╪¿╪¡╪º┘ä╪⌐ ${c.status || '╪º┘ä┘â┘ä'} ╪«┘ä╪º┘ä ╪ó╪«╪▒ ${c.days} ┘è┘ê┘à`
        : `┘à╪▒╪¬╪¼╪╣╪º╪¬ ╪¿╪¡╪º┘ä╪⌐ ${c.status || '╪º┘ä┘â┘ä'}`;
      break;
    case 'paymentStatus':
      summary = c.days
        ? `╪»┘ü╪╣ ╪¿╪¡╪º┘ä╪⌐ ${c.status} ╪«┘ä╪º┘ä ╪ó╪«╪▒ ${c.days} ┘è┘ê┘à`
        : `╪»┘ü╪╣ ╪¿╪¡╪º┘ä╪⌐ ${c.status}`;
      break;
    case 'city':
      summary = `┘à┘å ┘à╪»┘è┘å╪⌐: ${c.city || ''}`;
      break;
    case 'customerRating':
      summary = `╪º┘ä╪¬┘é┘è┘è┘à: ${c.rating || ''}`;
      break;
    case 'latest':
      summary = `╪ú╪¡╪»╪½ ${toPositiveInt(c.limit, 100)} ╪╣┘à┘è┘ä`;
      break;
    case 'oldest':
      summary = `╪ú┘é╪»┘à ${toPositiveInt(c.limit, 100)} ╪╣┘à┘è┘ä`;
      break;
    case 'minTotalSpent':
      summary = `╪Ñ╪¼┘à╪º┘ä┘è ╪Ñ┘å┘ü╪º┘é ΓëÑ ${c.amount}`;
      break;
    case 'minOrdersCount':
      summary = `╪╣╪»╪» ╪╖┘ä╪¿╪º╪¬ ΓëÑ ${c.count}`;
      break;
    case 'combo':
      summary = '┘é╪º╪ª┘à╪⌐ ┘à╪«╪╡┘æ╪╡╪⌐ (╪┤╪▒┘ê╪╖ ┘à╪¬╪╣╪»╪»╪⌐)';
      break;
    case 'preset': {
      const preset = PRESETS[c.preset || c.name];
      summary = preset ? preset.label : '┘é╪º╪ª┘à╪⌐ ╪¼╪º┘ç╪▓╪⌐';
      break;
    }
    default:
      summary = '╪¼┘à┘è╪╣ ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘å╪┤╪╖┘è┘å';
  }

  if (toPositiveInt(c.excludeContactedInDays, null)) {
    summary += ` | ╪¿╪»┘ê┘å ┘à╪▒╪º╪│┘ä╪⌐ ╪«┘ä╪º┘ä ╪ó╪«╪▒ ${c.excludeContactedInDays} ┘è┘ê┘à`;
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
