import i18n from "../../../i18n";
import { DEFAULT_PREPARATION_QUEUE_SETTINGS } from "./constants";
import { parseMaybeJsonObject, toNumber, toUpper } from "./helpers";
import type {
  ApiInventoryResponse,
  ApiOrderItemResponse,
  ApiOrderResponse,
  ApiStatusResponse,
  ApiWarehouseResponse,
  InventoryRecord,
  PreparationQueueSettings,
  SimpleOrder,
  SimpleOrderItem,
  SimpleOrderShipment,
  StatusConfig,
  WarehouseOption,
  MerchantFulfillmentView,
} from "./types";

const normalizeOrderItem = (item: ApiOrderItemResponse): SimpleOrderItem => {
  const metadata = parseMaybeJsonObject(item.metadata);
  const metaAttrs = (metadata?.attributeValues as Record<string, any>) || null;
  const carModel =
    (item as any).carModel ||
    (item as any).car_model ||
    (metadata?.carModel as string) ||
    (metadata?.car_model as string) ||
    (metaAttrs?.car_model as string) ||
    (metaAttrs?.carModel as string) ||
    (metaAttrs?.["نوع وموديل وسنة صنع السيارة"] as string) ||
    (metaAttrs?.["موديل السيارة"] as string) ||
    (metaAttrs?.["السيارة"] as string) ||
    (typeof metadata?.details === "string" && (metadata.details as string).trim().length > 1 ? (metadata.details as string).trim() : null) ||
    null;

  const customAttributes =
    (item as any).customAttributes ||
    (item as any).attributes ||
    (item as any).customFields ||
    metadata?.customAttributes ||
    metaAttrs ||
    null;

  return {
    id: String(item.id || item.productId || Math.random()),
    productId: String(item.productId || ""),
    variantId: item.variantId ? String(item.variantId) : null,
    name: item.name || item.productName || "",
    productName: item.productName || item.name || "",
    color: item.color || (metadata?.color as string) || (metadata?.productColor as string) || "",
    size: item.size || (metadata?.size as string) || (metadata?.productSize as string) || "",
    price: toNumber(item.price),
    quantity: toNumber(item.quantity),
    total: toNumber(item.total),
    carModel,
    customAttributes,
    attributes: (item as any).attributes || customAttributes,
    customFields: (item as any).customFields || null,
    metadata,
  };
};

const normalizeMerchantFulfillment = (
  metadata: Record<string, unknown>,
): MerchantFulfillmentView | null => {
  const raw = metadata.merchantFulfillment;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const fulfillment = raw as Record<string, unknown>;

  return {
    merchantId:
      fulfillment.merchantId === null || fulfillment.merchantId === undefined
        ? null
        : String(fulfillment.merchantId),
    merchantOrderId:
      fulfillment.merchantOrderId === null ||
      fulfillment.merchantOrderId === undefined
        ? null
        : String(fulfillment.merchantOrderId),
    fulfillmentSource:
      fulfillment.fulfillmentSource === null ||
      fulfillment.fulfillmentSource === undefined
        ? null
        : String(fulfillment.fulfillmentSource),
    canPrepare: fulfillment.canPrepare !== false,
    canViewFullDetails: fulfillment.canViewFullDetails !== false,
    limitedView: Boolean(fulfillment.limitedView),
    warehouseId:
      fulfillment.warehouseId === null || fulfillment.warehouseId === undefined
        ? null
        : String(fulfillment.warehouseId),
  };
};

const normalizeShipment = (shipment: Record<string, unknown>): SimpleOrderShipment => ({
  trackingNumber: String(shipment.trackingNumber || "") || null,
  externalShipmentId: String(shipment.externalShipmentId || "") || null,
  status: String(shipment.status || "PENDING"),
  carrierType: String(shipment.carrierType || "MANUAL"),
});

export const normalizeSimpleOrder = (order: ApiOrderResponse): SimpleOrder => {
  const metadata = parseMaybeJsonObject(order.metadata);

  return {
    id: String(order.id || order.orderNumber || ""),
    orderNumber: String(order.orderNumber || order.id || ""),
    customerName: order.customerName || i18n.t("preparation.fallbackCustomerName"),
    customerPhone: order.customerPhone || "",
    customerEmail: order.customerEmail || "",
    city: order.city || order.shippingAddress?.city || "",
    governorate: order.governorate || order.shippingAddress?.governorate || "",
    total: toNumber(order.total),
    status: toUpper(order.status || ""),
    sourceType: order.sourceType || "unknown",
    createdAt: order.createdAt || new Date(0).toISOString(),
    updatedAt: order.updatedAt || undefined,
    notes: order.notes || "",
    metadata,
    merchantFulfillment: normalizeMerchantFulfillment(metadata),
    items: Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [],
    printCount: Number(order.printCount || 0),
    printedAt: order.printedAt || null,
    turboTrackingNumber: String(order.turboTrackingNumber || "") || null,
    turboShipmentId: String(order.turboShipmentId || "") || null,
    turboShipmentStatus: String(order.turboShipmentStatus || "") || null,
    shipments: Array.isArray(order.shipments) ? order.shipments.map(normalizeShipment) : [],
  };
};

export const normalizeInventoryRecord = (
  item: ApiInventoryResponse,
): InventoryRecord => ({
  id: String(item.id || `${item.productId}-${item.warehouseId}`),
  productId: String(item.productId || ""),
  warehouseId: String(item.warehouseId || ""),
  quantity: toNumber(item.quantity),
  available: toNumber(item.available),
  reserved: toNumber(item.reserved),
  batchNumber: item.batchNumber || null,
  products: item.products || item.product || {},
  warehouses: item.warehouses || item.warehouse || {},
});

export const normalizeWarehouseOption = (
  warehouse: ApiWarehouseResponse,
): WarehouseOption => ({
  id: String(warehouse.id || ""),
  name: warehouse.name || i18n.t("preparation.fallbackWarehouseName"),
});

export const normalizeStatusConfig = (
  status: ApiStatusResponse,
): StatusConfig | null => {
  if (!status?.code) return null;

  return {
    code: toUpper(status.code),
    name: status.name || status.nameEn || status.code,
    color: status.color || undefined,
    statusType: status.statusType || undefined,
  };
};

export const normalizePreparationQueueSettings = (
  rawSettings: unknown,
): PreparationQueueSettings => {
  if (!rawSettings || typeof rawSettings !== "object" || Array.isArray(rawSettings)) {
    return DEFAULT_PREPARATION_QUEUE_SETTINGS;
  }

  const settings = rawSettings as Partial<PreparationQueueSettings>;
  const qcChecks =
    settings.qcChecks &&
    typeof settings.qcChecks === "object" &&
    !Array.isArray(settings.qcChecks)
      ? settings.qcChecks
      : {};

  return {
    ...DEFAULT_PREPARATION_QUEUE_SETTINGS,
    enabled:
      typeof settings.enabled === "boolean"
        ? settings.enabled
        : DEFAULT_PREPARATION_QUEUE_SETTINGS.enabled,
    defaultWarehouseId: String(settings.defaultWarehouseId || ""),
    startingStatus: toUpper(
      settings.startingStatus ||
        DEFAULT_PREPARATION_QUEUE_SETTINGS.startingStatus,
    ),
    handoffStatus: toUpper(
      settings.handoffStatus || DEFAULT_PREPARATION_QUEUE_SETTINGS.handoffStatus,
    ),
    requireStockBeforePreparing:
      typeof settings.requireStockBeforePreparing === "boolean"
        ? settings.requireStockBeforePreparing
        : DEFAULT_PREPARATION_QUEUE_SETTINGS.requireStockBeforePreparing,
    allowPartialPreparation:
      typeof settings.allowPartialPreparation === "boolean"
        ? settings.allowPartialPreparation
        : DEFAULT_PREPARATION_QUEUE_SETTINGS.allowPartialPreparation,
    allowCrossWarehouseTransfer:
      typeof settings.allowCrossWarehouseTransfer === "boolean"
        ? settings.allowCrossWarehouseTransfer
        : DEFAULT_PREPARATION_QUEUE_SETTINGS.allowCrossWarehouseTransfer,
    enableQcChecklist:
      typeof settings.enableQcChecklist === "boolean"
        ? settings.enableQcChecklist
        : DEFAULT_PREPARATION_QUEUE_SETTINGS.enableQcChecklist,
    qcChecks: {
      ...DEFAULT_PREPARATION_QUEUE_SETTINGS.qcChecks,
      ...qcChecks,
    },
    enableBulkStatusUpdate:
      typeof settings.enableBulkStatusUpdate === "boolean"
        ? settings.enableBulkStatusUpdate
        : DEFAULT_PREPARATION_QUEUE_SETTINGS.enableBulkStatusUpdate,
    prioritizeShortageOrders:
      typeof settings.prioritizeShortageOrders === "boolean"
        ? settings.prioritizeShortageOrders
        : DEFAULT_PREPARATION_QUEUE_SETTINGS.prioritizeShortageOrders,
  };
};
