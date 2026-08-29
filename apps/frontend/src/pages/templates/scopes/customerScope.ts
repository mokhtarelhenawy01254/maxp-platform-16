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
  autoDiscount: [
    "AUTO_DISCOUNT_COUPON_GRANTED",
    "AUTO_DISCOUNT_COUPON_EXPIRING",
    "AUTO_DISCOUNT_CASHBACK_CONVERTED",
  ],
  products: [
    "NEW_PRODUCT",
    "PROMOTIONAL",
    "BACK_IN_STOCK",
    "PRICE_DROP",
    "LOW_STOCK_ALERT",
  ],
  delivery: [
    "ORDER_DELIVERED",
    "ORDER_SHIPPED",
    "ORDER_OUT_FOR_DELIVERY",
  ],
  birthday: ["BIRTHDAY_WISH"],
  review: ["REVIEW_REQUEST"],
  cadence: [
    "CADENCE_PRODUCT",
    "CADENCE_BALANCE",
    "CADENCE_REFERRAL",
    "CADENCE_TIER",
  ],
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
  { var: "{discountPercent}", desc: "نسبة خصم كوبون الخصم التلقائي" },
  { var: "{voucherAmount}", desc: "قيمة كوبون الخصم بالعملة" },
  { var: "{validityDays}", desc: "عدد أيام صلاحية كوبون الخصم" },
  { var: "{productName}", desc: "اسم المنتج (لإشعارات المنتجات/العروض)" },
  { var: "{price}", desc: "سعر المنتج (لإشعارات المنتجات/العروض)" },
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
  "discountPercent",
  "voucherAmount",
  "validityDays",
  "productName",
  "price",
];

// خريطة أسماء الأحداث — تُستخدم لعرض التسمية الصحيحة بدل ما بيجي من الـ backend
// (الـ backend بيرجّع النص مُتَشَوِّه بسبب مشكلة ترميز على السيرفر)
const EVENT_LABELS: Record<string, string> = {
  LOYALTY_POINTS_AWARDED: "كسب نقاط ولاء",
  LOYALTY_TIER_UPGRADED: "الترقية لمستوى أعلى",
  LOYALTY_TIER_DOWNGRADED: "انخفاض مستوى العميل",
  LOYALTY_POINTS_EXPIRY_WARNING: "تنبيه قرب انتهاء النقاط",
  LOYALTY_POINTS_EXPIRED: "انتهاء صلاحية النقاط",
  LOYALTY_POINTS_REDEEMED: "استبدال النقاط",
  CASHBACK_CREDITED: "إيداع كاش باك",
  CASHBACK_REVERSED: "خصم/استرداد كاش باك",
  CUSTOMER_QUALITY_UPGRADED: "ارتفاع تصنيف الجودة",
  CUSTOMER_QUALITY_DOWNGRADED: "انخفاض تصنيف الجودة",
  AUTO_DISCOUNT_COUPON_GRANTED: "منح كوبون الخصم التلقائي",
  AUTO_DISCOUNT_COUPON_EXPIRING: "تنبيه قرب انتهاء كوبون الخصم",
  AUTO_DISCOUNT_CASHBACK_CONVERTED: "تحويل الكوبون المنتهي إلى كاش باك",
  NEW_PRODUCT: "منتج جديد",
  PROMOTIONAL: "عرض ترويجي",
  BACK_IN_STOCK: "عودة المنتج للتوفر",
  PRICE_DROP: "انخفاض السعر",
  LOW_STOCK_ALERT: "تنبيه نقص المخزون",
  ORDER_DELIVERED: "تسليم الطلب",
  ORDER_SHIPPED: "شحن الطلب",
  ORDER_OUT_FOR_DELIVERY: "خروج الطلب للتوصيل",
  BIRTHDAY_WISH: "تهنئة عيد الميلاد",
  REVIEW_REQUEST: "طلب تقييم بعد الاستلام",
  CADENCE_PRODUCT: "دورية: منتج جديد (كل 10 أيام)",
  CADENCE_BALANCE: "دورية: تحديث الرصيد (كل 15 يوم)",
  CADENCE_REFERRAL: "دورية: تذكير الإحالة (كل 30 يوم)",
  CADENCE_TIER: "دورية: تذكير المستوى (كل 30 يوم)",
};

const EVENT_TRIGGERS: Record<string, string> = {
  LOYALTY_POINTS_AWARDED: "عند تسليم الطلب",
  LOYALTY_TIER_UPGRADED: "عند ارتفاع مستوى العميل",
  LOYALTY_TIER_DOWNGRADED: "عند انخفاض مستوى العميل",
  LOYALTY_POINTS_EXPIRY_WARNING: "قبل انتهاء صلاحية النقاط",
  LOYALTY_POINTS_EXPIRED: "عند انتهاء صلاحية النقاط (cron يومي)",
  LOYALTY_POINTS_REDEEMED: "عند استبدال النقاط",
  CASHBACK_CREDITED: "عند إيداع الكاش باك (تسليم/دفع)",
  CASHBACK_REVERSED: "عند خصم الكاش باك (مرتجع/إلغاء)",
  CUSTOMER_QUALITY_UPGRADED: "عند ارتفاع تصنيف جودة العميل",
  CUSTOMER_QUALITY_DOWNGRADED: "عند انخفاض تصنيف جودة العميل",
  AUTO_DISCOUNT_COUPON_GRANTED: "عند تسليم الطلب وإصدار كوبون الخصم",
  AUTO_DISCOUNT_COUPON_EXPIRING: "قبل انتهاء صلاحية كوبون الخصم",
  AUTO_DISCOUNT_CASHBACK_CONVERTED: "عند انتهاء صلاحية الكوبون وتحويله إلى كاش باك",
  NEW_PRODUCT: "عند إضافة منتج جديد (حملة تلقائية/يدوية)",
  PROMOTIONAL: "حملة ترويجية يدوية",
  BACK_IN_STOCK: "عند عودة منتج متوفر بعد نفاد المخزون",
  PRICE_DROP: "عند انخفاض سعر منتج",
  LOW_STOCK_ALERT: "عند انخفاض المخزون لحد التنبيه",
  ORDER_DELIVERED: "عند تسليم الطلب (يبدأ رحلة ما بعد الاستلام)",
  ORDER_SHIPPED: "عند شحن الطلب",
  ORDER_OUT_FOR_DELIVERY: "عند خروج الطلب للتوصيل",
  BIRTHDAY_WISH: "أتمتة يومية 12:00 (عيد ميلاد العميل)",
  REVIEW_REQUEST: "بعد 7 أيام من التسليم (رحلة ما بعد الاستلام)",
  CADENCE_PRODUCT: "كل 10 أيام — رسالة دورية",
  CADENCE_BALANCE: "كل 15 يوم — رسالة دورية",
  CADENCE_REFERRAL: "كل 30 يوم — رسالة دورية",
  CADENCE_TIER: "كل 30 يوم — رسالة دورية",
};

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
  description: "إدارة إشعارات الولاء والكاش باك والخصم التلقائي وتقسيم العملاء — القوالب ومواعيد الإرسال",
  // الصفحة أحداث ولاء/كاش باك مش حالات طلبات — التسمية بتظهر في البحث والعدادات والتحذيرات
  entityLabel: { singular: "حدث", plural: "أحداث" },
  // تبويب الإعدادات معطّل في النطاق ده — الإعدادات شركة-عامة بتتدار من صفحة قوالب الطلبات
  settingsPath: "/orders/status-templates",
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
    discountPercent: "10",
    voucherAmount: "50.00",
    validityDays: "3",
  },
  metaToLocalDefaultOrder: CUSTOMER_META_ORDER,
  defaultContent: DEFAULT_CONTENT,
  defaultCreateButtons: [
    { id: "store", text: "صفحتي على المتجر", action: "LINK", type: "LINK" },
  ],
  eventLabelResolver: (eventType: string): string => {
    return EVENT_LABELS[eventType] || eventType.replace(/_/g, " ").toLowerCase();
  },

  loadEvents: async (api: ApiLike): Promise<EventRow[]> => {
    const [scheduleRes, templatesRes] = await Promise.all([
      api.get<{ success?: boolean; data?: ScheduleRow[] }>("/hr/customer-loyalty/notifications/schedule"),
      api.get<{ success?: boolean; templates?: TemplateItem[] }>("/whatsapp-notifications/templates"),
    ]);

    const rows: ScheduleRow[] = scheduleRes.data?.data || [];
    const all: Array<TemplateItem & { category?: string }> = templatesRes.data?.templates || [];
    // استثناء قوالب OCCASION/PRODUCTS من صفوف الجدولة — ليهم تجميع خاص تحت.
    const scheduleTemplates = all.filter(
      (t) =>
        !!t.eventType &&
        ALL_EVENTS.includes(t.eventType) &&
        !["OCCASION", "PRODUCTS", "CADENCE"].includes(String(t.category || "").toUpperCase()),
    );

    const scheduleRows = rows.map((row, idx): EventRow => {
      const list = scheduleTemplates.filter((t) => t.eventType === row.eventType);
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
        trigger: EVENT_TRIGGERS[row.eventType] || row.trigger,
      };
    });

    // ⚡ قوالب مناسبات العملاء (category = OCCASION) — مجموعة حسب eventType
    // كل مناسبة ليها سلوة عادية (واتساب) + سلوة واتساب بيزنس (ميتا) زي باقي الأحداث
    const occasionTemplates = all.filter((t) => String(t.category || "").toUpperCase() === "OCCASION");
    const occasionGroups = new Map<string, TemplateItem[]>();
    for (const t of occasionTemplates) {
      const key = t.eventType || "CUSTOMER_OCCASION";
      const arr = occasionGroups.get(key) || [];
      arr.push(t);
      occasionGroups.set(key, arr);
    }

    const occasionRows: EventRow[] = Array.from(occasionGroups.entries()).map(([eventType, list], idx): EventRow => {
      const regular = slotTemplate(list, "BAILEYS");
      const meta = slotTemplate(list, "META_CLOUD");
      const regularTemplate: Template | null = regular
        ? {
            ...regular,
            id: regular.id || "",
            name: regular.name || "قالب مناسبة",
            content: normalizeToDouble(regular.content || ""),
            isActive: regular.isActive ?? true,
            eventType,
          }
        : null;
      const metaTemplate: Template | null = meta
        ? {
            ...meta,
            id: meta.id || "",
            name: meta.name || "قالب واتساب بيزنس",
            content: normalizeToDouble(meta.content || ""),
            isActive: meta.isActive ?? true,
            eventType,
          }
        : null;

      return {
        id: regular?.id || meta?.id || eventType,
        code: eventType,
        name: regular?.name || meta?.name || "قالب مناسبة",
        color: "#8B5CF6",
        sortOrder: 1000 + idx,
        statusType: "occasion",
        notifyCustomer: regular?.isActive ?? meta?.isActive ?? true,
        isSystemStatus: false,
        template: regularTemplate,
        metaTemplate,
        hasTemplate: !!regularTemplate,
        hasMetaTemplate: !!metaTemplate,
        isNonNotifiable: false,
        category: "OCCASION",
      };
    });

    // 📦 قوالب المنتجات والعروض (category = PRODUCTS) — مجموعة حسب eventType
    // (منتج جديد / عرض ترويجي / عودة للتوفر / انخفاض السعر / تنبيه مخزون)
    const productTemplates = all.filter((t) => String(t.category || "").toUpperCase() === "PRODUCTS");
    const productGroups = new Map<string, TemplateItem[]>();
    for (const t of productTemplates) {
      const key = t.eventType || "NEW_PRODUCT";
      const arr = productGroups.get(key) || [];
      arr.push(t);
      productGroups.set(key, arr);
    }

    const productRows: EventRow[] = Array.from(productGroups.entries()).map(([eventType, list], idx): EventRow => {
      const regular = slotTemplate(list, "BAILEYS");
      const meta = slotTemplate(list, "META_CLOUD");
      const regularTemplate: Template | null = regular
        ? {
            ...regular,
            id: regular.id || "",
            name: regular.name || "قالب منتج",
            content: normalizeToDouble(regular.content || ""),
            isActive: regular.isActive ?? true,
            eventType,
          }
        : null;
      const metaTemplate: Template | null = meta
        ? {
            ...meta,
            id: meta.id || "",
            name: meta.name || "قالب واتساب بيزنس",
            content: normalizeToDouble(meta.content || ""),
            isActive: meta.isActive ?? true,
            eventType,
          }
        : null;

      return {
        id: regular?.id || meta?.id || eventType,
        code: eventType,
        name: EVENT_LABELS[eventType] || regular?.name || meta?.name || "قالب منتج",
        color: "#0EA5E9",
        sortOrder: 2000 + idx,
        statusType: "products",
        notifyCustomer: regular?.isActive ?? meta?.isActive ?? true,
        isSystemStatus: false,
        template: regularTemplate,
        metaTemplate,
        hasTemplate: !!regularTemplate,
        hasMetaTemplate: !!metaTemplate,
        isNonNotifiable: false,
        category: "PRODUCTS",
        trigger: EVENT_TRIGGERS[eventType] || "",
      };
    });

    // 🕐 قوالب الرسائل الدورية (category = CADENCE أو eventType يبدأ بـ CADENCE_)
    const cadenceTemplates = all.filter(
      (t) => String(t.category || "").toUpperCase() === "CADENCE" || (t.eventType || "").startsWith("CADENCE_"),
    );
    const cadenceGroups = new Map<string, TemplateItem[]>();
    for (const t of cadenceTemplates) {
      const key = t.eventType || "CADENCE_PRODUCT";
      const arr = cadenceGroups.get(key) || [];
      arr.push(t);
      cadenceGroups.set(key, arr);
    }

    const cadenceRows: EventRow[] = Array.from(cadenceGroups.entries()).map(([eventType, list], idx): EventRow => {
      const regular = slotTemplate(list, "BAILEYS");
      const meta = slotTemplate(list, "META_CLOUD");
      const regularTemplate: Template | null = regular
        ? {
            ...regular,
            id: regular.id || "",
            name: regular.name || "قالب دوري",
            content: normalizeToDouble(regular.content || ""),
            isActive: regular.isActive ?? true,
            eventType,
          }
        : null;
      const metaTemplate: Template | null = meta
        ? {
            ...meta,
            id: meta.id || "",
            name: meta.name || "قالب دوري (ميتا)",
            content: normalizeToDouble(meta.content || ""),
            isActive: meta.isActive ?? true,
            eventType,
          }
        : null;

      return {
        id: regular?.id || meta?.id || eventType,
        code: eventType,
        name: EVENT_LABELS[eventType] || regular?.name || meta?.name || "رسالة دورية",
        color: "#F59E0B",
        sortOrder: 3000 + idx,
        statusType: "cadence",
        notifyCustomer: regular?.isActive ?? meta?.isActive ?? true,
        isSystemStatus: false,
        template: regularTemplate,
        metaTemplate,
        hasTemplate: !!regularTemplate,
        hasMetaTemplate: !!metaTemplate,
        isNonNotifiable: false,
        category: "CADENCE",
        trigger: EVENT_TRIGGERS[eventType] || "",
      };
    });

    return [...scheduleRows, ...occasionRows, ...productRows, ...cadenceRows];
  },

  toggleNotify: async (api: ApiLike, row: EventRow): Promise<void> => {
    if (row.category === "OCCASION" || row.category === "PRODUCTS") {
      const target = row.template?.id ? row.template : (row.metaTemplate?.id ? row.metaTemplate : null);
      if (target?.id) {
        await api.put(`/whatsapp-notifications/templates/${target.id}`, {
          isActive: !row.notifyCustomer,
        });
      }
      return;
    }
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
    { key: "occasions", label: "قوالب مناسبات العملاء", kind: "list", filter: (r) => r.category === "OCCASION", count: (rows) => rows.filter((r) => r.category === "OCCASION").length },
    { key: "products", label: "قوالب المنتجات والعروض", kind: "list", filter: (r) => r.category === "PRODUCTS", count: (rows) => rows.filter((r) => r.category === "PRODUCTS").length },
    { key: "loyalty", label: "قوالب الولاء", kind: "list", filter: (r) => EVENT_GROUPS["loyalty"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["loyalty"]!.includes(r.code)).length },
    { key: "cashback", label: "قوالب الكاش باك", kind: "list", filter: (r) => EVENT_GROUPS["cashback"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["cashback"]!.includes(r.code)).length },
    { key: "quality", label: "قوالب التقسيم", kind: "list", filter: (r) => EVENT_GROUPS["quality"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["quality"]!.includes(r.code)).length },
    { key: "autoDiscount", label: "قوالب الخصم التلقائي", kind: "list", filter: (r) => EVENT_GROUPS["autoDiscount"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["autoDiscount"]!.includes(r.code)).length },
    { key: "delivery", label: "رحلة الطلب", kind: "list", filter: (r) => EVENT_GROUPS["delivery"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["delivery"]!.includes(r.code)).length },
    { key: "birthday", label: "أعياد الميلاد", kind: "list", filter: (r) => EVENT_GROUPS["birthday"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["birthday"]!.includes(r.code)).length },
    { key: "review", label: "طلبات التقييم", kind: "list", filter: (r) => EVENT_GROUPS["review"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["review"]!.includes(r.code)).length },
    { key: "cadence", label: "الرسائل الدورية", kind: "list", filter: (r) => EVENT_GROUPS["cadence"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["cadence"]!.includes(r.code)).length },
    { key: "reports", label: "تقارير الرسائل", kind: "reports", isSpecial: true },
  ],

  features: {
    enableButtons: true,
    enableHeaderProductImage: false,
    enableMetaSwitch: true,
    enableMetaMultiBind: false,
    enableTestSender: true,
    enableSchedule: true,
    enableReports: true,
    enableSettings: false,
    enableFilterChips: false,
    enableInternalToggle: false,
    // إجراءات سريعة مناسبة لإشعارات العملاء (مش انتقال حالة طلب)
    quickReplyActions: [
      { value: "OPEN_STORE", label: "فتح صفحة المتجر" },
      { value: "VIEW_POINTS", label: "عرض نقاط الولاء" },
      { value: "VIEW_WALLET", label: "عرض المحفظة" },
    ],
    sortModes: ["alphabetical", "recent"],
    categoryMode: "manual",
    groupMode: "identity",
    dialogCategoryOptions: [
      { value: "CUSTOMER", label: "UTILITY (مُوصى به للولاء)" },
      { value: "SYSTEM", label: "UTILITY (نظامي)" },
      { value: "MARKETING", label: "MARKETING (ترويجي)" },
      { value: "GENERAL", label: "UTILITY (عام)" },
      { value: "OCCASION", label: "OCCASION (مناسبات)" },
      { value: "PRODUCTS", label: "PRODUCTS (منتجات وعروض)" },
    ],
  },

  gateCreateOnNotify: false,

  // إشعارات العملاء كلها (ولاء/كاش باك/تقسيم/خصم تلقائي) بتتخزن بـ category MARKETING في
  // whatsAppNotificationLog — فلترة الفئة بتغطي الـ 13 حدث بشكل آمن
  // (أحداث AUTO_DISCOUNT_* مش في enum السجل، فمينفعش نفلترهم بالـ eventType).
  reportCategories: ["MARKETING"],

  endpoints: {
    sessions: "/whatsapp/sessions",
    report: "/whatsapp/notifications/status-report",
    uploadMedia: "/whatsapp-templates/templates/upload-media",
  },
};
