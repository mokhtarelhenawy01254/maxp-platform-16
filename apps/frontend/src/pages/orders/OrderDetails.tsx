import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import {
  ArrowPathIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  TruckIcon,
  XCircleIcon,
  TicketIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
// Components
import OrderHeader from "./components/OrderHeader";
import OrderDetailsMainContent from "./components/OrderDetailsMainContent";
import OrderDetailsSidebar from "./components/OrderDetailsSidebar";
import OrderReturnCard from "./components/OrderReturnCard";
import TurboShippingPanel from "./components/TurboShippingPanel";
import BostaShippingPanel from "./components/BostaShippingPanel";
// Cards migrated into OrderDetailsSidebar
import OrderActionModalsContainer from "./components/OrderActionModalsContainer";
import OrderShipmentModals from "./components/OrderShipmentModals";

// Hooks & Utils
import { useOrderDetails } from "./hooks/useOrderDetails";
import { useOrderEditCalculation } from "./hooks/useOrderEditCalculation";
import { useOrderEditItemsOperations } from "./hooks/useOrderEditItemsOperations";
import { useOrderPaymentStatusOperations } from "./hooks/useOrderPaymentStatusOperations";
import { useOrderFulfillmentActions } from "./hooks/useOrderFulfillmentActions";
import { useOrderShippingActions } from "./hooks/useOrderShippingActions";
import {
  isCancellationStatus,
  useOrderStatusOperations,
} from "./hooks/useOrderStatusOperations";
import { useTurboShipping } from "./hooks/useTurboShipping";
import { useBostaShipping } from "./hooks/useBostaShipping";
import { OrderDetailsType } from "./types";
import {
  getOrderReturnDetails,
  isReturnStatusCode,
  COMMON_RETURN_REASONS,
} from "./utils/returnHelper";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";
import { useOrderHeaderActions } from "./hooks/useOrderHeaderActions";
import { useOrderPermissionsAndApps } from "./hooks/useOrderPermissionsAndApps";

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

  const {
    turboLoading,
    turboTrackingData,
    shippingComparison,
    createShipment,
    updateShipment,
    syncStatus,
    getWaybill,
    cancelShipment,
    unlinkShipment,
    calculateShipping,
    setTurboTrackingData,
  } = useTurboShipping(order, setOrder);

  const {
    bostaLoading,
    bostaShipment,
    fetchShipment: fetchBostaShipment,
    createShipment: createBostaShipment,
    printAWB: printBostaAWB,
    cancelShipment: cancelBostaShipment,
  } = useBostaShipping(order, setOrder);

  const { settings: invoiceSettings } = useInvoiceSettings();

  useEffect(() => {
    if (order?.id) fetchBostaShipment();
  }, [order?.id]);

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

  const {
    showStatusModal,
    setShowStatusModal,
    newStatus,
    setNewStatus,
    statusNotes,
    setStatusNotes,
    returnReason,
    setReturnReason,
    returnAdditionalNotes,
    setReturnAdditionalNotes,
    isOverride,
    setIsOverride,
    cancellationReasonOptions,
    cancellationReasonOptionsLoading,
    cancellationAdditionalNotes,
    setCancellationAdditionalNotes,
    isModalCancellationStatus,
    isModalReturnStatus,
    onUpdateStatus,
    handleQuickStatusSelect,
  } = useOrderStatusOperations({
    order,
    canUpdateOrderStatus,
    updateStatus,
  });

  const {
    canUpdatePaymentStatus,
    newPaymentStatus,
    setNewPaymentStatus,
    paymentNotes,
    setPaymentNotes,
    onUpdatePaymentStatus,
  } = useOrderPaymentStatusOperations({
    isMerchant,
    isGuestOrder,
    updatePaymentStatus,
    setShowPaymentModal,
  });

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



  const {
    showPostponeModal,
    setShowPostponeModal,
    postponing,
    handlePostponeOrder,
    showPartialDeliveryModal,
    setShowPartialDeliveryModal,
    partialDeliveryLoading,
    handlePartialDelivery,
  } = useOrderFulfillmentActions({
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
    showCancelShipmentModal,
    setShowCancelShipmentModal,
    showUnlinkShipmentModal,
    setShowUnlinkShipmentModal,
    showRecreateShipmentModal,
    setShowRecreateShipmentModal,
    handleCreateShipment,
    handleRecreateShipment,
    handlePrintWaybill,
    handleCalculateShipping,
  } = useOrderShippingActions({
    order,
    createShipment,
    getWaybill,
    calculateShipping,
    bostaShipment,
    printBostaAWB,
  });

  // 🛡️ (custom-status-persist): خريطة UPPER(code) → الاسم المعرّف لسجل النشاط
  // (فوق الـ early returns إلزاميًا — hooks شرطية بتعمل React #310)
  const statusNameMap = useMemo(
    () =>
      Object.fromEntries(
        orderStatuses.map((s) => [
          String(s.code || "").trim().toUpperCase(),
          s.name,
        ]),
      ),
    [orderStatuses],
  );



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

  const effectiveStatus = (order as any).effectiveStatus || order.status || 'PENDING';
  const currentStatusConfig = orderStatuses.find(
    (s) => (s.code || "").toUpperCase() === String(effectiveStatus || "").toUpperCase(),
  ) || {
    code: effectiveStatus,
    name: effectiveStatus.replace(/_/g, " "),
    color: "#6B7280",
  };

  const hasWorkflowRestrictions = allowedTransitions.length > 0;
  const filteredStatusOptions = hasWorkflowRestrictions
    ? orderStatuses.filter((s) => {
        if (s.code === order.status) return true;
        if (!allowedTransitions.includes(s.code)) return false;
        const wfStatus = workflowStatusDefs.find((ws) => ws.code === s.code);
        if (wfStatus?.requiresOverride && !isOverride) return false;
        return true;
      })
    : orderStatuses;

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
                    setNewStatus(order.status || "RETURNED");
                    setStatusNotes(returnDetails.reason || "");
                    setReturnReason(returnDetails.reason || "");
                    setShowStatusModal(true);
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

      {/* Action Modals */}
      <OrderActionModalsContainer
        order={order}
        canEditOrderDetails={canEditOrderDetails}
        canUpdateOrderStatus={canUpdateOrderStatus}
        canUpdatePaymentStatus={canUpdatePaymentStatus}
        showAddProductModal={showAddProductModal}
        setShowAddProductModal={setShowAddProductModal}
        handleProductSelect={handleProductSelect}
        showStatusModal={showStatusModal}
        setShowStatusModal={setShowStatusModal}
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
        commonReturnReasons={COMMON_RETURN_REASONS}
        updating={updating}
        onUpdateStatus={onUpdateStatus}
        showPaymentModal={showPaymentModal}
        setShowPaymentModal={setShowPaymentModal}
        newPaymentStatus={newPaymentStatus}
        setNewPaymentStatus={setNewPaymentStatus}
        paymentNotes={paymentNotes}
        setPaymentNotes={setPaymentNotes}
        paymentStatuses={paymentStatuses}
        onUpdatePaymentStatus={onUpdatePaymentStatus}
        showPostponeModal={showPostponeModal}
        setShowPostponeModal={setShowPostponeModal}
        handlePostponeOrder={handlePostponeOrder}
        postponing={postponing}
        showPartialDeliveryModal={showPartialDeliveryModal}
        setShowPartialDeliveryModal={setShowPartialDeliveryModal}
        handlePartialDelivery={handlePartialDelivery}
        partialDeliveryLoading={partialDeliveryLoading}
        showTicketModal={showTicketModal}
        setShowTicketModal={setShowTicketModal}
        fetchOrderDetails={fetchOrderDetails}
      />

      {/* Shipment Confirmation Modals */}
      <OrderShipmentModals
        showCancelShipmentModal={showCancelShipmentModal}
        setShowCancelShipmentModal={setShowCancelShipmentModal}
        showUnlinkShipmentModal={showUnlinkShipmentModal}
        setShowUnlinkShipmentModal={setShowUnlinkShipmentModal}
        showRecreateShipmentModal={showRecreateShipmentModal}
        setShowRecreateShipmentModal={setShowRecreateShipmentModal}
        cancelShipment={cancelShipment}
        unlinkShipment={unlinkShipment}
        handleRecreateShipment={handleRecreateShipment}
        turboLoading={turboLoading}
      />
    </div>
  );
};

export default OrderDetails;
