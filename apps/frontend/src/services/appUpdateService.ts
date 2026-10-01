/**
 * MaxP Android App Update Service
 * Handles version inspection, SemVer comparisons, mandatory update enforcement,
 * and APK download redirection for the Android application.
 */

import { isCapacitorNative } from '../config/environment';

export interface AppVersionInfo {
  platform: string;
  appName?: string;
  appId?: string;
  latestVersion: string;
  latestVersionCode?: number;
  minRequiredVersion?: string;
  minRequiredVersionCode?: number;
  forceUpdate: boolean;
  downloadUrl: string;
  directApkUrl?: string;
  storeUrl?: string;
  releaseNotesAr?: string;
  releaseNotesEn?: string;
  releaseDate?: string;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  featuresAr?: string[];
  featuresEn?: string[];
  isEnabled?: boolean;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  isMandatory: boolean;
  currentVersion: string;
  currentVersionCode: number;
  versionInfo: AppVersionInfo | null;
  error?: string | null;
}

const DEFAULT_CURRENT_VERSION = '1.0.8';
const DEFAULT_CURRENT_BUILD = 8;
const DISMISSED_UPDATE_KEY = 'maxp_dismissed_update';
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours snooze for optional updates

/**
 * Parses and compares two SemVer strings (e.g. "1.0.7" vs "1.0.8" or "1.1").
 * Returns:
 *  -1 if v1 < v2
 *   0 if v1 === v2
 *   1 if v1 > v2
 */
export function compareSemver(v1: string, v2: string): number {
  const cleanV1 = (v1 || '').replace(/^[vV]/, '').trim();
  const cleanV2 = (v2 || '').replace(/^[vV]/, '').trim();

  // Split off any pre-release suffix (-alpha, -beta, etc.)
  const baseV1 = cleanV1.split('-')[0].split('+')[0];
  const baseV2 = cleanV2.split('-')[0].split('+')[0];

  const parts1 = baseV1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = baseV2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length, 3);
  while (parts1.length < maxLength) parts1.push(0);
  while (parts2.length < maxLength) parts2.push(0);

  for (let i = 0; i < maxLength; i++) {
    if (parts1[i] < parts2[i]) return -1;
    if (parts1[i] > parts2[i]) return 1;
  }

  return 0;
}

/**
 * Checks whether the current runtime is an Android native Capacitor app,
 * or if manual testing override is enabled in dev.
 */
export function isAndroidAppEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  // Development/QA debug testing override: ?test_android_update=1 or localStorage
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test_android_update') === '1' || window.localStorage?.getItem('test_android_update') === 'true') {
      return true;
    }
  } catch {}

  const win = window as any;
  const isCapacitor = isCapacitorNative() || Boolean(win.Capacitor?.isNativePlatform?.());
  if (!isCapacitor) return false;

  const platform = win.Capacitor?.getPlatform?.();
  if (platform === 'android') return true;

  const userAgent = window.navigator?.userAgent || '';
  return /android/i.test(userAgent);
}

/**
 * Retrieves the current installed app info via Capacitor App plugin or default fallback.
 */
export async function getCurrentAppVersion(): Promise<{ version: string; build: number }> {
  const win = window as any;

  if (typeof win !== 'undefined' && win.Capacitor?.Plugins?.App?.getInfo) {
    try {
      const info = await win.Capacitor.Plugins.App.getInfo();
      const version = (info.version || DEFAULT_CURRENT_VERSION).trim();
      const build = parseInt(info.build, 10) || DEFAULT_CURRENT_BUILD;
      return { version, build };
    } catch (e) {
      console.warn('⚠️ [APP-UPDATE] Failed to read version from Capacitor.Plugins.App.getInfo:', e);
    }
  }

  return {
    version: DEFAULT_CURRENT_VERSION,
    build: DEFAULT_CURRENT_BUILD,
  };
}

/**
 * Fetches the latest published Android version metadata from backend or static fallback.
 */
export async function fetchLatestAndroidVersion(): Promise<AppVersionInfo> {
  const urls = [
    'https://maxp.online/api/v1/app/version/android',
    '/api/v1/app/version/android',
    'https://maxp.online/download/latest-android.json',
    '/download/latest-android.json',
    '/latest-android.json',
  ];

  let lastError: any = null;

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const payload = await response.json();
        const data: AppVersionInfo = payload.data || payload;
        if (data && data.latestVersion) {
          return data;
        }
      }
    } catch (err) {
      lastError = err;
      // Continue to next fallback URL
    }
  }

  throw lastError || new Error('تعذر الوصول إلى معلومات التحديث من الخادم.');
}

/**
 * Performs a comprehensive check for updates.
 */
export async function checkAppUpdate(options?: {
  forceCheck?: boolean;
}): Promise<UpdateCheckResult> {
  const current = await getCurrentAppVersion();

  try {
    const versionInfo = await fetchLatestAndroidVersion();

    if (versionInfo.isEnabled === false) {
      return {
        hasUpdate: false,
        isMandatory: false,
        currentVersion: current.version,
        currentVersionCode: current.build,
        versionInfo,
      };
    }

    const versionDiff = compareSemver(current.version, versionInfo.latestVersion);
    const codeDiff = (versionInfo.latestVersionCode || 0) > current.build;
    const hasUpdate = versionDiff < 0 || codeDiff;

    let isMandatory = Boolean(versionInfo.forceUpdate);

    // If current version is below the minimum required version, enforce update
    if (versionInfo.minRequiredVersion) {
      if (compareSemver(current.version, versionInfo.minRequiredVersion) < 0) {
        isMandatory = true;
      }
    }

    // If current build code is below minimum required build code, enforce update
    if (versionInfo.minRequiredVersionCode && current.build < versionInfo.minRequiredVersionCode) {
      isMandatory = true;
    }

    return {
      hasUpdate,
      isMandatory,
      currentVersion: current.version,
      currentVersionCode: current.build,
      versionInfo,
    };
  } catch (error: any) {
    console.warn('⚠️ [APP-UPDATE] Check update failed:', error?.message || error);
    return {
      hasUpdate: false,
      isMandatory: false,
      currentVersion: current.version,
      currentVersionCode: current.build,
      versionInfo: null,
      error: error?.message || 'فشل الاتصال بخادم التحديثات',
    };
  }
}

/**
 * Determines whether the update dialog should be displayed to the user.
 * Mandatory updates are NEVER suppressed.
 * Optional updates can be snoozed for 24 hours.
 */
export function shouldShowUpdateModal(result: UpdateCheckResult): boolean {
  if (!result.hasUpdate || !result.versionInfo) {
    return false;
  }

  // Mandatory updates MUST always be shown immediately
  if (result.isMandatory) {
    return true;
  }

  // Check snooze record for optional updates
  try {
    const raw = window.localStorage?.getItem(DISMISSED_UPDATE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.version === result.versionInfo.latestVersion) {
        const timePassed = Date.now() - (data.dismissedAt || 0);
        if (timePassed < SNOOZE_DURATION_MS) {
          return false; // Snoozed
        }
      }
    }
  } catch {}

  return true;
}

/**
 * Snooze an optional update for 24 hours.
 */
export function snoozeUpdate(version: string): void {
  try {
    window.localStorage?.setItem(
      DISMISSED_UPDATE_KEY,
      JSON.stringify({
        version,
        dismissedAt: Date.now(),
      })
    );
  } catch {}
}

/**
 * Clear any existing snooze.
 */
export function clearUpdateSnooze(): void {
  try {
    window.localStorage?.removeItem(DISMISSED_UPDATE_KEY);
  } catch {}
}

/**
 * Opens the APK download URL or redirects the Android system to initiate download.
 */
export function openUpdateDownload(targetUrl?: string): void {
  const url = targetUrl || 'https://maxp.online/download/maxp.apk';
  const win = window as any;

  // 1. If in Capacitor, open via system browser/download manager
  if (typeof win !== 'undefined' && win.Capacitor?.isNativePlatform?.()) {
    try {
      // '_system' directs Android to open the default browser or Android Download Manager
      win.open(url, '_system');
      return;
    } catch {}
  }

  // 2. Fallback: create temporary download link
  try {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'MaxP.apk');
    link.setAttribute('target', '_blank');
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    window.location.href = url;
  }
}

/**
 * Exits the Android application safely when mandatory update is refused/cancelled.
 */
export function exitAndroidApp(): void {
  const win = window as any;
  if (typeof win !== 'undefined' && win.Capacitor?.Plugins?.App?.exitApp) {
    try {
      win.Capacitor.Plugins.App.exitApp();
      return;
    } catch {}
  }
  // Fallback in web/preview
  window.close();
}
