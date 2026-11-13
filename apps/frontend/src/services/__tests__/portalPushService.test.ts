// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { apiClient } from "../apiClient";
import { tokenManager } from "../../utils/tokenManager";
import { savePortalSession } from "../../utils/portalSessionManager";
import {
  PORTAL_FCM_TOKEN_STORAGE_KEY,
  enablePortalPush,
  getCurrentPortalPushSubscription,
  getPortalNotificationPermission,
  getPortalPushBearerToken,
  getPortalPushPublicKey,
  isPortalPushSupported,
  sendPortalTestPush,
  subscribePortalPush,
  unsubscribePortalPush,
  urlBase64ToUint8Array,
} from "../portalPushService";
import { PortalPushToggle } from "../../components/common/PortalPushToggle";

const SAMPLE_VAPID_PUBLIC_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8A";
const SWAN_HEADERS = {
  "X-Company-Subdomain": "swan",
  "X-Subdomain": "swan",
  "X-Company-Slug": "swan",
};

function mockNotificationGlobal(
  permission: NotificationPermission,
  requestPermissionImpl?: () => Promise<NotificationPermission>,
) {
  const requestPermission = requestPermissionImpl ?? vi.fn().mockResolvedValue(permission);
  Object.defineProperty(window, "Notification", {
    configurable: true,
    writable: true,
    value: Object.assign(vi.fn(), { permission, requestPermission }),
  });
  return { requestPermission };
}

function mockPushManagerGlobal(enabled = true) {
  Object.defineProperty(window, "PushManager", {
    configurable: true,
    writable: true,
    value: enabled ? function PushManager() {} : undefined,
  });
}

describe("portalPushService", () => {
  const originalLocation = window.location;
  const originalServiceWorker = navigator.serviceWorker;
  const originalNotification = (window as unknown as Record<string, unknown>)["Notification"];
  const originalPushManager = (window as unknown as Record<string, unknown>)["PushManager"];
  const originalCapacitor = (window as unknown as Record<string, unknown>)["Capacitor"];

  const setMockLocation = (hostname: string, pathname: string) => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, hostname, pathname },
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    tokenManager.clearTokens();
    setMockLocation("swan.maxp.online", "/parent/dashboard");
    mockPushManagerGlobal(true);
    mockNotificationGlobal("default");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    tokenManager.clearTokens();
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, writable: true, value: originalServiceWorker });
    Object.defineProperty(window, "Notification", { configurable: true, writable: true, value: originalNotification });
    Object.defineProperty(window, "PushManager", { configurable: true, writable: true, value: originalPushManager });
    if (originalCapacitor === undefined) {
      delete (window as unknown as Record<string, unknown>)["Capacitor"];
    } else {
      Object.defineProperty(window, "Capacitor", { configurable: true, writable: true, value: originalCapacitor });
    }
  });

  it("resolves bearer tokens cleanly for portal roles vs customer and wholesale", () => {
    tokenManager.setAccessToken("customer_jwt_token");
    savePortalSession({ role: "parent", companyId: "cmp_1", token: "parent_jwt_token" });
    savePortalSession({ role: "dental", companyId: "cmp_1", token: "dental_jwt_token" });
    savePortalSession({ role: "courier", companyId: "cmp_1", token: "courier_jwt_token" });
    savePortalSession({ role: "student", companyId: "cmp_1", token: "student_jwt_token" });

    expect(getPortalPushBearerToken("parent")).toBe("parent_jwt_token");
    expect(getPortalPushBearerToken("dental")).toBe("dental_jwt_token");
    expect(getPortalPushBearerToken("courier")).toBe("courier_jwt_token");
    expect(getPortalPushBearerToken("student")).toBe("student_jwt_token");
    expect(getPortalPushBearerToken("teacher")).toBeNull();
    expect(getPortalPushBearerToken("customer")).toBe("customer_jwt_token");
    expect(getPortalPushBearerToken("wholesale")).toBe("customer_jwt_token");
    expect(getPortalPushBearerToken("client")).toBe("customer_jwt_token");
  });

  it("checks support and converts Base64URL VAPID keys to Uint8Array", () => {
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, writable: true, value: {} });
    expect(isPortalPushSupported()).toBe(true);

    mockPushManagerGlobal(false);
    expect(isPortalPushSupported()).toBe(false);

    const bytes = urlBase64ToUint8Array(SAMPLE_VAPID_PUBLIC_KEY);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(0x04);
  });

  it("getPortalPushPublicKey sends subdomain headers without auth and parses response", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { success: true, data: { configured: true, publicKey: SAMPLE_VAPID_PUBLIC_KEY } },
    } as never);

    const res = await getPortalPushPublicKey();
    expect(res).toEqual({ configured: true, publicKey: SAMPLE_VAPID_PUBLIC_KEY });
    expect(getSpy).toHaveBeenCalledWith("/portal/push/public-key", {
      headers: SWAN_HEADERS,
      _skipAuthHeader: true,
      _skipErrorToast: true,
    });
  });

  it("subscribePortalPush requests permission, subscribes PushManager, and posts WEB_PUSH payload", async () => {
    savePortalSession({ role: "parent", companyId: "cmp_swan", token: "parent_tok_123" });
    const { requestPermission } = mockNotificationGlobal("default", vi.fn().mockResolvedValue("granted"));

    const subscriptionJson = {
      endpoint: "https://fcm.googleapis.com/fcm/send/sub-1",
      keys: { p256dh: "p256dh_key", auth: "auth_key" },
    };
    const mockSub = {
      endpoint: subscriptionJson.endpoint,
      toJSON: vi.fn(() => subscriptionJson),
      unsubscribe: vi.fn().mockResolvedValue(true),
    } as unknown as PushSubscription;

    const subscribeMock = vi.fn().mockResolvedValue(mockSub);
    const mockReg = {
      active: { scriptURL: "https://swan.maxp.online/sw-portal.js" },
      pushManager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe: subscribeMock },
    } as unknown as ServiceWorkerRegistration;

    const getRegistrationMock = vi.fn().mockResolvedValue(undefined);
    const registerMock = vi.fn().mockResolvedValue(mockReg);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      writable: true,
      value: { getRegistration: getRegistrationMock, register: registerMock, ready: Promise.resolve(mockReg) },
    });

    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { success: true, data: { configured: true, publicKey: SAMPLE_VAPID_PUBLIC_KEY } },
    } as never);
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { success: true, data: { id: "sub_db_1" } },
    } as never);

    const result = await subscribePortalPush("parent");
    expect(result).toEqual({ subscribed: true, endpoint: subscriptionJson.endpoint });
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(getRegistrationMock).toHaveBeenCalledWith("/parent/");
    expect(registerMock).toHaveBeenCalledWith("/sw-portal.js", { scope: "/parent/", updateViaCache: "none" });
    expect(subscribeMock).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });

    const appKeyArg = (subscribeMock.mock.calls[0]?.[0] as { applicationServerKey: Uint8Array }).applicationServerKey;
    expect(Array.from(appKeyArg)).toEqual(Array.from(urlBase64ToUint8Array(SAMPLE_VAPID_PUBLIC_KEY)));
    expect(postSpy).toHaveBeenCalledWith(
      "/portal/push/subscribe",
      { platform: "WEB_PUSH", subscription: subscriptionJson },
      {
        headers: { ...SWAN_HEADERS, Authorization: "Bearer parent_tok_123" },
        _skipAuthRefresh: true,
        _skipErrorToast: true,
      },
    );
  });

  it("subscribePortalPush fails gracefully with Arabic error when permission is denied or VAPID is unconfigured", async () => {
    savePortalSession({ role: "teacher", companyId: "cmp_swan", token: "teacher_tok_1" });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, writable: true, value: {} });

    mockNotificationGlobal("denied");
    await expect(subscribePortalPush("teacher")).rejects.toThrow("تم حظر الإشعارات من إعدادات المتصفح");

    mockNotificationGlobal("granted");
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { success: true, data: { configured: false, publicKey: null } },
    } as never);
    await expect(subscribePortalPush("teacher")).rejects.toThrow("خدمة الإشعارات الفورية غير مفعلة حالياً");
  });

  it("unsubscribePortalPush posts /portal/push/unsubscribe and unsubscribes locally", async () => {
    setMockLocation("swan.maxp.online", "/account");
    tokenManager.setAccessToken("customer_tok_99");

    const localUnsubscribe = vi.fn().mockResolvedValue(true);
    const existingSub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/cust-sub-99",
      unsubscribe: localUnsubscribe,
    } as unknown as PushSubscription;

    const mockReg = {
      active: { scriptURL: "https://swan.maxp.online/sw-portal.js" },
      pushManager: { getSubscription: vi.fn().mockResolvedValue(existingSub) },
    } as unknown as ServiceWorkerRegistration;

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      writable: true,
      value: { getRegistration: vi.fn().mockResolvedValue(mockReg), ready: Promise.resolve(mockReg) },
    });

    expect(await getCurrentPortalPushSubscription()).toBe(existingSub);
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { success: true, data: { updated: 1 } },
    } as never);

    const res = await unsubscribePortalPush("customer");
    expect(res).toEqual({ unsubscribed: true, endpoint: "https://fcm.googleapis.com/fcm/send/cust-sub-99" });
    expect(postSpy).toHaveBeenCalledWith(
      "/portal/push/unsubscribe",
      { endpoint: "https://fcm.googleapis.com/fcm/send/cust-sub-99" },
      {
        headers: { ...SWAN_HEADERS, Authorization: "Bearer customer_tok_99" },
        _skipAuthRefresh: true,
        _skipErrorToast: true,
      },
    );
    expect(localUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("sendPortalTestPush posts current path with verified bearer token", async () => {
    setMockLocation("swan.maxp.online", "/dental-portal/cases");
    savePortalSession({ role: "dental", companyId: "cmp_swan", token: "dental_tok_55" });

    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { success: true, data: { sent: 1 } },
    } as never);

    await sendPortalTestPush("dental");
    expect(postSpy).toHaveBeenCalledWith(
      "/portal/push/test",
      { url: "/dental-portal/cases" },
      {
        headers: { ...SWAN_HEADERS, Authorization: "Bearer dental_tok_55" },
        _skipAuthRefresh: true,
        _skipErrorToast: true,
      },
    );
  });

  it("PortalPushToggle hides when unauthenticated, toggles subscribe/unsubscribe, and shows blocked state", async () => {
    const localSub = {
      endpoint: "https://push.test/sub-toggle",
      toJSON: () => ({ endpoint: "https://push.test/sub-toggle" }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    const getSubMock = vi.fn().mockResolvedValue(null);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      writable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          active: {},
          pushManager: { getSubscription: getSubMock, subscribe: vi.fn().mockResolvedValue(localSub) },
        }),
      },
    });

    const emptyRender = render(React.createElement(PortalPushToggle, { portal: "parent" }));
    expect(emptyRender.container.firstChild).toBeNull();
    emptyRender.unmount();

    savePortalSession({ role: "parent", companyId: "cmp_swan", token: "parent_tok_ui" });
    mockNotificationGlobal(
      "default",
      vi.fn().mockImplementation(async () => {
        mockNotificationGlobal("granted");
        return "granted";
      }),
    );

    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { success: true, data: { configured: true, publicKey: SAMPLE_VAPID_PUBLIC_KEY } },
    } as never);
    vi.spyOn(apiClient, "post").mockResolvedValue({ data: { success: true } } as never);
    const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "" as never);
    const toastInfoSpy = vi.spyOn(toast, "info").mockImplementation(() => "" as never);

    const view = render(React.createElement(PortalPushToggle, { portal: "parent", accentColor: "#0d9488" }));
    const activateBtn = await screen.findByRole("button", { name: "تفعيل الإشعارات" });
    await waitFor(() => expect(activateBtn).not.toBeDisabled());

    fireEvent.click(activateBtn);
    const activeBtn = await screen.findByRole("button", { name: "الإشعارات مفعلة" });
    expect(toastSuccessSpy).toHaveBeenCalledWith("تم تفعيل الإشعارات الفورية بنجاح");

    getSubMock.mockResolvedValue(localSub);
    fireEvent.click(activeBtn);
    await screen.findByRole("button", { name: "تفعيل الإشعارات" });
    expect(toastSuccessSpy).toHaveBeenCalledWith("تم إيقاف الإشعارات الفورية");

    view.unmount();
    mockNotificationGlobal("denied");
    render(React.createElement(PortalPushToggle, { portal: "parent" }));
    const blockedBtn = await screen.findByRole("button", { name: "الإشعارات محظورة" });
    await waitFor(() => expect(blockedBtn).not.toBeDisabled());
    fireEvent.click(blockedBtn);
    expect(toastInfoSpy).toHaveBeenCalled();
  });

  it("supports Capacitor native PushNotifications FCM_ANDROID subscribe, check, and unsubscribe without browser Notification/PushManager", async () => {
    delete (window as unknown as Record<string, unknown>)["Notification"];
    mockPushManagerGlobal(false);
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, writable: true, value: undefined });

    const listeners: Record<string, (payload: Record<string, unknown>) => void> = {};
    const removeMock = vi.fn().mockResolvedValue(undefined);
    const pushPluginMock = {
      checkPermissions: vi.fn().mockResolvedValue({ receive: "granted" }),
      requestPermissions: vi.fn().mockResolvedValue({ receive: "granted" }),
      register: vi.fn().mockImplementation(async () => {
        listeners["registration"]?.({ value: "fcm_android_token_abc" });
      }),
      unregister: vi.fn().mockResolvedValue(undefined),
      addListener: vi.fn().mockImplementation(async (event: string, cb: (payload: Record<string, unknown>) => void) => {
        listeners[event] = cb;
        return { remove: removeMock };
      }),
    };

    Object.defineProperty(window, "Capacitor", {
      configurable: true,
      writable: true,
      value: {
        isNativePlatform: () => true,
        Plugins: { PushNotifications: pushPluginMock },
      },
    });

    expect(isPortalPushSupported()).toBe(true);
    expect(getPortalNotificationPermission()).toBe("default");

    savePortalSession({ role: "parent", companyId: "cmp_swan", token: "parent_native_tok" });
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({ data: { success: true } } as never);

    const subResult = await enablePortalPush("parent");
    expect(subResult).toEqual({ subscribed: true, endpoint: "fcm:fcm_android_token_abc" });
    expect(getPortalNotificationPermission()).toBe("granted");
    expect(window.localStorage.getItem(PORTAL_FCM_TOKEN_STORAGE_KEY)).toBe("fcm_android_token_abc");
    expect(postSpy).toHaveBeenCalledWith(
      "/portal/push/subscribe",
      {
        platform: "FCM_ANDROID",
        fcmToken: "fcm_android_token_abc",
        userAgent: navigator.userAgent,
      },
      {
        headers: { ...SWAN_HEADERS, Authorization: "Bearer parent_native_tok" },
        _skipAuthRefresh: true,
        _skipErrorToast: true,
      },
    );
    expect(removeMock).toHaveBeenCalledTimes(2);

    const currentSub = await getCurrentPortalPushSubscription();
    expect(currentSub?.endpoint).toBe("fcm:fcm_android_token_abc");

    const unsubResult = await unsubscribePortalPush("parent");
    expect(unsubResult).toEqual({ unsubscribed: true, endpoint: "fcm:fcm_android_token_abc" });
    expect(window.localStorage.getItem(PORTAL_FCM_TOKEN_STORAGE_KEY)).toBeNull();
    expect(pushPluginMock.unregister).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenLastCalledWith(
      "/portal/push/unsubscribe",
      { fcmToken: "fcm_android_token_abc", endpoint: "fcm:fcm_android_token_abc" },
      {
        headers: { ...SWAN_HEADERS, Authorization: "Bearer parent_native_tok" },
        _skipAuthRefresh: true,
        _skipErrorToast: true,
      },
    );
  });
});
