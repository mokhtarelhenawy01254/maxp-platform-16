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
      baseURL: `${this.serverUrl}/api/v1/employee-monitor`,
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
    let cleanUrl = (serverUrl || 'https://maxp.online').trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    cleanUrl = cleanUrl.replace(/\/+$/, '');

    // Convert Eastern Arabic numerals (٠-٩) to standard digits (0-9)
    const normalizeDigits = (str: string) =>
      str.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = normalizeDigits(password.trim());

    const url = `${cleanUrl}/api/auth/login`;

    try {
      const res = await axios.post(
        url,
        { email: cleanEmail, password: cleanPassword },
        { timeout: 15_000 }
      );
      const payload = res.data;
      const token = payload?.data?.token || payload?.token;
      const user = payload?.data?.user || payload?.user || payload?.data;

      if (!token) {
        throw new Error(payload?.message || 'استجابة غير صالحة من السيرفر: التوكن مفقود');
      }

      return { token, user };
    } catch (err: any) {
      const serverMessage = err.response?.data?.message || err.response?.data?.error;
      if (serverMessage) {
        throw new Error(serverMessage);
      }
      if (err.response?.status === 401) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        throw new Error('تعذر الاتصال بالسيرفر. يرجى التحقق من الرابط والاتصال بالإنترنت.');
      }
      throw new Error(err.message || 'فشل تسجيل الدخول');
    }
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
