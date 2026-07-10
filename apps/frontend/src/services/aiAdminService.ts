import { apiClient } from "./apiClient";
import type { AiKey, AiKeyLog, AiProvider, CreateAiKeyPayload, AiTestResult } from "../types/ai-admin";

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
};
