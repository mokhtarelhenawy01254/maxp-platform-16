export interface OrderItem {
  id: string;
  productId?: string;
  variantId?: string | null;
  productName: string;
  productColor?: string;
  productSize?: string;
  productDetails?: string;
  productImage?: string;
  productSku?: string | null;
  price: number;
  quantity: number;
  total: number;
  metadata?: any;
}

export interface OrderNote {
  id: string;
  content: string;
  authorName: string;
  authorId?: string;
  createdAt: string;
  updatedAt?: string;
  author?: {
    id?: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface OrderStatusHistory {
  id: string;
  status: string;
  oldStatus?: string;
  notes?: string;
  reason?: string;
  createdAt: string;
  updatedBy?: string;
  changedBy?: string;
  userName?: string;
}

export interface OrderAttributionData {
  platform?: string;
  source?: string;
  medium?: string;
  campaignName?: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  content?: string;
  term?: string;
  landingPath?: string;
  referrer?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  fbc?: string;
  fbp?: string;
  capturedAt?: string;
  rawParams?: Record<string, string>;
}

export interface OrderDetailsType {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  alternativePhone?: string;
  customerAddress?: string;
  governorate?: string | number;
  city?: string;
  country?: string;
  shippingAddress?: string | object | any; // JSON string or parsed object
  status: string;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "UNAVAILABLE";
  paymentMethod: string;
  walletPaymentProof?: {
    imageUrl?: string;
    walletNumber?: string;
    transferRef?: string;
    status?: string;
    submittedAt?: string;
    verifiedAt?: string;
    rejectReason?: string;
  } | null;
  kashierPayment?: {
    transactionId?: string | null;
    orderReference?: string | null;
    kashierOrderId?: string | null;
    status?: string | null;
    method?: string | null;
    amount?: number | null;
    currency?: string | null;
    payerAccount?: string | null;
    payerType?: string | null;
    vat?: string | number | null;
    sellingRate?: number | null;
    totalSellingFees?: string | number | null;
    settledAmount?: string | number | null;
    transactionResponseCode?: string | null;
    transactionResponseMessage?: string | null;
    confirmedAt?: string | null;
  } | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountReason?: string | null;
  needsDiscountApproval?: boolean;
  discountApprovalStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | null;
  discountApprovedBy?: string | null;
  discountApprovedAt?: string | null;
  discountRejectedBy?: string | null;
  discountRejectedAt?: string | null;
  discountRejectionReason?: string | null;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  confidence?: number;
  extractionMethod?: string;
  conversationId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isViewed?: boolean;
  statusHistory?: OrderStatusHistory[];
  customerRating?: string;
  customerSuccessScore?: number;
  deliveryRate?: number | null;
  totalDelivered?: number | null;
  totalOrdersCount?: number | null;
  totalAttempts?: number | null;
  totalFailed?: number | null;
  totalCancelled?: number | null;
  healthScore?: number | null;
  healthDiagnosis?: string | null;

  // Order Source Fields
  sourceType?: string;
  orderSource?: string;
  createdBy?: string;
  createdByName?: string;
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  conversation?: {
    id: string;
    channel: string;
  };
  affiliateId?: string;
  affiliate?: {
    id: string;
    affiliateCode?: string;
    status?: string;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  metadata?: any;
  merchantOrder?: {
    id?: string;
    merchantId?: string | null;
    merchantName?: string | null;
    merchantEmail?: string | null;
    merchantFulfillmentMode?: string | null;
    status?: string;
    operationStatus?: string | null;
    fulfillmentSource?: string;
    warehouseId?: string | null;
    warehouseName?: string | null;
    shippingCompanyId?: string | null;
    shippingCompanyName?: string | null;
    trackingNumber?: string | null;
    shipmentStatus?: string | null;
    pieces?: number | null;
    merchantAmount?: number | null;
    merchantCommissionAmount?: number | null;
    affiliateCommissionAmount?: number | null;
    settlementStatus?: string | null;
  } | null;

  // Unified Shipping Fields
  trackingNumber?: string | null;
  carrierType?: string | null;

  // Turbo Shipping Fields
  turboShipmentId?: string;
  turboTrackingNumber?: string;
  turboShipmentStatus?: string;
  turboLabelUrl?: string;
  turboBranchId?: string;
  turboCaptainName?: string;
  turboCaptainPhone?: string;
  turboBranchName?: string;
  turboBranchPhone?: string;
  turboDelayReason?: string;
  turboReturnReason?: string;
  turboExpectedBranch?: string;

  // Scheduled Order Fields
  isScheduled?: boolean;
  scheduledDeliveryDate?: string;
  scheduledNotes?: string;
  autoTransitionEnabled?: boolean;
  scheduledTransitionedAt?: string;

  orderNotes?: OrderNote[];
  returnRequests?: any[];

  // Confirmation & Assignment Fields
  confirmedAt?: string | null;
  confirmedBy?: string | null;
  confirmedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatar?: string;
  } | null;
  confirmationNotes?: string | null;
  assignedTo?: string | null;
  assignedBy?: string | null;
  assignedAt?: string | null;
  assignmentStrategy?: string | null;
  assignedToUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatar?: string;
  } | null;
  assignedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatar?: string;
  } | null;

  // Session Details & Customer First Order Metrics
  sessionDetails?: OrderSessionDetailsData | null;
  firstOrderInfo?: CustomerFirstOrderInfo | null;
  customerHistory?: CustomerOrderHistoryData | null;
}

export interface Government {
  id: number;
  name: string;
}

export interface Area {
  id: number;
  name: string;
}

export interface OrderSessionPageVisit {
  path: string;
  title?: string;
  timestamp: string;
}

export interface OrderSessionDetailsData {
  ip?: string | null;
  ipGovernorate?: string | null;
  ipCity?: string | null;
  ipCountry?: string | null;
  trafficSource?: {
    platform?: string;
    source: string;
    medium?: string;
    campaignName?: string;
    campaignId?: string;
    adSetId?: string;
    adId?: string;
    referrer?: string;
    landingPath?: string;
  } | null;
  pagesVisited?: OrderSessionPageVisit[];
  durationSeconds?: number;
  sessionStartedAt?: string;
  sessionCount?: number;
  firstSeenAt?: string;
  sessionId?: string;
  visitorId?: string;
}

export interface CustomerFirstOrderInfo {
  isFirstOrder: boolean;
  firstOrderNumber?: string | null;
  firstOrderAt?: string | null;
  totalOrdersCount: number;
}

export interface CustomerOrderHistoryItem {
  id: string;
  orderNumber: string;
  createdAt: string | null;
  status: string;
  category?: 'DELIVERED' | 'CANCELLED' | 'RETURNED' | 'IN_PROGRESS' | 'PENDING';
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  total: number;
  subtotal?: number;
  shipping?: number;
  currency: string;
  itemsCount: number;
  items: Array<{
    id?: string;
    name: string;
    color?: string | null;
    size?: string | null;
    quantity: number;
    price: number;
    total?: number;
    image?: string | null;
  }>;
  isCurrentOrder: boolean;
}

export interface CustomerOrderHistoryStats {
  totalOrders: number;
  deliveredCount: number;
  cancelledCount: number;
  returnedCount: number;
  inProgressCount: number;
  pendingCount: number;
  deliverySuccessRate: number | null;
  totalDeliveredSpent: number;
  totalAllOrdersValue: number;
  averageOrderValue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  isRepeatCustomer: boolean;
}

export interface CustomerOrderHistoryData {
  stats: CustomerOrderHistoryStats;
  orders: CustomerOrderHistoryItem[];
  customerSummary?: {
    matchedBy?: string[];
    customerName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
}


