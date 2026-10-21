import React from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../../hooks/useCurrency";
import { CouponStats } from "./types";

interface CouponsStatsStripProps {
  stats: CouponStats | null;
  statsLoading: boolean;
  totalCount: number;
}

export const CouponsStatsStrip: React.FC<CouponsStatsStripProps> = ({
  stats,
  statsLoading,
  totalCount,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  return (
    <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
      <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:sm:divide-x-reverse">
        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>{t("coupons.statsTotalCoupons")}</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
            {statsLoading ? "..." : (stats?.totalCoupons ?? totalCount)}
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
            إجمالي الكوبونات المسجلة
          </div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>{t("coupons.statsActiveCoupons")}</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {statsLoading ? "..." : (stats?.activeCoupons ?? "-")}
          </div>
          <div className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-1 font-mono">
            جاهزة للاستخدام الآن
          </div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>{t("coupons.statsTotalUsages")}</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
            {statsLoading ? "..." : (stats?.totalUsages ?? "-")}
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
            مرات التطبيق بالطلبات
          </div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>{t("coupons.statsTotalDiscount")}</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {statsLoading ? "..." : formatPrice(stats?.totalDiscount || 0)}
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
            قيمة الخصومات الممنوحة
          </div>
        </div>
      </div>
    </div>
  );
};
