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
  selectMode?: boolean;
  checked?: boolean;
  onToggleCheck?: (taskId: string) => void;
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
  selectMode,
  checked,
  onToggleCheck,
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
  // Overdue intensity: amber <=3d, orange 4-6d, red >=7d — red must mean "critical"
  const overdueDays = isOverdue && dueTime ? Math.floor((now - dueTime) / 86400000) : 0;
  const overdueColor = overdueDays >= 7 ? 'var(--accent-red)' : overdueDays >= 4 ? 'var(--accent-orange)' : 'var(--accent-yellow)';
  // Time-leak: tracked time exceeded the estimate (the only estimate signal the row needs)
  const rowEstMin = Number(task.estimatedMinutes || 0) || (Number(task.estimatedHours || 0) * 60) || 0;
  const rowActualMin = Math.round(
    Number(
      task.totalDuration ??
      task.total_duration ??
      task.actualMinutes ??
      task.totalTimeMinutes ??
      (task.totalSeconds ? task.totalSeconds / 60 : null) ??
      (task.actualHours ? task.actualHours * 60 : 0)
    )
  );
  const isTimeLeak = !isCompleted && rowEstMin > 0 && rowActualMin > rowEstMin * 1.3;

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
    ? { label: 'مكلف بالتنفيذ', bg: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-blue)' }
    : isCreatedByMe
    ? { label: 'أنشأتها', bg: 'rgba(168, 85, 247, 0.12)', color: 'var(--accent-purple-soft)' }
    : isWatching
    ? { label: 'متابع', bg: 'var(--accent-green-bg)', color: 'var(--accent-green)' }
    : isAdmin
    ? { label: 'إشراف إداري', bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' }
    : { label: 'فريق', bg: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderBottom: '1px solid var(--border-subtle)',
        borderRight: isSelected
          ? '3px solid var(--accent-blue)'
          : isReturnedForRevision && !isCompleted
          ? '3px solid var(--accent-yellow)'
          : isUrgent && !isCompleted
          ? '3px solid var(--accent-red)'
          : isRunning
          ? '3px solid var(--accent-blue)'
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
        <div style={rowStyles.titleCol}>{selectMode && (<input type="checkbox" checked={!!checked} onChange={(e) => { e.stopPropagation(); onToggleCheck?.(task.id); }} onClick={(e) => e.stopPropagation()} style={{ width: 14, height: 14, accentColor: 'var(--accent-green)', cursor: 'pointer', marginInlineEnd: 8, flexShrink: 0 }} title="تحديد للإجراء الجماعي" />)}
          {/* Status Indicator Icon */}
          <div style={rowStyles.statusIconWrapper}>
            {isCompleted ? (
              <CheckCircle2 size={16} color="var(--accent-green)" />
            ) : isInReview ? (
              <ClipboardCheck size={15} color="var(--accent-purple-soft)" />
            ) : isReturnedForRevision ? (
              <RotateCcw size={13} color="var(--accent-yellow)" />
            ) : isRunning ? (
              <span style={rowStyles.pulseDotGreen} />
            ) : isInProgress ? (
              <Play size={12} fill="var(--accent-blue)" color="var(--accent-blue)" />
            ) : isOnHold ? (
              <Pause size={12} color="var(--accent-yellow)" />
            ) : (
              <Clock size={13} color="var(--text-muted)" />
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
              <RotateCcw size={9} color="var(--accent-yellow)" />
              <span>مُعادة للتعديل</span>
            </span>
          )}

          {/* Missing evidence badge */}
          {(task.missingEvidence || (isInReview && !task.hasEvidence)) && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 9999,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontWeight: 600,
              }}
              title="المهمة في المراجعة بدون مرفقات أو دليل عمل كافٍ"
            >
              ⚠️ بدون دليل
            </span>
          )}

          {/* Blocked in review > 48h */}
          {isInReview && task.submittedForReviewAt && (Date.now() - new Date(task.submittedForReviewAt).getTime()) > 48 * 3600 * 1000 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 9999,
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontWeight: 600,
              }}
              title="معلقة في المراجعة لأكثر من 48 ساعة"
            >
              ⏳ مسدودة &gt; 48h
            </span>
          )}

          {/* Return count badge */}
          {task.returnCount && task.returnCount > 0 ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 9999,
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                color: '#f97316',
                border: '1px solid rgba(249, 115, 22, 0.25)',
                fontWeight: 600,
              }}
              title={`أعيدت للتعديل ${task.returnCount} مرات`}
            >
              ↩️ إرجاع ({task.returnCount})
            </span>
          ) : null}

          {/* Backlog converted badge */}
          {task.convertedFromBacklog && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 9999,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontWeight: 600,
              }}
              title="محوّلة من الباك لوج"
            >
              تحسين
            </span>
          )}

          {/* Ergonomic Priority Indicators */}
          {isUrgent && !isCompleted && (
            <span style={rowStyles.urgentBadge} title="أولوية قصوى - عاجل">
              <AlertCircle size={11} />
              <span>عاجل</span>
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
              <Paperclip size={10} color="var(--text-muted)" />
            </span>
          )}
        </div>

        {/* Col 2: Creator / Assignee */}
        <div
          style={rowStyles.personCol}
          className="task-col-person"
          title={`${viewType === 'my-tasks' ? `أنشأها: ${creatorName}` : `المكلف: ${assigneeName}`} (صلاحية الظهور: ${visibilityReason.label})`}
        >
          {viewType === 'my-tasks' ? (
            <span
              style={(() => {
                const pk = String(targetPerson || '؟');
                const hues = [258, 152, 12, 200, 330, 45, 96, 175, 285, 30];
                const hue = hues[(pk.length + pk.charCodeAt(0)) % hues.length];
                return { width: 22, height: 22, borderRadius: '50%', background: `hsl(${hue} 42% 45%)`, color: '#ffffff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
              })()}
            >
              {String(targetPerson || '؟').trim().slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <>
              <User size={11} color="var(--text-muted)" />
              <span style={rowStyles.personName}>{targetPerson}</span>
            </>
          )}
          {(visibilityReason.label === 'متابع' || visibilityReason.label === 'إشراف إداري') && (
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
          )}
        </div>

        {/* Col 3: Tracked vs Estimated Time */}
        <div style={rowStyles.estCol} className="task-col-est">
          {isTimeLeak ? (
            <span
              style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-orange)', whiteSpace: 'nowrap', padding: '1px 5px', backgroundColor: 'var(--accent-orange-bg, rgba(249,115,22,0.1))', borderRadius: 5 }}
              title={`تجاوز التقدير: ${rowActualMin} د فعليًا مقابل ${rowEstMin} د مقدرة — التفاصيل بالداخل`}
            >
              تجاوز التقدير ({Math.round(rowActualMin / 60 * 10) / 10}س)
            </span>
          ) : rowActualMin > 0 ? (
            <span
              style={{ ...rowStyles.monoText, fontSize: 10, color: 'var(--text-secondary)', direction: 'ltr' }}
              title={`الزمن الفعلي المسجل: ${rowActualMin} دقيقة ${rowEstMin > 0 ? `(المقدر: ${rowEstMin} دقيقة)` : ''}`}
            >
              {Math.floor(rowActualMin / 60)}:{String(rowActualMin % 60).padStart(2, '0')}
            </span>
          ) : rowEstMin > 0 ? (
            <span
              style={{ ...rowStyles.monoText, fontSize: 9.5, color: 'var(--text-muted)', direction: 'ltr' }}
              title={`الوقت المقدر: ${rowEstMin} دقيقة (لم يبدأ التايمر بعد)`}
            >
              ~{Math.floor(rowEstMin / 60)}:{String(rowEstMin % 60).padStart(2, '0')}
            </span>
          ) : (
            <span style={rowStyles.emptyCell}>—</span>
          )}
        </div>

        {/* Col 4: Due Date — date on top, overdue state stacked under it (never overlaps neighbours) */}
        <div style={rowStyles.dueCol} className="task-col-due">
          {task.dueDate ? (
            <div style={rowStyles.dueStack}>
              <span
                style={{
                  ...rowStyles.monoText,
                  color: isOverdue ? overdueColor : isDueSoon ? 'var(--accent-yellow)' : 'var(--text-dim)',
                  fontWeight: isOverdue ? 600 : 400,
                }}
                title={new Date(task.dueDate).toLocaleString('ar-EG-u-nu-latn')}
              >
                <span dir="ltr">
                  {new Date(task.dueDate).getDate()}/{new Date(task.dueDate).getMonth() + 1}
                </span>
              </span>
              {isOverdue && (
                <span style={{ ...rowStyles.overdueMini, color: overdueColor }} title={`متأخر عن الموعد بـ ${getOverdueText()}`}>
                  متأخر {getOverdueText()}
                </span>
              )}
              {isDueSoon && !isOverdue && (
                <span style={rowStyles.dueSoonMini} title="موعدها قريب (خلال 24 ساعة)">
                  قريب
                </span>
              )}
            </div>
          ) : (
            <span style={rowStyles.emptyCell}>—</span>
          )}
        </div>

        {/* Col 5: Actions Area */}
        <div style={rowStyles.actionsCol} onClick={(e) => e.stopPropagation()}>
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
                  <RotateCcw size={10} color="var(--accent-yellow)" />
                  <span style={{ fontSize: 10, marginRight: 2, color: 'var(--accent-yellow)', fontWeight: 600 }}>إرجاع</span>
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
              <Play size={12} fill="currentColor" color="currentColor" />
            </button>
          ) : (
            <span
              style={{ ...rowStyles.assignedChip, padding: '3px 5px' }}
              title={`مكلفة لزميل: ${assigneeName} (لا تملك صلاحية تشغيلها)`}
            >
              <Lock size={10} color="var(--text-muted)" />
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
              color: isSelected ? 'var(--accent-blue)' : 'var(--text-dim)',
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
    userSelect: 'text',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    userSelect: 'text',
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
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 0 6px var(--accent-green)',
    display: 'inline-block',
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    userSelect: 'text',
  },
  revisionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    color: 'var(--accent-yellow)',
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
    color: 'var(--accent-red)',
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
    color: 'var(--accent-yellow)',
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
    backgroundColor: 'var(--accent-yellow)',
    display: 'inline-block',
  },
  blockBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    color: 'var(--accent-yellow)',
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
    overflow: 'hidden',
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
    overflow: 'hidden',
  },
  dueStack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  overdueMini: {
    fontSize: 9,
    fontWeight: 700,
    color: 'var(--accent-red)',
    whiteSpace: 'nowrap',
    lineHeight: 1.15,
  },
  dueSoonMini: {
    fontSize: 9,
    fontWeight: 600,
    color: 'var(--accent-yellow)',
    whiteSpace: 'nowrap',
    lineHeight: 1.15,
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
    width: 100,
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
    justifyContent: 'center',
    width: 28,
    height: 28,
    backgroundColor: 'var(--accent-blue-bg)',
    border: '1px solid var(--accent-blue-border)',
    borderRadius: '50%',
    padding: 0,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 120ms ease-out',
  },
  pauseBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'var(--accent-green-bg)',
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
    color: 'var(--accent-purple-soft)',
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
    backgroundColor: 'var(--accent-green-bg)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 5,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-green)',
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
    color: 'var(--accent-purple-soft)',
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
