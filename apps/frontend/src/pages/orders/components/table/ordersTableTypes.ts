import React from "react";
import type { Order } from "../../Orders";

export interface OrdersTableHelpers {
  getCustomerDisplayName: (order: Order) => string;
  formatPrice: (amount: number | null | undefined, currencyCode?: string) => string;
  getRelativeTime: (dateString: string) => string;
  formatDate: (date: Date | string | number) => string;
  getPaymentStatusBadgeStyle: (status: string) => React.CSSProperties | undefined;
  getPaymentStatusColor: (status: string) => string;
  getPaymentStatusText: (status: string) => string;
  getUnifiedStatusDisplay: (
    order: Order,
    translate: (key: string) => string,
  ) => {
    text: string;
    labelKey: string;
    className: string;
    style: React.CSSProperties | undefined;
  };
  getConfidenceColor: (confidence?: number) => string;
  getConfidenceIcon: (confidence?: number) => React.ReactNode;
  getOrderSourceText?: (order: Order) => string;
}

export interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  ordersLoadError: string | null;
  selectedOrders: string[];
  canSelectOrders: boolean;
  isMerchant: boolean;
  activeFilterCount: number;
  search: string;
  columns: string[];
  columnCount: number;
  density: "comfortable" | "compact";
  page: number;
  totalPages: number;
  totalOrders: number;
  limit: number;
  helpers: OrdersTableHelpers;
  onOpenOrder: (order: Order) => void;
  onToggleSelection: (orderNumber: string) => void;
  onToggleAllSelection: () => void;
  onMarkAsViewed: (orderNumber: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onDensityChange: (density: "comfortable" | "compact") => void;
  onCustomerRatingChange?: (orderNumber: string, newRating: string) => void;
}

export const toStandardDigits = (str?: string | null): string => {
  if (!str) return "";
  return String(str)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .trim();
};

export const dedupOrders = (list: Order[]): Order[] => {
  const seen = new Set<string>();
  const out: Order[] = [];
  for (const order of list) {
    const key = String(order.orderNumber || order.id || "").trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(order);
  }
  return out;
};
