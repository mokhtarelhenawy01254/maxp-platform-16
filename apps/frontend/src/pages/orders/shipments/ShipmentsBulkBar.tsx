import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface ShipmentsBulkBarProps {
  selectedCount: number;
  bulkSyncing: boolean;
  onBulkSync: () => void;
  onClearSelection: () => void;
}

export const ShipmentsBulkBar: React.FC<ShipmentsBulkBarProps> = ({
  selectedCount,
  bulkSyncing,
  onBulkSync,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-150">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center font-bold font-mono tabular-nums">
          {selectedCount}
        </span>
        <span className="text-xs font-medium text-foreground">
          تم تحديد <span className="font-mono tabular-nums font-semibold">{selectedCount}</span> شحنة في البيان
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBulkSync}
          disabled={bulkSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${bulkSyncing ? "animate-spin" : ""}`} />
          <span>مزامنة الحالات المحددة</span>
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          إلغاء التحديد
        </button>
      </div>
    </div>
  );
};
