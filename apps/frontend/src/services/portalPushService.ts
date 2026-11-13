import { apiClient } from "./apiClient";
import { getPortalSwScope } from "../config/portals";
import {
  getActivePortalToken,
  getPortalSubdomainHeaders,
} from "../utils/portalSessionManager";
import { tokenManager } from "../utils/tokenManager";

export type PortalPushActorRole =
  | "parent"
  | "teacher"
  | "doctor"
  | "patient"
  | "dental"
  | "courier"
  | "student"
  | "customer";

export type PortalPushRole = PortalPushActorRole | "wholesale" | "client";

export interface PortalPushPublicKeyResult {
  configured: boolean;
  publicKey: string | null;
}

function buildAuthConfig(token: string) {
  return {
    headers: {
      ...getPortalSubdomainHeaders(),
      Authorization: `Bearer ${token}`,
    },
    _skipAuthRefresh: true as const,
    _skipErrorToast: true as const,
  };
}

export function getPortalPushBearerToken(role: PortalPushRole): string | null {
  const token =
    role === "customer" || role === "wholesale" || role === "client"
      ? tokenManager.getAccessToken()
      : getActivePortalToken(role);
  return typeof token === "string" && token.trim() ? token.trim() : null;
}

export const PORTAL_FCM_TOKEN_STORAGE_KEY = "maxp_portal_fcm_token_v1";
export const PORTAL_NATIVE_PERMISSION_STORAGE_KEY = "maxp_portal_native_push_perm_v1";

interface CapacitorPushListenerHandle {
  remove?: () => Promise<void> | void;
}

interface CapacitorPushNotificationsPlugin {
  checkPermissions?: () => Promise<{ receive?: string }>;
  requestPermissions: () => Promise<{ receive?: string }>;
  register: () => Promise<void>;
  unregister?: () => Promise<void>;
  addListener: (
    eventName: string,
    listenerFunc: (payload: Record<string, unknown>) => void,
  ) => Promise<CapacitorPushListenerHandle> | CapacitorPushListenerHandle;
}

function getCapacitorPushPlugin(): CapacitorPushNotificationsPlugin | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: { PushNotifications?: CapacitorPushNotificationsPlugin };
    };
  };
  if (
    win.Capacitor?.isNativePlatform?.() &&
    win.Capacitor?.Plugins?.PushNotifications
  ) {
    return win.Capacitor.Plugins.PushNotifications;
  }
  return null;
}

function mapCapacitorPermission(receive?: string): NotificationPermission {
  if (receive === "granted") return "granted";
  if (receive === "denied") return "denied";
  return "default";
}

function readCachedNativePermission(): NotificationPermission {
  if (typeof window === "undefined") return "default";
  try {
    const val = window.localStorage.getItem(PORTAL_NATIVE_PERMISSION_STORAGE_KEY);
    if (val === "granted" || val === "denied" || val === "default") return val;
  } catch {
    // Ignore storage errors
  }
  return "default";
}

function writeCachedNativePermission(permission: NotificationPermission): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PORTAL_NATIVE_PERMISSION_STORAGE_KEY, permission);
  } catch {
    // Ignore storage errors
  }
}

async function obtainNativeFcmToken(
  plugin: CapacitorPushNotificationsPlugin,
): Promise<string> {
  let regHandle: CapacitorPushListenerHandle | undefined;
  let errHandle: CapacitorPushListenerHandle | undefined;

  try {
    return await new Promise<string>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      };
      const timer = setTimeout(() => {
        finish(() => reject(new Error("انتهت مهلة تسجيل إشعارات الجهاز")));
      }, 15000);

      void (async () => {
        try {
          regHandle = await Promise.resolve(
            plugin.addListener("registration", (payload) => {
              const tokenVal =
                typeof payload?.["value"] === "string" ? payload["value"].trim() : "";
              if (tokenVal) {
                finish(() => resolve(tokenVal));
              } else {
                finish(() => reject(new Error("تعذر استلام رمز الإشعارات للجهاز")));
              }
            }),
          );
          errHandle = await Promise.resolve(
            plugin.addListener("registrationError", (errPayload) => {
              const msg =
                typeof errPayload?.["error"] === "string" && errPayload["error"].trim()
                  ? errPayload["error"].trim()
                  : "فشل تسجيل الإشعارات على الجهاز";
              finish(() => reject(new Error(msg)));
            }),
          );
          await plugin.register();
        } catch (err) {
          finish(() =>
            reject(err instanceof Error ? err : new Error("تعذر تفعيل إشعارات الجهاز")),
          );
        }
      })();
    });
  } finally {
    await Promise.resolve(regHandle?.remove?.()).catch(() => {});
    await Promise.resolve(errHandle?.remove?.()).catch(() => {});
  }
}

export function isPortalPushSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  if (getCapacitorPushPlugin()) {
    return true;
  }
  const win = window as unknown as Record<string, unknown>;
  return (
    "Notification" in window &&
    Boolean(win["Notification"]) &&
    "serviceWorker" in navigator &&
    Boolean(navigator.serviceWorker) &&
    "PushManager" in window &&
    Boolean(win["PushManager"])
  );
}

export function getPortalNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (getCapacitorPushPlugin()) {
    return readCachedNativePermission();
  }
  if (typeof window === "undefined" || !("Notification" in window) || !window.Notification) {
    return "unsupported";
  }
  return window.Notification.permission;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const trimmed = String(base64String || "").trim();
  const padding = "=".repeat((4 - (trimmed.length % 4)) % 4);
  const base64 = (trimmed + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

function hasMatchingVapidKey(sub: PushSubscription, expected: Uint8Array): boolean {
  const buf = sub.options?.applicationServerKey;
  if (!buf) return true;
  const bytes = new Uint8Array(buf);
  if (bytes.length !== expected.length) return false;
  return expected.every((val, idx) => bytes[idx] === val);
}

export async function getPortalPushPublicKey(): Promise<PortalPushPublicKeyResult> {
  const res = await apiClient.get<{
    data?: { configured?: boolean; publicKey?: string | null };
    configured?: boolean;
    publicKey?: string | null;
  }>("/portal/push/public-key", {
    headers: getPortalSubdomainHeaders(),
    _skipAuthHeader: true,
    _skipErrorToast: true,
  });

  const root = res.data;
  const payload =
    root && typeof root === "object" && "data" in root && root.data && typeof root.data === "object"
      ? root.data
      : root;
  const publicKey =
    typeof payload?.publicKey === "string" && payload.publicKey.trim()
      ? payload.publicKey.trim()
      : null;
  return { configured: Boolean(payload?.configured && publicKey), publicKey };
}

async function resolvePortalRegistration(
  pathname?: string,
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || !navigator.serviceWorker) {
    return null;
  }
  const sw = navigator.serviceWorker;
  const targetPath = pathname || (typeof window !== "undefined" ? window.location.pathname : "/");
  const scope = getPortalSwScope(targetPath) || "/";

  let reg =
    typeof sw.getRegistration === "function"
      ? await sw.getRegistration(scope).catch(() => undefined)
      : undefined;

  if (!reg && typeof sw.register === "function") {
    reg = await sw.register("/sw-portal.js", { scope, updateViaCache: "none" });
  }
  if (!reg) return null;
  if (reg.active) return reg;

  if (sw.ready) {
    try {
      const readyReg = await Promise.race([
        sw.ready,
        new Promise<ServiceWorkerRegistration>((resolve) => {
          setTimeout(() => resolve(reg as ServiceWorkerRegistration), 5000);
        }),
      ]);
      if (readyReg) return readyReg;
    } catch {
      // Keep registration fallback
    }
  }
  return reg;
}

export async function getCurrentPortalPushSubscription(
  pathname?: string,
): Promise<PushSubscription | null> {
  if (!isPortalPushSupported()) return null;
  const nativePush = getCapacitorPushPlugin();
  if (nativePush) {
    try {
      const permRes = await nativePush.checkPermissions?.().catch(() => null);
      if (permRes?.receive) {
        writeCachedNativePermission(mapCapacitorPermission(permRes.receive));
      }
      const storedToken = window.localStorage.getItem(PORTAL_FCM_TOKEN_STORAGE_KEY)?.trim();
      return storedToken
        ? ({ endpoint: `fcm:${storedToken}` } as unknown as PushSubscription)
        : null;
    } catch {
      return null;
    }
  }
  try {
    const reg = await resolvePortalRegistration(pathname);
    if (!reg?.pushManager || typeof reg.pushManager.getSubscription !== "function") {
      return null;
    }
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribePortalPush(
  role: PortalPushRole,
  pathname?: string,
): Promise<{ subscribed: boolean; endpoint: string }> {
  const token = getPortalPushBearerToken(role);
  if (!token) throw new Error("يرجى تسجيل الدخول أولاً لتفعيل الإشعارات");
  if (!isPortalPushSupported()) throw new Error("المتصفح الحالي لا يدعم الإشعارات الفورية");

  const nativePush = getCapacitorPushPlugin();
  if (nativePush) {
    const permRes = await nativePush.requestPermissions();
    const mapped = mapCapacitorPermission(permRes?.receive);
    writeCachedNativePermission(mapped);
    if (mapped === "denied") {
      throw new Error("تم حظر الإشعارات من إعدادات الجهاز");
    }
    if (mapped !== "granted") {
      throw new Error("لم يتم منح صلاحية الإشعارات");
    }

    const fcmToken = await obtainNativeFcmToken(nativePush);
    await apiClient.post(
      "/portal/push/subscribe",
      {
        platform: "FCM_ANDROID",
        fcmToken,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      },
      buildAuthConfig(token),
    );
    try {
      window.localStorage.setItem(PORTAL_FCM_TOKEN_STORAGE_KEY, fcmToken);
    } catch {
      // Ignore storage errors
    }
    return { subscribed: true, endpoint: `fcm:${fcmToken}` };
  }

  let permission = getPortalNotificationPermission();
  if (permission === "default") {
    permission = await window.Notification.requestPermission();
  }
  if (permission === "denied") throw new Error("تم حظر الإشعارات من إعدادات المتصفح");
  if (permission !== "granted") throw new Error("لم يتم منح صلاحية الإشعارات");

  const { configured, publicKey } = await getPortalPushPublicKey();
  if (!configured || !publicKey) throw new Error("خدمة الإشعارات الفورية غير مفعلة حالياً");

  const reg = await resolvePortalRegistration(pathname);
  if (!reg?.pushManager || typeof reg.pushManager.subscribe !== "function") {
    throw new Error("تعذر تهيئة خدمة الإشعارات في المتصفح");
  }

  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  let subscription =
    typeof reg.pushManager.getSubscription === "function"
      ? await reg.pushManager.getSubscription().catch(() => null)
      : null;

  if (subscription && !hasMatchingVapidKey(subscription, applicationServerKey)) {
    await subscription.unsubscribe().catch(() => false);
    subscription = null;
  }

  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as unknown as BufferSource,
    });
  }

  const subscriptionPayload =
    typeof subscription.toJSON === "function"
      ? subscription.toJSON()
      : { endpoint: subscription.endpoint };

  await apiClient.post(
    "/portal/push/subscribe",
    { platform: "WEB_PUSH", subscription: subscriptionPayload },
    buildAuthConfig(token),
  );

  return { subscribed: true, endpoint: subscription.endpoint };
}

export const enablePortalPush = subscribePortalPush;

export async function unsubscribePortalPush(
  role: PortalPushRole,
  pathname?: string,
): Promise<{ unsubscribed: boolean; endpoint: string | null }> {
  const token = getPortalPushBearerToken(role);
  if (!token) throw new Error("يرجى تسجيل الدخول أولاً");

  const nativePush = getCapacitorPushPlugin();
  if (nativePush) {
    let fcmToken: string | null = null;
    try {
      fcmToken = window.localStorage.getItem(PORTAL_FCM_TOKEN_STORAGE_KEY)?.trim() || null;
    } catch {
      fcmToken = null;
    }
    const endpoint = fcmToken ? `fcm:${fcmToken}` : null;
    await apiClient.post(
      "/portal/push/unsubscribe",
      fcmToken ? { fcmToken, endpoint } : {},
      buildAuthConfig(token),
    );
    try {
      window.localStorage.removeItem(PORTAL_FCM_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    await nativePush.unregister?.().catch(() => {});
    return { unsubscribed: true, endpoint };
  }

  const sub = await getCurrentPortalPushSubscription(pathname);
  await apiClient.post(
    "/portal/push/unsubscribe",
    { endpoint: sub?.endpoint },
    buildAuthConfig(token),
  );

  if (sub && typeof sub.unsubscribe === "function") {
    await sub.unsubscribe().catch(() => false);
  }
  return { unsubscribed: true, endpoint: sub?.endpoint ?? null };
}

export async function sendPortalTestPush(
  role: PortalPushRole,
  url?: string,
): Promise<unknown> {
  const token = getPortalPushBearerToken(role);
  if (!token) throw new Error("يرجى تسجيل الدخول أولاً");
  const targetUrl =
    url || (typeof window !== "undefined" ? window.location.pathname : "/");
  const res = await apiClient.post(
    "/portal/push/test",
    { url: targetUrl },
    buildAuthConfig(token),
  );
  return res.data;
}
