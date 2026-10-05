import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  Search,
  RefreshCw,
  Sparkles,
  Filter,
  Calendar,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { audioAlerts } from '../../../utils/audioAlerts';
import {
  TaskReportItem,
  TaskReportKpiData,
  TaskReportFilterState,
  TaskDateRange,
  TaskExceptionFilter,
  TeamMemberTaskSummary,
} from './TaskReportTypes';
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

  const [filters, setFilters] = useState<TaskReportFilterState>({
    dateRange: 'today',
    specificDate: getTodayStr(),
    startDate: getDaysAgoStr(7),
    endDate: getTodayStr(),
    selectedUserId: 'all',
    selectedProject: 'all',
    exceptionFilter: 'all',
    searchQuery: '',
  });

  const activePeriod = useMemo(() => {
    const today = getTodayStr();
    let start = today;
    let end = today;
    let label = 'اليوم';
    let isSingle = true;

    switch (filters.dateRange) {
      case 'today':
        start = today;
        end = today;
        label = `اليوم (${formatArabicDate(today)})`;
        isSingle = true;
        break;
      case 'yesterday': {
        const y = getYesterdayStr();
        start = y;
        end = y;
        label = `أمس (${formatArabicDate(y)})`;
        isSingle = true;
        break;
      }
      case 'custom_day': {
        const d = filters.specificDate || today;
        start = d;
        end = d;
        label = `يوم ${formatArabicDate(d)}`;
        isSingle = true;
        break;
      }
      case 'this_week':
        start = getThisWeekStartStr();
        end = today;
        label = `هذا الأسبوع (${formatArabicDate(start)} ← ${formatArabicDate(end)})`;
        isSingle = false;
        break;
      case '7days':
        start = getDaysAgoStr(7);
        end = today;
        label = `آخر 7 أيام (${formatArabicDate(start)} ← ${formatArabicDate(end)})`;
        isSingle = false;
        break;
      case 'this_month':
        start = getThisMonthStartStr();
        end = today;
        label = `هذا الشهر (${formatArabicDate(start)} ← ${formatArabicDate(end)})`;
        isSingle = false;
        break;
      case '30days':
        start = getDaysAgoStr(30);
        end = today;
        label = `آخر 30 يوم (${formatArabicDate(start)} ← ${formatArabicDate(end)})`;
        isSingle = false;
        break;
      case 'custom_range':
        start = filters.startDate || getDaysAgoStr(7);
        end = filters.endDate || today;
        label = `فترة مخصصة (${formatArabicDate(start)} ← ${formatArabicDate(end)})`;
        isSingle = start === end;
        break;
      case 'all':
        start = '1970-01-01';
        end = '2099-12-31';
        label = 'كافة الفترات';
        isSingle = false;
        break;
    }

    return { start, end, label, isSingle };
  }, [filters.dateRange, filters.specificDate, filters.startDate, filters.endDate]);

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
    // activityRatio arrives 0..1 (fraction) or 0..100 (percent) depending on backend — normalize
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
      if (filters.dateRange === 'today') {
        actualMin = todayMin;
      } else if (filters.dateRange !== 'all') {
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

      return {
        id: t.id,
        title: t.title || 'مهمة بدون عنوان',
        projectName: projName,
        assignedToName: assigneeName,
        assignedToId: assignedId || 'unassigned',
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
      };
    });
  }, [tasks, users, filters.dateRange, activePeriod]);

  // Filter tasks based on active controls
  const filteredItems = useMemo(() => {
    const todayStr = getTodayStr();
    return reportItems.filter((t) => {
      if (filters.selectedUserId !== 'all' && t.assignedToId !== filters.selectedUserId) {
        return false;
      }
      if (filters.selectedProject !== 'all' && t.projectName !== filters.selectedProject) {
        return false;
      }
      if (filters.exceptionFilter === 'time_leaks' && !t.isTimeLeak) return false;
      if (filters.exceptionFilter === 'review_blocked' && !t.isReviewBlocked) return false;
      if (filters.exceptionFilter === 'overdue' && !t.isOverdue) return false;

      // Quick search fallback if provided in TaskReportFilterState
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(q);
        const projMatch = t.projectName.toLowerCase().includes(q);
        const userMatch = t.assignedToName.toLowerCase().includes(q);
        const idMatch = String(t.id || '').toLowerCase().includes(q);
        if (!titleMatch && !projMatch && !userMatch && !idMatch) {
          return false;
        }
      }

      const compDate = (t.completedAt || '').slice(0, 10);

      if (filters.dateRange === 'all') {
        return true;
      }

      const isActive = t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW' || t.status === 'PENDING';

      if (activePeriod.isSingle) {
        const targetDay = activePeriod.start;
        const isCompletedOnDay = t.status === 'COMPLETED' && compDate === targetDay;
        const isWorkedOnDay = (t.timeEntries || []).some(
          (e: any) => (e.startTime || e.createdAt || '').slice(0, 10) === targetDay
        );
        const isCreatedOnDay = (t.createdAt || '').slice(0, 10) === targetDay;
        const isCurrentActive = targetDay === todayStr && isActive;
        return isCompletedOnDay || isWorkedOnDay || isCreatedOnDay || isCurrentActive;
      }

      // Date range
      const isCompletedInRange = t.status === 'COMPLETED' && compDate >= activePeriod.start && compDate <= activePeriod.end;
      const isWorkedInRange = (t.timeEntries || []).some((e: any) => {
        const d = (e.startTime || e.createdAt || '').slice(0, 10);
        return d >= activePeriod.start && d <= activePeriod.end;
      });
      const isCreatedInRange = (t.createdAt || '').slice(0, 10) >= activePeriod.start && (t.createdAt || '').slice(0, 10) <= activePeriod.end;
      return isCompletedInRange || isWorkedInRange || isCreatedInRange || isActive;
    });
  }, [reportItems, filters, activePeriod]);

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
    // Real estimation accuracy: tasks WITH estimate AND tracked time whose
    // actual stayed within ±30% of the estimate (was hardcoded 85 — fake)
    const withEvidence = filteredItems.filter(
      (t) => t.estimatedMinutes > 0 && t.actualTrackedMinutes > 0
    );
    const accurate = withEvidence.filter(
      (t) => Math.abs(t.actualTrackedMinutes - t.estimatedMinutes) <= t.estimatedMinutes * 0.3
    ).length;
    const realAccuracy = withEvidence.length > 0 ? Math.round((accurate / withEvidence.length) * 100) : 0;
    // Real attendance work time: team aggregate for managers, own attendance day for employees
    const attendanceActiveSeconds = teamOverview.length > 0
      ? teamOverview.reduce((s: number, r: any) => s + Number(r.activeSeconds || 0), 0)
      : myDayActiveSeconds;

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
    };
  }, [filteredItems, teamOverview, myDayActiveSeconds]);

  // Unique project names for dropdown
  const uniqueProjects = useMemo(() => {
    return Array.from(new Set(reportItems.map((t) => t.projectName))).filter(Boolean);
  }, [reportItems]);

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
        if (compDate === todayStr || filters.dateRange === 'today') {
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
  }, [users, filteredItems, filters.dateRange]);

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
      {/* Top Controls Toolbar */}
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
                onClick={() => setFilters((p) => ({ ...p, dateRange: item.id }))}
                style={{
                  ...styles.segmentBtn,
                  background: filters.dateRange === item.id ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: filters.dateRange === item.id ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: filters.dateRange === item.id ? 700 : 500,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Specific Day Picker Control */}
          {filters.dateRange === 'custom_day' && (
            <div style={styles.datePickerBox}>
              <button
                onClick={() => {
                  const cur = filters.specificDate || getTodayStr();
                  const d = new Date(`${cur}T12:00:00`);
                  d.setDate(d.getDate() - 1);
                  setFilters((p) => ({ ...p, specificDate: d.toISOString().slice(0, 10) }));
                }}
                style={styles.dateMiniBtn}
                title="اليوم السابق"
                aria-label="اليوم السابق"
              >
                <ChevronRight size={12} />
              </button>
              <input
                type="date"
                value={filters.specificDate || getTodayStr()}
                max={getTodayStr()}
                onChange={(e) => e.target.value && setFilters((p) => ({ ...p, specificDate: e.target.value }))}
                style={styles.dateInput}
                aria-label="اختيار تاريخ محدد"
              />
              <button
                onClick={() => {
                  const cur = filters.specificDate || getTodayStr();
                  if (cur >= getTodayStr()) return;
                  const d = new Date(`${cur}T12:00:00`);
                  d.setDate(d.getDate() + 1);
                  const next = d.toISOString().slice(0, 10);
                  setFilters((p) => ({ ...p, specificDate: next > getTodayStr() ? getTodayStr() : next }));
                }}
                disabled={(filters.specificDate || getTodayStr()) >= getTodayStr()}
                style={{
                  ...styles.dateMiniBtn,
                  opacity: (filters.specificDate || getTodayStr()) >= getTodayStr() ? 0.35 : 1,
                  cursor: (filters.specificDate || getTodayStr()) >= getTodayStr() ? 'default' : 'pointer',
                }}
                title="اليوم التالي"
                aria-label="اليوم التالي"
              >
                <ChevronLeft size={12} />
              </button>
            </div>
          )}

          {/* Custom Date Range Pickers */}
          {filters.dateRange === 'custom_range' && (
            <div style={styles.datePickerBox}>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>من:</span>
              <input
                type="date"
                value={filters.startDate || getDaysAgoStr(7)}
                max={getTodayStr()}
                onChange={(e) => e.target.value && setFilters((p) => ({ ...p, startDate: e.target.value }))}
                style={styles.dateInput}
                aria-label="تاريخ البداية"
              />
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>إلى:</span>
              <input
                type="date"
                value={filters.endDate || getTodayStr()}
                max={getTodayStr()}
                onChange={(e) => e.target.value && setFilters((p) => ({ ...p, endDate: e.target.value }))}
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

          {/* Project Filter */}
          <select
            value={filters.selectedProject}
            onChange={(e) => setFilters((p) => ({ ...p, selectedProject: e.target.value }))}
            style={styles.selectInput}
          >
            <option value="all">كافة المشاريع</option>
            {uniqueProjects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* User Filter (for Managers) */}
          {isManager && users.length > 0 && (
            <select
              value={filters.selectedUserId}
              onChange={(e) => setFilters((p) => ({ ...p, selectedUserId: e.target.value }))}
              style={styles.selectInput}
            >
              <option value="all">كافة الموظفين</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName || ''}
                </option>
              ))}
            </select>
          )}

          {/* Search Input */}
          <div style={styles.searchWrap}>
            <Search size={12} color="var(--text-muted)" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="بحث في المهام والمشاريع…"
              value={filters.searchQuery}
              onChange={(e) => setFilters((p) => ({ ...p, searchQuery: e.target.value }))}
              style={styles.searchInput}
            />
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
        activeFilter={filters.exceptionFilter}
        onFilterChange={(f) => setFilters((p) => ({ ...p, exceptionFilter: f }))}
        dateRange={filters.dateRange}
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
        selectedUserId={filters.selectedUserId}
        onSelectMember={(userId) => {
          setFilters((p) => ({
            ...p,
            selectedUserId: userId,
          }));
        }}
      />

      {/* Active User Filter Chip Indicator */}
      {filters.selectedUserId !== 'all' && (
        <div style={styles.activeFilterChipBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>تصفية المهام للموظف:</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent-blue)' }}>
              {teamMembersSummary.find((m) => m.userId === filters.selectedUserId)?.userName || 'موظف محدد'}
            </span>
          </div>
          <button
            onClick={() => setFilters((p) => ({ ...p, selectedUserId: 'all' }))}
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
        searchQuery={filters.searchQuery}
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
  selectInput: {
    background: 'var(--bg-surface)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 11,
    padding: '4px 8px',
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
  },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    right: 8,
    pointerEvents: 'none',
  },
  searchInput: {
    background: 'var(--bg-surface)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 11,
    padding: '4px 26px 4px 8px',
    fontFamily: 'inherit',
    outline: 'none',
    width: 170,
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
