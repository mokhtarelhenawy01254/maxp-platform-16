import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuthSimple";
import { apiClient } from "../../services/apiClient";
import BulkOrderModal from "./components/BulkOrderModal";
import BulkOrderView from "./components/BulkOrderView";

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

const BulkOrders = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === "ar";

  const [data, setData] = useState<BulkOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BulkOrder | null>(null);
  const [viewingItem, setViewingItem] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteMultipleConfirm, setDeleteMultipleConfirm] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const canCreate = user?.role && ["SUPER_ADMIN", "COMPANY_ADMIN", "TEAM_LEADER"].includes(user.role);
  const canEdit = canCreate;
  const canDelete = user?.role && ["SUPER_ADMIN", "COMPANY_ADMIN"].includes(user.role);

  const fetchData = useCallback(async (page = pagination.page) => {
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
  }, [search, statusFilter, sortBy, sortOrder, pagination.limit]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchData(1);
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search, statusFilter, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((d) => d.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/api/v1/bulk-orders/${id}`);
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await apiClient.delete("/api/v1/bulk-orders", { data: { ids: selectedIds } });
      setDeleteMultipleConfirm(false);
      setSelectedIds([]);
      setSelectAll(false);
      fetchData();
    } catch (err) {
      console.error("Failed to bulk delete", err);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await apiClient.post(`/api/v1/bulk-orders/${id}/duplicate`);
      fetchData();
    } catch (err) {
      console.error("Failed to duplicate", err);
    }
  };

  const handleExport = async (id: string, format: string = "excel") => {
    try {
      const res = await apiClient.get(`/api/v1/bulk-orders/${id}/export?format=${format}`, {
        responseType: format === "excel" ? "blob" : "json",
      });
      if (format === "excel") {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `bulk-order-${id}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to export", err);
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return;
    return (
      <span className={`inline-block ml-1 ${sortOrder === "asc" ? "rotate-180" : ""}`}>
        &#9650;
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
      PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200",
      PROCESSING: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
      COMPLETED: "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200",
      FAILED: "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200",
      CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.DRAFT}`}>
        {t(`orders.bulkStatus${status}`)}
      </span>
    );
  };

  const SortHeader = ({ column, label }: { column: string; label: string }) => (
    <th
      className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`text-[10px] opacity-50 ${sortBy === column ? "opacity-100" : ""}`}>
          {sortBy === column ? (sortOrder === "asc" ? "\u25B2" : "\u25BC") : "\u25B2\u25BC"}
        </span>
      </div>
    </th>
  );

  const showPageNumbers = () => {
    const pages = [];
    const total = pagination.totalPages;
    const current = pagination.page;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
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
    <div className="space-y-6 p-4 md:p-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("orders.bulkOrders")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("orders.bulkOrdersSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && canDelete && (
            <button
              onClick={() => setDeleteMultipleConfirm(true)}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {t("orders.deleteSelected")} ({selectedIds.length})
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => { setEditingItem(null); setShowModal(true); }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("orders.bulkCreateNew")}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("orders.bulkSearchPlaceholder")}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("orders.allStatuses")}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{t(`orders.bulkStatus${s}`)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <SortHeader column="operationNumber" label={t("orders.bulkOperationNumber")} />
                <SortHeader column="name" label={t("orders.bulkOperationName")} />
                <SortHeader column="totalOrders" label={t("orders.bulkTotalOrders")} />
                <SortHeader column="status" label={t("orders.bulkStatus")} />
                <SortHeader column="progress" label={t("orders.bulkProgress")} />
                <SortHeader column="createdByName" label={t("orders.bulkCreatedBy")} />
                <SortHeader column="createdAt" label={t("orders.bulkCreatedAt")} />
                <SortHeader column="updatedAt" label={t("orders.bulkUpdatedAt")} />
                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.bulkActions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    {t("orders.loadingOrders")}
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{t("orders.bulkNoData")}</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">{t("orders.bulkNoDataDesc")}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelect(item.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">
                      {item.operationNumber}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold">
                        {item.totalOrders}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.progress === 100 ? "bg-green-500" :
                              item.progress > 50 ? "bg-indigo-500" :
                              item.progress > 0 ? "bg-yellow-500" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[2rem]">
                          {item.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.createdByName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(item.updatedAt).toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewingItem(item.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title={t("orders.bulkView")}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => { setEditingItem(item); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title={t("orders.bulkEdit")}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleDuplicate(item.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                            title={t("orders.bulkDuplicate")}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleExport(item.id, "excel")}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          title={t("orders.bulkExport")}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title={t("orders.bulkDelete")}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("orders.showing")} {((pagination.page - 1) * pagination.limit) + 1} {t("orders.to")}{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} {t("orders.of")}{" "}
              {pagination.total} {t("orders.orders2")}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchData(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t("orders.previous")}
              </button>
              {showPageNumbers().map((p) => (
                <button
                  key={p}
                  onClick={() => fetchData(p)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    p === pagination.page
                      ? "bg-indigo-600 text-white"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => fetchData(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t("orders.next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <BulkOrderModal
          item={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          onSaved={() => { setShowModal(false); setEditingItem(null); fetchData(); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("orders.bulkDelete")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t("orders.bulkDeleteConfirm", { name: data.find((d) => d.id === deleteConfirm)?.name || "" })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t("orders.bulkCancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                {t("orders.bulkDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteMultipleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteMultipleConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("orders.bulkDelete")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t("orders.bulkDeleteMultipleConfirm", { count: selectedIds.length })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteMultipleConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t("orders.bulkCancel")}
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                {t("orders.bulkDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOrders;
