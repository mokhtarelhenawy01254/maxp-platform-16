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
  totalLifetimeMinutes?: number;
  todayTrackedMinutes?: number;
  varianceMinutes: number; // actual - estimated
  variancePercent: number; // (actual / estimated) * 100
  isOverdue: boolean;
  isTimeLeak: boolean; // actual > estimated * 1.3
  isReviewBlocked: boolean; // IN_REVIEW for > 24h
  reworkMinutes?: number; // وقت إعادة العمل بعد أول رجوع/مراجعة
}

export interface TaskReportKpiData {
  totalTasks: number;
  completedCount: number;
  completionRate: number; // 0 - 100
  inProgressCount: number;
  inReviewCount: number;
  totalTrackedSeconds: number;   // sum of per-task durations (parallel-inclusive)
  actualSeconds: number;         // real human work time (attendance-based, parallel-exclusive)
  attendanceActiveSeconds?: number;
  overdueCount: number;
  timeLeakCount: number;
  reviewBlockedCount: number;
  focusAccuracyRate: number; // estimation accuracy
  totalReworkMinutes?: number; // إجمالي دقائق إعادة العمل
}

export type TaskDateRange =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | '7days'
  | 'this_month'
  | '30days'
  | 'custom_day'
  | 'custom_range'
  | 'all';
export type TaskExceptionFilter = 'all' | 'time_leaks' | 'review_blocked' | 'overdue';

export interface TaskReportFilterState {
  dateRange: TaskDateRange;
  specificDate?: string; // YYYY-MM-DD for single day
  startDate?: string;    // YYYY-MM-DD for custom range
  endDate?: string;      // YYYY-MM-DD for custom range
  selectedUserId: string; // 'all' or userId
  selectedProject: string; // 'all' or projectName
  exceptionFilter: TaskExceptionFilter;
  searchQuery: string;
}

export interface TeamMemberTaskSummary {
  userId: string;
  userName: string;
  jobTitle?: string;
  departmentName?: string;
  avatar?: string;
  inProgressCount: number;
  inReviewCount: number;
  completedTodayCount: number;
  pendingCount: number;
  totalActiveCount: number;
  totalTrackedMinutes: number;
  activeTaskTitle?: string | null;
}

