import api from "../services/api";

export interface BrowserPushState {
  active: boolean;
  endpoint: string | null;
  updatedAt: string;
}

export type BrowserPushPermissionState = NotificationPermission | "unsupported";

export interface BrowserPushDiagnostics {
  supported: boolean;
  permission: BrowserPushPermissionState;
  serviceWorkerRegistered: boolean;
  serviceWorkerControllingPage: boolean;
  serviceWorkerScope: string | null;
  subscriptionFound: boolean;
  subscriptionEndpoint: string | null;
  cachedStateActive: boolean;
  cachedStateEndpoint: string | null;
  cachedStateUpdatedAt: string | null;
}

export interface ActiveBrowserPushNotification {
  title: string;
  body: string;
  tag: string | null;
  data: unknown;
}

const BROWSER_PUSH_STATE_STORAGE_KEY = "maxp:browser-push-state";

const createBrowserPushState = (
  active: boolean,
  endpoint: string | null = null,
): BrowserPushState => ({
  active,
  endpoint,
  updatedAt: new Date().toISOString(),
});

const cacheBrowserPushState = (state: BrowserPushState) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      BROWSER_PUSH_STATE_STORAGE_KEY,
      JSON.stringify(state),
    );
    window.dispatchEvent(new CustomEvent("browser-push:updated", { detail: state }));
  } catch (error) {
    console.error("Failed to cache browser push state:", error);
  }
};

export const readBrowserPushState = (): BrowserPushState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawState = window.localStorage.getItem(BROWSER_PUSH_STATE_STORAGE_KEY);
    if (!rawState) {
      return null;
    }

    return JSON.parse(rawState) as BrowserPushState;
  } catch (error) {
    console.error("Failed to read browser push state:", error);
    return null;
  }
};

export const isBrowserPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const isBrowserPushActive = () => readBrowserPushState()?.active === true;

const getBrowserPushPermission = (): BrowserPushPermissionState => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
};

const getPushServiceWorkerRegistration =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (registration) {
        return registration;
      }
      const registrations = await navigator.serviceWorker.getRegistrations();
      return (
        registrations.find((reg) =>
          [reg.active, reg.waiting, reg.installing].some(
            (worker) =>
              worker?.scriptURL?.includes("/sw.js") ||
              worker?.scriptURL?.includes("/push-sw.js"),
          ),
        ) || null
      );
    } catch (error) {
      console.error("Failed to inspect push service worker registration:", error);
      return null;
    }
  };

export const getBrowserPushDiagnostics =
  async (): Promise<BrowserPushDiagnostics> => {
    const cachedState = readBrowserPushState();
    const supported = isBrowserPushSupported();
    const permission = getBrowserPushPermission();

    if (!supported) {
      return {
        supported: false,
        permission: "unsupported",
        serviceWorkerRegistered: false,
        serviceWorkerControllingPage: false,
        serviceWorkerScope: null,
        subscriptionFound: false,
        subscriptionEndpoint: null,
        cachedStateActive: cachedState?.active === true,
        cachedStateEndpoint: cachedState?.endpoint || null,
        cachedStateUpdatedAt: cachedState?.updatedAt || null,
      };
    }

    const registration = await getPushServiceWorkerRegistration();
    let subscription: PushSubscription | null = null;

    if (registration) {
      try {
        subscription = await registration.pushManager.getSubscription();
      } catch (error) {
        console.error("Failed to inspect browser push subscription:", error);
      }
    }

    return {
      supported: true,
      permission,
      serviceWorkerRegistered: Boolean(registration),
      serviceWorkerControllingPage: Boolean(navigator.serviceWorker.controller),
      serviceWorkerScope: registration?.scope || null,
      subscriptionFound: Boolean(subscription?.endpoint),
      subscriptionEndpoint: subscription?.endpoint || null,
      cachedStateActive: cachedState?.active === true,
      cachedStateEndpoint: cachedState?.endpoint || null,
      cachedStateUpdatedAt: cachedState?.updatedAt || null,
    };
  };

export const listActiveBrowserPushNotifications = async (): Promise<
  ActiveBrowserPushNotification[]
> => {
  if (!isBrowserPushSupported()) {
    return [];
  }

  const registration = await getPushServiceWorkerRegistration();
  if (!registration || typeof registration.getNotifications !== "function") {
    return [];
  }

  try {
    const notifications = await registration.getNotifications();
    return notifications.map((notification) => ({
      title: notification.title,
      body: notification.body,
      tag: notification.tag || null,
      data: notification.data ?? null,
    }));
  } catch (error) {
    console.error("Failed to list active browser push notifications:", error);
    return [];
  }
};

export const closeActiveBrowserPushNotifications = async (
  tag?: string,
): Promise<number> => {
  if (!isBrowserPushSupported()) {
    return 0;
  }

  const registration = await getPushServiceWorkerRegistration();
  if (!registration || typeof registration.getNotifications !== "function") {
    return 0;
  }

  try {
    const notifications = await registration.getNotifications();
    const matchingNotifications = tag
      ? notifications.filter((notification) => notification.tag === tag)
      : notifications;

    matchingNotifications.forEach((notification) => notification.close());
    return matchingNotifications.length;
  } catch (error) {
    console.error("Failed to close active browser push notifications:", error);
    return 0;
  }
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const waitForBrowserPushNotification = async ({
  tag,
  timeoutMs = 5000,
  pollIntervalMs = 250,
}: {
  tag: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<ActiveBrowserPushNotification | null> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const notifications = await listActiveBrowserPushNotifications();
    const matchedNotification =
      notifications.find((notification) => notification.tag === tag) || null;

    if (matchedNotification) {
      return matchedNotification;
    }

    await sleep(pollIntervalMs);
  }

  return null;
};

const urlBase64ToUint8Array = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(normalized);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

export const registerPushServiceWorker =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isBrowserPushSupported()) {
      return null;
    }

    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    return navigator.serviceWorker.ready.then(() => registration);
  };

const getOrCreateBrowserPushSubscription = async () => {
  const registration = await registerPushServiceWorker();
  if (!registration) {
    throw new Error("push_not_supported");
  }

  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    return existingSubscription;
  }

  const publicKeyResponse = await api.get("/notifications/push/public-key");
  const publicKey = publicKeyResponse.data?.data?.publicKey;

  if (!publicKey) {
    throw new Error("missing_public_key");
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
};

export const subscribeToBrowserPush = async () => {
  if (!isBrowserPushSupported()) {
    throw new Error("push_not_supported");
  }

  if (Notification.permission !== "granted") {
    throw new Error("permission_not_granted");
  }

  const subscription = await getOrCreateBrowserPushSubscription();

  await api.post("/notifications/push/subscriptions", {
    subscription: subscription.toJSON(),
    userAgent: navigator.userAgent,
  });

  const state = createBrowserPushState(true, subscription.endpoint);
  cacheBrowserPushState(state);
  return state;
};

export const unsubscribeFromBrowserPush = async () => {
  const registration = await registerPushServiceWorker();
  const currentState = readBrowserPushState();
  const existingSubscription =
    registration && "pushManager" in registration
      ? await registration.pushManager.getSubscription()
      : null;

  const endpoint = existingSubscription?.endpoint || currentState?.endpoint || null;

  if (endpoint) {
    await api.delete("/notifications/push/subscriptions", {
      data: { endpoint },
    });
  }

  if (existingSubscription) {
    try {
      await existingSubscription.unsubscribe();
    } catch (error) {
      console.error("Failed to unsubscribe browser push locally:", error);
    }
  }

  const state = createBrowserPushState(false, null);
  cacheBrowserPushState(state);
  return state;
};

export const syncBrowserPushSubscription = async (enabled: boolean) => {
  if (!enabled) {
    return unsubscribeFromBrowserPush();
  }

  return subscribeToBrowserPush();
};
