import React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface ShipmentsPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
}

export const ShipmentsPagination: React.FC<ShipmentsPaginationProps> = ({
  page,
  totalPages,
  totalItems,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="px-4 py-2.5 border-t border-border/70 flex items-center justify-between text-xs bg-card">
      <p className="text-muted-foreground font-mono tabular-nums">
        إجمالي {totalItems} شحنة — صفحة {page} من {totalPages}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1 rounded-lg border border-border/70 text-foreground disabled:opacity-40 hover:bg-muted/50 transition-colors"
          title="الصفحة السابقة"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1 rounded-lg border border-border/70 text-foreground disabled:opacity-40 hover:bg-muted/50 transition-colors"
          title="الصفحة التالية"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
