import React from "react";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import OrderModal from "../../../components/common/OrderModal";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDangerous = false,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  return (
    <OrderModal
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      description={message}
      icon={ExclamationTriangleIcon}
      tone={isDangerous ? "danger" : "info"}
      size="md"
      busy={isLoading}
      cancelLabel={cancelText ?? t("orders.cancel", { defaultValue: "╪Ñ┘ä╪║╪º╪í" })}
      primaryAction={{
        label: isLoading
          ? t("orders.processing2", { defaultValue: "╪¼╪º╪▒┘è ╪º┘ä╪¬┘å┘ü┘è╪░..." })
          : (confirmText ?? t("orders.confirm", { defaultValue: "╪¬╪ú┘â┘è╪»" })),
        onClick: onConfirm,
        variant: isDangerous ? "destructive" : "default",
        loading: isLoading,
      }}
    />
  );
};

export default ConfirmationModal;
