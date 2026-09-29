import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  RotateCcw,
  CheckCircle2,
  Clock,
  Play,
  Send,
  MessageSquare,
  Paperclip,
  RefreshCw,
  AlertTriangle,
  User,
  CheckCheck,
} from 'lucide-react';

interface TaskActivityItem {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  description?: string | null;
  createdAt: string;
  userName?: string;
  userAvatar?: string | null;
}

interface TaskActivityLogProps {
  taskId: string;
  isTaskReturned?: boolean;
}

export const TaskActivityLog: React.FC<TaskActivityLogProps> = ({
  taskId,
  isTaskReturned = false,
}) => {
  const [activities, setActivities] = useState<TaskActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.getTaskActivities(taskId);
      if (res?.success && Array.isArray(res.data)) {
        setActivities(res.data);
      }
    } catch (err) {
      console.warn('[TaskActivityLog] Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const formatRelativeTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return 'الآن';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'أمس';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      return date.toLocaleDateString('ar-EG-u-nu-latn', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  const getActionConfig = (item: TaskActivityItem) => {
    const act = (item.action || '').toLowerCase();
    switch (act) {
      case 'returned_for_revision':
        return {
          icon: <RotateCcw size={12} color="var(--accent-yellow)" />,
          title: 'إعادة المهمة للتعديل والمراجعة',
          color: 'var(--accent-yellow)',
          bg: 'rgba(245, 158, 11, 0.12)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          isCritical: true,
        };
      case 'submitted_for_review':
        return {
          icon: <Send size={12} color="var(--accent-purple-soft)" />,
          title: 'تسليم المهمة للاعتماد والمراجعة',
          color: 'var(--accent-purple-soft)',
          bg: 'rgba(192, 132, 252, 0.12)',
          borderColor: 'rgba(192, 132, 252, 0.3)',
          isCritical: false,
        };
      case 'approved':
        return {
          icon: <CheckCircle2 size={12} color="var(--accent-green)" />,
          title: 'اعتماد المهمة وإنجازها رسمياً',
          color: 'var(--accent-green)',
          bg: 'var(--accent-green-bg)',
          borderColor: 'rgba(34, 197, 94, 0.3)',
          isCritical: false,
        };
      case 'status_changed':
        return {
          icon: <Clock size={12} color="var(--accent-blue)" />,
          title: `تحديث الحالة إلى ${item.newValue || 'جديدة'}`,
          color: 'var(--accent-blue)',
          bg: 'rgba(56, 189, 248, 0.12)',
          borderColor: 'rgba(56, 189, 248, 0.3)',
          isCritical: false,
        };
      case 'commented':
        return {
          icon: <MessageSquare size={12} color="var(--text-muted)" />,
          title: 'إضافة تعليق وملاحظات',
          color: 'var(--text-muted)',
          bg: 'rgba(148, 163, 184, 0.12)',
          borderColor: 'rgba(148, 163, 184, 0.25)',
          isCritical: false,
        };
      case 'attachment_added':
        return {
          icon: <Paperclip size={12} color="#60a5fa" />,
          title: 'إرفاق ملف جديد',
          color: '#60a5fa',
          bg: 'rgba(96, 165, 250, 0.12)',
          borderColor: 'rgba(96, 165, 250, 0.25)',
          isCritical: false,
        };
      default:
        return {
          icon: <History size={12} color="var(--text-muted)" />,
          title: item.description || 'تحديث في المهمة',
          color: 'var(--text-muted)',
          bg: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          isCritical: false,
        };
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <div style={styles.header}>
        <div style={styles.headerLeft} onClick={() => setCollapsed(!collapsed)}>
          <History size={13} color="var(--accent-blue)" />
          <span style={styles.title}>سجل المهمة وتاريخ المراجعات</span>
          <span style={styles.badge}>{activities.length}</span>
          {isTaskReturned && (
            <span style={styles.returnedWarningBadge}>
              <AlertTriangle size={10} color="var(--accent-yellow)" style={{ marginRight: 3 }} />
              مُعادة للتعديل
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={fetchActivities}
          disabled={loading}
          style={styles.refreshBtn}
          title="تحديث سجل النشاطات"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} color="var(--text-muted)" />
        </button>
      </div>

      {!collapsed && (
        <div style={styles.content}>
          {activities.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyText}>لا توجد أحداث سابقة مسجلة على هذه المهمة حتى الآن</span>
            </div>
          ) : (
            <div style={styles.timeline}>
              {activities.map((item, idx) => {
                const cfg = getActionConfig(item);
                const isRevision = item.action === 'returned_for_revision';
                return (
                  <div key={item.id || idx} style={styles.timelineItem}>
                    {/* Event Node Line & Dot */}
                    <div style={styles.nodeColumn}>
                      <div
                        style={{
                          ...styles.dot,
                          backgroundColor: cfg.bg,
                          borderColor: cfg.borderColor,
                        }}
                      >
                        {cfg.icon}
                      </div>
                      {idx < activities.length - 1 && <div style={styles.connectingLine} />}
                    </div>

                    {/* Event Card Content */}
                    <div style={styles.itemContent}>
                      <div style={styles.itemHeader}>
                        <span style={{ ...styles.actionTitle, color: cfg.color }}>
                          {cfg.title}
                        </span>
                        <span style={styles.timestamp} dir="ltr">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <div style={styles.actorRow}>
                        <User size={10} color="var(--text-muted)" />
                        <span style={styles.actorName}>{item.userName || 'مستخدم النظام'}</span>
                      </div>

                      {/* Prominent Revision Description Box */}
                      {item.description && (
                        <div
                          style={{
                            ...styles.descriptionBox,
                            backgroundColor: isRevision ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            borderColor: isRevision ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          {isRevision && (
                            <div style={styles.revisionNoticeTitle}>
                              <AlertTriangle size={11} color="var(--accent-yellow)" />
                              <span>ملاحظات التعديل المطلوبة من المشرف:</span>
                            </div>
                          )}
                          <div style={styles.descriptionText}>{item.description}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0c0c0e',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    marginTop: 10,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'var(--text-muted)',
    fontVariantNumeric: 'tabular-nums',
  },
  returnedWarningBadge: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 7px',
    borderRadius: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(245, 158, 11, 0.35)',
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    padding: 4,
    borderRadius: 4,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: '12px 14px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '16px 0',
  },
  emptyText: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  timelineItem: {
    display: 'flex',
    gap: 12,
    position: 'relative',
  },
  nodeColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 22,
    flexShrink: 0,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid transparent',
    zIndex: 2,
  },
  connectingLine: {
    width: 1,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 4,
    marginBottom: -8,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionTitle: {
    fontSize: 11.5,
    fontWeight: 600,
  },
  timestamp: {
    fontSize: 10,
    color: 'var(--text-muted)',
    fontVariantNumeric: 'tabular-nums',
  },
  actorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  actorName: {
    fontSize: 10.5,
    color: 'var(--text-muted)',
  },
  descriptionBox: {
    marginTop: 4,
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  revisionNoticeTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-yellow)',
  },
  descriptionText: {
    fontSize: 11,
    color: '#e2e8f0',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
};
