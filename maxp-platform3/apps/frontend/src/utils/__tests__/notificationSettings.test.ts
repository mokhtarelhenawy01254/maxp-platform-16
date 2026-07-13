import {
  isQuietHoursActive,
  shouldShowBrowserNotificationForType,
  type NotificationSettingsData,
} from "../notificationSettings";

const baseSettings: NotificationSettingsData = {
  userId: "user-1",
  companyId: "company-1",
  globalEnabled: true,
  quietHours: {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00",
    timezone: "Africa/Cairo",
  },
  channels: {
    push: {
      enabled: true,
      sound: true,
      vibration: true,
      badge: true,
    },
    email: {
      enabled: true,
      address: "user@example.com",
      frequency: "immediate",
      format: "html",
    },
    sms: {
      enabled: false,
      phoneNumber: "",
      frequency: "immediate",
    },
    inApp: {
      enabled: true,
      showBadge: true,
      autoMarkRead: false,
    },
    browser: {
      enabled: true,
      showPreview: true,
      requireInteraction: false,
    },
  },
  typeSettings: {
    order_created: {
      enabled: true,
      channels: ["browser", "inApp"],
      priority: "high",
      customSound: null,
    },
  },
};

describe("notificationSettings helpers", () => {
  it("allows browser notifications for order_created when channel is enabled", () => {
    expect(
      shouldShowBrowserNotificationForType(baseSettings, "order_created"),
    ).toBe(true);
  });

  it("blocks browser notifications when global notifications are disabled", () => {
    expect(
      shouldShowBrowserNotificationForType(
        {
          ...baseSettings,
          globalEnabled: false,
        },
        "order_created",
      ),
    ).toBe(false);
  });

  it("blocks browser notifications when the order type does not include browser", () => {
    expect(
      shouldShowBrowserNotificationForType(
        {
          ...baseSettings,
          typeSettings: {
            order_created: {
              ...baseSettings.typeSettings.order_created,
              channels: ["inApp"],
            },
          },
        },
        "order_created",
      ),
    ).toBe(false);
  });

  it("does not treat quiet hours as active when disabled", () => {
    expect(isQuietHoursActive(baseSettings)).toBe(false);
  });
});
