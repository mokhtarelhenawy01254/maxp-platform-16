import React from "react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import IncompleteCancelModal from "../components/IncompleteCancelModal";
import IncompleteOrdersContactModal from "./IncompleteOrdersContactModal";
import type { IncompleteOrder } from "../incompleteUtils";
import { getCustomerName, getCustomerContact } from "../incompleteUtils";

export interface IncompleteOrdersModalsProps {
  confirmConvertCartId: string | null;
  onConfirmConvert: () => void;
  onCancelConvert: () => void;
  contactCartId: string | null;
  contactMethod: string;
  contactResult: string;
  contactNote: string;
  savingContact: boolean;
  onCloseContact: () => void;
  onMethodChange: (method: string) => void;
  onResultChange: (result: string) => void;
  onNoteChange: (note: string) => void;
  onSaveContact: () => void;
  cancelModalOpen: boolean;
  selectedCancelOrder: IncompleteOrder | null;
  onCloseCancelModal: () => void;
  onCancelSuccess: () => void;
}

export const IncompleteOrdersModals: React.FC<IncompleteOrdersModalsProps> = ({
  confirmConvertCartId,
  onConfirmConvert,
  onCancelConvert,
  contactCartId,
  contactMethod,
  contactResult,
  contactNote,
  savingContact,
  onCloseContact,
  onMethodChange,
  onResultChange,
  onNoteChange,
  onSaveContact,
  cancelModalOpen,
  selectedCancelOrder,
  onCloseCancelModal,
  onCancelSuccess,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <ConfirmDialog
        open={Boolean(confirmConvertCartId)}
        title={t("orders.incompleteConfirmTitle")}
        content={t("orders.incompleteConfirmContent")}
        confirmLabel={t("orders.incompleteQuickConvert")}
        cancelLabel={t("orders.incompleteCancel")}
        confirmColor="success"
        onConfirm={onConfirmConvert}
        onCancel={onCancelConvert}
      />

      <IncompleteOrdersContactModal
        open={Boolean(contactCartId)}
        onClose={onCloseContact}
        contactMethod={contactMethod}
        onMethodChange={onMethodChange}
        contactResult={contactResult}
        onResultChange={onResultChange}
        contactNote={contactNote}
        onNoteChange={onNoteChange}
        savingContact={savingContact}
        onSave={onSaveContact}
      />

      <IncompleteCancelModal
        open={cancelModalOpen}
        cartId={selectedCancelOrder?.cartId || null}
        customerName={
          selectedCancelOrder
            ? getCustomerName(selectedCancelOrder.checkoutData)
            : null
        }
        customerPhone={
          selectedCancelOrder
            ? getCustomerContact(selectedCancelOrder.checkoutData)?.phone
            : null
        }
        cartTotal={selectedCancelOrder?.total}
        onClose={onCloseCancelModal}
        onSuccess={onCancelSuccess}
      />
    </>
  );
};

export default IncompleteOrdersModals;
