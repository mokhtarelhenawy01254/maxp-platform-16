import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import {
  CustomerOrderHistoryData,
  CustomerOrderHistoryItem,
} from "../types";
import { apiClient } from "../../../services/apiClient";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { useCurrency } from "../../../hooks/useCurrency";
import { getSuccessRateBadge } from "../utils/customerHistoryHelpers";
import { CustomerHistoryItemCard } from "./CustomerHistoryItemCard";

interface CustomerOrderHistoryCardProps {
  orderNumber: string;
  initialHistory?: CustomerOrderHistoryData | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerId?: string | null;
  currency?: string;
  onRefreshHistory?: () => void;
}

export const CustomerOrderHistoryCard: React.FC<CustomerOrderHistoryCardProps> = ({
  orderNumber,
  initialHistory,
  currency = "EGP",
}) => {
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();
  const [history, setHistory] = useState<CustomerOrderHistoryData | null>(
    initialHistory || null,
  );
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "delivered" | "failed">("all");

  useEffect(() => {
    if (initialHistory) {
      setHistory(initialHistory);
    }
  }, [initialHistory]);

  const handleRefresh = async () => {
    if (!orderNumber) return;
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/orders-new/simple/${encodeURIComponent(orderNumber)}/customer-history`,
      );
      if (res.data?.success && res.data.data) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error("Failed to refresh customer order history:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = history?.stats;
  const orders = history?.orders || [];

  const filteredOrders = useMemo(() => {
    if (filter === "delivered") {
      return orders.filter(
        (o) =>
          o.category === "DELIVERED" ||
          o.status.includes("deliver") ||
          o.status.includes("مستلم"),
      );
    }
    if (filter === "failed") {
      return orders.filter(
        (o) =>
          o.category === "CANCELLED" ||
          o.category === "RETURNED" ||
          o.status.includes("cancel") ||
          o.status.includes("return") ||
          o.status.includes("ملغي") ||
          o.status.includes("مرتجع"),
      );
    }
    return orders;
  }, [orders, filter]);

  const pastOrdersOnly = useMemo(
    () => orders.filter((o) => !o.isCurrentOrder),
    [orders],
  );

  const failedCount = (stats?.cancelledCount || 0) + (stats?.returnedCount || 0);
  const successRateInfo = getSuccessRateBadge(stats?.deliverySuccessRate);

  return (
    <div className="bg-card shadow-xs rounded-2xl p-4 sm:p-5 border border-border/70">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
            سجل وتاريخ طلبات العميل
          </h3>
          {stats && stats.totalOrders > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums bg-primary/10 text-primary border border-primary/20 shrink-0">
              {stats.totalOrders} {stats.totalOrders === 1 ? "طلب" : "طلبات"}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          aria-label="تحديث سجل طلبات العميل"
          title="تحديث السجل الشرائي للعميل"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition active:scale-97 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
        </button>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {/* Total Orders */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
          <span className="text-[11px] font-medium text-muted-foreground block">
            إجمالي الطلبات
          </span>
          <span className="text-base font-bold font-mono tabular-nums text-foreground mt-0.5 block">
            {stats?.totalOrders ?? 1}
          </span>
          <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
            {pastOrdersOnly.length > 0
              ? `${pastOrdersOnly.length} سابقة + الحالي`
              : "الطلب الحالي فقط"}
          </span>
        </div>

        {/* Delivered */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              مستلمة
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5 block">
            {stats?.deliveredCount ?? 0}
          </span>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block mt-0.5 truncate font-mono tabular-nums">
            {stats?.totalDeliveredSpent
              ? formatPrice(stats.totalDeliveredSpent)
              : "0 " + currency}
          </span>
        </div>

        {/* Cancelled / Returned */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-destructive">
              ملغية / مرتجعة
            </span>
            <XCircle className="h-3.5 w-3.5 text-destructive" />
          </div>
          <span className="text-base font-bold font-mono tabular-nums text-destructive mt-0.5 block">
            {failedCount}
          </span>
          <span className="text-[10px] text-destructive/80 block mt-0.5 font-mono tabular-nums">
            {stats?.cancelledCount || 0} إلغاء • {stats?.returnedCount || 0} رجوع
          </span>
        </div>

        {/* Delivery Success Rate */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
          <span className="text-[11px] font-medium text-muted-foreground block">
            نسبة الاستلام
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold font-mono tabular-nums text-foreground">
              {stats?.deliverySuccessRate != null
                ? `${stats.deliverySuccessRate}%`
                : "—"}
            </span>
          </div>
          <span
            className={`inline-block mt-0.5 text-[9.5px] font-semibold px-1.5 py-0.5 rounded border ${successRateInfo.className}`}
          >
            {stats?.deliverySuccessRate != null
              ? stats.deliverySuccessRate >= 80
                ? "موثوق"
                : stats.deliverySuccessRate >= 50
                ? "متوسط"
                : "مرتفع الخطورة"
              : "عميل جديد"}
          </span>
        </div>
      </div>

      {/* Filter Tabs (when multiple orders exist) */}
      {orders.length > 1 && (
        <div className="flex items-center gap-1.5 border-b border-border/70 pb-2.5 mb-3 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-md font-medium transition active:scale-97 shrink-0 ${
              filter === "all"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            الكل ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("delivered")}
            className={`px-2.5 py-1 rounded-md font-medium transition active:scale-97 shrink-0 ${
              filter === "delivered"
                ? "bg-emerald-600 text-white"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            المستلمة ({stats?.deliveredCount || 0})
          </button>
          <button
            type="button"
            onClick={() => setFilter("failed")}
            className={`px-2.5 py-1 rounded-md font-medium transition active:scale-97 shrink-0 ${
              filter === "failed"
                ? "bg-destructive text-destructive-foreground"
                : "text-destructive hover:bg-destructive/10"
            }`}
          >
            الملغية والمرتجعة ({failedCount})
          </button>
        </div>
      )}

      {/* Order List */}
      <div className="space-y-2.5">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((ord: CustomerOrderHistoryItem) => (
            <CustomerHistoryItemCard
              key={ord.id || ord.orderNumber}
              ord={ord}
              formatPrice={formatPrice}
              formatDate={formatDate}
            />
          ))
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground">
            لا توجد طلبات تطابق الفلتر المحدد.
          </div>
        )}

        {/* First time buyer notice (only 1 total order) */}
        {orders.length <= 1 && (
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-900 dark:text-sky-200 mt-2">
            <div className="flex items-start gap-2">
              <ShoppingBag className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  الطلب الأول لهذا العميل (عميل جديد)
                </p>
                <p className="mt-0.5 text-[11px] text-sky-700/80 dark:text-sky-300/80">
                  لا توجد طلبات شراء سابقة مسجلة لنفس رقم الهاتف في متجرك. هذا
                  الطلب يمثل بداية السجل الشرائي للعميل.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrderHistoryCard;
