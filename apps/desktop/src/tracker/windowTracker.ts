import type { AppUsageRecord, WebUsageRecord, AppCategory, CategoryRule } from '../shared/types';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

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
  // Common browser patterns: "Page Title - Google Chrome", "Page Title - Mozilla Firefox"
  // Some browsers show URL in title
  const urlMatch = title.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
}

/** Known browsers for URL extraction */
const BROWSER_PROCESSES = new Set([
  'chrome', 'google chrome', 'chromium', 'msedge', 'microsoft edge',
  'firefox', 'mozilla firefox', 'safari', 'opera', 'brave', 'vivaldi', 'arc',
]);

function isBrowser(appName: string): boolean {
  return BROWSER_PROCESSES.has(appName.toLowerCase());
}

/**
 * Tracks the currently active window/application and websites.
 * Uses `active-win` to detect the foreground app every few seconds.
 */
export class WindowTracker {
  private isTracking = false;
  private pollIntervalMs = 5000; // Check every 5 seconds
  private currentApp: AppUsageRecord | null = null;
  private currentWeb: WebUsageRecord | null = null;
  private appRecords: AppUsageRecord[] = [];
  private webRecords: WebUsageRecord[] = [];
  private categoryRules: CategoryRule[] = [];
  private getActiveWin: (() => Promise<any>) | null = null;

  get currentAppName(): string | null {
    return this.currentApp?.appName ?? null;
  }

  get currentUrl(): string | null {
    return this.currentWeb?.url ?? null;
  }

  setCategories(rules: CategoryRule[]): void {
    this.categoryRules = rules;
  }

  async start(): Promise<void> {
    if (this.isTracking) return;
    this.isTracking = true;

    try {
      const mod: any = await import('active-win');
      this.getActiveWin = mod.default ?? mod.activeWindow ?? mod;
    } catch (err: any) {
      console.warn('[WindowTracker] active-win optional load notice:', err.message);
    }

    // Always start polling! On Windows, native GetActiveWindow takes precedence.
    this.poll();
  }

  stop(): void {
    this.isTracking = false;
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

  private getWindowsActiveWindow(): { appName: string; windowTitle: string } | null {
    try {
      const exeName = 'GetActiveWindow.exe';
      const devPath = path.resolve(__dirname, '../../../bin', exeName);
      const prodPath = path.resolve(process.resourcesPath || '', 'bin', exeName);
      const asarUnpackedPath = path.resolve(process.resourcesPath || '', 'app.asar.unpacked', 'bin', exeName);
      const appPath = path.resolve(__dirname, '../../bin', exeName);

      const resolvedPath = fs.existsSync(prodPath)
        ? prodPath
        : fs.existsSync(asarUnpackedPath)
        ? asarUnpackedPath
        : fs.existsSync(devPath)
        ? devPath
        : fs.existsSync(appPath)
        ? appPath
        : null;

      if (!resolvedPath) return null;

      const out = execFileSync(resolvedPath, { timeout: 1500, encoding: 'utf8' }).trim();
      if (out && out.includes('|||')) {
        const [proc, title] = out.split('|||');
        return {
          appName: proc.trim(),
          windowTitle: title.trim(),
        };
      }
    } catch {}
    return null;
  }

  private async poll(): Promise<void> {
    if (!this.isTracking) return;

    try {
      let win: any = null;

      // 1. Try ultra-fast native Windows detector
      if (process.platform === 'win32') {
        const nativeWin = this.getWindowsActiveWindow();
        if (nativeWin && nativeWin.appName && nativeWin.appName !== 'Unknown') {
          win = {
            title: nativeWin.windowTitle,
            owner: { name: nativeWin.appName },
          };
        }
      }

      // 2. Fallback to active-win if needed
      if (!win && this.getActiveWin) {
        win = await this.getActiveWin();
      }

      if (win) {
        this.processWindow(win);
      }
    } catch {}

    setTimeout(() => this.poll(), this.pollIntervalMs);
  }

  private processWindow(win: any): void {
    const appName = win.owner?.name || win.title || 'Unknown';
    const windowTitle = win.title || '';
    const now = new Date().toISOString();

    // ── App tracking ────────────────────────────────────────────
    if (!this.currentApp || this.currentApp.appName !== appName) {
      this.finalizeCurrentApp();
      this.currentApp = {
        appName,
        windowTitle,
        startedAt: now,
        endedAt: null,
        durationSeconds: 0,
        category: this.categorize(appName, 'app'),
      };
    } else {
      // Same app, update title if changed
      this.currentApp.windowTitle = windowTitle;
    }

    // ── Website tracking (if browser) ───────────────────────────
    if (isBrowser(appName)) {
      const url = extractUrlFromTitle(windowTitle);
      const domain = url ? extractDomain(url) : this.extractDomainFromTitle(windowTitle);

      if (domain && (!this.currentWeb || this.currentWeb.domain !== domain)) {
        this.finalizeCurrentWeb();
        this.currentWeb = {
          url: url || domain,
          domain,
          pageTitle: windowTitle,
          startedAt: now,
          endedAt: null,
          durationSeconds: 0,
          category: this.categorize(domain, 'website'),
        };
      }
    } else {
      // Not a browser, finalize any web record
      this.finalizeCurrentWeb();
    }
  }

  private finalizeCurrentApp(): void {
    if (!this.currentApp) return;
    const now = new Date().toISOString();
    this.currentApp.endedAt = now;
    this.currentApp.durationSeconds = this.calcDuration(this.currentApp.startedAt, now);

    // Only keep records with > 2 seconds duration
    if (this.currentApp.durationSeconds > 2) {
      this.appRecords.push({ ...this.currentApp });
    }
    this.currentApp = null;
  }

  private finalizeCurrentWeb(): void {
    if (!this.currentWeb) return;
    const now = new Date().toISOString();
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
      'illustrator', 'slack', 'teams', 'outlook', 'postman', 'datagrip', 'pgadmin'];
    const productiveSites = ['github.com', 'gitlab.com', 'stackoverflow.com', 'maxp.online',
      'docs.google.com', 'notion.so', 'linear.app', 'jira.', 'confluence.'];

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
    // Try to extract domain from browser tab title like "GitHub - Google Chrome"
    // This is a fallback when URL is not in the title
    const parts = title.split(' - ');
    if (parts.length < 2) return null;
    // The last part is usually the browser name
    return null; // Can't reliably extract domain from just the title
  }

  private calcDuration(start: string, end: string): number {
    return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  }
}

export const windowTracker = new WindowTracker();
