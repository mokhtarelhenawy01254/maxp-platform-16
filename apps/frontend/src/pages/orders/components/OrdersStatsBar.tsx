import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  CubeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  getMerchantOperationsTotals,
  formatMerchantPieces,
  payoutStatusLabels,
} from "../Orders";
import type {
  MerchantSettlementSummary,
  MerchantFilterOption,
} from "../Orders";

interface OrdersStatsBarProps {
  isAdmin: boolean;
  isMerchant: boolean;
  merchantId: string;
  merchantSettlementSummary: MerchantSettlementSummary | null;
  merchantSettlementLoading: boolean;
  merchantSettlementError: string | null;
  merchantOptions: MerchantFilterOption[];
  formatPrice: (amount: number | null | undefined, currencyCode?: string) => string;
  getFulfillmentSourceText: (source?: string | null) => string;
  onClearMerchantFilters: () => void;
  onShowDueOrders: () => void;
}

export const OrdersStatsBar: React.FC<OrdersStatsBarProps> = ({
  isAdmin,
  isMerchant,
  merchantId,
  merchantSettlementSummary,
  merchantSettlementLoading,
  merchantSettlementError,
  merchantOptions,
  formatPrice,
  getFulfillmentSourceText,
  onClearMerchantFilters,
  onShowDueOrders,
}) => {
  const { t } = useTranslation();

  if (!isAdmin || isMerchant || !merchantId) {
    return null;
  }

  const selectedMerchant = merchantSettlementSummary?.merchant;
  const selectedMerchantOption = merchantOptions.find(
    (merchantOption) => merchantOption.id === merchantId,
  );
  const merchantName =
    selectedMerchant?.name ||
    selectedMerchantOption?.name ||
    selectedMerchant?.email ||
    selectedMerchantOption?.email ||
    t("orders.selectedMerchant");

  if (merchantSettlementLoading) {
    return (
      <section className="mb-4 rounded-[26px] border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
        <div className="skeleton-shimmer h-24 rounded-2xl" />
      </section>
    );
  }

  if (merchantSettlementError) {
    return (
      <section className="mb-4 rounded-[26px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{merchantSettlementError}</span>
          <Link
            to={`/merchants/${merchantId}`}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-200"
          >
            {t("orders.openMerchantProfile")}
          </Link>
        </div>
      </section>
    );
  }

  if (!merchantSettlementSummary) {
    return null;
  }

  const operationsTotals = getMerchantOperationsTotals(
    merchantSettlementSummary.operationsSummary,
  );
  const inventorySummary = merchantSettlementSummary.inventorySummary || {};
  const payoutBalances = merchantSettlementSummary.payoutSummary?.balances || {};
  const pendingPayouts =
    merchantSettlementSummary.payoutSummary?.payouts?.filter(
      (payout) => String(payout.status).toUpperCase() === "PENDING",
    ) || [];
  const fulfillmentLabel =
    getFulfillmentSourceText(selectedMerchant?.fulfillmentMode) ||
    selectedMerchant?.fulfillmentMode ||
    t("orders.merchantFulfillment");

  const metricCards = [
    {
      label: t("orders.availableForWithdrawal"),
      value: formatPrice(payoutBalances.availableAmount || 0),
      subValue: `${formatMerchantPieces(payoutBalances.availableCommissionsCount)} ${t("orders.deliveredOrders")}`,
      icon: BanknotesIcon,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
    },
    {
      label: t("orders.pendingWithdrawalRequest"),
      value: formatPrice(payoutBalances.pendingPayoutAmount || 0),
      subValue: `${formatMerchantPieces(pendingPayouts.length)} ${t("orders.pendingWithdrawalRequest")}`,
      icon: ClockIcon,
      className:
        "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
    },
    {
      label: t("orders.transferred"),
      value: formatPrice(payoutBalances.paidAmount || 0),
      subValue: t("orders.paidAndClosed"),
      icon: CheckCircleIcon,
      className:
        "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
    },
    {
      label: t("orders.settlementInShipping"),
      value: formatPrice(operationsTotals.inShippingAmount),
      subValue: t("orders.piecesPending", { count: formatMerchantPieces(operationsTotals.inShippingPieces) }),
      icon: TruckIcon,
      className:
        "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100",
    },
    {
      label: t("orders.sellableBalance"),
      value: `${formatMerchantPieces(inventorySummary.availableForSale)} ${t("orders.pieces")}`,
      subValue: t("orders.reservedPieces", { count: formatMerchantPieces(inventorySummary.reservedQuantity) }),
      icon: CubeIcon,
      className:
        "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-100",
    },
    {
      label: t("orders.deliveredOrders"),
      value: `${formatMerchantPieces(operationsTotals.deliveredOrdersCount)} ${t("orders.orders2")}`,
      subValue: t("orders.piecesDue", { count: formatMerchantPieces(operationsTotals.payablePieces) }),
      icon: CheckCircleIcon,
      className:
        "border-emerald-200 bg-white text-emerald-900 dark:border-emerald-500/20 dark:bg-slate-900 dark:text-emerald-100",
    },
    {
      label: t("orders.settlementNotDelivered"),
      value: `${formatMerchantPieces(operationsTotals.notDeliveredOrdersCount)} ${t("orders.orders2")}`,
      subValue: formatPrice(operationsTotals.notDeliveredAmount),
      icon: ExclamationTriangleIcon,
      className:
        "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100",
    },
  ];

  return (
    <section className="mb-4 rounded-[26px] border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              <BanknotesIcon className="h-4 w-4" />
              {t("orders.merchantSettlementLabel")}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {fulfillmentLabel}
            </span>
            {inventorySummary.stockLocationLabel ? (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                {inventorySummary.stockLocationLabel}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
            {merchantName}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            {t("orders.merchantSettlementDesc")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClearMerchantFilters}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {t("orders.allMerchantOrders")}
          </button>
          <button
            type="button"
            onClick={onShowDueOrders}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            {t("orders.dueOrders")}
          </button>
          <Link
            to={`/merchants/${merchantId}`}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {t("orders.merchantProfile")}
          </Link>
          <Link
            to="/inventory"
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200"
          >
            {t("orders.inventory")}
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-2xl border p-3 ${card.className}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">{card.label}</p>
                <Icon className="h-4 w-4 opacity-70" />
              </div>
              <p className="mt-2 text-lg font-black">{card.value}</p>
              <p className="mt-1 text-[11px] opacity-75">{card.subValue}</p>
            </div>
          );
        })}
      </div>

      {pendingPayouts.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <span className="font-bold">
              {t("orders.pendingWithdrawalRequests", { count: formatMerchantPieces(pendingPayouts.length) })}
            </span>
            <span className="text-[11px] opacity-80">
              {t("orders.lastPayout")}: {payoutStatusLabels[pendingPayouts[0]?.status] || pendingPayouts[0]?.status} •{" "}
              {formatPrice(Number(pendingPayouts[0]?.amount || 0))}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default OrdersStatsBar;
