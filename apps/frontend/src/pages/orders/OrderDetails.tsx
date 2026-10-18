import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
// Components
import OrderHeader from "./components/OrderHeader";
import OrderDetailsMainContent from "./components/OrderDetailsMainContent";
import OrderDetailsSidebar from "./components/OrderDetailsSidebar";
import OrderReturnCard from "./components/OrderReturnCard";
// Cards migrated into OrderDetailsSidebar
import { OrderDetailsModalsHost } from "./components/OrderDetailsModalsHost";

// Hooks & Utils
import { useOrderDetails } from "./hooks/useOrderDetails";
import { useOrderEditCalculation } from "./hooks/useOrderEditCalculation";
import { useOrderEditItemsOperations } from "./hooks/useOrderEditItemsOperations";
import { useOrderPaymentStatusOperations } from "./hooks/useOrderPaymentStatusOperations";
import { useOrderFulfillmentActions } from "./hooks/useOrderFulfillmentActions";
import { useOrderDetailsShipping } from "./hooks/useOrderDetailsShipping";
import {
  isCancellationStatus,
  useOrderStatusOperations,
} from "./hooks/useOrderStatusOperations";
import { OrderDetailsType } from "./types";
import { getOrderReturnDetails } from "./utils/returnHelper";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";
import { useOrderHeaderActions } from "./hooks/useOrderHeaderActions";
import { useOrderPermissionsAndApps } from "./hooks/useOrderPermissionsAndApps";
import { useOrderStatusOptions } from "./hooks/useOrderStatusOptions";

export { isCancellationStatus };

const getLatestCancellationReason = (
  order?: OrderDetailsType | null,
): string => {
  if (!order) return "";

  const historyReason =
    order.statusHistory
      ?.find(
        (entry) =>
          isCancellationStatus(entry.status) &&
          typeof entry.reason === "string" &&
          entry.reason.trim(),
      )
      ?.reason?.trim() || "";

  if (historyReason) return historyReason;

  if (isCancellationStatus((order as any).effectiveStatus || order.status) && typeof order.notes === "string") {
    return order.notes.trim();
  }

  return "";
};

const OrderDetails: React.FC = () => {
  const { id: orderNumber } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { company } = useCompany();

  // Custom Hooks
  const {
    order,
    setOrder,
    loading,
    updating,
    allowedTransitions,
    workflowStatusDefs,
    orderStatuses,
    paymentStatuses,
    governments,
    areas,
    loadingGovernments,
    loadingAreas,
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    selectedGovernmentId,
    setSelectedGovernmentId,
    orderNotes,
    handleGovernmentChange,
    updateStatus,
    updatePaymentStatus,
    verifyWalletProof,
    handleDiscountApproval,
    addNote,
    updateNote,
    deleteNote,
    updatingNote,
    deletingNote,
    saveChanges,
    fetchOrderDetails,
  } = useOrderDetails(orderNumber);

  const { settings: invoiceSettings } = useInvoiceSettings();
  const { turboLoading, cancelShipment, unlinkShipment, shippingActions } =
    useOrderDetailsShipping(order, setOrder);

  // Auto-enter edit mode when opened with ?edit=1 (e.g. from WhatsApp chat order code)
  const [searchParams] = useSearchParams();
  const openInEditMode = searchParams.get("edit") === "1";
  const didAutoEnterEditRef = useRef(false);

  useEffect(() => {
    if (openInEditMode && order && !isEditing && !didAutoEnterEditRef.current) {
      didAutoEnterEditRef.current = true;
      setIsEditing(true);
    }
  }, [openInEditMode, order, isEditing, setIsEditing]);

  // Local UI State (Modals)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const isGuestOrder = Boolean(order?.metadata?.isGuestOrder);
  const latestCancellationReason = useMemo(
    () => getLatestCancellationReason(order),
    [order],
  );
  const returnDetails = useMemo(
    () => getOrderReturnDetails(order),
    [order],
  );
  const {
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
  } = useOrderPermissionsAndApps({
    order,
    user,
    company,
  });

  const statusOperations = useOrderStatusOperations({
    order,
    canUpdateOrderStatus,
    updateStatus,
  });
  const { handleQuickStatusSelect, setNewStatus } = statusOperations;

  const paymentOperations = useOrderPaymentStatusOperations({
    isMerchant,
    isGuestOrder,
    updatePaymentStatus,
    setShowPaymentModal,
  });
  const { canUpdatePaymentStatus } = paymentOperations;

  // Auth Check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/auth/login";
    }
  }, [authLoading, isAuthenticated]);

  const { hasUnsavedChanges, calculatedTotals } = useOrderEditCalculation({
    order,
    editForm,
    isEditing,
    canEditOrderDetails,
    t,
  });

  // Header & Print Actions Hook
  const {
    handlePrintInvoice,
    handlePrintPreparationSlip,
    whatsappChatUrl,
  } = useOrderHeaderActions({
    order,
    user,
    invoiceSettings,
    t,
  });



  const fulfillmentActions = useOrderFulfillmentActions({
    order,
    fetchOrderDetails,
    updateStatus,
    t,
  });



  const {
    handleProductSelect,
    handleItemChange,
    handleRemoveItem,
  } = useOrderEditItemsOperations({
    editForm,
    setEditForm,
    setShowAddProductModal,
    t,
  });



  const {
    effectiveStatus,
    currentStatusConfig,
    hasWorkflowRestrictions,
    filteredStatusOptions,
    statusNameMap,
  } = useOrderStatusOptions({
    order,
    orderStatuses,
    allowedTransitions,
    workflowStatusDefs,
    isOverride: statusOperations.isOverride,
  });



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("orderDetails.orderNotFound")}
          </h2>
          <Link
            to="/orders"
            className="text-blue-600 hover:text-blue-500 mt-4 inline-block"
          >
            {t("orderDetails.backToOrders")}
          </Link>
        </div>
      </div>
    );
  }



  const formatOptionalDate = (value?: string | null) =>
    value ? formatDate(value) : "—";



  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6">
      {/* Header */}
      <OrderHeader
        order={order}
        isEditing={canEditOrderDetails && isEditing}
        updating={updating}
        onEdit={() => {
          if (canEditOrderDetails) setIsEditing(true);
        }}
        onCancel={() => {
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
        }}
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
        onCancelRequest={() => {
          if (confirm(t("orderDetails.cancelConfirmMessage"))) {
            void updateStatus("PENDING_CANCELLATION", t("orderDetails.cancellationNote"), false);
          }
        }}
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
