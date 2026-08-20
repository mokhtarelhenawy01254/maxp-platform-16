import { apiClient } from "./apiClient";

export interface BusinessSpecialty {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string;
  appSlugs: string[];
  autoInstallOnSignup: boolean;
  sortOrder: number;
  isActive: boolean;
  companyCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface BusinessSpecialtyFormPayload {
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  icon: string;
  appSlugs: string[];
  autoInstallOnSignup: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface MarketplaceAppOption {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  category: string;
  icon: string | null;
}

export interface RemoveBusinessSpecialtyResult {
  specialty?: BusinessSpecialty | null;
}

const unwrapData = <T,>(payload: unknown, fallback: T): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data?: unknown }).data as T;
  }

  return (payload ?? fallback) as T;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .trim()
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeSpecialty = (
  value?: Partial<BusinessSpecialty> | null,
): BusinessSpecialty => ({
  id: String(value?.id || ""),
  slug: String(value?.slug || ""),
  nameAr: String(value?.nameAr || ""),
  nameEn: String(value?.nameEn || ""),
  descriptionAr: String(value?.descriptionAr || ""),
  descriptionEn: String(value?.descriptionEn || ""),
  icon: String(value?.icon || "Briefcase"),
  appSlugs: normalizeStringArray(value?.appSlugs),
  autoInstallOnSignup: value?.autoInstallOnSignup !== false,
  sortOrder: normalizeNumber(value?.sortOrder),
  isActive: value?.isActive !== false,
  companyCount: normalizeNumber(value?.companyCount),
  createdAt: value?.createdAt ?? null,
  updatedAt: value?.updatedAt ?? null,
});

const normalizeAppOption = (
  value?: Partial<MarketplaceAppOption> | null,
): MarketplaceAppOption => ({
  id: String(value?.id || ""),
  slug: String(value?.slug || ""),
  name: String(value?.name || ""),
  nameEn: String(value?.nameEn || value?.name || ""),
  category: String(value?.category || "general"),
  icon: value?.icon ?? null,
});

export const businessSpecialtyService = {
  async listSpecialties(): Promise<BusinessSpecialty[]> {
    const response = await apiClient.get(
      "/super-admin/platform/business-specialties",
    );

    const payload = unwrapData<BusinessSpecialty[]>(
      response.data,
      [],
    );

    return Array.isArray(payload)
      ? payload.map(normalizeSpecialty)
      : [];
  },

  async listAppOptions(): Promise<MarketplaceAppOption[]> {
    const response = await apiClient.get(
      "/super-admin/platform/business-specialties/app-options",
    );

    const payload = unwrapData<MarketplaceAppOption[]>(
      response.data,
      [],
    );

    return Array.isArray(payload)
      ? payload.map(normalizeAppOption)
      : [];
  },

  async createSpecialty(
    payload: BusinessSpecialtyFormPayload,
  ): Promise<BusinessSpecialty> {
    const response = await apiClient.post(
      "/super-admin/platform/business-specialties",
      payload,
    );
    return normalizeSpecialty(unwrapData(response.data, {}));
  },

  async updateSpecialty(
    specialtyId: string,
    payload: BusinessSpecialtyFormPayload,
  ): Promise<BusinessSpecialty> {
    const response = await apiClient.put(
      `/super-admin/platform/business-specialties/${specialtyId}`,
      payload,
    );
    return normalizeSpecialty(unwrapData(response.data, {}));
  },

  async removeSpecialty(
    specialtyId: string,
  ): Promise<RemoveBusinessSpecialtyResult> {
    const response = await apiClient.delete(
      `/super-admin/platform/business-specialties/${specialtyId}`,
    );
    const data = unwrapData<BusinessSpecialty | null>(response.data, null);
    return {
      specialty: data ? normalizeSpecialty(data) : null,
    };
  },
};

export default businessSpecialtyService;
