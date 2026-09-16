import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { activityTracker } from '../tracker/activityTracker';
import { windowTracker } from '../tracker/windowTracker';
import { syncEngine } from '../tracker/syncEngine';
import { localDb } from '../db/localDb';
import { apiClient } from '../shared/api';
import { IPC_CHANNELS } from '../shared/types';

class SimpleStore {
  private file = '';
  private data: Record<string, any> = {};

  init() {
    try {
      this.file = path.join(app.getPath('userData'), 'config.json');
      if (fs.existsSync(this.file)) {
        this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      }
    } catch {}
  }

  get(key: string, defaultValue: any = null): any {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  set(key: string, value: any): void {
    this.data[key] = value;
    try {
      if (!this.file) this.file = path.join(app.getPath('userData'), 'config.json');
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    } catch {}
  }

  delete(key: string): void {
    delete this.data[key];
    try {
      if (!this.file) this.file = path.join(app.getPath('userData'), 'config.json');
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    } catch {}
  }
}

const store = new SimpleStore();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isTracking = false;
let isPaused = false;

app.setName('MaxP Employee Monitor');
app.setAppUserModelId('online.maxp.monitor');
app.disableHardwareAcceleration();

// ── App Lifecycle ─────────────────────────────────────────────

app.whenReady().then(async () => {
  console.log('[Main] App ready! Initializing...');
  store.init();
  // Initialize local database
  localDb.init();

  // Enable auto-launch at Windows boot (enforced continuous monitoring)
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false,
    });
  } catch (err: any) {
    console.warn('[Main] Could not set login item settings:', err.message);
  }

  // Create system tray
  createTray();

  // Register IPC handlers
  registerIpcHandlers();

  // Always show window on startup
  createMainWindow();

  // Check if user is already logged in
  const savedToken = store.get('authToken') as string | undefined;
  const savedServer = store.get('serverUrl') as string | undefined;
  if (savedToken && savedServer) {
    apiClient.configure(savedServer, savedToken);
    startTracking();
  }
});

app.on('window-all-closed', () => {
  // Don't quit on window close — keep running in tray
});

app.on('before-quit', () => {
  stopTracking();
  localDb.close();
});

// ── Window Management ─────────────────────────────────────────

function createMainWindow(): void {
  console.log('[Main] Creating main window...');
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    title: 'MaxP Employee Monitor',
    width: 960,
    height: 680,
    minWidth: 840,
    minHeight: 560,
    show: true,
    center: true,
    frame: true,
    autoHideMenuBar: true,
    resizable: true,
    skipTaskbar: false,
    icon: getTrayIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  console.log('[Main] Window created successfully, HWND id:', mainWindow.id);

  const distIndex = path.resolve(__dirname, '../../renderer/index.html');

  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
    console.error(`[Main] Failed to load UI: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] UI content loaded successfully');
    mainWindow?.show();
    mainWindow?.focus();
  });

  // In development, load from Vite dev server if running, otherwise load dist
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174').catch(() => {
      mainWindow?.loadFile(distIndex);
    });
  } else {
    mainWindow.loadFile(distIndex);
  }

  mainWindow.show();
  mainWindow.focus();

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
  const statusLabel = !isLoggedIn ? 'Not logged in' : 'Enforced Tracking Active';

  const contextMenu = Menu.buildFromTemplate([
    { label: `MaxP Monitor — ${statusLabel}`, enabled: false },
    { type: 'separator' },
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
  return path.resolve(__dirname, '../../../assets/icon.png');
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

  ipcMain.handle('tracker:get-apps-summary', () => {
    try {
      const { apps, websites } = windowTracker.flushRecords();
      for (const a of apps) localDb.queueAppUsage(a);
      for (const w of websites) localDb.queueWebUsage(w);
    } catch {}
    return localDb.getTodayAppsSummary();
  });

  ipcMain.handle('tracker:get-websites-summary', () => {
    try {
      const { apps, websites } = windowTracker.flushRecords();
      for (const a of apps) localDb.queueAppUsage(a);
      for (const w of websites) localDb.queueWebUsage(w);
    } catch {}
    return localDb.getTodayWebsitesSummary();
  });

  ipcMain.handle('tracker:get-system-info', () => {
    const counts = localDb.getPendingCounts();
    return {
      deviceName: os.hostname(),
      osVersion: `${os.type()} ${os.release()} (${os.arch()})`,
      appVersion: '1.0.0',
      serverUrl: store.get('serverUrl', 'https://maxp.online'),
      pendingActivities: counts.activities,
      pendingApps: counts.apps,
      pendingWebsites: counts.websites,
      autoStartEnabled: true,
      heartbeatIntervalSec: 120,
    };
  });

  ipcMain.handle('tracker:sync-now', async () => {
    try {
      await syncEngine.sync();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tracker:get-attendance-audit', async () => {
    const today = new Date().toISOString().split('T')[0];
    const localDaily = localDb.getDailyStats(today);

    let serverDaily: any = null;
    try {
      serverDaily = await apiClient.getDailySummary(today);
    } catch {}

    const clockInTime = serverDaily?.clockInTime || null;
    const firstActivityTime = serverDaily?.firstActivityTime || localDaily?.first_activity || null;
    const clockOutTime = serverDaily?.clockOutTime || null;
    const lastActivityTime = serverDaily?.lastActivityTime || localDaily?.last_activity || null;

    let lateStartSeconds = 0;
    if (clockInTime && firstActivityTime) {
      const clockInMs = new Date(clockInTime).getTime();
      const firstActMs = new Date(firstActivityTime).getTime();
      if (firstActMs > clockInMs) {
        lateStartSeconds = Math.round((firstActMs - clockInMs) / 1000);
      }
    }

    return {
      date: today,
      clockInTime,
      firstActivityTime,
      clockOutTime,
      lastActivityTime,
      lateStartSeconds,
      totalActiveSeconds: serverDaily?.totalActiveSeconds ?? localDaily?.total_active_seconds ?? 0,
      totalIdleSeconds: serverDaily?.totalIdleSeconds ?? localDaily?.total_idle_seconds ?? 0,
    };
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
    console.log('[Main IPC] Login attempt for email:', email, 'server:', serverUrl);
    try {
      const { token, user } = await apiClient.login(email, password, serverUrl);
      console.log('[Main IPC] Login successful! User:', user?.id, user?.email);
      store.set('authToken', token);
      store.set('serverUrl', serverUrl);
      store.set('user', user);
      apiClient.configure(serverUrl, token);
      await startTracking();
      updateTrayMenu();
      return { success: true, user };
    } catch (err: any) {
      console.error('[Main IPC] Login failed:', err.message);
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
