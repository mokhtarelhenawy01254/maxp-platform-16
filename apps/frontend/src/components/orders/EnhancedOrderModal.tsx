import React, { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PrinterIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
  CalculatorIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../hooks/useCurrency";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { cancellationService, CancellationReason } from "../../services/cancellationService";
import { useAuth } from "../../hooks/useAuthSimple";
import type { OrderDetailsType } from "../../pages/orders/types";
import { Link } from "react-router-dom";
import OrderPartnerOperationsCard from "./OrderPartnerOperationsCard";

interface StatusOption {
  code: string;
  name: string;
  color?: string;
  icon?: string;
}

interface EnhancedOrderModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdate?: (updatedOrder: any) => void;
  canManagePaymentStatus?: boolean;
  orderStatuses?: StatusOption[];
}

const isCancellationStatus = (status?: string | null) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  return normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";
};

const EnhancedOrderModal: React.FC<EnhancedOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onOrderUpdate,
  canManagePaymentStatus = true,
  orderStatuses,
}) => {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"details" | "update" | "history">(
    "details",
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCancellationStatus, setPendingCancellationStatus] = useState<
    string | null
  >(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationReasonOptions, setCancellationReasonOptions] = useState<
    CancellationReason[]
  >([]);
  const [cancellationReasonOptionsLoading, setCancellationReasonOptionsLoading] =
    useState(false);
  const [cancellationAdditionalNotes, setCancellationAdditionalNotes] = useState("");
  const [isOverride, setIsOverride] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const fallbackStatuses: StatusOption[] = [
    { code: "PENDING", name: "Ù‚ÙŠØ¯ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±" },
    { code: "CONFIRMED", name: "Ù…Ø¤ÙƒØ¯" },
    { code: "ON_HOLD", name: "Ù…Ø¹Ù„Ù‚" },
    { code: "PROCESSING", name: "Ù‚ÙŠØ¯ Ø§Ù„ØªØ¬Ù‡ÙŠØ²" },
    { code: "SHIPPED", name: "ØªÙ… Ø§Ù„Ø´Ø­Ù†" },
    { code: "DELIVERED", name: "ØªÙ… Ø§Ù„ØªØ³Ù„ÙŠÙ…" },
    { code: "CANCELLED", name: "Ù…Ù„ØºÙŠ" },
    { code: "REFUNDED", name: "Ù…Ø³ØªØ±Ø¯" },
    { code: "PARTIALLY_REFUNDED", name: "Ù…Ø³ØªØ±Ø¯ Ø¬Ø²Ø¦ÙŠØ§Ù‹" },
  ];

  const normalizeItems = (rawItems: any): any[] => {
    if (!rawItems) return [];
    let items = rawItems;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (e) {
        return [];
      }
    }
    if (!Array.isArray(items)) return [];

    return items.map((item: any) => {
      const price = parseFloat(item.price ?? item.unitPrice ?? 0);
      const quantity = parseInt(item.quantity ?? 1);
      const safePrice = Number.isFinite(price) ? price : 0;
      const safeQuantity =
        Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      return {
        ...item,
        productName:
          item.productName ||
          item.name ||
          item.product?.name ||
          "Ù…Ù†ØªØ¬ ØºÙŠØ± Ù…Ø­Ø¯Ø¯",
        name:
          item.name ||
          item.productName ||
          item.product?.name ||
          "Ù…Ù†ØªØ¬ ØºÙŠØ± Ù…Ø­Ø¯Ø¯",
        price: safePrice,
        quantity: safeQuantity,
        total:
          Number.isFinite(parseFloat(item.total))
            ? parseFloat(item.total)
            : safePrice * safeQuantity,
        productColor:
          item.productColor ||
          item.color ||
          item.metadata?.color ||
          item.metadata?.productColor,
        productSize:
          item.productSize ||
          item.size ||
          item.metadata?.size ||
          item.metadata?.productSize,
      };
    });
  };

  const resolvedItems =
    normalizeItems(order?.items) ||
    (Array.isArray(order?.items) ? order.items : []);
  const fallbackItems = normalizeItems(order?.orderItems);
  const displayItems =
    resolvedItems && resolvedItems.length > 0 ? resolvedItems : fallbackItems;
  const isGuestOrder = Boolean(order?.metadata?.isGuestOrder);
  const normalizedPaymentStatus = (
    order?.paymentStatus ||
    (isGuestOrder ? "unavailable" : "pending")
  ).toLowerCase();
  const merchantOrderContext =
    order?.metadata?.merchantOrder || order?.merchantOrder || null;
  const isMerchantScopedOrder = Boolean(
    order?.metadata?.merchantScope || merchantOrderContext,
  );
  const merchantFulfillmentSource = String(
    merchantOrderContext?.fulfillmentSource ||
      order?.metadata?.merchantScope?.fulfillmentSource ||
      "",
  ).toUpperCase();
  const canManageOrderStatus = !isMerchantScopedOrder;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setPendingCancellationStatus(null);
      setCancellationReason("");
      setError(null);
      setActiveTab("details");
    }
  }, [isOpen, order?.orderNumber]);

  useEffect(() => {
    if (!isOpen || !pendingCancellationStatus) {
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
      .catch((loadError) => {
        console.error("Failed to load cancellation reason presets:", loadError);
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
  }, [isOpen, pendingCancellationStatus]);

  const handleUpdateStatus = async (newStatus: string, notes = "") => {
    const normalizedStatus = String(newStatus || "").trim().toUpperCase();
    const trimmedNotes = String(notes || "").trim();

    if (isCancellationStatus(normalizedStatus) && !trimmedNotes) {
      setError(t("orders.cancellationReasonRequired"));
      return false;
    }

    try {
      setIsUpdating(true);
      setError(null);
      const response = await apiClient.post(
        `/orders-new/simple/${order.orderNumber}/status`,
        {
          status: normalizedStatus,
          notes: trimmedNotes,
          isOverride,
        },
      );

      if (response.data.success) {
        const updatedOrder = {
          ...order,
          status: normalizedStatus.toLowerCase(),
          notes: trimmedNotes || order.notes,
        };
        if (response.data.data?.workflowStatus !== "pending" && onOrderUpdate) {
          onOrderUpdate(updatedOrder);
        }
        return true;
      } else {
        setError(response.data.message || t("orders.statusUpdateFailed"));
        return false;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("orders.updateError"));
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusSelect = (newStatus: string) => {
    if (!canManageOrderStatus) {
      setError(t("orders.merchantFulfillmentReadOnly"));
      return;
    }

    const normalizedStatus = String(newStatus || "").trim().toUpperCase();
    if (!normalizedStatus) return;

    if (isCancellationStatus(normalizedStatus)) {
      setPendingCancellationStatus(normalizedStatus);
      setCancellationReason("");
      setError(null);
      return;
    }

    setPendingCancellationStatus(null);
    setCancellationReason("");
    void handleUpdateStatus(normalizedStatus);
  };

  const handleUpdatePaymentStatus = async (newStatus: string) => {
    if (isGuestOrder || !canManagePaymentStatus) {
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);
      const response = await apiClient.post(
        `/orders-new/simple/${order.orderNumber}/payment-status`,
        {
          paymentStatus: newStatus,
        },
      );

      if (response.data.success) {
        const updatedOrder = {
          ...order,
          paymentStatus: newStatus.toLowerCase(),
        };
        if (onOrderUpdate) {
          onOrderUpdate(updatedOrder);
        }
      } else {
        setError(
          response.data.message || t("orders.paymentStatusUpdateFailed"),
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("orders.paymentUpdateError"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrintInvoice = async () => {
    try {
      setIsPrinting(true);
      setError(null);
      // ÙØªØ­ Ù†Ø§ÙØ°Ø© Ø§Ù„Ø·Ø¨Ø§Ø¹Ø© ÙÙˆØ±Ø§Ù‹ Ø¶Ù…Ù† ØªÙØ§Ø¹Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ù„ØªØ¬Ù†Ø¨ Ø­Ø¬Ø¨Ù‡Ø§ Ø¨ÙˆØ§Ø³Ø·Ø© Ù…Ø§Ù†Ø¹ Ø§Ù„Ù†ÙˆØ§ÙØ° Ø§Ù„Ù…Ù†Ø¨Ø«Ù‚Ø©
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        setError(
          t("orders.invoiceError") ||
            "Error generating invoice",
        );
        return;
      }
      const response = await apiClient.post("/order-invoices/bulk-generate", {
        orderIds: [order.orderNumber],
      });

      if (response.data.success && response.data.data.invoices?.length > 0) {
        const invoice = response.data.data.invoices[0];
        printWindow.location.href = `/orders/invoices/print-multiple?ids=${invoice.id}`;
      } else if (response.data.success && response.data.data.guestOrders?.length > 0) {
        // Ø·Ù„Ø¨ Ø¶ÙŠÙ ÙØ±Ø¯ÙŠ: Ø§Ø¹Ø±Ø¶Ù‡ ÙÙŠ ØµÙØ­Ø© print-multiple Ø§Ù„Ù…ÙˆØ­Ù‘Ø¯Ø© (Ù†ÙØ³ Ø´Ø±ÙŠØ· Ø§Ù„ØªÙ‚Ø³ÙŠÙ… ÙˆØ§Ù„Ø£ÙƒÙˆØ§Ø¯)
        const { storeGuestPrintPayload } = await import("../../pages/orders/PrintMultipleInvoices");
        const guestKey = storeGuestPrintPayload({
          company: {
            companyName: user?.company?.name || "",
            companyPhone: user?.company?.phone || null,
            companyLogo: user?.company?.logo || null,
          },
          orders: response.data.data.guestOrders.map(
            (entry: { order: OrderDetailsType }) => entry.order as unknown as Parameters<typeof storeGuestPrintPayload>[0]["orders"][number],
          ),
        });
        printWindow.location.href = `/orders/invoices/print-multiple?guestKey=${encodeURIComponent(guestKey)}`;
      } else {
        printWindow.close();
        setError(
          t("orders.invoiceGenerationFailed") || "Failed to generate invoice",
        );
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          t("orders.invoiceError") ||
          "Error generating invoice",
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const getCustomerDisplayName = () => {
    if (order.customer) {
      const fullName =
        `${order.customer.firstName} ${order.customer.lastName}`.trim();
      if (
        fullName !== "New Customer" &&
        fullName !== "Customer Not Specified" &&
        fullName !== "Customer"
      ) {
        return fullName;
      }
    }

    if (order.customerName && !order.customerName.match(/^\d+/)) {
      return order.customerName;
    }

    if (order.customerName && order.customerName.match(/^\d+/)) {
      return `${t("orders.facebookCustomer")} (${order.customerName.substring(0, 8)}...)`;
    }

    return t("orders.notSpecifiedCustomer");
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "text-muted-foreground";

    if (confidence >= 0.8) return "text-success";
    if (confidence >= 0.6) return "text-warning";
    return "text-destructive";
  };

  const [governments, setGovernments] = useState<any[]>([]);

  useEffect(() => {
    const fetchGovernments = async () => {
      try {
        const response = await apiClient.get("/turbo/governments");
        if (response.data.success && response.data.data?.governments) {
          setGovernments(response.data.data.governments);
        }
      } catch (error) {
        console.error("Failed to fetch governments in modal:", error);
      }
    };
    if (isOpen) {
      fetchGovernments();
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const renderSectionHeader = (icon: React.ReactNode, title: string) => (
    <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5 text-xs">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      {title}
    </h4>
  );

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return <InformationCircleIcon className="h-4 w-4" />;

    if (confidence >= 0.8) return <StarIcon className="h-4 w-4" />;
    return <ExclamationTriangleIcon className="h-4 w-4" />;
  };

  const getLocationDisplayName = (val: any) => {
    if (!val) return null;

    // Check if it's a numeric ID for governorates
    const numId = parseInt(String(val));
    if (!isNaN(numId) && governments.length > 0) {
      const found = governments.find((g) => g.id === numId);
      if (found) return found.name;
    }

    // Clean numeric prefix (e.g., "2339:Cairo")
    return String(val).replace(/^\d+:/, "").trim();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-slate-950/55 backdrop-blur-md dark:bg-slate-950/75 sm:p-4 overscroll-contain modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative flex max-h-[calc(100vh-0.5rem)] flex-col overflow-hidden rounded-t-[28px] border border-slate-200/70 bg-white/96 shadow-2xl dark:border-slate-700/70 dark:bg-slate-900/96 sm:max-h-[calc(100vh-2rem)] sm:rounded-[24px] modal-panel"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600 sm:hidden" />
        <div className="flex-1 overflow-y-auto px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4 sm:pt-3">
          <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShoppingBagIcon className="h-4 w-4" />
              </span>
              <div>
                <h3
                  id="modal-title"
                  className="text-base font-black text-foreground leading-tight"
                >
                  {t("orders.orderDetails")}
                </h3>
                <p className="text-[11px] font-medium text-muted-foreground leading-tight" dir="ltr">
                  #{order.orderNumber}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={String(t("orders.close"))}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label={t("orders.detailTabs.update")}
            className="flex items-center gap-0.5 rounded-xl border border-border/60 bg-card/40 p-0.5 backdrop-blur-sm"
          >
            {(
              [
                { key: "details", icon: UserCircleIcon },
                { key: "update", icon: PencilSquareIcon },
                { key: "history", icon: ClipboardDocumentListIcon },
              ] as const
            ).map(({ key, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tab-panel-${key}`}
                  onClick={() => setActiveTab(key)}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {t(`orders.detailTabs.${key}`)}
                </button>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Tab: Details */}
          {activeTab === "details" && (
            <>
          {/* Customer Info */}
          <div>
            {renderSectionHeader(
              <UserCircleIcon className="h-3.5 w-3.5" />,
              t("orders.customerInfo"),
            )}
            <div className="bg-card/60 border border-border/60 rounded-xl p-2.5 backdrop-blur-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block leading-none mb-0.5">
                    {t("orders.name")}
                  </span>
                  <span className="text-sm text-foreground font-semibold leading-tight">
                    {getCustomerDisplayName()}
                  </span>
                </div>
                {order.customerPhone && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block leading-none mb-0.5">
                      {t("orders.phone")}
                    </span>
                    <span
                      className="text-sm text-foreground font-semibold leading-tight"
                      dir="ltr"
                    >
                      {order.customerPhone}
                    </span>
                  </div>
                )}
                {(order.governorate || order.shippingAddress?.governorate) && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block leading-none mb-0.5">
                      {t("orders.governorate")}
                    </span>
                    <span className="text-sm text-foreground font-semibold leading-tight">
                      {getLocationDisplayName(
                        order.governorate || order.shippingAddress?.governorate,
                      )}
                    </span>
                  </div>
                )}
                {(order.city || order.shippingAddress?.city) && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block leading-none mb-0.5">
                      {t("orders.city")}
                    </span>
                    <span className="text-sm text-foreground font-semibold leading-tight">
                      {getLocationDisplayName(
                        order.city || order.shippingAddress?.city,
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            {renderSectionHeader(
              <ClipboardDocumentListIcon className="h-3.5 w-3.5" />,
              t("orders.products"),
            )}
            <div className="bg-card/60 border border-border/60 rounded-xl overflow-hidden max-h-48 overflow-y-auto backdrop-blur-sm">
              {!displayItems || displayItems.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t("orders.noProducts")}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayItems.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm leading-tight mb-0.5">
                            {item.productName ||
                              item.name ||
                              t("orders.productNotSpecified")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("orders.quantity")}: {item.quantity}
                          </p>
                          {(item.productColor ||
                            item.productSize ||
                            item.metadata?.color ||
                            item.metadata?.size) && (
                            <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                              {(item.productColor || item.metadata?.color) && (
                                <span>
                                  🎨 {item.productColor || item.metadata?.color}
                                </span>
                              )}
                              {(item.productSize || item.metadata?.size) && (
                                <span>
                                  📏 {item.productSize || item.metadata?.size}
                                </span>
                              )}
                            </div>
                          )}
                          {(item.confidence || item.metadata?.confidence) && (
                            <div
                              className={`flex items-center mt-2 ${getConfidenceColor(item.confidence || item.metadata?.confidence)}`}
                            >
                              {getConfidenceIcon(
                                item.confidence || item.metadata?.confidence,
                              )}
                              <span className="text-xs ml-1 font-medium">
                                {t("orders.confidence")}:{" "}
                                {(
                                  (item.confidence ||
                                    item.metadata?.confidence) * 100
                                ).toFixed(0)}
                                %
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground text-sm">
                            {formatPrice(
                              item.total || item.price * item.quantity,
                            )}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatPrice(item.price)} / {t("orders.unit")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <OrderPartnerOperationsCard
            affiliate={order?.affiliate || null}
            className="mt-4"
            compact
            merchantOrder={merchantOrderContext}
          />

          {/* Order Summary */}
          <div>
            {renderSectionHeader(
              <CalculatorIcon className="h-3.5 w-3.5" />,
              t("orders.orderSummary"),
            )}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 backdrop-blur-sm">
              <div className="space-y-2">
                <div className="flex justify-between text-foreground">
                  <span>{t("orders.subtotal")}:</span>
                  <span className="font-medium">
                    {formatPrice(order.subtotal || 0)}
                  </span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-foreground">
                    <span>{t("orders.tax")}:</span>
                    <span className="font-medium">
                      {formatPrice(order.tax)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-foreground">
                  <span>{t("orders.shipping")}:</span>
                  <span className="font-medium">
                    {formatPrice(order.shipping || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-primary/30 text-base font-bold text-foreground">
                  <span>{t("orders.total")}:</span>
                  <span className="text-primary">
                    {formatPrice(order.total || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
            </>
          )}

          {/* Tab: Update */}
          {activeTab === "update" && (
          <div>
            {renderSectionHeader(
              <PencilSquareIcon className="h-3.5 w-3.5" />,
              t("orders.updateOrder"),
            )}
            {renderSectionHeader(
              <PencilSquareIcon className="h-3.5 w-3.5" />,
              t("orders.updateOrder"),
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-card/60 border border-border/60 rounded-xl p-2.5 backdrop-blur-sm">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("orders.orderStatus")}
                </label>
                <select
                  value={(
                    pendingCancellationStatus ||
                    order.status ||
                    "PENDING"
                  ).toUpperCase()}
                  onChange={(e) => handleStatusSelect(e.target.value)}
                  disabled={isUpdating || !canManageOrderStatus}
                  className="theme-native-control w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {(orderStatuses && orderStatuses.length > 0 ? orderStatuses : fallbackStatuses).map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="override-checkbox-modal"
                    type="checkbox"
                    checked={isOverride}
                    onChange={(e) => setIsOverride(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-warning focus:ring-warning"
                  />
                  <label
                    htmlFor="override-checkbox-modal"
                    className="text-sm text-muted-foreground"
                  >
                    {t("orders.overridePathRules")}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("orders.paymentStatus")}
                </label>
                {isGuestOrder || !canManagePaymentStatus ? (
                  <div className="w-full px-3 py-2 border border-input rounded-lg bg-muted/50 text-muted-foreground">
                    {isGuestOrder ? t("orders.notSpecified") : t("orders.manageCompanyOnly")}
                  </div>
                ) : (
                  <select
                    value={normalizedPaymentStatus}
                    onChange={(e) => handleUpdatePaymentStatus(e.target.value)}
                    disabled={isUpdating}
                    className="theme-native-control w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <option value="pending">{t("orders.pendingPayment")}</option>
                    <option value="completed">{t("orders.completed")}</option>
                    <option value="failed">{t("orders.failed")}</option>
                  </select>
                )}
              </div>
              {pendingCancellationStatus && (
                <div className="sm:col-span-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5">
                  <label className="block text-sm font-medium text-destructive mb-2">
                    {t("orders.cancelReasonTitle")} <span className="text-destructive">*</span>
                  </label>
                  {cancellationReasonOptions.length > 0 ? (
                    <select
                      value={cancellationReason}
                      onChange={(e) => {
                        setCancellationReason(e.target.value);
                        setError(null);
                      }}
                      disabled={isUpdating || cancellationReasonOptionsLoading}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-destructive focus:ring-2 focus:ring-destructive/20 disabled:opacity-60 mb-3"
                    >
                      <option value="">{t("orders.cancelReasonSelect")}</option>
                      {cancellationReasonOptions.map((reason) => (
                        <option key={reason.id} value={reason.reason}>
                          {reason.reason}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      rows={2}
                      disabled={isUpdating}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-destructive focus:ring-2 focus:ring-destructive/20 disabled:opacity-60 mb-3"
                      placeholder={t("orders.cancelReasonPlaceholder")}
                    />
                  )}
                  {cancellationReasonOptionsLoading ? (
                    <p className="mb-2 text-xs text-destructive/80">
                      {t("orders.cancelLoadingReasons")}
                    </p>
                  ) : null}
                  <label className="block text-sm font-medium text-destructive mb-1">
                    {t("orders.cancelAdditionalNotes")} <span className="text-destructive/60">({t("orders.cancelAdditionalNotesOptional")})</span>
                  </label>
                  <textarea
                    value={cancellationAdditionalNotes}
                    onChange={(e) => setCancellationAdditionalNotes(e.target.value)}
                    rows={2}
                    disabled={isUpdating}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-destructive focus:ring-2 focus:ring-destructive/20 disabled:opacity-60"
                    placeholder={t("orders.cancelAdditionalNotesPlaceholder")}
                  />
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
                    <button
                      type="button"
                      disabled={isUpdating || !cancellationReason.trim()}
                      onClick={async () => {
                        const notesToSend = cancellationAdditionalNotes.trim()
                          ? cancellationReason.trim() + '\n' + cancellationAdditionalNotes.trim()
                          : cancellationReason.trim();
                        const success = await handleUpdateStatus(
                          pendingCancellationStatus,
                          notesToSend,
                        );
                        if (success) {
                          setPendingCancellationStatus(null);
                          setCancellationReason("");
                          setCancellationAdditionalNotes("");
                        }
                      }}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("orders.confirmCancellation")}
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => {
                        setPendingCancellationStatus(null);
                        setCancellationReason("");
                        setCancellationAdditionalNotes("");
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      {t("orders.keepCurrentStatus")}
                    </button>
                  </div>
                </div>
              )}
              {!canManageOrderStatus && (
                <div className="sm:col-span-2 rounded-xl border border-warning/30 bg-warning/5 p-2.5 text-xs font-medium text-warning-foreground">
                  {t("orders.merchantFulfillmentNotice")}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Tab: History */}
          {activeTab === "history" && (
          <>
          {/* Conversation Link */}
          {order.conversationId && (
            <div>
              {renderSectionHeader(
                <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />,
                t("orders.conversation"),
              )}
              <div className="bg-card/60 border border-border/60 rounded-2xl p-3 backdrop-blur-sm">
                <button
                  onClick={() => {
                    const isWhatsApp =
                      order.conversation?.channel === "whatsapp" ||
                      order.extractionMethod?.includes("whatsapp") ||
                      order.sourceType === "whatsapp";
                    const url = isWhatsApp
                      ? `/whatsapp?conversation=${order.conversationId}`
                      : `/facebook-inbox?conversation=${order.conversationId}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  {t("orders.viewConversation")}
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div>
              {renderSectionHeader(
                <DocumentTextIcon className="h-3.5 w-3.5" />,
                t("orders.notes"),
              )}
              <div className="bg-warning/5 border border-warning/20 rounded-2xl p-3 backdrop-blur-sm">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {order.notes}
                </p>
              </div>
            </div>
          )}

          {/* Empty state when no history items */}
          {!order.conversationId && !order.notes && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/30 py-10 text-center">
              <ClipboardDocumentListIcon className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                {t("orders.noHistoryItems") || "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª Ø¨Ø¹Ø¯"}
              </p>
            </div>
          )}
          </>
          )}

          {/* Action Buttons removed — moved to sticky footer below */}
        </div>
      </div>
        {/* Sticky Bottom Action Bar */}
        <div className="sticky bottom-0 z-10 flex flex-col gap-1.5 border-t border-border/60 bg-background/90 px-3 py-2 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handlePrintInvoice}
              disabled={isPrinting}
              className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-success/90 disabled:opacity-50"
            >
              <PrinterIcon className="h-4 w-4" />
              {isPrinting ? t("orders.printing") : t("orders.printInvoice")}
            </button>
            <Link
              to={`/orders/${encodeURIComponent(String(order.orderNumber || ""))}`}
              className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ShoppingBagIcon className="h-4 w-4" />
              {t("orders.viewFullDetails")}
            </Link>
          </div>
          <button
            onClick={onClose}
            className="inline-flex min-h-[36px] w-full items-center justify-center rounded-lg border border-border bg-background px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            {t("orders.close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedOrderModal;



