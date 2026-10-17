import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Clock, RotateCw } from "lucide-react";
import orderWorkflowService, { AuditLogFilters } from "../../services/orderWorkflowService";
import { ActivityLogHeader } from "./activity-log/ActivityLogHeader";
import { ActivityLogStatsGrid } from "./activity-log/ActivityLogStatsGrid";
import { ActivityLogFilterBar, ActorOption } from "./activity-log/ActivityLogFilterBar";
import { ActivityLogTimelineView, LogItem } from "./activity-log/ActivityLogTimelineView";
import { ActivityLogTableView } from "./activity-log/ActivityLogTableView";

const PAGE_SIZE = 30;

export const OrderActivityLogPage: React.FC = () => {
  const { t } = useTranslation();

  // Filters
  const [selectedActorId, setSelectedActorId] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [changeType, setChangeType] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "7DAYS" | "30DAYS">("ALL");
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");

  // Data State
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [serverStats, setServerStats] = useState<{ total: number; todayCount: number }>({
    total: 0,
    todayCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Actors / Employees List
  const [actors, setActors] = useState<ActorOption[]>([]);
  const [, setLoadingActors] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Fetch Actors on Mount
  useEffect(() => {
    const fetchActors = async () => {
      try {
        setLoadingActors(true);
        const res = await orderWorkflowService.getAuditActors();
        if (res?.success && Array.isArray(res?.data)) {
          setActors(res.data);
        }
      } catch (err) {
        console.error("[OrderActivityLogPage] Error fetching actors:", err);
      } finally {
        setLoadingActors(false);
      }
    };

    fetchActors();
  }, []);

  // Date Range calculation based on Preset
  const getDateRange = useCallback(() => {
    const now = new Date();
    if (datePreset === "TODAY") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      return { startDate: start, endDate: now.toISOString() };
    }
    if (datePreset === "7DAYS") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { startDate: start, endDate: now.toISOString() };
    }
    if (datePreset === "30DAYS") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { startDate: start, endDate: now.toISOString() };
    }
    return {};
  }, [datePreset]);

  // Fetch Logs
  const fetchLogs = useCallback(
    async (isLoadMore = false) => {
      const currentOffset = isLoadMore ? offset : 0;
      const currentCursor = isLoadMore ? cursor || undefined : undefined;
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const dateRange = getDateRange();
        const filters: AuditLogFilters = {
          userId: selectedActorId || undefined,
          changeType: changeType !== "ALL" ? changeType : undefined,
          orderNumber: orderNumber.trim() || undefined,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          cursor: currentCursor,
        };

        const res = await orderWorkflowService.getGlobalAuditLogs(PAGE_SIZE, currentOffset, filters);
        const fetchedLogs = Array.isArray(res.data) ? res.data : [];

        if (isLoadMore) {
          setLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const uniqueNew = fetchedLogs.filter((l: LogItem) => !existingIds.has(l.id));
            return [...prev, ...uniqueNew];
          });
          setOffset((prev) => prev + fetchedLogs.length);
        } else {
          setLogs(fetchedLogs);
          setOffset(fetchedLogs.length);
        }

        if (res.nextCursor !== undefined) {
          setCursor(res.nextCursor);
        }

        if (typeof res.total === "number") {
          setTotalCount(res.total);
          setHasMore(
            currentOffset + fetchedLogs.length < res.total &&
              (res.nextCursor !== null || fetchedLogs.length >= PAGE_SIZE)
          );
        } else {
          setHasMore(fetchedLogs.length >= PAGE_SIZE);
        }

        if (res.stats) {
          setServerStats(res.stats);
        }
      } catch (err) {
        console.error("[OrderActivityLogPage] Error fetching audit logs:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedActorId, changeType, orderNumber, getDateRange, offset, cursor]
  );

  // Refetch on primary filter change
  useEffect(() => {
    fetchLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActorId, changeType, datePreset]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(false);
  };

  const handleResetFilters = () => {
    setSelectedActorId("");
    setOrderNumber("");
    setChangeType("ALL");
    setDatePreset("ALL");
    setCursor(null);
  };

  const isFilterActive =
    selectedActorId !== "" ||
    orderNumber.trim() !== "" ||
    changeType !== "ALL" ||
    datePreset !== "ALL";

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const formatTimestamp = (dateString: string) => {
    try {
      const d = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let relative = "";
      if (diffMins < 1) relative = "الآن";
      else if (diffMins < 60) relative = `منذ ${diffMins} د`;
      else if (diffHours < 24) relative = `منذ ${diffHours} س`;
      else relative = `منذ ${diffDays} يوم`;

      const timeStr = d.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const dateStr = d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });

      return { relative, timeStr, dateStr };
    } catch {
      return { relative: "", timeStr: dateString, dateStr: "" };
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background text-foreground select-none" dir="rtl">
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
        {loading && logs.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <RotateCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-mono">جاري تحميل سجل الحركات الحية...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed border-border/70 rounded-xl my-4">
            <Clock className="w-10 h-10 stroke-[1.25] text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">لا توجد حركات مطابقة للبحث</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              جرب تغيير شروط الفلترة أو تفريغ البحث برقم الطلب لعرض كافة الحركات المسجلة.
            </p>
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-card border border-border/70 hover:bg-muted text-foreground transition-colors"
              >
                إظهار كافة الحركات
              </button>
            )}
          </div>
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
