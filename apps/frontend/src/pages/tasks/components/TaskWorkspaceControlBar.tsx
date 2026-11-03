import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  Plus,
  RotateCcw,
  Download,
  FolderPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
} from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { TaskControlBarDropdowns } from "./TaskControlBarDropdowns";
import { TaskControlBarScopeViews } from "./TaskControlBarScopeViews";
import { TaskControlBarMetricChips } from "./TaskControlBarMetricChips";
import { TaskControlBarViewModeSwitcher } from "./TaskControlBarViewModeSwitcher";
import { TaskControlBarSortClear } from "./TaskControlBarSortClear";
import type {
  Project,
  TaskCategory,
  TaskFiltersState,
  TaskScopeFilter,
  TaskSortBy,
  TaskUser,
  TaskViewMode,
} from "../types";

export interface TaskWorkspaceControlBarProps {
  // Title & Header Telemetry
  headline?: string;
  taskStats?: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  visibleTasksCount?: number;
  selectedTasksCount?: number;
  showOverdueIndicators?: boolean;

  // Actions
  onExportToCSV?: () => void;
  onScrollToBulkActions?: () => void;
  onOpenCreateProject?: () => void;
  onOpenCreateGoal?: () => void;
  onCreateTask?: () => void;
  setShowCreateTaskModal?: (val: boolean) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  setCurrentPage?: (val: number) => void;

  // Scope & Filters
  taskFilter: TaskScopeFilter;
  setTaskFilter: (val: TaskScopeFilter) => void;
  quickFilter?: string;
  setQuickFilter?: (val: any) => void;
  filters: TaskFiltersState;
  setFilters: (val: TaskFiltersState) => void;
  projects?: Project[];
  categories?: TaskCategory[];
  users?: TaskUser[];

  // Hide Completed
  hideCompleted: boolean;
  setHideCompleted: (val: boolean) => void;

  // View Mode
  viewMode?: TaskViewMode | "kanban" | "list";
  onViewModeChange?: (mode: "flat" | "grouped" | "kanban") => void;
  onToggleViewMode?: () => void;

  // Sorting
  sortBy: TaskSortBy;
  setSortBy: (val: TaskSortBy) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (val: "asc" | "desc") => void;

  // Strips
  todayTasksCount?: number;
  showTodayStrip?: boolean;
  onToggleTodayStrip?: () => void;
  goalsCount?: number;
  showGoalsStrip?: boolean;
  onToggleGoalsStrip?: () => void;

  className?: string;
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

const scopeLabels: Record<TaskScopeFilter, string> = {
  all: "كل المهام",
  "my-tasks": "مهامي",
  "assigned-by-me": "أنشأتها أنا",
};

export const TaskWorkspaceControlBar: React.FC<TaskWorkspaceControlBarProps> = ({
  headline,
  taskStats = { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 },
  visibleTasksCount,
  selectedTasksCount = 0,
  showOverdueIndicators = true,
  onExportToCSV,
  onScrollToBulkActions,
  onOpenCreateProject,
  onOpenCreateGoal,
  onCreateTask,
  setShowCreateTaskModal,
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  taskFilter,
  setTaskFilter,
  quickFilter,
  setQuickFilter,
  filters,
  setFilters,
  projects = [],
  users = [],
  hideCompleted,
  setHideCompleted,
  viewMode = "grouped",
  onViewModeChange,
  onToggleViewMode,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  todayTasksCount,
  showTodayStrip,
  onToggleTodayStrip,
  goalsCount,
  showGoalsStrip,
  onToggleGoalsStrip,
  className = "",
}) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const openTasksCount = taskStats.pending + taskStats.inProgress;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim().length > 0) count++;
    if (taskFilter !== "all") count++;
    if (filters.projectId) count++;
    if (filters.status) count++;
    if (filters.priority) count++;
    if (filters.assignedTo) count++;
    if (filters.dueDateFrom || filters.dueDateTo) count++;
    if (!hideCompleted) count++;
    if (quickFilter && quickFilter !== "all") count++;
    return count;
  }, [searchQuery, taskFilter, filters, hideCompleted, quickFilter]);

  const hasActiveFilters = activeFilterCount > 0;

  const resetAll = () => {
    setCurrentPage?.(1);
    setSearchQuery("");
    setTaskFilter("all");
    setFilters(emptyFilters);
    setQuickFilter?.("all");
    setHideCompleted(true);
  };

  const handleCreate = () => {
    if (onCreateTask) onCreateTask();
    else if (setShowCreateTaskModal) setShowCreateTaskModal(true);
  };

  return (
    <div
      className={`rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-md transition-all ${className}`}
    >
      {/* Primary Cockpit Bar (Unified Single Surface) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 sm:px-3 sm:py-2.5">
        
        {/* Right side (RTL): Title + Scope Badge + Compact Live Telemetry */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-foreground">
              المهام
            </h1>
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/10 px-2.5 py-0 text-[10px] font-semibold text-primary"
            >
              {scopeLabels[taskFilter] || "كل المهام"}
            </Badge>
          </div>

          {/* Compact Telemetry Chips */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs">
            <span
              className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/60 px-2 py-0.5 text-[11px]"
              title="المهام المفتوحة (انتظار + قيد التنفيذ)"
            >
              <Clock className="size-3 text-blue-500" />
              <span className="text-muted-foreground">مفتوحة:</span>
              <strong className="font-semibold text-foreground font-mono tabular-nums">
                {openTasksCount}
              </strong>
            </span>

            <span
              className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/60 px-2 py-0.5 text-[11px]"
              title="المهام قيد الانتظار"
            >
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">انتظار:</span>
              <strong className="font-semibold text-foreground font-mono tabular-nums">
                {taskStats.pending}
              </strong>
            </span>

            <span
              className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/60 px-2 py-0.5 text-[11px]"
              title="المهام المكتملة"
            >
              <CheckCircle2 className="size-3 text-emerald-500" />
              <span className="text-muted-foreground">مكتملة:</span>
              <strong className="font-semibold text-foreground font-mono tabular-nums">
                {taskStats.completed}
              </strong>
            </span>

            {showOverdueIndicators && taskStats.overdue > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-700 dark:text-rose-400 font-semibold"
                title="المهام المتأخرة عن الموعد"
              >
                <AlertCircle className="size-3 text-rose-500 animate-pulse" />
                <span>متأخرة:</span>
                <strong className="font-bold font-mono tabular-nums">
                  {taskStats.overdue}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Center: Search Input with Clear Button */}
        <div className="relative min-w-[160px] sm:min-w-[200px] max-w-[260px] flex-1">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            id="task-cockpit-search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage?.(1);
            }}
            placeholder="بحث في المهام..."
            className="h-8 rounded-lg border-border/50 bg-background/60 pr-8 pl-7 text-xs shadow-none focus:border-primary/50 focus:bg-background"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage?.(1);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        {/* Left side (RTL): Actions & Single Primary CTA */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Bulk actions trigger if tasks selected */}
          {selectedTasksCount > 0 && onScrollToBulkActions && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onScrollToBulkActions}
              className="h-8 gap-1 rounded-lg border-primary/30 bg-primary/5 text-primary text-xs font-medium"
            >
              <span>الإجراءات ({selectedTasksCount})</span>
            </Button>
          )}

          {/* Export CSV action */}
          {onExportToCSV && selectedTasksCount === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportToCSV}
              className="h-8 gap-1 rounded-lg border-border/60 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              title="تصدير إلى CSV"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">تصدير</span>
            </Button>
          )}

          {/* New Project shortcut */}
          {onOpenCreateProject && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCreateProject}
              className="hidden xl:inline-flex h-8 gap-1 rounded-lg border-border/60 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <FolderPlus className="size-3.5" />
              <span>مشروع</span>
            </Button>
          )}

          {/* View Mode Switcher (List / Groups / Kanban) */}
          <TaskControlBarViewModeSwitcher
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            onToggleViewMode={onToggleViewMode}
          />

          {/* Mobile Filters Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className="md:hidden h-8 gap-1 rounded-lg border-border/60 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal className="size-3.5" />
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary font-mono tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* The ONLY Primary CTA on the Page */}
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            data-testid="tasks-open-create-modal"
            className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            <span>مهمة جديدة</span>
          </Button>
        </div>
      </div>

      {/* Desktop Secondary Filter Ribbon (Unified Lower Tier) */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-2 border-t border-border/40 px-3 py-1.5 bg-muted/5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope and Quick Views */}
          <TaskControlBarScopeViews
            taskFilter={taskFilter}
            setTaskFilter={setTaskFilter}
            quickFilter={quickFilter}
            setQuickFilter={setQuickFilter}
            filters={filters}
            setFilters={setFilters}
            setCurrentPage={setCurrentPage}
          />

          {/* Dropdown Filters (Project, Assignee) */}
          <TaskControlBarDropdowns
            filters={filters}
            setFilters={setFilters}
            setCurrentPage={setCurrentPage}
            projects={projects}
            users={users}
          />

          {/* Hide Completed Toggle Pill */}
          <button
            type="button"
            onClick={() => {
              setHideCompleted(!hideCompleted);
              setCurrentPage?.(1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-all active:scale-[0.98] ${
              hideCompleted
                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${hideCompleted ? "bg-amber-500" : "bg-muted-foreground/40"}`}
            />
            <span>{hideCompleted ? "المكتملة مخفية" : "إخفاء المكتملة"}</span>
          </button>
        </div>

        {/* Left Side: Strips Metric Chips + Sort & Reset */}
        <div className="flex items-center gap-2">
          <TaskControlBarMetricChips
            todayTasksCount={todayTasksCount}
            showTodayStrip={showTodayStrip}
            onToggleTodayStrip={onToggleTodayStrip}
            goalsCount={goalsCount}
            showGoalsStrip={showGoalsStrip}
            onToggleGoalsStrip={onToggleGoalsStrip}
          />

          <TaskControlBarSortClear
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            setCurrentPage={setCurrentPage}
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
            onResetAll={resetAll}
          />
        </div>
      </div>

      {/* Mobile Drawer Foldout */}
      {mobileFiltersOpen && (
        <div className="md:hidden border-t border-border/40 p-2.5 space-y-2.5 bg-muted/10 animate-in fade-in-50 duration-150">
          <TaskControlBarScopeViews
            taskFilter={taskFilter}
            setTaskFilter={setTaskFilter}
            quickFilter={quickFilter}
            setQuickFilter={setQuickFilter}
            filters={filters}
            setFilters={setFilters}
            setCurrentPage={setCurrentPage}
            isMobile
          />

          <TaskControlBarDropdowns
            filters={filters}
            setFilters={setFilters}
            setCurrentPage={setCurrentPage}
            projects={projects}
            users={users}
            isMobileGrid
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/30">
            <button
              type="button"
              onClick={() => {
                setHideCompleted(!hideCompleted);
                setCurrentPage?.(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium ${
                hideCompleted
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-border/60 bg-muted/20 text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${hideCompleted ? "bg-amber-500" : "bg-muted-foreground/40"}`}
              />
              <span>{hideCompleted ? "المكتملة مخفية" : "إخفاء المكتملة"}</span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-600 dark:text-rose-400"
              >
                <RotateCcw className="size-3" />
                <span>تصفير ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
