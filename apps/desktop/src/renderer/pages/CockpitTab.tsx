import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  MousePointer,
  Keyboard,
  Clock,
  Coffee,
  AppWindow,
  ExternalLink,
  Activity,
  CheckCircle2,
  CheckSquare,
} from 'lucide-react';

interface CockpitTabProps {
  trackerState: any;
  dailySummary: any;
  formatTime: (sec: number) => string;
  onToggleBreak?: () => void;
  user?: any;
  isAdmin?: boolean;
}

export const CockpitTab: React.FC<CockpitTabProps> = ({
  trackerState,
  dailySummary,
  formatTime,
  onToggleBreak,
  user,
  isAdmin = false,
}) => {
  const [taskStats, setTaskStats] = useState<{ total: number; completed: number }>({
    total: 0,
    completed: 0,
  });

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await window.electronAPI.getTasks('my-tasks');
        if (res?.success && Array.isArray(res.tasks)) {
          const total = res.tasks.length;
          const completed = res.tasks.filter(
            (t: any) => String(t.status || '').toUpperCase() === 'COMPLETED'
          ).length;
          setTaskStats({ total, completed });
        }
      } catch {}
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 20_000);
    return () => clearInterval(interval);
  }, []);
  const activeSeconds = dailySummary?.total_active_seconds ?? 0;
  const idleSeconds = dailySummary?.total_idle_seconds ?? 0;
  const totalTracked = activeSeconds + idleSeconds;
  const activeRatio = totalTracked > 0 ? Math.round((activeSeconds / totalTracked) * 100) : 100;

  const mouseEvents = dailySummary?.total_mouse_events ?? 0;
  const keyboardEvents = dailySummary?.total_keyboard_events ?? 0;

  const currentApp = trackerState?.currentApp || 'سطح المكتب / مستكشف ويندوز';
  const currentUrl = trackerState?.currentUrl;
  const isPaused = trackerState?.isPaused ?? false;

  return (
    <div style={styles.container}>
      {/* Top Banner: Active or Break Mode */}
      {isPaused ? (
        <div style={styles.breakBanner}>
          <div style={styles.breakIconBox}>
            <Coffee size={18} color="#eab308" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.bannerTitleRow}>
              <span style={styles.breakTitle}>
                {trackerState?.breakReason ? `استراحة موثقة: ${trackerState.breakReason}` : 'أنت الآن في وضع الاستراحة الرسمية المعتمدة'}
              </span>
              <span style={styles.breakChip}>عداد التوقف موقوف</span>
            </div>
            <div style={styles.breakSubtext}>
              وقت الصلاة أو الغداء لا يُحتسب كخمول؛ يتم حفظ خصوصيتك حتى استئناف جلسة العمل.
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.enforcedBanner}>
          <div style={styles.bannerIconBox}>
            <ShieldCheck size={18} color="#22c55e" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.bannerTitleRow}>
              <span style={styles.bannerTitle}>جلسة العمل موثقة ونشطة في السحابة المركزية</span>
              <span style={styles.livePulseChip}>
                <span style={styles.pulsingDot} />
                <span>مباشر</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Live Telemetry */}
      <div style={styles.grid}>
        {/* Active Time Card */}
        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <div style={{ ...styles.iconBadge, color: 'var(--accent-green)', background: 'var(--accent-green-bg)' }}>
              <Clock size={15} />
            </div>
            <span style={styles.metricLabel}>وقت العمل الفعلي</span>
          </div>
          <div style={styles.metricValue}>{formatTime(activeSeconds)}</div>
          <div style={styles.metricSubtext}>
            <span>معدل النشاط المستمر</span>
          </div>
        </div>

        {/* Idle Time Card */}
        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <div style={{ ...styles.iconBadge, color: 'var(--accent-yellow)', background: 'var(--accent-yellow-bg)' }}>
              <Coffee size={15} />
            </div>
            <span style={styles.metricLabel}>وقت التوقف والراحة</span>
          </div>
          <div style={styles.metricValue}>{formatTime(idleSeconds)}</div>
          <div style={styles.metricSubtext}>
            <span>فترات الاستراحة أو الانتظار</span>
          </div>
        </div>

        {/* Card 3: Task Completion (Employee) vs Mouse Telemetry (Admin) */}
        {isAdmin ? (
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <div style={{ ...styles.iconBadge, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)' }}>
                <MousePointer size={15} />
              </div>
              <span style={styles.metricLabel}>تفاعل ونقرات الماوس</span>
            </div>
            <div style={styles.metricValue}>{mouseEvents.toLocaleString()}</div>
            <div style={styles.metricSubtext}>
              <span>إجمالي الحركات والنقرات اليوم</span>
            </div>
          </div>
        ) : (
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <div style={{ ...styles.iconBadge, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)' }}>
                <CheckSquare size={15} />
              </div>
              <span style={styles.metricLabel}>المهام المنجزة اليوم</span>
            </div>
            <div style={{ ...styles.metricValue, fontVariantNumeric: 'tabular-nums' }}>
              {taskStats.completed} / {taskStats.total}
            </div>
            <div style={styles.metricSubtext}>
              <span>
                {taskStats.total === 0
                  ? 'لا توجد مهام مسندة لليوم'
                  : taskStats.completed === taskStats.total
                  ? 'تم إنجاز كافة المهام بنجاح'
                  : `${taskStats.total - taskStats.completed} مهام متبقية قيد التنفيذ`}
              </span>
            </div>
          </div>
        )}

        {/* Card 4: Break Allowance (Employee) vs Keyboard Telemetry (Admin) */}
        {isAdmin ? (
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <div style={{ ...styles.iconBadge, color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)' }}>
                <Keyboard size={15} />
              </div>
              <span style={styles.metricLabel}>ضربات لوحة المفاتيح</span>
            </div>
            <div style={styles.metricValue}>{keyboardEvents.toLocaleString()}</div>
            <div style={styles.metricSubtext}>
              <span>إجمالي المدخلات الموثقة</span>
            </div>
          </div>
        ) : (
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <div style={{ ...styles.iconBadge, color: 'var(--accent-green)', background: 'var(--accent-green-bg)' }}>
                <ShieldCheck size={15} />
              </div>
              <span style={styles.metricLabel}>إجمالي المدخلات اليوم</span>
            </div>
            <div style={styles.metricValue}>{keyboardEvents.toLocaleString()}</div>
            <div style={styles.metricSubtext}>
              <span style={{ color: isPaused ? '#eab308' : '#a1a1aa' }}>
                {isPaused ? 'أنت في وضع استراحة معتمد الآن' : 'مدخلاتك الموثقة في السحابة'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ratio Bar */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={15} color="#38bdf8" />
            <span style={styles.sectionTitle}>مؤشر الإنتاجية التراكمي لليوم</span>
          </div>
          <span style={styles.ratioPercent}>{activeRatio}% نشط</span>
        </div>
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressBar,
              width: `${Math.min(100, Math.max(0, activeRatio))}%`,
            }}
          />
        </div>
      </div>

      {/* Current Focus Window */}
      <div style={styles.sectionBox}>
        <div style={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AppWindow size={15} color="#22c55e" />
            <span style={styles.sectionTitle}>التطبيق النشط حالياً</span>
          </div>
          <span style={styles.activePill}>
            <CheckCircle2 size={12} />
            قيد التسجيل
          </span>
        </div>

        <div style={styles.appRow}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={styles.currentAppName}>{currentApp}</div>
            {currentUrl && (
              <div style={styles.currentUrlRow}>
                <ExternalLink size={12} color="#71717a" />
                <span style={styles.currentUrlText}>
                  {isAdmin ? currentUrl : (() => {
                    try {
                      return new URL(currentUrl).hostname;
                    } catch {
                      return currentUrl.split('?')[0].split('#')[0];
                    }
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  breakBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(234, 179, 8, 0.08)',
    border: '1px solid var(--accent-yellow-border)',
    borderRadius: 10,
    padding: '12px 14px',
  },
  breakIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'rgba(234, 179, 8, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#fbbf24',
  },
  breakChip: {
    background: 'rgba(234, 179, 8, 0.2)',
    border: '1px solid rgba(234, 179, 8, 0.4)',
    borderRadius: 20,
    padding: '2px 8px',
    fontSize: 10,
    color: '#fbbf24',
    fontWeight: 600,
  },
  breakSubtext: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    marginTop: 4,
    lineHeight: 1.4,
  },
  enforcedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--accent-green-bg)',
    border: '1px solid rgba(34, 197, 94, 0.18)',
    borderRadius: 10,
    padding: '10px 14px',
  },
  bannerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'var(--accent-green-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  livePulseChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 20,
    padding: '2px 8px',
    fontSize: 11,
    color: 'var(--accent-green)',
    fontWeight: 600,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent-green)',
    boxShadow: '0 0 8px var(--accent-green-dim)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  metricCard: {
    background: 'var(--bg-surface)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: 10,
    padding: '14px',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
  },
  metricSubtext: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: 'var(--text-dim)',
    marginTop: 6,
  },
  sectionBox: {
    background: 'var(--bg-surface)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: 10,
    padding: '14px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  ratioPercent: {
    fontSize: 12,
    fontWeight: 600,
    color: '#38bdf8',
    fontVariantNumeric: 'tabular-nums',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    background: 'var(--bg-hover)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'var(--accent-green)',
    borderRadius: 4,
    transition: 'width 300ms ease-out',
  },
  activePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: 'var(--accent-green)',
    background: 'var(--accent-green-bg)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: 6,
    padding: '3px 8px',
  },
  appRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--bg-sidebar)',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
  },
  currentAppName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  currentUrlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  currentUrlText: {
    fontSize: 11,
    color: 'var(--text-dim)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

export default CockpitTab;
