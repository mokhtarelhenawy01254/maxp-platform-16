import type { ApiLike } from "../types";
import type { TemplateScopeConfig, EventRow, Template } from "../types";

/**
 * ┘å╪╖╪º┘é ╪º┘ä╪╣┘à┘ä╪º╪í ΓÇö /customers/customer-notifications
 * ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä┘ê┘ä╪º╪í/╪º┘ä┘â╪º╪┤ ╪¿╪º┘â/╪º┘ä╪¬┘é╪│┘è┘à ┘à╪╣ ╪¼╪»┘ê┘ä╪⌐ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ┘ê┘é┘å┘ê╪º╪¬┘ç.
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
};

const ALL_EVENTS = Object.values(EVENT_GROUPS).flat();

const CUSTOMER_VARIABLES = [
  { var: "{customerName}", desc: "╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä" },
  { var: "{points}", desc: "╪╣╪»╪» ╪º┘ä┘å┘é╪º╪╖ ╪º┘ä┘à┘â╪¬╪│╪¿╪⌐/╪º┘ä┘à╪│╪¬╪¿╪»┘ä╪⌐" },
  { var: "{currentPoints}", desc: "╪▒╪╡┘è╪» ╪º┘ä┘å┘é╪º╪╖ ╪º┘ä╪¡╪º┘ä┘è" },
  { var: "{reason}", desc: "╪│╪¿╪¿ ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐/╪º┘ä╪«╪╡┘à" },
  { var: "{tierName}", desc: "╪º╪│┘à ╪º┘ä┘à╪│╪¬┘ê┘ë ╪º┘ä╪¼╪»┘è╪»" },
  { var: "{expiryDate}", desc: "╪¬╪º╪▒┘è╪« ╪º┘å╪¬┘ç╪º╪í ╪º┘ä╪╡┘ä╪º╪¡┘è╪⌐" },
  { var: "{programName}", desc: "╪º╪│┘à ╪¿╪▒┘å╪º┘à╪¼ ╪º┘ä┘ê┘ä╪º╪í" },
  { var: "{cashAmount}", desc: "┘é┘è┘à╪⌐ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â/╪º┘ä╪º╪│╪¬╪¿╪»╪º┘ä" },
  { var: "{currency}", desc: "╪º┘ä╪╣┘à┘ä╪⌐ (╪¼.┘à)" },
  { var: "{orderNumber}", desc: "╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿" },
  { var: "{balance}", desc: "╪▒╪╡┘è╪» ╪º┘ä┘à╪¡┘ü╪╕╪⌐ ╪º┘ä╪¡╪º┘ä┘è" },
  { var: "{qualityTier}", desc: "╪¬╪╡┘å┘è┘ü ╪º┘ä╪¼┘ê╪»╪⌐ (VIP/╪╣╪º┘ä┘è/┘à╪¬┘ê╪│╪╖/┘à┘å╪«┘ü╪╢)" },
  { var: "{score}", desc: "╪»╪▒╪¼╪⌐ ╪º┘ä╪¼┘ê╪»╪⌐ ┘à┘å 100" },
  { var: "{discountPercent}", desc: "┘å╪│╪¿╪⌐ ╪«╪╡┘à ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è" },
  { var: "{voucherAmount}", desc: "┘é┘è┘à╪⌐ ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à ╪¿╪º┘ä╪╣┘à┘ä╪⌐" },
  { var: "{validityDays}", desc: "╪╣╪»╪» ╪ú┘è╪º┘à ╪╡┘ä╪º╪¡┘è╪⌐ ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à" },
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
];

const DEFAULT_CONTENT = `┘à╪▒╪¡╪¿╪º┘ï {customerName} ≡ƒæï\n\n{reason}\n\n╪┤┘â╪▒╪º┘ï ┘ä╪¬╪╣╪º┘à┘ä┘â ┘à╪╣┘å╪º! Γ£¿`;

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

// ╪¬┘ê╪¡┘è╪» ╪╡┘è╪║╪⌐ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬: {var} ΓåÆ {{var}} ┘ä┘ä╪╣╪▒╪╢ ╪»╪º╪«┘ä ╪º┘ä┘à╪¡╪▒╪▒ ╪º┘ä┘à┘ê╪¡╪»
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
  documentTitle: "╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í",
  title: "╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í",
  description: "╪Ñ╪»╪º╪▒╪⌐ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä┘ê┘ä╪º╪í ┘ê╪º┘ä┘â╪º╪┤ ╪¿╪º┘â ┘ê╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘ê╪¬┘é╪│┘è┘à ╪º┘ä╪╣┘à┘ä╪º╪í ΓÇö ╪º┘ä┘é┘ê╪º┘ä╪¿ ┘ê┘à┘ê╪º╪╣┘è╪» ╪º┘ä╪Ñ╪▒╪│╪º┘ä",
  variableSyntax: "single",
  variables: CUSTOMER_VARIABLES,
  sampleVariables: {
    customerName: "╪╣┘à┘è┘ä┘å╪º ╪º┘ä┘â╪▒┘è┘à",
    points: "50",
    currentPoints: "120",
    reason: "╪╖┘ä╪¿ #10025",
    tierName: "╪░┘ç╪¿┘è",
    expiryDate: "2026-09-01",
    programName: "╪¿╪▒┘å╪º┘à╪¼ ╪º┘ä┘ê┘ä╪º╪í",
    cashAmount: "25.00",
    currency: "╪¼.┘à",
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
    const all: Array<TemplateItem & { category?: string }> = templatesRes.data?.templates || [];
    const scheduleTemplates = all.filter(
      (t) => !!t.eventType && ALL_EVENTS.includes(t.eventType),
    );

    const scheduleRows = rows.map((row, idx): EventRow => {
      const list = scheduleTemplates.filter((t) => t.eventType === row.eventType);
      const regular = slotTemplate(list, "BAILEYS");
      const meta = slotTemplate(list, "META_CLOUD");
      const regularTemplate: Template | null = regular
        ? {
            ...regular,
            id: regular.id || "",
            name: regular.name || "┘é╪º┘ä╪¿ ┘ê╪º╪¬╪│╪º╪¿",
            content: normalizeToDouble(regular.content || ""),
            isActive: regular.isActive ?? true,
            eventType: row.eventType,
          }
        : null;
      const metaTemplate: Template | null = meta
        ? {
            ...meta,
            id: meta.id || "",
            name: meta.name || "┘é╪º┘ä╪¿ ┘à┘è╪¬╪º",
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

    // ΓÜí ┘é┘ê╪º┘ä╪¿ ┘à┘å╪º╪│╪¿╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í (category = OCCASION) ΓÇö ┘à╪¼┘à┘ê╪╣╪⌐ ╪¡╪│╪¿ eventType
    // ┘â┘ä ┘à┘å╪º╪│╪¿╪⌐ ┘ä┘è┘ç╪º ╪│┘ä┘ê╪⌐ ╪╣╪º╪»┘è╪⌐ (┘ê╪º╪¬╪│╪º╪¿) + ╪│┘ä┘ê╪⌐ ┘ê╪º╪¬╪│╪º╪¿ ╪¿┘è╪▓┘å╪│ (┘à┘è╪¬╪º) ╪▓┘è ╪¿╪º┘é┘è ╪º┘ä╪ú╪¡╪»╪º╪½
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
            name: regular.name || "┘é╪º┘ä╪¿ ┘à┘å╪º╪│╪¿╪⌐",
            content: normalizeToDouble(regular.content || ""),
            isActive: regular.isActive ?? true,
            eventType,
          }
        : null;
      const metaTemplate: Template | null = meta
        ? {
            ...meta,
            id: meta.id || "",
            name: meta.name || "┘é╪º┘ä╪¿ ┘ê╪º╪¬╪│╪º╪¿ ╪¿┘è╪▓┘å╪│",
            content: normalizeToDouble(meta.content || ""),
            isActive: meta.isActive ?? true,
            eventType,
          }
        : null;

      return {
        id: regular?.id || meta?.id || eventType,
        code: eventType,
        name: regular?.name || meta?.name || "┘é╪º┘ä╪¿ ┘à┘å╪º╪│╪¿╪⌐",
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

    // ╪╡┘ü ╪º┘ü╪¬╪▒╪º╪╢┘è ┘ä╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘à┘å╪º╪│╪¿╪⌐ ╪¼╪»┘è╪» ┘à┘å ╪»╪º╪«┘ä ╪º┘ä╪¬╪¿┘ê┘è╪¿
    // ╪º┘ä┘â┘ê╪» ┘ü╪▒┘è╪» ┘ä┘â┘ä ╪¼┘ä╪¿ ╪╣╪┤╪º┘å ┘â┘ä ┘à┘å╪º╪│╪¿╪⌐ ╪¼╪»┘è╪»╪⌐ ╪¬╪º╪«╪» eventType ╪«╪º╪╡ ╪¿┘è┘ç╪º
    const newOccasionRow: EventRow = {
      id: "__new_occasion__",
      code: `CUSTOMER_OCCASION_${Date.now().toString(36)}`,
      name: "┘à┘å╪º╪│╪¿╪⌐ ╪¼╪»┘è╪»╪⌐",
      color: "#8B5CF6",
      sortOrder: 100000,
      statusType: "occasion",
      notifyCustomer: true,
      isSystemStatus: false,
      template: null,
      metaTemplate: null,
      hasTemplate: false,
      hasMetaTemplate: false,
      isNonNotifiable: false,
      category: "OCCASION",
    };

    return [...scheduleRows, ...occasionRows, newOccasionRow];
  },

  toggleNotify: async (api: ApiLike, row: EventRow): Promise<void> => {
    if (row.category === "OCCASION") {
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
    { key: "schedule", label: "╪¼╪»┘ê┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬", kind: "schedule", isSpecial: true },
    { key: "occasions", label: "┘é┘ê╪º┘ä╪¿ ┘à┘å╪º╪│╪¿╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í", kind: "list", filter: (r) => r.category === "OCCASION", count: (rows) => rows.filter((r) => r.category === "OCCASION").length },
    { key: "loyalty", label: "┘é┘ê╪º┘ä╪¿ ╪º┘ä┘ê┘ä╪º╪í", kind: "list", filter: (r) => EVENT_GROUPS["loyalty"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["loyalty"]!.includes(r.code)).length },
    { key: "cashback", label: "┘é┘ê╪º┘ä╪¿ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â", kind: "list", filter: (r) => EVENT_GROUPS["cashback"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["cashback"]!.includes(r.code)).length },
    { key: "quality", label: "┘é┘ê╪º┘ä╪¿ ╪º┘ä╪¬┘é╪│┘è┘à", kind: "list", filter: (r) => EVENT_GROUPS["quality"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["quality"]!.includes(r.code)).length },
    { key: "autoDiscount", label: "┘é┘ê╪º┘ä╪¿ ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è", kind: "list", filter: (r) => EVENT_GROUPS["autoDiscount"]!.includes(r.code), count: (rows) => rows.filter((r) => EVENT_GROUPS["autoDiscount"]!.includes(r.code)).length },
    { key: "reports", label: "╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪▒╪│╪º╪ª┘ä", kind: "reports", isSpecial: true },
  ],

  features: {
    enableButtons: true,
    enableHeaderProductImage: false,
    enableMetaSwitch: false,
    enableMetaMultiBind: false,
    enableTestSender: true,
    enableSchedule: true,
    enableReports: true,
    enableSettings: false,
    enableFilterChips: false,
    enableInternalToggle: false,
    sortModes: ["alphabetical", "recent"],
    categoryMode: "manual",
    dialogCategoryOptions: [
      { value: "CUSTOMER", label: "UTILITY (┘à┘Å┘ê╪╡┘ë ╪¿┘ç ┘ä┘ä┘ê┘ä╪º╪í)" },
      { value: "SYSTEM", label: "UTILITY (┘å╪╕╪º┘à┘è)" },
      { value: "MARKETING", label: "MARKETING (╪¬╪▒┘ê┘è╪¼┘è)" },
      { value: "GENERAL", label: "UTILITY (╪╣╪º┘à)" },
      { value: "OCCASION", label: "OCCASION (┘à┘å╪º╪│╪¿╪º╪¬)" },
    ],
  },

  gateCreateOnNotify: false,

  // ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í ┘â┘ä┘ç╪º (┘ê┘ä╪º╪í/┘â╪º╪┤ ╪¿╪º┘â/╪¬┘é╪│┘è┘à/╪«╪╡┘à ╪¬┘ä┘é╪º╪ª┘è) ╪¿╪¬╪¬╪«╪▓┘å ╪¿┘Ç category MARKETING ┘ü┘è
  // whatsAppNotificationLog ΓÇö ┘ü┘ä╪¬╪▒╪⌐ ╪º┘ä┘ü╪ª╪⌐ ╪¿╪¬╪║╪╖┘è ╪º┘ä┘Ç 13 ╪¡╪»╪½ ╪¿╪┤┘â┘ä ╪ó┘à┘å
  // (╪ú╪¡╪»╪º╪½ AUTO_DISCOUNT_* ┘à╪┤ ┘ü┘è enum ╪º┘ä╪│╪¼┘ä╪î ┘ü┘à┘è┘å┘ü╪╣╪┤ ┘å┘ü┘ä╪¬╪▒┘ç┘à ╪¿╪º┘ä┘Ç eventType).
  reportCategories: ["MARKETING"],

  endpoints: {
    sessions: "/whatsapp/sessions",
    report: "/whatsapp/notifications/status-report",
    uploadMedia: "/whatsapp-templates/templates/upload-media",
  },
};
