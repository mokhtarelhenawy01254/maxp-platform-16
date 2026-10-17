/**
 * الشكل الذي يرجعه bulk-generate لكل طلب ضيف (مطابق لـ mapGuestOrderForPrint في الـ backend).
 * يتم تخزينه في sessionStorage وبناء InvoiceData منه دون الحاجة لصف DB.
 */
export interface GuestOrderPrint {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  city?: string | null;
  governorate?: string | null;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string | null;
  currency?: string;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  total?: number;
  trackingNumber?: string | null;
  turboTrackingNumber?: string | null;
  notes?: string | null;
  metadata?: any;
  shippingAddress?: any;
  items?: Array<{
    productName?: string;
    productSku?: string | null;
    productColor?: string | null;
    productSize?: string | null;
    price?: number;
    quantity?: number;
    total?: number;
    attributes?: any;
    customAttributes?: any;
    customFields?: any;
    metadata?: any;
    carModel?: string | null;
    car_model?: string | null;
  }>;
}

/** بيانات الشركة التي تتركب مع كل طلب ضيف */
export interface GuestPrintCompanyInfo {
  companyName: string;
  companyPhone?: string | null;
  companyLogo?: string | null;
}

/** حمولة الـ sessionStorage تحت مفتاح guestKey: { company, orders } */
export interface GuestPrintPayload {
  company: GuestPrintCompanyInfo;
  orders: GuestOrderPrint[];
}

/** مفتاح prefix موحد لتبادل حمولة طباعة طلبات الضيف عبر sessionStorage */
export const GUEST_PRINT_STORAGE_PREFIX = "maxp:print-guest:";

/** إنشاء مفتاح فريد لدفعة طباعة طلبات ضيف */
export function makeGuestPrintKey(): string {
  return `${GUEST_PRINT_STORAGE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** تخزين حمولة طباعة طلبات الضيف في sessionStorage وإرجاع المفتاح */
export function storeGuestPrintPayload(payload: GuestPrintPayload): string {
  const key = makeGuestPrintKey();
  try {
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.error("Failed storing guest print payload:", e);
  }
  return key;
}

/** تنظيف الملاحظات التلقائية المجمعة */
export function cleanBulkNotes(note: string | null | undefined): string {
  if (!note || typeof note !== "string") return "";
  const trimmed = note.trim();
  if (
    trimmed === "Bulk status update" ||
    trimmed === "Bulk preparation queue update" ||
    trimmed === "Bulk restore" ||
    trimmed === "Bulk move to trash" ||
    /^bulk\s+/i.test(trimmed)
  ) {
    return "";
  }
  return trimmed;
}
