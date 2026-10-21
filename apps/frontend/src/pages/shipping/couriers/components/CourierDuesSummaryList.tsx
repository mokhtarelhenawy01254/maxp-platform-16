import React from 'react';
import { type CourierCommissionSummaryRow } from '../../../../services/courierService';

interface CourierDuesSummaryListProps {
  summary: CourierCommissionSummaryRow[];
  formatPrice: (price: number) => string;
  onOpenPay: (courierId: string) => void;
}

export const CourierDuesSummaryList: React.FC<CourierDuesSummaryListProps> = ({
  summary,
  formatPrice,
  onOpenPay,
}) => {
  return (
    <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
      <div className="px-4 py-3 bg-muted/30 border-b border-border/70 flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">ملخص مستحقات المناديب</span>
        <span className="text-[11px] font-mono text-muted-foreground">{summary.length} مندوب</span>
      </div>

      <div className="divide-y divide-border/60">
        {summary.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground font-mono">
            لا توجد عمولات مسجلة بعد — يتم توليدها تلقائياً عند تسوية مأموريات التوصيل
          </div>
        ) : (
          summary.map((r) => (
            <div
              key={r.courierId}
              className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/10 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-semibold text-xs text-foreground truncate">{r.name}</div>
                <div className="text-[11px] font-mono text-muted-foreground mt-0.5" dir="ltr">
                  {r.phone}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-left font-mono">
                  <div className="text-[10px] text-muted-foreground uppercase">مستحق معلق</div>
                  <div className="font-bold text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatPrice(r.dueAmount)}{' '}
                    <span className="text-[10px] font-normal text-muted-foreground">({r.dueCount})</span>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <div className="text-[10px] text-muted-foreground uppercase">تم صرفه</div>
                  <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatPrice(r.paidAmount)}{' '}
                    <span className="text-[10px] font-normal text-muted-foreground">({r.paidCount})</span>
                  </div>
                </div>

                {r.dueAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenPay(r.courierId)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold active:scale-[0.97] transition-all shadow-xs"
                  >
                    صرف المستحقات
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
