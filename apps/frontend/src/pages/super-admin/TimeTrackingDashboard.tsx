import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Filter,
  RefreshCw,
  PieChart,
  Download,
  ChevronDown,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  TimeTrackingLiveTimers,
  type RunningTimer,
} from "./TimeTrackingLiveTimers";
import {
  TimeTrackingRecentLogs,
  type TimeLog,
} from "./TimeTrackingRecentLogs";
import {
  TimeTrackingTeamPerformance,
  type MemberPerformance,
} from "./TimeTrackingTeamPerformance";

interface DashboardStats {
  totalHours: number;
  billableHours: number;
  activeMembers: number;
  totalMembers: number;
  tasksCompleted: number;
  avgTimePerTask: number;
  runningTimers: RunningTimer[];
}

export default function TimeTrackingDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [memberPerformance, setMemberPerformance] = useState<MemberPerformance[]>([]);
  const [dateRange, setDateRange] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    void fetchAllData();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        void fetchAllData(false);
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
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      setExportMenuOpen(false);
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

  if (loading && !stats) {
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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir={i18n.dir()}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Clock className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              تتبع الوقت والإنتاجية
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {stats?.runningTimers?.length || 0} يعملون الآن
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            متابعة مباشرة لساعات عمل المطورين والمهام المنجزة والفوترة
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98] ${
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
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <Filter className="size-3.5" />
            <span>فلاتر</span>
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
            >
              <Download className="size-3.5" />
              <span>تصدير</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
            {exportMenuOpen && (
              <div
                className="absolute left-0 mt-1.5 w-36 rounded-md shadow-lg border border-border/70 bg-card z-20 text-xs overflow-hidden font-mono"
              >
                <button
                  onClick={() => void handleExport("csv")}
                  className="w-full px-3 py-2 text-right transition-colors hover:bg-muted/40 text-foreground"
                >
                  تصدير CSV
                </button>
                <button
                  onClick={() => void handleExport("json")}
                  className="w-full px-3 py-2 text-right transition-colors hover:bg-muted/40 text-foreground border-t border-border/40"
                >
                  تصدير JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Drawer */}
      {showFilters && (
        <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                الفترة الزمنية
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full h-8 px-2.5 border border-border/70 rounded-md bg-background text-foreground text-xs font-mono"
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
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                    من تاريخ
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full h-8 px-2 border border-border/70 rounded-md bg-background text-foreground text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                    إلى تاريخ
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full h-8 px-2 border border-border/70 rounded-md bg-background text-foreground text-xs font-mono"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="text-[11px] font-mono">ساعات العمل</span>
            <span className="size-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {(stats?.totalHours ?? 0).toFixed(1)}h
          </div>
          <span className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
            مفوتر: {(stats?.billableHours ?? 0).toFixed(1)}h
          </span>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="text-[11px] font-mono">الأعضاء النشطون</span>
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {stats?.activeMembers}/{stats?.totalMembers}
          </div>
          <span className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
            يعملون الآن: {stats?.runningTimers.length || 0}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="text-[11px] font-mono">المهام المكتملة</span>
            <span className="size-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {stats?.tasksCompleted || 0}
          </div>
          <span className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">خلال الفترة</span>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="text-[11px] font-mono">متوسط وقت المهمة</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {(stats?.avgTimePerTask ?? 0).toFixed(1)}h
          </div>
          <span className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">لكل مهمة منجزة</span>
        </div>
      </div>

      {/* Live Activity Chassis */}
      {stats?.runningTimers && (
        <TimeTrackingLiveTimers runningTimers={stats.runningTimers} />
      )}

      {/* Recent Logs & Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TimeTrackingRecentLogs timeLogs={timeLogs} />
        <TimeTrackingTeamPerformance memberPerformance={memberPerformance} />
      </div>

      {/* Advanced Analytics Link Bar */}
      <div className="flex justify-center pt-1">
        <Button
          onClick={() => navigate("/super-admin/time-tracking/analytics")}
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-mono gap-1.5 border-border/70 active:scale-[0.98]"
        >
          <PieChart className="size-3.5 text-primary" />
          <span>عرض التحليلات المتقدمة والرسوم البيانية</span>
        </Button>
      </div>
    </div>
  );
}
