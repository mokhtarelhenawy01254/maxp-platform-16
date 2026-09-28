import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  Search,
  RefreshCw,
  Sparkles,
  Filter,
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
    selectedUserId: 'all',
    selectedProject: 'all',
    exceptionFilter: 'all',
    searchQuery: '',
  });

  const roleStr = String(currentUser?.role || '').toUpperCase();
  const isAdmin = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER'].includes(roleStr);
  const isManager = isAdmin || ['MANAGER', 'HR_MANAGER'].includes(roleStr) || isExecutiveMode;

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const auth = await window.electronAPI.getAuthState();
      if (auth?.user) setCurrentUser(auth.user);

      const userRole = String(auth?.user?.role || '').toUpperCase();
      const hasPrivilege = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER'].includes(userRole) || isExecutiveMode;
      const fetchType = hasPrivilege ? 'all' : 'my-tasks';

      const [tasksRes, usersRes] = await Promise.all([
        window.electronAPI.getTasks(fetchType),
        hasPrivilege ? window.electronAPI.getCompanyUsers() : Promise.resolve({ success: false, users: [] }),
      ]);

      if (tasksRes?.success && Array.isArray(tasksRes.tasks)) {
        setTasks(tasksRes.tasks);
      }
      if (usersRes?.success && Array.isArray(usersRes.users)) {
        setUsers(usersRes.users);
      }
    } catch (err) {
      console.warn('[TaskReportView] Error loading report data:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [isExecutiveMode]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Transform raw tasks to TaskReportItem with calculated variance
  const reportItems: TaskReportItem[] = useMemo(() => {
    const now = Date.now();
    return tasks.map((t: any) => {
      const estMin = Number(t.estimatedMinutes || t.estimated_minutes || (t.estimatedHours ? t.estimatedHours * 60 : 0));
      const actualMin = Math.round(Number(t.totalDuration || t.total_duration || (t.totalSeconds ? t.totalSeconds / 60 : 0)));
      const varianceMin = actualMin - estMin;
      const variancePct = estMin > 0 ? Math.round((actualMin / estMin) * 100) : 0;

      const dueTime = t.dueDate || t.due_date ? new Date(t.dueDate || t.due_date).getTime() : null;
      const isDone = String(t.status || '').toUpperCase() === 'COMPLETED';
      const isOverdue = !isDone && Boolean(dueTime && dueTime < now);
      const isTimeLeak = !isDone && estMin > 0 && actualMin > estMin * 1.3;
      const isReview = String(t.status || '').toUpperCase() === 'IN_REVIEW';

      const assignee = t.assignedTo || t.assignee;
      const assigneeName = assignee?.firstName
        ? `${assignee.firstName} ${assignee.lastName || ''}`.trim()
        : t.assignedToName || 'غير مسندة';

      const projName = t.project?.name || t.projectName || 'عام';

      return {
        id: t.id,
        title: t.title || 'مهمة بدون عنوان',
        projectName: projName,
        assignedToName: assigneeName,
        assignedToId: t.assignedToId || assignee?.id,
        status: (String(t.status || 'PENDING').toUpperCase() as any),
        priority: (String(t.priority || 'MEDIUM').toUpperCase() as any),
        dueDate: t.dueDate || t.due_date,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        estimatedMinutes: estMin,
        actualTrackedMinutes: actualMin,
        varianceMinutes: varianceMin,
        variancePercent: variancePct,
        isOverdue,
        isTimeLeak,
        isReviewBlocked: isReview,
      };
    });
  }, [tasks]);

  // Filter tasks based on active controls
  const filteredItems = useMemo(() => {
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

      if (filters.dateRange === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        const taskDate = (t.createdAt || '').slice(0, 10);
        const compDate = (t.completedAt || '').slice(0, 10);
        return taskDate === todayStr || compDate === todayStr || t.status === 'IN_PROGRESS';
      }
      return true;
    });
  }, [reportItems, filters]);

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

    return {
      totalTasks: total,
      completedCount: completed,
      completionRate: rate,
      inProgressCount: inProgress,
      inReviewCount: inReview,
      totalTrackedSeconds: totalSeconds,
      overdueCount: overdue,
      timeLeakCount: timeLeaks,
      reviewBlockedCount: reviewBlocked,
      focusAccuracyRate: 85,
    };
  }, [filteredItems]);

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

    reportItems.forEach((t) => {
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
  }, [users, reportItems, filters.dateRange]);

  // 1-Click Daily Standup Generator
  const handleCopyDailyStandup = () => {
    const dateStr = new Date().toLocaleDateString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const userName = currentUser?.firstName
      ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
      : 'عضو الفريق';

    const completedToday = filteredItems.filter((t) => t.status === 'COMPLETED');
    const inProgressToday = filteredItems.filter((t) => t.status === 'IN_PROGRESS');
    const pendingToday = filteredItems.filter((t) => t.status === 'PENDING' || t.status === 'IN_REVIEW');

    const formatM = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    let text = `*ملخص إنجاز المهام اليومي — ${userName}*\n📅 ${dateStr}\n\n`;

    if (completedToday.length > 0) {
      text += `✅ *المهام المنجزة (${completedToday.length}):*\n`;
      completedToday.forEach((t) => {
        text += `• ${t.title} [${t.projectName}] — ${formatM(t.actualTrackedMinutes)}\n`;
      });
      text += '\n';
    }

    if (inProgressToday.length > 0) {
      text += `⏳ *قيد العمل الآن (${inProgressToday.length}):*\n`;
      inProgressToday.forEach((t) => {
        text += `• ${t.title} — تم تسجيل: ${formatM(t.actualTrackedMinutes)}\n`;
      });
      text += '\n';
    }

    if (pendingToday.length > 0) {
      text += `📌 *مهام مجدولة للمتابعة (${pendingToday.length}):*\n`;
      pendingToday.slice(0, 3).forEach((t) => {
        text += `• ${t.title} [${t.status === 'IN_REVIEW' ? 'مراجعة' : 'قيد الانتظار'}]\n`;
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
    link.download = `MaxP_Task_Report_${new Date().toISOString().slice(0, 10)}.csv`;
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
            {(['today', '7days', '30days', 'all'] as TaskDateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setFilters((p) => ({ ...p, dateRange: range }))}
                style={{
                  ...styles.segmentBtn,
                  background: filters.dateRange === range ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: filters.dateRange === range ? '#f8fafc' : '#94a3b8',
                }}
              >
                {range === 'today' ? 'اليوم' : range === '7days' ? '7 أيام' : range === '30days' ? '30 يوم' : 'الكل'}
              </button>
            ))}
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
            <Search size={12} color="#64748b" style={styles.searchIcon} />
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
              background: isCopied ? '#22c55e' : '#38bdf8',
            }}
            title="نسخ ملخص مهام اليوم المنسق لمشاركته في ثوانٍ"
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            {isCopied ? <Check size={12} color="#09090b" /> : <Copy size={12} color="#09090b" />}
            <span style={{ color: '#09090b' }}>
              {isCopied ? 'تم نسخ التقرير اليومي!' : 'نسخ تقرير اليومية'}
            </span>
          </button>

          <button
            onClick={handleExportCsv}
            style={styles.secondaryActionBtn}
            title="تصدير جدول المهام بصيغة CSV للأكسيل"
          >
            <Download size={12} color="#94a3b8" />
            <span>تصدير CSV</span>
          </button>

          <button
            onClick={() => loadData(true)}
            style={styles.iconBtn}
            title="تحديث البيانات"
          >
            <RefreshCw size={12} color="#94a3b8" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Ribbons */}
      <TaskReportKpis
        kpis={kpis}
        activeFilter={filters.exceptionFilter}
        onFilterChange={(f) => setFilters((p) => ({ ...p, exceptionFilter: f }))}
      />

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
            <span style={{ fontSize: 11, color: '#94a3b8' }}>تصفية المهام للموظف:</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#38bdf8' }}>
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
    background: '#121214',
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
    background: '#121214',
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
    background: '#121214',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    color: '#f8fafc',
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
    background: '#18181b',
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
    background: '#18181b',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    cursor: 'pointer',
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
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '2px 6px',
    fontFamily: 'inherit',
  },
};
