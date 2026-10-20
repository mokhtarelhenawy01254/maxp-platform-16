import {
  BadgePercent,
  Banknote,
  Clock,
  FileSpreadsheet,
  KeyRound,
  Layers,
  Receipt,
  Wallet,
} from "lucide-react";
import type { DentalLabDoctorDetail } from "../../shared";
import { fmtMoney } from "../../shared";
import type { DetailTab } from "../types/doctorDetailTypes";

export interface DoctorDetailKpiCardsProps {
  doctor: DentalLabDoctorDetail;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}

export function DoctorDetailKpiCards({
  doctor,
  activeTab,
  onTabChange,
}: DoctorDetailKpiCardsProps) {
  const tabs = [
    { id: "cases", label: "حالات الطبيب", icon: Layers, count: doctor.casesCount },
    { id: "invoices", label: "الفواتير والمدفوعات", icon: Receipt, count: doctor.invoicesCount },
    { id: "statement", label: "كشف الحساب", icon: FileSpreadsheet },
    { id: "pricing", label: "التسعير المخصص", icon: BadgePercent },
    { id: "portal", label: "بوابة الطبيب والحساب", icon: KeyRound },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Financial & Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Outstanding Balance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              الرصيد المتبقي (المديونية)
            </span>
            <Wallet className="w-4 h-4 text-red-500" />
          </div>
          <p
            className={`text-lg sm:text-2xl font-black mt-1.5 font-mono tabular-nums ${
              (doctor.outstanding ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600"
            }`}
          >
            {fmtMoney(doctor.outstanding ?? 0)}{" "}
            <span className="text-xs font-normal font-sans">ج.م</span>
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span>
              حد الائتمان: {doctor.creditLimit ? `${fmtMoney(doctor.creditLimit)} ج.م` : "غير محدد"}
            </span>
            {doctor.creditExceeded && (
              <span className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                تجاوز الحد!
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Total Invoiced */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              إجمالي المسحوبات (الفوترة)
            </span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black mt-1.5 text-gray-900 dark:text-gray-100 font-mono tabular-nums">
            {fmtMoney(doctor.totalBilled ?? 0)}{" "}
            <span className="text-xs font-normal font-sans">ج.م</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-mono tabular-nums">
            {doctor.invoicesCount ?? 0} فواتير مسجلة
          </p>
        </div>

        {/* Card 3: Total Paid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              إجمالي المدفوعات (المحصل)
            </span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {fmtMoney(doctor.totalPaid ?? 0)}{" "}
            <span className="text-xs font-normal font-sans">ج.م</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-mono tabular-nums">
            نسبة التحصيل:{" "}
            {(doctor.totalBilled ?? 0) > 0
              ? `${Math.round(((doctor.totalPaid ?? 0) / (doctor.totalBilled || 1)) * 100)}%`
              : "100%"}
          </p>
        </div>

        {/* Card 4: Cases Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              حالات الطبيب
            </span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-lg sm:text-2xl font-black text-gray-900 dark:text-gray-100 font-mono tabular-nums">
              {doctor.activeCases ?? 0}
            </span>
            <span className="text-xs text-blue-600 font-semibold">حالة شغالة</span>
            <span className="text-xs text-gray-400 font-mono tabular-nums">
              / {doctor.casesCount ?? 0} إجمالي
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-medium font-mono tabular-nums">
              {doctor.completedCases ?? 0} منتهية
            </span>
            {(doctor.overdueCases ?? 0) > 0 ? (
              <span className="text-red-600 font-bold flex items-center gap-1 font-mono tabular-nums">
                <Clock className="w-3 h-3" />
                {doctor.overdueCases} متأخرة
              </span>
            ) : (
              <span className="text-gray-400">لا يوجد تأخير</span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-b dark:border-gray-700">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as DetailTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-all touch-manipulation min-h-[44px] ${
                  active
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono tabular-nums ${
                      active
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DoctorDetailKpiCards;
