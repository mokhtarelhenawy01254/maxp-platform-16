import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Pause,
  RefreshCw,
  Search,
  Users,
  Coffee,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Timer,
  Moon,
  Activity,
  Briefcase,
} from 'lucide-react';

interface TeamTimer {
  id: string;
  taskId: string;
  taskTitle: string;
  priority?: string;
  taskStatus?: string;
  projectName?: string;
  userId: string;
  userName: string;
  userJobTitle?: string;
  userDepartment?: string;
  startTime?: string;
  elapsedSeconds?: number;
}

interface TeamMember {
  employeeId: string;
  employeeName: string;
  departmentName: string;
  jobTitle: string;
  status: 'active' | 'break' | 'idle' | 'offline';
  breakReason?: string | null;
  isCurrentlyOnBreak?: boolean;
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  totalBreaksCount?: number;
  totalBreakSeconds?: number;
  totalBreakMinutes?: number;
  totalSleepSeconds?: number;
  productivityScore: number;
  activityRatio?: number;
  clockInTime?: string | null;
  clockOutTime?: string | null;
  deviceName?: string | null;
  lastSeenTime?: string | null;
  activeTimers: TeamTimer[];
}

const formatDuration = (sec: number): string => {
  const safeSec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  if (h > 0) return `${h} س ${m} د`;
  return `${m} دقيقة`;
};

const formatStopwatch = (sec: number): string => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const formatClock = (isoDate?: string | null): string => {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

type StatusFilter = 'all' | 'active' | 'break_or_idle' | 'offline';

export const TeamLiveTab: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [timers, setTimers] = useState<TeamTimer[]>([]);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [, setTick] = useState(0);

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      setError(null);
      const [overviewRes, timersRes] = await Promise.all([
        window.electronAPI.getTeamOverview(),
        window.electronAPI.getCompanyActiveTimers(),
      ]);

      const activeTimersList: TeamTimer[] =
        timersRes?.success && Array.isArray(timersRes.activeTimers)
          ? timersRes.activeTimers
          : [];
      setTimers(activeTimersList);
      setFetchedAt(Date.now());

      const timersByUser = new Map<string, TeamTimer[]>();
      for (const t of activeTimersList) {
        const uId = String(t.userId || '');
        const uName = String(t.userName || '').trim().toLowerCase();
        if (uId) {
          if (!timersByUser.has(uId)) timersByUser.set(uId, []);
          timersByUser.get(uId)!.push(t);
        }
        if (uName) {
          if (!timersByUser.has(uName)) timersByUser.set(uName, []);
          timersByUser.get(uName)!.push(t);
        }
      }

      if (overviewRes?.success && Array.isArray(overviewRes.data)) {
        const mapped: TeamMember[] = overviewRes.data.map((item: any) => {
          const emp = item.employee || {};
          const empName =
            emp.firstName || emp.lastName
              ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
              : item.employeeName || 'عضو الفريق';

          const empId = String(item.employeeId || emp.id || '');
          const userId = String(emp.userId || '');
          const nameKey = empName.toLowerCase();

          const userTimers = [
            ...(timersByUser.get(empId) || []),
            ...(userId ? (timersByUser.get(userId) || []) : []),
            ...(timersByUser.get(nameKey) || []),
          ];
          const uniqueTimers = Array.from(new Map(userTimers.map((t) => [t.id, t])).values());

          const totalBreakSec = item.totalBreakSeconds || (item.totalBreakMinutes ? item.totalBreakMinutes * 60 : 0);
          const totalIdleSec = item.totalIdleSeconds || 0;
          const totalSleepSec =
            typeof item.totalSleepSeconds === 'number'
              ? item.totalSleepSeconds
              : Math.max(0, totalIdleSec - totalBreakSec);

          return {
            employeeId: empId,
            employeeName: empName,
            departmentName: emp.department?.name || item.departmentName || 'الإدارة العامة',
            jobTitle: emp.position?.title || item.jobTitle || 'موظف',
            status: item.status || 'offline',
            breakReason: item.breakReason || null,
            isCurrentlyOnBreak: Boolean(item.isCurrentlyOnBreak),
            totalActiveSeconds: item.totalActiveSeconds || 0,
            totalIdleSeconds: totalIdleSec,
            totalBreaksCount: item.totalBreaksCount || 0,
            totalBreakSeconds: totalBreakSec,
            totalBreakMinutes: item.totalBreakMinutes || Math.round(totalBreakSec / 60),
            totalSleepSeconds: totalSleepSec,
            productivityScore: Math.round(item.productivityScore || 0),
            activityRatio: typeof item.activityRatio === 'number' ? item.activityRatio : undefined,
            clockInTime: item.clockInTime || null,
            clockOutTime: item.clockOutTime || null,
            deviceName: item.deviceName || null,
            lastSeenTime: item.lastSeenTime || null,
            activeTimers: uniqueTimers,
          };
        });

        setMembers(mapped);
      } else {
        setMembers([]);
      }
    } catch (err: any) {
      console.warn('[TeamLiveTab] load error:', err);
      setError('تعذر تحميل بيانات مراقبة الفريق — تحقق من الاتصال بالسيرفر.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  // Initial load + 8s polling
  useEffect(() => {
    loadData(true);
    const poll = setInterval(() => loadData(false), 8000);
    return () => clearInterval(poll);
  }, [loadData]);

  // 1-second interval for real-time timer stopwatch ticking
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const liveElapsed = (t: TeamTimer): number => {
    const base = Number(t.elapsedSeconds || 0);
    const startMs = t.startTime ? new Date(t.startTime).getTime() : fetchedAt;
    const drifted = Math.max(0, Math.floor((Date.now() - Math.max(startMs, fetchedAt)) / 1000));
    return base + drifted;
  };

  const stopTimer = async (entryId: string, userName: string) => {
    if (!window.confirm(`إيقاف مؤقت ${userName}؟`)) return;
    try {
      await window.electronAPI.stopTaskTimer(entryId);
      await loadData(false);
    } catch (err: any) {
      alert('تعذر إيقاف المؤقت: ' + err.message);
    }
  };

  // Metrics count
  const activeCount = members.filter((m) => m.status === 'active').length;
  const breakCount = members.filter((m) => m.status === 'break').length;
  const idleCount = members.filter((m) => m.status === 'idle').length;
  const breakOrIdleCount = breakCount + idleCount;
  const offlineCount = members.filter((m) => m.status === 'offline').length;

  const departments = Array.from(new Set(members.map((m) => m.departmentName).filter(Boolean)));

  const filteredMembers = members.filter((m) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      m.employeeName.toLowerCase().includes(query) ||
      m.jobTitle.toLowerCase().includes(query) ||
      m.departmentName.toLowerCase().includes(query) ||
      m.activeTimers.some((t) => t.taskTitle.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && m.status === 'active') ||
      (statusFilter === 'break_or_idle' && (m.status === 'break' || m.status === 'idle')) ||
      (statusFilter === 'offline' && m.status === 'offline');

    const matchesDept = departmentFilter === 'all' || m.departmentName === departmentFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  return (
    <div style={styles.container}>
      {/* Top Header & Telemetry Summary Strip */}
      <div style={styles.headerStrip}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.headerIconBox}>
            <Activity size={16} color="var(--accent-green)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={styles.headerTitle}>متابعة نشاط الفريق اللحظي (المكتب المباشر)</span>
              <span style={styles.livePulseBadge}>
                <span style={styles.pulseDot} />
                <span>{members.length} عضو مسجل</span>
              </span>
            </div>
            <div style={styles.headerSubtitle}>
              رؤية واضحة ومباشرة لمن هو قيد العمل، في استراحة رسمية، أو في وضع خمول وسكون
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => loadData(true)}
            disabled={loading}
            style={styles.refreshBtn}
            title="تحديث فوري"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>تحديث</span>
          </button>
        </div>
      </div>

      {/* KPI Counters Ribbon */}
      <div style={styles.kpiRibbon}>
        <div style={styles.kpiPill}>
          <Users size={13} color="var(--text-muted)" />
          <span>إجمالي الفريق:</span>
          <strong style={styles.tabularNum}>{members.length}</strong>
        </div>

        <div style={{ ...styles.kpiPill, borderColor: 'rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.08)' }}>
          <span style={styles.greenPulseDot} />
          <span style={{ color: 'var(--accent-green)' }}>نشط الآن:</span>
          <strong style={{ ...styles.tabularNum, color: 'var(--accent-green)' }}>{activeCount}</strong>
        </div>

        <div style={{ ...styles.kpiPill, borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.08)' }}>
          <Coffee size={13} color="#f59e0b" />
          <span style={{ color: '#f59e0b' }}>في استراحة (بريك):</span>
          <strong style={{ ...styles.tabularNum, color: '#f59e0b' }}>{breakCount}</strong>
        </div>

        <div style={{ ...styles.kpiPill, borderColor: 'rgba(234, 179, 8, 0.25)', background: 'rgba(234, 179, 8, 0.06)' }}>
          <PauseCircle size={13} color="#eab308" />
          <span style={{ color: '#eab308' }}>خامل (مفتوح):</span>
          <strong style={{ ...styles.tabularNum, color: '#eab308' }}>{idleCount}</strong>
        </div>

        <div style={{ ...styles.kpiPill, borderColor: 'var(--border-default)' }}>
          <XCircle size={13} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-muted)' }}>غير متصل:</span>
          <strong style={{ ...styles.tabularNum, color: 'var(--text-muted)' }}>{offlineCount}</strong>
        </div>

        <div style={{ ...styles.kpiPill, marginRight: 'auto', borderColor: 'rgba(56, 189, 248, 0.25)', background: 'rgba(56, 189, 248, 0.06)' }}>
          <Timer size={13} color="var(--accent-blue)" />
          <span style={{ color: 'var(--accent-blue)' }}>المؤقتات الجارية:</span>
          <strong style={{ ...styles.tabularNum, color: 'var(--accent-blue)' }}>{timers.length}</strong>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div style={styles.controlBar}>
        <div style={styles.filterButtonGroup}>
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              ...styles.filterBtn,
              ...(statusFilter === 'all' ? styles.filterBtnActive : {}),
            }}
          >
            الكل ({members.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            style={{
              ...styles.filterBtn,
              ...(statusFilter === 'active' ? styles.filterBtnActiveGreen : {}),
            }}
          >
            نشط الآن ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('break_or_idle')}
            style={{
              ...styles.filterBtn,
              ...(statusFilter === 'break_or_idle' ? styles.filterBtnActiveAmber : {}),
            }}
          >
            استراحة / خمول ({breakOrIdleCount})
          </button>
          <button
            onClick={() => setStatusFilter('offline')}
            style={{
              ...styles.filterBtn,
              ...(statusFilter === 'offline' ? styles.filterBtnActiveMuted : {}),
            }}
          >
            غير متصل ({offlineCount})
          </button>
        </div>

        {departments.length > 1 && (
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={styles.deptSelect}
          >
            <option value="all">كافة الأقسام</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}

        <div style={styles.searchBox}>
          <Search size={13} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالموظف، القسم، أو المهمة…"
            style={styles.searchInput}
          />
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Main Members Grid */}
      <div style={styles.contentArea}>
        {loading && members.length === 0 ? (
          <div style={styles.emptyState}>جاري جلب بيانات وحالات أعضاء الفريق المباشرة…</div>
        ) : filteredMembers.length === 0 ? (
          <div style={styles.emptyState}>
            لا يوجد أعضاء يطابقون معايير التصفية والبحث الحالية.
          </div>
        ) : (
          <div style={styles.memberGrid}>
            {filteredMembers.map((m) => {
              const hue = [258, 152, 12, 200, 330, 45, 96, 175, 285, 30][
                (m.employeeName.length + m.employeeName.charCodeAt(0)) % 10
              ];
              const initials = m.employeeName.trim().slice(0, 2).toUpperCase();

              return (
                <div key={m.employeeId} style={styles.card}>
                  {/* Card Header: Identity & Status Badge */}
                  <div style={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <span style={{ ...styles.avatar, background: `hsl(${hue} 42% 45%)` }}>
                        {initials}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.memberName} title={m.employeeName}>
                          {m.employeeName}
                        </div>
                        <div style={styles.memberMeta}>
                          {m.departmentName} • {m.jobTitle}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div style={{ flexShrink: 0 }}>
                      {m.status === 'active' && (
                        <span style={styles.statusBadgeActive}>
                          <CheckCircle2 size={12} />
                          <span>نشط الآن</span>
                        </span>
                      )}
                      {m.status === 'break' && (
                        <span style={styles.statusBadgeBreak} title={m.breakReason || 'استراحة رسمية'}>
                          <Coffee size={12} />
                          <span>استراحة: {m.breakReason || 'رسمية'}</span>
                        </span>
                      )}
                      {m.status === 'idle' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={styles.statusBadgeIdle} title="الجهاز في وضع السكون بدون حركة">
                            <PauseCircle size={12} />
                            <span>خامل (مفتوح)</span>
                          </span>
                          {m.deviceName && (
                            <span style={styles.deviceMeta}>{m.deviceName}</span>
                          )}
                        </div>
                      )}
                      {m.status === 'offline' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={styles.statusBadgeOffline}>
                            <XCircle size={12} />
                            <span>غير متصل</span>
                          </span>
                          {m.lastSeenTime && (
                            <span style={styles.deviceMeta}>
                              آخر ظهور: {formatClock(m.lastSeenTime)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Breakdown: Active Time, Breaks & Sleep */}
                  <div style={styles.telemetryGrid}>
                    <div style={styles.telemetryCol}>
                      <span style={styles.telemetryLabel}>العمل النشط:</span>
                      <strong style={{ ...styles.tabularNum, color: 'var(--text-primary)' }}>
                        {formatDuration(m.totalActiveSeconds)}
                      </strong>
                    </div>

                    <div style={styles.telemetryCol}>
                      <span style={styles.telemetryLabel}>التوقف والخمول:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <strong style={{ ...styles.tabularNum, color: m.totalIdleSeconds > 3600 ? '#f59e0b' : 'var(--text-primary)' }}>
                          {formatDuration(m.totalIdleSeconds)}
                        </strong>
                        <div style={styles.breakdownSubtext}>
                          {m.totalBreakSeconds && m.totalBreakSeconds > 0 ? (
                            <span style={{ color: '#f59e0b' }}>
                              البريك: {formatDuration(m.totalBreakSeconds)} ({m.totalBreaksCount || 1} بريك)
                            </span>
                          ) : null}
                          {m.totalSleepSeconds && m.totalSleepSeconds > 0 ? (
                            <span style={{ color: 'var(--text-muted)' }}>
                              سكون: {formatDuration(m.totalSleepSeconds)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div style={styles.telemetryCol}>
                      <span style={styles.telemetryLabel}>حضور اليوم:</span>
                      <span style={styles.tabularNum}>
                        {m.clockInTime ? formatClock(m.clockInTime) : 'لم يسجل'}
                      </span>
                    </div>

                    <div style={styles.telemetryCol}>
                      <span style={styles.telemetryLabel}>الإنتاجية:</span>
                      <span style={{ ...styles.tabularNum, fontWeight: 700, color: m.productivityScore >= 70 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                        {m.productivityScore}%
                      </span>
                    </div>
                  </div>

                  {/* Active Running Task Timer (if any) */}
                  {m.activeTimers.length > 0 ? (
                    <div style={styles.activeTaskSection}>
                      {m.activeTimers.map((t) => (
                        <div key={t.id} style={styles.timerRow}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={styles.timerTitle} title={t.taskTitle}>
                              {t.taskTitle}
                            </div>
                            {t.projectName && <div style={styles.timerProject}>{t.projectName}</div>}
                          </div>
                          <span style={styles.elapsed} title="الوقت المنقضي على المهمة">
                            <Clock size={11} color="var(--accent-green)" />
                            {formatStopwatch(liveElapsed(t))}
                          </span>
                          <button
                            onClick={() => stopTimer(t.id, m.employeeName)}
                            style={styles.stopBtn}
                            title={`إيقاف مؤقت ${m.employeeName}`}
                          >
                            <Pause size={10} />
                            <span>إيقاف</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.noActiveTaskNotice}>
                      <Briefcase size={12} color="var(--text-muted)" />
                      <span>لا توجد مهمة قيد التوقيت المباشر حالياً</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '10px 14px',
    overflowY: 'auto',
  },
  headerStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottom: '1px solid var(--border-default)',
    flexShrink: 0,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(34, 197, 94, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  livePulseBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    borderRadius: 12,
    padding: '2px 8px',
    fontSize: 10.5,
    fontWeight: 700,
    color: 'var(--accent-green)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-green)',
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    padding: '5px 10px',
    cursor: 'pointer',
    transition: 'all 140ms ease-out',
  },
  kpiRibbon: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  kpiPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '4px 10px',
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  tabularNum: {
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 700,
  },
  controlBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  filterButtonGroup: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  filterBtn: {
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 120ms ease-out',
  },
  filterBtnActive: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontWeight: 700,
  },
  filterBtnActiveGreen: {
    background: 'rgba(34, 197, 94, 0.15)',
    color: 'var(--accent-green)',
    fontWeight: 700,
  },
  filterBtnActiveAmber: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
    fontWeight: 700,
  },
  filterBtnActiveMuted: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    fontWeight: 700,
  },
  deptSelect: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 11,
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
  },
  searchBox: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '4px 10px',
    width: 220,
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 11,
    color: 'var(--text-primary)',
    width: '100%',
  },
  errorBox: {
    backgroundColor: 'var(--accent-yellow-bg)',
    border: '1px solid var(--accent-yellow-border)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 11.5,
    color: 'var(--text-primary)',
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
  },
  emptyState: {
    border: '1px dashed var(--border-default)',
    borderRadius: 10,
    padding: 30,
    fontSize: 12,
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  memberGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: 10,
    alignItems: 'start',
  },
  card: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    transition: 'border-color 140ms ease-out',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 8,
    borderBottom: '1px solid var(--border-subtle)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberName: {
    fontSize: 12.5,
    fontWeight: 700,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  memberMeta: {
    fontSize: 10,
    color: 'var(--text-muted)',
    marginTop: 1,
  },
  statusBadgeActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 10,
    padding: '2px 8px',
    fontSize: 10.5,
    fontWeight: 700,
    color: 'var(--accent-green)',
  },
  statusBadgeBreak: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    borderRadius: 10,
    padding: '2px 8px',
    fontSize: 10.5,
    fontWeight: 700,
    color: '#f59e0b',
  },
  statusBadgeIdle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(234, 179, 8, 0.12)',
    border: '1px solid rgba(234, 179, 8, 0.3)',
    borderRadius: 10,
    padding: '2px 8px',
    fontSize: 10.5,
    fontWeight: 700,
    color: '#eab308',
  },
  statusBadgeOffline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    padding: '2px 8px',
    fontSize: 10.5,
    fontWeight: 500,
    color: 'var(--text-muted)',
  },
  deviceMeta: {
    fontSize: 9.5,
    color: 'var(--text-dim)',
    fontVariantNumeric: 'tabular-nums',
  },
  telemetryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
    background: 'var(--bg-elevated)',
    borderRadius: 8,
    padding: '7px 10px',
  },
  telemetryCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    fontSize: 10.5,
  },
  telemetryLabel: {
    fontSize: 9.5,
    color: 'var(--text-muted)',
  },
  breakdownSubtext: {
    fontSize: 9.5,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  activeTaskSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  timerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '6px 10px',
  },
  timerTitle: {
    fontSize: 11.5,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  timerProject: {
    fontSize: 9.5,
    color: 'var(--text-muted)',
  },
  elapsed: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11.5,
    fontWeight: 700,
    color: 'var(--accent-green)',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },
  stopBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'var(--accent-red-bg)',
    border: '1px solid var(--accent-red-border)',
    color: 'var(--accent-red)',
    borderRadius: 5,
    padding: '2px 7px',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  noActiveTaskNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10.5,
    color: 'var(--text-muted)',
    padding: '2px 4px',
  },
};

export default TeamLiveTab;
