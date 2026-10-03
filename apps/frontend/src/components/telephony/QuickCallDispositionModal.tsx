import React from "react";
import {
  CheckCircleIcon,
  PhoneXMarkIcon,
  ClockIcon,
  XCircleIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="توثيق نتيجة المكالمة"
        className="w-full max-w-md p-6 bg-card rounded-xl shadow-xl border border-border/50 space-y-5 text-start"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <PhoneIcon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground">
                توثيق نتيجة المكالمة
              </h3>
              <p className="text-xs text-muted-foreground">
                طلب #{orderNumber} {customerName ? `• ${customerName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة توثيق المكالمة"
            className="text-muted-foreground hover:text-foreground text-sm p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Telemetry: Official Duration */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/40">
          <span className="text-xs font-medium text-muted-foreground">
            مدة المكالمة الرسمية (TelephonyManager):
          </span>
          <span className="text-sm font-bold tabular-nums text-foreground">
            {formattedDuration}
          </span>
        </div>

        {/* Action Buttons using standard order workflow */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            اختر نتيجة المكالمة لتحديث حالة الطلب:
          </p>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4" />
              <span>تم التأكيد وتحديد موعد التوصيل</span>
            </div>
            <span className="text-xs opacity-80">تحديث إلى مؤكد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onNoAnswer();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold text-sm hover:bg-amber-500/20 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <PhoneXMarkIcon className="w-4 h-4" />
              <span>العميل لم يرد / مغلق</span>
            </div>
            <span className="text-xs opacity-80">تسجيل محاولة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onPostpone();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-border/60 bg-background text-foreground font-semibold text-sm hover:bg-muted/40 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-muted-foreground" />
              <span>طلب تأجيل الشحن لموعد آخر</span>
            </div>
            <span className="text-xs text-muted-foreground">تأجيل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCancel();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/30 font-semibold text-sm hover:bg-destructive/20 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <XCircleIcon className="w-4 h-4" />
              <span>طلب العميل إلغاء الطلب</span>
            </div>
            <span className="text-xs opacity-80">إلغاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};
