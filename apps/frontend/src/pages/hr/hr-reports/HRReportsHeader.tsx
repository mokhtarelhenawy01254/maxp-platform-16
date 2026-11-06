import React from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTHS } from "./helpers";

interface HRReportsHeaderProps {
  selectedMonth: number;
  selectedYear: number;
  onRefresh: () => void;
  onExport: () => void;
}

export const HRReportsHeader: React.FC<HRReportsHeaderProps> = ({
  selectedMonth,
  selectedYear,
  onRefresh,
  onExport,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          تقارير الموارد البشرية
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-mono tabular-nums">
          {MONTHS[selectedMonth - 1]} {selectedYear}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onRefresh} className="gap-1.5 text-xs font-semibold">
          <RefreshCw className="h-4 w-4" />
          تحديث
        </Button>
        <Button size="sm" variant="outline" onClick={onExport} className="gap-1.5 text-xs font-semibold">
          <Download className="h-4 w-4" />
          تصدير
        </Button>
      </div>
    </div>
  );
};
