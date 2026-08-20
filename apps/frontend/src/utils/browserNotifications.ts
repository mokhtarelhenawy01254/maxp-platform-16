import { isBrowserPushActive } from "./pushNotifications";

export type BrowserNotificationPermissionState =
  | NotificationPermission
  | "unsupported";

interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  autoCloseMs?: number;
  onClick?: () => void;
  bypassPushCheck?: boolean;
}

export const isBrowserNotificationSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

export const getBrowserNotificationPermission =
  (): BrowserNotificationPermissionState => {
    if (!isBrowserNotificationSupported()) {
      return "unsupported";
    }

    return Notification.permission;
  };

export const requestBrowserNotificationPermission = async () => {
  if (!isBrowserNotificationSupported()) {
    return "unsupported" as const;
  }

  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error("Error requesting browser notification permission:", error);
    return Notification.permission;
  }
};

const canUseServiceWorkerNotifications = () =>
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  typeof navigator.serviceWorker?.register === "function";

const showServiceWorkerNotification = async ({
  title,
  body,
  icon,
  tag,
  requireInteraction,
  silent,
  autoCloseMs,
}: Required<Pick<BrowserNotificationOptions, "title" | "body" | "icon">> &
  Pick<
    BrowserNotificationOptions,
    "tag" | "requireInteraction" | "silent" | "autoCloseMs"
  >) => {
  if (!canUseServiceWorkerNotifications()) {
    return false;
  }

  const existingRegistration =
    typeof navigator.serviceWorker.getRegistration === "function"
      ? await navigator.serviceWorker.getRegistration("/")
      : null;
  const registration =
    existingRegistration ||
    (await navigator.serviceWorker.register("/sw-v4.js", { scope: "/" }));

  await registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    tag,
    requireInteraction,
    silent,
    data: {
      url: window.location.pathname + window.location.search,
    },
  });

  if (!requireInteraction && tag && autoCloseMs && autoCloseMs > 0) {
    window.setTimeout(() => {
      registration
        .getNotifications({ tag })
        .then((notifications) => {
          notifications.forEach((notification) => notification.close());
        })
        .catch(() => {
          // Ignore cleanup failures; the browser owns notification lifetime.
        });
    }, autoCloseMs);
  }

  return true;
};

export const showBrowserNotification = ({
  title,
  body,
  icon = "/favicon.ico",
  tag,
  requireInteraction = false,
  silent = false,
  autoCloseMs = 6000,
  onClick,
  bypassPushCheck = false,
}: BrowserNotificationOptions) => {
  if (!bypassPushCheck && isBrowserPushActive()) {
    return false;
  }

  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon,
      tag,
      requireInteraction,
      silent,
    });

    let closeTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!requireInteraction && autoCloseMs > 0) {
      closeTimeout = setTimeout(() => {
        notification.close();
      }, autoCloseMs);
    }

    if (onClick) {
      notification.onclick = () => {
        onClick();
        notification.close();
      };
    }

    notification.onclose = () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
    };

    return true;
  } catch (error) {
    if (!canUseServiceWorkerNotifications()) {
      console.error("Error showing browser notification:", error);
      return false;
    }

    void showServiceWorkerNotification({
      title,
      body,
      icon,
      tag,
      requireInteraction,
      silent,
      autoCloseMs,
    }).catch((serviceWorkerError) => {
      console.warn(
        "Service worker browser notification fallback failed:",
        serviceWorkerError,
      );
    });

    return true;
  }
};
