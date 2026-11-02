import React from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import PostponeOrderModal from "./components/PostponeOrderModal";
import { useConfirmationQueueData } from "./confirmation/useConfirmationQueueData";
import { ConfirmationQueueFilterBar } from "./confirmation/ConfirmationQueueFilterBar";
import { ConfirmationQueueMobileModal } from "./confirmation/ConfirmationQueueMobileModal";
import { ConfirmationTeamReportRibbon } from "./confirmation/ConfirmationTeamReportRibbon";
import { ConfirmationBatchActionBar } from "./confirmation/ConfirmationBatchActionBar";
import { ConfirmationQueueDisabledState } from "./confirmation/ConfirmationQueueDisabledState";
import { ConfirmationCancelModal } from "./confirmation/ConfirmationCancelModal";
import { ConfirmationOrdersVirtualList } from "./confirmation/ConfirmationOrdersVirtualList";
import { ConfirmationPagination } from "./confirmation/ConfirmationPagination";

export interface OrderConfirmationQueueProps {
  embedded?: boolean;
}

export const OrderConfirmationQueue: React.FC<OrderConfirmationQueueProps> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const {
    settings,
    isConfirmationDisabled,
    orders,
    loading,
    page,
    setPage,
    totalPages,
    totalOrders,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    onlyUnassigned,
    setOnlyUnassigned,
    stats,
    statsLoading,
    statsStartDate,
    setStatsStartDate,
    statsEndDate,
    setStatsEndDate,
    statsStrategy,
    setStatsStrategy,
    strategyOptions,
    strategyLabelMap,
    statsSummaryLabel,
    setStatsRefreshKey,
    eligibleUsers,
    assignSelections,
    assigningId,
    cancellingId,
    callingId,
    selectedOrderIds,
    setSelectedOrderIds,
    bulkUserId,
    setBulkUserId,
    bulkProcessing,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    cancelTarget,
    setCancelTarget,
    cancelReason,
    setCancelReason,
    postponeTarget,
    setPostponeTarget,
    postponeLoading,
    sourceOptions,
    statusOptions,
    activeQueueFilterCount,
    statusFilterLabel,
    sourceFilterLabel,
    appliedFilters,
    resetQueueFilters,
    handleConfirm,
    handlePrintSlip,
    handlePrintInvoice,
    handleCancel,
    submitCancel,
    handleLogCall,
    handlePostpone,
    handleAssign,
    handleAssignChange,
    handleToggleSelect,
    handleToggleSelectAll,
    handleBulkConfirm,
    handleBulkAssign,
  } = useConfirmationQueueData();

  const selectedCount = selectedOrderIds.length;
  const allSelected = orders.length > 0 && selectedCount === orders.length;

  if (isConfirmationDisabled) {
    return <ConfirmationQueueDisabledState embedded={embedded} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir="rtl">
      {!embedded && (
        <div className="flex flex-col gap-1 sm:gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t("orders.ordersNeedingConfirmation", { defaultValue: "طلبات تحتاج إلى تأكيد" })}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("orders.ordersNeedingConfirmationDescEnabled", { defaultValue: "إدارة وتوزيع وتأكيد الطلبات الجديدة الواردة من القنوات المختلفة" })}
          </p>
        </div>
      )}

      {/* Filter Bar */}
      <ConfirmationQueueFilterBar
        appliedFilters={appliedFilters}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        onlyUnassigned={onlyUnassigned}
        setOnlyUnassigned={setOnlyUnassigned}
        statusOptions={statusOptions}
        sourceOptions={sourceOptions}
        activeQueueFilterCount={activeQueueFilterCount}
        statusFilterLabel={statusFilterLabel}
        sourceFilterLabel={sourceFilterLabel}
        onOpenMobileFilters={() => setMobileFiltersOpen(true)}
        setPage={setPage}
      />

      {/* Mobile Slide-up Drawer Modal */}
      <ConfirmationQueueMobileModal
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        onlyUnassigned={onlyUnassigned}
        setOnlyUnassigned={setOnlyUnassigned}
        statusOptions={statusOptions}
        sourceOptions={sourceOptions}
        resetQueueFilters={resetQueueFilters}
        setPage={setPage}
      />

      {/* Team Report & Statistics Ribbon */}
      <ConfirmationTeamReportRibbon
        stats={stats}
        statsLoading={statsLoading}
        statsStartDate={statsStartDate}
        setStatsStartDate={setStatsStartDate}
        statsEndDate={statsEndDate}
        setStatsEndDate={setStatsEndDate}
        statsStrategy={statsStrategy}
        setStatsStrategy={setStatsStrategy}
        strategyOptions={strategyOptions}
        statsSummaryLabel={statsSummaryLabel}
        setStatsRefreshKey={setStatsRefreshKey}
      />

      {/* Batch Assignment & Actions Bar */}
      {settings?.enabled && orders.length > 0 && (
        <ConfirmationBatchActionBar
          allSelected={allSelected}
          selectedCount={selectedCount}
          bulkUserId={bulkUserId}
          setBulkUserId={setBulkUserId}
          bulkProcessing={bulkProcessing}
          eligibleUsers={eligibleUsers}
          onToggleSelectAll={handleToggleSelectAll}
          onDeselectAll={() => setSelectedOrderIds([])}
          onBulkAssign={handleBulkAssign}
          onBulkConfirm={handleBulkConfirm}
        />
      )}

      {/* Orders List / Virtualized Table */}
      <ConfirmationOrdersVirtualList
        orders={orders}
        loading={loading}
        settings={settings}
        assignSelections={assignSelections}
        eligibleUsers={eligibleUsers}
        assigningId={assigningId}
        cancellingId={cancellingId}
        callingId={callingId}
        selectedOrderIds={selectedOrderIds}
        formatDate={formatDate}
        formatPrice={formatPrice}
        strategyLabelMap={strategyLabelMap}
        onAssignChange={handleAssignChange}
        onAssign={handleAssign}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onLogCall={handleLogCall}
        onPostpone={(o) => setPostponeTarget(o)}
        onToggleSelect={handleToggleSelect}
        onPrintSlip={handlePrintSlip}
        onPrintInvoice={handlePrintInvoice}
      />

      {/* Pagination Controls */}
      <ConfirmationPagination
        page={page}
        totalPages={totalPages}
        ordersCount={orders.length}
        totalOrders={totalOrders}
        onPageChange={setPage}
      />

      {/* Cancellation Reason Modal */}
      <ConfirmationCancelModal
        cancelTarget={cancelTarget}
        cancelReason={cancelReason}
        cancellingId={cancellingId}
        onClose={() => setCancelTarget(null)}
        onReasonChange={setCancelReason}
        onSubmit={submitCancel}
      />

      {/* Postpone Modal */}
      <PostponeOrderModal
        isOpen={Boolean(postponeTarget)}
        onClose={() => setPostponeTarget(null)}
        onConfirm={handlePostpone}
        loading={postponeLoading}
      />
    </div>
  );
};

export default OrderConfirmationQueue;
