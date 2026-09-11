import { apiClient } from "./apiClient";
import { tokenManager } from "../utils/tokenManager";

const getCapacitor = () =>
  typeof window !== "undefined" ? (window as any).Capacitor : undefined;
const isNativePlatform = (): boolean =>
  Boolean(getCapacitor()?.isNativePlatform?.());
const getPushPlugin = () => getCapacitor()?.Plugins?.PushNotifications;

class PushNotificationService {
  private isInitialized = false;
  private currentDeviceToken: string | null = null;

  /**
   * تهيئة خدمة الإشعارات النيتيف على الهاتف (أندرويد / آيفون)
   */
  async init(): Promise<void> {
    if (!isNativePlatform()) {
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
    if (!isNativePlatform()) return false;
    const pushPlugin = getPushPlugin();
    if (!pushPlugin) return false;

    try {
      let permStatus = await pushPlugin.checkPermissions();

      if (
        permStatus.receive === "prompt" ||
        permStatus.receive === "prompt-with-rationale"
      ) {
        permStatus = await pushPlugin.requestPermissions();
      }

      if (permStatus.receive !== "granted") {
        console.warn("⚠️ [PUSH] User denied push notification permissions");
        return false;
      }

      await pushPlugin.register();
      console.log("✅ [PUSH] Registered with FCM service");

      // إنشاء قنوات الإشعارات لنظام أندرويد لتمكين التخصيص والتحكم في النغمات
      try {
        await Promise.all([
          pushPlugin.createChannel({
            id: "maxp_messages_channel",
            name: "رسائل العملاء والواتساب",
            description: "إشعارات رسائل الواتساب والعملاء الواردة",
            importance: 5,
            visibility: 1,
            sound: "default",
            vibration: true,
            lights: true,
          }),
          pushPlugin.createChannel({
            id: "maxp_orders_channel",
            name: "الطلبات الجديدة وتغيير الحالة",
            description: "إشعارات إنشاء الطلبات وتحديثات الشحن والتوصيل",
            importance: 5,
            visibility: 1,
            sound: "default",
            vibration: true,
            lights: true,
          }),
          pushPlugin.createChannel({
            id: "maxp_tasks_channel",
            name: "المهام والتذكيرات",
            description: "إشعارات تكليف ومتابعة المهام ومواعيد الاستحقاق",
            importance: 4,
            visibility: 1,
            sound: "default",
            vibration: true,
            lights: true,
          }),
          pushPlugin.createChannel({
            id: "maxp_default_channel",
            name: "إشعارات MaxP العامة",
            description: "تنبيهات النظام العامة",
            importance: 4,
            visibility: 1,
            sound: "default",
            vibration: true,
            lights: true,
          }),
        ]);
        console.log("✅ [PUSH] All Android notification channels configured successfully");
      } catch (channelError) {
        console.warn("⚠️ [PUSH] Notification channel setup warning:", channelError);
      }

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
    const pushPlugin = getPushPlugin();
    if (!pushPlugin) return;

    // 1. استلام توكن الـ FCM من جوجل
    pushPlugin.addListener("registration", async (token: any) => {
      console.log("📲 [PUSH] FCM Device Token received:", token.value?.substring(0, 16) + "...");
      this.currentDeviceToken = token.value;
      await this.syncTokenWithBackend(token.value);
    });

    // 2. خطأ في التسجيل لدى FCM
    pushPlugin.addListener("registrationError", (err: any) => {
      console.error("❌ [PUSH] Error registering device token:", err);
    });

    const navigateSafely = (target: string) => {
      let destination = target;
      if (/^https?:\/\/(?:www\.)?maxp\.online/i.test(destination)) {
        try {
          const parsed = new URL(destination);
          destination = parsed.pathname + parsed.search + parsed.hash;
        } catch {}
      }

      if (destination.startsWith("/")) {
        window.dispatchEvent(new CustomEvent("maxp:navigate", { detail: destination }));
        if (window.location.pathname + window.location.search !== destination) {
          setTimeout(() => {
            if (window.location.pathname + window.location.search !== destination) {
              window.location.href = destination;
            }
          }, 100);
        }
      } else {
        window.open(destination, "_blank");
      }
    };

    // 3. وصول إشعار والتطبيق مفتوح في المقدمة (Foreground)
    pushPlugin.addListener("pushNotificationReceived", async (notification: any) => {
      console.log("🔔 [PUSH] Notification received in foreground:", notification.title);
      try {
        const { toast } = await import("sonner");
        const data = notification.data || {};
        const targetUrl =
          data.url ||
          (data.conversationId ? `/whatsapp-inbox?conversationId=${encodeURIComponent(data.conversationId)}` : null) ||
          (data.taskId ? `/tasks/${data.taskId}` : null) ||
          (data.orderId ? `/orders?orderId=${data.orderId}` : null);

        toast(notification.title || "إشعار جديد", {
          description: notification.body,
          duration: 6000,
          action: targetUrl
            ? {
                label: "عرض",
                onClick: () => {
                  navigateSafely(targetUrl);
                },
              }
            : undefined,
        });
      } catch (toastErr) {
        console.warn("Could not display in-app toast for push notification:", toastErr);
      }
    });

    // 4. نقر المستخدم على الإشعار من شريط الهاتف أو شاشة القفل
    pushPlugin.addListener("pushNotificationActionPerformed", (action: any) => {
      const data = action.notification?.data || {};
      console.log("👆 [PUSH] Notification clicked by user:", data);

      const targetUrl =
        data.url ||
        (data.conversationId ? `/whatsapp-inbox?conversationId=${encodeURIComponent(data.conversationId)}` : null) ||
        (data.taskId ? `/tasks/${data.taskId}` : null) ||
        (data.orderId ? `/orders?orderId=${data.orderId}` : null);

      if (targetUrl) {
        navigateSafely(targetUrl);
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
        platform: getCapacitor()?.getPlatform?.() || "android",
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
