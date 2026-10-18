import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneCall,
  Smartphone,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { telephonyClientService } from "../../services/telephonyService";
import { useDevicePresence, refreshDevicePresence } from "../../hooks/useDevicePresence";
import { socketService } from "../../services/socketService";
import { QuickCallDispositionModal } from "./QuickCallDispositionModal";

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
  const [lastDuration, setLastDuration] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [dialSeconds, setDialSeconds] = useState(0);
  const dialWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    socketService.on("telephony:call_ended", handleCallEnded);
    return () => {
      socketService.off("telephony:call_ended", handleCallEnded);
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
      toast.success(
        `جاري الرنين على ${res.customerPhone} عبر هاتف ${res.deviceName || "الموظف"}...`
      );
    } catch (error: any) {
      toast.error(error.message || "فشل إطلاق الاتصال");
      void refreshDevicePresence();
    } finally {
      setIsLoading(false);
    }
  };

  const [isRefreshingPresence, setIsRefreshingPresence] = useState(false);

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
        presence.isOnline
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          : "bg-muted/50 text-muted-foreground border-border/60"
      }`}
      title={
        presence.isOnline
          ? `الهاتف متصل: ${presence.device?.deviceName || "Android"} (انقر لإعادة الفحص)`
          : "الهاتف غير متصل. افتح تطبيق MaxP على الهاتف ثم انقر هنا للتحديث الفوري."
      }
    >
      {isRefreshingPresence ? (
        <RotateCw className="size-3 shrink-0 animate-spin text-primary" />
      ) : (
        <span
          className={`size-1.5 rounded-full ${
            presence.isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/60"
          }`}
        />
      )}
      <Smartphone className="size-3 shrink-0 text-muted-foreground" />
      <span className="truncate max-w-[110px]">
        {presence.isOnline ? presence.device?.deviceName || "متصل" : "غير متصل"}
      </span>
    </div>
  );

  const hasDistinctSecondary =
    Boolean(secondaryPhone && secondaryPhone !== customerPhone && secondaryPhone.trim().length >= 8);

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {!compact && deviceBadge}

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
    </div>
  );
};

export default OrderCallButton;
