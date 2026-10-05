import React from "react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { GoalOption, Project, Task, TaskCategory, TaskUser } from "../types";
import {
  TaskModalField,
  TaskModalSection,
  TaskModalShell,
} from "./TaskModalShell";
import {
  taskModalControlClassName,
  taskModalTextareaClassName,
} from "./TaskModalTokens";

export interface EditTaskModalProps {
  show: boolean;
  onClose: () => void;
  task: Task | null;
  setEditingTask: (task: Task | null) => void;
  updateTask: () => void;
  projects: Project[];
  goals: GoalOption[];
  categories: TaskCategory[];
  users: TaskUser[];
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  show,
  onClose,
  task,
  setEditingTask,
  updateTask,
  projects,
  goals,
  categories,
  users,
}) => {
  if (!show || !task) return null;

  const availableGoals = goals.filter(
    (goal) =>
      !task.projectId ||
      (!goal.projectId && !goal.project?.id) ||
      goal.projectId === task.projectId ||
      goal.project?.id === task.projectId,
  );

  return (
    <TaskModalShell
      open={show}
      onClose={onClose}
      title="تعديل المهمة"
      description="حدّث تفاصيل المهمة بسرعة من نفس سطح العمل، مع الحفاظ على الحالة والتقدم والمواعيد في مكان واحد."
      size="lg"
      badge={
        <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
          Edit Task
        </span>
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            سيؤثر الحفظ على البطاقة والقائمة والتفاصيل الكاملة للمهمة مباشرة.
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
            <Button type="button" className="rounded-xl" onClick={updateTask}>
              حفظ التغييرات
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <TaskModalSection
          title="المحتوى"
          description="عدّل العنوان والوصف بحيث يظلان واضحين لمنفذ المهمة حتى بعد مرور الوقت."
          className="space-y-4"
        >
          <TaskModalField label="العنوان" required>
            <Input
              type="text"
              value={task.title}
              onChange={(event) =>
                setEditingTask({ ...task, title: event.target.value })
              }
              className={taskModalControlClassName}
            />
          </TaskModalField>

          <TaskModalField
            label="وصف المهمة (للمنفّذ البشري)"
            hint="وصف المهمة والتعليمات الموجهة للشخص الذي سينفّذها."
            required
          >
            <Textarea
              value={task.description}
              onChange={(event) =>
                setEditingTask({ ...task, description: event.target.value })
              }
              className={taskModalTextareaClassName}
            />
          </TaskModalField>

          <TaskModalField
            label="وصف الذكاء الاصطناعي (AI Brief)"
            hint="تعليمات وسياق موجه للوكلاء والنماذج الذكية (البرومبت، المدخلات، المخرجات، القيود)."
          >
            <Textarea
              value={task.aiDescription || ""}
              onChange={(event) =>
                setEditingTask({ ...task, aiDescription: event.target.value })
              }
              className={taskModalTextareaClassName}
              placeholder="اكتب البرومبت أو السياق الفني للوكيل الذكي..."
              rows={3}
            />
          </TaskModalField>

          <TaskModalField
            label="معايير القبول (Acceptance Criteria)"
            hint="اكتب كل معيار في سطر منفصل؛ سيتم فحصها عند طلب الاعتماد."
          >
            <Textarea
              value={task.acceptanceCriteria || ""}
              onChange={(event) =>
                setEditingTask({ ...task, acceptanceCriteria: event.target.value })
              }
              className={taskModalTextareaClassName}
              placeholder={"مثال:\n- إنجاز متطلبات المهمة\n- فحص النتيجة ورفع الإثبات"}
              rows={3}
            />
          </TaskModalField>
        </TaskModalSection>

        <div className="space-y-4">
          <TaskModalSection
            title="الحالة والتنفيذ"
            description="الحالة والأولوية والتقدم الزمني هي أهم ثلاث إشارات لفرز المهمة ومتابعتها."
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TaskModalField label="المشروع">
                <select
                  value={task.projectId || ""}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      projectId: event.target.value,
                      projectName:
                        projects.find((project) => project.id === event.target.value)
                          ?.name || task.projectName,
                      goalId: "",
                      goalTitle: null,
                      goalType: null,
                    })
                  }
                  className={`${taskModalControlClassName} appearance-none`}
                >
                  <option value="">بدون مشروع</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </TaskModalField>

              <TaskModalField label="الهدف المرتبط">
                <select
                  value={task.goalId || ""}
                  onChange={(event) => {
                    const nextGoal =
                      availableGoals.find((goal) => goal.id === event.target.value) || null;
                    setEditingTask({
                      ...task,
                      goalId: event.target.value || null,
                      goalTitle: nextGoal?.title || null,
                      goalType: nextGoal?.goalType || null,
                    });
                  }}
                  className={`${taskModalControlClassName} appearance-none`}
                >
                  <option value="">بدون هدف</option>
                  {availableGoals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </TaskModalField>

              <TaskModalField label="القسم">
                <select
                  value={task.categoryId || ""}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      categoryId: event.target.value || null,
                      categoryName:
                        categories.find((category) => category.id === event.target.value)
                          ?.name || null,
                    })
                  }
                  className={`${taskModalControlClassName} appearance-none`}
                >
                  <option value="">بدون قسم</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </TaskModalField>

              <TaskModalField label="المسؤول">
                <select
                  value={task.assignedTo || ""}
                  onChange={(event) => {
                    const nextUser = users.find((user) => user.id === event.target.value);
                    setEditingTask({
                      ...task,
                      assignedTo: event.target.value,
                      assignedToName:
                        nextUser?.name ||
                        `${nextUser?.firstName || ""} ${nextUser?.lastName || ""}`.trim() ||
                        task.assignedToName,
                    });
                  }}
                  className={`${taskModalControlClassName} appearance-none`}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim()}
                    </option>
                  ))}
                </select>
              </TaskModalField>

              <TaskModalField label="الحالة">
                <select
                  value={String(task.status || "").toLowerCase()}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      status: event.target.value as
                        | "pending"
                        | "in_progress"
                        | "completed"
                        | "cancelled",
                    })
                  }
                  className={`${taskModalControlClassName} appearance-none`}
                >
                  <option value="pending">في الانتظار</option>
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </TaskModalField>

              <TaskModalField label="الأولوية">
                <select
                  value={String(task.priority || "").toLowerCase()}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      priority: event.target.value as
                        | "low"
                        | "medium"
                        | "high"
                        | "urgent",
                    })
                  }
                  className={`${taskModalControlClassName} appearance-none`}
                >
                  <option value="low">منخفض</option>
                  <option value="medium">متوسط</option>
                  <option value="high">عالي</option>
                  <option value="urgent">عاجل</option>
                </select>
              </TaskModalField>

              <TaskModalField label="التقدم (%)">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={task.progress}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      progress: parseInt(event.target.value, 10) || 0,
                    })
                  }
                  className={taskModalControlClassName}
                />
              </TaskModalField>

              <TaskModalField label="الساعات المقدرة">
                <Input
                  type="number"
                  min="0"
                  value={task.estimatedHours}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      estimatedHours: parseInt(event.target.value, 10) || 0,
                    })
                  }
                  className={taskModalControlClassName}
                />
              </TaskModalField>

              <TaskModalField label="أسلوب القياس">
                <select
                  value={task.measurementType}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      measurementType: event.target.value as "TIME" | "COUNT" | "VALUE",
                      metricTargetValue:
                        event.target.value === "TIME" ? null : task.metricTargetValue,
                    })
                  }
                  className={`${taskModalControlClassName} appearance-none`}
                >
                  <option value="TIME">زمني</option>
                  <option value="COUNT">عددي</option>
                  <option value="VALUE">قيمة</option>
                </select>
              </TaskModalField>

              <TaskModalField label="وحدة القياس">
                <Input
                  type="text"
                  value={task.metricUnit || ""}
                  onChange={(event) =>
                    setEditingTask({ ...task, metricUnit: event.target.value })
                  }
                  className={taskModalControlClassName}
                />
              </TaskModalField>

              <TaskModalField label="المستهدف العددي">
                <Input
                  type="number"
                  min="0"
                  value={task.metricTargetValue ?? ""}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      metricTargetValue:
                        event.target.value === ""
                          ? null
                          : Number.parseFloat(event.target.value) || 0,
                    })
                  }
                  className={taskModalControlClassName}
                  disabled={task.measurementType === "TIME"}
                />
              </TaskModalField>

              <TaskModalField label="المنجز العددي">
                <Input
                  type="number"
                  min="0"
                  value={task.metricCurrentValue}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      metricCurrentValue: Number.parseFloat(event.target.value) || 0,
                    })
                  }
                  className={taskModalControlClassName}
                  disabled={task.measurementType === "TIME"}
                />
              </TaskModalField>

              <TaskModalField label="تاريخ البدء">
                <Input
                  type="date"
                  value={task.startDate ? task.startDate.split("T")[0] : ""}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      startDate: event.target.value,
                    })
                  }
                  className={taskModalControlClassName}
                />
              </TaskModalField>

              <TaskModalField label="تاريخ الاستحقاق">
                <Input
                  type="date"
                  value={task.dueDate ? task.dueDate.split("T")[0] : ""}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      dueDate: event.target.value,
                    })
                  }
                  className={taskModalControlClassName}
                />
              </TaskModalField>

              <TaskModalField label="الساعات الفعلية" className="md:col-span-2">
                <Input
                  type="number"
                  min="0"
                  value={task.actualHours}
                  onChange={(event) =>
                    setEditingTask({
                      ...task,
                      actualHours: parseInt(event.target.value, 10) || 0,
                    })
                  }
                  className={taskModalControlClassName}
                />
              </TaskModalField>
            </div>
          </TaskModalSection>
        </div>
      </div>
    </TaskModalShell>
  );
};
