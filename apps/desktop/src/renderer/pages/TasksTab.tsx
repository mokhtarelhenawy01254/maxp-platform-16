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
  AlertTriangle,
  ClipboardCheck,
  RotateCcw,
} from 'lucide-react';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { EditTaskModal } from '../components/tasks/EditTaskModal';
import { TaskItemCard } from '../components/tasks/TaskItemCard';
import { TaskDetailDrawer } from '../components/tasks/TaskDetailDrawer';
import { ApprovalGateModal } from '../components/tasks/ApprovalGateModal';
import { TaskReportView } from '../components/tasks/reports/TaskReportView';
import { TaskUnifiedFilterBar } from '../components/tasks/TaskUnifiedFilterBar';
import {
  UnifiedTaskFilters,
  defaultUnifiedTaskFilters,
  matchesUnifiedFilter,
  parseUnifiedFiltersFromUrl,
} from '../components/tasks/taskFilterEngine';
import { audioAlerts } from '../utils/audioAlerts';

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
  const [activeView, setActiveView] = useState<'my-tasks' | 'assigned-by-me' | 'all' | 'analytics'>(() => (localStorage.getItem('maxp_tasks_view') as any) || 'my-tasks');
  const [statusFilter, setStatusFilter] = useState<'IN_PROGRESS' | 'IN_REVIEW' | 'REVISION' | 'COMPLETED'>(() => (localStorage.getItem('maxp_tasks_status') as any) || 'IN_PROGRESS');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'smart' | 'due' | 'priority' | 'alpha'>(() => (localStorage.getItem('maxp_tasks_sort') as any) || 'smart');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [undoToast, setUndoToast] = useState<{ taskId: string; from: string; to: string } | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [approvalGateTask, setApprovalGateTask] = useState<any | null>(null);
  const [listMode, setListMode] = useState<'list' | 'board'>(() => (localStorage.getItem('maxp_tasks_mode') as any) || 'list');
  const [groupByProject, setGroupByProject] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Deep-linking: sync selected task from URL hash #/tasks/<id>
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash || '';
      const match = hash.match(/^#\/tasks\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        setSelectedTaskId(match[1]);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);
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
      const entryObj = (timerRes as any)?.entry || (timerRes as any)?.data;
      if (entryObj?.id) {
        setActiveTask((prev) => (prev && prev.id === task.id ? { ...prev, entryId: entryObj.id } : prev));
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

      // Role gate evaluated once — team fetch runs in the parallel batch below
      const roleStr = String(authState?.user?.role || '').toUpperCase();
      const isMgr = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER', 'MANAGER', 'HR_MANAGER'].includes(roleStr);
      const fetchScope = activeView === 'analytics' ? 'my-tasks' : activeView;

      // Independent fetches run in parallel (auth state already resolved above)
      const [tokenRes, res, usersRes, runningRes, activeRes] = await Promise.all([
        window.electronAPI.getAuthToken().catch(() => null),
        window.electronAPI.getTasks(fetchScope),
        window.electronAPI.getCompanyUsers().catch(() => null),
        window.electronAPI.getRunningTaskTimer().catch(() => null),
        Promise.resolve(null),
      ]);

      if (tokenRes?.token) {
        setAuthToken(tokenRes.token);
      }

      if (res.success && Array.isArray(res.tasks)) {
        setTasks(res.tasks);
        setIsOfflineMode(Boolean(res.isOffline || res.fromCache));
      } else if (!res.success && res.error) {
        setIsOfflineMode(true);
      }

      if (usersRes?.success && Array.isArray(usersRes.users)) {
        setUsers(usersRes.users);
      }

      // 3. Sync active multi-timers with backend
      {
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
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
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

  // Persist view/filter so the employee finds his context after restart
  useEffect(() => {
    try {
      localStorage.setItem('maxp_tasks_view', activeView);
      localStorage.setItem('maxp_tasks_status', statusFilter);
      localStorage.setItem('maxp_tasks_sort', sortBy);
      localStorage.setItem('maxp_tasks_mode', listMode);
    } catch {}
  }, [activeView, statusFilter, sortBy, listMode]);

  // Undo toast auto-dismiss
  useEffect(() => {
    if (!undoToast) return;
    const t = setTimeout(() => setUndoToast(null), 6000);
    return () => clearTimeout(t);
  }, [undoToast]);

  // Error toast auto-dismiss
  useEffect(() => {
    if (!errorToast) return;
    const t = setTimeout(() => setErrorToast(null), 7000);
    return () => clearTimeout(t);
  }, [errorToast]);

  const undoLastAction = async () => {
    if (!undoToast) return;
    try {
      await window.electronAPI.updateTaskStatus(undoToast.taskId, undoToast.from);
      setUndoToast(null);
      loadData(false);
    } catch (err: any) {
      alert('تعذر التراجع: ' + err.message);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Kanban: click-to-move through the standard flow
  const KANBAN_FLOW = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
  const moveTask = (taskId: string, dir: 1 | -1) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    const cur = String(t.status || 'TODO').toUpperCase();
    const idx = KANBAN_FLOW.indexOf(cur);
    const nextIdx = idx === -1 ? (dir === 1 ? 0 : 0) : Math.min(KANBAN_FLOW.length - 1, Math.max(0, idx + dir));
    const next = KANBAN_FLOW[nextIdx];
    if (next !== cur) handleUpdateStatus(taskId, next);
  };

  const bulkComplete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      await Promise.all(ids.map((id) => window.electronAPI.updateTaskStatus(id, 'COMPLETED')));
      setSelectedIds(new Set());
      loadData(false);
    } catch (err: any) {
      alert('فشل التحديث الجماعي: ' + err.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const userRole = String(currentUser?.role || '').toUpperCase();
  const isAdminOrManager = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(userRole);

  const handleUpdateStatus = async (
    taskId: string,
    targetStatus: string,
    revisionReason?: string,
    returnReasonType?: string,
    returnSeverity?: number,
    options?: any
  ) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    const prevStatus = currentTask?.status || 'PENDING';
    const prevTags = currentTask?.tags;

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
      prev.map((t) => {
        if (t.id !== taskId) return t;
        let nextTags = t.tags;
        if (revisionReason) {
          if (Array.isArray(nextTags)) {
            nextTags = nextTags.includes('needs_revision') ? nextTags : [...nextTags, 'needs_revision'];
          } else if (typeof nextTags === 'string') {
            try {
              const p = JSON.parse(nextTags);
              nextTags = Array.isArray(p) && !p.includes('needs_revision') ? [...p, 'needs_revision'] : nextTags;
            } catch {
              nextTags = ['needs_revision'];
            }
          } else {
            nextTags = ['needs_revision'];
          }
        } else if (targetStatus === 'IN_REVIEW' || targetStatus === 'COMPLETED') {
          if (Array.isArray(nextTags)) {
            nextTags = nextTags.filter((tag: string) => tag !== 'needs_revision');
          }
        }
        return { ...t, status: targetStatus, tags: nextTags };
      })
    );

    if (targetStatus === 'IN_REVIEW') {
      setStatusFilter('IN_REVIEW');
    }

    try {
      const res = await window.electronAPI.updateTaskStatus(taskId, targetStatus, revisionReason, options, returnReasonType, returnSeverity);
      if (res && res.success === false) {
        throw new Error(res.error || 'فشل في تحديث حالة المهمة على السيرفر');
      }
      if (res?.task?.status) {
        const finalStatus = res.task.status;
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...res.task, status: finalStatus } : t))
        );
        if (prevStatus && String(prevStatus).toUpperCase() !== String(targetStatus).toUpperCase()) {
          setUndoToast({ taskId, from: String(prevStatus).toUpperCase(), to: targetStatus });
        }
      }
    } catch (err: any) {
      console.warn('[TasksTab] Status update failed:', err);
      alert(err?.message || 'فشل في تحديث حالة المهمة');
      // Rollback on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus, tags: prevTags } : t))
      );
      setErrorToast(err?.message || 'فشل في تحديث حالة المهمة على السيرفر');
    }
  };

  const handleApproveGate = async (options: {
    ownerOverride?: boolean;
    ownerOverrideReason?: string;
    criteriaChecked?: boolean;
  }) => {
    if (!approvalGateTask) return;
    try {
      await handleUpdateStatus(approvalGateTask.id, 'COMPLETED', undefined, undefined, undefined, options);
      setApprovalGateTask(null);
    } catch (err: any) {
      setErrorToast(err?.message || 'فشل في اعتماد المهمة');
    }
  };

  const handleReturnGate = async (reason: string) => {
    if (!approvalGateTask) return;
    try {
      await handleUpdateStatus(approvalGateTask.id, 'IN_PROGRESS', reason);
      setApprovalGateTask(null);
    } catch (err: any) {
      setErrorToast(err?.message || 'فشل في إعادة المهمة للتعديل');
    }
  };

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const isCompleted = String(currentStatus || '').toUpperCase() === 'COMPLETED';
    const isReview =
      String(currentStatus || '').toUpperCase() === 'IN_REVIEW' ||
      String(currentStatus || '').toUpperCase() === 'PENDING_REVIEW';

    if (isCompleted) {
      handleUpdateStatus(taskId, 'PENDING');
      return;
    }

    if (isReview) {
      handleUpdateStatus(taskId, 'COMPLETED');
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

  const isTaskReturned = (t: any) => {
    const rawStatus = String(t.status || '').toUpperCase();
    if (rawStatus === 'REVISION') return true;
    const tags = t.tags;
    if (!tags) return false;
    if (Array.isArray(tags)) return tags.includes('needs_revision');
    if (typeof tags === 'string') {
      try {
        const p = JSON.parse(tags);
        if (Array.isArray(p)) return p.includes('needs_revision');
      } catch {
        return tags.includes('needs_revision');
      }
    }
    return false;
  };

  const [unifiedFilters, setUnifiedFilters] = useState<UnifiedTaskFilters>(() =>
    parseUnifiedFiltersFromUrl(typeof window !== 'undefined' ? (window.location.hash || window.location.search) : '')
  );

  const filteredTasks = tasks.filter((t) => {
    // If status filter is set in unifiedFilters, respect it
    if (unifiedFilters.status && unifiedFilters.status !== 'all') {
      return matchesUnifiedFilter(t, unifiedFilters);
    }

    const raw = String(t.status || '').toUpperCase();
    const isDone = raw === 'COMPLETED';
    const isReview = raw === 'IN_REVIEW' || raw === 'PENDING_REVIEW';
    const isRev = isTaskReturned(t);

    if (statusFilter === 'REVISION') return !isDone && isRev;
    if (statusFilter === 'IN_REVIEW') return isReview;
    if (statusFilter === 'COMPLETED') return isDone;
    return !isDone && !isReview;
  });

  const displayTasks = filteredTasks.filter((t) => {
    // Apply full unified filter engine (omnisearch, user, priority, dates, tag)
    if (!matchesUnifiedFilter(t, unifiedFilters)) {
      return false;
    }
    // Also support quick search input if typed separately
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (t.title || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const creator = (t.createdByName || t.creator?.name || '').toLowerCase();
      const assignee = (t.assignedToName || t.assignee?.name || '').toLowerCase();
      const idStr = String(t.id || '').toLowerCase();
      if (!title.includes(q) && !desc.includes(q) && !creator.includes(q) && !assignee.includes(q) && !idStr.includes(q)) {
        return false;
      }
    }
    return true;
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

  const revisionCount = tasks.filter((t) => {
    const s = String(t.status || '').toUpperCase();
    return s !== 'COMPLETED' && isTaskReturned(t);
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
    if (sortBy === 'alpha') return String(a.title || '').localeCompare(String(b.title || ''), 'ar');
    if (sortBy === 'due') {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (ad !== bd) return ad - bd;
    }
    if (sortBy === 'priority') {
      const pw: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const aw = pw[String(a.priority || '').toUpperCase()] || 0;
      const bw = pw[String(b.priority || '').toUpperCase()] || 0;
      if (aw !== bw) return bw - aw;
    }
    const aRunning = (a.id && activeTasksMap?.[a.id]) ? 1 : 0;
    const bRunning = (b.id && activeTasksMap?.[b.id]) ? 1 : 0;
    if (aRunning !== bRunning) return bRunning - aRunning;

    // Smart order: overdue tasks lead (oldest due first) — the list tells a story
    if (sortBy === 'smart') {
      const done = (x: any) => String(x.status || '').toUpperCase() === 'COMPLETED';
      const nowMs = Date.now();
      const aOver = !done(a) && a.dueDate && new Date(a.dueDate).getTime() < nowMs;
      const bOver = !done(b) && b.dueDate && new Date(b.dueDate).getTime() < nowMs;
      if (aOver && bOver) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (aOver !== bOver) return aOver ? -1 : 1;
    }

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

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) || null : null;

  const handleSelectTask = useCallback((task: any) => {
    if (!task) {
      setSelectedTaskId(null);
      if (window.location.hash.startsWith('#/tasks')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else {
      setSelectedTaskId(task.id);
      window.location.hash = `#/tasks/${task.id}`;
    }
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedTaskId(null);
    if (window.location.hash.startsWith('#/tasks')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);


  // Command palette deep actions: open task in drawer / spawn create modal
  useEffect(() => {
    const onOpenTask = (e: Event) => {
      const task = (e as CustomEvent).detail;
      if (task?.id) handleSelectTask(task);
    };
    const onNewTask = () => setIsCreateOpen(true);
    window.addEventListener('maxp:open-task', onOpenTask);
    window.addEventListener('maxp:new-task', onNewTask);
    return () => {
      window.removeEventListener('maxp:open-task', onOpenTask);
      window.removeEventListener('maxp:new-task', onNewTask);
    };
  }, [handleSelectTask]);

  // Keyboard navigation for task drawer: Esc to close, ↑/↓ or j/k to navigate between tasks without interrupting timers
  useEffect(() => {
    if (!selectedTaskId) return;

    const handleDrawerKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseDrawer();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const currentIndex = sortedDisplayTasks.findIndex((t) => t.id === selectedTaskId);
        if (currentIndex >= 0 && currentIndex < sortedDisplayTasks.length - 1) {
          const nextTask = sortedDisplayTasks[currentIndex + 1];
          if (nextTask) handleSelectTask(nextTask);
        }
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const currentIndex = sortedDisplayTasks.findIndex((t) => t.id === selectedTaskId);
        if (currentIndex > 0) {
          const prevTask = sortedDisplayTasks[currentIndex - 1];
          if (prevTask) handleSelectTask(prevTask);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleDrawerKeyDown);
    return () => window.removeEventListener('keydown', handleDrawerKeyDown);
  }, [selectedTaskId, sortedDisplayTasks, handleCloseDrawer, handleSelectTask]);

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
          <button
            onClick={() => setActiveView('analytics')}
            style={{
              ...styles.segBtn,
              backgroundColor: activeView === 'analytics' ? 'var(--bg-elevated)' : 'transparent',
              color: activeView === 'analytics' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: activeView === 'analytics' ? 600 : 400,
              boxShadow: activeView === 'analytics' ? 'var(--shadow-card)' : 'none',
            }}
            title="رادار إنجاز المهام، الساعات الموثقة، وملخص اليومية بنقرة واحدة"
          >
            <ClipboardCheck size={12} color={activeView === 'analytics' ? 'var(--accent-blue)' : undefined} />
            <span>نبض الإنجاز والتقرير</span>
          </button>
        </div>

        {/* Left Side: Sync Status + Refresh + Primary New Task Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isOfflineMode && (
            <div style={styles.cloudBadge} title="مزامنة فورية مشفرة مع السيرفر السحابي">
              <span style={styles.syncPulseDot} />
              <span style={{ fontSize: 10 }}>مزامنة فورية</span>
            </div>
          )}

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

      {activeView === 'analytics' ? (
        <TaskReportView isExecutiveMode={false} />
      ) : (
        <>
          {/* Offline Status Alert Banner */}
          {isOfflineMode && (
        <div style={styles.offlineBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={15} color="var(--accent-yellow)" />
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

      {/* Linear-Style Tasks Surface Chassis (Unified Single-Surface) */}
      <div style={styles.list}>
        {/* Unified Omnisearch & Filter Bar (Web & Desktop Shared Engine) */}
        <TaskUnifiedFilterBar
          filters={unifiedFilters}
          onFiltersChange={setUnifiedFilters}
          users={users}
          onRefresh={() => loadData(true)}
          isLoading={loading}
          totalCount={tasks.length}
          filteredCount={displayTasks.length}
          className="mb-2"
        />

        {/* Table Filter & Status Ribbon (Directly integrated into the top of the chassis) */}
        <div style={styles.tableFilterRibbon}>
          {/* View mode + grouping toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setListMode(listMode === 'list' ? 'board' : 'list')}
              style={{
                ...styles.segBtn,
                backgroundColor: listMode === 'board' ? 'var(--bg-elevated)' : 'transparent',
                color: listMode === 'board' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="تبديل بين القائمة ولوحة Kanban"
            >
              <span>{listMode === 'list' ? 'عرض لوحة' : 'عرض قائمة'}</span>
            </button>
            <button
              onClick={() => setGroupByProject((v) => !v)}
              style={{
                ...styles.segBtn,
                backgroundColor: groupByProject ? 'var(--bg-elevated)' : 'transparent',
                color: groupByProject ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="تجميع المهام حسب المشروع"
            >
              <span>تجميع بالمشروع</span>
            </button>
          </div>

          {/* Sort selector (user-controlled ordering) */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={styles.sortSelect}
            title="ترتيب القائمة"
          >
            <option value="smart">ترتيب ذكي (شغّال ← أولوية ← استحقاق)</option>
            <option value="due">الأقرب استحقاقًا</option>
            <option value="priority">الأولوية فقط</option>
            <option value="alpha">أبجدي</option>
          </select>

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
                    {s === 'IN_REVIEW' && 'بانتظار الاعتماد'}
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
                          ? 'var(--accent-purple-soft)'
                          : 'var(--text-primary)'
                        : 'var(--text-dim)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {revisionCount > 0 && (
              <button
                onClick={() => setStatusFilter('REVISION')}
                style={{
                  ...styles.statusTabBtn,
                  backgroundColor: statusFilter === 'REVISION' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.05)',
                  borderColor: statusFilter === 'REVISION' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.2)',
                  color: statusFilter === 'REVISION' ? 'var(--accent-yellow)' : '#d97706',
                  fontWeight: statusFilter === 'REVISION' ? 700 : 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
                title="المهام التي تمت إعادتها للتعديل وتتطلب إجراءً"
              >
                <RotateCcw size={11} color="var(--accent-yellow)" />
                <span>مُعادة للتعديل</span>
                <span
                  style={{
                    ...styles.countBadge,
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: 'var(--accent-yellow)',
                    fontWeight: 700,
                  }}
                >
                  {revisionCount}
                </span>
              </button>
            )}
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

        {listMode === 'board' ? (
          /* ── Kanban board (click-to-move; no drag libs) ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, alignItems: 'start' }}>
            {([['TODO', 'قيد الانتظار'], ['IN_PROGRESS', 'قيد التنفيذ'], ['IN_REVIEW', 'بانتظار الاعتماد'], ['COMPLETED', 'مكتملة']] as const).map(([status, label]) => {
              const colTasks = sortedDisplayTasks.filter((t) => String(t.status || '').toUpperCase() === status).slice(0, 25);
              return (
                <div key={status} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{colTasks.length}</span>
                  </div>
                  {colTasks.length === 0 && (
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', padding: '14px 4px', border: '1px dashed var(--border-default)', borderRadius: 8 }}>
                      فاضية
                    </div>
                  )}
                  {colTasks.map((t) => {
                    const idx = KANBAN_FLOW.indexOf(String(t.status || 'TODO').toUpperCase());
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTask(t)}
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}
                        title="فتح التفاصيل"
                      >
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                          {t.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveTask(t.id, -1); }}
                            disabled={idx <= 0}
                            style={{ ...styles.kanbanMoveBtn, opacity: idx <= 0 ? 0.3 : 1 }}
                            title="رجّع خطوة للخلف"
                          >›</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveTask(t.id, 1); }}
                            disabled={idx >= KANBAN_FLOW.length - 1}
                            style={{ ...styles.kanbanMoveBtn, opacity: idx >= KANBAN_FLOW.length - 1 ? 0.3 : 1 }}
                            title="قدّم خطوة للأمام"
                          >‹</button>
                          <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--text-muted)' }}>
                            {String(t.priority || '').toUpperCase() === 'URGENT' ? '🔥 عاجل' : String(t.priority || '').toUpperCase() === 'HIGH' ? 'مرتفع' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
        <>
        {/* Table Column Headers (Linear / Raycast 2026 Style) */}
        {displayTasks.length > 0 && (
          <div style={styles.tableHeaderRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={styles.tableColLabel}>المهمة</span>
            </div>
            <div style={{ width: 90, textAlign: 'right', flexShrink: 0 }} className="task-col-person">
              <span style={styles.tableColLabel}>{activeView === 'my-tasks' ? 'المنشئ' : 'المكلف'}</span>
            </div>
            <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }} className="task-col-est">
              <span style={styles.tableColLabel}>المقدر</span>
            </div>
            <div style={{ width: 72, textAlign: 'center', flexShrink: 0 }}>
              <span style={styles.tableColLabel}>الاستحقاق</span>
            </div>
            <div style={{ width: 100, textAlign: 'left', flexShrink: 0, paddingLeft: 4 }} className="task-col-actions">
              <span style={styles.tableColLabel}>الإجراءات</span>
            </div>
          </div>
        )}

        {loading && tasks.length === 0 ? (
          <div style={styles.skeletonWrap}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={styles.skeletonRow} className="maxp-skeleton" />
            ))}
          </div>
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
          groupByProject ? (
            (() => {
              const groups = new Map<string, any[]>();
              sortedDisplayTasks.forEach((t) => {
                const p = t.projectName || 'عام';
                const arr = groups.get(p);
                if (arr) arr.push(t);
                else groups.set(p, [t]);
              });
              return [...groups.entries()].map(([proj, list]) => (
                <React.Fragment key={proj}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 4px', position: 'sticky', top: 0, background: 'var(--bg-page)', zIndex: 2 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent-blue)' }}>{proj}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{list.length} مهمة</span>
                  </div>
                  {list.map((t) => (
                    <TaskItemCard
                      key={t.id}
                      task={t}
                      selectMode={selectedIds.size > 0}
                      checked={selectedIds.has(t.id)}
                      onToggleCheck={toggleSelect}
                      onToggleStatus={handleToggleStatus}
                      onUpdateStatus={handleUpdateStatus}
                      onOpenImage={(img) => setPreviewImage(img)}
                      onEdit={(taskToEdit) => setEditingTask(taskToEdit)}
                      onSelect={handleSelectTask}
                      isSelected={selectedTaskId === t.id}
                      serverUrl={serverUrl}
                      authToken={authToken}
                      currentUserId={currentUser?.id || currentUser?.userId}
                      isAdmin={isAdminOrManager}
                      activeTaskId={activeTask?.id}
                      activeTaskIds={elapsedMap}
                      activeRunnerSeconds={runnerSeconds}
                      onStartTask={handleStartTask}
                      onStopTask={handleStopTask}
                      viewType={activeView}
                      onOpenApprovalGate={setApprovalGateTask}
                    />
                  ))}
                </React.Fragment>
              ));
            })()
          ) : (
          sortedDisplayTasks.map((t) => (
            <TaskItemCard
              key={t.id}
              task={t}
              selectMode={selectedIds.size > 0}
              checked={selectedIds.has(t.id)}
              onToggleCheck={toggleSelect}
              onToggleStatus={handleToggleStatus}
              onUpdateStatus={handleUpdateStatus}
              onOpenImage={(img) => setPreviewImage(img)}
              onEdit={(taskToEdit) => setEditingTask(taskToEdit)}
              onSelect={handleSelectTask}
              isSelected={selectedTaskId === t.id}
              serverUrl={serverUrl}
              authToken={authToken}
              currentUserId={currentUser?.id || currentUser?.userId}
              isAdmin={isAdminOrManager}
              activeTaskId={activeTask?.id}
              activeTaskIds={elapsedMap}
              activeRunnerSeconds={runnerSeconds}
              onStartTask={handleStartTask}
              onStopTask={handleStopTask}
              viewType={activeView}
              onOpenApprovalGate={setApprovalGateTask}
            />
          ))
          )
          )}
        </>
        )}
        {/* Table Telemetry Footer Bar (Eliminates abrupt bottom cutoff & anchors chassis) */}
        <div style={styles.tableFooterRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={styles.tableFooterText}>
              المقدر الكلي: {Math.round(displayTasks.reduce((s, t) => s + (Number(t.estimatedMinutes || 0) || (Number(t.estimatedHours || 0) * 60) || 0), 0) / 60 * 10) / 10} ساعة · عرض {displayTasks.length} من {tasks.length} مهمة
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
    </>
  )}

      {/* Undo toast */}
      {undoToast && (
        <div style={styles.undoBar}>
          <span>تم: {undoToast.to === 'COMPLETED' ? 'إنجاز المهمة' : 'تغيير الحالة'}</span>
          <button onClick={undoLastAction} style={styles.undoBtn}>تراجع</button>
        </div>
      )}

      {/* Error toast */}
      {errorToast && (
        <div style={{ ...styles.undoBar, backgroundColor: '#dc2626', color: '#ffffff', borderColor: '#ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} color="#ffffff" />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{errorToast}</span>
          </div>
          <button
            onClick={() => setErrorToast(null)}
            style={{ ...styles.undoBtn, color: '#ffffff', borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(0,0,0,0.2)' }}
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div style={styles.bulkBar}>
          <span>محدد: <b>{selectedIds.size}</b> مهمة</span>
          <button onClick={bulkComplete} disabled={bulkBusy} style={styles.bulkBtn}>
            {bulkBusy ? 'جاري التنفيذ…' : 'إنجاز المحدد'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ ...styles.undoBtn, backgroundColor: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
            إلغاء التحديد
          </button>
        </div>
      )}

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

      {/* Task Details Slide-Over Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={!!selectedTaskId && !!selectedTask}
        onClose={handleCloseDrawer}
        onUpdateStatus={handleUpdateStatus}
        onToggleStatus={handleToggleStatus}
        onEdit={(taskToEdit) => setEditingTask(taskToEdit)}
        onOpenImage={(img) => setPreviewImage(img)}
        serverUrl={serverUrl}
        authToken={authToken}
        currentUserId={currentUser?.id || currentUser?.userId}
        isAdmin={isAdminOrManager}
        activeTaskId={activeTask?.id}
        activeTaskIds={elapsedMap}
        activeRunnerSeconds={runnerSeconds}
        onStartTask={handleStartTask}
        onStopTask={handleStopTask}
        onOpenApprovalGate={setApprovalGateTask}
      />

      {/* Approval Gate Modal */}
      {approvalGateTask && (
        <ApprovalGateModal
          isOpen={Boolean(approvalGateTask)}
          onClose={() => setApprovalGateTask(null)}
          task={approvalGateTask}
          isAdminOrManager={isAdminOrManager}
          onApprove={handleApproveGate}
          onReturn={handleReturnGate}
        />
      )}

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
                  <RefreshCw size={24} color="var(--accent-blue)" style={{ animation: 'spin 1s linear infinite' }} />
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
    color: 'var(--accent-yellow)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
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
  runnerSubtitle: {
    fontSize: 10,
    color: 'var(--accent-blue)',
    fontWeight: 500,
    letterSpacing: '-0.01em',
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
    backgroundColor: 'var(--accent-blue)',
    color: 'var(--text-inverse)',
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
  skeletonWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '10px 12px',
  },
  skeletonRow: {
    height: 40,
    borderRadius: 8,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
  },
  kanbanMoveBtn: {
    width: 20,
    height: 18,
    borderRadius: 4,
    border: '1px solid var(--border-default)',
    background: 'var(--bg-input)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  sortSelect: {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    fontSize: 11,
    padding: '5px 8px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  undoBar: {
    position: 'fixed',
    bottom: 18,
    insetInlineStart: 18,
    zIndex: 90000,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 10,
    padding: '10px 14px',
    boxShadow: 'var(--shadow-modal)',
    fontSize: 12,
    color: 'var(--text-primary)',
  },
  undoBtn: {
    backgroundColor: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    color: 'var(--accent-green)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  bulkBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'var(--accent-blue-bg)',
    border: '1px solid var(--accent-blue-border)',
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 11.5,
    color: 'var(--text-primary)',
    flexShrink: 0,
  },
  bulkBtn: {
    backgroundColor: 'var(--accent-green)',
    border: 'none',
    color: '#ffffff',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  rowCheck: {
    width: 14,
    height: 14,
    accentColor: 'var(--accent-green)',
    cursor: 'pointer',
    flexShrink: 0,
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
    color: 'var(--accent-blue)',
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
    color: 'var(--accent-blue)',
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
    color: 'var(--accent-red)',
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
    color: 'var(--accent-purple-soft)',
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
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 0 6px var(--accent-green)',
  },
  teamCockpitTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  teamCockpitCountBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--accent-green)',
    backgroundColor: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
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
    color: 'var(--accent-primary, var(--accent-blue))',
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
    color: 'var(--accent-green)',
    fontVariantNumeric: 'tabular-nums',
  },
};

export default TasksTab;
