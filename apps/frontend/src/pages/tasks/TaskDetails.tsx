import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  FolderIcon,
  LinkIcon as DependencyIcon,
  ListBulletIcon,
  PaperClipIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

import {
  BusinessPageShell,
  BusinessSectionPanel,
} from "../../components/business/BusinessSurface";
import MentionInput from "../../components/tasks/MentionInput";
import TaskChecklist from "../../components/tasks/TaskChecklist";
import TaskDependencies from "../../components/tasks/TaskDependencies";
import { renderWithMentions } from "../../components/tasks/mentionUtils";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { useAuth } from "../../hooks/useAuthSimple";
import { cn } from "../../lib/utils";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

type TaskTabKey =
  | "subtasks"
  | "checklists"
  | "dependencies"
  | "comments"
  | "time"
  | "attachments"
  | "activity";

type LooseRecord = Record<string, unknown>;

interface TaskPerson {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  name?: string;
}

interface TaskProject {
  id: string;
  name: string;
}

interface TaskSubtask {
  id: string;
  title: string;
  status: string;
  assignedUser?: TaskPerson | null;
}

interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  isEdited?: boolean;
  userId?: string;
  user?: TaskPerson | null;
}

interface TaskAttachment {
  id: string;
  originalName: string;
  fileSize: number;
  filePath: string;
  createdAt: string;
  userId?: string;
  user?: TaskPerson | null;
}

interface TaskTimeEntry {
  id: string;
  duration: number;
  startTime: string;
  description?: string;
  user?: TaskPerson | null;
}

interface TaskActivity {
  id: string;
  createdAt: string;
  action?: string;
  description?: string;
  user?: TaskPerson | null;
}

interface TaskDetails {
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

interface TaskRunningTimer {
  id: string;
  taskId: string;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "في الانتظار" },
  { value: "IN_PROGRESS", label: "قيد التنفيذ" },
  { value: "IN_REVIEW", label: "بانتظار الاعتماد" },
  { value: "ON_HOLD", label: "معلّقة" },
  { value: "COMPLETED", label: "مكتمل" },
  { value: "CANCELLED", label: "ملغي" },
];

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "عاجل" },
  { value: "HIGH", label: "عالي" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "LOW", label: "منخفض" },
];

const isRecord = (value: unknown): value is LooseRecord =>
  typeof value === "object" && value !== null;

const getArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const getString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const getOptionalString = (value: unknown) =>
  typeof value === "string" ? value : null;

const getNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const toTaskPerson = (value: unknown): TaskPerson | null => {
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

const toTaskSubtask = (value: unknown): TaskSubtask => {
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

const toTaskComment = (value: unknown): TaskComment => {
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

const toTaskAttachment = (value: unknown): TaskAttachment => {
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

const toTaskTimeEntry = (value: unknown): TaskTimeEntry => {
  const record = isRecord(value) ? value : {};

  return {
    id: getString(record.id),
    duration: getNumber(record.duration),
    startTime: getString(record.startTime || record.createdAt),
    description: getString(record.description) || undefined,
    user: toTaskPerson(record.user),
  };
};

const toTaskActivity = (value: unknown): TaskActivity => {
  const record = isRecord(value) ? value : {};

  return {
    id: getString(record.id),
    createdAt: getString(record.createdAt),
    action: getString(record.action) || undefined,
    description: getString(record.description) || undefined,
    user: toTaskPerson(record.user),
  };
};

const toRunningTimer = (value: unknown): TaskRunningTimer | null => {
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

const parseTags = (value: unknown): string[] => {
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

const normalizeTaskDetails = (rawValue: unknown): TaskDetails => {
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

const getPersonName = (person?: TaskPerson | null) => {
  if (!person) {
    return "غير محدد";
  }

  return (
    person.name ||
    `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
    "غير محدد"
  );
};

const getStatusText = (status: string) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label || status;

const getPriorityText = (priority: string) =>
  PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ||
  priority;

const getTaskTypeText = (type: string) => {
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

const getMeasurementTypeText = (measurementType: string) => {
  switch (measurementType) {
    case "COUNT":
      return "عددي";
    case "VALUE":
      return "قيمة";
    default:
      return "زمني";
  }
};

const getStatusBadgeClassName = (status: string) => {
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

const getPriorityBadgeClassName = (priority: string) => {
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

const formatDate = (value?: string | null) => {
  if (!value) {
    return "غير محدد";
  }

  return new Date(value).toLocaleDateString("ar-EG");
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "غير محدد";
  }

  return new Date(value).toLocaleString("ar-EG");
};

const formatDuration = (minutes: number) => {
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

const TaskInfoRow: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  emphasized?: boolean;
}> = ({ label, value, icon, emphasized = false }) => (
  <div className="rounded-[22px] border border-border/65 bg-background/70 px-4 py-3">
    <div className="flex items-start gap-3">
      {icon ? (
        <div className="mt-0.5 rounded-2xl bg-primary/10 p-2 text-primary">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div
          className={cn(
            "text-sm text-foreground",
            emphasized ? "font-semibold" : "font-medium",
          )}
        >
          {value}
        </div>
      </div>
    </div>
  </div>
);

const TaskEmptyState: React.FC<{
  title: string;
  description: string;
}> = ({ title, description }) => (
  <div className="rounded-[26px] border border-dashed border-border/70 bg-background/55 px-5 py-10 text-center">
    <div className="mx-auto max-w-md space-y-2">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  </div>
);

const TaskWorkspaceStat: React.FC<{
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: "default" | "primary" | "warning" | "success";
}> = ({ label, value, hint, tone = "default" }) => (
  <div
    className={cn(
      "min-w-0 rounded-[20px] border px-3 py-2.5 md:rounded-[22px]",
      tone === "primary" &&
        "border-primary/15 bg-primary/5 text-primary dark:bg-primary/10",
      tone === "warning" &&
        "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200",
      tone === "success" &&
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
      tone === "default" && "border-border/65 bg-background/75 text-foreground",
    )}
  >
    <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    <div className="mt-1 min-w-0 truncate text-[15px] font-semibold leading-6 tracking-tight md:text-base">
      {value}
    </div>
    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground md:text-xs">
      {hint}
    </p>
  </div>
);

const TaskDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeCompanyId = user?.companyId ?? null;
  const isApprover = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"].includes(user?.role || "");

  const [task, setTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TaskTabKey>("subtasks");
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState({ title: "", description: "" });
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [runningTimer, setRunningTimer] = useState<TaskRunningTimer | null>(
    null,
  );
  const [users, setUsers] = useState<TaskPerson[]>([]);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [showManualTimeForm, setShowManualTimeForm] = useState(false);
  const [manualTimeEntry, setManualTimeEntry] = useState({
    hours: 0,
    minutes: 0,
    description: "",
  });
  const [uploading, setUploading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const getAccessToken = (): string | null => tokenManager.getAccessToken();

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${id}/details`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok && data.success && data.data) {
        setTask(normalizeTaskDetails(data.data));
        return;
      }

      setTask(null);
    } catch (error) {
      console.error("Error fetching task details:", error);
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRunningTimer = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("tasks/running-timer"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRunningTimer(toRunningTimer(data?.success ? data.data : null));
    } catch (error) {
      console.error("Error fetching running timer:", error);
      setRunningTimer(null);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("tasks/company-users"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Error fetching users:", {
          status: response.status,
          code: errData?.code,
          message: errData?.message || response.statusText,
        });
        return;
      }
      const data = await response.json();

      if (data.success) {
        setUsers(
          getArray(data.data)
            .map((user) => toTaskPerson(user))
            .filter((user): user is TaskPerson => Boolean(user)),
        );
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    if (!id || !activeCompanyId) {
      return;
    }

    void fetchTaskDetails();
    void fetchRunningTimer();
    void fetchUsers();
  }, [id, activeCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startTimer = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(
        buildApiUrl(`tasks/${id}/time-tracking/start`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        },
      );

      const data = await response.json();
      if (data.success) {
        setRunningTimer(toRunningTimer(data.data));
        fetchTaskDetails();
      } else {
        window.alert(data.error || "فشل في بدء المؤقت");
      }
    } catch (error) {
      console.error("Error starting timer:", error);
    }
  };

  const stopTimer = async () => {
    if (!runningTimer) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(
        buildApiUrl(`tasks/time-tracking/${runningTimer.id}/stop`),
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json();
      if (data.success) {
        setRunningTimer(null);
        fetchTaskDetails();
        fetchRunningTimer();
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${id}/comments`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });

      const data = await response.json();
      if (data.success) {
        setNewComment("");
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const createSubtask = async () => {
    if (!newSubtask.title.trim()) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${id}/subtasks`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSubtask),
      });

      const data = await response.json();
      if (data.success) {
        setNewSubtask({ title: "", description: "" });
        setShowSubtaskForm(false);
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error creating subtask:", error);
    }
  };

  const updateComment = async (commentId: string) => {
    if (!editCommentContent.trim()) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/comments/${commentId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editCommentContent }),
      });

      const data = await response.json();
      if (data.success) {
        setEditingComment(null);
        setEditCommentContent("");
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التعليق؟")) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/comments/${commentId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const addManualTime = async () => {
    const totalMinutes = manualTimeEntry.hours * 60 + manualTimeEntry.minutes;
    if (totalMinutes <= 0) {
      return;
    }

    try {
      const token = getAccessToken();
      const now = new Date();
      const startTime = new Date(now.getTime() - totalMinutes * 60000);

      const response = await fetch(buildApiUrl(`tasks/${id}/time-entries`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          duration: totalMinutes,
          description: manualTimeEntry.description,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setManualTimeEntry({ hours: 0, minutes: 0, description: "" });
        setShowManualTimeForm(false);
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error adding manual time:", error);
    }
  };

  const updateSubtaskStatus = async (subtaskId: string, status: string) => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${subtaskId}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error updating subtask status:", error);
    }
  };

  const toggleWatcher = async () => {
    try {
      const token = getAccessToken();
      const currentUserId = localStorage.getItem("userId");
      const isWatching = task?.watchersList.some(
        (watcher) => watcher.id === currentUserId,
      );

      if (isWatching) {
        await fetch(buildApiUrl(`tasks/${id}/watchers/${currentUserId}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(buildApiUrl(`tasks/${id}/watchers`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: currentUserId }),
        });
      }

      fetchTaskDetails();
    } catch (error) {
      console.error("Error toggling watcher:", error);
    }
  };

  const updateTask = async (updates: Record<string, unknown>) => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        setTask((current) =>
          data.data ? normalizeTaskDetails(data.data) : current,
        );
        fetchTaskDetails();
      } else {
        window.alert(data.error || "فشل في تحديث المهمة");
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        navigate("/tasks");
      } else {
        window.alert(data.error || "فشل في حذف المهمة");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const uploadAttachment = async (file: File) => {
    try {
      setUploading(true);
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(buildApiUrl("upload"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      if (uploadData.success) {
        await fetch(buildApiUrl(`tasks/${id}/attachments`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: uploadData.fileName,
            originalName: file.name,
            fileSize: file.size,
            fileType: file.type,
            filePath: uploadData.filePath,
          }),
        });

        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error uploading attachment:", error);
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المرفق؟")) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(
        buildApiUrl(`tasks/attachments/${attachmentId}`),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json();
      if (data.success) {
        fetchTaskDetails();
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
    }
  };

  if (loading) {
    return (
      <BusinessPageShell className="tasks-page p-3 pb-28 md:px-5 md:py-4 xl:px-6 xl:py-5">
        <div className="mx-auto max-w-[1360px] space-y-3">
          <div className="business-page-panel animate-pulse rounded-[30px] px-5 py-5 md:px-6">
            <div className="space-y-3">
              <div className="h-6 w-28 rounded-full bg-muted" />
              <div className="h-9 w-72 rounded-2xl bg-muted" />
              <div className="h-4 w-full max-w-3xl rounded-full bg-muted" />
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="h-24 rounded-[22px] border border-border/60 bg-background/70"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.32fr)_23rem]">
            <div className="business-page-panel animate-pulse rounded-[30px] px-5 py-5 md:px-6">
              <div className="space-y-4">
                <div className="h-5 w-32 rounded-full bg-muted" />
                <div className="grid gap-3 md:grid-cols-2">
                  {[...Array(3)].map((_, index) => (
                    <div
                      key={index}
                      className="h-24 rounded-[24px] border border-border/60 bg-background/70"
                    />
                  ))}
                </div>
                <div className="h-14 rounded-[22px] bg-muted/60" />
              </div>
            </div>

            <div className="business-page-panel animate-pulse rounded-[30px] px-5 py-5 md:px-6">
              <div className="space-y-3">
                <div className="h-5 w-28 rounded-full bg-muted" />
                {[...Array(5)].map((_, index) => (
                  <div
                    key={index}
                    className="h-16 rounded-[22px] border border-border/60 bg-background/70"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </BusinessPageShell>
    );
  }

  if (!task) {
    return (
      <BusinessPageShell className="tasks-page p-3 pb-20 md:px-5 md:py-4 xl:px-6 xl:py-5">
        <div className="mx-auto max-w-[1360px] space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => navigate("/tasks")}
            >
              <ArrowLeftIcon className="size-4" />
              العودة للمهام
            </Button>
          </div>

          <BusinessSectionPanel
            title="المهمة غير موجودة"
            description="الرابط الحالي لا يعرض مهمة صالحة داخل الشركة الحالية، لذلك أعدنا الصفحة إلى حالة مراجعة بسيطة وواضحة."
            contentClassName="pt-0"
          >
            <TaskEmptyState
              title="لا توجد بيانات لعرضها"
              description="قد يكون الرابط قديمًا أو تم حذف المهمة. ارجع إلى قائمة المهام ثم افتح العنصر من جديد حتى نتأكد أن الرابط والبيانات متطابقان."
            />
          </BusinessSectionPanel>
        </div>
      </BusinessPageShell>
    );
  }

  const currentUserId = localStorage.getItem("userId") || "";
  const isWatching = task.watchersList.some(
    (watcher) => watcher.id === currentUserId,
  );
  const timerOnThisTask = runningTimer?.taskId === task.id;
  const hasOtherRunningTimer =
    Boolean(runningTimer) && runningTimer?.taskId !== task.id;
  const isOverdue =
    Boolean(task.dueDate) &&
    new Date(task.dueDate as string) < new Date() &&
    task.status !== "COMPLETED" &&
    task.status !== "CANCELLED";
  const isTaskClosed =
    task.status === "COMPLETED" || task.status === "CANCELLED";
  const taskDescription = task.description?.trim()
    ? task.description
    : "لا يوجد وصف مكتوب لهذه المهمة حتى الآن.";
  const shouldCollapseDescription = taskDescription.length > 220;
  const isDescriptionCollapsed =
    shouldCollapseDescription && !showFullDescription;
  const workspaceSummary = timerOnThisTask
    ? "المؤقت يعمل الآن على هذه المهمة ويمكنك متابعة التنفيذ من هنا مباشرة."
    : isOverdue
      ? "المهمة تجاوزت موعدها الحالي وتحتاج قرارًا سريعًا بخصوص الحالة أو الموعد أو التقدم."
      : task.status === "COMPLETED"
        ? "المهمة مكتملة ويمكنك الآن مراجعة التعليقات والمرفقات وسجل النشاط."
        : task.progress > 0
          ? `تم إنجاز ${task.progress}% من العمل حتى الآن، ويمكنك تحديث الباقي من لوحة التنفيذ.`
          : "ابدأ من لوحة التنفيذ وعدّل الحالة أو المسؤول أو نسبة الإنجاز دون التنقل بين طبقات كثيرة.";
  const mobileWorkspaceSummary = timerOnThisTask
    ? "المؤقت يعمل على المهمة الآن."
    : isOverdue
      ? "المهمة متأخرة وتحتاج متابعة سريعة."
      : task.status === "COMPLETED"
        ? "المهمة مكتملة."
        : task.progress > 0
          ? `التقدم الحالي ${task.progress}%.`
          : "المهمة جاهزة للبدء.";

  const tabItems: Array<{ id: TaskTabKey; label: string; count: number }> = [
    { id: "subtasks", label: "المهام الفرعية", count: task.subtasks.length },
    { id: "checklists", label: "قوائم التحقق", count: 0 },
    { id: "dependencies", label: "التبعيات", count: 0 },
    { id: "comments", label: "التعليقات", count: task.comments.length },
    { id: "time", label: "الوقت", count: task.timeEntries.length },
    { id: "attachments", label: "المرفقات", count: task.attachments.length },
    { id: "activity", label: "النشاط", count: task.activities.length },
  ];
  const activeTabItem =
    tabItems.find((tab) => tab.id === activeTab) || tabItems[0];

  return (
    <BusinessPageShell className="tasks-page p-2.5 pb-6 md:px-5 md:py-4 xl:px-6 xl:py-5">
      <div className="mx-auto max-w-[1360px] space-y-2.5 md:space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => navigate("/tasks")}
          >
            <ArrowLeftIcon className="size-4" />
            العودة للمهام
          </Button>

          {task.project ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/65 px-3 py-1.5 text-foreground">
              <FolderIcon className="size-4 text-primary" />
              {task.project.name}
            </span>
          ) : null}

          {task.parentTask ? (
            <Link
              to={`/tasks/${task.parentTask.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/65 px-3 py-1.5 text-foreground transition-colors hover:bg-background"
            >
              <DependencyIcon className="size-4 text-primary" />
              المهمة الأصلية: {task.parentTask.title}
            </Link>
          ) : null}
        </div>

        <section className="overflow-hidden rounded-[26px] border border-border/70 bg-card/72 px-3.5 py-3.5 shadow-[0_24px_70px_-50px_rgba(15,27,45,0.34)] md:rounded-[30px] md:px-5 md:py-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  className={cn(
                    "h-7 rounded-full px-3 text-[11px]",
                    getStatusBadgeClassName(task.status),
                  )}
                >
                  {getStatusText(task.status)}
                </Badge>
                <Badge
                  className={cn(
                    "h-7 rounded-full px-3 text-[11px]",
                    getPriorityBadgeClassName(task.priority),
                  )}
                >
                  {getPriorityText(task.priority)}
                </Badge>
                <Badge
                  variant="outline"
                  className="h-7 rounded-full px-3 text-[11px]"
                >
                  النوع: {getTaskTypeText(task.type || "general")}
                </Badge>
                {isOverdue ? (
                  <Badge
                    variant="outline"
                    className="h-7 rounded-full border-rose-500/25 bg-rose-500/10 px-3 text-[11px] text-rose-700 dark:text-rose-300"
                  >
                    متأخرة
                  </Badge>
                ) : null}
                {task.watchersList.length > 0 ? (
                  <Badge
                    variant="outline"
                    className="hidden h-7 rounded-full px-3 text-[11px] md:inline-flex"
                  >
                    {task.watchersList.length} متابع
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-1">
                <h1 className="break-words text-[1.28rem] font-semibold leading-7 tracking-tight text-foreground md:text-2xl md:leading-8">
                  {task.title}
                </h1>
                <p className="text-sm leading-6 text-muted-foreground md:hidden">
                  {mobileWorkspaceSummary}
                </p>
                <p className="hidden max-w-3xl text-sm leading-6 text-muted-foreground md:block">
                  {workspaceSummary}
                </p>
              </div>

              {task.tags.length > 0 ? (
                <div className="hidden flex-wrap gap-2 md:flex">
                  {task.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="h-7 rounded-full px-3 text-[11px]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:max-w-[24rem] xl:justify-end">
              {!isTaskClosed ? (
                <Button
                  type="button"
                  className={cn(
                    "col-span-2 h-11 justify-center rounded-2xl text-sm sm:col-span-1 sm:h-10",
                    timerOnThisTask
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : undefined,
                  )}
                  onClick={timerOnThisTask ? stopTimer : startTimer}
                  disabled={hasOtherRunningTimer}
                >
                  {timerOnThisTask ? (
                    <>
                      <StopIcon className="size-4" />
                      إيقاف المؤقت
                    </>
                  ) : (
                    <>
                      <PlayIcon className="size-4" />
                      بدء المؤقت
                    </>
                  )}
                </Button>
              ) : null}

              {task.status === "IN_REVIEW" && (
                isApprover ? (
                  <>
                    <Button
                      type="button"
                      className="h-11 justify-center rounded-2xl text-sm sm:h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => void updateTask({ status: "COMPLETED" })}
                      title="اعتماد وإنجاز المهمة"
                    >
                      <CheckCircleIcon className="size-4" />
                      اعتماد
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 justify-center rounded-2xl text-sm sm:h-10 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      onClick={() => void updateTask({ status: "IN_PROGRESS" })}
                      title="طلب تعديلات على المهمة"
                    >
                      <ArrowPathIcon className="size-4" />
                      طلب تعديلات
                    </Button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    بانتظار الاعتماد
                  </span>
                )
              )}

              <Button
                type="button"
                variant={isWatching ? "secondary" : "outline"}
                className="h-11 justify-center rounded-2xl text-sm sm:h-10"
                onClick={toggleWatcher}
              >
                <EyeIcon className="size-4" />
                {isWatching ? "إيقاف المتابعة" : "متابعة"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-11 justify-center rounded-2xl text-sm sm:h-10"
                onClick={() => navigate(`/tasks?edit=${task.id}`)}
              >
                <PencilIcon className="size-4" />
                تعديل
              </Button>

              <Button
                type="button"
                variant="destructive"
                className="hidden h-10 rounded-2xl md:inline-flex"
                onClick={() => {
                  if (window.confirm("هل أنت متأكد من حذف هذه المهمة؟")) {
                    deleteTask();
                  }
                }}
              >
                <TrashIcon className="size-4" />
                حذف
              </Button>
            </div>
          </div>

          {hasOtherRunningTimer ? (
            <div className="mt-4 rounded-[22px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              يوجد مؤقت يعمل على مهمة أخرى الآن. أوقفه أولًا إذا أردت تسجيل
              الوقت على هذه المهمة.
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-2 xl:grid-cols-4">
            <TaskWorkspaceStat
              label="التقدم"
              value={`${task.progress}%`}
              hint={
                task.status === "COMPLETED"
                  ? "مكتملة"
                  : task.progress > 0
                    ? "قابل للتحديث"
                    : "لم يبدأ"
              }
              tone={task.status === "COMPLETED" ? "success" : "primary"}
            />
            <TaskWorkspaceStat
              label="الاستحقاق"
              value={formatDate(task.dueDate)}
              hint={isOverdue ? "متأخرة" : "الموعد الحالي"}
              tone={isOverdue ? "warning" : "default"}
            />
            <div className="contents">
              <TaskWorkspaceStat
                label="الوقت المسجل"
                value={formatDuration(task.totalTimeMinutes)}
                hint={`مقابل ${task.estimatedHours || 0} ساعة مقدرة`}
                tone="default"
              />
            </div>
            <div className="contents">
              <TaskWorkspaceStat
                label="المسؤول"
                value={getPersonName(task.assignedUser)}
                hint={
                  task.watchersList.length > 0
                    ? `${task.watchersList.length} متابع على المهمة`
                    : "لا يوجد متابعون بعد"
                }
                tone="default"
              />
            </div>
          </div>
        </section>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.32fr)_23rem]">
          <div className="min-w-0 space-y-3">
            <BusinessSectionPanel
              title="لوحة التنفيذ"
              description="عدّل الحالة والملكية ونسبة الإنجاز من مساحة واحدة بدل التنقل بين كتل متعددة."
              contentClassName="space-y-4"
            >
              <div className="rounded-[22px] border border-border/65 bg-background/70 px-3.5 py-3.5 md:rounded-[24px] md:px-4 md:py-4">
                <p
                  className={cn(
                    "text-sm leading-7 text-foreground whitespace-pre-wrap",
                    isDescriptionCollapsed &&
                      "max-h-36 overflow-hidden md:max-h-none",
                  )}
                >
                  {taskDescription}
                </p>
                {shouldCollapseDescription ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-3 h-9 w-full rounded-full md:hidden"
                    onClick={() =>
                      setShowFullDescription((current) => !current)
                    }
                  >
                    {showFullDescription
                      ? "إخفاء التفاصيل"
                      : "عرض الوصف بالكامل"}
                  </Button>
                ) : null}
              </div>

              {isOverdue ? (
                <div className="rounded-[22px] border border-destructive/15 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                  المهمة متأخرة عن تاريخ الاستحقاق الحالي. راجع الحالة أو الموعد
                  أو نسبة الإنجاز حتى تبقى الصورة واضحة للفريق.
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    الحالة
                  </label>
                  <select
                    value={task.status}
                    onChange={(event) =>
                      void updateTask({ status: event.target.value })
                    }
                    className="business-control-input h-11 w-full rounded-2xl border border-border/70 bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    الأولوية
                  </label>
                  <select
                    value={task.priority}
                    onChange={(event) =>
                      void updateTask({ priority: event.target.value })
                    }
                    className="business-control-input h-11 w-full rounded-2xl border border-border/70 bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    المسؤول
                  </label>
                  <select
                    value={task.assignedUser?.id || ""}
                    onChange={(event) =>
                      void updateTask({ assignedTo: event.target.value })
                    }
                    className="business-control-input h-11 w-full rounded-2xl border border-border/70 bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getPersonName(user)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-[24px] border border-border/65 bg-background/70 px-4 py-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">التقدم</span>
                  <span className="font-semibold text-primary">
                    {task.progress}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={task.progress}
                  onChange={(event) =>
                    void updateTask({
                      progress: parseInt(event.target.value, 10),
                    })
                  }
                  className="w-full accent-[var(--color-primary)]"
                />

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <TaskWorkspaceStat
                  label="تاريخ البدء"
                  value={formatDate(task.startDate)}
                  hint="يمكن تعديل الموعد من بيانات المهمة الأساسية."
                  tone="default"
                />
                <TaskWorkspaceStat
                  label="آخر تحديث"
                  value={formatDate(task.updatedAt)}
                  hint="يعكس آخر تعديل تم حفظه على المهمة."
                  tone="default"
                />
              </div>

              <div className="flex justify-end md:hidden">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-destructive/25 text-destructive hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => {
                    if (window.confirm("هل أنت متأكد من حذف هذه المهمة؟")) {
                      deleteTask();
                    }
                  }}
                >
                  <TrashIcon className="size-4" />
                  حذف المهمة
                </Button>
              </div>
            </BusinessSectionPanel>

            <section className="rounded-[24px] border border-border/65 bg-card/64 p-2.5 shadow-[0_18px_54px_-48px_rgba(15,27,45,0.22)]">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? "border-primary/20 bg-primary/8 text-primary shadow-sm"
                        : "border-border/70 bg-background/75 text-muted-foreground hover:bg-background hover:text-foreground",
                    )}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          activeTab === tab.id
                            ? "bg-primary/12 text-primary"
                            : "bg-primary/8 text-primary/90",
                        )}
                      >
                        {tab.count}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>

            <div className="space-y-3">
              {activeTab === "subtasks" ? (
                <BusinessSectionPanel
                  title="المهام الفرعية"
                  description="قسّم العمل إلى خطوات أصغر عندما تحتاج المهمة إلى تسلسل واضح بدل قائمة طويلة من الملاحظات."
                  headerAside={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSubtaskForm((current) => !current)}
                    >
                      <PlusIcon className="size-4" />
                      مهمة فرعية
                    </Button>
                  }
                  contentClassName="space-y-4"
                >
                  {showSubtaskForm ? (
                    <div className="rounded-[26px] border border-border/70 bg-background/60 p-4">
                      <div className="grid gap-3">
                        <Input
                          value={newSubtask.title}
                          onChange={(event) =>
                            setNewSubtask((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          placeholder="عنوان المهمة الفرعية"
                          className="h-11 rounded-2xl"
                        />
                        <Textarea
                          value={newSubtask.description}
                          onChange={(event) =>
                            setNewSubtask((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          placeholder="وصف مختصر يساعد المنفذ على البدء"
                          className="min-h-28 rounded-2xl"
                        />
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowSubtaskForm(false)}
                          >
                            إلغاء
                          </Button>
                          <Button type="button" onClick={createSubtask}>
                            إضافة المهمة الفرعية
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {task.subtasks.length > 0 ? (
                    <div className="space-y-3">
                      {task.subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className="flex flex-col gap-3 rounded-[26px] border border-border/70 bg-background/65 px-4 py-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                updateSubtaskStatus(
                                  subtask.id,
                                  subtask.status === "COMPLETED"
                                    ? "PENDING"
                                    : "COMPLETED",
                                )
                              }
                              className={cn(
                                "mt-0.5 inline-flex size-6 items-center justify-center rounded-full border transition-colors",
                                subtask.status === "COMPLETED"
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-border/80 bg-background text-muted-foreground hover:border-primary hover:text-primary",
                              )}
                            >
                              {subtask.status === "COMPLETED" ? (
                                <CheckIcon className="size-3.5" />
                              ) : null}
                            </button>
                            <div className="min-w-0 space-y-1">
                              <Link
                                to={`/tasks/${subtask.id}`}
                                className={cn(
                                  "block text-sm font-semibold transition-colors hover:text-primary",
                                  subtask.status === "COMPLETED"
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground",
                                )}
                              >
                                {subtask.title}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {subtask.assignedUser
                                  ? getPersonName(subtask.assignedUser)
                                  : "بدون مسؤول محدد"}
                              </p>
                            </div>
                          </div>

                          <Badge
                            className={cn(
                              "h-7 shrink-0 px-3 text-sm",
                              getStatusBadgeClassName(subtask.status),
                            )}
                          >
                            {getStatusText(subtask.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <TaskEmptyState
                      title="لا توجد مهام فرعية"
                      description="أضف خطوة أولى إذا كانت هذه المهمة تحتاج تقسيمًا أو تسلسلاً واضحًا أثناء التنفيذ."
                    />
                  )}
                </BusinessSectionPanel>
              ) : null}

              {activeTab === "checklists" && id ? (
                <TaskChecklist taskId={id} onUpdate={fetchTaskDetails} />
              ) : null}

              {activeTab === "dependencies" && id ? (
                <TaskDependencies taskId={id} onUpdate={fetchTaskDetails} />
              ) : null}

              {activeTab === "comments" ? (
                <BusinessSectionPanel
                  title="التعليقات"
                  description="حافظ على النقاش والتنبيهات داخل المهمة نفسها حتى يبقى السياق واضحًا لكل من يراجعها لاحقًا."
                  contentClassName="space-y-4"
                >
                  <div className="rounded-[26px] border border-border/70 bg-background/60 p-4">
                    <MentionInput
                      value={newComment}
                      onChange={setNewComment}
                      placeholder="أضف تعليقًا واضحًا... استخدم @ للإشارة لشخص"
                      rows={3}
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        onClick={addComment}
                        disabled={!newComment.trim()}
                      >
                        إرسال التعليق
                      </Button>
                    </div>
                  </div>

                  {task.comments.length > 0 ? (
                    <div className="space-y-3">
                      {task.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-[26px] border border-border/70 bg-background/65 px-4 py-4"
                        >
                          <div className="flex items-start gap-3">
                            {comment.user?.avatar ? (
                              <img
                                src={comment.user.avatar}
                                alt=""
                                className="size-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                                <UserCircleIcon className="size-5" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {getPersonName(comment.user)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDateTime(comment.createdAt)}
                                    {comment.isEdited ? " • معدل" : ""}
                                  </p>
                                </div>

                                {comment.userId === currentUserId ? (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => {
                                        setEditingComment(comment.id);
                                        setEditCommentContent(comment.content);
                                      }}
                                    >
                                      <PencilIcon className="size-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => deleteComment(comment.id)}
                                    >
                                      <TrashIcon className="size-4" />
                                    </Button>
                                  </div>
                                ) : null}
                              </div>

                              {editingComment === comment.id ? (
                                <div className="space-y-3">
                                  <Textarea
                                    value={editCommentContent}
                                    onChange={(event) =>
                                      setEditCommentContent(event.target.value)
                                    }
                                    className="min-h-28 rounded-2xl"
                                  />
                                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingComment(null);
                                        setEditCommentContent("");
                                      }}
                                    >
                                      إلغاء
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => updateComment(comment.id)}
                                    >
                                      حفظ التعديل
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm leading-7 text-foreground whitespace-pre-wrap">
                                  {renderWithMentions(comment.content)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <TaskEmptyState
                      title="لا توجد تعليقات بعد"
                      description="أضف أول تحديث هنا بدل تشتيت النقاش خارج المهمة."
                    />
                  )}
                </BusinessSectionPanel>
              ) : null}

              {activeTab === "time" ? (
                <BusinessSectionPanel
                  title="سجل الوقت"
                  description="تابع الوقت الفعلي للمهمة وقارنه بالتقدير حتى تبقى الصورة التشغيلية واقعية."
                  headerAside={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setShowManualTimeForm((current) => !current)
                      }
                    >
                      <PlusIcon className="size-4" />
                      إضافة وقت يدوي
                    </Button>
                  }
                  contentClassName="space-y-4"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[24px] border border-border/65 bg-background/65 px-4 py-4">
                      <p className="text-xs font-semibold text-muted-foreground">
                        إجمالي الوقت المسجل
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                        {formatDuration(task.totalTimeMinutes)}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-border/65 bg-background/65 px-4 py-4">
                      <p className="text-xs font-semibold text-muted-foreground">
                        الوقت المقدر
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                        {task.estimatedHours || 0} ساعة
                      </p>
                    </div>
                  </div>

                  {showManualTimeForm ? (
                    <div className="rounded-[26px] border border-border/70 bg-background/60 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground">
                            ساعات
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={manualTimeEntry.hours}
                            onChange={(event) =>
                              setManualTimeEntry((current) => ({
                                ...current,
                                hours: parseInt(event.target.value, 10) || 0,
                              }))
                            }
                            className="h-11 rounded-2xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground">
                            دقائق
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={manualTimeEntry.minutes}
                            onChange={(event) =>
                              setManualTimeEntry((current) => ({
                                ...current,
                                minutes: parseInt(event.target.value, 10) || 0,
                              }))
                            }
                            className="h-11 rounded-2xl"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-semibold text-muted-foreground">
                            الوصف
                          </label>
                          <Input
                            value={manualTimeEntry.description}
                            onChange={(event) =>
                              setManualTimeEntry((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            placeholder="ما الذي تم إنجازه خلال هذا الوقت؟"
                            className="h-11 rounded-2xl"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowManualTimeForm(false)}
                        >
                          إلغاء
                        </Button>
                        <Button
                          type="button"
                          onClick={addManualTime}
                          disabled={
                            manualTimeEntry.hours === 0 &&
                            manualTimeEntry.minutes === 0
                          }
                        >
                          حفظ الوقت
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {task.timeEntries.length > 0 ? (
                    <div className="space-y-3">
                      {task.timeEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-col gap-2 rounded-[24px] border border-border/70 bg-background/65 px-4 py-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">
                              {formatDuration(entry.duration)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getPersonName(entry.user)} •{" "}
                              {formatDateTime(entry.startTime)}
                            </p>
                          </div>
                          {entry.description ? (
                            <p className="text-sm leading-7 text-muted-foreground">
                              {entry.description}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <TaskEmptyState
                      title="لا توجد سجلات وقت"
                      description="ابدأ المؤقت أو أضف وقتًا يدويًا عندما تريد تتبع الجهد المبذول على هذه المهمة."
                    />
                  )}
                </BusinessSectionPanel>
              ) : null}

              {activeTab === "attachments" ? (
                <BusinessSectionPanel
                  title="المرفقات"
                  description="اجمع الملفات المهمة هنا حتى لا تظل موزعة بين المحادثات أو أجهزة الفريق."
                  headerAside={
                    <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                      <PaperClipIcon className="size-4" />
                      {uploading ? "جاري الرفع..." : "رفع مرفق"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            uploadAttachment(file);
                          }
                        }}
                        disabled={uploading}
                      />
                    </label>
                  }
                  contentClassName="space-y-3"
                >
                  {task.attachments.length > 0 ? (
                    task.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex flex-col gap-3 rounded-[24px] border border-border/70 bg-background/65 px-4 py-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {attachment.originalName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {`${(attachment.fileSize / 1024).toFixed(1)} KB`} •{" "}
                            {getPersonName(attachment.user)} •{" "}
                            {formatDate(attachment.createdAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={attachment.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <PaperClipIcon className="size-4" />
                            فتح
                          </a>
                          {attachment.userId === currentUserId ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => deleteAttachment(attachment.id)}
                            >
                              <TrashIcon className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <TaskEmptyState
                      title="لا توجد مرفقات"
                      description="أضف أي ملفات أو مستندات مرتبطة بالمهمة حتى تبقى كل المواد في مكان واحد."
                    />
                  )}
                </BusinessSectionPanel>
              ) : null}

              {activeTab === "activity" ? (
                <BusinessSectionPanel
                  title="النشاط"
                  description="سجل التحديثات يساعدك على فهم ما الذي تغير ومتى، خصوصًا عندما يراجع المهمة أكثر من شخص."
                  contentClassName="space-y-3"
                >
                  {task.activities.length > 0 ? (
                    task.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 rounded-[24px] border border-border/70 bg-background/65 px-4 py-4"
                      >
                        {activity.user?.avatar ? (
                          <img
                            src={activity.user.avatar}
                            alt=""
                            className="size-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                            <UserCircleIcon className="size-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm leading-7 text-foreground">
                            <span className="font-semibold">
                              {getPersonName(activity.user)}
                            </span>{" "}
                            {activity.description || activity.action}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <TaskEmptyState
                      title="لا توجد نشاطات بعد"
                      description="بمجرد حصول تحديثات أو تعليقات أو تغييرات على المهمة ستظهر هنا بشكل زمني واضح."
                    />
                  )}
                </BusinessSectionPanel>
              ) : null}
            </div>
          </div>

          <aside className="min-w-0 space-y-3 xl:sticky xl:top-4 xl:self-start">
            <BusinessSectionPanel
              title="السياق والملكية"
              description="معلومة واحدة لكل قرار: من يملك المهمة، أين تقع، ومتى بدأت أو تنتهي."
              contentClassName="space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <TaskInfoRow
                  label="المشروع"
                  value={
                    task.project ? (
                      <span className="text-primary">{task.project.name}</span>
                    ) : (
                      "بدون مشروع"
                    )
                  }
                  icon={<FolderIcon className="size-4" />}
                  emphasized={Boolean(task.project)}
                />
                <TaskInfoRow
                  label="الهدف المرتبط"
                  value={
                    task.goalTitle ? (
                      <span className="text-primary">{task.goalTitle}</span>
                    ) : (
                      "غير مرتبط بهدف"
                    )
                  }
                  icon={<CheckIcon className="size-4" />}
                  emphasized={Boolean(task.goalTitle)}
                />
                {task.parentTask ? (
                  <TaskInfoRow
                    label="المهمة الأصلية"
                    value={
                      <Link
                        to={`/tasks/${task.parentTask.id}`}
                        className="text-primary transition-colors hover:text-primary/80"
                      >
                        {task.parentTask.title}
                      </Link>
                    }
                    icon={<DependencyIcon className="size-4" />}
                    emphasized
                  />
                ) : null}
                <TaskInfoRow
                  label="المسؤول"
                  value={getPersonName(task.assignedUser)}
                  icon={<UserCircleIcon className="size-4" />}
                  emphasized
                />
                <TaskInfoRow
                  label="منشئ المهمة"
                  value={getPersonName(task.createdByUser)}
                  icon={<UserCircleIcon className="size-4" />}
                />
                <TaskInfoRow
                  label="تاريخ البدء"
                  value={formatDate(task.startDate)}
                  icon={<CalendarIcon className="size-4" />}
                />
                <TaskInfoRow
                  label="تاريخ الاستحقاق"
                  value={
                    <span
                      className={cn(isOverdue ? "text-destructive" : undefined)}
                    >
                      {formatDate(task.dueDate)}
                    </span>
                  }
                  icon={<CalendarIcon className="size-4" />}
                  emphasized={isOverdue}
                />
                <TaskInfoRow
                  label="الوقت الفعلي"
                  value={formatDuration(task.totalTimeMinutes)}
                  icon={<ClockIcon className="size-4" />}
                />
                <TaskInfoRow
                  label="أسلوب القياس"
                  value={
                    task.measurementType === "TIME"
                      ? "زمني"
                      : `${getMeasurementTypeText(task.measurementType)}${
                          task.metricUnit ? ` • ${task.metricUnit}` : ""
                        }`
                  }
                  icon={<ClockIcon className="size-4" />}
                />
                {task.measurementType !== "TIME" ? (
                  <TaskInfoRow
                    label="التقدم العددي"
                    value={`${Number(task.metricCurrentValue || 0).toLocaleString("ar-EG")} / ${Number(task.metricTargetValue || 0).toLocaleString("ar-EG")}`}
                    icon={<CheckIcon className="size-4" />}
                  />
                ) : null}
                <TaskInfoRow
                  label="تاريخ الإنشاء"
                  value={formatDate(task.createdAt)}
                  icon={<CalendarIcon className="size-4" />}
                />
              </div>

              {task.watchersList.length > 0 ? (
                <div className="rounded-[24px] border border-border/65 bg-background/70 px-4 py-4">
                  <p className="mb-3 text-xs font-semibold text-muted-foreground">
                    المتابعون
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {task.watchersList.map((watcher) => (
                      <span
                        key={watcher.id}
                        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm text-foreground"
                      >
                        <UserCircleIcon className="size-4 text-primary" />
                        {getPersonName(watcher)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </BusinessSectionPanel>
          </aside>
        </div>
      </div>

      <div className="hidden">
        <div className="business-page-panel rounded-[24px] border border-border/70 bg-card/95 px-3 py-3 shadow-[0_18px_42px_-28px_rgba(15,27,45,0.45)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {activeTabItem.label}
              </p>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {timerOnThisTask
                  ? "المؤقت يعمل الآن على هذه المهمة."
                  : isOverdue
                    ? "المهمة تحتاج متابعة سريعة."
                    : "التعليقات والمؤقت والتعديل قريبون منك."}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setActiveTab("comments")}
            >
              التعليقات
            </Button>

            {!isTaskClosed ? (
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={timerOnThisTask ? stopTimer : startTimer}
                disabled={hasOtherRunningTimer}
              >
                {timerOnThisTask ? "إيقاف" : "مؤقت"}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={() => navigate(`/tasks?edit=${task.id}`)}
              >
                تعديل
              </Button>
            )}
          </div>
        </div>
      </div>
    </BusinessPageShell>
  );
};

export default TaskDetailsPage;
