import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import {
  AvailabilityRow,
  AvailabilityResponse,
  mapProductRow,
  getStockStatus,
} from "./availabilityTypes";

export function useProductAvailabilityData() {
  const { t } = useTranslation();
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
      prev.map((r) => (r.id === row.id ? nextRow : r))
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
          ? (t("productAvailability.trackSaved", "تم تحديث تتبع المخزون") as string)
          : (t("productAvailability.preOrderSaved", "تم تحديث الطلب المسبق") as string),
      );
    } catch (err) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? previous : r))
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

  const changePage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  return {
    rows,
    loading,
    totalItems,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    preOrderFilter,
    setPreOrderFilter,
    trackFilter,
    setTrackFilter,
    stockFilter,
    setStockFilter,
    sortBy,
    sortDir,
    page,
    setPage,
    pageSize,
    setPageSize,
    savingKey,
    categories,
    filtered,
    paginated,
    totalPages,
    safePage,
    startIndex,
    stats,
    loadAll,
    toggleField,
    savePreOrderDate,
    changeSort,
    changePage,
  };
}
