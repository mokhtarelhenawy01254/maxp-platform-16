import React from "react";
import { Tag, ArrowUpRight } from "lucide-react";

interface StudioQuickStrategyTriggersProps {
  productName: string;
  cost: number;
  stock: number;
  onRequestAction?: (actionPrompt: string) => void;
}

export const StudioQuickStrategyTriggers: React.FC<StudioQuickStrategyTriggersProps> = ({
  productName,
  cost,
  stock,
  onRequestAction,
}) => {
  return (
    <div className="space-y-2 pt-2">
      <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        أدوات التحليل والضبط السريع
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            onRequestAction?.(
              `افحص هامش الربح لمنتج "${productName}" وقارنه بالتكلفة ${cost} ج.م واقترح أفضل تسعير.`
            )
          }
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 active:scale-[0.98] transition text-right cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              مراجعة الهامش والتسعير
            </span>
            <Tag className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition" />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            حساب صافي الربح واقتراح سعر بيع متوازن
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            onRequestAction?.(
              `تحقق من حركة مبيعات ورصيد منتج "${productName}" (${stock} قطعة) وتوقع معدل الاستهلاك.`
            )
          }
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 active:scale-[0.98] transition text-right cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              توقع نفاذ المخزون
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition" />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            تقدير الأيام المتبقية وحساب حد إعادة الطلب
          </p>
        </button>
      </div>
    </div>
  );
};
