import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Calendar,
  PieChart,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";

interface BillingData {
  totalRevenue: number;
  mrr: number;
  activeSubscriptions: number;
  revenueByType: any[];
  failedPayments: any[];
}

export default function BillingOverview() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBillingData();
  }, [dateRange]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const response = await apiClient.get(
        "/super-admin/platform/billing-overview",
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      );

      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
      tToast.error("super-admin_BillingOverview.error_fetch_fec6");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryPayment = async (paymentId: string) => {
    try {
      setRetryingIds((prev) => new Set(prev).add(paymentId));
      const response = await apiClient.post(
        `/super-admin/platform/retry-failed-payment/${paymentId}`,
      );

      if (response.data.success) {
        toast.success(response.data.message || i18n.t("super-admin_BillingOverview.msg_23a3"));
        fetchBillingData();
      }
    } catch (error: any) {
      console.error("Error retrying payment:", error);
      toast.error(
        error.response?.data?.message || "خطأ في إعادة محاولة الدفع",
      );
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(paymentId);
        return next;
      });
    }
  };

  const toNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    return parseFloat(value.toString());
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PLATFORM_FEE: "رسوم المنصة",
      APP_SUBSCRIPTION: "اشتراكات الأدوات",
      APP_USAGE: "استخدام الأدوات",
      WALLET_RECHARGE: "شحن المحفظة",
      REFUND: "استرداد",
      ADJUSTMENT: "تعديل",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-600" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            لا توجد بيانات
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                نظرة عامة على الفواتير
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                تحليلات الإيرادات والفواتير
              </p>
            </div>
            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="7">آخر 7 أيام</option>
                <option value="30">آخر 30 يوم</option>
                <option value="90">آخر 90 يوم</option>
                <option value="365">آخر سنة</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white rounded-2xl p-6 shadow-xl transition-all duration-300 hover:scale-[1.02] group">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                <DollarSign size={24} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
                <TrendingUp size={12} />
                <span>+12%</span>
              </div>
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1 relative z-10">
              إجمالي الإيرادات
            </p>
            <p className="text-3xl font-extrabold relative z-10">
              {toNumber(data.totalRevenue).toLocaleString("ar-EG")} ج
            </p>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-800 text-white rounded-2xl p-6 shadow-xl transition-all duration-300 hover:scale-[1.02] group">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                <Calendar size={24} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
                <ArrowUpRight size={12} />
                <span>MRR</span>
              </div>
            </div>
            <p className="text-purple-100 text-sm font-medium mb-1 relative z-10">
              الإيرادات الشهرية المكررة
            </p>
            <p className="text-3xl font-extrabold relative z-10">
              {toNumber(data.mrr).toLocaleString("ar-EG")} ج
            </p>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-xl transition-all duration-300 hover:scale-[1.02] group">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                <Users size={24} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
                <ShieldCheck size={12} />
                <span>Active</span>
              </div>
            </div>
            <p className="text-emerald-100 text-sm font-medium mb-1 relative z-10">
              الاشتراكات النشطة
            </p>
            <p className="text-3xl font-extrabold relative z-10">
              {data.activeSubscriptions}
            </p>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-600 to-red-700 text-white rounded-2xl p-6 shadow-xl transition-all duration-300 hover:scale-[1.02] group">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                <AlertTriangle size={24} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
                <RefreshCw size={12} className={(data.failedPayments?.length ?? 0) > 0 ? "animate-spin-slow" : ""} />
                <span>Needs Redo</span>
              </div>
            </div>
            <p className="text-rose-100 text-sm font-medium mb-1 relative z-10">
              الدفعات الفاشلة
            </p>
            <p className="text-3xl font-extrabold relative z-10">
              {data.failedPayments?.length ?? 0}
            </p>
          </div>
        </div>

        {/* Revenue by Type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <PieChart size={24} />
              الإيرادات حسب النوع
            </h2>
            <div className="space-y-4">
              {(data.revenueByType ?? []).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {getTypeLabel(item.type)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item._count} عملية
                    </div>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {toNumber(item._sum.amount).toLocaleString("ar-EG")} ج
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Failed Payments */}
        {(data.failedPayments?.length ?? 0) > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <AlertTriangle size={24} className="text-red-600" />
              الدفعات الفاشلة
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      الشركة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      النوع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      المبلغ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      التاريخ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      الوصف
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(data.failedPayments ?? []).map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-bold shrink-0">
                            {payment.company.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              {payment.company.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {payment.company.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-200 dark:border-gray-600">
                          {getTypeLabel(payment.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-red-600 font-bold text-lg">
                          {toNumber(payment.amount).toLocaleString("ar-EG")} ج
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300 text-sm">
                        {new Date(payment.createdAt).toLocaleDateString(
                          "ar-EG",
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm max-w-xs truncate">
                        {payment.description}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleRetryPayment(payment.id)}
                          disabled={retryingIds.has(payment.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group font-medium"
                        >
                          {retryingIds.has(payment.id) ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                          )}
                          <span>إعادة المحاولة</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
