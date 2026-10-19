import { useMemo, useCallback } from "react";
import type { Order } from "../../../types/orders";
import type { OrdersFilters } from "../ordersFilterTypes";
import { getOrderStatusDisplay, getStatusDisplay } from "../../../utils/statusRegistry";
import { isReturnStatusCode, isTurboReturnStatus } from "../utils/returnHelper";

export interface StatusOptionItem {
  code: string;
  name: string;
  color?: string;
}

export interface UseOrdersStatusDisplaysParams {
  orderStatuses: StatusOptionItem[];
  paymentStatuses: StatusOptionItem[];
  orderStatusMap: Map<string, StatusOptionItem>;
  paymentStatusMap: Map<string, StatusOptionItem>;
  filters: OrdersFilters;
  showIncompleteInOrders: boolean;
  normalizeStatusCode: (code: string) => string;
  t: (key: string, defaultValue?: string) => string;
}

export function useOrdersStatusDisplays({
  orderStatuses,
  paymentStatuses,
  orderStatusMap,
  paymentStatusMap,
  filters,
  showIncompleteInOrders,
  normalizeStatusCode,
  t,
}: UseOrdersStatusDisplaysParams) {
  const getStatusBadgeStyle = useCallback(
    (status: string): React.CSSProperties | undefined => {
      const configuredColor = orderStatusMap.get(
        normalizeStatusCode(status),
      )?.color;

      if (!configuredColor) {
        return undefined;
      }

      return {
        backgroundColor: `${configuredColor}20`,
        color: configuredColor,
        border: `1px solid ${configuredColor}`,
      };
    },
    [orderStatusMap, normalizeStatusCode],
  );

  const getUnifiedStatusDisplay = useCallback(
    (order: Order, translate: (key: string) => string) => {
      const isCarrierReturn = isTurboReturnStatus(order.turboShipmentStatus);
      const display = getOrderStatusDisplay(order);

      if (isCarrierReturn && !isReturnStatusCode(order.status)) {
        const returnLabel = display.secondary?.label
          ? display.secondary.label.replace(/^🚚\s*/, "")
          : "مرتجع بالشركة (تربو)";
        return {
          text: returnLabel,
          labelKey: display.secondary?.labelKey || "orders.turboReturnedToCompany",
          className:
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300",
          style: undefined,
        };
      }

      const effectiveStatusKey =
        (order as any).effectiveStatus ||
        (order as any).customStatusCode ||
        order.status ||
        "";
      const customStyle = getStatusBadgeStyle(effectiveStatusKey);
      const configuredStatus = orderStatusMap.get(
        normalizeStatusCode(effectiveStatusKey),
      );
      const registryText = display.primary.labelKey
        ? translate(display.primary.labelKey) || display.primary.label
        : display.primary.label;
      const text =
        !display.primary.labelKey && configuredStatus?.name
          ? configuredStatus.name
          : registryText;

      return {
        text,
        labelKey: display.primary.labelKey,
        className: `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${display.primary.colorClass}`,
        style: customStyle,
      };
    },
    [getStatusBadgeStyle, orderStatusMap, normalizeStatusCode],
  );

  const getPaymentStatusColor = useCallback((status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "pending":
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "failed":
        return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "unavailable":
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    }
  }, []);

  const getPaymentStatusText = useCallback(
    (status: string) => {
      const normalizedStatus = normalizeStatusCode(status);
      const configuredStatus = paymentStatusMap.get(normalizedStatus);
      if (configuredStatus?.name) {
        return configuredStatus.name;
      }

      switch (normalizedStatus) {
        case "COMPLETED":
        case "PAID":
          return t("orders.completed");
        case "PENDING":
          return t("orders.pendingPayment");
        case "FAILED":
          return t("orders.failed");
        case "UNAVAILABLE":
          return t("orders.notSpecified");
        default:
          return status;
      }
    },
    [normalizeStatusCode, paymentStatusMap, t],
  );

  const getPaymentStatusBadgeStyle = useCallback(
    (status: string): React.CSSProperties | undefined => {
      const configuredColor = paymentStatusMap.get(
        normalizeStatusCode(status),
      )?.color;

      if (!configuredColor) {
        return undefined;
      }

      return {
        backgroundColor: `${configuredColor}20`,
        color: configuredColor,
        border: `1px solid ${configuredColor}`,
      };
    },
    [paymentStatusMap, normalizeStatusCode],
  );

  const filterableOrderStatuses = useMemo(() => {
    const list = orderStatuses.filter((s) => normalizeStatusCode(s.code) !== "TRASH");
    if (showIncompleteInOrders) {
      const existingCodes = new Set(list.map((s) => normalizeStatusCode(s.code)));
      if (!existingCodes.has("INCOMPLETE")) {
        list.push({
          code: "INCOMPLETE",
          name: getStatusDisplay("INCOMPLETE").label,
        });
      }
      if (!existingCodes.has("LOST")) {
        list.push({
          code: "LOST",
          name: getStatusDisplay("LOST").label,
        });
      }
    }
    filters.status.forEach((raw) => {
      const activeFilter = normalizeStatusCode(raw);
      if (!activeFilter || activeFilter === "TRASH" || activeFilter === "TRASH_ORDER") {
        return;
      }
      const exists = list.some((s) => normalizeStatusCode(s.code) === activeFilter);
      if (!exists) {
        list.push({
          code: activeFilter,
          name: getStatusDisplay(activeFilter).label,
        });
      }
    });
    return list;
  }, [orderStatuses, filters.status, showIncompleteInOrders, normalizeStatusCode]);

  const filterablePaymentStatuses = useMemo(() => {
    const list = [...paymentStatuses];
    filters.paymentStatus.forEach((raw) => {
      const activeFilter = normalizeStatusCode(raw);
      if (!activeFilter) return;
      const exists = list.some((s) => normalizeStatusCode(s.code) === activeFilter);
      if (!exists) {
        list.push({
          code: activeFilter,
          name: getPaymentStatusText(activeFilter.toLowerCase()),
        });
      }
    });
    return list;
  }, [paymentStatuses, filters.paymentStatus, normalizeStatusCode, getPaymentStatusText]);

  const bulkUpdatableStatuses = useMemo(() => {
    return orderStatuses.filter((s) => {
      const code = normalizeStatusCode(s.code);
      return code !== "TRASH" && code !== "DRAFT";
    });
  }, [orderStatuses, normalizeStatusCode]);

  const getOrderSourceText = useCallback(
    (order: Order) => {
      const isStorefront =
        order.sourceType === "storefront" ||
        order.extractionMethod === "storefront" ||
        order.orderSource === "STOREFRONT" ||
        order.orderSource === "GUEST_CART" ||
        order.metadata?.source === "storefront" ||
        order.metadata?.isGuestOrder === true;

      if (isStorefront) return t("orders.sourceStorefront", "المتجر");

      const isWoo =
        order.sourceType === "woocommerce" ||
        order.sourceType === "woocommerce_webhook" ||
        order.sourceType === "woo" ||
        order.syncedFromWoo === true;

      if (isWoo) return t("orders.sourceWooCommerce", "وو كومرس");

      if (order.sourceType === "pos") return t("orders.sourcePOS", "نقطة بيع");

      if (
        order.sourceType === "affiliate_direct" ||
        order.orderSource === "AFFILIATE_DIRECT"
      ) {
        return t("orders.sourceAffiliateDirect", "مسوق مباشر");
      }

      if (
        order.sourceType === "manual" ||
        order.extractionMethod === "manual" ||
        order.extractionMethod === "manual_order_modal" ||
        order.extractionMethod === "manual_admin"
      ) {
        return t("orders.sourceManual", "يدوي");
      }

      if (order.sourceType === "import" || order.extractionMethod === "import") {
        return t("orders.sourceImport", "استيراد");
      }

      if (order.extractionMethod === "ai_enhanced") return t("orders.enhancedExtraction", "استخراج محسن");
      if (order.extractionMethod === "ai_basic") return t("orders.basicExtraction", "استخراج بسيط");
      if (order.sourceType === "ai_conversation" || order.conversationId) {
        return t("orders.sourceAutoConversation", "محادثة تلقائية");
      }

      if (typeof order.metadata?.source === "string" && order.metadata.source) {
        return order.metadata.source;
      }
      return t("orders.sourceUnknown", "غير محدد");
    },
    [t],
  );

  return {
    getStatusBadgeStyle,
    getUnifiedStatusDisplay,
    getPaymentStatusColor,
    getPaymentStatusText,
    getPaymentStatusBadgeStyle,
    filterableOrderStatuses,
    filterablePaymentStatuses,
    bulkUpdatableStatuses,
    getOrderSourceText,
  };
}
