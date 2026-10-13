import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  XCircleIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { getImageUrl, getPrimaryImageUrl } from "../../utils/imageUrl";
import { useCurrency } from "../../hooks/useCurrency";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "../../components/ui/pagination";

type AvailabilityRow = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  trackInventory: boolean;
  isPreOrder: boolean;
  preOrderDate: string | null;
  categoryName: string;
  image: string | null;
  isActive: boolean;
  isHidden: boolean;
  variantsCount: number;
};

type RawProduct = {
  id: string;
  name?: string;
  sku?: string;
  price?: number | string | null;
  stock?: number | string | null;
  trackInventory?: boolean;
  isPreOrder?: boolean;
  preOrderDate?: string | null;
  mainImage?: string | null;
  images?: unknown;
  category?: unknown;
  productVariants?: unknown[];
  variants?: unknown[];
};

type AvailabilityResponse = {
  success: boolean;
  data: RawProduct[];
  pagination: { total: number; page: number; limit: number; pages: number };
  publishedCount: number;
};

type StockStatus = "in-stock" | "low-stock" | "out-of-stock" | "untracked";

const STOCK_STATUS_META: Record<
  StockStatus,
  { label: string; className: string }
> = {
  "in-stock": { label: "متوفر", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  "low-stock": { label: "مخزون منخفض", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  "out-of-stock": { label: "نفد المخزون", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  untracked: { label: "بدون تتبع", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className ?? ""}`}
    />
  );
}

function parseSafeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatSafeDate(
  value: string | null | undefined,
  locale: string,
): string {
  const date = parseSafeDate(value);
  if (!date) return "";
  return date.toLocaleDateString(locale);
}

function toDateInputValue(value: string | null | undefined): string {
  const date = parseSafeDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const ProductAvailabilityGrid: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [preOrderFilter, setPreOrderFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const limit = 100;
      const response = await apiClient.get<AvailabilityResponse>("/products", {
        params: { page: 1, limit, sortBy: "name", sortOrder: "asc" },
      });
      const data = response.data;
      if (data.success) {
        const total = data.pagination?.total ?? (data.data || []).length;
        const mapped = (data.data || []).map((p) => mapProductRow(p));
        setRows(mapped);
        setTotalItems(total);
      }
    } catch (err) {
      console.error("Error loading availability grid:", err);
      toast.error(t("productAvailability.loadError", "فشل في جلب المنتجات") as string);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const categories = useMemo(() => {
    const names = Array.from(new Set(rows.map((r) => r.categoryName).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare(b, "ar"));
  }, [rows]);

  const getStockStatus = (row: AvailabilityRow): StockStatus => {
    if (!row.trackInventory) return "untracked";
    if (row.stock === 0) return "out-of-stock";
    if (row.stock <= 5) return "low-stock";
    return "in-stock";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.sku.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === "all" || row.categoryName === categoryFilter;
      const matchesPreOrder =
        preOrderFilter === "all" ||
        (preOrderFilter === "on" && row.isPreOrder) ||
        (preOrderFilter === "off" && !row.isPreOrder);
      const matchesTrack =
        trackFilter === "all" ||
        (trackFilter === "on" && row.trackInventory) ||
        (trackFilter === "off" && !row.trackInventory);
      const status = getStockStatus(row);
      const matchesStock =
        stockFilter === "all" || status === stockFilter;
      return (
        matchesSearch &&
        matchesCategory &&
        matchesPreOrder &&
        matchesTrack &&
        matchesStock
      );
    });

    result = result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name, "ar") * dir;
        case "price":
          return (a.price - b.price) * dir;
        case "stock":
          return (a.stock - b.stock) * dir;
        case "preOrder":
          return (Number(a.isPreOrder) - Number(b.isPreOrder)) * dir;
        case "track":
          return (Number(a.trackInventory) - Number(b.trackInventory)) * dir;
        default:
          return 0;
      }
    });
    return result;
  }, [rows, search, categoryFilter, preOrderFilter, trackFilter, stockFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  const stats = useMemo(() => {
    const preOrderOn = rows.filter((r) => r.isPreOrder).length;
    const trackOn = rows.filter((r) => r.trackInventory).length;
    const trackOff = rows.filter((r) => !r.trackInventory).length;
    const outOfStock = rows.filter((r) => getStockStatus(r) === "out-of-stock").length;
    return { preOrderOn, trackOn, trackOff, outOfStock };
  }, [rows]);

  const toggleField = async (
    row: AvailabilityRow,
    field: "trackInventory" | "isPreOrder",
    value: boolean,
  ) => {
    const key = `${row.id}:${field}`;
    setSavingKey(key);
    const previous = { ...row };
    const nextRow = { ...row, [field]: value };
    if (field === "isPreOrder" && value && !row.preOrderDate) {
      const now = new Date();
      nextRow.preOrderDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }
    if (field === "isPreOrder" && !value) {
      nextRow.preOrderDate = null;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? nextRow : r,
      ),
    );
    try {
      const payload: Record<string, unknown> = { [field]: value };
      if (field === "isPreOrder") {
        payload.preOrderDate = nextRow.preOrderDate;
      }
      const res = await apiClient.patch(`products/${row.id}`, payload, {
        timeout: 60000,
      });
      if (res.data?.success === false) {
        throw new Error(res.data?.message || "save failed");
      }
      toast.success(
        field === "trackInventory"
          ? t("productAvailability.trackSaved", "تم تحديث تتبع المخزون") as string
          : t("productAvailability.preOrderSaved", "تم تحديث الطلب المسبق") as string,
      );
    } catch (err) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? previous : r)),
      );
      toast.error(t("productAvailability.saveError", "فشل الحفظ") as string);
    } finally {
      setSavingKey(null);
    }
  };

  const savePreOrderDate = async (row: AvailabilityRow, dateValue: string) => {
    const key = `${row.id}:preOrderDate`;
    setSavingKey(key);
    const previous = { ...row };
    const nextDate = dateValue || null;
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, preOrderDate: nextDate } : r,
      ),
    );
    try {
      const res = await apiClient.patch(`products/${row.id}`, { preOrderDate: nextDate }, {
        timeout: 60000,
      });
      if (res.data?.success === false) {
        throw new Error(res.data?.message || "save failed");
      }
      toast.success(
        t("productAvailability.preOrderDateSaved", "تم تحديث تاريخ الطلب المسبق") as string,
      );
    } catch (err) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? previous : r)),
      );
      toast.error(t("productAvailability.saveError", "فشل الحفظ") as string);
    } finally {
      setSavingKey(null);
    }
  };

  const changeSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const exportCsv = () => {
    const headers = [
      "name",
      "sku",
      "category",
      "price",
      "stock",
      "trackInventory",
      "isPreOrder",
      "preOrderDate",
      "status",
    ];
    const rowsData = filtered.map((row) => [
      row.name,
      row.sku,
      row.categoryName,
      row.price,
      row.stock,
      row.trackInventory ? "yes" : "no",
      row.isPreOrder ? "yes" : "no",
      row.preOrderDate ? formatSafeDate(row.preOrderDate, "en-CA") : "",
      getStockStatus(row),
    ]);
    const csv = [headers, ...rowsData]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products-availability-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const changePage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  const sortableHead = (field: string, label: string) => (
    <button
      type="button"
      onClick={() => changeSort(field)}
      className="inline-flex items-center gap-1 w-full justify-center hover:text-foreground transition-colors"
    >
      {label}
      {sortBy === field ? (
        <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
      ) : null}
    </button>
  );

  const metricCards = [
    {
      title: t("productAvailability.metricTotal", "إجمالي المنتجات"),
      value: totalItems,
      icon: TableCellsIcon,
      gradient: "from-indigo-500/20 to-indigo-500/5 text-indigo-600",
    },
    {
      title: t("productAvailability.metricPreOrder", "طلب مسبق مفعل"),
      value: stats.preOrderOn,
      icon: ShoppingBagIcon,
      gradient: "from-purple-500/20 to-purple-500/5 text-purple-600",
    },
    {
      title: t("productAvailability.metricTracking", "تتبع مخزون مفعل"),
      value: stats.trackOn,
      icon: ShieldCheckIcon,
      gradient: "from-emerald-500/20 to-emerald-500/5 text-emerald-600",
    },
    {
      title: t("productAvailability.metricOut", "نفد المخزون"),
      value: stats.outOfStock,
      icon: XCircleIcon,
      gradient: "from-red-500/20 to-red-500/5 text-red-600",
    },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-2xl">
            {t("productAvailability.title", "المخزون المتاح")}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            {t(
              "productAvailability.subtitle",
              "كل منتجات المتجر في جدول واحد: تتبع المخزون، الطلب المسبق، والكميات المتاحة",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5 text-xs shadow-2xs active:scale-[0.98]">
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            {t("productAvailability.export", "تصدير CSV")}
          </Button>
          <Button variant="outline" size="sm" onClick={loadAll} className="gap-1.5 text-xs shadow-2xs active:scale-[0.98]">
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("productAvailability.refresh", "تحديث")}
          </Button>
        </div>
      </div>

      {/* Telemetry Strip - Linear Single Chassis */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:sm:divide-x-reverse">
          {metricCards.map((card, index) => (
            <div key={index} className="p-3 sm:p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                <span>{card.title}</span>
                <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>
              <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
                {loading ? "..." : (typeof card.value === "number" ? card.value.toLocaleString() : card.value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={t("productAvailability.search", "بحث بالاسم أو SKU...") as string}
                aria-label={t("productAvailability.search", "بحث بالاسم أو SKU...") as string}
                className="pr-9 pl-3 h-9 text-xs sm:text-sm w-full xl:w-64 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v ?? "all"); setPage(1); }}>
                  <SelectTrigger id="availability-category-filter" className="h-8 w-36 text-xs border-gray-200 dark:border-gray-700" aria-label={t("productAvailability.filterCategory", "القسم")}>
                    <SelectValue placeholder={t("productAvailability.allCategories", "كل الأقسام")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("productAvailability.allCategories", "كل الأقسام")}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <Select value={preOrderFilter} onValueChange={(v) => { setPreOrderFilter(v ?? "all"); setPage(1); }}>
                  <SelectTrigger id="availability-preorder-filter" className="h-8 w-32 text-xs border-gray-200 dark:border-gray-700" aria-label={t("productAvailability.filterPreOrder", "الطلب المسبق")}>
                    <SelectValue placeholder={t("productAvailability.allPreOrder", "الطلب المسبق")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("productAvailability.allPreOrder", "الطلب المسبق: الكل")}</SelectItem>
                    <SelectItem value="on">{t("productAvailability.preOrderOn", "مفعل")}</SelectItem>
                    <SelectItem value="off">{t("productAvailability.preOrderOff", "معطل")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <Select value={trackFilter} onValueChange={(v) => { setTrackFilter(v ?? "all"); setPage(1); }}>
                  <SelectTrigger id="availability-tracking-filter" className="h-8 w-32 text-xs border-gray-200 dark:border-gray-700" aria-label={t("productAvailability.filterTracking", "تتبع المخزون")}>
                    <SelectValue placeholder={t("productAvailability.allTracking", "تتبع المخزون")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("productAvailability.allTracking", "تتبع: الكل")}</SelectItem>
                    <SelectItem value="on">{t("productAvailability.trackingOn", "مفعل")}</SelectItem>
                    <SelectItem value="off">{t("productAvailability.trackingOff", "معطل")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v ?? "all"); setPage(1); }}>
                  <SelectTrigger id="availability-stock-filter" className="h-8 w-32 text-xs border-gray-200 dark:border-gray-700" aria-label={t("productAvailability.filterStock", "حالة المخزون")}>
                    <SelectValue placeholder={t("productAvailability.allStock", "حالة المخزون")} />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("productAvailability.allStock", "حالة المخزون")}</SelectItem>
                      <SelectItem value="in-stock">{STOCK_STATUS_META["in-stock"].label}</SelectItem>
                      <SelectItem value="low-stock">{STOCK_STATUS_META["low-stock"].label}</SelectItem>
                      <SelectItem value="out-of-stock">{STOCK_STATUS_META["out-of-stock"].label}</SelectItem>
                      <SelectItem value="untracked">{STOCK_STATUS_META.untracked.label}</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-0">
          <ErrorBoundary>
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-16 text-center">
              <ArchiveBoxIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                {t("productAvailability.empty", "لا توجد منتجات مطابقة")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="bg-gray-100 dark:bg-gray-800">
                      <TableHead className="w-12 text-center text-xs text-gray-500">
                        {t("productAvailability.rowNo", "#")}
                      </TableHead>
                      <TableHead className="min-w-[240px]">{sortableHead("name", t("productAvailability.colProduct", "المنتج"))}</TableHead>
                      <TableHead className="min-w-[120px]">{t("productAvailability.colCategory", "القسم")}</TableHead>
                      <TableHead className="min-w-[100px] text-center">{sortableHead("price", t("productAvailability.colPrice", "السعر"))}</TableHead>
                      <TableHead className="min-w-[100px] text-center">{sortableHead("stock", t("productAvailability.colStock", "الكمية"))}</TableHead>
                      <TableHead className="min-w-[130px] text-center">{t("productAvailability.colStatus", "الحالة")}</TableHead>
                      <TableHead className="min-w-[140px] text-center">{sortableHead("track", t("productAvailability.colTracking", "تتبع المخزون"))}</TableHead>
                      <TableHead className="min-w-[140px] text-center">{sortableHead("preOrder", t("productAvailability.colPreOrder", "الطلب المسبق"))}</TableHead>
                      <TableHead className="min-w-[130px] text-center">{t("productAvailability.colPreOrderDate", "تاريخ الطلب")}</TableHead>
                      <TableHead className="w-16 text-center">{t("productAvailability.colActions", "")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((row, index) => {
                      const status = STOCK_STATUS_META[getStockStatus(row)];
                      const imageUrl = row.image ? getImageUrl(row.image) : null;
                      const trackSaving = savingKey === `${row.id}:trackInventory`;
                      const preOrderSaving = savingKey === `${row.id}:isPreOrder`;
                      const preOrderDateSaving = savingKey === `${row.id}:preOrderDate`;
                      return (
                        <TableRow key={row.id} className={index % 2 === 1 ? "bg-gray-50 dark:bg-gray-800/50" : ""}>
                          <TableCell className="text-center text-xs text-gray-400 font-mono">
                            {startIndex + index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={row.name}
                                  className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                  <ArchiveBoxIcon className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <Link
                                  to={`/products/${row.id}/edit`}
                                  className="text-sm font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                  {row.name}
                                </Link>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {row.sku || "—"}
                                  {row.variantsCount > 0
                                    ? ` • ${row.variantsCount} ${t("productAvailability.variants", "خيار")}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {row.categoryName || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums">
                            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                              {formatPrice(row.price)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums">
                            <span className={`text-xs sm:text-sm font-bold ${row.stock === 0 ? "text-rose-600 dark:text-rose-400" : row.stock <= 5 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>
                              {row.stock}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${row.stock === 0 ? "bg-rose-500" : row.stock <= 5 ? "bg-amber-500" : "bg-emerald-500"}`} />
                              {status.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Switch
                                size="sm"
                                checked={row.trackInventory}
                                disabled={trackSaving}
                                onCheckedChange={(value) => toggleField(row, "trackInventory", Boolean(value))}
                              />
                              <span className={`text-[11px] font-semibold ${row.trackInventory ? "text-emerald-600" : "text-gray-400"}`}>
                                {row.trackInventory
                                  ? t("productAvailability.trackingOn", "مفعل")
                                  : t("productAvailability.trackingOff", "معطل")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Switch
                                size="sm"
                                checked={row.isPreOrder}
                                disabled={preOrderSaving}
                                onCheckedChange={(value) => toggleField(row, "isPreOrder", Boolean(value))}
                              />
                              <span className={`text-[11px] font-semibold ${row.isPreOrder ? "text-purple-600" : "text-gray-400"}`}>
                                {row.isPreOrder
                                  ? t("productAvailability.preOrderOn", "مفعل")
                                  : t("productAvailability.preOrderOff", "معطل")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {row.isPreOrder ? (
                              <div className="flex flex-col items-center gap-1">
                                <input
                                  type="date"
                                  value={toDateInputValue(row.preOrderDate)}
                                  disabled={preOrderDateSaving}
                                  onChange={(event) => savePreOrderDate(row, event.target.value)}
                                  aria-label={t("productAvailability.colPreOrderDate", "تاريخ الطلب") as string}
                                  className="h-8 w-[130px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-xs text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                                />
                                {row.preOrderDate && (
                                  <span className="text-[10px] text-gray-400">
                                    {formatSafeDate(row.preOrderDate, "ar-EG")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Link
                              to={`/products/${row.id}/edit`}
                              className="inline-flex p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                              title={t("productAvailability.edit", "تعديل المنتج") as string}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {paginated.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    {t("productAvailability.showing", "عرض {{start}}-{{end}} من {{total}}").replace("{{start}}", String(startIndex + 1)).replace("{{end}}", String(Math.min(startIndex + pageSize, filtered.length))).replace("{{total}}", String(filtered.length))}
                  </span>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v) || 50); setPage(1); }}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>{t("productAvailability.perPage", "لكل صفحة")}</span>
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          changePage(safePage - 1);
                        }}
                        className={safePage <= 1 ? "pointer-events-none opacity-40" : ""}
                      >
                        {t("productAvailability.prev", "السابق")}
                      </PaginationLink>
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const pageNumber = i + 1;
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            onClick={(event) => {
                              event.preventDefault();
                              changePage(pageNumber);
                            }}
                            isActive={pageNumber === safePage}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          changePage(safePage + 1);
                        }}
                        className={safePage >= totalPages ? "pointer-events-none opacity-40" : ""}
                      >
                        {t("productAvailability.next", "التالي")}
                      </PaginationLink>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
            </ErrorBoundary>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center font-mono">
        <CheckCircleIcon className="inline h-3.5 w-3.5 ml-1" />
        {t(
          "productAvailability.hint",
          "جدول شبيه ببرنامج Excel: عدّل مفاتيح التتبع والطلب المسبق مباشرة من الجدول واحفظ تلقائياً",
        )}
      </p>
    </div>
  );
};

function mapProductRow(p: RawProduct): AvailabilityRow {
  const images = p.images;
  const image = getPrimaryImageUrl(p.mainImage, images) || null;
  let categoryName = "";
  if (typeof p.category === "string") {
    categoryName = p.category;
  } else if (p.category && typeof p.category === "object") {
    categoryName = p.category.name || "";
  }
  const variants = Array.isArray(p.productVariants)
    ? p.productVariants
    : Array.isArray(p.variants)
      ? p.variants
      : [];
  return {
    id: p.id,
    name: p.name || "",
    sku: p.sku || "",
    price: Number(p.price ?? 0),
    stock: Number(p.stock ?? 0),
    trackInventory: p.trackInventory !== false,
    isPreOrder: Boolean(p.isPreOrder),
    preOrderDate: p.preOrderDate || null,
    categoryName,
    image,
    isActive: Boolean(p.isActive),
    isHidden: Boolean(p.isHidden),
    variantsCount: variants.length,
  };
}

export default ProductAvailabilityGrid;