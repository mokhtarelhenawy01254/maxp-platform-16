import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  TruckIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { DashboardStats } from "./types";

interface OverviewPipelineFlowProps {
  stats: DashboardStats;
}

export const OverviewPipelineFlow: React.FC<OverviewPipelineFlowProps> = ({
  stats,
}) => {
  const total = Math.max(1, stats.totalOrders);
  const delivered = stats.completedOrders;
  const inTransit = stats.shippedOrders || 0;
  const processing =
    (stats.processingOrders || 0) +
    (stats.confirmedOrders || 0) +
    (stats.pendingOrders || 0);
  const cancelled = stats.cancelledOrders;
  const returned = stats.returnedOrders;

  // Percentage calculations
  const deliveredPct = ((delivered / total) * 100).toFixed(1);
  const inTransitPct = ((inTransit / total) * 100).toFixed(1);
  const processingPct = ((processing / total) * 100).toFixed(1);
  const dropPct = (((cancelled + returned) / total) * 100).toFixed(1);

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-white/10 dark:bg-[#121214]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-white/5">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
            مسار تدفق الطلبات ودورة الحياة (Order Velocity Pipeline)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            توزيع تدفق الطلبات عبر محطات التشغيل من التسجيل وحتى التحصيل النهائي
          </p>
        </div>
        <Link
          to="/analytics/orders/status-movement"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          <span>مصفوفة انتقال الحالات التفصيلية</span>
          <ArrowRightIcon className="h-3 w-3 rotate-180" />
        </Link>
      </div>

      {/* Segmented Pipeline Bar */}
      <div className="w-full bg-gray-100 dark:bg-gray-800/80 rounded-full h-3 sm:h-3.5 flex overflow-hidden p-0.5 gap-0.5">
        <div
          style={{ width: `${Math.max(2, Number(deliveredPct))}%` }}
          className="bg-emerald-500 rounded-sm transition-all"
          title={`تم التسليم: ${delivered} (${deliveredPct}%)`}
        />
        {Number(inTransitPct) > 0 && (
          <div
            style={{ width: `${Number(inTransitPct)}%` }}
            className="bg-blue-500 rounded-sm transition-all"
            title={`مع الشحن: ${inTransit} (${inTransitPct}%)`}
          />
        )}
        {Number(processingPct) > 0 && (
          <div
            style={{ width: `${Number(processingPct)}%` }}
            className="bg-amber-500 rounded-sm transition-all"
            title={`قيد المعالجة والتجهيز: ${processing} (${processingPct}%)`}
          />
        )}
        {Number(dropPct) > 0 && (
          <div
            style={{ width: `${Number(dropPct)}%` }}
            className="bg-rose-500 rounded-sm transition-all"
            title={`إلغاء ومرتجع: ${cancelled + returned} (${dropPct}%)`}
          />
        )}
      </div>

      {/* Stage Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
        {/* Stage 1: الناجحة والمسلمة */}
        <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-2.5 sm:p-3">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <span className="text-xs font-semibold">مسلّم ومحصّل</span>
            <CheckCircleIcon className="h-4 w-4" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-bold text-emerald-900 dark:text-emerald-100 tabular-nums">
              {delivered.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">
              ({deliveredPct}%)
            </span>
          </div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            كاش مستقر وناجح
          </p>
        </div>

        {/* Stage 2: مع الشحن / قيد التوصيل */}
        <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-2.5 sm:p-3">
          <div className="flex items-center justify-between text-blue-800 dark:text-blue-300">
            <span className="text-xs font-semibold">مع شركة الشحن</span>
            <TruckIcon className="h-4 w-4" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">
              {inTransit.toLocaleString()}
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-400 tabular-nums">
              ({inTransitPct}%)
            </span>
          </div>
          <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1">
            شحنات جارية مع المناديب
          </p>
        </div>

        {/* Stage 3: قيد المتابعة والتجهيز */}
        <div className="rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-2.5 sm:p-3">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
            <span className="text-xs font-semibold">قيد التأكيد والتجهيز</span>
            <ArrowPathIcon className="h-4 w-4" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-bold text-amber-900 dark:text-amber-100 tabular-nums">
              {processing.toLocaleString()}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-400 tabular-nums">
              ({processingPct}%)
            </span>
          </div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1">
            بانتظار التأكيد أو التعبئة
          </p>
        </div>

        {/* Stage 4: الهدر والإلغاء */}
        <div className="rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-2.5 sm:p-3">
          <div className="flex items-center justify-between text-rose-800 dark:text-rose-300">
            <span className="text-xs font-semibold">ملغي ومرتجع (RTO)</span>
            <XCircleIcon className="h-4 w-4" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-bold text-rose-900 dark:text-rose-100 tabular-nums">
              {(cancelled + returned).toLocaleString()}
            </span>
            <span className="text-xs text-rose-700 dark:text-rose-400 tabular-nums">
              ({dropPct}%)
            </span>
          </div>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1">
            {cancelled} إلغاء / {returned} مرتجع
          </p>
        </div>
      </div>
    </div>
  );
};

export default OverviewPipelineFlow;
