import React from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "../../../components/ui/button";
import type { useTasksPageController } from "./useTasksPageController";

interface TasksMobileCommandBarProps {
  controller: ReturnType<typeof useTasksPageController>;
}

export const TasksMobileCommandBar: React.FC<TasksMobileCommandBarProps> = ({
  controller,
}) => {
  const {
    activeTab,
    workspaceSettings,
    selectedTasksCount,
    handleBulkStatusChange,
    isApprover,
    setShowCreateTaskModal,
    setSelectedTasks,
  } = controller;

  if (activeTab !== "tasks" || !workspaceSettings.showMobileCommandBar) {
    return null;
  }

  // When tasks are selected: render compact bulk action bar
  if (selectedTasksCount > 0) {
    return (
      <div className="fixed inset-x-3 bottom-3 z-40 md:hidden animate-in slide-in-from-bottom-2 duration-200">
        <div className="rounded-2xl border border-primary/25 bg-card/95 px-3 py-2.5 shadow-[0_16px_36px_-18px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground tabular-nums">
              {selectedTasksCount} محددة
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl px-2.5 text-xs"
                onClick={() => handleBulkStatusChange("in_progress")}
              >
                بدء
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-xl px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleBulkStatusChange("completed")}
              >
                إكمال
              </Button>
              {isApprover && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-xl bg-primary hover:bg-primary/90 text-white px-2.5 text-xs font-medium"
                  onClick={() => handleBulkStatusChange("completed")}
                  title="اعتماد المهام المحددة"
                >
                  اعتماد
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl px-2 text-xs text-muted-foreground"
                onClick={() => setSelectedTasks([])}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // When no tasks selected: unobtrusive floating action button (FAB) that doesn't block the screen
  return (
    <div className="fixed bottom-4 left-4 z-40 md:hidden">
      <button
        type="button"
        onClick={() => setShowCreateTaskModal(true)}
        className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="مهمة جديدة"
      >
        <PlusIcon className="size-6" />
      </button>
    </div>
  );
};
