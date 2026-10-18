import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../../services/apiClient";

export interface BulkOrder {
  id: string;
  operationNumber: string;
  name: string;
  totalOrders: number;
  status: string;
  progress: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
}

export interface BulkOrdersPaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const STATUS_OPTIONS = ["DRAFT", "PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"];

export function useBulkOrdersData() {
  const { t } = useTranslation();

  const [data, setData] = useState<BulkOrder[]>([]);
  const [pagination, setPagination] = useState<BulkOrdersPaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [activeActions, setActiveActions] = useState<Set<string>>(new Set());

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const fetchData = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pagination.limit),
          sortBy,
          sortOrder,
        });
        if (search) params.set("search", search);
        if (statusFilter) params.set("status", statusFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await apiClient.get(`/api/v1/bulk-orders?${params}`);
        if (res.data?.success) {
          setData(res.data.data);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        console.error("Failed to fetch bulk orders", err);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, sortBy, sortOrder, pagination.limit, pagination.page, dateFrom, dateTo]
  );

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchData(1);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search, statusFilter, sortBy, sortOrder, dateFrom, dateTo, fetchData]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((item) => item.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiClient.delete(`/api/v1/bulk-orders/${id}`);
      if (res.data?.success) {
        toast.success(t("orders.bulkDeleted") || "Operation deleted successfully");
        setSelectedIds((prev) => prev.filter((i) => i !== id));
        fetchData();
        return true;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || t("orders.bulkDeleteFailed") || "Delete failed");
    }
    return false;
  };

  const handleDeleteMultiple = async () => {
    try {
      const res = await apiClient.post("/api/v1/bulk-orders/bulk-delete", {
        ids: selectedIds,
      });
      if (res.data?.success) {
        toast.success(
          t("orders.bulkDeletedMultiple", { count: selectedIds.length }) ||
            `${selectedIds.length} operations deleted successfully`
        );
        setSelectedIds([]);
        setSelectAll(false);
        fetchData();
        return true;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || t("orders.bulkDeleteFailed") || "Delete failed");
    }
    return false;
  };

  const handleDuplicate = async (id: string) => {
    setActiveActions((prev) => new Set(prev).add(`dup-${id}`));
    try {
      const res = await apiClient.post(`/api/v1/bulk-orders/${id}/duplicate`);
      if (res.data?.success) {
        toast.success(t("orders.bulkDuplicated") || "Operation duplicated successfully");
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || t("orders.bulkDuplicateFailed") || "Duplicate failed");
    } finally {
      setActiveActions((prev) => {
        const next = new Set(prev);
        next.delete(`dup-${id}`);
        return next;
      });
    }
  };

  const handleExport = async (id: string, format = "excel") => {
    try {
      const res = await apiClient.get(`/api/v1/bulk-orders/${id}/export?format=${format}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `bulk_order_${id}.${format === "excel" ? "xlsx" : "csv"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(t("orders.bulkExportFailed") || "Export failed");
    }
  };

  const handleExecute = async (id: string) => {
    setActiveActions((prev) => new Set(prev).add(`exec-${id}`));
    try {
      const res = await apiClient.post(`/api/v1/bulk-orders/${id}/execute`);
      if (res.data?.success) {
        const { successCount, errors: execErrors } = res.data;
        if (execErrors && execErrors.length > 0) {
          toast.warning(
            t("orders.bulkExecutedPartial", {
              success: successCount,
              failed: execErrors.length,
            }) || `${successCount} succeeded, ${execErrors.length} failed`
          );
        } else {
          toast.success(t("orders.bulkExecuted") || "Operation executed successfully");
        }
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t("orders.bulkExecuteFailed") || "Execution failed");
    } finally {
      setActiveActions((prev) => {
        const next = new Set(prev);
        next.delete(`exec-${id}`);
        return next;
      });
    }
  };

  return {
    data,
    pagination,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectedIds,
    setSelectedIds,
    selectAll,
    setSelectAll,
    sortBy,
    sortOrder,
    activeActions,
    fetchData,
    handleSort,
    handleSelectAll,
    handleSelect,
    handleDelete,
    handleDeleteMultiple,
    handleDuplicate,
    handleExport,
    handleExecute,
  };
}
