import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import {
  ClockIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  UserGroupIcon,
  FolderIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { TaskUnifiedFilterBar } from "../../components/tasks/TaskUnifiedFilterBar";
import {
  UnifiedTaskFilters,
  parseUnifiedFiltersFromUrl,
  filterTasksWithUnifiedEngine,
} from "../../components/tasks/taskFilterEngine";

interface TimeEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  description: string;
  createdAt: string;
}

interface UserTimeStats {
  userId: string;
  userName: string;
  totalMinutes: number;
  tasksCount: number;
}

interface ProjectTimeStats {
  projectId: string;
  projectName: string;
  totalMinutes: number;
  tasksCount: number;
}

interface DailyStats {
  date: string;
  totalMinutes: number;
  entriesCount: number;
}

export interface TimeEvaluationTask {
  taskId: string;
  title: string;
  status: string;
  assignedTo: string | null;
  assigneeName: string | null;
  projectName: string | null;
  estimatedMinutes: number;
  estimatedHours: number;
  actualMinutes: number;
  actualHours: number;
  diffMinutes: number;
  diffHours: number;
  diffPct: number;
  accuracyPct: number;
  sessionsCount: number;
  firstSession: string | null;
  lastSession: string | null;
  reworkMinutes: number;
  returnReasonType: string | null;
  returnSeverity: number | null;
}

export interface TimeEvaluationSummary {
  totalTasks: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  overallAccuracyPct: number;
  totalReworkMinutes: number;
}

type TimeReportsTab = "entries" | "users" | "projects" | "daily" | "evaluation";

const RETURN_REASON_LABELS: Record<string, string> = {
  MISSING_EVIDENCE: "نقص في أدلة الإنجاز",
  WRONG_EXECUTION: "خطأ في التنفيذ",
  CRITERIA_VIOLATION: "مخالفة معايير القبول",
  QUALITY: "جودة دون المستوى المطلوب",
  LATE: "تأخير في التسليم",
};

const RETURN_SEVERITY_LABELS: Record<number, string> = {
  1: "بسيط",
  2: "متوسط",
  3: "جسيم",
};

const TimeReports: React.FC = () => {
  const [unifiedFilters, setUnifiedFilters] = useState<UnifiedTaskFilters>(() =>
    parseUnifiedFiltersFromUrl(typeof window !== "undefined" ? window.location.search : "")
  );
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timeEvaluation, setTimeEvaluation] = useState<{ summary: TimeEvaluationSummary; tasks: TimeEvaluationTask[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TimeReportsTab>("entries");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [users, setUsers] = useState<
    { id: string; firstName: string; lastName: string }[]
  >([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const fetchTimeEvaluation = useCallback(async () => {
    try {
      const token = tokenManager.getAccessToken();
      const startDate = unifiedFilters.dueDateFrom || dateRange.startDate;
      const endDate = unifiedFilters.dueDateTo || dateRange.endDate;
      let url = `tasks/reports/time-evaluation?startDate=${startDate}&endDate=${endDate}`;
      const effectiveUser =
        unifiedFilters.assignedTo && unifiedFilters.assignedTo !== "all"
          ? unifiedFilters.assignedTo
          : selectedUser;
      if (effectiveUser) url += `&userId=${effectiveUser}`;
      if (selectedProject) url += `&projectId=${selectedProject}`;

      const response = await fetch(buildApiUrl(url), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data) {
        setTimeEvaluation(data.data);
      }
    } catch (error) {
      console.error("Error fetching time evaluation report:", error);
    }
  }, [dateRange, selectedProject, selectedUser, unifiedFilters]);

  const fetchTimeEntries = useCallback(async () => {
    try {
      setLoading(true);
      const token = tokenManager.getAccessToken();

      const startDate = unifiedFilters.dueDateFrom || dateRange.startDate;
      const endDate = unifiedFilters.dueDateTo || dateRange.endDate;
      let url = `tasks/time-entries?startDate=${startDate}&endDate=${endDate}`;
      const effectiveUser =
        unifiedFilters.assignedTo && unifiedFilters.assignedTo !== "all"
          ? unifiedFilters.assignedTo
          : selectedUser;
      if (effectiveUser) url += `&userId=${effectiveUser}`;
      if (selectedProject) url += `&projectId=${selectedProject}`;

      const response = await fetch(buildApiUrl(url), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTimeEntries(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching time entries:", error);
      setTimeEntries([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedProject, selectedUser, unifiedFilters]);

  const fetchUsers = useCallback(async () => {
    try {
      const token = tokenManager.getAccessToken();
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
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const token = tokenManager.getAccessToken();
      const response = await fetch(buildApiUrl("projects"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }, []);

  useEffect(() => {
    void fetchTimeEntries();
    void fetchTimeEvaluation();
    void fetchUsers();
    void fetchProjects();
  }, [fetchTimeEntries, fetchTimeEvaluation, fetchUsers, fetchProjects]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}س ${mins}د`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredTimeEntries = useMemo(() => {
    return timeEntries.filter((entry) => {
      if (unifiedFilters.search) {
        const query = unifiedFilters.search.toLowerCase();
        const matchesSearch =
          (entry.taskTitle && entry.taskTitle.toLowerCase().includes(query)) ||
          (entry.projectName && entry.projectName.toLowerCase().includes(query)) ||
          (entry.userName && entry.userName.toLowerCase().includes(query)) ||
          (entry.description && entry.description.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      if (unifiedFilters.assignedTo && unifiedFilters.assignedTo !== "all") {
        if (entry.userId !== unifiedFilters.assignedTo) return false;
      }
      return true;
    });
  }, [timeEntries, unifiedFilters]);

  // Calculate stats using filtered entries
  const totalMinutes = filteredTimeEntries.reduce(
    (sum, entry) => sum + (entry.duration || 0),
    0,
  );

  const userStats: UserTimeStats[] = Object.values(
    filteredTimeEntries.reduce(
      (acc, entry) => {
        if (!acc[entry.userId]) {
          acc[entry.userId] = {
            userId: entry.userId,
            userName: entry.userName,
            totalMinutes: 0,
            tasksCount: 0,
          };
        }
        acc[entry.userId]!.totalMinutes += entry.duration || 0;
        acc[entry.userId]!.tasksCount += 1;
        return acc;
      },
      {} as Record<string, UserTimeStats>,
    ),
  ).sort((a, b) => b.totalMinutes - a.totalMinutes);

  const projectStats: ProjectTimeStats[] = Object.values(
    filteredTimeEntries.reduce(
      (acc, entry) => {
        const projectId = entry.projectName || "no-project";
        if (!acc[projectId]) {
          acc[projectId] = {
            projectId,
            projectName: entry.projectName || "بدون مشروع",
            totalMinutes: 0,
            tasksCount: 0,
          };
        }
        const projectStatsEntry = acc[projectId]!;
        projectStatsEntry.totalMinutes += entry.duration || 0;
        projectStatsEntry.tasksCount += 1;
        return acc;
      },
      {} as Record<string, ProjectTimeStats>,
    ),
  ).sort((a, b) => b.totalMinutes - a.totalMinutes);

  const dailyStats: DailyStats[] = Object.values(
    filteredTimeEntries.reduce(
      (acc, entry) => {
        const date = entry.startTime?.split("T")[0] || "";
        if (!date) return acc;
        if (!acc[date]) {
          acc[date] = {
            date,
            totalMinutes: 0,
            entriesCount: 0,
          };
        }
        const dailyStatsEntry = acc[date]!;
        dailyStatsEntry.totalMinutes += entry.duration || 0;
        dailyStatsEntry.entriesCount += 1;
        return acc;
      },
      {} as Record<string, DailyStats>,
    ),
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const exportToCSV = () => {
    const headers = [
      "المهمة",
      "المشروع",
      "المستخدم",
      "تاريخ البدء",
      "وقت البدء",
      "المدة (دقائق)",
      "الوصف",
    ];
    const rows = filteredTimeEntries.map((entry) => [
      entry.taskTitle,
      entry.projectName || "غير محدد",
      entry.userName,
      formatDate(entry.startTime),
      formatTime(entry.startTime),
      entry.duration?.toString() || "0",
      entry.description || "",
    ]);

    const csvContent =
      "\uFEFF" + [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const startDate = unifiedFilters.dueDateFrom || dateRange.startDate;
    const endDate = unifiedFilters.dueDateTo || dateRange.endDate;
    link.download = `time_report_${startDate}_${endDate}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link
              to="/tasks"
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 dark:text-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5 ml-2" />
              العودة
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <ClockIcon className="h-7 w-7 text-indigo-600 ml-2" />
              تقارير الوقت
            </h1>
          </div>

          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <ArrowDownTrayIcon className="h-5 w-5 ml-2" />
            تصدير CSV
          </button>
        </div>
      </div>

      {/* Unified Filters Bar */}
      <TaskUnifiedFilterBar
        filters={unifiedFilters}
        onFiltersChange={setUnifiedFilters}
        users={users}
        onRefresh={() => {
          void fetchTimeEntries();
          void fetchTimeEvaluation();
        }}
        isLoading={loading}
        totalCount={timeEntries.length}
        filteredCount={filteredTimeEntries.length}
        className="mb-6"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                إجمالي الوقت
              </p>
              <p className="text-lg sm:text-2xl font-bold text-indigo-600">
                {formatDuration(totalMinutes)}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-indigo-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                عدد السجلات
              </p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filteredTimeEntries.length}
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                المستخدمين النشطين
              </p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                {userStats.length}
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                المشاريع النشطة
              </p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">
                {projectStats.length}
              </p>
            </div>
            <FolderIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                دقة التقدير
              </p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">
                {timeEvaluation?.summary?.overallAccuracyPct ?? 0}%
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                إعادة العمل
              </p>
              <p className="text-lg sm:text-2xl font-bold text-amber-600">
                {Math.round(timeEvaluation?.summary?.totalReworkMinutes ?? 0)} د
              </p>
            </div>
            <ArrowPathIcon className="h-8 w-8 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto">
            {[
              { id: "entries", label: "سجلات الوقت", icon: ClockIcon },
              { id: "evaluation", label: "تقييم الوقت وإعادة العمل", icon: ArrowPathIcon },
              { id: "users", label: "حسب المستخدم", icon: UserGroupIcon },
              { id: "projects", label: "حسب المشروع", icon: FolderIcon },
              { id: "daily", label: "حسب اليوم", icon: CalendarIcon },
            ].map((tab: { id: TimeReportsTab; label: string; icon: any }) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:border-gray-700-300"
                }`}
              >
                <tab.icon className="h-5 w-5 ml-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Entries Tab */}
          {activeTab === "entries" && (
            <div className="overflow-x-auto">
              {filteredTimeEntries.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد سجلات وقت في هذه الفترة</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        المهمة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        المشروع
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        المستخدم
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        التاريخ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        الوقت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        المدة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        الوصف
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                    {filteredTimeEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/tasks/${entry.taskId}`}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            {entry.taskTitle}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {entry.projectName || "غير محدد"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {entry.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(entry.startTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(entry.startTime)}
                          {entry.endTime && ` - ${formatTime(entry.endTime)}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-sm font-medium bg-indigo-100 text-indigo-800 rounded">
                            {formatDuration(entry.duration || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {entry.description || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Time Evaluation & Rework Tab */}
          {activeTab === "evaluation" && (
            <div className="space-y-6">
              {/* Telemetry Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">المهام المقيّمة</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {timeEvaluation?.summary?.totalTasks ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">إجمالي الساعات المقدرة</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {timeEvaluation?.summary?.totalEstimatedHours ?? 0} س
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">إجمالي الساعات الفعلية</span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {timeEvaluation?.summary?.totalActualHours ?? 0} س
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">دقة التقدير الإجمالية</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {timeEvaluation?.summary?.overallAccuracyPct ?? 0}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">إجمالي وقت إعادة العمل</span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {Math.round(timeEvaluation?.summary?.totalReworkMinutes ?? 0)} دقيقة
                  </span>
                </div>
              </div>

              {/* Tasks Evaluation Table */}
              <div className="overflow-x-auto">
                {!timeEvaluation?.tasks || timeEvaluation.tasks.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <ArrowPathIcon className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>لا توجد بيانات تقييم وقت أو مهام مطابقة في هذه الفترة</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                          المهمة والمشروع
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                          المكلّف
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                          الحالة
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                          المقدّر
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                          الفعلي
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                          الانحراف والدقة
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                          الجلسات
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                          وقت إعادة العمل
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {timeEvaluation.tasks.map((task) => {
                        const isOver = task.diffMinutes > 0 && task.estimatedMinutes > 0;
                        const returnReasonLabel = task.returnReasonType
                          ? (RETURN_REASON_LABELS[task.returnReasonType] || task.returnReasonType)
                          : null;
                        const returnSeverityLabel = task.returnSeverity
                          ? (RETURN_SEVERITY_LABELS[task.returnSeverity] || `شدة ${task.returnSeverity}`)
                          : null;

                        return (
                          <tr key={task.taskId} className="hover:bg-gray-50/75 dark:hover:bg-gray-750">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Link
                                to={`/tasks/${task.taskId}`}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 font-medium block truncate max-w-xs"
                                title={task.title}
                              >
                                {task.title}
                              </Link>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {task.projectName || "بدون مشروع"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                              {task.assigneeName || "غير محدد"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              <span className="px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                {task.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                              {task.estimatedHours} س
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                              {task.actualHours} س
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              <div className="flex items-center gap-1.5 tabular-nums">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-semibold ${
                                    isOver
                                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  }`}
                                >
                                  {task.diffHours > 0 ? `+${task.diffHours}س` : `${task.diffHours}س`} ({task.diffPct > 0 ? `+${task.diffPct}%` : `${task.diffPct}%`})
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  دقة: {task.accuracyPct}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                              <span>{task.sessionsCount} جلسات</span>
                              {task.firstSession && (
                                <span className="block text-[10px] text-gray-400">
                                  {new Date(task.firstSession).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              <span
                                className={`px-2 py-0.5 rounded font-bold tabular-nums ${
                                  task.reworkMinutes > 0
                                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                }`}
                              >
                                {Math.round(task.reworkMinutes)} د
                              </span>
                              {returnReasonLabel && (
                                <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                                  <span>{returnReasonLabel}</span>
                                  {returnSeverityLabel && (
                                    <span className="font-semibold">({returnSeverityLabel})</span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="space-y-4">
              {userStats.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد بيانات</p>
                </div>
              ) : (
                userStats.map((stat, index) => (
                  <div key={stat.userId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold ml-3">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {stat.userName}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-lg font-bold text-indigo-600">
                          {formatDuration(stat.totalMinutes)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                          ({stat.tasksCount} سجل)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{
                          width: `${(stat.totalMinutes / totalMinutes) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === "projects" && (
            <div className="space-y-4">
              {projectStats.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد بيانات</p>
                </div>
              ) : (
                projectStats.map((stat, index) => (
                  <div
                    key={stat.projectId}
                    className="bg-gray-50 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold ml-3">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {stat.projectName}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-lg font-bold text-green-600">
                          {formatDuration(stat.totalMinutes)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                          ({stat.tasksCount} سجل)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(stat.totalMinutes / totalMinutes) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Daily Tab */}
          {activeTab === "daily" && (
            <div className="space-y-4">
              {dailyStats.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد بيانات</p>
                </div>
              ) : (
                dailyStats.map((stat) => (
                  <div key={stat.date} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 text-gray-400 ml-2" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(stat.date)}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-lg font-bold text-blue-600">
                          {formatDuration(stat.totalMinutes)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                          ({stat.entriesCount} سجل)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((stat.totalMinutes / 480) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-left">
                      {stat.totalMinutes >= 480
                        ? "8+ ساعات"
                        : `${((stat.totalMinutes / 480) * 100).toFixed(0)}% من يوم العمل`}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeReports;
