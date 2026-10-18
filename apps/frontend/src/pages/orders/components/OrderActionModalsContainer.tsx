/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import SimplifiedProductSelectionModal from "./SimplifiedProductSelectionModal";
import OrderStatusUpdateModal from "./OrderStatusUpdateModal";
import OrderPaymentStatusModal from "./OrderPaymentStatusModal";
import PostponeOrderModal from "./PostponeOrderModal";
import PartialDeliveryModal from "./PartialDeliveryModal";
import { CreateTicketModal } from "../shipments/CreateTicketModal";
import type { OrderDetailsType } from "../types";

export interface OrderActionModalsContainerProps {
  order: OrderDetailsType;
  canEditOrderDetails: boolean;
  canUpdateOrderStatus: boolean;
  canUpdatePaymentStatus: boolean;
  // Product Selection Modal
  showAddProductModal: boolean;
  setShowAddProductModal: (val: boolean) => void;
  handleProductSelect: (product: any) => void;
  // Status Modal
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
  filteredStatusOptions: any[];
  workflowStatusDefs: any[];
  hasWorkflowRestrictions: boolean;
  isModalCancellationStatus: boolean;
  isModalReturnStatus: boolean;
  cancellationReasonOptions: any[];
  cancellationReasonOptionsLoading: boolean;
  commonReturnReasons: any[];
  updating: boolean;
  onUpdateStatus: (e: React.FormEvent) => void;
  // Payment Modal
  showPaymentModal: boolean;
  setShowPaymentModal: (val: boolean) => void;
  newPaymentStatus: string;
  setNewPaymentStatus: (val: string) => void;
  paymentNotes: string;
  setPaymentNotes: (val: string) => void;
  paymentStatuses: any[];
  onUpdatePaymentStatus: (e: React.FormEvent) => void;
  // Postpone Modal
  showPostponeModal: boolean;
  setShowPostponeModal: (val: boolean) => void;
  handlePostponeOrder: (date: string, notes: string, autoTransition: boolean) => Promise<void>;
  postponing: boolean;
  // Partial Delivery Modal
  showPartialDeliveryModal: boolean;
  setShowPartialDeliveryModal: (val: boolean) => void;
  handlePartialDelivery: (items: any[], notes: string) => Promise<void>;
  partialDeliveryLoading: boolean;
  // Ticket Modal
  showTicketModal: boolean;
  setShowTicketModal: (val: boolean) => void;
  fetchOrderDetails: () => void;
}

export const OrderActionModalsContainer: React.FC<OrderActionModalsContainerProps> = ({
  order,
  canEditOrderDetails,
  canUpdateOrderStatus,
  canUpdatePaymentStatus,
  showAddProductModal,
  setShowAddProductModal,
  handleProductSelect,
  showStatusModal,
  setShowStatusModal,
  newStatus,
  setNewStatus,
  statusNotes,
  setStatusNotes,
  isOverride,
  setIsOverride,
  cancellationAdditionalNotes,
  setCancellationAdditionalNotes,
  returnReason,
  setReturnReason,
  returnAdditionalNotes,
  setReturnAdditionalNotes,
  filteredStatusOptions,
  workflowStatusDefs,
  hasWorkflowRestrictions,
  isModalCancellationStatus,
  isModalReturnStatus,
  cancellationReasonOptions,
  cancellationReasonOptionsLoading,
  commonReturnReasons,
  updating,
  onUpdateStatus,
  showPaymentModal,
  setShowPaymentModal,
  newPaymentStatus,
  setNewPaymentStatus,
  paymentNotes,
  setPaymentNotes,
  paymentStatuses,
  onUpdatePaymentStatus,
  showPostponeModal,
  setShowPostponeModal,
  handlePostponeOrder,
  postponing,
  showPartialDeliveryModal,
  setShowPartialDeliveryModal,
  handlePartialDelivery,
  partialDeliveryLoading,
  showTicketModal,
  setShowTicketModal,
  fetchOrderDetails,
}) => {
  return (
    <>
      {/* Product Selection Modal */}
      <SimplifiedProductSelectionModal
        isOpen={canEditOrderDetails && showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductSelected={handleProductSelect}
      />

      {/* Status Modal */}
      <OrderStatusUpdateModal
        isOpen={showStatusModal && canUpdateOrderStatus}
        onClose={() => setShowStatusModal(false)}
        newStatus={newStatus}
        setNewStatus={setNewStatus}
        statusNotes={statusNotes}
        setStatusNotes={setStatusNotes}
        isOverride={isOverride}
        setIsOverride={setIsOverride}
        cancellationAdditionalNotes={cancellationAdditionalNotes}
        setCancellationAdditionalNotes={setCancellationAdditionalNotes}
        returnReason={returnReason}
        setReturnReason={setReturnReason}
        returnAdditionalNotes={returnAdditionalNotes}
        setReturnAdditionalNotes={setReturnAdditionalNotes}
        filteredStatusOptions={filteredStatusOptions}
        workflowStatusDefs={workflowStatusDefs}
        hasWorkflowRestrictions={hasWorkflowRestrictions}
        isModalCancellationStatus={isModalCancellationStatus}
        isModalReturnStatus={isModalReturnStatus}
        cancellationReasonOptions={cancellationReasonOptions}
        cancellationReasonOptionsLoading={cancellationReasonOptionsLoading}
        commonReturnReasons={commonReturnReasons}
        updating={updating}
        onUpdateStatus={onUpdateStatus}
      />

      {/* Payment Modal */}
      <OrderPaymentStatusModal
        isOpen={showPaymentModal && canUpdatePaymentStatus}
        onClose={() => setShowPaymentModal(false)}
        newPaymentStatus={newPaymentStatus}
        setNewPaymentStatus={setNewPaymentStatus}
        paymentNotes={paymentNotes}
        setPaymentNotes={setPaymentNotes}
        paymentStatuses={paymentStatuses}
        updating={updating}
        onUpdatePaymentStatus={onUpdatePaymentStatus}
      />

      {/* Postpone Order Modal */}
      <PostponeOrderModal
        isOpen={showPostponeModal}
        onClose={() => setShowPostponeModal(false)}
        onConfirm={handlePostponeOrder}
        loading={postponing}
        initialDate={
          order?.scheduledDeliveryDate
            ? new Date(order.scheduledDeliveryDate).toISOString().split("T")[0]
            : ""
        }
        initialNotes={order?.scheduledNotes || ""}
        initialAutoTransition={order?.autoTransitionEnabled !== false}
      />

      {/* Partial Delivery Modal */}
      <PartialDeliveryModal
        isOpen={showPartialDeliveryModal}
        onClose={() => setShowPartialDeliveryModal(false)}
        onConfirm={handlePartialDelivery}
        order={order}
        loading={partialDeliveryLoading}
      />

      {/* Support Ticket Modal */}
      {showTicketModal && (
        <CreateTicketModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          shipmentCode={
            order.turboTrackingNumber ||
            order.trackingNumber ||
            order.shipment?.trackingNumber ||
            (order.shipments && order.shipments[0]?.trackingNumber) ||
            ""
          }
          orderNumber={order.orderNumber}
          customerName={order.customerName || order.customer?.name}
          onSuccess={() => {
            fetchOrderDetails();
          }}
        />
      )}
    </>
  );
};

export default OrderActionModalsContainer;
