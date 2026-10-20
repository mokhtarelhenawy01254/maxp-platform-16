import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Columns3,
  FileSpreadsheet,
  List,
  PackageCheck,
  RefreshCw,
  ScanLine,
  Search,
  Stethoscope,
  Trash2,
  X as XMarkIcon,
} from "lucide-react";
import type { DentalLabDoctor, DentalTechnician, DentalWorkType } from "../../shared";
import { DentalCasesQuickPills } from "./DentalCasesQuickPills";
import { DentalCasesDropdowns } from "./DentalCasesDropdowns";

export interface DentalCasesFilterBarProps {
  total: number;
  trashCount: number;
  viewMode: "ACTIVE" | "OVERDUE" | "TRASH";
  onViewModeChange: (mode: "ACTIVE" | "OVERDUE" | "TRASH") => void;
  layoutMode: "TABLE" | "KANBAN";
  onLayoutModeChange: (mode: "TABLE" | "KANBAN") => void;
  searchInput: string;
  onSearchInputChange: (val: string) => void;
  onClearSearch: () => void;
  status: string;
  doctorId: string;
  workTypeId: string;
  priority: string;
  paymentStatus: string;
  technicianId: string;
  dateRangePreset: string;
  agendaDate: string;
  agendaField: "receivedDate" | "dueDate";
  activeFiltersCount: number;
  doctors: DentalLabDoctor[];
  workTypes: DentalWorkType[];
  technicians: DentalTechnician[];
  applyFilter: (key: string, value: string, resetOthers?: boolean) => void;
  clearAllFilters: () => void;
  onRefresh: () => void;
  onExportExcel: () => void;
  onOpenKiosk: () => void;
  onOpenQuickOrder: () => void;
  setAgendaDate: (val: string) => void;
  setAgendaField: (field: "receivedDate" | "dueDate") => void;
  setDateRangePreset: (val: string) => void;
  setPriority: (val: string) => void;
  setStatus: (val: string) => void;
  setTechnicianId: (val: string) => void;
  setPage: (p: number | ((prev: number) => number)) => void;
}

export function DentalCasesFilterBar({
  total,
  trashCount,
  viewMode,
  onViewModeChange,
  layoutMode,
  onLayoutModeChange,
  searchInput,
  onSearchInputChange,
  onClearSearch,
  status,
  doctorId,
  workTypeId,
  priority,
  paymentStatus,
  technicianId,
  dateRangePreset,
  agendaDate,
  agendaField,
  activeFiltersCount,
  doctors,
  workTypes,
  technicians,
  applyFilter,
  clearAllFilters,
  onRefresh,
  onExportExcel,
  onOpenKiosk,
  onOpenQuickOrder,
  setAgendaDate,
  setAgendaField,
  setDateRangePreset,
  setPriority,
  setStatus,
  setTechnicianId,
  setPage,
}: DentalCasesFilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800/90 border border-slate-200 dark:border-gray-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2.5">
      {/* Top Header Row: Title, Segmented Tabs, Search & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>حالات معمل الأسنان</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-300">
                {total}
              </span>
            </h2>
          </div>

          {/* Segmented Mode Selector: Active / Overdue / Trash */}
          <div className="flex items-center bg-slate-100 dark:bg-gray-700/60 p-0.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                onViewModeChange("ACTIVE");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === "ACTIVE"
                  ? "bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              النشطة
            </button>
            <button
              type="button"
              onClick={() => {
                onViewModeChange("OVERDUE");
                setPage(1);
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                viewMode === "OVERDUE"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>المتأخرة</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onViewModeChange("TRASH");
                setPage(1);
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                viewMode === "TRASH"
                  ? "bg-slate-700 dark:bg-slate-600 text-white shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              <Trash2 className="w-3 h-3" />
              <span>سلة المهملات</span>
              {trashCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-mono">
                  {trashCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
          <input
            className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl pr-8 pl-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="بحث سريع (رقم الحالة، المريض، الطبيب)..."
            value={searchInput}
            onChange={(e) => {
              onSearchInputChange(e.target.value);
              setPage(1);
            }}
          />
          {searchInput && (
            <button
              onClick={onClearSearch}
              className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600"
              title="مسح البحث"
              aria-label="مسح البحث"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Controls & Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Table / Kanban Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-gray-700/60 p-0.5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => onLayoutModeChange("TABLE")}
              className={`p-1.5 rounded-lg transition-all ${
                layoutMode === "TABLE"
                  ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
              title="عرض جدول الحالات"
              aria-label="عرض جدول الحالات"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onLayoutModeChange("KANBAN")}
              className={`p-1.5 rounded-lg transition-all ${
                layoutMode === "KANBAN"
                  ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
              title="عرض لوحة مراحل التشغيل (كانبان)"
              aria-label="عرض لوحة مراحل التشغيل"
            >
              <Columns3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Kiosk Button */}
          <button
            type="button"
            onClick={onOpenKiosk}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            title="فتح محطة المسح السريع بالباركود"
          >
            <ScanLine className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden md:inline">الكشك</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
            title={String(t("dentalLab.common.refresh"))}
            aria-label="تحديث"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={onExportExcel}
            className="p-1.5 border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-emerald-600 rounded-xl transition-colors"
            title="تصدير الحالات المعروضة إلى Excel"
            aria-label="تصدير Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </button>

          {/* New Quick Order Primary CTA */}
          <button
            type="button"
            onClick={onOpenQuickOrder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>طلب سريع</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Pills Row */}
      <DentalCasesQuickPills
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        priority={priority}
        setPriority={setPriority}
        dateRangePreset={dateRangePreset}
        setDateRangePreset={setDateRangePreset}
        technicianId={technicianId}
        setTechnicianId={setTechnicianId}
        status={status}
        setStatus={setStatus}
        agendaDate={agendaDate}
        setAgendaDate={setAgendaDate}
        doctorId={doctorId}
        workTypeId={workTypeId}
        paymentStatus={paymentStatus}
        applyFilter={applyFilter}
        setPage={setPage}
      />

      {/* All Direct Dropdown Filters & Agenda */}
      <DentalCasesDropdowns
        viewMode={viewMode}
        status={status}
        doctorId={doctorId}
        workTypeId={workTypeId}
        priority={priority}
        paymentStatus={paymentStatus}
        technicianId={technicianId}
        dateRangePreset={dateRangePreset}
        agendaDate={agendaDate}
        agendaField={agendaField}
        activeFiltersCount={activeFiltersCount}
        doctors={doctors}
        workTypes={workTypes}
        technicians={technicians}
        applyFilter={applyFilter}
        clearAllFilters={clearAllFilters}
        setAgendaDate={setAgendaDate}
        setAgendaField={setAgendaField}
        setDateRangePreset={setDateRangePreset}
        setPage={setPage}
      />
    </div>
  );
}

export default DentalCasesFilterBar;
