import { getApiUrl } from "../../config/environment";
import { getCompanyId } from "../../utils/storefrontApi";

type AnalyticsPayload = Record<string, unknown>;

// Lazy memoized getter — never dereference imports at module scope (rollup chunk-hosting TDZ risk).
let _apiBase: string | null = null;
const getApiBase = (): string => {
  if (!_apiBase) {
    _apiBase = getApiUrl().replace(/\/$/, "");
  }
  return _apiBase;
};
const SESSION_DURATION_MS = 30 * 60 * 1000;

const readStorage = (
  storage: "localStorage" | "sessionStorage",
  key: string,
): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (
  storage: "localStorage" | "sessionStorage",
  key: string,
  value: string,
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window[storage].setItem(key, value);
  } catch {
    // Ignore restricted browser storage contexts.
  }
};

const buildDedupeKey = (
  ...parts: Array<string | number | null | undefined>
): string =>
  parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(":");

const getOrCreateSessionId = (): string => {
  const now = Date.now();
  const storedSession = readStorage("localStorage", "analytics_session");

  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession) as {
        sessionId?: string;
        expiresAt?: number;
      };

      if (parsed.sessionId && Number(parsed.expiresAt) > now) {
        writeStorage(
          "localStorage",
          "analytics_session",
          JSON.stringify({
            sessionId: parsed.sessionId,
            expiresAt: now + SESSION_DURATION_MS,
          }),
        );
        return parsed.sessionId;
      }
    } catch {
      // Fall through and create a fresh session.
    }
  }

  const sessionId = `session_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 11)}`;
  writeStorage(
    "localStorage",
    "analytics_session",
    JSON.stringify({
      sessionId,
      expiresAt: now + SESSION_DURATION_MS,
    }),
  );
  return sessionId;
};

const getTrackingCompanyId = (): string | null => {
  const companyId = getCompanyId();
  if (companyId) {
    return companyId;
  }

  return readStorage("localStorage", "storefront_companyId");
};

const postAnalyticsEvent = async (
  endpoint: string,
  payload: AnalyticsPayload,
): Promise<void> => {
  const companyId = getTrackingCompanyId();
  if (!companyId) {
    return;
  }

  try {
    await fetch(`${getApiBase()}/analytics/track/${endpoint}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-company-id": companyId,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics should never block storefront browsing or checkout.
  }
};

const hasTracked = (
  storage: "localStorage" | "sessionStorage",
  key: string,
): boolean => readStorage(storage, key) === "1";

const markTracked = (
  storage: "localStorage" | "sessionStorage",
  key: string,
) => writeStorage(storage, key, "1");

export const storefrontAnalytics = {
  async trackStoreVisit(landingPage?: string) {
    const companyId = getTrackingCompanyId();
    if (!companyId) {
      return;
    }

    const sessionId = getOrCreateSessionId();
    const dedupeKey = buildDedupeKey(
      "analytics_store_visit",
      companyId,
      sessionId,
    );
    if (hasTracked("sessionStorage", dedupeKey)) {
      return dedupeKey;
    }

    await postAnalyticsEvent("store-visit", {
      sessionId,
      ipAddress: null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      landingPage:
        landingPage ||
        (typeof window !== "undefined" ? window.location.pathname : "/"),
    });

    markTracked("sessionStorage", dedupeKey);
    return dedupeKey;
  },

  async trackProductView(productId: string, source?: string) {
    await postAnalyticsEvent("product-view", {
      productId,
      sessionId: getOrCreateSessionId(),
      source,
    });
  },

  async trackAddToCart(productId: string, value: number) {
    await postAnalyticsEvent("conversion", {
      sessionId: getOrCreateSessionId(),
      eventType: "add_to_cart",
      productId,
      value,
    });
  },

  async trackCheckout(value: number, productIds: string[]) {
    const companyId = getTrackingCompanyId();
    if (!companyId) {
      return;
    }

    const normalizedProductIds = productIds
      .map((productId) => String(productId || "").trim())
      .filter(Boolean);
    const sessionId = getOrCreateSessionId();
    const dedupeKey = buildDedupeKey(
      "analytics_checkout",
      companyId,
      sessionId,
      value.toFixed(2),
      normalizedProductIds.join("|"),
    );
    if (hasTracked("sessionStorage", dedupeKey)) {
      return dedupeKey;
    }

    await postAnalyticsEvent("conversion", {
      sessionId,
      eventType: "checkout",
      value,
      metadata: { productIds: normalizedProductIds },
    });

    markTracked("sessionStorage", dedupeKey);
    return dedupeKey;
  },

  async trackPurchase(
    orderId: string | null | undefined,
    value: number,
    productIds: string[],
  ) {
    const companyId = getTrackingCompanyId();
    if (!companyId) {
      return;
    }

    const normalizedProductIds = Array.from(
      new Set(
        productIds
          .map((productId) => String(productId || "").trim())
          .filter(Boolean),
      ),
    );
    if (normalizedProductIds.length === 0) {
      return;
    }

    const sessionId = getOrCreateSessionId();
    const orderReference = String(orderId || "").trim();
    const dedupeKey = buildDedupeKey(
      "analytics_purchase",
      companyId,
      orderReference || sessionId,
      value.toFixed(2),
      normalizedProductIds.join("|"),
    );
    if (hasTracked("localStorage", dedupeKey)) {
      return dedupeKey;
    }

    await Promise.all(
      normalizedProductIds.map((productId) =>
        postAnalyticsEvent("conversion", {
          sessionId,
          eventType: "purchase",
          orderId: orderReference || undefined,
          productId,
          value: value / normalizedProductIds.length,
          metadata: { allProductIds: normalizedProductIds },
        }),
      ),
    );

    markTracked("localStorage", dedupeKey);
    return dedupeKey;
  },
};

export default storefrontAnalytics;
