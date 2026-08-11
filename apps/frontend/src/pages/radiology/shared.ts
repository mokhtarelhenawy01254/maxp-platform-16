import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import { LayoutDashboard, Inbox, Users, FolderOpen, FileText, ScanLine, Tag, Building2, CreditCard, BarChart3, Settings, CalendarDays, Plus, Banknote } from "lucide-react";

export type TabId =
  | "dashboard" | "reception" | "patients" | "studies" | "reports"
  | "exam-types" | "price-lists" | "contracts" | "branches" | "invoices"
  | "reports-overview" | "insurance-invoices" | "insurance-ledger" | "price-quote" | "radiologists"
  | "schedule" | "referring-physicians" | "exam-additions" | "statistics" | "cashier-shifts" | "settings";

export const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "لوحة الأشعة", icon: LayoutDashboard },
  { id: "reception", label: "الاستقبال", icon: Inbox },
  { id: "patients", label: "المرضى", icon: Users },
  { id: "schedule", label: "الحجوزات", icon: CalendarDays },
  { id: "studies", label: "الدراسات", icon: FolderOpen },
  { id: "reports", label: "التقارير الطبية", icon: FileText },
  { id: "exam-types", label: "أنواع الفحوصات", icon: ScanLine },
  { id: "exam-additions", label: "إضافات الفحوصات", icon: Plus },
  { id: "price-lists", label: "قوائم الأسعار", icon: Tag },
  { id: "contracts", label: "التعاقدات", icon: FileText },
  { id: "branches", label: "الفروع", icon: Building2 },
  { id: "invoices", label: "المدفوعات", icon: CreditCard },
  { id: "reports-overview", label: "التقارير", icon: BarChart3 },
  { id: "referring-physicians", label: "الأطباء المحوّلون", icon: Users },
  { id: "insurance-invoices", label: "فواتير التأمين", icon: FileText },
  { id: "insurance-ledger", label: "دفتر التأمين", icon: CreditCard },
  { id: "price-quote", label: "عرض سعر", icon: Tag },
  { id: "radiologists", label: "أخصائيو الأشعة", icon: Users },
  { id: "statistics", label: "الإحصائيات", icon: BarChart3 },
  { id: "cashier-shifts", label: "الورديات", icon: Banknote },
  { id: "settings", label: "الإعدادات", icon: Settings },
];

export const getCompanyId = (): string | null => {
  try { return (JSON.parse(localStorage.getItem("user") || "{}") as { companyId?: string }).companyId || null; } catch { return null; }
};

export const getAuthHeaders = () => {
  const headers = tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
  const cid = getCompanyId();
  if (cid) headers["X-Company-Id"] = cid;
  return headers;
};

export const api = (path: string) => {
  const base = buildApiUrl(`radiology/${path}`);
  let url: URL;
  try { url = new URL(base); } catch { url = new URL(base, window.location.origin); }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

/** Reuse the shared booking endpoints (patients/invoices/price-lists/branches/reports) —
 *  they are NOT gated by booking-app at the backend, so a radiology-only company can use them. */
export const bookingApi = (path: string) => {
  const base = buildApiUrl(`booking/${path}`);
  let url: URL;
  try { url = new URL(base); } catch { url = new URL(base, window.location.origin); }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

export interface RadiologyExamType {
  id: string; name: string; category?: string; abbreviation?: string;
  price: number; isActive: boolean; createdAt: string;
}

export interface RadiologyStudyImage {
  id: string; fileName: string; fileSize?: number; seriesDescription?: string; url: string;
}

export interface RadiologyReport {
  id: string; studyId: string; reportText: string;
  reportStatus: string; signedBy?: string; signedAt?: string;
  typedBy?: string; typedAt?: string;
  reviewedBy?: string; reviewedAt?: string;
  finalizedBy?: string; finalizedAt?: string;
  createdAt: string; updatedAt: string;
}

export interface RadiologyReportTemplate {
  id: string; name: string; body: string;
  isActive: boolean; createdAt: string; updatedAt: string;
}

export interface RadiologyStudyPayment {
  id: string; studyId: string; amount: number; method?: string;
  note?: string; paidBy?: string; createdAt: string;
}

export interface RadiologyExamAddition {
  id: string; name: string; price: number; isActive: boolean; createdAt: string;
}

export interface RadiologyContract {
  id: string; name: string; region?: string; governorate?: string;
  discountType: string; discountPercent: number; externalSample: boolean;
  isActive: boolean; createdAt: string; updatedAt: string;
}

export interface RadiologyStudy {
  id: string; studyNumber?: string;
  patientName: string; patientPhone?: string; patientGender?: string;   patientAge?: string;
  nationalId?: string;
  insuranceNumber?: string;
  additionIds?: string[] | string;
  additionAmount?: number;
  paidAmount?: number;
  paymentStatus?: string;
  examTypeId?: string; examTypeName?: string; examType?: RadiologyExamType;
  referralDoctor?: string; notes?: string;
  emergency: boolean; withContrast: boolean;
  status: string; submissionStatus?: string;
  rologyStudyLink?: string; rologyReportLink?: string; rologyRadiologist?: string;
  reportStatus?: string;
  createdAt: string;
  images?: RadiologyStudyImage[];
  report?: RadiologyReport;
}

export const RadiologyStatusMap: Record<string, { label: string; color: string }> = {
  PENDING_IMAGING: { label: "مسجل", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  IMAGED: { label: "تم رفع الصور", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  PENDING_REPORT: { label: "بانتظار التقرير", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  REPORTED: { label: "تم التقرير", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  DELIVERED: { label: "تم التسليم", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
};

export const RadiologyReportStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "مسودة", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  REVIEWED: { label: "تمت المراجعة", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  SIGNED: { label: "تم التوقيع", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  DELIVERED: { label: "تم التسليم", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
};

export const RadiologySubmissionStatusMap: Record<string, { label: string; color: string }> = {
  NOT_SUBMITTED: { label: "غير مرفوع", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  SUBMITTED: { label: "تم الرفع", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  REPORT_READY: { label: "التقرير جاهز", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

export const STUDY_STATUS: Record<string, string> = {
  PENDING_IMAGING: "IMAGED",
  IMAGED: "PENDING_REPORT",
  PENDING_REPORT: "REPORTED",
  REPORTED: "DELIVERED",
  DELIVERED: "",
};

export const fetchJson = async <T>(url: string, options?: RequestInit, retries = 2): Promise<T> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: getAuthHeaders(), ...options });
      if (res.status === 502 || res.status === 503) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
        throw new Error("الخادم غير متاح حالياً - جارٍ إعادة التشغيل");
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "فشل العملية");
      return data.data;
    } catch (e: unknown) {
      if (attempt < retries) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("502") || msg.includes("503") || msg.includes("fetch")) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      }
      throw e;
    }
  }
  throw new Error("فشل العملية");
};

export const tryParseJSON = <T = unknown>(v: unknown): T | null => {
  if (!v) return null;
  if (typeof v === 'object') return v as T;
  try { return JSON.parse(v as string) as T; } catch { return null; }
};

export const MODAL_CONTENT_CLS = "bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4";
export const MODAL_INPUT_CLS = "w-full border rounded-lg px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";
