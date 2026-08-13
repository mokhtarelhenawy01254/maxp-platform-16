import type { ApiLike } from "../types";
import type { TemplateScopeConfig, EventRow, Template } from "../types";

/**
 * نطاق العملاء — /customers/customer-notifications
 * إشعارات الولاء/الكاش باك/التقسيم مع جدولة الإرسال وقنواته.
 */

const EVENT_GROUPS: Record<string, string[]> = {
  loyalty: [
    "LOYALTY_POINTS_AWARDED",
    "LOYALTY_TIER_UPGRADED",
    "LOYALTY_TIER_DOWNGRADED",
    "LOYALTY_POINTS_EXPIRY_WARNING",
    "LOYALTY_POINTS_EXPIRED",
    "LOYALTY_POINTS_REDEEMED",
  ],
  cashback: ["CASHBACK_CREDITED", "CASHBACK_REVERSED"],
  quality: ["CUSTOMER_QUALITY_UPGRADED", "CUSTOMER_QUALITY_DOWNGRADED"],
};

const ALL_EVENTS = Object.values(EVENT_GROUPS).flat();

const CUSTOMER_VARIABLES = [
  { var: "{customerName}", desc: "اسم العميل" },
  { var: "{points}", desc: "عدد النقاط المكتسبة/المستبدلة" },
  { var: "{currentPoints}", desc: "رصيد النقاط الحالي" },
  { var: "{reason}", desc: "سبب الإضافة/الخصم" },
  { var: "{tierName}", desc: "اسم المستوى الجديد" },
  { var: "{expiryDate}", desc: "تاريخ انتهاء الصلاحية" },
  { var: "{programName}", desc: "اسم برنامج الولاء" },
  { var: "{cashAmount}", desc: "قيمة الكاش باك/الاستبدال" },
  { var: "{currency}", desc: "العملة (ج.م)" },
  { var: "{orderNumber}", desc: "رقم الطلب" },
  { var: "{balance}", desc: "رصيد المحفظة الحالي" },
  { var: "{qualityTier}", desc: "تصنيف الجودة (VIP/عالي/متوسط/منخفض)" },
  { var: "{score}", desc: "درجة الجودة من 100" },
];

const CUSTOMER_META_ORDER: string[] = [
  "customerName",
  "points",
  "currentPoints",
  "reason",
  "tierName",
  "expiryDate",
  "programName",
  "cashAmount",
  "currency",
  "orderNumber",
  "balance",
  "qualityTier",
  "score",
];

const DEFAULT_CONTENT = `مرحباً {customerName} 👋\n\n{reason}\n\nشكراً لتعاملك معنا! ✨`;

interface ScheduleRow {
  id: string;
  eventType: string;
  enabled: boolean;
  activeChannel: "AUTO" | "BAILEYS" | "META_CLOUD";
  delayValue: number;
  delayUnit: "HOURS" | "DAYS";
  label: string;
  category: string;
  trigger: string;
  templates: Template[];
}

type TemplateItem = Omit<Template, "id"> & { id: string | null };

// توحيد صيغة المتغيرات: {var} → {{var}} للعرض داخل المحرر الموحد
function normalizeToDouble(content: string): string {
  return content.replace(/\{(\w+)\}/g, "{{$1}}");
}

function slotTemplate(
  list: TemplateItem[],
  slot: "BAILEYS" | "META_CLOUD",
): TemplateItem | undefined {
  if (slot === "META_CLOUD") {
    return list.find((t) => (t.channel || "").toUpperCase() === "META_CLOUD");
  }
  return (
    list.find((t) => (t.channel || "").toUpperCase() === "BAILEYS") ||
    list.find((t) => (t.channel || "").toUpperCase() === "AUTO") ||
    list.find((t) => !t.channel) ||
    undefined
  );
}

export const customerScopeConfig: TemplateScopeConfig = {
  scope: "customers",
  documentTitle: "إشعارات العملاء",
  title: "إشعارات العملاء",
  description: "إدارة إشعارات الولاء والكاش باك وتقسيم العملاء — القوالب ومواعيد الإرسال",
  variableSyntax: "single",
  variables: CUSTOMER_VARIABLES,
  sampleVariables: {
    customerName: "عميلنا الكريم",
    points: "50",
    currentPoints: "120",
    reason: "طلب #10025",
    tierName: "ذهبي",
    expiryDate: "2026-09-01",
    programName: "برنامج الولاء",
    cashAmount: "25.00",
    currency: "ج.م",
    orderNumber: "10025",
    balance: "75.00",
    qualityTier: "VIP",
    score: "85",
  },
  metaToLocalDefaultOrder: CUSTOMER_META_ORDER,
  defaultContent: DEFAULT_CONTENT,
  eventLabelResolver: (eventType: string): string => {
    const cleaned = eventType.replace(/_/g, " ").toLowerCase();
    return cleaned || eventType;
  },

  loadEvents: async (api: ApiLike): Promise<EventRow[]> => {
    const [scheduleRes, templatesRes] = await Promise.all([
      api.get<{ success?: boolean; data?: ScheduleRow[] }>("/hr/customer-loyalty/notifications/schedule"),
      api.get<{ success?: boolean; templates?: TemplateItem[] }>("/whatsapp-notifications/templates"),
    ]);

    const rows: ScheduleRow[] = scheduleRes.data?.data || [];
    const all: TemplateItem[] = (templatesRes.data?.templates || []).filter(
      (t: TemplateItem) => !!t.eventType && ALL_EVENTS.includes(t.eventType),
    );

    return rows.map((row, idx): EventRow => {
      const list = all.filter((t) => t.eventType === row.eventType);
      const regular = slotTemplate(list, "BAILEYS");
      const meta = slotTemplate(list, "META_CLOUD");
      const regularTemplate: Template | null = regular
        ? {
            ...regular,
            id: regular.id || "",
            name: regular.name || "قالب واتساب",
            content: normalizeToDouble(regular.content || ""),
            isActive: regular.isActive ?? true,
            eventType: row.eventType,
          }
        : null;
      const metaTemplate: Template | null = meta
        ? {
            ...meta,
            id: meta.id || "",
            name: meta.name || "قالب ميتا",
            content: normalizeToDouble(meta.content || ""),
            isActive: meta.isActive ?? true,
            eventType: row.eventType,
          }
        : null;

      return {
        id: row.id || row.eventType,
        code: row.eventType,
        name: row.label || row.eventType,
        color: "#6B7280",
        sortOrder: idx,
        statusType: row.category,
        notifyCustomer: row.enabled,
        isSystemStatus: false,
        template: regularTemplate,
        metaTemplate,
        hasTemplate: !!regularTemplate,
        hasMetaTemplate: !!metaTemplate,
        isNonNotifiable: false,
        channel: row.activeChannel,
        delayValue: row.delayValue,
        delayUnit: row.delayUnit,
        trigger: row.trigger,
      };
    });
  },

  toggleNotify: async (api: ApiLike, row: EventRow): Promise<void> => {
    await api.put("/hr/customer-loyalty/notifications/schedule", {
      eventType: row.code,
      enabled: !row.notifyCustomer,
      activeChannel: row.channel || "AUTO",
      delayValue: row.delayValue ?? 0,
      delayUnit: row.delayUnit || "HOURS",
    });
  },

  saveSchedule: async (api: ApiLike, row: EventRow, patch): Promise<void> => {
    await api.put("/hr/customer-loyalty/notifications/schedule", {
      eventType: row.code,
      enabled: patch.enabled,
      activeChannel: patch.activeChannel,
      delayValue: patch.delayValue,
      delayUnit: patch.delayUnit,
    });
  },

  testSend: async (api: ApiLike, phone: string, eventType: string) => {
    const res = await api.post("/whatsapp-notifications/test", { phone, eventType });
    return res.data as { success?: boolean; message?: string; error?: string };
  },

  templateCrudBase: "/whatsapp-notifications/templates",
  metaOpsBase: "/whatsapp-notifications/templates",

  tabs: [
    { key: "schedule", label: "جدول الإشعارات", kind: "schedule", isSpecial: true },
    { key: "loyalty", label: "قوالب الولاء", kind: "list", filter: (r) => EVENT_GROUPS["loyalty"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["loyalty"]!.includes(r.code)).length },
    { key: "cashback", label: "قوالب الكاش باك", kind: "list", filter: (r) => EVENT_GROUPS["cashback"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["cashback"]!.includes(r.code)).length },
    { key: "quality", label: "قوالب التقسيم", kind: "list", filter: (r) => EVENT_GROUPS["quality"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["quality"]!.includes(r.code)).length },
  ],

  features: {
    enableButtons: false,
    enableHeaderProductImage: false,
    enableMetaSwitch: false,
    enableMetaMultiBind: false,
    enableTestSender: true,
    enableSchedule: true,
    enableReports: false,
    enableSettings: false,
    enableFilterChips: false,
    enableInternalToggle: false,
    sortModes: ["alphabetical", "recent"],
    categoryMode: "manual",
    dialogCategoryOptions: [
      { value: "CUSTOMER", label: "UTILITY (مُوصى به للولاء)" },
      { value: "SYSTEM", label: "UTILITY (نظامي)" },
      { value: "MARKETING", label: "MARKETING (ترويجي)" },
      { value: "GENERAL", label: "UTILITY (عام)" },
    ],
  },

  gateCreateOnNotify: false,

  endpoints: {
    sessions: "/whatsapp/sessions",
    uploadMedia: "/whatsapp-templates/templates/upload-media",
  },
};
