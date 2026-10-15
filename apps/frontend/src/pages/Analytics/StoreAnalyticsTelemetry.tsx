import React from "react";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Eye,
  DollarSign,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useCurrency } from "../../hooks/useCurrency";
import { TrendMetric } from "./storeAnalyticsDashboard.utils";

interface StoreAnalyticsTelemetryProps {
  totalRevenue: number;
  revenueTrend: TrendMetric | null;
  totalOrders: number;
  ordersTrend: TrendMetric | null;
  totalVisits: number;
  visitsTrend: TrendMetric | null;
  conversionRate: number;
  avgOrderValue: number;
  netProfit: number;
  profitMargin: number;
  organicConversionRate: number;
  potentialConversionRate: number;
  realizedConversionRate: number;
  conversionLift: number;
  recoveredRevenue: number;
  recoveredPurchases: number;
  recoveryRate: number;
}

export const StoreAnalyticsTelemetry: React.FC<StoreAnalyticsTelemetryProps> = ({
  totalRevenue,
  revenueTrend,
  totalOrders,
  ordersTrend,
  totalVisits,
  visitsTrend,
  conversionRate,
  avgOrderValue,
  netProfit,
  profitMargin,
  organicConversionRate,
  potentialConversionRate,
  realizedConversionRate,
  conversionLift,
  recoveredRevenue,
  recoveredPurchases,
  recoveryRate,
}) => {
  const { formatPrice } = useCurrency();

  const TrendBadge = ({ trend }: { trend: TrendMetric | null }) => {
    if (!trend) return null;
    const isUp = trend.direction === "up";
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${
          isUp
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        }`}
      >
        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {trend.formatted}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* 1. Core KPIs Strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-border/70 bg-card p-3 shadow-none">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>إجمالي الإيرادات</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1">
            <span className="font-mono text-xl font-bold tabular-nums text-foreground">
              {formatPrice(totalRevenue)}
            </span>
            <TrendBadge trend={revenueTrend} />
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground tabular-nums">
            متوسط الطلب: {formatPrice(avgOrderValue)}
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-3 shadow-none">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>طلبات المتجر الناجحة</span>
            <ShoppingBag className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1">
            <span className="font-mono text-xl font-bold tabular-nums text-foreground">
              {totalOrders.toLocaleString()}
            </span>
            <TrendBadge trend={ordersTrend} />
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground tabular-nums">
            معدل التحويل: {conversionRate.toFixed(2)}%
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-3 shadow-none">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>إجمالي الزيارات</span>
            <Eye className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1">
            <span className="font-mono text-xl font-bold tabular-nums text-foreground">
              {totalVisits.toLocaleString()}
            </span>
            <TrendBadge trend={visitsTrend} />
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            زيارات صفحات المتجر والمنتجات
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-3 shadow-none">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>صافي الربح التقديري</span>
            <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1">
            <span className="font-mono text-xl font-bold tabular-nums text-foreground">
              {formatPrice(netProfit)}
            </span>
            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-foreground">
              {profitMargin.toFixed(1)}% هامش
            </span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            بعد خصم تكلفة البضاعة والشحن
          </div>
        </div>
      </div>

      {/* 2. 3-Tier Conversion Lift Banner */}
      <div className="rounded-lg border border-border/70 bg-muted/20 p-3 shadow-none">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/60 pb-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              تحليل التحويل ثلاثي المستويات وقوة الاسترجاع (3-Tier Conversion Lift)
            </span>
          </div>
          {conversionLift > 0 && (
            <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 tabular-nums">
              +{conversionLift.toFixed(2)}% نمو التحويل بفضل المحركات
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono tabular-nums text-xs">
          <div className="rounded border border-border/60 bg-card p-2">
            <span className="font-sans text-[11px] text-muted-foreground block mb-0.5">
              1. التحويل الطبيعي (Organic)
            </span>
            <span className="text-sm font-bold text-foreground">
              {organicConversionRate.toFixed(2)}%
            </span>
            <span className="font-sans text-[10px] text-muted-foreground block mt-0.5">
              شراء مباشر بدون تدخل
            </span>
          </div>

          <div className="rounded border border-border/60 bg-card p-2">
            <span className="font-sans text-[11px] text-muted-foreground block mb-0.5">
              2. التحويل الفعلي المحقق
            </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {realizedConversionRate.toFixed(2)}%
            </span>
            <span className="font-sans text-[10px] text-muted-foreground block mt-0.5">
              طبيعي + مسترجع فعلياً
            </span>
          </div>

          <div className="rounded border border-border/60 bg-card p-2">
            <span className="font-sans text-[11px] text-muted-foreground block mb-0.5">
              3. أقصى نية شراء (Potential)
            </span>
            <span className="text-sm font-bold text-primary">
              {potentialConversionRate.toFixed(2)}%
            </span>
            <span className="font-sans text-[10px] text-muted-foreground block mt-0.5">
              شامل السلات المتروكة
            </span>
          </div>

          <div className="rounded border border-border/60 bg-card p-2">
            <span className="font-sans text-[11px] text-muted-foreground block mb-0.5">
              عوائد الاسترجاع المحققة
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {formatPrice(recoveredRevenue)}
            </span>
            <span className="font-sans text-[10px] text-muted-foreground block mt-0.5">
              {recoveredPurchases} طلب ({recoveryRate.toFixed(1)}% استرجاع)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreAnalyticsTelemetry;
