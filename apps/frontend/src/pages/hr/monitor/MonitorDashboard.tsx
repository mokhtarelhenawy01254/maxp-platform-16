import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Users,
  Clock,
  Laptop,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  PauseCircle,
  XCircle,
  ExternalLink,
  Calendar,
  ShieldAlert,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  ListTodo,
} from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuthSimple';
import TeamExecutiveSummary from './components/TeamExecutiveSummary';
import EmployeeMonitorDetails from './EmployeeMonitorDetails';

export interface TeamMemberSummary {
  employeeId: string;
  employeeName?: string;
  departmentName?: string;
  jobTitle?: string;
  status: 'active' | 'idle' | 'offline';
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  totalProductiveSeconds?: number;
  totalUnproductiveSeconds?: number;
  productivityScore: number;
  activityRatio?: number;
  lateStartSeconds?: number;
  lateStartMinutes?: number;
  weeklyAvgLateStartMinutes?: number;
  totalClockSeconds?: number;
  lastHeartbeat?: string;
  firstActivityTime?: string;
  lastSeenTime?: string;
  deviceName?: string;
  isDeviceConnected?: boolean;
  clockInTime?: string;
  clockOutTime?: string;
  checkInMethod?: string;
  topApp?: string;
  completedTasksCount?: number;
  createdTasksCount?: number;
  openTasksCount?: number;
  overdueTasksCount?: number;
  tasksPerHour?: number;
  operationalSignal?: {
    type: 'TASK_OVERLOAD' | 'DISTRACTION' | 'NEGLECT' | 'OFF_DEVICE_WORK' | 'NORMAL';
    label: string;
    severity: 'info' | 'warning' | 'critical';
    reason: string;
  } | null;
  elapsedAttendanceSeconds?: number;
  untrackedSeconds?: number;
  hasMissingClockOut?: boolean;
  activeTask?: {
    entryId?: string;
    taskId: string;
    title: string;
    priority?: string;
    startTime?: string;
    elapsedSeconds?: number;
  } | null;
}

type SortField = 'employeeName' | 'totalActiveSeconds' | 'totalIdleSeconds' | 'productivityScore' | 'completedTasksCount' | 'lateStartMinutes' | 'activityRatio' | 'tasksPerHour';

export const MonitorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleStr = String(user?.role || '').toUpperCase();
  const isManagerOrHR = ['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'OWNER', 'MANAGER'].includes(roleStr);
  const isSuperOrOwner = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(roleStr);

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idle' | 'offline'>('all');
  const [sortField, setSortField] = useState<SortField>('totalActiveSeconds');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());

  const [archiving, setArchiving] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalTracked: 0,
    activeNow: 0,
    avgProductivity: 0,
    totalHoursTracked: 0,
    totalTasksCompleted: 0,
    totalTasksCreated: 0,
    avgWarmupMinutes: 0,
    avgActivityRatio: 0,
  });

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const fetchAlerts = useCallback(async () => {
    if (!isManagerOrHR) return;
    try {
      const res: any = await api.get('/employee-monitor/alerts');
      const list = res?.data?.data || [];
      setAlerts(list.filter((a: any) => !a.isRead));
    } catch {
      // Non-blocking
    }
  }, [isManagerOrHR]);

  const handleDismissAlert = async (alertId: string) => {
    setDismissedAlertIds((prev) => new Set(prev).add(alertId));
    try {
      await api.put(`/employee-monitor/alerts/${alertId}/read`);
    } catch {}
  };

  const fetchData = useCallback(async () => {
    if (!isManagerOrHR) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const overviewRes: any = await api.get(`/employee-monitor/team/overview?date=${selectedDate}`);
      const data = overviewRes?.data?.data || [];
      let totalActiveSec = 0;
      let activeProdScore = 0;
      let activeProdCount = 0;
      let activeCount = 0;
      let totalTasks = 0;
      let totalCreated = 0;
      let totalWarmup = 0;
      let warmupCount = 0;
      let totalRatio = 0;
      let ratioCount = 0;

      // Deduplicate on client to prevent repeated employee cards
      const seen = new Set<string>();
      const formatted: TeamMemberSummary[] = [];

      for (const item of data) {
        const empName = item.employee?.firstName
          ? `${item.employee.firstName} ${item.employee.lastName || ''}`.trim()
          : item.employeeId;
        const key = item.employeeId || empName;
        if (seen.has(key)) continue;
        seen.add(key);

        totalActiveSec += item.totalActiveSeconds || 0;
        if (item.status === 'active') activeCount++;
        totalTasks += item.completedTasksCount || 0;
        totalCreated += item.createdTasksCount || 0;

        // Accurate productivity average: exclude completely inactive/offline zero accounts
        if ((item.totalActiveSeconds || 0) > 0 && (item.productivityScore || 0) > 0) {
          activeProdScore += item.productivityScore;
          activeProdCount++;
        }

        const lateStartSec = item.lateStartSeconds ?? 0;
        const lateStartMin = item.lateStartMinutes ?? Math.round(lateStartSec / 60);
        if (lateStartMin > 0) {
          totalWarmup += lateStartMin;
          warmupCount++;
        }
        if (typeof item.activityRatio === 'number') {
          totalRatio += item.activityRatio;
          ratioCount++;
        }

        formatted.push({
          employeeId: item.employeeId,
          employeeName: empName,
          departmentName: item.employee?.department?.name || 'الإدارة العامة',
          jobTitle: item.employee?.position?.title || 'موظف',
          status: item.status || 'offline',
          totalActiveSeconds: item.totalActiveSeconds || 0,
          totalIdleSeconds: item.totalIdleSeconds || 0,
          totalProductiveSeconds: item.totalProductiveSeconds || 0,
          totalUnproductiveSeconds: item.totalUnproductiveSeconds || 0,
          productivityScore: Math.round(item.productivityScore || 0),
          activityRatio: typeof item.activityRatio === 'number' ? item.activityRatio : undefined,
          lateStartSeconds: lateStartSec,
          lateStartMinutes: lateStartMin,
          weeklyAvgLateStartMinutes: item.weeklyAvgLateStartMinutes ?? lateStartMin,
          totalClockSeconds: item.totalClockSeconds ?? item.elapsedAttendanceSeconds ?? 0,
          openTasksCount: item.openTasksCount || 0,
          overdueTasksCount: item.overdueTasksCount || 0,
          tasksPerHour: typeof item.tasksPerHour === 'number' ? item.tasksPerHour : 0,
          operationalSignal: item.operationalSignal || null,
          lastHeartbeat: item.lastActivityTime,
          firstActivityTime: item.firstActivityTime,
          lastSeenTime: item.lastSeenTime,
          deviceName: item.deviceName,
          isDeviceConnected: item.isDeviceConnected,
          clockInTime: item.clockInTime,
          clockOutTime: item.clockOutTime,
          checkInMethod: item.checkInMethod,
          hasMissingClockOut: item.hasMissingClockOut || false,
          topApp: item.topApp || (item.topApps ? Object.keys(JSON.parse(item.topApps || '{}'))[0] : undefined),
          completedTasksCount: item.completedTasksCount || 0,
          createdTasksCount: item.createdTasksCount || 0,
          elapsedAttendanceSeconds: item.elapsedAttendanceSeconds || 0,
          untrackedSeconds: item.untrackedSeconds || 0,
          activeTask: item.activeTask || null,
        });
      }

      setTeamMembers(formatted);
      setStats({
        totalTracked: formatted.length,
        activeNow: activeCount,
        avgProductivity: activeProdCount > 0 ? Math.round(activeProdScore / activeProdCount) : 0,
        totalHoursTracked: Math.round((totalActiveSec / 3600) * 10) / 10,
        totalTasksCompleted: totalTasks,
        totalTasksCreated: totalCreated,
        avgWarmupMinutes: warmupCount > 0 ? Math.round(totalWarmup / warmupCount) : 0,
        avgActivityRatio: ratioCount > 0 ? Math.round(totalRatio / ratioCount) : 0,
      });
    } catch (err) {
      console.warn('[MonitorDashboard] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isManagerOrHR, selectedDate]);

  useEffect(() => {
    fetchData();
    fetchAlerts();
    const interval = setInterval(() => {
      fetchData();
      fetchAlerts();
    }, 45_000); // 45s live refresh
    return () => clearInterval(interval);
  }, [fetchData, fetchAlerts]);

  const handleTriggerArchive = async () => {
    setArchiving(true);
    setArchiveSuccess(null);
    try {
      const res: any = await api.post('/employee-monitor/admin/retention-archive', { daysThreshold: 60 });
      if (res?.data?.success) {
        setArchiveSuccess(`تم بنجاح أرشفة ${res.data.data?.archivedCount || 0} سجل.`);
        setTimeout(() => setArchiveSuccess(null), 5000);
      }
    } catch (err: any) {
      setArchiveSuccess('تعذر تنفيذ الأرشفة حالياً.');
    } finally {
      setArchiving(false);
    }
  };

  const formatSeconds = (sec: number = 0) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h} س ${m} د`;
  };

  const formatClockTime = (iso?: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  const getAttendanceActivityDelta = (clockIn?: string | null, firstAct?: string | null): number | null => {
    if (!clockIn || !firstAct) return null;
    try {
      const tIn = new Date(clockIn).getTime();
      const tAct = new Date(firstAct).getTime();
      if (isNaN(tIn) || isNaN(tAct)) return null;
      return Math.round((tAct - tIn) / 60000);
    } catch {
      return null;
    }
  };

  const filteredMembers = teamMembers.filter((m) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (m.employeeName && m.employeeName.toLowerCase().includes(query)) ||
      (m.jobTitle && m.jobTitle.toLowerCase().includes(query)) ||
      (m.departmentName && m.departmentName.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    let valA: any = a[sortField] ?? 0;
    let valB: any = b[sortField] ?? 0;
    if (typeof valA === 'string') {
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-sky-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-sky-400" />
    );
  };

  if (!isManagerOrHR) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center" dir="rtl">
        <ShieldAlert className="h-10 w-10 text-rose-400" />
        <h2 className="text-base font-bold text-foreground">غير مصرح بالوصول</h2>
        <p className="max-w-sm text-xs text-muted-foreground">
          شاشة مراقبة الأجهزة والإنتاجية مخصصة لمسؤولي الموارد البشرية والمدراء فقط.
        </p>
      </div>
    );
  }

  // If viewing details modal for an employee
  if (selectedEmployeeId) {
    return (
      <EmployeeMonitorDetails
        employeeIdProp={selectedEmployeeId}
        onBackProp={() => setSelectedEmployeeId(null)}
        teamMembersProp={teamMembers.map((m) => ({
          employeeId: m.employeeId,
          employeeName: m.employeeName,
        }))}
        onSelectEmployeeProp={(id) => setSelectedEmployeeId(id)}
      />
    );
  }

  return (
    <div className="min-h-full space-y-4 p-3 sm:p-6" dir="rtl">
      {/* Top Unified Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/25">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                مراقبة وإنتاجية الأجهزة (MaxP Workspace)
              </h1>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{stats.activeNow} نشط الآن</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              متابعة النشاط اللحظي وساعات العمل والإنتاجية لأجهزة سطح المكتب
            </p>
          </div>
        </div>

        {/* Date Selector, Quick Chips & Fast Stepper */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Search Filter */}
          <div className="relative flex items-center">
            <Search className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث بالاسم أو القسم…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-40 rounded-lg border border-border/60 bg-muted/50 dark:bg-zinc-900/60 pr-8 pl-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:w-52"
            />
          </div>

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

          {/* Stepper with Native Picker */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/50 dark:bg-zinc-900/60 p-0.5 text-xs">
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
            onClick={fetchData}
            disabled={loading}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 dark:bg-zinc-900/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground active:scale-95"
            title="تحديث البيانات لحظياً"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </div>

      {/* Live Operational Alerts Banner */}
      {alerts.filter((a) => !dismissedAlertIds.has(a.id)).length > 0 && (
        <div className="space-y-2">
          {alerts
            .filter((a) => !dismissedAlertIds.has(a.id))
            .slice(0, 3)
            .map((al) => (
              <div
                key={al.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-xs shadow-xs transition ${
                  al.severity === 'critical'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="font-semibold truncate">{al.message}</span>
                </div>
                <button
                  onClick={() => handleDismissAlert(al.id)}
                  className="shrink-0 rounded-md border border-border/40 bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted active:scale-95"
                >
                  تمت المراجعة
                </button>
              </div>
            ))}
        </div>
      )}

      {/* 6 Bento Operational KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {/* KPI 1 */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الموثقون اليوم</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20">
              <Users className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-foreground tabular-nums">
            {stats.totalTracked}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground truncate">
            أجهزة أرسلت بيانات
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>نشط ومتصل الآن</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
              <Activity className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats.activeNow}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
            تفاعل خلال 15 دقيقة
          </div>
        </div>

        {/* KPI 3: Warmup Time */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>متوسط وقت التسخين</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-foreground tabular-nums">
            <span
              className={
                stats.avgWarmupMinutes <= 15
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : stats.avgWarmupMinutes < 30
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }
            >
              {stats.avgWarmupMinutes} د
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground truncate">
            بين البصمة وأول نشاط للجهاز
          </div>
        </div>

        {/* KPI 4: Active Ratio */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>نسبة النشاط الفعلي</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {stats.avgActivityRatio}%
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground truncate">
            من إجمالي ساعات الدوام
          </div>
        </div>

        {/* KPI 5: Productivity Score */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>متوسط الإنتاجية</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-foreground tabular-nums">
            {stats.avgProductivity}%
          </div>
          <div className="mt-1 text-[11px] text-purple-600 dark:text-purple-400 truncate">
            معدل متوازن (نشاط + مهام)
          </div>
        </div>

        {/* KPI 6: Tasks and Hours */}
        <div className="rounded-xl border border-border/40 bg-card/60 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>المهام وساعات العمل</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20">
              <Laptop className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-foreground tabular-nums truncate">
            {stats.totalTasksCompleted} م • {stats.totalHoursTracked} س
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground truncate">
            مجموع مخرجات وساعات الفريق
          </div>
        </div>
      </div>

      {/* Team Executive Telemetry Summary */}
      <TeamExecutiveSummary
        stats={stats}
        isSuperOrOwner={isSuperOrOwner}
        archiving={archiving}
        archiveSuccess={archiveSuccess}
        onTriggerArchive={handleTriggerArchive}
      />

      {/* Team Roster Grid Table with Click-to-Sort & Mobile Responsive Cards */}
      <div className="overflow-hidden rounded-xl border border-border/40 bg-card/60 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              سجل نشاط وإنتاجية الفريق ({sortedMembers.length})
            </h2>
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو القسم..."
                className="h-7 w-36 sm:w-52 rounded-lg border border-border/60 bg-muted/50 dark:bg-zinc-900/60 pr-8 pl-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-sky-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                statusFilter === 'all'
                  ? 'bg-slate-200 dark:bg-zinc-800 text-foreground ring-1 ring-border/50 font-semibold'
                  : 'text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800/60 hover:text-foreground'
              }`}
            >
              الكل ({teamMembers.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                statusFilter === 'active'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 ring-1 ring-emerald-500/20 font-semibold'
                  : 'text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800/60 hover:text-foreground'
              }`}
            >
              نشط الآن ({stats.activeNow})
            </button>
            <button
              onClick={() => setStatusFilter('idle')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                statusFilter === 'idle'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 ring-1 ring-amber-500/20 font-semibold'
                  : 'text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800/60 hover:text-foreground'
              }`}
            >
              استراحة / خمول
            </button>
            <button
              onClick={() => setStatusFilter('offline')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                statusFilter === 'offline'
                  ? 'bg-slate-200 dark:bg-zinc-800 text-foreground dark:text-zinc-300 ring-1 ring-border/40 font-semibold'
                  : 'text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800/60 hover:text-foreground'
              }`}
            >
              غير متصل
            </button>
          </div>
        </div>

        {loading && teamMembers.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin ml-2 text-sky-400" />
            <span>جاري استرداد بيانات النشاط السحابية…</span>
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            لا توجد أجهزة مطابقة للبحث المسجل لهذا اليوم
          </div>
        ) : (
          <>
            {/* Desktop Full Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-border/40 bg-muted/40 dark:bg-zinc-950/40 text-muted-foreground">
                  <tr>
                    <th
                      onClick={() => handleSort('employeeName')}
                      className="group cursor-pointer px-4 py-3 font-semibold transition hover:text-foreground"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>الموظف / القسم</span>
                        {renderSortIcon('employeeName')}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold">الحالة والتشخيص</th>
                    <th
                      onClick={() => handleSort('lateStartMinutes')}
                      className="group cursor-pointer px-4 py-3 font-semibold transition hover:text-foreground"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>البصمة ووقت التسخين</span>
                        {renderSortIcon('lateStartMinutes')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('totalActiveSeconds')}
                      className="group cursor-pointer px-4 py-3 font-semibold transition hover:text-foreground"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>العمل الفعلي ونسبة النشاط</span>
                        {renderSortIcon('totalActiveSeconds')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('totalIdleSeconds')}
                      className="group cursor-pointer px-4 py-3 font-semibold transition hover:text-foreground"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>التوقف / الخمول</span>
                        {renderSortIcon('totalIdleSeconds')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('productivityScore')}
                      className="group cursor-pointer px-4 py-3 font-semibold transition hover:text-foreground"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>الإنتاجية ومعدل المهام</span>
                        {renderSortIcon('productivityScore')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('completedTasksCount')}
                      className="group cursor-pointer px-4 py-3 font-semibold transition hover:text-foreground"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>المهام (منجزة / متبقية)</span>
                        {renderSortIcon('completedTasksCount')}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold">البرنامج الأبرز</th>
                    <th className="px-4 py-3 text-left font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {sortedMembers.map((m) => {
                    const inTimeStr = formatClockTime(m.clockInTime);
                    const firstActStr = formatClockTime(m.firstActivityTime);
                    const methodLabel = m.checkInMethod === 'fingerprint' || m.checkInMethod === 'biometric'
                      ? 'بصمة'
                      : m.checkInMethod === 'mobile'
                      ? 'موبايل'
                      : m.checkInMethod === 'web'
                      ? 'ويب'
                      : m.checkInMethod || 'نظام';

                    const warmupMin = m.lateStartMinutes ?? 0;
                    const weeklyAvg = m.weeklyAvgLateStartMinutes ?? warmupMin;

                    return (
                      <tr
                        key={m.employeeId}
                        className="transition-colors hover:bg-muted/50 dark:hover:bg-zinc-900/40"
                      >
                        {/* Employee info */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">
                            {m.employeeName}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {m.departmentName} • {m.jobTitle}
                          </div>
                        </td>

                        {/* Status + Operational Signal Badge */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {m.status === 'active' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> نشط الآن
                              </span>
                            )}
                            {m.status === 'idle' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
                                  <PauseCircle className="h-3 w-3" /> خامل (مفتوح)
                                </span>
                                {m.deviceName && (
                                  <div className="text-[10px] text-muted-foreground">{m.deviceName}</div>
                                )}
                              </div>
                            )}
                            {m.status === 'offline' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted dark:bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground dark:text-zinc-400 ring-1 ring-inset ring-border/20">
                                  <XCircle className="h-3 w-3" /> غير متصل
                                </span>
                                {m.lastSeenTime && (
                                  <div className="text-[10px] text-muted-foreground tabular-nums">
                                    آخر اتصال: {formatClockTime(m.lastSeenTime)}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Operational Signal */}
                            {m.operationalSignal && m.operationalSignal.type !== 'NORMAL' && (
                              <div>
                                <span
                                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    m.operationalSignal.type === 'TASK_OVERLOAD'
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:border-transparent dark:bg-indigo-500/15 dark:text-indigo-300'
                                      : m.operationalSignal.type === 'DISTRACTION'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:border-transparent dark:bg-amber-500/15 dark:text-amber-300'
                                      : m.operationalSignal.type === 'NEGLECT'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:border-transparent dark:bg-rose-500/15 dark:text-rose-300'
                                      : 'bg-sky-50 text-sky-700 border border-sky-200 dark:border-transparent dark:bg-sky-500/15 dark:text-sky-300'
                                  }`}
                                  title={m.operationalSignal.reason}
                                >
                                  {m.operationalSignal.label}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Attendance, Elapsed & Warmup Time */}
                        <td className="px-4 py-3">
                          <div className="space-y-1 text-[11px]">
                            <div className="flex items-center gap-1.5 tabular-nums">
                              <span className="text-muted-foreground">البصمة:</span>
                              {inTimeStr ? (
                                <span className="font-semibold text-foreground">
                                  {inTimeStr} <span className="text-[10px] text-sky-600 dark:text-sky-400 font-normal">({methodLabel})</span>
                                </span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400/80 font-medium">لم يسجل حضوراً</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 tabular-nums">
                              <span className="text-muted-foreground">أول نشاط:</span>
                              {firstActStr ? (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {firstActStr}
                                </span>
                              ) : (
                                <span className="text-muted-foreground font-normal">لا توجد حركة مسجلة</span>
                              )}
                            </div>

                            {/* Warmup Time Chip + Weekly Avg */}
                            {m.clockInTime && (
                              <div className="pt-0.5 space-y-0.5">
                                <span
                                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    warmupMin <= 15
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:border-transparent dark:bg-emerald-500/15 dark:text-emerald-400'
                                      : warmupMin < 30
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:border-transparent dark:bg-amber-500/15 dark:text-amber-400'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200 dark:border-transparent dark:bg-rose-500/15 dark:text-rose-400'
                                  }`}
                                  title={`الفارق بين البصمة وبداية استخدام الجهاز: ${warmupMin} دقيقة`}
                                >
                                  {warmupMin <= 0 ? 'تسخين فوري (0 د)' : `وقت تسخين: ${warmupMin} د`}
                                </span>
                                {weeklyAvg > 0 && (
                                  <div className="text-[10px] text-muted-foreground tabular-nums">
                                    متوسط 7 أيام: {weeklyAvg} د
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Untracked Gap Alert */}
                            {m.untrackedSeconds && m.untrackedSeconds >= 15 * 60 ? (
                              <div className="pt-0.5">
                                <span
                                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:border-transparent dark:bg-rose-500/15 dark:text-rose-400"
                                  title="الموظف سجل حضوراً بالبصمة لكن الجهاز كان متوقفاً أو خارج نطاق العمل"
                                >
                                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                                  <span>غير موثق: {formatSeconds(m.untrackedSeconds)}</span>
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </td>

                        {/* Active Time + Activity Ratio */}
                        <td className="px-4 py-3 tabular-nums">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-foreground">
                              {formatSeconds(m.totalActiveSeconds)}
                            </div>
                            {typeof m.activityRatio === 'number' && (
                              <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                نسبة النشاط: {m.activityRatio}%
                              </div>
                            )}
                            {m.totalClockSeconds && m.totalClockSeconds > 0 ? (
                              <div className="text-[10px] text-muted-foreground">
                                من دوام {formatSeconds(m.totalClockSeconds)}
                              </div>
                            ) : null}
                          </div>
                        </td>

                        {/* Idle Time */}
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {formatSeconds(m.totalIdleSeconds)}
                        </td>

                        {/* Productivity Score + Tasks Per Hour */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                                <div
                                  className={`h-full rounded-full ${
                                    m.productivityScore >= 75
                                      ? 'bg-emerald-500'
                                      : m.productivityScore >= 50
                                      ? 'bg-sky-500'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.min(100, m.productivityScore)}%` }}
                                />
                              </div>
                              <span className="font-semibold text-foreground tabular-nums">
                                {m.productivityScore}%
                              </span>
                            </div>
                            {m.tasksPerHour !== undefined && m.tasksPerHour > 0 && (
                              <div className="text-[10px] font-medium text-purple-600 dark:text-purple-400 tabular-nums">
                                {m.tasksPerHour} مهمة/ساعة
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Tasks Partition */}
                        <td className="px-4 py-3 tabular-nums">
                          <div className="flex flex-col gap-1">
                            {m.activeTask && (
                              <span
                                className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/25 max-w-[155px] truncate"
                                title={`يعمل الآن على: ${m.activeTask.title}`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-pulse shrink-0" />
                                <span className="truncate">{m.activeTask.title}</span>
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                              <span>{m.completedTasksCount || 0} منجزة</span>
                            </span>
                            {m.openTasksCount !== undefined && m.openTasksCount > 0 && (
                              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                                {m.openTasksCount} قيد التنفيذ
                              </span>
                            )}
                            {m.overdueTasksCount !== undefined && m.overdueTasksCount > 0 && (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                {m.overdueTasksCount} متأخرة
                              </span>
                            )}
                            {(m.createdTasksCount || 0) > 0 && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-600 dark:text-sky-400"
                                title="مهام تم إنشاؤها وتكليفها اليوم"
                              >
                                <ListTodo className="h-2.5 w-2.5 shrink-0" />
                                <span>{m.createdTasksCount} منشأة</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Top App */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Laptop className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                            <span className="truncate max-w-[130px] font-medium" title={m.topApp || 'سطح المكتب'}>
                              {m.topApp || 'سطح المكتب'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-left">
                          <button
                            onClick={() => setSelectedEmployeeId(m.employeeId)}
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background dark:bg-zinc-900 px-2.5 py-1 text-xs font-medium text-sky-600 dark:text-sky-400 transition hover:bg-sky-500/10 hover:border-sky-500/30 active:scale-95 shadow-xs"
                            title="عرض المخطط الزمني والبرامج والمواقع لهذا الموظف"
                          >
                            <span>التفاصيل</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View */}
            <div className="block divide-y divide-border/20 md:hidden">
              {sortedMembers.map((m) => {
                const inTimeStr = formatClockTime(m.clockInTime);
                const firstActStr = formatClockTime(m.firstActivityTime);
                const warmupMin = m.lateStartMinutes ?? 0;
                const weeklyAvg = m.weeklyAvgLateStartMinutes ?? warmupMin;
                const methodLabel = m.checkInMethod === 'fingerprint' || m.checkInMethod === 'biometric'
                  ? 'بصمة'
                  : m.checkInMethod === 'mobile'
                  ? 'موبايل'
                  : m.checkInMethod === 'web'
                  ? 'ويب'
                  : m.checkInMethod || 'نظام';

                return (
                  <div key={m.employeeId} className="p-3.5 space-y-2.5 transition-colors hover:bg-muted/40 dark:hover:bg-zinc-900/30">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-foreground text-sm">{m.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{m.departmentName} • {m.jobTitle}</div>
                      </div>
                      {/* Status */}
                      <div className="text-left space-y-1">
                        {m.status === 'active' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                            <CheckCircle2 className="h-2.5 w-2.5" /> نشط الآن
                          </span>
                        )}
                        {m.status === 'idle' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
                            <PauseCircle className="h-2.5 w-2.5" /> خامل (مفتوح)
                          </span>
                        )}
                        {m.status === 'offline' && (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:text-zinc-400 ring-1 ring-inset ring-border/20">
                              <XCircle className="h-2.5 w-2.5" /> غير متصل
                            </span>
                            {m.lastSeenTime && (
                              <span className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
                                آخر اتصال: {formatClockTime(m.lastSeenTime)}
                              </span>
                            )}
                          </div>
                        )}
                        {m.operationalSignal && m.operationalSignal.type !== 'NORMAL' && (
                          <div>
                            <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                              {m.operationalSignal.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live Task Badge if Active */}
                    {m.activeTask && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-pulse shrink-0" />
                        <span className="truncate">يعمل الآن: {m.activeTask.title}</span>
                      </div>
                    )}

                    {/* Attendance & Warmup Strip */}
                    <div className="rounded-lg border border-border/40 bg-muted/40 dark:bg-zinc-900/50 p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px]">البصمة الرسمية:</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {inTimeStr ? (
                            `${inTimeStr} (${methodLabel})`
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-normal">لم يسجل حضوراً</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px]">أول نشاط للجهاز:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {firstActStr || <span className="text-muted-foreground font-normal">لا توجد حركة مسجلة</span>}
                        </span>
                      </div>
                      {m.clockInTime && (
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-muted-foreground text-[11px]">وقت التسخين:</span>
                          <div className="flex items-center gap-1.5 tabular-nums">
                            <span
                              className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                                warmupMin <= 15
                                  ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
                                  : warmupMin < 30
                                  ? 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10'
                                  : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/15'
                              }`}
                            >
                              {warmupMin <= 0 ? 'فوري (0 د)' : `${warmupMin} دقيقة`}
                            </span>
                            {weeklyAvg > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                (متوسط 7 أيام: {weeklyAvg} د)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {m.untrackedSeconds && m.untrackedSeconds >= 15 * 60 ? (
                        <div className="pt-0.5 text-left">
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 border border-rose-200 dark:border-transparent dark:text-rose-400 dark:bg-rose-500/15 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                            غير موثق: {formatSeconds(m.untrackedSeconds)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-muted/50 dark:bg-zinc-900/60 p-2">
                        <span className="text-muted-foreground block text-[10px]">عمل فعلي:</span>
                        <div className="flex items-baseline justify-between">
                          <span className="font-semibold text-foreground tabular-nums">{formatSeconds(m.totalActiveSeconds)}</span>
                          {typeof m.activityRatio === 'number' && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                              {m.activityRatio}% نشاط
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rounded bg-muted/50 dark:bg-zinc-900/60 p-2">
                        <span className="text-muted-foreground block text-[10px]">توقف وخمول:</span>
                        <span className="font-semibold text-muted-foreground tabular-nums">{formatSeconds(m.totalIdleSeconds)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex flex-wrap items-center gap-2 tabular-nums">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{m.completedTasksCount || 0} منجزة</span>
                        {m.overdueTasksCount !== undefined && m.overdueTasksCount > 0 && (
                          <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px]">({m.overdueTasksCount} متأخرة)</span>
                        )}
                        {m.tasksPerHour !== undefined && m.tasksPerHour > 0 && (
                          <span className="text-purple-600 dark:text-purple-400 text-[10px] font-medium">({m.tasksPerHour} م/س)</span>
                        )}
                        <span className="text-sky-600 dark:text-sky-400 font-semibold">{m.productivityScore}% إنتاجية</span>
                      </div>
                      <button
                        onClick={() => setSelectedEmployeeId(m.employeeId)}
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 transition hover:bg-sky-500/10 active:scale-95 shadow-xs"
                      >
                        <span>عرض التفاصيل</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MonitorDashboard;
