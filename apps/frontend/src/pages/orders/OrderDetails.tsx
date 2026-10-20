import React from "react";
import { OrderDetailsHeaderWrapper } from "./components/OrderDetailsHeaderWrapper";
import OrderDetailsMainContent from "./components/OrderDetailsMainContent";
import OrderDetailsSidebar from "./components/OrderDetailsSidebar";
import OrderReturnCard from "./components/OrderReturnCard";
import { OrderDetailsModalsHost } from "./components/OrderDetailsModalsHost";
import { OrderDetailsNotFound } from "./components/OrderDetailsNotFound";
import { useOrderDetailsController } from "./hooks/useOrderDetailsController";
import {
  isCancellationStatus,
  getLatestCancellationReason,
} from "./hooks/useOrderStatusOperations";

export { isCancellationStatus, getLatestCancellationReason };

export const OrderDetails: React.FC = () => {
  const {
    order,
    setOrder,
    loading,
    updating,
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    saveChanges,
    handlePrintInvoice,
    handlePrintPreparationSlip,
    whatsappChatUrl,
    showTicketModal,
    setShowTicketModal,
    isMerchant,
    merchantOrderScope,
    canEditOrderDetails,
    canUpdateOrderStatus,
    canManageTurboShipping,
    showPartnerOperationsCard,
    showOrderSourceCard,
    showOrderAttributionCard,
    showConfirmationDistributionCard,
    showLateCancellationButton,
    currentStatusConfig,
    filteredStatusOptions,
    handleQuickStatusSelect,
    canUpdatePaymentStatus,
    showPaymentModal,
    setShowPaymentModal,
    updateStatus,
    returnDetails,
    statusOperations,
    calculatedTotals,
    handleDiscountApproval,
    handleItemChange,
    handleRemoveItem,
    showAddProductModal,
    setShowAddProductModal,
    handleProductSelect,
    governments,
    areas,
    loadingGovernments,
    loadingAreas,
    selectedGovernmentId,
    setSelectedGovernmentId,
    handleGovernmentChange,
    invoiceSettings,
    fetchOrderDetails,
    verifyWalletProof,
    effectiveStatus,
    latestCancellationReason,
    formatOptionalDate,
    orderNotes,
    addNote,
    updateNote,
    deleteNote,
    updatingNote,
    deletingNote,
    user,
    statusNameMap,
    paymentOperations,
    fulfillmentActions,
    shippingActions,
    workflowStatusDefs,
    hasWorkflowRestrictions,
    paymentStatuses,
    cancelShipment,
    unlinkShipment,
    turboLoading,
  } = useOrderDetailsController();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return <OrderDetailsNotFound />;
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6">
      {/* Header */}
      <OrderDetailsHeaderWrapper
        order={order}
        canEditOrderDetails={canEditOrderDetails}
        isEditing={canEditOrderDetails && isEditing}
        setIsEditing={setIsEditing}
        updating={updating}
        editForm={editForm}
        setEditForm={setEditForm}
        saveChanges={saveChanges}
        handlePrintInvoice={handlePrintInvoice}
        handlePrintPreparationSlip={handlePrintPreparationSlip}
        setShowTicketModal={setShowTicketModal}
        isMerchant={isMerchant}
        canUpdateOrderStatus={canUpdateOrderStatus}
        currentStatusConfig={currentStatusConfig}
        filteredStatusOptions={filteredStatusOptions}
        handleQuickStatusSelect={handleQuickStatusSelect}
        whatsappChatUrl={whatsappChatUrl}
        canUpdatePaymentStatus={canUpdatePaymentStatus}
        setShowPaymentModal={setShowPaymentModal}
        setShowPostponeModal={fulfillmentActions.setShowPostponeModal}
        setShowPartialDeliveryModal={fulfillmentActions.setShowPartialDeliveryModal}
        showLateCancellationButton={showLateCancellationButton}
        updateStatus={updateStatus}
      />

      {/* Return Alert Banner & Details Card */}
      {returnDetails && returnDetails.isReturned && (
        <div className="mt-6">
          <OrderReturnCard
            returnDetails={returnDetails}
            onEditReason={
              canUpdateOrderStatus
                ? () => {
                    statusOperations.setNewStatus(order.status || "RETURNED");
                    statusOperations.setStatusNotes(returnDetails.reason || "");
                    statusOperations.setReturnReason(returnDetails.reason || "");
                    statusOperations.setShowStatusModal(true);
                  }
                : undefined
            }
            canEdit={canUpdateOrderStatus}
          />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-flow-col-dense lg:grid-cols-3">
        {/* RIGHT COLUMN (Main Info) */}
        <OrderDetailsMainContent
          order={order}
          canEditOrderDetails={canEditOrderDetails}
          isEditing={isEditing}
          editForm={editForm}
          setEditForm={setEditForm}
          calculatedTotals={calculatedTotals}
          updating={updating}
          handleDiscountApproval={handleDiscountApproval}
          handleItemChange={handleItemChange}
          handleRemoveItem={handleRemoveItem}
          setShowAddProductModal={setShowAddProductModal}
          showPartnerOperationsCard={showPartnerOperationsCard}
          merchantOrderScope={merchantOrderScope}
          fetchOrderDetails={fetchOrderDetails}
          canManageTurboShipping={canManageTurboShipping}
          setShowTicketModal={setShowTicketModal}
        />

        {/* LEFT COLUMN (Sidebar) */}
        <OrderDetailsSidebar
          order={order}
          canEditOrderDetails={canEditOrderDetails}
          isEditing={isEditing}
          editForm={editForm}
          setEditForm={setEditForm}
          governments={governments}
          areas={areas}
          loadingGovernments={loadingGovernments}
          loadingAreas={loadingAreas}
          selectedGovernmentId={selectedGovernmentId}
          setSelectedGovernmentId={setSelectedGovernmentId}
          handleGovernmentChange={handleGovernmentChange}
          invoiceSettings={invoiceSettings}
          fetchOrderDetails={fetchOrderDetails}
          setOrder={setOrder}
          canUpdatePaymentStatus={canUpdatePaymentStatus}
          setShowPaymentModal={setShowPaymentModal}
          showOrderSourceCard={showOrderSourceCard}
          showOrderAttributionCard={showOrderAttributionCard}
          verifyWalletProof={verifyWalletProof}
          effectiveStatus={effectiveStatus}
          latestCancellationReason={latestCancellationReason}
          returnDetails={returnDetails}
          showConfirmationDistributionCard={showConfirmationDistributionCard}
          formatOptionalDate={formatOptionalDate}
          orderNotes={orderNotes}
          addNote={addNote}
          updateNote={updateNote}
          deleteNote={deleteNote}
          updatingNote={updatingNote}
          deletingNote={deletingNote}
          isMerchant={isMerchant}
          currentUserId={user?.id}
          statusNameMap={statusNameMap}
          isCancellationStatus={isCancellationStatus}
        />
      </div>

      {/* Action & Shipment Modals */}
      <OrderDetailsModalsHost
        order={order}
        canEditOrderDetails={canEditOrderDetails}
        canUpdateOrderStatus={canUpdateOrderStatus}
        canUpdatePaymentStatus={canUpdatePaymentStatus}
        showAddProductModal={showAddProductModal}
        setShowAddProductModal={setShowAddProductModal}
        handleProductSelect={handleProductSelect}
        statusOperations={statusOperations}
        paymentOperations={paymentOperations}
        fulfillmentActions={fulfillmentActions}
        shippingActions={shippingActions}
        filteredStatusOptions={filteredStatusOptions}
        workflowStatusDefs={workflowStatusDefs}
        hasWorkflowRestrictions={hasWorkflowRestrictions}
        paymentStatuses={paymentStatuses}
        showPaymentModal={showPaymentModal}
        setShowPaymentModal={setShowPaymentModal}
        showTicketModal={showTicketModal}
        setShowTicketModal={setShowTicketModal}
        fetchOrderDetails={fetchOrderDetails}
        cancelShipment={cancelShipment}
        unlinkShipment={unlinkShipment}
        turboLoading={turboLoading}
      />
    </div>
  );
};

export default OrderDetails;
