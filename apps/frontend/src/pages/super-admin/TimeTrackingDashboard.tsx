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
  ChevronDown,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";
import { Button } from "../../components/ui/button";

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
    const days = Math.floor(minutes / 1440);
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
      BUG: "bg-destructive/10 text-destructive border-destructive/20",
      FEATURE: "bg-primary/10 text-primary border-primary/20",
      ENHANCEMENT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      HOTFIX: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      SECURITY: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      REFACTOR: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    };
    return colors[type] || "bg-muted text-muted-foreground border-border/40";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري تجميع سجلات تتبع الوقت والإنتاجية...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Unified Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Clock className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                تتبع الوقت والإنتاجية
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {stats?.runningTimers?.length || 0} يعملون الآن
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              متابعة مباشرة لساعات عمل المطورين والمهام المنجزة والفوترة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform ${
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                : ""
            }`}
          >
            <RefreshCw
              className={`size-3.5 ${autoRefresh ? "animate-spin text-emerald-600" : ""}`}
            />
            <span>{autoRefresh ? "تحديث تلقائي: نشط" : "تحديث تلقائي: معطل"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
          >
            <Filter className="size-3.5" />
            <span>فلاتر</span>
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                document.getElementById("export-menu")?.classList.toggle("hidden")
              }
              className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
            >
              <Download className="size-3.5" />
              <span>تصدير</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
            <div
              id="export-menu"
              className="hidden absolute left-0 mt-1.5 w-40 rounded-lg shadow-lg border border-border bg-card z-20 text-xs overflow-hidden"
            >
              <button
                onClick={() => handleExport("csv")}
                className="w-full px-3 py-2 text-right transition-colors hover:bg-muted/40 text-foreground"
              >
                تصدير ملف CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                className="w-full px-3 py-2 text-right transition-colors hover:bg-muted/40 text-foreground border-t border-border/40"
              >
                تصدير ملف JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Drawer */}
      {showFilters && (
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-medium mb-1.5 text-muted-foreground">
                الفترة الزمنية
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full h-8 px-2.5 border border-border rounded-lg bg-background text-foreground outline-none font-medium"
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
                  <label className="block font-medium mb-1.5 text-muted-foreground">
                    من تاريخ
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full h-8 px-2.5 border border-border rounded-lg bg-background text-foreground outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1.5 text-muted-foreground">
                    إلى تاريخ
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full h-8 px-2.5 border border-border rounded-lg bg-background text-foreground outline-none font-mono"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Linear Telemetry Ribbon */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي ساعات العمل</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {(stats?.totalHours ?? 0).toFixed(1)}h
            </div>
            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
              قابل للفوترة: {(stats?.billableHours ?? 0).toFixed(1)}h
            </span>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الأعضاء النشطون</span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats?.activeMembers}/{stats?.totalMembers}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
              يعملون الآن: {stats?.runningTimers.length || 0}
            </span>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">المهام المكتملة</span>
              <span className="size-1.5 rounded-full bg-purple-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {stats?.tasksCompleted || 0}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">خلال الفترة المحددة</span>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">متوسط وقت المهمة</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {(stats?.avgTimePerTask ?? 0).toFixed(1)}h
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">لكل مهمة منجزة</span>
          </div>
        </div>
      </div>

      {/* Live Activity Chassis */}
      {stats?.runningTimers && stats.runningTimers.length > 0 && (
        <div className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-emerald-500" />
              <h2 className="text-xs font-semibold text-foreground">النشاط الحي المباشر</h2>
            </div>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
              {stats.runningTimers.length} يعملون الآن
            </span>
          </div>

          <div className="p-3 space-y-2">
            {stats.runningTimers.map((timer) => (
              <div
                key={timer.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    {timer.memberAvatar ? (
                      <img
                        src={timer.memberAvatar}
                        alt={timer.memberName}
                        className="size-8 rounded-full border border-border"
                      />
                    ) : (
                      <div className="size-8 rounded-full flex items-center justify-center bg-primary/10 text-primary border border-primary/20 text-xs font-bold font-mono">
                        {timer.memberName.charAt(0)}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 size-2 bg-emerald-500 rounded-full ring-2 ring-card animate-pulse" />
                  </div>

                  <div>
                    <p className="font-medium text-xs text-foreground">
                      {timer.memberName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-md">
                      {timer.taskTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${getTaskTypeColor(
                      timer.taskType,
                    )}`}
                  >
                    {timer.taskType}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-foreground font-mono tabular-nums">
                    <Timer className="size-3.5 text-muted-foreground" />
                    <span>{formatDuration(timer.elapsedMinutes)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Logs & Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Time Logs */}
        <div className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground">
                سجلات الوقت الأخيرة
              </h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {timeLogs.length} سجل
            </span>
          </div>

          <div className="divide-y divide-border/40 max-h-96 overflow-y-auto">
            {timeLogs.length > 0 ? (
              timeLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/super-admin/dev-tasks/${log.taskId}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-foreground truncate">
                        {log.taskTitle}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {log.memberName}
                      </p>
                    </div>
                    <div className="text-left font-mono shrink-0">
                      <p className="font-bold text-xs text-foreground tabular-nums">
                        {formatDuration(log.duration)}
                      </p>
                      {log.isBillable && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <DollarSign className="size-2.5 mr-0.5" />
                          فوترة
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                    <span
                      className={`px-1 py-0.2 rounded border ${getTaskTypeColor(
                        log.taskType,
                      )}`}
                    >
                      {log.taskType}
                    </span>
                    {log.projectName && (
                      <span className="px-1 py-0.2 rounded bg-muted border border-border/40 font-sans">
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
              <p className="text-center py-10 text-xs text-muted-foreground">
                لا توجد سجلات في هذه الفترة
              </p>
            )}
          </div>
        </div>

        {/* Team Performance */}
        <div className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground">
                أداء وإنتاجية الفريق
              </h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {memberPerformance.length} عضو
            </span>
          </div>

          <div className="divide-y divide-border/40 max-h-96 overflow-y-auto font-mono">
            {memberPerformance.length > 0 ? (
              memberPerformance.map((member, index) => (
                <div key={member.memberId} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-muted-foreground font-mono w-4">
                        #{index + 1}
                      </span>
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="size-7 rounded-full border border-border"
                        />
                      ) : (
                        <div className="size-7 rounded-full flex items-center justify-center bg-primary/10 text-primary border border-primary/20 text-xs font-bold font-mono">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-xs text-foreground font-sans">
                          {member.name}
                        </p>
                        {member.department && (
                          <p className="text-[10px] text-muted-foreground font-sans">
                            {member.department}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <p className="font-bold text-xs text-foreground tabular-nums">
                        {member.totalHours}h
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {member.tasksCompleted} مهام
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-[10px]">
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{
                          width: `${Math.min(
                            (parseFloat(member.totalHours) / 8) * 100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground font-sans tabular-nums">
                      كفاءة: {(member.efficiencyScore ?? 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-10 text-xs text-muted-foreground">
                لا توجد بيانات في هذه الفترة
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Analytics Link Bar */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={() => navigate("/super-admin/time-tracking/analytics")}
          variant="outline"
          size="sm"
          className="h-9 px-4 text-xs font-medium gap-2 shadow-2xs active:scale-[0.98] transition-transform"
        >
          <PieChart className="size-4 text-primary" />
          <span>عرض التحليلات المتقدمة والرسوم البيانية</span>
        </Button>
      </div>
    </div>
  );
};

export default TimeTrackingDashboard;
