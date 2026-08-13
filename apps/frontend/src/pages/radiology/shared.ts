import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { LayoutDashboard, Users, FolderOpen, FileText, ScanLine, Tag, Building2, CreditCard, BarChart3, Settings, CalendarDays, Banknote, Landmark } from "lucide-react";

export type TabId =
  | "dashboard" | "patients" | "studies" | "reports"
  | "exam-types" | "price-lists" | "contracts" | "branches" | "invoices"
  | "reports-overview" | "insurance-invoices" | "insurance-ledger" | "insurance-companies" | "price-quote" | "radiologists"
  | "schedule" | "referring-physicians" | "statistics" | "cashier-shifts" | "settings";

export const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "radiology.tabs.dashboard", icon: LayoutDashboard },
  { id: "patients", label: "radiology.tabs.patients", icon: Users },
  { id: "schedule", label: "radiology.tabs.schedule", icon: CalendarDays },
  { id: "studies", label: "radiology.tabs.studies", icon: FolderOpen },
  { id: "reports", label: "radiology.tabs.reports", icon: FileText },
  { id: "exam-types", label: "radiology.tabs.exam-types", icon: ScanLine },
  { id: "price-lists", label: "radiology.tabs.price-lists", icon: Tag },
  { id: "contracts", label: "radiology.tabs.contracts", icon: FileText },
  { id: "branches", label: "radiology.tabs.branches", icon: Building2 },
  { id: "invoices", label: "radiology.tabs.invoices", icon: CreditCard },
  { id: "reports-overview", label: "radiology.tabs.reports-overview", icon: BarChart3 },
  { id: "referring-physicians", label: "radiology.tabs.referring-physicians", icon: Users },
  { id: "insurance-invoices", label: "radiology.tabs.insurance-invoices", icon: FileText },
  { id: "insurance-ledger", label: "radiology.tabs.insurance-ledger", icon: CreditCard },
  { id: "insurance-companies", label: "radiology.tabs.insurance-companies", icon: Landmark },
  { id: "price-quote", label: "radiology.tabs.price-quote", icon: Tag },
  { id: "radiologists", label: "radiology.tabs.radiologists", icon: Users },
  { id: "statistics", label: "radiology.tabs.statistics", icon: BarChart3 },
  { id: "cashier-shifts", label: "radiology.tabs.cashier-shifts", icon: Banknote },
  { id: "settings", label: "radiology.tabs.settings", icon: Settings },
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
  price: number; isActive: boolean; isAddition?: boolean; createdAt: string;
}

export interface RadiologyDevice {
  id: string; name: string; room?: string; modality?: string;
  isActive: boolean; createdAt: string;
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
  patientFlags?: string[] | string;
  additionIds?: string[] | string;
  additionAmount?: number;
  paidAmount?: number;
  paymentStatus?: string;
  examTypeId?: string; examTypeName?: string; examType?: RadiologyExamType;
  deviceId?: string; deviceName?: string;
  referralDoctor?: string; notes?: string;
  emergency: boolean; withContrast: boolean;
  status: string; submissionStatus?: string;
  orderStatus?: string; appointmentId?: string;
  rologyStudyLink?: string; rologyReportLink?: string; rologyRadiologist?: string;
  reportStatus?: string;
  createdAt: string;
  images?: RadiologyStudyImage[];
  report?: RadiologyReport;
}

export const RadiologyStatusMap: Record<string, { label: string; color: string }> = {
  PENDING_IMAGING: { label: "radiology.studyStatus.PENDING_IMAGING", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  IMAGED: { label: "radiology.studyStatus.IMAGED", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  PENDING_REPORT: { label: "radiology.studyStatus.PENDING_REPORT", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  REPORTED: { label: "radiology.studyStatus.REPORTED", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  DELIVERED: { label: "radiology.studyStatus.DELIVERED", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
};

export const RadiologyReportStatusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "radiology.reportStatus.DRAFT", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  REVIEWED: { label: "radiology.reportStatus.REVIEWED", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  SIGNED: { label: "radiology.reportStatus.SIGNED", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  DELIVERED: { label: "radiology.reportStatus.DELIVERED", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
};

export const RadiologySubmissionStatusMap: Record<string, { label: string; color: string }> = {
  NOT_SUBMITTED: { label: "radiology.submissionStatus.NOT_SUBMITTED", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  SUBMITTED: { label: "radiology.submissionStatus.SUBMITTED", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  REPORT_READY: { label: "radiology.submissionStatus.REPORT_READY", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

export const RadiologyOrderStatusMap: Record<string, { label: string; color: string }> = {
  PENDING:    { label: "radiology.orderStatus.PENDING",    color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  CHECKED_IN: { label: "radiology.orderStatus.CHECKED_IN", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  IN_PROGRESS:{ label: "radiology.orderStatus.IN_PROGRESS",color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  COMPLETED:  { label: "radiology.orderStatus.COMPLETED",  color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  CANCELLED:  { label: "radiology.orderStatus.CANCELLED",  color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

export const RadiologyPaymentStatusMap: Record<string, { label: string; color: string }> = {
  UNPAID:   { label: "radiology.paymentStatus.UNPAID",   color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  PARTIAL:  { label: "radiology.paymentStatus.PARTIAL",  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  PAID:     { label: "radiology.paymentStatus.PAID",     color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  REFUNDED: { label: "radiology.paymentStatus.REFUNDED", color: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
};

export const RADIOLOGY_PATIENT_FLAGS: { value: string; label: string; color: string }[] = [
  { value: "pregnancy", label: "radiology.patientFlags.pregnancy", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300" },
  { value: "contrast_allergy", label: "radiology.patientFlags.contrastAllergy", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  { value: "renal", label: "radiology.patientFlags.renal", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  { value: "bleeding", label: "radiology.patientFlags.bleeding", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  { value: "diabetic", label: "radiology.patientFlags.diabetic", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "claustrophobia", label: "radiology.patientFlags.claustrophobia", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  { value: "pacemaker", label: "radiology.patientFlags.pacemaker", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
];

export const parsePatientFlags = (v?: string[] | string | null): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const flagMeta = (key: string) => RADIOLOGY_PATIENT_FLAGS.find(f => f.value === key);

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
        throw new Error(String(i18n.t("radiology.serverUnavailable")));
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || String(i18n.t("radiology.operationFailed")));
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
  throw new Error(String(i18n.t("radiology.operationFailed")));
};

export const tryParseJSON = <T = unknown>(v: unknown): T | null => {
  if (!v) return null;
  if (typeof v === 'object') return v as T;
  try { return JSON.parse(v as string) as T; } catch { return null; }
};

export const MODAL_CONTENT_CLS = "bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4";
export const MODAL_INPUT_CLS = "w-full border rounded-lg px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";
