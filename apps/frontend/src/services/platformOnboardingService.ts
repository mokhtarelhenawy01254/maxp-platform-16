import { apiClient } from "./apiClient";

export interface BusinessSpecialty {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  icon?: string;
  appSlugs: string[];
  autoInstallOnSignup: boolean;
  sortOrder: number;
  isActive: boolean;
  companyCount?: number;
}

export interface PlatformOnboardingSettings {
  defaultTrialDays: number;
}

export interface MarketplaceAppOption {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  category: string;
  icon?: string | null;
}

export type BusinessSpecialtyPayload = Omit<
  BusinessSpecialty,
  "id" | "companyCount"
>;

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

const unwrap = <T>(response: { data: ApiEnvelope<T> }): T => response.data.data;

export const platformOnboardingService = {
  async getPublicSpecialties() {
    const response = await apiClient.get<
      ApiEnvelope<{ items: BusinessSpecialty[]; defaultTrialDays: number }>
    >("/auth/business-specialties", { _skipAuthHeader: true });
    return unwrap(response);
  },

  async getSettings() {
    const response = await apiClient.get<ApiEnvelope<PlatformOnboardingSettings>>(
      "/super-admin/platform/onboarding-settings",
    );
    return unwrap(response);
  },

  async updateSettings(payload: PlatformOnboardingSettings) {
    const response = await apiClient.put<ApiEnvelope<PlatformOnboardingSettings>>(
      "/super-admin/platform/onboarding-settings",
      payload,
    );
    return unwrap(response);
  },

  async listSpecialties() {
    const response = await apiClient.get<ApiEnvelope<{ items: BusinessSpecialty[] }>>(
      "/super-admin/platform/business-specialties",
    );
    return unwrap(response).items;
  },

  async createSpecialty(payload: BusinessSpecialtyPayload) {
    const response = await apiClient.post<ApiEnvelope<BusinessSpecialty>>(
      "/super-admin/platform/business-specialties",
      payload,
    );
    return unwrap(response);
  },

  async updateSpecialty(id: string, payload: BusinessSpecialtyPayload) {
    const response = await apiClient.put<ApiEnvelope<BusinessSpecialty>>(
      `/super-admin/platform/business-specialties/${id}`,
      payload,
    );
    return unwrap(response);
  },

  async removeSpecialty(id: string) {
    const response = await apiClient.delete<ApiEnvelope<BusinessSpecialty>>(
      `/super-admin/platform/business-specialties/${id}`,
    );
    return unwrap(response);
  },

  async getMarketplaceAppOptions() {
    const response = await apiClient.get<ApiEnvelope<{ items: MarketplaceAppOption[] }>>(
      "/super-admin/platform/business-specialties/app-options",
    );
    return unwrap(response).items;
  },
};
