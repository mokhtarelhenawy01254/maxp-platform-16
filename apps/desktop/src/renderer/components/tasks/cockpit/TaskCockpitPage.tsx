import React, { useState, useEffect } from 'react';
import { TaskCockpitHeader } from './TaskCockpitHeader';
import { TaskCockpitMainContent } from './TaskCockpitMainContent';
import { TaskCockpitSidebar } from './TaskCockpitSidebar';
import { ReturnForRevisionModal } from '../ReturnForRevisionModal';

interface TaskCockpitPageProps {
  task: any | null;
  onBack: () => void;
  onUpdateStatus?: (
    taskId: string,
    newStatus: string,
    revisionReason?: string,
    returnReasonType?: string,
    returnSeverity?: number,
    options?: any
  ) => void;
  onToggleStatus?: (taskId: string, currentStatus: string) => void;
  onEdit?: (task: any) => void;
  onStartTask?: (task: any) => void;
  onStopTask?: (taskId?: string) => void;
  onOpenApprovalGate?: (task: any) => void;
  onOpenImage?: (imgUrl: string) => void;
  onUpdateCriteria?: (taskId: string, items: any[], allCompleted: boolean) => Promise<void>;
  serverUrl?: string;
  authToken?: string;
  currentUserId?: string;
  isAdmin?: boolean;
  activeTaskId?: string | null;
  activeTaskIds?: Record<string, number>;
  activeRunnerSeconds?: number;
}

export const TaskCockpitPage: React.FC<TaskCockpitPageProps> = ({
  task,
  onBack,
  onUpdateStatus,
  onToggleStatus,
  onEdit,
  onStartTask,
  onStopTask,
  onOpenApprovalGate,
  onOpenImage,
  onUpdateCriteria,
  serverUrl = 'https://maxp.online',
  currentUserId = '',
  isAdmin = false,
  activeTaskId = null,
  activeTaskIds,
  activeRunnerSeconds = 0,
}) => {
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  // Keyboard shortcut: Esc to go back (unless revision modal is open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRevisionModalOpen) {
        onBack();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        if (task && onEdit) onEdit(task);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, isRevisionModalOpen, task, onEdit]);

  if (!task) return null;

  const rawStatus = String(task.status || '').toUpperCase();
  const isCompleted = rawStatus === 'COMPLETED';
  const isInReview = rawStatus === 'IN_REVIEW' || rawStatus === 'PENDING_REVIEW';
  const isMultiRunning = activeTaskIds ? activeTaskIds[task.id] !== undefined : false;
  const isRunning = !isCompleted && !isInReview && (activeTaskId === task.id || isMultiRunning);
  const currentElapsed = isMultiRunning && activeTaskIds ? activeTaskIds[task.id] : activeRunnerSeconds;

  const isAssignedToMe = !task.assignedTo || task.assignedTo === currentUserId;
  const isCreatedByMe = task.createdBy === currentUserId;
  const canRunTask = isAssignedToMe;
  const canEditTask = isCreatedByMe || isAssignedToMe || isAdmin;
  const canApprove = isCreatedByMe || isAdmin;

  const handleConfirmRevision = async (
    reason: string,
    returnReasonType?: string,
    returnSeverity?: number
  ) => {
    if (onUpdateStatus) {
      await onUpdateStatus(
        task.id,
        'IN_PROGRESS',
        reason,
        returnReasonType,
        returnSeverity
      );
    }
    setIsRevisionModalOpen(false);
  };

  return (
    <div style={styles.container} dir="rtl">
      {/* 1. Sticky Command Bar Header */}
      <TaskCockpitHeader
        task={task}
        onBack={onBack}
        onEdit={onEdit}
        onUpdateStatus={onUpdateStatus}
        onToggleStatus={onToggleStatus}
        onStartTask={onStartTask}
        onStopTask={onStopTask}
        onOpenApprovalGate={onOpenApprovalGate}
        onOpenRevisionModal={() => setIsRevisionModalOpen(true)}
        isRunning={isRunning}
        currentElapsed={currentElapsed}
        canRunTask={canRunTask}
        canApprove={canApprove}
        canEditTask={canEditTask}
        isCompleted={isCompleted}
        isInReview={isInReview}
        serverUrl={serverUrl}
      />

      {/* 2. Responsive 70/30 Cockpit Workspace Body */}
      <div style={styles.workspaceBody}>
        {/* 70% Core Execution Canvas */}
        <TaskCockpitMainContent
          task={task}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          canEditTask={canEditTask}
          serverUrl={serverUrl}
          onOpenImage={onOpenImage}
          onUpdateCriteria={
            onUpdateCriteria
              ? (items, allCompleted) => onUpdateCriteria(task.id, items, allCompleted)
              : undefined
          }
        />

        {/* 30% Metadata Sidebar */}
        <TaskCockpitSidebar
          task={task}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </div>

      {/* 3. Revision Modal */}
      {isRevisionModalOpen && (
        <ReturnForRevisionModal
          isOpen={isRevisionModalOpen}
          onClose={() => setIsRevisionModalOpen(false)}
          onConfirm={handleConfirmRevision}
          task={task}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: 'var(--bg-main, #09090b)',
    color: 'var(--text-primary)',
    overflow: 'hidden',
  },
  workspaceBody: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
};
