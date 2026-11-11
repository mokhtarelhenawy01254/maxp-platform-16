import { apiClient } from "./apiClient";

export interface MetaApp {
  id: string;
  key: "primary" | "growth";
  appId: string;
  configId?: string | null;
  appSecretRef: string;
  webhookVerifyTokenRef?: string | null;
  isActive: boolean;
  isDefaultForSignup?: boolean;
  hasSecretConfigured: boolean;
  hasVerifyTokenConfigured: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UpsertMetaAppPayload {
  key: "primary" | "growth";
  appId: string;
  configId?: string | null;
  appSecretRef: string;
  webhookVerifyTokenRef?: string | null;
  isActive?: boolean;
}

export interface AppPermissionStatus {
  permission: string;
  category: string;
  description: string;
  status: 'approved' | 'standard_only' | 'pending_review' | 'not_requested';
  accessLevel: 'advanced' | 'standard' | 'none';
  note?: string | null;
}

export interface TestAppConnectionResult {
  success: boolean;
  connected: boolean;
  appId: string;
  appName?: string;
  key: string;
  checkedAt: string;
  message?: string;
  permissions: AppPermissionStatus[];
}

export const metaAppsService = {
  async getApps(): Promise<MetaApp[]> {
    const response = await apiClient.get("/super-admin/platform/meta-apps");
    const resData = response?.data as any;
    const data = resData?.data || resData || [];
    return Array.isArray(data) ? data : [];
  },

  async upsertApp(payload: UpsertMetaAppPayload): Promise<MetaApp> {
    const response = await apiClient.post("/super-admin/platform/meta-apps", payload);
    const resData = response?.data as any;
    return resData?.data || resData;
  },

  async toggleStatus(key: string, isActive: boolean): Promise<MetaApp> {
    const response = await apiClient.patch(`/super-admin/platform/meta-apps/${key}/toggle`, {
      isActive,
    });
    const resData = response?.data as any;
    return resData?.data || resData;
  },

  async setDefaultForSignup(key: string): Promise<{ key: string }> {
    const response = await apiClient.patch(`/super-admin/platform/meta-apps/${key}/default`);
    const resData = response?.data as any;
    return resData?.data || resData;
  },

  async testConnection(key: string): Promise<TestAppConnectionResult> {
    const response = await apiClient.post(`/super-admin/platform/meta-apps/${key}/test-connection`);
    const resData = response?.data as any;
    return resData?.data || resData;
  },
};

export default metaAppsService;
