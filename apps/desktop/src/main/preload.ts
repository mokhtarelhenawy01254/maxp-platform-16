import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

/**
 * Preload script — exposes safe IPC methods to the renderer process.
 * This is the bridge between the React UI and the Electron main process.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Tracker
  getTrackerState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_TRACKER_STATE),
  toggleTracking: () => ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_TRACKING),
  pauseTracking: () => ipcRenderer.invoke(IPC_CHANNELS.PAUSE_TRACKING),
  resumeTracking: () => ipcRenderer.invoke(IPC_CHANNELS.RESUME_TRACKING),
  getDailySummary: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DAILY_SUMMARY),

  // Auth
  login: (data: { email: string; password: string; serverUrl: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.LOGIN, data),
  logout: () => ipcRenderer.invoke(IPC_CHANNELS.LOGOUT),
  getAuthState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_AUTH_STATE),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  updateSettings: (settings: Record<string, any>) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings),

  // Events from main process
  onTrackerStateUpdate: (callback: (state: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.TRACKER_STATE_UPDATE, (_, state) => callback(state));
  },
  onNotification: (callback: (data: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.NOTIFICATION, (_, data) => callback(data));
  },
  onTaskAssigned: (callback: (task: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.TASK_ASSIGNED, (_, task) => callback(task));
  },
});
