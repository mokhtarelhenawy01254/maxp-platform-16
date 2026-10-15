import type { TaskScopeFilter, TaskSortBy, TaskViewMode } from "./types";

export type TaskWorkspacePageSize = 10 | 25 | 50 | 100;
export type TaskWorkspaceDensity = "comfortable" | "compact";

export interface TaskWorkspaceSettings {
  density: TaskWorkspaceDensity;
  defaultScope: TaskScopeFilter;
  defaultSortBy: TaskSortBy;
  defaultSortOrder: "asc" | "desc";
  pageSize: TaskWorkspacePageSize;
  hideCompletedByDefault: boolean;
  highlightOverdue: boolean;
  showProjectShortcut: boolean;
  showMobileCommandBar: boolean;
  viewMode: TaskViewMode;
}

export const DEFAULT_TASK_WORKSPACE_SETTINGS: TaskWorkspaceSettings = {
  density: "compact",
  defaultScope: "all",
  defaultSortBy: "createdAt",
  defaultSortOrder: "desc",
  pageSize: 50,
  hideCompletedByDefault: true,
  highlightOverdue: true,
  showProjectShortcut: true,
  showMobileCommandBar: true,
  viewMode: "grouped",
};

const TASK_WORKSPACE_SETTINGS_KEY = "task-workspace-settings";
const VALID_PAGE_SIZES: TaskWorkspacePageSize[] = [10, 25, 50, 100];
const VALID_SCOPE_VALUES: TaskScopeFilter[] = [
  "all",
  "my-tasks",
  "assigned-by-me",
];
const VALID_SORT_BY_VALUES: TaskSortBy[] = [
  "createdAt",
  "dueDate",
  "priority",
  "status",
  "title",
];
const VALID_SORT_ORDER_VALUES: Array<"asc" | "desc"> = ["asc", "desc"];
const VALID_DENSITY_VALUES: TaskWorkspaceDensity[] = ["comfortable", "compact"];
const VALID_VIEW_MODE_VALUES: TaskViewMode[] = ["grouped", "flat"];

export const MANAGER_TASK_ROLES = [
  "OWNER",
  "COMPANY_ADMIN",
  "SUPER_ADMIN",
  "MANAGER",
] as const;

export const isTaskManagerRole = (role?: string | null): boolean =>
  MANAGER_TASK_ROLES.some((entry) => entry === (role || "").toUpperCase());

export const getTaskWorkspaceSettingsStorageKey = (
  companyId?: string | null,
  userId?: string | number | null,
): string => {
  const companyScope = companyId || "global";
  const userScope = userId ? String(userId) : "anonymous";

  return `${TASK_WORKSPACE_SETTINGS_KEY}:${companyScope}:${userScope}`;
};

export const normalizeTaskWorkspaceSettings = (
  value: unknown,
): TaskWorkspaceSettings => {
  if (!value || typeof value !== "object") {
    return DEFAULT_TASK_WORKSPACE_SETTINGS;
  }

  const candidate = value as Partial<TaskWorkspaceSettings>;

  return {
    density: VALID_DENSITY_VALUES.includes(
      candidate.density as TaskWorkspaceDensity,
    )
      ? (candidate.density as TaskWorkspaceDensity)
      : DEFAULT_TASK_WORKSPACE_SETTINGS.density,
    defaultScope: VALID_SCOPE_VALUES.includes(
      candidate.defaultScope as TaskScopeFilter,
    )
      ? (candidate.defaultScope as TaskScopeFilter)
      : DEFAULT_TASK_WORKSPACE_SETTINGS.defaultScope,
    defaultSortBy: VALID_SORT_BY_VALUES.includes(
      candidate.defaultSortBy as TaskSortBy,
    )
      ? (candidate.defaultSortBy as TaskSortBy)
      : DEFAULT_TASK_WORKSPACE_SETTINGS.defaultSortBy,
    defaultSortOrder: VALID_SORT_ORDER_VALUES.includes(
      candidate.defaultSortOrder as "asc" | "desc",
    )
      ? (candidate.defaultSortOrder as "asc" | "desc")
      : DEFAULT_TASK_WORKSPACE_SETTINGS.defaultSortOrder,
    pageSize: VALID_PAGE_SIZES.includes(
      candidate.pageSize as TaskWorkspacePageSize,
    )
      ? (candidate.pageSize as TaskWorkspacePageSize)
      : DEFAULT_TASK_WORKSPACE_SETTINGS.pageSize,
    hideCompletedByDefault:
      typeof candidate.hideCompletedByDefault === "boolean"
        ? candidate.hideCompletedByDefault
        : DEFAULT_TASK_WORKSPACE_SETTINGS.hideCompletedByDefault,
    highlightOverdue:
      typeof candidate.highlightOverdue === "boolean"
        ? candidate.highlightOverdue
        : DEFAULT_TASK_WORKSPACE_SETTINGS.highlightOverdue,
    showProjectShortcut:
      typeof candidate.showProjectShortcut === "boolean"
        ? candidate.showProjectShortcut
        : DEFAULT_TASK_WORKSPACE_SETTINGS.showProjectShortcut,
    showMobileCommandBar:
      typeof candidate.showMobileCommandBar === "boolean"
        ? candidate.showMobileCommandBar
        : DEFAULT_TASK_WORKSPACE_SETTINGS.showMobileCommandBar,
    viewMode: VALID_VIEW_MODE_VALUES.includes(
      candidate.viewMode as TaskViewMode,
    )
      ? (candidate.viewMode as TaskViewMode)
      : DEFAULT_TASK_WORKSPACE_SETTINGS.viewMode,
  };
};

export const loadTaskWorkspaceSettings = (
  storage: Pick<Storage, "getItem"> | null | undefined,
  companyId?: string | null,
  userId?: string | number | null,
): TaskWorkspaceSettings => {
  if (!storage) {
    return DEFAULT_TASK_WORKSPACE_SETTINGS;
  }

  try {
    const rawValue = storage.getItem(
      getTaskWorkspaceSettingsStorageKey(companyId, userId),
    );

    if (!rawValue) {
      return DEFAULT_TASK_WORKSPACE_SETTINGS;
    }

    return normalizeTaskWorkspaceSettings(JSON.parse(rawValue));
  } catch (error) {
    return DEFAULT_TASK_WORKSPACE_SETTINGS;
  }
};

export const saveTaskWorkspaceSettings = (
  storage: Pick<Storage, "setItem"> | null | undefined,
  companyId: string | null | undefined,
  userId: string | number | null | undefined,
  settings: TaskWorkspaceSettings,
): TaskWorkspaceSettings => {
  const normalized = normalizeTaskWorkspaceSettings(settings);

  if (!storage) {
    return normalized;
  }

  try {
    storage.setItem(
      getTaskWorkspaceSettingsStorageKey(companyId, userId),
      JSON.stringify(normalized),
    );
  } catch (error) {
    return normalized;
  }

  return normalized;
};
