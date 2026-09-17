import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, desktopCapturer, screen, safeStorage, powerMonitor, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { activityTracker } from '../tracker/activityTracker';
import { windowTracker } from '../tracker/windowTracker';
import { syncEngine } from '../tracker/syncEngine';
import { localDb } from '../db/localDb';
import { apiClient } from '../shared/api';
import { IPC_CHANNELS } from '../shared/types';
import { autoUpdater } from 'electron-updater';

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
let currentBreakReason = '';
let sessionStartedAt: string | null = null;
let idleReminderTimer: ReturnType<typeof setInterval> | null = null;
let remindedForThisIdleEpisode = false;

// ── Auth token storage (DPAPI-encrypted via safeStorage) ──────

function saveAuthToken(token: string): void {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      store.set('authTokenEnc', safeStorage.encryptString(token).toString('base64'));
      store.delete('authToken'); // migrate away from legacy plaintext
      return;
    }
  } catch {}
  store.set('authToken', token); // fallback: plaintext (encryption unavailable)
}

function loadAuthToken(): string | null {
  try {
    const encrypted = store.get('authTokenEnc') as string | undefined;
    if (encrypted && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    }
    const legacy = store.get('authToken') as string | undefined;
    if (legacy) {
      saveAuthToken(legacy); // migrate legacy plaintext to encrypted
      return legacy;
    }
  } catch {}
  return null;
}

function clearAuthToken(): void {
  store.delete('authTokenEnc');
  store.delete('authToken');
}

app.setName('MaxP Workspace');
app.setAppUserModelId('online.maxp.workspace');
app.disableHardwareAcceleration();

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.focus();
      setTimeout(() => mainWindow?.setAlwaysOnTop(false), 800);
    }
  });
}

// ── App Lifecycle ─────────────────────────────────────────────

app.whenReady().then(async () => {
  console.log('[Main] App ready! Initializing...');
  store.init();
  // Initialize local database
  localDb.init();

  // Enable auto-launch at Windows boot per saved preference (default: on)
  try {
    app.setLoginItemSettings({
      openAtLogin: store.get('autoLaunchEnabled', true) === true,
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

  // Initialize background silent auto-updates
  initAutoUpdater();

  // Start periodic task notifications poller (runs every 15s for instant alerts)
  setTimeout(() => {
    pollTaskNotifications();
    setInterval(pollTaskNotifications, 15_000);
  }, 2_500);

  // Check if user is already logged in
  const savedToken = loadAuthToken();
  const savedServer = store.get('serverUrl') as string | undefined;
  if (savedToken && savedServer) {
    apiClient.configure(savedServer, savedToken);
    startTracking();
    setTimeout(() => { triggerAutoClockIn(); }, 3000);
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
    title: 'MaxP Workspace',
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
      sandbox: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  // Allow opening external links (like tasks web view) in default system browser, deny internal popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const allowed = url.startsWith('file://') || url.startsWith('http://localhost:5174');
    if (!allowed) e.preventDefault();
  });

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

  mainWindow.setAlwaysOnTop(true);
  mainWindow.show();
  mainWindow.focus();
  setTimeout(() => mainWindow?.setAlwaysOnTop(false), 1200);

  let hasShownTrayNotice = false;
  mainWindow.on('close', (e) => {
    // Minimize to tray instead of closing
    e.preventDefault();
    mainWindow?.hide();
    if (!hasShownTrayNotice) {
      hasShownTrayNotice = true;
      showNotification(
        'MaxP Workspace',
        'التطبيق مستمر في تسجيل النشاط بالخلفية بجانب الساعة. انقر نقراً مزدوجاً لفتحه بأي وقت.'
      );
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── System Tray ───────────────────────────────────────────────

function createTray(): void {
  try {
    const iconPath = getTrayIconPath();
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16 }));
    tray.setToolTip('MaxP Workspace');
    updateTrayMenu();

    tray.on('double-click', () => {
      createMainWindow();
    });
  } catch (err: any) {
    console.warn('[Main] Tray creation skipped:', err?.message || err);
  }
}

function getTrayIconPath(): string {
  const possiblePaths = [
    path.join(process.resourcesPath, 'assets', 'icon.ico'),
    path.join(process.resourcesPath, 'assets', 'icon.png'),
    path.resolve(__dirname, '../../../assets/icon.ico'),
    path.resolve(__dirname, '../../../assets/icon.png'),
    path.resolve(__dirname, '../../assets/icon.ico'),
    path.resolve(__dirname, '../../assets/icon.png'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return path.resolve(__dirname, '../../../assets/icon.ico');
}

function updateTrayMenu(): void {
  if (!tray) return;

  const isLoggedIn = apiClient.isConfigured;
  const statusLabel = !isLoggedIn ? 'غير متصل' : (isPaused ? 'استراحة رسمية' : 'جلسة العمل موثقة');

  const contextMenu = Menu.buildFromTemplate([
    { label: `MaxP Workspace — ${statusLabel}`, enabled: false },
    { type: 'separator' },
    {
      label: 'فتح مساحة العمل والمهام',
      click: () => createMainWindow(),
    },
    { type: 'separator' as const },
    ...(isLoggedIn ? [
      {
        label: isPaused ? 'استئناف العمل' : 'بدء استراحة رسمية',
        click: async () => {
          if (isPaused) await resumeTracking();
          else pauseTracking();
        },
      },
      {
        label: 'تسجيل الخروج',
        click: () => logout(),
      },
    ] : []),
    {
      label: 'التحقق من التحديثات',
      click: async () => {
        try {
          if (process.env.NODE_ENV === 'development') {
            showNotification('MaxP Workspace', 'أنت في وضع التطوير المحلي (Dev Mode). التحديثات مفعلة في النسخة المثبتة.');
            return;
          }
          showNotification('MaxP Workspace', 'جاري فحص وجود تحديثات جديدة…');
          const result = await autoUpdater.checkForUpdates();
          if (!result || !result.updateInfo || result.updateInfo.version === app.getVersion()) {
            showNotification('MaxP Workspace', `أنت تستخدم أحدث إصدار v${app.getVersion()}`);
          }
        } catch (err: any) {
          showNotification('MaxP Workspace', 'تعذر فحص التحديثات حالياً.');
        }
      },
    },
    { type: 'separator' as const },
    {
      label: 'إغلاق التطبيق',
      click: () => {
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}


// ── Tracking Control ──────────────────────────────────────────

async function startTracking(): Promise<void> {
  if (isTracking) return;
  isTracking = true;
  isPaused = false;
  sessionStartedAt = new Date().toISOString();
  remindedForThisIdleEpisode = false;

  console.log('[Main] Starting tracking...');

  // Load categories from server
  try {
    const categories = await apiClient.getCategories();
    windowTracker.setCategories(categories);
  } catch {}

  await activityTracker.start();
  await windowTracker.start();
  syncEngine.start();
  startIdleReminder();

  updateTrayMenu();
  sendStateToRenderer();

  showNotification('MaxP Workspace', 'تم بدء جلسة العمل وتوثيق الإنتاجية بنجاح');
}

function stopTracking(): void {
  if (!isTracking) return;
  isTracking = false;
  isPaused = false;
  sessionStartedAt = null;

  activityTracker.stop();
  windowTracker.stop();
  syncEngine.stop();
  stopIdleReminder();

  updateTrayMenu();
  sendStateToRenderer();
}

function pauseTracking(reason: string = 'استراحة رسمية'): void {
  isPaused = true;
  currentBreakReason = reason || 'استراحة رسمية';
  activityTracker.stop();
  windowTracker.stop();
  stopIdleReminder();
  updateTrayMenu();
  sendStateToRenderer();
  showNotification('MaxP Workspace', `تم تفعيل استراحة: ${currentBreakReason} (توقف العداد)`, true);
}

async function resumeTracking(): Promise<void> {
  isPaused = false;
  currentBreakReason = '';
  remindedForThisIdleEpisode = false;
  await activityTracker.start();
  await windowTracker.start();
  startIdleReminder();
  updateTrayMenu();
  sendStateToRenderer();
  showNotification('MaxP Workspace', 'تم استئناف جلسة العمل ومتابعة الإنتاجية', true);
}

function logout(): void {
  stopTracking();
  clearAuthToken();
  store.delete('serverUrl');
  store.delete('user');
  apiClient.configure('', '');
  resetTaskPollerState();
  updateTrayMenu();
  createMainWindow();
}

// ── IPC Handlers ──────────────────────────────────────────────

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_TRACKER_STATE, () => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localDb.getDailyStats(today);
    const live = isTracking && !isPaused ? activityTracker.getCurrentIntervalStats() : null;
    return {
      isTracking,
      isPaused,
      breakReason: currentBreakReason,
      currentApp: windowTracker.currentAppName,
      currentUrl: windowTracker.currentUrl,
      activityScore: live?.activityScore ?? (activityTracker as any).lastActivityScore ?? 0,
      todayActiveSeconds: (stored?.total_active_seconds ?? 0) + (live?.activeSeconds || 0),
      todayIdleSeconds: (stored?.total_idle_seconds ?? 0) + (live?.idleSeconds || 0),
      sessionStartedAt: isTracking ? sessionStartedAt : null,
    };
  });

  ipcMain.handle(IPC_CHANNELS.TOGGLE_TRACKING, async () => {
    if (isTracking) stopTracking();
    else await startTracking();
    return isTracking;
  });

  ipcMain.handle(IPC_CHANNELS.PAUSE_TRACKING, (_, reason?: string) => {
    pauseTracking(reason);
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
      appVersion: app.getVersion(),
      serverUrl: store.get('serverUrl', 'https://maxp.online'),
      pendingActivities: counts.activities,
      pendingApps: counts.apps,
      pendingWebsites: counts.websites,
      autoStartEnabled: store.get('autoLaunchEnabled', true) === true,
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
    const live = isTracking && !isPaused ? activityTracker.getCurrentIntervalStats() : null;

    let serverDaily: any = null;
    try {
      serverDaily = await apiClient.getDailySummary(today);
    } catch {}

    let todayAtt: any = null;
    try {
      todayAtt = await apiClient.checkTodayAttendance();
    } catch {}

    const clockInTime = todayAtt?.checkInTime || todayAtt?.checkIn || todayAtt?.createdAt || serverDaily?.clockInTime || null;
    const firstActivityTime = serverDaily?.firstActivityTime || localDaily?.first_activity || null;
    const clockOutTime = todayAtt?.checkOutTime || todayAtt?.checkOut || serverDaily?.clockOutTime || null;
    const lastActivityTime = serverDaily?.lastActivityTime || localDaily?.last_activity || null;

    let lateStartSeconds = 0;
    if (clockInTime && firstActivityTime) {
      const clockInMs = new Date(clockInTime).getTime();
      const firstActMs = new Date(firstActivityTime).getTime();
      if (firstActMs > clockInMs) {
        lateStartSeconds = Math.round((firstActMs - clockInMs) / 1000);
      }
    }

    const totalActive = (serverDaily?.totalActiveSeconds ?? localDaily?.total_active_seconds ?? 0) + (live?.activeSeconds || 0);
    const totalIdle = (serverDaily?.totalIdleSeconds ?? localDaily?.total_idle_seconds ?? 0) + (live?.idleSeconds || 0);

    return {
      date: today,
      clockInTime,
      firstActivityTime,
      clockOutTime,
      lastActivityTime,
      lateStartSeconds,
      totalActiveSeconds: totalActive,
      totalIdleSeconds: totalIdle,
    };
  });

  ipcMain.handle(IPC_CHANNELS.GET_DAILY_SUMMARY, () => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localDb.getDailyStats(today) || {
      date: today,
      first_activity: null,
      last_activity: null,
      total_active_seconds: 0,
      total_idle_seconds: 0,
      total_mouse_events: 0,
      total_keyboard_events: 0,
    };
    const live = isTracking && !isPaused ? activityTracker.getCurrentIntervalStats() : null;
    return {
      ...stored,
      total_active_seconds: stored.total_active_seconds + (live?.activeSeconds || 0),
      total_idle_seconds: stored.total_idle_seconds + (live?.idleSeconds || 0),
      total_mouse_events: stored.total_mouse_events + (live?.mouseEvents || 0),
      total_keyboard_events: stored.total_keyboard_events + (live?.keyboardEvents || 0),
    };
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return {
      autoLaunchEnabled: store.get('autoLaunchEnabled', true) === true,
      soundAlerts: store.get('soundAlerts', true) === true,
      idleReminder: store.get('idleReminder', true) === true,
      serverUrl: store.get('serverUrl', ''),
    };
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, (_, settings) => {
    const ALLOWED_PREFS = ['autoLaunchEnabled', 'soundAlerts', 'idleReminder'];
    for (const [key, value] of Object.entries(settings || {})) {
      if (!ALLOWED_PREFS.includes(key)) continue;
      store.set(key, value === true);
      if (key === 'autoLaunchEnabled') {
        try {
          app.setLoginItemSettings({ openAtLogin: value === true, openAsHidden: false });
        } catch {}
      }
    }
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.LOGIN, async (_, { email, password, serverUrl }) => {
    console.log('[Main IPC] Login attempt for email:', email, 'server:', serverUrl);
    try {
      const { token, user } = await apiClient.login(email, password, serverUrl);
      console.log('[Main IPC] Login successful! User:', user?.id, user?.email);
      saveAuthToken(token);
      store.set('serverUrl', serverUrl);
      store.set('user', user);
      apiClient.configure(serverUrl, token);
      resetTaskPollerState();
      await startTracking();
      updateTrayMenu();
      setTimeout(() => { triggerAutoClockIn(); }, 2000);
      setTimeout(() => { pollTaskNotifications().catch(() => {}); }, 1500);
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

  // ── Tasks Engine Handlers ──
  ipcMain.handle('tasks:get', async (_, type?: 'my-tasks' | 'assigned-by-me') => {
    try {
      const tasks = await apiClient.getTasks(type || 'my-tasks');
      return { success: true, tasks };
    } catch (err: any) {
      return { success: false, error: err.message, tasks: [] };
    }
  });

  ipcMain.handle('tasks:get-users', async () => {
    try {
      const users = await apiClient.getCompanyUsers();
      return { success: true, users };
    } catch (err: any) {
      return { success: false, error: err.message, users: [] };
    }
  });

  ipcMain.handle('tasks:create', async (_, taskData) => {
    try {
      const task = await apiClient.createTask(taskData);
      mainWindow?.webContents.send('tasks:refresh', { action: 'create', taskId: task?.id });
      setTimeout(() => {
        pollTaskNotifications().catch(() => {});
      }, 500);
      return { success: true, task };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:update-status', async (_, { taskId, status }) => {
    try {
      const task = await apiClient.updateTaskStatus(taskId, status);
      mainWindow?.webContents.send('tasks:refresh', { action: 'update-status', taskId, status });
      setTimeout(() => {
        pollTaskNotifications().catch(() => {});
      }, 500);
      return { success: true, task };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:update', async (_, { taskId, data }) => {
    try {
      const task = await apiClient.updateTask(data, taskId);
      mainWindow?.webContents.send('tasks:refresh', { action: 'update', taskId });
      setTimeout(() => {
        pollTaskNotifications().catch(() => {});
      }, 500);
      return { success: true, task };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:start-timer', async (_, { taskId }) => {
    try {
      const entry = await apiClient.startTaskTimer(taskId);
      return { success: true, entry };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:stop-timer', async (_, { entryId }) => {
    try {
      const result = await apiClient.stopTaskTimer(entryId);
      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:get-running-timer', async () => {
    try {
      const runningTimer = await apiClient.getRunningTaskTimer();
      return { success: true, runningTimer };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:get-token', async () => {
    return { token: apiClient.token };
  });

  ipcMain.handle(
    'tasks:upload-attachment',
    async (_, { taskId, base64Data, originalName, mimeType }) => {
      try {
        const attachment = await apiClient.uploadTaskAttachment(
          taskId,
          base64Data,
          originalName,
          mimeType
        );
        return { success: true, attachment };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  ipcMain.handle('tasks:capture-screen', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1440, height: 900 },
      });
      if (sources.length > 0) {
        let selectedSource = sources[0];

        // Multi-monitor active display matching
        try {
          const cursorPoint = screen.getCursorScreenPoint();
          const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
          if (sources.length > 1) {
            const matched = sources.find(
              (s) => String(s.display_id) === String(currentDisplay.id)
            );
            if (matched) {
              selectedSource = matched;
            }
          }
        } catch {}

        const dataUrl = selectedSource.thumbnail.toDataURL();
        return { success: true, dataUrl };
      }
      return { success: false, error: 'لم يتم العثور على شاشة متاحة للالتقاط' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('shell:open-external', async (_, url: string) => {
    try {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: 'Invalid URL scheme' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('update:check', async () => {
    try {
      const currentVersion = app.getVersion();
      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          status: 'dev',
          currentVersion,
          message: 'أنت تعمل في بيئة التطوير المحلية (Dev Mode). التحديثات مفعلة في النسخة المثبتة.',
        };
      }

      autoUpdater.setFeedURL({ provider: 'generic', url: 'https://maxp.online/download/' });
      const result = await autoUpdater.checkForUpdates();
      if (result && result.updateInfo && result.updateInfo.version !== currentVersion) {
        return {
          success: true,
          status: 'update-available',
          currentVersion,
          latestVersion: result.updateInfo.version,
          message: `يتوفر إصدار جديد v${result.updateInfo.version}. جاري التنزيل تلقائياً في الخلفية.`,
        };
      }

      return {
        success: true,
        status: 'up-to-date',
        currentVersion,
        message: `أنت تستخدم أحدث إصدار v${currentVersion}.`,
      };
    } catch (err: any) {
      console.warn('[Updater] Manual check error:', err?.message || err);
      return {
        success: false,
        status: 'error',
        currentVersion: app.getVersion(),
        message: err?.message || 'تعذر التحقق من التحديثات حالياً. تأكد من اتصال الإنترنت.',
      };
    }
  });

  ipcMain.handle('update:quit-and-install', () => {
    try {
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (err: any) {
      console.warn('[Updater] quitAndInstall failed:', err.message);
      return { success: false, error: err.message };
    }
  });
}

// ── Utilities ─────────────────────────────────────────────────

function sendStateToRenderer(): void {
  if (!mainWindow) return;
  mainWindow.webContents.send(IPC_CHANNELS.TRACKER_STATE_UPDATE, {
    isTracking,
    isPaused,
    breakReason: currentBreakReason,
  });
}

function showNotification(title: string, body: string, respectSoundPref: boolean = true): void {
  if (Notification.isSupported()) {
    const silent = respectSoundPref ? !store.get('soundAlerts', true) : false;
    new Notification({ title, body, silent }).show();
  }
}

// ── Extended Idle Reminder (real behavior behind the toggle) ──

const IDLE_REMINDER_THRESHOLD_SEC = 600; // 10 minutes of continuous idle
const IDLE_REMINDER_CHECK_SEC = 60;

function startIdleReminder(): void {
  stopIdleReminder();
  idleReminderTimer = setInterval(() => {
    try {
      if (!isTracking || isPaused) return;
      if (!store.get('idleReminder', true)) return;

      const idleSec = powerMonitor.getSystemIdleTime();
      if (idleSec >= IDLE_REMINDER_THRESHOLD_SEC) {
        if (remindedForThisIdleEpisode) return;
        remindedForThisIdleEpisode = true;
        showNotification(
          'MaxP Workspace',
          'لاحظنا خمولاً ممتدًا. لو رجعت للعمل تفقد الجلسة تلقائياً، ولو خارجه فعّل «استراحة رسمية».',
          true
        );
      } else if (idleSec < 30) {
        remindedForThisIdleEpisode = false; // activity resumed — re-arm
      }
    } catch {}
  }, IDLE_REMINDER_CHECK_SEC * 1000);
}

function stopIdleReminder(): void {
  if (idleReminderTimer) {
    clearInterval(idleReminderTimer);
    idleReminderTimer = null;
  }
}

async function triggerAutoClockIn(): Promise<void> {
  try {
    const currentHour = new Date().getHours();
    // Only auto clock in between 6 AM and 6 PM
    if (currentHour < 6 || currentHour > 18) {
      return;
    }

    const todayAtt = await apiClient.checkTodayAttendance();
    const hasCheckedIn = todayAtt && (todayAtt.checkIn || todayAtt.checkInTime);
    if (!hasCheckedIn) {
      console.log('[Main] Auto clock-in triggered for employee...');
      const res = await apiClient.autoClockIn();
      if (res?.success) {
        showNotification('MaxP Workspace', 'تم توثيق حضورك الصباحي تلقائياً بنجاح.');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('attendance:updated', res.attendance);
        }
      }
    }
  } catch (err: any) {
    console.warn('[Main] Auto clock-in check skipped:', err?.message || err);
  }
}

// ── Real-Time Task Notification Engine ───────────────────────

const knownAssignedTaskIds = new Set<string>();
const knownMyTasksStatuses = new Map<string, string>();
const warnedDueSoonTaskIds = new Set<string>();
const warnedOverdueTaskIds = new Set<string>();
let taskPollerInitialized = false;

function resetTaskPollerState(): void {
  knownAssignedTaskIds.clear();
  knownMyTasksStatuses.clear();
  warnedDueSoonTaskIds.clear();
  warnedOverdueTaskIds.clear();
  taskPollerInitialized = false;
}

async function pollTaskNotifications(): Promise<void> {
  if (!apiClient.isConfigured) return;

  try {
    let hasChanges = false;

    // 1. Check tasks assigned to me
    const myTasks = await apiClient.getTasks('my-tasks');
    if (Array.isArray(myTasks)) {
      const now = Date.now();

      for (const t of myTasks) {
        if (!t?.id) continue;
        const isCompleted = String(t.status || '').toUpperCase() === 'COMPLETED';
        const isUrgent = String(t.priority || '').toUpperCase() === 'URGENT';

        // Check if newly assigned to me
        if (!knownAssignedTaskIds.has(t.id)) {
          if (taskPollerInitialized && !isCompleted) {
            const assigner =
              t.createdByName ||
              (t.creator?.firstName
                ? `${t.creator.firstName} ${t.creator.lastName || ''}`.trim()
                : 'أحد الزملاء');
            if (isUrgent) {
              showNotification(
                '🚨 مهمة طارئة وعاجلة موكلة إليك!',
                `كلفك ${assigner} بمهمة طارئة وفورية: "${t.title}"`,
                true
              );
            } else {
              showNotification(
                '📌 مهمة جديدة موكلة إليك',
                `كلفك ${assigner} بمهمة: "${t.title}"`,
                true
              );
            }
            hasChanges = true;
          }
          knownAssignedTaskIds.add(t.id);
        }

        // Check if previously completed task was reopened
        const prevStatusForMe = knownMyTasksStatuses.get(`my_${t.id}`);
        if (taskPollerInitialized && prevStatusForMe === 'COMPLETED' && !isCompleted) {
          showNotification(
            '↺ تمت إعادة فتح المهمة',
            `أعيد فتح المهمة: "${t.title}" لمتابعة العمل عليها.`,
            true
          );
          hasChanges = true;
        }
        knownMyTasksStatuses.set(`my_${t.id}`, String(t.status || '').toUpperCase());

        // Check Due Soon & Overdue
        if (!isCompleted && t.dueDate) {
          const dueTime = new Date(t.dueDate).getTime();
          const diffMs = dueTime - now;

          // Due within 1 hour (0 < diffMs <= 3600000)
          if (diffMs > 0 && diffMs <= 60 * 60 * 1000 && !warnedDueSoonTaskIds.has(t.id)) {
            warnedDueSoonTaskIds.add(t.id);
            const minsLeft = Math.max(1, Math.round(diffMs / 60000));
            showNotification(
              '⏳ تذكير بموعد تسليم مهمة',
              `متبقي ${minsLeft} دقيقة على موعد تسليم: "${t.title}"`,
              true
            );
          }
          // Overdue (diffMs < 0)
          else if (diffMs < 0 && !warnedOverdueTaskIds.has(t.id)) {
            warnedOverdueTaskIds.add(t.id);
            showNotification(
              '⚠️ مهمة متأخرة عن التسليم',
              `تجاوزت المهمة "${t.title}" موعد التسليم المحدد!`,
              true
            );
          }
        }
      }
    }

    // 2. Check tasks assigned BY me to peers (Manager Smart Notification Radar)
    const delegatedTasks = await apiClient.getTasks('assigned-by-me');
    if (Array.isArray(delegatedTasks)) {
      const now = Date.now();
      for (const t of delegatedTasks) {
        if (!t?.id) continue;
        const currentStatus = String(t.status || '').toUpperCase();
        const prevStatus = knownMyTasksStatuses.get(t.id);
        const assigneeName =
          t.assignedToName ||
          (t.assignee?.firstName
            ? `${t.assignee.firstName} ${t.assignee.lastName || ''}`.trim()
            : 'الزميل المكلف');

        // Alert Manager when employee starts working
        if (
          taskPollerInitialized &&
          prevStatus &&
          prevStatus !== 'IN_PROGRESS' &&
          currentStatus === 'IN_PROGRESS'
        ) {
          showNotification(
            '🟢 بدء العمل على مهمة',
            `بدأ ${assigneeName} العمل على المهمة: "${t.title}" الآن.`
          );
          hasChanges = true;
        }

        // Alert Manager when employee completes task
        if (
          taskPollerInitialized &&
          prevStatus &&
          prevStatus !== 'COMPLETED' &&
          currentStatus === 'COMPLETED'
        ) {
          showNotification(
            '🎉 تم إنجاز مهمة كلفت بها',
            `أنجز ${assigneeName} المهمة: "${t.title}" بنجاح.`
          );
          hasChanges = true;
        }

        // Alert Manager if delegated task is overdue
        if (currentStatus !== 'COMPLETED' && t.dueDate) {
          const dueTime = new Date(t.dueDate).getTime();
          const diffMs = dueTime - now;
          if (diffMs < 0 && !warnedOverdueTaskIds.has(`mgr_${t.id}`)) {
            warnedOverdueTaskIds.add(`mgr_${t.id}`);
            showNotification(
              '⚠️ مهمة متأخرة في فريقك',
              `تجاوزت المهمة "${t.title}" الموكلة لـ ${assigneeName} موعد التسليم المحدد!`,
              true
            );
          }
        }

        knownMyTasksStatuses.set(t.id, currentStatus);
      }
    }

    // Broadcast refresh to renderer if new tasks or status updates arrived
    if (taskPollerInitialized && hasChanges) {
      mainWindow?.webContents.send('tasks:refresh', { source: 'poll-changes' });
    }

    taskPollerInitialized = true;
  } catch (err) {
    // Silent background poll
  }
}

// ── Background Auto-Updater ──────────────────────────────────

function initAutoUpdater(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Updater] Skipping auto-updater in development mode');
    return;
  }

  try {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Direct generic download from maxp.online server without GitHub authentication restrictions
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'https://maxp.online/download/',
    });

    autoUpdater.on('checking-for-update', () => {
      console.log('[Updater] Checking for updates from https://maxp.online/download/...');
      mainWindow?.webContents.send('update:status', { stage: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      console.log('[Updater] Update available:', info.version);
      mainWindow?.webContents.send('update:status', {
        stage: 'available',
        version: info.version,
      });
      showNotification('MaxP Workspace', `يتوفر تحديث جديد v${info.version}، جاري التنزيل تلقائياً في الخلفية...`);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      mainWindow?.webContents.send('update:status', {
        stage: 'downloading',
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
        total: progressObj.total,
        transferred: progressObj.transferred,
      });
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[Updater] App is up to date.');
      mainWindow?.webContents.send('update:status', {
        stage: 'up-to-date',
        version: app.getVersion(),
      });
    });

    autoUpdater.on('error', (err) => {
      console.warn('[Updater] Auto-updater error:', err?.message || err);
      mainWindow?.webContents.send('update:status', {
        stage: 'error',
        message: err?.message || 'تعذر التحقق من التحديثات',
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[Updater] Update downloaded successfully:', info.version);
      mainWindow?.webContents.send('update:status', {
        stage: 'downloaded',
        version: info.version,
      });
      showNotification(
        'MaxP Workspace',
        `تم تنزيل التحديث v${info.version} بنجاح. أعد تشغيل التطبيق لتثبيته.`
      );
    });

    // Check on startup immediately after 2.5 seconds, and then every 2 hours
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((e) => {
        console.warn('[Updater] Initial check failed:', e?.message);
      });
    }, 2500);

    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }, 2 * 60 * 60 * 1000);
  } catch (err: any) {
    console.warn('[Updater] Could not initialize autoUpdater:', err?.message);
  }
}

