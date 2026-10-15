import React from "react";
import {
  CheckCircle2,
  PhoneOff,
  Clock,
  XCircle,
  Phone,
  X,
} from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="توثيق نتيجة المكالمة"
        className="w-full max-w-md p-5 bg-card rounded-xl shadow-2xl border border-border/70 space-y-4 text-start animate-in zoom-in-95 duration-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Phone className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                توثيق نتيجة المكالمة
              </h3>
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
                طلب #{orderNumber} {customerName ? `• ${customerName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة توثيق المكالمة"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Telemetry: Official Duration */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60">
          <span className="text-xs font-medium text-muted-foreground">
            مدة المكالمة الرسمية (Telephony):
          </span>
          <span className="text-xs font-mono font-bold tabular-nums text-foreground">
            {formattedDuration}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            اختر نتيجة المكالمة لتحديث حالة الطلب:
          </p>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-xs active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              <span>تم التأكيد وتحديد موعد التوصيل</span>
            </div>
            <span className="text-[11px] opacity-80">مؤكد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onNoAnswer();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-semibold text-xs hover:bg-amber-500/20 transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <PhoneOff className="size-4" />
              <span>العميل لم يرد / مغلق</span>
            </div>
            <span className="text-[11px] opacity-80">محاولة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onPostpone();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card text-foreground font-semibold text-xs hover:bg-muted/50 transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <span>طلب تأجيل الشحن لموعد آخر</span>
            </div>
            <span className="text-[11px] text-muted-foreground">تأجيل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCancel();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/25 font-semibold text-xs hover:bg-destructive/20 transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <XCircle className="size-4" />
              <span>طلب العميل إلغاء الطلب</span>
            </div>
            <span className="text-[11px] opacity-80">إلغاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickCallDispositionModal;
