import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  Clock,
  CheckCircle2,
  Truck,
  Box,
  AlertTriangle,
} from "lucide-react";
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
      <section className="mb-4 rounded-xl border border-border/60 bg-card/60 p-4 shadow-xs">
        <div className="skeleton-shimmer h-24 rounded-lg" />
      </section>
    );
  }

  if (merchantSettlementError) {
    return (
      <section className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{merchantSettlementError}</span>
          <Link
            to={`/merchants/${merchantId}`}
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-destructive/20 bg-background px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-muted"
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
      icon: Banknote,
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    {
      label: t("orders.pendingWithdrawalRequest"),
      value: formatPrice(payoutBalances.pendingPayoutAmount || 0),
      subValue: `${formatMerchantPieces(pendingPayouts.length)} ${t("orders.pendingWithdrawalRequest")}`,
      icon: Clock,
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    {
      label: t("orders.transferred"),
      value: formatPrice(payoutBalances.paidAmount || 0),
      subValue: t("orders.paidAndClosed"),
      icon: CheckCircle2,
      className: "border-border/60 bg-muted/20 text-foreground",
    },
    {
      label: t("orders.settlementInShipping"),
      value: formatPrice(operationsTotals.inShippingAmount),
      subValue: t("orders.piecesPending", { count: formatMerchantPieces(operationsTotals.inShippingPieces) }),
      icon: Truck,
      className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    },
    {
      label: t("orders.sellableBalance"),
      value: `${formatMerchantPieces(inventorySummary.availableForSale)} ${t("orders.pieces")}`,
      subValue: t("orders.reservedPieces", { count: formatMerchantPieces(inventorySummary.reservedQuantity) }),
      icon: Box,
      className: "border-primary/20 bg-primary/10 text-primary",
    },
    {
      label: t("orders.deliveredOrders"),
      value: `${formatMerchantPieces(operationsTotals.deliveredOrdersCount)} ${t("orders.orders2")}`,
      subValue: t("orders.piecesDue", { count: formatMerchantPieces(operationsTotals.payablePieces) }),
      icon: CheckCircle2,
      className: "border-emerald-500/20 bg-muted/20 text-emerald-700 dark:text-emerald-300",
    },
    {
      label: t("orders.settlementNotDelivered"),
      value: `${formatMerchantPieces(operationsTotals.notDeliveredOrdersCount)} ${t("orders.orders2")}`,
      subValue: formatPrice(operationsTotals.notDeliveredAmount),
      icon: AlertTriangle,
      className: "border-destructive/20 bg-destructive/10 text-destructive",
    },
  ];

  return (
    <section className="mb-4 rounded-xl border border-border/70 bg-card p-4 text-card-foreground shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Banknote className="h-3.5 w-3.5" />
              {t("orders.merchantSettlementLabel")}
            </span>
            <span className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-foreground">
              {fulfillmentLabel}
            </span>
            {inventorySummary.stockLocationLabel ? (
              <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {inventorySummary.stockLocationLabel}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-lg font-bold text-foreground">
            {merchantName}
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            {t("orders.merchantSettlementDesc")}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onClearMerchantFilters}
            className="inline-flex min-h-[34px] items-center justify-center rounded-lg border border-border/70 bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            {t("orders.allMerchantOrders")}
          </button>
          <button
            type="button"
            onClick={onShowDueOrders}
            className="inline-flex min-h-[34px] items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            {t("orders.dueOrders")}
          </button>
          <Link
            to={`/merchants/${merchantId}`}
            className="inline-flex min-h-[34px] items-center justify-center rounded-lg border border-border/70 bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            {t("orders.merchantProfile")}
          </Link>
          <Link
            to="/inventory"
            className="inline-flex min-h-[34px] items-center justify-center rounded-lg border border-primary/20 bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary/20"
          >
            {t("orders.inventory")}
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-lg border p-2.5 sm:p-3 ${card.className}`}>
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-xs font-semibold truncate">{card.label}</p>
                <Icon className="h-3.5 w-3.5 opacity-70 shrink-0" />
              </div>
              <p className="mt-1.5 text-base font-bold font-mono tabular-nums leading-tight">{card.value}</p>
              <p className="mt-1 text-[11px] opacity-75 font-mono tabular-nums">{card.subValue}</p>
            </div>
          );
        })}
      </div>

      {pendingPayouts.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
            <span className="font-semibold">
              {t("orders.pendingWithdrawalRequests", { count: formatMerchantPieces(pendingPayouts.length) })}
            </span>
            <span className="text-[11px] opacity-80 font-mono tabular-nums">
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
