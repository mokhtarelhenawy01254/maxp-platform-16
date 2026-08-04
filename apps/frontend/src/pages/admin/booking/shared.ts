import { Circle as BuildingOffice2Icon, Circle as UserGroupIcon, Circle as WrenchScrewdriverIcon, Circle as CalendarDaysIcon, Circle as ChartBarSquareIcon, Type, X } from 'lucide-react';
import { buildApiUrl } from "../../../utils/urlHelper";
import tokenManager from "../../../utils/tokenManager";
;

import { BarChart4, Building2, CalendarDays, Users, Wrench } from 'lucide-react'
export const getCompanyId = (): string | null => {
  try { return JSON.parse(localStorage.getItem("user") || "{}").companyId || null; } catch { return null; }
};

export const getAuthHeaders = () => {
  const headers = tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
  const cid = getCompanyId();
  if (cid) headers["X-Company-Id"] = cid;
  return headers;
};

export const api = (path: string) => {
  const base = buildApiUrl(`booking/${path}`);
  let url: URL;
  try { url = new URL(base); } catch { url = new URL(base, window.location.origin); }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

export type WorkingDaysMap = Record<string, string>;
export type GenderDaysMap = { male: string[]; female: string[] };

export interface BookingBranch {
  id: string; name: string; address: string; phone: string; phones?: string[];
  workingDays: WorkingDaysMap | string;
  workStart: string; workEnd: string;
  isActive: boolean; createdAt: string;
  maxBookingsPerSlot?: number;
  location?: string; landmarkImage?: string;
  facilityType?: string;
  genderDays?: GenderDaysMap | string;
}

export const FACILITY_TYPES = [
  { value: "clinic", label: "عيادة" },
  { value: "medical_center", label: "مركز طبي" },
  { value: "hospital", label: "مستشفى" },
  { value: "polyclinic", label: "مستوصف" },
  { value: "dental", label: "عيادة أسنان" },
  { value: "cosmetic", label: "مركز تجميل" },
];

export const FACILITY_TYPE_LABEL: Record<string, string> = Object.fromEntries(FACILITY_TYPES.map(f => [f.value, f.label]));

export interface BranchFormData {
  id?: string; name: string; address: string; phone?: string;
  phones: string[]; workingDays: string;
  workStart: string; workEnd: string;
  dayHours: Record<string, { start: string; end: string }>;
  maleDays: string[]; femaleDays: string[];
  isActive: boolean; maxBookingsPerSlot: number;
  location?: string; landmarkImage?: string;
  facilityType: string;
}

export interface ServiceBranchAssignment {
  branchId: string;
  packages: Array<{ count: number; price: number }>;
}

export interface ServiceFormData {
  id?: string; name: string; description: string;
  assignedBranchIds?: string[];
  branches: ServiceBranchAssignment[];
  durationMinutes?: number;
  basePrice?: number;
  imageUrl?: string;
  categoryId?: string;
  requiresConsultation?: boolean;
  doctorIds?: string[];
}

export interface ServiceCategory {
  id: string; name: string; color?: string; icon?: string;
  sortOrder: number; isActive: boolean;
}

export interface DoctorServiceLink {
  id: string; doctorId: string; serviceId: string;
  fee?: number; isActive: boolean;
  doctor?: { id: string; name: string; title: string; specialty?: string };
}

export const normalizeBranch = (b: BookingBranch): BookingBranch => ({
  ...b,
  workingDays: typeof b.workingDays === 'string' ? tryParseJSON<WorkingDaysMap>(b.workingDays) || {} as WorkingDaysMap : b.workingDays,
  genderDays: b.genderDays && typeof b.genderDays === 'string' ? tryParseJSON<GenderDaysMap>(b.genderDays) ?? undefined : b.genderDays,
});

export interface BookingDoctor {
  id: string; title: string; name: string; branchId: string; branchName?: string;
  specialty: string; phone: string; isActive: boolean; createdAt: string;
  email?: string; password?: string; consultationFee?: number; commissionRate?: number; bio?: string; avatarUrl?: string;
  serviceIds?: string[];
  doctorServices?: DoctorServiceLink[];
}

export interface DoctorAvailability {
  id: string; doctorId: string; dayOfWeek: number;
  startTime: string; endTime: string; isAvailable: boolean;
}

export interface BookingDoctorDetail extends BookingDoctor {
  branchName?: string;
  gender?: string;
  services?: { id: string; name: string; basePrice?: number | null; durationMinutes?: number | null; fee?: number | null }[];
  availability?: DoctorAvailability[];
  appointments?: {
    id: string; customerName: string; customerPhone?: string;
    appointmentDate: string; startTime: string; endTime?: string;
    status: string; branchName?: string; serviceName?: string;
    diagnosis?: string; treatmentPlan?: string; prescription?: string;
    paymentStatus?: string; source?: string;
  }[];
  todayAppointments?: BookingDoctorDetail["appointments"];
  upcomingAppointments?: BookingDoctorDetail["appointments"];
  pastAppointments?: BookingDoctorDetail["appointments"];
  stats?: {
    total: number; completed: number; pending: number; confirmed: number;
    cancelled: number; noShow: number;
    upcoming: number; today: number;
    attendanceRate: number; noShowRate: number;
    totalBilled: number; collected: number; discounts: number;
    outstanding: number; commission: number; revenue: number;
  };
}

export interface BookingBranchServiceInfo {
  id: string; serviceId: string; branchId: string;
  branch: { id: string; name: string };
  hasPackages: boolean; packages: { count: number; price: number; originalPrice?: number }[];
  isActive: boolean;
}

export interface BookingService {
  id: string; name: string; description: string;
  requiresConsultation?: boolean;
  durationMinutes?: number;
  basePrice?: number;
  imageUrl?: string;
  categoryId?: string;
  category?: { id: string; name: string; color?: string; icon?: string };
  doctorServices?: DoctorServiceLink[];
  isActive: boolean; createdAt: string;
  branchServices: BookingBranchServiceInfo[];
}

export interface BookingAppointment {
  id: string; customerName: string; customerPhone: string;
  customerEmail?: string;
  customerGender?: string;
  branchId: string; branchName?: string;
  doctorId?: string; doctorName?: string;
  serviceId?: string; serviceName?: string;
  appointmentDate: string; startTime: string; endTime: string;
  duration: number; status: string; source?: string;
  paymentRequired: boolean; paymentStatus?: string;
  notes: string; confirmedAt?: string; createdAt: string;
  createdById?: string; createdByType?: string; createdByName?: string;
  patientId?: string;
  nationalId?: string;
  address?: string;
  diagnosis?: string; treatmentPlan?: string; prescription?: string;
  vitals?: string[] | Record<string, unknown> | string;
  followUpDate?: string;
}

export interface BookingPatient {
  id: string; firstName: string; lastName?: string;
  phone?: string; email?: string; gender?: string;
  nationalId?: string; nationalIdImage?: string; address?: string;
  birthDate?: string; bloodType?: string;
  allergies?: string[] | string;
  chronicDiseases?: string[] | string;
  medications?: string[] | string;
  notes?: string; isActive: boolean; createdAt: string;
  visitCount?: number;
  password?: string;
  customer?: { id: string; firstName: string; lastName: string; phone?: string };
}

export type TabId = "dashboard" | "branches" | "doctors" | "services" | "appointments" | "calendar" | "patients" | "invoices";

export const TABS: { id: TabId; label: string; icon: typeof BarChart4 }[] = [
  { id: "dashboard", label: "لوحة التحكم", icon: BarChart4 },
  { id: "appointments", label: "المواعيد", icon: CalendarDays },
  { id: "calendar", label: "التقويم", icon: CalendarDays },
  { id: "branches", label: "الفروع", icon: Building2 },
  { id: "doctors", label: "الأطباء", icon: Users },
  { id: "services", label: "الخدمات", icon: Wrench },
  { id: "patients", label: "المرضى", icon: Users },
  { id: "invoices", label: "المدفوعات", icon: BarChart4 },
];

export interface BookingInvoice {
  id: string; invoiceNumber: string; patientId: string;
  patient?: { id: string; firstName: string; lastName: string; phone?: string };
  appointmentId?: string;
  appointment?: { id: string; appointmentDate: string; serviceName?: string };
  total: number; discount: number; amountPaid: number; net: number; remaining: number;
  status: string; dueDate?: string; notes?: string; createdAt: string;
  payments?: { id: string; amount: number; method: string; paidAt: string }[];
}

export const INVOICE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  UNPAID: { label: "غير مسددة", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  PARTIAL: { label: "مسدد جزئياً", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  PAID: { label: "مسددة", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  REFUNDED: { label: "ملغاة", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
};

export const PAYMENT_METHODS = ["CASH", "CARD", "WALLET", "ONLINE"];
export const PAYMENT_METHOD_LABEL: Record<string, string> = { CASH: "نقدي", CARD: "بطاقة", WALLET: "محفظة", ONLINE: "أونلاين" };

export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  confirmed: { label: "مؤكد", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  completed: { label: "مكتمل", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  no_show: { label: "لم يحضر", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
};

export const MODAL_CONTENT_CLS = "bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4";
export const MODAL_INPUT_CLS = "w-full border rounded-lg px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

export const DAYS = [
  { value: "sat", label: "السبت" }, { value: "sun", label: "الأحد" },
  { value: "mon", label: "الإثنين" }, { value: "tue", label: "الثلاثاء" },
  { value: "wed", label: "الأربعاء" }, { value: "thu", label: "الخميس" },
  { value: "fri", label: "الجمعة" },
];

export const DAY_NAMES: Record<string, string> = {sat:"السبت",sun:"الأحد",mon:"الإثنين",tue:"الثلاثاء",wed:"الأربعاء",thu:"الخميس",fri:"الجمعة"};

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
};

export const tryParseJSON = <T = unknown>(v: unknown): T | null => {
  if (!v) return null;
  if (typeof v === 'object') return v as T;
  try { return JSON.parse(v as string) as T; } catch { return null; }
};
