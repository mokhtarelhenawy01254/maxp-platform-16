import React, { useState, useEffect } from "react";
import { Phone, PhoneCall, X, User, ShoppingBag } from "lucide-react";
import { registerPlugin } from "@capacitor/core";

interface DialEventData {
  sessionId: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone: string;
  deviceId?: string;
}

interface MaxPTelephonyNativePlugin {
  dialCustomer(options: {
    phone: string;
    sessionId: string;
    orderId: string;
  }): Promise<{ success: boolean; sessionId: string }>;
}

const MaxPTelephony = registerPlugin<MaxPTelephonyNativePlugin>("MaxPTelephony");

export const MobileCallOverlay: React.FC = () => {
  const [activeCall, setActiveCall] = useState<DialEventData | null>(null);

  useEffect(() => {
    const handleIncomingDial = (event: any) => {
      const data: DialEventData = event.detail;
      if (!data?.customerPhone) return;

      setActiveCall(data);

      // تشغيل الاهتزاز إن كان مدعوماً
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([400, 200, 400, 200, 800]);
        }
      } catch {
        // ignore
      }

      // تشغيل نغمة تنبيه لطيفة باستخدام Web Audio API
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
          setTimeout(() => {
            ctx.close().catch(() => {});
          }, 1000);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("telephony:incoming_dial", handleIncomingDial);
    return () => {
      window.removeEventListener("telephony:incoming_dial", handleIncomingDial);
    };
  }, []);

  // إغلاق تلقائي للتنبيه بعد 45 ثانية في حال عدم التفاعل
  useEffect(() => {
    if (!activeCall) return;
    const timer = setTimeout(() => {
      setActiveCall(null);
    }, 45000);
    return () => clearTimeout(timer);
  }, [activeCall]);

  if (!activeCall) return null;

  const handleExecuteDial = async () => {
    const call = activeCall;
    setActiveCall(null);
    try {
      await MaxPTelephony.dialCustomer({
        phone: call.customerPhone,
        sessionId: call.sessionId,
        orderId: call.orderId,
      });
    } catch {
      window.location.href = `tel:${call.customerPhone}`;
    }
  };

  const handleDismiss = () => {
    setActiveCall(null);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-x-0 bottom-0 z-[99999] p-4 bg-slate-900/95 backdrop-blur-md border-t-2 border-emerald-500 shadow-2xl text-white transition-transform duration-300 ease-out animate-in slide-in-from-bottom"
    >
      <div className="max-w-md mx-auto">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400">
              <PhoneCall className="w-6 h-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                مكالمة واردة من شاشة الطلبات
              </div>
              <div className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                <User className="w-4 h-4 text-slate-400" />
                {activeCall.customerName || "عميل"}
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-800/80 rounded-xl p-3 mb-4 space-y-1.5 border border-slate-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">رقم الهاتف:</span>
            <span className="font-mono font-bold text-emerald-400 text-base" dir="ltr">
              {activeCall.customerPhone}
            </span>
          </div>
          {activeCall.orderNumber && (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                رقم الطلب:
              </span>
              <span className="font-mono font-medium text-slate-300">
                {activeCall.orderNumber}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExecuteDial}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition shadow-lg shadow-emerald-600/30 text-base"
          >
            <Phone className="w-5 h-5 fill-current" />
            <span>اتصل الآن بالعميل</span>
          </button>
          <button
            onClick={handleDismiss}
            className="py-3.5 px-4 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition border border-slate-700 text-sm"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileCallOverlay;
