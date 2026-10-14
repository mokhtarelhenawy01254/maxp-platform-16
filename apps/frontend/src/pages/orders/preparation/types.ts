export type JsonObject = Record<string, unknown>;

export type StageKey = string;

export type StageFilter = "ALL" | string;
export type StockFilter = "all" | "ready" | "shortage";
export type ItemCountFilter = "all" | "single" | "multiple";
export type StageCounts = Record<string, number>;

export interface SimpleOrderItem {
  id: string;
  productId: string;
  variantId?: string | null;
  name?: string;
  productName?: string;
  color?: string;
  size?: string;
  price?: number | string | null;
  quantity?: number | string | null;
  total?: number | string | null;
  carModel?: string | null;
  customAttributes?: any;
  attributes?: any;
  customFields?: any;
  metadata?: JsonObject | string | null;
}

export interface MerchantFulfillmentView {
  merchantId?: string | null;
  merchantOrderId?: string | null;
  fulfillmentSource?: string | null;
  canPrepare: boolean;
  canViewFullDetails: boolean;
  limitedView: boolean;
  warehouseId?: string | null;
}

export interface SimpleOrderShipment {
  trackingNumber: string | null;
  externalShipmentId: string | null;
  status: string;
  carrierType: string;
}

export interface SimpleOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  city?: string;
  governorate?: string;
  total?: number | string;
  status: string;
  sourceType?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  metadata?: JsonObject | string | null;
  merchantFulfillment?: MerchantFulfillmentView | null;
  items: SimpleOrderItem[];
  turboTrackingNumber?: string | null;
  turboShipmentId?: string | null;
  turboShipmentStatus?: string | null;
  shipments?: SimpleOrderShipment[];
  printCount?: number;
  printedAt?: string | null;
}

export interface InventoryRecord {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  available: number;
  reserved: number;
  batchNumber?: string | null;
  products?: {
    id?: string;
    name?: string;
    sku?: string | null;
  };
  warehouses?: {
    id?: string;
    name?: string;
  };
}

export interface WarehouseOption {
  id: string;
  name: string;
}

export interface StatusConfig {
  code: string;
  name: string;
  color?: string;
  statusType?: string;
}

export interface StageDefinition {
  key: string;
  label: string;
  labelKey: string;
  colorClass: string;
  description: string;
  descriptionKey: string;
}

export interface PreparationStatusOption {
  code: string;
  fallbackName: string;
}

export interface InventoryWarehouseSummary {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  available: number;
  reserved: number;
}

export interface InventoryProductSummary {
  productId: string;
  productName: string;
  sku?: string | null;
  totalQuantity: number;
  totalAvailable: number;
  totalReserved: number;
  warehouses: InventoryWarehouseSummary[];
}

export interface ItemInsight extends SimpleOrderItem {
  displayName: string;
  quantityNumber: number;
  availableInScope: number;
  reservedInScope: number;
  shortage: number;
  bestWarehouseName: string | null;
  warehouseCount: number;
}

export type ShortageReason =
  | "stock_shortage"
  | "waiting_transfer"
  | "waiting_restock"
  | "other";

export type ProblemReason = string;

export type ShortageReasonFilter = "all" | ShortageReason;
export type ShortageFollowUpFilter = "all" | "today" | "overdue" | "without_date";
export type NotPrintedFilter = "all" | "not_printed";
export type NoShippingCodeFilter = "all" | "no_shipping_code";
export type SortBy = "createdAt" | "totalUnits" | "totalValue";
export type SortOrder = "asc" | "desc";

export type ShortageFollowUpState =
  | "none"
  | "today"
  | "overdue"
  | "without_date"
  | "scheduled";

export interface ShortageHoldDetails {
  reason: ShortageReason;
  owner: string;
  followUpDate: string;
  customerNotified: boolean;
  note: string;
  heldAt?: string;
  releasedAt?: string;
  state: "held" | "released";
}

export interface ProblemHoldDetails {
  reason: string;
  heldAt?: string;
  releasedAt?: string;
  heldBy?: string;
  releasedBy?: string;
  state: "held" | "released";
}

export interface ShortageFollowUpVisual {
  label: string;
  badgeClass: string;
  cardClass: string;
  alertClass: string;
  alertText: string;
}

export interface PreparationOrder extends SimpleOrder {
  normalizedStatus: string;
  stage: StageKey | null;
  totalValue: number;
  totalUnits: number;
  itemInsights: ItemInsight[];
  missingItemsCount: number;
  isReady: boolean;
  warehouseMatch: boolean;
  recommendedWarehouseName: string | null;
  shortageHoldDetails: ShortageHoldDetails;
  problemHoldDetails?: ProblemHoldDetails;
  hasProblem?: boolean;
}

export interface PreparationQueueSettings {
  enabled: boolean;
  defaultWarehouseId: string;
  startingStatus: string;
  handoffStatus: string;
  requireStockBeforePreparing: boolean;
  allowPartialPreparation: boolean;
  allowCrossWarehouseTransfer: boolean;
  enableQcChecklist: boolean;
  qcChecks: {
    quantity: boolean;
    variant: boolean;
    packaging: boolean;
    accessories: boolean;
    invoiceSlip: boolean;
  };
  enableBulkStatusUpdate: boolean;
  prioritizeShortageOrders: boolean;
}

export type QcCheckKey = keyof PreparationQueueSettings["qcChecks"];



export interface ApiOrderItemResponse {
  id?: string | number | null;
  productId?: string | number | null;
  name?: string | null;
  productName?: string | null;
  color?: string | null;
  size?: string | null;
  price?: number | string | null;
  quantity?: number | string | null;
  total?: number | string | null;
  carModel?: string | null;
  customAttributes?: any;
  attributes?: any;
  customFields?: any;
  metadata?: JsonObject | string | null;
}

export interface ApiOrderShipmentResponse {
  trackingNumber?: string | null;
  externalShipmentId?: string | null;
  status?: string;
  carrierType?: string;
}

export interface ApiOrderResponse {
  id?: string | number | null;
  orderNumber?: string | number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  city?: string | null;
  governorate?: string | null;
  shippingAddress?: {
    city?: string | null;
    governorate?: string | null;
  } | null;
  total?: number | string | null;
  status?: string | null;
  sourceType?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  notes?: string | null;
  metadata?: JsonObject | string | null;
  items?: ApiOrderItemResponse[] | null;
  turboTrackingNumber?: string | null;
  turboShipmentId?: string | null;
  turboShipmentStatus?: string | null;
  shipments?: ApiOrderShipmentResponse[] | null;
  printCount?: number;
  printedAt?: string | null;
}

export interface ApiInventoryResponse {
  id?: string | number | null;
  productId?: string | number | null;
  warehouseId?: string | number | null;
  quantity?: number | string | null;
  available?: number | string | null;
  reserved?: number | string | null;
  batchNumber?: string | null;
  products?: InventoryRecord["products"];
  product?: InventoryRecord["products"];
  warehouses?: InventoryRecord["warehouses"];
  warehouse?: InventoryRecord["warehouses"];
}

export interface ApiWarehouseResponse {
  id?: string | number | null;
  name?: string | null;
}

export interface ApiStatusResponse {
  code?: string | null;
  name?: string | null;
  nameEn?: string | null;
  color?: string | null;
  statusType?: string | null;
}

export interface PreparationQueuePagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PreparationQueueSummary {
  filteredTotal: number;
  visibleTotal: number;
  stageCounts: StageCounts;
  statusCounts?: Record<string, number>;
  readyCount: number;
  shortageCount: number;
  shortageHoldCount: number;
  onHoldPrepCount: number;
  overdueShortageFollowUpCount: number;
  overdueProblemFollowUpCount: number;
  readyToShipCount: number;
  allOverdueShortageFollowUpCount: number;
  allOverdueProblemFollowUpCount: number;
}

export interface ApiPreparationOrdersResponse {
  data?: ApiOrderResponse[];
  pagination?: Partial<PreparationQueuePagination>;
  summary?: Partial<PreparationQueueSummary>;
  shortageOwnerOptions?: string[];
}
