import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from 'lucide-react';
import React from "react";
;

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
  const displayedEnd = hasActiveFilters
    ? Math.min(startIndex + itemsPerPage, sortedProductsLength)
    : Math.min(startIndex + itemsPerPage, totalItems);
  const displayedTotal = hasActiveFilters ? sortedProductsLength : totalItems;

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50">
      {/* Mobile */}
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronRightIcon className="h-5 w-5" />
          السابق
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          التالي
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            عرض <span className="font-bold">{startIndex + 1}</span> إلى{" "}
            <span className="font-bold">{displayedEnd}</span> من{" "}
            <span className="font-bold">{displayedTotal}</span> منتج
          </p>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
          >
            <option value={10}>10 لكل صفحة</option>
            <option value={25}>25 لكل صفحة</option>
            <option value={50}>50 لكل صفحة</option>
            <option value={100}>100 لكل صفحة</option>
          </select>
        </div>

        <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-2 py-2 rounded-r-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronRightIcon className="h-5 w-5" />
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
                onClick={() => onPageChange(pageNum)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  currentPage === pageNum
                    ? "z-10 bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-2 py-2 rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        </nav>
      </div>
    </div>
  );
};

export default ProductsPagination;
