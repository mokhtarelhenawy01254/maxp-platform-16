import { Monitor as ComputerDesktopIcon, Circle as UserGroupIcon, ShieldCheck as ShieldCheckIcon, PieChart as ChartPieIcon, ArrowRight as ArrowRightIcon } from 'lucide-react';
import React, { useState, useEffect } from "react";
;
import { motion } from "framer-motion";
import { companyAwareApi } from "../../../../services/companyAwareApi";

const OverviewSection: React.FC = () => {
  const [statsData, setStatsData] = useState({
    total: 0,
    inUse: 0,
    maintenance: 0,
    available: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await companyAwareApi.get("/hr/assets/stats");
        if (response.data.success) {
          setStatsData(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    {
      label: "إجمالي الأصول",
      value: statsData.total.toString(),
      icon: ComputerDesktopIcon,
      color: "blue",
    },
    {
      label: "العهد النشطة",
      value: statsData.inUse.toString(),
      icon: UserGroupIcon,
      color: "indigo",
    },
    {
      label: "تحت الصيانة",
      value: statsData.maintenance.toString(),
      icon: ShieldCheckIcon,
      color: "amber",
    },
    {
      label: "متوفر بالمخزن",
      value: statsData.available.toString(),
      icon: ChartPieIcon,
      color: "green",
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      {/* Hero Section */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative text-white group"
      >
        <div className="relative z-10 max-w-2xl">
          <motion.h2 
            initial={{ x: -20 }}
            animate={{ x: 0 }}
            className="text-4xl font-black mb-6 tracking-tight"
          >
            لوحة تحكم الأصول الذكية
          </motion.h2>
          <p className="text-xl text-indigo-100/90 mb-8 font-medium leading-relaxed">
            تتبع أصولك وسيطر على العهد بكفاءة تامة. نظامنا المتصل يوفر لك بيانات
            دقيقة في الوقت الفعلي لاتخاذ قرارات أسرع وأكثر ذكاءً.
          </p>
          <div className="flex flex-wrap gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 text-sm font-black bg-white/20 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/30 shadow-lg"
            >
              <ShieldCheckIcon className="h-5 w-5 text-indigo-200" />
              أمان البيانات 100%
            </motion.div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-colors duration-700"></div>
        <ComputerDesktopIcon className="absolute -left-10 -bottom-10 h-80 w-80 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-1000 ease-in-out" />
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-gray-800 rounded-[2rem] p-7 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl transition-all group"
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:rotate-6 group-hover:scale-110 shadow-lg ${colorClasses[stat.color]}`}
            >
              <stat.icon className="h-9 w-9" />
            </div>
            <p className="text-xs font-black text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest">
              {stat.label}
            </p>
            <h3 className="text-4xl font-black text-gray-900 dark:text-white tabular-nums">
              {loading ? (
                <div className="h-10 w-16 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-lg"></div>
              ) : (
                stat.value
              )}
            </h3>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions / Important Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-[2.5rem] p-8 border border-blue-100/50 dark:border-blue-800/50 flex flex-col justify-between group shadow-sm hover:shadow-xl transition-all"
        >
          <div>
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20">
              <ChartPieIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-black text-blue-900 dark:text-blue-100 mb-4">
              إدارة المخزون
            </h3>
            <p className="text-blue-700/80 dark:text-blue-300 text-lg leading-relaxed mb-8 font-medium">
              استكشف الأصول المتاحة، الموزعة، والتي تحتاج لصيانة في نظرة واحدة
              سريعة.
            </p>
          </div>
          <button className="flex items-center gap-3 text-blue-600 dark:text-blue-400 font-black text-sm group-hover:translate-x-2 transition-all">
            انتقل لسجل الأصول 
            <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm">
              <ArrowRightIcon className="h-4 w-4 rtl:rotate-180" />
            </div>
          </button>
        </motion.div>
 
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-[2.5rem] p-8 border border-emerald-100/50 dark:border-emerald-800/50 flex flex-col justify-between group shadow-sm hover:shadow-xl transition-all"
        >
          <div>
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-600/20">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mb-4">
              صيانة العهد
            </h3>
            <p className="text-emerald-700/80 dark:text-emerald-300 text-lg leading-relaxed mb-8 font-medium">
              تابع طلبات الموظفين وتاريخ صيانة الأصول لضمان استمرارية العمل دون
              انقطاع.
            </p>
          </div>
          <button className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-black text-sm group-hover:translate-x-2 transition-all">
            عرض الطلبات النشطة 
            <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm">
              <ArrowRightIcon className="h-4 w-4 rtl:rotate-180" />
            </div>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default OverviewSection;
