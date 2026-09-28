import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Calendar,
  User,
  Building,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Coffee,
  Activity,
  Laptop,
  Globe,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ListTodo,
  History,
  Grid,
} from 'lucide-react';
import api from '../../../services/api';
import ActivityTimelineBar from './components/ActivityTimelineBar';
import AppUsageList from './components/AppUsageList';
import WebUsageList from './components/WebUsageList';
import TaskPerformanceCard from './components/TaskPerformanceCard';
import BreakDetailsCard from './components/BreakDetailsCard';

interface EmployeeMonitorDetailsProps {
  employeeIdProp?: string;
  onBackProp?: () => void;
  teamMembersProp?: { employeeId: string; employeeName?: string }[];
  onSelectEmployeeProp?: (id: string) => void;
}

export const EmployeeMonitorDetails: React.FC<EmployeeMonitorDetailsProps> = ({
  employeeIdProp,
  onBackProp,
  teamMembersProp = [],
  onSelectEmployeeProp,
}) => {
  const params = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const currentEmployeeId = employeeIdProp || params.employeeId;

  const [activeTab, setActiveTab] = useState<'tasks' | 'timeline' | 'apps'>('tasks');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    summary?: any;
    employee?: any;
    taskPerformance?: any;
    breaksSummary?: any;
    activities: any[];
    apps: any[];
    websites: any[];
  }>({
    activities: [],
    apps: [],
    websites: [],
  });

  const fetchDetails = useCallback(async () => {
    if (!currentEmployeeId) return;
    setLoading(true);
    try {
      const res: any = await api.get(
        `/employee-monitor/timeline/${currentEmployeeId}?date=${selectedDate}`
      );
      if (res?.data?.data) {
        setData({
          summary: res.data.data.summary,
          employee: res.data.data.employee,
          taskPerformance: res.data.data.taskPerformance,
          breaksSummary: res.data.data.breaksSummary,
          activities: res.data.data.activities || [],
          apps: res.data.data.apps || [],
          websites: res.data.data.websites || [],
        });
      }
    } catch (err) {
      console.warn('[EmployeeMonitorDetails] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentEmployeeId, selectedDate]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Fast Date Stepper Logic
  const handleDateStep = (daysOffset: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + daysOffset);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (current <= today) {
      setSelectedDate(current.toISOString().split('T')[0]);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Employee Switcher Navigation Logic
  const currentMemberIndex = teamMembersProp.findIndex((m) => m.employeeId === currentEmployeeId);
  const hasPrevMember = currentMemberIndex > 0;
  const hasNextMember = currentMemberIndex >= 0 && currentMemberIndex < teamMembersProp.length - 1;

  const handleSwitchEmployee = (targetId: string) => {
    if (onSelectEmployeeProp) {
      onSelectEmployeeProp(targetId);
    } else {
      navigate(`/hr/monitor/${targetId}`);
    }
  };

  const handleBack = () => {
    if (onBackProp) {
      onBackProp();
    } else {
      navigate('/hr/monitor');
    }
  };

  const formatSeconds = (sec: number = 0) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h} س ${m} د`;
  };

  const employeeName = data.employee?.firstName
    ? `${data.employee.firstName} ${data.employee.lastName || ''}`.trim()
    : 'الموظف';

  const departmentName = data.employee?.department?.name || 'الإدارة العامة';
  const jobTitle = data.employee?.position?.title || 'موظف';

  const totalActive = data.summary?.totalActiveSeconds || 0;
  const totalIdle = data.summary?.totalIdleSeconds || 0;
  const prodScore = Math.round(data.summary?.productivityScore || 0);

  const clockInStr = data.summary?.clockInTime
    ? new Date(data.summary.clockInTime).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const firstActivityStr = data.summary?.firstActivityTime
    ? new Date(data.summary.firstActivityTime).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const activityLagMinutes = (() => {
    if (!data.summary?.clockInTime || !data.summary?.firstActivityTime) return null;
    const diffMs = new Date(data.summary.firstActivityTime).getTime() - new Date(data.summary.clockInTime).getTime();
    return Math.round(diffMs / 60000);
  })();

  const getCheckInMethodLabel = (method?: string | null) => {
    switch (method) {
      case 'FINGERPRINT':
        return 'بصمة جهاز';
      case 'MANUAL':
        return 'تسجيل يدوي';
      case 'GPS':
        return 'موقع جغرافي';
      case 'MOBILE_APP':
        return 'تطبيق هاتف';
      case 'SYSTEM':
        return 'نظامي';
      default:
        return 'حضور رسمي';
    }
  };

  return (
    <div className="min-h-full space-y-4 p-3 sm:p-6" dir="rtl">
      {/* Top Header Chassis with Employee & Date Switchers */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 p-4 shadow-sm backdrop-blur-md">
        {/* Left/Start side: Back + Employee Identity + Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-muted/50 dark:bg-zinc-900/60 text-muted-foreground transition hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground active:scale-95"
            title="العودة إلى لوحة المراقبة العامة"
          >
            <ArrowRight className="h-4 w-4" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                تقرير النشاط الميداني: {employeeName}
              </h1>
              <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/20">
                {departmentName}
              </span>
              {data.summary?.status === 'active' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  متصل ويعمل الآن
                </span>
              )}
              {data.summary?.status === 'idle' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                  خامل (الجهاز مفتوح)
                </span>
              )}
              {data.summary?.status === 'offline' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-muted-foreground dark:text-zinc-400 ring-1 ring-inset ring-border/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  غير متصل (مغلق)
                  {data.summary?.lastSeenTime && (
                    <span className="mr-1 text-[10px] text-muted-foreground dark:text-zinc-400 tabular-nums">
                      (آخر ظهور: {new Date(data.summary.lastSeenTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </span>
              )}
              {data.summary?.operationalSignal && data.summary.operationalSignal.type !== 'NORMAL' && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    data.summary.operationalSignal.type === 'TASK_OVERLOAD'
                      ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-500/30'
                      : data.summary.operationalSignal.type === 'DISTRACTION'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30'
                      : data.summary.operationalSignal.type === 'NEGLECT'
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-500/30'
                      : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/30'
                  }`}
                  title={data.summary.operationalSignal.reason}
                >
                  {data.summary.operationalSignal.label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {jobTitle} • {data.summary?.deviceName ? `الجهاز: ${data.summary.deviceName} • ` : ''}توثيق النشاط وسجلات البرامج وتطابق الحضور
            </p>
          </div>

          {/* Next / Previous Employee Fast Switcher */}
          {teamMembersProp.length > 1 && currentMemberIndex >= 0 && (
            <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/50 dark:bg-zinc-900/60 p-1 text-xs">
              <button
                onClick={() => handleSwitchEmployee(teamMembersProp[currentMemberIndex - 1].employeeId)}
                disabled={!hasPrevMember}
                className="flex h-7 items-center gap-1 rounded px-2 font-medium text-muted-foreground transition hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                title={hasPrevMember ? `الانتقال إلى: ${teamMembersProp[currentMemberIndex - 1].employeeName}` : ''}
              >
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">السابق</span>
              </button>

              <span className="px-1 text-[11px] text-muted-foreground tabular-nums">
                {currentMemberIndex + 1} / {teamMembersProp.length}
              </span>

              <button
                onClick={() => handleSwitchEmployee(teamMembersProp[currentMemberIndex + 1].employeeId)}
                disabled={!hasNextMember}
                className="flex h-7 items-center gap-1 rounded px-2 font-medium text-muted-foreground transition hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                title={hasNextMember ? `الانتقال إلى: ${teamMembersProp[currentMemberIndex + 1].employeeName}` : ''}
              >
                <span className="hidden sm:inline">التالي</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right side: Fast Date Navigation */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Quick Date Chips */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                isToday ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30' : 'text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                selectedDate === yesterdayStr ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30' : 'text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground'
              }`}
            >
              أمس
            </button>
          </div>

          {/* Stepper Controls with Native Picker */}
          <div className="flex items-center rounded-lg border border-border/50 bg-muted/50 dark:bg-zinc-900/60 p-0.5 text-xs">
            <button
              onClick={() => handleDateStep(-1)}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground active:scale-95"
              title="اليوم السابق"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs text-foreground focus:outline-none"
              />
            </div>

            <button
              onClick={() => handleDateStep(1)}
              disabled={isToday}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent active:scale-95"
              title="اليوم التالي"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={fetchDetails}
            disabled={loading}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border/50 bg-muted/50 dark:bg-zinc-900/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Bento Telemetry Cards (Unified Dynamic Data) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Active Time */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>وقت العمل الفعلي</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-foreground tabular-nums">
            {formatSeconds(totalActive)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400">
            <span>تفاعل موثق عبر الماوس والكيبورد</span>
            {data.summary?.activityRatio !== undefined && (
              <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                نشاط {data.summary.activityRatio}%
              </span>
            )}
          </div>
        </div>

        {/* Idle / Break Time */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>وقت الاستراحة والتوقف</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
              <Coffee className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-foreground tabular-nums">
            {formatSeconds(totalIdle)}
          </div>
          <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
            فترات راحة مصرحة وخمول معتمد
          </div>
        </div>

        {/* Productivity Score */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>معدل الإنتاجية اليومية</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/20">
              <Activity className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-foreground tabular-nums">
            {prodScore}%
          </div>
          <div className="mt-1 text-[11px] text-sky-600 dark:text-sky-400">
            {prodScore >= 75 ? 'مستوى أداء ممتاز' : prodScore >= 50 ? 'مستوى أداء معتدل' : 'يحتاج متابعة وتوجيه'}
          </div>
        </div>

        {/* Attendance & First Activity Match */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>البصمة وأول نشاط للجهاز</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-inset ring-purple-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">وقت الحضور:</span>
              <div className="flex items-center gap-1.5">
                {clockInStr ? (
                  <>
                    <span className="font-semibold text-foreground tabular-nums">{clockInStr}</span>
                    <span className="rounded bg-purple-50 text-purple-700 border border-purple-200 dark:border-transparent dark:bg-purple-500/15 dark:text-purple-300 px-1.5 py-0.5 text-[10px] font-medium">
                      {getCheckInMethodLabel(data.summary?.checkInMethod)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">لم يُسجل</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">أول نشاط للجهاز:</span>
              <span className="font-semibold text-foreground tabular-nums">
                {firstActivityStr || 'لا يوجد'}
              </span>
            </div>

            {/* Warmup Time + Weekly Average */}
            {data.summary?.lateStartMinutes !== undefined ? (
              <div className="pt-1 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">وقت التسخين:</span>
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      data.summary.lateStartMinutes <= 15
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : data.summary.lateStartMinutes < 30
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                    }`}
                  >
                    {data.summary.lateStartMinutes <= 0 ? 'بدأ فوراً (0 د)' : `${data.summary.lateStartMinutes} دقيقة`}
                  </span>
                </div>
                {data.summary?.weeklyAvgLateStartMinutes !== undefined && data.summary.weeklyAvgLateStartMinutes > 0 && (
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    متوسط التسخين (7 أيام): {data.summary.weeklyAvgLateStartMinutes} دقيقة
                  </div>
                )}
              </div>
            ) : activityLagMinutes !== null ? (
              <div className="pt-1">
                {activityLagMinutes <= 5 ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:border-transparent dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold">
                    {activityLagMinutes < 0 ? `نشاط مبكر (${Math.abs(activityLagMinutes)} د قبل الحضور)` : 'نشاط فوري (متطابق)'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:border-transparent dark:bg-amber-500/10 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold">
                    تأخر بدء النشاط: +{activityLagMinutes} دقيقة
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Ergonomic Tabs Bar — Bans Vertical Scroll Fatigue */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-1 text-xs">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 font-semibold transition ${
            activeTab === 'tasks'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800/40'
          }`}
        >
          <ListTodo className="h-4 w-4" />
          <span>المهام واستغلال الوقت</span>
          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {data.taskPerformance?.tasksCompletedCount || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 font-semibold transition ${
            activeTab === 'timeline'
              ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-500/10'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800/40'
          }`}
        >
          <History className="h-4 w-4" />
          <span>المخطط الزمني وفترات الاستراحة</span>
          {data.breaksSummary?.totalBreaksCount ? (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {data.breaksSummary.totalBreaksCount} بريك
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('apps')}
          className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 font-semibold transition ${
            activeTab === 'apps'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/10'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800/40'
          }`}
        >
          <Grid className="h-4 w-4" />
          <span>البرامج والمواقع المستخدمة</span>
          <span className="rounded-full bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-bold text-purple-600 dark:text-purple-400 tabular-nums">
            {(data.apps?.length || 0) + (data.websites?.length || 0)}
          </span>
        </button>
      </div>

      {/* Tab Panels with Isolated Scope */}
      {activeTab === 'tasks' && (
        <TaskPerformanceCard
          taskPerformance={data.taskPerformance}
          totalActiveSeconds={totalActive}
          totalIdleSeconds={totalIdle}
        />
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <ActivityTimelineBar activities={data.activities} />
          <BreakDetailsCard breaksSummary={data.breaksSummary} />
        </div>
      )}

      {activeTab === 'apps' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AppUsageList apps={data.apps} totalWorkSeconds={totalActive} />
          <WebUsageList websites={data.websites} totalWorkSeconds={totalActive} />
        </div>
      )}
    </div>
  );
};

export default EmployeeMonitorDetails;
