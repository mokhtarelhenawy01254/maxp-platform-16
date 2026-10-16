import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EnhancedPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export const EnhancedPagination: React.FC<EnhancedPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}) => {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = totalItems === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-border/60 bg-card/40 text-foreground">
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <p className="text-xs text-muted-foreground font-mono tabular-nums">
          عرض <span className="text-foreground font-semibold">{startItem}</span> -{" "}
          <span className="text-foreground font-semibold">{endItem}</span> من{" "}
          <span className="text-foreground font-semibold">{totalItems}</span>
        </p>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-28 rounded-lg border-border/70 bg-card text-xs font-mono tabular-nums">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-border/70 bg-card">
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()} className="text-xs font-mono tabular-nums">
                {size} / صفحة
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
        <Button
          variant="outline"
          size="icon"
          className="size-8 rounded-lg border-border/70 text-muted-foreground hover:text-foreground active:scale-95"
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          title="الصفحة الأولى"
        >
          <ChevronsRight className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8 rounded-lg border-border/70 text-muted-foreground hover:text-foreground active:scale-95"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="الصفحة السابقة"
        >
          <ChevronRight className="size-3.5" />
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) =>
            page === "..." ? (
              <span key={`ellipsis-${index}`} className="px-1 text-xs text-muted-foreground font-mono">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                className={`h-8 min-w-[2rem] px-2 text-xs font-mono tabular-nums rounded-lg active:scale-95 ${
                  page === currentPage
                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                    : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </Button>
            ),
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="size-8 rounded-lg border-border/70 text-muted-foreground hover:text-foreground active:scale-95"
          disabled={currentPage >= totalPages || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
          title="الصفحة التالية"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8 rounded-lg border-border/70 text-muted-foreground hover:text-foreground active:scale-95"
          disabled={currentPage >= totalPages || totalPages === 0}
          onClick={() => onPageChange(totalPages)}
          title="الصفحة الأخيرة"
        >
          <ChevronsLeft className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default EnhancedPagination;
