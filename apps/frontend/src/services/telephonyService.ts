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
    if (!isCapacitorNative() || this.isAgentInitialized) {
      return;
    }

    try {
      this.isAgentInitialized = true;
      const deviceInfo = await MaxPTelephony.getDeviceInfo();

      // الخدمة الأمامية: تُبقي عملية التطبيق (والسوكت والنبض) حية في الخلفية
      // بإشعار دائم — بدونها أندرويد يقتل الاتصال بعد إغلاق الشاشة ولا يصل أمر الاتصال
      try {
        await MaxPTelephony.startTelephonyService();
      } catch (svcErr) {
        console.warn("Foreground telephony service failed to start:", svcErr);
      }

      // إعفاء تحسين البطارية: يُطلب مرة واحدة فقط — أجهزة هواوي/شاومي/أوبو
      // تقتل التطبيقات الخلفية مهما كانت الخدمة بدون هذه الموافقة اليدوية
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
      this.heartbeatInterval = setInterval(sendHeartbeat, 60000);

      // دالة لتسجيل مستمع أمر الاتصال على المقبس
      const registerSocketDialListener = () => {
        socketService.off("telephony:dial");
        socketService.on("telephony:dial", async (data: any) => {
          try {
            if (!data?.customerPhone) return;
            await MaxPTelephony.dialCustomer({
              phone: data.customerPhone,
              sessionId: data.sessionId,
              orderId: data.orderId,
            });
          } catch (error) {
            console.error("Failed to execute native dial:", error);
          }
        });
      };

      // تسجيل المستمع فورياً وعند أي إعادة اتصال بالمقبس
      registerSocketDialListener();
      socketService.on("connect", () => {
        registerSocketDialListener();
        sendHeartbeat(); // نبض فوري عند استعادة الاتصال
      });

      // الاستماع لانتهاء المكالمة من الـ Native CallStateReceiver
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
    } catch (error) {
      console.warn("Telephony plugin not supported or error on mobile init:", error);
    }
  }
}

export const telephonyClientService = new TelephonyClientService();
export default telephonyClientService;
