import { AlertTriangle, CheckCircle2, Layers, Sparkles } from "lucide-react";
import type { MaterialsKpiCardsProps } from "../types/materialsTypes";

export function MaterialsKpiCards({
  summary,
  materialsCount,
}: MaterialsKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs">
          <span>أنواع الخامات النشطة</span>
          <Layers className="w-4 h-4 text-cyan-500" />
        </div>
        <p className="text-2xl font-black text-gray-900 dark:text-white mt-2 font-mono tabular-nums">
          {summary?.totalMaterials ?? materialsCount}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs">
          <span>أقراص وباتشات قيد العمل</span>
          <Sparkles className="w-4 h-4 text-blue-500" />
        </div>
        <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono tabular-nums">
          {summary?.totalActiveStocks ?? 0}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs">
          <span>إجمالي الوحدات المتاحة للتفريز</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono tabular-nums">
          {summary?.totalStockUnits ?? 0}{" "}
          <span className="text-xs font-normal">وحدة</span>
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs">
          <span>تنبيهات قرب النفاد</span>
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        </div>
        <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono tabular-nums">
          {summary?.lowStockCount ?? 0}
        </p>
      </div>
    </div>
  );
}

export default MaterialsKpiCards;
