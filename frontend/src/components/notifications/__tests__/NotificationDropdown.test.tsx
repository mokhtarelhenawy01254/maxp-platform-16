import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import NotificationDropdown from "../NotificationDropdown";

const mockUseAuth = jest.fn();
const mockApiGet = jest.fn();
const mockShowBrowserNotification = jest.fn();
const socketHandlers: Record<string, (...args: unknown[]) => void> = {};

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

jest.mock("../../../utils/urlHelper", () => ({
  buildApiUrl: (path: string) => `/api/v1/${path}`,
}));

jest.mock("../../../utils/browserNotifications", () => ({
  showBrowserNotification: (...args: unknown[]) =>
    mockShowBrowserNotification(...args),
}));

jest.mock("../../../services/socketService", () => ({
  socketService: {
    getSocket: jest.fn(() => ({})),
    on: jest.fn((event: string, callback: (...args: unknown[]) => void) => {
      socketHandlers[event] = callback;
    }),
    off: jest.fn((event: string) => {
      delete socketHandlers[event];
    }),
    playNotificationSound: jest.fn(),
  },
}));

const createSettings = (overrides?: Record<string, unknown>) => ({
  userId: "user-1",
  companyId: "company-1",
  globalEnabled: true,
  quietHours: {
    enabled: false,
    startTime: "22:00",
    endTime: "07:00",
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
      address: "ops@example.com",
      frequency: "instant",
      format: "html",
    },
    sms: {
      enabled: false,
      phoneNumber: "",
      frequency: "instant",
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
  ...overrides,
});

describe("NotificationDropdown browser order notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Object.keys(socketHandlers).forEach((key) => delete socketHandlers[key]);

    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        companyId: "company-1",
      },
      isAuthenticated: true,
    });

    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: createSettings(),
      },
    });

    mockShowBrowserNotification.mockReturnValue(true);

    const settingsJson = JSON.stringify(createSettings());
    (
      window.localStorage.getItem as jest.MockedFunction<
        typeof window.localStorage.getItem
      >
    ).mockImplementation((key: string) => {
      if (key === "accessToken") {
        return "token-123";
      }
      if (key === "maxp:notification-settings") {
        return settingsJson;
      }
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: [] }),
    });
  });

  it("shows a browser notification when a new order arrives and browser channel is enabled", async () => {
    render(<NotificationDropdown />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith("/notifications/settings/user-1");
      expect(socketHandlers["order:created"]).toEqual(expect.any(Function));
    });

    act(() => {
      socketHandlers["order:created"]({
        id: "order-1",
        orderNumber: "ORD-1001",
        guestName: "عميل اختبار",
        total: 570,
      });
    });

    await waitFor(() => {
      expect(mockShowBrowserNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "طلب جديد #ORD-1001",
          body: expect.stringContaining("عميل اختبار"),
        }),
      );
    });
  });

  it("does not show a browser notification when browser channel is disabled for order_created", async () => {
    const disabledSettings = createSettings({
      typeSettings: {
        order_created: {
          enabled: true,
          channels: ["inApp"],
          priority: "high",
          customSound: null,
        },
      },
    });

    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: disabledSettings,
      },
    });

    (
      window.localStorage.getItem as jest.MockedFunction<
        typeof window.localStorage.getItem
      >
    ).mockImplementation((key: string) => {
      if (key === "accessToken") {
        return "token-123";
      }
      if (key === "maxp:notification-settings") {
        return JSON.stringify(disabledSettings);
      }
      return null;
    });

    render(<NotificationDropdown />);

    await waitFor(() => {
      expect(socketHandlers["order:created"]).toEqual(expect.any(Function));
    });

    act(() => {
      socketHandlers["order:created"]({
        id: "order-2",
        orderNumber: "ORD-1002",
        guestName: "عميل بدون متصفح",
        total: 570,
      });
    });

    await waitFor(() => {
      expect(mockShowBrowserNotification).not.toHaveBeenCalled();
    });
  });
});
