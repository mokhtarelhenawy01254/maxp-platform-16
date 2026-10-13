import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { buildApiUrl } from "../../utils/urlHelper";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui/table";
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ViewColumnsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ChatBubbleLeftIcon,
  PaperClipIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TagIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  reporterName: string;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  releaseId: string | null;
  releaseVersion: string | null;
  dueDate: string | null;
  estimatedHours: number;
  actualHours: number;
  progress: number;
  tags: string[];
  commentsCount: number;
  attachmentsCount: number;
  subtasksCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

import {
  TASK_TYPES,
  TASK_STATUSES,
  PRIORITY_CONFIG,
} from "../../constants/taskConstants";

const getAccessToken = (): string | null => tokenManager.getAccessToken();

const DevTasksList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [bulkAction, setBulkAction] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: "", message: "", onConfirm: () => {} });

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    priority: searchParams.get("priority") || "",
    type: searchParams.get("type") || "",
    projectId: searchParams.get("projectId") || "",
    assigneeId: searchParams.get("assigneeId") || "",
    component: searchParams.get("component") || "",
    releaseId: searchParams.get("releaseId") || "",
    dueDateFrom: searchParams.get("dueDateFrom") || "",
    dueDateTo: searchParams.get("dueDateTo") || "",
    tags: searchParams.get("tags") || "",
    dateType: "dueDate", // dueDate, createdAt, updatedAt
  });

  // Pending filters for the sidebar (performance optimization)
  const [pendingFilters, setPendingFilters] = useState(filters);

  const [hideCompleted, setHideCompleted] = useState(true);
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(() => {
    const saved = localStorage.getItem("devTasks_showMyTasksOnly");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("devTasks_showMyTasksOnly", String(showMyTasksOnly));
  }, [showMyTasksOnly]);

  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  // Sync pending filters when sidebar opens
  useEffect(() => {
    if (showFiltersSidebar) {
      setPendingFilters(filters);
    }
  }, [showFiltersSidebar]);

  useEffect(() => {
    fetchSettings();
    fetchUserPermissions();
    fetchProjects();
    fetchTeamMembers();
    fetchReleases();
    fetchStats();
  }, []);

  // Sync URL search param to filters (for header search bar)
  const urlSearch = searchParams.get("search") || "";
  useEffect(() => {
    setFilters((prev) => {
      if (prev.search !== urlSearch) {
        return { ...prev, search: urlSearch };
      }
      return prev;
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [urlSearch]);

  useEffect(() => {
    fetchTasks();
  }, [
    pagination.page,
    pagination.limit,
    filters,
    sortBy,
    sortOrder,
    hideCompleted,
    showMyTasksOnly,
    currentMemberId,
  ]);

  const fetchUserPermissions = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(
        buildApiUrl("super-admin/user/permissions"),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        setUserPermissions(data.data.permissions);
        if (data.data.memberId) {
          setCurrentMemberId(data.data.memberId);
        }
      }
    } catch (err) {
      console.error("Error fetching user permissions:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("super-admin/dev/settings"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("super-admin/dev/projects"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("super-admin/dev/team"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setTeamMembers(data.data);
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
    }
  };

  const fetchReleases = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("super-admin/dev/releases"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setReleases(data.data);
      }
    } catch (err) {
      console.error("Error fetching releases:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(buildApiUrl("super-admin/dev/dashboard"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAccessToken();

      const params = new URLSearchParams();

      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      if (filters.search) params.append("search", filters.search);
      if (filters.status) params.append("status", filters.status);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.type) params.append("type", filters.type);
      if (filters.projectId) params.append("projectId", filters.projectId);
      if (showMyTasksOnly) {
        params.append("assigneeId", "me");
      } else if (filters.assigneeId) {
        params.append("assigneeId", filters.assigneeId);
      }
      if (filters.component) params.append("component", filters.component);
      if (filters.releaseId) params.append("releaseId", filters.releaseId);
      if (filters.dateType) params.append("dateType", filters.dateType);
      if (filters.dueDateFrom)
        params.append("dueDateFrom", filters.dueDateFrom);
      if (filters.dueDateTo) params.append("dueDateTo", filters.dueDateTo);
      if (filters.tags) params.append("tags", filters.tags);
      if (hideCompleted) params.append("excludeStatus", "DONE");

      const response = await fetch(
        buildApiUrl(`super-admin/dev/tasks?${params.toString()}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`فشل تحميل المهام (${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        setTasks(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.message || "حدث خطأ أثناء تحميل المهام");
      }
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError(
        err.message || "حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePendingFilterChange = (key: string, value: string) => {
    setPendingFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyPendingFilters = () => {
    setFilters(pendingFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setShowFiltersSidebar(false);
  };

  const addTag = (tag: string) => {
    if (!tag.trim()) return;
    const currentTags = pendingFilters.tags
      ? pendingFilters.tags.split(",")
      : [];
    if (!currentTags.includes(tag.trim())) {
      const newTags = [...currentTags, tag.trim()].join(",");
      handlePendingFilterChange("tags", newTags);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = pendingFilters.tags
      ? pendingFilters.tags.split(",")
      : [];
    const newTags = currentTags.filter((tag) => tag !== tagToRemove).join(",");
    handlePendingFilterChange("tags", newTags);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: "",
      status: "",
      priority: "",
      type: "",
      projectId: "",
      assigneeId: "",
      component: "",
      releaseId: "",
      dueDateFrom: "",
      dueDateTo: "",
      tags: "",
      dateType: "dueDate",
    };
    setFilters(clearedFilters);
    setPendingFilters(clearedFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const executeBulkAction = async () => {
    try {
      const token = getAccessToken();

      if (bulkAction === "delete") {
        for (let i = 0; i < selectedTasks.length; i += 5) {
          const batch = selectedTasks.slice(i, i + 5);
          await Promise.all(
            batch.map((id) =>
              fetch(buildApiUrl(`super-admin/dev/tasks/${id}`), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              }),
            ),
          );
        }
      } else if (bulkAction.startsWith("status:")) {
        const status = bulkAction.split(":")[1];
        for (let i = 0; i < selectedTasks.length; i += 5) {
          const batch = selectedTasks.slice(i, i + 5);
          await Promise.all(
            batch.map((id) =>
              fetch(buildApiUrl(`super-admin/dev/tasks/${id}`), {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
              }),
            ),
          );
        }
      } else if (bulkAction.startsWith("assignee:")) {
        const assigneeId = bulkAction.split(":")[1];
        for (let i = 0; i < selectedTasks.length; i += 5) {
          const batch = selectedTasks.slice(i, i + 5);
          await Promise.all(
            batch.map((id) =>
              fetch(buildApiUrl(`super-admin/dev/tasks/${id}`), {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ assigneeId }),
              }),
            ),
          );
        }
      }

      setSelectedTasks([]);
      setBulkAction("");
      fetchTasks();
    } catch (err) {
      console.error("Error performing bulk action:", err);
      setError("حدث خطأ أثناء تنفيذ العملية الجماعية");
    }
  };

  const handleBulkAction = () => {
    if (selectedTasks.length === 0 || !bulkAction) return;

    if (bulkAction === "delete") {
      setConfirmModal({
        show: true,
        title: "حذف مهام",
        message: `هل أنت متأكد من حذف ${selectedTasks.length} مهمة؟ لا يمكن التراجع عن هذا الإجراء.`,
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, show: false }));
          executeBulkAction();
        },
      });
    } else {
      executeBulkAction();
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      const token = getAccessToken();
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(
        buildApiUrl(
          `super-admin/dev/tasks/export?format=${format}&${params.toString()}`,
        ),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error exporting tasks:", err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map((t) => t.id));
    }
  };

  const toggleSelectTask = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const executeDeleteTask = async (taskId: string) => {
    try {
      const token = getAccessToken();
      const response = await fetch(
        buildApiUrl(`super-admin/dev/tasks/${taskId}`),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      if (data.success) {
        fetchTasks();
      } else {
        setError(data.message || "فشل حذف المهمة");
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      setError("حدث خطأ أثناء حذف المهمة");
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setConfirmModal({
      show: true,
      title: "حذف مهمة",
      message:
        "هل أنت متأكد من حذف هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء.",
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, show: false }));
        executeDeleteTask(taskId);
      },
    });
  };

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      {/* Header */}
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ClipboardDocumentListIcon className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground">
                  قائمة المهام
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {pagination.total} مهمة
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <ArrowDownTrayIcon className="size-4" />
            تصدير CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/super-admin/dev-kanban")}>
            <ViewColumnsIcon className="size-4" />
            Kanban
          </Button>
          <Button size="sm" onClick={() => navigate("/super-admin/dev-tasks/new")}>
            <PlusIcon className="size-4" />
            مهمة جديدة
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {/* Quick Stats Telemetry Ribbon */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 rounded-xl border border-border/80 bg-card shadow-2xs divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60 overflow-hidden">
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">المهام النشطة</span>
              <ClipboardDocumentListIcon className="size-3.5 text-primary" />
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {stats.overview?.totalTasks || 0}
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">قيد العمل</span>
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {stats.tasksByStatus?.IN_PROGRESS || 0}
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">مكتملة</span>
              <CheckCircleIcon className="size-3.5 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.tasksByStatus?.DONE || 0}
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">متأخرة</span>
              <ExclamationTriangleIcon className="size-3.5 text-destructive" />
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-destructive font-mono tabular-nums">
              {stats.overview?.overdueTasks || 0}
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">مشاريع نشطة</span>
              <TagIcon className="size-3.5 text-primary" />
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-primary font-mono tabular-nums">
              {stats.overview?.activeProjects || 0}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="بحث في المهام بالاسم، الوصف، أو الرقم..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full h-8 rounded-lg border border-border bg-background py-1.5 pr-9 pl-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </form>

          {/* Quick Filters */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="h-8 border border-border rounded-lg px-2.5 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="">كل الحالات</option>
            {(
              settings?.taskStatuses ||
              Object.entries(TASK_STATUSES).map(([key, value]) => ({
                value: key,
                ...value,
              }))
            ).map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange("priority", e.target.value)}
            className="h-8 border border-border rounded-lg px-2.5 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="">كل الأولويات</option>
            {(
              settings?.taskPriorities ||
              Object.entries(PRIORITY_CONFIG).map(([key, value]) => ({
                value: key,
                ...value,
              }))
            ).map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="h-8 border border-border rounded-lg px-2.5 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="">كل الأنواع</option>
            {Object.entries(TASK_TYPES).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 h-8 px-3 border border-border rounded-lg hover:bg-muted/40 bg-background text-foreground text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="rounded size-3.5 border-border text-primary focus:ring-primary"
            />
            <span>إخفاء المكتملة</span>
          </label>

          <label className="flex items-center gap-1.5 h-8 px-3 border border-border rounded-lg hover:bg-muted/40 bg-background text-foreground text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showMyTasksOnly}
              onChange={(e) => setShowMyTasksOnly(e.target.checked)}
              className="rounded size-3.5 border-border text-primary focus:ring-primary"
            />
            <span className="font-medium">مهامي فقط</span>
          </label>

          <button
            onClick={() => setShowFiltersSidebar(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <FunnelIcon className="h-5 w-5" />
            فلاتر متقدمة
          </button>

          {(filters.status ||
            filters.priority ||
            filters.type ||
            filters.search) && (
            <button
              onClick={clearFilters}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedTasks.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                {selectedTasks.length} مهمة محددة
              </span>
              <button
                onClick={() => setSelectedTasks([])}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              >
                إلغاء التحديد
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="border border-indigo-300 dark:border-indigo-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="">اختر إجراء...</option>
                <option value="delete">حذف المحدد</option>
                <optgroup label="تغيير الحالة">
                  <option value="status:TODO">للتنفيذ</option>
                  <option value="status:IN_PROGRESS">قيد العمل</option>
                  <option value="status:IN_REVIEW">مراجعة</option>
                  <option value="status:DONE">مكتمل</option>
                </optgroup>
                <optgroup label="تعيين مسؤول">
                  {teamMembers.map((member) => (
                    <option key={member.id} value={`assignee:${member.userId}`}>
                      {member.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                تنفيذ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="rounded-xl border border-border/40 bg-card ring-1 ring-foreground/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={
                    selectedTasks.length === tasks.length && tasks.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-border"
                />
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("title")}
                  className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  المهمة
                  {sortBy === "title" &&
                    (sortOrder === "asc" ? (
                      <ChevronUpIcon className="size-3" />
                    ) : (
                      <ChevronDownIcon className="size-3" />
                    ))}
                </button>
              </TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                النوع
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  الحالة
                  {sortBy === "status" &&
                    (sortOrder === "asc" ? (
                      <ChevronUpIcon className="size-3" />
                    ) : (
                      <ChevronDownIcon className="size-3" />
                    ))}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("priority")}
                  className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  الأولوية
                  {sortBy === "priority" &&
                    (sortOrder === "asc" ? (
                      <ChevronUpIcon className="size-3" />
                    ) : (
                      <ChevronDownIcon className="size-3" />
                    ))}
                </button>
              </TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                التقدم
              </TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                المسؤول
              </TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                المشروع
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("dueDate")}
                  className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  الاستحقاق
                  {sortBy === "dueDate" &&
                    (sortOrder === "asc" ? (
                      <ChevronUpIcon className="size-3" />
                    ) : (
                      <ChevronDownIcon className="size-3" />
                    ))}
                </button>
              </TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                إجراءات
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-48 text-center">
                  <div className="animate-spin rounded-full size-8 border-b-2 border-primary mx-auto" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={10} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <ExclamationTriangleIcon className="size-12 text-destructive/60 mb-3" />
                    <p className="text-destructive font-medium mb-2">
                      {error}
                    </p>
                    <Button size="sm" onClick={() => fetchTasks()}>
                      إعادة المحاولة
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/30">
                      <ClipboardDocumentListIcon className="size-8 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-lg font-black text-foreground mt-4 mb-1">
                      لا توجد مهام
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-[240px]">
                      ابدأ بإنشاء مهمة جديدة لتتبع عمل فريقك
                    </p>
                    <Button size="sm" onClick={() => navigate("/super-admin/dev-tasks/new")}>
                      <PlusIcon className="size-4" />
                      إنشاء مهمة جديدة
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                  const typeInfo =
                    TASK_TYPES[task.type] || TASK_TYPES["FEATURE"];

                  // Get status info from settings or default
                  const statusInfo =
                    settings?.taskStatuses?.find(
                      (s: any) => s.value === task.status,
                    ) ||
                    TASK_STATUSES[task.status] ||
                    TASK_STATUSES["BACKLOG"];

                  // Get priority info from settings or default
                  const priorityInfo =
                    settings?.taskPriorities?.find(
                      (p: any) => p.value === task.priority,
                    ) ||
                    PRIORITY_CONFIG[task.priority] ||
                    PRIORITY_CONFIG["MEDIUM"];

                  const isOverdue =
                    task.dueDate &&
                    new Date(task.dueDate) < new Date() &&
                    task.status !== "DONE";

                  return (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate(`/super-admin/dev-tasks/${task.id}`)
                      }
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => toggleSelectTask(task.id)}
                          className="rounded border-border"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <Link
                            to={`/super-admin/dev-tasks/${task.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-foreground truncate hover:text-primary block"
                          >
                            {task.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 text-muted-foreground text-xs">
                            {task.commentsCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <ChatBubbleLeftIcon className="size-3" />
                                {task.commentsCount}
                              </span>
                            )}
                            {task.attachmentsCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <PaperClipIcon className="size-3" />
                                {task.attachmentsCount}
                              </span>
                            )}
                            {task.subtasksCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <ClipboardDocumentListIcon className="size-3" />
                                {task.subtasksCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {typeInfo?.icon}
                          {typeInfo?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {statusInfo?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${priorityInfo?.color || ""}`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {priorityInfo?.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[100px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {task.progress}%
                            </span>
                            {task.estimatedHours > 0 && (
                              <span className="text-muted-foreground/70">
                                {task.actualHours}/{task.estimatedHours}h
                              </span>
                            )}
                          </div>
                          <Progress value={task.progress} className="h-1.5" />
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {task.tags.slice(0, 2).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                              {task.tags.length > 2 && (
                                <span className="text-[10px] text-muted-foreground/50">
                                  +{task.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.assigneeName ? (
                          <div className="flex items-center gap-2">
                            {task.assigneeAvatar ? (
                              <img
                                src={task.assigneeAvatar}
                                alt=""
                                className="size-6 rounded-full"
                              />
                            ) : (
                              <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                {task.assigneeName.charAt(0)}
                              </div>
                            )}
                            <span className="text-sm text-foreground">
                              {task.assigneeName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground/50">
                            غير محدد
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.projectName ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor: task.projectColor || "#6366f1",
                              }}
                            />
                            <span className="text-sm text-foreground">
                              {task.projectName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground/50">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <span
                            className={`flex items-center gap-1 text-sm ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}
                          >
                            <CalendarDaysIcon className="size-4" />
                            {new Date(task.dueDate).toLocaleDateString("ar-EG")}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground/50">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/super-admin/dev-tasks/${task.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="عرض"
                          >
                            <EyeIcon className="size-4" />
                          </Link>
                          {userPermissions?.canEdit && (
                            <Link
                              to={`/super-admin/dev-tasks/${task.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="تعديل"
                            >
                              <PencilIcon className="size-4" />
                            </Link>
                          )}
                          {userPermissions?.canDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="حذف"
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              عرض {(pagination.page - 1) * pagination.limit + 1} -{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              من {pagination.total}
            </div>
            <select
              value={pagination.limit}
              onChange={(e) =>
                setPagination((prev) => ({
                  ...prev,
                  limit: parseInt(e.target.value),
                  page: 1,
                }))
              }
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            >
              <option value="10">10 / صفحة</option>
              <option value="20">20 / صفحة</option>
              <option value="50">50 / صفحة</option>
              <option value="100">100 / صفحة</option>
            </select>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
              <span className="px-2 text-sm text-muted-foreground">
                صفحة {pagination.page} من {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Sidebar */}
      {showFiltersSidebar && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir={i18n.dir()}>
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowFiltersSidebar(false)}
          ></div>
          <div className="absolute left-0 top-0 bottom-0 w-96 bg-card border-l border-border shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                فلاتر متقدمة
              </h2>
              <button
                onClick={() => setShowFiltersSidebar(false)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <XMarkIcon className="size-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  الحالة
                </label>
                <select
                  value={pendingFilters.status}
                  onChange={(e) =>
                    handlePendingFilterChange("status", e.target.value)
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                >
                  <option value="">كل الحالات</option>
                  {(
                    settings?.taskStatuses ||
                    Object.entries(TASK_STATUSES).map(([key, value]) => ({
                      value: key,
                      ...value,
                    }))
                  ).map((opt: any) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الأولوية
                </label>
                <select
                  value={pendingFilters.priority}
                  onChange={(e) =>
                    handlePendingFilterChange("priority", e.target.value)
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">كل الأولويات</option>
                  {(
                    settings?.taskPriorities ||
                    Object.entries(PRIORITY_CONFIG).map(([key, value]) => ({
                      value: key,
                      ...value,
                    }))
                  ).map((opt: any) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  النوع
                </label>
                <select
                  value={pendingFilters.type}
                  onChange={(e) =>
                    handlePendingFilterChange("type", e.target.value)
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">كل الأنواع</option>
                  {Object.entries(TASK_TYPES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المشروع
                </label>
                <select
                  value={pendingFilters.projectId}
                  onChange={(e) =>
                    handlePendingFilterChange("projectId", e.target.value)
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">كل المشاريع</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المسؤول
                </label>
                <select
                  value={pendingFilters.assigneeId}
                  onChange={(e) =>
                    handlePendingFilterChange("assigneeId", e.target.value)
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">الكل</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Release Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الإصدار
                </label>
                <select
                  value={pendingFilters.releaseId}
                  onChange={(e) =>
                    handlePendingFilterChange("releaseId", e.target.value)
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">كل الإصدارات</option>
                  {releases.map((release) => (
                    <option key={release.id} value={release.id}>
                      v{release.version} - {release.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Component Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المكون
                </label>
                <select
                  value={pendingFilters.component}
                  onChange={(e) =>
                    handlePendingFilterChange("component", e.target.value)
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">الكل</option>
                  {/* Common Components List */}
                  {[
                    "Frontend",
                    "Backend",
                    "Database",
                    "API",
                    "Provider System",
                    "WhatsApp",
                    "Facebook",
                    "Mobile App",
                    "Design",
                    "DevOps",
                    "QA",
                  ].map((comp) => (
                    <option key={comp.toLowerCase()} value={comp.toLowerCase()}>
                      {comp}
                    </option>
                  ))}
                  {/* Dynamic Components from Settings if available */}
                  {settings?.components?.map((comp: string) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  التاريخ
                </label>
                <div className="mb-2">
                  <select
                    value={pendingFilters.dateType}
                    onChange={(e) =>
                      handlePendingFilterChange("dateType", e.target.value)
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm mb-2"
                  >
                    <option value="dueDate">تاريخ الاستحقاق</option>
                    <option value="createdAt">تاريخ الإنشاء</option>
                    <option value="updatedAt">تاريخ التحديث</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      من
                    </label>
                    <input
                      type="date"
                      value={pendingFilters.dueDateFrom}
                      onChange={(e) =>
                        handlePendingFilterChange("dueDateFrom", e.target.value)
                      }
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      إلى
                    </label>
                    <input
                      type="date"
                      value={pendingFilters.dueDateTo}
                      onChange={(e) =>
                        handlePendingFilterChange("dueDateTo", e.target.value)
                      }
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Tags Filter (Pills UI) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الوسوم
                </label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-indigo-500">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {pendingFilters.tags &&
                      pendingFilters.tags.split(",").map(
                        (tag: string, idx: number) =>
                          tag.trim() && (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                            >
                              {tag}
                              <button
                                onClick={() => removeTag(tag)}
                                className="hover:text-indigo-900 dark:hover:text-indigo-100"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ),
                      )}
                  </div>
                  <input
                    type="text"
                    placeholder="أضف وسماً واضغط Enter..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  اضغط Enter لإضافة الوسم
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowFiltersSidebar(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  مسح الكل
                </button>
                <button
                  onClick={applyPendingFilters}
                  className="flex-1 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
                >
                  تطبيق الفلاتر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          dir={i18n.dir()}
        >
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() =>
              setConfirmModal((prev) => ({ ...prev, show: false }))
            }
          ></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {confirmModal.title}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, show: false }))
                }
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevTasksList;
