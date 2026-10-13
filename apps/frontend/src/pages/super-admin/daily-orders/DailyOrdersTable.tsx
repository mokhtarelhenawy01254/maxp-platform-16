import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowUpDown,
  Download,
  ExternalLink,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CompanyOrderStats } from "./types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DailyOrdersTableProps {
  companies: CompanyOrderStats[];
  periodLabel: string;
}

type SortField = "orders" | "gmv" | "aov" | "name" | "recent";
type FilterMode = "all" | "has_orders" | "zero_orders";

const PAGE_SIZE = 25;

export const DailyOrdersTable: React.FC<DailyOrdersTableProps> = ({
  companies,
  periodLabel,
}) => {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortField, setSortField] = useState<SortField>("orders");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filtered = useMemo(() => {
    let list = [...companies];

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.slug && c.slug.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }

    // Filter Mode
    if (filterMode === "has_orders") {
      list = list.filter((c) => c.ordersCount > 0);
    } else if (filterMode === "zero_orders") {
      list = list.filter((c) => c.ordersCount === 0);
    }

    // Sort
    list.sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case "orders":
          diff = a.ordersCount - b.ordersCount;
          break;
        case "gmv":
          diff = a.ordersGMV - b.ordersGMV;
          break;
        case "aov":
          diff = a.avgOrderValue - b.avgOrderValue;
          break;
        case "name":
          return sortOrder === "asc"
            ? a.name.localeCompare(b.name, "ar")
            : b.name.localeCompare(a.name, "ar");
        case "recent": {
          const tA = a.latestOrderAt ? new Date(a.latestOrderAt).getTime() : 0;
          const tB = b.latestOrderAt ? new Date(b.latestOrderAt).getTime() : 0;
          diff = tA - tB;
          break;
        }
      }
      return sortOrder === "asc" ? diff : -diff;
    });

    return list;
  }, [companies, search, filterMode, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCompanies = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "اسم الشركة",
      "السلاج",
      "الهاتف",
      "البريد الإلكتروني",
      "إجمالي الطلبات",
      "إجمالي المبيعات (ج.م)",
      "متوسط الطلب (ج.م)",
      "طلبات معلقة",
      "طلبات مؤكدة",
      "قيد الشحن",
      "تم التسليم",
      "ملغية/مرتجعة",
      "تاريخ آخر طلب",
    ];

    const rows = filtered.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.slug || ""}"`,
      `"${c.phone || ""}"`,
      `"${c.email || ""}"`,
      c.ordersCount,
      c.ordersGMV,
      c.avgOrderValue,
      c.statusBreakdown.pending,
      c.statusBreakdown.confirmed,
      c.statusBreakdown.inDelivery,
      c.statusBreakdown.delivered,
      c.statusBreakdown.cancelled,
      c.latestOrderAt ? new Date(c.latestOrderAt).toLocaleString("ar-EG") : "—",
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `maxp-company-orders-${periodLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRecency = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-3.5 sm:p-4 border-b border-border/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Store className="size-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              سجل أداء مبيعات الشركات
            </h3>
            <p className="text-[11px] text-muted-foreground">
              إجمالي {filtered.length} شركة معروضة ({companies.filter((c) => c.ordersCount > 0).length} شركة لديها مبيعات)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute right-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="بحث بالاسم أو الهاتف..."
              className="h-8 pr-8 text-xs bg-background/50"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center rounded-lg border border-border/50 bg-background/50 p-0.5 text-xs">
            <button
              onClick={() => {
                setFilterMode("all");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                filterMode === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              الكل ({companies.length})
            </button>
            <button
              onClick={() => {
                setFilterMode("has_orders");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                filterMode === "has_orders"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              لديها طلبات ({companies.filter((c) => c.ordersCount > 0).length})
            </button>
            <button
              onClick={() => {
                setFilterMode("zero_orders");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                filterMode === "zero_orders"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              بدون طلبات ({companies.filter((c) => c.ordersCount === 0).length})
            </button>
          </div>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 gap-1.5 text-xs bg-background/50"
          >
            <Download className="size-3.5" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-muted/40 text-muted-foreground border-b border-border/40 font-medium">
            <tr>
              <th className="py-2.5 px-3.5">الشركة</th>
              <th
                onClick={() => toggleSort("orders")}
                className="py-2.5 px-3 cursor-pointer hover:text-foreground select-none"
              >
                <div className="flex items-center gap-1">
                  <span>الطلبات</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort("gmv")}
                className="py-2.5 px-3 cursor-pointer hover:text-foreground select-none"
              >
                <div className="flex items-center gap-1">
                  <span>إجمالي المبيعات</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort("aov")}
                className="py-2.5 px-3 cursor-pointer hover:text-foreground select-none hidden sm:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>متوسط الطلب</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 hidden md:table-cell">تفصيل الحالات</th>
              <th
                onClick={() => toggleSort("recent")}
                className="py-2.5 px-3 cursor-pointer hover:text-foreground select-none hidden lg:table-cell"
              >
                <div className="flex items-center gap-1">
                  <span>آخر طلب</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {pagedCompanies.length > 0 ? (
              pagedCompanies.map((c) => {
                const hasOrders = c.ordersCount > 0;
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Company info */}
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-md bg-muted text-[11px] font-bold text-foreground shrink-0 border border-border/40">
                          {c.name.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate max-w-[180px] sm:max-w-[240px]">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {c.slug && <span>@{c.slug}</span>}
                            {c.phone && <span>• {c.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Orders count */}
                    <td className="py-2.5 px-3 tabular-nums font-bold text-sm">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md",
                          hasOrders
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground/60"
                        )}
                      >
                        {c.ordersCount.toLocaleString()}
                      </span>
                    </td>

                    {/* GMV */}
                    <td className="py-2.5 px-3 tabular-nums font-semibold text-foreground">
                      {hasOrders ? (
                        <span>
                          {c.ordersGMV.toLocaleString()}{" "}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ج.م
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">0 ج.م</span>
                      )}
                    </td>

                    {/* AOV */}
                    <td className="py-2.5 px-3 tabular-nums text-muted-foreground hidden sm:table-cell">
                      {hasOrders ? `${c.avgOrderValue.toLocaleString()} ج.م` : "—"}
                    </td>

                    {/* Status Breakdown */}
                    <td className="py-2.5 px-3 hidden md:table-cell">
                      {hasOrders ? (
                        <div className="flex flex-wrap items-center gap-1 text-[10px] tabular-nums">
                          {c.statusBreakdown.pending > 0 && (
                            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                              {c.statusBreakdown.pending} معلق
                            </span>
                          )}
                          {c.statusBreakdown.confirmed > 0 && (
                            <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              {c.statusBreakdown.confirmed} مؤكد
                            </span>
                          )}
                          {c.statusBreakdown.inDelivery > 0 && (
                            <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">
                              {c.statusBreakdown.inDelivery} شحن
                            </span>
                          )}
                          {c.statusBreakdown.delivered > 0 && (
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                              {c.statusBreakdown.delivered} تم
                            </span>
                          )}
                          {c.statusBreakdown.cancelled > 0 && (
                            <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded">
                              {c.statusBreakdown.cancelled} ملغي
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-[11px]">
                          لا توجد حركات
                        </span>
                      )}
                    </td>

                    {/* Recency */}
                    <td className="py-2.5 px-3 tabular-nums text-muted-foreground hidden lg:table-cell text-[11px]">
                      {formatRecency(c.latestOrderAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <Link
                        to={`/super-admin/companies/${c.id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                      >
                        <span>التفاصيل</span>
                        <ExternalLink className="size-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  لا توجد شركات مطابقة لمعايير البحث والفلترة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            الصفحة {currentPage} من {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
