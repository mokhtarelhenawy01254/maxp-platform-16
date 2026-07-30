import { Upload as ArrowUpTrayIcon, DollarSign as BanknotesIcon, Check as CheckCircleIcon, DollarSign as CurrencyDollarIcon, Filter as FunnelIcon, X as XCircleIcon } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useTheme } from "../../hooks/useTheme";
;
import { toast } from "sonner";

interface Commission {
  id: string;
  orderId: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  order?: {
    orderNumber: string;
    total: number;
  } | null;
  affiliate?: {
    affiliateCode: string;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  merchant?: {
    name: string;
  } | null;
}

interface AffiliatePayout {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  transactionId?: string | null;
  externalReference?: string | null;
  notes?: string | null;
  proofFileUrl?: string | null;
  proofUploadedAt?: string | null;
  createdAt: string;
  processedAt?: string | null;
  affiliate: {
    affiliateCode: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  };
  commissions: Array<{
    id: string;
    amount: number;
    status: string;
    order?: {
      orderNumber: string;
    } | null;
  }>;
}

const CommissionsManagement: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(
    null,
  );
  const [proofTargetPayoutId, setProofTargetPayoutId] = useState<string | null>(
    null,
  );
  const proofInputRef = useRef<HTMLInputElement | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    type: "",
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;

      const [commissionsResponse, payoutsResponse] = await Promise.all([
        apiClient.get("/commissions", { params }),
        apiClient.get("/affiliates/admin/payouts"),
      ]);

      if (commissionsResponse.data.success) {
        setCommissions(commissionsResponse.data.data.commissions || []);
        setStats(commissionsResponse.data.data.stats);
      }

      if (payoutsResponse.data.success) {
        setPayouts(payoutsResponse.data.data || []);
      }
    } catch (error: any) {
      toast.error("حدث خطأ أثناء جلب العمولات وطلبات السحب");
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionStatus = async (
    commissionId: string,
    status: string,
  ) => {
    try {
      const response = await apiClient.put(
        `/commissions/${commissionId}/status`,
        { status },
      );
      if (response.data.success) {
        toast.success("تم تحديث الحالة بنجاح");
        loadData();
      }
    } catch (error: any) {
      toast.error("حدث خطأ أثناء التحديث");
    }
  };

  const recordExternalPayout = async (payoutId: string) => {
    const transactionId = window.prompt("أدخل رقم العملية أو رقم التحويل");
    if (transactionId === null) {
      return;
    }

    const normalizedTransactionId = transactionId.trim();
    if (!normalizedTransactionId) {
      toast.error("رقم العملية مطلوب لتسجيل التحويل");
      return;
    }

    const externalReference = window.prompt(
      "مرجع إضافي أو ملاحظة (اختياري)",
    );

    try {
      setProcessingPayoutId(payoutId);
      const response = await apiClient.post(
        `/affiliates/payouts/${payoutId}/record-external`,
        {
          transactionId: normalizedTransactionId,
          externalReference: externalReference?.trim() || undefined,
        },
      );

      if (response.data.success) {
        toast.success("تم تسجيل تحويل طلب السحب بنجاح");
        loadData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل تسجيل التحويل");
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const cancelPayoutRequest = async (payoutId: string) => {
    const reason = window.prompt("سبب رفض أو إلغاء طلب السحب");
    if (reason === null) {
      return;
    }

    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      toast.error("سبب الإلغاء مطلوب");
      return;
    }

    try {
      setProcessingPayoutId(payoutId);
      const response = await apiClient.post(
        `/affiliates/payouts/${payoutId}/cancel`,
        {
          reason: normalizedReason,
        },
      );

      if (response.data.success) {
        toast.success("تم إلغاء طلب السحب وإرجاع العمولات للمسوق");
        loadData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل إلغاء طلب السحب");
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const openProofUploadDialog = (payoutId: string) => {
    setProofTargetPayoutId(payoutId);
    proofInputRef.current?.click();
  };

  const uploadPayoutProof = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    const payoutId = proofTargetPayoutId;
    event.target.value = "";

    if (!selectedFile || !payoutId) {
      setProofTargetPayoutId(null);
      return;
    }

    try {
      setProcessingPayoutId(payoutId);
      const formData = new FormData();
      formData.append("proof", selectedFile);

      const response = await apiClient.post(
        `/affiliates/payouts/${payoutId}/proof`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.success) {
        toast.success("تم رفع إثبات التحويل بنجاح");
        loadData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل رفع إثبات التحويل");
    } finally {
      setProcessingPayoutId(null);
      setProofTargetPayoutId(null);
    }
  };

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case "PROCESSED":
      case "PAID":
        return isDark
          ? "bg-green-900/50 text-green-300"
          : "bg-green-100 text-green-800";
      case "CANCELLED":
      case "FAILED":
        return isDark
          ? "bg-red-900/50 text-red-300"
          : "bg-red-100 text-red-800";
      default:
        return isDark
          ? "bg-yellow-900/50 text-yellow-300"
          : "bg-yellow-100 text-yellow-800";
    }
  };

  const getPayoutStatusText = (status: string) => {
    switch (status) {
      case "PROCESSED":
      case "PAID":
        return "تم التحويل";
      case "CANCELLED":
        return "ملغي";
      case "FAILED":
        return "فشل";
      default:
        return "قيد الانتظار";
    }
  };

  const pendingPayouts = useMemo(
    () => payouts.filter((payout) => payout.status === "PENDING"),
    [payouts],
  );
  const pendingPayoutAmount = useMemo(
    () =>
      pendingPayouts.reduce(
        (sum, payout) => sum + Number(payout.amount || 0),
        0,
      ),
    [pendingPayouts],
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
      <input
        ref={proofInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={uploadPayoutProof}
      />
      <div className="w-full">
        <div className="mb-6">
          <h1
            className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            إدارة العمولات
          </h1>
          <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mt-2`}>
            عرض وإدارة العمولات وطلبات سحب المسوقين
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 mb-8">
            <div
              className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-6`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    إجمالي العمولات
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {formatPrice(stats.totalAmount || 0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div
              className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-6`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    عمولات المسوقين
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {formatPrice(stats.byType?.AFFILIATE || 0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div
              className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-6`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    عمولات التجار
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {formatPrice(stats.byType?.MERCHANT || 0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div
              className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-6`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    عمولات المنصة
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {formatPrice(stats.byType?.PLATFORM || 0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-orange-600" />
              </div>
            </div>

            <div
              className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-6`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    طلبات السحب المعلقة
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {pendingPayouts.length}
                  </p>
                </div>
                <BanknotesIcon className="h-8 w-8 text-amber-600" />
              </div>
            </div>

            <div
              className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-6`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    قيمة السحب المعلق
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {formatPrice(pendingPayoutAmount)}
                  </p>
                </div>
                <BanknotesIcon className="h-8 w-8 text-cyan-600" />
              </div>
            </div>
          </div>
        )}

        <div
          className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow p-4 mb-6`}
        >
          <div className="flex items-center gap-4">
            <FunnelIcon
              className={`h-5 w-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            />
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className={`px-4 py-2 border rounded-lg ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">جميع الحالات</option>
              <option value="PENDING">معلق</option>
              <option value="CONFIRMED">مؤكد</option>
              <option value="PAID">مدفوع</option>
              <option value="CANCELLED">ملغي</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className={`px-4 py-2 border rounded-lg ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">جميع الأنواع</option>
              <option value="AFFILIATE">مسوق</option>
              <option value="MERCHANT">تاجر</option>
              <option value="PLATFORM">منصة</option>
            </select>
          </div>
        </div>

        <div
          className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow overflow-hidden mb-8`}
        >
          <div
            className={`px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
          >
            <h2
              className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              طلبات سحب المسوقين
            </h2>
            <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              راجع طلبات السحب المعلقة وسجل التحويل الفعلي بعد الدفع.
            </p>
          </div>

          {payouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={isDark ? "bg-gray-700" : "bg-gray-50"}>
                  <tr>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      المسوق
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      المبلغ
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      طريقة السحب
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      العمولات المرتبطة
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
                      التاريخ
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`${isDark ? "bg-gray-800 divide-gray-700" : "bg-white divide-gray-200"} divide-y`}
                >
                  {payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className={isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}
                    >
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {payout.affiliate.user.firstName}{" "}
                            {payout.affiliate.user.lastName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {payout.affiliate.affiliateCode}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatPrice(payout.amount)}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        <div className="flex flex-col">
                          <span>{payout.paymentMethod}</span>
                          <span className="text-xs text-gray-500">
                            {payout.transactionId || payout.externalReference || "-"}
                          </span>
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
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        <div className="flex flex-col">
                          <span>{payout.commissions.length} عمولة</span>
                          <span className="text-xs text-gray-500">
                            {payout.commissions[0]?.order?.orderNumber || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getPayoutStatusColor(payout.status)}`}
                        >
                          {getPayoutStatusText(payout.status)}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        <div className="flex flex-col">
                          <span>
                            {new Date(payout.createdAt).toLocaleDateString("ar-EG")}
                          </span>
                          <span className="text-xs">
                            {payout.processedAt
                              ? new Date(payout.processedAt).toLocaleDateString(
                                  "ar-EG",
                                )
                              : "بانتظار التحويل"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payout.status === "PENDING" ? (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => recordExternalPayout(payout.id)}
                              disabled={processingPayoutId === payout.id}
                              className="text-green-600 hover:text-green-800 flex items-center gap-1 transition disabled:opacity-60"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                              {processingPayoutId === payout.id
                                ? "جارٍ التنفيذ..."
                                : "تسجيل التحويل"}
                            </button>
                            <button
                              onClick={() => cancelPayoutRequest(payout.id)}
                              disabled={processingPayoutId === payout.id}
                              className="text-red-600 hover:text-red-800 flex items-center gap-1 transition disabled:opacity-60"
                            >
                              <XCircleIcon className="h-4 w-4" />
                              {processingPayoutId === payout.id
                                ? "جارٍ التنفيذ..."
                                : "رفض الطلب"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-gray-500">
                              {payout.transactionId || payout.externalReference || "مكتمل"}
                            </span>
                            {(payout.status === "PROCESSED" ||
                              payout.status === "PAID") && (
                              <button
                                onClick={() => openProofUploadDialog(payout.id)}
                                disabled={processingPayoutId === payout.id}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 transition disabled:opacity-60"
                              >
                                <ArrowUpTrayIcon className="h-4 w-4" />
                                {processingPayoutId === payout.id
                                  ? "جارٍ الرفع..."
                                  : payout.proofFileUrl
                                    ? "تحديث الإثبات"
                                    : "رفع الإثبات"}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <BanknotesIcon
                className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}
              />
              <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                لا توجد طلبات سحب حالياً
              </p>
            </div>
          )}
        </div>

        <div
          className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow overflow-hidden`}
        >
          {commissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={isDark ? "bg-gray-700" : "bg-gray-50"}>
                  <tr>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      رقم الطلب
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      النوع
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      المستفيد
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      المبلغ
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
                      التاريخ
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
                  {commissions.map((commission) => (
                    <tr
                      key={commission.id}
                      className={isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}
                    >
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        {commission.order?.orderNumber || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            commission.type === "AFFILIATE"
                              ? isDark
                                ? "bg-green-900/50 text-green-300"
                                : "bg-green-100 text-green-800"
                              : commission.type === "MERCHANT"
                                ? isDark
                                  ? "bg-purple-900/50 text-purple-300"
                                  : "bg-purple-100 text-purple-800"
                                : isDark
                                  ? "bg-orange-900/50 text-orange-300"
                                  : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {commission.type === "AFFILIATE"
                            ? "مسوق"
                            : commission.type === "MERCHANT"
                              ? "تاجر"
                              : "منصة"}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        {commission.affiliate
                          ? `${commission.affiliate.user.firstName} ${commission.affiliate.user.lastName} (${commission.affiliate.affiliateCode})`
                          : commission.merchant
                            ? commission.merchant.name
                            : "المنصة"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatPrice(commission.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            commission.status === "PAID"
                              ? isDark
                                ? "bg-green-900/50 text-green-300"
                                : "bg-green-100 text-green-800"
                              : commission.status === "CONFIRMED"
                                ? isDark
                                  ? "bg-blue-900/50 text-blue-300"
                                  : "bg-blue-100 text-blue-800"
                                : commission.status === "CANCELLED"
                                  ? isDark
                                    ? "bg-red-900/50 text-red-300"
                                    : "bg-red-100 text-red-800"
                                  : isDark
                                    ? "bg-yellow-900/50 text-yellow-300"
                                    : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {commission.status === "PAID"
                            ? "مدفوع"
                            : commission.status === "CONFIRMED"
                              ? "مؤكد"
                              : commission.status === "CANCELLED"
                                ? "ملغي"
                                : "معلق"}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {new Date(commission.createdAt).toLocaleDateString(
                          "ar-EG",
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {commission.status === "CONFIRMED" && (
                          <button
                            onClick={() =>
                              updateCommissionStatus(commission.id, "PAID")
                            }
                            className="text-green-600 hover:text-green-800 flex items-center gap-1 transition"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            تأكيد الدفع
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CurrencyDollarIcon
                className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}
              />
              <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                لا توجد عمولات
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommissionsManagement;
