import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { TaskSettingsTab } from "../components/TaskSettingsTab";
import { DEFAULT_TASK_WORKSPACE_SETTINGS } from "../taskWorkspaceSettings";

describe("Task settings tab", () => {
  it("allows a manager to change and save workspace preferences", () => {
    const onSave = jest.fn();

    render(
      <TaskSettingsTab
        role="OWNER"
        settings={DEFAULT_TASK_WORKSPACE_SETTINGS}
        onSave={onSave}
        onReset={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/النطاق الافتراضي/i), {
      target: { value: "my-tasks" },
    });
    fireEvent.change(screen.getByLabelText(/عدد العناصر في الصفحة/i), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByLabelText(/إظهار شريط الأوامر في الجوال/i));

    fireEvent.click(screen.getByRole("button", { name: /حفظ/i }));

    expect(
      screen.queryByText(/سيناريوهات QA الجاهزة/i),
    ).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultScope: "my-tasks",
        pageSize: 25,
        showMobileCommandBar: false,
      }),
    );
  });

  it("shows the employee-focused surface without manager-only toggles", () => {
    render(
      <TaskSettingsTab
        role="EMPLOYEE"
        settings={DEFAULT_TASK_WORKSPACE_SETTINGS}
        onSave={jest.fn()}
        onReset={jest.fn()}
      />,
    );

    expect(
      screen.queryByLabelText(/إبراز المهام المتأخرة/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/معاينة التفضيلات/i)).not.toBeInTheDocument();
  });
});
