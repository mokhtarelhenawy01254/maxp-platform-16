import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { apiClient } from "./apiClient";
import { tokenManager } from "../utils/tokenManager";

class PushNotificationService {
  private isInitialized = false;
  private currentDeviceToken: string | null = null;

  /**
   * تهيئة خدمة الإشعارات النيتيف على الهاتف (أندرويد / آيفون)
   */
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // ليس تطبيق موبايل نيتيف (متصفح عادي)
      return;
    }

    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    console.log("📱 [PUSH] Initializing Native Push Notifications...");

    try {
      this.setupListeners();
      await this.requestPermissionsAndRegister();
    } catch (error) {
      console.error("❌ [PUSH] Initialization error:", error);
    }
  }

  /**
   * طلب إذن الإشعارات من المستخدم وتسجيل الجهاز
   */
  async requestPermissionsAndRegister(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === "prompt" || permStatus.receive === "prompt-with-rationale") {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== "granted") {
        console.warn("⚠️ [PUSH] User denied push notification permissions");
        return false;
      }

      await PushNotifications.register();
      console.log("✅ [PUSH] Registered with FCM service");
      return true;
    } catch (error) {
      console.error("❌ [PUSH] Failed to request permissions:", error);
      return false;
    }
  }

  /**
   * إعداد مستمعي أحداث الإشعارات (استلام، تسجيل، نقر)
   */
  private setupListeners(): void {
    // 1. استلام توكن الـ FCM من جوجل
    PushNotifications.addListener("registration", async (token) => {
      console.log("📲 [PUSH] FCM Device Token received:", token.value?.substring(0, 16) + "...");
      this.currentDeviceToken = token.value;
      await this.syncTokenWithBackend(token.value);
    });

    // 2. خطأ في التسجيل لدى FCM
    PushNotifications.addListener("registrationError", (err) => {
      console.error("❌ [PUSH] Error registering device token:", err);
    });

    // 3. وصول إشعار والتطبيق مفتوح في المقدمة
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("🔔 [PUSH] Notification received in foreground:", notification.title);
      // تشغيل تنبيه صوتي أو اهتزاز إذا لزم
    });

    // 4. نقر المستخدم على الإشعار من شريط الهاتف أو شاشة القفل
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification.data || {};
      console.log("👆 [PUSH] Notification clicked by user:", data);

      const targetUrl = data.url || (data.conversationId ? `/whatsapp?conversationId=${data.conversationId}` : null);

      if (targetUrl) {
        // توجيه المستخدم مباشرة للمحادثة أو الطلب
        if (window.location.pathname !== targetUrl) {
          window.location.href = targetUrl;
        }
      }
    });
  }

  /**
   * إرسال التوكن للباك إند وربطه بحساب المستخدم الحالي
   */
  async syncTokenWithBackend(token?: string): Promise<void> {
    const deviceToken = token || this.currentDeviceToken;
    if (!deviceToken) return;

    // التأكد من تسجيل دخول المستخدم أولاً
    if (!tokenManager.hasAccessToken()) {
      console.log("⏳ [PUSH] User not logged in yet, token will be synced after login");
      return;
    }

    try {
      await apiClient.post("/notifications/device-token", {
        token: deviceToken,
        platform: Capacitor.getPlatform(),
        userAgent: navigator.userAgent,
      });
      console.log("✅ [PUSH] Device token successfully registered on MaxP backend");
    } catch (error) {
      console.error("⚠️ [PUSH] Failed to sync device token with backend:", error);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
