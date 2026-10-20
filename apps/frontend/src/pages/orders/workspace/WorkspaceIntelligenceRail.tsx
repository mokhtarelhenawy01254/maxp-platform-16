import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  RefreshCw,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { CustomerRatingLevel } from "../../../components/orders/CustomerRatingBadge";
import type { CustomerOrderHistoryItem } from "../types";
import type { PerspectiveMode, WorkspaceOrder, WorkspaceStats } from "./types";
import { useCustomerOrderHistory } from "./components/intelligence/useCustomerOrderHistory";
import { CustomerRatingDossierSection } from "./components/intelligence/CustomerRatingDossierSection";
import { CustomerOrderHistoryCard } from "./components/intelligence/CustomerOrderHistoryCard";
import { CustomerHistoryKpiGrid } from "./components/intelligence/CustomerHistoryKpiGrid";
import { CustomerHistoryFilters } from "./components/intelligence/CustomerHistoryFilters";
import { SupervisorDistributionLink } from "./components/intelligence/SupervisorDistributionLink";

export interface WorkspaceIntelligenceRailProps {
  order: WorkspaceOrder | null;
  perspective: PerspectiveMode;
  stats: WorkspaceStats | null;
  onClose?: () => void;
  onRatingChange?: (newRating: CustomerRatingLevel) => void;
  onSelectOrder?: (orderId: string) => void;
}

export const WorkspaceIntelligenceRail: React.FC<WorkspaceIntelligenceRailProps> = ({
  order,
  perspective,
  onClose,
  onRatingChange,
  onSelectOrder,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith("ar");
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const [orderFilter, setOrderFilter] = useState<"all" | "delivered" | "failed">("all");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const {
    historyData,
    loadingHistory,
    historyError,
    handleRefreshHistory,
  } = useCustomerOrderHistory(order);

  const pastOrders = useMemo(() => {
    return historyData?.orders || [];
  }, [historyData?.orders]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "delivered") {
      return pastOrders.filter(
        (o) =>
          o.category === "DELIVERED" ||
          (o.status || "").toLowerCase().includes("deliver") ||
          (o.status || "").includes("مستلم"),
      );
    }
    if (orderFilter === "failed") {
      return pastOrders.filter(
        (o) =>
          o.category === "CANCELLED" ||
          o.category === "RETURNED" ||
          (o.status || "").toLowerCase().includes("cancel") ||
          (o.status || "").toLowerCase().includes("return") ||
          (o.status || "").includes("ملغي") ||
          (o.status || "").includes("مرتجع"),
      );
    }
    return pastOrders;
  }, [pastOrders, orderFilter]);

  const failedCount = useMemo(() => {
    const st = historyData?.stats;
    return (st?.cancelledCount || 0) + (st?.returnedCount || 0);
  }, [historyData?.stats]);

  // Unified telemetry from real history API and order fallback
  const customerStats = order?.customerStats;
  const deliveryRate =
    historyData?.stats?.deliverySuccessRate != null
      ? historyData.stats.deliverySuccessRate
      : typeof customerStats?.deliveryRate === "number"
        ? customerStats.deliveryRate
        : null;

  const totalDelivered =
    historyData?.stats?.deliveredCount != null
      ? historyData.stats.deliveredCount
      : customerStats?.totalDelivered || 0;

  const totalOrdersCount =
    historyData?.stats?.totalOrders != null
      ? historyData.stats.totalOrders
      : customerStats?.totalOrdersCount || (order ? 1 : 0);

  const isHighRisk = deliveryRate !== null && deliveryRate < 60;
  const isVip = deliveryRate !== null && deliveryRate >= 85 && totalDelivered >= 3;

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-s border-border/60 bg-card/70 p-3 text-xs space-y-3.5 scrollbar-thin">
      {/* Mobile Back Header */}
      {onClose && (
        <div className="flex items-center justify-between border-b border-border/40 pb-2 md:hidden shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            {isArabic ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            <span>{isArabic ? "العودة إلى تفاصيل الطلب" : "Back to Order Details"}</span>
          </button>
        </div>
      )}

      {/* Empty State if no order selected */}
      {!order && (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-muted-foreground space-y-2 my-auto">
          <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="font-semibold text-foreground">
            {isArabic ? "لم يتم تحديد طلب" : "No Order Selected"}
          </p>
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            {isArabic
              ? "اختر طلباً من طابور التأكيد لاستعراض تقييم العميل وسجل طلباته السابقة."
              : "Select an order from the confirmation queue to inspect customer dossier and order history."}
          </p>
        </div>
      )}

      {/* Customer Dossier Content (Rating & History) */}
      {order && (
        <div className="space-y-3.5 divide-y divide-border/40">
          {/* 1. Customer Rating & Trust Dossier */}
          <CustomerRatingDossierSection
            order={order}
            deliveryRate={deliveryRate}
            totalDelivered={totalDelivered}
            totalOrdersCount={totalOrdersCount}
            isHighRisk={isHighRisk}
            isVip={isVip}
            isArabic={isArabic}
            onRatingChange={onRatingChange}
          />

          {/* 2. Customer Order History */}
          <section className="pt-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground min-w-0">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{isArabic ? "سجل طلبات العميل" : "Customer History"}</span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono tabular-nums bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {totalOrdersCount}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefreshHistory}
                disabled={loadingHistory}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition active:scale-95 disabled:opacity-50 shrink-0"
                title={isArabic ? "تحديث سجل طلبات العميل" : "Refresh customer order history"}
                aria-label={isArabic ? "تحديث سجل طلبات العميل" : "Refresh customer order history"}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin text-primary" : ""}`} />
              </button>
            </div>

            {/* 2x2 KPI Summary Strip */}
            <CustomerHistoryKpiGrid
              totalOrdersCount={totalOrdersCount}
              totalDelivered={totalDelivered}
              failedCount={failedCount}
              deliveryRate={deliveryRate}
              isArabic={isArabic}
            />

            {/* Filter Pills when multiple orders exist */}
            {pastOrders.length > 1 && (
              <CustomerHistoryFilters
                orderFilter={orderFilter}
                onFilterChange={setOrderFilter}
                totalCount={pastOrders.length}
                deliveredCount={totalDelivered}
                failedCount={failedCount}
                isArabic={isArabic}
              />
            )}

            {/* Loading Indicator */}
            {loadingHistory && (
              <div className="flex items-center justify-center py-5 text-muted-foreground text-xs gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>{isArabic ? "جاري جلب سجل طلبات العميل..." : "Loading order history..."}</span>
              </div>
            )}

            {/* Error Message with Retry */}
            {historyError && !loadingHistory && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-[11px] text-destructive flex items-center justify-between">
                <span>{historyError}</span>
                <button
                  type="button"
                  onClick={handleRefreshHistory}
                  className="underline font-bold text-xs ms-2 hover:opacity-80"
                >
                  {isArabic ? "إعادة المحاولة" : "Retry"}
                </button>
              </div>
            )}

            {/* Orders List */}
            {!loadingHistory && filteredOrders.length > 0 && (
              <div className="space-y-2">
                {filteredOrders.map((ord: CustomerOrderHistoryItem) => {
                  const isCurrent =
                    ord.isCurrentOrder ||
                    ord.id === order?.id ||
                    ord.orderNumber === order?.orderNumber;
                  const isExpanded = Boolean(expandedOrders[ord.id || ord.orderNumber]);

                  return (
                    <CustomerOrderHistoryCard
                      key={ord.id || ord.orderNumber}
                      ord={ord}
                      isCurrent={isCurrent}
                      isExpanded={isExpanded}
                      isArabic={isArabic}
                      onToggleExpand={() =>
                        setExpandedOrders((prev) => ({
                          ...prev,
                          [ord.id || ord.orderNumber]: !prev[ord.id || ord.orderNumber],
                        }))
                      }
                      onSelectOrder={onSelectOrder}
                      formatPrice={formatPrice}
                      formatDate={formatDate}
                    />
                  );
                })}
              </div>
            )}

            {/* First time buyer notice */}
            {!loadingHistory && !historyError && historyData && pastOrders.length <= 1 && (
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-2.5 text-xs text-sky-900 dark:text-sky-200">
                <div className="flex items-start gap-2">
                  <ShoppingBag className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[11px] flex items-center gap-1">
                      <span>
                        {isArabic
                          ? "الطلب الأول لهذا العميل (عميل جديد)"
                          : "First Order (New Customer)"}
                      </span>
                      <Sparkles className="h-3 w-3 text-sky-500" />
                    </p>
                    <p className="mt-0.5 text-[10px] text-sky-700/80 dark:text-sky-300/80 leading-relaxed">
                      {isArabic
                        ? "لا توجد طلبات شراء سابقة مسجلة لنفس رقم الهاتف في متجرك. هذا الطلب يمثل بداية السجل الشرائي للعميل."
                        : "No past order history exists for this customer phone number in your store."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Supervisor Team Distribution Section (Supervisors Only) */}
      {perspective === "supervisor" && (
        <SupervisorDistributionLink isArabic={isArabic} />
      )}
    </aside>
  );
};

export default WorkspaceIntelligenceRail;
