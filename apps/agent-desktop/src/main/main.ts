import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  desktopCapturer,
  safeStorage,
  globalShortcut,
  shell,
} from 'electron';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { autoUpdater } from 'electron-updater';
import { IPC_CHANNELS, AgentInfo, StoreProduct } from '../shared/types';

let isQuitting = false;

// ── Local Storage Helper ─────────────────────────────────────────
class SimpleStore {
  private file = '';
  private data: Record<string, any> = {};

  init() {
    try {
      this.file = path.join(app.getPath('userData'), 'agent-studio-config.json');
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
      if (!this.file) {
        this.file = path.join(app.getPath('userData'), 'agent-studio-config.json');
      }
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    } catch {}
  }

  delete(key: string): void {
    delete this.data[key];
    try {
      if (!this.file) {
        this.file = path.join(app.getPath('userData'), 'agent-studio-config.json');
      }
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    } catch {}
  }
}

const store = new SimpleStore();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// ── Auth Token Storage with Windows DPAPI Encryption ────────────
function saveAuthToken(token: string): void {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      store.set('authTokenEnc', safeStorage.encryptString(token).toString('base64'));
      store.delete('authToken');
      return;
    }
  } catch {}
  store.set('authToken', token);
}

function loadAuthToken(): string | null {
  try {
    const encrypted = store.get('authTokenEnc') as string | undefined;
    if (encrypted && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    }
    const plain = store.get('authToken') as string | undefined;
    if (plain) return plain;
  } catch {}
  return null;
}

function clearAuthToken(): void {
  store.delete('authTokenEnc');
  store.delete('authToken');
  store.delete('currentUser');
}

// ── Single Instance Enforcement ─────────────────────────────────
app.setName('MaxP Agent Studio');
app.setAppUserModelId('online.maxp.agent');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    if (mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      mainWindow.focus();
    }
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// ── Window Initialization ────────────────────────────────────────
function createWindow() {
  store.init();

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#09090b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const distIndex = path.resolve(__dirname, '../../renderer/index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] MaxP Agent Studio UI loaded successfully');
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
    console.error(`[Main] Failed to load UI: ${errorCode} - ${errorDescription}`);
    // If dev URL fails or file load fails, try loading distIndex
    mainWindow?.loadFile(distIndex).catch(() => {});
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5175').catch(() => {
      mainWindow?.loadFile(distIndex);
    });
  } else {
    mainWindow.loadFile(distIndex);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  createTray();
  registerGlobalShortcuts();
}

// ── Global Shortcut (Alt + Space) ────────────────────────────────
function registerGlobalShortcuts() {
  try {
    globalShortcut.register('Alt+Space', () => {
      toggleWindow();
    });
  } catch (err) {
    console.warn('[Shortcuts] Could not register Alt+Space:', err);
  }
}

// ── System Tray ──────────────────────────────────────────────────
function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, '../../assets/icon.ico');
  let icon: any;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('MaxP Agent Studio — متصل بالمنصة');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'فتح استوديو الوكلاء (Alt + Space)',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'التحقق من التحديثات',
      click: () => {
        autoUpdater.checkForUpdatesAndNotify().catch(() => {});
      },
    },
    { type: 'separator' },
    {
      label: 'إغلاق التطبيق نهائياً',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    toggleWindow();
  });
}

// ── IPC Handlers ─────────────────────────────────────────────────

// Window Controls
ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
  mainWindow?.minimize();
  return true;
});

ipcMain.handle(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE, () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
  mainWindow?.hide();
  return true;
});

ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
  return mainWindow?.isMaximized() || false;
});

ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, (_, url: string) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
    return { success: true };
  }
  return { success: false, error: 'Invalid URL' };
});

// Auth Handlers
ipcMain.handle(IPC_CHANNELS.LOGIN, async (_, { email, password, serverUrl }) => {
  const normalizedServer = (serverUrl || 'https://maxp.online').replace(/\/+$/, '');
  try {
    const res = await axios.post(`${normalizedServer}/api/v1/auth/login`, {
      email,
      password,
    });

    if (res.data?.token || res.data?.data?.token) {
      const token = res.data.token || res.data.data.token;
      const user = res.data.user || res.data.data?.user;

      saveAuthToken(token);
      store.set('serverUrl', normalizedServer);
      store.set('currentUser', user);

      return { success: true, user };
    }
    return { success: false, error: res.data?.message || 'بيانات الدخول غير صحيحة' };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.message || err.message || 'فشل الاتصال بسيرفر MaxP',
    };
  }
});

ipcMain.handle(IPC_CHANNELS.LOGOUT, () => {
  clearAuthToken();
  return true;
});

ipcMain.handle(IPC_CHANNELS.GET_AUTH_STATE, () => {
  const token = loadAuthToken();
  const user = store.get('currentUser', null);
  const serverUrl = store.get('serverUrl', 'https://maxp.online');
  return {
    isLoggedIn: Boolean(token && user),
    user,
    serverUrl,
  };
});

ipcMain.handle(IPC_CHANNELS.GET_TOKEN, () => {
  return { token: loadAuthToken() || '' };
});

// OS Vision & Context Handlers
ipcMain.handle(IPC_CHANNELS.CAPTURE_SCREEN, async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 720 },
    });
    if (sources.length > 0) {
      const primary = sources[0];
      return {
        success: true,
        dataUrl: primary.thumbnail.toDataURL(),
      };
    }
    return { success: false, error: 'No screen found' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_WINDOW, async () => {
  try {
    const activeWinModule: any = await import('active-win');
    const getWin = activeWinModule.default || activeWinModule;
    const win = await getWin();
    if (win) {
      return {
        success: true,
        title: win.title,
        owner: win.owner?.name,
      };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
});

// Agent Tools & Data Handlers
ipcMain.handle(IPC_CHANNELS.GET_AGENTS, async () => {
  const serverUrl = store.get('serverUrl', 'https://maxp.online');
  const token = loadAuthToken();

  // 1. Fetch live tenant agents from platform backend
  if (token) {
    try {
      const res = await axios.get(`${serverUrl}/api/v1/agent-manager/agents`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      if (res.data?.success && Array.isArray(res.data.agents) && res.data.agents.length > 0) {
        const liveAgents: AgentInfo[] = res.data.agents.map((a: any) => ({
          id: String(a.id || a.slug),
          slug: a.slug || a.template_slug || a.role?.toLowerCase() || String(a.id),
          name: a.name || 'وكيل MaxP',
          role: a.role || 'AGENT',
          icon: a.icon || (a.role === 'MEDIA_BUYER' ? '🎯' : a.role === 'CEO' ? '👔' : '🤖'),
          description: a.description || 'وكيل ذكي متصل بالمنصة',
          model: a.model || 'DeepSeek-V3',
          status: (a.status === 'ACTIVE' || !a.status) ? 'ACTIVE' : 'IDLE',
          badge: a.departmentName || (a.role === 'MEDIA_BUYER' ? 'Meta Graph API v21' : 'MaxP Core'),
        }));
        return { success: true, agents: liveAgents };
      }
    } catch (err: any) {
      console.warn('[DesktopAgents] Could not fetch live agents from server, using core squad:', err.message);
    }
  }

  // Built-in core MaxP Squad Agents matching the platform
  const squadAgents: AgentInfo[] = [
    {
      id: 'facebook-media-buyer-agent',
      slug: 'facebook-media-buyer-agent',
      name: 'Facebook Media Buyer',
      role: 'MEDIA_BUYER',
      icon: '🎯',
      description: 'إدارة الحملات، مراقبة ROAS، صياغة زوايا البيع، وتطبيق قرارات SCALE و KILL.',
      model: 'DeepSeek-V3',
      status: 'ACTIVE',
      badge: 'Meta Graph API v21',
    },
    {
      id: 'order-confirmation-agent',
      slug: 'order-confirmation-agent',
      name: 'منى — تأكيد الطلبات',
      role: 'ORDER_CONFIRMATION',
      icon: '📦',
      description: 'متابعة أوردرات COD المعلقة، حساب الشحن مع تيربو وبوسطة، ومتابعة العملاء.',
      model: 'Llama 3.3 70B',
      status: 'ACTIVE',
      badge: 'Turbo Logistics',
    },
    {
      id: 'creative-video-studio',
      slug: 'creative-video-studio',
      name: 'Creative Video Studio',
      role: 'CREATIVE_STUDIO',
      icon: '🎬',
      description: 'توليد ريلز وفيديوهات إعلانية 9:16 احترافية بالصوت المتزامن من صور المنتجات.',
      model: 'Google Veo 3.1',
      status: 'ACTIVE',
      badge: 'Veo 3.1 Audio',
    },
    {
      id: 'inventory-pricing-agent',
      slug: 'inventory-pricing-agent',
      name: 'مساعد المخزون والتسعير',
      role: 'INVENTORY_PRICING',
      icon: '📊',
      description: 'مراقبة نفاد المخزون، اقتراح عروض الكميات، وحساب هوامش الربح.',
      model: 'DeepSeek-V3',
      status: 'ACTIVE',
      badge: 'Live ERP Stock',
    },
  ];

  return { success: true, agents: squadAgents };
});

ipcMain.handle(IPC_CHANNELS.GET_PRODUCTS, async () => {
  const serverUrl = store.get('serverUrl', 'https://maxp.online');
  const token = loadAuthToken();
  if (!token) return { success: false, error: 'Unauthorized' };

  try {
    const res = await axios.get(`${serverUrl}/api/v1/products`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 50 },
    });
    const items = res.data?.products || res.data?.data || [];
    const products: StoreProduct[] = items.map((p: any) => ({
      id: String(p.id),
      name: p.name || p.title || 'منتج',
      sku: p.sku || '',
      price: Number(p.price || 0),
      stock: Number(p.stock || p.quantity || 0),
      imageUrl: p.imageUrl || p.image || '',
      category: p.category || '',
    }));
    return { success: true, products };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'تعذر جلب المنتجات',
      products: [],
    };
  }
});

ipcMain.handle(IPC_CHANNELS.SEND_AGENT_MESSAGE, async (_, { agentSlug, agentId, message, product, productId, screenContext }) => {
  const serverUrl = store.get('serverUrl', 'https://maxp.online');
  const token = loadAuthToken();
  const user: any = store.get('user');
  const companyId = user?.companyId;

  if (!token) {
    return { success: false, error: 'انتهت الجلسة، يرجى إعادة تسجيل الدخول.' };
  }

  try {
    // 1. Media Buyer / Marketing Agent
    const isMarketingAgent = 
      agentSlug === 'facebook-media-buyer-agent' || 
      agentSlug?.includes('media_buyer') || 
      agentSlug?.includes('facebook') ||
      agentSlug?.includes('marketing');

    if (isMarketingAgent) {
      const payload: any = {
        message,
        threadId: `desktop_copilot_${companyId || 'company'}`,
      };

      if (agentId && !agentId.startsWith('facebook-media-buyer')) {
        payload.agentId = agentId;
      }

      if (product) {
        payload.activeProduct = {
          id: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          sku: product.sku,
        };
      } else if (productId) {
        payload.activeProduct = { id: productId };
      }

      if (screenContext) {
        payload.screenContext = screenContext;
      }

      console.log('[DesktopBridge] Forwarding message to /facebook-ads/ai/chat:', { message, activeProduct: payload.activeProduct });

      const res = await axios.post(
        `${serverUrl}/api/v1/facebook-ads/ai/chat`,
        payload,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        }
      );

      const data = res.data;
      if (!data?.success && data?.error) {
        return {
          success: false,
          text: data.error,
        };
      }

      // Extract real card if tools were called or draft generated
      let card: any = null;
      const toolCalls = data.tool_calls || data.toolCalls || [];
      const draftTool = toolCalls.find((t: any) => 
        (t.name || t.tool) === 'facebook_ad_create_full_draft' || 
        (t.name || t.tool) === 'facebook_ad_analyze_product'
      );

      if (draftTool) {
        const args = draftTool.arguments || draftTool.args || {};
        card = {
          type: 'CAMPAIGN_DRAFT',
          data: {
            draftId: data.draft_id || args.draft_id,
            productName: args.product_name || product?.name || 'المنتج المحدد',
            headline: args.headline || args.ad_copy || 'حملة إعلانية مقترحة',
            budgetAmount: args.daily_budget || args.budget || 350,
            targetAudience: Array.isArray(args.target_locations) 
              ? `${args.target_locations.join('، ')} (18-45)` 
              : 'مصر • متسوقون متفاعلون أونلاين',
            angleTitle: args.angle || args.concept || 'عرض القيمة المباشر مع شحن سريع',
          }
        };
      }

      return {
        success: true,
        text: data.reply || 'تم استلام رد الوكيل بنجاح.',
        card,
        telemetry: data.telemetry || {
          model: 'DeepSeek-V3',
          latencyMs: 640,
          tokensUsed: Math.round(message.length / 3),
        },
      };
    }

    // 2. Central Store AI Agent (CEO / Ops / Inventory / Support)
    console.log('[DesktopBridge] Forwarding message to /ai/chat/message:', { message });
    const res = await axios.post(
      `${serverUrl}/api/v1/ai/chat/message`,
      {
        message,
        sessionId: `desktop_session_${companyId || 'company'}_${agentSlug || 'general'}`,
      },
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );

    const data = res.data;
    if (data?.success) {
      return {
        success: true,
        text: data.reply || 'تم استلام الرد بنجاح.',
        telemetry: {
          model: data.modelSelection?.model || data.agentInfo?.name || 'MaxP AI Core',
          latencyMs: 500,
          tokensUsed: Math.round(message.length / 3),
        },
      };
    } else {
      return {
        success: false,
        text: data?.error || 'تعذر معالجة الطلب في خادم الذكاء الاصطناعي.',
      };
    }
  } catch (err: any) {
    console.error('[DesktopBridge] Error calling platform agent endpoint:', err.response?.data || err.message);
    const errorMsg = 
      err.response?.data?.error || 
      err.response?.data?.message || 
      err.message || 
      'تعذر الاتصال بالسيرفر السحابي';
    
    return {
      success: false,
      text: `⚠️ لم يتمكن الوكيل من الرد: ${errorMsg}`,
      telemetry: {
        model: 'MaxP Cloud Engine',
        latencyMs: 0,
        status: 'ERROR',
      }
    };
  }
});

ipcMain.handle(IPC_CHANNELS.TRIGGER_ACTION, async (_, { action, payload }) => {
  const serverUrl = store.get('serverUrl', 'https://maxp.online');
  const token = loadAuthToken();

  try {
    if (action === 'publish_meta_draft') {
      const draftId = payload?.draftId || payload?.id;
      if (!draftId) {
        return { success: false, message: 'رقم المسودة غير موجود لنشرها.' };
      }

      const res = await axios.post(
        `${serverUrl}/api/v1/facebook-ads/ai/drafts/${draftId}/publish`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return { 
        success: true, 
        message: res.data?.message || 'تم نشر الحملة الإعلانية بنجاح إلى حساب إعلانات فيسبوك!' 
      };
    }

    const res = await axios.post(
      `${serverUrl}/api/v1/facebook-ads/ai/actions/${action}`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: true, result: res.data };
  } catch (err: any) {
    const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
    return { 
      success: false, 
      message: `تعذر تنفيذ الإجراء: ${errorMsg}` 
    };
  }
});

// Auto-Updater Handlers
ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, async () => {
  try {
    const res = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: res?.updateInfo };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.QUIT_AND_INSTALL, () => {
  autoUpdater.quitAndInstall();
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
