import axios, { AxiosInstance } from 'axios';
import type { SyncBatch, DeviceInfo, DailySummary, CategoryRule } from './types';

/**
 * API client for communicating with MaxP backend.
 * All monitor endpoints are under /api/monitor/
 */
class MonitorApiClient {
  private client: AxiosInstance;
  private serverUrl: string = '';
  private authToken: string = '';
  private companyId: string = '';
  private onUnauthorized: (() => void) | null = null;

  constructor() {
    this.client = axios.create({ timeout: 15_000 });
  }

  setOnUnauthorized(cb: () => void): void {
    this.onUnauthorized = cb;
  }

  configure(serverUrl: string, authToken: string, companyId?: string): void {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.authToken = authToken;
    this.companyId = companyId || '';
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
      'X-Client': 'maxp-desktop-monitor',
    };
    if (this.companyId) {
      headers['X-Company-Id'] = this.companyId;
    }
    this.client = axios.create({
      baseURL: `${this.serverUrl}/api/v1/employee-monitor`,
      timeout: 15_000,
      headers,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.warn('[ApiClient] 401 Unauthorized — token may be expired (no auto-logout)');
        }
        return Promise.reject(error);
      }
    );
  }

  get isConfigured(): boolean {
    return this.serverUrl.length > 0 && this.authToken.length > 0;
  }

  get server(): string {
    return this.serverUrl;
  }

  async validateToken(): Promise<{ valid: boolean; user?: any }> {
    if (!this.isConfigured) return { valid: false };
    try {
      let res;
      try {
        res = await axios.get(`${this.serverUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${this.authToken}` },
          timeout: 8000,
        });
      } catch (e: any) {
        if (e.response?.status === 404) {
          res = await axios.get(`${this.serverUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${this.authToken}` },
            timeout: 8000,
          });
        } else {
          throw e;
        }
      }
      return { valid: true, user: res.data?.data ?? res.data?.user };
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        return { valid: false };
      }
      return { valid: true }; // network offline, don't force logout
    }
  }

  // ── Ingest (Desktop -> Server) ────────────────────────────────

  async sendHeartbeat(deviceInfo: DeviceInfo): Promise<void> {
    await this.client.post('/heartbeat', deviceInfo);
  }

  async endDeviceSession(reason: string = 'MANUAL_CLOSE'): Promise<void> {
    try {
      await this.client.post('/session/end', { reason });
    } catch {}
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

  async getTimeline(date?: string): Promise<{ apps?: any[]; websites?: any[] } | null> {
    try {
      const params = date ? { date } : {};
      const res = await this.client.get('/timeline/me', { params });
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

    const url = `${cleanUrl}/api/v1/auth/login`;

    try {
      let res;
      const loginHeaders = { 'X-Client': 'maxp-desktop-monitor' };
      try {
        res = await axios.post(
          url,
          { email: cleanEmail, password: cleanPassword },
          { timeout: 15_000, headers: loginHeaders }
        );
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Fallback for legacy nginx /api/auth/login rewrite
          res = await axios.post(
            `${cleanUrl}/api/auth/login`,
            { email: cleanEmail, password: cleanPassword },
            { timeout: 15_000, headers: loginHeaders }
          );
        } else {
          throw err;
        }
      }
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

  // ── Tasks Engine ──────────────────────────────────────────────
  getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
      ...extra,
    };
    if (this.companyId) {
      headers['X-Company-Id'] = this.companyId;
    }
    return headers;
  }

  async getTasks(type: 'my-tasks' | 'assigned-by-me' | 'all' = 'my-tasks'): Promise<any[]> {
    try {
      const base = this.serverUrl;
      const endpoint = type === 'all' ? '' : `/${type}`;
      const headers = this.getAuthHeaders();
      const res = await axios.get(`${base}/api/v1/tasks${endpoint}`, {
        headers,
        timeout: 10_000,
      });
      return res.data?.data ?? res.data?.tasks ?? [];
    } catch (err: any) {
      console.warn(`[API] getTasks(${type}) failed:`, err?.message);
      throw err;
    }
  }

  async getCompanyUsers(): Promise<any[]> {
    try {
      const base = this.serverUrl;
      const headers = this.getAuthHeaders();
      const res = await axios.get(`${base}/api/v1/tasks/company-users`, {
        headers,
        timeout: 10_000,
      });
      return res.data?.data ?? [];
    } catch (err: any) {
      console.warn('[API] getCompanyUsers failed:', err?.message);
      return [];
    }
  }

  get token(): string {
    return this.authToken;
  }

  async updateTaskStatus(taskId: string, status: string): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.put(
      `${base}/api/v1/tasks/${taskId}/status`,
      { status: status.toUpperCase() },
      {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      }
    );
    return res.data?.data ?? res.data;
  }

  async updateTask(
    taskData: {
      id?: string;
      title: string;
      description?: string;
      priority?: string;
      assignedTo?: string;
      dueDate?: string;
      estimatedMinutes?: number;
      isRecurring?: boolean;
      recurringRule?: string;
      watchers?: string[];
    },
    taskId?: string
  ): Promise<any> {
    const base = this.serverUrl;
    const id = taskId || taskData.id;
    const payload = {
      title: taskData.title,
      description: taskData.description || taskData.title,
      priority: (taskData.priority || 'MEDIUM').toUpperCase(),
      assignedTo: taskData.assignedTo,
      dueDate: taskData.dueDate || null,
      estimatedMinutes: taskData.estimatedMinutes,
      isRecurring: taskData.isRecurring || false,
      recurringRule: taskData.recurringRule || null,
      watchers: taskData.watchers || [],
    };

    const res = await axios.put(`${base}/api/v1/tasks/${id}`, payload, {
      headers: this.getAuthHeaders(),
      timeout: 15_000,
    });
    return res.data?.data ?? res.data;
  }

  async createTask(taskData: {
    title: string;
    description?: string;
    priority?: string;
    assignedTo?: string;
    dueDate?: string;
    estimatedMinutes?: number;
    isRecurring?: boolean;
    recurringRule?: string;
    watchers?: string[];
  }): Promise<any> {
    const base = this.serverUrl;
    const payload = {
      title: taskData.title,
      description: taskData.description || taskData.title,
      priority: (taskData.priority || 'MEDIUM').toUpperCase(),
      assignedTo: taskData.assignedTo,
      dueDate: taskData.dueDate || null,
      estimatedMinutes: taskData.estimatedMinutes,
      isRecurring: taskData.isRecurring || false,
      recurringRule: taskData.recurringRule || null,
      watchers: taskData.watchers || [],
    };

    const res = await axios.post(`${base}/api/v1/tasks`, payload, {
      headers: this.getAuthHeaders(),
      timeout: 15_000,
    });
    return res.data?.data ?? res.data;
  }

  async addTaskWatcher(taskId: string, userId: string): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.post(
      `${base}/api/v1/tasks/${taskId}/watchers`,
      { userId },
      {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      }
    );
    return res.data?.data ?? res.data;
  }

  async removeTaskWatcher(taskId: string, userId: string): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.delete(
      `${base}/api/v1/tasks/${taskId}/watchers/${userId}`,
      {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      }
    );
    return res.data;
  }

  // ── Task Dependencies ───────────────────────────────────────
  async getTaskDependencies(taskId: string): Promise<any> {
    const base = this.serverUrl;
    try {
      const res = await axios.get(`${base}/api/v1/tasks/${taskId}/dependencies`, {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      });
      return res.data?.data ?? res.data;
    } catch (err: any) {
      console.warn('[API] getTaskDependencies failed:', err?.message);
      return [];
    }
  }

  async addTaskDependency(taskId: string, dependsOnId: string, type: string = 'blocked_by'): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.post(
      `${base}/api/v1/tasks/${taskId}/dependencies`,
      { dependsOnId, type },
      {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      }
    );
    return res.data?.data ?? res.data;
  }

  async removeTaskDependency(dependencyId: string): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.delete(
      `${base}/api/v1/tasks/dependencies/${dependencyId}`,
      {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      }
    );
    return res.data;
  }

  async uploadTaskAttachment(
    taskId: string,
    base64Data: string,
    originalName: string,
    mimeType: string = 'image/png'
  ): Promise<any> {
    const base = this.serverUrl;

    // 1. Direct atomic upload with base64 (fast, avoids Node multipart boundary issues)
    try {
      const res = await axios.post(
        `${base}/api/v1/tasks/${taskId}/attachments`,
        {
          base64Data,
          originalName: originalName || 'attachment.png',
          fileType: mimeType,
        },
        {
          headers: this.getAuthHeaders(),
          timeout: 25_000,
        }
      );
      if (res.data?.success) {
        return res.data?.data ?? res.data;
      }
    } catch (directErr: any) {
      console.warn('[apiClient] Direct base64 upload fallback to multipart:', directErr?.message);
    }

    // 2. Multipart fallback
    const buffer = Buffer.from(
      base64Data.replace(/^data:[^;]+;base64,/, ''),
      'base64'
    );
    const blob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, originalName || 'screenshot.png');

    const uploadRes = await axios.post(`${base}/api/v1/upload`, formData, {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        ...(this.companyId ? { 'X-Company-Id': this.companyId } : {}),
      },
      timeout: 30_000,
    });

    const uploadPayload = uploadRes.data;
    if (!uploadPayload?.success && !uploadPayload?.filePath) {
      throw new Error(uploadPayload?.error || 'فشل في رفع المرفق');
    }

    const linkRes = await axios.post(
      `${base}/api/v1/tasks/${taskId}/attachments`,
      {
        fileName: uploadPayload.fileName,
        originalName: uploadPayload.originalName || originalName,
        fileSize: uploadPayload.fileSize || buffer.length,
        fileType: mimeType,
        filePath: uploadPayload.filePath,
      },
      {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      }
    );

    return linkRes.data?.data ?? linkRes.data;
  }

  async startTaskTimer(taskId: string): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.post(
      `${base}/api/v1/tasks/${taskId}/time-tracking/start`,
      { stopOthers: false },
      {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      }
    );
    return res.data?.data ?? res.data;
  }

  async stopTaskTimer(entryId: string): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.put(
      `${base}/api/v1/tasks/time-tracking/${entryId}/stop`,
      {},
      {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      }
    );
    return res.data?.data ?? res.data;
  }

  async getRunningTaskTimer(): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.get(`${base}/api/v1/tasks/running-timer`, {
      headers: this.getAuthHeaders(),
      timeout: 10_000,
    });
    return res.data;
  }

  async getCompanyActiveTimers(): Promise<any[]> {
    try {
      const base = this.serverUrl;
      const res = await axios.get(`${base}/api/v1/tasks/company-active-timers`, {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      });
      return res.data?.data ?? [];
    } catch (err: any) {
      console.warn('[API] getCompanyActiveTimers failed:', err?.message);
      return [];
    }
  }

  // ── Subtasks & Checklists ─────────────────────────────────────
  async getSubtasks(parentTaskId: string): Promise<any[]> {
    try {
      const base = this.serverUrl;
      const res = await axios.get(`${base}/api/v1/tasks/${parentTaskId}/subtasks`, {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      });
      return res.data?.data ?? [];
    } catch (err: any) {
      console.warn('[API] getSubtasks failed:', err?.message);
      return [];
    }
  }

  async createSubtask(parentTaskId: string, data: { title: string; assignedTo?: string; priority?: string }): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.post(`${base}/api/v1/tasks/${parentTaskId}/subtasks`, data, {
      headers: this.getAuthHeaders(),
      timeout: 10_000,
    });
    return res.data?.data ?? res.data;
  }

  async getChecklists(taskId: string): Promise<any[]> {
    try {
      const base = this.serverUrl;
      const res = await axios.get(`${base}/api/v1/tasks/${taskId}/checklists`, {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      });
      return res.data?.data ?? [];
    } catch (err: any) {
      console.warn('[API] getChecklists failed:', err?.message);
      return [];
    }
  }

  async createChecklist(taskId: string, title: string = 'قائمة المهام'): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.post(
      `${base}/api/v1/tasks/${taskId}/checklists`,
      { title },
      { headers: this.getAuthHeaders(), timeout: 10_000 }
    );
    return res.data?.data ?? res.data;
  }

  async addChecklistItem(checklistId: string, text: string): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.post(
      `${base}/api/v1/tasks/checklists/${checklistId}/items`,
      { text },
      { headers: this.getAuthHeaders(), timeout: 10_000 }
    );
    return res.data?.data ?? res.data;
  }

  async updateChecklistItem(itemId: string, data: { isCompleted?: boolean; text?: string }): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.put(
      `${base}/api/v1/tasks/checklists/items/${itemId}`,
      data,
      { headers: this.getAuthHeaders(), timeout: 10_000 }
    );
    return res.data?.data ?? res.data;
  }

  async deleteChecklistItem(itemId: string): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.delete(
      `${base}/api/v1/tasks/checklists/items/${itemId}`,
      { headers: this.getAuthHeaders(), timeout: 10_000 }
    );
    return res.data;
  }

  // ── Goals (OKRs) ──────────────────────────────────────────────
  async getTodayGoals(userId?: string): Promise<any[]> {
    try {
      const base = this.serverUrl;
      const params = userId ? { userId } : {};
      const res = await axios.get(`${base}/api/v1/tasks/goals/today`, {
        params,
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      });
      return res.data?.goals ?? res.data?.data ?? [];
    } catch (err: any) {
      console.warn('[API] getTodayGoals failed:', err?.message);
      return [];
    }
  }

  async getGoals(params: any = {}): Promise<any[]> {
    try {
      const base = this.serverUrl;
      const res = await axios.get(`${base}/api/v1/tasks/goals`, {
        params,
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      });
      return res.data?.goals ?? res.data?.data ?? [];
    } catch (err: any) {
      console.warn('[API] getGoals failed:', err?.message);
      return [];
    }
  }

  async updateGoalProgress(goalId: string, current: number, notes?: string): Promise<any> {
    const base = this.serverUrl;
    const res = await axios.post(
      `${base}/api/v1/tasks/goals/${goalId}/progress`,
      { current, notes },
      { headers: this.getAuthHeaders(), timeout: 10_000 }
    );
    return res.data?.data ?? res.data;
  }

  // ── Task Reports & Stats ──────────────────────────────────────
  async getTaskDashboardStats(): Promise<any> {
    try {
      const base = this.serverUrl;
      const res = await axios.get(`${base}/api/v1/tasks/dashboard-stats`, {
        headers: this.getAuthHeaders(),
        timeout: 10_000,
      });
      return res.data?.data ?? res.data?.stats ?? null;
    } catch (err: any) {
      console.warn('[API] getTaskDashboardStats failed:', err?.message);
      return null;
    }
  }

  // ── Automated Attendance Linkage ─────────────────────────────

  async checkTodayAttendance(): Promise<any> {
    try {
      const base = this.serverUrl;
      let res;
      try {
        res = await axios.get(`${base}/api/v1/hr/attendance/my-today`, {
          headers: this.getAuthHeaders(),
          timeout: 10_000,
        });
      } catch (err: any) {
        if (err.response?.status === 404) {
          res = await axios.get(`${base}/api/hr/attendance/my-today`, {
            headers: this.getAuthHeaders(),
            timeout: 10_000,
          });
        } else {
          throw err;
        }
      }
      return res.data?.attendance ?? res.data?.data ?? res.data;
    } catch {
      return null;
    }
  }

  async autoClockIn(): Promise<{ success: boolean; attendance?: any }> {
    try {
      const base = this.serverUrl;
      let res;
      try {
        res = await axios.post(
          `${base}/api/v1/hr/attendance/check-in`,
          {
            method: 'desktop_workspace',
            workMode: 'office',
          },
          {
            headers: this.getAuthHeaders(),
            timeout: 10_000,
          }
        );
      } catch (err: any) {
        if (err.response?.status === 404) {
          res = await axios.post(
            `${base}/api/hr/attendance/check-in`,
            {
              method: 'desktop_workspace',
              workMode: 'office',
            },
            {
              headers: this.getAuthHeaders(),
              timeout: 10_000,
            }
          );
        } else {
          throw err;
        }
      }
      return res.data;
    } catch {
      return { success: false };
    }
  }

  async clockOut(): Promise<{ success: boolean; attendance?: any; error?: string }> {
    try {
      const base = this.serverUrl;
      let res;
      try {
        res = await axios.post(
          `${base}/api/v1/hr/attendance/check-out`,
          {
            method: 'desktop_workspace',
            workMode: 'office',
          },
          {
            headers: this.getAuthHeaders(),
            timeout: 10_000,
          }
        );
      } catch (err: any) {
        if (err.response?.status === 404) {
          res = await axios.post(
            `${base}/api/hr/attendance/check-out`,
            {
              method: 'desktop_workspace',
              workMode: 'office',
            },
            {
              headers: this.getAuthHeaders(),
              timeout: 10_000,
            }
          );
        } else {
          throw err;
        }
      }
      return { success: true, attendance: res.data?.attendance ?? res.data?.data ?? res.data };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }
}

export const apiClient = new MonitorApiClient();
export default apiClient;
