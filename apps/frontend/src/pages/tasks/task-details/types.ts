export type TaskTabKey =
  | "subtasks"
  | "checklists"
  | "dependencies"
  | "comments"
  | "time"
  | "attachments"
  | "activity";

export type LooseRecord = Record<string, unknown>;

export interface TaskPerson {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  name?: string;
}

export interface TaskProject {
  id: string;
  name: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  status: string;
  assignedUser?: TaskPerson | null;
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  isEdited?: boolean;
  userId?: string;
  user?: TaskPerson | null;
}

export interface TaskAttachment {
  id: string;
  originalName: string;
  fileSize: number;
  filePath: string;
  createdAt: string;
  userId?: string;
  user?: TaskPerson | null;
}

export interface TaskTimeEntry {
  id: string;
  duration: number;
  startTime: string;
  description?: string;
  user?: TaskPerson | null;
}

export interface TaskActivity {
  id: string;
  createdAt: string;
  action?: string;
  description?: string;
  user?: TaskPerson | null;
}

export interface TaskDetails {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  progress: number;
  goalId: string | null;
  goalTitle: string | null;
  goalType: string | null;
  dueDate: string | null;
  startDate: string | null;
  completedDate: string | null;
  estimatedHours: number;
  actualHours: number;
  measurementType: string;
  metricUnit: string | null;
  metricTargetValue: number | null;
  metricCurrentValue: number;
  tags: string[];
  color: string | null;
  createdBy?: string;
  project: TaskProject | null;
  assignedUser: TaskPerson | null;
  createdByUser: TaskPerson | null;
  parentTask: { id: string; title: string } | null;
  subtasks: TaskSubtask[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  timeEntries: TaskTimeEntry[];
  activities: TaskActivity[];
  watchersList: TaskPerson[];
  totalTimeMinutes: number;
  totalTimeHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRunningTimer {
  id: string;
  taskId: string;
}

export const STATUS_OPTIONS = [
  { value: "PENDING", label: "في الانتظار" },
  { value: "IN_PROGRESS", label: "قيد التنفيذ" },
  { value: "IN_REVIEW", label: "بانتظار الاعتماد" },
  { value: "ON_HOLD", label: "معلّقة" },
  { value: "COMPLETED", label: "مكتمل" },
  { value: "CANCELLED", label: "ملغي" },
];

export const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "عاجل" },
  { value: "HIGH", label: "عالي" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "LOW", label: "منخفض" },
];

export const isRecord = (value: unknown): value is LooseRecord =>
  typeof value === "object" && value !== null;

export const getArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

export const getString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

export const getOptionalString = (value: unknown) =>
  typeof value === "string" ? value : null;

export const getNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const toTaskPerson = (value: unknown): TaskPerson | null => {
  const source =
    isRecord(value) && isRecord(value.user)
      ? value.user
      : isRecord(value)
        ? value
        : null;

  if (!source) {
    return null;
  }

  return {
    id: getString(source.id || source.userId),
    firstName: getString(source.firstName),
    lastName: getString(source.lastName),
    avatar: getOptionalString(source.avatar),
    name: typeof source.name === "string" ? source.name : undefined,
  };
};

export const toTaskSubtask = (value: unknown): TaskSubtask => {
  const record = isRecord(value) ? value : {};

  return {
    id: getString(record.id),
    title: getString(record.title),
    status: getString(record.status, "PENDING"),
    assignedUser: toTaskPerson(
      record.assignedUser || record.assignee || record.user,
    ),
  };
};

export const toTaskComment = (value: unknown): TaskComment => {
  const record = isRecord(value) ? value : {};

  return {
    id: getString(record.id),
    content: getString(record.content),
    createdAt: getString(record.createdAt),
    isEdited: Boolean(record.isEdited),
    userId: getString(record.userId) || undefined,
    user: toTaskPerson(record.user || record.users || record.author),
  };
};

export const toTaskAttachment = (value: unknown): TaskAttachment => {
  const record = isRecord(value) ? value : {};

  return {
    id: getString(record.id),
    originalName: getString(record.originalName || record.fileName),
    fileSize: getNumber(record.fileSize),
    filePath: getString(record.filePath || record.url),
    createdAt: getString(record.createdAt),
    userId: getString(record.userId) || undefined,
    user: toTaskPerson(record.user || record.uploadedBy),
  };
};

export const toTaskTimeEntry = (value: unknown): TaskTimeEntry => {
  const record = isRecord(value) ? value : {};

  return {
    id: getString(record.id),
    duration: getNumber(record.duration),
    startTime: getString(record.startTime || record.createdAt),
    description: getString(record.description) || undefined,
    user: toTaskPerson(record.user),
  };
};

export const toTaskActivity = (value: unknown): TaskActivity => {
  const record = isRecord(value) ? value : {};

  return {
    id: getString(record.id),
    createdAt: getString(record.createdAt),
    action: getString(record.action) || undefined,
    description: getString(record.description) || undefined,
    user: toTaskPerson(record.user),
  };
};

export const toRunningTimer = (value: unknown): TaskRunningTimer | null => {
  const record = isRecord(value) ? value : null;

  if (!record) {
    return null;
  }

  const id = getString(record.id);
  const taskId = getString(record.taskId);

  if (!id || !taskId) {
    return null;
  }

  return { id, taskId };
};

export const parseTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag)).filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((tag) => String(tag)).filter(Boolean);
    }
  } catch {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

export const normalizeTaskDetails = (rawValue: unknown): TaskDetails => {
  const raw = isRecord(rawValue) ? rawValue : {};
  const projectRecord = isRecord(raw.project) ? raw.project : null;
  const parentTaskRecord = isRecord(raw.parentTask) ? raw.parentTask : null;

  return {
    id: getString(raw.id),
    title: getString(raw.title),
    description: getString(raw.description),
    status: getString(raw.status, "PENDING"),
    priority: getString(raw.priority, "MEDIUM"),
    type: getString(raw.type, "general"),
    progress: getNumber(raw.progress),
    goalId: getOptionalString(raw.goalId),
    goalTitle: getOptionalString(raw.goalTitle),
    goalType: getOptionalString(raw.goalType),
    dueDate: getOptionalString(raw.dueDate),
    startDate: getOptionalString(raw.startDate),
    completedDate: getOptionalString(raw.completedDate),
    estimatedHours: getNumber(raw.estimatedHours),
    actualHours: getNumber(raw.actualHours),
    measurementType: getString(raw.measurementType, "TIME"),
    metricUnit: getOptionalString(raw.metricUnit),
    metricTargetValue:
      raw.metricTargetValue === null || raw.metricTargetValue === undefined
        ? null
        : getNumber(raw.metricTargetValue),
    metricCurrentValue: getNumber(raw.metricCurrentValue),
    tags: parseTags(raw.tags),
    color: getOptionalString(raw.color),
    project: projectRecord
      ? {
          id: getString(projectRecord.id || raw.projectId),
          name: getString(
            projectRecord.name || raw.projectName,
            "مشروع غير محدد",
          ),
        }
      : raw.projectId
        ? {
            id: getString(raw.projectId),
            name: getString(raw.projectName, "مشروع غير محدد"),
          }
        : null,
    assignedUser: toTaskPerson(raw.assignedUser || raw.assignee),
    createdBy: getString(
      raw.createdBy ||
        raw.createdById ||
        (isRecord(raw.createdByUser) ? raw.createdByUser.id : "") ||
        (isRecord(raw.creator) ? raw.creator.id : "")
    ),
    createdByUser: toTaskPerson(raw.createdByUser || raw.creator),
    parentTask: parentTaskRecord
      ? {
          id: getString(parentTaskRecord.id),
          title: getString(parentTaskRecord.title),
        }
      : null,
    subtasks: getArray(raw.subtasks || raw.subTasks || raw.other_tasks).map(
      toTaskSubtask,
    ),
    comments: getArray(raw.comments || raw.taskComments).map(toTaskComment),
    attachments: getArray(raw.attachments || raw.taskAttachments).map(
      toTaskAttachment,
    ),
    timeEntries: getArray(raw.timeEntries).map(toTaskTimeEntry),
    activities: getArray(raw.activities || raw.taskActivities).map(
      toTaskActivity,
    ),
    watchersList: getArray(raw.watchersList || raw.taskWatchers)
      .map((watcher) => toTaskPerson(watcher))
      .filter((watcher): watcher is TaskPerson => Boolean(watcher)),
    totalTimeMinutes: getNumber(raw.totalTimeMinutes),
    totalTimeHours: getNumber(raw.totalTimeHours),
    createdAt: getString(raw.createdAt),
    updatedAt: getString(raw.updatedAt),
  };
};

export const getPersonName = (person?: TaskPerson | null) => {
  if (!person) {
    return "غير محدد";
  }

  return (
    person.name ||
    `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
    "غير محدد"
  );
};

export const getStatusText = (status: string) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label || status;

export const getPriorityText = (priority: string) =>
  PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ||
  priority;

export const getTaskTypeText = (type: string) => {
  switch (type) {
    case "general":
      return "عام";
    case "manual":
      return "يدوي";
    case "task":
      return "مهمة";
    default:
      return type;
  }
};

export const getMeasurementTypeText = (measurementType: string) => {
  switch (measurementType) {
    case "COUNT":
      return "عددي";
    case "VALUE":
      return "قيمة";
    default:
      return "زمني";
  }
};

export const getStatusBadgeClassName = (status: string) => {
  switch (status) {
    case "PENDING":
      return "border-transparent bg-amber-500/12 text-amber-700 dark:bg-amber-500/18 dark:text-amber-300";
    case "IN_PROGRESS":
      return "border-transparent bg-primary/12 text-primary dark:bg-primary/18 dark:text-primary";
    case "IN_REVIEW":
      return "border-transparent bg-purple-500/12 text-purple-700 dark:bg-purple-500/18 dark:text-purple-300";
    case "ON_HOLD":
      return "border-transparent bg-amber-500/12 text-amber-700 dark:bg-amber-500/18 dark:text-amber-300";
    case "COMPLETED":
      return "border-transparent bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-300";
    case "CANCELLED":
      return "border-transparent bg-destructive/12 text-destructive dark:bg-destructive/20 dark:text-destructive";
    default:
      return "border-border bg-background text-foreground";
  }
};

export const getPriorityBadgeClassName = (priority: string) => {
  switch (priority) {
    case "URGENT":
      return "border-transparent bg-destructive/12 text-destructive dark:bg-destructive/20 dark:text-destructive";
    case "HIGH":
      return "border-transparent bg-orange-500/12 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300";
    case "MEDIUM":
      return "border-transparent bg-amber-500/12 text-amber-700 dark:bg-amber-500/18 dark:text-amber-300";
    case "LOW":
      return "border-transparent bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-300";
    default:
      return "border-border bg-background text-foreground";
  }
};

export const formatDate = (value?: string | null) => {
  if (!value) {
    return "غير محدد";
  }

  return new Date(value).toLocaleDateString("ar-EG");
};

export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "غير محدد";
  }

  return new Date(value).toLocaleString("ar-EG");
};

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours && !remainingMinutes) {
    return "0د";
  }

  if (!hours) {
    return `${remainingMinutes}د`;
  }

  if (!remainingMinutes) {
    return `${hours}س`;
  }

  return `${hours}س ${remainingMinutes}د`;
};
