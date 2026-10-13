import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Plus,
  Trash2,
  Folder,
  Users,
  BarChart3,
  ListFilter,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Timer as TimerIcon,
  Activity,
  Layers,
} from "lucide-react";
import { Button } from "../../components/ui/button";

interface TaskOption {
  id: string;
  title: string;
  projectName: string | null;
  status: string;
}

interface TimerGroup {
  id: string;
  name: string;
  description: string | null;
  isRunning: boolean;
  startTime: string | null;
  dev_tasks: { id: string; title: string; status: string }[];
}

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

interface WorkingTimeData {
  totalMinutes: number;
  totalHours: number;
  mergedIntervalCount: number;
  perTask: {
    taskId: string;
    totalMinutes: number;
    intervals: { start: string; end: string; isRunning: boolean; isPaused: boolean }[];
  }[];
}

const DevTimerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeTimers, startTimer, stopTimer, pauseTimer, resumeTimer, elapsedSecondsByTask } = useTimer();

  const [allActiveTimers, setAllActiveTimers] = useState<ActiveTimerTask[]>([]);
  const [groups, setGroups] = useState<TimerGroup[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [workingTime, setWorkingTime] = useState<WorkingTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const [showAddTasks, setShowAddTasks] = useState<string | null>(null);
  const [quickTaskId, setQuickTaskId] = useState("");

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchAll(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    const headers = tokenManager.createAuthHeaders();
    await Promise.all([
      fetchActiveTimers(headers),
      fetchGroups(headers),
      fetchTasks(headers),
      fetchWorkingTime(headers),
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  const fetchActiveTimers = async (headers: HeadersInit) => {
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/timer/all-active"), { headers });
      const data = await res.json();
      if (data.success) setAllActiveTimers(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchGroups = async (headers: HeadersInit) => {
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/timer/groups"), { headers });
      const data = await res.json();
      if (data.success) setGroups(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchTasks = async (headers: HeadersInit) => {
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/tasks?limit=100"), { headers });
      const data = await res.json();
      if (data.success) setTasks(data.data?.tasks || data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchWorkingTime = async (headers: HeadersInit) => {
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/timer/total-working-time"), { headers });
      const data = await res.json();
      if (data.success) setWorkingTime(data.data);
    } catch (err) { console.error(err); }
  };

  const headers = tokenManager.createAuthHeaders();

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/timer/groups"), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc, taskIds: selectedTaskIds }),
      });
      const data = await res.json();
      if (data.success) {
        setGroups(prev => [data.data, ...prev]);
        setShowCreateGroup(false);
        setNewGroupName("");
        setNewGroupDesc("");
        setSelectedTaskIds([]);
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("حذف هذه المجموعة؟")) return;
    try {
      const res = await fetch(buildApiUrl(`super-admin/dev/timer/groups/${id}`), {
        method: "DELETE",
        headers,
      });
      if (res.ok) setGroups(prev => prev.filter(g => g.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleStartGroup = async (id: string) => {
    try {
      const res = await fetch(buildApiUrl(`super-admin/dev/timer/groups/${id}/timer/start`), {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setGroups(prev => prev.map(g => g.id === id ? { ...g, isRunning: true, startTime: data.data.startTime } : g));
        fetchAll(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleStopGroup = async (id: string) => {
    try {
      const res = await fetch(buildApiUrl(`super-admin/dev/timer/groups/${id}/timer/stop`), {
        method: "POST",
        headers,
      });
      if (res.ok) {
        setGroups(prev => prev.map(g => g.id === id ? { ...g, isRunning: false, startTime: null } : g));
        fetchAll(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleAddTasksToGroup = async (groupId: string) => {
    if (selectedTaskIds.length === 0) return;
    try {
      const res = await fetch(buildApiUrl(`super-admin/dev/timer/groups/${groupId}/tasks`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: selectedTaskIds }),
      });
      const data = await res.json();
      if (data.success) {
        setGroups(prev => prev.map(g => g.id === groupId ? data.data : g));
        setShowAddTasks(null);
        setSelectedTaskIds([]);
      }
    } catch (err) { console.error(err); }
  };

  const handleRemoveTask = async (groupId: string, taskId: string) => {
    try {
      const res = await fetch(buildApiUrl(`super-admin/dev/timer/groups/${groupId}/tasks/${taskId}`), {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, dev_tasks: g.dev_tasks.filter(t => t.id !== taskId) } : g));
      }
    } catch (err) { console.error(err); }
  };

  const handleQuickStart = async () => {
    if (!quickTaskId) return;
    const task = tasks.find(t => t.id === quickTaskId);
    if (task) {
      await startTimer(task.id, task.title, task.projectName || undefined);
      setQuickTaskId("");
      fetchAll(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatElapsedTime = (startTime: string, isPaused: boolean) => {
    if (isPaused) return "متوقف مؤقتاً";
    const elapsed = Math.max(0, Math.floor((currentTime - new Date(startTime).getTime()) / 1000));
    return formatTime(elapsed);
  };

  const ungroupedTasks = useMemo(() => {
    const groupedTaskIds = new Set(groups.flatMap(g => g.dev_tasks.map(t => t.id)));
    return tasks.filter(t => !groupedTaskIds.has(t.id));
  }, [tasks, groups]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري تحميل لوحة المؤقتات...</span>
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
            <TimerIcon className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">لوحة التحكم - المؤقتات</h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {groups.length} مجموعة
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              إدارة شاملة للمؤقتات، مجموعات العمل، وتتبع الإنتاجية البرمجية
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAll(false)}
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
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">مؤقتاتي النشطة</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {activeTimers.length}
            </div>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">مؤقتات الفريق النشطة</span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {allActiveTimers.length}
            </div>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي وقت العمل اليوم</span>
              <BarChart3 className="size-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {workingTime ? `${Math.floor(workingTime.totalHours)}س ${workingTime.totalMinutes % 60}د` : "0س 0د"}
            </div>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">مجموعات قيد التشغيل</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {groups.filter(g => g.isRunning).length} <span className="text-xs font-normal text-muted-foreground font-sans">/ {groups.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left Column: Groups + Quick Timer */}
        <div className="space-y-4">
          {/* Quick Timer */}
          <div className="bg-card rounded-xl border border-border/80 dark:border-border/60 p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="size-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-foreground">مؤقت سريع</h2>
            </div>
            <div className="flex gap-2">
              <select
                value={quickTaskId}
                onChange={e => setQuickTaskId(e.target.value)}
                className="flex-1 h-9 px-3 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors"
              >
                <option value="">اختر مهمة للبدء فوراً...</option>
                {ungroupedTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <Button
                onClick={handleQuickStart}
                disabled={!quickTaskId}
                size="sm"
                className="h-9 px-3 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs active:scale-[0.98] transition-transform"
              >
                <Play className="size-3.5 fill-current" />
                <span>بدء</span>
              </Button>
            </div>
          </div>

          {/* Timer Groups */}
          <div className="bg-card rounded-xl border border-border/80 dark:border-border/60 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">مجموعات المؤقت</h2>
                {groups.length > 0 && (
                  <span className="bg-muted text-muted-foreground font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded">
                    {groups.length}
                  </span>
                )}
              </div>
              <Button
                onClick={() => setShowCreateGroup(true)}
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 gap-1 active:scale-[0.98] transition-transform"
              >
                <Plus className="size-3" />
                <span>جديد</span>
              </Button>
            </div>

            {showCreateGroup && (
              <div className="mb-4 p-3 bg-muted/40 rounded-lg border border-border/70 space-y-2">
                <input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="اسم المجموعة..."
                  className="w-full h-8 px-2.5 border border-border rounded-md text-xs bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
                <input
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="الوصف (اختياري)..."
                  className="w-full h-8 px-2.5 border border-border rounded-md text-xs bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
                <div className="max-h-32 overflow-y-auto border border-border rounded-md p-1.5 bg-background">
                  {ungroupedTasks.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-2">لا توجد مهام متاحة</p>
                  ) : (
                    ungroupedTasks.map(t => (
                      <label key={t.id} className="flex items-center gap-2 py-1 px-1.5 text-xs cursor-pointer hover:bg-muted rounded">
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.includes(t.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedTaskIds(prev => [...prev, t.id]);
                            else setSelectedTaskIds(prev => prev.filter(id => id !== t.id));
                          }}
                          className="rounded border-border text-primary focus:ring-primary size-3.5"
                        />
                        <span className="truncate text-foreground text-[11px]">{t.title}</span>
                      </label>
                    ))
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleCreateGroup} size="sm" className="flex-1 h-7 text-xs">
                    إنشاء المجموعة
                  </Button>
                  <Button
                    onClick={() => { setShowCreateGroup(false); setNewGroupName(""); setSelectedTaskIds([]); }}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}

            {groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="size-7 mx-auto mb-1.5 opacity-30" />
                <p className="text-xs">لا توجد مجموعات بعد</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {groups.map(group => (
                  <div
                    key={group.id}
                    className={`border rounded-lg p-3 transition-colors ${
                      group.isRunning
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-border/70 bg-card hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {group.isRunning ? (
                          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        ) : (
                          <span className="size-2 rounded-full bg-muted-foreground/40" />
                        )}
                        <span className="font-semibold text-xs text-foreground truncate">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {group.isRunning ? (
                          <button
                            onClick={() => handleStopGroup(group.id)}
                            className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                            title="إيقاف المجموعة"
                          >
                            <Square className="size-3 fill-current" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartGroup(group.id)}
                            disabled={group.dev_tasks.length === 0}
                            className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                            title="تشغيل المجموعة"
                          >
                            <Play className="size-3 fill-current" />
                          </button>
                        )}
                        <button
                          onClick={() => { setShowAddTasks(group.id); setSelectedTaskIds([]); }}
                          className="p-1 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="إضافة مهام"
                        >
                          <Plus className="size-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-1 rounded bg-muted text-muted-foreground hover:text-destructive transition-colors"
                          title="حذف المجموعة"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>

                    {group.description && (
                      <p className="text-[11px] text-muted-foreground mb-1.5 line-clamp-1">{group.description}</p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                      <span className="font-mono tabular-nums">{group.dev_tasks?.length ?? 0} مهمة</span>
                      {group.isRunning && group.startTime && (
                        <span className="text-emerald-600 font-mono font-medium tabular-nums">
                          {formatElapsedTime(group.startTime, false)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(group.dev_tasks ?? []).map(task => (
                        <span key={task.id} className="inline-flex items-center gap-1 text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/40">
                          <span className="truncate max-w-[120px] text-foreground">{task.title}</span>
                          <button onClick={() => handleRemoveTask(group.id, task.id)} className="text-muted-foreground hover:text-destructive">
                            <X className="size-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {showAddTasks === group.id && (
                      <div className="mt-2.5 p-2 bg-background rounded border border-border/80">
                        <p className="text-[10px] font-medium text-muted-foreground mb-1">اختر مهام للإضافة:</p>
                        <div className="max-h-24 overflow-y-auto space-y-1">
                          {ungroupedTasks.filter(t => !(group.dev_tasks ?? []).some(gt => gt.id === t.id)).length === 0 ? (
                            <p className="text-[10px] text-muted-foreground py-1 text-center">كل المهام موجودة</p>
                          ) : (
                            ungroupedTasks.filter(t => !(group.dev_tasks ?? []).some(gt => gt.id === t.id)).map(t => (
                              <label key={t.id} className="flex items-center gap-1.5 py-0.5 text-[11px] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedTaskIds.includes(t.id)}
                                  onChange={e => {
                                    if (e.target.checked) setSelectedTaskIds(prev => [...prev, t.id]);
                                    else setSelectedTaskIds(prev => prev.filter(id => id !== t.id));
                                  }}
                                  className="rounded size-3 border-border"
                                />
                                <span className="truncate text-foreground">{t.title}</span>
                              </label>
                            ))
                          )}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button onClick={() => handleAddTasksToGroup(group.id)} size="sm" className="flex-1 h-6 text-[10px]">
                            إضافة
                          </Button>
                          <Button onClick={() => setShowAddTasks(null)} size="sm" variant="outline" className="h-6 text-[10px]">
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Active Timers */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border/80 dark:border-border/60 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TimerIcon className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">مؤقتاتي النشطة</h2>
                {activeTimers.length > 0 && (
                  <span className="bg-primary/10 text-primary font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded border border-primary/20">
                    {activeTimers.length}
                  </span>
                )}
              </div>
            </div>

            {activeTimers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="size-7 mx-auto mb-1.5 opacity-30" />
                <p className="text-xs">لا توجد مؤقتات نشطة حالياً</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeTimers.map(timer => (
                  <div
                    key={timer.id || timer.taskId}
                    className="border border-border/80 rounded-lg p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium text-foreground text-xs truncate cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/super-admin/dev-tasks/${timer.taskId}`)}
                        >
                          {timer.taskTitle || "بدون عنوان"}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-muted-foreground mt-0.5">
                          {formatTime(elapsedSecondsByTask[timer.taskId || ""] || 0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {timer.isPaused ? (
                          <button
                            onClick={() => resumeTimer(timer.taskId!, timer.id!)}
                            className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                            title="استئناف"
                          >
                            <Play className="size-3.5 fill-current" />
                          </button>
                        ) : (
                          <button
                            onClick={() => pauseTimer(timer.taskId!, timer.id!)}
                            className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
                            title="إيقاف مؤقت"
                          >
                            <Pause className="size-3.5 fill-current" />
                          </button>
                        )}
                        <button
                          onClick={() => stopTimer(timer.taskId!, timer.id!)}
                          className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          title="إيقاف نهائي"
                        >
                          <Square className="size-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Active Timers */}
          <div className="bg-card rounded-xl border border-border/80 dark:border-border/60 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">مؤقتات الفريق المباشرة</h2>
                <span className="bg-muted text-muted-foreground font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded">
                  {allActiveTimers.length}
                </span>
              </div>
            </div>

            {allActiveTimers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="size-6 mx-auto mb-1 opacity-30" />
                <p className="text-xs">لا توجد مؤقتات نشطة لأعضاء الفريق</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto divide-y divide-border/40">
                {allActiveTimers.map(timer => (
                  <div key={timer.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`size-2 rounded-full shrink-0 ${timer.isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{timer.taskTitle}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{timer.memberName}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0">
                      {formatElapsedTime(timer.startTime, timer.isPaused)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Today's Summary */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border/80 dark:border-border/60 p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">ملخص اليوم</h2>
            </div>

            {workingTime && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                    <p className="text-muted-foreground text-[10px]">إجمالي الوقت</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
                      {Math.floor(workingTime.totalHours)}س {workingTime.totalMinutes % 60}د
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                    <p className="text-muted-foreground text-[10px]">الفترات المدمجة</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
                      {workingTime.mergedIntervalCount}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 p-3 bg-card">
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">الوقت لكل مهمة مسجلة</p>
                  {!workingTime.perTask || workingTime.perTask.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-2">لا يوجد وقت مسجل اليوم</p>
                  ) : (
                    <div className="space-y-1.5">
                      {workingTime.perTask.slice(0, 5).map(pt => (
                        <div key={pt.taskId} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                          <button
                            onClick={() => navigate(`/super-admin/dev-tasks/${pt.taskId}`)}
                            className="text-primary hover:underline truncate max-w-[150px] text-right text-[11px]"
                          >
                            {pt.taskId.slice(0, 8)}...
                          </button>
                          <span className="font-mono tabular-nums text-muted-foreground text-[11px]">
                            {pt.totalMinutes} د
                          </span>
                        </div>
                      ))}
                      {workingTime.perTask.length > 5 && (
                        <p className="text-[10px] text-muted-foreground text-center pt-1">+{workingTime.perTask.length - 5} مهمة أخرى</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Telemetry Table */}
          <div className="bg-card rounded-xl border border-border/80 dark:border-border/60 p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">إحصائيات المنصة</h2>
            </div>
            <div className="divide-y divide-border/50 text-xs">
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">مؤقتاتي النشطة</span>
                <span className="font-mono font-bold tabular-nums text-foreground">{activeTimers.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">مؤقتات الفريق المباشرة</span>
                <span className="font-mono font-bold tabular-nums text-foreground">{allActiveTimers.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">إجمالي مجموعات العمل</span>
                <span className="font-mono font-bold tabular-nums text-foreground">{groups.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">مجموعات قيد العمل الآن</span>
                <span className="font-mono font-bold tabular-nums text-emerald-600">{groups.filter(g => g.isRunning).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevTimerDashboard;