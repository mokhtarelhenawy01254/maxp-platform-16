import React from 'react';
import { CourierDashboardSummary } from '../../../../services/courierService';
import { useCurrency } from '../../../../hooks/useCurrency';

interface CourierSummaryCardsProps {
  summary: CourierDashboardSummary | null;
}

export const CourierSummaryCards: React.FC<CourierSummaryCardsProps> = ({ summary }) => {
  const { formatPrice } = useCurrency();

  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="text-xs text-slate-500 dark:text-slate-400">إجمالي الأسطول</div>
        <div className="text-xl font-bold mt-1 tabular-nums font-mono">{summary.totalCouriers}</div>
      </div>
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="text-xs text-slate-500 dark:text-slate-400">مناديب في الميدان</div>
        <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
          {summary.activeCouriers}
        </div>
      </div>
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="text-xs text-slate-500 dark:text-slate-400">مناديب متاحين</div>
        <div className="text-xl font-bold mt-1 tabular-nums font-mono">{summary.availableCouriers}</div>
      </div>
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="text-xs text-slate-500 dark:text-slate-400">طرود في الطريق</div>
        <div className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400 tabular-nums font-mono">
          {summary.totalParcelsInField}
        </div>
      </div>
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="text-xs text-slate-500 dark:text-slate-400">كاش متوقع بالشارع</div>
        <div className="text-sm sm:text-base font-bold mt-1 tabular-nums font-mono">
          {formatPrice(summary.totalExpectedCashInField)}
        </div>
      </div>
      <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20">
        <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">بانتظار التوريد للخزينة</div>
        <div className="text-sm sm:text-base font-bold mt-1 text-amber-900 dark:text-amber-300 tabular-nums font-mono">
          {formatPrice(summary.totalCashAwaitingRemittance)}
        </div>
      </div>
    </div>
  );
};
