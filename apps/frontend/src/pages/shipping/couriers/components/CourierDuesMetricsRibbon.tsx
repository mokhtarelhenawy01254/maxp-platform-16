import React from 'react';
import { Clock, CheckCircle2, Banknote } from 'lucide-react';
import { type CourierCommissionSummaryRow } from '../../../../services/courierService';

interface CourierDuesMetricsRibbonProps {
  totalDue: number;
  summary: CourierCommissionSummaryRow[];
  totalEntries: number;
  formatPrice: (price: number) => string;
}

export const CourierDuesMetricsRibbon: React.FC<CourierDuesMetricsRibbonProps> = ({
  totalDue,
  summary,
  totalEntries,
  formatPrice,
}) => {
  const activeCouriersWithDue = summary.filter((r) => r.dueAmount > 0).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
      <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Clock size={13} className="text-amber-500" />
          <span>إجمالي المستحق المعلق (DUE)</span>
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
          {formatPrice(totalDue)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">عمولات تنتظر الصرف للخزينة</div>
      </div>

      <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-emerald-500" />
          <span>مناديب لهم مستحقات</span>
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
          {activeCouriersWithDue}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">من أصل {summary.length} مندوب مسجل</div>
      </div>

      <div className="p-3 rounded-lg bg-muted/20 border border-border/40 col-span-2 lg:col-span-1">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Banknote size={13} className="text-primary" />
          <span>إجمالي القيود المسجلة</span>
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
          {totalEntries}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">سجلات العمولات المحسوبة</div>
      </div>
    </div>
  );
};
