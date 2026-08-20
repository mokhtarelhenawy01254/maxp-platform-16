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
  "in-stock": { label: "┘à╪¬┘ê┘ü╪▒", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  "low-stock": { label: "┘à╪«╪▓┘ê┘å ┘à┘å╪«┘ü╪╢", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  "out-of-stock": { label: "┘å┘ü╪» ╪º┘ä┘à╪«╪▓┘ê┘å", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  untracked: { label: "╪¿╪»┘ê┘å ╪¬╪¬╪¿╪╣", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className ?? ""}`}
    />
  );
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
      const all: AvailabilityRow[] = [];
      let currentPage = 1;
      let total = 0;
      const limit = 500;
      do {
        const response = await apiClient.get<AvailabilityResponse>("products", {
          params: { page: currentPage, limit, sortBy: "name", sortOrder: "asc" },
          _skipTransientRetry: true,
        });
        const data = response.data;
        if (data.success) {
          total = data.pagination?.total ?? total;
          const mapped = (data.data || []).map((p) =>
            mapProductRow(p),
          );
          all.push(...mapped);
          currentPage += 1;
        } else {
          break;
        }
      } while (all.length < total);
      setRows(all);
      setTotalItems(total);
    } catch (err) {
      console.error("Error loading availability grid:", err);
      toast.error(t("productAvailability.loadError", "┘ü╪┤┘ä ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä┘à┘å╪¬╪¼╪º╪¬") as string);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, [field]: value } : r,
      ),
    );
    try {
      const payload: Record<string, unknown> = { [field]: value };
      if (field === "isPreOrder" && !value) {
        payload.preOrderDate = null;
      }
      const res = await apiClient.patch(`products/${row.id}`, payload, {
        timeout: 60000,
      });
      if (res.data?.success === false) {
        throw new Error(res.data?.message || "save failed");
      }
      toast.success(
        field === "trackInventory"
          ? t("productAvailability.trackSaved", "╪¬┘à ╪¬╪¡╪»┘è╪½ ╪¬╪¬╪¿╪╣ ╪º┘ä┘à╪«╪▓┘ê┘å") as string
          : t("productAvailability.preOrderSaved", "╪¬┘à ╪¬╪¡╪»┘è╪½ ╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘à╪│╪¿┘é") as string,
      );
    } catch (err) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? previous : r)),
      );
      toast.error(t("productAvailability.saveError", "┘ü╪┤┘ä ╪º┘ä╪¡┘ü╪╕") as string);
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
      row.preOrderDate ? new Date(row.preOrderDate).toLocaleDateString("en-CA") : "",
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
        <span className="text-[10px]">{sortDir === "asc" ? "Γû▓" : "Γû╝"}</span>
      ) : null}
    </button>
  );

  const metricCards = [
    {
      title: t("productAvailability.metricTotal", "╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘à┘å╪¬╪¼╪º╪¬"),
      value: totalItems,
      icon: TableCellsIcon,
      gradient: "from-indigo-500/20 to-indigo-500/5 text-indigo-600",
    },
    {
      title: t("productAvailability.metricPreOrder", "╪╖┘ä╪¿ ┘à╪│╪¿┘é ┘à┘ü╪╣┘ä"),
      value: stats.preOrderOn,
      icon: ShoppingBagIcon,
      gradient: "from-purple-500/20 to-purple-500/5 text-purple-600",
    },
    {
      title: t("productAvailability.metricTracking", "╪¬╪¬╪¿╪╣ ┘à╪«╪▓┘ê┘å ┘à┘ü╪╣┘ä"),
      value: stats.trackOn,
      icon: ShieldCheckIcon,
      gradient: "from-emerald-500/20 to-emerald-500/5 text-emerald-600",
    },
    {
      title: t("productAvailability.metricOut", "┘å┘ü╪» ╪º┘ä┘à╪«╪▓┘ê┘å"),
      value: stats.outOfStock,
      icon: XCircleIcon,
      gradient: "from-red-500/20 to-red-500/5 text-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TableCellsIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              {t("productAvailability.title", "┘à╪╡┘ü┘ê┘ü╪⌐ ╪¬┘ê┘ü╪▒ ╪º┘ä┘à┘å╪¬╪¼╪º╪¬")}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t(
                "productAvailability.subtitle",
                "┘â┘ä ┘à┘å╪¬╪¼╪º╪¬ ╪º┘ä┘à╪¬╪¼╪▒ ┘ü┘è ╪¼╪»┘ê┘ä ┘ê╪º╪¡╪»: ╪¬╪¬╪¿╪╣ ╪º┘ä┘à╪«╪▓┘ê┘å╪î ╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘à╪│╪¿┘é╪î ┘ê╪º┘ä┘â┘à┘è╪º╪¬ ╪º┘ä┘à╪¬╪º╪¡╪⌐",
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={exportCsv} className="gap-2">
              <ArrowDownTrayIcon className="h-4 w-4" />
              {t("productAvailability.export", "╪¬╪╡╪»┘è╪▒ Excel / CSV")}
            </Button>
            <Button variant="outline" onClick={loadAll} className="gap-2">
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("productAvailability.refresh", "╪¬╪¡╪»┘è╪½")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metricCards.map((card, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm overflow-hidden relative"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
              <div className="relative flex items-center gap-4">
                <div className="rounded-xl bg-white/80 dark:bg-gray-900/60 p-3">
                  <card.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? "..." : card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("productAvailability.search", "╪¿╪¡╪½ ╪¿╪º┘ä╪º╪│┘à ╪ú┘ê SKU...") as string}
                  className="pl-9 w-full xl:w-60"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <FunnelIcon className="h-4 w-4 text-gray-400" />
                  <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v ?? "all"); setPage(1); }}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t("productAvailability.allCategories", "┘â┘ä ╪º┘ä╪ú┘é╪│╪º┘à")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("productAvailability.allCategories", "┘â┘ä ╪º┘ä╪ú┘é╪│╪º┘à")}</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Select value={preOrderFilter} onValueChange={(v) => { setPreOrderFilter(v ?? "all"); setPage(1); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t("productAvailability.allPreOrder", "╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘à╪│╪¿┘é")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("productAvailability.allPreOrder", "╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘à╪│╪¿┘é")}</SelectItem>
                    <SelectItem value="on">{t("productAvailability.preOrderOn", "┘à┘ü╪╣┘ä")}</SelectItem>
                    <SelectItem value="off">{t("productAvailability.preOrderOff", "┘à╪╣╪╖┘ä")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={trackFilter} onValueChange={(v) => { setTrackFilter(v ?? "all"); setPage(1); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t("productAvailability.allTracking", "╪¬╪¬╪¿╪╣ ╪º┘ä┘à╪«╪▓┘ê┘å")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("productAvailability.allTracking", "╪¬╪¬╪¿╪╣ ╪º┘ä┘à╪«╪▓┘ê┘å")}</SelectItem>
                    <SelectItem value="on">{t("productAvailability.trackingOn", "┘à┘ü╪╣┘ä")}</SelectItem>
                    <SelectItem value="off">{t("productAvailability.trackingOff", "┘à╪╣╪╖┘ä")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v ?? "all"); setPage(1); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t("productAvailability.allStock", "╪¡╪º┘ä╪⌐ ╪º┘ä┘à╪«╪▓┘ê┘å")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("productAvailability.allStock", "╪¡╪º┘ä╪⌐ ╪º┘ä┘à╪«╪▓┘ê┘å")}</SelectItem>
                    <SelectItem value="in-stock">{STOCK_STATUS_META["in-stock"].label}</SelectItem>
                    <SelectItem value="low-stock">{STOCK_STATUS_META["low-stock"].label}</SelectItem>
                    <SelectItem value="out-of-stock">{STOCK_STATUS_META["out-of-stock"].label}</SelectItem>
                    <SelectItem value="untracked">{STOCK_STATUS_META.untracked.label}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-4">
            {loading ? (
              <div className="space-y-3">
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
                  {t("productAvailability.empty", "┘ä╪º ╪¬┘ê╪¼╪» ┘à┘å╪¬╪¼╪º╪¬ ┘à╪╖╪º╪¿┘é╪⌐")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="bg-gray-100 dark:bg-gray-800">
                      <TableHead className="w-12 text-center text-xs text-gray-500">
                        {t("productAvailability.rowNo", "#")}
                      </TableHead>
                      <TableHead className="min-w-[240px]">{sortableHead("name", t("productAvailability.colProduct", "╪º┘ä┘à┘å╪¬╪¼"))}</TableHead>
                      <TableHead className="min-w-[120px]">{t("productAvailability.colCategory", "╪º┘ä┘é╪│┘à")}</TableHead>
                      <TableHead className="min-w-[100px] text-center">{sortableHead("price", t("productAvailability.colPrice", "╪º┘ä╪│╪╣╪▒"))}</TableHead>
                      <TableHead className="min-w-[100px] text-center">{sortableHead("stock", t("productAvailability.colStock", "╪º┘ä┘â┘à┘è╪⌐"))}</TableHead>
                      <TableHead className="min-w-[130px] text-center">{t("productAvailability.colStatus", "╪º┘ä╪¡╪º┘ä╪⌐")}</TableHead>
                      <TableHead className="min-w-[140px] text-center">{sortableHead("track", t("productAvailability.colTracking", "╪¬╪¬╪¿╪╣ ╪º┘ä┘à╪«╪▓┘ê┘å"))}</TableHead>
                      <TableHead className="min-w-[140px] text-center">{sortableHead("preOrder", t("productAvailability.colPreOrder", "╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘à╪│╪¿┘é"))}</TableHead>
                      <TableHead className="min-w-[130px] text-center">{t("productAvailability.colPreOrderDate", "╪¬╪º╪▒┘è╪« ╪º┘ä╪╖┘ä╪¿")}</TableHead>
                      <TableHead className="w-16 text-center">{t("productAvailability.colActions", "")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((row, index) => {
                      const status = STOCK_STATUS_META[getStockStatus(row)];
                      const imageUrl = row.image ? getImageUrl(row.image) : null;
                      const trackSaving = savingKey === `${row.id}:trackInventory`;
                      const preOrderSaving = savingKey === `${row.id}:isPreOrder`;
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
                                  {row.sku || "ΓÇö"}
                                  {row.variantsCount > 0
                                    ? ` ΓÇó ${row.variantsCount} ${t("productAvailability.variants", "╪«┘è╪º╪▒")}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {row.categoryName || "ΓÇö"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatPrice(row.price)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-bold ${row.stock === 0 ? "text-red-600" : row.stock <= 5 ? "text-yellow-600" : "text-gray-900 dark:text-white"}`}>
                              {row.stock}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>
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
                                  ? t("productAvailability.trackingOn", "┘à┘ü╪╣┘ä")
                                  : t("productAvailability.trackingOff", "┘à╪╣╪╖┘ä")}
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
                                  ? t("productAvailability.preOrderOn", "┘à┘ü╪╣┘ä")
                                  : t("productAvailability.preOrderOff", "┘à╪╣╪╖┘ä")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {row.preOrderDate ? (
                              <span className="text-xs text-gray-600 dark:text-gray-300">
                                {new Date(row.preOrderDate).toLocaleDateString("ar-EG")}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">ΓÇö</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Link
                              to={`/products/${row.id}/edit`}
                              className="inline-flex p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                              title={t("productAvailability.edit", "╪¬╪╣╪»┘è┘ä ╪º┘ä┘à┘å╪¬╪¼") as string}
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
                    {t("productAvailability.showing", "╪╣╪▒╪╢ {{start}}-{{end}} ┘à┘å {{total}}").replace("{{start}}", String(startIndex + 1)).replace("{{end}}", String(Math.min(startIndex + pageSize, filtered.length))).replace("{{total}}", String(filtered.length))}
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
                  <span>{t("productAvailability.perPage", "┘ä┘â┘ä ╪╡┘ü╪¡╪⌐")}</span>
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
                        {t("productAvailability.prev", "╪º┘ä╪│╪º╪¿┘é")}
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
                        {t("productAvailability.next", "╪º┘ä╪¬╪º┘ä┘è")}
                      </PaginationLink>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
          <CheckCircleIcon className="inline h-3.5 w-3.5 ml-1" />
          {t(
            "productAvailability.hint",
            "╪¼╪»┘ê┘ä ╪┤╪¿┘è┘ç ╪¿╪¿╪▒┘å╪º┘à╪¼ Excel: ╪╣╪»┘æ┘ä ┘à┘ü╪º╪¬┘è╪¡ ╪º┘ä╪¬╪¬╪¿╪╣ ┘ê╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘à╪│╪¿┘é ┘à╪¿╪º╪┤╪▒╪⌐ ┘à┘å ╪º┘ä╪¼╪»┘ê┘ä ┘ê╪º╪¡┘ü╪╕ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï",
          )}
        </p>
      </div>
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
