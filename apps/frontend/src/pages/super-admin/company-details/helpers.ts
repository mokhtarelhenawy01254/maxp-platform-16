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
  const currentFormatted = formatNumber(entry.current);
  const limitFormatted = formatLimit(entry.limit);
  const remainingFormatted = entry.isUnlimited ? "غير محدود" : formatNumber(entry.remaining);
  const pct = Math.round(Number(entry.percentage) || 0);
  // «بدون حد أقصى» تُكتب مرة واحدة في الكارت، مش أربع صيغ لنفس المعنى
  const limitSuffix = entry.isUnlimited ? "" : ` من أصل ${limitFormatted}`;
  const remainingText = entry.isUnlimited ? "" : undefined;

  switch (entry.key) {
    case "users":
      return {
        detail: `الأعضاء النشطون: ${currentFormatted} عضو${limitSuffix}`,
        percentageText: entry.isUnlimited ? "بدون حد أقصى" : `${pct}% من سعة الفريق`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted} مقعد`,
      };
    case "products":
      return {
        detail: `المنتجات المضافة: ${currentFormatted} منتج${limitSuffix}`,
        percentageText: entry.isUnlimited ? "بدون حد أقصى" : `${pct}% من الحد المسموح`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted} منتج`,
      };
    case "orders":
      return {
        detail: `طلبات هذا الشهر: ${currentFormatted} طلب${limitSuffix}`,
        percentageText: entry.isUnlimited ? "بدون حد أقصى" : `${pct}% من حصة الشهر`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted} طلب`,
      };
    case "customers":
      return {
        detail: `العملاء المسجلون: ${currentFormatted} عميل${limitSuffix}`,
        percentageText: entry.isUnlimited ? "بدون حد أقصى" : `${pct}% من سعة العملاء`,
        remainingText: remainingText ?? `المتبقي: ${remainingFormatted} عميل`,
      };
    default:
      return {
        detail: `الاستهلاك الحالي: ${currentFormatted}${limitSuffix}`,
        percentageText: entry.isUnlimited ? "بدون حد أقصى" : `${pct}% مستهلك`,
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
  switch (type) {
    case "DEPOSIT": return "شحن";
    case "PURCHASE": return "شراء";
    case "USAGE": return "استهلاك";
    case "WITHDRAW": return "سحب";
    case "REFUND": return "استرداد";
    case "CHARGE": return "خصم";
    default: return type || "معاملة";
  }
}

export function getBillingTypeLabel(type: string): string {
  switch (type) {
    case "PLATFORM_FEE": return "رسوم منصة";
    case "APP_SUBSCRIPTION":
    case "SUBSCRIPTION": return "اشتراك أداة";
    case "APP_USAGE":
    case "USAGE": return "استهلاك";
    case "MARKETPLACE_PURCHASE": return "شراء من المتجر";
    case "TOP_UP": return "شحن محفظة";
    default: return type || "حركة";
  }
}

export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case "WALLET": return "خصم من المحفظة";
    case "BANK_TRANSFER": return "تحويل بنكي";
    case "ONLINE": return "دفع إلكتروني";
    case "CASH": return "دفع نقدي";
    default: return method || "طريقة غير محددة";
  }
}

export function getPricingModelLabel(model: string): string {
  switch (model) {
    case "FREE": return "مجاني";
    case "SUBSCRIPTION": return "اشتراك شهري";
    case "PAY_PER_USE": return "حسب الاستخدام";
    case "HYBRID": return "اشتراك + استخدام";
    default: return model || "غير محدد";
  }
}

export function formatUsageFeatureLabel(feature: string): string {
  const normalizedFeature = String(feature || "").trim();
  if (!normalizedFeature) return "غير مصنف";
  const labels: Record<string, string> = {
    outbound_messages: "الرسائل الصادرة",
    pdf_exports: "تصدير PDF",
    scheduled_reports: "التقارير المجدولة",
  };
  if (labels[normalizedFeature]) return labels[normalizedFeature] ?? normalizedFeature;
  return normalizedFeature.replace(/[_-]+/g, " ");
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
  switch (role) {
    case "OWNER": return "مالك الشركة";
    case "SUPER_ADMIN": return "مسؤول عام";
    case "COMPANY_ADMIN": return "مدير شركة";
    case "MANAGER": return "مدير";
    case "AGENT": return "موظف";
    case "AFFILIATE": return "مسوّق بالعمولة";
    default: return role || "عضو";
  }
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

/**
 * Format activity log entries into clear, descriptive Arabic sentences.
 * Completely eliminates technical raw /api/ endpoints and HTTP verbs from the UI.
 */
export function formatActivityTimeline(entry: any): { actionText: string; detailText: string } {
  if (!entry) return { actionText: "نشاط غير معروف", detailText: "" };
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
  if (action === "IMPERSONATE" || desc.includes("logged in as Company Admin") || desc.includes("دخول كمسؤول")) {
    const reason = meta?.reason || (desc.includes("السبب:") ? desc.split("السبب:")[1]?.trim() : "");
    return {
      actionText: "دخول إداري كمدير الشركة (Super Admin)",
      detailText: reason ? `السبب: ${reason}` : "تسجيل دخول إشرافي مباشر لمتابعة حساب الشركة",
    };
  }

  // 2. Auth / Login
  if (category === "AUTH" || desc.includes("/auth/login") || desc.toLowerCase().includes("login")) {
    return {
      actionText: "تسجيل دخول إلى النظام",
      detailText: desc.replace(/(POST|GET)\s+\S+/gi, "").trim() || "عملية مصادقة ناجحة للمستخدم",
    };
  }

  // 3. Wallet / Balance Recharge
  if (category === "BILLING" && (desc.includes("add-funds") || desc.includes("wallet") || action.includes("TOP_UP") || action.includes("WALLET"))) {
    return {
      actionText: "شحن رصيد المحفظة",
      detailText: desc.replace(/(POST|GET)\s+\S+/gi, "").trim() || "إيداع رصيد مالي في محفظة الشركة",
    };
  }

  // 3.5. Company Suspension / Activation
  if (action.includes("SUSPEND") || desc.toLowerCase().includes("suspended") || desc.includes("إيقاف")) {
    return {
      actionText: "إيقاف نشاط الشركة",
      detailText: desc.replace(/(POST|GET|PUT)\s+\S+/gi, "").trim() || "تم إيقاف حساب الشركة وتجميد صلاحيات الدخول",
    };
  }
  if (action.includes("ACTIVATE") || desc.toLowerCase().includes("activated") || desc.includes("تفعيل الشركة")) {
    return {
      actionText: "تفعيل نشاط الشركة",
      detailText: "تم إعادة تنشيط الشركة وفتح الصلاحيات",
    };
  }

  // 4. Trial Mode
  if (desc.includes("/trial") || action.includes("TRIAL")) {
    return {
      actionText: "تحديث الفترة التجريبية",
      detailText: desc.replace(/(POST|GET)\s+\S+/gi, "").trim() || "تعديل إعدادات الفترة المجانية للشركة",
    };
  }

  // 5. App / Marketplace Install
  if (desc.includes("/install") || desc.includes("/marketplace") || action.includes("INSTALL")) {
    const appMatch = desc.match(/apps\/([^/\s]+)\/install/i);
    const appName = appMatch ? appMatch[1] : "";
    return {
      actionText: appName ? `تثبيت وتفعيل أداة (${appName})` : "تثبيت وتفعيل أداة من المتجر",
      detailText: "تم تفعيل الأداة بنجاح وربطها بحساب الشركة",
    };
  }

  // 6. Employees / Users
  if (desc.includes("/employees") || desc.includes("/users") || action.includes("EMPLOYEE") || action.includes("USER")) {
    if (desc.includes("DELETE") || action.includes("DELETE")) {
      return {
        actionText: "حذف عضو من الفريق",
        detailText: "تم حذف حساب المستخدم من فريق عمل الشركة",
      };
    }
    return {
      actionText: "إضافة عضو جديد للفريق",
      detailText: "تم إنشاء حساب وتعيين صلاحيات لعضو جديد بالشركة",
    };
  }

  // 7. Ownership Transfer
  if (desc.includes("transfer-ownership") || action.includes("TRANSFER")) {
    return {
      actionText: "نقل ملكية الشركة",
      detailText: "تم تعيين مالك جديد للشركة ونقل كافة الصلاحيات",
    };
  }

  // 8. General company update
  if (desc.includes("/admin/companies") && (desc.includes("PUT") || action.includes("UPDATE"))) {
    return {
      actionText: "تعديل بيانات الشركة",
      detailText: "تحديث الإعدادات أو معلومات الاتصال للشركة",
    };
  }

  // 9. Generic clean-up: Remove any lingering /api/ or HTTP verbs
  const sanitized = desc
    .replace(/(POST|GET|PUT|DELETE|PATCH)\s+\S+/gi, "")
    .replace(/\/api\/[a-zA-Z0-9_\-\/]+/gi, "")
    .replace(/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/install/gi, "")
    .trim();

  return {
    actionText: sanitized || "إجراء إداري في النظام",
    detailText: meta?.reason ? `السبب: ${meta.reason}` : "",
  };
}
