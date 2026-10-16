import React, { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  X,
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
        return null;
      }
      return { key, direction: "asc" };
    });
  };

  const renderSortIndicator = (columnKey: string) => {
    if (sortConfig?.key !== columnKey) {
      return (
        <ChevronsUpDown className="size-3.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
      );
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="size-3.5 text-primary" />
    ) : (
      <ChevronDown className="size-3.5 text-primary" />
    );
  };

  return (
    <div className="w-full space-y-3" dir="rtl">
      {/* Search Bar */}
      {searchable && (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative w-full max-w-xs">
            <Search className="absolute right-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-full rounded-xl border border-border/70 bg-card pr-9 pl-8 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary/20 shadow-2xs transition-all"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground active:scale-95 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            إجمالي: {filteredData.length.toLocaleString()} سجل
          </span>
        </div>
      )}

      {/* Table Container Single-Surface */}
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-2xs">
        <table className="w-full border-collapse text-right">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-xs font-semibold tracking-tight text-muted-foreground ${
                    column.sortable
                      ? "group cursor-pointer select-none transition-colors hover:bg-muted/50"
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
                    <Inbox className="size-8 opacity-25" />
                    <p className="text-xs font-medium">لا توجد بيانات متاحة لعرضها</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="transition-colors hover:bg-muted/20"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3 whitespace-nowrap font-normal text-foreground"
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
          <div className="font-mono text-[11px] tabular-nums">
            عرض {((currentPage - 1) * pageSize) + 1} إلى{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} من{" "}
            {sortedData.length.toLocaleString()} نتيجة
          </div>

          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex size-7.5 items-center justify-center rounded-xl border border-border/70 text-foreground transition-all hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shadow-2xs"
              aria-label="الصفحة السابقة"
            >
              <ChevronRight className="size-3.5" />
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
                        <span className="select-none px-1 text-muted-foreground/60">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`h-7.5 min-w-[30px] rounded-xl border px-2 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs ${
                          currentPage === page
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
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
              className="flex size-7.5 items-center justify-center rounded-xl border border-border/70 text-foreground transition-all hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shadow-2xs"
              aria-label="الصفحة التالية"
            >
              <ChevronLeft className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
