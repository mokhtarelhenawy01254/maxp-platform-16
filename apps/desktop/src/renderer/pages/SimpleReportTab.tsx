import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  RefreshCw,
  Copy,
  Check,
  Activity,
  Users,
  AlertTriangle,
  Search,
  ChevronRight,
  ChevronLeft,
  Calendar,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { audioAlerts } from '../utils/audioAlerts';
import { TaskReportView } from '../components/tasks/reports/TaskReportView';

interface TeamMemberOverview {
  employeeId: string;
  employeeName: string;
  departmentName: string;
  jobTitle: string;
  status: 'active' | 'idle' | 'offline';
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  productivityScore: number;
  clockInTime?: string;
  clockOutTime?: string;
  checkInMethod?: string;
  firstActivityTime?: string;
  lastSeenTime?: string;
  completedTasksCount: number;
  createdTasksCount: number;
  elapsedAttendanceSeconds: number;
  untrackedSeconds: number;
  hasMissingClockOut: boolean;
  activeTask?: {
    taskId: string;
    title: string;
    elapsedSeconds?: number;
  } | null;
}

interface AggStats {
  totalTracked: number;
  activeNow: number;
  avgProductivity: number;
  totalHoursTracked: number;
  totalTasksCompleted: number;
  totalTasksCreated: number;
}

export const SimpleReportTab: React.FC = () => {
  const [reportSection, setReportSection] = useState<'attendance' | 'tasks'>('attendance');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idle' | 'offline'>('all');
  const [teamMembers, setTeamMembers] = useState<TeamMemberOverview[]>([]);
  const [stats, setStats] = useState<AggStats>({
    totalTracked: 0,
    activeNow: 0,
    avgProductivity: 0,
    totalHoursTracked: 0,
    totalTasksCompleted: 0,
    totalTasksCreated: 0,
  });
  const [isCopied, setIsCopied] = useState(false);

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const isToday = selectedDate === todayStr;

  const handleDateStep = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (d <= today) {
      setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  };

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await window.electronAPI.getTeamOverview(selectedDate);
      const rawData = res?.data || res || [];
      const data = Array.isArray(rawData) ? rawData : [];

      const seen = new Set<string>();
      const formatted: TeamMemberOverview[] = [];
      let totalActiveSec = 0;
      let activeCount = 0;
      let activeProdScore = 0;
      let activeProdCount = 0;
      let totalTasks = 0;
      let totalCreated = 0;

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

        if ((item.totalActiveSeconds || 0) > 0 && (item.productivityScore || 0) > 0) {
          activeProdScore += item.productivityScore;
          activeProdCount++;
        }

        formatted.push({
          employeeId: item.employeeId,
          employeeName: empName,
          departmentName: item.employee?.department?.name || 'الإدارة العامة',
          jobTitle: item.employee?.position?.title || 'موظف',
          status: item.status || 'offline',
          totalActiveSeconds: item.totalActiveSeconds || 0,
          totalIdleSeconds: item.totalIdleSeconds || 0,
          productivityScore: Math.round(item.productivityScore || 0),
          clockInTime: item.clockInTime,
          clockOutTime: item.clockOutTime,
          checkInMethod: item.checkInMethod,
          firstActivityTime: item.firstActivityTime,
          lastSeenTime: item.lastSeenTime,
          completedTasksCount: item.completedTasksCount || 0,
          createdTasksCount: item.createdTasksCount || 0,
          elapsedAttendanceSeconds: item.elapsedAttendanceSeconds || 0,
          untrackedSeconds: item.untrackedSeconds || 0,
          hasMissingClockOut: item.hasMissingClockOut || false,
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
      });
    } catch (err) {
      console.warn('[SimpleReportTab] Fetch error:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 45_000);
    return () => clearInterval(interval);
  }, [loadData]);

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

  const filteredMembers = teamMembers.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q ||
      m.employeeName.toLowerCase().includes(q) ||
      m.departmentName.toLowerCase().includes(q) ||
      m.jobTitle.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCopySummary = () => {
    const dateLabel = isToday ? 'اليوم' : selectedDate;
    const lines = [
      `ملخص تقرير مراقبة الفريق (${dateLabel}) — منظومة MaxP`,
      `• إجمالي الموظفين الموثقين: ${stats.totalTracked}`,
      `• نشط ومتصل حالياً: ${stats.activeNow}`,
      `• إجمالي ساعات العمل الموثقة: ${stats.totalHoursTracked} ساعة`,
      `• المهام المنجزة: ${stats.totalTasksCompleted}`,
      `• المهام المنشأة: ${stats.totalTasksCreated}`,
      `• متوسط الإنتاجية: ${stats.avgProductivity}%`,
      ``,
      `تفاصيل الأعضاء:`,
    ];
    filteredMembers.forEach((m) => {
      const clockIn = formatClockTime(m.clockInTime);
      lines.push(
        `  - ${m.employeeName} (${m.departmentName}): عمل فعلي ${formatSeconds(m.totalActiveSeconds)}, إنتاجية ${m.productivityScore}%, ${m.completedTasksCount} منجزة${clockIn ? `, بصمة ${clockIn}` : ''}`
      );
    });
    lines.push(``, `تم إعداد التقرير عبر MaxP Workspace Desktop`);

    navigator.clipboard.writeText(lines.join('\n'));
    setIsCopied(true);
    audioAlerts.playTaskComplete();
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div style={styles.container}>
      {/* 2026 Executive Intelligence Hub Switcher */}
      <div style={styles.hubSwitcherRow}>
        <div style={styles.hubSegmentedWrap}>
          <button
            onClick={() => setReportSection('attendance')}
            style={{
              ...styles.hubSegmentBtn,
              background: reportSection === 'attendance' ? 'var(--bg-elevated)' : 'transparent',
              color: reportSection === 'attendance' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: reportSection === 'attendance' ? 700 : 500,
              boxShadow: reportSection === 'attendance' ? 'var(--shadow-card)' : 'none',
            }}
          >
            <Users size={13} />
            <span>حضور ونشاط الفريق</span>
          </button>
          <button
            onClick={() => setReportSection('tasks')}
            style={{
              ...styles.hubSegmentBtn,
              background: reportSection === 'tasks' ? 'var(--bg-elevated)' : 'transparent',
              color: reportSection === 'tasks' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: reportSection === 'tasks' ? 700 : 500,
              boxShadow: reportSection === 'tasks' ? 'var(--shadow-card)' : 'none',
            }}
          >
            <CheckCircle2 size={13} color="#38bdf8" />
            <span>ساعات وتحليلات المهام</span>
          </button>
        </div>
      </div>

      {reportSection === 'tasks' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
          <TaskReportView isExecutiveMode={true} />
        </div>
      ) : (
        <>
          {/* Header Strip */}
          <div style={styles.headerStrip}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.headerIconBox}>
            <FileText size={16} color="var(--accent-blue)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={styles.headerTitle}>تقرير وملخص إنتاجية الفريق</span>
              <span style={styles.liveBadge}>
                <span style={styles.pulseDot} />
                <span>{stats.activeNow} نشط الآن</span>
              </span>
            </div>
            <div style={styles.headerSubtitle}>
              نفس بيانات ومنطق شاشة المراقبة على الويب (hr/monitor)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Date Stepper */}
          <div style={styles.dateStepper}>
            <button onClick={() => handleDateStep(-1)} style={styles.stepBtn} title="اليوم السابق">
              <ChevronRight size={13} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px' }}>
              <Calendar size={12} color="var(--text-muted)" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
            <button
              onClick={() => handleDateStep(1)}
              disabled={isToday}
              style={{ ...styles.stepBtn, opacity: isToday ? 0.3 : 1 }}
              title="اليوم التالي"
            >
              <ChevronLeft size={13} />
            </button>
          </div>

          <button onClick={handleCopySummary} style={styles.copyBtn} title="نسخ التقرير">
            {isCopied ? <Check size={12} color="var(--accent-green)" /> : <Copy size={12} />}
            <span>{isCopied ? 'تم النسخ' : 'نسخ'}</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={loading}
            style={styles.refreshBtn}
            title="تحديث"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Bento Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>الموظفون الموثقون</span>
            <Users size={14} color="var(--accent-blue)" />
          </div>
          <div style={styles.kpiValue}>{stats.totalTracked}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>نشط ومتصل</span>
            <Activity size={14} color="#10b981" />
          </div>
          <div style={{ ...styles.kpiValue, color: '#10b981' }}>{stats.activeNow}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>متوسط الإنتاجية</span>
            <TrendingUp size={14} color="#c084fc" />
          </div>
          <div style={styles.kpiValue}>{stats.avgProductivity}%</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>إجمالي ساعات العمل</span>
            <Clock size={14} color="#f59e0b" />
          </div>
          <div style={styles.kpiValue}>{stats.totalHoursTracked} ساعة</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={12} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو القسم…"
            style={styles.searchInput}
          />
        </div>
        <div style={styles.statusChips}>
          {(['all', 'active', 'idle', 'offline'] as const).map((s) => {
            const label = s === 'all' ? `الكل (${teamMembers.length})`
              : s === 'active' ? `نشط (${stats.activeNow})`
              : s === 'idle' ? 'خامل'
              : 'غير متصل';
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  ...styles.chipBtn,
                  backgroundColor: statusFilter === s ? 'var(--bg-elevated)' : 'transparent',
                  color: statusFilter === s ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: statusFilter === s ? 600 : 400,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Team Members List */}
      <div style={styles.listArea}>
        {loading && teamMembers.length === 0 ? (
          <div style={styles.emptyState}>جاري استرداد بيانات النشاط…</div>
        ) : filteredMembers.length === 0 ? (
          <div style={styles.emptyState}>لا توجد بيانات مطابقة</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredMembers.map((m) => {
              const clockIn = formatClockTime(m.clockInTime);
              const firstAct = formatClockTime(m.firstActivityTime);
              const methodLabel = m.checkInMethod === 'fingerprint' || m.checkInMethod === 'biometric'
                ? 'بصمة' : m.checkInMethod === 'mobile' ? 'موبايل'
                : m.checkInMethod === 'web' ? 'ويب' : m.checkInMethod || 'نظام';

              return (
                <div key={m.employeeId} style={styles.memberRow}>
                  {/* Left: Name + Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <div style={{
                      ...styles.statusDot,
                      backgroundColor: m.status === 'active' ? '#10b981' : m.status === 'idle' ? '#f59e0b' : '#71717a',
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.memberName}>{m.employeeName}</div>
                      <div style={styles.memberMeta}>{m.departmentName} · {m.jobTitle}</div>
                    </div>
                  </div>

                  {/* Active Task */}
                  {m.activeTask && (
                    <div style={styles.activeTaskBadge}>
                      <span style={styles.taskPulseDot} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                        {m.activeTask.title}
                      </span>
                    </div>
                  )}

                  {/* Attendance */}
                  <div style={styles.cellBlock}>
                    <span style={styles.cellLabel}>البصمة:</span>
                    <span style={{ ...styles.cellValue, color: clockIn ? 'var(--text-primary)' : '#ef4444' }}>
                      {clockIn ? `${clockIn} (${methodLabel})` : 'لم يسجل'}
                    </span>
                  </div>

                  {/* Active Time */}
                  <div style={styles.cellBlock}>
                    <span style={styles.cellLabel}>عمل فعلي:</span>
                    <span style={styles.cellValue}>{formatSeconds(m.totalActiveSeconds)}</span>
                  </div>

                  {/* Idle Time */}
                  <div style={styles.cellBlock}>
                    <span style={styles.cellLabel}>توقف:</span>
                    <span style={{ ...styles.cellValue, color: 'var(--text-dim)' }}>{formatSeconds(m.totalIdleSeconds)}</span>
                  </div>

                  {/* Productivity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={styles.prodBar}>
                      <div style={{
                        height: '100%',
                        borderRadius: 4,
                        width: `${Math.min(100, m.productivityScore)}%`,
                        backgroundColor: m.productivityScore >= 75 ? '#10b981' : m.productivityScore >= 50 ? '#38bdf8' : '#f59e0b',
                      }} />
                    </div>
                    <span style={styles.prodText}>{m.productivityScore}%</span>
                  </div>

                  {/* Tasks */}
                  <div style={styles.cellBlock}>
                    <span style={{ ...styles.cellValue, color: '#10b981', fontWeight: 600 }}>
                      {m.completedTasksCount} منجزة
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  )}
</div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-canvas)',
  },
  hubSwitcherRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '6px 12px 6px 12px',
    flexShrink: 0,
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    background: 'rgba(18, 18, 20, 0.6)',
  },
  hubSegmentedWrap: {
    display: 'inline-flex',
    background: '#121214',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: 2,
    gap: 2,
  },
  hubSegmentBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    border: 'none',
    borderRadius: 5,
    padding: '4px 10px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease',
  },
  headerStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  headerIconBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  headerSubtitle: {
    fontSize: 10,
    color: 'var(--text-muted)',
    marginTop: 1,
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '2px 7px',
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.25)',
    fontSize: 10,
    fontWeight: 700,
    color: '#10b981',
    fontVariantNumeric: 'tabular-nums',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  dateStepper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: 1,
  },
  stepBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: 4,
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  dateInput: {
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 11,
    outline: 'none',
    width: 100,
    fontFamily: 'inherit',
  },
  copyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 6,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    padding: '10px 14px',
    flexShrink: 0,
  },
  kpiCard: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  kpiHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    marginTop: 2,
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '6px 14px',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '3px 8px',
    width: 200,
  },
  searchInput: {
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 11,
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  },
  statusChips: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'var(--bg-subtle)',
    padding: 2,
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
  },
  chipBtn: {
    border: 'none',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease',
  },
  listArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 14px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 16px',
    color: 'var(--text-muted)',
    fontSize: 12,
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 10px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    transition: 'all 120ms ease',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
  },
  memberName: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  memberMeta: {
    fontSize: 10,
    color: 'var(--text-muted)',
    marginTop: 1,
  },
  activeTaskBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 7px',
    borderRadius: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    fontSize: 10,
    fontWeight: 600,
    color: '#38bdf8',
    maxWidth: 160,
    flexShrink: 0,
  },
  taskPulseDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: '#38bdf8',
    flexShrink: 0,
  },
  cellBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  cellLabel: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  cellValue: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
  },
  prodBar: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  prodText: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
    width: 30,
    textAlign: 'left',
  },
};

export default SimpleReportTab;
