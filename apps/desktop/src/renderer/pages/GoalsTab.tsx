import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  CheckCircle2,
  TrendingUp,
  Clock,
  Plus,
  RefreshCw,
  Calendar,
  AlertCircle,
  Award,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { audioAlerts } from '../utils/audioAlerts';
import { CreateGoalModal } from '../components/goals/CreateGoalModal';

interface GoalItem {
  id: string;
  title: string;
  description?: string;
  goalType?: string;
  target?: number;
  current?: number;
  targetValue?: number;
  currentValue?: number;
  progress?: number;
  unit?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  userName?: string;
  departmentName?: string;
  isAutoTracked?: boolean;
  metricKey?: string;
  metricLabel?: string;
}

export const GoalsTab: React.FC = () => {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'today' | 'all'>('today');
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [ensuringGoals, setEnsuringGoals] = useState(false);

  const loadGoals = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const auth = await window.electronAPI?.getAuthState();
      if (auth?.user) setCurrentUser(auth.user);

      if (activeFilter === 'today') {
        const res = await window.electronAPI?.getTodayGoals();
        if (res?.success && Array.isArray(res.goals)) {
          setGoals(res.goals);
        } else {
          setGoals([]);
        }
      } else {
        const res = await window.electronAPI?.getGoals();
        if (res?.success && Array.isArray(res.goals)) {
          setGoals(res.goals);
        } else {
          setGoals([]);
        }
      }
    } catch (err) {
      console.warn('[GoalsTab] Fetch error:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadGoals(true);
  }, [loadGoals]);

  const handleUpdateProgress = async (goal: GoalItem, delta: number) => {
    if (updatingGoalId || !window.electronAPI?.updateGoalProgress) return;
    const currentVal = Number(goal.current || 0);
    const targetVal = Number(goal.target || 100);
    const newVal = Math.min(targetVal, Math.max(0, currentVal + delta));

    // Optimistic UI update
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goal.id) {
          const prog = targetVal > 0 ? Math.round((newVal / targetVal) * 100) : 0;
          return { ...g, current: newVal, progress: prog };
        }
        return g;
      })
    );

    if (newVal >= targetVal) {
      audioAlerts.playTaskComplete();
    }

    setUpdatingGoalId(goal.id);
    try {
      await window.electronAPI.updateGoalProgress(goal.id, newVal);
    } catch (err) {
      console.warn('[GoalsTab] Update progress failed:', err);
      loadGoals(false);
    } finally {
      setUpdatingGoalId(null);
    }
  };

  const handleEnsureTodayGoals = async () => {
    setEnsuringGoals(true);
    try {
      const res = await window.electronAPI?.ensureTodayGoals();
      if (res?.success && Array.isArray(res.goals)) {
        setGoals(res.goals);
        audioAlerts.playTaskComplete();
      }
    } catch (err) {
      console.warn('[GoalsTab] ensureTodayGoals error:', err);
    } finally {
      setEnsuringGoals(false);
    }
  };

  const getGoalProgress = (g: GoalItem) => {
    if (g.progress !== undefined && g.progress !== null) return Number(g.progress);
    const tgt = Number(g.target !== undefined ? g.target : (g.targetValue || 0));
    const cur = Number(g.current !== undefined ? g.current : (g.currentValue || 0));
    return tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
  };

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => {
    const prog = getGoalProgress(g);
    return prog >= 100 || String(g.status || '').toUpperCase() === 'COMPLETED';
  }).length;
  const avgProgress = totalGoals > 0
    ? Math.round(
        goals.reduce((acc, g) => {
          const p = getGoalProgress(g);
          return acc + Math.min(100, Math.max(0, p));
        }, 0) / totalGoals
      )
    : 0;

  return (
    <div style={styles.container}>
      {/* Top Header & Filter Bar */}
      <div style={styles.headerStrip}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.headerIconBox}>
            <Target size={16} color="var(--accent-blue)" />
          </div>
          <div>
            <div style={styles.headerTitle}>الأهداف ومؤشرات الأداء (OKRs)</div>
            <div style={styles.headerSubtitle}>
              تتبع الإنجاز اليومي والأهداف المرحلية المرتبطة بمهام العمل
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={styles.segmented}>
            <button
              onClick={() => setActiveFilter('today')}
              style={{
                ...styles.segBtn,
                backgroundColor: activeFilter === 'today' ? 'var(--bg-elevated)' : 'transparent',
                color: activeFilter === 'today' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeFilter === 'today' ? 600 : 400,
              }}
            >
              <span>أهداف اليوم</span>
            </button>
            <button
              onClick={() => setActiveFilter('all')}
              style={{
                ...styles.segBtn,
                backgroundColor: activeFilter === 'all' ? 'var(--bg-elevated)' : 'transparent',
                color: activeFilter === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeFilter === 'all' ? 600 : 400,
              }}
            >
              <span>جميع الأهداف</span>
            </button>
          </div>

          {activeFilter === 'today' && (
            <button
              onClick={handleEnsureTodayGoals}
              disabled={ensuringGoals}
              style={styles.actionOutlineBtn}
              title="توليد أهداف اليوم المعتمدة آلياً"
            >
              <Sparkles size={12} color="var(--accent-blue)" />
              <span>{ensuringGoals ? 'جاري التوليد…' : 'توليد أهداف اليوم'}</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateOpen(true)}
            style={styles.primaryActionBtn}
            title="إضافة هدف مخصص جديد"
          >
            <Plus size={13} />
            <span>إضافة هدف</span>
          </button>

          <button
            onClick={() => loadGoals(true)}
            disabled={loading}
            style={styles.refreshBtn}
            title="تحديث الأهداف"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary KPI Bento Strip */}
      <div style={styles.summaryBento}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>إجمالي الأهداف المحددة</div>
          <div style={styles.kpiValue}>{totalGoals}</div>
          <div style={styles.kpiMeta}>
            <Target size={11} color="var(--text-muted)" />
            <span>{activeFilter === 'today' ? 'المستهدفة اليوم' : 'الإجمالية'}</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>الأهداف المحققة بالكامل</div>
          <div style={{ ...styles.kpiValue, color: 'var(--accent-green)' }}>{completedGoals}</div>
          <div style={styles.kpiMeta}>
            <CheckCircle2 size={11} color="var(--accent-green)" />
            <span>{totalGoals > 0 ? `${Math.round((completedGoals / totalGoals) * 100)}% معدل الإنجاز` : '—'}</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>متوسط نسبة الإنجاز العام</div>
          <div style={{ ...styles.kpiValue, color: avgProgress >= 70 ? 'var(--accent-green)' : '#38bdf8' }}>
            {avgProgress}%
          </div>
          <div style={styles.kpiMeta}>
            <TrendingUp size={11} color="var(--accent-blue)" />
            <span>تقدم مباشر ومحسوب</span>
          </div>
        </div>
      </div>

      {/* Goals Content Area */}
      <div style={styles.contentCard}>
        {loading && goals.length === 0 ? (
          <div style={styles.emptyBox}>جاري استرجاع الأهداف ومؤشرات الأداء…</div>
        ) : goals.length === 0 ? (
          <div style={styles.emptyBox}>
            <Target size={28} color="var(--text-dim)" style={{ opacity: 0.5, marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeFilter === 'today' ? 'لا توجد أهداف محددة لليوم بعد' : 'لا توجد أهداف نشطة حالياً'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              يمكنك توليد أهداف اليوم المعتمدة بنقرة واحدة أو إضافة أهداف مخصصة
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              {activeFilter === 'today' && (
                <button
                  onClick={handleEnsureTodayGoals}
                  disabled={ensuringGoals}
                  style={styles.primaryActionBtn}
                >
                  <Sparkles size={12} />
                  <span>توليد أهداف اليوم المعتمدة</span>
                </button>
              )}
              <button
                onClick={() => setIsCreateOpen(true)}
                style={styles.actionOutlineBtn}
              >
                <Plus size={12} />
                <span>إضافة هدف مخصص</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.goalsGrid}>
            {goals.map((goal) => {
              const currentVal = Number(goal.current !== undefined ? goal.current : (goal.currentValue || 0));
              const targetVal = Number(goal.target !== undefined ? goal.target : (goal.targetValue || 100));
              const unit = goal.unit || 'نقطة';
              const progress = goal.progress ?? (targetVal > 0 ? Math.round((currentVal / targetVal) * 100) : 0);
              const isCompleted = progress >= 100 || String(goal.status || '').toUpperCase() === 'COMPLETED';

              return (
                <div key={goal.id} style={{ ...styles.goalCard, opacity: isCompleted ? 0.85 : 1 }}>
                  <div style={styles.goalCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isCompleted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.1)',
                          flexShrink: 0,
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={14} color="var(--accent-green)" />
                        ) : (
                          <Target size={14} color="var(--accent-blue)" />
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={styles.goalTitle} title={goal.title}>{goal.title}</span>
                          {goal.isAutoTracked && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 4,
                                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                color: 'var(--accent-blue)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                              title="هذا الهدف مربوط بمؤشرات المنصة التلقائية ويزداد تلقائياً عند تنفيذ العمليات"
                            >
                              <Zap size={9} />
                              <span>تلقائي: {goal.metricLabel || 'النظام'}</span>
                            </span>
                          )}
                        </div>
                        {goal.description && (
                          <div style={styles.goalDesc} title={goal.description}>{goal.description}</div>
                        )}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 4,
                        backgroundColor: isCompleted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                        color: isCompleted ? 'var(--accent-green)' : 'var(--text-dim)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {progress}%
                    </span>
                  </div>

                  {/* Progress Track */}
                  <div style={styles.progressTrack}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${Math.min(100, Math.max(0, progress))}%`,
                        backgroundColor: isCompleted ? 'var(--accent-green)' : 'var(--accent-blue)',
                      }}
                    />
                  </div>

                  {/* Telemetry Numbers & Quick Increment Actions */}
                  <div style={styles.goalFooter}>
                    <div style={styles.goalTelemetry}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {currentVal}
                      </span>
                      <span> / </span>
                      <span>{targetVal} {unit}</span>
                    </div>

                    {!isCompleted && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateProgress(goal, 1)}
                          disabled={updatingGoalId === goal.id}
                          style={styles.quickAddBtn}
                          title="زيادة التقدم +1"
                        >
                          <Plus size={11} />
                          <span>+1</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateProgress(goal, 5)}
                          disabled={updatingGoalId === goal.id}
                          style={styles.quickAddBtn}
                          title="زيادة التقدم +5"
                        >
                          <Plus size={11} />
                          <span>+5</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateGoalModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onGoalCreated={() => loadGoals(false)}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    backgroundColor: 'var(--bg-canvas)',
    padding: '12px 16px',
    gap: 12,
  },
  headerStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  segmented: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 6,
    padding: 2,
    border: '1px solid var(--border-subtle)',
  },
  segBtn: {
    padding: '4px 10px',
    borderRadius: 5,
    border: 'none',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    border: '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-dim)',
    cursor: 'pointer',
  },
  summaryBento: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
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
  kpiLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
  },
  kpiMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: 'var(--text-dim)',
  },
  contentCard: {
    flex: 1,
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: 12,
    overflowY: 'auto',
  },
  emptyBox: {
    height: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  goalsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 10,
  },
  goalCard: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    transition: 'border-color 140ms ease',
  },
  goalCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  goalTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  goalDesc: {
    fontSize: 10,
    color: 'var(--text-muted)',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    transition: 'width 240ms ease-out',
  },
  goalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 11,
    color: 'var(--text-muted)',
    fontVariantNumeric: 'tabular-nums',
  },
  goalTelemetry: {
    fontSize: 11,
    color: 'var(--text-dim)',
  },
  quickAddBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-dim)',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  primaryActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 120ms ease',
  },
  actionOutlineBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 120ms ease',
  },
};

export default GoalsTab;
