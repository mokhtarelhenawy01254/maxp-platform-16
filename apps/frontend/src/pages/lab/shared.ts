import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import { LayoutDashboard, FlaskConical, Inbox, ListChecks, Users, FileText, Dna, Tag, Building2, CreditCard, BarChart3, Home, Settings } from 'lucide-react'

export type TabId =
  | "dashboard" | "reception" | "patients" | "orders" | "reports-medical"
  | "tests" | "cultures" | "price-lists" | "contracts" | "branches"
  | "invoices" | "reports" | "home-visits" | "settings";

export const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "┘ä┘ê╪¡╪⌐ ╪º┘ä┘à╪╣┘à┘ä", icon: LayoutDashboard },
  { id: "reception", label: "╪º┘ä╪º╪│╪¬┘é╪¿╪º┘ä", icon: Inbox },
  { id: "patients", label: "╪º┘ä┘à╪▒╪╢┘ë", icon: Users },
  { id: "orders", label: "╪º┘ä╪╖┘ä╪¿╪º╪¬", icon: ListChecks },
  { id: "reports-medical", label: "╪º┘ä╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪╖╪¿┘è╪⌐", icon: FileText },
  { id: "tests", label: "┘â╪¬╪º┘ä┘ê╪¼ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒╪º╪¬", icon: FlaskConical },
  { id: "cultures", label: "╪º┘ä┘à╪▓╪º╪▒╪╣", icon: Dna },
  { id: "price-lists", label: "┘é┘ê╪º╪ª┘à ╪º┘ä╪ú╪│╪╣╪º╪▒", icon: Tag },
  { id: "contracts", label: "╪º┘ä╪¬╪╣╪º┘é╪»╪º╪¬", icon: FileText },
  { id: "branches", label: "╪º┘ä┘ü╪▒┘ê╪╣", icon: Building2 },
  { id: "invoices", label: "╪º┘ä┘à╪»┘ü┘ê╪╣╪º╪¬", icon: CreditCard },
  { id: "reports", label: "╪º┘ä╪¬┘é╪º╪▒┘è╪▒", icon: BarChart3 },
  { id: "home-visits", label: "╪º┘ä╪▓┘è╪º╪▒╪º╪¬ ╪º┘ä┘à┘å╪▓┘ä┘è╪⌐", icon: Home },
  { id: "settings", label: "╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬", icon: Settings },
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

/** Reuse the shared booking endpoints (patients/invoices/price-lists/branches/reports) ΓÇö
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
  sampleStatus?: string; rejectionReason?: string; rejectedBy?: string; rejectedAt?: string;
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

export const CULTURE_STATUS = { SCHEDULED: "┘à╪¼╪»┘ê┘ä╪⌐", DONE: "╪¬┘à╪¬", CANCELLED: "┘à┘ä╪║╪º╪⌐" };

export const LAB_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "╪¿╪º┘å╪¬╪╕╪º╪▒ ╪ú╪«╪░ ╪º┘ä╪╣┘è┘å╪⌐", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  COLLECTED: { label: "╪¬┘à ╪ú╪«╪░ ╪º┘ä╪╣┘è┘å╪⌐", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  IN_PROGRESS: { label: "╪¼╪º╪▒┘ì ╪º┘ä╪¬╪¡┘ä┘è┘ä", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  REVIEWED: { label: "╪¬┘à╪¬ ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  SIGNED: { label: "╪¬┘à ╪º┘ä╪¬┘ê┘é┘è╪╣", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  DELIVERED: { label: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
};

export const LAB_REPORT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "╪¿╪º┘å╪¬╪╕╪º╪▒ ╪º┘ä┘å╪¬╪º╪ª╪¼", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  RESULTS_ENTERED: { label: "╪¬┘à ╪Ñ╪»╪«╪º┘ä ╪º┘ä┘å╪¬╪º╪ª╪¼", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  REVIEWED: { label: "╪¬┘à╪¬ ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  SIGNED: { label: "╪¬┘à ╪º┘ä╪¬┘ê┘é┘è╪╣", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  DELIVERED: { label: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
};

export const PATIENT_FLAGS = [
  { value: "bleeding", label: "┘à╪▒┘è╪╢ ╪│┘è┘ê┘ä╪⌐" },
  { value: "diabetic", label: "┘à╪▒┘è╪╢ ╪│┘â╪▒" },
  { value: "thyroid", label: "╪║╪»╪⌐" },
  { value: "tumor", label: "╪º┘ä╪ú┘ê╪▒╪º┘à" },
  { value: "antibiotic", label: "┘à╪╢╪º╪» ╪¡┘è┘ê┘è" },
  { value: "iron", label: "╪¡╪»┘è╪»" },
  { value: "cortisone", label: "┘â┘ê╪▒╪¬┘è╪▓┘ê┘å" },
  { value: "liver", label: "┘à╪▒┘è╪╢ ┘â╪¿╪»" },
];

export const FLAG_OPTIONS = [
  { value: "critical_high", label: "╪º╪▒╪¬┘ü╪º╪╣ ╪¡╪▒╪¼" },
  { value: "high", label: "╪╣╪º┘ä┘ì" },
  { value: "normal", label: "╪╖╪¿┘è╪╣┘è" },
  { value: "low", label: "┘à┘å╪«┘ü╪╢" },
  { value: "critical_low", label: "╪º┘å╪«┘ü╪º╪╢ ╪¡╪▒╪¼" },
];

export const fetchJson = async <T>(url: string, options?: RequestInit, retries = 2): Promise<T> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: getAuthHeaders(), ...options });
      if (res.status === 502 || res.status === 503) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); continue; }
        throw new Error("╪º┘ä╪«╪º╪»┘à ╪║┘è╪▒ ┘à╪¬╪º╪¡ ╪¡╪º┘ä┘è╪º┘ï - ╪¼╪º╪▒┘ì ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä╪¬╪┤╪║┘è┘ä");
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "┘ü╪┤┘ä ╪º┘ä╪╣┘à┘ä┘è╪⌐");
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
  throw new Error("┘ü╪┤┘ä ╪º┘ä╪╣┘à┘ä┘è╪⌐");
};

export const tryParseJSON = <T = unknown>(v: unknown): T | null => {
  if (!v) return null;
  if (typeof v === 'object') return v as T;
  try { return JSON.parse(v as string) as T; } catch { return null; }
};

export const MODAL_CONTENT_CLS = "bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4";
export const MODAL_INPUT_CLS = "w-full border rounded-lg px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";
