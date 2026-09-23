import React from "react";
import {
  BanknotesIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Skeleton } from "../../../components/ui/skeleton";

interface OrdersDailyAveragesStripProps {
  loading: boolean;
  daysCount: number;
  avgOrdersPerDay: number;
  avgDeliveredPerDay: number;
  avgCancelledPerDay: number;
  avgReturnedPerDay: number;
  netRevenue: number;
  pendingRevenue: number;
  lostRevenue: number;
  netRealizationPct: number;
  totalRevenue: number;
  totalOrders: number;
  codOrdersCount: number;
  prepaidOrdersCount: number;
  codCollectionRate: number;
  prepaidDeliveryRate: number;
  formatPrice: (amount: number) => string;
}

export const OrdersDailyAveragesStrip: React.FC<OrdersDailyAveragesStripProps> = ({
  loading,
  daysCount,
  avgOrdersPerDay,
  avgDeliveredPerDay,
  avgCancelledPerDay,
  avgReturnedPerDay,
  netRevenue,
  pendingRevenue,
  lostRevenue,
  netRealizationPct,
  totalRevenue,
  totalOrders,
  codOrdersCount,
  prepaidOrdersCount,
  codCollectionRate,
  prepaidDeliveryRate,
  formatPrice,
}) => {
  const safeTotal = totalOrders > 0 ? totalOrders : 1;
  const codPct = Math.round((codOrdersCount / safeTotal) * 100);
  const prepaidPct = Math.round((prepaidOrdersCount / safeTotal) * 100);

  return (
    <div className="border-b border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/40 dark:bg-zinc-950/40">
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-zinc-200/80 dark:divide-white/[0.08]">
        
        {/* 1. DAILY RUN-RATE AVERAGES (6 Columns) */}
        <div className="lg:col-span-6 p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                <CalendarDaysIcon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                المعدلات اليومية للطلبات ({daysCount} يوم)
              </span>
            </div>
            <span className="text-[11px] font-semibold text-zinc-500 tabular-nums">
              معدل الجريان اليومي
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-4 gap-2 py-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-1">
              {/* Overall Daily */}
              <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/[0.06] text-center">
                <span className="block text-[10px] font-medium text-zinc-500 truncate">إجمالي يومياً</span>
                <span className="text-base sm:text-lg font-extrabold tabular-nums text-zinc-900 dark:text-white">
                  {avgOrdersPerDay}
                </span>
                <span className="block text-[9px] text-zinc-400">طلب / يوم</span>
              </div>

              {/* Delivered Daily */}
              <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-emerald-500/20 text-center">
                <span className="block text-[10px] font-medium text-emerald-600 dark:text-emerald-400 truncate flex items-center justify-center gap-0.5">
                  <CheckIcon className="h-2.5 w-2.5" />
                  <span>مسلّم يومياً</span>
                </span>
                <span className="text-base sm:text-lg font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {avgDeliveredPerDay}
                </span>
                <span className="block text-[9px] text-zinc-400">طلب / يوم</span>
              </div>

              {/* Cancelled Daily */}
              <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-rose-500/20 text-center">
                <span className="block text-[10px] font-medium text-rose-600 dark:text-rose-400 truncate flex items-center justify-center gap-0.5">
                  <XMarkIcon className="h-2.5 w-2.5" />
                  <span>ملغي يومياً</span>
                </span>
                <span className="text-base sm:text-lg font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
                  {avgCancelledPerDay}
                </span>
                <span className="block text-[9px] text-zinc-400">طلب / يوم</span>
              </div>

              {/* Returned Daily */}
              <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-red-500/20 text-center">
                <span className="block text-[10px] font-medium text-red-600 dark:text-red-400 truncate flex items-center justify-center gap-0.5">
                  <ArrowPathIcon className="h-2.5 w-2.5" />
                  <span>مرتجع يومياً</span>
                </span>
                <span className="text-base sm:text-lg font-extrabold tabular-nums text-red-600 dark:text-red-400">
                  {avgReturnedPerDay}
                </span>
                <span className="block text-[9px] text-zinc-400">طلب / يوم</span>
              </div>
            </div>
          )}
        </div>

        {/* 2. REALIZED NET REVENUE & FINANCIAL FLOW (3.5 Columns) */}
        <div className="lg:col-span-3.5 p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <BanknotesIcon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                صافي الإيراد الفعلي المحصل
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              {netRealizationPct}% محصل
            </span>
          </div>

          <div>
            {loading ? (
              <Skeleton className="h-8 w-32 rounded my-1" />
            ) : (
              <div className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatPrice(netRevenue)}
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1 tabular-nums">
              <span>بالشحن: <strong className="text-sky-600 dark:text-sky-400 font-semibold">{formatPrice(pendingRevenue)}</strong></span>
              <span>فاقد: <strong className="text-rose-600 dark:text-rose-400 font-semibold">{formatPrice(lostRevenue)}</strong></span>
            </div>
          </div>
        </div>

        {/* 3. PAYMENT METHOD REALITY (COD vs PREPAID) (2.5 Columns) */}
        <div className="lg:col-span-2.5 p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                <CreditCardIcon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                طريقة الدفع
              </span>
            </div>
            <span className="text-[10px] font-medium text-zinc-500">
              COD مقابل مسبق
            </span>
          </div>

          <div className="space-y-1.5 text-xs tabular-nums">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">الدفع عند الاستلام (COD):</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {codOrdersCount} طلب ({codPct}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">دفع إلكتروني / مسبق:</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {prepaidOrdersCount} طلب ({prepaidPct}%)
              </span>
            </div>
            <div className="pt-1.5 border-t border-zinc-200/60 dark:border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-500">
              <span>تسليم COD: {codCollectionRate}%</span>
              <span>تسليم المسبق: {prepaidDeliveryRate}%</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrdersDailyAveragesStrip;
