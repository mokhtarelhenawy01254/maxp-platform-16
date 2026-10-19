import { registerPlugin } from "@capacitor/core";
import { apiClient } from "./apiClient";
import { socketService } from "./socketService";
import { isCapacitorNative } from "../config/environment";

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  osVersion: string;
}

export interface DevicePresenceResponse {
  isOnline: boolean;
  device: {
    id: string;
    deviceId: string;
    deviceName: string;
    lastSeenAt: string;
    appVersion?: string;
  } | null;
}

export interface CallAttemptLogItem {
  id: string;
  sessionId?: string | null;
  orderId?: string | null;
  direction: string;
  callStatus: string;
  durationSeconds: number;
  customerPhone?: string | null;
  callerPhone?: string | null;
  result?: string | null;
  notes?: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
}

export interface InitiateCallResponse {
  success: boolean;
  sessionId: string;
  orderId: string;
  orderNumber: string;
  customerName?: string;
  customerPhone: string;
  deviceName?: string;
}

interface MaxPTelephonyNativePlugin {
  getDeviceInfo(): Promise<DeviceInfo>;
  dialCustomer(options: {
    phone: string;
    sessionId: string;
    orderId: string;
  }): Promise<{ success: boolean; sessionId: string }>;
  startTelephonyService(): Promise<{ running: boolean }>;
  stopTelephonyService(): Promise<void>;
  isBatteryExempted(): Promise<{ exempted: boolean }>;
  requestBatteryExemption(): Promise<void>;
  addListener(
    eventName: "callEnded",
    listenerFunc: (data: {
      sessionId: string;
      orderId: string;
      phone: string;
      durationSeconds: number;
    }) => void
  ): Promise<any>;
}

const MaxPTelephony = registerPlugin<MaxPTelephonyNativePlugin>("MaxPTelephony");

class TelephonyClientService {
  private isAgentInitialized = false;
  private heartbeatInterval: any = null;

  /**
   * فحص حالة اتصال هاتف الموظف (Presence Check)
   */
  async getDevicePresence(): Promise<DevicePresenceResponse> {
    try {
      const response = await apiClient.get<any>("/telephony/device/presence");
      return (
        response.data?.data || {
          isOnline: false,
          device: null,
        }
      );
    } catch {
      return { isOnline: false, device: null };
    }
  }

  /**
   * طلب بدء مكالمة من الكمبيوتر (Outbound Click-to-Call)
   */
  async initiateCall(orderId: string, targetPhone?: string): Promise<InitiateCallResponse> {
    try {
      const response = await apiClient.post<any>("/telephony/initiate", { orderId, targetPhone });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "فشل بدء المكالمة");
      }
      return response.data.data;
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "فشل بدء المكالمة";
      throw new Error(msg);
    }
  }

  /**
   * توثيق إنهاء المكالمة والمدة الرسمية
   */
  async completeCall(payload: {
    sessionId: string;
    durationSeconds: number;
    callStatus?: string;
    callerPhone?: string;
    result?: string;
    notes?: string;
  }) {
    try {
      const response = await apiClient.post<any>("/telephony/complete", payload);
      return response.data?.data;
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "فشل توثيق المكالمة";
      throw new Error(msg);
    }
  }

  /**
   * جلب سجل مكالمات طلب معين
   */
  async getOrderCallLogs(orderId: string): Promise<CallAttemptLogItem[]> {
    try {
      const response = await apiClient.get<any>(
        `/telephony/orders/${encodeURIComponent(orderId)}/logs`
      );
      return response.data?.data || [];
    } catch {
      return [];
    }
  }

  /**
   * تهيئة وكيل الاتصالات داخل تطبيق الأندرويد (Mobile Native Agent)
   * يتم استدعاؤها مرة واحدة عند إقلاع التطبيق على الموبايل
   */
  async initMobileTelephonyAgent(): Promise<void> {
    const isMobileDevice =
      isCapacitorNative() ||
      (typeof navigator !== "undefined" &&
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ""));

    if (!isMobileDevice || this.isAgentInitialized) {
      return;
    }

    try {
      this.isAgentInitialized = true;

      // 1. استخراج معلومات الجهاز (مع خطة بديلة مرنة في حال عدم توفر الموديول الأصلي)
      let deviceInfo: DeviceInfo;
      let isNativePluginAvailable = false;

      try {
        deviceInfo = await MaxPTelephony.getDeviceInfo();
        isNativePluginAvailable = true;
      } catch (_nativeErr) {
        let fallbackId = localStorage.getItem("maxp_telephony_device_id");
        if (!fallbackId) {
          fallbackId =
            "dev_" +
            Math.random().toString(36).substring(2, 10) +
            "_" +
            Date.now().toString(36);
          localStorage.setItem("maxp_telephony_device_id", fallbackId);
        }

        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        let model = "Android Device";
        if (/STK-L21|HUAWEI/i.test(ua)) {
          model = "HUAWEI STK-L21";
        } else {
          const match = ua.match(/Android[^;]+; ([^;)]+)/);
          if (match && match[1]) {
            model = match[1].trim();
          } else if (/iPhone/i.test(ua)) {
            model = "iPhone";
          }
        }

        deviceInfo = {
          deviceId: fallbackId,
          deviceName: model,
          osVersion: "MaxP Mobile Agent",
        };
      }

      // إذا كان الموديول الأصلي متاحاً، تشغيل الخدمة الأمامية وإعفاء البطارية
      if (isNativePluginAvailable) {
        try {
          await MaxPTelephony.startTelephonyService();
        } catch (svcErr) {
          console.warn("Foreground telephony service failed to start:", svcErr);
        }

        const EXEMPTION_KEY = "maxp_battery_exemption_requested";
        try {
          if (!localStorage.getItem(EXEMPTION_KEY)) {
            const { exempted } = await MaxPTelephony.isBatteryExempted();
            if (!exempted) {
              await MaxPTelephony.requestBatteryExemption();
            }
            localStorage.setItem(EXEMPTION_KEY, "1");
          }
        } catch (batteryErr) {
          console.warn("Battery exemption request failed:", batteryErr);
        }
      }

      // 2. دالة نبض الاتصال الدورية (Heartbeat)
      const sendHeartbeat = async () => {
        try {
          const socket = socketService.getSocket();
          const socketConnected = socketService.isConnected();
          await apiClient.post("/telephony/device/heartbeat", {
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            socketId: socket?.id || null,
            appVersion: deviceInfo.osVersion,
            socketConnected,
          });
        } catch {
          // ignore heartbeat errors
        }
      };

      await sendHeartbeat();
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = setInterval(sendHeartbeat, 45000);

      // 3. دالة لتسجيل مستمع أمر الاتصال على المقبس
      const registerSocketDialListener = () => {
        socketService.off("telephony:dial");
        socketService.on("telephony:dial", async (data: any) => {
          try {
            if (!data?.customerPhone) return;

            // تصفية الأجهزة: التحقق من أن أمر الاتصال موجه لهذا الجهاز تحديداً
            if (data.deviceId && deviceInfo?.deviceId && data.deviceId !== deviceInfo.deviceId) {
              return;
            }

            // إشعار الخادم وشاشة الكمبيوتر بأن الهاتف استلم أمر الاتصال بنجاح
            try {
              const socket = socketService.getSocket();
              socket?.emit("telephony:dial_received", {
                sessionId: data.sessionId,
                orderId: data.orderId,
                customerPhone: data.customerPhone,
                deviceName: deviceInfo.deviceName,
              });
            } catch {
              // ignore ack error
            }

            // إطلاق حدث محلي لعرض شاشة الاتصال السريعة التفاعلية على شاشة الهاتف (MobileCallOverlay)
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("telephony:incoming_dial", { detail: data })
              );
            }

            // محاولة الاتصال المباشر عبر موديول أندرويد الأصلي
            if (isNativePluginAvailable) {
              try {
                await MaxPTelephony.dialCustomer({
                  phone: data.customerPhone,
                  sessionId: data.sessionId,
                  orderId: data.orderId,
                });
                return;
              } catch (nativeErr) {
                console.warn("Native dialCustomer failed or background restricted:", nativeErr);
              }
            }

            // محاولة إطلاق رابط tel: السريع
            try {
              const safePhone = String(data.customerPhone || "").replace(/[^\d+*#]/g, "");
              window.location.href = `tel:${safePhone}`;
            } catch (telErr) {
              console.warn("Direct tel: navigation blocked, user can tap the overlay button:", telErr);
            }
          } catch (error) {
            console.error("Failed to execute telephony:dial listener:", error);
          }
        });
      };

      registerSocketDialListener();
      socketService.on("connect", () => {
        registerSocketDialListener();
        sendHeartbeat();
      });

      // 4. الاستماع لانتهاء المكالمة
      if (isNativePluginAvailable) {
        try {
          await MaxPTelephony.addListener("callEnded", async (eventData) => {
            try {
              await this.completeCall({
                sessionId: eventData.sessionId,
                durationSeconds: eventData.durationSeconds,
                callStatus: eventData.durationSeconds > 0 ? "COMPLETED" : "NO_ANSWER",
                callerPhone: undefined,
              });
            } catch (error) {
              console.error("Failed to sync call completion to server:", error);
            }
          });
        } catch (_listenerErr) {
          // ignore
        }
      }
    } catch (error) {
      console.warn("Telephony agent initialization warning:", error);
    }
  }
}

export const telephonyClientService = new TelephonyClientService();
export default telephonyClientService;
