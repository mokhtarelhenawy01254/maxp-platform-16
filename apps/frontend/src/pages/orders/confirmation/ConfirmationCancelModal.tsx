import React from "react";
import { useTranslation } from "react-i18next";
import type { ConfirmationOrder } from "./types";

export interface ConfirmationCancelModalProps {
  cancelTarget: ConfirmationOrder | null;
  cancelReason: string;
  cancellingId: string | null;
  onClose: () => void;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
}

export const ConfirmationCancelModal: React.FC<ConfirmationCancelModalProps> = ({
  cancelTarget,
  cancelReason,
  cancellingId,
  onClose,
  onReasonChange,
  onSubmit,
}) => {
  const { t } = useTranslation();

  if (!cancelTarget) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-3 text-sm sm:text-base font-bold text-foreground">
          {t("orders.cancelReasonPrompt", { defaultValue: "اكتب سبب إلغاء هذا الطلب:" })}
        </h2>
        <textarea
          value={cancelReason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder={String(t("orders.cancelReasonPlaceholder", { defaultValue: "اكتب سبب الإلغاء..." }))}
          rows={3}
          className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20 transition-all"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/70 bg-background px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            {t("orders.cancelClose", { defaultValue: "إغلاق" })}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!cancelReason.trim() || cancellingId === cancelTarget.id}
            className="rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs active:scale-95 transition-all"
          >
            {cancellingId === cancelTarget.id
              ? t("orders.cancellingOrder", { defaultValue: "جاري الإلغاء..." })
              : t("orders.cancelConfirm", { defaultValue: "تأكيد الإلغاء" })}
          </button>
        </div>
      </div>
    </div>
  );
};
