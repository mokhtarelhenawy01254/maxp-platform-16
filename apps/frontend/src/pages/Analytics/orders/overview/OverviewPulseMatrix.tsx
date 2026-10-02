import React from "react";
import { Link } from "react-router-dom";
import {
  BanknotesIcon,
  MapPinIcon,
  XCircleIcon,
  TruckIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import { DashboardStats } from "./types";

interface OverviewPulseMatrixProps {
  stats: DashboardStats;
  formatPrice: (val: number) => string;
}

export const OverviewPulseMatrix: React.FC<OverviewPulseMatrixProps> = ({
  stats,
  formatPrice,
}) => {
  const total = Math.max(1, stats.totalOrders);
  const codShare = ((stats.codOrders / total) * 100).toFixed(0);
  const prepaidShare = ((stats.prepaidOrders / total) * 100).toFixed(0);

  const topRegions = (stats.regionalPerformance || []).slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. نبض الدفع والـ COD */}
      <div className="flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#121214]">
        <div>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <BanknotesIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              نبض الدفع والتحصيل (COD)
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">دفع عند الاستلام (COD)</span>
              <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                {stats.codOrders} ({codShare}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">دفع مسبق / بطاقات</span>
              <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                {stats.prepaidOrders} ({prepaidShare}%)
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-2.5 border-t border-gray-100 dark:border-white/5">
          <Link
            to="/analytics/orders/cod-performance"
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <span>تقرير أداء الدفع عند الاستلام</span>
            <ArrowUpRightIcon className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* 2. نبض التوزيع الجغرافي (Pareto) */}
      <div className="flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#121214]">
        <div>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <MapPinIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              أعلى المحافظات طلباً
            </span>
          </div>

          <div className="mt-3 space-y-1.5">
            {topRegions.length > 0 ? (
              topRegions.map((reg, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-300 truncate max-w-[110px]">
                    {reg.region || `منطقة ${idx + 1}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                      {reg.totalOrders} طلب
                    </span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums text-[11px]">
                      {reg.successRate > 0 ? `${reg.successRate}%` : ""}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                بيانات التوزيع الجغرافي جارية المعالجة
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-2.5 border-t border-gray-100 dark:border-white/5">
          <Link
            to="/analytics/orders/regions"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>خريطة وتحليلات المحافظات</span>
            <ArrowUpRightIcon className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* 3. نبض الإلغاء والمرتجع */}
      <div className="flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#121214]">
        <div>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <XCircleIcon className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              نزيف المبيعات (Leakage)
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">إلغاء قبل الشحن</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                {stats.cancelledOrders} طلب
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">مرتجع بعد الشحن (RTO)</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {stats.returnedOrders} طلب
              </span>
            </div>
            {stats.lostRevenue > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-gray-100 dark:border-white/5">
                <span className="text-gray-500 dark:text-gray-400">إيراد مفقود</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums text-[11px]">
                  {formatPrice(stats.lostRevenue)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-2.5 border-t border-gray-100 dark:border-white/5">
          <Link
            to="/analytics/orders/cancellations"
            className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
          >
            <span>تشخيص أسباب الإلغاء</span>
            <ArrowUpRightIcon className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* 4. نبض الشحن والتجهيز */}
      <div className="flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#121214]">
        <div>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <TruckIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              لوجستيات التجهيز والتسليم
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">شحنات جارية للتسليم</span>
              <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                {stats.shippedOrders || 0} شحنة
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">قيد المعالجة بالمخزن</span>
              <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                {stats.processingOrders || 0} طلب
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-2.5 border-t border-gray-100 dark:border-white/5">
          <Link
            to="/analytics/orders/fulfillment"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>كفاءة التجهيز وسلاسل الإمداد</span>
            <ArrowUpRightIcon className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OverviewPulseMatrix;
