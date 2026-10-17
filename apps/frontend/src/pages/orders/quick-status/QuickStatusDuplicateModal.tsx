import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

interface QuickStatusDuplicateModalProps {
  duplicateModal: { code: string; count: number };
  onClose: () => void;
}

export const QuickStatusDuplicateModal: React.FC<QuickStatusDuplicateModalProps> = ({
  duplicateModal,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      dir="rtl"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="duplicate-modal-title"
    >
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border-2 border-amber-500/80">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-9 h-9 text-amber-600 dark:text-amber-400" />
        </div>
        <h2
          id="duplicate-modal-title"
          className="text-xl sm:text-2xl font-bold text-foreground mb-2"
        >
          {t("quickStatus.duplicateTitle")}
        </h2>
        <p className="text-xl font-mono tabular-nums text-foreground mb-3 font-semibold" dir="ltr">
          {duplicateModal.code}
        </p>
        <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
          {t("quickStatus.duplicateOrder", {
            code: duplicateModal.code,
            count: duplicateModal.count,
          })}
        </p>
        <p className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-3 text-xs mb-5">
          {t("quickStatus.duplicateBlockedNote")}
        </p>
        <button
          onClick={onClose}
          className="w-full px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-semibold transition-colors"
        >
          {t("quickStatus.duplicateAcknowledge")}
        </button>
      </div>
    </div>
  );
};
