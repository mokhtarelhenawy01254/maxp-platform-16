import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain } from 'electron';
import path from 'path';
import { activityTracker } from '../tracker/activityTracker';
import { windowTracker } from '../tracker/windowTracker';
import { syncEngine } from '../tracker/syncEngine';
import { localDb } from '../db/localDb';
import { apiClient } from '../shared/api';
import { IPC_CHANNELS } from '../shared/types';
import Store from 'electron-store';

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isTracking = false;
let isPaused = false;

// ── App Lifecycle ─────────────────────────────────────────────

app.whenReady().then(async () => {
  // Initialize local database
  localDb.init();

  // Create system tray
  createTray();

  // Register IPC handlers
  registerIpcHandlers();

  // Check if user is already logged in
  const savedToken = store.get('authToken') as string | undefined;
  const savedServer = store.get('serverUrl') as string | undefined;
  if (savedToken && savedServer) {
    apiClient.configure(savedServer, savedToken);
    startTracking();
  } else {
    // Show login window
    createMainWindow();
  }
});

app.on('window-all-closed', (e: Event) => {
  // Don't quit on window close — keep running in tray
  e.preventDefault();
});

app.on('before-quit', () => {
  stopTracking();
  localDb.close();
});

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    createMainWindow();
  }
});

// ── Window Management ─────────────────────────────────────────

function createMainWindow(): void {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 420,
    height: 640,
    minWidth: 380,
    minHeight: 500,
    frame: true,
    resizable: true,
    skipTaskbar: false,
    icon: getTrayIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.on('close', (e) => {
    // Minimize to tray instead of closing
    e.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── System Tray ───────────────────────────────────────────────

function createTray(): void {
  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('MaxP Monitor');
  updateTrayMenu();

  tray.on('double-click', () => {
    createMainWindow();
  });
}

function updateTrayMenu(): void {
  if (!tray) return;

  const isLoggedIn = apiClient.isConfigured;
  const statusLabel = !isLoggedIn ? 'Not logged in'
    : isTracking && !isPaused ? 'Tracking'
    : isPaused ? 'Paused'
    : 'Stopped';

  const contextMenu = Menu.buildFromTemplate([
    { label: `MaxP Monitor — ${statusLabel}`, enabled: false },
    { type: 'separator' },
    ...(isLoggedIn ? [
      {
        label: isTracking && !isPaused ? 'Pause Tracking' : 'Resume Tracking',
        click: () => {
          if (isPaused) resumeTracking();
          else pauseTracking();
        },
      },
    ] : []),
    {
      label: 'Open Dashboard',
      click: () => createMainWindow(),
    },
    { type: 'separator' as const },
    ...(isLoggedIn ? [
      {
        label: 'Logout',
        click: () => logout(),
      },
    ] : []),
    {
      label: 'Quit',
      click: () => {
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function getTrayIconPath(): string {
  return path.join(__dirname, '..', '..', 'assets', 'icon.png');
}

// ── Tracking Control ──────────────────────────────────────────

async function startTracking(): Promise<void> {
  if (isTracking) return;
  isTracking = true;
  isPaused = false;

  console.log('[Main] Starting tracking...');

  // Load categories from server
  try {
    const categories = await apiClient.getCategories();
    windowTracker.setCategories(categories);
  } catch {}

  await activityTracker.start();
  await windowTracker.start();
  syncEngine.start();

  updateTrayMenu();
  sendStateToRenderer();

  showNotification('MaxP Monitor', 'Tracking started');
}

function stopTracking(): void {
  if (!isTracking) return;
  isTracking = false;
  isPaused = false;

  activityTracker.stop();
  windowTracker.stop();
  syncEngine.stop();

  updateTrayMenu();
  sendStateToRenderer();
}

function pauseTracking(): void {
  isPaused = true;
  activityTracker.stop();
  windowTracker.stop();
  updateTrayMenu();
  sendStateToRenderer();
  showNotification('MaxP Monitor', 'Tracking paused');
}

async function resumeTracking(): Promise<void> {
  isPaused = false;
  await activityTracker.start();
  await windowTracker.start();
  updateTrayMenu();
  sendStateToRenderer();
  showNotification('MaxP Monitor', 'Tracking resumed');
}

function logout(): void {
  stopTracking();
  store.delete('authToken');
  store.delete('serverUrl');
  store.delete('user');
  apiClient.configure('', '');
  updateTrayMenu();
  createMainWindow();
}

// ── IPC Handlers ──────────────────────────────────────────────

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_TRACKER_STATE, () => {
    return {
      isTracking,
      isPaused,
      currentApp: windowTracker.currentAppName,
      currentUrl: windowTracker.currentUrl,
      activityScore: 0,
      todayActiveSeconds: localDb.getDailyStats(new Date().toISOString().split('T')[0])?.total_active_seconds ?? 0,
      todayIdleSeconds: localDb.getDailyStats(new Date().toISOString().split('T')[0])?.total_idle_seconds ?? 0,
      sessionStartedAt: isTracking ? new Date().toISOString() : null,
    };
  });

  ipcMain.handle(IPC_CHANNELS.TOGGLE_TRACKING, async () => {
    if (isTracking) stopTracking();
    else await startTracking();
    return isTracking;
  });

  ipcMain.handle(IPC_CHANNELS.PAUSE_TRACKING, () => {
    pauseTracking();
  });

  ipcMain.handle(IPC_CHANNELS.RESUME_TRACKING, async () => {
    await resumeTracking();
  });

  ipcMain.handle(IPC_CHANNELS.GET_DAILY_SUMMARY, () => {
    const today = new Date().toISOString().split('T')[0];
    return localDb.getDailyStats(today);
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return {
      serverUrl: store.get('serverUrl', ''),
      idleTimeoutMinutes: store.get('idleTimeoutMinutes', 5),
      trackingStartHour: store.get('trackingStartHour', 8),
      trackingEndHour: store.get('trackingEndHour', 18),
    };
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, (_, settings) => {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key, value);
    }
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.LOGIN, async (_, { email, password, serverUrl }) => {
    try {
      const { token, user } = await apiClient.login(email, password, serverUrl);
      store.set('authToken', token);
      store.set('serverUrl', serverUrl);
      store.set('user', user);
      apiClient.configure(serverUrl, token);
      await startTracking();
      updateTrayMenu();
      return { success: true, user };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LOGOUT, () => {
    logout();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.GET_AUTH_STATE, () => {
    return {
      isLoggedIn: apiClient.isConfigured,
      user: store.get('user', null),
      serverUrl: store.get('serverUrl', ''),
    };
  });
}

// ── Utilities ─────────────────────────────────────────────────

function sendStateToRenderer(): void {
  if (!mainWindow) return;
  mainWindow.webContents.send(IPC_CHANNELS.TRACKER_STATE_UPDATE, {
    isTracking,
    isPaused,
  });
}

function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: true }).show();
  }
}
