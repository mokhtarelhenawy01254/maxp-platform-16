let Prisma;
try {
  Prisma = require('../prisma/generated/postgresql_v2').Prisma;
} catch (_error) {
  Prisma = require('@prisma/client').Prisma;
}
const { getSharedPrismaClient } = require('./sharedDatabase');
const {
  isMerchantUser,
  requireMerchantAccountForUser
} = require('../utils/merchantAccountScope');

const PREPARATION_STATUS_METADATA_KEY = 'preparationStatus';
const PREPARATION_SHORTAGE_HOLD_METADATA_KEY = 'preparationShortageHold';
const PREPARATION_HOLD_METADATA_KEY = 'preparationHold';
const PREPARATION_HOLD_STAGES = new Set(['STOCK_SHORTAGE', 'ON_HOLD_PREP']);
const PREPARATION_SHORTAGE_REASONS = new Set([
  'stock_shortage',
  'waiting_transfer',
  'waiting_restock',
  'other'
]);
const PREPARATION_TERMINAL_STATUSES = new Set([
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'DUPLICATE_ORDER',
  'TRASH',
  'SHORTAGE_FAILED'
]);
const PREPARATION_SOURCE_LABELS = {
  ai_conversation: 'محادثة تلقائية',
  storefront: 'المتجر',
  woocommerce: 'WooCommerce',
  manual: 'يدوي',
  api: 'API',
  import: 'استيراد',
  pos: 'POS',
  unknown: 'غير معروف'
};
const PREPARATION_SHORTAGE_FOLLOW_UP_PRIORITY = {
  overdue: 0,
  today: 1,
  without_date: 2,
  scheduled: 3,
  none: 4
};
const PREPARATION_DB_TERMINAL_STATUSES = [...PREPARATION_TERMINAL_STATUSES]
  .concat(['PENDING', 'DRAFT', 'SCHEDULED', 'TRASH_ORDER', 'EXCHANGED', 'PARTIALLY_DELIVERED', 'ON_HOLD', 'LOST']);
const PREPARATION_BATCH_SIZE = 150;

const toPreparationUpper = (value) => String(value || '').trim().toUpperCase();

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

const STANDARD_PREPARATION_STATUS_CODES = new Set([
  'PENDING_PREPARATION',
  'PREPARING',
  'READY',
  'QUALITY_CHECK',
  'PACKAGED',
  'PACKED',
  'READY_TO_SHIP',
  'STOCK_SHORTAGE',
  'PENDING_STOCK',
  'ON_HOLD_STOCK',
  'ON_HOLD_PREP',
  'PENDING_CANCELLATION',
  'CONFIRMED',
  'WAITING'
]);

// Maps a preparation-queue status to the "regular" order.status value that the
// rest of the system expects (dashboards/analytics/WhatsApp/Turbo). The prep
// stage itself is stored in metadata.preparationStatus.
const getMappedRegularOrderStatus = (preparationStatus, customStatusMap = null) => {
  if (preparationStatus === 'PENDING_PREPARATION') return 'CONFIRMED';
  if (['STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK'].includes(preparationStatus)) return 'STOCK_SHORTAGE';
  if (preparationStatus === 'ON_HOLD_PREP') return 'ON_HOLD_PREP';
  if (preparationStatus === 'BDONKODTERBO') return 'PENDING';
  if (customStatusMap) {
    const customConfig = customStatusMap.get?.(preparationStatus) || customStatusMap[preparationStatus];
    if (customConfig?.mapsToSystem) return customConfig.mapsToSystem;
  }
  return 'PROCESSING';
};

// 🛡️ PRODUCTION-FIX (prep-stage-notify): تحركات خط التجهيز من صفحة التجهيز كانت
// بتحدّث الأوردر وتكتب History من غير أي رسالة واتساب — على عكس نفس الحالات لما
// تتغير من صفحة الطلبات. الدالة دي بترسل إشعار تغيير الحالة بنفس مسار orderService
// (dedup + sendOrderStatusNotification) fire-and-forget عشان مايعطلش العملية.
const notifyPreparationStageChange = async ({ companyId, orderPayload, status }) => {
  try {
    if (!orderPayload || !companyId || !status) return;
    const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');
    const { getPersistedNotificationEventType } = require('./whatsapp/notificationTypes');

    const recentNotification = await WhatsAppNotificationService.isDuplicateNotification({
      companyId,
      orderId: orderPayload.id,
      recipientPhone: orderPayload.customerPhone,
      eventType: getPersistedNotificationEventType(status),
      // 🛡️ (custom-status-dedup-identity): هوية الحالة الأصلية — نفس إصلاح orderService
      rawEventType: status,
    });
    if (recentNotification) return;

    await WhatsAppNotificationService.sendOrderStatusNotification(orderPayload, status);
  } catch (notifyError) {
    console.warn(`⚠️ [PREP-QUEUE] WhatsApp status notification failed (${status}):`, notifyError.message);
  }
};

const updatePreparationOrderStatus = async ({
  orderIdentifier,
  companyId,
  status,
  notes,
  userId,
  userName,
}) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  const prisma = getSharedPrismaClient();

  if (!PREPARATION_ONLY_STATUSES.has(normalizedStatus)) {
    const customStatus = await prisma.orderStatusConfig.findFirst({
      where: { companyId, code: normalizedStatus, statusType: 'preparation', isActive: true },
    });
    if (!customStatus) {
      const error = new Error(`الحالة "${normalizedStatus}" غير مسموح بها في قائمة التجهيز`);
      error.statusCode = 400;
      throw error;
    }
  }

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: orderIdentifier, companyId },
        { orderNumber: orderIdentifier, companyId }
      ]
    }
  });

  if (order) {
    const currentMetadata = parsePreparationJsonObject(order.metadata);
    const previousPreparationStatus =
      typeof currentMetadata.preparationStatus === 'string'
        ? currentMetadata.preparationStatus
        : order.status;

    await assertPreparationHoldRule({
      currentPreparationStatus: previousPreparationStatus,
      targetStatus: normalizedStatus,
      notes,
      isOverride: false,
    });

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
        customStatusCode: PREPARATION_ONLY_STATUSES.has(normalizedStatus) ? null : undefined,
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

    // 🛡️ PRODUCTION-FIX (prep-stage-notify): أبلغ العميل بتغيير الحالة (fire-and-forget)
    setImmediate(() => {
      notifyPreparationStageChange({ companyId, orderPayload: updatedOrder, status: normalizedStatus });
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
    const currentMetadata = parsePreparationJsonObject(guestOrder.metadata);
    const previousPreparationStatus =
      typeof currentMetadata.preparationStatus === 'string'
        ? currentMetadata.preparationStatus
        : guestOrder.status;

    await assertPreparationHoldRule({
      currentPreparationStatus: previousPreparationStatus,
      targetStatus: normalizedStatus,
      notes,
      isOverride: false,
    });

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

    // 🛡️ PRODUCTION-FIX (prep-stage-notify): نفس الإشعار لطلبات الضيوف — بنحوّل
    // guestPhone/guestName إلى شكل الـ orderPayload المتوقّع في الخدمة.
    setImmediate(() => {
      let guestItems = [];
      try {
        guestItems = typeof updatedGuestOrder.items === 'string'
          ? JSON.parse(updatedGuestOrder.items)
          : (updatedGuestOrder.items || []);
      } catch (_itemsError) {
        guestItems = [];
      }
      notifyPreparationStageChange({
        companyId,
        orderPayload: {
          ...updatedGuestOrder,
          // 🛡️ PRODUCTION-FIX (guest-order-fk): orderId=null في اللوج (guest-order-fk)
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
};

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
const toPreparationNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parsePreparationJsonObject = (value) => {
  if (!value) return {};

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_error) {
      return {};
    }
  }

  return {};
};

const normalizePreparationDateInputValue = (value) => {
  if (typeof value !== 'string' || !value.trim()) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
};

const buildPreparationShortageHoldDetails = (metadata) => {
  const metadataObject = parsePreparationJsonObject(metadata);
  const rawDetails = parsePreparationJsonObject(
    metadataObject[PREPARATION_SHORTAGE_HOLD_METADATA_KEY]
  );

  const reason = PREPARATION_SHORTAGE_REASONS.has(rawDetails.reason)
    ? rawDetails.reason
    : 'stock_shortage';

  return {
    reason,
    owner: typeof rawDetails.owner === 'string' ? rawDetails.owner : '',
    followUpDate: normalizePreparationDateInputValue(rawDetails.followUpDate),
    customerNotified: Boolean(rawDetails.customerNotified),
    note: typeof rawDetails.note === 'string' ? rawDetails.note : '',
    heldAt: typeof rawDetails.heldAt === 'string' ? rawDetails.heldAt : '',
    releasedAt: typeof rawDetails.releasedAt === 'string' ? rawDetails.releasedAt : '',
    state: rawDetails.state === 'released' ? 'released' : 'held'
  };
};

const buildPreparationProblemHoldDetails = (metadata) => {
  const metadataObject = parsePreparationJsonObject(metadata);
  const rawDetails = parsePreparationJsonObject(
    metadataObject[PREPARATION_HOLD_METADATA_KEY]
  );

  return {
    reason: typeof rawDetails.reason === 'string' ? rawDetails.reason : '',
    heldAt: typeof rawDetails.heldAt === 'string' ? rawDetails.heldAt : '',
    releasedAt: typeof rawDetails.releasedAt === 'string' ? rawDetails.releasedAt : '',
    heldBy: typeof rawDetails.heldBy === 'string' ? rawDetails.heldBy : '',
    releasedBy: typeof rawDetails.releasedBy === 'string' ? rawDetails.releasedBy : '',
    state: rawDetails.state === 'released' ? 'released' : 'held'
  };
};

// Returns the active hold details object for an order based on its stage. Used
// by follow-up/owner filters and sorting so both STOCK_SHORTAGE and
// ON_HOLD_PREP orders follow the same "hold" rules.
const getOrderHoldDetails = (order) => {
  if (order.stage === 'STOCK_SHORTAGE') return order.shortageHoldDetails;
  if (order.stage === 'ON_HOLD_PREP') return order.problemHoldDetails;
  // problemHoldDetails لم يعد يحمل owner/followUpDate — الـ default موحّد مع الشكل الجديد
  return { reason: '', state: 'released' };
};

const getEffectivePreparationStatus = (status, metadata, customStatusCode = null) => {
  const normalizedStatus = toPreparationUpper(status);
  if (PREPARATION_TERMINAL_STATUSES.has(normalizedStatus)) {
    return normalizedStatus;
  }

  const metadataObject = parsePreparationJsonObject(metadata);
  const metadataStatus = toPreparationUpper(
    metadataObject[PREPARATION_STATUS_METADATA_KEY]
  );

  if (metadataStatus && !PREPARATION_TERMINAL_STATUSES.has(metadataStatus)) {
    return metadataStatus;
  }

  if (customStatusCode) {
    const customUpper = toPreparationUpper(customStatusCode);
    if (customUpper && !PREPARATION_TERMINAL_STATUSES.has(customUpper)) {
      return customUpper;
    }
  }

  return metadataStatus || normalizedStatus;
};

const normalizePreparationStage = (status, customStatusMap = null) => {
  const normalized = toPreparationUpper(status);
  if (['PENDING', 'CONFIRMED', 'PENDING_PREPARATION'].includes(normalized)) {
    return 'WAITING';
  }
  if (['PROCESSING', 'PREPARING'].includes(normalized)) {
    return 'PREPARING';
  }
  if (normalized === 'QUALITY_CHECK') {
    return 'QUALITY_CHECK';
  }
  if (['PACKAGED', 'PACKED'].includes(normalized)) {
    return 'PACKAGED';
  }
  if (['STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK'].includes(normalized)) {
    return 'STOCK_SHORTAGE';
  }
  if (['READY', 'READY_TO_SHIP'].includes(normalized)) {
    return 'READY_TO_SHIP';
  }
  if (normalized === 'PENDING_CANCELLATION') {
    return 'PENDING_CANCELLATION';
  }
  if (normalized === 'ON_HOLD_PREP') {
    return 'ON_HOLD_PREP';
  }

  if (normalized === 'BDONKODTERBO') {
    return 'WAITING';
  }

  if (customStatusMap) {
    const customConfig = customStatusMap.get?.(normalized) || customStatusMap[normalized];
    if (customConfig) {
      if (customConfig.mapsToSystem) {
        const sysMapped = normalizePreparationStage(customConfig.mapsToSystem, customStatusMap);
        if (sysMapped) return sysMapped;
      }
      if (customConfig.statusType === 'preparation') {
        return 'WAITING';
      }
      return null;
    }
  }

  return null;
};

const isPreparationShortageFollowUpToday = (followUpDate, stage) => {
  if (!PREPARATION_HOLD_STAGES.has(stage) || !followUpDate) return false;

  const today = new Date().toISOString().slice(0, 10);
  return normalizePreparationDateInputValue(followUpDate) === today;
};

const isPreparationShortageFollowUpOverdue = (followUpDate, stage) => {
  if (!PREPARATION_HOLD_STAGES.has(stage) || !followUpDate) return false;

  const parsedDate = new Date(
    followUpDate.length <= 10 ? `${followUpDate}T00:00:00` : followUpDate
  );
  if (Number.isNaN(parsedDate.getTime())) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return parsedDate.getTime() < startOfToday.getTime();
};

const getPreparationShortageFollowUpState = (followUpDate, stage) => {
  if (!PREPARATION_HOLD_STAGES.has(stage)) return 'none';
  if (!followUpDate) return 'without_date';
  if (isPreparationShortageFollowUpOverdue(followUpDate, stage)) return 'overdue';
  if (isPreparationShortageFollowUpToday(followUpDate, stage)) return 'today';
  return 'scheduled';
};

const createPreparationStageCounts = () => ({
  ALL: 0,
  WAITING: 0,
  PREPARING: 0,
  QUALITY_CHECK: 0,
  PACKAGED: 0,
  READY_TO_SHIP: 0,
  STOCK_SHORTAGE: 0,
  PENDING_CANCELLATION: 0,
  ON_HOLD_PREP: 0
});

const dedupePreparationWarehouseName = (names) => {
  const counter = new Map();

  names
    .filter(Boolean)
    .forEach((name) => {
      counter.set(name, (counter.get(name) || 0) + 1);
    });

  const winner = [...counter.entries()].sort((left, right) => right[1] - left[1])[0];
  return winner?.[0] || null;
};

const buildPreparationInventorySummary = (records) => {
  const map = new Map();

  records.forEach((record) => {
    const productId = String(record.productId || '');
    if (!productId) return;

    if (!map.has(productId)) {
      map.set(productId, {
        productId,
        productName: record.product?.name || record.product?.sku || 'منتج غير مسمى',
        sku: record.product?.sku || null,
        warehouses: []
      });
    }

    const entry = map.get(productId);
    entry.warehouses.push({
      warehouseId: String(record.warehouseId || ''),
      warehouseName: record.warehouse?.name || 'مخزن غير محدد',
      quantity: toPreparationNumber(record.quantity),
      available: toPreparationNumber(record.available),
      reserved: toPreparationNumber(record.reserved)
    });
  });

  map.forEach((entry) => {
    entry.warehouses.sort((left, right) => right.available - left.available);
  });

  return map;
};

const parseOrderItemMetadata = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return parsePreparationJsonObject(value);
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
};

const parseMerchantOrderItems = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const getMerchantOrderFulfillmentView = (merchantOrder) => {
  const fulfillmentSource = toPreparationUpper(
    merchantOrder?.fulfillmentSource || 'MERCHANT'
  );
  const assignedItems = parseMerchantOrderItems(merchantOrder?.items);
  const canPrepare = fulfillmentSource === 'MERCHANT' || fulfillmentSource === 'MIXED';

  return {
    assignedItems,
    canPrepare,
    canViewFullDetails: canPrepare,
    fulfillmentSource,
    merchantOrderId: merchantOrder?.id || null,
    warehouseId: merchantOrder?.warehouseId || null
  };
};

const mapMerchantScopedOrderItems = (order, merchantFulfillment) => {
  const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];

  if (!merchantFulfillment.assignedItems.length) {
    return [];
  }

  return merchantFulfillment.assignedItems.map((assignedItem, index) => {
    const matchedOrderItem = orderItems.find((item) =>
      String(item.productId || '') === String(assignedItem.productId || '')
    );
    const parsedMetadata = parseOrderItemMetadata(matchedOrderItem?.metadata || '{}');
    const quantity = toPreparationNumber(
      assignedItem.quantity ?? matchedOrderItem?.quantity ?? 1
    );
    const price = merchantFulfillment.canViewFullDetails
      ? (matchedOrderItem?.price ?? assignedItem.price ?? 0)
      : 0;

    return {
      id: matchedOrderItem?.id || `${merchantFulfillment.merchantOrderId}-${index}`,
      productId: assignedItem.productId || matchedOrderItem?.productId || '',
      name:
        matchedOrderItem?.productName ||
        matchedOrderItem?.product?.name ||
        parsedMetadata.productName ||
        assignedItem.productName ||
        assignedItem.merchantSku ||
        'منتج غير محدد',
      productName:
        matchedOrderItem?.productName ||
        matchedOrderItem?.product?.name ||
        parsedMetadata.productName ||
        assignedItem.productName ||
        assignedItem.merchantSku ||
        'منتج غير محدد',
      price,
      quantity,
      total: merchantFulfillment.canViewFullDetails ? Number(price || 0) * quantity : 0,
      metadata: {
        ...parsedMetadata,
        color: matchedOrderItem?.productColor || parsedMetadata.color || parsedMetadata.productColor,
        size: matchedOrderItem?.productSize || parsedMetadata.size || parsedMetadata.productSize,
        merchantSku: assignedItem.merchantSku || parsedMetadata.merchantSku,
        fulfillmentSource: assignedItem.fulfillmentSource || merchantFulfillment.fulfillmentSource,
        warehouseId: assignedItem.warehouseId || merchantFulfillment.warehouseId
      }
    };
  });
};

const mapRegularOrderToSimple = (order, { merchantScope = null } = {}) => {
  let shippingAddress = order.shippingAddress || '';
  try {
    if (typeof shippingAddress === 'string' && shippingAddress.startsWith('{')) {
      shippingAddress = JSON.parse(shippingAddress);
    }
  } catch (_error) { }

  let finalCustomerName = '';
  if (order.customerName && order.customerName.trim()) {
    finalCustomerName = order.customerName.trim();
  } else if (order.customer) {
    const firstName = order.customer.firstName || '';
    const lastName = order.customer.lastName || '';
    finalCustomerName = `${firstName} ${lastName}`.trim();
  }

  const merchantOrder = merchantScope
    ? (order.merchantOrders || [])[0]
    : null;
  const merchantFulfillment = merchantOrder
    ? getMerchantOrderFulfillmentView(merchantOrder)
    : null;
  const hasLimitedMerchantView =
    Boolean(merchantScope) &&
    Boolean(merchantFulfillment) &&
    !merchantFulfillment.canViewFullDetails;
  const items = merchantFulfillment
    ? mapMerchantScopedOrderItems(order, merchantFulfillment)
    : (
        Array.isArray(order.orderItems) && order.orderItems.length > 0
          ? order.orderItems.map((item) => {
            const parsedMetadata = parseOrderItemMetadata(item.metadata || '{}');
            return {
              id: item.id,
              productId: item.productId,
              variantId: item.variantId || null,
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
          })
          : []
      );

  return {
    id: order.orderNumber,
    orderNumber: order.orderNumber,
    customerName: finalCustomerName,
    customerPhone: hasLimitedMerchantView ? '' : (order.customer?.phone || order.customerPhone || ''),
    customerEmail: hasLimitedMerchantView ? '' : (order.customer?.email || order.customerEmail || ''),
    customerAddress: hasLimitedMerchantView ? '' : (order.customerAddress || ''),
    city: hasLimitedMerchantView ? '' : (order.city || ''),
    governorate: hasLimitedMerchantView ? '' : (order.governorate || ''),
    total: hasLimitedMerchantView ? 0 : (merchantOrder?.totalAmount || order.total),
    subtotal: hasLimitedMerchantView ? 0 : order.subtotal,
    tax: hasLimitedMerchantView ? 0 : order.tax,
    shipping: hasLimitedMerchantView ? 0 : order.shipping,
    status: (order.status || 'PENDING').toLowerCase(),
    paymentStatus: (() => {
      const stored = String(order.paymentStatus || '').toLowerCase();
      const proof = parsePreparationJsonObject(order.metadata)?.walletPaymentProof;
      const isWalletPayment =
        String(order.paymentMethod || '').toLowerCase() === 'wallet';
      const hasScreenshot = Boolean(proof && proof.imageUrl);
      const isRejected = String((proof && proof.status) || '').toUpperCase() === 'REJECTED';
      if (
        isWalletPayment &&
        hasScreenshot &&
        !isRejected &&
        !['failed', 'refunded', 'partially_refunded'].includes(stored)
      ) {
        return 'completed';
      }
      return stored || 'pending';
    })(),
    paymentMethod: (order.paymentMethod || 'CASH').toLowerCase().replace('_', '_on_'),
    shippingAddress: hasLimitedMerchantView ? null : shippingAddress,
    items,
    turboTrackingNumber: order.turboTrackingNumber || null,
    turboShipmentId: order.turboShipmentId || null,
    turboShipmentStatus: order.turboShipmentStatus || null,
    shipments: Array.isArray(order.shipments)
      ? order.shipments.map(s => ({
          trackingNumber: s.trackingNumber || null,
          externalShipmentId: s.externalShipmentId || null,
          status: s.status,
          carrierType: s.carrierType,
        }))
      : [],
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    printCount: order.orderInvoice?.printCount ?? 0,
    printedAt: order.orderInvoice?.printedAt ?? null,
    metadata: {
      ...parsePreparationJsonObject(order.metadata),
      ...(merchantFulfillment
        ? {
            merchantFulfillment: {
              merchantId: merchantScope?.id || null,
              merchantOrderId: merchantFulfillment.merchantOrderId,
              fulfillmentSource: merchantFulfillment.fulfillmentSource,
              canPrepare: merchantFulfillment.canPrepare,
              canViewFullDetails: merchantFulfillment.canViewFullDetails,
              limitedView: hasLimitedMerchantView,
              warehouseId: merchantFulfillment.warehouseId
            }
          }
        : {})
    },
    isViewed: order.isViewed ?? false,
    customStatusCode: order.customStatusCode || null,
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
  };
};

const mapGuestOrderToSimple = (order) => {
  let items = order.items || [];
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (_error) { items = []; }
  }

  let shippingAddress = order.shippingAddress || {};
  if (typeof shippingAddress === 'string') {
    try { shippingAddress = JSON.parse(shippingAddress); } catch (_error) { shippingAddress = {}; }
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
    } catch (_error) {
      metadata = { ...metadata };
    }
  } else if (order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)) {
    metadata = {
      ...metadata,
      ...order.metadata
    };
  }

  return {
    id: order.orderNumber,
    orderNumber: order.orderNumber,
    customerName: order.guestName || '',
    customerPhone: order.guestPhone || '',
    customerEmail: order.guestEmail || '',
    total: order.total || 0,
    subtotal: order.total || 0,
    tax: 0,
    shipping: order.shippingCost || 0,
    status: order.status?.toLowerCase() || 'pending',
    customStatusCode: order.customStatusCode || (order.status && order.status.toUpperCase() === 'BDONKODTERBO' ? order.status.toUpperCase() : null),
    paymentStatus: 'pending',
    paymentMethod: order.paymentMethod?.toLowerCase() || 'cash_on_delivery',
    shippingAddress,
    items: Array.isArray(items)
      ? items.map((item) => ({
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
      }))
      : [],
    turboTrackingNumber: order.turboTrackingNumber || null,
    turboShipmentId: order.turboShipmentId || null,
    turboShipmentStatus: order.turboShipmentStatus || null,
    shipments: [],
    notes: order.notes || '',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    metadata,
    isViewed: order.isViewed ?? false,
    sourceType: 'storefront',
    printCount: 0,
    printedAt: null,
  };
};

const buildPreparationOrderSummary = (
  order,
  inventorySummaryByProduct,
  selectedWarehouseId,
  customStatusMap = null
) => {
  const normalizedStatus = getEffectivePreparationStatus(
    order.status,
    order.metadata,
    order.customStatusCode
  );
  const stage = normalizePreparationStage(normalizedStatus, customStatusMap);
  if (!stage) {
    return null;
  }

  const shortageHoldDetails = buildPreparationShortageHoldDetails(order.metadata);
  const problemHoldDetails = buildPreparationProblemHoldDetails(order.metadata);
  const itemInsights = (Array.isArray(order.items) ? order.items : []).map((item) => {
    const summary = inventorySummaryByProduct.get(String(item.productId || ''));
    const scopedWarehouses = selectedWarehouseId
      ? (summary?.warehouses || []).filter(
        (warehouse) => warehouse.warehouseId === selectedWarehouseId
      )
      : (summary?.warehouses || []);
    const availableInScope = scopedWarehouses.reduce(
      (sum, warehouse) => sum + warehouse.available,
      0
    );
    const reservedInScope = scopedWarehouses.reduce(
      (sum, warehouse) => sum + warehouse.reserved,
      0
    );
    const quantityNumber = Math.max(1, toPreparationNumber(item.quantity));
    const metadataProductName =
      typeof item.metadata === 'object' &&
        item.metadata &&
        !Array.isArray(item.metadata) &&
        typeof item.metadata.productName === 'string'
        ? item.metadata.productName
        : '';
    const itemMetadata = typeof item.metadata === 'object' && item.metadata && !Array.isArray(item.metadata) ? item.metadata : {};
    const color = item.color || itemMetadata.color || itemMetadata.productColor || '';
    const size = item.size || itemMetadata.size || itemMetadata.productSize || '';

    return {
      productId: String(item.productId || ''),
      variantId: item.variantId || null,
      displayName: item.productName || item.name || metadataProductName || 'منتج غير محدد',
      color,
      size,
      quantityNumber,
      availableInScope,
      reservedInScope,
      shortage: Math.max(0, quantityNumber - availableInScope),
      bestWarehouseName: scopedWarehouses[0]?.warehouseName || null,
      warehouseCount: scopedWarehouses.length
    };
  });

  const missingItemsCount = itemInsights.filter((item) => item.shortage > 0).length;
  const warehouseMatch = selectedWarehouseId
    ? itemInsights.length > 0
    : true;

  const totalUnits = itemInsights.reduce((sum, item) => sum + item.quantityNumber, 0);
  const totalValue = toPreparationNumber(order.total);
  const effectiveCustomStatusCode =
    order.customStatusCode ||
    (customStatusMap?.has?.(normalizedStatus) ? normalizedStatus : null) ||
    (normalizedStatus === 'BDONKODTERBO' ? 'BDONKODTERBO' : null);

  return {
    ...order,
    customStatusCode: effectiveCustomStatusCode,
    normalizedStatus,
    stage,
    shortageHoldDetails,
    problemHoldDetails,
    hasProblem: stage === 'STOCK_SHORTAGE' || stage === 'ON_HOLD_PREP',
    itemInsights,
    missingItemsCount,
    totalUnits,
    totalValue,
    isReady: itemInsights.length > 0 && missingItemsCount === 0,
    warehouseMatch,
    recommendedWarehouseName: dedupePreparationWarehouseName(
      itemInsights.map((item) => item.bestWarehouseName)
    ),
    createdAtMs: new Date(order.createdAt).getTime()
  };
};

const createEmptyPreparationQueueResponse = (page, limit) => ({
  success: true,
  data: [],
  pagination: {
    total: 0,
    page,
    limit,
    pages: 1
  },
  summary: {
    filteredTotal: 0,
    visibleTotal: 0,
    stageCounts: createPreparationStageCounts(),
    statusCounts: {},
    readyCount: 0,
    shortageCount: 0,
    shortageHoldCount: 0,
    onHoldPrepCount: 0,
    overdueShortageFollowUpCount: 0,
    overdueProblemFollowUpCount: 0,
    readyToShipCount: 0,
    allOverdueShortageFollowUpCount: 0,
    allOverdueProblemFollowUpCount: 0
  },
  shortageOwnerOptions: []
});

const buildPreparationSqlAnd = (conditions) => {
  if (!conditions.length) return Prisma.sql`1=1`;
  if (conditions.length === 1) return conditions[0];
  return Prisma.sql`${Prisma.join(conditions, Prisma.sql` AND `)}`;
};

const buildPreparationSqlOr = (conditions) => {
  if (!conditions.length) return Prisma.sql`1=0`;
  if (conditions.length === 1) return conditions[0];
  return Prisma.sql`(${Prisma.join(conditions, Prisma.sql` OR `)})`;
};

const VALID_SORT_BY = new Set(['createdAt', 'totalUnits', 'totalValue']);

const comparePreparationOrders = (left, right, prioritizeShortageOrders, sortByField = 'createdAt', sortOrderDir = 'desc') => {
  if (sortByField === 'createdAt' && sortOrderDir === 'desc') {
    const leftIsHold = PREPARATION_HOLD_STAGES.has(left.stage);
    const rightIsHold = PREPARATION_HOLD_STAGES.has(right.stage);
    if (leftIsHold && rightIsHold) {
      const leftHold = getOrderHoldDetails(left);
      const rightHold = getOrderHoldDetails(right);
      const leftPriority = PREPARATION_SHORTAGE_FOLLOW_UP_PRIORITY[
        getPreparationShortageFollowUpState(
          leftHold.followUpDate,
          left.stage
        )
      ];
      const rightPriority = PREPARATION_SHORTAGE_FOLLOW_UP_PRIORITY[
        getPreparationShortageFollowUpState(
          rightHold.followUpDate,
          right.stage
        )
      ];

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
    }
  }

  const leftValue = sortByField === 'totalUnits' ? left.totalUnits : sortByField === 'totalValue' ? left.totalValue : left.createdAtMs;
  const rightValue = sortByField === 'totalUnits' ? right.totalUnits : sortByField === 'totalValue' ? right.totalValue : right.createdAtMs;

  if (leftValue !== rightValue) {
    return sortOrderDir === 'asc' ? leftValue - rightValue : rightValue - leftValue;
  }

  if (prioritizeShortageOrders && left.missingItemsCount !== right.missingItemsCount) {
    return right.missingItemsCount - left.missingItemsCount;
  }

  return left.createdAtMs - right.createdAtMs;
};

const stripPreparationTransientFields = ({
  itemInsights,
  missingItemsCount,
  isReady,
  warehouseMatch,
  recommendedWarehouseName,
  shortageHoldDetails,
  problemHoldDetails,
  hasProblem,
  createdAtMs,
  ...order
}) => order;

const matchesPreparationHaystackSearch = (order, searchQuery) => {
  if (!searchQuery) return true;

  const haystack = [
    order.orderNumber,
    order.turboTrackingNumber,
    order.turboShipmentId,
    order.customerName,
    order.customerPhone,
    order.customerEmail,
    order.governorate,
    order.city,
    order.recommendedWarehouseName,
    PREPARATION_SOURCE_LABELS[(order.sourceType || 'unknown').toLowerCase()],
    ...order.itemInsights.map((item) => item.displayName)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(searchQuery);
};

const hasShipmentTracking = (order) =>
  (order.shipments || []).some((s) => s.trackingNumber);

const matchesPreparationFilters = ({
  order,
  stockFilter,
  shortageReasonFilter,
  shortageOwnerQuery,
  shortageFollowUpFilter,
  itemCountFilter,
  searchQuery,
  notPrinted,
  noShippingCode,
  productFilter,
  colorFilter,
  sizeFilter,
  productIdFilter,
  variantIdFilter,
}) => {
  if (!order.warehouseMatch) return false;

  if (itemCountFilter === 'single' && order.itemInsights.length !== 1) return false;
  if (itemCountFilter === 'multiple' && order.itemInsights.length <= 1) return false;

  if (notPrinted && (order.printCount || 0) > 0) return false;
  if (noShippingCode && (order.turboTrackingNumber || hasShipmentTracking(order))) return false;

  const hasShortageContext =
    order.missingItemsCount > 0 || order.stage === 'STOCK_SHORTAGE';
  const hasHoldContext =
    order.stage === 'STOCK_SHORTAGE' || order.stage === 'ON_HOLD_PREP';
  const activeHoldDetails = getOrderHoldDetails(order);

  if (stockFilter === 'ready' && !order.isReady) return false;
  if (stockFilter === 'shortage' && order.missingItemsCount === 0) {
    return false;
  }

  if (shortageReasonFilter !== 'all') {
    if (!hasShortageContext) return false;
    if (order.shortageHoldDetails.reason !== shortageReasonFilter) {
      return false;
    }
  }

  if (shortageOwnerQuery) {
    if (!hasHoldContext) return false;
    // 🚨 PRODUCTION-FIX: problemHoldDetails لم يعد يحمل owner (اتشال في refactor
    // الميزة) — لا نجري .trim() على undefined.
    if (!(activeHoldDetails.owner || '').trim().toLowerCase().includes(shortageOwnerQuery)) {
      return false;
    }
  }

  if (shortageFollowUpFilter !== 'all') {
    if (!hasHoldContext) return false;

    if (shortageFollowUpFilter === 'without_date') {
      if (activeHoldDetails.followUpDate) return false;
    }

    if (shortageFollowUpFilter === 'today') {
      if (!isPreparationShortageFollowUpToday(activeHoldDetails.followUpDate, order.stage)) {
        return false;
      }
    }

    if (shortageFollowUpFilter === 'overdue') {
      if (!isPreparationShortageFollowUpOverdue(activeHoldDetails.followUpDate, order.stage)) {
        return false;
      }
    }
  }

  if (productFilter || colorFilter || sizeFilter || productIdFilter || variantIdFilter) {
    const matchesProduct = (order.itemInsights || []).some(
      (item) => {
        let match = true;
        if (productIdFilter) {
          match = match && (item.productId && item.productId === productIdFilter);
        }
        if (variantIdFilter) {
          const itemVariantId = String(item.variantId || '');
          match = match && (itemVariantId === variantIdFilter);
        }
        if (productFilter) {
          match = match && ((item.displayName && item.displayName.toLowerCase().includes(productFilter)) ||
          (item.color && item.color.toLowerCase().includes(productFilter)) ||
          (item.size && item.size.toLowerCase().includes(productFilter)));
        }
        if (colorFilter) {
          match = match && (item.color && item.color.toLowerCase() === colorFilter);
        }
        if (sizeFilter) {
          match = match && (item.size && item.size.toLowerCase() === sizeFilter);
        }
        return match;
      }
    );
    if (!matchesProduct) return false;
  }

  return matchesPreparationHaystackSearch(order, searchQuery);
};

const collectTopPreparationOrders = ({
  buffer,
  order,
  limit,
  prioritizeShortageOrders,
  sortByField,
  sortOrderDir,
}) => {
  if (limit <= 0) return;

  buffer.push(order);
  buffer.sort((left, right) => comparePreparationOrders(left, right, prioritizeShortageOrders, sortByField, sortOrderDir));

  if (buffer.length > limit) {
    buffer.length = limit;
  }
};

const STAGE_EFFECTIVE_STATUS_MAP = {
  WAITING: ['PENDING', 'CONFIRMED', 'PENDING_PREPARATION'],
  PREPARING: ['PROCESSING', 'PREPARING'],
  QUALITY_CHECK: ['QUALITY_CHECK'],
  PACKAGED: ['PACKAGED', 'PACKED'],
  STOCK_SHORTAGE: ['STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK'],
  READY_TO_SHIP: ['READY', 'READY_TO_SHIP'],
  PENDING_CANCELLATION: ['PENDING_CANCELLATION'],
};

const buildStageSqlCondition = (builder, stage, tableAlias, useMetadata, customStageMap = null) => {
  let statuses = STAGE_EFFECTIVE_STATUS_MAP[stage] ? [...STAGE_EFFECTIVE_STATUS_MAP[stage]] : null;
  if (customStageMap && customStageMap[stage]) {
    statuses = (statuses || []).concat(customStageMap[stage]);
  }

  if (!statuses) {
    if (useMetadata) {
      const effectiveStatus = `COALESCE(NULLIF(${tableAlias}."metadata"::jsonb->>'preparationStatus', ''), NULLIF(${tableAlias}."customStatusCode", ''), ${tableAlias}."status"::text)`;
      const placeholder = builder.pushValue(stage);
      return `UPPER(${effectiveStatus}) = ${placeholder}`;
    }
    const placeholder = builder.pushValue(stage);
    return `UPPER(${tableAlias}."status") = ${placeholder}`;
  }

  if (useMetadata) {
    const effectiveStatus = `COALESCE(NULLIF(${tableAlias}."metadata"::jsonb->>'preparationStatus', ''), NULLIF(${tableAlias}."customStatusCode", ''), ${tableAlias}."status"::text)`;
    const placeholders = statuses.map((s) => builder.pushValue(s));
    return `${effectiveStatus} IN (${placeholders.join(', ')})`;
  }

  const placeholders = statuses.map((s) => builder.pushValue(s));
  return `UPPER(${tableAlias}."status") IN (${placeholders.join(', ')})`;
};

const loadPreparationCustomStatusContext = async (companyId) => {
  let includeCustomStatuses = true;
  try {
    const companyRecord = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    });
    if (companyRecord) {
      const parsedSettings = parsePreparationJsonObject(companyRecord.settings);
      if (parsedSettings?.orderPreparation?.includeCustomStatuses === false) {
        includeCustomStatuses = false;
      }
    }
  } catch (_e) {}

  const customStatusMap = new Map();
  const customPrepCodes = [];
  const customStageMap = {};

  if (includeCustomStatuses) {
    try {
      const configs = await getSharedPrismaClient().orderStatusConfig.findMany({
        where: { companyId, isActive: true }
      });
      configs.forEach((cfg) => {
        if (!cfg.code) return;
        const upperCode = toPreparationUpper(cfg.code);
        customStatusMap.set(upperCode, cfg);

        const stage = normalizePreparationStage(upperCode, customStatusMap);
        if (stage && !PREPARATION_TERMINAL_STATUSES.has(upperCode)) {
          customPrepCodes.push(upperCode);
          if (!customStageMap[stage]) customStageMap[stage] = [];
          customStageMap[stage].push(upperCode);
        }
      });
    } catch (_e) {}
  }

  return { includeCustomStatuses, customStatusMap, customPrepCodes, customStageMap };
};

const buildSearchSqlCondition = (builder, search, tableAlias, isRegular) => {
  if (!search) return null;

  const searchPattern = builder.pushValue(`%${search}%`);

  if (isRegular) {
    return builder.orGroup([
      `${tableAlias}."orderNumber" ILIKE ${searchPattern}`,
      `${tableAlias}."turboTrackingNumber" ILIKE ${searchPattern}`,
      `${tableAlias}."turboShipmentId" ILIKE ${searchPattern}`,
      `c."firstName" ILIKE ${searchPattern}`,
      `c."lastName" ILIKE ${searchPattern}`,
      `c."phone" ILIKE ${searchPattern}`,
    ]);
  }

  return builder.orGroup([
    `${tableAlias}."orderNumber" ILIKE ${searchPattern}`,
    `${tableAlias}."turboTrackingNumber" ILIKE ${searchPattern}`,
    `${tableAlias}."turboShipmentId" ILIKE ${searchPattern}`,
  ]);
};

const fetchPreparationCandidateRows = async ({
  companyId,
  affiliateId,
  merchantId,
  offset,
  limit,
  activeStage,
  search,
  customPrepCodes = [],
  customStageMap = null,
}) => {
  const createBuilder = () => {
    const values = [];
    const conditions = [];

    const pushValue = (value) => {
      values.push(value);
      return `$${values.length}`;
    };

    return {
      values,
      add: (condition) => {
        if (condition) conditions.push(condition);
      },
      where: () => (conditions.length ? conditions.join(' AND ') : '1=1'),
      like: (column, value) => `${column} ILIKE ${pushValue(value)}`,
      equals: (column, value) => `${column} = ${pushValue(value)}`,
      notInList: (column, list) => {
        const placeholders = list.map((value) => pushValue(value));
        return `${column} NOT IN (${placeholders.join(', ')})`;
      },
      orGroup: (parts) => `(${parts.join(' OR ')})`,
      pushValue: (value) => pushValue(value),
    };
  };

  const shiftPlaceholders = (sql, shift) =>
    sql.replace(/\$(\d+)/g, (_match, index) => `$${Number(index) + shift}`);

  const buildRegularSql = () => {
    const builder = createBuilder();
    const lowerSearch = search ? search.toLowerCase() : '';

    builder.add(builder.equals('o."companyId"', companyId));

    if (customPrepCodes && customPrepCodes.length > 0) {
      const customPlaceholders = customPrepCodes.map((c) => builder.pushValue(c));
      const termPlaceholders = PREPARATION_DB_TERMINAL_STATUSES.map((s) => builder.pushValue(s));
      const absPlaceholders = [...PREPARATION_TERMINAL_STATUSES].map((s) => builder.pushValue(s));
      builder.add(
        `((o."status"::text NOT IN (${termPlaceholders.join(', ')}) OR o."customStatusCode" IN (${customPlaceholders.join(', ')})) AND o."status"::text NOT IN (${absPlaceholders.join(', ')}))`
      );
    } else {
      builder.add(builder.notInList('o."status"::text', PREPARATION_DB_TERMINAL_STATUSES));
    }

    if (affiliateId) {
      builder.add(builder.equals('o."affiliateId"', affiliateId));
    }

    if (merchantId) {
      builder.add(`EXISTS (
        SELECT 1
        FROM "merchant_orders" mo
        WHERE mo."orderId" = o."id"
          AND ${builder.equals('mo."merchantId"', merchantId)}
      )`);
    }

    if (activeStage && activeStage !== 'ALL') {
      builder.add(buildStageSqlCondition(builder, activeStage, 'o', true, customStageMap));
    }

    if (lowerSearch) {
      builder.add(buildSearchSqlCondition(builder, lowerSearch, 'o', true));
    }

    return {
      sql: `SELECT 'regular'::text AS "orderType", o."id" AS "id", o."orderNumber" AS "orderNumber", o."createdAt" AS "createdAt"
        FROM "orders" o
        LEFT JOIN "customers" c ON c."id" = o."customerId"
        WHERE ${builder.where()}`,
      values: builder.values
    };
  };

  const buildGuestSql = () => {
    if (merchantId) {
      return { sql: null, values: [] };
    }

    const builder = createBuilder();
    const lowerSearch = search ? search.toLowerCase() : '';

    builder.add(builder.equals('g."companyId"', companyId));
    builder.add(builder.notInList('UPPER(g."status")', PREPARATION_DB_TERMINAL_STATUSES));

    if (affiliateId) {
      builder.add(builder.equals('g."affiliateId"', affiliateId));
    }

    if (activeStage && activeStage !== 'ALL') {
      builder.add(buildStageSqlCondition(builder, activeStage, 'g', false, customStageMap));
    }

    if (lowerSearch) {
      builder.add(buildSearchSqlCondition(builder, lowerSearch, 'g', false));
    }

    const duplicateConditions = [
      builder.equals('o_dup."companyId"', companyId),
      'o_dup."orderNumber" = g."orderNumber"'
    ];

    if (affiliateId) {
      duplicateConditions.push(builder.equals('o_dup."affiliateId"', affiliateId));
    }

    builder.add(`NOT EXISTS (
      SELECT 1
      FROM "orders" o_dup
      LEFT JOIN "customers" c_dup ON c_dup."id" = o_dup."customerId"
      WHERE ${duplicateConditions.join(' AND ')}
    )`);

    return {
      sql: `SELECT 'guest'::text AS "orderType", g."id" AS "id", g."orderNumber" AS "orderNumber", g."createdAt" AS "createdAt"
        FROM "guest_orders" g
        WHERE ${builder.where()}`,
      values: builder.values
    };
  };

  const regularQuery = buildRegularSql();
  const guestQuery = buildGuestSql();
  const unionSegments = [];
  const unionValues = [];

  if (regularQuery.sql) {
    unionSegments.push(regularQuery.sql);
    unionValues.push(...regularQuery.values);
  }

  if (guestQuery.sql) {
    unionSegments.push(
      unionValues.length
        ? shiftPlaceholders(guestQuery.sql, unionValues.length)
        : guestQuery.sql
    );
    unionValues.push(...guestQuery.values);
  }

  if (!unionSegments.length) {
    return [];
  }

  const limitPlaceholder = `$${unionValues.length + 1}`;
  const offsetPlaceholder = `$${unionValues.length + 2}`;
  const combinedSql = `SELECT * FROM (${unionSegments.join(' UNION ALL ')}) AS combined
    ORDER BY "createdAt" DESC
    LIMIT ${limitPlaceholder}
    OFFSET ${offsetPlaceholder}`;

  return getSharedPrismaClient().$queryRawUnsafe(
    combinedSql,
    ...unionValues,
    limit,
    offset
  );
};

const fetchPreparationBatchOrders = async (candidateRows, { merchantId } = {}) => {
  const regularIds = candidateRows
    .filter((row) => row.orderType === 'regular')
    .map((row) => row.id);
  const guestIds = candidateRows
    .filter((row) => row.orderType === 'guest')
    .map((row) => row.id);

  const [regularOrders, guestOrders] = await Promise.all([
    regularIds.length > 0
        ? getSharedPrismaClient().order.findMany({
        where: { id: { in: regularIds } },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true }
          },
          orderItems: {
            include: {
              product: { select: { id: true, name: true, images: true } },
              productVariant: { select: { id: true, name: true, type: true } }
            }
          },
          orderInvoice: {
            select: { printCount: true, printedAt: true }
          },
          shipments: {
            select: {
              id: true,
              trackingNumber: true,
              externalShipmentId: true,
              status: true,
              carrierType: true,
            }
          },
          merchantOrders: merchantId
            ? {
                where: { merchantId },
                include: {
                  shipments: {
                    select: {
                      id: true,
                      status: true,
                      trackingNumber: true,
                      externalShipmentId: true,
                      warehouseId: true,
                      shippingCompanyId: true
                    }
                  }
                }
              }
            : false,
          conversation: { select: { id: true, channel: true } }
        }
      })
      : Promise.resolve([]),
    guestIds.length > 0
      ? getSharedPrismaClient().guestOrder.findMany({
        where: { id: { in: guestIds } }
      })
      : Promise.resolve([])
  ]);

  const byKey = new Map();

  regularOrders.forEach((order) => {
    byKey.set(
      `regular:${order.id}`,
      mapRegularOrderToSimple(order, { merchantScope: merchantId ? { id: merchantId } : null })
    );
  });

  guestOrders.forEach((order) => {
    byKey.set(`guest:${order.id}`, mapGuestOrderToSimple(order));
  });

  return candidateRows
    .map((row) => byKey.get(`${row.orderType}:${row.id}`))
    .filter(Boolean);
};

const getPreparationQueue = async ({ user, query }) => {
  if (!user) {
    const error = new Error('غير مصرح - يجب تسجيل الدخول');
    error.statusCode = 401;
    throw error;
  }

  let companyId = user.companyId || user.effectiveCompanyId;
  if (!companyId) {
    const error = new Error('غير مصرح - معرف الشركة مطلوب');
    error.statusCode = 403;
    throw error;
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, parseInt(query.limit, 10) || 12);
  const activeStage = toPreparationUpper(query.stage || 'ALL');
  const resolvedStage = activeStage === 'ALL' ? 'ALL' : normalizePreparationStage(activeStage) || activeStage;
  const searchTerm = String(query.search || '').trim();
  const searchQuery = searchTerm.toLowerCase();
  const selectedWarehouseId = String(query.warehouseId || '').trim();
  const stockFilter = String(query.stockFilter || 'all').trim().toLowerCase();
  const shortageReasonFilter = String(query.shortageReason || 'all').trim();
  const shortageOwnerQuery = String(query.shortageOwner || '').trim().toLowerCase();
  const shortageFollowUpFilter = String(query.shortageFollowUp || 'all').trim().toLowerCase();
  const itemCountFilter = String(query.itemCountFilter || 'all').trim().toLowerCase();
  const notPrinted = query.notPrinted === 'true';
  const noShippingCode = query.noShippingCode === 'true';
  const prioritizeShortageOrders = query.prioritizeShortageOrders !== 'false';
  const sortByField = VALID_SORT_BY.has(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrderDir = query.sortOrder === 'asc' ? 'asc' : 'desc';
  const productFilter = String(query.productFilter || '').trim().toLowerCase();
  const colorFilter = String(query.colorFilter || '').trim().toLowerCase();
  const sizeFilter = String(query.sizeFilter || '').trim().toLowerCase();
  const productIdFilter = (query.productId || '').trim();
  const variantIdFilter = (query.variantId || '').trim();

  let affiliateId = query.affiliateId;
  let merchantId = null;

  if (isMerchantUser(user)) {
    const merchant = await requireMerchantAccountForUser(user);
    merchantId = merchant.id;
    companyId = merchant.companyId;
  }

  if (user.role === 'AFFILIATE') {
    const affiliate = await getSharedPrismaClient().affiliate.findUnique({
      where: { userId: user.id }
    });

    if (affiliate) {
      affiliateId = affiliate.id;
    } else {
      return createEmptyPreparationQueueResponse(page, limit);
    }
  }

  if (affiliateId) {
    affiliateId = String(affiliateId).trim();
  }

  const requestedVisibleLimit = Math.max(limit, page * limit);
  const batchSize = Math.max(PREPARATION_BATCH_SIZE, limit * 4);
  const stageCounts = createPreparationStageCounts();
  const statusCounts = {};
  const shortageOwnerSet = new Set();
  const topVisibleOrders = [];

  let filteredTotal = 0;
  let visibleTotal = 0;
  let readyCount = 0;
  let shortageCount = 0;
  let shortageHoldCount = 0;
  let onHoldPrepCount = 0;
  let overdueShortageFollowUpCount = 0;
  let overdueProblemFollowUpCount = 0;
  let readyToShipCount = 0;
  let allOverdueShortageFollowUpCount = 0;
  let allOverdueProblemFollowUpCount = 0;
  let candidateOffset = 0;

  const {
    customStatusMap,
    customPrepCodes,
    customStageMap,
  } = await loadPreparationCustomStatusContext(companyId);

  while (true) {
    const candidateRows = await fetchPreparationCandidateRows({
      companyId,
      affiliateId,
      merchantId,
      offset: candidateOffset,
      limit: batchSize,
      activeStage: 'ALL',
      search: searchQuery,
      customPrepCodes,
      customStageMap,
    });

    if (!candidateRows.length) {
      break;
    }

    candidateOffset += candidateRows.length;

    const batchOrders = await fetchPreparationBatchOrders(candidateRows, { merchantId });
    if (!batchOrders.length) {
      continue;
    }

    const inventoryProductIds = [...new Set(
      batchOrders
        .flatMap((order) => (Array.isArray(order.items) ? order.items : []))
        .map((item) => String(item.productId || '').trim())
        .filter(Boolean)
    )];

    const inventoryRecords = inventoryProductIds.length > 0
      ? await getSharedPrismaClient().inventory.findMany({
        where: {
          productId: { in: inventoryProductIds },
          warehouse: {
            companyId,
            ...(merchantId ? { merchantId } : {})
          }
        },
        include: {
          warehouse: {
            select: { id: true, name: true }
          },
          product: {
            select: { id: true, name: true, sku: true }
          }
        }
      })
      : [];

    const inventorySummaryByProduct = buildPreparationInventorySummary(inventoryRecords);
    const batchPreparationOrders = batchOrders
      .map((order) =>
        buildPreparationOrderSummary(
          order,
          inventorySummaryByProduct,
          selectedWarehouseId,
          customStatusMap
        )
      )
      .filter(Boolean);

    batchPreparationOrders.forEach((order) => {
      if (order.warehouseMatch) {
        const shortageOwner = order.shortageHoldDetails.owner.trim();
        if (shortageOwner) {
          shortageOwnerSet.add(shortageOwner);
        }

        if (isPreparationShortageFollowUpOverdue(
          order.shortageHoldDetails.followUpDate,
          order.stage
        )) {
          allOverdueShortageFollowUpCount += 1;
        }
      }

      const matchesFilters = matchesPreparationFilters({
        order,
        stockFilter,
        shortageReasonFilter,
        shortageOwnerQuery,
        shortageFollowUpFilter,
        itemCountFilter,
        searchQuery,
        notPrinted,
        noShippingCode,
        productFilter,
        colorFilter,
        sizeFilter,
        productIdFilter,
        variantIdFilter,
      });

      if (!matchesFilters) {
        return;
      }

      const isCustomOrder = Boolean(
        order.customStatusCode && !STANDARD_PREPARATION_STATUS_CODES.has(order.customStatusCode)
      );

      filteredTotal += 1;
      stageCounts.ALL += 1;
      if (order.stage) {
        stageCounts[order.stage] = (stageCounts[order.stage] || 0) + 1;
      }
      statusCounts[order.normalizedStatus] = (statusCounts[order.normalizedStatus] || 0) + 1;
      if (order.customStatusCode && order.customStatusCode !== order.normalizedStatus) {
        statusCounts[order.customStatusCode] = (statusCounts[order.customStatusCode] || 0) + 1;
      }

      if (order.isReady) {
        readyCount += 1;
      }

      if (order.missingItemsCount > 0) {
        shortageCount += 1;
      }

      if (order.normalizedStatus === 'STOCK_SHORTAGE') {
        shortageHoldCount += 1;
      }

      if (order.normalizedStatus === 'ON_HOLD_PREP') {
        onHoldPrepCount += 1;
      }

      if (isPreparationShortageFollowUpOverdue(
        order.shortageHoldDetails.followUpDate,
        order.stage
      )) {
        overdueShortageFollowUpCount += 1;
      }

      if (
        order.stage === 'READY_TO_SHIP' ||
        order.normalizedStatus === 'READY_TO_SHIP'
      ) {
        readyToShipCount += 1;
      }

      const isCustomStageFilter = !STANDARD_PREPARATION_STATUS_CODES.has(activeStage) && activeStage !== 'ALL';

      const matchesStage = (() => {
        if (resolvedStage === 'ALL' || activeStage === 'ALL') return true;
        if (isCustomStageFilter) {
          return order.customStatusCode === activeStage || order.normalizedStatus === activeStage;
        }
        if (isCustomOrder) {
          return false;
        }
        return order.stage === resolvedStage || order.stage === activeStage;
      })();

      if (matchesStage) {
        visibleTotal += 1;
        collectTopPreparationOrders({
          buffer: topVisibleOrders,
          order,
          limit: requestedVisibleLimit,
          prioritizeShortageOrders,
          sortByField,
          sortOrderDir,
        });
      }
    });
  }

  const pages = Math.max(1, Math.ceil(visibleTotal / limit));
  const safePage = Math.min(page, pages);
  const startIndex = (safePage - 1) * limit;
  const paginatedOrders = topVisibleOrders
    .sort((left, right) => comparePreparationOrders(left, right, prioritizeShortageOrders, sortByField, sortOrderDir))
    .slice(startIndex, startIndex + limit)
    .map(stripPreparationTransientFields);
  const shortageOwnerOptions = [...shortageOwnerSet].sort((left, right) =>
    left.localeCompare(right, 'ar')
  );

  return {
    success: true,
    data: paginatedOrders,
    pagination: {
      total: visibleTotal,
      page: safePage,
      limit,
      pages
    },
    summary: {
      filteredTotal,
      visibleTotal,
      stageCounts,
      statusCounts,
      readyCount,
      shortageCount,
      shortageHoldCount,
      onHoldPrepCount,
      overdueShortageFollowUpCount,
      overdueProblemFollowUpCount,
      readyToShipCount,
      allOverdueShortageFollowUpCount,
      allOverdueProblemFollowUpCount
    },
    shortageOwnerOptions
  };
};

const bulkUpdateByFilters = async ({ user, query, targetStatus, notes, userId, userName }) => {
  if (!user) {
    const error = new Error('غير مصرح - يجب تسجيل الدخول');
    error.statusCode = 401;
    throw error;
  }

  let companyId = user.companyId || user.effectiveCompanyId;
  if (!companyId) {
    const error = new Error('غير مصرح - معرف الشركة مطلوب');
    error.statusCode = 403;
    throw error;
  }

  const activeStage = toPreparationUpper(query.stage || 'ALL');
  const resolvedStage = activeStage === 'ALL' ? 'ALL' : normalizePreparationStage(activeStage) || activeStage;
  const searchTerm = String(query.search || '').trim();
  const searchQuery = searchTerm.toLowerCase();
  const selectedWarehouseId = String(query.warehouseId || '').trim();
  const stockFilter = String(query.stockFilter || 'all').trim().toLowerCase();
  const shortageReasonFilter = String(query.shortageReason || 'all').trim();
  const shortageOwnerQuery = String(query.shortageOwner || '').trim().toLowerCase();
  const shortageFollowUpFilter = String(query.shortageFollowUp || 'all').trim().toLowerCase();
  const itemCountFilter = String(query.itemCountFilter || 'all').trim().toLowerCase();
  const notPrinted = query.notPrinted === 'true';
  const noShippingCode = query.noShippingCode === 'true';
  const productFilter = String(query.productFilter || '').trim().toLowerCase();
  const colorFilter = String(query.colorFilter || '').trim().toLowerCase();
  const sizeFilter = String(query.sizeFilter || '').trim().toLowerCase();
  const productIdFilter = (query.productId || '').trim();
  const variantIdFilter = (query.variantId || '').trim();

  const normalizedStatus = String(targetStatus || '').trim().toUpperCase();
  if (!normalizedStatus) {
    const error = new Error('حالة الطلب مطلوبة');
    error.statusCode = 400;
    throw error;
  }

  let affiliateId = query.affiliateId;
  let merchantId = null;

  if (isMerchantUser(user)) {
    const merchant = await requireMerchantAccountForUser(user);
    merchantId = merchant.id;
    companyId = merchant.companyId;
  }

  if (user.role === 'AFFILIATE') {
    const affiliate = await getSharedPrismaClient().affiliate.findUnique({
      where: { userId: user.id }
    });

    if (!affiliate) {
      return { totalRequested: 0, successCount: 0, results: [] };
    }
    affiliateId = affiliate.id;
  }

  if (affiliateId) {
    affiliateId = String(affiliateId).trim();
  }

  const batchSize = PREPARATION_BATCH_SIZE;
  let candidateOffset = 0;
  const matchingOrderNumbers = [];

  const {
    customStatusMap,
    customPrepCodes,
    customStageMap,
  } = await loadPreparationCustomStatusContext(companyId);

  while (true) {
    const candidateRows = await fetchPreparationCandidateRows({
      companyId,
      affiliateId,
      merchantId,
      offset: candidateOffset,
      limit: batchSize,
      activeStage: 'ALL',
      search: searchQuery,
      customPrepCodes,
      customStageMap,
    });

    if (!candidateRows.length) {
      break;
    }

    candidateOffset += candidateRows.length;

    const batchOrders = await fetchPreparationBatchOrders(candidateRows, { merchantId });
    if (!batchOrders.length) {
      continue;
    }

    const inventoryProductIds = [...new Set(
      batchOrders
        .flatMap((order) => (Array.isArray(order.items) ? order.items : []))
        .map((item) => String(item.productId || '').trim())
        .filter(Boolean)
    )];

    const inventoryRecords = inventoryProductIds.length > 0
      ? await getSharedPrismaClient().inventory.findMany({
        where: {
          productId: { in: inventoryProductIds },
          warehouse: {
            companyId,
            ...(merchantId ? { merchantId } : {})
          }
        },
        include: {
          warehouse: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, sku: true } }
        }
      })
      : [];

    const inventorySummaryByProduct = buildPreparationInventorySummary(inventoryRecords);
    const batchPreparationOrders = batchOrders
      .map((order) =>
        buildPreparationOrderSummary(
          order,
          inventorySummaryByProduct,
          selectedWarehouseId,
          customStatusMap
        )
      )
      .filter(Boolean);

    batchPreparationOrders.forEach((order) => {
      const matchesFilters = matchesPreparationFilters({
        order,
        stockFilter,
        shortageReasonFilter,
        shortageOwnerQuery,
        shortageFollowUpFilter,
        itemCountFilter,
        searchQuery,
        notPrinted,
        noShippingCode,
        productFilter,
        colorFilter,
        sizeFilter,
        productIdFilter,
        variantIdFilter,
      });

      if (!matchesFilters) return;

      const isCustomOrder = Boolean(
        order.customStatusCode && !STANDARD_PREPARATION_STATUS_CODES.has(order.customStatusCode)
      );
      const isCustomStageFilter = !STANDARD_PREPARATION_STATUS_CODES.has(activeStage) && activeStage !== 'ALL';

      const matchesStage = (() => {
        if (resolvedStage === 'ALL' || activeStage === 'ALL') return true;
        if (isCustomStageFilter) {
          return order.customStatusCode === activeStage || order.normalizedStatus === activeStage;
        }
        if (isCustomOrder) {
          return false;
        }
        return order.stage === resolvedStage || order.stage === activeStage;
      })();

      if (matchesStage) {
        matchingOrderNumbers.push(order.orderNumber);
      }
    });
  }

  if (matchingOrderNumbers.length === 0) {
    return { totalRequested: 0, successCount: 0, results: [] };
  }

  const bulkNote = notes || getBulkStatusNote(normalizedStatus);
  const results = [];

  for (const orderNumber of matchingOrderNumbers) {
    try {
      const updateResult = await updatePreparationOrderStatus({
        orderIdentifier: orderNumber,
        companyId,
        status: normalizedStatus,
        notes: bulkNote,
        userId,
        userName,
      });
      results.push({ id: orderNumber, success: true, orderType: updateResult.orderType });
    } catch (err) {
      results.push({ id: orderNumber, success: false, error: err.message });
    }
  }

  const successCount = results.filter(r => r.success).length;

  return {
    totalRequested: matchingOrderNumbers.length,
    successCount,
    results
  };
};

/**
 * Server-side enforcement of the "requireStockBeforePreparing" rule.
 *
 * Mirrors the frontend `validateTransition` stock check so the rule cannot be
 * bypassed with a direct API call. When `requireStockBeforePreparing` is on and
 * `allowPartialPreparation` is off, moving an order forward (to QUALITY_CHECK /
 * PACKAGED / handoff) while items are missing is rejected.
 *
 * Returns an Error with statusCode 400 when the move is blocked, otherwise null.
 */
const assertPreparationStockRule = async ({
  orderId,
  companyId,
  targetStatus,
  prepSettings = {},
}) => {
  const normalizedTarget = String(targetStatus || '').trim().toUpperCase();
  const handoffStatus = String(prepSettings.handoffStatus || 'READY_TO_SHIP').trim().toUpperCase();

  const stockBlockedStages = ['QUALITY_CHECK', 'PACKAGED', handoffStatus];
  if (!stockBlockedStages.includes(normalizedTarget)) {
    return null;
  }

  if (prepSettings.requireStockBeforePreparing !== true) {
    return null;
  }
  if (prepSettings.allowPartialPreparation === true) {
    return null;
  }

  const prisma = getSharedPrismaClient();
  const order = await prisma.order.findUnique({
    where: { id: orderId, companyId },
    include: {
      orderItems: { include: { product: { select: { id: true, name: true, sku: true } } } },
    },
  });
  if (!order) {
    const err = new Error('الطلب غير موجود');
    err.statusCode = 404;
    throw err;
  }

  const productIds = [...new Set(
    order.orderItems
      .map((item) => String(item.productId || '').trim())
      .filter(Boolean)
  )];

  const inventoryRecords = productIds.length > 0
    ? await prisma.inventory.findMany({
        where: { productId: { in: productIds }, warehouse: { companyId } },
        include: {
          warehouse: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
      })
    : [];

  const simpleOrder = mapRegularOrderToSimple(order);
  const inventorySummary = buildPreparationInventorySummary(inventoryRecords);
  const summary = buildPreparationOrderSummary(simpleOrder, inventorySummary, null);

  if (summary && summary.missingItemsCount > 0) {
    const err = new Error(
      prepSettings.allowCrossWarehouseTransfer
        ? 'الطلب يحتوي على عناصر ناقصة المخزون. قم بتوفيرها أو تحويلها من مخزن آخر قبل المتابعة'
        : 'الطلب يحتوي على عناصر ناقصة المخزون ولا يمكن المتابعة قبل اكتمال الكميات'
    );
    err.statusCode = 400;
    throw err;
  }

  return null;
};

const PREPARATION_HOLD_FORWARD_BLOCKED = new Set([
  'PREPARING',
  'PROCESSING',
  'QUALITY_CHECK',
  'PACKAGED',
  'PACKED',
  'READY',
  'READY_TO_SHIP'
]);

/**
 * Mirrors the frontend `validateTransition` hold rules so they cannot be
 * bypassed with a direct API call:
 *  1. Putting an order on hold (ON_HOLD_PREP) requires a reason note.
 *  2. A held order cannot move directly to a forward preparation stage
 *     (including the handoff READY_TO_SHIP) without being released first —
 *     unless an OWNER/COMPANY_ADMIN/MANAGER overrides with isOverride.
 *
 * Returns an Error with statusCode 400 when the move is blocked, otherwise null.
 */
const assertPreparationHoldRule = async ({
  currentPreparationStatus,
  targetStatus,
  notes,
  isOverride = false,
}) => {
  const normalizedTarget = String(targetStatus || '').trim().toUpperCase();
  const normalizedNote = String(notes || '').trim();

  if (normalizedTarget === 'ON_HOLD_PREP' && !normalizedNote) {
    const error = new Error('سبب تعليق الطلب مطلوب — اكتب المشكلة التي سيتم حلها قبل التعليق');
    error.statusCode = 400;
    throw error;
  }

  if (isOverride) return null;

  const currentStatus = String(currentPreparationStatus || '').trim().toUpperCase();
  if (currentStatus !== 'ON_HOLD_PREP') return null;

  if (PREPARATION_HOLD_FORWARD_BLOCKED.has(normalizedTarget)) {
    const error = new Error('الطلب معلق بانتظار حل المشكلة — يجب إرجاعه للتجهيز أو إزالة التعليق قبل المتابعة');
    error.statusCode = 400;
    throw error;
  }

  return null;
};

module.exports = {
  getPreparationQueue,
  bulkUpdateByFilters,
  assertPreparationStockRule,
  assertPreparationHoldRule,
  // exported for regression tests (prep-stage-notify)
  updatePreparationOrderStatus,
  notifyPreparationStageChange,
  getEffectivePreparationStatus,
  normalizePreparationStage,
  getMappedRegularOrderStatus,
};
