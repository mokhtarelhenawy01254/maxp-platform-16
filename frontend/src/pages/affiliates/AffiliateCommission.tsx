import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import toast from "react-hot-toast";
import {
  BanknotesIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

type MoneyValue = number | string | null | undefined;

interface AffiliateCommissionProfile {
  pendingEarnings?: MoneyValue;
  totalEarnings?: MoneyValue;
  paidEarnings?: MoneyValue;
  minPayout?: MoneyValue;
  payoutSlaDays?: number | string | null;
}

interface AffiliatePayout {
  id: string;
  amount: MoneyValue;
  status: string;
  paymentMethod?: string | null;
  notes?: string | null;
  proofFileUrl?: string | null;
  createdAt: string;
}

interface AffiliateCommissionItem {
  id: string;
  amount: MoneyValue;
  status: string;
  createdAt: string;
  orderTotal?: MoneyValue;
  order?: {
    orderNumber?: string | null;
    status?: string | null;
  } | null;
}

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

const toNumber = (value: MoneyValue): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const AffiliateCommission: React.FC = () => {
  const { formatPrice } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<AffiliateCommissionProfile | null>(
    null,
  );
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommissionItem[]>([]);
  const [expectedCommission, setExpectedCommission] = useState(0);

  // Payout Modal State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [affiliateRes, payoutsRes, commissionsRes] = await Promise.all([
        apiClient.get<ApiSuccess<AffiliateCommissionProfile>>("/affiliates/me"),
        apiClient.get<ApiSuccess<AffiliatePayout[]>>("/affiliates/payouts"),
        apiClient.get<
          ApiSuccess<
            AffiliateCommissionItem[] | { commissions?: AffiliateCommissionItem[] }
          >
        >(
          "/affiliates/commissions?limit=20",
        ), // Get recent commissions
      ]);

      if (affiliateRes.data.success) {
        setAffiliate(affiliateRes.data.data);
      }

      if (payoutsRes.data.success) {
        setPayouts(payoutsRes.data.data);
      }

      if (commissionsRes.data.success) {
        const commissionsData = Array.isArray(commissionsRes.data.data)
          ? commissionsRes.data.data
          : commissionsRes.data.data?.commissions || [];
        setCommissions(commissionsData);

        // حساب العمولة المتوقعة من الطلبات غير المستلمة
        const expectedAmount = commissionsData
          .filter((comm) => {
            const status = comm.order?.status || comm.status;
            // الطلبات التي لم تُستلم بعد: PENDING, CONFIRMED, PROCESSING, SHIPPED
            return ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"].includes(
              status,
            );
          })
          .reduce(
            (sum, comm) => sum + toNumber(comm.amount),
            0,
          );

        setExpectedCommission(expectedAmount);
      }
    } catch (error: unknown) {
      console.error("Error loading commission data:", error);
      toast.error(getApiErrorMessage(error, "حدث خطأ أثناء تحميل البيانات"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestedAmount = Number(payoutAmount);
    const minimumPayout = toNumber(affiliate?.minPayout || 100);
    const availablePayoutAmount = toNumber(affiliate?.pendingEarnings);

    if (!payoutAmount || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      toast.error("الرجاء إدخال مبلغ صالح");
      return;
    }

    if (requestedAmount < minimumPayout) {
      toast.error(`الحد الأدنى للسحب هو ${formatPrice(minimumPayout)}`);
      return;
    }

    if (Math.abs(requestedAmount - availablePayoutAmount) > 0.009) {
      toast.error("يمكن طلب سحب الرصيد المتاح بالكامل فقط حالياً");
      return;
    }

    try {
      setSubmittingPayout(true);
      const response = await apiClient.post<
        ApiSuccess<unknown>,
        {
          amount: number;
          paymentMethod: string;
          paymentDetails: { note: string };
        }
      >("/affiliates/payout-request", {
        amount: requestedAmount,
        paymentMethod,
        paymentDetails: { note: paymentDetails },
      });

      if (response.data.success) {
        toast.success("تم إرسال طلب السحب بنجاح");
        setShowPayoutModal(false);
        setPayoutAmount("");
        setPaymentDetails("");
        loadData(); // Reload data to update balance
      }
    } catch (error: unknown) {
      console.error("Error requesting payout:", error);
      toast.error(getApiErrorMessage(error, "فشل طلب السحب"));
    } finally {
      setSubmittingPayout(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
      case "PENDING":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "PAID":
      case "PROCESSED":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
      case "CANCELLED":
        return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "مؤكدة";
      case "PENDING":
        return "قيد الانتظار"; // For payouts
      case "PAID":
      case "PROCESSED":
        return "تم الدفع";
      case "PAID_EXTERNAL":
        return "تم الدفع";
      case "PROCESSING":
        return "قيد المعالجة";
      case "CANCELLED":
        return "ملغية";
      case "FAILED":
        return "فشل";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 px-3 pb-24 pt-4 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            العمولات والأرباح
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            متابعة الأرباح وطلبات السحب
          </p>
        </div>
        <button
          onClick={() => {
            const availableAmount = toNumber(affiliate?.pendingEarnings);
            setPayoutAmount(availableAmount.toFixed(2));
            setShowPayoutModal(true);
          }}
          disabled={
            toNumber(affiliate?.pendingEarnings) <
            toNumber(affiliate?.minPayout || 100)
          }
          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:w-auto ${
            toNumber(affiliate?.pendingEarnings) >=
            toNumber(affiliate?.minPayout || 100)
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-300 cursor-not-allowed text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          }`}
        >
          <BanknotesIcon className="w-5 h-5" />
          طلب سحب الرصيد
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
        {/* Withdrawable Balance */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:text-sm">
                الرصيد القابل للسحب
              </p>
              <h3 className="mt-2 text-2xl font-bold text-green-600 sm:text-3xl">
                {formatPrice(toNumber(affiliate?.pendingEarnings))}
              </h3>
            </div>
            <div className="hidden rounded-lg bg-green-50 p-3 dark:bg-green-900/20 sm:block">
              <BanknotesIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            الحد الأدنى للسحب: {formatPrice(toNumber(affiliate?.minPayout || 100))}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            مدة معالجة السحب: {affiliate?.payoutSlaDays || 3} أيام
          </p>
        </div>

        {/* Expected Commission */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:text-sm">
                العمولة المتوقعة
              </p>
              <h3 className="mt-2 text-2xl font-bold text-orange-600 sm:text-3xl">
                {formatPrice(expectedCommission)}
              </h3>
            </div>
            <div className="hidden rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20 sm:block">
              <ClockIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            من الطلبات التي لم تُستلم بعد
          </p>
        </div>

        {/* Total Earnings */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:text-sm">
                إجمالي الأرباح
              </p>
              <h3 className="mt-2 text-2xl font-bold text-blue-600 sm:text-3xl">
                {formatPrice(toNumber(affiliate?.totalEarnings))}
              </h3>
            </div>
            <div className="hidden rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20 sm:block">
              <ArrowTrendingUpIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">منذ بداية العمل</p>
        </div>

        {/* Paid Earnings */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:text-sm">
                تم صرفه
              </p>
              <h3 className="mt-2 text-2xl font-bold text-purple-600 sm:text-3xl">
                {formatPrice(toNumber(affiliate?.paidEarnings))}
              </h3>
            </div>
            <div className="hidden rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20 sm:block">
              <CreditCardIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">إجمالي المبالغ المحولة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payouts */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-gray-500" />
              سجل طلبات السحب
            </h3>
          </div>
          <div className="p-3 md:p-0">
            {payouts.length > 0 ? (
              <table className="block w-full text-right text-sm md:table md:divide-y md:divide-gray-100 dark:md:divide-gray-700">
                <thead className="hidden bg-gray-50 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400 md:table-header-group">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">طريقة الدفع</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="block space-y-3 md:table-row-group md:space-y-0 md:divide-y md:divide-gray-100 dark:md:divide-gray-700">
                  {payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/35 md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:hover:bg-gray-50 dark:md:hover:bg-gray-700/50"
                    >
                      <td className="flex items-center justify-between gap-4 pb-3 text-gray-600 dark:text-gray-300 md:table-cell md:p-3">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          التاريخ
                        </span>
                        <span>{new Date(payout.createdAt).toLocaleDateString("ar-EG")}</span>
                      </td>
                      <td className="flex items-center justify-between gap-4 border-t border-gray-100 py-3 font-bold text-gray-900 dark:border-gray-700 dark:text-white md:table-cell md:border-0 md:p-3">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          المبلغ
                        </span>
                        <span>{formatPrice(toNumber(payout.amount))}</span>
                      </td>
                      <td className="flex items-start justify-between gap-4 border-t border-gray-100 py-3 text-gray-600 dark:border-gray-700 dark:text-gray-300 md:table-cell md:border-0 md:p-3">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          طريقة الدفع
                        </span>
                        <div className="flex flex-col text-left md:text-right">
                          <span>{payout.paymentMethod}</span>
                          {payout.notes ? (
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              {payout.notes}
                            </span>
                          ) : null}
                          {payout.proofFileUrl ? (
                            <a
                              href={payout.proofFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              عرض إثبات التحويل
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="flex items-start justify-between gap-4 border-t border-gray-100 pt-3 dark:border-gray-700 md:table-cell md:border-0 md:p-3">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          الحالة
                        </span>
                        <div className="flex flex-col items-end gap-1 md:items-start">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getStatusColor(payout.status)}`}
                          >
                            {getStatusText(payout.status)}
                          </span>
                          {payout.status === "CANCELLED" && payout.notes ? (
                            <span className="text-xs text-red-600 dark:text-red-400">
                              تم إرجاع الرصيد القابل للسحب بعد الإلغاء
                            </span>
                          ) : null}
                          {["PROCESSED", "PAID"].includes(payout.status) &&
                          payout.proofFileUrl ? (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              تم إرفاق إثبات التحويل
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                لا توجد عمليات سحب سابقة
              </div>
            )}
          </div>
        </div>

        {/* Recent Commissions */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-gray-500" />
              أحدث العمولات
            </h3>
          </div>
          <div className="p-3 md:p-0">
            {commissions.length > 0 ? (
              <table className="block w-full text-right text-sm md:table md:divide-y md:divide-gray-100 dark:md:divide-gray-700">
                <thead className="hidden bg-gray-50 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400 md:table-header-group">
                  <tr>
                    <th className="p-3">رقم الطلب</th>
                    <th className="p-3">قيمة الطلب</th>
                    <th className="p-3">العمولة</th>
                    <th className="p-3">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="block space-y-3 md:table-row-group md:space-y-0 md:divide-y md:divide-gray-100 dark:md:divide-gray-700">
                  {commissions.map((comm) => (
                    <tr
                      key={comm.id}
                      className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/35 md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:hover:bg-gray-50 dark:md:hover:bg-gray-700/50"
                    >
                      <td className="flex items-center justify-between gap-4 pb-3 font-mono text-blue-600 dark:text-blue-400 md:table-cell md:p-3">
                        <span className="font-sans text-xs font-medium text-gray-500 md:hidden">
                          رقم الطلب
                        </span>
                        {comm.order?.orderNumber || "غير متوفر"}
                      </td>
                      <td className="flex items-center justify-between gap-4 border-t border-gray-100 py-3 text-gray-600 dark:border-gray-700 dark:text-gray-300 md:table-cell md:border-0 md:p-3">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          قيمة الطلب
                        </span>
                        {formatPrice(toNumber(comm.orderTotal))}
                      </td>
                      <td className="flex items-center justify-between gap-4 border-t border-gray-100 py-3 font-bold text-green-600 dark:border-gray-700 dark:text-green-400 md:table-cell md:border-0 md:p-3">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          العمولة
                        </span>
                        +{formatPrice(toNumber(comm.amount))}
                      </td>
                      <td className="flex items-center justify-between gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-700 md:table-cell md:border-0 md:p-3">
                        <span className="font-medium text-gray-500 md:hidden">
                          التاريخ
                        </span>
                        {new Date(comm.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                لا توجد عمولات مسجلة
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl dark:bg-gray-800 sm:rounded-2xl">
            <div className="border-b border-gray-100 p-4 dark:border-gray-700 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                طلب سحب جديد
              </h3>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4 p-4 sm:p-6">
              <div>
                <label
                  htmlFor="affiliate-payout-amount"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  المبلغ المتاح للسحب
                </label>
                <input
                  id="affiliate-payout-amount"
                  type="number"
                  value={payoutAmount}
                  readOnly
                  max={toNumber(affiliate?.pendingEarnings)}
                  min={toNumber(affiliate?.minPayout || 100)}
                  className="min-h-11 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  حالياً يتم إنشاء طلب السحب على كامل الرصيد القابل للسحب حتى لا
                  تتكرر طلبات السحب على نفس العمولات.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  طريقة الدفع
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">اختر طريقة الدفع</option>
                  <option value="VODAFONE_CASH">فودافون كاش</option>
                  <option value="INSTAPAY">إنستاباي</option>
                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                  <option value="CASH">كاش / أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  بيانات التحويل (رقم المحفظة / الحساب)
                </label>
                <textarea
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  required
                  placeholder="مثال: 010xxxxxx"
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="min-h-11 flex-1 rounded-xl bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingPayout}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingPayout ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    "تأكيد الطلب"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AffiliateCommission;
