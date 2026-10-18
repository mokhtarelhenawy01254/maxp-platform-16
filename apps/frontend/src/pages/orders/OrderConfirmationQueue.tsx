import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import PostponeOrderModal from "./components/PostponeOrderModal";
import { useConfirmationQueueData } from "./confirmation/useConfirmationQueueData";
import { ConfirmationOrderRow } from "./confirmation/ConfirmationOrderRow";
import { ConfirmationQueueFilterBar } from "./confirmation/ConfirmationQueueFilterBar";
import { ConfirmationQueueMobileModal } from "./confirmation/ConfirmationQueueMobileModal";
import { ConfirmationTeamReportRibbon } from "./confirmation/ConfirmationTeamReportRibbon";
import { ConfirmationBatchActionBar } from "./confirmation/ConfirmationBatchActionBar";

export interface OrderConfirmationQueueProps {
  embedded?: boolean;
}

export const OrderConfirmationQueue: React.FC<OrderConfirmationQueueProps> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const listParentRef = useRef<HTMLDivElement>(null);

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

  const rowVirtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 170,
    overscan: 6,
  });

  if (isConfirmationDisabled) {
    return (
      <div className="space-y-4 sm:space-y-6" dir="rtl">
        {!embedded && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("orders.ordersNeedingConfirmation", { defaultValue: "طلبات تحتاج إلى تأكيد" })}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {t("orders.ordersNeedingConfirmationDescDisabled", { defaultValue: "المركز مقفول من الإعدادات حالياً" })}
              </p>
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <ExclamationTriangleIcon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                المركز مقفول من الإعدادات
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                تم إيقاف مركز التأكيد من إعدادات الطلبات، ولن تظهر أي طلبات في قائمة التأكيد حتى يتم تفعيله.
              </p>
              <div className="pt-3">
                <Link
                  to="/settings/orders?tab=confirmation"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-amber-700 active:scale-95"
                >
                  <span>فتح إعدادات مركز التأكيد</span>
                  <span dir="ltr">←</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs sm:text-sm text-muted-foreground sm:p-10">
            {t("orders.loadingOrders", { defaultValue: "جاري تحميل قائمة الطلبات..." })}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-center sm:p-10">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div className="font-bold text-foreground text-sm sm:text-base">
              {t("orders.everythingUnderControl", { defaultValue: "كل شيء تحت السيطرة" })}
            </div>
            <div className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {t("orders.noOrdersNeedConfirmation", { defaultValue: "لا توجد طلبات تحتاج إلى تأكيد حالياً" })}
            </div>
          </div>
        ) : (
          <div ref={listParentRef} className="max-h-[70vh] overflow-auto">
            <div
              className="relative w-full"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const order = orders[virtualRow.index];
                if (!order) return null;
                return (
                  <div
                    key={order.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="border-b border-border/60 last:border-b-0"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <ConfirmationOrderRow
                      order={order}
                      assignValue={assignSelections[order.id] || ""}
                      eligibleUsers={eligibleUsers}
                      assigningId={assigningId}
                      cancellingId={cancellingId}
                      callingId={callingId}
                      maxCallsNoAnswer={settings?.maxCallsNoAnswer ?? 3}
                      intervalMinutes={settings?.intervalMinutes ?? 30}
                      settingsEnabled={Boolean(settings?.enabled)}
                      selectionEnabled={Boolean(settings?.enabled)}
                      isSelected={selectedOrderIds.includes(order.id)}
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground px-1">
          <span className="font-mono tabular-nums">
            {t("orders.showingFrom", { count: orders.length, total: totalOrders, defaultValue: `عرض ${orders.length} من ${totalOrders} طلب` })}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-1.5 border border-border/70 rounded-xl bg-background text-foreground disabled:opacity-40 active:scale-95 transition-all text-xs font-semibold"
            >
              {t("orders.previous", { defaultValue: "السابق" })}
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 border border-border/70 rounded-xl bg-background text-foreground disabled:opacity-40 active:scale-95 transition-all text-xs font-semibold"
            >
              {t("orders.next", { defaultValue: "التالي" })}
            </button>
          </div>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setCancelTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-3 text-sm sm:text-base font-bold text-foreground">
              {t("orders.cancelReasonPrompt", { defaultValue: "اكتب سبب إلغاء هذا الطلب:" })}
            </h2>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder={String(t("orders.cancelReasonPlaceholder", { defaultValue: "اكتب سبب الإلغاء..." }))}
              rows={3}
              className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20 transition-all"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-xl border border-border/70 bg-background px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
              >
                {t("orders.cancelClose", { defaultValue: "إغلاق" })}
              </button>
              <button
                type="button"
                onClick={submitCancel}
                disabled={!cancelReason.trim() || cancellingId === cancelTarget.id}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs active:scale-95 transition-all"
              >
                {cancellingId === cancelTarget.id
                  ? t("orders.cancellingOrder", { defaultValue: "جاري الإلغاء..." })
                  : t("orders.cancelConfirm", { defaultValue: "تأكيد الإلغاء" })}
              </button>
            </div>
          </div>
        </div>
      )}

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
