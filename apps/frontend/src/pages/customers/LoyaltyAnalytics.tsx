import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import {
  TrendingUp,
  Star,
  Target,
  Award,
  DollarSign,
  Gift,
  RefreshCw,
  Users,
  BadgePercent,
} from "lucide-react";

interface CustomerLoyaltyProgram {
  id: string;
  name: string;
  nameAr?: string;
  type: string;
  customersCount: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
}

const LoyaltyAnalytics: React.FC = () => {
  const [stats, setStats] = useState<{ totalCashback: number } | null>(null);
  const [programs, setPrograms] = useState<CustomerLoyaltyProgram[]>([]);
  const [systemAnalytics, setSystemAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [programsRes, statsRes, systemRes] = await Promise.all([
        apiClient.get("/hr/customer-loyalty/programs"),
        apiClient.get("/wallet/stats"),
        apiClient.get("/hr/customer-loyalty/system-analytics"),
      ]);

      setPrograms(programsRes.data.data || []);
      setStats(statsRes.data.data || null);
      setSystemAnalytics((systemRes.data?.data as any) || null);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const IconWrapper = ({
    color,
    children,
  }: {
    color: string;
    children: React.ReactNode;
  }) => <div className={`p-3 rounded-lg ${color}`}>{children}</div>;

  const getProgramIcon = (type: string) => {
    switch (type) {
      case "POINTS":
        return <Star className="w-5 h-5" />;
      case "TIER":
        return <Award className="w-5 h-5" />;
      case "CASHBACK":
        return <DollarSign className="w-5 h-5" />;
      case "REFERRAL":
        return <Users className="w-5 h-5" />;
      default:
        return <Gift className="w-5 h-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const totalIssued = programs.reduce((sum, p) => sum + Number(p.totalPointsIssued || 0), 0);
  const totalRedeemed = programs.reduce((sum, p) => sum + Number(p.totalPointsRedeemed || 0), 0);
  const totalCustomers = programs.reduce((sum, p) => sum + Number(p.customersCount || 0), 0);

  const avgPoints = totalCustomers > 0 ? Math.round((totalIssued - totalRedeemed) / totalCustomers) : 0;
  const redemptionRate = totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            تحليلات الولاء
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            متابعة أداء برامج الولاء والنقاط والكاش باك
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <IconWrapper color="bg-green-100 text-green-600 dark:bg-green-900/30">
              <Users className="w-6 h-6" />
            </IconWrapper>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            العملاء المشتركين
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {totalCustomers.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <IconWrapper color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30">
              <Star className="w-6 h-6" />
            </IconWrapper>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            متوسط النقاط للعميل
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {avgPoints.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <IconWrapper color="bg-blue-100 text-blue-600 dark:bg-blue-900/30">
              <Target className="w-6 h-6" />
            </IconWrapper>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
              {redemptionRate}%
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            نسبة الاستبدال
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {redemptionRate}%
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <IconWrapper color="bg-pink-100 text-pink-600 dark:bg-pink-900/30">
              <DollarSign className="w-6 h-6" />
            </IconWrapper>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            إجمالي الكاش باك
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white dir-rtl">
            {stats?.totalCashback ? stats.totalCashback.toLocaleString() : "0"}{" "}
            ج.م
          </p>
        </div>
      </div>

      {/* Auto-Discount System Analytics */}
      {systemAnalytics?.system === "AUTO_DISCOUNT" && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BadgePercent className="h-5 w-5 text-amber-500" />
            تحليل نظام الخصم التلقائي
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "عملاء عندهم كوبون", value: systemAnalytics.appliedCustomers ?? 0 },
              { label: "كوبونات متاحة", value: systemAnalytics.activeVouchers ?? 0 },
              { label: "كوبونات مستخدمة", value: systemAnalytics.usedVouchers ?? 0 },
              { label: "اتحولت كاش باك", value: systemAnalytics.convertedVouchers ?? 0 },
              { label: "كوبونات منتهية", value: systemAnalytics.expiredVouchers ?? 0 },
              { label: "أوردرات مستنية كوبون", value: systemAnalytics.waitingForDelivery ?? 0 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800/60 p-3"
              >
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Number(item.value || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
              </div>
            ))}
          </div>
          {Number(systemAnalytics.preActivationCustomers || 0) > 0 && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              ⚠️ {systemAnalytics.preActivationCustomers} عميل عندهم أوردرات اتسلمت قبل
              تفعيل النظام — مش بياخدوا كوبون خصم تلقائي.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Program Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            أداء البرامج التفصيلي
          </h3>
          <div className="space-y-4">
            {programs.map((program) => (
              <div
                key={program.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm text-purple-600 dark:text-purple-400">
                    {getProgramIcon(program.type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {program.nameAr || program.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {program.customersCount} عميل مشترك
                    </p>
                  </div>
                </div>
                <div className="text-left rtl:text-right">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {program.totalPointsIssued.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-gray-500">
                      نقطة
                    </span>
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-2 w-24">
                    <div
                      className="bg-purple-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(100, (program.totalPointsRedeemed / (program.totalPointsIssued || 1)) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insight Card */}
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl p-8 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-8 -mb-8 pointer-events-none"></div>

          <Award className="w-12 h-12 text-yellow-400 mb-6" />
          <h3 className="text-2xl font-bold mb-2">رؤى وتوصيات</h3>
          <p className="text-purple-100 mb-6 leading-relaxed">
            معدل استبدال النقاط لديك {redemptionRate >= 50 ? 'جيد جداً' : 'يحتاج للتحسين'} ({redemptionRate}%)، {redemptionRate >= 50 ? 'مما يدل على اهتمام العملاء بالمكافآت' : 'نقترح مراجعة مكافآت برامج الولاء لزيادة التفاعل'}. 
            نقترح أيضاً إنشاء مستوى "بلاتيني" جديد للعملاء الذين تجاوزوا 5000 نقطة لزيادة ولائهم.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyAnalytics;
