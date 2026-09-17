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
} as const;

/**
 * Preload script — exposes safe IPC methods to the renderer process.
 * This is the bridge between the React UI and the Electron main process.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Tracker
  getTrackerState: () => ipcRenderer.invoke(CHANNELS.GET_TRACKER_STATE),
  toggleTracking: () => ipcRenderer.invoke(CHANNELS.TOGGLE_TRACKING),
  pauseTracking: () => ipcRenderer.invoke(CHANNELS.PAUSE_TRACKING),
  resumeTracking: () => ipcRenderer.invoke(CHANNELS.RESUME_TRACKING),
  getDailySummary: () => ipcRenderer.invoke(CHANNELS.GET_DAILY_SUMMARY),
  getAppsSummary: () => ipcRenderer.invoke(CHANNELS.GET_APPS_SUMMARY),
  getWebsitesSummary: () => ipcRenderer.invoke(CHANNELS.GET_WEBSITES_SUMMARY),
  getSystemInfo: () => ipcRenderer.invoke(CHANNELS.GET_SYSTEM_INFO),
  syncNow: () => ipcRenderer.invoke(CHANNELS.SYNC_NOW),
  getAttendanceAudit: () => ipcRenderer.invoke(CHANNELS.GET_ATTENDANCE_AUDIT),

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
  getTasks: (type?: 'my-tasks' | 'assigned-by-me') =>
    ipcRenderer.invoke('tasks:get', type),
  getCompanyUsers: () =>
    ipcRenderer.invoke('tasks:get-users'),
  createTask: (taskData: any) =>
    ipcRenderer.invoke('tasks:create', taskData),
  updateTaskStatus: (taskId: string, status: string) =>
    ipcRenderer.invoke('tasks:update-status', { taskId, status }),
  uploadTaskAttachment: (data: {
    taskId: string;
    base64Data: string;
    originalName: string;
    mimeType?: string;
  }) => ipcRenderer.invoke('tasks:upload-attachment', data),
  captureDesktopSnippet: () =>
    ipcRenderer.invoke('tasks:capture-screen'),

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
});

