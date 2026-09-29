import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Clock,
  User,
  Layers,
  Search,
  RefreshCw,
  ExternalLink,
  Shield,
  Copy,
  Check,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { audioAlerts } from '../utils/audioAlerts';

interface TeamActiveTimer {
  id: string;
  taskId: string;
  taskTitle: string;
  priority: string;
  taskStatus: string;
  projectId?: string;
  projectName?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userJobTitle?: string;
  userDepartment?: string;
  startTime: string;
  elapsedSeconds: number;
}

export const LiveTeamTimersTab: React.FC = () => {
  const [activeTimers, setActiveTimers] = useState<TeamActiveTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadActiveTimers = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await window.electronAPI.getCompanyActiveTimers();
      if (res?.success && Array.isArray(res.activeTimers)) {
        setActiveTimers(res.activeTimers);
      } else {
        setActiveTimers([]);
      }
    } catch (err) {
      console.warn('[LiveTeamTimersTab] Error loading active timers:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  // Initial load + 4s polling for live activity updates
  useEffect(() => {
    loadActiveTimers(true);
    const interval = setInterval(() => {
      loadActiveTimers(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [loadActiveTimers]);

  // Real-time ticking stopwatch for all active timers
  useEffect(() => {
    if (activeTimers.length === 0) return;
    const interval = setInterval(() => {
      setActiveTimers((prev) =>
        prev.map((item) => ({
          ...item,
          elapsedSeconds: item.elapsedSeconds + 1,
        }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimers.length]);

  const formatTimer = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const handleCopyTitle = (taskId: string, title: string) => {
    navigator.clipboard.writeText(title);
    setCopiedId(taskId);
    audioAlerts.playTaskComplete();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const departments = Array.from(
    new Set(activeTimers.map((t) => t.userDepartment || 'فريق العمل').filter(Boolean))
  );

  const filteredTimers = activeTimers.filter((timer) => {
    const matchesSearch =
      timer.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      timer.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (timer.projectName && timer.projectName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept =
      departmentFilter === 'ALL' || (timer.userDepartment || 'فريق العمل') === departmentFilter;

    return matchesSearch && matchesDept;
  });

  return (
    <div style={styles.container}>
      {/* Top Header & Telemetry Strip */}
      <div style={styles.headerStrip}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.headerIconBox}>
            <Activity size={16} color="var(--accent-green)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={styles.headerTitle}>المهام الجارية الآن (نشاط الفريق المباشر)</span>
              <span style={styles.livePulseBadge}>
                <span style={styles.pulseDot} />
                <span>{activeTimers.length} {activeTimers.length === 1 ? 'مهمة نشطة' : 'مهام نشطة'}</span>
              </span>
            </div>
            <div style={styles.headerSubtitle}>
              لوحة قيادة حية لمتابعة الزملاء والمؤقتات المفتوحة في الشركة لحظة بلحظة
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => loadActiveTimers(true)}
            disabled={loading}
            style={styles.refreshBtn}
            title="تحديث فوري"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Department Filter */}
      <div style={styles.controlBar}>
        <div style={styles.searchBox}>
          <Search size={13} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المهمة، الزميل، أو المشروع…"
            style={styles.searchInput}
          />
        </div>

        {departments.length > 0 && (
          <div style={styles.deptFilterGroup}>
            <button
              onClick={() => setDepartmentFilter('ALL')}
              style={{
                ...styles.deptBtn,
                backgroundColor: departmentFilter === 'ALL' ? 'var(--bg-elevated)' : 'transparent',
                color: departmentFilter === 'ALL' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: departmentFilter === 'ALL' ? 600 : 400,
              }}
            >
              الكل ({activeTimers.length})
            </button>
            {departments.map((dept) => {
              const count = activeTimers.filter((t) => (t.userDepartment || 'فريق العمل') === dept).length;
              return (
                <button
                  key={dept}
                  onClick={() => setDepartmentFilter(dept)}
                  style={{
                    ...styles.deptBtn,
                    backgroundColor: departmentFilter === dept ? 'var(--bg-elevated)' : 'transparent',
                    color: departmentFilter === dept ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: departmentFilter === dept ? 600 : 400,
                  }}
                >
                  {dept} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Timers Grid / Chassis */}
      <div style={styles.contentArea}>
        {loading && activeTimers.length === 0 ? (
          <div style={styles.emptyState}>جاري جلب مؤقتات الفريق النشطة من السيرفر السحابي…</div>
        ) : filteredTimers.length === 0 ? (
          <div style={styles.emptyState}>
            {activeTimers.length === 0 ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  لا توجد مهام جارية حالياً من قبل الفريق
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  ستظهر أي مهمة هنا مباشرة بمجرد أن يضغط أي زميل زر "بدء العمل" على مهمته.
                </div>
              </div>
            ) : (
              <div>لا توجد نتائج تطابق معايير البحث الحالية.</div>
            )}
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredTimers.map((timer) => {
              const isUrgent = String(timer.priority || '').toUpperCase() === 'URGENT';
              const isHigh = String(timer.priority || '').toUpperCase() === 'HIGH';

              return (
                <div key={timer.id} style={styles.card}>
                  {/* Card Header: Member Info & Live Timer */}
                  <div style={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      {timer.userAvatar ? (
                        <img src={timer.userAvatar} alt="" style={styles.avatarImg} />
                      ) : (
                        <div style={styles.avatarPlaceholder}>
                          <User size={13} color="var(--text-muted)" />
                        </div>
                      )}
                      <div>
                        <div style={styles.userName}>{timer.userName}</div>
                        <div style={styles.userMeta}>
                          {timer.userJobTitle} • {timer.userDepartment || 'فريق العمل'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        ...styles.timerChip,
                        backgroundColor: timer.elapsedSeconds > 4 * 3600 ? 'rgba(245, 158, 11, 0.12)' : styles.timerChip.backgroundColor,
                        borderColor: timer.elapsedSeconds > 4 * 3600 ? 'rgba(245, 158, 11, 0.35)' : styles.timerChip.borderColor,
                      }}
                      title={timer.elapsedSeconds > 4 * 3600 ? 'تنبيه: وقت العمل تجاوز 4 ساعات متواصلة (احتمال خمول أو نسيان)' : 'مؤقت مباشر'}
                    >
                      <Clock size={11} color={timer.elapsedSeconds > 4 * 3600 ? 'var(--accent-yellow)' : 'var(--accent-green)'} />
                      <span
                        style={{
                          ...styles.timerDigits,
                          color: timer.elapsedSeconds > 4 * 3600 ? 'var(--accent-yellow)' : styles.timerDigits.color,
                        }}
                      >
                        {formatTimer(timer.elapsedSeconds)} {timer.elapsedSeconds > 4 * 3600 ? '⚠️' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Task Title & Project */}
                  <div style={styles.cardBody}>
                    <div style={styles.taskTitleRow}>
                      <span style={styles.taskTitle}>{timer.taskTitle}</span>
                      <button
                        onClick={() => handleCopyTitle(timer.taskId, timer.taskTitle)}
                        style={styles.copyBtn}
                        title="نسخ اسم المهمة"
                      >
                        {copiedId === timer.taskId ? <Check size={11} color="var(--accent-green)" /> : <Copy size={11} />}
                      </button>
                    </div>

                    <div style={styles.metaRow}>
                      {timer.projectName && (
                        <span style={styles.projectBadge}>
                          <Layers size={10} />
                          <span>{timer.projectName}</span>
                        </span>
                      )}

                      <span
                        style={{
                          ...styles.priorityBadge,
                          color: isUrgent ? 'var(--accent-red)' : isHigh ? 'var(--accent-yellow)' : 'var(--text-muted)',
                          borderColor: isUrgent ? 'rgba(239,68,68,0.3)' : isHigh ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)',
                        }}
                      >
                        {isUrgent && <Flame size={10} color="var(--accent-red)" />}
                        <span>{timer.priority}</span>
                      </span>

                      <span style={styles.runningStatusChip}>قيد التنفيذ المباشر</span>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`هل تريد إيقاف المؤقت للموظف (${timer.userName})؟`)) {
                            try {
                              await window.electronAPI.stopTaskTimer(timer.id);
                              loadActiveTimers(false);
                            } catch (err: any) {
                              alert('تعذر إيقاف المؤقت: ' + err.message);
                            }
                          }
                        }}
                        style={{
                          marginRight: 'auto',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: 'var(--accent-red)',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          cursor: 'pointer',
                        }}
                        title="إيقاف المؤقت إدارياً"
                      >
                        إيقاف المؤقت
                      </button>
                    </div>
                  </div>
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
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-surface)',
  },
  headerStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-surface)',
    flexShrink: 0,
  },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.25)',
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
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 1,
  },
  livePulseBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '2px 8px',
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.3)',
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--accent-green)',
    fontVariantNumeric: 'tabular-nums',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 0 8px var(--accent-green)',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  controlBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 16px',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-surface)',
    flexShrink: 0,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '4px 10px',
    width: 280,
  },
  searchInput: {
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 11,
    outline: 'none',
    width: '100%',
  },
  deptFilterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'var(--bg-subtle)',
    padding: 2,
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
  },
  deptBtn: {
    border: 'none',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 10,
    cursor: 'pointer',
    transition: 'all 120ms ease-out',
  },
  contentArea: {
    flex: 1,
    overflowY: 'auto',
    padding: 14,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 12,
  },
  card: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    transition: 'all 140ms ease-out',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: 8,
  },
  avatarImg: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: 'var(--bg-subtle)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  userMeta: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  timerChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.25)',
    padding: '3px 8px',
    borderRadius: 6,
  },
  timerDigits: {
    fontSize: 12,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--accent-green)',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  taskTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  taskTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.4,
  },
  copyBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  projectBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-subtle)',
    border: '1px solid var(--border-subtle)',
    padding: '2px 6px',
    borderRadius: 4,
  },
  priorityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 9,
    fontWeight: 700,
    border: '1px solid',
    padding: '2px 5px',
    borderRadius: 4,
  },
  runningStatusChip: {
    fontSize: 9,
    fontWeight: 600,
    color: 'var(--accent-green)',
    backgroundColor: 'rgba(16,185,129,0.08)',
    padding: '2px 6px',
    borderRadius: 4,
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 16px',
    color: 'var(--text-muted)',
    fontSize: 12,
  },
};

export default LiveTeamTimersTab;
