import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Clock, Timer as TimerIcon, Layers, RefreshCw, Search } from 'lucide-react';
import { audioAlerts } from '../utils/audioAlerts';

interface RunningTimer {
  id: string;
  taskId: string;
  task?: { title?: string; priority?: string };
  title?: string;
  priority?: string;
  startTime?: string;
  elapsedSeconds?: number;
  accumulatedSeconds?: number;
}

/**
 * Dedicated timers screen — the two-layer time model:
 * each task keeps its own timer (parallel allowed, per-task cost),
 * while real human time is measured separately by attendance
 * (first → last activity), never by summing parallel timers.
 */
export const TimersTab: React.FC = () => {
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ticking, setTicking] = useState(0);

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      setError(null);
      const [timersRes, tasksRes] = await Promise.all([
        window.electronAPI.getRunningTaskTimer().catch(() => null),
        window.electronAPI.getTasks('my-tasks').catch(() => null),
      ]);
      const raw: RunningTimer[] = Array.isArray(timersRes?.runningTimers)
        ? timersRes.runningTimers
        : timersRes?.runningTimer
        ? [timersRes.runningTimer]
        : [];
      setTimers(raw);
      setFetchedAt(Date.now());
      if (tasksRes?.success && Array.isArray(tasksRes.tasks)) {
        setTasks(tasksRes.tasks);
      }
    } catch (err) {
      console.warn('[TimersTab] load error:', err);
      setError('تعذر تحميل المؤقتات — تحقق من الاتصال بالسيرفر.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    const poll = setInterval(() => loadData(false), 10_000);
    return () => clearInterval(poll);
  }, [loadData]);

  // Local 1s ticker so seconds move without hammering the server
  useEffect(() => {
    const t = setInterval(() => setTicking((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const liveElapsed = (t: RunningTimer): number => {
    const base = Number(t.elapsedSeconds || t.accumulatedSeconds || 0);
    const startMs = t.startTime ? new Date(t.startTime).getTime() : fetchedAt;
    const drifted = Math.max(0, Math.floor((Date.now() - Math.max(startMs, fetchedAt)) / 1000));
    return base + drifted;
  };

  const fmt = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const stopTimer = async (entryId: string) => {
    try {
      audioAlerts.playTaskStart();
      await window.electronAPI.stopTaskTimer(entryId);
      await loadData(false);
    } catch (err: any) {
      alert('تعذر إيقاف المؤقت: ' + err.message);
    }
  };

  const startTimer = async (taskId: string) => {
    try {
      audioAlerts.playTaskStart();
      await window.electronAPI.startTaskTimer(taskId);
      await loadData(false);
    } catch (err: any) {
      alert('تعذر بدء المؤقت: ' + err.message);
    }
  };

  const runningIds = new Set(timers.map((t) => t.taskId));
  const parallelCount = timers.length;
  const available = tasks
    .filter((t) => String(t.status || '').toUpperCase() !== 'COMPLETED' && !runningIds.has(t.id))
    .filter((t) =>
      !searchQuery.trim() ||
      String(t.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div style={styles.container}>
      {/* Model explainer strip */}
      <div style={styles.modelStrip}>
        <TimerIcon size={13} color="var(--accent-blue)" />
        <span>
          نموذج الطبقتين: كل مهمة ليها مؤقت مستقل (يُحسب زمن المهمة حتى لو اشتغل متوازي) — والوقت الفعلي بيحسب من
          نشاطك الحقيقي، مش من مجموع المؤقتات.
        </span>
      </div>

      {error && (
        <div style={styles.errorBox}>{error}</div>
      )}

      {/* Running timers */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>مؤقتاتي الشغالة الآن</span>
          <span style={styles.countBadge}>
            {parallelCount} {parallelCount === 1 ? 'مؤقت' : 'مؤقتات'}
          </span>
          {parallelCount > 1 && (
            <span style={styles.parallelBadge} title="أكثر من مؤقت شغال في نفس الوقت — الزمن بيتحسب لكل مهمة على حدة، والوقت الفعلي مش بيتضاعف">
              <Layers size={11} />
              <span>شغل متوازٍ</span>
            </span>
          )}
          <button onClick={() => loadData(true)} style={styles.refreshBtn} title="تحديث">
            <RefreshCw size={12} />
          </button>
        </div>

        {loading && timers.length === 0 ? (
          <div style={styles.emptyBox}>جاري جلب المؤقتات…</div>
        ) : timers.length === 0 ? (
          <div style={styles.emptyBox}>مفيش مؤقتات شغالة — ابدأ واحدة من القائمة تحت.</div>
        ) : (
          <div style={styles.timerList}>
            {timers.map((t) => {
              const elapsed = liveElapsed(t);
              const prior = Number(t.accumulatedSeconds || 0);
              const isResumed = prior > 60;
              const title = t.task?.title || t.title || 'مهمة جارية';
              const priority = String(t.task?.priority || t.priority || 'MEDIUM').toUpperCase();
              const isUrgent = priority === 'URGENT';
              const isHigh = priority === 'HIGH';
              return (
                <div key={t.id || t.taskId} style={styles.timerCard}>
                  <div style={styles.timerMain}>
                    <span style={styles.liveDot} />
                    <span style={styles.timerTitle} title={title}>{title}</span>
                    {isResumed && (
                      <span style={styles.resumeBadge} title={`كانت شغالة قبل كده — الزمن بيكمّل من ${(prior / 3600).toFixed(1)} ساعة`}>
                        تكملة من {fmt(prior)}
                      </span>
                    )}
                    {isUrgent && <span style={styles.urgentMini}>عاجل</span>}
                    {!isUrgent && isHigh && <span style={styles.highMini}>مرتفع</span>}
                  </div>
                  <div style={styles.timerSide}>
                    <span style={styles.elapsed} title="زمن هذه الجلسة + السابقة لهذه المهمة">
                      <Clock size={13} color="var(--accent-blue)" />
                      {fmt(elapsed)}
                    </span>
                    <button onClick={() => stopTimer(t.id)} style={styles.stopBtn} title="إيقاف مؤقت المهمة">
                      <Pause size={12} />
                      <span>إيقاف</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Start new timer */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>ابدأ مؤقت جديد</span>
          <div style={styles.searchWrap}>
            <Search size={12} color="var(--text-muted)" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في مهامك…"
              style={styles.searchInput}
            />
          </div>
        </div>

        {available.length === 0 ? (
          <div style={styles.emptyBox}>
            {searchQuery ? 'لا نتائج مطابقة للبحث.' : 'كل مهامك إما شغالة أو مكتملة 🎯'}
          </div>
        ) : (
          <div style={styles.taskList}>
            {available.slice(0, 30).map((t) => {
              const priority = String(t.priority || '').toUpperCase();
              const isUrgent = priority === 'URGENT';
              const isHigh = priority === 'HIGH';
              return (
                <div key={t.id} style={styles.taskRow}>
                  <span style={styles.taskRowTitle} title={t.title}>{t.title}</span>
                  {isUrgent && <span style={styles.urgentMini}>عاجل</span>}
                  {!isUrgent && isHigh && <span style={styles.highMini}>مرتفع</span>}
                  <button onClick={() => startTimer(t.id)} style={styles.startBtn} title="تشغيل مؤقت هذه المهمة (يمكن تشغيل أكثر من مهمة متوازية)">
                    <Play size={11} fill="currentColor" />
                    <span>تشغيل</span>
                  </button>
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
    gap: 12,
    padding: '12px 16px',
    overflowY: 'auto',
  },
  modelStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'var(--accent-blue-bg)',
    border: '1px solid var(--accent-blue-border)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 11.5,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  errorBox: {
    backgroundColor: 'var(--accent-yellow-bg)',
    border: '1px solid var(--accent-yellow-border)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    color: 'var(--text-primary)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  countBadge: {
    fontSize: 10.5,
    fontWeight: 700,
    color: 'var(--accent-blue)',
    backgroundColor: 'var(--accent-blue-bg)',
    borderRadius: 10,
    padding: '2px 8px',
    fontVariantNumeric: 'tabular-nums',
  },
  parallelBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10.5,
    fontWeight: 600,
    color: 'var(--accent-purple)',
    backgroundColor: 'var(--accent-purple-bg, rgba(168,85,247,0.12))',
    border: '1px solid rgba(168,85,247,0.3)',
    borderRadius: 10,
    padding: '2px 8px',
  },
  refreshBtn: {
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    background: 'transparent',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    color: 'var(--text-muted)',
    padding: '4px 7px',
    cursor: 'pointer',
  },
  emptyBox: {
    border: '1px dashed var(--border-default)',
    borderRadius: 8,
    padding: 18,
    fontSize: 12,
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  timerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  timerCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--accent-blue-border)',
    borderRadius: 10,
    padding: '10px 14px',
  },
  timerMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 0 6px var(--accent-green-dim)',
    flexShrink: 0,
  },
  timerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  resumeBadge: {
    flexShrink: 0,
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--accent-blue)',
    backgroundColor: 'var(--accent-blue-bg)',
    borderRadius: 6,
    padding: '2px 7px',
    whiteSpace: 'nowrap',
  },
  urgentMini: {
    flexShrink: 0,
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--accent-red)',
    backgroundColor: 'var(--accent-red-bg)',
    borderRadius: 6,
    padding: '2px 7px',
  },
  highMini: {
    flexShrink: 0,
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--accent-yellow)',
    backgroundColor: 'var(--accent-yellow-bg)',
    borderRadius: 6,
    padding: '2px 7px',
  },
  timerSide: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  elapsed: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.02em',
  },
  stopBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'var(--accent-red-bg)',
    border: '1px solid var(--accent-red-border)',
    color: 'var(--accent-red)',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  taskRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 14px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  taskRowTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 12.5,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  startBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    color: 'var(--accent-green)',
    borderRadius: 6,
    padding: '5px 11px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  searchWrap: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '5px 10px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: 11.5,
    width: 180,
    fontFamily: 'inherit',
  },
};

export default TimersTab;
