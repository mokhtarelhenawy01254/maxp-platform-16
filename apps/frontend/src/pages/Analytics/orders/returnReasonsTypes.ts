export interface ReturnReasonAnalyticsSummary {
  totalReturns: number;
  totalOrders: number;
  returnRate: number;
  totalRefundValue: number;
  avgReturnValue: number;
  withReasonCount: number;
  withoutReasonCount: number;
  resolvedCount: number;
  resolutionRate: number;
  topReason: { reason: string; count: number; percentage: number } | null;
  topCategory: { category: string; count: number; percentage: number } | null;
}

export interface ReasonRow {
  id: string;
  reason: string;
  category: string;
  count: number;
  percentage: number;
  refundAmount: number;
  latestAt?: string | null;
}

export interface CategoryRow {
  category: string;
  count: number;
  percentage: number;
  refundAmount: number;
}

export interface StatusRow {
  status: string;
  count: number;
  percentage: number;
}

export interface TrendRow {
  date: string;
  count: number;
  refundAmount: number;
}

export interface ProductRow {
  product: string;
  count: number;
  refundAmount: number;
}

export interface RecentReturn {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  region: string;
  total: number;
  refundAmount: number;
  reason: string;
  category: string;
  status: string;
  receivedStatus: string;
  createdAt?: string | null;
  reviewUrl: string;
}

export interface ReturnReasonsAnalyticsData {
  summary: ReturnReasonAnalyticsSummary;
  reasonBreakdown: ReasonRow[];
  categoryBreakdown: CategoryRow[];
  statusBreakdown: StatusRow[];
  dailyTrend: TrendRow[];
  byProduct: ProductRow[];
  recentReturns: RecentReturn[];
}

export const STATUS_META: Record<
  string,
  { label: string; color: string; pill: string }
> = {
  PENDING: {
    label: "معلق",
    color: "#F59E0B",
    pill: "border-amber-500/20 text-amber-600 bg-amber-500/10",
  },
  APPROVED: {
    label: "معتمد",
    color: "#0EA5E9",
    pill: "border-sky-500/20 text-sky-600 bg-sky-500/10",
  },
  REJECTED: {
    label: "مرفوض",
    color: "#F43F5E",
    pill: "border-rose-500/20 text-rose-600 bg-rose-500/10",
  },
  COMPLETED: {
    label: "مكتمل",
    color: "#10B981",
    pill: "border-emerald-500/20 text-emerald-600 bg-emerald-500/10",
  },
};

export const PALETTE = [
  "#E11D48",
  "#F59E0B",
  "#0EA5E9",
  "#10B981",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
  "#84CC16",
  "#6366F1",
  "#EC4899",
];
