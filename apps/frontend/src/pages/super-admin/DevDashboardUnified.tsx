import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  UserGroupIcon,
  ClockIcon,
  SparklesIcon,
  ListBulletIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  BriefcaseIcon,
  UsersIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import StatsCard from "../../components/monitoring/StatsCard";

interface UnifiedData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    averageCompletionTime: number;
    activeProjects: number;
    teamMembers: number;
  };
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  completionTrend: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
  teamPerformance: Array<{
    memberId: string;
    memberName: string;
    tasksCompleted: number;
    tasksInProgress: number;
    pendingTasks: number;
    overdueTasks: number;
    totalTasks: number;
    averageTime: number;
    completionRate: number;
  }>;
}

const DevDashboardUnified: React.FC = () => {
  const [data, setData] = useState<UnifiedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("0");

  const fetchData = useCallback(async () => {
    const controller = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const token = tokenManager.getAccessToken();
      if (!token) {
        setError("يجب تسجيل الدخول أولاً");
        setLoading(false);
        return;
      }

      const response = await fetch(
        buildApiUrl(`super-admin/dev/unified?period=${period}`),
        {
          headers: tokenManager.createAuthHeaders({
            "Content-Type": "application/json",
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        setError(`خطأ: ${response.status}`);
        setLoading(false);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || "فشل في جلب البيانات");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError("فشل في الاتصال بالخادم");
      }
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedTeamPerformance = useMemo(() => {
    if (!data?.teamPerformance) return [];
    return [...data.teamPerformance].sort((a, b) => {
      // Primary: Completed Tasks (Desc)
      if (b.tasksCompleted !== a.tasksCompleted) {
        return b.tasksCompleted - a.tasksCompleted;
      }
      // Secondary: In Progress (Desc)
      if (b.tasksInProgress !== a.tasksInProgress) {
        return b.tasksInProgress - a.tasksInProgress;
      }
      // Tertiary: Name (Asc)
      return a.memberName.localeCompare(b.memberName);
    });
  }, [data]);

  const stats = useMemo(() => {
    if (!data?.overview)
      return {
        totalTasks: 0,
        activeProjects: 0,
        averageCompletionTime: 0,
        teamMembers: 0,
      };
    return data.overview;
  }, [data]);

  const statusData = useMemo(() => {
    if (!data?.tasksByStatus) return [];
    return Object.entries(data.tasksByStatus).map(([name, value]) => ({
      name,
      value,
    }));
  }, [data]);

  const trendData = useMemo(() => {
    return data?.completionTrend || [];
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
          حدث خطأ
        </h3>
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            👥 أداء فريق التطوير
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            تحليل ومتابعة إنتاجية أعضاء الفريق
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-gray-900 dark:text-gray-100 text-sm outline-none cursor-pointer min-w-[140px] [&>option]:bg-white [&>option]:dark:bg-gray-800"
            >
              <option value="0">📅 اليوم</option>
              <option value="7">📅 آخر أسبوع</option>
              <option value="30">📅 آخر شهر</option>
              <option value="90">📅 آخر 3 أشهر</option>
              <option value="all">📊 كل الفترة</option>
            </select>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
            />
            تحديث
          </button>

          <Link
            to="/super-admin/dev-tasks"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm no-underline"
          >
            <ListBulletIcon className="h-5 w-5" />
            كل المهام
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="إجمالي المهام"
          value={stats.totalTasks}
          icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
          color="blue"
        />
        <StatsCard
          title="المشاريع النشطة"
          value={stats.activeProjects}
          icon={<BriefcaseIcon className="h-5 w-5" />}
          color="green"
        />
        <StatsCard
          title="متوسط زمن الإغلاق"
          value={`${Math.round(stats.averageCompletionTime || 0)} يوم`}
          icon={<ClockIcon className="h-5 w-5" />}
          color="yellow"
        />
        <StatsCard
          title="أعضاء الفريق"
          value={stats.teamMembers}
          icon={<UsersIcon className="h-5 w-5" />}
          color="gray"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-blue-500" />
            توزيع المهام حسب الحالة
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][
                          index % 5
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "none",
                    borderRadius: "8px",
                    color: "var(--color-primary-foreground)",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            اتجاه الإنجاز (آخر 30 يوم)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient
                    id="colorCompleted"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={"var(--color-border)"}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke={"var(--color-muted-foreground)"}
                  fontSize={10}
                />
                <YAxis stroke={"var(--color-muted-foreground)"} fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "none",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="مكتملة"
                  stroke="var(--color-success)"
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="جديدة"
                  stroke="var(--color-primary)"
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-indigo-500" />
          مقارنة أداء أعضاء الفريق
        </h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={sortedTeamPerformance}
              margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={"var(--color-border)"}
                vertical={false}
              />
              <XAxis
                dataKey="memberName"
                stroke={"var(--color-muted-foreground)"}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke={"var(--color-muted-foreground)"}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: `1px solid ${"var(--color-border)"}`,
                  borderRadius: "12px",
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                formatter={(value: string) => (
                  <span className="text-gray-600 dark:text-gray-300 text-xs font-medium">
                    {value}
                  </span>
                )}
              />
              <Bar
                dataKey="tasksCompleted"
                name="مهام مكتملة"
                fill="var(--color-success)"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
              <Bar
                dataKey="tasksInProgress"
                name="قيد العمل"
                fill="var(--color-primary)"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
              <Bar
                dataKey="overdueTasks"
                name="متأخرة"
                fill="var(--color-destructive)"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table & Rankings */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              تفاصيل أداء الفريق
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3 font-semibold">العضو</th>
                  <th className="px-4 py-3 text-center">مكتملة</th>
                  <th className="px-4 py-3 text-center">قيد العمل</th>
                  <th className="px-4 py-3 text-center">متأخرة</th>
                  <th className="px-4 py-3 text-center">معدل الإنجاز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedTeamPerformance.map((member) => (
                  <tr
                    key={member.memberId}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                      {member.memberName}
                    </td>
                    <td className="px-4 py-4 text-center text-green-600 dark:text-green-400 font-semibold">
                      {member.tasksCompleted}
                    </td>
                    <td className="px-4 py-4 text-center text-blue-600 dark:text-blue-400">
                      {member.tasksInProgress}
                    </td>
                    <td className="px-4 py-4 text-center text-red-600 dark:text-red-400">
                      {member.overdueTasks}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${member.completionRate >= 80 ? "bg-green-500" : member.completionRate >= 50 ? "bg-indigo-500" : "bg-orange-500"}`}
                            style={{ width: `${member.completionRate}%` }}
                          />
                        </div>
                        <span className="font-bold w-10">
                          {member.completionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-yellow-500" />
              الأفضل أداءً
            </h3>
            <div className="space-y-4">
              {sortedTeamPerformance.slice(0, 3).map((member, index) => (
                <div
                  key={member.memberId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {member.memberName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {member.tasksCompleted} مهمة مكتملة
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {member.completionRate}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-blue-500" />
              الأسرع إنجازاً
            </h3>
            <div className="space-y-4">
              {sortedTeamPerformance
                .filter((m) => m.averageTime > 0)
                .sort((a, b) => a.averageTime - b.averageTime)
                .slice(0, 3)
                .map((member) => (
                  <div
                    key={member.memberId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <UserGroupIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {member.memberName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          بمعدل إنجاز {member.completionRate}%
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {Math.round(member.averageTime)} يوم
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevDashboardUnified;
