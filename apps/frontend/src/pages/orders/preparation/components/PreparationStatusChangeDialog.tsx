import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import OrderModal from "../../../../components/common/OrderModal";
import type { PreparationOrder } from "../types";

interface PreparationStatusChangeDialogProps {
  isOpen: boolean;
  order: PreparationOrder | null;
  targetStatus: string;
  targetStatusLabel: string;
  isHold: boolean;
  initialHoldReason?: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    note: string;
    holdReason?: string;
  }) => void;
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

export const PreparationStatusChangeDialog = ({
  isOpen,
  order,
  targetStatusLabel,
  isHold,
  initialHoldReason,
  busy,
  onClose,
  onConfirm,
}: PreparationStatusChangeDialogProps) => {
  const { t } = useTranslation();

  const [note, setNote] = useState("");
  const [holdReason, setHoldReason] = useState(initialHoldReason || "");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNote("");
      setHoldReason(initialHoldReason || "");
      setShowError(false);
    }
  }, [isOpen, initialHoldReason]);

  const handleConfirm = () => {
    if (isHold && !holdReason.trim()) {
      setShowError(true);
      return;
    }
    onConfirm({
      note: note.trim(),
      holdReason: isHold ? holdReason.trim() : undefined,
    });
  };

  const title = isHold
    ? t("preparation.holdDialog.holdTitle", {
        order: order?.orderNumber || "",
      })
    : t("preparation.holdDialog.advanceTitle", {
        order: order?.orderNumber || "",
        status: targetStatusLabel,
      });

  const description = isHold
    ? t("preparation.holdDialog.holdDesc")
    : t("preparation.holdDialog.advanceDesc");

  return (
    <OrderModal
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      description={description}
      icon={isHold ? ExclamationTriangleIcon : CheckCircleIcon}
      tone={isHold ? "danger" : "primary"}
      size="md"
      busy={busy}
      primaryAction={{
        label: busy
          ? t("preparation.holdDialog.saving")
          : t("preparation.holdDialog.confirm"),
        onClick: handleConfirm,
        variant: isHold ? "destructive" : "default",
        loading: busy,
      }}
    >
      <div className="space-y-3">
        {isHold ? (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-foreground">
              {t("preparation.holdDialog.reasonLabel")}
            </span>
            <textarea
              value={holdReason}
              onChange={(e) => {
                setHoldReason(e.target.value);
                if (e.target.value.trim()) setShowError(false);
              }}
              rows={3}
              placeholder={String(t("preparation.holdDialog.reasonPlaceholder"))}
              className={inputClass}
            />
            {showError && !holdReason.trim() ? (
              <p className="mt-1 text-xs font-medium text-destructive">
                {t("preparation.holdDialog.reasonRequired")}
              </p>
            ) : null}
          </label>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-foreground">
              {t("preparation.holdDialog.commentLabel")}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={String(t("preparation.holdDialog.commentPlaceholder"))}
              className={inputClass}
            />
          </label>
        )}
      </div>
    </OrderModal>
  );
};

export default PreparationStatusChangeDialog;
