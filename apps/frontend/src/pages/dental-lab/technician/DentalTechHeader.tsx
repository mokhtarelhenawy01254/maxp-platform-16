import React from "react";
import { Stethoscope, Sparkles, ScanLine, RefreshCw, ListChecks, ShieldAlert, Zap, Wallet } from "lucide-react";
import { MyCase, MyWage, ROLE_CONFIG, fmtMoney } from "../shared";

interface DentalTechHeaderProps {
  technicianName?: string;
  technicianRole?: string;
  cases: MyCase[];
  overdueCases: MyCase[];
  wage: MyWage | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenKiosk: () => void;
  onSelectOverdue: () => void;
}

export const DentalTechHeader: React.FC<DentalTechHeaderProps> = ({
  technicianName,
  technicianRole,
  cases,
  overdueCases,
  wage,
  loading,
  onRefresh,
  onOpenKiosk,
  onSelectOverdue,
}) => {
  const roleLabel = technicianRole && ROLE_CONFIG[technicianRole]
    ? ROLE_CONFIG[technicianRole].label
    : "فني معمل أسنان";

  const safeCases = Array.isArray(cases) ? cases : [];
  const safeOverdue = Array.isArray(overdueCases) ? overdueCases : [];

  return (
    <header className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {technicianName ? `محطة عمل: ${technicianName}` : "محطة عمل الفني"}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                <Sparkles className="w-3 h-3" />
                {roleLabel}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              استلام الحالات ومراحل الإنتاج، قياس الوقت، ومتابعة المستحقات وسندات الصرف
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onOpenKiosk}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition shadow-xs"
          >
            <ScanLine className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>ماسح الباركود</span>
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Active Cases */}
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium">حالات قيد العمل</span>
            <ListChecks className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{safeCases.length}</span>
            <span className="text-xs text-gray-500">حالة</span>
          </div>
        </div>

        {/* Card 2: Overdue Cases */}
        <div
          onClick={onSelectOverdue}
          className={`p-3.5 rounded-xl border cursor-pointer transition shadow-xs ${
            safeOverdue.length > 0
              ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50"
              : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${safeOverdue.length > 0 ? "text-rose-700 dark:text-rose-400" : "text-gray-500"}`}>
              حالات متأخرة
            </span>
            <ShieldAlert className={`w-4 h-4 ${safeOverdue.length > 0 ? "text-rose-600 animate-pulse" : "text-gray-400"}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl font-black ${safeOverdue.length > 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-900 dark:text-white"}`}>
              {safeOverdue.length}
            </span>
            <span className={`text-xs ${safeOverdue.length > 0 ? "text-rose-600 font-semibold" : "text-gray-500"}`}>
              {safeOverdue.length > 0 ? "تحتاج تدخلاً سريعاً" : "لا يوجد تأخير"}
            </span>
          </div>
        </div>

        {/* Card 3: Today's Stages */}
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium">إنجاز اليوم</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{wage?.todayStages ?? 0}</span>
              <span className="text-xs text-gray-500 mr-1">مراحل</span>
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
              +{fmtMoney(wage?.todayWage ?? 0)} ج.م
            </span>
          </div>
        </div>

        {/* Card 4: Net Balance */}
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium">صافي الرصيد المستحق</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-700 dark:text-blue-300">{fmtMoney(wage?.balance ?? 0)}</span>
            <span className="text-xs text-gray-500">ج.م</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DentalTechHeader;
