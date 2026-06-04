export type NotificationChannelId =
  | "push"
  | "email"
  | "sms"
  | "inApp"
  | "browser";

export interface NotificationTypePreference {
  enabled: boolean;
  channels: NotificationChannelId[];
  priority: string;
  customSound: string | null;
}

export interface NotificationSettingsData {
  userId: string;
  companyId: string;
  globalEnabled: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  channels: {
    push: {
      enabled: boolean;
      sound: boolean;
      vibration: boolean;
      badge: boolean;
    };
    email: {
      enabled: boolean;
      address: string;
      frequency: string;
      format: string;
    };
    sms: {
      enabled: boolean;
      phoneNumber: string;
      frequency: string;
    };
    inApp: {
      enabled: boolean;
      showBadge: boolean;
      autoMarkRead: boolean;
    };
    browser: {
      enabled: boolean;
      showPreview: boolean;
      requireInteraction: boolean;
    };
  };
  typeSettings: Record<string, NotificationTypePreference>;
}

const NOTIFICATION_SETTINGS_STORAGE_KEY = "maxp:notification-settings";

const getMinutesFromTime = (value?: string) => {
  if (!value || !value.includes(":")) return null;

  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return hours * 60 + minutes;
};

const getCurrentMinutesInTimezone = (timezone?: string) => {
  if (!timezone) {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(
      parts.find((part) => part.type === "minute")?.value ?? 0,
    );

    return hour * 60 + minute;
  } catch {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }
};

export const readCachedNotificationSettings = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as NotificationSettingsData;
  } catch (error) {
    console.error("Failed to read cached notification settings:", error);
    return null;
  }
};

export const cacheNotificationSettings = (settings: NotificationSettingsData) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      NOTIFICATION_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
    window.dispatchEvent(new CustomEvent("notification-settings:updated"));
  } catch (error) {
    console.error("Failed to cache notification settings:", error);
  }
};

export const isQuietHoursActive = (settings?: NotificationSettingsData | null) => {
  if (!settings?.quietHours?.enabled) {
    return false;
  }

  const startMinutes = getMinutesFromTime(settings.quietHours.startTime);
  const endMinutes = getMinutesFromTime(settings.quietHours.endTime);

  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
    return false;
  }

  const currentMinutes = getCurrentMinutesInTimezone(settings.quietHours.timezone);

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

export const shouldShowBrowserNotificationForType = (
  settings: NotificationSettingsData | null | undefined,
  typeId: string,
) => {
  if (!settings?.globalEnabled || !settings.channels.browser.enabled) {
    return false;
  }

  const typeSettings = settings.typeSettings?.[typeId];
  if (!typeSettings?.enabled) {
    return false;
  }

  return typeSettings.channels.includes("browser");
};
