import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ClockIcon,
  BanknotesIcon,
  TruckIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon,
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
  returnedCount,
  returnedCost,
  prepaidAdvantage,
  formatPrice,
}) => {
  const navigate = useNavigate();

  return (
    <div className="border-b border-zinc-200/80 dark:border-white/[0.08] p-3 sm:p-4 bg-zinc-50/60 dark:bg-[#070709]">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ExclamationCircleIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>مركز التدخل السريع والعمليات اليومية</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                مطلوب اتخاذ قرار
              </span>
            </h2>
          </div>
        </div>
        <p className="text-[11px] text-zinc-400 hidden sm:block">
          مهام تشغيلية حرجة تحتاج مراجعتك صباح اليوم لتجنب تلف الشحنات أو تأخر التحصيل
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        
        {/* Action 1: Delayed In-Transit Shipments */}
        <div className="p-3 rounded-lg bg-white dark:bg-[#0d0d10] border border-amber-500/30 shadow-xs flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>شحنات متأخرة بالطريق</span>
              </span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {delayedCount > 0 ? `${delayedCount} شحنة` : "لا يوجد تأخير"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
              شحنات خرجت مع شركات الشحن منذ أكثر من 48 ساعة ولم تسلم حتى الآن، تحتاج تتبعاً فورياً مع المناديب.
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 tabular-nums">
              قيمة: <strong className="text-zinc-700 dark:text-zinc-300">{formatPrice(delayedRevenue)}</strong>
            </span>
            <button
              type="button"
              onClick={() => navigate("/orders?status=SHIPPED")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:underline active:scale-[0.98]"
            >
              <span>تصفية الشحنات</span>
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Action 2: Uncollected COD Cash on the street */}
        <div className="p-3 rounded-lg bg-white dark:bg-[#0d0d10] border border-blue-500/30 shadow-xs flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <BanknotesIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>سيولة معلقة في الشارع</span>
              </span>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {formatPrice(uncollectedCod)}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
              أموال شحنات COD قيد التوصيل والتحصيل مع مناديب وشركات الشحن، بانتظار التسوية والتوريد.
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-zinc-400">ذمة المناديب</span>
            <button
              type="button"
              onClick={() => navigate("/shipping/settlements")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline active:scale-[0.98]"
            >
              <span>سجل التسويات</span>
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Action 3: Pending Warehouse Dispatch */}
        <div className="p-3 rounded-lg bg-white dark:bg-[#0d0d10] border border-zinc-200 dark:border-white/10 shadow-xs flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <TruckIcon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>بانتظار التجهيز والشحن</span>
              </span>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {pendingFulfillmentCount.toLocaleString()} طلب
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
              طلبات مؤكدة من العملاء داخل المستودع تنتظر الطباعة والتجهيز لتسليمها لشركة الشحن لتقليل زمن التسليم.
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-zinc-400">سرعة الشحن ترفع التسليم</span>
            <button
              type="button"
              onClick={() => navigate("/orders?status=CONFIRMED")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline active:scale-[0.98]"
            >
              <span>بدء التجهيز</span>
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Action 4: High ROI AI Strategic Recommendation */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-500/20 shadow-xs flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <SparklesIcon className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>توصية الدفع المسبق والعربون</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                ROI مضاعف
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 line-clamp-2">
              تحويل 10% من طلبات COD إلى دفع مسبق أو عربون شحن (50 ج.م إنستاباي) يوفر ما يقارب {formatPrice(returnedCost > 0 ? returnedCost * 0.4 : 12000)} شهرياً من هدر الشحن.
            </p>
          </div>

          <div className="pt-2 border-t border-indigo-200/50 dark:border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium">عربون الشحن</span>
            <button
              type="button"
              onClick={() => navigate("/store/checkout-settings")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:underline active:scale-[0.98]"
            >
              <span>تفعيل العربون</span>
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrdersActionCenter;
