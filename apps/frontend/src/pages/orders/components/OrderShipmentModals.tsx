import React from "react";
import { useTranslation } from "react-i18next";
import ConfirmationModal from "./ConfirmationModal";

export interface OrderShipmentModalsProps {
  showCancelShipmentModal: boolean;
  setShowCancelShipmentModal: (val: boolean) => void;
  showUnlinkShipmentModal: boolean;
  setShowUnlinkShipmentModal: (val: boolean) => void;
  showRecreateShipmentModal: boolean;
  setShowRecreateShipmentModal: (val: boolean) => void;
  cancelShipment: () => Promise<boolean>;
  unlinkShipment: () => Promise<boolean>;
  handleRecreateShipment: () => Promise<void>;
  turboLoading: boolean;
}

export const OrderShipmentModals: React.FC<OrderShipmentModalsProps> = ({
  showCancelShipmentModal,
  setShowCancelShipmentModal,
  showUnlinkShipmentModal,
  setShowUnlinkShipmentModal,
  showRecreateShipmentModal,
  setShowRecreateShipmentModal,
  cancelShipment,
  unlinkShipment,
  handleRecreateShipment,
  turboLoading,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Confirmation Modal for Cancellation */}
      <ConfirmationModal
        isOpen={showCancelShipmentModal}
        onClose={() => setShowCancelShipmentModal(false)}
        onConfirm={async () => {
          const success = await cancelShipment();
          if (success) setShowCancelShipmentModal(false);
        }}
        title={t("orderDetails.cancelShipment", { defaultValue: "إلغاء الشحنة" })}
        message={t("orderDetails.cancelShipmentConfirm", { defaultValue: "هل أنت متأكد من إلغاء هذه الشحنة لدى شركة الشحن؟" })}
        confirmText={t("orderDetails.yesCancelShipment", { defaultValue: "نعم، إلغاء الشحنة" })}
        cancelText={t("orderDetails.goBack", { defaultValue: "رجوع" })}
        isDangerous={true}
        isLoading={turboLoading}
      />

      {/* Confirmation Modal for Turbo Unlink */}
      <ConfirmationModal
        isOpen={showUnlinkShipmentModal}
        onClose={() => setShowUnlinkShipmentModal(false)}
        onConfirm={async () => {
          const success = await unlinkShipment();
          if (success) setShowUnlinkShipmentModal(false);
        }}
        title={t("orderDetails.unlinkTurboShipment", { defaultValue: "إلغاء ربط شحنة تيربو" })}
        message={t("orderDetails.unlinkTurboShipmentConfirm", { defaultValue: "هل أنت متأكد من فك ارتباط هذه الشحنة بهذا الطلب؟" })}
        confirmText={t("orderDetails.yesUnlinkTurboShipment", { defaultValue: "نعم، فك الارتباط" })}
        cancelText={t("orderDetails.goBack", { defaultValue: "رجوع" })}
        isDangerous={false}
        isLoading={turboLoading}
      />

      {/* Confirmation Modal for Turbo Recreate */}
      <ConfirmationModal
        isOpen={showRecreateShipmentModal}
        onClose={() => setShowRecreateShipmentModal(false)}
        onConfirm={handleRecreateShipment}
        title={t("orderDetails.recreateShipmentTitle", { defaultValue: "إعادة إنشاء الشحنة" })}
        message={t("orderDetails.recreateShipmentMessage", { defaultValue: "سيتم إنشاء شحنة جديدة وتحديث بيانات التتبع." })}
        confirmText={t("orderDetails.recreateShipmentConfirm", { defaultValue: "تأكيد وإعادة الإنشاء" })}
        cancelText={t("orderDetails.goBack", { defaultValue: "رجوع" })}
        isDangerous={false}
        isLoading={turboLoading}
      />
    </>
  );
};

export default OrderShipmentModals;
