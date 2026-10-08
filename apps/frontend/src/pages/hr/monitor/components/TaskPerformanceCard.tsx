import React from 'react';
import { CheckCircle2, Clock, PauseCircle, AlertCircle, ArrowUpRight, ShieldCheck, ListTodo } from 'lucide-react';

export interface CompletedTaskItem {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  completedAt?: string;
  projectName?: string;
}

export interface CreatedTaskItem {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  createdAt?: string;
  assignedToName?: string;
  projectName?: string;
}

export interface OpenTaskItem {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  projectName?: string;
}

export interface TaskPerformanceData {
  tasksCompletedCount: number;
  tasksOpenCount?: number;
  tasksOverdueCount?: number;
  tasksCreatedCount?: number;
  tasksPerHour?: number;
  avgActiveSecondsPerTask: number;
  avgIdleSecondsPerTask: number;
  activeRatioPct: number;
  idleRatioPct: number;
  idleToActiveRatio: string;
  operationalSignal?: {
    type: 'TASK_OVERLOAD' | 'DISTRACTION' | 'NEGLECT' | 'OFF_DEVICE_WORK' | 'STEADY_PERFORMANCE' | 'NORMAL';
    label: string;
    severity: 'info' | 'warning' | 'critical' | 'success';
    reason: string;
  } | null;
  tasks: CompletedTaskItem[];
  openTasks?: OpenTaskItem[];
  createdTasks?: CreatedTaskItem[];
}

interface TaskPerformanceCardProps {
  taskPerformance?: TaskPerformanceData;
  totalActiveSeconds: number;
  totalIdleSeconds: number;
}

export const TaskPerformanceCard: React.FC<TaskPerformanceCardProps> = ({
  taskPerformance,
  totalActiveSeconds,
  totalIdleSeconds,
}) => {
  const tasksCount = taskPerformance?.tasksCompletedCount || 0;
  const openCount = taskPerformance?.tasksOpenCount || 0;
  const overdueCount = taskPerformance?.tasksOverdueCount || 0;
  const createdTasksCount = taskPerformance?.tasksCreatedCount || 0;
  const tasksPerHour = taskPerformance?.tasksPerHour ?? 0;
  const tasks = taskPerformance?.tasks || [];
  const openTasks = taskPerformance?.openTasks || [];
  const createdTasks = taskPerformance?.createdTasks || [];
  const signal = taskPerformance?.operationalSignal;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} س ${m} د`;
    return `${m} د`;
  };

  const activePct = taskPerformance?.activeRatioPct ?? Math.round((totalActiveSeconds / (totalActiveSeconds + totalIdleSeconds || 1)) * 100);
  const idlePct = taskPerformance?.idleRatioPct ?? Math.round((totalIdleSeconds / (totalActiveSeconds + totalIdleSeconds || 1)) * 100);
  const idleMultiplier = taskPerformance?.idleToActiveRatio ?? (totalActiveSeconds > 0 ? (totalIdleSeconds / totalActiveSeconds).toFixed(1) : '0.0');
  const numMultiplier = parseFloat(idleMultiplier) || 0;

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              مؤشرات إنجاز وتكليف المهام واستغلال الوقت
            </h3>
            <p className="text-xs text-muted-foreground">
              تحليل دقيق للمهام المنفذة، المهام المتبقية، ومعدل إنجاز المهام بالساعة (Tasks / Hour)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 tabular-nums">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{tasksCount} مهام منفذة</span>
          </span>
          {openCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20 tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              <span>{openCount} قيد التنفيذ</span>
            </span>
          )}
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20 tabular-nums">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{overdueCount} متأخرة</span>
            </span>
          )}
          {createdTasksCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20 tabular-nums">
              <ListTodo className="h-3.5 w-3.5" />
              <span>{createdTasksCount} تم تكليفها</span>
            </span>
          )}
        </div>
      </div>

      {/* Operational Signal Diagnostic Banner */}
      {signal && signal.type !== 'NORMAL' && (
        <div
          className={`mt-3 flex items-start gap-2.5 rounded-lg border p-3 text-xs ${
            signal.type === 'TASK_OVERLOAD'
              ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
              : signal.type === 'DISTRACTION'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : signal.type === 'NEGLECT'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              : signal.type === 'STEADY_PERFORMANCE'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
          }`}
        >
          {signal.type === 'STEADY_PERFORMANCE' ? (
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-2">
              <span>التشخيص التشغيلي الموثق: {signal.label}</span>
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">{signal.reason}</p>
          </div>
        </div>
      )}

      {/* 4 Quantitative Metric Strips */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Tasks Completed & Avg Active Time */}
        <div className="rounded-lg border border-border/40 bg-muted/40 dark:bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>متوسط وقت العمل لكل مهمة</span>
            <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-foreground tabular-nums">
            {tasksCount > 0 ? formatDuration(taskPerformance?.avgActiveSecondsPerTask || 0) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {tasksCount > 0
              ? `بناءً على ${tasksCount} مهام منجزة بوقت عمل ${formatDuration(totalActiveSeconds)}`
              : 'لم تُسجل مهام مكتملة حتى الآن'}
          </div>
        </div>

        {/* Metric 2: Tasks Per Hour (Tamper-Proof Metric) */}
        <div className="rounded-lg border border-border/40 bg-muted/40 dark:bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>معدل الإنجاز بالساعة (Tasks/hr)</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-foreground tabular-nums">
            {tasksPerHour} <span className="text-xs font-normal text-muted-foreground">مهمة/ساعة</span>
          </div>
          <div className="mt-1 text-[11px] text-purple-600 dark:text-purple-400">
            مقياس محصن ضد التلاعب يعكس مخرجات العمل الحقيقية
          </div>
        </div>

        {/* Metric 3: Idle Time per Task */}
        <div className="rounded-lg border border-border/40 bg-muted/40 dark:bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>متوسط وقت التوقف لكل مهمة</span>
            <PauseCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-foreground tabular-nums">
            {tasksCount > 0 ? formatDuration(taskPerformance?.avgIdleSecondsPerTask || 0) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {tasksCount > 0
              ? `إجمالي فترات التوقف: ${formatDuration(totalIdleSeconds)}`
              : `إجمالي التوقف: ${formatDuration(totalIdleSeconds)}`}
          </div>
        </div>

        {/* Metric 4: Active vs Idle Ratio Factor */}
        <div className="rounded-lg border border-border/40 bg-muted/40 dark:bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>استغلال الوقت (نشاط مقابل توقف)</span>
            {numMultiplier < 1.0 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className="mt-2 text-lg font-bold text-foreground tabular-nums">
            {activePct}% عمل{' '}
            <span className="text-xs font-normal text-muted-foreground">
              ({idlePct}% استراحة/توقف)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {numMultiplier < 1.0
              ? `معدل نشاط ممتاز: العمل يمثل ${activePct}% من الوقت`
              : `تنبيه: وقت التوقف (${idleMultiplier}x) يتجاوز وقت العمل الفعلي`}
          </div>
        </div>
      </div>

      {/* Visual Work vs Inactivity Comparison Bar */}
      <div className="mt-3 space-y-1 rounded-lg border border-border/40 bg-muted/40 dark:bg-zinc-950/40 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
            وقت العمل الفعلي: {formatDuration(totalActiveSeconds)} ({activePct}%)
          </span>
          <span className="font-medium text-amber-600 dark:text-amber-400 tabular-nums">
            وقت التوقف والخمول: {formatDuration(totalIdleSeconds)} ({idlePct}%)
          </span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${activePct}%` }}
            title={`عمل فعلي: ${activePct}%`}
          />
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: `${idlePct}%` }}
            title={`توقف وخمول: ${idlePct}%`}
          />
        </div>
      </div>

      {/* Completed Tasks List Table / Feed */}
      {tasks.length > 0 ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-border/40 bg-card dark:bg-zinc-950/30">
          <div className="border-b border-border/40 bg-muted/50 dark:bg-zinc-900/50 px-3 py-2 text-xs font-semibold text-foreground">
            المهام المنفذة والمسجلة اليوم ({tasks.length})
          </div>
          <div className="divide-y divide-border/20">
            {tasks.map((task) => {
              const timeStr = task.completedAt
                ? new Date(task.completedAt).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—';

              const isReview = task.status === 'IN_REVIEW';

              return (
                <div key={task.id} className="flex items-center justify-between p-2.5 text-xs transition-colors hover:bg-muted/50 dark:hover:bg-zinc-900/40">
                  <div className="flex items-center gap-2">
                    {isReview ? (
                      <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold text-foreground">{task.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        المشروع: {task.projectName || 'عام'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    {isReview ? (
                      <span className="rounded bg-amber-50 text-amber-700 border border-amber-200 dark:border-transparent dark:bg-amber-500/10 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-medium">
                        قيد الاعتماد
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:border-transparent dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-medium">
                        معتمدة
                      </span>
                    )}
                    {task.priority && (
                      <span className="rounded bg-muted dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-muted-foreground dark:text-zinc-300">
                        {task.priority}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {isReview ? 'سُلّمت:' : 'اكتملت:'} {timeStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border/40 p-3 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
          <span>
            لم تُسجل مهام رسمية مكتملة اليوم على النظام. قد يكون وقت العمل الفعلي ({formatDuration(totalActiveSeconds)}) مستهلكاً في اجتماعات، تواصل، أو مهام غير مسندة في النظام.
          </span>
        </div>
      )}

      {/* Created / Delegated Tasks List */}
      {createdTasks.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border/40 bg-card dark:bg-zinc-950/30">
          <div className="flex items-center gap-1.5 border-b border-border/40 bg-muted/50 dark:bg-zinc-900/50 px-3 py-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
            <ListTodo className="h-3.5 w-3.5" />
            <span>المهام التي قام الموظف بإنشائها وتكليفها اليوم ({createdTasks.length})</span>
          </div>
          <div className="divide-y divide-border/20">
            {createdTasks.map((task) => {
              const timeStr = task.createdAt
                ? new Date(task.createdAt).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—';

              return (
                <div key={task.id} className="flex items-center justify-between p-2.5 text-xs transition-colors hover:bg-muted/50 dark:hover:bg-zinc-900/40">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">{task.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        المشروع: {task.projectName || 'عام'} • المكلّف به: <span className="text-foreground font-medium">{task.assignedToName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    {task.priority && (
                      <span className="rounded bg-muted dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-muted-foreground dark:text-zinc-300">
                        {task.priority}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      أُنشئت: {timeStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Open & Overdue Tasks List */}
      {openTasks.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border/40 bg-card dark:bg-zinc-950/30">
          <div className="flex items-center justify-between border-b border-border/40 bg-muted/50 dark:bg-zinc-900/50 px-3 py-2 text-xs font-semibold text-foreground">
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <Clock className="h-3.5 w-3.5" />
              <span>المهام المتبقية قيد التنفيذ ({openTasks.length})</span>
            </div>
            {overdueCount > 0 && (
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                منها {overdueCount} متأخرة عن موعدها
              </span>
            )}
          </div>
          <div className="divide-y divide-border/20">
            {openTasks.map((task) => {
              const dueStr = task.dueDate
                ? new Date(task.dueDate).toLocaleDateString('ar-EG', {
                    month: 'short',
                    day: 'numeric',
                  })
                : null;
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

              return (
                <div key={task.id} className="flex items-center justify-between p-2.5 text-xs transition-colors hover:bg-muted/50 dark:hover:bg-zinc-900/40">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-3.5 w-3.5 shrink-0 ${isOverdue ? 'text-rose-500' : 'text-indigo-500 dark:text-indigo-400'}`} />
                    <div>
                      <div className="font-semibold text-foreground">{task.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        المشروع: {task.projectName || 'عام'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    {isOverdue ? (
                      <span className="rounded bg-rose-50 text-rose-700 border border-rose-200 dark:border-transparent dark:bg-rose-500/10 dark:text-rose-300 px-1.5 py-0.5 text-[10px] font-bold">
                        متأخرة ({dueStr})
                      </span>
                    ) : dueStr ? (
                      <span className="text-[11px] text-muted-foreground">
                        تاريخ التسليم: {dueStr}
                      </span>
                    ) : null}
                    {task.priority && (
                      <span className="rounded bg-muted dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-muted-foreground dark:text-zinc-300">
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskPerformanceCard;
