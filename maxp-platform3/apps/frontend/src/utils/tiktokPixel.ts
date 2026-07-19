/**
 * TikTok Pixel Utility
 *
 * Responsible for:
 * - Loading TikTok Pixel script
 * - Tracking standard events
 */

type TikTokTrackingConfig = {
  trackPageView: boolean;
  trackViewContent: boolean;
  trackAddToCart: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
  trackSearch: boolean;
  trackAddToWishlist: boolean;
};

const DEFAULT_CONFIG: TikTokTrackingConfig = {
  trackPageView: true,
  trackViewContent: true,
  trackAddToCart: true,
  trackInitiateCheckout: true,
  trackPurchase: true,
  trackSearch: true,
  trackAddToWishlist: false,
};

let pixelId: string | null = null;
let isInitialized = false;
let trackingConfig: TikTokTrackingConfig = { ...DEFAULT_CONFIG };
const RECENT_EVENT_WINDOW_MS = 700;
const recentEvents = new Map<string, number>();

const shouldSkipEvent = (key: string): boolean => {
  const now = Date.now();
  const last = recentEvents.get(key);
  if (last && now - last < RECENT_EVENT_WINDOW_MS) {
    return true;
  }
  recentEvents.set(key, now);
  return false;
};

const ensureTtq = (): any => {
  if (typeof window === "undefined") return null;

  const w = window as any;
  if (w.ttq && typeof w.ttq.load === "function") {
    return w.ttq;
  }

  const ttq = (w.ttq = w.ttq || []);
  w.TiktokAnalyticsObject = "ttq";

  ttq.methods = [
    "page",
    "track",
    "identify",
    "instances",
    "debug",
    "on",
    "off",
    "once",
    "ready",
    "alias",
    "group",
    "enableCookie",
    "disableCookie",
  ];

  ttq.setAndDefer = function (target: any, method: string) {
    target[method] = function () {
      target.push([method, ...Array.prototype.slice.call(arguments)]);
    };
  };

  for (let i = 0; i < ttq.methods.length; i += 1) {
    ttq.setAndDefer(ttq, ttq.methods[i]);
  }

  ttq.instance = function (id: string) {
    const instance = ttq._i[id] || [];
    for (let i = 0; i < ttq.methods.length; i += 1) {
      ttq.setAndDefer(instance, ttq.methods[i]);
    }
    return instance;
  };

  ttq.load = function (id: string) {
    ttq._i = ttq._i || {};
    ttq._i[id] = [];
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${id}&lib=ttq`;
    script.setAttribute("data-tiktok-pixel-id", id);
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else if (document.head) {
      document.head.appendChild(script);
    }
  };

  return ttq;
};

const generateEventId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const withTtq = (callback: (ttq: any) => void) => {
  if (!pixelId || typeof window === "undefined") return false;
  const ttq = ensureTtq();
  if (!ttq) return false;
  callback(ttq);
  return true;
};

export const configureTikTokPixel = (
  config: Partial<TikTokTrackingConfig>,
) => {
  trackingConfig = {
    ...trackingConfig,
    ...config,
  };
};

export const loadTikTokPixel = (
  pixelIdParam: string,
  config?: Partial<TikTokTrackingConfig>,
) => {
  if (!pixelIdParam || typeof window === "undefined") return;

  if (config) {
    configureTikTokPixel(config);
  }

  if (isInitialized && pixelId === pixelIdParam) {
    return;
  }

  pixelId = pixelIdParam;

  try {
    const ttq = ensureTtq();
    if (!ttq) return;
    ttq.load(pixelIdParam);
    ttq.page();
    isInitialized = true;
  } catch (error) {
    console.error("[TikTok Pixel] Error loading script:", error);
  }
};

export const trackTikTokPageView = () => {
  if (!trackingConfig.trackPageView) return;
  withTtq((ttq) => {
    ttq.page();
  });
};

export const trackTikTokViewContent = (product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) => {
  if (!trackingConfig.trackViewContent) return;
  const eventKey = `ViewContent:${product.id}:${product.price}`;
  if (shouldSkipEvent(eventKey)) {
    return;
  }
  const eventId = generateEventId();
  const payload = {
    content_ids: [product.id],
    content_type: "product",
    description: product.name,
    currency: "EGP",
    value: product.price,
    quantity: 1,
    ...(product.category ? { content_category: product.category } : {}),
    event_id: eventId,
  };

  withTtq((ttq) => {
    ttq.track("ViewContent", payload);
  });

  return eventId;
};

export const trackTikTokAddToCart = (product: {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}) => {
  if (!trackingConfig.trackAddToCart) return;
  const eventKey = `AddToCart:${product.id}:${product.price}:${product.quantity || 1}`;
  if (shouldSkipEvent(eventKey)) {
    return;
  }
  const quantity = product.quantity || 1;
  const eventId = generateEventId();
  const payload = {
    content_ids: [product.id],
    content_type: "product",
    description: product.name,
    currency: "EGP",
    value: product.price * quantity,
    quantity,
    event_id: eventId,
  };

  withTtq((ttq) => {
    ttq.track("AddToCart", payload);
  });

  return eventId;
};

export const trackTikTokInitiateCheckout = (cart: {
  items: Array<{ id: string; quantity: number; price: number }>;
  total: number;
}) => {
  if (!trackingConfig.trackInitiateCheckout) return;
  const itemsKey = cart.items
    .map((item) => `${item.id}:${item.quantity}:${item.price}`)
    .join("|");
  const eventKey = `InitiateCheckout:${itemsKey}:${cart.total}`;
  if (shouldSkipEvent(eventKey)) {
    return;
  }
  const eventId = generateEventId();
  const payload = {
    content_ids: cart.items.map((item) => item.id),
    content_type: "product",
    currency: "EGP",
    value: cart.total,
    quantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    contents: cart.items.map((item) => ({
      content_id: item.id,
      quantity: item.quantity,
      price: item.price,
    })),
    event_id: eventId,
  };

  withTtq((ttq) => {
    ttq.track("InitiateCheckout", payload);
  });

  return eventId;
};

export const trackTikTokPurchase = (
  order: {
    orderNumber: string;
    items: Array<{ id: string; quantity: number; price: number }>;
    total: number;
  },
  eventId?: string,
) => {
  if (!trackingConfig.trackPurchase) return;
  const eventKey = `Purchase:${order.orderNumber}:${order.total}`;
  if (shouldSkipEvent(eventKey)) {
    return;
  }
  const finalEventId = eventId || generateEventId();
  const payload = {
    content_ids: order.items.map((item) => item.id),
    content_type: "product",
    currency: "EGP",
    value: order.total,
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    contents: order.items.map((item) => ({
      content_id: item.id,
      quantity: item.quantity,
      price: item.price,
    })),
    order_id: order.orderNumber,
    event_id: finalEventId,
  };

  withTtq((ttq) => {
    ttq.track("CompletePayment", payload);
  });

  return finalEventId;
};

export const trackTikTokSearch = (searchQuery: string) => {
  if (!trackingConfig.trackSearch) return;
  const eventKey = `Search:${searchQuery}`;
  if (shouldSkipEvent(eventKey)) {
    return;
  }
  const eventId = generateEventId();
  const payload = {
    query: searchQuery,
    event_id: eventId,
  };

  withTtq((ttq) => {
    ttq.track("Search", payload);
  });

  return eventId;
};

export const trackTikTokAddToWishlist = (product: {
  id: string;
  name: string;
  price: number;
}) => {
  if (!trackingConfig.trackAddToWishlist) return;
  const eventKey = `AddToWishlist:${product.id}:${product.price}`;
  if (shouldSkipEvent(eventKey)) {
    return;
  }
  const eventId = generateEventId();
  const payload = {
    content_ids: [product.id],
    content_type: "product",
    description: product.name,
    currency: "EGP",
    value: product.price,
    quantity: 1,
    event_id: eventId,
  };

  withTtq((ttq) => {
    ttq.track("AddToWishlist", payload);
  });

  return eventId;
};

export const isTikTokPixelInitialized = (): boolean => isInitialized;

export const getTikTokPixelId = (): string | null => pixelId;
