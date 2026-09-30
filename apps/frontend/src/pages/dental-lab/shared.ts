import { apiClient } from "@/services/api";
import { config } from "@/config";
import type { AxiosResponse } from "axios";
import { LayoutDashboard, ListChecks, Users, CreditCard, Settings, Wrench, Bell, BarChart3, Package } from "lucide-react";

export type TabId =
  | "dashboard" | "cases" | "doctors" | "work-types" | "technicians" | "invoices" | "materials" | "settings" | "notifications" | "reports";

export const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "dentalLab.tabs.dashboard", icon: LayoutDashboard },
  { id: "cases", label: "dentalLab.tabs.cases", icon: ListChecks },
  { id: "doctors", label: "dentalLab.tabs.doctors", icon: Users },
  { id: "work-types", label: "dentalLab.tabs.work-types", icon: Wrench },
  { id: "technicians", label: "dentalLab.tabs.team", icon: Users },
  { id: "materials", label: "dentalLab.tabs.materials", icon: Package },
  { id: "invoices", label: "dentalLab.tabs.invoices", icon: CreditCard },
  { id: "settings", label: "dentalLab.tabs.settings", icon: Settings },
  { id: "notifications", label: "dentalLab.notifications.title", icon: Bell },
  { id: "reports", label: "dentalLab.reports.title", icon: BarChart3 },
];

export type DentalCaseStatus = "RECEIVED" | "DESIGN" | "MANUFACTURING" | "OUTSOURCED" | "QC" | "READY" | "DELIVERED" | "CLOSED";
export type DentalCasePriority = "NORMAL" | "URGENT" | "STAT";
export type DentalPaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type DentalTechnicianRole =
  | "CAD_DESIGNER"
  | "CERAMIST"
  | "MODEL_WAX"
  | "METAL_CASTING"
  | "FINISHING_POLISHING"
  | "QC_INSPECTOR"
  | "RECEPTION_LOGISTICS"
  | "SUPERVISOR"
  | "GENERAL_TECHNICIAN"
  | "CAD"
  | "RECEPTION"
  | "TECHNICIAN"
  | "QC";

export interface ClinicDoctorItem {
  id: string;
  name: string;
  phone?: string;
  specialty?: string;
}

export interface DentalLabDoctor {
  id: string;
  name: string;
  phone?: string;
  clinicName?: string;
  governorate?: string;
  portalPin?: string;
  creditLimit?: number;
  notes?: string;
  doctors?: ClinicDoctorItem[];
  isActive: boolean;
  createdAt?: string;
  totalBilled?: number;
  totalPaid?: number;
  outstanding?: number;
  activeCases?: number;
  overdueCases?: number;
  creditExceeded?: boolean;
}

export interface DentalLabDoctorDetail extends DentalLabDoctor {
  hasPortalPin?: boolean;
  casesCount?: number;
  completedCases?: number;
  invoicesCount?: number;
  creditTotal?: number;
  customPricing?: Record<string, number>;
  updatedAt?: string;
}

export interface DentalWorkType {
  id: string;
  name: string;
  category?: string;
  pricingMode?: "PER_UNIT" | "FLAT";
  price: number;
  costPrice?: number;
  leadTimeDays?: number;
  urgentLeadTimeDays?: number;
  defaultMaterial?: string;
  materialBrand?: string;
  instructions?: string;
  defaultWarrantyYears?: number;
  defaultCrownCount?: number;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: string;
}

export interface DentalTechnicianVacation {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface DentalTechnician {
  id: string;
  name: string;
  phone?: string;
  role: DentalTechnicianRole;
  userId?: string;
  userEmail?: string;
  user?: { id: string; email: string; firstName?: string; lastName?: string } | null;
  wagePerStage?: number;
  workingDays?: number[] | null;
  dailyCap?: number | null;
  backupTechnicianId?: string | null;
  backupTechnicianName?: string | null;
  vacations?: DentalTechnicianVacation[] | null;
  isActive: boolean;
  createdAt?: string;
  completedStages?: number;
  completedUnits?: number;
  totalEarnings?: number;
  totalBonuses?: number;
  totalDeductions?: number;
  totalPaid?: number;
  balanceDue?: number;
}

export const DAYS_OF_WEEK = [
  { day: 6, label: "السبت", short: "سبت" },
  { day: 0, label: "الأحد", short: "أحد" },
  { day: 1, label: "الإثنين", short: "إثنين" },
  { day: 2, label: "الثلاثاء", short: "ثلاثاء" },
  { day: 3, label: "الأربعاء", short: "أربعاء" },
  { day: 4, label: "الخميس", short: "خميس" },
  { day: 5, label: "الجمعة", short: "جمعة" },
];

export function isTechnicianOnVacation(
  tech: { vacations?: DentalTechnicianVacation[] | null },
  date: Date = new Date()
): { onVacation: boolean; vacation?: DentalTechnicianVacation; upcomingCount: number } {
  if (!Array.isArray(tech?.vacations) || tech.vacations.length === 0) {
    return { onVacation: false, upcomingCount: 0 };
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  let onVacation = false;
  let activeVacation: DentalTechnicianVacation | undefined;
  let upcomingCount = 0;

  for (const v of tech.vacations) {
    if (v && v.startDate && v.endDate) {
      if (dateStr >= v.startDate && dateStr <= v.endDate) {
        onVacation = true;
        activeVacation = v;
      } else if (v.startDate > dateStr) {
        upcomingCount++;
      }
    }
  }
  return { onVacation, vacation: activeVacation, upcomingCount };
}

export interface WorkTypeStageTemplateItem {
  id?: string;
  name: string;
  requiredRole: DentalTechnicianRole;
  slaHours: number;
  stageWage?: number;
  isRequired?: boolean;
  sortOrder?: number;
}

export type TechnicianPayoutType = "PAYOUT" | "ADVANCE" | "BONUS" | "DEDUCTION";

export interface DentalTechnicianPayout {
  id: string;
  companyId?: string;
  technicianId: string;
  type: TechnicianPayoutType;
  amount: number;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "WALLET" | "CHECK" | "OTHER";
  reference?: string;
  notes?: string;
  paidAt: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
}

export interface TechnicianPayoutSummary {
  totalEarned: number;
  completedStages: number;
  completedUnits: number;
  totalPayouts: number;
  totalAdvances: number;
  totalPaid: number;
  totalBonuses: number;
  totalDeductions: number;
  netDue: number;
}

export type MonthlySettlementStatus = "DRAFT" | "CLOSED" | "REOPENED";

export interface DentalMonthlySettlement {
  id: string;
  companyId?: string;
  doctorId: string;
  doctorName?: string;
  clinicName?: string;
  phone?: string;
  year: number;
  month: number;
  periodKey: string;
  openingBalance: number;
  totalBilled: number;
  totalPaid: number;
  totalAdjustments: number;
  closingBalance: number;
  casesCount: number;
  invoicesCount: number;
  status: MonthlySettlementStatus;
  isClosed?: boolean;
  notes?: string;
  closedBy?: string;
  closedByName?: string;
  closedAt?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenedReason?: string;
  createdAt?: string;
  updatedAt?: string;
  doctor?: DentalInvoiceDoctor;
}

export interface MonthlySettlementSummary {
  totalBilled: number;
  totalPaid: number;
  totalAdjustments: number;
  totalClosingBalance: number;
  closedCount: number;
  totalDoctors: number;
}

export interface DentalStageAssignee {
  id: string;
  stageId: string;
  technicianId: string;
  technicianName?: string;
  role: string;
  sharePercent: number;
  notes?: string;
  assignedAt?: string;
  technician?: { id: string; name: string; role?: string };
}

export interface DentalCaseStage {
  id: string;
  caseId?: string;
  name: string;
  status: string;
  assigneeId?: string;
  assigneeName?: string;
  startedAt?: string;
  completedAt?: string;
  sortOrder?: number;
  notes?: string;
  assignees?: DentalStageAssignee[];
}

export interface DentalCaseAssignment {
  id: string;
  caseId?: string;
  technicianId: string;
  role: DentalTechnicianRole;
  technician?: { id: string; name: string; role?: string };
  assignedAt?: string;
}

export interface DentalCaseAttachment {
  id: string;
  caseId?: string;
  fileName: string;
  storedName?: string;
  storedPath?: string;
  mimeType?: string;
  kind?: string;
  size?: number;
  uploadedBy?: string;
  createdAt?: string;
}

export interface DentalPayment {
  id: string;
  invoiceId?: string;
  amount: number;
  method?: string;
  note?: string;
  paidBy?: string;
  createdAt?: string;
}

export interface DentalInvoiceCase {
  id: string;
  caseNumber?: string;
  patientName?: string;
  patientPhone?: string;
  workTypeName?: string;
  unitsCount?: number;
  unitPrice?: number;
  teeth?: string;
  shade?: string;
  material?: string;
  status?: string;
  dueDate?: string;
  total?: number;
}

export interface DentalInvoiceDoctor {
  id: string;
  name: string;
  phone?: string;
  clinicName?: string;
  creditLimit?: number;
}

export interface DentalInvoice {
  id: string;
  invoiceNumber?: string;
  caseId?: string;
  caseNumber?: string;
  doctorId?: string;
  doctorName?: string;
  patientName?: string;
  clinicName?: string;
  workTypeName?: string;
  unitsCount?: number;
  total: number;
  discount?: number;
  paid: number;
  remaining: number;
  paymentStatus?: DentalPaymentStatus;
  status?: string;
  dueDate?: string;
  notes?: string;
  createdAt?: string;
  case?: DentalInvoiceCase;
  doctor?: DentalInvoiceDoctor;
  payments?: DentalPayment[];
}

export interface DentalCustomFieldDef {
  id: string;
  name: string;
  key?: string;
  fieldType?: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface DentalCaseCustomValue {
  id: string;
  fieldId?: string;
  field?: { id: string; name: string; fieldType?: string };
  value?: string;
}

export interface DentalCaseHistoryEntry {
  id: string;
  caseId?: string;
  dimension?: string;
  status?: string;
  oldStatus?: string;
  fromStatus?: string;
  toStatus?: string;
  changedBy?: string;
  userName?: string;
  reason?: string;
  createdAt?: string;
}

export interface DentalQualityCheck {
  id: string;
  caseId?: string;
  checkedBy?: string;
  checkedByName?: string;
  passed: boolean;
  notes?: string;
  checkedAt?: string;
}

export interface DentalRefabrication {
  id: string;
  caseId?: string;
  reason?: string;
  rootCauseCategory?: string;
  isBillable?: boolean;
  stageFrom?: string;
  status?: string;
  requestedBy?: string;
  requestedByName?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedNote?: string;
  resolvedAt?: string;
  createdAt?: string;
}

export type DentalTeamRole = "OWNER" | "MANAGER" | "RECEPTION" | "TECHNICIAN" | "ACCOUNTANT";
export type RefabricationStage = "DESIGN" | "MANUFACTURING" | "QC" | "RECEIVED";

export interface TeamMember {
  userId: string;
  email?: string;
  name?: string;
  platformRole?: string;
  dentalRole?: string;
  isOwnerFlag?: boolean;
}

export interface DoctorStatementCase {
  caseNumber?: string;
  patientName?: string;
  workTypeName?: string;
  status?: string;
  total?: number;
  paid?: number;
  remaining?: number;
  createdAt?: string;
  dueDate?: string;
}

export interface DoctorStatement {
  doctor?: { id?: string; name?: string; phone?: string; clinicName?: string };
  cases?: DoctorStatementCase[];
  invoices?: DentalInvoice[];
  totals?: {
    cases?: number;
    invoicesCount?: number;
    totalCards?: number;
    totalUnits?: number;
    invoiced?: number;
    paid?: number;
    remaining?: number;
    credits?: number;
    openingBalance?: number;
    closingBalance?: number;
  };
}

export interface TechnicianProductivity {
  technicianId?: string;
  name?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  assignedCases?: number;
  completedStages?: number;
  completedUnits?: number;
  avgHoursPerStage?: number;
  avgDaysPerStage?: number;
  wagePerStage?: number;
  earnedWages?: number;
  remakesCount?: number;
}

export interface WorkTypeRevenue {
  workType?: string;
  cases?: number;
  total?: number;
  paid?: number;
  remaining?: number;
}

export interface OverdueReportRow {
  caseNumber?: string;
  doctorName?: string;
  patientName?: string;
  workTypeName?: string;
  dueDate?: string;
  daysOverdue?: number;
  remaining?: number;
}

export interface RemakesAnalysisReport {
  totalCount: number;
  billableCount: number;
  freeCount: number;
  byCategory: Record<string, number>;
  topDoctors: { name: string; count: number }[];
  topWorkTypes: { name: string; count: number }[];
  recentRefabrications: DentalRefabrication[];
}

export interface DentalLabCase {
  id: string;
  caseNumber?: string;
  doctorId?: string;
  doctorName?: string;
  doctor?: { id: string; name: string; clinicName?: string };
  patientName: string;
  patientPhone?: string;
  workTypeId?: string;
  workTypeName?: string;
  unitsCount?: number;
  unitPrice?: number;
  teeth?: string;
  shade?: string;
  material?: string;
  lotNumber?: string;
  materialBrand?: string;
  warrantyYears?: number;
  isTryIn?: boolean;
  tryInStage?: string;
  tryInCount?: number;
  priceSnapshot?: number;
  discount?: number;
  total?: number;
  paid?: number;
  remaining?: number;
  paymentStatus?: DentalPaymentStatus;
  dueDate?: string;
  receivedDate?: string;
  priority: DentalCasePriority;
  technicianId?: string;
  technicianRole?: DentalTechnicianRole;
  source?: string;
  notes?: string;
  status: DentalCaseStatus;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  stages?: DentalCaseStage[];
  assignments?: DentalCaseAssignment[];
  attachments?: DentalCaseAttachment[];
  invoices?: DentalInvoice[];
  customValues?: DentalCaseCustomValue[];
  history?: DentalCaseHistoryEntry[];
  qualityChecks?: DentalQualityCheck[];
  refabrications?: DentalRefabrication[];
}

export interface DentalLabCaseDetail extends DentalLabCase {
  stages: DentalCaseStage[];
  assignments: DentalCaseAssignment[];
  attachments: DentalCaseAttachment[];
  invoices: DentalInvoice[];
  customValues: DentalCaseCustomValue[];
  history: DentalCaseHistoryEntry[];
  qualityChecks: DentalQualityCheck[];
  refabrications: DentalRefabrication[];
  creditNotes: CreditNote[];
  materialUsages?: DentalCaseMaterialUsage[];
}

export type DentalInvoiceMode = "AUTO_ON_RECEIPT" | "AUTO_ON_DELIVERY" | "MANUAL";

export interface BillingPolicy {
  invoiceMode?: DentalInvoiceMode;
  requireInvoiceBeforeDelivery?: boolean;
  requireFullPaymentBeforeDelivery?: boolean;
  enforceCreditLimit?: boolean;
}

export interface MyInfo {
  dentalRole?: string;
  technicianId?: string;
  technician?: { id: string; name: string; role: string; wagePerStage?: number };
}

export interface MyCase {
  id: string;
  caseNumber?: string;
  patientName?: string;
  patientPhone?: string;
  doctorName?: string;
  workTypeName?: string;
  teeth?: string;
  shade?: string;
  material?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  notes?: string;
  hasScan?: boolean;
  attachments?: Array<{ id: string; fileName: string; storedPath: string; mimeType?: string; sizeBytes?: number; kind?: string }>;
  createdAt?: string;
  myStage?: { id: string; name: string; status: string; assigneeName?: string; startedAt?: string; assignees?: Array<{ technicianId: string; technicianName?: string }> };
}

export interface MyWageStageLog {
  id: string;
  caseId: string;
  caseNumber: string;
  patientName?: string;
  workTypeName?: string;
  stageName: string;
  completedAt: string;
  wage: number;
}

export interface MyWage {
  technician?: { id: string; name: string; role: string };
  rate?: number;
  completedStages?: number;
  totalWage?: number;
  thisMonthStages?: number;
  thisMonthWage?: number;
  todayStages?: number;
  todayWage?: number;
  totalPaid?: number;
  totalAdvances?: number;
  totalBonuses?: number;
  totalDeductions?: number;
  balanceDue?: number;
  payouts?: DentalTechnicianPayout[];
  recentStages?: MyWageStageLog[];
}

export interface AgingBucket {
  label: string;
  total: number;
  invoices: number;
}

export interface CreditNote {
  id: string;
  caseId?: string;
  doctorName?: string;
  amount?: number;
  reason?: string;
  createdByName?: string;
  createdAt?: string;
}

export interface DentalLabSettings {
  workOrderHeader?: { labName?: string; address?: string; phone?: string };
  stageTemplates?: Record<string, string[]>;
  whatsappTemplates?: { ready?: string; received?: string; overdue?: string };
  customFields?: DentalCustomFieldDef[];
  billingPolicy?: BillingPolicy;
  guards?: { requireQualityCheckBeforeReady?: boolean };
  wages?: { defaultPerStage?: number };
  doctorPricing?: Record<string, Record<string, number>>;
  notifications?: { dunningEnabled?: boolean; dunningAgingDays?: number; dunningIntervalHours?: number };
}

export interface DashboardData {
  byStatus?: Record<string, number>;
  todayReceived?: number;
  todayDue?: number;
  activeCasesCount?: number;
  activeCount?: number;
  readyCount?: number;
  overdueCount?: number;
  revenue?: number;
  outstanding?: number;
  topDoctors?: { doctorId?: string; doctorName?: string; count?: number; revenue?: number }[];
  topDebtors?: { doctorId?: string; doctorName?: string; outstanding?: number }[];
}

export interface CasesListResult {
  data: DentalLabCase[];
  total: number;
  trashCount?: number;
}

export const CASE_STATUSES: { id: DentalCaseStatus; label: string; color: string; barColor: string; dotColor: string }[] = [
  { id: "RECEIVED", label: "وصل", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300", barColor: "#9ca3af", dotColor: "bg-gray-400" },
  { id: "DESIGN", label: "تصميم", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", barColor: "#3b82f6", dotColor: "bg-blue-500" },
  { id: "MANUFACTURING", label: "تصنيع", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300", barColor: "#6366f1", dotColor: "bg-indigo-500" },
  { id: "OUTSOURCED", label: "بره المعمل", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", barColor: "#f59e0b", dotColor: "bg-amber-500" },
  { id: "QC", label: "فحص جودة", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300", barColor: "#eab308", dotColor: "bg-yellow-500" },
  { id: "READY", label: "جاهز للتسليم", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", barColor: "#22c55e", dotColor: "bg-green-500" },
  { id: "DELIVERED", label: "اتسلم", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300", barColor: "#14b8a6", dotColor: "bg-teal-500" },
  { id: "CLOSED", label: "مقفول", color: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300", barColor: "#6b7280", dotColor: "bg-gray-500" },
];

export const CASE_STATUS_MAP: Record<string, { label: string; color: string }> = CASE_STATUSES.reduce(
  (acc, s) => { acc[s.id] = { label: s.label, color: s.color }; return acc; },
  {} as Record<string, { label: string; color: string }>,
);

/**
 * Translated case-status label. Reads `dentalLab.status.<STATUS>` via i18n
 * (e.g. status.RECEIVED / status.OUTSOURCED) and falls back to the legacy
 * Arabic label from CASE_STATUS_MAP, then to the raw status — so Arabic is
 * always preserved when no translator is available.
 * Usage: `dentalStatusLabel(c.status, t)` inside a React component.
 */
export const dentalStatusLabel = (
  status: string | null | undefined,
  t?: (key: never) => unknown
): string => {
  if (!status) return "";
  if (t) {
    try {
      const translated = t(`dentalLab.status.${status}` as never);
      if (typeof translated === "string" && translated && !translated.startsWith("dentalLab.status.")) {
        return translated;
      }
    } catch (_) {
      // fall through to the Arabic fallback below
    }
  }
  return CASE_STATUS_MAP[status]?.label ?? status;
};

export const CASE_STATUS_FLOW: DentalCaseStatus[] = ["RECEIVED", "DESIGN", "MANUFACTURING", "QC", "READY", "DELIVERED", "CLOSED"];

export const nextStatusOf = (status: string): DentalCaseStatus | null => {
  if (status === "OUTSOURCED") return "QC";
  const idx = CASE_STATUS_FLOW.indexOf(status as DentalCaseStatus);
  if (idx < 0) return null;
  return CASE_STATUS_FLOW[idx + 1] ?? null;
};

export const PRIORITY_CONFIG: Record<DentalCasePriority, { label: string; color: string }> = {
  NORMAL: { label: "عادي", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  URGENT: { label: "مستعجل", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  STAT: { label: "استعجالي جداً", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

export const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  CAD_DESIGNER: { label: "مصمم CAD/CAM", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  CERAMIST: { label: "فني خزف وبورسلين", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  MODEL_WAX: { label: "فني شمع وموديلات", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  METAL_CASTING: { label: "فني ميتال وكاستينج", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" },
  FINISHING_POLISHING: { label: "فني فينشنج وتلميع", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" },
  QC_INSPECTOR: { label: "مراقب جودة QC", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  RECEPTION_LOGISTICS: { label: "استقبال ولوجستيات", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
  SUPERVISOR: { label: "مشرف المعمل / Master", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" },
  GENERAL_TECHNICIAN: { label: "فني أسنان عام", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
  // Backward compatibility
  RECEPTION: { label: "استقبال ولوجستيات", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
  CAD: { label: "مصمم CAD/CAM", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  TECHNICIAN: { label: "فني أسنان عام", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
  QC: { label: "مراقب جودة QC", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

export const PAYMENT_STATUS_MAP: Record<DentalPaymentStatus, { label: string; color: string }> = {
  UNPAID: { label: "مش مدفوعة", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  PARTIAL: { label: "مدفوعة جزئياً", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  PAID: { label: "مدفوعة", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

export const INVOICE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  UNPAID: { label: "غير مسددة", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  PARTIAL: { label: "مسددة جزئياً", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  PAID: { label: "مسددة", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  CANCELLED: { label: "ملغاة", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
};

export const VITA_SHADES = [
  "A1", "A2", "A3", "A3.5", "A4",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4",
  "D2", "D3", "D4",
];

export const BLEACH_SHADES = ["BL1", "BL2", "BL3", "BL4", "OM1", "OM2", "OM3"];

export const IMPRESSION_TYPES = [
  { id: "SILICONE", label: "طبعة سيليكون فيزيائية", icon: "🦷" },
  { id: "PLASTER_MODEL", label: "كاست / موديل جبس", icon: "🏺" },
  { id: "DIGITAL_SCAN", label: "سكانر رقمي (3D Scan STL)", icon: "💻" },
  { id: "BITE", label: "عضة شمع / تسجيل إطباق", icon: "📏" },
];

export const CASE_INTENTS = [
  { id: "FINAL", label: "تسليم نهائي مباشر (Final Delivery)", desc: "إنهاء كامل وتلميع وتسليم" },
  { id: "WAX_TRY_IN", label: "بروفة شمع (Wax Try-in)", desc: "تجربة رص الأسنان وعضة الشمع" },
  { id: "COPING_TRY_IN", label: "بروفة كوبينج / فريم (Coping / Framework)", desc: "تجربة الهيكل المعدني أو الزيركون" },
  { id: "SPECIAL_TRAY", label: "ملعقة خاصة / بيز بليت (Special Tray)", desc: "صناعة تري خاصة قبل الطبعة النهائية" },
];

export const STAGE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "مستنى", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  IN_PROGRESS: { label: "بيشتغل", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  COMPLETED: { label: "خلصت", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  SKIPPED: { label: "تخطيت", color: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
};

export const WORK_TYPE_CATEGORIES = ["CROWN", "BRIDGE", "REMOVABLE", "ORTHODONTICS", "IMPLANT", "VENEERS", "OTHER"];

const asRecord = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);

const unwrapEnvelope = <T>(res: AxiosResponse): T => {
  const body = res.data as { success?: boolean; data?: T; error?: unknown; message?: string };
  if (body && typeof body === "object") {
    if (body.success === false) {
      const err = body.error;
      const msg = typeof err === "string" ? err : err && typeof err === "object" ? (err as { message?: string }).message : undefined;
      throw new Error(msg || body.message || "فشلت العملية");
    }
    if ("data" in body) return body.data as T;
  }
  return res.data as T;
};

const unwrapListEnvelope = <T>(res: AxiosResponse): T[] => {
  const body = asRecord(res.data) ?? {};
  if (body["success"] === false) {
    unwrapEnvelope<T[]>(res);
  }
  const raw = body["data"];
  if (Array.isArray(raw)) return raw as T[];
  const inner = asRecord(raw);
  if (inner) {
    if (Array.isArray(inner["data"])) return inner["data"] as T[];
    if (Array.isArray(inner["items"])) return inner["items"] as T[];
    const rows = asRecord(inner["rows"]);
    if (rows && Array.isArray(rows["data"])) return rows["data"] as T[];
  }
  return [] as T[];
};

export const fetchDoctors = async (params?: string | { search?: string; isActive?: boolean | string; archived?: boolean; all?: boolean; page?: number; limit?: number }): Promise<DentalLabDoctor[]> => {
  const queryParams = typeof params === "string" ? (params ? { search: params } : {}) : (params || {});
  const res = await apiClient.get("/dental-lab/doctors", { params: queryParams });
  // /dental-lab/doctors بيرجع { items, total, page, limit } (وليس array مباشرة)
  const body = asRecord(res.data) ?? {};
  const data = body["data"];
  if (Array.isArray(data)) return data as DentalLabDoctor[];
  if (data && typeof data === "object") {
    const inner = data as Record<string, unknown>;
    if (Array.isArray(inner["items"])) return inner["items"] as DentalLabDoctor[];
  }
  return unwrapListEnvelope<DentalLabDoctor>(res);
};

export const fetchDoctorsFull = async (params?: { search?: string; isActive?: boolean | string; archived?: boolean; all?: boolean; page?: number; limit?: number }): Promise<{
  items: DentalLabDoctor[];
  total: number;
  activeCount: number;
  archivedCount: number;
  summary?: {
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
  };
}> => {
  const res = await apiClient.get("/dental-lab/doctors", { params });
  const body = asRecord(res.data) ?? {};
  const data = (body["data"] as Record<string, unknown>) || {};
  return {
    items: Array.isArray(data["items"]) ? (data["items"] as DentalLabDoctor[]) : [],
    total: typeof data["total"] === "number" ? data["total"] : 0,
    activeCount: typeof data["activeCount"] === "number" ? data["activeCount"] : 0,
    archivedCount: typeof data["archivedCount"] === "number" ? data["archivedCount"] : 0,
    summary: data["summary"] as any,
  };
};

export const fetchDoctorDetail = async (id: string): Promise<DentalLabDoctorDetail> =>
  unwrapEnvelope<DentalLabDoctorDetail>(await apiClient.get(`/dental-lab/doctors/${id}`));

export const createDoctor = async (body: Partial<DentalLabDoctor>): Promise<DentalLabDoctor> => unwrapEnvelope<DentalLabDoctor>(await apiClient.post("/dental-lab/doctors", body));
export const updateDoctor = async (id: string, body: Partial<DentalLabDoctor>): Promise<DentalLabDoctor> => unwrapEnvelope<DentalLabDoctor>(await apiClient.put(`/dental-lab/doctors/${id}`, body));
export const deleteDoctor = async (id: string): Promise<{ success: boolean; mode?: string; message?: string }> => {
  const res = await apiClient.delete(`/dental-lab/doctors/${id}`);
  return res.data as { success: boolean; mode?: string; message?: string };
};
export const restoreDoctor = async (id: string): Promise<DentalLabDoctor> => unwrapEnvelope<DentalLabDoctor>(await apiClient.post(`/dental-lab/doctors/${id}/restore`));
export const permanentDeleteDoctor = async (id: string): Promise<void> => { await apiClient.delete(`/dental-lab/doctors/${id}/permanent`); };

export interface UninvoicedDoctorSummary {
  doctorId: string | null;
  doctorName: string;
  phone?: string | null;
  clinicName?: string | null;
  casesCount: number;
  totalAmount: number;
  cases: {
    id: string;
    caseNumber: string;
    patientName: string;
    workTypeName: string;
    dueDate?: string;
    deliveredAt?: string;
    status: string;
    total: number;
  }[];
}

export interface UninvoicedSummaryResult {
  doctors: UninvoicedDoctorSummary[];
  totalDoctors: number;
  totalCases: number;
  totalAmount: number;
}

export const fetchUninvoicedSummary = async (includeAll = false): Promise<UninvoicedSummaryResult> =>
  unwrapEnvelope<UninvoicedSummaryResult>(await apiClient.get("/dental-lab/invoices/uninvoiced-summary", { params: { includeAll } }));

export const batchCreateMonthlyInvoices = async (body?: { doctorIds?: string[]; dueDate?: string; notes?: string; mode?: "PER_CASE" | "CONSOLIDATED"; includeAllStatuses?: boolean }): Promise<{ createdCount: number; invoicedCasesCount: number }> =>
  unwrapEnvelope<{ createdCount: number; invoicedCasesCount: number }>(await apiClient.post("/dental-lab/invoices/batch-create", body || {}));

export const fetchMonthlySettlements = async (params?: { period?: string; doctorId?: string }): Promise<{
  periodKey: string;
  year: number;
  month: number;
  settlements: DentalMonthlySettlement[];
  summary: MonthlySettlementSummary;
}> => {
  const res = await apiClient.get("/dental-lab/monthly-settlements", { params });
  return unwrapEnvelope(res);
};

export const closeMonthlySettlement = async (body: {
  period: string;
  doctorId?: string;
  doctorIds?: string[];
  notes?: string;
}): Promise<DentalMonthlySettlement[]> => {
  const res = await apiClient.post("/dental-lab/monthly-settlements/close", body);
  return unwrapEnvelope<DentalMonthlySettlement[]>(res);
};

export const reopenMonthlySettlement = async (id: string, body: { reason: string }): Promise<DentalMonthlySettlement> => {
  const res = await apiClient.post(`/dental-lab/monthly-settlements/${id}/reopen`, body);
  return unwrapEnvelope<DentalMonthlySettlement>(res);
};

export const triggerBillingCycleScan = async (force: boolean = true): Promise<unknown> =>
  unwrapEnvelope<unknown>(await apiClient.post("/dental-lab/notifications/scan-billing-cycle", { force }));

export const fetchWorkTypes = async (): Promise<DentalWorkType[]> => unwrapListEnvelope<DentalWorkType>(await apiClient.get("/dental-lab/work-types"));
export const createWorkType = async (body: Partial<DentalWorkType>): Promise<DentalWorkType> => unwrapEnvelope<DentalWorkType>(await apiClient.post("/dental-lab/work-types", body));
export const updateWorkType = async (id: string, body: Partial<DentalWorkType>): Promise<DentalWorkType> => unwrapEnvelope<DentalWorkType>(await apiClient.put(`/dental-lab/work-types/${id}`, body));
export const deleteWorkType = async (id: string): Promise<void> => { await apiClient.delete(`/dental-lab/work-types/${id}`); };
export const fetchWorkTypeStages = async (workTypeId: string): Promise<WorkTypeStageTemplateItem[]> =>
  unwrapEnvelope<WorkTypeStageTemplateItem[]>(await apiClient.get(`/dental-lab/work-types/${workTypeId}/stages`));
export const saveWorkTypeStages = async (workTypeId: string, stages: WorkTypeStageTemplateItem[]): Promise<WorkTypeStageTemplateItem[]> =>
  unwrapEnvelope<WorkTypeStageTemplateItem[]>(await apiClient.put(`/dental-lab/work-types/${workTypeId}/stages`, { stages }));

export const fetchTechnicians = async (): Promise<{ items: DentalTechnician[]; wageDefaults?: { defaultPerStage?: number } }> =>
  unwrapEnvelope<{ items: DentalTechnician[]; wageDefaults?: { defaultPerStage?: number } }>(await apiClient.get("/dental-lab/technicians"));
export const createTechnician = async (body: Partial<DentalTechnician> & { email?: string; password?: string }): Promise<DentalTechnician> => unwrapEnvelope<DentalTechnician>(await apiClient.post("/dental-lab/technicians", body));
export const updateTechnician = async (id: string, body: Partial<DentalTechnician> & { email?: string; password?: string }): Promise<DentalTechnician> => unwrapEnvelope<DentalTechnician>(await apiClient.put(`/dental-lab/technicians/${id}`, body));
export const deleteTechnician = async (id: string): Promise<void> => { await apiClient.delete(`/dental-lab/technicians/${id}`); };

export const fetchTechnicianPayouts = async (technicianId: string, params?: { type?: string; from?: string; to?: string }): Promise<{
  technician: DentalTechnician;
  payouts: DentalTechnicianPayout[];
  summary: TechnicianPayoutSummary;
}> => {
  const res = await apiClient.get(`/dental-lab/technicians/${technicianId}/payouts`, { params });
  return unwrapEnvelope(res);
};

export const createTechnicianPayout = async (technicianId: string, body: {
  amount: number;
  type?: TechnicianPayoutType;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
}): Promise<DentalTechnicianPayout> => {
  const res = await apiClient.post(`/dental-lab/technicians/${technicianId}/payouts`, body);
  return unwrapEnvelope<DentalTechnicianPayout>(res);
};

export const deleteTechnicianPayout = async (payoutId: string): Promise<void> => {
  await apiClient.delete(`/dental-lab/technicians/payouts/${payoutId}`);
};

export const fetchCases = async (params?: {
  status?: string;
  doctorId?: string;
  search?: string;
  trash?: boolean;
  isDeleted?: boolean;
  overdueOnly?: boolean;
  workTypeId?: string;
  priority?: string;
  paymentStatus?: string;
  technicianId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  receivedDateFrom?: string;
  receivedDateTo?: string;
  date?: string;
  dateFilterField?: "receivedDate" | "dueDate";
  page?: number;
  limit?: number;
}): Promise<CasesListResult> => {
  const res = await apiClient.get("/dental-lab/cases", { params });
  const body = asRecord(res.data) ?? {};
  let data: DentalLabCase[] = [];
  let total = 0;
  let trashCount = 0;
  const rawData = body["data"];
  if (Array.isArray(rawData)) {
    data = rawData as DentalLabCase[];
    total = Number(body["total"] ?? data.length) || data.length;
    trashCount = Number(body["trashCount"] ?? 0) || 0;
  } else {
    const inner = asRecord(rawData);
    if (inner && Array.isArray(inner["data"])) {
      data = inner["data"] as DentalLabCase[];
      total = Number(inner["total"] ?? body["total"] ?? data.length) || data.length;
      trashCount = Number(inner["trashCount"] ?? body["trashCount"] ?? 0) || 0;
    } else if (inner && Array.isArray(inner["items"])) {
      data = inner["items"] as DentalLabCase[];
      total = Number(inner["total"] ?? body["total"] ?? data.length) || data.length;
      trashCount = Number(inner["trashCount"] ?? body["trashCount"] ?? 0) || 0;
    }
  }
  return { data, total, trashCount };
};

export const fetchCaseDetail = async (id: string): Promise<DentalLabCaseDetail> => {
  const detail = await unwrapEnvelope<DentalLabCase>(await apiClient.get(`/dental-lab/cases/${id}`));
  return {
    ...detail,
    stages: detail.stages ?? [],
    assignments: detail.assignments ?? [],
    attachments: detail.attachments ?? [],
    invoices: detail.invoices ?? [],
    customValues: detail.customValues ?? [],
    history: detail.history ?? [],
    qualityChecks: detail.qualityChecks ?? [],
    refabrications: detail.refabrications ?? [],
  } as DentalLabCaseDetail;
};

export const createCase = async (body: Partial<DentalLabCase>): Promise<DentalLabCase> => unwrapEnvelope<DentalLabCase>(await apiClient.post("/dental-lab/cases", body));
export const updateCase = async (id: string, body: Partial<DentalLabCase>): Promise<DentalLabCase> => unwrapEnvelope<DentalLabCase>(await apiClient.put(`/dental-lab/cases/${id}`, body));
export const trashCase = async (id: string, reason?: string): Promise<DentalLabCase> =>
  unwrapEnvelope<DentalLabCase>(await apiClient.delete(`/dental-lab/cases/${id}`, { data: { reason } }));
export const restoreCase = async (id: string): Promise<DentalLabCase> =>
  unwrapEnvelope<DentalLabCase>(await apiClient.post(`/dental-lab/cases/${id}/restore`));
export const permanentDeleteCase = async (id: string): Promise<{ success: boolean; message?: string }> =>
  unwrapEnvelope<{ success: boolean; message?: string }>(await apiClient.delete(`/dental-lab/cases/${id}/permanent`));

export const advanceCase = async (id: string, body: { to?: string; status?: string; reason?: string; assigneeId?: string; notes?: string; dueDate?: string }): Promise<DentalLabCase> =>
  unwrapEnvelope<DentalLabCase>(await apiClient.post(`/dental-lab/cases/${id}/advance`, body));

export const assignCase = async (id: string, body: { technicianId: string; role: DentalTechnicianRole }): Promise<DentalLabCase> =>
  unwrapEnvelope<DentalLabCase>(await apiClient.post(`/dental-lab/cases/${id}/assign`, body));

export const removeCaseAssignment = async (caseId: string, assignmentId: string): Promise<DentalLabCase> =>
  unwrapEnvelope<DentalLabCase>(await apiClient.delete(`/dental-lab/cases/${caseId}/assignments/${assignmentId}`));

export const addStageAssignee = async (
  caseId: string,
  stageId: string,
  body: { technicianId: string; role?: string; sharePercent?: number; notes?: string }
): Promise<DentalLabCaseDetail> =>
  unwrapEnvelope<DentalLabCaseDetail>(await apiClient.post(`/dental-lab/cases/${caseId}/stages/${stageId}/assignees`, body));

export const removeStageAssignee = async (
  caseId: string,
  stageId: string,
  technicianId: string
): Promise<DentalLabCaseDetail> =>
  unwrapEnvelope<DentalLabCaseDetail>(await apiClient.delete(`/dental-lab/cases/${caseId}/stages/${stageId}/assignees/${technicianId}`));

export const bulkAdvanceCases = async (caseIds: string[], to: string, reason?: string): Promise<{ count: number; message: string }> =>
  unwrapEnvelope<{ count: number; message: string }>(await apiClient.post("/dental-lab/cases/bulk/advance", { caseIds, to, reason }));

export const bulkAssignTechnician = async (caseIds: string[], technicianId: string, role?: string): Promise<{ count: number; message: string }> =>
  unwrapEnvelope<{ count: number; message: string }>(await apiClient.post("/dental-lab/cases/bulk/assign", { caseIds, technicianId, role }));

export const bulkUpdatePriority = async (caseIds: string[], priority: DentalCasePriority): Promise<{ count: number; message: string }> =>
  unwrapEnvelope<{ count: number; message: string }>(await apiClient.post("/dental-lab/cases/bulk/priority", { caseIds, priority }));

export const bulkTrashCases = async (caseIds: string[], reason?: string): Promise<{ count: number; message: string }> =>
  unwrapEnvelope<{ count: number; message: string }>(await apiClient.post("/dental-lab/cases/bulk/trash", { caseIds, reason }));

export const bulkRestoreCases = async (caseIds: string[]): Promise<{ count: number; message: string }> =>
  unwrapEnvelope<{ count: number; message: string }>(await apiClient.post("/dental-lab/cases/bulk/restore", { caseIds }));

export const bulkTransferCasesDoctor = async (
  caseIds: string[],
  targetDoctorId: string,
  targetDoctorName?: string,
  syncInvoices: boolean = true
): Promise<{ count: number; invoicesUpdated: number; message: string }> =>
  unwrapEnvelope<{ count: number; invoicesUpdated: number; message: string }>(
    await apiClient.post("/dental-lab/cases/bulk/transfer-doctor", {
      caseIds,
      targetDoctorId,
      targetDoctorName,
      syncInvoices,
    })
  );


// Infer attachment kind from filename. Used as default when the user
// doesn't pick one explicitly. Matches the ATTACHMENT_KINDS enum in the
// backend (apps/backend/controller/dentalLabController.js).
export const inferAttachmentKind = (filename: string): "SCAN" | "PHOTO" | "XRAY" | "PRESCRIPTION" | "WORK_ORDER" | "DESIGN_REVIEW" | "OTHER" => {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  if (["stl", "ply", "obj", "dcm"].includes(ext)) return "SCAN";
  if (["jpg", "jpeg", "png", "webp", "bmp", "tiff", "heic"].includes(ext)) return "PHOTO";
  if (ext === "pdf") return "PRESCRIPTION";
  if (["html", "htm"].includes(ext)) return "DESIGN_REVIEW";
  return "OTHER";
};

// Build a per-file kind array. If `kinds` is shorter than files, the
// last value is reused. If `defaultKind` is given, missing entries use it.
const buildKindsArray = (files: File[], kinds: (string | undefined)[], defaultKind?: string): string[] => {
  const result: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const k = kinds[i] || defaultKind || (file ? inferAttachmentKind(file.name) : "OTHER");
    result.push(k.toUpperCase());
  }
  return result;
};

// Single file upload (backward compatible signature).
// IMPORTANT: do NOT set Content-Type manually — the browser adds the
// multipart boundary itself and a manual header breaks parsing on the
// server side.
export const uploadCaseAttachment = async (caseId: string, file: File, kind?: string): Promise<DentalCaseAttachment> => {
  const formData = new FormData();
  formData.append("files", file);
  if (kind) formData.append("kinds", kind);
  return unwrapEnvelope<DentalCaseAttachment>(await apiClient.post(`/dental-lab/cases/${caseId}/attachments`, formData, {
    timeout: 300000, // 5 min — STL/PLY can be 15MB+ on slow networks
  }));
};

// Multi-file upload with per-file kinds. Sends `kinds` (one entry per
// file) so the backend can record each attachment with the right kind
// instead of silently coercing all of them to SCAN.
export const uploadCaseAttachments = async (
  caseId: string,
  files: File[],
  kindOrKinds?: string | string[]
): Promise<DentalCaseAttachment[]> => {
  if (!files || files.length === 0) throw new Error("مفيش ملفات للرفع");
  const formData = new FormData();
  for (const f of files) formData.append("files", f);

  let kindsArr: string[];
  if (Array.isArray(kindOrKinds)) {
    kindsArr = buildKindsArray(files, kindOrKinds);
  } else {
    // single string or undefined → infer per-file from extension
    kindsArr = buildKindsArray(files, [], kindOrKinds);
  }
  for (const k of kindsArr) formData.append("kinds", k);

  const res = await apiClient.post(`/dental-lab/cases/${caseId}/attachments`, formData, {
    timeout: 600000, // 10 min for big batches
  });
  const data = unwrapEnvelope<DentalCaseAttachment | DentalCaseAttachment[]>(res);
  return Array.isArray(data) ? data : [data];
};

export const deleteCaseAttachment = async (caseId: string, attachmentId: string): Promise<void> => {
  await apiClient.delete(`/dental-lab/cases/${caseId}/attachments/${attachmentId}`);
};

export interface ScanParseResult {
  patientName?: string | null;
  teeth?: string | null;
  shade?: string | null;
  material?: string | null;
  workTypeHint?: string | null;
  notes?: string | null;
  dueDate?: string | null;
}

export const parseScan = async (file: File): Promise<ScanParseResult> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post("/dental-lab/scan-parse", formData, {
    timeout: 120000,
  });
  const body = asRecord(res.data) ?? {};
  if (body["success"] === false) {
    const err = body["error"];
    const msg = typeof err === "string" ? err : (err && typeof err === "object" ? (err as { message?: string }).message : undefined) || (body["message"] as string) || "فشل تحليل الصورة";
    if (msg === "AI_NOT_CONFIGURED") {
      throw new Error("مفتاح الذكاء الاصطناعي مش مضبوط في قاعدة البيانات");
    }
    if (msg === "AI_QUOTA_EXCEEDED" || msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("تم استنفاد حصة استخدام مفتاح الذكاء الاصطناعي (Gemini Quota Exceeded - 429). يرجى إضافة مفتاح جديد أو تفعيل الفوترة في Google AI Studio.");
    }
    throw new Error(msg);
  }
  return (body["data"] ?? {}) as ScanParseResult;
};

export const fetchInvoices = async (params?: {
  doctorId?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<DentalInvoice[]> => unwrapListEnvelope<DentalInvoice>(await apiClient.get("/dental-lab/invoices", { params }));
export const createInvoice = async (body: Partial<DentalInvoice>): Promise<DentalInvoice> => unwrapEnvelope<DentalInvoice>(await apiClient.post("/dental-lab/invoices", body));
export const addInvoicePayment = async (invoiceId: string, body: { amount: number; method?: string; note?: string }): Promise<DentalPayment> =>
  unwrapEnvelope<DentalPayment>(await apiClient.post(`/dental-lab/invoices/${invoiceId}/payments`, body));

export const voidInvoice = async (invoiceId: string, reason?: string): Promise<DentalInvoice> =>
  unwrapEnvelope<DentalInvoice>(await apiClient.post(`/dental-lab/invoices/${invoiceId}/void`, { reason }));


export const fetchDashboard = async (): Promise<DashboardData> => unwrapEnvelope<DashboardData>(await apiClient.get("/dental-lab/dashboard"));

export const fetchMyInfo = async (): Promise<MyInfo> => unwrapEnvelope<MyInfo>(await apiClient.get("/dental-lab/me"));
export const fetchMyCases = async (): Promise<{ items: MyCase[]; technician?: { id: string; name: string } | null }> =>
  unwrapEnvelope<{ items: MyCase[]; technician?: { id: string; name: string } | null }>(await apiClient.get("/dental-lab/my-cases"));
export const fetchMyWage = async (): Promise<MyWage> => unwrapEnvelope<MyWage>(await apiClient.get("/dental-lab/my-wage"));
export const requestAdvance = async (body: { amount: number; notes?: string }): Promise<DentalTechnicianPayout> =>
  unwrapEnvelope<DentalTechnicianPayout>(await apiClient.post("/dental-lab/my-wage/advance-request", body));
export const scanKioskBarcode = async (body: { barcode: string; technicianId?: string }): Promise<{ case: DentalLabCase; nextStatus?: string; advancedStage?: unknown }> =>
  unwrapEnvelope<{ case: DentalLabCase; nextStatus?: string; advancedStage?: unknown }>(await apiClient.post("/dental-lab/cases/kiosk-scan", body));
export const uploadTechAttachment = async (caseId: string, formData: FormData): Promise<{ attachments: unknown[] }> => {
  const res = await apiClient.post(`/dental-lab/cases/${caseId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrapEnvelope<{ attachments: unknown[] }>(res);
};

export const fetchAgingReport = async (): Promise<{ buckets: AgingBucket[]; totalOutstanding?: number }> =>
  unwrapEnvelope<{ buckets: AgingBucket[]; totalOutstanding?: number }>(await apiClient.get("/dental-lab/reports/aging"));

export const fetchCreditNotes = async (): Promise<CreditNote[]> =>
  unwrapListEnvelope<CreditNote>(await apiClient.get("/dental-lab/credit-notes"));

export const fetchInvoicePdf = async (id: string): Promise<Blob> => {
  const res = await apiClient.get(`/dental-lab/invoices/${id}/pdf`, { responseType: "blob", timeout: 300000 });
  return res.data as Blob;
};

export const fetchInvoicePaymentLink = async (id: string): Promise<{ configured: boolean; message?: string; checkoutUrl?: string | null }> =>
  unwrapEnvelope<{ configured: boolean; message?: string; checkoutUrl?: string | null }>(await apiClient.get(`/dental-lab/invoices/${id}/payment-link`));
export const getInvoicePaymentLink = fetchInvoicePaymentLink;

export const fetchDoctorPricing = async (doctorId: string): Promise<Record<string, number>> =>
  unwrapEnvelope<Record<string, number>>(await apiClient.get(`/dental-lab/doctors/${doctorId}/pricing`));

export const saveDoctorPricing = async (doctorId: string, prices: Record<string, number>): Promise<Record<string, number>> =>
  unwrapEnvelope<Record<string, number>>(await apiClient.put(`/dental-lab/doctors/${doctorId}/pricing`, { prices }));

export const recordDoctorBulkPayment = async (
  doctorId: string,
  body: { amount: number; method?: string; note?: string }
): Promise<{ doctorId: string; totalPaid: number; allocations: { invoiceId: string; invoiceNumber: string; amount: number }[] }> =>
  unwrapEnvelope<{ doctorId: string; totalPaid: number; allocations: { invoiceId: string; invoiceNumber: string; amount: number }[] }>(
    await apiClient.post(`/dental-lab/doctors/${doctorId}/bulk-payment`, body)
  );

export const fetchWorkOrderPdf = async (id: string): Promise<Blob> => {
  const res = await apiClient.get(`/dental-lab/cases/${id}/work-order`, { responseType: "blob", timeout: 300000 });
  return res.data as Blob;
};

export const fetchPanLabelPdf = async (id: string): Promise<Blob> => {
  const res = await apiClient.get(`/dental-lab/cases/${id}/pan-label`, { responseType: "blob", timeout: 300000 });
  return res.data as Blob;
};

export const downloadAllFiles = async (id: string, fileName: string): Promise<void> => {
  const res = await apiClient.get(`/dental-lab/cases/${id}/download-all`, { responseType: "blob", timeout: 300000 });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const recordQualityCheck = async (id: string, body: { passed: boolean; notes?: string }): Promise<DentalQualityCheck> =>
  unwrapEnvelope<DentalQualityCheck>(await apiClient.post(`/dental-lab/cases/${id}/quality-check`, body));

export const listQualityChecks = async (id: string): Promise<DentalQualityCheck[]> =>
  unwrapListEnvelope<DentalQualityCheck>(await apiClient.get(`/dental-lab/cases/${id}/quality-checks`));

export const flagRefabrication = async (id: string, body: { reason: string; stageFrom?: RefabricationStage; rootCauseCategory?: string; isBillable?: boolean }): Promise<DentalRefabrication> =>
  unwrapEnvelope<DentalRefabrication>(await apiClient.post(`/dental-lab/cases/${id}/refabrication`, body));

export const resolveRefabrication = async (id: string, refabId: string, body: { note?: string }): Promise<DentalRefabrication> =>
  unwrapEnvelope<DentalRefabrication>(await apiClient.post(`/dental-lab/cases/${id}/refabrications/${refabId}/resolve`, body));

export const fetchTeam = async (): Promise<TeamMember[]> => unwrapListEnvelope<TeamMember>(await apiClient.get("/dental-lab/team"));

export const setTeamRole = async (userId: string, role: DentalTeamRole): Promise<TeamMember[]> =>
  unwrapListEnvelope<TeamMember>(await apiClient.put(`/dental-lab/team/${userId}/role`, { role }));

export const fetchDoctorStatement = async (params?: { doctorId?: string; from?: string; to?: string }): Promise<DoctorStatement> =>
  unwrapEnvelope<DoctorStatement>(await apiClient.get("/dental-lab/reports/doctor-statement", { params }));

export const fetchDoctorStatementPdf = async (params?: { doctorId?: string; from?: string; to?: string }): Promise<Blob> => {
  const res = await apiClient.get("/dental-lab/reports/doctor-statement/pdf", {
    params,
    responseType: "blob",
    timeout: 300000,
  });
  return res.data as Blob;
};


export const fetchTechnicianProductivity = async (params?: { from?: string; to?: string }): Promise<TechnicianProductivity[]> =>
  unwrapEnvelope<TechnicianProductivity[]>(await apiClient.get("/dental-lab/reports/technician-productivity", { params }));

export const fetchWorkTypeRevenue = async (params?: { from?: string; to?: string }): Promise<WorkTypeRevenue[]> =>
  unwrapEnvelope<WorkTypeRevenue[]>(await apiClient.get("/dental-lab/reports/work-type-revenue", { params }));

export const fetchOverdueReport = async (): Promise<OverdueReportRow[]> =>
  unwrapEnvelope<OverdueReportRow[]>(await apiClient.get("/dental-lab/reports/overdue"));

export const fetchRemakesAnalysis = async (params?: { from?: string; to?: string }): Promise<RemakesAnalysisReport> =>
  unwrapEnvelope<RemakesAnalysisReport>(await apiClient.get("/dental-lab/reports/remakes-analysis", { params }));

export const fetchWarrantyCertificatePdf = async (id: string): Promise<Blob> => {
  const res = await apiClient.get(`/dental-lab/cases/${id}/warranty-certificate`, { responseType: "blob" });
  return res.data as Blob;
};

export const sendCaseToTryIn = async (id: string, body: { tryInStage?: string; note?: string }): Promise<DentalLabCaseDetail> =>
  unwrapEnvelope<DentalLabCaseDetail>(await apiClient.post(`/dental-lab/cases/${id}/send-tryin`, body));

export const returnCaseFromTryIn = async (id: string, body: { targetStage?: string; feedbackNotes?: string }): Promise<DentalLabCaseDetail> =>
  unwrapEnvelope<DentalLabCaseDetail>(await apiClient.post(`/dental-lab/cases/${id}/return-tryin`, body));

export const kioskScanCase = async (body: { barcode: string; technicianId?: string }): Promise<{ case: DentalLabCase; scannedCode: string; completedStage?: string; newStatus: string; technicianName?: string }> =>
  unwrapEnvelope<{ case: DentalLabCase; scannedCode: string; completedStage?: string; newStatus: string; technicianName?: string }>(await apiClient.post("/dental-lab/cases/kiosk-scan", body));

export const fetchSettings = async (): Promise<DentalLabSettings> => {
  try {
    return await unwrapEnvelope<DentalLabSettings>(await apiClient.get("/dental-lab/settings"));
  } catch {
    return { workOrderHeader: {}, stageTemplates: {}, whatsappTemplates: {}, customFields: [] };
  }
};
export const saveSettings = async (body: DentalLabSettings): Promise<DentalLabSettings> => unwrapEnvelope<DentalLabSettings>(await apiClient.put("/dental-lab/settings", body));

export const fetchCustomFields = async (): Promise<DentalCustomFieldDef[]> => unwrapListEnvelope<DentalCustomFieldDef>(await apiClient.get("/dental-lab/custom-fields"));
export const createCustomField = async (body: Partial<DentalCustomFieldDef>): Promise<DentalCustomFieldDef> => unwrapEnvelope<DentalCustomFieldDef>(await apiClient.post("/dental-lab/custom-fields", body));
export const updateCustomField = async (id: string, body: Partial<DentalCustomFieldDef>): Promise<DentalCustomFieldDef> => unwrapEnvelope<DentalCustomFieldDef>(await apiClient.put(`/dental-lab/custom-fields/${id}`, body));
export const deleteCustomField = async (id: string): Promise<void> => { await apiClient.delete(`/dental-lab/custom-fields/${id}`); };

export const caseFileUrl = (storedName?: string): string => {
  if (!storedName) return "";
  const base = config.apiUrl.replace(/\/$/, "");
  return `${base}/dental-lab/files/${encodeURIComponent(storedName)}`;
};

export const fetchCaseFileBlob = async (storedName?: string): Promise<Blob> => {
  if (!storedName) throw new Error("مفيش ملف");
  // STL/PLY are 15MB+ and can exceed the 30s default on slow networks — use a 5 min timeout
  const res = await apiClient.get(`/dental-lab/files/${encodeURIComponent(storedName)}`, { responseType: "blob", timeout: 300000 });
  return res.data as Blob;
};

export const fmtMoney = (n?: number): string => (typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("ar-EG", { maximumFractionDigits: 2 }).replace(/[\u061C\u200E\u200F]/g, "") : "0");

export const fmtDate = (iso?: string): string => (iso ? new Date(iso).toLocaleDateString("ar-EG") : "—");

export const fmtDateTime = (iso?: string): string => (iso ? new Date(iso).toLocaleString("ar-EG") : "—");

/** i18next strict typing only accepts literal keys; this helper allows dynamic keys (e.g. from TABS arrays). */
export const tKey = (t: (key: never) => unknown, key: string): string => String(t(key as never));

export const MODAL_CONTENT_CLS = "bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4";
export const MODAL_INPUT_CLS = "w-full border rounded-lg px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";

// ==================== Dental Materials & Suppliers API ====================

export type DentalMaterialCategory = "MILLING_DISC" | "MILLING_BLOCK" | "IMPLANT_PART" | "CONSUMABLE" | "TOOL_BUR";

export interface DentalMaterialStock {
  id: string;
  materialId: string;
  lotNumber: string;
  shade?: string | null;
  thicknessMm?: number | null;
  diameterMm?: number | null;
  initialUnits: number;
  remainingUnits: number;
  unitCost: number;
  totalCost: number;
  supplierId?: string | null;
  supplierName?: string | null;
  purchaseDate?: string;
  expiryDate?: string | null;
  isDepleted: boolean;
  notes?: string | null;
}

export interface DentalMaterial {
  id: string;
  name: string;
  category: DentalMaterialCategory;
  brand?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  defaultShade?: string | null;
  unitName: string;
  standardCapacity: number;
  costPerItem: number;
  costPerUnit: number;
  minStockAlert: number;
  isActive: boolean;
  notes?: string | null;
  stocks?: DentalMaterialStock[];
  totalAvailableUnits?: number;
  activeLotsCount?: number;
  isLowStock?: boolean;
}

export interface DentalCaseMaterialUsage {
  id: string;
  caseId: string;
  materialId: string;
  stockId?: string | null;
  lotNumber?: string | null;
  materialName: string;
  unitsUsed: number;
  costRecorded: number;
  notes?: string | null;
  recordedBy?: string | null;
  recordedByName?: string | null;
  recordedAt: string;
  stock?: DentalMaterialStock | null;
  material?: DentalMaterial | null;
}

export interface DentalSupplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  mobile?: string | null;
  city?: string | null;
  currentBalance?: number;
}

export interface DentalMaterialsSummary {
  totalMaterials: number;
  totalActiveStocks: number;
  totalStockUnits: number;
  lowStockCount: number;
  recentUsages: DentalCaseMaterialUsage[];
}

export const fetchDentalMaterials = async (category?: string, includeInactive?: boolean): Promise<DentalMaterial[]> => {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (includeInactive) params.includeInactive = "true";
  return unwrapListEnvelope<DentalMaterial>(await apiClient.get("/dental-lab/materials", { params }));
};

export const createDentalMaterial = async (body: Partial<DentalMaterial>): Promise<DentalMaterial> =>
  unwrapEnvelope<DentalMaterial>(await apiClient.post("/dental-lab/materials", body));

export const updateDentalMaterial = async (id: string, body: Partial<DentalMaterial>): Promise<DentalMaterial> =>
  unwrapEnvelope<DentalMaterial>(await apiClient.put(`/dental-lab/materials/${id}`, body));

export const deleteDentalMaterial = async (id: string): Promise<void> => {
  await apiClient.delete(`/dental-lab/materials/${id}`);
};

export const recordDentalMaterialStockIn = async (body: {
  materialId: string;
  lotNumber: string;
  shade?: string;
  thicknessMm?: number;
  diameterMm?: number;
  initialUnits?: number;
  unitCost?: number;
  totalCost?: number;
  supplierId?: string;
  supplierName?: string;
  purchaseDate?: string;
  expiryDate?: string;
  notes?: string;
}): Promise<DentalMaterialStock> =>
  unwrapEnvelope<DentalMaterialStock>(await apiClient.post("/dental-lab/materials/stock-in", body));

export const consumeDentalCaseMaterial = async (
  caseId: string,
  body: {
    materialId: string;
    stockId?: string;
    lotNumber?: string;
    unitsUsed?: number;
    notes?: string;
  },
): Promise<DentalCaseMaterialUsage> =>
  unwrapEnvelope<DentalCaseMaterialUsage>(await apiClient.post(`/dental-lab/cases/${caseId}/materials/consume`, body));

export const deleteDentalCaseMaterialUsage = async (caseId: string, usageId: string): Promise<void> => {
  await apiClient.delete(`/dental-lab/cases/${caseId}/materials/${usageId}`);
};

export const fetchDentalSuppliers = async (): Promise<DentalSupplier[]> =>
  unwrapListEnvelope<DentalSupplier>(await apiClient.get("/dental-lab/materials/suppliers"));

export const createDentalSupplier = async (data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  mobile?: string;
  city?: string;
  address?: string;
  notes?: string;
  paymentTerms?: string;
}): Promise<DentalSupplier> =>
  unwrapEnvelope<DentalSupplier>(await apiClient.post("/dental-lab/materials/suppliers", data));

export const fetchDentalMaterialsSummary = async (): Promise<DentalMaterialsSummary> =>
  unwrapEnvelope<DentalMaterialsSummary>(await apiClient.get("/dental-lab/materials/summary"));