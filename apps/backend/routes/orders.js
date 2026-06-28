const express = require('express');
const socketService = require('../services/socketService');
const { v4: uuidv4 } = require('uuid');
const verifyToken = require('../utils/verifyToken');
const router = express.Router();
const { checkAppAccess } = require('../middleware/checkAppAccess');

const simpleOrderService = require('../services/simpleOrderService');
const orderService = require('../services/orderService');
const orderDetailsUpdateService = require('../services/orderDetailsUpdateService');
const cashbackService = require('../services/cashbackService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const preparationQueueService = require('../services/preparationQueueService');
const merchantService = require('../services/merchantService');
const { validateOrderItems, validateEgyptianPhone } = require('../utils/orderValidation');
const {
  isMerchantUser,
  requireMerchantAccountForUser
} = require('../utils/merchantAccountScope');

// Apply order-core access check to all routes in this router
router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireCompanyAccess);
const requireOrderCoreAccess = checkAppAccess('order-core');
const MERCHANT_ALLOWED_ORDER_ROUTES = [
  { method: 'GET', pattern: /^\/simple\/?$/ },
  { method: 'GET', pattern: /^\/simple\/(?!stats\/?$)[^/]+\/?$/ },
  { method: 'POST', pattern: /^\/simple\/[^/]+\/status\/?$/ },
  { method: 'POST', pattern: /^\/simple\/[^/]+\/viewed\/?$/ }
];
const isMerchantAllowedOrderRoute = (req) => {
  const method = String(req.method || '').toUpperCase();
  const path = String(req.path || '');
  return MERCHANT_ALLOWED_ORDER_ROUTES.some(
    (route) => route.method === method && route.pattern.test(path)
  );
};
router.use((req, res, next) => {
  if (isMerchantUser(req.user)) {
    if (isMerchantAllowedOrderRoute(req)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      code: 'MERCHANT_ORDER_ROUTE_NOT_ALLOWED',
      message: 'التاجر يستخدم مسار الطلبات الموحد فقط للعرض وتحديث طلبات التنفيذ الخاصة به'
    });
  }

  return requireOrderCoreAccess(req, res, next);
});


// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const toSafeOrderAmount = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const addMerchantOrderScope = (whereClause, merchant) => {
  if (!merchant?.id) return;
  if (!whereClause.AND) whereClause.AND = [];
  whereClause.AND.push({
    merchantOrders: {
      some: {
        merchantId: merchant.id
      }
    }
  });
};

const disableGuestOrderScope = (guestWhereClause, merchant) => {
  if (!merchant?.id) return;
  if (!guestWhereClause.AND) guestWhereClause.AND = [];
  guestWhereClause.AND.push({
    id: '__merchant_scope_excludes_guest_orders__'
  });
};

const MERCHANT_OPERATION_FILTERS = new Set([
  'PREPARATION',
  'IN_SHIPPING',
  'DELIVERED',
  'NOT_DELIVERED'
]);
const MERCHANT_FULFILLMENT_SOURCES = new Set([
  'MERCHANT',
  'COMPANY_WAREHOUSE'
]);
const MERCHANT_SETTLEMENT_FILTERS = new Set([
  'PAYABLE',
  'PAID',
  'PENDING',
  'NOT_PAYABLE'
]);
const PREPARATION_MERCHANT_ORDER_STATUSES = ['PENDING', 'CONFIRMED'];
const SHIPPING_MERCHANT_ORDER_STATUSES = ['SENT'];
const DELIVERED_MERCHANT_ORDER_STATUSES = ['FULFILLED'];
const FAILED_MERCHANT_ORDER_STATUSES = ['CANCELLED', 'FAILED'];
const SHIPPING_SHIPMENT_STATUSES = [
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'PICKED_UP',
  'SENT'
];
const DELIVERED_SHIPMENT_STATUSES = ['DELIVERED', 'COMPLETED', 'FULFILLED'];
const FAILED_SHIPMENT_STATUSES = [
  'RETURNED',
  'FAILED',
  'CANCELLED',
  'CANCELED',
  'NOT_DELIVERED'
];

const normalizeOrderRouteCode = (value) =>
  String(value || '').trim().toUpperCase();

const blockGuestOrdersForMerchantFilters = (guestWhereClause) => {
  if (!guestWhereClause.AND) guestWhereClause.AND = [];
  guestWhereClause.AND.push({
    id: '__guest_orders_do_not_support_merchant_filters__'
  });
};

const appendMerchantOrderFilter = (whereClause, guestWhereClause, condition) => {
  if (!condition) return;
  if (!whereClause.AND) whereClause.AND = [];
  whereClause.AND.push({
    merchantOrders: {
      some: condition
    }
  });
  blockGuestOrdersForMerchantFilters(guestWhereClause);
};

const appendCommissionFilter = (whereClause, guestWhereClause, condition) => {
  if (!condition) return;
  if (!whereClause.AND) whereClause.AND = [];
  whereClause.AND.push({
    commissions: {
      some: condition
    }
  });
  blockGuestOrdersForMerchantFilters(guestWhereClause);
};

const buildMerchantOperationWhere = (operationStatus) => {
  switch (operationStatus) {
    case 'PREPARATION':
      return {
        OR: [
          { status: { in: PREPARATION_MERCHANT_ORDER_STATUSES } },
          { shipments: { some: { status: { in: ['PENDING', 'CREATED'] } } } }
        ]
      };
    case 'IN_SHIPPING':
      return {
        OR: [
          { status: { in: SHIPPING_MERCHANT_ORDER_STATUSES } },
          { shipments: { some: { status: { in: SHIPPING_SHIPMENT_STATUSES } } } }
        ]
      };
    case 'DELIVERED':
      return {
        OR: [
          { status: { in: DELIVERED_MERCHANT_ORDER_STATUSES } },
          { shipments: { some: { status: { in: DELIVERED_SHIPMENT_STATUSES } } } }
        ]
      };
    case 'NOT_DELIVERED':
      return {
        OR: [
          { status: { in: FAILED_MERCHANT_ORDER_STATUSES } },
          { shipments: { some: { status: { in: FAILED_SHIPMENT_STATUSES } } } }
        ]
      };
    default:
      return null;
  }
};

const classifyMerchantOperationForOrder = (merchantOrder, orderStatus) => {
  if (!merchantOrder) return null;
  const merchantOrderStatus = normalizeOrderRouteCode(merchantOrder.status);
  const shipment = Array.isArray(merchantOrder.shipments)
    ? merchantOrder.shipments[0] || null
    : null;
  const shipmentStatus = normalizeOrderRouteCode(shipment?.status);
  const normalizedOrderStatus = normalizeOrderRouteCode(orderStatus);

  if (
    DELIVERED_MERCHANT_ORDER_STATUSES.includes(merchantOrderStatus) ||
    DELIVERED_SHIPMENT_STATUSES.includes(shipmentStatus) ||
    ['DELIVERED', 'COMPLETED'].includes(normalizedOrderStatus)
  ) {
    return 'DELIVERED';
  }

  if (
    FAILED_MERCHANT_ORDER_STATUSES.includes(merchantOrderStatus) ||
    FAILED_SHIPMENT_STATUSES.includes(shipmentStatus) ||
    ['CANCELLED', 'CANCELED', 'RETURNED', 'REFUNDED'].includes(normalizedOrderStatus)
  ) {
    return 'NOT_DELIVERED';
  }

  if (
    SHIPPING_MERCHANT_ORDER_STATUSES.includes(merchantOrderStatus) ||
    SHIPPING_SHIPMENT_STATUSES.includes(shipmentStatus) ||
    ['SHIPPED'].includes(normalizedOrderStatus)
  ) {
    return 'IN_SHIPPING';
  }

  return 'PREPARATION';
};

const safeParseMerchantOrderItems = (rawItems) => {
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems !== 'string' || !rawItems.trim()) return [];
  try {
    const parsed = JSON.parse(rawItems);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const countMerchantOrderItems = (rawItems) =>
  safeParseMerchantOrderItems(rawItems).reduce((total, item) => {
    const quantity = Number(item?.quantity ?? item?.qty ?? 1);
    return total + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  }, 0);

const buildScopedMerchantOrderInclude = (merchant) => (
  {
    merchantOrders: {
      ...(merchant?.id ? { where: { merchantId: merchant.id } } : {}),
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
            fulfillmentMode: true,
            defaultWarehouseId: true,
            defaultShippingCompanyId: true
          }
        },
        shipments: {
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                location: true
              }
            },
            shippingCompany: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      }
    }
  }
);

const safeParseOrderMetadata = (rawMetadata, fallback = {}) => {
  if (!rawMetadata) return { ...fallback };
  if (typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)) {
    return { ...fallback, ...rawMetadata };
  }
  if (typeof rawMetadata === 'string') {
    try {
      const parsed = JSON.parse(rawMetadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...fallback, ...parsed };
      }
    } catch (_) {
      return { ...fallback };
    }
  }
  return { ...fallback };
};

const serializeMerchantOrderScope = (merchantOrder, order = {}) => {
  if (!merchantOrder) return null;
  const shipment = Array.isArray(merchantOrder.shipments)
    ? merchantOrder.shipments[0] || null
    : null;
  const merchantCommissions = Array.isArray(order.commissions)
    ? order.commissions.filter((commission) => commission.merchantId === merchantOrder.merchantId)
    : [];
  const affiliateCommissions = Array.isArray(order.commissions)
    ? order.commissions.filter((commission) => commission.affiliateId)
    : [];
  const merchantCommissionAmount = merchantCommissions.reduce(
    (total, commission) => total + toSafeOrderAmount(commission.amount),
    0
  );
  const affiliateCommissionAmount = affiliateCommissions.reduce(
    (total, commission) => total + toSafeOrderAmount(commission.amount),
    0
  );

  return {
    id: merchantOrder.id,
    merchantId: merchantOrder.merchantId || null,
    merchantName: merchantOrder.merchant?.name || null,
    merchantEmail: merchantOrder.merchant?.email || null,
    merchantFulfillmentMode: merchantOrder.merchant?.fulfillmentMode || null,
    status: merchantOrder.status || null,
    operationStatus: classifyMerchantOperationForOrder(merchantOrder, order.status),
    fulfillmentSource: merchantOrder.fulfillmentSource || 'MERCHANT',
    warehouseId: merchantOrder.warehouseId || shipment?.warehouse?.id || null,
    warehouseName: shipment?.warehouse?.name || null,
    shippingCompanyId: merchantOrder.shippingCompanyId || shipment?.shippingCompany?.id || null,
    shippingCompanyName: shipment?.shippingCompany?.name || null,
    trackingNumber: shipment?.trackingNumber || merchantOrder.trackingNumber || null,
    shipmentStatus: shipment?.status || null,
    pieces: countMerchantOrderItems(merchantOrder.items),
    merchantAmount: toSafeOrderAmount(merchantOrder.totalAmount),
    merchantCommissionAmount,
    affiliateCommissionAmount,
    settlementStatus: merchantCommissions.some((commission) => commission.status === 'PAID')
      ? 'PAID'
      : merchantCommissions.some((commission) => ['CONFIRMED', 'PENDING'].includes(commission.status))
        ? 'PAYABLE'
        : null
  };
};

const ORDER_SOURCE_TRACKING_APP_SLUGS = new Set(['order-source-tracking']);
const ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS = new Set(['campaign-attribution']);
const ORDER_CONFIRMATION_DISTRIBUTION_APP_SLUGS = new Set(['order-confirmation-distribution']);
const ORDER_DETAIL_OPTIONAL_APP_SLUGS = [
  ...ORDER_SOURCE_TRACKING_APP_SLUGS,
  ...ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  ...ORDER_CONFIRMATION_DISTRIBUTION_APP_SLUGS
];

const hasAnyAppSlug = (activeSlugs, expectedSlugs) =>
  Array.from(expectedSlugs).some((slug) => activeSlugs.has(slug));

const getOrderDetailFeatureAccess = async (companyId) => {
  const defaultAccess = {
    orderSource: false,
    campaignAttribution: false,
    confirmationDistribution: false
  };

  if (!companyId) return defaultAccess;

  const prisma = getSharedPrismaClient();
  const companyApps = await prisma.companyApp.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'TRIAL'] },
      app: {
        slug: { in: ORDER_DETAIL_OPTIONAL_APP_SLUGS },
        isActive: true
      }
    },
    include: {
      app: {
        select: {
          slug: true
        }
      }
    }
  });
  const activeSlugs = new Set(
    companyApps
      .map((companyApp) => String(companyApp.app?.slug || '').trim())
      .filter(Boolean)
  );

  return {
    orderSource: hasAnyAppSlug(activeSlugs, ORDER_SOURCE_TRACKING_APP_SLUGS),
    campaignAttribution: hasAnyAppSlug(activeSlugs, ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS),
    confirmationDistribution: hasAnyAppSlug(activeSlugs, ORDER_CONFIRMATION_DISTRIBUTION_APP_SLUGS)
  };
};

const sanitizeMerchantOrderScopeForMerchant = (merchantOrderScope) => {
  if (!merchantOrderScope) return null;

  return {
    id: merchantOrderScope.id || null,
    merchantId: merchantOrderScope.merchantId || null,
    merchantName: merchantOrderScope.merchantName || null,
    status: merchantOrderScope.status || null,
    operationStatus: merchantOrderScope.operationStatus || null,
    fulfillmentSource: merchantOrderScope.fulfillmentSource || 'MERCHANT',
    warehouseId: merchantOrderScope.warehouseId || null,
    warehouseName: merchantOrderScope.warehouseName || null,
    shippingCompanyId: merchantOrderScope.shippingCompanyId || null,
    shippingCompanyName: merchantOrderScope.shippingCompanyName || null,
    trackingNumber: merchantOrderScope.trackingNumber || null,
    shipmentStatus: merchantOrderScope.shipmentStatus || null,
    pieces: merchantOrderScope.pieces ?? null
  };
};

const sanitizeOrderMetadataForMerchant = (metadata, merchantOrderScope) => {
  const sanitizedMetadata = {};
  if (metadata?.isGuestOrder === true) {
    sanitizedMetadata.isGuestOrder = true;
  }

  const safeMerchantOrderScope = sanitizeMerchantOrderScopeForMerchant(merchantOrderScope);
  if (safeMerchantOrderScope) {
    sanitizedMetadata.merchantOrder = safeMerchantOrderScope;
    sanitizedMetadata.merchantScope = {
      merchantId: safeMerchantOrderScope.merchantId,
      fulfillmentSource: safeMerchantOrderScope.fulfillmentSource
    };
  }

  return sanitizedMetadata;
};

const removeOrderSourceFields = (orderPayload) => {
  delete orderPayload.sourceType;
  delete orderPayload.extractionMethod;
  delete orderPayload.orderSource;
  delete orderPayload.conversationId;
  delete orderPayload.conversation;
  delete orderPayload.createdBy;
  delete orderPayload.createdByName;
  delete orderPayload.createdByUser;
};

const removeConfirmationDistributionFields = (orderPayload) => {
  delete orderPayload.confirmedAt;
  delete orderPayload.confirmedBy;
  delete orderPayload.confirmedByUser;
  delete orderPayload.confirmationNotes;
  delete orderPayload.assignedTo;
  delete orderPayload.assignedBy;
  delete orderPayload.assignedAt;
  delete orderPayload.assignmentStrategy;
  delete orderPayload.assignedToUser;
  delete orderPayload.assignedByUser;
};

const applyOrderDetailFeatureAccess = (
  orderPayload,
  featureAccess,
  options = {}
) => {
  const sanitizedOrder = { ...orderPayload };
  const metadata = safeParseOrderMetadata(orderPayload.metadata);

  if (options.isMerchant) {
    removeOrderSourceFields(sanitizedOrder);
    removeConfirmationDistributionFields(sanitizedOrder);
    delete sanitizedOrder.affiliateId;
    delete sanitizedOrder.affiliate;

    const merchantOrderScope = sanitizeMerchantOrderScopeForMerchant(
      sanitizedOrder.merchantOrder || metadata.merchantOrder
    );
    sanitizedOrder.merchantOrder = merchantOrderScope || undefined;
    sanitizedOrder.metadata = sanitizeOrderMetadataForMerchant(metadata, merchantOrderScope);
    return sanitizedOrder;
  }

  if (!featureAccess.orderSource) {
    removeOrderSourceFields(sanitizedOrder);
    delete metadata.source;
    delete metadata.extractionMethod;
    delete metadata.orderSource;
  }

  if (!featureAccess.campaignAttribution) {
    delete metadata.attribution;
  }

  if (!featureAccess.confirmationDistribution) {
    removeConfirmationDistributionFields(sanitizedOrder);
  }

  sanitizedOrder.metadata = metadata;
  return sanitizedOrder;
};

const mapOrderStatusToMerchantOrderStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  if (['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(normalizedStatus)) return 'FULFILLED';
  if (['CANCELLED', 'CANCELED', 'RETURNED'].includes(normalizedStatus)) return 'CANCELLED';
  if (['FAILED', 'REJECTED'].includes(normalizedStatus)) return 'FAILED';
  if (['CONFIRMED', 'PROCESSING'].includes(normalizedStatus)) return 'CONFIRMED';
  if (['PENDING', 'NEW'].includes(normalizedStatus)) return 'PENDING';
  return null;
};

const syncMerchantOrderStatusFromOrder = async ({ merchantOrder, status, notes }) => {
  const nextMerchantStatus = mapOrderStatusToMerchantOrderStatus(status);
  if (!merchantOrder?.id || !nextMerchantStatus) return null;

  if (nextMerchantStatus === 'FULFILLED') {
    return merchantService.fulfillMerchantOrder(merchantOrder.id, {
      trackingNumber: merchantOrder.trackingNumber || null,
      merchantOrderId: merchantOrder.merchantOrderId || null,
      notes: notes || merchantOrder.notes || null
    });
  }

  return getSharedPrismaClient().merchantOrder.update({
    where: { id: merchantOrder.id },
    data: {
      status: nextMerchantStatus,
      ...(notes ? { notes } : {}),
      ...(nextMerchantStatus === 'CANCELLED' || nextMerchantStatus === 'FAILED'
        ? { fulfilledAt: null }
        : {})
    }
  });
};

const parseGuestShippingAddress = (shippingAddress) => {
  if (!shippingAddress) {
    return {};
  }

  if (typeof shippingAddress === 'string') {
    try {
      const parsed = JSON.parse(shippingAddress);
      return parsed && typeof parsed === 'object' ? parsed : { raw: shippingAddress };
    } catch (_) {
      return { raw: shippingAddress };
    }
  }

  return typeof shippingAddress === 'object' ? shippingAddress : {};
};

const extractShippingLocationCandidates = (shippingAddress) => {
  const parsedAddress = parseGuestShippingAddress(shippingAddress);
  const directCandidates = [
    parsedAddress.governorate,
    parsedAddress.city,
    parsedAddress.state,
    parsedAddress.region,
    parsedAddress.address,
    parsedAddress.street,
    parsedAddress.raw
  ];

  const splitCandidates = directCandidates.flatMap((value) =>
    typeof value === 'string'
      ? value
          .split(/[,\u060C]/)
          .map((part) => part.trim())
          .filter(Boolean)
      : []
  );

  return [...new Set(splitCandidates.map((value) => value.toLowerCase()))];
};

const parseZoneGovernorates = (zone) => {
  if (!zone) {
    return [];
  }

  if (Array.isArray(zone.governorates)) {
    return zone.governorates.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
  }

  if (typeof zone.governorates === 'string') {
    try {
      const parsed = JSON.parse(zone.governorates);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
      }
    } catch (_) {
      return zone.governorates
        .split(/[,\u060C]/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
    }
  }

  if (typeof zone.governorate === 'string') {
    return zone.governorate
      .split(/[,\u060C]/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
};

const resolveShippingCostFromZones = (shippingAddress, shippingZones = []) => {
  const locationCandidates = extractShippingLocationCandidates(shippingAddress);
  if (locationCandidates.length === 0 || shippingZones.length === 0) {
    return 0;
  }

  const matchedZone = shippingZones.find((zone) => {
    const zoneGovernorates = parseZoneGovernorates(zone);
    return zoneGovernorates.some((zoneGovernorate) =>
      locationCandidates.some(
        (candidate) =>
          zoneGovernorate.includes(candidate) || candidate.includes(zoneGovernorate)
      )
    );
  });

  return matchedZone ? toSafeOrderAmount(matchedZone.price ?? matchedZone.cost) : 0;
};

const resolveGuestOrderAmounts = (guestOrder, shippingZones = []) => {
  const subtotal = toSafeOrderAmount(guestOrder?.total);
  const persistedShipping = toSafeOrderAmount(guestOrder?.shippingCost);
  const inferredShipping =
    persistedShipping > 0
      ? persistedShipping
      : resolveShippingCostFromZones(guestOrder?.shippingAddress, shippingZones);
  const shipping = inferredShipping;
  const discount = toSafeOrderAmount(guestOrder?.discountAmount);
  const storedFinalTotal = toSafeOrderAmount(guestOrder?.finalTotal);
  const hasStoredFinalTotal =
    guestOrder?.finalTotal !== null &&
    guestOrder?.finalTotal !== undefined &&
    guestOrder?.finalTotal !== '';
  const computedTotal = Math.max(0, subtotal + shipping - discount);
  const shouldUseComputedTotal =
    !hasStoredFinalTotal ||
    (persistedShipping <= 0 && shipping > 0 && storedFinalTotal <= Math.max(0, subtotal - discount));

  return {
    subtotal,
    shipping,
    discount,
    total: shouldUseComputedTotal ? computedTotal : storedFinalTotal
  };
};

const HIDDEN_REGULAR_ORDER_STATUSES = ['TRASH'];
const HIDDEN_REGULAR_ORDER_STATUSES_WITH_DUPLICATES = [
  ...HIDDEN_REGULAR_ORDER_STATUSES,
  'DUPLICATE_ORDER'
];

const HIDDEN_GUEST_ORDER_STATUSES = ['TRASH', 'trash', 'deleted'];
const HIDDEN_GUEST_ORDER_STATUSES_WITH_DUPLICATES = [
  ...HIDDEN_GUEST_ORDER_STATUSES,
  'DUPLICATE_ORDER',
  'duplicate_order'
];

const getVisibleRegularOrderStatusesFilter = (duplicateSettings) => ({
  notIn:
    duplicateSettings?.action === 'ignore'
      ? HIDDEN_REGULAR_ORDER_STATUSES_WITH_DUPLICATES
      : HIDDEN_REGULAR_ORDER_STATUSES
});

const getVisibleGuestOrderStatusesFilter = (duplicateSettings) => ({
  notIn:
    duplicateSettings?.action === 'ignore'
      ? HIDDEN_GUEST_ORDER_STATUSES_WITH_DUPLICATES
      : HIDDEN_GUEST_ORDER_STATUSES
});

const getBulkStatusNote = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();

  if (normalizedStatus === 'TRASH') {
    return 'Bulk trash';
  }

  if (normalizedStatus === 'RESTORE') {
    return 'Bulk restore';
  }

  return 'Bulk status update';
};

const normalizeStatusNote = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const isCancellationStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return normalizedStatus === 'CANCELLED' || normalizedStatus === 'CANCELED';
};

const getCancellationReasonError = () => 'سبب إلغاء الطلب مطلوب عند اختيار حالة ملغي';

const checkOrderEditPermission = async (req, orderIdentifier) => {
  if (req.user && ['MODERATOR', 'EMPLOYEE'].includes(req.user.role)) {
    const existingOrder = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderIdentifier, companyId: req.user.companyId },
          { orderNumber: orderIdentifier, companyId: req.user.companyId }
        ]
      },
      select: { createdBy: true }
    });

    if (existingOrder && existingOrder.createdBy !== req.user.id) {
      return false;
    }
    
    if (!existingOrder) {
      const guestOrder = await getSharedPrismaClient().guestOrder.findFirst({
        where: {
          OR: [
            { id: orderIdentifier, companyId: req.user.companyId },
            { orderNumber: orderIdentifier, companyId: req.user.companyId }
          ]
        },
        select: { createdBy: true }
      });
      if (guestOrder && guestOrder.createdBy !== req.user.id) {
        return false;
      }
    }
  }
  return true;
};

const updateAnyOrderStatus = async ({
  orderIdentifier,
  companyId,
  status,
  notes,
  userId,
  userName,
  options = {}
}) => {
  const { skipTransitionValidation = false } = options;

  try {
    const order = await orderService.updateOrderStatus(
      orderIdentifier,
      companyId,
      status,
      notes,
      userId,
      userName,
      null,
      false,
      { skipTransitionValidation }
    );

    return { orderType: 'regular', order };
  } catch (regularOrderError) {
    if (regularOrderError?.statusCode !== 404) {
      throw regularOrderError;
    }
  }

  const guestOrder = await orderService.updateGuestOrderStatus(
    orderIdentifier,
    companyId,
    status,
    notes,
    userId,
    userName,
    null,
    { skipTransitionValidation }
  );

  return { orderType: 'guest', order: guestOrder };
};

const createBulkOrderError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isTrashOrderStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return normalizedStatus === 'TRASH' || normalizedStatus === 'DELETED';
};

const permanentlyDeleteRegularOrder = async ({ orderIdentifier, companyId }) => {
  const prisma = getSharedPrismaClient();
  const order = await prisma.order.findFirst({
    where: {
      companyId,
      OR: [
        { id: orderIdentifier },
        { orderNumber: orderIdentifier }
      ]
    },
    select: {
      id: true,
      orderNumber: true,
      status: true
    }
  });

  if (!order) {
    return null;
  }

  if (!isTrashOrderStatus(order.status)) {
    throw createBulkOrderError('Order must be in trash before permanent deletion');
  }

  await prisma.$transaction(async (tx) => {
    console.log("TX TYPE:", typeof tx, tx?.constructor?.name);
    console.log("orderNote:", !!tx?.orderNote, "affiliateReferral:", !!tx?.affiliateReferral, "walletTransaction:", !!tx?.walletTransaction);
    await tx.orderNote.deleteMany({ where: { orderId: order.id } });

    await tx.affiliateReferral.updateMany({
      where: { orderId: order.id },
      data: { orderId: null }
    });

    await tx.whatsAppNotificationLog.updateMany({
      where: { orderId: order.id },
      data: { orderId: null }
    });

    await tx.walletTransaction.updateMany({
      where: { orderId: order.id },
      data: { orderId: null }
    });

    await tx.customerJourney.updateMany({
      where: { orderId: order.id },
      data: { orderId: null }
    });

    await tx.order.delete({ where: { id: order.id } });
  });

  return { orderType: 'regular', order };
};

const permanentlyDeleteGuestOrder = async ({ orderIdentifier, companyId }) => {
  const prisma = getSharedPrismaClient();
  const guestOrder = await prisma.guestOrder.findFirst({
    where: {
      companyId,
      OR: [
        { id: orderIdentifier },
        { orderNumber: orderIdentifier }
      ]
    },
    select: {
      id: true,
      orderNumber: true,
      status: true
    }
  });

  if (!guestOrder) {
    return null;
  }

  if (!isTrashOrderStatus(guestOrder.status)) {
    throw createBulkOrderError('Order must be in trash before permanent deletion');
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderNote.deleteMany({ where: { guestOrderId: guestOrder.id } });
    await tx.guestOrder.delete({ where: { id: guestOrder.id } });
  });

  return { orderType: 'guest', order: guestOrder };
};

const permanentlyDeleteAnyOrder = async ({ orderIdentifier, companyId }) => {
  const regularDeleteResult = await permanentlyDeleteRegularOrder({
    orderIdentifier,
    companyId
  });

  if (regularDeleteResult) {
    return regularDeleteResult;
  }

  const guestDeleteResult = await permanentlyDeleteGuestOrder({
    orderIdentifier,
    companyId
  });

  if (guestDeleteResult) {
    return guestDeleteResult;
  }

  throw createBulkOrderError('Order not found', 404);
};

// الحصول على الطلبات غير المكتملة (مسودات الشيك آوت)
router.get('/incomplete', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يجب تسجيل الدخول'
      });
    }

    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = (req.query.status || 'all').toString().toLowerCase();
    const search = (req.query.search || '').toString().trim();
    const now = new Date();

    let lostAfterHours = 24;
    try {
      const settings = await orderService.getOrderSettings(companyId);
      const parsed = parseInt(settings?.incompleteOrderLostAfterHours, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        lostAfterHours = parsed;
      }
    } catch (settingsError) {
      console.warn('⚠️ [ORDERS] Failed to load incomplete order settings:', settingsError.message);
    }

    const lostThreshold = new Date(now.getTime() - lostAfterHours * 60 * 60 * 1000);

    const whereClause = {
      companyId,
    };

    const andClauses = [];

    if (status === 'active' || status === 'incomplete') {
      andClauses.push({
        OR: [
          { checkoutUpdatedAt: { gte: lostThreshold } },
          { checkoutStartedAt: { gte: lostThreshold } },
          { updatedAt: { gte: lostThreshold } }
        ]
      });
    } else if (status === 'expired' || status === 'lost') {
      andClauses.push({
        OR: [
          { checkoutUpdatedAt: { lt: lostThreshold } },
          { checkoutStartedAt: { lt: lostThreshold } },
          { updatedAt: { lt: lostThreshold } }
        ]
      });
    }

    if (search) {
      andClauses.push({
        OR: [
          { cartId: { contains: search } },
          { checkoutData: { contains: search } }
        ]
      });
    }

    if (andClauses.length) {
      whereClause.AND = andClauses;
    }

    const [totalCount, carts] = await Promise.all([
      getSharedPrismaClient().guestCart.count({ where: whereClause }),
      getSharedPrismaClient().guestCart.findMany({
        where: whereClause,
        orderBy: [
          { checkoutUpdatedAt: 'desc' },
          { checkoutStartedAt: 'desc' },
          { updatedAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    const data = carts.map((cart) => {
      let items = [];
      try {
        items = cart.items
          ? (typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items)
          : [];
      } catch (e) {
        items = [];
      }

      let checkoutData = {};
      try {
        checkoutData = cart.checkoutData
          ? (typeof cart.checkoutData === 'string' ? JSON.parse(cart.checkoutData) : cart.checkoutData)
          : {};
      } catch (e) {
        checkoutData = {};
      }

      const total = typeof cart.total === 'string'
        ? parseFloat(cart.total) || 0
        : Number(cart.total || 0);

      const lastActivity = cart.checkoutUpdatedAt || cart.checkoutStartedAt || cart.updatedAt;
      const isLost = lastActivity ? new Date(lastActivity) < lostThreshold : false;

      return {
        cartId: cart.cartId,
        items,
        itemsCount: Array.isArray(items) ? items.length : 0,
        total,
        checkoutData,
        checkoutStartedAt: cart.checkoutStartedAt,
        checkoutUpdatedAt: cart.checkoutUpdatedAt,
        updatedAt: cart.updatedAt,
        expiresAt: cart.expiresAt,
        status: isLost ? 'lost' : 'incomplete'
      };
    });

    res.json({
      success: true,
      data,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching incomplete orders:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الطلبات غير المكتملة',
      error: error.message
    });
  }
});

// تفاصيل طلب غير مكتمل واحد
router.get('/incomplete/:cartId', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يجب تسجيل الدخول'
      });
    }

    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب'
      });
    }

    const cartId = (req.params.cartId || '').toString().trim();
    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: 'معرف السلة مطلوب'
      });
    }

    let lostAfterHours = 24;
    try {
      const settings = await orderService.getOrderSettings(companyId);
      const parsed = parseInt(settings?.incompleteOrderLostAfterHours, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        lostAfterHours = parsed;
      }
    } catch (settingsError) {
      console.warn('⚠️ [ORDERS] Failed to load incomplete order settings:', settingsError.message);
    }

    const now = new Date();
    const lostThreshold = new Date(now.getTime() - lostAfterHours * 60 * 60 * 1000);

    const cart = await getSharedPrismaClient().guestCart.findFirst({
      where: {
        companyId,
        cartId
      }
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }

    let items = [];
    try {
      items = cart.items
        ? (typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items)
        : [];
    } catch (e) {
      items = [];
    }

    let checkoutData = {};
    try {
      checkoutData = cart.checkoutData
        ? (typeof cart.checkoutData === 'string' ? JSON.parse(cart.checkoutData) : cart.checkoutData)
        : {};
    } catch (e) {
      checkoutData = {};
    }

    const total = typeof cart.total === 'string'
      ? parseFloat(cart.total) || 0
      : Number(cart.total || 0);

    const lastActivity = cart.checkoutUpdatedAt || cart.checkoutStartedAt || cart.updatedAt;
    const isLost = lastActivity ? new Date(lastActivity) < lostThreshold : false;

    res.json({
      success: true,
      data: {
        cartId: cart.cartId,
        items,
        itemsCount: Array.isArray(items) ? items.length : 0,
        total,
        checkoutData,
        checkoutStartedAt: cart.checkoutStartedAt,
        checkoutUpdatedAt: cart.checkoutUpdatedAt,
        updatedAt: cart.updatedAt,
        expiresAt: cart.expiresAt,
        status: isLost ? 'lost' : 'incomplete'
      }
    });
  } catch (error) {
    console.error('❌ Error fetching incomplete order details:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل الطلب غير المكتمل',
      error: error.message
    });
  }
});

// الحصول على الطلبات البسيطة
// الحصول على الطلبات البسيطة (مع Pagination & Filtering)
router.get('/simple', verifyToken.authenticateToken, async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    // التأكد من وجود req.user و companyId (verifyToken.authenticateToken يجب أن يضمن ذلك)
    if (!req.user) {
      console.error(`[ORDERS] /simple - req.user is null/undefined`);
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يجب تسجيل الدخول'
      });
    }

    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;

    // Debug logging (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ORDERS] /simple request - req.user:`, req.user ? { id: req.user.id, email: req.user.email, companyId: req.user.companyId, role: req.user.role } : 'null');
      console.log(`[ORDERS] /simple request - companyId:`, companyId, 'merchantId:', merchant?.id || null);
    }

    if (!companyId) {
      console.error(`[ORDERS] /simple - Missing companyId. req.user:`, req.user);
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب',
        debug: process.env.NODE_ENV !== 'production' ? {
          hasUser: !!req.user,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          companyId: req.user?.companyId
        } : undefined
      });
    }

    const orderDetailFeatureAccess = await getOrderDetailFeatureAccess(companyId);

    // استخراج معاملات الفلترة والصفحات
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const paymentStatus = req.query.paymentStatus;
    const sourceType = req.query.sourceType;
    const search = req.query.search;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const onlyUnseen = req.query.onlyUnseen === 'true';
    const requestedMerchantId = normalizeOrderRouteCode(req.query.merchantId) === 'ALL'
      ? ''
      : String(req.query.merchantId || '').trim();
    const requestedFulfillmentSource = normalizeOrderRouteCode(req.query.fulfillmentSource);
    const requestedMerchantOperationStatus = normalizeOrderRouteCode(req.query.merchantOperationStatus);
    const requestedMerchantSettlementStatus = normalizeOrderRouteCode(req.query.merchantSettlementStatus);

    // "Fetch Top N" Strategy:
    // لجلب الصفحة رقم P، نحتاج لجلب أول (P * limit) عنصر من الجدولين
    // ثم دمجهم، ترتيبهم، وأخذ الشريحة المناسبة.
    // تحسين: إذا كانت الصفحة الأولى، لا نحتاج لجلب أكثر من limit لكل جدول.
    const fetchLimit = Math.max(limit, (page * limit) + limit);

    // Log only in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📦 [ORDERS] Fetching page ${page} (limit ${limit}) for company: ${companyId}`);
    }

    // بناء شروط البحث (Where Clause)
    const whereClause = { companyId };
    const guestWhereClause = { companyId };
    const appendAnd = (clause, condition) => {
      if (!condition) return;
      if (!clause.AND) clause.AND = [];
      clause.AND.push(condition);
    };

    const duplicateSettings = await orderService.getDuplicateSettings(companyId);

    addMerchantOrderScope(whereClause, merchant);
    disableGuestOrderScope(guestWhereClause, merchant);

    // 🕵️ Affiliate Filtering Logic
    let affiliateId = req.query.affiliateId;

    // 🔒 Security: If user is an AFFILIATE, enforce their own affiliateId
    if (req.user.role === 'AFFILIATE') {
      const affiliate = await getSharedPrismaClient().affiliate.findUnique({
        where: { userId: req.user.id }
      });
      if (affiliate) {
        affiliateId = affiliate.id;
      } else {
        // If user is affiliate role but no affiliate profile, return empty
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page, limit, pages: 0 }
        });
      }
    }

    if (affiliateId) {
      whereClause.affiliateId = affiliateId;
      guestWhereClause.affiliateId = affiliateId;
    }

    // Filter by Creator (if specified)
    if (req.query.createdBy) {
      whereClause.createdBy = req.query.createdBy;
      // Guest orders don't have createdBy field in schema yet, but if they did:
      // guestWhereClause.createdBy = req.query.createdBy; 
    }

    console.log('🔍 [ORDERS-GET] Filters:', {
      role: req.user.role,
      userId: req.user.id,
      affiliateIdArg: req.query.affiliateId,
      createdByArg: req.query.createdBy,
      resolvedAffiliateId: affiliateId,
      merchantId: merchant?.id || null,
      requestedMerchantId,
      requestedFulfillmentSource,
      requestedMerchantOperationStatus,
      requestedMerchantSettlementStatus,
      whereClause
    });

    const merchantOrderFilterConditions = [];
    const commissionFilterConditions = [];
    const queueMerchantOrderFilter = (condition) => {
      if (condition) merchantOrderFilterConditions.push(condition);
    };
    const queueCommissionFilter = (condition) => {
      if (condition) commissionFilterConditions.push(condition);
    };

    if (!merchant && requestedMerchantId) {
      queueMerchantOrderFilter({ merchantId: requestedMerchantId });
    }

    if (MERCHANT_FULFILLMENT_SOURCES.has(requestedFulfillmentSource)) {
      queueMerchantOrderFilter({ fulfillmentSource: requestedFulfillmentSource });
    }

    if (MERCHANT_OPERATION_FILTERS.has(requestedMerchantOperationStatus)) {
      queueMerchantOrderFilter(
        buildMerchantOperationWhere(requestedMerchantOperationStatus)
      );
    }

    if (MERCHANT_SETTLEMENT_FILTERS.has(requestedMerchantSettlementStatus)) {
      switch (requestedMerchantSettlementStatus) {
        case 'PAID':
          queueCommissionFilter({
            merchantId: { not: null },
            status: 'PAID',
            ...(requestedMerchantId ? { merchantId: requestedMerchantId } : {})
          });
          break;
        case 'PAYABLE':
        case 'PENDING':
          queueCommissionFilter({
            merchantId: { not: null },
            status: { in: ['CONFIRMED', 'PENDING'] },
            ...(requestedMerchantId ? { merchantId: requestedMerchantId } : {})
          });
          break;
        case 'NOT_PAYABLE':
          queueMerchantOrderFilter(
            buildMerchantOperationWhere('NOT_DELIVERED')
          );
          break;
        default:
          break;
      }
    }

    if (merchantOrderFilterConditions.length > 0) {
      appendMerchantOrderFilter(whereClause, guestWhereClause, {
        AND: merchantOrderFilterConditions
      });
    }

    if (commissionFilterConditions.length > 0) {
      appendCommissionFilter(whereClause, guestWhereClause, {
        AND: commissionFilterConditions
      });
    }

    // 0. Filter by Viewed Status
    if (onlyUnseen) {
      whereClause.isViewed = false;
      guestWhereClause.isViewed = false;
    }

    // 1. Filter by Status
    if (status && status !== 'all') {
      const normalizedStatus = String(status);
      whereClause.status = normalizedStatus.toUpperCase();
      guestWhereClause.status = {
        in: [normalizedStatus.toUpperCase(), normalizedStatus.toLowerCase()]
      };
    } else {
      whereClause.status = getVisibleRegularOrderStatusesFilter(duplicateSettings);
      guestWhereClause.status = getVisibleGuestOrderStatusesFilter(duplicateSettings);
    }

    // 2. Filter by Payment Status
    if (paymentStatus && paymentStatus !== 'all') {
      const normalizedPaymentStatus = String(paymentStatus).toUpperCase();
      whereClause.paymentStatus = normalizedPaymentStatus;
      // Guest orders do not persist a payment-status field in the current Prisma client,
      // so including them in filtered payment views produces misleading results.
      appendAnd(guestWhereClause, {
        id: '__guest_orders_do_not_support_payment_status_filter__'
      });
    }

    // 3. Filter by Date Range
    if (startDate || endDate) {
      whereClause.createdAt = {};
      guestWhereClause.createdAt = {};

      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
        guestWhereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
        guestWhereClause.createdAt.lte = end;
      }
    }

    // 4. Search (Complex because it spans multiple fields)
    if (search) {
      const searchTerms = String(search).trim();
      const words = searchTerms.split(/\s+/).filter(Boolean);

      // Helper function to generate variations of Egypt/generic phone numbers to match stored phone format in database
      const getPhoneVariations = (input) => {
        const clean = input.replace(/\D/g, '');
        if (!clean) return [];
        const variations = new Set([clean, input]);
        if (clean.startsWith('0') && clean.length === 11) {
          const withoutZero = clean.slice(1);
          variations.add(withoutZero);
          variations.add('+20' + withoutZero);
          variations.add('20' + withoutZero);
        } else if (clean.startsWith('20') && clean.length === 12) {
          const withoutPrefix = clean.slice(2);
          variations.add(withoutPrefix);
          variations.add('0' + withoutPrefix);
          variations.add('+' + clean);
        } else if (clean.startsWith('1') && clean.length === 10) {
          variations.add('0' + clean);
          variations.add('+20' + clean);
          variations.add('20' + clean);
        } else if (clean.length >= 7) {
          if (clean.startsWith('0')) {
            variations.add(clean.slice(1));
          } else {
            variations.add('0' + clean);
          }
        }
        return Array.from(variations);
      };

      const phoneVariations = getPhoneVariations(searchTerms);

      // Base fields that we search with "contains" for regular orders
      const regularOrFields = [
        { orderNumber: { contains: searchTerms, mode: 'insensitive' } },
        { customerEmail: { contains: searchTerms, mode: 'insensitive' } }
      ];

      // Add phone variations to regular orders
      phoneVariations.forEach(val => {
        regularOrFields.push({ customerPhone: { contains: val, mode: 'insensitive' } });
        regularOrFields.push({ customer: { phone: { contains: val, mode: 'insensitive' } } });
      });

      // Name search logic for regular orders
      if (words.length > 0) {
        if (words.length === 1) {
          regularOrFields.push({ customerName: { contains: words[0], mode: 'insensitive' } });
          regularOrFields.push({ customer: { firstName: { contains: words[0], mode: 'insensitive' } } });
          regularOrFields.push({ customer: { lastName: { contains: words[0], mode: 'insensitive' } } });
        } else {
          // Check if customerName matches full search terms
          regularOrFields.push({ customerName: { contains: searchTerms, mode: 'insensitive' } });
          
          if (words.length === 2) {
            // First name matches first word, last name matches second word
            regularOrFields.push({
              AND: [
                { customer: { firstName: { contains: words[0], mode: 'insensitive' } } },
                { customer: { lastName: { contains: words[1], mode: 'insensitive' } } }
              ]
            });
            // Reverse name matches
            regularOrFields.push({
              AND: [
                { customer: { firstName: { contains: words[1], mode: 'insensitive' } } },
                { customer: { lastName: { contains: words[0], mode: 'insensitive' } } }
              ]
            });
          } else {
            // 3+ words: check first word against firstName, remaining words against lastName
            const firstWord = words[0];
            const remainingWords = words.slice(1).join(' ');
            regularOrFields.push({
              AND: [
                { customer: { firstName: { contains: firstWord, mode: 'insensitive' } } },
                { customer: { lastName: { contains: remainingWords, mode: 'insensitive' } } }
              ]
            });
          }
        }
      }

      // Merge search into whereClause
      Object.assign(whereClause, { OR: regularOrFields });

      // Base fields for guest orders
      const guestOrFields = [
        { orderNumber: { contains: searchTerms, mode: 'insensitive' } },
        { guestEmail: { contains: searchTerms, mode: 'insensitive' } }
      ];

      // Add phone variations to guest orders
      phoneVariations.forEach(val => {
        guestOrFields.push({ guestPhone: { contains: val, mode: 'insensitive' } });
      });

      // Name search logic for guest orders
      if (words.length > 0) {
        guestOrFields.push({ guestName: { contains: searchTerms, mode: 'insensitive' } });
        if (words.length > 1) {
          guestOrFields.push({
            AND: words.map(word => ({ guestName: { contains: word, mode: 'insensitive' } }))
          });
        }
      }

      Object.assign(guestWhereClause, { OR: guestOrFields });
    }

    // 5. Filter by Source Type (مصدر الطلب)
    if (sourceType) {
      const normalizedSource = String(sourceType).toLowerCase();
      let regularSourceCondition = null;
      let guestSourceCondition = null;

      switch (normalizedSource) {
        case 'manual':
          regularSourceCondition = {
            OR: [
              { extractionMethod: { startsWith: 'manual' } },
              { extractionMethod: { in: ['manual_order_modal', 'manual_admin'] } },
              { sourceType: 'manual' },
              { createdBy: { not: null } },
              { createdByName: { not: null } },
              { conversationId: 'manual' }
            ]
          };
          guestSourceCondition = { id: '__none__' };
          break;
        case 'ai_conversation':
          regularSourceCondition = {
            AND: [
              { sourceType: 'ai_conversation' },
              { NOT: { extractionMethod: { startsWith: 'manual' } } },
              { NOT: { extractionMethod: 'manual_admin' } },
              { NOT: { extractionMethod: 'manual_order_modal' } },
              { NOT: { conversationId: 'manual' } }
            ]
          };
          guestSourceCondition = { id: '__none__' };
          break;
        case 'storefront':
          regularSourceCondition = {
            OR: [
              { sourceType: 'storefront' },
              { metadata: { contains: '"source":"storefront"' } },
              { metadata: { contains: 'storefront', mode: 'insensitive' } }
            ]
          };
          // Guest orders are storefront by default
          break;
        case 'woocommerce':
          regularSourceCondition = {
            OR: [
              { sourceType: { in: ['woocommerce', 'woocommerce_webhook', 'woo'] } },
              { wooCommerceId: { not: null } },
              { syncedFromWoo: true }
            ]
          };
          guestSourceCondition = { id: '__none__' };
          break;
        case 'pos':
          regularSourceCondition = {
            OR: [
              { sourceType: 'pos' },
              { metadata: { contains: 'pos_terminal', mode: 'insensitive' } }
            ]
          };
          guestSourceCondition = { id: '__none__' };
          break;
        case 'api':
          regularSourceCondition = {
            OR: [
              { sourceType: { in: ['api', 'public_api'] } },
              { metadata: { contains: '"source":"api"' } },
              { metadata: { contains: 'api', mode: 'insensitive' } }
            ]
          };
          guestSourceCondition = { id: '__none__' };
          break;
        case 'import':
          regularSourceCondition = {
            OR: [
              { extractionMethod: 'import' },
              { sourceType: { in: ['import', 'easy-orders', 'internal_import'] } },
              { orderSource: 'INTERNAL_IMPORT' }
            ]
          };
          guestSourceCondition = { id: '__none__' };
          break;
        case 'unknown':
          regularSourceCondition = {
            OR: [
              { sourceType: null },
              { sourceType: 'unknown' }
            ]
          };
          guestSourceCondition = { id: '__none__' };
          break;
        default:
          regularSourceCondition = { sourceType: normalizedSource };
          guestSourceCondition = { id: '__none__' };
      }

      appendAnd(whereClause, regularSourceCondition);
      appendAnd(guestWhereClause, guestSourceCondition);
    }

    // تنفيذ الاستعلامات (Top N)
    // Debug: Log query structure before execution (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ORDERS-DEBUG] Query structure:', JSON.stringify({
        where: whereClause,
        take: fetchLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          orderItems: { include: { product: { select: { id: true, name: true, images: true } } } },
          conversation: { select: { id: true, channel: true } }
        }
      }, null, 2));
    }

    const [regularOrders, guestOrders, totalRegular, totalGuest] = await Promise.all([
      // Fetch Regular Orders
      getSharedPrismaClient().order.findMany({
        where: whereClause,
        take: fetchLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true }
          },
          orderItems: {
            include: {
              product: { select: { id: true, name: true, images: true } }
            }
          },
          conversation: { select: { id: true, channel: true } },
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          affiliate: {
            select: {
              id: true,
              affiliateCode: true,
              status: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          commissions: {
            select: {
              id: true,
              affiliateId: true,
              merchantId: true,
              type: true,
              amount: true,
              status: true,
              payoutId: true,
              merchantPayoutId: true
            }
          },
          ...buildScopedMerchantOrderInclude(merchant)
        }
      }),
      // Fetch Guest Orders
      getSharedPrismaClient().guestOrder.findMany({
        where: guestWhereClause,
        take: fetchLimit,
        orderBy: { createdAt: 'desc' }
      }),
      // Count Total Regular (for pagination metadata)
      getSharedPrismaClient().order.count({ where: whereClause }),
      // Count Total Guest (for pagination metadata)
      getSharedPrismaClient().guestOrder.count({ where: guestWhereClause })
    ]);

    let shadowedGuestOrderNumberSet = new Set();
    let shadowedGuestTotal = 0;

    if (totalGuest > 0) {
      const filteredGuestOrderNumberRows = await getSharedPrismaClient().guestOrder.findMany({
        where: guestWhereClause,
        distinct: ['orderNumber'],
        select: {
          orderNumber: true
        }
      });

      const filteredGuestOrderNumbers = filteredGuestOrderNumberRows
        .map((order) => (typeof order.orderNumber === 'string' ? order.orderNumber.trim() : ''))
        .filter(Boolean);

      if (filteredGuestOrderNumbers.length > 0) {
        shadowedGuestOrderNumberSet = new Set(
          (
            await getSharedPrismaClient().order.findMany({
              where: {
                companyId,
                orderNumber: { in: filteredGuestOrderNumbers }
              },
              distinct: ['orderNumber'],
              select: {
                orderNumber: true
              }
            })
          ).map((order) => order.orderNumber)
        );

        if (shadowedGuestOrderNumberSet.size > 0) {
          shadowedGuestTotal = await getSharedPrismaClient().guestOrder.count({
            where: {
              AND: [
                guestWhereClause,
                {
                  orderNumber: {
                    in: Array.from(shadowedGuestOrderNumberSet)
                  }
                }
              ]
            }
          });
        }
      }
    }

    const guestShippingZones =
      guestOrders.length > 0 && guestOrders.some((order) => toSafeOrderAmount(order.shippingCost) <= 0)
        ? await getSharedPrismaClient().shippingZone.findMany({
            where: {
              companyId,
              isActive: true
            }
          })
        : [];

    console.log(`📦 [ORDERS] Found ${regularOrders.length} regular, ${guestOrders.length} guest (Top ${fetchLimit})`);

    // Debug: Log items for first few orders BEFORE mapping
    if (regularOrders.length > 0) {
      const firstOrder = regularOrders[0];
      console.log(`🔍 [ORDERS-DEBUG] First order BEFORE mapping:`, {
        orderNumber: firstOrder.orderNumber,
        orderId: firstOrder.id,
        itemsCount: firstOrder.orderItems ? firstOrder.orderItems.length : 0,
        firstItem: firstOrder.orderItems?.[0] || null
      });

      // Also check if items exist in database for this order
      const itemsCount = await getSharedPrismaClient().orderItem.count({
        where: { orderId: firstOrder.id }
      });
      console.log(`🔍 [ORDERS-DEBUG] Items count in database for order ${firstOrder.orderNumber}:`, itemsCount);
    }

    // تحويل البيانات (Mapping)
    const formattedRegularOrders = regularOrders.map(order => {
      const merchantOrderScope = serializeMerchantOrderScope(order.merchantOrders?.[0], order);
      const orderMetadata = safeParseOrderMetadata(order.metadata);
      let shippingAddress = order.shippingAddress || '';
      try {
        if (typeof shippingAddress === 'string' && shippingAddress.startsWith('{')) {
          shippingAddress = JSON.parse(shippingAddress);
        }
      } catch (e) { }

      // PRIORITY: Use order.customerName from WooCommerce first
      // This ensures each order shows the actual customer name from WooCommerce
      let finalCustomerName = '';

      // First: Try order.customerName (from WooCommerce)
      if (order.customerName && order.customerName.trim()) {
        finalCustomerName = order.customerName.trim();
      }
      // Second: Fallback to Customer relation if customerName is empty
      else if (order.customer) {
        const firstName = order.customer.firstName || '';
        const lastName = order.customer.lastName || '';
        finalCustomerName = `${firstName} ${lastName}`.trim();
      }
      // Final fallback: empty string
      else {
        finalCustomerName = '';
      }

      // Debug logging for all orders to help diagnose the issue
      const orderIndex = regularOrders.indexOf(order);
      if (orderIndex < 5) {
        console.log(`📦 [ORDER-API] Order #${orderIndex + 1} - ${order.orderNumber}:`, {
          hasCustomer: !!order.customer,
          customerId: order.customerId,
          customerFirstName: order.customer?.firstName || 'N/A',
          customerLastName: order.customer?.lastName || 'N/A',
          storedCustomerName: order.customerName || 'N/A',
          finalCustomerName: finalCustomerName || 'EMPTY'
        });
      }

      // Debug: Log items for first few orders
      if (regularOrders.indexOf(order) < 3) {
        console.log(`📦 [ORDER-ITEMS] Order ${order.orderNumber}:`, {
          hasItems: !!order.orderItems,
          itemsIsArray: Array.isArray(order.orderItems),
          itemsLength: order.orderItems?.length || 0,
          firstItem: order.orderItems?.[0] ? {
            id: order.orderItems[0].id,
            productId: order.orderItems[0].productId,
            hasProduct: !!order.orderItems[0].product,
            productName: order.orderItems[0].product?.name,
            price: order.orderItems[0].price,
            quantity: order.orderItems[0].quantity
          } : null
        });
      }

      return applyOrderDetailFeatureAccess({
        id: order.orderNumber,
        orderNumber: order.orderNumber,
        customerName: finalCustomerName,
        customerPhone: order.customer?.phone || order.customerPhone || '',
        customerEmail: order.customer?.email || order.customerEmail || '',
        customerAddress: order.customerAddress || '',
        city: order.city || '',
        governorate: order.governorate || '',
        total: order.total,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        status: (order.status || 'PENDING').toLowerCase(),
        paymentStatus: (order.paymentStatus || 'PENDING').toLowerCase(),
        paymentMethod: (order.paymentMethod || 'CASH').toLowerCase().replace('_', '_on_'),
        shippingAddress: shippingAddress,
        items: Array.isArray(order.orderItems) && order.orderItems.length > 0 ? order.orderItems.map(item => {
          const parsedMetadata = JSON.parse(item.metadata || '{}');
          return {
            id: item.id,
            productId: item.productId,
            name: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            productName: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            price: item.price,
            quantity: item.quantity,
            total: item.total,
            metadata: {
              ...parsedMetadata,
              color: item.productColor || parsedMetadata.color || parsedMetadata.productColor,
              size: item.productSize || parsedMetadata.size || parsedMetadata.productSize
            }
          };
        }) : [],
        trackingNumber: order.trackingNumber,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        metadata: merchantOrderScope
          ? {
              ...orderMetadata,
              merchantOrder: merchantOrderScope,
              merchantScope: {
                merchantId: merchantOrderScope.merchantId,
                fulfillmentSource: merchantOrderScope.fulfillmentSource
              }
            }
          : orderMetadata,
        merchantOrder: merchantOrderScope || undefined,
        isViewed: order.isViewed ?? false,
        sourceType: order.sourceType || 'unknown',
        extractionMethod: order.extractionMethod || 'unknown',
        orderSource: order.orderSource || 'REGULAR',
        conversationId: order.conversationId,
        conversation: order.conversation,
        affiliateId: order.affiliateId,
        affiliate: order.affiliate,
        createdBy: order.createdBy,
        createdByName: order.createdByName,
        createdByUser: order.createdByUser
      }, orderDetailFeatureAccess, { isMerchant: Boolean(merchant) });
    });

    const formattedGuestOrders = guestOrders.map(order => {
      const guestAmounts = resolveGuestOrderAmounts(order, guestShippingZones);
      let items = order.items || [];
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }

      let shippingAddress = order.shippingAddress || {};
      if (typeof shippingAddress === 'string') {
        try { shippingAddress = JSON.parse(shippingAddress); } catch (e) { shippingAddress = {}; }
      }

      let metadata = { source: 'storefront', isGuestOrder: true };
      if (typeof order.metadata === 'string' && order.metadata.trim()) {
        try {
          const parsedMetadata = JSON.parse(order.metadata);
          if (parsedMetadata && typeof parsedMetadata === 'object' && !Array.isArray(parsedMetadata)) {
            metadata = {
              ...metadata,
              ...parsedMetadata
            };
          }
        } catch (e) {
          // Keep fallback metadata when stored JSON is malformed
        }
      }

      return applyOrderDetailFeatureAccess({
        id: order.orderNumber,
        orderNumber: order.orderNumber,
        customerName: order.guestName || '',
        customerPhone: order.guestPhone || '',
        customerEmail: order.guestEmail || '',
        total: guestAmounts.total,
        subtotal: guestAmounts.subtotal,
        tax: 0,
        shipping: guestAmounts.shipping,
        status: order.status?.toLowerCase() || 'pending',
        paymentStatus: order.paymentStatus?.toLowerCase() || 'unavailable',
        paymentMethod: order.paymentMethod?.toLowerCase() || 'cash_on_delivery',
        shippingAddress: shippingAddress,
        items: Array.isArray(items) ? items.map(item => ({
          id: item.id || item.productId || '',
          productId: item.productId || item.id || '',
          name: item.name || item.productName || '',
          price: item.price || 0,
          quantity: item.quantity || 1,
          total: (item.price || 0) * (item.quantity || 1),
          sku: item.sku || item.productSku || '',
          color: item.color || item.productColor || '',
          size: item.size || item.productSize || '',
          image: item.image || item.productImage || '',
          metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {}
        })) : [],
        trackingNumber: null,
        notes: order.notes || '',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        metadata,
        isViewed: order.isViewed ?? false
      }, orderDetailFeatureAccess, { isMerchant: false });
    });

    const regularOrderNumberSet = new Set([
      ...formattedRegularOrders.map(order => order.orderNumber),
      ...shadowedGuestOrderNumberSet
    ]);
    const filteredGuestOrders = formattedGuestOrders.filter(
      order => !regularOrderNumberSet.has(order.orderNumber)
    );

    if (filteredGuestOrders.length !== formattedGuestOrders.length) {
      console.log('🧹 [ORDERS] Deduped guest orders:', {
        removed: formattedGuestOrders.length - filteredGuestOrders.length,
        remaining: filteredGuestOrders.length,
        shadowedByRegularOrders: shadowedGuestOrderNumberSet.size
      });
    }

    // دمج وترتيب (Merge & Sort)
    const allFetchedOrders = [...formattedRegularOrders, ...filteredGuestOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // تطبيق Pagination (Slice)
    // بما أننا جلبنا Top N، فالصفحة المطلوبة هي آخر (limit) عنصر في المصفوفة المدمجة
    // ولكن يجب أن نأخذ في الاعتبار الـ offset
    // الـ offset الحقيقي في المصفوفة المدمجة هو (page - 1) * limit
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = allFetchedOrders.slice(startIndex, endIndex);

    const totalOrders = Math.max(totalRegular + totalGuest - shadowedGuestTotal, 0);

    console.log(`📊 [ORDERS] Returning ${paginatedOrders.length} orders (Page ${page}/${Math.ceil(totalOrders / limit)})`);

    res.json({
      success: true,
      data: paginatedOrders,
      pagination: {
        total: totalOrders,
        page: page,
        limit: limit,
        pages: Math.ceil(totalOrders / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching simple orders:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الطلبات',
      error: error.message
    });
  }
});

router.get('/preparation/queue', verifyToken.authenticateToken, async (req, res) => {
  try {
    const payload = await preparationQueueService.getPreparationQueue({
      user: req.user,
      query: req.query
    });

    res.json(payload);
  } catch (error) {
    console.error('❌ Error fetching preparation orders:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'خطأ في جلب قائمة تجهيز الطلبات',
      error: error.message
    });
  }
});

// إحصائيات الطلبات البسيطة
router.get('/simple/stats', verifyToken.authenticateToken, async (req, res) => {
  try {
    // ✅ الحصول على companyId من المستخدم المصادق عليه
    const companyId = req.user?.companyId || null;

    // ✅ الحصول على معاملات التاريخ (dateFrom و dateTo)
    const { dateFrom, dateTo } = req.query;

    console.log(`📊 [ORDERS-STATS] Request from user:`, {
      userId: req.user?.id,
      email: req.user?.email,
      companyId: companyId,
      dateFrom,
      dateTo
    });

    if (!companyId) {
      console.error('❌ [ORDERS-STATS] No companyId found in request');
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const stats = await simpleOrderService.getSimpleStats(companyId, dateFrom || null, dateTo || null);

    console.log(`✅ [ORDERS-STATS] Stats sent for companyId: ${companyId}`, {
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      dateFrom,
      dateTo
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching simple stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
});

// تحديث حالة الطلب البسيط
router.post('/simple/:orderNumber/status', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status, notes } = req.body;

    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [ORDER-STATUS-UPDATE] Request received:', {
        orderNumber,
        hasUser: !!req.user,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        userObject: req.user
      });
    }

    const initialCompanyId = req.user?.companyId || req.user?.effectiveCompanyId;

    if (!initialCompanyId) {
      console.error('❌ [ORDER-STATUS-UPDATE] Missing companyId:', {
        hasUser: !!req.user,
        user: req.user
      });
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب',
        debug: process.env.NODE_ENV !== 'production' ? {
          hasUser: !!req.user,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          companyId: req.user?.companyId,
          effectiveCompanyId: req.user?.effectiveCompanyId
        } : undefined
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'حالة الطلب مطلوبة'
      });
    }

    // 🔧 Use OrderService for proper auto-shipping logic
    console.log('🔧 [ORDER-STATUS-UPDATE] Using OrderService for proper Turbo integration...');

    const userId = req.user?.id;
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';
    const statusUpper = String(status || '').trim().toUpperCase();
    const statusNotes = normalizeStatusNote(notes);

    if (isCancellationStatus(statusUpper) && !statusNotes) {
      return res.status(400).json({
        success: false,
        message: getCancellationReasonError()
      });
    }
    const PREPARATION_ONLY_STATUSES = new Set([
      'PENDING_PREPARATION',
      'PREPARING',
      'QUALITY_CHECK',
      'PACKAGED',
      'READY_TO_SHIP',
      'STOCK_SHORTAGE',
      'PENDING_STOCK',
      'ON_HOLD_STOCK'
    ]);
    const parseOrderMetadata = (rawMetadata) => {
      if (!rawMetadata) return {};
      if (typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)) {
        return { ...rawMetadata };
      }
      if (typeof rawMetadata === 'string') {
        try {
          const parsed = JSON.parse(rawMetadata);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
          }
        } catch (error) {
          return {};
        }
      }
      return {};
    };
    const getMappedRegularOrderStatus = (preparationStatus) =>
      ['PENDING_PREPARATION', 'STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK'].includes(preparationStatus)
        ? 'CONFIRMED'
        : 'PROCESSING';

    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || initialCompanyId;
    
    // 🚀 SPEED OPTIMIZATION: Fetch order once with necessary relations
    const order = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      },
      include: {
        company: { include: { orderWorkflowConfig: true } },
        customer: true,
        orderItems: true,
        ...(merchant
          ? {
              merchantOrders: {
                where: { merchantId: merchant.id },
                select: {
                  id: true,
                  status: true,
                  fulfillmentSource: true,
                  warehouseId: true,
                  trackingNumber: true,
                  merchantOrderId: true,
                  notes: true
                }
              }
            }
          : {})
      }
    });

    let scopedMerchantOrder = null;

    if (order) {
      if (merchant) {
        const merchantOrder = order.merchantOrders?.[0];
        if (!merchantOrder) {
          return res.status(404).json({
            success: false,
            message: 'هذا الطلب غير مسند لهذا التاجر'
          });
        }

        if (String(merchantOrder.fulfillmentSource || '').toUpperCase() !== 'MERCHANT') {
          return res.status(403).json({
            success: false,
            message: 'الشركة هي المسؤولة عن تجهيز هذا الطلب، أدوات التجهيز غير متاحة للتاجر'
          });
        }
        scopedMerchantOrder = merchantOrder;
      }

      if (PREPARATION_ONLY_STATUSES.has(statusUpper)) {
        const currentMetadata = parseOrderMetadata(order.metadata);
        const previousPreparationStatus =
          typeof currentMetadata.preparationStatus === 'string'
            ? currentMetadata.preparationStatus
            : order.status;
        const mappedStatus = getMappedRegularOrderStatus(statusUpper);
        const nextMetadata = {
          ...currentMetadata,
          preparationStatus: statusUpper,
          preparationStatusUpdatedAt: new Date().toISOString()
        };

        const updatedRegularOrder = await getSharedPrismaClient().order.update({
          where: { id: order.id },
          data: {
            status: mappedStatus,
            notes: statusNotes || undefined,
            metadata: JSON.stringify(nextMetadata),
            statusHistory: {
              create: {
                status: statusUpper,
                oldStatus: previousPreparationStatus,
                reason: statusNotes || 'Preparation queue update',
                changedBy: userId,
                userName
              }
            },
            updatedAt: new Date()
          }
        });

        return res.json({
          success: true,
          message: 'تم تحديث حالة التجهيز بنجاح',
          data: {
            orderType: 'regular',
            orderNumber,
            status: updatedRegularOrder.status,
            preparationStatus: statusUpper
          }
        });
      }

      const updatedOrder = await orderService.setCompanyId(companyId).updateOrderStatus(
        orderNumber,
        companyId,
        statusUpper,
        statusNotes,
        userId,
        userName,
        order,
        req.body.isOverride || false
      );

      if (updatedOrder?.workflowStatus === 'pending') {
        return res.json({
          success: true,
          message: 'تم تقديم طلب تغيير الحالة للمراجعة.',
          data: {
            orderType: 'regular',
            orderNumber,
            workflowStatus: 'pending',
            requestId: updatedOrder.workflowRequestId
          }
        });
      }

      if (merchant && scopedMerchantOrder) {
        await syncMerchantOrderStatusFromOrder({
          merchantOrder: scopedMerchantOrder,
          status: statusUpper,
          notes: statusNotes
        });
      }

      return res.json({
        success: true,
        message: 'تم تحديث حالة الطلب بنجاح',
        data: {
          orderType: 'regular',
          orderNumber,
          status: updatedOrder.status,
          turboShipmentId: updatedOrder.turboShipmentId,
          turboTrackingNumber: updatedOrder.turboTrackingNumber
        }
      });
    }

    if (merchant) {
      return res.status(404).json({
        success: false,
        message: 'هذا الطلب غير مسند لهذا التاجر'
      });
    }

    const guestOrder = await getSharedPrismaClient().guestOrder.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (!guestOrder) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }

    const updatedGuestOrder = await orderService.updateGuestOrderStatus(
      orderNumber,
      companyId,
      statusUpper,
      statusNotes,
      userId,
      userName,
      guestOrder
    );

    return res.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      data: {
        orderType: 'guest',
        orderNumber,
        status: updatedGuestOrder.status
      }
    });

  } catch (error) {
    console.error('❌ Error updating simple order status:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode && error.statusCode < 500 ? error.message : 'خطأ في تحديث حالة الطلب',
      error: error.message
    });
  }
});

// تسجيل محاولة اتصال
router.post('/simple/:orderNumber/call-attempt', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { notes, result } = req.body;
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const order = await getSharedPrismaClient().order.findFirst({
      where: {
        AND: [
          {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber: orderNumber, companyId }
            ]
          },
          ...(merchant
            ? [{
                merchantOrders: {
                  some: { merchantId: merchant.id }
                }
              }]
            : [])
        ]
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    const [log, updatedOrder] = await getSharedPrismaClient().$transaction([
      getSharedPrismaClient().callAttemptLog.create({
        data: {
          orderId: order.id,
          userId,
          notes,
          result
        }
      }),
      getSharedPrismaClient().order.update({
        where: { id: order.id },
        data: {
          callAttempts: { increment: 1 },
          lastCallAttemptAt: new Date()
        }
      })
    ]);

    res.json({
      success: true,
      message: 'تم تسجيل محاولة الاتصال بنجاح',
      data: {
        callAttempts: updatedOrder.callAttempts,
        lastCallAttemptAt: updatedOrder.lastCallAttemptAt
      }
    });
  } catch (error) {
    console.error('Error logging call attempt:', error);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل محاولة الاتصال' });
  }
});

// تعليم الطلب كمقروء
router.post('/simple/:orderNumber/viewed', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const order = await getSharedPrismaClient().order.findFirst({
      where: {
        AND: [
          {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber: orderNumber, companyId }
            ]
          },
          ...(merchant
            ? [{
                merchantOrders: {
                  some: { merchantId: merchant.id }
                }
              }]
            : [])
        ]
      }
    });

    if (order) {
      await getSharedPrismaClient().order.update({
        where: { id: order.id },
        data: { isViewed: true }
      });
      return res.json({ success: true, message: 'تم تعليم الطلب كمقروء' });
    }

    if (merchant) {
      return res.status(404).json({
        success: false,
        message: 'هذا الطلب غير مسند لهذا التاجر'
      });
    }

    const guestOrder = await getSharedPrismaClient().guestOrder.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (guestOrder) {
      await getSharedPrismaClient().guestOrder.update({
        where: { id: guestOrder.id },
        data: { isViewed: true }
      });
      return res.json({ success: true, message: 'تم تعليم الطلب كمقروء' });
    }

    return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

  } catch (error) {
    console.error('Error marking order as viewed:', error);
    res.status(500).json({ success: false, message: 'خطأ في العملية' });
  }
});

// جلب عدد الطلبات الجديدة غير المقروءة
router.get('/simple/new-count', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const excludedStatuses = ['DRAFT', 'TRASH', 'DUPLICATE_ORDER'];

    const [orderCount, guestOrderCount] = await Promise.all([
      getSharedPrismaClient().order.count({
        where: {
          companyId,
          isViewed: false,
          status: { notIn: excludedStatuses }
        }
      }),
      getSharedPrismaClient().guestOrder.count({
        where: {
          companyId,
          isViewed: false
        }
      })
    ]);

    const totalNew = orderCount + guestOrderCount;

    res.json({
      success: true,
      data: {
        count: totalNew,
        orders: orderCount,
        guestOrders: guestOrderCount
      }
    });
  } catch (error) {
    console.error('Error fetching new orders count:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب عدد الطلبات الجديدة' });
  }
});

// جلب قائمة الطلبات الجديدة غير المقروءة
router.get('/simple/new-list', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const excludedStatuses = ['DRAFT', 'TRASH', 'DUPLICATE_ORDER'];

    const [orders, guestOrders] = await Promise.all([
      getSharedPrismaClient().order.findMany({
        where: {
          companyId,
          isViewed: false,
          status: { notIn: excludedStatuses }
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          total: true,
          status: true,
          createdAt: true,
          isViewed: true
        }
      }),
      getSharedPrismaClient().guestOrder.findMany({
        where: {
          companyId,
          isViewed: false
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          guestName: true,
          guestPhone: true,
          total: true,
          status: true,
          createdAt: true,
          isViewed: true
        }
      })
    ]);

    const mappedOrders = orders.map(o => ({
      ...o,
      type: 'ORDER',
      displayName: o.customerName || '',
      displayTotal: o.total || 0
    }));

    const mappedGuestOrders = guestOrders.map(o => ({
      ...o,
      type: 'GUEST_ORDER',
      customerName: o.guestName,
      customerPhone: o.guestPhone,
      displayName: o.guestName || '',
      displayTotal: o.total || 0
    }));

    const combined = [...mappedOrders, ...mappedGuestOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    res.json({
      success: true,
      data: combined,
      total: combined.length
    });
  } catch (error) {
    console.error('Error fetching new orders list:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب قائمة الطلبات الجديدة' });
  }
});

// تعليم كل الطلبات كمقروءة
router.post('/simple/mark-all-viewed', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const excludedStatuses = ['DRAFT', 'TRASH', 'DUPLICATE_ORDER'];

    const [orderResult, guestOrderResult] = await Promise.all([
      getSharedPrismaClient().order.updateMany({
        where: {
          companyId,
          isViewed: false,
          status: { notIn: excludedStatuses }
        },
        data: { isViewed: true }
      }),
      getSharedPrismaClient().guestOrder.updateMany({
        where: {
          companyId,
          isViewed: false
        },
        data: { isViewed: true }
      })
    ]);

    const totalUpdated = (orderResult.count || 0) + (guestOrderResult.count || 0);

    res.json({
      success: true,
      message: `تم تعليم ${totalUpdated} طلب كمقروء`,
      data: { updated: totalUpdated }
    });
  } catch (error) {
    console.error('Error marking all orders as viewed:', error);
    res.status(500).json({ success: false, message: 'خطأ في تعليم الطلبات كمقروءة' });
  }
});

// تحديث حالة الدفع للطلب البسيط
router.post('/simple/:orderNumber/payment-status', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { paymentStatus, notes } = req.body;

    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [PAYMENT-STATUS-UPDATE] Request received:', {
        orderNumber,
        hasUser: !!req.user,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        userObject: req.user
      });
    }

    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;

    if (!companyId) {
      console.error('❌ [PAYMENT-STATUS-UPDATE] Missing companyId:', {
        hasUser: !!req.user,
        user: req.user
      });
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب',
        debug: process.env.NODE_ENV !== 'production' ? {
          hasUser: !!req.user,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          companyId: req.user?.companyId
        } : undefined
      });
    }

    if (isMerchantUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'صلاحيات التاجر لا تسمح بتعديل حالة الدفع من شاشة الطلبات'
      });
    }

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'حالة الدفع مطلوبة'
      });
    }

    // 1. Try Regular Order (search by id OR orderNumber)
    const existingRegularOrder = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (existingRegularOrder) {
      const userId = req.user?.id;
      const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';

      await getSharedPrismaClient().order.update({
        where: { id: existingRegularOrder.id },
        data: {
          paymentStatus: paymentStatus.toUpperCase(),
          notes: notes || undefined,
          updatedAt: new Date(),
          statusHistory: {
            create: {
              status: existingRegularOrder.status, // Keep same status
              oldStatus: existingRegularOrder.status,
              reason: `Payment Update: ${paymentStatus.toUpperCase()}${notes ? ' - ' + notes : ''}`,
              changedBy: userId,
              userName: userName
            }
          }
        }
      });

      if (paymentStatus.toUpperCase() === 'COMPLETED') {
        try {
          await cashbackService.applyCashbackForPaidOrder({
            orderId: existingRegularOrder.id,
            companyId,
            changedBy: userId
          });
        } catch (e) {
          console.error('❌ [CASHBACK] Failed to apply cashback for paid order:', {
            orderId: existingRegularOrder.id,
            companyId,
            error: e?.message
          });
        }
      }

      console.log(`✅ [PAYMENT-STATUS-UPDATE] Updated regular order: ${orderNumber}`);
      return res.json({
        success: true,
        message: 'تم تحديث حالة الدفع بنجاح',
        data: { orderType: 'regular', orderNumber, paymentStatus: paymentStatus.toUpperCase() }
      });
    }

    // 2. Try Guest Order (search by id OR orderNumber)
    const existingGuestOrder = await getSharedPrismaClient().guestOrder.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (existingGuestOrder) {
      return res.status(400).json({
        success: false,
        message: 'حالة الدفع غير متاحة حالياً لطلبات الضيوف'
      });
    }

    // If neither order type found
    return res.status(404).json({
      success: false,
      message: 'الطلب غير موجود'
    });

    const orderType = regularOrder.count > 0 ? 'regular' : 'guest';
    console.log(`✅ [PAYMENT-STATUS-UPDATE] Updated ${orderType} order: ${orderNumber}`);

    res.json({
      success: true,
      message: 'تم تحديث حالة الدفع بنجاح',
      data: { orderType, orderNumber, paymentStatus: paymentStatus.toUpperCase() }
    });

  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الدفع',
      error: error.message
    });
  }
});

// الحصول على جميع الطلبات
router.get('/', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customerId } = req.query;
    const skip = (page - 1) * limit;

    // التأكد من وجود companyId من المستخدم المصادق عليه
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const where = { companyId }; // فلترة بـ companyId
    const duplicateSettings = await orderService.getDuplicateSettings(companyId);
    if (status) where.status = status;
    else where.status = getVisibleRegularOrderStatusesFilter(duplicateSettings);
    if (customerId) where.customerId = customerId;
    if (req.query.onlyUnseen === 'true') where.isViewed = false;

    const orders = await getSharedPrismaClient().order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          },
        },
        conversation: {
          select: {
            id: true,
            channel: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    // Ensure where clause includes companyId for security
    if (!where.companyId && req.user?.companyId) {
      where.companyId = req.user.companyId;
    }
    // Security: Ensure company isolation for order count
    if (!where.companyId) {
      if (!req.user?.companyId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      where.companyId = req.user.companyId;
    }
    const total = await getSharedPrismaClient().order.count({ where });

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الطلبات',
      error: error.message
    });
  }
});

// إضافة ملاحظة للطلب
router.post('/simple/:orderNumber/notes', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { content } = req.body;
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'محتوى الملاحظة مطلوب' });
    }

    // 1. Try to find regular order by id OR orderNumber
    const regularOrder = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (regularOrder) {
      const note = await getSharedPrismaClient().orderNote.create({
        data: {
          id: uuidv4(),
          orderId: regularOrder.id,
          authorId: userId,
          authorName: userName,
          content: content.trim(),
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      console.log(`✅ [ORDER-NOTE] Added note to regular order: ${orderNumber}`);
      return res.json({ success: true, data: note });
    }

    // 2. Try guest order
    const guestOrder = await getSharedPrismaClient().guestOrder.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (guestOrder) {
      const note = await getSharedPrismaClient().orderNote.create({
        data: {
          id: uuidv4(),
          guestOrderId: guestOrder.id,
          authorId: userId,
          authorName: userName,
          content: content.trim(),
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      console.log(`✅ [ORDER-NOTE] Added note to guest order: ${orderNumber}`);
      return res.json({ success: true, data: note });
    }

    // Order not found
    return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

  } catch (error) {
    console.error('❌ Error adding note:', error);
    res.status(500).json({ success: false, message: 'خطأ في إضافة الملاحظة', error: error.message });
  }
});

// تعديل ملاحظة طلب
router.patch('/simple/notes/:noteId', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content } = req.body;
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'محتوى الملاحظة مطلوب' });
    }

    // Find the note with its order/guestOrder to verify company ownership
    const existingNote = await getSharedPrismaClient().orderNote.findUnique({
      where: { id: noteId },
      include: {
        order: { select: { companyId: true } },
        guestOrder: { select: { companyId: true } },
      }
    });

    if (!existingNote) {
      return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    }

    // Verify company ownership through related order or guestOrder
    const noteCompanyId = existingNote.order?.companyId || existingNote.guestOrder?.companyId;
    if (!noteCompanyId || noteCompanyId !== companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - الملاحظة لا تنتمي لشركتك' });
    }

    // Permission check: only the author or admins can edit
    if (existingNote.authorId !== userId && userRole !== 'COMPANY_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'يمكنك تعديل ملاحظاتك فقط' });
    }

    const updatedNote = await getSharedPrismaClient().orderNote.update({
      where: { id: noteId },
      data: { content: content.trim() },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        }
      }
    });

    console.log(`✅ [ORDER-NOTE] Updated note: ${noteId}`);
    return res.json({ success: true, data: updatedNote });

  } catch (error) {
    console.error('❌ Error updating note:', error);
    res.status(500).json({ success: false, message: 'خطأ في تعديل الملاحظة', error: error.message });
  }
});

// حذف ملاحظة طلب
router.delete('/simple/notes/:noteId', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    // Find the note with its order/guestOrder to verify company ownership
    const existingNote = await getSharedPrismaClient().orderNote.findUnique({
      where: { id: noteId },
      include: {
        order: { select: { companyId: true } },
        guestOrder: { select: { companyId: true } },
      }
    });

    if (!existingNote) {
      return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    }

    // Verify company ownership through related order or guestOrder
    const noteCompanyId = existingNote.order?.companyId || existingNote.guestOrder?.companyId;
    if (!noteCompanyId || noteCompanyId !== companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - الملاحظة لا تنتمي لشركتك' });
    }

    // Permission check: only the author or admins can delete
    if (existingNote.authorId !== userId && userRole !== 'COMPANY_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'يمكنك حذف ملاحظاتك فقط' });
    }

    await getSharedPrismaClient().orderNote.delete({ where: { id: noteId } });

    console.log(`✅ [ORDER-NOTE] Deleted note: ${noteId}`);
    return res.json({ success: true, message: 'تم حذف الملاحظة بنجاح' });

  } catch (error) {
    console.error('❌ Error deleting note:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف الملاحظة', error: error.message });
  }
});

// الحصول على طلب بسيط محدد بالرقم
router.get('/simple/:orderNumber', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;

    // التأكد من وجود req.user (verifyToken.authenticateToken يجب أن يضمن ذلك)
    if (!req.user) {
      console.error('❌ [ORDER-DETAIL] req.user is null/undefined');
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يجب تسجيل الدخول'
      });
    }

    // Debug logging (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [ORDER-DETAIL] Request for order:', orderNumber);
      console.log('🔍 [ORDER-DETAIL] req.user:', { id: req.user.id, email: req.user.email, companyId: req.user.companyId });
    }

    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;

    if (!companyId) {
      console.error('❌ [ORDER-DETAIL] Missing companyId!', {
        user: req.user,
        hasUser: !!req.user,
        orderNumber
      });
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب',
        debug: process.env.NODE_ENV !== 'production' ? {
          hasUser: !!req.user,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          companyId: req.user?.companyId
        } : undefined
      });
    }

    const orderDetailFeatureAccess = await getOrderDetailFeatureAccess(companyId);

    console.log('🔍 [ORDER-DETAIL] Searching for order:', {
      orderNumber,
      companyId,
      merchantId: merchant?.id || null
    });

    // Debug: Log query structure before execution (development only)
    if (process.env.NODE_ENV !== 'production') {
      const queryStructure = {
        where: { orderNumber, companyId },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true
                }
              }
            }
          },
          conversation: {
            select: {
              id: true,
              channel: true
            }
          }
        }
      };
      // console.log('[ORDER-DETAIL-DEBUG] Query structure:', JSON.stringify(queryStructure, null, 2));
    }

    // Try to find regular order first (search by id OR orderNumber)
    let order = await getSharedPrismaClient().order.findFirst({
      where: {
        AND: [
          {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber: orderNumber, companyId }
            ]
          },
          ...(merchant
            ? [{
                merchantOrders: {
                  some: { merchantId: merchant.id }
                }
              }]
            : [])
        ]
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        orderItems: {
          select: {
            id: true,
            productId: true,
            productName: true,
            productColor: true,  // ✅ FIX: Include color
            productSize: true,   // ✅ FIX: Include size
            productSku: true,    // ✅ FIX: Include SKU
            productDetails: true, // ✅ FIX: Include details
            price: true,
            quantity: true,
            total: true,
            metadata: true,
            productVariant: {
              select: {
                id: true,
                name: true,  // ✅ Correct: Variant name (e.g. "Red / L")
                type: true,  // ✅ Correct: Variant type
                sku: true,
                metadata: true // ✅ Correct: JSON metadata
              }
            },
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          }
        },
        conversation: {
          select: {
            id: true,
            channel: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        affiliate: {
          select: {
            id: true,
            affiliateCode: true,
            status: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        commissions: {
          select: {
            id: true,
            affiliateId: true,
            merchantId: true,
            type: true,
            amount: true,
            status: true,
            payoutId: true,
            merchantPayoutId: true
          }
        },
        statusHistory: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        orderNotes: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        ...buildScopedMerchantOrderInclude(merchant)
      }
    });

    let isGuestOrder = false;
    let guestOrder = null;

    // If not found, try guest order
    if (!order) {
      if (merchant) {
        return res.status(404).json({
          success: false,
          message: 'هذا الطلب غير مسند لهذا التاجر'
        });
      }

      console.log('🔍 [ORDER-DETAIL] Regular order not found, trying guest order...');
      guestOrder = await getSharedPrismaClient().guestOrder.findFirst({
        where: {
          OR: [
            { id: orderNumber, companyId },
            { orderNumber: orderNumber, companyId }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          affiliate: {
            select: {
              id: true,
              affiliateCode: true,
              status: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          orderNotes: { // ✅ FIX: GuestOrder uses orderNotes (camelCase)
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          OrderStatusHistory: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (guestOrder) {
        isGuestOrder = true;
        console.log('✅ [ORDER-DETAIL] Found guest order:', orderNumber);
      }
    }

    // If neither found, return 404
    if (!order && !guestOrder) {
      console.error('❌ [ORDER-DETAIL] Order not found:', {
        orderNumber,
        companyId,
        searchedRegular: true,
        searchedGuest: true
      });
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود',
        orderNumber,
        companyId
      });
    }

    // Debug: Log items for regular order
    if (order) {
      console.log(`🔍 [ORDER-DETAIL] Regular order found:`, {
        orderNumber: order.orderNumber,
        orderId: order.id,
        hasItems: !!order.orderItems,
        itemsIsArray: Array.isArray(order.orderItems),
        itemsLength: order.orderItems?.length || 0,
        firstItem: order.orderItems?.[0] ? {
          id: order.orderItems[0].id,
          productId: order.orderItems[0].productId,
          productName: order.orderItems[0].productName,
          hasProduct: !!order.orderItems[0].product,
          productNameFromProduct: order.orderItems[0].product?.name,
          variantData: order.orderItems[0].productVariant, // Inspect variant data
          variantId: order.orderItems[0].variantId
        } : null
      });

      // Also check if items exist in database for this order
      const itemsCount = await getSharedPrismaClient().orderItem.count({
        where: { orderId: order.id }
      });
      console.log(`🔍 [ORDER-DETAIL] Items count in database for order ${order.orderNumber}:`, itemsCount);
      console.log(`📝 [ORDER-DETAIL] Notes found:`, order.orderNotes?.length || 0); // DEBUG LOG
    }

    const prisma = getSharedPrismaClient();
    const fetchUser = async (userId) => {
      if (!userId) return null;
      return prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true }
      });
    };

    let formattedOrder;

    if (isGuestOrder && guestOrder) {
      const guestShippingZones =
        toSafeOrderAmount(guestOrder.shippingCost) > 0
          ? []
          : await prisma.shippingZone.findMany({
              where: {
                companyId,
                isActive: true
              }
            });
      const guestAmounts = resolveGuestOrderAmounts(guestOrder, guestShippingZones);
      const guestAssignment = await prisma.orderAssignment.findFirst({
        where: { guestOrderId: guestOrder.id, isActive: true },
        orderBy: { assignedAt: 'desc' }
      });
      const guestConfirmLog = (guestOrder.OrderStatusHistory || []).find(
        (entry) => String(entry.status || '').toLowerCase() === 'confirmed'
      );
      const guestAssignedToId = guestAssignment?.assignedTo || null;
      const guestAssignedById = guestAssignment?.assignedBy || null;
      const guestConfirmedById = guestConfirmLog?.changedBy || null;
      const guestAssignedToUser = await fetchUser(guestAssignedToId);
      const guestAssignedByUser = await fetchUser(guestAssignedById);
      const guestConfirmedByUser = await fetchUser(guestConfirmedById);

      // Format guest order
      let items = guestOrder.items || [];
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }

      let shippingAddress = guestOrder.shippingAddress || {};
      if (typeof shippingAddress === 'string') {
        try { shippingAddress = JSON.parse(shippingAddress); } catch (e) { shippingAddress = {}; }
      }

      // ✅ FIX: Batch-fetch all missing variant details in ONE query (avoid N+1)
      const validItems = Array.isArray(items) ? items : [];
      const missingVariantIds = validItems
        .filter(item => {
          const color = item.productColor || item.color || (item.metadata && item.metadata.color) || '';
          const size = item.productSize || item.size || (item.metadata && item.metadata.size) || '';
          const details = item.productDetails || item.details || (item.metadata && item.metadata.details) || '';
          return (!color || !size || !details) && item.variantId;
        })
        .map(item => item.variantId);

      let variantMap = new Map();
      if (missingVariantIds.length > 0) {
        const variants = await getSharedPrismaClient().productVariant.findMany({
          where: { id: { in: missingVariantIds } },
          select: { id: true, name: true, metadata: true }
        });
        variantMap = new Map(variants.map(v => [v.id, v]));
      }

      formattedOrder = {
        id: guestOrder.orderNumber,
        orderNumber: guestOrder.orderNumber,
        customerId: null,
        customerName: guestOrder.guestName || '',
        customerPhone: guestOrder.guestPhone || '',
        customerEmail: guestOrder.guestEmail || '',
        customerAddress: typeof shippingAddress === 'object' ? (shippingAddress.address || shippingAddress.street || '') : '',
        city: typeof shippingAddress === 'object' ? (shippingAddress.city || '') : '',
        total: guestAmounts.total,
        subtotal: guestAmounts.subtotal,
        tax: 0,
        shipping: guestAmounts.shipping,
        status: guestOrder.status?.toLowerCase() || 'pending',
        paymentStatus: 'unavailable',
        paymentMethod: guestOrder.paymentMethod?.toLowerCase() || 'cash_on_delivery',
        shippingAddress: shippingAddress,
        items: validItems.map((item) => {
          let color = item.productColor || item.color || (item.metadata && item.metadata.color) || '';
          let size = item.productSize || item.size || (item.metadata && item.metadata.size) || '';
          let details = item.productDetails || item.details || (item.metadata && item.metadata.details) || '';

          const variant = (!color || !size || !details) && item.variantId ? variantMap.get(item.variantId) : null;
          if (variant) {
            if (!color) color = variant.color || '';
            if (!size) size = variant.size || '';

            if ((!color || !size || !details) && variant.metadata) {
              try {
                const metadata = typeof variant.metadata === 'string'
                  ? JSON.parse(variant.metadata)
                  : variant.metadata;

                if (metadata && metadata.attributeValues) {
                  const AR_COLOR = '\u0627\u0644\u0644\u0648\u0646';
                  const AR_SIZE = '\u0627\u0644\u0645\u0642\u0627\u0633';
                  const AR_DETAILS = '\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644';
                  if (!color) color = metadata.attributeValues[AR_COLOR] || metadata.attributeValues['color'] || metadata.attributeValues['Color'] || '';
                  if (!size) size = metadata.attributeValues[AR_SIZE] || metadata.attributeValues['size'] || metadata.attributeValues['Size'] || '';
                  if (!details) details = metadata.attributeValues[AR_DETAILS] || metadata.attributeValues['details'] || metadata.attributeValues['Details'] || '';
                }
              } catch (e) {
                // Ignore parse error
              }
            }

            if ((!color || !size) && variant.name && variant.name.includes('-')) {
              const parts = variant.name.split('-').map(p => p.trim());
              if (parts.length >= 2) {
                if (!color && isNaN(parts[0])) color = parts[0];
                if (!size) size = parts[parts.length - 1];
              }
            }
          }

          return {
            id: item.productId || item.id || '',
            productId: item.productId || '',
            productName: item.name || item.productName || 'منتج غير محدد',
            name: item.name || item.productName || 'منتج غير محدد',
            productColor: color,
            productSize: size,
            productDetails: details,
            productImage: item.image || (item.metadata && (item.metadata.image || item.metadata.productImage)) || '',
            price: item.price || 0,
            quantity: item.quantity || 1,
            total: (item.price || 0) * (item.quantity || 1),
            metadata: {
              ...(item.metadata || {}),
              color: color,
              size: size,
              details: details,
              image: item.image || (item.metadata && (item.metadata.image || item.metadata.productImage)) || ''
            }
          };
        }),
        trackingNumber: null,
        notes: guestOrder.notes || '',
        createdAt: guestOrder.createdAt,
        updatedAt: guestOrder.updatedAt,
        isViewed: guestOrder.isViewed ?? false,
        metadata: { source: 'storefront', isGuestOrder: true },
        // ✅ Turbo Shipping Fields - Get from GuestOrder
        turboShipmentId: guestOrder.turboShipmentId || null,
        turboTrackingNumber: guestOrder.turboTrackingNumber || null,
        turboShipmentStatus: guestOrder.turboShipmentStatus || null,
        turboLabelUrl: guestOrder.turboLabelUrl || null,
        turboMetadata: guestOrder.turboMetadata || null,
        createdBy: guestOrder.createdBy || null,
        createdByName: guestOrder.createdByName || null,
        createdByUser: guestOrder.user || null,
        confirmedAt: guestConfirmLog?.createdAt || null,
        confirmedBy: guestConfirmedById,
        confirmedByUser: guestConfirmedByUser,
        confirmationNotes: guestConfirmLog?.reason || null,
        assignedTo: guestAssignedToId,
        assignedBy: guestAssignedById,
        assignedAt: guestAssignment?.assignedAt || null,
        assignmentStrategy: guestAssignment?.strategy || null,
        assignedToUser: guestAssignedToUser,
        assignedByUser: guestAssignedByUser,
        orderNotes: guestOrder.orderNotes || [],
        statusHistory: guestOrder.OrderStatusHistory || []
      };

      console.log('📦 [ORDER-DETAIL] GuestOrder Turbo fields:', {
        turboShipmentId: formattedOrder.turboShipmentId,
        turboTrackingNumber: formattedOrder.turboTrackingNumber,
        turboShipmentStatus: formattedOrder.turboShipmentStatus,
        turboLabelUrl: formattedOrder.turboLabelUrl,
        turboMetadata: formattedOrder.turboMetadata ? 'exists' : 'null'
      });
    } else {
      const merchantOrderScope = serializeMerchantOrderScope(order.merchantOrders?.[0], order);
      const orderMetadata = safeParseOrderMetadata(order.metadata);
      const orderAssignment = await prisma.orderAssignment.findFirst({
        where: { orderId: order.id, isActive: true },
        orderBy: { assignedAt: 'desc' }
      });
      const confirmedById = order.confirmedBy || null;
      const assignedToId = order.assignedTo || orderAssignment?.assignedTo || null;
      const assignedById = order.assignedBy || orderAssignment?.assignedBy || null;
      const confirmedByUser = await fetchUser(confirmedById);
      const assignedToUser = await fetchUser(assignedToId);
      const assignedByUser = await fetchUser(assignedById);

      // Format regular order
      // Parse shippingAddress if it's a JSON string
      let shippingAddress = order.shippingAddress || '';
      try {
        if (typeof shippingAddress === 'string' && shippingAddress.startsWith('{')) {
          shippingAddress = JSON.parse(shippingAddress);
        }
      } catch (e) {
        // Keep as string if parsing fails
      }

      // تحويل البيانات للصيغة المتوافقة مع الـ frontend
      // PRIORITY: Use order.customerName from WooCommerce first
      let finalCustomerName = '';

      // First: Try order.customerName (from WooCommerce)
      if (order.customerName && order.customerName.trim()) {
        finalCustomerName = order.customerName.trim();
      }
      // Second: Fallback to Customer relation if customerName is empty
      else if (order.customer) {
        const firstName = order.customer.firstName || '';
        const lastName = order.customer.lastName || '';
        finalCustomerName = `${firstName} ${lastName}`.trim();
      }
      // Final fallback: empty string
      else {
        finalCustomerName = '';
      }

      formattedOrder = {
        id: order.orderNumber,
        orderNumber: order.orderNumber,
        customerId: order.customerId || order.customer?.id || null,
        customerName: finalCustomerName,
        customerPhone: order.customerPhone || order.customer?.phone || '',
        customerEmail: order.customerEmail || order.customer?.email || '',
        customerAddress: order.customerAddress || '',
        city: order.city || '',
        governorate: order.governorate || '',
        alternativePhone: orderMetadata.alternativePhone || '',
        total: order.total,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        status: (order.status || 'PENDING').toLowerCase(),
        paymentStatus: (order.paymentStatus || 'PENDING').toLowerCase(),
        paymentMethod: (order.paymentMethod || 'CASH').toLowerCase().replace('_', '_on_'),
        shippingAddress: shippingAddress,
        items: order.orderItems.map(item => {
          const parsedMetadata = JSON.parse(item.metadata || '{}');
          return {
            id: item.id,
            productId: item.productId,
            name: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            productName: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            // ✅ FIX: Add productColor, productSize, and productDetails directly for frontend
            productColor: item.productColor || parsedMetadata.color || parsedMetadata.productColor || parsedMetadata.originalData?.productColor || '',
            productSize: item.productSize || parsedMetadata.size || parsedMetadata.productSize || parsedMetadata.originalData?.productSize || '',
            productDetails: item.productDetails || parsedMetadata.details || parsedMetadata.productDetails || '',
            productImage: (() => {
              if (item.product?.images) {
                try {
                  const images = typeof item.product.images === 'string' ? JSON.parse(item.product.images) : item.product.images;
                  return Array.isArray(images) ? images[0] : null;
                } catch (e) { return null; }
              }
              return parsedMetadata.image || parsedMetadata.productImage || null;
            })(),
            price: item.price,
            quantity: item.quantity,
            total: item.total,
            metadata: {
              ...parsedMetadata,
              color: item.productColor || parsedMetadata.color || parsedMetadata.productColor,
              size: item.productSize || parsedMetadata.size || parsedMetadata.productSize,
              details: item.productDetails || parsedMetadata.details || parsedMetadata.productDetails,
              image: item.product?.images ? (typeof item.product.images === 'string' ? JSON.parse(item.product.images)[0] : item.product.images[0]) : (parsedMetadata.image || parsedMetadata.productImage)
            }
          };
        }),
        trackingNumber: order.trackingNumber,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        isViewed: order.isViewed ?? false,
        metadata: merchantOrderScope
          ? {
              ...orderMetadata,
              merchantOrder: merchantOrderScope,
              merchantScope: {
                merchantId: merchantOrderScope.merchantId || merchant?.id || null,
                fulfillmentSource: merchantOrderScope.fulfillmentSource
              }
            }
          : orderMetadata,
        merchantOrder: merchantOrderScope || undefined,
        // Turbo Shipping Fields
        turboShipmentId: order.turboShipmentId,
        turboTrackingNumber: order.turboTrackingNumber,
        turboShipmentStatus: order.turboShipmentStatus,
        turboLabelUrl: order.turboLabelUrl,
        turboMetadata: order.turboMetadata,
        turboBranchId: order.turboBranchId,
        // Source & Meta Fields
        sourceType: order.sourceType || 'unknown',
        extractionMethod: order.extractionMethod || 'unknown',
        orderSource: order.orderSource || 'REGULAR',
        conversationId: order.conversationId,
        conversation: order.conversation,
        affiliateId: order.affiliateId,
        affiliate: order.affiliate,
        createdBy: order.createdBy,
        createdByName: order.createdByName,
        createdByUser: order.createdByUser,
        confirmedAt: order.confirmedAt || null,
        confirmedBy: confirmedById,
        confirmedByUser: confirmedByUser,
        confirmationNotes: order.confirmationNotes || null,
        assignedTo: assignedToId,
        assignedBy: assignedById,
        assignedAt: order.assignedAt || orderAssignment?.assignedAt || null,
        assignmentStrategy: order.assignmentStrategy || orderAssignment?.strategy || null,
        assignedToUser: assignedToUser,
        assignedByUser: assignedByUser,
        // Scheduled Order Fields
        isScheduled: order.isScheduled || false,
        scheduledDeliveryDate: order.scheduledDeliveryDate || null,
        scheduledNotes: order.scheduledNotes || null,
        autoTransitionEnabled: order.autoTransitionEnabled || false,
        scheduledTransitionedAt: order.scheduledTransitionedAt || null,
        orderNotes: order.orderNotes || [],
        statusHistory: order.statusHistory || []
      };

      console.log('📦 [ORDER-DETAIL] Regular Order Turbo fields:', {
        turboShipmentId: formattedOrder.turboShipmentId,
        turboTrackingNumber: formattedOrder.turboTrackingNumber,
        turboShipmentStatus: formattedOrder.turboShipmentStatus,
        turboLabelUrl: formattedOrder.turboLabelUrl,
        turboMetadata: formattedOrder.turboMetadata ? 'exists' : 'null'
      });
    }

    const responseOrder = applyOrderDetailFeatureAccess(
      formattedOrder,
      orderDetailFeatureAccess,
      { isMerchant: Boolean(merchant) }
    );

    res.json({
      success: true,
      data: responseOrder
    });

  } catch (error) {
    console.error('❌ Error fetching simple order:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الطلب',
      error: error.message
    });
  }
});

// الحصول على طلب محدد
router.get('/:orderNumber', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await orderService.getOrderByNumber(orderNumber);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('❌ Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الطلب',
      error: error.message
    });
  }
});

// تحديث حالة الطلب
router.patch('/:orderNumber/status', verifyToken.authenticateToken, async (req, res) => {
  console.log(`🔍 [ORDERS-ROUTE-DEBUG] PATCH /:orderNumber/status called:`);
  console.log(`   - Order Number: ${req.params.orderNumber}`);
  console.log(`   - New Status: ${req.body.status}`);
  console.log(`   - Company ID: ${req.user?.companyId}`);
  console.log(`   - User: ${req.user?.firstName} ${req.user?.lastName}`);

  try {
    const { orderNumber } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      console.log(`❌ [ORDERS-ROUTE-DEBUG] Missing status`);
      return res.status(400).json({
        success: false,
        message: 'حالة الطلب مطلوبة'
      });
    }

    const normalizedStatus = String(status || '').trim().toUpperCase();
    const statusNotes = normalizeStatusNote(notes);

    if (isCancellationStatus(normalizedStatus) && !statusNotes) {
      return res.status(400).json({
        success: false,
        message: getCancellationReasonError()
      });
    }

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'WOO_TAGHEZ', 'DUPLICATE_ORDER'];
    if (!validStatuses.includes(normalizedStatus)) {
      console.log(`❌ [ORDERS-ROUTE-DEBUG] Invalid status: ${status}`);
      return res.status(400).json({
        success: false,
        message: 'حالة الطلب غير صحيحة'
      });
    }

    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // --- ADD PERMISSION CHECK ---
    const hasPermission = await checkOrderEditPermission(req, orderNumber);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتعديل أو تأكيد هذا الطلب لأنك لست من قام بتسجيله'
      });
    }
    // ----------------------------

    console.log(`📞 [ORDERS-ROUTE-DEBUG] Calling orderService.updateOrderStatus...`);
    const userId = req.user?.id;
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';
    const order = await orderService.updateOrderStatus(orderNumber, companyId, normalizedStatus, statusNotes, userId, userName);

    if (order?.workflowStatus === 'pending') {
      return res.json({
        success: true,
        message: 'تم تقديم طلب تغيير الحالة للمراجعة.',
        data: {
          workflowStatus: 'pending',
          requestId: order.workflowRequestId
        }
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      data: order
    });

  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode && error.statusCode < 500 ? error.message : 'خطأ في تحديث حالة الطلب',
      error: error.message
    });
  }
});

// تأكيد الطلب
router.post('/:orderNumber/confirm', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { shippingAddress } = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // --- ADD PERMISSION CHECK ---
    const hasPermission = await checkOrderEditPermission(req, orderNumber);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتعديل أو تأكيد هذا الطلب لأنك لست من قام بتسجيله'
      });
    }
    // ----------------------------

    const order = await orderService.confirmOrder(orderNumber, companyId, shippingAddress);

    res.json({
      success: true,
      message: 'تم تأكيد الطلب بنجاح',
      data: order
    });

  } catch (error) {
    console.error('❌ Error confirming order:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تأكيد الطلب',
      error: error.message
    });
  }
});

// إلغاء الطلب
router.post('/:orderNumber/cancel', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { reason } = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // --- ADD PERMISSION CHECK ---
    const hasPermission = await checkOrderEditPermission(req, orderNumber);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتعديل أو تأكيد هذا الطلب لأنك لست من قام بتسجيله'
      });
    }
    // ----------------------------

    const order = await orderService.cancelOrder(orderNumber, companyId, reason);

    res.json({
      success: true,
      message: 'تم إلغاء الطلب بنجاح',
      data: order
    });

  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode && error.statusCode < 500 ? error.message : 'خطأ في إلغاء الطلب',
      error: error.message
    });
  }
});

// إحصائيات الطلبات
router.get('/stats/summary', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { days = 30, companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    const stats = await orderService.getOrderStats(companyId, parseInt(days));

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات الطلبات',
      error: error.message
    });
  }
});

// طلبات العميل
router.get('/customer/:customerId', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit = 10 } = req.query;
    const compID = req.user?.companyId;
    if (!compID) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const orders = await orderService.getCustomerOrders(customerId, compID, parseInt(limit));

    res.json({
      success: true,
      data: orders
    });

  } catch (error) {
    console.error('❌ Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب طلبات العميل',
      error: error.message
    });
  }
});

// إنشاء طلب بسيط من المحادثة (باستخدام EnhancedOrderService)
router.post('/simple', verifyToken.authenticateToken, async (req, res) => {
  try {
    const EnhancedOrderService = require('../services/enhancedOrderService');
    const enhancedOrderService = new EnhancedOrderService();

    const companyId = req.user?.companyId;

    // 🔍 Check if user has an affiliate profile (regardless of role)
    let affiliateId = null;
    let orderSource = 'manual';

    console.log('🔍 [ORDER-DEBUG] Checking affiliate for userId:', req.user?.id, 'Role:', req.user?.role);

    try {
      const { getSharedPrismaClient } = require('../services/sharedDatabase');
      const affiliate = await getSharedPrismaClient().affiliate.findUnique({
        where: { userId: req.user.id }
      });

      console.log('🔍 [ORDER-DEBUG] Affiliate query result:', affiliate ? `Found ID: ${affiliate.id}` : 'Not Found');

      // Only set affiliateId if one exists AND the user explicitly wants to act as affiliate
      // OR if they are strictly an AFFILIATE role
      // For now, let's assume if they have an affiliate profile, they get the commission
      if (affiliate) {
        affiliateId = affiliate.id;
        orderSource = 'AFFILIATE_DIRECT';
        console.log('✅ [ORDER-DEBUG] Affiliate detected:', { affiliateId, userId: req.user.id, role: req.user.role });
      }
    } catch (affiliateError) {
      console.error('⚠️ [ORDER-DEBUG] Error fetching affiliate:', affiliateError);
    }

    const {
      customerId,
      conversationId,
      items,
      subtotal,
      shipping,
      total,
      city,
      customerPhone,
      shippingAddress,
      notes,
      governorate,
      address
    } = req.body;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب'
      });
    }

    // التحقق من البيانات المطلوبة
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'بيانات الطلب غير مكتملة'
      });
    }

    // ✨ Logging للبيانات المستلمة من Frontend
    console.log('🔍 [ORDER-DEBUG] Received items from Frontend:', JSON.stringify(items, null, 2));

    // تحويل items للصيغة المتوافقة مع EnhancedOrderService
    const products = items.map(item => {
      console.log(`🔍 [ORDER-DEBUG] Processing item:`, {
        productName: item.productName,
        productColor: item.productColor,
        productSize: item.productSize,
        variantId: item.variantId
      });

      return {
        productId: item.productId,
        productName: item.productName,
        productColor: item.productColor,
        productSize: item.productSize,
        price: parseFloat(item.price),
        quantity: item.quantity,
        total: parseFloat(item.total),
        variantId: item.variantId
      };
    });

    console.log('✅ [ORDER-DEBUG] Converted products:', JSON.stringify(products, null, 2));

    // تحضير بيانات الطلب بنفس صيغة خدمة الطلبات المحسنة
    const orderData = {
      companyId,
      customerId,
      conversationId,

      // معلومات المنتجات
      productName: products.map(p => p.productName).join(', '),
      productColor: products[0]?.productColor,
      productSize: products[0]?.productSize,
      productPrice: products[0]?.price,
      quantity: products.reduce((sum, p) => sum + p.quantity, 0),

      // معلومات الشحن
      customerAddress: address || shippingAddress || '',
      city: city || 'غير محدد',
      governorate: governorate || '',
      customerPhone: customerPhone || '',

      // التكاليف
      subtotal: parseFloat(subtotal) || 0,
      shipping: parseFloat(shipping) || 0,
      total: parseFloat(total) || 0,

      // ملاحظات
      notes: notes || '',

      // معلومات الاستخراج
      extractionMethod: 'manual_order_modal',
      confidence: 1.0,
      sourceType: 'manual',

      // Affiliate info
      ...(affiliateId && { affiliateId, orderSource }),

      // Creator info
      createdBy: req.user.id,
      createdByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,

      // المنتجات للحفظ في OrderItems
      products: products
    };

    console.log('📝 [ORDER-DEBUG] Final orderData:', {
      companyId,
      customerId,
      conversationId,
      itemsCount: products.length,
      total: orderData.total,
      affiliateId: orderData.affiliateId || 'NOT SET',
      orderSource: orderData.orderSource || 'NOT SET',
      firstProductColor: orderData.productColor,
      firstProductSize: orderData.productSize,
      allProducts: products.map(p => ({
        name: p.productName,
        color: p.productColor,
        size: p.productSize
      }))
    });

    // إنشاء الطلب باستخدام خدمة الطلبات المحسنة
    const result = await enhancedOrderService.createEnhancedOrder(orderData);
    await enhancedOrderService.disconnect();

    if (result.success) {
      console.log('✅ Order created successfully:', result.order.orderNumber);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الطلب بنجاح',
        data: result.order
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error creating order:', error);
    if (error.payload && error.statusCode) {
      return res.status(error.statusCode).json(error.payload);
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الطلب',
      error: error.message
    });
  }
});

// إنشاء طلب بسيط (للاختبار)
router.post('/create-simple', verifyToken.authenticateToken, async (req, res) => {
  try {
    const orderData = req.body;

    // التحقق من البيانات المطلوبة
    const requiredFields = ['productName', 'productPrice'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} مطلوب`
        });
      }
    }

    const result = await simpleOrderService.createSimpleOrder(orderData);

    // حفظ الطلب في ملف
    await simpleOrderService.saveOrderToFile(result.order);

    // 📱 إرسال إشعار WhatsApp تلقائي للطلب الجديد
    try {
      const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

      const orderForNotification = {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        companyId: req.user.companyId,
        customerPhone: result.order.customerPhone,
        customerName: result.order.customerName,
        customer: {
          firstName: result.order.customerName?.split(' ')[0] || result.order.customerName,
          phone: result.order.customerPhone
        },
        total: result.order.total,
        currency: 'EGP',
        items: result.order.items || result.order.orderItems || [] // ✅ Include items for WhatsApp notification
      };

      await WhatsAppNotificationService.sendOrderCreatedNotification(orderForNotification);
      console.log('✅ [WHATSAPP] Order notification sent for:', result.order.orderNumber);
    } catch (whatsappError) {
      console.log('⚠️ [WHATSAPP] Failed to send notification:', whatsappError.message);
    }

    res.status(201, {
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: result.order
    });

  } catch (error) {
    console.error('❌ Error creating simple order:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الطلب',
      error: error.message
    });
  }
});

// إنشاء طلب يدوي (للاختبار)
router.post('/create', verifyToken.authenticateToken, async (req, res) => {
  try {
    const orderData = req.body;

    // التحقق من البيانات المطلوبة
    const requiredFields = ['customerId', 'companyId', 'productName', 'productPrice'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} مطلوب`
        });
      }
    }

    const order = await orderService.createOrderFromConversation(orderData);

    // 📱 إرسال إشعار WhatsApp تلقائي للطلب الجديد
    try {
      const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

      const orderForNotification = {
        id: order.id,
        orderNumber: order.orderNumber,
        companyId: req.user.companyId,
        customerPhone: order.customerPhone,
        customerName: order.customerName,
        customer: {
          firstName: order.customerName?.split(' ')[0] || order.customerName,
          phone: order.customerPhone
        },
        total: order.total,
        currency: 'EGP',
        items: order.items || order.orderItems || [] // ✅ Include items for WhatsApp notification
      };

      await WhatsAppNotificationService.sendOrderCreatedNotification(orderForNotification);
      console.log('✅ [WHATSAPP] Order notification sent for:', order.orderNumber);
    } catch (whatsappError) {
      console.log('⚠️ [WHATSAPP] Failed to send notification:', whatsappError.message);
    }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: order
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    if (error.payload && error.statusCode) {
      return res.status(error.statusCode).json(error.payload);
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الطلب',
      error: error.message
    });
  }
});

// Bulk Status Update
router.post('/bulk/status', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderIds, status, notes } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Order IDs required' });
    }

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status required' });
    }

    const normalizedStatus = String(status || '').trim().toUpperCase();
    const statusNotes = normalizeStatusNote(notes);

    if (isCancellationStatus(normalizedStatus) && !statusNotes) {
      return res.status(400).json({
        success: false,
        message: getCancellationReasonError()
      });
    }

    const bulkNote = statusNotes || getBulkStatusNote(normalizedStatus);
    const results = [];
    const userId = req.user?.id;
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';

    // Update regular and guest orders through the same path so trash/restore behaves consistently.
    for (const id of orderIds) {
      try {
        const updateResult = await updateAnyOrderStatus({
          orderIdentifier: id,
          companyId,
          status: normalizedStatus,
          notes: bulkNote,
          userId,
          userName,
          options: { skipTransitionValidation: true }
        });
        results.push({ id, success: true, orderType: updateResult.orderType });
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `تم تحديث ${successCount} طلب بنجاح`,
      data: {
        totalRequested: orderIds.length,
        successCount,
        results
      }
    });

  } catch (error) {
    console.error('❌ Error bulk updating orders:', error);
    res.status(500).json({ success: false, message: 'Failed to update orders', error: error.message });
  }
});

// Bulk Delete
router.post('/bulk/delete', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderIds, permanent = false } = req.body;
    const shouldPermanentlyDelete = permanent === true || permanent === 'true';
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Order IDs required' });
    }

    const results = [];
    const userId = req.user?.id;
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';

    for (const id of orderIds) {
      try {
        if (shouldPermanentlyDelete) {
          const deleteResult = await permanentlyDeleteAnyOrder({
            orderIdentifier: id,
            companyId
          });
          results.push({ id, success: true, orderType: deleteResult.orderType, deleted: true });
        } else {
          const updateResult = await updateAnyOrderStatus({
            orderIdentifier: id,
            companyId,
            status: 'TRASH',
            notes: 'Bulk trash',
            userId,
            userName,
            options: { skipTransitionValidation: true }
          });
          results.push({ id, success: true, orderType: updateResult.orderType, movedToTrash: true });
        }
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }

    const regularCount = results.filter((result) => result.success && result.orderType === 'regular').length;
    const guestCount = results.filter((result) => result.success && result.orderType === 'guest').length;
    const successCount = regularCount + guestCount;

    res.json({
      success: true,
      message: shouldPermanentlyDelete
        ? 'Orders permanently deleted successfully'
        : 'Orders moved to trash successfully',
      data: {
        totalRequested: orderIds.length,
        successCount,
        action: shouldPermanentlyDelete ? 'permanent_delete' : 'move_to_trash',
        regularMoved: shouldPermanentlyDelete ? 0 : regularCount,
        guestMoved: shouldPermanentlyDelete ? 0 : guestCount,
        regularDeleted: shouldPermanentlyDelete ? regularCount : 0,
        guestDeleted: shouldPermanentlyDelete ? guestCount : 0,
        results
      }
    });

  } catch (error) {
    console.error('❌ Error deleting orders:', error);
    res.status(500).json({ success: false, message: 'Failed to delete orders', error: error.message });
  }
});

// Export Orders
router.get('/export', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { status, paymentStatus, search, startDate, endDate } = req.query;

    // Build Filters (Same as /simple)
    const whereClause = { companyId };
    const guestWhereClause = { companyId };
    const duplicateSettings = await orderService.getDuplicateSettings(companyId);

    if (status && status !== 'all') {
      const normalizedStatus = String(status);
      whereClause.status = normalizedStatus.toUpperCase();
      guestWhereClause.status = { in: [normalizedStatus.toUpperCase(), normalizedStatus.toLowerCase()] };
    } else {
      whereClause.status = getVisibleRegularOrderStatusesFilter(duplicateSettings);
      guestWhereClause.status = getVisibleGuestOrderStatusesFilter(duplicateSettings);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      whereClause.paymentStatus = paymentStatus.toUpperCase();
      guestWhereClause.id = '__guest_orders_do_not_support_payment_status_filter__';
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      guestWhereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
        guestWhereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
        guestWhereClause.createdAt.lte = end;
      }
    }

    if (search) {
      const searchCondition = {
        OR: [
          { orderNumber: { contains: search } },
          { customer: { firstName: { contains: search } } },
          { customer: { lastName: { contains: search } } },
          { customer: { phone: { contains: search } } }
        ]
      };
      Object.assign(whereClause, searchCondition);

      const guestSearchCondition = {
        OR: [
          { orderNumber: { contains: search } },
          { guestName: { contains: search } },
          { guestPhone: { contains: search } },
          { guestEmail: { contains: search } }
        ]
      };
      Object.assign(guestWhereClause, guestSearchCondition);
    }

    // Fetch Data with select + limit to avoid OOM on large datasets
    const EXPORT_MAX_ROWS = 5000;
    const [regularOrders, guestOrders] = await Promise.all([
      getSharedPrismaClient().order.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: EXPORT_MAX_ROWS,
        select: {
          orderNumber: true,
          createdAt: true,
          status: true,
          total: true,
          paymentStatus: true,
          customer: { select: { firstName: true, lastName: true, phone: true } }
        }
      }),
      getSharedPrismaClient().guestOrder.findMany({
        where: guestWhereClause,
        orderBy: { createdAt: 'desc' },
        take: EXPORT_MAX_ROWS,
        select: {
          orderNumber: true,
          createdAt: true,
          status: true,
          total: true,
          guestName: true,
          guestPhone: true
        }
      })
    ]);

    // Format Data for Excel
    const allOrders = [
      ...regularOrders.map(o => ({
        'Order Number': o.orderNumber,
        'Date': o.createdAt,
        'Customer Name': o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : '',
        'Phone': o.customer?.phone || '',
        'Total': o.total,
        'Status': o.status,
        'Payment Status': o.paymentStatus,
        'Type': 'Regular'
      })),
      ...guestOrders.map(o => ({
        'Order Number': o.orderNumber,
        'Date': o.createdAt,
        'Customer Name': o.guestName || '',
        'Phone': o.guestPhone || '',
        'Total': o.total,
        'Status': o.status,
        'Payment Status': 'Unavailable',
        'Type': 'Guest'
      }))
    ].sort((a, b) => new Date(b.Date) - new Date(a.Date));

    // Lazy-load heavy export libraries only when needed
    const xlsx = require('xlsx');

    // Create Workbook
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(allOrders);
    xlsx.utils.book_append_sheet(wb, ws, 'Orders');

    // Generate Buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Send Response
    res.setHeader('Content-Disposition', 'attachment; filename="orders.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('❌ Error exporting orders:', error);
    res.status(500).json({ success: false, message: 'Export failed', error: error.message });
  }
});

router.put('/simple/:orderNumber', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { shippingAddress, notes, customerName, customerPhone, alternativePhone, city, governorate, metadataPatch } = req.body;
    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;

    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // --- ADD PERMISSION CHECK ---
    const hasPermission = await checkOrderEditPermission(req, orderNumber);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتعديل أو تأكيد هذا الطلب لأنك لست من قام بتسجيله'
      });
    }
    // ----------------------------

    const result = await orderDetailsUpdateService.updateOrderDetails({
      orderIdentifier: orderNumber,
      companyId,
      input: {
        shippingAddress,
        notes,
        customerName,
        customerPhone,
        alternativePhone,
        city,
        governorate,
        metadataPatch,
      },
    });

    try {
      if (socketService?.getIO()) {
        socketService.getIO().to(`company_${companyId}`).emit('order:updated', result.socketPayload);
      }
    } catch (socketError) {
      console.error('❌ [ORDER-UPDATE] Error emitting socket update:', socketError);
    }

    // --- LOG MODIFICATION ---
    try {
      if (result.orderType === 'regular') {
        const order = await getSharedPrismaClient().order.findUnique({
          where: { id: result.orderId },
          select: { id: true, status: true }
        });
        if (order) {
          await getSharedPrismaClient().orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: order.status,
              oldStatus: order.status,
              reason: 'تعديل البيانات الأساسية للطلب',
              changedBy: req.user.id,
              userName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'النظام'
            }
          });
        }
      }
    } catch (logError) {
      console.error('❌ [ORDER-UPDATE] Error logging modification:', logError);
    }
    // ------------------------

    return res.json({ success: true, message: 'Order updated successfully' });

  } catch (error) {
    console.error('❌ [ORDER-UPDATE] Error updating order:', error);
    if (error.stack) console.error(error.stack);
    const statusCode = error.statusCode || 500;
    const message = statusCode === 400 || statusCode === 404
      ? error.message
      : 'Failed to update order';
    res.status(statusCode).json({ success: false, message, error: error.message });
  }
});

// Update Order Items
router.put('/simple/:orderNumber/items', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { items, total, subtotal, tax, shipping } = req.body;
    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;

    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });



    // ✅ Validation: Check items
    const itemsValidation = validateOrderItems(items);
    if (!itemsValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: itemsValidation.error || 'يوجد خطأ في المنتجات'
      });
    }

    // Try Regular Order (search by id OR orderNumber)
    const regularOrder = await getSharedPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber: orderNumber, companyId }
        ]
      }
    });

    if (regularOrder) {
      // Transaction: Delete old items, Create new items, Update totals
      await getSharedPrismaClient().$transaction(async (prisma) => {
        // Delete existing items
        await prisma.orderItem.deleteMany({
          where: { orderId: regularOrder.id }
        });

        // Create new items
        for (const item of items) {
          // التحقق من وجود المنتج قبل إضافته
          let validProductId = null;
          if (item.productId) {
            try {
              const product = await prisma.product.findUnique({
                where: { id: item.productId },
                select: { id: true, companyId: true }
              });

              // التأكد من أن المنتج موجود وأنه تابع لنفس الشركة
              if (product && product.companyId === companyId) {
                validProductId = item.productId;
              } else {
                console.log(`⚠️ [ORDER-UPDATE] Product ${item.productId} not found or belongs to different company, using null`);
              }
            } catch (productError) {
              console.log(`⚠️ [ORDER-UPDATE] Error checking product ${item.productId}:`, productError.message);
            }
          }

          await prisma.orderItem.create({
            data: {
              orderId: regularOrder.id,
              productId: validProductId, // null إذا لم يكن المنتج موجوداً
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              productName: item.productName || item.name || null, // ✅ FIX: Persist product details
              productColor: item.productColor || item.color || null, // ✅ FIX: Persist product details
              productSize: item.productSize || item.size || null, // ✅ FIX: Persist product details
              productDetails: item.productDetails || item.details || null, // ✅ FIX: Persist product details
              productSku: item.productSku || item.sku || null,
              metadata: JSON.stringify(item.metadata || {})
            }
          });
        }

        // Update Order Totals
        await prisma.order.update({
          where: { id: regularOrder.id },
          data: {
            total,
            subtotal,
            tax,
            shipping,
            updatedAt: new Date()
          }
        });
      }, {
        maxWait: 30000,
        timeout: 30000
      });

      // Socket Emit
      if (socketService?.getIO()) {
        socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
          orderNumber,
          total,
          shipping,
          _refetch: true
        });
      }

      // --- LOG MODIFICATION ---
      try {
        await getSharedPrismaClient().orderStatusHistory.create({
          data: {
            orderId: regularOrder.id,
            status: regularOrder.status,
            oldStatus: regularOrder.status,
            reason: 'تعديل منتجات الطلب',
            changedBy: req.user.id,
            userName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'النظام'
          }
        });
      } catch (logError) {
        console.error('❌ [ORDER-UPDATE] Error logging items modification:', logError);
      }
      // ------------------------

      return res.json({ success: true, message: 'Order items updated successfully' });
    }

    // Try Guest Order
    const guestOrder = await getSharedPrismaClient().guestOrder.findFirst({
      where: { orderNumber, companyId }
    });

    if (guestOrder) {
      const nextSubtotal = toSafeOrderAmount(subtotal);
      const nextShipping = toSafeOrderAmount(shipping);
      const nextFinalTotal = Number.isFinite(Number(total))
        ? Number(total)
        : Math.max(0, nextSubtotal + nextShipping);

      // Guest Order stores items as JSON, much easier
      await getSharedPrismaClient().guestOrder.update({
        where: { id: guestOrder.id },
        data: {
          items: JSON.stringify(items),
          total: nextSubtotal,
          shippingCost: nextShipping,
          finalTotal: nextFinalTotal,
          updatedAt: new Date()
        }
      });

      // Socket Emit
      if (socketService?.getIO()) {
        socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
          orderNumber,
          total,
          shipping,
          _refetch: true
        });
      }

      return res.json({ success: true, message: 'Order items updated successfully' });
    }

    res.status(404).json({ success: false, message: 'Order not found' });

  } catch (error) {
    console.error('❌ Error updating order items:', error);
    res.status(500).json({ success: false, message: 'Failed to update order items', error: error.message });
  }
});

module.exports = router;






