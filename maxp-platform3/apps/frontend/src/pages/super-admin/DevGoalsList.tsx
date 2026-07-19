import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { useTheme } from "../../hooks/useTheme";
import {
  PlusIcon,
  FlagIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  TrashIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const goalTypeLabels: Record<string, string> = {
  COMPANY: "هدف شركة",
  TEAM: "هدف فريق",
  INDIVIDUAL: "هدف فردي",
};

const goalTypeColors: Record<string, string> = {
  COMPANY: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  TEAM: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  INDIVIDUAL: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: "نشط",
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    icon: <CheckCircleIcon className="h-4 w-4" />,
  },
  COMPLETED: {
    label: "مكتمل",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    icon: <FlagIcon className="h-4 w-4" />,
  },
  ON_HOLD: {
    label: "معلق",
    color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
    icon: <ClockIcon className="h-4 w-4" />,
  },
  CANCELLED: {
    label: "ملغي",
    color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    icon: <ExclamationTriangleIcon className="h-4 w-4" />,
  },
};

const confidenceConfig: Record<string, { label: string; color: string }> = {
  ON_TRACK: { label: "على المسار", color: "bg-green-500" },
  AT_RISK: { label: "في خطر", color: "bg-yellow-500" },
  OFF_TRACK: { label: "خارج المسار", color: "bg-red-500" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: "منخفضة", color: "bg-gray-400" },
  MEDIUM: { label: "متوسطة", color: "bg-yellow-500" },
  HIGH: { label: "عالية", color: "bg-orange-500" },
  CRITICAL: { label: "حرجة", color: "bg-red-500" },
};

interface Goal {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  targetType: string;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  progress: number;
  confidence: string | null;
  startDate: string;
  endDate: string;
  quarter: string | null;
  tags: string[];
  owner: { id: string; name: string; userId: string } | null;
  project: { id: string; name: string; color: string } | null;
  _count: { keyResults: number; linkedTasks: number; childGoals: number };
}

interface DashboardStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
  atRiskCount: number;
  totalKeyResults: number;
  completedKeyResults: number;
  totalLinkedTasks: number;
}

const DevGoalsList: React.FC = () => {
  const navigate = useNavigate();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterQuarter, setFilterQuarter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string>("endDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append("type", filterType);
      if (filterStatus) params.append("status", filterStatus);
      if (filterPriority) params.append("priority", filterPriority);
      if (filterQuarter) params.append("quarter", filterQuarter);

      const [goalsRes, statsRes] = await Promise.all([
        fetch(buildApiUrl(`super-admin/dev/goals?${params.toString()}`), {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        }),
        fetch(buildApiUrl(`super-admin/dev/goals/dashboard?${params.toString()}`), {
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
        }),
      ]);

      const goalsData = await goalsRes.json();
      const statsData = await statsRes.json();

      if (goalsData.success) setGoals(goalsData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      console.error("Error fetching goals:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, filterPriority, filterQuarter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(buildApiUrl(`super-admin/dev/goals/${id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setDeleteConfirm(null);
        fetchData();
      } else {
        alert(data.error || "فشل حذف الهدف");
      }
    } catch (err) {
      alert("فشل في الاتصال بالخادم");
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  const filteredGoals = goals
    .filter((goal) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        goal.title.toLowerCase().includes(s) ||
        goal.description?.toLowerCase().includes(s) ||
        goal.owner?.name.toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      const aVal = sortBy === "progress" ? a.progress : sortBy === "endDate" ? new Date(a.endDate).getTime() : a.priority.length;
      const bVal = sortBy === "progress" ? b.progress : sortBy === "endDate" ? new Date(b.endDate).getTime() : b.priority.length;
      return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FlagIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            الأهداف والنتائج الرئيسية (OKRs)
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            تتبع أهداف الفريق والمشاريع والاستراتيجية
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/super-admin/dev-goals/alignment")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <ChartBarIcon className="h-5 w-5" />
            شجرة المحاذاة
          </button>
          <button
            onClick={() => navigate("/super-admin/dev-goals/new")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            <PlusIcon className="h-5 w-5" />
            هدف جديد
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي الأهداف</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalGoals}</p>
              </div>
              <FlagIcon className="h-8 w-8 text-indigo-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">متوسط التقدم</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.avgProgress}%</p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">النتائج الرئيسية</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completedKeyResults}/{stats.totalKeyResults}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">في خطر</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.atRiskCount}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث في الأهداف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل الأنواع</option>
            <option value="COMPANY">شركة</option>
            <option value="TEAM">فريق</option>
            <option value="INDIVIDUAL">فردي</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="COMPLETED">مكتمل</option>
            <option value="ON_HOLD">معلق</option>
            <option value="CANCELLED">ملغي</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل الأولويات</option>
            <option value="LOW">منخفضة</option>
            <option value="MEDIUM">متوسطة</option>
            <option value="HIGH">عالية</option>
            <option value="CRITICAL">حرجة</option>
          </select>

          <select
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل الأQuarters</option>
            <option value="Q1-2026">Q1 2026</option>
            <option value="Q2-2026">Q2 2026</option>
            <option value="Q3-2026">Q3 2026</option>
            <option value="Q4-2026">Q4 2026</option>
          </select>

          {(filterType || filterStatus || filterPriority || filterQuarter || search) && (
            <button
              onClick={() => {
                setFilterType("");
                setFilterStatus("");
                setFilterPriority("");
                setFilterQuarter("");
                setSearch("");
              }}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FlagIcon className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              لا توجد أهداف
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              ابدأ بإنشاء هدف جديد لتتبع أداء فريقك
            </p>
            <button
              onClick={() => navigate("/super-admin/dev-goals/new")}
              className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="h-5 w-5 inline ml-2" />
              هدف جديد
            </button>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const statusInfo = statusConfig[goal.status] || statusConfig.ACTIVE;
            const confidenceInfo = goal.confidence ? confidenceConfig[goal.confidence] : null;
            const isOverdue = new Date(goal.endDate) < new Date() && goal.status === "ACTIVE";
            const isExpanded = expandedGoalId === goal.id;

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Progress Bar */}
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-r-xl transition-all ${getProgressColor(goal.progress)}`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>

                <div className="p-5">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${goalTypeColors[goal.type] || ""}`}>
                          {goalTypeLabels[goal.type] || goal.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                        {confidenceInfo && (
                          <span className="flex items-center gap-1 text-xs">
                            <span className={`w-2 h-2 rounded-full ${confidenceInfo.color}`} />
                            {confidenceInfo.label}
                          </span>
                        )}
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                            متأخر
                          </span>
                        )}
                      </div>
                      <h3
                        className="text-lg font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                        onClick={() => navigate(`/super-admin/dev-goals/${goal.id}`)}
                      >
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mr-4">
                      <div className="text-left">
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {goal.progress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Details */}
                  <div className="grid grid-cols-4 gap-4 mb-3 text-center">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">النتائج الرئيسية</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {goal._count.keyResults}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">المهام المرتبطة</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {goal._count.linkedTasks}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">أهداف فرعية</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {goal._count.childGoals}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">القيمة</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {goal.currentValue}/{goal.targetValue}
                        {goal.unit ? ` ${goal.unit}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {goal.owner && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-4 w-4" />
                          {goal.owner.name}
                        </span>
                      )}
                      {goal.project && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.project.color }} />
                          {goal.project.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarDaysIcon className="h-4 w-4" />
                        {new Date(goal.startDate).toLocaleDateString("ar-EG")} - {new Date(goal.endDate).toLocaleDateString("ar-EG")}
                      </span>
                      {goal.quarter && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {goal.quarter}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/super-admin/dev-goals/${goal.id}`)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
                        title="عرض"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/super-admin/dev-goals/${goal.id}/edit`)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
                        title="تعديل"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {deleteConfirm === goal.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(goal.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            تأكيد
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(goal.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600"
                          title="حذف"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DevGoalsList;
