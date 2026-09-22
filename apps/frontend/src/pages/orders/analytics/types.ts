export interface OrderMetrics {
  deliveredOrders?: number;
  cancelledOrders?: number;
  returnedOrders?: number;
  pendingOrders?: number;
  shippedOrders?: number;
  deliveryRate?: number;
  cancellationRate?: number;
  returnRate?: number;
  netRealizedRevenue?: number;
  deliveredRevenue?: number;
  returnedRevenue?: number;
  cancelledRevenue?: number;
  codOrdersCount?: number;
  codOrdersRevenue?: number;
  codDeliveredCount?: number;
  codDeliveredRevenue?: number;
  codCollectionRate?: number;
  prepaidOrdersCount?: number;
  prepaidOrdersRevenue?: number;
  prepaidDeliveredCount?: number;
  prepaidDeliveredRevenue?: number;
  prepaidDeliveryRate?: number;
  totalShippingFees?: number;
}

export interface GovernorateDetail {
  name: string;
  ordersCount: number;
  deliveredCount: number;
  cancelledCount: number;
  returnedCount: number;
  revenue: number;
  shippingCost: number;
  deliveryRate: number;
  returnRate: number;
  sharePct: number;
}

export interface ShippingPerformance {
  name: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  inTransitOrders: number;
  deliveryRate: number;
  returnRate: number;
  totalRevenue: number;
  codCollected: number;
  uncollectedCash?: number;
  lostShipping: number;
}

export interface BranchPerformance {
  name: string;
  totalOrders: number;
  dispatchedOrders: number;
  pendingDispatch: number;
  deliveredOrders: number;
  returnedOrders: number;
  cancelledOrders: number;
  deliveryRate: number;
  returnRate: number;
  revenue: number;
}

export interface ActionCenterData {
  delayedShipmentsCount: number;
  delayedShipmentsRevenue: number;
  pendingFulfillmentCount: number;
  uncollectedCodAmount: number;
  prepaidDeliveryRate: number;
  codDeliveryRate: number;
  prepaidAdvantage: number;
}

export interface DailyTrendEntry {
  date: string;
  orders: number;
  revenue: number;
  delivered: number;
  cancelled: number;
  returned: number;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalPieces: number;
  avgPiecesPerOrder: number;
  avgOrdersPerDay: number;
  daysInPeriod: number;
  statusDistribution: Record<string, number>;
  statusPiecesDistribution: Record<string, number>;
  governorateStats: Record<string, number>;
  paymentStats: Record<string, number>;
  metrics?: OrderMetrics;
  actionCenter?: ActionCenterData;
  governorateDetails?: GovernorateDetail[];
  shippingPerformance?: ShippingPerformance[];
  branchPerformance?: BranchPerformance[];
  dailyTrend?: DailyTrendEntry[];
}

export interface SalesProduct {
  productId: string;
  productName: string;
  productSku: string | null;
  productImage: string | null;
  quantitySold: number;
  orderCount: number;
  revenue: number;
  averagePrice: number;
  unitsPerOrder: number;
}

export type PeriodKey =
  | "today"
  | "yesterday"
  | "thisMonth"
  | "lastMonth"
  | "7"
  | "30"
  | "90"
  | "180"
  | "365"
  | "custom";
