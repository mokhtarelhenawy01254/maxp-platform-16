import React from "react";
import {
  Search,
  AlertTriangle,
  Flame,
  Box,
  Layers,
  Table as TableIcon,
} from "lucide-react";
import { BenchFilterPriority, BenchViewMode } from "../types/dentalTechBenchTypes";

interface BenchFilterBarProps {
  totalCount: number;
  overdueCount: number;
  filterPriority: BenchFilterPriority;
  onFilterChange: (filter: BenchFilterPriority) => void;
  search: string;
  onSearchChange: (val: string) => void;
  viewMode: BenchViewMode;
  onViewModeChange: (mode: BenchViewMode) => void;
}

export const BenchFilterBar: React.FC<BenchFilterBarProps> = ({
  totalCount,
  overdueCount,
  filterPriority,
  onFilterChange,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => onFilterChange("ALL")}
          className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
            filterPriority === "ALL"
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          }`}
        >
          الكل (<span className="tabular-nums font-mono">{totalCount}</span>)
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("OVERDUE")}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition whitespace-nowrap ${
            filterPriority === "OVERDUE"
              ? "bg-rose-600 text-white"
              : overdueCount > 0
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>
            المتأخرة (<span className="tabular-nums font-mono">{overdueCount}</span>)
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("URGENT")}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition whitespace-nowrap ${
            filterPriority === "URGENT"
              ? "bg-amber-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>المستعجل والطارئ</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("SCAN")}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition whitespace-nowrap ${
            filterPriority === "SCAN"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          }`}
        >
          <Box className="w-3.5 h-3.5 text-indigo-500" />
          <span>تحتوي ملفات 3D</span>
        </button>
      </div>

      {/* Search & View Mode */}
      <div className="flex items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث برقم الحالة، الطبيب..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 bg-gray-50 dark:bg-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange("CARDS")}
            className={`p-1.5 rounded ${
              viewMode === "CARDS"
                ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs"
                : "text-gray-400 hover:text-gray-600"
            }`}
            title="عرض البطاقات التفاعلية"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("TABLE")}
            className={`p-1.5 rounded ${
              viewMode === "TABLE"
                ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs"
                : "text-gray-400 hover:text-gray-600"
            }`}
            title="عرض الجدول السريع"
          >
            <TableIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BenchFilterBar;
