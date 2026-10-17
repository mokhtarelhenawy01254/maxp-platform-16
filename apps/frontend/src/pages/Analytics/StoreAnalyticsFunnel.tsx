import React from "react";
import {
  GitCommit,
  CheckCircle,
  HelpCircle,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { FunnelMetric } from "./storeAnalyticsDashboard.utils";

interface DropOffAnalysis {
  stage: string;
  description: string;
  recommendation: string;
}

interface StoreAnalyticsFunnelProps {
  funnelMetrics: FunnelMetric[];
  visitorToCart: string;
  cartToCheckout: string;
  checkoutToOrder: string;
  dropOffAnalysis: DropOffAnalysis | null;
}

export const StoreAnalyticsFunnel: React.FC<StoreAnalyticsFunnelProps> = ({
  funnelMetrics,
  visitorToCart,
  cartToCheckout,
  checkoutToOrder,
  dropOffAnalysis,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
      {/* Funnel Pipeline Flow (7 cols) */}
      <div className="lg:col-span-7 rounded-lg border border-border/70 bg-card p-4 shadow-none">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <GitCommit className="h-4 w-4 text-primary" /> قمع التحويل ومسار الشراء (Conversion Funnel)
          </h3>
          <span className="text-[11px] text-muted-foreground">
            تسلسل تدفق الزائر حتى استلام الطلب
          </span>
        </div>

        {/* Funnel Stages */}
        <div className="space-y-2">
          {Array.isArray(funnelMetrics) && funnelMetrics.length > 0 ? (
            funnelMetrics.map((stage, idx) => {
              const count = Number(stage?.value ?? (stage as any)?.count ?? 0);
              const percent = Number(
                stage?.baselineRate ?? stage?.visualShare ?? (stage as any)?.percentOfVisits ?? 0
              );
              const safeCount = Number.isFinite(count) ? count : 0;
              const safePercent = Number.isFinite(percent) ? percent : 0;

              return (
                <div key={stage?.label || stage?.key || idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{stage?.label || "مرحلة"}</span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-bold text-foreground">
                        {safeCount.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-muted-foreground w-12 text-left">
                        ({safePercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(0, Math.min(100, Math.max(safePercent, safeCount > 0 ? 2 : 0)))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">
              لا توجد بيانات قمع تحويل كافية حالياً
            </p>
          )}
        </div>

        {/* Conversion Ratios Strip */}
        <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-3 gap-2 text-center text-xs font-mono tabular-nums">
          <div className="rounded bg-muted/30 p-2">
            <span className="font-sans text-[10px] text-muted-foreground block truncate">
              من زيارة إلى سلة
            </span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">
              {visitorToCart}%
            </span>
          </div>
          <div className="rounded bg-muted/30 p-2">
            <span className="font-sans text-[10px] text-muted-foreground block truncate">
              من سلة إلى شيك أوت
            </span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">
              {cartToCheckout}%
            </span>
          </div>
          <div className="rounded bg-muted/30 p-2">
            <span className="font-sans text-[10px] text-muted-foreground block truncate">
              من شيك أوت إلى شراء
            </span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">
              {checkoutToOrder}%
            </span>
          </div>
        </div>
      </div>

      {/* Drop-off Diagnostic Insights (5 cols) */}
      <div className="lg:col-span-5 rounded-lg border border-border/70 bg-card p-4 shadow-none flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500" /> تشخيص تسرب الزوار
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              تحليل ذكي
            </span>
          </div>

          {dropOffAnalysis ? (
            <div className="space-y-2.5 text-xs">
              <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                <span className="text-[11px] text-muted-foreground block mb-1">نقطة التسرب الأبرز:</span>
                <span className="font-bold text-foreground text-sm block">
                  {dropOffAnalysis.stage}
                </span>
                <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                  {dropOffAnalysis.description}
                </p>
              </div>

              <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                <span className="text-[11px] font-semibold text-primary block mb-1">
                  التوصية التنفيذية المقترحة:
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {dropOffAnalysis.recommendation}
                </p>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">
              لا توجد حركة زيارات كافية لتشخيص نقاط التسرب حالياً.
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-border/60 text-[10px] text-muted-foreground">
          يتم رصد نقاط التسرب تلقائياً عبر مقارنة مسار الجلسات بخوارزميات تحسين معدل التحويل (CRO).
        </div>
      </div>
    </div>
  );
};

export default StoreAnalyticsFunnel;
