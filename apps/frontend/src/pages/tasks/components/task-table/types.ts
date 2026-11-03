import React from "react";
import type { Task, TaskSortBy } from "../../types";

export interface TaskTableProps {
  canApprove?: boolean;
  approverUserId?: string;
  userRole?: string;
  onReloadTasks?: () => void;
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

export const SORT_LABELS: Record<TaskSortBy, string> = {
  createdAt: "الأحدث",
  dueDate: "الاستحقاق",
  priority: "الأولوية",
  status: "الحالة",
  title: "العنوان",
};

export const statusNeedsStart = (status: string) => {
  const norm = String(status || "").toLowerCase();
  return norm === "pending" || norm === "cancelled";
};

export const statusNeedsComplete = (status: string) => {
  const norm = String(status || "").toLowerCase();
  return norm === "in_progress";
};

export const statusNeedsReview = (status: string) => {
  const norm = String(status || "").toLowerCase();
  return norm === "in_review";
};
