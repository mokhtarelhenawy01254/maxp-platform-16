import React from "react";
import { BusinessSectionPanel } from "../../../components/business/BusinessSurface";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import {
  DepartmentOption,
  EmployeeOption,
  GOAL_TYPE_OPTIONS,
  GoalFormState,
  GoalPriority,
  GoalStatus,
  ParentGoalOption,
  PRIORITY_OPTIONS,
  ProjectOption,
  STATUS_OPTIONS,
} from "./types";
import { getEmployeeLabel } from "./helpers";
import { DateInput } from '../../../components/ui/DateInput';

interface GoalDefinitionSectionProps {
  form: GoalFormState;
  setField: <K extends keyof GoalFormState>(
    key: K,
    value: GoalFormState[K],
  ) => void;
  projects: ProjectOption[];
  departments: DepartmentOption[];
  employees: EmployeeOption[];
  availableParentGoals: ParentGoalOption[];
}

export const GoalDefinitionSection: React.FC<GoalDefinitionSectionProps> = ({
  form,
  setField,
  projects,
  departments,
  employees,
  availableParentGoals,
}) => {
  return (
    <BusinessSectionPanel
      title="تعريف الهدف"
      description="اختر نوع الهدف أولًا، ثم حدّد من يملكه وما الذي سنقيسه فعليًا."
      contentClassName="space-y-5"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {GOAL_TYPE_OPTIONS.map((option) => {
          const active = form.goalType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setField("goalType", option.value)}
              className={`rounded-3xl border px-4 py-4 text-right transition-colors ${
                active
                  ? "border-primary/40 bg-primary/8"
                  : "border-border/70 bg-background hover:border-primary/20"
              }`}
            >
              <div className="text-sm font-semibold">{option.label}</div>
              <div className="mt-1 text-xs leading-6 text-muted-foreground">
                {option.hint}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">عنوان الهدف</label>
          <Input
            data-testid="goal-title-input"
            value={form.title}
            onChange={(event) => setField("title", event.target.value)}
            placeholder="مثال: تحقيق 3000 أوردر خلال الشهر"
            className="rounded-2xl"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">الوحدة</label>
          <Input
            value={form.unit}
            onChange={(event) => setField("unit", event.target.value)}
            placeholder="طلب / عملية / عقد"
            className="rounded-2xl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">الوصف</label>
        <Textarea
          value={form.description}
          onChange={(event) => setField("description", event.target.value)}
          placeholder="صف النتيجة المطلوبة وكيف سنعرف أن الهدف تحقق"
          className="min-h-[120px] rounded-2xl"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">القيمة المستهدفة</label>
          <Input
            data-testid="goal-target-input"
            type="number"
            min="0"
            value={form.targetValue}
            onChange={(event) => setField("targetValue", event.target.value)}
            className="rounded-2xl font-mono tabular-nums"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">القيمة الحالية</label>
          <Input
            type="number"
            min="0"
            value={form.currentValue}
            onChange={(event) => setField("currentValue", event.target.value)}
            className="rounded-2xl font-mono tabular-nums"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">الحالة</label>
          <select
            value={form.status}
            onChange={(event) =>
              setField("status", event.target.value as GoalStatus)
            }
            className="h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">الأولوية</label>
          <select
            value={form.priority}
            onChange={(event) =>
              setField("priority", event.target.value as GoalPriority)
            }
            className="h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">تاريخ البداية</label>
          <DateInput
            data-testid="goal-start-date-input"
            
            value={form.startDate}
            onChange={(event) => setField("startDate", event.target.value)}
            className="rounded-2xl font-mono tabular-nums"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">تاريخ النهاية</label>
          <DateInput
            data-testid="goal-end-date-input"
            
            value={form.endDate}
            onChange={(event) => setField("endDate", event.target.value)}
            className="rounded-2xl font-mono tabular-nums"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">المشروع</label>
          <select
            data-testid="goal-project-select"
            value={form.projectId}
            onChange={(event) => setField("projectId", event.target.value)}
            className="h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
          >
            <option value="">بدون مشروع</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">الهدف الأب</label>
          <select
            value={form.parentGoalId}
            onChange={(event) =>
              setField("parentGoalId", event.target.value)
            }
            className="h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
          >
            <option value="">بدون هدف أب</option>
            {availableParentGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.goalType === "EMPLOYEE" ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <label className="text-sm font-medium">الموظف المسؤول</label>
            <select
              value={form.employeeId}
              onChange={(event) => setField("employeeId", event.target.value)}
              className="h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
            >
              <option value="">اختر الموظف</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {getEmployeeLabel(employee)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <div>
              <div className="text-sm font-medium">توليد أهداف يومية</div>
              <div className="text-xs text-muted-foreground">
                يوزع الهدف تلقائيًا على أيام العمل.
              </div>
            </div>
            <Switch
              data-testid="goal-auto-daily-switch"
              checked={form.autoGenerateDaily}
              onCheckedChange={(checked) =>
                setField("autoGenerateDaily", Boolean(checked))
              }
            />
          </div>
        </div>
      ) : null}

      {form.goalType === "DEPARTMENT" ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">القسم المسؤول</label>
          <select
            value={form.departmentId}
            onChange={(event) =>
              setField("departmentId", event.target.value)
            }
            className="h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
          >
            <option value="">اختر القسم</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </BusinessSectionPanel>
  );
};
