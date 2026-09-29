import React from 'react';
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  PauseCircle,
  ShieldAlert,
} from 'lucide-react';
import { TaskReportItem } from './TaskReportTypes';

interface TaskReportExceptionsProps {
  timeLeakTasks: TaskReportItem[];
  reviewBlockedTasks: TaskReportItem[];
  overdueTasks: TaskReportItem[];
  onSelectTask?: (task: TaskReportItem) => void;
}

export const TaskReportExceptions: React.FC<TaskReportExceptionsProps> = ({
  timeLeakTasks,
  reviewBlockedTasks,
  overdueTasks,
  onSelectTask,
}) => {
  const totalExceptions =
    timeLeakTasks.length + reviewBlockedTasks.length + overdueTasks.length;

  if (totalExceptions === 0) {
    return null;
  }

  const formatMinToH = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m > 0 ? `${m}m` : ''}`;
  };

  return (
    <div style={styles.banner}>
      <div style={styles.bannerHeader}>
        <div style={styles.headerTitleWrap}>
          <ShieldAlert size={14} color="#f97316" />
          <span style={styles.headerTitle}>
            رادار الاستثناءات والتدخل الإداري ({totalExceptions})
          </span>
        </div>
        <span style={styles.headerSubtitle}>
          مهام تتطلب مراجعة التقدير، فك الاختناق، أو تسريع الموعد
        </span>
      </div>

      <div style={styles.itemsGrid}>
        {/* Overdue items first */}
        {overdueTasks.slice(0, 2).map((t) => (
          <div key={`overdue-${t.id}`} style={{ ...styles.itemCard, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div style={styles.badgeOverdue}>
              <AlertTriangle size={11} color="var(--accent-red)" />
              <span>متأخرة عن الموعد</span>
            </div>
            <div style={styles.itemTitle} title={t.title}>
              {t.title}
            </div>
            <div style={styles.itemMeta}>
              <span style={styles.assigneeText}>{t.assignedToName}</span>
              <span style={styles.projectText}>• {t.projectName}</span>
              {t.dueDate && (
                <span style={styles.timeTag}>
                  الاستحقاق: {new Date(t.dueDate).toLocaleDateString('ar-EG-u-nu-latn')}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Time Leak items */}
        {timeLeakTasks.slice(0, 2).map((t) => (
          <div key={`leak-${t.id}`} style={{ ...styles.itemCard, borderColor: 'rgba(249, 115, 22, 0.3)' }}>
            <div style={styles.badgeLeak}>
              <Clock size={11} color="#f97316" />
              <span>فجوة وقت: +{formatMinToH(t.varianceMinutes)}</span>
            </div>
            <div style={styles.itemTitle} title={t.title}>
              {t.title}
            </div>
            <div style={styles.itemMeta}>
              <span style={styles.assigneeText}>{t.assignedToName}</span>
              <span style={styles.timeTag}>
                الفعلي: {formatMinToH(t.actualTrackedMinutes)} (المقدّر: {formatMinToH(t.estimatedMinutes)})
              </span>
            </div>
          </div>
        ))}

        {/* Review Blocked items */}
        {reviewBlockedTasks.slice(0, 2).map((t) => (
          <div key={`review-${t.id}`} style={{ ...styles.itemCard, borderColor: 'rgba(234, 179, 8, 0.3)' }}>
            <div style={styles.badgeReview}>
              <PauseCircle size={11} color="var(--accent-yellow)" />
              <span>معلقة في الاعتماد</span>
            </div>
            <div style={styles.itemTitle} title={t.title}>
              {t.title}
            </div>
            <div style={styles.itemMeta}>
              <span style={styles.assigneeText}>{t.assignedToName}</span>
              <span style={styles.projectText}>• {t.projectName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  banner: {
    background: 'rgba(24, 24, 27, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '8px 12px',
    marginBottom: 12,
  },
  bannerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  headerTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: 'var(--text-muted)',
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 8,
  },
  itemCard: {
    background: 'var(--bg-surface)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: '7px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  badgeOverdue: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--accent-red)',
  },
  badgeLeak: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#f97316',
    fontVariantNumeric: 'tabular-nums',
  },
  badgeReview: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--accent-yellow)',
  },
  itemTitle: {
    fontSize: 11.5,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    color: 'var(--text-muted)',
    flexWrap: 'wrap',
  },
  assigneeText: {
    color: '#cbd5e1',
    fontWeight: 500,
  },
  projectText: {
    color: 'var(--text-muted)',
  },
  timeTag: {
    color: 'var(--text-muted)',
    fontVariantNumeric: 'tabular-nums',
  },
};
