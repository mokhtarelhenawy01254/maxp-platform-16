import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import { LayoutDashboard, FlaskConical, Inbox, ListChecks, Users, FileText, Dna, Tag, Building2, CreditCard, BarChart3, Home, Settings } from 'lucide-react'

export type TabId =
  | "dashboard" | "reception" | "patients" | "orders" | "reports-medical"
  | "tests" | "cultures" | "price-lists" | "contracts" | "branches"
  | "invoices" | "reports" | "home-visits" | "settings";

export const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "لوحة المعمل", icon: LayoutDashboard },
  { id: "reception", label: "الاستقبال", icon: Inbox },
  { id: "patients", label: "المرضى", icon: Users },
  { id: "orders", label: "الطلبات", icon: ListChecks },
  { id: "reports-medical", label: "التقارير الطبية", icon: FileText },
  { id: "tests", label: "كتالوج الاختبارات", icon: FlaskConical },
  { id: "cultures", label: "المزارع", icon: Dna },
  { id: "price-lists", label: "قوائم الأسعار", icon: Tag },
  { id: "contracts", label: "التعاقدات", icon: FileText },
  { id: "branches", label: "الفروع", icon: Building2 },
  { id: "invoices", label: "المدفوعات", icon: CreditCard },
  { id: "reports", label: "التقارير", icon: BarChart3 },
  { id: "home-visits", label: "الزيارات المنزلية", icon: Home },
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
  const base = buildApiUrl(`lab/${path}`);
  let url: URL;
  try { url = new URL(base); } catch { url = new URL(base, window.location.origin); }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

/** Reuse the shared booking endpoints (patients/invoices/price-lists/branches/reports) —
 *  they are NOT gated by booking-app at the backend, so a lab-only company can use them. */
export const bookingApi = (path: string) => {
  const base = buildApiUrl(`booking/${path}`);
  let url: URL;
  try { url = new URL(base); } catch { url = new URL(base, window.location.origin); }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

export interface LabTest {
  id: string; name: string; category?: string; abbreviation?: string;
  sampleType?: string; price: number; isActive: boolean; createdAt: string;
  parameters?: LabTestParameter[];
  parameterCount?: number;
}

export interface LabTestParameter {
  id: string; testId: string; name: string;
  unit?: string; referenceRange?: string;
  resultOptions?: string[] | string;
  showFlag: boolean; sortOrder: number; isActive: boolean;
}

export interface LabOrder {
  id: string; orderNumber?: string;
  patientId?: string; patientName: string; patientPhone?: string;
  patientGender?: string; patientAge?: string;
  contractId?: string; branchId?: string;
  doctorName?: string; doctorType?: string;
  fastingHours?: number; externalSample: boolean;
  collectionDate?: string; receiveDate?: string;
  status: string; reportStatus: string;
  subtotal: number; discount: number; total: number; paid: number; remaining: number;
  patientFlags?: string[] | Record<string, unknown> | string;
  notes?: string; signedBy?: string; signedAt?: string; createdAt: string;
  tests?: LabOrderTest[];
}

export interface LabOrderTest {
  id: string; orderId: string; testId: string;
  price: number; status: string;
  test?: { id: string; name: string; abbreviation?: string; category?: string };
  results?: LabResultItem[];
}

export interface LabResultItem {
  parameterId: string; parameterName: string;
  unit?: string; result?: string; flag?: string;
}

export interface LabCulture {
  id: string; category?: string; name: string; sampleType?: string;
  price: number; isActive: boolean; createdAt: string;
  organisms?: { id: string; name: string }[];
  antibiotics?: { id: string; name: string }[];
  organismCount?: number; antibioticCount?: number;
}

export interface LabContract {
  id: string; name: string; region?: string; governorate?: string;
  discountType: string; discountPercent: number; externalSample: boolean;
  isActive: boolean; createdAt: string;
}

export interface LabHomeVisit {
  id: string; patientName: string; phone?: string; address?: string;
  visitDate?: string; status: string; notes?: string; reviewed: boolean; createdAt: string;
}

export interface LabSampleType {
  id: string; name: string; instructions?: string; isActive: boolean; createdAt: string;
}

export const CULTURE_STATUS = { SCHEDULED: "مجدولة", DONE: "تمت", CANCELLED: "ملغاة" };

export const LAB_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "بانتظار أخذ العينة", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  COLLECTED: { label: "تم أخذ العينة", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  IN_PROGRESS: { label: "جارٍ التحليل", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  REVIEWED: { label: "تمت المراجعة", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  SIGNED: { label: "تم التوقيع", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  DELIVERED: { label: "تم التسليم", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
};

export const LAB_REPORT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "بانتظار النتائج", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  RESULTS_ENTERED: { label: "تم إدخال النتائج", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  REVIEWED: { label: "تمت المراجعة", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  SIGNED: { label: "تم التوقيع", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  DELIVERED: { label: "تم التسليم", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
};

export const PATIENT_FLAGS = [
  { value: "bleeding", label: "مريض سيولة" },
  { value: "diabetic", label: "مريض سكر" },
  { value: "thyroid", label: "غدة" },
  { value: "tumor", label: "الأورام" },
  { value: "antibiotic", label: "مضاد حيوي" },
  { value: "iron", label: "حديد" },
  { value: "cortisone", label: "كورتيزون" },
  { value: "liver", label: "مريض كبد" },
];

export const FLAG_OPTIONS = [
  { value: "critical_high", label: "ارتفاع حرج" },
  { value: "high", label: "عالٍ" },
  { value: "normal", label: "طبيعي" },
  { value: "low", label: "منخفض" },
  { value: "critical_low", label: "انخفاض حرج" },
];

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
