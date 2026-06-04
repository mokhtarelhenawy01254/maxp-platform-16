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
  { key: "all" as const, label: "كل المهام" },
  { key: "my-tasks" as const, label: "مهامي" },
  { key: "assigned-by-me" as const, label: "أنشأتها أنا" },
];

const quickViews = [
  { key: "in_progress" as const, label: "قيد التنفيذ" },
  { key: "today" as const, label: "استحقاق اليوم" },
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
      setFilters({
        ...emptyFilters,
        dueDateTo: today,
      });
      return;
    }

    if (view === "today") {
      setFilters({
        ...emptyFilters,
        dueDateFrom: today,
        dueDateTo: today,
      });
      return;
    }

    if (view === "urgent") {
      setFilters({
        ...emptyFilters,
        priority: "urgent",
      });
      return;
    }

    setFilters({
      ...emptyFilters,
      status: "in_progress",
    });
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

  const activeFilterLabels = [
    filters.projectId
      ? `المشروع: ${projects.find((project) => project.id === filters.projectId)?.name || "محدد"}`
      : null,
    filters.categoryId
      ? `القسم: ${categories.find((category) => category.id === filters.categoryId)?.name || "محدد"}`
      : null,
    filters.status
      ? `الحالة: ${
          filters.status === "pending"
            ? "في الانتظار"
            : filters.status === "in_progress"
              ? "قيد التنفيذ"
              : filters.status === "completed"
                ? "مكتمل"
                : "ملغي"
        }`
      : null,
    filters.priority
      ? `الأولوية: ${
          filters.priority === "urgent"
            ? "عاجل"
            : filters.priority === "high"
              ? "عالي"
              : filters.priority === "medium"
                ? "متوسط"
                : "منخفض"
        }`
      : null,
    filters.assignedTo
      ? `المسؤول: ${
          users.find((user) => user.id === filters.assignedTo)?.name ||
          users.find((user) => user.id === filters.assignedTo)?.firstName ||
          "محدد"
        }`
      : null,
    filters.dueDateFrom || filters.dueDateTo
      ? `التاريخ: ${filters.dueDateFrom || "..."} - ${filters.dueDateTo || "..."}`
      : null,
    taskFilter === "my-tasks"
      ? "النطاق: مهامي"
      : taskFilter === "assigned-by-me"
        ? "النطاق: أنشأتها أنا"
        : null,
    hideCompleted ? "إخفاء المكتملة" : null,
  ].filter(Boolean) as string[];

  return (
    <section className="space-y-1.5 rounded-[18px] border border-border/60 bg-card/66 p-2 shadow-[0_12px_34px_-30px_rgba(15,27,45,0.18)] md:p-2.5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="tasks-search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="ابحث بعنوان المهمة أو وصفها"
            className="business-control-input h-9 rounded-xl pr-10 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl px-2.5 text-xs"
            onClick={() => setShowFilterSidebar(true)}
          >
            <AdjustmentsHorizontalIcon className="size-4" />
            الفلاتر
            {activeFiltersCount > 0 ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {activeFiltersCount}
              </span>
            ) : null}
          </Button>

          <select
            id="tasks-sort"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as TaskSortBy);
              setCurrentPage(1);
            }}
            className="business-control-input theme-native-control h-9 min-w-[8rem] rounded-xl text-xs"
          >
            <option value="createdAt">الأحدث</option>
            <option value="dueDate">الاستحقاق</option>
            <option value="priority">الأولوية</option>
            <option value="status">الحالة</option>
            <option value="title">العنوان</option>
          </select>

          <select
            id="tasks-page-size"
            value={itemsPerPage}
            onChange={(event) => {
              setItemsPerPage(Number(event.target.value));
              setCurrentPage(1);
            }}
            className="business-control-input theme-native-control h-9 min-w-[5.25rem] rounded-xl text-xs"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl px-2.5 text-xs"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "تصاعدي" : "تنازلي"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
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

        <span className="hidden h-4 w-px bg-border/70 md:inline-flex" />

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

        <button
          type="button"
          className="business-chip-button"
          data-active={hideCompleted ? "true" : undefined}
          onClick={() => {
            setHideCompleted(!hideCompleted);
            setCurrentPage(1);
          }}
        >
          {hideCompleted ? "إخفاء المكتملة" : "عرض المكتملة"}
        </button>

        {hasCommandState ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-full px-2.5 text-xs text-primary"
            onClick={resetCommandState}
          >
            تصفير العرض
          </Button>
        ) : null}
      </div>

      {activeFilterLabels.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.projectId ? (
            <button
              type="button"
              className="business-chip-button gap-1.5"
              onClick={() => clearFilter("projectId")}
            >
              <span>
                المشروع:{" "}
                {projects.find((project) => project.id === filters.projectId)
                  ?.name || "محدد"}
              </span>
              <XMarkIcon className="size-3.5" />
            </button>
          ) : null}

          {filters.categoryId ? (
            <button
              type="button"
              className="business-chip-button gap-1.5"
              onClick={() => clearFilter("categoryId")}
            >
              <span>
                القسم:{" "}
                {categories.find(
                  (category) => category.id === filters.categoryId,
                )?.name || "محدد"}
              </span>
              <XMarkIcon className="size-3.5" />
            </button>
          ) : null}

          {filters.status ? (
            <button
              type="button"
              className="business-chip-button gap-1.5"
              onClick={() => clearFilter("status")}
            >
              <span>
                الحالة:{" "}
                {filters.status === "pending"
                  ? "في الانتظار"
                  : filters.status === "in_progress"
                    ? "قيد التنفيذ"
                    : filters.status === "completed"
                      ? "مكتمل"
                      : "ملغي"}
              </span>
              <XMarkIcon className="size-3.5" />
            </button>
          ) : null}

          {filters.priority ? (
            <button
              type="button"
              className="business-chip-button gap-1.5"
              onClick={() => clearFilter("priority")}
            >
              <span>
                الأولوية:{" "}
                {filters.priority === "urgent"
                  ? "عاجل"
                  : filters.priority === "high"
                    ? "عالي"
                    : filters.priority === "medium"
                      ? "متوسط"
                      : "منخفض"}
              </span>
              <XMarkIcon className="size-3.5" />
            </button>
          ) : null}

          {filters.assignedTo ? (
            <button
              type="button"
              className="business-chip-button gap-1.5"
              onClick={() => clearFilter("assignedTo")}
            >
              <span>
                المسؤول:{" "}
                {users.find((user) => user.id === filters.assignedTo)?.name ||
                  users.find((user) => user.id === filters.assignedTo)
                    ?.firstName ||
                  "محدد"}
              </span>
              <XMarkIcon className="size-3.5" />
            </button>
          ) : null}

          {filters.dueDateFrom || filters.dueDateTo ? (
            <button
              type="button"
              className="business-chip-button gap-1.5"
              onClick={() => {
                setFilters({
                  ...filters,
                  dueDateFrom: "",
                  dueDateTo: "",
                });
                setCurrentPage(1);
              }}
            >
              <span>
                التاريخ: {filters.dueDateFrom || "..."} -{" "}
                {filters.dueDateTo || "..."}
              </span>
              <XMarkIcon className="size-3.5" />
            </button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-full px-2.5 text-xs text-primary"
            onClick={() => {
              setFilters(emptyFilters);
              setCurrentPage(1);
            }}
          >
            مسح الكل
          </Button>
        </div>
      ) : null}
    </section>
  );
};
