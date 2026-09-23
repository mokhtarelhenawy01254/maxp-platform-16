import React from "react";
import {
  ShoppingBagIcon,
  CheckCircleIcon,
  TruckIcon,
  ArchiveBoxIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathRoundedSquareIcon,
} from "@heroicons/react/24/outline";
import { Skeleton } from "../../../components/ui/skeleton";

interface OrdersMetricsStripProps {
  loading: boolean;
  totalOrders: number;
  totalRevenue: number;
  totalPieces: number;
  deliveredOrders: number;
  deliveredPct: number;
  inTransitOrders: number;
  inTransitPct: number;
  warehouseOrders: number;
  warehousePct: number;
  unprocessedOrders: number;
  unprocessedPct: number;
  cancelledOrders: number;
  cancelledPct: number;
  returnedOrders: number;
  returnedPct: number;
  formatPrice: (amount: number) => string;
  onFilterStatus?: (status: string) => void;
}

export const OrdersMetricsStrip: React.FC<OrdersMetricsStripProps> = ({
  loading,
  totalOrders,
  totalRevenue,
  totalPieces,
  deliveredOrders,
  deliveredPct,
  inTransitOrders,
  inTransitPct,
  warehouseOrders,
  warehousePct,
  unprocessedOrders,
  unprocessedPct,
  cancelledOrders,
  cancelledPct,
  returnedOrders,
  returnedPct,
  formatPrice,
  onFilterStatus,
}) => {
  return (
    <div className="border-b border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#070709]">
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-zinc-200/80 dark:divide-white/[0.08]">
        
        {/* 1. HERO NORTH STAR: TOTAL ORDERS (4 Columns) */}
        <div className="lg:col-span-4 p-4 sm:p-5 flex flex-col justify-between min-w-0 bg-zinc-50/50 dark:bg-white/[0.02]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-xs">
                  <ShoppingBagIcon className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  إجمالي الطلبات المسجلة
                </span>
              </div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md tabular-nums">
                الفترة المحددة
              </span>
            </div>

            {loading ? (
              <Skeleton className="h-12 w-48 rounded my-2" />
            ) : (
              <div className="flex items-baseline gap-2.5 my-2">
                <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-zinc-950 dark:text-white">
                  {totalOrders.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">طلب</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400 mt-1 tabular-nums">
              <span>
                إجمالي القيمة:{" "}
                <strong className="text-zinc-900 dark:text-zinc-100 font-bold">
                  {formatPrice(totalRevenue)}
                </strong>
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <span>
                القطع:{" "}
                <strong className="text-zinc-900 dark:text-zinc-100 font-bold">
                  {totalPieces.toLocaleString()}
                </strong>
              </span>
            </div>
          </div>

          {/* Full Distribution Segmented Progress Bar */}
          <div className="mt-4 pt-3 border-t border-zinc-200/70 dark:border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
              <span>توزيع مسار الطلبات (100%)</span>
              <span className="tabular-nums font-semibold text-zinc-700 dark:text-zinc-300">
                {totalOrders} طلب
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-200/70 dark:bg-zinc-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${deliveredPct}%` }}
                title={`مسلّم: ${deliveredOrders} (${deliveredPct}%)`}
              />
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${inTransitPct}%` }}
                title={`معلق بالشحن: ${inTransitOrders} (${inTransitPct}%)`}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${warehousePct}%` }}
                title={`معلق بالمخزن: ${warehouseOrders} (${warehousePct}%)`}
              />
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${unprocessedPct}%` }}
                title={`جديد قيد التأكيد: ${unprocessedOrders} (${unprocessedPct}%)`}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${cancelledPct}%` }}
                title={`ملغي: ${cancelledOrders} (${cancelledPct}%)`}
              />
              <div
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${returnedPct}%` }}
                title={`مرتجع: ${returnedOrders} (${returnedPct}%)`}
              />
            </div>
          </div>
        </div>

        {/* 2. THE 6 OPERATIONAL FUNNEL STAGES (8 Columns) */}
        <div className="lg:col-span-8 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          
          {/* Stage 1: Delivered */}
          <div
            onClick={() => onFilterStatus && onFilterStatus("DELIVERED")}
            className="p-2.5 sm:p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08] transition-colors cursor-pointer flex flex-col justify-between"
            title="انقر لتصفية الطلبات المسلمة"
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
                <span>تم التسليم</span>
              </span>
              <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded tabular-nums">
                {deliveredPct}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-emerald-950 dark:text-emerald-100">
                {deliveredOrders.toLocaleString()}
              </span>
              <span className="text-[11px] text-zinc-500">طلب ناجح</span>
            </div>
          </div>

          {/* Stage 2: In Transit */}
          <div
            onClick={() => onFilterStatus && onFilterStatus("SHIPPED")}
            className="p-2.5 sm:p-3 rounded-lg border border-sky-500/20 bg-sky-500/[0.04] hover:bg-sky-500/[0.08] transition-colors cursor-pointer flex flex-col justify-between"
            title="انقر لتصفية الطلبات قيد الشحن"
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs font-bold text-sky-800 dark:text-sky-400 flex items-center gap-1">
                <TruckIcon className="h-3.5 w-3.5 shrink-0" />
                <span>معلق بالشحن</span>
              </span>
              <span className="text-[11px] font-black text-sky-700 dark:text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded tabular-nums">
                {inTransitPct}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-sky-950 dark:text-sky-100">
                {inTransitOrders.toLocaleString()}
              </span>
              <span className="text-[11px] text-zinc-500">مع المندوب</span>
            </div>
          </div>

          {/* Stage 3: Warehouse Pending */}
          <div
            onClick={() => onFilterStatus && onFilterStatus("PROCESSING")}
            className="p-2.5 sm:p-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] transition-colors cursor-pointer flex flex-col justify-between"
            title="انقر لتصفية الطلبات الجاهزة بالمخزن"
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1">
                <ArchiveBoxIcon className="h-3.5 w-3.5 shrink-0" />
                <span>معلق بالمخزن</span>
              </span>
              <span className="text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded tabular-nums">
                {warehousePct}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-amber-950 dark:text-amber-100">
                {warehouseOrders.toLocaleString()}
              </span>
              <span className="text-[11px] text-zinc-500">جاهز للتسليم</span>
            </div>
          </div>

          {/* Stage 4: Unprocessed / New */}
          <div
            onClick={() => onFilterStatus && onFilterStatus("PENDING")}
            className="p-2.5 sm:p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/[0.04] hover:bg-indigo-500/[0.08] transition-colors cursor-pointer flex flex-col justify-between"
            title="انقر لتصفية الطلبات المعلقة هنا"
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-400 flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5 shrink-0" />
                <span>معلق هنا (جديد)</span>
              </span>
              <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded tabular-nums">
                {unprocessedPct}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-indigo-950 dark:text-indigo-100">
                {unprocessedOrders.toLocaleString()}
              </span>
              <span className="text-[11px] text-zinc-500">قيد التأكيد</span>
            </div>
          </div>

          {/* Stage 5: Cancelled */}
          <div
            onClick={() => onFilterStatus && onFilterStatus("CANCELLED")}
            className="p-2.5 sm:p-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] hover:bg-rose-500/[0.08] transition-colors cursor-pointer flex flex-col justify-between"
            title="انقر لتصفية الطلبات الملغاة"
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1">
                <XCircleIcon className="h-3.5 w-3.5 shrink-0" />
                <span>ملغي</span>
              </span>
              <span className="text-[11px] font-black text-rose-700 dark:text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded tabular-nums">
                {cancelledPct}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-rose-950 dark:text-rose-100">
                {cancelledOrders.toLocaleString()}
              </span>
              <span className="text-[11px] text-zinc-500">طلب ملغي</span>
            </div>
          </div>

          {/* Stage 6: Returned */}
          <div
            onClick={() => onFilterStatus && onFilterStatus("RETURNED")}
            className="p-2.5 sm:p-3 rounded-lg border border-red-600/20 bg-red-600/[0.04] hover:bg-red-600/[0.08] transition-colors cursor-pointer flex flex-col justify-between"
            title="انقر لتصفية الطلبات المرتجعة"
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs font-bold text-red-800 dark:text-red-400 flex items-center gap-1">
                <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5 shrink-0" />
                <span>مرتجع</span>
              </span>
              <span className="text-[11px] font-black text-red-700 dark:text-red-300 bg-red-600/10 px-1.5 py-0.5 rounded tabular-nums">
                {returnedPct}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-red-950 dark:text-red-100">
                {returnedOrders.toLocaleString()}
              </span>
              <span className="text-[11px] text-zinc-500">طلب مرتجع</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default OrdersMetricsStrip;
