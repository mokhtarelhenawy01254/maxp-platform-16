import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useTheme } from "../../hooks/useTheme";
import {
  PlusIcon,
  PencilIcon,
  ShoppingBagIcon,
  EyeIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

interface Merchant {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  commissionRate: number;
  fulfillmentMode?: string | null;
  inventorySummary?: MerchantInventorySummary | null;
  operationsSummary?: MerchantOperationsSummary | null;
  _count: {
    orders: number;
  };
}

interface MerchantInventorySummary {
  linkedProducts: number;
  availableForSale: number;
  merchantProductStock: number;
  physicalQuantity: number;
  physicalAvailable: number;
  reservedQuantity: number;
  stockLocation: "MERCHANT" | "COMPANY_WAREHOUSE" | string;
  stockLocationLabel: string;
  warehouseNames?: string[];
}

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
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  operationStatus?: string;
  pieces?: number;
  merchantAmount?: number;
  payableAmount?: number;
  expectedAmount?: number;
}

interface MerchantOperationsSummary {
  summary?: Partial<MerchantOperationsTotals>;
  rows?: MerchantOperationRow[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface MerchantPayout {
  id: string;
  amount: string | number;
  currency?: string;
  status: "PENDING" | "PROCESSED" | "FAILED" | "CANCELLED" | string;
  paymentMethod: string;
  createdAt: string;
  processedAt?: string | null;
  merchant?: {
    id: string;
    name: string;
    email: string;
  };
  commissions?: Array<{
    id: string;
    amount: string | number;
    status: string;
    orderId?: string;
  }>;
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

const payoutStatusLabels: Record<string, string> = {
  PENDING: "قيد المراجعة",
  PROCESSED: "تم التحويل",
  FAILED: "فشل التحويل",
  CANCELLED: "ملغي",
};

const payoutStatusClasses = (status: string, isDark: boolean) => {
  if (status === "PROCESSED") {
    return isDark ? "bg-emerald-900/50 text-emerald-200" : "bg-emerald-100 text-emerald-800";
  }
  if (status === "PENDING") {
    return isDark ? "bg-amber-900/50 text-amber-200" : "bg-amber-100 text-amber-800";
  }
  if (status === "CANCELLED") {
    return isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700";
  }
  return isDark ? "bg-red-900/50 text-red-200" : "bg-red-100 text-red-800";
};

const formatMoney = (value: string | number | undefined, currency = "EGP") =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatPieces = (value: string | number | undefined) =>
  Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 0,
  });

const createEmptyOperationsTotals = (): MerchantOperationsTotals => ({
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
});

const getMerchantOperationsTotals = (
  merchant: Merchant,
): MerchantOperationsTotals => {
  const summary = merchant.operationsSummary?.summary || {};

  return {
    ...createEmptyOperationsTotals(),
    ...summary,
    assignedOrdersCount:
      summary.assignedOrdersCount ?? merchant._count?.orders ?? 0,
  };
};

const fulfillmentModeLabels: Record<string, string> = {
  MERCHANT: "التاجر يشحن",
  COMPANY_WAREHOUSE: "من مخزن الشركة",
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

const MerchantsList: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantPayouts, setMerchantPayouts] = useState<MerchantPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const [response, payoutsResponse] = await Promise.all([
        apiClient.get<ApiSuccess<Merchant[]>>("/merchants"),
        apiClient.get<ApiSuccess<MerchantPayout[]>>("/merchants/payouts"),
      ]);
      if (response.data.success) {
        setMerchants(response.data.data);
      }
      if (payoutsResponse.data.success) {
        setMerchantPayouts(payoutsResponse.data.data || []);
      }
    } catch (_error: unknown) {
      tToast.error("MerchantsList.error_error_2f2d");
    } finally {
      setLoading(false);
    }
  };

  const recordPayoutTransfer = async (payout: MerchantPayout) => {
    try {
      setProcessingPayoutId(payout.id);
      const response = await apiClient.post<ApiSuccess<MerchantPayout>>(
        `/merchants/payouts/${payout.id}/record-external`,
        {
          transactionId: `MERCH-PAYOUT-${Date.now()}`,
          externalReference: "merchant-admin-ui",
          notes: "تم تسجيل التحويل من صفحة إدارة التجار",
        },
      );

      if (response.data.success) {
        tToast.success("MerchantsList.success_login_3fe0");
        await loadMerchants();
      }
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "تعذر تسجيل تحويل مستحقات التاجر"),
      );
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const cancelPayout = async (payout: MerchantPayout) => {
    try {
      setProcessingPayoutId(payout.id);
      const response = await apiClient.post<ApiSuccess<MerchantPayout>>(
        `/merchants/payouts/${payout.id}/cancel`,
        {
          reason: "تم إلغاء طلب السحب من صفحة إدارة التجار",
        },
      );

      if (response.data.success) {
        tToast.success("MerchantsList.msg_8395");
        await loadMerchants();
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "تعذر إلغاء طلب السحب"));
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const payoutTotals = merchantPayouts.reduce(
    (totals, payout) => {
      const amount = Number(payout.amount || 0);
      totals.total += amount;
      if (payout.status === "PENDING") totals.pending += amount;
      if (payout.status === "PROCESSED") totals.processed += amount;
      return totals;
    },
    { total: 0, pending: 0, processed: 0 },
  );

  const operationsTotals = merchants.reduce((totals, merchant) => {
    const merchantTotals = getMerchantOperationsTotals(merchant);

    totals.assignedOrdersCount += merchantTotals.assignedOrdersCount;
    totals.assignedPieces += merchantTotals.assignedPieces;
    totals.preparationOrdersCount += merchantTotals.preparationOrdersCount;
    totals.preparationPieces += merchantTotals.preparationPieces;
    totals.inShippingOrdersCount += merchantTotals.inShippingOrdersCount;
    totals.inShippingPieces += merchantTotals.inShippingPieces;
    totals.deliveredOrdersCount += merchantTotals.deliveredOrdersCount;
    totals.deliveredPieces += merchantTotals.deliveredPieces;
    totals.notDeliveredOrdersCount += merchantTotals.notDeliveredOrdersCount;
    totals.notDeliveredPieces += merchantTotals.notDeliveredPieces;
    totals.payablePieces += merchantTotals.payablePieces;
    totals.pendingPayablePieces += merchantTotals.pendingPayablePieces;
    totals.expectedReceivableAmount += merchantTotals.expectedReceivableAmount;
    totals.inShippingAmount += merchantTotals.inShippingAmount;
    totals.deliveredPayableAmount += merchantTotals.deliveredPayableAmount;
    totals.notDeliveredAmount += merchantTotals.notDeliveredAmount;
    totals.shippingCostAmount += merchantTotals.shippingCostAmount;
    totals.confirmedCommissionAmount += merchantTotals.confirmedCommissionAmount;
    totals.pendingCommissionAmount += merchantTotals.pendingCommissionAmount;
    totals.paidAmount += merchantTotals.paidAmount;

    return totals;
  }, createEmptyOperationsTotals());

  const inventoryTotals = merchants.reduce(
    (totals, merchant) => {
      totals.linkedProducts += merchant.inventorySummary?.linkedProducts || 0;
      totals.availableForSale += merchant.inventorySummary?.availableForSale || 0;
      totals.reservedQuantity += merchant.inventorySummary?.reservedQuantity || 0;
      return totals;
    },
    {
      linkedProducts: 0,
      availableForSale: 0,
      reservedQuantity: 0,
    },
  );

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}
    >
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1
              className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              التجار
            </h1>
            <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mt-2`}>
              إدارة تجار الدروب شيبنج
            </p>
          </div>
          <button
            onClick={() => navigate("/merchants/new")}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <PlusIcon className="h-5 w-5" />
            إضافة تاجر
          </button>
        </div>

        <section
          className={`mb-6 rounded-lg border p-5 shadow-sm ${
            isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2
                className={`text-xl font-black ${isDark ? "text-white" : "text-gray-900"}`}
              >
                مركز تشغيل التجار
              </h2>
              <p className={`mt-1 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                الشركة تتابع مخزون التجار وطلباتهم ومستحقاتهم من نفس أدوات
                الطلبات والمخزون والمنتجات.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["/orders", "الطلبات الموحدة"],
                ["/inventory", "المخزون الموحد"],
                ["/products", "المنتجات"],
              ].map(([to, label]) => (
                <Link
                  key={to}
                  to={to}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    isDark
                      ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["التجار النشطين", formatPieces(merchants.filter((merchant) => merchant.isActive).length)],
              ["رصيد قابل للبيع", `${formatPieces(inventoryTotals.availableForSale)} قطعة`],
              ["طلبات مسندة للتجار", formatPieces(operationsTotals.assignedOrdersCount)],
              ["مستحق بعد التسليم", formatMoney(operationsTotals.deliveredPayableAmount)],
              ["قيد التجهيز", `${formatPieces(operationsTotals.preparationOrdersCount)} طلب`],
              ["في الشحن", `${formatPieces(operationsTotals.inShippingOrdersCount)} طلب`],
              ["تم التسليم", `${formatPieces(operationsTotals.deliveredOrdersCount)} طلب`],
              ["مرتجع أو لم يسلم", `${formatPieces(operationsTotals.notDeliveredOrdersCount)} طلب`],
            ].map(([label, value]) => (
              <div
                key={label}
                className={`rounded-lg border p-4 ${
                  isDark
                    ? "border-gray-700 bg-gray-900/40"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {label}
                </p>
                <p
                  className={`mt-1 text-2xl font-black ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {merchants.length > 0 ? (
          <div
            className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow overflow-hidden`}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={isDark ? "bg-gray-700" : "bg-gray-50"}>
                  <tr>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      الاسم
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      البريد الإلكتروني
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      الهاتف
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      نسبة العمولة
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      التنفيذ
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      المخزون
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      الطلبات والتشغيل
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      الحالة
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`${isDark ? "bg-gray-800 divide-gray-700" : "bg-white divide-gray-200"} divide-y`}
                >
                  {merchants.map((merchant) => {
                    const merchantOperations = getMerchantOperationsTotals(merchant);

                    return (
                      <tr
                        key={merchant.id}
                        className={
                          isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"
                        }
                      >
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        {merchant.name}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        {merchant.email}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        {merchant.phone || "-"}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        {merchant.commissionRate}%
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        {fulfillmentModeLabels[merchant.fulfillmentMode || "MERCHANT"] ||
                          merchant.fulfillmentMode ||
                          "التاجر يشحن"}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}>
                        <div className="font-bold">
                          {formatPieces(merchant.inventorySummary?.availableForSale)} قطعة
                        </div>
                        <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {merchant.inventorySummary?.stockLocationLabel || "عند التاجر"}
                          {merchant.inventorySummary?.reservedQuantity
                            ? ` | محجوز ${formatPieces(merchant.inventorySummary.reservedQuantity)}`
                            : ""}
                        </div>
                        {merchant.inventorySummary?.warehouseNames?.length ? (
                          <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            {merchant.inventorySummary.warehouseNames.join("، ")}
                          </div>
                        ) : null}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        <div className="font-bold">
                          {formatPieces(merchantOperations.assignedOrdersCount)} طلب
                        </div>
                        <div
                          className={`mt-1 grid min-w-[220px] grid-cols-2 gap-x-3 gap-y-1 text-xs ${
                            isDark ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          <span>تجهيز {formatPieces(merchantOperations.preparationOrdersCount)}</span>
                          <span>شحن {formatPieces(merchantOperations.inShippingOrdersCount)}</span>
                          <span>اتسلم {formatPieces(merchantOperations.deliveredOrdersCount)}</span>
                          <span>لم يسلم {formatPieces(merchantOperations.notDeliveredOrdersCount)}</span>
                        </div>
                        <div className={`mt-1 text-xs ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                          مستحق مسلم: {formatMoney(merchantOperations.deliveredPayableAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            merchant.isActive
                              ? isDark
                                ? "bg-green-900/50 text-green-300"
                                : "bg-green-100 text-green-800"
                              : isDark
                                ? "bg-red-900/50 text-red-300"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {merchant.isActive ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              navigate(`/merchants/${merchant.id}`)
                            }
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                          >
                            <EyeIcon className="h-4 w-4" />
                            عرض
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/merchants/${merchant.id}/edit`)
                            }
                            className={`flex items-center gap-1 transition ${
                              isDark
                                ? "text-gray-400 hover:text-gray-300"
                                : "text-gray-600 hover:text-gray-800"
                            }`}
                          >
                            <PencilIcon className="h-4 w-4" />
                            تعديل
                          </button>
                          <Link
                            to="/orders"
                            className={isDark ? "text-indigo-300 hover:text-indigo-200" : "text-indigo-600 hover:text-indigo-800"}
                          >
                            الطلبات
                          </Link>
                          <Link
                            to="/inventory"
                            className={isDark ? "text-emerald-300 hover:text-emerald-200" : "text-emerald-600 hover:text-emerald-800"}
                          >
                            المخزون
                          </Link>
                          <Link
                            to="/products"
                            className={isDark ? "text-amber-300 hover:text-amber-200" : "text-amber-600 hover:text-amber-800"}
                          >
                            المنتجات
                          </Link>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            className={`text-center py-12 rounded-lg shadow ${isDark ? "bg-gray-800" : "bg-white"}`}
          >
            <ShoppingBagIcon
              className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}
            />
            <p className={`mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              لا يوجد تجار بعد
            </p>
            <button
              onClick={() => navigate("/merchants/new")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              إضافة تاجر
            </button>
          </div>
        )}

        <section
          className={`mt-8 rounded-lg shadow overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}
        >
          <div className="flex flex-col gap-4 border-b px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BanknotesIcon className="h-6 w-6 text-emerald-600" />
                <h2
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  مستحقات التجار
                </h2>
              </div>
              <p className={`mt-1 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                طلبات السحب المبنية على الطلبات المسلمة فقط، مع فصل المعلق عن المحول.
              </p>
            </div>
            <button
              type="button"
              onClick={loadMerchants}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              تحديث المستحقات
            </button>
          </div>

          <div className="grid gap-3 px-6 py-5 md:grid-cols-3">
            {[
              ["إجمالي طلبات السحب", formatMoney(payoutTotals.total)],
              ["قيد المراجعة", formatMoney(payoutTotals.pending)],
              ["تم تحويله", formatMoney(payoutTotals.processed)],
            ].map(([label, value]) => (
              <div
                key={label}
                className={`rounded-lg border p-4 ${isDark ? "border-gray-700 bg-gray-900/40" : "border-gray-100 bg-gray-50"}`}
              >
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {label}
                </p>
                <p
                  className={`mt-1 text-2xl font-black ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {merchantPayouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={isDark ? "bg-gray-700" : "bg-gray-50"}>
                  <tr>
                    {["التاجر", "تاريخ الطلب", "الحالة", "الطريقة", "عدد العمولات", "المبلغ", "إجراء"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? "text-gray-300" : "text-gray-500"}`}
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody
                  className={`${isDark ? "bg-gray-800 divide-gray-700" : "bg-white divide-gray-200"} divide-y`}
                >
                  {merchantPayouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className={isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}
                    >
                      <td className={`px-6 py-4 text-sm font-medium ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                        <div>{payout.merchant?.name || "تاجر"}</div>
                        <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {payout.merchant?.email || "-"}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}>
                        {new Date(payout.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${payoutStatusClasses(
                            payout.status,
                            isDark,
                          )}`}
                        >
                          {payoutStatusLabels[payout.status] || payout.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}>
                        {payout.paymentMethod}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}>
                        {payout.commissions?.length || 0}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                        {formatMoney(payout.amount, payout.currency || "EGP")}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {payout.status === "PENDING" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => recordPayoutTransfer(payout)}
                              disabled={processingPayoutId === payout.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                              تسجيل تحويل
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelPayout(payout)}
                              disabled={processingPayoutId === payout.id}
                              className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${
                                isDark
                                  ? "bg-red-900/50 text-red-100 hover:bg-red-900"
                                  : "bg-red-50 text-red-700 hover:bg-red-100"
                              }`}
                            >
                              <XCircleIcon className="h-4 w-4" />
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                            لا يوجد إجراء
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 pb-6">
              <p className={`rounded-lg border p-6 text-center ${isDark ? "border-gray-700 text-gray-400" : "border-gray-100 text-gray-500"}`}>
                لا توجد طلبات سحب للتجار حتى الآن.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MerchantsList;
