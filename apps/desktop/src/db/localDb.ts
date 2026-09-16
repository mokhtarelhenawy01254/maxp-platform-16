import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import type { ActivityInterval, AppUsageRecord, WebUsageRecord } from '../shared/types';

interface QueueItem<T> {
  id: number;
  data: T;
  created_at: string;
  synced: number;
}

/**
 * Local file-based database for offline caching.
 * Stores activity data locally in userData before syncing to server.
 */
class LocalDatabase {
  private initialized = false;
  private jsonFile = '';
  private nextId = 1;

  private activitiesQueue: QueueItem<ActivityInterval>[] = [];
  private appsQueue: QueueItem<AppUsageRecord>[] = [];
  private websitesQueue: QueueItem<WebUsageRecord>[] = [];
  private dailyStatsMap: Record<string, any> = {};

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  init(): void {
    if (this.initialized) return;
    this.jsonFile = path.join(app.getPath('userData'), 'monitor-cache.json');
    this.loadFromDisk();
    this.initialized = true;
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.jsonFile)) {
        const raw = fs.readFileSync(this.jsonFile, 'utf8');
        const parsed = JSON.parse(raw);
        this.activitiesQueue = parsed.activities || [];
        this.appsQueue = parsed.apps || [];
        this.websitesQueue = parsed.websites || [];
        this.dailyStatsMap = parsed.dailyStats || {};
        this.nextId = parsed.nextId || 1;
      }
    } catch (err: any) {
      console.warn('[LocalDb] Error reading cache file:', err.message);
    }
  }

  public saveImmediately(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveToDisk();
  }

  public scheduleSave(): void {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveToDisk();
    }, 4000); // Debounce write to once every 4 seconds max
  }

  private saveToDisk(): void {
    try {
      if (!this.jsonFile) {
        this.jsonFile = path.join(app.getPath('userData'), 'monitor-cache.json');
      }
      const data = {
        activities: this.activitiesQueue,
        apps: this.appsQueue,
        websites: this.websitesQueue,
        dailyStats: this.dailyStatsMap,
        nextId: this.nextId,
      };
      fs.writeFileSync(this.jsonFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (err: any) {
      console.warn('[LocalDb] Error saving cache to disk:', err.message);
    }
  }

  // ── Queue data for sync ───────────────────────────────────────

  queueActivity(activity: ActivityInterval): void {
    this.activitiesQueue.push({
      id: this.nextId++,
      data: activity,
      created_at: new Date().toISOString(),
      synced: 0,
    });
    this.scheduleSave();
  }

  queueAppUsage(record: AppUsageRecord): void {
    this.appsQueue.push({
      id: this.nextId++,
      data: record,
      created_at: new Date().toISOString(),
      synced: 0,
    });
    this.scheduleSave();
  }

  queueWebUsage(record: WebUsageRecord): void {
    this.websitesQueue.push({
      id: this.nextId++,
      data: record,
      created_at: new Date().toISOString(),
      synced: 0,
    });
    this.scheduleSave();
  }

  // ── Get pending data for sync ─────────────────────────────────

  getPendingActivities(limit: number = 100): { id: number; data: ActivityInterval }[] {
    return this.activitiesQueue
      .filter((item) => item.synced === 0)
      .slice(0, limit)
      .map((item) => ({ id: item.id, data: item.data }));
  }

  getPendingApps(limit: number = 100): { id: number; data: AppUsageRecord }[] {
    return this.appsQueue
      .filter((item) => item.synced === 0)
      .slice(0, limit)
      .map((item) => ({ id: item.id, data: item.data }));
  }

  getPendingWebsites(limit: number = 100): { id: number; data: WebUsageRecord }[] {
    return this.websitesQueue
      .filter((item) => item.synced === 0)
      .slice(0, limit)
      .map((item) => ({ id: item.id, data: item.data }));
  }

  // ── Mark as synced ────────────────────────────────────────────

  markSynced(table: 'pending_activities' | 'pending_apps' | 'pending_websites', ids: number[]): void {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    const queue =
      table === 'pending_activities'
        ? this.activitiesQueue
        : table === 'pending_apps'
        ? this.appsQueue
        : this.websitesQueue;

    for (const item of queue) {
      if (idSet.has(item.id)) {
        item.synced = 1;
      }
    }
    this.scheduleSave();
  }

  // ── Cleanup old synced data ───────────────────────────────────

  cleanupSynced(olderThanHours: number = 24): void {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
    this.activitiesQueue = this.activitiesQueue.filter(
      (item) => item.synced === 0 || new Date(item.created_at).getTime() >= cutoff
    );
    this.appsQueue = this.appsQueue.filter(
      (item) => item.synced === 0 || new Date(item.created_at).getTime() >= cutoff
    );
    this.websitesQueue = this.websitesQueue.filter(
      (item) => item.synced === 0 || new Date(item.created_at).getTime() >= cutoff
    );
    this.scheduleSave();
  }

  // ── Daily stats (local summary) ───────────────────────────────

  updateDailyStats(date: string, activeSeconds: number, idleSeconds: number, mouseEvents: number, keyboardEvents: number): void {
    const now = new Date().toISOString();
    const stat = this.dailyStatsMap[date] || {
      date,
      first_activity: now,
      last_activity: now,
      total_active_seconds: 0,
      total_idle_seconds: 0,
      total_mouse_events: 0,
      total_keyboard_events: 0,
      updated_at: now,
    };

    stat.total_active_seconds += activeSeconds;
    stat.total_idle_seconds += idleSeconds;
    stat.total_mouse_events += mouseEvents;
    stat.total_keyboard_events += keyboardEvents;
    stat.last_activity = now;
    stat.updated_at = now;

    this.dailyStatsMap[date] = stat;
    this.saveToDisk();
  }

  getDailyStats(date: string): any {
    return this.dailyStatsMap[date] || null;
  }

  // ── Aggregated Stats for UI ──────────────────────────────────

  getTodayAppsSummary(): { appName: string; durationSeconds: number; category: string }[] {
    const today = new Date().toISOString().split('T')[0];
    const map: Record<string, { durationSeconds: number; category: string }> = {};

    for (const item of this.appsQueue) {
      const itemDate = item.data.startedAt ? item.data.startedAt.split('T')[0] : '';
      if (itemDate === today || !itemDate) {
        const name = item.data.appName || 'Unknown App';
        const dur = item.data.durationSeconds || 0;
        const cat = item.data.category || 'unrated';
        if (!map[name]) {
          map[name] = { durationSeconds: 0, category: cat };
        }
        map[name].durationSeconds += dur;
        if (cat !== 'unrated') map[name].category = cat;
      }
    }

    return Object.entries(map)
      .map(([appName, d]) => ({ appName, durationSeconds: d.durationSeconds, category: d.category }))
      .sort((a, b) => b.durationSeconds - a.durationSeconds);
  }

  getTodayWebsitesSummary(): { domain: string; durationSeconds: number; category: string }[] {
    const today = new Date().toISOString().split('T')[0];
    const map: Record<string, { durationSeconds: number; category: string }> = {};

    for (const item of this.websitesQueue) {
      const itemDate = item.data.startedAt ? item.data.startedAt.split('T')[0] : '';
      if (itemDate === today || !itemDate) {
        const dom = item.data.domain || 'Direct / Internal';
        const dur = item.data.durationSeconds || 0;
        const cat = item.data.category || 'unrated';
        if (!map[dom]) {
          map[dom] = { durationSeconds: 0, category: cat };
        }
        map[dom].durationSeconds += dur;
        if (cat !== 'unrated') map[dom].category = cat;
      }
    }

    return Object.entries(map)
      .map(([domain, d]) => ({ domain, durationSeconds: d.durationSeconds, category: d.category }))
      .sort((a, b) => b.durationSeconds - a.durationSeconds);
  }

  // ── Utility ───────────────────────────────────────────────────

  getPendingCounts(): { activities: number; apps: number; websites: number } {
    return {
      activities: this.activitiesQueue.filter((i) => i.synced === 0).length,
      apps: this.appsQueue.filter((i) => i.synced === 0).length,
      websites: this.websitesQueue.filter((i) => i.synced === 0).length,
    };
  }

  close(): void {
    this.saveToDisk();
  }
}

export const localDb = new LocalDatabase();
export default localDb;
