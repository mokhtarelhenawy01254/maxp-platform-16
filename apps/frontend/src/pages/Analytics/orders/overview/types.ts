export interface DashboardStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  confirmedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  deliveryRate: number;
  multiPieceOrders: number;
  multiPiecePercentage: number;
  singlePieceOrders: number;
  totalPieces: number;
  codOrders: number;
  prepaidOrders: number;
  lostRevenue: number;
  returnRate: number;
  cancellationRate: number;
  dailyTrend: Array<{ date: string; orders: number; revenue: number }>;
  prevPeriod?: {
    totalOrders?: number;
    revenue?: number;
    purchases?: number;
    cancelledOrders?: number;
    codOrders?: number;
    multiPieceOrders?: number;
    conversionRate?: number;
  } | null;
  regionalPerformance?: Array<{
    region: string;
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    successRate: number;
  }>;
  todayPendingCount?: number;
  todayConfirmsCount?: number;
}

export interface PeriodComparison {
  delta: number | null;
  isPositive: boolean;
  isNeutral: boolean;
}
