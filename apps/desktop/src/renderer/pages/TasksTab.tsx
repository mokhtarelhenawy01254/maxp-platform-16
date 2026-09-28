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
  Search,
  WifiOff,
  ShieldCheck,
  Flame,
  AlertCircle,
  ClipboardCheck,
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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Multi-timer active tasks map: taskId -> ActiveTaskState
  const [activeTasksMap, setActiveTasksMap] = useState<Record<string, ActiveTaskState>>(() => {
    try {
      const savedMulti = localStorage.getItem('maxp_active_tasks_multi');
      if (savedMulti) return JSON.parse(savedMulti);
      const savedSingle = localStorage.getItem('maxp_active_task');
      if (savedSingle) {
        const parsed = JSON.parse(savedSingle);
        if (parsed?.id) return { [parsed.id]: parsed };
      }
    } catch {}
    return {};
  });

  const [activeTask, setActiveTask] = useState<ActiveTaskState | null>(() => {
    try {
      const saved = localStorage.getItem('maxp_active_task');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [runnerSeconds, setRunnerSeconds] = useState<number>(0);

  const [elapsedMap, setElapsedMap] = useState<Record<string, number>>({});
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Ticking stopwatch for all active tasks simultaneously
  useEffect(() => {
    const taskIds = Object.keys(activeTasksMap);
    if (taskIds.length === 0) {
      setElapsedMap({});
      setRunnerSeconds(0);
      return;
    }

    const calcAll = () => {
      const now = Date.now();
      const updated: Record<string, number> = {};
      for (const id of taskIds) {
        const item = activeTasksMap[id];
        if (item?.startTime) {
          const diff = Math.floor((now - Number(item.startTime)) / 1000);
          const accumulated = Number(item.accumulatedSeconds || 0);
          const total = accumulated + (diff > 0 ? diff : 0);
          updated[id] = total;
          if (activeTask && activeTask.id === id) {
            setRunnerSeconds(total);
          }
        }
      }
      setElapsedMap(updated);
    };

    calcAll();
    const interval = setInterval(calcAll, 1000);
    return () => clearInterval(interval);
  }, [activeTasksMap, activeTask]);

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
    if (activeTasksMap[task.id]) {
      return;
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

    setActiveTasksMap((prev) => {
      const updated = { ...prev, [task.id]: newTask };
      try {
        localStorage.setItem('maxp_active_tasks_multi', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const timerRes = await window.electronAPI.startTaskTimer(task.id);
      const entryObj = timerRes?.entry || timerRes?.data;
      if (entryObj?.id) {
        setActiveTask((prev) => (prev?.id === task.id ? { ...prev, entryId: entryObj.id } : prev));
        setActiveTasksMap((prev) => {
          if (prev[task.id]) {
            const updated = {
              ...prev,
              [task.id]: { ...prev[task.id], entryId: entryObj.id },
            };
            try {
              localStorage.setItem('maxp_active_tasks_multi', JSON.stringify(updated));
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

  const handleStopTask = async (taskIdToStop?: string) => {
    if (taskIdToStop && activeTasksMap[taskIdToStop]) {
      const item = activeTasksMap[taskIdToStop];
      if (item.entryId) {
        try {
          await window.electronAPI.stopTaskTimer(item.entryId);
        } catch {}
      }
      setActiveTasksMap((prev) => {
        const next = { ...prev };
        delete next[taskIdToStop];
        try {
          localStorage.setItem('maxp_active_tasks_multi', JSON.stringify(next));
        } catch {}
        return next;
      });
      if (activeTask?.id === taskIdToStop) {
        setActiveTask(null);
        setRunnerSeconds(0);
        try {
          localStorage.removeItem('maxp_active_task');
        } catch {}
      }
    } else {
      // Stop all active timers
      const entries = Object.values(activeTasksMap);
      for (const item of entries) {
        if (item.entryId) {
          try {
            await window.electronAPI.stopTaskTimer(item.entryId);
          } catch {}
        }
      }
      setActiveTasksMap({});
      setActiveTask(null);
      setRunnerSeconds(0);
      try {
        localStorage.removeItem('maxp_active_tasks_multi');
        localStorage.removeItem('maxp_active_task');
      } catch {}
    }
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
        setIsOfflineMode(Boolean(res.isOffline || res.fromCache));
      } else if (!res.success && res.error) {
        setIsOfflineMode(true);
      }

      // 2. Fetch company users for assign dropdown
      const usersRes = await window.electronAPI.getCompanyUsers();
      if (usersRes.success && Array.isArray(usersRes.users)) {
        setUsers(usersRes.users);
      }

      // 3. Sync active multi-timers with backend
      try {
        const runningRes = await window.electronAPI.getRunningTaskTimer();
        if (runningRes?.success) {
          const rawTimers: any[] = Array.isArray(runningRes.runningTimers)
            ? runningRes.runningTimers
            : runningRes.runningTimer
            ? [runningRes.runningTimer]
            : [];

          setActiveTasksMap((prev) => {
            const next = { ...prev };
            const activeServerTaskIds = new Set<string>();

            for (const rt of rawTimers) {
              const isTaskDone = String(rt.task?.status || '').toUpperCase() === 'COMPLETED';
              if (isTaskDone) {
                delete next[rt.taskId];
                if (rt.id) window.electronAPI.stopTaskTimer(rt.id).catch(() => {});
                continue;
              }

              activeServerTaskIds.add(rt.taskId);
              const existing = next[rt.taskId];
              if (existing) {
                if (!existing.entryId && rt.id) {
                  next[rt.taskId] = { ...existing, entryId: rt.id };
                }
              } else {
                const serverStart = new Date(rt.startTime).getTime();
                const safeStart = !isNaN(serverStart) && serverStart <= Date.now() ? serverStart : Date.now();
                next[rt.taskId] = {
                  id: rt.taskId,
                  title: rt.task?.title || 'مهمة جارية',
                  priority: rt.task?.priority || 'MEDIUM',
                  startTime: safeStart,
                  accumulatedSeconds: 0,
                  entryId: rt.id,
                };
              }
            }

            // If verified response from server, remove local items whose server entry is gone
            if (runningRes.runningTimers !== undefined) {
              const now = Date.now();
              for (const [taskId, localItem] of Object.entries(next)) {
                // Never delete a timer started within the last 45s or one without entryId to prevent race conditions
                const isRecent = localItem.startTime && (now - Number(localItem.startTime)) < 45000;
                if (localItem.entryId && !activeServerTaskIds.has(taskId) && !isRecent) {
                  delete next[taskId];
                }
              }
            }

            try {
              localStorage.setItem('maxp_active_tasks_multi', JSON.stringify(next));
            } catch {}
            return next;
          });

          // Sync single activeTask for backward compatibility
          if (rawTimers.length > 0) {
            setActiveTask((prev) => {
              if (prev && rawTimers.some((rt) => rt.taskId === prev.id)) {
                return prev;
              }
              const first = rawTimers[0];
              return {
                id: first.taskId,
                title: first.task?.title || 'مهمة جارية',
                priority: 'MEDIUM',
                startTime: new Date(first.startTime).getTime() || Date.now(),
                accumulatedSeconds: 0,
                entryId: first.id,
              };
            });
          } else if (runningRes.runningTimers !== undefined && Array.isArray(runningRes.runningTimers) && runningRes.runningTimers.length === 0) {
            setActiveTask(null);
            try {
              localStorage.removeItem('maxp_active_task');
            } catch {}
          }
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
      if (activeTasksMap[taskId]) {
        const item = activeTasksMap[taskId];
        if (item?.entryId) {
          try {
            await window.electronAPI.stopTaskTimer(item.entryId);
          } catch {}
        }
        setActiveTasksMap((prev) => {
          const next = { ...prev };
          delete next[taskId];
          try {
            localStorage.setItem('maxp_active_tasks_multi', JSON.stringify(next));
          } catch {}
          return next;
        });
      }

      if (activeTask?.id === taskId) {
        let entryId = activeTask?.entryId;
        setActiveTask(null);
        setRunnerSeconds(0);
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

  const displayTasks = filteredTasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = (t.title || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    const creator = (t.createdByName || t.creator?.name || '').toLowerCase();
    const assignee = (t.assignedToName || t.assignee?.name || '').toLowerCase();
    return title.includes(q) || desc.includes(q) || creator.includes(q) || assignee.includes(q);
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

  const urgentCount = tasks.filter(
    (t) => String(t.priority || '').toUpperCase() === 'URGENT' && String(t.status || '').toUpperCase() !== 'COMPLETED'
  ).length;

  const activeTaskObj = tasks.find((t) => t.id === activeTask?.id);
  const isCreatorOfActive = !!(
    activeTaskObj &&
    (activeTaskObj.createdBy === currentUser?.id || activeTaskObj.createdBy === currentUser?.userId)
  );
  const canDirectCompleteActive = isAdminOrManager || isCreatorOfActive;

  const activeTaskIdsList = Object.keys(activeTasksMap);

  // Smart 2026 SaaS sorting: running timers pinned to top, urgent tasks next, eliminating visual clutter
  const sortedDisplayTasks = [...displayTasks].filter(Boolean).sort((a, b) => {
    if (!a || !b) return 0;
    const aRunning = (a.id && activeTasksMap?.[a.id]) ? 1 : 0;
    const bRunning = (b.id && activeTasksMap?.[b.id]) ? 1 : 0;
    if (aRunning !== bRunning) return bRunning - aRunning;

    const priorityWeight: Record<string, number> = {
      URGENT: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };
    const aWeight = priorityWeight[String(a.priority || '').toUpperCase()] || 0;
    const bWeight = priorityWeight[String(b.priority || '').toUpperCase()] || 0;
    if (aWeight !== bWeight) return bWeight - aWeight;

    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    return 0;
  });

  return (
    <div style={styles.container}>
      {/* Top Scope & Action Bar (Zero Overflow 2026 Strip) */}
      <div style={styles.topControlStrip}>
        {/* Right Side: Scope Segmented Switcher */}
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
            title="المهام المسندة إليّ والمطلوب مني تنفيذها"
          >
            <span>مهامي</span>
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
            title="المهام التي قمت بإنشائها وتكليف زملائي بها"
          >
            <Users size={12} />
            <span>مهام أنشأتها</span>
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
            title="عرض جميع مهام الفريق على مستوى الشركة"
          >
            <Layers size={12} />
            <span>مهام الفريق</span>
          </button>
        </div>

        {/* Left Side: Sync Status + Refresh + Primary New Task Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={styles.cloudBadge} title="مزامنة فورية مشفرة مع السيرفر السحابي">
            <span style={styles.syncPulseDot} />
            <span style={{ fontSize: 10 }}>مزامنة فورية</span>
          </div>

          <button
            onClick={() => loadData(true)}
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

      {/* Offline Status Alert Banner */}
      {isOfflineMode && (
        <div style={styles.offlineBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={15} color="#f59e0b" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              أنت تعمل في وضع عدم الاتصال (Offline Cache) — يتم عرض البيانات المحفوظة محلياً، وستتم المزامنة تلقائياً فور عودة الشبكة.
            </span>
          </div>
          <button
            onClick={() => loadData(true)}
            style={styles.offlineRetryBtn}
            title="إعادة محاولة المزامنة مع السيرفر"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>إعادة المزامنة</span>
          </button>
        </div>
      )}

      {/* Active Tasks Multi-Runner Dock */}
      {activeTaskIdsList.length > 0 && (
        <div style={styles.multiRunnerContainer}>
          <div style={styles.multiRunnerHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={styles.runnerPulseDotStatic} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                المؤقتات قيد التشغيل التزامني
              </span>
              <span style={styles.multiRunnerCountBadge}>
                {activeTaskIdsList.length} {activeTaskIdsList.length === 1 ? 'مهمة نشطة' : 'مهام متزامنة'}
              </span>
            </div>

            {activeTaskIdsList.length > 1 && (
              <button
                onClick={() => handleStopTask()}
                style={styles.stopAllBtn}
                title="إيقاف جميع المؤقتات الشغالة حالياً دفعة واحدة"
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <Pause size={11} />
                <span>إيقاف جميع المؤقتات ({activeTaskIdsList.length})</span>
              </button>
            )}
          </div>

          <div style={styles.multiRunnerList}>
            {activeTaskIdsList.map((id) => {
              const item = activeTasksMap[id];
              if (!item) return null;
              const taskSeconds = elapsedMap[id] || 0;
              const taskObj = tasks.find((t) => t && t.id === id);
              const isCreator = !!(
                taskObj &&
                (taskObj.createdBy === currentUser?.id || taskObj.createdBy === currentUser?.userId)
              );
              const canDirectComplete = isAdminOrManager || isCreator;
              const taskTitle = item.title || taskObj?.title || 'مهمة جارية';

              return (
                <div key={id} style={styles.multiRunnerItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <div style={styles.runnerIconBox}>
                      <span style={styles.runnerPulseDot} />
                      <Play size={12} fill="#22c55e" color="#22c55e" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={styles.runnerTaskTitle} title={taskTitle}>
                        {taskTitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={styles.runnerTimerBadge} title="عداد وقت العمل الفعلي">
                      <Clock size={12} color="#38bdf8" />
                      <span style={styles.runnerTimerText}>{formatRunnerTimer(taskSeconds)}</span>
                    </div>

                    <button
                      onClick={() => handleStopTask(id)}
                      style={styles.runnerPauseBtn}
                      title="إيقاف مؤقت لهذه المهمة"
                      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    >
                      <Pause size={11} />
                      <span>إيقاف</span>
                    </button>

                    <button
                      onClick={() => {
                        audioAlerts.playTaskComplete();
                        handleUpdateStatus(id, 'IN_REVIEW');
                      }}
                      style={styles.runnerSubmitBtn}
                      title="تسليم المهمة للمراجعة والاعتماد"
                      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    >
                      <Send size={11} />
                      <span>للمراجعة</span>
                    </button>

                    {canDirectComplete && (
                      <button
                        onClick={() => {
                          audioAlerts.playTaskComplete();
                          handleUpdateStatus(id, 'COMPLETED');
                        }}
                        style={styles.runnerCompleteBtn}
                        title="اعتماد وإنجاز المهمة مباشرة"
                        onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                        onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                      >
                        <CheckCircle2 size={12} />
                        <span>إنجاز</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
                <div
                  style={{
                    ...styles.teamStopwatchBadge,
                    borderColor: timer.elapsedSeconds > 4 * 3600 ? 'rgba(245, 158, 11, 0.45)' : (styles.teamStopwatchBadge.borderColor || 'rgba(34, 197, 94, 0.25)'),
                    backgroundColor: timer.elapsedSeconds > 4 * 3600 ? 'rgba(245, 158, 11, 0.12)' : (styles.teamStopwatchBadge.backgroundColor || 'rgba(34, 197, 94, 0.08)'),
                  }}
                  title={timer.elapsedSeconds > 4 * 3600 ? 'تنبيه: وقت العمل تجاوز 4 ساعات متواصلة (احتمال خمول أو نسيان)' : 'عداد وقت العمل الفعلي على المهمة'}
                >
                  <Clock size={11} color={timer.elapsedSeconds > 4 * 3600 ? '#f59e0b' : '#22c55e'} />
                  <span
                    style={{
                      ...styles.teamStopwatchText,
                      color: timer.elapsedSeconds > 4 * 3600 ? '#f59e0b' : styles.teamStopwatchText.color,
                    }}
                  >
                    {formatRunnerTimer(timer.elapsedSeconds)} {timer.elapsedSeconds > 4 * 3600 ? '⚠️' : ''}
                  </span>
                </div>

                {/* Manager Remote Stop Action */}
                {isAdminOrManager && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm(`هل تريد إيقاف المؤقت للموظف (${timer.userName})؟`)) {
                        try {
                          await window.electronAPI.stopTaskTimer(timer.id);
                          loadTasks(activeView);
                        } catch (err: any) {
                          alert('تعذر إيقاف المؤقت: ' + err.message);
                        }
                      }
                    }}
                    style={{
                      marginRight: 6,
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#ef4444',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 6px',
                      cursor: 'pointer',
                    }}
                    title="إيقاف المؤقت إدارياً"
                  >
                    إيقاف
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Linear-Style Tasks Surface Chassis (Unified Single-Surface) */}
      <div style={styles.list}>
        {/* Table Filter & Status Ribbon (Directly integrated into the top of the chassis) */}
        <div style={styles.tableFilterRibbon}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {(['IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const).map((s) => {
              const count = s === 'IN_PROGRESS' ? inProgressCount : s === 'IN_REVIEW' ? inReviewCount : completedCount;
              const isSelected = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    ...styles.statusTabBtn,
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    borderColor: isSelected ? 'var(--border-strong)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-dim)',
                    fontWeight: isSelected ? 600 : 500,
                  }}
                >
                  <span>
                    {s === 'IN_PROGRESS' && 'قيد التنفيذ'}
                    {s === 'IN_REVIEW' && 'قيد الاعتماد'}
                    {s === 'COMPLETED' && 'المكتملة'}
                  </span>
                  <span
                    style={{
                      ...styles.countBadge,
                      backgroundColor: isSelected
                        ? s === 'IN_REVIEW' && inReviewCount > 0
                          ? 'rgba(168, 85, 247, 0.25)'
                          : 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected
                        ? s === 'IN_REVIEW' && inReviewCount > 0
                          ? '#c084fc'
                          : 'var(--text-primary)'
                        : 'var(--text-dim)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Live Search Input */}
          <div style={styles.searchBox}>
            <Search size={12} color="var(--text-dim)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث سريع في المهام…"
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={styles.searchClearBtn}
                title="إلغاء البحث"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Table Column Headers (Linear / Raycast 2026 Style) */}
        {displayTasks.length > 0 && (
          <div style={styles.tableHeaderRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={styles.tableColLabel}>المهمة</span>
            </div>
            <div style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>
              <span style={styles.tableColLabel}>{activeView === 'my-tasks' ? 'المنشئ' : 'المكلف'}</span>
            </div>
            <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
              <span style={styles.tableColLabel}>المقدر</span>
            </div>
            <div style={{ width: 72, textAlign: 'center', flexShrink: 0 }}>
              <span style={styles.tableColLabel}>الاستحقاق</span>
            </div>
            <div style={{ width: 135, textAlign: 'left', flexShrink: 0, paddingLeft: 4 }}>
              <span style={styles.tableColLabel}>الإجراءات</span>
            </div>
          </div>
        )}

        {loading && tasks.length === 0 ? (
          <div style={styles.emptyState}>جاري جلب المهام من السيرفر السحابي…</div>
        ) : displayTasks.length === 0 ? (
          <div style={styles.emptyState}>
            {searchQuery ? (
              <div>
                <div>لم يتم العثور على أي مهمة تطابق البحث "{searchQuery}".</div>
                <button
                  onClick={() => setSearchQuery('')}
                  style={styles.emptyResetBtn}
                >
                  إعادة ضبط البحث
                </button>
              </div>
            ) : (
              <div>
                <div>لا توجد مهام في هذا التصنيف حالياً.</div>
                {activeView === 'my-tasks' && (
                  <button
                    onClick={() => setActiveView('all')}
                    style={styles.emptySwitchBtn}
                  >
                    <Layers size={13} />
                    <span>عرض جميع مهام الفريق والشركة</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          sortedDisplayTasks.map((t) => (
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
              activeTaskIds={elapsedMap}
              activeRunnerSeconds={runnerSeconds}
              onStartTask={handleStartTask}
              onStopTask={handleStopTask}
              viewType={activeView}
            />
          ))
        )}

        {/* Table Telemetry Footer Bar (Eliminates abrupt bottom cutoff & anchors chassis) */}
        <div style={styles.tableFooterRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={styles.tableFooterText}>
              عرض {displayTasks.length} من {tasks.length} مهمة
            </span>
            {urgentCount > 0 && (
              <span style={styles.footerUrgentBadge}>
                {urgentCount} عاجل
              </span>
            )}
            {inReviewCount > 0 && (
              <span style={styles.footerReviewBadge}>
                {inReviewCount} بانتظار الاعتماد
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={styles.footerKbdHint}>
              <kbd style={styles.kbdTiny} dir="ltr">Ctrl+N</kbd>
              <span>مهمة جديدة</span>
            </span>
            <span style={styles.footerKbdHint}>
              <kbd style={styles.kbdTiny} dir="ltr">Ctrl+R</kbd>
              <span>تحديث</span>
            </span>
          </div>
        </div>
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
  topControlStrip: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '6px 12px',
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
  offlineBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  offlineRetryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    color: '#f59e0b',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  multiRunnerContainer: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    boxShadow: 'var(--shadow-card)',
    borderRadius: 8,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  multiRunnerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottom: '1px solid var(--border-subtle)',
  },
  runnerPulseDotStatic: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 0 8px var(--accent-green-dim)',
    display: 'inline-block',
  },
  multiRunnerCountBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 10,
    backgroundColor: 'var(--accent-green-bg)',
    color: 'var(--accent-green)',
    border: '1px solid var(--accent-green-border)',
    fontVariantNumeric: 'tabular-nums',
  },
  stopAllBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease-out',
  },
  multiRunnerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  multiRunnerItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '6px 10px',
    backgroundColor: 'var(--bg-elevated)',
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
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
    gap: 5,
    padding: '4px 10px',
    fontSize: 11,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    whiteSpace: 'nowrap',
    transition: 'all 120ms ease-out',
  },
  tableFilterRibbon: {
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottom: '1px solid var(--border-default)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusTabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 120ms ease-out',
  },
  countBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 10,
    fontVariantNumeric: 'tabular-nums',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '3px 8px',
    width: 170,
  },
  searchInput: {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: 11,
    fontFamily: 'inherit',
    width: '100%',
  },
  searchClearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: 'var(--shadow-card)',
  },
  tableHeaderRow: {
    minHeight: 28,
    height: 28,
    padding: '0 14px',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderBottom: '1px solid var(--border-default)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    userSelect: 'none',
  },
  tableColLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-dim)',
    letterSpacing: '0.02em',
  },
  emptyState: {
    textAlign: 'center',
    padding: '36px 16px',
    fontSize: 12,
    color: 'var(--text-dim)',
    backgroundColor: 'transparent',
    lineHeight: 1.6,
  },
  emptyResetBtn: {
    marginTop: 8,
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-elevated)',
    color: '#38bdf8',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
  },
  emptySwitchBtn: {
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
  },
  tableFooterRow: {
    minHeight: 28,
    padding: '4px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    fontSize: 11,
    color: 'var(--text-dim)',
    flexWrap: 'nowrap',
    overflow: 'hidden',
  },
  tableFooterText: {
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  footerUrgentBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    padding: '1px 6px',
    borderRadius: 4,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  footerReviewBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#c084fc',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
    padding: '1px 6px',
    borderRadius: 4,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  footerKbdHint: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: 'var(--text-dim)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  kbdTiny: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 3,
    padding: '1px 4px',
    fontSize: 9,
    fontFamily: 'monospace',
    color: 'var(--text-secondary)',
    display: 'inline-block',
    lineHeight: '13px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
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
