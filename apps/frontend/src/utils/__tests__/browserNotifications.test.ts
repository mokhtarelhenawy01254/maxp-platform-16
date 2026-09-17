import { showBrowserNotification } from "../browserNotifications";

describe("showBrowserNotification", () => {
  const originalNotification = window.Notification;

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "Notification", {
      configurable: true,
      writable: true,
      value: originalNotification,
    });
  });

  it("shows a native notification when permission is granted", () => {
    const mockClose = jest.fn();
    const NotificationMock = jest.fn(() => ({
      close: mockClose,
      onclose: null,
      onclick: null,
    }));
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
      tag: "test-tag",
    });

    expect(shown).toBe(true);
    expect(NotificationMock).toHaveBeenCalledWith("New message", expect.objectContaining({
      body: "Hello",
      tag: "test-tag",
    }));
  });

  it("returns false when permission is not granted", () => {
    const NotificationMock = jest.fn();
    Object.defineProperty(NotificationMock, "permission", {
      configurable: true,
      value: "denied",
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
