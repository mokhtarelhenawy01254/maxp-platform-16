import React, { useState } from 'react';
import {
  CheckCircle2,
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
  AlertCircle,
  ImageIcon,
  Check,
  Edit3,
  Lock,
  Eye,
  EyeOff,
  Send,
  ClipboardCheck,
  Calendar,
} from 'lucide-react';
import { audioAlerts } from '../../utils/audioAlerts';
import { TaskDependencyBadge } from './TaskDependencyBadge';

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
  viewType?: 'my-tasks' | 'assigned-by-me' | 'all';
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
  const isInReview = rawStatus === 'IN_REVIEW' || rawStatus === 'PENDING_REVIEW';
  const isInProgress = rawStatus === 'IN_PROGRESS';
  const isOnHold = rawStatus === 'ON_HOLD';
  const isPending = !isCompleted && !isInReview && !isInProgress && !isOnHold;
  const isRunning = !isCompleted && !isInReview && activeTaskId === task.id;

  const attachments = task.taskAttachments || task.attachments || [];
  const watchers = task.taskWatchers || task.watchers || [];
  const isWatching = currentUserId
    ? watchers.some((w: any) => (w.userId || w.id || w.user?.id) === currentUserId)
    : false;

  const dependencies = task.taskDependencies || task.dependencies || [];
  const blockingDeps = dependencies.filter((d: any) => d.type === 'blocked_by' && d.taskId === task.id);
  const incompleteBlockingDeps = blockingDeps.filter((d: any) => String(d.dependsOn?.status || '').toUpperCase() !== 'COMPLETED');
  const hasBlocking = incompleteBlockingDeps.length > 0;

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

  const isUrgent = String(task.priority || '').toUpperCase() === 'URGENT';
  const isHigh = String(task.priority || '').toUpperCase() === 'HIGH';
  const isAssignedToMe = !task.assignedTo || task.assignedTo === currentUserId;
  const isCreatedByMe = task.createdBy === currentUserId;
  const canRunTask = isAssignedToMe;
  const canEditTask = isCreatedByMe || isAssignedToMe || isAdmin;
  const canApprove = isCreatedByMe || isAdmin;

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
    '';

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
    try {
      normalized = encodeURI(decodeURI(normalized));
    } catch {
      normalized = encodeURI(normalized);
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
        // Architectural edge indicator instead of glowing full box-shadow
        borderRight: isUrgent && !isCompleted
          ? '3px solid #ef4444'
          : isRunning
          ? '3px solid #0284c7'
          : isCompleted
          ? '3px solid var(--border-subtle)'
          : '3px solid transparent',
        borderColor: isUrgent && !isCompleted
          ? 'rgba(239, 68, 68, 0.3)'
          : isRunning
          ? 'rgba(56, 189, 248, 0.35)'
          : isCompleted
          ? 'var(--border-subtle)'
          : 'var(--border-default)',
        background: isUrgent && !isCompleted
          ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, var(--bg-surface) 100%)'
          : 'var(--bg-surface)',
      }}
    >
      {/* Top Row: Title + Primary Action + Compact Tools */}
      <div style={cardStyles.mainRow}>
        {/* Left / Info Cluster */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={cardStyles.titleRow}>
            {/* Title & Urgent Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
              <span
                style={{
                  ...cardStyles.taskTitle,
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                }}
              >
                {task.title}
              </span>

              {/* Urgent indicator: Clean, zero-emoji badge */}
              {isUrgent && !isCompleted && (
                <span style={cardStyles.urgentChip} title="مهمة ذات أولوية قصوى عاجلة">
                  <AlertCircle size={10} color="#ef4444" />
                  <span>عاجل</span>
                </span>
              )}

              {/* Blocking Dependencies Badge */}
              {hasBlocking && !isCompleted && (
                <span style={cardStyles.blockingChip} title="المهمة متوقفة على مهام أخرى">
                  <AlertTriangle size={10} color="#f59e0b" />
                  <span>محظورة ({incompleteBlockingDeps.length})</span>
                </span>
              )}

              {/* Live Running Stopwatch on Card */}
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

            {/* Smart Progressive Actions: Primary CTA + Utility Icons */}
            <div style={cardStyles.actionsGroup}>
              {/* PRIMARY ACTION BASED ON STATE & ROLE */}
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
                  style={cardStyles.secondaryBtn}
                  title="إعادة فتح المهمة والعمل عليها"
                  onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                >
                  <RotateCcw size={11} />
                  <span>إعادة فتح</span>
                </button>
              ) : isInReview ? (
                canApprove ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        audioAlerts.playTaskComplete();
                        onUpdateStatus?.(task.id, 'COMPLETED');
                      }}
                      style={cardStyles.primarySuccessBtn}
                      title="اعتماد تسليم المهمة وإغلاقها كـ مكتملة ومعتمدة 100%"
                      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    >
                      <CheckCircle2 size={12} color="#ffffff" />
                      <span>اعتماد</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        audioAlerts.playTaskReopen();
                        onUpdateStatus?.(task.id, 'IN_PROGRESS');
                      }}
                      style={cardStyles.secondaryWarningBtn}
                      title="إعادة المهمة للمنفذ مع طلب تعديلات"
                      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    >
                      <RotateCcw size={11} color="#f59e0b" />
                      <span>طلب تعديلات</span>
                    </button>
                  </div>
                ) : (
                  <span style={cardStyles.pendingReviewBadge} title="تم تسليم العمل وبانتظار اعتماد المكلّف أو الإدارة">
                    <Clock size={11} color="#c084fc" />
                    <span>بانتظار الاعتماد</span>
                  </span>
                )
              ) : (
                /* Task is In-Progress or Pending */
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {canRunTask ? (
                    isRunning ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStopTask?.();
                        }}
                        style={cardStyles.pauseRunnerBtn}
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
                        style={cardStyles.primaryStartBtn}
                        title="بدء تشغيل المهمة واحتساب وقت الإنجاز"
                        onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                        onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                      >
                        <Play size={10} fill="#ffffff" color="#ffffff" />
                        <span>بدء العمل</span>
                      </button>
                    )
                  ) : isInProgress ? (
                    <span style={cardStyles.inProgressOtherBadge} title={`المهمة قيد التنفيذ حالياً بواسطة: ${assigneeName}`}>
                      <span style={cardStyles.pulsingDot} />
                      <span>جاري العمل: {assigneeName}</span>
                    </span>
                  ) : (
                    <span style={cardStyles.assignedOtherBadge} title={`المهمة موكلة للزميل: ${assigneeName}`}>
                      <Lock size={10} color="#71717a" />
                      <span>موكلة لـ {assigneeName}</span>
                    </span>
                  )}

                  {/* Submission Actions */}
                  {canApprove ? (
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
                      style={cardStyles.directCompleteBtn}
                      title="اعتماد وإنجاز المهمة مباشرة (المكتمل)"
                      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    >
                      <Check size={11} color="#22c55e" />
                      <span>إنجاز مباشر</span>
                    </button>
                  ) : canRunTask ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        audioAlerts.playTaskComplete();
                        if (onUpdateStatus) {
                          onUpdateStatus(task.id, 'IN_REVIEW');
                        } else {
                          onToggleStatus(task.id, 'IN_REVIEW');
                        }
                      }}
                      style={cardStyles.submitReviewBtn}
                      title="تسليم العمل للمراجعة والاعتماد من قبل الإدارة / المكلّف"
                      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    >
                      <Send size={11} color="#c084fc" />
                      <span>تسليم</span>
                    </button>
                  ) : null}
                </div>
              )}

              {/* SECONDARY UTILITY ACTIONS CLUSTER (Clean Icon-Only Buttons) */}
              <div style={cardStyles.utilityActionsCluster}>
                {/* Edit Button */}
                {canEditTask && onEdit && !isCompleted && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task);
                    }}
                    style={cardStyles.iconActionBtn}
                    title="تعديل تفاصيل المهمة"
                  >
                    <Edit3 size={13} color="#94a3b8" />
                  </button>
                )}

                {/* Watch / Unwatch quick button */}
                {currentUserId && (
                  <button
                    type="button"
                    onClick={handleToggleWatch}
                    style={{
                      ...cardStyles.iconActionBtn,
                      color: isWatching ? '#38bdf8' : '#71717a',
                      backgroundColor: isWatching ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                    }}
                    title={
                      isWatching
                        ? 'أنت تتابع هذه المهمة (انقر لإلغاء المتابعة)'
                        : 'متابعة المهمة لتلقي الإشعارات الفورية'
                    }
                  >
                    {isWatching ? <Eye size={13} color="#38bdf8" /> : <EyeOff size={13} color="#71717a" />}
                  </button>
                )}

                {/* Expand description toggle */}
                {task.description && task.description !== task.title && (
                  <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    style={cardStyles.iconActionBtn}
                    title={expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل والملاحظات'}
                  >
                    {expanded ? <ChevronUp size={13} color="#94a3b8" /> : <ChevronDown size={13} color="#94a3b8" />}
                  </button>
                )}

                {/* Web link */}
                <button
                  type="button"
                  onClick={handleOpenInWeb}
                  style={cardStyles.iconActionBtn}
                  title="فتح في لوحة التحكم الكاملة على الويب"
                >
                  <ExternalLink size={13} color="#94a3b8" />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Description & Dependencies */}
          {expanded && (
            <>
              {task.description && (
                <div style={cardStyles.descBox}>{task.description}</div>
              )}
              <TaskDependencyBadge taskId={task.id} />
            </>
          )}

          {/* Bottom Row: Disciplined Metadata Chips (Zero Emoji Littering) */}
          <div style={cardStyles.metaRow}>
            {/* Status Indicator */}
            <span
              style={{
                ...cardStyles.statusPill,
                color: isCompleted
                  ? 'var(--accent-green)'
                  : isInReview
                  ? '#c084fc'
                  : isInProgress
                  ? '#38bdf8'
                  : isOnHold
                  ? '#f59e0b'
                  : 'var(--text-secondary)',
                backgroundColor: isCompleted
                  ? 'rgba(34, 197, 94, 0.08)'
                  : isInReview
                  ? 'rgba(168, 85, 247, 0.08)'
                  : isInProgress
                  ? 'rgba(56, 189, 248, 0.08)'
                  : isOnHold
                  ? 'rgba(245, 158, 11, 0.08)'
                  : 'rgba(255, 255, 255, 0.04)',
                borderColor: isCompleted
                  ? 'rgba(34, 197, 94, 0.25)'
                  : isInReview
                  ? 'rgba(168, 85, 247, 0.25)'
                  : isInProgress
                  ? 'rgba(56, 189, 248, 0.25)'
                  : isOnHold
                  ? 'rgba(245, 158, 11, 0.25)'
                  : 'var(--border-subtle)',
              }}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 size={11} color="var(--accent-green)" />
                  <span>مكتملة</span>
                </>
              ) : isInReview ? (
                <>
                  <ClipboardCheck size={11} color="#c084fc" />
                  <span>قيد الاعتماد</span>
                </>
              ) : isInProgress ? (
                <>
                  <Play size={10} fill="#38bdf8" color="#38bdf8" />
                  <span>قيد التنفيذ</span>
                </>
              ) : isOnHold ? (
                <>
                  <Pause size={10} color="#f59e0b" />
                  <span>معلقة</span>
                </>
              ) : (
                <>
                  <Clock size={11} color="var(--text-secondary)" />
                  <span>قيد الانتظار</span>
                </>
              )}
            </span>

            {/* High Priority Badge (Only show if HIGH - URGENT is already in header) */}
            {isHigh && !isCompleted && (
              <span style={cardStyles.highPriorityPill}>
                <AlertCircle size={10} color="#ef4444" />
                <span>أولوية مرتفعة</span>
              </span>
            )}

            {/* Estimated Time with Tabular Nums */}
            {(task.estimatedMinutes || task.estimatedHours) && (
              <span style={cardStyles.neutralPill} title="الوقت المقدر لإنجاز المهمة">
                <Clock size={11} color="#71717a" />
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {task.estimatedMinutes || task.estimatedHours * 60} دقيقة مقدرة
                </span>
              </span>
            )}

            {/* Creator Chip */}
            {creatorName && creatorName !== 'غير محدد' && (
              <span style={cardStyles.neutralPill} title={`أنشأها: ${creatorName}`}>
                <UserCheck size={11} color="#71717a" />
                <span>أنشأها: {creatorName}</span>
              </span>
            )}

            {/* Assignee Chip (Visible in Team View) */}
            {(viewType === 'assigned-by-me' || viewType === 'all') && (
              <span style={cardStyles.neutralPill} title={`المكلف بالتنفيذ: ${assigneeName}`}>
                <User size={11} color="#71717a" />
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

            {/* Unified Due Date / Overdue badge */}
            {task.dueDate && (
              <span
                style={{
                  ...cardStyles.duePill,
                  color: isOverdue ? '#f87171' : isDueSoon ? '#f59e0b' : 'var(--text-muted)',
                  borderColor: isOverdue
                    ? 'rgba(239, 68, 68, 0.3)'
                    : isDueSoon
                    ? 'rgba(245, 158, 11, 0.3)'
                    : 'var(--border-subtle)',
                  backgroundColor: isOverdue
                    ? 'rgba(239, 68, 68, 0.08)'
                    : isDueSoon
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'transparent',
                }}
              >
                {isOverdue ? (
                  <AlertTriangle size={11} color="#ef4444" />
                ) : isDueSoon ? (
                  <Clock size={11} color="#f59e0b" />
                ) : (
                  <Calendar size={11} color="#71717a" />
                )}
                <span>
                  {new Date(task.dueDate).toLocaleDateString('ar-EG', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {isOverdue && ` (${getOverdueText()})`}
                  {isDueSoon && ` (${getDueSoonText()})`}
                </span>
              </span>
            )}

            {/* Attachments Count Badge */}
            {attachments.length > 0 && (
              <span style={cardStyles.neutralPill} title={`${attachments.length} مرفقات`}>
                <Paperclip size={11} color="#71717a" />
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{attachments.length}</span>
              </span>
            )}

            {/* Watchers Count Badge */}
            {watchers.length > 0 && (
              <span
                style={cardStyles.neutralPill}
                title={`المتابعون للمهمة: ${watchers
                  .map((w: any) =>
                    w.user
                      ? `${w.user.firstName || ''} ${w.user.lastName || ''}`.trim() || w.user.email
                      : w.name || w.userId
                  )
                  .filter(Boolean)
                  .join('، ')}`}
              >
                <Eye size={11} color="#71717a" />
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{watchers.length}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Attachments Gallery: Dark-Mode Ergonomic Thumbnails */}
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
                      <ImageIcon size={10} color="#ffffff" />
                    </div>
                  </div>
                ) : (
                  <div style={cardStyles.docThumb}>
                    <Paperclip size={13} color="#94a3b8" />
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
    padding: '11px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    transition: 'all 140ms ease-out',
    boxShadow: 'none',
  },
  mainRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.4,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  urgentChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 4,
  },
  blockingChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: 4,
  },
  runningTimerChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    color: 'var(--accent-green)',
    fontSize: 11,
    padding: '1px 7px',
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
  actionsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  primaryStartBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0284c7',
    border: '1px solid #0369a1',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  pauseRunnerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-green)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  primarySuccessBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16a34a',
    border: '1px solid #15803d',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  secondaryWarningBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    padding: '4px 9px',
    fontSize: 11,
    fontWeight: 600,
    color: '#f59e0b',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  pendingReviewBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
    color: '#c084fc',
    fontSize: 11,
    fontWeight: 500,
    padding: '3px 8px',
    borderRadius: 5,
  },
  directCompleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    borderRadius: 6,
    padding: '4px 9px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-green)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  submitReviewBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
    borderRadius: 6,
    padding: '4px 9px',
    fontSize: 11,
    fontWeight: 600,
    color: '#c084fc',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '4px 9px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 140ms ease-out',
  },
  inProgressOtherBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    color: '#38bdf8',
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 5,
  },
  assignedOtherBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 5,
  },
  utilityActionsCluster: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    borderRight: '1px solid var(--border-subtle)',
    paddingRight: 6,
    marginRight: 4,
  },
  iconActionBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: '4px 5px',
    borderRadius: 5,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 120ms ease-out',
  },
  descBox: {
    marginTop: 6,
    padding: '6px 10px',
    backgroundColor: 'var(--bg-elevated)',
    borderRadius: 6,
    fontSize: 11,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    border: '1px solid var(--border-subtle)',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 4,
    border: '1px solid',
  },
  highPriorityPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    padding: '2px 7px',
    borderRadius: 4,
  },
  neutralPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    padding: '2px 7px',
    borderRadius: 4,
  },
  recurringPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#c084fc',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    padding: '2px 7px',
    borderRadius: 4,
  },
  duePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    padding: '2px 7px',
    borderRadius: 4,
    border: '1px solid',
    fontVariantNumeric: 'tabular-nums',
  },
  attachRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTop: '1px solid var(--border-subtle)',
    overflowX: 'auto',
  },
  attCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '3px 8px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    cursor: 'pointer',
    maxWidth: 180,
    flexShrink: 0,
    transition: 'all 120ms ease-out',
  },
  imgWrap: {
    position: 'relative',
    width: 30,
    height: 30,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#18181b',
    border: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imgOverlay: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 2,
    padding: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docThumb: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    gap: 1,
  },
  thumbName: {
    fontSize: 10,
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 110,
  },
  thumbSize: {
    fontSize: 9,
    color: 'var(--text-dim)',
    fontVariantNumeric: 'tabular-nums',
  },
};

export default TaskItemCard;
