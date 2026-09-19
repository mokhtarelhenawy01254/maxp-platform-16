import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

/**
 * Preload script for MaxP Agent Studio.
 * Exposes a clean, secure API bridge between the React Cockpit and Electron Main.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  login: (data: { email: string; password: string; serverUrl: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.LOGIN, data),
  logout: () =>
    ipcRenderer.invoke(IPC_CHANNELS.LOGOUT),
  getAuthState: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_AUTH_STATE),
  getAuthToken: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TOKEN),

  // Agents & Cockpit
  getAgents: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_AGENTS),
  getProducts: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PRODUCTS),
  sendAgentMessage: (data: { agentSlug: string; agentId?: string; message: string; product?: any; productId?: string; screenContext?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND_AGENT_MESSAGE, data),
  triggerAction: (actionData: { action: string; payload: any }) =>
    ipcRenderer.invoke(IPC_CHANNELS.TRIGGER_ACTION, actionData),

  // OS & System Capabilities
  captureScreen: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_SCREEN),
  getActiveWindow: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ACTIVE_WINDOW),
  openExternal: (url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),

  // Window Controls
  windowMinimize: () =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  windowToggleMaximize: () =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE),
  windowClose: () =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  windowIsMaximized: () =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),

  // Auto Updater
  checkForUpdates: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_FOR_UPDATES),
  quitAndInstallUpdate: () =>
    ipcRenderer.invoke(IPC_CHANNELS.QUIT_AND_INSTALL),
  onUpdateStatus: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
});
