import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

export interface DentalCasesFilterModeTabsProps {
  total: number;
  trashCount: number;
  viewMode: "ACTIVE" | "OVERDUE" | "TRASH";
  onViewModeChange: (mode: "ACTIVE" | "OVERDUE" | "TRASH") => void;
  setPage: (p: number | ((prev: number) => number)) => void;
}

export const DentalCasesFilterModeTabs: React.FC<DentalCasesFilterModeTabsProps> = ({
  total,
  trashCount,
  viewMode,
  onViewModeChange,
  setPage,
}) => {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <span>حالات معمل الأسنان</span>
          <span className="text-xs font-mono tabular-nums font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-300">
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
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-mono tabular-nums">
              {trashCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default DentalCasesFilterModeTabs;
