import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  ShoppingBagIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  CheckIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import { companyAwareApi } from "../../services/companyAwareApi";
import { getImageUrl } from "../../utils/imageUrl";
import { useCurrency } from "../../hooks/useCurrency";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
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

type ReorderView = "product" | "warehouse" | "preorder";

type StockStatus = "low" | "out" | "safe" | "untracked";

interface ReorderWarehouse {
  inventoryId: string;
  warehouseId: string;
  warehouseName: string;
  available: number;
  reserved: number;
  quantity: number;
  reorderPoint: number;
  minStock: number;
  batchNumber: string | null;
}

interface ReorderItem {
  productId: string;
  inventoryId?: string;
  name: string;
  sku: string;
  image: string | null;
  categoryName: string;
  trackInventory: boolean;
  isPreOrder: boolean;
  preOrderDate: string | null;
  preOrderMessage: string | null;
  status: StockStatus;
  urgency?: string;
  available: number;
  reserved: number;
  quantity: number;
  reorderPoint: number;
  minStock: number;
  dailyAvgSales?: number;
  daysUntilStockout?: number;
  suggestedReorder?: number;
  warehouseName?: string;
  warehouses?: ReorderWarehouse[];
}

interface ReorderResponse {
  success: boolean;
  data?: {
    items: ReorderItem[];
    pagination: { total: number; page: number; limit: number; pages: number };
    summary: ReorderSummary;
  };
  message?: string;
}

interface ReorderSummary {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  preOrderCount: number;
  untrackedCount: number;
  safeCount: number;
  atRiskValue: number;
}

const STATUS_META: Record<
  StockStatus,
  { label: string; className: string; dot: string }
> = {
  low: { label: "مخزون منخفض", className: "text-yellow-700 bg-yellow-100 border-yellow-200", dot: "bg-yellow-500" },
  out: { label: "نفد المخزون", className: "text-red-700 bg-red-100 border-red-200", dot: "bg-red-500" },
  safe: { label: "متوفر", className: "text-emerald-700 bg-emerald-100 border-emerald-200", dot: "bg-emerald-500" },
  untracked: { label: "بدون تتبع", className: "text-gray-600 bg-gray-100 border-gray-200", dot: "bg-gray-400" },
};

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className ?? ""}`}
    />
  );
}

const ReorderPointsPage: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [view, setView] = useState<ReorderView>("product");
  const [items, setItems] = useState<ReorderItem[]>([]);
  const [summary, setSummary] = useState<ReorderSummary | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("available");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkValue, setBulkValue] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const pageRef = React.useRef(1);

  const fetchData = useCallback(
    async (nextPage?: number) => {
      const targetPage = nextPage ?? pageRef.current;
      pageRef.current = targetPage;
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          view,
          page: targetPage,
          limit: pagination.limit,
          sortBy,
          sortDir,
        };
        params["search"] = search.trim();
        params["stockFilter"] = stockFilter;
        if (stockFilter === "all") delete params["stockFilter"];
        if (!search.trim()) delete params["search"];

        const response = await companyAwareApi.get<ReorderResponse>(
          "/inventory/reorder-points",
          { params },
        );
        if (response.data.success && response.data.data) {
          setItems(response.data.data.items);
          setSummary(response.data.data.summary);
          setPagination(response.data.data.pagination);
          pageRef.current = response.data.data.pagination.page;
          setSelectedIds(new Set());
        }
      } catch (error: unknown) {
        let message: string | undefined;
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          (error as { response?: { data?: { message?: string } } }).response?.data
            ?.message
        ) {
          message = (error as { response?: { data?: { message?: string } } })
            .response?.data?.message;
        }
        toast.error(message || (t("reorderPoints.loadError", "فشل في جلب البيانات") as string));
      } finally {
        setLoading(false);
      }
    },
    [view, search, stockFilter, sortBy, sortDir, pagination.limit, t],
  );

  useEffect(() => {
    pageRef.current = 1;
    setPagination((previous) =>
      previous.page === 1 ? previous : { ...previous, page: 1 },
    );
    fetchData();
  }, [view, search, stockFilter, sortBy, sortDir, fetchData]);

  const metricCards = useMemo(() => {
    const safeSummary = summary || {
      totalProducts: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      preOrderCount: 0,
      untrackedCount: 0,
      safeCount: 0,
      atRiskValue: 0,
    };
    return [
      {
        title: t("reorderPoints.lowStock", "مخزون منخفض"),
        value: safeSummary.lowStockCount,
        icon: ExclamationTriangleIcon,
        gradient: "from-yellow-500/20 to-yellow-500/5 text-yellow-600",
      },
      {
        title: t("reorderPoints.outOfStock", "نفد المخزون"),
        value: safeSummary.outOfStockCount,
        icon: XCircleIcon,
        gradient: "from-red-500/20 to-red-500/5 text-red-600",
      },
      {
        title: t("reorderPoints.preOrderCount", "الطلب المسبق"),
        value: safeSummary.preOrderCount,
        icon: ShoppingBagIcon,
        gradient: "from-indigo-500/20 to-indigo-500/5 text-indigo-600",
      },
      {
        title: t("reorderPoints.atRiskValue", "قيمة معرضة للخطر"),
        value: formatPrice(safeSummary.atRiskValue),
        icon: ArrowDownTrayIcon,
        gradient: "from-emerald-500/20 to-emerald-500/5 text-emerald-600",
      },
    ];
  }, [summary, t, formatPrice]);

  const rowKey = (item: ReorderItem) => item.inventoryId || item.productId;

  const toggleSelection = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((previous) =>
      previous.size === items.length
        ? new Set()
        : new Set(items.map(rowKey)),
    );
  };

  const startEdit = (item: ReorderItem) => {
    setEditingId(rowKey(item));
    setEditValue(String(item.reorderPoint || "0"));
  };

  const saveSingle = async (item: ReorderItem) => {
    const parsed = Math.max(0, Number(editValue) || 0);
    setSavingId(rowKey(item));
    try {
      const target = item.inventoryId
        ? `/inventory/reorder-points/${item.inventoryId}`
        : `/inventory/reorder-points/product/${item.productId}`;
      await companyAwareApi.put(target, { reorderPoint: parsed });
      toast.success(t("reorderPoints.saved", "تم الحفظ") as string);
      setEditingId(null);
      fetchData();
    } catch {
      toast.error(t("reorderPoints.saveError", "فشل الحفظ") as string);
    } finally {
      setSavingId(null);
    }
  };

  const saveBulk = async () => {
    const parsed = Math.max(0, Number(bulkValue) || 0);
    if (selectedIds.size === 0) {
      toast.error(t("reorderPoints.noSelection", "اختر منتجات أولاً"));
      return;
    }
    setBulkBusy(true);
    try {
      const selectedItems = items.filter((item) => selectedIds.has(rowKey(item)));
      await companyAwareApi.post("/inventory/reorder-points/bulk", {
        items: selectedItems.map((item) =>
          item.inventoryId
            ? { inventoryId: item.inventoryId, reorderPoint: parsed }
            : { productId: item.productId, reorderPoint: parsed },
        ),
      });
      toast.success(
        (
          t("reorderPoints.bulkSaved", "تم تحديث النقطة لـ {{count}} منتج") as string
        ).replace("{{count}}", String(selectedItems.length)),
      );
      setBulkValue("");
      setSelectedIds(new Set());
      fetchData();
    } catch {
      toast.error(t("reorderPoints.bulkError", "فشل التحديث الجماعي") as string);
    } finally {
      setBulkBusy(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      "name",
      "sku",
      "category",
      "status",
      "available",
      "reserved",
      "reorderPoint",
      "minStock",
      "isPreOrder",
      "dailyAvgSales",
      "daysUntilStockout",
      "suggestedReorder",
    ];
    const rows = items.map((item) => [
      item.name,
      item.sku,
      item.categoryName,
      item.status,
      item.available,
      item.reserved,
      item.reorderPoint,
      item.minStock,
      item.isPreOrder ? "yes" : "no",
      item.dailyAvgSales ?? "",
      item.daysUntilStockout ?? "",
      item.suggestedReorder ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reorder-points-${view}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const changePage = (page: number) => {
    if (page < 1 || page > pagination.pages) return;
    fetchData(page);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const urgencyMeta = (urgency?: string) => {
    if (urgency === "critical") return { label: "حرج", className: "bg-red-100 text-red-700" };
    if (urgency === "warning") return { label: "تحذير", className: "bg-orange-100 text-orange-700" };
    if (urgency === "moderate") return { label: "متوسط", className: "bg-yellow-100 text-yellow-700" };
    return { label: "آمن", className: "bg-emerald-100 text-emerald-700" };
  };

  const sortableHead = (field: string, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sortBy === field ? (
        <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
      ) : null}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ArchiveBoxIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              {t("reorderPoints.title", "إدارة نقاط عجز المخزون")}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t(
                "reorderPoints.subtitle",
                "راجع الكميات المتبقية ونقاط إعادة الطلب والطلب المسبق لكل منتج",
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCsv} className="gap-2">
              <ArrowDownTrayIcon className="h-4 w-4" />
              {t("reorderPoints.export", "تصدير CSV")}
            </Button>
            <Button variant="outline" onClick={() => fetchData()} className="gap-2">
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("reorderPoints.refresh", "تحديث")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-1">
                {(
                  [
                    { key: "product", label: t("reorderPoints.viewProduct", "بالكل (مجمع)") },
                    { key: "warehouse", label: t("reorderPoints.viewWarehouse", "بالمخزن") },
                    { key: "preorder", label: t("reorderPoints.viewPreOrder", "الطلب المسبق") },
                  ] as { key: ReorderView; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setView(tab.key)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      view === tab.key
                        ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("reorderPoints.search", "بحث بالاسم أو SKU...") as string}
                    className="pl-9 w-56"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-4 w-4 text-gray-400" />
                  <Select
                    value={stockFilter}
                    onValueChange={(value) => setStockFilter(value ?? "all")}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t("reorderPoints.all", "الكل")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("reorderPoints.all", "الكل")}</SelectItem>
                      <SelectItem value="low">{t("reorderPoints.filterLow", "مخزون منخفض")}</SelectItem>
                      <SelectItem value="out">{t("reorderPoints.filterOut", "نفد")}</SelectItem>
                      <SelectItem value="safe">{t("reorderPoints.filterSafe", "متوفر")}</SelectItem>
                      <SelectItem value="preorder">{t("reorderPoints.filterPreOrder", "طلب مسبق")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircleIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
                <p className="mt-4 text-gray-500 dark:text-gray-400">
                  {t("reorderPoints.empty", "لا توجد بيانات مطابقة")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === items.length && items.length > 0}
                          onChange={toggleAll}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                        />
                      </TableHead>
                      <TableHead>{sortableHead("name", t("reorderPoints.colProduct", "المنتج"))}</TableHead>
                      <TableHead>{t("reorderPoints.colStatus", "الحالة")}</TableHead>
                      {view === "warehouse" ? (
                        <TableHead>{t("reorderPoints.colWarehouse", "المخزن")}</TableHead>
                      ) : null}
                      <TableHead>{sortableHead("available", t("reorderPoints.colAvailable", "المتبقي"))}</TableHead>
                      <TableHead>{sortableHead("reorderPoint", t("reorderPoints.colReorder", "النقطة"))}</TableHead>
                      <TableHead>{t("reorderPoints.colPreOrder", "طلب مسبق")}</TableHead>
                      <TableHead>{sortableHead("daysUntilStockout", t("reorderPoints.colDays", "أيام النفاد"))}</TableHead>
                      <TableHead>{t("reorderPoints.colSuggested", "مقترح")}</TableHead>
                      <TableHead className="w-20">{t("reorderPoints.colActions", "")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const status = STATUS_META[item.status];
                      const key = rowKey(item);
                      const isEditing = editingId === key;
                      const isSaving = savingId === key;
                      const urgency = urgencyMeta(item.urgency);
                      const imageUrl = item.image ? getImageUrl(item.image) : null;

                      return (
                        <TableRow key={key}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(key)}
                              onChange={() => toggleSelection(key)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.name}
                                  className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                  <ArchiveBoxIcon className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {item.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {item.sku}
                                  {item.categoryName ? ` • ${item.categoryName}` : ""}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </TableCell>
                          {view === "warehouse" ? (
                            <TableCell>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {item.warehouseName || "—"}
                              </span>
                            </TableCell>
                          ) : null}
                          <TableCell>
                            <span className={`text-sm font-bold ${item.status === "out" ? "text-red-600" : item.status === "low" ? "text-yellow-600" : "text-gray-900 dark:text-white"}`}>
                              {item.available}
                            </span>
                            {item.reserved > 0 ? (
                              <span className="text-xs text-gray-400 mr-1">
                                (+{item.reserved} محجوز)
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={editValue}
                                  onChange={(event) => setEditValue(event.target.value)}
                                  className="w-20 h-8 text-sm"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => saveSingle(item)}
                                  disabled={isSaving}
                                  className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                  <XCircleIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${item.status === "low" || item.status === "out" ? "text-yellow-600" : "text-gray-900 dark:text-white"}`}>
                                  {item.reorderPoint}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                  title={t("reorderPoints.edit", "تعديل النقطة") as string}
                                >
                                  <PencilSquareIcon className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1 w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${item.isPreOrder ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                                {item.isPreOrder
                                  ? t("reorderPoints.preOrderOn", "مفعل")
                                  : t("reorderPoints.preOrderOff", "معطل")}
                              </span>
                              {item.preOrderDate ? (
                                <span className="text-[11px] text-gray-400">
                                  {new Date(item.preOrderDate).toLocaleDateString("ar-EG")}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {item.daysUntilStockout === 999
                                  ? "∞"
                                  : item.daysUntilStockout}
                              </span>
                              <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${urgency.className}`}>
                                {urgency.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {item.suggestedReorder || "—"}
                              </span>
                              {typeof item.dailyAvgSales === "number" && item.dailyAvgSales > 0 ? (
                                <span className="text-[11px] text-gray-400">
                                  {t("reorderPoints.perDay", "{{count}}/يوم").replace(
                                    "{{count}}",
                                    String(item.dailyAvgSales),
                                  )}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                              title={t("reorderPoints.edit", "تعديل النقطة") as string}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t("reorderPoints.selected", "المحدد: {{count}}").replace(
                      "{{count}}",
                      String(selectedIds.size),
                    )}
                  </span>
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={bulkValue}
                        onChange={(event) => setBulkValue(event.target.value)}
                        placeholder={t("reorderPoints.bulkPlaceholder", "نقطة جديدة...") as string}
                        className="w-28 h-9 text-sm"
                      />
                      <Button
                        onClick={saveBulk}
                        disabled={bulkBusy}
                        className="h-9 text-sm"
                      >
                        {bulkBusy
                          ? t("reorderPoints.saving", "جاري الحفظ...")
                          : t("reorderPoints.applyBulk", "تعيين للمحدد")}
                      </Button>
                    </div>
                  )}
                </div>

                <Pagination>
                  <PaginationContent>
                    {Array.from({ length: Math.min(pagination.pages, 7) }, (_, index) => {
                      const page = index + 1;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(event) => {
                              event.preventDefault();
                              changePage(page);
                            }}
                            isActive={page === pagination.page}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReorderPointsPage;
