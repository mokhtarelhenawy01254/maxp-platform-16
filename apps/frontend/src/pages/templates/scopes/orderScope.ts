import type { ApiLike } from "../types";
import type { TemplateScopeConfig, EventRow } from "../types";

/**
 * ┘å╪╖╪º┘é ╪º┘ä╪ú┘ê╪▒╪»╪▒╪▓ ΓÇö /orders/status-templates
 * ╪¿┘è╪¡╪º┘ü╪╕ ╪╣┘ä┘ë ┘å┘ü╪│ ╪º┘ä╪│┘ä┘ê┘â ┘ê╪º┘ä┘Ç endpoints ╪º┘ä╪¡╪º┘ä┘è╪⌐ ╪¿╪º┘ä╪╢╪¿╪╖.
 */

const INCOMPLETE_CART_EVENT_TYPE = "INCOMPLETE_CART_FIRST_APPEARANCE";

const ORDER_VARIABLES = [
  { var: "{{customerName}}", desc: "╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä" },
  { var: "{{customerPhone}}", desc: "╪▒┘é┘à ┘ç╪º╪¬┘ü ╪º┘ä╪╣┘à┘è┘ä" },
  { var: "{{orderNumber}}", desc: "╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿" },
  { var: "{{orderDate}}", desc: "╪¬╪º╪▒┘è╪« ╪º┘ä╪╖┘ä╪¿" },
  { var: "{{orderItems}}", desc: "╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä┘à┘å╪¬╪¼╪º╪¬ (╪º┘ä╪º╪│┘à╪î ╪º┘ä┘ä┘ê┘å╪î ╪º┘ä┘à┘é╪º╪│╪î ╪º┘ä┘â┘à┘è╪⌐)" },
  { var: "{{status}}", desc: "╪º╪│┘à ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘å╪╡┘è (┘à╪½╪º┘ä: ┘é┘è╪» ╪º┘ä┘à╪╣╪º┘ä╪¼╪⌐)" },
  { var: "{{total}}", desc: "╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╖┘ä╪¿" },
  { var: "{{subtotal}}", desc: "╪º┘ä┘à╪¼┘à┘ê╪╣ ╪º┘ä┘ü╪▒╪╣┘è" },
  { var: "{{shipping}}", desc: "┘é┘è┘à╪⌐ ╪º┘ä╪┤╪¡┘å" },
  { var: "{{currency}}", desc: "╪º┘ä╪╣┘à┘ä╪⌐ (┘à╪½╪º┘ä: EGP)" },
  { var: "{{trackingNumber}}", desc: "╪▒┘é┘à ╪º┘ä╪¬╪¬╪¿╪╣" },
  { var: "{{trackingLink}}", desc: "╪▒╪º╪¿╪╖ ╪¬╪¬╪¿╪╣ ╪º┘ä╪╖┘ä╪¿" },
  { var: "{{estimatedDays}}", desc: "╪º┘ä╪ú┘è╪º┘à ╪º┘ä╪¬┘é╪»┘è╪▒┘è╪⌐ ┘ä┘ä╪┤╪¡┘å" },
  { var: "{{reason}}", desc: "╪│╪¿╪¿ ╪º┘ä╪Ñ┘ä╪║╪º╪í ╪ú┘ê ╪º┘ä╪▒┘ü╪╢" },
];

const DEFAULT_TEMPLATE_CONTENT = `┘à╪▒╪¡╪¿╪º┘ï {{customerName}} ≡ƒæï

┘å┘ê╪» ╪Ñ╪╣┘ä╪º┘à┘â ╪ú┘å ╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿┘â ╪▒┘é┘à {{orderNumber}} ┘é╪» ╪¬╪║┘è╪▒╪¬ ╪Ñ┘ä┘ë: *{{status}}*

{{orderItems}}
╪┤┘â╪▒╪º┘ï ┘ä╪¬╪╣╪º┘à┘ä┘â ┘à╪╣┘å╪º! Γ£¿`;

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
  documentTitle: "┘é┘ê╪º┘ä╪¿ ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪¡╪º┘ä╪º╪¬",
  title: "┘é┘ê╪º┘ä╪¿ ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪¡╪º┘ä╪º╪¬",
  description: "╪Ñ╪»╪º╪▒╪⌐ ┘é┘ê╪º┘ä╪¿ ╪▒╪│╪º╪ª┘ä ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ ╪º┘ä┘à╪▒╪¬╪¿╪╖╪⌐ ╪¿╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬",
  variableSyntax: "double",
  variables: ORDER_VARIABLES,
  sampleVariables: {
    customerName: "╪ú╪¡┘à╪» ┘à╪¡┘à╪»",
    orderNumber: "ORD-12345",
    customerPhone: "01001234567",
    total: "500",
    currency: "EGP",
    itemCount: "3",
    orderItems: "1. ╪¬┘è╪┤┘è╪▒╪¬ ╪ú╪¡┘à╪▒ | ╪º┘ä┘à┘é╪º╪│: L | ╪º┘ä┘â┘à┘è╪⌐: 2",
    status: "┘é┘è╪» ╪º┘ä╪¬╪¼┘ç┘è╪▓",
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

  // ┘ü╪ª╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ┘ä╪¬┘é╪▒┘è╪▒ ╪º┘ä╪▒╪│╪º╪ª┘ä (┘å┘ü╪│ ╪│┘ä┘ê┘â ╪º┘ä┘Ç backend ╪º┘ä╪ú╪╡┘ä┘è)
  reportCategories: ["ORDERS", "ORDER", "ABANDONED_CART"],

  tabs: [
    { key: "all", label: "╪º┘ä┘â┘ä", kind: "list", count: (rows) => rows.filter((r) => !r.isNonNotifiable).length },
    { key: "order", label: "╪º┘ä╪╖┘ä╪¿╪º╪¬", kind: "list", filter: (r) => r.statusType === "order", count: (rows) => rows.filter((r) => r.statusType === "order" && !r.isNonNotifiable).length },
    { key: "payment", label: "╪º┘ä╪»┘ü╪╣", kind: "list", filter: (r) => r.statusType === "payment", count: (rows) => rows.filter((r) => r.statusType === "payment" && !r.isNonNotifiable).length },
    { key: "preparation", label: "╪º┘ä╪¬╪¼┘ç┘è╪▓", kind: "list", filter: (r) => r.statusType === "preparation", count: (rows) => rows.filter((r) => r.statusType === "preparation" && !r.isNonNotifiable).length },
    { key: "shipping", label: "╪º┘ä╪┤╪¡┘å", kind: "list", filter: (r) => r.statusType === "shipping", count: (rows) => rows.filter((r) => r.statusType === "shipping" && !r.isNonNotifiable).length },
    { key: "incomplete", label: "╪▒╪│╪º╪ª┘ä ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪║┘è╪▒ ╪º┘ä┘à┘â╪¬┘à┘ä", kind: "list", filter: (r) => r.statusType === "incomplete", count: (rows) => rows.filter((r) => r.statusType === "incomplete" && !r.isNonNotifiable).length },
    { key: "reports", label: "╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬", kind: "reports", isSpecial: true },
    { key: "settings", label: "╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬", kind: "settings", isSpecial: true },
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
