import type { AppUsageRecord, WebUsageRecord, AppCategory, CategoryRule } from '../shared/types';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { activityTracker } from './activityTracker';

/** Extracts domain from a URL string */
function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Checks if a window title likely contains a URL (browser detection) */
function extractUrlFromTitle(title: string): string | null {
  const urlMatch = title.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
}

/**
 * Privacy: window/page titles are uploaded for work-context recognition only.
 * Cap length and strip personal patterns (emails, long digit runs) before anything
 * is stored in the local queue or synced to the server.
 */
function redactTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let t = String(raw);
  t = t.replace(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g, '…'); // email addresses
  t = t.replace(/\d{7,}/g, '…');                     // long digit runs (phones, order ids)
  t = t.replace(/\s{2,}/g, ' ').trim();
  if (t.length > 80) t = t.slice(0, 80).trimEnd() + '…';
  return t || null;
}

/** Known browsers for URL extraction */
const BROWSER_PROCESSES = new Set([
  'chrome', 'google chrome', 'chromium', 'msedge', 'microsoft edge',
  'firefox', 'mozilla firefox', 'safari', 'opera', 'brave', 'vivaldi', 'arc',
]);

function isBrowser(appName: string): boolean {
  return BROWSER_PROCESSES.has(appName.toLowerCase());
}

/** Top services recognition dictionary from tab titles */
const TITLE_DOMAIN_MAP: [RegExp, string][] = [
  // Meetings & Collaboration
  [/Google Meet/i, 'meet.google.com'],
  [/Zoom/i, 'zoom.us'],
  [/Microsoft Teams/i, 'teams.microsoft.com'],
  [/Slack/i, 'slack.com'],
  [/Discord/i, 'discord.com'],

  // MaxP Platform & Workspaces
  [/MaxP/i, 'maxp.online'],

  // E-Commerce & Merchant Platforms (Regional & Global)
  [/Salla|سلة/i, 'salla.sa'],
  [/Zid|زد/i, 'zid.sa'],
  [/Shopify/i, 'shopify.com'],
  [/WooCommerce/i, 'woocommerce.com'],
  [/Amazon|أمازون/i, 'amazon.com'],
  [/Noon|نون/i, 'noon.com'],
  [/Jumia|جوميا/i, 'jumia.com.eg'],

  // Ad Networks & Marketing Managers
  [/Ads Manager|Meta Business|Business Suite|Facebook Ads/i, 'business.facebook.com'],
  [/TikTok Ads/i, 'ads.tiktok.com'],
  [/Snapchat Ads|Snap Ads/i, 'ads.snapchat.com'],
  [/Google Ads|AdWords/i, 'ads.google.com'],
  [/LinkedIn Campaign/i, 'linkedin.com'],

  // Shipping & Logistics (MENA)
  [/Bosta|بوسطة/i, 'bosta.co'],
  [/Aramex|أرامكس/i, 'aramex.com'],
  [/Mylerz/i, 'mylerz.com'],

  // AI Engines & Productivity
  [/ChatGPT|OpenAI/i, 'chatgpt.com'],
  [/Claude|Anthropic/i, 'claude.ai'],
  [/Gemini|Google AI/i, 'gemini.google.com'],
  [/Perplexity/i, 'perplexity.ai'],
  [/DeepSeek/i, 'deepseek.com'],

  // Design, Media & Creative
  [/Figma/i, 'figma.com'],
  [/Canva/i, 'canva.com'],
  [/Behance/i, 'behance.net'],
  [/Dribbble/i, 'dribbble.com'],
  [/Freepik/i, 'freepik.com'],
  [/Midjourney/i, 'midjourney.com'],
  [/Adobe/i, 'adobe.com'],

  // Developer, Cloud & Project Tools
  [/GitHub/i, 'github.com'],
  [/GitLab/i, 'gitlab.com'],
  [/Stack Overflow/i, 'stackoverflow.com'],
  [/Vercel/i, 'vercel.com'],
  [/Supabase/i, 'supabase.com'],
  [/AWS|Amazon Web Services/i, 'aws.amazon.com'],
  [/DigitalOcean/i, 'digitalocean.com'],
  [/Linear/i, 'linear.app'],
  [/Jira/i, 'atlassian.net'],
  [/Trello/i, 'trello.com'],
  [/Asana/i, 'asana.com'],
  [/ClickUp/i, 'clickup.com'],
  [/Monday\.com/i, 'monday.com'],
  [/Notion/i, 'notion.so'],
  [/Google (Docs|Sheets|Slides|Drive)/i, 'docs.google.com'],
  [/WhatsApp/i, 'web.whatsapp.com'],
  [/Telegram/i, 'web.telegram.org'],
  [/LinkedIn/i, 'linkedin.com'],
  [/Gmail/i, 'mail.google.com'],
  [/Outlook/i, 'outlook.live.com'],

  // Social & Entertainment (General Browsing)
  [/YouTube/i, 'youtube.com'],
  [/Facebook/i, 'facebook.com'],
  [/Instagram/i, 'instagram.com'],
  [/TikTok/i, 'tiktok.com'],
  [/Twitter|\bX\.com\b|\s\/\sX$/i, 'x.com'],
  [/Reddit/i, 'reddit.com'],
  [/Netflix/i, 'netflix.com'],
  [/Twitch/i, 'twitch.tv'],
];

function isMeeting(appName: string, title: string): boolean {
  const lowerApp = appName.toLowerCase();
  const lowerTitle = title.toLowerCase();
  return (
    lowerApp.includes('zoom') ||
    lowerApp.includes('teams') ||
    lowerApp.includes('webex') ||
    lowerApp.includes('slack') ||
    lowerTitle.includes('meet.google.com') ||
    lowerTitle.includes('google meet') ||
    lowerTitle.includes('zoom meeting')
  );
}

/**
 * Tracks the currently active window/application and websites.
 * Uses native Win32 helper (maxp-win-tracker.exe) for 100% reliable tracking on Windows.
 */
export class WindowTracker {
  private isTracking = false;
  private pollIntervalMs = 5000;
  private currentApp: AppUsageRecord | null = null;
  private currentWeb: WebUsageRecord | null = null;
  private appRecords: AppUsageRecord[] = [];
  private webRecords: WebUsageRecord[] = [];
  private categoryRules: CategoryRule[] = [];
  private getActiveWin: (() => Promise<any>) | null = null;
  private nativeProcess: ChildProcess | null = null;
  private lineBuffer = '';

  get currentAppName(): string | null {
    return this.currentApp?.appName ?? null;
  }

  get currentUrl(): string | null {
    return this.currentWeb?.url ?? null;
  }

  setCategories(rules: CategoryRule[]): void {
    this.categoryRules = rules;
  }

  private getNativeHelperPath(): string | null {
    const candidates = [
      path.join((process as any).resourcesPath || '', 'assets', 'maxp-win-tracker.exe'),
      path.resolve(__dirname, '../../../assets/maxp-win-tracker.exe'),
      path.resolve(__dirname, '../../assets/maxp-win-tracker.exe'),
      path.resolve(__dirname, '../assets/maxp-win-tracker.exe'),
      path.resolve(process.cwd(), 'assets/maxp-win-tracker.exe'),
      path.resolve(process.cwd(), 'apps/desktop/assets/maxp-win-tracker.exe'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  private startNativeHelper(): boolean {
    const exePath = this.getNativeHelperPath();
    if (!exePath) {
      console.warn('[WindowTracker] maxp-win-tracker.exe not found on disk');
      return false;
    }

    try {
      console.log(`[WindowTracker] Spawning native helper: ${exePath}`);
      this.nativeProcess = spawn(exePath, ['--parent', String(process.pid)], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
      });

      this.nativeProcess.stdout?.setEncoding('utf8');
      this.nativeProcess.stdout?.on('data', (chunk: string) => {
        this.lineBuffer += chunk;
        const lines = this.lineBuffer.split(/\r?\n/);
        this.lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const win = JSON.parse(trimmed);
            if (win && (win.title !== undefined || win.owner)) {
              this.processWindow(win);
            }
          } catch {}
        }
      });

      this.nativeProcess.on('exit', (code) => {
        console.log(`[WindowTracker] Native helper exited with code ${code}`);
        this.nativeProcess = null;
        if (this.isTracking) {
          setTimeout(() => {
            if (this.isTracking) this.startNativeHelper();
          }, 3000);
        }
      });

      this.nativeProcess.on('error', (err) => {
        console.warn('[WindowTracker] Native helper spawn error:', err.message);
        this.nativeProcess = null;
      });

      return true;
    } catch (err: any) {
      console.warn('[WindowTracker] Error launching native helper:', err.message);
      return false;
    }
  }

  private async initFallbackActiveWin(): Promise<void> {
    try {
      const mod: any = await import('active-win');
      if (typeof mod.activeWindow === 'function') {
        this.getActiveWin = mod.activeWindow;
      } else if (typeof mod.default === 'function') {
        this.getActiveWin = mod.default;
      } else if (typeof mod === 'function') {
        this.getActiveWin = mod;
      }
    } catch (err: any) {
      console.warn('[WindowTracker] active-win optional load notice:', err.message);
    }
  }

  async start(): Promise<void> {
    if (this.isTracking) return;
    this.isTracking = true;

    if (process.platform === 'win32') {
      const spawned = this.startNativeHelper();
      if (!spawned) {
        await this.initFallbackActiveWin();
        this.poll();
      }
    } else {
      await this.initFallbackActiveWin();
      this.poll();
    }
  }

  stop(): void {
    this.isTracking = false;
    if (this.nativeProcess) {
      try {
        this.nativeProcess.kill();
      } catch {}
      this.nativeProcess = null;
    }
    this.finalizeCurrentApp();
    this.finalizeCurrentWeb();
  }

  /**
   * Flush all accumulated records since last call.
   */
  flushRecords(): { apps: AppUsageRecord[]; websites: WebUsageRecord[] } {
    const now = new Date().toISOString();

    const apps = [...this.appRecords];
    if (this.currentApp) {
      const dur = this.calcDuration(this.currentApp.startedAt, now);
      if (dur > 0) {
        apps.push({
          ...this.currentApp,
          endedAt: now,
          durationSeconds: dur,
        });
        // Reset startedAt to now so duration continues seamlessly
        this.currentApp.startedAt = now;
      }
    }

    const websites = [...this.webRecords];
    if (this.currentWeb) {
      const dur = this.calcDuration(this.currentWeb.startedAt, now);
      if (dur > 0) {
        websites.push({
          ...this.currentWeb,
          endedAt: now,
          durationSeconds: dur,
        });
        this.currentWeb.startedAt = now;
      }
    }

    this.appRecords = [];
    this.webRecords = [];

    return { apps, websites };
  }

  private async poll(): Promise<void> {
    if (!this.isTracking || this.nativeProcess) return;

    let idleSec = 0;
    try {
      idleSec = activityTracker.idleSeconds || 0;
    } catch {}

    if (idleSec >= this.IDLE_GAP_SEC) {
      if (!this.idleGapActive) {
        this.idleGapActive = true;
        const gapStart = new Date(Date.now() - idleSec * 1000);
        this.finalizeCurrentApp(gapStart);
        this.finalizeCurrentWeb(gapStart);
      }
      setTimeout(() => this.poll(), this.pollIntervalMs);
      return;
    }
    this.idleGapActive = false;

    try {
      let win: any = null;
      if (this.getActiveWin) {
        win = await this.getActiveWin();
      }
      if (win) {
        this.processWindow(win);
      }
    } catch {}

    setTimeout(() => this.poll(), this.pollIntervalMs);
  }

  private meetingActive = false;

  // Idle-aware accrual state
  private idleGapActive = false;
  private readonly IDLE_GAP_SEC = 120;

  get isMeetingActive(): boolean {
    return this.meetingActive;
  }

  private friendlyAppName(raw: string, exePath?: string): string {
    const lower = (raw || '').toLowerCase().replace(/\.exe$/, '').trim();

    // UWP/store apps all surface as ApplicationFrameHost — resolve the real
    // app from its executable path when the helper reports one.
    if (lower === 'applicationframehost') {
      if (exePath) {
        const base = path.basename(exePath).replace(/\.exe$/i, '').trim();
        if (base && base.toLowerCase() !== 'applicationframehost') {
          const mapped = this.APP_NAME_MAP[base.toLowerCase()];
          return mapped || base;
        }
      }
      return 'تطبيق ويندوز';
    }
    return this.APP_NAME_MAP[lower] || raw || 'تطبيق غير محدد';
  }

  private get APP_NAME_MAP(): Record<string, string> {
    return {
      chrome: 'Google Chrome',
      msedge: 'Microsoft Edge',
      firefox: 'Mozilla Firefox',
      opera: 'Opera',
      brave: 'Brave Browser',
      code: 'Visual Studio Code',
      slack: 'Slack',
      teams: 'Microsoft Teams',
      'ms-teams': 'Microsoft Teams',
      zoom: 'Zoom Meeting',
      explorer: 'سطح المكتب / مستكشف ويندوز',
      notepad: 'المفكرة (Notepad)',
      excel: 'Microsoft Excel',
      winword: 'Microsoft Word',
      powerpnt: 'Microsoft PowerPoint',
      outlook: 'Microsoft Outlook',
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
      discord: 'Discord',
      figma: 'Figma',
      photoshop: 'Adobe Photoshop',
      illustrator: 'Adobe Illustrator',
    };
  }

  private processWindow(win: any): void {
    const rawName = win.owner?.name || win.title || 'Unknown';
    const appName = this.friendlyAppName(rawName, win.owner?.exePath);
    // Privacy: detection runs on the raw title; only the redacted copy is stored/synced
    const rawTitle = win.title || '';
    const windowTitle = redactTitle(rawTitle) ?? '';
    const now = new Date().toISOString();

    // ── Meeting detection & collaboration guard ─────────────────
    this.meetingActive = isMeeting(rawName, rawTitle);
    activityTracker.setMeetingActive(this.meetingActive);

    // ── App tracking ────────────────────────────────────────────
    if (!this.currentApp || this.currentApp.appName !== appName) {
      this.finalizeCurrentApp();
      this.currentApp = {
        appName,
        windowTitle,
        startedAt: now,
        endedAt: null,
        durationSeconds: 0,
        category: this.meetingActive ? 'productive' : this.categorize(appName, 'app'),
      };
    } else {
      // Same app, update title if changed
      this.currentApp.windowTitle = windowTitle;
      if (this.meetingActive) {
        this.currentApp.category = 'productive';
      }
    }

    // ── Website tracking (if browser) ───────────────────────────
    if (isBrowser(rawName)) {
      const url = extractUrlFromTitle(rawTitle);
      const domain = url ? extractDomain(url) : this.extractDomainFromTitle(rawTitle);

      if (!domain) {
        // Unknown/unrecognized site: close the current record instead of
        // leaking browsing time into the previously known domain.
        this.finalizeCurrentWeb();
      } else if (!this.currentWeb || this.currentWeb.domain !== domain) {
        this.finalizeCurrentWeb();
        this.currentWeb = {
          url: url || `https://${domain}`,
          domain,
          pageTitle: windowTitle,
          startedAt: now,
          endedAt: null,
          durationSeconds: 0,
          category: this.meetingActive ? 'productive' : this.categorize(domain, 'website'),
        };
      }
    } else {
      // Not a browser, finalize any web record
      this.finalizeCurrentWeb();
    }
  }

  private finalizeCurrentApp(endedAt?: Date): void {
    if (!this.currentApp) return;
    const now = (endedAt ?? new Date()).toISOString();
    this.currentApp.endedAt = now;
    this.currentApp.durationSeconds = this.calcDuration(this.currentApp.startedAt, now);

    // Only keep records with > 2 seconds duration
    if (this.currentApp.durationSeconds > 2) {
      this.appRecords.push({ ...this.currentApp });
    }
    this.currentApp = null;
  }

  private finalizeCurrentWeb(endedAt?: Date): void {
    if (!this.currentWeb) return;
    const now = (endedAt ?? new Date()).toISOString();
    this.currentWeb.endedAt = now;
    this.currentWeb.durationSeconds = this.calcDuration(this.currentWeb.startedAt, now);

    if (this.currentWeb.durationSeconds > 2) {
      this.webRecords.push({ ...this.currentWeb });
    }
    this.currentWeb = null;
  }

  private categorize(name: string, type: 'app' | 'website'): AppCategory {
    const lower = name.toLowerCase();
    const rule = this.categoryRules.find(
      (r) => r.type === type && lower.includes(r.name.toLowerCase())
    );
    if (rule) return rule.category;

    // Default categorization
    return this.defaultCategory(lower, type);
  }

  private defaultCategory(name: string, type: 'app' | 'website'): AppCategory {
    // Productive defaults
    const productiveApps = ['code', 'visual studio', 'intellij', 'webstorm', 'terminal',
      'cmd', 'powershell', 'excel', 'word', 'powerpoint', 'figma', 'photoshop',
      'illustrator', 'slack', 'teams', 'outlook', 'postman', 'datagrip', 'pgadmin', 'zoom', 'webex'];
    const productiveSites = ['github.com', 'gitlab.com', 'stackoverflow.com', 'maxp.online',
      'docs.google.com', 'notion.so', 'linear.app', 'jira.', 'confluence.', 'meet.google.com', 'zoom.us'];

    const unproductiveApps = ['game', 'steam', 'epic games', 'discord'];
    const unproductiveSites = ['facebook.com', 'instagram.com', 'tiktok.com', 'twitter.com',
      'x.com', 'reddit.com', 'netflix.com', 'youtube.com', 'twitch.tv'];

    const list = type === 'app'
      ? { prod: productiveApps, unprod: unproductiveApps }
      : { prod: productiveSites, unprod: unproductiveSites };

    if (list.prod.some((p) => name.includes(p))) return 'productive';
    if (list.unprod.some((p) => name.includes(p))) return 'unproductive';
    return 'unrated';
  }

  private extractDomainFromTitle(title: string): string | null {
    if (!title || typeof title !== 'string') return null;

    // 1. Match against known high-traffic web platforms and SaaS services
    for (const [regex, domain] of TITLE_DOMAIN_MAP) {
      if (regex.test(title)) {
        return domain;
      }
    }

    // 2. Direct embedded domain detection in title (e.g. "my-store.com", "app.example.io")
    const domainMatch = title.match(/\b([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.(?:com|org|net|io|sa|eg|ae|app|ai|me|co|dev|tech|store|shop))\b/i);
    if (domainMatch && domainMatch[1]) {
      return domainMatch[1].toLowerCase();
    }

    // 3. Fallback: extract site or brand from browser title segments
    const separators = [' - ', ' — ', ' | ', ' · ', ' • '];
    for (const sep of separators) {
      if (title.includes(sep)) {
        let parts = title.split(sep).map((s) => s.trim()).filter(Boolean);
        // Remove trailing browser name if present
        if (parts.length > 1) {
          const lastPart = parts[parts.length - 1].toLowerCase();
          if (
            lastPart.includes('chrome') ||
            lastPart.includes('edge') ||
            lastPart.includes('firefox') ||
            lastPart.includes('opera') ||
            lastPart.includes('brave')
          ) {
            parts.pop();
          }
        }
        if (parts.length >= 1) {
          const siteCandidate = parts[parts.length - 1];
          // If it has domain format (e.g. store.eg, portal.co)
          if (siteCandidate.includes('.') && !siteCandidate.includes(' ')) {
            return siteCandidate.toLowerCase();
          }
          // If valid site name (Arabic or English), return it as a tracked site label
          if (siteCandidate.length >= 2 && siteCandidate.length <= 40) {
            return siteCandidate;
          }
        }
      }
    }

    // 4. Ultimate browser fallback: strip browser suffix and return clean page title
    const cleanTitle = title
      .replace(/\s*-\s*(Google Chrome|Microsoft Edge|Mozilla Firefox|Opera|Brave Browser|Brave|Vivaldi|Arc)$/i, '')
      .trim();
    if (cleanTitle && cleanTitle.length >= 2 && cleanTitle.length <= 40) {
      return cleanTitle;
    }

    return null;
  }

  private calcDuration(start: string, end: string): number {
    return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  }
}

export const windowTracker = new WindowTracker();
