import axios, { AxiosInstance } from 'axios';
import type { SyncBatch, DeviceInfo, MonitorSettings, DailySummary, CategoryRule } from './types';

/**
 * API client for communicating with MaxP backend.
 * All monitor endpoints are under /api/monitor/
 */
class MonitorApiClient {
  private client: AxiosInstance;
  private serverUrl: string = '';
  private authToken: string = '';

  constructor() {
    this.client = axios.create({ timeout: 15_000 });
  }

  configure(serverUrl: string, authToken: string): void {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.authToken = authToken;
    this.client = axios.create({
      baseURL: `${this.serverUrl}/api/monitor`,
      timeout: 15_000,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        'X-Client': 'maxp-desktop-monitor',
      },
    });
  }

  get isConfigured(): boolean {
    return this.serverUrl.length > 0 && this.authToken.length > 0;
  }

  // ── Ingest (Desktop -> Server) ────────────────────────────────

  async sendHeartbeat(deviceInfo: DeviceInfo): Promise<void> {
    await this.client.post('/heartbeat', deviceInfo);
  }

  async sendActivityBatch(activities: SyncBatch['activities']): Promise<void> {
    if (activities.length === 0) return;
    await this.client.post('/activity/batch', { activities });
  }

  async sendAppUsageBatch(apps: SyncBatch['apps']): Promise<void> {
    if (apps.length === 0) return;
    await this.client.post('/apps/batch', { apps });
  }

  async sendWebUsageBatch(websites: SyncBatch['websites']): Promise<void> {
    if (websites.length === 0) return;
    await this.client.post('/web/batch', { websites });
  }

  async syncAll(batch: SyncBatch): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      await this.sendActivityBatch(batch.activities);
    } catch (err: any) {
      errors.push(`Activity sync failed: ${err.message}`);
    }

    try {
      await this.sendAppUsageBatch(batch.apps);
    } catch (err: any) {
      errors.push(`App usage sync failed: ${err.message}`);
    }

    try {
      await this.sendWebUsageBatch(batch.websites);
    } catch (err: any) {
      errors.push(`Web usage sync failed: ${err.message}`);
    }

    return { success: errors.length === 0, errors };
  }

  // ── Dashboard (Server -> Desktop) ─────────────────────────────

  async getDailySummary(date?: string): Promise<DailySummary | null> {
    try {
      const params = date ? { date } : {};
      const res = await this.client.get('/summary/me', { params });
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  }

  async getCategories(): Promise<CategoryRule[]> {
    try {
      const res = await this.client.get('/categories');
      return res.data?.data ?? [];
    } catch {
      return [];
    }
  }

  // ── Auth ───────────────────────────────────────────────────────

  async login(email: string, password: string, serverUrl: string): Promise<{ token: string; user: any }> {
    const url = `${serverUrl.replace(/\/$/, '')}/api/auth/login`;
    const res = await axios.post(url, { email, password }, { timeout: 10_000 });
    if (!res.data?.token) throw new Error('Invalid login response');
    return { token: res.data.token, user: res.data.user ?? res.data.data };
  }

  // ── Tasks ──────────────────────────────────────────────────────

  async getTasks(): Promise<any[]> {
    try {
      const base = this.serverUrl;
      const res = await axios.get(`${base}/api/tasks/my`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
        timeout: 10_000,
      });
      return res.data?.tasks ?? res.data?.data ?? [];
    } catch {
      return [];
    }
  }
}

export const apiClient = new MonitorApiClient();
export default apiClient;
