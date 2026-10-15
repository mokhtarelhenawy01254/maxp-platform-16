import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Columns,
  Folder,
  List,
  Pencil,
  Plus,
  Sparkles,
  TrendingUp,
  User,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import type { Project, Task, TaskStatus } from "../types";

interface ProjectWorkspaceViewProps {
  project: Project;
  tasks: Task[];
  onBack: () => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onOpenTaskDetails: (task: Task) => void;
  onOpenCreateTask?: (projectId: string) => void;
  onCreateTaskInProject?: () => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onRefreshTasks?: () => void;
  onEditProject?: (project: Project) => void;
  formatDate?: (date: string) => string;
  formatPrice?: (price: number) => string;
  userRole?: string;
}

type ProjectTab = "list" | "kanban" | "calendar" | "next-up";

const KANBAN_COLUMNS: Array<{ id: TaskStatus; title: string; color: string }> = [
  { id: "pending", title: "في الانتظار", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  { id: "in_progress", title: "قيد التنفيذ", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  { id: "in_review", title: "قيد المراجعة", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  { id: "completed", title: "مكتمل", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
];

export const ProjectWorkspaceView: React.FC<ProjectWorkspaceViewProps> = ({
  project,
  tasks,
  onBack,
  onTaskStatusChange,
  onOpenTaskDetails,
  onOpenCreateTask,
  onCreateTaskInProject,
  onEditProject,
  formatDate,
  formatPrice,
}) => {
  const [activeTab, setActiveTab] = useState<ProjectTab>("list");
  const todayStr = new Date().toISOString().slice(0, 10);

  const safeFormatDate = (dateVal: string | null | undefined): string => {
    if (!dateVal) return "";
    if (typeof formatDate === "function") {
      try {
        return formatDate(dateVal);
      } catch {
        // fallback
      }
    }
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal).slice(0, 10);
      return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return String(dateVal).slice(0, 10);
    }
  };

  const handleCreateTask = () => {
    if (typeof onOpenCreateTask === "function") {
      onOpenCreateTask(project.id);
    } else if (typeof onCreateTaskInProject === "function") {
      onCreateTaskInProject();
    }
  };

  // Filter tasks belonging strictly to this project
  const projectTasks = useMemo(() => {
    return tasks.filter((t) => t.projectId === project.id);
  }, [tasks, project.id]);

  // Compute stats
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = projectTasks.filter((t) => t.status === "in_progress").length;
  const pendingTasks = projectTasks.filter((t) => t.status === "pending").length;
  const overdueTasks = projectTasks.filter(
    (t) => t.dueDate && t.dueDate.slice(0, 10) < todayStr && t.status !== "completed" && t.status !== "cancelled"
  ).length;

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (project.progress || 0);

  // Next up tasks: incomplete, sorted by dueDate ascending
  const nextUpTasks = useMemo(() => {
    return projectTasks
      .filter((t) => t.status !== "completed" && t.status !== "cancelled")
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [projectTasks]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <section className="rounded-2xl border border-border/70 bg-card/85 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Navigation & Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              className="rounded-xl h-8 gap-1.5 text-xs font-semibold hover:bg-muted"
            >
              <ArrowLeft className="size-3.5 rtl:rotate-180" />
              <span>العودة لكافة المشاريع</span>
            </Button>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-xs font-semibold text-muted-foreground">
              عرض المشروع المتكامل
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onEditProject ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditProject(project)}
                className="rounded-xl h-8 gap-1 text-xs"
              >
                <Pencil className="size-3.5" />
                <span>تعديل المشروع</span>
              </Button>
            ) : null}

            <Button
              type="button"
              size="sm"
              onClick={handleCreateTask}
              className="rounded-xl h-8 gap-1.5 text-xs font-semibold"
            >
              <Plus className="size-3.5" />
              <span>إضافة مهمة في المشروع</span>
            </Button>
          </div>
        </div>

        {/* Project Meta Details */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-t border-border/50 pt-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Folder className="size-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                {project.name}
              </h1>
              <Badge
                variant="outline"
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold border-primary/20 bg-primary/5 text-primary"
              >
                {totalTasks} مهمة
              </Badge>
            </div>
            {project.description ? (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl pr-10">
                {project.description}
              </p>
            ) : null}
          </div>

          {/* Quick Stats Grid */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Progress */}
            <div className="rounded-xl border border-border/60 bg-background/80 p-2.5 min-w-[120px]">
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                <span>التقدم الإجمالي</span>
                <span className="font-bold text-foreground">{progressPercent}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* In Progress */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-2.5 min-w-[90px] text-center">
              <span className="text-[10px] text-muted-foreground block font-medium">قيد التنفيذ</span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">{inProgressTasks}</span>
            </div>

            {/* Completed */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-2.5 min-w-[90px] text-center">
              <span className="text-[10px] text-muted-foreground block font-medium">مكتمل</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{completedTasks}</span>
            </div>

            {/* Overdue */}
            {overdueTasks > 0 ? (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.05] p-2.5 min-w-[90px] text-center">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-medium">متأخرة</span>
                <span className="text-base font-bold text-rose-600 dark:text-rose-400">{overdueTasks}</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Workspace Inner Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-border/70 pb-1 overflow-x-auto">
        {(
          [
            { id: "list", label: "قائمة المهام", icon: List, count: totalTasks },
            { id: "kanban", label: "لوحة كانبان", icon: Columns },
            { id: "next-up", label: "الجاي بعده", icon: Sparkles, count: nextUpTasks.length },
            { id: "calendar", label: "التقويم الزمني", icon: Calendar },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" ? (
                <span
                  className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Tasks List */}
      {activeTab === "list" ? (
        <section className="rounded-2xl border border-border/70 bg-card/75 overflow-hidden shadow-xs divide-y divide-border/40">
          {projectTasks.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-foreground">لا توجد مهام في هذا المشروع بعد</p>
              <p className="text-xs text-muted-foreground">أضف مهمتك الأولى لتتبع خطوات المشروع بسهولة.</p>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateTask}
                className="mt-2 rounded-xl text-xs"
              >
                <Plus className="size-3.5 ml-1" />
                إضافة أول مهمة
              </Button>
            </div>
          ) : (
            projectTasks.map((task) => {
              const isDone = task.status === "completed";
              const isOverdue =
                task.dueDate &&
                task.dueDate.slice(0, 10) < todayStr &&
                !isDone &&
                task.status !== "cancelled";

              return (
                <div
                  key={task.id}
                  className={`group flex items-center justify-between gap-3 p-3 sm:px-4 hover:bg-muted/20 transition-colors ${
                    isDone ? "bg-muted/10 opacity-70" : ""
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
                            : "text-foreground group-hover:text-primary transition-colors"
                        }`}
                      >
                        {task.title}
                      </p>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.assignedToName && task.assignedToName !== "غير محدد" ? (
                      <span className="hidden sm:inline-block max-w-[120px] truncate text-[11px] text-muted-foreground">
                        {task.assignedToName}
                      </span>
                    ) : null}

                    {task.dueDate ? (
                      <span
                        className={`text-[11px] font-medium ${
                          isOverdue ? "text-rose-600 font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {safeFormatDate(task.dueDate)}
                      </span>
                    ) : null}

                    <Badge
                      variant="outline"
                      className="text-[10px] rounded-full border-border/60"
                    >
                      {task.status === "completed"
                        ? "مكتمل"
                        : task.status === "in_progress"
                        ? "قيد التنفيذ"
                        : task.status === "in_review"
                        ? "قيد المراجعة"
                        : "في الانتظار"}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </section>
      ) : null}

      {/* Tab 2: Project Kanban Board */}
      {activeTab === "kanban" ? (
        <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = projectTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="rounded-2xl border border-border/70 bg-card/65 p-3 space-y-2.5 min-h-[300px] flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">{col.title}</span>
                    <Badge variant="outline" className="rounded-full text-[10px] px-1.5 py-0">
                      {colTasks.length}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto max-h-[500px]">
                  {colTasks.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-[11px] text-muted-foreground border border-dashed border-border/50 rounded-xl">
                      فارغ
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onOpenTaskDetails(t)}
                        className="rounded-xl border border-border/70 bg-background/90 p-2.5 shadow-2xs space-y-2 hover:border-primary/40 cursor-pointer transition-all"
                      >
                        <p className="text-xs font-medium text-foreground line-clamp-2">
                          {t.title}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                          <span>{t.assignedToName || "غير محدد"}</span>
                          {t.dueDate ? <span>{safeFormatDate(t.dueDate)}</span> : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {/* Tab 3: Next Up (الجاي بعده) */}
      {activeTab === "next-up" ? (
        <section className="rounded-2xl border border-border/70 bg-card/75 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" />
                <span>المهام التالية المطلوب إنجازها مرتبة بالمواعيد</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                توضح الأولويات المباشرة التي تحتاج لتحرك الفريق الآن لضمان تسليم المشروع في موعده.
              </p>
            </div>
          </div>

          <div className="divide-y divide-border/40">
            {nextUpTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                رائع! تم إنجاز جميع المهام المجدولة في هذا المشروع. 🎉
              </div>
            ) : (
              nextUpTasks.map((task, index) => {
                const isOverdue =
                  task.dueDate &&
                  task.dueDate.slice(0, 10) < todayStr &&
                  task.status !== "completed";

                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-muted/20 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="size-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onOpenTaskDetails(task)}
                          className="text-right text-xs sm:text-sm font-semibold text-foreground hover:text-primary truncate block focus:outline-none"
                        >
                          {task.title}
                        </button>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          {task.assignedToName ? <span>المسؤول: {task.assignedToName}</span> : null}
                          {task.estimatedHours ? <span>• التقدير: {task.estimatedHours} س</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.dueDate ? (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                            isOverdue
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "text-muted-foreground"
                          }`}
                        >
                          {safeFormatDate(task.dueDate)}
                        </span>
                      ) : null}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onTaskStatusChange(task.id, "completed")}
                        className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                      >
                        <CheckCircle2 className="size-3.5 ml-1" />
                        إنجاز
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      ) : null}

      {/* Tab 4: Calendar deadlines overview */}
      {activeTab === "calendar" ? (
        <section className="rounded-2xl border border-border/70 bg-card/75 p-4 space-y-3">
          <div className="border-b border-border/50 pb-2.5">
            <h3 className="text-sm font-bold text-foreground">
              مواعيد تسليم مهام المشروع
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              جدول زمني سريع للمهام حسب تاريخ الاستحقاق.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {projectTasks
              .filter((t) => t.dueDate)
              .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
              .map((t) => (
                <div
                  key={t.id}
                  onClick={() => onOpenTaskDetails(t)}
                  className="rounded-xl border border-border/60 bg-background/80 p-3 hover:border-primary/40 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-primary">{safeFormatDate(t.dueDate!)}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {t.status === "completed" ? "مكتمل" : "قيد التنفيذ"}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};
