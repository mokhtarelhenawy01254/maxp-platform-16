/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { OrderActionModalsContainer } from "./OrderActionModalsContainer";
import { OrderShipmentModals } from "./OrderShipmentModals";
import { COMMON_RETURN_REASONS } from "../utils/returnHelper";
import type { OrderDetailsType } from "../types";

export interface OrderDetailsModalsHostProps {
  order: OrderDetailsType;
  canEditOrderDetails: boolean;
  canUpdateOrderStatus: boolean;
  canUpdatePaymentStatus: boolean;
  // Product modal
  showAddProductModal: boolean;
  setShowAddProductModal: (val: boolean) => void;
  handleProductSelect: (product: any, variant?: any) => void;
  // Status operations
  statusOperations: {
    showStatusModal: boolean;
    setShowStatusModal: (val: boolean) => void;
    newStatus: string;
    setNewStatus: (val: string) => void;
    statusNotes: string;
    setStatusNotes: (val: string) => void;
    isOverride: boolean;
    setIsOverride: (val: boolean) => void;
    cancellationAdditionalNotes: string;
    setCancellationAdditionalNotes: (val: string) => void;
    returnReason: string;
    setReturnReason: (val: string) => void;
    returnAdditionalNotes: string;
    setReturnAdditionalNotes: (val: string) => void;
    cancellationReasonOptions: any[];
    cancellationReasonOptionsLoading: boolean;
    isModalCancellationStatus: boolean;
    isModalReturnStatus: boolean;
    updating: boolean;
    onUpdateStatus: (e: React.FormEvent) => void;
  };
  // Payment operations
  paymentOperations: {
    newPaymentStatus: string;
    setNewPaymentStatus: (val: string) => void;
    paymentNotes: string;
    setPaymentNotes: (val: string) => void;
    onUpdatePaymentStatus: (e: React.FormEvent) => void;
  };
  // Fulfillment actions
  fulfillmentActions: {
    showPostponeModal: boolean;
    setShowPostponeModal: (val: boolean) => void;
    handlePostponeOrder: (date: string, reason?: string) => void;
    postponing: boolean;
    showPartialDeliveryModal: boolean;
    setShowPartialDeliveryModal: (val: boolean) => void;
    handlePartialDelivery: (items: any[], notes?: string) => void;
    partialDeliveryLoading: boolean;
  };
  // Shipping actions
  shippingActions: {
    showCancelShipmentModal: boolean;
    setShowCancelShipmentModal: (val: boolean) => void;
    showUnlinkShipmentModal: boolean;
    setShowUnlinkShipmentModal: (val: boolean) => void;
    showRecreateShipmentModal: boolean;
    setShowRecreateShipmentModal: (val: boolean) => void;
    handleRecreateShipment: () => Promise<void> | void;
  };
  // Options & external states
  filteredStatusOptions: any[];
  workflowStatusDefs: any[];
  hasWorkflowRestrictions: boolean;
  paymentStatuses: any[];
  showPaymentModal: boolean;
  setShowPaymentModal: (val: boolean) => void;
  showTicketModal: boolean;
  setShowTicketModal: (val: boolean) => void;
  fetchOrderDetails: () => Promise<void> | void;
  cancelShipment: () => Promise<void> | void;
  unlinkShipment: () => Promise<void> | void;
  turboLoading: boolean;
}

export const OrderDetailsModalsHost: React.FC<OrderDetailsModalsHostProps> = ({
  order,
  canEditOrderDetails,
  canUpdateOrderStatus,
  canUpdatePaymentStatus,
  showAddProductModal,
  setShowAddProductModal,
  handleProductSelect,
  statusOperations,
  paymentOperations,
  fulfillmentActions,
  shippingActions,
  filteredStatusOptions,
  workflowStatusDefs,
  hasWorkflowRestrictions,
  paymentStatuses,
  showPaymentModal,
  setShowPaymentModal,
  showTicketModal,
  setShowTicketModal,
  fetchOrderDetails,
  cancelShipment,
  unlinkShipment,
  turboLoading,
}) => {
  return (
    <>
      <OrderActionModalsContainer
        order={order}
        canEditOrderDetails={canEditOrderDetails}
        canUpdateOrderStatus={canUpdateOrderStatus}
        canUpdatePaymentStatus={canUpdatePaymentStatus}
        showAddProductModal={showAddProductModal}
        setShowAddProductModal={setShowAddProductModal}
        handleProductSelect={handleProductSelect}
        showStatusModal={statusOperations.showStatusModal}
        setShowStatusModal={statusOperations.setShowStatusModal}
        newStatus={statusOperations.newStatus}
        setNewStatus={statusOperations.setNewStatus}
        statusNotes={statusOperations.statusNotes}
        setStatusNotes={statusOperations.setStatusNotes}
        isOverride={statusOperations.isOverride}
        setIsOverride={statusOperations.setIsOverride}
        cancellationAdditionalNotes={statusOperations.cancellationAdditionalNotes}
        setCancellationAdditionalNotes={statusOperations.setCancellationAdditionalNotes}
        returnReason={statusOperations.returnReason}
        setReturnReason={statusOperations.setReturnReason}
        returnAdditionalNotes={statusOperations.returnAdditionalNotes}
        setReturnAdditionalNotes={statusOperations.setReturnAdditionalNotes}
        filteredStatusOptions={filteredStatusOptions}
        workflowStatusDefs={workflowStatusDefs}
        hasWorkflowRestrictions={hasWorkflowRestrictions}
        isModalCancellationStatus={statusOperations.isModalCancellationStatus}
        isModalReturnStatus={statusOperations.isModalReturnStatus}
        cancellationReasonOptions={statusOperations.cancellationReasonOptions}
        cancellationReasonOptionsLoading={statusOperations.cancellationReasonOptionsLoading}
        commonReturnReasons={COMMON_RETURN_REASONS}
        updating={statusOperations.updating}
        onUpdateStatus={statusOperations.onUpdateStatus}
        showPaymentModal={showPaymentModal}
        setShowPaymentModal={setShowPaymentModal}
        newPaymentStatus={paymentOperations.newPaymentStatus}
        setNewPaymentStatus={paymentOperations.setNewPaymentStatus}
        paymentNotes={paymentOperations.paymentNotes}
        setPaymentNotes={paymentOperations.setPaymentNotes}
        paymentStatuses={paymentStatuses}
        onUpdatePaymentStatus={paymentOperations.onUpdatePaymentStatus}
        showPostponeModal={fulfillmentActions.showPostponeModal}
        setShowPostponeModal={fulfillmentActions.setShowPostponeModal}
        handlePostponeOrder={fulfillmentActions.handlePostponeOrder}
        postponing={fulfillmentActions.postponing}
        showPartialDeliveryModal={fulfillmentActions.showPartialDeliveryModal}
        setShowPartialDeliveryModal={fulfillmentActions.setShowPartialDeliveryModal}
        handlePartialDelivery={fulfillmentActions.handlePartialDelivery}
        partialDeliveryLoading={fulfillmentActions.partialDeliveryLoading}
        showTicketModal={showTicketModal}
        setShowTicketModal={setShowTicketModal}
        fetchOrderDetails={fetchOrderDetails}
      />

      <OrderShipmentModals
        showCancelShipmentModal={shippingActions.showCancelShipmentModal}
        setShowCancelShipmentModal={shippingActions.setShowCancelShipmentModal}
        showUnlinkShipmentModal={shippingActions.showUnlinkShipmentModal}
        setShowUnlinkShipmentModal={shippingActions.setShowUnlinkShipmentModal}
        showRecreateShipmentModal={shippingActions.showRecreateShipmentModal}
        setShowRecreateShipmentModal={shippingActions.setShowRecreateShipmentModal}
        cancelShipment={cancelShipment}
        unlinkShipment={unlinkShipment}
        handleRecreateShipment={shippingActions.handleRecreateShipment}
        turboLoading={turboLoading}
      />
    </>
  );
};

export default OrderDetailsModalsHost;
