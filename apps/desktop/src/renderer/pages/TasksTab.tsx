import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  RefreshCw,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  Download,
  X,
  Layers,
  Play,
  Pause,
} from 'lucide-react';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { TaskItemCard } from '../components/tasks/TaskItemCard';

interface ActiveTaskState {
  id: string;
  title: string;
  priority: string;
  startTime: number;
  accumulatedSeconds: number;
  entryId?: string;
}

export const TasksTab: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'my-tasks' | 'assigned-by-me'>('my-tasks');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [users, setUsers] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lightboxImgError, setLightboxImgError] = useState(false);
  const [serverUrl, setServerUrl] = useState('https://maxp.online');
  const [authToken, setAuthToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Active Task Runner state persisted in localStorage
  const [activeTask, setActiveTask] = useState<ActiveTaskState | null>(() => {
    try {
      const saved = localStorage.getItem('maxp_active_task');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [runnerSeconds, setRunnerSeconds] = useState<number>(0);

  // Ticking stopwatch for active task
  useEffect(() => {
    if (!activeTask) {
      setRunnerSeconds(0);
      return;
    }

    const calc = () => {
      const now = Date.now();
      const elapsed =
        (activeTask.accumulatedSeconds || 0) +
        Math.floor((now - activeTask.startTime) / 1000);
      setRunnerSeconds(Math.max(0, elapsed));
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [activeTask]);

  const handleStartTask = async (task: any) => {
    let entryId: string | undefined;
    try {
      const timerRes = await window.electronAPI.startTaskTimer(task.id);
      if (timerRes?.success && timerRes.entry?.id) {
        entryId = timerRes.entry.id;
      }
    } catch (err) {
      console.warn('[TasksTab] startTaskTimer failed:', err);
    }

    const newTask: ActiveTaskState = {
      id: task.id,
      title: task.title,
      priority: task.priority || 'MEDIUM',
      startTime: Date.now(),
      accumulatedSeconds: 0,
      entryId,
    };
    setActiveTask(newTask);
    try {
      localStorage.setItem('maxp_active_task', JSON.stringify(newTask));
    } catch {}

    // Auto-switch status to IN_PROGRESS if currently PENDING
    const norm = String(task.status || '').toUpperCase();
    if (norm !== 'IN_PROGRESS' && norm !== 'COMPLETED') {
      handleUpdateStatus(task.id, 'IN_PROGRESS');
    }
  };

  const handleStopTask = async () => {
    const entryId = activeTask?.entryId;
    if (entryId) {
      try {
        await window.electronAPI.stopTaskTimer(entryId);
      } catch (err) {
        console.warn('[TasksTab] stopTaskTimer failed:', err);
      }
    }
    setActiveTask(null);
    try {
      localStorage.removeItem('maxp_active_task');
    } catch {}
    loadData(false);
  };

  const formatRunnerTimer = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      // Get auth state to retrieve serverUrl and user info
      const authState = await window.electronAPI.getAuthState();
      if (authState?.serverUrl) {
        setServerUrl(authState.serverUrl);
      }
      if (authState?.user) {
        setCurrentUser(authState.user);
      }

      // Fetch auth token for secure authenticated image loading
      try {
        const tokenRes = await window.electronAPI.getAuthToken();
        if (tokenRes?.token) {
          setAuthToken(tokenRes.token);
        }
      } catch {}

      // 1. Fetch tasks
      const res = await window.electronAPI.getTasks(activeView);
      if (res.success && Array.isArray(res.tasks)) {
        setTasks(res.tasks);
      }

      // 2. Fetch company users for assign dropdown
      const usersRes = await window.electronAPI.getCompanyUsers();
      if (usersRes.success && Array.isArray(usersRes.users)) {
        setUsers(usersRes.users);
      }

      // 3. Sync active timer with backend
      try {
        const runningRes = await window.electronAPI.getRunningTaskTimer();
        if (runningRes?.success && runningRes.runningTimer) {
          const rt = runningRes.runningTimer;
          const isTaskDone = String(rt.task?.status || '').toUpperCase() === 'COMPLETED';
          if (isTaskDone) {
            setActiveTask(null);
            try {
              localStorage.removeItem('maxp_active_task');
            } catch {}
            if (rt.id) {
              window.electronAPI.stopTaskTimer(rt.id).catch(() => {});
            }
          } else {
            const startMs = new Date(rt.startTime).getTime();
            setActiveTask({
              id: rt.taskId,
              title: rt.task?.title || 'مهمة جارية',
              priority: 'MEDIUM',
              startTime: startMs,
              accumulatedSeconds: 0,
              entryId: rt.id,
            });
          }
        } else if (runningRes?.success && !runningRes.runningTimer) {
          // No timer running on backend, clear any stale activeTask
          setActiveTask(null);
          try {
            localStorage.removeItem('maxp_active_task');
          } catch {}
        }
      } catch {}
    } catch (err) {
      console.warn('[TasksTab] Fetch error:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [activeView]);

  useEffect(() => {
    loadData(true);

    // Auto-sync polling every 15s in background
    const pollInterval = setInterval(() => {
      loadData(false);
    }, 15_000);

    // IPC listener for real-time task changes from main process
    const unsubscribe = window.electronAPI.onTasksRefresh?.(() => {
      loadData(false);
    });

    return () => {
      clearInterval(pollInterval);
      unsubscribe?.();
    };
  }, [loadData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsCreateOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        loadData(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadData]);

  const handleUpdateStatus = async (taskId: string, targetStatus: string) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    const prevStatus = currentTask?.status || 'PENDING';

    // If completing the task, immediately stop runner and clear state
    if (targetStatus === 'COMPLETED') {
      if (activeTask?.id === taskId) {
        const entryId = activeTask?.entryId;
        setActiveTask(null);
        try {
          localStorage.removeItem('maxp_active_task');
        } catch {}
        if (entryId) {
          try {
            await window.electronAPI.stopTaskTimer(entryId);
          } catch (err) {
            console.warn('[TasksTab] stopTaskTimer on complete failed:', err);
          }
        }
      }
    } else if (targetStatus === 'IN_PROGRESS' && currentTask) {
      if (activeTask?.id !== taskId) {
        handleStartTask(currentTask);
      }
    }

    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await window.electronAPI.updateTaskStatus(taskId, targetStatus);
    } catch (err) {
      console.warn('[TasksTab] Status update failed:', err);
      // Rollback on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t))
      );
    }
  };

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const isCompleted = String(currentStatus || '').toUpperCase() === 'COMPLETED';
    const nextStatus = isCompleted ? 'PENDING' : 'COMPLETED';
    handleUpdateStatus(taskId, nextStatus);
  };

  const filteredTasks = tasks.filter((t) => {
    const isDone = String(t.status || '').toUpperCase() === 'COMPLETED';
    if (statusFilter === 'IN_PROGRESS') return !isDone;
    if (statusFilter === 'COMPLETED') return isDone;
    return true;
  });

  const completedCount = tasks.filter(
    (t) => String(t.status || '').toUpperCase() === 'COMPLETED'
  ).length;

  return (
    <div style={styles.container}>
      {/* Top Header Card */}
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.iconBox}>
            <CheckSquare size={16} color="#38bdf8" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={styles.headerTitle}>قائمة مهام العمل</span>
            <span style={styles.cloudBadge}>مزامنة فورية</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setIsCreateOpen(true)}
            style={styles.addBtn}
            title="إنشاء مهمة جديدة (Ctrl + N)"
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <Plus size={14} />
            <span>مهمة جديدة</span>
            <span style={styles.kbdChip}>Ctrl+N</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            style={styles.refreshBtn}
            title="تحديث ومزامنة المهام (Ctrl + R)"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Active Task Runner Dock */}
      {activeTask && (
        <div style={styles.runnerDock}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={styles.runnerIconBox}>
              <span style={styles.runnerPulseDot} />
              <Play size={13} fill="#22c55e" color="#22c55e" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={styles.runnerSubtitle}>المشغل قيد العمل المباشر:</div>
              <div style={styles.runnerTaskTitle} title={activeTask.title}>
                {activeTask.title}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Live Timer Display */}
            <div style={styles.runnerTimerBadge} title="عداد وقت العمل الفعلي على هذه المهمة">
              <Clock size={13} color="#38bdf8" />
              <span style={styles.runnerTimerText}>{formatRunnerTimer(runnerSeconds)}</span>
            </div>

            {/* Pause / Stop Button */}
            <button
              onClick={handleStopTask}
              style={styles.runnerPauseBtn}
              title="إيقاف مؤقت للمشغل"
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <Pause size={12} />
              <span>إيقاف مؤقت</span>
            </button>

            {/* Complete Task Button */}
            <button
              onClick={() => {
                handleStopTask();
                handleToggleStatus(activeTask.id, 'PENDING');
              }}
              style={styles.runnerCompleteBtn}
              title="إكمال المهمة وتوثيق إنجازها الآن"
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <CheckCircle2 size={13} />
              <span>إكمال المهمة</span>
            </button>
          </div>
        </div>
      )}

      {/* Main View Switcher (Assigned to Me vs Assigned by Me) */}
      <div style={styles.viewRow}>
        <div style={styles.segmented}>
          <button
            onClick={() => setActiveView('my-tasks')}
            style={{
              ...styles.segBtn,
              backgroundColor: activeView === 'my-tasks' ? '#27272a' : 'transparent',
              color: activeView === 'my-tasks' ? '#fafafa' : '#a1a1aa',
              fontWeight: activeView === 'my-tasks' ? 600 : 400,
            }}
          >
            <span>مهامي الموكلة إليّ</span>
          </button>
          <button
            onClick={() => setActiveView('assigned-by-me')}
            style={{
              ...styles.segBtn,
              backgroundColor: activeView === 'assigned-by-me' ? '#27272a' : 'transparent',
              color: activeView === 'assigned-by-me' ? '#fafafa' : '#a1a1aa',
              fontWeight: activeView === 'assigned-by-me' ? 600 : 400,
            }}
          >
            <Users size={12} />
            <span>مهام أنشأتها للزملاء</span>
          </button>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(['ALL', 'IN_PROGRESS', 'COMPLETED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                ...styles.statusFilterBtn,
                backgroundColor: statusFilter === s ? '#18181b' : 'transparent',
                borderColor: statusFilter === s ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                color: statusFilter === s ? '#fafafa' : '#71717a',
              }}
            >
              {s === 'ALL' && `الكل (${tasks.length})`}
              {s === 'IN_PROGRESS' && `قيد التنفيذ (${tasks.length - completedCount})`}
              {s === 'COMPLETED' && `المكتملة (${completedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div style={styles.list}>
        {loading && tasks.length === 0 ? (
          <div style={styles.emptyState}>جاري جلب المهام من السيرفر السحابي…</div>
        ) : filteredTasks.length === 0 ? (
          <div style={styles.emptyState}>
            لا توجد مهام في هذا التصنيف حالياً. يمكنك إضافة مهمة جديدة لأحد زملائك في العمل بالضغط على "تكليف مهمة جديدة".
          </div>
        ) : (
          filteredTasks.map((t) => (
            <TaskItemCard
              key={t.id}
              task={t}
              onToggleStatus={handleToggleStatus}
              onUpdateStatus={handleUpdateStatus}
              onOpenImage={(img) => setPreviewImage(img)}
              onEdit={(taskToEdit) => setEditingTask(taskToEdit)}
              serverUrl={serverUrl}
              authToken={authToken}
              currentUserId={currentUser?.id || currentUser?.userId}
              isAdmin={['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(
                String(currentUser?.role || '').toUpperCase()
              )}
              activeTaskId={activeTask?.id}
              activeRunnerSeconds={runnerSeconds}
              onStartTask={handleStartTask}
              onStopTask={handleStopTask}
              viewType={activeView}
            />
          ))
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => loadData(false)}
        users={users}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onUpdated={() => loadData(false)}
        users={users}
        serverUrl={serverUrl}
      />

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          style={styles.lightboxOverlay}
          onClick={() => {
            setPreviewImage(null);
            setLightboxImgError(false);
          }}
        >
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.lightboxHeader}>
              <span style={{ fontSize: 13, color: '#fafafa', fontWeight: 600 }}>معاينة المرفق بدقة كاملة</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(previewImage);
                      const blob = await res.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = blobUrl;
                      const cleanName = previewImage.split('/').pop()?.split('?')[0] || 'attachment.png';
                      a.download = cleanName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                    } catch {
                      if (window.electronAPI.openExternal) {
                        window.electronAPI.openExternal(previewImage);
                      } else {
                        window.open(previewImage, '_blank');
                      }
                    }
                  }}
                  style={styles.lightboxActionBtn}
                  title="تحميل الصورة للحاسوب"
                >
                  <Download size={13} />
                  <span>تنزيل</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.electronAPI.openExternal) {
                      window.electronAPI.openExternal(previewImage);
                    } else {
                      window.open(previewImage, '_blank');
                    }
                  }}
                  style={styles.lightboxActionBtn}
                  title="فتح في المتصفح الخارجي"
                >
                  <ExternalLink size={13} />
                  <span>فتح</span>
                </button>
                <button
                  onClick={() => {
                    setPreviewImage(null);
                    setLightboxImgError(false);
                  }}
                  style={styles.closeBtn}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#09090b', minHeight: 200 }}>
              {!lightboxImgError ? (
                <img
                  src={previewImage}
                  alt="Preview"
                  style={styles.lightboxImg}
                  onError={() => setLightboxImgError(true)}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>تعذر تحميل الصورة مباشرة داخل التطبيق</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.electronAPI.openExternal) {
                        window.electronAPI.openExternal(previewImage);
                      } else {
                        window.open(previewImage, '_blank');
                      }
                    }}
                    style={{ ...styles.lightboxActionBtn, margin: '0 auto' }}
                  >
                    <ExternalLink size={13} />
                    <span>فتح المرفق في المتصفح الخارجي</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  headerCard: {
    backgroundColor: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  runnerDock: {
    backgroundColor: '#0c131d',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35), 0 0 12px rgba(56, 189, 248, 0.1)',
    borderRadius: 8,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  runnerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  runnerPulseDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    boxShadow: '0 0 8px rgba(34, 197, 94, 1)',
  },
  runnerSubtitle: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: 500,
    letterSpacing: '-0.01em',
  },
  runnerTaskTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#fafafa',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 320,
  },
  runnerTimerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: 6,
    padding: '4px 10px',
  },
  runnerTimerText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#38bdf8',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.05em',
  },
  runnerPauseBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#e2e8f0',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease-out',
  },
  runnerCompleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#15803d',
    border: '1px solid rgba(34, 197, 94, 0.4)',
    color: '#ffffff',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease-out',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#fafafa',
  },
  cloudBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    borderRadius: 4,
    padding: '1px 6px',
  },
  headerSub: {
    display: 'block',
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease-out',
  },
  kbdChip: {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    padding: '1px 5px',
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#e0f2fe',
    marginRight: 2,
  },
  refreshBtn: {
    backgroundColor: '#1c1c21',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#fafafa',
    borderRadius: 6,
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  segmented: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0d0d10',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    padding: 2,
  },
  segBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    fontSize: 11,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease-out',
  },
  statusFilterBtn: {
    padding: '4px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    transition: 'all 120ms ease-out',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  emptyState: {
    textAlign: 'center',
    padding: '36px 16px',
    fontSize: 12,
    color: '#71717a',
    backgroundColor: '#0d0d10',
    borderRadius: 8,
    border: '1px dashed rgba(255, 255, 255, 0.06)',
    lineHeight: 1.6,
  },
  lightboxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    backdropFilter: 'blur(5px)',
  },
  lightboxContent: {
    backgroundColor: '#121216',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    maxWidth: '90vw',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
  },
  lightboxHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  lightboxImg: {
    maxWidth: '85vw',
    maxHeight: '75vh',
    objectFit: 'contain',
    display: 'block',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    padding: 3,
  },
};

export default TasksTab;
