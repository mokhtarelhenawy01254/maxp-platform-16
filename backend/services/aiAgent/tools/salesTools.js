/**
 * @module salesTools
 * @description Revenue calculation and company operational dashboard tools.
 */

const {
  getSharedPrismaClient,
  periodToRange,
  formatCurrency,
} = require('../utils/toolHelpers');

const TOOLS = {
  'sales.revenue': {
    description: 'Return revenue and sales metrics for a period.',
    params: { period: 'today | yesterday | week | month' },
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['today', 'yesterday', 'week', 'month'], description: 'Time period for revenue stats.' },
      },
    },
    handler: async (companyId, { period = 'month' }) => {
      const prisma = getSharedPrismaClient();
      const dateFilter = periodToRange(period);

      const [revenue, orderCount, avgOrder] = await Promise.all([
        prisma.order.aggregate({
          where: { companyId, createdAt: dateFilter, paymentStatus: 'COMPLETED' },
          _sum: { total: true, discount: true, shipping: true },
          _count: { id: true },
          _avg: { total: true },
        }),
        prisma.order.count({
          where: { companyId, createdAt: dateFilter },
        }),
        prisma.order.aggregate({
          where: { companyId, createdAt: dateFilter, status: 'DELIVERED' },
          _count: { id: true },
        }),
      ]);

      return {
        period,
        totalRevenue: formatCurrency(revenue._sum.total),
        paidOrdersCount: revenue._count.id,
        totalOrders: orderCount,
        averageOrderValue: formatCurrency(revenue._avg.total),
        totalDiscounts: formatCurrency(revenue._sum.discount),
        totalShipping: formatCurrency(revenue._sum.shipping),
        deliveredOrdersCount: avgOrder._count.id,
      };
    },
  },

  'company.snapshot': {
    description: 'Return a quick operational snapshot for the company.',
    params: {},
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (companyId) => {
      const prisma = getSharedPrismaClient();
      const today = periodToRange('today');
      const month = periodToRange('month');

      const [todayOrders, pendingOrders, lowStockCount, monthRevenue, totalCustomers] = await Promise.all([
        prisma.order.count({ where: { companyId, createdAt: today } }),
        prisma.order.count({ where: { companyId, status: 'PENDING' } }),
        prisma.product.count({ where: { companyId, isActive: true, trackInventory: true, stock: { lte: 5 } } }),
        prisma.order.aggregate({ where: { companyId, createdAt: month, paymentStatus: 'COMPLETED' }, _sum: { total: true } }),
        prisma.customer.count({ where: { companyId } }),
      ]);

      return {
        todayOrders,
        pendingOrders,
        lowStockProductsCount: lowStockCount,
        monthRevenue: formatCurrency(monthRevenue._sum.total),
        totalCustomers,
      };
    },
  },
  'discount.create_draft': {
    description: 'Create a discount proposal draft that requires human approval.',
    params: {
      productId: 'Product ID or SKU to apply discount to',
      discountPercent: 'Percentage discount (1-100)',
      reason: 'Business reason for the discount',
    },
    requiredParams: ['productId', 'discountPercent'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['productId', 'discountPercent'],
      properties: {
        productId: { type: 'string', description: 'Product ID or SKU to apply discount to.' },
        discountPercent: { type: 'number', minimum: 1, maximum: 100, description: 'Percentage discount (1-100).' },
        reason: { type: 'string', description: 'Business reason for the discount.' },
      },
    },
    handler: async (companyId, { productId, discountPercent, reason }) => {
      const prisma = getSharedPrismaClient();
      const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
      if (!product) return { success: false, error: 'PRODUCT_NOT_FOUND' };
      return {
        success: true,
        draft: true,
        requiresApproval: true,
        productId,
        productName: product.name,
        originalPrice: Number(product.price),
        discountPercent,
        proposedPrice: Math.round(Number(product.price) * (1 - discountPercent / 100) * 100) / 100,
        reason,
      };
    },
  },
  'whatsapp.send': {
    description: 'Send a WhatsApp message to a customer.',
    params: {
      phone: 'Customer phone number in international format',
      message: 'Message text to send',
    },
    requiredParams: ['phone', 'message'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['phone', 'message'],
      properties: {
        phone: { type: 'string', description: 'Customer phone number in international format.' },
        message: { type: 'string', description: 'Message text to send.' },
      },
    },
    handler: async (companyId, { phone, message }) => {
      // Stub: real WhatsApp integration would queue to the WhatsApp service
      return { success: true, sent: false, queued: true, channel: 'whatsapp', phone, messageLength: message?.length };
    },
  },
};

module.exports = TOOLS;
