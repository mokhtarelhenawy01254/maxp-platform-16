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
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    includeAll,
    setIncludeAll,
    handleSetLast30Days,
    handleSetIncludeAll,
    counts,
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col gap-1 sm:gap-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("orders.ordersNeedingConfirmation", { defaultValue: "مركز التأكيد والمتابعة" })}
              </h1>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary border border-primary/20">
                {t("orders.total", { defaultValue: "المجموع:" })} {counts?.total ?? totalOrders}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("orders.ordersNeedingConfirmationDescEnabled", { defaultValue: "إدارة وتوزيع وتأكيد الطلبات الجديدة الواردة من القنوات المختلفة" })}
            </p>
          </div>
        </div>
      )}

      {/* Queue Status Tabs with Counts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: "", label: t("orders.all", { defaultValue: "الكل" }), count: counts?.total ?? totalOrders },
          { key: "pending", label: t("orders.pendingNew", { defaultValue: "قيد الانتظار" }), count: counts?.pending ?? 0 },
          { key: "confirmed", label: t("orders.confirmed", { defaultValue: "مؤكد" }), count: counts?.confirmed ?? 0 },
          { key: "postponed", label: t("orders.postponed", { defaultValue: "مؤجل" }), count: counts?.postponed ?? 0 },
          { key: "cancelled", label: t("orders.cancelled", { defaultValue: "ملغي" }), count: counts?.cancelled ?? 0 },
        ].map((tab) => {
          const isActive =
            statusFilter.toLowerCase() === tab.key.toLowerCase() ||
            (!statusFilter && tab.key === "pending");
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-background text-foreground border border-border/50"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

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
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        includeAll={includeAll}
        onSetLast30Days={handleSetLast30Days}
        onSetIncludeAll={handleSetIncludeAll}
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
