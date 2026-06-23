import React from "react";
import {
  ArrowDownTrayIcon,
  FolderPlusIcon,
  PlusIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import type { TaskScopeFilter } from "../types";

type TaskWorkspaceHeaderProps = {
  taskFilter: TaskScopeFilter;
  hasCommandState: boolean;
  selectedTasksCount: number;
  visibleTasksCount: number;
  headline: string;
  description: string;
  taskStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  setShowFilterSidebar: (show: boolean) => void;
  setShowCreateTaskModal: (show: boolean) => void;
  setShowCreateProjectModal: (show: boolean) => void;
  exportToCSV: () => void;
  scrollToBulkActions: () => void;
  showOverdueIndicators: boolean;
  showProjectShortcut: boolean;
};

const scopeLabels: Record<TaskScopeFilter, string> = {
  all: "كل المهام",
  "my-tasks": "مهامي",
  "assigned-by-me": "أنشأتها أنا",
};

export const TaskWorkspaceHeader: React.FC<TaskWorkspaceHeaderProps> = ({
  taskFilter,
  hasCommandState,
  selectedTasksCount,
  visibleTasksCount,
  headline,
  description,
  taskStats,
  setShowFilterSidebar,
  setShowCreateTaskModal,
  setShowCreateProjectModal,
  exportToCSV,
  scrollToBulkActions,
  showOverdueIndicators,
  showProjectShortcut,
}) => {
  const openTasksCount = taskStats.pending + taskStats.inProgress;

  return (
    <section className="rounded-[18px] border border-border/65 bg-card/72 px-3 py-2.5 shadow-[0_14px_40px_-34px_rgba(15,27,45,0.22)] md:px-3.5">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-[10px]"
            >
              {scopeLabels[taskFilter]}
            </Badge>
            {hasCommandState ? (
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] text-primary"
              >
                عرض مخصص
              </Badge>
            ) : null}
            {showOverdueIndicators && taskStats.overdue > 0 ? (
              <Badge
                variant="outline"
                className="rounded-full border-rose-500/20 bg-rose-500/5 px-2 py-0.5 text-[10px] text-rose-600 dark:text-rose-300"
              >
                {taskStats.overdue} متأخرة
              </Badge>
            ) : null}
            {selectedTasksCount > 0 ? (
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] text-primary"
              >
                {selectedTasksCount} محددة
              </Badge>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-0.5 md:flex-row md:items-baseline md:gap-2">
            <h1 className="shrink-0 text-base font-semibold tracking-tight text-foreground">
              المهام
            </h1>
            <p
              className="truncate text-xs text-muted-foreground md:text-sm"
              title={description}
            >
              {headline}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">          
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-xl px-2.5 text-xs"
            onClick={selectedTasksCount > 0 ? scrollToBulkActions : exportToCSV}
          >
            {selectedTasksCount > 0 ? (
              <>
                <QueueListIcon className="size-3.5" />
                الإجراءات
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="size-3.5" />
                تصدير
              </>
            )}
          </Button>
          {showProjectShortcut ? (
            <Button
              type="button"
              variant="outline"
              className="hidden h-8 rounded-xl px-2.5 text-xs lg:inline-flex"
              onClick={() => setShowCreateProjectModal(true)}
            >
              <FolderPlusIcon className="size-3.5" />
              مشروع جديد
            </Button>
          ) : null}
          <Button
            type="button"
            className="h-8 rounded-xl px-2.5 text-xs"
            data-testid="tasks-open-create-modal"
            onClick={() => setShowCreateTaskModal(true)}
          >
            <PlusIcon className="size-3.5" />
            مهمة جديدة
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <div className="rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] text-muted-foreground">
          ظاهر:{" "}
          <strong className="font-semibold text-foreground">
            {visibleTasksCount}
          </strong>
        </div>
        <div className="rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] text-muted-foreground">
          مفتوحة:{" "}
          <strong className="font-semibold text-foreground">
            {openTasksCount}
          </strong>
        </div>
        <div className="rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] text-muted-foreground">
          بانتظار التنفيذ:{" "}
          <strong className="font-semibold text-foreground">
            {taskStats.pending}
          </strong>
        </div>
        <div className="rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] text-muted-foreground">
          مكتملة:{" "}
          <strong className="font-semibold text-foreground">
            {taskStats.completed}
          </strong>
        </div>
        {showOverdueIndicators && taskStats.overdue > 0 ? (
          <div className="rounded-full border border-rose-500/20 bg-rose-500/5 px-2.5 py-1 text-[11px] text-rose-600 dark:text-rose-300">
            متأخرة:{" "}
            <strong className="font-semibold">{taskStats.overdue}</strong>
          </div>
        ) : null}
      </div>
    </section>
  );
};
