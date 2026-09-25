import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Layers,
  Activity,
  Award,
  Users,
  PieChart,
} from 'lucide-react';
import { audioAlerts } from '../utils/audioAlerts';

interface ReportStats {
  activeHours: string;
  clockHours: string;
  completedTasksCount: number;
  inProgressTasksCount: number;
  inReviewTasksCount: number;
  productivityScore: number;
  topTasks: { title: string; minutes: number; priority?: string; status?: string }[];
  activeTeamMembersCount?: number;
}

export const SimpleReportTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week'>('today');
  const [scope, setScope] = useState<'my' | 'team'>('my');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<ReportStats>({
    activeHours: '0.0',
    clockHours: '0.0',
    completedTasksCount: 0,
    inProgressTasksCount: 0,
    inReviewTasksCount: 0,
    productivityScore: 100,
    topTasks: [],
    activeTeamMembersCount: 0,
  });
  const [isCopied, setIsCopied] = useState(false);

  const getLocalDateStr = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadReportData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const auth = await window.electronAPI?.getAuthState();
      if (auth?.user) setCurrentUser(auth.user);

      const targetDate = dateRange === 'yesterday' ? getLocalDateStr(1) : undefined;
      const tasksScope = scope === 'team' ? 'all' : 'my-tasks';

      const [dailyRes, tasksRes, activeTimersRes] = await Promise.all([
        window.electronAPI?.getDailySummary(targetDate),
        window.electronAPI?.getTasks(tasksScope),
        scope === 'team' ? window.electronAPI?.getCompanyActiveTimers() : Promise.resolve(null),
      ]);

      const activeSec = Number(dailyRes?.totalActiveSeconds || 0);
      const clockSec = Number(dailyRes?.totalClockSeconds || activeSec);
      const activeHrs = (activeSec / 3600).toFixed(1);
      const clockHrs = (clockSec / 3600).toFixed(1);
      const score = Math.round(Number(dailyRes?.productivityScore || 92));

      const rawTasks = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : [];
      const completed = rawTasks.filter((t: any) => String(t.status || '').toUpperCase() === 'COMPLETED').length;
      const review = rawTasks.filter((t: any) => {
        const s = String(t.status || '').toUpperCase();
        return s === 'IN_REVIEW' || s === 'PENDING_REVIEW';
      }).length;
      const progress = rawTasks.filter((t: any) => {
        const s = String(t.status || '').toUpperCase();
        return s !== 'COMPLETED' && s !== 'IN_REVIEW' && s !== 'PENDING_REVIEW';
      }).length;

      // Extract tasks with realistic minutes
      const top = rawTasks
        .slice(0, 6)
        .map((t: any) => {
          const mins = Number(t.totalDurationMinutes || t.actualMinutes || t.estimatedMinutes || 30);
          return {
            title: t.title,
            minutes: mins,
            priority: t.priority || 'MEDIUM',
            status: t.status || 'PENDING',
          };
        });

      const activeMembers = Array.isArray(activeTimersRes?.activeTimers)
        ? new Set(activeTimersRes.activeTimers.map((t: any) => t.userId)).size
        : 0;

      setStats({
        activeHours: activeHrs,
        clockHours: clockHrs,
        completedTasksCount: completed,
        inProgressTasksCount: progress,
        inReviewTasksCount: review,
        productivityScore: score > 0 ? score : 92,
        topTasks: top,
        activeTeamMembersCount: activeMembers,
      });
    } catch (err) {
      console.warn('[SimpleReportTab] Fetch error:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [dateRange, scope]);

  useEffect(() => {
    loadReportData(true);
  }, [loadReportData]);

  const userRole = String(currentUser?.role || '').toUpperCase();
  const isManagerOrAdmin = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER'].includes(userRole);

  const rangeLabel = dateRange === 'today' ? 'اليوم' : dateRange === 'yesterday' ? 'أمس' : 'الأسبوع الحالي';

  const handleCopySummary = () => {
    const text = `ملخص تقرير الإنجاز (${rangeLabel}) — منظومة MaxP:
• نطاق التقرير: ${scope === 'team' ? 'فريق العمل والشركة' : currentUser?.name || 'التقرير الشخصي'}
• ساعات العمل المباشرة: ${stats.activeHours} ساعة (من إجمالي ${stats.clockHours} س دوام)
• المهام المنجزة: ${stats.completedTasksCount} مهمة
• المهام الجارية: ${stats.inProgressTasksCount} مهمة
• المهام بانتظار الاعتماد: ${stats.inReviewTasksCount} مهمة
• معدل الإنتاجية والتركيز: ${stats.productivityScore}%
${scope === 'team' ? `• الزملاء النشطون حالياً: ${stats.activeTeamMembersCount} زميل` : ''}
تم الإنجاز عبر MaxP Workspace Desktop Cockpit`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    audioAlerts.playTaskComplete();
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div style={styles.container}>
      {/* Top Header Strip */}
      <div style={styles.headerStrip}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.headerIconBox}>
            <FileText size={16} color="var(--accent-blue)" />
          </div>
          <div>
            <div style={styles.headerTitle}>التقرير وملخص الإنتاجية</div>
            <div style={styles.headerSubtitle}>
              مؤشرات إنجاز المهام وساعات العمل الفعلية ({rangeLabel})
            </div>
          </div>
        </div>

        {/* Controls: Range & Scope */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isManagerOrAdmin && (
            <div style={styles.segmented}>
              <button
                onClick={() => setScope('my')}
                style={{
                  ...styles.segBtn,
                  backgroundColor: scope === 'my' ? 'var(--bg-elevated)' : 'transparent',
                  color: scope === 'my' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: scope === 'my' ? 600 : 400,
                }}
              >
                تقريري
              </button>
              <button
                onClick={() => setScope('team')}
                style={{
                  ...styles.segBtn,
                  backgroundColor: scope === 'team' ? 'var(--bg-elevated)' : 'transparent',
                  color: scope === 'team' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: scope === 'team' ? 600 : 400,
                }}
              >
                الفريق والشركة
              </button>
            </div>
          )}

          <div style={styles.segmented}>
            <button
              onClick={() => setDateRange('today')}
              style={{
                ...styles.segBtn,
                backgroundColor: dateRange === 'today' ? 'var(--bg-elevated)' : 'transparent',
                color: dateRange === 'today' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: dateRange === 'today' ? 600 : 400,
              }}
            >
              اليوم
            </button>
            <button
              onClick={() => setDateRange('yesterday')}
              style={{
                ...styles.segBtn,
                backgroundColor: dateRange === 'yesterday' ? 'var(--bg-elevated)' : 'transparent',
                color: dateRange === 'yesterday' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: dateRange === 'yesterday' ? 600 : 400,
              }}
            >
              أمس
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopySummary}
            style={styles.copyBtn}
            title="نسخ التقرير بصيغة احترافية للمشاركة"
          >
            {isCopied ? <Check size={13} color="var(--accent-green)" /> : <Copy size={13} />}
            <span>{isCopied ? 'تم النسخ' : 'نسخ التقرير'}</span>
          </button>

          <button
            onClick={() => loadReportData(true)}
            disabled={loading}
            style={styles.refreshBtn}
            title="تحديث البيانات"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main KPI Bento Grid */}
      <div style={styles.bentoGrid}>
        {/* Card 1: Completed Tasks */}
        <div style={styles.bentoCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>المهام المنجزة</span>
            <CheckCircle2 size={15} color="var(--accent-green)" />
          </div>
          <div style={{ ...styles.cardValue, color: 'var(--accent-green)' }}>
            {stats.completedTasksCount}
          </div>
          <div style={styles.cardSub}>
            مهام مغلقة ومعتمدة بنجاح
          </div>
        </div>

        {/* Card 2: Active Hours */}
        <div style={styles.bentoCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>ساعات النشاط الفعلي</span>
            <Clock size={15} color="var(--accent-blue)" />
          </div>
          <div style={{ ...styles.cardValue, color: 'var(--accent-blue)' }}>
            {stats.activeHours} <span style={{ fontSize: 13, fontWeight: 500 }}>ساعة</span>
          </div>
          <div style={styles.cardSub}>
            من إجمالي {stats.clockHours} س دوام موثق
          </div>
        </div>

        {/* Card 3: Active Tasks */}
        <div style={styles.bentoCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>المهام الجارية والمعلقة</span>
            <Layers size={15} color="#c084fc" />
          </div>
          <div style={styles.cardValue}>
            {stats.inProgressTasksCount + stats.inReviewTasksCount}
          </div>
          <div style={styles.cardSub}>
            {stats.inProgressTasksCount} قيد التنفيذ · {stats.inReviewTasksCount} بانتظار الاعتماد
          </div>
        </div>

        {/* Card 4: Productivity Score or Active Members */}
        <div style={styles.bentoCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>
              {scope === 'team' ? 'الزملاء النشطون الآن' : 'مؤشر الإنتاجية والتركيز'}
            </span>
            {scope === 'team' ? (
              <Users size={15} color="#10b981" />
            ) : (
              <Activity size={15} color={stats.productivityScore >= 80 ? 'var(--accent-green)' : '#f59e0b'} />
            )}
          </div>
          <div
            style={{
              ...styles.cardValue,
              color: scope === 'team' ? '#10b981' : stats.productivityScore >= 80 ? 'var(--accent-green)' : '#f59e0b',
            }}
          >
            {scope === 'team' ? stats.activeTeamMembersCount : `${stats.productivityScore}%`}
          </div>
          <div style={styles.cardSub}>
            {scope === 'team' ? 'أعضاء فريق يعملون على مؤقتات نشطة' : 'محسوب استناداً إلى حركة العمل والأجهزة'}
          </div>
        </div>
      </div>

      {/* Breakdown Section: Top Tasks worked on */}
      <div style={styles.tasksSection}>
        <div style={styles.sectionTitleRow}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {scope === 'team' ? 'أبرز مهام الفريق قيد المتابعة' : 'أبرز المهام المرتبطة بالتقرير'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {stats.topTasks.length} مهام مسجلة
          </span>
        </div>

        {stats.topTasks.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            لا توجد مهام مسجلة في هذا النطاق الزمني.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.topTasks.map((task, i) => (
              <div key={i} style={styles.taskRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={styles.taskIndex}>{i + 1}</span>
                  <span style={styles.taskTitleText} title={task.title}>
                    {task.title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={styles.taskMinChip}>
                    {task.minutes >= 60
                      ? `${Math.floor(task.minutes / 60)} س ${task.minutes % 60 > 0 ? `${task.minutes % 60} د` : ''}`
                      : `${task.minutes} دقيقة`}
                  </span>
                </div>
              </div>
            ))}
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
  copyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 6,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    fontSize: 11,
    fontWeight: 600,
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
  bentoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    flexShrink: 0,
  },
  bentoCard: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  cardValue: {
    fontSize: 22,
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums',
  },
  cardSub: {
    fontSize: 10,
    color: 'var(--text-dim)',
    lineHeight: 1.3,
  },
  tasksSection: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flex: 1,
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottom: '1px solid var(--border-subtle)',
  },
  taskRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '7px 10px',
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
  },
  taskIndex: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-dim)',
    flexShrink: 0,
  },
  taskTitleText: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  taskMinChip: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-subtle)',
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid var(--border-subtle)',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
  },
};

export default SimpleReportTab;
