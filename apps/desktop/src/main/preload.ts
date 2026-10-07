import { contextBridge, ipcRenderer } from 'electron';

const CHANNELS = {
  GET_TRACKER_STATE: 'tracker:get-state',
  TOGGLE_TRACKING: 'tracker:toggle',
  PAUSE_TRACKING: 'tracker:pause',
  RESUME_TRACKING: 'tracker:resume',
  GET_DAILY_SUMMARY: 'tracker:daily-summary',
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  GET_AUTH_STATE: 'auth:get-state',
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
  TRACKER_STATE_UPDATE: 'tracker:state-update',
  NOTIFICATION: 'notification',
  TASK_ASSIGNED: 'task:assigned',
  GET_APPS_SUMMARY: 'tracker:get-apps-summary',
  GET_WEBSITES_SUMMARY: 'tracker:get-websites-summary',
  GET_SYSTEM_INFO: 'tracker:get-system-info',
  SYNC_NOW: 'tracker:sync-now',
  GET_ATTENDANCE_AUDIT: 'tracker:get-attendance-audit',
  CLOCK_IN: 'attendance:clock-in',
} as const;

/**
 * Preload script — exposes safe IPC methods to the renderer process.
 * This is the bridge between the React UI and the Electron main process.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Tracker
  getTrackerState: () => ipcRenderer.invoke(CHANNELS.GET_TRACKER_STATE),
  toggleTracking: () => ipcRenderer.invoke(CHANNELS.TOGGLE_TRACKING),
  pauseTracking: (reason?: string) => ipcRenderer.invoke(CHANNELS.PAUSE_TRACKING, reason),
  resumeTracking: () => ipcRenderer.invoke(CHANNELS.RESUME_TRACKING),
  endShift: (handoverData?: { handoverNotes?: string; pendingTasks?: string }) =>
    ipcRenderer.invoke('tracker:end-shift', handoverData),
  startShift: () => ipcRenderer.invoke('tracker:start-shift'),
  startOvertime: (data: { reason: string; taskSummary?: string }) =>
    ipcRenderer.invoke('tracker:start-overtime', data),
  endOvertime: (data?: { taskSummary?: string }) =>
    ipcRenderer.invoke('tracker:end-overtime', data),
  getShiftStatus: () => ipcRenderer.invoke('tracker:get-shift-status'),
  getDailySummary: (date?: string, endDate?: string) =>
    ipcRenderer.invoke(CHANNELS.GET_DAILY_SUMMARY, date, endDate),
  getAppsSummary: (date?: string) => ipcRenderer.invoke(CHANNELS.GET_APPS_SUMMARY, date),
  getWebsitesSummary: (date?: string) => ipcRenderer.invoke(CHANNELS.GET_WEBSITES_SUMMARY, date),
  getAllDailyStatsKeys: () => ipcRenderer.invoke('tracker:get-all-daily-keys'),
  getSystemInfo: () => ipcRenderer.invoke(CHANNELS.GET_SYSTEM_INFO),
  syncNow: () => ipcRenderer.invoke(CHANNELS.SYNC_NOW),
  getAttendanceAudit: () => ipcRenderer.invoke(CHANNELS.GET_ATTENDANCE_AUDIT),
  clockIn: () => ipcRenderer.invoke(CHANNELS.CLOCK_IN),

  // Auth
  login: (data: { email: string; password: string; serverUrl: string }) =>
    ipcRenderer.invoke(CHANNELS.LOGIN, data),
  logout: () => ipcRenderer.invoke(CHANNELS.LOGOUT),
  getAuthState: () => ipcRenderer.invoke(CHANNELS.GET_AUTH_STATE),

  // Settings
  getSettings: () => ipcRenderer.invoke(CHANNELS.GET_SETTINGS),
  updateSettings: (settings: Record<string, any>) =>
    ipcRenderer.invoke(CHANNELS.UPDATE_SETTINGS, settings),

  // Tasks Engine
  getTasks: (type?: 'my-tasks' | 'assigned-by-me' | 'all') =>
    ipcRenderer.invoke('tasks:get', type),
  getTask: (taskId: string) =>
    ipcRenderer.invoke('tasks:get-by-id', taskId),
  getCompanyUsers: () =>
    ipcRenderer.invoke('tasks:get-users'),
  createTask: (taskData: any) =>
    ipcRenderer.invoke('tasks:create', taskData),
  updateTaskStatus: (taskId: string, status: string, revisionReason?: string, options?: any, returnReasonType?: string, returnSeverity?: number) =>
    ipcRenderer.invoke('tasks:update-status', { taskId, status, revisionReason, options, returnReasonType, returnSeverity }),
  getTaskActivities: (taskId: string) =>
    ipcRenderer.invoke('tasks:get-activities', { taskId }),
  updateTask: (taskId: string, data: any) =>
    ipcRenderer.invoke('tasks:update', { taskId, data }),
  startTaskTimer: (taskId: string) =>
    ipcRenderer.invoke('tasks:start-timer', { taskId }),
  stopTaskTimer: (entryId: string) =>
    ipcRenderer.invoke('tasks:stop-timer', { entryId }),
  getRunningTaskTimer: () =>
    ipcRenderer.invoke('tasks:get-running-timer'),
  getCompanyActiveTimers: () =>
    ipcRenderer.invoke('tasks:get-company-active-timers'),
  getTeamOverview: (date?: string, endDate?: string) =>
    ipcRenderer.invoke('monitor:get-team-overview', date, endDate),
  getAuthToken: () =>
    ipcRenderer.invoke('auth:get-token'),
  uploadTaskAttachment: (data: {
    taskId: string;
    base64Data: string;
    originalName: string;
    mimeType?: string;
  }) => ipcRenderer.invoke('tasks:upload-attachment', data),
  fetchAttachment: (url: string) =>
    ipcRenderer.invoke('tasks:fetch-attachment', { url }),
  captureDesktopSnippet: () =>
    ipcRenderer.invoke('tasks:capture-screen'),
  addWatcher: (taskId: string, userId: string) =>
    ipcRenderer.invoke('tasks:add-watcher', { taskId, userId }),
  removeWatcher: (taskId: string, userId: string) =>
    ipcRenderer.invoke('tasks:remove-watcher', { taskId, userId }),
  // Task Dependencies
  getTaskDependencies: (taskId: string) =>
    ipcRenderer.invoke('tasks:get-dependencies', { taskId }),
  addTaskDependency: (taskId: string, dependsOnId: string, type: string) =>
    ipcRenderer.invoke('tasks:add-dependency', { taskId, dependsOnId, type }),
  removeTaskDependency: (dependencyId: string) =>
    ipcRenderer.invoke('tasks:remove-dependency', { dependencyId }),

  // Subtasks & Checklists
  getSubtasks: (parentTaskId: string) =>
    ipcRenderer.invoke('tasks:get-subtasks', { parentTaskId }),
  createSubtask: (data: { parentTaskId: string; title: string; assignedTo?: string; priority?: string }) =>
    ipcRenderer.invoke('tasks:create-subtask', data),
  getChecklists: (taskId: string) =>
    ipcRenderer.invoke('tasks:get-checklists', { taskId }),
  createChecklist: (taskId: string, title?: string) =>
    ipcRenderer.invoke('tasks:create-checklist', { taskId, title }),
  addChecklistItem: (checklistId: string, text: string) =>
    ipcRenderer.invoke('tasks:add-checklist-item', { checklistId, text }),
  updateChecklistItem: (itemId: string, data: { isCompleted?: boolean; text?: string }) =>
    ipcRenderer.invoke('tasks:update-checklist-item', { itemId, ...data }),
  deleteChecklistItem: (itemId: string) =>
    ipcRenderer.invoke('tasks:delete-checklist-item', { itemId }),

  // Task Comments
  getTaskComments: (taskId: string) =>
    ipcRenderer.invoke('tasks:get-comments', taskId),
  addTaskComment: (taskId: string, content: string) =>
    ipcRenderer.invoke('tasks:add-comment', { taskId, content }),
  updateTaskComment: (commentId: string, content: string) =>
    ipcRenderer.invoke('tasks:update-comment', { commentId, content }),
  deleteTaskComment: (commentId: string) =>
    ipcRenderer.invoke('tasks:delete-comment', commentId),

  // Goals (OKRs)
  getTodayGoals: (userId?: string) =>
    ipcRenderer.invoke('goals:get-today', userId),
  ensureTodayGoals: (userId?: string) =>
    ipcRenderer.invoke('goals:ensure-today', userId),
  getGoals: (params?: any) =>
    ipcRenderer.invoke('goals:get-all', params),
  createGoal: (goalData: any) =>
    ipcRenderer.invoke('goals:create', goalData),
  updateGoalProgress: (goalId: string, current: number, notes?: string) =>
    ipcRenderer.invoke('goals:update-progress', { goalId, current, notes }),

  // Performance Report & Stats
  getTaskDashboardStats: () =>
    ipcRenderer.invoke('tasks:get-dashboard-stats'),

  // HR & Self-Service
  getMyAttendanceSummary: () =>
    ipcRenderer.invoke('hr:my-attendance-summary'),
  getMyPayrollSummary: () =>
    ipcRenderer.invoke('hr:my-payroll-summary'),
  getMyPermissionsSummary: () =>
    ipcRenderer.invoke('hr:my-permissions-summary'),
  createPermissionRequest: (data: any) =>
    ipcRenderer.invoke('hr:create-permission-request', data),
  getMyPerformanceScore: () =>
    ipcRenderer.invoke('hr:my-performance-score'),

  openExternal: (url: string) =>
    ipcRenderer.invoke('shell:open-external', url),

  // Clipboard
  copyToClipboard: (text: string) =>
    ipcRenderer.invoke('clipboard:write-text', text),
  readClipboardText: () =>
    ipcRenderer.invoke('clipboard:read-text'),

  // Window Controls & System
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowToggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  getDeviceInfo: () => ipcRenderer.invoke('device:get-info'),

  // Updates
  checkForUpdates: () =>
    ipcRenderer.invoke('update:check'),
  quitAndInstallUpdate: () =>
    ipcRenderer.invoke('update:quit-and-install'),

  // Events from main process — each returns an unsubscribe function
  onUpdateStatus: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  onTrackerStateUpdate: (callback: (state: any) => void) => {
    const listener = (_: any, state: any) => callback(state);
    ipcRenderer.on(CHANNELS.TRACKER_STATE_UPDATE, listener);
    return () => ipcRenderer.removeListener(CHANNELS.TRACKER_STATE_UPDATE, listener);
  },
  onNotification: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on(CHANNELS.NOTIFICATION, listener);
    return () => ipcRenderer.removeListener(CHANNELS.NOTIFICATION, listener);
  },
  onTaskAssigned: (callback: (task: any) => void) => {
    const listener = (_: any, task: any) => callback(task);
    ipcRenderer.on(CHANNELS.TASK_ASSIGNED, listener);
    return () => ipcRenderer.removeListener(CHANNELS.TASK_ASSIGNED, listener);
  },
  onTasksRefresh: (callback: (data?: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('tasks:refresh', listener);
    return () => ipcRenderer.removeListener('tasks:refresh', listener);
  },
  onDayRollover: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('tracker:day-rollover', listener);
    return () => ipcRenderer.removeListener('tracker:day-rollover', listener);
  },
  onInactivityReturn: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('tracker:inactivity-return', listener);
    return () => ipcRenderer.removeListener('tracker:inactivity-return', listener);
  },
  onAuthLoggedOut: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('auth:logged-out', listener);
    return () => ipcRenderer.removeListener('auth:logged-out', listener);
  },
});

