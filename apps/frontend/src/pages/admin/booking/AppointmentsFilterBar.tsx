import React from "react";
import { Search, X, Filter, Plus, ArrowRight } from "lucide-react";
import { BookingBranch, BookingPatient, STATUS_MAP, MODAL_INPUT_CLS } from "./shared";

interface Filters {
  status: string;
  branchId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

interface AppointmentsFilterBarProps {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  branches: BookingBranch[];
  patients: BookingPatient[];
  onViewPatient?: (patientId: string) => void;
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
  onNewAppointment: () => void;
  selectedIds: Set<string>;
  onBulkUpdateStatus: (status: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export const AppointmentsFilterBar: React.FC<AppointmentsFilterBarProps> = ({
  filters,
  onFiltersChange,
  branches,
  patients,
  onViewPatient,
  showAdvancedFilters,
  onToggleAdvancedFilters,
  onNewAppointment,
  selectedIds,
  onBulkUpdateStatus,
  onBulkDelete,
  onClearSelection,
}) => {
  const activeFiltersCount = [
    filters.status,
    filters.dateFrom || filters.dateTo ? "date" : "",
  ].filter(Boolean).length;

  const setQuickDate = (daysBack: number) => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    if (daysBack === 0) onFiltersChange({ ...filters, dateFrom: fmt(today), dateTo: fmt(today) });
    else {
      const from = new Date(today);
      from.setDate(from.getDate() - daysBack);
      onFiltersChange({ ...filters, dateFrom: fmt(from), dateTo: fmt(today) });
    }
  };

  const isToday = filters.dateFrom && filters.dateTo &&
    filters.dateFrom === new Date().toISOString().split("T")[0] &&
    filters.dateTo === new Date().toISOString().split("T")[0];
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const isThisWeek = filters.dateFrom && filters.dateTo &&
    filters.dateTo === new Date().toISOString().split("T")[0] &&
    filters.dateFrom <= lastWeek.toISOString().split("T")[0];

  return (
    <div className="space-y-3 mb-4">
      {/* Top filters row: Search & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="بحث باسم العميل أو الهاتف..."
              className={`${MODAL_INPUT_CLS} pr-8${filters.search ? " pl-8" : ""} w-48 sm:w-64 text-xs sm:text-sm`}
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, search: "" })}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(() => {
            const q = (filters.search || "").trim().toLowerCase();
            if (!q || q.length < 2 || !onViewPatient) return null;
            const exact = patients.find(
              (p) =>
                (p.phone || "").replace(/[\s()-]/g, "") === q.replace(/[\s()-]/g, "") ||
                `${p.firstName} ${p.lastName || ""}`.trim().toLowerCase() === q
            );
            if (!exact) return null;
            return (
              <button
                onClick={() => onViewPatient(exact.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>فتح ملف {exact.firstName} {exact.lastName}</span>
              </button>
            );
          })()}

          <select
            className="border border-border/70 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm bg-card text-foreground shadow-sm hover:border-border transition-colors w-32 sm:w-40 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40"
            value={filters.branchId}
            onChange={(e) => onFiltersChange({ ...filters, branchId: e.target.value })}
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onToggleAdvancedFilters}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium border rounded-lg transition-colors shadow-sm ${
              showAdvancedFilters
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card border-border/70 text-foreground hover:bg-muted/60"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>تصفية متقدمة</span>
            {activeFiltersCount > 0 && (
              <span className="flex items-center justify-center w-4 h-4 text-[10px] font-bold text-primary-foreground bg-primary rounded-full font-mono tabular-nums">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={onNewAppointment}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm hover:bg-primary/90 font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>حجز موعد</span>
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-card border border-border/70 rounded-xl shadow-sm transition-all">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">الحالة</label>
            <select
              className={`${MODAL_INPUT_CLS} text-xs sm:text-sm py-1.5`}
              value={filters.status}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
            >
              <option value="">كل الحالات</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">الفترة الزمنية</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className={`${MODAL_INPUT_CLS} text-xs sm:text-sm py-1.5 w-full font-mono tabular-nums`}
                value={filters.dateFrom}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="date"
                className={`${MODAL_INPUT_CLS} text-xs sm:text-sm py-1.5 w-full font-mono tabular-nums`}
                value={filters.dateTo}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              />
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuickDate(0)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors ${
                    isToday
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border/70 hover:bg-muted/60"
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(7)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors ${
                    isThisWeek
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border/70 hover:bg-muted/60"
                  }`}
                >
                  ٧ أيام
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(30)}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-medium border bg-card text-muted-foreground border-border/70 hover:bg-muted/60 transition-colors"
                >
                  ٣٠ يوماً
                </button>
                {(filters.dateFrom || filters.dateTo) && (
                  <button
                    type="button"
                    onClick={() => onFiltersChange({ ...filters, dateFrom: "", dateTo: "" })}
                    className="text-xs px-2 py-1.5 rounded-lg font-medium border text-destructive border-destructive/30 hover:bg-destructive/10 transition-colors"
                    title="مسح التاريخ"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-primary/10 border border-primary/20 rounded-lg text-xs">
          <span className="font-semibold text-primary ml-2 font-mono tabular-nums">{selectedIds.size} موعد محدد:</span>
          <button
            onClick={() => onBulkUpdateStatus("confirmed")}
            className="px-2 py-1 rounded font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            تأكيد
          </button>
          <button
            onClick={() => onBulkUpdateStatus("cancelled")}
            className="px-2 py-1 rounded font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={() => onBulkUpdateStatus("completed")}
            className="px-2 py-1 rounded font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
          >
            إتمام
          </button>
          <button
            onClick={() => onBulkUpdateStatus("no_show")}
            className="px-2 py-1 rounded font-medium bg-muted text-muted-foreground border border-border/70 hover:bg-muted/80 transition-colors"
          >
            لم يحضر
          </button>
          <span className="w-px h-3.5 bg-border/70 mx-1"></span>
          <button
            onClick={onBulkDelete}
            className="px-2 py-1 rounded font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
          >
            حذف
          </button>
          <button
            onClick={onClearSelection}
            className="px-2 py-1 bg-card text-muted-foreground border border-border/70 rounded hover:bg-muted/60 transition-colors"
          >
            إلغاء التحديد
          </button>
        </div>
      )}
    </div>
  );
};

export default AppointmentsFilterBar;
