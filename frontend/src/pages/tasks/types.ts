export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ProjectStatus = "planning" | "active" | "completed" | "on_hold";

export type ProjectPriority = "low" | "medium" | "high";

export type TaskMeasurementType = "TIME" | "COUNT" | "VALUE";

export type TaskPageTab =
  | "tasks"
  | "projects"
  | "categories"
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
  title: string;
  description: string;
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
}

export interface GoalOption {
  id: string;
  title: string;
  goalType: string;
  project?: { id: string; name: string } | null;
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

export interface NotificationChannelSettings {
  enabled: boolean;
  sound?: boolean;
  vibration?: boolean;
  badge?: boolean;
  address?: string;
  frequency?: string;
  format?: string;
  phoneNumber?: string;
  showBadge?: boolean;
  autoMarkRead?: boolean;
  showPreview?: boolean;
  requireInteraction?: boolean;
}

export interface NotificationTypeSettings {
  enabled: boolean;
  channels: string[];
  priority: string;
  customSound: string | null;
}

export interface QuietHoursSettings {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface NotificationSettings {
  userId: string;
  companyId: string;
  globalEnabled: boolean;
  quietHours: QuietHoursSettings;
  channels: {
    push: NotificationChannelSettings;
    email: NotificationChannelSettings;
    sms: NotificationChannelSettings;
    inApp: NotificationChannelSettings;
    browser: NotificationChannelSettings;
    whatsapp: NotificationChannelSettings;
  };
  typeSettings: Record<string, NotificationTypeSettings>;
}

export interface NotificationType {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: string;
  defaultEnabled: boolean;
  channels: string[];
  canDisable: boolean;
}
