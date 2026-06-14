import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Package,
  TrendingUp,
  Calendar,
  DollarSign,
  Settings,
  BarChart3,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface CompanyApp {
  id: string;
  companyId: string;
  appId: string;
  status: string;
  subscribedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  trialEndsAt?: string;
  nextBillingAt?: string;
  totalSpent: number;
  app: {
    id: string;
    slug: string;
    name: string;
    icon?: string;
    category: string;
    pricingModel: string;
    monthlyPrice?: number;
  };
  monthlyUsage?: {
    totalCost: number;
    totalQuantity: number;
  };
}

export default function MyApps() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<CompanyApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMonthlyCost, setTotalMonthlyCost] = useState(0);

  const fetchMyApps = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiClient.get("/my-apps");

      setApps(response.data.data);

      // Calculate total monthly cost
      const total = response.data.data.reduce(
        (sum: number, app: CompanyApp) => {
          const subscriptionCost = Number(app.app.monthlyPrice) || 0;
          const usageCost = Number(app.monthlyUsage?.totalCost) || 0;
          return sum + subscriptionCost + usageCost;
        },
        0,
      );
      setTotalMonthlyCost(total);
    } catch (error: unknown) {
      console.error("Error fetching my apps:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { status?: number } }).response?.status ===
          "number" &&
        (error as { response?: { status?: number } }).response?.status === 401
      ) {
        navigate("/auth/login");
      } else {
        toast.error("خطأ في جلب الأدوات المفعلة");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchMyApps();
  }, [fetchMyApps]);

  const formatActivationDate = (companyApp: CompanyApp) => {
    const activationDate =
      companyApp.subscribedAt || companyApp.createdAt || companyApp.updatedAt;

    if (!activationDate) return "غير متوفر";

    const parsedDate = new Date(activationDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return "غير متوفر";
    }

    return parsedDate.toLocaleDateString("ar-EG");
  };

  const getStatusBadge = (status: string, trialEndsAt?: string) => {
    if (status === "TRIAL") {
      const daysLeft = trialEndsAt
        ? Math.ceil(
            (new Date(trialEndsAt).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;
      return (
        <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
          <Clock size={14} />
          تجريبي ({daysLeft} يوم متبقي)
        </span>
      );
    }
    if (status === "ACTIVE") {
      return (
        <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
          <CheckCircle size={14} />
          نشط
        </span>
      );
    }
    if (status === "EXPIRED") {
      return (
        <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
          <AlertCircle size={14} />
          منتهي
        </span>
      );
    }
    return (
      <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-semibold">
        {status}
      </span>
    );
  };

  const handleCancelApp = async (appId: string, appName: string) => {
    if (!window.confirm(`هل أنت متأكد من إلغاء تفعيل "${appName}"؟`)) {
      return;
    }

    try {
      await apiClient.delete(`/my-apps/${appId}`);

      toast.success("تم إلغاء الأداة بنجاح");
      fetchMyApps();
    } catch (error) {
      console.error("Error cancelling app:", error);
      toast.error("خطأ في إلغاء الأداة");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            جاري التحميل...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                📦 أدواتي المفعلة
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                إدارة الأدوات والاشتراكات الخاصة بك
              </p>
            </div>
            <button
              onClick={() => navigate("/marketplace")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Package size={20} />
              تصفح المزيد من الأدوات
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                الأدوات النشطة
              </span>
              <Zap className="text-green-500" size={24} />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {apps.length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                التكلفة الشهرية
              </span>
              <DollarSign className="text-blue-500" size={24} />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {Number(totalMonthlyCost).toFixed(2)} ج
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                الاستخدام هذا الشهر
              </span>
              <TrendingUp className="text-purple-500" size={24} />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {apps.reduce(
                (sum, app) => sum + (app.monthlyUsage?.totalQuantity || 0),
                0,
              )}
            </div>
          </div>
        </div>

        {/* Apps List */}
        {apps.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
            <Package size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              لا توجد أدوات مفعلة
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              ابدأ بتفعيل الأدوات التي تحتاجها من Marketplace
            </p>
            <button
              onClick={() => navigate("/marketplace")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
            >
              <Package size={20} />
              تصفح Marketplace
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map((companyApp) => {
              const subscriptionCost = Number(companyApp.app.monthlyPrice) || 0;
              const usageCost = Number(companyApp.monthlyUsage?.totalCost) || 0;
              const totalCost = subscriptionCost + usageCost;

              return (
                <div
                  key={companyApp.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                          {companyApp.app.icon || "📦"}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {companyApp.app.name}
                            </h3>
                            {getStatusBadge(
                              companyApp.status,
                              companyApp.trialEndsAt,
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              <span>
                                مفعل منذ{" "}
                                {formatActivationDate(companyApp)}
                              </span>
                            </div>
                            {companyApp.nextBillingAt && (
                              <div className="flex items-center gap-1">
                                <Clock size={14} />
                                <span>
                                  التجديد:{" "}
                                  {new Date(
                                    companyApp.nextBillingAt,
                                  ).toLocaleDateString("ar-EG")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleCancelApp(companyApp.id, companyApp.app.name)
                        }
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="إلغاء الأداة"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          الاشتراك الشهري
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {subscriptionCost} ج
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          الاستخدام هذا الشهر
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {Number(usageCost).toFixed(2)} ج
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          الإجمالي الشهري
                        </div>
                        <div className="text-xl font-bold text-blue-600">
                          {Number(totalCost).toFixed(2)} ج
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          إجمالي المصروفات
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {Number(companyApp.totalSpent).toFixed(2)} ج
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          navigate(`/my-apps/${companyApp.app.slug}/usage`)
                        }
                        className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <BarChart3 size={18} />
                        الإحصائيات
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/my-apps/${companyApp.app.slug}/settings`)
                        }
                        className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Settings size={18} />
                        الإعدادات
                      </button>
                      {companyApp.status === "TRIAL" && (
                        <button
                          onClick={() =>
                            navigate(`/my-apps/${companyApp.app.slug}/upgrade`)
                          }
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Zap size={18} />
                          ترقية الآن
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recommended Apps */}
        {apps.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              💡 أدوات موصى بها لك
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                اكتشف المزيد من الأدوات التي قد تساعدك في تطوير عملك
              </p>
              <button
                onClick={() => navigate("/marketplace")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
              >
                <Package size={20} />
                تصفح Marketplace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
