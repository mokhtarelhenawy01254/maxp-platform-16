import React, { useState, useMemo } from "react";
import { BarChart3, Printer, CheckCircle2, Zap, AlertTriangle, Layers } from "lucide-react";
import { MyCase, MyWage, fmtDate, fmtMoney } from "../shared";

interface DentalTechReportsTabProps {
  wage: MyWage | null;
  overdueCases: MyCase[];
}

export const DentalTechReportsTab: React.FC<DentalTechReportsTabProps> = ({
  wage,
  overdueCases,
}) => {
  const [reportPeriod, setReportPeriod] = useState<"TODAY" | "7DAYS" | "MONTH" | "ALL">("MONTH");

  const safeStages = useMemo(
    () => (Array.isArray(wage?.recentStages) ? wage.recentStages : []),
    [wage?.recentStages]
  );
  const safeOverdue = useMemo(
    () => (Array.isArray(overdueCases) ? overdueCases : []),
    [overdueCases]
  );

  const reportFilteredStages = useMemo(() => {
    if (reportPeriod === "ALL") return safeStages;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return safeStages.filter((st) => {
      const t = st.completedAt ? new Date(st.completedAt).getTime() : 0;
      if (reportPeriod === "TODAY") return t >= todayStart;
      if (reportPeriod === "7DAYS") return t >= sevenDaysAgo;
      if (reportPeriod === "MONTH") return t >= monthStart;
      return true;
    });
  }, [safeStages, reportPeriod]);

  const reportStats = useMemo(() => {
    const totalEarned = reportFilteredStages.reduce((sum, s) => sum + (s.wageAmount || 0), 0);
    const uniqueCases = new Set(reportFilteredStages.map((s) => s.caseId)).size;
    return {
      stagesCount: reportFilteredStages.length,
      casesCount: uniqueCases,
      totalEarned,
      overdueCount: safeOverdue.length,
    };
  }, [reportFilteredStages, safeOverdue]);

  return (
    <div className="space-y-4">
      {/* Report Header & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>تقرير الإنتاجية والأداء الفني</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            كشف تحليلي بالمراحل المنجزة، الحالات المنتجة، والأجور المستحقة عن الفترة
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setReportPeriod("TODAY")}
              className={`px-2.5 py-1 rounded-lg transition ${
                reportPeriod === "TODAY"
                  ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setReportPeriod("7DAYS")}
              className={`px-2.5 py-1 rounded-lg transition ${
                reportPeriod === "7DAYS"
                  ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => setReportPeriod("MONTH")}
              className={`px-2.5 py-1 rounded-lg transition ${
                reportPeriod === "MONTH"
                  ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setReportPeriod("ALL")}
              className={`px-2.5 py-1 rounded-lg transition ${
                reportPeriod === "ALL"
                  ? "bg-white dark:bg-gray-700 text-blue-600 shadow-xs"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              الكل
            </button>
          </div>

          {/* Print button */}
          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 text-xs flex items-center gap-1 shadow-xs"
            title="طباعة التقرير"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for Report */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <span className="text-xs text-gray-500">المراحل المنفذة للفترة</span>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{reportStats.stagesCount}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <span className="text-xs text-gray-500">عدد الحالات المشمولة</span>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{reportStats.casesCount}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20">
          <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">أجر الإنتاج للفترة</span>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            +{fmtMoney(reportStats.totalEarned)} <span className="text-xs">ج.م</span>
          </p>
        </div>
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <span className="text-xs text-gray-500">المتأخرات الحالية</span>
          <p
            className={`text-xl font-bold mt-1 ${
              reportStats.overdueCount > 0 ? "text-rose-600 font-black" : "text-gray-900 dark:text-white"
            }`}
          >
            {reportStats.overdueCount}
          </p>
        </div>
      </div>

      {/* Detailed List */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs">
        <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
          <span className="font-bold text-gray-800 dark:text-gray-200">بيان تفصيلي ببنود الإنتاج المنفذة</span>
          <span className="text-gray-500">عدد البنود: {reportFilteredStages.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="text-gray-500 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
              <tr>
                <th className="py-2.5 px-3">التاريخ</th>
                <th className="py-2.5 px-3">رقم الحالة</th>
                <th className="py-2.5 px-3">المرحلة</th>
                <th className="py-2.5 px-3">نوع الشغل</th>
                <th className="py-2.5 px-3">الطبيب</th>
                <th className="py-2.5 px-3 text-left">الأجر المستحق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {reportFilteredStages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    لا توجد بنود عمل مسجلة في الفترة المحددة
                  </td>
                </tr>
              ) : (
                reportFilteredStages.map((st) => (
                  <tr key={st.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-2.5 px-3 text-gray-500">{fmtDate(st.completedAt)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold">#{st.caseNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">{st.stageName}</td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{st.workTypeName || "—"}</td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{st.doctorName || "—"}</td>
                    <td className="py-2.5 px-3 text-left font-bold text-emerald-600 dark:text-emerald-400">
                      +{fmtMoney(st.wageAmount)} ج.م
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DentalTechReportsTab;
