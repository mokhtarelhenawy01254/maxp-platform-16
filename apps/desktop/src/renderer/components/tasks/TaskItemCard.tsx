import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  User,
  Paperclip,
  ExternalLink,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Edit3,
  Lock,
  Eye,
  EyeOff,
  Send,
  ClipboardCheck,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { audioAlerts } from '../../utils/audioAlerts';
import { ReturnForRevisionModal } from './ReturnForRevisionModal';

interface TaskItemCardProps {
  task: any;
  onToggleStatus: (taskId: string, currentStatus: string) => void;
  onUpdateStatus?: (taskId: string, newStatus: string, revisionReason?: string) => void;
  onOpenImage: (imgUrl: string) => void;
  onEdit?: (task: any) => void;
  onSelect?: (task: any) => void;
  isSelected?: boolean;
  serverUrl?: string;
  authToken?: string;
  currentUserId?: string;
  isAdmin?: boolean;
  activeTaskId?: string | null;
  activeTaskIds?: Record<string, number>;
  activeRunnerSeconds?: number;
  onStartTask?: (task: any) => void;
  onStopTask?: (taskId?: string) => void;
  viewType?: 'my-tasks' | 'assigned-by-me' | 'all';
}

export const TaskItemCard: React.FC<TaskItemCardProps> = ({
  task,
  onToggleStatus,
  onUpdateStatus,
  onOpenImage,
  onEdit,
  onSelect,
  isSelected = false,
  serverUrl = 'https://maxp.online',
  authToken = '',
  currentUserId = '',
  isAdmin = false,
  activeTaskId = null,
  activeTaskIds,
  activeRunnerSeconds = 0,
  onStartTask,
  onStopTask,
  viewType = 'my-tasks',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  const handleCopyDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = task.description || task.title || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const rawStatus = String(task.status || '').toUpperCase();
  const isCompleted = rawStatus === 'COMPLETED';
  const isInReview = rawStatus === 'IN_REVIEW' || rawStatus === 'PENDING_REVIEW';
  const isInProgress = rawStatus === 'IN_PROGRESS';
  const isOnHold = rawStatus === 'ON_HOLD';

  const parsedTags: string[] = Array.isArray(task.tags)
    ? task.tags
    : typeof task.tags === 'string'
    ? (() => {
        try {
          const p = JSON.parse(task.tags);
          return Array.isArray(p) ? p : [task.tags];
        } catch {
          return task.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      })()
    : [];
  const isReturnedForRevision = parsedTags.includes('needs_revision') || rawStatus === 'REVISION';

  const isMultiRunning = activeTaskIds ? activeTaskIds[task.id] !== undefined : false;
  const isRunning = !isCompleted && !isInReview && (activeTaskId === task.id || isMultiRunning);
  const currentElapsed = isMultiRunning && activeTaskIds ? activeTaskIds[task.id] : activeRunnerSeconds;

  const attachments = task.taskAttachments || task.attachments || [];
  const watchers = task.taskWatchers || task.watchers || [];
  const isWatching = currentUserId
    ? watchers.some((w: any) => (w.userId || w.id || w.user?.id) === currentUserId)
    : false;

  const dependencies = task.taskDependencies || task.dependencies || [];
  const blockingDeps = dependencies.filter((d: any) => d.type === 'blocked_by' && d.taskId === task.id);
  const incompleteBlockingDeps = blockingDeps.filter(
    (d: any) => String(d.dependsOn?.status || '').toUpperCase() !== 'COMPLETED'
  );
  const hasBlocking = incompleteBlockingDeps.length > 0;

  const handleToggleWatch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId || !window.electronAPI) return;
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
    if (days >= 1) return `${days}ي`;
    return `${Math.max(1, hours)}س`;
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
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(targetUrl);
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const targetPerson = viewType === 'my-tasks' ? (creatorName || 'مخصص') : assigneeName;

  const visibilityReason = isAssignedToMe
    ? { label: 'مكلف بالتنفيذ', bg: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }
    : isCreatedByMe
    ? { label: 'أنشأتها', bg: 'rgba(168, 85, 247, 0.12)', color: '#c084fc' }
    : isWatching
    ? { label: 'متابع', bg: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }
    : isAdmin
    ? { label: 'إشراف إداري', bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' }
    : { label: 'فريق', bg: 'rgba(255, 255, 255, 0.05)', color: '#a1a1aa' };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderBottom: '1px solid var(--border-subtle)',
        borderRight: isSelected
          ? '3px solid #38bdf8'
          : isReturnedForRevision && !isCompleted
          ? '3px solid #f59e0b'
          : isUrgent && !isCompleted
          ? '3px solid #ef4444'
          : isRunning
          ? '3px solid #0284c7'
          : isCompleted
          ? '3px solid var(--border-subtle)'
          : '3px solid transparent',
        backgroundColor: isSelected
          ? 'rgba(56, 189, 248, 0.10)'
          : isReturnedForRevision && !isCompleted
          ? 'rgba(245, 158, 11, 0.05)'
          : isRunning
          ? 'rgba(56, 189, 248, 0.05)'
          : isHovered
          ? 'var(--bg-hover)'
          : 'transparent',
        transition: 'background-color 100ms ease-out',
        opacity: isCompleted ? 0.65 : 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* High-Density Linear Row (Strictly 44px Fixed Height) */}
      <div
        style={rowStyles.mainRow}
        onClick={() => onSelect?.(task)}
        title="انقر لعرض تفاصيل المهمة والملاحظات والمرفقات"
      >
        {/* Col 1: Status Icon + Title + Priority/Dep Pills + Attachments Badge */}
        <div style={rowStyles.titleCol}>
          {/* Status Indicator Icon */}
          <div style={rowStyles.statusIconWrapper}>
            {isCompleted ? (
              <CheckCircle2 size={16} color="var(--accent-green)" />
            ) : isInReview ? (
              <ClipboardCheck size={15} color="#c084fc" />
            ) : isReturnedForRevision ? (
              <RotateCcw size={13} color="#f59e0b" />
            ) : isRunning ? (
              <span style={rowStyles.pulseDotGreen} />
            ) : isInProgress ? (
              <Play size={12} fill="#38bdf8" color="#38bdf8" />
            ) : isOnHold ? (
              <Pause size={12} color="#f59e0b" />
            ) : (
              <Clock size={13} color="#71717a" />
            )}
          </div>

          {/* Task Title with BiDi protection */}
          <span
            dir="auto"
            style={{
              ...rowStyles.taskTitle,
              unicodeBidi: 'plaintext',
              textAlign: 'start',
              textDecoration: isCompleted ? 'line-through' : 'none',
              color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
            }}
            title={task.title}
          >
            {task.title}
          </span>

          {/* Distinct Revision Badge for Returned Tasks */}
          {isReturnedForRevision && !isCompleted && (
            <span style={rowStyles.revisionBadge} title="مهمة مُعادة للتعديل — انقر لعرض ملاحظات المشرف">
              <RotateCcw size={9} color="#f59e0b" />
              <span>مُعادة للتعديل</span>
            </span>
          )}

          {/* Ergonomic Priority Indicators */}
          {isUrgent && !isCompleted && (
            <span style={rowStyles.urgentBadge} title="أولوية قصوى - عاجل">
              <AlertCircle size={11} />
              <span>عاجل</span>
            </span>
          )}
          {isHigh && !isCompleted && !isUrgent && (
            <span style={rowStyles.highBadge} title="أولوية مرتفعة">
              <span style={rowStyles.highDot} />
              <span>مرتفع</span>
            </span>
          )}

          {/* Blocking Dependencies Badge */}
          {hasBlocking && !isCompleted && (
            <span style={rowStyles.blockBadge} title="محظورة بمهام أخرى">
              <AlertTriangle size={10} />
              <span>{incompleteBlockingDeps.length}</span>
            </span>
          )}

          {/* Attachments Micro Badge */}
          {attachments.length > 0 && (
            <span
              style={rowStyles.attChip}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(task);
              }}
              title={`${attachments.length} مرفقات — انقر للمعاينة باللوحة`}
            >
              <Paperclip size={10} color="#94a3b8" />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{attachments.length}</span>
            </span>
          )}
        </div>

        {/* Col 2: Creator / Assignee */}
        <div
          style={rowStyles.personCol}
          title={`${viewType === 'my-tasks' ? `أنشأها: ${creatorName}` : `المكلف: ${assigneeName}`} (صلاحية الظهور: ${visibilityReason.label})`}
        >
          <User size={11} color="#71717a" />
          <span style={rowStyles.personName}>{targetPerson}</span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              padding: '1px 5px',
              borderRadius: 4,
              backgroundColor: visibilityReason.bg,
              color: visibilityReason.color,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {visibilityReason.label}
          </span>
        </div>

        {/* Col 3: Estimated Time */}
        <div style={rowStyles.estCol}>
          {(task.estimatedMinutes || task.estimatedHours) ? (
            <span style={rowStyles.monoText}>
              {task.estimatedMinutes || task.estimatedHours * 60} د
            </span>
          ) : (
            <span style={rowStyles.emptyCell}>—</span>
          )}
        </div>

        {/* Col 4: Due Date */}
        <div style={rowStyles.dueCol}>
          {task.dueDate ? (
            <span
              style={{
                ...rowStyles.monoText,
                color: isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : 'var(--text-dim)',
                fontWeight: isOverdue ? 600 : 400,
              }}
              title={new Date(task.dueDate).toLocaleString('ar-EG')}
            >
              <span dir="ltr">
                {new Date(task.dueDate).getDate()}/{new Date(task.dueDate).getMonth() + 1}
              </span>
              {isOverdue && (
                <span style={{ marginRight: 3, fontSize: 10, opacity: 0.85 }}>
                  · {getOverdueText()}
                </span>
              )}
            </span>
          ) : (
            <span style={rowStyles.emptyCell}>—</span>
          )}
        </div>

        {/* Col 5: Actions Area */}
        <div style={rowStyles.actionsCol} onClick={(e) => e.stopPropagation()}>
          {/* Hover Action Tools */}
          {isHovered && (
            <div style={rowStyles.hoverTools}>
              {/* One-Click Copy Description */}
              <button
                type="button"
                onClick={handleCopyDescription}
                style={{
                  ...rowStyles.iconBtn,
                  color: isCopied ? 'var(--accent-green)' : '#94a3b8',
                }}
                title={isCopied ? 'تم نسخ الوصف بنجاح!' : 'نسخ وصف المهمة بنقرة واحدة'}
              >
                {isCopied ? <CheckCheck size={11} color="var(--accent-green)" /> : <Copy size={11} />}
              </button>

              {canEditTask && onEdit && !isCompleted && (
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  style={rowStyles.iconBtn}
                  title="تعديل المهمة"
                >
                  <Edit3 size={11} color="#94a3b8" />
                </button>
              )}

              {currentUserId && (
                <button
                  type="button"
                  onClick={handleToggleWatch}
                  style={{
                    ...rowStyles.iconBtn,
                    color: isWatching ? '#38bdf8' : '#71717a',
                  }}
                  title={isWatching ? 'إلغاء المتابعة' : 'متابعة المهمة'}
                >
                  {isWatching ? <Eye size={11} color="#38bdf8" /> : <EyeOff size={11} color="#71717a" />}
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenInWeb}
                style={rowStyles.iconBtn}
                title="فتح على الويب"
              >
                <ExternalLink size={11} color="#94a3b8" />
              </button>
            </div>
          )}

          {/* SINGLE DYNAMIC PRIMARY ACTION */}
          {isCompleted ? (
            <button
              type="button"
              onClick={() => {
                audioAlerts.playTaskReopen();
                onUpdateStatus ? onUpdateStatus(task.id, 'IN_PROGRESS') : onToggleStatus(task.id, task.status);
              }}
              style={rowStyles.secondaryBtn}
              title="إعادة فتح المهمة"
            >
              <RotateCcw size={11} />
              <span>إعادة فتح</span>
            </button>
          ) : isInReview ? (
            canApprove ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    audioAlerts.playTaskComplete();
                    onUpdateStatus?.(task.id, 'COMPLETED');
                  }}
                  style={rowStyles.approveBtn}
                  title="اعتماد وإنجاز"
                >
                  <CheckCircle2 size={11} color="#ffffff" />
                  <span>اعتماد</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRevisionModalOpen(true);
                  }}
                  style={rowStyles.returnBtn}
                  title="طلب تعديلات وإرجاع للموظف مع كتابة الملاحظات"
                >
                  <RotateCcw size={10} color="#f59e0b" />
                  <span style={{ fontSize: 10, marginRight: 2, color: '#f59e0b', fontWeight: 600 }}>إرجاع</span>
                </button>
              </div>
            ) : (
              <span style={rowStyles.pendingBadge}>بانتظار الاعتماد</span>
            )
          ) : isRunning ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={rowStyles.runningTimerChip}>
                {formatRunnerTimer(currentElapsed)}
              </span>
              <button
                type="button"
                onClick={() => onStopTask?.(task.id)}
                style={rowStyles.pauseBtn}
                title="إيقاف مؤقت"
              >
                <Pause size={11} />
                <span>إيقاف</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audioAlerts.playTaskComplete();
                  onUpdateStatus ? onUpdateStatus(task.id, 'IN_REVIEW') : onToggleStatus(task.id, 'IN_REVIEW');
                }}
                style={rowStyles.submitBtn}
                title="تسليم للمراجعة"
              >
                <Send size={11} />
              </button>
            </div>
          ) : canRunTask ? (
            <button
              type="button"
              onClick={() => {
                audioAlerts.playTaskStart();
                onStartTask?.(task);
              }}
              style={rowStyles.startBtn}
              title="بدء العمل على المهمة واحتساب الوقت"
            >
              <Play size={10} fill="#ffffff" color="#ffffff" />
              <span>بدء العمل</span>
            </button>
          ) : (
            <span
              style={rowStyles.assignedChip}
              title={`المهمة مسندة للزميل: ${assigneeName} (لا تملك صلاحية تشغيلها)`}
            >
              <Lock size={10} color="#71717a" />
              <span>مكلفة لزميل</span>
            </span>
          )}

          {/* Open Details Drawer Chevron Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(task);
            }}
            style={{
              ...rowStyles.expandBtn,
              backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: isSelected ? '#38bdf8' : 'var(--text-dim)',
            }}
            title="عرض التفاصيل في اللوحة الجانبية"
          >
            <ChevronLeft size={13} />
          </button>
        </div>
      </div>

      {/* Return for Revision Modal */}
      {isRevisionModalOpen && (
        <ReturnForRevisionModal
          isOpen={isRevisionModalOpen}
          onClose={() => setIsRevisionModalOpen(false)}
          onConfirm={async (reason: string) => {
            if (onUpdateStatus) {
              await onUpdateStatus(task.id, 'IN_PROGRESS', reason);
            }
          }}
          task={task}
        />
      )}
    </div>
  );
};

const rowStyles: Record<string, React.CSSProperties> = {
  mainRow: {
    minHeight: 44,
    height: 44,
    maxHeight: 44,
    overflow: 'hidden',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    cursor: 'pointer',
    userSelect: 'none',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusIconWrapper: {
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pulseDotGreen: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    boxShadow: '0 0 6px #22c55e',
    display: 'inline-block',
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  revisionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 4,
    flexShrink: 0,
  },
  urgentBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 4,
    flexShrink: 0,
  },
  highBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 5px',
    borderRadius: 4,
    flexShrink: 0,
  },
  highDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: '#f59e0b',
    display: 'inline-block',
  },
  blockBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    color: '#f59e0b',
    fontSize: 10,
    padding: '1px 5px',
    borderRadius: 4,
    flexShrink: 0,
  },
  attChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 4,
    cursor: 'pointer',
    flexShrink: 0,
  },
  personCol: {
    width: 90,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  personName: {
    fontSize: 11,
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 78,
  },
  estCol: {
    width: 44,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueCol: {
    width: 72,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monoText: {
    fontSize: 11,
    color: 'var(--text-dim)',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  emptyCell: {
    color: 'var(--border-strong)',
    fontSize: 11,
  },
  actionsCol: {
    width: 135,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  hoverTools: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: '2px 3px',
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    flexShrink: 0,
  },
  expandBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: 3,
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    outline: 'none',
    flexShrink: 0,
    transition: 'background-color 100ms ease, color 100ms ease',
  },
  startBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: '#38bdf8',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    height: 24,
    transition: 'all 120ms ease-out',
  },
  pauseBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--accent-green)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    height: 24,
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: 5,
    padding: '3px 6px',
    fontSize: 10,
    fontWeight: 600,
    color: '#c084fc',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    height: 24,
  },
  approveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: '#22c55e',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    height: 24,
    transition: 'all 120ms ease-out',
  },
  returnBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: 5,
    padding: '3px 6px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    height: 24,
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    height: 24,
  },
  pendingBadge: {
    fontSize: 10,
    color: '#c084fc',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
    padding: '2px 7px',
    borderRadius: 4,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    height: 22,
    display: 'inline-flex',
    alignItems: 'center',
  },
  runningTimerChip: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--accent-green)',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  assignedChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: 'var(--text-dim)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    padding: '2px 7px',
    borderRadius: 4,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    height: 22,
  },
};

export default TaskItemCard;
