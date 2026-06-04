import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import useSocket from "../../hooks/useSocket";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import { apiClient } from "../../services/apiClient";
import { summarizeOrderDocumentItems } from "../../utils/orderDocumentQuantityOffers";
import {
  AFFILIATE_OPERATION_APP_SLUGS,
  MERCHANT_OPERATION_APP_SLUGS,
  ORDER_SOURCE_TRACKING_APP_SLUGS,
  getCurrentCompanyActiveApps,
  hasAnyCompanyAppSlug,
  normalizeCompanyAppSlug,
} from "../../utils/companyApps";
import EnhancedOrderModal from "../../components/orders/EnhancedOrderModal";
import InvoiceModal from "../../components/orders/InvoiceModal";
import {
  ShoppingBagIcon,
  EyeIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  FunnelIcon,
  InformationCircleIcon,
  StarIcon,
  ExclamationTriangleIcon,
  RocketLaunchIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  BanknotesIcon,
  CubeIcon,
  TruckIcon,
  ClockIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";


interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status:
  | "pending"
  | "confirmed"
  | "scheduled"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "duplicate_order"
  | "PENDING"
  | "CONFIRMED"
  | "SCHEDULED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "DUPLICATE_ORDER";
  items: Array<{
    id: string;
    productId: string;
    name: string;
    productName?: string;
    price: number | null;
    quantity: number;
    total: number | null;
    confidence?: number;
    metadata?: unknown;
    quantityOffer?: {
      groupId?: string;
      offerLabel?: string;
      offerQuantity?: number;
      slotIndex?: number;
      freeShipping?: boolean;
    };
  }>;
  subtotal: number | null;
  tax: number;
  shipping: number;
  total: number | null;
  paymentMethod: string;
  paymentStatus:
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "unavailable"
  | "PENDING"
  | "COMPLETED"
  | "FAILED";
  shippingAddress: {
    city: string;
    governorate: string;
    country: string;
  };
  trackingNumber?: string;
  notes: string;
  createdAt: string;
  conversationId?: string;
  updatedAt: string;
  // Enhanced fields
  confidence?: number;
  extractionMethod?: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    facebookId?: string;
  };
  conversation?: {
    id: string;
    status: string;
    channel: string;
  };
  metadata?: {
    source?: string;
    isGuestOrder?: boolean;
    confidence?: number;
    extractionMethod?: string;
    [key: string]: unknown;
  };
  isScheduled?: boolean;
  scheduledDeliveryDate?: string;
  scheduledNotes?: string;
  isViewed?: boolean;
  governorate?: string;
  sourceType?: string;
  affiliateId?: string;
  affiliate?: AffiliateFilterOption;
  merchantOrder?: MerchantOrderScope;
}

type OrderStatus = Order["status"];
type PaymentStatus = Order["paymentStatus"];
type OrderItem = Order["items"][number];

type RawOrderItem = {
  id?: string;
  productId?: string;
  name?: string;
  productName?: string;
  price?: string | number | null;
  quantity?: number;
  total?: string | number | null;
  confidence?: number;
  metadata?: {
    confidence?: number;
    [key: string]: unknown;
  } | null;
  quantityOffer?: OrderItem["quantityOffer"];
};

type RawOrder = {
  id?: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status?: unknown;
  items?: RawOrderItem[];
  subtotal?: string | number | null;
  tax?: string | number | null;
  shipping?: string | number | null;
  total?: string | number | null;
  paymentMethod?: string;
  paymentStatus?: unknown;
  shippingAddress?: Partial<Order["shippingAddress"]> | null;
  city?: string;
  governorate?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt?: string;
  conversationId?: string;
  updatedAt?: string;
  confidence?: number;
  extractionMethod?: string;
  customer?: Order["customer"];
  conversation?: Order["conversation"];
  metadata?: Order["metadata"];
  isScheduled?: boolean;
  scheduledDeliveryDate?: string;
  scheduledNotes?: string;
  isViewed?: boolean;
  sourceType?: string;
  affiliateId?: string;
  affiliate?: AffiliateFilterOption;
  merchantOrder?: MerchantOrderScope;
};

type SocketOrderUpdate = Partial<Order> & {
  orderNumber: string;
  _refetch?: boolean;
};

type GeneratedInvoice = {
  id: string;
  [key: string]: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeOrderStatus = (value: unknown): OrderStatus => {
  switch (String(value ?? "").trim().toUpperCase()) {
    case "CONFIRMED":
      return "confirmed";
    case "SCHEDULED":
      return "scheduled";
    case "PROCESSING":
      return "processing";
    case "SHIPPED":
      return "shipped";
    case "DELIVERED":
      return "delivered";
    case "CANCELLED":
      return "cancelled";
    case "DUPLICATE_ORDER":
      return "duplicate_order";
    case "PENDING":
    default:
      return "pending";
  }
};

const normalizePaymentStatus = (
  value: unknown,
  isGuestOrder: boolean,
): PaymentStatus => {
  switch (String(value ?? "").trim().toUpperCase()) {
    case "COMPLETED":
    case "PAID":
      return "completed";
    case "FAILED":
      return "failed";
    case "REFUNDED":
      return "refunded";
    case "UNAVAILABLE":
      return "unavailable";
    case "PENDING":
      return "pending";
    default:
      return isGuestOrder ? "unavailable" : "pending";
  }
};

interface OrderStatusDefinition {
  code: string;
  name: string;
  nameEn?: string;
  color?: string;
}

interface OrdersFilters {
  status: string;
  paymentStatus: string;
  sourceType: string;
  merchantId: string;
  affiliateId: string;
  fulfillmentSource: string;
  merchantOperationStatus: string;
  merchantSettlementStatus: string;
  search: string;
  startDate: string;
  endDate: string;
  extractionMethod: string;
  minConfidence: string;
  onlyUnseen: boolean;
  timeRange: string;
}

interface OrdersListViewState {
  page: number;
  limit: number;
  filters: OrdersFilters;
}

interface MerchantFilterOption {
  id: string;
  name: string;
  email?: string;
  fulfillmentMode?: string;
}

interface AffiliateFilterOption {
  id: string;
  affiliateCode?: string;
  status?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

interface MerchantOrderScope {
  id?: string;
  merchantId?: string | null;
  merchantName?: string | null;
  merchantEmail?: string | null;
  merchantFulfillmentMode?: string | null;
  status?: string | null;
  operationStatus?: string | null;
  fulfillmentSource?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  shippingCompanyId?: string | null;
  shippingCompanyName?: string | null;
  trackingNumber?: string | null;
  shipmentStatus?: string | null;
  pieces?: number;
  merchantAmount?: number;
  merchantCommissionAmount?: number;
  affiliateCommissionAmount?: number;
  settlementStatus?: string | null;
}

interface MerchantInventorySummary {
  linkedProducts?: number;
  availableForSale?: number;
  merchantProductStock?: number;
  physicalQuantity?: number;
  physicalAvailable?: number;
  reservedQuantity?: number;
  stockLocation?: string;
  stockLocationLabel?: string;
  warehouseNames?: string[];
}

interface MerchantOperationsTotals {
  assignedOrdersCount: number;
  assignedPieces: number;
  preparationOrdersCount: number;
  preparationPieces: number;
  inShippingOrdersCount: number;
  inShippingPieces: number;
  deliveredOrdersCount: number;
  deliveredPieces: number;
  notDeliveredOrdersCount: number;
  notDeliveredPieces: number;
  payablePieces: number;
  pendingPayablePieces: number;
  expectedReceivableAmount: number;
  inShippingAmount: number;
  deliveredPayableAmount: number;
  notDeliveredAmount: number;
  shippingCostAmount: number;
  confirmedCommissionAmount: number;
  pendingCommissionAmount: number;
  paidAmount: number;
}

interface MerchantOperationsSummary {
  summary?: Partial<MerchantOperationsTotals>;
  rows?: Array<{
    id: string;
    orderId?: string;
    orderNumber?: string;
    operationStatus?: string;
    pieces?: number;
    merchantAmount?: number;
    payableAmount?: number;
    expectedAmount?: number;
  }>;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface MerchantPayout {
  id: string;
  amount: string | number;
  currency?: string;
  status: string;
  paymentMethod?: string;
  createdAt: string;
  processedAt?: string | null;
}

interface MerchantPayoutSummary {
  balances?: {
    availableAmount?: number;
    availableCommissionsCount?: number;
    confirmedAmount?: number;
    pendingPayoutAmount?: number;
    paidAmount?: number;
  };
  payouts?: MerchantPayout[];
}

interface MerchantSettlementSummary {
  merchant?: MerchantFilterOption & {
    inventorySummary?: MerchantInventorySummary | null;
    operationsSummary?: MerchantOperationsSummary | null;
  };
  inventorySummary?: MerchantInventorySummary | null;
  operationsSummary?: MerchantOperationsSummary | null;
  payoutSummary?: MerchantPayoutSummary | null;
}

const normalizeStatusCode = (value: string | null | undefined) =>
  String(value || "").trim().toUpperCase();

const isCancellationStatus = (value: string | null | undefined) => {
  const normalizedStatus = normalizeStatusCode(value);
  return normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";
};

const DEFAULT_ORDER_STATUSES: OrderStatusDefinition[] = [
  { code: "PENDING", name: "قيد الانتظار", color: "#F59E0B" },
  { code: "DRAFT", name: "مسودة", color: "#9CA3AF" },
  { code: "CONFIRMED", name: "مؤكد", color: "#3B82F6" },
  { code: "SCHEDULED", name: "مجدول", color: "#F97316" },
  { code: "ON_HOLD", name: "معلق", color: "#F97316" },
  { code: "PROCESSING", name: "قيد التجهيز", color: "#8B5CF6" },
  { code: "SHIPPED", name: "تم الشحن", color: "#06B6D4" },
  { code: "DELIVERED", name: "تم التسليم", color: "#10B981" },
  { code: "CANCELLED", name: "ملغي", color: "#EF4444" },
  { code: "DUPLICATE_ORDER", name: "طلب مكرر", color: "#F59E0B" },
  { code: "REFUNDED", name: "مسترد", color: "#6B7280" },
  { code: "PARTIALLY_REFUNDED", name: "مسترد جزئياً", color: "#9CA3AF" },
];

const DEFAULT_PAYMENT_STATUSES: OrderStatusDefinition[] = [
  { code: "PENDING", name: i18n.t('orderStatus.paymentPending'), color: "#F59E0B" },
  { code: "COMPLETED", name: i18n.t('orderStatus.paymentCompleted'), color: "#10B981" },
  { code: "PARTIALLY_PAID", name: i18n.t('orderStatus.paymentPartiallyPaid'), color: "#3B82F6" },
  { code: "FAILED", name: i18n.t('orderStatus.paymentFailed'), color: "#EF4444" },
  { code: "ON_HOLD", name: i18n.t('orderStatus.paymentOnHold'), color: "#F97316" },
  { code: "REFUNDED", name: i18n.t('orderStatus.paymentRefunded'), color: "#6B7280" },
  { code: "PARTIALLY_REFUNDED", name: i18n.t('orderStatus.paymentPartiallyRefunded'), color: "#9CA3AF" },
];

const FILTERABLE_STATUS_CODES = [
  "PENDING",
  "CONFIRMED",
  "SCHEDULED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "DUPLICATE_ORDER",
] as const;

const BULK_UPDATABLE_STATUS_CODES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "DUPLICATE_ORDER",
] as const;

const transformOrder = (order: RawOrder): Order => {
  const isGuestOrder = Boolean(order.metadata?.isGuestOrder);

  const subtotal =
    typeof order.subtotal === "string"
      ? parseFloat(order.subtotal) || 0
      : (order.subtotal ?? 0);
  const shipping =
    typeof order.shipping === "string"
      ? parseFloat(order.shipping) || 0
      : (order.shipping ?? 0);
  const tax =
    typeof order.tax === "string"
      ? parseFloat(order.tax) || 0
      : (order.tax ?? 0);
  const calculatedTotal = subtotal + shipping + tax;

  return {
    id: order.id || order.orderNumber || "",
    orderNumber: order.orderNumber || "",
    customerName: order.customerName || "Not Specified",
    customerEmail: order.customerEmail || "",
    customerPhone: order.customerPhone || "",
    status: normalizeOrderStatus(order.status),
    items: Array.isArray(order.items)
      ? order.items.map((item): OrderItem => ({
        id: item.id || "",
        productId: item.productId || "",
        name: item.name || item.productName || "",
        productName: item.productName || item.name || "",
        price:
          typeof item.price === "string"
            ? parseFloat(item.price) || null
            : (item.price ?? null),
        quantity: item.quantity || 0,
        total:
          typeof item.total === "string"
            ? parseFloat(item.total) || null
            : (item.total ?? null),
        confidence: item.confidence || item.metadata?.confidence,
        metadata: item.metadata || {},
        quantityOffer: item.quantityOffer || undefined,
      }))
      : [],
    subtotal,
    tax,
    shipping,
    total:
      calculatedTotal ||
      (typeof order.total === "string"
        ? parseFloat(order.total) || 0
        : (order.total ?? 0)),
    paymentMethod: order.paymentMethod || "",
    paymentStatus: normalizePaymentStatus(order.paymentStatus, isGuestOrder),
    shippingAddress: isRecord(order.shippingAddress)
      ? {
          city:
            typeof order.shippingAddress.city === "string"
              ? order.shippingAddress.city
              : "",
          governorate:
            order.governorate ||
            (typeof order.shippingAddress.governorate === "string"
              ? order.shippingAddress.governorate
              : ""),
          country:
            typeof order.shippingAddress.country === "string"
              ? order.shippingAddress.country
              : "",
        }
      : {
          city: order.city || "",
          governorate: order.governorate || "",
          country: "",
        },
    trackingNumber: order.trackingNumber || undefined,
    notes: order.notes || "",
    createdAt: order.createdAt || new Date().toISOString(),
    conversationId: order.conversationId || undefined,
    updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
    // Enhanced fields
    confidence: order.confidence || order.metadata?.confidence,
    extractionMethod:
      order.extractionMethod || order.metadata?.extractionMethod,
    customer: order.customer,
    conversation: order.conversation,
    metadata: order.metadata || {},
    // Scheduled order fields
    isScheduled: order.isScheduled,
    scheduledDeliveryDate: order.scheduledDeliveryDate,
    scheduledNotes: order.scheduledNotes,
    isViewed: order.isViewed ?? true, // Default to true if missing
    governorate: order.governorate || "",
    sourceType: order.sourceType || "",
    affiliateId: order.affiliateId || undefined,
    affiliate: order.affiliate,
    merchantOrder: order.merchantOrder,
  };
};

const ORDER_TABLE_COLUMNS = [
  "orderNumber",
  "customer",
  "amount",
  "status",
  "payment",
  "date",
  "actions",
] as const;
type OrderTableColumn = (typeof ORDER_TABLE_COLUMNS)[number];
const ORDER_TABLE_COLUMN_SET = new Set<string>(ORDER_TABLE_COLUMNS);

const normalizeOrderTableColumns = (value: unknown): OrderTableColumn[] => {
  if (!Array.isArray(value)) return ORDER_TABLE_COLUMNS;
  const filtered = value.filter(
    (col): col is OrderTableColumn =>
      typeof col === "string" && ORDER_TABLE_COLUMN_SET.has(col),
  );
  if (filtered.length === 0) return ORDER_TABLE_COLUMNS;
  if (!filtered.includes("orderNumber")) {
    filtered.unshift("orderNumber");
  }
  return filtered as OrderTableColumn[];
};

const getOrderAmount = (order: Order) => {
  const subtotal = typeof order.subtotal === "number" ? order.subtotal : 0;
  const shipping = typeof order.shipping === "number" ? order.shipping : 0;
  const tax = typeof order.tax === "number" ? order.tax : 0;

  return subtotal + shipping + tax || order.total || 0;
};

const getOrdersLoadErrorMessage = (error: unknown) => {
  const apiError = error as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
  };

  if (apiError?.response?.status && apiError.response.status >= 500) {
    return "تعذر تحميل الطلبات من الخادم حالياً";
  }

  if (apiError?.message?.includes("Network")) {
    return "تعذر الاتصال بالخادم لتحميل الطلبات";
  }

  return (
    apiError?.response?.data?.message ||
    apiError?.message ||
    "تعذر تحميل الطلبات الآن، حاول مرة أخرى"
  );
};

const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (
    isRecord(error) &&
    "response" in error &&
    isRecord(error.response) &&
    "data" in error.response &&
    isRecord(error.response.data)
  ) {
    if (typeof error.response.data.message === "string") {
      return error.response.data.message;
    }

    if (typeof error.response.data.error === "string") {
      return error.response.data.error;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

const ORDERS_LIST_STORAGE_KEY = "orders:list:view-state:v1";
const DEFAULT_ORDERS_FILTERS: OrdersFilters = {
  status: "",
  paymentStatus: "",
  sourceType: "",
  merchantId: "",
  affiliateId: "",
  fulfillmentSource: "",
  merchantOperationStatus: "",
  merchantSettlementStatus: "",
  search: "",
  startDate: "",
  endDate: "",
  extractionMethod: "",
  minConfidence: "",
  onlyUnseen: false,
  timeRange: "",
};
const ORDERS_LIST_QUERY_KEYS = [
  "page",
  "limit",
  "status",
  "paymentStatus",
  "sourceType",
  "merchantId",
  "affiliateId",
  "fulfillmentSource",
  "merchantOperationStatus",
  "merchantSettlementStatus",
  "search",
  "startDate",
  "endDate",
  "extractionMethod",
  "minConfidence",
  "onlyUnseen",
  "timeRange",
] as const;

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const EMPTY_MERCHANT_OPERATIONS_TOTALS: MerchantOperationsTotals = {
  assignedOrdersCount: 0,
  assignedPieces: 0,
  preparationOrdersCount: 0,
  preparationPieces: 0,
  inShippingOrdersCount: 0,
  inShippingPieces: 0,
  deliveredOrdersCount: 0,
  deliveredPieces: 0,
  notDeliveredOrdersCount: 0,
  notDeliveredPieces: 0,
  payablePieces: 0,
  pendingPayablePieces: 0,
  expectedReceivableAmount: 0,
  inShippingAmount: 0,
  deliveredPayableAmount: 0,
  notDeliveredAmount: 0,
  shippingCostAmount: 0,
  confirmedCommissionAmount: 0,
  pendingCommissionAmount: 0,
  paidAmount: 0,
};

const formatMerchantPieces = (value: string | number | undefined | null) =>
  Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 0,
  });

const payoutStatusLabels: Record<string, string> = {
  PENDING: "قيد مراجعة الشركة",
  PROCESSED: "تم التحويل",
  FAILED: "فشل التحويل",
  CANCELLED: "ملغي",
};

const getMerchantOperationsTotals = (
  summary?: MerchantOperationsSummary | null,
): MerchantOperationsTotals => ({
  ...EMPTY_MERCHANT_OPERATIONS_TOTALS,
  ...(summary?.summary || {}),
});

const getFiltersFromSearchParams = (searchParams: URLSearchParams): OrdersFilters => ({
  status: searchParams.get("status") || "",
  paymentStatus: searchParams.get("paymentStatus") || "",
  sourceType: searchParams.get("sourceType") || "",
  merchantId: searchParams.get("merchantId") || "",
  affiliateId: searchParams.get("affiliateId") || "",
  fulfillmentSource: searchParams.get("fulfillmentSource") || "",
  merchantOperationStatus: searchParams.get("merchantOperationStatus") || "",
  merchantSettlementStatus: searchParams.get("merchantSettlementStatus") || "",
  search: searchParams.get("search") || "",
  startDate: searchParams.get("startDate") || "",
  endDate: searchParams.get("endDate") || "",
  extractionMethod: searchParams.get("extractionMethod") || "",
  minConfidence: searchParams.get("minConfidence") || "",
  onlyUnseen: searchParams.get("onlyUnseen") === "true",
  timeRange: searchParams.get("timeRange") || "",
});

const sanitizeStoredFilters = (value: unknown): OrdersFilters => {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<OrdersFilters>)
      : {};

  return {
    status: typeof candidate.status === "string" ? candidate.status : "",
    paymentStatus:
      typeof candidate.paymentStatus === "string" ? candidate.paymentStatus : "",
    sourceType: typeof candidate.sourceType === "string" ? candidate.sourceType : "",
    merchantId: typeof candidate.merchantId === "string" ? candidate.merchantId : "",
    affiliateId: typeof candidate.affiliateId === "string" ? candidate.affiliateId : "",
    fulfillmentSource:
      typeof candidate.fulfillmentSource === "string"
        ? candidate.fulfillmentSource
        : "",
    merchantOperationStatus:
      typeof candidate.merchantOperationStatus === "string"
        ? candidate.merchantOperationStatus
        : "",
    merchantSettlementStatus:
      typeof candidate.merchantSettlementStatus === "string"
        ? candidate.merchantSettlementStatus
        : "",
    search: typeof candidate.search === "string" ? candidate.search : "",
    startDate: typeof candidate.startDate === "string" ? candidate.startDate : "",
    endDate: typeof candidate.endDate === "string" ? candidate.endDate : "",
    extractionMethod:
      typeof candidate.extractionMethod === "string"
        ? candidate.extractionMethod
        : "",
    minConfidence:
      typeof candidate.minConfidence === "string" ? candidate.minConfidence : "",
    onlyUnseen: candidate.onlyUnseen === true,
    timeRange: typeof candidate.timeRange === "string" ? candidate.timeRange : "",
  };
};

const readStoredOrdersListViewState = (): OrdersListViewState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(ORDERS_LIST_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<OrdersListViewState>;

    return {
      page: parsePositiveInt(parsedValue.page, 1),
      limit: parsePositiveInt(parsedValue.limit, 20),
      filters: sanitizeStoredFilters(parsedValue.filters),
    };
  } catch (error) {
    console.warn("Failed to restore saved orders list state:", error);
    return null;
  }
};

const hasOrdersQueryState = (searchParams: URLSearchParams) =>
  ORDERS_LIST_QUERY_KEYS.some((key) => searchParams.has(key));

const getInitialOrdersListViewState = (
  searchParams: URLSearchParams,
): OrdersListViewState => {
  if (hasOrdersQueryState(searchParams)) {
    return {
      page: parsePositiveInt(searchParams.get("page"), 1),
      limit: parsePositiveInt(searchParams.get("limit"), 20),
      filters: getFiltersFromSearchParams(searchParams),
    };
  }

  return (
    readStoredOrdersListViewState() || {
      page: 1,
      limit: 20,
      filters: DEFAULT_ORDERS_FILTERS,
    }
  );
};

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoadError, setOrdersLoadError] = useState<string | null>(null);
  const { user } = useAuth();
  const { company } = useCompany();
  const isAdmin = ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "MANAGER"].includes(
    user?.role || "",
  );
  const isMerchant = user?.role === "MERCHANT";
  const canSelectOrders = isAdmin && !isMerchant;
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialListViewState = useRef<OrdersListViewState | null>(null);
  const fetchOrdersRef = useRef<() => Promise<void>>(async () => undefined);
  if (!initialListViewState.current) {
    initialListViewState.current = getInitialOrdersListViewState(searchParams);
  }
  const restoredListViewState = initialListViewState.current!;
  const [page, setPage] = useState(restoredListViewState.page);
  const [limit, setLimit] = useState(restoredListViewState.limit);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [printingInvoices, setPrintingInvoices] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<OrderTableColumn[]>(
    ORDER_TABLE_COLUMNS,
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatusDefinition[]>(
    DEFAULT_ORDER_STATUSES,
  );
  const [paymentStatuses, setPaymentStatuses] = useState<OrderStatusDefinition[]>(
    DEFAULT_PAYMENT_STATUSES,
  );
  const [merchantOptions, setMerchantOptions] = useState<MerchantFilterOption[]>(
    [],
  );
  const [affiliateOptions, setAffiliateOptions] = useState<AffiliateFilterOption[]>(
    [],
  );
  const [merchantSettlementSummary, setMerchantSettlementSummary] =
    useState<MerchantSettlementSummary | null>(null);
  const [merchantSettlementLoading, setMerchantSettlementLoading] =
    useState(false);
  const [merchantSettlementError, setMerchantSettlementError] = useState("");

  const [filters, setFilters] = useState<OrdersFilters>(
    restoredListViewState.filters,
  );

  // Sync URL search parameters back to local filters state
  useEffect(() => {
    const newFilters = getFiltersFromSearchParams(searchParams);
    setFilters((prev) => {
      const isDifferent = Object.keys(newFilters).some(
        (key) => String(newFilters[key as keyof OrdersFilters]) !== String(prev[key as keyof OrdersFilters])
      );
      return isDifferent ? newFilters : prev;
    });

    const newPage = parsePositiveInt(searchParams.get("page"), 1);
    const newLimit = parsePositiveInt(searchParams.get("limit"), 20);
    setPage((prev) => (prev !== newPage ? newPage : prev));
    setLimit((prev) => (prev !== newLimit ? newLimit : prev));
  }, [searchParams]);

  const isTrashView = filters.status.toLowerCase() === "trash";

  useEffect(() => {
    const normalized = normalizeOrderTableColumns(
      company?.settings?.ordersTableColumns,
    );
    setVisibleColumns(normalized);
  }, [company?.settings?.ordersTableColumns]);

  const columnsToRender = ORDER_TABLE_COLUMNS.filter((col) =>
    visibleColumns.includes(col),
  );
  const tableColumnCount = (canSelectOrders ? 1 : 0) + columnsToRender.length;
  const fieldClassName =
    "theme-native-control w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-100";
  const activeCompanyAppSlugSet = useMemo(
    () =>
      new Set(
        getCurrentCompanyActiveApps(user, company)
          .map(normalizeCompanyAppSlug)
          .filter(Boolean),
      ),
    [company, user],
  );
  const hasAffiliateOperationsApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    AFFILIATE_OPERATION_APP_SLUGS,
  );
  const hasMerchantOperationsApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    MERCHANT_OPERATION_APP_SLUGS,
  );
  const merchantOperationFilterIsActive = Boolean(
    filters.merchantId ||
      filters.fulfillmentSource ||
      filters.merchantOperationStatus ||
      filters.merchantSettlementStatus,
  );
  const affiliateFilterIsActive = Boolean(filters.affiliateId);
  const canShowUnifiedOperationFilters = isAdmin && !isMerchant;
  const sourceFilterIsActive = Boolean(filters.sourceType);
  const hasOrderSourceTrackingApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_SOURCE_TRACKING_APP_SLUGS,
  );
  const showOrderSourceFilter =
    canShowUnifiedOperationFilters &&
    (hasOrderSourceTrackingApp || sourceFilterIsActive);
  const showMerchantOperationFilters =
    canShowUnifiedOperationFilters &&
    (merchantOptions.length > 0 ||
      merchantOperationFilterIsActive ||
      hasMerchantOperationsApp);
  const showAffiliateOperationFilter =
    canShowUnifiedOperationFilters &&
    (hasAffiliateOperationsApp ||
      affiliateOptions.length > 0 ||
      affiliateFilterIsActive);
  const showUnifiedOperationFilters =
    showMerchantOperationFilters || showAffiliateOperationFilter;

  useEffect(() => {
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
    };

    (Object.entries(filters) as Array<
      [keyof OrdersFilters, OrdersFilters[keyof OrdersFilters]]
    >).forEach(([key, value]) => {
      if (key === "onlyUnseen") {
        if (value) {
          params.onlyUnseen = "true";
        }
        return;
      }

      if (typeof value === "string" && value) {
        params[key] = value;
      }
    });

    setSearchParams(params, { replace: true });
  }, [filters, page, limit, setSearchParams]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        ORDERS_LIST_STORAGE_KEY,
        JSON.stringify({
          page,
          limit,
          filters,
        }),
      );
    } catch (error) {
      console.warn("Failed to persist orders list state:", error);
    }
  }, [filters, page, limit]);

  // Stats State

  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const orderStatusMap = useMemo(
    () =>
      new Map(
        orderStatuses.map((status) => [
          normalizeStatusCode(status.code),
          {
            ...status,
            code: normalizeStatusCode(status.code),
          },
        ]),
      ),
    [orderStatuses],
  );
  const paymentStatusMap = useMemo(
    () =>
      new Map(
        paymentStatuses.map((status) => [
          normalizeStatusCode(status.code),
          {
            ...status,
            code: normalizeStatusCode(status.code),
          },
        ]),
      ),
    [paymentStatuses],
  );
  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).reduce((count, [key, value]) => {
        if (key === "onlyUnseen") {
          return count + (value ? 1 : 0);
        }

        if (!value) return count;
        return count + 1;
      }, 0),
    [filters],
  );
  const advancedFilterCount = useMemo(() => {
    let count = 0;

    if (filters.status) count += 1;
    if (filters.paymentStatus) count += 1;
    if (filters.sourceType) count += 1;
    if (filters.merchantId) count += 1;
    if (filters.affiliateId) count += 1;
    if (filters.fulfillmentSource) count += 1;
    if (filters.merchantOperationStatus) count += 1;
    if (filters.merchantSettlementStatus) count += 1;
    if (filters.extractionMethod) count += 1;
    if (filters.minConfidence) count += 1;
    if (filters.timeRange || filters.startDate || filters.endDate) count += 1;

    return count;
  }, [filters]);
  const hasCustomDateFilters = Boolean(
    filters.timeRange === "custom" || filters.startDate || filters.endDate,
  );

  useEffect(() => {
    if (advancedFilterCount > 0 || hasCustomDateFilters || ordersLoadError) {
      setShowAdvancedFilters(true);
    }
  }, [advancedFilterCount, hasCustomDateFilters, ordersLoadError]);

  // Socket.IO Integration
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    let isMounted = true;

    const fetchOrderStatuses = async () => {
      try {
        const response = await apiClient.get("/order-status", {
          _skipErrorToast: true,
        });
        if (!response.data?.success) {
          return;
        }

        const mergedOrderStatuses = new Map(
          DEFAULT_ORDER_STATUSES.map((status) => [status.code, status]),
        );
        const mergedPaymentStatuses = new Map(
          DEFAULT_PAYMENT_STATUSES.map((status) => [status.code, status]),
        );

        const fetchedStatuses = Array.isArray(response.data.data)
          ? (response.data.data as Array<Partial<OrderStatusDefinition> & { statusType?: string }>)
          : [];

        fetchedStatuses.forEach((status) => {
          const normalizedCode = normalizeStatusCode(status?.code);
          if (!normalizedCode) return;

          const def: OrderStatusDefinition = {
            ...status,
            code: normalizedCode,
            name: typeof status.name === "string" ? status.name : normalizedCode,
          };

          if (status.statusType === "payment") {
            mergedPaymentStatuses.set(normalizedCode, def);
          } else {
            mergedOrderStatuses.set(normalizedCode, def);
          }
        });

        if (isMounted) {
          setOrderStatuses(Array.from(mergedOrderStatuses.values()));
          setPaymentStatuses(Array.from(mergedPaymentStatuses.values()));
        }
      } catch (error) {
        console.error("Failed to fetch order and payment statuses for list view:", error);
      }
    };

    fetchOrderStatuses();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin || isMerchant) {
      setMerchantOptions([]);
      setAffiliateOptions([]);
      return;
    }

    let isMounted = true;

    const fetchUnifiedOperationOptions = async () => {
      const [merchantsResult, affiliatesResult] = await Promise.allSettled([
        apiClient.get<{ success: boolean; data?: MerchantFilterOption[] }>(
          "/merchants",
          { _skipErrorToast: true },
        ),
        apiClient.get<{ success: boolean; data?: AffiliateFilterOption[] }>(
          "/affiliates/list",
          { _skipErrorToast: true },
        ),
      ]);

      if (!isMounted) return;

      setMerchantOptions(
        merchantsResult.status === "fulfilled" &&
          merchantsResult.value.data.success &&
          Array.isArray(merchantsResult.value.data.data)
          ? merchantsResult.value.data.data
          : [],
      );
      setAffiliateOptions(
        affiliatesResult.status === "fulfilled" &&
          affiliatesResult.value.data.success &&
          Array.isArray(affiliatesResult.value.data.data)
          ? affiliatesResult.value.data.data
          : [],
      );

      if (
        merchantsResult.status === "rejected" ||
        affiliatesResult.status === "rejected"
      ) {
        console.warn("Failed to load some unified order operation filters:", {
          merchantsError:
            merchantsResult.status === "rejected"
              ? merchantsResult.reason
              : undefined,
          affiliatesError:
            affiliatesResult.status === "rejected"
              ? affiliatesResult.reason
              : undefined,
        });
      }
    };

    void fetchUnifiedOperationOptions();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, isMerchant]);

  useEffect(() => {
    if (!isAdmin || isMerchant || !filters.merchantId) {
      setMerchantSettlementSummary(null);
      setMerchantSettlementError("");
      setMerchantSettlementLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMerchantSettlementSummary = async () => {
      try {
        setMerchantSettlementLoading(true);
        setMerchantSettlementError("");
        const response = await apiClient.get<{
          success?: boolean;
          data?: MerchantSettlementSummary;
          message?: string;
        }>(`/merchants/${filters.merchantId}/settlement-summary`, {
          _skipErrorToast: true,
        });

        if (!isMounted) return;

        if (response.data?.success && response.data.data) {
          setMerchantSettlementSummary(response.data.data);
        } else {
          setMerchantSettlementSummary(null);
          setMerchantSettlementError(
            response.data?.message || "تعذر تحميل ملخص تسوية التاجر",
          );
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        console.warn("Failed to load merchant settlement summary:", error);
        setMerchantSettlementSummary(null);
        setMerchantSettlementError(
          getApiErrorMessage(error, "تعذر تحميل ملخص تسوية التاجر"),
        );
      } finally {
        if (isMounted) {
          setMerchantSettlementLoading(false);
        }
      }
    };

    void fetchMerchantSettlementSummary();

    return () => {
      isMounted = false;
    };
  }, [filters.merchantId, isAdmin, isMerchant]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new orders
    const handleNewOrder = (newOrder: RawOrder) => {
      if (page === 1) {
        setOrders((prev) => {
          if (prev.find((o) => o.orderNumber === newOrder.orderNumber))
            return prev;
          return [transformOrder(newOrder), ...prev];
        });
        setTotalOrders((prev) => prev + 1);
      }
    };

    // Listen for order updates
    const handleOrderUpdate = (updatedData: SocketOrderUpdate) => {
      if (updatedData._refetch) {
        void fetchOrdersRef.current();
        return;
      }

      setOrders((prev) =>
        prev.map((order) => {
          if (order.orderNumber === updatedData.orderNumber) {
            // Check if we need to full transform again or merge
            // ideally we just merge, but if the update lacks fields, be careful.
            return { ...order, ...updatedData };
          }
          return order;
        }),
      );
    };

    // Listen for bulk updates
    const handleBulkUpdate = () => {
      void fetchOrdersRef.current();
    };

    const handleBulkDelete = () => {
      void fetchOrdersRef.current();
    };

    socket.on("order:created", handleNewOrder);
    socket.on("order:updated", handleOrderUpdate);
    socket.on("order:updated_bulk", handleBulkUpdate);
    socket.on("order:deleted_bulk", handleBulkDelete);

    return () => {
      socket.off("order:created", handleNewOrder);
      socket.off("order:updated", handleOrderUpdate);
      socket.off("order:updated_bulk", handleBulkUpdate);
      socket.off("order:deleted_bulk", handleBulkDelete);
    };
  }, [socket, isConnected, page]);

  useEffect(() => {
    void fetchOrdersRef.current();
  }, [page, limit, filters]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setOrdersLoadError(null);

      // Merchants use the same core Orders screen, scoped by the simple orders API.
      const usesUnifiedOperationFilters = Boolean(
        filters.merchantId ||
          filters.affiliateId ||
          filters.fulfillmentSource ||
          filters.merchantOperationStatus ||
          filters.merchantSettlementStatus,
      );
      const useEnhanced =
        !isMerchant &&
        !usesUnifiedOperationFilters &&
        (filters.extractionMethod || filters.minConfidence);

      if (useEnhanced) {
        // Use enhanced orders API with apiClient
        const queryParams = {
          page: page.toString(),
          limit: limit.toString(),
          ...(filters.status && { status: filters.status.toUpperCase() }),
          ...(filters.paymentStatus && {
            paymentStatus: filters.paymentStatus.toUpperCase(),
          }),
          ...(filters.sourceType && { sourceType: filters.sourceType }),
          ...(filters.search && { search: filters.search }),
          ...(filters.extractionMethod && {
            extractionMethod: filters.extractionMethod,
          }),
          ...(filters.minConfidence && {
            minConfidence: filters.minConfidence,
          }),
          ...(filters.startDate && { dateFrom: filters.startDate }),
          ...(filters.endDate && { dateTo: filters.endDate }),
          ...(filters.onlyUnseen && { onlyUnseen: "true" }),
        };

        const response = await apiClient.get("/orders-enhanced", {
          params: queryParams,
          _skipErrorToast: true,
        });

        const data = response.data;

        if (data.success) {
          const transformedOrders = (
            Array.isArray(data.data) ? data.data : []
          ).map(transformOrder);
          const nextTotalPages = Math.max(
            Number(data.pagination?.pages) || 0,
            transformedOrders.length > 0 ? 1 : 0,
          );
          const nextTotalOrders =
            Number(data.pagination?.total) || transformedOrders.length;

          if (nextTotalOrders === 0 && page !== 1) {
            setOrders([]);
            setTotalPages(0);
            setTotalOrders(0);
            setSelectedOrders([]);
            setPage(1);
            return;
          }

          if (nextTotalPages > 0 && page > nextTotalPages) {
            setTotalPages(nextTotalPages);
            setTotalOrders(nextTotalOrders);
            setSelectedOrders([]);
            setPage(nextTotalPages);
            return;
          }

          setOrders(transformedOrders);
          setTotalPages(nextTotalPages);
          setTotalOrders(nextTotalOrders);
          setSelectedOrders([]);
          setOrdersLoadError(null);
        } else {
          console.error("Failed to fetch enhanced orders:", data.message);
          setOrdersLoadError("تعذر تحميل الطلبات حالياً");
        }
      } else {
        // Use simple orders API
        const queryParams: Record<string, string> = {
          page: page.toString(),
          limit: limit.toString(),
        };

        if (filters.status) queryParams.status = filters.status;
        if (filters.paymentStatus)
          queryParams.paymentStatus = filters.paymentStatus;
        if (filters.sourceType) queryParams.sourceType = filters.sourceType;
        if (filters.merchantId) queryParams.merchantId = filters.merchantId;
        if (filters.affiliateId) queryParams.affiliateId = filters.affiliateId;
        if (filters.fulfillmentSource)
          queryParams.fulfillmentSource = filters.fulfillmentSource;
        if (filters.merchantOperationStatus)
          queryParams.merchantOperationStatus = filters.merchantOperationStatus;
        if (filters.merchantSettlementStatus)
          queryParams.merchantSettlementStatus = filters.merchantSettlementStatus;
        if (filters.search) queryParams.search = filters.search;
        if (filters.startDate) queryParams.startDate = filters.startDate;
        if (filters.endDate) queryParams.endDate = filters.endDate;
        if (filters.onlyUnseen) queryParams.onlyUnseen = "true";

        const response = await apiClient.get("/orders-new/simple", {
          params: queryParams,
          _skipErrorToast: true,
        });

        const data = response.data;

        if (data.success) {
          const transformedOrders = (
            Array.isArray(data.data) ? data.data : []
          ).map(transformOrder);
          const nextTotalPages = Math.max(
            Number(data.pagination?.pages) || 0,
            transformedOrders.length > 0 ? 1 : 0,
          );
          const nextTotalOrders =
            Number(data.pagination?.total) || transformedOrders.length;

          if (nextTotalOrders === 0 && page !== 1) {
            setOrders([]);
            setTotalPages(0);
            setTotalOrders(0);
            setSelectedOrders([]);
            setPage(1);
            return;
          }

          if (nextTotalPages > 0 && page > nextTotalPages) {
            setTotalPages(nextTotalPages);
            setTotalOrders(nextTotalOrders);
            setSelectedOrders([]);
            setPage(nextTotalPages);
            return;
          }

          setOrders(transformedOrders);
          setTotalPages(nextTotalPages);
          setTotalOrders(nextTotalOrders);
          setSelectedOrders([]);
          setOrdersLoadError(null);
        } else {
          console.error("Failed to fetch orders:", data.message);
          setOrdersLoadError("تعذر تحميل الطلبات حالياً");
        }
      }
    } catch (error: unknown) {
      console.error("Error fetching orders:", error);
      if (
        isRecord(error) &&
        "response" in error &&
        isRecord(error.response) &&
        "data" in error.response &&
        isRecord(error.response.data) &&
        typeof error.response.data.message === "string"
      ) {
        console.error("Error message:", error.response.data.message);
      }
      setOrdersLoadError(getOrdersLoadErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [filters, isMerchant, limit, page]);

  fetchOrdersRef.current = fetchOrders;

  const getCustomerDisplayName = (order: Order) => {
    if (order.customer) {
      const fullName =
        `${order.customer.firstName} ${order.customer.lastName}`.trim();
      if (
        fullName !== "New Customer" &&
        fullName !== "Customer Not Specified" &&
        fullName !== "Customer"
      ) {
        return fullName;
      }
    }

    if (
      order.customerName &&
      !order.customerName.match(/^\d+/) &&
      order.customerName !== "New Customer" &&
      order.customerName !== "Customer Not Specified" &&
      order.customerName !== "Customer" &&
      order.customerName.length > 2
    ) {
      return order.customerName;
    }

    if (order.customerName && order.customerName.match(/^\d+/)) {
      return `${t("orders.facebookCustomer")} (${order.customerName.substring(0, 8)}...)`;
    }

    if (order.customerPhone) {
      return `${t("orders.customer")} (${order.customerPhone})`;
    }

    if (order.conversationId) {
      return `${t("orders.customerFromConversation")} (${order.conversationId.substring(0, 8)}...)`;
    }

    return order.customerName || t("orders.notSpecifiedCustomer");
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "bg-gray-100 text-gray-800";
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return <InformationCircleIcon className="h-3 w-3" />;
    if (confidence >= 0.8) return <StarIcon className="h-3 w-3" />;
    if (confidence >= 0.6) return <InformationCircleIcon className="h-3 w-3" />;
    return <ExclamationTriangleIcon className="h-3 w-3" />;
  };

  const getRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      // أقل من دقيقة
      if (diffInSeconds < 60) {
        return t("orders.justNow") || "منذ لحظات";
      }

      // أقل من ساعة (دقائق)
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `منذ ${minutes} ${minutes === 1 ? "دقيقة" : minutes === 2 ? "دقيقتين" : "دقائق"}`;
      }

      // أقل من 24 ساعة (ساعات)
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `منذ ${hours} ${hours === 1 ? "ساعة" : hours === 2 ? "ساعتين" : "ساعات"}`;
      }

      // أقل من 48 ساعة (أمس)
      if (diffInSeconds < 172800) {
        return "أمس";
      }

      // أكثر من يومين - عرض التاريخ العادي
      return formatDate(dateString);
    } catch (e) {
      return formatDate(dateString);
    }
  };

  const setQuickDate = (range: string) => {
    const now = new Date();
    let startDate: string = "";
    let endDate: string = "";

    if (range === "custom") {
      setShowAdvancedFilters(true);
      setFilters((prev) => ({ ...prev, timeRange: "custom" }));
      return;
    }

    switch (range) {
      case "today":
        startDate = format(now, "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "yesterday": {
        const yesterday = subDays(now, 1);
        startDate = format(yesterday, "yyyy-MM-dd");
        endDate = format(yesterday, "yyyy-MM-dd");
        break;
      }
      case "last7":
        startDate = format(subDays(now, 7), "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "last30":
        startDate = format(subDays(now, 30), "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "thisMonth":
        startDate = format(
          new Date(now.getFullYear(), now.getMonth(), 1),
          "yyyy-MM-dd",
        );
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "":
      case "clear":
        startDate = "";
        endDate = "";
        break;
      default:
        return;
    }

    setFilters((prev) => ({
      ...prev,
      startDate,
      endDate,
      timeRange: range === "clear" ? "" : range,
    }));
    setPage(1);
  };

  const clearAdvancedFilters = () => {
    setFilters((prev) => ({
      ...prev,
      status: "",
      paymentStatus: "",
      sourceType: "",
      merchantId: "",
      affiliateId: "",
      fulfillmentSource: "",
      merchantOperationStatus: "",
      merchantSettlementStatus: "",
      startDate: "",
      endDate: "",
      extractionMethod: "",
      minConfidence: "",
      timeRange: "",
    }));
    setPage(1);
  };

  const handleFilterChange = <K extends keyof OrdersFilters>(
    key: K,
    value: OrdersFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  };

  const toggleOrderSelection = (orderNumber: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderNumber)
        ? prev.filter((id) => id !== orderNumber)
        : [...prev, orderNumber],
    );
  };

  const toggleAllSelection = () => {
    if (orders.every((o) => selectedOrders.includes(o.orderNumber))) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((o) => o.orderNumber));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (!newStatus) return;
    const normalizedStatus = normalizeStatusCode(newStatus);
    let notes = "";

    if (isCancellationStatus(normalizedStatus)) {
      const cancellationReason = window.prompt(
        t("orders.cancellationReasonPrompt"),
      );
      if (cancellationReason === null) return;

      notes = cancellationReason.trim();
      if (!notes) {
        alert(t("orders.cancellationReasonRequired"));
        return;
      }
    }

    if (
      !window.confirm(
        t("orders.confirmBulkUpdate", {
          count: selectedOrders.length,
          status: getStatusText(normalizedStatus),
        }),
      )
    )
      return;

    try {
      setBulkProcessing(true);
      const response = await apiClient.post("/orders-new/bulk/status", {
        orderIds: selectedOrders,
        status: normalizedStatus,
        notes,
      });

      const data = response.data;

      if (data.success) {
        alert(t("orders.ordersUpdated"));
        await fetchOrders();
        setSelectedOrders([]);
      } else {
        alert(data.message || t("orders.updateFailed"));
      }
    } catch (error: unknown) {
      console.error("Error bulk updating:", error);
      const errorMessage = getApiErrorMessage(
        error,
        t("orders.bulkUpdateError"),
      );
      alert(t("orders.updateFailedMsg", { error: errorMessage }));
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    const confirmKey = isTrashView
      ? "orders.confirmBulkPermanentDelete"
      : "orders.confirmBulkDelete";
    const successKey = isTrashView
      ? "orders.ordersPermanentlyDeleted"
      : "orders.ordersDeleted";
    const failedKey = isTrashView
      ? "orders.permanentDeleteFailed"
      : "orders.deleteFailed";
    const errorKey = isTrashView
      ? "orders.bulkPermanentDeleteError"
      : "orders.bulkDeleteError";
    const failedMessageKey = isTrashView
      ? "orders.permanentDeleteFailedMsg"
      : "orders.deleteFailedMsg";

    if (
      !window.confirm(
        t(confirmKey, { count: selectedOrders.length }),
      )
    )
      return;

    try {
      setBulkProcessing(true);
      const response = await apiClient.post("/orders-new/bulk/delete", {
        orderIds: selectedOrders,
        permanent: isTrashView,
      });

      const data = response.data;

      if (data.success) {
        alert(t(successKey));
        await fetchOrders();
        setSelectedOrders([]);
      } else {
        alert(data.message || t(failedKey));
      }
    } catch (error: unknown) {
      console.error("Error bulk deleting:", error);
      const errorMessage = getApiErrorMessage(
        error,
        t(errorKey),
      );
      alert(t(failedMessageKey, { error: errorMessage }));
    } finally {
      setBulkProcessing(false);
    }
  };

  const [selectedInvoice, setSelectedInvoice] =
    useState<GeneratedInvoice | null>(null);

  const handleBulkPrintInvoices = async () => {
    if (selectedOrders.length === 0) {
      alert("الرجاء اختيار طلبات أولاً");
      return;
    }

    // للطباعة الجماعية، نفتح صفحة منفصلة
    if (selectedOrders.length > 1) {
      if (!window.confirm(`هل تريد طباعة فواتير ${selectedOrders.length} طلب؟`))
        return;

      try {
        setPrintingInvoices(true);
        const response = await apiClient.post("/order-invoices/bulk-generate", {
          orderIds: selectedOrders,
        });

        if (response.data.success) {
          const { success, existing, failed, invoices } = response.data.data;

          if (invoices && invoices.length > 0) {
            const invoiceIds = (invoices as GeneratedInvoice[]).map(
              (invoice) => invoice.id,
            );
            const printUrl = `/orders/invoices/print-multiple?ids=${invoiceIds.join(",")}`;
            window.open(printUrl, "_blank");
          }

          alert(
            `✅ تم إنشاء ${success.length} فاتورة جديدة\n📋 ${existing.length} فاتورة موجودة\n❌ ${failed.length} فشلت`,
          );
          setSelectedOrders([]);
        }
      } catch (error: unknown) {
        console.error("Error bulk printing invoices:", error);
        alert("خطأ في طباعة الفواتير");
      } finally {
        setPrintingInvoices(false);
      }
    } else {
      // لفاتورة واحدة، نعرضها في modal
      try {
        setPrintingInvoices(true);
        const response = await apiClient.post("/order-invoices/bulk-generate", {
          orderIds: selectedOrders,
        });

        if (response.data.success) {
          const { invoices } = response.data.data as {
            invoices?: GeneratedInvoice[];
          };

          if (invoices && invoices.length > 0) {
            setSelectedInvoice(invoices[0]);
          }
        }
      } catch (error: unknown) {
        console.error("Error generating invoice:", error);
        alert("خطأ في توليد الفاتورة");
      } finally {
        setPrintingInvoices(false);
      }
    }
  };

  const handleBulkCreateTurboShipments = async () => {
    if (
      !window.confirm(
        t("orders.confirmTurboShipments", { count: selectedOrders.length }),
      )
    )
      return;

    try {
      setBulkProcessing(true);
      const response = await apiClient.post("/turbo/bulk/create-shipments", {
        orderIds: selectedOrders,
      });

      if (response.data.success) {
        const { success, failed, skipped } = response.data.data;
        let message = t("orders.shipmentsCreated", { success });
        if (failed > 0)
          message += `\n${t("orders.shipmentsFailed", { failed })}`;
        if (skipped > 0)
          message += `\n${t("orders.shipmentsSkipped", { skipped })}`;
        alert(message);
        setSelectedOrders([]);
        await fetchOrders();
      }
    } catch (error: unknown) {
      console.error("Error bulk creating shipments:", error);
      alert(getApiErrorMessage(error, t("orders.createShipmentsFailed")));
    } finally {
      setBulkProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (normalizeStatusCode(status)) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "SCHEDULED":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "PROCESSING":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400";
      case "SHIPPED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "DELIVERED":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "DUPLICATE_ORDER":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400";
      case "TRASH":
      case "TRASH_ORDER":
        return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    const normalizedStatus = normalizeStatusCode(status);
    const configuredStatus = orderStatusMap.get(normalizedStatus);
    if (configuredStatus?.name) {
      return configuredStatus.name;
    }

    switch (normalizedStatus) {
      case "PENDING":
        return t("orders.pending");
      case "CONFIRMED":
        return t("orders.confirmed");
      case "SCHEDULED":
        return "مجدول";
      case "PROCESSING":
        return t("orders.processing");
      case "SHIPPED":
        return t("orders.shipped");
      case "DELIVERED":
        return t("orders.delivered");
      case "CANCELLED":
        return t("orders.cancelled");
      case "DUPLICATE_ORDER":
        return t("orders.duplicate");
      case "TRASH":
      case "TRASH_ORDER":
        return "سلة المحذوفات";
      default:
        return status;
    }
  };

  const getStatusBadgeStyle = (status: string): React.CSSProperties | undefined => {
    const configuredColor = orderStatusMap.get(
      normalizeStatusCode(status),
    )?.color;

    if (!configuredColor) {
      return undefined;
    }

    return {
      backgroundColor: `${configuredColor}20`,
      color: configuredColor,
      border: `1px solid ${configuredColor}`,
    };
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "pending":
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "failed":
        return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "unavailable":
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const getPaymentStatusText = (status: string) => {
    const normalizedStatus = normalizeStatusCode(status);
    const configuredStatus = paymentStatusMap.get(normalizedStatus);
    if (configuredStatus?.name) {
      return configuredStatus.name;
    }

    switch (normalizedStatus) {
      case "COMPLETED":
      case "PAID":
        return t("orders.completed");
      case "PENDING":
        return t("orders.pendingPayment");
      case "FAILED":
        return t("orders.failed");
      case "UNAVAILABLE":
        return t("orders.notSpecified");
      default:
        return status;
    }
  };

  const getPaymentStatusBadgeStyle = (status: string): React.CSSProperties | undefined => {
    const configuredColor = paymentStatusMap.get(
      normalizeStatusCode(status),
    )?.color;

    if (!configuredColor) {
      return undefined;
    }

    return {
      backgroundColor: `${configuredColor}20`,
      color: configuredColor,
      border: `1px solid ${configuredColor}`,
    };
  };

  const filterableOrderStatuses = useMemo(() => {
    const list = orderStatuses.filter((s) => normalizeStatusCode(s.code) !== "TRASH");
    const activeFilter = normalizeStatusCode(filters.status);
    if (activeFilter && activeFilter !== "TRASH" && activeFilter !== "TRASH_ORDER") {
      const exists = list.some((s) => normalizeStatusCode(s.code) === activeFilter);
      if (!exists) {
        list.push({
          code: activeFilter,
          name: getStatusText(activeFilter),
        });
      }
    }
    return list;
  }, [orderStatuses, filters.status]);

  const filterablePaymentStatuses = useMemo(() => {
    const list = [...paymentStatuses];
    const activeFilter = normalizeStatusCode(filters.paymentStatus);
    if (activeFilter) {
      const exists = list.some((s) => normalizeStatusCode(s.code) === activeFilter);
      if (!exists) {
        list.push({
          code: activeFilter,
          name: getPaymentStatusText(activeFilter.toLowerCase()),
        });
      }
    }
    return list;
  }, [paymentStatuses, filters.paymentStatus]);

  const bulkUpdatableStatuses = useMemo(() => {
    return orderStatuses.filter(
      (s) => {
        const code = normalizeStatusCode(s.code);
        return code !== "TRASH" && code !== "DRAFT";
      }
    );
  }, [orderStatuses]);

  const getOrderSourceText = (order: Order) => {
    if (order.extractionMethod === "ai_enhanced") return t("orders.enhancedExtraction");
    if (order.extractionMethod === "ai_basic") return t("orders.basicExtraction");
    if (order.extractionMethod === "manual") return t("orders.manual");
    if (typeof order.metadata?.source === "string" && order.metadata.source) {
      return order.metadata.source;
    }
    return t("orders.notSpecified");
  };

  const getAffiliateDisplayName = (affiliate?: AffiliateFilterOption) => {
    if (!affiliate) return "";
    const userName = `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim();
    return (
      userName ||
      affiliate.affiliateCode ||
      affiliate.user?.email ||
      affiliate.id
    );
  };

  const getFulfillmentSourceText = (source?: string | null) => {
    switch (String(source || "").toUpperCase()) {
      case "COMPANY_WAREHOUSE":
        return "من مخزن الشركة";
      case "MERCHANT":
        return "من عند التاجر";
      default:
        return "";
    }
  };

  const renderMerchantSettlementPanel = () => {
    if (!isAdmin || isMerchant || !filters.merchantId) {
      return null;
    }

    const selectedMerchant = merchantSettlementSummary?.merchant;
    const selectedMerchantOption = merchantOptions.find(
      (merchantOption) => merchantOption.id === filters.merchantId,
    );
    const merchantName =
      selectedMerchant?.name ||
      selectedMerchantOption?.name ||
      selectedMerchant?.email ||
      selectedMerchantOption?.email ||
      "التاجر المحدد";

    if (merchantSettlementLoading) {
      return (
        <section className="mb-4 rounded-[26px] border border-slate-200/70 bg-white/88 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/72">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </section>
      );
    }

    if (merchantSettlementError) {
      return (
        <section className="mb-4 rounded-[26px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{merchantSettlementError}</span>
            <Link
              to={`/merchants/${filters.merchantId}`}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-200"
            >
              فتح ملف التاجر
            </Link>
          </div>
        </section>
      );
    }

    if (!merchantSettlementSummary) {
      return null;
    }

    const operationsTotals = getMerchantOperationsTotals(
      merchantSettlementSummary.operationsSummary,
    );
    const inventorySummary = merchantSettlementSummary.inventorySummary || {};
    const payoutBalances = merchantSettlementSummary.payoutSummary?.balances || {};
    const pendingPayouts =
      merchantSettlementSummary.payoutSummary?.payouts?.filter(
        (payout) => String(payout.status).toUpperCase() === "PENDING",
      ) || [];
    const fulfillmentLabel = getFulfillmentSourceText(
      selectedMerchant?.fulfillmentMode,
    ) || selectedMerchant?.fulfillmentMode || "تنفيذ التاجر";

    const metricCards = [
      {
        label: "قابل للسحب الآن",
        value: formatPrice(payoutBalances.availableAmount || 0),
        subValue: `${formatMerchantPieces(payoutBalances.availableCommissionsCount)} طلب مسلم`,
        icon: BanknotesIcon,
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
      },
      {
        label: "قيد طلب سحب",
        value: formatPrice(payoutBalances.pendingPayoutAmount || 0),
        subValue: `${formatMerchantPieces(pendingPayouts.length)} طلب سحب مفتوح`,
        icon: ClockIcon,
        className:
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
      },
      {
        label: "تم تحويله",
        value: formatPrice(payoutBalances.paidAmount || 0),
        subValue: "مدفوع ومقفل",
        icon: CheckCircleIcon,
        className:
          "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
      },
      {
        label: "في الشحن",
        value: formatPrice(operationsTotals.inShippingAmount),
        subValue: `${formatMerchantPieces(operationsTotals.inShippingPieces)} قطعة معلقة`,
        icon: TruckIcon,
        className:
          "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100",
      },
      {
        label: "رصيد قابل للبيع",
        value: `${formatMerchantPieces(inventorySummary.availableForSale)} قطعة`,
        subValue: `محجوز ${formatMerchantPieces(inventorySummary.reservedQuantity)} قطعة`,
        icon: CubeIcon,
        className:
          "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-100",
      },
      {
        label: "تم التسليم",
        value: `${formatMerchantPieces(operationsTotals.deliveredOrdersCount)} طلب`,
        subValue: `${formatMerchantPieces(operationsTotals.payablePieces)} قطعة مستحقة`,
        icon: CheckCircleIcon,
        className:
          "border-emerald-200 bg-white text-emerald-900 dark:border-emerald-500/20 dark:bg-slate-900 dark:text-emerald-100",
      },
      {
        label: "مرتجع أو لم يسلم",
        value: `${formatMerchantPieces(operationsTotals.notDeliveredOrdersCount)} طلب`,
        subValue: formatPrice(operationsTotals.notDeliveredAmount),
        icon: ExclamationTriangleIcon,
        className:
          "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100",
      },
    ];

    return (
      <section className="mb-4 rounded-[26px] border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/72">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                <BanknotesIcon className="h-4 w-4" />
                تسوية التاجر
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {fulfillmentLabel}
              </span>
              {inventorySummary.stockLocationLabel ? (
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                  {inventorySummary.stockLocationLabel}
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              {merchantName}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              نفس شاشة الطلبات تعرض الرصيد المالي، حالة التشغيل، والمخزون المتبقي للتاجر المحدد.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                handleFilterChange("merchantOperationStatus", "");
                handleFilterChange("merchantSettlementStatus", "");
              }}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              كل طلبات التاجر
            </button>
            <button
              type="button"
              onClick={() => {
                handleFilterChange("merchantOperationStatus", "DELIVERED");
                handleFilterChange("merchantSettlementStatus", "PAYABLE");
              }}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              الطلبات المستحقة
            </button>
            <Link
              to={`/merchants/${filters.merchantId}`}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              ملف التاجر
            </Link>
            <Link
              to="/inventory"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200"
            >
              المخزون
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-2xl border p-3 ${card.className}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{card.label}</p>
                  <Icon className="h-4 w-4 opacity-70" />
                </div>
                <p className="mt-2 text-lg font-black">{card.value}</p>
                <p className="mt-1 text-[11px] opacity-75">{card.subValue}</p>
              </div>
            );
          })}
        </div>

        {pendingPayouts.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <span className="font-bold">
                يوجد {formatMerchantPieces(pendingPayouts.length)} طلب سحب قيد مراجعة الشركة
              </span>
              <span className="text-[11px] opacity-80">
                آخر طلب: {payoutStatusLabels[pendingPayouts[0]?.status] || pendingPayouts[0]?.status} •{" "}
                {formatPrice(Number(pendingPayouts[0]?.amount || 0))}
              </span>
            </div>
          </div>
        ) : null}
      </section>
    );
  };

  const handleUpdateStatus = async (orderNumber: string, newStatus: string) => {
    const normalizedStatus = normalizeStatusCode(newStatus);
    let notes = "";

    if (isCancellationStatus(normalizedStatus)) {
      const cancellationReason = window.prompt(
        t("orders.cancellationReasonPrompt"),
      );
      if (cancellationReason === null) return;

      notes = cancellationReason.trim();
      if (!notes) {
        alert(t("orders.cancellationReasonRequired"));
        return;
      }
    }

    try {
      const response = await apiClient.post(
        `/orders-new/simple/${orderNumber}/status`,
        {
          status: normalizedStatus,
          notes,
        },
      );
      const data = response.data;
      if (data.success) {
        const displayStatus = normalizeOrderStatus(normalizedStatus);
        setOrders(
          orders.map((order) =>
            order.orderNumber === orderNumber
              ? { ...order, status: displayStatus }
              : order,
          ),
        );
        if (selectedOrder && selectedOrder.orderNumber === orderNumber) {
          setSelectedOrder({
            ...selectedOrder,
            status: displayStatus,
          });
        }
      } else {
        alert(data.message || t("orders.statusUpdateFailed"));
      }
    } catch (error: unknown) {
      console.error("Error updating status:", error);
      const errorMessage = getApiErrorMessage(error, t("orders.updateError"));
      alert(t("orders.statusUpdateFailedMsg", { error: errorMessage }));
    }
  };

  const handleUpdatePaymentStatus = async (
    orderNumber: string,
    newStatus: string,
  ) => {
    try {
      const response = await apiClient.post(
        `/orders-new/simple/${orderNumber}/payment-status`,
        {
          paymentStatus: newStatus,
        },
      );
      const data = response.data;
      if (data.success) {
        const normalizedStatus = normalizePaymentStatus(newStatus, false);
        setOrders(
          orders.map((order) =>
            order.orderNumber === orderNumber
              ? { ...order, paymentStatus: normalizedStatus }
              : order,
          ),
        );
        if (selectedOrder && selectedOrder.orderNumber === orderNumber) {
          setSelectedOrder({
            ...selectedOrder,
            paymentStatus: normalizedStatus,
          });
        }
      } else {
        alert(data.message || t("orders.paymentStatusUpdateFailed"));
      }
    } catch (error: unknown) {
      console.error("Error updating payment status:", error);
      const errorMessage = getApiErrorMessage(
        error,
        t("orders.paymentUpdateError"),
      );
      alert(t("orders.paymentUpdateFailedMsg", { error: errorMessage }));
    }
  };

  const handleMarkAsViewed = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId || o.orderNumber === orderId
          ? { ...o, isViewed: true }
          : o,
      ),
    );
    setSelectedOrder((prev) =>
      prev && (prev.id === orderId || prev.orderNumber === orderId)
        ? { ...prev, isViewed: true }
        : prev,
    );

    try {
      await apiClient.post(`/orders-new/simple/${orderId}/viewed`);
    } catch (error) {
      console.error("Error marking order as viewed:", error);
    }
  };

  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
    if (!order.isViewed) {
      handleMarkAsViewed(order.orderNumber);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_36%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(241,245,249,0.94)_100%)] px-2 py-2 dark:bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.2),_transparent_34%),linear-gradient(180deg,_rgba(2,6,23,0.98)_0%,_rgba(15,23,42,0.98)_100%)] sm:px-4 sm:py-3 lg:px-3">
      <div className="w-full max-w-none">
        <div className="mb-3 space-y-2.5">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                  <ShoppingBagIcon className="h-4 w-4" />
                  {isMerchant ? "طلباتي" : "إدارة الطلبات"}
                </span>
                {!loading && (
                  <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
                    {totalOrders} طلب
                  </span>
                )}
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-200/70 bg-fuchsia-50/80 px-3 py-1 text-xs font-medium text-fuchsia-700 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-200">
                    <FunnelIcon className="h-3.5 w-3.5" />
                    {activeFilterCount} فلتر
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleFilterChange("status", "")}
                className={`relative inline-flex min-w-[126px] items-center justify-center rounded-[16px] px-4 py-2.5 text-sm font-semibold transition ${!filters.status || filters.status !== "trash"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-300"
                  : "border border-slate-200/70 bg-white/70 text-slate-500 hover:text-slate-800 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
              >
                {t("orders.allOrders")}
              </button>
              <button
                onClick={() => navigate("/orders/workspace")}
                className="relative inline-flex min-w-[126px] items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600"
              >
                <BriefcaseIcon className="h-4 w-4" />
                <span className="hidden sm:inline">مساحة العمل</span>
                <span className="sm:hidden">العمل</span>
              </button>
              {!isMerchant && (
                <button
                  onClick={() => handleFilterChange("status", "trash")}
                  className={`inline-flex min-w-[126px] items-center justify-center rounded-[16px] px-4 py-2.5 text-sm font-semibold transition ${filters.status === "trash"
                    ? "bg-white text-red-600 shadow-sm dark:bg-slate-800 dark:text-red-300"
                    : "border border-slate-200/70 bg-white/70 text-slate-500 hover:text-slate-800 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-100"
                    }`}
                >
                  سلة المحذوفات
                </button>
              )}
              {!loading && (
                <div className="hidden items-center gap-2 rounded-full border border-slate-200/70 bg-white/75 px-3 py-2 text-xs font-medium text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300 lg:inline-flex">
                  <span>الظاهر</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {orders.length > 0
                      ? `${(page - 1) * limit + 1}-${Math.min(page * limit, totalOrders)}`
                      : "0"}
                  </span>
                  <span>من {totalOrders}</span>
                </div>
              )}
            </div>
          </div>

          {/* Compact Filters Section */}
          <div className="rounded-[22px] border border-slate-200/70 bg-white/88 p-2 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-950/55">
            <div className="flex flex-col gap-3">
              {ordersLoadError && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-red-200/80 bg-red-50/80 px-3 py-1.5 text-[11px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                  <div className="flex min-w-0 items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{ordersLoadError}</span>
                  </div>
                  <button
                    onClick={() => fetchOrders()}
                    className="rounded-xl border border-red-200/80 px-2.5 py-1 font-semibold transition hover:bg-red-100/80 dark:border-red-500/30 dark:hover:bg-red-500/10"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                <div className="relative min-w-[200px] flex-1 lg:min-w-0">
                  <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    aria-label={String(t("orders.searchPlaceholder"))}
                    placeholder={t("orders.searchPlaceholder")}
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    className={`${fieldClassName} pr-10`}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters((prev) => !prev)}
                    className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${showAdvancedFilters
                      ? "border-fuchsia-300/80 bg-fuchsia-50/90 text-fuchsia-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-200"
                      : "border-slate-200/80 bg-white/90 text-slate-700 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                  >
                    <AdjustmentsHorizontalIcon className="h-4 w-4" />
                    <span className="whitespace-nowrap">
                      {showAdvancedFilters ? "إخفاء الفلاتر" : "الفلاتر"}
                    </span>
                    {advancedFilterCount > 0 && (
                      <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-white/90 px-1.5 py-0.5 text-[11px] font-bold text-fuchsia-700 dark:bg-slate-900/80 dark:text-fuchsia-200">
                        {advancedFilterCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      handleFilterChange("onlyUnseen", !filters.onlyUnseen)
                    }
                    className={`flex min-h-[44px] min-w-[118px] items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${filters.onlyUnseen
                      ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "border-slate-200/80 bg-white/90 text-slate-700 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                  >
                    <EyeIcon className="h-4 w-4" />
                    <span className="whitespace-nowrap">
                      {filters.onlyUnseen
                        ? t("orders.showAll")
                        : t("orders.unseen")}
                    </span>
                  </button>
                </div>
              </div>

              {!showAdvancedFilters && advancedFilterCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-300">
                  <span>تم تطبيق {advancedFilterCount} فلتر متقدم</span>
                  <button
                    type="button"
                    onClick={clearAdvancedFilters}
                    className="rounded-xl px-2.5 py-1 font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                  >
                    مسح الفلاتر
                  </button>
                </div>
              )}

              {showAdvancedFilters && (
                <div className="animate-in slide-in-from-top-2 flex flex-col gap-2.5 border-t border-slate-200/70 pt-2.5 duration-200 dark:border-slate-700/70">
                  <div className="grid gap-2.5 lg:grid-cols-4">
                    <div className="relative min-w-[130px] sm:flex-1 lg:min-w-0">
                      <FunnelIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <select
                        aria-label={String(t("orders.allDates"))}
                        value={filters.timeRange}
                        onChange={(e) => setQuickDate(e.target.value)}
                        className={`${fieldClassName} appearance-none pr-8 pl-2 text-xs sm:text-sm`}
                      >
                        <option value="">{t("orders.allDates")}</option>
                        <option value="today">{t("orders.today")}</option>
                        <option value="yesterday">{t("orders.yesterday")}</option>
                        <option value="last7">{t("orders.last7Days")}</option>
                        <option value="thisMonth">{t("orders.thisMonth")}</option>
                        <option value="custom">{t("orders.customPeriod")}</option>
                      </select>
                    </div>

                    <div className="relative min-w-[130px] sm:flex-1 lg:min-w-0">
                      <select
                        aria-label={String(t("orders.allStatuses"))}
                        value={filters.status}
                        onChange={(e) => handleFilterChange("status", e.target.value)}
                        className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                      >
                        <option value="">{t("orders.allStatuses")}</option>
                        {filterableOrderStatuses.map((status) => (
                          <option
                            key={status.code}
                            value={status.code.toLowerCase()}
                          >
                            {status.name}
                          </option>
                        ))}
                        <option value="trash">سلة المحذوفات</option>
                      </select>
                    </div>

                    <div className="relative min-w-[130px] sm:flex-1 lg:min-w-0">
                      <select
                        aria-label={String(t("orders.allPaymentStatuses"))}
                        value={filters.paymentStatus}
                        onChange={(e) =>
                          handleFilterChange("paymentStatus", e.target.value)
                        }
                        className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                      >
                        <option value="">{t("orders.allPaymentStatuses")}</option>
                        {filterablePaymentStatuses.map((status) => (
                          <option
                            key={status.code}
                            value={status.code.toLowerCase()}
                          >
                            {status.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {showOrderSourceFilter && (
                      <div className="relative min-w-[140px] sm:flex-1 lg:min-w-0">
                        <select
                          aria-label={String(t("orders.allSources"))}
                          value={filters.sourceType}
                          onChange={(e) =>
                            handleFilterChange("sourceType", e.target.value)
                          }
                          className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                        >
                          <option value="">{t("orders.allSources")}</option>
                          <option value="ai_conversation">
                            {t("orders.sourceAutoConversation")}
                          </option>
                          <option value="manual">{t("orders.sourceManual")}</option>
                          <option value="storefront">
                            {t("orders.sourceStorefront")}
                          </option>
                          <option value="woocommerce">
                            {t("orders.sourceWooCommerce")}
                          </option>
                          <option value="pos">{t("orders.sourcePOS")}</option>
                          <option value="api">{t("orders.sourceAPI")}</option>
                          <option value="import">{t("orders.sourceImport")}</option>
                          <option value="unknown">{t("orders.sourceUnknown")}</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {showUnifiedOperationFilters && (
                    <div className="grid gap-2.5 lg:grid-cols-5">
                      {showMerchantOperationFilters && (
                        <div className="relative min-w-[150px] sm:flex-1 lg:min-w-0">
                          <select
                            aria-label="كل التجار"
                            value={filters.merchantId}
                            onChange={(e) =>
                              handleFilterChange("merchantId", e.target.value)
                            }
                            className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                          >
                            <option value="">كل التجار</option>
                            {merchantOptions.map((merchantOption) => (
                              <option key={merchantOption.id} value={merchantOption.id}>
                                {merchantOption.name || merchantOption.email || merchantOption.id}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {showAffiliateOperationFilter && (
                        <div className="relative min-w-[150px] sm:flex-1 lg:min-w-0">
                          <select
                            aria-label="كل المسوقين"
                            value={filters.affiliateId}
                            onChange={(e) =>
                              handleFilterChange("affiliateId", e.target.value)
                            }
                            className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                          >
                            <option value="">كل المسوقين</option>
                            {affiliateOptions.map((affiliateOption) => (
                              <option key={affiliateOption.id} value={affiliateOption.id}>
                                {getAffiliateDisplayName(affiliateOption)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {showMerchantOperationFilters && (
                        <>
                          <div className="relative min-w-[150px] sm:flex-1 lg:min-w-0">
                            <select
                              aria-label="مصدر التنفيذ"
                              value={filters.fulfillmentSource}
                              onChange={(e) =>
                                handleFilterChange("fulfillmentSource", e.target.value)
                              }
                              className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                            >
                              <option value="">كل مصادر التنفيذ</option>
                              <option value="MERCHANT">من عند التاجر</option>
                              <option value="COMPANY_WAREHOUSE">من مخزن الشركة</option>
                            </select>
                          </div>

                          <div className="relative min-w-[150px] sm:flex-1 lg:min-w-0">
                            <select
                              aria-label="حالة تشغيل التاجر"
                              value={filters.merchantOperationStatus}
                              onChange={(e) =>
                                handleFilterChange(
                                  "merchantOperationStatus",
                                  e.target.value,
                                )
                              }
                              className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                            >
                              <option value="">كل حالات تشغيل التاجر</option>
                              <option value="PREPARATION">قيد التجهيز</option>
                              <option value="IN_SHIPPING">في الشحن</option>
                              <option value="DELIVERED">تم التسليم</option>
                              <option value="NOT_DELIVERED">مرتجع / لم يسلم</option>
                            </select>
                          </div>

                          <div className="relative min-w-[150px] sm:flex-1 lg:min-w-0">
                            <select
                              aria-label="مستحقات التاجر"
                              value={filters.merchantSettlementStatus}
                              onChange={(e) =>
                                handleFilterChange(
                                  "merchantSettlementStatus",
                                  e.target.value,
                                )
                              }
                              className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                            >
                              <option value="">كل المستحقات</option>
                              <option value="PAYABLE">مستحق السحب</option>
                              <option value="PAID">تم السداد</option>
                              <option value="NOT_PAYABLE">غير مستحق</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {hasCustomDateFilters && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/80">
                          <span className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                            من
                          </span>
                          <input
                            type="date"
                            aria-label="تاريخ البداية"
                            value={filters.startDate}
                            onChange={(e) => {
                              handleFilterChange("startDate", e.target.value);
                              if (filters.timeRange !== "custom")
                                handleFilterChange("timeRange", "custom");
                            }}
                            className="theme-native-control rounded-xl border-0 bg-transparent p-0 text-xs text-slate-700 focus:ring-0 dark:text-slate-100"
                          />
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/80">
                          <span className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                            إلى
                          </span>
                          <input
                            type="date"
                            aria-label="تاريخ النهاية"
                            value={filters.endDate}
                            onChange={(e) => {
                              handleFilterChange("endDate", e.target.value);
                              if (filters.timeRange !== "custom")
                                handleFilterChange("timeRange", "custom");
                            }}
                            className="theme-native-control rounded-xl border-0 bg-transparent p-0 text-xs text-slate-700 focus:ring-0 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <button
                        onClick={clearAdvancedFilters}
                        className="rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        مسح الفلاتر المتقدمة
                      </button>
                    </div>
                  )}

                  {!hasCustomDateFilters && advancedFilterCount > 0 && (
                    <div className="flex justify-end">
                      <button
                        onClick={clearAdvancedFilters}
                        className="rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        مسح الفلاتر المتقدمة
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      {renderMerchantSettlementPanel()}

      {/* Bulk Toolbar */}
      {canSelectOrders && selectedOrders.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {t("orders.ordersSelected", { count: selectedOrders.length })}
            </span>
          </div>
          <div className="flex gap-3">
            <select
              aria-label={String(t("orders.updateStatus"))}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  handleBulkStatusUpdate(val);
                  e.target.value = ""; // Reset
                }
              }}
              className="theme-native-control px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg text-sm focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100"
              disabled={bulkProcessing}
            >
              <option value="">{t("orders.updateStatus")}</option>
              {bulkUpdatableStatuses.map((status) => (
                <option
                  key={status.code}
                  value={status.code.toLowerCase()}
                >
                  {status.name}
                </option>
              ))}
              <option value="trash">نقل إلى سلة المحذوفات</option>
              <option value="restore">استعادة من سلة المحذوفات</option>
            </select>
            <button
              onClick={handleBulkPrintInvoices}
              disabled={printingInvoices}
              className="flex items-center px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg text-sm hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
            >
              <PrinterIcon className="w-4 h-4 ml-2" />
              {printingInvoices ? "جاري الطباعة..." : "طباعة الفواتير"}
            </button>
            <button
              onClick={handleBulkCreateTurboShipments}
              disabled={bulkProcessing}
              className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <RocketLaunchIcon className="w-4 h-4 ml-2" />
              {bulkProcessing
                ? t("orders.creating")
                : t("orders.createTurboShipments")}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkProcessing}
              className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
            >
              {bulkProcessing
                ? t("orders.processing2")
                : t(isTrashView ? "orders.deleteSelectedPermanently" : "orders.deleteSelected")}
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`mobile-skeleton-${index}`}
              className="animate-pulse rounded-[26px] border border-slate-200/70 bg-white/85 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-5 w-40 rounded-full bg-slate-300/80 dark:bg-slate-600" />
                </div>
                <div className="h-6 w-6 rounded-md bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300/80 bg-white/80 px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <ShoppingBagIcon className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {ordersLoadError ? "تعذر تحميل الطلبات" : t("orders.noOrders")}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {ordersLoadError ? ordersLoadError : t("orders.noOrdersFound")}
            </p>
          </div>
        ) : (
          orders.map((order, idx) => {
            const orderItemsSummary = summarizeOrderDocumentItems(order.items);
            const isSelected = selectedOrders.includes(order.orderNumber);

            return (
              <article
                key={`mobile-${order.id || idx}`}
                className={`rounded-[28px] border p-4 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.5)] transition ${isSelected
                  ? "border-blue-400/70 bg-blue-50/90 dark:border-blue-500/60 dark:bg-blue-500/10"
                  : "border-slate-200/70 bg-white/88 dark:border-slate-700/70 dark:bg-slate-900/72"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        #{order.orderNumber}
                      </span>
                      {!order.isViewed && (
                        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                          جديد
                        </span>
                      )}
                      {order.metadata?.isGuestOrder && (
                        <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {t("orders.guest")}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                        {getCustomerDisplayName(order)}
                      </h3>
                      {order.customerPhone && (
                        <p
                          className="mt-1 text-sm text-slate-500 dark:text-slate-400"
                          dir="ltr"
                        >
                          {order.customerPhone}
                        </p>
                      )}
                    </div>
                  </div>

                  {canSelectOrders && (
                    <input
                      type="checkbox"
                      aria-label={`تحديد الطلب ${order.orderNumber}`}
                      className="mt-1 h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-400"
                      checked={isSelected}
                      onChange={() => toggleOrderSelection(order.orderNumber)}
                    />
                  )}
                </div>

                {orderItemsSummary.hasQuantityOffers ? (
                  <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                    <div className="font-semibold">
                      عرض كميات: {orderItemsSummary.primaryLabel}
                    </div>
                    <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                      {orderItemsSummary.secondaryLabel}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] border border-slate-200/70 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      المبلغ
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {formatPrice(getOrderAmount(order))}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {getOrderSourceText(order)}
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-slate-200/70 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      الوقت
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {getRelativeTime(order.createdAt || new Date().toISOString())}
                    </p>
                    <p
                      className="mt-1 text-[11px] text-slate-500 dark:text-slate-400"
                      title={formatDate(order.createdAt || new Date().toISOString())}
                    >
                      {formatDate(order.createdAt || new Date().toISOString())}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusBadgeStyle(
                      order.paymentStatus || "pending",
                    )
                      ? ""
                      : getPaymentStatusColor(
                          (order.paymentStatus || "pending").toLowerCase(),
                        )}`}
                    style={getPaymentStatusBadgeStyle(order.paymentStatus || "pending")}
                  >
                    {getPaymentStatusText(
                      (order.paymentStatus || "pending").toLowerCase(),
                    )}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeStyle(
                      order.status || "",
                    )
                      ? ""
                      : getStatusColor(order.status || "")}`}
                    style={getStatusBadgeStyle(order.status || "")}
                  >
                    {getStatusText(order.status || "")}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleOpenOrder(order)}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <EyeIcon className="h-4 w-4" />
                    عرض سريع
                  </button>

                  <Link
                    to={`/orders/${order.orderNumber}`}
                    onClick={() => {
                      if (!order.isViewed) {
                        handleMarkAsViewed(order.orderNumber);
                      }
                    }}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <ShoppingBagIcon className="h-4 w-4" />
                    التفاصيل
                  </Link>

                  {order.conversationId && (
                    <Link
                      to={`/whatsapp?conversationId=${order.conversationId}`}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      المحادثة
                    </Link>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Orders Table */}
      <div className="hidden overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/88 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.5)] dark:border-slate-700/70 dark:bg-slate-900/72 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {canSelectOrders && (
                  <th className="w-10 px-3 py-2.5 lg:px-4">
                    <input
                      type="checkbox"
                      aria-label="تحديد كل الطلبات"
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                      onChange={toggleAllSelection}
                      checked={
                        orders.length > 0 &&
                        orders.every((o) =>
                          selectedOrders.includes(o.orderNumber),
                        )
                      }
                    />
                  </th>
                )}
                {columnsToRender.includes("orderNumber") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 lg:px-4">
                    {t("orders.orderNumber")}
                  </th>
                )}
                {columnsToRender.includes("customer") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 lg:px-4">
                    {t("orders.customer")}
                  </th>
                )}
                {columnsToRender.includes("amount") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 lg:px-4">
                    {t("orders.amount")}
                  </th>
                )}
                {columnsToRender.includes("status") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 lg:px-4">
                    {t("orders.status")}
                  </th>
                )}
                {columnsToRender.includes("payment") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 lg:px-4">
                    {t("orders.payment")}
                  </th>
                )}
                {columnsToRender.includes("date") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 lg:px-4">
                    {t("orders.date")}
                  </th>
                )}
                {columnsToRender.includes("actions") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 lg:px-4">
                    {t("orders.actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    {canSelectOrders && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </td>
                    )}
                    {columnsToRender.includes("orderNumber") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded"></div>
                      </td>
                    )}
                    {columnsToRender.includes("customer") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-3 w-40 bg-gray-100 dark:bg-gray-800 rounded"></div>
                      </td>
                    )}
                    {columnsToRender.includes("amount") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </td>
                    )}
                    {columnsToRender.includes("status") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      </td>
                    )}
                    {columnsToRender.includes("payment") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      </td>
                    )}
                    {columnsToRender.includes("date") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </td>
                    )}
                    {columnsToRender.includes("actions") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded"></div>
                      </td>
                    )}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColumnCount}
                    className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingBagIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {ordersLoadError ? "تعذر تحميل الطلبات" : t("orders.noOrders")}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {ordersLoadError ? ordersLoadError : t("orders.noOrdersFound")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order, idx) => {
                  const orderItemsSummary = summarizeOrderDocumentItems(order.items);
                  return (
                    <tr
                      key={order.id || idx}
                      onClick={() => {
                        handleOpenOrder(order);
                      }}
                      className={`hover:bg-blue-50/40 dark:hover:bg-blue-900/10 cursor-pointer transition-all duration-200 group ${selectedOrders.includes(order.orderNumber)
                        ? "bg-blue-50/60 dark:bg-blue-900/30"
                        : !order.isViewed
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : ""
                        }`}
                    >
                      {canSelectOrders && (
                        <td
                          className="px-3 py-2.5 lg:px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`تحديد الطلب ${order.orderNumber}`}
                            className="w-5 h-5 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                            checked={selectedOrders.includes(order.orderNumber)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleOrderSelection(order.orderNumber);
                            }}
                          />
                        </td>
                      )}
                      {columnsToRender.includes("orderNumber") && (
                        <td className="px-3 py-2.5 lg:px-4">
                          <div className="flex flex-col gap-1.5">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                #{order.orderNumber}
                              </span>
                              {order.metadata?.isGuestOrder && (
                                <span className="mr-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                  {t("orders.guest")}
                                </span>
                              )}
                              {!order.isViewed && (
                                <span className="mr-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 border border-red-200">
                                  جديد
                                </span>
                              )}
                            </div>
                            {orderItemsSummary.hasQuantityOffers ? (
                              <div className="max-w-[240px] rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                                <div className="font-semibold">
                                  عرض كميات: {orderItemsSummary.primaryLabel}
                                </div>
                                <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                                  {orderItemsSummary.secondaryLabel}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      )}
                      {columnsToRender.includes("customer") && (
                        <td className="px-3 py-2.5 lg:px-4">
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              {getCustomerDisplayName(order)}
                            </span>
                            {order.customerPhone && (
                              <span
                                className="text-gray-500 dark:text-gray-400 text-sm"
                                dir="ltr"
                              >
                                {order.customerPhone}
                              </span>
                            )}
                            {order.extractionMethod && (
                              <span className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                {order.extractionMethod === "ai_enhanced"
                                  ? t("orders.enhancedExtraction")
                                  : order.extractionMethod === "ai_basic"
                                    ? t("orders.basicExtraction")
                                    : order.extractionMethod === "manual"
                                      ? t("orders.manual")
                                      : order.extractionMethod}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {columnsToRender.includes("amount") && (
                        <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100 lg:px-4">
                          {(() => {
                            try {
                              // PRIORITIZE: subtotal + shipping + tax for consistency with OrderDetails
                              const subtotal =
                                typeof order.subtotal === "number"
                                  ? order.subtotal
                                  : 0;
                              const shipping =
                                typeof order.shipping === "number"
                                  ? order.shipping
                                  : 0;
                              const tax =
                                typeof order.tax === "number" ? order.tax : 0;

                              const amount =
                                subtotal + shipping + tax || order.total || 0;
                              return formatPrice(amount);
                            } catch (e) {
                              return "0.00";
                            }
                          })()}
                        </td>
                      )}
                      {columnsToRender.includes("status") && (
                        <td className="px-3 py-2.5 lg:px-4">
                          <div className="flex flex-col gap-1">
                            {(() => {
                              const statusBadgeStyle = getStatusBadgeStyle(
                                order.status || "",
                              );

                              return (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    statusBadgeStyle
                                      ? ""
                                      : getStatusColor(order.status || "")
                                  }`}
                                  style={statusBadgeStyle}
                                >
                                  {getStatusText(order.status || "")}
                                </span>
                              );
                            })()}
                            {order.isScheduled &&
                              order.scheduledDeliveryDate && (
                                <span
                                  className="text-xs text-gray-600 dark:text-gray-400"
                                  dir="ltr"
                                >
                                  📅{" "}
                                  {new Date(
                                    order.scheduledDeliveryDate,
                                  ).toLocaleDateString("ar-EG", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              )}
                            {order.confidence && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getConfidenceColor(order.confidence)}`}
                              >
                                {getConfidenceIcon(order.confidence)}
                                <span className="mr-1">
                                  {(order.confidence * 100).toFixed(0)}%
                                </span>
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {columnsToRender.includes("payment") && (
                        <td className="px-3 py-2.5 lg:px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeStyle(
                              order.paymentStatus || "pending",
                            )
                              ? ""
                              : getPaymentStatusColor(
                                  (order.paymentStatus || "pending").toLowerCase(),
                                )}`}
                            style={getPaymentStatusBadgeStyle(order.paymentStatus || "pending")}
                          >
                            {getPaymentStatusText(
                              (order.paymentStatus || "pending").toLowerCase(),
                            )}
                          </span>
                        </td>
                      )}
                      {columnsToRender.includes("date") && (
                        <td
                          className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 lg:px-4"
                          title={formatDate(
                            order.createdAt || new Date().toISOString(),
                          )}
                        >
                          {(() => {
                            try {
                              return getRelativeTime(
                                order.createdAt || new Date().toISOString(),
                              );
                            } catch (e) {
                              return "-";
                            }
                          })()}
                        </td>
                      )}
                      {columnsToRender.includes("actions") && (
                        <td className="px-3 py-2.5 lg:px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenOrder(order);
                              }}
                              aria-label={`${t("orders.quickView")} ${order.orderNumber}`}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title={t("orders.quickView")}
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                            <Link
                              to={`/orders/${order.orderNumber}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!order.isViewed) {
                                  handleMarkAsViewed(order.orderNumber);
                                }
                              }}
                              aria-label={`${t("orders.viewFullDetails")} ${order.orderNumber}`}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title={t("orders.viewFullDetails")}
                            >
                              <ShoppingBagIcon className="w-5 h-5" />
                            </Link>
                            {order.conversationId && (
                              <Link
                                to={`/whatsapp?conversationId=${order.conversationId}`}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`${t("orders.conversation")} ${order.orderNumber}`}
                                className="p-1 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                title={t("orders.conversation")}
                              >
                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                              </Link>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && orders.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2.5 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 lg:px-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("orders.showing")} {(page - 1) * limit + 1} {t("orders.to")}{" "}
                {Math.min(page * limit, totalOrders)} {t("orders.of")}{" "}
                {totalOrders} {t("orders.orders2")}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  عرض:
                </label>
                <select
                  aria-label="عدد الطلبات في الصفحة"
                  value={limit}
                  onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                  className="theme-native-control px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 text-sm transition-colors"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && page > 3) {
                    p = page - 2 + i;
                  }
                  if (p > totalPages) return null;

                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${page === p
                        ? "bg-blue-600 dark:bg-blue-500 text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {!loading && orders.length > 0 && (
        <div className="rounded-[26px] border border-slate-200/70 bg-white/88 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/72 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                الصفحة الحالية
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {page} / {Math.max(totalPages, 1)}
              </p>
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                الظاهر الآن
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {Math.min(page * limit, totalOrders)} / {totalOrders}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              السابق
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              التالي
            </button>
            <select
              aria-label="عدد الطلبات في الصفحة"
              value={limit}
              onChange={(e) => handleLimitChange(parseInt(e.target.value))}
              className={`${fieldClassName} w-auto min-w-[88px] px-3`}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>
      )}
      </div>

      {/* Enhanced Order Modal */}
      {selectedOrder && (
        <EnhancedOrderModal
          order={selectedOrder}
          isOpen={showOrderModal}
          canManagePaymentStatus={!isMerchant}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrder(null);
          }}
          onOrderUpdate={(updatedOrder) => {
            setSelectedOrder(updatedOrder);
            setOrders(
              orders.map((o) =>
                o.orderNumber === updatedOrder.orderNumber ? updatedOrder : o,
              ),
            );
          }}
        />
      )}

      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default Orders;



