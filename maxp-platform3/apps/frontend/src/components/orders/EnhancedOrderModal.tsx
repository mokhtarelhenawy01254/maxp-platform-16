import React, { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PrinterIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../hooks/useCurrency";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { cancellationService, CancellationReason } from "../../services/cancellationService";
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
    { code: "PENDING", name: "قيد الانتظار" },
    { code: "CONFIRMED", name: "مؤكد" },
    { code: "ON_HOLD", name: "معلق" },
    { code: "PROCESSING", name: "قيد التجهيز" },
    { code: "SHIPPED", name: "تم الشحن" },
    { code: "DELIVERED", name: "تم التسليم" },
    { code: "CANCELLED", name: "ملغي" },
    { code: "REFUNDED", name: "مسترد" },
    { code: "PARTIALLY_REFUNDED", name: "مسترد جزئياً" },
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
          "منتج غير محدد",
        name:
          item.name ||
          item.productName ||
          item.product?.name ||
          "منتج غير محدد",
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
  const canManageOrderStatus =

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
      setError("الشركة مسؤولة عن تجهيز هذا الطلب، ويمكنك متابعته فقط من هنا");
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
      const response = await apiClient.post("/order-invoices/bulk-generate", {
        orderIds: [order.orderNumber],
      });

      if (response.data.success && response.data.data.invoices?.length > 0) {
        const invoice = response.data.data.invoices[0];
        window.open(
          `/orders/invoices/print-multiple?ids=${invoice.id}`,
          "_blank",
        );
      } else {
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
    if (!confidence) return "text-gray-500";

    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-md dark:bg-slate-950/75 sm:items-center sm:p-4 overscroll-contain"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative flex max-h-[calc(100vh-0.5rem)] w-full flex-col overflow-y-auto rounded-t-[30px] border border-slate-200/70 bg-white/96 shadow-2xl dark:border-slate-700/70 dark:bg-slate-900/96 sm:max-h-[calc(100vh-2rem)] sm:w-11/12 sm:rounded-[28px] md:w-3/5 lg:w-1/2 xl:w-2/5 max-w-3xl"
      >
        <div className="px-4 pb-5 pt-3 sm:px-5">
          <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-300 dark:bg-slate-600 sm:hidden" />
          <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <ShoppingBagIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h3
                id="modal-title"
                className="text-xl font-semibold text-gray-900 dark:text-gray-100"
              >
                {t("orders.orderDetails")} #{order.orderNumber}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label={String(t("orders.close"))}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
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

          {/* Customer Info */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">●</span>
              {t("orders.customerInfo")}
            </h4>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                    {t("orders.name")}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {getCustomerDisplayName()}
                  </span>
                </div>
                {order.customerPhone && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                      {t("orders.phone")}
                    </span>
                    <span
                      className="text-gray-900 dark:text-gray-100 font-medium"
                      dir="ltr"
                    >
                      {order.customerPhone}
                    </span>
                  </div>
                )}
                {(order.governorate || order.shippingAddress?.governorate) && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                      {t("orders.governorate")}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {getLocationDisplayName(
                        order.governorate || order.shippingAddress?.governorate,
                      )}
                    </span>
                  </div>
                )}
                {(order.city || order.shippingAddress?.city) && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                      {t("orders.city")}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
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
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">●</span>
              {t("orders.products")}
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-h-60 overflow-y-auto">
              {!displayItems || displayItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {t("orders.noProducts")}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayItems.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {item.productName ||
                              item.name ||
                              t("orders.productNotSpecified")}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t("orders.quantity")}: {item.quantity}
                          </p>
                          {(item.productColor ||
                            item.productSize ||
                            item.metadata?.color ||
                            item.metadata?.size) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-3">
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
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
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
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">●</span>
              {t("orders.orderSummary")}
            </h4>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>{t("orders.subtotal")}:</span>
                  <span className="font-medium">
                    {formatPrice(order.subtotal || 0)}
                  </span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>{t("orders.tax")}:</span>
                    <span className="font-medium">
                      {formatPrice(order.tax)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>{t("orders.shipping")}:</span>
                  <span className="font-medium">
                    {formatPrice(order.shipping || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t-2 border-blue-300 dark:border-blue-700 text-lg font-bold text-gray-900 dark:text-gray-100">
                  <span>{t("orders.total")}:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {formatPrice(order.total || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Update Status Section */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">●</span>
              {t("orders.updateOrder")}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label
                    htmlFor="override-checkbox-modal"
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    تجاوز قواعد المسار (Override)
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("orders.paymentStatus")}
                </label>
                {isGuestOrder || !canManagePaymentStatus ? (
                  <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {isGuestOrder ? t("orders.notSpecified") : "تدار من صلاحيات الشركة"}
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
                <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
                  <label className="block text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                    سبب الإلغاء <span className="text-red-500">*</span>
                  </label>
                  {cancellationReasonOptions.length > 0 ? (
                    <select
                      value={cancellationReason}
                      onChange={(e) => {
                        setCancellationReason(e.target.value);
                        setError(null);
                      }}
                      disabled={isUpdating || cancellationReasonOptionsLoading}
                      className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-400 focus:ring-2 focus:ring-red-500/20 disabled:opacity-60 dark:border-red-900/60 dark:bg-gray-800 dark:text-gray-100 mb-3"
                    >
                      <option value="">اختر سبب الإلغاء...</option>
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
                      className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-400 focus:ring-2 focus:ring-red-500/20 disabled:opacity-60 dark:border-red-900/60 dark:bg-gray-800 dark:text-gray-100 mb-3"
                      placeholder="سبب الإلغاء..."
                    />
                  )}
                  {cancellationReasonOptionsLoading ? (
                    <p className="mb-2 text-xs text-red-700/80 dark:text-red-200/80">
                      جاري تحميل الأسباب الجاهزة...
                    </p>
                  ) : null}
                  <label className="block text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                    ملاحظة إضافية <span className="text-red-400">(اختياري)</span>
                  </label>
                  <textarea
                    value={cancellationAdditionalNotes}
                    onChange={(e) => setCancellationAdditionalNotes(e.target.value)}
                    rows={2}
                    disabled={isUpdating}
                    className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-400 focus:ring-2 focus:ring-red-500/20 disabled:opacity-60 dark:border-red-900/60 dark:bg-gray-800 dark:text-gray-100"
                    placeholder="أضف ملاحظة إضافية (اختياري)..."
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
                <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  الشركة مسؤولة عن تجهيز هذا الطلب من مخزنها؛ شاشة الطلبات هنا للمتابعة فقط.
                </div>
              )}
            </div>
          </div>

          {/* Conversation Link */}
          {order.conversationId && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400">●</span>
                {t("orders.conversation")}
              </h4>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
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
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
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
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400">●</span>
                {t("orders.notes")}
              </h4>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {order.notes}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handlePrintInvoice}
                disabled={isPrinting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <PrinterIcon className="h-5 w-5" />
                {isPrinting ? t("orders.printing") : t("orders.printInvoice")}
              </button>
              <Link
                to={`/orders/${encodeURIComponent(String(order.orderNumber || ""))}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
              >
                <ShoppingBagIcon className="h-5 w-5" />
                {t("orders.viewFullDetails")}
              </Link>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-gray-200 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 sm:w-auto"
            >
              {t("orders.close")}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default EnhancedOrderModal;
