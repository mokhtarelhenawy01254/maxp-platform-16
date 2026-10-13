import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { useTimer } from "../../contexts/TimerContext";
import {
  Clock,
  Play,
  Square,
  Pause,
  User,
  Folder,
  RefreshCw,
  Search,
  Timer,
  CheckCircle2,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface ActiveTimerTask {
  id: string;
  taskId: string;
  taskTitle: string;
  taskPriority: string;
  taskStatus: string;
  projectName: string | null;
  memberName: string;
  memberId: string;
  startTime: string;
  duration: number;
  isRunning: boolean;
  isPaused: boolean;
  elapsedMinutes: number;
}

const ActiveTimers: React.FC = () => {
  const navigate = useNavigate();
  const { activeTimers, stopTimer, pauseTimer, resumeTimer } = useTimer();
  const [timers, setTimers] = useState<ActiveTimerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "paused">("all");

  useEffect(() => {
    fetchActiveTimers(true);
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchActiveTimers(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveTimers = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const response = await fetch(
        buildApiUrl("super-admin/dev/timer/all-active"),
        {
          headers: tokenManager.createAuthHeaders(),
        },
      );

      const data = await response.json();
      if (data.success) {
        setTimers(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching active timers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatElapsedTime = (startTime: string, isPaused: boolean) => {
    if (isPaused) return "متوقف مؤقتاً";

    const start = new Date(startTime).getTime();
    const elapsed = Math.max(0, Math.floor((currentTime - start) / 1000));
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleStopTimer = async (taskId: string, timerId?: string) => {
    if (!confirm("هل أنت متأكد من إيقاف هذا المؤقت؟")) return;

    try {
      await stopTimer(taskId, timerId);
      fetchActiveTimers(false);
    } catch (err) {
      console.error("Error stopping timer:", err);
    }
  };

  const handlePauseTimer = async (taskId: string, timerId?: string) => {
    try {
      await pauseTimer(taskId, timerId);
      fetchActiveTimers(false);
    } catch (err) {
      console.error("Error pausing timer:", err);
    }
  };

  const handleResumeTimer = async (taskId: string, timerId?: string) => {
    try {
      await resumeTimer(taskId, timerId);
      fetchActiveTimers(false);
    } catch (err) {
      console.error("Error resuming timer:", err);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
      case "URGENT":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
      case "HIGH":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "MEDIUM":
        return "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-primary/10 text-primary border-primary/20";
      case "IN_REVIEW":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30";
      case "DONE":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  const getTotalActiveMinutes = useMemo(() => {
    return timers.reduce((total, timer) => {
      if (!timer.isPaused) {
        const elapsed = Math.floor(
          Math.max(0, currentTime - new Date(timer.startTime).getTime()) / 60000,
        );
        return total + elapsed;
      }
      return total + (timer.duration || 0);
    }, 0);
  }, [timers, currentTime]);

  const filteredTimers = useMemo(() => {
    return timers.filter((t) => {
      if (statusFilter === "running" && t.isPaused) return false;
      if (statusFilter === "paused" && !t.isPaused) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.taskTitle.toLowerCase().includes(q) ||
          t.memberName.toLowerCase().includes(q) ||
          (t.projectName && t.projectName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [timers, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري فحص جلسات المؤقتات النشطة...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Timer className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">المؤقتات النشطة</h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {timers.length} جلسة
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              مراقبة جلسات العمل المباشرة ومهام التطوير عبر المنصة لحظياً
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchActiveTimers(false)}
          disabled={refreshing}
          className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform self-end sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">مؤقتات قيد التشغيل</span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {timers.filter((t) => !t.isPaused).length}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">متوقفة مؤقتاً</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {timers.filter((t) => t.isPaused).length}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي الوقت المنقضي</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {getTotalActiveMinutes}{" "}
              <span className="text-xs font-sans text-muted-foreground font-normal">دقيقة</span>
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أعضاء الفريق النشطون</span>
              <span className="size-1.5 rounded-full bg-sky-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {new Set(timers.map((t) => t.memberId)).size}
            </div>
          </div>
        </div>
      </div>

      {/* Single-Surface Chassis */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        {/* Chassis Controls */}
        <div className="p-2.5 sm:p-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/40 text-xs shrink-0 self-start">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({timers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("running")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "running"
                  ? "bg-card text-primary shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              قيد التشغيل ({timers.filter((t) => !t.isPaused).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("paused")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "paused"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              متوقفة مؤقتاً ({timers.filter((t) => t.isPaused).length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالمهمة أو العضو أو المشروع..."
              className="h-8 text-xs pr-8 rounded-lg bg-card border-border/60"
            />
          </div>
        </div>

        {/* Timers Container */}
        {filteredTimers.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="size-8 text-muted-foreground/40 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              لا توجد مؤقتات تطابق البحث
            </h3>
            <p className="text-xs text-muted-foreground">
              {timers.length === 0 ? "جميع المهام وجلسات العمل متوقفة حالياً." : "جرب تعديل كلمة البحث أو فلتر الحالة."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:rtl:divide-x-reverse divide-border/60">
            {filteredTimers.map((timer) => {
              const isMyTimer = activeTimers.some(
                (activeTimer) =>
                  activeTimer.id === timer.id || activeTimer.taskId === timer.taskId,
              );

              return (
                <div
                  key={timer.id}
                  className={`p-4 flex flex-col justify-between transition-colors hover:bg-muted/30 ${
                    isMyTimer ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  <div>
                    {/* Header: Badges & Task Title */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isMyTimer && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/15 text-primary border border-primary/30">
                            جلستك
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getPriorityBadge(timer.taskPriority)}`}
                        >
                          {timer.taskPriority}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusBadge(timer.taskStatus)}`}
                        >
                          {timer.taskStatus}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          timer.isPaused ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            timer.isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                          }`}
                        />
                        {timer.isPaused ? "متوقف مؤقتاً" : "نشط"}
                      </span>
                    </div>

                    <h3
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug mb-3"
                      onClick={() => navigate(`/super-admin/dev-tasks/${timer.taskId}`)}
                    >
                      {timer.taskTitle}
                    </h3>

                    {/* Metadata: Member & Project */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 font-mono">
                      <div className="flex items-center gap-1">
                        <User className="size-3 text-muted-foreground/70" />
                        <span className="font-sans">{timer.memberName}</span>
                      </div>
                      {timer.projectName && (
                        <div className="flex items-center gap-1">
                          <Folder className="size-3 text-muted-foreground/70" />
                          <span className="font-sans">{timer.projectName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timer Box & Action Bar */}
                  <div className="pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground font-mono">الوقت المنقضي</span>
                        <div className="text-xl font-mono font-bold tracking-tight text-foreground tabular-nums">
                          {formatElapsedTime(timer.startTime, timer.isPaused)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {timer.isPaused ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResumeTimer(timer.taskId, timer.id)}
                            className="h-7.5 px-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-1 active:scale-[0.98] transition-transform"
                          >
                            <Play className="size-3 fill-current" />
                            <span>استئناف</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePauseTimer(timer.taskId, timer.id)}
                            className="h-7.5 px-2.5 text-xs font-medium text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1 active:scale-[0.98] transition-transform"
                          >
                            <Pause className="size-3" />
                            <span>إيقاف مؤقت</span>
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStopTimer(timer.taskId, timer.id)}
                          className="h-7.5 px-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30 gap-1 active:scale-[0.98] transition-transform"
                          title="إيقاف المؤقت"
                        >
                          <Square className="size-3 fill-current" />
                          <span>إيقاف</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/super-admin/dev-tasks/${timer.taskId}`)}
                          className="size-7.5 rounded-lg text-muted-foreground hover:text-foreground"
                          title="عرض المهمة"
                        >
                          <ExternalLink className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveTimers;
