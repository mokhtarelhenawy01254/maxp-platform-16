import React from "react";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "../../../components/ui/skeleton";

export interface OrdersMetricsNorthStarProps {
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
}

export const OrdersMetricsNorthStar: React.FC<OrdersMetricsNorthStarProps> = React.memo(
  ({
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
  }) => {
    return (
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
              <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                طلب
              </span>
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
    );
  }
);

OrdersMetricsNorthStar.displayName = "OrdersMetricsNorthStar";
