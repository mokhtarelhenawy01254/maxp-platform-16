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

const TOOLS = {
  'order.summary': {
    description: 'Return order count, revenue, and status summary for a period.',
    params: { period: 'today | yesterday | week | month' },
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['today', 'yesterday', 'week', 'month'], description: 'Time period for the summary.' },
      },
    },
    handler: async (companyId, { period = 'today' }) => {
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
    },
  },

  'order.lookup': {
    description: 'Look up a specific order by order number. Returns delivery date for exchange eligibility checks.',
    params: { orderNumber: 'Order number, for example 1042.' },
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The order number or ID to look up.' },
        customerId: { type: 'string', description: 'Optional customer ID to filter by.' },
      },
    },
    handler: async (companyId, { orderNumber }) => {
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
    },
  },

  'order.recentList': {
    description: 'List recent orders with optional status filtering.',
    params: { limit: 'Maximum number of orders. Default 5.', status: 'Optional status: PENDING | CONFIRMED | SHIPPED.' },
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Maximum number of orders to return.' },
        status: { type: 'string', description: 'Optional status filter: PENDING, CONFIRMED, or SHIPPED.' },
      },
    },
    handler: async (companyId, { limit = 5, status }) => {
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
    },
  },

  'order.create_draft': {
    description: 'Create an approval-required draft order from confirmed conversation details.',
    params: {
      conversationId: 'Optional conversation id',
      customerId: 'Optional customer id',
      productName: 'Product name',
      productColor: 'Optional product color',
      productSize: 'Optional product size',
      productPrice: 'Confirmed product price',
      quantity: 'Quantity',
      customerName: 'Customer name',
      customerPhone: 'Customer phone number',
      city: 'City or governorate',
      notes: 'Additional notes',
    },
    requiredParams: ['productName', 'productPrice', 'customerName', 'customerPhone'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['productName', 'productPrice', 'customerName', 'customerPhone'],
      properties: {
        conversationId: { type: 'string', description: 'Optional conversation ID for context.' },
        customerId: { type: 'string', description: 'Optional customer ID.' },
        productName: { type: 'string', description: 'The product name being ordered.' },
        productColor: { type: 'string', description: 'Optional product color variant.' },
        productSize: { type: 'string', description: 'Optional product size variant.' },
        productPrice: { type: 'number', minimum: 0, description: 'Confirmed unit price of the product.' },
        quantity: { type: 'integer', minimum: 1, description: 'Number of units to order.' },
        customerName: { type: 'string', description: 'Customer full name.' },
        customerPhone: { type: 'string', description: 'Customer phone number.' },
        city: { type: 'string', description: 'City or governorate for delivery.' },
        notes: { type: 'string', description: 'Additional order notes.' },
      },
    },
    handler: async (companyId, params = {}) => {
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
    },
  },

  'order.create_confirmed': {
    description: 'Create a real order after explicit customer confirmation and complete order details.',
    params: {
      conversationId: 'Optional conversation id',
      customerId: 'Optional customer id',
      productName: 'Confirmed product name',
      productColor: 'Optional confirmed product color',
      productSize: 'Optional confirmed product size',
      productPrice: 'Confirmed product price',
      quantity: 'Confirmed quantity',
      customerName: 'Customer name',
      customerPhone: 'Customer phone number',
      city: 'City or governorate for shipping',
      notes: 'Additional notes',
      confirmedByCustomer: 'True only when the customer explicitly confirmed placing the order',
    },
    requiredParams: ['productName', 'productPrice', 'customerName', 'customerPhone', 'city', 'confirmedByCustomer'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: [
        'productName',
        'productPrice',
        'customerName',
        'customerPhone',
        'city',
        'confirmedByCustomer',
      ],
      properties: {
        conversationId: { type: 'string', description: 'Optional conversation ID for context.' },
        customerId: { type: 'string', description: 'Optional customer ID.' },
        productName: { type: 'string', description: 'The confirmed product name.' },
        productColor: { type: 'string', description: 'Optional confirmed product color.' },
        productSize: { type: 'string', description: 'Optional confirmed product size.' },
        productPrice: { type: 'number', minimum: 0, description: 'Confirmed unit price.' },
        quantity: { type: 'integer', minimum: 1, description: 'Confirmed quantity.' },
        customerName: { type: 'string', description: 'Customer full name.' },
        customerPhone: { type: 'string', description: 'Customer phone number.' },
        city: { type: 'string', description: 'Delivery city or governorate.' },
        notes: { type: 'string', description: 'Additional order notes.' },
        confirmedByCustomer: { type: 'boolean', description: 'Must be true only when the customer explicitly confirmed placing the order.' },
      },
    },
    handler: async (companyId, params = {}) => {
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

      const orderService = require('../../orderService');
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
    },
  },

  'order.cancel': {
    description: 'Prepare an approval-required draft to cancel an order.',
    params: {
      orderId: 'Order number or id, for example 1042.',
      reason: 'Cancellation reason',
    },
    requiredParams: ['orderId', 'reason'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['orderId', 'reason'],
      properties: {
        orderId: { type: 'string', description: 'The order number or ID to cancel.' },
        reason: { type: 'string', description: 'Reason for cancellation.' },
      },
    },
    handler: async (companyId, params = {}) => {
      const orderId = normalizeOptionalString(params.orderId);
      const reason = normalizeOptionalString(params.reason);
      const orderService = require('../../orderService');
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
    },
  },

  'order.refund': {
    description: 'Prepare an approval-required draft refund for an order.',
    params: {
      orderId: 'Order number or id, for example 1042.',
      refundAmount: 'Requested refund amount',
      reason: 'Refund reason',
    },
    requiredParams: ['orderId', 'refundAmount'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['orderId', 'refundAmount'],
      properties: {
        orderId: { type: 'string', description: 'The order number or ID to refund.' },
        refundAmount: { type: 'number', minimum: 0, description: 'Amount to refund.' },
        reason: { type: 'string', description: 'Reason for the refund.' },
      },
    },
    handler: async (companyId, params = {}) => {
      const orderId = normalizeOptionalString(params.orderId);
      const refundAmount = Number(params.refundAmount);
      const reason = normalizeOptionalString(params.reason);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) throw new Error('ORDER_REFUND_AMOUNT_INVALID');

      const orderService = require('../../orderService');
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
    },
  },

  'shipping.rates': {
    description: 'Look up shipping rates and estimated delivery time for a governorate or city.',
    params: {
      governorate: 'Governorate name',
      city: 'Optional city name',
      weight: 'Optional package weight in kilograms',
    },
    requiredParams: ['governorate'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        governorate: { type: 'string', description: 'The governorate name to get shipping rates for.' },
        city: { type: 'string', description: 'Optional specific city within the governorate.' },
        weight: { type: 'number', minimum: 0, description: 'Package weight in kilograms.' },
      },
    },
    handler: async (companyId, { governorate, city, weight }) => {
      const shippingService = require('../../shippingService');
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
    },
  },

  'shipping.update': {
    description: 'Prepare an approval-required draft to update order shipping details.',
    params: {
      orderId: 'Order number or id, for example 1042.',
      address: 'New full shipping address',
      shippingClass: 'Optional shipping class',
    },
    requiredParams: ['orderId'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['orderId'],
      properties: {
        orderId: { type: 'string', description: 'The order number or ID to update shipping for.' },
        shippingClass: { type: 'string', description: 'New shipping class.' },
        address: { type: 'string', description: 'New full shipping address.' },
      },
    },
    handler: async (companyId, params = {}) => {
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

      const orderService = require('../../orderService');
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
    },
  },

  'order.confirm': {
    description: 'Prepare an approval-required draft to confirm an order.',
    params: {
      orderId: 'Order number or id, for example 1042.',
      notes: 'Optional confirmation notes',
    },
    requiredParams: ['orderId'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['orderId'],
      properties: {
        orderId: { type: 'string', description: 'The order number or ID to confirm.' },
        notes: { type: 'string', description: 'Optional confirmation notes.' },
      },
    },
    handler: async (companyId, params = {}) => {
      const orderId = normalizeOptionalString(params.orderId);
      const notes = normalizeOptionalString(params.notes);
      const orderService = require('../../orderService');
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
    },
  },
};

module.exports = TOOLS;
