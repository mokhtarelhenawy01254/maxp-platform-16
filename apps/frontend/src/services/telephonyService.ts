import { registerPlugin } from "@capacitor/core";
import { apiClient } from "./apiClient";
import { socketService } from "./socketService";
import { isCapacitorNative } from "../config/environment";
import { tokenManager } from "../utils/tokenManager";

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
  getDeviceInfo(): Promise<DeviceInfo & { overlayGranted?: boolean }>;
  dialCustomer(options: {
    phone: string;
    sessionId: string;
    orderId: string;
    simSlot?: number;
  }): Promise<{ success: boolean; sessionId: string; method?: string }>;
  startTelephonyService(): Promise<{ running: boolean }>;
  stopTelephonyService(): Promise<void>;
  isBatteryExempted(): Promise<{ exempted: boolean }>;
  requestBatteryExemption(): Promise<void>;
  isOverlayPermissionGranted?(): Promise<{ granted: boolean }>;
  requestOverlayPermission?(): Promise<void>;
  setPreferredSim?(options: { simSlot: number }): Promise<void>;
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
/**
 * الانتظار الذكي لجسر Capacitor في الروابط السحابية البعيدة (Remote URLs)
 */
async function waitForCapacitorBridge(timeoutMs = 3500): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const win = window as any;
    if (win.Capacitor?.isNativePlatform?.() && win.Capacitor?.Plugins?.MaxPTelephony) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  const win = window as any;
  return Boolean(win?.Capacitor?.isNativePlatform?.());
}


class TelephonyClientService {
  private isAgentInitialized = false;
  private listenersBound = false;
  private heartbeatInterval: any = null;
  private handledSessionIds = new Set<string>();
  private activeCallWatchdogInterval: any = null;
  public currentDeviceInfo: DeviceInfo | null = null;

  public isNativeTelephonyAvailable = false;

  /**
   * تسجيل وإرسال أحداث التشخيص لسيرفر MaxP وللوحدة المحلية
   */
  public logDiagnostic(event: string, details?: any): void {
    const timestamp = new Date().toISOString();
    const logItem = { timestamp, event, details };

    if (typeof window !== "undefined") {
      if (!(window as any).__MAXP_TELEPHONY_LOGS__) {
        (window as any).__MAXP_TELEPHONY_LOGS__ = [];
      }
      (window as any).__MAXP_TELEPHONY_LOGS__.push(logItem);
      if ((window as any).__MAXP_TELEPHONY_LOGS__.length > 150) {
        (window as any).__MAXP_TELEPHONY_LOGS__.shift();
      }
    }

    console.log(`📱 [TELEPHONY-LOG] [${event}]:`, details || "");

    const token = tokenManager.getAccessToken();
    if (!token) return;

    try {
      apiClient.post("/telephony/diagnostic-log", {
        event,
        deviceId: this.currentDeviceInfo?.deviceId,
        deviceName: this.currentDeviceInfo?.deviceName,
        timestamp,
        details,
      }).catch(() => {});
    } catch {
      // ignore
    }
  }

  /**
   * استرجاع سجلات التشخيص الحية
   */
  async getDiagnosticLogs(): Promise<any[]> {
    const token = tokenManager.getAccessToken();
    if (!token) return [];
    try {
      const res = await apiClient.get<any>("/telephony/diagnostic-logs");
      return res.data?.data || [];
    } catch {
      return [];
    }
  }

  /**
   * استعلام فوري عن أي مكالمة نشطة حالياً للموظف (Active Call Watchdog)
   */
  async getActiveCall(): Promise<any> {
    const token = tokenManager.getAccessToken();
    if (!token) return null;
    try {
      const response = await apiClient.get<any>("/telephony/active-call");
      return response.data?.data || null;
    } catch {
      return null;
    }
  }

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
        (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "") ||
         (/Linux/i.test(navigator.userAgent || "") && navigator.maxTouchPoints > 0)));

    if (!isMobileDevice) {
      return;
    }

    this.logDiagnostic("AGENT_INIT_REQUESTED", {
      isNative: isCapacitorNative(),
      ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      alreadyInitialized: this.isAgentInitialized
    });

    try {
      this.isAgentInitialized = true;
      await tokenManager.restoreNativeTokens();

      // 1. استخراج معلومات الجهاز (مع خطة بديلة مرنة وانتظار ذكي للموديول الأصلي)
      await waitForCapacitorBridge(3000);

      let deviceInfo: DeviceInfo | null = null;
      let isNativePluginAvailable = false;

      const tryNativePlugin = async (timeoutMs: number = 4000): Promise<DeviceInfo | null> => {
        try {
          const pluginPromise = MaxPTelephony.getDeviceInfo();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout getting native device info")), timeoutMs)
          );
          const res = await Promise.race([pluginPromise, timeoutPromise]);
          if (res && res.deviceId) return res;
        } catch (err: any) {
          this.logDiagnostic("NATIVE_DETECT_ATTEMPT_ERR", { message: err?.message });
        }
        return null;
      };

      const isLikelyNative =
        isCapacitorNative() ||
        (typeof window !== "undefined" && Boolean((window as any).Capacitor?.isNativePlatform?.())) ||
        (typeof navigator !== "undefined" && navigator.userAgent?.includes("MaxP-Native-Android"));

      if (isLikelyNative) {
        for (let attempt = 1; attempt <= 4; attempt++) {
          const nativeRes = await tryNativePlugin(3500);
          if (nativeRes) {
            deviceInfo = nativeRes;
            isNativePluginAvailable = true;
            this.isNativeTelephonyAvailable = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 600));
        }
      } else {
        const nativeRes = await tryNativePlugin(2500);
        if (nativeRes) {
          deviceInfo = nativeRes;
          isNativePluginAvailable = true;
          this.isNativeTelephonyAvailable = true;
        }
      }

      let currentUserId = "default";
      try {
        const userStr = typeof localStorage !== "undefined" ? localStorage.getItem("user") : null;
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u && (u.id || u.userId)) currentUserId = u.id || u.userId;
        }
      } catch {}
      const userDeviceKey = `maxp_telephony_device_id_${currentUserId}`;

      if (!deviceInfo) {
        let fallbackId = localStorage.getItem(userDeviceKey) || localStorage.getItem("maxp_telephony_device_id");
        if (!fallbackId) {
          try {
            // Adopt existing registered device for this employee if available
            const presence = await this.getDevicePresence();
            if (presence?.device?.deviceId) {
              fallbackId = presence.device.deviceId;
              localStorage.setItem(userDeviceKey, fallbackId);
              localStorage.setItem("maxp_telephony_device_id", fallbackId);
            }
          } catch {
            // ignore
          }
        }
        if (!fallbackId) {
          fallbackId =
            "dev_" +
            Math.random().toString(36).substring(2, 10) +
            "_" +
            Date.now().toString(36);
          localStorage.setItem(userDeviceKey, fallbackId);
          localStorage.setItem("maxp_telephony_device_id", fallbackId);
        }

        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        let model = "Android Device";
        if (/STK-L21|HUAWEI/i.test(ua)) {
          model = "HUAWEI STK-L21";
        } else if (/iPhone/i.test(ua)) {
          model = "iPhone";
        } else if (/iPad/i.test(ua)) {
          model = "iPad";
        } else if (/SM-|Samsung/i.test(ua)) {
          const sMatch = ua.match(/SM-[A-Z0-9]+/i);
          model = sMatch ? `Samsung ${sMatch[0]}` : "Samsung Galaxy";
        } else {
          const match = ua.match(/Android[^;]+; ([^;)]+)/);
          if (match && match[1] && match[1].trim() !== "K") {
            model = match[1].trim();
          } else {
            model = "Samsung / Android";
          }
        }

        // استخدام Client Hints لقراءة طراز الهاتف الحقيقي بدقة في متصفح كروم
        if (typeof (navigator as any)?.userAgentData?.getHighEntropyValues === "function") {
          try {
            const hints = await (navigator as any).userAgentData.getHighEntropyValues(["model"]);
            if (hints?.model && hints.model !== "K") {
              model = hints.model.startsWith("SM-") ? `Samsung ${hints.model}` : hints.model;
            }
          } catch {
            // ignore
          }
        }

        deviceInfo = {
          deviceId: fallbackId,
          deviceName: model,
          osVersion: isLikelyNative ? "Android Native (Pending Bridge)" : "MaxP Mobile Agent",
        };
      }

      this.currentDeviceInfo = deviceInfo;

      this.logDiagnostic("DEVICE_READY", {
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        isNative: isNativePluginAvailable,
      });

      // إذا كان الموديول الأصلي متاحاً، تشغيل الخدمة الأمامية وإعفاء البطارية
      if (isNativePluginAvailable) {
        try {
          await MaxPTelephony.startTelephonyService();
          this.logDiagnostic("FOREGROUND_SERVICE_STARTED");
        } catch (svcErr: any) {
          this.logDiagnostic("FOREGROUND_SERVICE_FAILED", { error: svcErr?.message || String(svcErr) });
          console.warn("Foreground telephony service failed to start:", svcErr);
        }

        const EXEMPTION_KEY = "maxp_battery_exemption_requested";
        try {
          if (!localStorage.getItem(EXEMPTION_KEY)) {
            const { exempted } = await MaxPTelephony.isBatteryExempted();
            if (!exempted) {
              await MaxPTelephony.requestBatteryExemption();
              this.logDiagnostic("BATTERY_EXEMPTION_REQUESTED");
            }
            localStorage.setItem(EXEMPTION_KEY, "1");
          }
        } catch (batteryErr: any) {
          this.logDiagnostic("BATTERY_EXEMPTION_ERROR", { error: batteryErr?.message || String(batteryErr) });
          console.warn("Battery exemption request failed:", batteryErr);
        }

        // طلب إذن الاتصال الهاتفي وقراءة الحالة لتمكين الاتصال التلقائي المباشر ACTION_CALL
        try {
          if (typeof (MaxPTelephony as any).checkPermissions === "function") {
            const permStatus = await (MaxPTelephony as any).checkPermissions();
            if (permStatus?.phone !== "granted" && typeof (MaxPTelephony as any).requestPermissions === "function") {
              await (MaxPTelephony as any).requestPermissions();
              this.logDiagnostic("PHONE_PERMISSIONS_REQUESTED");
            }
          }
        } catch (permErr: any) {
          console.warn("Phone permissions check/request warning:", permErr);
        }

        // فحص وطلب إذن الظهور فوق التطبيقات الأخرى (SYSTEM_ALERT_WINDOW) لتمكين إطلاق شاشة الاتصال في الخلفية
        const OVERLAY_KEY = "maxp_overlay_permission_requested";
        try {
          if (typeof MaxPTelephony.isOverlayPermissionGranted === "function") {
            const res = await MaxPTelephony.isOverlayPermissionGranted();
            if (res && !res.granted && !localStorage.getItem(OVERLAY_KEY)) {
              await MaxPTelephony.requestOverlayPermission?.();
              localStorage.setItem(OVERLAY_KEY, "1");
              this.logDiagnostic("OVERLAY_PERMISSION_REQUESTED");
            }
          }
        } catch (overlayErr: any) {
          console.warn("Overlay permission check/request warning:", overlayErr);
        }
      }

      // 2. دالة نبض الاتصال الدورية (Heartbeat)
      const sendHeartbeat = async () => {
        try {
          const socket = socketService.getSocket();
          // نبض الاتصال يُرسل دائماً كمتصل لأن الجهاز يُجري طلب الـ HTTP بنشاط وحيوية
          // إضافة _skipErrorToast لمنع إزعاج المستخدم بأي رسائل تنبيهية في الخلفية
          await apiClient.post("/telephony/device/heartbeat", {
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            socketId: socket?.id || null,
            appVersion: deviceInfo.osVersion,
            socketConnected: true,
          }, {
            _skipErrorToast: true,
          } as any);
          this.logDiagnostic("HEARTBEAT_SENT_SUCCESS", {
            socketId: socket?.id || null,
            socketConnected: socket?.connected || false,
          });
        } catch (err: any) {
          this.logDiagnostic("HEARTBEAT_FAILED", {
            status: err?.response?.status,
            message: err?.message,
          });

          // التعافي التلقائي الذكي في حال تصادم معرّف الجهاز مع موظف آخر (403)
          if (
            err?.response?.status === 403 ||
            err?.response?.data?.message?.includes("لموظف آخر") ||
            err?.response?.data?.message?.includes("مسجل")
          ) {
            this.logDiagnostic("HEARTBEAT_DEVICE_COLLISION_SELF_HEAL", {
              staleDeviceId: deviceInfo.deviceId,
              error: err?.response?.data?.message,
            });
            try {
              localStorage.removeItem("maxp_telephony_device_id");
              localStorage.removeItem(userDeviceKey);
              const healedId =
                "dev_" +
                Math.random().toString(36).substring(2, 10) +
                "_" +
                Date.now().toString(36);
              deviceInfo.deviceId = healedId;
              this.currentDeviceInfo = deviceInfo;
              localStorage.setItem("maxp_telephony_device_id", healedId);
              localStorage.setItem(userDeviceKey, healedId);

              setTimeout(async () => {
                try {
                  const retrySocket = socketService.getSocket();
                  await apiClient.post("/telephony/device/heartbeat", {
                    deviceId: healedId,
                    deviceName: deviceInfo.deviceName,
                    socketId: retrySocket?.id || null,
                    appVersion: deviceInfo.osVersion,
                    socketConnected: true,
                  }, { _skipErrorToast: true } as any);
                  this.logDiagnostic("HEARTBEAT_HEALED_SUCCESS", { deviceId: healedId });
                } catch {
                  // ignore
                }
              }, 400);
            } catch {
              // ignore
            }
            return;
          }

          // في حال كان التوكن ما زال قيد التهيئة (401)، أعد المحاولة بعد 3 ثوانٍ
          if (err?.response?.status === 401) {
            setTimeout(async () => {
              try {
                const retrySocket = socketService.getSocket();
                await apiClient.post("/telephony/device/heartbeat", {
                  deviceId: deviceInfo.deviceId,
                  deviceName: deviceInfo.deviceName,
                  socketId: retrySocket?.id || null,
                  appVersion: deviceInfo.osVersion,
                  socketConnected: true,
                }, { _skipErrorToast: true } as any);
                this.logDiagnostic("HEARTBEAT_RETRY_SUCCESS");
              } catch {
                // ignore
              }
            }, 3000);
          }
        }
      };

      await sendHeartbeat();
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = setInterval(sendHeartbeat, 30000);

      // 3. دالة معالجة أمر الاتصال سواء وصل عبر المقبس أو مراقب الـ HTTP
      const handleIncomingDial = async (data: any, source: string) => {
        try {
          if (!data?.customerPhone) return;

          if (data.sessionId) {
            if (this.handledSessionIds.has(data.sessionId)) {
              return;
            }
            if (this.handledSessionIds.size > 200) {
              const first = this.handledSessionIds.values().next().value;
              if (first) this.handledSessionIds.delete(first);
            }
            this.handledSessionIds.add(data.sessionId);
          }

          console.log(`📞 [Telephony] Incoming dial received via ${source}:`, {
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
          });

          this.logDiagnostic("INCOMING_DIAL_TRIGGERED", {
            source,
            sessionId: data.sessionId,
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
          });

          // إشعار الخادم وشاشة الكمبيوتر بأن الهاتف استلم أمر الاتصال بنجاح
          try {
            const socket = socketService.getSocket();
            socket?.emit("telephony:dial_received", {
              sessionId: data.sessionId,
              orderId: data.orderId,
              customerPhone: data.customerPhone,
              deviceName: deviceInfo.deviceName,
            });
            this.logDiagnostic("ACK_SENT_TO_SERVER", { sessionId: data.sessionId });
          } catch (ackErr: any) {
            this.logDiagnostic("ACK_SEND_FAILED", { error: ackErr?.message });
          }

          // إطلاق حدث محلي لعرض شاشة الاتصال السريعة التفاعلية على شاشة الهاتف (MobileCallOverlay)
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("telephony:incoming_dial", { detail: data })
            );
            this.logDiagnostic("OVERLAY_DISPATCHED", { sessionId: data.sessionId });
          }

          // محاولة الاتصال المباشر عبر موديول أندرويد الأصلي (فقط عند توفر الموديول وبيئة التطبيق الحقيقي)
          const canTryNative =
            (isNativePluginAvailable || this.isNativeTelephonyAvailable) &&
            (isCapacitorNative() ||
              (typeof window !== "undefined" && Boolean((window as any).Capacitor?.isNativePlatform?.())) ||
              (typeof navigator !== "undefined" && navigator.userAgent?.includes("MaxP-Native-Android")));

          if (canTryNative) {
            try {
              this.logDiagnostic("NATIVE_DIAL_ATTEMPTED", { phone: data.customerPhone });
              const dialRes = await MaxPTelephony.dialCustomer({
                phone: data.customerPhone,
                sessionId: data.sessionId,
                orderId: data.orderId,
              });
              this.logDiagnostic("NATIVE_DIAL_SUCCESS", dialRes);
              this.isNativeTelephonyAvailable = true;
              return; // نجح الاتصال المباشر! لا حاجة لفتح لوحة المفاتيح
            } catch (nativeErr: any) {
              this.logDiagnostic("NATIVE_DIAL_FAILED", { error: nativeErr?.message || String(nativeErr) });
              console.warn("Native dialCustomer failed or background restricted:", nativeErr);
            }
          }

          // محاولة إطلاق رابط tel: السريع
          try {
            const safePhone = String(data.customerPhone || "").replace(/[^\d+*#]/g, "");
            this.logDiagnostic("TEL_PROTOCOL_ATTEMPTED", { phone: safePhone });
            window.location.href = `tel:${safePhone}`;
          } catch (telErr: any) {
            this.logDiagnostic("TEL_PROTOCOL_FAILED", { error: telErr?.message || String(telErr) });
            console.warn("Direct tel: navigation blocked, user can tap the overlay button:", telErr);
          }
        } catch (error: any) {
          this.logDiagnostic("INCOMING_DIAL_FATAL_ERROR", { error: error?.message || String(error) });
          console.error("Failed to execute incoming dial handler:", error);
        }
      };

      // 4. دالة لتسجيل مستمع أمر الاتصال على المقبس
      const registerSocketDialListener = () => {
        socketService.off("telephony:dial");
        socketService.on("telephony:dial", async (data: any) => {
          await handleIncomingDial(data, "Socket.IO");
        });
      };

      // 5. مراقب المكالمات النشطة عالي الاعتمادية (Active Call Watchdog)
      // يفحص كل 3.5 ثانية أثناء وجود التطبيق لضمان رنين الهاتف حتى لو كان السوكت نائماً أو في وضع السبات
      const checkAndHandleActiveCall = async () => {
        try {
          const activeCall = await this.getActiveCall();
          if (activeCall && activeCall.sessionId && !this.handledSessionIds.has(activeCall.sessionId)) {
            this.logDiagnostic("WATCHDOG_ACTIVE_CALL_FOUND", {
              sessionId: activeCall.sessionId,
              orderNumber: activeCall.orderNumber,
              customerPhone: activeCall.customerPhone,
            });
            await handleIncomingDial(activeCall, "HTTP Watchdog");
          }
        } catch {
          // ignore watchdog poll error
        }
      };

      registerSocketDialListener();

      if (this.activeCallWatchdogInterval) clearInterval(this.activeCallWatchdogInterval);
      this.activeCallWatchdogInterval = setInterval(() => {
        if (typeof document === "undefined" || document.visibilityState === "visible") {
          checkAndHandleActiveCall();
        }
      }, 3500);

      // تنبيه فوري ومزامنة وإعادة اتصال عند إضاءة الشاشة أو عودة الاتصال
      const triggerImmediateSync = () => {
        this.logDiagnostic("SCREEN_WAKEUP_TRIGGERED");
        socketService.connect();
        registerSocketDialListener();
        sendHeartbeat();
        checkAndHandleActiveCall();
      };

      if (!this.listenersBound) {
        this.listenersBound = true;

        socketService.on("connect", () => {
          registerSocketDialListener();
          sendHeartbeat();
          checkAndHandleActiveCall();
        });

        if (typeof document !== "undefined") {
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
              triggerImmediateSync();
            }
          });
        }
        if (typeof window !== "undefined") {
          window.addEventListener("focus", triggerImmediateSync);
          window.addEventListener("online", triggerImmediateSync);
        }

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
      }
    } catch (error) {
      console.warn("Telephony agent initialization warning:", error);
    }
  }
}

export const telephonyClientService = new TelephonyClientService();
export default telephonyClientService;
