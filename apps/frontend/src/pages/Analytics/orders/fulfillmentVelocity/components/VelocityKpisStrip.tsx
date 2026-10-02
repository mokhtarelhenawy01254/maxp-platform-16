import React from "react";
import { Truck, Package, Zap, Clock, ArrowDownUp, Boxes, CheckCircle2 } from "lucide-react";
import type { VelocityKpis } from "../types";

interface Props {
  kpis: VelocityKpis;
}

export const VelocityKpisStrip: React.FC<Props> = ({ kpis }) => {
  const isPrepMilestone = kpis.milestone === "READY_TO_SHIP";
  const isBacklogDraining = kpis.netBacklogDelta >= 0;

  const leadTimeDisplay =
    kpis.avgLeadTimeHours >= 24
      ? `${(kpis.avgLeadTimeHours / 24).toFixed(1)} يوم`
      : `${kpis.avgLeadTimeHours} س`;

  return (
    <div className="space-y-3">
      {/* 5-KPI Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Processed */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{isPrepMilestone ? "إنجاز التجهيز اليوم (المخزن)" : "إجمالي المشحون الفعلي (الكابتن)"}</span>
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                isPrepMilestone
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
              }`}
            >
              {isPrepMilestone ? <Package className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
              {kpis.totalShippedCount.toLocaleString("ar-EG")}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isPrepMilestone ? "طلب مجهز" : "طلب مشحون"}
            </span>
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
            <span>{isPrepMilestone ? "تجهيز فوري (نفس اليوم)" : "شحن فوري (نفس اليوم)"}</span>
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
            <span>{isPrepMilestone ? "متوسط سرعة التجهيز" : "متوسط دورة الشحن"}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
              {leadTimeDisplay}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isPrepMilestone ? "من الطلب إلى جاهز" : "من الطلب للكابتن"}
            </span>
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
            <span>{isPrepMilestone ? "ميزان التجهيز (وارد vs مجهّز)" : "ميزان الشحن (وارد vs مشحون)"}</span>
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
            <span>الوارد الجديد : المنجز</span>
            <span className="font-semibold text-slate-700 tabular-nums dark:text-slate-300">
              {kpis.inflowCount} جديد · {kpis.outflowCount} {isPrepMilestone ? "تجهيز" : "شحن"}
            </span>
          </div>
        </div>
      </div>

      {/* Carrier Handoff Staging Buffer Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-200/70 bg-gradient-to-l from-amber-50/70 via-white to-amber-50/40 px-4 py-2.5 text-xs dark:border-amber-900/40 dark:bg-slate-900 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                بانتظار استلام مندوب الشحن حالياً في المخزن:
              </span>
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-bold tabular-nums text-amber-800 dark:text-amber-300">
                {(kpis.waitingCarrierCount ?? 0).toLocaleString("ar-EG")} أوردر جاهز ومغلّف
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              أوردرات أنهى عمال التجهيز تغليفها وطباعة بوالصها وتقف على منصة التسليم بانتظار حضور الكابتن
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto text-[11px]">
          <div>
            <span className="text-slate-500 dark:text-slate-400">القيمة المعلقة: </span>
            <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
              {(kpis.waitingCarrierRevenue ?? 0).toLocaleString("ar-EG")} ج.م
            </span>
          </div>
          {isPrepMilestone && kpis.handoffDoneCount !== undefined && (
            <div className="flex items-center gap-1.5 border-s border-amber-200 ps-3 dark:border-amber-900/60">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-600 dark:text-slate-300">
                استلم الكابتن من دفعة اليوم:{" "}
                <strong className="text-emerald-600 tabular-nums dark:text-emerald-400">
                  {kpis.handoffDoneCount}
                </strong>{" "}
                · متبقي بالمخزن:{" "}
                <strong className="text-amber-600 tabular-nums dark:text-amber-400">
                  {kpis.handoffPendingCount}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
