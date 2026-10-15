import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number;
  hasActiveFilters: boolean;
  sortedProductsLength: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (count: number) => void;
}

const ProductsPagination: React.FC<ProductsPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  startIndex,
  hasActiveFilters,
  sortedProductsLength,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  const displayedEnd = hasActiveFilters
    ? Math.min(startIndex + itemsPerPage, sortedProductsLength)
    : Math.min(startIndex + itemsPerPage, totalItems);
  const displayedTotal = hasActiveFilters ? sortedProductsLength : totalItems;

  const PrevIcon = isEn ? ChevronLeft : ChevronRight;
  const NextIcon = isEn ? ChevronRight : ChevronLeft;

  return (
    <div className="bg-card px-4 py-2.5 flex items-center justify-between rounded-xl shadow-xs border border-border/70 relative z-20 mb-6">
      {/* Mobile */}
      <div className="flex-1 flex items-center justify-between sm:hidden">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="relative inline-flex items-center gap-1 px-3 py-1.5 border border-border/70 text-xs font-semibold rounded-lg text-foreground bg-background hover:bg-muted disabled:opacity-40 transition-colors"
        >
          <PrevIcon className="h-3.5 w-3.5" />
          <span>{isEn ? "Previous" : "السابق"}</span>
        </button>

        <span className="text-xs font-medium text-muted-foreground">
          {isEn ? "Page " : "صفحة "}
          <span className="font-mono tabular-nums text-primary font-semibold">{currentPage}</span>
          {isEn ? " of " : " من "}
          <span className="font-mono tabular-nums font-semibold">{Math.max(1, totalPages)}</span>
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center gap-1 px-3 py-1.5 border border-border/70 text-xs font-semibold rounded-lg text-foreground bg-background hover:bg-muted disabled:opacity-40 transition-colors"
        >
          <span>{isEn ? "Next" : "التالي"}</span>
          <NextIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground font-medium">
            {isEn ? (
              <>
                Showing <span className="font-mono font-bold text-foreground">{startIndex + 1}</span> to{" "}
                <span className="font-mono font-bold text-foreground">{displayedEnd}</span> of{" "}
                <span className="font-mono font-bold text-foreground">{displayedTotal}</span> products
              </>
            ) : (
              <>
                عرض <span className="font-mono font-bold text-foreground">{startIndex + 1}</span> إلى{" "}
                <span className="font-mono font-bold text-foreground">{displayedEnd}</span> من{" "}
                <span className="font-mono font-bold text-foreground">{displayedTotal}</span> منتج
              </>
            )}
          </p>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-2.5 py-1 border border-border/70 bg-background text-foreground rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
          >
            <option value={10}>{isEn ? "10 per page" : "10 لكل صفحة"}</option>
            <option value={25}>{isEn ? "25 per page" : "25 لكل صفحة"}</option>
            <option value={50}>{isEn ? "50 per page" : "50 لكل صفحة"}</option>
            <option value={100}>{isEn ? "100 per page" : "100 لكل صفحة"}</option>
          </select>
        </div>

        <nav className="relative z-20 inline-flex rounded-lg shadow-2xs -space-x-px" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-2.5 py-1.5 ${
              isEn ? "rounded-l-lg" : "rounded-r-lg"
            } border border-border/70 bg-background text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors`}
            aria-label={isEn ? "Previous" : "السابق"}
          >
            <PrevIcon className="h-4 w-4" />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`relative inline-flex items-center px-3 py-1.5 border text-xs font-mono tabular-nums font-semibold transition-colors ${
                  currentPage === pageNum
                    ? "z-10 bg-primary/10 border-primary/40 text-primary"
                    : "bg-background border-border/70 text-foreground hover:bg-muted"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-2.5 py-1.5 ${
              isEn ? "rounded-r-lg" : "rounded-l-lg"
            } border border-border/70 bg-background text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors`}
            aria-label={isEn ? "Next" : "التالي"}
          >
            <NextIcon className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </div>
  );
};

export default ProductsPagination;
