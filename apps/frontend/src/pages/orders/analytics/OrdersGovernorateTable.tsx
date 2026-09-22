import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPinIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { Skeleton } from "../../../components/ui/skeleton";
import { GovernorateDetail } from "./types";

interface OrdersGovernorateTableProps {
  loading: boolean;
  governorates: GovernorateDetail[];
  formatPrice: (amount: number) => string;
}

export const OrdersGovernorateTable: React.FC<OrdersGovernorateTableProps> = ({
  loading,
  governorates,
  formatPrice,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"orders" | "delivery" | "revenue">("orders");

  const filteredAndSortedGovs = useMemo(() => {
    let result = [...governorates];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }
    if (sortBy === "orders") {
      result.sort((a, b) => b.ordersCount - a.ordersCount);
    } else if (sortBy === "delivery") {
      result.sort((a, b) => b.deliveryRate - a.deliveryRate);
    } else if (sortBy === "revenue") {
      result.sort((a, b) => b.revenue - a.revenue);
    }
    return result;
  }, [governorates, search, sortBy]);

  const handleRowClick = (govName: string) => {
    navigate(`/orders?governorate=${encodeURIComponent(govName)}`);
  };

  return (
    <div className="border-b border-zinc-200/80 dark:border-white/[0.08] p-3 sm:p-4 bg-white dark:bg-[#0a0a0c]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2.5 border-b border-zinc-150 dark:border-white/[0.06] gap-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <MapPinIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                التحليل الجغرافي وتوزيع المحافظات
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 tabular-nums">
                {governorates.length} محافظة
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">انقر على أي محافظة لعرض وتصفية طلباتها مباشرة</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Switcher */}
          <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200/50 dark:border-white/[0.05] text-[11px]">
            <button
              type="button"
              onClick={() => setSortBy("orders")}
              className={`px-2 py-0.5 rounded-md transition-all font-medium ${
                sortBy === "orders"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              الطلبات
            </button>
            <button
              type="button"
              onClick={() => setSortBy("delivery")}
              className={`px-2 py-0.5 rounded-md transition-all font-medium ${
                sortBy === "delivery"
                  ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              نسبة التسليم
            </button>
            <button
              type="button"
              onClick={() => setSortBy("revenue")}
              className={`px-2 py-0.5 rounded-md transition-all font-medium ${
                sortBy === "revenue"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              المبيعات
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-48">
            <MagnifyingGlassIcon className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="بحث في المحافظات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-7 pl-6 py-1 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-md text-zinc-900 dark:text-white placeholder-zinc-400 focus-visible:ring-2 focus-visible:ring-primary outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-8 w-full rounded" />
          ))}
        </div>
      ) : filteredAndSortedGovs.length === 0 ? (
        <p className="text-center py-8 text-xs text-zinc-400">لا توجد نتائج مطابقة للبحث</p>
      ) : (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-xs min-w-[680px]">
            <thead>
              <tr className="border-b border-zinc-150 dark:border-white/[0.06] text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/40 text-[11px]">
                <th className="py-2 px-3 text-start font-semibold">المحافظة</th>
                <th className="py-2 px-3 text-start font-semibold">إجمالي الطلبات</th>
                <th className="py-2 px-3 text-start font-semibold">الحصة %</th>
                <th className="py-2 px-3 text-start font-semibold">تم التسليم</th>
                <th className="py-2 px-3 text-start font-semibold">نسبة التسليم</th>
                <th className="py-2 px-3 text-start font-semibold">المرتجع</th>
                <th className="py-2 px-3 text-start font-semibold">الملغي</th>
                <th className="py-2 px-3 text-start font-semibold">إجمالي المبيعات</th>
                <th className="py-2 px-2 text-center font-semibold w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 dark:divide-white/[0.04]">
              {filteredAndSortedGovs.map((gov) => (
                <tr
                  key={gov.name}
                  onClick={() => handleRowClick(gov.name)}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                  title={`انقر لتصفية طلبات محافظة ${gov.name}`}
                >
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <MapPinIcon className="h-3 w-3 text-zinc-400 group-hover:text-rose-500 transition-colors shrink-0" />
                    <span className="truncate">{gov.name}</span>
                  </td>
                  <td className="py-2 px-3 tabular-nums font-bold text-zinc-900 dark:text-white">
                    {gov.ordersCount.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 tabular-nums text-zinc-500">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold">
                      {gov.sharePct}%
                    </span>
                  </td>
                  <td className="py-2 px-3 tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {gov.deliveredCount}
                  </td>
                  <td className="py-2 px-3 min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`tabular-nums font-bold text-[11px] shrink-0 ${
                          gov.deliveryRate >= 70
                            ? "text-emerald-600 dark:text-emerald-400"
                            : gov.deliveryRate >= 45
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {gov.deliveryRate}%
                      </span>
                      <div className="h-1 flex-1 bg-zinc-200/60 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            gov.deliveryRate >= 70
                              ? "bg-emerald-500"
                              : gov.deliveryRate >= 45
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, gov.deliveryRate)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 tabular-nums font-medium text-amber-600">
                    {gov.returnedCount}
                  </td>
                  <td className="py-2 px-3 tabular-nums font-medium text-rose-600">
                    {gov.cancelledCount}
                  </td>
                  <td className="py-2 px-3 tabular-nums font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                    {formatPrice(gov.revenue)}
                  </td>
                  <td className="py-2 px-2 text-center text-zinc-300 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                    <ArrowTopRightOnSquareIcon className="h-3 w-3 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrdersGovernorateTable;
