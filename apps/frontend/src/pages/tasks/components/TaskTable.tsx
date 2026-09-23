import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLongDownIcon,
  ArrowLongUpIcon,
  ArrowPathIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type { Task, TaskSortBy } from "../types";

export interface TaskTableProps {
  paginatedTasks: Task[];
  filteredAndSortedTasks: Task[];
  searchQuery: string;
  selectedTasks: string[];
  loading: boolean;
  sortBy: TaskSortBy;
  sortOrder: "asc" | "desc";
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
  duplicateTask: (task: Task) => void;
  setSelectedTask: (task: Task) => void;
  setShowTaskModal: (show: boolean) => void;
  setEditingTask: (task: Task) => void;
  setShowEditTaskModal: (show: boolean) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  serverTotalTasks: number;
}

const SORT_LABELS: Record<TaskSortBy, string> = {
  createdAt: "الأحدث",
  dueDate: "الاستحقاق",
  priority: "الأولوية",
  status: "الحالة",
  title: "العنوان",
};

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-3 py-3 text-center">
      <div className="mx-auto size-4 rounded bg-muted" />
    </td>
    <td className="px-3 py-3">
      <div className="space-y-2">
        <div className="h-4 w-48 rounded-full bg-muted" />
        <div className="h-3 w-72 rounded-full bg-muted" />
        <div className="flex gap-3">
          <div className="h-3 w-20 rounded-full bg-muted" />
          <div className="h-3 w-16 rounded-full bg-muted" />
        </div>
      </div>
    </td>
    <td className="px-3 py-3">
      <div className="space-y-1.5">
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-5 w-12 rounded-full bg-muted" />
      </div>
    </td>
    <td className="px-3 py-3">
      <div className="space-y-1.5">
        <div className="h-3.5 w-20 rounded-full bg-muted" />
        <div className="h-3 w-16 rounded-full bg-muted" />
      </div>
    </td>
    <td className="px-3 py-3">
      <div className="space-y-1.5">
        <div className="h-3.5 w-12 rounded-full bg-muted" />
        <div className="h-1.5 w-28 rounded-full bg-muted" />
      </div>
    </td>
    <td className="px-3 py-3">
      <div className="flex gap-1.5">
        <div className="size-8 rounded-full bg-muted" />
        <div className="size-8 rounded-full bg-muted" />
        <div className="size-8 rounded-full bg-muted" />
      </div>
    </td>
  </tr>
);

const MobileSkeletonCard = () => (
  <div className="animate-pulse overflow-hidden rounded-[16px] border border-border/70 bg-background/80 px-3 py-3">
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-muted" />
        <div className="h-5 w-14 rounded-full bg-muted" />
      </div>
      <div className="h-4 w-52 rounded-full bg-muted" />
      <div className="h-3 w-full rounded-full bg-muted" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-3 w-20 rounded-full bg-muted" />
        <div className="h-3 w-16 rounded-full bg-muted" />
        <div className="h-3 w-24 rounded-full bg-muted" />
        <div className="h-3 w-10 rounded-full bg-muted" />
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted" />
      <div className="flex justify-between">
        <div className="h-8 w-24 rounded-full bg-muted" />
        <div className="flex gap-0.5">
          <div className="size-8 rounded-full bg-muted" />
          <div className="size-8 rounded-full bg-muted" />
          <div className="size-8 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  </div>
);

const SortIndicator: React.FC<{ column: TaskSortBy; currentSort: TaskSortBy; order: "asc" | "desc" }> = ({
  column,
  currentSort,
  order,
}) => {
  if (currentSort !== column) return null;
  return order === "asc" ? (
    <ArrowLongUpIcon className="inline-block size-3.5 text-primary" />
  ) : (
    <ArrowLongDownIcon className="inline-block size-3.5 text-primary" />
  );
};

const statusNeedsStart = (status: string) => {
  const norm = String(status || "").toLowerCase();
  return norm === "pending" || norm === "cancelled";
};

const statusNeedsComplete = (status: string) => {
  const norm = String(status || "").toLowerCase();
  return norm === "in_progress";
};

const buildPageNumbers = (current: number, total: number): (number | "...")[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];

  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push("...");
    pages.push(total);
  } else if (current >= total - 3) {
    pages.push(1);
    pages.push("...");
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push("...");
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push("...");
    pages.push(total);
  }

  return pages;
};

export const TaskTable: React.FC<TaskTableProps> = ({
  paginatedTasks,
  filteredAndSortedTasks,
  searchQuery,
  selectedTasks,
  loading,
  sortBy,
  sortOrder,
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
  duplicateTask,
  setSelectedTask,
  setShowTaskModal,
  setEditingTask,
  setShowEditTaskModal,
  currentPage,
  setCurrentPage,
  totalPages,
  serverTotalTasks,
}) => {
  const [jumpPage, setJumpPage] = useState("");
  const totalCount =
    serverTotalTasks > 0 ? serverTotalTasks : filteredAndSortedTasks.length;
  const isEmpty = !loading && paginatedTasks.length === 0;

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setShowEditTaskModal(true);
  };

  const handleJumpToPage = () => {
    const page = parseInt(jumpPage, 10);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setJumpPage("");
    }
  };

  const renderDesktopPagination = () => {
    if (totalPages <= 1) return null;
    const pages = buildPageNumbers(currentPage, totalPages);

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-3 py-2.5 md:px-4">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            صفحة {currentPage} من {totalPages}
          </p>
          <div className="hidden items-center gap-1.5 sm:flex">
            <Input
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleJumpToPage()}
              placeholder="رقم"
              className="h-7 w-14 rounded-lg text-center text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-2 text-[11px]"
              onClick={handleJumpToPage}
              disabled={!jumpPage}
            >
              انتقال
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            title="الصفحة الأولى"
          >
            <ChevronLeftIcon className="size-4 rotate-180" />
            <span className="sr-only">الأولى</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            title="الصفحة السابقة"
          >
            <ChevronLeftIcon className="size-4" />
            <span className="sr-only">السابق</span>
          </Button>

          {pages.map((page, idx) =>
            page === "..." ? (
              <span key={`ellipsis-${idx}`} className="flex size-8 items-center justify-center text-xs text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={page}
                type="button"
                size="icon"
                variant={currentPage === page ? "default" : "outline"}
                className="size-8 rounded-full text-xs"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ),
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="الصفحة التالية"
          >
            <ChevronRightIcon className="size-4" />
            <span className="sr-only">التالي</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            title="الصفحة الأخيرة"
          >
            <ChevronLeftIcon className="size-4" />
            <span className="sr-only">الأخيرة</span>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div
      id="tasks-queue"
      data-testid="tasks-queue"
      className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-background/40 px-4 py-2.5 md:px-5">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-bold text-foreground">
            قائمة التنفيذ
          </p>
          <p className="text-xs text-muted-foreground">
            {loading
              ? "جاري تحديث القائمة..."
              : searchQuery
                ? `عرض ${totalCount} نتيجة لعبارة "${searchQuery}".`
                : `${totalCount} مهمة في النطاق الحالي، منها ${paginatedTasks.length} في هذه الصفحة.`}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {loading ? (
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] animate-pulse">
              جاري التحميل...
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
              {selectedTasks.length > 0
                ? `${selectedTasks.length} محددة`
                : "جاهزة للتنفيذ"}
            </Badge>
          )}
          {!loading && filteredAndSortedTasks.length !== totalCount ? (
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
              {filteredAndSortedTasks.length} بعد التصفية
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 p-2.5 md:hidden">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <MobileSkeletonCard key={`skel-${i}`} />)
          : null}

        {isEmpty ? (
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

        {!loading &&
          paginatedTasks.map((task) => (
            <article
              key={task.id}
              className={`overflow-hidden rounded-xl border px-3.5 py-3.5 transition-all duration-150 ${
                selectedTasks.includes(task.id)
                  ? "border-primary/30 bg-primary/5 shadow-sm"
                  : "border-border/60 bg-background/70 hover:border-border/80 hover:bg-background hover:shadow-sm"
              } ${
                isOverdue(task.dueDate, task.status)
                  ? "ring-1 ring-rose-400/30"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`h-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusColor(
                        task.status,
                      )}`}
                    >
                      {getStatusText(task.status)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`h-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${getPriorityColor(
                        task.priority,
                      )}`}
                    >
                      {getPriorityText(task.priority)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/tasks/${task.id}`}
                      className="block text-sm font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      {task.title}
                    </Link>
                    {task.isRecurring ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" title="مهمة متكررة دورياً">
                        <ArrowPathIcon className="size-3" />
                        متكررة
                      </span>
                    ) : null}
                  </div>

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

              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted/70">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-l from-primary to-primary/70 transition-all duration-500"
                  style={{ width: `${task.progress}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {statusNeedsStart(task.status) ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-full px-2.5 text-xs"
                      onClick={() => updateTaskStatus(task.id, "in_progress")}
                    >
                      بدء التنفيذ
                    </Button>
                  ) : null}
                  {statusNeedsComplete(task.status) ? (
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
                    title="عرض التفاصيل"
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
                    title="تعديل المهمة"
                  >
                    <PencilIcon className="size-4" />
                    <span className="sr-only">تعديل</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full"
                    onClick={() => duplicateTask(task)}
                    title="تكرار المهمة"
                  >
                    <DocumentDuplicateIcon className="size-4" />
                    <span className="sr-only">تكرار</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full text-rose-600 hover:text-rose-700"
                    onClick={() => deleteTask(task.id)}
                    title="حذف المهمة"
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
        {loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/60">
              <thead className="bg-background/90 backdrop-blur">
                <tr>
                  <th className="w-10 px-3 py-2 text-center text-xs font-semibold text-muted-foreground">
                    <div className="mx-auto size-4 rounded bg-muted" />
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">المهمة</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">الحالة</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">الاستحقاق</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">التقدم</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={`skel-${i}`} />
                ))}
              </tbody>
            </table>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-dashed border-border bg-background/60">
              <ClipboardDocumentListIcon className="size-8 text-muted-foreground/50" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                لا توجد مهام مطابقة
              </p>
              <p className="text-xs text-muted-foreground">
                لم نعثر على عناصر ضمن النطاق الحالي. راجع الفلاتر أو أضف مهمة
                جديدة.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-h-[65vh] overflow-auto">
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
                    <SortIndicator column="title" currentSort={sortBy} order={sortOrder} />
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                    الحالة
                    <SortIndicator column="status" currentSort={sortBy} order={sortOrder} />
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                    الاستحقاق
                    <SortIndicator column="dueDate" currentSort={sortBy} order={sortOrder} />
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
                    className={`group transition-colors duration-100 ${
                      selectedTasks.includes(task.id) ? "bg-primary/5" : "hover:bg-muted/40"
                    } ${isOverdue(task.dueDate, task.status) ? "bg-rose-500/4" : ""}`}
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                to={`/tasks/${task.id}`}
                                className="block text-sm font-semibold text-foreground transition-colors hover:text-primary"
                              >
                                {task.title}
                              </Link>
                              {task.isRecurring ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" title="مهمة متكررة دورياً">
                                  <ArrowPathIcon className="size-3" />
                                  متكررة
                                </span>
                              ) : null}
                            </div>
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
                          className={`h-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusColor(
                            task.status,
                          )}`}
                        >
                          {getStatusIcon(task.status)}
                          {getStatusText(task.status)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`h-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${getPriorityColor(
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
                          <span className="font-bold text-foreground">
                            {task.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 min-w-28 max-w-32 overflow-hidden rounded-full bg-muted/70">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-l from-primary to-primary/60 transition-all duration-500"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 align-top">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {statusNeedsStart(task.status) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full px-2.5 text-xs"
                            onClick={() =>
                              updateTaskStatus(task.id, "in_progress")
                            }
                            title="بدء تنفيذ المهمة"
                          >
                            بدء
                          </Button>
                        ) : null}
                        {statusNeedsComplete(task.status) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full px-2.5 text-xs"
                            onClick={() => updateTaskStatus(task.id, "completed")}
                            title="إكمال المهمة"
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
                          title="عرض التفاصيل"
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
                          title="تعديل المهمة"
                        >
                          <PencilIcon className="size-4" />
                          <span className="sr-only">تعديل</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full"
                          onClick={() => duplicateTask(task)}
                          title="تكرار المهمة"
                        >
                          <DocumentDuplicateIcon className="size-4" />
                          <span className="sr-only">تكرار</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full text-rose-600 hover:text-rose-700"
                          onClick={() => deleteTask(task.id)}
                          title="حذف المهمة"
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
        )}
      </div>

      {!loading && renderDesktopPagination()}
    </div>
  );
};
