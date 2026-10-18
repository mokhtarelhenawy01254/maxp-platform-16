import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import OrderModal from "../../../../components/common/OrderModal";
import type { PreparationOrder } from "../types";

interface ProblemHoldReasonDialogProps {
  isOpen: boolean;
  order: PreparationOrder | null;
  initialReason: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const ProblemHoldReasonDialog = ({
  isOpen,
  order,
  initialReason,
  busy,
  onClose,
  onConfirm,
}: ProblemHoldReasonDialogProps) => {
  const { t } = useTranslation();

  const [reason, setReason] = useState(initialReason);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason(initialReason);
      setShowError(false);
    }
  }, [isOpen, initialReason]);

  const handleConfirm = () => {
    if (!reason.trim()) {
      setShowError(true);
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <OrderModal
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("preparation.holdReasonDialog.title", {
        order: order?.orderNumber || "",
      })}
      description={t("preparation.holdReasonDialog.desc")}
      icon={ExclamationTriangleIcon}
      tone="warning"
      size="md"
      busy={busy}
      primaryAction={{
        label: busy
          ? t("preparation.holdDialog.saving")
          : t("preparation.problemPanel.save"),
        onClick: handleConfirm,
        loading: busy,
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-foreground">
          {t("preparation.holdDialog.reasonLabel")}
        </span>
        <textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (e.target.value.trim()) setShowError(false);
          }}
          rows={3}
          autoFocus
          placeholder={String(t("preparation.holdDialog.reasonPlaceholder"))}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        {showError && !reason.trim() ? (
          <p className="mt-1 text-xs font-medium text-destructive">
            {t("preparation.holdDialog.reasonRequired")}
          </p>
        ) : null}
      </label>
    </OrderModal>
  );
};

export default ProblemHoldReasonDialog;
