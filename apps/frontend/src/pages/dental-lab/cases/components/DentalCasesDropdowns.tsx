import { FilterX, X as XMarkIcon } from "lucide-react";
import type { DentalLabDoctor, DentalTechnician, DentalWorkType } from "../../shared";
import { CASE_STATUSES } from "../../shared";

export interface DentalCasesDropdownsProps {
  viewMode: "ACTIVE" | "OVERDUE" | "TRASH";
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
  setAgendaDate: (val: string) => void;
  setAgendaField: (field: "receivedDate" | "dueDate") => void;
  setDateRangePreset: (val: string) => void;
  setPage: (p: number | ((prev: number) => number)) => void;
}

export function DentalCasesDropdowns({
  viewMode,
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
  setAgendaDate,
  setAgendaField,
  setDateRangePreset,
  setPage,
}: DentalCasesDropdownsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-gray-700/60 pt-2 text-xs">
      {viewMode !== "TRASH" && (
        <select
          className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white"
          value={status}
          onChange={(e) => applyFilter("status", e.target.value)}
          title="فلترة بحالة المرحلة"
        >
          <option value="">كل الحالات</option>
          {CASE_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      <select
        className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white max-w-[150px]"
        value={doctorId}
        onChange={(e) => applyFilter("doctorId", e.target.value)}
        title="فلترة بالطبيب أو العيادة"
      >
        <option value="">كل الدكاترة</option>
        {doctors
          .filter((d) => d.isActive)
          .map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} {d.clinicName ? `(${d.clinicName})` : ""}
            </option>
          ))}
      </select>

      <select
        className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white max-w-[140px]"
        value={workTypeId}
        onChange={(e) => applyFilter("workTypeId", e.target.value)}
        title="فلترة بنوع الشغل"
      >
        <option value="">كل أنواع الشغل</option>
        {workTypes.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>

      <select
        className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white"
        value={priority}
        onChange={(e) => applyFilter("priority", e.target.value)}
        title="فلترة بدرجة الأولوية"
      >
        <option value="">كل الأولويات</option>
        <option value="NORMAL">عادي</option>
        <option value="URGENT">مستعجل</option>
        <option value="STAT">طارئ فوري</option>
      </select>

      <select
        className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white max-w-[130px]"
        value={technicianId}
        onChange={(e) => applyFilter("technicianId", e.target.value)}
        title="فلترة بالفني المسند"
      >
        <option value="">كل الفنيين</option>
        {technicians
          .filter((t) => t.isActive)
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
      </select>

      <select
        className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white"
        value={paymentStatus}
        onChange={(e) => applyFilter("paymentStatus", e.target.value)}
        title="فلترة بحالة السداد"
      >
        <option value="">كل حالات السداد</option>
        <option value="UNPAID">غير مسدد</option>
        <option value="PARTIAL">مسدد جزئياً</option>
        <option value="PAID">مسدد بالكامل</option>
      </select>

      {/* Agenda Date Range & Shortcuts */}
      <div className="flex items-center gap-1 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-0.5 text-xs">
        <span className="text-slate-400 font-medium text-[11px]">الأجندة:</span>
        <select
          className="bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          value={agendaField}
          onChange={(e) => {
            setAgendaField(e.target.value as "receivedDate" | "dueDate");
            setPage(1);
          }}
        >
          <option value="receivedDate">تاريخ الدخول</option>
          <option value="dueDate">تاريخ التسليم</option>
        </select>
        <input
          type="date"
          className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none w-[110px] font-mono"
          value={agendaDate}
          onChange={(e) => {
            const val = e.target.value;
            setAgendaDate(val);
            setDateRangePreset(val ? "CUSTOM" : "ALL");
            setPage(1);
          }}
        />
        {agendaDate && (
          <button
            type="button"
            onClick={() => {
              setAgendaDate("");
              setDateRangePreset("ALL");
              setPage(1);
            }}
            className="text-slate-400 hover:text-slate-600"
            title="مسح التاريخ"
            aria-label="مسح التاريخ"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex items-center bg-slate-100 dark:bg-gray-800 p-0.5 rounded-lg text-[11px]">
        <button
          type="button"
          onClick={() => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().split("T")[0];
            setAgendaDate(yStr);
            setDateRangePreset("CUSTOM");
            setPage(1);
          }}
          className={`px-2 py-0.5 rounded transition-colors ${
            agendaDate === new Date(Date.now() - 86400000).toISOString().split("T")[0]
              ? "bg-white dark:bg-gray-700 font-bold shadow-2xs text-blue-600"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          أمس
        </button>
        <button
          type="button"
          onClick={() => {
            const tStr = new Date().toISOString().split("T")[0];
            setAgendaDate(tStr);
            setDateRangePreset("CUSTOM");
            setPage(1);
          }}
          className={`px-2 py-0.5 rounded transition-colors ${
            agendaDate === new Date(Date.now() - 86400000).toISOString().split("T")[0]
              ? "bg-white dark:bg-gray-700 font-bold shadow-2xs text-blue-600"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          اليوم
        </button>
        {(agendaDate || dateRangePreset !== "ALL") && (
          <button
            type="button"
            onClick={() => {
              setAgendaDate("");
              setDateRangePreset("ALL");
              setPage(1);
            }}
            className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-800"
          >
            كل المواعيد
          </button>
        )}
      </div>

      {activeFiltersCount > 0 && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors mr-auto"
          title="إلغاء كل الفلاتر وإعادة ضبط الجدول"
        >
          <FilterX className="w-3.5 h-3.5" />
          <span>إلغاء كل الفلاتر ({activeFiltersCount})</span>
        </button>
      )}
    </div>
  );
}

export default DentalCasesDropdowns;
