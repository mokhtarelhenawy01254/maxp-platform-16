import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  CubeIcon,
  TruckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type { MerchantOperationsTotals } from "./merchantTypes";

interface MerchantOperationsKpisProps {
  totals: MerchantOperationsTotals;
  formatPrice: (value: number | null | undefined) => string;
}

export const MerchantOperationsKpis: React.FC<MerchantOperationsKpisProps> = ({
  totals,
  formatPrice,
}) => {
  const { t } = useTranslation();

  const statCards = useMemo(
    () => [
      {
        label: t("merchant.statCards.inShipping"),
        value: totals.inShippingPieces,
        subValue: t("merchant.statSubValues.ordersCount", { count: totals.inShippingOrdersCount }),
        icon: TruckIcon,
        className:
          "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
      },
      {
        label: t("merchant.statCards.delivered"),
        value: totals.deliveredPieces,
        subValue: t("merchant.statSubValues.ordersCount", { count: totals.deliveredOrdersCount }),
        icon: CheckCircleIcon,
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
      },
      {
        label: t("merchant.statCards.payable"),
        value: totals.payablePieces,
        subValue: t("merchant.statSubValues.piecesCount", { count: totals.pendingPayablePieces }),
        icon: CubeIcon,
        className:
          "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200",
      },
      {
        label: t("merchant.statCards.notCompleted"),
        value: totals.notDeliveredPieces,
        subValue: t("merchant.statSubValues.ordersCount", { count: totals.notDeliveredOrdersCount }),
        icon: XCircleIcon,
        className:
          "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
      },
    ],
    [t, totals],
  );

  const moneyCards = useMemo(
    () => [
      {
        label: t("merchant.moneyCards.expectedForMerchant"),
        value: formatPrice(totals.expectedReceivableAmount),
        subValue: t("merchant.statSubValues.piecesAssigned", { count: totals.assignedPieces }),
        icon: ClockIcon,
        className:
          "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-100",
      },
      {
        label: t("merchant.moneyCards.dueAfterDelivery"),
        value: formatPrice(totals.deliveredPayableAmount),
        subValue: t("merchant.statSubValues.piecesCount", { count: totals.payablePieces }),
        icon: BanknotesIcon,
        className:
          "border-emerald-200 bg-white text-emerald-900 dark:border-emerald-800 dark:bg-slate-850 dark:text-emerald-300",
      },
      {
        label: t("merchant.moneyCards.inShippingValue"),
        value: formatPrice(totals.inShippingAmount),
        subValue: t("merchant.statSubValues.piecesCount", { count: totals.inShippingPieces }),
        icon: TruckIcon,
        className:
          "border-sky-200 bg-white text-sky-900 dark:border-sky-800 dark:bg-slate-850 dark:text-sky-300",
      },
      {
        label: t("merchant.moneyCards.shippingCost"),
        value: formatPrice(totals.shippingCostAmount),
        subValue:
          totals.paidAmount > 0
            ? t("merchant.moneyCards.paid", { amount: formatPrice(totals.paidAmount) })
            : t("merchant.moneyCards.noPaymentsRecorded"),
        icon: BanknotesIcon,
        className:
          "border-amber-200 bg-white text-amber-900 dark:border-amber-800 dark:bg-slate-850 dark:text-amber-300",
      },
    ],
    [formatPrice, t, totals],
  );

  return (
    <div className="space-y-3">
      {/* Pieces & operations counts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl border p-4 ${card.className}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{card.label}</p>
                <Icon className="h-5 w-5 opacity-70" />
              </div>
              <p className="mt-3 text-2xl font-mono font-bold tabular-nums">
                {card.value}
              </p>
              <p className="mt-1 text-xs opacity-75">{card.subValue}</p>
            </div>
          );
        })}
      </div>

      {/* Financial amounts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {moneyCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl border p-4 ${card.className}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{card.label}</p>
                <Icon className="h-5 w-5 opacity-70" />
              </div>
              <p className="mt-3 text-xl font-mono font-bold tabular-nums">
                {card.value}
              </p>
              <p className="mt-1 text-xs opacity-75">{card.subValue}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MerchantOperationsKpis;
