import React from "react";
import { Truck, Zap, Clock, ArrowDownUp } from "lucide-react";
import type { VelocityKpis } from "../types";

interface Props {
  kpis: VelocityKpis;
}

export const VelocityKpisStrip: React.FC<Props> = ({ kpis }) => {
  const isBacklogDraining = kpis.netBacklogDelta >= 0;

  const leadTimeDisplay =
    kpis.avgLeadTimeHours >= 24
      ? `${(kpis.avgLeadTimeHours / 24).toFixed(1)} يوم`
      : `${kpis.avgLeadTimeHours} س`;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Shipped */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>إجمالي المشحون الفعلي</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Truck className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {kpis.totalShippedCount.toLocaleString("ar-EG")}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">طلب</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>القيمة الإجمالية</span>
          <span className="font-semibold text-slate-700 tabular-nums dark:text-slate-300">
            {kpis.totalShippedRevenue.toLocaleString("ar-EG")} ج.م
          </span>
        </div>
      </div>

      {/* 2. Same-Day Fulfillment */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>شحن فوري (نفس اليوم)</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Zap className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">
            {kpis.sameDayRate}%
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({kpis.sameDayCount.toLocaleString("ar-EG")} طلب)
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>متأخر (&gt; 3 أيام)</span>
          <span className="font-semibold text-amber-600 tabular-nums dark:text-amber-400">
            {kpis.agedBacklogRate}% ({kpis.agedBacklogCount})
          </span>
        </div>
      </div>

      {/* 3. Avg Lead Time */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>متوسط دورة التجهيز (Lead Time)</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {leadTimeDisplay}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">من الطلب للشحن</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>الساعات الدقيقة</span>
          <span className="font-semibold text-slate-700 tabular-nums dark:text-slate-300">
            {kpis.avgLeadTimeHours} ساعة
          </span>
        </div>
      </div>

      {/* 4. Inflow vs Outflow */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>ميزان اليوم (وارد vs خارج)</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <ArrowDownUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {kpis.outflowCount} / {kpis.inflowCount}
          </span>
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
              isBacklogDraining
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
            }`}
          >
            {isBacklogDraining ? `+${kpis.netBacklogDelta} تصفية` : `${kpis.netBacklogDelta} تراكم`}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>الوارد الجديد : المشحون</span>
          <span className="font-semibold text-slate-700 tabular-nums dark:text-slate-300">
            {kpis.inflowCount} جديد · {kpis.outflowCount} مشحون
          </span>
        </div>
      </div>
    </div>
  );
};
