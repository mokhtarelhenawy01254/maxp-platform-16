import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { TaskReportItem } from './TaskReportTypes';

interface TaskReportLedgerProps {
  tasks: TaskReportItem[];
  searchQuery: string;
}

export const TaskReportLedger: React.FC<TaskReportLedgerProps> = ({
  tasks,
  searchQuery,
}) => {
  const filtered = tasks.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.projectName.toLowerCase().includes(q) ||
      t.assignedToName.toLowerCase().includes(q)
    );
  });

  const formatMinToH = (mins: number) => {
    if (!mins || mins === 0) return '00:00';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}`;
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return { color: 'var(--accent-red)', bg: 'rgba(239, 68, 68, 0.12)', label: 'حرجة' };
      case 'HIGH':
        return { color: 'var(--accent-orange)', bg: 'rgba(249, 115, 22, 0.12)', label: 'مرتفعة' };
      case 'MEDIUM':
        return { color: 'var(--accent-blue)', bg: 'rgba(56, 189, 248, 0.12)', label: 'متوسطة' };
      default:
        return { color: 'var(--text-muted)', bg: 'rgba(148, 163, 184, 0.12)', label: 'عادية' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span style={{ ...styles.statusBadge, color: 'var(--accent-green)', background: 'var(--accent-green-bg)' }}>
            <CheckCircle2 size={11} style={{ marginRight: 3 }} />
            مكتملة
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span style={{ ...styles.statusBadge, color: 'var(--accent-blue)', background: 'rgba(56, 189, 248, 0.12)' }}>
            <Play size={10} style={{ marginRight: 3 }} />
            جارية
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span style={{ ...styles.statusBadge, color: 'var(--accent-yellow)', background: 'rgba(234, 179, 8, 0.12)' }}>
            مراجعة
          </span>
        );
      default:
        return (
          <span style={{ ...styles.statusBadge, color: 'var(--text-muted)', background: 'rgba(148, 163, 184, 0.12)' }}>
            معلقة
          </span>
        );
    }
  };

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thRow}>
            <th style={{ ...styles.th, width: '38%' }}>المهمة والمشروع</th>
            <th style={{ ...styles.th, width: '15%' }}>المكلّف</th>
            <th style={{ ...styles.th, width: '11%' }}>الأولوية</th>
            <th style={{ ...styles.th, width: '11%' }}>الحالة</th>
            <th style={{ ...styles.th, width: '12%', textAlign: 'left' }}>التقديري</th>
            <th style={{ ...styles.th, width: '13%', textAlign: 'left' }}>الفعلي (التايمر)</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} style={styles.emptyTd}>
                لا توجد مهام تطابق معايير الفلترة الحالية
              </td>
            </tr>
          ) : (
            filtered.map((t) => {
              const pri = getPriorityStyle(t.priority);
              const isOver = t.varianceMinutes > 0 && t.estimatedMinutes > 0;
              return (
                <tr key={t.id} style={styles.tr}>
                  {/* Title & Project */}
                  <td style={styles.td}>
                    <div style={styles.taskTitleRow}>
                      <span style={styles.taskTitle} title={t.title}>
                        {t.title}
                      </span>
                      {t.isOverdue && (
                        <span style={styles.overdueTag} title="تجاوزت تاريخ الاستحقاق">
                          متأخرة
                        </span>
                      )}
                    </div>
                    <span style={styles.projectName}>{t.projectName}</span>
                  </td>

                  {/* Assignee */}
                  <td style={styles.td}>
                    <span style={styles.assigneeText}>{t.assignedToName}</span>
                  </td>

                  {/* Priority */}
                  <td style={styles.td}>
                    <span style={{ ...styles.priorityBadge, color: pri.color, background: pri.bg }}>
                      {pri.label}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={styles.td}>{getStatusBadge(t.status)}</td>

                  {/* Estimated Duration */}
                  <td style={{ ...styles.td, textAlign: 'left' }}>
                    <span style={styles.tabularDuration}>
                      {formatMinToH(t.estimatedMinutes)}
                    </span>
                  </td>

                  {/* Actual Tracked Duration & Variance */}
                  <td style={{ ...styles.td, textAlign: 'left' }}>
                    <div style={styles.actualTimeCell}>
                      <span
                        style={{
                          ...styles.tabularDuration,
                          fontWeight: 700,
                          color: isOver ? 'var(--accent-orange)' : 'var(--text-primary)',
                        }}
                      >
                        {formatMinToH(t.actualTrackedMinutes)}
                      </span>
                      {isOver && (
                        <span style={styles.varianceTag} title="تجاوز الوقت المقدر">
                          +{formatMinToH(t.varianceMinutes)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  tableWrapper: {
    background: 'var(--bg-surface)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11.5,
  },
  thRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(24, 24, 27, 0.5)',
  },
  th: {
    padding: '8px 12px',
    textAlign: 'right',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: 11,
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'background 120ms ease',
  },
  td: {
    padding: '7px 12px',
    verticalAlign: 'middle',
  },
  emptyTd: {
    padding: 24,
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: 12,
  },
  taskTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  taskTitle: {
    color: 'var(--text-primary)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 280,
  },
  projectName: {
    color: 'var(--text-muted)',
    fontSize: 10,
    display: 'block',
    marginTop: 1,
  },
  overdueTag: {
    fontSize: 9.5,
    padding: '1px 5px',
    borderRadius: 3,
    background: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--accent-red)',
    fontWeight: 600,
  },
  assigneeText: {
    color: '#cbd5e1',
    fontWeight: 500,
  },
  priorityBadge: {
    display: 'inline-block',
    padding: '2px 7px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 7px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
  },
  tabularDuration: {
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum"',
    color: 'var(--text-muted)',
    fontSize: 11.5,
  },
  actualTimeCell: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  varianceTag: {
    fontSize: 9.5,
    padding: '1px 4px',
    borderRadius: 3,
    background: 'rgba(249, 115, 22, 0.14)',
    color: 'var(--accent-orange)',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
};
