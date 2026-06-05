/**
 * @module orderTools
 * @description Order management, refund, cancellation, shipping class rates, and confirmation tools.
 */

const {
  getSharedPrismaClient,
  periodToRange,
  formatCurrency,
  normalizeOptionalString,
} = require('../utils/toolHelpers');
const { createToolFromFunction } = require('../utils/autoSchemaGenerator');

function getDraftProposalService() {
  return require('../draftProposalService');
}

function normalizePositivePrice(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeQuantity(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, parseInt(parsed, 10)) : 1;
}

function numericOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function orderSummaryHandler(companyId, { period = 'today' } = {}) {
  /** Return order count, revenue, and status summary for a period.
   * @param {'today'|'yesterday'|'week'|'month'} [period] - Time period for the summary.
   */
  const prisma = getSharedPrismaClient();
  const dateFilter = periodToRange(period);

  const [orders, revenue] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      where: { companyId, createdAt: dateFilter },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { companyId, createdAt: dateFilter, paymentStatus: 'COMPLETED' },
      _sum: { total: true },
      _count: { id: true },
      _avg: { total: true },
    }),
  ]);

  const statusMap = orders.reduce((acc, row) => {
    acc[row.status] = row._count.id;
    return acc;
  }, {});

  const total = orders.reduce((s, r) => s + r._count.id, 0);

  return {
    period,
    totalOrders: total,
    paidRevenue: formatCurrency(revenue._sum.total),
    paidOrdersCount: revenue._count.id,
    avgOrderValue: formatCurrency(revenue._avg.total),
    byStatus: {
      pending: statusMap['PENDING'] || 0,
      confirmed: statusMap['CONFIRMED'] || 0,
      shipped: statusMap['SHIPPED'] || 0,
      delivered: statusMap['DELIVERED'] || 0,
      cancelled: statusMap['CANCELLED'] || 0,
    },
  };
}

async function orderLookupHandler(companyId, { orderNumber } = {}) {
  /** Look up a specific order by order number. Returns delivery date for exchange eligibility checks.
   * @param {string} [orderNumber] - Order number, for example 1042.
   */
  const prisma = getSharedPrismaClient();
  const order = await prisma.order.findFirst({
    where: {
      companyId,
      orderNumber: String(orderNumber),
    },
    include: {
      orderItems: { include: { product: { select: { name: true, sku: true } } } },
      customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
      statusHistory: {
        where: { status: 'DELIVERED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  if (!order) {
    return {
      found: false,
      code: 'ORDER_NOT_FOUND',
      orderNumber,
    };
  }

  // Extract delivery date from status history (when order was marked DELIVERED)
  const deliveredAt = order.statusHistory?.[0]?.createdAt ?? null;

  return {
    found: true,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: formatCurrency(order.total),
    customer: order.customer
      ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customerName
      : order.customerName,
    phone: order.customer?.phone || order.customerPhone,
    items: order.orderItems.map(i => ({
      name: i.product?.name || i.productName,
      qty: i.quantity,
      price: formatCurrency(i.price),
    })),
    createdAt: order.createdAt?.toISOString(),
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    deliveredAt: deliveredAt ? deliveredAt.toISOString() : null,
    updatedAt: order.updatedAt?.toISOString(),
  };
}

async function orderRecentListHandler(companyId, { limit = 5, status } = {}) {
  /** List recent orders with optional status filtering.
   * @param {integer} [limit] - Maximum number of orders. Default 5.
   * @param {'PENDING'|'CONFIRMED'|'SHIPPED'} [status] - Optional status: PENDING | CONFIRMED | SHIPPED.
   */
  const prisma = getSharedPrismaClient();
  const where = { companyId };
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit), 20),
    select: {
      orderNumber: true, status: true, total: true,
      customerName: true, customerPhone: true, createdAt: true, paymentStatus: true,
    },
  });

  return orders.map(o => ({
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    phone: o.customerPhone,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: formatCurrency(o.total),
    date: o.createdAt?.toISOString(),
  }));
}

async function orderCreateDraftHandler(companyId, params = {}) {
  /** Create an approval-required draft order from confirmed conversation details.
   * @param {string} productName - Product name.
   * @param {number} productPrice - Confirmed product price.
   * @param {string} customerName - Customer name.
   * @param {string} customerPhone - Customer phone number.
   * @param {string} [conversationId] - Optional conversation id.
   * @param {string} [customerId] - Optional customer id.
   * @param {string} [productColor] - Optional product color.
   * @param {string} [productSize] - Optional product size.
   * @param {integer} [quantity] - Quantity.
   * @param {string} [city] - City or governorate.
   * @param {string} [notes] - Additional notes.
   */
  const productName = normalizeOptionalString(params.productName);
  const customerName = normalizeOptionalString(params.customerName);
  const customerPhone = normalizeOptionalString(params.customerPhone);
  const productPrice = Number(params.productPrice);
  const quantity = Number.isFinite(Number(params.quantity)) ? Math.max(1, parseInt(params.quantity, 10)) : 1;
  const missingFields = [];

  if (!productName) missingFields.push('productName');
  if (!Number.isFinite(productPrice) || productPrice < 0) missingFields.push('productPrice');
  if (!customerName) missingFields.push('customerName');
  if (!customerPhone) missingFields.push('customerPhone');

  if (missingFields.length > 0) {
    return {
      status: 'NEEDS_MORE_INFO',
      orderCreated: false,
      draft: false,
      requiresApproval: false,
      canCreateDraft: false,
      missingFields,
    };
  }

  const orderDraft = {
    conversationId: normalizeOptionalString(params.conversationId),
    customerId: normalizeOptionalString(params.customerId),
    productName,
    productColor: normalizeOptionalString(params.productColor),
    productSize: normalizeOptionalString(params.productSize),
    productPrice,
    quantity,
    customerName,
    customerPhone,
    city: normalizeOptionalString(params.city),
    notes: normalizeOptionalString(params.notes),
    source: 'ceo-agent-order-draft',
  };

  const draft = await getDraftProposalService().createDraft(companyId, {
    agentId: normalizeOptionalString(params.agentId) || 'ceo-agent-tool',
    toolName: 'order.create_draft',
    params: orderDraft,
    reasoning: 'Customer order draft prepared by an agent from confirmed conversation details.',
    estimatedImpact: `Draft order for ${customerName}: ${quantity} x ${productName}`,
    conversationId: orderDraft.conversationId,
    customerId: orderDraft.customerId,
  });

  if (!draft.success) return draft;
  return {
    ...draft,
    draft: true,
    requiresApproval: true,
    orderDraft,
  };
}

async function orderCreateConfirmedHandler(companyId, params = {}) {
  /** Create a real order after explicit customer confirmation and complete order details.
   * @param {string} productName - Confirmed product name.
   * @param {number} productPrice - Confirmed product price.
   * @param {string} customerName - Customer name.
   * @param {string} customerPhone - Customer phone number.
   * @param {string} city - City or governorate for shipping.
   * @param {boolean} confirmedByCustomer - True only when the customer explicitly confirmed placing the order.
   * @param {string} [conversationId] - Optional conversation id.
   * @param {string} [customerId] - Optional customer id.
   * @param {string} [productColor] - Optional confirmed product color.
   * @param {string} [productSize] - Optional confirmed product size.
   * @param {integer} [quantity] - Confirmed quantity.
   * @param {string} [notes] - Additional notes.
   */
  const productName = normalizeOptionalString(params.productName);
  const customerName = normalizeOptionalString(params.customerName);
  const customerPhone = normalizeOptionalString(params.customerPhone);
  const city = normalizeOptionalString(params.city);
  const productPrice = normalizePositivePrice(params.productPrice);
  const quantity = normalizeQuantity(params.quantity);
  const missingFields = [];

  if (!productName) missingFields.push('productName');
  if (productPrice === null) missingFields.push('productPrice');
  if (!customerName) missingFields.push('customerName');
  if (!customerPhone) missingFields.push('customerPhone');
  if (!city) missingFields.push('city');

  if (params.confirmedByCustomer !== true) {
    return {
      status: 'NEEDS_CUSTOMER_CONFIRMATION',
      orderCreated: false,
      draft: false,
      requiresApproval: false,
      canCreateOrder: false,
      missingFields: ['confirmedByCustomer'],
    };
  }

  if (missingFields.length > 0) {
    return {
      status: 'NEEDS_MORE_INFO',
      orderCreated: false,
      draft: false,
      requiresApproval: false,
      canCreateOrder: false,
      missingFields,
    };
  }

  const orderService = require('../../../services/orderService');
  const order = await orderService.createOrderFromConversation({
    companyId,
    conversationId: normalizeOptionalString(params.conversationId),
    customerId: normalizeOptionalString(params.customerId),
    productName,
    productColor: normalizeOptionalString(params.productColor),
    productSize: normalizeOptionalString(params.productSize),
    productPrice,
    quantity,
    customerName,
    customerPhone,
    city,
    notes: normalizeOptionalString(params.notes),
  });

  const currency = order?.currency || 'EGP';

  return {
    status: 'ORDER_CREATED',
    orderCreated: true,
    draft: false,
    requiresApproval: false,
    canCreateOrder: true,
    orderId: order?.id || null,
    orderNumber: order?.orderNumber || null,
    orderStatus: order?.status || null,
    paymentStatus: order?.paymentStatus || null,
    duplicate: order?.status === 'DUPLICATE_ORDER',
    subtotal: numericOrNull(order?.subtotal),
    shipping: numericOrNull(order?.shipping),
    discount: numericOrNull(order?.discount),
    total: numericOrNull(order?.total),
    currency,
    customerId: order?.customerId || order?.customer?.id || normalizeOptionalString(params.customerId),
    customerName: order?.customerName || customerName,
    customerPhone: order?.customerPhone || customerPhone,
    product: {
      name: productName,
      color: normalizeOptionalString(params.productColor),
      size: normalizeOptionalString(params.productSize),
      quantity,
      unitPrice: productPrice,
    },
    createdAt: order?.createdAt && typeof order.createdAt.toISOString === 'function'
      ? order.createdAt.toISOString()
      : null,
  };
}

async function orderCancelHandler(companyId, params = {}) {
  /** Prepare an approval-required draft to cancel an order.
   * @param {string} orderId - Order number or id, for example 1042.
   * @param {string} reason - Cancellation reason.
   */
  const orderId = normalizeOptionalString(params.orderId);
  const reason = normalizeOptionalString(params.reason);
  const orderService = require('../../../services/orderService');
  const order = await orderService.getOrderByNumber(orderId, companyId);
  if (!order) {
    return { found: false, code: 'ORDER_NOT_FOUND', orderId };
  }

  const draft = await getDraftProposalService().createDraft(companyId, {
    agentId: normalizeOptionalString(params.agentId) || 'ceo-agent-tool',
    toolName: 'order.cancel',
    params: {
      orderId: order.orderNumber || order.id,
      reason,
    },
    reasoning: 'Agent proposed order cancellation after locating the order.',
    estimatedImpact: `Cancel order ${order.orderNumber || order.id}`,
  });

  if (!draft.success) return draft;
  return {
    ...draft,
    draft: true,
    requiresApproval: true,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    },
    message: 'Prepared an approval-required order cancellation draft. No order status was changed yet.',
  };
}

async function orderRefundHandler(companyId, params = {}) {
  /** Prepare an approval-required draft refund for an order.
   * @param {string} orderId - Order number or id, for example 1042.
   * @param {number} refundAmount - Requested refund amount.
   * @param {string} [reason] - Refund reason.
   */
  const orderId = normalizeOptionalString(params.orderId);
  const refundAmount = Number(params.refundAmount);
  const reason = normalizeOptionalString(params.reason);
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) throw new Error('ORDER_REFUND_AMOUNT_INVALID');

  const orderService = require('../../../services/orderService');
  const order = await orderService.getOrderByNumber(orderId, companyId);
  if (!order) {
    return { found: false, code: 'ORDER_NOT_FOUND', orderId };
  }

  const draft = await getDraftProposalService().createDraft(companyId, {
    agentId: normalizeOptionalString(params.agentId) || 'ceo-agent-tool',
    toolName: 'order.refund',
    params: {
      orderId: order.orderNumber || order.id,
      refundAmount,
      reason,
    },
    reasoning: 'Agent proposed a refund after locating the order.',
    estimatedImpact: `Refund ${refundAmount} for order ${order.orderNumber || order.id}`,
  });

  if (!draft.success) return draft;
  return {
    ...draft,
    draft: true,
    requiresApproval: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    refundAmount,
    currentStatus: order.status,
    message: 'Prepared an approval-required refund draft. No refund or order status change was executed yet.',
  };
}

async function shippingRatesHandler(companyId, { governorate, city, weight } = {}) {
  /** Look up shipping rates and estimated delivery time for a governorate or city.
   * @param {string} governorate - Governorate name.
   * @param {string} [city] - Optional city name.
   * @param {number} [weight] - Optional package weight in kilograms.
   */
  const shippingService = require('../../../services/shippingService');
  const info = await shippingService.findShippingInfo(governorate, companyId);

  if (!info || !info.found) {
    return {
      found: false,
      code: 'SHIPPING_RATE_NOT_FOUND',
      governorate,
    };
  }

  return {
    found: true,
    governorate: info.governorate,
    price: formatCurrency(info.price),
    deliveryTime: info.deliveryTime,
    isFlat: Boolean(info.isFlat),
  };
}

async function shippingUpdateHandler(companyId, params = {}) {
  /** Prepare an approval-required draft to update order shipping details.
   * @param {string} orderId - Order number or id, for example 1042.
   * @param {string} [address] - New full shipping address.
   * @param {string} [shippingClass] - Optional shipping class.
   */
  const orderId = normalizeOptionalString(params.orderId);
  const address = normalizeOptionalString(params.address);
  const shippingClass = normalizeOptionalString(params.shippingClass);
  if (!address && !shippingClass) {
    return {
      requiresMoreInfo: true,
      missingFields: ['address or shippingClass'],
      message: 'Shipping update needs a new address or shipping class before an approval draft can be prepared.',
    };
  }

  const orderService = require('../../../services/orderService');
  const order = await orderService.getOrderByNumber(orderId, companyId);
  if (!order) {
    return { found: false, code: 'ORDER_NOT_FOUND', orderId };
  }

  const draft = await getDraftProposalService().createDraft(companyId, {
    agentId: normalizeOptionalString(params.agentId) || 'ceo-agent-tool',
    toolName: 'shipping.update',
    params: {
      orderId: order.orderNumber || order.id,
      address,
      shippingClass,
    },
    reasoning: 'Agent proposed a shipping update after locating the order.',
    estimatedImpact: `Update shipping for order ${order.orderNumber || order.id}`,
  });

  if (!draft.success) return draft;
  return {
    ...draft,
    draft: true,
    requiresApproval: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    currentShippingAddress: order.shippingAddress || order.customerAddress || null,
    requestedShippingAddress: address,
    requestedShippingClass: shippingClass,
    message: 'Prepared an approval-required shipping update draft. No shipping details were changed yet.',
  };
}

async function orderConfirmHandler(companyId, params = {}) {
  /** Prepare an approval-required draft to confirm an order.
   * @param {string} orderId - Order number or id, for example 1042.
   * @param {string} [notes] - Optional confirmation notes.
   */
  const orderId = normalizeOptionalString(params.orderId);
  const notes = normalizeOptionalString(params.notes);
  const orderService = require('../../../services/orderService');
  const order = await orderService.getOrderByNumber(orderId, companyId);
  if (!order) {
    return { found: false, code: 'ORDER_NOT_FOUND', orderId };
  }

  const draft = await getDraftProposalService().createDraft(companyId, {
    agentId: normalizeOptionalString(params.agentId) || 'ceo-agent-tool',
    toolName: 'order.confirm',
    params: {
      orderId: order.orderNumber || order.id,
      notes,
    },
    reasoning: 'Agent proposed order confirmation after locating the order.',
    estimatedImpact: `Confirm order ${order.orderNumber || order.id}`,
  });

  if (!draft.success) return draft;
  return {
    ...draft,
    draft: true,
    requiresApproval: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    currentStatus: order.status,
    message: 'Prepared an approval-required order confirmation draft. No order status was changed yet.',
  };
}

const TOOLS = {
  'order.summary': createToolFromFunction('order.summary', orderSummaryHandler, {
    description: 'Return order count, revenue, and status summary for a period.',
    readOnly: true,
    requiresApproval: false,
    companyScoped: true,
  }),

  'order.lookup': createToolFromFunction('order.lookup', orderLookupHandler, {
    description: 'Look up a specific order by order number. Returns delivery date for exchange eligibility checks.',
    readOnly: true,
    requiresApproval: false,
    companyScoped: true,
  }),

  'order.recentList': createToolFromFunction('order.recentList', orderRecentListHandler, {
    description: 'List recent orders with optional status filtering.',
    readOnly: true,
    requiresApproval: false,
    companyScoped: true,
  }),

  'order.create_draft': createToolFromFunction('order.create_draft', orderCreateDraftHandler, {
    description: 'Create an approval-required draft order from confirmed conversation details.',
    readOnly: false,
    requiresApproval: true,
    companyScoped: true,
    requiredParams: ['productName', 'productPrice', 'customerName', 'customerPhone'],
  }),

  'order.create_confirmed': createToolFromFunction('order.create_confirmed', orderCreateConfirmedHandler, {
    description: 'Create a real order after explicit customer confirmation and complete order details.',
    readOnly: false,
    requiresApproval: false,
    companyScoped: true,
    requiredParams: ['productName', 'productPrice', 'customerName', 'customerPhone', 'city', 'confirmedByCustomer'],
  }),

  'order.cancel': createToolFromFunction('order.cancel', orderCancelHandler, {
    description: 'Prepare an approval-required draft to cancel an order.',
    readOnly: false,
    requiresApproval: true,
    companyScoped: true,
    requiredParams: ['orderId', 'reason'],
  }),

  'order.refund': createToolFromFunction('order.refund', orderRefundHandler, {
    description: 'Prepare an approval-required draft refund for an order.',
    readOnly: false,
    requiresApproval: true,
    companyScoped: true,
    requiredParams: ['orderId', 'refundAmount'],
  }),

  'shipping.rates': createToolFromFunction('shipping.rates', shippingRatesHandler, {
    description: 'Look up shipping rates and estimated delivery time for a governorate or city.',
    readOnly: true,
    requiresApproval: false,
    companyScoped: true,
    requiredParams: ['governorate'],
  }),

  'shipping.update': createToolFromFunction('shipping.update', shippingUpdateHandler, {
    description: 'Prepare an approval-required draft to update order shipping details.',
    readOnly: false,
    requiresApproval: true,
    companyScoped: true,
    requiredParams: ['orderId'],
  }),

  'order.confirm': createToolFromFunction('order.confirm', orderConfirmHandler, {
    description: 'Prepare an approval-required draft to confirm an order.',
    readOnly: false,
    requiresApproval: true,
    companyScoped: true,
    requiredParams: ['orderId'],
  }),
};

module.exports = TOOLS;
