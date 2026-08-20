import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  CubeIcon,
  TruckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../../../services/apiClient";
import { getApiErrorMessage } from "../helpers";

type MerchantOperationStatus =
  | "PREPARATION"
  | "IN_SHIPPING"
  | "DELIVERED"
  | "NOT_DELIVERED";

interface MerchantOperationsTotals {
  assignedOrdersCount: number;
  assignedPieces: number;
  preparationOrdersCount: number;
  preparationPieces: number;
  inShippingOrdersCount: number;
  inShippingPieces: number;
  deliveredOrdersCount: number;
  deliveredPieces: number;
  notDeliveredOrdersCount: number;
  notDeliveredPieces: number;
  payablePieces: number;
  pendingPayablePieces: number;
  expectedReceivableAmount: number;
  inShippingAmount: number;
  deliveredPayableAmount: number;
  notDeliveredAmount: number;
  shippingCostAmount: number;
  confirmedCommissionAmount: number;
  pendingCommissionAmount: number;
  paidAmount: number;
}

interface MerchantOperationRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  fulfillmentSource: string;
  warehouseName?: string | null;
  shippingCompanyName?: string | null;
  trackingNumber?: string | null;
  merchantOrderStatus: string;
  shipmentStatus?: string;
  orderStatus?: string;
  operationStatus: MerchantOperationStatus;
  pieces: number;
  merchantAmount: number;
  commissionAmount: number;
  shippingCost: number;
  payablePieces: number;
  pendingPayablePieces: number;
  payableAmount: number;
  expectedAmount: number;
}

interface MerchantOperationsResponse {
  success?: boolean;
  data?: {
    summary?: Partial<MerchantOperationsTotals>;
    rows?: MerchantOperationRow[];
  };
  message?: string;
}

interface MerchantOperationsSummaryProps {
  formatPrice: (value: number | null | undefined) => string;
  formatDate: (value: string | Date | number) => string;
}

const EMPTY_TOTALS: MerchantOperationsTotals = {
  assignedOrdersCount: 0,
  assignedPieces: 0,
  preparationOrdersCount: 0,
  preparationPieces: 0,
  inShippingOrdersCount: 0,
  inShippingPieces: 0,
  deliveredOrdersCount: 0,
  deliveredPieces: 0,
  notDeliveredOrdersCount: 0,
  notDeliveredPieces: 0,
  payablePieces: 0,
  pendingPayablePieces: 0,
  expectedReceivableAmount: 0,
  inShippingAmount: 0,
  deliveredPayableAmount: 0,
  notDeliveredAmount: 0,
  shippingCostAmount: 0,
  confirmedCommissionAmount: 0,
  pendingCommissionAmount: 0,
  paidAmount: 0,
};

const STATUS_LABEL_KEYS: Record<MerchantOperationStatus, string> = {
  PREPARATION: "merchant.statuses.PREPARATION",
  IN_SHIPPING: "merchant.statuses.IN_SHIPPING",
  DELIVERED: "merchant.statuses.DELIVERED",
  NOT_DELIVERED: "merchant.statuses.NOT_DELIVERED",
};

const STATUS_CLASSES: Record<MerchantOperationStatus, string> = {
  PREPARATION: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  IN_SHIPPING: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
  NOT_DELIVERED: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300",
};

const toNumber = (value: unknown) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const MerchantOperationsSummary = ({
  formatPrice,
  formatDate,
}: MerchantOperationsSummaryProps) => {
  const { t } = useTranslation();
  const [totals, setTotals] = useState<MerchantOperationsTotals>(EMPTY_TOTALS);
  const [rows, setRows] = useState<MerchantOperationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchSummary = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const response = await apiClient.get<MerchantOperationsResponse>(
        "/merchant-portal/operations-summary",
      );
      const payload = response.data?.data || {};

      setTotals({
        ...EMPTY_TOTALS,
        ...(payload.summary || {}),
      });
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
    } catch (fetchError: unknown) {
      console.error("Failed to load merchant operations summary:", fetchError);
      setError(getApiErrorMessage(fetchError) || t("merchant.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const statCards = useMemo(
    () => [
      {
        label: t("merchant.statCards.inShipping"),
        value: totals.inShippingPieces,
        subValue: t("merchant.statSubValues.ordersCount", { count: totals.inShippingOrdersCount }),
        icon: TruckIcon,
        className: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-200",
      },
      {
        label: t("merchant.statCards.delivered"),
        value: totals.deliveredPieces,
        subValue: t("merchant.statSubValues.ordersCount", { count: totals.deliveredOrdersCount }),
        icon: CheckCircleIcon,
        className: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200",
      },
      {
        label: t("merchant.statCards.payable"),
        value: totals.payablePieces,
        subValue: t("merchant.statSubValues.piecesCount", { count: totals.pendingPayablePieces }),
        icon: CubeIcon,
        className: "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200",
      },
      {
        label: t("merchant.statCards.notCompleted"),
        value: totals.notDeliveredPieces,
        subValue: t("merchant.statSubValues.ordersCount", { count: totals.notDeliveredOrdersCount }),
        icon: XCircleIcon,
        className: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200",
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
        className: "border-slate-200 bg-white text-slate-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
      },
      {
        label: t("merchant.moneyCards.dueAfterDelivery"),
        value: formatPrice(totals.deliveredPayableAmount),
        subValue: t("merchant.statSubValues.piecesCount", { count: totals.payablePieces }),
        icon: BanknotesIcon,
        className: "border-emerald-200 bg-white text-emerald-900 dark:border-emerald-800 dark:bg-gray-800 dark:text-emerald-200",
      },
      {
        label: t("merchant.moneyCards.inShippingValue"),
        value: formatPrice(totals.inShippingAmount),
        subValue: t("merchant.statSubValues.piecesCount", { count: totals.inShippingPieces }),
        icon: TruckIcon,
        className: "border-sky-200 bg-white text-sky-900 dark:border-sky-800 dark:bg-gray-800 dark:text-sky-200",
      },
      {
        label: t("merchant.moneyCards.shippingCost"),
        value: formatPrice(totals.shippingCostAmount),
        subValue: totals.paidAmount > 0 ? t("merchant.moneyCards.paid", { amount: formatPrice(totals.paidAmount) }) : t("merchant.moneyCards.noPaymentsRecorded"),
        icon: BanknotesIcon,
        className: "border-amber-200 bg-white text-amber-900 dark:border-amber-800 dark:bg-gray-800 dark:text-amber-200",
      },
    ],
    [formatPrice, t, totals],
  );

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700" />
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("merchant.title")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("merchant.summaryDesc", { ordersCount: totals.assignedOrdersCount, piecesCount: totals.preparationPieces })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchSummary(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("merchant.refresh")}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

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
              <p className="mt-3 text-2xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs opacity-75">{card.subValue}</p>
            </div>
          );
        })}
      </div>

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
              <p className="mt-3 text-xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs opacity-75">{card.subValue}</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-100 text-sm max-sm:hidden dark:divide-gray-700">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-right font-medium">{t("merchant.table.order")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("merchant.table.status")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("merchant.table.shipping")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("merchant.table.pieces")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("merchant.table.expected")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("merchant.table.due")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={6}>
                  {t("merchant.table.noOrders")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{row.orderNumber}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {row.customerName} • {formatDate(row.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[row.operationStatus]}`}
                    >
                      {t(STATUS_LABEL_KEYS[row.operationStatus])}
                    </span>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t("merchant.table.merchantOrderStatus", { status: row.merchantOrderStatus || "---" })}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    <p>{row.shippingCompanyName || t("merchant.table.noShippingCompany")}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.trackingNumber || row.shipmentStatus || "---"}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                    {toNumber(row.pieces)}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                    {formatPrice(row.expectedAmount)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatPrice(row.payableAmount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Mobile card view for merchant operations */}
        <div className="divide-y divide-gray-100 sm:hidden dark:divide-gray-700">
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("merchant.table.noOrders")}
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{row.orderNumber}</p>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASSES[row.operationStatus]}`}
                  >
                    {t(STATUS_LABEL_KEYS[row.operationStatus])}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {row.customerName} • {formatDate(row.createdAt)}
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                  <div className="rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-700">
                    <p className="text-gray-400 dark:text-gray-500">{t("merchant.table.pieces")}</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{toNumber(row.pieces)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-700">
                    <p className="text-gray-400 dark:text-gray-500">{t("merchant.table.expected")}</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatPrice(row.expectedAmount)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-2 py-1.5 dark:bg-emerald-900/20">
                    <p className="text-emerald-600 dark:text-emerald-400">{t("merchant.table.due")}</p>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">{formatPrice(row.payableAmount)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default MerchantOperationsSummary;
