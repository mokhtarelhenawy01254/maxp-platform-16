import { getApiUrl } from "../config/environment";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;
type ShippingQuoteItem = {
  productId: string;
  variantId?: string | null;
  quantity?: number;
};
type StorefrontFetchOptions = RequestInit & {
  companyId?: string | null;
  includeAuth?: boolean;
  query?: QueryParams;
};

// Lazy memoized getters — never dereference imports at module scope (rollup chunk-hosting TDZ risk).
let _apiBase: string | null = null;
const getApiBase = (): string => {
  if (!_apiBase) {
    _apiBase = getApiUrl().replace(/\/$/, "");
  }
  return _apiBase;
};
const getPublicBase = (): string => `${getApiBase()}/public`;

const hasWindow = typeof window !== "undefined";
const LOCAL_STORE_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "lvh.me"]);

const getStoredValue = (key: string): string | null => {
  if (!hasWindow) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStoredValue = (key: string, value: string) => {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in private mode or locked environments.
  }
};

const buildUrl = (base: string, path: string, query?: QueryParams): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = hasWindow ? window.location.origin : "http://localhost";
  const url = new URL(`${base}${normalizedPath}`, origin);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  const isTest = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.VITEST);
  if (base.startsWith("http") || isTest) {
    return url.toString();
  }

  return `${url.pathname}${url.search}${url.hash}`;
};

const parseResponseBody = async (response: Response): Promise<any> => {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return text ? { success: response.ok, data: text } : { success: response.ok };
  }

  try {
    return await response.json();
  } catch {
    return { success: response.ok };
  }
};

const createStorefrontError = (
  response: Response,
  payload: any,
): Error & { status: number; response: { status: number; data: any } } => {
  const message =
    payload?.message ||
    payload?.error ||
    `Request failed with status ${response.status}`;
  const error = new Error(message) as Error & {
    status: number;
    response: { status: number; data: any };
  };

  error.status = response.status;
  error.response = {
    status: response.status,
    data: payload,
  };

  return error;
};

export const getCartId = (): string | null =>
  getStoredValue("cart_session_id") ||
  getStoredValue("cart_id");

const getStoredAccessToken = (): string | null =>
  getStoredValue("accessToken") || getStoredValue("token");

const rememberCartId = (cartId: string) => {
  if (!cartId) return;
  setStoredValue("cart_session_id", cartId);
  setStoredValue("cart_id", cartId);
};

const PLATFORM_APP_HOSTS = new Set([
  "maxp.online",
  "www.maxp.online",
  "app.maxp.online",
  "admin.maxp.online",
  "dashboard.maxp.online",
  "api.maxp.online",
]);

const hasStableStorefrontHost = (hostname: string): boolean => {
  if (!hostname) {
    return false;
  }

  // Dashboard & settings routes are NEVER storefront hosts
  if (hasWindow) {
    const pathname = window.location.pathname || "";
    if (
      pathname.startsWith("/settings") ||
      pathname.startsWith("/home-builder") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/marketplace")
    ) {
      return false;
    }
  }

  const normalized = hostname.toLowerCase();

  // Root platform domains and dashboard subdomains are NOT storefront hosts
  if (PLATFORM_APP_HOSTS.has(normalized)) {
    return false;
  }

  if (normalized.endsWith(".localhost") || normalized.endsWith(".lvh.me")) {
    return true;
  }

  if (LOCAL_STORE_HOSTNAMES.has(normalized)) {
    return false;
  }

  if (
    normalized.startsWith("192.168.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("172.") ||
    normalized.endsWith(".local")
  ) {
    return false;
  }

  return true;
};

const buildStorefrontRequestContext = (
  options: StorefrontFetchOptions = {},
): { headers: Headers; query: QueryParams } => {
  const companyId = options.companyId ?? getCompanyId();
  const companyIdFromQuery = options.query?.["companyId"];
  const hostname = hasWindow ? window.location.hostname.trim().toLowerCase() : "";
  const shouldAppendCompanyIdToQuery =
    companyIdFromQuery !== undefined
      ? companyIdFromQuery
      : !hasStableStorefrontHost(hostname)
        ? companyId
        : undefined;

  const query: QueryParams = {
    ...(options.query || {}),
    companyId: shouldAppendCompanyIdToQuery ?? undefined,
  };
  const headers = new Headers(options.headers || {});

  if (companyId && !headers.has("x-company-id")) {
    headers.set("x-company-id", companyId);
  }

  const cartId = getCartId();
  if (cartId && !headers.has("x-cart-id")) {
    headers.set("x-cart-id", cartId);
  }

  if (options.includeAuth && !headers.has("Authorization")) {
    const token = getStoredAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return { headers, query };
};

export const getCompanyId = (): string | null => {
  if (!hasWindow) return null;

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("companyId");
  if (fromQuery) return fromQuery;

  const hostname = window.location.hostname.trim().toLowerCase();
  const pathname = window.location.pathname || "";
  const isPathScopedStorefront =
    pathname === "/store" || pathname.startsWith("/store/");

  // On stable storefront hosts (e.g. tenant subdomains, custom domains),
  // tenant identity is host-bound. Never bleed stale companyId from localStorage.
  if (!isPathScopedStorefront && hasStableStorefrontHost(hostname)) {
    return null;
  }

  return (
    getStoredValue("storefront_companyId") ||
    getStoredValue("currentCompanyId") ||
    getStoredValue("companyId")
  );
};

export const getStorefrontScope = (
  companyIdOverride?: string | null,
): string => {
  if (companyIdOverride) {
    return companyIdOverride;
  }

  if (!hasWindow) {
    return "server";
  }

  const params = new URLSearchParams(window.location.search);
  const companyIdFromQuery = params.get("companyId");
  if (companyIdFromQuery) {
    return companyIdFromQuery;
  }

  const hostname = window.location.hostname.trim().toLowerCase();
  const pathname = window.location.pathname || "";
  const isPathScopedStorefront =
    pathname === "/store" || pathname.startsWith("/store/");

  if (!isPathScopedStorefront && hasStableStorefrontHost(hostname)) {
    return hostname;
  }

  return (
    getStoredValue("storefront_companyId") ||
    getStoredValue("currentCompanyId") ||
    getStoredValue("companyId") ||
    hostname ||
    "server"
  );
};

export const storefrontFetch = async (
  path: string,
  options: StorefrontFetchOptions = {},
): Promise<any> => {
  const { headers, query } = buildStorefrontRequestContext(options);
  const url = buildUrl(getPublicBase(), path, query);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw createStorefrontError(response, payload);
  }

  return payload;
};

const productLandingFetch = async (
  path: string,
  options: StorefrontFetchOptions = {},
): Promise<any> => {
  const { headers, query } = buildStorefrontRequestContext(options);
  const url = buildUrl(getApiBase(), path, query);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw createStorefrontError(response, payload);
  }

  return payload;
};

const withJsonBody = (
  method: string,
  body?: object,
): Pick<RequestInit, "method" | "headers" | "body"> => ({
  method,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body || {}),
});

const getMarketplacePreviewOrderHandler = async () => {
  const isTest =
    typeof process !== "undefined" &&
    (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));
  const isBrowserPreview =
    typeof window !== "undefined" &&
    typeof window.location?.search === "string" &&
    window.location.search.includes("theme-marketplace-preview");

  if (!isBrowserPreview && !isTest) {
    return null;
  }

  try {
    return await import("../storefront/preview/marketplacePreviewOrder");
  } catch (error) {
    console.warn(
      "[storefrontApi] Failed to load marketplace preview handler:",
      error,
    );
    return null;
  }
};

export const storefrontApi = {
  getProducts: async (params: QueryParams = {}) => {
    return storefrontFetch("/products", { query: params });
  },

  getProduct: async (productId: string) => {
    return storefrontFetch(`/products/${encodeURIComponent(productId)}`);
  },

  getCategories: async () => {
    return storefrontFetch("/categories");
  },

  getProductLanding: async (slug: string) => {
    const normalizedSlug = String(slug || "").trim();
    if (!normalizedSlug) {
      throw new Error("Landing page slug is required");
    }

    return productLandingFetch(
      `/product-landings/public/${encodeURIComponent(normalizedSlug)}`,
    );
  },

  getProductLandingPreview: async (slug: string) => {
    const normalizedSlug = String(slug || "").trim();
    if (!normalizedSlug) {
      throw new Error("Landing page slug is required");
    }

    return productLandingFetch(
      `/product-landings/preview/${encodeURIComponent(normalizedSlug)}`,
      { includeAuth: true },
    );
  },

  trackProductLandingOrder: async (
    slug: string,
    payload: Record<string, unknown> = {},
  ) => {
    const normalizedSlug = String(slug || "").trim();
    if (!normalizedSlug) {
      return { success: false, message: "Landing page slug is required" };
    }

    return productLandingFetch(
      `/product-landings/public/${encodeURIComponent(normalizedSlug)}/order`,
      withJsonBody("POST", payload),
    );
  },

  /**
   * Fetch a public COD-Sales funnel page by slug. Returns the funnel config,
   * the linked product, and the company context. Used by FunnelCodSalesPage.
   *
   * The backend route lives at `/api/v1/funnels/public/:slug` (NOT
   * `/api/v1/public/funnels/public/:slug`). Funnel pages are product-landing
   * surfaces mounted under the merchant's tenant scope, so we go through
   * productLandingFetch which uses getApiBase() (`/api/v1`) — not
   * storefrontFetch which uses getPublicBase() (`/api/v1/public`).
   */
  getFunnel: async (
    slug: string,
    options: { companyId?: string | null; previewToken?: string | null } = {},
  ) => {
    const normalizedSlug = String(slug || "").trim();
    if (!normalizedSlug) {
      throw new Error("Funnel slug is required");
    }
    const params = new URLSearchParams();
    if (options.companyId) params.set("companyId", options.companyId);
    if (options.previewToken) params.set("previewToken", options.previewToken);
    const query = params.toString();
    return productLandingFetch(
      `/funnels/public/${encodeURIComponent(normalizedSlug)}${query ? `?${query}` : ""}`,
    );
  },

  /**
   * Track an order placed on a COD-Sales funnel. Bumps the funnel's
   * conversion counter for analytics — the real order itself is created
   * through storefrontApi.createOrder (standard order pipeline).
   */
  trackFunnelOrder: async (
    slug: string,
    payload: Record<string, unknown> = {},
  ) => {
    const normalizedSlug = String(slug || "").trim();
    if (!normalizedSlug) {
      throw new Error("Funnel slug is required");
    }
    return productLandingFetch(
      `/funnels/public/${encodeURIComponent(normalizedSlug)}/order`,
      withJsonBody("POST", payload),
    );
  },

  getTemplate: async (_layout?: string) => {
    return {
      success: false,
      data: null,
      message: "Legacy storefront template runtime has been removed.",
    };
  },

  getStoreInfo: async () => {
    return storefrontFetch("/store-info");
  },

  getCart: async () => {
    return storefrontFetch("/cart");
  },

  addToCart: async (payload: {
    productId: string;
    quantity?: number;
    variantId?: string;
    sessionId?: string;
  }) => {
    if (payload.sessionId) {
      rememberCartId(payload.sessionId);
    }

    const response = await storefrontFetch(
      "/cart",
      withJsonBody("POST", payload),
    );

    const responseCartId = response?.data?.cartId || response?.cartId;
    if (responseCartId) {
      rememberCartId(String(responseCartId));
    }

    return response;
  },

  updateCartItem: async (
    productId: string,
    payload: { quantity: number; variantId?: string | null },
  ) => {
    return storefrontFetch(
      `/cart/${encodeURIComponent(productId)}`,
      withJsonBody("PUT", payload),
    );
  },

  removeCartItem: async (productId: string, variantId?: string | null) => {
    return storefrontFetch(`/cart/${encodeURIComponent(productId)}`, {
      method: "DELETE",
      query: {
        variantId: variantId || undefined,
      },
    });
  },

  clearCart: async () => {
    return storefrontFetch("/cart/clear", { method: "DELETE" });
  },

  calculateShipping: async (
    governorate: string,
    companyIdOverride?: string | null,
    items?: ShippingQuoteItem[],
  ) => {
    const companyId = companyIdOverride ?? getCompanyId();
    if (!companyId) {
      return { success: false, data: { methods: [] } };
    }

    const normalizedItems = Array.isArray(items)
      ? items
          .map((item) => ({
            productId: String(item?.productId || "").trim(),
            variantId: item?.variantId ? String(item.variantId).trim() : undefined,
            quantity: Number(item?.quantity) || 1,
          }))
          .filter((item) => item.productId)
      : [];

    const url = buildUrl(
      getApiBase(),
      `/shipping-zones/public/${encodeURIComponent(companyId)}/calculate`,
      normalizedItems.length > 0 ? undefined : { governorate },
    );
    const response = await fetch(url, {
      method: normalizedItems.length > 0 ? "POST" : "GET",
      credentials: "include",
      headers:
        normalizedItems.length > 0
          ? {
              "Content-Type": "application/json",
            }
          : undefined,
      body:
        normalizedItems.length > 0
          ? JSON.stringify({
              governorate,
              items: normalizedItems,
            })
          : undefined,
    });
    const payload = await parseResponseBody(response);

    if (!response.ok) {
      throw createStorefrontError(response, payload);
    }

    return payload;
  },

  getTierProgress: async (phone: string) => {
    const params: Record<string, string> = { phone };
    const companyId = getCompanyId();
    if (companyId) params['companyId'] = companyId;
    const url = buildUrl(getApiBase(), "/public/loyalty/tier-progress", params);
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });
    const payload = await parseResponseBody(response);
    if (!response.ok) {
      throw createStorefrontError(response, payload);
    }
    return payload;
  },

  validateCoupon: async (
    companyId: string,
    couponCode: string,
    orderAmount: number,
  ) => {
    return storefrontFetch(
      "/coupons/validate",
      withJsonBody("POST", {
        companyId,
        code: couponCode,
        couponCode,
        orderAmount,
      }),
    );
  },

  createOrder: async (payload: Record<string, unknown>) => {
    try {
      const previewModule = await getMarketplacePreviewOrderHandler();
      if (previewModule?.createMarketplacePreviewOrderResponse) {
        const previewResponse =
          previewModule.createMarketplacePreviewOrderResponse(payload);
        if (previewResponse) {
          return previewResponse;
        }
      }
    } catch (previewErr) {
      console.warn(
        "[storefrontApi] Marketplace preview order check bypassed:",
        previewErr,
      );
    }

    return storefrontFetch(
      "/orders",
      withJsonBody("POST", payload),
    );
  },

  uploadWalletProof: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return storefrontFetch("/orders/wallet-proof/upload", {
      method: "POST",
      body: formData,
    });
  },

  getMinimumOrderSettings: async () => {
    return storefrontFetch("/orders/minimum-settings");
  },

  saveCheckoutDraft: async (payload: object) => {
    let enrichedPayload = payload;
    try {
      const { getStorefrontSessionDetails } = await import("../storefront/utils/storefrontSessionTracker");
      const sessionDetails = (payload as any)?.sessionDetails || getStorefrontSessionDetails();
      if (sessionDetails) {
        enrichedPayload = {
          ...payload,
          sessionDetails,
        };
      }
    } catch {
      // Ignore tracker import failures
    }

    setStoredValue("storefront_checkout_draft", JSON.stringify(enrichedPayload));

    try {
      const response = await storefrontFetch(
        "/orders/checkout-draft",
        withJsonBody("POST", enrichedPayload),
      );

      const responseCartId = response?.data?.cartId || response?.cartId;
      if (responseCartId) {
        rememberCartId(String(responseCartId));
      }

      return response;
    } catch (error) {
      return {
        success: false,
        localOnly: true,
        data: payload,
        message:
          error instanceof Error
            ? error.message
            : "Failed to persist checkout draft",
      };
    }
  },

  getWalletBalance: async () => {
    try {
      const { apiClient } = await import("../services/apiClient");
      const response = await apiClient.get("/wallet/balance");
      return response.data;
    } catch {
      return { success: false, data: { balance: 0, currency: "EGP" } };
    }
  },

  getWalletTransactions: async (params: QueryParams = {}) => {
    try {
      const { apiClient } = await import("../services/apiClient");
      const response = await apiClient.get("/wallet/transactions", { params });
      return response.data;
    } catch {
      return { success: false, data: { transactions: [] } };
    }
  },

  trackOrder: async (orderNumber: string, phoneNumber: string) => {
    try {
      const previewModule = await getMarketplacePreviewOrderHandler();
      if (previewModule?.trackMarketplacePreviewOrder) {
        const previewResponse =
          previewModule.trackMarketplacePreviewOrder(orderNumber, phoneNumber);
        if (previewResponse) {
          return previewResponse;
        }
      }
    } catch (previewErr) {
      console.warn(
        "[storefrontApi] Marketplace preview track check bypassed:",
        previewErr,
      );
    }

    return storefrontFetch("/orders/track", {
      method: "GET",
      query: {
        orderNumber,
        phone: phoneNumber,
      },
    });
  },

  kashierCheckout: async (payload: Record<string, unknown>) => {
    const { headers } = buildStorefrontRequestContext();
    headers.set("Content-Type", "application/json");
    const url = buildUrl(getApiBase(), "/payment/kashier/checkout");
    const response = await fetch(url, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await parseResponseBody(response);
    if (!response.ok) {
      throw createStorefrontError(response, data);
    }
    return data;
  },

  getPostPurchaseOffer: async () => {
    return storefrontFetch("/post-purchase-offer", {
      method: "GET",
    });
  },

  acceptPostPurchaseOffer: async (
    orderId: string,
    payload: Record<string, unknown>,
  ) => {
    return storefrontFetch(
      `/orders/${encodeURIComponent(orderId)}/accept-offer`,
      withJsonBody("POST", payload),
    );
  },

  getPublicOrder: async (orderId: string) => {
    return storefrontFetch(`/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
    });
  },
};

export default storefrontApi;
