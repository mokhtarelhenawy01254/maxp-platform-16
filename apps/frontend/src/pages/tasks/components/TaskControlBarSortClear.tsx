import React from "react";
import { ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import type { TaskSortBy } from "../types";

export interface TaskControlBarSortClearProps {
  sortBy: TaskSortBy;
  setSortBy: (val: TaskSortBy) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (val: "asc" | "desc") => void;
  setCurrentPage?: (val: number) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onResetAll: () => void;
}

const sortOptions: { value: TaskSortBy; label: string }[] = [
  { value: "createdAt", label: "الأحدث" },
  { value: "dueDate", label: "الاستحقاق" },
  { value: "priority", label: "الأولوية" },
  { value: "status", label: "الحالة" },
  { value: "title", label: "العنوان" },
];

export const TaskControlBarSortClear: React.FC<TaskControlBarSortClearProps> = ({
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  setCurrentPage,
  hasActiveFilters,
  activeFilterCount,
  onResetAll,
}) => {
  return (
    <div className="flex items-center gap-1.5">
      <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/20 px-2 py-0.5">
        <span className="text-[11px] text-muted-foreground">ترتيب:</span>
        <select
          id="controlbar-sort"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as TaskSortBy);
            setCurrentPage?.(1);
          }}
          className="bg-transparent text-xs appearance-none focus:outline-none cursor-pointer py-0.5 pl-3 text-foreground font-medium"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-card text-foreground">
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title={sortOrder === "asc" ? "تصاعدي" : "تنازلي"}
        >
          {sortOrder === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
        </button>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onResetAll}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all active:scale-[0.98]"
          title="تصفير الفلاتر"
        >
          <RotateCcw className="size-3" />
          <span>تصفير ({activeFilterCount})</span>
        </button>
      )}
    </div>
  );
};
