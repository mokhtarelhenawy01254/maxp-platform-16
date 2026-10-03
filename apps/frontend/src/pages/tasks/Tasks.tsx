import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import { buildApiUrl } from "../../utils/urlHelper";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { tokenManager } from "../../utils/tokenManager";
import {
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  PauseCircleIcon,
} from "@heroicons/react/24/outline";
import { TaskFilters } from "./components/TaskFilters";
import { CreateTaskModal } from "./components/CreateTaskModal";
import { CreateGoalModal } from "./components/CreateGoalModal";
import { GoalProgressStrip } from "./components/GoalProgressStrip";
import { TaskTable } from "./components/TaskTable";
import { ProjectsTab } from "./components/ProjectsTab";
import { CategoriesTab } from "./components/CategoriesTab";
import { CategoryModal } from "./components/CategoryModal";
import { EditCategoryModal } from "./components/EditCategoryModal";
import { TaskDetailsModal } from "./components/TaskDetailsModal";
import { EditTaskModal } from "./components/EditTaskModal";
import { CreateProjectModal } from "./components/CreateProjectModal";
import { ProjectDetailsModal } from "./components/ProjectDetailsModal";
import { EditProjectModal } from "./components/EditProjectModal";
import { FilterSidebar } from "./components/FilterSidebar";
import { TaskIntegrationsTab } from "./components/TaskIntegrationsTab";
import { TaskSettingsTab } from "./components/TaskSettingsTab";
import { TaskWorkspaceHeader } from "./components/TaskWorkspaceHeader";

import { BusinessPageShell } from "../../components/business/BusinessSurface";
import { Button } from "../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import type {
  Project,
  ProjectDraft,
  RecurringTaskConfig,
  Task,
  TaskCategory,
  TaskDraft,
  TaskFiltersState,
  TaskPageTab,
  TaskScopeFilter,
  TaskSortBy,
  TaskTemplate,
  TaskUser,
  CategoryDraft,
  GoalOption,
} from "./types";
import {
  DEFAULT_TASK_WORKSPACE_SETTINGS,
  loadTaskWorkspaceSettings,
  saveTaskWorkspaceSettings,
} from "./taskWorkspaceSettings";
import type { TaskWorkspaceSettings } from "./taskWorkspaceSettings";

const TASK_PAGE_ROUTES: Record<TaskPageTab, string> = {
  tasks: "/tasks",
  projects: "/tasks/projects",
  categories: "/tasks/categories",
  integrations: "/tasks/integrations",
  settings: "/tasks/settings",
};

const getAccessToken = (): string | null => tokenManager.getAccessToken();

const getTaskPageTabFromPathname = (pathname: string): TaskPageTab => {
  if (pathname === TASK_PAGE_ROUTES.projects) {
    return "projects";
  }

  if (pathname === TASK_PAGE_ROUTES.categories) {
    return "categories";
  }

  if (pathname === TASK_PAGE_ROUTES.integrations) {
    return "integrations";
  }

  if (pathname === TASK_PAGE_ROUTES.settings) {
    return "settings";
  }

  return "tasks";
};

const ensureArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const normalizeTaskStatus = (status: string | null | undefined): string =>
  String(status || "").toLowerCase();

const createInitialTaskDraft = (
  userId: string,
  userName: string,
): TaskDraft => ({
  projectId: "",
  categoryId: "",
  goalId: "",
  title: "",
  description: "",
  priority: "medium",
  type: "manual",
  assignedTo: userId,
  assignedToName: userName,
  createdBy: userId,
  createdByName: userName,
  dueDate: "",
  startDate: "",
  estimatedHours: 0,
  measurementType: "TIME",
  metricUnit: "",
  metricTargetValue: null,
  metricCurrentValue: 0,
  tags: [],
});

interface TasksProps {
  embeddedInModal?: boolean;
}

const Tasks: React.FC<TasksProps> = ({ embeddedInModal }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const [modalActiveTab, setModalActiveTab] = useState<TaskPageTab>("tasks");
  const activeTab = embeddedInModal ? modalActiveTab : getTaskPageTabFromPathname(location.pathname);
  const activeCompanyId = user?.companyId ?? null;
  const activeUserId =
    (user?.id ? String(user.id) : null) || localStorage.getItem("userId");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceSettings, setWorkspaceSettings] =
    useState<TaskWorkspaceSettings>(DEFAULT_TASK_WORKSPACE_SETTINGS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [filters, setFilters] = useState<TaskFiltersState>({
    projectId: "",
    categoryId: "",
    status: "",
    priority: "",
    assignedTo: "",
    dueDateFrom: "",
    dueDateTo: "",
  });
  const [taskFilter, setTaskFilter] = useState<TaskScopeFilter>("all");
  const [hideCompleted, setHideCompleted] = useState(true); // Ø¥Ø®ÙØ§Ø¡ Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ù…ÙƒØªÙ…Ù„Ø© Ø§ÙØªØ±Ø§Ø¶ÙŠØ§Ù‹

  // New features states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<TaskSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [serverTotalTasks, setServerTotalTasks] = useState(0);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // Users state
  const [users, setUsers] = useState<TaskUser[]>([]);

  // Project modals
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Edit states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);

  // Categories states
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(
    null,
  );
  const [newCategory, setNewCategory] = useState<CategoryDraft>({
    name: "",
    description: "",
    color: "#6366f1",
  });

  // Filter sidebar state
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const bulkActionsRef = React.useRef<HTMLDivElement | null>(null);
  const [confirmState, setConfirmState] = useState<{
    show: boolean;
    message: string;
    onConfirm: () => void;
  }>({ show: false, message: "", onConfirm: () => {} });

  const requestConfirm = (message: string, onConfirm: () => void) => {
    setConfirmState({ show: true, message, onConfirm });
  };

  const [newProject, setNewProject] = useState<ProjectDraft>({
    name: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    startDate: "",
    endDate: "",
    budget: 0,
    managerId: "",
    teamMembers: [] as string[],
    tags: [] as string[],
  });

  const [newTask, setNewTask] = useState<TaskDraft>(() =>
    createInitialTaskDraft(
      localStorage.getItem("userId") || "",
      localStorage.getItem("userName") || "",
    ),
  );

  // Recurring task state
  const [recurringConfig, setRecurringConfig] = useState<RecurringTaskConfig>({
    enabled: false,
    frequency: "weekly" as "daily" | "weekly" | "monthly" | "yearly",
    interval: 1,
    daysOfWeek: [] as number[],
    dayOfMonth: 1,
    endType: "never" as "never" | "date" | "count",
    endDate: "",
    endCount: 10,
  });

  // Templates state
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const previousCompanyIdRef = React.useRef<string | null>(null);
  const canManageIntegrations = [
    "OWNER",
    "COMPANY_ADMIN",
    "SUPER_ADMIN",
  ].includes(user?.role || "");
  const isApprover = [
    "SUPER_ADMIN",
    "COMPANY_ADMIN",
    "OWNER",
    "MANAGER",
  ].includes(user?.role || "");

  useEffect(() => {
    if (activeTab === "integrations" && !canManageIntegrations) {
      if (embeddedInModal) {
        setModalActiveTab("tasks");
        return;
      }
      navigate(TASK_PAGE_ROUTES.tasks, { replace: true });
    }
  }, [activeTab, canManageIntegrations, navigate, embeddedInModal]);

  useEffect(() => {
    const handler = setTimeout(
      () => setDebouncedSearch(searchQuery.trim()),
      300,
    );
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const nextSettings = loadTaskWorkspaceSettings(
      typeof window !== "undefined" ? window.localStorage : null,
      activeCompanyId,
      activeUserId,
    );

    setWorkspaceSettings(nextSettings);
  }, [activeCompanyId, activeUserId]);

  const settingsAppliedRef = React.useRef(false);

  useEffect(() => {
    if (!settingsAppliedRef.current) {
      settingsAppliedRef.current = true;
      return;
    }
    setTaskFilter(workspaceSettings.defaultScope);
    setSortBy(workspaceSettings.defaultSortBy);
    setSortOrder(workspaceSettings.defaultSortOrder);
    setItemsPerPage(workspaceSettings.pageSize);
    setHideCompleted(workspaceSettings.hideCompletedByDefault);
    setCurrentPage(1);
  }, [workspaceSettings]);

  useEffect(() => {
    settingsAppliedRef.current = false;
  }, [activeCompanyId, activeUserId]);

  // Data refresh here is intentionally driven by the current workspace controls.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!activeCompanyId) {
      return;
    }

    fetchTasks();
  }, [
    activeCompanyId,
    filters,
    taskFilter,
    currentPage,
    itemsPerPage,
    debouncedSearch,
    sortBy,
    sortOrder,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Bootstrap auxiliary data once when entering the tasks section.
  useEffect(() => {
    if (!activeCompanyId) {
      return;
    }

    fetchProjects();
    fetchGoals();
    fetchUsers();
    fetchCategories();
    fetchTemplates();
  }, [activeCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeEditModal = () => {
    setShowEditTaskModal(false);
    setEditingTask(null);
    const params = new URLSearchParams(location.search);
    if (params.has("edit")) {
      params.delete("edit");
      const nextSearch = params.toString() ? `?${params.toString()}` : "";
      navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
    }
  };

  // Open edit modal if ?edit=taskId is present in the URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const editTaskId = searchParams.get("edit");
    if (!editTaskId) return;

    const existing = tasks.find((t) => t.id === editTaskId);
    if (existing) {
      setEditingTask(existing);
      setShowEditTaskModal(true);
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    fetch(buildApiUrl(`tasks/${editTaskId}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setEditingTask(data.data);
          setShowEditTaskModal(true);
        }
      })
      .catch((err) => console.error("Error opening edit modal from URL param:", err));
  }, [location.search, tasks]);

  useEffect(() => {
    if (!activeCompanyId) {
      return;
    }

    const previousCompanyId = previousCompanyIdRef.current;
    previousCompanyIdRef.current = activeCompanyId;

    if (!previousCompanyId || previousCompanyId === activeCompanyId) {
      return;
    }

    setSelectedTask(null);
    setShowTaskModal(false);
    setShowCreateTaskModal(false);
    setEditingTask(null);
    setShowEditTaskModal(false);
    setSelectedProject(null);
    setShowProjectModal(false);
    setShowCreateProjectModal(false);
    setEditingProject(null);
    setShowEditProjectModal(false);
    setShowCategoryModal(false);
    setEditingCategory(null);
    setShowTemplateSelector(false);
    setShowFilterSidebar(false);
    setSelectedTasks([]);
    setCurrentPage(1);
  }, [activeCompanyId]);

  const fetchTemplates = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("tasks/templates"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as {
        success?: boolean;
        data?: TaskTemplate[];
      };
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const applyTemplate = (template: TaskTemplate) => {
    setNewTask({
      ...newTask,
      title: template.title,
      description: template.description || "",
      priority: template.priority || "medium",
      estimatedHours: template.estimatedHours || 0,
      tags: template.tags || [],
    });
    setShowTemplateSelector(false);
  };

  const fetchUsers = async () => {
    try {
      const token = getAccessToken();

      if (!token) return;

      const response = await fetch(buildApiUrl("tasks/company-users"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Error fetching company users:", {
          status: response.status,
          code: errData?.code,
          message: errData?.message || response.statusText,
        });
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.data || []);
        const firstCompanyUser = data.data?.[0];
        if (firstCompanyUser) {
          setNewTask((prev) =>
            prev.assignedTo
              ? prev
              : {
                  ...prev,
                  assignedTo: firstCompanyUser.id,
                  assignedToName:
                    firstCompanyUser.name ||
                    `${firstCompanyUser.firstName || ""} ${firstCompanyUser.lastName || ""}`.trim(),
                },
          );
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  const fetchCategories = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await fetch(buildApiUrl("tasks/categories/list"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCategories(data.data || []);
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  const createCategory = async () => {
    try {
      const token = getAccessToken();
      if (!newCategory.name.trim()) {
        tToast.error("tasks.name_required_9466");
        return;
      }

      const response = await fetch(buildApiUrl("tasks/categories"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCategory),
      });

      const data = await response.json();
      if (data.success) {
        fetchCategories();
        setShowCategoryModal(false);
        setNewCategory({ name: "", description: "", color: "#6366f1" });
        tToast.success("tasks.success_create_d422");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_cae9"));
      }
    } catch (error) {
      tToast.error("tasks.failed_create_1d0b");
    }
  };

  const updateCategory = async () => {
    if (!editingCategory) return;
    try {
      const token = getAccessToken();
      const response = await fetch(
        buildApiUrl(`tasks/categories/${editingCategory.id}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editingCategory.name,
            description: editingCategory.description,
            color: editingCategory.color,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        fetchCategories();
        setEditingCategory(null);
        tToast.success("tasks.success_update_6b8e");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_8581"));
      }
    } catch (error) {
      tToast.error("tasks.failed_update_ef21");
    }
  };

  const deleteCategory = async (categoryId: string) => {
    requestConfirm("هل أنت متأكد من حذف هذا القسم؟", async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(
        buildApiUrl(`tasks/categories/${categoryId}`),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json();
      if (data.success) {
        fetchCategories();
        tToast.success("tasks.success_delete_904a");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_c6d3"));
      }
    } catch (error) {
      tToast.error("tasks.failed_delete_93ed");
    }
    });
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();

      if (!token) {
        setLoading(false);
        return;
      }

      let url = "tasks";

      // Use different endpoint based on filter
      if (taskFilter === "my-tasks") {
        url = "tasks/my-tasks";
      } else if (taskFilter === "assigned-by-me") {
        url = "tasks/assigned-by-me";
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      if (debouncedSearch) {
        queryParams.append("search", debouncedSearch);
      }
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", itemsPerPage.toString());
      queryParams.append("sortBy", sortBy);
      queryParams.append("sortOrder", sortOrder);

      const queryString = queryParams.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;

      const response = await fetch(buildApiUrl(fullUrl), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          tToast.error("tasks.expired_session_please_5957");
        } else {
          tToast.error("tasks.unable_load_tasks_f3df");
        }
        return;
      }

      const data = await response.json();

      if (data.success) {
        const nextTasks = ensureArray<Task>(
          data.data?.tasks || data.data?.items || data.data || data.tasks,
        );
        setTasks(nextTasks);
        if (data.pagination) {
          setServerTotalPages(data.pagination.totalPages);
          setServerTotalTasks(data.pagination.total);
        } else {
          setServerTotalPages(1);
          setServerTotalTasks(nextTasks.length);
        }
      }
    } catch (error) {
      tToast.error("tasks.unable_connect_check_ccf9");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = getAccessToken();

      if (!token) return;

      const response = await fetch(buildApiUrl("projects"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          tToast.error("tasks.expired_session_please_5957");
        }
        return;
      }

      const data = await response.json();

      if (data.success) {
        setProjects(
          ensureArray<Project>(data.data?.projects || data.data || data.projects),
        );
      }
    } catch (error) {
      tToast.error("tasks.unable_load_436e");
    }
  };

  const fetchGoals = async () => {
    try {
      const token = getAccessToken();

      if (!token) return;

      const response = await fetch(buildApiUrl("tasks/goals"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.success) {
        setGoals(ensureArray<GoalOption>(data.goals || data.data || data.tasks));
      }
    } catch (error) {
      // Silent fail for goals (non-critical)
    }
  };

  const createTask = async () => {
    try {
      const token = getAccessToken();

      if (!token) {
        tToast.error("tasks.login_login_2098");
        return;
      }

      const url = buildApiUrl("tasks");

      const payload = {
        ...newTask,
        isRecurring: Boolean(recurringConfig?.enabled),
        recurringRule: recurringConfig?.enabled ? JSON.stringify(recurringConfig) : null,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(
          data.message ||
            data.error ||
            `فشل في إنشاء المهمة (${response.status})`,
        );
        return;
      }

      if (data.success) {
        fetchTasks();
        setShowCreateTaskModal(false);
        setNewTask(
          createInitialTaskDraft(
            localStorage.getItem("userId") || "",
            localStorage.getItem("userName") || "",
          ),
        );
        setRecurringConfig({
          enabled: false,
          frequency: "weekly",
          interval: 1,
          daysOfWeek: [],
          dayOfMonth: 1,
          endType: "never",
          endDate: "",
          endCount: 10,
        });
        tToast.success("tasks.success_create_7c46");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_6bd6"));
      }
    } catch (error) {
      tToast.error("tasks.failed_create_608b");
    }
  };

  const updateTaskStatus = async (
    taskId: string,
    status: string,
    progress?: number,
  ) => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${taskId}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, progress }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(data.data);
        }
        tToast.success("tasks.success_update_ea66");
      }
    } catch (error) {
      tToast.error("tasks.failed_update_0068");
    }
  };

  // Create Project
  const createProject = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("projects"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProject),
      });

      const data = await response.json();
      if (data.success) {
        fetchProjects();
        setShowCreateProjectModal(false);
        setNewProject({
          name: "",
          description: "",
          priority: "medium",
          startDate: "",
          endDate: "",
          budget: 0,
          managerId: "",
          teamMembers: [],
          tags: [],
        });
        tToast.success("tasks.success_create_2cab");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_8d05"));
      }
    } catch (error) {
      tToast.error("tasks.failed_create_19dc");
    }
  };

  // Update Task
  const updateTask = async () => {
    if (!editingTask) return;
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${editingTask.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Only send editable fields â€” never send relational/computed fields like projectName, assignedToName
        body: JSON.stringify({
          projectId: editingTask.projectId || null,
          title: editingTask.title,
          description: editingTask.description,
          priority: editingTask.priority,
          type: editingTask.type,
          assignedTo: editingTask.assignedTo,
          dueDate: editingTask.dueDate || null,
          startDate: editingTask.startDate || null,
          estimatedHours: editingTask.estimatedHours,
          actualHours: editingTask.actualHours,
          progress: editingTask.progress,
          tags: editingTask.tags,
          categoryId: editingTask.categoryId || null,
          goalId: editingTask.goalId || null,
          measurementType: editingTask.measurementType,
          metricUnit: editingTask.metricUnit || null,
          metricTargetValue: editingTask.metricTargetValue,
          metricCurrentValue: editingTask.metricCurrentValue,
          isRecurring: editingTask.isRecurring,
          recurringRule: editingTask.recurringRule,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
        closeEditModal();
        tToast.success("tasks.success_update_b5ad");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_3840"));
      }
    } catch (error) {
      tToast.error("tasks.failed_update_c51e");
    }
  };

  // Duplicate Task
  const duplicateTask = async (task: Task) => {
    try {
      const token = getAccessToken();
      if (!token) { tToast.error("tasks.login_login_2098"); return; }

      const response = await fetch(buildApiUrl("tasks"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: task.projectId,
          categoryId: task.categoryId,
          goalId: task.goalId,
          title: `${task.title} (نسخة)`,
          description: task.description,
          priority: task.priority,
          type: task.type,
          assignedTo: task.assignedTo,
          dueDate: task.dueDate,
          startDate: task.startDate,
          estimatedHours: task.estimatedHours,
          tags: task.tags,
          measurementType: task.measurementType,
          metricUnit: task.metricUnit,
          metricTargetValue: task.metricTargetValue,
          metricCurrentValue: task.metricCurrentValue,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
        tToast.success("tasks.msg_178a");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_bbd2"));
      }
    } catch (error) {
      tToast.error("tasks.msg_56ed");
    }
  };

  // Delete Task
  const deleteTask = async (taskId: string) => {
    requestConfirm("هل أنت متأكد من حذف هذه المهمة؟", async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`tasks/${taskId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
        setShowTaskModal(false);
        setSelectedTask(null);
        tToast.success("tasks.success_delete_04cd");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_f06f"));
      }
    } catch (error) {
      tToast.error("tasks.failed_delete_6cbf");
    }
    });
  };

  // Update Project
  const updateProject = async () => {
    if (!editingProject) return;
    try {
      const token = getAccessToken();
      const response = await fetch(
        buildApiUrl(`projects/${editingProject.id}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editingProject),
        },
      );

      const data = await response.json();
      if (data.success) {
        fetchProjects();
        setShowEditProjectModal(false);
        setEditingProject(null);
        tToast.success("tasks.success_update_2a08");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_199a"));
      }
    } catch (error) {
      tToast.error("tasks.failed_update_f0bf");
    }
  };

  // Delete Project
  const deleteProject = async (projectId: string) => {
    requestConfirm("هل أنت متأكد من حذف هذا المشروع؟", async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl(`projects/${projectId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchProjects();
        setShowProjectModal(false);
        setSelectedProject(null);
        tToast.success("tasks.success_delete_7093");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_34d5"));
      }
    } catch (error) {
      tToast.error("tasks.failed_delete_09e9");
    }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (normalizeTaskStatus(status)) {
      case "pending":
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case "in_progress":
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />;
      case "in_review":
        return <ClipboardDocumentCheckIcon className="h-5 w-5 text-purple-500" />;
      case "on_hold":
        return <PauseCircleIcon className="h-5 w-5 text-amber-500" />;
      case "completed":
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      case "cancelled":
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (normalizeTaskStatus(status)) {
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
      case "in_progress":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
      case "in_review":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300";
      case "on_hold":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300";
      case "completed":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (normalizeTaskStatus(status)) {
      case "pending":
        return "في الانتظار";
      case "in_progress":
        return "قيد التنفيذ";
      case "in_review":
        return "بانتظار الاعتماد";
      case "on_hold":
        return "معلّقة";
      case "completed":
        return "مكتمل";
      case "cancelled":
        return "ملغي";
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
      case "high":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
      case "low":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "عاجل";
      case "high":
        return "عالي";
      case "medium":
        return "متوسط";
      case "low":
        return "منخفض";
      default:
        return priority;
    }
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate) {
      return false;
    }

    return (
      new Date(dueDate) < new Date() &&
      !["completed", "cancelled"].includes(normalizeTaskStatus(status))
    );
  };

  // Priority order for sorting
  const safeTasks = ensureArray<Task>(tasks);

  // Filter and sort tasks
  const filteredAndSortedTasks = safeTasks.filter((task) => {
    const taskStatus = task.status?.toLowerCase();
    if (
      hideCompleted &&
      !filters.status &&
      (taskStatus === "completed" || taskStatus === "cancelled")
    ) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !task.title.toLowerCase().includes(query) &&
        !task.description.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  const paginatedTasks = filteredAndSortedTasks;
  const totalPages = serverTotalPages;

  // Stats (case-insensitive) - use server totals if available
  const taskStats = {
    total: serverTotalTasks > 0 ? serverTotalTasks : safeTasks.length,
    pending: safeTasks.filter((t) => t.status?.toLowerCase() === "pending").length,
    inProgress: safeTasks.filter((t) => t.status?.toLowerCase() === "in_progress")
      .length,
    completed: safeTasks.filter((t) => t.status?.toLowerCase() === "completed")
      .length,
    overdue: safeTasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
  };

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedTasks.length === paginatedTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(paginatedTasks.map((t) => t.id));
    }
  };

  const handleSelectTask = (taskId: string) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter((id) => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedTasks.length === 0) return;

    const token = getAccessToken();
    for (const taskId of selectedTasks) {
      await fetch(buildApiUrl(`tasks/${taskId}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
    }
    const count = selectedTasks.length;
    fetchTasks();
    setSelectedTasks([]);
    toast.success(i18n.t("tasks.success_update_selectedTaskslength_task_4e85", { length: count }));
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedTasks.length} مهمة؟`)) return;

    const token = getAccessToken();
    for (const taskId of selectedTasks) {
      await fetch(buildApiUrl(`tasks/${taskId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    const count = selectedTasks.length;
    fetchTasks();
    setSelectedTasks([]);
    toast.success(i18n.t("tasks.success_delete_selectedTaskslength_task_9484", { length: count }));
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "العنوان",
      "الوصف",
      "المشروع",
      "المسؤول",
      "الحالة",
      "الأولوية",
      "التقدم",
      "تاريخ الاستحقاق",
    ];
    const rows = filteredAndSortedTasks.map((task) => [
      task.title,
      task.description,
      task.projectName,
      task.assignedToName,
      getStatusText(task.status),
      getPriorityText(task.priority),
      `${task.progress}%`,
      task.dueDate ? formatDate(task.dueDate) : "غير محدد",
    ]);

    const csvContent =
      "\uFEFF" + [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tasks_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;
  const hasCommandState =
    searchQuery.trim().length > 0 ||
    activeFiltersCount > 0 ||
    taskFilter !== "all" ||
    !hideCompleted;
  const selectedTasksCount = selectedTasks.length;
  const operatorHeadline =
    selectedTasksCount > 0
      ? `تم تحديد ${selectedTasksCount} مهمة وجاهزة لإجراء سريع`
      : workspaceSettings.highlightOverdue && taskStats.overdue > 0
        ? `${taskStats.overdue} مهام متأخرة تحتاج متابعة الآن`
        : taskStats.inProgress > 0
          ? `${taskStats.inProgress} مهام قيد التنفيذ على السطح الآن`
          : taskStats.pending > 0
            ? `${taskStats.pending} مهام مفتوحة وجاهزة للبدء`
            : "ابدأ بإضافة مهمة جديدة وبناء سير العمل اليومي";
  const operatorDescription =
    selectedTasksCount > 0
      ? "الإجراءات الجماعية قريبة منك، ويمكنك الإلغاء أو التنفيذ دون الرجوع لأعلى الصفحة."
      : hasCommandState
        ? "العرض الحالي مخصص حسب بحثك وفلاترك، ويمكنك تعديل النتيجة أو إضافة مهمة جديدة فورًا."
        : "القائمة تعرض المهام المفتوحة افتراضيًا، مع وصول سريع للفلاتر والإنشاء والتصدير قرب منطقة التنفيذ.";

  const scrollToBulkActions = () => {
    bulkActionsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const saveWorkspacePreferences = (nextSettings: TaskWorkspaceSettings) => {
    const persisted = saveTaskWorkspaceSettings(
      typeof window !== "undefined" ? window.localStorage : null,
      activeCompanyId,
      activeUserId,
      nextSettings,
    );

    setWorkspaceSettings(persisted);
    tToast.success("tasks.success_save_36c3");
  };

  const resetWorkspacePreferences = () => {
    const persisted = saveTaskWorkspaceSettings(
      typeof window !== "undefined" ? window.localStorage : null,
      activeCompanyId,
      activeUserId,
      DEFAULT_TASK_WORKSPACE_SETTINGS,
    );

    setWorkspaceSettings(persisted);
    tToast.success("tasks.msg_c991");
  };

  const setActiveTab = (tab: TaskPageTab) => {
    if (tab === "integrations" && !canManageIntegrations) {
      if (embeddedInModal) {
        setModalActiveTab("tasks");
        return;
      }
      navigate(TASK_PAGE_ROUTES.tasks);
      return;
    }

    if (embeddedInModal) {
      setModalActiveTab(tab);
      return;
    }
    navigate(TASK_PAGE_ROUTES[tab]);
  };

  const renderActiveTabContent = () => {
    if (activeTab === "tasks") {
      return (
        <section className="space-y-2">
          <TaskWorkspaceHeader
            taskFilter={taskFilter}
            hasCommandState={hasCommandState}
            selectedTasksCount={selectedTasksCount}
            visibleTasksCount={filteredAndSortedTasks.length}
            headline={operatorHeadline}
            description={operatorDescription}
            taskStats={taskStats}
            setShowFilterSidebar={setShowFilterSidebar}
            setShowCreateTaskModal={setShowCreateTaskModal}
            setShowCreateProjectModal={setShowCreateProjectModal}
            setShowCreateGoalModal={setShowCreateGoalModal}
            exportToCSV={exportToCSV}
            scrollToBulkActions={scrollToBulkActions}
            showOverdueIndicators={workspaceSettings.highlightOverdue}
            showProjectShortcut={workspaceSettings.showProjectShortcut}
          />

          <TaskFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setCurrentPage={setCurrentPage}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            filters={filters}
            setFilters={setFilters}
            projects={projects}
            categories={categories}
            users={users}
            setShowFilterSidebar={setShowFilterSidebar}
            taskFilter={taskFilter}
            setTaskFilter={setTaskFilter}
            hideCompleted={hideCompleted}
            setHideCompleted={setHideCompleted}
            taskStats={taskStats}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />

          {selectedTasks.length > 0 ? (
            <div
              ref={bulkActionsRef}
              className="rounded-[16px] border border-primary/15 bg-primary/5 px-3 py-2.5"
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    تم تحديد {selectedTasks.length} مهمة
                  </p>
                  <p className="text-xs text-muted-foreground">
                    نفّذ إجراءً جماعيًا سريعًا ثم ألغ التحديد عند الانتهاء.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full px-2.5 text-xs"
                    onClick={() => handleBulkStatusChange("in_progress")}
                  >
                    بدء التنفيذ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                    onClick={() => handleBulkStatusChange("completed")}
                  >
                    إكمال
                  </Button>
                  {isApprover && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 text-xs font-medium"
                      onClick={() => handleBulkStatusChange("completed")}
                      title="اعتماد المهام المحددة"
                    >
                      اعتماد
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full border-rose-500/30 bg-rose-500/10 px-2.5 text-xs text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
                    onClick={handleBulkDelete}
                  >
                    حذف
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-full px-2.5 text-xs"
                    onClick={() => setSelectedTasks([])}
                  >
                    إلغاء التحديد
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <GoalProgressStrip
            goals={goals}
            onOpenCreateGoal={() => setShowCreateGoalModal(true)}
          />

          <TaskTable
            canApprove={isApprover}
            paginatedTasks={paginatedTasks}
            filteredAndSortedTasks={filteredAndSortedTasks}
            searchQuery={searchQuery}
            selectedTasks={selectedTasks}
            loading={loading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            handleSelectTask={handleSelectTask}
            handleSelectAll={handleSelectAll}
            isOverdue={isOverdue}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
            getStatusIcon={getStatusIcon}
            getPriorityColor={getPriorityColor}
            getPriorityText={getPriorityText}
            formatDate={formatDate}
            updateTaskStatus={updateTaskStatus}
            deleteTask={deleteTask}
            duplicateTask={duplicateTask}
            setSelectedTask={setSelectedTask}
            setShowTaskModal={setShowTaskModal}
            setEditingTask={setEditingTask}
            setShowEditTaskModal={setShowEditTaskModal}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            serverTotalTasks={serverTotalTasks}
          />
        </section>
      );
    }

    if (activeTab === "projects") {
      return (
        <ProjectsTab
          projects={projects}
          formatPrice={formatPrice}
          formatDate={formatDate}
          setSelectedProject={setSelectedProject}
          setShowProjectModal={setShowProjectModal}
          setEditingProject={setEditingProject}
          setShowEditProjectModal={setShowEditProjectModal}
          setShowCreateProjectModal={setShowCreateProjectModal}
          deleteProject={deleteProject}
        />
      );
    }

    if (activeTab === "categories") {
      return (
        <CategoriesTab
          categories={categories}
          setShowCategoryModal={setShowCategoryModal}
          setEditingCategory={setEditingCategory}
          deleteCategory={deleteCategory}
        />
      );
    }

    if (activeTab === "settings") {
      return (
        <TaskSettingsTab
          role={user?.role}
          settings={workspaceSettings}
          onSave={saveWorkspacePreferences}
          onReset={resetWorkspacePreferences}
        />
      );
    }

    if (canManageIntegrations) {
      return <TaskIntegrationsTab users={users} />;
    }

    return null;
  };

  if (loading) {
    return (
      <BusinessPageShell className="p-3 md:p-4">
        <div className="mx-auto max-w-[1360px] space-y-2">
          <div className="business-page-panel animate-pulse space-y-2 rounded-[18px] px-3 py-3 md:px-4">
            <div className="h-3 w-24 rounded-full bg-muted"></div>
            <div className="h-5 w-52 rounded-xl bg-muted"></div>
            <div className="flex flex-wrap gap-2">
              <div className="h-8 w-28 rounded-xl bg-muted"></div>
              <div className="h-8 w-28 rounded-xl bg-muted"></div>
            </div>
          </div>
          <div className="grid animate-pulse grid-cols-2 gap-2 xl:grid-cols-4">
            {[...Array(4)].map((_, idx) => (
              <div
                key={idx}
                className="business-metric-card h-16 rounded-[16px] bg-card/80"
              ></div>
            ))}
          </div>
          <div className="business-page-panel animate-pulse rounded-[18px] px-3 py-3 md:px-4">
            <div className="mb-3 h-4 w-36 rounded-full bg-muted"></div>
            <div className="grid gap-2 md:grid-cols-2">
              {[...Array(4)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-14 rounded-[14px] border border-border/60 bg-background/70"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </BusinessPageShell>
    );
  }

  return (
    <BusinessPageShell className="tasks-page p-2.5 pb-24 md:px-4 md:py-3 xl:px-5 xl:py-4">
      <div className="mx-auto max-w-[1360px] space-y-2">
        <div className="space-y-2">

          {renderActiveTabContent()}
        </div>

        <CategoryModal
          show={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          createCategory={createCategory}
        />

        <EditCategoryModal
          category={editingCategory}
          setEditingCategory={setEditingCategory}
          updateCategory={updateCategory}
        />

        {/* Create Goal Modal */}
        <CreateGoalModal
          isOpen={showCreateGoalModal}
          onClose={() => setShowCreateGoalModal(false)}
          onGoalCreated={fetchGoals}
          users={users}
          projects={projects}
        />

        {/* Create Task Modal */}
        <CreateTaskModal
          showCreateTaskModal={showCreateTaskModal}
          setShowCreateTaskModal={setShowCreateTaskModal}
          newTask={newTask}
          setNewTask={setNewTask}
          createTask={createTask}
          showTemplateSelector={showTemplateSelector}
          setShowTemplateSelector={setShowTemplateSelector}
          templates={templates}
          applyTemplate={applyTemplate}
          projects={projects}
          goals={goals}
          categories={categories}
          users={users}
          recurringConfig={recurringConfig}
          setRecurringConfig={setRecurringConfig}
        />
        <TaskDetailsModal
          show={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          task={selectedTask}
          users={users}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          getPriorityColor={getPriorityColor}
          getPriorityText={getPriorityText}
          isOverdue={isOverdue}
          formatDate={formatDate}
          updateTaskStatus={updateTaskStatus}
          deleteTask={deleteTask}
          setSelectedTask={setSelectedTask}
          setEditingTask={setEditingTask}
          setShowEditTaskModal={setShowEditTaskModal}
          fetchTasks={fetchTasks}
          buildApiUrl={buildApiUrl}
        />

        <EditTaskModal
          show={showEditTaskModal}
          onClose={closeEditModal}
          task={editingTask}
          setEditingTask={setEditingTask}
          updateTask={updateTask}
          projects={projects}
          goals={goals}
          categories={categories}
          users={users}
        />

        <CreateProjectModal
          show={showCreateProjectModal}
          onClose={() => setShowCreateProjectModal(false)}
          newProject={newProject}
          setNewProject={setNewProject}
          createProject={createProject}
          users={users}
        />

        <ProjectDetailsModal
          show={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          project={selectedProject}
          getPriorityColor={getPriorityColor}
          getPriorityText={getPriorityText}
          formatPrice={formatPrice}
          formatDate={formatDate}
          deleteProject={deleteProject}
          setEditingProject={setEditingProject}
          setShowEditProjectModal={setShowEditProjectModal}
        />

        <EditProjectModal
          show={showEditProjectModal}
          onClose={() => setShowEditProjectModal(false)}
          project={editingProject}
          setEditingProject={setEditingProject}
          updateProject={updateProject}
        />

        <FilterSidebar
          show={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
          filters={filters}
          setFilters={setFilters}
          projects={projects}
          categories={categories}
          users={users}
        />
      </div>

      {activeTab === "tasks" && workspaceSettings.showMobileCommandBar ? (
        <div className="fixed inset-x-3 bottom-3 z-40 md:hidden">
          <div className="business-page-panel rounded-[24px] border border-border/70 bg-card/95 px-3 py-3 shadow-[0_18px_42px_-28px_rgba(15,27,45,0.45)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
            {selectedTasksCount > 0 ? (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {selectedTasksCount} مهمة محددة
                  </p>
                  <p className="text-xs text-muted-foreground">
                    نفّذ الإجراء السريع من أسفل الشاشة ثم راجع القائمة.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleBulkStatusChange("in_progress")}
                >
                  بدء
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleBulkStatusChange("completed")}
                >
                  إكمال
                </Button>
                {isApprover && (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleBulkStatusChange("completed")}
                    title="اعتماد المهام المحددة"
                  >
                    اعتماد
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {hasCommandState ? "عرضك المخصص جاهز" : "وصول سريع للمهام"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    افتح الفلاتر أو أضف مهمة جديدة دون الرجوع إلى أعلى الصفحة.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setShowFilterSidebar(true)}
                >
                  الفلاتر
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setShowCreateTaskModal(true)}
                >
                  جديدة
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={confirmState.show}
        onOpenChange={(open) => {
          if (!open) setConfirmState({ show: false, message: "", onConfirm: () => {} });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmState.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                confirmState.onConfirm();
                setConfirmState({ show: false, message: "", onConfirm: () => {} });
              }}
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BusinessPageShell>
  );
};

export default Tasks;
