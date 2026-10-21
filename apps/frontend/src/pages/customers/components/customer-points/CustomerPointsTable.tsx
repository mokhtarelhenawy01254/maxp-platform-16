import React from "react";
import { Search, Star, AlertTriangle, ChevronRight, ChevronLeft } from "lucide-react";
import {
  CustomerLoyaltyRecord,
  FilterMode,
  formatPoints,
  toNumber,
} from "./types";

interface CustomerPointsTableProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  paginatedRecords: CustomerLoyaltyRecord[];
  selectedRecordId: string;
  onSelectRecord: (id: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const CustomerPointsTable: React.FC<CustomerPointsTableProps> = ({
  searchQuery,
  onSearchChange,
  filterMode,
  onFilterModeChange,
  paginatedRecords,
  selectedRecordId,
  onSelectRecord,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="space-y-3 lg:col-span-2">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 sm:p-2.5 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="ابحث باسم العميل، إيميل، رقم الهاتف..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 pl-3 pr-9 text-right text-xs sm:text-sm text-gray-900 outline-none focus:bg-white focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all"
          />
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => onFilterModeChange("ALL")}
            className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              filterMode === "ALL"
                ? "bg-white text-gray-950 dark:bg-gray-700 dark:text-white shadow-2xs"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => onFilterModeChange("VIP")}
            className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              filterMode === "VIP"
                ? "bg-white text-gray-950 dark:bg-gray-700 dark:text-white shadow-2xs"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
            }`}
          >
            <Star className="h-3 w-3 text-amber-500" />
            VIP
          </button>
          <button
            type="button"
            onClick={() => onFilterModeChange("AT_RISK")}
            className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              filterMode === "AT_RISK"
                ? "bg-white text-gray-950 dark:bg-gray-700 dark:text-white shadow-2xs"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
            }`}
          >
            <AlertTriangle className="h-3 w-3 text-rose-500" />
            مهدد
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-2xs dark:border-gray-800 dark:bg-gray-900 flex flex-col min-h-[400px]">
        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead className="bg-gray-50/70 dark:bg-gray-800/40 sticky top-0 border-b border-gray-200/80 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">العميل</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">البرنامج</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الرصيد</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">المستوى</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedRecords.map((record) => {
                const isSelected = selectedRecordId === record.id;
                return (
                  <tr
                    key={record.id}
                    onClick={() => onSelectRecord(record.id)}
                    className={`cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800/80 last:border-0 ${
                      isSelected
                        ? "bg-slate-100/90 dark:bg-slate-800/80"
                        : "hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                    }`}
                  >
                    <td className="px-4 py-2.5 text-right">
                      <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                        {record.customer.firstName} {record.customer.lastName}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono tabular-nums" dir="ltr">
                        {record.customer.phone || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-700 dark:text-gray-300">
                      {record.program.nameAr || record.program.name}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold font-mono tabular-nums text-xs sm:text-sm text-gray-900 dark:text-white">
                      {formatPoints(toNumber(record.currentPoints))}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-700 dark:text-gray-300">
                      <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-[11px] font-medium bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        {record.tier?.nameAr || record.tier?.name || "بدون مستوى"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {paginatedRecords.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="p-10 text-center text-sm text-gray-500">
                      لا يوجد عملاء مطابقون للبحث والتصفية.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono tabular-nums">
              صفحة <span className="font-medium">{currentPage}</span> من{" "}
              <span className="font-medium">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded bg-white border border-gray-300 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 hover:bg-gray-50 cursor-pointer"
                aria-label="الصفحة السابقة"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded bg-white border border-gray-300 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 hover:bg-gray-50 cursor-pointer"
                aria-label="الصفحة التالية"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
