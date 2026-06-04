/**
 * @module customerTools
 * @description Customer analysis and query tools.
 */

const {
  getSharedPrismaClient,
  periodToRange,
  formatCurrency,
} = require('../utils/toolHelpers');

const TOOLS = {
  'customer.info': {
    description: 'Look up a customer by phone number, name, or email.',
    params: { query: 'Phone number, name, or email' },
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['customerId'],
      properties: {
        customerId: { type: 'string', description: 'Customer ID to look up.' },
      },
    },
    handler: async (companyId, { query }) => {
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
    },
  },

  'customer.topBuyers': {
    description: 'List top buyers for a selected period.',
    params: { limit: 'Maximum number of customers. Default 5.', period: 'week | month | all' },
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Maximum customers to return.' },
        period: { type: 'string', enum: ['week', 'month', 'all'], description: 'Time period to rank by.' },
      },
    },
    handler: async (companyId, { limit = 5, period = 'month' }) => {
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
    },
  },
};

module.exports = TOOLS;
