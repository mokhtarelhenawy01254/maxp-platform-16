import React from 'react';
import {
  User,
  Calendar,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { TaskDependencyBadge } from '../TaskDependencyBadge';
import { cockpitSidebarStyles as styles } from './cockpitStyles';

interface TaskCockpitSidebarProps {
  task: any;
  currentUserId?: string;
  isAdmin?: boolean;
  onRefreshDeps?: () => void;
}

export const TaskCockpitSidebar: React.FC<TaskCockpitSidebarProps> = ({
  task,
  currentUserId = '',
  isAdmin = false,
  onRefreshDeps,
}) => {
  const isUrgent = String(task.priority || '').toUpperCase() === 'URGENT';
  const isHigh = String(task.priority || '').toUpperCase() === 'HIGH';
  const isCompleted = String(task.status || '').toUpperCase() === 'COMPLETED';

  const watchers = task.taskWatchers || task.watchers || [];
  const isWatching = currentUserId
    ? watchers.some((w: any) => (w.userId || w.id || w.user?.id) === currentUserId)
    : false;

  const handleToggleWatch = async () => {
    if (!currentUserId || !window.electronAPI) return;
    try {
      if (isWatching) {
        await window.electronAPI.removeWatcher(task.id, currentUserId);
      } else {
        await window.electronAPI.addWatcher(task.id, currentUserId);
      }
    } catch (err) {
      console.warn('[TaskCockpitSidebar] Toggle watch error:', err);
    }
  };

  const assigneeName =
    task.assigneeName ||
    `${task.assignee?.firstName || ''} ${task.assignee?.lastName || ''}`.trim() ||
    task.assignee?.email ||
    'غير محدد (مكلف بنفسي)';

  const creatorName =
    task.createdByName ||
    `${task.creator?.firstName || ''} ${task.creator?.lastName || ''}`.trim() ||
    task.creator?.email ||
    'غير معروف';

  const formatDueDate = () => {
    if (!task.dueDate) return 'غير محدد';
    const d = new Date(task.dueDate);
    return d.toLocaleDateString('ar-EG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue =
    Boolean(task.dueDate) &&
    !isCompleted &&
    new Date(task.dueDate).getTime() < Date.now();

  return (
    <aside style={styles.sidebar}>
      {/* Block: Assignee & Creator */}
      <div style={styles.card}>
        <span style={styles.cardHeader}>أطراف المهمة</span>

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>المكلف بالتنفيذ</span>
          <div style={styles.metaValue}>
            <div style={styles.avatar}>
              {assigneeName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 600 }}>{assigneeName}</span>
          </div>
        </div>

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>مُنشئ المهمة</span>
          <div style={styles.metaValue}>
            <div style={styles.avatarSecondary}>
              {creatorName.charAt(0).toUpperCase()}
            </div>
            <span>{creatorName}</span>
          </div>
        </div>
      </div>

      {/* Block: Schedule & Priority */}
      <div style={styles.card}>
        <span style={styles.cardHeader}>الجدول والأولوية</span>

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>تاريخ الاستحقاق</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar
              size={13}
              color={isOverdue ? 'var(--accent-red)' : 'var(--text-muted)'}
            />
            <span
              style={{
                color: isOverdue ? 'var(--accent-red)' : 'var(--text-primary)',
                fontWeight: isOverdue ? 600 : 400,
              }}
            >
              {formatDueDate()}
            </span>
          </div>
          {isOverdue && (
            <span style={styles.overdueBadge}>
              <AlertCircle size={10} />
              <span>متأخرة عن موعدها</span>
            </span>
          )}
        </div>

        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>الأولوية</span>
          <div style={styles.metaValue}>
            {isUrgent ? (
              <span style={styles.urgentPill}>عاجل وفوري</span>
            ) : isHigh ? (
              <span style={styles.highPill}>مرتفعة</span>
            ) : (
              <span style={styles.normalPill}>عادية</span>
            )}
          </div>
        </div>

        {task.estimatedMinutes && (
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>الوقت التقديري</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={12} color="var(--text-muted)" />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {task.estimatedMinutes} دقيقة
              </span>
            </div>
          </div>
        )}

        {task.projectName && (
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>المشروع</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Layers size={12} color="var(--accent-blue)" />
              <span>{task.projectName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Block: Watchers */}
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={styles.cardHeader}>المتابعون ({watchers.length})</span>
          <button
            type="button"
            onClick={handleToggleWatch}
            style={styles.watchToggleBtn}
            title={isWatching ? 'إلغاء المتابعة' : 'متابعة المهمة'}
          >
            {isWatching ? <EyeOff size={11} /> : <Eye size={11} />}
            <span>{isWatching ? 'إلغاء المتابعة' : 'متابعة'}</span>
          </button>
        </div>

        {watchers.length > 0 ? (
          <div style={styles.watchersList}>
            {watchers.map((w: any, idx: number) => {
              const name =
                w.name ||
                `${w.firstName || ''} ${w.lastName || ''}`.trim() ||
                w.email ||
                w.userId ||
                `متابع ${idx + 1}`;
              return (
                <div key={idx} style={styles.watcherChip} title={name}>
                  <div style={styles.miniAvatar}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span style={styles.watcherName}>{name}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
            لا يوجد متابعون حالياً.
          </span>
        )}
      </div>

      {/* Block: Blocking Dependencies */}
      <div style={styles.card}>
        <span style={styles.cardHeader}>التبعيات والارتباطات</span>
        <TaskDependencyBadge taskId={task.id} onRefresh={onRefreshDeps} />
      </div>
    </aside>
  );
};

