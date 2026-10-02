import React from "react";
import { ChevronLeft } from "lucide-react";
import type { VintageBucket } from "../types";

interface Props {
  buckets: VintageBucket[];
  onSelectBucket: (bucketKey: string, bucketLabel: string) => void;
}

export const VintageDistributionCards: React.FC<Props> = ({ buckets, onSelectBucket }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          توزيع الطلبات المشحونة حسب عمر الطلب الأصلي (Order Vintage)
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          اضغط على أي شريحة لاستعراض أوردراتها فوراً
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {buckets.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => onSelectBucket(b.key, b.label)}
            className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 text-right transition-all hover:border-slate-400 hover:shadow-xs active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {b.shortLabel}
                </span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: b.color }}
                />
              </div>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-900 tabular-nums dark:text-white">
                  {b.count.toLocaleString("ar-EG")}
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  ({b.percent}%)
                </span>
              </div>
            </div>

            <div className="mt-2.5 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800/80">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="truncate tabular-nums">
                  {b.revenue.toLocaleString("ar-EG")} ج.م
                </span>
                <ChevronLeft className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:-translate-x-0.5" />
              </div>
            </div>

            {/* Visual ratio bar */}
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(b.percent, b.count > 0 ? 4 : 0)}%`, backgroundColor: b.color }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
