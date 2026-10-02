import React, { useState, useEffect, useCallback } from "react";
import { Phone, PhoneCall, Smartphone, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { telephonyClientService } from "../../services/telephonyService";
import { useDevicePresence } from "../../hooks/useDevicePresence";
import { socketService } from "../../services/socketService";
import { QuickCallDispositionModal } from "./QuickCallDispositionModal";

interface OrderCallButtonProps {
  orderId: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  compact?: boolean;
  onConfirm?: () => void;
  onNoAnswer?: () => void;
  onPostpone?: () => void;
  onCancel?: () => void;
}

export const OrderCallButton: React.FC<OrderCallButtonProps> = ({
  orderId,
  orderNumber,
  customerName,
  customerPhone,
  compact = false,
  onConfirm,
  onNoAnswer,
  onPostpone,
  onCancel,
}) => {
  const { presence } = useDevicePresence();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialing, setIsDialing] = useState(false);
  const [showDisposition, setShowDisposition] = useState(false);
  const [lastDuration, setLastDuration] = useState(0);

  // الاستماع لحدث انتهاء المكالمة الخاصة بهذا الطلب عبر Socket.IO
  useEffect(() => {
    const handleCallEnded = (data: any) => {
      if (data?.orderId === orderId) {
        setIsDialing(false);
        setLastDuration(data?.durationSeconds || 0);
        setShowDisposition(true);
      }
    };

    socketService.on("telephony:call_ended", handleCallEnded);
    return () => {
      socketService.off("telephony:call_ended", handleCallEnded);
    };
  }, [orderId]);

  const handleStartCall = async () => {
    if (!customerPhone) {
      toast.error("لا يوجد رقم هاتف مسجل لهذا الطلب");
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
      const res = await telephonyClientService.initiateCall(orderId);
      setIsDialing(true);
      toast.success(
        `جاري الرنين على ${res.customerPhone} عبر هاتف ${res.deviceName || "الموظف"}...`
      );
    } catch (error: any) {
      toast.error(error.message || "فشل إطلاق الاتصال");
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
      <Smartphone className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[120px]">
        {presence.isOnline ? presence.device?.deviceName || "متصل" : "غير متصل"}
      </span>
    </div>
  );

  return (
    <div className="inline-flex items-center gap-2">
      {!compact && deviceBadge}

      <button
        type="button"
        onClick={handleStartCall}
        disabled={isLoading || isDialing || !customerPhone}
        title={
          !presence.isOnline
            ? "يرجى فتح تطبيق MaxP على هاتفك للاتصال"
            : `اتصال بالعميل (${customerPhone})`
        }
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-[0.97] ${
          isDialing
            ? "bg-amber-600 text-white animate-pulse"
            : presence.isOnline
            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
            : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isDialing ? (
          <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
        ) : (
          <Phone className="w-3.5 h-3.5" />
        )}
        <span>
          {isLoading
            ? "جاري الربط..."
            : isDialing
            ? "مكالمة جارية..."
            : compact
            ? "اتصال"
            : "اتصال هاتفي"}
        </span>
      </button>

      {/* نافذة توثيق النتيجة السريعة فور انتهاء المكالمة */}
      <QuickCallDispositionModal
        isOpen={showDisposition}
        orderNumber={orderNumber}
        customerName={customerName}
        durationSeconds={lastDuration}
        onClose={() => setShowDisposition(false)}
        onConfirm={() => onConfirm?.()}
        onNoAnswer={() => onNoAnswer?.()}
        onPostpone={() => onPostpone?.()}
        onCancel={() => onCancel?.()}
      />
    </div>
  );
};
