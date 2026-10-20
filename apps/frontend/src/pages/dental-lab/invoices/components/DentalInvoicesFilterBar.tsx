import { useTranslation } from "react-i18next";
import {
  Banknote,
  CalendarClock,
  CreditCard,
  Download,
  FileSpreadsheet,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  User,
  X as XMarkIcon,
} from "lucide-react";
import type { DentalLabDoctor, UninvoicedSummaryResult } from "../../shared";
import { fmtMoney } from "../../shared";
import { shareStatementWhatsApp } from "../types/dentalInvoicesTypes";

export interface ActiveDoctorStats {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  invoicesCount: number;
  uninvoicedCases: number;
  uninvoicedAmount: number;
  creditLimit: number;
  creditExceeded: boolean;
}

export interface DentalInvoicesFilterBarProps {
  selectedDoctorId: string;
  onSelectDoctorId: (id: string) => void;
  doctors: DentalLabDoctor[];
  activeDoctor: DentalLabDoctor | null;
  activeDoctorStats: ActiveDoctorStats | null;
  uninvoicedSummary: UninvoicedSummaryResult | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  datePreset: "ALL" | "THIS_MONTH" | "LAST_MONTH";
  onDatePresetChange: (p: "ALL" | "THIS_MONTH" | "LAST_MONTH") => void;
  fetchedCount: number | null;
  onCreateInvoice: () => void;
  onExportExcel: () => void;
  onBatchInvoice: () => void;
  onOpenSettlement: (doctorId?: string) => void;
  onRefresh: () => void;
  onOpenStatement: (doctor: DentalLabDoctor) => void;
  onBulkPayment: (doctor: DentalLabDoctor) => void;
}

export function DentalInvoicesFilterBar({
  selectedDoctorId,
  onSelectDoctorId,
  doctors,
  activeDoctor,
  activeDoctorStats,
  uninvoicedSummary,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  datePreset,
  onDatePresetChange,
  fetchedCount,
  onCreateInvoice,
  onExportExcel,
  onBatchInvoice,
  onOpenSettlement,
  onRefresh,
  onOpenStatement,
  onBulkPayment,
}: DentalInvoicesFilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <span>{t("dentalLab.invoices.title")}</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            إدارة ومتابعة فواتير الأطباء ودورات التحصيل والفوترة الشهرية
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onCreateInvoice}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t("dentalLab.invoices.newInvoice")}</span>
          </button>

          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-sm"
            title="تصدير الفواتير المعروضة إلى Excel"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>

          {uninvoicedSummary && uninvoicedSummary.totalCases > 0 && (
            <button
              onClick={onBatchInvoice}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:from-amber-600 hover:to-orange-600 shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>فوترة مجمعة ({uninvoicedSummary.totalCases} حالة)</span>
            </button>
          )}

          <button
            onClick={() => onOpenSettlement(selectedDoctorId || undefined)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all"
          >
            <CalendarClock className="w-4 h-4" />
            <span>تقفيل المستحقات الشهرية</span>
          </button>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            <span>{t("dentalLab.common.refresh")}</span>
          </button>
        </div>
      </div>

      {/* Uninvoiced Billing Banner */}
      {uninvoicedSummary && uninvoicedSummary.totalCases > 0 && !selectedDoctorId && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
              <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                  دورة الفوترة الشهرية وتصفية الحسابات
                </h4>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-mono">
                  {uninvoicedSummary.totalCases} حالة معلقة
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                يوجد {uninvoicedSummary.totalCases} حالة مكتملة/مسلمة لـ {uninvoicedSummary.totalDoctors} طبيب بإجمالي{" "}
                <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">
                  {fmtMoney(uninvoicedSummary.totalAmount)} {t("dentalLab.common.egp")}
                </span>{" "}
                جاهزة لإصدار فواتيرها بنقرة واحدة.
              </p>
            </div>
          </div>
          <button
            onClick={onBatchInvoice}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>إصدار الفواتير المجمعة الآن</span>
          </button>
        </div>
      )}

      {/* Doctor Selection Bar & Active Doctor Dashboard */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <User className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
              حساب الطبيب:
            </span>
            <select
              className="flex-1 border dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              value={selectedDoctorId}
              onChange={(e) => onSelectDoctorId(e.target.value)}
            >
              <option value="">-- جميع الأطباء (عرض شامل) --</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.clinicName ? `(${d.clinicName})` : ""}{" "}
                  {d.outstanding ? `— متبقي: ${fmtMoney(d.outstanding)} ج.م` : ""}
                </option>
              ))}
            </select>
          </div>

          {activeDoctor && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenStatement(activeDoctor)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>كشف حساب الطبيب</span>
              </button>
              <button
                onClick={() => onOpenSettlement(activeDoctor.id)}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-100"
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>تقفيل الشهر</span>
              </button>
              <button
                onClick={() => onBulkPayment(activeDoctor)}
                className="px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-green-100"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>تحصيل دفعة</span>
              </button>
              {activeDoctor.phone && (
                <button
                  onClick={() =>
                    shareStatementWhatsApp(activeDoctor.name, activeDoctor.phone, {
                      invoiced: activeDoctorStats?.totalBilled,
                      paid: activeDoctorStats?.totalPaid,
                      remaining: activeDoctorStats?.outstanding,
                      cases: activeDoctorStats?.invoicesCount,
                    })
                  }
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100"
                  title="مراسلة الطبيب عبر واتساب"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Selected Doctor Financial Strip */}
        {activeDoctor && activeDoctorStats && (
          <div className="pt-2 border-t dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
            <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
              <span className="text-gray-400 block text-[11px]">إجمالي الفواتير</span>
              <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5 font-mono">
                {fmtMoney(activeDoctorStats.totalBilled)} ج.م{" "}
                <span className="text-[10px] text-gray-400 font-normal">
                  ({activeDoctorStats.invoicesCount} فاتورة)
                </span>
              </p>
            </div>
            <div className="p-2.5 bg-green-50/60 dark:bg-green-900/20 rounded-lg">
              <span className="text-green-700 dark:text-green-400 block text-[11px]">إجمالي المسدد</span>
              <p className="text-sm sm:text-base font-bold text-green-700 dark:text-green-400 mt-0.5 font-mono">
                {fmtMoney(activeDoctorStats.totalPaid)} ج.م
              </p>
            </div>
            <div className="p-2.5 bg-red-50/60 dark:bg-red-900/20 rounded-lg">
              <span className="text-red-700 dark:text-red-400 block text-[11px]">المديونية الحالية المتبقية</span>
              <p className="text-sm sm:text-base font-bold text-red-600 mt-0.5 font-mono">
                {fmtMoney(activeDoctorStats.outstanding)} ج.م
              </p>
            </div>
            <div className="p-2.5 bg-amber-50/60 dark:bg-amber-900/20 rounded-lg">
              <span className="text-amber-700 dark:text-amber-400 block text-[11px]">حالات غير مفوترة</span>
              <p className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-300 mt-0.5 font-mono">
                {activeDoctorStats.uninvoicedCases} حالة ({fmtMoney(activeDoctorStats.uninvoicedAmount)} ج.م)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full pl-3 pr-9 py-1.5 border dark:border-gray-700 rounded-lg text-xs sm:text-sm dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
            placeholder="بحث برقم الفاتورة، اسم الدكتور، المريض..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          {fetchedCount !== null && (
            <span
              className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono"
              style={{ fontVariantNumeric: "tabular-nums" }}
              title="إجمالي الفواتير المطابقة للفلترة الحالية"
            >
              عدد الفواتير: {fetchedCount}
            </span>
          )}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 flex-1 min-w-0">
            {[
              { id: "ALL", label: "الكل" },
              { id: "OPEN", label: "غير مسددة" },
              { id: "PARTIAL", label: "مسددة جزئياً" },
              { id: "PAID", label: "مسددة" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => onStatusFilterChange(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === s.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date presets */}
        <div className="flex items-center gap-1 border-r dark:border-gray-800 pr-2">
          {[
            { id: "ALL", label: "كل الفترات" },
            { id: "THIS_MONTH", label: "هذا الشهر" },
            { id: "LAST_MONTH", label: "الشهر السابق" },
          ].map((dp) => (
            <button
              key={dp.id}
              onClick={() => onDatePresetChange(dp.id as "ALL" | "THIS_MONTH" | "LAST_MONTH")}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                datePreset === dp.id
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {dp.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DentalInvoicesFilterBar;
