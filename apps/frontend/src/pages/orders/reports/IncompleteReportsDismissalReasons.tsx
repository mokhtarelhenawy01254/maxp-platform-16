import React from "react";
import { ShieldAlert } from "lucide-react";
import type { DismissalReason } from "./IncompleteReportsTypes";

interface IncompleteReportsDismissalReasonsProps {
  dismissalReasons: DismissalReason[];
}

export const IncompleteReportsDismissalReasons: React.FC<
  IncompleteReportsDismissalReasonsProps
> = ({ dismissalReasons }) => {
  if (dismissalReasons.length === 0) return null;

  return (
    <section className="bg-card rounded-xl p-4 sm:p-5 shadow-2xs border border-border/70 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            أسباب الإلغاء والاستبعاد الموثقة
          </h2>
          <p className="text-xs text-muted-foreground">
            الأسباب التي سجلها الفريق عند التواصل مع العملاء وتأكيد إلغاء السلة
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {dismissalReasons.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/60 hover:bg-muted/40 transition-colors"
          >
            <span className="text-xs font-medium text-foreground truncate">
              {item.reason}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono tabular-nums shrink-0">
              {item.count.toLocaleString()} سلة
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default IncompleteReportsDismissalReasons;
