/**
 * @module salesTools
 * @description Revenue calculation and company operational dashboard tools.
 */

const {
  getSharedPrismaClient,
  periodToRange,
  formatCurrency,
} = require('../utils/toolHelpers');
const { createToolFromFunction } = require('../utils/autoSchemaGenerator');

async function salesRevenueHandler(companyId, { period = 'month' } = {}) {
  /** Return revenue and sales metrics for a period.
   * @param {'today'|'yesterday'|'week'|'month'} [period] - Time period for revenue stats.
   */
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
}

async function companySnapshotHandler(companyId) {
  /** Return a quick operational snapshot for the company.
   */
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
}

async function discountCreateDraftHandler(companyId, { productId, discountPercent, reason }) {
  /** Create a discount proposal draft that requires human approval.
   * @param {string} productId - Product ID or SKU to apply discount to.
   * @param {number} discountPercent - Percentage discount (1-100).
   * @param {string} [reason] - Business reason for the discount.
   */
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
}

async function whatsappSendHandler(companyId, { phone, message }) {
  /** Send a WhatsApp message to a customer.
   * @param {string} phone - Customer phone number in international format.
   * @param {string} message - Message text to send.
   */
  // Stub: real WhatsApp integration would queue to the WhatsApp service
  return { success: true, sent: false, queued: true, channel: 'whatsapp', phone, messageLength: message?.length };
}

const TOOLS = {
  'sales.revenue': createToolFromFunction('sales.revenue', salesRevenueHandler, {
    description: 'Return revenue and sales metrics for a period.',
    readOnly: true,
    requiresApproval: false,
    companyScoped: true,
  }),

  'company.snapshot': createToolFromFunction('company.snapshot', companySnapshotHandler, {
    description: 'Return a quick operational snapshot for the company.',
    readOnly: true,
    requiresApproval: false,
    companyScoped: true,
  }),

  'discount.create_draft': createToolFromFunction('discount.create_draft', discountCreateDraftHandler, {
    description: 'Create a discount proposal draft that requires human approval.',
    readOnly: false,
    requiresApproval: true,
    companyScoped: true,
    requiredParams: ['productId', 'discountPercent'],
  }),

  'whatsapp.send': createToolFromFunction('whatsapp.send', whatsappSendHandler, {
    description: 'Send a WhatsApp message to a customer.',
    readOnly: false,
    requiresApproval: false,
    companyScoped: true,
    requiredParams: ['phone', 'message'],
  }),
};

module.exports = TOOLS;
