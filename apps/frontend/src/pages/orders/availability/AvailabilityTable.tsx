import React from "react";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";
import { useCurrency } from "../../../hooks/useCurrency";
import { AvailabilityRow } from "./availabilityTypes";
import { AvailabilityTableRow } from "./AvailabilityTableRow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "../../../components/ui/pagination";

interface AvailabilityTableProps {
  loading: boolean;
  paginated: AvailabilityRow[];
  filteredLength: number;
  startIndex: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  page: number;
  totalPages: number;
  safePage: number;
  changePage: (newPage: number) => void;
  sortBy: string;
  sortDir: "asc" | "desc";
  changeSort: (field: string) => void;
  savingKey: string | null;
  toggleField: (row: AvailabilityRow, field: "trackInventory" | "isPreOrder", value: boolean) => void;
  savePreOrderDate: (row: AvailabilityRow, dateValue: string) => void;
}

export const AvailabilityTable: React.FC<AvailabilityTableProps> = ({
  loading,
  paginated,
  filteredLength,
  startIndex,
  pageSize,
  setPageSize,
  safePage,
  totalPages,
  changePage,
  sortBy,
  sortDir,
  changeSort,
  savingKey,
  toggleField,
  savePreOrderDate,
}) => {
  const { formatPrice } = useCurrency();

  const sortableHead = (field: string, label: string) => (
    <button
      type="button"
      onClick={() => changeSort(field)}
      className="inline-flex items-center gap-1 w-full justify-center hover:text-foreground transition-colors cursor-pointer"
    >
      <span>{label}</span>
      {sortBy === field ? (
        <span className="text-[10px] font-mono">{sortDir === "asc" ? "▲" : "▼"}</span>
      ) : null}
    </button>
  );

  return (
    <div className="p-0">
      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded-xl h-12 w-full" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="py-16 text-center">
          <ArchiveBoxIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-semibold text-foreground">لا توجد منتجات مطابقة</p>
          <p className="text-xs text-muted-foreground mt-0.5">جرّب تغيير فلاتر البحث أو القسم</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/70 font-medium">
              <tr>
                <th className="px-3 py-3 w-12 text-center text-xs">#</th>
                <th className="px-3 py-3 min-w-[240px]">{sortableHead("name", "المنتج")}</th>
                <th className="px-3 py-3 min-w-[120px]">القسم</th>
                <th className="px-3 py-3 min-w-[100px] text-center">{sortableHead("price", "السعر")}</th>
                <th className="px-3 py-3 min-w-[100px] text-center">{sortableHead("stock", "الكمية")}</th>
                <th className="px-3 py-3 min-w-[130px] text-center">الحالة</th>
                <th className="px-3 py-3 min-w-[130px] text-center">{sortableHead("track", "تتبع المخزون")}</th>
                <th className="px-3 py-3 min-w-[130px] text-center">{sortableHead("preOrder", "الطلب المسبق")}</th>
                <th className="px-3 py-3 min-w-[130px] text-center">تاريخ الطلب</th>
                <th className="px-3 py-3 w-14 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.map((row, index) => (
                <AvailabilityTableRow
                  key={row.id}
                  row={row}
                  index={index}
                  startIndex={startIndex}
                  savingKey={savingKey}
                  toggleField={toggleField}
                  savePreOrderDate={savePreOrderDate}
                  formatPrice={formatPrice}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {paginated.length > 0 && (
        <div className="p-3 sm:p-4 border-t border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono tabular-nums">
            <span>
              عرض {startIndex + 1}–{Math.min(startIndex + pageSize, filteredLength)} من {filteredLength}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v) || 50)}
            >
              <SelectTrigger className="w-20 h-7 text-xs border-border/70 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
            <span>لكل صفحة</span>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    changePage(safePage - 1);
                  }}
                  className={safePage <= 1 ? "pointer-events-none opacity-40 text-xs" : "text-xs"}
                >
                  السابق
                </PaginationLink>
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        changePage(pageNum);
                      }}
                      isActive={pageNum === safePage}
                      className="text-xs font-mono"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    changePage(safePage + 1);
                  }}
                  className={safePage >= totalPages ? "pointer-events-none opacity-40 text-xs" : "text-xs"}
                >
                  التالي
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};
