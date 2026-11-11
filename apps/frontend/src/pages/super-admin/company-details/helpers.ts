import { getStatusMeta } from "./statusMeta";

export function formatDate(dateValue: string | number | Date | null | undefined): string {
  if (!dateValue) return "غير متوفر";
  try {
    return new Date(dateValue).toLocaleDateString("ar-EG-u-nu-latn", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "غير متوفر";
  }
}

export function formatDateTime(dateValue: string | number | Date | null | undefined): string {
  if (!dateValue) return "غير متوفر";
  try {
    return new Date(dateValue).toLocaleString("ar-EG-u-nu-latn", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "غير متوفر";
  }
}

export function formatNumber(value: unknown): string {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return "0";
  return new Intl.NumberFormat("ar-EG-u-nu-latn").format(numericValue);
}

export function formatCurrency(value: unknown, currency: string = "EGP"): string {
  const numericValue = Number(value || 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  try {
    return new Intl.NumberFormat("ar-EG-u-nu-latn", {
      style: "currency",
      currency: currency || "EGP",
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    return `${formatNumber(safeValue)} ${currency || "EGP"}`;
  }
}

export function getDaysUntil(dateValue: string | number | Date | null | undefined): number | null {
  if (!dateValue) return null;
  const targetDate = new Date(dateValue);
  if (Number.isNaN(targetDate.getTime())) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);
}

export function formatRelativeDateLabel(dateValue: string | number | Date | null | undefined): string {
  const days = getDaysUntil(dateValue);
  if (days === null) return "غير متوفر";
  if (days === 0) return "اليوم";
  if (days === 1) return "غدًا";
  if (days > 1) return `بعد ${formatNumber(days)} يوم`;
  if (days === -1) return "أمس";
  return `منذ ${formatNumber(Math.abs(days))} يوم`;
}

export function formatLimit(limit: unknown): string {
  if (limit === null || limit === undefined) return "غير متوفر";
  if (Number(limit) === -1) return "غير محدود";
  return formatNumber(limit);
}

export interface MetricEntryLike {
  key?: string;
  current?: number;
  limit?: number;
  percentage?: number;
  remaining?: number;
  isUnlimited?: boolean;
}

export function getMetricDetails(entry: MetricEntryLike) {
  const isUnlimited = Boolean(entry.isUnlimited) || Number(entry.limit) === -1;
  const currentFormatted = formatNumber(entry.current);
  const limitFormatted = formatLimit(entry.limit);
  const remainingFormatted = isUnlimited ? "غير محدود" : formatNumber(entry.remaining);
  const pct = Math.round(Number(entry.percentage) || 0);
  const pctFormatted = formatNumber(pct);
  // «بدون حد أقصى» تُكتب مرة واحدة في الكارت، مش أربع صيغ لنفس المعنى
  const limitSuffix = isUnlimited ? "" : ` من أصل ${limitFormatted}`;
  const remainingText = isUnlimited ? "" : undefined;

  switch (entry.key) {
    case "users":
      return {
        detail: `الأعضاء: ${currentFormatted} عضو${limitSuffix}`,
        percentageText: isUnlimited ? "بدون حد أقصى" : `${pctFormatted}% من سعة الفريق`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted} مقعد`,
      };
    case "products":
      return {
        detail: `المنتجات المضافة: ${currentFormatted} منتج${limitSuffix}`,
        percentageText: isUnlimited ? "بدون حد أقصى" : `${pctFormatted}% من الحد المسموح`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted} منتج`,
      };
    case "orders":
      return {
        detail: `طلبات هذا الشهر: ${currentFormatted} طلب${limitSuffix}`,
        percentageText: isUnlimited ? "بدون حد أقصى" : `${pctFormatted}% من حصة الشهر`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted} طلب`,
      };
    case "customers":
      return {
        detail: `العملاء المسجلون: ${currentFormatted} عميل${limitSuffix}`,
        percentageText: isUnlimited ? "بدون حد أقصى" : `${pctFormatted}% من سعة العملاء`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted} عميل`,
      };
    case "storage":
      return {
        detail: `المساحة المستخدمة: ${currentFormatted}${limitSuffix}`,
        percentageText: isUnlimited ? "بدون حد أقصى" : `${pctFormatted}% من المساحة المتاحة`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted}`,
      };
    case "messages":
    case "conversations":
      return {
        detail: `المحادثات المسجلة: ${currentFormatted} محادثة${limitSuffix}`,
        percentageText: isUnlimited ? "بدون حد أقصى" : `${pctFormatted}% من سعة المحادثات`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted} محادثة`,
      };
    case "pages":
    case "facebookPages":
      return {
        detail: `الصفحات المرتبطة: ${currentFormatted} صفحة${limitSuffix}`,
        percentageText: isUnlimited ? "بدون حد أقصى" : `${pctFormatted}% من حد الصفحات`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted} صفحة`,
      };
    default:
      return {
        detail: `الاستهلاك الحالي: ${currentFormatted}${limitSuffix}`,
        percentageText: isUnlimited ? "بدون حد أقصى" : `${pctFormatted}% مستهلك`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted}`,
      };
  }
}

export function normalizeWebsite(website: string | null | undefined): string | null {
  if (!website) return null;
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website}`;
}

export function getCount(company: any, key: string): number {
  return company?._count?.[key] || 0;
}

export function extractErrorMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
}

export function normalizeRequiredApps(requiredApps: unknown): string[] {
  if (Array.isArray(requiredApps)) {
    return requiredApps
      .map((requiredApp: unknown) => String(requiredApp || "").trim())
      .filter(Boolean);
  }
  if (typeof requiredApps === "string") {
    const trimmed = requiredApps.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((requiredApp: unknown) => String(requiredApp || "").trim())
          .filter(Boolean);
      }
    } catch {
      return trimmed
        .split(",")
        .map((requiredApp: string) => requiredApp.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function sortAppsByDependencies(apps: any[]): any[] {
  const appsBySlug = new Map(apps.map((app: any) => [app.slug, app]));
  const orderedApps: any[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (app: any) => {
    if (!app?.slug || visited.has(app.slug)) return;
    if (visiting.has(app.slug)) {
      orderedApps.push(app);
      visited.add(app.slug);
      return;
    }
    visiting.add(app.slug);
    normalizeRequiredApps(app.requiredApps).forEach((requiredSlug: string) => {
      const dependency = appsBySlug.get(requiredSlug);
      if (dependency) visit(dependency);
    });
    visiting.delete(app.slug);
    visited.add(app.slug);
    orderedApps.push(app);
  };

  apps.forEach(visit)
  return orderedApps.filter(
    (app, index, collection) =>
      collection.findIndex((candidate: any) => candidate.slug === app.slug) === index,
  );
}

export function getDefaultPricingModel(app: any): string {
  if (app?.pricingModel === "FREE") return "FREE";
  if (app?.pricingModel === "PAY_PER_USE") return "PAY_PER_USE";
  return "SUBSCRIPTION";
}

export { getStatusMeta };

export function getTransactionTypeLabel(type: string): string {
  switch (String(type || "").toUpperCase()) {
    case "DEPOSIT": return "شحن";
    case "PURCHASE": return "شراء";
    case "USAGE": return "استهلاك";
    case "WITHDRAW": return "سحب";
    case "REFUND": return "استرداد";
    case "CHARGE": return "خصم";
    default: return "معاملة";
  }
}

export function getBillingTypeLabel(type: string): string {
  switch (String(type || "").toUpperCase()) {
    case "PLATFORM_FEE": return "رسوم منصة";
    case "APP_SUBSCRIPTION":
    case "SUBSCRIPTION": return "اشتراك أداة";
    case "APP_USAGE":
    case "USAGE": return "استهلاك";
    case "MARKETPLACE_PURCHASE": return "شراء من المتجر";
    case "TOP_UP": return "شحن محفظة";
    default: return "حركة فوترة";
  }
}

export function getPaymentMethodLabel(method: string): string {
  switch (String(method || "").toUpperCase()) {
    case "WALLET": return "خصم من المحفظة";
    case "BANK_TRANSFER": return "تحويل بنكي";
    case "ONLINE": return "دفع إلكتروني";
    case "CASH": return "دفع نقدي";
    default: return "طريقة غير محددة";
  }
}

export function getPricingModelLabel(model: string): string {
  switch (String(model || "").toUpperCase()) {
    case "FREE": return "مجاني";
    case "SUBSCRIPTION": return "اشتراك شهري";
    case "PAY_PER_USE": return "حسب الاستخدام";
    case "HYBRID": return "اشتراك + استخدام";
    default: return "غير محدد";
  }
}

export function formatUsageFeatureLabel(feature: string): string {
  const normalizedFeature = String(feature || "").trim();
  if (!normalizedFeature) return "غير مصنف";
  const labels: Record<string, string> = {
    outbound_messages: "الرسائل الصادرة",
    pdf_exports: "تصدير PDF",
    scheduled_reports: "التقارير المجدولة",
    cart_upsell_view: "عرض بيع إضافي في السلة",
    checkout_payment_view: "عرض الدفع عند إتمام الشراء",
    cross_sell_section_view: "عرض قسم البيع المتقاطع",
    duplicate_order_created: "إنشاء طلب مكرر",
    order_billing: "فوترة الطلبات",
    ai_chat: "محادثات الذكاء الاصطناعي",
    whatsapp_messages: "رسائل واتساب",
  };
  if (labels[normalizedFeature]) return labels[normalizedFeature] ?? normalizedFeature;
  if (hasArabicText(normalizedFeature)) return normalizedFeature;
  return "استخدام أداة";
}

export function getInvoiceDisplayTitle(invoice: any): string {
  const note = invoice?.notes?.trim();
  if (note) return note;
  return invoice?.invoiceNumber || "فاتورة بدون رقم";
}

export function getInvoiceReferenceLabel(invoice: any): string | null {
  if (!invoice?.invoiceNumber) return null;
  if (invoice?.notes?.trim() && invoice.notes.trim() !== invoice.invoiceNumber) {
    return `رقم الفاتورة: ${invoice.invoiceNumber}`;
  }
  return null;
}

export function getPaymentDisplayTitle(payment: any): string {
  const invoiceNote = payment?.invoice?.notes?.trim();
  if (invoiceNote) return invoiceNote;
  return payment?.paymentNumber || "دفعة بدون رقم";
}

export function getPaymentReferenceLabel(payment: any): string {
  const details: string[] = [];
  if (payment?.paymentNumber) details.push(`رقم العملية: ${payment.paymentNumber}`);
  if (payment?.invoice?.invoiceNumber) details.push(`الفاتورة: ${payment.invoice.invoiceNumber}`);
  if (payment?.method) details.push(getPaymentMethodLabel(payment.method));
  return details.join(" • ");
}

export function getReceiptDisplayTitle(receipt: any): string {
  const receiptNote = receipt?.notes?.trim();
  if (receiptNote) return receiptNote;
  const invoiceNote = receipt?.invoice?.notes?.trim();
  if (invoiceNote) return invoiceNote;
  return receipt?.invoice?.invoiceNumber || "إيصال بدون فاتورة";
}

export function getReceiptReferenceLabel(receipt: any): string {
  const details: string[] = [];
  if (receipt?.invoice?.invoiceNumber) details.push(`الفاتورة: ${receipt.invoice.invoiceNumber}`);
  if (receipt?.walletNumber?.name) details.push(`المحفظة: ${receipt.walletNumber.name}`);
  return details.join(" • ");
}

export function getRoleLabel(role: string): string {
  switch (String(role || "").trim().toUpperCase().replace(/[\s-]+/g, "_")) {
    case "OWNER": return "مالك الشركة";
    case "SUPER_ADMIN": return "مسؤول عام";
    case "SYSTEM": return "حساب نظام";
    case "BOT": return "حساب آلي";
    case "API": return "حساب ربط برمجي";
    case "SERVICE": return "حساب خدمة";
    case "PROJECT_MANAGER": return "مدير مشروع";
    case "TEAM_LEAD": return "قائد فريق";
    case "DEVELOPER": return "مطوّر";
    case "TESTER": return "مختبر جودة";
    case "COMPANY_ADMIN": return "مدير شركة";
    case "MANAGER": return "مدير";
    case "AGENT": return "موظف";
    case "AFFILIATE": return "مسوّق بالعمولة";
    default: return "عضو";
  }
}

const SYSTEM_ROLE_SET = new Set([
  "SUPER_ADMIN",
  "SYSTEM",
  "BOT",
  "API",
  "SERVICE",
  "PROJECT_MANAGER",
  "TEAM_LEAD",
  "DEVELOPER",
  "TESTER",
]);

export function isSystemAccount(user: {
  role?: string | null;
  email?: string | null;
  isSystem?: boolean;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.isSystem) return true;
  const normalizedRole = String(user.role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (SYSTEM_ROLE_SET.has(normalizedRole)) return true;
  const email = String(user.email || "").trim().toLowerCase();
  return (
    /^(system|noreply|no-reply|bot|service|webhook|api)[@.+_-]/i.test(email) ||
    /@(.*\.)?(system|internal|bot)\.local$/i.test(email)
  );
}

export function isUserDormant(
  user: { lastLoginAt?: string | null; createdAt?: string | null } | null | undefined,
  thresholdDays: number = 30,
): boolean {
  if (!user) return false;
  const thresholdMs = thresholdDays * 86400000;
  const referenceDate = user.lastLoginAt || user.createdAt;
  if (!referenceDate) return false;
  const parsed = new Date(referenceDate).getTime();
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed > thresholdMs;
}

export function getUnifiedUsersCount(review: any, company: any): number {
  const limitUsersEntry = review?.limits?.entries?.find((entry: any) => entry.key === "users");
  if (limitUsersEntry && Number.isFinite(Number(limitUsersEntry.current))) {
    return Number(limitUsersEntry.current);
  }
  if (review?.userStats && Number.isFinite(Number(review.userStats.total))) {
    return Number(review.userStats.total);
  }
  if (company?._count && Number.isFinite(Number(company._count.users))) {
    return Number(company._count.users);
  }
  return 0;
}

export function getCompanyPlanUsagePercentage(review: any): {
  percentage: number | null;
  label: string;
  hasFiniteLimit: boolean;
} {
  const entries = Array.isArray(review?.limits?.entries) ? review.limits.entries : [];
  const finiteEntries = entries.filter(
    (entry: any) => !entry.isUnlimited && Number(entry.limit) > 0,
  );
  if (!finiteEntries.length) {
    return { percentage: null, label: "بدون حدود رقمية", hasFiniteLimit: false };
  }
  const topEntry = finiteEntries.reduce((max: any, current: any) =>
    (Number(current.percentage) || 0) > (Number(max.percentage) || 0) ? current : max,
  );
  return {
    percentage: Math.round(Number(topEntry.percentage) || 0),
    label: topEntry.label || "الخطة",
    hasFiniteLimit: true,
  };
}

export function getCompanyRiskInfo(company: any, review: any): {
  level: "danger" | "warning" | "ok";
  label: string;
  className: string;
} {
  if (!company?.isActive) {
    return {
      level: "danger",
      label: "خطر: الشركة متوقفة",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
    };
  }
  const subStatus = String(review?.subscription?.status || "").toUpperCase();
  if (subStatus === "EXPIRED" || subStatus === "CANCELLED") {
    return {
      level: "danger",
      label: "خطر: الاشتراك غير نشط",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
    };
  }
  if ((review?.subscription?.failedAttempts || 0) > 0) {
    return {
      level: "danger",
      label: "خطر: فشل في التحصيل",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
    };
  }
  if ((review?.billing?.stats?.overdueInvoices || 0) > 0) {
    return {
      level: "danger",
      label: "خطر: فواتير متأخرة",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
    };
  }

  const daysUntilBilling = getDaysUntil(review?.subscription?.nextBillingDate);
  if (daysUntilBilling !== null && daysUntilBilling <= 7) {
    return {
      level: "warning",
      label: daysUntilBilling < 0 ? "تحذير: متأخر عن السداد" : "تحتاج متابعة: موعد الفوترة",
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }
  const balance = Number(review?.wallet?.balance || 0);
  const monthlyFee = Number(review?.subscription?.monthlyFee || 0);
  if (monthlyFee > 0 && balance < monthlyFee) {
    return {
      level: "warning",
      label: "تحذير: رصيد غير كافٍ",
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }
  const highUsage = (review?.limits?.entries || []).some(
    (entry: any) => !entry.isUnlimited && Number(entry.limit) > 0 && Number(entry.percentage) >= 80,
  );
  if (highUsage) {
    return {
      level: "warning",
      label: "تحذير: اقتراب من الحد",
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }

  return {
    level: "ok",
    label: "مستقرة",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
  };
}

export function normalizeCompanyData(rawCompany: any, fallback: any = null): any {
  if (!rawCompany) return fallback;
  return {
    ...(fallback || {}),
    ...rawCompany,
    _count: {
      ...(fallback?._count || {}),
      ...(rawCompany._count || {}),
    },
  };
}

export function getBundleAppSlugs(bundle: any): string[] {
  if (Array.isArray(bundle?.appSlugs)) {
    return bundle.appSlugs.map((slug: string) => String(slug || "").trim()).filter(Boolean);
  }
  if (Array.isArray(bundle?.apps)) {
    return bundle.apps.map((app: any) => String(app?.slug || "").trim()).filter(Boolean);
  }
  return [];
}

export type ActivityTypeKey =
  | "impersonate"
  | "auth"
  | "billing"
  | "team"
  | "marketplace"
  | "settings"
  | "orders"
  | "support"
  | "system";

function sanitizeActivityText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\b(POST|GET|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\S+/gi, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\/api\/\S*/gi, "")
    .replace(/\/v\d+\/\S*/gi, "")
    .replace(/\/(admin|auth|marketplace|support|activity|billing|wallet|companies|users|employees|orders|products)\S*/gi, "")
    .replace(/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*/gi, "")
    .replace(/\b[A-Za-z]+(Controller|Service|Worker|Middleware|Manager|Router)\b/g, "")
    .replace(/\(\s*Super\s*Admin\s*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-•:]+|[\s\-•:]+$/g, "")
    .trim();
}

function hasArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Format activity log entries into clear, descriptive Arabic sentences.
 * Completely eliminates technical raw /api/ endpoints, HTTP verbs, and system identifiers from the UI.
 */
export function formatActivityTimeline(entry: any): {
  actionText: string;
  detailText: string;
  typeKey: ActivityTypeKey;
  typeLabel: string;
} {
  if (!entry) {
    return {
      actionText: "نشاط غير معروف",
      detailText: "",
      typeKey: "system",
      typeLabel: "النظام",
    };
  }
  const desc = String(entry.description || "").trim();
  const action = String(entry.action || "").toUpperCase();
  const category = String(entry.category || "").toUpperCase();

  let meta: any = null;
  if (entry.metadata) {
    try {
      meta = typeof entry.metadata === "string" ? JSON.parse(entry.metadata) : entry.metadata;
    } catch {
      meta = null;
    }
  }

  // 1. Impersonation (Super Admin entering as Company Admin)
  if (
    action === "IMPERSONATE" ||
    desc.includes("logged in as Company Admin") ||
    desc.includes("دخول إداري كمسؤول") ||
    desc.includes("دخول كمسؤول") ||
    desc.includes("login-as-admin")
  ) {
    const rawReason = meta?.reason || (desc.includes("السبب:") ? desc.split("السبب:")[1]?.trim() : "");
    const cleanReason = sanitizeActivityText(String(rawReason || ""));
    return {
      actionText: "سوبر أدمن دخل كأدمن الشركة",
      detailText: cleanReason ? `السبب: ${cleanReason}` : "تسجيل دخول بدعم موثّق لمتابعة حساب الشركة",
      typeKey: "impersonate",
      typeLabel: "دخول موثّق",
    };
  }

  // 2. Auth / Login
  if (category === "AUTH" || desc.includes("/auth/login") || desc.toLowerCase().includes("login")) {
    const cleaned = sanitizeActivityText(desc);
    return {
      actionText: "تسجيل دخول إلى النظام",
      detailText: (hasArabicText(cleaned) ? cleaned : "") || "عملية مصادقة ناجحة للمستخدم",
      typeKey: "auth",
      typeLabel: "مصادقة",
    };
  }

  // 3. Wallet / Balance Recharge & Billing
  if (
    category === "BILLING" ||
    desc.includes("add-funds") ||
    desc.toLowerCase().includes("wallet") ||
    action.includes("TOP_UP") ||
    action.includes("WALLET") ||
    action.includes("INVOICE") ||
    action.includes("PAYMENT")
  ) {
    const cleaned = sanitizeActivityText(desc);
    return {
      actionText: desc.includes("add-funds") || action.includes("TOP_UP") || action.includes("WALLET")
        ? "شحن رصيد المحفظة"
        : "عملية مالية على الفوترة",
      detailText: (hasArabicText(cleaned) ? cleaned : "") || "تحديث الرصيد أو حركة الفواتير للشركة",
      typeKey: "billing",
      typeLabel: "مالي",
    };
  }

  // 4. Company Suspension / Activation
  if (action.includes("SUSPEND") || desc.toLowerCase().includes("suspended") || desc.includes("إيقاف")) {
    const cleaned = sanitizeActivityText(desc);
    return {
      actionText: "إيقاف نشاط الشركة",
      detailText: (hasArabicText(cleaned) ? cleaned : "") || "تم إيقاف حساب الشركة وتجميد صلاحيات الدخول",
      typeKey: "settings",
      typeLabel: "إدارة",
    };
  }
  if (action.includes("ACTIVATE") || desc.toLowerCase().includes("activated") || desc.includes("تفعيل الشركة")) {
    return {
      actionText: "تفعيل نشاط الشركة",
      detailText: "تم إعادة تنشيط الشركة وفتح الصلاحيات",
      typeKey: "settings",
      typeLabel: "إدارة",
    };
  }

  // 5. Trial Mode
  if (desc.includes("/trial") || action.includes("TRIAL")) {
    const cleaned = sanitizeActivityText(desc);
    return {
      actionText: "تحديث الفترة التجريبية",
      detailText: (hasArabicText(cleaned) ? cleaned : "") || "تعديل إعدادات الفترة المجانية للشركة",
      typeKey: "settings",
      typeLabel: "تجريبي",
    };
  }

  // 6. App / Marketplace Install
  if (desc.includes("/install") || desc.includes("/marketplace") || action.includes("INSTALL") || category === "MARKETPLACE") {
    const appMatch = desc.match(/apps\/([^/\s]+)\/install/i);
    const appName = appMatch ? appMatch[1] : "";
    return {
      actionText: appName ? `تثبيت وتفعيل أداة (${appName})` : "تثبيت وتفعيل أداة من المتجر",
      detailText: "تم تفعيل الأداة بنجاح وربطها بحساب الشركة",
      typeKey: "marketplace",
      typeLabel: "الأدوات",
    };
  }

  // 7. Employees / Users
  if (desc.includes("/employees") || desc.includes("/users") || action.includes("EMPLOYEE") || action.includes("USER") || category === "TEAM") {
    if (desc.includes("DELETE") || action.includes("DELETE")) {
      return {
        actionText: "حذف عضو من الفريق",
        detailText: "تم حذف حساب المستخدم من فريق عمل الشركة",
        typeKey: "team",
        typeLabel: "الفريق",
      };
    }
    if (desc.includes("ROLE") || action.includes("ROLE")) {
      return {
        actionText: "تعديل صلاحية عضو في الفريق",
        detailText: "تم تحديث دور وصلاحيات أحد أعضاء الشركة",
        typeKey: "team",
        typeLabel: "الفريق",
      };
    }
    return {
      actionText: "إضافة عضو جديد للفريق",
      detailText: "تم إنشاء حساب وتعيين صلاحيات لعضو جديد بالشركة",
      typeKey: "team",
      typeLabel: "الفريق",
    };
  }

  // 8. Ownership Transfer
  if (desc.includes("transfer-ownership") || action.includes("TRANSFER")) {
    return {
      actionText: "نقل ملكية الشركة",
      detailText: "تم تعيين مالك جديد للشركة ونقل كافة الصلاحيات",
      typeKey: "settings",
      typeLabel: "ملكية",
    };
  }

  // 9. General company update
  if (desc.includes("/admin/companies") && (desc.includes("PUT") || action.includes("UPDATE"))) {
    return {
      actionText: "تعديل بيانات الشركة",
      detailText: "تحديث الإعدادات أو معلومات الاتصال للشركة",
      typeKey: "settings",
      typeLabel: "إعدادات",
    };
  }

  // 10. Orders / Support / Generic clean-up
  const sanitized = sanitizeActivityText(desc);
  const categoryFallbacks: Record<string, { actionText: string; typeKey: ActivityTypeKey; typeLabel: string }> = {
    ORDERS: { actionText: "تحديث في الطلبات", typeKey: "orders", typeLabel: "الطلبات" },
    CUSTOMERS: { actionText: "تحديث بيانات العملاء", typeKey: "team", typeLabel: "العملاء" },
    PRODUCTS: { actionText: "تحديث كتالوج المنتجات", typeKey: "marketplace", typeLabel: "المنتجات" },
    CONVERSATIONS: { actionText: "نشاط في المحادثات", typeKey: "support", typeLabel: "المحادثات" },
    SUPPORT: { actionText: "تحديث تذكرة دعم", typeKey: "support", typeLabel: "الدعم" },
    SETTINGS: { actionText: "تعديل إعدادات الشركة", typeKey: "settings", typeLabel: "الإعدادات" },
  };
  const fallbackMeta = categoryFallbacks[category] || {
    actionText: "إجراء إداري في النظام",
    typeKey: "system" as ActivityTypeKey,
    typeLabel: "النظام",
  };

  const cleanMetaReason = meta?.reason ? sanitizeActivityText(String(meta.reason)) : "";
  return {
    actionText: hasArabicText(sanitized) ? sanitized : fallbackMeta.actionText,
    detailText: cleanMetaReason ? `السبب: ${cleanMetaReason}` : "",
    typeKey: fallbackMeta.typeKey,
    typeLabel: fallbackMeta.typeLabel,
  };
}
