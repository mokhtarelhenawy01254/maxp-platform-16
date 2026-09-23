import React from "react";
import {
  BanknotesIcon,
  CheckCircleIcon,
  ArrowPathRoundedSquareIcon,
  CreditCardIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { Skeleton } from "../../../components/ui/skeleton";

interface OrdersMetricsStripProps {
  loading: boolean;
  totalOrders: number;
  totalRevenue: number;
  netRevenue: number;
  netRealizationPct: number;
  pendingRevenue: number;
  lostRevenue: number;
  deliveredOrders: number;
  inTransitOrders: number;
  deliveryRate: number;
  cancelledOrders: number;
  cancellationRate: number;
  returnedOrders: number;
  returnRate: number;
  codOrdersCount: number;
  codDeliveredRevenue: number;
  codCollectionRate: number;
  prepaidOrdersCount: number;
  prepaidDeliveryRate: number;
  avgOrdersPerDay: number;
  totalPieces: number;
  formatPrice: (amount: number) => string;
  onFilterStatus?: (status: string) => void;
}

export const OrdersMetricsStrip: React.FC<OrdersMetricsStripProps> = ({
  loading,
  totalOrders,
  totalRevenue,
  netRevenue,
  netRealizationPct,
  pendingRevenue,
  lostRevenue,
  deliveredOrders,
  inTransitOrders,
  deliveryRate,
  cancelledOrders,
  cancellationRate,
  returnedOrders,
  returnRate,
  codOrdersCount,
  codDeliveredRevenue,
  codCollectionRate,
  prepaidOrdersCount,
  prepaidDeliveryRate,
  avgOrdersPerDay,
  totalPieces,
  formatPrice,
  onFilterStatus,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-zinc-200/80 dark:divide-white/[0.08] border-b border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/40 dark:bg-zinc-950/40">
      
      {/* 1. NORTH STAR: NET REALIZED REVENUE (Asymmetric Anchor: 4 Cols) */}
      <div className="lg:col-span-4 p-3.5 sm:p-4 flex flex-col justify-between min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BanknotesIcon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider truncate">
              صافي الإيراد الفعلي المحصل
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold tabular-nums bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            {netRealizationPct}% تحصيل
          </span>
        </div>

        <div>
          {loading ? (
            <Skeleton className="h-9 w-40 rounded" />
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-zinc-950 dark:text-white">
              {formatPrice(netRevenue)}
            </div>
          )}
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums truncate">
            من إجمالي مسجل: <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{formatPrice(totalRevenue)}</strong>
          </p>
        </div>

        {/* Linear Waterfall Bar */}
        <div className="space-y-1.5 pt-2 border-t border-zinc-200/60 dark:border-white/[0.06]">
          <div className="h-2 w-full bg-zinc-200/70 dark:bg-zinc-800 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${totalRevenue > 0 ? (netRevenue / totalRevenue) * 100 : 0}%` }}
              title="المحصل الفعلي"
            />
            <div
              className="h-full bg-sky-500 transition-all duration-500"
              style={{ width: `${totalRevenue > 0 ? (pendingRevenue / totalRevenue) * 100 : 0}%` }}
              title="قيد التوصيل"
            />
            <div
              className="h-full bg-rose-500 transition-all duration-500"
              style={{ width: `${totalRevenue > 0 ? (lostRevenue / totalRevenue) * 100 : 0}%` }}
              title="مرتجع وملغي"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            <span className="truncate">بالطريق: <strong className="text-sky-600 dark:text-sky-400 font-semibold">{formatPrice(pendingRevenue)}</strong></span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">فاقد: {formatPrice(lostRevenue)}</span>
          </div>
        </div>
      </div>

      {/* 2. DELIVERY SUCCESS & VOLUME (3 Cols) */}
      <div
        onClick={() => onFilterStatus && onFilterStatus("DELIVERED")}
        className="lg:col-span-3 p-3.5 sm:p-4 flex flex-col justify-between min-w-0 space-y-3 cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 transition-colors"
        title="انقر لعرض الطلبات المسلمة"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <CheckCircleIcon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider truncate">
              معدل التسليم الفعلي
            </span>
          </div>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums border shrink-0 ${
              deliveryRate >= 70
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : deliveryRate >= 50
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            {deliveryRate >= 70 ? "ممتاز" : deliveryRate >= 50 ? "متوسط" : "يحتاج تدخل"}
          </span>
        </div>

        <div>
          {loading ? (
            <Skeleton className="h-9 w-24 rounded" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-zinc-950 dark:text-white">
                {deliveryRate}%
              </span>
              <span className="text-xs text-zinc-400 tabular-nums">
                ({deliveredOrders.toLocaleString()} / {totalOrders.toLocaleString()} طلب)
              </span>
            </div>
          )}
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums truncate">
            إجمالي الوحدات: <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{totalPieces.toLocaleString()} قطعة</strong> · معدل <strong className="text-zinc-700 dark:text-zinc-300">{avgOrdersPerDay} طلب/يوم</strong>
          </p>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-zinc-200/60 dark:border-white/[0.06]">
          <div className="h-2 w-full bg-zinc-200/70 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                deliveryRate >= 70 ? "bg-emerald-500" : deliveryRate >= 50 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(100, deliveryRate)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            <span>قيد الشحن بالطريق:</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{inTransitOrders.toLocaleString()} طلب</span>
          </div>
        </div>
      </div>

      {/* 3. RETURNS & SHIPPING BLEED (2.5 Cols) */}
      <div
        onClick={() => onFilterStatus && onFilterStatus("RETURNED")}
        className="lg:col-span-2.5 p-3.5 sm:p-4 flex flex-col justify-between min-w-0 space-y-3 cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 transition-colors"
        title="انقر لعرض المرتجعات"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider truncate">
              المرتجعات والفاقد
            </span>
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold tabular-nums shrink-0">
            {returnedOrders} مرتجع
          </span>
        </div>

        <div>
          {loading ? (
            <Skeleton className="h-9 w-20 rounded" />
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-rose-600 dark:text-rose-400">
              {returnRate}%
            </div>
          )}
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums truncate">
            تكلفة شحن مهدرة: <strong className="text-rose-600 dark:text-rose-400 font-bold">{formatPrice(returnedOrders * 45)}</strong>
          </p>
        </div>

        <div className="pt-2 border-t border-zinc-200/60 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
          <span>معدل الإلغاء: <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{cancellationRate}%</strong></span>
          <span>({cancelledOrders.toLocaleString()} ملغي)</span>
        </div>
      </div>

      {/* 4. EGYPTIAN PAYMENT REALITY: PREPAID VS COD (2.5 Cols) */}
      <div className="lg:col-span-2.5 p-3.5 sm:p-4 flex flex-col justify-between min-w-0 space-y-3 bg-zinc-100/40 dark:bg-white/[0.02]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <CreditCardIcon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider truncate">
              معادلة الدفع (السوق المصري)
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums bg-zinc-200/80 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-zinc-300/50 dark:border-white/10 shrink-0">
            عربون vs COD
          </span>
        </div>

        <div>
          {loading ? (
            <Skeleton className="h-9 w-24 rounded" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                {prepaidOrdersCount > 0 ? `${Math.round((prepaidOrdersCount / (totalOrders || 1)) * 100)}%` : "0%"}
              </span>
              <span className="text-xs text-zinc-500 font-medium">دفع مسبق / عربون</span>
            </div>
          )}
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums truncate">
            تحصيل COD: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatPrice(codDeliveredRevenue)}</strong> ({codCollectionRate}%)
          </p>
        </div>

        <div className="pt-2 border-t border-zinc-200/60 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-700 dark:text-zinc-300 font-semibold tabular-nums">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
            <span>تسليم المسبق {prepaidDeliveryRate > 0 ? `${prepaidDeliveryRate}%` : "95%+"}</span>
          </span>
          <span className="text-zinc-400 font-normal">مقابل {deliveryRate}% لـ COD</span>
        </div>
      </div>

    </div>
  );
};

export default OrdersMetricsStrip;
