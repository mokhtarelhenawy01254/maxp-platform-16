import React from "react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { Project } from "../types";
import {
  TaskModalField,
  TaskModalSection,
  TaskModalShell,
} from "./TaskModalShell";
import {
  taskModalControlClassName,
  taskModalTextareaClassName,
} from "./TaskModalTokens";

export interface EditProjectModalProps {
  show: boolean;
  onClose: () => void;
  project: Project | null;
  setEditingProject: (project: Project | null) => void;
  updateProject: () => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  show,
  onClose,
  project,
  setEditingProject,
  updateProject,
}) => {
  if (!show || !project) return null;

  return (
    <TaskModalShell
      open={show}
      onClose={onClose}
      title="تعديل المشروع"
      description="عدّل حالة المشروع والميزانية والمواعيد من نفس النافذة حتى تبقى المتابعة مرتبطة بالنطاق الحقيقي للعمل."
      size="lg"
      badge={
        <span className="rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          Edit Project
        </span>
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            سيتحدث المشروع في القائمة والتفاصيل فور حفظ التغييرات.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onClose}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={updateProject}
            >
              حفظ التغييرات
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <TaskModalSection
          title="المحتوى"
          description="حافظ على اسم المشروع ووصفه بصياغة واضحة حتى يظل قابلًا للفهم في جميع الشاشات."
          className="space-y-4"
        >
          <TaskModalField label="اسم المشروع" required>
            <Input
              type="text"
              value={project.name}
              onChange={(event) =>
                setEditingProject({ ...project, name: event.target.value })
              }
              className={taskModalControlClassName}
            />
          </TaskModalField>

          <TaskModalField label="الوصف" required>
            <Textarea
              value={project.description}
              onChange={(event) =>
                setEditingProject({
                  ...project,
                  description: event.target.value,
                })
              }
              className={taskModalTextareaClassName}
            />
          </TaskModalField>
        </TaskModalSection>

        <TaskModalSection
          title="الحالة والميزانية"
          description="هذه الحقول هي التي تتحكم في قراءة المشروع داخل التبويب والتقارير."
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TaskModalField label="الحالة">
              <select
                value={project.status}
                onChange={(event) =>
                  setEditingProject({
                    ...project,
                    status: event.target.value as
                      | "planning"
                      | "active"
                      | "completed"
                      | "on_hold",
                  })
                }
                className={`${taskModalControlClassName} appearance-none`}
              >
                <option value="planning">تخطيط</option>
                <option value="active">نشط</option>
                <option value="completed">مكتمل</option>
                <option value="on_hold">متوقف</option>
              </select>
            </TaskModalField>

            <TaskModalField label="الأولوية">
              <select
                value={project.priority}
                onChange={(event) =>
                  setEditingProject({
                    ...project,
                    priority: event.target.value as "low" | "medium" | "high",
                  })
                }
                className={`${taskModalControlClassName} appearance-none`}
              >
                <option value="low">منخفض</option>
                <option value="medium">متوسط</option>
                <option value="high">عالي</option>
              </select>
            </TaskModalField>

            <TaskModalField label="الميزانية">
              <Input
                type="number"
                min="0"
                value={project.budget}
                onChange={(event) =>
                  setEditingProject({
                    ...project,
                    budget: parseFloat(event.target.value) || 0,
                  })
                }
                className={taskModalControlClassName}
              />
            </TaskModalField>

            <TaskModalField label="المنفق">
              <Input
                type="number"
                min="0"
                value={project.spentBudget}
                onChange={(event) =>
                  setEditingProject({
                    ...project,
                    spentBudget: parseFloat(event.target.value) || 0,
                  })
                }
                className={taskModalControlClassName}
              />
            </TaskModalField>

            <TaskModalField label="تاريخ البدء">
              <Input
                type="date"
                value={project.startDate ? project.startDate.split("T")[0] : ""}
                onChange={(event) =>
                  setEditingProject({
                    ...project,
                    startDate: event.target.value,
                  })
                }
                className={taskModalControlClassName}
              />
            </TaskModalField>

            <TaskModalField label="تاريخ الانتهاء">
              <Input
                type="date"
                value={project.endDate ? project.endDate.split("T")[0] : ""}
                onChange={(event) =>
                  setEditingProject({
                    ...project,
                    endDate: event.target.value,
                  })
                }
                className={taskModalControlClassName}
              />
            </TaskModalField>

            <TaskModalField
              label="التقدم (%)"
              hint="التقدم يظهر مباشرة في بطاقات المشروع وداخل التفاصيل."
              className="md:col-span-2"
            >
              <Input
                type="number"
                min="0"
                max="100"
                value={project.progress}
                onChange={(event) =>
                  setEditingProject({
                    ...project,
                    progress: parseInt(event.target.value, 10) || 0,
                  })
                }
                className={taskModalControlClassName}
              />
            </TaskModalField>
          </div>
        </TaskModalSection>
      </div>
    </TaskModalShell>
  );
};
