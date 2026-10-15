export interface Summary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  shortageFailedCount: number;
  shortageFailedRevenue: number;
  shortageFailedPercentage: string;
  dateRange: { start: string; end: string };
}

export interface StatusRow {
  status: string;
  count: number;
  percentage: string;
}

export interface TrendDay {
  date: string;
  [key: string]: string | number;
}

export interface HourlyRow {
  hour: string;
  count: number;
}

export interface GovernorateRow {
  name: string;
  count: number;
}

export interface PaymentRow {
  method: string;
  count: number;
}

export interface SourceRow {
  source: string;
  count: number;
}

export interface ShortageFailedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  governorate: string;
  createdAt: string;
}

export interface ShortageByProduct {
  product: string;
  ordersCount: number;
  units: number;
  revenue: number;
}

export interface AnalyticsData {
  summary: Summary;
  statusDistribution: StatusRow[];
  trendData: TrendDay[];
  hourlyData: HourlyRow[];
  topGovernorates: GovernorateRow[];
  paymentStats: PaymentRow[];
  sourceStats: SourceRow[];
  recentShortageFailed: ShortageFailedOrder[];
  shortageByProduct?: ShortageByProduct[];
}

export const STATUS_COLORS: Record<string, string> = {
  SHORTAGE_FAILED: "#7C3AED",
  CANCELLED: "#EF4444",
  DELIVERED: "#10B981",
  SHIPPED: "#3B82F6",
  PROCESSING: "#6366F1",
  CONFIRMED: "#059669",
  PENDING: "#F59E0B",
  STOCK_SHORTAGE: "#F97316",
  RETURNED: "#EC4899",
  REFUNDED: "#8B5CF6",
  PARTIALLY_DELIVERED: "#14B8A6",
  DUPLICATE_ORDER: "#6B7280",
};

export const PIE_COLORS = [
  "#7C3AED", "#EF4444", "#10B981", "#3B82F6", "#6366F1",
  "#F59E0B", "#F97316", "#EC4899", "#14B8A6", "#6B7280",
];

export const STATUS_LABELS: Record<string, string> = {
  SHORTAGE_FAILED: "عجز نهائي",
  CANCELLED: "ملغي",
  DELIVERED: "تم التسليم",
  SHIPPED: "تم الشحن",
  PROCESSING: "قيد المعالجة",
  CONFIRMED: "مؤكد",
  PENDING: "معلق",
  STOCK_SHORTAGE: "عجز مخزون",
  RETURNED: "مسترجع",
  REFUNDED: "مسترد",
  PARTIALLY_DELIVERED: "تسليم جزئي",
  DUPLICATE_ORDER: "مكرر",
};

export const PAYMENT_LABELS: Record<string, string> = {
  CASH: "كاش عند الاستلام",
  CREDIT_CARD: "بطاقة ائتمان",
  BANK_TRANSFER: "تحويل بنكي",
  PAYPAL: "باي بال",
  STRIPE: "سترايب",
  WALLET: "محفظة رقمية",
  INSTAPAY: "إنستاباي",
  VISA: "فيزا",
  MASTERCARD: "ماستركارد",
  VODAFONE_CASH: "فودافون كاش",
};

export const SOURCE_LABELS: Record<string, string> = {
  storefront: "المتجر",
  ai_conversation: "محادثة ذكية",
  internal_push: "إدخال داخلي",
  woocommerce: "ووكومرس",
  manual: "يدوي",
  REGULAR: "عادي",
  AFFILIATE_REFERRAL: "تسويق بالعمولة (إحالة)",
  AFFILIATE_DIRECT: "تسويق بالعمولة (مباشر)",
  INTERNAL_IMPORT: "استيراد داخلي",
};
