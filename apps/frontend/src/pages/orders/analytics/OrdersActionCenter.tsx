import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ClockIcon,
  BanknotesIcon,
  TruckIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface OrdersActionCenterProps {
  delayedCount: number;
  delayedRevenue: number;
  uncollectedCod: number;
  pendingFulfillmentCount: number;
  returnedCount: number;
  returnedCost: number;
  prepaidAdvantage: number;
  formatPrice: (amount: number) => string;
}

export const OrdersActionCenter: React.FC<OrdersActionCenterProps> = ({
  delayedCount,
  delayedRevenue,
  uncollectedCod,
  pendingFulfillmentCount,
  returnedCost,
  formatPrice,
}) => {
  const navigate = useNavigate();

  return (
    <div className="border-b border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#070709]">
      {/* Sleek Command Bar Header */}
      <div className="px-3.5 sm:px-4 py-2 border-b border-zinc-200/60 dark:border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <h2 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            مركز التدخل السريع والعمليات اليومية
          </h2>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
            أولويات الإدارة
          </span>
        </div>
        <div className="text-[11px] text-zinc-400 font-mono hidden sm:block">
          SLA Live Dispatch & Cash Flow
        </div>
      </div>

      {/* Single-Surface 4-Action Grid: ZERO Box-in-Box, Pure Vertical Dividers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-zinc-200/80 dark:divide-white/[0.08]">
        
        {/* 1. Delayed In-Transit (>48h) */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between space-y-2 hover:bg-amber-500/[0.03] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <ClockIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>شحنات متأخرة بالطريق</span>
            </span>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {delayedCount > 0 ? `${delayedCount} شحنة` : "0 شحنة"}
            </span>
          </div>

          <div className="flex items-baseline justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">قيمة الشحنات:</span>
            <span className="font-bold text-zinc-900 dark:text-white tabular-nums">
              {formatPrice(delayedRevenue)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate("/orders?status=SHIPPED")}
            className="w-full py-1.5 px-2.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
          >
            <span>تتبع وتصفية الشحنات</span>
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </button>
        </div>

        {/* 2. Uncollected COD Cash */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between space-y-2 hover:bg-sky-500/[0.03] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <BanknotesIcon className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>سيولة في ذمة المناديب</span>
            </span>
            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 tabular-nums">
              قيد التحصيل
            </span>
          </div>

          <div className="flex items-baseline justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">المبلغ المعلق:</span>
            <span className="font-bold text-zinc-900 dark:text-white tabular-nums">
              {formatPrice(uncollectedCod)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate("/shipping/settlements")}
            className="w-full py-1.5 px-2.5 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-800 dark:text-sky-300 hover:bg-sky-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
          >
            <span>مراجعة سجل التسويات</span>
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </button>
        </div>

        {/* 3. Pending Fulfillment */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between space-y-2 hover:bg-emerald-500/[0.03] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <TruckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>بانتظار التجهيز والشحن</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {pendingFulfillmentCount.toLocaleString()} طلب
            </span>
          </div>

          <div className="flex items-baseline justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">الحالة التشغيلية:</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              جاهز للطباعة والتسليم
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate("/orders?status=CONFIRMED")}
            className="w-full py-1.5 px-2.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
          >
            <span>بدء تجهيز الشحنات</span>
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </button>
        </div>

        {/* 4. Shipping Deposit Strategy */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between space-y-2 hover:bg-zinc-500/[0.03] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <ShieldCheckIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
              <span>وفر عربون الشحن التقديري</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
              حماية الأرباح
            </span>
          </div>

          <div className="flex items-baseline justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">وفر هدر الشحن:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{formatPrice(returnedCost > 0 ? returnedCost * 0.4 : 12000)}/شهرياً
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate("/store/checkout-settings")}
            className="w-full py-1.5 px-2.5 rounded-md text-[11px] font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
          >
            <span>ضبط اشتراط العربون</span>
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default OrdersActionCenter;
