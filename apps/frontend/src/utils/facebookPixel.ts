/**
 * Facebook Pixel Utility
 *
 * هذا الملف مسؤول عن:
 * 1. تحميل Pixel Script في المتصفح
 * 2. إرسال الأحداث لـ Facebook
 * 3. Event Deduplication (منع التكرار)
 */

const nativeConsole = globalThis.console;
const isLocalDevelopmentHost = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
};

const isFacebookPixelDebugEnabled = (): boolean => {
  if (isLocalDevelopmentHost()) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem("debug-facebook-pixel") === "1";
  } catch {
    return false;
  }
};

const console = {
  log: (...args: unknown[]) => {
    if (isFacebookPixelDebugEnabled()) {
      nativeConsole.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isFacebookPixelDebugEnabled()) {
      nativeConsole.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isFacebookPixelDebugEnabled()) {
      nativeConsole.error(...args);
    }
  },
};

// Based on Meta's current browser validator inside `fbevents.js`.
// Standard ISO currencies (including EGP, SAR, AED, KWD, USD, EUR) use standard Purchase `track`.
// Any truly unsupported/custom currency will use `trackCustom` fallback.
const META_STANDARD_PURCHASE_SUPPORTED_CURRENCIES = new Set([
  "AED",
  "ARS",
  "AUD",
  "BHD",
  "BOB",
  "BRL",
  "CAD",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CRC",
  "CZK",
  "DKK",
  "DZD",
  "EGP",
  "EUR",
  "GBP",
  "GTQ",
  "HKD",
  "HNL",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "IQD",
  "ISK",
  "JOD",
  "JPY",
  "KRW",
  "KWD",
  "LYD",
  "MAD",
  "MOP",
  "MXN",
  "MYR",
  "NIO",
  "NOK",
  "NZD",
  "OMR",
  "PEN",
  "PHP",
  "PLN",
  "PYG",
  "QAR",
  "RON",
  "RUB",
  "SAR",
  "SEK",
  "SGD",
  "THB",
  "TND",
  "TRY",
  "TWD",
  "USD",
  "UYU",
  "VEF",
  "VND",
  "ZAR",
]);

const supportsStandardPurchaseMonetaryFields = (currency: string): boolean =>
  META_STANDARD_PURCHASE_SUPPORTED_CURRENCIES.has(currency.toUpperCase());

type FacebookPixelEventData = Record<string, unknown>;
type PurchaseEventDispatchResult = {
  trackingMethod: "track" | "trackCustom";
  monetaryFieldsMode: "included" | "unsupported_currency_track_custom";
  eventData: FacebookPixelEventData;
};
export const createFacebookPurchaseDispatchPlan = (
  eventData: FacebookPixelEventData,
  resolvedCurrency: string,
): PurchaseEventDispatchResult => {
  if (supportsStandardPurchaseMonetaryFields(resolvedCurrency)) {
    return {
      trackingMethod: "track",
      monetaryFieldsMode: "included",
      eventData,
    };
  }

  return {
    trackingMethod: "trackCustom",
    monetaryFieldsMode: "unsupported_currency_track_custom",
    eventData,
  };
};
type FacebookPixelBraveApi = {
  isBrave?: unknown;
};

interface FacebookPixelFunction {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: FacebookPixelFunction;
  loaded?: boolean;
  version?: string;
}

type FacebookPixelWindow = Window & {
  fbq?: FacebookPixelFunction;
  _fbq?: FacebookPixelFunction;
  brave?: FacebookPixelBraveApi;
};

const getWindowObject = (): FacebookPixelWindow | null =>
  typeof window === "undefined" ? null : (window as FacebookPixelWindow);

const getFbq = (): FacebookPixelFunction | null => getWindowObject()?.fbq ?? null;
const hasFbq = (): boolean => typeof getFbq() === "function";
const invokeFbq = (...args: unknown[]): boolean => {
  const fbq = getFbq();
  if (!fbq) {
    return false;
  }

  fbq(...args);
  return true;
};

// 2026 Ad Tech Architecture: Multi-tenant targeted pixel state
export interface FacebookPixelSecondaryConfig {
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
}

export interface LoadFacebookPixelOptions {
  isPreview?: boolean;
}

// تخزين Pixel ID والحالة المعزولة
let pixelId: string | null = null;
let activeSecondaryConfigs: FacebookPixelSecondaryConfig[] = [];
let isInitialized = false;

/**
 * إعادة ضبط حالة بكسل فيسبوك عند تبديل المتجر أو إنهاء الجلسة
 * يمنع تسريب وتداخل الأحداث بين المتاجر في تطبيقات الصفحة الواحدة (SPA)
 */
export const resetFacebookPixel = () => {
  pixelId = null;
  activeSecondaryConfigs = [];
  isInitialized = false;
};

/**
 * إرسال حدث مستهدف لبكسل محدد (fbq trackSingle) لمنع البث العام العشوائي لجميع البكسلات في المتصفح
 */
export const dispatchTargetedFbqEvent = (
  method: "track" | "trackCustom",
  eventName: string,
  eventData: FacebookPixelEventData = {},
  options?: Record<string, unknown>,
  eventKey?: keyof FacebookPixelSecondaryConfig,
) => {
  if (!isInitialized || typeof window === "undefined" || !hasFbq() || !pixelId) {
    return;
  }

  const singleMethod = method === "trackCustom" ? "trackSingleCustom" : "trackSingle";

  // 1. استهداف البكسل الأساسي النشط حصراً
  invokeFbq(singleMethod, pixelId, eventName, eventData, options);

  // 2. استهداف البكسلات الثانوية فقط إذا كانت مسموحة في إعدادات التاجر
  if (Array.isArray(activeSecondaryConfigs) && activeSecondaryConfigs.length > 0) {
    activeSecondaryConfigs.forEach((cfg) => {
      const trimmedId = cfg.pixelId?.trim();
      if (!trimmedId || trimmedId === pixelId) return;
      if (eventKey && cfg[eventKey] === false) {
        return; // محظور لهذا البكسل الثانوي طبقاً لإعدادات التاجر
      }
      invokeFbq(singleMethod, trimmedId, eventName, eventData, options);
    });
  }
};

// Helper function to wait for Pixel to be ready (same mechanism as PageView)
const waitForPixel = (callback: () => void, maxAttempts = 10, attempt = 1) => {
  if (isInitialized && hasFbq() && pixelId) {
    callback();
  } else if (attempt < maxAttempts) {
    setTimeout(() => waitForPixel(callback, maxAttempts, attempt + 1), 200);
  } else {
    console.warn(
      "⚠️ [waitForPixel] Pixel not ready after",
      maxAttempts,
      "attempts",
      {
        isInitialized,
        hasWindow: typeof window !== "undefined",
        hasFbq: typeof window !== "undefined" && hasFbq(),
        hasPixelId: !!pixelId,
      },
    );
  }
};

/**
 * التحقق من Brave Browser
 * Brave Browser قد يحظر Pixel Script تلقائيا
 * @returns {boolean} true إذا كان Brave Browser
 */
export const isBraveBrowser = (): boolean => {
  const braveApi = getWindowObject()?.brave;
  if (!braveApi) return false;

  // Check for Brave-specific properties
  const hasBrave = !!braveApi.isBrave;
  const userAgent = navigator.userAgent || "";
  const isBraveUA = /brave/i.test(userAgent);

  return hasBrave || isBraveUA;
};

/**
 * التحقق من iPhone/iOS
 * @returns {boolean} true إذا كان iPhone/iOS
 */
export const isIOSDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  return /iphone|ipad|ipod|ios/i.test(userAgent);
};

/**
 * التحقق مما إذا كان الجهاز يحتاج CAPI فقط
 * (Brave Browser أو iPhone/iOS)
 * @returns {boolean} true إذا كان يحتاج CAPI فقط
 */
export const needsCAPIOnly = (): boolean => {
  return isBraveBrowser() || isIOSDevice();
};

/**
 * تحميل Facebook Pixel Script بمعايير 2026:
 * - حظر التحميل في وضع المعاينة (Zero Noise in Previews)
 * - إعادة الضبط عند تغيير المتجر
 * - استيعاب البكسلات الثانوية مع إعداداتها الفردية
 */
export const loadFacebookPixel = (
  pixelIdParam: string,
  additionalPixelConfigsOrIds: Array<string | FacebookPixelSecondaryConfig> = [],
  options?: LoadFacebookPixelOptions,
) => {
  // حظر تام لأي تتبع في أوضاع المعاينة أو اختبارات الأدمن
  if (options?.isPreview) {
    resetFacebookPixel();
    return;
  }

  const normalizedPixelId = pixelIdParam?.trim();

  if (!normalizedPixelId) {
    return;
  }

  if (!/^\d{14,18}$/.test(normalizedPixelId)) {
    return;
  }

  // تجريد البكسلات الإضافية وتوحيدها
  const parsedSecondaryConfigs: FacebookPixelSecondaryConfig[] = [];
  const secondaryIdsToInit: string[] = [];

  (additionalPixelConfigsOrIds || []).forEach((item) => {
    if (typeof item === "string") {
      const id = item.trim();
      if (id && id !== normalizedPixelId && /^\d{14,18}$/.test(id)) {
        parsedSecondaryConfigs.push({ pixelId: id });
        secondaryIdsToInit.push(id);
      }
    } else if (item && typeof item === "object") {
      const id = String(item.pixelId || "").trim();
      if (id && id !== normalizedPixelId && /^\d{14,18}$/.test(id)) {
        parsedSecondaryConfigs.push({ ...item, pixelId: id });
        secondaryIdsToInit.push(id);
      }
    }
  });

  // إذا كان البكسل السابق مختلفاً عن الحالي، نقوم بإعادة الضبط لضمان عزل المتجر
  if (isInitialized && pixelId && pixelId !== normalizedPixelId) {
    resetFacebookPixel();
  }

  pixelId = normalizedPixelId;
  activeSecondaryConfigs = parsedSecondaryConfigs;

  if (isInitialized) {
    // إذا كان مهيأ بالفعل لنفس البكسل، نضمن فقط تسجيل أي بكسل ثانوي جديد عبر شرائح الخمول
    if (hasFbq() && secondaryIdsToInit.length > 0) {
      const queue = [...secondaryIdsToInit];
      const processNextBatch = () => {
        if (!queue.length) return;
        const batch = queue.splice(0, 2);
        batch.forEach((addId) => {
          invokeFbq("init", addId);
        });
        if (queue.length > 0) {
          if (typeof window !== "undefined" && "requestIdleCallback" in window) {
            (window as any).requestIdleCallback(processNextBatch, { timeout: 1000 });
          } else {
            window.setTimeout(processNextBatch, 180);
          }
        }
      };
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(processNextBatch, { timeout: 1000 });
      } else {
        window.setTimeout(processNextBatch, 150);
      }
    }
    return;
  }

  try {
    const windowObj = getWindowObject();
    if (!windowObj) {
      return;
    }

    if (!windowObj.fbq) {
      const fbqStub = ((...args: unknown[]) => {
        if (fbqStub.callMethod) {
          fbqStub.callMethod(...args);
        } else {
          fbqStub.queue.push(args);
        }
      }) as FacebookPixelFunction;

      if (!windowObj._fbq) {
        windowObj._fbq = fbqStub;
      }
      fbqStub.push = fbqStub;
      fbqStub.loaded = true;
      fbqStub.version = "2.0";
      fbqStub.queue = [];
      windowObj.fbq = fbqStub;
    }

    const injectPixel = () => {
      const pixelScriptSrc = "https://connect.facebook.net/en_US/fbevents.js";
      const hasScript = !!document.querySelector(
        `script[src="${pixelScriptSrc}"]`,
      );

      if (!hasScript) {
        const scriptElement = document.createElement("script");
        scriptElement.async = true;
        scriptElement.defer = true;
        scriptElement.src = pixelScriptSrc;
        document.head.appendChild(scriptElement);
      }
    };

    // Strategy: Non-blocking injection via idle or passive movement (never block click/keydown)
    const interactionEvents = ["pointermove", "scroll"];
    let injected = false;

    const handleInteraction = () => {
      if (injected) return;
      injected = true;
      
      // Cleanup listeners
      interactionEvents.forEach(event => {
        window.removeEventListener(event, handleInteraction);
      });

      // Inject during idle time so it never contends with UI interaction frames
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(injectPixel, { timeout: 2000 });
      } else {
        window.setTimeout(injectPixel, 120);
      }
    };

    // Setup listeners for early passive interaction
    interactionEvents.forEach(event => {
      window.addEventListener(event, handleInteraction, { once: true, passive: true });
    });

    // Fallback timer (5 seconds)
    window.setTimeout(() => {
      if (!injected) {
        handleInteraction();
      }
    }, 5000);

    // Primary pixel is initialized immediately for instant Meta Pixel Helper green status & attribution
    invokeFbq("init", pixelId);

    // 2026 Hybrid Architecture: Stagger secondary backup pixels across idle slices
    // Eliminates the massive 8-24s thread blockage caused by evaluating 20+ pixel instances simultaneously.
    if (secondaryIdsToInit.length > 0) {
      const queue = [...secondaryIdsToInit];
      const processNextBatch = () => {
        if (!queue.length) return;
        const batch = queue.splice(0, 2);
        batch.forEach((addId) => {
          invokeFbq("init", addId);
        });

        if (queue.length > 0) {
          if (typeof window !== "undefined" && "requestIdleCallback" in window) {
            (window as any).requestIdleCallback(processNextBatch, { timeout: 1000 });
          } else {
            window.setTimeout(processNextBatch, 180);
          }
        }
      };

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(processNextBatch, { timeout: 1500 });
      } else {
        window.setTimeout(processNextBatch, 250);
      }
    }

    const appendNoscript = () => {
      if (
        document.querySelector(
          `noscript[data-facebook-pixel-id="${pixelId}"]`,
        )
      ) {
        return;
      }

      const noscript = document.createElement("noscript");
      noscript.dataset["facebookPixelId"] = normalizedPixelId;

      const img = document.createElement("img");
      img.height = 1;
      img.width = 1;
      img.style.display = "none";
      img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
      noscript.appendChild(img);

      document.body.appendChild(noscript);
    };

    if (document.body) {
      appendNoscript();
    } else {
      window.addEventListener("DOMContentLoaded", appendNoscript, { once: true });
    }

    const markInitialized = () => {
      if (typeof window !== "undefined" && hasFbq()) {
        isInitialized = true;
        return true;
      }

      return false;
    };

    if (!markInitialized()) {
      const readinessInterval = window.setInterval(() => {
        if (markInitialized()) {
          window.clearInterval(readinessInterval);
        }
      }, 250);

      window.setTimeout(() => window.clearInterval(readinessInterval), 5000);
    }
  } catch (error) {
    console.error("Failed to load Facebook Pixel", error);
  }
};

/**
 * توليد Event ID فريد لمنع التكرار بين Pixel و CAPI
 */
const generateEventId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const resolveFacebookCurrency = (currency?: string): string => {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : "USD";
};

const dispatchPurchaseEvent = (
  finalEventId: string,
  eventData: FacebookPixelEventData,
  resolvedCurrency: string,
): PurchaseEventDispatchResult => {
  const purchaseDispatch = createFacebookPurchaseDispatchPlan(
    eventData,
    resolvedCurrency,
  );

  dispatchTargetedFbqEvent(
    purchaseDispatch.trackingMethod,
    "Purchase",
    purchaseDispatch.eventData,
    {
      eventID: finalEventId,
    },
    "trackPurchase",
  );

  return purchaseDispatch;
};

/**
 * إرسال حدث PageView
 */
export const trackPageView = () => {
  if (!isInitialized || typeof window === "undefined" || !hasFbq()) {
    return;
  }

  const eventId = generateEventId();

  if (!pixelId) {
    return;
  }

  try {
    dispatchTargetedFbqEvent(
      "track",
      "PageView",
      {},
      { eventID: eventId },
      "trackPageView",
    );
  } catch (error) {
    console.error("Failed to track Facebook PageView", error);
    return;
  }

  return eventId;
};

/**
 * إرسال حدث ViewContent (عرض منتج)
 */
export const trackViewContent = (product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}, currency = "EGP") => {
  const resolvedCurrency = resolveFacebookCurrency(currency);
  console.log("Ã°Å¸â€Â [trackViewContent] Function called", {
    productId: product.id,
    productName: product.name,
    price: product.price,
    category: product.category || "N/A",
    isInitialized,
    hasWindow: typeof window !== "undefined",
    hasFbq: typeof window !== "undefined" && hasFbq(),
    pixelId,
  });

  // Check if Pixel is ready immediately (same check as PageView)
  if (
    !isInitialized ||
    typeof window === "undefined" ||
    !hasFbq() ||
    !pixelId
  ) {
    console.warn(
      "Ã¢Å¡Â Ã¯Â¸Â [trackViewContent] Cannot track - Pixel not ready or Pixel ID missing, will retry",
      {
        isInitialized,
        hasWindow: typeof window !== "undefined",
        hasFbq: typeof window !== "undefined" && hasFbq(),
        hasPixelId: !!pixelId,
      },
    );
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackViewContent] Pixel ID is missing after wait");
        return;
      }

      const eventId = generateEventId();
      const eventData = {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        content_category: product.category || "",
        value: product.price,
        currency: resolvedCurrency,
      };

      try {
        // Ensure init is called before track (same pattern as AddToCart)

        // Small delay to ensure initialization completes before tracking
        setTimeout(() => {
          dispatchTargetedFbqEvent(
            "track",
            "ViewContent",
            eventData,
            { eventID: eventId },
            "trackViewContent",
          );
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=ViewContent`;
          console.log(
            "Ã¢Å“â€¦ [Facebook Pixel] ViewContent tracked successfully (after retry)",
            {
              productId: product.id,
              productName: product.name,
              price: product.price,
              category: product.category || "N/A",
              eventId,
              pixelId,
              url: trackingUrl,
              eventData,
            },
          );

        }, 50); // Small delay to ensure init completes
      } catch (error) {
        console.error(
          "Ã¢ÂÅ’ [trackViewContent] Error calling fbq (after retry):",
          error,
        );
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackViewContent] Pixel ID is missing");
    return;
  }

  const eventId = generateEventId();
  const eventData = {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    content_category: product.category || "",
    value: product.price,
    currency: resolvedCurrency,
  };

  try {
    // Ensure init is called before track

    setTimeout(() => {
      dispatchTargetedFbqEvent(
        "track",
        "ViewContent",
        eventData,
        { eventID: eventId },
        "trackViewContent",
      );
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=ViewContent`;
      console.log("Ã¢Å“â€¦ [Facebook Pixel] ViewContent tracked successfully", {
        productId: product.id,
        productName: product.name,
        price: product.price,
        category: product.category || "N/A",
        eventId,
        pixelId,
        url: trackingUrl,
        eventData,
      });

    }, 50);
  } catch (error) {
    console.error("Ã¢ÂÅ’ [trackViewContent] Error calling fbq:", error);
    return;
  }

  return eventId;
};

/**
 * Ã˜Â¥Ã˜Â±Ã˜Â³Ã˜Â§Ã™â€ž Ã˜Â­Ã˜Â¯Ã˜Â« AddToCart (Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™â€žÃ™â€žÃ˜Â³Ã™â€žÃ˜Â©)
 */
export const trackAddToCart = (product: {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}, currency = "EGP") => {
  const resolvedCurrency = resolveFacebookCurrency(currency);
  console.log("Ã°Å¸â€Â [trackAddToCart] Function called", {
    productId: product.id,
    productName: product.name,
    price: product.price,
    quantity: product.quantity || 1,
    isInitialized,
    hasWindow: typeof window !== "undefined",
    hasFbq: typeof window !== "undefined" && hasFbq(),
    pixelId,
  });

  // Check if Pixel is ready immediately (same check as PageView)
  if (
    !isInitialized ||
    typeof window === "undefined" ||
    !hasFbq() ||
    !pixelId
  ) {
    console.warn(
      "Ã¢Å¡Â Ã¯Â¸Â [trackAddToCart] Cannot track - Pixel not ready or Pixel ID missing, will retry",
      {
        isInitialized,
        hasWindow: typeof window !== "undefined",
        hasFbq: typeof window !== "undefined" && hasFbq(),
        hasPixelId: !!pixelId,
      },
    );
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackAddToCart] Pixel ID is missing after wait");
        return;
      }

      const eventId = generateEventId();
      const quantity = product.quantity || 1;
      const eventData = {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        contents: [
          {
            id: product.id,
            quantity: quantity,
            item_price: product.price,
          },
        ],
        value: product.price * quantity,
        currency: resolvedCurrency,
        num_items: quantity,
      };

      try {
        // Ensure init is called before track (same pattern as main function)

        // Small delay to ensure initialization completes before tracking
        setTimeout(() => {
          dispatchTargetedFbqEvent(
            "track",
            "AddToCart",
            eventData,
            { eventID: eventId },
            "trackAddToCart",
          );
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=AddToCart`;
          console.log(
            "Ã¢Å“â€¦ [Facebook Pixel] AddToCart tracked successfully (after retry)",
            {
              productId: product.id,
              productName: product.name,
              quantity: quantity,
              value: product.price * quantity,
              eventId,
              pixelId,
              url: trackingUrl,
              eventData,
            },
          );

        }, 50); // Small delay to ensure init completes
      } catch (error) {
        console.error(
          "Ã¢ÂÅ’ [trackAddToCart] Error calling fbq (after retry):",
          error,
        );
      }
    });
    return;
  }

  const eventId = generateEventId();
  console.log(
    "Ã°Å¸â€œÅ  [trackAddToCart] Calling fbq with eventId:",
    eventId,
    "Pixel ID:",
    pixelId,
  );

  if (!pixelId) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackAddToCart] Pixel ID is missing");
    return;
  }

  const quantity = product.quantity || 1;
  const eventData = {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    contents: [
      {
        id: product.id,
        quantity: quantity,
        item_price: product.price,
      },
    ],
    value: product.price * quantity,
    currency: resolvedCurrency,
    num_items: quantity,
  };

  try {
    // Track event after Pixel readiness check.
    // Facebook Pixel requires init before track for events to be properly recorded

    // Small delay to ensure initialization completes before tracking
    setTimeout(() => {
      // Track AddToCart event immediately after init (same pattern as PageView in script)
      dispatchTargetedFbqEvent(
        "track",
        "AddToCart",
        eventData,
        { eventID: eventId },
        "trackAddToCart",
      );

      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=AddToCart`;
      console.log("Ã¢Å“â€¦ [Facebook Pixel] AddToCart tracked successfully", {
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        value: product.price * quantity,
        eventId,
        pixelId,
        url: trackingUrl,
        eventData,
      });

    }, 50); // Small delay to ensure init completes
  } catch (error) {
    console.error("Ã¢ÂÅ’ [trackAddToCart] Error calling fbq:", error);
    return;
  }

  return eventId;
};

/**
 * إرسال حدث InitiateCheckout (بدء عملية الشراء)
 */
export const trackInitiateCheckout = (cart: {
  items: Array<{ id: string; quantity: number; price: number }>;
  total: number;
}, currency = "EGP") => {
  const resolvedCurrency = resolveFacebookCurrency(currency);
  console.log("Ã°Å¸â€Â [trackInitiateCheckout] Function called", {
    itemCount: cart.items.length,
    total: cart.total,
    isInitialized,
    hasWindow: typeof window !== "undefined",
    hasFbq: typeof window !== "undefined" && hasFbq(),
    pixelId,
  });

  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === "undefined" || !hasFbq()) {
    console.warn(
      "Ã¢Å¡Â Ã¯Â¸Â [trackInitiateCheckout] Cannot track - Pixel not ready, will retry",
      {
        isInitialized,
        hasWindow: typeof window !== "undefined",
        hasFbq: typeof window !== "undefined" && hasFbq(),
      },
    );
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackInitiateCheckout] Pixel ID is missing");
        return;
      }

      const eventId = generateEventId();
      const contentIds = cart.items.map((item) => item.id);
      const contents = cart.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        item_price: item.price,
      }));

      const eventData = {
        content_ids: contentIds,
        contents: contents,
        content_type: "product",
        value: cart.total,
        currency: resolvedCurrency,
        num_items: cart.items.length,
      };

      try {
        // Ensure init is called before track

        setTimeout(() => {
          dispatchTargetedFbqEvent(
            "track",
            "InitiateCheckout",
            eventData,
            { eventID: eventId },
            "trackInitiateCheckout",
          );
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=InitiateCheckout`;
          console.log(
            "Ã¢Å“â€¦ [Facebook Pixel] InitiateCheckout tracked successfully",
            {
              itemCount: cart.items.length,
              total: cart.total,
              eventId,
              pixelId,
              url: trackingUrl,
              eventData,
            },
          );

        }, 50);
      } catch (error) {
        console.error("Ã¢ÂÅ’ [trackInitiateCheckout] Error calling fbq:", error);
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackInitiateCheckout] Pixel ID is missing");
    return;
  }

  const eventId = generateEventId();
  const contentIds = cart.items.map((item) => item.id);
  const contents = cart.items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    item_price: item.price,
  }));

  const eventData = {
    content_ids: contentIds,
    contents: contents,
    content_type: "product",
    value: cart.total,
    currency: resolvedCurrency,
    num_items: cart.items.length,
  };

  try {
    // Ensure init is called before track

    setTimeout(() => {
      dispatchTargetedFbqEvent(
        "track",
        "InitiateCheckout",
        eventData,
        { eventID: eventId },
        "trackInitiateCheckout",
      );
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=InitiateCheckout`;
      console.log("Ã¢Å“â€¦ [Facebook Pixel] InitiateCheckout tracked successfully", {
        itemCount: cart.items.length,
        total: cart.total,
        eventId,
        pixelId,
        url: trackingUrl,
        eventData,
      });

    }, 50);
  } catch (error) {
    console.error("Ã¢ÂÅ’ [trackInitiateCheckout] Error calling fbq:", error);
    return;
  }

  return eventId;
};

/**
 * إرسال حدث Purchase (إتمام الطلب)
 * @param order - بيانات الطلب
 * @param eventId - Event ID لمنع التكرار بين Pixel و CAPI
 */
export const trackPurchase = (
  order: {
    orderNumber: string;
    items: Array<{ id: string; quantity: number; price: number }>;
    total: number;
  },
  eventId?: string,
  currency = "EGP",
) => {
  const resolvedCurrency = resolveFacebookCurrency(currency);
  console.log("Ã°Å¸â€Â [trackPurchase] Function called", {
    orderNumber: order.orderNumber,
    itemCount: order.items.length,
    total: order.total,
    providedEventId: eventId,
    isInitialized,
    hasWindow: typeof window !== "undefined",
    hasFbq: typeof window !== "undefined" && hasFbq(),
    pixelId,
  });

  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === "undefined" || !hasFbq()) {
    console.warn(
      "Ã¢Å¡Â Ã¯Â¸Â [trackPurchase] Cannot track - Pixel not ready, will retry",
      {
        isInitialized,
        hasWindow: typeof window !== "undefined",
        hasFbq: typeof window !== "undefined" && hasFbq(),
      },
    );
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackPurchase] Pixel ID is missing");
        return;
      }

      // Use provided eventId or generate new one
      const finalEventId = eventId || generateEventId();
      const contentIds = order.items.map((item) => item.id);
      const contents = order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        item_price: item.price,
      }));

      const eventData = {
        content_ids: contentIds,
        contents: contents,
        content_type: "product",
        value: order.total,
        currency: resolvedCurrency,
        num_items: order.items.length,
      };

      try {
        // Ensure init is called before track

        setTimeout(() => {
          const purchaseDispatch = dispatchPurchaseEvent(
            finalEventId,
            eventData,
            resolvedCurrency,
          );
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=Purchase`;
          console.log("Ã¢Å“â€¦ [Facebook Pixel] Purchase tracked successfully", {
            orderNumber: order.orderNumber,
            total: order.total,
            itemCount: order.items.length,
            eventId: finalEventId,
            trackingMethod: purchaseDispatch.trackingMethod,
            monetaryFieldsMode: purchaseDispatch.monetaryFieldsMode,
            pixelId,
            url: trackingUrl,
            deduplication: eventId ? "enabled" : "disabled",
            eventData: purchaseDispatch.eventData,
          });

        }, 50);
      } catch (error) {
        console.error("Ã¢ÂÅ’ [trackPurchase] Error calling fbq:", error);
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackPurchase] Pixel ID is missing");
    return;
  }

  // Use provided eventId or generate new one
  const finalEventId = eventId || generateEventId();
  const contentIds = order.items.map((item) => item.id);
  const contents = order.items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    item_price: item.price,
  }));

  const eventData = {
    content_ids: contentIds,
    contents: contents,
    content_type: "product",
    value: order.total,
    currency: resolvedCurrency,
    num_items: order.items.length,
  };

  try {
    // Ensure init is called before track

    setTimeout(() => {
      const purchaseDispatch = dispatchPurchaseEvent(
        finalEventId,
        eventData,
        resolvedCurrency,
      );
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=Purchase`;
      console.log("Ã¢Å“â€¦ [Facebook Pixel] Purchase tracked successfully", {
        orderNumber: order.orderNumber,
        total: order.total,
        itemCount: order.items.length,
        eventId: finalEventId,
        trackingMethod: purchaseDispatch.trackingMethod,
        monetaryFieldsMode: purchaseDispatch.monetaryFieldsMode,
        pixelId,
        url: trackingUrl,
        deduplication: eventId ? "enabled" : "disabled",
        eventData: purchaseDispatch.eventData,
      });

    }, 50);
  } catch (error) {
    console.error("Ã¢ÂÅ’ [trackPurchase] Error calling fbq:", error);
    return;
  }

  return finalEventId;
};

/**
 * Ã˜Â¥Ã˜Â±Ã˜Â³Ã˜Â§Ã™â€ž Ã˜Â­Ã˜Â¯Ã˜Â« Search (Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â­Ã˜Â«)
 */
export const trackSearch = (searchQuery: string) => {
  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === "undefined" || !hasFbq()) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackSearch] Cannot track - Pixel not ready, will retry");
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackSearch] Pixel ID is missing");
        return;
      }

      const eventId = generateEventId();
      const eventData = {
        search_string: searchQuery,
      };

      try {
        // Ensure init is called before track

        setTimeout(() => {
          dispatchTargetedFbqEvent(
            "track",
            "Search",
            eventData,
            { eventID: eventId },
            "trackSearch",
          );
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=Search`;
          console.log("Ã¢Å“â€¦ [Facebook Pixel] Search tracked successfully", {
            query: searchQuery,
            queryLength: searchQuery.length,
            eventId,
            pixelId,
            url: trackingUrl,
            eventData,
          });

        }, 50);
      } catch (error) {
        console.error("Ã¢ÂÅ’ [trackSearch] Error calling fbq:", error);
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackSearch] Pixel ID is missing");
    return;
  }

  const eventId = generateEventId();
  const eventData = {
    search_string: searchQuery,
  };

  try {
    // Ensure init is called before track

    setTimeout(() => {
      dispatchTargetedFbqEvent(
        "track",
        "Search",
        eventData,
        { eventID: eventId },
        "trackSearch",
      );
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=Search`;
      console.log("Ã¢Å“â€¦ [Facebook Pixel] Search tracked successfully", {
        query: searchQuery,
        queryLength: searchQuery.length,
        eventId,
        pixelId,
        url: trackingUrl,
        eventData,
      });

    }, 50);
  } catch (error) {
    console.error("Ã¢ÂÅ’ [trackSearch] Error calling fbq:", error);
    return;
  }

  return eventId;
};

/**
 * Ã˜Â¥Ã˜Â±Ã˜Â³Ã˜Â§Ã™â€ž Ã˜Â­Ã˜Â¯Ã˜Â« AddToWishlist (Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™â€žÃ™â€žÃ™â€¦Ã™ÂÃ˜Â¶Ã™â€žÃ˜Â©)
 */
export const trackAddToWishlist = (product: {
  id: string;
  name: string;
  price: number;
}) => {
  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === "undefined" || !hasFbq()) {
    console.warn(
      "Ã¢Å¡Â Ã¯Â¸Â [trackAddToWishlist] Cannot track - Pixel not ready, will retry",
    );
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackAddToWishlist] Pixel ID is missing");
        return;
      }

      const eventId = generateEventId();
      const eventData = {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        value: product.price,
        currency: "EGP",
      };

      try {
        // Ensure init is called before track

        setTimeout(() => {
          dispatchTargetedFbqEvent(
            "track",
            "AddToWishlist",
            eventData,
            { eventID: eventId },
            "trackAddToWishlist",
          );
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=AddToWishlist`;
          console.log(
            "Ã¢Å“â€¦ [Facebook Pixel] AddToWishlist tracked successfully",
            {
              productId: product.id,
              productName: product.name,
              price: product.price,
              eventId,
              pixelId,
              url: trackingUrl,
              eventData,
            },
          );

        }, 50);
      } catch (error) {
        console.error("Ã¢ÂÅ’ [trackAddToWishlist] Error calling fbq:", error);
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackAddToWishlist] Pixel ID is missing");
    return;
  }

  const eventId = generateEventId();
  const eventData = {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    value: product.price,
    currency: "EGP",
  };

  try {
    // Ensure init is called before track

    setTimeout(() => {
      dispatchTargetedFbqEvent(
        "track",
        "AddToWishlist",
        eventData,
        { eventID: eventId },
        "trackAddToWishlist",
      );
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=AddToWishlist`;
      console.log("Ã¢Å“â€¦ [Facebook Pixel] AddToWishlist tracked successfully", {
        productId: product.id,
        productName: product.name,
        price: product.price,
        eventId,
        pixelId,
        url: trackingUrl,
        eventData,
      });

    }, 50);
  } catch (error) {
    console.error("Ã¢ÂÅ’ [trackAddToWishlist] Error calling fbq:", error);
    return;
  }

  return eventId;
};

/**
 * Ã˜Â¥Ã˜Â±Ã˜Â³Ã˜Â§Ã™â€ž Ã˜Â­Ã˜Â¯Ã˜Â« Ã™â€¦Ã˜Â®Ã˜ÂµÃ˜Âµ (Custom Event)
 */
const trackStandardEvent = (
  eventName: string,
  eventData: FacebookPixelEventData = {},
) => {
  if (!isInitialized || typeof window === "undefined" || !hasFbq()) {
    waitForPixel(() => {
      if (!pixelId) {
        console.warn(
          `Standard event ${eventName} could not be sent because Pixel ID is missing`,
        );
        return;
      }

      const eventId = generateEventId();

      try {
        setTimeout(() => {
          dispatchTargetedFbqEvent("track", eventName, eventData, {
            eventID: eventId,
          });
        }, 50);
      } catch (error) {
        console.error(
          `Failed to track Facebook standard event ${eventName}`,
          error,
        );
      }
    });
    return;
  }

  if (!pixelId) {
    return;
  }

  const eventId = generateEventId();

  try {
    setTimeout(() => {
      dispatchTargetedFbqEvent("track", eventName, eventData, {
        eventID: eventId,
      });
    }, 50);
  } catch (error) {
    console.error(`Failed to track Facebook standard event ${eventName}`, error);
    return;
  }

  return eventId;
};

export const trackCustom = (
  eventName: string,
  data?: FacebookPixelEventData,
) => {
  // Check if Pixel is ready immediately (same check as PageView)
  if (!isInitialized || typeof window === "undefined" || !hasFbq()) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackCustom] Cannot track - Pixel not ready, will retry");
    // Wait for Pixel to be ready (same as PageView)
    waitForPixel(() => {
      if (!pixelId) {
        console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackCustom] Pixel ID is missing");
        return;
      }

      const eventId = generateEventId();
      const eventData = data || {};

      try {
        // Ensure init is called before trackCustom

        setTimeout(() => {
          dispatchTargetedFbqEvent("trackCustom", eventName, eventData, {
            eventID: eventId,
          });
          const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=${eventName}`;
          console.log("Ã¢Å“â€¦ [Facebook Pixel] Custom event tracked successfully", {
            eventName,
            dataKeys: Object.keys(eventData),
            dataCount: Object.keys(eventData).length,
            eventData,
            eventId,
            pixelId,
            url: trackingUrl,
          });

        }, 50);
      } catch (error) {
        console.error("Ã¢ÂÅ’ [trackCustom] Error calling fbq:", error);
      }
    });
    return;
  }

  if (!pixelId) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â [trackCustom] Pixel ID is missing");
    return;
  }

  const eventId = generateEventId();
  const eventData = data || {};

  try {
    // Ensure init is called before trackCustom

    setTimeout(() => {
      dispatchTargetedFbqEvent("trackCustom", eventName, eventData, {
        eventID: eventId,
      });
      const trackingUrl = `https://www.facebook.com/tr?id=${pixelId}&ev=${eventName}`;
      console.log("Ã¢Å“â€¦ [Facebook Pixel] Custom event tracked successfully", {
        eventName,
        dataKeys: Object.keys(eventData),
        dataCount: Object.keys(eventData).length,
        eventData,
        eventId,
        pixelId,
        url: trackingUrl,
      });

    }, 50);
  } catch (error) {
    console.error("Ã¢ÂÅ’ [trackCustom] Error calling fbq:", error);
    return;
  }

  return eventId;
};

/**
 * التحقق من أن Pixel مفعل
 */
export const trackLead = (data?: FacebookPixelEventData) =>
  trackStandardEvent("Lead", data || {});

export const trackCompleteRegistration = (data?: FacebookPixelEventData) =>
  trackStandardEvent("CompleteRegistration", data || {});

/**
 * Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø£Ù† Pixel Ù…ÙØ¹Ù„
 */
export const isPixelInitialized = (): boolean => {
  return isInitialized;
};

/**
 * الحصول على Pixel ID الحالي
 */
export const getPixelId = (): string | null => {
  return pixelId;
};
