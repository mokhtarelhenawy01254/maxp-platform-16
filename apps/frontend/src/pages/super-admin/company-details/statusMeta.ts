const severityClasses: Record<string, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
  info:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300",
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300",
  blue:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-300",
};

const statusMap: Record<string, Record<string, { label: string; severity: string }>> = {
  subscription: {
    ACTIVE: { label: "نشط", severity: "success" },
    TRIAL: { label: "تجريبي", severity: "info" },
    PAUSED: { label: "متوقف مؤقتًا", severity: "warning" },
    CANCELLED: { label: "ملغي", severity: "danger" },
    EXPIRED: { label: "منتهي", severity: "danger" },
  },
  invoice: {
    PAID: { label: "مدفوعة", severity: "success" },
    OVERDUE: { label: "متأخرة", severity: "danger" },
    SENT: { label: "مرسلة", severity: "warning" },
    DRAFT: { label: "مسودة", severity: "neutral" },
    CANCELLED: { label: "ملغية", severity: "neutral" },
  },
  payment: {
    COMPLETED: { label: "مكتمل", severity: "success" },
    FAILED: { label: "فاشل", severity: "danger" },
    PENDING: { label: "معلق", severity: "warning" },
  },
  receipt: {
    APPROVED: { label: "مقبول", severity: "success" },
    REJECTED: { label: "مرفوض", severity: "danger" },
    PENDING: { label: "قيد المراجعة", severity: "warning" },
  },
  app: {
    ACTIVE: { label: "مفعل", severity: "success" },
    TRIAL: { label: "تجريبي", severity: "info" },
    CANCELLED: { label: "ملغي", severity: "danger" },
    SUSPENDED: { label: "موقوف", severity: "warning" },
  },
  ticket: {
    OPEN: { label: "مفتوحة", severity: "warning" },
    IN_PROGRESS: { label: "قيد المعالجة", severity: "info" },
    WAITING_FOR_RESPONSE: { label: "بانتظار الرد", severity: "warning" },
    RESOLVED: { label: "تم الحل", severity: "success" },
    CLOSED: { label: "مغلقة", severity: "neutral" },
  },
  user: {
    ACTIVE: { label: "نشط", severity: "success" },
    INACTIVE: { label: "غير نشط", severity: "neutral" },
    SUSPENDED: { label: "موقوف", severity: "danger" },
    NEVER_LOGGED_IN: { label: "لم يسجل دخول", severity: "warning" },
  },
  activity: {
    CRITICAL: { label: "حرج", severity: "danger" },
    HIGH: { label: "مرتفع", severity: "warning" },
    MEDIUM: { label: "متوسط", severity: "info" },
    LOW: { label: "عادي", severity: "neutral" },
  },
  company: {
    ACTIVE: { label: "نشطة", severity: "success" },
    INACTIVE: { label: "متوقفة", severity: "danger" },
    TRIAL: { label: "تجريبية", severity: "info" },
    SUSPENDED: { label: "موقوفة", severity: "danger" },
  },
  channel: {
    CONNECTED: { label: "متصلة", severity: "success" },
    DISCONNECTED: { label: "غير متصلة", severity: "danger" },
    EXPIRED: { label: "منتهية", severity: "warning" },
  },
  pricingModel: {
    FREE: { label: "مجاني", severity: "neutral" },
    PAY_PER_USE: { label: "حسب الاستخدام", severity: "blue" },
    SUBSCRIPTION: { label: "اشتراك شهري", severity: "info" },
    HYBRID: { label: "هجين", severity: "warning" },
  },
  role: {
    OWNER: { label: "مالك الشركة", severity: "info" },
    SUPER_ADMIN: { label: "مسؤول عام", severity: "blue" },
    COMPANY_ADMIN: { label: "مدير شركة", severity: "blue" },
    MANAGER: { label: "مدير", severity: "info" },
    AGENT: { label: "موظف", severity: "neutral" },
    AFFILIATE: { label: "مسوّق بالعمولة", severity: "warning" },
  },
};

export function getStatusMeta(category: string, status?: string): { label: string; className: string } {
  if (!status) {
    return { label: "غير محدد", className: severityClasses["neutral"] ?? "" };
  }
  const normalizedKey = String(status).toUpperCase();
  const entry = statusMap[category]?.[normalizedKey] || statusMap[category]?.[status];
  if (entry) {
    return { label: entry.label, className: severityClasses[entry.severity] ?? "" };
  }

  // Cross-category fallback for common statuses
  for (const cat of Object.keys(statusMap)) {
    if (statusMap[cat][normalizedKey]) {
      const match = statusMap[cat][normalizedKey];
      return { label: match.label, className: severityClasses[match.severity] ?? "" };
    }
  }

  return { label: status, className: severityClasses["neutral"] ?? "" };
}
