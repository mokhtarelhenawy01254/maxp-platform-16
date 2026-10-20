import { AlertTriangle, Plus } from "lucide-react";
import { fmtMoney } from "../../shared";
import { CATEGORY_LABELS, type MaterialCardProps } from "../types/materialsTypes";

export function MaterialCard({ material, onStockIn }: MaterialCardProps) {
  const activeStocks = material.stocks || [];
  const totalUnits = material.totalAvailableUnits ?? 0;
  const isLow = material.isLowStock;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200/90 dark:border-gray-700/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {CATEGORY_LABELS[material.category] || material.category}
            </span>
            <h4 className="text-base font-black text-gray-900 dark:text-white mt-1 truncate">
              {material.name}
            </h4>
            {material.brand && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ماركة: {material.brand}
              </span>
            )}
          </div>
          {isLow && (
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300/40 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              رصيد منخفض
            </span>
          )}
        </div>

        {/* Stock Gauge */}
        <div className="my-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-gray-600 dark:text-gray-300">الرصيد المتاح:</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold font-mono tabular-nums">
              {totalUnits} وحدة ({activeStocks.length} قرص/لوت)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isLow ? "bg-amber-500" : "bg-cyan-600"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    8,
                    (totalUnits / ((material.standardCapacity || 20) * 3)) * 100
                  )
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Active Lots Details */}
        {activeStocks.length > 0 && (
          <div className="space-y-1.5 mb-3">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
              التشغيلات النشطة (Active Lots):
            </span>
            <div className="max-h-28 overflow-y-auto space-y-1 text-xs">
              {activeStocks.map((stk) => (
                <div
                  key={stk.id}
                  className="flex items-center justify-between p-1.5 bg-gray-100/70 dark:bg-gray-700/50 rounded-lg text-[11px]"
                >
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                    Lot# {stk.lotNumber}
                    {stk.shade ? ` (${stk.shade})` : ""}
                  </span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold font-mono tabular-nums">
                    {stk.remainingUnits}/{stk.initialUnits} وحدة
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
        <div className="text-[11px] text-gray-500">
          <span>تكلفة الوحدة: </span>
          <strong className="text-gray-900 dark:text-white font-mono tabular-nums">
            {fmtMoney(material.costPerUnit)} ج.م
          </strong>
        </div>
        <button
          type="button"
          onClick={() => onStockIn(material)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 text-xs font-bold hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>توريد قرص جديد</span>
        </button>
      </div>
    </div>
  );
}

export default MaterialCard;
