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
  'TRASH'
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
const PREPARATION_DB_TERMINAL_STATUSES = [...PREPARATION_TERMINAL_STATUSES].filter(
  (status) => status !== 'TRASH'
);
const PREPARATION_BATCH_SIZE = 150;

const toPreparationUpper = (value) => String(value || '').trim().toUpperCase();
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

const getEffectivePreparationStatus = (status, metadata) => {
  const normalizedStatus = toPreparationUpper(status);
  if (PREPARATION_TERMINAL_STATUSES.has(normalizedStatus)) {
    return normalizedStatus;
  }

  const metadataObject = parsePreparationJsonObject(metadata);
  const metadataStatus = toPreparationUpper(
    metadataObject[PREPARATION_STATUS_METADATA_KEY]
  );

  return metadataStatus || normalizedStatus;
};

const normalizePreparationStage = (status) => {
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
  return normalized;
};

const isPreparationShortageFollowUpToday = (followUpDate, stage) => {
  if (stage !== 'STOCK_SHORTAGE' || !followUpDate) return false;

  const today = new Date().toISOString().slice(0, 10);
  return normalizePreparationDateInputValue(followUpDate) === today;
};

const isPreparationShortageFollowUpOverdue = (followUpDate, stage) => {
  if (stage !== 'STOCK_SHORTAGE' || !followUpDate) return false;

  const parsedDate = new Date(
    followUpDate.length <= 10 ? `${followUpDate}T00:00:00` : followUpDate
  );
  if (Number.isNaN(parsedDate.getTime())) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return parsedDate.getTime() < startOfToday.getTime();
};

const getPreparationShortageFollowUpState = (followUpDate, stage) => {
  if (stage !== 'STOCK_SHORTAGE') return 'none';
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
  PENDING_CANCELLATION: 0
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
    paymentStatus: (order.paymentStatus || 'PENDING').toLowerCase(),
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
  selectedWarehouseId
) => {
  const normalizedStatus = getEffectivePreparationStatus(order.status, order.metadata);
  const stage = normalizePreparationStage(normalizedStatus);
  if (!stage) {
    return null;
  }

  const shortageHoldDetails = buildPreparationShortageHoldDetails(order.metadata);
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

    return {
      displayName: item.productName || item.name || metadataProductName || 'منتج غير محدد',
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

  return {
    ...order,
    normalizedStatus,
    stage,
    shortageHoldDetails,
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
    overdueShortageFollowUpCount: 0,
    readyToShipCount: 0,
    allOverdueShortageFollowUpCount: 0
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
    if (left.stage === 'STOCK_SHORTAGE' && right.stage === 'STOCK_SHORTAGE') {
      const leftPriority = PREPARATION_SHORTAGE_FOLLOW_UP_PRIORITY[
        getPreparationShortageFollowUpState(
          left.shortageHoldDetails.followUpDate,
          left.stage
        )
      ];
      const rightPriority = PREPARATION_SHORTAGE_FOLLOW_UP_PRIORITY[
        getPreparationShortageFollowUpState(
          right.shortageHoldDetails.followUpDate,
          right.stage
        )
      ];

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
    }

    if (prioritizeShortageOrders && left.missingItemsCount !== right.missingItemsCount) {
      return right.missingItemsCount - left.missingItemsCount;
    }
  }

  const leftValue = sortByField === 'totalUnits' ? left.totalUnits : sortByField === 'totalValue' ? left.totalValue : left.createdAtMs;
  const rightValue = sortByField === 'totalUnits' ? right.totalUnits : sortByField === 'totalValue' ? right.totalValue : right.createdAtMs;

  return sortOrderDir === 'asc' ? leftValue - rightValue : rightValue - leftValue;
};

const stripPreparationTransientFields = ({
  itemInsights,
  missingItemsCount,
  isReady,
  warehouseMatch,
  recommendedWarehouseName,
  shortageHoldDetails,
  normalizedStatus,
  stage,
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

const matchesPreparationFilters = ({
  order,
  stockFilter,
  shortageReasonFilter,
  shortageOwnerQuery,
  shortageFollowUpFilter,
  itemCountFilter,
  searchQuery
}) => {
  if (!order.warehouseMatch) return false;

  if (itemCountFilter === 'single' && order.itemInsights.length !== 1) return false;
  if (itemCountFilter === 'multiple' && order.itemInsights.length <= 1) return false;

  const hasShortageContext =
    order.missingItemsCount > 0 || order.stage === 'STOCK_SHORTAGE';

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
    if (!hasShortageContext) return false;
    if (!order.shortageHoldDetails.owner.trim().toLowerCase().includes(shortageOwnerQuery)) {
      return false;
    }
  }

  if (shortageFollowUpFilter !== 'all') {
    if (!hasShortageContext) return false;

    if (shortageFollowUpFilter === 'without_date') {
      if (order.shortageHoldDetails.followUpDate) return false;
    }

    if (shortageFollowUpFilter === 'today') {
      if (!isPreparationShortageFollowUpToday(order.shortageHoldDetails.followUpDate, order.stage)) {
        return false;
      }
    }

    if (shortageFollowUpFilter === 'overdue') {
      if (!isPreparationShortageFollowUpOverdue(order.shortageHoldDetails.followUpDate, order.stage)) {
        return false;
      }
    }
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

const buildStageSqlCondition = (builder, stage, tableAlias, useMetadata) => {
  const statuses = STAGE_EFFECTIVE_STATUS_MAP[stage];
  if (!statuses) {
    if (useMetadata) {
      const effectiveStatus = `COALESCE(NULLIF(${tableAlias}."metadata"::jsonb->>'preparationStatus', ''), ${tableAlias}."status"::text)`;
      const placeholder = builder.pushValue(stage);
      return `UPPER(${effectiveStatus}) = ${placeholder}`;
    }
    const placeholder = builder.pushValue(stage);
    return `UPPER(${tableAlias}."status") = ${placeholder}`;
  }

  if (useMetadata) {
    const effectiveStatus = `COALESCE(NULLIF(${tableAlias}."metadata"::jsonb->>'preparationStatus', ''), ${tableAlias}."status"::text)`;
    const placeholders = statuses.map((s) => builder.pushValue(s));
    return `${effectiveStatus} IN (${placeholders.join(', ')})`;
  }

  const placeholders = statuses.map((s) => builder.pushValue(s));
  return `UPPER(${tableAlias}."status") IN (${placeholders.join(', ')})`;
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
    builder.add(builder.notInList('o."status"::text', PREPARATION_DB_TERMINAL_STATUSES));

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
      builder.add(buildStageSqlCondition(builder, activeStage, 'o', true));
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
      builder.add(buildStageSqlCondition(builder, activeStage, 'g', false));
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
              product: { select: { id: true, name: true, images: true } }
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
  const searchTerm = String(query.search || '').trim();
  const searchQuery = searchTerm.toLowerCase();
  const selectedWarehouseId = String(query.warehouseId || '').trim();
  const stockFilter = String(query.stockFilter || 'all').trim().toLowerCase();
  const shortageReasonFilter = String(query.shortageReason || 'all').trim();
  const shortageOwnerQuery = String(query.shortageOwner || '').trim().toLowerCase();
  const shortageFollowUpFilter = String(query.shortageFollowUp || 'all').trim().toLowerCase();
  const itemCountFilter = String(query.itemCountFilter || 'all').trim().toLowerCase();
  const prioritizeShortageOrders = query.prioritizeShortageOrders !== 'false';
  const sortByField = VALID_SORT_BY.has(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrderDir = query.sortOrder === 'asc' ? 'asc' : 'desc';

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
  let overdueShortageFollowUpCount = 0;
  let readyToShipCount = 0;
  let allOverdueShortageFollowUpCount = 0;
  let candidateOffset = 0;

  while (true) {
    const candidateRows = await fetchPreparationCandidateRows({
      companyId,
      affiliateId,
      merchantId,
      offset: candidateOffset,
      limit: batchSize,
      activeStage: 'ALL',
      search: searchQuery,
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
        buildPreparationOrderSummary(order, inventorySummaryByProduct, selectedWarehouseId)
      )
      .filter(Boolean);

    batchPreparationOrders.forEach((order) => {
      if (order.warehouseMatch) {
        const ownerName = order.shortageHoldDetails.owner.trim();
        if (ownerName) {
          shortageOwnerSet.add(ownerName);
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
        searchQuery
      });

      if (!matchesFilters) {
        return;
      }

      filteredTotal += 1;
      stageCounts.ALL += 1;
      if (order.stage) {
        stageCounts[order.stage] = (stageCounts[order.stage] || 0) + 1;
      }
      statusCounts[order.normalizedStatus] = (statusCounts[order.normalizedStatus] || 0) + 1;

      if (order.isReady) {
        readyCount += 1;
      }

      if (order.missingItemsCount > 0) {
        shortageCount += 1;
      }

      if (order.normalizedStatus === 'STOCK_SHORTAGE') {
        shortageHoldCount += 1;
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

      if (activeStage === 'ALL' || order.stage === activeStage) {
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
      overdueShortageFollowUpCount,
      readyToShipCount,
      allOverdueShortageFollowUpCount
    },
    shortageOwnerOptions
  };
};

module.exports = {
  getPreparationQueue
};
