import React from "react";
import type { TaskFiltersState, TaskScopeFilter } from "../types";

export interface TaskControlBarScopeViewsProps {
  taskFilter: TaskScopeFilter;
  setTaskFilter: (val: TaskScopeFilter) => void;
  quickFilter?: string;
  setQuickFilter?: (val: any) => void;
  filters: TaskFiltersState;
  setFilters: (val: TaskFiltersState) => void;
  setCurrentPage?: (val: number) => void;
  isMobile?: boolean;
}

const scopeOptions: { key: TaskScopeFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "my-tasks", label: "مهامي" },
  { key: "assigned-by-me", label: "أنشأتها أنا" },
];

const quickViewOptions: { key: "all" | "today" | "overdue" | "in_progress"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "today", label: "اليوم" },
  { key: "overdue", label: "المتأخرة" },
  { key: "in_progress", label: "قيد التنفيذ" },
];

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const TaskControlBarScopeViews: React.FC<TaskControlBarScopeViewsProps> = ({
  taskFilter,
  setTaskFilter,
  quickFilter,
  setQuickFilter,
  filters,
  setFilters,
  setCurrentPage,
  isMobile = false,
}) => {
  const today = getTodayDate();

  const isQuickViewActive = (key: "all" | "today" | "overdue" | "in_progress") => {
    if (key === "all") {
      return (
        (!quickFilter || quickFilter === "all") &&
        !filters.dueDateFrom &&
        !filters.dueDateTo &&
        filters.status !== "in_progress"
      );
    }
    if (key === "today") {
      return quickFilter === "today" || (filters.dueDateFrom === today && filters.dueDateTo === today);
    }
    if (key === "overdue") {
      return quickFilter === "overdue" || (filters.dueDateTo === today && !filters.dueDateFrom);
    }
    return filters.status === "in_progress";
  };

  const handleQuickViewClick = (key: "all" | "today" | "overdue" | "in_progress") => {
    setCurrentPage?.(1);
    if (key === "all") {
      setQuickFilter?.("all");
      setFilters({ ...filters, status: "", dueDateFrom: "", dueDateTo: "" });
    } else if (key === "today") {
      setQuickFilter?.("today");
      setFilters({ ...filters, status: "", dueDateFrom: today, dueDateTo: today });
    } else if (key === "overdue") {
      setQuickFilter?.("overdue");
      setFilters({ ...filters, status: "", dueDateFrom: "", dueDateTo: today });
    } else if (key === "in_progress") {
      setQuickFilter?.("all");
      setFilters({ ...filters, status: "in_progress", dueDateFrom: "", dueDateTo: "" });
    }
  };

  if (isMobile) {
    return (
      <div className="flex flex-wrap gap-1">
        {scopeOptions.map((scope) => (
          <button
            key={scope.key}
            type="button"
            onClick={() => {
              setTaskFilter(scope.key);
              setCurrentPage?.(1);
            }}
            className={`rounded-lg px-2 py-1 text-xs font-medium ${
              taskFilter === scope.key
                ? "bg-card border border-border text-foreground font-semibold shadow-xs"
                : "bg-muted/40 text-muted-foreground"
            }`}
          >
            {scope.label}
          </button>
        ))}
        {quickViewOptions.map((qv) => (
          <button
            key={qv.key}
            type="button"
            onClick={() => handleQuickViewClick(qv.key)}
            className={`rounded-lg px-2 py-1 text-xs font-medium ${
              isQuickViewActive(qv.key)
                ? "border border-primary/30 bg-primary/10 text-primary font-semibold"
                : "bg-muted/40 text-muted-foreground"
            }`}
          >
            {qv.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Scope Pills */}
      <div className="hidden sm:inline-flex rounded-lg border border-border/50 bg-muted/30 p-0.5">
        {scopeOptions.map((scope) => (
          <button
            key={scope.key}
            type="button"
            onClick={() => {
              setTaskFilter(scope.key);
              setCurrentPage?.(1);
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all active:scale-[0.98] ${
              taskFilter === scope.key
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {scope.label}
          </button>
        ))}
      </div>

      {/* Desktop Quick Views */}
      <div className="hidden md:inline-flex items-center gap-1">
        {quickViewOptions.map((qv) => {
          const active = isQuickViewActive(qv.key);
          return (
            <button
              key={qv.key}
              type="button"
              onClick={() => handleQuickViewClick(qv.key)}
              className={`rounded-lg px-2 py-1 text-xs font-medium transition-all active:scale-[0.98] ${
                active
                  ? "border border-primary/30 bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              {qv.label}
            </button>
          );
        })}
      </div>
    </>
  );
};
