import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  ShoppingBagIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { companyAwareApi } from "../../../../services/companyAwareApi";
import { useCurrency } from "../../../../hooks/useCurrency";
import type {
  ReorderItem,
  ReorderResponse,
  ReorderSummary,
  ReorderView,
} from "./types";

export function useReorderPointsController() {
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
  const pageRef = useRef(1);

  const tRef = useRef(t);
  tRef.current = t;

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
        toast.error(message || (tRef.current("reorderPoints.loadError", "فشل في جلب البيانات") as string));
      } finally {
        setLoading(false);
      }
    },
    [view, search, stockFilter, sortBy, sortDir, pagination.limit],
  );

  useEffect(() => {
    pageRef.current = 1;
    setPagination((previous) =>
      previous.page === 1 ? previous : { ...previous, page: 1 },
    );
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, search, stockFilter, sortBy, sortDir]);

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
  const hasInventory = (item: ReorderItem) =>
    Boolean(item.inventoryId) ||
    (Array.isArray(item.warehouses) && item.warehouses.length > 0);

  const toggleSelection = (id: string, item?: ReorderItem) => {
    if (item && !hasInventory(item)) {
      toast.error(t("reorderPoints.noInventoryBlock", "لا يمكن تعديل النقطة لمنتج بلا سجلات مخزون") as string);
      return;
    }
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
    if (!hasInventory(item)) {
      toast.error(t("reorderPoints.noInventoryBlock", "لا يمكن تعديل النقطة لمنتج بلا سجلات مخزون") as string);
      return;
    }
    setEditingId(rowKey(item));
    setEditValue(String(item.reorderPoint || "0"));
  };

  const saveSingle = async (item: ReorderItem) => {
    if (!hasInventory(item)) {
      toast.error(t("reorderPoints.noInventoryBlock", "لا يمكن تعديل النقطة لمنتج بلا سجلات مخزون") as string);
      return;
    }
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
      const selectedItems = items.filter(
        (item) => selectedIds.has(rowKey(item)) && hasInventory(item),
      );
      if (selectedItems.length === 0) {
        toast.error(t("reorderPoints.noInventoryBlock", "لا يمكن تعديل النقطة لمنتج بلا سجلات مخزون") as string);
        return;
      }
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

  return {
    view,
    setView,
    items,
    summary,
    pagination,
    loading,
    search,
    setSearch,
    stockFilter,
    setStockFilter,
    sortBy,
    sortDir,
    savingId,
    editingId,
    setEditingId,
    editValue,
    setEditValue,
    selectedIds,
    bulkValue,
    setBulkValue,
    bulkBusy,
    fetchData,
    metricCards,
    rowKey,
    hasInventory,
    toggleSelection,
    toggleAll,
    startEdit,
    saveSingle,
    saveBulk,
    exportCsv,
    changePage,
    toggleSort,
  };
}
