import React from 'react';
import { Truck, CheckCircle2, DollarSign, AlertTriangle, AlertCircle, TrendingDown } from 'lucide-react';
import { useCurrency } from '../../../hooks/useCurrency';
import { ProductDeliveryReturnsSummary } from './productDeliveryReturns.types';

interface Props {
  summary: ProductDeliveryReturnsSummary;
  onFilterCritical?: () => void;
}

export const ProductDeliveryReturnsKpis: React.FC<Props> = ({ summary, onFilterCritical }) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. نسبة التسليم الإجمالية */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            نسبة التسليم الإجمالية
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-50">
            {summary.overallDeliveryRate}%
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            (من الشحنات المنتهية)
          </span>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span>تم تسليمه: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{summary.totalDeliveredQuantity.toLocaleString()}</strong> ق</span>
          <span>مشحون: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{summary.totalShippedQuantity.toLocaleString()}</strong> ق</span>
        </div>
      </div>

      {/* 2. نسبة ومبلغ التحصيل الفعلي */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            معدل ومبالغ التحصيل (COD)
          </span>
          <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-50">
            {summary.overallCollectionRate}%
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            محصل فعلي
          </span>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span>المحصل: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatPrice(summary.totalCollectedRevenue)}</strong></span>
          <span>المتوقع: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{formatPrice(summary.totalExpectedRevenue)}</strong></span>
        </div>
      </div>

      {/* 3. خسائر المرتجعات والشحن المهدر */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            خسائر المرتجعات والشحن
          </span>
          <div className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <TrendingDown className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {formatPrice(summary.totalLostRevenue)}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            قيمة المرتجع
          </span>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span>شحن مهدر: <strong className="font-mono text-amber-600 dark:text-amber-400">{formatPrice(summary.totalLostShipping)}</strong></span>
          <span>قطع مرتجعة: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{summary.totalReturnedQuantity.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* 4. المنتجات التي تحتاج تدخل تشغيلي */}
      <div 
        onClick={onFilterCritical}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 transition-all hover:border-rose-300 dark:hover:border-rose-900 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            منتجات تتطلب تدخلاً عاجلاً
          </span>
          <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {summary.criticalCount}
          </span>
          <span className="text-xs text-amber-600 dark:text-amber-400">
            حرجة ({summary.warningCount} تحت التحذير)
          </span>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span>نسبة المرتجع العام: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{summary.overallReturnRate}%</strong></span>
          <span className="text-blue-600 dark:text-blue-400 hover:underline">فلترة الحرجة ←</span>
        </div>
      </div>
    </div>
  );
};
