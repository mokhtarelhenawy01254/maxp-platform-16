import React from "react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { ProjectDraft, TaskUser } from "../types";
import {
  TaskModalField,
  TaskModalSection,
  TaskModalShell,
} from "./TaskModalShell";
import {
  taskModalControlClassName,
  taskModalTextareaClassName,
} from "./TaskModalTokens";

export interface CreateProjectModalProps {
  show: boolean;
  onClose: () => void;
  newProject: ProjectDraft;
  setNewProject: (project: ProjectDraft) => void;
  createProject: () => void;
  users: TaskUser[];
}

const getManagerLabel = (user: TaskUser) =>
  user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim();

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  show,
  onClose,
  newProject,
  setNewProject,
  createProject,
  users,
}) => {
  if (!show) return null;

  return (
    <TaskModalShell
      open={show}
      onClose={onClose}
      title="مشروع جديد"
      description="عرّف المشروع بشكل مختصر، ثم حدد المسؤول والزمن والميزانية حتى يتحول إلى نطاق واضح يمكن ربط المهام به."
      size="lg"
      badge={
        <span className="rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          Projects
        </span>
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            بعد الإنشاء سيظهر المشروع مباشرة داخل التبويب ويمكن ربط المهام به.
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
              onClick={createProject}
            >
              إنشاء المشروع
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <TaskModalSection
          title="المحتوى"
          description="اكتب اسمًا يمكن فهمه بسرعة، ثم أضف وصفًا يوضح النطاق وما الذي يشمله المشروع."
          className="space-y-4"
        >
          <TaskModalField label="اسم المشروع" required>
            <Input
              type="text"
              value={newProject.name}
              onChange={(event) =>
                setNewProject({ ...newProject, name: event.target.value })
              }
              className={taskModalControlClassName}
              placeholder="مثال: إطلاق الحملة الصيفية"
            />
          </TaskModalField>

          <TaskModalField label="الوصف" required>
            <Textarea
              value={newProject.description}
              onChange={(event) =>
                setNewProject({
                  ...newProject,
                  description: event.target.value,
                })
              }
              className={taskModalTextareaClassName}
              placeholder="ملخص سريع لما يجب إنجازه داخل هذا المشروع ومن يشارك فيه."
            />
          </TaskModalField>
        </TaskModalSection>

        <TaskModalSection
          title="الإدارة والزمن"
          description="هذه الحقول هي التي تضبط التخطيط والميزانية ومؤشرات المتابعة في التبويب."
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TaskModalField label="الأولوية">
              <select
                value={newProject.priority}
                onChange={(event) =>
                  setNewProject({
                    ...newProject,
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
                value={newProject.budget}
                onChange={(event) =>
                  setNewProject({
                    ...newProject,
                    budget: parseFloat(event.target.value) || 0,
                  })
                }
                className={taskModalControlClassName}
              />
            </TaskModalField>

            <TaskModalField label="تاريخ البدء">
              <Input
                type="date"
                value={newProject.startDate}
                onChange={(event) =>
                  setNewProject({
                    ...newProject,
                    startDate: event.target.value,
                  })
                }
                className={taskModalControlClassName}
              />
            </TaskModalField>

            <TaskModalField label="تاريخ الانتهاء">
              <Input
                type="date"
                value={newProject.endDate}
                onChange={(event) =>
                  setNewProject({ ...newProject, endDate: event.target.value })
                }
                className={taskModalControlClassName}
              />
            </TaskModalField>

            <TaskModalField
              label="مدير المشروع"
              hint="يمكنك ترك الحقل فارغًا مؤقتًا إذا لم يُحسم المسؤول النهائي بعد."
              className="md:col-span-2"
            >
              <select
                value={newProject.managerId}
                onChange={(event) =>
                  setNewProject({
                    ...newProject,
                    managerId: event.target.value,
                  })
                }
                className={`${taskModalControlClassName} appearance-none`}
              >
                <option value="">اختر المدير</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {getManagerLabel(user)}
                  </option>
                ))}
              </select>
            </TaskModalField>
          </div>
        </TaskModalSection>
      </div>
    </TaskModalShell>
  );
};
