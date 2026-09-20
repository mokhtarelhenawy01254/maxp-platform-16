import React from "react";
import {
  Package,
  CircleDollarSign,
  Store,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from "lucide-react";
import { DailyOrdersSummaryResponse } from "./types";
import { cn } from "@/lib/utils";

interface DailyOrdersStatsProps {
  summary: DailyOrdersSummaryResponse["summary"];
  period: string;
}

export const DailyOrdersStats: React.FC<DailyOrdersStatsProps> = ({
  summary,
  period,
}) => {
  const isPositiveOrders = summary.ordersGrowthPercent >= 0;
  const isPositiveGmv = summary.gmvGrowthPercent >= 0;

  const getPeriodLabel = () => {
    switch (period) {
      case "today":
        return "أمس";
      case "yesterday":
        return "أول أمس";
      case "7d":
        return "الأسبوع السابق";
      case "30d":
        return "الشهر السابق";
      case "month":
        return "الشهر الماضي";
      default:
        return "الفترة السابقة";
    }
  };

  const periodComparisonLabel = getPeriodLabel();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. إجمالي الطلبات */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            إجمالي طلبات المنصة
          </span>
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="size-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {summary.totalOrders.toLocaleString()}
          </span>
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full",
              isPositiveOrders
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
            title={`الفترة السابقة: ${summary.prevTotalOrders.toLocaleString()} طلب`}
          >
            {isPositiveOrders ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {isPositiveOrders ? "+" : ""}
            {summary.ordersGrowthPercent}%
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>مقارنة بـ {periodComparisonLabel}</span>
          <span className="tabular-nums font-medium">
            ({summary.prevTotalOrders.toLocaleString()} طلب)
          </span>
        </p>
      </div>

      {/* 2. إجمالي المبيعات GMV */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            إجمالي قيمة المبيعات (GMV)
          </span>
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CircleDollarSign className="size-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {summary.totalGMV.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-muted-foreground">ج.م</span>
          </div>
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full",
              isPositiveGmv
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {isPositiveGmv ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {isPositiveGmv ? "+" : ""}
            {summary.gmvGrowthPercent}%
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>متوسط قيمة الطلب (AOV)</span>
          <span className="tabular-nums font-medium text-foreground">
            {summary.avgOrderValue.toLocaleString()} ج.م
          </span>
        </p>
      </div>

      {/* 3. المتاجر النشطة بيعياً */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            المتاجر النشطة بيعياً
          </span>
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Store className="size-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {summary.activeCompaniesCount}
            </span>
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              / {summary.totalCompaniesCount} شركة
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
            <Percent className="size-3" />
            {summary.activeRatePercent}%
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>حالة النشاط في المنصة</span>
          <span className="text-foreground font-medium">
            {summary.activeCompaniesCount > 0 ? "طلبات جارية" : "لا توجد مبيعات"}
          </span>
        </p>
      </div>

      {/* 4. المتجر المتصدر */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            أعلى المتاجر أداءً
          </span>
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Trophy className="size-4" />
          </div>
        </div>
        <div className="mt-2">
          {summary.topMerchant ? (
            <div>
              <p
                className="text-lg sm:text-xl font-bold text-foreground truncate"
                title={summary.topMerchant.name}
              >
                {summary.topMerchant.name}
              </p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">
                  {summary.topMerchant.ordersCount.toLocaleString()} طلب
                </span>
                <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                  {summary.topMerchant.ordersGMV.toLocaleString()} ج.م
                </span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-sm text-muted-foreground">
              لا توجد بيانات بيع حالياً
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
