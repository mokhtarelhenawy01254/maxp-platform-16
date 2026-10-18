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
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import OrderPartnerOperationsCard from "../../components/orders/OrderPartnerOperationsCard";

// Components
import OrderHeader from "./components/OrderHeader";
import OrderDiscountApprovalBanner from "./components/OrderDiscountApprovalBanner";
import OrderItemsCard from "./components/OrderItemsCard";
import OrderDetailsSidebar from "./components/OrderDetailsSidebar";
import OrderReturnCard from "./components/OrderReturnCard";
import TurboShippingPanel from "./components/TurboShippingPanel";
import BostaShippingPanel from "./components/BostaShippingPanel";
import UnifiedShippingCard from "./components/UnifiedShippingCard";
// Cards migrated into OrderDetailsSidebar
import OrderActionModalsContainer from "./components/OrderActionModalsContainer";
import OrderShipmentModals from "./components/OrderShipmentModals";

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
