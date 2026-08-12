import type { TFunction } from "i18next";
import type { OrderAttributionData } from "./types";

export interface IncompleteOrderItem {
  name?: string;
  productName?: string;
  title?: string;
  quantity?: number;
  price?: number;
  total?: number;
  [key: string]: unknown;
}

export interface CheckoutData {
  guestName?: string;
  fullName?: string;
  customerName?: string;
  customerFullName?: string;
  name?: string;
  guestPhone?: string;
  customerPhone?: string;
  phoneNumber?: string;
  mobileNumber?: string;
  phone?: string;
  mobile?: string;
  guestEmail?: string;
  customerEmail?: string;
  emailAddress?: string;
  email?: string;
  governorate?: string;
  city?: string;
  gov?: string;
  attribution?: OrderAttributionData;
  [key: string]: unknown;
}

export interface IncompleteOrder {
  cartId: string;
  itemsCount: number;
  total: number;
  checkoutData?: CheckoutData;
  attribution?: OrderAttributionData | null;
  checkoutStartedAt?: string;
  checkoutUpdatedAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  status?: "lost" | "incomplete";
}

export interface IncompleteStats {
  total: number;
  active: number;
  lost: number;
  totalValue: number;
  activeValue: number;
  lostValue: number;
}

export interface IncompleteListResponse {
  success: boolean;
  data?: IncompleteOrder[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  stats?: IncompleteStats;
  message?: string;
}

export interface IncompleteOrderDetailsData {
  cartId: string;
  items: IncompleteOrderItem[];
  itemsCount: number;
  total: number;
  checkoutData?: CheckoutData;
  attribution?: OrderAttributionData | null;
  checkoutStartedAt?: string;
  checkoutUpdatedAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  status?: "lost" | "incomplete";
}

export interface IncompleteDetailsResponse {
  success: boolean;
  data?: IncompleteOrderDetailsData;
  message?: string;
}

export interface IncompleteConvertResponse {
  success: boolean;
  message?: string;
  data?: {
    id?: string;
    orderNumber?: string;
  };
}

const getCheckoutData = (checkoutData?: CheckoutData) => checkoutData || {};

export const getCustomerName = (checkoutData?: CheckoutData) => {
  const data = getCheckoutData(checkoutData);
  return (
    data.guestName ||
    data.fullName ||
    data.customerName ||
    data.customerFullName ||
    data.name ||
    null
  );
};

export const getCustomerContact = (checkoutData?: CheckoutData) => {
  const data = getCheckoutData(checkoutData);
  const phone =
    data.guestPhone ||
    data.customerPhone ||
    data.phoneNumber ||
    data.mobileNumber ||
    data.phone ||
    data.mobile ||
    "";
  const email =
    data.guestEmail ||
    data.customerEmail ||
    data.emailAddress ||
    data.email ||
    "";
  return { phone, email };
};

export const getGovernorate = (checkoutData?: CheckoutData) => {
  const data = getCheckoutData(checkoutData);
  return data.governorate || data.city || data.gov || "";
};

export const getLastUpdated = (order: IncompleteOrder) => {
  return order.checkoutUpdatedAt || order.updatedAt || order.checkoutStartedAt || "";
};

export const getRelativeTime = (dateStr: string, t: TFunction) => {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "";
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t("orders.justNow");
  if (minutes < 60) return t("orders.minutesAgo", { count: minutes });
  if (hours < 24) return t("orders.hoursAgo", { count: hours });
  if (days < 7) return t("orders.daysAgo", { count: days });
  return "";
};

export const formatDateTimeCompact = (dateStr: string, lang: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    const d = date.toLocaleDateString("en-CA");
    const timeLocale = lang === "ar" ? "ar-EG" : "en-US";
    const time = date.toLocaleTimeString(timeLocale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${d} ${time}`;
  } catch {
    return dateStr;
  }
};

export interface ExpiryStatus {
  label: string;
  urgent: boolean;
}

export const getExpiryStatus = (
  order: IncompleteOrder,
  t: TFunction,
): ExpiryStatus | null => {
  if (order.status === "lost") return null;
  if (!order.expiresAt) return null;
  const now = new Date();
  const expires = new Date(order.expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const diffHours = diffMs / (1000 * 60 * 60);
  const remainingHours = Math.ceil(diffHours);
  if (remainingHours >= 48) {
    return {
      label: t("orders.incompleteExpiresInDays", { count: Math.round(diffHours / 24) }),
      urgent: false,
    };
  }
  return {
    label: t("orders.incompleteExpiresInHours", { count: remainingHours }),
    urgent: remainingHours <= 6,
  };
};

export type ValueTier = "high" | "medium" | "low";

export const getValueTier = (total: number): ValueTier => {
  if (total >= 1000) return "high";
  if (total >= 300) return "medium";
  return "low";
};

export const getValueColor = (tier: ValueTier) => {
  switch (tier) {
    case "high":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
    case "medium":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  }
};

export const getValueLabel = (tier: ValueTier, t: TFunction) => {
  switch (tier) {
    case "high":
      return t("orders.valueHigh");
    case "medium":
      return t("orders.valueMedium");
    default:
      return t("orders.valueLow");
  }
};

export const getStatusBadgeClasses = (status?: string) => {
  return status === "lost"
    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800";
};

export const getStatusLabel = (status: string | undefined, t: TFunction) => {
  return status === "lost"
    ? t("orders.incompleteStatusLost")
    : t("orders.incompleteStatusActive");
};

export const parseIncompleteAttribution = (
  value: unknown,
): OrderAttributionData | null => {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object"
        ? (parsed as OrderAttributionData)
        : null;
    } catch {
      return null;
    }
  }

  return typeof value === "object"
    ? (value as OrderAttributionData)
    : null;
};

export const getOrderAttribution = (
  order: { attribution?: OrderAttributionData | null },
): OrderAttributionData | null => {
  return parseIncompleteAttribution(order?.attribution);
};
