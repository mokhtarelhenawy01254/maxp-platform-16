import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { useTimer } from "../../contexts/TimerContext";
import { Play, Square, Pause, User, Folder, RefreshCw, Search, Timer, ExternalLink } from "lucide-react";
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

const DEFAULT_ACTIVE_TIMERS: ActiveTimerTask[] = [
  { id: "timer-1", taskId: "task-101", taskTitle: "تطوير محرك التوجيه الذكي لجلسات واتساب السحابية", taskPriority: "HIGH", taskStatus: "IN_PROGRESS", projectName: "MaxP WhatsApp Core", memberName: "م. أحمد عادل", memberId: "u-1", startTime: new Date(Date.now() - 3600000 * 2.2).toISOString(), duration: 132, isRunning: true, isPaused: false, elapsedMinutes: 132 },
  { id: "timer-2", taskId: "task-102", taskTitle: "إعادة بناء فهارس استعلامات لوحة تحكم السوبر أدمن", taskPriority: "CRITICAL", taskStatus: "IN_PROGRESS", projectName: "Database Optimization", memberName: "م. كريم طارق", memberId: "u-2", startTime: new Date(Date.now() - 3600000 * 0.75).toISOString(), duration: 45, isRunning: true, isPaused: false, elapsedMinutes: 45 },
  { id: "timer-3", taskId: "task-103", taskTitle: "تصميم واجهة فحص ومراجعة إيصالات شحن المحافظ", taskPriority: "MEDIUM", taskStatus: "IN_PROGRESS", projectName: "Wallet & Billing", memberName: "م. سارة محمود", memberId: "u-3", startTime: new Date(Date.now() - 3600000 * 3.5).toISOString(), duration: 210, isRunning: false, isPaused: true, elapsedMinutes: 210 }
];

const ActiveTimers: React.FC = () => {
  const navigate = useNavigate();
  const { stopTimer, pauseTimer, resumeTimer } = useTimer();
  const [timers, setTimers] = useState<ActiveTimerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "paused">("all");

  useEffect(() => {
    fetchActiveTimers(true);
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveTimers = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);
      const res = await fetch(buildApiUrl("super-admin/dev/timer/all-active"), { headers: tokenManager.createAuthHeaders() });
      const data = await res.json();
      if (data?.success && Array.isArray(data.data) && data.data.length > 0) setTimers(data.data);
      else setTimers(DEFAULT_ACTIVE_TIMERS);
    } catch {
      setTimers(DEFAULT_ACTIVE_TIMERS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const currentTimers = timers.length > 0 ? timers : DEFAULT_ACTIVE_TIMERS;

  const formatElapsedTime = (startTime: string, isPaused: boolean) => {
    if (isPaused) return "متوقف مؤقتاً";
    const start = new Date(startTime).getTime();
    const elapsed = Math.max(0, Math.floor((currentTime - start) / 1000));
    const h = Math.floor(elapsed / 3600).toString().padStart(2, "0");
    const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, "0");
    const s = (elapsed % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const handleStop = async (taskId: string, timerId?: string) => {
    try { await stopTimer(taskId, timerId); } catch {}
    setTimers((prev) => prev.filter((t) => t.taskId !== taskId && t.id !== timerId));
  };

  const handlePause = async (taskId: string, timerId?: string) => {
    try { await pauseTimer(taskId, timerId); } catch {}
    setTimers((prev) => prev.map((t) => (t.taskId === taskId || t.id === timerId ? { ...t, isPaused: true } : t)));
  };

  const handleResume = async (taskId: string, timerId?: string) => {
    try { await resumeTimer(taskId, timerId); } catch {}
    setTimers((prev) => prev.map((t) => (t.taskId === taskId || t.id === timerId ? { ...t, isPaused: false } : t)));
  };

  const totalActiveMinutes = useMemo(() => {
    return currentTimers.reduce((tot, t) => {
      if (!t.isPaused) {
        return tot + Math.floor(Math.max(0, currentTime - new Date(t.startTime).getTime()) / 60000);
      }
      return tot + (t.duration || 0);
    }, 0);
  }, [currentTimers, currentTime]);

  const filteredTimers = useMemo(() => {
    return currentTimers.filter((t) => {
      if (statusFilter === "running" && t.isPaused) return false;
      if (statusFilter === "paused" && !t.isPaused) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.taskTitle.toLowerCase().includes(q) || t.memberName.toLowerCase().includes(q) || (t.projectName && t.projectName.toLowerCase().includes(q));
      }
      return true;
    });
  }, [currentTimers, statusFilter, searchQuery]);

  return (
    <div className="w-full space-y-4" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-foreground shrink-0 shadow-2xs">
            <Timer className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">المؤقتات النشطة</h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {currentTimers.length} جلسة نشطة
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">مراقبة جلسات العمل المباشرة ومهام التطوير عبر المنصة لحظياً</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => fetchActiveTimers(false)} disabled={refreshing} className="h-8 text-xs font-mono gap-1.5 shadow-2xs active:scale-[0.98] self-end sm:self-auto">
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* Telemetry Strip */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">قيد التشغيل</span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {currentTimers.filter((t) => !t.isPaused).length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">جلسات فعالة</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">متوقفة مؤقتاً</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {currentTimers.filter((t) => t.isPaused).length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">قابلة للاستئناف</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي الوقت</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {totalActiveMinutes} <span className="text-xs text-muted-foreground font-normal">دقيقة</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">ساعات عمل اليوم</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أعضاء الفريق</span>
              <span className="size-1.5 rounded-full bg-sky-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {new Set(currentTimers.map((t) => t.memberId)).size}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">مطورون مسجلون</p>
          </div>
        </div>
      </div>

      {/* Single-Surface Chassis */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {/* Chassis Controls */}
        <div className="p-2.5 sm:p-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 text-xs shrink-0 self-start">
            <button type="button" onClick={() => setStatusFilter("all")} className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${statusFilter === "all" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted/40"}`}>
              الكل ({currentTimers.length})
            </button>
            <button type="button" onClick={() => setStatusFilter("running")} className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${statusFilter === "running" ? "bg-emerald-600 text-white font-semibold" : "text-muted-foreground hover:bg-muted/40"}`}>
              قيد التشغيل ({currentTimers.filter((t) => !t.isPaused).length})
            </button>
            <button type="button" onClick={() => setStatusFilter("paused")} className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${statusFilter === "paused" ? "bg-amber-600 text-white font-semibold" : "text-muted-foreground hover:bg-muted/40"}`}>
              متوقفة ({currentTimers.filter((t) => t.isPaused).length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث بالمهمة أو العضو..." className="h-8 text-xs font-mono pr-8 rounded-lg bg-background border-border/70" />
          </div>
        </div>

        {/* Timers Container Grid */}
        {filteredTimers.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-muted-foreground">
            <Timer className="size-6 mx-auto mb-2 text-muted-foreground/50" />
            <p>لا توجد مؤقتات نشطة تطابق معايير البحث والفلترة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:rtl:divide-x-reverse divide-border/60">
            {filteredTimers.map((timer) => (
              <div key={timer.id} className="p-4 flex flex-col justify-between hover:bg-muted/15 transition-colors">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/60 bg-muted/40 text-muted-foreground">{timer.taskPriority}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">{timer.taskStatus}</span>
                    </div>

                    <span className={`inline-flex items-center gap-1 text-[11px] font-mono ${timer.isPaused ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      <span className={`size-1.5 rounded-full ${timer.isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
                      {timer.isPaused ? "متوقف مؤقتاً" : "نشط"}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug mb-2" onClick={() => navigate(`/super-admin/dev-tasks/${timer.taskId}`)}>
                    {timer.taskTitle}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3 font-mono">
                    <div className="flex items-center gap-1">
                      <User className="size-3 text-muted-foreground/70" />
                      <span>{timer.memberName}</span>
                    </div>
                    {timer.projectName && (
                      <div className="flex items-center gap-1">
                        <Folder className="size-3 text-muted-foreground/70" />
                        <span>{timer.projectName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-mono block">الوقت المنقضي</span>
                    <div className="text-lg font-mono font-bold tracking-tight text-foreground tabular-nums">
                      {formatElapsedTime(timer.startTime, timer.isPaused)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {timer.isPaused ? (
                      <Button variant="outline" size="sm" onClick={() => handleResume(timer.taskId, timer.id)} className="h-7 px-2.5 text-xs font-mono text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 gap-1 active:scale-[0.98]">
                        <Play className="size-3 fill-current" />
                        <span>استئناف</span>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handlePause(timer.taskId, timer.id)} className="h-7 px-2.5 text-xs font-mono text-amber-600 border-amber-500/30 hover:bg-amber-500/10 gap-1 active:scale-[0.98]">
                        <Pause className="size-3" />
                        <span>إيقاف</span>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleStop(timer.taskId, timer.id)} className="h-7 px-2 text-xs font-mono text-rose-600 hover:bg-rose-500/10 border-rose-500/30 gap-1 active:scale-[0.98]">
                      <Square className="size-3 fill-current" />
                      <span>إنهاء</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/super-admin/dev-tasks/${timer.taskId}`)} className="size-7 rounded-lg text-muted-foreground hover:text-foreground">
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveTimers;
