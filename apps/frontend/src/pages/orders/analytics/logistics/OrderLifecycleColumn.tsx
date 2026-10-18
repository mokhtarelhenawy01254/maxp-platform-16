import React, { useMemo } from "react";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "../../../../components/ui/skeleton";
import { getStatusDisplay } from "../../../../utils/statusRegistry";
import { LIFECYCLE_STAGE_ORDER, getStatusColor } from "./logisticsHelpers";

export interface OrderLifecycleColumnProps {
  loading: boolean;
  statusDist: Record<string, number>;
  statusPieces: Record<string, number>;
  totalOrders: number;
  onFilterStatus?: (status: string) => void;
  translate: any;
}

export const OrderLifecycleColumn: React.FC<OrderLifecycleColumnProps> = ({
  loading,
  statusDist,
  statusPieces,
  totalOrders,
  onFilterStatus,
  translate,
}) => {
  const sortedStatusEntries = useMemo(() => {
    return Object.entries(statusDist).sort(([statusA, countA], [statusB, countB]) => {
      const orderA = LIFECYCLE_STAGE_ORDER[statusA.toUpperCase()] ?? 500;
      const orderB = LIFECYCLE_STAGE_ORDER[statusB.toUpperCase()] ?? 500;
      if (orderA !== orderB) return orderA - orderB;
      return countB - countA;
    });
  }, [statusDist]);

  return (
    <div className="p-3.5 sm:p-4 flex flex-col min-w-0">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
            <ChartBarIcon className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            دورة حياة الحالات والقطع
          </h3>
        </div>
        <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
          {Object.keys(statusDist).length} حالة
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[350px] divide-y divide-zinc-100 dark:divide-white/[0.04] pr-1.5 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-400">
        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Skeleton key={n} className="h-8 w-full rounded" />
            ))}
          </div>
        ) : sortedStatusEntries.length === 0 ? (
          <p className="text-center text-xs text-zinc-400 py-10">لا توجد طلبات مسجلة</p>
        ) : (
          sortedStatusEntries.map(([status, count]) => {
            const safeTotal = totalOrders > 0 ? totalOrders : 1;
            const pct = Math.min(100, Math.round((count / safeTotal) * 100));
            const pieces = statusPieces?.[status] ?? 0;
            const display = getStatusDisplay(status);
            const colorDot = getStatusColor(status);

            return (
              <div
                key={status}
                onClick={() => onFilterStatus && onFilterStatus(status)}
                className="py-2 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer space-y-1"
                title="انقر لتصفية هذه الحالة"
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${colorDot}`} />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate text-[11px]">
                      {String(translate(display.labelKey) || status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 tabular-nums text-[11px]">
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {count.toLocaleString()} طلب
                    </span>
                    {pieces > 0 && (
                      <span className="text-[10px] text-zinc-400">
                        · {pieces.toLocaleString()} قطعة
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colorDot} rounded-full transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrderLifecycleColumn;
