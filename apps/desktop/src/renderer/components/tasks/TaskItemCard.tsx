import React, { useState } from 'react';
import {
  CheckCircle2,
  Square,
  Clock,
  User,
  UserCheck,
  Repeat,
  Paperclip,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  ImageIcon,
  Check,
  Edit3,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { audioAlerts } from '../../utils/audioAlerts';

interface TaskItemCardProps {
  task: any;
  onToggleStatus: (taskId: string, currentStatus: string) => void;
  onUpdateStatus?: (taskId: string, newStatus: string) => void;
  onOpenImage: (imgUrl: string) => void;
  onEdit?: (task: any) => void;
  serverUrl?: string;
  authToken?: string;
  currentUserId?: string;
  isAdmin?: boolean;
  activeTaskId?: string | null;
  activeRunnerSeconds?: number;
  onStartTask?: (task: any) => void;
  onStopTask?: () => void;
  viewType?: 'my-tasks' | 'assigned-by-me';
}

export const TaskItemCard: React.FC<TaskItemCardProps> = ({
  task,
  onToggleStatus,
  onUpdateStatus,
  onOpenImage,
  onEdit,
  serverUrl = 'https://maxp.online',
  authToken = '',
  currentUserId = '',
  isAdmin = false,
  activeTaskId = null,
  activeRunnerSeconds = 0,
  onStartTask,
  onStopTask,
  viewType = 'my-tasks',
}) => {
  const [expanded, setExpanded] = useState(false);

  const rawStatus = String(task.status || '').toUpperCase();
  const isCompleted = rawStatus === 'COMPLETED';
  const isInProgress = rawStatus === 'IN_PROGRESS';
  const isOnHold = rawStatus === 'ON_HOLD';
  const isPending = !isCompleted && !isInProgress && !isOnHold;
  const isRunning = !isCompleted && activeTaskId === task.id;

  const attachments = task.taskAttachments || task.attachments || [];
  const watchers = task.taskWatchers || task.watchers || [];
  const isWatching = currentUserId
    ? watchers.some((w: any) => (w.userId || w.id || w.user?.id) === currentUserId)
    : false;

  const handleToggleWatch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    try {
      if (isWatching) {
        await window.electronAPI.removeWatcher(task.id, currentUserId);
      } else {
        await window.electronAPI.addWatcher(task.id, currentUserId);
      }
    } catch (err) {
      console.warn('[TaskItemCard] Failed to toggle watch:', err);
    }
  };

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

  const creatorName =
    task.createdByName ||
    `${task.creator?.firstName || ''} ${task.creator?.lastName || ''}`.trim() ||
    task.creator?.email ||
    'غير محدد';

  const assigneeName =
    task.assignedToName ||
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

  const formatRunnerTimer = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const handleOpenInWeb = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUrl = `${serverUrl.replace(/\/$/, '')}/tasks?taskId=${task.id}`;
    window.open(targetUrl, '_blank');
  };

  const isUrgent = String(task.priority || '').toUpperCase() === 'URGENT';
  const isAssignedToMe = !task.assignedTo || task.assignedTo === currentUserId;
  const isCreatedByMe = task.createdBy === currentUserId;
  const canRunTask = isAssignedToMe;
  const canEditTask = isCreatedByMe || isAssignedToMe || isAdmin;

  const resolveAttachmentUrl = (rawPath: string) => {
    if (!rawPath) return '';
    if (rawPath.startsWith('data:') || rawPath.startsWith('blob:')) {
      return rawPath;
    }
    const cleanRaw = rawPath.trim();
    if (cleanRaw.startsWith('http://') || cleanRaw.startsWith('https://')) {
      return cleanRaw;
    }
    let base = (serverUrl || 'https://maxp.online').trim().replace(/\/$/, '');
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = `https://${base}`;
    }
    let normalized = cleanRaw.replace(/\\/g, '/');
    if (!normalized.startsWith('/')) normalized = `/${normalized}`;
    if (!normalized.startsWith('/uploads/')) {
      if (normalized.startsWith('/tasks/')) {
        normalized = `/uploads${normalized}`;
      } else {
        normalized = `/uploads/tasks${normalized}`;
      }
    }
    return `${base}${normalized}`;
  };

  const isImgAttachment = (att: any) => {
    if (att.fileType?.startsWith('image/')) return true;
    const name = att.originalName || att.fileName || att.filePath || '';
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(name);
  };

  return (
    <div
      style={{
        ...cardStyles.card,
        opacity: isCompleted ? 0.72 : 1,
        borderColor: isUrgent && !isCompleted
          ? 'rgba(239, 68, 68, 0.65)'
          : isRunning
          ? 'rgba(56, 189, 248, 0.45)'
          : isCompleted
          ? 'rgba(255,255,255,0.04)'
          : 'var(--border-default)',
        boxShadow: isUrgent && !isCompleted
          ? '0 0 16px rgba(239, 68, 68, 0.15)'
          : isRunning
          ? '0 0 16px rgba(56, 189, 248, 0.1)'
          : 'none',
        background: isUrgent && !isCompleted
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, #121216 100%)'
          : '#121216',
      }}
    >
      {/* Main Row */}
      <div style={cardStyles.mainRow}>
        {/* Status Checkbox */}
        <button
          type="button"
          onClick={() => {
            if (isCompleted) {
              audioAlerts.playTaskReopen();
            } else {
              audioAlerts.playTaskComplete();
            }
            onToggleStatus(task.id, task.status);
          }}
          style={cardStyles.checkBtn}
          title={isCompleted ? 'إعادة إلى قيد التنفيذ' : 'تعليم كمكتملة'}
        >
          {isCompleted ? (
            <CheckCircle2 size={19} color="#22c55e" />
          ) : (
            <Square size={19} color={isUrgent ? '#f87171' : '#71717a'} />
          )}
        </button>

        {/* Info Column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={cardStyles.titleRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              <span
                style={{
                  ...cardStyles.taskTitle,
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  color: isCompleted ? '#a1a1aa' : '#fafafa',
                }}
              >
                {task.title}
              </span>

              {/* Urgent Badge */}
              {isUrgent && !isCompleted && (
                <span
                  style={{
                    background: 'rgba(239, 68, 68, 0.18)',
                    color: 'var(--accent-red-dim)',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  🚨 عاجل وفوري
                </span>
              )}

              {/* Live Stopwatch Badge on Card (if this task is running) */}
              {isRunning && (
                <span style={cardStyles.runningTimerChip}>
                  <span style={cardStyles.pulsingDot} />
                  <Clock size={11} color="#22c55e" />
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    {formatRunnerTimer(activeRunnerSeconds)}
                  </span>
                </span>
              )}
            </div>

            {/* Smart Action Buttons (One-Click Status Transitions) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Edit Button for Authorized Users */}
              {canEditTask && onEdit && !isCompleted && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  style={cardStyles.actionBtn}
                  title="تعديل تفاصيل المهمة"
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <Edit3 size={11} color="#38bdf8" />
                  <span>تعديل</span>
                </button>
              )}

              {/* If Task is COMPLETED: Reopen button */}
              {isCompleted ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    audioAlerts.playTaskReopen();
                    if (onUpdateStatus) {
                      onUpdateStatus(task.id, 'IN_PROGRESS');
                    } else {
                      onToggleStatus(task.id, task.status);
                    }
                  }}
                  style={cardStyles.reopenBtn}
                  title="إعادة فتح المهمة والعمل عليها"
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <RotateCcw size={11} />
                  <span>إعادة فتح</span>
                </button>
              ) : (
                <>
                  {/* Start / Pause Task Runner (Locked if not assigned to me) */}
                  {canRunTask ? (
                    isRunning ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStopTask?.();
                        }}
                        style={cardStyles.activeRunnerBtn}
                        title="المشغل يعمل الآن — انقر للإيقاف المؤقت"
                        onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                        onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                      >
                        <Pause size={11} color="#22c55e" />
                        <span>إيقاف مؤقت</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          audioAlerts.playTaskStart();
                          onStartTask?.(task);
                        }}
                        style={cardStyles.startRunnerBtn}
                        title="بدء تشغيل المهمة واحتساب وقت الإنجاز"
                        onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                        onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                      >
                        <Play size={10} fill="#38bdf8" color="#38bdf8" />
                        <span>بدء العمل</span>
                      </button>
                    )
                  ) : isInProgress ? (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.1)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                      title={`المهمة قيد التنفيذ حالياً بواسطة: ${assigneeName}`}
                    >
                      <span style={cardStyles.pulsingDot} />
                      <span>جاري العمل: {assigneeName}</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-dim)',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border-subtle)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title={`المهمة موكلة للزميل: ${assigneeName}`}
                    >
                      <Lock size={11} color="#71717a" />
                      <span>موكلة لـ {assigneeName}</span>
                    </span>
                  )}

                  {/* Fast Complete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      audioAlerts.playTaskComplete();
                      if (onUpdateStatus) {
                        onUpdateStatus(task.id, 'COMPLETED');
                      } else {
                        onToggleStatus(task.id, task.status);
                      }
                    }}
                    style={cardStyles.quickDoneBtn}
                    title="تعليم المهمة كمكتملة وتوثيق إنجازها"
                    onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                    onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    <Check size={11} color="#22c55e" />
                    <span>إنجاز</span>
                  </button>
                </>
              )}

              {/* Expand description toggle */}
              {task.description && task.description !== task.title && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  style={cardStyles.iconBtn}
                  title="عرض التفاصيل والملاحظات"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}

              {/* Watch / Unwatch quick button */}
              {currentUserId && (
                <button
                  type="button"
                  onClick={handleToggleWatch}
                  style={{
                    ...cardStyles.iconBtn,
                    color: isWatching ? '#38bdf8' : '#71717a',
                    backgroundColor: isWatching ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  }}
                  title={
                    isWatching
                      ? 'أنت تتابع هذه المهمة (انقر لإلغاء المتابعة)'
                      : 'متابعة المهمة لتلقي الإشعارات الفورية'
                  }
                >
                  {isWatching ? <Eye size={13} color="#38bdf8" /> : <EyeOff size={13} />}
                </button>
              )}

              {/* Web link */}
              <button
                type="button"
                onClick={handleOpenInWeb}
                style={cardStyles.iconBtn}
                title="فتح في لوحة التحكم الكاملة على الويب"
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
            {/* Status Chip */}
            <span
              style={{
                ...cardStyles.statusPill,
                color: isCompleted
                  ? '#22c55e'
                  : isInProgress
                  ? '#38bdf8'
                  : isOnHold
                  ? '#f59e0b'
                  : '#a1a1aa',
                backgroundColor: isCompleted
                  ? 'var(--accent-green-bg)'
                  : isInProgress
                  ? 'rgba(56, 189, 248, 0.1)'
                  : isOnHold
                  ? 'rgba(245, 158, 11, 0.1)'
                  : 'var(--border-subtle)',
                borderColor: isCompleted
                  ? 'var(--accent-green-border)'
                  : isInProgress
                  ? 'rgba(56, 189, 248, 0.25)'
                  : isOnHold
                  ? 'rgba(245, 158, 11, 0.25)'
                  : 'var(--border-default)',
              }}
            >
              {isCompleted
                ? '✓ مكتملة'
                : isInProgress
                ? '⚡ قيد التنفيذ'
                : isOnHold
                ? '⏸ معلقة'
                : '⏳ قيد الانتظار'}
            </span>

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

            {/* Estimated Time */}
            {(task.estimatedMinutes || task.estimatedHours) && (
              <span
                style={{
                  ...cardStyles.pill,
                  color: '#38bdf8',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  borderColor: 'rgba(56, 189, 248, 0.25)',
                }}
                title="الوقت المقدر لإنجاز المهمة"
              >
                <Clock size={11} color="#38bdf8" />
                <span>المتوقع: {task.estimatedMinutes || (task.estimatedHours * 60)} دقيقة</span>
              </span>
            )}

            {/* Creator Chip (Always visible in my-tasks so employee knows who created it) */}
            {viewType === 'my-tasks' && creatorName && creatorName !== 'غير محدد' && (
              <span style={cardStyles.creatorPill} title={`أنشأها: ${creatorName}`}>
                <UserCheck size={11} color="#38bdf8" />
                <span>أنشأها: {creatorName}</span>
              </span>
            )}

            {/* Assignee Chip */}
            {viewType === 'assigned-by-me' && (
              <span style={cardStyles.assigneePill} title={`المكلف بالتنفيذ: ${assigneeName}`}>
                <User size={11} color="#94a3b8" />
                <span>المكلف: {assigneeName}</span>
              </span>
            )}

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
                  borderColor: isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)',
                  backgroundColor: isOverdue ? 'var(--accent-red-bg)' : 'transparent',
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

            {/* Attachments Count Badge */}
            {attachments.length > 0 && (
              <span style={cardStyles.attCountPill}>
                <Paperclip size={11} />
                <span>{attachments.length} مرفق</span>
              </span>
            )}

            {/* Watchers Count Badge */}
            {watchers.length > 0 && (
              <span
                style={{
                  ...cardStyles.pill,
                  color: '#c084fc',
                  backgroundColor: 'rgba(192, 132, 252, 0.1)',
                  borderColor: 'rgba(192, 132, 252, 0.25)',
                }}
                title={`المتابعون للمهمة: ${watchers
                  .map((w: any) =>
                    w.user
                      ? `${w.user.firstName || ''} ${w.user.lastName || ''}`.trim() || w.user.email
                      : w.name || w.userId
                  )
                  .filter(Boolean)
                  .join('، ')}`}
              >
                <Eye size={11} color="#c084fc" />
                <span>{watchers.length} متابع</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Attachments Gallery (Clean Visual Thumbnails for Screenshots/Photos) */}
      {attachments.length > 0 && (
        <div style={cardStyles.attachRow}>
          {attachments.map((att: any, idx: number) => {
            const rawPath = att.filePath || '';
            const fullUrl = resolveAttachmentUrl(rawPath);
            const isImg = isImgAttachment(att);
            const label = att.originalName || att.fileName || `مرفق ${idx + 1}`;

            return (
              <div
                key={att.id || att.fileName || idx}
                onClick={() => onOpenImage(fullUrl)}
                style={cardStyles.attCard}
                title={`انقر للمعاينة الكاملة: ${label}`}
              >
                {isImg ? (
                  <div style={cardStyles.imgWrap}>
                    <img
                      src={fullUrl}
                      alt={label}
                      style={cardStyles.thumbImg}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                      }}
                    />
                    <div style={cardStyles.imgOverlay}>
                      <ImageIcon size={12} color="#ffffff" />
                    </div>
                  </div>
                ) : (
                  <div style={cardStyles.docThumb}>
                    <Paperclip size={16} color="#38bdf8" />
                  </div>
                )}
                <div style={cardStyles.attInfo}>
                  <span style={cardStyles.thumbName}>{label}</span>
                  {att.fileSize && (
                    <span style={cardStyles.thumbSize}>
                      {Math.round(att.fileSize / 1024)} KB
                    </span>
                  )}
                </div>
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
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
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
    fontWeight: 600,
    lineHeight: 1.4,
  },
  runningTimerChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    color: 'var(--accent-green)',
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 5,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 0 6px rgba(34, 197, 94, 0.9)',
    display: 'inline-block',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: 3,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-strong)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  startRunnerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 11,
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
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-green)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  quickDoneBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-green)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  reopenBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'var(--border-subtle)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  descBox: {
    marginTop: 6,
    padding: '6px 10px',
    backgroundColor: '#0a0a0d',
    borderRadius: 6,
    fontSize: 11,
    color: 'var(--text-muted)',
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
  statusPill: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid',
  },
  pill: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid transparent',
  },
  creatorPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    padding: '2px 7px',
    borderRadius: 4,
  },
  assigneePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-subtle)',
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
    alignItems: 'stretch',
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    overflowX: 'auto',
  },
  attCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 8px',
    backgroundColor: '#0a0a0d',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    cursor: 'pointer',
    maxWidth: 220,
    flexShrink: 0,
    transition: 'all 120ms ease-out',
  },
  imgWrap: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'var(--bg-elevated)',
    flexShrink: 0,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imgOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'var(--bg-overlay)',
    borderRadius: 3,
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docThumb: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: 'var(--bg-elevated)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    gap: 2,
  },
  thumbName: {
    fontSize: 10,
    fontWeight: 500,
    color: '#f4f4f5',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 140,
  },
  thumbSize: {
    fontSize: 9,
    color: 'var(--text-dim)',
    fontVariantNumeric: 'tabular-nums',
  },
  overduePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--accent-red)',
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
    color: 'var(--accent-yellow)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '2px 7px',
    borderRadius: 4,
    fontVariantNumeric: 'tabular-nums',
  },
};

export default TaskItemCard;
