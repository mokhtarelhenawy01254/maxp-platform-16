import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import useSocket from "../../hooks/useSocket";
import { format, subDays } from "date-fns";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import { apiClient } from "../../services/apiClient";
import { queryClient } from "../../config/queryClient";
import { toast } from "sonner";
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
import { OrdersMobileList } from "./components/OrdersMobileList";
import { OrdersToolbar } from "./components/OrdersToolbar";
import { OrdersTable } from "./components/OrdersTable";
import { OrdersStatsBar } from "./components/OrdersStatsBar";
import { isReturnStatusCode, isTurboReturnStatus } from "./utils/returnHelper";

import { OrdersPagination } from "./components/OrdersPagination";
import { BulkActionBar } from "./components/BulkActionBar";
import { OrdersBulkCommandPalette } from "./components/OrdersBulkCommandPalette";
import {
  OrdersFilters,
  OrdersListViewState,
  DEFAULT_ORDERS_FILTERS,
  ORDERS_LIST_STORAGE_KEY,
  ORDERS_LIST_QUERY_KEYS,
  parsePositiveInt,
  getFiltersFromSearchParams,
  sanitizeStoredFilters,
  readStoredOrdersListViewState,
  hasOrdersQueryState,
  getInitialOrdersListViewState,
} from "./ordersFilterTypes";
import type { OrderDetailsType } from "./types";
import { hasPostPurchaseOffer } from "../../utils/postPurchaseOfferBadge";
import { HeldOrdersBanner } from "./components/HeldOrdersBanner";
import { OrdersModalsContainer } from "./components/OrdersModalsContainer";

import {
  InformationCircleIcon,
  StarIcon,
  ExclamationTriangleIcon,
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
  discount?: number | null;
  discountReason?: string | null;
  needsDiscountApproval?: boolean;
  discountApprovalStatus?: string | null;
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
  customerId?: string;
  customerRating?: string;
  customerSuccessScore?: number;
  healthScore?: number | null;
  healthDiagnosis?: string | null;
  deliveryRate?: number | null;
  totalDelivered?: number | null;
  totalFailed?: number | null;
  totalCancelled?: number | null;
  totalAttempts?: number | null;
  totalOrdersCount?: number | null;
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
    customerRating?: string;
  };
  conversation?: {
    id: string;
    status: string;
    channel: string;
  };
  metadata?: {
    source?: string;
    isGuestOrder?: boolean;
    isIncompleteCart?: boolean;
    cartId?: string;
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
  turboReturnReason?: string | null;
  turboDelayReason?: string | null;
  carrierType?: string;
  shipment?: any;
  shipments?: any[];
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
  discount?: string | number | null;
  discountReason?: string | null;
  needsDiscountApproval?: boolean;
  discountApprovalStatus?: string | null;
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
  order?: RawOrder,
): PaymentStatus => {
  const raw = String(value ?? "").trim().toUpperCase();
  const walletProof = (order?.metadata as any)?.walletPaymentProof;
  const isWalletPayment =
    String(order?.paymentMethod || "").trim().toLowerCase() === "wallet";
  const hasScreenshot = Boolean(walletProof?.imageUrl);
  const isRejected =
    String(walletProof?.status || "").toUpperCase() === "REJECTED";
  const walletPaid = isWalletPayment && hasScreenshot && !isRejected;

  switch (raw) {
    case "COMPLETED":
    case "PAID":
      return "completed";
    case "FAILED":
      return "failed";
    case "REFUNDED":
      return "refunded";
    case "PENDING":
      return walletPaid ? "completed" : "pending";
    case "UNAVAILABLE":
    case "UNKNOWN":
    case "":
      return walletPaid
        ? "completed"
        : isGuestOrder
          ? "unavailable"
          : "pending";
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

export type { OrdersFilters, OrdersListViewState };
export { DEFAULT_ORDERS_FILTERS };

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

export interface MerchantOperationsTotals {
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

export interface MerchantOperationsSummary {
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

export interface MerchantSettlementSummary {
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
  { code: "STOCK_SHORTAGE", name: i18n.t('orders.stockShortage'), color: "#F97316" },
  { code: "SHORTAGE_FAILED", name: i18n.t('orders.shortageFailed'), color: "#7C3AED" },
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
  { code: "PENDING", name: i18n.t('orders.paymentStatuses.pending'), color: "#F59E0B" },
  { code: "COMPLETED", name: i18n.t('orders.paymentStatuses.completed'), color: "#10B981" },
  { code: "PARTIALLY_PAID", name: i18n.t('orders.paymentStatuses.partiallyPaid'), color: "#3B82F6" },
  { code: "FAILED", name: i18n.t('orders.paymentStatuses.failed'), color: "#EF4444" },
  { code: "ON_HOLD", name: i18n.t('orders.paymentStatuses.onHold'), color: "#F97316" },
  { code: "REFUNDED", name: i18n.t('orders.paymentStatuses.refunded'), color: "#6B7280" },
  { code: "PARTIALLY_REFUNDED", name: i18n.t('orders.paymentStatuses.partiallyRefunded'), color: "#9CA3AF" },
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
  "STOCK_SHORTAGE",
  "SHORTAGE_FAILED",
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
  "SHORTAGE_FAILED",
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
  const discount =
    typeof order.discount === "string"
      ? parseFloat(order.discount) || 0
      : (order.discount ?? 0);
  const discountReason =
    order.discountReason ||
    (order.metadata as any)?.discountReason ||
    null;
  const discountApprovalStatus =
    order.discountApprovalStatus ||
    (order.metadata as any)?.discountApprovalStatus ||
    null;
  const needsDiscountApproval = Boolean(
    order.needsDiscountApproval ||
    (order.metadata as any)?.needsDiscountApproval
  );
  const calculatedTotal = (subtotal > 0 || shipping > 0)
    ? Math.max(0, subtotal + shipping + tax - discount)
    : 0;

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
    discount,
    discountReason,
    needsDiscountApproval,
    discountApprovalStatus,
    tax,
    shipping,
    total:
      (typeof order.total === "string"
        ? parseFloat(order.total) || 0
        : (order.total ?? 0)) ||
      calculatedTotal,
    paymentMethod: order.paymentMethod || "",
    paymentStatus: normalizePaymentStatus(order.paymentStatus, isGuestOrder, order),
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
    trackingNumber:
      order.trackingNumber ||
      order.metadata?.trackingNumber ||
      order.shipments?.[0]?.trackingNumber ||
      order.turboTrackingNumber ||
      undefined,
    carrierType:
      order.carrierType ||
      order.metadata?.shippingCarrier ||
      order.shipments?.[0]?.carrierType ||
      (order.turboTrackingNumber ? "TURBO" : undefined),
    shipment: order.shipment || order.shipments?.[0] || undefined,
    shipments: order.shipments || [],
    notes: order.notes || "",
    createdAt: order.createdAt || new Date().toISOString(),
    conversationId: order.conversationId || undefined,
    updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
    // Enhanced fields
    confidence: order.confidence || order.metadata?.confidence,
    extractionMethod:
      order.extractionMethod || order.metadata?.extractionMethod,
    customer: order.customer,
    customerId: order.customerId || order.customer?.id,
    customerRating: order.customerRating || order.customer?.customerRating,
    customerSuccessScore: (order as any).customerSuccessScore ?? (order as any).healthScore ?? null,
    healthScore: (order as any).healthScore ?? (order as any).customer?.healthScore ?? null,
    healthDiagnosis: (order as any).healthDiagnosis ?? null,
    deliveryRate: (order as any).deliveryRate ?? order.customer?.deliveryRate ?? (order as any).customerDeliveryRate ?? null,
    totalDelivered: (order as any).totalDelivered ?? order.customer?.totalDelivered ?? null,
    totalFailed: (order as any).totalFailed ?? null,
    totalCancelled: (order as any).totalCancelled ?? null,
    totalAttempts: (order as any).totalAttempts ?? (order as any).totalOrdersCount ?? order.customer?.totalOrdersCount ?? null,
    totalOrdersCount: (order as any).totalOrdersCount ?? order.customer?.totalOrdersCount ?? null,
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
  "customerRating",
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
  if (typeof order.total === "number" && order.total > 0) {
    return order.total;
  }
  const subtotal = typeof order.subtotal === "number" ? order.subtotal : 0;
  const shipping = typeof order.shipping === "number" ? order.shipping : 0;
  const tax = typeof order.tax === "number" ? order.tax : 0;
  const discount = typeof order.discount === "number" ? order.discount : 0;

  return Math.max(0, subtotal + shipping + tax - discount);
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

// Filter constants and parsePositiveInt imported from ./ordersFilterTypes

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

export const formatMerchantPieces = (value: string | number | undefined | null) =>
  Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 0,
  });

export const payoutStatusLabels: Record<string, string> = {
  PENDING: i18n.t('orders.pendingWithdrawal'),
  PROCESSED: i18n.t('orders.transferred'),
  FAILED: i18n.t('orders.transferFailed'),
  CANCELLED: i18n.t('orders.cancelled'),
};

export const getMerchantOperationsTotals = (
  summary?: MerchantOperationsSummary | null,
): MerchantOperationsTotals => ({
  ...EMPTY_MERCHANT_OPERATIONS_TOTALS,
  ...(summary?.summary || {}),
});

// Filter search and state helpers imported from ./ordersFilterTypes

const Orders: React.FC = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialListViewState = useRef<OrdersListViewState | null>(null);
  if (!initialListViewState.current) {
    initialListViewState.current = getInitialOrdersListViewState(searchParams);
  }
  const restoredListViewState = initialListViewState.current!;

  const initialCacheKey = useMemo(
    () => [
      "orders-page-cache",
      user?.companyId || company?.id || "default",
      restoredListViewState.page,
      restoredListViewState.limit,
      { ...restoredListViewState.filters, search: restoredListViewState.filters.search },
    ],
    [user?.companyId, company?.id, restoredListViewState]
  );
  const initialCachedData = queryClient.getQueryData<{
    orders: Order[];
    totalPages: number;
    totalOrders: number;
  }>(initialCacheKey);

  const [orders, setOrders] = useState<Order[]>(() => initialCachedData?.orders || []);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const [loading, setLoading] = useState(() => !initialCachedData?.orders?.length);
  const [ordersLoadError, setOrdersLoadError] = useState<string | null>(null);
  const isAdmin = ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "MANAGER"].includes(
    user?.role || "",
  );
  const isMerchant = user?.role === "MERCHANT";
  const canSelectOrders = isAdmin && !isMerchant;
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const fetchOrdersRef = useRef<() => Promise<void>>(async () => undefined);
  const [page, setPage] = useState(restoredListViewState.page);
  const [limit, setLimit] = useState(restoredListViewState.limit);
  const [totalOrders, setTotalOrders] = useState(() => initialCachedData?.totalOrders || 0);
  const [totalPages, setTotalPages] = useState(() => initialCachedData?.totalPages || 0);
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
  const [activeCarriers, setActiveCarriers] = useState<
    Array<{ id: string; name?: string; slug?: string; providerKey?: string; isActive?: boolean }>
  >([]);

  const [filters, setFilters] = useState<OrdersFilters>(
    restoredListViewState.filters,
  );
  // Debounced search: the input updates filters.search instantly (responsive
  // typing) while list fetches wait for a 300ms pause — one request per query
  // instead of one per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);
  const effectiveFilters = useMemo<OrdersFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );
  // Keep a ref to the latest filters so the socket listeners (which only
  // re-subscribe on [socket, isConnected, page]) can read current filter
  // state without re-binding the listeners on every filter change.
  const filtersRef = useRef<OrdersFilters>(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  const [showIncompleteInOrders, setShowIncompleteInOrders] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

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

  const isTrashView =
    Array.isArray(filters.status) &&
    filters.status.some((s) => s.toLowerCase() === "trash");

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
    filters.merchantId.length > 0 ||
      filters.fulfillmentSource.length > 0 ||
      filters.merchantOperationStatus.length > 0 ||
      filters.merchantSettlementStatus.length > 0,
  );
  const affiliateFilterIsActive = filters.affiliateId.length > 0;
  const canShowUnifiedOperationFilters = isAdmin && !isMerchant;
  const sourceFilterIsActive = filters.sourceType.length > 0;
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

      if (key === "onlyPostPurchaseOffer") {
        if (value) {
          params.onlyPostPurchaseOffer = "true";
        }
        return;
      }

      if (typeof value === "string" && value) {
        params[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        params[key] = value.join(",");
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
        if (key === "onlyUnseen" || key === "onlyPostPurchaseOffer") {
          return count + (value ? 1 : 0);
        }

        if (Array.isArray(value)) {
          return count + value.length;
        }

        if (!value) return count;
        return count + 1;
      }, 0),
    [filters],
  );
  const advancedFilterCount = useMemo(() => {
    let count = 0;

    if (filters.status.length > 0) count += filters.status.length;
    if (filters.paymentStatus.length > 0) count += filters.paymentStatus.length;
    if (filters.sourceType.length > 0) count += filters.sourceType.length;
    if (filters.merchantId.length > 0) count += filters.merchantId.length;
    if (filters.affiliateId.length > 0) count += filters.affiliateId.length;
    if (filters.fulfillmentSource.length > 0) count += filters.fulfillmentSource.length;
    if (filters.merchantOperationStatus.length > 0) count += filters.merchantOperationStatus.length;
    if (filters.merchantSettlementStatus.length > 0) count += filters.merchantSettlementStatus.length;
    if (filters.extractionMethod) count += 1;
    if (filters.minConfidence) count += 1;
    if (filters.timeRange || filters.startDate || filters.endDate) count += 1;

    return count;
  }, [filters]);
  const hasCustomDateFilters = Boolean(
    filters.timeRange === "custom" || filters.startDate || filters.endDate,
  );

  // Active advanced filters are surfaced via FilterChips while the panel stays
  // collapsed — no auto-open. Users expand deliberately with the فلاتر toggle.

  // Socket.IO Integration
  const { socket, isConnected } = useSocket();

  const companyId = user?.companyId || company?.id || "default";

  useEffect(() => {
    let isMounted = true;

    const fetchOrderStatuses = async () => {
      try {
        const cacheKey = ["order-statuses", companyId];
        let fetchedStatuses = queryClient.getQueryData<Array<Partial<OrderStatusDefinition> & { statusType?: string }>>(cacheKey);

        if (!fetchedStatuses || fetchedStatuses.length === 0) {
          const response = await apiClient.get("/order-status", {
            _skipErrorToast: true,
          });
          if (!response.data?.success) {
            return;
          }
          fetchedStatuses = Array.isArray(response.data.data)
            ? (response.data.data as Array<Partial<OrderStatusDefinition> & { statusType?: string }>)
            : [];
          if (fetchedStatuses.length > 0) {
            queryClient.setQueryData(cacheKey, fetchedStatuses);
          }
        }

        // 🛡️ (deleted-status-dropdowns): رد الـ API هو مصدر الحقيقة — الحالات
        // الافتراضية المدمجة كانت بترجّع حالات التاجر حذفها من إدارة الحالات.
        // الـ defaults دلوقتي rescue فقط لو الرد فاضي (فشل/شركة جديدة).
        const useDefaults = fetchedStatuses.length === 0;
        const mergedOrderStatuses = new Map(
          useDefaults
            ? DEFAULT_ORDER_STATUSES.map((status) => [status.code, status])
            : [],
        );
        const mergedPaymentStatuses = new Map(
          useDefaults
            ? DEFAULT_PAYMENT_STATUSES.map((status) => [status.code, status])
            : [],
        );

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
  }, [companyId]);

  useEffect(() => {
    if (!isAdmin || isMerchant) {
      setMerchantOptions([]);
      setAffiliateOptions([]);
      return;
    }

    let isMounted = true;

    const fetchUnifiedOperationOptions = async () => {
      const cacheKey = ["unified-operation-options", companyId];
      const cached = queryClient.getQueryData<{ merchants: MerchantFilterOption[]; affiliates: AffiliateFilterOption[] }>(cacheKey);
      if (cached) {
        if (isMounted) {
          setMerchantOptions(cached.merchants || []);
          setAffiliateOptions(cached.affiliates || []);
        }
        return;
      }

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

      const merchants =
        merchantsResult.status === "fulfilled" &&
        merchantsResult.value.data.success &&
        Array.isArray(merchantsResult.value.data.data)
          ? merchantsResult.value.data.data
          : [];
      const affiliates =
        affiliatesResult.status === "fulfilled" &&
        affiliatesResult.value.data.success &&
        Array.isArray(affiliatesResult.value.data.data)
          ? affiliatesResult.value.data.data
          : [];

      queryClient.setQueryData(cacheKey, { merchants, affiliates });
      setMerchantOptions(merchants);
      setAffiliateOptions(affiliates);

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

  }, [isAdmin, isMerchant, companyId]);
 
  useEffect(() => {
    if (!canSelectOrders) return;
    let isMounted = true;
    const fetchActiveCarriers = async () => {
      const cacheKey = ["active-carriers", companyId];
      const cached = queryClient.getQueryData<Array<{ id: string; name?: string; slug?: string; providerKey?: string; isActive?: boolean }>>(cacheKey);
      if (cached && cached.length > 0) {
        if (isMounted) setActiveCarriers(cached);
        return;
      }

      try {
        let activeList: Array<{ id: string; name?: string; slug?: string; providerKey?: string; isActive?: boolean }> = [];
        try {
          const res = await apiClient.get<{ success: boolean; data?: typeof activeList }>(
            "/shipping-companies/active-carriers",
            { _skipErrorToast: true } as any,
          );
          if (res.data?.success && Array.isArray(res.data.data)) {
            activeList = res.data.data;
          }
        } catch {
          const fallbackRes = await apiClient.get<{ success: boolean; data?: typeof activeList }>(
            "/shipping-companies?status=active&all=true",
            { _skipErrorToast: true } as any,
          );
          if (fallbackRes.data?.success && Array.isArray(fallbackRes.data.data)) {
            activeList = fallbackRes.data.data.filter((c) => c.isActive);
          }
        }
        if (!isMounted) return;
        queryClient.setQueryData(cacheKey, activeList);
        setActiveCarriers(activeList);
      } catch {
        // Silently ignore
      }
    };
    void fetchActiveCarriers();
    return () => {
      isMounted = false;
    };
  }, [canSelectOrders, companyId]);

  useEffect(() => {
    const selectedMerchantId = filters.merchantId[0] || "";
    if (!isAdmin || isMerchant || filters.merchantId.length !== 1 || !selectedMerchantId) {
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
        }>(`/merchants/${selectedMerchantId}/settlement-summary`, {
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

    const hasActiveFilters = () => {
      const f = filtersRef.current;
      return Boolean(
        f.status.length > 0 ||
        f.paymentStatus.length > 0 ||
        f.sourceType.length > 0 ||
        f.merchantId.length > 0 ||
        f.affiliateId.length > 0 ||
        f.fulfillmentSource.length > 0 ||
        f.merchantOperationStatus.length > 0 ||
        f.merchantSettlementStatus.length > 0 ||
        f.search ||
        f.startDate ||
        f.endDate ||
        f.onlyUnseen ||
        f.onlyPostPurchaseOffer,
      );
    };

    // Listen for new orders
    const handleNewOrder = (newOrder: RawOrder) => {
      if (page !== 1) return;
      if (hasActiveFilters()) {
        void fetchOrdersRef.current();
        return;
      }
      const transformed = transformOrder(newOrder);
      if (ordersRef.current.some((o) => o.orderNumber === transformed.orderNumber)) {
        return;
      }
      setOrders((prev) => [transformed, ...prev].slice(0, limit));
      setTotalOrders((prev) => prev + 1);
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
    // effectiveFilters (debounced search) — not raw filters — so typing fires
    // one request per paused query instead of one per keystroke.
  }, [page, limit, effectiveFilters]);

  const fetchOrders = useCallback(async () => {
    try {
      const orderListCacheKey = [
        "orders-page-cache",
        companyId,
        page,
        limit,
        effectiveFilters,
      ];
      const cached = queryClient.getQueryData<{
        orders: Order[];
        totalPages: number;
        totalOrders: number;
      }>(orderListCacheKey);

      if (cached && cached.orders.length > 0) {
        setOrders(cached.orders);
        setTotalPages(cached.totalPages);
        setTotalOrders(cached.totalOrders);
        setLoading(false);
      } else if (ordersRef.current.length === 0) {
        setLoading(true);
      }
      setOrdersLoadError(null);

      // Merchants use the same core Orders screen, scoped by the simple orders API.
      const usesUnifiedOperationFilters = Boolean(
        filters.merchantId.length > 0 ||
          filters.affiliateId.length > 0 ||
          filters.fulfillmentSource.length > 0 ||
          filters.merchantOperationStatus.length > 0 ||
          filters.merchantSettlementStatus.length > 0,
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
          ...(filters.status.length > 0 && {
            status: filters.status.map((s) => s.toUpperCase()).join(","),
          }),
          ...(filters.paymentStatus.length > 0 && {
            paymentStatus: filters.paymentStatus.map((s) => s.toUpperCase()).join(","),
          }),
          ...(filters.sourceType.length > 0 && {
            sourceType: filters.sourceType.join(","),
          }),
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
          ...(filters.onlyPostPurchaseOffer && { onlyPostPurchaseOffer: "true" }),
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
          queryClient.setQueryData(orderListCacheKey, {
            orders: transformedOrders,
            totalPages: nextTotalPages,
            totalOrders: nextTotalOrders,
          });
          setSelectedOrders([]);
          setLastUpdatedAt(new Date());
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

        if (filters.status.length > 0) queryParams.status = filters.status.join(",");
        if (filters.paymentStatus.length > 0)
          queryParams.paymentStatus = filters.paymentStatus.join(",");
        if (filters.sourceType.length > 0) queryParams.sourceType = filters.sourceType.join(",");
        if (filters.merchantId.length > 0) queryParams.merchantId = filters.merchantId.join(",");
        if (filters.affiliateId.length > 0) queryParams.affiliateId = filters.affiliateId.join(",");
        if (filters.fulfillmentSource.length > 0)
          queryParams.fulfillmentSource = filters.fulfillmentSource.join(",");
        if (filters.merchantOperationStatus.length > 0)
          queryParams.merchantOperationStatus = filters.merchantOperationStatus.join(",");
        if (filters.merchantSettlementStatus.length > 0)
          queryParams.merchantSettlementStatus = filters.merchantSettlementStatus.join(",");
        if (filters.search) queryParams.search = filters.search;
        if (filters.startDate) queryParams.startDate = filters.startDate;
        if (filters.endDate) queryParams.endDate = filters.endDate;
        if (filters.onlyUnseen) queryParams.onlyUnseen = "true";
        if (filters.onlyPostPurchaseOffer) queryParams.onlyPostPurchaseOffer = "true";

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
          queryClient.setQueryData(orderListCacheKey, {
            orders: transformedOrders,
            totalPages: nextTotalPages,
            totalOrders: nextTotalOrders,
          });
          setSelectedOrders([]);
          setLastUpdatedAt(new Date());
          setOrdersLoadError(null);
          const metaFlag = (data as { meta?: { showIncompleteCartsInOrders?: boolean } })?.meta;
          if (metaFlag && typeof metaFlag.showIncompleteCartsInOrders === "boolean") {
            setShowIncompleteInOrders(metaFlag.showIncompleteCartsInOrders);
          }
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
    const isPlaceholderName = (name?: string | null) => {
      if (!name) return true;
      const trimmed = name.trim();
      return (
        trimmed.length <= 1 ||
        /^\d+$/.test(trimmed) ||
        trimmed === "New Customer" ||
        trimmed === "Customer Not Specified" ||
        trimmed === "Customer" ||
        trimmed === "عميل غير محدد" ||
        trimmed === "غير محدد"
      );
    };

    if (order.customerName && !isPlaceholderName(order.customerName)) {
      return order.customerName.trim();
    }

    if (order.customer) {
      const fullName =
        `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim();
      if (!isPlaceholderName(fullName)) {
        return fullName;
      }
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
      case "last90":
        startDate = format(subDays(now, 90), "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "last180":
        startDate = format(subDays(now, 180), "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "last365":
        startDate = format(subDays(now, 365), "yyyy-MM-dd");
        endDate = format(now, "yyyy-MM-dd");
        break;
      case "thisYear":
        startDate = format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd");
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
      status: [],
      paymentStatus: [],
      sourceType: [],
      merchantId: [],
      affiliateId: [],
      fulfillmentSource: [],
      merchantOperationStatus: [],
      merchantSettlementStatus: [],
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

  // Apply a saved view: merge the saved filter subset into the current state
  // (keeping any keys the saved view doesn't specify) and reset to page 1.
  const applySavedFilters = (saved: Partial<OrdersFilters>) => {
    setFilters((prev) => ({ ...prev, ...saved }));
    setPage(1);
  };

  const clearAllFilters = () => {
    clearAdvancedFilters();
    setFilters((prev) => ({ ...prev, search: "", onlyUnseen: false, onlyPostPurchaseOffer: false }));
    setPage(1);
  };

  const displayedOrders = useMemo(() => {
    if (!filters.onlyPostPurchaseOffer) return orders;
    return orders.filter(hasPostPurchaseOffer);
  }, [orders, filters.onlyPostPurchaseOffer]);

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
    if (displayedOrders.every((o) => selectedOrders.includes(o.orderNumber))) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(displayedOrders.map((o) => o.orderNumber));
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
      const results = data.data?.results ?? [];
      const failedResults = results.filter((r: Record<string, unknown>) => !r.success);
      const failedCount = failedResults.length;
      const successCount = data.data?.successCount ?? 0;
      const totalRequested = data.data?.totalRequested ?? selectedOrders.length;

      if (successCount > 0) {
        if (failedCount === 0) {
          alert(t(successKey));
        } else {
          const errorSummary = failedResults
            .slice(0, 5)
            .map((r: Record<string, unknown>) => `${t("orders.orderLabel", { defaultValue: "طلب" })} ${r.id}: ${r.error || t('orders.unknownError', { defaultValue: "خطأ غير معروف" })}`)
            .join('\n');
          const moreText = failedCount > 5 ? `\n${t('orders.moreErrors', { count: failedCount - 5, defaultValue: `و ${failedCount - 5} أخطاء أخرى` })}` : '';
          alert(`${t(isTrashView ? 'orders.permanentDeletedOrdersSummary' : 'orders.deletedOrdersSummary', {
            success: successCount,
            total: totalRequested,
            defaultValue: `تمت معالجة ${successCount} من ${totalRequested} بنجاح`
          })}\n\n${t('orders.failedOrdersLabel', { defaultValue: 'الطلبات التي تعذر حذفها' })}:\n${errorSummary}${moreText}`);
        }
        await fetchOrders();
        const failedIds: string[] = failedResults.map((r: Record<string, unknown>) => String(r.id));
        setSelectedOrders(failedIds.length > 0 ? failedIds : []);
      } else {
        const errors: string[] = failedResults.map((r: Record<string, unknown>) => String(r.error ?? ''));
        alert(errors.length > 0 ? errors.join('\n') : data.message || t(failedKey));
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
          const invoiceList = (invoices as GeneratedInvoice[]) || [];
          const guestList = (guestOrders as Array<{ orderId: string; order: OrderDetailsType }>) || [];

          if (invoiceList.length === 0 && guestList.length === 0) {
            alert(t("orders.invoicePrintError"));
          } else {
            // ابنِ URL صفحة الطباعة: فواتير DB عبر ids، وطلبات الضيف عبر sessionStorage
            // (كلا النوعين يُعرض في نفس الصفحة بنفس شريط التقسيم ومكوّن الفاتورة)
            const params = new URLSearchParams();
            if (invoiceList.length > 0) {
              params.set("ids", invoiceList.map((inv) => inv.id).join(","));
            }
            if (guestList.length > 0) {
              const { storeGuestPrintPayload } = await import("./PrintMultipleInvoices");
              const guestKey = storeGuestPrintPayload({
                company: {
                  companyName: user?.company?.name || "",
                  companyPhone: user?.company?.phone || null,
                  companyLogo: user?.company?.logo || null,
                },
                orders: guestList.map((entry) => entry.order as unknown as Parameters<typeof storeGuestPrintPayload>[0]["orders"][number]),
              });
              params.set("guestKey", guestKey);
            }
            window.open(`/orders/invoices/print-multiple${params.toString() ? `?${params.toString()}` : ""}`, "_blank");
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
        // فتح نافذة الطباعة فوراً ضمن تفاعل المستخدم لتجنب حجبها بواسطة مانع النوافذ المنبثقة
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          alert(t("orders.invoiceGenerationError"));
          return;
        }
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
            printWindow.close();
            setSelectedInvoice(invoices[0]);
          } else if (guestOrders && guestOrders.length > 0) {
            // طلب ضيف واحد: اعرضه في صفحة print-multiple الموحّدة (بنفس شريط التقسيم والأكواد)
            printWindow.close();
            const { storeGuestPrintPayload } = await import("./PrintMultipleInvoices");
            const guestKey = storeGuestPrintPayload({
              company: {
                companyName: user?.company?.name || "",
                companyPhone: user?.company?.phone || null,
                companyLogo: user?.company?.logo || null,
              },
              orders: guestOrders.map((entry) => entry.order as unknown as Parameters<typeof storeGuestPrintPayload>[0]["orders"][number]),
            });
            navigate(`/orders/invoices/print-multiple?guestKey=${encodeURIComponent(guestKey)}`);
          } else {
            printWindow.close();
          }
        } else {
          printWindow.close();
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

  const handleBulkCreateQpExpressShipments = async () => {
    if (
      !window.confirm(
        `هل تريد تأكيد إرسال ${selectedOrders.length} طلب إلى شركة كيو بي إكسبريس (QP Express) وتوليد البوالص آلياً؟`
      )
    )
      return;

    try {
      setBulkProcessing(true);
      const response: any = await apiClient.post("/qp-express/bulk/create-shipments", {
        orderIds: selectedOrders,
      });

      if (response.data?.success) {
        const { success, failed, skipped } = response.data.data;
        let message = `تم إنشاء ${success} بوليصة شحن لدى QP Express بنجاح`;
        if (failed > 0) message += `\nفشل: ${failed}`;
        if (skipped > 0) message += `\nتم تخطيها (مشحونة مسبقاً): ${skipped}`;
        alert(message);
        setSelectedOrders([]);
        await fetchOrders();
      } else {
        alert(response.data?.error || "تعذر الشحن الجماعي لدى QP Express");
      }
    } catch (error: unknown) {
      console.error("Error bulk creating QP Express shipments:", error);
      alert(getApiErrorMessage(error, "فشل إنشاء شحنات QP Express المجمعة"));
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkCreateBostaShipments = async () => {
    if (
      !window.confirm(
        `هل تريد تأكيد إرسال ${selectedOrders.length} طلب إلى شركة بوستا (Bosta) وتوليد البوالص آلياً؟`
      )
    )
      return;

    try {
      setBulkProcessing(true);
      const response: any = await apiClient.post("/bosta/bulk/create-shipments", {
        orderIds: selectedOrders,
      });

      if (response.data?.success) {
        const { success, failed, skipped } = response.data.data;
        let message = `تم إنشاء ${success} بوليصة شحن لدى بوستا بنجاح`;
        if (failed > 0) message += `\nفشل: ${failed}`;
        if (skipped > 0) message += `\nتم تخطيها (مشحونة مسبقاً): ${skipped}`;
        alert(message);
        setSelectedOrders([]);
        await fetchOrders();
      } else {
        alert(response.data?.error || "تعذر الشحن الجماعي لدى بوستا");
      }
    } catch (error: unknown) {
      console.error("Error bulk creating Bosta shipments:", error);
      alert(getApiErrorMessage(error, "فشل إنشاء شحنات بوستا المجمعة"));
    } finally {
      setBulkProcessing(false);
    }
  };

  const hasActiveTurbo = useMemo(() => {
    return activeCarriers.some(
      (c) =>
        c.isActive &&
        (c.providerKey === "TURBO" ||
          c.slug === "turbo" ||
          c.name?.toLowerCase().includes("turbo") ||
          c.name?.includes("تربو")),
    );
  }, [activeCarriers]);

  const hasActiveQpExpress = useMemo(() => {
    return activeCarriers.some(
      (c) =>
        c.isActive &&
        (c.providerKey === "QP_EXPRESS" ||
          c.slug === "qp-express" ||
          c.name?.toLowerCase().includes("qp") ||
          c.name?.includes("كيو بي")),
    );
  }, [activeCarriers]);

  const hasActiveBosta = useMemo(() => {
    return activeCarriers.some(
      (c) =>
        c.isActive &&
        (c.providerKey === "BOSTA" ||
          c.slug === "bosta" ||
          c.name?.toLowerCase().includes("bosta") ||
          c.name?.includes("بوستا")),
    );
  }, [activeCarriers]);

  const getUnifiedStatusDisplay = (order: Order, translate: (key: string) => string) => {
    // 🛡️ لو شحنة الطلب مرتجعة في شركة الشحن، نعرض حالة الإرجاع بوضوح حتى لو حالة الطلب الداخلية مختلفة
    const isCarrierReturn = isTurboReturnStatus(order.turboShipmentStatus);
    const display = getOrderStatusDisplay(order);

    if (isCarrierReturn && !isReturnStatusCode(order.status)) {
      const returnLabel = display.secondary?.label
        ? display.secondary.label.replace(/^🚚\s*/, "")
        : "مرتجع بالشركة (تربو)";
      return {
        text: returnLabel,
        labelKey: display.secondary?.labelKey || "orders.turboReturnedToCompany",
        className: "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300",
        style: undefined,
      };
    }

    const effectiveStatusKey =
      (order as any).effectiveStatus ||
      (order as any).customStatusCode ||
      order.status ||
      "";
    const customStyle = getStatusBadgeStyle(effectiveStatusKey);
    // 🛡️ (custom-status-persist): الحالات المخصصة — الباك-إند بيرجّع الكود المخصص
    // والـ registry مش بيعرفه، فكان بيقع على fallback بيعرض الكود الإنجليزي الخام.
    // لو الحالة مخصّصة عند الشركة، نعرض اسمها المعرّف (العربي) من إعداداتها.
    const configuredStatus = orderStatusMap.get(
      normalizeStatusCode(effectiveStatusKey),
    );
    const registryText = display.primary.labelKey
      ? translate(display.primary.labelKey) || display.primary.label
      : display.primary.label;
    const text =
      !display.primary.labelKey && configuredStatus?.name
        ? configuredStatus.name
        : registryText;

    return {
      text,
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
    if (showIncompleteInOrders) {
      const existingCodes = new Set(list.map((s) => normalizeStatusCode(s.code)));
      if (!existingCodes.has("INCOMPLETE")) {
        list.push({
          code: "INCOMPLETE",
          name: getStatusDisplay("INCOMPLETE").label,
        });
      }
      if (!existingCodes.has("LOST")) {
        list.push({
          code: "LOST",
          name: getStatusDisplay("LOST").label,
        });
      }
    }
    filters.status.forEach((raw) => {
      const activeFilter = normalizeStatusCode(raw);
      if (!activeFilter || activeFilter === "TRASH" || activeFilter === "TRASH_ORDER") {
        return;
      }
      const exists = list.some((s) => normalizeStatusCode(s.code) === activeFilter);
      if (!exists) {
        list.push({
          code: activeFilter,
          name: getStatusDisplay(activeFilter).label,
        });
      }
    });
    return list;
  }, [orderStatuses, filters.status, showIncompleteInOrders]);

  const filterablePaymentStatuses = useMemo(() => {
    const list = [...paymentStatuses];
    filters.paymentStatus.forEach((raw) => {
      const activeFilter = normalizeStatusCode(raw);
      if (!activeFilter) return;
      const exists = list.some((s) => normalizeStatusCode(s.code) === activeFilter);
      if (!exists) {
        list.push({
          code: activeFilter,
          name: getPaymentStatusText(activeFilter.toLowerCase()),
        });
      }
    });
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
    const isStorefront =
      order.sourceType === "storefront" ||
      order.extractionMethod === "storefront" ||
      order.orderSource === "STOREFRONT" ||
      order.orderSource === "GUEST_CART" ||
      order.metadata?.source === "storefront" ||
      order.metadata?.isGuestOrder === true;

    if (isStorefront) return t("orders.sourceStorefront", "المتجر");

    const isWoo =
      order.sourceType === "woocommerce" ||
      order.sourceType === "woocommerce_webhook" ||
      order.sourceType === "woo" ||
      order.syncedFromWoo === true;

    if (isWoo) return t("orders.sourceWooCommerce", "وو كومرس");

    if (order.sourceType === "pos") return t("orders.sourcePOS", "نقطة بيع");

    if (
      order.sourceType === "affiliate_direct" ||
      order.orderSource === "AFFILIATE_DIRECT"
    ) {
      return t("orders.sourceAffiliateDirect", "مسوق مباشر");
    }

    if (
      order.sourceType === "manual" ||
      order.extractionMethod === "manual" ||
      order.extractionMethod === "manual_order_modal" ||
      order.extractionMethod === "manual_admin"
    ) {
      return t("orders.sourceManual", "يدوي");
    }

    if (order.sourceType === "import" || order.extractionMethod === "import") {
      return t("orders.sourceImport", "استيراد");
    }

    if (order.extractionMethod === "ai_enhanced") return t("orders.enhancedExtraction", "استخراج محسن");
    if (order.extractionMethod === "ai_basic") return t("orders.basicExtraction", "استخراج بسيط");
    if (order.sourceType === "ai_conversation" || order.conversationId) {
      return t("orders.sourceAutoConversation", "محادثة تلقائية");
    }

    if (typeof order.metadata?.source === "string" && order.metadata.source) {
      return order.metadata.source;
    }
    return t("orders.sourceUnknown", "غير محدد");
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
        toast.error(t("orders.cancellationReasonRequired"));
        return;
      }
    }

    // Snapshot previous state for optimistic rollback
    const previousOrders = [...orders];
    const previousSelectedOrder = selectedOrder ? { ...selectedOrder } : null;
    const displayStatus = normalizeOrderStatus(normalizedStatus);

    // 1. Optimistic Update (Immediate UI response 0ms)
    setOrders((prev) =>
      prev.map((order) =>
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

    try {
      const response = await apiClient.post(
        `/orders-new/simple/${orderNumber}/status`,
        {
          status: normalizedStatus,
          notes,
        },
      );
      const data = response.data;
      if (!data.success) {
        // Rollback
        setOrders(previousOrders);
        if (previousSelectedOrder) setSelectedOrder(previousSelectedOrder);
        toast.error(data.message || t("orders.statusUpdateFailed"));
      }
    } catch (error: unknown) {
      console.error("Error updating status:", error);
      // Rollback
      setOrders(previousOrders);
      if (previousSelectedOrder) setSelectedOrder(previousSelectedOrder);
      const errorMessage = getApiErrorMessage(error, t("orders.updateError"));
      toast.error(t("orders.statusUpdateFailedMsg", { error: errorMessage }));
    }
  };

  const handleUpdatePaymentStatus = async (
    orderNumber: string,
    newStatus: string,
  ) => {
    // Snapshot previous state for optimistic rollback
    const previousOrders = [...orders];
    const previousSelectedOrder = selectedOrder ? { ...selectedOrder } : null;
    const normalizedStatus = normalizePaymentStatus(newStatus, false);

    // 1. Optimistic Update (Immediate UI response 0ms)
    setOrders((prev) =>
      prev.map((order) =>
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

    try {
      const response = await apiClient.post(
        `/orders-new/simple/${orderNumber}/payment-status`,
        {
          paymentStatus: newStatus,
        },
      );
      const data = response.data;
      if (!data.success) {
        // Rollback
        setOrders(previousOrders);
        if (previousSelectedOrder) setSelectedOrder(previousSelectedOrder);
        toast.error(data.message || t("orders.paymentStatusUpdateFailed"));
      }
    } catch (error: unknown) {
      console.error("Error updating payment status:", error);
      // Rollback
      setOrders(previousOrders);
      if (previousSelectedOrder) setSelectedOrder(previousSelectedOrder);
      const errorMessage = getApiErrorMessage(
        error,
        t("orders.paymentUpdateError"),
      );
      toast.error(t("orders.paymentUpdateFailedMsg", { error: errorMessage }));
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
    if (order.metadata?.isIncompleteCart) {
      navigate(`/orders/incomplete/${encodeURIComponent(order.metadata.cartId || order.orderNumber)}`);
      return;
    }
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

  const tableHelpers = useMemo(
    () => ({
      getCustomerDisplayName,
      formatPrice,
      getRelativeTime,
      formatDate,
      getPaymentStatusBadgeStyle,
      getPaymentStatusColor,
      getPaymentStatusText,
      getUnifiedStatusDisplay,
      getConfidenceColor,
      getConfidenceIcon,
      getOrderSourceText,
    }),
    [
      getCustomerDisplayName,
      formatPrice,
      getRelativeTime,
      formatDate,
      getPaymentStatusBadgeStyle,
      getPaymentStatusColor,
      getPaymentStatusText,
      getUnifiedStatusDisplay,
      getConfidenceColor,
      getConfidenceIcon,
      getOrderSourceText,
    ],
  );

  const handleCustomerRatingChange = (orderNumber: string, newRating: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.orderNumber === orderNumber || o.id === orderNumber
          ? {
              ...o,
              customerRating: newRating,
              customer: o.customer
                ? { ...o.customer, customerRating: newRating }
                : undefined,
            }
          : o
      )
    );
  };

  return (
    <div
      data-orders-page="true"
      className="orders-page-root flex-1 h-full min-h-0 overflow-y-auto bg-slate-50/60 dark:bg-zinc-950 px-2 py-2 sm:px-3 sm:py-2.5"
    >
      <div className="w-full max-w-none">
        <HeldOrdersBanner />

        <OrdersToolbar
        filters={filters}
        advancedFilterCount={advancedFilterCount}
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
        onApplyFilters={applySavedFilters}
        onClearAdvancedFilters={clearAdvancedFilters}
        onToggleAdvancedFilters={() => setShowAdvancedFilters((prev) => !prev)}
        onSetQuickDate={setQuickDate}
        onRetry={fetchOrders}
        onRefresh={fetchOrders}
      />

      <OrdersStatsBar
        isAdmin={isAdmin}
        isMerchant={isMerchant}
        merchantId={filters.merchantId[0] || ""}
        merchantSettlementSummary={merchantSettlementSummary}
        merchantSettlementLoading={merchantSettlementLoading}
        merchantSettlementError={merchantSettlementError}
        merchantOptions={merchantOptions}
        formatPrice={formatPrice}
        getFulfillmentSourceText={getFulfillmentSourceText}
        onClearMerchantFilters={() => {
          handleFilterChange("merchantOperationStatus", []);
          handleFilterChange("merchantSettlementStatus", []);
        }}
        onShowDueOrders={() => {
          handleFilterChange("merchantOperationStatus", ["DELIVERED"]);
          handleFilterChange("merchantSettlementStatus", ["PAYABLE"]);
        }}
      />

      {/* Bulk Toolbar */}
      {canSelectOrders && (
        <BulkActionBar
          count={selectedOrders.length}
          statuses={bulkUpdatableStatuses}
          isTrashView={isTrashView}
          busy={bulkProcessing}
          printing={printingInvoices}
          onClearSelection={() => setSelectedOrders([])}
          onStatusChange={handleBulkStatusUpdate}
          onPrintInvoices={handleBulkPrintInvoices}
          onCreateTurboShipments={hasActiveTurbo ? handleBulkCreateTurboShipments : undefined}
          onCreateQpExpressShipments={hasActiveQpExpress ? handleBulkCreateQpExpressShipments : undefined}
          onCreateBostaShipments={hasActiveBosta ? handleBulkCreateBostaShipments : undefined}
          onDelete={handleBulkDelete}
        />
      )}

      {/* Hidden command palette that registers the page-level bulk actions.
          The toolbar already has its own palette trigger; this one is mount-only
          (no trigger button) and just contributes commands to the same global
          keyboard shortcut handler. */}
      <OrdersBulkCommandPalette
        hasActiveTurbo={hasActiveTurbo}
        hasActiveQpExpress={hasActiveQpExpress}
        hasActiveBosta={hasActiveBosta}
        handleBulkPrintInvoices={handleBulkPrintInvoices}
        handleBulkCreateTurboShipments={handleBulkCreateTurboShipments}
        handleBulkCreateQpExpressShipments={handleBulkCreateQpExpressShipments}
        handleBulkCreateBostaShipments={handleBulkCreateBostaShipments}
        handleBulkDelete={handleBulkDelete}
      />

      <OrdersMobileList
        orders={displayedOrders}
        loading={loading}
        ordersLoadError={ordersLoadError}
        selectedOrders={selectedOrders}
        canSelectOrders={canSelectOrders}
        isMerchant={isMerchant}
        activeFilterCount={activeFilterCount}
        search={filters.search}
        density={tableDensity}
        helpers={mobileListHelpers}
        onOpenOrder={handleOpenOrder}
        onToggleSelection={toggleOrderSelection}
        onMarkAsViewed={handleMarkAsViewed}
        onClearFilters={clearAllFilters}
        onCustomerRatingChange={handleCustomerRatingChange}
      />

      <OrdersTable
        orders={displayedOrders}
        loading={loading}
        ordersLoadError={ordersLoadError}
        selectedOrders={selectedOrders}
        canSelectOrders={canSelectOrders}
        isMerchant={isMerchant}
        activeFilterCount={activeFilterCount}
        search={filters.search}
        columns={columnsToRender}
        columnCount={tableColumnCount}
        density={tableDensity}
        page={page}
        totalPages={totalPages}
        totalOrders={totalOrders}
        limit={limit}
        helpers={tableHelpers}
        onOpenOrder={handleOpenOrder}
        onToggleSelection={toggleOrderSelection}
        onToggleAllSelection={toggleAllSelection}
        onMarkAsViewed={handleMarkAsViewed}
        onClearFilters={clearAllFilters}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onDensityChange={changeTableDensity}
        onCustomerRatingChange={handleCustomerRatingChange}
      />

      {!loading && displayedOrders.length > 0 && (
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

      <OrdersModalsContainer
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
        showOrderModal={showOrderModal}
        setShowOrderModal={setShowOrderModal}
        isMerchant={isMerchant}
        orderStatuses={orderStatuses}
        onOrderUpdate={(updatedOrder) => {
          setSelectedOrder(updatedOrder);
          setOrders(
            orders.map((o) =>
              o.orderNumber === updatedOrder.orderNumber ? updatedOrder : o,
            ),
          );
        }}
        selectedInvoice={selectedInvoice}
        setSelectedInvoice={setSelectedInvoice}
      />
    </div>
  );
};

export default Orders;
