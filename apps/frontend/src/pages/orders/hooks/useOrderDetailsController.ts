import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../../hooks/useCurrency";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { useAuth } from "../../../hooks/useAuthSimple";
import { useCompany } from "../../../contexts/CompanyContext";
import { useOrderDetails } from "./useOrderDetails";
import { useOrderEditCalculation } from "./useOrderEditCalculation";
import { useOrderEditItemsOperations } from "./useOrderEditItemsOperations";
import { useOrderPaymentStatusOperations } from "./useOrderPaymentStatusOperations";
import { useOrderFulfillmentActions } from "./useOrderFulfillmentActions";
import { useOrderDetailsShipping } from "./useOrderDetailsShipping";
import {
  getLatestCancellationReason,
  useOrderStatusOperations,
} from "./useOrderStatusOperations";
import { getOrderReturnDetails } from "../utils/returnHelper";
import { useInvoiceSettings } from "../../../hooks/useInvoiceSettings";
import { useOrderHeaderActions } from "./useOrderHeaderActions";
import { useOrderPermissionsAndApps } from "./useOrderPermissionsAndApps";
import { useOrderStatusOptions } from "./useOrderStatusOptions";

export const useOrderDetailsController = () => {
  const { id: orderNumber } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { formatDate } = useCurrency();
  const { formatDate: formatDateString } = useDateFormat();
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
  const { handleQuickStatusSelect } = statusOperations;

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

  const { calculatedTotals } = useOrderEditCalculation({
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

  const formatOptionalDate = (value?: string | null) =>
    value ? formatDateString(value) : "—";

  return {
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
  };
};
