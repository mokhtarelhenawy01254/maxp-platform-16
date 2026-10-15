import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  ArrowUpRight,
  Sparkles,
  Calendar,
  AlertCircle,
  LayoutGrid,
  List,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import type {
  Project,
  Task,
  TaskQuickFilter,
  TaskStatus,
  TaskViewMode,
} from "../types";

interface TaskProjectGroupViewProps {
  projects: Project[];
  tasks: Task[];
  allTasks: Task[];
  quickFilter: TaskQuickFilter;
  onQuickFilterChange: (filter: TaskQuickFilter) => void;
  onOpenProject: (project: Project) => void;
  onOpenTaskDetails: (task: Task) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onOpenCreateTask: (projectId?: string) => void;
  formatDate: (date: string) => string;
  formatPrice?: (price: number) => string;
  viewMode: TaskViewMode;
  onToggleViewMode: (mode: TaskViewMode) => void;
}

const statusBadges: Record<string, { label: string; className: string }> = {
  pending: {
    label: "في الانتظار",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  in_progress: {
    label: "قيد التنفيذ",
    className: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  in_review: {
    label: "قيد المراجعة",
    className: "border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  completed: {
    label: "مكتمل",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  cancelled: {
    label: "ملغي",
    className: "border-muted bg-muted text-muted-foreground",
  },
};

export const TaskProjectGroupView: React.FC<TaskProjectGroupViewProps> = ({
  projects,
  tasks,
  allTasks,
  quickFilter,
  onQuickFilterChange,
  onOpenProject,
  onOpenTaskDetails,
  onTaskStatusChange,
  onOpenCreateTask,
  formatDate,
  viewMode,
  onToggleViewMode,
}) => {
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // Group tasks by projectId
  const { groupedByProject, unassignedTasks } = React.useMemo(() => {
    const map = new Map<string, Task[]>();
    const unassigned: Task[] = [];

    tasks.forEach((t) => {
      if (t.projectId) {
        if (!map.has(t.projectId)) {
          map.set(t.projectId, []);
        }
        map.get(t.projectId)!.push(t);
      } else {
        unassigned.push(t);
      }
    });

    return { groupedByProject: map, unassignedTasks: unassigned };
  }, [tasks]);

  return (
    <div className="space-y-3.5">
      {/* Quick Filters & View Switcher Bar */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/75 p-2 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        {/* Quick time filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground px-1 hidden md:inline">
            تصفية سريعة:
          </span>

          {(
            [
              { key: "all", label: "كل المهام" },
              { key: "today", label: "اليوم" },
              { key: "week", label: "هذا الأسبوع" },
              { key: "overdue", label: "متأخرة ⚠️" },
            ] as const
          ).map((chip) => {
            const isActive = quickFilter === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => onQuickFilterChange(chip.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "bg-background/80 text-foreground hover:bg-muted/80 border border-border/50"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* View Switcher buttons */}
        <div className="flex items-center gap-1 self-end sm:self-auto border-t sm:border-t-0 pt-1 sm:pt-0 border-border/40">
          <button
            type="button"
            onClick={() => onToggleViewMode("grouped")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
              viewMode === "grouped"
                ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="عرض مجمّع بالمشاريع"
          >
            <LayoutGrid className="size-3.5" />
            <span>عرض بالمشاريع</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleViewMode("flat")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
              viewMode === "flat"
                ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="عرض قائمة مسطحة"
          >
            <List className="size-3.5" />
            <span>قائمة مسطحة</span>
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-3">
        {projects.map((project) => {
          const projectTasks = groupedByProject.get(project.id) || [];
          const allProjectTasks = allTasks.filter((t) => t.projectId === project.id);
          const totalTasksCount = allProjectTasks.length;
          const completedCount = allProjectTasks.filter((t) => t.status === "completed").length;
          const inProgressCount = allProjectTasks.filter((t) => t.status === "in_progress").length;
          const overdueCount = allProjectTasks.filter(
            (t) => t.dueDate && t.dueDate.slice(0, 10) < todayStr && t.status !== "completed" && t.status !== "cancelled"
          ).length;

          const progressPercent = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : (project.progress || 0);
          const isCollapsed = Boolean(collapsedProjects[project.id]);

          // If there's an active filter and this project has no matching tasks, we can either hide or show empty
          if (quickFilter !== "all" && projectTasks.length === 0) {
            return null;
          }

          return (
            <section
              key={project.id}
              className="rounded-2xl border border-border/70 bg-card/75 shadow-xs overflow-hidden transition-all hover:border-primary/25"
            >
              {/* Project Card Header */}
              <div className="flex flex-col gap-3 p-3.5 sm:p-4 bg-muted/15 border-b border-border/50 md:flex-row md:items-center md:justify-between">
                {/* Title & Info */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Folder className="size-4" />
                    </span>

                    <h3 className="text-base font-bold text-foreground truncate">
                      {project.name}
                    </h3>

                    <Badge
                      variant="outline"
                      className="rounded-full px-2 py-0 text-[10px] font-semibold border-primary/20 bg-primary/5 text-primary"
                    >
                      {totalTasksCount} مهمة
                    </Badge>

                    {overdueCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="rounded-full px-2 py-0 text-[10px] font-semibold border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      >
                        {overdueCount} متأخرة
                      </Badge>
                    ) : null}
                  </div>

                  {project.description ? (
                    <p className="line-clamp-1 text-xs text-muted-foreground pr-9">
                      {project.description}
                    </p>
                  ) : null}
                </div>

                {/* Progress bar & Actions */}
                <div className="flex flex-wrap items-center gap-3 pr-9 md:pr-0">
                  {/* Progress indicator */}
                  <div className="min-w-[130px] space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                      <span>الإنجاز</span>
                      <span className="font-bold text-foreground">{progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Open Project Workspace Button */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenProject(project)}
                    className="h-8 gap-1.5 rounded-xl border-primary/25 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <span>عرض المشروع</span>
                    <ArrowUpRight className="size-3.5 rtl:rotate-90" />
                  </Button>

                  {/* Collapse / Expand toggle */}
                  <button
                    type="button"
                    onClick={() => toggleCollapse(project.id)}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground focus:outline-none"
                    title={isCollapsed ? "إظهار المهام" : "طي المهام"}
                  >
                    {isCollapsed ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronUp className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Tasks List inside project */}
              {!isCollapsed ? (
                <div className="divide-y divide-border/40">
                  {projectTasks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      لا توجد مهام تطابق هذا الفلتر في هذا المشروع.
                    </div>
                  ) : (
                    projectTasks.map((task) => {
                      const isDone = task.status === "completed";
                      const isOverdue =
                        task.dueDate &&
                        task.dueDate.slice(0, 10) < todayStr &&
                        !isDone &&
                        task.status !== "cancelled";

                      const badgeInfo = statusBadges[task.status] || statusBadges.pending;

                      return (
                        <div
                          key={task.id}
                          className={`group flex items-center justify-between gap-3 p-2.5 sm:px-4 sm:py-2.5 transition-colors ${
                            isDone ? "bg-muted/10 opacity-75" : "hover:bg-muted/20"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                onTaskStatusChange(
                                  task.id,
                                  isDone ? "in_progress" : "completed"
                                )
                              }
                              title={isDone ? "تعليم كغير مكتمل" : "إنجاز المهمة"}
                              className="shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                            >
                              {isDone ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <Circle className="size-4 hover:scale-110 transition-transform" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenTaskDetails(task)}
                              className="min-w-0 flex-1 text-right focus:outline-none"
                            >
                              <p
                                className={`text-xs sm:text-sm font-medium truncate ${
                                  isDone
                                    ? "line-through text-muted-foreground"
                                    : "text-foreground group-hover:text-primary transition-colors"
                                }`}
                              >
                                {task.title}
                              </p>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {task.assignedToName && task.assignedToName !== "غير محدد" ? (
                              <span className="hidden sm:inline-block max-w-[100px] truncate text-[11px] text-muted-foreground">
                                {task.assignedToName}
                              </span>
                            ) : null}

                            {task.dueDate ? (
                              <span
                                className={`text-[11px] font-medium ${
                                  isOverdue
                                    ? "text-rose-600 font-semibold dark:text-rose-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {formatDate(task.dueDate)}
                              </span>
                            ) : null}

                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${badgeInfo.className}`}
                            >
                              {badgeInfo.label}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Add task shortcut in this project */}
                  <div className="p-2 bg-muted/5 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenCreateTask(project.id)}
                      className="h-7 gap-1 text-xs text-primary hover:text-primary/90 hover:bg-primary/5"
                    >
                      <Plus className="size-3.5" />
                      <span>إضافة مهمة في «{project.name}»</span>
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}

        {/* Unassigned Tasks section */}
        {unassignedTasks.length > 0 ? (
          <section className="rounded-2xl border border-dashed border-border/70 bg-card/60 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-3.5 bg-muted/10 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">
                  مهام بدون مشروع
                </span>
                <Badge variant="outline" className="text-[10px] rounded-full">
                  {unassignedTasks.length}
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenCreateTask()}
                className="h-7 text-xs text-primary"
              >
                <Plus className="size-3.5 ml-1" />
                إضافة مهمة عامة
              </Button>
            </div>

            <div className="divide-y divide-border/40">
              {unassignedTasks.map((task) => {
                const isDone = task.status === "completed";
                const badgeInfo = statusBadges[task.status] || statusBadges.pending;

                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between gap-3 p-2.5 sm:px-4 sm:py-2.5 transition-colors ${
                      isDone ? "bg-muted/10 opacity-75" : "hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          onTaskStatusChange(
                            task.id,
                            isDone ? "in_progress" : "completed"
                          )
                        }
                        className="shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                      >
                        {isDone ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <Circle className="size-4 hover:scale-110 transition-transform" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenTaskDetails(task)}
                        className="min-w-0 flex-1 text-right focus:outline-none"
                      >
                        <p
                          className={`text-xs sm:text-sm font-medium truncate ${
                            isDone
                              ? "line-through text-muted-foreground"
                              : "text-foreground hover:text-primary transition-colors"
                          }`}
                        >
                          {task.title}
                        </p>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.dueDate ? (
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(task.dueDate)}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${badgeInfo.className}`}
                      >
                        {badgeInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};
