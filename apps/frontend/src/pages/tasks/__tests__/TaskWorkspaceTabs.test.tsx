import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { TaskWorkspaceTabs } from "../components/TaskWorkspaceTabs";

describe("Task workspace tabs", () => {
  it("renders visible task workspace destinations and notifies on change", () => {
    const onTabChange = jest.fn();

    render(
      <TaskWorkspaceTabs
        activeTab="tasks"
        onTabChange={onTabChange}
        canManageIntegrations
        taskCount={12}
        projectCount={4}
        categoryCount={3}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /المشاريع/i }));
    fireEvent.click(screen.getByRole("button", { name: /أقسام المهام/i }));
    fireEvent.click(screen.getByRole("button", { name: /إعدادات المهام/i }));
    fireEvent.click(screen.getByRole("button", { name: /تكاملات المهام/i }));

    expect(onTabChange).toHaveBeenNthCalledWith(1, "projects");
    expect(onTabChange).toHaveBeenNthCalledWith(2, "categories");
    expect(onTabChange).toHaveBeenNthCalledWith(3, "settings");
    expect(onTabChange).toHaveBeenNthCalledWith(4, "integrations");
  });

  it("hides integrations when the user cannot manage them", () => {
    render(
      <TaskWorkspaceTabs
        activeTab="tasks"
        onTabChange={jest.fn()}
        canManageIntegrations={false}
        taskCount={5}
        projectCount={2}
        categoryCount={1}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /تكاملات المهام/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /إعدادات المهام/i }),
    ).toBeInTheDocument();
  });
});
