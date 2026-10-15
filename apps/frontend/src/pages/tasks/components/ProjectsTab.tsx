import React from "react";
import {
  EyeIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { Button } from "../../../components/ui/button";
import type { Project } from "../types";

export interface ProjectsTabProps {
  projects: Project[];
  formatPrice: (amount: number) => string;
  formatDate: (date: string) => string;
  setSelectedProject: (project: Project) => void;
  setShowProjectModal: (show: boolean) => void;
  setEditingProject: (project: Project) => void;
  setShowEditProjectModal: (show: boolean) => void;
  setShowCreateProjectModal: (show: boolean) => void;
  deleteProject: (projectId: string) => void;
  onOpenProjectWorkspace?: (project: Project) => void;
}

const projectStatusStyles: Record<string, string> = {
  active:
    "border border-primary/20 bg-primary/8 text-primary dark:bg-primary/12",
  completed:
    "border border-secondary/20 bg-secondary/10 text-secondary dark:bg-secondary/14",
  planning:
    "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  on_hold:
    "border border-border/60 bg-background/75 text-muted-foreground dark:bg-muted/70 dark:text-slate-300",
};

const projectStatusLabels: Record<string, string> = {
  active: "نشط",
  completed: "مكتمل",
  planning: "تخطيط",
  on_hold: "متوقف",
};

const projectPriorityStyles: Record<string, string> = {
  high: "border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  medium:
    "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border border-border/60 bg-background/75 text-muted-foreground dark:text-slate-300",
};

const projectPriorityLabels: Record<string, string> = {
  high: "عالي",
  medium: "متوسط",
  low: "منخفض",
};

const summaryChipClassName =
  "rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground";

const infoCardClassName =
  "rounded-[20px] border border-border/60 bg-background/65 p-3";

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  projects,
  formatPrice,
  formatDate,
  setSelectedProject,
  setShowProjectModal,
  setEditingProject,
  setShowEditProjectModal,
  setShowCreateProjectModal,
  deleteProject,
  onOpenProjectWorkspace,
}) => {
  const activeProjects = projects.filter(
    (project) => project.status === "active",
  );
  const completedProjects = projects.filter(
    (project) => project.status === "completed",
  );
  const averageProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce(
            (total, project) => total + (project.progress || 0),
            0,
          ) / projects.length,
        )
      : 0;

  return (
    <section className="space-y-3 pb-24 md:pb-0">
      <div className="flex flex-col gap-2.5 rounded-[24px] border border-border/70 bg-card/62 p-3.5 shadow-[0_18px_52px_-44px_rgba(15,27,45,0.18)] md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <span className={summaryChipClassName}>{projects.length} مشروع</span>
          <span className={summaryChipClassName}>
            {activeProjects.length} نشط
          </span>
          <span className={summaryChipClassName}>
            {completedProjects.length} مكتمل
          </span>
          <span className={summaryChipClassName}>
            متوسط التقدم {averageProgress}%
          </span>
        </div>

        {projects.length > 0 ? (
          <Button
            type="button"
            className="hidden h-10 rounded-2xl md:inline-flex"
            onClick={() => setShowCreateProjectModal(true)}
          >
            <PlusIcon className="size-4" />
            مشروع جديد
          </Button>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[26px] border border-dashed border-border/70 bg-card/55 px-4 py-14 text-center">
          <FolderIcon className="size-12 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              لا توجد مشاريع بعد
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              ابدأ بمشروع واضح النطاق ثم اربط به المهام بدل العمل في مساحة
              مبعثرة.
            </p>
          </div>
          <Button
            type="button"
            className="rounded-2xl"
            onClick={() => setShowCreateProjectModal(true)}
          >
            <PlusIcon className="size-4" />
            إنشاء مشروع
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const spentBudget = project.spentBudget || 0;
            const totalBudget = project.budget || 0;
            const progress = project.progress || 0;
            const remainingBudget = Math.max(totalBudget - spentBudget, 0);

            return (
              <article
                key={project.id}
                className="rounded-[26px] border border-border/70 bg-card/65 p-4 shadow-[0_18px_52px_-42px_rgba(15,27,45,0.34)] sm:p-5"
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            projectStatusStyles[project.status] ||
                            projectStatusStyles.on_hold
                          }`}
                        >
                          {projectStatusLabels[project.status] || "متوقف"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            projectPriorityStyles[project.priority] ||
                            projectPriorityStyles.medium
                          }`}
                        >
                          {projectPriorityLabels[project.priority] || "متوسط"}
                        </span>
                        <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          ينتهي{" "}
                          {project.endDate
                            ? formatDate(project.endDate)
                            : "غير محدد"}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenProjectWorkspace) {
                              onOpenProjectWorkspace(project);
                            } else {
                              setSelectedProject(project);
                              setShowProjectModal(true);
                            }
                          }}
                          className="text-right text-lg font-bold text-foreground hover:text-primary transition-colors focus:outline-none"
                        >
                          {project.name}
                        </button>
                        <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
                          {project.description ||
                            "لا يوجد وصف موجز لهذا المشروع."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          if (onOpenProjectWorkspace) {
                            onOpenProjectWorkspace(project);
                          } else {
                            setSelectedProject(project);
                            setShowProjectModal(true);
                          }
                        }}
                      >
                        <EyeIcon className="size-4" />
                        عرض المشروع
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          setEditingProject(project);
                          setShowEditProjectModal(true);
                        }}
                      >
                        <PencilIcon className="size-4" />
                        تعديل
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full text-rose-600 hover:text-rose-700"
                        onClick={() => deleteProject(project.id)}
                      >
                        <TrashIcon className="size-4" />
                        حذف
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div className={infoCardClassName}>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        المدير
                      </dt>
                      <dd className="mt-1 font-semibold text-foreground">
                        {project.managerName || "غير محدد"}
                      </dd>
                    </div>
                    <div className={infoCardClassName}>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        البداية
                      </dt>
                      <dd className="mt-1 font-semibold text-foreground">
                        {project.startDate
                          ? formatDate(project.startDate)
                          : "غير محدد"}
                      </dd>
                    </div>
                    <div className={infoCardClassName}>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        الميزانية
                      </dt>
                      <dd className="mt-1 font-semibold text-foreground">
                        {totalBudget > 0
                          ? formatPrice(totalBudget)
                          : "بدون ميزانية"}
                      </dd>
                    </div>
                    <div className={infoCardClassName}>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        المتبقي
                      </dt>
                      <dd className="mt-1 font-semibold text-foreground">
                        {totalBudget > 0
                          ? formatPrice(remainingBudget)
                          : "غير محسوب"}
                      </dd>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-border/60 bg-background/65 p-4">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>التقدم الحالي</span>
                      <span className="font-semibold text-foreground">
                        {progress}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-[width]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1">
                        المنفق {formatPrice(spentBudget)}
                      </span>
                      <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1">
                        المتبقي {formatPrice(remainingBudget)}
                      </span>
                      <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1">
                        الإنتهاء{" "}
                        {project.endDate
                          ? formatDate(project.endDate)
                          : "غير محدد"}
                      </span>
                    </div>
                  </div>

                  {project.tags?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag, index) => (
                        <span
                          key={`${project.id}-${index}`}
                          className="rounded-full border border-border/60 bg-background/75 px-3 py-1 text-xs font-medium text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {projects.length > 0 ? (
        <div className="fixed inset-x-3 bottom-3 z-30 md:hidden">
          <div className="business-page-panel rounded-[24px] border border-border/70 bg-card/95 px-3 py-3 shadow-[0_18px_42px_-28px_rgba(15,27,45,0.45)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  وصول سريع للمشاريع
                </p>
                <p className="text-xs text-muted-foreground">
                  أضف مشروعًا جديدًا من نفس الشاشة.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={() => setShowCreateProjectModal(true)}
              >
                إضافة
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
