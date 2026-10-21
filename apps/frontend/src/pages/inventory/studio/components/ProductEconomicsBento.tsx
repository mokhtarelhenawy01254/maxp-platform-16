import React from "react";
import { TrendingUp, Package, AlertTriangle } from "lucide-react";

interface ProductEconomicsBentoProps {
  marginPercent: number;
  profit: number;
  stock: number;
  reorderThreshold?: number;
}

export const ProductEconomicsBento: React.FC<ProductEconomicsBentoProps> = ({
  marginPercent,
  profit,
  stock,
  reorderThreshold = 10,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {/* Margin % */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
          <span>هامش الربح</span>
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums font-mono">
          {marginPercent}%
        </div>
        <div className="text-[10px] text-slate-400 tabular-nums font-mono">
          صافي: {profit} ج.م / ق
        </div>
      </div>

      {/* Stock Units */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
          <span>الكمية بالمخزن</span>
          <Package className="w-3.5 h-3.5 text-indigo-500" />
        </div>
        <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums font-mono">
          {stock}
        </div>
        <div className="text-[10px] text-slate-400">
          {stock >= reorderThreshold ? "مستوى آمن" : "يتطلب إعادة طلب"}
        </div>
      </div>

      {/* Reorder Threshold */}
      <div className="col-span-2 sm:col-span-1 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
          <span>حد إعادة الطلب</span>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums font-mono">
          {reorderThreshold} ق
        </div>
        <div className="text-[10px] text-slate-400">
          مستوى أمان المخزون
        </div>
      </div>
    </div>
  );
};
