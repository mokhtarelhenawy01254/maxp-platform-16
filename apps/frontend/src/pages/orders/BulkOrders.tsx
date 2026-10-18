import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuthSimple";
import BulkOrderModal from "./components/BulkOrderModal";
import BulkOrderView from "./components/BulkOrderView";
import ConfirmationModal from "./components/ConfirmationModal";
import { BulkOrdersHeader } from "./components/bulk/BulkOrdersHeader";
import { BulkOrdersFilterBar } from "./components/bulk/BulkOrdersFilterBar";
import { BulkOrdersTable } from "./components/bulk/BulkOrdersTable";
import { BulkOrdersPagination } from "./components/bulk/BulkOrdersPagination";
import {
  useBulkOrdersData,
  STATUS_OPTIONS,
  type BulkOrder,
} from "./components/bulk/useBulkOrdersData";

export { STATUS_OPTIONS };
export type { BulkOrder };

export const BulkOrders = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === "ar";

  const {
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
    selectAll,
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
  } = useBulkOrdersData();

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BulkOrder | null>(null);
  const [viewingItem, setViewingItem] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteMultipleConfirm, setDeleteMultipleConfirm] = useState(false);
  const prevViewingItem = useRef<string | null>(null);

  const canCreate =
    user?.permissions?.some((p) => p === "bulkOrders.create" || p === "orders.bulk.create") ||
    (user?.role && ["SUPER_ADMIN", "COMPANY_ADMIN", "TEAM_LEADER"].includes(user.role));
  const canEdit = canCreate;
  const canDelete =
    user?.permissions?.some((p) => p === "bulkOrders.delete" || p === "orders.bulk.delete") ||
    (user?.role && ["SUPER_ADMIN", "COMPANY_ADMIN"].includes(user.role));

  useEffect(() => {
    if (prevViewingItem.current && !viewingItem) {
      fetchData();
    }
    prevViewingItem.current = viewingItem;
  }, [viewingItem, fetchData]);

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
      <BulkOrdersHeader
        selectedCount={selectedIds.length}
        canCreate={Boolean(canCreate)}
        canDelete={Boolean(canDelete)}
        onOpenCreateModal={() => {
          setEditingItem(null);
          setShowModal(true);
        }}
        onConfirmDeleteMultiple={() => setDeleteMultipleConfirm(true)}
      />

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
          canEdit={Boolean(canEdit)}
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
          onConfirm={async () => {
            await handleDelete(deleteConfirm);
            setDeleteConfirm(null);
          }}
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
          onConfirm={async () => {
            await handleDeleteMultiple();
            setDeleteMultipleConfirm(false);
          }}
          onCancel={() => setDeleteMultipleConfirm(false)}
          variant="danger"
        />
      )}
    </div>
  );
};

export default BulkOrders;
