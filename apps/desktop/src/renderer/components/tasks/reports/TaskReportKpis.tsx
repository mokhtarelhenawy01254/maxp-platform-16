import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  PauseCircle,
  TrendingUp,
} from 'lucide-react';
import { TaskReportKpiData, TaskExceptionFilter } from './TaskReportTypes';

interface TaskReportKpisProps {
  kpis: TaskReportKpiData;
  activeFilter: TaskExceptionFilter;
  onFilterChange: (filter: TaskExceptionFilter) => void;
}

export const TaskReportKpis: React.FC<TaskReportKpisProps> = ({
  kpis,
  activeFilter,
  onFilterChange,
}) => {
  const formatHours = (seconds: number): string => {
    const hours = (seconds / 3600).toFixed(1);
    return `${hours}h`;
  };

  return (
    <div style={styles.container}>
      {/* 1. Total & Completion Rate */}
      <div
        style={{
          ...styles.card,
          borderColor: activeFilter === 'all' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)',
        }}
        onClick={() => onFilterChange('all')}
        role="button"
        title="عرض جميع المهام المجدولة"
      >
        <div style={styles.cardHeader}>
          <span style={styles.cardLabel}>إجمالي المهام</span>
          <Layers size={13} style={{ color: '#94a3b8' }} />
        </div>
        <div style={styles.cardBody}>
          <span style={styles.primaryNum}>{kpis.totalTasks}</span>
          <span style={styles.secondaryBadge}>
            <CheckCircle2 size={11} color="#22c55e" style={{ marginRight: 3 }} />
            {kpis.completionRate}% إنجاز
          </span>
        </div>
        <div style={styles.progressBarBg}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${Math.min(100, Math.max(0, kpis.completionRate))}%`,
              background: '#22c55e',
            }}
          />
        </div>
      </div>

      {/* 2. Tracked Stopwatch Hours */}
      <div style={styles.card} title="إجمالي الساعات المسجلة بالتايمر الفعلي">
        <div style={styles.cardHeader}>
          <span style={styles.cardLabel}>وقت التركيز المسجل</span>
          <Clock size={13} style={{ color: '#38bdf8' }} />
        </div>
        <div style={styles.cardBody}>
          <span style={styles.primaryNum}>{formatHours(kpis.totalTrackedSeconds)}</span>
          <span style={{ ...styles.secondaryBadge, color: '#38bdf8' }}>
            <TrendingUp size={11} style={{ marginRight: 3 }} />
            {kpis.inProgressCount} جارية الآن
          </span>
        </div>
        <div style={styles.progressBarBg}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${Math.min(100, kpis.focusAccuracyRate)}%`,
              background: '#38bdf8',
            }}
          />
        </div>
      </div>

      {/* 3. Time Leaks (Actual > Estimated) */}
      <div
        style={{
          ...styles.card,
          cursor: 'pointer',
          borderColor: activeFilter === 'time_leaks' ? 'rgba(249, 115, 22, 0.5)' : 'rgba(255, 255, 255, 0.08)',
          background: activeFilter === 'time_leaks' ? 'rgba(249, 115, 22, 0.06)' : '#121214',
        }}
        onClick={() => onFilterChange(activeFilter === 'time_leaks' ? 'all' : 'time_leaks')}
        role="button"
        title="انقر لتصفية المهام التي استغرقت وقتاً أطول من المتوقع"
      >
        <div style={styles.cardHeader}>
          <span style={styles.cardLabel}>فجوة الوقت (Time Leaks)</span>
          <AlertTriangle size={13} style={{ color: kpis.timeLeakCount > 0 ? '#f97316' : '#64748b' }} />
        </div>
        <div style={styles.cardBody}>
          <span style={{ ...styles.primaryNum, color: kpis.timeLeakCount > 0 ? '#f97316' : '#f1f5f9' }}>
            {kpis.timeLeakCount}
          </span>
          <span style={{ ...styles.secondaryBadge, color: '#f97316' }}>
            تجاوزت التقدير
          </span>
        </div>
        <span style={styles.hintSubtext}>
          {kpis.timeLeakCount > 0 ? 'استغرقت وقتاً أطول من المتوقع' : 'التقديرات منضبطة'}
        </span>
      </div>

      {/* 4. Review Blocked (> 24h) */}
      <div
        style={{
          ...styles.card,
          cursor: 'pointer',
          borderColor: activeFilter === 'review_blocked' ? 'rgba(234, 179, 8, 0.5)' : 'rgba(255, 255, 255, 0.08)',
          background: activeFilter === 'review_blocked' ? 'rgba(234, 179, 8, 0.06)' : '#121214',
        }}
        onClick={() => onFilterChange(activeFilter === 'review_blocked' ? 'all' : 'review_blocked')}
        role="button"
        title="انقر لتصفية المهام المعلقة في المراجعة لأكثر من 24 ساعة"
      >
        <div style={styles.cardHeader}>
          <span style={styles.cardLabel}>عالقة في المراجعة</span>
          <PauseCircle size={13} style={{ color: kpis.reviewBlockedCount > 0 ? '#eab308' : '#64748b' }} />
        </div>
        <div style={styles.cardBody}>
          <span style={{ ...styles.primaryNum, color: kpis.reviewBlockedCount > 0 ? '#eab308' : '#f1f5f9' }}>
            {kpis.reviewBlockedCount}
          </span>
          <span style={{ ...styles.secondaryBadge, color: '#eab308' }}>
            بانتظار الاعتماد
          </span>
        </div>
        <span style={styles.hintSubtext}>
          {kpis.reviewBlockedCount > 0 ? 'تتطلب تدخل المشرف' : 'لا توجد اختناقات'}
        </span>
      </div>

      {/* 5. Overdue Tasks */}
      <div
        style={{
          ...styles.card,
          cursor: 'pointer',
          borderColor: activeFilter === 'overdue' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.08)',
          background: activeFilter === 'overdue' ? 'rgba(239, 68, 68, 0.06)' : '#121214',
        }}
        onClick={() => onFilterChange(activeFilter === 'overdue' ? 'all' : 'overdue')}
        role="button"
        title="انقر لتصفية المهام المتأخرة عن موعد التسليم النهائي"
      >
        <div style={styles.cardHeader}>
          <span style={styles.cardLabel}>متأخرة عن الموعد</span>
          <AlertTriangle size={13} style={{ color: kpis.overdueCount > 0 ? '#ef4444' : '#64748b' }} />
        </div>
        <div style={styles.cardBody}>
          <span style={{ ...styles.primaryNum, color: kpis.overdueCount > 0 ? '#ef4444' : '#f1f5f9' }}>
            {kpis.overdueCount}
          </span>
          <span style={{ ...styles.secondaryBadge, color: '#ef4444' }}>
            تجاوزت الـ SLA
          </span>
        </div>
        <span style={styles.hintSubtext}>
          {kpis.overdueCount > 0 ? 'تتطلب تسريعاً فورياً' : 'جميع المواعيد منضبطة'}
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 8,
    marginBottom: 12,
  },
  card: {
    background: '#121214',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 68,
    transition: 'border-color 150ms ease, background 150ms ease',
    userSelect: 'none',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 500,
  },
  cardBody: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  primaryNum: {
    fontSize: 19,
    fontWeight: 700,
    color: '#f8fafc',
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum"',
    letterSpacing: '-0.02em',
  },
  secondaryBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#94a3b8',
    display: 'inline-flex',
    alignItems: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  progressBarBg: {
    height: 3,
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 250ms ease-out',
  },
  hintSubtext: {
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
