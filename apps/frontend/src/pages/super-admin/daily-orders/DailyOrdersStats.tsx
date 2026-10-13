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
    <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
      {/* 1. إجمالي الطلبات */}
      <div className="p-3 sm:p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            إجمالي طلبات المنصة
          </span>
          <span className="size-1.5 rounded-full bg-blue-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums">
            {summary.totalOrders.toLocaleString()}
          </span>
          <div
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded-md",
              isPositiveOrders
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
            title={`الفترة السابقة: ${summary.prevTotalOrders.toLocaleString()} طلب`}
          >
            {isPositiveOrders ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {isPositiveOrders ? "+" : ""}
            {summary.ordersGrowthPercent}%
          </div>
        </div>
        <p className="mt-1 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
          <span>مقارنة بـ {periodComparisonLabel}</span>
          <span className="tabular-nums">
            ({summary.prevTotalOrders.toLocaleString()} طلب)
          </span>
        </p>
      </div>

      {/* 2. إجمالي المبيعات GMV */}
      <div className="p-3 sm:p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            إجمالي المبيعات (GMV)
          </span>
          <span className="size-1.5 rounded-full bg-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums">
              {summary.totalGMV.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">ج.م</span>
          </div>
          <div
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded-md",
              isPositiveGmv
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {isPositiveGmv ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {isPositiveGmv ? "+" : ""}
            {summary.gmvGrowthPercent}%
          </div>
        </div>
        <p className="mt-1 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
          <span>متوسط الطلب (AOV)</span>
          <span className="tabular-nums font-medium text-foreground">
            {summary.avgOrderValue.toLocaleString()} ج.م
          </span>
        </p>
      </div>

      {/* 3. المتاجر النشطة بيعياً */}
      <div className="p-3 sm:p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            المتاجر النشطة
          </span>
          <span className="size-1.5 rounded-full bg-purple-500" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums">
              {summary.activeCompaniesCount}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              / {summary.totalCompaniesCount}
            </span>
          </div>
          <div className="flex items-center gap-0.5 text-[11px] font-mono font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md tabular-nums">
            <Percent className="size-2.5" />
            {summary.activeRatePercent}%
          </div>
        </div>
        <p className="mt-1 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
          <span>معدل النشاط</span>
          <span className="text-foreground font-medium">
            {summary.activeCompaniesCount > 0 ? "نشط حالياً" : "لا توجد مبيعات"}
          </span>
        </p>
      </div>

      {/* 4. المتجر المتصدر */}
      <div className="p-3 sm:p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            المتجر المتصدر
          </span>
          <span className="size-1.5 rounded-full bg-amber-500" />
        </div>
        <div className="mt-2">
          {summary.topMerchant ? (
            <div>
              <p
                className="text-sm sm:text-base font-bold text-foreground truncate"
                title={summary.topMerchant.name}
              >
                {summary.topMerchant.name}
              </p>
              <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span className="tabular-nums font-semibold text-foreground">
                  {summary.topMerchant.ordersCount.toLocaleString()} طلب
                </span>
                <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                  {summary.topMerchant.ordersGMV.toLocaleString()} ج.م
                </span>
              </div>
            </div>
          ) : (
            <div className="py-1 text-xs font-mono text-muted-foreground">
              لا توجد بيانات بيع
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
