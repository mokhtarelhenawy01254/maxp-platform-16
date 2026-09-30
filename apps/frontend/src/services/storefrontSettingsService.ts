import { apiClient } from "./apiClient";
import { storefrontFetch } from "../utils/storefrontApi";

export interface StorefrontSettings {
  id: string;
  companyId: string;
  companySlug?: string | null;
  customDomain?: string | null;
  themeId?: string;
  designTokens?: Record<string, any> | null;
  supportedLanguages?: string;
  defaultLayout?: string;
  storeName?: string;
  description?: string;
  currency?: string;
  quickViewEnabled?: boolean;
  comparisonEnabled?: boolean;
  wishlistEnabled?: boolean;
  recentlyViewedEnabled?: boolean;
  advancedFiltersEnabled?: boolean;
  productCardStyle?: string;
  gridAddToCartIcon?: string;
  gridDiscountBanner?: boolean;
  gtmEnabled?: boolean;
  gtmContainerId?: string;
  gtmDataLayerEnabled?: boolean;
  gtmTrackPageView?: boolean;
  gtmSuppressPixels?: boolean;
  googleAnalyticsEnabled?: boolean;
  googleAnalyticsMeasurementId?: string;
  googleAnalyticsTrackPageView?: boolean;
  googleAnalyticsTrackViewContent?: boolean;
  googleAnalyticsTrackAddToCart?: boolean;
  googleAnalyticsTrackInitiateCheckout?: boolean;
  googleAnalyticsTrackPurchase?: boolean;
  googleAnalyticsTrackSearch?: boolean;
  googleAdsEnabled?: boolean;
  googleAdsConversionId?: string;
  facebookPixelEnabled?: boolean;
  facebookPixelId?: string;
  pixelTrackPageView?: boolean;
  pixelTrackViewContent?: boolean;
  pixelTrackAddToCart?: boolean;
  pixelTrackInitiateCheckout?: boolean;
  pixelTrackPurchase?: boolean;
  pixelTrackSearch?: boolean;
  pixelTrackAddToWishlist?: boolean;
  facebookPixelConfigs?: Array<{
    id?: string;
    pixelId: string;
    pixelName?: string;
    isPrimary?: boolean;
    trackPageView?: boolean;
    trackViewContent?: boolean;
    trackAddToCart?: boolean;
    trackInitiateCheckout?: boolean;
    trackPurchase?: boolean;
    trackSearch?: boolean;
    trackAddToWishlist?: boolean;
  }>;
  facebookConvApiEnabled?: boolean;
  facebookConvApiToken?: string;
  facebookConvApiTestCode?: string;
  capiTrackPageView?: boolean;
  capiTrackViewContent?: boolean;
  capiTrackAddToCart?: boolean;
  capiTrackInitiateCheckout?: boolean;
  capiTrackPurchase?: boolean;
  capiTrackSearch?: boolean;
  eventDeduplicationEnabled?: boolean;
  eventMatchQualityTarget?: number;
  gdprCompliant?: boolean;
  hashUserData?: boolean;
  clarityProjectId?: string;
  clarityApiToken?: string;
  tiktokPixelEnabled?: boolean;
  tiktokPixelId?: string;
  tiktokTrackPageView?: boolean;
  tiktokTrackViewContent?: boolean;
  tiktokTrackAddToCart?: boolean;
  tiktokTrackInitiateCheckout?: boolean;
  tiktokTrackPurchase?: boolean;
  tiktokTrackSearch?: boolean;
  tiktokTrackAddToWishlist?: boolean;
  productPageShowCheckoutForm?: boolean;
  galleryLayout?: string;
  mainImageAspectRatio?: string;
  imageBorderRadius?: number;
  imageShadow?: boolean;
  thumbnailSize?: string;
  thumbnailSpacing?: number;
  thumbnailBorderRadius?: number;
  productVideosEnabled?: boolean;
  imageZoomEnabled?: boolean;
  imageZoomType?: string;
  sliderEnabled?: boolean;
  sliderShowArrows?: boolean;
  sliderShowDots?: boolean;
  createdAt?: string;
  updatedAt?: string;
  enabledPaymentMethods?: string;
  paymentGatewayConfig?: {
    merchantId?: string;
    apiKey?: string;
    secretKey?: string;
    mode?: string;
  };
  walletPaymentSettings?: {
    enabled?: boolean;
    walletNumber?: string;
    recipientName?: string;
    instructions?: string;
    discountEnabled?: boolean;
    discountPercent?: number;
    showDiscountBadge?: boolean;
  };
  checkoutAddressSettings?: {
    mode?: "hybrid" | "ai_parse" | "dropdown";
    aiEnabled?: boolean;
    model?: string;
    confidenceThreshold?: number;
    showConfirmationToCustomer?: boolean;
    cacheResults?: boolean;
    logRawAddress?: boolean;
    merchantCombobox?: boolean;
  };
  [key: string]: any;
}

export type StorefrontSettingsUpdate = Partial<StorefrontSettings>;

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const buildDefaultSettings = (companyId = ""): StorefrontSettings => ({
  id: companyId ? `storefront-settings-${companyId}` : "storefront-settings-default",
  companyId,
  companySlug: null,
  customDomain: null,
  themeId: "modern-minimal",
  designTokens: null,
  supportedLanguages: "ar,en",
  defaultLayout: "default",
  storeName: "Storefront",
  description: "",
  currency: "EGP",
  quickViewEnabled: true,
  comparisonEnabled: false,
  wishlistEnabled: true,
  recentlyViewedEnabled: true,
  advancedFiltersEnabled: false,
  productCardStyle: "default",
  gridAddToCartIcon: "plus",
  gridDiscountBanner: true,
  gtmEnabled: false,
  gtmContainerId: "",
  gtmDataLayerEnabled: true,
  gtmTrackPageView: true,
  gtmSuppressPixels: false,
  googleAnalyticsEnabled: false,
  googleAnalyticsMeasurementId: "",
  googleAnalyticsTrackPageView: true,
  googleAnalyticsTrackViewContent: true,
  googleAnalyticsTrackAddToCart: true,
  googleAnalyticsTrackInitiateCheckout: true,
  googleAnalyticsTrackPurchase: true,
  googleAnalyticsTrackSearch: true,
  googleAdsEnabled: false,
  googleAdsConversionId: "",
  facebookPixelEnabled: false,
  facebookPixelId: "",
  pixelTrackPageView: true,
  pixelTrackViewContent: true,
  pixelTrackAddToCart: true,
  pixelTrackInitiateCheckout: true,
  pixelTrackPurchase: true,
  pixelTrackSearch: true,
  pixelTrackAddToWishlist: false,
  facebookConvApiEnabled: false,
  facebookConvApiToken: "",
  facebookConvApiTestCode: "",
  capiTrackPageView: true,
  capiTrackViewContent: true,
  capiTrackAddToCart: true,
  capiTrackInitiateCheckout: true,
  capiTrackPurchase: true,
  capiTrackSearch: true,
  eventDeduplicationEnabled: true,
  eventMatchQualityTarget: 70,
  gdprCompliant: true,
  hashUserData: true,
  clarityProjectId: "",
  clarityApiToken: "",
  tiktokPixelEnabled: false,
  tiktokPixelId: "",
  tiktokTrackPageView: true,
  tiktokTrackViewContent: true,
  tiktokTrackAddToCart: true,
  tiktokTrackInitiateCheckout: true,
  tiktokTrackPurchase: true,
  tiktokTrackSearch: true,
  tiktokTrackAddToWishlist: false,
  productPageShowCheckoutForm: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const normalizeSettings = (
  data: Partial<StorefrontSettings> | null | undefined,
  companyId = "",
): StorefrontSettings => {
  const base = buildDefaultSettings(companyId);
  const designTokens = isRecord(data?.designTokens) ? data.designTokens : null;
  const extractedThemeId =
    typeof data?.themeId === "string" && data.themeId.trim()
      ? data.themeId.trim()
      : typeof designTokens?.themeId === "string" && designTokens.themeId.trim()
      ? designTokens.themeId.trim()
      : base.themeId;

  return {
    ...base,
    ...(data || {}),
    companyId: String(data?.companyId || companyId || ""),
    themeId: extractedThemeId,
  };
};

export const normalizePublicSettingsPayload = (
  payload: unknown,
  companyId = "",
): StorefrontSettings => {
  const root = isRecord(payload) && isRecord(payload['data']) ? payload['data'] : payload;

  if (isRecord(root) && isRecord(root['storefrontSettings'])) {
    return normalizeSettings(root['storefrontSettings'] as Partial<StorefrontSettings>, companyId);
  }

  if (isRecord(root) && isRecord(root['storefront'])) {
    const storefront = root['storefront'] as Record<string, any>;
    const storefrontFeatures = isRecord(storefront['storefrontFeatures'])
      ? storefront['storefrontFeatures']
      : {};
    const storefrontPageSettings = isRecord(storefront['settings'])
      ? storefront['settings']
      : {};
    const company = isRecord(root['company']) ? root['company'] : {};
    const companySettings = isRecord(company['settings']) ? company['settings'] : {};

    return normalizeSettings(
      {
        ...storefrontFeatures,
        ...storefrontPageSettings,
        companyId: String(company['id'] || companyId || ""),
        companySlug:
          typeof company['slug'] === "string" && company['slug'].trim()
            ? company['slug'].trim()
            : null,
        customDomain:
          typeof company['customDomain'] === "string" && company['customDomain'].trim()
            ? company['customDomain'].trim()
            : null,
        storeName:
          String(storefrontPageSettings['storeName'] || company['name'] || "").trim() ||
          "Storefront",
        description: String(companySettings['description'] || "").trim(),
        currency:
          String(storefrontPageSettings['currency'] || company['currency'] || "").trim() ||
          "EGP",
        themeId:
          typeof storefront['themeId'] === "string" && storefront['themeId'].trim()
            ? storefront['themeId']
            : "modern-minimal",
        designTokens: isRecord(storefront['designTokens']) ? storefront['designTokens'] : null,
      },
      companyId,
    );
  }

  return normalizeSettings(
    isRecord(root) ? (root as Partial<StorefrontSettings>) : null,
    companyId,
  );
};

const cachedStorefrontSettings: Record<string, StorefrontSettings> = {};
const inflightStorefrontPromises: Record<string, Promise<{ data: StorefrontSettings }>> = {};

export const storefrontSettingsService = {
  getSettings: async (
    companyId?: string,
    options?: { allowFallback?: boolean; force?: boolean },
  ): Promise<{ data: StorefrontSettings }> => {
    const cacheKey = companyId || "current";
    if (cachedStorefrontSettings[cacheKey] && !options?.force) {
      return { data: cachedStorefrontSettings[cacheKey] };
    }

    if (!inflightStorefrontPromises[cacheKey] || options?.force) {
      inflightStorefrontPromises[cacheKey] = (async () => {
        try {
          const response = await apiClient.get("/storefront-settings", {
            params: companyId ? { companyId } : undefined,
          });
          const normalized = normalizeSettings(
            response?.data?.data || response?.data,
            companyId,
          );
          cachedStorefrontSettings[cacheKey] = normalized;
          return { data: normalized };
        } catch (error) {
          if (options?.allowFallback === false) {
            throw error;
          }
          const fallback = buildDefaultSettings(companyId);
          cachedStorefrontSettings[cacheKey] = fallback;
          return { data: fallback };
        } finally {
          delete inflightStorefrontPromises[cacheKey];
        }
      })();
    }

    return inflightStorefrontPromises[cacheKey];
  },

  updateSettings: async (
    data: StorefrontSettingsUpdate,
    companyId?: string,
  ): Promise<{ data: StorefrontSettings }> => {
    const cacheKey = companyId || "current";
    delete cachedStorefrontSettings[cacheKey];
    delete inflightStorefrontPromises[cacheKey];
    const response = await apiClient.put(
      "/storefront-settings",
      data,
      companyId ? { params: { companyId } } : undefined,
    );
    const normalized = normalizeSettings(
      response?.data?.data || response?.data,
      companyId,
    );
    cachedStorefrontSettings[cacheKey] = normalized;
    return {
      data: normalized,
    };
  },

  resetSettings: async (
    companyId?: string,
  ): Promise<{ data: StorefrontSettings }> => {
    const cacheKey = companyId || "current";
    delete cachedStorefrontSettings[cacheKey];
    delete inflightStorefrontPromises[cacheKey];
    const response = await apiClient.post(
      "/storefront-settings/reset",
      {},
      companyId ? { params: { companyId } } : undefined,
    );
    const normalized = normalizeSettings(
      response?.data?.data || response?.data,
      companyId,
    );
    cachedStorefrontSettings[cacheKey] = normalized;
    return {
      data: normalized,
    };
  },

  getPublicSettings: async (
    companyId: string,
    forceRefresh = false,
  ): Promise<{ success: boolean; data: StorefrontSettings }> => {
    if (!companyId) {
      return { success: false, data: buildDefaultSettings("") };
    }

    try {
      const response = await storefrontFetch("/storefront/settings", {
        companyId,
        cache: forceRefresh ? "reload" : "default",
      });
      return {
        success: Boolean(response?.success !== false),
        data: normalizePublicSettingsPayload(response, companyId),
      };
    } catch {
      return {
        success: false,
        data: buildDefaultSettings(companyId),
      };
    }
  },

  clearCache: (companyId: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(`storefront_settings_${companyId}`);
  },

  testFacebookPixel: async (pixelId?: string) => {
    const response = await apiClient.post("/storefront-settings/test-facebook-pixel", {
      ...(pixelId ? { pixelId } : {}),
    });
    return response.data;
  },

  testPixel: async (pixelId?: string) => {
    const response = await apiClient.post("/storefront-settings/test-facebook-pixel", {
      ...(pixelId ? { pixelId } : {}),
    });
    return response.data;
  },

  testFacebookCapi: async (data?: {
    pixelId?: string;
    accessToken?: string;
    testEventCode?: string;
  }) => {
    const response = await apiClient.post(
      "/storefront-settings/test-facebook-capi",
      data || {},
    );
    return response.data;
  },

  testCapi: async (data?: {
    pixelId?: string;
    accessToken?: string;
    testEventCode?: string;
  }) => {
    const response = await apiClient.post(
      "/storefront-settings/test-facebook-capi",
      data || {},
    );
    return response.data;
  },

  sendTestEvent: async (data: {
    eventName: string;
    value?: number;
    currency?: string;
    contentName?: string;
  }) => {
    const response = await apiClient.post("/storefront-settings/send-test-event", data);
    return response.data;
  },

  getPixelDiagnostics: async () => {
    const response = await apiClient.get("/storefront-settings/pixel-diagnostics");
    return response.data;
  },

  checkTokenPermissions: async () => {
    const response = await apiClient.post("/storefront-settings/check-token-permissions", {});
    return response.data;
  },

  getPixels: async () => {
    const response = await apiClient.get("/storefront-settings/pixels");
    return response.data;
  },

  addPixel: async (pixelData: Record<string, any>) => {
    const response = await apiClient.post("/storefront-settings/pixels", pixelData);
    return response.data;
  },

  updatePixel: async (id: string, pixelData: Record<string, any>) => {
    const response = await apiClient.put(`/storefront-settings/pixels/${id}`, pixelData);
    return response.data;
  },

  deletePixel: async (id: string) => {
    const response = await apiClient.delete(`/storefront-settings/pixels/${id}`);
    return response.data;
  },

  testPixelById: async (id: string) => {
    const response = await apiClient.post(`/storefront-settings/pixels/${id}/test`, {});
    return response.data;
  },

  createFacebookPixel: async (pixelName: string, businessId?: string) => {
    const response = await apiClient.post("/storefront-settings/create-pixel", {
      pixelName,
      businessId,
    });
    return response.data;
  },

  getBusinessAccounts: async () => {
    const response = await apiClient.get("/storefront-settings/business-accounts");
    return response.data;
  },
};

export default storefrontSettingsService;
