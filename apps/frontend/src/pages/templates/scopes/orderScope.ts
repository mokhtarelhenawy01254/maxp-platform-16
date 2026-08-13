import type { ApiLike } from "../types";
import type { TemplateScopeConfig, EventRow } from "../types";

/**
 * نطاق الأوردرز — /orders/status-templates
 * بيحافظ على نفس السلوك والـ endpoints الحالية بالضبط.
 */

const INCOMPLETE_CART_EVENT_TYPE = "INCOMPLETE_CART_FIRST_APPEARANCE";

const ORDER_VARIABLES = [
  { var: "{{customerName}}", desc: "اسم العميل" },
  { var: "{{customerPhone}}", desc: "رقم هاتف العميل" },
  { var: "{{orderNumber}}", desc: "رقم الطلب" },
  { var: "{{orderDate}}", desc: "تاريخ الطلب" },
  { var: "{{orderItems}}", desc: "تفاصيل المنتجات (الاسم، اللون، المقاس، الكمية)" },
  { var: "{{status}}", desc: "اسم الحالة النصي (مثال: قيد المعالجة)" },
  { var: "{{total}}", desc: "إجمالي الطلب" },
  { var: "{{subtotal}}", desc: "المجموع الفرعي" },
  { var: "{{shipping}}", desc: "قيمة الشحن" },
  { var: "{{currency}}", desc: "العملة (مثال: EGP)" },
  { var: "{{trackingNumber}}", desc: "رقم التتبع" },
  { var: "{{trackingLink}}", desc: "رابط تتبع الطلب" },
  { var: "{{estimatedDays}}", desc: "الأيام التقديرية للشحن" },
  { var: "{{reason}}", desc: "سبب الإلغاء أو الرفض" },
];

const DEFAULT_TEMPLATE_CONTENT = `مرحباً {{customerName}} 👋

نود إعلامك أن حالة طلبك رقم {{orderNumber}} قد تغيرت إلى: *{{status}}*

{{orderItems}}
شكراً لتعاملك معنا! ✨`;

const META_TO_LOCAL_DEFAULT_ORDER: string[] = [
  "customerName",
  "orderNumber",
  "orderItems",
  "total",
  "currency",
  "customerPhone",
  "orderDate",
  "subtotal",
  "shipping",
  "trackingNumber",
  "trackingLink",
  "estimatedDays",
  "reason",
];

const ORDER_STATUS_TO_EVENT_TYPE: Record<string, string> = {
  CONFIRMED: "ORDER_CONFIRMED",
  PROCESSING: "ORDER_PROCESSING",
  SHIPPED: "ORDER_SHIPPED",
  OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "ORDER_CANCELLED",
  RETURNED: "ORDER_RETURNED",
  PARTIALLY_RETURNED: "ORDER_RETURNED",
  REFUNDED: "ORDER_REFUNDED",
  PARTIALLY_REFUNDED: "PARTIAL_REFUND",
  EXCHANGED: "ORDER_RETURNED",
};

function eventLabel(eventType: string): string {
  const cleaned = eventType.replace(/^ORDER_/, "").replace(/_/g, " ");
  return cleaned || eventType;
}

export const orderScopeConfig: TemplateScopeConfig = {
  scope: "orders",
  documentTitle: "قوالب الواتساب للحالات",
  title: "قوالب الواتساب للحالات",
  description: "إدارة قوالب رسائل الواتساب المرتبطة بحالات الطلبات",
  variableSyntax: "double",
  variables: ORDER_VARIABLES,
  sampleVariables: {
    customerName: "أحمد محمد",
    orderNumber: "ORD-12345",
    customerPhone: "01001234567",
    total: "500",
    currency: "EGP",
    itemCount: "3",
    orderItems: "1. تيشيرت أحمر | المقاس: L | الكمية: 2",
    status: "قيد التجهيز",
    trackingNumber: "TRK-98765",
    trackingLink: "https://maxp.online/track/TRK-98765",
    estimatedDays: "2-3",
  },
  metaToLocalDefaultOrder: META_TO_LOCAL_DEFAULT_ORDER,
  defaultContent: DEFAULT_TEMPLATE_CONTENT,
  eventLabelResolver: eventLabel,

  loadEvents: async (api: ApiLike): Promise<EventRow[]> => {
    const res = await api.get<{ success?: boolean; data?: EventRow[] }>("/order-status/with-templates");
    return res.data?.data || [];
  },

  toggleNotify: async (api: ApiLike, row: EventRow): Promise<void> => {
    const nextValue = !row.notifyCustomer;
    if (row.code === INCOMPLETE_CART_EVENT_TYPE) {
      await api.put("/whatsapp/notifications/settings", {
        incompleteCartImmediateMessage: nextValue,
      });
    } else {
      await api.put(`/order-status/${row.id}`, {
        notifyCustomer: nextValue,
      });
    }
  },

  templateCrudBase: "/whatsapp/notifications/templates",
  metaOpsBase: "/whatsapp-notifications/templates",

  resolveCategory: (row: EventRow): string =>
    row.code === INCOMPLETE_CART_EVENT_TYPE ? "ABANDONED_CART" : "ORDERS",

  gateCreateOnNotify: true,

  tabs: [
    { key: "all", label: "الكل", kind: "list", count: (rows) => rows.filter((r) => !r.isNonNotifiable).length },
    { key: "order", label: "الطلبات", kind: "list", filter: (r) => r.statusType === "order", count: (rows) => rows.filter((r) => r.statusType === "order" && !r.isNonNotifiable).length },
    { key: "payment", label: "الدفع", kind: "list", filter: (r) => r.statusType === "payment", count: (rows) => rows.filter((r) => r.statusType === "payment" && !r.isNonNotifiable).length },
    { key: "preparation", label: "التجهيز", kind: "list", filter: (r) => r.statusType === "preparation", count: (rows) => rows.filter((r) => r.statusType === "preparation" && !r.isNonNotifiable).length },
    { key: "shipping", label: "الشحن", kind: "list", filter: (r) => r.statusType === "shipping", count: (rows) => rows.filter((r) => r.statusType === "shipping" && !r.isNonNotifiable).length },
    { key: "incomplete", label: "رسائل الأوردر غير المكتمل", kind: "list", filter: (r) => r.statusType === "incomplete", count: (rows) => rows.filter((r) => r.statusType === "incomplete" && !r.isNonNotifiable).length },
    { key: "reports", label: "تقارير الحالات", kind: "reports", isSpecial: true },
    { key: "settings", label: "الإعدادات", kind: "settings", isSpecial: true },
  ],

  features: {
    enableButtons: true,
    enableHeaderProductImage: true,
    enableMetaSwitch: true,
    enableMetaMultiBind: true,
    enableTestSender: false,
    enableSchedule: false,
    enableReports: true,
    enableSettings: true,
    enableFilterChips: true,
    enableInternalToggle: true,
    sortModes: ["statusType", "alphabetical", "recent"],
    categoryMode: "auto",
  },

  endpoints: {
    sessions: "/whatsapp/sessions",
    settings: "/whatsapp/notifications/settings",
    report: "/whatsapp/notifications/status-report",
    deliveryPreview: "/whatsapp-notifications/templates/delivery-preview",
    uploadMedia: "/whatsapp-templates/templates/upload-media",
  },
};

export { ORDER_STATUS_TO_EVENT_TYPE, eventLabel };
