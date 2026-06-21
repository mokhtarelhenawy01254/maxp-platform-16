import { getStatusMeta } from "./statusMeta"

export function formatDate(dateValue: string | number | Date | null | undefined): string {
  if (!dateValue) return "غير متوفر"
  try {
    return new Date(dateValue).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "غير متوفر"
  }
}

export function formatDateTime(dateValue: string | number | Date | null | undefined): string {
  if (!dateValue) return "غير متوفر"
  try {
    return new Date(dateValue).toLocaleString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return "غير متوفر"
  }
}

export function formatNumber(value: unknown): string {
  const numericValue = Number(value || 0)
  if (!Number.isFinite(numericValue)) return "0"
  return new Intl.NumberFormat("ar-EG").format(numericValue)
}

export function formatCurrency(value: unknown, currency: string = "EGP"): string {
  const numericValue = Number(value || 0)
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0
  try {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: currency || "EGP",
      maximumFractionDigits: 2,
    }).format(safeValue)
  } catch {
    return `${formatNumber(safeValue)} ${currency || "EGP"}`
  }
}

export function getDaysUntil(dateValue: string | number | Date | null | undefined): number | null {
  if (!dateValue) return null
  const targetDate = new Date(dateValue)
  if (Number.isNaN(targetDate.getTime())) return null
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  )
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000)
}

export function formatRelativeDateLabel(dateValue: string | number | Date | null | undefined): string {
  const days = getDaysUntil(dateValue)
  if (days === null) return "غير متوفر"
  if (days === 0) return "اليوم"
  if (days === 1) return "غدًا"
  if (days > 1) return `بعد ${formatNumber(days)} يوم`
  if (days === -1) return "أمس"
  return `منذ ${formatNumber(Math.abs(days))} يوم`
}

export function formatLimit(limit: unknown): string {
  if (limit === null || limit === undefined) return "غير متوفر"
  if (Number(limit) === -1) return "غير محدود"
  return formatNumber(limit)
}

export function normalizeWebsite(website: string | null | undefined): string | null {
  if (!website) return null
  if (/^https?:\/\//i.test(website)) return website
  return `https://${website}`
}

export function getCount(company: any, key: string): number {
  return company?._count?.[key] || 0
}

export function extractErrorMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback
}

export function normalizeRequiredApps(requiredApps: unknown): string[] {
  if (Array.isArray(requiredApps)) {
    return requiredApps
      .map((requiredApp: unknown) => String(requiredApp || "").trim())
      .filter(Boolean)
  }
  if (typeof requiredApps === "string") {
    const trimmed = requiredApps.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .map((requiredApp: unknown) => String(requiredApp || "").trim())
          .filter(Boolean)
      }
    } catch {
      return trimmed
        .split(",")
        .map((requiredApp: string) => requiredApp.trim())
        .filter(Boolean)
    }
  }
  return []
}

export function sortAppsByDependencies(apps: any[]): any[] {
  const appsBySlug = new Map(apps.map((app: any) => [app.slug, app]))
  const orderedApps: any[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()

  const visit = (app: any) => {
    if (!app?.slug || visited.has(app.slug)) return
    if (visiting.has(app.slug)) {
      orderedApps.push(app)
      visited.add(app.slug)
      return
    }
    visiting.add(app.slug)
    normalizeRequiredApps(app.requiredApps).forEach((requiredSlug: string) => {
      const dependency = appsBySlug.get(requiredSlug)
      if (dependency) visit(dependency)
    })
    visiting.delete(app.slug)
    visited.add(app.slug)
    orderedApps.push(app)
  }

  apps.forEach(visit)
  return orderedApps.filter(
    (app, index, collection) =>
      collection.findIndex((candidate: any) => candidate.slug === app.slug) === index,
  )
}

export function getDefaultPricingModel(app: any): string {
  if (app?.pricingModel === "FREE") return "FREE"
  if (app?.pricingModel === "PAY_PER_USE") return "PAY_PER_USE"
  return "SUBSCRIPTION"
}

export { getStatusMeta }

export function getTransactionTypeLabel(type: string): string {
  switch (type) {
    case "DEPOSIT": return "شحن"
    case "PURCHASE": return "شراء"
    case "USAGE": return "استهلاك"
    case "WITHDRAW": return "سحب"
    case "REFUND": return "استرداد"
    case "CHARGE": return "خصم"
    default: return type || "معاملة"
  }
}

export function getBillingTypeLabel(type: string): string {
  switch (type) {
    case "PLATFORM_FEE": return "رسوم منصة"
    case "APP_SUBSCRIPTION":
    case "SUBSCRIPTION": return "اشتراك أداة"
    case "APP_USAGE":
    case "USAGE": return "استهلاك"
    case "MARKETPLACE_PURCHASE": return "شراء من المتجر"
    case "TOP_UP": return "شحن محفظة"
    default: return type || "حركة"
  }
}

export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case "WALLET": return "خصم من المحفظة"
    case "BANK_TRANSFER": return "تحويل بنكي"
    case "ONLINE": return "دفع إلكتروني"
    case "CASH": return "دفع نقدي"
    default: return method || "طريقة غير محددة"
  }
}

export function getPricingModelLabel(model: string): string {
  switch (model) {
    case "FREE": return "مجاني"
    case "SUBSCRIPTION": return "اشتراك شهري"
    case "PAY_PER_USE": return "حسب الاستخدام"
    case "HYBRID": return "اشتراك + استخدام"
    default: return model || "غير محدد"
  }
}

export function formatUsageFeatureLabel(feature: string): string {
  const normalizedFeature = String(feature || "").trim()
  if (!normalizedFeature) return "غير مصنف"
  const labels: Record<string, string> = {
    outbound_messages: "الرسائل الصادرة",
    pdf_exports: "تصدير PDF",
    scheduled_reports: "التقارير المجدولة",
  }
  if (labels[normalizedFeature]) return labels[normalizedFeature] ?? normalizedFeature
  return normalizedFeature.replace(/[_-]+/g, " ")
}

export function getInvoiceDisplayTitle(invoice: any): string {
  const note = invoice?.notes?.trim()
  if (note) return note
  return invoice?.invoiceNumber || "فاتورة بدون رقم"
}

export function getInvoiceReferenceLabel(invoice: any): string | null {
  if (!invoice?.invoiceNumber) return null
  if (invoice?.notes?.trim() && invoice.notes.trim() !== invoice.invoiceNumber) {
    return `رقم الفاتورة: ${invoice.invoiceNumber}`
  }
  return null
}

export function getPaymentDisplayTitle(payment: any): string {
  const invoiceNote = payment?.invoice?.notes?.trim()
  if (invoiceNote) return invoiceNote
  return payment?.paymentNumber || "دفعة بدون رقم"
}

export function getPaymentReferenceLabel(payment: any): string {
  const details: string[] = []
  if (payment?.paymentNumber) details.push(`رقم العملية: ${payment.paymentNumber}`)
  if (payment?.invoice?.invoiceNumber) details.push(`الفاتورة: ${payment.invoice.invoiceNumber}`)
  if (payment?.method) details.push(getPaymentMethodLabel(payment.method))
  return details.join(" • ")
}

export function getReceiptDisplayTitle(receipt: any): string {
  const receiptNote = receipt?.notes?.trim()
  if (receiptNote) return receiptNote
  const invoiceNote = receipt?.invoice?.notes?.trim()
  if (invoiceNote) return invoiceNote
  return receipt?.invoice?.invoiceNumber || "إيصال بدون فاتورة"
}

export function getReceiptReferenceLabel(receipt: any): string {
  const details: string[] = []
  if (receipt?.invoice?.invoiceNumber) details.push(`الفاتورة: ${receipt.invoice.invoiceNumber}`)
  if (receipt?.walletNumber?.name) details.push(`المحفظة: ${receipt.walletNumber.name}`)
  return details.join(" • ")
}

export function getRoleLabel(role: string): string {
  if (role === "OWNER") return "مالك"
  if (role === "COMPANY_ADMIN") return "مدير شركة"
  if (role === "MANAGER") return "مدير"
  return "موظف"
}

export function normalizeCompanyData(rawCompany: any, fallback: any = null): any {
  if (!rawCompany) return fallback
  return {
    ...(fallback || {}),
    ...rawCompany,
    _count: {
      ...(fallback?._count || {}),
      ...(rawCompany._count || {}),
    },
  }
}

export function getBundleAppSlugs(bundle: any): string[] {
  if (Array.isArray(bundle?.appSlugs)) {
    return bundle.appSlugs.map((slug: string) => String(slug || "").trim()).filter(Boolean)
  }
  if (Array.isArray(bundle?.apps)) {
    return bundle.apps.map((app: any) => String(app?.slug || "").trim()).filter(Boolean)
  }
  return []
}
