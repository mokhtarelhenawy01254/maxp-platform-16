import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, desktopCapturer, screen, safeStorage, powerMonitor, shell, dialog, clipboard } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { activityTracker } from '../tracker/activityTracker';
import { windowTracker } from '../tracker/windowTracker';
import { syncEngine } from '../tracker/syncEngine';
import { localDb, getLocalDateString } from '../db/localDb';
import { apiClient } from '../shared/api';
import { IPC_CHANNELS } from '../shared/types';
import { autoUpdater } from 'electron-updater';
import axios from 'axios';


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
let currentBreakStartedAt: number | null = null;
let sessionStartedAt: string | null = null;
let idleReminderTimer: ReturnType<typeof setInterval> | null = null;
let remindedForThisIdleEpisode = false;

// ── Shift & Day Lifecycle State ───────────────────────────────
let shiftEnded = false;
let shiftEndedAt: string | null = null;
let isOvertime = false;
let activeOvertimeSession: { id: string; startedAt: string; reason: string; taskSummary?: string | null } | null = null;
let systemSuspendedAt: number | null = null;
let lastDayRolloverDate = '';
let midnightWatcherInterval: ReturnType<typeof setInterval> | null = null;

// ── Device Isolation & Classification State ──────────────────
let currentDeviceType: 'OFFICE' | 'PERSONAL' = (store.get('deviceType', 'PERSONAL') as 'OFFICE' | 'PERSONAL');

function getHardwareFingerprint(): string {
  let fp = store.get('deviceFingerprint') as string | undefined;
  if (!fp) {
    const raw = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || ''}`;
    fp = 'desk_' + crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
    store.set('deviceFingerprint', fp);
  }
  return fp;
}

async function syncDeviceRegistration(): Promise<void> {
  const fp = getHardwareFingerprint();
  apiClient.setDeviceFingerprint(fp);

  try {
    const res = await apiClient.registerCurrentDevice({
      fingerprint: fp,
      deviceName: os.hostname(),
      osVersion: `${os.type()} ${os.release()} (${os.arch()})`,
      appVersion: app.getVersion(),
    });

    if (res?.deviceType) {
      currentDeviceType = res.deviceType;
      store.set('deviceType', currentDeviceType);
      sendStateToRenderer();
      console.log(`[Main] Device registered successfully as ${currentDeviceType}`);
    }
  } catch (err: any) {
    console.warn('[Main] Device sync deferred:', err.message);
  }
}

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

process.on('uncaughtException', (err: any) => {
  console.error('[Main] Uncaught Exception:', err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Main] Unhandled Rejection:', reason?.message || reason);
});

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
    } else {
      createMainWindow();
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

  // Register OS power and lock-screen hooks
  registerPowerMonitorHooks();

  // Start midnight / day rollover watcher
  startMidnightRolloverWatcher();

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
    const savedUser = store.get('user', null) as any;
    const fp = getHardwareFingerprint();
    apiClient.configure(savedServer, savedToken, savedUser?.companyId, fp);

    // Sync device classification with backend
    syncDeviceRegistration().then(() => {
      if (currentDeviceType === 'OFFICE') {
        setTimeout(() => { triggerAutoClockIn(); }, 3000);
      } else {
        console.log('[Main] Device is PERSONAL — auto clock-in skipped.');
      }
    });

    // Pre-flight session validation: update user profile if still valid, but NEVER auto-logout
    apiClient.validateToken().then(({ valid, user }) => {
      if (valid) {
        if (user) store.set('user', user);
      } else {
        console.warn('[Main] Token expired on server — continuing local tracking (no auto-logout)');
      }
      // Always start tracking regardless of token validity
      startTracking();
    }).catch(() => {
      // Network error — still allow local tracking
      startTracking();
    });

  }
});

app.on('window-all-closed', () => {
  // Don't quit on window close — keep running in tray
});

app.on('before-quit', () => {
  try {
    apiClient.endDeviceSession('APP_EXIT');
  } catch {}
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
    frame: false,
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

  // Register standard application menu with Edit roles so OS-level shortcuts (CmdOrCtrl+C, CmdOrCtrl+V, etc.) work reliably
  const appMenuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'تراجع (Undo)', accelerator: 'CmdOrCtrl+Z' },
        { role: 'redo', label: 'إعادة (Redo)', accelerator: 'CmdOrCtrl+Y' },
        { type: 'separator' },
        { role: 'cut', label: 'قص (Cut)', accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', label: 'نسخ (Copy)', accelerator: 'CmdOrCtrl+C' },
        { role: 'paste', label: 'لصق (Paste)', accelerator: 'CmdOrCtrl+V' },
        { role: 'selectAll', label: 'تحديد الكل (Select All)', accelerator: 'CmdOrCtrl+A' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(appMenuTemplate));

  mainWindow.setMenuBarVisibility(false);

  // Right-click context menu for Copy / Cut / Paste / Select All anywhere in the app
  mainWindow.webContents.on('context-menu', (_e, params) => {
    const menuTemplate: Electron.MenuItemConstructorOptions[] = [];
    const hasSelection = Boolean(params.selectionText && params.selectionText.trim().length > 0);

    if (params.isEditable) {
      menuTemplate.push(
        { role: 'cut', label: 'قص (Cut)', accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', label: 'نسخ (Copy)', accelerator: 'CmdOrCtrl+C' },
        { role: 'paste', label: 'لصق (Paste)', accelerator: 'CmdOrCtrl+V' },
        { type: 'separator' },
        { role: 'selectAll', label: 'تحديد الكل (Select All)', accelerator: 'CmdOrCtrl+A' }
      );
    } else {
      if (hasSelection) {
        menuTemplate.push(
          { role: 'copy', label: 'نسخ (Copy)', accelerator: 'CmdOrCtrl+C' },
          { type: 'separator' }
        );
      }
      if (params.linkURL) {
        menuTemplate.push(
          {
            label: 'نسخ الرابط (Copy Link)',
            click: () => {
              clipboard.writeText(params.linkURL);
            },
          },
          { type: 'separator' }
        );
      }
      menuTemplate.push(
        { role: 'selectAll', label: 'تحديد الكل (Select All)', accelerator: 'CmdOrCtrl+A' }
      );
    }

    if (menuTemplate.length > 0 && mainWindow) {
      const contextMenu = Menu.buildFromTemplate(menuTemplate);
      contextMenu.popup({ window: mainWindow });
    }
  });

  // Diagnostic logging for renderer console and crashes
  mainWindow.webContents.on('console-message', (_e, level, msg, line, src) => {
    console.log(`[Renderer L${level}] ${msg} (${src}:${line})`);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[Main] Render process gone:', details);
  });

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
  const statusLabel = !isLoggedIn
    ? 'غير متصل'
    : shiftEnded
    ? 'انتهت الوردية اليوم'
    : isPaused
    ? 'استراحة رسمية'
    : 'جلسة العمل موثقة';

  const contextMenu = Menu.buildFromTemplate([
    { label: `MaxP Workspace — ${statusLabel}`, enabled: false },
    { type: 'separator' },
    {
      label: 'فتح مساحة العمل والمهام',
      click: () => createMainWindow(),
    },
    { type: 'separator' as const },
    ...(isLoggedIn ? [
      ...(!shiftEnded ? [{
        label: isPaused ? 'استئناف العمل' : 'بدء استراحة رسمية',
        click: async () => {
          if (isPaused) await resumeTracking();
          else pauseTracking();
        },
      }] : []),
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
      label: 'إغلاق مساحة العمل (خروج)',
      click: async () => {
        const choice = dialog.showMessageBoxSync(mainWindow || undefined as any, {
          type: 'warning',
          buttons: ['إلغاء والتراجع', 'تأكيد إغلاق مساحة العمل'],
          defaultId: 0,
          cancelId: 0,
          title: 'تأكيد إغلاق مساحة العمل — MaxP',
          message: 'هل أنت متأكد من إغلاق تطبيق مساحة العمل؟',
          detail: 'سيتم توثيق إغلاق التطبيق يدوياً وتجميد عداد العمل الفعلي فوراً وإشعار الإدارة بحالة عدم الاتصال.',
        });

        if (choice === 1) {
          try {
            await apiClient.endDeviceSession('MANUAL_APP_CLOSE');
            syncEngine.flushAndCaptureNow();
          } catch {}
          app.exit(0);
        }
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
  currentBreakStartedAt = Date.now();
  activityTracker.stop();
  windowTracker.stop();
  stopIdleReminder();
  syncEngine.setBreakState(true, currentBreakReason);
  updateTrayMenu();
  sendStateToRenderer();
  showNotification('MaxP Workspace', `تم تفعيل استراحة: ${currentBreakReason} (توقف العداد)`, true);
}

async function resumeTracking(): Promise<void> {
  if (currentBreakStartedAt) {
    const elapsed = Math.max(1, Math.floor((Date.now() - currentBreakStartedAt) / 1000));
    currentBreakStartedAt = null;
    const today = getLocalDateString();
    localDb.recordBreakEvent(today, elapsed);
  }
  isPaused = false;
  currentBreakReason = '';
  remindedForThisIdleEpisode = false;
  syncEngine.setBreakState(false, null);
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('auth:logged-out');
  }
  createMainWindow();
}

// ── IPC Handlers ──────────────────────────────────────────────

function registerIpcHandlers(): void {
  // Safe Clipboard IPC handlers
  ipcMain.handle('clipboard:write-text', async (_, text: string) => {
    try {
      clipboard.writeText(String(text || ''));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  });

  ipcMain.handle('clipboard:read-text', async () => {
    try {
      const text = clipboard.readText();
      return { success: true, text };
    } catch (err: any) {
      return { success: false, error: err?.message, text: '' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_TRACKER_STATE, () => {
    const today = getLocalDateString();
    const stored = localDb.getDailyStats(today);
    const live = isTracking && !isPaused && !shiftEnded ? activityTracker.getCurrentIntervalStats() : null;

    const liveBreakSec = isPaused && currentBreakStartedAt
      ? Math.max(0, Math.floor((Date.now() - currentBreakStartedAt) / 1000))
      : 0;
    const baseBreakSec = stored?.total_break_seconds || 0;
    const totalBreakSec = baseBreakSec + liveBreakSec;
    const totalBreakCount = (stored?.total_break_count || 0) + (isPaused && currentBreakStartedAt ? 1 : 0);
    const totalActive = (stored?.total_active_seconds ?? 0) + (live?.activeSeconds || 0);
    const totalIdle = (stored?.total_idle_seconds ?? 0) + (live?.idleSeconds || 0);
    const totalSleep = Math.max(0, totalIdle - totalBreakSec);

    return {
      isTracking,
      isPaused,
      shiftEnded,
      shiftEndedAt,
      currentDate: today,
      breakReason: currentBreakReason,
      breakCount: totalBreakCount,
      breakSeconds: totalBreakSec,
      todaySleepSeconds: totalSleep,
      currentApp: windowTracker.currentAppName,
      currentUrl: windowTracker.currentUrl,
      activityScore: live?.activityScore ?? (activityTracker as any).lastActivityScore ?? 0,
      todayActiveSeconds: totalActive,
      todayIdleSeconds: totalIdle,
      sessionStartedAt: isTracking ? sessionStartedAt : null,
      deviceType: currentDeviceType,
      isOvertime,
      activeOvertimeSession,
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

  ipcMain.handle('tracker:end-shift', async (_, handoverData?: { handoverNotes?: string; pendingTasks?: string }) => {
    try {
      console.log('[Main] Ending shift for today with handover notes:', handoverData?.handoverNotes);
      // 1. Flush any active interval and sync
      syncEngine.flushAndCaptureNow();

      const today = getLocalDateString();
      shiftEnded = true;
      shiftEndedAt = new Date().toISOString();
      isOvertime = false;
      activeOvertimeSession = null;
      localDb.markShiftEnded(today, shiftEndedAt);

      // 2. Pause trackers to freeze live counters
      isTracking = false;
      activityTracker.stop();
      windowTracker.stop();
      stopIdleReminder();

      // 3. Inform server / HR attendance check-out or handover
      let checkoutRes: any = null;
      try {
        if (handoverData?.handoverNotes || handoverData?.pendingTasks) {
          checkoutRes = await apiClient.closeShiftWithHandover({
            handoverNotes: handoverData.handoverNotes,
            pendingTasks: handoverData.pendingTasks,
          });
        } else {
          checkoutRes = await apiClient.clockOut();
        }
      } catch (err: any) {
        console.warn('[Main] Clock-out / handover API call error:', err?.message);
      }

      // 4. ⏱️ Auto-stop any running task timers upon shift ending
      try {
        const timerRes = await apiClient.getRunningTaskTimer();
        const activeTimers = timerRes?.runningTimers || (timerRes?.runningTimer ? [timerRes.runningTimer] : []);
        for (const t of activeTimers) {
          if (t?.id) {
            await apiClient.stopTaskTimer(t.id);
            console.log(`[Main] Auto-stopped running task timer ${t.id} on shift end`);
          }
        }
      } catch (err: any) {
        console.warn('[Main] Error stopping running task timer on shift end:', err?.message);
      }

      updateTrayMenu();
      sendStateToRenderer();
      showNotification('MaxP Workspace', 'تم إنهاء وردية العمل وتوثيق الانصراف بنجاح.');

      return {
        success: true,
        attendance: checkoutRes?.attendance,
        handover: checkoutRes?.handover,
        shiftEndedAt,
        message: 'تم إنهاء وردية العمل وتوثيق الانصراف بنجاح.',
      };
    } catch (err: any) {
      console.error('[Main] Failed to end shift:', err);
      return { success: false, error: err?.message || 'تعذر إنهاء الوردية' };
    }
  });

  ipcMain.handle('tracker:start-overtime', async (_, { reason, taskSummary }: { reason: string; taskSummary?: string }) => {
    try {
      console.log('[Main] Starting overtime session:', reason);
      const res = await apiClient.startOvertimeSession(reason, taskSummary);
      if (res.success && res.session) {
        isOvertime = true;
        activeOvertimeSession = {
          id: res.session.id,
          startedAt: res.session.startedAt,
          reason: res.session.reason,
          taskSummary: res.session.taskSummary,
        };
        shiftEnded = false; // allow tracking
        await startTracking();
        updateTrayMenu();
        sendStateToRenderer();
        showNotification('MaxP Workspace', `تم تفعيل الوردية الإضافية: ${reason}`);
        return { success: true, session: res.session };
      }
      return { success: false, error: res.error || 'فشل بدء الوردية الإضافية' };
    } catch (err: any) {
      console.error('[Main] Failed to start overtime:', err);
      return { success: false, error: err?.message };
    }
  });

  ipcMain.handle('tracker:end-overtime', async (_, { taskSummary } = {}) => {
    try {
      console.log('[Main] Ending overtime session...');
      const res = await apiClient.endOvertimeSession(taskSummary);
      isOvertime = false;
      activeOvertimeSession = null;
      shiftEnded = true;
      shiftEndedAt = new Date().toISOString();
      activityTracker.stop();
      windowTracker.stop();
      isTracking = false;
      updateTrayMenu();
      sendStateToRenderer();
      showNotification('MaxP Workspace', `تم إنهاء الوردية الإضافية بنجاح (${res.durationMin || 0} دقيقة).`);
      return { success: true, durationMin: res.durationMin };
    } catch (err: any) {
      console.error('[Main] Failed to end overtime:', err);
      return { success: false, error: err?.message };
    }
  });

  ipcMain.handle('tracker:get-shift-status', async () => {
    try {
      const res = await apiClient.getTodayShiftStatus();
      if (res.success && res.status) {
        if (res.status.isOvertimeActive && res.status.activeOvertime) {
          isOvertime = true;
          activeOvertimeSession = res.status.activeOvertime;
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  });

  ipcMain.handle('tracker:start-shift', async () => {
    try {
      console.log('[Main] Starting new shift...');
      shiftEnded = false;
      shiftEndedAt = null;
      sessionStartedAt = new Date().toISOString();
      await startTracking();
      try {
        await apiClient.autoClockIn();
      } catch {}
      sendStateToRenderer();
      showNotification('MaxP Workspace', 'تم بدء وردية عمل جديدة وتوثيق الحضور بنجاح.');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  });

  ipcMain.handle('tracker:get-apps-summary', async (_, targetDate?: string) => {
    try {
      const { apps, websites } = windowTracker.flushRecords();
      for (const a of apps) localDb.queueAppUsage(a);
      for (const w of websites) localDb.queueWebUsage(w);
    } catch {}

    const localApps = localDb.getTodayAppsSummary(targetDate);
    const today = getLocalDateString();
    const isToday = !targetDate || targetDate === today;

    if (!isToday && localApps.length === 0 && apiClient.isConfigured) {
      try {
        const timeline = await apiClient.getTimeline(targetDate);
        if (timeline && Array.isArray(timeline.apps) && timeline.apps.length > 0) {
          return timeline.apps.map((a: any) => ({
            appName: a.appName || 'Unknown App',
            durationSeconds: a.durationSeconds || a.totalSeconds || 0,
            category: a.category || 'unrated',
          }));
        }
      } catch {}
    }
    return localApps;
  });

  ipcMain.handle('tracker:get-websites-summary', async (_, targetDate?: string) => {
    try {
      const { apps, websites } = windowTracker.flushRecords();
      for (const a of apps) localDb.queueAppUsage(a);
      for (const w of websites) localDb.queueWebUsage(w);
    } catch {}

    const localWeb = localDb.getTodayWebsitesSummary(targetDate);
    const today = getLocalDateString();
    const isToday = !targetDate || targetDate === today;

    if (!isToday && localWeb.length === 0 && apiClient.isConfigured) {
      try {
        const timeline = await apiClient.getTimeline(targetDate);
        if (timeline && Array.isArray(timeline.websites) && timeline.websites.length > 0) {
          return timeline.websites.map((w: any) => ({
            domain: w.domain || 'Direct / Internal',
            durationSeconds: w.durationSeconds || w.totalSeconds || 0,
            category: w.category || 'unrated',
          }));
        }
      } catch {}
    }
    return localWeb;
  });

  ipcMain.handle('tracker:get-all-daily-keys', () => {
    return localDb.getAllDailyStatsKeys();
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
    const today = getLocalDateString();
    const localDaily = localDb.getDailyStats(today);
    const live = isTracking && !isPaused && !shiftEnded ? activityTracker.getCurrentIntervalStats() : null;

    let serverDaily: any = null;
    try {
      serverDaily = await apiClient.getDailySummary(today);
    } catch {}

    let todayAtt: any = null;
    try {
      todayAtt = await apiClient.checkTodayAttendance();
    } catch {}

    const clockInTime = todayAtt?.checkInTime || todayAtt?.checkIn || todayAtt?.createdAt || serverDaily?.clockInTime || null;
    const clockInMethod = todayAtt?.checkInMethod || null;
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
      clockInMethod,
      firstActivityTime,
      clockOutTime,
      lastActivityTime,
      lateStartSeconds,
      totalActiveSeconds: totalActive,
      totalIdleSeconds: totalIdle,
    };
  });

  ipcMain.handle('attendance:clock-in', async () => {
    if (currentDeviceType !== 'OFFICE') {
      return { success: false, error: 'بصمة الحضور من الأجهزة الشخصية بتتسجل من صفحة الحضور على الويب، مش من التطبيق ده.' };
    }
    try {
      const res = await apiClient.autoClockIn();
      if (res?.success) {
        showNotification('MaxP Workspace', 'تم توثيق حضورك بنجاح.');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('attendance:updated', res.attendance);
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_DAILY_SUMMARY, async (_, targetDate?: string) => {
    const today = getLocalDateString();
    const dateToQuery = targetDate || today;
    let stored = localDb.getDailyStats(dateToQuery);

    const isToday = dateToQuery === today;

    // Stale-While-Revalidate Cloud Fallback for past dates:
    if (!isToday && (!stored || stored.total_active_seconds === 0) && apiClient.isConfigured) {
      try {
        const serverSummary: any = await apiClient.getDailySummary(dateToQuery);
        if (serverSummary && (serverSummary.totalActiveSeconds > 0 || serverSummary.totalIdleSeconds > 0)) {
          localDb.updateDailyStats(
            dateToQuery,
            serverSummary.totalActiveSeconds || 0,
            serverSummary.totalIdleSeconds || 0,
            serverSummary.totalMouseEvents || 0,
            serverSummary.totalKeyboardEvents || 0
          );
          if (serverSummary.shiftEndedAt) {
            localDb.markShiftEnded(dateToQuery, serverSummary.shiftEndedAt);
          }
          stored = localDb.getDailyStats(dateToQuery);
        }
      } catch (err: any) {
        console.warn('[Main] Cloud summary fallback notice for', dateToQuery, err.message);
      }
    }

    stored = stored || {
      date: dateToQuery,
      first_activity: null,
      last_activity: null,
      total_active_seconds: 0,
      total_idle_seconds: 0,
      total_mouse_events: 0,
      total_keyboard_events: 0,
      shift_ended_at: null,
    };

    const live = isToday && isTracking && !isPaused && !shiftEnded ? activityTracker.getCurrentIntervalStats() : null;

    const liveBreakSec = isToday && isPaused && currentBreakStartedAt
      ? Math.max(0, Math.floor((Date.now() - currentBreakStartedAt) / 1000))
      : 0;
    const baseBreakSec = stored.total_break_seconds || 0;
    const totalBreakSec = baseBreakSec + liveBreakSec;
    const totalBreakCount = (stored.total_break_count || 0) + (isToday && isPaused && currentBreakStartedAt ? 1 : 0);
    const totalIdle = stored.total_idle_seconds + (live?.idleSeconds || 0);
    const totalSleepSec = Math.max(0, totalIdle - totalBreakSec);

    return {
      ...stored,
      total_active_seconds: stored.total_active_seconds + (live?.activeSeconds || 0),
      total_idle_seconds: totalIdle,
      total_break_seconds: totalBreakSec,
      total_break_count: totalBreakCount,
      total_sleep_seconds: totalSleepSec,
      total_mouse_events: stored.total_mouse_events + (live?.mouseEvents || 0),
      total_keyboard_events: stored.total_keyboard_events + (live?.keyboardEvents || 0),
      isHistorical: !isToday,
      shiftEnded: isToday ? shiftEnded : Boolean(stored.shift_ended_at),
      shiftEndedAt: isToday ? shiftEndedAt : stored.shift_ended_at,
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
      const fp = getHardwareFingerprint();
      apiClient.configure(serverUrl, token, user?.companyId, fp);
      await syncDeviceRegistration();
      resetTaskPollerState();
      await startTracking();
      updateTrayMenu();
      if (currentDeviceType === 'OFFICE') {
        setTimeout(() => { triggerAutoClockIn(); }, 2000);
      } else {
        console.log('[Main IPC] Logged in on PERSONAL device — auto clock-in skipped.');
      }
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
  ipcMain.handle('tasks:get', async (_, type?: 'my-tasks' | 'assigned-by-me' | 'all') => {
    const scope = type || 'my-tasks';
    try {
      const tasks = await apiClient.getTasks(scope);
      if (Array.isArray(tasks) && tasks.length > 0) {
        localDb.saveTasksCache(scope, tasks);
      }
      return { success: true, tasks: tasks || [], fromCache: false, isOffline: false };
    } catch (err: any) {
      console.warn(`[main] Failed to fetch tasks (${scope}), serving from local cache:`, err.message);
      const cached = localDb.getTasksCache(scope);
      return {
        success: true,
        tasks: cached,
        fromCache: true,
        isOffline: true,
        error: err.message,
      };
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

  ipcMain.handle('tasks:update-status', async (_, { taskId, status, revisionReason }) => {
    try {
      const task = await apiClient.updateTaskStatus(taskId, status, revisionReason);
      mainWindow?.webContents.send('tasks:refresh', { action: 'update-status', taskId, status, revisionReason });
      setTimeout(() => {
        pollTaskNotifications().catch(() => {});
      }, 500);
      return { success: true, task };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:get-activities', async (_, { taskId }) => {
    try {
      const activities = await apiClient.getTaskActivities(taskId);
      return { success: true, data: activities };
    } catch (err: any) {
      return { success: false, error: err.message, data: [] };
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
      const res = await apiClient.getRunningTaskTimer();
      const runningTimer = res?.runningTimer ?? (Array.isArray(res?.data) ? res?.data[0] : res?.data) ?? null;
      const runningTimers = Array.isArray(res?.runningTimers)
        ? res.runningTimers
        : Array.isArray(res?.data)
        ? res.data
        : (runningTimer ? [runningTimer] : []);
      return { success: true, runningTimer, runningTimers };
    } catch (err: any) {
      return { success: false, error: err.message, runningTimer: null, runningTimers: [] };
    }
  });

  ipcMain.handle('tasks:get-company-active-timers', async () => {
    try {
      const activeTimers = await apiClient.getCompanyActiveTimers();
      return { success: true, activeTimers };
    } catch (err: any) {
      return { success: false, activeTimers: [], error: err.message };
    }
  });

  ipcMain.handle('monitor:get-team-overview', async (_, date?: string) => {
    try {
      const data = await apiClient.getTeamOverview(date);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, data: [], error: err.message };
    }
  });

  ipcMain.handle('tasks:add-watcher', async (_, { taskId, userId }) => {
    try {
      const result = await apiClient.addTaskWatcher(taskId, userId);
      mainWindow?.webContents.send('tasks:refresh', { action: 'add-watcher', taskId });
      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:remove-watcher', async (_, { taskId, userId }) => {
    try {
      const result = await apiClient.removeTaskWatcher(taskId, userId);
      mainWindow?.webContents.send('tasks:refresh', { action: 'remove-watcher', taskId });
      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ── Task Dependencies Handlers ──
  ipcMain.handle('tasks:get-dependencies', async (_, { taskId }) => {
    try {
      const data = await apiClient.getTaskDependencies(taskId);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message, data: [] };
    }
  });

  ipcMain.handle('tasks:add-dependency', async (_, { taskId, dependsOnId, type }) => {
    try {
      const data = await apiClient.addTaskDependency(taskId, dependsOnId, type);
      mainWindow?.webContents.send('tasks:refresh', { action: 'add-dependency', taskId });
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:remove-dependency', async (_, { dependencyId }) => {
    try {
      const data = await apiClient.removeTaskDependency(dependencyId);
      mainWindow?.webContents.send('tasks:refresh', { action: 'remove-dependency' });
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ── Subtasks & Checklists Handlers ──
  ipcMain.handle('tasks:get-subtasks', async (_, { parentTaskId }) => {
    try {
      const data = await apiClient.getSubtasks(parentTaskId);
      return { success: true, subtasks: data };
    } catch (err: any) {
      return { success: false, error: err.message, subtasks: [] };
    }
  });

  ipcMain.handle('tasks:create-subtask', async (_, { parentTaskId, title, assignedTo, priority }) => {
    try {
      const data = await apiClient.createSubtask(parentTaskId, { title, assignedTo, priority });
      mainWindow?.webContents.send('tasks:refresh', { action: 'create-subtask', parentTaskId });
      return { success: true, subtask: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:get-checklists', async (_, { taskId }) => {
    try {
      const data = await apiClient.getChecklists(taskId);
      return { success: true, checklists: data };
    } catch (err: any) {
      return { success: false, error: err.message, checklists: [] };
    }
  });

  ipcMain.handle('tasks:create-checklist', async (_, { taskId, title }) => {
    try {
      const data = await apiClient.createChecklist(taskId, title);
      return { success: true, checklist: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:add-checklist-item', async (_, { checklistId, text }) => {
    try {
      const data = await apiClient.addChecklistItem(checklistId, text);
      return { success: true, item: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:update-checklist-item', async (_, { itemId, isCompleted, text }) => {
    try {
      const data = await apiClient.updateChecklistItem(itemId, { isCompleted, text });
      return { success: true, item: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tasks:delete-checklist-item', async (_, { itemId }) => {
    try {
      const data = await apiClient.deleteChecklistItem(itemId);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ── Goals Handlers ──
  ipcMain.handle('goals:get-today', async (_, userId?: string) => {
    try {
      const goals = await apiClient.getTodayGoals(userId);
      return { success: true, goals };
    } catch (err: any) {
      return { success: false, error: err.message, goals: [] };
    }
  });

  ipcMain.handle('goals:get-all', async (_, params?: any) => {
    try {
      const goals = await apiClient.getGoals(params || {});
      return { success: true, goals };
    } catch (err: any) {
      return { success: false, error: err.message, goals: [] };
    }
  });

  ipcMain.handle('goals:update-progress', async (_, { goalId, current, notes }) => {
    try {
      const result = await apiClient.updateGoalProgress(goalId, current, notes);
      mainWindow?.webContents.send('goals:refresh', { goalId });
      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('goals:ensure-today', async (_, userId?: string) => {
    try {
      const goals = await apiClient.ensureTodayGoals(userId);
      mainWindow?.webContents.send('goals:refresh', {});
      return { success: true, goals };
    } catch (err: any) {
      return { success: false, error: err.message, goals: [] };
    }
  });

  ipcMain.handle('goals:create', async (_, goalData: any) => {
    try {
      const goal = await apiClient.createGoal(goalData);
      mainWindow?.webContents.send('goals:refresh', {});
      return { success: true, goal };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ── Dashboard Stats & Performance Report Handlers ──
  ipcMain.handle('tasks:get-dashboard-stats', async () => {
    try {
      const stats = await apiClient.getTaskDashboardStats();
      return { success: true, stats };
    } catch (err: any) {
      return { success: false, error: err.message, stats: null };
    }
  });

  // ── Task Comments Handlers ──
  ipcMain.handle('tasks:get-comments', async (_, taskId: string) => {
    try {
      const res = await apiClient.getTaskComments(taskId);
      return res;
    } catch (err: any) {
      return { success: false, error: err.message, comments: [] };
    }
  });

  ipcMain.handle(
    'tasks:add-comment',
    async (_, { taskId, content }: { taskId: string; content: string }) => {
      try {
        const res = await apiClient.addTaskComment(taskId, content);
        return res;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  ipcMain.handle(
    'tasks:update-comment',
    async (_, { commentId, content }: { commentId: string; content: string }) => {
      try {
        const res = await apiClient.updateTaskComment(commentId, content);
        return res;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  ipcMain.handle('tasks:delete-comment', async (_, commentId: string) => {
    try {
      const res = await apiClient.deleteTaskComment(commentId);
      return res;
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

  ipcMain.handle('tasks:fetch-attachment', async (_, { url }: { url: string }) => {
    try {
      if (!url || typeof url !== 'string') {
        return { success: false, error: 'Invalid attachment URL' };
      }

      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        let base = (store.get('serverUrl') || apiClient.server || 'https://maxp.online').trim().replace(/\/$/, '');
        if (!base.startsWith('http://') && !base.startsWith('https://')) {
          base = `https://${base}`;
        }
        if (!targetUrl.startsWith('/')) {
          targetUrl = `/${targetUrl}`;
        }
        targetUrl = `${base}${targetUrl}`;
      }

      const headers: Record<string, string> = {
        'User-Agent': 'MaxP-Desktop-Workspace',
      };
      if (apiClient.token) {
        headers['Authorization'] = `Bearer ${apiClient.token}`;
      }

      const res = await axios.get(targetUrl, {
        responseType: 'arraybuffer',
        headers,
        timeout: 25000,
        maxContentLength: 50 * 1024 * 1024,
      });

      const contentType = res.headers['content-type'] || 'image/png';
      const base64 = Buffer.from(res.data).toString('base64');
      const dataUrl = `data:${contentType};base64,${base64}`;

      return {
        success: true,
        dataUrl,
        contentType,
        fileSize: res.data.byteLength,
      };
    } catch (err: any) {
      console.warn('[Main] Failed to fetch task attachment via IPC:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to download attachment' };
    }
  });

  // ── Window Management & Titlebar IPCs ──
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
    return true;
  });

  ipcMain.handle('window:toggle-maximize', () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow?.hide();
    return true;
  });

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  ipcMain.handle('device:get-info', () => {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      appVersion: app.getVersion(),
      deviceType: currentDeviceType,
      fingerprint: getHardwareFingerprint(),
    };
  });


  ipcMain.handle('tasks:capture-screen', async () => {
    const wasVisible = mainWindow && !mainWindow.isMinimized() && mainWindow.isVisible();
    try {
      if (wasVisible) {
        mainWindow?.hide();
        // Allow OS window manager (DWM) compositor to refresh the screen behind the app
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
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
    } finally {
      if (wasVisible) {
        mainWindow?.show();
        mainWindow?.focus();
      }
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
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const today = getLocalDateString();
  const stored = localDb.getDailyStats(today);
  const liveBreakSec = isPaused && currentBreakStartedAt
    ? Math.max(0, Math.floor((Date.now() - currentBreakStartedAt) / 1000))
    : 0;
  const totalBreakSec = (stored?.total_break_seconds || 0) + liveBreakSec;
  const totalBreakCount = (stored?.total_break_count || 0) + (isPaused && currentBreakStartedAt ? 1 : 0);

  mainWindow.webContents.send(IPC_CHANNELS.TRACKER_STATE_UPDATE, {
    isTracking,
    isPaused,
    breakReason: currentBreakReason,
    breakCount: totalBreakCount,
    breakSeconds: totalBreakSec,
    shiftEnded,
    shiftEndedAt,
    currentDate: today,
    deviceType: currentDeviceType,
    isOvertime,
    activeOvertimeSession,
  });
}

// ── OS Power & Lock Screen Event Handlers ─────────────────────

function registerPowerMonitorHooks(): void {
  try {
    powerMonitor.on('suspend', () => {
      console.log('[PowerMonitor] System suspend / sleep detected — freezing accumulator');
      handleSystemSuspend('suspend');
    });

    powerMonitor.on('lock-screen', () => {
      console.log('[PowerMonitor] Screen lock detected — pausing activity accumulator');
      handleSystemSuspend('lock-screen');
    });

    powerMonitor.on('resume', () => {
      console.log('[PowerMonitor] System resume detected — re-evaluating session duration');
      handleSystemResume('resume');
    });

    powerMonitor.on('unlock-screen', () => {
      console.log('[PowerMonitor] Screen unlock detected');
      handleSystemResume('unlock-screen');
    });
  } catch (err: any) {
    console.warn('[PowerMonitor] Could not register power monitor hooks:', err?.message);
  }
}

function handleSystemSuspend(reason: string): void {
  systemSuspendedAt = Date.now();
  if (isTracking && !isPaused && !shiftEnded) {
    try {
      syncEngine.flushAndCaptureNow();
      syncEngine.setSuspended(true);
    } catch (err) {
      console.warn('[Main] Error during suspend flush:', err);
    }
  }

  // ⏱️ Auto-stop running task timers on sleep / screen lock so hours don't run overnight
  try {
    apiClient.getRunningTaskTimer().then((timerRes) => {
      const activeTimers = timerRes?.runningTimers || (timerRes?.runningTimer ? [timerRes.runningTimer] : []);
      for (const t of activeTimers) {
        if (t?.id) {
          apiClient.stopTaskTimer(t.id).catch(() => {});
          console.log(`[PowerMonitor] Auto-stopped task timer ${t.id} on system ${reason}`);
        }
      }
    }).catch(() => {});
  } catch {}
}

function handleSystemResume(reason: string): void {
  const suspendedTime = systemSuspendedAt;
  systemSuspendedAt = null;
  syncEngine.setSuspended(false);

  const currentLocal = getLocalDateString();
  if (lastDayRolloverDate && currentLocal !== lastDayRolloverDate) {
    handleDayRollover(currentLocal);
  } else {
    // Reset interval start so sleep time is not counted as idle
    activityTracker.resetSession();
  }

  // If away for more than 2 hours (e.g. overnight or lengthy absence), prompt renderer
  if (suspendedTime && (Date.now() - suspendedTime > 2 * 3600 * 1000)) {
    const elapsedSec = Math.floor((Date.now() - suspendedTime) / 1000);
    console.log(`[Main] Prolonged away episode detected: ${elapsedSec}s`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tracker:inactivity-return', {
        elapsedSec,
        suspendedAt: suspendedTime,
        returnTime: Date.now(),
      });
    }
  }

  sendStateToRenderer();
}

// ── Midnight / Day Rollover Watcher ───────────────────────────

function startMidnightRolloverWatcher(): void {
  lastDayRolloverDate = getLocalDateString();
  if (midnightWatcherInterval) clearInterval(midnightWatcherInterval);

  midnightWatcherInterval = setInterval(() => {
    const currentLocal = getLocalDateString();
    if (lastDayRolloverDate && currentLocal !== lastDayRolloverDate) {
      handleDayRollover(currentLocal);
    }
  }, 30_000); // Check every 30s
}

function handleDayRollover(newDate: string): void {
  const previousDate = lastDayRolloverDate;
  lastDayRolloverDate = newDate;
  console.log(`[Main] ── Day Rollover Activated: ${previousDate} -> ${newDate} ──`);

  try {
    // 1. Flush previous day's data so it is archived cleanly
    syncEngine.flushAndCaptureNow();

    // 2. Reset shift status for the fresh day
    shiftEnded = false;
    shiftEndedAt = null;
    activityTracker.resetSession();
  } catch (err) {
    console.warn('[Main] Error handling day rollover:', err);
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tracker:day-rollover', {
      newDate,
      previousDate,
    });
  }

  sendStateToRenderer();
  showNotification('MaxP Workspace', `بدأ يوم عمل جديد (${newDate}). تم أرشفة إحصائيات الأمس وفصل العداد.`);
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
        if (!remindedForThisIdleEpisode) {
          remindedForThisIdleEpisode = true;
          showNotification(
            'MaxP Workspace',
            'لاحظنا خمولاً ممتدًا. لو رجعت للعمل تفقد الجلسة تلقائياً، ولو خارجه فعّل «استراحة رسمية».',
            true
          );
        }

        // ⏱️ إيقاف تلقائي لمؤقتات المهام وتعليق التتبع إذا تجاوز الخمول 15 دقيقة متصلة
        if (idleSec >= 900 && !isPaused) {
          console.log('[IdleMonitor] Idle exceeded 15 minutes continuously — pausing tracking & stopping running timers');
          pauseTracking('خمول ممتد تلقائي');
          apiClient.getRunningTaskTimer().then((timerRes) => {
            const activeTimers = timerRes?.runningTimers || (timerRes?.runningTimer ? [timerRes.runningTimer] : []);
            for (const t of activeTimers) {
              if (t?.id) apiClient.stopTaskTimer(t.id).catch(() => {});
            }
          }).catch(() => {});
        }
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
    // 🖥️ [DEVICE-ISOLATION] Only OFFICE machines can automatically clock in!
    // Personal machines must never record office attendance automatically!
    if (currentDeviceType !== 'OFFICE') {
      console.log('[Main] Auto clock-in skipped: device is classified as PERSONAL.');
      return;
    }

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

    // Overdue sweep collected first, then emitted as ONE digest toast —
    // firing one toast per task made them overlap on the same corner slot.
    const freshOverdueMine: string[] = [];
    let freshOverdueMineUrgent = 0;
    const freshOverdueTeam: string[] = [];

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
            freshOverdueMine.push(t.title);
            if (isUrgent) freshOverdueMineUrgent++;
          }
        }
      }
    }

    if (freshOverdueMine.length === 1) {
      showNotification(
        '⚠️ مهمة متأخرة عن التسليم',
        `تجاوزت المهمة "${freshOverdueMine[0]}" موعد التسليم المحدد!`,
        true
      );
      hasChanges = true;
    } else if (freshOverdueMine.length > 1) {
      showNotification(
        '⚠️ مهام متأخرة عن التسليم',
        `${freshOverdueMine.length} مهام تجاوزت مواعدها${freshOverdueMineUrgent ? ` (${freshOverdueMineUrgent} منها عاجلة)` : ''} — أبرزها: «${freshOverdueMine[0]}» و«${freshOverdueMine[1]}». التفاصيل كاملة في شاشة المهام.`,
        true
      );
      hasChanges = true;
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
            freshOverdueTeam.push(`${t.title} (الموكلة لـ ${assigneeName})`);
          }
        }

        knownMyTasksStatuses.set(t.id, currentStatus);
      }
    }

    if (freshOverdueTeam.length === 1) {
      setTimeout(
        () => showNotification(
          '⚠️ مهمة متأخرة في فريقك',
          `تجاوزت المهمة «${freshOverdueTeam[0]}» موعد التسليم المحدد!`,
          true
        ),
        1500
      );
      hasChanges = true;
    } else if (freshOverdueTeam.length > 1) {
      setTimeout(
        () => showNotification(
          '⚠️ مهام متأخرة في فريقك',
          `${freshOverdueTeam.length} مهام في فريقك تجاوزت مواعدها — أبرزها: «${freshOverdueTeam[0]}». التفاصيل في شاشة المهام.`,
          true
        ),
        1500
      );
      hasChanges = true;
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

