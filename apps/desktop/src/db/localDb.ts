import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import type { ActivityInterval, AppUsageRecord, WebUsageRecord } from '../shared/types';

/**
 * Local SQLite database for offline caching.
 * Stores activity data locally before syncing to server.
 */
class LocalDatabase {
  private db!: Database.Database;
  private initialized = false;

  init(): void {
    if (this.initialized) return;

    const dbPath = path.join(app.getPath('userData'), 'monitor-cache.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.createTables();
    this.initialized = true;
  }

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pending_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS pending_apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS pending_websites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY,
        first_activity TEXT,
        last_activity TEXT,
        total_active_seconds INTEGER DEFAULT 0,
        total_idle_seconds INTEGER DEFAULT 0,
        total_mouse_events INTEGER DEFAULT 0,
        total_keyboard_events INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_pending_activities_synced ON pending_activities(synced);
      CREATE INDEX IF NOT EXISTS idx_pending_apps_synced ON pending_apps(synced);
      CREATE INDEX IF NOT EXISTS idx_pending_websites_synced ON pending_websites(synced);
    `);
  }

  // ── Queue data for sync ───────────────────────────────────────

  queueActivity(activity: ActivityInterval): void {
    const stmt = this.db.prepare('INSERT INTO pending_activities (data) VALUES (?)');
    stmt.run(JSON.stringify(activity));
  }

  queueAppUsage(record: AppUsageRecord): void {
    const stmt = this.db.prepare('INSERT INTO pending_apps (data) VALUES (?)');
    stmt.run(JSON.stringify(record));
  }

  queueWebUsage(record: WebUsageRecord): void {
    const stmt = this.db.prepare('INSERT INTO pending_websites (data) VALUES (?)');
    stmt.run(JSON.stringify(record));
  }

  // ── Get pending data for sync ─────────────────────────────────

  getPendingActivities(limit: number = 100): { id: number; data: ActivityInterval }[] {
    const stmt = this.db.prepare(
      'SELECT id, data FROM pending_activities WHERE synced = 0 ORDER BY id ASC LIMIT ?'
    );
    const rows = stmt.all(limit) as { id: number; data: string }[];
    return rows.map((r) => ({ id: r.id, data: JSON.parse(r.data) }));
  }

  getPendingApps(limit: number = 100): { id: number; data: AppUsageRecord }[] {
    const stmt = this.db.prepare(
      'SELECT id, data FROM pending_apps WHERE synced = 0 ORDER BY id ASC LIMIT ?'
    );
    const rows = stmt.all(limit) as { id: number; data: string }[];
    return rows.map((r) => ({ id: r.id, data: JSON.parse(r.data) }));
  }

  getPendingWebsites(limit: number = 100): { id: number; data: WebUsageRecord }[] {
    const stmt = this.db.prepare(
      'SELECT id, data FROM pending_websites WHERE synced = 0 ORDER BY id ASC LIMIT ?'
    );
    const rows = stmt.all(limit) as { id: number; data: string }[];
    return rows.map((r) => ({ id: r.id, data: JSON.parse(r.data) }));
  }

  // ── Mark as synced ────────────────────────────────────────────

  markSynced(table: 'pending_activities' | 'pending_apps' | 'pending_websites', ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`UPDATE ${table} SET synced = 1 WHERE id IN (${placeholders})`);
    stmt.run(...ids);
  }

  // ── Cleanup old synced data ───────────────────────────────────

  cleanupSynced(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
    this.db.prepare('DELETE FROM pending_activities WHERE synced = 1 AND created_at < ?').run(cutoff);
    this.db.prepare('DELETE FROM pending_apps WHERE synced = 1 AND created_at < ?').run(cutoff);
    this.db.prepare('DELETE FROM pending_websites WHERE synced = 1 AND created_at < ?').run(cutoff);
  }

  // ── Daily stats (local summary) ───────────────────────────────

  updateDailyStats(date: string, activeSeconds: number, idleSeconds: number, mouseEvents: number, keyboardEvents: number): void {
    const now = new Date().toISOString();
    const existing = this.db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(date) as any;

    if (existing) {
      this.db.prepare(`
        UPDATE daily_stats SET
          total_active_seconds = total_active_seconds + ?,
          total_idle_seconds = total_idle_seconds + ?,
          total_mouse_events = total_mouse_events + ?,
          total_keyboard_events = total_keyboard_events + ?,
          last_activity = ?,
          updated_at = ?
        WHERE date = ?
      `).run(activeSeconds, idleSeconds, mouseEvents, keyboardEvents, now, now, date);
    } else {
      this.db.prepare(`
        INSERT INTO daily_stats (date, first_activity, last_activity, total_active_seconds, total_idle_seconds, total_mouse_events, total_keyboard_events, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(date, now, now, activeSeconds, idleSeconds, mouseEvents, keyboardEvents, now);
    }
  }

  getDailyStats(date: string): any {
    return this.db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(date);
  }

  // ── Utility ───────────────────────────────────────────────────

  getPendingCounts(): { activities: number; apps: number; websites: number } {
    const a = this.db.prepare('SELECT COUNT(*) as c FROM pending_activities WHERE synced = 0').get() as any;
    const b = this.db.prepare('SELECT COUNT(*) as c FROM pending_apps WHERE synced = 0').get() as any;
    const w = this.db.prepare('SELECT COUNT(*) as c FROM pending_websites WHERE synced = 0').get() as any;
    return { activities: a.c, apps: b.c, websites: w.c };
  }

  close(): void {
    if (this.db) this.db.close();
  }
}

export const localDb = new LocalDatabase();
export default localDb;
