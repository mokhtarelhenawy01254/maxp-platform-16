import React from "react";
import { Clock, RotateCcw } from "lucide-react";
import type { Stats } from "./turboCaptainHelpers";

interface TurboCaptainStatsRibbonProps {
  stats: Stats;
}

export const TurboCaptainStatsRibbon: React.FC<TurboCaptainStatsRibbonProps> = ({
  stats,
}) => {
  const hasDelayReasons = Object.keys(stats.delayReasons).length > 0;
  const hasReturnReasons = Object.keys(stats.returnReasons).length > 0;

  return (
    <div className="space-y-4">
      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            إجمالي الشحنات
          </span>
          <span className="text-xl font-bold font-mono tabular-nums text-foreground">
            {stats.total}
          </span>
        </div>
        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            تم التسليم والتحصيل
          </span>
          <span className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {stats.delivered + stats.remitted}
          </span>
        </div>
        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            المرتجعات
          </span>
          <span className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {stats.returned}
          </span>
        </div>
        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            شحنات نشطة
          </span>
          <span className="text-xl font-bold font-mono tabular-nums text-primary">
            {stats.active}
          </span>
        </div>
        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">
            نسبة التسليم
          </span>
          <span className="text-xl font-bold font-mono tabular-nums text-foreground">
            {stats.deliveryRate}%
          </span>
        </div>
      </div>

      {/* Reasons Summary */}
      {(hasDelayReasons || hasReturnReasons) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hasDelayReasons && (
            <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>أسباب التأخير المسجلة</span>
              </div>
              <div className="space-y-1 text-xs">
                {Object.entries(stats.delayReasons)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <div
                      key={reason}
                      className="flex justify-between py-1 border-b border-border/30 last:border-0"
                    >
                      <span className="text-muted-foreground truncate">
                        {reason}
                      </span>
                      <span className="font-bold font-mono tabular-nums text-foreground">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {hasReturnReasons && (
            <div className="bg-card border border-border/70 rounded-xl p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-2">
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span>أسباب الارتجاع المسجلة</span>
              </div>
              <div className="space-y-1 text-xs">
                {Object.entries(stats.returnReasons)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <div
                      key={reason}
                      className="flex justify-between py-1 border-b border-border/30 last:border-0"
                    >
                      <span className="text-muted-foreground truncate">
                        {reason}
                      </span>
                      <span className="font-bold font-mono tabular-nums text-foreground">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TurboCaptainStatsRibbon;
