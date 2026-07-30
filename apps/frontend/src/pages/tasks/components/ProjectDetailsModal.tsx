import { formatDate } from '@/utils/formatters';
import React from "react";

import { Button } from "../../../components/ui/button";
import type { Project } from "../types";
import {
  TaskModalMetric,
  TaskModalSection,
  TaskModalShell,
} from "./TaskModalShell";

export interface ProjectDetailsModalProps {
  show: boolean;
  onClose: () => void;
  project: Project | null;
  getPriorityColor: (priority: string) => string;
  getPriorityText: (priority: string) => string;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
  deleteProject: (id: string) => Promise<void>;
  setEditingProject: (project: Project | null) => void;
  setShowEditProjectModal: (show: boolean) => void;
}

const projectStatusStyles: Record<string, string> = {
  active:
    "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  completed:
    "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-foreground",
  planning:
    "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  on_hold:
    "bg-muted text-muted-foreground dark:bg-muted/70 dark:text-slate-300",
};

const projectStatusLabels: Record<string, string> = {
  active: "نشط",
  completed: "مكتمل",
  planning: "تخطيط",
  on_hold: "متوقف",
};

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  show,
  onClose,
  project,
  getPriorityColor,
  getPriorityText,
  formatPrice,
  formatDate,
  deleteProject,
  setEditingProject,
  setShowEditProjectModal,
}) => {
  if (!show || !project) return null;

  return (
    <TaskModalShell
      open={show}
      onClose={onClose}
      title={project.name}
      description={project.description || "لا يوجد وصف إضافي لهذا المشروع."}
      size="lg"
      badge={
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              projectStatusStyles[project.status] || projectStatusStyles.on_hold
            }`}
          >
            {projectStatusLabels[project.status] || "متوقف"}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getPriorityColor(project.priority)}`}
          >
            {getPriorityText(project.priority)}
          </span>
        </div>
      }
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            className="rounded-xl"
            onClick={() => void deleteProject(project.id)}
          >
            حذف المشروع
          </Button>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onClose}
            >
              إغلاق
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => {
                setEditingProject(project);
                onClose();
                setShowEditProjectModal(true);
              }}
            >
              تعديل
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <TaskModalSection
          title="ملخص المشروع"
          description="الحالة والأولوية والميزانية والتواريخ كلها في مكان واحد لتسهيل القرار والمتابعة."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <TaskModalMetric
              label="الحالة"
              value={
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    projectStatusStyles[project.status] ||
                    projectStatusStyles.on_hold
                  }`}
                >
                  {projectStatusLabels[project.status] || "متوقف"}
                </span>
              }
            />
            <TaskModalMetric
              label="الأولوية"
              value={
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPriorityColor(project.priority)}`}
                >
                  {getPriorityText(project.priority)}
                </span>
              }
            />
            <TaskModalMetric
              label="مدير المشروع"
              value={project.managerName || "غير محدد"}
            />
            <TaskModalMetric
              label="الميزانية"
              value={formatPrice(project.budget || 0)}
            />
            <TaskModalMetric
              label="المنفق"
              value={formatPrice(project.spentBudget || 0)}
            />
            <TaskModalMetric
              label="التقدم"
              value={
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">
                    {project.progress || 0}%
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                </div>
              }
            />
            <TaskModalMetric
              label="تاريخ البدء"
              value={
                project.startDate ? formatDate(project.startDate) : "غير محدد"
              }
            />
            <TaskModalMetric
              label="تاريخ الانتهاء"
              value={project.endDate ? formatDate(project.endDate) : "غير محدد"}
            />
          </div>
        </TaskModalSection>

        {Array.isArray(project.tags) && project.tags.length > 0 ? (
          <TaskModalSection
            title="الوسوم"
            description="وسوم إضافية لتمييز المشروع أو ربطه بحملة أو مبادرة أو فريق."
          >
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag: string, index: number) => (
                <span
                  key={`${project.id}-${index}`}
                  className="rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </TaskModalSection>
        ) : null}
      </div>
    </TaskModalShell>
  );
};
