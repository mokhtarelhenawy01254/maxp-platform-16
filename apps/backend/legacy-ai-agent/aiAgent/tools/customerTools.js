/**
 * @module customerTools
 * @description Customer analysis and query tools.
 */

const {
  getSharedPrismaClient,
  periodToRange,
  formatCurrency,
} = require('../utils/toolHelpers');
const { createToolFromFunction } = require('../utils/autoSchemaGenerator');

async function customerInfoHandler(companyId, { query }) {
  /**
   * Look up a customer by phone number, name, or email.
   * @param {string} query - Phone number, name, or email
   */
  const prisma = getSharedPrismaClient();
  const customer = await prisma.customer.findFirst({
    where: {
      companyId,
      OR: [
        { phone: { contains: query } },
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      _count: { select: { orders: true } },
    },
  });

  if (!customer) return { found: false, code: 'CUSTOMER_NOT_FOUND', query };

  return {
    found: true,
    name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
    phone: customer.phone,
    email: customer.email || '—',
    status: customer.status,
    ordersCount: customer._count.orders,
    totalOrders: customer.totalOrdersCount || 0,
    rating: customer.customerRating || '—',
    joinDate: customer.createdAt?.toISOString(),
  };
}

async function customerTopBuyersHandler(companyId, { limit = 5, period = 'month' }) {
  /**
   * List top buyers for a selected period.
   * @param {number} limit - Maximum number of customers. Default 5.
   * @param {'week'|'month'|'all'} period - Time period to rank by.
   */
  const prisma = getSharedPrismaClient();
  const dateFilter = period !== 'all' ? periodToRange(period) : {};

  const topCustomers = await prisma.order.groupBy({
    by: ['customerId', 'customerName'],
    where: {
      companyId,
      paymentStatus: 'COMPLETED',
      ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      customerId: { not: null },
    },
    _count: { id: true },
    _sum: { total: true },
    orderBy: { _sum: { total: 'desc' } },
    take: Math.min(Number(limit), 20),
  });

  return topCustomers.map((c, i) => ({
    rank: i + 1,
    customerName: c.customerName || 'unknown',
    ordersCount: c._count.id,
    totalSpent: formatCurrency(c._sum.total),
  }));
}

const TOOLS = {
  'customer.info': createToolFromFunction('customer.info', customerInfoHandler, {
    description: 'Look up a customer by phone number, name, or email.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'customer.topBuyers': createToolFromFunction('customer.topBuyers', customerTopBuyersHandler, {
    description: 'List top buyers for a selected period.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),
};

module.exports = TOOLS;
