import React from "react";
import {
  ArrowPathIcon,
  BanknotesIcon,
  SparklesIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface AovTelemetryHeaderProps {
  period: "today" | "yesterday" | "7" | "30";
  setPeriod: (p: "today" | "yesterday" | "7" | "30") => void;
  loading: boolean;
  onRefresh: () => void;
  lastRefreshedAt: Date | null;
  error?: string | null;
  overallKpis: {
    currentAov: number;
    totalIncrementalRev: number;
    activeEnginesCount: number;
    totalEnginesCount: number;
    penetrationRate: number;
  };
}

export const AovTelemetryHeader: React.FC<AovTelemetryHeaderProps> = ({
  period,
  setPeriod,
  loading,
  onRefresh,
  lastRefreshedAt,
  error,
  overallKpis,
}) => {
  const formatPrice = (val: number) => `${Math.round(val || 0).toLocaleString()} ج.م`;

  return (
    <div className="shrink-0 border-b border-zinc-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#070709]/95 backdrop-blur-md">
      {/* 1. Command Bar */}
      <div className="h-11 sm:h-12 px-3 sm:px-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
          <h1 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
            مركز نمو السلة الموحد (AOV Growth Cockpit)
          </h1>
          <span className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-medium bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-white/[0.08]">
            {overallKpis.totalEnginesCount} محرك قيمة
          </span>
          {error && !loading && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              <ExclamationTriangleIcon className="h-3 w-3" />
              {error}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Period Selector */}
          <div
            className="inline-flex rounded-md p-0.5 bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.08]"
            role="group"
            aria-label="اختر فترة التحليل"
          >
            {(
              [
                { id: "today", label: "اليوم" },
                { id: "yesterday", label: "أمس" },
                { id: "7", label: "7 أيام" },
                { id: "30", label: "30 يوم" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                aria-pressed={period === item.id}
                className={`px-2 sm:px-2.5 py-1 text-[11px] font-medium rounded transition-all active:scale-[0.97] ${
                  period === item.id
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-zinc-200/60 dark:border-white/[0.08] transition-all active:scale-[0.97] disabled:opacity-50"
            title={`تحديث${lastRefreshedAt ? ` (آخر مزامنة: ${lastRefreshedAt.toLocaleTimeString("ar-EG")})` : ""}`}
            aria-label="تحديث البيانات"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Unified Telemetry KPI Strip */}
      <div
        className="px-3 sm:px-4 py-2.5 border-t border-zinc-200/60 dark:border-white/[0.06] grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 bg-zinc-50/50 dark:bg-white/[0.01]"
        aria-busy={loading}
      >
        {/* KPI 1: Current AOV */}
        <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 block mb-0.5">
              متوسط قيمة الطلب (AOV)
            </span>
            <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tabular-nums">
              {loading ? "…" : formatPrice(overallKpis.currentAov)}
            </div>
          </div>
          <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ArrowTrendingUpIcon className="h-4 w-4" />
          </div>
        </div>

        {/* KPI 2: Total Incremental Revenue Lift */}
        <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 block mb-0.5">
              إجمالي الإيراد الإضافي المسترد
            </span>
            <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {loading ? "…" : formatPrice(overallKpis.totalIncrementalRev)}
            </div>
          </div>
          <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <BanknotesIcon className="h-4 w-4" />
          </div>
        </div>

        {/* KPI 3: AOV Penetration Rate */}
        <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 block mb-0.5">
              نسبة تغلغل عروض AOV
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tabular-nums">
                {loading ? "…" : `${overallKpis.penetrationRate}%`}
              </span>
              <span className="text-[10px] text-zinc-400">من الطلبات</span>
            </div>
          </div>
          <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <SparklesIcon className="h-4 w-4" />
          </div>
        </div>

        {/* KPI 4: Active Engines */}
        <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 block mb-0.5">
              المحركات النشطة
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tabular-nums">
                {loading ? "…" : overallKpis.activeEnginesCount}
              </span>
              <span className="text-xs text-zinc-400">
                / {overallKpis.totalEnginesCount} محرك
              </span>
            </div>
          </div>
          <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <CubeIcon className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
