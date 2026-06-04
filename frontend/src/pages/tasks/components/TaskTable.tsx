import React from "react";
import { Link } from "react-router-dom";
import {
  CalendarIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import type { Task } from "../types";

export interface TaskTableProps {
  paginatedTasks: Task[];
  filteredAndSortedTasks: Task[];
  searchQuery: string;
  selectedTasks: string[];
  handleSelectTask: (taskId: string) => void;
  handleSelectAll: () => void;
  isOverdue: (dueDate: string | null, status: Task["status"]) => boolean;
  getStatusColor: (status: Task["status"]) => string;
  getStatusText: (status: Task["status"]) => string;
  getStatusIcon: (status: Task["status"]) => React.ReactNode;
  getPriorityColor: (priority: Task["priority"]) => string;
  getPriorityText: (priority: Task["priority"]) => string;
  formatDate: (date: string) => string;
  updateTaskStatus: (taskId: string, status: Task["status"]) => void;
  deleteTask: (taskId: string) => void;
  setSelectedTask: (task: Task) => void;
  setShowTaskModal: (show: boolean) => void;
  setEditingTask: (task: Task) => void;
  setShowEditTaskModal: (show: boolean) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  serverTotalTasks: number;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  paginatedTasks,
  filteredAndSortedTasks,
  searchQuery,
  selectedTasks,
  handleSelectTask,
  handleSelectAll,
  isOverdue,
  getStatusColor,
  getStatusText,
  getStatusIcon,
  getPriorityColor,
  getPriorityText,
  formatDate,
  updateTaskStatus,
  deleteTask,
  setSelectedTask,
  setShowTaskModal,
  setEditingTask,
  setShowEditTaskModal,
  currentPage,
  setCurrentPage,
  totalPages,
  serverTotalTasks,
}) => {
  const totalCount =
    serverTotalTasks > 0 ? serverTotalTasks : filteredAndSortedTasks.length;

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setShowEditTaskModal(true);
  };

  const normalizeTaskStatus = (status: string | null | undefined): string =>
    String(status || "").toLowerCase();

  return (
    <div
      id="tasks-queue"
      data-testid="tasks-queue"
      className="overflow-hidden rounded-[18px] border border-border/65 bg-card/72 shadow-[0_14px_42px_-34px_rgba(15,27,45,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2 md:px-4">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            قائمة التنفيذ
          </p>
          <p className="text-xs text-muted-foreground">
            {searchQuery
              ? `عرض ${totalCount} نتيجة لعبارة "${searchQuery}".`
              : `${totalCount} مهمة في النطاق الحالي، منها ${paginatedTasks.length} في هذه الصفحة.`}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
            {selectedTasks.length > 0
              ? `${selectedTasks.length} محددة`
              : "جاهزة للتنفيذ"}
          </Badge>
          {filteredAndSortedTasks.length !== totalCount ? (
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
              {filteredAndSortedTasks.length} بعد التصفية
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 p-2.5 md:hidden">
        {paginatedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border bg-background/60 px-4 py-12 text-center">
            <ClipboardDocumentListIcon className="size-12 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                لا توجد مهام مطابقة
              </p>
              <p className="text-sm text-muted-foreground">
                جرّب تخفيف الفلاتر أو أضف مهمة جديدة من أعلى الصفحة.
              </p>
            </div>
          </div>
        ) : null}

        {paginatedTasks.map((task) => (
          <article
            key={task.id}
            className={`overflow-hidden rounded-[16px] border px-3 py-3 ${
              selectedTasks.includes(task.id)
                ? "border-primary/30 bg-primary/5"
                : "border-border/70 bg-background/80"
            } ${
              isOverdue(task.dueDate, task.status)
                ? "ring-1 ring-rose-400/35"
                : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={`h-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(
                      task.status,
                    )}`}
                  >
                    {getStatusText(task.status)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`h-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${getPriorityColor(
                      task.priority,
                    )}`}
                  >
                    {getPriorityText(task.priority)}
                  </Badge>
                </div>

                <Link
                  to={`/tasks/${task.id}`}
                  className="block text-sm font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {task.title}
                </Link>

                <p className="line-clamp-1 text-xs leading-5 text-muted-foreground">
                  {task.description || "لا يوجد وصف إضافي لهذه المهمة."}
                </p>
              </div>

              <input
                type="checkbox"
                checked={selectedTasks.includes(task.id)}
                onChange={() => handleSelectTask(task.id)}
                className="mt-1 size-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <FolderIcon className="size-4 shrink-0" />
                <span className="truncate">
                  {task.projectName || "بدون مشروع"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="size-4 shrink-0" />
                <span className="truncate">
                  {task.assignedToName || "غير محدد"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 shrink-0" />
                <span
                  className={
                    isOverdue(task.dueDate, task.status)
                      ? "font-semibold text-rose-600"
                      : undefined
                  }
                >
                  {task.dueDate ? formatDate(task.dueDate) : "بدون موعد"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>التقدم</span>
                <span className="font-semibold text-foreground">
                  {task.progress}%
                </span>
              </div>
            </div>

            <div className="mt-2.5 h-1.5 rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {normalizeTaskStatus(task.status) === "pending" ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-full px-2.5 text-xs"
                    onClick={() => updateTaskStatus(task.id, "in_progress")}
                  >
                    بدء التنفيذ
                  </Button>
                ) : null}
                {normalizeTaskStatus(task.status) === "in_progress" ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-full px-2.5 text-xs"
                    onClick={() => updateTaskStatus(task.id, "completed")}
                  >
                    إكمال
                  </Button>
                ) : null}
              </div>

              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={() => openTask(task)}
                >
                  <EyeIcon className="size-4" />
                  <span className="sr-only">عرض</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={() => editTask(task)}
                >
                  <PencilIcon className="size-4" />
                  <span className="sr-only">تعديل</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-rose-600 hover:text-rose-700"
                  onClick={() => deleteTask(task.id)}
                >
                  <TrashIcon className="size-4" />
                  <span className="sr-only">حذف</span>
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/60">
            <thead className="sticky top-0 z-10 bg-background/90 backdrop-blur">
              <tr>
                <th className="w-10 px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedTasks.length === paginatedTasks.length &&
                      paginatedTasks.length > 0
                    }
                    onChange={handleSelectAll}
                    className="size-4 rounded border-border text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                  المهمة
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                  الحالة
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                  الاستحقاق
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                  التقدم
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedTasks.map((task) => (
                <tr
                  key={task.id}
                  className={`transition-colors hover:bg-background/75 ${
                    selectedTasks.includes(task.id) ? "bg-primary/5" : ""
                  } ${isOverdue(task.dueDate, task.status) ? "bg-rose-500/5" : ""}`}
                >
                  <td className="px-3 py-2.5 text-center align-top">
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.id)}
                      onChange={() => handleSelectTask(task.id)}
                      className="mt-1 size-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </td>

                  <td className="px-3 py-2.5 align-top">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <Link
                            to={`/tasks/${task.id}`}
                            className="block text-sm font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {task.title}
                          </Link>
                          <p className="line-clamp-1 max-w-[34rem] text-xs leading-5 text-muted-foreground">
                            {task.description?.substring(0, 120) ||
                              "لا يوجد وصف إضافي."}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <FolderIcon className="size-4" />
                          {task.projectName || "بدون مشروع"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <UserIcon className="size-4" />
                          {task.assignedToName || "غير محدد"}
                        </span>
                        {task.createdByName ? (
                          <span>بواسطة: {task.createdByName}</span>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2.5 align-top">
                    <div className="space-y-1.5">
                      <Badge
                        variant="outline"
                        className={`h-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(
                          task.status,
                        )}`}
                      >
                        {getStatusIcon(task.status)}
                        {getStatusText(task.status)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`h-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${getPriorityColor(
                          task.priority,
                        )}`}
                      >
                        {getPriorityText(task.priority)}
                      </Badge>
                    </div>
                  </td>

                  <td className="px-3 py-2.5 align-top">
                    <div
                      className={`space-y-0.5 text-xs ${
                        isOverdue(task.dueDate, task.status)
                          ? "text-rose-600 dark:text-rose-300"
                          : "text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="size-4 text-muted-foreground" />
                        <span>
                          {task.dueDate
                            ? formatDate(task.dueDate)
                            : "بدون موعد"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {task.startDate
                          ? `بدء: ${formatDate(task.startDate)}`
                          : "بدء غير محدد"}
                      </p>
                    </div>
                  </td>

                  <td className="px-3 py-2.5 align-top">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">الإنجاز</span>
                        <span className="font-semibold text-foreground">
                          {task.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 w-24 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2.5 align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {normalizeTaskStatus(task.status) === "pending" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full px-2.5 text-xs"
                          onClick={() =>
                            updateTaskStatus(task.id, "in_progress")
                          }
                        >
                          بدء
                        </Button>
                      ) : null}
                      {normalizeTaskStatus(task.status) === "in_progress" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full px-2.5 text-xs"
                          onClick={() => updateTaskStatus(task.id, "completed")}
                        >
                          إكمال
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full"
                        onClick={() => openTask(task)}
                      >
                        <EyeIcon className="size-4" />
                        <span className="sr-only">عرض</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full"
                        onClick={() => editTask(task)}
                      >
                        <PencilIcon className="size-4" />
                        <span className="sr-only">تعديل</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-rose-600 hover:text-rose-700"
                        onClick={() => deleteTask(task.id)}
                      >
                        <TrashIcon className="size-4" />
                        <span className="sr-only">حذف</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginatedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-9 text-center">
            <ClipboardDocumentListIcon className="size-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                لا توجد مهام مطابقة
              </p>
              <p className="text-xs text-muted-foreground">
                لم نعثر على عناصر ضمن النطاق الحالي. راجع الفلاتر أو أضف مهمة
                جديدة.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5 md:px-4">
          <p className="text-xs text-muted-foreground">
            صفحة {currentPage} من {totalPages}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full px-2.5 text-xs"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              الأولى
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full px-2.5 text-xs"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              السابق
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = index + 1;
              } else if (currentPage <= 3) {
                pageNum = index + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + index;
              } else {
                pageNum = currentPage - 2 + index;
              }

              return (
                <Button
                  key={pageNum}
                  type="button"
                  size="sm"
                  variant={currentPage === pageNum ? "default" : "outline"}
                  className="h-8 rounded-full px-2.5 text-xs"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full px-2.5 text-xs"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              التالي
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full px-2.5 text-xs"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              الأخيرة
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
