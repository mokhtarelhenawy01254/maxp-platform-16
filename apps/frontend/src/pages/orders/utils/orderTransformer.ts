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

export interface MerchantOrderScope {
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

export type OrderStatus = string;

export type PaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "unavailable"
  | "PENDING"
  | "COMPLETED"
  | "FAILED";

export interface OrderItem {
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
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountReason?: string | null;
  needsDiscountApproval?: boolean;
  discountApprovalStatus?: string | null;
  tax: number;
  shipping: number;
  total: number | null;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
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
  isViewed?: boolean;
}

export type RawOrderItem = {
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

export type RawOrder = {
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
  turboShipmentStatus?: string;
  turboTrackingNumber?: string;
  carrierType?: string;
  shipment?: any;
  shipments?: any[];
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const normalizeOrderStatus = (value: unknown): OrderStatus => {
  return (String(value ?? "").trim().toLowerCase() || "pending") as OrderStatus;
};

export const normalizePaymentStatus = (
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

export const transformOrder = (order: RawOrder): Order => {
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
    isScheduled: order.isScheduled,
    scheduledDeliveryDate: order.scheduledDeliveryDate,
    scheduledNotes: order.scheduledNotes,
    isViewed: order.isViewed ?? true,
    governorate: order.governorate || "",
    sourceType: order.sourceType || "",
    affiliateId: order.affiliateId || undefined,
    affiliate: order.affiliate,
    merchantOrder: order.merchantOrder,
    turboShipmentStatus: order.turboShipmentStatus || order.metadata?.turboShipmentStatus || undefined,
    turboTrackingNumber: order.turboTrackingNumber || order.metadata?.turboTrackingNumber || undefined,
  };
};

export default transformOrder;
