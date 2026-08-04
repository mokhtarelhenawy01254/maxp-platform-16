import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import useSocket from "../../hooks/useSocket";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import { apiClient } from "../../services/apiClient";
import { summarizeOrderDocumentItems } from "../../utils/orderDocumentQuantityOffers";
import { getOrderStatusDisplay, getStatusDisplay } from "../../utils/statusRegistry";
import {
  AFFILIATE_OPERATION_APP_SLUGS,
  MERCHANT_OPERATION_APP_SLUGS,
  ORDER_SOURCE_TRACKING_APP_SLUGS,
  AGENT_WORKSPACE_APP_SLUGS,
  getCurrentCompanyActiveApps,
  hasAnyCompanyAppSlug,
  normalizeCompanyAppSlug,
} from "../../utils/companyApps";
import { OrdersSkeleton } from "./components/OrdersSkeleton";
import { OrdersEmptyState } from "./components/OrdersEmptyState";
import { OrdersPagination } from "./components/OrdersPagination";
import { OrdersMobileList } from "./components/OrdersMobileList";
import { OrdersToolbar } from "./components/OrdersToolbar";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { printOrderInvoice } from "../../utils/printOrderInvoice";
import type { OrderDetailsType } from "./types";

const EnhancedOrderModal = React.lazy(
  () => import("../../components/orders/EnhancedOrderModal"),
);
const InvoiceModal = React.lazy(
  () => import("../../components/orders/InvoiceModal"),
);

import {
  ShoppingBagIcon,
  EyeIcon,
  CheckCircleIcon,
  PrinterIcon,
  InformationCircleIcon,
  StarIcon,
  ExclamationTriangleIcon,
  RocketLaunchIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  CubeIcon,
  TruckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";


export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
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
  governorate?: string;
  sourceType?: string;
  turboShipmentStatus?: string;
  turboTrackingNumber?: string;
  affiliateId?: string;
  affiliate?: AffiliateFilterOption;
  merchantOrder?: MerchantOrderScope;
}

type OrderStatus = string;
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
  return (String(value ?? "").trim().toLowerCase() || "pending") as OrderStatus;
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

export interface OrderStatusDefinition {
  code: string;
  name: string;
  nameEn?: string;
  color?: string;
}

export interface OrdersFilters {
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

export interface MerchantFilterOption {
  id: string;
  name: string;
  email?: string;
  fulfillmentMode?: string;
}

export interface AffiliateFilterOption {
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
  { code: "PENDING", name: i18n.t('orders.pending'), color: "#F59E0B" },
  { code: "DRAFT", name: i18n.t('orders.draft'), color: "#9CA3AF" },
  { code: "CONFIRMED", name: i18n.t('orders.confirmed'), color: "#3B82F6" },
  { code: "SCHEDULED", name: i18n.t('orders.scheduled'), color: "#F97316" },
  { code: "ON_HOLD", name: i18n.t('orders.onHold'), color: "#F97316" },
  { code: "PROCESSING", name: i18n.t('orders.processing'), color: "#8B5CF6" },
  { code: "SHIPPED", name: i18n.t('orders.shipped'), color: "#06B6D4" },
  { code: "DELIVERED", name: i18n.t('orders.delivered'), color: "#10B981" },
  { code: "CANCELLED", name: i18n.t('orders.cancelled'), color: "#EF4444" },
  { code: "DUPLICATE_ORDER", name: i18n.t('orders.duplicate'), color: "#F59E0B" },
  { code: "REFUNDED", name: i18n.t('orders.refunded'), color: "#6B7280" },
  { code: "PARTIALLY_REFUNDED", name: i18n.t('orders.partiallyRefunded'), color: "#9CA3AF" },
  { code: "RETURNED", name: i18n.t('orders.returned'), color: "#DC2626" },
  { code: "PARTIALLY_RETURNED", name: i18n.t('orders.partiallyReturned'), color: "#F87171" },
  { code: "PARTIALLY_DELIVERED", name: i18n.t('orders.partiallyDelivered'), color: "#FBBF24" },
  { code: "EXCHANGED", name: i18n.t('orders.exchanged'), color: "#7C3AED" },
  { code: "TRASH", name: i18n.t('orders.trash'), color: "#6B7280" },
  // 🚀 حالات شحن تربو 1..13
  { code: "turbo_saved", name: "تربو: محفوظة قبل الشحن (كود 1)", color: "#6366F1" },
  { code: "turbo_sent", name: "تربو: مرسلة لشركة تربو (كود 2)", color: "#3B82F6" },
  { code: "processing", name: "تربو: قيد التنفيذ بالفرع (كود 3)", color: "#8B5CF6" },
  { code: "out_for_delivery", name: "تربو: مسلمة للمندوب (كود 4)", color: "#06B6D4" },
  { code: "returned_to_company", name: "تربو: مرتجعات بالشركة (كود 5)", color: "#991B1B" },
  { code: "cancelled", name: "تربو: ملغي من الشحن (كود 6)", color: "#DC2626" },
  { code: "delivered", name: "تربو: تم التسليم (كود 7)", color: "#10B981" },
  { code: "remitted", name: "تربو: تم التوريد وتحصيل المبلغ (كود 8)", color: "#047857" },
  { code: "archived", name: "تربو: شحنة محذوفة (كود 9)", color: "#78716C" },
  { code: "returned_resent", name: "تربو: معاد إرسالها (كود 10)", color: "#2563EB" },
  { code: "returned_missing", name: "تربو: مرتجع مفقود (كود 11)", color: "#7F1D1D" },
  { code: "returned_destroyed", name: "تربو: مرتجع معدوم (كود 12)", color: "#451A03" },
  { code: "delayed", name: "تربو: مؤجلة مع المندوب (كود 13)", color: "#F97316" },
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
  "RETURNED",
  "PARTIALLY_RETURNED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

const BULK_UPDATABLE_STATUS_CODES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "DUPLICATE_ORDER",
  "RETURNED",
  "PARTIALLY_RETURNED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
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
    turboShipmentStatus: order.turboShipmentStatus || order.metadata?.turboShipmentStatus || undefined,
    turboTrackingNumber: order.turboTrackingNumber || order.metadata?.turboTrackingNumber || undefined,
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
    return i18n.t('orders.failedToLoadOrdersDesc');
  }

  if (apiError?.message?.includes("Network")) {
    return i18n.t('orders.networkError');
  }

  return (
    apiError?.response?.data?.message ||
    apiError?.message ||
    i18n.t('orders.genericLoadError')
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
  PENDING: i18n.t('orders.pendingWithdrawal'),
  PROCESSED: i18n.t('orders.transferred'),
  FAILED: i18n.t('orders.transferFailed'),
  CANCELLED: i18n.t('orders.cancelled'),
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

  const [tableDensity, setTableDensity] = useState<"comfortable" | "compact">(() => {
    try {
      return localStorage.getItem("orders:table-density") === "compact"
        ? "compact"
        : "comfortable";
    } catch {
      return "comfortable";
    }
  });
  const changeTableDensity = (density: "comfortable" | "compact") => {
    setTableDensity(density);
    try {
      localStorage.setItem("orders:table-density", density);
    } catch {
      // ignore storage errors
    }
  };

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
  const hasAgentWorkspace = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    AGENT_WORKSPACE_APP_SLUGS,
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
            response.data?.message || i18n.t("orders.merchantLoadError"),
          );
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        console.warn("Failed to load merchant settlement summary:", error);
        setMerchantSettlementSummary(null);
        setMerchantSettlementError(
          getApiErrorMessage(error, i18n.t("orders.merchantLoadError")),
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
          setOrdersLoadError(i18n.t('orders.failedToLoadOrdersShort'));
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
          setOrdersLoadError(i18n.t('orders.failedToLoadOrdersShort'));
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
    if (!confidence) return "bg-slate-100 text-slate-800";
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

      if (diffInSeconds < 60) {
        return t("orders.justNow");
      }

      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return t("orders.minutesAgo", { count: minutes });
      }

      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return t("orders.hoursAgo", { count: hours });
      }

      if (diffInSeconds < 172800) {
        return t("orders.yesterday");
      }

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

  const clearAllFilters = () => {
    clearAdvancedFilters();
    setFilters((prev) => ({ ...prev, search: "", onlyUnseen: false }));
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
          status: getStatusDisplay(normalizedStatus).label,
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
      const results = data.data?.results ?? [];
      const failedResults = results.filter((r: Record<string, unknown>) => !r.success);
      const failedCount = failedResults.length;
      const successCount = data.data?.successCount ?? 0;
      const totalRequested = data.data?.totalRequested ?? selectedOrders.length;

      if (successCount > 0) {
        if (failedCount === 0) {
          alert(t("orders.ordersUpdated"));
        } else {
          const errorSummary = failedResults
            .slice(0, 5)
            .map((r: Record<string, unknown>) => `${t("orders.orderLabel")} ${r.id}: ${r.error || t('orders.unknownError')}`)
            .join('\n');
          const moreText = failedCount > 5 ? `\n${t('orders.moreErrors', { count: failedCount - 5 })}` : '';
          alert(`${t('orders.updatedOrdersSummary', { success: successCount, total: totalRequested })}\n\n${t('orders.failedOrdersLabel')}:\n${errorSummary}${moreText}`);
        }
        await fetchOrders();
        const failedIds: string[] = failedResults.map((r: Record<string, unknown>) => String(r.id));
        setSelectedOrders(failedIds.length > 0 ? failedIds : []);
      } else {
        const errors: string[] = failedResults.map((r: Record<string, unknown>) => String(r.error ?? ''));
        alert(errors.length > 0 ? errors.join('\n') : data.message || t("orders.updateFailed"));
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
      alert(t("orders.pleaseSelectOrders"));
      return;
    }

    // للطباعة الجماعية، نفتح صفحة منفصلة
    if (selectedOrders.length > 1) {
      if (!window.confirm(t("orders.confirmPrintInvoices", { count: selectedOrders.length })))
        return;

      try {
        setPrintingInvoices(true);
        const response = await apiClient.post("/order-invoices/bulk-generate", {
          orderIds: selectedOrders,
        });

        if (response.data.success) {
          const { success, existing, failed, invoices, guestOrders } = response.data.data;

          if (invoices && invoices.length > 0) {
            const invoiceIds = (invoices as GeneratedInvoice[]).map(
              (invoice) => invoice.id,
            );
            const printUrl = `/orders/invoices/print-multiple?ids=${invoiceIds.join(",")}`;
            window.open(printUrl, "_blank");
          }

          if (guestOrders && guestOrders.length > 0) {
            void (async () => {
              const invoiceSettingsResponse = await apiClient
                .get("/order-invoice-settings")
                .catch(() => null);
              for (const entry of guestOrders as Array<{ orderId: string; order: OrderDetailsType }>) {
                const printWindow = window.open("", "_blank");
                if (!printWindow) continue;
                try {
                  await printOrderInvoice({
                    order: entry.order,
                    companyName: user?.company?.name,
                    companyLogoUrl: user?.company?.logo || null,
                    printWindow,
                    invoiceSettings: invoiceSettingsResponse?.data?.data,
                  });
                } catch (printError: unknown) {
                  console.error("Failed printing guest order invoice:", printError);
                }
              }
            })();
          }

          alert(
            t("orders.invoicesGenerated", { success: success.length, existing: existing.length, failed: failed.length }),
          );
          setSelectedOrders([]);
        }
      } catch (error: unknown) {
        console.error("Error bulk printing invoices:", error);
        alert(t("orders.invoicePrintError"));
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
          const data = response.data.data as {
            invoices?: GeneratedInvoice[];
            guestOrders?: Array<{ orderId: string; order: OrderDetailsType }>;
          };
          const { invoices, guestOrders } = data;

          if (invoices && invoices.length > 0) {
            setSelectedInvoice(invoices[0]);
          } else if (guestOrders && guestOrders.length > 0) {
            const invoiceSettingsResponse = await apiClient
              .get("/order-invoice-settings")
              .catch(() => null);
            const printWindow = window.open("", "_blank");
            if (printWindow) {
              try {
                await printOrderInvoice({
                  order: guestOrders[0].order,
                  companyName: user?.company?.name,
                  companyLogoUrl: user?.company?.logo || null,
                  printWindow,
                  invoiceSettings: invoiceSettingsResponse?.data?.data,
                });
              } catch (printError: unknown) {
                console.error("Failed printing guest order invoice:", printError);
              }
            }
          }
        }
      } catch (error: unknown) {
        console.error("Error generating invoice:", error);
        alert(t("orders.invoiceGenerationError"));
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

  const getUnifiedStatusDisplay = (order: Order, translate: (key: string) => string) => {
    const display = getOrderStatusDisplay(order);
    const customStyle = getStatusBadgeStyle(order.status || "");

    return {
      text: translate(display.primary.labelKey) || display.primary.label,
      labelKey: display.primary.labelKey,
      className: `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${display.primary.colorClass}`,
      style: customStyle,
    };
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
          name: getStatusDisplay(activeFilter).label,
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
        return i18n.t('orders.fromCompanyWarehouse');
      case "MERCHANT":
        return i18n.t('orders.fromMerchant');
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
      t("orders.selectedMerchant");

    if (merchantSettlementLoading) {
      return (
        <section className="mb-4 rounded-[26px] border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
          <div className="skeleton-shimmer h-24 rounded-2xl" />
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
              {t("orders.openMerchantProfile")}
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
    ) || selectedMerchant?.fulfillmentMode || t("orders.merchantFulfillment");

    const metricCards = [
      {
        label: t("orders.availableForWithdrawal"),
        value: formatPrice(payoutBalances.availableAmount || 0),
        subValue: `${formatMerchantPieces(payoutBalances.availableCommissionsCount)} ${t("orders.deliveredOrders")}`,
        icon: BanknotesIcon,
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
      },
      {
        label: t("orders.pendingWithdrawalRequest"),
        value: formatPrice(payoutBalances.pendingPayoutAmount || 0),
        subValue: `${formatMerchantPieces(pendingPayouts.length)} ${t("orders.pendingWithdrawalRequest")}`,
        icon: ClockIcon,
        className:
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
      },
      {
        label: t("orders.transferred"),
        value: formatPrice(payoutBalances.paidAmount || 0),
        subValue: t("orders.paidAndClosed"),
        icon: CheckCircleIcon,
        className:
          "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
      },
      {
        label: t("orders.settlementInShipping"),
        value: formatPrice(operationsTotals.inShippingAmount),
        subValue: t("orders.piecesPending", { count: formatMerchantPieces(operationsTotals.inShippingPieces) }),
        icon: TruckIcon,
        className:
          "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100",
      },
      {
        label: t("orders.sellableBalance"),
        value: `${formatMerchantPieces(inventorySummary.availableForSale)} ${t("orders.pieces")}`,
        subValue: t("orders.reservedPieces", { count: formatMerchantPieces(inventorySummary.reservedQuantity) }),
        icon: CubeIcon,
        className:
          "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-100",
      },
      {
        label: t("orders.deliveredOrders"),
        value: `${formatMerchantPieces(operationsTotals.deliveredOrdersCount)} ${t("orders.orders2")}`,
        subValue: t("orders.piecesDue", { count: formatMerchantPieces(operationsTotals.payablePieces) }),
        icon: CheckCircleIcon,
        className:
          "border-emerald-200 bg-white text-emerald-900 dark:border-emerald-500/20 dark:bg-slate-900 dark:text-emerald-100",
      },
      {
        label: t("orders.settlementNotDelivered"),
        value: `${formatMerchantPieces(operationsTotals.notDeliveredOrdersCount)} ${t("orders.orders2")}`,
        subValue: formatPrice(operationsTotals.notDeliveredAmount),
        icon: ExclamationTriangleIcon,
        className:
          "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100",
      },
    ];

    return (
      <section className="mb-4 rounded-[26px] border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                <BanknotesIcon className="h-4 w-4" />
                {t("orders.merchantSettlementLabel")}
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
              {t("orders.merchantSettlementDesc")}
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
              {t("orders.allMerchantOrders")}
            </button>
            <button
              type="button"
              onClick={() => {
                handleFilterChange("merchantOperationStatus", "DELIVERED");
                handleFilterChange("merchantSettlementStatus", "PAYABLE");
              }}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              {t("orders.dueOrders")}
            </button>
            <Link
              to={`/merchants/${filters.merchantId}`}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {t("orders.merchantProfile")}
            </Link>
            <Link
              to="/inventory"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200"
            >
              {t("orders.inventory")}
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
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
                {t("orders.pendingWithdrawalRequests", { count: formatMerchantPieces(pendingPayouts.length) })}
              </span>
              <span className="text-[11px] opacity-80">
                {t("orders.lastPayout")}: {payoutStatusLabels[pendingPayouts[0]?.status] || pendingPayouts[0]?.status} •{" "}
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

  const mobileListHelpers = useMemo(
    () => ({
      getCustomerDisplayName,
      formatPrice,
      getOrderAmount,
      getOrderSourceText,
      getRelativeTime,
      formatDate,
      getPaymentStatusBadgeStyle,
      getPaymentStatusColor,
      getPaymentStatusText,
      getUnifiedStatusDisplay,
    }),
    [
      getCustomerDisplayName,
      formatPrice,
      getOrderAmount,
      getOrderSourceText,
      getRelativeTime,
      formatDate,
      getPaymentStatusBadgeStyle,
      getPaymentStatusColor,
      getPaymentStatusText,
      getUnifiedStatusDisplay,
    ],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_36%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(241,245,249,0.94)_100%)] px-2 py-2 dark:bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.2),_transparent_34%),linear-gradient(180deg,_rgba(2,6,23,0.98)_0%,_rgba(15,23,42,0.98)_100%)] sm:px-4 sm:py-3 lg:px-3">
      <div className="w-full max-w-none">
        <OrdersToolbar
        filters={filters}
        loading={loading}
        totalOrders={totalOrders}
        activeFilterCount={activeFilterCount}
        advancedFilterCount={advancedFilterCount}
        isMerchant={isMerchant}
        hasAgentWorkspace={hasAgentWorkspace}
        ordersCount={orders.length}
        page={page}
        limit={limit}
        ordersLoadError={ordersLoadError}
        showAdvancedFilters={showAdvancedFilters}
        fieldClassName={fieldClassName}
        filterableOrderStatuses={filterableOrderStatuses}
        filterablePaymentStatuses={filterablePaymentStatuses}
        merchantOptions={merchantOptions}
        affiliateOptions={affiliateOptions}
        showOrderSourceFilter={showOrderSourceFilter}
        showUnifiedOperationFilters={showUnifiedOperationFilters}
        showMerchantOperationFilters={showMerchantOperationFilters}
        showAffiliateOperationFilter={showAffiliateOperationFilter}
        hasCustomDateFilters={hasCustomDateFilters}
        getAffiliateDisplayName={getAffiliateDisplayName}
        onFilterChange={handleFilterChange}
        onClearAdvancedFilters={clearAdvancedFilters}
        onToggleAdvancedFilters={() => setShowAdvancedFilters((prev) => !prev)}
        onSetQuickDate={setQuickDate}
        onOpenWorkspace={() => navigate("/orders/workspace")}
        onRetry={fetchOrders}
      />

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
              className="theme-native-control px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg text-sm focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100"
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
              <option value="trash">{t("orders.moveToTrash")}</option>
              <option value="restore">{t("orders.restoreFromTrash")}</option>
            </select>
            <button
              onClick={handleBulkPrintInvoices}
              disabled={printingInvoices}
              className="flex items-center px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg text-sm hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
            >
              <PrinterIcon className="w-4 h-4 ml-2" />
              {printingInvoices ? t("orders.printing") : t("orders.printInvoices")}
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

            <OrdersMobileList
        orders={orders}
        loading={loading}
        ordersLoadError={ordersLoadError}
        selectedOrders={selectedOrders}
        canSelectOrders={canSelectOrders}
        isMerchant={isMerchant}
        activeFilterCount={activeFilterCount}
        search={filters.search}
        helpers={mobileListHelpers}
        onOpenOrder={handleOpenOrder}
        onToggleSelection={toggleOrderSelection}
        onMarkAsViewed={handleMarkAsViewed}
        onClearFilters={clearAllFilters}
      />

      {/* Orders Table */}
      <div
        data-orders-density={tableDensity}
        className="hidden overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/90 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.5)] dark:border-slate-700/70 dark:bg-slate-900/70 lg:block"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
              <tr>
                {canSelectOrders && (
                  <th className="w-10 px-3 py-2.5 lg:px-4">
                    <input
                      type="checkbox"
                      aria-label={String(t("orders.selectAllOrders"))}
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-700"
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
                  <th className="px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                    {t("orders.orderNumber")}
                  </th>
                )}
                {columnsToRender.includes("customer") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                    {t("orders.customer")}
                  </th>
                )}
                {columnsToRender.includes("amount") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                    {t("orders.amount")}
                  </th>
                )}
                {columnsToRender.includes("status") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                    {t("orders.status")}
                  </th>
                )}
                {columnsToRender.includes("payment") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                    {t("orders.payment")}
                  </th>
                )}
                {columnsToRender.includes("date") && (
                  <th className="hidden px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4 xl:table-cell">
                    {t("orders.date")}
                  </th>
                )}
                {columnsToRender.includes("actions") && (
                  <th className="px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                    {t("orders.actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <OrdersSkeleton
                  variant="table"
                  rowCount={5}
                  columns={columnsToRender}
                  showSelect={canSelectOrders}
                />
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColumnCount}
                    className="px-6 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    <OrdersEmptyState
                      variant="table"
                      error={ordersLoadError}
                      isMerchant={isMerchant}
                      hasActiveFilters={activeFilterCount > 0 || Boolean(filters.search)}
                      onClearFilters={clearAllFilters}
                    />
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleOpenOrder(order);
                        }
                      }}
                      tabIndex={0}
                      aria-label={`${t("orders.viewDetails")} ${order.orderNumber}`}
                      className={`hover:bg-blue-50/40 dark:hover:bg-blue-900/10 cursor-pointer transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 ${selectedOrders.includes(order.orderNumber)
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
                            aria-label={String(t("orders.selectOrder", { orderNumber: order.orderNumber }))}
                            className="w-5 h-5 text-blue-600 dark:text-blue-400 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-700"
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
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                #{order.orderNumber}
                              </span>
                              {order.metadata?.isGuestOrder && (
                                <span className="mr-2 px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                                  {t("orders.guest")}
                                </span>
                              )}
                              {!order.isViewed && (
                                <span className="mr-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 border border-red-200">
                                  {t("orders.newLabel")}
                                </span>
                              )}
                            </div>
                            {orderItemsSummary.hasQuantityOffers ? (
                              <div className="max-w-[240px] rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                                <div className="font-semibold">
                      {t("orders.quantityOffersLabel")}: {orderItemsSummary.primaryLabel}
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
                            <span className="text-slate-900 dark:text-slate-100 font-medium">
                              {getCustomerDisplayName(order)}
                            </span>
                            {order.customerPhone && (
                              <span
                                className="text-slate-500 dark:text-slate-400 text-sm"
                                dir="ltr"
                              >
                                {order.customerPhone}
                              </span>
                            )}
                            {order.extractionMethod && (
                              <span className="mt-0.5 hidden text-xs text-slate-400 dark:text-slate-500 2xl:inline">
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
                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100 lg:px-4">
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
                              const unifiedStatus = getUnifiedStatusDisplay(order, t);
                              return (
                                <span
                                  className={unifiedStatus.className}
                                  style={unifiedStatus.style}
                                  aria-label={unifiedStatus.labelKey}
                                >
                                  {unifiedStatus.text}
                                </span>
                              );
                            })()}
                            {order.isScheduled &&
                              order.scheduledDeliveryDate && (
                                <span
                                  className="text-xs text-slate-600 dark:text-slate-400"
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
                          className="hidden px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 lg:px-4 xl:table-cell"
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
                          <div className="flex items-center gap-1.5 lg:gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenOrder(order);
                              }}
                              aria-label={`${t("orders.quickView")} ${order.orderNumber}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title={t("orders.quickView")}
                            >
                              <EyeIcon className="w-4 h-4 lg:w-5 lg:h-5" />
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
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title={t("orders.viewFullDetails")}
                            >
                              <ShoppingBagIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            </Link>
                            {order.conversationId && (
                              <Link
                                to={`/whatsapp?conversationId=${order.conversationId}`}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`${t("orders.conversation")} ${order.orderNumber}`}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                title={t("orders.conversation")}
                              >
                                <ChatBubbleLeftRightIcon className="w-4 h-4 lg:w-5 lg:h-5" />
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
          <OrdersPagination
            variant="desktop"
            page={page}
            totalPages={totalPages}
            totalOrders={totalOrders}
            limit={limit}
            density={tableDensity}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onDensityChange={changeTableDensity}
          />
        )}
      </div>

      {!loading && orders.length > 0 && (
        <OrdersPagination
          variant="mobile"
          page={page}
          totalPages={totalPages}
          totalOrders={totalOrders}
          limit={limit}
          density={tableDensity}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          onDensityChange={changeTableDensity}
        />
      )}
      </div>

      {/* Enhanced Order Modal */}
      {selectedOrder && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("orders.modalLoadFailed")}
                </p>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {t("orders.close")}
                </button>
              </div>
            </div>
          }
        >
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              </div>
            }
          >
            <EnhancedOrderModal
              order={selectedOrder}
              isOpen={showOrderModal}
              canManagePaymentStatus={!isMerchant}
              orderStatuses={orderStatuses}
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
          </React.Suspense>
        </ErrorBoundary>
      )}

      {selectedInvoice && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("orders.modalLoadFailed")}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {t("orders.close")}
                </button>
              </div>
            </div>
          }
        >
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              </div>
            }
          >
            <InvoiceModal
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
            />
          </React.Suspense>
        </ErrorBoundary>
      )}


    </div>
  );
};

export default Orders;



