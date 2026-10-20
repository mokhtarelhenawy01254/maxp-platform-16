import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export interface CustomerHistoryKpiGridProps {
  totalOrdersCount: number;
  totalDelivered: number;
  failedCount: number;
  deliveryRate: number | null;
  isArabic: boolean;
}

export const CustomerHistoryKpiGrid: React.FC<CustomerHistoryKpiGridProps> = ({
  totalOrdersCount,
  totalDelivered,
  failedCount,
  deliveryRate,
  isArabic,
}) => {
  return (
    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
      <div className="rounded-lg border border-border/50 bg-muted/15 p-2">
        <span className="text-muted-foreground block text-[10px] font-medium">
          {isArabic ? "إجمالي الطلبات" : "Total Orders"}
        </span>
        <span className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5 block">
          {totalOrdersCount}
        </span>
      </div>
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2">
        <div className="flex items-center justify-between">
          <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-medium">
            {isArabic ? "مستلمة" : "Delivered"}
          </span>
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-sm font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5 block">
          {totalDelivered}
        </span>
      </div>
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2">
        <div className="flex items-center justify-between">
          <span className="text-destructive text-[10px] font-medium">
            {isArabic ? "ملغية/مرتجعة" : "Failed"}
          </span>
          <XCircle className="h-3 w-3 text-destructive" />
        </div>
        <span className="text-sm font-bold font-mono tabular-nums text-destructive mt-0.5 block">
          {failedCount}
        </span>
      </div>
      <div className="rounded-lg border border-border/50 bg-muted/15 p-2">
        <span className="text-muted-foreground block text-[10px] font-medium">
          {isArabic ? "نسبة الاستلام" : "Success Rate"}
        </span>
        <span className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5 block">
          {deliveryRate != null ? `${Math.round(deliveryRate)}%` : isArabic ? "جديد" : "New"}
        </span>
      </div>
    </div>
  );
};
