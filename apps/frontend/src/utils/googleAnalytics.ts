/**
 * Google Analytics 4 (GA4) + Google Ads conversion tracking utility.
 *
 * Loads the standard `gtag` snippet once and configures both the GA4
 * measurement ID (`G-XXXXXXX`) and the optional Google Ads conversion ID
 * (`AW-XXXXXXX`), then exposes helpers to fire standard events.
 */

type GtagParams = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

const GTAG_SCRIPT_SRC = "https://www.googletagmanager.com/gtag/js";

let configuredMeasurementId: string | null = null;
let configuredAdsConversionId: string | null = null;

const hasGtag = (): boolean =>
  typeof window !== "undefined" && typeof window.gtag === "function";

/**
 * Ensures the `window.dataLayer` array and `window.gtag` stub exist so events
 * fired before the script loads are queued and replayed by gtag.js.
 */
const ensureGtag = (): ((...args: unknown[]) => void) | null => {
  if (typeof window === "undefined") return null;
  const win = window as Window;
  if (!Array.isArray(win.dataLayer)) {
    win.dataLayer = [];
  }
  if (typeof win.gtag !== "function") {
    win.gtag = (...args: unknown[]) => {
      (win.dataLayer as unknown[][]).push(args);
    };
  }
  return win.gtag;
};

const injectGtagScript = (id: string): void => {
  if (typeof document === "undefined") return;
  const scriptSrc = `${GTAG_SCRIPT_SRC}?id=${encodeURIComponent(id)}&l=dataLayer`;
  if (document.querySelector(`script[src="${scriptSrc}"]`)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = scriptSrc;
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
};

/**
 * Loads Google Analytics 4 and optionally Google Ads conversion tracking.
 * Safe to call multiple times ΓÇö each ID is only configured once.
 */
export const loadGoogleAnalytics = (
  measurementIdParam?: string | null,
  adsConversionIdParam?: string | null,
): void => {
  const measurementId = (measurementIdParam || "").trim();
  const adsConversionId = (adsConversionIdParam || "").trim();
  if (!measurementId && !adsConversionId) return;

  const gtag = ensureGtag();
  if (!gtag) return;

  if (measurementId && measurementId !== configuredMeasurementId) {
    configuredMeasurementId = measurementId;
    injectGtagScript(measurementId);
    gtag("js", new Date());
    gtag("config", measurementId);
  }

  if (adsConversionId && adsConversionId !== configuredAdsConversionId) {
    configuredAdsConversionId = adsConversionId;
    if (!measurementId) {
      injectGtagScript(adsConversionId);
      gtag("js", new Date());
    }
    gtag("config", adsConversionId);
  }
};

export const isGoogleAnalyticsInitialized = (): boolean => hasGtag();

export const getGoogleMeasurementId = (): string | null => configuredMeasurementId;

export const getGoogleAdsConversionId = (): string | null => configuredAdsConversionId;

/**
 * Pushes a gtag event. No-op when gtag isn't available.
 */
export const pushGoogleEvent = (
  eventName: string,
  params: GtagParams = {},
): void => {
  if (!hasGtag()) return;
  window.gtag?.("event", eventName, params);
};

export type GoogleEcommerceItem = {
  item_id: string;
  item_name?: string;
  item_category?: string;
  price?: number;
  quantity?: number;
};

/**
 * Standard GA4 ecommerce event helpers.
 */
export const trackGoogleViewContent = (
  item: GoogleEcommerceItem,
  currency?: string,
): void => {
  pushGoogleEvent("view_item", {
    currency: currency || "EGP",
    items: [item],
  });
};

export const trackGoogleAddToCart = (
  item: GoogleEcommerceItem,
  currency?: string,
): void => {
  pushGoogleEvent("add_to_cart", {
    currency: currency || "EGP",
    items: [item],
  });
};

export const trackGoogleBeginCheckout = (
  items: GoogleEcommerceItem[],
  value: number,
  currency?: string,
): void => {
  pushGoogleEvent("begin_checkout", {
    currency: currency || "EGP",
    value,
    items,
  });
};

export const trackGooglePurchase = (
  transactionId: string,
  items: GoogleEcommerceItem[],
  value: number,
  currency?: string,
): void => {
  pushGoogleEvent("purchase", {
    currency: currency || "EGP",
    transaction_id: transactionId,
    value,
    items,
  });
};

export const trackGoogleSearch = (searchTerm: string): void => {
  pushGoogleEvent("search", { search_term: searchTerm });
};

/**
 * Sends the standard GA4 `page_view` event on SPA navigations.
 */
export const trackGooglePageView = (
  pagePath?: string,
  pageTitle?: string,
): void => {
  pushGoogleEvent("page_view", {
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
    page_path: pagePath,
    page_title: pageTitle,
  });
};
