import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Flame,
  Layers,
  PackageCheck,
  Zap,
} from "lucide-react";

export interface DentalCasesQuickPillsProps {
  viewMode: "ACTIVE" | "OVERDUE" | "TRASH";
  onViewModeChange: (mode: "ACTIVE" | "OVERDUE" | "TRASH") => void;
  priority: string;
  setPriority: (val: string) => void;
  dateRangePreset: string;
  setDateRangePreset: (val: string) => void;
  technicianId: string;
  setTechnicianId: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
  agendaDate: string;
  setAgendaDate: (val: string) => void;
  doctorId: string;
  workTypeId: string;
  paymentStatus: string;
  applyFilter: (key: string, value: string, resetOthers?: boolean) => void;
  setPage: (p: number | ((prev: number) => number)) => void;
}

export function DentalCasesQuickPills({
  viewMode,
  onViewModeChange,
  priority,
  setPriority,
  dateRangePreset,
  setDateRangePreset,
  technicianId,
  setTechnicianId,
  status,
  setStatus,
  agendaDate,
  setAgendaDate,
  doctorId,
  workTypeId,
  paymentStatus,
  applyFilter,
  setPage,
}: DentalCasesQuickPillsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs border-t border-slate-100 dark:border-gray-700/60 pt-2">
      <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0 text-[11px]">
        <Layers className="w-3 h-3 text-slate-400" /> فلاتر سريعة:
      </span>
      <button
        type="button"
        onClick={() => {
          onViewModeChange("ACTIVE");
          setPriority("");
          setDateRangePreset("ALL");
          setTechnicianId("");
          setStatus("");
          setAgendaDate("");
          applyFilter("doctorId", "");
          applyFilter("workTypeId", "");
          applyFilter("paymentStatus", "");
          setPage(1);
        }}
        className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 text-xs ${
          viewMode === "ACTIVE" &&
          !priority &&
          dateRangePreset === "ALL" &&
          !technicianId &&
          !status &&
          !agendaDate &&
          !doctorId &&
          !workTypeId &&
          !paymentStatus
            ? "bg-blue-600 text-white shadow-2xs"
            : "bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
        }`}
      >
        الكل
      </button>
      <button
        type="button"
        onClick={() => {
          onViewModeChange("ACTIVE");
          setPriority("");
          setDateRangePreset("received_today");
          setTechnicianId("");
          setStatus("");
          setPage(1);
        }}
        className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${
          dateRangePreset === "received_today"
            ? "bg-blue-600 text-white shadow-2xs"
            : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200/80 dark:border-blue-900"
        }`}
      >
        <PackageCheck className="w-3 h-3 text-blue-500" />
        <span>وارد اليوم</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onViewModeChange("OVERDUE");
          setPage(1);
        }}
        className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${
          viewMode === "OVERDUE"
            ? "bg-rose-600 text-white shadow-2xs"
            : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200/80 dark:border-rose-900"
        }`}
      >
        <Flame className="w-3 h-3 text-rose-500" />
        <span>متأخرة عن موعدها</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onViewModeChange("ACTIVE");
          setDateRangePreset("today");
          setPage(1);
        }}
        className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${
          dateRangePreset === "today"
            ? "bg-amber-600 text-white shadow-2xs"
            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/80 dark:border-amber-900"
        }`}
      >
        <Clock className="w-3 h-3 text-amber-500" />
        <span>تسليم اليوم</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onViewModeChange("ACTIVE");
          setPriority(priority === "URGENT" ? "" : "URGENT");
          setPage(1);
        }}
        className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${
          priority === "URGENT"
            ? "bg-purple-600 text-white shadow-2xs"
            : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200/80 dark:border-purple-900"
        }`}
      >
        <Zap className="w-3 h-3 text-purple-500" />
        <span>مستعجل</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onViewModeChange("ACTIVE");
          setPriority(priority === "STAT" ? "" : "STAT");
          setPage(1);
        }}
        className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${
          priority === "STAT"
            ? "bg-red-600 text-white shadow-2xs"
            : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 border border-red-200/80 dark:border-red-900"
        }`}
      >
        <AlertTriangle className="w-3 h-3 text-red-500" />
        <span>طارئ فوري</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onViewModeChange("ACTIVE");
          setStatus(status === "OUTSOURCED" ? "" : "OUTSOURCED");
          setPage(1);
        }}
        className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${
          status === "OUTSOURCED"
            ? "bg-amber-600 text-white shadow-2xs"
            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/80 dark:border-amber-900"
        }`}
      >
        <ExternalLink className="w-3 h-3 text-amber-500" />
        <span>بره المعمل (خارجي)</span>
      </button>
    </div>
  );
}

export default DentalCasesQuickPills;
