import type { ApiLike, TemplateScopeConfig, EventRow, Template } from "../types";

/**
 * نطاق التعليم والسناتر — /admin/education/funnel
 * إشعارات واتساب لطلاب وأولياء أمور ومعلمي الأكاديمية:
 * تسجيل الباقات، جدولة وتأكيد وإلغاء الحصص، تذكيرات المواعيد، تنبيهات رصيد الساعات وقرب انتهاء الباقات.
 */

export const ALL_EDUCATION_EVENTS = [
  "education_enrollment_created",
  "education_session_scheduled",
  "education_session_confirmed",
  "education_session_cancelled",
  "education_session_reminder",
  "education_enrollment_low_hours",
  "education_enrollment_expiring",
  "education_session_scheduled_teacher",
  "education_session_cancelled_teacher",
  "education_session_reminder_teacher",
  "education_enrollment_created_staff",
  "education_demo_day_registered",
  "education_demo_day_reminder_24h",
  "education_demo_day_reminder_2h",
  "education_demo_day_attended_feedback",
  "education_demo_day_no_show",
];

export const EDUCATION_VARIABLES = [
  { var: "{{studentName}}", desc: "اسم الطالب" },
  { var: "{{parentName}}", desc: "اسم ولي الأمر" },
  { var: "{{parentPhone}}", desc: "رقم هاتف ولي الأمر" },
  { var: "{{packageName}}", desc: "اسم الباقة التعليمية" },
  { var: "{{subjectName}}", desc: "اسم المادة الدراسية" },
  { var: "{{sessionDate}}", desc: "تاريخ الحصة" },
  { var: "{{sessionTime}}", desc: "وقت وتوقيت الحصة" },
  { var: "{{duration}}", desc: "مدة الحصة المقررة (بالدقائق)" },
  { var: "{{actualDuration}}", desc: "المدة الفعلية للحصة المنفذة" },
  { var: "{{teacherName}}", desc: "اسم المعلم / المدرس" },
  { var: "{{totalHours}}", desc: "إجمالي عدد ساعات الباقة" },
  { var: "{{remainingHours}}", desc: "عدد الساعات المتبقية في الرصيد" },
  { var: "{{amountPaid}}", desc: "المبلغ المدفوع" },
  { var: "{{currency}}", desc: "العملة (مثال: ج.م)" },
  { var: "{{expiryDate}}", desc: "تاريخ انتهاء صلاحية الباقة" },
  { var: "{{eventTitle}}", desc: "عنوان الديمو داي وورشة العمل" },
  { var: "{{eventDate}}", desc: "تاريخ انعقاد الديمو داي" },
  { var: "{{eventTime}}", desc: "توقيت الديمو داي" },
  { var: "{{eventLocation}}", desc: "عنوان الفرع أو رابط الاجتماع" },
  { var: "{{meetLink}}", desc: "رابط الحضور أونلاين (Google Meet)" },
  { var: "{{discountCode}}", desc: "كود الخصم التشجيعي للحاضرين" },
  { var: "{{surveyLink}}", desc: "رابط استبيان التقييم" },
  { var: "{{age}}", desc: "سن الطالب" },
  { var: "{{leadSource}}", desc: "مصدر التسجيل (الإعلان / المحادثة)" },
];

export const EDUCATION_META_ORDER: string[] = [
  "parentName",
  "studentName",
  "packageName",
  "subjectName",
  "totalHours",
  "amountPaid",
  "currency",
  "sessionDate",
  "sessionTime",
  "duration",
  "teacherName",
  "actualDuration",
  "remainingHours",
  "expiryDate",
  "parentPhone",
];

export const EVENT_LABELS: Record<string, string> = {
  education_enrollment_created: "تسجيل جديد في باقة",
  education_session_scheduled: "جدولة حصة جديدة",
  education_session_confirmed: "تأكيد إتمام الحصة",
  education_session_cancelled: "إلغاء حصة",
  education_session_reminder: "تذكير بموعد الحصة",
  education_enrollment_low_hours: "تنبيه رصيد الساعات المنخفض",
  education_enrollment_expiring: "تنبيه قرب انتهاء الباقة",
  education_session_scheduled_teacher: "إشعار المعلم: حصة جديدة",
  education_session_cancelled_teacher: "إشعار المعلم: إلغاء حصة",
  education_session_reminder_teacher: "إشعار المعلم: تذكير بالحصة",
  education_enrollment_created_staff: "إشعار الإدارة: تسجيل جديد",
  education_demo_day_registered: "تأكيد حجز الديمو داي",
  education_demo_day_reminder_24h: "تذكير الديمو داي (قبل 24 ساعة)",
  education_demo_day_reminder_2h: "تذكير الديمو داي (قبل ساعتين)",
  education_demo_day_attended_feedback: "متابعة وتقييم حضور الديمو داي",
  education_demo_day_no_show: "متابعة الغائبين عن الديمو داي",
};

export const EVENT_TRIGGERS: Record<string, string> = {
  education_enrollment_created: "عند تسجيل الطالب في باقة تعليمية جديدة",
  education_session_scheduled: "عند تحديد موعد حصة دراسية جديدة",
  education_session_confirmed: "عند انتهاء وتأكيد حضور الحصة الدراسية",
  education_session_cancelled: "عند إلغاء موعد الحصة الدراسية",
  education_session_reminder: "تذكير تلقائي قبل موعد الحصة بـ 24 ساعة",
  education_enrollment_low_hours: "عند وصول رصيد الساعات المتبقية لحد منخفض",
  education_enrollment_expiring: "قبل انتهاء تاريخ صلاحية الباقة التعليمية",
  education_session_scheduled_teacher: "إشعار للمعلم عند جدولة حصة جديدة",
  education_session_cancelled_teacher: "إشعار للمعلم عند إلغاء الحصة",
  education_session_reminder_teacher: "تذكير تلقائي للمعلم بموعد الحصة",
  education_enrollment_created_staff: "إشعار لإدارة الأكاديمية عند تسجيل طالب جديد",
  education_demo_day_registered: "عند تسجيل ولي الأمر أو الطالب في ورشة العمل التجريبية",
  education_demo_day_reminder_24h: "تذكير تلقائي لولي الأمر قبل موعد الورشة بـ 24 ساعة",
  education_demo_day_reminder_2h: "تذكير أخير لولي الأمر برابط الحضور أو العنوان قبل البدء بساعتين",
  education_demo_day_attended_feedback: "إرسال استبيان وكود خصم للحاضرين بعد انتهاء الورشة",
  education_demo_day_no_show: "إرسال دعوة لإعادة الجدولة لمن لم يحضروا الورشة",
};

export const EVENT_COLORS: Record<string, string> = {
  education_enrollment_created: "#3B82F6",
  education_session_scheduled: "#F59E0B",
  education_session_confirmed: "#10B981",
  education_session_cancelled: "#EF4444",
  education_session_reminder: "#8B5CF6",
  education_enrollment_low_hours: "#F97316",
  education_enrollment_expiring: "#EC4899",
  education_session_scheduled_teacher: "#6366F1",
  education_session_cancelled_teacher: "#DC2626",
  education_session_reminder_teacher: "#7C3AED",
  education_enrollment_created_staff: "#0D9488",
  education_demo_day_registered: "#8B5CF6",
  education_demo_day_reminder_24h: "#3B82F6",
  education_demo_day_reminder_2h: "#F59E0B",
  education_demo_day_attended_feedback: "#10B981",
  education_demo_day_no_show: "#EF4444",
};

export const DEFAULT_TEMPLATES: Record<string, string> = {
  education_enrollment_created: `أهلاً {{parentName}} 🎉

تم تسجيل {{studentName}} في باقة {{packageName}} ✅

📚 المادة: {{subjectName}}
⏰ عدد الساعات: {{totalHours}} ساعة
💰 المدفوع: {{amountPaid}} {{currency}}

سيتم إعلامك بموعد أول حصة قريباً.
نتمنى لكم التوفيق والنجاح الدائم! 🌟`,

  education_session_scheduled: `أهلاً {{parentName}} 📅

تم جدولة حصة جديدة لـ {{studentName}}:

📚 المادة: {{subjectName}}
📆 التاريخ: {{sessionDate}}
⏰ الوقت: {{sessionTime}}
⏱ المدة: {{duration}} دقيقة
👨‍🏫 المدرس: {{teacherName}}

في حال وجود أي استفسار، تواصل معنا. ✨`,

  education_session_confirmed: `تم تأكيد الحصة ✅

تم تأكيد حضور حصة {{studentName}} في مادة {{subjectName}}.
التاريخ: {{sessionDate}}
المدة المنفذة: {{actualDuration}} دقيقة

الساعات المتبقية في الرصيد: {{remainingHours}} ساعة ⏰
شكراً لالتزامكم! ✨`,

  education_session_cancelled: `تم إلغاء الحصة ❌

نود إعلامكم بإلغاء حصة {{studentName}} في {{subjectName}} المقررة يوم {{sessionDate}}.

سنقوم بالتواصل معكم لجدولة حصة بديلة في أقرب وقت. 🌟`,

  education_session_reminder: `تذكير بموعد الحصة ⏰

غداً موعد حصة {{studentName}} في مادة {{subjectName}} الساعة {{sessionTime}}.
المدرس: {{teacherName}}

📌 يرجى التأكد من الحضور في الموعد المحدد ومراجعة الدروس المطلوبة! 📚`,

  education_enrollment_low_hours: `رصيد الساعات أوشك على الانتهاء ⚠️

نحيطكم علماً بأن باقة {{studentName}} في {{subjectName}} المتبقي منها: *{{remainingHours}} ساعة فقط*.

يمكنكم تجديد الباقة أو شحن ساعات إضافية لضمان استمرار الحصص دون انقطاع. 📚`,

  education_enrollment_expiring: `الباقة على وشك الانتهاء ⏳

نود تذكيركم بأن باقة {{studentName}} في {{subjectName}} ستنتهي صلاحيتها في {{expiryDate}}.

الرصيد المتبقي: {{remainingHours}} ساعة.
يرجى التواصل معنا لتجديد الباقة أو استهلاك الساعات المتبقية. 🌟`,

  education_session_scheduled_teacher: `حصة دراسية جديدة 📅

أستاذ {{teacherName}}، تم جدولة حصة جديدة:
الطالب: {{studentName}}
المادة: {{subjectName}}
التاريخ: {{sessionDate}}
الوقت: {{sessionTime}}
المدة: {{duration}} دقيقة`,

  education_session_cancelled_teacher: `تم إلغاء الحصة ❌

أستاذ {{teacherName}}، نود إعلامك بإلغاء حصة الطالب {{studentName}} في {{subjectName}} المقررة يوم {{sessionDate}}.`,

  education_session_reminder_teacher: `تذكير بالحصة ⏰

أستاذ {{teacherName}}، غداً موعد حصة الطالب {{studentName}} في {{subjectName}} الساعة {{sessionTime}}.`,

  education_enrollment_created_staff: `تسجيل جديد في باقة ✅

الطالب: {{studentName}}
ولي الأمر: {{parentName}}
الهاتف: {{parentPhone}}
الباقة: {{packageName}} - {{subjectName}}
عدد الساعات: {{totalHours}} ساعة
المبلغ المدفوع: {{amountPaid}} {{currency}}`,

  education_demo_day_registered: `أهلاً {{parentName}} 🎉

تم تأكيد حجز مقعد لـ {{studentName}} في ورشة العمل التجريبية (Demo Day):
📌 {{eventTitle}} ✅

📅 الموعد: {{eventDate}}
⏰ التوقيت: {{eventTime}}
📍 المكان / الرابط: {{eventLocation}}

نتطلع لحضوركم وتجربة تعليمية مميزة! 🌟`,

  education_demo_day_reminder_24h: `تذكير بموعد الديمو داي ⏰

أهلاً {{parentName}}،
غداً موعد ورشة العمل لـ {{studentName}}:
📌 {{eventTitle}}

⏰ الموعد: {{eventTime}}
📍 المكان / الرابط: {{eventLocation}}

يسعدنا تأكيد حضوركم معنا! ✅`,

  education_demo_day_reminder_2h: `متبقي ساعتان فقط 🚀

أهلاً {{parentName}}،
ورشة {{studentName}} في {{eventTitle}} تبدأ في تمام {{eventTime}}.

📍 رابط الحضور أو العنوان:
{{eventLocation}}

نحن بانتظاركم!`,

  education_demo_day_attended_feedback: `شكراً لحضوركم اليوم! 🌟

سعدنا جداً بمشاركة {{studentName}} في {{eventTitle}}.

🎁 كود خصم خاص 15% عند التسجيل في الكورس الأساسي: {{discountCode}}
(الكود سارٍ لمدة 48 ساعة فقط)

📌 رأيكم يهمنا، شاركونا تقييمكم في دقيقة: {{surveyLink}}`,

  education_demo_day_no_show: `أهلاً {{parentName}} 🤍

افتقدنا حضوركم اليوم في ورشة {{eventTitle}} لـ {{studentName}}.

إذا كنتم ترغبون في إعادة الجدولة وحضور ديمو الأسبوع القادم، يمكنك الرد على هذه الرسالة وسنقوم بحجز مقعدكم فوراً! 🔄`,
};

const DEFAULT_EDUCATION_TEMPLATE = DEFAULT_TEMPLATES.education_enrollment_created;

interface ScheduleRow {
  id: string;
  eventType: string;
  enabled: boolean;
  activeChannel: "AUTO" | "BAILEYS" | "META_CLOUD";
  delayValue: number;
  delayUnit: "HOURS" | "DAYS";
  label: string;
  trigger: string;
  category: string;
}

type TemplateItem = Omit<Template, "id"> & { id: string | null };

function slotTemplate(
  list: TemplateItem[],
  slot: "BAILEYS" | "META_CLOUD"
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

export const educationScopeConfig: TemplateScopeConfig = {
  scope: "education",
  documentTitle: "قوالب رسائل الواتساب للتعليم",
  title: "قوالب رسائل الواتساب للتعليم والسناتر",
  description: "إدارة وتخصيص قوالب رسائل الواتساب المرتبطة بحالات الطلاب، الحصص، الاشتراكات، والتذكيرات",
  variableSyntax: "double",
  variables: EDUCATION_VARIABLES,
  sampleVariables: {
    parentName: "أ. محمد عبد الله",
    studentName: "يوسف محمد",
    parentPhone: "01012345678",
    packageName: "باقة الرياضيات المكثفة",
    subjectName: "رياضيات - ثانوية عامة",
    sessionDate: "2026-11-10",
    sessionTime: "04:30 م",
    duration: "60",
    actualDuration: "60",
    teacherName: "أستاذ طارق السعيد",
    totalHours: "20",
    remainingHours: "6",
    amountPaid: "1200",
    currency: "ج.م",
    expiryDate: "2026-12-31",
  },
  metaToLocalDefaultOrder: EDUCATION_META_ORDER,
  defaultContent: DEFAULT_EDUCATION_TEMPLATE,
  defaultCreateButtons: [
    { id: "confirm", text: "تأكيد الحضور", action: "CONFIRMED", type: "QUICK_REPLY" },
    { id: "reschedule", text: "طلب موعد بديل", action: "RESCHEDULE", type: "QUICK_REPLY" },
  ],
  eventLabelResolver: (eventType: string): string => {
    return EVENT_LABELS[eventType] || eventType.replace(/^education_/, "").replace(/_/g, " ");
  },

  loadEvents: async (api: ApiLike): Promise<EventRow[]> => {
    const [scheduleRes, templatesRes] = await Promise.all([
      api.get<{ success?: boolean; data?: ScheduleRow[] }>("/education/notifications/schedule"),
      api.get<{ success?: boolean; templates?: TemplateItem[] }>("/whatsapp-notifications/templates?category=EDUCATION"),
    ]);

    const scheduleRows: ScheduleRow[] = scheduleRes.data?.data || [];
    const allTemplates: TemplateItem[] = templatesRes.data?.templates || [];

    // Fallback if schedule endpoint returned empty or is initial
    const sourceRows: ScheduleRow[] =
      scheduleRows.length > 0
        ? scheduleRows
        : ALL_EDUCATION_EVENTS.map((ev) => ({
            id: ev,
            eventType: ev,
            enabled: true,
            activeChannel: "AUTO",
            delayValue: 0,
            delayUnit: "HOURS",
            label: EVENT_LABELS[ev] || ev,
            trigger: EVENT_TRIGGERS[ev] || "",
            category: ev.includes("session")
              ? ev.includes("teacher")
                ? "teacher"
                : "sessions"
              : ev.includes("reminder")
              ? "reminders"
              : ev.includes("teacher") || ev.includes("staff")
              ? "teacher"
              : "enrollment",
          }));

    return sourceRows.map((row, idx): EventRow => {
      const list = allTemplates.filter((t) => t.eventType === row.eventType);
      const regular = slotTemplate(list, "BAILEYS");
      const meta = slotTemplate(list, "META_CLOUD");

      const defaultText = DEFAULT_TEMPLATES[row.eventType] || DEFAULT_EDUCATION_TEMPLATE;

      const regularTemplate: Template | null = regular
        ? {
            ...regular,
            id: regular.id || "",
            name: regular.name || EVENT_LABELS[row.eventType] || "قالب واتساب",
            content: regular.content || defaultText,
            isActive: regular.isActive ?? true,
            eventType: row.eventType,
          }
        : {
            id: "",
            name: EVENT_LABELS[row.eventType] || "قالب واتساب",
            content: defaultText,
            isActive: true,
            eventType: row.eventType,
            isDefault: true,
          };

      const metaTemplate: Template | null = meta
        ? {
            ...meta,
            id: meta.id || "",
            name: meta.name || "قالب ميتا بيزنس",
            content: meta.content || defaultText,
            isActive: meta.isActive ?? true,
            eventType: row.eventType,
          }
        : null;

      const category =
        row.category ||
        (row.eventType.includes("teacher") || row.eventType.includes("staff")
          ? "teacher"
          : row.eventType.includes("session") && !row.eventType.includes("reminder")
          ? "sessions"
          : row.eventType.includes("reminder") || row.eventType.includes("low_hours") || row.eventType.includes("expiring")
          ? "reminders"
          : "enrollment");

      return {
        id: row.id || row.eventType,
        code: row.eventType,
        name: EVENT_LABELS[row.eventType] || row.label || row.eventType,
        color: EVENT_COLORS[row.eventType] || "#3B82F6",
        sortOrder: idx,
        statusType: category,
        notifyCustomer: row.enabled,
        isSystemStatus: false,
        template: regularTemplate,
        metaTemplate,
        hasTemplate: !!regular,
        hasMetaTemplate: !!meta,
        isNonNotifiable: false,
        channel: row.activeChannel,
        delayValue: row.delayValue,
        delayUnit: row.delayUnit,
        trigger: EVENT_TRIGGERS[row.eventType] || row.trigger,
      };
    });
  },

  toggleNotify: async (api: ApiLike, row: EventRow): Promise<void> => {
    await api.put("/education/notifications/schedule", {
      eventType: row.code,
      enabled: !row.notifyCustomer,
      activeChannel: row.channel || "AUTO",
      delayValue: row.delayValue ?? 0,
      delayUnit: row.delayUnit || "HOURS",
    });
  },

  saveSchedule: async (api: ApiLike, row: EventRow, patch): Promise<void> => {
    await api.put("/education/notifications/schedule", {
      eventType: row.code,
      enabled: patch.enabled,
      activeChannel: patch.activeChannel,
      delayValue: patch.delayValue,
      delayUnit: patch.delayUnit,
    });
  },

  testSend: async (api: ApiLike, phone: string, eventType: string) => {
    const res = await api.post("/education/notifications/test", { phone, eventType });
    return res.data as { success?: boolean; message?: string; error?: string };
  },

  templateCrudBase: "/whatsapp-notifications/templates",
  metaOpsBase: "/whatsapp-notifications/templates",

  resolveCategory: (): string => "EDUCATION",

  tabs: [
    { key: "all", label: "الكل", kind: "list", count: (rows) => rows.length },
    {
      key: "enrollment",
      label: "التسجيل والباقات",
      kind: "list",
      filter: (r) => r.statusType === "enrollment",
      count: (rows) => rows.filter((r) => r.statusType === "enrollment").length,
    },
    {
      key: "sessions",
      label: "الحصص والمواعيد",
      kind: "list",
      filter: (r) => r.statusType === "sessions",
      count: (rows) => rows.filter((r) => r.statusType === "sessions").length,
    },
    {
      key: "reminders",
      label: "التنبيهات والأرصدة",
      kind: "list",
      filter: (r) => r.statusType === "reminders",
      count: (rows) => rows.filter((r) => r.statusType === "reminders").length,
    },
    {
      key: "teacher",
      label: "المعلمين والإدارة",
      kind: "list",
      filter: (r) => r.statusType === "teacher",
      count: (rows) => rows.filter((r) => r.statusType === "teacher").length,
    },
    { key: "schedule", label: "جدولة الإشعارات", kind: "schedule", isSpecial: true },
    { key: "reports", label: "سجلات الإرسال", kind: "reports", isSpecial: true },
    { key: "settings", label: "الإعدادات", kind: "settings", isSpecial: true },
  ],

  reportEventTypes: ALL_EDUCATION_EVENTS,

  features: {
    enableButtons: true,
    enableHeaderProductImage: false,
    enableMetaSwitch: true,
    enableMetaMultiBind: true,
    enableTestSender: true,
    enableSchedule: true,
    enableReports: true,
    enableSettings: true,
    enableFilterChips: true,
    enableInternalToggle: false,
    quickReplyActions: [
      { value: "CONFIRMED", label: "تأكيد الحضور" },
      { value: "CANCELLED", label: "طلب اعتذار / إلغاء" },
      { value: "RESCHEDULE", label: "طلب موعد بديل" },
    ],
    sortModes: ["alphabetical", "recent"],
    categoryMode: "auto",
    groupMode: "identity",
  },

  entityLabel: { singular: "إشعار", plural: "إشعارات" },
};
