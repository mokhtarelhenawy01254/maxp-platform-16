import React, { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import i18n from "../../../i18n";
import { tToast } from "../../../utils/i18n-toast";
import { buildApiUrl } from "../../../utils/urlHelper";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuthSimple";
import { useCurrency } from "../../../hooks/useCurrency";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { tokenManager } from "../../../utils/tokenManager";
import {
  UnifiedTaskFilters,
  parseUnifiedFiltersFromUrl,
  matchesUnifiedFilter,
} from "../../../components/tasks/taskFilterEngine";
import type { PresetProjectTemplate } from "../components/taskPresetTemplates";
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
  TaskViewMode,
  TaskQuickFilter,
} from "../types";
import {
  DEFAULT_TASK_WORKSPACE_SETTINGS,
  loadTaskWorkspaceSettings,
  saveTaskWorkspaceSettings,
} from "../taskWorkspaceSettings";
import type { TaskWorkspaceSettings } from "../taskWorkspaceSettings";
import {
  TASK_PAGE_ROUTES,
  getTaskPageTabFromPathname,
  ensureArray,
  normalizeTaskStatus,
  createInitialTaskDraft,
} from "./types";
import {
  isOverdue,
  getStatusText,
  getPriorityText,
  computeTaskStats,
  type ServerTaskStatsPayload,
} from "./helpers";

const getAccessToken = (): string | null => tokenManager.getAccessToken();

export function useTasksPageController(embeddedInModal?: boolean) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const [modalActiveTab, setModalActiveTab] = useState<TaskPageTab>("tasks");
  const activeTab = embeddedInModal
    ? modalActiveTab
    : getTaskPageTabFromPathname(location.pathname);

  const activeCompanyId =
    user?.companyId ||
    user?.company?.id ||
    user?.companies?.find((c) => c.isCurrent)?.id ||
    user?.companies?.[0]?.id ||
    (typeof window !== "undefined" ? localStorage.getItem("companyId") : null) ||
    null;
  const activeUserId =
    (user?.id ? String(user.id) : null) ||
    (typeof window !== "undefined" ? localStorage.getItem("userId") : null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workspaceSettings, setWorkspaceSettings] =
    useState<TaskWorkspaceSettings>(DEFAULT_TASK_WORKSPACE_SETTINGS);
  const [viewMode, setViewMode] = useState<TaskViewMode>("grouped");
  const [quickFilter, setQuickFilter] = useState<TaskQuickFilter>("all");
  const [isTodayStripOpen, setIsTodayStripOpen] = useState(false);
  const [isGoalsStripOpen, setIsGoalsStripOpen] = useState(false);
  const [activeProjectWorkspace, setActiveProjectWorkspace] =
    useState<Project | null>(null);
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
  const [unifiedFilters, setUnifiedFilters] = useState<UnifiedTaskFilters>(() =>
    parseUnifiedFiltersFromUrl(
      typeof window !== "undefined" ? window.location.search : ""
    )
  );
  const [taskFilter, setTaskFilter] = useState<TaskScopeFilter>("all");
  const [hideCompleted, setHideCompleted] = useState(true);

  // New features states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<TaskSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [serverTotalTasks, setServerTotalTasks] = useState(0);
  const [serverStats, setServerStats] = useState<ServerTaskStatsPayload | null>(null);
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
    null
  );
  const [newCategory, setNewCategory] = useState<CategoryDraft>({
    name: "",
    description: "",
    color: "#6366f1",
  });

  // Filter sidebar state
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const bulkActionsRef = useRef<HTMLDivElement | null>(null);
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
      typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "",
      typeof window !== "undefined" ? localStorage.getItem("userName") || "" : ""
    )
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
  const previousCompanyIdRef = useRef<string | null>(null);
  const canManageIntegrations = [
    "OWNER",
    "COMPANY_ADMIN",
    "SUPER_ADMIN",
  ].includes(user?.role || "");
  const isManagerOrAdmin = [
    "SUPER_ADMIN",
    "COMPANY_ADMIN",
    "OWNER",
    "MANAGER",
  ].includes(user?.role || "");
  const isApprover = isManagerOrAdmin;

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
      300
    );
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const nextSettings = loadTaskWorkspaceSettings(
      typeof window !== "undefined" ? window.localStorage : null,
      activeCompanyId,
      activeUserId
    );

    setWorkspaceSettings(nextSettings);
    if (nextSettings.viewMode) {
      setViewMode(nextSettings.viewMode);
    }
  }, [activeCompanyId, activeUserId]);

  const settingsAppliedRef = useRef(false);

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
    if (workspaceSettings.viewMode) {
      setViewMode(workspaceSettings.viewMode);
    }
    setCurrentPage(1);
  }, [workspaceSettings]);

  useEffect(() => {
    settingsAppliedRef.current = false;
  }, [activeCompanyId, activeUserId]);

  const handleToggleViewMode = () => {
    const nextMode: TaskViewMode = viewMode === "grouped" ? "flat" : "grouped";
    setViewMode(nextMode);
    const updatedSettings: TaskWorkspaceSettings = {
      ...workspaceSettings,
      viewMode: nextMode,
    };
    saveTaskWorkspaceSettings(
      typeof window !== "undefined" ? window.localStorage : null,
      activeCompanyId,
      activeUserId,
      updatedSettings
    );
    setWorkspaceSettings(updatedSettings);
  };

  // Sync active project workspace from URL search params (?projectId=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pid = params.get("projectId") || params.get("project");
    if (pid && projects.length > 0) {
      const match = projects.find((p) => p.id === pid);
      if (match) {
        setActiveProjectWorkspace(match);
      }
    } else if (!pid && activeProjectWorkspace) {
      setActiveProjectWorkspace(null);
    }
  }, [location.search, projects]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenProjectWorkspace = (proj: Project) => {
    setActiveProjectWorkspace(proj);
    const params = new URLSearchParams(location.search);
    params.set("projectId", proj.id);
    navigate(
      { pathname: location.pathname, search: `?${params.toString()}` },
      { replace: false }
    );
  };

  const handleCloseProjectWorkspace = () => {
    setActiveProjectWorkspace(null);
    const params = new URLSearchParams(location.search);
    params.delete("projectId");
    params.delete("project");
    const nextSearch = params.toString() ? `?${params.toString()}` : "";
    navigate(
      { pathname: location.pathname, search: nextSearch },
      { replace: true }
    );
  };

  const handleApplyPresetTemplate = async (template: PresetProjectTemplate) => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const projRes = await fetch(buildApiUrl("projects"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          priority: "high",
          status: "in_progress",
          tags: [template.category],
        }),
      });

      const projData = await projRes.json();
      const createdProject = projData.data?.project || projData.data;
      const createdProjectId = createdProject?.id;

      if (!createdProjectId) {
        toast.error("فشل إنشاء المشروع من القالب");
        return;
      }

      let createdCount = 0;
      for (const t of template.tasks) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (t.daysFromNow || 1));

        await fetch(buildApiUrl("tasks"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: t.title,
            description: t.description || "",
            priority: t.priority,
            projectId: createdProjectId,
            dueDate: dueDate.toISOString(),
            status: "pending",
          }),
        });
        createdCount++;
      }

      toast.success(
        `تم إنشاء مشروع «${template.name}» و ${createdCount} مهام بنجاح!`
      );
      await fetchProjects();
      await fetchTasks();
      if (createdProject) {
        setActiveProjectWorkspace(createdProject);
      }
    } catch (err) {
      console.error("Error applying preset template:", err);
      toast.error("حدث خطأ أثناء تطبيق القالب");
    }
  };

  const closeEditModal = () => {
    setShowEditTaskModal(false);
    setEditingTask(null);
    const params = new URLSearchParams(location.search);
    if (params.has("edit")) {
      params.delete("edit");
      const nextSearch = params.toString() ? `?${params.toString()}` : "";
      navigate(
        { pathname: location.pathname, search: nextSearch },
        { replace: true }
      );
    }
  };

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
                }
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
          }
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
      setLoadError(null);
      const token = getAccessToken();

      if (!token) {
        setLoading(false);
        setLoadError(
          "لم يتم العثور على جلسة تسجيل دخول صالحة. يرجى تسجيل الدخول مجدداً."
        );
        return;
      }

      let url = "tasks";
      if (taskFilter === "my-tasks") {
        url = "tasks/my-tasks";
      } else if (taskFilter === "assigned-by-me") {
        url = "tasks/assigned-by-me";
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      if (unifiedFilters.search) {
        queryParams.append("search", unifiedFilters.search);
      } else if (debouncedSearch) {
        queryParams.append("search", debouncedSearch);
      }
      if (unifiedFilters.assignedTo && unifiedFilters.assignedTo !== "all") {
        queryParams.append("assignedTo", unifiedFilters.assignedTo);
      }
      if (unifiedFilters.status && unifiedFilters.status !== "all") {
        queryParams.append("status", unifiedFilters.status);
      }
      if (unifiedFilters.priority && unifiedFilters.priority !== "all") {
        queryParams.append("priority", unifiedFilters.priority);
      }
      if (unifiedFilters.dueDateFrom) {
        queryParams.append("dueDateFrom", unifiedFilters.dueDateFrom);
      }
      if (unifiedFilters.dueDateTo) {
        queryParams.append("dueDateTo", unifiedFilters.dueDateTo);
      }
      if (unifiedFilters.tag && unifiedFilters.tag !== "all") {
        queryParams.append("tag", unifiedFilters.tag);
      }
      if (
        hideCompleted &&
        !filters.status &&
        (!unifiedFilters.status || unifiedFilters.status === "all")
      ) {
        queryParams.append("excludeCompleted", "true");
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
          setLoadError("انتهت جلستك الحالية. يرجى إعادة تسجيل الدخول.");
        } else {
          tToast.error("tasks.unable_load_tasks_f3df");
          setLoadError(
            "تعذر تحميل المهام مؤقتاً من الخادم. اضغط إعادة المحاولة."
          );
        }
        return;
      }

      const data = await response.json();
      if (data.success) {
        const nextTasks = ensureArray<Task>(
          data.data?.tasks || data.data?.items || data.data || data.tasks
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
      setLoadError(
        "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskStats = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      if (unifiedFilters.search) {
        queryParams.append("search", unifiedFilters.search);
      } else if (debouncedSearch) {
        queryParams.append("search", debouncedSearch);
      }
      if (unifiedFilters.assignedTo && unifiedFilters.assignedTo !== "all") {
        queryParams.append("assignedTo", unifiedFilters.assignedTo);
      }
      if (unifiedFilters.status && unifiedFilters.status !== "all") {
        queryParams.append("status", unifiedFilters.status);
      }
      if (unifiedFilters.priority && unifiedFilters.priority !== "all") {
        queryParams.append("priority", unifiedFilters.priority);
      }
      if (unifiedFilters.dueDateFrom) {
        queryParams.append("dueDateFrom", unifiedFilters.dueDateFrom);
      }
      if (unifiedFilters.dueDateTo) {
        queryParams.append("dueDateTo", unifiedFilters.dueDateTo);
      }
      if (unifiedFilters.tag && unifiedFilters.tag !== "all") {
        queryParams.append("tag", unifiedFilters.tag);
      }
      if (taskFilter && taskFilter !== "all") {
        queryParams.append("scope", taskFilter);
        if (taskFilter === "my-tasks" && activeUserId) {
          queryParams.append("assignedTo", activeUserId);
        }
      }

      const queryString = queryParams.toString();
      const url = queryString
        ? `tasks/dashboard-stats?${queryString}`
        : "tasks/dashboard-stats";

      const response = await fetch(buildApiUrl(url), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.data?.tasks) {
        setServerStats(data.data.tasks);
      }
    } catch (error) {
      // Keep existing stats on failure
    }
  };

  const reloadAll = async () => {
    await Promise.all([fetchTasks(), fetchTaskStats()]);
  };

  const fetchProjects = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await fetch(buildApiUrl("projects"), {
        headers: { Authorization: `Bearer ${token}` },
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
          ensureArray<Project>(
            data.data?.projects || data.data || data.projects
          )
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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setGoals(
          ensureArray<GoalOption>(data.goals || data.data || data.tasks)
        );
      }
    } catch (error) {
      // Silent fail
    }
  };

  const createTask = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        tToast.error("tasks.login_login_2098");
        return;
      }

      const payload = {
        ...newTask,
        isRecurring: Boolean(recurringConfig?.enabled),
        recurringRule: recurringConfig?.enabled
          ? JSON.stringify(recurringConfig)
          : null,
      };

      const response = await fetch(buildApiUrl("tasks"), {
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
            `فشل في إنشاء المهمة (${response.status})`
        );
        return;
      }

      if (data.success) {
        await reloadAll();
        setShowCreateTaskModal(false);
        setNewTask(
          createInitialTaskDraft(
            typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "",
            typeof window !== "undefined" ? localStorage.getItem("userName") || "" : ""
          )
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
    progress?: number
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
        await reloadAll();
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(data.data);
        }
        tToast.success("tasks.success_update_ea66");
      }
    } catch (error) {
      tToast.error("tasks.failed_update_0068");
    }
  };

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
        await reloadAll();
        closeEditModal();
        tToast.success("tasks.success_update_b5ad");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_3840"));
      }
    } catch (error) {
      tToast.error("tasks.failed_update_c51e");
    }
  };

  const duplicateTask = async (task: Task) => {
    try {
      const token = getAccessToken();
      if (!token) {
        tToast.error("tasks.login_login_2098");
        return;
      }

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
        await reloadAll();
        tToast.success("tasks.msg_178a");
      } else {
        toast.error(data.error || i18n.t("tasks.msg_bbd2"));
      }
    } catch (error) {
      tToast.error("tasks.msg_56ed");
    }
  };

  const deleteTask = async (taskId: string) => {
    requestConfirm("هل أنت متأكد من حذف هذه المهمة؟", async () => {
      try {
        const token = getAccessToken();
        const response = await fetch(buildApiUrl(`tasks/${taskId}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (data.success) {
          await reloadAll();
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
        }
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

  const deleteProject = async (projectId: string) => {
    requestConfirm("هل أنت متأكد من حذف هذا المشروع؟", async () => {
      try {
        const token = getAccessToken();
        const response = await fetch(buildApiUrl(`projects/${projectId}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
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

  // Safe tasks
  const safeTasks = ensureArray<Task>(tasks);

  // Filter and sort tasks
  const filteredAndSortedTasks = safeTasks.filter((task) => {
    if (!matchesUnifiedFilter(task, unifiedFilters)) {
      return false;
    }
    const taskStatus = task.status?.toLowerCase();
    if (
      hideCompleted &&
      (!unifiedFilters.status || unifiedFilters.status === "all") &&
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

  const quickFilteredTasks = useMemo(() => {
    if (quickFilter === "all") return filteredAndSortedTasks;

    const todayStr = new Date().toISOString().split("T")[0];
    const now = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);

    return filteredAndSortedTasks.filter((t) => {
      const isDone = ["completed", "cancelled"].includes(
        normalizeTaskStatus(t.status)
      );
      if (!t.dueDate) {
        return false;
      }

      const due = new Date(t.dueDate);
      const dueStr = due.toISOString().split("T")[0];

      if (quickFilter === "today") {
        return dueStr === todayStr;
      }
      if (quickFilter === "week") {
        return due >= now && due <= oneWeekLater;
      }
      if (quickFilter === "overdue") {
        return !isDone && due < now && dueStr !== todayStr;
      }
      return true;
    });
  }, [filteredAndSortedTasks, quickFilter]);

  const paginatedTasks = quickFilteredTasks;
  const totalPages = serverTotalPages;

  const taskStats = computeTaskStats({
    serverStats,
    safeTasks,
    serverTotalTasks,
    taskFilter,
  });

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

  const canBulkApprove =
    isManagerOrAdmin ||
    (selectedTasks.length > 0 &&
      selectedTasks.some((id) => {
        const t = safeTasks.find((task) => task.id === id);
        return t && t.createdBy === activeUserId;
      }));

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedTasks.length === 0) return;

    const token = getAccessToken();
    const isCompletedAction =
      String(newStatus).toLowerCase() === "completed";
    const tasksToProcess =
      isCompletedAction && !isManagerOrAdmin
        ? selectedTasks.filter((taskId) => {
            const t = safeTasks.find((task) => task.id === taskId);
            return t && t.createdBy === activeUserId;
          })
        : selectedTasks;

    if (tasksToProcess.length === 0) return;

    for (const taskId of tasksToProcess) {
      await fetch(buildApiUrl(`tasks/${taskId}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
    }
    const count = tasksToProcess.length;
    await reloadAll();
    setSelectedTasks([]);
    toast.success(
      i18n.t("tasks.success_update_selectedTaskslength_task_4e85", {
        length: count,
      })
    );
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
    await reloadAll();
    setSelectedTasks([]);
    toast.success(
      i18n.t("tasks.success_delete_selectedTaskslength_task_9484", {
        length: count,
      })
    );
  };

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
      nextSettings
    );

    setWorkspaceSettings(persisted);
    tToast.success("tasks.success_save_36c3");
  };

  const resetWorkspacePreferences = () => {
    const persisted = saveTaskWorkspaceSettings(
      typeof window !== "undefined" ? window.localStorage : null,
      activeCompanyId,
      activeUserId,
      DEFAULT_TASK_WORKSPACE_SETTINGS
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

  // URL search ?edit=taskId
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
      .catch((err) =>
        console.error("Error opening edit modal from URL param:", err)
      );
  }, [location.search, tasks]);

  // Reset currentPage to 1 when filters, scope, quickFilter, or search change
  const isFirstFiltersMountRef = useRef(true);
  useEffect(() => {
    if (isFirstFiltersMountRef.current) {
      isFirstFiltersMountRef.current = false;
      return;
    }
    setCurrentPage(1);
  }, [taskFilter, filters, unifiedFilters, quickFilter, debouncedSearch]);

  // Data refresh on workspace controls
  useEffect(() => {
    if (!activeCompanyId && !getAccessToken()) {
      setLoading(false);
      return;
    }

    reloadAll();
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    activeCompanyId,
    filters,
    unifiedFilters,
    taskFilter,
    hideCompleted,
    currentPage,
    itemsPerPage,
    debouncedSearch,
    sortBy,
    sortOrder,
  ]);

  // Auxiliary data on mount/company change
  useEffect(() => {
    if (!activeCompanyId && !getAccessToken()) {
      return;
    }

    fetchProjects();
    fetchGoals();
    fetchUsers();
    fetchCategories();
    fetchTemplates();
  }, [activeCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Company change reset
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

  return {
    user,
    formatDate,
    formatPrice,
    activeTab,
    setActiveTab,
    canManageIntegrations,
    isApprover: canBulkApprove,
    activeUserId,
    // Data
    tasks,
    safeTasks,
    serverStats,
    projects,
    goals,
    users,
    categories,
    templates,
    loading,
    loadError,
    // View state
    viewMode,
    quickFilter,
    setQuickFilter,
    isTodayStripOpen,
    setIsTodayStripOpen,
    isGoalsStripOpen,
    setIsGoalsStripOpen,
    handleToggleViewMode,
    activeProjectWorkspace,
    handleOpenProjectWorkspace,
    handleCloseProjectWorkspace,
    handleApplyPresetTemplate,
    // Selected task/project
    selectedTask,
    setSelectedTask,
    showTaskModal,
    setShowTaskModal,
    showCreateTaskModal,
    setShowCreateTaskModal,
    showCreateGoalModal,
    setShowCreateGoalModal,
    showCreateProjectModal,
    setShowCreateProjectModal,
    selectedProject,
    setSelectedProject,
    showProjectModal,
    setShowProjectModal,
    editingTask,
    setEditingTask,
    showEditTaskModal,
    setShowEditTaskModal,
    editingProject,
    setEditingProject,
    showEditProjectModal,
    setShowEditProjectModal,
    showCategoryModal,
    setShowCategoryModal,
    editingCategory,
    setEditingCategory,
    newCategory,
    setNewCategory,
    showFilterSidebar,
    setShowFilterSidebar,
    showTemplateSelector,
    setShowTemplateSelector,
    confirmState,
    setConfirmState,
    requestConfirm,
    newProject,
    setNewProject,
    newTask,
    setNewTask,
    recurringConfig,
    setRecurringConfig,
    // Filtering and sorting
    filters,
    setFilters,
    unifiedFilters,
    setUnifiedFilters,
    taskFilter,
    setTaskFilter,
    hideCompleted,
    setHideCompleted,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    serverTotalTasks,
    selectedTasks,
    setSelectedTasks,
    // Computed
    filteredAndSortedTasks,
    quickFilteredTasks,
    paginatedTasks,
    taskStats,
    activeFiltersCount,
    hasCommandState,
    selectedTasksCount,
    operatorHeadline,
    operatorDescription,
    workspaceSettings,
    bulkActionsRef,
    // Actions
    scrollToBulkActions,
    handleSelectAll,
    handleSelectTask,
    handleBulkStatusChange,
    handleBulkDelete,
    exportToCSV,
    saveWorkspacePreferences,
    resetWorkspacePreferences,
    closeEditModal,
    applyTemplate,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchTasks,
    fetchTaskStats,
    reloadAll,
    fetchProjects,
    fetchGoals,
    createTask,
    updateTaskStatus,
    createProject,
    updateTask,
    duplicateTask,
    deleteTask,
    updateProject,
    deleteProject,
  };
}
