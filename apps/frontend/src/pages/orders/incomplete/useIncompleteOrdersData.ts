import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../../services/apiClient";
import type {
  IncompleteListResponse,
  IncompleteOrder,
  IncompleteStats,
} from "../incompleteUtils";
import type { SortValue, PhoneFilter } from "./IncompleteOrdersFilterBar";

export interface IncompleteListParams {
  page: number;
  limit: number;
  hasPhone?: boolean;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
}

export function useIncompleteOrdersData() {
  const { t } = useTranslation();

  const [orders, setOrders] = useState<IncompleteOrder[]>([]);
  const [serverStats, setServerStats] = useState<IncompleteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [phoneFilter, setPhoneFilter] = useState<PhoneFilter>("with_phone");
  const [sortValue, setSortValue] = useState<SortValue>("priority");
  const [refreshKey, setRefreshKey] = useState(0);

  const fallbackStats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "lost");
    const lost = orders.filter((o) => o.status === "lost");
    return {
      total: totalOrders,
      active: active.length,
      lost: lost.length,
      totalValue:
        active.reduce((s, o) => s + (o.total || 0), 0) +
        lost.reduce((s, o) => s + (o.total || 0), 0),
      activeValue: active.reduce((s, o) => s + (o.total || 0), 0),
      lostValue: lost.reduce((s, o) => s + (o.total || 0), 0),
    };
  }, [orders, totalOrders]);

  const stats = serverStats || fallbackStats;
  const statsAreServer = !!serverStats;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const buildParams = useCallback(
    (pageIndex: number, pageSize: number): IncompleteListParams => {
      const params: IncompleteListParams = {
        page: pageIndex,
        limit: pageSize,
      };
      if (phoneFilter === "with_phone") params.hasPhone = true;
      else if (phoneFilter === "no_phone") params.hasPhone = false;
      if (search) params.search = search;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (sortValue === "priority") {
        params.sortBy = "priority";
      } else if (sortValue === "recent") {
        params.sortBy = "checkoutUpdatedAt";
        params.sortDir = "desc";
      } else if (sortValue === "value_desc") {
        params.sortBy = "total";
        params.sortDir = "desc";
      } else if (sortValue === "value_asc") {
        params.sortBy = "total";
        params.sortDir = "asc";
      }
      return params;
    },
    [search, statusFilter, sortValue, phoneFilter]
  );

  useEffect(() => {
    const fetchIncompleteOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get<IncompleteListResponse>(
          "/orders-new/incomplete",
          {
            params: buildParams(page, limit),
          }
        );
        const data = response.data;

        if (data?.success) {
          setOrders(Array.isArray(data.data) ? data.data : []);
          setTotalOrders(data.pagination?.total || 0);
          setTotalPages(data.pagination?.pages || 1);
          setServerStats(data.stats || null);
        } else {
          setOrders([]);
          setTotalOrders(0);
          setTotalPages(1);
          setServerStats(null);
        }
      } catch (err: any) {
        const apiError = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        setError(apiError.response?.data?.message || t("orders.loadingOrders"));
      } finally {
        setLoading(false);
      }
    };

    fetchIncompleteOrders();
  }, [page, limit, buildParams, t, refreshKey]);

  const handleRetry = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    orders,
    setOrders,
    stats,
    statsAreServer,
    loading,
    error,
    page,
    setPage,
    limit,
    setLimit,
    totalOrders,
    totalPages,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    phoneFilter,
    setPhoneFilter,
    sortValue,
    setSortValue,
    buildParams,
    handleRetry,
  };
}

export default useIncompleteOrdersData;
