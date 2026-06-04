import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { TaskTable } from "../components/TaskTable";
import type { Task } from "../types";

const buildTask = (status: Task["status"]): Task => ({
  id: "task-1",
  projectId: "project-1",
  projectName: "إطلاق المنصة",
  categoryId: "category-1",
  categoryName: "التشغيل",
  goalId: null,
  goalTitle: null,
  goalType: null,
  title: "متابعة العميل",
  description: "تحديث الحالة من شاشة الموظف.",
  status,
  priority: "medium",
  type: "manual",
  assignedTo: "employee-1",
  assignedToName: "موظف التجربة",
  createdBy: "manager-1",
  createdByName: "مدير التجربة",
  dueDate: "2026-05-01",
  startDate: "2026-04-28",
  estimatedHours: 2,
  actualHours: 0,
  progress: status === "completed" ? 100 : status === "in_progress" ? 60 : 0,
  measurementType: "TIME",
  metricUnit: null,
  metricTargetValue: null,
  metricCurrentValue: 0,
  tags: [],
  dependencies: [],
  createdAt: "2026-04-28T08:00:00.000Z",
  updatedAt: "2026-04-28T08:00:00.000Z",
});

const renderTaskTable = (
  task: Task,
  updateTaskStatus: jest.Mock = jest.fn(),
) => {
  render(
    <MemoryRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <TaskTable
        paginatedTasks={[task]}
        filteredAndSortedTasks={[task]}
        searchQuery=""
        selectedTasks={[]}
        handleSelectTask={jest.fn()}
        handleSelectAll={jest.fn()}
        isOverdue={jest.fn(() => false)}
        getStatusColor={jest.fn(() => "")}
        getStatusText={jest.fn((statusValue: Task["status"]) => statusValue)}
        getStatusIcon={jest.fn(() => null)}
        getPriorityColor={jest.fn(() => "")}
        getPriorityText={jest.fn((priorityValue: Task["priority"]) => priorityValue)}
        formatDate={jest.fn((value: string) => value)}
        updateTaskStatus={updateTaskStatus}
        deleteTask={jest.fn()}
        setSelectedTask={jest.fn()}
        setShowTaskModal={jest.fn()}
        setEditingTask={jest.fn()}
        setShowEditTaskModal={jest.fn()}
        currentPage={1}
        setCurrentPage={jest.fn()}
        totalPages={1}
        serverTotalTasks={1}
      />
    </MemoryRouter>,
  );

  return updateTaskStatus;
};

describe("TaskTable employee status actions", () => {
  it("starts a pending task from the employee surface", () => {
    const updateTaskStatus = renderTaskTable(buildTask("pending"));

    fireEvent.click(screen.getByRole("button", { name: /بدء التنفيذ/i }));

    expect(updateTaskStatus).toHaveBeenCalledWith("task-1", "in_progress");
  });

  it("completes an in-progress task from the employee surface", () => {
    const updateTaskStatus = renderTaskTable(buildTask("in_progress"));

    fireEvent.click(screen.getAllByRole("button", { name: /^إكمال$/i })[0]);

    expect(updateTaskStatus).toHaveBeenCalledWith("task-1", "completed");
  });

  it("supports uppercase API task statuses in status action buttons", () => {
    const pendingUpdateTaskStatus = renderTaskTable({
      ...buildTask("pending"),
      status: "PENDING" as Task["status"],
    });
    const startButton = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes("\u0628\u062f\u0621"));

    expect(startButton).toBeDefined();
    fireEvent.click(startButton as HTMLElement);
    expect(pendingUpdateTaskStatus).toHaveBeenCalledWith(
      "task-1",
      "in_progress",
    );

    cleanup();

    const inProgressUpdateTaskStatus = renderTaskTable({
      ...buildTask("in_progress"),
      status: "IN_PROGRESS" as Task["status"],
    });
    const completeButton = screen
      .getAllByRole("button")
      .find((button) =>
        button.textContent?.includes("\u0625\u0643\u0645\u0627\u0644"),
      );

    expect(completeButton).toBeDefined();
    fireEvent.click(completeButton as HTMLElement);
    expect(inProgressUpdateTaskStatus).toHaveBeenCalledWith(
      "task-1",
      "completed",
    );
  });
});
