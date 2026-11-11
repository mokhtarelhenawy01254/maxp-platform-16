import type { OrdersFilters } from "../ordersFilterTypes";
import type { Order } from "./orderTransformer";
import { getStatusDisplay } from "../../../utils/statusRegistry";

/** حجم الصفحة عند سحب الطلبات للتصدير — أكبر صفحة يقبلها الـAPI */
export const ORDERS_EXPORT_PAGE_SIZE = 200;

/** سقف أمان لعدد الصفوف حتى لا يعلّق المتصفح على شركة ضخمة */
export const ORDERS_EXPORT_MAX_ROWS = 5000;

/**
 * نفس خريطة باراميترات قائمة الطلبات (useOrdersFetchOperations) — أي تغيير هنا
 * لازم يتطابق مع هناك حتى يطابق التصدير ما يراه المستخدم على الشاشة بنفس الفلاتر.
 */
export const buildOrdersQueryParams = (
  filters: OrdersFilters,
  page: number,
  limit: number,
): Record<string, string> => {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  };

  if (filters.status.length > 0) params.status = filters.status.join(",");
  if (filters.paymentStatus.length > 0) params.paymentStatus = filters.paymentStatus.join(",");
  if (filters.sourceType.length > 0) params.sourceType = filters.sourceType.join(",");
  if (filters.merchantId.length > 0) params.merchantId = filters.merchantId.join(",");
  if (filters.affiliateId.length > 0) params.affiliateId = filters.affiliateId.join(",");
  if (filters.companyId && filters.companyId.length > 0) params.companyId = filters.companyId.join(",");
  if (filters.fulfillmentSource.length > 0)
    params.fulfillmentSource = filters.fulfillmentSource.join(",");
  if (filters.merchantOperationStatus.length > 0)
    params.merchantOperationStatus = filters.merchantOperationStatus.join(",");
  if (filters.merchantSettlementStatus.length > 0)
    params.merchantSettlementStatus = filters.merchantSettlementStatus.join(",");
  if (filters.search) params.search = filters.search;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.onlyUnseen) params.onlyUnseen = "true";
  if (filters.onlyPostPurchaseOffer) params.onlyPostPurchaseOffer = "true";

  return params;
};

/** فلتر الاستخلاص متاح فقط في /orders-enhanced، فنصدّر منه بنفس شروط الشاشة */
export const usesEnhancedOrdersApi = (filters: OrdersFilters): boolean =>
  Boolean(filters.extractionMethod || filters.minConfidence);

export const buildEnhancedOrdersQueryParams = (
  filters: OrdersFilters,
  page: number,
  limit: number,
): Record<string, string> => {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
  };

  if (filters.status.length > 0) params.status = filters.status.map((s) => s.toUpperCase()).join(",");
  if (filters.paymentStatus.length > 0)
    params.paymentStatus = filters.paymentStatus.map((s) => s.toUpperCase()).join(",");
  if (filters.sourceType.length > 0) params.sourceType = filters.sourceType.join(",");
  if (filters.search) params.search = filters.search;
  if (filters.extractionMethod) params.extractionMethod = filters.extractionMethod;
  if (filters.minConfidence) params.minConfidence = filters.minConfidence;
  if (filters.startDate) params.dateFrom = filters.startDate;
  if (filters.endDate) params.dateTo = filters.endDate;
  if (filters.onlyUnseen) params.onlyUnseen = "true";
  if (filters.onlyPostPurchaseOffer) params.onlyPostPurchaseOffer = "true";

  return params;
};

const SOURCE_LABELS: Record<string, string> = {
  AFFILIATE_DIRECT: "من شركة مرتبطة",
  WHOLESALE: "موزع جملة",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  affiliate_direct: "مسوق مباشر",
  regular: "مسوق عادي",
  wholesale: "موزع جملة",
  ai_conversation: "محادثة تلقائية",
  manual: "يدوي",
  storefront: "المتجر",
  woocommerce: "ووكومرس",
  pos: "نقطة بيع",
  api: "API",
  import: "استيراد",
  unknown: "غير معروف",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "مدفوع",
  unpaid: "غير مدفوع",
  pending: "قيد الانتظار",
  failed: "فشل",
  refunded: "مسترجع",
  partially_refunded: "مسترجع جزئيًا",
  authorized: "مصرّح",
  cod: "دفع عند الاستلام",
  partial: "مدفوع جزئيًا",
};

/** يحوّل كود حالة الطلب إلى التسمية العربية المعروضة في الشاشة (بدل الكود الخام) */
export const describeOrderStatus = (status: string | null | undefined): string => {
  const code = String(status || "").trim();
  if (!code) return "";
  try {
    return getStatusDisplay(code).label || code;
  } catch {
    return code;
  }
};

/** نفس تسميات فلتر الدفع في الشاشة قدر الإمكان، مع الرجوع للكود لو غير معروف */
export const describePaymentStatus = (paymentStatus: string | null | undefined): string => {
  const code = String(paymentStatus || "").trim();
  if (!code) return "";
  return PAYMENT_STATUS_LABELS[code.toLowerCase()] || code;
};

export const describeOrderSource = (order: Order): string => {
  const orderSource = String(order.orderSource || "").toUpperCase();
  if (SOURCE_LABELS[orderSource]) return SOURCE_LABELS[orderSource];
  if (order.affiliateId) return "مسوق";
  const sourceType = String(order.sourceType || "").trim();
  return SOURCE_TYPE_LABELS[sourceType] || sourceType || "عادي";
};

export const getAffiliateCompanyName = (order: Order): string => {
  const affiliate = (order as unknown as { affiliate?: { user?: { company?: { name?: string } } } })
    .affiliate;
  return affiliate?.user?.company?.name || "";
};

export interface OrdersExportRow {
  "رقم الطلب": string;
  "العميل": string;
  "الهاتف": string;
  "المبلغ الإجمالي": number;
  "حالة الطلب": string;
  "حالة الدفع": string;
  "المصدر": string;
  "الشركة المرتبطة": string;
  "المحافظة": string;
  "عدد الأصناف": number;
  "تاريخ الإنشاء": string;
}

const formatExportDate = (value: string | null | undefined): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

export const buildOrdersExportRows = (orders: Order[]): OrdersExportRow[] =>
  (Array.isArray(orders) ? orders : []).map((order) => ({
    "رقم الطلب": order.orderNumber || order.id || "",
    "العميل": order.customerName || "",
    "الهاتف": order.customerPhone || "",
    "المبلغ الإجمالي": Number(order.total) || 0,
    "حالة الطلب": describeOrderStatus(order.status),
    "حالة الدفع": describePaymentStatus(order.paymentStatus),
    "المصدر": describeOrderSource(order),
    "الشركة المرتبطة": getAffiliateCompanyName(order),
    "المحافظة": order.governorate || order.shippingAddress?.governorate || "",
    "عدد الأصناف": Array.isArray(order.items) ? order.items.length : 0,
    "تاريخ الإنشاء": formatExportDate(order.createdAt),
  }));

export const ordersExportFileName = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `orders-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}.xlsx`;
};
