import { apiClient } from "./apiClient";
import type { AiKey, AiKeyLog, AiProvider, CreateAiKeyPayload, AiTestResult, DashboardStats, GlobalConfig, AiKeyUpdatePayload } from "../types/ai-admin";

export const aiAdminService = {
  getProviders: async (): Promise<AiProvider[]> => {
    const response = await apiClient.get<AiProvider[]>("/ai-admin/providers");
    return response.data;
  },

  getKeys: async (): Promise<AiKey[]> => {
    const response = await apiClient.get<AiKey[]>("/ai-admin/keys");
    return response.data;
  },

  createKey: async (payload: CreateAiKeyPayload): Promise<AiKey> => {
    const response = await apiClient.post<AiKey>("/ai-admin/keys", payload);
    return response.data;
  },

  setKeyStatus: async (id: string, isActive: boolean): Promise<void> => {
    await apiClient.patch(`/ai-admin/keys/${encodeURIComponent(id)}/status`, {
      is_active: isActive,
    });
  },

  deleteKey: async (id: string): Promise<void> => {
    await apiClient.delete(`/ai-admin/keys/${encodeURIComponent(id)}`);
  },

  getKeyLogs: async (params?: {
    provider?: string;
    key_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: AiKeyLog[]; total: number }> => {
    const response = await apiClient.get<{ items: AiKeyLog[]; total: number }>("/ai-admin/logs", { params });
    return response.data;
  },

  testKeyById: async (id: string): Promise<AiTestResult> => {
    const response = await apiClient.post<AiTestResult>(
      `/ai-admin/keys/${encodeURIComponent(id)}/test`,
    );
    return response.data;
  },

  testKey: async (provider: string, apiKey: string): Promise<AiTestResult> => {
    const response = await apiClient.post<AiTestResult>("/ai-admin/test", {
      provider,
      api_key: apiKey,
    });
    return response.data;
  },

  getDashboard: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>("/ai-admin/dashboard");
    return response.data;
  },

  batchTestKeys: async (keyIds: string[]): Promise<Record<string, AiTestResult>> => {
    const results: Record<string, AiTestResult> = {};
    await Promise.allSettled(
      keyIds.map(async (id) => {
        try {
          const r = await aiAdminService.testKeyById(id);
          results[id] = r;
        } catch (err: any) {
          results[id] = { error: err?.message || "فشل الاختبار" };
        }
      }),
    );
    return results;
  },

  updateKey: async (id: string, payload: AiKeyUpdatePayload): Promise<AiKey> => {
    const response = await apiClient.patch<AiKey>(`/ai-admin/keys/${encodeURIComponent(id)}`, payload);
    return response.data;
  },

  getGlobalConfig: async (): Promise<GlobalConfig> => {
    const response = await apiClient.get<GlobalConfig>("/ai-admin/config");
    return response.data;
  },

  updateGlobalConfig: async (payload: Partial<GlobalConfig>): Promise<GlobalConfig> => {
    const response = await apiClient.patch<GlobalConfig>("/ai-admin/config", payload);
    return response.data;
  },

  setProviderPriority: async (providers: string[]): Promise<GlobalConfig> => {
    const response = await apiClient.post<GlobalConfig>("/ai-admin/provider-priority", { providers });
    return response.data;
  },
};
