import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Plus, Check, Loader2 } from 'lucide-react';
import { audioAlerts } from '../../utils/audioAlerts';

interface SubtaskItem {
  id: string;
  title: string;
  status: string;
  assignedTo?: string;
  assignee?: { firstName?: string; lastName?: string };
}

interface TaskSubtasksProps {
  taskId: string;
  canEdit?: boolean;
  onSubtasksCountChange?: (completed: number, total: number) => void;
}

export const TaskSubtasks: React.FC<TaskSubtasksProps> = ({
  taskId,
  canEdit = true,
  onSubtasksCountChange,
}) => {
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchSubtasks = async () => {
    if (!taskId || !window.electronAPI?.getSubtasks) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.getSubtasks(taskId);
      if (res?.success && Array.isArray(res.subtasks)) {
        setSubtasks(res.subtasks);
        const comp = res.subtasks.filter((s: any) => String(s.status || '').toUpperCase() === 'COMPLETED').length;
        onSubtasksCountChange?.(comp, res.subtasks.length);
      }
    } catch (err) {
      console.warn('[TaskSubtasks] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubtasks();
  }, [taskId]);

  const handleToggleSubtask = async (sub: SubtaskItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (togglingId || !canEdit) return;

    const isDone = String(sub.status || '').toUpperCase() === 'COMPLETED';
    const nextStatus = isDone ? 'PENDING' : 'COMPLETED';

    // Optimistic update
    setSubtasks((prev) => {
      const updated = prev.map((item) =>
        item.id === sub.id ? { ...item, status: nextStatus } : item
      );
      const comp = updated.filter((s) => String(s.status || '').toUpperCase() === 'COMPLETED').length;
      onSubtasksCountChange?.(comp, updated.length);
      return updated;
    });

    if (nextStatus === 'COMPLETED') {
      audioAlerts.playTaskComplete();
    }

    setTogglingId(sub.id);
    try {
      if (window.electronAPI?.updateTaskStatus) {
        await window.electronAPI.updateTaskStatus(sub.id, nextStatus);
      }
    } catch (err) {
      console.warn('[TaskSubtasks] Toggle status error:', err);
      // Rollback
      fetchSubtasks();
    } finally {
      setTogglingId(null);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTitle.trim();
    if (!clean || isAdding || !window.electronAPI?.createSubtask) return;

    setIsAdding(true);
    try {
      const res = await window.electronAPI.createSubtask({
        parentTaskId: taskId,
        title: clean,
      });
      if (res?.success && res.subtask) {
        setSubtasks((prev) => {
          const updated = [...prev, res.subtask];
          const comp = updated.filter((s) => String(s.status || '').toUpperCase() === 'COMPLETED').length;
          onSubtasksCountChange?.(comp, updated.length);
          return updated;
        });
        setNewTitle('');
      } else {
        // Fallback reload
        await fetchSubtasks();
        setNewTitle('');
      }
    } catch (err) {
      console.warn('[TaskSubtasks] Add subtask error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const completedCount = subtasks.filter(
    (s) => String(s.status || '').toUpperCase() === 'COMPLETED'
  ).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <div
      style={{
        marginTop: 10,
        padding: '10px 12px',
        borderRadius: 8,
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckSquare size={13} color="var(--accent-blue)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
            المهام الفرعية
          </span>
          <span
            style={{
              fontSize: 11,
              fontVariantNumeric: 'tabular-nums',
              padding: '1px 6px',
              borderRadius: 999,
              backgroundColor: subtasks.length > 0 && completedCount === subtasks.length
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(255, 255, 255, 0.08)',
              color: subtasks.length > 0 && completedCount === subtasks.length
                ? 'var(--accent-green)'
                : 'var(--text-dim)',
              fontWeight: 600,
            }}
          >
            {completedCount}/{subtasks.length}
          </span>
        </div>

        {subtasks.length > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {progressPercent}% مكتمل
          </span>
        )}
      </div>

      {/* Thin Progress Track */}
      {subtasks.length > 0 && (
        <div
          style={{
            height: 3,
            width: '100%',
            backgroundColor: 'var(--border-subtle)',
            borderRadius: 999,
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: progressPercent === 100 ? 'var(--accent-green)' : 'var(--accent-blue)',
              transition: 'width 240ms ease-out',
            }}
          />
        </div>
      )}

      {/* Subtasks List */}
      {loading && subtasks.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', fontSize: 11, color: 'var(--text-muted)' }}>
          <Loader2 size={12} className="animate-spin" />
          <span>جاري تحميل المهام الفرعية…</span>
        </div>
      ) : subtasks.length === 0 ? (
        <div style={{ padding: '4px 0', fontSize: 11, color: 'var(--text-muted)' }}>
          لا توجد مهام فرعية مضافة بعد.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {subtasks.map((sub) => {
            const isDone = String(sub.status || '').toUpperCase() === 'COMPLETED';
            return (
              <div
                key={sub.id}
                onClick={(e) => handleToggleSubtask(sub, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 8px',
                  borderRadius: 5,
                  backgroundColor: isDone ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                  cursor: canEdit ? 'pointer' : 'default',
                  transition: 'background-color 100ms ease',
                }}
              >
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: isDone ? '1px solid var(--accent-green)' : '1px solid var(--border-strong)',
                    backgroundColor: isDone ? 'var(--accent-green)' : 'transparent',
                    color: '#ffffff',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  {isDone ? <Check size={11} strokeWidth={3} /> : null}
                </button>

                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: isDone ? 'line-through' : 'none',
                    lineHeight: '1.4',
                  }}
                >
                  {sub.title}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Add Subtask Input */}
      {canEdit && (
        <form onSubmit={handleAddSubtask} style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="إضافة مهمة فرعية جديدة (اضغط Enter)…"
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 11,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || isAdding}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: newTitle.trim() ? 'var(--accent-blue)' : 'var(--bg-card)',
              color: newTitle.trim() ? '#ffffff' : 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 600,
              cursor: newTitle.trim() ? 'pointer' : 'default',
              transition: 'all 140ms ease',
              fontFamily: 'inherit',
            }}
          >
            {isAdding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />}
            <span>إضافة</span>
          </button>
        </form>
      )}
    </div>
  );
};

export default TaskSubtasks;
