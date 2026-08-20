import React from "react";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import OrderModal from "../../../components/common/OrderModal";

interface DeleteItemConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemDetails?: string;
}

const DeleteItemConfirmModal: React.FC<DeleteItemConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemDetails,
}) => {
  const { t } = useTranslation();

  return (
    <OrderModal
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("orders.deleteItemConfirmTitle")}
      description={t("orders.deleteItemConfirmDescription")}
      icon={ExclamationTriangleIcon}
      tone="danger"
      size="sm"
      cancelLabel={t("orders.cancel", { defaultValue: "╪Ñ┘ä╪║╪º╪í" })}
      primaryAction={{
        label: t("orders.deleteItemConfirmAction"),
        onClick: () => {
          onConfirm();
          onClose();
        },
        variant: "destructive",
        autoFocus: true,
      }}
    >
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{itemName}</p>
        {itemDetails && (
          <p className="mt-1 text-xs text-muted-foreground">{itemDetails}</p>
        )}
        <p className="mt-3 text-xs font-medium text-destructive">
          {t("orders.deleteItemConfirmWarning")}
        </p>
      </div>
    </OrderModal>
  );
};

export default DeleteItemConfirmModal;
