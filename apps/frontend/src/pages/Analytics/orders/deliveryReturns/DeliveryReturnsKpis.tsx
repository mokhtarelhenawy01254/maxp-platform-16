import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  Undo2,
  Truck,
  Banknote,
  ArrowDownRight,
} from "lucide-react";
import { useCurrency } from "../../../../hooks/useCurrency";

export interface LogisticsSummary {
  totalOrders: number;
  preDispatchCancelledCount: number;
  preDispatchPendingCount: number;
  totalShipped: number;
  deliveredOrders: number;
  returnedOrders: number;
  inTransitOrders: number;
  closedOrders: number;
  closedDeliveryRate: number;
  closedReturnRate?: number;
  shippedDeliveryRate: number;
  returnRate: number;
  inTransitRate: number;
  codDeliveredRevenue: number;
  lostShippingCost: number;
  returnedInventoryValue: number;
  inTransitRevenue: number;
  restockedCount: number;
  pendingWithCarrierCount: number;
  restockedValue: number;
  pendingCarrierValue: number;
  stockRecoveryRate: number;
}

interface Props {
  summary?: LogisticsSummary;
}

export const DeliveryReturnsKpis: React.FC<Props> = ({ summary }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const deliveredCount = summary?.deliveredOrders ?? 0;
  const returnedCount = summary?.returnedOrders ?? 0;
  const closedOrders = summary?.closedOrders ?? (deliveredCount + returnedCount);
  const closedDeliveryRate = summary?.closedDeliveryRate ?? 0;
  const closedReturnRate = summary?.closedReturnRate ?? (closedOrders > 0 ? Math.round(((returnedCount / closedOrders) * 100) * 10) / 10 : 0);
  const returnRate = summary?.returnRate ?? 0;
  const inTransitCount = summary?.inTransitOrders ?? 0;
  const totalShipped = summary?.totalShipped ?? 0;

  return (
    <div className="space-y-4">
      {/* Context Pipeline Bar: Pre-dispatch to Shipped */}
      <div className="bg-slate-50 dark:bg-gray-900/60 border border-slate-200/80 dark:border-gray-800 rounded-xl p-3 sm:p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {t("deliveryReturnsReport.totalOrders")}:
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {(summary?.totalOrders ?? 0).toLocaleString()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              {t("deliveryReturnsReport.preDispatchPending")}:
              <b className="font-mono text-slate-700 dark:text-slate-200 tabular-nums mr-1">
                {(summary?.preDispatchPendingCount ?? 0).toLocaleString()}
              </b>
            </span>

            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              {t("deliveryReturnsReport.preDispatchCancelled")}:
              <b className="font-mono tabular-nums mr-1">
                {(summary?.preDispatchCancelledCount ?? 0).toLocaleString()}
              </b>
            </span>

            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
              <Truck className="h-3.5 w-3.5" />
              {t("deliveryReturnsReport.totalShipped")}:
              <b className="font-mono font-bold tabular-nums mr-1">
                {totalShipped.toLocaleString()}
              </b>
            </span>
          </div>
        </div>
      </div>

      {/* 5 Operational Logistics KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Closed Delivery Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/80 shadow-sm border-t-2 border-t-emerald-500 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("deliveryReturnsReport.closedDeliveryRate")}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-bold font-mono tracking-tight text-gray-900 dark:text-white tabular-nums">
              {closedDeliveryRate}%
            </p>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 truncate" title={t("deliveryReturnsReport.closedDeliveryRateHint")}>
              {deliveredCount} {t("deliveryReturnsReport.delivered")} من {closedOrders} محسوم
            </p>
          </div>
        </div>

        {/* Closed Return Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/80 shadow-sm border-t-2 border-t-amber-500 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("deliveryReturnsReport.closedReturnRate")}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
              <Undo2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              {closedReturnRate}%
            </p>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 truncate" title={t("deliveryReturnsReport.closedReturnRateHint")}>
              {returnedCount} {t("deliveryReturnsReport.returned")} من {closedOrders} محسوم ({returnRate}% من المشحون)
            </p>
          </div>
        </div>

        {/* In Transit with Couriers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/80 shadow-sm border-t-2 border-t-blue-500 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("deliveryReturnsReport.inTransitOrders")}
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">
              {inTransitCount.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 truncate">
              {summary?.inTransitRate ?? 0}% من إجمالي المشحون
            </p>
          </div>
        </div>

        {/* Collected COD Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/80 shadow-sm border-t-2 border-t-teal-500 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("deliveryReturnsReport.codDeliveredRevenue")}
            </span>
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 shrink-0">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-bold font-mono tracking-tight text-gray-900 dark:text-white tabular-nums">
              {formatPrice(summary?.codDeliveredRevenue ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 truncate">
              محصّل فعلياً من العملاء
            </p>
          </div>
        </div>

        {/* Lost Shipping Cost on Returns */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/80 shadow-sm border-t-2 border-t-rose-500 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("deliveryReturnsReport.lostShippingCost")}
            </span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 shrink-0">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              {formatPrice(summary?.lostShippingCost ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 truncate" title={t("deliveryReturnsReport.lostShippingCostHint")}>
              مصاريف شحن طرود مرتجعة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
