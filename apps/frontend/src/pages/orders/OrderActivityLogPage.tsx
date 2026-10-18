import React from "react";
import { RotateCw } from "lucide-react";
import { ActivityLogHeader } from "./activity-log/ActivityLogHeader";
import { ActivityLogStatsGrid } from "./activity-log/ActivityLogStatsGrid";
import { ActivityLogFilterBar } from "./activity-log/ActivityLogFilterBar";
import { ActivityLogTimelineView } from "./activity-log/ActivityLogTimelineView";
import { ActivityLogTableView } from "./activity-log/ActivityLogTableView";
import { ActivityLogEmptyState } from "./activity-log/ActivityLogEmptyState";
import { useOrderActivityLogData } from "./activity-log/useOrderActivityLogData";

export const OrderActivityLogPage: React.FC = () => {
  const {
    selectedActorId,
    setSelectedActorId,
    orderNumber,
    setOrderNumber,
    changeType,
    setChangeType,
    datePreset,
    setDatePreset,
    viewMode,
    setViewMode,
    logs,
    totalCount,
    serverStats,
    loading,
    loadingMore,
    hasMore,
    actors,
    copiedOrderId,
    isFilterActive,
    fetchLogs,
    handleSearchSubmit,
    handleResetFilters,
    handleCopy,
    formatTimestamp,
  } = useOrderActivityLogData();

  return (
    <div
      className="flex flex-col h-full min-h-0 bg-background text-foreground select-none"
      dir="rtl"
    >
      {/* Top Header */}
      <ActivityLogHeader
        totalCount={totalCount}
        loading={loading}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onRefresh={() => fetchLogs(false)}
      />

      {/* Stats Summary Bar */}
      <ActivityLogStatsGrid
        totalCount={totalCount}
        todayCount={serverStats.todayCount || 0}
        actorsCount={actors.length}
        displayedCount={logs.length}
      />

      {/* Filter Bar */}
      <ActivityLogFilterBar
        orderNumber={orderNumber}
        setOrderNumber={setOrderNumber}
        onSearchSubmit={handleSearchSubmit}
        onClearOrderSearch={() => {
          setOrderNumber("");
          fetchLogs(false);
        }}
        selectedActorId={selectedActorId}
        setSelectedActorId={setSelectedActorId}
        actors={actors}
        changeType={changeType}
        setChangeType={setChangeType}
        datePreset={datePreset}
        setDatePreset={setDatePreset}
        isFilterActive={isFilterActive}
        onResetFilters={handleResetFilters}
      />

      {/* Main Content Area (Single Surface, Edge-to-Edge) */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
        {logs.length === 0 ? (
          <ActivityLogEmptyState
            loading={loading}
            isFilterActive={isFilterActive}
            onResetFilters={handleResetFilters}
          />
        ) : viewMode === "timeline" ? (
          <ActivityLogTimelineView
            logs={logs}
            copiedOrderId={copiedOrderId}
            onCopy={handleCopy}
            formatTimestamp={formatTimestamp}
          />
        ) : (
          <ActivityLogTableView logs={logs} formatTimestamp={formatTimestamp} />
        )}

        {/* Load More Button */}
        {hasMore && logs.length > 0 && (
          <div className="pt-4 pb-8 flex items-center justify-center">
            <button
              type="button"
              onClick={() => fetchLogs(true)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium bg-card hover:bg-muted border border-border/70 text-foreground shadow-xs transition active:scale-[0.98] disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>جاري التحميل...</span>
                </>
              ) : (
                <>
                  <span>تحميل المزيد من الحركات</span>
                  <span className="text-muted-foreground font-mono tabular-nums text-[11px]">
                    ({logs.length} من {totalCount.toLocaleString("ar-EG")})
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default OrderActivityLogPage;
