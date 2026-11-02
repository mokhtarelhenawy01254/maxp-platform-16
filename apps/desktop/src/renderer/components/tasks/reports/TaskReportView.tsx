import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  RefreshCw,
  Calendar,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { audioAlerts } from '../../../utils/audioAlerts';
import {
  TaskReportItem,
  TaskReportKpiData,
  TaskDateRange,
  TaskExceptionFilter,
  TeamMemberTaskSummary,
} from './TaskReportTypes';
import {
  UnifiedTaskFilters,
  defaultUnifiedTaskFilters,
  parseUnifiedFiltersFromUrl,
  serializeUnifiedFiltersToQuery,
  persistUnifiedFilters,
  loadPersistedUnifiedFilters,
  filterTasksWithUnifiedEngine,
} from '../taskFilterEngine';
import { TaskUnifiedFilterBar } from '../TaskUnifiedFilterBar';
import { TaskReportKpis } from './TaskReportKpis';
import { TaskReportExceptions } from './TaskReportExceptions';
import { TaskReportLedger } from './TaskReportLedger';
import { TaskReportTeamMatrix } from './TaskReportTeamMatrix';

const getTodayStr = () => new Date().toISOString().slice(0, 10);

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const getDaysAgoStr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const getThisWeekStartStr = () => {
  const d = new Date();
  const day = d.getDay(); // 0 Sun, 6 Sat
  const diff = (day + 1) % 7; // days since Saturday (Arabic business week start)
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
};

const getThisMonthStartStr = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const formatArabicDate = (dateStr: string): string => {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ar-EG-u-nu-latn', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
};

interface TaskReportViewProps {
  isExecutiveMode?: boolean; // When rendered in SimpleReportTab
}

export const TaskReportView: React.FC<TaskReportViewProps> = ({
  isExecutiveMode = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Unified Filter State with URL and localStorage sync
  const [unifiedFilters, setUnifiedFilters] = useState<UnifiedTaskFilters>(() => {
    const urlStr = typeof window !== 'undefined' ? (window.location.hash || window.location.search) : '';
    const hasQuery = urlStr.includes('?');
    if (hasQuery) {
      return parseUnifiedFiltersFromUrl(urlStr);
    }
    return typeof loadPersistedUnifiedFilters === 'function'
      ? loadPersistedUnifiedFilters()
      : defaultUnifiedTaskFilters;
  });

  // Report-specific exception toggle (all / time_leaks / review_blocked / overdue)
  const [exceptionFilter, setExceptionFilter] = useState<TaskExceptionFilter>('all');

  const handleFiltersChange = useCallback((next: UnifiedTaskFilters) => {
    setUnifiedFilters(next);
    persistUnifiedFilters(next);
    try {
      const queryStr = serializeUnifiedFiltersToQuery(next);
      const hash = window.location.hash || '#/reports';
      const baseHash = hash.split('?')[0];
      window.location.hash = `${baseHash}${queryStr}`;
    } catch {}
  }, []);

  // Derive report period from dueDateFrom / dueDateTo
  const activePeriod = useMemo(() => {
    const today = getTodayStr();
    const from = unifiedFilters.dueDateFrom;
    const to = unifiedFilters.dueDateTo;

    if (!from && !to) {
      return {
        start: '1970-01-01',
        end: '2099-12-31',
        label: 'كافة الفترات',
        isSingle: false,
      };
    }

    if (from === to) {
      const d = from || today;
      if (d === today) {
        return {
          start: today,
          end: today,
          label: `اليوم (${formatArabicDate(today)})`,
          isSingle: true,
        };
      }
      if (d === getYesterdayStr()) {
        return {
          start: d,
          end: d,
          label: `أمس (${formatArabicDate(d)})`,
          isSingle: true,
        };
      }
      return {
        start: d,
        end: d,
        label: `يوم ${formatArabicDate(d)}`,
        isSingle: true,
      };
    }

    const start = from || '1970-01-01';
    const end = to || '2099-12-31';
    let label = `فترة مخصصة (${formatArabicDate(start)} ← ${formatArabicDate(end)})`;
    if (start === getThisWeekStartStr() && end === today) {
      label = `هذا الأسبوع (${formatArabicDate(start)} ← ${formatArabicDate(end)})`;
    } else if (start === getDaysAgoStr(7) && end === today) {
      label = `آخر 7 أيام (${formatArabicDate(start)} ← ${formatArabicDate(end)})`;
    } else if (start === getThisMonthStartStr() && end === today) {
      label = `هذا الشهر (${formatArabicDate(start)} ← ${formatArabicDate(end)})`;
    } else if (start === getDaysAgoStr(30) && end === today) {
      label = `آخر 30 يوم (${formatArabicDate(start)} ← ${formatArabicDate(end)})`;
    }

    return {
      start,
      end,
      label,
      isSingle: false,
    };
  }, [unifiedFilters.dueDateFrom, unifiedFilters.dueDateTo]);

  // Derive date preset ID for visual button highlighting
  const activeDatePreset: TaskDateRange = useMemo(() => {
    const from = unifiedFilters.dueDateFrom;
    const to = unifiedFilters.dueDateTo;
    const today = getTodayStr();
    if (!from && !to) return 'all';
    if (from === to) {
      if (from === today) return 'today';
      if (from === getYesterdayStr()) return 'yesterday';
      return 'custom_day';
    }
    if (to === today) {
      if (from === getThisWeekStartStr()) return 'this_week';
      if (from === getDaysAgoStr(7)) return '7days';
      if (from === getThisMonthStartStr()) return 'this_month';
      if (from === getDaysAgoStr(30)) return '30days';
    }
    return 'custom_range';
  }, [unifiedFilters.dueDateFrom, unifiedFilters.dueDateTo]);

  // Handle date preset selection
  const setDatePreset = (preset: TaskDateRange) => {
    const today = getTodayStr();
    let from = '';
    let to = '';
    switch (preset) {
      case 'today':
        from = today;
        to = today;
        break;
      case 'yesterday': {
        const y = getYesterdayStr();
        from = y;
        to = y;
        break;
      }
      case 'this_week':
        from = getThisWeekStartStr();
        to = today;
        break;
      case '7days':
        from = getDaysAgoStr(7);
        to = today;
        break;
      case 'this_month':
        from = getThisMonthStartStr();
        to = today;
        break;
      case '30days':
        from = getDaysAgoStr(30);
        to = today;
        break;
      case 'custom_day':
        from = unifiedFilters.dueDateFrom || today;
        to = unifiedFilters.dueDateFrom || today;
        break;
      case 'custom_range':
        from = unifiedFilters.dueDateFrom || getDaysAgoStr(7);
        to = unifiedFilters.dueDateTo || today;
        break;
      case 'all':
        from = '';
        to = '';
        break;
    }
    handleFiltersChange({
      ...unifiedFilters,
      dueDateFrom: from,
      dueDateTo: to,
    });
  };

  const roleStr = String(currentUser?.role || '').toUpperCase();
  const isAdmin = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER'].includes(roleStr);
  const isManager = isAdmin || ['MANAGER', 'HR_MANAGER'].includes(roleStr) || isExecutiveMode;
  const [teamOverview, setTeamOverview] = useState<any[]>([]);
  const [myDayActiveSeconds, setMyDayActiveSeconds] = useState(0);
  const [myDayIdleSeconds, setMyDayIdleSeconds] = useState(0);

  // Presence summary (absorbed from the merged daily report screen)
  const presenceStats = useMemo(() => {
    const rows = teamOverview;
    const activeNow = rows.filter((r: any) => String(r.status || '').toUpperCase() === 'ONLINE').length;
    const late = rows.filter((r: any) => Number(r.lateStartSeconds || 0) > 0).length;
    const actualSeconds = rows.reduce((s: number, r: any) => s + Number(r.activeSeconds || 0), 0);
    const totalHours = Math.round((actualSeconds / 3600) * 10) / 10;
    const withRatio = rows.filter((r: any) => Number(r.activityRatio || 0) > 0);
    const avgProd = withRatio.length
      ? Math.round(withRatio.reduce((s: number, r: any) => {
          const v = Number(r.activityRatio || 0);
          return s + (v > 1.5 ? v : v * 100);
        }, 0) / withRatio.length)
      : 0;
    return { activeNow, late, totalHours, avgProd, actualSeconds };
  }, [teamOverview]);

  const presenceChipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '4px 10px',
    whiteSpace: 'nowrap',
  };

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const auth = await window.electronAPI.getAuthState();
      if (auth?.user) setCurrentUser(auth.user);

      const userRole = String(auth?.user?.role || '').toUpperCase();
      const hasPrivilege = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER'].includes(userRole) || isExecutiveMode;
      const fetchType = hasPrivilege ? 'all' : 'my-tasks';

      const qStart = activePeriod.start === '1970-01-01' ? undefined : activePeriod.start;
      const qEnd = activePeriod.end === '2099-12-31' ? undefined : activePeriod.end;

      const [tasksRes, usersRes, teamRes, myDayRes] = await Promise.all([
        window.electronAPI.getTasks(fetchType),
        hasPrivilege ? window.electronAPI.getCompanyUsers() : Promise.resolve({ success: false, users: [] }),
        hasPrivilege ? window.electronAPI.getTeamOverview(qStart, qEnd).catch(() => null) : Promise.resolve(null),
        window.electronAPI.getDailySummary(qStart, qEnd).catch(() => null),
      ]);

      if (tasksRes?.success && Array.isArray(tasksRes.tasks)) {
        setTasks(tasksRes.tasks);
      }
      if (usersRes?.success && Array.isArray(usersRes.users)) {
        setUsers(usersRes.users);
      }
      setTeamOverview(teamRes?.data && Array.isArray(teamRes.data) ? teamRes.data : []);
      setMyDayActiveSeconds(Number(myDayRes?.total_active_seconds || 0));
      setMyDayIdleSeconds(Number(myDayRes?.total_idle_seconds || 0));
    } catch (err) {
      console.warn('[TaskReportView] Error loading report data:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [isExecutiveMode, activePeriod.start, activePeriod.end]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Transform raw tasks to TaskReportItem with calculated variance
  const reportItems: TaskReportItem[] = useMemo(() => {
    const now = Date.now();
    const userMap: Record<string, any> = {};
    users.forEach((u: any) => {
      const id = String(u.id || u.userId || '');
      if (id) userMap[id] = u;
    });

    return tasks.map((t: any) => {
      const estMin = Number(t.estimatedMinutes || t.estimated_minutes || (t.estimatedHours ? t.estimatedHours * 60 : 0));

      // 1. Lifetime minutes (capped at 7200 minutes / 120 hours to eliminate corrupted runaway historical entries)
      const lifetimeMin = Math.min(
        7200,
        Math.round(
          Number(
            t.lifetimeTrackedMinutes ??
            t.totalDuration ??
            t.total_duration ??
            t.actualMinutes ??
            t.actual_minutes ??
            t.totalTimeMinutes ??
            (t.totalSeconds != null ? t.totalSeconds / 60 : null) ??
            (t.actualHours != null ? t.actualHours * 60 : 0)
          )
        )
      );

      // 2. Tracked minutes scoped to active period
      const todayStr = getTodayStr();
      let periodTrackedMin = 0;
      if (Array.isArray(t.timeEntries) || Array.isArray(t.time_entries)) {
        const entries = t.timeEntries || t.time_entries;
        periodTrackedMin = entries.reduce((sum: number, e: any) => {
          const entryDate = (e.startTime || e.createdAt || '').slice(0, 10);
          if (entryDate >= activePeriod.start && entryDate <= activePeriod.end) {
            return sum + Math.min(480, Number(e.duration || 0));
          }
          return sum;
        }, 0);
      } else {
        const createdDate = (t.createdAt || '').slice(0, 10);
        const compDate = (t.completedAt || t.completedDate || '').slice(0, 10);
        if (
          (createdDate >= activePeriod.start && createdDate <= activePeriod.end) ||
          (compDate >= activePeriod.start && compDate <= activePeriod.end)
        ) {
          periodTrackedMin = Math.min(lifetimeMin, 480);
        }
      }

      // Today tracked minutes
      let todayMin = 0;
      if (t.todayTrackedMinutes != null) {
        todayMin = Number(t.todayTrackedMinutes);
      } else if (t.todayMinutes != null) {
        todayMin = Number(t.todayMinutes);
      } else if (t.todayDuration != null) {
        todayMin = Number(t.todayDuration);
      } else if (Array.isArray(t.timeEntries) || Array.isArray(t.time_entries)) {
        todayMin = (t.timeEntries || t.time_entries).reduce((sum: number, e: any) => {
          const entryDate = (e.startTime || e.createdAt || '').slice(0, 10);
          if (e.isToday || entryDate === todayStr) {
            return sum + Math.min(480, Number(e.duration || 0));
          }
          return sum;
        }, 0);
      } else {
        const createdToday = (t.createdAt || '').slice(0, 10) === todayStr;
        const compToday = (t.completedAt || t.completedDate || '').slice(0, 10) === todayStr;
        if (createdToday || compToday) {
          todayMin = Math.min(lifetimeMin, 480);
        }
      }
      todayMin = Math.min(todayMin, 480);

      // 3. Resolve actual minutes based on active date range
      let actualMin = lifetimeMin;
      if (activeDatePreset === 'today') {
        actualMin = todayMin;
      } else if (activeDatePreset !== 'all') {
        actualMin = periodTrackedMin > 0 ? periodTrackedMin : (activePeriod.isSingle && activePeriod.start === todayStr ? todayMin : lifetimeMin);
      }

      const varianceMin = actualMin - estMin;
      const variancePct = estMin > 0 ? Math.round((actualMin / estMin) * 100) : 0;

      const dueTime = t.dueDate || t.due_date ? new Date(t.dueDate || t.due_date).getTime() : null;
      const isDone = String(t.status || '').toUpperCase() === 'COMPLETED';
      const isOverdue = !isDone && Boolean(dueTime && dueTime < now);
      const isTimeLeak = !isDone && estMin > 0 && actualMin > estMin * 1.3;
      const isReview = String(t.status || '').toUpperCase() === 'IN_REVIEW';

      const rawAssignee = t.assignee || (typeof t.assignedTo === 'object' ? t.assignedTo : null);
      const assignedId = t.assignedToId || (typeof t.assignedTo === 'string' ? t.assignedTo : rawAssignee?.id);
      const userObj = rawAssignee || (assignedId ? userMap[assignedId] : null);

      const assigneeName = userObj?.firstName
        ? `${userObj.firstName} ${userObj.lastName || ''}`.trim()
        : t.assignedToName || (userObj?.name ? userObj.name : 'غير مسندة');

      const projName = t.project?.name || t.projectName || 'عام';
      const completedDate = t.completedDate || t.completedAt || t.completed_date || t.completed_at;

      // Rework minutes: time logged after task was returned/reopened for revision
      let reworkMin = Number(t.reworkMinutes || 0);
      if (!reworkMin && Array.isArray(t.timeEntries)) {
        const returnActivity = (t.taskActivities || t.activities || []).find((a: any) =>
          a.action === 'REOPENED' || a.action === 'RETURNED' ||
          (a.details && (String(a.details).includes('REOPENED') || String(a.details).includes('إرجاع') || String(a.details).includes('IN_REVIEW -> IN_PROGRESS')))
        );
        if (returnActivity) {
          const returnDate = new Date(returnActivity.createdAt).getTime();
          reworkMin = (t.timeEntries || []).reduce((sum: number, e: any) => {
            const eStart = new Date(e.startTime || e.createdAt).getTime();
            if (eStart >= returnDate) {
              return sum + Math.round(Number(e.duration || 0));
            }
            return sum;
          }, 0);
        }
      }

      return {
        ...t,
        id: t.id,
        title: t.title || 'مهمة بدون عنوان',
        description: t.description || '',
        projectName: projName,
        assignedToName: assigneeName,
        assignedToId: assignedId || 'unassigned',
        assignedTo: assignedId || 'unassigned',
        status: (String(t.status || 'PENDING').toUpperCase() as any),
        priority: (String(t.priority || 'MEDIUM').toUpperCase() as any),
        dueDate: t.dueDate || t.due_date,
        createdAt: t.createdAt,
        completedAt: completedDate,
        estimatedMinutes: estMin,
        actualTrackedMinutes: actualMin,
        totalLifetimeMinutes: lifetimeMin,
        todayTrackedMinutes: todayMin,
        varianceMinutes: varianceMin,
        variancePercent: variancePct,
        isOverdue,
        isTimeLeak,
        isReviewBlocked: isReview,
        reworkMinutes: reworkMin,
        tags: t.tags,
        returnCount: t.returnCount,
        returnReasonType: t.returnReasonType || t.return_reason_type,
      };
    });
  }, [tasks, users, activeDatePreset, activePeriod]);

  // Filter tasks using unified filter engine and secondary exception toggle
  const filteredItems = useMemo(() => {
    let list = filterTasksWithUnifiedEngine(reportItems, unifiedFilters);
    if (exceptionFilter === 'time_leaks') {
      list = list.filter((t) => t.isTimeLeak);
    } else if (exceptionFilter === 'review_blocked') {
      list = list.filter((t) => t.isReviewBlocked);
    } else if (exceptionFilter === 'overdue') {
      list = list.filter((t) => t.isOverdue);
    }
    return list;
  }, [reportItems, unifiedFilters, exceptionFilter]);

  // Aggregate KPIs
  const kpis: TaskReportKpiData = useMemo(() => {
    const total = filteredItems.length;
    const completed = filteredItems.filter((t) => t.status === 'COMPLETED').length;
    const inProgress = filteredItems.filter((t) => t.status === 'IN_PROGRESS').length;
    const inReview = filteredItems.filter((t) => t.status === 'IN_REVIEW').length;
    const overdue = filteredItems.filter((t) => t.isOverdue).length;
    const timeLeaks = filteredItems.filter((t) => t.isTimeLeak).length;
    const reviewBlocked = filteredItems.filter((t) => t.isReviewBlocked).length;

    const totalSeconds = filteredItems.reduce((acc, t) => acc + t.actualTrackedMinutes * 60, 0);
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const withEvidence = filteredItems.filter(
      (t) => t.estimatedMinutes > 0 && t.actualTrackedMinutes > 0
    );
    const accurate = withEvidence.filter(
      (t) => Math.abs(t.actualTrackedMinutes - t.estimatedMinutes) <= t.estimatedMinutes * 0.3
    ).length;
    const realAccuracy = withEvidence.length > 0 ? Math.round((accurate / withEvidence.length) * 100) : 0;
    const attendanceActiveSeconds = teamOverview.length > 0
      ? teamOverview.reduce((s: number, r: any) => s + Number(r.activeSeconds || 0), 0)
      : myDayActiveSeconds;

    const totalRework = filteredItems.reduce((acc, t) => acc + (t.reworkMinutes || 0), 0);

    return {
      totalTasks: total,
      completedCount: completed,
      completionRate: rate,
      inProgressCount: inProgress,
      inReviewCount: inReview,
      totalTrackedSeconds: totalSeconds,
      actualSeconds: totalSeconds,
      attendanceActiveSeconds,
      overdueCount: overdue,
      timeLeakCount: timeLeaks,
      reviewBlockedCount: reviewBlocked,
      focusAccuracyRate: realAccuracy,
      totalReworkMinutes: totalRework,
    };
  }, [filteredItems, teamOverview, myDayActiveSeconds]);

  // Per-member workload breakdown (in-progress, in-review, completed today)
  const teamMembersSummary: TeamMemberTaskSummary[] = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const memberMap: Record<string, TeamMemberTaskSummary> = {};
    const nameToId: Record<string, string> = {};

    users.forEach((u: any) => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email || 'عضو فريق';
      const normName = name.toLowerCase().trim();
      const uid = String(u.id || u.userId || normName);

      memberMap[uid] = {
        userId: uid,
        userName: name,
        jobTitle: u.jobTitle,
        departmentName: u.department?.name || u.departmentName,
        avatar: u.avatar,
        inProgressCount: 0,
        inReviewCount: 0,
        completedTodayCount: 0,
        pendingCount: 0,
        totalActiveCount: 0,
        totalTrackedMinutes: 0,
        activeTaskTitle: null,
      };
      if (normName) {
        nameToId[normName] = uid;
      }
    });

    filteredItems.forEach((t) => {
      const assignedName = (t.assignedToName || '').trim();
      const normName = assignedName.toLowerCase();

      // Resolve user: ID match first, then normalized name match
      let targetId = t.assignedToId && memberMap[t.assignedToId] ? t.assignedToId : null;
      if (!targetId && normName && nameToId[normName]) {
        targetId = nameToId[normName];
      }
      if (!targetId) {
        targetId = t.assignedToId || (normName ? `name-${normName}` : 'unassigned');
      }

      if (!memberMap[targetId]) {
        memberMap[targetId] = {
          userId: targetId,
          userName: assignedName || 'غير مسندة',
          inProgressCount: 0,
          inReviewCount: 0,
          completedTodayCount: 0,
          pendingCount: 0,
          totalActiveCount: 0,
          totalTrackedMinutes: 0,
          activeTaskTitle: null,
        };
        if (normName) {
          nameToId[normName] = targetId;
        }
      }

      const m = memberMap[targetId];
      m.totalTrackedMinutes += t.actualTrackedMinutes || 0;

      if (t.status === 'IN_PROGRESS') {
        m.inProgressCount += 1;
        m.totalActiveCount += 1;
        if (!m.activeTaskTitle) m.activeTaskTitle = t.title;
      } else if (t.status === 'IN_REVIEW') {
        m.inReviewCount += 1;
        m.totalActiveCount += 1;
      } else if (t.status === 'COMPLETED') {
        const compDate = (t.completedAt || t.createdAt || '').slice(0, 10);
        if (compDate === todayStr || activeDatePreset === 'today') {
          m.completedTodayCount += 1;
        }
      } else if (t.status === 'PENDING') {
        m.pendingCount += 1;
        m.totalActiveCount += 1;
      }
    });

    return Object.values(memberMap)
      .filter((m) => m.userId !== 'unassigned' || m.totalActiveCount > 0 || m.completedTodayCount > 0)
      .sort((a, b) => {
        const aActive = a.inProgressCount + a.inReviewCount + a.completedTodayCount;
        const bActive = b.inProgressCount + b.inReviewCount + b.completedTodayCount;
        if (bActive !== aActive) return bActive - aActive;
        return a.userName.localeCompare(b.userName, 'ar');
      });
  }, [users, filteredItems, activeDatePreset]);

  // 1-Click Daily Standup Generator
  const handleCopyDailyStandup = () => {
    const periodTitle = activePeriod.label;
    const userName = currentUser?.firstName
      ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
      : 'عضو الفريق';

    const completedPeriod = filteredItems.filter((t) => t.status === 'COMPLETED');
    const inProgressPeriod = filteredItems.filter((t) => t.status === 'IN_PROGRESS');
    const pendingPeriod = filteredItems.filter((t) => t.status === 'PENDING' || t.status === 'IN_REVIEW');

    const formatM = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    let text = `*ملخص إنجاز المهام والإنتاجية — ${userName}*\n📅 ${periodTitle}\n\n`;

    if (completedPeriod.length > 0) {
      text += `✅ *المهام المنجزة (${completedPeriod.length}):*\n`;
      completedPeriod.forEach((t) => {
        text += `• ${t.title} [${t.projectName}] — ${formatM(t.actualTrackedMinutes)}\n`;
      });
      text += '\n';
    }

    if (inProgressPeriod.length > 0) {
      text += `⏳ *قيد العمل الآن (${inProgressPeriod.length}):*\n`;
      inProgressPeriod.forEach((t) => {
        text += `• ${t.title} — تم تسجيل: ${formatM(t.actualTrackedMinutes)}\n`;
      });
      text += '\n';
    }

    if (pendingPeriod.length > 0) {
      text += `📌 *مهام قيد المتابعة (${pendingPeriod.length}):*\n`;
      pendingPeriod.slice(0, 3).forEach((t) => {
        text += `• ${t.title} [${t.status === 'IN_REVIEW' ? 'بانتظار الاعتماد' : 'قيد الانتظار'}]\n`;
      });
      text += '\n';
    }

    const totalHours = (kpis.totalTrackedSeconds / 3600).toFixed(1);
    text += `⏱️ *إجمالي ساعات التركيز الموثقة بالتايمر:* ${totalHours} ساعة\n`;
    text += `🚀 *MaxP Workspace Verified Report*`;

    navigator.clipboard.writeText(text);
    audioAlerts.playTaskComplete();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // 1-Click CSV Export with UTF-8 BOM
  const handleExportCsv = () => {
    const headers = ['المهمة', 'المشروع', 'المكلف', 'الأولوية', 'الحالة', 'التقديري (د)', 'الفعلي بالتايمر (د)'];
    const rows = filteredItems.map((t) => [
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.projectName.replace(/"/g, '""')}"`,
      `"${t.assignedToName.replace(/"/g, '""')}"`,
      t.priority,
      t.status,
      t.estimatedMinutes,
      t.actualTrackedMinutes,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const startTag = activePeriod.start === '1970-01-01' ? 'all' : activePeriod.start;
    const endTag = activePeriod.end === '2099-12-31' ? '' : `_to_${activePeriod.end}`;
    link.download = `MaxP_Task_Report_${startTag}${activePeriod.start !== activePeriod.end ? endTag : ''}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.chassis}>
      {/* Unified Omnisearch & Filter Bar (Web & Desktop Shared Engine) */}
      <TaskUnifiedFilterBar
        filters={unifiedFilters}
        onFiltersChange={handleFiltersChange}
        users={users}
        totalCount={reportItems.length}
        filteredCount={filteredItems.length}
        onRefresh={() => loadData(true)}
        isLoading={loading}
      />

      {/* Top Controls Toolbar: Date Presets & Quick Actions */}
      <div style={styles.topToolbar}>
        <div style={styles.toolbarLeft}>
          {/* Date Segmented Controls */}
          <div style={styles.segmentedWrap}>
            {(
              [
                { id: 'today', label: 'اليوم' },
                { id: 'yesterday', label: 'أمس' },
                { id: 'this_week', label: 'هذا الأسبوع' },
                { id: '7days', label: '7 أيام' },
                { id: 'this_month', label: 'هذا الشهر' },
                { id: '30days', label: '30 يوم' },
                { id: 'custom_day', label: 'يوم محدد' },
                { id: 'custom_range', label: 'فترة مخصصة' },
                { id: 'all', label: 'الكل' },
              ] as { id: TaskDateRange; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setDatePreset(item.id)}
                style={{
                  ...styles.segmentBtn,
                  background: activeDatePreset === item.id ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: activeDatePreset === item.id ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: activeDatePreset === item.id ? 700 : 500,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Specific Day Picker Control */}
          {activeDatePreset === 'custom_day' && (
            <div style={styles.datePickerBox}>
              <button
                onClick={() => {
                  const cur = unifiedFilters.dueDateFrom || getTodayStr();
                  const d = new Date(`${cur}T12:00:00`);
                  d.setDate(d.getDate() - 1);
                  const prev = d.toISOString().slice(0, 10);
                  handleFiltersChange({ ...unifiedFilters, dueDateFrom: prev, dueDateTo: prev });
                }}
                style={styles.dateMiniBtn}
                title="اليوم السابق"
                aria-label="اليوم السابق"
              >
                <ChevronRight size={12} />
              </button>
              <input
                type="date"
                value={unifiedFilters.dueDateFrom || getTodayStr()}
                max={getTodayStr()}
                onChange={(e) => {
                  if (e.target.value) {
                    handleFiltersChange({
                      ...unifiedFilters,
                      dueDateFrom: e.target.value,
                      dueDateTo: e.target.value,
                    });
                  }
                }}
                style={styles.dateInput}
                aria-label="اختيار تاريخ محدد"
              />
              <button
                onClick={() => {
                  const cur = unifiedFilters.dueDateFrom || getTodayStr();
                  if (cur >= getTodayStr()) return;
                  const d = new Date(`${cur}T12:00:00`);
                  d.setDate(d.getDate() + 1);
                  const next = d.toISOString().slice(0, 10);
                  const finalNext = next > getTodayStr() ? getTodayStr() : next;
                  handleFiltersChange({
                    ...unifiedFilters,
                    dueDateFrom: finalNext,
                    dueDateTo: finalNext,
                  });
                }}
                disabled={(unifiedFilters.dueDateFrom || getTodayStr()) >= getTodayStr()}
                style={{
                  ...styles.dateMiniBtn,
                  opacity: (unifiedFilters.dueDateFrom || getTodayStr()) >= getTodayStr() ? 0.35 : 1,
                  cursor: (unifiedFilters.dueDateFrom || getTodayStr()) >= getTodayStr() ? 'default' : 'pointer',
                }}
                title="اليوم التالي"
                aria-label="اليوم التالي"
              >
                <ChevronLeft size={12} />
              </button>
            </div>
          )}

          {/* Custom Date Range Pickers */}
          {activeDatePreset === 'custom_range' && (
            <div style={styles.datePickerBox}>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>من:</span>
              <input
                type="date"
                value={unifiedFilters.dueDateFrom || getDaysAgoStr(7)}
                max={getTodayStr()}
                onChange={(e) => {
                  if (e.target.value) {
                    handleFiltersChange({
                      ...unifiedFilters,
                      dueDateFrom: e.target.value,
                    });
                  }
                }}
                style={styles.dateInput}
                aria-label="تاريخ البداية"
              />
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>إلى:</span>
              <input
                type="date"
                value={unifiedFilters.dueDateTo || getTodayStr()}
                max={getTodayStr()}
                onChange={(e) => {
                  if (e.target.value) {
                    handleFiltersChange({
                      ...unifiedFilters,
                      dueDateTo: e.target.value,
                    });
                  }
                }}
                style={styles.dateInput}
                aria-label="تاريخ النهاية"
              />
            </div>
          )}

          {/* Active Period Badge */}
          <div style={styles.activePeriodBadge} title="الفترة الزمنية النشطة للتقرير">
            <Calendar size={12} color="var(--accent-blue)" />
            <span>{activePeriod.label}</span>
          </div>
        </div>

        {/* Action Triggers */}
        <div style={styles.toolbarRight}>
          <button
            onClick={handleCopyDailyStandup}
            style={{
              ...styles.primaryActionBtn,
              background: isCopied ? 'var(--accent-green)' : 'var(--accent-blue)',
            }}
            title="نسخ ملخص مهام اليوم المنسق لمشاركته في ثوانٍ"
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            {isCopied ? <Check size={12} color="var(--text-inverse)" /> : <Copy size={12} color="var(--text-inverse)" />}
            <span style={{ color: 'var(--text-inverse)' }}>
              {isCopied ? 'تم نسخ التقرير!' : 'نسخ التقرير'}
            </span>
          </button>

          <button
            onClick={handleExportCsv}
            style={styles.secondaryActionBtn}
            title="تصدير جدول المهام بصيغة CSV للأكسيل"
          >
            <Download size={12} color="var(--text-muted)" />
            <span>تصدير CSV</span>
          </button>

          <button
            onClick={() => loadData(true)}
            style={styles.iconBtn}
            title="تحديث البيانات"
          >
            <RefreshCw size={12} color="var(--text-muted)" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Ribbons */}
      <TaskReportKpis
        kpis={kpis}
        activeFilter={exceptionFilter}
        onFilterChange={setExceptionFilter}
        dateRange={activeDatePreset}
        periodLabel={activePeriod.label}
      />

      {/* ملخص يومي صادق — روح التقرير اليومي القديم بمصدر حقيقي */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {(() => {
          const active = Number(myDayActiveSeconds || 0);
          const idle = Number(myDayIdleSeconds || 0);
          const total = active + idle;
          const pct = total > 0 ? Math.round((active / total) * 100) : 0;
          const chip = (label: string, value: string, hint: string) => (
            <span
              title={hint}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '4px 10px', whiteSpace: 'nowrap' }}
            >
              {label}: <b style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</b>
            </span>
          );
          return (
            <>
              {chip(activePeriod.isSingle && activePeriod.start === getTodayStr() ? 'نشط اليوم' : 'نشط للفترة', `${Math.floor(active / 3600)}س ${Math.floor((active % 3600) / 60)}د`, 'وقت نشاطك الفعلي المسجل بجهازك للفترة المحددة')}
              {chip('خامل', `${Math.floor(idle / 60)}د`, 'وقت الجلسة بدون نشاط ماوس/كيبورد')}
              {chip('نسبة النشاط', `${pct}%`, 'نشط ÷ (نشط + خامل) للفترة المحددة')}
            </>
          );
        })()}
      </div>

      {/* Presence strip — absorbed from the merged daily report screen */}
      {isManager && teamOverview.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={presenceChipStyle}>
            {activePeriod.isSingle && activePeriod.start === getTodayStr() ? 'الحاضر الآن: ' : 'أعضاء الفريق: '}
            <b>{presenceStats.activeNow}</b> / {teamOverview.length}
          </span>
          <span style={presenceChipStyle}>
            متأخرون عن البصمة: <b>{presenceStats.late}</b>
          </span>
          <span style={presenceChipStyle}>
            موثق للفترة: <b>{presenceStats.totalHours}</b> ساعة
          </span>
          <span style={presenceChipStyle}>
            متوسط الإنتاجية: <b>{presenceStats.avgProd}%</b>
          </span>
        </div>
      )}

      {/* Team Members Workload Matrix (Per person in-progress, in-review, completed today) */}
      <TaskReportTeamMatrix
        members={teamMembersSummary}
        selectedUserId={unifiedFilters.assignedTo}
        onSelectMember={(userId) => {
          handleFiltersChange({
            ...unifiedFilters,
            assignedTo: userId,
          });
        }}
      />

      {/* Active User Filter Chip Indicator */}
      {unifiedFilters.assignedTo && unifiedFilters.assignedTo !== 'all' && (
        <div style={styles.activeFilterChipBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>تصفية المهام للموظف:</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent-blue)' }}>
              {teamMembersSummary.find((m) => m.userId === unifiedFilters.assignedTo)?.userName ||
                users.find((u) => u.id === unifiedFilters.assignedTo)?.firstName ||
                'موظف محدد'}
            </span>
          </div>
          <button
            onClick={() => handleFiltersChange({ ...unifiedFilters, assignedTo: 'all' })}
            style={styles.clearFilterBtn}
            title="إلغاء التصفية وعرض مهام الجميع"
          >
            إلغاء التصفية ✕
          </button>
        </div>
      )}

      {/* Manager Exception Radar */}
      <TaskReportExceptions
        timeLeakTasks={filteredItems.filter((t) => t.isTimeLeak)}
        reviewBlockedTasks={filteredItems.filter((t) => t.isReviewBlocked)}
        overdueTasks={filteredItems.filter((t) => t.isOverdue)}
      />

      {/* Analytical Task Ledger Table */}
      <TaskReportLedger
        tasks={filteredItems}
        searchQuery={unifiedFilters.search}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  chassis: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    paddingBottom: 24,
  },
  topToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  segmentedWrap: {
    display: 'inline-flex',
    background: 'var(--bg-surface)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: 2,
    gap: 2,
  },
  segmentBtn: {
    border: 'none',
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease',
  },
  primaryActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    border: 'none',
    borderRadius: 6,
    padding: '5px 11px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 120ms ease, background 150ms ease',
  },
  secondaryActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'var(--bg-elevated)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#cbd5e1',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: 6,
    background: 'var(--bg-elevated)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    cursor: 'pointer',
  },
  datePickerBox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'var(--bg-surface)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: '2px 6px',
  },
  dateInput: {
    background: 'transparent',
    border: 'none',
    color: '#e2e8f0',
    fontSize: 11,
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
  },
  dateMiniBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: 4,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#cbd5e1',
    cursor: 'pointer',
    padding: 0,
  },
  activePeriodBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: 6,
    padding: '3px 9px',
    fontSize: 11,
    color: 'var(--accent-blue)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  activeFilterChipBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: 6,
    marginBottom: 10,
  },
  clearFilterBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent-blue)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '2px 6px',
    fontFamily: 'inherit',
  },
};
