import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useReorderPointsController } from "./components/reorder/useReorderPointsController";
import { ReorderMetricsGrid } from "./components/reorder/ReorderMetricsGrid";
import { ReorderFilterBar } from "./components/reorder/ReorderFilterBar";
import { ReorderPointsTable } from "./components/reorder/ReorderPointsTable";
import { ReorderBulkActions } from "./components/reorder/ReorderBulkActions";

export const ReorderPointsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    view,
    setView,
    items,
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
  } = useReorderPointsController();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
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
            <Button variant="outline" onClick={exportCsv} className="gap-2 cursor-pointer">
              <ArrowDownTrayIcon className="h-4 w-4" />
              {t("reorderPoints.export", "تصدير CSV")}
            </Button>
            <Button variant="outline" onClick={() => fetchData()} className="gap-2 cursor-pointer">
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("reorderPoints.refresh", "تحديث")}
            </Button>
          </div>
        </div>

        {/* Telemetry Metric KPI Cards */}
        <ReorderMetricsGrid cards={metricCards} loading={loading} />

        {/* Filters and View Mode Switcher */}
        <ReorderFilterBar
          view={view}
          onViewChange={setView}
          search={search}
          onSearchChange={setSearch}
          stockFilter={stockFilter}
          onStockFilterChange={setStockFilter}
        />

        {/* Items Table & Bulk Operations Card */}
        <Card>
          <CardContent className="pt-6">
            <ReorderPointsTable
              items={items}
              view={view}
              loading={loading}
              selectedIds={selectedIds}
              editingId={editingId}
              editValue={editValue}
              savingId={savingId}
              sortBy={sortBy}
              sortDir={sortDir}
              onToggleAll={toggleAll}
              onToggleSelection={toggleSelection}
              onStartEdit={startEdit}
              onSaveSingle={saveSingle}
              onCancelEdit={() => setEditingId(null)}
              onEditValueChange={setEditValue}
              onToggleSort={toggleSort}
              rowKey={rowKey}
              hasInventory={hasInventory}
            />

            {items.length > 0 && (
              <ReorderBulkActions
                selectedCount={selectedIds.size}
                bulkValue={bulkValue}
                onBulkValueChange={setBulkValue}
                onApplyBulk={saveBulk}
                bulkBusy={bulkBusy}
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={changePage}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReorderPointsPage;
