import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ShoppingBagIcon,
  CubeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  CustomerOrderHistoryData,
  CustomerOrderHistoryItem,
} from "../types";
import { apiClient } from "../../../services/apiClient";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { useCurrency } from "../../../hooks/useCurrency";
import { getOrderStatusDisplay } from "../../../utils/statusRegistry";

interface CustomerOrderHistoryCardProps {
  orderNumber: string;
  initialHistory?: CustomerOrderHistoryData | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerId?: string | null;
  currency?: string;
  onRefreshHistory?: () => void;
}

const formatRelativeDays = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "اليوم";
    if (diffDays === 1) return "أمس";
    if (diffDays === 2) return "منذ يومين";
    if (diffDays <= 10) return `منذ ${diffDays} أيام`;
    if (diffDays <= 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    if (diffDays <= 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
    return `منذ أكثر من سنة`;
  } catch {
    return "";
  }
};

export const CustomerOrderHistoryCard: React.FC<CustomerOrderHistoryCardProps> = ({
  orderNumber,
  initialHistory,
  customerPhone,
  customerEmail,
  customerId,
  currency = "EGP",
}) => {
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();
  const [history, setHistory] = useState<CustomerOrderHistoryData | null>(
    initialHistory || null
  );
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "delivered" | "failed">("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Synchronize when initialHistory changes
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
        `/orders-new/simple/${encodeURIComponent(orderNumber)}/customer-history`
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
          o.status.includes("مستلم")
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
          o.status.includes("مرتجع")
      );
    }
    return orders;
  }, [orders, filter]);

  const pastOrdersOnly = useMemo(
    () => orders.filter((o) => !o.isCurrentOrder),
    [orders]
  );

  const failedCount = (stats?.cancelledCount || 0) + (stats?.returnedCount || 0);

  const getSuccessRateBadge = (rate: number | null | undefined) => {
    if (rate == null) {
      return {
        label: "لا توجد بيانات تسليم بعد",
        className:
          "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
      };
    }
    if (rate >= 80) {
      return {
        label: `${rate}% نسبة استلام ممتازة`,
        className:
          "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
    }
    if (rate >= 50) {
      return {
        label: `${rate}% نسبة استلام متوسطة`,
        className:
          "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      };
    }
    return {
      label: `${rate}% نسبة استلام منخفضة (حذر)`,
      className:
        "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    };
  };

  const successRateInfo = getSuccessRateBadge(stats?.deliverySuccessRate);

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 border border-gray-100 dark:border-gray-700/60">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 pb-3.5 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <ClockIcon className="h-5 w-5 text-indigo-500 shrink-0" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
            سجل وتاريخ طلبات العميل
          </h3>
          {stats && stats.totalOrders > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
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
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition active:scale-97 disabled:opacity-50 shrink-0"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${loading ? "animate-spin text-indigo-600" : ""}`}
          />
        </button>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {/* Total Orders */}
        <div className="rounded-lg border border-gray-100 dark:border-gray-700/50 bg-gray-50/70 dark:bg-gray-900/30 p-2.5">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">
            إجمالي الطلبات
          </span>
          <span className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5 block">
            {stats?.totalOrders ?? 1}
          </span>
          <span className="text-[10px] text-gray-400 block mt-0.5">
            {pastOrdersOnly.length > 0
              ? `${pastOrdersOnly.length} سابقة + الحالي`
              : "الطلب الحالي فقط"}
          </span>
        </div>

        {/* Delivered */}
        <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
              مستلمة
            </span>
            <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5 block">
            {stats?.deliveredCount ?? 0}
          </span>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70 block mt-0.5 truncate">
            {stats?.totalDeliveredSpent
              ? formatPrice(stats.totalDeliveredSpent)
              : "0 " + currency}
          </span>
        </div>

        {/* Cancelled / Returned */}
        <div className="rounded-lg border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-red-800 dark:text-red-300">
              ملغية / مرتجعة
            </span>
            <XCircleIcon className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
          </div>
          <span className="text-base font-bold tabular-nums text-red-600 dark:text-red-400 mt-0.5 block">
            {failedCount}
          </span>
          <span className="text-[10px] text-red-500/80 dark:text-red-400/70 block mt-0.5">
            {stats?.cancelledCount || 0} إلغاء • {stats?.returnedCount || 0} رجوع
          </span>
        </div>

        {/* Delivery Success Rate */}
        <div className="rounded-lg border border-gray-100 dark:border-gray-700/50 bg-gray-50/70 dark:bg-gray-900/30 p-2.5">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">
            نسبة الاستلام
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {stats?.deliverySuccessRate != null
                ? `${stats.deliverySuccessRate}%`
                : "—"}
            </span>
          </div>
          <span
            className={`inline-block mt-0.5 text-[9.5px] font-semibold px-1.5 py-0.2 rounded border ${successRateInfo.className}`}
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
        <div className="flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-700/60 pb-2.5 mb-3 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-md font-medium transition active:scale-97 shrink-0 ${
              filter === "all"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
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
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
          >
            المستلمة ({stats?.deliveredCount || 0})
          </button>
          <button
            type="button"
            onClick={() => setFilter("failed")}
            className={`px-2.5 py-1 rounded-md font-medium transition active:scale-97 shrink-0 ${
              filter === "failed"
                ? "bg-red-600 text-white"
                : "text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
            }`}
          >
            الملغية والمرتجعة ({failedCount})
          </button>
        </div>
      )}

      {/* Order List */}
      <div className="space-y-2.5">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((ord: CustomerOrderHistoryItem) => {
            const statusDisplay = getOrderStatusDisplay({
              status: ord.status,
            });
            const isExpanded = expandedOrderId === ord.id;
            const items = ord.items || [];

            return (
              <div
                key={ord.id || ord.orderNumber}
                className={`rounded-lg border transition ${
                  ord.isCurrentOrder
                    ? "border-blue-200 dark:border-blue-800/80 bg-blue-50/30 dark:bg-blue-950/15"
                    : "border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/80 hover:border-gray-200 dark:hover:border-gray-600"
                } p-3`}
              >
                {/* Order Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    {/* Order Number Link */}
                    <Link
                      to={`/orders/${encodeURIComponent(ord.orderNumber)}`}
                      className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 group tabular-nums"
                      title="فتح صفحة هذا الطلب"
                    >
                      <span>#{ord.orderNumber}</span>
                      <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-60 group-hover:opacity-100 shrink-0" />
                    </Link>

                    {/* Current Order Indicator */}
                    {ord.isCurrentOrder && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                        الطلب الحالي
                      </span>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        statusDisplay.primary.colorClass ||
                        "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                      }`}
                    >
                      {statusDisplay.primary.label}
                    </span>
                  </div>

                  {/* Order Total */}
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
                    {formatPrice(ord.total)}
                  </span>
                </div>

                {/* Date & Items Row */}
                <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="tabular-nums">
                      {ord.createdAt ? formatDate(ord.createdAt) : "—"}
                    </span>
                    {ord.createdAt && (
                      <span className="text-gray-400 text-[10px]">
                        ({formatRelativeDays(ord.createdAt)})
                      </span>
                    )}
                  </div>

                  {/* Expand Items Toggle */}
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOrderId(isExpanded ? null : ord.id)
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition active:scale-97 py-0.5 px-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700/60"
                    >
                      <CubeIcon className="h-3.5 w-3.5 text-gray-400" />
                      <span>
                        {ord.itemsCount || items.length}{" "}
                        {(ord.itemsCount || items.length) === 1
                          ? "منتج"
                          : "منتجات"}
                      </span>
                      <ChevronDownIcon
                        className={`h-3 w-3 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Expandable Items Details */}
                {isExpanded && items.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700/50 space-y-1.5">
                    {items.map((it, idx) => (
                      <div
                        key={it.id || idx}
                        className="flex items-center justify-between gap-2 text-xs py-1 px-1.5 rounded bg-gray-50/60 dark:bg-gray-900/20"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {it.image ? (
                            <img
                              src={it.image}
                              alt={it.name}
                              className="h-7 w-7 rounded object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="h-7 w-7 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-400">
                              <ShoppingBagIcon className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <div className="min-w-0 truncate">
                            <span className="font-medium text-gray-800 dark:text-gray-200 block truncate">
                              {it.name}
                            </span>
                            {(it.color || it.size) && (
                              <span className="text-[10px] text-gray-400 block truncate">
                                {[it.color, it.size]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 tabular-nums text-gray-600 dark:text-gray-300 text-[11px]">
                          <span>{it.quantity} × </span>
                          <span className="font-semibold">
                            {formatPrice(it.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Empty Filter State */
          <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-400">
            لا توجد طلبات تطابق الفلتر المحدد.
          </div>
        )}

        {/* First time buyer notice (only 1 total order) */}
        {orders.length <= 1 && (
          <div className="rounded-lg border border-sky-100 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 p-3 text-xs text-sky-900 dark:text-sky-200 mt-2">
            <div className="flex items-start gap-2">
              <ShoppingBagIcon className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
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
