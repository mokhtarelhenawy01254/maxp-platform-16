import React from "react";
import {
  ArrowPathIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import RecurringTaskForm from "../../../components/tasks/RecurringTaskForm";
import type {
  GoalOption,
  Project,
  RecurringTaskConfig,
  TaskCategory,
  TaskDraft,
  TaskTemplate,
  TaskUser,
} from "../types";
import {
  TaskModalField,
  TaskModalSection,
  TaskModalShell,
} from "./TaskModalShell";
import {
  taskModalControlClassName,
  taskModalInlineCardClassName,
  taskModalTextareaClassName,
} from "./TaskModalTokens";

export interface CreateTaskModalProps {
  showCreateTaskModal: boolean;
  setShowCreateTaskModal: (show: boolean) => void;
  newTask: TaskDraft;
  setNewTask: (task: TaskDraft) => void;
  createTask: () => void;
  showTemplateSelector: boolean;
  setShowTemplateSelector: (show: boolean) => void;
  templates: TaskTemplate[];
  applyTemplate: (template: TaskTemplate) => void;
  projects: Project[];
  goals: GoalOption[];
  categories: TaskCategory[];
  users: TaskUser[];
  recurringConfig: RecurringTaskConfig;
  setRecurringConfig: (config: RecurringTaskConfig) => void;
}

const getUserLabel = (user: TaskUser) =>
  user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim();

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  showCreateTaskModal,
  setShowCreateTaskModal,
  newTask,
  setNewTask,
  createTask,
  showTemplateSelector,
  setShowTemplateSelector,
  templates,
  applyTemplate,
  projects,
  goals,
  categories,
  users,
  recurringConfig,
  setRecurringConfig,
}) => {
  if (!showCreateTaskModal) return null;

  const hasTemplates = templates.length > 0;
  const availableGoals = goals.filter(
    (goal) =>
      !newTask.projectId ||
      (!goal.projectId && !goal.project?.id) ||
      goal.projectId === newTask.projectId ||
      goal.project?.id === newTask.projectId,
  );

  return (
    <TaskModalShell
      open={showCreateTaskModal}
      onClose={() => setShowCreateTaskModal(false)}
      title="مهمة جديدة"
      description="ابدأ بالمهمة نفسها أولًا، ثم اربطها بالمشروع والقسم والمسؤول والمواعيد من نفس السطح."
      size="xl"
      badge={
        <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
          Tasks Workspace
        </span>
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            ستُنشأ المهمة داخل نطاق العمل الحالي مع الحفاظ على المشروع والثيم
            النشطين.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setShowCreateTaskModal(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              data-testid="tasks-create-submit"
              onClick={createTask}
            >
              إنشاء المهمة
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <TaskModalSection
          title="كيف تريد البدء؟"
          description="يمكنك إدخال المهمة يدويًا، أو فتح القوالب الجاهزة لتسريع الإعداد عندما تكون لديك نماذج متكررة."
          actions={
            <Button
              type="button"
              variant={showTemplateSelector ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
            >
              <DocumentDuplicateIcon className="size-4" />
              القوالب
            </Button>
          }
        >
          {!showTemplateSelector ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full bg-background px-3 py-1.5 ring-1 ring-border/60">
                إنشاء يدوي
              </span>
              <span>
                {hasTemplates
                  ? "يمكنك أيضًا تعبئة النموذج من قالب جاهز متى احتجت."
                  : "لا توجد قوالب محفوظة حاليًا، لذلك سيبدأ النموذج من الصفر."}
              </span>
            </div>
          ) : hasTemplates ? (
            <div className="grid gap-3 md:grid-cols-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="rounded-[22px] border border-border/60 bg-background/60 p-4 text-right transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {template.name}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {template.description || "قالب سريع لتسريع بناء المهمة."}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-border/70 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
              لا توجد قوالب متاحة الآن. يمكنك إكمال النموذج يدويًا ثم حفظ قالب
              لاحقًا من صفحة القوالب.
            </div>
          )}
        </TaskModalSection>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <TaskModalSection
            title="البيانات الأساسية"
            description="اجعل العنوان واضحًا، ثم اكتب الوصف بشكل يساعد المنفذ على البدء دون أسئلة إضافية."
            className="space-y-4"
          >
            <TaskModalField label="عنوان المهمة" required>
              <Input
                data-testid="task-title-input"
                type="text"
                value={newTask.title}
                onChange={(event) =>
                  setNewTask({ ...newTask, title: event.target.value })
                }
                className={taskModalControlClassName}
                placeholder="مثال: متابعة العميل بخصوص المستندات الناقصة"
              />
            </TaskModalField>

            <TaskModalField
              label="وصف المهمة (للمنفّذ البشري)"
              hint="وصف المهمة والتعليمات الموجهة للشخص الذي سينفّذها."
              required
            >
              <Textarea
                data-testid="task-description-input"
                value={newTask.description}
                onChange={(event) =>
                  setNewTask({ ...newTask, description: event.target.value })
                }
                className={taskModalTextareaClassName}
                placeholder="اكتب ملخصًا عمليًا لما يجب تنفيذه، وما المتوقع تسليمه أو متابعته."
              />
            </TaskModalField>

            <TaskModalField
              label="وصف الذكاء الاصطناعي (AI Brief)"
              hint="تعليمات وسياق موجه للوكلاء والنماذج الذكية (البرومبت، المدخلات، المخرجات، القيود)."
            >
              <Textarea
                data-testid="task-ai-description-input"
                value={newTask.aiDescription || ""}
                onChange={(event) =>
                  setNewTask({ ...newTask, aiDescription: event.target.value })
                }
                className={taskModalTextareaClassName}
                placeholder="اكتب البرومبت أو السياق الفني للوكيل الذكي (المدخلات والمخرجات المطلوبة)..."
                rows={3}
              />
            </TaskModalField>

            <TaskModalField
              label="معايير القبول (Acceptance Criteria)"
              hint="اكتب كل معيار في سطر منفصل؛ ستُلزم المنفذ بها عند التسليم."
            >
              <Textarea
                data-testid="task-acceptance-criteria-input"
                value={newTask.acceptanceCriteria || ""}
                onChange={(event) =>
                  setNewTask({ ...newTask, acceptanceCriteria: event.target.value })
                }
                className={taskModalTextareaClassName}
                placeholder={"مثال:\n- اكتمال إعداد التقرير بنسبة 100%\n- إرفاق لقطة شاشة لإثبات التشغيل"}
                rows={3}
              />
            </TaskModalField>

            <TaskModalField
              label="الساعات المقدرة"
              hint="اتركها 0 إذا كانت المهمة سريعة أو لا تحتاج تقديرًا زمنيًا."
            >
              <Input
                type="number"
                min="0"
                value={newTask.estimatedHours}
                onChange={(event) =>
                  setNewTask({
                    ...newTask,
                    estimatedHours: parseInt(event.target.value, 10) || 0,
                  })
                }
                className={taskModalControlClassName}
              />
            </TaskModalField>

            <div className="grid gap-4 md:grid-cols-3">
              <TaskModalField label="أسلوب القياس">
                <select
                  data-testid="task-measurement-type"
                  value={newTask.measurementType}
                  onChange={(event) =>
                    setNewTask({
                      ...newTask,
                      measurementType: event.target.value as
                        | "TIME"
                        | "COUNT"
                        | "VALUE",
                      metricTargetValue:
                        event.target.value === "TIME"
                          ? null
                          : newTask.metricTargetValue,
                    })
                  }
                  className={`${taskModalControlClassName} appearance-none`}
                >
                  <option value="TIME">زمني</option>
                  <option value="COUNT">عددي</option>
                  <option value="VALUE">قيمة</option>
                </select>
              </TaskModalField>

              <TaskModalField label="الوحدة">
                <Input
                  data-testid="task-metric-unit-input"
                  type="text"
                  value={newTask.metricUnit}
                  onChange={(event) =>
                    setNewTask({ ...newTask, metricUnit: event.target.value })
                  }
                  className={taskModalControlClassName}
                  placeholder={
                    newTask.measurementType === "COUNT" ? "طلب / مكالمة" : "جنيه / نقطة"
                  }
                />
              </TaskModalField>

              <TaskModalField label="المستهدف العددي">
                <Input
                  data-testid="task-metric-target-input"
                  type="number"
                  min="0"
                  value={newTask.metricTargetValue ?? ""}
                  onChange={(event) =>
                    setNewTask({
                      ...newTask,
                      metricTargetValue:
                        event.target.value === ""
                          ? null
                          : Number.parseFloat(event.target.value) || 0,
                    })
                  }
                  className={taskModalControlClassName}
                  disabled={newTask.measurementType === "TIME"}
                />
              </TaskModalField>
            </div>
          </TaskModalSection>

          <div className="space-y-4">
            <TaskModalSection
              title="النطاق والتنفيذ"
              description="حدد المسؤول والأولوية والمواعيد حتى تظهر المهمة بشكل صحيح داخل السير اليومي."
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TaskModalField label="المشروع">
                  <select
                    data-testid="task-project-select"
                    value={newTask.projectId}
                    onChange={(event) =>
                      setNewTask({
                        ...newTask,
                        projectId: event.target.value,
                        goalId: "",
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
                    data-testid="task-goal-select"
                    value={newTask.goalId}
                    onChange={(event) =>
                      setNewTask({ ...newTask, goalId: event.target.value })
                    }
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
                    value={newTask.categoryId}
                    onChange={(event) =>
                      setNewTask({ ...newTask, categoryId: event.target.value })
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

                <TaskModalField label="الأولوية">
                  <select
                    value={newTask.priority}
                    onChange={(event) =>
                      setNewTask({
                        ...newTask,
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

                <TaskModalField label="المسؤول">
                  <select
                    value={newTask.assignedTo}
                    onChange={(event) => {
                      const selectedUser = users.find(
                        (user) => user.id === event.target.value,
                      );
                      setNewTask({
                        ...newTask,
                        assignedTo: event.target.value,
                        assignedToName: selectedUser
                          ? getUserLabel(selectedUser)
                          : "",
                      });
                    }}
                    className={`${taskModalControlClassName} appearance-none`}
                  >
                    <option value="">اختر مستخدمًا</option>
                    {users.length > 0 ? (
                      users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {getUserLabel(user)}
                        </option>
                      ))
                    ) : (
                      <option value="">لا يوجد مستخدمون</option>
                    )}
                  </select>
                </TaskModalField>

                <TaskModalField label="تاريخ البدء">
                  <Input
                    type="date"
                    value={newTask.startDate}
                    onChange={(event) =>
                      setNewTask({ ...newTask, startDate: event.target.value })
                    }
                    className={taskModalControlClassName}
                  />
                </TaskModalField>

                <TaskModalField label="تاريخ الاستحقاق">
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(event) =>
                      setNewTask({ ...newTask, dueDate: event.target.value })
                    }
                    className={taskModalControlClassName}
                  />
                </TaskModalField>
              </div>
            </TaskModalSection>

            <TaskModalSection
              title="التكرار"
              description="فعّل التكرار فقط عندما تمثل المهمة إجراءً دوريًا ثابتًا داخل التشغيل اليومي أو الأسبوعي."
              className="space-y-4"
            >
              <div
                className={`${taskModalInlineCardClassName} flex items-center justify-between gap-3`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ArrowPathIcon className="size-4 text-primary" />
                    مهمة متكررة
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    عندما يكون هذا النوع من المهام يتكرر تلقائيًا، فعّل
                    الإعدادات التالية وحدد الجدول المناسب.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setRecurringConfig({
                      ...recurringConfig,
                      enabled: !recurringConfig.enabled,
                    })
                  }
                  aria-label={
                    recurringConfig.enabled ? "إيقاف التكرار" : "تفعيل التكرار"
                  }
                  aria-pressed={recurringConfig.enabled}
                  className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                    recurringConfig.enabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      recurringConfig.enabled ? "right-1" : "right-6"
                    }`}
                  />
                </button>
              </div>

              {recurringConfig.enabled ? (
                <div className={`${taskModalInlineCardClassName} p-3 sm:p-4`}>
                  <RecurringTaskForm
                    value={recurringConfig}
                    onChange={setRecurringConfig}
                  />
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-border/70 bg-background/30 px-4 py-4 text-sm leading-6 text-muted-foreground">
                  ستُنشأ المهمة كمهمة لمرة واحدة. فعّل التكرار فقط إذا كان لديك
                  سير عمل دوري ثابت.
                </div>
              )}
            </TaskModalSection>
          </div>
        </div>
      </div>
    </TaskModalShell>
  );
};
