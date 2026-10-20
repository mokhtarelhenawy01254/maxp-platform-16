import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../../components/ui/button";

interface AppHistoryPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (updater: (prev: number) => number) => void;
}

export function AppHistoryPagination({
  page,
  totalPages,
  totalCount,
  onPageChange,
}: AppHistoryPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="p-3 border-t border-border/40 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
      <span className="tabular-nums font-mono">
        صفحة <strong>{page}</strong> من <strong>{totalPages}</strong> ({totalCount} عملية)
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          className="h-8 px-2.5 rounded-lg text-xs gap-1"
        >
          <ChevronRight className="size-3.5" />
          <span>السابق</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          className="h-8 px-2.5 rounded-lg text-xs gap-1"
        >
          <span>التالي</span>
          <ChevronLeft className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
