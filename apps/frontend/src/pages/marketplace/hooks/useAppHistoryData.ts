import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../services/apiClient";
import type {
  AppActivityLog,
  AppHistoryFilterType,
  AppHistoryStats,
  LogApiResponse,
} from "../types/appHistoryTypes";

export function useAppHistoryData() {
  const [logs, setLogs] = useState<AppActivityLog[]>([]);
  const [stats, setStats] = useState<AppHistoryStats>({
    totalInstalls: 0,
    totalUninstalls: 0,
    totalActions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<AppHistoryFilterType>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setLoading(true);

      try {
        const res = await apiClient.get<LogApiResponse>("/marketplace/logs", {
          params: {
            page,
            limit: 20,
            action: actionFilter !== "ALL" ? actionFilter : undefined,
            search: search.trim() || undefined,
          },
        });

        if (res.data?.success && res.data?.data) {
          setLogs(res.data.data.logs || []);
          setStats(
            res.data.data.stats || {
              totalInstalls: 0,
              totalUninstalls: 0,
              totalActions: 0,
            },
          );
          setTotalPages(res.data.data.pagination?.pages || 1);
          setTotalCount(res.data.data.pagination?.total || 0);
        }
      } catch (err) {
        console.error("Failed to fetch marketplace audit logs:", err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, actionFilter, search],
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleActionFilter = (filter: AppHistoryFilterType) => {
    setActionFilter(filter);
    setPage(1);
  };

  return {
    logs,
    stats,
    loading,
    isRefreshing,
    search,
    actionFilter,
    page,
    totalPages,
    totalCount,
    setPage,
    fetchLogs,
    handleSearchChange,
    handleActionFilter,
  };
}
