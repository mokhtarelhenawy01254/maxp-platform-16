import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  TableCellsIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ShoppingBagIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  TagIcon,
  CubeTransparentIcon,
} from "@heroicons/react/24/outline";
import { companyAwareApi } from "../../services/companyAwareApi";
import { getImageUrl } from "../../utils/imageUrl";
import { useCurrency } from "../../hooks/useCurrency";
import { Card, CardContent } from "../../components/ui/card";
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

type StockStatus = "low" | "out" | "safe" | "untracked";

interface SheetRow {
  productId: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
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
}

interface SheetResponse {
  success: boolean;
  data?: {
    items: SheetRow[];
    pagination: { total: number; page: number; limit: number; pages: number };
    summary: {
      totalProducts: number;
      lowStockCount: number;
      outOfStockCount: number;
      preOrderCount: number;
      untrackedCount: number;
      safeCount: number;
      atRiskValue: number;
    };
  };
  message?: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

const STATUS_META: Record<
  StockStatus,
  { label: string; className: string; dot: string }
> = {
  low: {
    label: "مخزون منخفض",
    className:
      "text-yellow-700 bg-yellow-100 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-800",
    dot: "bg-yellow-500",
  },
  out: {
    label: "نفد المخزون",
    className:
      "text-red-700 bg-red-100 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800",
    dot: "bg-red-500",
  },
  safe: {
    label: "متوفر",
    className:
      "text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  untracked: {
    label: "بدون تتبع",
    className:
      "text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700",
    dot: "bg-gray-400",
  },
};

const getErrorMessage = (
  error: unknown,
  fallback: string,
): { message: string; needsActivation?: boolean } => {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as {
      response?: { data?: { message?: string; needsActivation?: boolean } };
    }).response?.data;
    if (data?.message) {
      return { message: data.message, needsActivation: data.needsActivation };
    }
  }
  return { message: fallback };
};

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className ?? ""}`}
    />
  );
}

const ProductSheet: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState<SheetRow[]>([]);
  const [summary, setSummary] = useState<SheetResponse["data"]["summary"] | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<{ message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [preOrderFilter, setPreOrderFilter] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [sortBy, setSortBy] = useState("available");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const pageRef = React.useRef(1);

  const fetchData = useCallback(
    async (nextPage?: number) => {
      const targetPage = nextPage ?? pageRef.current;
      pageRef.current = targetPage;
      setLoading(true);
      setBlocked(null);
      try {
        const params: Record<string, string | number> = {
          view: "product",
          page: targetPage,
          limit: pagination.limit,
          sortBy,
          sortDir,
        };
        if (search.trim()) params["search"] = search.trim();
        if (stockFilter !== "all") params["stockFilter"] = stockFilter;
        if (preOrderFilter !== "all") params["preOrder"] = preOrderFilter === "preorder-on" ? "on" : "off";
        if (categoryId !== "all") params["categoryId"] = categoryId;

        const response = await companyAwareApi.get<SheetResponse>(
          "/inventory/reorder-points",
          { params },
        );
        if (response.data.success && response.data.data) {
          setItems(response.data.data.items);
          setSummary(response.data.data.summary);
          setPagination(response.data.data.pagination);
          pageRef.current = response.data.data.pagination.page;
        }
      } catch (error: unknown) {
        const parsed = getErrorMessage(
          error,
          t("productSheet.loadError", "فشل في جلب البيانات") as string,
        );
        if (parsed.needsActivation) {
          setBlocked({ message: parsed.message });
          setItems([]);
        } else {
          toast.error(parsed.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [search, stockFilter, categoryId, preOrderFilter, sortBy, sortDir, pagination.limit, t],
  );

  const fetchCategories = useCallback(async () => {
    try {
      const response = await companyAwareApi.get<{
        success?: boolean;
        data?: { id: string; name: string }[];
      }>("/categories", {});
      if (response.data.success && Array.isArray(response.data.data)) {
        setCategories(response.data.data);
      }
    } catch {
      // غير حاسم — القائمة اختيارية
    }
  }, []);

  useEffect(() => {
    pageRef.current = 1;
    setPagination((previous) =>
      previous.page === 1 ? previous : { ...previous, page: 1 },
    );
    fetchData();
  }, [search, stockFilter, categoryId, preOrderFilter, sortBy, sortDir, fetchData]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const metricCards = useMemo(() => {
    const s = summary || {
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
        title: t("productSheet.totalProducts", "إجمالي المنتجات"),
        value: s.totalProducts,
        icon: TableCellsIcon,
        gradient: "from-indigo-500/20 to-indigo-500/5 text-indigo-600",
      },
      {
        title: t("productSheet.preOrderCount", "طلب مسبق مسموح"),
        value: s.preOrderCount,
        icon: ShoppingBagIcon,
        gradient: "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-600",
      },
      {
        title: t("productSheet.lowStock", "مخزون منخفض"),
        value: s.lowStockCount,
        icon: ExclamationTriangleIcon,
        gradient: "from-yellow-500/20 to-yellow-500/5 text-yellow-600",
      },
      {
        title: t("productSheet.outOfStock", "نفد المخزون"),
        value: s.outOfStockCount,
        icon: XCircleIcon,
        gradient: "from-red-500/20 to-red-500/5 text-red-600",
      },
    ];
  }, [summary, t]);

  const togglePreOrder = async (row: SheetRow, next: boolean) => {
    setTogglingId(row.productId);
    try {
      const response = await companyAwareApi.patch<{ success?: boolean }>(
        `/products/${row.productId}`,
        { isPreOrder: next },
      );
      if (response.data?.success !== false) {
        toast.success(
          next
            ? t("productSheet.preOrderOnMsg", "تم تفعيل الطلب المسبق") as string
            : t("productSheet.preOrderOffMsg", "تم إيقاف الطلب المسبق") as string,
        );
        fetchData();
      } else {
        toast.error(t("productSheet.toggleError", "فشل التحديث") as string);
      }
    } catch {
      toast.error(t("productSheet.toggleError", "فشل التحديث") as string);
    } finally {
      setTogglingId(null);
    }
  };

  const toggleTrack = async (row: SheetRow, next: boolean) => {
    setTogglingId(row.productId);
    try {
      const response = await companyAwareApi.patch<{ success?: boolean }>(
        `/products/${row.productId}`,
        { trackInventory: next },
      );
      if (response.data?.success !== false) {
        toast.success(
          next
            ? t("productSheet.trackOnMsg", "تم تفعيل تتبع المخزون") as string
            : t("productSheet.trackOffMsg", "تم إيقاف تتبع المخزون") as string,
        );
        fetchData();
      } else {
        toast.error(t("productSheet.toggleError", "فشل التحديث") as string);
      }
    } catch {
      toast.error(t("productSheet.toggleError", "فشل التحديث") as string);
    } finally {
      setTogglingId(null);
    }
  };

  const exportCsv = () => {
    const headers = [
      "name",
      "sku",
      "category",
      "price",
      "trackInventory",
      "available",
      "reserved",
      "quantity",
      "reorderPoint",
      "status",
      "isPreOrder",
      "preOrderDate",
      "daysUntilStockout",
    ];
    const rows = items.map((item) => [
      item.name,
      item.sku,
      item.categoryName,
      item.price,
      item.trackInventory ? "yes" : "no",
      item.available,
      item.reserved,
      item.quantity,
      item.reorderPoint,
      item.status,
      item.isPreOrder ? "yes" : "no",
      item.preOrderDate || "",
      item.daysUntilStockout ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `product-sheet-${Date.now()}.csv`;
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
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8"
      dir="rtl"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TableCellsIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              {t("productSheet.title", "شيت المنتجات")}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t(
                "productSheet.subtitle",
                "عرض جميع المنتجات بشكل جدولي — تتبع المخزون وحالة الطلب المسبق لكل منتج",
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCsv} className="gap-2">
              <ArrowDownTrayIcon className="h-4 w-4" />
              {t("productSheet.export", "تصدير CSV")}
            </Button>
            <Button variant="outline" onClick={() => fetchData()} className="gap-2">
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("productSheet.refresh", "تحديث")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metricCards.map((card, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm overflow-hidden relative"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`}
              />
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

        {blocked && (
          <Card className="mb-6 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <XCircleIcon className="h-8 w-8 text-red-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t("productSheet.featureRequired", "الميزة غير متاحة")}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {blocked.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {t(
                      "productSheet.activateHint",
                      "فعّل تطبيق إدارة المخزون (Inventory Pro) من المتجر للاستفادة من هذه الصفحة.",
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("productSheet.search", "بحث بالاسم أو SKU...") as string}
                  className="pr-9 w-full"
                />
              </div>
              <Select
                value={stockFilter}
                onValueChange={(value) => setStockFilter(value ?? "all")}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder={t("productSheet.all", "الكل")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("productSheet.all", "كل الحالات")}</SelectItem>
                  <SelectItem value="safe">{t("productSheet.filterSafe", "متوفر")}</SelectItem>
                  <SelectItem value="low">{t("productSheet.filterLow", "مخزون منخفض")}</SelectItem>
                  <SelectItem value="out">{t("productSheet.filterOut", "نفد")}</SelectItem>
                  <SelectItem value="untracked">{t("productSheet.filterUntracked", "بدون تتبع")}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={preOrderFilter}
                onValueChange={(value) => setPreOrderFilter(value ?? "all")}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder={t("productSheet.all", "الكل")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("productSheet.preOrderAll", "كل الطلبات المسبقة")}</SelectItem>
                  <SelectItem value="preorder-on">{t("productSheet.preOrderOn", "مسموح بالطلب المسبق")}</SelectItem>
                  <SelectItem value="preorder-off">{t("productSheet.preOrderOff", "غير مسموح")}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={categoryId}
                onValueChange={(value) => setCategoryId(value ?? "all")}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder={t("productSheet.allCategories", "كل التصنيفات")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("productSheet.allCategories", "كل التصنيفات")}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {blocked ? null : loading ? (
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
                  {t("productSheet.empty", "لا توجد بيانات مطابقة")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[1300px]">
                  <TableHeader className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
                    <TableRow>
                      <TableHead className="w-10 text-center text-gray-400">
                        #
                      </TableHead>
                      <TableHead>{sortableHead("name", t("productSheet.colProduct", "المنتج"))}</TableHead>
                      <TableHead>{t("productSheet.colSku", "SKU")}</TableHead>
                      <TableHead>{t("productSheet.colCategory", "التصنيف")}</TableHead>
                      <TableHead>{t("productSheet.colPrice", "السعر")}</TableHead>
                      <TableHead>{t("productSheet.colTrack", "تتبع المخزون")}</TableHead>
                      <TableHead>{sortableHead("available", t("productSheet.colAvailable", "المتاح"))}</TableHead>
                      <TableHead>{t("productSheet.colReserved", "المحجوز")}</TableHead>
                      <TableHead>{t("productSheet.colTotal", "الإجمالي")}</TableHead>
                      <TableHead>{sortableHead("reorderPoint", t("productSheet.colReorder", "النقطة"))}</TableHead>
                      <TableHead>{t("productSheet.colStatus", "الحالة")}</TableHead>
                      <TableHead>{t("productSheet.colPreOrder", "الطلب المسبق")}</TableHead>
                      <TableHead>{t("productSheet.colPreOrderDate", "تاريخ المسبق")}</TableHead>
                      <TableHead>{sortableHead("daysUntilStockout", t("productSheet.colDays", "أيام النفاد"))}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => {
                      const status = STATUS_META[item.status];
                      const rowNumber =
                        (pagination.page - 1) * pagination.limit + index + 1;
                      const imageUrl = item.image ? getImageUrl(item.image) : null;
                      const isToggling = togglingId === item.productId;

                      return (
                        <TableRow
                          key={item.productId}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/60"
                        >
                          <TableCell className="text-center text-gray-400 text-xs">
                            {rowNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.name}
                                  className="h-9 w-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                  <ArchiveBoxIcon className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-[180px]">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                  {item.name}
                                </p>
                                {item.preOrderMessage ? (
                                  <p className="text-[11px] text-gray-400 truncate max-w-[220px]">
                                    {item.preOrderMessage}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {item.sku || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <TagIcon className="h-3.5 w-3.5 text-gray-400" />
                              {item.categoryName || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                            {formatPrice(item.price)}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => toggleTrack(item, !item.trackInventory)}
                              title={t("productSheet.toggleTrack", "تبديل تتبع المخزون") as string}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                item.trackInventory
                                  ? "text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-800"
                                  : "text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700"
                              }`}
                            >
                              <CubeTransparentIcon className="h-3.5 w-3.5" />
                              {item.trackInventory
                                ? t("productSheet.trackOn", "مفعل")
                                : t("productSheet.trackOff", "معطل")}
                            </button>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-sm font-bold ${
                                item.status === "out"
                                  ? "text-red-600 dark:text-red-400"
                                  : item.status === "low"
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {item.available}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {item.reserved > 0 ? item.reserved : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-900 dark:text-gray-100">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                            {item.reorderPoint}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => togglePreOrder(item, !item.isPreOrder)}
                              title={t("productSheet.togglePreOrder", "تبديل الطلب المسبق") as string}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                item.isPreOrder
                                  ? "text-fuchsia-700 bg-fuchsia-100 border-fuchsia-200 dark:text-fuchsia-300 dark:bg-fuchsia-900/30 dark:border-fuchsia-800"
                                  : "text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700"
                              }`}
                            >
                              <ShoppingBagIcon className="h-3.5 w-3.5" />
                              {item.isPreOrder
                                ? t("productSheet.preOrderAllowed", "مسموح")
                                : t("productSheet.preOrderNotAllowed", "غير مسموح")}
                            </button>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {item.preOrderDate
                              ? new Date(item.preOrderDate).toLocaleDateString("ar-EG")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {item.daysUntilStockout === 999
                                  ? "∞"
                                  : item.daysUntilStockout}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {!blocked && items.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t("productSheet.total", "الإجمالي: {{count}}").replace(
                      "{{count}}",
                      String(pagination.total),
                    )}
                  </span>
                  <Select
                    value={String(pagination.limit)}
                    onValueChange={(value) => {
                      const nextLimit = Number(value) || 50;
                      setPagination((previous) => ({
                        ...previous,
                        limit: nextLimit,
                        page: 1,
                      }));
                      pageRef.current = 1;
                      fetchData(1);
                    }}
                  >
                    <SelectTrigger className="w-24 h-9 text-sm">
                      <SelectValue placeholder="50" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Pagination>
                  <PaginationContent>
                    {Array.from(
                      { length: Math.min(pagination.pages, 7) },
                      (_, index) => {
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
                      },
                    )}
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

export default ProductSheet;
