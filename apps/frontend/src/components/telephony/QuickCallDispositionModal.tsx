import React from "react";
import { CheckCircle2, PhoneOff, Clock, XCircle, PhoneCall } from "lucide-react";
import { useModalA11y } from "../../hooks/useModalA11y";

interface QuickCallDispositionModalProps {
  isOpen: boolean;
  orderNumber: string;
  customerName?: string;
  durationSeconds: number;
  onClose: () => void;
  onConfirm: () => void;
  onNoAnswer: () => void;
  onPostpone: () => void;
  onCancel: () => void;
}

export const QuickCallDispositionModal: React.FC<QuickCallDispositionModalProps> = ({
  isOpen,
  orderNumber,
  customerName,
  durationSeconds,
  onClose,
  onConfirm,
  onNoAnswer,
  onPostpone,
  onCancel,
}) => {
  const panelRef = useModalA11y(isOpen, onClose);
  if (!isOpen) return null;

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const formattedDuration =
    minutes > 0
      ? `${minutes} دقيقة و ${seconds} ثانية`
      : `${seconds} ثانية`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="توثيق نتيجة المكالمة"
        className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-start"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <PhoneCall className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                توثيق نتيجة المكالمة
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                طلب #{orderNumber} {customerName ? `• ${customerName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة توثيق المكالمة"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Telemetry: Official Duration */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            مدة المكالمة الرسمية (TelephonyManager):
          </span>
          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formattedDuration}
          </span>
        </div>

        {/* Action Buttons using standard order workflow */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            اختر نتيجة المكالمة لتحديث حالة الطلب:
          </p>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تم التأكيد وتحديد موعد التوصيل</span>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">تحديث إلى مؤكد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onNoAnswer();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold text-sm hover:bg-amber-100 dark:hover:bg-amber-900/50 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <PhoneOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>العميل لم يرد / مغلق</span>
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400">تسجيل محاولة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onPostpone();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-semibold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>طلب تأجيل الشحن لموعد آخر</span>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400">تأجيل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCancel();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-semibold text-sm hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>طلب العميل إلغاء الطلب</span>
            </div>
            <span className="text-xs text-rose-600 dark:text-rose-400">إلغاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};
