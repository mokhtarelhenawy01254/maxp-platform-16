import React, { useState } from 'react';
import {
  CheckCircle2,
  Square,
  Clock,
  User,
  Repeat,
  Paperclip,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  AlertTriangle,
} from 'lucide-react';

interface TaskItemCardProps {
  task: any;
  onToggleStatus: (taskId: string, currentStatus: string) => void;
  onOpenImage: (imgUrl: string) => void;
  serverUrl?: string;
  activeTaskId?: string | null;
  onStartTask?: (task: any) => void;
  onStopTask?: () => void;
  viewType?: 'my-tasks' | 'assigned-by-me';
}

export const TaskItemCard: React.FC<TaskItemCardProps> = ({
  task,
  onToggleStatus,
  onOpenImage,
  serverUrl = 'https://maxp.online',
  activeTaskId = null,
  onStartTask,
  onStopTask,
  viewType = 'my-tasks',
}) => {
  const [expanded, setExpanded] = useState(false);

  const isCompleted = String(task.status || '').toUpperCase() === 'COMPLETED';
  const isRunning = activeTaskId === task.id;
  const attachments = task.taskAttachments || [];

  const priorityColor = (p: string) => {
    const norm = String(p || '').toUpperCase();
    if (norm === 'URGENT' || norm === 'HIGH') return '#ef4444';
    if (norm === 'MEDIUM') return '#38bdf8';
    return '#a1a1aa';
  };

  const priorityLabel = (p: string) => {
    const norm = String(p || '').toUpperCase();
    if (norm === 'URGENT') return 'عاجل جداً';
    if (norm === 'HIGH') return 'مرتفع';
    if (norm === 'MEDIUM') return 'عادي';
    return 'منخفض';
  };

  const recurringLabel = (rule: string) => {
    const norm = String(rule || '').toUpperCase();
    if (norm === 'DAILY') return 'يومي';
    if (norm === 'WEEKLY') return 'أسبوعي';
    if (norm === 'MONTHLY') return 'شهري';
    return 'متكرر';
  };

  const assigneeName =
    task.assignee?.name ||
    `${task.assignee?.firstName || ''} ${task.assignee?.lastName || ''}`.trim() ||
    task.assignee?.email ||
    'غير محدد';

  const now = Date.now();
  const dueTime = task.dueDate ? new Date(task.dueDate).getTime() : null;
  const diffMs = dueTime ? dueTime - now : null;

  const isOverdue = !!dueTime && !isCompleted && diffMs! < 0;
  const isDueSoon = !!dueTime && !isCompleted && !isOverdue && diffMs! <= 24 * 60 * 60 * 1000;

  const getOverdueText = () => {
    if (!diffMs) return '';
    const hours = Math.floor(Math.abs(diffMs) / 3600000);
    const days = Math.floor(hours / 24);
    if (days >= 1) return `متأخرة ${days} يوم`;
    return `متأخرة ${Math.max(1, hours)} س`;
  };

  const getDueSoonText = () => {
    if (!diffMs) return '';
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (hours >= 1) return `متبقي ${hours} س`;
    return `متبقي ${Math.max(1, mins)} د`;
  };

  const handleOpenInWeb = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUrl = `${serverUrl.replace(/\/$/, '')}/tasks?taskId=${task.id}`;
    window.open(targetUrl, '_blank');
  };

  return (
    <div
      style={{
        ...cardStyles.card,
        opacity: isCompleted ? 0.65 : 1,
        borderColor: isRunning
          ? 'rgba(56, 189, 248, 0.45)'
          : isCompleted
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.08)',
        boxShadow: isRunning ? '0 0 16px rgba(56, 189, 248, 0.1)' : 'none',
      }}
    >
      {/* Main Row */}
      <div style={cardStyles.mainRow}>
        {/* Status Checkbox */}
        <button
          type="button"
          onClick={() => onToggleStatus(task.id, task.status)}
          style={cardStyles.checkBtn}
          title={isCompleted ? 'إعادة إلى قيد التنفيذ' : 'تعليم كمكتمل'}
        >
          {isCompleted ? (
            <CheckCircle2 size={18} color="#22c55e" />
          ) : (
            <Square size={18} color="#71717a" />
          )}
        </button>

        {/* Info Column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={cardStyles.titleRow}>
            <span
              style={{
                ...cardStyles.taskTitle,
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? '#a1a1aa' : '#fafafa',
              }}
            >
              {task.title}
            </span>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Task Runner Action Button */}
              {!isCompleted && (
                isRunning ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onStopTask?.(); }}
                    style={cardStyles.activeRunnerBtn}
                    title="المشغل يعمل الآن — انقر للإيقاف المؤقت"
                    onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                    onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    <span style={cardStyles.pulsingDot} />
                    <Pause size={11} color="#ffffff" />
                    <span>المشغل نشط</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onStartTask?.(task); }}
                    style={cardStyles.startRunnerBtn}
                    title="بدء تشغيل المهمة واحتساب وقت الإنجاز"
                    onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                    onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    <Play size={10} fill="#38bdf8" color="#38bdf8" />
                    <span>بدء العمل</span>
                  </button>
                )
              )}

              {task.description && task.description !== task.title && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  style={cardStyles.iconBtn}
                  title="عرض التفاصيل"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenInWeb}
                style={cardStyles.iconBtn}
                title="فتح في لوحة التحكم الكاملة"
              >
                <ExternalLink size={13} />
              </button>
            </div>
          </div>

          {/* Expanded Description */}
          {expanded && task.description && (
            <div style={cardStyles.descBox}>{task.description}</div>
          )}

          {/* Meta Chips Row */}
          <div style={cardStyles.metaRow}>
            {/* Priority */}
            <span
              style={{
                ...cardStyles.pill,
                color: priorityColor(task.priority),
                backgroundColor: `${priorityColor(task.priority)}15`,
                borderColor: `${priorityColor(task.priority)}30`,
              }}
            >
              {priorityLabel(task.priority)}
            </span>

            {/* Assignee */}
            <span style={cardStyles.assigneePill}>
              <User size={11} color="#94a3b8" />
              <span>{assigneeName}</span>
            </span>

            {/* Recurring */}
            {task.isRecurring && (
              <span style={cardStyles.recurringPill}>
                <Repeat size={11} color="#a855f7" />
                <span>{recurringLabel(task.recurringRule)}</span>
              </span>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <span
                style={{
                  ...cardStyles.duePill,
                  color: isOverdue ? '#f87171' : '#94a3b8',
                  borderColor: isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.06)',
                  backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                }}
              >
                <Clock size={11} />
                <span>
                  {new Date(task.dueDate).toLocaleDateString('ar-EG', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </span>
            )}

            {/* Overdue Badge */}
            {isOverdue && (
              <span style={cardStyles.overduePill}>
                <AlertTriangle size={11} color="#ef4444" />
                <span>{getOverdueText()}</span>
              </span>
            )}

            {/* Due Soon Badge */}
            {isDueSoon && (
              <span style={cardStyles.dueSoonPill}>
                <Clock size={11} color="#f59e0b" />
                <span>{getDueSoonText()}</span>
              </span>
            )}

            {/* Delegated Task Completed Badge */}
            {isCompleted && viewType === 'assigned-by-me' && (
              <span style={cardStyles.delegatedDonePill}>
                <CheckCircle2 size={11} color="#22c55e" />
                <span>أنجزها: {assigneeName}</span>
              </span>
            )}

            {/* Attachments Count */}
            {attachments.length > 0 && (
              <span style={cardStyles.attCountPill}>
                <Paperclip size={11} />
                <span>{attachments.length} مرفق</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Attachments Thumbnails (if any) */}
      {attachments.length > 0 && (
        <div style={cardStyles.attachRow}>
          {attachments.map((att: any) => {
            const rawPath = att.filePath || '';
            const fullUrl = rawPath.startsWith('http')
              ? rawPath
              : `${serverUrl.replace(/\/$/, '')}${rawPath}`;
            const isImg =
              att.fileType?.startsWith('image/') ||
              /\.(png|jpe?g|webp|gif)$/i.test(att.fileName || '');

            return (
              <div
                key={att.id || att.fileName}
                onClick={() => onOpenImage(fullUrl)}
                style={cardStyles.attThumbWrap}
                title={`معاينة: ${att.originalName || att.fileName}`}
              >
                {isImg ? (
                  <img src={fullUrl} alt="" style={cardStyles.thumbImg} />
                ) : (
                  <div style={cardStyles.docThumb}>
                    <Paperclip size={14} color="#38bdf8" />
                  </div>
                )}
                <span style={cardStyles.thumbName}>{att.originalName || att.fileName}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    transition: 'all 150ms ease-out',
  },
  mainRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    marginTop: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.4,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    padding: 3,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
  },
  descBox: {
    marginTop: 6,
    padding: '6px 10px',
    backgroundColor: '#0a0a0d',
    borderRadius: 6,
    fontSize: 11,
    color: '#a1a1aa',
    lineHeight: 1.5,
    border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  pill: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid transparent',
  },
  assigneePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#e4e4e7',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '2px 6px',
    borderRadius: 4,
  },
  recurringPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#c084fc',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
    padding: '2px 6px',
    borderRadius: 4,
  },
  duePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid',
    fontVariantNumeric: 'tabular-nums',
  },
  attCountPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    padding: '2px 6px',
    borderRadius: 4,
  },
  attachRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    overflowX: 'auto',
  },
  attThumbWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 6px',
    backgroundColor: '#0a0a0d',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    cursor: 'pointer',
    maxWidth: 160,
    flexShrink: 0,
  },
  thumbImg: {
    width: 24,
    height: 24,
    borderRadius: 3,
    objectFit: 'cover',
  },
  docThumb: {
    width: 24,
    height: 24,
    borderRadius: 3,
    backgroundColor: '#18181b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbName: {
    fontSize: 10,
    color: '#d4d4d8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  startRunnerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 600,
    color: '#38bdf8',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  activeRunnerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.4)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 600,
    color: '#22c55e',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    boxShadow: '0 0 6px rgba(34, 197, 94, 0.9)',
    display: 'inline-block',
  },
  overduePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '2px 7px',
    borderRadius: 4,
    fontVariantNumeric: 'tabular-nums',
  },
  dueSoonPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '2px 7px',
    borderRadius: 4,
    fontVariantNumeric: 'tabular-nums',
  },
  delegatedDonePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    padding: '2px 7px',
    borderRadius: 4,
  },
};

export default TaskItemCard;
