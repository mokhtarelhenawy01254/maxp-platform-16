export interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  productColor?: string;
  productSize?: string;
  productDetails?: string;
  productImage?: string;
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
  status: string;
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
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "DUPLICATE_ORDER";
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "UNAVAILABLE";
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
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

  // Turbo Shipping Fields
  turboShipmentId?: string;
  turboTrackingNumber?: string;
  turboShipmentStatus?: string;
  turboLabelUrl?: string;
  turboBranchId?: string;

  // Scheduled Order Fields
  isScheduled?: boolean;
  scheduledDeliveryDate?: string;
  scheduledNotes?: string;
  autoTransitionEnabled?: boolean;
  scheduledTransitionedAt?: string;

  orderNotes?: OrderNote[];

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
}

export interface Government {
  id: number;
  name: string;
}

export interface Area {
  id: number;
  name: string;
}
