/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import OrderHeader from "./OrderHeader";
import type { OrderDetailsType } from "../types";

export interface OrderDetailsHeaderWrapperProps {
  order: OrderDetailsType;
  canEditOrderDetails: boolean;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  updating: boolean;
  editForm: any;
  setEditForm: (form: any) => void;
  saveChanges: () => Promise<void> | void;
  handlePrintInvoice: () => void;
  handlePrintPreparationSlip: () => void;
  setShowTicketModal: (show: boolean) => void;
  isMerchant: boolean;
  canUpdateOrderStatus: boolean;
  currentStatusConfig: any;
  filteredStatusOptions: any[];
  handleQuickStatusSelect?: (statusCode: string) => void;
  whatsappChatUrl: string | null;
  canUpdatePaymentStatus: boolean;
  setShowPaymentModal: (show: boolean) => void;
  setShowPostponeModal: (show: boolean) => void;
  setShowPartialDeliveryModal: (show: boolean) => void;
  showLateCancellationButton: boolean;
  updateStatus: (status: string, note?: string, notify?: boolean) => Promise<void> | void;
}

export const OrderDetailsHeaderWrapper: React.FC<OrderDetailsHeaderWrapperProps> = ({
  order,
  canEditOrderDetails,
  isEditing,
  setIsEditing,
  updating,
  editForm,
  setEditForm,
  saveChanges,
  handlePrintInvoice,
  handlePrintPreparationSlip,
  setShowTicketModal,
  isMerchant,
  canUpdateOrderStatus,
  currentStatusConfig,
  filteredStatusOptions,
  handleQuickStatusSelect,
  whatsappChatUrl,
  canUpdatePaymentStatus,
  setShowPaymentModal,
  setShowPostponeModal,
  setShowPartialDeliveryModal,
  showLateCancellationButton,
  updateStatus,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleEdit = useCallback(() => {
    if (canEditOrderDetails) setIsEditing(true);
  }, [canEditOrderDetails, setIsEditing]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    if (order) {
      setEditForm({
        ...editForm,
        items: order.items,
        shipping: order.shipping || 0,
        tax: order.tax || 0,
        discount: order.discount || 0,
        discountReason: order.discountReason || "",
      });
    }
  }, [editForm, order, setEditForm, setIsEditing]);

  const handleCancelRequest = useCallback(() => {
    if (confirm(t("orderDetails.cancelConfirmMessage"))) {
      void updateStatus("PENDING_CANCELLATION", t("orderDetails.cancellationNote"), false);
    }
  }, [t, updateStatus]);

  return (
    <OrderHeader
      order={order}
      isEditing={canEditOrderDetails && isEditing}
      updating={updating}
      onEdit={handleEdit}
      onCancel={handleCancelEdit}
      onSave={saveChanges}
      onPrint={handlePrintInvoice}
      onPrintPreparationSlip={handlePrintPreparationSlip}
      onOpenTicket={() => setShowTicketModal(true)}
      onBack={() => navigate("/orders")}
      canEditOrder={canEditOrderDetails}
      canPrintPreparationSlip={!isMerchant}
      canUpdateStatus={canUpdateOrderStatus}
      currentStatusConfig={currentStatusConfig}
      statusOptions={canUpdateOrderStatus ? filteredStatusOptions : []}
      onStatusSelect={canUpdateOrderStatus ? handleQuickStatusSelect : undefined}
      whatsappChatUrl={whatsappChatUrl}
      canUpdatePaymentStatus={canUpdatePaymentStatus}
      onUpdatePayment={() => setShowPaymentModal(true)}
      canPostponeOrder={canUpdateOrderStatus}
      onPostponeOrder={() => setShowPostponeModal(true)}
      canPartialDelivery={Boolean(canUpdateOrderStatus && order.items && order.items.length > 0)}
      onPartialDelivery={() => setShowPartialDeliveryModal(true)}
      showLateCancellationButton={showLateCancellationButton}
      onCancelRequest={handleCancelRequest}
    />
  );
};

export default OrderDetailsHeaderWrapper;
