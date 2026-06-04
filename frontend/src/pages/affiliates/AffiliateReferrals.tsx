import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useTheme } from "../../hooks/useTheme";
import {
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  LinkIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

interface ReferralCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface ReferralOrder {
  id: string;
  orderNumber: string;
  total: number;
}

interface Referral {
  id: string;
  referralCode: string;
  source?: string | null;
  converted: boolean;
  convertedAt?: string | null;
  createdAt: string;
  customer?: ReferralCustomer | null;
  order?: ReferralOrder | null;
}

const AffiliateReferrals: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  const loadReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/affiliates/referrals");
      if (response.data.success) {
        setReferrals(response.data.data || []);
      }
    } catch (error: unknown) {
      const message =
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
          ? error.response.data.message
          : "حدث خطأ أثناء تحميل الإحالات";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  const totalReferrals = referrals.length;
  const convertedReferrals = useMemo(
    () => referrals.filter((referral) => referral.converted).length,
    [referrals],
  );
  const pendingReferrals = totalReferrals - convertedReferrals;
  const totalRevenue = useMemo(
    () =>
      referrals.reduce(
        (sum, referral) => sum + Number(referral.order?.total || 0),
        0,
      ),
    [referrals],
  );
  const conversionRate =
    totalReferrals > 0
      ? Number(((convertedReferrals / totalReferrals) * 100).toFixed(1))
      : 0;

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
      className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} px-3 pb-24 pt-4 sm:p-6`}
    >
      <div className="w-full space-y-4 sm:space-y-6">
        <div>
          <h1
            className={`text-2xl font-bold sm:text-3xl ${isDark ? "text-white" : "text-gray-900"}`}
          >
            الإحالات والتحويلات
          </h1>
          <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mt-1 text-sm sm:mt-2 sm:text-base`}>
            راقب أداء روابطك من أول إحالة حتى الطلب الناتج منها.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          <div
            className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"} p-4 sm:p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  إجمالي الإحالات
                </p>
                <p
                  className={`mt-2 text-2xl font-bold sm:text-3xl ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {totalReferrals}
                </p>
              </div>
              <LinkIcon className="hidden h-8 w-8 text-blue-600 sm:block" />
            </div>
          </div>

          <div
            className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"} p-4 sm:p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  الإحالات المحولة
                </p>
                <p
                  className={`mt-2 text-2xl font-bold sm:text-3xl ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {convertedReferrals}
                </p>
              </div>
              <CheckCircleIcon className="hidden h-8 w-8 text-green-600 sm:block" />
            </div>
          </div>

          <div
            className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"} p-4 sm:p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  قيد المتابعة
                </p>
                <p
                  className={`mt-2 text-2xl font-bold sm:text-3xl ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {pendingReferrals}
                </p>
              </div>
              <ClockIcon className="hidden h-8 w-8 text-orange-600 sm:block" />
            </div>
          </div>

          <div
            className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"} p-4 sm:p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  معدل التحويل
                </p>
                <p
                  className={`mt-2 text-2xl font-bold sm:text-3xl ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {conversionRate}%
                </p>
              </div>
              <ArrowTrendingUpIcon className="hidden h-8 w-8 text-purple-600 sm:block" />
            </div>
          </div>
        </div>

        <div
          className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"} p-4`}
        >
          <p className={`${isDark ? "text-gray-300" : "text-gray-700"} text-sm`}>
            إجمالي قيمة الطلبات المحولة:{" "}
            <span className="font-bold text-green-600">
              {formatPrice(totalRevenue)}
            </span>
          </p>
        </div>

        {error ? (
          <div
            className={`${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-700"} rounded-xl border p-8 text-center`}
          >
            {error}
          </div>
        ) : referrals.length > 0 ? (
          <div
            className={`${isDark ? "bg-gray-800" : "bg-white"} overflow-hidden rounded-2xl border shadow-sm ${isDark ? "border-gray-700" : "border-gray-100"}`}
          >
            <div className="p-3 md:p-0">
              <table className="block min-w-full md:table md:divide-y md:divide-gray-200 dark:md:divide-gray-700">
                <thead className={`hidden md:table-header-group ${isDark ? "bg-gray-900/50" : "bg-gray-50"}`}>
                  <tr>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? "text-gray-300" : "text-gray-500"}`}
                    >
                      الإحالة
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? "text-gray-300" : "text-gray-500"}`}
                    >
                      العميل
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? "text-gray-300" : "text-gray-500"}`}
                    >
                      المصدر
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? "text-gray-300" : "text-gray-500"}`}
                    >
                      الطلب
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? "text-gray-300" : "text-gray-500"}`}
                    >
                      الحالة
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? "text-gray-300" : "text-gray-500"}`}
                    >
                      التاريخ
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`block space-y-3 md:table-row-group md:space-y-0 ${isDark ? "md:bg-gray-800 md:divide-gray-700" : "md:bg-white md:divide-gray-200"} md:divide-y`}
                >
                  {referrals.map((referral) => {
                    const customerName = referral.customer
                      ? `${referral.customer.firstName} ${referral.customer.lastName}`.trim()
                      : "مخفية حسب الصلاحيات";

                    return (
                      <tr
                        key={referral.id}
                        className={`block rounded-2xl border p-4 transition md:table-row md:rounded-none md:border-0 md:p-0 ${
                          isDark
                            ? "border-gray-700 bg-gray-900/35 hover:bg-gray-700"
                            : "border-gray-100 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <td
                          className={`flex items-start justify-between gap-4 pb-3 text-sm md:table-cell md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "text-gray-300" : "text-gray-900"}`}
                        >
                          <span className="text-xs font-medium text-gray-500 md:hidden">
                            الإحالة
                          </span>
                          <div className="flex flex-col">
                            <span className="font-semibold">
                              {referral.referralCode}
                            </span>
                            <span className="text-xs text-gray-500">
                              {referral.id.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`flex items-start justify-between gap-4 border-t py-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "border-gray-700 text-gray-300" : "border-gray-100 text-gray-900"}`}
                        >
                          <span className="text-xs font-medium text-gray-500 md:hidden">
                            العميل
                          </span>
                          <div className="flex flex-col">
                            <span>{customerName}</span>
                            <span className="text-xs text-gray-500">
                              {referral.customer?.phone || "-"}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`flex items-center justify-between gap-4 border-t py-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "border-gray-700 text-gray-300" : "border-gray-100 text-gray-900"}`}
                        >
                          <span className="text-xs font-medium text-gray-500 md:hidden">
                            المصدر
                          </span>
                          <span>{referral.source || "direct"}</span>
                        </td>
                        <td
                          className={`flex items-start justify-between gap-4 border-t py-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "border-gray-700 text-gray-300" : "border-gray-100 text-gray-900"}`}
                        >
                          <span className="text-xs font-medium text-gray-500 md:hidden">
                            الطلب
                          </span>
                          {referral.order ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-blue-600">
                                {referral.order.orderNumber}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatPrice(referral.order.total)}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="flex items-center justify-between gap-4 border-t py-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap">
                          <span className="text-xs font-medium text-gray-500 md:hidden">
                            الحالة
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              referral.converted
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                            }`}
                          >
                            {referral.converted ? "تم التحويل" : "قيد المتابعة"}
                          </span>
                        </td>
                        <td
                          className={`flex items-start justify-between gap-4 border-t py-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "border-gray-700 text-gray-400" : "border-gray-100 text-gray-500"}`}
                        >
                          <span className="text-xs font-medium text-gray-500 md:hidden">
                            التاريخ
                          </span>
                          <div className="flex flex-col">
                            <span>
                              {new Date(referral.createdAt).toLocaleDateString(
                                "ar-EG",
                              )}
                            </span>
                            <span className="text-xs">
                              {referral.convertedAt
                                ? new Date(
                                    referral.convertedAt,
                                  ).toLocaleDateString("ar-EG")
                                : "لم تتحول بعد"}
                            </span>
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
            className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"} py-16 text-center`}
          >
            <UserGroupIcon
              className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}
            />
            <p className={isDark ? "text-gray-300" : "text-gray-700"}>
              لا توجد إحالات مسجلة حتى الآن
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateReferrals;
