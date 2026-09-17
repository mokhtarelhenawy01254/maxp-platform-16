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

export const showBrowserNotification = ({
  title,
  body,
  icon = "/favicon.ico",
  tag,
  requireInteraction = false,
  silent = false,
  autoCloseMs = 6000,
  onClick,
}: BrowserNotificationOptions) => {
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
    console.error("Error showing browser notification:", error);
    return false;
  }
};
