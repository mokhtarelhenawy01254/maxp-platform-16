/**
 * سجل أقسام قوالب واتساب — قابل للتوسع
 * أضف قسم جديد كـ object في المصفوفة وهيظهر تلقائياً في:
 * - عمود "القسم" في جدول whatsapp/meta-templates
 * - فلتر الأقسام
 * - شارات الألوان والأيقونات
 * بدون تعديل أي ملف آخر.
 */

export interface TemplateSection {
  id: string;
  label: string; // عربي
  labelEn?: string;
  icon: string; // emoji
  badge: string; // tailwind classes
  description?: string;
  // للاشتقاق التلقائي من اسم القالب
  namePatterns: string[]; // lowercased substrings
  eventTypes?: string[]; // optional exact eventType prefixes
}

export const TEMPLATE_SECTIONS: TemplateSection[] = [
  {
    id: "LOYALTY",
    label: "الولاء",
    labelEn: "Loyalty",
    icon: "💎",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    description: "نقاط الولاء، المستويات، الكاش باك",
    namePatterns: ["loyalty", "points", "tier", "cashback", "ولاء", "نقاط", "كاش"],
    eventTypes: ["LOYALTY_", "CASHBACK_", "CUSTOMER_QUALITY_"],
  },
  {
    id: "DENTAL_LAB",
    label: "معمل الأسنان",
    labelEn: "Dental Lab",
    icon: "🦷",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-300",
    description: "حالات معمل الأسنان: استلام/جاهزية/تسليم/تأخير",
    namePatterns: ["dental", "dl-", "case", "doctor", "أسنان", "معمل"],
    eventTypes: ["DENTAL_"],
  },
  {
    id: "ORDERS",
    label: "الطلبات",
    labelEn: "Orders",
    icon: "📦",
    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
    description: "تأكيد وشحن وتوصيل الطلبات",
    namePatterns: ["order", "shipping", "delivery", "shipment", "طلب", "شحن", "توصيل"],
    eventTypes: ["ORDER_"],
  },
  {
    id: "MARKETING",
    label: "التسويق",
    labelEn: "Marketing",
    icon: "📢",
    badge: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-950/30 dark:text-pink-300",
    description: "عروض ترويجية وتسويق",
    namePatterns: ["promo", "offer", "marketing", "campaign", "ترويج", "عرض"],
    eventTypes: ["PROMOTIONAL", "COUPON_", "BIRTHDAY_WISH"],
  },
  {
    id: "ABANDONED_CART",
    label: "السلة المتروكة",
    labelEn: "Abandoned Cart",
    icon: "🛒",
    badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300",
    description: "تذكير السلة المتروكة",
    namePatterns: ["cart", "abandoned", "سلة"],
    eventTypes: ["CART_ABANDONED", "INCOMPLETE_CART"],
  },
  {
    id: "HR",
    label: "الموارد البشرية",
    labelEn: "HR",
    icon: "👥",
    badge: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300",
    description: "حضور وإجازات ورواتب",
    namePatterns: ["attendance", "leave", "payroll", "hr", "حضور", "إجازة"],
    eventTypes: ["ATTENDANCE_", "LEAVE_", "PAYROLL_"],
  },
  {
    id: "SYSTEM",
    label: "النظام",
    labelEn: "System",
    icon: "⚙️",
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
    description: "إشعارات النظام والعامة",
    namePatterns: ["system", "otp", "verification", "announcement", "نظام"],
    eventTypes: ["ANNOUNCEMENT", "OTP", "SYSTEM"],
  },
  {
    id: "GENERAL",
    label: "عام",
    labelEn: "General",
    icon: "📄",
    badge: "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300",
    description: "قوالب عامة غير مصنفة",
    namePatterns: [],
  },
];

const SECTION_MAP = new Map(TEMPLATE_SECTIONS.map((s) => [s.id, s]));

export function getSectionById(id: string): TemplateSection | undefined {
  return SECTION_MAP.get(id);
}

/**
 * اشتقاق قسم القالب من اسمه (و category كـ fallback)
 * - يطابق namePatterns و eventTypes من السجل
 * - لو مفيش تطابق يرجع GENERAL
 */
export function resolveTemplateSection(templateName: string, metaCategory?: string): TemplateSection {
  const name = (templateName || "").toLowerCase();
  // 1) مطابقة مباشرة بالـ patterns
  for (const section of TEMPLATE_SECTIONS) {
    if (section.id === "GENERAL") continue;
    if (section.namePatterns.some((p) => name.includes(p.toLowerCase()))) {
      return section;
    }
    if (section.eventTypes?.some((et) => name.toUpperCase().includes(et.replace(/_$/, "")))) {
      return section;
    }
  }
  // 2) fallback حسب تصنيف Meta لو مفيش اسم واضح (اختياري)
  // نتركه GENERAL عشان ما نخلطش تصنيف Meta بقسم البيزنس
  return SECTION_MAP.get("GENERAL")!;
}
