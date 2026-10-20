import React from "react";
import { Package, CheckCircle2, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusFilter, MyAppsStats } from "../../types/myAppsTypes";

interface MyAppsTelemetryStripProps {
  stats: MyAppsStats;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
}

export const MyAppsTelemetryStrip: React.FC<MyAppsTelemetryStripProps> = ({
  stats,
  statusFilter,
  onStatusFilterChange,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Apps */}
      <div
        onClick={() => onStatusFilterChange("ALL")}
        className={cn(
          "rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer select-none",
          statusFilter === "ALL"
            ? "border-primary/50 bg-primary/[0.04] ring-1 ring-primary/20 shadow-sm"
            : "border-border/40 bg-card/60 hover:bg-card hover:border-border/70"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">إجمالي الأدوات</span>
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Package className="size-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-foreground tabular-nums font-mono">
            {stats.total}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">أداة مثبتة</span>
        </div>
      </div>

      {/* 2. Active Apps */}
      <div
        onClick={() => onStatusFilterChange(statusFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
        className={cn(
          "rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer select-none",
          statusFilter === "ACTIVE"
            ? "border-emerald-500/50 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20 shadow-sm"
            : "border-border/40 bg-card/60 hover:bg-card hover:border-border/70"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">الاشتراكات النشطة</span>
          <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="size-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
            {stats.active}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">اشتراك فعال</span>
        </div>
      </div>

      {/* 3. Trial Apps */}
      <div
        onClick={() => onStatusFilterChange(statusFilter === "TRIAL" ? "ALL" : "TRIAL")}
        className={cn(
          "rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer select-none",
          statusFilter === "TRIAL"
            ? "border-amber-500/50 bg-amber-500/[0.04] ring-1 ring-amber-500/20 shadow-sm"
            : "border-border/40 bg-card/60 hover:bg-card hover:border-border/70"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">فترات تجريبية</span>
          <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Clock className="size-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums font-mono">
            {stats.trial}
          </span>
          {stats.expiringSoon > 0 ? (
            <span className="text-[11px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md tabular-nums font-mono">
              {stats.expiringSoon} تنتهي قريباً
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground font-medium">تجربة مجانية</span>
          )}
        </div>
      </div>

      {/* 4. Monthly Usage Cost */}
      <div className="rounded-2xl border border-border/40 bg-card/60 p-3.5 sm:p-4 transition-all hover:bg-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">استهلاك الشهر</span>
          <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Activity className="size-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-foreground tabular-nums font-mono">
            {stats.monthlyTotalCost.toFixed(2)}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">ج.م استهلاك</span>
        </div>
      </div>
    </div>
  );
};
