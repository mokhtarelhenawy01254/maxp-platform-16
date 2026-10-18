import React, { useState } from "react";
import {
  TruckIcon,
  BuildingStorefrontIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Skeleton } from "../../../../components/ui/skeleton";
import type { ShippingPerformance, BranchPerformance } from "../types";

export interface LogisticsSlaColumnProps {
  loading: boolean;
  shippingList: ShippingPerformance[];
  branchList: BranchPerformance[];
  formatPrice: (amount: number) => string;
}

export const LogisticsSlaColumn: React.FC<LogisticsSlaColumnProps> = ({
  loading,
  shippingList,
  branchList,
  formatPrice,
}) => {
  const [logisticsView, setLogisticsView] = useState<"carriers" | "branches">("carriers");

  return (
    <div className="p-3.5 sm:p-4 flex flex-col min-w-0">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
            <TruckIcon className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            كفاءة الشحن والتوزيع
          </h3>
        </div>

        {/* Toggle between Carriers and Branches */}
        <div className="flex items-center gap-0.5 p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-md border border-zinc-200/50 dark:border-white/[0.05] text-[10px]">
          <button
            type="button"
            onClick={() => setLogisticsView("carriers")}
            className={`px-2 py-0.5 rounded transition-all font-semibold cursor-pointer ${
              logisticsView === "carriers"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            شركات ووجهات الشحن
          </button>
          <button
            type="button"
            onClick={() => setLogisticsView("branches")}
            className={`px-2 py-0.5 rounded transition-all font-semibold cursor-pointer ${
              logisticsView === "branches"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            مستودعات التجهيز
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[350px] divide-y divide-zinc-100 dark:divide-white/[0.04] pr-1.5 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-400">
        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2].map((n) => (
              <Skeleton key={n} className="h-14 w-full rounded" />
            ))}
          </div>
        ) : logisticsView === "carriers" ? (
          shippingList.length === 0 ? (
            <p className="text-center text-xs text-zinc-400 py-10">لا توجد بيانات شحنات مسجلة</p>
          ) : (
            shippingList.map((carrier) => (
              <div
                key={carrier.name}
                className="py-2.5 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-[11px]">
                    {carrier.name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {carrier.avgDeliveryDays && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded tabular-nums">
                        <ClockIcon className="h-3 w-3 text-zinc-400" />
                        <span>{carrier.avgDeliveryDays} يوم سرعة</span>
                      </span>
                    )}
                    <span className="text-[10px] font-bold tabular-nums text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                      {carrier.totalOrders.toLocaleString()} مسلّمة للناقل
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] tabular-nums">
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-400 text-[10px]">تسليم:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{carrier.deliveryRate}%</strong>
                    <span className="text-zinc-400 text-[10px]">({carrier.deliveredOrders})</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-400 text-[10px]">مرتجع:</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-semibold">{carrier.returnedOrders}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-400 text-[10px]">بالطريق:</span>
                    <strong className="text-zinc-700 dark:text-zinc-300">{carrier.inTransitOrders}</strong>
                  </span>
                  <span className="text-zinc-500 text-[10px]">
                    كاش: <strong className="text-emerald-600 dark:text-emerald-400">{formatPrice(carrier.codCollected)}</strong>
                  </span>
                </div>
              </div>
            ))
          )
        ) : (
          branchList.length === 0 ? (
            <p className="text-center text-xs text-zinc-400 py-10">لا توجد بيانات فروع مسجلة</p>
          ) : (
            branchList.map((branch) => (
              <div
                key={branch.name}
                className="py-2.5 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-[11px] flex items-center gap-1">
                    <BuildingStorefrontIcon className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span>{branch.name}</span>
                  </span>
                  <span className="text-[10px] font-bold tabular-nums text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                    {branch.totalOrders.toLocaleString()} إجمالي
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] tabular-nums">
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-400 text-[10px]">خرج للشحن:</span>
                    <strong className="text-sky-600 dark:text-sky-400 font-bold">{branch.dispatchedOrders}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-400 text-[10px]">تم تسليمه:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{branch.deliveredOrders}</strong>
                    <span className="text-zinc-400 text-[10px]">({branch.deliveryRate}%)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-400 text-[10px]">بالمستودع:</span>
                    <strong className="text-amber-600 dark:text-amber-400 font-semibold">{branch.pendingDispatch}</strong>
                  </span>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default LogisticsSlaColumn;
