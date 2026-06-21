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
}

const statusMap: Record<string, Record<string, { label: string; severity: string }>> = {
  subscription: {
    CANCELLED: { label: "ملغي", severity: "danger" },
    PAUSED: { label: "متوقف مؤقتًا", severity: "warning" },
    TRIAL: { label: "تجريبي", severity: "info" },
    ACTIVE: { label: "نشط", severity: "success" },
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
    TRIAL: { label: "تجريبي", severity: "info" },
    CANCELLED: { label: "ملغي", severity: "danger" },
    ACTIVE: { label: "نشط", severity: "success" },
  },
}

export function getStatusMeta(category: string, status?: string): { label: string; className: string } {
  const entry = statusMap[category]?.[status ?? ""]
  if (entry) {
    return { label: entry.label, className: severityClasses[entry.severity] ?? "" }
  }
  return { label: status || "غير معروف", className: severityClasses["neutral"] ?? "" }
}
