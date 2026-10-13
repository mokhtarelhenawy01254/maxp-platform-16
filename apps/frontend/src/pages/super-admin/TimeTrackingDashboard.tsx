import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Users,
  CheckCircle,
  TrendingUp,
  Activity,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart,
  Timer,
  DollarSign,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";

interface DashboardStats {
  totalHours: number;
  billableHours: number;
  activeMembers: number;
  totalMembers: number;
  tasksCompleted: number;
  avgTimePerTask: number;
  runningTimers: RunningTimer[];
}

interface RunningTimer {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string | null;
  taskId: string;
  taskTitle: string;
  taskType: string;
  startTime: string;
  elapsedMinutes: number;
}

interface TimeLog {
  id: string;
  taskId: string;
  taskTitle: string;
  taskType: string;
  taskPriority: string;
  taskStatus: string;
  projectName: string | null;
  projectColor: string | null;
  memberId: string;
  memberName: string;
  memberAvatar: string | null;
  startTime: string;
  endTime: string;
  duration: number;
  durationHours: string;
  description: string | null;
  isBillable: boolean;
}

interface MemberPerformance {
  memberId: string;
  userId: string;
  name: string;
  avatar: string | null;
  department: string | null;
  totalHours: string;
  billableHours: string;
  tasksCompleted: number;
  avgTaskDuration: string;
  efficiencyScore: number;
  timeLogCount: number;
}

const TimeTrackingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [memberPerformance, setMemberPerformance] = useState<
    MemberPerformance[]
  >([]);
  const [dateRange, setDateRange] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchAllData();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAllData(false);
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dateRange, customStartDate, customEndDate, autoRefresh]);

  const fetchAllData = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const params: any = { dateRange };
      if (dateRange === "custom") {
        if (customStartDate) params.startDate = customStartDate;
        if (customEndDate) params.endDate = customEndDate;
      }

      const [statsRes, logsRes, performanceRes] = await Promise.all([
        apiClient.get("super-admin/time-tracking/dashboard", { params }),
        apiClient.get("super-admin/time-tracking/logs", {
          params: { ...params, limit: 20 },
        }),
        apiClient.get("super-admin/time-tracking/members", { params }),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (logsRes.data.success) setTimeLogs(logsRes.data.data);
      if (performanceRes.data.success)
        setMemberPerformance(performanceRes.data.data);

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      const params: any = { dateRange, format };
      if (dateRange === "custom") {
        if (customStartDate) params.startDate = customStartDate;
        if (customEndDate) params.endDate = customEndDate;
      }

      const response = await apiClient.get("super-admin/time-tracking/export", {
        params,
        responseType: format === "csv" ? "blob" : "json",
      });

      if (format === "csv") {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `timesheet-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const blob = new Blob([JSON.stringify(response.data.data, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `timesheet-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting:", error);
    }
  };

  const formatDuration = (minutes: number): string => {
    const days = Math.floor(minutes / 1440); // 1440 minutes in a day
    const remainingMinutes = minutes % 1440;
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? "يوم" : "أيام"}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? "ساعة" : "ساعات"}`);
    if (mins > 0 || parts.length === 0)
      parts.push(`${mins} ${mins === 1 ? "دقيقة" : "دقائق"}`);

    return parts.join(" و ");
  };

  const getTaskTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      BUG: "bg-red-100 text-red-700",
      FEATURE: "bg-blue-100 text-blue-700",
      ENHANCEMENT: "bg-green-100 text-green-700",
      HOTFIX: "bg-orange-100 text-orange-700",
      SECURITY: "bg-purple-100 text-purple-700",
      REFACTOR: "bg-yellow-100 text-yellow-700",
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900`}
      >
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className={"text-gray-600 dark:text-gray-300"}>
            جاري تحميل البيانات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-6 w-full transition-colors bg-gray-50 dark:bg-gray-900`}
      dir={i18n.dir()}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1
              className={`text-3xl font-bold flex items-center gap-2 text-gray-900 dark:text-white`}
            >
              <Clock className="w-8 h-8 text-blue-600" />
              تتبع الوقت والإنتاجية
            </h1>
            <p className={`mt-1 text-gray-600 dark:text-gray-400`}>
              آخر تحديث: {lastUpdate.toLocaleTimeString("ar-EG")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                autoRefresh
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              <RefreshCw
                className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`}
              />
              تحديث تلقائي
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700`}
            >
              <Filter className="w-4 h-4" />
              فلاتر
            </button>

            <div className="relative">
              <button
                onClick={() =>
                  document
                    .getElementById("export-menu")
                    ?.classList.toggle("hidden")
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                تصدير
              </button>
              <div
                id="export-menu"
                className={`hidden absolute left-0 mt-2 w-48 rounded-lg shadow-lg border z-10 bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700`}
              >
                <button
                  onClick={() => handleExport("csv")}
                  className={`w-full px-4 py-2 text-right rounded-t-lg transition-colors hover:bg-gray-50 text-gray-900 dark:hover:bg-gray-700 dark:text-gray-300`}
                >
                  تصدير CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className={`w-full px-4 py-2 text-right rounded-b-lg transition-colors hover:bg-gray-50 text-gray-900 dark:hover:bg-gray-700 dark:text-gray-300`}
                >
                  تصدير JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div
            className={`p-4 rounded-lg shadow-sm border mb-4 transition-colors bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700`}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label
                      className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  الفترة الزمنية
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                >
                  <option value="today">اليوم</option>
                  <option value="yesterday">أمس</option>
                  <option value="week">آخر 7 أيام</option>
                  <option value="month">آخر 30 يوم</option>
                  <option value="custom">نطاق مخصص</option>
                </select>
              </div>

              {dateRange === "custom" && (
                <>
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      من تاريخ
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      إلى تاريخ
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs mb-6">
        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">إجمالي ساعات العمل</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {(stats?.totalHours ?? 0).toFixed(1)}h
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">
            قابل للفوترة: {(stats?.billableHours ?? 0).toFixed(1)}h
          </p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">الأعضاء النشطون</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {stats?.activeMembers}/{stats?.totalMembers}
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">
            يعملون الآن: {stats?.runningTimers.length || 0}
          </p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">المهام المكتملة</span>
            <span className="size-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {stats?.tasksCompleted || 0}
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">
            في الفترة المحددة
          </p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">متوسط وقت المهمة</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {(stats?.avgTimePerTask ?? 0).toFixed(1)}h
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">
            لكل مهمة منجزة
          </p>
        </div>
      </div>

      {/* Live Activity */}
      {stats?.runningTimers && stats.runningTimers.length > 0 && (
        <div
          className={`p-6 rounded-lg shadow-sm border mb-6 transition-colors ${
            "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
          }`}
        >
          <h2
            className={`text-xl font-bold mb-4 flex items-center gap-2 ${
              "text-gray-900 dark:text-white"
            }`}
          >
            <Activity className="w-5 h-5 text-green-600" />
            النشاط الحي
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400`}
            >
              {stats.runningTimers.length} يعملون الآن
            </span>
          </h2>

          <div className="space-y-3">
            {stats.runningTimers.map((timer) => (
              <div
                key={timer.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {timer.memberAvatar ? (
                      <img
                        src={timer.memberAvatar}
                        alt={timer.memberName}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          "bg-blue-100 dark:bg-blue-900"
                        }`}
                      >
                        <span
                          className={`font-medium ${
                            "text-blue-600 dark:text-blue-300"
                          }`}
                        >
                          {timer.memberName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                  </div>

                  <div>
                    <p
                      className={`font-medium ${
                        "text-gray-900 dark:text-white"
                      }`}
                    >
                      {timer.memberName}
                    </p>
                    <p
                      className={`text-sm ${
                        "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {timer.taskTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getTaskTypeColor(timer.taskType)}`}
                  >
                    {timer.taskType}
                  </span>
                  <div
                    className={`flex items-center gap-2 ${
                      "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <Timer className="w-4 h-4" />
                    <span className="font-mono font-medium">
                      {formatDuration(timer.elapsedMinutes)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Time Logs */}
        <div
          className={`p-6 rounded-lg shadow-sm border transition-colors ${
            "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
          }`}
        >
          <h2
            className={`text-xl font-bold mb-4 flex items-center gap-2 ${
              "text-gray-900 dark:text-white"
            }`}
          >
            <Calendar className="w-5 h-5 text-blue-600" />
            سجلات الوقت الأخيرة
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {timeLogs.length > 0 ? (
              timeLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 border rounded-lg transition-colors cursor-pointer border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700`}
                  onClick={() =>
                    navigate(`/super-admin/dev-tasks/${log.taskId}`)
                  }
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p
                        className={`font-medium text-sm ${
                          "text-gray-900 dark:text-white"
                        }`}
                      >
                        {log.taskTitle}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {log.memberName}
                      </p>
                    </div>
                    <div className="text-left">
                      <p
                        className={`font-bold ${
                          "text-gray-900 dark:text-white"
                        }`}
                      >
                        {formatDuration(log.duration)}
                      </p>
                      {log.isBillable && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                          <DollarSign className="w-3 h-3 ml-1" />
                          قابل للفوترة
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-2 text-xs ${
                      "text-gray-500"
                    }`}
                  >
                    <span
                      className={`px-2 py-0.5 rounded ${getTaskTypeColor(log.taskType)}`}
                    >
                      {log.taskType}
                    </span>
                    {log.projectName && (
                      <span className="px-2 py-0.5 rounded bg-gray-100">
                        {log.projectName}
                      </span>
                    )}
                    <span>
                      {new Date(log.startTime).toLocaleString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p
                className={`text-center py-8 ${
                  "text-gray-500"
                }`}
              >
                لا توجد سجلات في هذه الفترة
              </p>
            )}
          </div>
        </div>

        {/* Team Performance */}
        <div
          className={`p-6 rounded-lg shadow-sm border transition-colors ${
            "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
          }`}
        >
          <h2
            className={`text-xl font-bold mb-4 flex items-center gap-2 ${
              "text-gray-900 dark:text-white"
            }`}
          >
            <BarChart3 className="w-5 h-5 text-purple-600" />
            أداء الفريق
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {memberPerformance.length > 0 ? (
              memberPerformance.map((member, index) => (
                <div
                  key={member.memberId}
                  className={`p-3 border rounded-lg transition-colors border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-lg font-bold ${
                          "text-gray-400 dark:text-gray-600"
                        }`}
                      >
                        #{index + 1}
                      </span>
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            "bg-purple-100 dark:bg-purple-900"
                          }`}
                        >
                          <span
                            className={`text-sm font-medium ${
                              "text-purple-600 dark:text-purple-300"
                            }`}
                          >
                            {member.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p
                          className={`font-medium text-sm ${
                            "text-gray-900 dark:text-white"
                          }`}
                        >
                          {member.name}
                        </p>
                        {member.department && (
                          <p
                            className={`text-xs ${
                              "text-gray-500"
                            }`}
                          >
                            {member.department}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-left">
                      <p
                        className={`font-bold ${
                          "text-gray-900 dark:text-white"
                        }`}
                      >
                        {member.totalHours}h
                      </p>
                      <p
                        className={`text-xs ${
                          "text-gray-500"
                        }`}
                      >
                        {member.tasksCompleted} مهام
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div
                      className={`flex-1 rounded-full h-2 ${
                        "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((parseFloat(member.totalHours) / 8) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span
                      className={`font-medium ${
                        "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      كفاءة: {(member.efficiencyScore ?? 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                لا توجد بيانات في هذه الفترة
              </p>
            )}
          </div>
        </div>
      </div>

      {/* View Analytics Button */}
      <div className="text-center">
        <button
          onClick={() => navigate("/super-admin/time-tracking/analytics")}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 mx-auto"
        >
          <PieChart className="w-5 h-5" />
          عرض التحليلات المتقدمة والرسوم البيانية
        </button>
      </div>
    </div>
  );
};

export default TimeTrackingDashboard;
