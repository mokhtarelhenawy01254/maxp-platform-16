import React from "react";
import { useTranslation } from "react-i18next";
import { Trash2, RotateCw } from "lucide-react";

interface OrderActivityLogDeleteModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}

export const OrderActivityLogDeleteModal: React.FC<OrderActivityLogDeleteModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  deleting,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onCancel}
        />
        <div className="relative bg-card rounded-2xl p-6 shadow-xl border border-border/70 max-w-sm w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 text-destructive mb-4 border border-destructive/20">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1.5">
              {t("orderDetails.deleteNoteConfirmTitle") || "حذف الملاحظة"}
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              {t("orderDetails.deleteNoteConfirmMessage") || "هل أنت متأكد من رغبتك في حذف هذه الملاحظة نهائياً؟"}
            </p>
            <div className="flex gap-2.5 justify-center">
              <button
                type="button"
                onClick={onConfirm}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-destructive-foreground bg-destructive hover:bg-destructive/90 focus:outline-hidden disabled:opacity-50 transition-colors shadow-xs"
              >
                {deleting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                {deleting
                  ? t("orderDetails.deleting") || "جاري الحذف..."
                  : t("orderDetails.yesDelete") || "تأكيد الحذف"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-xl text-foreground bg-card border border-border/70 hover:bg-muted focus:outline-hidden transition-colors"
              >
                {t("orderDetails.cancel") || "إلغاء"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
