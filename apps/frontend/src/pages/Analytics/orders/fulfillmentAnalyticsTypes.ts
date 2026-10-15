export type SortKey =
  | "productName"
  | "totalItems"
  | "totalQuantity"
  | "totalRevenue"
  | "deliveredItems"
  | "cancelledItems"
  | "returnedItems"
  | "deliveryRate"
  | "cancellationRate"
  | "returnRate";

export type SortDir = "asc" | "desc";

export interface FulfillmentProduct {
  productId: string | null;
  productName: string;
  productSku: string | null;
  productImage: string | null;
  totalItems: number;
  totalQuantity: number;
  totalRevenue: number;
  deliveredItems: number;
  deliveredQuantity: number;
  deliveredRevenue: number;
  cancelledItems: number;
  cancelledQuantity: number;
  returnedItems: number;
  returnedQuantity: number;
  otherItems: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  deliveryRate: number;
  cancellationRate: number;
  returnRate: number;
  lostRevenue: number;
}

export interface FulfillmentSummary {
  totalProducts: number;
  totalOrders: number;
  totalItems: number;
  totalQuantity: number;
  deliveredItems: number;
  cancelledItems: number;
  returnedItems: number;
  pendingItems: number;
  deliveryRate: number;
  cancellationRate: number;
  returnRate: number;
  totalRevenue: number;
  deliveredRevenue: number;
  lostRevenue: number;
}

export interface FulfillmentApiResponse {
  success: boolean;
  data?: FulfillmentData;
}

export interface FulfillmentData {
  summary: FulfillmentSummary;
  products: FulfillmentProduct[];
}
