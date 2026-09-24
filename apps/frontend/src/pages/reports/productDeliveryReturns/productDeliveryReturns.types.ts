export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL';

export type BottleneckCategory = 'QUALITY_CATALOG' | 'LOGISTICS' | 'CUSTOMER_SALES' | 'OTHER' | 'NONE';

export interface ReturnReasonItem {
  reason: string;
  category: BottleneckCategory;
  count: number;
  percentage: number;
  lostValue: number;
}

export interface ProductDeliveryReturnsItem {
  productId: string | null;
  productName: string;
  productSku: string | null;
  productImage: string | null;
  categoryName: string;
  stock: number | null;
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  inTransitOrders: number;
  cancelledOrders: number;
  shippedQuantity: number;
  deliveredQuantity: number;
  returnedQuantity: number;
  inTransitQuantity: number;
  cancelledQuantity: number;
  deliveryRate: number;
  shippedDeliveryRate: number;
  returnRate: number;
  inTransitRate: number;
  collectionRate: number;
  expectedRevenue: number;
  collectedRevenue: number;
  lostRevenue: number;
  inTransitRevenue: number;
  lostShippingCost: number;
  healthStatus: HealthStatus;
  primaryBottleneck: BottleneckCategory;
  operationalRecommendation: string;
  returnReasons: ReturnReasonItem[];
}

export interface ProductDeliveryReturnsSummary {
  totalProductsCount: number;
  totalShippedQuantity: number;
  totalDeliveredQuantity: number;
  totalReturnedQuantity: number;
  totalInTransitQuantity: number;
  overallDeliveryRate: number;
  overallReturnRate: number;
  overallCollectionRate: number;
  totalExpectedRevenue: number;
  totalCollectedRevenue: number;
  totalLostRevenue: number;
  totalLostShipping: number;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
}

export interface ProductDeliveryReturnsReportResponse {
  success: boolean;
  data?: {
    summary: ProductDeliveryReturnsSummary;
    products: ProductDeliveryReturnsItem[];
  };
  message?: string;
}
