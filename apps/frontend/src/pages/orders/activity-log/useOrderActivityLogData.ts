import { useState, useEffect, useCallback } from "react";
import orderWorkflowService, {
  AuditLogFilters,
} from "../../../services/orderWorkflowService";
import type { ActorOption } from "./ActivityLogFilterBar";
import type { LogItem } from "./ActivityLogTimelineView";

const PAGE_SIZE = 30;

export function useOrderActivityLogData() {
  // Filters
  const [selectedActorId, setSelectedActorId] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [changeType, setChangeType] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<
    "ALL" | "TODAY" | "7DAYS" | "30DAYS"
  >("ALL");
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");

  // Data State
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [serverStats, setServerStats] = useState<{
    total: number;
    todayCount: number;
  }>({
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
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString();
      return { startDate: start, endDate: now.toISOString() };
    }
    if (datePreset === "7DAYS") {
      const start = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      return { startDate: start, endDate: now.toISOString() };
    }
    if (datePreset === "30DAYS") {
      const start = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();
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

        const res = await orderWorkflowService.getGlobalAuditLogs(
          PAGE_SIZE,
          currentOffset,
          filters
        );
        const fetchedLogs = Array.isArray(res.data) ? res.data : [];

        if (isLoadMore) {
          setLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const uniqueNew = fetchedLogs.filter(
              (l: LogItem) => !existingIds.has(l.id)
            );
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
      const dateStr = d.toLocaleDateString("ar-EG", {
        day: "numeric",
        month: "short",
      });

      return { relative, timeStr, dateStr };
    } catch {
      return { relative: "", timeStr: dateString, dateStr: "" };
    }
  };

  return {
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
  };
}

export default useOrderActivityLogData;
