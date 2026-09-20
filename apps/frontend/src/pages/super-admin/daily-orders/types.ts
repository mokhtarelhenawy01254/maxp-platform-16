export interface CompanyOrderStats {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  slug: string | null;
  logo: string | null;
  isActive: boolean;
  currency: string;
  createdAt: string;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  ordersCount: number;
  ordersGMV: number;
  avgOrderValue: number;
  latestOrderAt: string | null;
  statusBreakdown: {
    pending: number;
    confirmed: number;
    inDelivery: number;
    delivered: number;
    cancelled: number;
    other: number;
    raw: Record<string, number>;
  };
}

export interface DailyOrdersSummaryResponse {
  success: boolean;
  meta: {
    period: string;
    timezone: string;
    isSingleDay: boolean;
    startDate: string;
    endDate: string;
    generatedAt: string;
  };
  summary: {
    totalOrders: number;
    totalGMV: number;
    avgOrderValue: number;
    activeCompaniesCount: number;
    totalCompaniesCount: number;
    activeRatePercent: number;
    ordersGrowthPercent: number;
    gmvGrowthPercent: number;
    prevTotalOrders: number;
    prevTotalGMV: number;
    topMerchant: {
      id: string;
      name: string;
      slug: string | null;
      ordersCount: number;
      ordersGMV: number;
    } | null;
  };
  timeline: Array<{
    label: string;
    hour?: number;
    date?: string;
    ordersCount: number;
    gmv: number;
  }>;
  companies: CompanyOrderStats[];
}

export type PeriodType = "today" | "yesterday" | "7d" | "30d" | "month" | "custom";
