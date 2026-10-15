import React, { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  showPagination?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({
  data = [],
  columns = [],
  searchable = true,
  searchPlaceholder = "بحث في البيانات...",
  pageSize = 10,
  showPagination = true,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((column) => {
        const value = row[column.key];
        return value?.toString().toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue > bValue ? 1 : -1;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === "asc") {
          return { key, direction: "desc" };
        }
        return null; // toggle off
      }
      return { key, direction: "asc" };
    });
  };

  const renderSortIndicator = (columnKey: string) => {
    if (sortConfig?.key !== columnKey) {
      return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-primary" />
    );
  };

  return (
    <div className="w-full space-y-3" dir="rtl">
      {/* Search Bar */}
      {searchable && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-background border border-border/70 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
            إجمالي: {filteredData.length} سجل
          </span>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-border/70 bg-muted/30">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-[11px] font-semibold text-muted-foreground tracking-wider ${
                    column.sortable
                      ? "cursor-pointer hover:bg-muted/50 select-none group transition-colors"
                      : ""
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{column.label}</span>
                    {column.sortable && renderSortIndicator(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Inbox className="w-7 h-7 opacity-25" />
                    <p className="text-xs">لا توجد بيانات متاحة لعرضها</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-muted/20 transition-colors"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3 whitespace-nowrap text-foreground font-normal"
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1 text-xs text-muted-foreground">
          <div className="font-mono tabular-nums text-[11px]">
            عرض {((currentPage - 1) * pageSize) + 1} إلى{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} من{" "}
            {sortedData.length} نتيجة
          </div>

          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-border/70 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
              aria-label="الصفحة السابقة"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  return (
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1
                  );
                })
                .map((page, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const hasGap = prevPage && page - prevPage > 1;
                  return (
                    <React.Fragment key={page}>
                      {hasGap && (
                        <span className="px-1 text-muted-foreground/60 select-none">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[28px] h-7 px-2 text-xs font-medium rounded-lg border transition-colors ${
                          currentPage === page
                            ? "bg-foreground text-background border-foreground shadow-sm"
                            : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-border/70 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
              aria-label="الصفحة التالية"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
