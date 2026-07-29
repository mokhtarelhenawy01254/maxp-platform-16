import { showBrowserNotification } from "../browserNotifications";
import { isBrowserPushActive } from "../pushNotifications";

jest.mock("../pushNotifications", () => ({
  isBrowserPushActive: jest.fn(() => false),
}));

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("showBrowserNotification", () => {
  const originalNotification = window.Notification;
  const originalServiceWorker = navigator.serviceWorker;

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: originalNotification,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: originalServiceWorker,
    });
  });

  it("falls back to service worker notifications when direct construction is rejected", async () => {
    const showNotification = jest.fn().mockResolvedValue(undefined);
    const register = jest.fn().mockResolvedValue({
      showNotification,
      getNotifications: jest.fn().mockResolvedValue([]),
    });

    const NotificationMock = jest.fn(() => {
      throw new TypeError(
        "Failed to construct 'Notification': Illegal constructor.",
      );
    });

    Object.defineProperty(NotificationMock, "permission", {
      configurable: true,
      value: "granted",
    });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: NotificationMock,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: jest.fn().mockResolvedValue(null),
        register,
      },
    });

    const shown = showBrowserNotification({
      title: "New message",
      body: "Hello",
      tag: "facebook-inbox-message",
      autoCloseMs: 0,
    });

    expect(shown).toBe(true);
    await flushPromises();

    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    expect(showNotification).toHaveBeenCalledWith(
      "New message",
      expect.objectContaining({
        body: "Hello",
        icon: "/favicon.ico",
        tag: "facebook-inbox-message",
      }),
    );
  });

  it("does not create duplicate native notifications when browser push is active", () => {
    (isBrowserPushActive as jest.Mock).mockReturnValue(true);
    const NotificationMock = jest.fn();
    Object.defineProperty(NotificationMock, "permission", {
      configurable: true,
      value: "granted",
    });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: NotificationMock,
    });

    const shown = showBrowserNotification({
      title: "New message",
      body: "Hello",
    });

    expect(shown).toBe(false);
    expect(NotificationMock).not.toHaveBeenCalled();
  });
});
