import { localDb, getLocalDateString } from '../db/localDb';
import { apiClient } from '../shared/api';
import { activityTracker } from './activityTracker';
import { windowTracker } from './windowTracker';
import type { SyncBatch, DeviceInfo } from '../shared/types';
import { app } from 'electron';
import os from 'os';

/**
 * Sync Engine — periodically collects data from trackers,
 * caches it locally, and uploads to the MaxP backend.
 */
export class SyncEngine {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private activityCaptureInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private isSuspended = false;
  private isPaused = false;
  private breakReason: string | null = null;

  private readonly SYNC_INTERVAL_MS = 60_000;           // Sync every 60 seconds
  private readonly HEARTBEAT_INTERVAL_MS = 120_000;      // Heartbeat every 2 minutes
  private readonly ACTIVITY_CAPTURE_MS = 120_000;        // Capture activity every 2 minutes
  private readonly CLEANUP_INTERVAL_MS = 3_600_000;      // Cleanup every hour

  start(): void {
    console.log('[SyncEngine] Starting...');
    this.isSuspended = false;

    // Capture activity intervals every 2 minutes
    this.activityCaptureInterval = setInterval(() => {
      this.captureActivityInterval();
    }, this.ACTIVITY_CAPTURE_MS);

    // Sync to server every 60 seconds
    this.syncInterval = setInterval(() => {
      this.sync();
    }, this.SYNC_INTERVAL_MS);

    // Send heartbeat every 2 minutes
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL_MS);

    // Cleanup old data every hour
    this.cleanupInterval = setInterval(() => {
      localDb.cleanupSynced(48);
    }, this.CLEANUP_INTERVAL_MS);

    // Initial heartbeat
    this.sendHeartbeat();
  }

  setSuspended(suspended: boolean): void {
    this.isSuspended = suspended;
  }

  public flushAndCaptureNow(): void {
    this.captureActivityInterval();
    this.flushWindowData();
    this.sync();
  }

  stop(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.activityCaptureInterval) clearInterval(this.activityCaptureInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.syncInterval = null;
    this.heartbeatInterval = null;
    this.activityCaptureInterval = null;
    this.cleanupInterval = null;

    // Final capture and sync before shutdown
    this.captureActivityInterval();
    this.sync();
    localDb.saveImmediately();
  }

  /** Capture the current activity interval and store locally */
  public captureActivityInterval(): void {
    if (this.isSuspended) return;
    try {
      const interval = activityTracker.captureInterval();
      localDb.queueActivity(interval);

      // Update local daily stats using local date
      const today = getLocalDateString();
      const startMs = new Date(interval.intervalStart).getTime();
      const endMs = new Date(interval.intervalEnd).getTime();
      // Cap interval duration to prevent huge sleep jumps from registering as thousands of idle seconds
      const maxAllowedSec = Math.max(300, Math.floor(this.ACTIVITY_CAPTURE_MS / 1000) * 2);
      const rawIntervalSec = Math.max(1, Math.floor((endMs - startMs) / 1000));
      const intervalSec = Math.min(rawIntervalSec, maxAllowedSec);
      const idleSeconds = Math.max(0, intervalSec - interval.activeSeconds);

      localDb.updateDailyStats(
        today,
        interval.activeSeconds,
        idleSeconds,
        interval.mouseEvents,
        interval.keyboardEvents
      );

      console.log(`[SyncEngine] Captured interval (${today}): active=${interval.activeSeconds}s, idle=${idleSeconds}s, score=${interval.activityScore}%`);
    } catch (err) {
      console.error('[SyncEngine] Failed to capture activity interval:', err);
    }
  }

  /** Flush window tracker data and store locally */
  private flushWindowData(): void {
    try {
      const { apps, websites } = windowTracker.flushRecords();

      for (const record of apps) {
        localDb.queueAppUsage(record);
      }
      for (const record of websites) {
        localDb.queueWebUsage(record);
      }

      if (apps.length > 0 || websites.length > 0) {
        console.log(`[SyncEngine] Flushed ${apps.length} app records, ${websites.length} web records`);
      }
    } catch (err) {
      console.error('[SyncEngine] Failed to flush window data:', err);
    }
  }

  /** Sync pending data to the server */
  async sync(): Promise<void> {
    if (this.isSyncing || !apiClient.isConfigured) return;
    this.isSyncing = true;

    try {
      // First flush window tracker data to local DB
      this.flushWindowData();

      // Get pending data
      const pendingActivities = localDb.getPendingActivities(50);
      const pendingApps = localDb.getPendingApps(50);
      const pendingWebsites = localDb.getPendingWebsites(50);

      if (pendingActivities.length === 0 && pendingApps.length === 0 && pendingWebsites.length === 0) {
        return; // Nothing to sync
      }

      const batch: SyncBatch = {
        activities: pendingActivities.map((r) => r.data),
        apps: pendingApps.map((r) => r.data),
        websites: pendingWebsites.map((r) => r.data),
        timestamp: new Date().toISOString(),
      };

      const result = await apiClient.syncAll(batch);

      if (result.success) {
        // Mark all as synced
        localDb.markSynced('pending_activities', pendingActivities.map((r) => r.id));
        localDb.markSynced('pending_apps', pendingApps.map((r) => r.id));
        localDb.markSynced('pending_websites', pendingWebsites.map((r) => r.id));

        const total = pendingActivities.length + pendingApps.length + pendingWebsites.length;
        console.log(`[SyncEngine] Synced ${total} records successfully`);
      } else {
        console.warn('[SyncEngine] Partial sync failure:', result.errors);
        // Partial success: only mark synced what succeeded
        if (!result.errors.some((e) => e.includes('Activity'))) {
          localDb.markSynced('pending_activities', pendingActivities.map((r) => r.id));
        }
        if (!result.errors.some((e) => e.includes('App'))) {
          localDb.markSynced('pending_apps', pendingApps.map((r) => r.id));
        }
        if (!result.errors.some((e) => e.includes('Web'))) {
          localDb.markSynced('pending_websites', pendingWebsites.map((r) => r.id));
        }
      }
    } catch (err) {
      console.error('[SyncEngine] Sync failed (will retry next interval):', err);
    } finally {
      this.isSyncing = false;
    }
  }

  public setBreakState(isPaused: boolean, reason: string | null = null): void {
    this.isPaused = isPaused;
    this.breakReason = reason;
    this.sendHeartbeat();
  }

  /** Send heartbeat to server */
  public async sendHeartbeat(): Promise<void> {
    if (!apiClient.isConfigured) return;

    try {
      const deviceInfo: DeviceInfo = {
        deviceName: os.hostname(),
        osVersion: `${os.platform()} ${os.release()}`,
        appVersion: app.getVersion(),
        isPaused: this.isPaused,
        breakReason: this.isPaused ? (this.breakReason || 'استراحة رسمية') : null,
      };
      await apiClient.sendHeartbeat(deviceInfo);
    } catch (err) {
      console.error('[SyncEngine] Heartbeat failed:', err);
    }
  }
}

export const syncEngine = new SyncEngine();
