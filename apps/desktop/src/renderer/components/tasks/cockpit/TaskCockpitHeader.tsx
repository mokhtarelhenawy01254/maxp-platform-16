import React, { useState } from 'react';
import {
  ArrowRight,
  Play,
  Pause,
  Send,
  RotateCcw,
  CheckCircle2,
  Check,
  Edit3,
  Link as LinkIcon,
  ExternalLink,
  CheckCheck,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { audioAlerts } from '../../../utils/audioAlerts';
import { cockpitHeaderStyles as styles } from './cockpitStyles';

interface TaskCockpitHeaderProps {
  task: any;
  onBack: () => void;
  onEdit?: (task: any) => void;
  onUpdateStatus?: (taskId: string, newStatus: string, reason?: string) => void;
  onToggleStatus?: (taskId: string, currentStatus: string) => void;
  onStartTask?: (task: any) => void;
  onStopTask?: (taskId?: string) => void;
  onOpenApprovalGate?: (task: any) => void;
  onOpenRevisionModal?: () => void;
  isRunning?: boolean;
  currentElapsed?: number;
  canRunTask?: boolean;
  canApprove?: boolean;
  canEditTask?: boolean;
  isCompleted?: boolean;
  isInReview?: boolean;
  serverUrl?: string;
}

export const TaskCockpitHeader: React.FC<TaskCockpitHeaderProps> = ({
  task,
  onBack,
  onEdit,
  onUpdateStatus,
  onToggleStatus,
  onStartTask,
  onStopTask,
  onOpenApprovalGate,
  onOpenRevisionModal,
  isRunning = false,
  currentElapsed = 0,
  canRunTask = true,
  canApprove = false,
  canEditTask = false,
  isCompleted = false,
  isInReview = false,
  serverUrl = 'https://maxp.online',
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const formatRunnerTimer = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const handleCopyLink = async () => {
    const deepLink = `${window.location.origin}${window.location.pathname}#/tasks/${task.id}`;
    try {
      if (window.electronAPI?.copyToClipboard) {
        await window.electronAPI.copyToClipboard(deepLink);
      } else {
        await navigator.clipboard.writeText(deepLink);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleOpenInWeb = () => {
    const targetUrl = `${serverUrl.replace(/\/$/, '')}/tasks?taskId=${task.id}`;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(targetUrl);
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <header style={styles.header}>
      {/* Right Side: Back Button & Breadcrumbs */}
      <div style={styles.navGroup}>
        <button
          type="button"
          onClick={onBack}
          style={styles.backBtn}
          title="الرجوع لقائمة المهام (Esc)"
        >
          <ArrowRight size={14} />
          <span>المهام</span>
          <span style={styles.escBadge}>Esc</span>
        </button>

        <span style={styles.divider}>/</span>
        <span style={styles.taskIdChip}>
          #{String(task.id || '').slice(0, 8)}
        </span>
      </div>

      {/* Center: Live Timer Badge if running */}
      {isRunning && (
        <div style={styles.runningTimerBadge}>
          <span style={styles.livePulseDot} />
          <Clock size={12} color="var(--accent-blue)" />
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {formatRunnerTimer(currentElapsed)}
          </span>
        </div>
      )}

      {/* Left Side: Actions and Tools */}
      <div style={styles.actionsGroup}>
        {/* Primary Lifecycle CTAs */}
        {isCompleted ? (
          <button
            type="button"
            onClick={() => {
              audioAlerts.playTaskReopen();
              onUpdateStatus ? onUpdateStatus(task.id, 'IN_PROGRESS') : onToggleStatus?.(task.id, task.status);
            }}
            style={styles.secondaryBtn}
          >
            <RotateCcw size={12} />
            <span>إعادة فتح</span>
          </button>
        ) : isInReview ? (
          canApprove ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (onOpenApprovalGate) {
                    onOpenApprovalGate(task);
                  } else {
                    audioAlerts.playTaskComplete();
                    onUpdateStatus ? onUpdateStatus(task.id, 'COMPLETED') : onToggleStatus?.(task.id, 'COMPLETED');
                  }
                }}
                style={styles.approveBtn}
                title="بوابة الاعتماد والإنجاز"
              >
                <CheckCircle2 size={13} />
                <span>اعتماد المهمة</span>
              </button>

              <button
                type="button"
                onClick={onOpenRevisionModal}
                style={styles.returnBtn}
                title="طلب تعديلات وإرجاع للمنفذ"
              >
                <RotateCcw size={12} />
                <span>طلب تعديلات</span>
              </button>
            </>
          ) : (
            <span style={styles.pendingReviewPill}>بانتظار الاعتماد</span>
          )
        ) : isRunning ? (
          <>
            <button
              type="button"
              onClick={() => onStopTask?.(task.id)}
              style={styles.pauseBtn}
              title="إيقاف مؤقت للوقت"
            >
              <Pause size={12} />
              <span>إيقاف المؤقت</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audioAlerts.playTaskComplete();
                onUpdateStatus ? onUpdateStatus(task.id, 'IN_REVIEW') : onToggleStatus?.(task.id, 'IN_REVIEW');
              }}
              style={styles.submitBtn}
              title="تسليم للمراجعة والاعتماد"
            >
              <Send size={12} />
              <span>تسليم للاعتماد</span>
            </button>
          </>
        ) : canRunTask ? (
          <button
            type="button"
            onClick={() => {
              audioAlerts.playTaskStart();
              onStartTask?.(task);
            }}
            style={styles.startBtn}
            title="بدء تشغيل المؤقت والعمل على المهمة"
          >
            <Play size={12} fill="#ffffff" />
            <span>بدء العمل</span>
          </button>
        ) : null}

        {/* Tools */}
        {canEditTask && onEdit && (
          <button
            type="button"
            onClick={() => onEdit(task)}
            style={styles.toolIconBtn}
            title="تعديل بيانات المهمة (Ctrl + E)"
          >
            <Edit3 size={13} />
          </button>
        )}

        <button
          type="button"
          onClick={handleCopyLink}
          style={styles.toolIconBtn}
          title={copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط مباشر للمهمة'}
        >
          {copiedLink ? <CheckCheck size={13} color="var(--accent-green)" /> : <LinkIcon size={13} />}
        </button>

        <button
          type="button"
          onClick={handleOpenInWeb}
          style={styles.toolIconBtn}
          title="فتح في المتصفح"
        >
          <ExternalLink size={13} />
        </button>
      </div>
    </header>
  );
};
