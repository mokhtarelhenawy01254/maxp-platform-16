import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { CategoryModal } from "../components/CategoryModal";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreateTaskModal } from "../components/CreateTaskModal";
import type {
  CategoryDraft,
  GoalOption,
  ProjectDraft,
  RecurringTaskConfig,
  TaskCategory,
  TaskDraft,
  TaskTemplate,
  TaskUser,
} from "../types";

jest.mock("../../../components/ui/dialog", () => {
  return {
    __esModule: true,
    Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
      open ? <div data-testid="dialog-root">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DialogDescription: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DialogHeader: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DialogTitle: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

jest.mock("../../../components/tasks/RecurringTaskForm", () => ({
  __esModule: true,
  default: () => <div data-testid="recurring-task-form">Recurring Form</div>,
}));

const taskUsers: TaskUser[] = [
  {
    id: "user-1",
    firstName: "مختار",
    lastName: "الهنواي",
    name: "مختار الهنواي",
  },
];

const taskCategories: TaskCategory[] = [
  {
    id: "category-1",
    name: "التشغيل",
    description: "قسم متابعة التنفيذ اليومي",
    color: "#2f6bff",
    icon: null,
    taskCount: 3,
    isActive: true,
  },
];

const projectOptions = [
  {
    id: "project-1",
    name: "إطلاق المنصة",
    description: "متابعة النسخة الجديدة",
    status: "active" as const,
    priority: "high" as const,
    startDate: "2026-04-20",
    endDate: "2026-05-20",
    budget: 50000,
    spentBudget: 12000,
    progress: 45,
    managerId: "user-1",
    managerName: "مختار الهنواي",
    teamMembers: [],
    tags: [],
    createdAt: "2026-04-20",
  },
];

const goalOptions: GoalOption[] = [
  {
    id: "goal-1",
    title: "رفع جودة المتابعة اليومية",
    goalType: "PROJECT",
    project: {
      id: "project-1",
      name: "إطلاق المنصة",
    },
  },
];

const initialTaskDraft: TaskDraft = {
  projectId: "",
  categoryId: "",
  goalId: "",
  title: "",
  description: "",
  priority: "medium",
  type: "manual",
  assignedTo: "",
  assignedToName: "",
  createdBy: "",
  createdByName: "",
  startDate: "",
  dueDate: "",
  estimatedHours: 0,
  measurementType: "TIME",
  metricUnit: "",
  metricTargetValue: null,
  metricCurrentValue: 0,
  tags: [],
};

const initialRecurringConfig: RecurringTaskConfig = {
  enabled: false,
  frequency: "weekly",
  interval: 1,
  daysOfWeek: [],
  dayOfMonth: 1,
  endType: "never",
  endDate: "",
  endCount: 1,
};

const initialProjectDraft: ProjectDraft = {
  name: "",
  description: "",
  priority: "medium",
  startDate: "",
  endDate: "",
  budget: 0,
  managerId: "",
  teamMembers: [],
  tags: [],
};

const initialCategoryDraft: CategoryDraft = {
  name: "",
  description: "",
  color: "#2f6bff",
};

const TaskModalHarness = ({ onCreate }: { onCreate: jest.Mock }) => {
  const [task, setTask] = useState<TaskDraft>(initialTaskDraft);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [recurringConfig, setRecurringConfig] = useState<RecurringTaskConfig>(
    initialRecurringConfig,
  );

  return (
    <CreateTaskModal
      showCreateTaskModal
      setShowCreateTaskModal={jest.fn()}
      newTask={task}
      setNewTask={setTask}
      createTask={onCreate}
      showTemplateSelector={showTemplateSelector}
      setShowTemplateSelector={setShowTemplateSelector}
      templates={[] as TaskTemplate[]}
      applyTemplate={jest.fn()}
      projects={projectOptions}
      goals={goalOptions}
      categories={taskCategories}
      users={taskUsers}
      recurringConfig={recurringConfig}
      setRecurringConfig={setRecurringConfig}
    />
  );
};

const ProjectModalHarness = ({ onCreate }: { onCreate: jest.Mock }) => {
  const [project, setProject] = useState<ProjectDraft>(initialProjectDraft);

  return (
    <CreateProjectModal
      show
      onClose={jest.fn()}
      newProject={project}
      setNewProject={setProject}
      createProject={onCreate}
      users={taskUsers}
    />
  );
};

const CategoryModalHarness = ({ onCreate }: { onCreate: jest.Mock }) => {
  const [category, setCategory] = useState<CategoryDraft>(initialCategoryDraft);

  return (
    <CategoryModal
      show
      onClose={jest.fn()}
      newCategory={category}
      setNewCategory={setCategory}
      createCategory={onCreate}
    />
  );
};

describe("Task workspace create flows", () => {
  it("allows filling and submitting a new task", () => {
    const onCreate = jest.fn();

    render(<TaskModalHarness onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/عنوان المهمة/i), {
      target: { value: "متابعة العميل الجديد" },
    });
    fireEvent.change(screen.getByLabelText(/^الوصف/i), {
      target: { value: "التأكد من اكتمال البيانات وربط المهمة بالمشروع." },
    });
    fireEvent.change(screen.getByLabelText(/المشروع/i), {
      target: { value: "project-1" },
    });
    fireEvent.change(screen.getByLabelText(/القسم/i), {
      target: { value: "category-1" },
    });
    fireEvent.change(screen.getByLabelText(/المسؤول/i), {
      target: { value: "user-1" },
    });
    fireEvent.change(screen.getByLabelText(/تاريخ الاستحقاق/i), {
      target: { value: "2026-05-01" },
    });

    expect(
      (screen.getByLabelText(/عنوان المهمة/i) as HTMLInputElement).value,
    ).toBe("متابعة العميل الجديد");
    expect((screen.getByLabelText(/المشروع/i) as HTMLSelectElement).value).toBe(
      "project-1",
    );

    fireEvent.click(screen.getByRole("button", { name: /إنشاء المهمة/i }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("shows recurring controls when recurring mode is enabled", () => {
    render(<TaskModalHarness onCreate={jest.fn()} />);

    expect(screen.queryByTestId("recurring-task-form")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /تفعيل التكرار/i }));

    expect(screen.getByTestId("recurring-task-form")).toBeInTheDocument();
  });

  it("allows filling and submitting a new project", () => {
    const onCreate = jest.fn();

    render(<ProjectModalHarness onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/اسم المشروع/i), {
      target: { value: "مشروع التشغيل الجديد" },
    });
    fireEvent.change(screen.getByLabelText(/^الوصف/i), {
      target: { value: "تنظيم المهام والمراحل الخاصة بالفريق." },
    });
    fireEvent.change(screen.getByLabelText(/الميزانية/i), {
      target: { value: "25000" },
    });
    fireEvent.change(screen.getByLabelText(/مدير المشروع/i), {
      target: { value: "user-1" },
    });

    expect(
      (screen.getByLabelText(/اسم المشروع/i) as HTMLInputElement).value,
    ).toBe("مشروع التشغيل الجديد");
    expect(
      (screen.getByLabelText(/مدير المشروع/i) as HTMLSelectElement).value,
    ).toBe("user-1");

    fireEvent.click(screen.getByRole("button", { name: /إنشاء المشروع/i }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("allows filling and submitting a new category", () => {
    const onCreate = jest.fn();

    render(<CategoryModalHarness onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/اسم القسم/i), {
      target: { value: "الدعم" },
    });
    fireEvent.change(screen.getByLabelText(/الوصف/i), {
      target: { value: "قسم متابعة طلبات العملاء اليومية." },
    });

    expect(
      (screen.getByLabelText(/اسم القسم/i) as HTMLInputElement).value,
    ).toBe("الدعم");

    fireEvent.click(screen.getByRole("button", { name: /إنشاء القسم/i }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
