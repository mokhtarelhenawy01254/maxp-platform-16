import React from "react";
import { useCurrency } from "../../../../hooks/useCurrency";

interface InventoryTelemetryCardsProps {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export const InventoryTelemetryCards: React.FC<InventoryTelemetryCardsProps> = ({
  totalItems,
  totalValue,
  lowStockCount,
  outOfStockCount,
}) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
      <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:sm:divide-x-reverse">
        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>إجمالي المنتجات</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
            {totalItems.toLocaleString()}
          </div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>إجمالي قيمة المخزون</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
            {formatPrice(totalValue)}
          </div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>مخزون منخفض</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {lowStockCount}
          </div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>نفد من المخزون</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {outOfStockCount}
          </div>
        </div>
      </div>
    </div>
  );
};
