import type { ApiLike } from "../types";
import type { TemplateScopeConfig, EventRow, Template } from "../types";

/**
 * نطاق معمل الأسنان — /dental-lab/notifications
 * إشعارات واتساب لأطباء الأسنان: استلام الحالة / الجاهزية / التسليم / التأخير
 * مع جدولة الإرسال وقنواته (عادي BAILEYS / ميتا META_CLOUD / تلقائي AUTO).
 */

const ALL_DENTAL_EVENTS = [
  "DENTAL_CASE_RECEIVED",
  "DENTAL_CASE_READY",
  "DENTAL_CASE_DELIVERED",
  "DENTAL_CASE_OVERDUE",
];

const DENTAL_VARIABLES = [
  { var: "{doctorName}", desc: "اسم الطبيب" },
  { var: "{caseNumber}", desc: "رقم الحالة" },
  { var: "{patientName}", desc: "اسم المريض" },
  { var: "{workType}", desc: "نوع الشغل" },
  { var: "{shade}", desc: "لون التركيبة (Shade)" },
  { var: "{teeth}", desc: "الأسنان" },
  { var: "{material}", desc: "المادة" },
  { var: "{dueDate}", desc: "تاريخ الاستحقاق" },
  { var: "{totalAmount}", desc: "الإجمالي" },
  { var: "{paidAmount}", desc: "المدفوع" },
  { var: "{remainingAmount}", desc: "المتبقي" },
];

const DENTAL_META_ORDER: string[] = [
  "doctorName",
  "caseNumber",
  "patientName",
  "workType",
  "shade",
  "teeth",
  "material",
  "dueDate",
  "totalAmount",
  "paidAmount",
  "remainingAmount",
];

// خريطة أسماء الأحداث — تُستخدم لعرض التسمية الصحيحة بدل ما بيجي من الـ backend
const EVENT_LABELS: Record<string, string> = {
  DENTAL_CASE_RECEIVED: "استلام الحالة",
  DENTAL_CASE_READY: "الحالة جاهزة",
  DENTAL_CASE_DELIVERED: "تم التسليم",
  DENTAL_CASE_OVERDUE: "تأخير الحالة",
};

const EVENT_TRIGGERS: Record<string, string> = {
  DENTAL_CASE_RECEIVED: "عند استلام الحالة",
  DENTAL_CASE_READY: "عند وصول الحالة لمرحلة الجاهزية",
  DENTAL_CASE_DELIVERED: "عند التسليم",
  DENTAL_CASE_OVERDUE: "تجاوز تاريخ الاستحقاق",
};

const EVENT_COLORS: Record<string, string> = {
  DENTAL_CASE_RECEIVED: "#3B82F6",
  DENTAL_CASE_READY: "#10B981",
  DENTAL_CASE_DELIVERED: "#14B8A6",
  DENTAL_CASE_OVERDUE: "#EF4444",
};

const DEFAULT_CONTENT = `مرحباً {patientName} 👋

دكتور {doctorName}، حالتك رقم {caseNumber} جاهزة للتسليم من معمل الأسنان.

شكراً لثقتك بنا! ✨`;

interface ScheduleRow {
  id: string;
  eventType: string;
  enabled: boolean;
  activeChannel: "AUTO" | "BAILEYS" | "META_CLOUD";
  delayValue: number;
  delayUnit: "HOURS" | "DAYS";
  label: string;
  trigger: string;
}

type TemplateItem = Omit<Template, "id"> & { id: string | null };

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

export const dentalScopeConfig: TemplateScopeConfig = {
  scope: "dental-lab",
  documentTitle: "إشعارات معمل الأسنان",
  title: "إشعارات معمل الأسنان",
  description: "إدارة إشعارات واتساب لأطباء الأسنان — قوالب الرسائل ومواعيد إرسالها للحالات (استلام/جاهزية/تسليم/تأخير)",
  variableSyntax: "single",
  variables: DENTAL_VARIABLES,
  sampleVariables: {
    doctorName: "د. أحمد مصطفى",
    caseNumber: "DL-20260828-0001",
    patientName: "محمد علي",
    workType: "تلبيسة زيركون",
    shade: "A2",
    teeth: "21",
    material: "زيركون",
    dueDate: "2026-09-01",
    totalAmount: "400",
    paidAmount: "0",
    remainingAmount: "400",
  },
  metaToLocalDefaultOrder: DENTAL_META_ORDER,
  defaultContent: DEFAULT_CONTENT,
  defaultCreateButtons: [
    { id: "ready", text: "استلمت الحالة", action: "QUICK_REPLY", type: "QUICK_REPLY" },
  ],
  eventLabelResolver: (eventType: string): string => {
    return EVENT_LABELS[eventType] || eventType.replace(/_/g, " ");
  },

  loadEvents: async (api: ApiLike): Promise<EventRow[]> => {
    const [scheduleRes, templatesRes] = await Promise.all([
      api.get<{ success?: boolean; data?: ScheduleRow[] }>("/dental-lab/notifications/schedule"),
      api.get<{ success?: boolean; templates?: TemplateItem[] }>("/whatsapp-notifications/templates?category=DENTAL_LAB"),
    ]);

    const rows: ScheduleRow[] = scheduleRes.data?.data || [];
    const all: TemplateItem[] = templatesRes.data?.templates || [];
    const eventTemplates = all.filter(
      (t) => !!t.eventType && ALL_DENTAL_EVENTS.includes(t.eventType),
    );

    return rows.map((row, idx): EventRow => {
      const list = eventTemplates.filter((t) => t.eventType === row.eventType);
      const regular = slotTemplate(list, "BAILEYS");
      const meta = slotTemplate(list, "META_CLOUD");
      const regularTemplate: Template | null = regular
        ? {
            ...regular,
            id: regular.id || "",
            name: regular.name || "قالب واتساب",
            content: regular.content || "",
            isActive: regular.isActive ?? true,
            eventType: row.eventType,
          }
        : null;
      const metaTemplate: Template | null = meta
        ? {
            ...meta,
            id: meta.id || "",
            name: meta.name || "قالب ميتا",
            content: meta.content || "",
            isActive: meta.isActive ?? true,
            eventType: row.eventType,
          }
        : null;

      return {
        id: row.id || row.eventType,
        code: row.eventType,
        name: EVENT_LABELS[row.eventType] || row.label || row.eventType,
        color: EVENT_COLORS[row.eventType] || "#6B7280",
        sortOrder: idx,
        statusType: "dental",
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
        trigger: EVENT_TRIGGERS[row.eventType] || row.trigger,
      };
    });
  },

  toggleNotify: async (api: ApiLike, row: EventRow): Promise<void> => {
    await api.put("/dental-lab/notifications/schedule", {
      eventType: row.code,
      enabled: !row.notifyCustomer,
      activeChannel: row.channel || "AUTO",
      delayValue: row.delayValue ?? 0,
      delayUnit: row.delayUnit || "HOURS",
    });
  },

  saveSchedule: async (api: ApiLike, row: EventRow, patch): Promise<void> => {
    await api.put("/dental-lab/notifications/schedule", {
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
    { key: "schedule", label: "جدولة الإشعارات", kind: "schedule", isSpecial: true },
    { key: "cases", label: "قوالب الحالات", kind: "list", filter: (r) => ALL_DENTAL_EVENTS.includes(r.code), count: (rows) => rows.filter((r) => ALL_DENTAL_EVENTS.includes(r.code)).length },
    { key: "reports", label: "تقرير الإرسال", kind: "reports", isSpecial: true },
  ],

  features: {
    enableButtons: true,
    enableHeaderProductImage: false,
    enableMetaSwitch: true,
    enableMetaMultiBind: true,
    enableTestSender: true,
    enableSchedule: true,
    enableReports: true,
    enableSettings: false,
    enableFilterChips: false,
    enableInternalToggle: false,
    sortModes: ["alphabetical", "recent"],
    categoryMode: "auto",
    groupMode: "identity",
  },

  resolveCategory: () => "DENTAL_LAB",

  gateCreateOnNotify: false,

  reportCategories: ["DENTAL_LAB"],

  endpoints: {
    sessions: "/whatsapp/sessions",
    report: "/whatsapp/notifications/status-report",
  },
};