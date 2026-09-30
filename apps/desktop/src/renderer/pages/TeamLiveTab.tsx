import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Pause, RefreshCw } from 'lucide-react';

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

const fmt = (sec: number): string => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

/** Screen: أعضاء الفريق قيد العمل المباشر — full-page live team timers. */
export const TeamLiveTab: React.FC = () => {
  const [timers, setTimers] = useState<TeamTimer[]>([]);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      setError(null);
      const res = await window.electronAPI.getCompanyActiveTimers();
      if (res?.success && Array.isArray(res.activeTimers)) {
        setTimers(res.activeTimers);
        setFetchedAt(Date.now());
      } else {
        setTimers([]);
      }
    } catch (err) {
      console.warn('[TeamLiveTab] load error:', err);
      setError('تعذر تحميل مؤقتات الفريق — تحقق من الاتصال بالسيرفر.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    const poll = setInterval(() => loadData(false), 10_000);
    return () => clearInterval(poll);
  }, [loadData]);

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

  const byUser = new Map<string, TeamTimer[]>();
  for (const t of timers) {
    const key = t.userName || 'غير معروف';
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key)!.push(t);
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.liveDot} />
        <span style={styles.title}>أعضاء الفريق قيد العمل المباشر الآن</span>
        <span style={styles.countBadge}>
          {byUser.size} {byUser.size === 1 ? 'عضو' : 'أعضاء'} · {timers.length} مؤقت
        </span>
        <button onClick={() => loadData(true)} style={styles.refreshBtn} title="تحديث">
          <RefreshCw size={12} />
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading && timers.length === 0 ? (
        <div style={styles.emptyBox}>جاري جلب مؤقتات الفريق…</div>
      ) : timers.length === 0 ? (
        <div style={styles.emptyBox}>مفيش أحد من الفريق شغال مؤقتًا في هذه اللحظة.</div>
      ) : (
        <div style={styles.userGrid}>
          {[...byUser.entries()].map(([userName, userTimers]) => {
            const first = userTimers[0];
            const hue = [258, 152, 12, 200, 330, 45, 96, 175, 285, 30][(userName.length + userName.charCodeAt(0)) % 10];
            return (
              <div key={userName} style={styles.userCard}>
                <div style={styles.userHeader}>
                  <span style={{ ...styles.avatar, background: `hsl(${hue} 42% 45%)` }}>
                    {userName.trim().slice(0, 2).toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.userName} title={userName}>{userName}</div>
                    <div style={styles.userMeta}>{first.userJobTitle || first.userDepartment || 'عضو الفريق'}</div>
                  </div>
                </div>
                <div style={styles.timerList}>
                  {userTimers.map((t) => (
                    <div key={t.id} style={styles.timerRow}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={styles.timerTitle} title={t.taskTitle}>{t.taskTitle}</div>
                        {t.projectName && <div style={styles.timerProject}>{t.projectName}</div>}
                      </div>
                      <span style={styles.elapsed} title="زمن المهمة الحالي">
                        <Clock size={11} color="var(--accent-green)" />
                        {fmt(liveElapsed(t))}
                      </span>
                      <button
                        onClick={() => stopTimer(t.id, userName)}
                        style={styles.stopBtn}
                        title={`إيقاف مؤقت ${userName} على هذه المهمة`}
                      >
                        <Pause size={10} />
                        <span>إيقاف</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '12px 16px',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 0 8px var(--accent-green-dim)',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  countBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--accent-green)',
    backgroundColor: 'var(--accent-green-bg)',
    borderRadius: 10,
    padding: '2px 9px',
    fontVariantNumeric: 'tabular-nums',
  },
  refreshBtn: {
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    background: 'transparent',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    color: 'var(--text-muted)',
    padding: '5px 8px',
    cursor: 'pointer',
  },
  errorBox: {
    backgroundColor: 'var(--accent-yellow-bg)',
    border: '1px solid var(--accent-yellow-border)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    color: 'var(--text-primary)',
  },
  emptyBox: {
    border: '1px dashed var(--border-default)',
    borderRadius: 10,
    padding: 24,
    fontSize: 12.5,
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  userGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 12,
    alignItems: 'start',
  },
  userCard: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  userHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    borderBottom: '1px solid var(--border-subtle)',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userName: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userMeta: {
    fontSize: 10.5,
    color: 'var(--text-muted)',
  },
  timerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  timerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'var(--bg-elevated)',
    borderRadius: 8,
    padding: '7px 10px',
  },
  timerTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  timerProject: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  elapsed: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12.5,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },
  stopBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'var(--accent-red-bg)',
    border: '1px solid var(--accent-red-border)',
    color: 'var(--accent-red)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 10.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
};

export default TeamLiveTab;
