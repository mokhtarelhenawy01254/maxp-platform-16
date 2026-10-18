import React from "react";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import { getPaymentMethodLabel } from "./logisticsHelpers";

export interface PaymentBreakdownColumnProps {
  paymentStats: Record<string, number>;
  codOrdersCount: number;
  codDeliveredRevenue: number;
  codCollectionRate: number;
  totalOrders: number;
  formatPrice: (amount: number) => string;
}

export const PaymentBreakdownColumn: React.FC<PaymentBreakdownColumnProps> = ({
  paymentStats,
  codOrdersCount,
  codDeliveredRevenue,
  codCollectionRate,
  totalOrders,
  formatPrice,
}) => {
  return (
    <div className="p-3.5 sm:p-4 flex flex-col min-w-0">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
            <CreditCardIcon className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            طرق الدفع والتسوية
          </h3>
        </div>
        <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
          {Object.keys(paymentStats).length} وسيلة
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[350px] divide-y divide-zinc-100 dark:divide-white/[0.04] pr-1.5 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-400">
        {/* COD Summary Strip (Seamless, No heavy boxed border) */}
        <div className="py-2 px-1 space-y-1">
          <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-white text-xs">
            <span>الدفع عند الاستلام (COD)</span>
            <span className="tabular-nums">
              {codOrdersCount.toLocaleString()} طلب ({totalOrders > 0 ? Math.round((codOrdersCount / totalOrders) * 100) : 0}%)
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 tabular-nums">
            <span>محصل فعلياً: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatPrice(codDeliveredRevenue)}</strong></span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded text-[10px]">
              {codCollectionRate}% نجاح
            </span>
          </div>
        </div>

        {/* Payment Methods List */}
        {Object.entries(paymentStats).map(([method, count]) => {
          const isCod = method.toUpperCase() === "CASH" || method.toUpperCase() === "COD";
          const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
          return (
            <div
              key={method}
              className="flex items-center justify-between py-2 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors text-xs"
            >
              <div className="min-w-0">
                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate block text-[11px]">
                  {getPaymentMethodLabel(method)}
                </span>
                <span className="text-[10px] text-zinc-400 tabular-nums">
                  {pct}% من الطلبات {isCod ? "• كاش عند الاستلام" : "• دفع مسبق"}
                </span>
              </div>
              <span className="font-bold text-zinc-900 dark:text-white tabular-nums shrink-0 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px]">
                {count.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentBreakdownColumn;
