import React, { useCallback } from "react";
import {
  InformationCircleIcon,
  StarIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { Order } from "../../../types/orders";
import type { AffiliateFilterOption } from "../ordersFilterTypes";
import i18n from "../../../i18n";

export interface UseOrdersEntityFormattersParams {
  t: (key: string, params?: any) => string;
  formatDate: (dateString: string | Date, options?: any) => string;
}

export function useOrdersEntityFormatters({
  t,
  formatDate,
}: UseOrdersEntityFormattersParams) {
  const getCustomerDisplayName = useCallback(
    (order: Order): string => {
      const isPlaceholderName = (name?: string | null) => {
        if (!name) return true;
        const trimmed = name.trim();
        return (
          trimmed.length <= 1 ||
          /^\d+$/.test(trimmed) ||
          trimmed === "New Customer" ||
          trimmed === "Customer Not Specified" ||
          trimmed === "Customer" ||
          trimmed === "عميل غير محدد" ||
          trimmed === "غير محدد"
        );
      };

      if (order.customerName && !isPlaceholderName(order.customerName)) {
        return order.customerName.trim();
      }

      if (order.customer) {
        const fullName =
          `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim();
        if (!isPlaceholderName(fullName)) {
          return fullName;
        }
      }

      if (order.customerName && order.customerName.match(/^\d+/)) {
        return `${t("orders.facebookCustomer")} (${order.customerName.substring(0, 8)}...)`;
      }

      if (order.customerPhone) {
        return `${t("orders.customer")} (${order.customerPhone})`;
      }

      if (order.conversationId) {
        return `${t("orders.customerFromConversation")} (${order.conversationId.substring(0, 8)}...)`;
      }

      return order.customerName || t("orders.notSpecifiedCustomer");
    },
    [t],
  );

  const getConfidenceColor = useCallback((confidence?: number): string => {
    if (!confidence) return "bg-slate-100 text-slate-800";
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  }, []);

  const getConfidenceIcon = useCallback(
    (confidence?: number): React.ReactNode => {
      if (!confidence) return <InformationCircleIcon className="h-3 w-3" />;
      if (confidence >= 0.8) return <StarIcon className="h-3 w-3" />;
      if (confidence >= 0.6) return <InformationCircleIcon className="h-3 w-3" />;
      return <ExclamationTriangleIcon className="h-3 w-3" />;
    },
    [],
  );

  const getRelativeTime = useCallback(
    (dateString: string): string => {
      try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor(
          (now.getTime() - date.getTime()) / 1000,
        );

        if (diffInSeconds < 60) {
          return t("orders.justNow");
        }

        if (diffInSeconds < 3600) {
          const minutes = Math.floor(diffInSeconds / 60);
          return t("orders.minutesAgo", { count: minutes });
        }

        if (diffInSeconds < 86400) {
          const hours = Math.floor(diffInSeconds / 3600);
          return t("orders.hoursAgo", { count: hours });
        }

        if (diffInSeconds < 172800) {
          return t("orders.yesterday");
        }

        return formatDate(dateString);
      } catch {
        return formatDate(dateString);
      }
    },
    [t, formatDate],
  );

  const getAffiliateDisplayName = useCallback(
    (affiliate?: AffiliateFilterOption): string => {
      if (!affiliate) return "";
      const userName =
        `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim();
      return (
        userName ||
        affiliate.affiliateCode ||
        affiliate.user?.email ||
        affiliate.id
      );
    },
    [],
  );

  const getFulfillmentSourceText = useCallback(
    (source?: string | null): string => {
      switch (String(source || "").toUpperCase()) {
        case "COMPANY_WAREHOUSE":
          return i18n.t("orders.fromCompanyWarehouse");
        case "MERCHANT":
          return i18n.t("orders.fromMerchant");
        default:
          return "";
      }
    },
    [],
  );

  return {
    getCustomerDisplayName,
    getConfidenceColor,
    getConfidenceIcon,
    getRelativeTime,
    getAffiliateDisplayName,
    getFulfillmentSourceText,
  };
}
