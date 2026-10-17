import React from "react";
import { ArrowDownTrayIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface AvailabilityHeaderProps {
  onExportCsv: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const AvailabilityHeader: React.FC<AvailabilityHeaderProps> = ({
  onExportCsv,
  onRefresh,
  loading,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          المخزون المتاح
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          كل منتجات المتجر في جدول واحد: تتبع المخزون، الطلب المسبق، والكميات المتاحة
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground bg-card border border-border/70 rounded-xl hover:bg-muted/50 transition-colors shadow-2xs cursor-pointer active:scale-[0.98]"
        >
          <ArrowDownTrayIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>تصدير CSV</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground bg-card border border-border/70 rounded-xl hover:bg-muted/50 transition-colors shadow-2xs cursor-pointer active:scale-[0.98] disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث</span>
        </button>
      </div>
    </div>
  );
};
