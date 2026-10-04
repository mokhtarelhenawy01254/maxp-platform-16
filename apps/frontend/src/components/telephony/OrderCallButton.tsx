import React, { useState, useEffect, useRef } from "react";
import {
  PhoneIcon,
  PhoneArrowUpRightIcon,
  DevicePhoneMobileIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
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

  // عداد مرئي أثناء الرنين — الانتظار الصامت كان يوحي بالتعليق (الحارس 30ث موجود)
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

  // حارس الرنين: لو الهاتف لم يرسل "انتهت المكالمة" خلال 30 ثانية فالأمر لم
  // يصله أصلًا (تطبيق مقفول/سوكت ميت) — فشل صادق فورًا بدل زر معلق للأبد
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

  const deviceBadge = (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
        presence.isOnline
          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
      }`}
      title={
        presence.isOnline
          ? `الهاتف متصل: ${presence.device?.deviceName || "Android"}`
          : "الهاتف غير متصل. افتح تطبيق MaxP على الهاتف لربط الاتصال."
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          presence.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
        }`}
      />
      <DevicePhoneMobileIcon className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[120px]">
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
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-[0.97] ${
          isDialing
            ? "bg-amber-600 text-white animate-pulse"
            : cooldown > 0
            ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
            : presence.isOnline
            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {isLoading ? (
          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
        ) : isDialing ? (
          <PhoneArrowUpRightIcon className="w-3.5 h-3.5 animate-bounce" />
        ) : (
          <PhoneIcon className="w-3.5 h-3.5" />
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
          className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 text-xs font-bold text-primary transition-transform active:scale-[0.98] hover:bg-primary/20 disabled:opacity-50"
        >
          <PhoneIcon className="w-3 h-3" />
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
