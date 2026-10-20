import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneCall,
  Smartphone,
  RotateCw,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { telephonyClientService } from "../../services/telephonyService";
import { useDevicePresence, refreshDevicePresence } from "../../hooks/useDevicePresence";
import { socketService } from "../../services/socketService";
import { QuickCallDispositionModal } from "./QuickCallDispositionModal";
import { TelephonyDiagnosticsModal } from "./TelephonyDiagnosticsModal";

interface OrderCallButtonProps {
  orderId: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  secondaryPhone?: string | null;
  compact?: boolean;
  onConfirm?: () => void;
  onNoAnswer?: () => void;
  onPostpone?: () => void;
  onCancel?: () => void;
  onCallFinished?: () => void;
}

export const OrderCallButton: React.FC<OrderCallButtonProps> = ({
  orderId,
  orderNumber,
  customerName,
  customerPhone,
  secondaryPhone,
  compact = false,
  onConfirm,
  onNoAnswer,
  onPostpone,
  onCancel,
  onCallFinished,
}) => {
  const { presence } = useDevicePresence();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialing, setIsDialing] = useState(false);
  const [showDisposition, setShowDisposition] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [lastDuration, setLastDuration] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [dialSeconds, setDialSeconds] = useState(0);
  const dialWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDialToastTimeRef = useRef<number>(0);
  const isDialingRef = useRef<boolean>(false);

  useEffect(() => {
    isDialingRef.current = isDialing || isLoading;
  }, [isDialing, isLoading]);

  // 20-second cooldown timer between call attempts
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // عداد مرئي أثناء الرنين
  useEffect(() => {
    if (!isDialing) {
      setDialSeconds(0);
      return;
    }
    setDialSeconds(0);
    const started = Date.now();
    const timer = setInterval(() => setDialSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [isDialing]);

  const clearDialWatchdog = () => {
    if (dialWatchdogRef.current) {
      clearTimeout(dialWatchdogRef.current);
      dialWatchdogRef.current = null;
    }
  };

  const armDialWatchdog = () => {
    clearDialWatchdog();
    dialWatchdogRef.current = setTimeout(() => {
      setIsDialing(false);
      toast.error(
        "لم يستجب هاتفك للأمر — تأكد أن تطبيق MaxP مفتوح على الهاتف والشاشة مضاءة ثم أعد المحاولة.",
        { duration: 5000 },
      );
      void refreshDevicePresence();
    }, 30000);
  };

  useEffect(() => () => clearDialWatchdog(), []);

  // الاستماع لحدث انتهاء المكالمة الخاصة بهذا الطلب عبر Socket.IO
  useEffect(() => {
    const handleCallEnded = (data: any) => {
      if (data?.orderId === orderId) {
        clearDialWatchdog();
        setIsDialing(false);
        setLastDuration(data?.durationSeconds || 0);
        setShowDisposition(true);
        onCallFinished?.();
      }
    };

    const handleDialReceived = (data: any) => {
      if (data?.orderId === orderId && isDialingRef.current) {
        const now = Date.now();
        if (now - lastDialToastTimeRef.current > 4000) {
          lastDialToastTimeRef.current = now;
          toast.info("📱 الهاتف استلم أمر الاتصال بنجاح وجاري فتح المكالمة...");
        }
        // الهاتف استلم الأمر وبدأ الرنين، نلغي تنبيه عدم الاستجابة ونضع مهلة أمان قصوى للمكالمة
        clearDialWatchdog();
        dialWatchdogRef.current = setTimeout(() => {
          setIsDialing(false);
        }, 10 * 60 * 1000);
      }
    };

    socketService.on("telephony:call_ended", handleCallEnded);
    socketService.on("telephony:dial_received", handleDialReceived);
    return () => {
      socketService.off("telephony:call_ended", handleCallEnded);
      socketService.off("telephony:dial_received", handleDialReceived);
    };
  }, [orderId, onCallFinished]);

  const handleStartCall = async (targetPhone?: string) => {
    const phoneToCall = targetPhone || customerPhone;
    if (!phoneToCall) {
      toast.error("لا يوجد رقم هاتف مسجل لهذا الطلب");
      return;
    }

    if (cooldown > 0) {
      toast.error(`يرجى الانتظار ${cooldown} ثانية قبل الاتصال مرة أخرى`);
      return;
    }

    if (!presence.isOnline) {
      toast.error(
        "الهاتف غير متصل حالياً! يرجى فتح تطبيق MaxP على هاتفك الأندرويد ليتم الاتصال فوراً.",
        { duration: 4000 }
      );
      return;
    }

    try {
      setIsLoading(true);
      const res = await telephonyClientService.initiateCall(orderId, phoneToCall);
      setIsDialing(true);
      armDialWatchdog();
      setCooldown(20);
      if (isBrowserDevice) {
        toast.info(
          "📱 الهاتف متصل عبر المتصفح: سيفتح الرقم على شاشة الهاتف، اضغط زر الاتصال الأخضر. (للرنين التلقائي المباشر بدون لمس الشاشة، افتح تطبيق MaxP APK الإصدار 1.2.0)",
          { duration: 7000 }
        );
      } else {
        toast.success(
          `جاري الرنين والاتصال التلقائي المباشر على ${res.customerPhone} عبر هاتف ${res.deviceName || "الموظف"}...`
        );
      }
    } catch (error: any) {
      toast.error(error.message || "فشل إطلاق الاتصال");
      void refreshDevicePresence();
    } finally {
      setIsLoading(false);
    }
  };

  const [isRefreshingPresence, setIsRefreshingPresence] = useState(false);

  const isNativeApp =
    presence.isOnline &&
    Boolean(presence.device?.appVersion) &&
    presence.device?.appVersion !== "MaxP Mobile Agent";

  const isBrowserDevice =
    presence.isOnline &&
    (!presence.device?.appVersion || presence.device.appVersion === "MaxP Mobile Agent");

  const handleManualPresenceRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshingPresence(true);
    try {
      const res = await refreshDevicePresence();
      if (res.isOnline) {
        toast.success(`الهاتف متصل: ${res.device?.deviceName || "متصل"}`);
      } else {
        toast.info("الهاتف غير متصل بعد — افتح تطبيق MaxP على الهاتف لربط الاتصال");
      }
    } catch {
      toast.error("فشل تحديث حالة الهاتف");
    } finally {
      setIsRefreshingPresence(false);
    }
  };

  const deviceBadge = (
    <div
      onClick={handleManualPresenceRefresh}
      role="button"
      tabIndex={0}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border font-mono tabular-nums transition-colors cursor-pointer hover:opacity-80 active:scale-95 ${
        isNativeApp
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          : isBrowserDevice
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
          : "bg-muted/50 text-muted-foreground border-border/60"
      }`}
      title={
        isNativeApp
          ? `📱 تطبيق MaxP الأصلي متصل وجاهز للرنين التلقائي المباشر (${presence.device?.deviceName || "Android"} - ${presence.device?.appVersion || ""}) - انقر للتحديث`
          : isBrowserDevice
          ? `⚠️ متصل عبر المتصفح (${presence.device?.deviceName || "Web"}): للاتصال التلقائي بدون لمس، حمّل وافتح تطبيق MaxP APK الجديد (1.2.0)`
          : "الهاتف غير متصل. افتح تطبيق MaxP على الهاتف ثم انقر هنا للتحديث الفوري."
      }
    >
      {isRefreshingPresence ? (
        <RotateCw className="size-3 shrink-0 animate-spin text-primary" />
      ) : (
        <span
          className={`size-1.5 rounded-full ${
            isNativeApp
              ? "bg-emerald-500 animate-pulse"
              : isBrowserDevice
              ? "bg-amber-500 animate-pulse"
              : "bg-muted-foreground/60"
          }`}
        />
      )}
      <Smartphone className={`size-3 shrink-0 ${isNativeApp ? "text-emerald-500" : isBrowserDevice ? "text-amber-500" : "text-muted-foreground"}`} />
      <span className="truncate max-w-[125px]">
        {isNativeApp
          ? `${presence.device?.deviceName || "أندرويد"} (مباشر)`
          : isBrowserDevice
          ? `${presence.device?.deviceName || "متصفح"} (يدوي)`
          : "غير متصل"}
      </span>
    </div>
  );

  const hasDistinctSecondary =
    Boolean(secondaryPhone && secondaryPhone !== customerPhone && secondaryPhone.trim().length >= 8);

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {!compact && (
        <div className="inline-flex items-center gap-1">
          {deviceBadge}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDiagnostics(true);
            }}
            title="سجل فحص وتشخيص الاتصال المباشر (Telephony Diagnostics)"
            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Activity className="size-3.5" />
          </button>
        </div>
      )}

      {/* Primary Phone Call Button */}
      <button
        type="button"
        onClick={() => handleStartCall()}
        disabled={isLoading || isDialing || cooldown > 0 || !customerPhone}
        title={
          !presence.isOnline
            ? "يرجى فتح تطبيق MaxP على هاتفك للاتصال"
            : cooldown > 0
            ? `انتظر ${cooldown} ثانية بين المكالمات`
            : `اتصال بالرقم الأساسي (${customerPhone})`
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono tabular-nums transition-all shadow-2xs active:scale-[0.98] ${
          isDialing
            ? "bg-amber-500 text-white animate-pulse"
            : cooldown > 0
            ? "bg-muted text-muted-foreground cursor-not-allowed border border-border/70"
            : presence.isOnline
            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
            : "bg-muted text-muted-foreground cursor-not-allowed border border-border/60"
        }`}
      >
        {isLoading ? (
          <RotateCw className="size-3.5 animate-spin" />
        ) : isDialing ? (
          <PhoneCall className="size-3.5 animate-bounce" />
        ) : (
          <Phone className="size-3.5" />
        )}
        <span>
          {isLoading
            ? "جاري الربط..."
            : isDialing
            ? `يرن… ${dialSeconds}ث`
            : cooldown > 0
            ? `انتظر (${cooldown}ث)`
            : compact
            ? "اتصال"
            : "اتصال هاتفي"}
        </span>
      </button>

      {/* Optional Alternate/Secondary Phone Call Button */}
      {hasDistinctSecondary && (
        <button
          type="button"
          onClick={() => handleStartCall(secondaryPhone || undefined)}
          disabled={isLoading || isDialing || cooldown > 0}
          title={`اتصال بالرقم البديل (${secondaryPhone})`}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 font-mono tabular-nums active:scale-[0.98]"
        >
          <Phone className="size-3" />
          <span>بديل</span>
        </button>
      )}

      {/* نافذة توثيق النتيجة السريعة فور انتهاء المكالمة */}
      <QuickCallDispositionModal
        isOpen={showDisposition}
        orderNumber={orderNumber}
        customerName={customerName}
        durationSeconds={lastDuration}
        onClose={() => {
          setShowDisposition(false);
          onCallFinished?.();
        }}
        onConfirm={() => {
          onConfirm?.();
          onCallFinished?.();
        }}
        onNoAnswer={() => {
          onNoAnswer?.();
          onCallFinished?.();
        }}
        onPostpone={() => {
          onPostpone?.();
          onCallFinished?.();
        }}
        onCancel={() => {
          onCancel?.();
          onCallFinished?.();
        }}
      />

      {/* نافذة فحص وتشخيص الاتصال المباشر */}
      <TelephonyDiagnosticsModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
      />
    </div>
  );
};

export default OrderCallButton;

