import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import {
  ArrowPathIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  TruckIcon,
  XCircleIcon,
  TicketIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathRoundedSquareIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import SimplifiedProductSelectionModal from "./components/SimplifiedProductSelectionModal";
import OrderPartnerOperationsCard from "../../components/orders/OrderPartnerOperationsCard";

// Components
import OrderHeader from "./components/OrderHeader";
import OrderDiscountApprovalBanner from "./components/OrderDiscountApprovalBanner";
import OrderItemsCard from "./components/OrderItemsCard";
import CustomerInfoCard from "./components/CustomerInfoCard";
import CustomerOrderHistoryCard from "./components/CustomerOrderHistoryCard";
import OrderPaymentCard from "./components/OrderPaymentCard";
import OrderReturnCard from "./components/OrderReturnCard";
import TurboShippingPanel from "./components/TurboShippingPanel";
import BostaShippingPanel from "./components/BostaShippingPanel";
import UnifiedShippingCard from "./components/UnifiedShippingCard";
import OrderActivityLog from "./components/OrderActivityLog";
import OrderSourceCard from "./components/OrderSourceCard";
import OrderAttributionCard from "./components/OrderAttributionCard";
import OrderSessionDetailsCard from "./components/OrderSessionDetailsCard";
import ConfirmationModal from "./components/ConfirmationModal";
import PostponeOrderModal from "./components/PostponeOrderModal";
import PartialDeliveryModal from "./components/PartialDeliveryModal";
import { CreateTicketModal } from "./shipments/CreateTicketModal";

// Hooks & Utils
import { useOrderDetails } from "./hooks/useOrderDetails";
import { useTurboShipping } from "./hooks/useTurboShipping";
import { useBostaShipping } from "./hooks/useBostaShipping";
import { OrderDetailsType } from "./types";
import {
  getOrderReturnDetails,
  isReturnStatusCode,
  COMMON_RETURN_REASONS,
} from "./utils/returnHelper";
import { printSingleShippingLabel } from "../../utils/printShippingLabel";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";
import { apiClient } from "../../services/apiClient";
import { cancellationService, CancellationReason } from "../../services/cancellationService";
import tokenManager from "../../utils/tokenManager";
import {
  ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  ORDER_CONFIRMATION_DISTRIBUTION_APP_SLUGS,
  ORDER_SOURCE_TRACKING_APP_SLUGS,
  getCurrentCompanyActiveApps,
  hasAnyCompanyAppSlug,
  normalizeCompanyAppSlug,
} from "../../utils/companyApps";

const isCancellationStatus = (status?: string | null) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  return normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";
};

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
    setOrder,
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
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCancelShipmentModal, setShowCancelShipmentModal] = useState(false);
  const [showUnlinkShipmentModal, setShowUnlinkShipmentModal] = useState(false);
  const [showRecreateShipmentModal, setShowRecreateShipmentModal] =
    useState(false);
  const [showPartialDeliveryModal, setShowPartialDeliveryModal] = useState(false);
  const [partialDeliveryLoading, setPartialDeliveryLoading] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Temporary Form State for Modals
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnAdditionalNotes, setReturnAdditionalNotes] = useState("");
  const [isOverride, setIsOverride] = useState(false);
  const [newPaymentStatus, setNewPaymentStatus] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [cancellationReasonOptions, setCancellationReasonOptions] = useState<
    CancellationReason[]
  >([]);
  const [cancellationReasonOptionsLoading, setCancellationReasonOptionsLoading] =
    useState(false);
  const [cancellationAdditionalNotes, setCancellationAdditionalNotes] = useState("");
  const [postponing, setPostponing] = useState(false);

  const isGuestOrder = Boolean(order?.metadata?.isGuestOrder);
  const isModalCancellationStatus = isCancellationStatus(newStatus);
  const isModalReturnStatus = isReturnStatusCode(newStatus);
  const latestCancellationReason = useMemo(
    () => getLatestCancellationReason(order),
    [order],
  );
  const returnDetails = useMemo(
    () => getOrderReturnDetails(order),
    [order],
  );
  const isMerchant = user?.role === "MERCHANT";
  const merchantOrderScope =
    order?.merchantOrder ||
    order?.metadata?.merchantOrder ||
    order?.metadata?.merchantScope ||
    null;
  const merchantFulfillmentSource = String(
    merchantOrderScope?.fulfillmentSource || "",
  ).toUpperCase();
  const isMerchantSelfFulfilledOrder =
    isMerchant && merchantFulfillmentSource === "MERCHANT";
  const canEditOrderDetails = true;
  const canUpdateOrderStatus = !isMerchant || isMerchantSelfFulfilledOrder;
  const canUpdatePaymentStatus = !isMerchant && !isGuestOrder;
  const canManageTurboShipping = !isMerchant;
  const activeCompanyAppSlugSet = useMemo(
    () =>
      new Set(
        getCurrentCompanyActiveApps(user, company)
          .map(normalizeCompanyAppSlug)
          .filter(Boolean),
      ),
    [company, user],
  );
  const hasOrderSourceTrackingApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_SOURCE_TRACKING_APP_SLUGS,
  );
  const hasOrderCampaignAttributionApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  );
  const hasOrderConfirmationDistributionApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_CONFIRMATION_DISTRIBUTION_APP_SLUGS,
  );
  const showPartnerOperationsCard = !isMerchant;
  const showOrderSourceCard = !isMerchant && (hasOrderSourceTrackingApp || Boolean(order?.conversationId));
  const showOrderAttributionCard = !isMerchant && hasOrderCampaignAttributionApp;
  const showConfirmationDistributionCard =
    !isMerchant && hasOrderConfirmationDistributionApp;

  // Late Cancellation Logic
  const companySettings = useMemo(() => {
    if (!company?.settings) return {};
    try {
      return typeof company.settings === "string"
        ? JSON.parse(company.settings)
        : company.settings;
    } catch (e) {
      return {};
    }
  }, [company?.settings]);

  const lateCancellationInterceptEnabled =
    companySettings?.lateCancellationInterceptEnabled || false;
  const lateCancellationTargetStatuses =
    companySettings?.lateCancellationTargetStatuses || [];
  const showLateCancellationButton =
    canUpdateOrderStatus &&
    lateCancellationInterceptEnabled &&
    lateCancellationTargetStatuses.includes(
      order?.status?.toUpperCase() || "",
    );

  // Auth Check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/auth/login";
    }
  }, [authLoading, isAuthenticated]);

  // Track unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!canEditOrderDetails) return false;
    if (!isEditing || !order) return false;

    // Check if any field has changed
    const hasChanges =
      editForm.customerName !== order.customerName ||
      editForm.customerPhone !== (order.customerPhone || "") ||
      editForm.alternativePhone !== (order.alternativePhone || "") ||
      editForm.customerAddress !== (order.customerAddress || "") ||
      editForm.city !== (order.city || "") ||
      editForm.notes !== (order.notes || "") ||
      editForm.shipping !== (order.shipping || 0) ||
      editForm.tax !== (order.tax || 0) ||
      editForm.discount !== (order.discount || 0) ||
      editForm.discountReason !== (order.discountReason || "") ||
      JSON.stringify(editForm.items) !== JSON.stringify(order.items);

    return hasChanges;
  }, [canEditOrderDetails, isEditing, order, editForm]);

  // Warn about unsaved changes
  useUnsavedChanges({
    hasUnsavedChanges,
    message: t("orderDetails.unsavedChangesMessage"),
  });

  // Calculate real-time totals during editing
  const calculatedTotals = useMemo(() => {
    if (!isEditing || !order) {
      const subtotal = order?.subtotal || 0;
      const shipping = order?.shipping || 0;
      const tax = order?.tax || 0;
      const discount = order?.discount || 0;
      return {
        subtotal,
        shipping,
        tax,
        discount,
        total: Math.max(0, subtotal + shipping + tax - discount),
      };
    }

    const subtotal = editForm.items.reduce((sum: number, item: any) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + price * quantity;
    }, 0);

    const shipping =
      typeof editForm.shipping === "number" && !isNaN(editForm.shipping)
        ? editForm.shipping
        : parseFloat(editForm.shipping) || 0;
    const tax =
      typeof editForm.tax === "number" && !isNaN(editForm.tax)
        ? editForm.tax
        : parseFloat(editForm.tax) || 0;
    const discount =
      typeof editForm.discount === "number" && !isNaN(editForm.discount)
        ? editForm.discount
        : parseFloat(editForm.discount) || 0;
    const total = Math.max(0, subtotal + shipping + tax - discount);

    return { subtotal, shipping, tax, discount, total };
  }, [isEditing, editForm.items, editForm.shipping, editForm.tax, editForm.discount, order]);

  // Handlers
  const handlePrintInvoice = async () => {
    if (!order) return;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert(t("orderDetails.printWindowError"));
      return;
    }

    const printDirectInvoice = async () => {
      await printSingleShippingLabel({
        order,
        companyName: user?.company?.name,
        companyLogoUrl: user?.company?.logo || null,
        printWindow,
        settings: invoiceSettings,
      });
    };

    if (order.metadata?.isGuestOrder) {
      try {
        await printDirectInvoice();
      } catch (error: any) {
        console.error("Error printing guest order invoice:", error);
        alert(t("orderDetails.invoicePrintError", { error: error.message }));
      }
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/order-invoices/generate/${order.id}`,
        {
          method: "POST",
          headers: tokenManager.createAuthHeaders({
            "Content-Type": "application/json",
          }),
        },
      );

      const result = await response.json().catch(() => null);

      if (response.ok && result?.success && result?.data?.id) {
        printWindow.location.href = `/orders/invoice/${result.data.id}?print=true`;
        return;
      }

      console.warn("Falling back to direct invoice print:", result);
      await printDirectInvoice();
    } catch (error: any) {
      console.error("Error generating invoice:", error);
      try {
        await printDirectInvoice();
      } catch (fallbackError: any) {
        console.error("Direct invoice print fallback failed:", fallbackError);
        alert(
          t("orderDetails.invoicePrintError", {
            error: fallbackError?.message || error?.message || t("orderDetails.invoicePrintFallbackError"),
          }),
        );
      }
    }
  };

  const handlePrintPreparationSlip = async () => {
    if (!order) return;

    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error("فشل في فتح نافذة جديدة للطباعة");
      }
      await printSingleShippingLabel({
        order,
        companyName: user?.company?.name,
        companyLogoUrl: user?.company?.logo || null,
        printWindow,
        settings: invoiceSettings,
      });
    } catch (error: any) {
      console.error("Error generating preparation slip HTML:", error);
      alert(t("orderDetails.preparationSlipError", { error: error.message }));
    }
  };

  const onUpdateStatus = async () => {
    const trimmedReason = statusNotes.trim();
    if (isCancellationStatus(newStatus) && !trimmedReason) return;
    if (isModalReturnStatus && !returnReason.trim() && !trimmedReason) return;

    let notesToSend = statusNotes.trim();
    if (isCancellationStatus(newStatus)) {
      notesToSend = cancellationAdditionalNotes.trim()
        ? trimmedReason + '\n' + cancellationAdditionalNotes.trim()
        : trimmedReason;
    } else if (isModalReturnStatus) {
      const primary = returnReason.trim() && returnReason !== "other" ? returnReason.trim() : trimmedReason;
      notesToSend = returnAdditionalNotes.trim()
        ? primary + (primary ? '\n' : '') + returnAdditionalNotes.trim()
        : primary;
    }

    const success = await updateStatus(newStatus, notesToSend, isOverride);
    if (success) {
      setShowStatusModal(false);
      setNewStatus("");
      setStatusNotes("");
      setReturnReason("");
      setReturnAdditionalNotes("");
      setCancellationAdditionalNotes("");
      setIsOverride(false);
    }
  };

  useEffect(() => {
    if (!showStatusModal || !isModalCancellationStatus) {
      return;
    }

    let isMounted = true;
    setCancellationReasonOptionsLoading(true);

    void cancellationService
      .getReasons()
      .then((res) => {
        if (isMounted) {
          setCancellationReasonOptions(res.data);
        }
      })
      .catch((error) => {
        console.error("Failed to load cancellation reasons:", error);
        if (isMounted) {
          setCancellationReasonOptions([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setCancellationReasonOptionsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [showStatusModal, isModalCancellationStatus]);

  const onUpdatePaymentStatus = async () => {
    if (isGuestOrder) {
      setShowPaymentModal(false);
      return;
    }

    const success = await updatePaymentStatus(newPaymentStatus, paymentNotes);
    if (success) {
      setShowPaymentModal(false);
      setNewPaymentStatus("");
      setPaymentNotes("");
    }
  };

  const handlePostponeOrder = async (data: {
    scheduledDeliveryDate: string;
    scheduledNotes: string;
    autoTransitionEnabled: boolean;
  }) => {
    if (!order) return;
    setPostponing(true);
    try {
      const response = await apiClient.post(
        `/orders-new/simple/${order.orderNumber}/schedule`,
        {
          scheduledDeliveryDate: data.scheduledDeliveryDate,
          scheduledNotes: data.scheduledNotes,
          autoTransitionEnabled: data.autoTransitionEnabled,
          changeStatusToScheduled: true,
        },
      );
      if (response.data.success) {
        setShowPostponeModal(false);
        await fetchOrderDetails();
        toast.success(t("orderDetails.orderPostponed"));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("orderDetails.postponeFailed"));
    } finally {
      setPostponing(false);
    }
  };

  const handlePartialDelivery = async (deliveredItems: any[], returnedItems: any[]) => {
    if (!order) return;
    setPartialDeliveryLoading(true);
    try {
      // Step 1: Update the current order with only delivered items and change status
      const deliveredSubtotal = deliveredItems.reduce(
        (sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
        0,
      );
      await apiClient.put(`/orders-new/simple/${order.orderNumber}/items`, {
        items: deliveredItems,
        subtotal: deliveredSubtotal,
        tax: order.tax || 0,
        shipping: order.shipping || 0,
        total: deliveredSubtotal + parseFloat(String(order.tax || 0)) + parseFloat(String(order.shipping || 0)),
      });
      await updateStatus("PARTIALLY_DELIVERED", t("orderDetails.partialDeliveryNote"));

      // Step 2: If there are returned items, create a new order for them
      if (returnedItems.length > 0) {
        const returnedSubtotal = returnedItems.reduce(
          (sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
          0,
        );
        await apiClient.post(`/orders-new/simple`, {
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          alternativePhone: order.alternativePhone,
          customerAddress: order.customerAddress,
          city: order.city,
          government: order.government,
          items: returnedItems,
          subtotal: returnedSubtotal,
          shipping: order.shipping || 0,
          tax: order.tax || 0,
          currency: order.currency,
           notes: t("orderDetails.returnedFromOrder", { orderNumber: order.orderNumber }),
          status: "PARTIALLY_RETURNED",
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
        });
        toast.success(t("orderDetails.partialDeliverySuccessWithReturn"));
      } else {
        toast.success(t("orderDetails.orderUpdated"));
      }

      setShowPartialDeliveryModal(false);
      await fetchOrderDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("orderDetails.partialDeliveryError"));
    } finally {
      setPartialDeliveryLoading(false);
    }
  };

  const handleQuickStatusSelect = async (statusCode: string) => {
    if (!canUpdateOrderStatus) return;
    const normalizedStatusCode = statusCode.toUpperCase();
    if (
      !order ||
      !normalizedStatusCode ||
      normalizedStatusCode === (order.status || "").toUpperCase()
    )
      return;

    if (isCancellationStatus(normalizedStatusCode) || isReturnStatusCode(normalizedStatusCode)) {
      setNewStatus(normalizedStatusCode);
      setStatusNotes("");
      setReturnReason("");
      setReturnAdditionalNotes("");
      setShowStatusModal(true);
      return;
    }

    const success = await updateStatus(normalizedStatusCode, "", isOverride);
    if (success) {
      setNewStatus("");
      setStatusNotes("");
      setReturnReason("");
      setReturnAdditionalNotes("");
    }
  };

  const handleProductSelect = (product: any, variant?: any) => {
    // ✅ Extract variant data properly
    let productColor = "";
    let productSize = "";
    let actualPrice = product.price;
    let metadata: any = {};

    if (variant) {
      // Extract color and size from variant
      if (variant.color) productColor = variant.color;
      if (variant.size) productSize = variant.size;

      // Use variant price if available
      if (variant.price && parseFloat(variant.price) > 0) {
        actualPrice = parseFloat(variant.price);
      }

      // Parse variant attributes from metadata
      if (variant.metadata) {
        try {
          const variantMeta =
            typeof variant.metadata === "string"
              ? JSON.parse(variant.metadata)
              : variant.metadata;

          metadata = variantMeta;

          // Extract from attributes array
          if (variantMeta.attributes && Array.isArray(variantMeta.attributes)) {
            variantMeta.attributes.forEach((attr: any) => {
              if (attr.type === "color" && attr.option && !productColor) {
                productColor = attr.option;
              }
              if (attr.type === "size" && attr.option && !productSize) {
                productSize = attr.option;
              }
            });
          }

          // Extract from attributeValues or direct metadata
          const vAttrs =
            variantMeta.attributeValues ||
            (typeof variantMeta.attributes === "object" && !Array.isArray(variantMeta.attributes)
              ? variantMeta.attributes
              : null) ||
            variantMeta;
          if (vAttrs && typeof vAttrs === "object") {
            const c = vAttrs["اللون"] ?? vAttrs["لون"] ?? vAttrs["Color"] ?? vAttrs["color"];
            const s = vAttrs["المقاس"] ?? vAttrs["مقاس"] ?? vAttrs["Size"] ?? vAttrs["size"];
            if (c != null && !productColor) productColor = String(c);
            if (s != null && !productSize) productSize = String(s);
          }
        } catch (e) {
          console.error("Error parsing variant metadata:", e);
        }
      }

      // Parse from variant name if still empty
      if (variant.name && (!productColor || !productSize)) {
        const name = variant.name;

        // If explicit type is color and no separator
        if (
          variant.type === "color" &&
          !name.includes("-") &&
          !name.includes("|") &&
          !name.includes("/")
        ) {
          if (!productColor) productColor = name.trim();
        } else {
          // Handle hyphen, en-dash, pipe, and slash separators
          const parts = name.split(/\s*[-–|\/]\s*/).filter((p: any) => p.trim());

          if (parts.length >= 2) {
            // Assumption: Color is often first, Size is often last
            if (!productColor) productColor = parts[0].trim();
            if (!productSize) productSize = parts[parts.length - 1].trim();
          } else if (parts.length === 1) {
            // Logic for single part found
            const val = parts[0].trim();
            // If it looks like a number, it might be size? If text, might be color?
            if (isNaN(parseFloat(val)) && !productColor) {
              productColor = val;
            } else if (!productSize) {
              productSize = val;
            }
          }
        }
      }
    }

    // ✅ Validate price
    if (actualPrice <= 0) {
      alert(t("orderDetails.priceMustBeGreaterThanZero"));
      return;
    }

    // ✅ Check for duplicates
    const isDuplicate = editForm.items.some(
      (item: any) =>
        item.productId === product.id &&
        item.productColor === productColor &&
        item.productSize === productSize,
    );

    if (isDuplicate) {
      alert(t("orderDetails.productAlreadyExists"));
      return;
    }

    // ✅ Extract Image
    let productImage = "";

    // Helper to get first image from string or array
    const getFirstImage = (imgData: any) => {
      if (!imgData) return "";
      if (Array.isArray(imgData)) return imgData[0];
      if (typeof imgData === "string") {
        if (imgData.startsWith("[")) {
          try {
            const parsed = JSON.parse(imgData);
            return Array.isArray(parsed) ? parsed[0] : parsed;
          } catch (e) {
            return imgData;
          }
        }
        return imgData;
      }
      return "";
    };

    productImage =
      getFirstImage(variant?.images) ||
      getFirstImage(variant?.image) ||
      getFirstImage(product.images) ||
      getFirstImage(product.image) ||
      "";

    const itemSku = variant?.sku || product.sku;

    const newItem = {
      productId: product.id,
      variantId: variant?.id || null,
      productName: product.name,
      price: actualPrice,
      quantity: 1,
      total: actualPrice,
      productColor,
      productSize: productSize != null ? String(productSize) : "",
      productImage, // ✅ ADDED: Image field
      productSku: itemSku,
      metadata: {
        ...metadata,
        image: productImage, // Add to metadata as backup
        variantId: variant?.id || null,
        sku: itemSku,
        originalProductId: product.id,
      },
    };

    setEditForm((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setShowAddProductModal(false);
    // تم إضافة المنتج بنجاح
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setEditForm((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Recalculate total for item
      if (field === "price" || field === "quantity") {
        const price = parseFloat(newItems[index].price) || 0;
        const qty = parseInt(newItems[index].quantity) || 1;
        newItems[index].total = price * qty;
      }
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditForm((prev) => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const handleCreateShipment = async () => {
    await createShipment();
  };

  const handleRecreateShipment = async () => {
    const result = await createShipment({ replaceExisting: true });
    if (result?.success) {
      setShowRecreateShipmentModal(false);
    }
  };

  const handlePrintWaybill = async () => {
    const isQp =
      order?.carrierType === "QP_EXPRESS" ||
      order?.shippingCompany?.providerKey === "QP_EXPRESS" ||
      Boolean(order?.qpTrackingNumber);
    const isBosta =
      order?.carrierType === "BOSTA" ||
      order?.shippingCompany?.providerKey === "BOSTA";
    const tracking = order?.trackingNumber || order?.turboTrackingNumber;

    if (isQp && tracking) {
      window.open(`/api/v1/qp-express/waybill/${tracking}`, "_blank");
      return;
    }

    if (isBosta && (bostaShipment?.trackingNumber || tracking)) {
      if (printBostaAWB) {
        printBostaAWB();
      } else {
        toast.info("جاري تجهيز بوليصة بوستا...");
      }
      return;
    }

    // Default Turbo or internal waybill
    await getWaybill();
  };

  const handleCalculateShipping = async () => {
    if (!order) return;
    // Try to extract gov and city
    let gov = "";
    let city = order.city || "";

    const addr = order.shippingAddress || order.customerAddress;
    if (typeof addr === "string" && addr.startsWith("{")) {
      try {
        const parsed = JSON.parse(addr);
        gov = parsed.governorate || parsed.government || "";
        if (!city) city = parsed.city || parsed.area || "";
      } catch (_e) {
        // Ignore malformed saved address payloads and fall back to flat fields.
      }
    } else if (typeof addr === "object") {
      const obj = addr as any;
      gov = obj.governorate || obj.government || "";
      if (!city) city = obj.city || obj.area || "";
    }

    await calculateShipping(gov, city);
  };

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

  const whatsappChatUrl = useMemo(() => {
    const rawPhone = order?.customerPhone || order?.alternativePhone;
    if (!rawPhone) return null;
    let cleanPhone = String(rawPhone).replace(/\D/g, "");
    if (cleanPhone.startsWith("01") && cleanPhone.length === 11) {
      cleanPhone = "2" + cleanPhone;
    }
    const params = new URLSearchParams();
    params.set("phone", cleanPhone);
    if (order?.customerName) {
      params.set("name", order.customerName);
    }
    if (order?.orderNumber) {
      params.set("orderNumber", order.orderNumber);
    }
    if (order?.conversationId) {
      params.set("conversationId", order.conversationId);
    }
    return `/whatsapp?${params.toString()}`;
  }, [
    order?.customerPhone,
    order?.alternativePhone,
    order?.customerName,
    order?.orderNumber,
    order?.conversationId,
  ]);

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
    (s) => s.code === effectiveStatus,
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

  const confirmedByName = order.confirmedByUser
    ? `${order.confirmedByUser.firstName || ""} ${order.confirmedByUser.lastName || ""}`.trim()
    : order.confirmedBy || "—";

  const assignedToName = order.assignedToUser
    ? `${order.assignedToUser.firstName || ""} ${order.assignedToUser.lastName || ""}`.trim()
    : order.assignedTo || "—";

  const assignedByName = order.assignedByUser
    ? `${order.assignedByUser.firstName || ""} ${order.assignedByUser.lastName || ""}`.trim()
    : order.assignedBy || "—";

  const isCurrentlyPending = ["PENDING", "PENDING_STOCK", "ON_HOLD_STOCK", "CANCELLED", "TRASH", "WOO_TAGHEZ"].includes(effectiveStatus.toUpperCase());
  const confirmationStatusLabel =
    (!isCurrentlyPending && order.confirmedAt) || effectiveStatus === "CONFIRMED" ? t("orderDetails.confirmedStatus") : t("orderDetails.notConfirmedStatus");
  const assignmentStatusLabel = order.assignedTo ? t("orderDetails.distributed") : t("orderDetails.notDistributed");

  console.log("🔍 Order Status Debug:", {
    orderStatus: order.status,
    orderStatuses: orderStatuses,
    currentStatusConfig: currentStatusConfig,
  });

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
        <div className="space-y-6 lg:col-span-2">
          {/* Discount Approval Banner */}
          <OrderDiscountApprovalBanner
            order={order}
            onApprove={() => handleDiscountApproval("APPROVE")}
            onReject={(reason) => handleDiscountApproval("REJECT", reason)}
            loading={updating}
          />

          {/* Items Card */}
          <OrderItemsCard
            isEditing={canEditOrderDetails && isEditing}
            items={canEditOrderDetails && isEditing ? editForm.items : order.items}
            currency={order.currency}
            totals={calculatedTotals}
            discountReason={order.discountReason}
            editDiscountReason={editForm.discountReason}
            onDiscountChange={(val) =>
              setEditForm((prev) => ({ ...prev, discount: val }))
            }
            onDiscountReasonChange={(val) =>
              setEditForm((prev) => ({ ...prev, discountReason: val }))
            }
            onAddItem={() => {
              if (canEditOrderDetails) setShowAddProductModal(true);
            }}
            onItemChange={handleItemChange}
            onRemoveItem={handleRemoveItem}
            onShippingChange={(val) =>
              setEditForm((prev) => ({ ...prev, shipping: val }))
            }
            onTaxChange={(val) =>
              setEditForm((prev) => ({ ...prev, tax: val }))
            }
          />

          {showPartnerOperationsCard && (
            <OrderPartnerOperationsCard
              affiliate={order.affiliate}
              merchantOrder={merchantOrderScope}
            />
          )}

          {/* Unified Multi-Carrier Shipping Panel */}
          <UnifiedShippingCard
            order={order}
            onOrderUpdated={fetchOrderDetails}
            canManageShipments={canManageTurboShipping}
            onOpenTicket={() => setShowTicketModal(true)}
          />
        </div>

        {/* LEFT COLUMN (Sidebar) */}
        <div className="space-y-6 lg:col-span-1">
          <CustomerInfoCard
            order={order}
            isEditing={canEditOrderDetails && isEditing}
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
            onOrderUpdated={fetchOrderDetails}
            onCustomerRatingChange={(newRating) => {
              setOrder((prev) =>
                prev
                  ? {
                      ...prev,
                      customerRating: newRating,
                      customer: prev.customer
                        ? { ...prev.customer, customerRating: newRating }
                        : prev.customer,
                    }
                  : prev
              );
            }}
          />

          <div id="customer-order-history-card">
            <CustomerOrderHistoryCard
              orderNumber={order.orderNumber}
              initialHistory={order.customerHistory}
              customerPhone={order.customerPhone}
              customerEmail={order.customerEmail}
              customerId={order.customerId}
              currency={order.currency}
            />
          </div>

          <OrderPaymentCard
            order={order}
            canUpdatePaymentStatus={canUpdatePaymentStatus}
            onOpenPaymentModal={() => setShowPaymentModal(true)}
          />

          <OrderSessionDetailsCard
            sessionDetails={order.sessionDetails || (order.metadata as any)?.sessionDetails}
            firstOrderInfo={order.firstOrderInfo}
            orderSource={order.orderSource}
            sourceType={order.sourceType}
            customerPhone={order.customerPhone}
            createdAt={order.createdAt}
            orderGovernorate={order.governorate || order.shippingAddress?.governorate || (order.shippingAddress as any)?.government}
            orderCity={order.city || order.shippingAddress?.city}
          />

          {showOrderSourceCard && <OrderSourceCard order={order} />}
          {showOrderAttributionCard && <OrderAttributionCard order={order} />}

          {(() => {
            const meta = typeof order.metadata === 'string' ? (() => { try { return JSON.parse(order.metadata); } catch { return {}; } })() : (order.metadata || {});
            const returnAmt = meta.returnAmount || null;
            const shippingCost = parseFloat(order.shipping || order.shippingCost || '0');
            const displayAmount = returnAmt ? parseFloat(returnAmt) : shippingCost;
            return displayAmount > 0 ? (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t("orderDetails.returnCollectionLabel")}</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {t("orderDetails.returnAmount", { amount: displayAmount.toFixed(2) })}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                  {returnAmt ? t("orderDetails.returnCustomValue") : t("orderDetails.returnDefaultValue")} — {t("orderDetails.returnDescription")}
                </p>
              </div>
            ) : null;
          })()}

          {(order as any)?.walletPaymentProof ? (
            <WalletPaymentProofCard
              proof={(order as any).walletPaymentProof}
              onVerify={verifyWalletProof}
            />
          ) : null}

          {isCancellationStatus(effectiveStatus) && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
              <h3 className="text-base font-semibold text-red-900 dark:text-red-100">
                {t("orderDetails.cancellationReason")}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800 dark:text-red-200">
                {latestCancellationReason ||
                  t("orderDetails.noCancellationReason")}
              </p>
            </div>
          )}

          {returnDetails && returnDetails.isReturned && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-5 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-rose-900 dark:text-rose-100 font-bold text-sm">
                  <ArrowPathRoundedSquareIcon className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>{returnDetails.returnTypeLabel}</span>
                </div>
                {returnDetails.source && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {returnDetails.source}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-rose-950 dark:text-rose-100">
                {returnDetails.reason || t("orderDetails.noReturnReason", { defaultValue: "لم يتم تسجيل سبب محدد للمرتجع" })}
              </p>
              {returnDetails.secondaryReason && returnDetails.secondaryReason !== returnDetails.reason && (
                <div className="mt-2.5 pt-2 border-t border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-semibold">ملاحظة الشحن: </span>
                  <span>{returnDetails.secondaryReason}</span>
                </div>
              )}
            </div>
          )}

          {/* Confirmation & Assignment Info */}
          {showConfirmationDistributionCard && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t("orderDetails.confirmAndDistributionData")}
              </h3>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("orderDetails.confirmationStatus")}
                </span>
                <span className="font-semibold">{confirmationStatusLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("orderDetails.confirmationDate")}
                </span>
                <span>{formatOptionalDate(order.confirmedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("orderDetails.confirmedBy")}
                </span>
                <span>{confirmedByName || "—"}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3" />
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("orderDetails.distributionStatus")}
                </span>
                <span className="font-semibold">{assignmentStatusLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("orderDetails.distributedToLabel")}
                </span>
                <span>{assignedToName || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("orderDetails.distributionMethod")}
                </span>
                <span>{order.assignmentStrategy || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("orderDetails.distributionDate")}
                </span>
                <span>{formatOptionalDate(order.assignedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("orderDetails.distributedByLabel")}
                </span>
                <span>{assignedByName || "—"}</span>
              </div>
              {order.confirmationNotes && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 text-sm">
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">
                    {t("orderDetails.confirmationNotesLabel")}
                  </span>
                  <p className="text-gray-800 dark:text-gray-200">
                    {order.confirmationNotes}
                  </p>
                </div>
              )}
            </div>
            </div>
          )}

          {/* Order Activity Log */}
          <OrderActivityLog
            order={{
              ...order,
              statusHistory: order.statusHistory || [],
              orderNotes: orderNotes,
            }}
            onAddNote={addNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            addingNote={false}
            updatingNote={updatingNote}
            deletingNote={deletingNote}
            canAddNote={!isMerchant}
            currentUserId={user?.id}
            statusNameMap={statusNameMap}
          />

          {/* Scheduled Order Info */}
          {order.isScheduled && order.scheduledDeliveryDate && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-orange-600 dark:text-orange-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t("orderDetails.scheduledSectionTitle")}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                            {t("orderDetails.scheduledDeliveryDateLabel")}
                          </span>
                        <span
                          className="text-sm font-medium text-gray-900 dark:text-gray-100"
                          dir="ltr"
                        >
                          {new Date(
                            order.scheduledDeliveryDate,
                          ).toLocaleDateString("ar-EG", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                            {t("orderDetails.deliveryTimeLabel")}
                          </span>
                        <span
                          className="text-sm font-medium text-gray-900 dark:text-gray-100"
                          dir="ltr"
                        >
                          {new Date(
                            order.scheduledDeliveryDate,
                          ).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </div>

                    {order.scheduledNotes && (
                      <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                          <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                            {t("orderDetails.scheduledNotesLabel")}
                          </span>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {order.scheduledNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {order.autoTransitionEnabled && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 px-3">
                    <svg
                      className="h-4 w-4 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      {t("orderDetails.autoTransitionText")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SimplifiedProductSelectionModal
        isOpen={canEditOrderDetails && showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductSelected={handleProductSelect}
      />

      {/* Status Modal */}
      {showStatusModal && canUpdateOrderStatus && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 backdrop-blur-sm transition-opacity"
              onClick={() => setShowStatusModal(false)}
            />

            {/* Modal Content */}
            <div className="relative inline-block align-middle bg-white dark:bg-gray-800 rounded-2xl p-6 text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full border border-gray-100 dark:border-gray-700">
              <div className="relative z-10">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <ArrowPathIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="mt-4 text-center">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {t("orderDetails.updateOrderStatus")}
                  </h3>
                  <div className="mt-6 space-y-4">
                    <div className="text-right">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("orderDetails.selectStatus")}
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="block w-full px-4 py-3 text-base border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 rounded-xl dark:bg-gray-700 dark:text-gray-100"
                      >
                        <option value="">
                          {t("orderDetails.selectStatus")}
                        </option>
                        {filteredStatusOptions.map((status) => {
                          const wfStatus = workflowStatusDefs.find(
                            (ws) => ws.code === status.code,
                          );
                          const hint =
                            wfStatus?.requiresOverride
                              ? t("orderDetails.overrideSuffix")
                              : "";
                          return (
                            <option key={status.code} value={status.code}>
                              {status.name}{hint}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {hasWorkflowRestrictions && (
                      <div className="flex items-center gap-2">
                        <input
                          id="override-checkbox"
                          type="checkbox"
                          checked={isOverride}
                          onChange={(e) => setIsOverride(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <label
                          htmlFor="override-checkbox"
                          className="text-sm text-gray-600 dark:text-gray-400"
                        >
                          {t("orderDetails.overrideCheckboxLabel")}
                        </label>
                      </div>
                    )}
                    <div className="text-right">
                      {isModalCancellationStatus ? (
                        <>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t("orderDetails.cancellationReasonRequiredLabel")}
                          </label>
                          {cancellationReasonOptions.length > 0 ? (
                          <select
                            value={statusNotes}
                            onChange={(event) =>
                              setStatusNotes(event.target.value)
                            }
                            disabled={updating || cancellationReasonOptionsLoading}
                            className="block w-full px-4 py-3 text-sm border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 rounded-xl dark:bg-gray-700 dark:text-gray-100 mb-3"
                          >
                            <option value="">{t("orderDetails.selectCancellationReason")}</option>
                            {cancellationReasonOptions.map((reason) => (
                              <option key={reason.id} value={reason.reason}>
                                {reason.reason}
                              </option>
                            ))}
                          </select>
                          ) : (
                            <textarea
                              value={statusNotes}
                              onChange={(e) => setStatusNotes(e.target.value)}
                              rows={2}
                              className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 mb-3"
                              placeholder={t("orderDetails.cancellationReasonPlaceholder2")}
                            />
                          )}
                          {cancellationReasonOptionsLoading && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              {t("orderDetails.loadingReasons")}
                            </p>
                          )}
                          <p className="text-xs text-red-600 dark:text-red-300 mb-3">
                            {t("orderDetails.cancellationReasonHelp")}
                          </p>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t("orderDetails.additionalNotesLabel")}
                          </label>
                          <textarea
                            value={cancellationAdditionalNotes}
                            onChange={(e) => setCancellationAdditionalNotes(e.target.value)}
                            rows={2}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                            placeholder={t("orderDetails.additionalNotesPlaceholder")}
                          />
                        </>
                      ) : isModalReturnStatus ? (
                        <>
                          <label className="block text-sm font-medium text-rose-800 dark:text-rose-300 mb-1">
                            {t("orderDetails.selectReturnReason", { defaultValue: "سبب المرتجع (اختر من الأسباب الشائعة)" })}
                          </label>
                          <select
                            value={returnReason}
                            onChange={(e) => {
                              const val = e.target.value;
                              setReturnReason(val);
                              if (val && val !== "other") {
                                setStatusNotes(val);
                              }
                            }}
                            disabled={updating}
                            className="block w-full px-4 py-3 text-sm border-gray-300 dark:border-gray-600 focus:ring-rose-500 focus:border-rose-500 rounded-xl dark:bg-gray-700 dark:text-gray-100 mb-3"
                          >
                            <option value="">{t("orderDetails.chooseReturnReason", { defaultValue: "-- اختر سبب المرتجع --" })}</option>
                            {COMMON_RETURN_REASONS.map((reasonText, idx) => (
                              <option key={idx} value={reasonText}>
                                {reasonText}
                              </option>
                            ))}
                            <option value="other">{t("orderDetails.otherReason", { defaultValue: "سبب آخر (كتابة مخصصة)" })}</option>
                          </select>

                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t("orderDetails.returnReasonDetails", { defaultValue: "نص سبب المرتجع بالتفصيل" })}
                          </label>
                          <textarea
                            value={statusNotes}
                            onChange={(e) => setStatusNotes(e.target.value)}
                            rows={2}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-700 dark:text-gray-100 mb-3"
                            placeholder={t("orderDetails.returnReasonPlaceholder", { defaultValue: "اكتب سبب إرجاع الطلب بالتفصيل هنا..." })}
                          />

                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t("orderDetails.additionalNotesLabel", { defaultValue: "ملاحظات إضافية (اختياري)" })}
                          </label>
                          <textarea
                            value={returnAdditionalNotes}
                            onChange={(e) => setReturnAdditionalNotes(e.target.value)}
                            rows={2}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                            placeholder={t("orderDetails.additionalNotesPlaceholder", { defaultValue: "أي ملاحظات إضافية..." })}
                          />
                        </>
                      ) : (
                        <>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t("orderDetails.notesOptional")}
                          </label>
                          <textarea
                            value={statusNotes}
                            onChange={(e) => setStatusNotes(e.target.value)}
                            rows={3}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                            placeholder={t("orderDetails.notesPlaceholder")}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                  onClick={onUpdateStatus}
                  disabled={
                    updating ||
                    !newStatus ||
                    (isModalCancellationStatus && !statusNotes.trim()) ||
                    (isModalReturnStatus && !returnReason.trim() && !statusNotes.trim())
                  }
                >
                  {updating
                    ? t("orderDetails.updating")
                    : t("orderDetails.updateStatusButton")}
                </button>
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-xl bg-white dark:bg-gray-700 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                  onClick={() => setShowStatusModal(false)}
                >
                  {t("orderDetails.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && canUpdatePaymentStatus && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 backdrop-blur-sm transition-opacity"
              onClick={() => setShowPaymentModal(false)}
            />

            {/* Modal Content */}
            <div className="relative inline-block align-middle bg-white dark:bg-gray-800 rounded-2xl p-6 text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full border border-gray-100 dark:border-gray-700">
              <div className="relative z-10">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CreditCardIcon className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <div className="mt-4 text-center">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {t("orderDetails.updatePaymentStatus")}
                  </h3>
                  <div className="mt-6 space-y-4">
                    <div className="text-right">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("orderDetails.selectStatus")}
                      </label>
                      <select
                        value={newPaymentStatus}
                        onChange={(e) => setNewPaymentStatus(e.target.value)}
                        className="block w-full px-4 py-3 text-base border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 rounded-xl dark:bg-gray-700 dark:text-gray-100"
                      >
                        <option value="">
                          {t("orderDetails.selectStatus")}
                        </option>
                        {paymentStatuses.map((status) => (
                          <option key={status.code} value={status.code}>
                            {status.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-right">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("orderDetails.notesOptional")}
                      </label>
                      <textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        rows={3}
                        className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        placeholder={t("orderDetails.notesPlaceholder")}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-all disabled:opacity-50"
                  onClick={onUpdatePaymentStatus}
                  disabled={updating || !newPaymentStatus}
                >
                  {updating
                    ? t("orderDetails.updating")
                    : t("orderDetails.updatePaymentButton")}
                </button>
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-xl bg-white dark:bg-gray-700 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                  onClick={() => setShowPaymentModal(false)}
                >
                  {t("orderDetails.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Confirmation Modal for Cancellation */}
      <ConfirmationModal
        isOpen={showCancelShipmentModal}
        onClose={() => setShowCancelShipmentModal(false)}
        onConfirm={async () => {
          const success = await cancelShipment();
          if (success) setShowCancelShipmentModal(false);
        }}
        title={t("orderDetails.cancelShipment")}
        message={t("orderDetails.cancelShipmentConfirm")}
        confirmText={t("orderDetails.yesCancelShipment")}
        cancelText={t("orderDetails.goBack")}
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
        title={t("orderDetails.unlinkTurboShipment")}
        message={t("orderDetails.unlinkTurboShipmentConfirm")}
        confirmText={t("orderDetails.yesUnlinkTurboShipment")}
        cancelText={t("orderDetails.goBack")}
        isDangerous={false}
        isLoading={turboLoading}
      />

      {/* Confirmation Modal for Turbo Recreate */}
      <ConfirmationModal
        isOpen={showRecreateShipmentModal}
        onClose={() => setShowRecreateShipmentModal(false)}
        onConfirm={handleRecreateShipment}
        title={t("orderDetails.recreateShipmentTitle")}
        message={t("orderDetails.recreateShipmentMessage")}
        confirmText={t("orderDetails.recreateShipmentConfirm")}
        cancelText={t("orderDetails.goBack")}
        isDangerous={false}
        isLoading={turboLoading}
      />
    </div>
  );
};

export default OrderDetails;

interface WalletPaymentProof {
  imageUrl?: string;
  walletNumber?: string;
  transferRef?: string;
  status?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectReason?: string;
}

const WalletPaymentProofCard: React.FC<{
  proof: WalletPaymentProof;
  onVerify: (action: "VERIFY" | "REJECT", reason?: string) => Promise<boolean>;
}> = ({ proof, onVerify }) => {
  const status = String(proof.status || "PENDING").toUpperCase();
  const statusLabel =
    status === "VERIFIED"
      ? "✅ تم التحقق"
      : status === "REJECTED"
        ? "❌ مرفوض"
        : "⏳ بانتظار المراجعة";
  const statusCls =
    status === "VERIFIED"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
      : status === "REJECTED"
        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          إثبات الدفع بالمحفظة
        </span>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCls}`}>
          {statusLabel}
        </span>
      </div>

      {proof.imageUrl ? (
        <a href={proof.imageUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <img src={proof.imageUrl} alt="إيصال التحويل" className="max-h-48 w-full object-cover" />
        </a>
      ) : null}

      <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-200">
        {proof.walletNumber ? (
          <div className="flex justify-between gap-2">
            <span className="text-gray-500 dark:text-gray-400">رقم المحفظة</span>
            <span dir="ltr" className="font-semibold">{proof.walletNumber}</span>
          </div>
        ) : null}
        {proof.transferRef ? (
          <div className="flex justify-between gap-2">
            <span className="text-gray-500 dark:text-gray-400">رقم العملية</span>
            <span className="font-semibold">{proof.transferRef}</span>
          </div>
        ) : null}
        {proof.submittedAt ? (
          <div className="flex justify-between gap-2">
            <span className="text-gray-500 dark:text-gray-400">تاريخ الرفع</span>
            <span className="font-semibold">{new Date(proof.submittedAt).toLocaleString("ar-EG")}</span>
          </div>
        ) : null}
        {proof.rejectReason ? (
          <div className="mt-1 rounded-md bg-red-50 dark:bg-red-950/20 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-300">
            سبب الرفض: {proof.rejectReason}
          </div>
        ) : null}
      </div>

      {status === "PENDING" ? (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => void onVerify("VERIFY")}
            className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            تأكيد الدفع
          </button>
          <button
            onClick={() => {
              const reason = window.prompt("اكتب سبب الرفض (اختياري)");
              if (reason !== null) void onVerify("REJECT", reason || undefined);
            }}
            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            رفض
          </button>
        </div>
      ) : null}
    </div>
  );
};
