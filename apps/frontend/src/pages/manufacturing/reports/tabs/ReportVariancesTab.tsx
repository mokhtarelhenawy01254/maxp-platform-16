import React from 'react';
import { Package, Sparkles, Coins } from 'lucide-react';

interface ReportVariancesTabProps {
  metrics: {
    totalMaterialCost: number;
    totalLaborCost: number;
    totalOverheadCost: number;
    totalSpend: number;
  };
  formatEGP: (num: number) => string;
}

export const ReportVariancesTab: React.FC<ReportVariancesTabProps> = ({ metrics, formatEGP }) => {
  return (
    <div className="rounded-xl bg-card border border-border/70 shadow-xs p-5 space-y-4">
      <div>
        <h4 className="text-xs font-bold text-foreground">ملخص انحرافات التكاليف (Cost Variance Analysis)</h4>
        <p className="text-[11px] text-muted-foreground">
          توزيع إجمالي الإنفاق الصناعي بين الخامات المستهلكة، أجور العمالة المحققة، والأعباء الصناعية المحملة
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-2">
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Package className="w-4 h-4 text-primary" />
            <span>انحراف تكلفة الخامات (Materials)</span>
          </div>
          <div className="text-xl font-bold text-foreground tabular-nums">
            {formatEGP(metrics.totalMaterialCost)} <span className="text-xs font-normal text-muted-foreground">ج.م</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            تمثل {(metrics.totalSpend > 0 ? (metrics.totalMaterialCost / metrics.totalSpend) * 100 : 0).toFixed(1)}% من إجمالي تكاليف التشغيل
          </p>
        </div>

        <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-2">
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>انحراف تكلفة العمالة (Labor)</span>
          </div>
          <div className="text-xl font-bold text-foreground tabular-nums">
            {formatEGP(metrics.totalLaborCost)} <span className="text-xs font-normal text-muted-foreground">ج.م</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            تمثل {(metrics.totalSpend > 0 ? (metrics.totalLaborCost / metrics.totalSpend) * 100 : 0).toFixed(1)}% من إجمالي تكاليف التشغيل
          </p>
        </div>

        <div className="p-4 rounded-lg bg-muted/40 border border-border/60 space-y-2">
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-600" />
            <span>الأعباء غير المباشرة (MOH)</span>
          </div>
          <div className="text-xl font-bold text-foreground tabular-nums">
            {formatEGP(metrics.totalOverheadCost)} <span className="text-xs font-normal text-muted-foreground">ج.م</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            تمثل {(metrics.totalSpend > 0 ? (metrics.totalOverheadCost / metrics.totalSpend) * 100 : 0).toFixed(1)}% من إجمالي تكاليف التشغيل
          </p>
        </div>
      </div>
    </div>
  );
};
