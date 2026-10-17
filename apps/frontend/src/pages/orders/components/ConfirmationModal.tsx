import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
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
      icon={AlertTriangle}
      tone={isDangerous ? "danger" : "info"}
      size="md"
      busy={isLoading}
      cancelLabel={cancelText ?? t("orders.cancel", { defaultValue: "إلغاء" })}
      primaryAction={{
        label: isLoading
          ? t("orders.processing2", { defaultValue: "جاري التنفيذ..." })
          : (confirmText ?? t("orders.confirm", { defaultValue: "تأكيد" })),
        onClick: onConfirm,
        variant: isDangerous ? "destructive" : "default",
        loading: isLoading,
      }}
    />
  );
};

export default ConfirmationModal;
