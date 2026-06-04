import { useCallback, useEffect, useMemo, useState } from "react";
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

const STATUS_LABELS: Record<MerchantOperationStatus, string> = {
  PREPARATION: "تحت التجهيز",
  IN_SHIPPING: "في الشحن",
  DELIVERED: "اتسلم",
  NOT_DELIVERED: "لم يكتمل",
};

const STATUS_CLASSES: Record<MerchantOperationStatus, string> = {
  PREPARATION: "border-amber-200 bg-amber-50 text-amber-800",
  IN_SHIPPING: "border-sky-200 bg-sky-50 text-sky-800",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  NOT_DELIVERED: "border-rose-200 bg-rose-50 text-rose-800",
};

const toNumber = (value: unknown) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const MerchantOperationsSummary = ({
  formatPrice,
  formatDate,
}: MerchantOperationsSummaryProps) => {
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
      setError(getApiErrorMessage(fetchError) || "تعذر تحميل ملخص التاجر");
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
        label: "قطع في الشحن",
        value: totals.inShippingPieces,
        subValue: `${totals.inShippingOrdersCount} طلب`,
        icon: TruckIcon,
        className: "border-sky-200 bg-sky-50 text-sky-900",
      },
      {
        label: "قطع اتسلمت",
        value: totals.deliveredPieces,
        subValue: `${totals.deliveredOrdersCount} طلب`,
        icon: CheckCircleIcon,
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
      },
      {
        label: "قطع مستحقة",
        value: totals.payablePieces,
        subValue: `${totals.pendingPayablePieces} قطعة معلقة`,
        icon: CubeIcon,
        className: "border-indigo-200 bg-indigo-50 text-indigo-900",
      },
      {
        label: "لم تكتمل",
        value: totals.notDeliveredPieces,
        subValue: `${totals.notDeliveredOrdersCount} طلب`,
        icon: XCircleIcon,
        className: "border-rose-200 bg-rose-50 text-rose-900",
      },
    ],
    [totals],
  );

  const moneyCards = useMemo(
    () => [
      {
        label: "المتوقع للتاجر",
        value: formatPrice(totals.expectedReceivableAmount),
        subValue: `${totals.assignedPieces} قطعة مخصصة`,
        icon: ClockIcon,
        className: "border-slate-200 bg-white text-slate-900",
      },
      {
        label: "مستحق بعد التسليم",
        value: formatPrice(totals.deliveredPayableAmount),
        subValue: `${totals.payablePieces} قطعة`,
        icon: BanknotesIcon,
        className: "border-emerald-200 bg-white text-emerald-900",
      },
      {
        label: "قيمة في الشحن",
        value: formatPrice(totals.inShippingAmount),
        subValue: `${totals.inShippingPieces} قطعة`,
        icon: TruckIcon,
        className: "border-sky-200 bg-white text-sky-900",
      },
      {
        label: "تكلفة شحن مسجلة",
        value: formatPrice(totals.shippingCostAmount),
        subValue: `${totals.paidAmount > 0 ? `مدفوع ${formatPrice(totals.paidAmount)}` : "لم تسجل دفعات"}`,
        icon: BanknotesIcon,
        className: "border-amber-200 bg-white text-amber-900",
      },
    ],
    [formatPrice, totals],
  );

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            شحن وتسوية التاجر
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {totals.assignedOrdersCount} طلب مخصص • {totals.preparationPieces} قطعة تحت التجهيز
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchSummary(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 text-right font-medium">الطلب</th>
              <th className="px-4 py-3 text-right font-medium">الحالة</th>
              <th className="px-4 py-3 text-right font-medium">الشحن</th>
              <th className="px-4 py-3 text-right font-medium">القطع</th>
              <th className="px-4 py-3 text-right font-medium">المتوقع</th>
              <th className="px-4 py-3 text-right font-medium">المستحق</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                  لا توجد طلبات تاجر للتسوية الآن
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{row.orderNumber}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.customerName} • {formatDate(row.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[row.operationStatus]}`}
                    >
                      {STATUS_LABELS[row.operationStatus]}
                    </span>
                    <p className="mt-2 text-xs text-gray-500">
                      طلب التاجر: {row.merchantOrderStatus || "---"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <p>{row.shippingCompanyName || "بدون شركة شحن"}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.trackingNumber || row.shipmentStatus || "---"}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {toNumber(row.pieces)}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {formatPrice(row.expectedAmount)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">
                    {formatPrice(row.payableAmount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default MerchantOperationsSummary;
