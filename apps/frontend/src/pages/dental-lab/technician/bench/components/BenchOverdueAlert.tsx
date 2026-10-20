import React from "react";
import { AlertTriangle } from "lucide-react";
import { BenchFilterPriority } from "../types/dentalTechBenchTypes";

interface BenchOverdueAlertProps {
  overdueCount: number;
  filterPriority: BenchFilterPriority;
  onFilterOverdue: () => void;
}

export const BenchOverdueAlert: React.FC<BenchOverdueAlertProps> = ({
  overdueCount,
  filterPriority,
  onFilterOverdue,
}) => {
  if (overdueCount === 0 || filterPriority === "OVERDUE") {
    return null;
  }

  return (
    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-300 shadow-xs">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
        <span>
          يوجد{" "}
          <b className="tabular-nums font-mono font-bold">
            {overdueCount}
          </b>{" "}
          حالة متأخرة عن موعد التسليم المقرر للعيادة. يرجى إعطاؤها الأولوية القصوى
          على الطاولة.
        </span>
      </div>
      <button
        type="button"
        onClick={onFilterOverdue}
        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shrink-0 transition"
      >
        تصفية المتأخرات فقط
      </button>
    </div>
  );
};

export default BenchOverdueAlert;
