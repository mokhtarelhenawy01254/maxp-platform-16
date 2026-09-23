import React from "react";
import { Link } from "react-router-dom";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type { Task, TaskPriority, TaskStatus, TaskUser } from "../types";
import tokenManager from "../../../utils/tokenManager";
import {
  TaskModalField,
  TaskModalMetric,
  TaskModalSection,
  TaskModalShell,
} from "./TaskModalShell";
import { taskModalControlClassName } from "./TaskModalTokens";

export interface TaskDetailsModalProps {
  show: boolean;
  onClose: () => void;
  task: Task | null;
  users: TaskUser[];
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getPriorityText: (priority: string) => string;
  isOverdue: (date: string, status: string) => boolean;
  formatDate: (date: string) => string;
  updateTaskStatus: (id: string, status: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setSelectedTask: (task: Task | null) => void;
  setEditingTask: (task: Task | null) => void;
  setShowEditTaskModal: (show: boolean) => void;
  fetchTasks: () => void;
  buildApiUrl: (path: string) => string;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  show,
  onClose,
  task,
  users,
  getStatusColor,
  getStatusText,
  getPriorityColor,
  getPriorityText,
  isOverdue,
  formatDate,
  updateTaskStatus,
  deleteTask,
  setSelectedTask,
  setEditingTask,
  setShowEditTaskModal,
  fetchTasks,
  buildApiUrl,
}) => {
  if (!show || !task) return null;

  const getAccessToken = (): string | null => tokenManager.getAccessToken();

  return (
    <TaskModalShell
      open={show}
      onClose={onClose}
      title={task.title}
      description={task.description || "لا يوجد وصف إضافي لهذه المهمة."}
      size="xl"
      badge={
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusColor(task.status)}`}
          >
            {getStatusText(task.status)}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getPriorityColor(task.priority)}`}
          >
            {getPriorityText(task.priority)}
          </span>
          {isOverdue(task.dueDate, task.status) ? (
            <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
              متأخرة
            </span>
          ) : null}
          {task.isRecurring ? (
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              مهمة متكررة
            </span>
          ) : null}
        </div>
      }
      headerAside={
        <Link
          to={`/tasks/${task.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ArrowTopRightOnSquareIcon className="size-4" />
          الصفحة الكاملة
        </Link>
      }
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            className="rounded-xl sm:order-1"
            onClick={() => void deleteTask(task.id)}
          >
            حذف المهمة
          </Button>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onClose}
            >
              إغلاق
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => {
                setEditingTask(task);
                onClose();
                setShowEditTaskModal(true);
              }}
            >
              تعديل
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <TaskModalSection
          title="تحكم مباشر"
          description="غيّر حالة المهمة أو أعد تعيين المسؤول أو حدث التقدم من هنا بدون مغادرة تفاصيلها."
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TaskModalField label="الحالة">
              <select
                value={task.status?.toLowerCase()}
                onChange={async (event) => {
                  await updateTaskStatus(task.id, event.target.value);
                  setSelectedTask({
                    ...task,
                    status: event.target.value as TaskStatus,
                  });
                }}
                className={`${taskModalControlClassName} appearance-none`}
              >
                <option value="pending">في الانتظار</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
              </select>
            </TaskModalField>

            <TaskModalField label="الأولوية">
              <select
                value={task.priority?.toLowerCase()}
                onChange={async (event) => {
                  const token = getAccessToken();
                  await fetch(buildApiUrl(`tasks/${task.id}`), {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ priority: event.target.value }),
                  });
                  setSelectedTask({
                    ...task,
                    priority: event.target.value as TaskPriority,
                  });
                  fetchTasks();
                }}
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
                value={task.assignedTo}
                onChange={async (event) => {
                  const token = getAccessToken();
                  const user = users.find(
                    (item) => item.id === event.target.value,
                  );
                  await fetch(buildApiUrl(`tasks/${task.id}`), {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ assignedTo: event.target.value }),
                  });
                  setSelectedTask({
                    ...task,
                    assignedTo: event.target.value,
                    assignedToName: user
                      ? `${user.firstName} ${user.lastName}`
                      : "",
                  });
                  fetchTasks();
                }}
                className={`${taskModalControlClassName} appearance-none`}
              >
                <option value="">اختر مسؤولًا</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </TaskModalField>

            <TaskModalField label={`التقدم (${task.progress}%)`}>
              <Input
                type="number"
                min="0"
                max="100"
                value={task.progress}
                onChange={(event) => {
                  const nextProgress = Math.min(
                    100,
                    Math.max(0, parseInt(event.target.value, 10) || 0),
                  );
                  setSelectedTask({
                    ...task,
                    progress: nextProgress,
                  });
                }}
                onBlur={async () => {
                  const token = getAccessToken();
                  await fetch(buildApiUrl(`tasks/${task.id}`), {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      progress: task.progress,
                    }),
                  });
                  fetchTasks();
                }}
                className={taskModalControlClassName}
              />
            </TaskModalField>
          </div>
        </TaskModalSection>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <TaskModalSection
            title="ملخص المهمة"
            description="تفاصيل التشغيل الأساسية للمشروع والمسؤول والحالة والوقت."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <TaskModalMetric
                label="المشروع"
                value={task.projectName || "بدون مشروع"}
              />
              <TaskModalMetric
                label="المسؤول"
                value={task.assignedToName || "غير محدد"}
              />
              <TaskModalMetric
                label="الحالة"
                value={
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(task.status)}`}
                  >
                    {getStatusText(task.status)}
                  </span>
                }
              />
              <TaskModalMetric
                label="الأولوية"
                value={
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPriorityColor(task.priority)}`}
                  >
                    {getPriorityText(task.priority)}
                  </span>
                }
              />
              <TaskModalMetric
                label="منشئ المهمة"
                value={task.createdByName || "غير معروف"}
              />
              <TaskModalMetric
                label="الاستحقاق"
                value={
                  <span
                    className={
                      isOverdue(task.dueDate, task.status)
                        ? "text-rose-600 dark:text-rose-300"
                        : undefined
                    }
                  >
                    {task.startDate ? formatDate(task.startDate) : "غير محدد"} -{" "}
                    {task.dueDate ? formatDate(task.dueDate) : "غير محدد"}
                  </span>
                }
              />
            </div>
          </TaskModalSection>

          <TaskModalSection
            title="الوقت والتقدم"
            description="أرقام تساعدك على معرفة مدى اقتراب المهمة من الإغلاق."
          >
            <div className="space-y-3">
              <TaskModalMetric
                label="الساعات المقدرة"
                value={`${task.estimatedHours || 0} ساعة`}
              />
              <TaskModalMetric
                label="الساعات الفعلية"
                value={`${task.actualHours || 0} ساعة`}
              />
              <TaskModalMetric
                label="التقدم"
                value={
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">
                      {task.progress || 0}%
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${task.progress || 0}%` }}
                      />
                    </div>
                  </div>
                }
              />
            </div>
          </TaskModalSection>
        </div>

        {Array.isArray(task.tags) && task.tags.length > 0 ? (
          <TaskModalSection
            title="الوسوم"
            description="وسوم تساعدك على التجميع والبحث السريع داخل مساحة المهام."
          >
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag: string, index: number) => (
                <span
                  key={`${task.id}-${index}`}
                  className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </TaskModalSection>
        ) : null}
      </div>
    </TaskModalShell>
  );
};
