import { apiClient, type ApiRequestConfig } from "./apiClient";
import {
  normalizeStorefrontThemeCatalogItem,
  normalizeStorefrontThemeCatalogItems,
  StorefrontThemeCatalogItem,
} from "../storefront/themes/catalog";
import {
  normalizeSettings,
  StorefrontSettings,
} from "./storefrontSettingsService";

type ThemeCatalogResponse = {
  data: StorefrontThemeCatalogItem[];
};

export type ThemePurchaseHistoryItem = {
  installationId: string;
  themeId: string;
  name: string;
  description: string;
  pricingModel: "FREE" | "ONE_TIME";
  purchaseAmount: number;
  currency: string;
  purchasedAt: string | null;
  activatedAt: string | null;
  installationStatus: string | null;
  activePricingModel: "FREE" | "ONE_TIME" | null;
  isCurrentTheme: boolean;
  walletTransactionId: string | null;
  walletReferenceId: string | null;
  walletTransaction: {
    id: string;
    type: string;
    status: string;
    amount: number;
    description: string;
    referenceId: string;
    createdAt: string | null;
  } | null;
};

type ThemeActivationResponse = {
  theme: StorefrontThemeCatalogItem | null;
  catalog: StorefrontThemeCatalogItem[];
  installation: Record<string, unknown> | null;
  settings: StorefrontSettings;
  wallet?: {
    balance: number;
    currency: string;
  } | null;
};

type ThemeHistoryResponse = {
  data: ThemePurchaseHistoryItem[];
};

type ThemeRequestOptions = {
  companyId?: string;
};

const normalizeCatalog = (
  payload: unknown,
  currentThemeId = "",
): StorefrontThemeCatalogItem[] => {
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? ((payload as { data: unknown[] }).data ?? [])
      : [];

  return normalizeStorefrontThemeCatalogItems(
    rawItems as Array<Partial<StorefrontThemeCatalogItem> & Record<string, unknown>>,
    currentThemeId,
  );
};

const buildCompanyScopedRequestConfig = (
  companyId?: string,
): ApiRequestConfig | undefined => {
  const normalizedCompanyId =
    typeof companyId === "string" ? companyId.trim() : "";

  return normalizedCompanyId
    ? {
        _companyId: normalizedCompanyId,
      }
    : undefined;
};

export const storefrontThemeCatalogService = {
  getCompanyCatalog: async (
    currentThemeId = "",
    options?: ThemeRequestOptions,
  ): Promise<ThemeCatalogResponse> => {
    const response = await apiClient.get(
      "/marketplace/themes",
      buildCompanyScopedRequestConfig(options?.companyId),
    );
    return {
      data: normalizeCatalog(response?.data?.data, currentThemeId),
    };
  },

  getAdminCatalog: async (): Promise<ThemeCatalogResponse> => {
    const response = await apiClient.get("/super-admin/storefront-theme-catalog");
    return {
      data: normalizeCatalog(response?.data?.data),
    };
  },

  getPurchaseHistory: async (
    limit = 10,
    options?: ThemeRequestOptions,
  ): Promise<ThemeHistoryResponse> => {
    const response = await apiClient.get("/marketplace/themes/history", {
      ...buildCompanyScopedRequestConfig(options?.companyId),
      params: { limit },
    });

    const rawItems = Array.isArray(response?.data?.data)
      ? response.data.data
      : Array.isArray(response?.data?.data?.data)
        ? response.data.data.data
        : [];

    return {
      data: rawItems.map((item) => ({
        installationId: String(item?.installationId || ""),
        themeId: String(item?.themeId || ""),
        name: String(item?.name || ""),
        description: String(item?.description || ""),
        pricingModel:
          String(item?.pricingModel || "").toUpperCase() === "ONE_TIME"
            ? "ONE_TIME"
            : "FREE",
        purchaseAmount: Number(item?.purchaseAmount || 0),
        currency: String(item?.currency || "EGP"),
        purchasedAt:
          typeof item?.purchasedAt === "string" && item.purchasedAt.trim()
            ? item.purchasedAt
            : null,
        activatedAt:
          typeof item?.activatedAt === "string" && item.activatedAt.trim()
            ? item.activatedAt
            : null,
        installationStatus:
          typeof item?.installationStatus === "string" && item.installationStatus.trim()
            ? item.installationStatus
            : null,
        activePricingModel:
          String(item?.activePricingModel || "").toUpperCase() === "ONE_TIME"
            ? "ONE_TIME"
            : String(item?.activePricingModel || "").toUpperCase() === "FREE"
              ? "FREE"
              : null,
        isCurrentTheme: Boolean(item?.isCurrentTheme),
        walletTransactionId:
          typeof item?.walletTransactionId === "string" && item.walletTransactionId.trim()
            ? item.walletTransactionId
            : null,
        walletReferenceId:
          typeof item?.walletReferenceId === "string" && item.walletReferenceId.trim()
            ? item.walletReferenceId
            : null,
        walletTransaction:
          item?.walletTransaction && typeof item.walletTransaction === "object"
            ? {
                id: String(item.walletTransaction.id || ""),
                type: String(item.walletTransaction.type || ""),
                status: String(item.walletTransaction.status || ""),
                amount: Number(item.walletTransaction.amount || 0),
                description: String(item.walletTransaction.description || ""),
                referenceId: String(item.walletTransaction.referenceId || ""),
                createdAt:
                  typeof item.walletTransaction.createdAt === "string" &&
                  item.walletTransaction.createdAt.trim()
                    ? item.walletTransaction.createdAt
                    : null,
              }
            : null,
      })),
    };
  },

  updateTheme: async (
    themeId: string,
    payload: Partial<StorefrontThemeCatalogItem> & Record<string, unknown>,
  ): Promise<StorefrontThemeCatalogItem> => {
    const response = await apiClient.put(
      `/super-admin/storefront-theme-catalog/${themeId}`,
      payload,
    );

    return normalizeStorefrontThemeCatalogItem(
      response?.data?.data as Partial<StorefrontThemeCatalogItem> &
        Record<string, unknown>,
    );
  },

  activateTheme: async (
    themeId: string,
    options?: ThemeRequestOptions,
  ): Promise<ThemeActivationResponse> => {
    const response = await apiClient.post(
      `/marketplace/themes/${themeId}/apply`,
      {},
      buildCompanyScopedRequestConfig(options?.companyId),
    );
    const payload = (response?.data?.data || {}) as {
      theme?: Partial<StorefrontThemeCatalogItem> & Record<string, unknown>;
      catalog?: unknown;
      installation?: Record<string, unknown> | null;
      settings?: Partial<StorefrontSettings> | null;
      wallet?: { balance?: unknown; currency?: unknown } | null;
    };
    const nextSettings = normalizeSettings(
      payload.settings || null,
      String(payload.settings?.companyId || options?.companyId || ""),
    );
    const nextCatalog = normalizeCatalog(payload.catalog, nextSettings.themeId || "");
    const nextTheme =
      payload.theme || nextCatalog.find((item) => item.themeId === themeId) || null;

    return {
      theme: nextTheme
        ? normalizeStorefrontThemeCatalogItem(nextTheme, nextSettings.themeId || "")
        : null,
      catalog: nextCatalog,
      installation: payload.installation || null,
      settings: nextSettings,
      wallet: payload.wallet
        ? {
            balance: Number(payload.wallet.balance || 0),
            currency: String(payload.wallet.currency || "EGP"),
          }
        : null,
    };
  },

  applyTheme: async (
    themeId: string,
    options?: ThemeRequestOptions,
  ): Promise<ThemeActivationResponse> => {
    const response = await apiClient.post(
      `/marketplace/themes/${themeId}/apply`,
      {},
      buildCompanyScopedRequestConfig(options?.companyId),
    );
    const payload = (response?.data?.data || {}) as {
      theme?: Partial<StorefrontThemeCatalogItem> & Record<string, unknown>;
      catalog?: unknown;
      installation?: Record<string, unknown> | null;
      settings?: Partial<StorefrontSettings> | null;
      wallet?: { balance?: unknown; currency?: unknown } | null;
    };
    const nextSettings = normalizeSettings(
      payload.settings || null,
      String(payload.settings?.companyId || options?.companyId || ""),
    );
    const nextCatalog = normalizeCatalog(payload.catalog, nextSettings.themeId || "");
    const nextTheme =
      payload.theme || nextCatalog.find((item) => item.themeId === themeId) || null;

    return {
      theme: nextTheme
        ? normalizeStorefrontThemeCatalogItem(nextTheme, nextSettings.themeId || "")
        : null,
      catalog: nextCatalog,
      installation: payload.installation || null,
      settings: nextSettings,
      wallet: payload.wallet
        ? {
            balance: Number(payload.wallet.balance || 0),
            currency: String(payload.wallet.currency || "EGP"),
          }
        : null,
    };
  },

  purchaseTheme: async (
    themeId: string,
    options?: ThemeRequestOptions,
  ): Promise<ThemeActivationResponse> => {
    const response = await apiClient.post(
      `/marketplace/themes/${themeId}/purchase`,
      {},
      buildCompanyScopedRequestConfig(options?.companyId),
    );
    const payload = (response?.data?.data || {}) as {
      theme?: Partial<StorefrontThemeCatalogItem> & Record<string, unknown>;
      catalog?: unknown;
      installation?: Record<string, unknown> | null;
      settings?: Partial<StorefrontSettings> | null;
      wallet?: { balance?: unknown; currency?: unknown } | null;
    };
    const nextCatalog = normalizeCatalog(payload.catalog);
    const nextTheme =
      payload.theme || nextCatalog.find((item) => item.themeId === themeId) || null;

    return {
      theme: nextTheme
        ? normalizeStorefrontThemeCatalogItem(nextTheme)
        : null,
      catalog: nextCatalog,
      installation: payload.installation || null,
      settings: normalizeSettings(
        payload.settings || null,
        String(payload.settings?.companyId || options?.companyId || ""),
      ),
      wallet: payload.wallet
        ? {
            balance: Number(payload.wallet.balance || 0),
            currency: String(payload.wallet.currency || "EGP"),
          }
        : null,
    };
  },
};

export type { StorefrontThemeCatalogItem };
