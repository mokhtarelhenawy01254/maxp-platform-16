import { apiClient } from "./apiClient";
import { tokenManager } from "../utils/tokenManager";

type AnalyticsQueryParamValue = string | number | boolean | undefined;
type AnalyticsQueryParams = Record<string, AnalyticsQueryParamValue>;
type AnalyticsHttpResponse<T = unknown> = { data: T };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getResponseStatus = (error: unknown): number | undefined => {
  if (
    isRecord(error) &&
    "response" in error &&
    isRecord(error.response) &&
    typeof error.response.status === "number"
  ) {
    return error.response.status;
  }

  return undefined;
};

/**
 * Analytics Service
 * Handles store visit tracking, conversion events, and analytics reporting
 * Uses standardized apiClient for all requests
 */

class AnalyticsService {
  private sessionId: string;
  private readonly publicRequestConfig = {
    _skipAuthHeader: true,
    _skipAuthRefresh: true,
    _skipErrorToast: true,
  } as const;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getSessionId(): string {
    this.sessionId = this.getOrCreateSessionId();
    return this.sessionId;
  }

  private readStorage(
    storage: "localStorage" | "sessionStorage",
    key: string,
  ): string | null {
    try {
      return window[storage].getItem(key);
    } catch {
      return null;
    }
  }

  private writeStorage(
    storage: "localStorage" | "sessionStorage",
    key: string,
    value: string,
  ) {
    try {
      window[storage].setItem(key, value);
    } catch {
      // Ignore storage failures in restricted browser contexts.
    }
  }

  private hasTrackedKey(
    storage: "localStorage" | "sessionStorage",
    key: string,
  ): boolean {
    return this.readStorage(storage, key) === "1";
  }

  private markTracked(
    storage: "localStorage" | "sessionStorage",
    key: string,
  ) {
    this.writeStorage(storage, key, "1");
  }

  private buildDedupeKey(...parts: Array<string | number | null | undefined>) {
    return parts
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(":");
  }

  private buildDateRangeParams(
    startDate?: string,
    endDate?: string,
  ): AnalyticsQueryParams {
    const params: AnalyticsQueryParams = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  }

  private buildRelativeDateRangeParams(
    period?: string,
    startDate?: string,
    endDate?: string,
  ): AnalyticsQueryParams {
    const params: AnalyticsQueryParams = {};

    if (period && !startDate) {
      const days = parseInt(period) || 30;
      const start = new Date();
      start.setDate(start.getDate() - days);
      params.startDate = start.toISOString().split("T")[0];
      params.endDate = new Date().toISOString().split("T")[0];
      return params;
    }

    return this.buildDateRangeParams(startDate, endDate);
  }

  private getOrCreateSessionId(): string {
    const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    // Try to get existing session from localStorage
    const storedSession = localStorage.getItem("analytics_session");

    if (storedSession) {
      try {
        const { sessionId, expiresAt } = JSON.parse(storedSession);

        // Check if session is still valid
        if (expiresAt > now) {
          // Extend session on activity
          localStorage.setItem(
            "analytics_session",
            JSON.stringify({
              sessionId,
              expiresAt: now + SESSION_DURATION,
            }),
          );
          return sessionId;
        }
      } catch (e) {
        console.error("Error parsing stored session:", e);
      }
    }

    // Create new session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(
      "analytics_session",
      JSON.stringify({
        sessionId,
        expiresAt: now + SESSION_DURATION,
      }),
    );

    return sessionId;
  }

  private getCompanyId(): string | null {
    const companyIdFromQuery = new URLSearchParams(window.location.search).get(
      "companyId",
    );
    if (companyIdFromQuery) {
      return companyIdFromQuery;
    }

    // أولاً: جرب storefront_companyId (للـ Storefront - نفس المفتاح المستخدم في storefrontApi)
    const storefrontCompanyId = localStorage.getItem("storefront_companyId");

    if (storefrontCompanyId) {
      return storefrontCompanyId;
    }

    const sessionCompanyId = sessionStorage.getItem("currentCompanyId");
    if (sessionCompanyId) {
      return sessionCompanyId;
    }

    const directCompanyId =
      localStorage.getItem("currentCompanyId") ||
      localStorage.getItem("companyId");
    if (directCompanyId) {
      return directCompanyId;
    }

    // ثانياً: جرب company object (للـ Admin Dashboard)
    const storedCompany = localStorage.getItem("company");
    if (storedCompany) {
      try {
        const company = JSON.parse(storedCompany);
        if (company?.id) {
          return company.id;
        }
      } catch (e) {
        console.error("Error parsing company from localStorage:", e);
      }
    }

    // ثالثاً: جرب user object لأن معظم الشاشات الإدارية تحفظ companyId بداخله
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const nestedCompanyId =
          user?.companyId ||
          user?.company?.id ||
          user?.currentCompanyId ||
          user?.effectiveCompanyId ||
          null;

        if (nestedCompanyId) {
          return nestedCompanyId;
        }
      } catch (e) {
        console.error("Error parsing user from localStorage:", e);
      }
    }

    console.warn("⚠️ [Analytics] No companyId found in localStorage");
    return null;
  }

  async trackStoreVisit(landingPage?: string) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        console.warn(
          "📊 [Analytics] No companyId found, skipping store visit tracking",
        );
        return;
      }

      const sessionId = this.getSessionId();
      const dedupeKey = this.buildDedupeKey(
        "analytics_store_visit",
        companyId,
        sessionId,
      );
      if (this.hasTrackedKey("sessionStorage", dedupeKey)) {
        return dedupeKey;
      }

      console.log("📊 [Analytics] Tracking store visit...", {
        companyId,
        landingPage,
      });

      await apiClient.post(
        "/analytics/track/store-visit",
        {
          sessionId,
          ipAddress: null, // يمكن إضافة IP من الـ backend
          userAgent: navigator.userAgent,
          referrer: document.referrer || null,
          landingPage: landingPage || window.location.pathname,
        },
        {
          ...this.publicRequestConfig,
          headers: { "x-company-id": companyId },
        },
      );

      this.markTracked("sessionStorage", dedupeKey);

      console.log("✅ [Analytics] Store visit tracked successfully");
      return dedupeKey;
    } catch (error) {
      console.error("❌ [Analytics] Error tracking store visit:", error);
    }
  }

  async trackProductView(productId: string, source?: string) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        console.warn(
          "📊 [Analytics] No companyId found, skipping product view tracking",
        );
        return;
      }

      const sessionId = this.getSessionId();

      console.log("📊 [Analytics] Tracking product view...", {
        companyId,
        productId,
        source,
      });

      await apiClient.post(
        "/analytics/track/product-view",
        {
          productId,
          sessionId,
          source,
        },
        {
          ...this.publicRequestConfig,
          headers: { "x-company-id": companyId },
        },
      );

      console.log("✅ [Analytics] Product view tracked successfully");
    } catch (error) {
      console.error("❌ [Analytics] Error tracking product view:", error);
    }
  }

  async trackAddToCart(productId: string, value: number) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        console.warn(
          "📊 [Analytics] No companyId found, skipping add to cart tracking",
        );
        return;
      }

      const sessionId = this.getSessionId();

      console.log("📊 [Analytics] Tracking add to cart...", {
        companyId,
        productId,
        value,
      });

      await apiClient.post(
        "/analytics/track/conversion",
        {
          sessionId,
          eventType: "add_to_cart",
          productId,
          value,
        },
        {
          ...this.publicRequestConfig,
          headers: { "x-company-id": companyId },
        },
      );

      console.log("✅ [Analytics] Add to cart tracked successfully");
    } catch (error) {
      console.error("❌ [Analytics] Error tracking add to cart:", error);
    }
  }

  async trackCheckout(value: number, productIds: string[]) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        console.warn(
          "📊 [Analytics] No companyId found, skipping checkout tracking",
        );
        return;
      }

      const sessionId = this.getSessionId();
      const normalizedProductIds = productIds
        .map((productId) => String(productId || "").trim())
        .filter(Boolean);
      const dedupeKey = this.buildDedupeKey(
        "analytics_checkout",
        companyId,
        sessionId,
        value.toFixed(2),
        normalizedProductIds.join("|"),
      );
      if (this.hasTrackedKey("sessionStorage", dedupeKey)) {
        return dedupeKey;
      }

      console.log("📊 [Analytics] Tracking checkout...", {
        companyId,
        value,
        productIds: normalizedProductIds,
      });

      await apiClient.post(
        "/analytics/track/conversion",
        {
          sessionId,
          eventType: "checkout",
          value,
          metadata: { productIds: normalizedProductIds },
        },
        {
          ...this.publicRequestConfig,
          headers: { "x-company-id": companyId },
        },
      );

      this.markTracked("sessionStorage", dedupeKey);

      console.log("✅ [Analytics] Checkout tracked successfully");
      return dedupeKey;
    } catch (error) {
      console.error("❌ [Analytics] Error tracking checkout:", error);
    }
  }

  async trackPurchase(
    orderId: string | null | undefined,
    value: number,
    productIds: string[],
  ) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId) {
        console.warn(
          "📊 [Analytics] No companyId found, skipping purchase tracking",
        );
        return;
      }

      const sessionId = this.getSessionId();
      const normalizedProductIds = Array.from(
        new Set(
          productIds
            .map((productId) => String(productId || "").trim())
            .filter(Boolean),
        ),
      );
      const orderReference = String(orderId || "").trim();
      const dedupeKey = this.buildDedupeKey(
        "analytics_purchase",
        companyId,
        orderReference || sessionId,
        value.toFixed(2),
        normalizedProductIds.join("|"),
      );
      if (this.hasTrackedKey("localStorage", dedupeKey)) {
        return dedupeKey;
      }

      if (normalizedProductIds.length === 0) {
        return;
      }

      // Track each product separately for proper analytics
      const trackingPromises = normalizedProductIds.map((productId) =>
        apiClient.post(
          "/analytics/track/conversion",
          {
            sessionId,
            eventType: "purchase",
            orderId: orderReference || undefined,
            productId,
            value: value / normalizedProductIds.length, // Distribute value across products
            metadata: { allProductIds: normalizedProductIds },
          },
          {
            ...this.publicRequestConfig,
            headers: { "x-company-id": companyId },
          },
        ),
      );

      await Promise.all(trackingPromises);
      this.markTracked("localStorage", dedupeKey);
      return dedupeKey;
    } catch (error) {
      console.error("❌ [Analytics] Error tracking purchase:", error);
    }
  }

  // ==================== Public APIs (بدون Token - للـ Storefront) ====================

  private async getAnalyticsReport<T = unknown>(
    publicPath: string,
    protectedPath: string,
    config: {
      params?: AnalyticsQueryParams;
      headers?: Record<string, string>;
      signal?: AbortSignal;
    },
    companyId?: string | null,
  ): Promise<AnalyticsHttpResponse<T>> {
    const hasAuthToken = Boolean(tokenManager.getAccessToken());
    const requestConfig = {
      ...config,
      params: {
        ...(config.params || {}),
        companyId: companyId || config.params?.companyId,
      },
      headers: {
        ...(config.headers || {}),
        ...(companyId ? { "x-company-id": companyId } : {}),
      },
    };

    const requestPublic = () =>
      apiClient.get(`/public/analytics${publicPath}`, {
        ...requestConfig,
        ...this.publicRequestConfig,
      });
    const requestProtected = () =>
      apiClient.get(protectedPath, requestConfig);

    if (!companyId && hasAuthToken) {
      return requestProtected();
    }

    try {
      return await requestPublic();
    } catch (error: unknown) {
      const status = getResponseStatus(error);
      if (hasAuthToken && (status === 400 || status === 401 || status === 404)) {
        return requestProtected();
      }

      if (status === 401 || status === 404) {
        return apiClient.get(`/analytics/public${publicPath}`, {
          ...requestConfig,
          ...this.publicRequestConfig,
        });
      }

      throw error;
    }
  }

  async getStoreAnalytics(
    period: string = "30",
    startDate?: string,
    endDate?: string,
    comparisonType?: string,
    signal?: AbortSignal,
  ) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId && !tokenManager.getAccessToken()) {
        throw new Error("No companyId found");
      }

      const params: any = { period };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (comparisonType) params.comparisonType = comparisonType;

      const response = await this.getAnalyticsReport("/store", "/analytics/store", {
        params,
        headers: { "x-company-id": companyId },
        signal,
      }, companyId);
      return response.data;
    } catch (error) {
      console.error("Error fetching store analytics:", error);
      throw error;
    }
  }

  async getConversionRate(period: string = "30") {
    try {
      const response = await apiClient.get("/analytics/conversion-rate", {
        params: { period },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching conversion rate:", error);
      throw error;
    }
  }

  async getProductConversionRate(productId: string, period: string = "30") {
    try {
      const response = await apiClient.get(
        `/analytics/products/${productId}/conversion`,
        {
          params: { period },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching product conversion rate:", error);
      throw error;
    }
  }

  async getTopProducts(
    period: string = "30",
    limit: number = 10,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId && !tokenManager.getAccessToken()) {
        throw new Error("No companyId found");
      }

      const params: AnalyticsQueryParams = { period, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await this.getAnalyticsReport(
        "/products/top",
        "/analytics/products/top",
        {
        params,
        headers: { "x-company-id": companyId },
        },
        companyId,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching top products:", error);
      throw error;
    }
  }

  async getDailyAnalytics(
    period: string = "30",
    startDate?: string,
    endDate?: string,
    signal?: AbortSignal,
  ) {
    try {
      const companyId = this.getCompanyId();
      if (!companyId && !tokenManager.getAccessToken()) {
        throw new Error("No companyId found");
      }

      const params: AnalyticsQueryParams = { period };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await this.getAnalyticsReport("/daily", "/analytics/daily", {
        params,
        headers: { "x-company-id": companyId },
        signal,
      }, companyId);
      return response.data;
    } catch (error) {
      console.error("Error fetching daily analytics:", error);
      throw error;
    }
  }

  async getProductAnalytics(period: string = "30") {
    try {
      const response = await apiClient.get("/analytics/products/analytics", {
        params: { period },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching product analytics:", error);
      throw error;
    }
  }

  async getVariationsAnalytics(
    startDate?: string,
    endDate?: string,
    productId?: string,
  ) {
    try {
      const params: AnalyticsQueryParams = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (productId) params.productId = productId;
      const response = await apiClient.get("/analytics/variations", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching variations analytics:", error);
      throw error;
    }
  }

  async getCategoriesAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: AnalyticsQueryParams = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get("/analytics/categories", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching categories analytics:", error);
      throw error;
    }
  }

  async getPaymentMethodsAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: AnalyticsQueryParams = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get("/analytics/payment-methods", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching payment methods analytics:", error);
      throw error;
    }
  }

  async getCampaignAttributionAnalytics(
    options: {
      period?: string;
      startDate?: string;
      endDate?: string;
      source?: string;
      platform?: string;
      trackingType?: string;
      channel?: string;
      search?: string;
      signal?: AbortSignal;
    } = {},
  ) {
    try {
      const {
        period = "30",
        startDate,
        endDate,
        source,
        platform,
        trackingType,
        channel,
        search,
        signal,
      } = options;

      const params: AnalyticsQueryParams = { period };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (source && source !== "all") params.source = source;
      if (platform && platform !== "all") params.platform = platform;
      if (trackingType && trackingType !== "all") {
        params.trackingType = trackingType;
      }
      if (channel && channel !== "all") {
        (params as any).channel = channel;
      }
      if (search) params.search = search;

      const response = await apiClient.get("/analytics/campaign-attribution", {
        params,
        signal,
      });
      return response.data;
    } catch (error: any) {
      if (error?.response?.status !== 403) {
        console.error("Error fetching campaign attribution analytics:", error);
      }
      throw error;
    }
  }

  async getRegionsAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: AnalyticsQueryParams = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get("/analytics/regions", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching regions analytics:", error);
      throw error;
    }
  }

  async getCouponsAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: AnalyticsQueryParams = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get("/analytics/coupons", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching coupons analytics:", error);
      throw error;
    }
  }

  async getCODPerformanceAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams = {};

      if (period && !startDate) {
        const days = parseInt(period) || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        params.startDate = start.toISOString().split("T")[0];
        params.endDate = new Date().toISOString().split("T")[0];
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await apiClient.get("/analytics/cod-performance", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching COD performance analytics:", error);
      throw error;
    }
  }

  async getCancellationAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params = this.buildRelativeDateRangeParams(
        period,
        startDate,
        endDate,
      );

      const response = await apiClient.get("/analytics/cancellations", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching cancellation analytics:", error);
      throw error;
    }
  }

  async getAbandonedCartAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams & { period?: string } = {};

      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (period) params.period = period;

      if (!startDate && !endDate && period) {
        if (period === "today") {
          const today = new Date().toISOString().split("T")[0];
          params.startDate = today;
          params.endDate = today;
        } else if (period === "yesterday") {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          const yDate = y.toISOString().split("T")[0];
          params.startDate = yDate;
          params.endDate = yDate;
        } else {
          const days = parseInt(period, 10) || 30;
          const start = new Date();
          start.setDate(start.getDate() - days);
          params.startDate = start.toISOString().split("T")[0];
          params.endDate = new Date().toISOString().split("T")[0];
        }
      }

      const response = await apiClient.get("/analytics/abandoned-carts", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching abandoned cart analytics:", error);
      throw error;
    }
  }

  async getCustomerQualityAnalytics(period: string = "30", startDate?: string, endDate?: string) {
    try {
      const params: any = { period };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get("/analytics/customer-quality", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching customer quality analytics:", error);
      throw error;
    }
  }

  async getProfitAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams = {};

      // If period is provided, calculate startDate
      if (period && !startDate) {
        const days = parseInt(period) || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        params.startDate = start.toISOString().split("T")[0];
        params.endDate = new Date().toISOString().split("T")[0];
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await apiClient.get("/analytics/profit", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching profit analytics:", error);
      throw error;
    }
  }

  async getDeliveryRateAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams = {};

      if (period && !startDate) {
        const days = parseInt(period) || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        params.startDate = start.toISOString().split("T")[0];
        params.endDate = new Date().toISOString().split("T")[0];
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await apiClient.get("/analytics/delivery-rate", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching delivery rate analytics:", error);
      throw error;
    }
  }

  async getOrderStatusTimeAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: AnalyticsQueryParams = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get("/analytics/order-status-time", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching order status time analytics:", error);
      throw error;
    }
  }

  async getProductHealthScore(startDate?: string, endDate?: string) {
    try {
      const params: AnalyticsQueryParams = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get("/analytics/product-health", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching product health score:", error);
      throw error;
    }
  }

  async getReturnAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: AnalyticsQueryParams = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get("/analytics/returns", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching return analytics:", error);
      throw error;
    }
  }

  async getProductFulfillmentAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams =
        period && !startDate
          ? {
              startDate: (() => {
                const start = new Date();
                start.setDate(start.getDate() - (parseInt(period) || 30));
                return start.toISOString().split("T")[0];
              })(),
              endDate: new Date().toISOString().split("T")[0],
            }
          : {
              ...(startDate ? { startDate } : {}),
              ...(endDate ? { endDate } : {}),
            };
      const response = await apiClient.get("/analytics/product-fulfillment", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching product fulfillment analytics:", error);
      throw error;
    }
  }

  async getDeliveryReturnsLogisticsAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams =
        period && !startDate
          ? {
              startDate: (() => {
                const start = new Date();
                start.setDate(start.getDate() - (parseInt(period) || 30));
                return start.toISOString().split("T")[0];
              })(),
              endDate: new Date().toISOString().split("T")[0],
            }
          : {
              ...(startDate ? { startDate } : {}),
              ...(endDate ? { endDate } : {}),
            };
      const response = await apiClient.get("/analytics/delivery-returns", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching delivery returns analytics:", error);
      throw error;
    }
  }

  async getProductDeliveryReturnsReport(options?: {
    period?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    productId?: string;
    shippingCompanyId?: string;
    governorate?: string;
    statusFilter?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    try {
      const params: Record<string, any> = {
        ...(options?.period ? { period: options.period } : {}),
        ...(options?.startDate ? { startDate: options.startDate } : {}),
        ...(options?.endDate ? { endDate: options.endDate } : {}),
        ...(options?.search ? { search: options.search } : {}),
        ...(options?.productId ? { productId: options.productId } : {}),
        ...(options?.shippingCompanyId ? { shippingCompanyId: options.shippingCompanyId } : {}),
        ...(options?.governorate ? { governorate: options.governorate } : {}),
        ...(options?.statusFilter ? { statusFilter: options.statusFilter } : {}),
        ...(options?.sortBy ? { sortBy: options.sortBy } : {}),
        ...(options?.sortOrder ? { sortOrder: options.sortOrder } : {}),
      };
      const response = await apiClient.get("/analytics/products-delivery-returns", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching product delivery returns report:", error);
      throw error;
    }
  }

  async getProductSalesPerformance(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams =
        period && !startDate
          ? {
              startDate: (() => {
                const start = new Date();
                start.setDate(start.getDate() - (parseInt(period) || 30));
                return start.toISOString().split("T")[0];
              })(),
              endDate: new Date().toISOString().split("T")[0],
            }
          : {
              ...(startDate ? { startDate } : {}),
              ...(endDate ? { endDate } : {}),
            };
      const response = await apiClient.get("/analytics/products/sales-performance", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching product sales performance:", error);
      throw error;
    }
  }

  async getTeamPerformanceAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams = {};

      if (period && !startDate) {
        const days = parseInt(period) || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        params.startDate = start.toISOString().split("T")[0];
        params.endDate = new Date().toISOString().split("T")[0];
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await apiClient.get("/analytics/team-performance", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching team performance analytics:", error);
      throw error;
    }
  }

  async getFunnelAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams = {};

      if (period && !startDate) {
        const days = parseInt(period) || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        params.startDate = start.toISOString().split("T")[0];
        params.endDate = new Date().toISOString().split("T")[0];
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await apiClient.get("/analytics/funnel", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching funnel analytics:", error);
      throw error;
    }
  }

  async getStockForecastAnalytics(period?: string) {
    try {
      const response = await apiClient.get("/analytics/stock-forecast", {
        params: { period },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching stock forecast analytics:", error);
      throw error;
    }
  }

  async getRegionAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: AnalyticsQueryParams = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      // Converted to apiClient
      const response = await apiClient.get("/analytics/regions", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching region analytics:", error);
      throw error;
    }
  }

  async getReturnsAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: AnalyticsQueryParams = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      // Converted to apiClient
      const response = await apiClient.get("/analytics/returns", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching returns analytics:", error);
      throw error;
    }
  }

  async getReturnReasonsAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
    category?: string,
    status?: string,
  ) {
    try {
      const params = this.buildRelativeDateRangeParams(period, startDate, endDate);
      if (category) params.category = category;
      if (status) params.status = status;
      const response = await apiClient.get("/analytics/returns/reasons", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching return reasons analytics:", error);
      throw error;
    }
  }

  async getConversionRateAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: AnalyticsQueryParams = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      // Converted to apiClient
      const response = await apiClient.get("/analytics/conversion-rate", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching conversion rate analytics:", error);
      throw error;
    }
  }

  async getComprehensiveDashboard(
    period: string = "30",
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams = { period };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get(
        "/analytics/comprehensive-dashboard",
        {
          params,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching comprehensive dashboard:", error);
      throw error;
    }
  }

  // --- Status Reports Analysis Methods ---
  
  async getAvailableStatuses() {
    try {
      const response = await apiClient.get("/analytics/statuses");
      return response.data;
    } catch (error) {
      console.error("Error fetching available statuses:", error);
      throw error;
    }
  }

  async getStatusAnalysisReport(
    statusId: string,
    period: string = "30",
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams = { status: statusId, period };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get("/analytics/status-report", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching status analysis report:", error);
      throw error;
    }
  }

  // --- Status Summary Report (Multi-status aggregate) ---

  async getAvailableStatusesForSummary() {
    try {
      const response = await apiClient.get("/analytics/statuses");
      return response.data;
    } catch (error) {
      console.error("Error fetching available statuses for summary:", error);
      throw error;
    }
  }

  async getTodayOps(queryString?: string) {
    try {
      const url = queryString ? `/analytics/today-ops?${queryString}` : "/analytics/today-ops";
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching today ops:", error);
      throw error;
    }
  }

  async getStatusSummaryReport(
    statuses: string[],
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const params: AnalyticsQueryParams & { statuses: string } = {
        statuses: statuses.join(","),
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get("/analytics/status-summary", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching status summary report:", error);
      throw error;
    }
  }

}

export default new AnalyticsService();
