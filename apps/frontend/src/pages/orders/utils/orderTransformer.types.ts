export interface AffiliateFilterOption {
  id: string;
  affiliateId?: string | null;
  affiliateCode?: string;
  status?: string;
  name?: string;
  /** عدد الطلبات التي تحمل affiliateId لهذا المسوق داخل الشركة */
  orderCount?: number;
  /** عدد الطلبات التي لها سجل عمولة */
  commissionOrderCount?: number;
  /** إجمالي العمولة المحتسبة (إن وجدت) */
  totalCommission?: number;
  /** المسوق مسجل في شركة أخرى وتم ربطه بهذه الشركة */
  isOtherCompany?: boolean;
  /** عضو بدور AFFILIATE وليس لديه سجل Affiliate بعد */
  isPendingAffiliateRecord?: boolean;
  /** هل يمكن الفلترة على طلباته (يحتاج affiliateId حقيقي) */
  canFilterOrders?: boolean;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: {
      id?: string;
      name?: string;
    };
  };
}

/** متجر/شركة لديها نشاط تسويقي فعلي (لفلتر المتجر في صفحة الطلبات) */
export interface AffiliateStoreOption {
  companyId: string;
  companyName: string;
  orderCount: number;
  activeMarketersCount: number;
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
  orderSource?: string;
  merchantOrder?: MerchantOrderScope;
  isViewed?: boolean;
  orderSource?: string;
  isWholesale?: boolean;
  wholesaleCustomerId?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdByUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
  } | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignedToUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
  } | null;
  assignmentStrategy?: string | null;
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
  orderSource?: string;
  merchantOrder?: MerchantOrderScope;
  turboShipmentStatus?: string;
  turboTrackingNumber?: string;
  carrierType?: string;
  shipment?: any;
  shipments?: any[];
  orderSource?: string;
  isWholesale?: boolean;
  wholesaleCustomerId?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdByUser?: Order["createdByUser"];
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignedToUser?: Order["assignedToUser"];
  assignmentStrategy?: string | null;
};
