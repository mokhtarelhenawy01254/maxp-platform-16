import React, { useState, useMemo } from "react";
import {
  TruckIcon,
  ChartBarIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Skeleton } from "../../../components/ui/skeleton";
import { ShippingPerformance, BranchPerformance } from "./types";
import { getStatusDisplay } from "../../../utils/statusRegistry";

const LIFECYCLE_STAGE_ORDER: Record<string, number> = {
  PENDING: 10,
  CONFIRMED: 20,
  SCHEDULED: 25,
  ON_HOLD: 30,
  ON_HOLD_PREP: 35,
  PROCESSING: 40,
  READY: 45,
  STOCK_SHORTAGE: 50,
  SHORTAGE_FAILED: 55,
  SHIPPED: 60,
  DELIVERED: 70,
  PARTIALLY_DELIVERED: 72,
  RETURNED: 80,
  PARTIALLY_RETURNED: 82,
  CANCELLED: 90,
  DUPLICATE_ORDER: 95,
  REFUNDED: 96,
  TRASH: 99,
};

interface OrdersLogisticsPerformanceProps {
  loading: boolean;
  shippingList: ShippingPerformance[];
  branchList: BranchPerformance[];
  statusDist: Record<string, number>;
  statusPieces: Record<string, number>;
  totalOrders: number;
  paymentStats: Record<string, number>;
  codOrdersCount: number;
  codDeliveredRevenue: number;
  codCollectionRate: number;
  formatPrice: (amount: number) => string;
  onFilterStatus?: (status: string) => void;
  translate: any;
}

export const OrdersLogisticsPerformance: React.FC<OrdersLogisticsPerformanceProps> = ({
  loading,
  shippingList,
  branchList,
  statusDist,
  statusPieces,
  totalOrders,
  paymentStats,
  codOrdersCount,
  codDeliveredRevenue,
  codCollectionRate,
  formatPrice,
  onFilterStatus,
  translate,
}) => {
  const [logisticsView, setLogisticsView] = useState<"carriers" | "branches">("carriers");

  const getPaymentMethodLabel = (method: string): string => {
    if (!method) return "غير محدد";
    const normalized = method.trim().toUpperCase();
    switch (normalized) {
      case "CASH":
      case "COD":
        return "الدفع عند الاستلام (COD)";
      case "CREDIT_CARD":
      case "CARD":
      case "ONLINE":
        return "بطاقة بنكية / فيزا";
      case "FAWRY":
        return "فوري (Fawry)";
      case "WALLET":
      case "VODAFONE_CASH":
      case "INSTAPAY":
        return "إنستاباي / محفظة إلكترونية";
      case "BANK_TRANSFER":
        return "تحويل بنكي";
      case "PREPAID":
        return "دفع مسبق";
      default:
        return method;
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes("DELIVERED") || s.includes("COMPLETED")) return "bg-emerald-500";
    if (s.includes("CANCEL") || s.includes("REJECT") || s.includes("FAIL")) return "bg-rose-500";
    if (s.includes("RETURN") || s.includes("REFUND")) return "bg-amber-500";
    if (s.includes("SHIP") || s.includes("TRANSIT") || s.includes("OUT_FOR_DELIVERY")) return "bg-sky-500";
    if (s.includes("PENDING") || s.includes("HOLD") || s.includes("WAIT")) return "bg-amber-500";
    if (s.includes("PROCESS") || s.includes("PREP")) return "bg-indigo-500";
    if (s.includes("CONFIRM")) return "bg-blue-500";
    return "bg-zinc-500";
  };

  const sortedStatusEntries = useMemo(() => {
    return Object.entries(statusDist).sort(([statusA, countA], [statusB, countB]) => {
      const orderA = LIFECYCLE_STAGE_ORDER[statusA.toUpperCase()] ?? 500;
      const orderB = LIFECYCLE_STAGE_ORDER[statusB.toUpperCase()] ?? 500;
      if (orderA !== orderB) return orderA - orderB;
      return countB - countA;
    });
  }, [statusDist]);

  return (
    <div className="border-b border-zinc-200/80 dark:border-white/[0.08] grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-zinc-200/80 dark:divide-white/[0.08] bg-white dark:bg-[#070709]">
      
      {/* Column 1: Order Lifecycle & Status Distribution */}
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

      {/* Column 2: Accurate Logistics SLA (Carriers vs Branches) */}
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
              className={`px-2 py-0.5 rounded transition-all font-semibold ${
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
              className={`px-2 py-0.5 rounded transition-all font-semibold ${
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

      {/* Column 3: Payment Breakdown & Settlement */}
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

    </div>
  );
};

export default OrdersLogisticsPerformance;
