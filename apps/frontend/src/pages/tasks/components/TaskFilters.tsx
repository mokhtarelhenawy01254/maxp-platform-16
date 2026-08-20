import React from "react";
import {
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type {
  Project,
  TaskCategory,
  TaskFiltersState,
  TaskScopeFilter,
  TaskSortBy,
  TaskUser,
} from "../types";

export interface TaskFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  setCurrentPage: (val: number) => void;
  sortBy: TaskSortBy;
  setSortBy: (val: TaskSortBy) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (val: "asc" | "desc") => void;
  filters: TaskFiltersState;
  setFilters: (val: TaskFiltersState) => void;
  projects: Project[];
  categories: TaskCategory[];
  users: TaskUser[];
  setShowFilterSidebar: (val: boolean) => void;
  taskFilter: TaskScopeFilter;
  setTaskFilter: (val: TaskScopeFilter) => void;
  hideCompleted: boolean;
  setHideCompleted: (val: boolean) => void;
  taskStats: {
    completed: number;
    total?: number;
    pending?: number;
    overdue?: number;
    [key: string]: number | undefined;
  };
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
}

const emptyFilters: TaskFiltersState = {
  projectId: "",
  categoryId: "",
  status: "",
  priority: "",
  assignedTo: "",
  dueDateFrom: "",
  dueDateTo: "",
};

const scopeOptions = [
  { key: "all" as const, label: "الكل" },
  { key: "my-tasks" as const, label: "مهامي" },
  { key: "assigned-by-me" as const, label: "أنشأتها أنا" },
];

const quickViews = [
  { key: "in_progress" as const, label: "قيد التنفيذ" },
  { key: "today" as const, label: "اليوم" },
  { key: "overdue" as const, label: "المتأخرة" },
  { key: "urgent" as const, label: "العاجلة" },
];

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  filters,
  setFilters,
  projects,
  categories,
  users,
  setShowFilterSidebar,
  taskFilter,
  setTaskFilter,
  hideCompleted,
  setHideCompleted,
  taskStats,
  itemsPerPage,
  setItemsPerPage,
}) => {
  const today = getTodayDate();
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;
  const hasCommandState =
    searchQuery.trim().length > 0 ||
    activeFiltersCount > 0 ||
    taskFilter !== "all" ||
    !hideCompleted;

  const clearFilter = (key: keyof typeof emptyFilters) => {
    setFilters({ ...filters, [key]: "" });
    setCurrentPage(1);
  };

  const applyQuickView = (
    view: "overdue" | "today" | "urgent" | "in_progress",
  ) => {
    setCurrentPage(1);
    setTaskFilter("all");
    setHideCompleted(true);

    if (view === "overdue") {
      setFilters({ ...emptyFilters, dueDateTo: today });
      return;
    }
    if (view === "today") {
      setFilters({ ...emptyFilters, dueDateFrom: today, dueDateTo: today });
      return;
    }
    if (view === "urgent") {
      setFilters({ ...emptyFilters, priority: "urgent" });
      return;
    }
    setFilters({ ...emptyFilters, status: "in_progress" });
  };

  const isQuickViewActive = (
    view: "overdue" | "today" | "urgent" | "in_progress",
  ) => {
    if (view === "overdue") {
      return (
        filters.dueDateTo === today &&
        !filters.dueDateFrom &&
        !filters.status &&
        !filters.priority &&
        taskFilter === "all"
      );
    }
    if (view === "today") {
      return (
        filters.dueDateFrom === today &&
        filters.dueDateTo === today &&
        !filters.status &&
        !filters.priority &&
        taskFilter === "all"
      );
    }
    if (view === "urgent") {
      return (
        filters.priority === "urgent" &&
        !filters.status &&
        !filters.dueDateFrom &&
        !filters.dueDateTo &&
        taskFilter === "all"
      );
    }
    return (
      filters.status === "in_progress" &&
      !filters.priority &&
      !filters.dueDateFrom &&
      !filters.dueDateTo &&
      taskFilter === "all"
    );
  };

  const resetCommandState = () => {
    setCurrentPage(1);
    setSearchQuery("");
    setFilters(emptyFilters);
    setTaskFilter("all");
    setHideCompleted(true);
  };

  return (
    <div className="rounded-2xl border border-border/55 bg-card/70 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.10)] backdrop-blur-sm">
      {/* Main row: search + controls */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            id="tasks-search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="بحث..."
            className="business-control-input h-8 rounded-lg border-transparent bg-transparent pr-8 text-xs shadow-none focus:border-border/60 focus:bg-background/80"
          />
        </div>

        {/* Divider */}
        <span className="h-5 w-px bg-border/60" />

        {/* Sort */}
        <select
          id="tasks-sort"
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value as TaskSortBy);
            setCurrentPage(1);
          }}
          className="business-control-input theme-native-control h-8 rounded-lg border-transparent bg-transparent text-xs shadow-none"
        >
          <option value="createdAt">الأحدث</option>
          <option value="dueDate">الاستحقاق</option>
          <option value="priority">الأولوية</option>
          <option value="status">الحالة</option>
          <option value="title">العنوان</option>
        </select>

        {/* Sort order toggle */}
        <button
          type="button"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          title={sortOrder === "asc" ? "تصاعدي" : "تنازلي"}
        >
          <span className="text-sm leading-none">{sortOrder === "asc" ? "↑" : "↓"}</span>
        </button>

        {/* Page size */}
        <select
          id="tasks-page-size"
          value={itemsPerPage}
          onChange={(event) => {
            setItemsPerPage(Number(event.target.value));
            setCurrentPage(1);
          }}
          className="business-control-input theme-native-control h-8 w-16 rounded-lg border-transparent bg-transparent text-xs shadow-none"
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>

        {/* Divider */}
        <span className="h-5 w-px bg-border/60" />

        {/* Filters button */}
        <Button
          type="button"
          variant="ghost"
          className="h-8 shrink-0 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setShowFilterSidebar(true)}
        >
          <AdjustmentsHorizontalIcon className="size-3.5" />
          {activeFiltersCount > 0 ? (
            <span className="rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary">
              {activeFiltersCount}
            </span>
          ) : null}
        </Button>

        {/* Reset */}
        {hasCommandState ? (
          <button
            type="button"
            onClick={resetCommandState}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
            title="تصفير العرض"
          >
            <XMarkIcon className="size-4" />
          </button>
        ) : null}
      </div>

      {/* Chips row */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 px-3 py-2">
        {/* Scope chips */}
        {scopeOptions.map((scope) => (
          <button
            key={scope.key}
            type="button"
            className="business-chip-button"
            data-active={taskFilter === scope.key ? "true" : undefined}
            onClick={() => {
              setTaskFilter(scope.key);
              setCurrentPage(1);
            }}
          >
            {scope.label}
          </button>
        ))}

        <span className="hidden h-3.5 w-px bg-border/60 md:inline-flex" />

        {/* Quick view chips */}
        {quickViews.map((view) => (
          <button
            key={view.key}
            type="button"
            className="business-chip-button"
            data-active={isQuickViewActive(view.key) ? "true" : undefined}
            onClick={() => applyQuickView(view.key)}
          >
            {view.label}
          </button>
        ))}

        {/* Hide completed */}
        <button
          type="button"
          className={`business-chip-button gap-1 ${
            hideCompleted
              ? "data-[active=true]:border-amber-500/30 data-[active=true]:bg-amber-500/5 data-[active=true]:text-amber-700 dark:data-[active=true]:text-amber-300"
              : ""
          }`}
          data-active={hideCompleted ? "true" : undefined}
          onClick={() => {
            setHideCompleted(!hideCompleted);
            setCurrentPage(1);
          }}
        >
          {hideCompleted ? (
            <>
              <span className="size-1.5 rounded-full bg-amber-500" />
              إخفاء المكتملة
            </>
          ) : (
            "عرض المكتملة"
          )}
        </button>

        {/* Active filter tags */}
        {filters.projectId ? (
          <button
            type="button"
            className="business-chip-button gap-1"
            onClick={() => clearFilter("projectId")}
          >
            {projects.find((p) => p.id === filters.projectId)?.name || "مشروع"}
            <XMarkIcon className="size-3" />
          </button>
        ) : null}

        {filters.categoryId ? (
          <button
            type="button"
            className="business-chip-button gap-1"
            onClick={() => clearFilter("categoryId")}
          >
            {categories.find((c) => c.id === filters.categoryId)?.name || "قسم"}
            <XMarkIcon className="size-3" />
          </button>
        ) : null}

        {filters.status ? (
          <button
            type="button"
            className="business-chip-button gap-1"
            onClick={() => clearFilter("status")}
          >
            {filters.status === "pending"
              ? "انتظار"
              : filters.status === "in_progress"
                ? "تنفيذ"
                : filters.status === "completed"
                  ? "مكتمل"
                  : "ملغي"}
            <XMarkIcon className="size-3" />
          </button>
        ) : null}

        {filters.priority ? (
          <button
            type="button"
            className="business-chip-button gap-1"
            onClick={() => clearFilter("priority")}
          >
            {filters.priority === "urgent"
              ? "عاجل"
              : filters.priority === "high"
                ? "عالي"
                : filters.priority === "medium"
                  ? "متوسط"
                  : "منخفض"}
            <XMarkIcon className="size-3" />
          </button>
        ) : null}

        {filters.assignedTo ? (
          <button
            type="button"
            className="business-chip-button gap-1"
            onClick={() => clearFilter("assignedTo")}
          >
            {users.find((u) => u.id === filters.assignedTo)?.name ||
              users.find((u) => u.id === filters.assignedTo)?.firstName ||
              "مسؤول"}
            <XMarkIcon className="size-3" />
          </button>
        ) : null}

        {filters.dueDateFrom || filters.dueDateTo ? (
          <button
            type="button"
            className="business-chip-button gap-1"
            onClick={() => {
              setFilters({ ...filters, dueDateFrom: "", dueDateTo: "" });
              setCurrentPage(1);
            }}
          >
            {filters.dueDateFrom || "..."} – {filters.dueDateTo || "..."}
            <XMarkIcon className="size-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
};
