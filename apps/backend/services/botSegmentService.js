const { getSharedPrismaClient } = require('./sharedDatabase');
const { normalizeBotText } = require('./botRuleEngine');

function parseRules(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function compareValue(actual, expected, op) {
  if (actual === null || actual === undefined || actual === '') return false;
  const a = String(actual);
  const e = String(expected || '');
  switch (op) {
    case 'eq':
      return normalizeBotText(a) === normalizeBotText(e);
    case 'contains':
      return normalizeBotText(a).includes(normalizeBotText(e));
    case 'gte': {
      const an = Number(a);
      const en = Number(e);
      return !Number.isNaN(an) && !Number.isNaN(en) && an >= en;
    }
    case 'lte': {
      const an = Number(a);
      const en = Number(e);
      return !Number.isNaN(an) && !Number.isNaN(en) && an <= en;
    }
    default:
      return false;
  }
}

async function evaluateSegment(companyId, segment) {
  const prisma = getSharedPrismaClient();
  const rules = parseRules(segment?.rules);
  if (rules.length === 0) {
    const all = await prisma.customer.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true, phone: true, createdAt: true, totalOrdersCount: true },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });
    return all.map((c) => ({ customerId: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone }));
  }

  const customers = await prisma.customer.findMany({
    where: { companyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      totalOrdersCount: true,
      successScore: true,
      totalDelivered: true,
      status: true,
    },
    take: 500,
  });

  const fieldValues = await prisma.botCustomerFieldValue.findMany({
    where: { companyId, customerId: { in: customers.map((c) => c.id) } },
    select: { customerId: true, fieldKey: true, value: true },
  });
  const valueMap = new Map();
  for (const fv of fieldValues) {
    const key = `${fv.customerId}::${fv.fieldKey}`;
    valueMap.set(key, fv.value);
  }

  const matched = [];
  for (const customer of customers) {
    const row = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      totalOrdersCount: customer.totalOrdersCount,
      successScore: customer.successScore,
      totalDelivered: customer.totalDelivered,
      status: customer.status,
      createdAt: customer.createdAt ? customer.createdAt.toISOString() : '',
    };
    let allMatch = true;
    for (const rule of rules) {
      if (!rule || !rule.field) continue;
      let actual = row[rule.field];
      if (actual === undefined) {
        actual = valueMap.get(`${customer.id}::${rule.field}`);
      }
      if (!compareValue(actual, rule.value, rule.op || 'eq')) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      matched.push({
        customerId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
      });
    }
  }

  return matched.slice(0, 200);
}

async function countSegment(companyId, segment) {
  const matched = await evaluateSegment(companyId, segment);
  return matched.length;
}

module.exports = {
  parseRules,
  compareValue,
  evaluateSegment,
  countSegment,
};
