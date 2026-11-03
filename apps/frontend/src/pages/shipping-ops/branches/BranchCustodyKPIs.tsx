import React from 'react';
import { Package, Coins, Clock, CheckSquare } from 'lucide-react';
import { formatCurrency } from '../shippingOpsShared';

interface BranchCustodyKPIsProps {
  summary: {
    totalShipments: number;
    expectedCod: number;
    aging48hCount: number;
    byStatus?: Record<string, number>;
  };
}

export const BranchCustodyKPIs: React.FC<BranchCustodyKPIsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-slate-500 text-xs">
          <span>إجمالي الشحنات بعهدة الفرع</span>
          <Package className="w-4 h-4 text-blue-600" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
          {summary.totalShipments}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-slate-500 text-xs">
          <span>تحصيل COD متوقع</span>
          <Coins className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600">
          {formatCurrency(summary.expectedCod)}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-slate-500 text-xs">
          <span>شحنات راكدة &gt; 48 ساعة</span>
          <Clock className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-bold font-mono text-amber-600">
            {summary.aging48hCount}
          </span>
          {summary.aging48hCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              Aging Alert
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-slate-500 text-xs">
          <span>جاهز للاستلام والتوزيع</span>
          <CheckSquare className="w-4 h-4 text-teal-600" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-teal-600">
          {summary.byStatus?.RECEIVED_AT_HUB || 0}
        </div>
      </div>
    </div>
  );
};
