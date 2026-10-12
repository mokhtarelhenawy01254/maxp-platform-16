export type TaskStatus = "pending" | "in_progress" | "in_review" | "completed" | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ProjectStatus = "planning" | "active" | "completed" | "on_hold";

export type ProjectPriority = "low" | "medium" | "high";

export type TaskMeasurementType = "TIME" | "COUNT" | "VALUE";

export type TaskPageTab =
  | "tasks"
  | "projects"
  | "categories"
  | "compliance"
  | "backlog"
  | "integrations"
  | "settings";

export type TaskSortBy =
  | "dueDate"
  | "priority"
  | "status"
  | "createdAt"
  | "title";

export type TaskScopeFilter = "all" | "my-tasks" | "assigned-by-me";

export interface TaskCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  taskCount: number;
  isActive: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  categoryId: string | null;
  categoryName: string | null;
  goalId: string | null;
  goalTitle: string | null;
  goalType: string | null;
  goalProgress?: number | null;
  title: string;
  description: string;
  aiDescription?: string | null;
  pageUrl?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: string;
  assignedTo: string;
  assignedToName: string;
  createdBy: string;
  createdByName: string;
  dueDate: string;
  startDate: string | null;
  estimatedHours: number;
  actualHours: number;
  progress: number;
  measurementType: TaskMeasurementType;
  metricUnit: string | null;
  metricTargetValue: number | null;
  metricCurrentValue: number;
  tags: string[];
  dependencies: string[];
  isRecurring?: boolean;
  recurringRule?: string | null;
  hasEvidence?: boolean;
  missingEvidence?: boolean;
  evidence?: any;
  acceptanceCriteria?: any;
  acceptanceCriteriaMet?: boolean;
  criteriaChecklist?: any[];
  returnCount?: number;
  lastReturnReason?: string | null;
  submittedForReviewAt?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  ownerOverride?: boolean;
  ownerOverrideReason?: string | null;
  convertedFromBacklog?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  endDate: string;
  budget: number;
  spentBudget: number;
  progress: number;
  managerId: string;
  managerName: string;
  teamMembers: string[];
  tags: string[];
  createdAt: string;
}

export interface TaskUser {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  phone?: string;
}

export interface TaskFiltersState {
  projectId: string;
  categoryId: string;
  status: string;
  priority: string;
  assignedTo: string;
  dueDateFrom: string;
  dueDateTo: string;
}

export interface TaskTemplate {
  id?: string;
  name?: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  estimatedHours?: number;
  tags?: string[];
}

export interface TaskDraft {
  projectId: string;
  categoryId: string;
  goalId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  type: string;
  assignedTo: string;
  assignedToName: string;
  createdBy: string;
  createdByName: string;
  startDate: string;
  dueDate: string;
  estimatedHours: number;
  measurementType: TaskMeasurementType;
  metricUnit: string;
  metricTargetValue: number | null;
  metricCurrentValue: number;
  tags: string[];
  aiDescription?: string;
  pageUrl?: string;
  acceptanceCriteria?: string;
}

export interface GoalOption {
  id: string;
  title: string;
  goalType: string;
  status?: string;
  priority?: string;
  progress?: number;
  target?: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  metricKey?: string | null;
  dueDate?: string | null;
  project?: { id: string; name: string } | null;
  projectId?: string | null;
}

export interface ProjectDraft {
  name: string;
  description: string;
  priority: ProjectPriority;
  startDate: string;
  endDate: string;
  budget: number;
  managerId: string;
  teamMembers?: string[];
  tags?: string[];
}

export interface CategoryDraft {
  name: string;
  description: string;
  color: string;
}

export interface RecurringTaskConfig {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number;
  endType: "never" | "date" | "count";
  endDate: string;
  endCount: number;
}

export interface WhatsAppSession {
  id: string;
  name: string;
  status: string;
}
