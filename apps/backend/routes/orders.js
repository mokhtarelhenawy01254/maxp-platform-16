const express = require('express');
const socketService = require('../services/socketService');
const { v4: uuidv4 } = require('uuid');
const verifyToken = require('../utils/verifyToken');
const router = express.Router();
const { checkAppAccess } = require('../middleware/checkAppAccess');

const {
  PRISMA_ORDER_STATUS_ENUM,
  PREP_FILTER_STATUSES,
  TURBO_STATUS_ALIASES,
  parseStatusFilter
} = require('../utils/orderStatusFilter');
const { EFFECTIVE_ORDER_STATUS_SQL } = require('../utils/orderEffectiveStatus');

const simpleOrderService = require('../services/simpleOrderService');
const orderService = require('../services/orderService');
const orderDetailsUpdateService = require('../services/orderDetailsUpdateService');
const cashbackService = require('../services/cashbackService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const preparationQueueService = require('../services/preparationQueueService');
const { resolveDiscountReason } = require('../utils/orderDiscountUtils');
const {
  extractAttributionFromCheckoutData
} = require('../utils/orderAttribution');
const { getCustomerFirstOrderInfo, getCustomerOrderHistory } = require('../utils/sessionDetailsHelper');
const { resolveIpLocation, isLocalOrPrivateIp } = require('../utils/ipGeoLookup');
const { detectAbandonReason } = require('../utils/incompleteAbandonReason');
const {
  buildDateRangeFilter,
  EGYPT_TIMEZONE
} = require('../utils/dateUtils');

// ── Company Timezone Cache (5-minute TTL) ──────────────────────────────
const _companyTimezoneCache = new Map();
const getCompanyTimezone = async (companyId) => {
  if (!companyId) return EGYPT_TIMEZONE;
  const cached = _companyTimezoneCache.get(companyId);
  if (cached && (Date.now() - cached.cachedAt < 5 * 60 * 1000)) {
    return cached.timezone;
  }
  try {
    const comp = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { timezone: true }
    });
    const tz = comp?.timezone || EGYPT_TIMEZONE;
    _companyTimezoneCache.set(companyId, { timezone: tz, cachedAt: Date.now() });
    return tz;
  } catch (err) {
    return EGYPT_TIMEZONE;
  }
};

// ── Dynamic Status Code Cache ──────────────────────────────────────────
// Loads ALL known status codes (system + custom) from orderStatusConfig
// so custom statuses like BDONKODTERBO also work in the main page filter.
let _knownStatusCodes = null;
let _knownStatusCodesPromise = null;

const loadKnownStatusCodes = async () => {
  try {
    const prisma = getSharedPrismaClient();
    // 🛡️ PRODUCTION-FIX (custom-filter-shipping): حمّل كل الأكواد النشطة من كل
    // الأنواع (order/preparation/shipping/payment) — كان بياخد order+preparation بس،
    // فحالة مخصصة نوعها shipping (مثل DELAYED-WITH-CAPTAIN عند Swan) كانت بتقع في
    // "ignored" والفلتر بيتساقط بصمت والليست بترجع كل الطلبات (82 ألف).
    const statuses = await prisma.orderStatusConfig.findMany({
      where: { isActive: true },
      select: { code: true }
    });
    const dbCodes = new Set(statuses.map(s => s.code.toUpperCase()));
    _knownStatusCodes = new Set([...PRISMA_ORDER_STATUS_ENUM, ...dbCodes]);
    return _knownStatusCodes;
  } catch (err) {
    console.error('[ORDERS] Failed to load status codes, falling back to Prisma enum:', err.message);
    _knownStatusCodes = PRISMA_ORDER_STATUS_ENUM;
    return _knownStatusCodes;
  }
};

const getKnownStatusCodes = () => {
  if (_knownStatusCodes) return _knownStatusCodes;
  if (!_knownStatusCodesPromise) {
    _knownStatusCodesPromise = loadKnownStatusCodes().catch(() => {
      _knownStatusCodes = PRISMA_ORDER_STATUS_ENUM;
    });
  }
  return _knownStatusCodes || PRISMA_ORDER_STATUS_ENUM;
};

// Warm cache on first import (non-blocking)
loadKnownStatusCodes();

// API endpoint to refresh the cache (called when custom statuses change)
router.post('/refresh-status-cache', verifyToken.authenticateToken, async (req, res) => {
  try {
    _knownStatusCodes = null;
    _knownStatusCodesPromise = null;
    await loadKnownStatusCodes();
    res.json({ success: true, message: 'Status cache refreshed', count: _knownStatusCodes?.size || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
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

const isBadgeCountRoute = (path) => {
  const normalized = String(path || '').replace(/\/+$/, '');
  return normalized === '/simple/new-count';
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

  // 🔔 Safe telemetry/badge routes: /simple/new-count should never block with 403.
  // It returns { success: true, data: { count: 0 } } when the company or user lacks order access.
  if (isBadgeCountRoute(req.path)) {
    return next();
  }

  return requireOrderCoreAccess(req, res, next);
});

// Granular RBAC: every order route requires at least orders.view.
// Merchants keep their dedicated simple-order surface. Mutating endpoints
// below additionally require their specific permission.
const { requireDbPermission } = require('../middleware/rbacMiddleware');
router.use((req, res, next) => {
  if (isMerchantUser(req.user)) return next();
  if (isBadgeCountRoute(req.path)) return next();
  return requireDbPermission('orders.view')(req, res, next);
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

const companyHasActiveBillingHold = async (companyId) => {
  if (!companyId) return false;
  try {
    const held = await getSharedPrismaClient().order.findFirst({
      where: { companyId, billingHoldAt: { not: null } },
      select: { id: true }
    });
    return Boolean(held);
  } catch (err) {
    console.error('⚠️ [ORDERS] Failed to check company billing hold status:', err.message);
    return false;
  }
};

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

const buildRegularSourceCondition = (source) => {
  switch (String(source).toLowerCase()) {
    case 'manual':
      return {
        OR: [
          { extractionMethod: { startsWith: 'manual' } },
          { extractionMethod: { in: ['manual_order_modal', 'manual_admin'] } },
          { sourceType: 'manual' },
          { createdBy: { not: null } },
          { createdByName: { not: null } },
          { conversationId: 'manual' }
        ]
      };
    case 'ai_conversation':
      return {
        AND: [
          { sourceType: 'ai_conversation' },
          { NOT: { extractionMethod: { startsWith: 'manual' } } },
          { NOT: { extractionMethod: 'manual_admin' } },
          { NOT: { extractionMethod: 'manual_order_modal' } },
          { NOT: { conversationId: 'manual' } }
        ]
      };
    case 'storefront':
      return {
        OR: [
          { sourceType: 'storefront' },
          { metadata: { contains: '"source":"storefront"' } },
          { metadata: { contains: 'storefront', mode: 'insensitive' } }
        ]
      };
    case 'woocommerce':
      return {
        OR: [
          { sourceType: { in: ['woocommerce', 'woocommerce_webhook', 'woo'] } },
          { wooCommerceId: { not: null } },
          { syncedFromWoo: true }
        ]
      };
    case 'pos':
      return {
        OR: [
          { sourceType: 'pos' },
          { metadata: { contains: 'pos_terminal', mode: 'insensitive' } }
        ]
      };
    case 'api':
      return {
        OR: [
          { sourceType: { in: ['api', 'public_api'] } },
          { metadata: { contains: '"source":"api"' } },
          { metadata: { contains: 'api', mode: 'insensitive' } }
        ]
      };
    case 'import':
      return {
        OR: [
          { extractionMethod: 'import' },
          { sourceType: { in: ['import', 'easy-orders', 'internal_import'] } },
          { orderSource: 'INTERNAL_IMPORT' }
        ]
      };
    case 'unknown':
      return {
        OR: [
          { sourceType: null },
          { sourceType: 'unknown' }
        ]
      };
    default:
      return { sourceType: String(source).toLowerCase() };
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

// Storefront orders are stored as both a GuestOrder and a mirrored regular
// Order (for WooCommerce export). The regular Order keeps paymentStatus
// "PENDING" by default, so wallet payments with a proof screenshot used to show
// as unpaid even though the customer paid upfront. Whenever a wallet payment
// includes a proof screenshot (walletPaymentProof.imageUrl) the payment is
// treated as completed so merchants can tell paid orders at a glance. Meaningful
// terminal statuses (FAILED / REFUNDED) are never overridden, and a REJECTED
// proof falls back to the stored status.
const derivePaymentStatusForDisplay = (order, metadata) => {
  const stored = String(order?.paymentStatus || '').trim().toLowerCase();
  const proof = metadata?.walletPaymentProof;
  const isWalletPayment =
    String(order?.paymentMethod || '').trim().toLowerCase() === 'wallet';
  const hasScreenshot = Boolean(proof?.imageUrl);
  const isRejected = String(proof?.status || '').toUpperCase() === 'REJECTED';

  if (isWalletPayment && hasScreenshot && !isRejected) {
    if (['failed', 'refunded', 'partially_refunded'].includes(stored)) {
      return stored;
    }
    return 'completed';
  }

  return stored || 'unavailable';
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

const ORDER_SOURCE_TRACKING_APP_SLUGS = new Set(['order-source-tracking', 'order-accounting-sources']);
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

const stripAttributionFromCheckoutData = (checkoutData) => {
  if (!checkoutData || typeof checkoutData !== 'object' || Array.isArray(checkoutData)) {
    return checkoutData;
  }

  const sanitized = { ...checkoutData };
  delete sanitized.attribution;
  delete sanitized.campaignAttribution;
  delete sanitized.orderAttribution;
  return sanitized;
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
    const keepConversationId = sanitizedOrder.conversationId;
    const keepConversation = sanitizedOrder.conversation;
    const keepSourceType = sanitizedOrder.sourceType;
    const keepExtractionMethod = sanitizedOrder.extractionMethod;
    const keepOrderSource = sanitizedOrder.orderSource;
    const keepCreatedBy = sanitizedOrder.createdBy;
    const keepCreatedByName = sanitizedOrder.createdByName;
    const keepCreatedByUser = sanitizedOrder.createdByUser;

    removeOrderSourceFields(sanitizedOrder);
    delete metadata.source;
    delete metadata.extractionMethod;
    delete metadata.orderSource;

    // Preserve conversation linking and origin context for staff so conversation tracking is never broken
    if (keepConversationId) {
      sanitizedOrder.conversationId = keepConversationId;
      sanitizedOrder.conversation = keepConversation;
      sanitizedOrder.sourceType = keepSourceType || 'facebook_inbox';
      sanitizedOrder.extractionMethod = keepExtractionMethod || 'facebook_inbox';
      sanitizedOrder.orderSource = keepOrderSource || 'MANUAL';
      sanitizedOrder.createdBy = keepCreatedBy;
      sanitizedOrder.createdByName = keepCreatedByName;
      sanitizedOrder.createdByUser = keepCreatedByUser;
    }
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

const maskCustomerName = (name) => {
  const s = String(name || '').trim();
  if (!s) return '';
  return `${s.charAt(0)}***`;
};

const maskCustomerPhone = (phone) => {
  const s = String(phone || '').trim();
  if (s.length <= 5) return s ? '***' : '';
  return `${s.slice(0, 3)}***${s.slice(-2)}`;
};

const maskCheckoutData = (checkoutData) => {
  if (!checkoutData || typeof checkoutData !== 'object') return checkoutData;
  const copy = { ...checkoutData };
  const nameKeys = ['guestName', 'fullName', 'customerName', 'customerFullName', 'name', 'firstName', 'lastName'];
  for (const k of nameKeys) {
    if (copy[k]) copy[k] = maskCustomerName(copy[k]);
  }
  const phoneKeys = ['guestPhone', 'customerPhone', 'phoneNumber', 'mobileNumber', 'phone', 'mobile'];
  for (const k of phoneKeys) {
    if (copy[k]) copy[k] = maskCustomerPhone(copy[k]);
  }
  if (copy.address) copy.address = '***';
  if (copy.street) copy.street = '***';
  if (copy.addressLine1) copy.addressLine1 = '***';
  if (copy.addressLine2) copy.addressLine2 = '***';
  if (copy.email || copy.guestEmail || copy.customerEmail || copy.emailAddress) {
    if (copy.email) copy.email = '***@***.***';
    if (copy.guestEmail) copy.guestEmail = '***@***.***';
    if (copy.customerEmail) copy.customerEmail = '***@***.***';
    if (copy.emailAddress) copy.emailAddress = '***@***.***';
  }
  return copy;
};

// تنسيق سلة غير مكتملة (guestCart) لتناسب شكل صف الطلب في صفحة الطلبات
const formatIncompleteCartRow = (cart, lostThreshold, isBillingHold = false) => {
  let items = [];
  try {
    items = typeof cart.items === 'string' ? JSON.parse(cart.items) : (Array.isArray(cart.items) ? cart.items : []);
  } catch (e) {
    items = [];
  }

  let checkoutData = {};
  try {
    checkoutData = typeof cart.checkoutData === 'string'
      ? JSON.parse(cart.checkoutData)
      : (cart.checkoutData && typeof cart.checkoutData === 'object' ? cart.checkoutData : {});
  } catch (e) {
    checkoutData = {};
  }

  const total = typeof cart.total === 'string'
    ? parseFloat(cart.total) || 0
    : Number(cart.total || 0);

  const lastActivity = cart.checkoutUpdatedAt || cart.checkoutStartedAt || cart.updatedAt || cart.createdAt;
  const isLost = lastActivity ? new Date(lastActivity) < lostThreshold : false;

  let customerName = checkoutData.guestName
    || checkoutData.fullName
    || checkoutData.customerName
    || checkoutData.customerFullName
    || checkoutData.name
    || '';
  let customerPhone = checkoutData.guestPhone
    || checkoutData.customerPhone
    || checkoutData.phoneNumber
    || checkoutData.mobileNumber
    || checkoutData.phone
    || checkoutData.mobile
    || '';
  let customerEmail = checkoutData.guestEmail
    || checkoutData.customerEmail
    || checkoutData.emailAddress
    || checkoutData.email
    || '';
  const governorate = checkoutData.governorate || checkoutData.gov || '';
  const city = checkoutData.city || '';
  let customerAddress = checkoutData.address || '';

  if (isBillingHold) {
    customerName = maskCustomerName(customerName);
    customerPhone = maskCustomerPhone(customerPhone);
    if (customerEmail) customerEmail = '***@***.***';
    if (customerAddress) customerAddress = '***';
  }

  return {
    id: cart.cartId,
    orderNumber: cart.cartId,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    city,
    governorate,
    total,
    subtotal: total,
    tax: 0,
    shipping: 0,
    status: isLost ? 'lost' : 'incomplete',
    paymentStatus: 'unavailable',
    paymentMethod: 'cash_on_delivery',
    shippingAddress: { city, governorate, country: '' },
    items: Array.isArray(items) ? items.map((item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) || 0 : Number(item.price || 0);
      const quantity = item.quantity || 1;
      return {
        id: item.id || item.productId || '',
        productId: item.productId || item.id || '',
        name: item.name || item.productName || item.title || '',
        productName: item.name || item.productName || item.title || '',
        price,
        quantity,
        total: typeof item.total === 'string' ? parseFloat(item.total) || 0 : Number(item.total || price * quantity),
        sku: item.sku || item.productSku || '',
        color: item.color || item.productColor || '',
        size: item.size || item.productSize || '',
        image: item.image || item.productImage || '',
        metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {}
      };
    }) : [],
    trackingNumber: null,
    notes: isBillingHold ? '***' : (checkoutData.notes || ''),
    createdAt: lastActivity,
    updatedAt: cart.updatedAt || cart.createdAt,
    isViewed: true,
    sourceType: 'storefront',
    extractionMethod: 'storefront',
    orderSource: 'GUEST_CART',
    conversationId: null,
    conversation: null,
    affiliateId: null,
    metadata: {
      source: 'storefront',
      isGuestOrder: true,
      isIncompleteCart: true,
      cartId: cart.cartId,
      ...(isBillingHold ? { isBillingHold: true, billingHold: true } : {})
    }
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
    duplicateSettings?.action === 'record_hidden' || duplicateSettings?.action === 'hidden' || duplicateSettings?.action === 'ignore'
      ? HIDDEN_REGULAR_ORDER_STATUSES_WITH_DUPLICATES
      : HIDDEN_REGULAR_ORDER_STATUSES
});

const getVisibleGuestOrderStatusesFilter = (duplicateSettings) => ({
  notIn:
    duplicateSettings?.action === 'record_hidden' || duplicateSettings?.action === 'hidden' || duplicateSettings?.action === 'ignore'
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

const PREPARATION_ONLY_STATUSES = new Set([
  'PENDING_PREPARATION',
  'PREPARING',
  'QUALITY_CHECK',
  'PACKAGED',
  'READY_TO_SHIP',
  'STOCK_SHORTAGE',
  'PENDING_STOCK',
  'ON_HOLD_STOCK',
  'ON_HOLD_PREP'
]);

// Maps a preparation-queue status to the "regular" order.status value that the
// rest of the system (dashboards, analytics, WhatsApp, Turbo, confirmations)
// expects. The detailed prep stage is stored in metadata.preparationStatus and
// is what the preparation page reads.
const getMappedRegularOrderStatus = (preparationStatus) => {
  if (preparationStatus === 'PENDING_PREPARATION') return 'CONFIRMED';
  if (['STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK'].includes(preparationStatus)) return 'STOCK_SHORTAGE';
  if (preparationStatus === 'ON_HOLD_PREP') return 'ON_HOLD_PREP';
  return 'PROCESSING';
};

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

const createBulkOrderError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const permanentlyDeleteIncompleteCart = async ({ orderIdentifier, companyId }) => {
  const prisma = getSharedPrismaClient();
  const cart = await prisma.guestCart.findFirst({
    where: {
      companyId,
      OR: [
        { id: orderIdentifier },
        { cartId: orderIdentifier }
      ]
    },
    select: {
      id: true,
      cartId: true
    }
  });

  if (!cart) {
    return null;
  }

  try {
    await prisma.cartContactLog.deleteMany({
      where: { companyId, cartId: cart.cartId }
    });
  } catch (_contactErr) {
    // optional log cleanup
  }

  await prisma.guestCart.delete({
    where: { id: cart.id }
  });

  return { orderType: 'cart', cart };
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
  const normalizedStatus = String(status || '').trim().toUpperCase();

  if (PREPARATION_ONLY_STATUSES.has(normalizedStatus)) {
    const prisma = getSharedPrismaClient();
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderIdentifier, companyId },
          { orderNumber: orderIdentifier, companyId }
        ]
      },
      include: { company: { include: { orderWorkflowConfig: true } } }
    });

    if (order) {
      const currentMetadata = parseOrderMetadata(order.metadata);

      const previousPreparationStatus =
        typeof currentMetadata.preparationStatus === 'string'
          ? currentMetadata.preparationStatus
          : order.status;

      // 🔒 Enforce the "problem hold" rules server-side (ON_HOLD_PREP requires
      // a reason note; a held order cannot move forward until released).
      const { assertPreparationHoldRule } = preparationQueueService;
      await assertPreparationHoldRule({
        currentPreparationStatus: previousPreparationStatus,
        targetStatus: normalizedStatus,
        notes,
        isOverride: options.isOverride || false,
      });

      // ⚙️ Respect the advanced workflow when enabled and transitions exist for
      // the current stage (fall back to allowing otherwise).
      if (!skipTransitionValidation) {
        const workflowConfig = order.company?.orderWorkflowConfig;
        if (workflowConfig?.enabled) {
          const orderWorkflowService = require('../services/orderWorkflowService');
          const getMappedRegularOrderStatus = (preparationStatus) => {
            if (preparationStatus === 'PENDING_PREPARATION') return 'CONFIRMED';
            if (['STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK'].includes(preparationStatus)) return 'STOCK_SHORTAGE';
            if (preparationStatus === 'ON_HOLD_PREP') return 'ON_HOLD_PREP';
            return 'PROCESSING';
          };
          const effectiveStatus = currentMetadata?.preparationStatus ? getMappedRegularOrderStatus(currentMetadata.preparationStatus) : order.status;
          const currentStatusDef = await prisma.orderStatusDefinition.findFirst({
            where: { companyId, code: effectiveStatus },
            select: { id: true },
          });
          const hasConfiguredTransitions = await prisma.orderWorkflowTransition.count({
            where: {
              companyId,
              fromStatusId: currentStatusDef ? currentStatusDef.id : null,
            },
          });
          if (hasConfiguredTransitions > 0) {
            const workflowOrder = { ...order, status: effectiveStatus };
            const wfResult = await orderWorkflowService.validateStatusChange(
              companyId,
              order.id,
              userId,
              normalizedStatus,
              notes,
              false,
              workflowOrder
            );
            if (wfResult?.status === 'pending') {
              return { orderType: 'regular', workflowStatus: 'pending', requestId: wfResult.requestId };
            }
          }
        }
      }

      const mappedStatus = getMappedRegularOrderStatus(normalizedStatus);
      const nextMetadata = {
        ...currentMetadata,
        preparationStatus: normalizedStatus,
        preparationStatusUpdatedAt: new Date().toISOString()
      };

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: mappedStatus,
          // 🛡️ PRODUCTION-FIX (custom-status-persist): حالات التجهيز حالات نظامية —
          // أمسح أي كود مخصص قديم عشان "الحالة الفعلية" تبقى مرحلة التجهيز.
          customStatusCode: null,
          notes: notes || undefined,
          metadata: JSON.stringify(nextMetadata),
          statusHistory: {
            create: {
              status: normalizedStatus,
              oldStatus: previousPreparationStatus,
              reason: notes || 'Bulk preparation queue update',
              changedBy: userId,
              userName
            }
          },
          updatedAt: new Date()
        }
      });

      // 🛡️ PRODUCTION-FIX (prep-stage-notify): إشعار الواتساب كان بيتخطى في مسار الـ bulk
      setImmediate(() => {
        preparationQueueService.notifyPreparationStageChange({
          companyId,
          orderPayload: { ...order, ...updatedOrder },
          status: normalizedStatus
        });
      });

      return { orderType: 'regular', order: updatedOrder };
    }

    const guestOrder = await prisma.guestOrder.findFirst({
      where: {
        OR: [
          { id: orderIdentifier, companyId },
          { orderNumber: orderIdentifier, companyId }
        ]
      },
      select: { id: true, status: true, metadata: true }
    });

    if (guestOrder) {
      const currentMetadata = parseOrderMetadata(guestOrder.metadata);
      const nextMetadata = {
        ...currentMetadata,
        preparationStatus: normalizedStatus,
        preparationStatusUpdatedAt: new Date().toISOString()
      };

      const updatedGuestOrder = await prisma.guestOrder.update({
        where: { id: guestOrder.id },
        data: {
          status: normalizedStatus,
          notes: notes || undefined,
          metadata: JSON.stringify(nextMetadata),
          OrderStatusHistory: {
            create: {
              status: normalizedStatus,
              oldStatus: guestOrder.status,
              reason: notes || 'Bulk preparation queue update',
              changedBy: userId,
              userName
            }
          },
          updatedAt: new Date()
        }
      });

      // 🛡️ PRODUCTION-FIX (prep-stage-notify): إشعار الواتساب لطلبات الضيوف في مسار الـ bulk
      setImmediate(() => {
        let guestItems = [];
        try {
          guestItems = typeof updatedGuestOrder.items === 'string'
            ? JSON.parse(updatedGuestOrder.items)
            : (updatedGuestOrder.items || []);
        } catch (_itemsError) {
          guestItems = [];
        }
        preparationQueueService.notifyPreparationStageChange({
          companyId,
          orderPayload: {
            ...updatedGuestOrder,
            isGuestOrder: true,
            customerPhone: updatedGuestOrder.guestPhone,
            customerName: updatedGuestOrder.guestName,
            items: guestItems,
            currency: 'EGP'
          },
          status: normalizedStatus
        });
      });

      return { orderType: 'guest', order: updatedGuestOrder };
    }

    const notFoundError = new Error('الطلب غير موجود');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

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

    // 🛡️ CRITICAL FIX: Synchronize status to twin guest order if it exists (especially for TRASH / RESTORE)
    if (order?.orderNumber) {
      const prisma = getSharedPrismaClient();
      await prisma.guestOrder.updateMany({
        where: {
          companyId,
          orderNumber: order.orderNumber
        },
        data: {
          status: normalizedStatus,
          notes: notes || undefined,
          updatedAt: new Date()
        }
      }).catch((err) => {
        console.warn('⚠️ [ORDERS] Failed to sync status to twin guestOrder:', err?.message);
      });
    }

    return { orderType: 'regular', order };
  } catch (regularOrderError) {
    if (regularOrderError?.statusCode !== 404) {
      throw regularOrderError;
    }
  }

  try {
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

    // 🛡️ CRITICAL FIX: Synchronize status to twin regular order if it exists
    if (guestOrder?.orderNumber) {
      const prisma = getSharedPrismaClient();
      await prisma.order.updateMany({
        where: {
          companyId,
          orderNumber: guestOrder.orderNumber
        },
        data: {
          status: normalizedStatus,
          notes: notes || undefined,
          updatedAt: new Date()
        }
      }).catch((err) => {
        console.warn('⚠️ [ORDERS] Failed to sync status to twin regular order:', err?.message);
      });
    }

    return { orderType: 'guest', order: guestOrder };
  } catch (guestOrderError) {
    if (guestOrderError?.statusCode !== 404) {
      throw guestOrderError;
    }
  }

  // If deleting/trashing, also check if it is an incomplete cart (guestCart)
  if (normalizedStatus === 'TRASH') {
    const cartDeleteResult = await permanentlyDeleteIncompleteCart({
      orderIdentifier,
      companyId
    });
    if (cartDeleteResult) {
      return { orderType: 'cart', order: cartDeleteResult.cart };
    }
  }

  throw createBulkOrderError('الطلب غير موجود', 404);
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

    // 🛡️ CRITICAL FIX: If this regular order has a twin row in guest_orders (e.g. from storefront checkout),
    // delete the guest_orders twin and its notes as well so it never resurfaces in the orders list.
    if (order.orderNumber) {
      const matchingGuestOrders = await tx.guestOrder.findMany({
        where: {
          companyId,
          orderNumber: order.orderNumber
        },
        select: { id: true }
      });

      if (matchingGuestOrders.length > 0) {
        const guestIds = matchingGuestOrders.map((g) => g.id);
        await tx.orderNote.deleteMany({
          where: { guestOrderId: { in: guestIds } }
        });
        await tx.guestOrder.deleteMany({
          where: { id: { in: guestIds } }
        });
      }
    }
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

  // 🛡️ If the guest order itself isn't explicitly marked as TRASH, check if its twin regular order is in TRASH
  if (!isTrashOrderStatus(guestOrder.status)) {
    const twinRegularOrder = guestOrder.orderNumber ? await prisma.order.findFirst({
      where: {
        companyId,
        orderNumber: guestOrder.orderNumber
      },
      select: { id: true, status: true }
    }) : null;

    if (!twinRegularOrder || !isTrashOrderStatus(twinRegularOrder.status)) {
      throw createBulkOrderError('Order must be in trash before permanent deletion');
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderNote.deleteMany({ where: { guestOrderId: guestOrder.id } });
    await tx.guestOrder.delete({ where: { id: guestOrder.id } });

    // 🛡️ CRITICAL FIX: If this guest order has a twin row in regular orders, delete it too!
    if (guestOrder.orderNumber) {
      const matchingRegularOrders = await tx.order.findMany({
        where: {
          companyId,
          orderNumber: guestOrder.orderNumber
        },
        select: { id: true }
      });

      if (matchingRegularOrders.length > 0) {
        const regularIds = matchingRegularOrders.map((o) => o.id);
        await tx.orderNote.deleteMany({ where: { orderId: { in: regularIds } } });
        await tx.affiliateReferral.updateMany({
          where: { orderId: { in: regularIds } },
          data: { orderId: null }
        });
        await tx.whatsAppNotificationLog.updateMany({
          where: { orderId: { in: regularIds } },
          data: { orderId: null }
        });
        await tx.walletTransaction.updateMany({
          where: { orderId: { in: regularIds } },
          data: { orderId: null }
        });
        await tx.customerJourney.updateMany({
          where: { orderId: { in: regularIds } },
          data: { orderId: null }
        });
        await tx.order.deleteMany({
          where: { id: { in: regularIds } }
        });
      }
    }
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

  const cartDeleteResult = await permanentlyDeleteIncompleteCart({
    orderIdentifier,
    companyId
  });

  if (cartDeleteResult) {
    return cartDeleteResult;
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
    const companyId = merchant?.companyId || req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب'
      });
    }

    const featureAccess = await getOrderDetailFeatureAccess(companyId);
    const hideCartAttribution = Boolean(merchant) || !featureAccess.campaignAttribution;

    // 🚧 الطلبات غير المكتملة تُقنّع بيانات العميل فيها عند وجود تعليق فوترة (billing hold) حتى يُشحن الرصيد
    const includeHeld = req.query.includeHeld === 'true';
    const isBillingHold = !includeHeld && await companyHasActiveBillingHold(companyId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = (req.query.status || 'all').toString().toLowerCase();
    const search = (req.query.search || '').toString().trim();
    const sortBy = (req.query.sortBy || '').toString();
    const sortDir = (req.query.sortDir || 'desc').toString().toLowerCase() === 'asc' ? 'asc' : 'desc';
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

    const filterClauses = [];

    if (search) {
      filterClauses.push({
        OR: [
          { cartId: { contains: search } },
          { checkoutData: { contains: search } }
        ]
      });
    }

    const hasPhoneParam = (req.query.hasPhone || '').toString();
    const hasPhone = hasPhoneParam === 'true';
    const hasNoPhone = hasPhoneParam === 'false';

    // phone keys written by the storefront checkout draft (and legacy variants)
    const PHONE_KEYS = ['guestPhone', 'customerPhone', 'phoneNumber', 'mobileNumber', 'phone', 'mobile'];
    const phoneKeyClause = { OR: PHONE_KEYS.map((k) => ({ checkoutData: { contains: `"${k}"` } })) };
    const emptyPhoneClause = { OR: PHONE_KEYS.map((k) => ({ checkoutData: { contains: `"${k}":""` } })) };

    if (hasPhone) {
      // only carts that actually carry a non-empty phone value
      filterClauses.push({ AND: [phoneKeyClause, { NOT: emptyPhoneClause }] });
    } else if (hasNoPhone) {
      // carts that carry no phone key at all, or only empty phone values
      filterClauses.push({ OR: [{ NOT: phoneKeyClause }, emptyPhoneClause] });
    }

    // السلات المستبعدة يدويًا من الورك-سبيس (سجل استبعاد في cartContactLog)
    // لا تعود للطابور مع التحديث الدوري
    try {
      const dismissLogs = await getSharedPrismaClient().cartContactLog.findMany({
        where: { companyId, method: 'dismissed' },
        select: { cartId: true },
        distinct: ['cartId']
      });
      const dismissedCartIds = dismissLogs.map((l) => l.cartId);
      if (dismissedCartIds.length) {
        filterClauses.push({ cartId: { notIn: dismissedCartIds } });
      }
    } catch (_dismissError) {
      // غياب الجدول في بيئات قديمة لا يوقف القائمة
    }

    // السلات المحولة لطلبات حقيقية — تُستبعد من الطابور
    try {
      const convertedLogs = await getSharedPrismaClient().cartConversionLog.findMany({
        where: { companyId },
        select: { cartId: true },
        distinct: ['cartId']
      });
      const convertedIds = convertedLogs.map((l) => l.cartId).filter(Boolean);
      if (convertedIds.length) {
        filterClauses.push({ cartId: { notIn: convertedIds } });
      }
    } catch (_convError) {
      // غياب الجدول في بيئات قديمة لا يوقف القائمة
    }

    // last activity = most recent of checkoutUpdatedAt / checkoutStartedAt / updatedAt
    // (matches the per-row isLost computation in the data mapping below)
    const activeClause = {
      OR: [
        { checkoutUpdatedAt: { gte: lostThreshold } },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: { gte: lostThreshold } }] },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: null }, { updatedAt: { gte: lostThreshold } }] }
      ]
    };

    const lostClause = {
      OR: [
        { checkoutUpdatedAt: { lt: lostThreshold } },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: { lt: lostThreshold } }] },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: null }, { updatedAt: { lt: lostThreshold } }] }
      ]
    };

    const statusClause =
      status === 'active' || status === 'incomplete' ? activeClause
        : (status === 'expired' || status === 'lost') ? lostClause
          : null;

    // القاعدة الأساسية بدون فلتر الحالة — عشان إحصائيات التبويبات تفضل ثابتة
    const buildBaseWhere = () => {
      return { companyId, ...(filterClauses.length ? { AND: filterClauses } : {}) };
    };
    const buildWhere = (extra = []) => {
      const and = [...filterClauses, ...extra];
      return { companyId, ...(and.length ? { AND: and } : {}) };
    };

    const allowedSorts = {
      total: 'total',
      checkoutUpdatedAt: 'checkoutUpdatedAt',
      checkoutStartedAt: 'checkoutStartedAt',
    };
    const sortField = allowedSorts[sortBy];
    let orderBy;
    if (sortBy === 'priority') {
      // الأولوية: الأعلى قيمة أولًا، وبين نفس القيمة الأقدم نشاطًا أولًا (الأقرب للضياع)
      orderBy = [{ total: 'desc' }, { checkoutUpdatedAt: 'asc' }];
    } else if (sortField) {
      orderBy = [{ [sortField]: sortDir }];
    } else {
      orderBy = [
        { checkoutUpdatedAt: 'desc' },
        { checkoutStartedAt: 'desc' },
        { updatedAt: 'desc' }
      ];
    }

    const statusWhere = statusClause ? [statusClause] : [];

    const [totalCount, carts, totalAgg, activeAgg, lostAgg] = await Promise.all([
      getSharedPrismaClient().guestCart.count({ where: buildWhere(statusWhere) }),
      getSharedPrismaClient().guestCart.findMany({
        where: buildWhere(statusWhere),
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      getSharedPrismaClient().guestCart.aggregate({
        where: buildBaseWhere(),
        _count: { _all: true },
        _sum: { total: true }
      }),
      getSharedPrismaClient().guestCart.aggregate({
        where: buildWhere([activeClause]),
        _count: { _all: true },
        _sum: { total: true }
      }),
      getSharedPrismaClient().guestCart.aggregate({
        where: buildWhere([lostClause]),
        _count: { _all: true },
        _sum: { total: true }
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

      const cartAttribution = hideCartAttribution
        ? null
        : extractAttributionFromCheckoutData(checkoutData);

      const rawCheckoutData =
        hideCartAttribution && checkoutData && typeof checkoutData === 'object'
          ? stripAttributionFromCheckoutData(checkoutData)
          : checkoutData;

      const safeCheckoutData = isBillingHold
        ? maskCheckoutData(rawCheckoutData)
        : rawCheckoutData;

      return {
        cartId: cart.cartId,
        items,
        itemsCount: Array.isArray(items) ? items.length : 0,
        total,
        checkoutData: safeCheckoutData,
        ...(cartAttribution ? { attribution: cartAttribution } : {}),
        checkoutStartedAt: cart.checkoutStartedAt,
        checkoutUpdatedAt: cart.checkoutUpdatedAt,
        updatedAt: cart.updatedAt,
        expiresAt: cart.expiresAt,
        status: isLost ? 'lost' : 'incomplete',
        ...(isBillingHold ? { billingHold: true } : {}),
        abandonReason: detectAbandonReason(
          { ...cart, checkoutData: safeCheckoutData, status: isLost ? 'lost' : 'incomplete' },
          { lostAfterHours },
        ),
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
      },
      stats: {
        total: totalCount,
        active: activeAgg._count._all,
        lost: lostAgg._count._all,
        totalValue: Number(totalAgg._sum.total || 0),
        activeValue: Number(activeAgg._sum.total || 0),
        lostValue: Number(lostAgg._sum.total || 0)
      },
      ...(isBillingHold ? { billingHold: true } : {})
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

// تقارير استرداد الطلبات غير المكتملة (Recovery Pipeline + أداء الفريق)
router.get('/incomplete/reports', verifyToken.authenticateToken, async (req, res) => {
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
    const companyId = merchant?.companyId || req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب'
      });
    }

    const prisma = getSharedPrismaClient();
    const now = new Date();

    let lostAfterHours = 24;
    try {
      const settings = await orderService.getOrderSettings(companyId);
      const parsed = parseInt(settings?.incompleteOrderLostAfterHours, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        lostAfterHours = parsed;
      }
    } catch (settingsError) {
      console.warn('⚠️ [ORDERS] reports: failed to load incomplete settings:', settingsError.message);
    }

    const lostThreshold = new Date(now.getTime() - lostAfterHours * 60 * 60 * 1000);
    const activeClause = {
      OR: [
        { checkoutUpdatedAt: { gte: lostThreshold } },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: { gte: lostThreshold } }] },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: null }, { updatedAt: { gte: lostThreshold } }] }
      ]
    };
    const lostClause = {
      OR: [
        { checkoutUpdatedAt: { lt: lostThreshold } },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: { lt: lostThreshold } }] },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: null }, { updatedAt: { lt: lostThreshold } }] }
      ]
    };

    // فترة زمنية: إما days (آخر N يوم) أو from/to مخصص
    // ملاحظة: نحلل YYYY-MM-DD كتاريخ محلي (مش UTC) حتى لا تضيع ساعات الصباح
    const parseLocalDate = (s) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
      if (!m) return null;
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      // ارفض التواريخ اللي JS سحبها (مثل 2026-02-30 -> 2026-03-02 أو 2026-13-15 -> 2027-01-14)
      // لازم الشهر واليوم الاتنين يتطابقوا — مقارنة اليوم لوحده كانت بتقبل شهور مستحيلة بصمت
      if (
        Number.isNaN(d.getTime()) ||
        d.getMonth() !== Number(m[2]) - 1 ||
        d.getDate() !== Number(m[3])
      ) return null;
      return d;
    };
    // مفتاح اليوم حسب التوقيت المحلي (مش UTC) لتجميع الترند على تقويم التاجر
    const localDayKey = (d) => {
      const dt = new Date(d);
      const y = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const da = String(dt.getDate()).padStart(2, '0');
      return `${y}-${mo}-${da}`;
    };
    const fromRaw = (req.query.from || '').toString();
    const toRaw = (req.query.to || '').toString();
    let since;
    let toDate = null;
    if (fromRaw) {
      since = parseLocalDate(fromRaw);
      if (!since) {
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
      since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }
    if (toRaw) {
      const parsedTo = parseLocalDate(toRaw);
      if (parsedTo) {
        // يشمل اليوم كاملاً حتى آخر لحظة — بالمكونات المحلية مش +24h ثابتة
        // حتى لا ينزاح الحد عند أيام تغيير التوقيت الصيفي
        // لازم الناتج يفضل Date object (مش getTime رقمي) لأن Prisma يرفض Int في lte
        const nextDay = new Date(parsedTo.getFullYear(), parsedTo.getMonth(), parsedTo.getDate() + 1);
        toDate = new Date(nextDay.getTime() - 1);
      }
    }
    const timeRange = toDate ? { gte: since, lte: toDate } : { gte: since };
    const cartWhereBase = { companyId, createdAt: timeRange };

    const [windowAgg, activeAgg, lostAgg, allTimeAgg, convWindow, contactWindow, windowCarts] = await Promise.all([
      // سلات الفترة نفسها (المتبقية غير المكتملة)
      prisma.guestCart.aggregate({
        where: cartWhereBase,
        _count: { _all: true },
        _sum: { total: true }
      }),
      // السلات النشطة داخل الفترة
      prisma.guestCart.aggregate({
        where: { ...cartWhereBase, ...activeClause },
        _count: { _all: true },
        _sum: { total: true }
      }),
      // السلات المفقودة داخل الفترة
      prisma.guestCart.aggregate({
        where: { ...cartWhereBase, ...lostClause },
        _count: { _all: true },
        _sum: { total: true }
      }),
      // التراكمي الإجمالي التاريخي للشركة (مرجعي)
      prisma.guestCart.aggregate({
        where: { companyId },
        _count: { _all: true },
        _sum: { total: true }
      }),
      prisma.cartConversionLog.findMany({
        where: { companyId, convertedAt: timeRange },
        orderBy: { convertedAt: 'desc' },
        select: {
          cartId: true,
          orderId: true,
          orderNumber: true,
          employeeId: true,
          employeeName: true,
          cartValue: true,
          governorate: true,
          convertedAt: true,
          channel: true
        }
      }),
      prisma.cartContactLog.findMany({
        where: { companyId, createdAt: timeRange },
        orderBy: { createdAt: 'desc' },
        select: {
          cartId: true,
          employeeId: true,
          employeeName: true,
          method: true,
          result: true,
          createdAt: true
        }
      }),
      // سلات الفترة نفسها لحساب مصادر السلات غير المكتملة فقط بدون جلب كل طلبات المتجر الحقيقية
      prisma.guestCart.findMany({
        where: cartWhereBase,
        select: {
          cartId: true,
          total: true,
          checkoutData: true
        }
      })
    ]);

    const total = windowAgg._count._all || 0;
    const converted = convWindow.length;
    const naturalConverted = convWindow.filter((c) => !c.employeeId && c.channel === 'natural').length;
    const byTeamConverted = converted - naturalConverted;

    // استخراج مصادر السلات غير المكتملة في الفترة حصرياً من بيانات السلات (وليس كل طلبات المتجر الحقيقية!)
    const sourcesMap = new Map();
    windowCarts.forEach((c) => {
      let attr = null;
      try {
        attr = extractAttributionFromCheckoutData(c.checkoutData);
      } catch (_) {}
      const rawPlatform = (attr?.platform || attr?.source || '').toLowerCase().trim();
      let sourceKey = 'direct';
      if (rawPlatform.includes('facebook') || rawPlatform.includes('fb')) sourceKey = 'facebook';
      else if (rawPlatform.includes('instagram') || rawPlatform.includes('ig')) sourceKey = 'instagram';
      else if (rawPlatform.includes('tiktok') || rawPlatform.includes('tt')) sourceKey = 'tiktok';
      else if (rawPlatform.includes('snapchat') || rawPlatform.includes('snap')) sourceKey = 'snapchat';
      else if (rawPlatform.includes('google')) sourceKey = 'google';
      else if (rawPlatform && rawPlatform !== 'unknown') sourceKey = rawPlatform;

      const val = typeof c.total === 'string' ? parseFloat(c.total) || 0 : Number(c.total || 0);
      const entry = sourcesMap.get(sourceKey) || { source: sourceKey, count: 0, value: 0 };
      entry.count += 1;
      entry.value += val;
      sourcesMap.set(sourceKey, entry);
    });
    const orderSources = Array.from(sourcesMap.values()).sort((a, b) => b.count - a.count);

    // تتبع مصير الطلبات المحولة وجودتها (كم اتسلم، كم رجع، كم اتلغى)
    // —— يُحل مبكرًا لأنه مصدر القيمة الموحد لكل أرقام الصفحة
    const orderNumbers = Array.from(new Set(convWindow.map((c) => c.orderNumber).filter(Boolean)));
    const orderIds = Array.from(new Set(convWindow.map((c) => c.orderId).filter(Boolean)));

    const orderMapById = new Map();
    const orderMapByNumber = new Map();

    if (orderIds.length > 0 || orderNumbers.length > 0) {
      const orClauses = [];
      if (orderNumbers.length > 0) orClauses.push({ orderNumber: { in: orderNumbers } });
      if (orderIds.length > 0) orClauses.push({ id: { in: orderIds } });

      try {
        const [matchedOrders, matchedGuestOrders] = await Promise.all([
          prisma.order.findMany({
            where: {
              companyId,
              OR: orClauses,
            },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
            },
          }),
          prisma.guestOrder.findMany({
            where: {
              companyId,
              OR: orClauses,
            },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
            },
          }).catch(() => []),
        ]);

        // ضيف أولاً طلبات الـ guest
        matchedGuestOrders.forEach((o) => {
          if (o.id) orderMapById.set(o.id, o);
          if (o.orderNumber) orderMapByNumber.set(o.orderNumber, o);
        });

        // الأولوية والسيادة للطلبات الحقيقية المنقولة في جدول Order
        matchedOrders.forEach((o) => {
          if (o.id) orderMapById.set(o.id, o);
          if (o.orderNumber) orderMapByNumber.set(o.orderNumber, o);
        });
      } catch (orderLookupErr) {
        console.warn('⚠️ [ORDERS] reports: failed to fetch converted orders status:', orderLookupErr.message);
      }
    }

    // ⚖️ مقياس القيمة الموحد: إجمالي الطلب الحقيقي لو موجود، وإلا قيمة السلة المسجلة.
    // (قبل كده كارت الاسترداد كان يحسب بـ cartValue بينما كارت المصير و«آخر التحويلات»
    //  بيحسبوا بـ total الطلب — فنفس التحويلات كانت تظهر بقيمتين مختلفتين)
    const resolvedValue = (c) => {
      const matched = (c.orderNumber && orderMapByNumber.get(c.orderNumber)) ||
                      (c.orderId && orderMapById.get(c.orderId)) ||
                      null;
      return matched && matched.total != null ? Number(matched.total) : Number(c.cartValue || 0);
    };
    const convertedValue = convWindow.reduce((s, c) => s + resolvedValue(c), 0);

    // قاعدة القمع: سلات الفترة نفسها (المتبقية + اللي اتحولت واتحذفت) — مش كل تاريخ الشركة.
    // المقام القديم (كل السلات التراكمية) كان بيبخس النسبة كل ما التاريخ يتراكم من غير مسح:
    // مثال حقيقي (Swan): 12 ألف سلة متراكمة خلّت نسبة اليوم تظهر ~0.2% بدل ~7%.
    const windowTotal = windowAgg._count._all || 0;
    const recoveryFunnelBase = windowTotal + converted;

    // trend by day (JS aggregation over the window rows)
    const dayMap = new Map();
    convWindow.forEach((c) => {
      const day = c.convertedAt ? localDayKey(c.convertedAt) : 'unknown';
      const entry = dayMap.get(day) || { date: day, conversions: 0, value: 0 };
      entry.conversions += 1;
      entry.value += resolvedValue(c);
      dayMap.set(day, entry);
    });
    const trend = Array.from(dayMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

    // team performance by employee (skips natural conversions - no employee)
    const teamMap = new Map();
    convWindow.forEach((c) => {
      if (!c.employeeId) return;
      const key = c.employeeId;
      const entry = teamMap.get(key) || {
        employeeId: c.employeeId,
        employeeName: c.employeeName || 'غير معروف',
        conversions: 0,
        value: 0,
        contacts: 0,
        responses: 0,
      };
      entry.conversions += 1;
      entry.value += resolvedValue(c);
      teamMap.set(key, entry);
    });

    // add contact/response stats per employee
    contactWindow.forEach((ct) => {
      if (!ct.employeeId) return;
      const key = ct.employeeId;
      let entry = teamMap.get(key);
      if (!entry) {
        entry = {
          employeeId: ct.employeeId,
          employeeName: ct.employeeName || 'غير معروف',
          conversions: 0,
          value: 0,
          contacts: 0,
          responses: 0,
        };
        teamMap.set(key, entry);
      }
      entry.contacts += 1;
      if ((ct.result || '').toString().toLowerCase() === 'answered') {
        entry.responses += 1;
      }
    });

    const team = Array.from(teamMap.values())
      .map((e) => ({
        ...e,
        avgValue: e.conversions ? e.value / e.conversions : 0,
        responseRate: e.contacts ? (e.responses / e.contacts) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // مصير الطلبات المحولة اتحدد فوق (orderMapById / orderMapByNumber) — هنا الحساب بس

    const duplicateSettings = await orderService.getDuplicateSettings(companyId);
    const treatDuplicateAsCancelled = duplicateSettings?.reportTreatment === 'cancelled';
    const DELIVERED_SET = new Set(['DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED']);
    const RETURNED_SET = new Set(['RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REFUNDED_PARTIALLY']);
    const CANCELLED_SET = treatDuplicateAsCancelled
      ? new Set(['CANCELLED', 'FAILED', 'TRASH', 'TRASH_ORDER', 'DUPLICATE_ORDER', 'PENDING_CANCELLATION'])
      : new Set(['CANCELLED', 'FAILED', 'TRASH', 'TRASH_ORDER', 'PENDING_CANCELLATION']);

    const destinyStats = {
      totalConverted: converted,
      delivered: { count: 0, value: 0, rate: 0 },
      returned: { count: 0, value: 0, rate: 0 },
      cancelled: { count: 0, value: 0, rate: 0 },
      inProgress: { count: 0, value: 0, rate: 0 },
      effectiveDeliveryRate: 0,
      deliveryRate: 0,
      statusBreakdown: [],
    };

    const statusMap = new Map();

    convWindow.forEach((c) => {
      const matched = (c.orderNumber && orderMapByNumber.get(c.orderNumber)) ||
                      (c.orderId && orderMapById.get(c.orderId)) ||
                      null;
      const status = (matched?.status || 'PENDING').toUpperCase();
      const val = resolvedValue(c);

      const statEntry = statusMap.get(status) || { status, count: 0, value: 0 };
      statEntry.count += 1;
      statEntry.value += val;
      statusMap.set(status, statEntry);

      if (DELIVERED_SET.has(status)) {
        destinyStats.delivered.count += 1;
        destinyStats.delivered.value += val;
      } else if (RETURNED_SET.has(status)) {
        destinyStats.returned.count += 1;
        destinyStats.returned.value += val;
      } else if (CANCELLED_SET.has(status)) {
        destinyStats.cancelled.count += 1;
        destinyStats.cancelled.value += val;
      } else {
        destinyStats.inProgress.count += 1;
        destinyStats.inProgress.value += val;
      }
    });

    if (converted > 0) {
      destinyStats.delivered.rate = (destinyStats.delivered.count / converted) * 100;
      destinyStats.returned.rate = (destinyStats.returned.count / converted) * 100;
      destinyStats.cancelled.rate = (destinyStats.cancelled.count / converted) * 100;
      destinyStats.inProgress.rate = (destinyStats.inProgress.count / converted) * 100;
      destinyStats.deliveryRate = destinyStats.delivered.rate;

      const finalizedCount = destinyStats.delivered.count + destinyStats.returned.count + destinyStats.cancelled.count;
      destinyStats.effectiveDeliveryRate = finalizedCount > 0 ? (destinyStats.delivered.count / finalizedCount) * 100 : 0;
    }

    destinyStats.statusBreakdown = Array.from(statusMap.values())
      .map((s) => ({
        ...s,
        rate: converted > 0 ? (s.count / converted) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        periodDays: fromRaw ? null : (parseInt(req.query.days, 10) || 30),
        from: since ? since.toISOString() : null,
        to: toDate ? toDate.toISOString() : null,
        pipeline: {
          total,
          windowTotal: total,
          active: activeAgg._count._all || 0,
          lost: lostAgg._count._all || 0,
          totalValue: Number(windowAgg._sum.total || 0),
          activeValue: Number(activeAgg._sum.total || 0),
          lostValue: Number(lostAgg._sum.total || 0),
          allTimeTotal: allTimeAgg._count._all || 0,
          allTimeValue: Number(allTimeAgg._sum.total || 0),
        },
        recovery: {
          converted,
          convertedValue,
          avgConvertedValue: converted ? convertedValue / converted : 0,
          recoveryRate: recoveryFunnelBase ? (converted / recoveryFunnelBase) * 100 : 0,
          funnelBase: recoveryFunnelBase,
          byTeam: byTeamConverted,
          natural: naturalConverted,
        },
        destiny: destinyStats,
        team,
        trend,
        orderSources,
        recent: convWindow.slice(0, 20).map((c) => {
          const matched = (c.orderNumber && orderMapByNumber.get(c.orderNumber)) ||
                          (c.orderId && orderMapById.get(c.orderId)) ||
                          null;
          return {
            cartId: c.cartId,
            orderId: matched?.id || c.orderId || null,
            orderNumber: c.orderNumber || matched?.orderNumber || null,
            orderStatus: matched?.status || null,
            employeeName: c.employeeName,
            value: resolvedValue(c),
            governorate: c.governorate,
            convertedAt: c.convertedAt,
          };
        }),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching incomplete orders reports:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تقارير الطلبات غير المكتملة',
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
    const companyId = merchant?.companyId || req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب'
      });
    }

    const featureAccess = await getOrderDetailFeatureAccess(companyId);
    const hideCartAttribution = Boolean(merchant) || !featureAccess.campaignAttribution;

    // 🚧 تفاصيل السلة غير المكتملة تُقنّع بيانات العميل فيها عند وجود تعليق فوترة (billing hold)
    const includeHeld = req.query.includeHeld === 'true';
    const isBillingHold = !includeHeld && await companyHasActiveBillingHold(companyId);

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

    const cartAttribution = hideCartAttribution
      ? null
      : extractAttributionFromCheckoutData(checkoutData);

    const rawCheckoutData =
      hideCartAttribution && checkoutData && typeof checkoutData === 'object'
        ? stripAttributionFromCheckoutData(checkoutData)
        : checkoutData;

    const safeCheckoutData = isBillingHold
      ? maskCheckoutData(rawCheckoutData)
      : rawCheckoutData;

    const cartSessionDetails = checkoutData?.sessionDetails || (cartAttribution ? {
      trafficSource: {
        source: cartAttribution.source || 'direct',
        medium: cartAttribution.medium,
        campaignName: cartAttribution.campaignName,
        campaignId: cartAttribution.campaignId,
        adSetId: cartAttribution.adSetId,
        adId: cartAttribution.adId,
        referrer: cartAttribution.referrer,
        landingPath: cartAttribution.landingPath,
      },
      ip: null,
      pagesVisited: cartAttribution.landingPath ? [{ path: cartAttribution.landingPath, title: 'صفحة الهبوط', timestamp: cart.createdAt }] : [],
      durationSeconds: cart.checkoutStartedAt && cart.checkoutUpdatedAt ? Math.max(0, Math.round((new Date(cart.checkoutUpdatedAt) - new Date(cart.checkoutStartedAt)) / 1000)) : 0,
      sessionCount: 1,
      firstSeenAt: cart.checkoutStartedAt || cart.createdAt,
    } : null);

    const customerPhone = checkoutData?.phone || checkoutData?.guestPhone || checkoutData?.mobileNumber || '';
    const customerEmail = checkoutData?.email || checkoutData?.guestEmail || '';
    const firstOrderInfo = await getCustomerFirstOrderInfo(getSharedPrismaClient(), companyId, {
      phone: customerPhone,
      email: customerEmail,
    });

    res.json({
      success: true,
      data: {
        cartId: cart.cartId,
        items,
        itemsCount: Array.isArray(items) ? items.length : 0,
        total,
        checkoutData: safeCheckoutData,
        ...(cartAttribution ? { attribution: cartAttribution } : {}),
        sessionDetails: cartSessionDetails,
        firstOrderInfo,
        checkoutStartedAt: cart.checkoutStartedAt,
        checkoutUpdatedAt: cart.checkoutUpdatedAt,
        updatedAt: cart.updatedAt,
        expiresAt: cart.expiresAt,
        status: isLost ? 'lost' : 'incomplete',
        ...(isBillingHold ? { billingHold: true } : {}),
        abandonReason: detectAbandonReason(
          { ...cart, checkoutData: safeCheckoutData, status: isLost ? 'lost' : 'incomplete' },
          { lostAfterHours },
        ),
      },
      ...(isBillingHold ? { billingHold: true } : {})
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

// قفل تزامن للطلبات غير المكتملة أثناء التحويل لمنع التكرار
const activeIncompleteCartConversions = new Set();

// تحويل طلب غير مكتمل إلى طلب حقيقي
router.post('/incomplete/:cartId/convert', verifyToken.authenticateToken, async (req, res) => {
  let conversionKey = null;
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح - يجب تسجيل الدخول' });
    }

    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const cartId = (req.params.cartId || '').toString().trim();
    if (!cartId) {
      return res.status(400).json({ success: false, message: 'معرف السلة مطلوب' });
    }

    conversionKey = `${companyId}:${cartId}`;
    if (activeIncompleteCartConversions.has(conversionKey)) {
      return res.status(409).json({
        success: false,
        code: 'CONVERSION_IN_PROGRESS',
        message: 'جاري تحويل هذا الطلب بالفعل، يرجى الانتظار...'
      });
    }
    activeIncompleteCartConversions.add(conversionKey);

    // 🛡️ فحص عدم تكرار التحويل (Idempotency) في حال تم تحويل السلة مسبقاً
    const alreadyConverted = await getSharedPrismaClient().cartConversionLog.findFirst({
      where: { companyId, cartId }
    });
    if (alreadyConverted) {
      return res.status(409).json({
        success: false,
        code: 'CART_ALREADY_CONVERTED',
        message: 'تم تحويل هذه السلة إلى طلب بالفعل مسبقاً',
        orderNumber: alreadyConverted.orderNumber,
        orderId: alreadyConverted.orderId
      });
    }

    // 🚧 تحويل السلة غير المكتملة لطلب محظور أثناء وجود تعليق فوترة
    if (await companyHasActiveBillingHold(companyId)) {
      return res.status(402).json({
        success: false,
        code: 'BILLING_HOLD',
        message: 'لا يمكن تحويل الطلب لأن المتجر معلّق بسبب انخفاض رصيد المحفظة أو انتهاء الاشتراك. يرجى شحن الرصيد أولاً.'
      });
    }

    const cart = await getSharedPrismaClient().guestCart.findFirst({
      where: { companyId, cartId }
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'السلة غير موجودة' });
    }

    let checkoutData = {};
    try {
      checkoutData = cart.checkoutData
        ? (typeof cart.checkoutData === 'string' ? JSON.parse(cart.checkoutData) : cart.checkoutData)
        : {};
    } catch (e) {
      checkoutData = {};
    }

    let items = [];
    try {
      items = cart.items
        ? (typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items)
        : [];
    } catch (e) {
      items = [];
    }

    const guestName = checkoutData.guestName || checkoutData.fullName || checkoutData.customerName || checkoutData.name || 'عميل';
    const guestPhone = checkoutData.guestPhone || checkoutData.customerPhone || checkoutData.phoneNumber || checkoutData.mobileNumber || checkoutData.phone || checkoutData.mobile || '';
    const guestEmail = checkoutData.guestEmail || checkoutData.customerEmail || checkoutData.emailAddress || checkoutData.email || '';
    const governorate = checkoutData.governorate || checkoutData.city || checkoutData.gov || '';
    const address = checkoutData.address || checkoutData.street || checkoutData.addressLine1 || '';
    const notes = checkoutData.notes || '';

    if (!guestPhone) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب لتحويل الطلب' });
    }

    // 🛡️ فحص ما إذا كان العميل لديه طلب مسجل بالفعل خلال آخر 48 ساعة لمنع تكرار الأوردرات والشحنات
    const forceConvert = req.body?.force === true || req.body?.force === 'true' || req.query?.force === 'true';
    if (!forceConvert && guestPhone) {
      const cleanPhone = String(guestPhone)
        .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
        .replace(/\D/g, '')
        .slice(-10);

      if (cleanPhone && cleanPhone.length >= 8) {
        const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const existingOrder = await getSharedPrismaClient().order.findFirst({
          where: {
            companyId,
            customerPhone: { contains: cleanPhone },
            createdAt: { gte: since48h },
            status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED', 'TRASH', 'LOST'] }
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
            customerName: true
          },
          orderBy: { createdAt: 'desc' }
        });

        if (existingOrder) {
          return res.status(409).json({
            success: false,
            code: 'EXISTING_CUSTOMER_ORDER',
            message: `تنبيه: هذا العميل لديه طلب مسجل بالفعل برقم (${existingOrder.orderNumber}) بحالة [${existingOrder.status}] بتاريخ ${new Date(existingOrder.createdAt).toLocaleDateString('ar-EG')}. هل تريد المتابعة وإنشاء طلب مكرر؟`,
            existingOrder: {
              id: existingOrder.id,
              orderNumber: existingOrder.orderNumber,
              status: existingOrder.status,
              total: existingOrder.total,
              createdAt: existingOrder.createdAt
            }
          });
        }
      }
    }

    const total = typeof cart.total === 'string' ? parseFloat(cart.total) || 0 : Number(cart.total || 0);

    const cartAttribution = extractAttributionFromCheckoutData(checkoutData);

    const couponCode = req.body?.couponCode || checkoutData.couponCode || checkoutData.coupon?.code || cart.couponCode || undefined;
    const discountAmount = req.body?.discountAmount !== undefined
      ? Number(req.body.discountAmount)
      : (checkoutData.discountAmount !== undefined
        ? Number(checkoutData.discountAmount)
        : (cart.discountAmount !== undefined ? Number(cart.discountAmount) : undefined));
    const appliedDiscount = req.body?.appliedDiscount || checkoutData.appliedDiscount || undefined;
    const bundleItems = req.body?.bundleItems || checkoutData.bundleItems || cart.bundleItems || undefined;

    const resolvedItems = (Array.isArray(req.body?.items) && req.body.items.length > 0)
      ? req.body.items
      : items;

    const orderPayload = {
      guestName,
      guestPhone,
      guestEmail,
      paymentMethod: checkoutData.paymentMethod || 'cod',
      notes,
      shippingAddress: {
        governorate,
        city: checkoutData.city || governorate,
        street: address,
        address,
        addressLine1: address,
      },
      ...(resolvedItems && resolvedItems.length > 0 ? { items: resolvedItems } : {}),
      ...(couponCode ? { couponCode } : {}),
      ...(discountAmount !== undefined && !isNaN(discountAmount) ? { discountAmount } : {}),
      ...(appliedDiscount ? { appliedDiscount } : {}),
      ...(bundleItems ? { bundleItems } : {}),
      ...(cartAttribution ? { attribution: cartAttribution } : {}),
      _skipPixel: true,
    };

    const axios = require('axios');
    const internalPort = process.env.PORT || 3007;

    const createResponse = await axios.post(`http://127.0.0.1:${internalPort}/api/v1/public/orders?companyId=${encodeURIComponent(companyId)}`, orderPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-cart-id': cartId,
        'x-admin-convert': 'true',
      },
      timeout: 30000,
    });

    const result = createResponse.data;

    if (result?.success && result?.data) {
      // سجل أثر التحويل قبل حذف الـ GuestCart (بيتم الحذف جوه الـ internal API)
      // محاولة + إعادة محاولة واحدة — لو فشلت الاتنين نرجّع تحذير صريح في الرد
      // عشان التحويل مايختفيش من التقارير بصمت (الأوردر اتعمل لكن الـ log ضايع)
      let conversionLogError = null;
      try {
        const employee = req.user || {};
        await getSharedPrismaClient().cartConversionLog.create({
          data: {
            cartId,
            orderId: result.data?.id || null,
            orderNumber: result.data?.orderNumber || null,
            employeeId: employee.id || null,
            employeeName: employee.name || employee.username || employee.email || null,
            companyId,
            cartValue: total,
            governorate: governorate || null,
            channel: 'admin-convert',
          },
        });
      } catch (logError) {
        console.warn('⚠️ [ORDERS] Conversion log failed, retrying once:', logError.message);
        try {
          const employee = req.user || {};
          await getSharedPrismaClient().cartConversionLog.create({
            data: {
              cartId,
              orderId: result.data?.id || null,
              orderNumber: result.data?.orderNumber || null,
              employeeId: employee.id || null,
              employeeName: employee.name || employee.username || employee.email || null,
              companyId,
              cartValue: total,
              governorate: governorate || null,
              channel: 'admin-convert',
            },
          });
        } catch (retryError) {
          console.error('❌ [ORDERS] Failed to record cart conversion log after retry:', retryError.message);
          conversionLogError = retryError.message;
        }
      }

      return res.json({
        success: true,
        message: 'تم تحويل الطلب غير المكتمل إلى طلب حقيقي',
        data: result.data,
        ...(conversionLogError ? { conversionLogFailed: true, conversionLogError } : {}),
      });
    }

    throw new Error(result?.message || 'فشل إنشاء الطلب');
  } catch (error) {
    console.error('❌ Error converting incomplete order:', error.message);
    const detail = error.response?.data?.message || error.response?.data?.error || error.message;
    return res.status(500).json({
      success: false,
      message: detail || 'خطأ في تحويل الطلب غير المكتمل',
    });
  } finally {
    if (conversionKey) {
      activeIncompleteCartConversions.delete(conversionKey);
    }
  }
});

// تسجيل محاولة تواصل (اتصال/واتساب/إيميل) على سلة غير مكتملة
router.post('/incomplete/:cartId/contact', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح - يجب تسجيل الدخول' });
    }

    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const cartId = (req.params.cartId || '').toString().trim();
    if (!cartId) {
      return res.status(400).json({ success: false, message: 'معرف السلة مطلوب' });
    }

    const allowedMethods = ['call', 'whatsapp', 'email', 'dismissed'];
    let method = (req.body?.method || 'call').toString().toLowerCase();
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({ success: false, message: 'طريقة التواصل غير صالحة' });
    }

    const result = (req.body?.result || '').toString().trim().slice(0, 80) || null;
    const note = (req.body?.note || '').toString().trim().slice(0, 500) || null;
    const employee = req.user || {};

    if (result === 'cancelled' || req.body?.dismissCart === true) {
      method = 'dismissed';
    }

    const log = await getSharedPrismaClient().cartContactLog.create({
      data: {
        cartId,
        companyId,
        employeeId: employee.id || null,
        employeeName: employee.name || employee.username || employee.email || null,
        method,
        result,
        note,
      },
      select: { id: true, cartId: true, method: true, result: true, createdAt: true },
    });

    return res.json({ success: true, message: 'تم تسجيل محاولة التواصل', data: log });
  } catch (error) {
    console.error('❌ Error logging incomplete cart contact:', error.message);
    return res.status(500).json({ success: false, message: 'خطأ في تسجيل محاولة التواصل' });
  }
});

// استبعاد سلة متروكة من طابور الورك-سبيس — السبب إلزامي ويُحفظ في السجل
router.post('/incomplete/:cartId/dismiss', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح - يجب تسجيل الدخول' });
    }

    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const cartId = (req.params.cartId || '').toString().trim();
    if (!cartId) {
      return res.status(400).json({ success: false, message: 'معرف السلة مطلوب' });
    }

    const reason = (req.body?.reason || req.body?.note || '').toString().trim().slice(0, 500);
    if (!reason) {
      return res.status(400).json({ success: false, message: 'سبب الاستبعاد مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const cart = await prisma.guestCart.findFirst({ where: { cartId, companyId }, select: { id: true } });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'السلة غير موجودة' });
    }

    const result = (req.body?.result || 'cancelled').toString().trim().slice(0, 80);

    const log = await prisma.cartContactLog.create({
      data: {
        cartId,
        companyId,
        employeeId: req.user.id || null,
        employeeName: req.user.name || req.user.username || req.user.email || null,
        method: 'dismissed',
        result,
        note: reason,
      },
      select: { id: true, cartId: true, method: true, result: true, createdAt: true }
    });

    return res.json({ success: true, message: 'تم استبعاد السلة المتروكة', data: log });
  } catch (error) {
    console.error('❌ Error dismissing incomplete cart:', error.message);
    return res.status(500).json({ success: false, message: 'خطأ في استبعاد السلة' });
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
    const companyTimezone = await getCompanyTimezone(companyId);

    // إعدادات الطلبات: عرض السلال غير المكتملة داخل صفحة الطلبات
    let showIncompleteCarts = false;
    let lostAfterHours = 24;
    try {
      const settings = await orderService.getOrderSettings(companyId);
      showIncompleteCarts = Boolean(settings?.showIncompleteCartsInOrders);
      const parsedLost = parseInt(settings?.incompleteOrderLostAfterHours, 10);
      if (!Number.isNaN(parsedLost) && parsedLost > 0) {
        lostAfterHours = parsedLost;
      }
    } catch (settingsError) {
      console.warn('⚠️ [ORDERS] /simple failed to load order settings:', settingsError.message);
    }
    if (req.query.includeIncomplete === 'true') showIncompleteCarts = true;

    const nowSimple = new Date();
    const lostThreshold = new Date(nowSimple.getTime() - lostAfterHours * 60 * 60 * 1000);
    const cartActiveClause = {
      OR: [
        { checkoutUpdatedAt: { gte: lostThreshold } },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: { gte: lostThreshold } }] },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: null }, { updatedAt: { gte: lostThreshold } }] }
      ]
    };
    const cartLostClause = {
      OR: [
        { checkoutUpdatedAt: { lt: lostThreshold } },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: { lt: lostThreshold } }] },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: null }, { updatedAt: { lt: lostThreshold } }] }
      ]
    };

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
    const requestedMerchantIds = normalizeOrderRouteCode(req.query.merchantId) === 'ALL'
      ? []
      : String(req.query.merchantId || '').split(',').map((s) => s.trim()).filter(Boolean);
    const requestedFulfillmentSources = String(req.query.fulfillmentSource || '')
      .split(',').map((s) => normalizeOrderRouteCode(s)).filter(Boolean);
    const requestedMerchantOperationStatuses = String(req.query.merchantOperationStatus || '')
      .split(',').map((s) => normalizeOrderRouteCode(s)).filter(Boolean);
    const requestedMerchantSettlementStatuses = String(req.query.merchantSettlementStatus || '')
      .split(',').map((s) => normalizeOrderRouteCode(s)).filter(Boolean);

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

    // 🚧 الطلبات المعلّقة لسبب تحصيل الرصيد (billing hold) مخفية من القائمة
    // افتراضياً حتى يُشحن الرصيد ويتم الخصم تلقائياً. يمكن كشفها عبر includeHeld=true
    const includeHeldOrders = req.query.includeHeld === 'true';
    const companyHasBillingHold = !includeHeldOrders && await companyHasActiveBillingHold(companyId);
    if (!includeHeldOrders) {
      whereClause.billingHoldAt = null;
    }

    const appendAnd = (clause, condition) => {
      if (!condition) return;
      if (!clause.AND) clause.AND = [];
      clause.AND.push(condition);
    };

    const duplicateSettings = await orderService.getDuplicateSettings(companyId);

    addMerchantOrderScope(whereClause, merchant);
    disableGuestOrderScope(guestWhereClause, merchant);

    // 🕵️ Affiliate Filtering Logic (`affiliateId` may be a comma-separated list)
    let affiliateIds = String(req.query.affiliateId || '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    // 🔒 Security: If user is an AFFILIATE, enforce their own affiliateId
    if (req.user.role === 'AFFILIATE') {
      const affiliate = await getSharedPrismaClient().affiliate.findUnique({
        where: { userId: req.user.id }
      });
      if (affiliate) {
        affiliateIds = [affiliate.id];
      } else {
        // If user is affiliate role but no affiliate profile, return empty
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page, limit, pages: 0 }
        });
      }
    }

    if (affiliateIds.length > 0) {
      const affiliateFilter = affiliateIds.length === 1
        ? affiliateIds[0]
        : { in: affiliateIds };
      whereClause.affiliateId = affiliateFilter;
      guestWhereClause.affiliateId = affiliateFilter;
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
      resolvedAffiliateId: affiliateIds,
      merchantId: merchant?.id || null,
      requestedMerchantIds,
      requestedFulfillmentSources,
      requestedMerchantOperationStatuses,
      requestedMerchantSettlementStatuses,
      whereClause
    });

    const merchantOrderFilterConditions = [];
    const settlementFilterConditions = [];
    const queueMerchantOrderFilter = (condition) => {
      if (condition) merchantOrderFilterConditions.push(condition);
    };

    const merchantIdList = requestedMerchantIds.length > 0 ? requestedMerchantIds : null;

    if (!merchant && merchantIdList) {
      queueMerchantOrderFilter({ merchantId: { in: merchantIdList } });
    }

    const fulfillmentSources = requestedFulfillmentSources.filter(
      (s) => MERCHANT_FULFILLMENT_SOURCES.has(s)
    );
    if (fulfillmentSources.length > 0) {
      queueMerchantOrderFilter({ fulfillmentSource: { in: fulfillmentSources } });
    }

    const operationStatuses = requestedMerchantOperationStatuses.filter(
      (s) => MERCHANT_OPERATION_FILTERS.has(s)
    );
    if (operationStatuses.length > 0) {
      const operationWheres = operationStatuses
        .map(buildMerchantOperationWhere)
        .filter(Boolean);
      if (operationWheres.length === 1) {
        queueMerchantOrderFilter(operationWheres[0]);
      } else if (operationWheres.length > 1) {
        queueMerchantOrderFilter({ OR: operationWheres });
      }
    }

    // Settlement statuses combine with OR semantics across the underlying
    // conditions (each maps to a different merchantOrder/commission shape).
    const settlementStatuses = requestedMerchantSettlementStatuses.filter(
      (s) => MERCHANT_SETTLEMENT_FILTERS.has(s)
    );
    for (const settlementStatus of settlementStatuses) {
      switch (settlementStatus) {
        case 'PAID':
          settlementFilterConditions.push({
            commissions: {
              some: {
                merchantId: { not: null },
                status: 'PAID',
                ...(merchantIdList ? { merchantId: { in: merchantIdList } } : {})
              }
            }
          });
          break;
        case 'PAYABLE':
        case 'PENDING':
          settlementFilterConditions.push({
            commissions: {
              some: {
                merchantId: { not: null },
                status: { in: ['CONFIRMED', 'PENDING'] },
                ...(merchantIdList ? { merchantId: { in: merchantIdList } } : {})
              }
            }
          });
          break;
        case 'NOT_PAYABLE': {
          const notDeliveredWhere = buildMerchantOperationWhere('NOT_DELIVERED');
          if (notDeliveredWhere) {
            settlementFilterConditions.push({
              merchantOrders: { some: notDeliveredWhere }
            });
          }
          break;
        }
        default:
          break;
      }
    }

    if (merchantOrderFilterConditions.length > 0) {
      appendMerchantOrderFilter(whereClause, guestWhereClause, {
        AND: merchantOrderFilterConditions
      });
    }

    if (settlementFilterConditions.length > 0) {
      if (!whereClause.AND) whereClause.AND = [];
      whereClause.AND.push({ OR: settlementFilterConditions });
      blockGuestOrdersForMerchantFilters(guestWhereClause);
    }

    // 0. Filter by Viewed Status
    if (onlyUnseen) {
      whereClause.isViewed = false;
      guestWhereClause.isViewed = false;
    }

    // 0.1 Filter by Post-Purchase Offer
    if (req.query.onlyPostPurchaseOffer === 'true') {
      appendAnd(whereClause, {
        OR: [
          { metadata: { contains: 'postPurchaseOfferAccepted' } },
          { orderItems: { some: { metadata: { contains: 'isPostPurchaseOffer' } } } }
        ]
      });
      appendAnd(guestWhereClause, {
        OR: [
          { metadata: { contains: 'postPurchaseOfferAccepted' } },
          { items: { contains: 'isPostPurchaseOffer' } }
        ]
      });
    }

    // 1. Filter by Status (Safely handle Prisma OrderStatus enums, prep metadata,
    // and Turbo shipping aliases). `status` may be a comma-separated list so
    // users can combine multiple statuses at once.
    const knownCodes = getKnownStatusCodes();
    const {
      incompleteFilterStatus,
      realStatusList,
      plainEnumStatuses,
      customStatuses,
      turboAliasValues,
      guestStatusValues,
      ignored: ignoredStatuses
    } = parseStatusFilter(status, knownCodes);

    for (const raw of ignoredStatuses) {
      console.warn(`[ORDERS] Ignoring unrecognized status filter: "${raw}"`);
    }

    if (realStatusList.length > 0) {
      // Multiple statuses combine with OR semantics: an order matches if it has
      // ANY of the selected statuses, across order.status / prep metadata / turbo.
      const statusOrBranches = [];
      if (plainEnumStatuses.length > 0) {
        statusOrBranches.push({ status: { in: plainEnumStatuses } });
      }
      if (turboAliasValues.length > 0) {
        statusOrBranches.push({
          turboShipmentStatus: { in: [...new Set(turboAliasValues)], mode: 'insensitive' },
        });
      }
      if (customStatuses.length > 0) {
        // Prep/custom statuses are resolved to IDs via raw SQL later (they need
        // COALESCE(preparationStatus, status) matching), then merged into the OR.
        whereClause._customStatusFilter = customStatuses;
      }
      // 🛡️ PRODUCTION-FIX (status-filter-and): فروع الحالة بتتخزن مؤقتًا لحد ما
      // الفلتر المخصص يتحلّ (raw SQL) — وبعدين تتدمج كـ AND group مستقلة. قبل كده
      // كان البحث بيعمل Object.assign على OR فكان بيمسح فروع الحالة نهائيًا، والفلتر
      // المخصص كان بيتدمج جوّاه بـ OR بدل ما يقاطع باقي الفلاتر.
      if (statusOrBranches.length > 0) {
        whereClause._statusOrBranches = statusOrBranches;
      }

      // Guest orders carry statuses on a separate table — mirror the OR across
      // order.status and turboShipmentStatus.
      const guestStatusBranches = [];
      if (guestStatusValues.length > 0) {
        guestStatusBranches.push({ status: { in: [...new Set(guestStatusValues)] } });
      }
      if (turboAliasValues.length > 0) {
        guestStatusBranches.push({
          turboShipmentStatus: { in: [...new Set(turboAliasValues)], mode: 'insensitive' },
        });
      }
      if (guestStatusBranches.length === 1) {
        Object.assign(guestWhereClause, guestStatusBranches[0]);
      } else if (guestStatusBranches.length > 1) {
        guestWhereClause.OR = guestStatusBranches;
      }
    } else {
      whereClause.status = getVisibleRegularOrderStatusesFilter(duplicateSettings);
      guestWhereClause.status = getVisibleGuestOrderStatusesFilter(duplicateSettings);
    }
    const incompleteOnlyView = incompleteFilterStatus === 'incomplete' && showIncompleteCarts;
    if (incompleteOnlyView) {
      // عند الفلترة بـ "غير مكتمل" نعرض السلال النشطة فقط (بدون طلبات حقيقية)
      whereClause.id = '__incomplete_carts_only__';
      guestWhereClause.id = '__incomplete_carts_only__';
    }
    if (incompleteFilterStatus === 'incomplete' && !showIncompleteCarts) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page, limit, pages: 0 },
        meta: { showIncompleteCartsInOrders: false, ...(companyHasBillingHold ? { billingHold: true } : {}) }
      });
    }

    // 2. Filter by Payment Status (may be a comma-separated list)
    if (paymentStatus && paymentStatus !== 'all') {
      const paymentStatuses = String(paymentStatus)
        .split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      whereClause.paymentStatus = paymentStatuses.length === 1
        ? paymentStatuses[0]
        : { in: paymentStatuses };
      // Guest orders do not persist a payment-status field in the current Prisma client,
      // so including them in filtered payment views produces misleading results.
      appendAnd(guestWhereClause, {
        id: '__guest_orders_do_not_support_payment_status_filter__'
      });
    }

    // 3. Filter by Date Range (Timezone-aware)
    if (startDate || endDate) {
      const dateRangeFilter = buildDateRangeFilter(startDate, endDate, companyTimezone);
      if (dateRangeFilter.gte || dateRangeFilter.lte) {
        whereClause.createdAt = dateRangeFilter;
        guestWhereClause.createdAt = dateRangeFilter;
      }
    }

    // 4. Search (Complex because it spans multiple fields)
    if (search) {
      const searchTerms = String(search).trim();
      const words = searchTerms.split(/\s+/).filter(Boolean);

      // Helper function to generate variations of Egypt/generic phone numbers to match stored phone format in database
      const getPhoneVariations = (input) => {
        if (!input) return [];
        const rawStr = String(input);
        const toEnglishDigits = (str) => String(str || '')
          .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
          .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
        const toArabicDigits = (str) => {
          const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
          return String(str || '').replace(/[0-9]/g, d => ar[Number(d)]);
        };

        const convertedInput = toEnglishDigits(rawStr);
        const clean = convertedInput.replace(/\D/g, '');
        if (!clean) return [];
        const variations = new Set([clean, convertedInput, rawStr]);
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

        // Add Arabic/Indic digits counterpart for every variation so database matches either representation
        const allVariations = Array.from(variations);
        allVariations.forEach(v => {
          const ar = toArabicDigits(v);
          if (ar) variations.add(ar);
        });

        return Array.from(variations);
      };

      const phoneVariations = getPhoneVariations(searchTerms);

      // Base fields that we search with "contains" for regular orders
      const regularOrFields = [
        { orderNumber: { contains: searchTerms, mode: 'insensitive' } },
        { turboTrackingNumber: { contains: searchTerms, mode: 'insensitive' } },
        { turboShipmentId: { contains: searchTerms, mode: 'insensitive' } },
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
        { turboTrackingNumber: { contains: searchTerms, mode: 'insensitive' } },
        { turboShipmentId: { contains: searchTerms, mode: 'insensitive' } },
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

    // 5. Filter by Source Type (مصدر الطلب) — may be a comma-separated list
    const sourceTypes = String(sourceType || '')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (sourceTypes.length > 0) {
      const regularSourceConditions = sourceTypes
        .map(buildRegularSourceCondition)
        .filter(Boolean);
      if (regularSourceConditions.length === 1) {
        appendAnd(whereClause, regularSourceConditions[0]);
      } else if (regularSourceConditions.length > 1) {
        appendAnd(whereClause, { OR: regularSourceConditions });
      }
      // Guests are storefront by default; any non-storefront source excludes them.
      const excludesGuests = sourceTypes.some((s) => s !== 'storefront');
      if (excludesGuests) {
        appendAnd(guestWhereClause, { id: '__none__' });
      }
    }

    // بناء فلتر السلال غير المكتملة (guestCart) — تُدمج في القائمة عند تفعيل الإعداد (وتُشفر بيانات العميل عند وجود تعليق فوترة)
    const includeIncompleteCarts =
      showIncompleteCarts &&
      !onlyUnseen &&
      (!status || String(status).toLowerCase() === 'all' || Boolean(incompleteFilterStatus));
    let cartQueryWhere = null;
    if (includeIncompleteCarts) {
      cartQueryWhere = { companyId };
      const cartAnd = [];
      if (incompleteFilterStatus === 'incomplete') {
        cartAnd.push(cartActiveClause);
      } else if (incompleteFilterStatus === 'lost') {
        cartAnd.push(cartLostClause);
      }
      // فقط السلال غير المكتملة اللي فيها رقم تلفون فعلي (غير فارغ) تظهر في القائمة
      // — نفس منطق فلتر hasPhone الموجود في /incomplete
      const PHONE_KEYS = ['guestPhone', 'customerPhone', 'phoneNumber', 'mobileNumber', 'phone', 'mobile'];
      const phoneKeyClause = { OR: PHONE_KEYS.map((k) => ({ checkoutData: { contains: `"${k}"` } })) };
      const emptyPhoneClause = { OR: PHONE_KEYS.map((k) => ({ checkoutData: { contains: `"${k}":""` } })) };
      cartAnd.push({ AND: [phoneKeyClause, { NOT: emptyPhoneClause }] });
      if (search) {
        const searchTerms = String(search).trim();
        if (searchTerms) {
          cartAnd.push({
            OR: [
              { cartId: { contains: searchTerms } },
              { checkoutData: { contains: searchTerms } }
            ]
          });
        }
      }
      if (startDate || endDate) {
        const cartDateRangeFilter = buildDateRangeFilter(startDate, endDate, companyTimezone);
        if (cartDateRangeFilter.gte || cartDateRangeFilter.lte) {
          cartAnd.push({ createdAt: cartDateRangeFilter });
        }
      }
      // استبعاد السلال اللي اتحولت بالفعل لطلب حقيقي (فشل حذفها وقت التحويل)
      // حتى لا تظهر السلة + الطلب المحول كسطرين متكررين في القائمة.
      try {
        const convertedCarts = await getSharedPrismaClient().cartConversionLog.findMany({
          where: {
            companyId,
            convertedAt: { gte: lostThreshold }
          },
          select: { cartId: true },
          distinct: ['cartId']
        });
        const convertedCartIds = convertedCarts
          .map((c) => c.cartId)
          .filter(Boolean);
        if (convertedCartIds.length > 0) {
          cartAnd.push({ cartId: { notIn: convertedCartIds } });
        }
      } catch (convErr) {
        console.warn('⚠️ [ORDERS] Failed to load converted cart ids:', convErr.message);
      }
      if (cartAnd.length > 0) {
        cartQueryWhere.AND = cartAnd;
      }
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

    // ── Custom status filter (BDONKODTERBO etc.) ──────────────────────
    // Prisma's typed enum rejects values not in the OrderStatus enum,
    // so we fetch IDs via raw SQL first, then use typed Prisma queries.
    const customStatusFilter = whereClause._customStatusFilter;
    let customStatusOrderIds = null;

    if (Array.isArray(customStatusFilter) && customStatusFilter.length > 0) {
      delete whereClause._customStatusFilter;
      const prisma = getSharedPrismaClient();
      // Prep statuses are stored under their mapped order.status while the real
      // stage lives in metadata.preparationStatus — match both so filtering by
      // e.g. PREPARING also finds orders persisted as PROCESSING.
      // 🛡️ PRODUCTION-FIX (custom-status-persist): الحالة الفعلية بقت بتتخزن في
      // customStatusCode — الأولوية ليها، وبعدين مرحلة التجهيز، وبعدين الـ enum.
      // But exclude orders whose order.status is already terminal (e.g.
      // DELIVERED) — their stale metadata.preparationStatus from the prep phase
      // must not pull them back into a prep-stage filter.
      // Map preparationStatus to its regular order.status equivalent (same as getMappedRegularOrderStatus).
      // 🛡️ PRODUCTION-FIX (custom-status-persist): التعبير مستورد من utils/orderEffectiveStatus
      // عشان يفضل متطابق مع الإحصائيات وأي استخدام تاني للحالة الفعلية.
      const effectiveStatusExpr = EFFECTIVE_ORDER_STATUS_SQL;
      const statusIsTerminalExpr = `UPPER("status"::text) IN ('SHIPPED','DELIVERED','CANCELLED','RETURNED','REFUNDED','PARTIALLY_RETURNED','PARTIALLY_REFUNDED','EXCHANGED','DUPLICATE_ORDER','TRASH','LOST')`;
      const statusPlaceholders = customStatusFilter
        .map((_, index) => `$${index + 2}`)
        .join(', ');
      // 🛡️ PRODUCTION-FIX (custom-status-terminal): كود مخصص **محفوظ** على الطلب
      // (وضعه التاجر صراحةً) لازم يطابق الفلتر حتى لو الـ enum النهائي terminal —
      // الحاجز النهائي مصمم لاستثناء بيانات التجهيز القديمة، مش لإخفاء حالة التاجر
      // (مثال حقيقي: WITH_THE_CAPTAIN ماب على SHIPPED — كانت بتختفي من الفلتر).
      const matchExpr = `(
        ("customStatusCode" IS NOT NULL AND "customStatusCode" <> '' AND UPPER("customStatusCode") IN (${statusPlaceholders}))
        OR
        (UPPER(${effectiveStatusExpr}) IN (${statusPlaceholders}) AND NOT (${statusIsTerminalExpr}))
      )`;
      // 🛡️ PRODUCTION-FIX (custom-filter-count): مفيش حاجة محتاجة count خام هنا —
      // العدّ النهائي بيتم بـ order.count على whereClause الكاملة (أدق مع كل الفلاتر).
      let fetchSql = `SELECT id FROM "orders" WHERE "companyId" = $1 AND ${matchExpr}`;
      const params = [companyId, ...customStatusFilter];
      if (whereClause.createdAt?.gte) {
        fetchSql += ` AND "createdAt" >= $${params.length + 1}`;
        params.push(whereClause.createdAt.gte);
      }
      if (whereClause.createdAt?.lte) {
        fetchSql += ` AND "createdAt" <= $${params.length + 1}`;
        params.push(whereClause.createdAt.lte);
      }
      // 🛡️ لا تقيّد جلب المعرّفات بـ fetchLimit الصفحة (40) حتى لا ينحصر العدّ الكلي
      // في order.count({ where: whereClause }) على 40 فقط بدل إجمالي الطلبات الحقيقية.
      fetchSql += ` ORDER BY "createdAt" DESC LIMIT 10000`;
      const rows = await prisma.$queryRawUnsafe(fetchSql, ...params);
      customStatusOrderIds = rows.map(r => r.id);
    }

    // ── Materialize status branches (enum / turbo / custom) as one AND group ──
    // 🛡️ PRODUCTION-FIX (status-filter-and): دمج نهائي لفروع الحالة بعد حلّ الفلتر
    // المخصص — OR بين فروع الحالة نفسها، وAND مع باقي الفلاتر (بحث/دفع/تواريخ).
    const statusOrBranches = whereClause._statusOrBranches;
    delete whereClause._statusOrBranches;
    if (customStatusOrderIds !== null || Array.isArray(statusOrBranches)) {
      const branches = [...(Array.isArray(statusOrBranches) ? statusOrBranches : [])];
      if (customStatusOrderIds !== null) {
        branches.push({ id: { in: customStatusOrderIds } });
      }
      if (branches.length === 1) {
        Object.assign(whereClause, branches[0]);
      } else if (branches.length > 1) {
        whereClause.AND = [
          ...(Array.isArray(whereClause.AND) ? whereClause.AND : []),
          { OR: branches }
        ];
      }
    }

    const [regularOrders, guestOrders, totalRegular, totalGuest] = await Promise.all([
      // Fetch Regular Orders
      getSharedPrismaClient().order.findMany({
        where: whereClause,
        take: fetchLimit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true, customerRating: true, successScore: true, deliveryRate: true, totalDelivered: true, totalOrdersCount: true }
          },
          orderItems: {
            include: {
              product: { select: { id: true, name: true, images: true, mainImage: true } },
              productVariant: { select: { id: true, name: true, sku: true, images: true, metadata: true } }
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
          shipments: {
            select: {
              id: true,
              carrierType: true,
              trackingNumber: true,
              status: true,
              labelUrl: true,
              externalShipmentId: true,
              cost: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          ...buildScopedMerchantOrderInclude(merchant)
        }
      }),
      // Fetch Guest Orders
      getSharedPrismaClient().guestOrder.findMany({
        where: guestWhereClause,
        take: fetchLimit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
      }),
      // Count Total Regular (for pagination metadata)
      // 🛡️ PRODUCTION-FIX (custom-filter-count): بعد دمج الفلتر المخصص في whereClause
      // (id.in) الـ count العادي بقا صحيح دايمًا ومع كل الفلاتر — قبل كده كان بيتجاهل
      // بحث/دفع/تعيين فكان عدّاد الباجينيشن بيكبر غلط.
      getSharedPrismaClient().order.count({ where: whereClause }),
      // Count Total Guest (for pagination metadata)
      getSharedPrismaClient().guestOrder.count({ where: guestWhereClause })
    ]);

    // ── Guest↔Regular reconciliation ─────────────────────────────────────
    // A converted/confirmed guest keeps its guest_orders row with a STALE
    // status (usually PENDING). Once a regular order exists with the same
    // number, the regular row owns the lifecycle: display ITS effective
    // status, and drop the twin from status-filtered results when it no
    // longer matches — otherwise stale PENDING twins pollute filters like
    // ?status=pending with orders whose real status is CANCELLED/PACKAGED.
    const guestTwinNumbers = [
      ...new Set(
        guestOrders.map((g) => String(g.orderNumber || '').trim()).filter(Boolean)
      ),
    ];
    const regularTwinsByNumber = new Map();
    if (guestTwinNumbers.length > 0) {
      const twinRows = await getSharedPrismaClient().order.findMany({
        where: {
          companyId,
          orderNumber: { in: guestTwinNumbers, mode: 'insensitive' },
        },
        select: {
          orderNumber: true,
          status: true,
          customStatusCode: true,
          metadata: true,
          billingHoldAt: true,
          turboShipmentStatus: true,
          turboReturnReason: true,
          turboDelayReason: true,
          turboTrackingNumber: true
        },
      });
      for (const t of twinRows) {
        regularTwinsByNumber.set(String(t.orderNumber).trim().toLowerCase(), t);
      }
    }
    const activeStatusFilterUpper = [...plainEnumStatuses, ...customStatuses];
    const hasActiveStatusFilter = activeStatusFilterUpper.length > 0;
    let reconciledGuestsRemoved = 0;

    // ── السلال غير المكتملة (guestCart) ─────────────────────────────
    let formattedIncompleteCarts = [];
    let totalIncomplete = 0;
    if (cartQueryWhere) {
      const [carts, cartCount] = await Promise.all([
        getSharedPrismaClient().guestCart.findMany({
          where: cartQueryWhere,
          take: fetchLimit,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
        }),
        getSharedPrismaClient().guestCart.count({ where: cartQueryWhere })
      ]);
      totalIncomplete = cartCount || 0;
      formattedIncompleteCarts = carts.map((cart) => formatIncompleteCartRow(cart, lostThreshold, companyHasBillingHold));
    }

    let shadowedGuestOrderNumberSet = new Set();
    let shadowedGuestTotal = 0;
    // Global count of stale guest twins whose regular counterpart's effective
    // status no longer matches the requested status filter (see reconciliation
    // note below). Computed over ALL matching guests so pagination stays right.
    let reconciledGuestsRemovedGlobal = 0;
    // Distinct matching-guest numbers that SURVIVE twin reconciliation — used
    // as the authoritative guest side of totals when a status filter is active.
    let reconciledSurvivorGuestCount = 0;

    const normalizeOrderKey = (value) => String(value || '').trim().toLowerCase();

    // Guest rows keyed by number + shared effective-status rule (handler scope
    // so both the totals block and the response formatter use one definition):
    // own metadata.preparationStatus (mapped) → regular twin's prep/status →
    // stale guest_orders.status column.
    const guestsByNumber = new Map();
    const prepFromMeta = (m) => {
      try {
        const p = typeof m === 'string' ? JSON.parse(m) : m;
        return p?.preparationStatus || null;
      } catch (e) {
        return null;
      }
    };
    const effectiveCodeForGuest = (numKey) => {
      const g = guestsByNumber.get(numKey);
      const t = regularTwinsByNumber.get(numKey);
      // 🛡️ PRODUCTION-FIX (custom-status-persist): كود الحالة المخصصة للتوأم العادي
      // (لو موجود) له الأولوية — قبل كده كان بيضيع فكان الضيف الشبح بيعرض حالة قديمة.
      if (t?.customStatusCode) return String(t.customStatusCode).toUpperCase();
      const prep = t ? prepFromMeta(t.metadata) : prepFromMeta(g?.metadata);
      const rawStatus = String((t ? t.status : g?.status) || '').toUpperCase();
      const turboStatus = String((t ? t.turboShipmentStatus : g?.turboShipmentStatus) || '').toLowerCase();
      if (['returned_to_company', 'returned_received', 'returned_resent', 'returned_missing', 'returned_destroyed', '5', '10', '11', '12', '20'].includes(turboStatus)) {
        return 'RETURNED';
      }
      return rawStatus;
    };

    if (totalGuest > 0) {
      const filteredGuestOrderNumberRows = await getSharedPrismaClient().guestOrder.findMany({
        where: guestWhereClause,
        distinct: ['orderNumber'],
        select: {
          orderNumber: true,
          status: true,
          metadata: true,
          turboShipmentStatus: true,
          turboReturnReason: true,
          turboDelayReason: true
        }
      });

      const filteredGuestOrderNumbers = filteredGuestOrderNumberRows
        .map((order) => (typeof order.orderNumber === 'string' ? order.orderNumber.trim() : ''))
        .filter(Boolean);

      // Guest rows keyed by number — used by the shared effective-status rule.
      for (const g of filteredGuestOrderNumberRows) {
        guestsByNumber.set(normalizeOrderKey(g.orderNumber), g);
      }

      if (filteredGuestOrderNumbers.length > 0) {
        const matchingRegularOrderNumbers = await getSharedPrismaClient().order.findMany({
          where: {
            companyId,
            // mode insensitive عشان يمسك نفس الرقم بصيغ مختلفة (حروف كبيرة/صغيرة)
            orderNumber: { in: filteredGuestOrderNumbers, mode: 'insensitive' }
          },
          distinct: ['orderNumber'],
          select: {
            orderNumber: true,
            status: true,
            customStatusCode: true,
            metadata: true
          }
        });

        const regularNormalizedKeys = new Set(
          matchingRegularOrderNumbers.map((order) => normalizeOrderKey(order.orderNumber))
        );

        // نحتفظ بأرقام الضيف اللي ليها مقابل في جدول الطلبات العادية (normalized)
        shadowedGuestOrderNumberSet = new Set(
          filteredGuestOrderNumbers
            .filter((n) => regularNormalizedKeys.has(normalizeOrderKey(n)))
            .map((n) => normalizeOrderKey(n))
        );

        // Global reconciliation: compute how MANY matching guest numbers
        // survive the shared effective-status rule (own prep → twin prep/status
        // → stale guest status). Survivors must match the requested filter.
        let survivorGuestNumbers = 0;
        if (hasActiveStatusFilter) {
          for (const num of filteredGuestOrderNumbers) {
            const key = normalizeOrderKey(num);
            // إذا كان للطلب الضيف توأم عادي، فهو محسوب بالفعل في totalRegular إذا كان يطابق الفلتر
            if (shadowedGuestOrderNumberSet.has(key)) {
              continue;
            }
            const eff = effectiveCodeForGuest(key);
            if (activeStatusFilterUpper.includes(eff)) {
              survivorGuestNumbers += 1;
            } else {
              reconciledGuestsRemovedGlobal += 1;
            }
          }
        } else {
          survivorGuestNumbers = filteredGuestOrderNumbers.filter((n) => !shadowedGuestOrderNumberSet.has(normalizeOrderKey(n))).length;
        }
        reconciledSurvivorGuestCount = survivorGuestNumbers;

        if (shadowedGuestOrderNumberSet.size > 0) {
          shadowedGuestTotal = await getSharedPrismaClient().guestOrder.count({
            where: {
              AND: [
                guestWhereClause,
                {
                  orderNumber: {
                    in: Array.from(shadowedGuestOrderNumberSet),
                    mode: 'insensitive'
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

    // 🏷️ جلب إحصائيات تقييم وصحة العملاء الحقيقية (Real Customer Health Stats Engine)
    const allPhones = [...new Set([
      ...regularOrders.map(o => o.customerPhone || o.customer?.phone).filter(Boolean),
      ...guestOrders.map(o => o.guestPhone).filter(Boolean)
    ])];
    const allCustomerIds = [...new Set(regularOrders.map(o => o.customerId || o.customer?.id).filter(Boolean))];

    const guestCustomerByPhone = new Map();
    const statsByPhone = new Map();
    const statsByCustomerId = new Map();

    try {
      const prismaClient = getSharedPrismaClient();
      const promises = [];

      if (allPhones.length > 0) {
        promises.push(
          prismaClient.customer.findMany({
            where: { companyId, phone: { in: allPhones } },
            select: { id: true, phone: true, customerRating: true, successScore: true, deliveryRate: true, totalDelivered: true, totalOrdersCount: true }
          }).then(found => {
            found.forEach(c => {
              if (c.phone) guestCustomerByPhone.set(c.phone, c);
            });
          }).catch(err => {
            console.warn('⚠️ [ORDERS] Failed to batch fetch customers by phone:', err.message);
          })
        );

        promises.push(
          prismaClient.order.groupBy({
            by: ['customerPhone', 'status'],
            where: { companyId, customerPhone: { in: allPhones } },
            _count: { id: true }
          }).then(groups => {
            groups.forEach(g => {
              if (!g.customerPhone) return;
              if (!statsByPhone.has(g.customerPhone)) {
                statsByPhone.set(g.customerPhone, { delivered: 0, returned: 0, cancelled: 0, inFlight: 0, total: 0 });
              }
              const rec = statsByPhone.get(g.customerPhone);
              const count = g._count.id;
              rec.total += count;
              const st = String(g.status || '').toUpperCase();
              if (st === 'DELIVERED') rec.delivered += count;
              else if (st === 'PARTIALLY_DELIVERED') { rec.delivered += count * 0.5; rec.returned += count * 0.5; }
              else if (st === 'RETURNED') rec.returned += count;
              else if (st === 'PARTIALLY_RETURNED') { rec.delivered += count * 0.5; rec.returned += count * 0.5; }
              else if (st === 'CANCELLED') rec.cancelled += count;
              else rec.inFlight += count;
            });
          }).catch(err => {
            console.warn('⚠️ [ORDERS] Failed to group orders by phone:', err.message);
          })
        );
      }

      if (allCustomerIds.length > 0) {
        promises.push(
          prismaClient.order.groupBy({
            by: ['customerId', 'status'],
            where: { companyId, customerId: { in: allCustomerIds } },
            _count: { id: true }
          }).then(groups => {
            groups.forEach(g => {
              if (!g.customerId) return;
              if (!statsByCustomerId.has(g.customerId)) {
                statsByCustomerId.set(g.customerId, { delivered: 0, returned: 0, cancelled: 0, inFlight: 0, total: 0 });
              }
              const rec = statsByCustomerId.get(g.customerId);
              const count = g._count.id;
              rec.total += count;
              const st = String(g.status || '').toUpperCase();
              if (st === 'DELIVERED') rec.delivered += count;
              else if (st === 'PARTIALLY_DELIVERED') { rec.delivered += count * 0.5; rec.returned += count * 0.5; }
              else if (st === 'RETURNED') rec.returned += count;
              else if (st === 'PARTIALLY_RETURNED') { rec.delivered += count * 0.5; rec.returned += count * 0.5; }
              else if (st === 'CANCELLED') rec.cancelled += count;
              else rec.inFlight += count;
            });
          }).catch(err => {
            console.warn('⚠️ [ORDERS] Failed to group orders by customerId:', err.message);
          })
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (batchErr) {
      console.warn('⚠️ [ORDERS] Failed in batch customer health aggregation:', batchErr.message);
    }

    // ⭐ الدالة المركزية لاحتساب مؤشر صحة العميل الحقيقي (0.0 - 10.0)
    const resolveOrderHealthStats = (order, customer) => {
      const isDuplicate = order.status === 'DUPLICATE_ORDER' || Boolean(order.metadata?.duplicate);
      const phone = order.customerPhone || customer?.phone || order.guestPhone;
      const custId = order.customerId || customer?.id;

      const phoneStat = phone ? statsByPhone.get(phone) : null;
      const idStat = custId ? statsByCustomerId.get(custId) : null;

      const chosen = (phoneStat && (!idStat || phoneStat.total >= idStat.total))
        ? phoneStat
        : (idStat || phoneStat || { delivered: 0, returned: 0, cancelled: 0, inFlight: 0, total: 0 });

      let delivered = chosen.delivered;
      let total = chosen.total;
      let returned = chosen.returned;
      let cancelled = chosen.cancelled;

      if (total === 0 && customer?.totalOrdersCount > 0) {
        total = customer.totalOrdersCount;
        delivered = customer.totalDelivered || 0;
        if (delivered > 0 && customer.deliveryRate > 0 && customer.deliveryRate <= 100) {
          const estAttempts = Math.round((delivered * 100) / customer.deliveryRate);
          returned = Math.max(0, estAttempts - delivered);
        } else {
          returned = 0;
        }
      }

      const attempts = delivered + returned;
      let deliveryRate = null;
      let score = null;
      let diagnosis = 'عميل جديد — لم تكتمل له شحنات سابقة بعد';
      let ratingTier = 'UNKNOWN';

      if (isDuplicate) {
        score = 3.3;
        ratingTier = 'POOR';
        diagnosis = 'تحذير: طلب مكرر لنفس العميل — نسبة مخاطرة مرتفعة';
      } else if (attempts > 0) {
        const rate = delivered / attempts;
        deliveryRate = Math.round(rate * 1000) / 10;

        let s;
        if (delivered === 0) {
          s = Math.max(1.5, 2.8 - returned * 0.5);
        } else if (returned === 0) {
          s = (delivered + 1.125) / (attempts + 1.5) * 10;
        } else {
          const base = (delivered + 1.125) / (attempts + 1.5) * 10;
          const penalty = (1 - rate) * 1.8;
          s = base - penalty;
        }

        score = Math.min(9.9, Math.max(1.0, Math.round(s * 10) / 10));

        if (score >= 8.0) {
          ratingTier = 'EXCELLENT';
          diagnosis = `سجل استلام ممتاز (${Math.round(deliveryRate)}%) — ${Math.floor(delivered)} من ${Math.round(attempts)} طلب`;
        } else if (score >= 7.0) {
          ratingTier = 'GOOD';
          diagnosis = `سجل استلام جيد (${Math.round(deliveryRate)}%) — ${Math.floor(delivered)} من ${Math.round(attempts)} طلب`;
        } else if (score >= 5.0) {
          ratingTier = 'AVERAGE';
          diagnosis = `سجل استلام متوسط (${Math.round(deliveryRate)}%) — ${returned > 0 ? `${returned} مرتجع سابق` : ''}`;
        } else {
          ratingTier = 'POOR';
          diagnosis = `تحذير: مخاطرة مرتفعة (${Math.round(deliveryRate)}%) — ${returned} مرتجع سابق`;
        }
      }

      return {
        healthScore: score,
        healthDiagnosis: diagnosis,
        deliveryRate,
        totalDelivered: Math.floor(delivered),
        totalFailed: Math.ceil(returned),
        totalCancelled: cancelled,
        totalAttempts: Math.round(attempts),
        totalOrdersCount: Math.max(1, total),
        customerRating: ratingTier
      };
    };


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

      const getMappedRegularOrderStatus = (preparationStatus) => {
        if (preparationStatus === 'PENDING_PREPARATION') return 'CONFIRMED';
        if (['STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK'].includes(preparationStatus)) return 'STOCK_SHORTAGE';
        if (preparationStatus === 'ON_HOLD_PREP') return 'ON_HOLD_PREP';
        return 'PROCESSING';
      };
      // 🛡️ PRODUCTION-FIX (custom-status-persist): الحالة الفعلية = الكود المخصص لو
      // موجود، وإلا مرحلة التجهيز، وإلا الـ enum. قبل كده الكود المخصص كان بيضيع
      // والتفاصيل بترجع الحالة النظامية الماب عليها فكانت شكلها "مش متطبقة".
      const effectiveStatus = (
        order.customStatusCode
          ? order.customStatusCode
          : orderMetadata?.preparationStatus
            ? getMappedRegularOrderStatus(orderMetadata.preparationStatus)
            : order.status || 'PENDING'
      ).toLowerCase();

      const healthStats = resolveOrderHealthStats(order, order.customer);
      return applyOrderDetailFeatureAccess({
        id: order.orderNumber,
        orderNumber: order.orderNumber,
        customerId: order.customerId || order.customer?.id || null,
        customerRating: healthStats.customerRating || order.customer?.customerRating || 'UNKNOWN',
        customerSuccessScore: healthStats.healthScore,
        customerDeliveryRate: healthStats.deliveryRate,
        healthScore: healthStats.healthScore,
        healthDiagnosis: healthStats.healthDiagnosis,
        deliveryRate: healthStats.deliveryRate,
        totalDelivered: healthStats.totalDelivered,
        totalFailed: healthStats.totalFailed,
        totalCancelled: healthStats.totalCancelled,
        totalAttempts: healthStats.totalAttempts,
        totalOrdersCount: healthStats.totalOrdersCount,
        customer: order.customer ? {
          id: order.customer.id,
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          phone: order.customer.phone,
          email: order.customer.email,
          customerRating: healthStats.customerRating || order.customer.customerRating || 'UNKNOWN',
          healthScore: healthStats.healthScore,
          deliveryRate: healthStats.deliveryRate ?? order.customer.deliveryRate ?? null,
          totalDelivered: healthStats.totalDelivered,
          totalOrdersCount: healthStats.totalOrdersCount,
        } : null,
        customerName: finalCustomerName,
        customerPhone: order.customerPhone || order.customer?.phone || '',
        customerEmail: order.customerEmail || order.customer?.email || '',
        customerAddress: order.customerAddress || '',
        city: order.city || '',
        governorate: order.governorate || '',
        total: order.total,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        discount: Number(order.discount || 0),
        discountReason: resolveDiscountReason(order, orderMetadata),
        needsDiscountApproval: Boolean(orderMetadata?.needsDiscountApproval),
        discountApprovalStatus: orderMetadata?.discountApprovalStatus || null,
        discountApprovedBy: orderMetadata?.discountApprovedBy || null,
        discountApprovedAt: orderMetadata?.discountApprovedAt || null,
        discountRejectedBy: orderMetadata?.discountRejectedBy || null,
        discountRejectedAt: orderMetadata?.discountRejectedAt || null,
        discountRejectionReason: orderMetadata?.discountRejectionReason || null,
        status: effectiveStatus,
        paymentStatus: derivePaymentStatusForDisplay(order, orderMetadata),
        paymentMethod: (order.paymentMethod || 'CASH').toLowerCase().replace('_', '_on_'),
        shippingAddress: shippingAddress,
        items: Array.isArray(order.orderItems) && order.orderItems.length > 0 ? order.orderItems.map(item => {
          let parsedMetadata = {};
          try {
            parsedMetadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {});
          } catch (_) {
            parsedMetadata = {};
          }
          const vMeta = (() => {
            if (!item.productVariant?.metadata) return {};
            try {
              return typeof item.productVariant.metadata === 'string' ? JSON.parse(item.productVariant.metadata) : item.productVariant.metadata;
            } catch (_) { return {}; }
          })();
          const vAttrs = vMeta?.attributeValues || vMeta?.attributes || vMeta || {};
          const metaAttrs = parsedMetadata?.attributeValues || parsedMetadata?.attributes || {};

          let resolvedColor =
            item.productColor ||
            parsedMetadata.productColor ||
            parsedMetadata.color ||
            parsedMetadata.Color ||
            metaAttrs.Color ||
            metaAttrs.color ||
            metaAttrs['اللون'] ||
            metaAttrs['لون'] ||
            vAttrs.Color ||
            vAttrs.color ||
            vAttrs['اللون'] ||
            vAttrs['لون'] ||
            item.productVariant?.color ||
            '';

          let resolvedSize =
            item.productSize ||
            parsedMetadata.productSize ||
            parsedMetadata.size ||
            parsedMetadata.Size ||
            metaAttrs.Size ||
            metaAttrs.size ||
            metaAttrs['المقاس'] ||
            metaAttrs['مقاس'] ||
            vAttrs.Size ||
            vAttrs.size ||
            vAttrs['المقاس'] ||
            vAttrs['مقاس'] ||
            item.productVariant?.size ||
            '';

          if ((!resolvedColor || !resolvedSize) && item.productVariant?.name) {
            const vName = item.productVariant.name;
            const parts = vName.split(/\s*[-–|\/]\s*/).map(p => p.trim());
            if (parts.length >= 2) {
              if (!resolvedColor && isNaN(parts[0])) resolvedColor = parts[0];
              if (!resolvedSize) resolvedSize = parts[parts.length - 1];
            } else if (parts.length === 1 && !resolvedColor && !resolvedSize) {
              if (item.productVariant.type === 'color') resolvedColor = parts[0];
              else if (item.productVariant.type === 'size') resolvedSize = parts[0];
            }
          }

          const resolvedImg = item.productImage || item.product?.mainImage || (() => {
            if (item.productVariant?.images) {
              try {
                const vImgs = typeof item.productVariant.images === 'string' ? JSON.parse(item.productVariant.images) : item.productVariant.images;
                if (Array.isArray(vImgs) && vImgs.length > 0) return vImgs[0];
                if (typeof vImgs === 'string') return vImgs;
              } catch (_) { /* ignore */ }
            }
            if (item.product?.images) {
              try {
                const imgs = typeof item.product.images === 'string' ? JSON.parse(item.product.images) : item.product.images;
                return Array.isArray(imgs) ? imgs[0] : imgs;
              } catch (_) { return null; }
            }
            return parsedMetadata.image || parsedMetadata.productImage || null;
          })();
          return {
            id: item.id,
            productId: item.productId,
            name: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            productName: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            productColor: resolvedColor,
            productSize: resolvedSize,
            color: resolvedColor,
            size: resolvedSize,
            productImage: resolvedImg,
            productSku: item.productSku || item.productVariant?.sku || parsedMetadata.sku || '',
            price: item.price,
            quantity: item.quantity,
            total: item.total,
            metadata: {
              ...parsedMetadata,
              color: resolvedColor,
              size: resolvedSize,
              image: resolvedImg
            }
          };
        }) : [],
        trackingNumber: order.shipments?.[0]?.trackingNumber || orderMetadata?.trackingNumber || order.turboTrackingNumber || null,
        carrierType: order.shipments?.[0]?.carrierType || orderMetadata?.shippingCarrier || (order.turboTrackingNumber ? 'TURBO' : null),
        shipment: order.shipments?.[0] || null,
        shipments: order.shipments || [],
        turboShipmentStatus: order.turboShipmentStatus || null,
        turboReturnReason: order.turboReturnReason || null,
        turboDelayReason: order.turboDelayReason || null,
        turboTrackingNumber: order.turboTrackingNumber || null,
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
        sourceType: (order.sourceType === 'storefront' || orderMetadata?.source === 'storefront' || order.orderSource === 'STOREFRONT')
          ? 'storefront'
          : (order.sourceType || 'unknown'),
        extractionMethod: (order.sourceType === 'storefront' || orderMetadata?.source === 'storefront' || order.orderSource === 'STOREFRONT')
          ? 'storefront'
          : (order.extractionMethod || 'unknown'),
        orderSource: (order.sourceType === 'storefront' || orderMetadata?.source === 'storefront' || order.orderSource === 'STOREFRONT')
          ? (order.orderSource || 'STOREFRONT')
          : (order.orderSource || 'REGULAR'),
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

      // Unified effective status (own prep → twin prep/status → guest col),
      // mapped to regular codes — identical rule used for filtering/totals.
      const twinKey = String(order.orderNumber || '').trim().toLowerCase();
      const twin = regularTwinsByNumber.get(twinKey);
      const guestDisplayStatus = String(
        effectiveCodeForGuest(twinKey) || order.status || 'PENDING',
      ).toLowerCase();

      const matchedCust = guestCustomerByPhone.get(order.guestPhone);
      const healthStats = resolveOrderHealthStats(order, matchedCust);
      return applyOrderDetailFeatureAccess({
        id: order.orderNumber,
        orderNumber: order.orderNumber,
        customerId: matchedCust?.id || null,
        customerRating: healthStats.customerRating || matchedCust?.customerRating || 'UNKNOWN',
        customerSuccessScore: healthStats.healthScore,
        customerDeliveryRate: healthStats.deliveryRate,
        healthScore: healthStats.healthScore,
        healthDiagnosis: healthStats.healthDiagnosis,
        deliveryRate: healthStats.deliveryRate,
        totalDelivered: healthStats.totalDelivered,
        totalFailed: healthStats.totalFailed,
        totalCancelled: healthStats.totalCancelled,
        totalAttempts: healthStats.totalAttempts,
        totalOrdersCount: healthStats.totalOrdersCount,
        customer: matchedCust ? {
          id: matchedCust.id,
          firstName: order.guestName || '',
          lastName: '',
          phone: order.guestPhone,
          email: order.guestEmail,
          customerRating: healthStats.customerRating || matchedCust.customerRating || 'UNKNOWN',
          healthScore: healthStats.healthScore,
          deliveryRate: healthStats.deliveryRate ?? matchedCust.deliveryRate ?? null,
          totalDelivered: healthStats.totalDelivered,
          totalOrdersCount: healthStats.totalOrdersCount,
        } : null,
        customerName: order.guestName || '',
        customerPhone: order.guestPhone || '',
        customerEmail: order.guestEmail || '',
        total: guestAmounts.total,
        subtotal: guestAmounts.subtotal,
        tax: 0,
        shipping: guestAmounts.shipping,
        discount: guestAmounts.discount,
        discountReason: resolveDiscountReason(order, metadata),
        needsDiscountApproval: Boolean(metadata?.needsDiscountApproval),
        discountApprovalStatus: metadata?.discountApprovalStatus || null,
        discountApprovedBy: metadata?.discountApprovedBy || null,
        discountApprovedAt: metadata?.discountApprovedAt || null,
        discountRejectedBy: metadata?.discountRejectedBy || null,
        discountRejectedAt: metadata?.discountRejectedAt || null,
        discountRejectionReason: metadata?.discountRejectionReason || null,
        status: guestDisplayStatus,
        paymentStatus: derivePaymentStatusForDisplay(order, metadata),
        paymentMethod: order.paymentMethod?.toLowerCase() || 'cash_on_delivery',
        shippingAddress: shippingAddress,
        items: Array.isArray(items) ? items.map(item => {
          let itemMeta = {};
          try {
            itemMeta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : (item.metadata || {});
          } catch (_) {
            itemMeta = {};
          }
          const itemAttrs = itemMeta.attributeValues || itemMeta.attributes || item.attributes || {};
          const itemColor =
            item.productColor ||
            item.color ||
            itemMeta.productColor ||
            itemMeta.color ||
            itemMeta.Color ||
            itemAttrs.Color ||
            itemAttrs.color ||
            itemAttrs['اللون'] ||
            itemAttrs['لون'] ||
            '';
          const itemSize =
            item.productSize ||
            item.size ||
            itemMeta.productSize ||
            itemMeta.size ||
            itemMeta.Size ||
            itemAttrs.Size ||
            itemAttrs.size ||
            itemAttrs['المقاس'] ||
            itemAttrs['مقاس'] ||
            '';
          return {
            id: item.id || item.productId || '',
            productId: item.productId || item.id || '',
            name: item.name || item.productName || '',
            productName: item.name || item.productName || '',
            price: item.price || 0,
            quantity: item.quantity || 1,
            total: (item.price || 0) * (item.quantity || 1),
            sku: item.sku || item.productSku || '',
            productSku: item.sku || item.productSku || '',
            color: itemColor,
            productColor: itemColor,
            size: itemSize,
            productSize: itemSize,
            image: item.image || item.productImage || '',
            productImage: item.image || item.productImage || '',
            metadata: {
              ...itemMeta,
              color: itemColor,
              size: itemSize
            }
          };
        }) : [],
        trackingNumber: order.turboTrackingNumber || twin?.turboTrackingNumber || null,
        turboTrackingNumber: order.turboTrackingNumber || twin?.turboTrackingNumber || null,
        turboShipmentStatus: order.turboShipmentStatus || twin?.turboShipmentStatus || null,
        turboReturnReason: order.turboReturnReason || twin?.turboReturnReason || null,
        turboDelayReason: order.turboDelayReason || twin?.turboDelayReason || null,
        notes: order.notes || '',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        metadata,
        isViewed: order.isViewed ?? false,
        sourceType: 'storefront',
        extractionMethod: 'storefront',
        orderSource: 'STOREFRONT'
      }, orderDetailFeatureAccess, { isMerchant: false });
    });

    const regularOrderNumberSet = new Set([
      ...formattedRegularOrders.map((order) => normalizeOrderKey(order.orderNumber)),
      ...Array.from(shadowedGuestOrderNumberSet).map((n) => normalizeOrderKey(n))
    ]);
    const filteredGuestOrders = formattedGuestOrders.filter((order) => {
      const key = normalizeOrderKey(order.orderNumber);
      if (regularOrderNumberSet.has(key)) return false;
      const twin = regularTwinsByNumber.get(key);
      if (twin?.billingHoldAt && !includeHeldOrders) return false;
      if (order.metadata?.billingHold && !includeHeldOrders) return false;
      // Unified reconciliation: with an active status filter, a guest row
      // survives only if its shared effective status (own prep → twin →
      // stale column) actually matches the requested statuses — otherwise
      // stale rows leak into filters they no longer belong to.
      if (
        hasActiveStatusFilter &&
        !activeStatusFilterUpper.includes(effectiveCodeForGuest(key))
      ) {
        reconciledGuestsRemoved += 1;
        return false;
      }
      return true;
    });

    if (filteredGuestOrders.length !== formattedGuestOrders.length) {
      console.log('🧹 [ORDERS] Deduped guest orders:', {
        removed: formattedGuestOrders.length - filteredGuestOrders.length,
        remaining: filteredGuestOrders.length,
        shadowedByRegularOrders: shadowedGuestOrderNumberSet.size
      });
    }

    // دمج وترتيب (Merge & Sort) — الترتيب لازم يطابق ترتيب الجلب من الداتابيز
    // (createdAt desc ثم id desc) عشان الشريحة (slice) تفضل ثابتة بين الصفحات
    // وتمنع تكرار/فقدان الطلبات عند تساوي التواريخ أو عند وصول طلبات جديدة.
    const allFetchedOrders = [...formattedRegularOrders, ...filteredGuestOrders, ...formattedIncompleteCarts]
      .sort((a, b) => {
        const timeDiff = new Date(b.createdAt) - new Date(a.createdAt);
        if (timeDiff !== 0) return timeDiff;
        return String(b.id || '').localeCompare(String(a.id || ''));
      });

    // تطبيق Pagination (Slice)
    // بما أننا جلبنا Top N، فالصفحة المطلوبة هي آخر (limit) عنصر في المصفوفة المدمجة
    // ولكن يجب أن نأخذ في الاعتبار الـ offset
    // الـ offset الحقيقي في المصفوفة المدمجة هو (page - 1) * limit
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const slicedOrders = allFetchedOrders.slice(startIndex, endIndex);

    // شبكة أمان نهائية: إزالة أي تكرار حسب رقم الطلب/المعرف داخل نفس الصفحة
    // (يغطي الحالات اللي الغربلة الأساسية مأمشتها بسبب اختلاف حالة الأحرف/المسافات
    // أو وجود السلة محولة + طلب حقيقي بنفس المعرف). نحتفظ بالنسخة الأولى (الأحدث).
    const seenKeys = new Set();
    const paginatedOrders = [];
    for (const order of slicedOrders) {
      const dedupKey = String(order.orderNumber || order.id || '').trim().toLowerCase();
      if (!dedupKey) {
        paginatedOrders.push(order);
        continue;
      }
      if (seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);
      paginatedOrders.push(order);
    }

    // When a status filter is active, guest totals come from twin
    // reconciliation (distinct surviving numbers) instead of raw row counts —
    // stale guest twins would otherwise inflate/deflate pagination.
    const totalOrders = Math.max(
      hasActiveStatusFilter
        ? totalRegular + reconciledSurvivorGuestCount + (cartQueryWhere ? totalIncomplete : 0)
        : totalRegular + totalGuest - shadowedGuestTotal + (cartQueryWhere ? totalIncomplete : 0),
      0,
    );

    console.log(`📊 [ORDERS] Returning ${paginatedOrders.length} orders (Page ${page}/${Math.ceil(totalOrders / limit)})`);

    res.json({
      success: true,
      data: paginatedOrders,
      pagination: {
        total: totalOrders,
        page: page,
        limit: limit,
        pages: Math.ceil(totalOrders / limit)
      },
      meta: {
        showIncompleteCartsInOrders: Boolean(showIncompleteCarts),
        guestReconciliationV4: true,
        reconciledGuestsRemoved: reconciledGuestsRemovedGlobal
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

    const statsTimezone = await getCompanyTimezone(companyId);
    const stats = await simpleOrderService.getSimpleStats(companyId, dateFrom || null, dateTo || null, statsTimezone);

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
      const currentOrderMeta = parseOrderMetadata(order.metadata);
      if (
        currentOrderMeta?.discountApprovalStatus === 'PENDING_APPROVAL' &&
        !['CANCELLED', 'CANCELED', 'REJECTED', 'PENDING', 'CALL_ATTEMPT'].includes(statusUpper)
      ) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن تأكيد أو تجهيز أو شحن هذا الطلب قبل اعتماد الخصم من قِبل الإدارة أو إلغائه'
        });
      }

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

        // 🔒 Enforce the "problem hold" rules server-side so they cannot be
        // bypassed with a direct API call: ON_HOLD_PREP requires a reason note,
        // and a held order cannot move forward until it is released.
        await preparationQueueService.assertPreparationHoldRule({
          currentPreparationStatus: previousPreparationStatus,
          targetStatus: statusUpper,
          notes: statusNotes,
          isOverride: req.body.isOverride || false,
        });

        // ⚙️ Respect the advanced workflow when enabled (transition rules +
        // approvals). We only enforce it here when the company has actually
        // configured transitions for the current stage — otherwise we fall back
        // to allowing the move so an empty workflow config never locks the queue.
        const workflowConfig = order.company?.orderWorkflowConfig;
        if (workflowConfig?.enabled) {
          const orderWorkflowService = require('../services/orderWorkflowService');
          const getMappedRegularOrderStatus = (preparationStatus) => {
            if (preparationStatus === 'PENDING_PREPARATION') return 'CONFIRMED';
            if (['STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK'].includes(preparationStatus)) return 'STOCK_SHORTAGE';
            if (preparationStatus === 'ON_HOLD_PREP') return 'ON_HOLD_PREP';
            return 'PROCESSING';
          };
          const effectiveStatus = currentMetadata?.preparationStatus ? getMappedRegularOrderStatus(currentMetadata.preparationStatus) : order.status;
          const currentStatusDef = await getSharedPrismaClient().orderStatusDefinition.findFirst({
            where: { companyId, code: effectiveStatus },
            select: { id: true },
          });
          const hasConfiguredTransitions = await getSharedPrismaClient().orderWorkflowTransition.count({
            where: {
              companyId,
              fromStatusId: currentStatusDef ? currentStatusDef.id : null,
            },
          });
          if (hasConfiguredTransitions > 0) {
            const workflowOrder = { ...order, status: effectiveStatus };
            const wfResult = await orderWorkflowService.validateStatusChange(
              companyId,
              order.id,
              userId,
              statusUpper,
              statusNotes,
              false,
              workflowOrder
            );
            if (wfResult?.status === 'pending') {
              return res.json({
                success: true,
                message: 'تم تقديم طلب تغيير الحالة للمراجعة.',
                data: {
                  orderType: 'regular',
                  orderNumber,
                  workflowStatus: 'pending',
                  requestId: wfResult.requestId,
                },
              });
            }
          }
        }

        // 🔒 Enforce the "requireStockBeforePreparing" rule server-side so it
        // cannot be bypassed with a direct API call.
        const companySettings = parseOrderMetadata(order.company?.settings);
        const prepSettings = companySettings.orderPreparation || {};
        await preparationQueueService.assertPreparationStockRule({
          orderId: order.id,
          companyId,
          targetStatus: statusUpper,
          prepSettings,
        });

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
            // 🛡️ PRODUCTION-FIX (custom-status-persist): حالات التجهيز حالات نظامية —
            // أمسح أي كود مخصص قديم عشان "الحالة الفعلية" تبقى مرحلة التجهيز.
            customStatusCode: null,
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

        // 🛡️ PRODUCTION-FIX (prep-stage-notify): نفس إصلاح preparationQueueService —
        // الفرع ده كان بيحدّث الحالة ويكتب History من غير أي رسالة واتساب للعميل،
        // رغم إن نفس الحالة من صفحة التجهيز بتبعت إشعار. fire-and-forget زي المسار التاني.
        setImmediate(() => {
          preparationQueueService.notifyPreparationStageChange({
            companyId,
            orderPayload: { ...order, ...updatedRegularOrder },
            status: statusUpper
          });
        });

        // 🧾 Auto Invoice Generation (background)
        (async () => {
          try {
            const prisma = getSharedPrismaClient();
            const invoiceSettings = await prisma.orderInvoiceSettings.findUnique({
              where: { companyId: order.companyId }
            });

            if (invoiceSettings && invoiceSettings.autoGenerate && invoiceSettings.autoGenerateOnStatus) {
              const targetStatuses = invoiceSettings.autoGenerateOnStatus.split(',').map(s => s.trim().toUpperCase());
              if (targetStatuses.includes(statusUpper) || targetStatuses.includes(mappedStatus) || targetStatuses.includes('*')) {
                const { generateInvoiceForOrder } = require('../services/orderInvoiceService');
                await generateInvoiceForOrder(order.id, userId);
                console.log(`✅ [INVOICE-AUTO] Auto-generated invoice for order ${orderNumber} on preparation status ${statusUpper}`);
              }
            }
          } catch (invoiceError) {
            console.error('⚠️ [INVOICE-AUTO-ERROR] Failed auto-generation:', invoiceError.message);
          }
        })();

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

    // 🔒 Enforce the "problem hold" rules for guest orders too.
    const guestMetadata = parseOrderMetadata(guestOrder.metadata);
    if (
      guestMetadata?.discountApprovalStatus === 'PENDING_APPROVAL' &&
      !['CANCELLED', 'CANCELED', 'REJECTED', 'PENDING', 'CALL_ATTEMPT'].includes(statusUpper)
    ) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تأكيد أو تجهيز أو شحن هذا الطلب قبل اعتماد الخصم من قِبل الإدارة أو إلغائه'
      });
    }

    await preparationQueueService.assertPreparationHoldRule({
      currentPreparationStatus:
        guestMetadata.preparationStatus || guestOrder.status,
      targetStatus: statusUpper,
      notes: statusNotes,
      isOverride: req.body.isOverride || false,
    });

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
    const companyId = req.user?.companyId || req.headers['x-company-id'] || req.companyId;
    if (!companyId || req.user?.role === 'AFFILIATE') {
      return res.json({ success: true, data: { count: 0, orders: 0, guestOrders: 0 } });
    }

    const duplicateSettings = await orderService.getDuplicateSettings(companyId);
    const hideDuplicatesInNewList = duplicateSettings?.action === 'record_hidden' || duplicateSettings?.action === 'hidden';
    const excludedStatuses = hideDuplicatesInNewList
      ? ['DRAFT', 'TRASH', 'DUPLICATE_ORDER']
      : ['DRAFT', 'TRASH'];

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
    const duplicateSettings = await orderService.getDuplicateSettings(companyId);
    const hideDuplicatesInNewList = duplicateSettings?.action === 'record_hidden' || duplicateSettings?.action === 'hidden';
    const excludedStatuses = hideDuplicatesInNewList
      ? ['DRAFT', 'TRASH', 'DUPLICATE_ORDER']
      : ['DRAFT', 'TRASH'];

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

    const duplicateSettings = await orderService.getDuplicateSettings(companyId);
    const hideDuplicatesInNewList = duplicateSettings?.action === 'record_hidden' || duplicateSettings?.action === 'hidden';
    const excludedStatuses = hideDuplicatesInNewList
      ? ['DRAFT', 'TRASH', 'DUPLICATE_ORDER']
      : ['DRAFT', 'TRASH'];

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

      if (paymentStatus.toUpperCase() === 'COMPLETED' || paymentStatus.toUpperCase() === 'PAID') {
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

        // 🎓 أكاديمية: تسجيل تلقائي في الكورسات المرتبطة بالطلب المسدد
        try {
          const academyService = require('../services/academyService');
          await academyService.processOrderAutoEnrollment({
            orderId: existingRegularOrder.id,
            orderNumber: existingRegularOrder.orderNumber,
            companyId,
            changedBy: userId,
          }).catch(e => console.warn('[academy-payment-hook] auto-enroll failed:', e.message));
        } catch (academyErr) {
          console.warn('[academy-payment-hook] error:', academyErr.message);
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

/**
 * 🚧 الطلبات المعلّقة بانتظار شحن الرصيد (billing hold) — ببيانات مقنّعة
 * GET /api/v1/orders-new/billing-holds
 */
router.get('/billing-holds', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const maskName = (name) => {
      const s = String(name || '').trim();
      if (!s) return '';
      return `${s.charAt(0)}***`;
    };

    const maskPhone = (phone) => {
      const s = String(phone || '').trim();
      if (s.length <= 5) return s;
      return `${s.slice(0, 3)}***${s.slice(-2)}`;
    };

    const heldOrders = await getSharedPrismaClient().order.findMany({
      where: { companyId, billingHoldAt: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { orderItems: true } },
      },
    });

    const data = heldOrders.map((order) => {
      const parsedMeta = (() => {
        if (!order.metadata) return {};
        try {
          const parsed = JSON.parse(order.metadata);
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
          return {};
        }
      })();
      const holdReason =
        parsedMeta?.billingHold?.reason === 'subscription_expired'
          ? 'subscription_expired'
          : 'insufficient_balance';

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        itemCount: order._count.orderItems,
        billingHoldAmount: order.billingHoldAmount !== null && order.billingHoldAmount !== undefined
          ? Number(order.billingHoldAmount)
          : null,
        holdReason,
        heldAt: parsedMeta?.billingHold?.heldAt || order.billingHoldAt,
        customerName: maskName(order.customerName),
        customerPhone: maskPhone(order.customerPhone),
      };
    });

    const totalAmount = data.reduce(
      (sum, o) => sum + (o.holdReason === 'insufficient_balance' ? o.billingHoldAmount || 0 : 0),
      0,
    );
    const subscriptionCount = data.filter((o) => o.holdReason === 'subscription_expired').length;

    res.json({
      success: true,
      data: {
        count: data.length,
        totalAmount,
        subscriptionCount,
        orders: data,
      },
    });
  } catch (error) {
    console.error('❌ [BILLING-HOLDS] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الطلبات المعلّقة',
      error: error.message,
    });
  }
});

// الحصول على جميع الطلبات
router.get('/', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customerId } = req.query;
    const skip = (page - 1) * limit;
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
                images: true,
                mainImage: true
              }
            },
            productVariant: {
              select: {
                id: true,
                name: true,
                sku: true,
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
      // 🔒 قفل تعديل بيانات الأوردر (لكل حالة): إضافة ملاحظة تعدّل بيانات الطلب.
      const { assertOrderStatusEditable } = require('../utils/orderStatusLock');
      await assertOrderStatusEditable(getSharedPrismaClient(), companyId, regularOrder.status);

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
      // 🔒 قفل تعديل بيانات الأوردر (لكل حالة) — طلبات الضيوف.
      const { assertOrderStatusEditable } = require('../utils/orderStatusLock');
      await assertOrderStatusEditable(getSharedPrismaClient(), companyId, guestOrder.status);

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
    const statusCode = error.statusCode || 500;
    const message = statusCode === 403 ? error.message : 'خطأ في إضافة الملاحظة';
    res.status(statusCode).json({ success: false, message, error: error.message });
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
        order: { select: { companyId: true, status: true } },
        guestOrder: { select: { companyId: true, status: true } },
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

    // 🔒 قفل تعديل بيانات الأوردر (لكل حالة): تعديل الملاحظة يعدّل بيانات الطلب.
    const { assertOrderStatusEditable } = require('../utils/orderStatusLock');
    const lockStatus = existingNote.order?.status || existingNote.guestOrder?.status;
    await assertOrderStatusEditable(getSharedPrismaClient(), companyId, lockStatus);

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
    const statusCode = error.statusCode || 500;
    const message = statusCode === 403 ? error.message : 'خطأ في تعديل الملاحظة';
    res.status(statusCode).json({ success: false, message, error: error.message });
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
        order: { select: { companyId: true, status: true } },
        guestOrder: { select: { companyId: true, status: true } },
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

    // 🔒 قفل تعديل بيانات الأوردر (لكل حالة): حذف الملاحظة يعدّل بيانات الطلب.
    const { assertOrderStatusEditable } = require('../utils/orderStatusLock');
    const lockStatus = existingNote.order?.status || existingNote.guestOrder?.status;
    await assertOrderStatusEditable(getSharedPrismaClient(), companyId, lockStatus);

    await getSharedPrismaClient().orderNote.delete({ where: { id: noteId } });

    console.log(`✅ [ORDER-NOTE] Deleted note: ${noteId}`);
    return res.json({ success: true, message: 'تم حذف الملاحظة بنجاح' });

  } catch (error) {
    console.error('❌ Error deleting note:', error);
    const statusCode = error.statusCode || 500;
    const message = statusCode === 403 ? error.message : 'خطأ في حذف الملاحظة';
    res.status(statusCode).json({ success: false, message, error: error.message });
  }
});

// اعتماد أو رفض خصم الطلب
router.post('/simple/:orderNumber/discount-approval', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { action, reason } = req.body || {}; // action: 'APPROVE' | 'REJECT'
    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;

    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'الإجراء غير صالح. يجب أن يكون APPROVE أو REJECT'
      });
    }

    const prisma = getSharedPrismaClient();
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'مدير النظام';
    const userId = req.user?.id || 'SYSTEM';
    const nowIso = new Date().toISOString();

    // 1. Check Regular Order
    const regularOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderNumber, companyId }, { orderNumber, companyId }]
      }
    });

    if (regularOrder) {
      const metadata = parseOrderMetadata(regularOrder.metadata) || {};
      const currentDiscount = Number(regularOrder.discount || 0);

      if (action === 'APPROVE') {
        metadata.needsDiscountApproval = false;
        metadata.discountApprovalStatus = 'APPROVED';
        metadata.discountApprovedBy = userName;
        metadata.discountApprovedById = userId;
        metadata.discountApprovedAt = nowIso;

        const updatedOrder = await prisma.order.update({
          where: { id: regularOrder.id },
          data: {
            metadata: JSON.stringify(metadata),
            statusHistory: {
              create: {
                status: regularOrder.status,
                oldStatus: regularOrder.status,
                reason: `اعتماد الخصم بقيمة ${currentDiscount} ج.م بواسطة ${userName}${reason ? `: ${reason}` : ''}`,
                changedBy: userId,
                userName
              }
            }
          }
        });

        try {
          if (socketService?.getIO()) {
            socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
              orderNumber: updatedOrder.orderNumber,
              discountApprovalStatus: 'APPROVED'
            });
          }
        } catch (_) {}

        return res.json({
          success: true,
          message: 'تم اعتماد الخصم بنجاح',
          data: {
            orderNumber: updatedOrder.orderNumber,
            discountApprovalStatus: 'APPROVED',
            discount: updatedOrder.discount,
            total: updatedOrder.total
          }
        });
      } else {
        // REJECT action: strip discount and recalculate total
        metadata.needsDiscountApproval = false;
        metadata.discountApprovalStatus = 'REJECTED';
        metadata.discountRejectedBy = userName;
        metadata.discountRejectedById = userId;
        metadata.discountRejectedAt = nowIso;
        metadata.discountRejectionReason = reason || 'تم رفض الخصم من قِبل الإدارة';
        metadata.discountReason = null;
        metadata.coupon = null;
        metadata.couponCode = null;

        const subtotal = Number(regularOrder.subtotal || 0);
        const shipping = Number(regularOrder.shipping || 0);
        const tax = Number(regularOrder.tax || 0);
        const newTotal = Number((subtotal + shipping + tax).toFixed(2));

        const updatedOrder = await prisma.order.update({
          where: { id: regularOrder.id },
          data: {
            discount: 0,
            total: newTotal,
            metadata: JSON.stringify(metadata),
            statusHistory: {
              create: {
                status: regularOrder.status,
                oldStatus: regularOrder.status,
                reason: `إلغاء ورفض الخصم (كان ${currentDiscount} ج.م) وتعديل الإجمالي إلى ${newTotal} ج.م بواسطة ${userName}${reason ? `: ${reason}` : ''}`,
                changedBy: userId,
                userName
              }
            }
          }
        });

        try {
          if (socketService?.getIO()) {
            socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
              orderNumber: updatedOrder.orderNumber,
              discountApprovalStatus: 'REJECTED',
              discount: 0,
              total: newTotal
            });
          }
        } catch (_) {}

        return res.json({
          success: true,
          message: 'تم رفض وإلغاء الخصم وتحديث إجمالي الطلب بنجاح',
          data: {
            orderNumber: updatedOrder.orderNumber,
            discountApprovalStatus: 'REJECTED',
            discount: 0,
            total: newTotal
          }
        });
      }
    }

    // 2. Check Guest Order
    const guestOrder = await prisma.guestOrder.findFirst({
      where: {
        OR: [{ id: orderNumber, companyId }, { orderNumber, companyId }]
      }
    });

    if (guestOrder) {
      const metadata = parseOrderMetadata(guestOrder.metadata) || {};
      const currentDiscount = Number(guestOrder.discountAmount || 0);

      if (action === 'APPROVE') {
        metadata.needsDiscountApproval = false;
        metadata.discountApprovalStatus = 'APPROVED';
        metadata.discountApprovedBy = userName;
        metadata.discountApprovedById = userId;
        metadata.discountApprovedAt = nowIso;

        const updatedGuest = await prisma.guestOrder.update({
          where: { id: guestOrder.id },
          data: {
            metadata: JSON.stringify(metadata)
          }
        });

        try {
          if (socketService?.getIO()) {
            socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
              orderNumber: updatedGuest.orderNumber,
              discountApprovalStatus: 'APPROVED'
            });
          }
        } catch (_) {}

        return res.json({
          success: true,
          message: 'تم اعتماد الخصم بنجاح',
          data: {
            orderNumber: updatedGuest.orderNumber,
            discountApprovalStatus: 'APPROVED',
            discount: updatedGuest.discountAmount,
            total: updatedGuest.finalTotal
          }
        });
      } else {
        // REJECT action: strip discount and recalculate
        metadata.needsDiscountApproval = false;
        metadata.discountApprovalStatus = 'REJECTED';
        metadata.discountRejectedBy = userName;
        metadata.discountRejectedById = userId;
        metadata.discountRejectedAt = nowIso;
        metadata.discountRejectionReason = reason || 'تم رفض الخصم من قِبل الإدارة';
        metadata.discountReason = null;
        metadata.coupon = null;
        metadata.couponCode = null;

        const cartTotal = Number(guestOrder.total || 0);
        const shippingCost = Number(guestOrder.shippingCost || 0);
        const newFinalTotal = Number((cartTotal + shippingCost).toFixed(2));

        const updatedGuest = await prisma.guestOrder.update({
          where: { id: guestOrder.id },
          data: {
            discountAmount: 0,
            finalTotal: newFinalTotal,
            metadata: JSON.stringify(metadata)
          }
        });

        try {
          if (socketService?.getIO()) {
            socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
              orderNumber: updatedGuest.orderNumber,
              discountApprovalStatus: 'REJECTED',
              discount: 0,
              total: newFinalTotal
            });
          }
        } catch (_) {}

        return res.json({
          success: true,
          message: 'تم رفض وإلغاء الخصم وتحديث إجمالي الطلب بنجاح',
          data: {
            orderNumber: updatedGuest.orderNumber,
            discountApprovalStatus: 'REJECTED',
            discount: 0,
            total: newFinalTotal
          }
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: 'الطلب غير موجود'
    });
  } catch (error) {
    console.error('❌ Error in discount approval endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في معالجة اعتماد/رفض الخصم',
      error: error.message
    });
  }
});

// الحصول على طلب بسيط محدد بالرقم
// Verify / reject a wallet payment proof uploaded by the customer at checkout
router.post('/simple/:orderNumber/wallet-proof/verify', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح - يجب تسجيل الدخول' });
    }

    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    const { orderNumber } = req.params;
    const { action, rejectReason } = req.body || {};
    const normalizedAction = String(action || '').toUpperCase();

    if (!['VERIFY', 'REJECT'].includes(normalizedAction)) {
      return res.status(400).json({ success: false, message: 'الإجراء يجب أن يكون VERIFY أو REJECT' });
    }

    const prisma = getSharedPrismaClient();
    const [guestOrder, regularOrder] = await Promise.all([
      prisma.guestOrder.findFirst({
        where: {
          OR: [{ id: orderNumber, companyId }, { orderNumber, companyId }],
        },
        select: { id: true, metadata: true },
      }),
      prisma.order.findFirst({
        where: {
          OR: [{ id: orderNumber, companyId }, { orderNumber, companyId }],
        },
        select: { id: true, metadata: true, paymentStatus: true },
      }),
    ]);

    if (!guestOrder && !regularOrder) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    let verifiedProof = null;
    let matched = false;

    // Guest order — storefront orders are stored as guest orders. Update its proof.
    if (guestOrder) {
      const metadata = safeParseOrderMetadata(guestOrder.metadata);
      const proof = metadata?.walletPaymentProof;
      if (proof) {
        const nextProof = {
          ...proof,
          status: normalizedAction === 'VERIFY' ? 'VERIFIED' : 'REJECTED',
          verifiedBy: req.user.id || null,
          verifiedAt: new Date().toISOString(),
          ...(normalizedAction === 'REJECT'
            ? { rejectReason: String(rejectReason || '').slice(0, 500) || null }
            : {}),
        };
        await prisma.guestOrder.update({
          where: { id: guestOrder.id },
          data: { metadata: JSON.stringify({ ...metadata, walletPaymentProof: nextProof }) },
        });
        verifiedProof = nextProof;
        matched = true;
      }
    }

    // Regular order mirror — same proof, and when VERIFYing also mark the
    // payment as completed so the payment column reflects the approval.
    if (regularOrder) {
      const metadata = safeParseOrderMetadata(regularOrder.metadata);
      const proof = metadata?.walletPaymentProof;
      if (proof) {
        const nextProof = {
          ...proof,
          status: normalizedAction === 'VERIFY' ? 'VERIFIED' : 'REJECTED',
          verifiedBy: req.user.id || null,
          verifiedAt: new Date().toISOString(),
          ...(normalizedAction === 'REJECT'
            ? { rejectReason: String(rejectReason || '').slice(0, 500) || null }
            : {}),
        };
        const currentPaymentStatus = String(regularOrder.paymentStatus || '').toUpperCase();
        const isNeutralStatus =
          !currentPaymentStatus ||
          currentPaymentStatus === 'PENDING' ||
          currentPaymentStatus === 'UNAVAILABLE' ||
          currentPaymentStatus === 'UNKNOWN';
        await prisma.order.update({
          where: { id: regularOrder.id },
          data: {
            metadata: JSON.stringify({ ...metadata, walletPaymentProof: nextProof }),
            ...(normalizedAction === 'VERIFY' && isNeutralStatus
              ? { paymentStatus: 'COMPLETED' }
              : {}),
          },
        });
        verifiedProof = verifiedProof || nextProof;
        matched = true;
      }
    }

    if (!matched) {
      return res.status(400).json({ success: false, message: 'لا يوجد إثبات دفع محفظة لهذا الطلب' });
    }

    return res.json({
      success: true,
      message:
        normalizedAction === 'VERIFY'
          ? 'تم التحقق من إثبات الدفع واعتماد حالة الدفع'
          : 'تم رفض إثبات الدفع',
      data: { walletPaymentProof: verifiedProof },
    });
  } catch (error) {
    console.error('❌ [WALLET-PROOF] Verify error:', error?.message);
    return res.status(500).json({ success: false, message: 'خطأ في التحقق من إثبات الدفع' });
  }
});

// سجل وتاريخ طلبات العميل السابقة
router.get('/simple/:orderNumber/customer-history', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { limit = 20 } = req.query;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح - يجب تسجيل الدخول' });
    }

    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const prisma = getSharedPrismaClient();

    // البحث عن الطلب لاستخراج بيانات العميل
    const [order, guestOrder] = await Promise.all([
      prisma.order.findFirst({
        where: {
          AND: [
            {
              OR: [
                { id: orderNumber, companyId },
                { orderNumber: orderNumber, companyId },
              ],
            },
            ...(merchant
              ? [{
                  merchantOrders: {
                    some: { merchantId: merchant.id },
                  },
                }]
              : []),
          ],
        },
        select: {
          id: true,
          orderNumber: true,
          customerId: true,
          customerPhone: true,
          customerEmail: true,
          customerName: true,
          metadata: true,
        },
      }),
      !merchant
        ? prisma.guestOrder.findFirst({
            where: {
              OR: [
                { id: orderNumber, companyId },
                { orderNumber: orderNumber, companyId },
              ],
            },
            select: {
              id: true,
              orderNumber: true,
              guestPhone: true,
              guestEmail: true,
              guestName: true,
            },
          })
        : null,
    ]);

    const activeOrder = order || guestOrder;
    if (!activeOrder) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    const orderMeta = safeParseOrderMetadata(order?.metadata);
    const customerPhone = order?.customerPhone || guestOrder?.guestPhone || req.query.phone;
    const alternativePhone = orderMeta?.alternativePhone || req.query.alternativePhone;
    const customerEmail = order?.customerEmail || guestOrder?.guestEmail || req.query.email;
    const customerId = order?.customerId || req.query.customerId;

    const history = await getCustomerOrderHistory(prisma, companyId, {
      phone: customerPhone,
      alternativePhone,
      email: customerEmail,
      customerId,
      currentOrderNumber: activeOrder.orderNumber,
      limit: parseInt(limit, 10) || 20,
    });

    return res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('❌ Error fetching customer history:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في جلب سجل طلبات العميل',
      error: error.message,
    });
  }
});

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
                  images: true,
                  mainImage: true
                }
              },
              productVariant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
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
            email: true,
            customerRating: true,
            successScore: true,
            deliveryRate: true,
            totalDelivered: true,
            totalOrdersCount: true
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
            productImage: true,  // ✅ FIX: Include productImage
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
                images: true, // ✅ FIX: Include variant images
                metadata: true // ✅ Correct: JSON metadata
              }
            },
            product: {
              select: {
                id: true,
                name: true,
                mainImage: true, // ✅ FIX: Include mainImage
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
        shipments: {
          include: {
            shippingCompany: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        returnRequests: {
          include: {
            returnReason: {
              include: {
                returnReasonCategory: true
              }
            },
            returnType: true,
            shippingCompany: true
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

    // 🚧 الطلبات المعلّقة بسبب الفوترة محجوبة حتى يُشحن الرصيد
    const includeHeldOrders = req.query.includeHeld === 'true';
    if (!includeHeldOrders) {
      if (order && order.billingHoldAt) {
        return res.status(402).json({
          success: false,
          code: 'BILLING_HOLD',
          message: 'الطلب معلّق بسبب انخفاض رصيد المحفظة أو انتهاء الاشتراك. يرجى شحن الرصيد أولاً لإظهار الطلب.'
        });
      }
      if (isGuestOrder && guestOrder) {
        const guestMeta = safeParseOrderMetadata(guestOrder.metadata);
        if (guestMeta?.billingHold) {
          return res.status(402).json({
            success: false,
            code: 'BILLING_HOLD',
            message: 'الطلب معلّق بسبب انخفاض رصيد المحفظة أو انتهاء الاشتراك. يرجى شحن الرصيد أولاً لإظهار الطلب.'
          });
        }
        const twin = await getSharedPrismaClient().order.findFirst({
          where: { companyId, orderNumber: guestOrder.orderNumber, billingHoldAt: { not: null } },
          select: { id: true }
        });
        if (twin) {
          return res.status(402).json({
            success: false,
            code: 'BILLING_HOLD',
            message: 'الطلب معلّق بسبب انخفاض رصيد المحفظة أو انتهاء الاشتراك. يرجى شحن الرصيد أولاً لإظهار الطلب.'
          });
        }
      }
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
          let itemMeta = {};
          try { itemMeta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : (item.metadata || {}); } catch (_) {}
          const color = item.productColor || item.color || itemMeta.color || itemMeta.Color || itemMeta.productColor || '';
          const size = item.productSize || item.size || itemMeta.size || itemMeta.Size || itemMeta.productSize || '';
          const details = item.productDetails || item.details || itemMeta.details || '';
          return (!color || !size || !details) && item.variantId;
        })
        .map(item => item.variantId);

      let variantMap = new Map();
      if (missingVariantIds.length > 0) {
        const variants = await getSharedPrismaClient().productVariant.findMany({
          where: { id: { in: missingVariantIds } },
          select: { id: true, name: true, type: true, metadata: true }
        });
        variantMap = new Map(variants.map(v => [v.id, v]));
      }

      let guestCustomer = null;
      if (guestOrder.guestPhone) {
        try {
          const { findCustomerByPhone } = require('../utils/customerIdentity');
          guestCustomer = await findCustomerByPhone(getSharedPrismaClient(), guestOrder.guestPhone, companyId);
        } catch (e) {
          console.warn('⚠️ [ORDER-DETAIL] Failed to find customer for guest order:', e.message);
        }
      }

      formattedOrder = {
        id: guestOrder.orderNumber,
        orderNumber: guestOrder.orderNumber,
        customerId: guestCustomer?.id || null,
        customerRating: guestCustomer?.customerRating || 'UNKNOWN',
        customerSuccessScore: guestCustomer?.successScore ?? null,
        customerDeliveryRate: guestCustomer?.deliveryRate ?? null,
        deliveryRate: guestCustomer?.deliveryRate ?? null,
        totalDelivered: guestCustomer?.totalDelivered ?? 0,
        totalOrdersCount: guestCustomer?.totalOrdersCount ?? 0,
        customer: guestCustomer ? {
          id: guestCustomer.id,
          firstName: guestOrder.guestName || '',
          lastName: '',
          phone: guestOrder.guestPhone,
          email: guestOrder.guestEmail,
          customerRating: guestCustomer.customerRating || 'UNKNOWN',
          deliveryRate: guestCustomer.deliveryRate ?? null,
          totalDelivered: guestCustomer.totalDelivered ?? 0,
          totalOrdersCount: guestCustomer.totalOrdersCount ?? 0,
        } : null,
        customerName: guestOrder.guestName || '',
        customerPhone: guestOrder.guestPhone || '',
        customerEmail: guestOrder.guestEmail || '',
        customerAddress: typeof shippingAddress === 'object' ? (shippingAddress.address || shippingAddress.street || '') : '',
        city: typeof shippingAddress === 'object' ? (shippingAddress.city || '') : '',
        total: guestAmounts.total,
        subtotal: guestAmounts.subtotal,
        tax: 0,
        shipping: guestAmounts.shipping,
        discount: guestAmounts.discount,
        discountReason: resolveDiscountReason(guestOrder, safeParseOrderMetadata(guestOrder.metadata)),
        needsDiscountApproval: Boolean(safeParseOrderMetadata(guestOrder.metadata)?.needsDiscountApproval),
        discountApprovalStatus: safeParseOrderMetadata(guestOrder.metadata)?.discountApprovalStatus || null,
        discountApprovedBy: safeParseOrderMetadata(guestOrder.metadata)?.discountApprovedBy || null,
        discountApprovedAt: safeParseOrderMetadata(guestOrder.metadata)?.discountApprovedAt || null,
        discountRejectedBy: safeParseOrderMetadata(guestOrder.metadata)?.discountRejectedBy || null,
        discountRejectedAt: safeParseOrderMetadata(guestOrder.metadata)?.discountRejectedAt || null,
        discountRejectionReason: safeParseOrderMetadata(guestOrder.metadata)?.discountRejectionReason || null,
        status: guestOrder.status?.toLowerCase() || 'pending',
        paymentStatus: derivePaymentStatusForDisplay(
          guestOrder,
          safeParseOrderMetadata(guestOrder.metadata),
        ),
        paymentMethod: guestOrder.paymentMethod?.toLowerCase() || 'cash_on_delivery',
        shippingAddress: shippingAddress,
        items: validItems.map((item) => {
          let itemMeta = {};
          try {
            itemMeta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : (item.metadata || {});
          } catch (_) {
            itemMeta = {};
          }
          const itemAttrs = itemMeta.attributeValues || itemMeta.attributes || item.attributes || {};
          let color =
            item.productColor ||
            item.color ||
            itemMeta.productColor ||
            itemMeta.color ||
            itemMeta.Color ||
            itemAttrs.Color ||
            itemAttrs.color ||
            itemAttrs['اللون'] ||
            itemAttrs['لون'] ||
            '';
          let size =
            item.productSize ||
            item.size ||
            itemMeta.productSize ||
            itemMeta.size ||
            itemMeta.Size ||
            itemAttrs.Size ||
            itemAttrs.size ||
            itemAttrs['المقاس'] ||
            itemAttrs['مقاس'] ||
            '';
          let details = item.productDetails || item.details || itemMeta.details || '';

          const variant = (!color || !size || !details) && item.variantId ? variantMap.get(item.variantId) : null;
          if (variant) {
            if (!color) color = variant.color || '';
            if (!size) size = variant.size || '';

            if ((!color || !size || !details) && variant.metadata) {
              try {
                const metadata = typeof variant.metadata === 'string'
                  ? JSON.parse(variant.metadata)
                  : variant.metadata;

                const attrs = metadata?.attributeValues || metadata?.attributes || metadata || {};
                const AR_COLOR = '\u0627\u0644\u0644\u0648\u0646';
                const AR_SIZE = '\u0627\u0644\u0645\u0642\u0627\u0633';
                const AR_DETAILS = '\u062a\u0641\u0627\u0635\u064a\u0644';
                if (!color) color = attrs[AR_COLOR] || attrs['\u0644\u0648\u0646'] || attrs['color'] || attrs['Color'] || '';
                if (!size) size = attrs[AR_SIZE] || attrs['\u0645\u0642\u0627\u0633'] || attrs['size'] || attrs['Size'] || '';
                if (!details) details = attrs[AR_DETAILS] || attrs['details'] || attrs['Details'] || '';
              } catch (e) {
                // Ignore parse error
              }
            }

            if ((!color || !size) && variant.name) {
              const parts = variant.name.split(/\s*[-–|\/]\s*/).map(p => p.trim());
              if (parts.length >= 2) {
                if (!color && isNaN(parts[0])) color = parts[0];
                if (!size) size = parts[parts.length - 1];
              } else if (parts.length === 1 && !color && !size) {
                if (variant.type === 'color') color = parts[0];
                else if (variant.type === 'size') size = parts[0];
              }
            }
          }

          const isPostPurchaseOffer = Boolean(item.isPostPurchaseOffer || item.metadata?.isPostPurchaseOffer);
          const addedPostPurchase = Boolean(item.addedPostPurchase || item.metadata?.addedPostPurchase);
          const originalPrice = item.originalPrice || item.metadata?.originalPrice || null;

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
            productSku: item.sku || item.productSku || (item.metadata && item.metadata.sku) || '',
            isPostPurchaseOffer,
            addedPostPurchase,
            originalPrice,
            metadata: {
              ...(item.metadata || {}),
              isPostPurchaseOffer,
              addedPostPurchase,
              originalPrice,
              color: color,
              size: size,
              details: details,
              image: item.image || (item.metadata && (item.metadata.image || item.metadata.productImage)) || ''
            }
          };
        }),
        trackingNumber: guestOrder.turboTrackingNumber || safeParseOrderMetadata(guestOrder.metadata)?.trackingNumber || null,
        carrierType: guestOrder.turboTrackingNumber ? 'TURBO' : (safeParseOrderMetadata(guestOrder.metadata)?.shippingCarrier || null),
        shipment: null,
        shipments: [],
        notes: guestOrder.notes || '',
        createdAt: guestOrder.createdAt,
        updatedAt: guestOrder.updatedAt,
        isViewed: guestOrder.isViewed ?? false,
        metadata: {
          source: 'storefront',
          isGuestOrder: true,
          ...safeParseOrderMetadata(guestOrder.metadata),
        },
        // ✅ Wallet payment proof (screenshot + transfer details) for manual verification
        walletPaymentProof:
          safeParseOrderMetadata(guestOrder.metadata)?.walletPaymentProof || null,
        // ✅ Kashier online payment details
        kashierPayment:
          safeParseOrderMetadata(guestOrder.metadata)?.kashierPayment || null,
        // ✅ Turbo Shipping Fields - Get from GuestOrder
        turboShipmentId: guestOrder.turboShipmentId || null,
        turboTrackingNumber: guestOrder.turboTrackingNumber || null,
        turboShipmentStatus: guestOrder.turboShipmentStatus || null,
        turboLabelUrl: guestOrder.turboLabelUrl || null,
        turboMetadata: guestOrder.turboMetadata || null,
        turboCaptainName: guestOrder.turboCaptainName || null,
        turboCaptainPhone: guestOrder.turboCaptainPhone || null,
        turboBranchName: guestOrder.turboBranchName || null,
        turboBranchPhone: guestOrder.turboBranchPhone || null,
        turboDelayReason: guestOrder.turboDelayReason || null,
        turboReturnReason: guestOrder.turboReturnReason || null,
        turboExpectedBranch: guestOrder.turboExpectedBranch || null,
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
        statusHistory: guestOrder.OrderStatusHistory || [],
        returnRequests: []
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

      const getMappedRegularOrderStatus = (preparationStatus) => {
        if (preparationStatus === 'PENDING_PREPARATION') return 'CONFIRMED';
        if (['STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK'].includes(preparationStatus)) return 'STOCK_SHORTAGE';
        if (preparationStatus === 'ON_HOLD_PREP') return 'ON_HOLD_PREP';
        return 'PROCESSING';
      };
      // 🛡️ PRODUCTION-FIX (custom-status-persist): نفس أولوية الليست — الكود المخصص
      // له الأولوية، وإلا مرحلة التجهيز، وإلا الـ enum.
      const detailEffectiveStatus = (
        order.customStatusCode
          ? order.customStatusCode
          : orderMetadata?.preparationStatus
            ? getMappedRegularOrderStatus(orderMetadata.preparationStatus)
            : order.status || 'PENDING'
      ).toLowerCase();

      formattedOrder = {
        id: order.orderNumber,
        orderNumber: order.orderNumber,
        customerId: order.customerId || order.customer?.id || null,
        customerRating: order.customer?.customerRating || 'UNKNOWN',
        customerSuccessScore: order.customer?.successScore ?? null,
        customerDeliveryRate: order.customer?.deliveryRate ?? null,
        deliveryRate: order.customer?.deliveryRate ?? null,
        totalDelivered: order.customer?.totalDelivered ?? 0,
        totalOrdersCount: order.customer?.totalOrdersCount ?? 0,
        customer: order.customer ? {
          id: order.customer.id,
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          phone: order.customer.phone,
          email: order.customer.email,
          customerRating: order.customer.customerRating || 'UNKNOWN',
          deliveryRate: order.customer.deliveryRate ?? null,
          totalDelivered: order.customer.totalDelivered ?? 0,
          totalOrdersCount: order.customer.totalOrdersCount ?? 0,
        } : null,
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
        discount: order.discount,
        discountReason: resolveDiscountReason(order, orderMetadata),
        needsDiscountApproval: Boolean(orderMetadata?.needsDiscountApproval),
        discountApprovalStatus: orderMetadata?.discountApprovalStatus || null,
        discountApprovedBy: orderMetadata?.discountApprovedBy || null,
        discountApprovedAt: orderMetadata?.discountApprovedAt || null,
        discountRejectedBy: orderMetadata?.discountRejectedBy || null,
        discountRejectedAt: orderMetadata?.discountRejectedAt || null,
        discountRejectionReason: orderMetadata?.discountRejectionReason || null,
        status: detailEffectiveStatus,
        paymentStatus: derivePaymentStatusForDisplay(order, orderMetadata),
        paymentMethod: (order.paymentMethod || 'CASH').toLowerCase().replace('_', '_on_'),
        shippingAddress: shippingAddress,
        items: order.orderItems.map(item => {
          let parsedMetadata = {};
          try {
            parsedMetadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {});
          } catch (_) {
            parsedMetadata = {};
          }
          const vMeta = (() => {
            if (!item.productVariant?.metadata) return {};
            try {
              return typeof item.productVariant.metadata === 'string' ? JSON.parse(item.productVariant.metadata) : item.productVariant.metadata;
            } catch (_) { return {}; }
          })();
          const vAttrs = vMeta?.attributeValues || vMeta?.attributes || vMeta || {};
          const metaAttrs = parsedMetadata?.attributeValues || parsedMetadata?.attributes || {};

          let resolvedColor =
            item.productColor ||
            parsedMetadata.productColor ||
            parsedMetadata.color ||
            parsedMetadata.Color ||
            parsedMetadata.originalData?.productColor ||
            metaAttrs.Color ||
            metaAttrs.color ||
            metaAttrs['اللون'] ||
            metaAttrs['لون'] ||
            vAttrs.Color ||
            vAttrs.color ||
            vAttrs['اللون'] ||
            vAttrs['لون'] ||
            item.productVariant?.color ||
            '';

          let resolvedSize =
            item.productSize ||
            parsedMetadata.productSize ||
            parsedMetadata.size ||
            parsedMetadata.Size ||
            parsedMetadata.originalData?.productSize ||
            metaAttrs.Size ||
            metaAttrs.size ||
            metaAttrs['المقاس'] ||
            metaAttrs['مقاس'] ||
            vAttrs.Size ||
            vAttrs.size ||
            vAttrs['المقاس'] ||
            vAttrs['مقاس'] ||
            item.productVariant?.size ||
            '';

          if ((!resolvedColor || !resolvedSize) && item.productVariant?.name) {
            const vName = item.productVariant.name;
            const parts = vName.split(/\s*[-–|\/]\s*/).map(p => p.trim());
            if (parts.length >= 2) {
              if (!resolvedColor && isNaN(parts[0])) resolvedColor = parts[0];
              if (!resolvedSize) resolvedSize = parts[parts.length - 1];
            } else if (parts.length === 1 && !resolvedColor && !resolvedSize) {
              if (item.productVariant.type === 'color') resolvedColor = parts[0];
              else if (item.productVariant.type === 'size') resolvedSize = parts[0];
            }
          }

          return {
            id: item.id,
            productId: item.productId,
            name: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            productName: item.productName || item.product?.name || parsedMetadata.productName || 'منتج غير محدد',
            // ✅ FIX: Add productColor, productSize, and productDetails directly for frontend
            productColor: resolvedColor,
            productSize: resolvedSize,
            color: resolvedColor,
            size: resolvedSize,
            productDetails: item.productDetails || parsedMetadata.details || parsedMetadata.productDetails || '',
            productImage: (() => {
              if (item.productImage) return item.productImage;
              if (item.product?.mainImage) return item.product.mainImage;
              if (item.productVariant?.images) {
                try {
                  const vImgs = typeof item.productVariant.images === 'string' ? JSON.parse(item.productVariant.images) : item.productVariant.images;
                  if (Array.isArray(vImgs) && vImgs.length > 0) return vImgs[0];
                  if (typeof vImgs === 'string') return vImgs;
                } catch (e) { /* ignore */ }
              }
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
            productSku: item.productSku || item.productVariant?.sku || parsedMetadata.sku || '',
            metadata: {
              ...parsedMetadata,
              color: resolvedColor,
              size: resolvedSize,
              details: item.productDetails || parsedMetadata.details || parsedMetadata.productDetails,
              image: item.productImage || item.product?.mainImage || (item.product?.images ? (typeof item.product.images === 'string' ? JSON.parse(item.product.images)[0] : item.product.images[0]) : (parsedMetadata.image || parsedMetadata.productImage))
            }
          };
        }),
        trackingNumber: order.shipments?.[0]?.trackingNumber || orderMetadata?.trackingNumber || order.turboTrackingNumber || null,
        carrierType: order.shipments?.[0]?.carrierType || orderMetadata?.shippingCarrier || (order.turboTrackingNumber ? 'TURBO' : null),
        shipment: order.shipments?.[0] || null,
        shipments: order.shipments || [],
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
        // ✅ Wallet payment proof (screenshot + transfer details) for manual verification
        walletPaymentProof:
          orderMetadata?.walletPaymentProof || null,
        // ✅ Kashier online payment details
        kashierPayment:
          orderMetadata?.kashierPayment || null,
        // Turbo Shipping Fields
        turboShipmentId: order.turboShipmentId,
        turboTrackingNumber: order.turboTrackingNumber,
        turboShipmentStatus: order.turboShipmentStatus,
        turboLabelUrl: order.turboLabelUrl,
        turboMetadata: order.turboMetadata,
        turboBranchId: order.turboBranchId,
        turboCaptainName: order.turboCaptainName,
        turboCaptainPhone: order.turboCaptainPhone,
        turboBranchName: order.turboBranchName,
        turboBranchPhone: order.turboBranchPhone,
        turboDelayReason: order.turboDelayReason,
        turboReturnReason: order.turboReturnReason,
        turboExpectedBranch: order.turboExpectedBranch,
        // Source & Meta Fields
        sourceType: (order.sourceType === 'storefront' || orderMetadata?.source === 'storefront' || order.orderSource === 'STOREFRONT')
          ? 'storefront'
          : (order.sourceType || 'unknown'),
        extractionMethod: (order.sourceType === 'storefront' || orderMetadata?.source === 'storefront' || order.orderSource === 'STOREFRONT')
          ? 'storefront'
          : (order.extractionMethod || 'unknown'),
        orderSource: (order.sourceType === 'storefront' || orderMetadata?.source === 'storefront' || order.orderSource === 'STOREFRONT')
          ? (order.orderSource || 'STOREFRONT')
          : (order.orderSource || 'REGULAR'),
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
        statusHistory: order.statusHistory || [],
        returnRequests: order.returnRequests || []
      };

      console.log('📦 [ORDER-DETAIL] Regular Order Turbo fields:', {
        turboShipmentId: formattedOrder.turboShipmentId,
        turboTrackingNumber: formattedOrder.turboTrackingNumber,
        turboShipmentStatus: formattedOrder.turboShipmentStatus,
        turboLabelUrl: formattedOrder.turboLabelUrl,
        turboMetadata: formattedOrder.turboMetadata ? 'exists' : 'null'
      });
    }

    const resolvedOrderMeta = typeof formattedOrder.metadata === 'object' && formattedOrder.metadata !== null
      ? formattedOrder.metadata
      : safeParseOrderMetadata(formattedOrder.metadata);

    let orderSessionDetails = resolvedOrderMeta?.sessionDetails || null;

    // Fallback: If regular order doesn't have sessionDetails or is missing IP, look up linked guestOrder
    if ((!orderSessionDetails || !orderSessionDetails.ip) && (resolvedOrderMeta?.guestOrderId || formattedOrder.orderNumber)) {
      try {
        const linkedGuestOrder = await getSharedPrismaClient().guestOrder.findFirst({
          where: {
            OR: [
              ...(resolvedOrderMeta?.guestOrderId ? [{ id: resolvedOrderMeta.guestOrderId }] : []),
              ...(formattedOrder.orderNumber ? [{ orderNumber: formattedOrder.orderNumber, companyId }] : [])
            ]
          },
          select: { id: true, metadata: true }
        });
        if (linkedGuestOrder?.metadata) {
          const guestMeta = safeParseOrderMetadata(linkedGuestOrder.metadata);
          if (guestMeta?.sessionDetails) {
            orderSessionDetails = guestMeta.sessionDetails;
            const updatedMeta = { ...resolvedOrderMeta, sessionDetails: guestMeta.sessionDetails };
            getSharedPrismaClient().order.update({
              where: { id: formattedOrder.id },
              data: { metadata: JSON.stringify(updatedMeta) }
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('⚠️ [ORDER-DETAIL] Error resolving guest sessionDetails fallback:', err.message);
      }
    }

    if (!orderSessionDetails && resolvedOrderMeta?.attribution) {
      orderSessionDetails = {
        trafficSource: {
          source: resolvedOrderMeta.attribution.source || 'direct',
          medium: resolvedOrderMeta.attribution.medium,
          campaignName: resolvedOrderMeta.attribution.campaignName,
          campaignId: resolvedOrderMeta.attribution.campaignId,
          adSetId: resolvedOrderMeta.attribution.adSetId,
          adId: resolvedOrderMeta.attribution.adId,
          referrer: resolvedOrderMeta.attribution.referrer,
          landingPath: resolvedOrderMeta.attribution.landingPath,
        },
        ip: null,
        pagesVisited: resolvedOrderMeta.attribution.landingPath ? [{ path: resolvedOrderMeta.attribution.landingPath, title: 'صفحة الهبوط', timestamp: formattedOrder.createdAt }] : [],
        durationSeconds: 0,
        sessionCount: 1,
        firstSeenAt: formattedOrder.createdAt,
      };
    }

    // ── On-the-fly GeoIP Resolution & Location Enrichment ──────────────────
    // If order has a valid public IP, but ipGovernorate is missing/null/local:
    if (orderSessionDetails?.ip && !isLocalOrPrivateIp(orderSessionDetails.ip)) {
      const needsGeoResolution = !orderSessionDetails.ipGovernorate ||
        orderSessionDetails.ipGovernorate === 'محلي (تطوير)' ||
        orderSessionDetails.ipCity === 'محلي';

      if (needsGeoResolution) {
        try {
          const resolvedGeo = await resolveIpLocation(orderSessionDetails.ip, req);
          if (resolvedGeo && (resolvedGeo.governorate || resolvedGeo.city)) {
            orderSessionDetails.ipGovernorate = resolvedGeo.governorate || orderSessionDetails.ipGovernorate;
            orderSessionDetails.ipCity = resolvedGeo.city || orderSessionDetails.ipCity;
            orderSessionDetails.ipCountry = resolvedGeo.country || orderSessionDetails.ipCountry || 'EG';

            // Asynchronously persist resolved location back to database
            const updatedMeta = { ...resolvedOrderMeta, sessionDetails: orderSessionDetails };
            const prismaClient = getSharedPrismaClient();
            if (isGuestOrder && guestOrder?.id) {
              prismaClient.guestOrder.update({
                where: { id: guestOrder.id },
                data: { metadata: JSON.stringify(updatedMeta) }
              }).catch(() => {});
            } else if (order?.id) {
              prismaClient.order.update({
                where: { id: order.id },
                data: { metadata: JSON.stringify(updatedMeta) }
              }).catch(() => {});
            }
          }
        } catch (geoErr) {
          console.warn('⚠️ [ORDER-DETAIL] On-the-fly geo lookup error:', geoErr.message);
        }
      }
    }

    // Extract customer shipping address location (governorate & city)
    let shippingGov = formattedOrder.governorate || null;
    let shippingCity = formattedOrder.city || null;
    let rawShipping = formattedOrder.shippingAddress;
    if (typeof rawShipping === 'string') {
      try {
        rawShipping = JSON.parse(rawShipping);
        if (typeof rawShipping === 'string') {
          rawShipping = JSON.parse(rawShipping);
        }
      } catch {}
    }
    if (rawShipping && typeof rawShipping === 'object') {
      if (!shippingGov) shippingGov = rawShipping.governorate || rawShipping.government || null;
      if (!shippingCity) shippingCity = rawShipping.city || null;
    }

    if (orderSessionDetails) {
      if (!orderSessionDetails.ipGovernorate && shippingGov) {
        orderSessionDetails.ipGovernorate = shippingGov;
      }
      if (!orderSessionDetails.ipCity && shippingCity) {
        orderSessionDetails.ipCity = shippingCity;
      }
    } else if (shippingGov || shippingCity) {
      orderSessionDetails = {
        ip: null,
        ipGovernorate: shippingGov || null,
        ipCity: shippingCity || null,
        ipCountry: 'EG',
        pagesVisited: [],
        durationSeconds: 0,
        sessionCount: 1,
        firstSeenAt: formattedOrder.createdAt,
      };
    }

    const [firstOrderInfo, customerHistory] = await Promise.all([
      getCustomerFirstOrderInfo(getSharedPrismaClient(), companyId, {
        phone: formattedOrder.customerPhone,
        email: formattedOrder.customerEmail,
        customerId: formattedOrder.customerId,
        currentOrderNumber: formattedOrder.orderNumber,
      }),
      getCustomerOrderHistory(getSharedPrismaClient(), companyId, {
        phone: formattedOrder.customerPhone,
        alternativePhone: formattedOrder.alternativePhone,
        email: formattedOrder.customerEmail,
        customerId: formattedOrder.customerId,
        currentOrderNumber: formattedOrder.orderNumber,
        limit: 25,
      }),
    ]);

    formattedOrder.sessionDetails = orderSessionDetails;
    formattedOrder.firstOrderInfo = firstOrderInfo;
    formattedOrder.customerHistory = customerHistory;

    // 🏷️ توحيد حسبة تقييم العميل في صفحة تفاصيل الطلب مع جدول الطلبات بناءً على الشحنات المنتهية فعلياً
    const histStats = customerHistory?.stats;
    if (histStats) {
      const isDuplicate =
        String(formattedOrder.status || '').toUpperCase() === 'DUPLICATE_ORDER' ||
        Boolean(formattedOrder.metadata?.duplicate);
      const delivered = histStats.deliveredCount || 0;
      const returned = histStats.returnedCount || 0;
      const cancelled = histStats.cancelledCount || 0;
      const attempts = delivered + returned;
      const total = Math.max(1, histStats.totalOrders || 1);

      let deliveryRate = null;
      let score = null;
      let diagnosis = 'عميل جديد — لم تكتمل له شحنات سابقة بعد';
      let ratingTier = 'UNKNOWN';

      if (isDuplicate) {
        score = 3.3;
        ratingTier = 'POOR';
        diagnosis = 'تحذير: طلب مكرر لنفس العميل — نسبة مخاطرة مرتفعة';
      } else if (attempts > 0) {
        const rate = delivered / attempts;
        deliveryRate = Math.round(rate * 1000) / 10;

        let s;
        if (delivered === 0) {
          s = Math.max(1.5, 2.8 - returned * 0.5);
        } else if (returned === 0) {
          s = ((delivered + 1.125) / (attempts + 1.5)) * 10;
        } else {
          const base = ((delivered + 1.125) / (attempts + 1.5)) * 10;
          const penalty = (1 - rate) * 1.8;
          s = base - penalty;
        }

        score = Math.min(9.9, Math.max(1.0, Math.round(s * 10) / 10));

        if (score >= 8.0) {
          ratingTier = 'EXCELLENT';
          diagnosis = `سجل استلام ممتاز (${Math.round(deliveryRate)}%) — ${Math.floor(delivered)} من ${Math.round(attempts)} طلب`;
        } else if (score >= 7.0) {
          ratingTier = 'GOOD';
          diagnosis = `سجل استلام جيد (${Math.round(deliveryRate)}%) — ${Math.floor(delivered)} من ${Math.round(attempts)} طلب`;
        } else if (score >= 5.0) {
          ratingTier = 'AVERAGE';
          diagnosis = `سجل استلام متوسط (${Math.round(deliveryRate)}%) — ${returned > 0 ? `${returned} مرتجع سابق` : ''}`;
        } else {
          ratingTier = 'POOR';
          diagnosis = `تحذير: مخاطرة مرتفعة (${Math.round(deliveryRate)}%) — ${returned} مرتجع سابق`;
        }
      }

      formattedOrder.customerRating = ratingTier;
      formattedOrder.customerSuccessScore = score;
      formattedOrder.customerDeliveryRate = deliveryRate;
      formattedOrder.healthScore = score;
      formattedOrder.healthDiagnosis = diagnosis;
      formattedOrder.deliveryRate = deliveryRate;
      formattedOrder.totalDelivered = Math.floor(delivered);
      formattedOrder.totalFailed = Math.ceil(returned);
      formattedOrder.totalCancelled = cancelled;
      formattedOrder.totalAttempts = Math.round(attempts);
      formattedOrder.totalOrdersCount = total;

      if (formattedOrder.customer) {
        formattedOrder.customer.customerRating = ratingTier;
        formattedOrder.customer.healthScore = score;
        formattedOrder.customer.deliveryRate = deliveryRate;
        formattedOrder.customer.totalDelivered = Math.floor(delivered);
        formattedOrder.customer.totalOrdersCount = total;
      }
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
      const exportTimezone = await getCompanyTimezone(companyId);
      const dateRangeFilter = buildDateRangeFilter(startDate, endDate, exportTimezone);
      if (dateRangeFilter.gte || dateRangeFilter.lte) {
        whereClause.createdAt = dateRangeFilter;
        guestWhereClause.createdAt = dateRangeFilter;
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
          customer: { select: { firstName: true, lastName: true, phone: true } },
          orderItems: { select: { quantity: true } }
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
          guestPhone: true,
          items: true
        }
      })
    ]);

    const regularOrderNumberSet = new Set(
      regularOrders.map(o => String(o.orderNumber || '').trim().toLowerCase()).filter(Boolean)
    );
    const uniqueGuestOrders = guestOrders.filter(
      g => !regularOrderNumberSet.has(String(g.orderNumber || '').trim().toLowerCase())
    );

    const parseExportGuestItemsPieces = (rawItems) => {
      let items = [];
      try {
        items = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);
        if (items && !Array.isArray(items) && Array.isArray(items.items)) {
          items = items.items;
        }
      } catch (e) {
        items = [];
      }
      return Array.isArray(items)
        ? items.reduce((s, it) => s + (Number(it?.quantity) || 1), 0)
        : 1;
    };

    const isExcludedFromAnalytics = (status) => {
      const s = String(status || '').toUpperCase();
      return ['TRASH', 'TRASH_ORDER', 'DELETED', 'DRAFT', 'DUPLICATE_ORDER'].includes(s);
    };

    // Format Data for Excel
    const allOrders = [
      ...regularOrders.map(o => {
        const totalPieces = (o.orderItems || []).reduce((s, it) => s + (Number(it.quantity) || 1), 0);
        const isMulti = totalPieces > 1;
        const eligible = !isExcludedFromAnalytics(o.status);
        return {
          'Order Number': o.orderNumber,
          'Date': o.createdAt,
          'Customer Name': o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : '',
          'Phone': o.customer?.phone || '',
          'Total': o.total,
          'Status': o.status,
          'Payment Status': o.paymentStatus,
          'Total Pieces': totalPieces,
          'عدد القطع': totalPieces,
          'Is Multi-Piece': isMulti ? 'Yes' : 'No',
          'أكتر من قطعة': isMulti ? 'نعم' : 'لا',
          'مؤهل للتحليلات': eligible ? 'نعم' : 'لا',
          'Type': 'Regular'
        };
      }),
      ...uniqueGuestOrders.map(o => {
        const totalPieces = parseExportGuestItemsPieces(o.items);
        const isMulti = totalPieces > 1;
        const eligible = !isExcludedFromAnalytics(o.status);
        return {
          'Order Number': o.orderNumber,
          'Date': o.createdAt,
          'Customer Name': o.guestName || '',
          'Phone': o.guestPhone || '',
          'Total': o.total,
          'Status': o.status,
          'Payment Status': 'Unavailable',
          'Total Pieces': totalPieces,
          'عدد القطع': totalPieces,
          'Is Multi-Piece': isMulti ? 'Yes' : 'No',
          'أكتر من قطعة': isMulti ? 'نعم' : 'لا',
          'مؤهل للتحليلات': eligible ? 'نعم' : 'لا',
          'Type': 'Guest'
        };
      })
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
    const { status, notes, isOverride = false } = req.body;

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

    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // 🛡️ PRODUCTION-FIX (status-validation-unify): التحقق كان بيبني على VALID_ORDER_STATUSES
    // (فيه أكواد وهمية وناقصه PENDING_CANCELLATION) + orderStatusDefinition (جدول الـ workflow)
    // — فالحالات المخصصة اللي sync بتاعها للـ workflow فشل كانت بتترفض هنا بينما المسار
    // الرئيسي بيقبلها. اتوحّد على نفس مصدر الحقيقة: enum + orderStatusConfig النشطة.
    const { VALID_ORDER_STATUS_ENUM } = require('../utils/orderStatusEnum');
    const validStatuses = new Set(VALID_ORDER_STATUS_ENUM);
    try {
      const customStatuses = await getSharedPrismaClient().orderStatusConfig.findMany({
        where: { companyId, isActive: true },
        select: { code: true }
      });
      customStatuses.forEach(s => validStatuses.add(s.code.toUpperCase()));
    } catch (_) { /* fallback to built-in list */ }

    if (!validStatuses.has(normalizedStatus)) {
      console.log(`❌ [ORDERS-ROUTE-DEBUG] Invalid status: ${status}`);
      return res.status(400).json({
        success: false,
        message: 'حالة الطلب غير صحيحة'
      });
    }

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
    const order = await orderService.updateOrderStatus(orderNumber, companyId, normalizedStatus, statusNotes, userId, userName, null, isOverride);

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

    const existingOrder = await getSharedPrismaClient().order.findFirst({
      where: { OR: [{ id: orderNumber, companyId }, { orderNumber, companyId }] },
      select: { metadata: true }
    }) || await getSharedPrismaClient().guestOrder.findFirst({
      where: { OR: [{ id: orderNumber, companyId }, { orderNumber, companyId }] },
      select: { metadata: true }
    });
    const orderMeta = parseOrderMetadata(existingOrder?.metadata);
    if (orderMeta?.discountApprovalStatus === 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تأكيد هذا الطلب قبل اعتماد الخصم من قِبل الإدارة أو إلغائه'
      });
    }

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
      address,
      status
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

    // الوضع السهل: قراءة إعداد استيراد المنتجات التلقائي
    let easyWarehouseMode = false;
    try {
      const { getSharedPrismaClient: getPrisma } = require('../services/sharedDatabase');
      const storeSettings = await getPrisma().storefrontSettings.findUnique({
        where: { companyId },
        select: { easyWarehouseMode: true }
      });
      easyWarehouseMode = storeSettings?.easyWarehouseMode === true;
    } catch (settingsError) {
      easyWarehouseMode = false;
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
        productId: item.productId || null,
        productName: item.productName || item.name || '',
        productColor: item.productColor ? String(item.productColor) : (item.color ? String(item.color) : null),
        productSize: item.productSize != null ? String(item.productSize) : (item.size != null ? String(item.size) : null),
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity, 10) || 1,
        total: parseFloat(item.total || ((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1))),
        variantId: item.variantId || null,
        sku: item.sku || item.productSku || null,
        productSku: item.productSku || item.sku || null,
        productImage: item.productImage || item.image || null,
        image: item.image || item.productImage || null,
        attributes: item.attributes || item.productAttributes || null,
      };
    });

    console.log('✅ [ORDER-DEBUG] Converted products:', JSON.stringify(products, null, 2));

    // تحضير بيانات الطلب بنفس صيغة خدمة الطلبات المحسنة
    const orderData = {
      companyId,
      customerId,
      conversationId,

      // معلومات المنتجات
      productId: products[0]?.productId || null,
      productName: products.map(p => p.productName).filter(Boolean).join(', '),
      productColor: products[0]?.productColor,
      productSize: products[0]?.productSize,
      productPrice: products[0]?.price,
      productImage: products[0]?.productImage || null,
      productSku: products[0]?.productSku || null,
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

      // الحالة
      status: status || undefined,

      // الوضع السهل: استيراد المنتجات تلقائيًا
      easyWarehouseMode,

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

    // ⚡ إرسال الويب هوك الصادر للطلبات (Outgoing Webhook)
    try {
      const orderWebhookService = require('../services/orderWebhookService');
      const companyId = req.user?.effectiveCompanyId || req.user?.companyId || order.companyId;
      orderWebhookService.triggerOrderCreated(order.id, companyId);
    } catch (webhookErr) {
      console.warn('⚠️ [ORDERS] Failed to trigger order webhook:', webhookErr.message);
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
        if (!['CANCELLED', 'CANCELED', 'REJECTED', 'PENDING', 'CALL_ATTEMPT'].includes(normalizedStatus)) {
          const prisma = getSharedPrismaClient();
          const target = await prisma.order.findFirst({
            where: { OR: [{ id }, { orderNumber: id }], companyId },
            select: { metadata: true }
          }) || await prisma.guestOrder.findFirst({
            where: { OR: [{ id }, { orderNumber: id }], companyId },
            select: { metadata: true }
          });
          const meta = parseOrderMetadata(target?.metadata);
          if (meta?.discountApprovalStatus === 'PENDING_APPROVAL') {
            results.push({ id, success: false, error: 'لا يمكن تأكيد أو تجهيز هذا الطلب قبل اعتماد الخصم' });
            continue;
          }
        }

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

// Bulk Status Update by Filters (apply to all matching filters)
router.post('/bulk/status/by-filters', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { status, notes, filters } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status required' });
    }

    const userId = req.user?.id;
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'System';

    const result = await preparationQueueService.bulkUpdateByFilters({
      user: req.user,
      query: filters || {},
      targetStatus: status,
      notes,
      userId,
      userName,
    });

    res.json({
      success: true,
      message: `تم تحديث ${result.successCount} طلب بنجاح`,
      data: result
    });
  } catch (error) {
    console.error('❌ Error bulk updating orders by filters:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Failed to update orders by filters',
      error: error.message
    });
  }
});

// Bulk Delete
router.post('/bulk/delete', verifyToken.authenticateToken, verifyToken.requireRole(['OWNER', 'COMPANY_ADMIN', 'MANAGER']), async (req, res) => {
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
    const cartCount = results.filter((result) => result.success && result.orderType === 'cart').length;
    const successCount = regularCount + guestCount + cartCount;

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
        cartDeleted: cartCount,
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
      const diffDetails = result.diffDetails || [];
      const changedFields = result.updatedFields || [];
      const fieldLabels = {
        shippingAddress: 'العنوان',
        customerName: 'اسم العميل',
        customerPhone: 'رقم الهاتف',
        alternativePhone: 'الرقم البديل',
        city: 'المدينة',
        governorate: 'المحافظة',
        notes: 'الملاحظات',
        metadataPatch: 'البيانات الإضافية',
      };
      const mappedFields = changedFields
        .map((f) => fieldLabels[f] || f)
        .filter(Boolean);

      let reason = 'تعديل البيانات الأساسية للطلب';
      if (diffDetails.length > 0) {
        reason = `تعديل بيانات العميل والشحن:\n• ${diffDetails.join('\n• ')}`;
      } else if (mappedFields.length > 0) {
        reason = `تعديل: ${mappedFields.join('، ')}`;
      } else if (changedFields.length === 0) {
        reason = null;
      }

      if (reason) {
        const userName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'النظام';

        if (result.orderType === 'regular') {
          const order = await getSharedPrismaClient().order.findUnique({
            where: { id: result.orderId },
            select: { id: true, status: true },
          });
          if (order) {
            await getSharedPrismaClient().orderStatusHistory.create({
              data: {
                orderId: order.id,
                status: order.status,
                oldStatus: order.status,
                reason,
                changedBy: req.user?.id || 'SYSTEM',
                userName: userName || 'النظام',
              },
            });
          }
        } else if (result.orderType === 'guest') {
          const guest = await getSharedPrismaClient().guestOrder.findUnique({
            where: { id: result.orderId },
            select: { id: true, status: true },
          });
          await getSharedPrismaClient().orderStatusHistory.create({
            data: {
              guestOrderId: result.orderId,
              status: guest?.status || 'PENDING',
              oldStatus: guest?.status || 'PENDING',
              reason,
              changedBy: req.user?.id || 'SYSTEM',
              userName: userName || 'النظام',
            },
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
    const message = statusCode === 400 || statusCode === 404 || statusCode === 403
      ? error.message
      : 'فشل تحديث الأوردر';
    res.status(statusCode).json({ success: false, message, error: error.message });
  }
});

// ⭐ تحديث تقييم العميل المرتبط بالطلب (سواء كان طلب مسجل أو طلب ضيف)
const handleCustomerRatingUpdate = async (req, res) => {
  try {
    const orderNumber = req.params.orderNumber || req.params.id;
    const { rating } = req.body;
    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = req.companyId || merchant?.companyId || req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    const validRatings = {
      EXCELLENT: 'EXCELLENT',
      GOOD: 'GOOD',
      AVERAGE: 'AVERAGE',
      POOR: 'POOR',
      BAD: 'POOR',
      UNKNOWN: 'UNKNOWN'
    };
    const normalizedRating = validRatings[String(rating || '').trim().toUpperCase()];
    if (!normalizedRating) {
      return res.status(400).json({ success: false, message: 'قيمة التقييم غير صالحة. القيم المسموحة: EXCELLENT, GOOD, AVERAGE, POOR, UNKNOWN' });
    }

    const prisma = getSharedPrismaClient();

    // 1. فحص الطلب المسجل (Regular Order)
    let regularOrder = await prisma.order.findFirst({
      where: {
        companyId,
        OR: [{ id: orderNumber }, { orderNumber }]
      },
      include: { customer: true }
    });

    let customer = regularOrder?.customer || null;
    let customerId = regularOrder?.customerId || regularOrder?.customer?.id;

    if (regularOrder && customerId) {
      customer = await prisma.customer.update({
        where: { id: customerId },
        data: { customerRating: normalizedRating }
      });
    } else {
      // 2. البحث عن رقم هاتف العميل من الطلب المسجل أو طلب الضيف
      let phone = regularOrder?.customerPhone || regularOrder?.customer?.phone;
      let customerName = regularOrder?.customerName || '';

      if (!regularOrder) {
        const guestOrder = await prisma.guestOrder.findFirst({
          where: {
            companyId,
            OR: [{ id: orderNumber }, { orderNumber }]
          }
        });
        if (guestOrder) {
          phone = guestOrder.guestPhone;
          customerName = guestOrder.guestName || '';
        }
      }

      if (!phone) {
        return res.status(404).json({ success: false, message: 'الطلب غير موجود أو لا يحتوي على هاتف للعميل' });
      }

      const { findCustomerByPhone, createCustomerByPhone } = require('../utils/customerIdentity');
      customer = await findCustomerByPhone(prisma, phone, companyId);

      if (customer) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: { customerRating: normalizedRating }
        });
      } else {
        const nameParts = String(customerName || '').trim().split(/\s+/);
        const firstName = nameParts[0] || 'عميل';
        const lastName = nameParts.slice(1).join(' ') || '';

        customer = await createCustomerByPhone(prisma, {
          companyId,
          phone,
          data: {
            firstName,
            lastName,
            customerRating: normalizedRating
          }
        });
      }

      // ربط الطلب المسجل بالعميل إذا لم يكن مربوطاً
      if (regularOrder && customer?.id && !regularOrder.customerId) {
        await prisma.order.update({
          where: { id: regularOrder.id },
          data: { customerId: customer.id }
        }).catch(() => {});
      }
    }

    try {
      if (socketService?.getIO()) {
        socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
          orderNumber,
          customerId: customer.id,
          customerRating: customer.customerRating
        });
      }
    } catch (socketError) {
      console.warn('⚠️ [ORDER-CUSTOMER-RATING] Socket emit failed:', socketError.message);
    }

    return res.json({
      success: true,
      data: {
        orderNumber,
        customerId: customer.id,
        customerRating: customer.customerRating
      },
      message: 'تم تحديث تقييم العميل بنجاح'
    });
  } catch (error) {
    console.error('❌ [ORDER-CUSTOMER-RATING] Error updating rating:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث تقييم العميل', error: error.message });
  }
};

// ⭐ إعادة احتساب تقييم العميل المرتبط بالطلب آلياً
const handleCustomerRatingRecalculate = async (req, res) => {
  try {
    const orderNumber = req.params.orderNumber || req.params.id;
    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = req.companyId || merchant?.companyId || req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    const prisma = getSharedPrismaClient();

    // 1. فحص الطلب المسجل
    let regularOrder = await prisma.order.findFirst({
      where: {
        companyId,
        OR: [{ id: orderNumber }, { orderNumber }]
      },
      select: { id: true, customerId: true, customerPhone: true }
    });

    let customerId = regularOrder?.customerId;

    if (!customerId && regularOrder?.customerPhone) {
      const { findCustomerByPhone } = require('../utils/customerIdentity');
      const cust = await findCustomerByPhone(prisma, regularOrder.customerPhone, companyId);
      customerId = cust?.id;
    }

    if (!customerId) {
      // فحص طلب الضيف
      const guestOrder = await prisma.guestOrder.findFirst({
        where: { companyId, orderNumber },
        select: { guestPhone: true }
      });
      if (guestOrder?.guestPhone) {
        const { findCustomerByPhone } = require('../utils/customerIdentity');
        const cust = await findCustomerByPhone(prisma, guestOrder.guestPhone, companyId);
        customerId = cust?.id;
      }
    }

    if (!customerId) {
      return res.status(404).json({ success: false, message: 'تعذر العثور على العميل المرتبط بهذا الطلب لاحتساب تقييمه' });
    }

    const { calculateCustomerScore } = require('../services/customerRatingService');
    const result = await calculateCustomerScore(customerId, companyId, prisma);

    try {
      if (socketService?.getIO()) {
        socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
          orderNumber,
          customerId,
          customerRating: result.rating,
          healthScore: result.healthScore,
          deliveryRate: result.deliveryRate,
          totalDelivered: result.totalDelivered,
          totalAttempts: result.totalAttempts
        });
      }
    } catch (socketError) {
      console.warn('⚠️ [ORDER-CUSTOMER-RATING-RECALC] Socket emit failed:', socketError.message);
    }

    return res.json({
      success: true,
      data: {
        orderNumber,
        customerId,
        rating: result.rating,
        healthScore: result.healthScore,
        deliveryRate: result.deliveryRate,
        totalDelivered: result.totalDelivered,
        totalAttempts: result.totalAttempts
      },
      message: 'تمت إعادة احتساب تقييم العميل آلياً بنجاح'
    });
  } catch (error) {
    console.error('❌ [ORDER-CUSTOMER-RATING-RECALC] Error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إعادة احتساب تقييم العميل', error: error.message });
  }
};

router.put('/simple/:orderNumber/customer-rating', verifyToken.authenticateToken, handleCustomerRatingUpdate);
router.post('/simple/:orderNumber/customer-rating', verifyToken.authenticateToken, handleCustomerRatingUpdate);
router.post('/simple/:orderNumber/recalculate-rating', verifyToken.authenticateToken, handleCustomerRatingRecalculate);
router.handleCustomerRatingUpdate = handleCustomerRatingUpdate;
router.handleCustomerRatingRecalculate = handleCustomerRatingRecalculate;

// Update Order Items
router.put('/simple/:orderNumber/items', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { items, total, subtotal, tax, shipping, discount, discountReason } = req.body;
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
      // 🔒 قفل تعديل بيانات الأوردر (لكل حالة): تعديل المنتجات/الأسعار — لو
      // الحالة الحالية غير مسموح تعديل بياناتها، نرفض.
      const { assertOrderStatusEditable } = require('../utils/orderStatusLock');
      await assertOrderStatusEditable(getSharedPrismaClient(), companyId, regularOrder.status);

      const oldDiscount = Number(regularOrder.discount) || 0;
      const nextDiscount = discount !== undefined ? Math.max(0, parseFloat(discount) || 0) : oldDiscount;
      const currentMetadata = safeParseOrderMetadata(regularOrder.metadata);
      if (discountReason !== undefined) {
        currentMetadata.discountReason = discountReason ? String(discountReason).trim() : null;
      } else if (nextDiscount > 0 && !currentMetadata.discountReason) {
        currentMetadata.discountReason = 'خصم يدوي';
      }

      const calculatedTotal = Number.isFinite(Number(total))
        ? Number(total)
        : Math.max(0, (Number(subtotal) || 0) + (Number(shipping) || 0) + (Number(tax) || 0) - nextDiscount);

      const { computeOrderItemsDiff } = require('../utils/orderDiffHelper');
      const oldOrderItems = await getSharedPrismaClient().orderItem.findMany({
        where: { orderId: regularOrder.id }
      });
      const oldTotals = {
        total: Number(regularOrder.total) || 0,
        subtotal: Number(regularOrder.subtotal) || 0,
        shipping: Number(regularOrder.shipping) || 0,
      };
      const newTotals = {
        total: calculatedTotal,
        subtotal: Number(subtotal) || 0,
        shipping: Number(shipping) || 0,
      };
      const itemDiffs = computeOrderItemsDiff(oldOrderItems, items, oldTotals, newTotals);
      if (nextDiscount !== oldDiscount) {
        itemDiffs.push(`الخصم: ${oldDiscount} ← ${nextDiscount}${currentMetadata.discountReason ? ` (${currentMetadata.discountReason})` : ''}`);
      }
      let itemsReason = 'تعديل منتجات الطلب';
      if (itemDiffs.length > 0) {
        itemsReason = `تعديل منتجات الطلب:\n• ${itemDiffs.join('\n• ')}`;
      }

      // Transaction: Delete old items, Create new items, Update totals
      await getSharedPrismaClient().$transaction(async (prisma) => {
        // Delete existing items
        await prisma.orderItem.deleteMany({
          where: { orderId: regularOrder.id }
        });

        // Create new items
        for (const item of items) {
          // التحقق من وجود المنتج والمتغير قبل إضافته
          let validProductId = null;
          let validVariantId = null;

          if (item.productId) {
            try {
              const product = await prisma.product.findUnique({
                where: { id: item.productId },
                select: { id: true, companyId: true }
              });

              if (product && product.companyId === companyId) {
                validProductId = item.productId;
              } else {
                // If productId is not a Product ID, check if it's a ProductVariant ID
                const variantAsProduct = await prisma.productVariant.findUnique({
                  where: { id: item.productId },
                  include: { product: true }
                });
                if (variantAsProduct && variantAsProduct.product?.companyId === companyId) {
                  validProductId = variantAsProduct.productId;
                  validVariantId = variantAsProduct.id;
                } else {
                  console.log(`⚠️ [ORDER-UPDATE] Product ${item.productId} not found or belongs to different company, using null`);
                }
              }
            } catch (productError) {
              console.log(`⚠️ [ORDER-UPDATE] Error checking product ${item.productId}:`, productError.message);
            }
          }

          const candidateVariantId = item.variantId || item.metadata?.variantId;
          if (candidateVariantId && !validVariantId) {
            try {
              const variant = await prisma.productVariant.findUnique({
                where: { id: candidateVariantId }
              });
              if (variant) {
                validVariantId = variant.id;
                if (!validProductId && variant.productId) {
                  validProductId = variant.productId;
                }
              }
            } catch (variantError) {
              console.log(`⚠️ [ORDER-UPDATE] Error checking variant ${candidateVariantId}:`, variantError.message);
            }
          }

          await prisma.orderItem.create({
            data: {
              orderId: regularOrder.id,
              productId: validProductId, // null إذا لم يكن المنتج موجوداً
              variantId: validVariantId,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              productName: item.productName || item.name || null, // ✅ FIX: Persist product details
              productColor: item.productColor || item.color || null, // ✅ FIX: Persist product details
              productSize: item.productSize != null ? String(item.productSize) : (item.size != null ? String(item.size) : null), // ✅ FIX: Persist product details
              productImage: item.productImage || item.image || item.metadata?.image || null,
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
            total: calculatedTotal,
            subtotal,
            tax,
            shipping,
            discount: nextDiscount,
            metadata: JSON.stringify(currentMetadata),
            updatedAt: new Date()
          }
        });

        // Also synchronize existing OrderInvoice if already generated for this order
        await prisma.orderInvoice.updateMany({
          where: { orderId: regularOrder.id },
          data: {
            subtotal,
            tax,
            shipping,
            discount: nextDiscount,
            totalAmount: calculatedTotal,
            updatedAt: new Date()
          }
        });

        // Synchronize twin GuestOrder if it exists
        const twinGuestOrder = await prisma.guestOrder.findFirst({
          where: { orderNumber: regularOrder.orderNumber, companyId }
        });
        if (twinGuestOrder) {
          const guestMetadata = safeParseOrderMetadata(twinGuestOrder.metadata);
          if (discountReason !== undefined) {
            guestMetadata.discountReason = discountReason ? String(discountReason).trim() : null;
          } else if (nextDiscount > 0 && !guestMetadata.discountReason) {
            guestMetadata.discountReason = currentMetadata.discountReason || 'خصم يدوي';
          }
          await prisma.guestOrder.update({
            where: { id: twinGuestOrder.id },
            data: {
              items: JSON.stringify(items),
              total: subtotal,
              shippingCost: shipping,
              discountAmount: nextDiscount,
              finalTotal: calculatedTotal,
              metadata: JSON.stringify(guestMetadata),
              updatedAt: new Date()
            }
          });
        }
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
            reason: itemsReason,
            changedBy: req.user?.id || 'SYSTEM',
            userName: req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'النظام'
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
      // 🔒 قفل تعديل بيانات الأوردر (لكل حالة) — طلبات الضيوف (منتجات/أسعار).
      const { assertOrderStatusEditable } = require('../utils/orderStatusLock');
      await assertOrderStatusEditable(getSharedPrismaClient(), companyId, guestOrder.status);

      const oldGuestDiscount = Number(guestOrder.discountAmount) || 0;
      const nextGuestDiscount = discount !== undefined ? Math.max(0, parseFloat(discount) || 0) : oldGuestDiscount;
      const guestMetadata = safeParseOrderMetadata(guestOrder.metadata);
      if (discountReason !== undefined) {
        guestMetadata.discountReason = discountReason ? String(discountReason).trim() : null;
      } else if (nextGuestDiscount > 0 && !guestMetadata.discountReason) {
        guestMetadata.discountReason = 'خصم يدوي';
      }

      const nextSubtotal = toSafeOrderAmount(subtotal);
      const nextShipping = toSafeOrderAmount(shipping);
      const nextFinalTotal = Number.isFinite(Number(total))
        ? Number(total)
        : Math.max(0, nextSubtotal + nextShipping - nextGuestDiscount);

      const { computeOrderItemsDiff, parseJsonObject } = require('../utils/orderDiffHelper');
      const oldGuestItems = parseJsonObject(guestOrder.items, []);
      const oldGuestTotals = {
        total: Number(guestOrder.finalTotal ?? guestOrder.total) || 0,
        subtotal: Number(guestOrder.total) || 0,
        shipping: Number(guestOrder.shippingCost) || 0,
      };
      const newGuestTotals = {
        total: nextFinalTotal,
        subtotal: nextSubtotal,
        shipping: nextShipping,
      };
      const guestItemDiffs = computeOrderItemsDiff(oldGuestItems, items, oldGuestTotals, newGuestTotals);
      if (nextGuestDiscount !== oldGuestDiscount) {
        guestItemDiffs.push(`الخصم: ${oldGuestDiscount} ← ${nextGuestDiscount}${guestMetadata.discountReason ? ` (${guestMetadata.discountReason})` : ''}`);
      }
      let guestItemsReason = 'تعديل منتجات الطلب';
      if (guestItemDiffs.length > 0) {
        guestItemsReason = `تعديل منتجات الطلب:\n• ${guestItemDiffs.join('\n• ')}`;
      }

      // Guest Order stores items as JSON, much easier
      await getSharedPrismaClient().guestOrder.update({
        where: { id: guestOrder.id },
        data: {
          items: JSON.stringify(items),
          total: nextSubtotal,
          shippingCost: nextShipping,
          discountAmount: nextGuestDiscount,
          finalTotal: nextFinalTotal,
          metadata: JSON.stringify(guestMetadata),
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

      // --- LOG MODIFICATION FOR GUEST ORDER ---
      try {
        await getSharedPrismaClient().orderStatusHistory.create({
          data: {
            guestOrderId: guestOrder.id,
            status: guestOrder.status || 'PENDING',
            oldStatus: guestOrder.status || 'PENDING',
            reason: guestItemsReason,
            changedBy: req.user?.id || 'SYSTEM',
            userName: req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'النظام'
          }
        });
      } catch (logError) {
        console.error('❌ [ORDER-UPDATE] Error logging guest items modification:', logError);
      }
      // ------------------------

      return res.json({ success: true, message: 'Order items updated successfully' });
    }

    res.status(404).json({ success: false, message: 'Order not found' });

  } catch (error) {
    console.error('❌ Error updating order items:', error);
    const statusCode = error.statusCode || 500;
    const message = statusCode === 403
      ? error.message
      : 'فشل تحديث منتجات الأوردر';
    res.status(statusCode).json({ success: false, message, error: error.message });
  }
});

// Schedule/Postpone an existing order
router.post('/simple/:orderNumber/schedule', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { scheduledDeliveryDate, scheduledNotes, autoTransitionEnabled, changeStatusToScheduled } = req.body;
    const merchant = isMerchantUser(req.user)
      ? await requireMerchantAccountForUser(req.user)
      : null;
    const companyId = merchant?.companyId || req.user?.companyId;

    if (!companyId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const hasPermission = await checkOrderEditPermission(req, orderNumber);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتعديل هذا الطلب'
      });
    }

    const prisma = getSharedPrismaClient();
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderNumber, companyId },
          { orderNumber, companyId }
        ]
      },
      select: { id: true, orderNumber: true, status: true, isScheduled: true }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    // 🔒 قفل تعديل بيانات الأوردر (لكل حالة): التأجيل يعدّل بيانات الطلب
    // (تاريخ التسليم/ملاحظات الجدولة) — لو الحالة الحالية غير مسموح تعديل
    // بياناتها، نرفض.
    const { assertOrderStatusEditable } = require('../utils/orderStatusLock');
    await assertOrderStatusEditable(prisma, companyId, order.status);

    if (!scheduledDeliveryDate) {
      return res.status(400).json({ success: false, message: 'تاريخ التسليم مطلوب' });
    }

    const deliveryDate = new Date(scheduledDeliveryDate);
    if (isNaN(deliveryDate.getTime())) {
      return res.status(400).json({ success: false, message: 'تاريخ التسليم غير صالح' });
    }

    const updateData = {
      isScheduled: true,
      scheduledDeliveryDate: deliveryDate,
      scheduledNotes: scheduledNotes || null,
      autoTransitionEnabled: autoTransitionEnabled !== false,
    };

    if (changeStatusToScheduled !== false && order.status !== 'SCHEDULED') {
      updateData.status = 'SCHEDULED';
    }

    await prisma.order.update({
      where: { id: order.id },
      data: updateData
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: updateData.status || order.status,
        oldStatus: order.status,
        changedBy: req.user?.id,
        userName: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'النظام',
        reason: scheduledNotes
          ? `تأجيل الطلب إلى ${deliveryDate.toLocaleDateString('ar-EG')} - ${scheduledNotes}`
          : `تأجيل الطلب إلى ${deliveryDate.toLocaleDateString('ar-EG')}`
      }
    });

    try {
      if (socketService?.getIO()) {
        socketService.getIO().to(`company_${companyId}`).emit('order:updated', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          isScheduled: true,
          scheduledDeliveryDate: updateData.scheduledDeliveryDate,
          status: updateData.status || order.status
        });
      }
    } catch (socketError) {
      console.error('❌ [ORDER-SCHEDULE] Socket error:', socketError);
    }

    return res.json({ success: true, message: 'تم تأجيل الطلب بنجاح' });
  } catch (error) {
    console.error('❌ [ORDER-SCHEDULE] Error:', error);
    const statusCode = error.statusCode || 500;
    const message = statusCode === 403 ? error.message : 'فشل تأجيل الطلب';
    res.status(statusCode).json({ success: false, message, error: error.message });
  }
});

module.exports = router;






