import { Archive, Users } from "lucide-react";
import type { DoctorsViewMode } from "../types/doctorsTypes";

interface DoctorsViewSwitchProps {
  viewMode: DoctorsViewMode;
  onViewModeChange: (mode: DoctorsViewMode) => void;
  activeCount: number;
  archivedCount: number;
}

export function DoctorsViewSwitch({
  viewMode,
  onViewModeChange,
  activeCount,
  archivedCount,
}: DoctorsViewSwitchProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border dark:border-gray-700 w-fit">
        <button
          onClick={() => onViewModeChange("ACTIVE")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === "ACTIVE"
              ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الأطباء النشطين</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold font-mono tabular-nums">
            {activeCount}
          </span>
        </button>
        <button
          onClick={() => onViewModeChange("ARCHIVED")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === "ARCHIVED"
              ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>الأطباء المؤرشفين</span>
          {archivedCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold font-mono tabular-nums">
              {archivedCount}
            </span>
          )}
        </button>
      </div>

      {viewMode === "ARCHIVED" && (
        <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg">
          الأطباء المؤرشفين محتفظ بسجلاتهم المالية السابقة ولا يمكن تعيين حالات جديدة لهم.
        </div>
      )}
    </div>
  );
}

export default DoctorsViewSwitch;
