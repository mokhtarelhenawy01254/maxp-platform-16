import React from "react";
import { Award, Eye, MousePointer, Percent, Coins, Wallet } from "lucide-react";
import { FacebookAdTestVariant } from "../../services/facebookAdsService";

interface ABTestVariantCardProps {
  variant: FacebookAdTestVariant;
}

export const ABTestVariantCard: React.FC<ABTestVariantCardProps> = ({ variant }) => {
  return (
    <div
      className={`p-4 sm:p-5 transition-colors ${
        variant.isWinner
          ? "bg-emerald-500/[0.04] border-s-2 border-s-emerald-500"
          : "hover:bg-muted/30"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="font-semibold text-sm sm:text-base text-foreground">
            {variant.name}
          </h3>
          <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-muted/60 text-muted-foreground border border-border/50">
            {variant.variantType}
          </span>
          {variant.isWinner && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Award className="h-3 w-3" />
              المتغير الفائز
            </span>
          )}
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="p-2.5 rounded-md border border-border/60 bg-muted/20">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>المشاهدات</span>
          </div>
          <div className="mt-1 text-sm sm:text-base font-bold font-mono text-foreground tabular-nums">
            {(variant.impressions ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="p-2.5 rounded-md border border-border/60 bg-muted/20">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MousePointer className="h-3 w-3" />
            <span>النقرات</span>
          </div>
          <div className="mt-1 text-sm sm:text-base font-bold font-mono text-foreground tabular-nums">
            {(variant.clicks ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="p-2.5 rounded-md border border-border/60 bg-muted/20">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Percent className="h-3 w-3" />
            <span>CTR</span>
          </div>
          <div className="mt-1 text-sm sm:text-base font-bold font-mono text-foreground tabular-nums">
            {(variant.ctr ?? 0).toFixed(2)}%
          </div>
        </div>

        <div className="p-2.5 rounded-md border border-border/60 bg-muted/20">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Coins className="h-3 w-3" />
            <span>CPC</span>
          </div>
          <div className="mt-1 text-sm sm:text-base font-bold font-mono text-foreground tabular-nums">
            {(variant.cpc ?? 0).toFixed(2)} ج.م
          </div>
        </div>

        <div className="p-2.5 rounded-md border border-border/60 bg-muted/20">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Wallet className="h-3 w-3" />
            <span>الإنفاق</span>
          </div>
          <div className="mt-1 text-sm sm:text-base font-bold font-mono text-foreground tabular-nums">
            {(variant.spend ?? 0).toFixed(2)} ج.م
          </div>
        </div>
      </div>

      {variant.pValue !== null && variant.pValue !== undefined && (
        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <span>P-value: {variant.pValue.toFixed(4)}</span>
          <span>•</span>
          <span>الثقة: {(variant.confidenceLevel ?? 0).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};
