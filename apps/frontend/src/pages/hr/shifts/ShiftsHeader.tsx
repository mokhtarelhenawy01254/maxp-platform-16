import React from "react";
import { Clock, Plus, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { ViewMode } from "./types";

interface ShiftsHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreateNew: () => void;
}

export const ShiftsHeader: React.FC<ShiftsHeaderProps> = ({
  viewMode,
  onViewModeChange,
  onCreateNew,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            المناوبات وجداول العمل
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            إدارة وتوزيع مناوبات العمل وجداول الموظفين الأسبوعية
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <div className="flex items-center bg-card p-1 rounded-xl border border-border/70">
          <Button
            type="button"
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("grid")}
            className="h-8 px-2.5 text-xs rounded-lg"
          >
            <LayoutGrid className="h-3.5 w-3.5 ml-1.5" />
            <span>شبكة</span>
          </Button>
          <Button
            type="button"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("table")}
            className="h-8 px-2.5 text-xs rounded-lg"
          >
            <TableIcon className="h-3.5 w-3.5 ml-1.5" />
            <span>جدول</span>
          </Button>
        </div>

        <Button
          type="button"
          onClick={onCreateNew}
          size="sm"
          className="h-8 sm:h-9 text-xs"
        >
          <Plus className="h-4 w-4 ml-1.5" />
          <span>مناوبة جديدة</span>
        </Button>
      </div>
    </div>
  );
};
