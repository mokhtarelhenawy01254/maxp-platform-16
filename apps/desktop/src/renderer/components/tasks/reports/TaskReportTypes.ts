export interface TaskReportItem {
  id: string;
  title: string;
  projectName: string;
  assignedToName: string;
  assignedToId?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string | null;
  createdAt: string;
  completedAt?: string | null;
  estimatedMinutes: number;
  actualTrackedMinutes: number;
  varianceMinutes: number; // actual - estimated
  variancePercent: number; // (actual / estimated) * 100
  isOverdue: boolean;
  isTimeLeak: boolean; // actual > estimated * 1.3
  isReviewBlocked: boolean; // IN_REVIEW for > 24h
}

export interface TaskReportKpiData {
  totalTasks: number;
  completedCount: number;
  completionRate: number; // 0 - 100
  inProgressCount: number;
  inReviewCount: number;
  totalTrackedSeconds: number;
  overdueCount: number;
  timeLeakCount: number;
  reviewBlockedCount: number;
  focusAccuracyRate: number; // estimation accuracy
}

export type TaskDateRange = 'today' | '7days' | '30days' | 'all';
export type TaskExceptionFilter = 'all' | 'time_leaks' | 'review_blocked' | 'overdue';

export interface TaskReportFilterState {
  dateRange: TaskDateRange;
  selectedUserId: string; // 'all' or userId
  selectedProject: string; // 'all' or projectName
  exceptionFilter: TaskExceptionFilter;
  searchQuery: string;
}
