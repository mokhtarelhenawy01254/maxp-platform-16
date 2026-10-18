import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { CreditCardIcon, XMarkIcon } from "@heroicons/react/24/outline";

export interface OrderPaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  newPaymentStatus: string;
  setNewPaymentStatus: (val: string) => void;
  paymentNotes: string;
  setPaymentNotes: (val: string) => void;
  paymentStatuses: Array<{ code: string; name: string }>;
  updating: boolean;
  onUpdatePaymentStatus: () => Promise<void>;
}

export const OrderPaymentStatusModal: React.FC<OrderPaymentStatusModalProps> = ({
  isOpen,
  onClose,
  newPaymentStatus,
  setNewPaymentStatus,
  paymentNotes,
  setPaymentNotes,
  paymentStatuses,
  updating,
  onUpdatePaymentStatus,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-200 text-start">
        <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CreditCardIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {t("orderDetails.updatePaymentStatus", { defaultValue: "تحديث حالة الدفع" })}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("orderDetails.updatePaymentStatusDesc", { defaultValue: "تسجيل حالة السداد أو التحويل البنكي/الإلكتروني" })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              {t("orderDetails.selectStatus", { defaultValue: "اختر حالة الدفع" })}
            </label>
            <select
              value={newPaymentStatus}
              onChange={(e) => setNewPaymentStatus(e.target.value)}
              className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
            >
              <option value="">{t("orderDetails.selectStatus", { defaultValue: "-- اختر حالة الدفع --" })}</option>
              {paymentStatuses.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              {t("orderDetails.notesOptional", { defaultValue: "ملاحظات الدفع (اختياري)" })}
            </label>
            <textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border/70 bg-background p-2.5 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
              placeholder={String(t("orderDetails.notesPlaceholder", { defaultValue: "اكتب أي تفاصيل بخصوص الدفعة أو التحويل..." }))}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row-reverse gap-2.5 pt-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 active:scale-95 transition-all"
            onClick={onUpdatePaymentStatus}
            disabled={updating || !newPaymentStatus}
          >
            {updating
              ? t("orderDetails.updating", { defaultValue: "جاري التحديث..." })
              : t("orderDetails.updatePaymentButton", { defaultValue: "حفظ وتحديث الدفع" })}
          </button>
          <button
            type="button"
            className="rounded-xl border border-border/70 bg-background px-4 py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
            onClick={onClose}
          >
            {t("orderDetails.cancel", { defaultValue: "إلغاء" })}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default OrderPaymentStatusModal;
