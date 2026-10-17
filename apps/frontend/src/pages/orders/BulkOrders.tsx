import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Layers, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { apiClient } from "../../services/apiClient";
import BulkOrderModal from "./components/BulkOrderModal";
import BulkOrderView from "./components/BulkOrderView";
import ConfirmationModal from "./components/ConfirmationModal";
import { BulkOrdersFilterBar } from "./components/bulk/BulkOrdersFilterBar";
import { BulkOrdersTable } from "./components/bulk/BulkOrdersTable";
import { BulkOrdersPagination } from "./components/bulk/BulkOrdersPagination";

interface BulkOrder {
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = ["DRAFT", "PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"];

export const BulkOrders = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === "ar";

  const [data, setData] = useState<BulkOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BulkOrder | null>(null);
  const [viewingItem, setViewingItem] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteMultipleConfirm, setDeleteMultipleConfirm] = useState(false);
  const [activeActions, setActiveActions] = useState<Set<string>>(new Set());
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const prevViewingItem = useRef<string | null>(null);

  const canCreate =
    user?.permissions?.some((p) => p === "bulkOrders.create" || p === "orders.bulk.create") ||
    (user?.role && ["SUPER_ADMIN", "COMPANY_ADMIN", "TEAM_LEADER"].includes(user.role));
  const canEdit = canCreate;
  const canDelete =
    user?.permissions?.some((p) => p === "bulkOrders.delete" || p === "orders.bulk.delete") ||
    (user?.role && ["SUPER_ADMIN", "COMPANY_ADMIN"].includes(user.role));

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
    [search, statusFilter, sortBy, sortOrder, pagination.limit, dateFrom, dateTo]
  );

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchData(1);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search, statusFilter, sortBy, sortOrder, dateFrom, dateTo]);

  useEffect(() => {
    if (prevViewingItem.current && !viewingItem) {
      fetchData();
    }
    prevViewingItem.current = viewingItem;
  }, [viewingItem, fetchData]);

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
        setDeleteConfirm(null);
        setSelectedIds((prev) => prev.filter((i) => i !== id));
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || t("orders.bulkDeleteFailed") || "Delete failed");
    }
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
        setDeleteMultipleConfirm(false);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || t("orders.bulkDeleteFailed") || "Delete failed");
    }
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

  if (viewingItem) {
    return (
      <BulkOrderView
        id={viewingItem}
        onBack={() => setViewingItem(null)}
        onEdit={(item) => {
          setViewingItem(null);
          setEditingItem(item);
          setShowModal(true);
        }}
        onDuplicate={handleDuplicate}
        onExport={handleExport}
      />
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">
                {t("orders.bulkOrders")}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("orders.bulkOrdersSubtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && canDelete && (
            <button
              type="button"
              onClick={() => setDeleteMultipleConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-destructive text-destructive-foreground rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-xs hover:bg-destructive/90"
            >
              <Trash2 size={13} />
              <span>{t("orders.deleteSelected")} ({selectedIds.length})</span>
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-xs hover:bg-primary/90"
            >
              <Plus size={14} />
              <span>{t("orders.bulkCreateNew")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Table Surface */}
      <div className="bg-card rounded-2xl border border-border/70 shadow-xs overflow-hidden">
        <BulkOrdersFilterBar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          statusOptions={STATUS_OPTIONS}
        />

        <BulkOrdersTable
          loading={loading}
          data={data}
          selectedIds={selectedIds}
          selectAll={selectAll}
          handleSelectAll={handleSelectAll}
          handleSelect={handleSelect}
          sortBy={sortBy}
          sortOrder={sortOrder}
          handleSort={handleSort}
          canEdit={canEdit}
          activeActions={activeActions}
          setViewingItem={setViewingItem}
          setEditingItem={setEditingItem}
          setShowModal={setShowModal}
          handleExecute={handleExecute}
          handleDuplicate={handleDuplicate}
        />

        {/* Pagination */}
        <BulkOrdersPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={(p) => fetchData(p)}
          isRtl={isRtl}
        />
      </div>

      {showModal && (
        <BulkOrderModal
          item={editingItem}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingItem(null);
            fetchData();
          }}
        />
      )}

      {deleteConfirm && (
        <ConfirmationModal
          isOpen={true}
          title={t("orders.deleteBulkOrderConfirmTitle") || "حذف العملية"}
          message={t("orders.deleteBulkOrderConfirmMessage") || "هل أنت متأكد من حذف هذه العملية؟"}
          confirmText={t("common.delete") || "حذف"}
          cancelText={t("common.cancel") || "إلغاء"}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          variant="danger"
        />
      )}

      {deleteMultipleConfirm && (
        <ConfirmationModal
          isOpen={true}
          title={t("orders.deleteMultipleConfirmTitle") || "حذف العمليات المحددة"}
          message={
            t("orders.deleteMultipleConfirmMessage", { count: selectedIds.length }) ||
            `هل أنت متأكد من حذف ${selectedIds.length} عملية محددة؟`
          }
          confirmText={t("common.delete") || "حذف"}
          cancelText={t("common.cancel") || "إلغاء"}
          onConfirm={handleDeleteMultiple}
          onCancel={() => setDeleteMultipleConfirm(false)}
          variant="danger"
        />
      )}
    </div>
  );
};

export default BulkOrders;
