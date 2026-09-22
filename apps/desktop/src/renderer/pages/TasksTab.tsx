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
  Send,
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

export interface TeamActiveTimer {
  id: string;
  taskId: string;
  taskTitle: string;
  priority: string;
  taskStatus: string;
  projectId?: string;
  projectName?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userJobTitle?: string;
  userDepartment?: string;
  startTime: string;
  elapsedSeconds: number;
}

export const TasksTab: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'my-tasks' | 'assigned-by-me' | 'all'>('my-tasks');
  const [statusFilter, setStatusFilter] = useState<'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'>('IN_PROGRESS');
  const [users, setUsers] = useState<any[]>([]);
  const [teamActiveTimers, setTeamActiveTimers] = useState<TeamActiveTimer[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lightboxBlobUrl, setLightboxBlobUrl] = useState<string | null>(null);
  const [lightboxImgError, setLightboxImgError] = useState(false);
  const [isLightboxLoading, setIsLightboxLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState('https://maxp.online');
  const [authToken, setAuthToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Authenticated or direct blob loader for lightbox images (3-tier resilient loader)
  useEffect(() => {
    if (!previewImage) {
      if (lightboxBlobUrl && lightboxBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(lightboxBlobUrl);
      }
      setLightboxBlobUrl(null);
      setLightboxImgError(false);
      setIsLightboxLoading(false);
      return;
    }

    let isCancelled = false;
    setLightboxImgError(false);
    setIsLightboxLoading(true);

    // 0. If it's already a data: or blob: URI, render directly
    if (previewImage.startsWith('data:') || previewImage.startsWith('blob:')) {
      setLightboxBlobUrl(previewImage);
      setIsLightboxLoading(false);
      return;
    }

    const loadAttachment = async () => {
      // 1. Tier 1: Try loading via Electron main process IPC (bypasses any renderer CORS/CSP/network quirks)
      if (window.electronAPI?.fetchAttachment) {
        try {
          const ipcRes = await window.electronAPI.fetchAttachment(previewImage);
          if (!isCancelled && ipcRes.success && ipcRes.dataUrl) {
            setLightboxBlobUrl(ipcRes.dataUrl);
            setLightboxImgError(false);
            setIsLightboxLoading(false);
            return;
          }
        } catch (ipcErr) {
          console.warn('[TasksTab] IPC fetchAttachment error, falling back to renderer fetch:', ipcErr);
        }
      }

      // 2. Tier 2: Renderer fetch with authorization headers
      try {
        const headers: Record<string, string> = {};
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        const res = await fetch(previewImage, { headers });
        if (res.ok) {
          const blob = await res.blob();
          if (!isCancelled) {
            const url = URL.createObjectURL(blob);
            setLightboxBlobUrl(url);
            setLightboxImgError(false);
            setIsLightboxLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[TasksTab] Blob fetch failed, falling back to direct URL in img tag:', err);
      }

      // 3. Tier 3: Fall back to letting the <img> tag try direct previewImage URL
      if (!isCancelled) {
        setIsLightboxLoading(false);
      }
    };

    loadAttachment();

    return () => {
      isCancelled = true;
      if (lightboxBlobUrl && lightboxBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(lightboxBlobUrl);
      }
    };
  }, [previewImage, authToken]);

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
    if (!activeTask?.startTime) {
      setRunnerSeconds(0);
      return;
    }

    const startTime = Number(activeTask.startTime);
    const accumulated = Number(activeTask.accumulatedSeconds || 0);

    const calc = () => {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      const elapsed = accumulated + (diff > 0 ? diff : 0);
      setRunnerSeconds(elapsed);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [activeTask?.id, activeTask?.startTime, activeTask?.accumulatedSeconds]);

  // Real-time ticking stopwatch for all company active timers
  useEffect(() => {
    if (teamActiveTimers.length === 0) return;
    const interval = setInterval(() => {
      setTeamActiveTimers((prev) =>
        prev.map((timer) => ({
          ...timer,
          elapsedSeconds: timer.elapsedSeconds + 1,
        }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [teamActiveTimers.length]);

  const handleStartTask = async (task: any) => {
    // If clicking on a task that is ALREADY active, do nothing
    if (activeTask && activeTask.id === task.id) {
      return;
    }

    // If another task was running, stop its timer first
    if (activeTask?.entryId) {
      try {
        await window.electronAPI.stopTaskTimer(activeTask.entryId);
      } catch {}
    }

    const newTask: ActiveTaskState = {
      id: task.id,
      title: task.title,
      priority: task.priority || 'MEDIUM',
      startTime: Date.now(),
      accumulatedSeconds: 0,
    };
    setActiveTask(newTask);
    try {
      localStorage.setItem('maxp_active_task', JSON.stringify(newTask));
    } catch {}

    try {
      const timerRes = await window.electronAPI.startTaskTimer(task.id);
      const entryObj = timerRes?.entry || timerRes?.data;
      if (entryObj?.id) {
        setActiveTask((prev) => {
          if (prev && prev.id === task.id) {
            const updated = { ...prev, entryId: entryObj.id };
            try {
              localStorage.setItem('maxp_active_task', JSON.stringify(updated));
            } catch {}
            return updated;
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('[TasksTab] startTaskTimer failed:', err);
    }

    // Auto-switch status to IN_PROGRESS if currently PENDING / TODO
    const norm = String(task.status || '').toUpperCase();
    if (norm !== 'IN_PROGRESS' && norm !== 'COMPLETED' && norm !== 'IN_REVIEW') {
      handleUpdateStatus(task.id, 'IN_PROGRESS');
    }
  };

  const handleStopTask = async () => {
    let entryId = activeTask?.entryId;
    if (!entryId) {
      try {
        const runningRes = await window.electronAPI.getRunningTaskTimer();
        if (runningRes?.success && runningRes.runningTimer?.id) {
          entryId = runningRes.runningTimer.id;
        }
      } catch {}
    }
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
            setActiveTask((prev) => {
              // If the task is ALREADY running locally with the SAME id, preserve local startTime!
              if (prev && prev.id === rt.taskId) {
                if (!prev.entryId && rt.id) {
                  const updated = { ...prev, entryId: rt.id };
                  try {
                    localStorage.setItem('maxp_active_task', JSON.stringify(updated));
                  } catch {}
                  return updated;
                }
                return prev; // Same instance -> ZERO re-triggering of effect!
              }

              // Otherwise initialize from server timer
              const serverStart = new Date(rt.startTime).getTime();
              const safeStart = !isNaN(serverStart) && serverStart <= Date.now() ? serverStart : Date.now();
              const newTaskState: ActiveTaskState = {
                id: rt.taskId,
                title: rt.task?.title || 'مهمة جارية',
                priority: 'MEDIUM',
                startTime: safeStart,
                accumulatedSeconds: 0,
                entryId: rt.id,
              };
              try {
                localStorage.setItem('maxp_active_task', JSON.stringify(newTaskState));
              } catch {}
              return newTaskState;
            });
          }
        } else if (runningRes?.success && !runningRes.runningTimer) {
          // Only clear if activeTask was verified on server and now stopped
          setActiveTask((prev) => {
            if (prev?.entryId) {
              try {
                localStorage.removeItem('maxp_active_task');
              } catch {}
              return null;
            }
            return prev;
          });
        }
      } catch {}

      // 4. Fetch company active running timers for team managers
      const roleStr = String(authState?.user?.role || '').toUpperCase();
      const isMgr = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER'].includes(roleStr);
      if (isMgr) {
        try {
          const activeRes = await window.electronAPI.getCompanyActiveTimers();
          if (activeRes?.success && Array.isArray(activeRes.activeTimers)) {
            setTeamActiveTimers(activeRes.activeTimers);
          }
        } catch (err) {
          console.warn('[TasksTab] getCompanyActiveTimers error:', err);
        }
      }
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

  const userRole = String(currentUser?.role || '').toUpperCase();
  const isAdminOrManager = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(userRole);

  const handleUpdateStatus = async (taskId: string, targetStatus: string) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    const prevStatus = currentTask?.status || 'PENDING';

    // If completing the task or submitting for review, stop runner and clear state
    if (targetStatus === 'COMPLETED' || targetStatus === 'IN_REVIEW') {
      if (activeTask?.id === taskId) {
        let entryId = activeTask?.entryId;
        setActiveTask(null);
        try {
          localStorage.removeItem('maxp_active_task');
        } catch {}
        if (!entryId) {
          try {
            const runningRes = await window.electronAPI.getRunningTaskTimer();
            if (runningRes?.success && runningRes.runningTimer?.id) {
              entryId = runningRes.runningTimer.id;
            }
          } catch {}
        }
        if (entryId) {
          try {
            await window.electronAPI.stopTaskTimer(entryId);
          } catch (err) {
            console.warn('[TasksTab] stopTaskTimer on complete failed:', err);
          }
        }
      }
    }

    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    if (targetStatus === 'IN_REVIEW') {
      setStatusFilter('IN_REVIEW');
    }

    try {
      const res = await window.electronAPI.updateTaskStatus(taskId, targetStatus);
      if (res && res.success === false) {
        throw new Error(res.error || 'فشل في تحديث حالة المهمة على السيرفر');
      }
      if (res?.task?.status) {
        const finalStatus = res.task.status;
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...res.task, status: finalStatus } : t))
        );
      }
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
    const isReview =
      String(currentStatus || '').toUpperCase() === 'IN_REVIEW' ||
      String(currentStatus || '').toUpperCase() === 'PENDING_REVIEW';

    if (isCompleted || isReview) {
      handleUpdateStatus(taskId, 'PENDING');
      return;
    }

    const taskObj = tasks.find((t) => t.id === taskId);
    const isCreator = !!(
      taskObj &&
      (taskObj.createdBy === currentUser?.id || taskObj.createdBy === currentUser?.userId)
    );
    const canDirectComplete = isAdminOrManager || isCreator;

    if (canDirectComplete) {
      handleUpdateStatus(taskId, 'COMPLETED');
    } else {
      // Non-admin assignee submits task for review and approval
      handleUpdateStatus(taskId, 'IN_REVIEW');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const raw = String(t.status || '').toUpperCase();
    const isDone = raw === 'COMPLETED';
    const isReview = raw === 'IN_REVIEW' || raw === 'PENDING_REVIEW';
    if (statusFilter === 'IN_REVIEW') return isReview;
    if (statusFilter === 'COMPLETED') return isDone;
    return !isDone && !isReview;
  });

  const completedCount = tasks.filter(
    (t) => String(t.status || '').toUpperCase() === 'COMPLETED'
  ).length;

  const inReviewCount = tasks.filter((t) => {
    const s = String(t.status || '').toUpperCase();
    return s === 'IN_REVIEW' || s === 'PENDING_REVIEW';
  }).length;

  const inProgressCount = tasks.filter((t) => {
    const s = String(t.status || '').toUpperCase();
    return s !== 'COMPLETED' && s !== 'IN_REVIEW' && s !== 'PENDING_REVIEW';
  }).length;

  const activeTaskObj = tasks.find((t) => t.id === activeTask?.id);
  const isCreatorOfActive = !!(
    activeTaskObj &&
    (activeTaskObj.createdBy === currentUser?.id || activeTaskObj.createdBy === currentUser?.userId)
  );
  const canDirectCompleteActive = isAdminOrManager || isCreatorOfActive;

  return (
    <div style={styles.container}>
      {/* Unified 2026 Control Bar: Views + Status Filters + Action Controls */}
      <div style={styles.unifiedControlBar}>
        {/* Left Side: View Switcher & Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={styles.segmented}>
            <button
              onClick={() => setActiveView('my-tasks')}
              style={{
                ...styles.segBtn,
                backgroundColor: activeView === 'my-tasks' ? 'var(--bg-elevated)' : 'transparent',
                color: activeView === 'my-tasks' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeView === 'my-tasks' ? 600 : 400,
                boxShadow: activeView === 'my-tasks' ? 'var(--shadow-card)' : 'none',
              }}
            >
              <span>مهامي الموكلة إليّ</span>
            </button>
            <button
              onClick={() => setActiveView('assigned-by-me')}
              style={{
                ...styles.segBtn,
                backgroundColor: activeView === 'assigned-by-me' ? 'var(--bg-elevated)' : 'transparent',
                color: activeView === 'assigned-by-me' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeView === 'assigned-by-me' ? 600 : 400,
                boxShadow: activeView === 'assigned-by-me' ? 'var(--shadow-card)' : 'none',
              }}
            >
              <Users size={12} />
              <span>مهام أنشأتها للزملاء</span>
            </button>
            <button
              onClick={() => setActiveView('all')}
              style={{
                ...styles.segBtn,
                backgroundColor: activeView === 'all' ? 'var(--bg-elevated)' : 'transparent',
                color: activeView === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeView === 'all' ? 600 : 400,
                boxShadow: activeView === 'all' ? 'var(--shadow-card)' : 'none',
              }}
            >
              <Layers size={12} />
              <span>كل مهام الفريق</span>
            </button>
          </div>

          <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-subtle)' }} />

          {/* Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {(['IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  ...styles.statusFilterBtn,
                  backgroundColor: statusFilter === s ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  borderColor: statusFilter === s ? 'var(--border-strong)' : 'transparent',
                  color: statusFilter === s ? 'var(--text-primary)' : 'var(--text-dim)',
                  fontWeight: statusFilter === s ? 600 : 500,
                }}
              >
                {s === 'IN_PROGRESS' && `قيد التنفيذ (${inProgressCount})`}
                {s === 'IN_REVIEW' && `قيد الاعتماد (${inReviewCount})`}
                {s === 'COMPLETED' && `المكتملة (${completedCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Sync Status + Refresh + Quick Create */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={styles.cloudBadge} title="مزامنة فورية مشفرة مع السيرفر السحابي">
            <span style={styles.syncPulseDot} />
            <span>مزامنة فورية</span>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            style={styles.refreshBtn}
            title="تحديث ومزامنة المهام (Ctrl + R)"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            style={styles.addBtn}
            title="إنشاء مهمة جديدة (Ctrl + N)"
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            <Plus size={13} />
            <span>مهمة جديدة</span>
            <span style={styles.kbdChip}>Ctrl+N</span>
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

            {/* Submit for Review Button (Available to all) */}
            <button
              onClick={() => {
                audioAlerts.playTaskComplete();
                handleUpdateStatus(activeTask.id, 'IN_REVIEW');
              }}
              style={styles.runnerSubmitBtn}
              title="تسليم المهمة للمراجعة والاعتماد (نقلها لقيد الاعتماد)"
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <Send size={12} />
              <span>تسليم للمراجعة</span>
            </button>

            {/* Direct Complete Task Button (Admins & Task Creators Only) */}
            {canDirectCompleteActive && (
              <button
                onClick={() => {
                  audioAlerts.playTaskComplete();
                  handleUpdateStatus(activeTask.id, 'COMPLETED');
                }}
                style={styles.runnerCompleteBtn}
                title="اعتماد وإنجاز المهمة مباشرة (المكتمل) — متاح للإدارة ومنشئ المهمة فقط"
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <CheckCircle2 size={13} />
                <span>إنجاز مباشر</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Team Live Active Tasks Cockpit for Managers */}
      {isAdminOrManager && teamActiveTimers.length > 0 && (
        <div style={styles.teamCockpitBox}>
          <div style={styles.teamCockpitHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={styles.teamPulseDot} />
              <span style={styles.teamCockpitTitle}>أعضاء الفريق قيد العمل المباشر الآن</span>
              <span style={styles.teamCockpitCountBadge}>
                {teamActiveTimers.length} {teamActiveTimers.length === 1 ? 'عضو' : 'أعضاء'}
              </span>
            </div>
            <span style={styles.teamCockpitSubtitle}>
              تتبع حي فوري للمهام الجاري إنجازها في هذه اللحظة
            </span>
          </div>

          <div style={styles.teamCockpitGrid}>
            {teamActiveTimers.map((timer) => (
              <div
                key={timer.id}
                style={styles.teamTimerCard}
                onClick={() => {
                  setActiveView('all');
                }}
                title={`الضغط لعرض كل المهام — يعمل على: ${timer.taskTitle}`}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                {/* User Avatar & Info */}
                <div style={styles.teamUserSection}>
                  <div style={styles.teamAvatar}>
                    {timer.userName ? timer.userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={styles.teamUserName} title={timer.userName}>{timer.userName}</div>
                    <div style={styles.teamUserDept} title={timer.userJobTitle || timer.userDepartment || 'فريق العمل'}>
                      {timer.userJobTitle || timer.userDepartment || 'فريق العمل'}
                    </div>
                  </div>
                </div>

                {/* Task Title & Project */}
                <div style={styles.teamTaskSection}>
                  <div style={styles.teamTaskTitle} title={timer.taskTitle}>
                    {timer.taskTitle}
                  </div>
                  {timer.projectName && (
                    <span style={styles.teamProjectTag}>{timer.projectName}</span>
                  )}
                </div>

                {/* Live Stopwatch Badge */}
                <div style={styles.teamStopwatchBadge} title="عداد وقت العمل الفعلي على المهمة">
                  <Clock size={11} color="#22c55e" />
                  <span style={styles.teamStopwatchText}>
                    {formatRunnerTimer(timer.elapsedSeconds)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Tasks List */}
      <div style={styles.list}>
        {loading && tasks.length === 0 ? (
          <div style={styles.emptyState}>جاري جلب المهام من السيرفر السحابي…</div>
        ) : filteredTasks.length === 0 ? (
          <div style={styles.emptyState}>
            <div>لا توجد مهام في هذا التصنيف حالياً.</div>
            {activeView === 'my-tasks' && (
              <button
                onClick={() => setActiveView('all')}
                style={{
                  marginTop: 10,
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Layers size={13} />
                <span>عرض جميع مهام الفريق والشركة</span>
              </button>
            )}
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
            if (lightboxBlobUrl && lightboxBlobUrl.startsWith('blob:')) {
              URL.revokeObjectURL(lightboxBlobUrl);
            }
            setLightboxBlobUrl(null);
            setLightboxImgError(false);
            setIsLightboxLoading(false);
          }}
        >
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.lightboxHeader}>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>معاينة المرفق بدقة كاملة</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const downloadSource = lightboxBlobUrl || previewImage;
                      const a = document.createElement('a');
                      a.href = downloadSource;
                      const cleanName = previewImage.split('/').pop()?.split('?')[0] || 'attachment.png';
                      a.download = cleanName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
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
                    if (lightboxBlobUrl && lightboxBlobUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(lightboxBlobUrl);
                    }
                    setLightboxBlobUrl(null);
                    setLightboxImgError(false);
                    setIsLightboxLoading(false);
                  }}
                  style={styles.closeBtn}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', minHeight: 240, position: 'relative' }}>
              {isLightboxLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 32 }}>
                  <RefreshCw size={24} color="#38bdf8" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>جاري تحميل ومعالجة المرفق...</span>
                </div>
              )}

              {!lightboxImgError ? (
                <img
                  src={lightboxBlobUrl || previewImage}
                  alt="Preview"
                  style={{
                    ...styles.lightboxImg,
                    display: isLightboxLoading ? 'none' : 'block',
                  }}
                  onLoad={() => {
                    setIsLightboxLoading(false);
                    setLightboxImgError(false);
                  }}
                  onError={async () => {
                    if (!lightboxBlobUrl && window.electronAPI?.fetchAttachment) {
                      try {
                        const res = await window.electronAPI.fetchAttachment(previewImage);
                        if (res.success && res.dataUrl) {
                          setLightboxBlobUrl(res.dataUrl);
                          setIsLightboxLoading(false);
                          setLightboxImgError(false);
                          return;
                        }
                      } catch {}
                    }
                    setIsLightboxLoading(false);
                    setLightboxImgError(true);
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <p style={{ color: 'var(--accent-red)', fontSize: 13, marginBottom: 12 }}>تعذر تحميل الصورة مباشرة داخل التطبيق</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxImgError(false);
                        setIsLightboxLoading(true);
                        if (window.electronAPI?.fetchAttachment && previewImage) {
                          window.electronAPI.fetchAttachment(previewImage).then((res) => {
                            if (res.success && res.dataUrl) {
                              setLightboxBlobUrl(res.dataUrl);
                              setLightboxImgError(false);
                            } else {
                              setLightboxImgError(true);
                            }
                          }).catch(() => setLightboxImgError(true))
                            .finally(() => setIsLightboxLoading(false));
                        } else {
                          setIsLightboxLoading(false);
                          setLightboxImgError(true);
                        }
                      }}
                      style={styles.lightboxActionBtn}
                      title="إعادة محاولة التحميل"
                    >
                      <RefreshCw size={13} />
                      <span>إعادة المحاولة</span>
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
                    >
                      <ExternalLink size={13} />
                      <span>فتح المرفق في المتصفح الخارجي</span>
                    </button>
                  </div>
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
  unifiedControlBar: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '7px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  syncPulseDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 0 6px var(--accent-green-dim)',
    display: 'inline-block',
  },
  runnerDock: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    boxShadow: 'var(--shadow-card)',
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
    backgroundColor: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
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
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 0 8px var(--accent-green-dim)',
  },
  runnerSubtitle: {
    fontSize: 10,
    color: '#0284c7',
    fontWeight: 500,
    letterSpacing: '-0.01em',
  },
  runnerTaskTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 320,
  },
  runnerTimerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'var(--accent-blue-bg)',
    border: '1px solid var(--accent-blue-border)',
    borderRadius: 6,
    padding: '4px 10px',
  },
  runnerTimerText: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--accent-blue)',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.05em',
  },
  runnerPauseBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-secondary)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease-out',
  },
  runnerSubmitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#7e22ce',
    border: '1px solid rgba(192, 132, 252, 0.4)',
    color: '#ffffff',
    borderRadius: 6,
    padding: '5px 12px',
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
    border: '1px solid var(--accent-green-border)',
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
    color: 'var(--text-primary)',
  },
  cloudBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--accent-green)',
    backgroundColor: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 4,
    padding: '2px 7px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  headerSub: {
    display: 'block',
    fontSize: 10,
    color: 'var(--text-dim)',
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
    border: '1px solid var(--border-strong)',
    borderRadius: 3,
    padding: '1px 5px',
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#e0f2fe',
    marginRight: 2,
  },
  refreshBtn: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
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
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
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
    color: 'var(--text-dim)',
    backgroundColor: 'var(--bg-sidebar)',
    borderRadius: 8,
    border: '1px dashed var(--border-subtle)',
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
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-strong)',
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
    borderBottom: '1px solid var(--border-default)',
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
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: 3,
  },
  teamCockpitBox: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    boxShadow: 'var(--shadow-card)',
  },
  teamCockpitHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottom: '1px solid var(--border-subtle)',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  teamPulseDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    boxShadow: '0 0 6px #22c55e',
  },
  teamCockpitTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  teamCockpitCountBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    padding: '1px 6px',
    borderRadius: 9999,
    fontVariantNumeric: 'tabular-nums',
  },
  teamCockpitSubtitle: {
    fontSize: 10,
    color: 'var(--text-dim)',
  },
  teamCockpitGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 8,
  },
  teamTimerCard: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    transition: 'all 140ms ease-out',
  },
  teamUserSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    maxWidth: 100,
    minWidth: 80,
  },
  teamAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary-subtle, rgba(56, 189, 248, 0.12))',
    color: 'var(--accent-primary, #38bdf8)',
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border-strong)',
    flexShrink: 0,
  },
  teamUserName: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  teamUserDept: {
    fontSize: 9,
    color: 'var(--text-dim)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  teamTaskSection: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  teamTaskTitle: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  teamProjectTag: {
    fontSize: 9,
    color: 'var(--text-dim)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  teamStopwatchBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    padding: '3px 7px',
    borderRadius: 5,
    flexShrink: 0,
  },
  teamStopwatchText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 700,
    color: '#22c55e',
    fontVariantNumeric: 'tabular-nums',
  },
};

export default TasksTab;
