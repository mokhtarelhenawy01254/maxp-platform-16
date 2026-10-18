import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";

export interface TurboLiveStatus {
  status: string;
  statusCode: number;
  internalStatus: string;
  captain: string | null;
  captainNumber1: string | null;
  branch: string | null;
  receivedAmount: string | null;
  returnReason: string | null;
  delayReason: string | null;
}

export interface TurboOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  turboShipmentId?: string;
  turboTrackingNumber?: string;
  turboShipmentStatus?: string;
  turboLiveStatus?: TurboLiveStatus | null;
  turboCaptainName?: string;
  turboCaptainPhone?: string;
  turboBranchName?: string;
  turboBranchPhone?: string;
  turboDelayReason?: string | null;
  turboReturnReason?: string | null;
  governorate?: string;
  city?: string;
  createdAt: string;
}

export function useTurboRecordsData() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<TurboOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingStatuses, setRefreshingStatuses] = useState(false);
  const [creatingShipments, setCreatingShipments] = useState(false);
  const [serverStatusCounts, setServerStatusCounts] = useState<
    Record<string, number>
  >({});

  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [limit, setLimit] = useState(
    parseInt(searchParams.get("limit") || "20")
  );
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [filterType, setFilterType] = useState<string>(
    searchParams.get("filterType") || "all"
  );

  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const updateUrlParams = useCallback(
    (newParams: Record<string, string>) => {
      const params = Object.fromEntries(searchParams.entries());
      Object.assign(params, newParams);
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const fetchOrders = useCallback(
    async (currentSearch = searchQuery) => {
      setLoading(true);
      try {
        const params: any = {
          page: page.toString(),
          limit: limit.toString(),
          search: currentSearch,
          filterType,
        };

        const response = await apiClient.get("/turbo/records", { params });

        if (response.data.success) {
          setOrders(response.data.data || []);
          if (response.data.statusCounts) {
            setServerStatusCounts(response.data.statusCounts);
          }
          if (response.data.pagination) {
            setTotalPages(response.data.pagination.pages || 1);
            setTotalOrders(response.data.pagination.total || 0);
          }
        }
      } catch (error) {
        console.error("Error fetching Turbo records:", error);
        toast.error(t("orders.fetchError", "Failed to load orders"));
      } finally {
        setLoading(false);
      }
    },
    [page, limit, filterType, searchQuery, t]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchClick = () => {
    setPage(1);
    updateUrlParams({ search: searchQuery, page: "1", filterType });
    fetchOrders(searchQuery);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilterType(newFilter);
    setPage(1);
    updateUrlParams({ filterType: newFilter, page: "1", search: searchQuery });
  };

  const toggleOrderSelection = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id)
        ? prev.filter((orderId) => orderId !== id)
        : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (orders.length === 0) return;
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((o) => o.id));
    }
  };

  const handleBulkCreateShipments = async () => {
    if (selectedOrders.length === 0)
      return toast.error("Select orders first");
    if (
      !window.confirm(
        `Are you sure you want to send ${selectedOrders.length} orders to Turbo?`
      )
    )
      return;

    setCreatingShipments(true);
    try {
      const response = await apiClient.post(
        "/turbo/bulk/create-shipments",
        { orderIds: selectedOrders }
      );
      if (response.data.success) {
        toast.success(
          t(
            "orders.turboRecordsBulkSuccess",
            "Created shipments successfully"
          )
        );
        setSelectedOrders([]);
        fetchOrders();
      } else {
        toast.error(response.data.message || "Failed to create shipments");
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        t("orders.turboRecordsBulkError", "Failed to create shipments");
      toast.error(errorMsg);
    } finally {
      setCreatingShipments(false);
    }
  };

  const handleRefreshStatuses = async () => {
    setRefreshingStatuses(true);
    try {
      const params: any = {
        page: page.toString(),
        limit: limit.toString(),
        search: searchQuery,
        filterType,
        refresh: "true",
      };
      const response = await apiClient.get("/turbo/records", { params });
      if (response.data.success) {
        setOrders(response.data.data || []);
        if (response.data.statusCounts) {
          setServerStatusCounts(response.data.statusCounts);
        }
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages || 1);
          setTotalOrders(response.data.pagination.total || 0);
        }
        toast.success(t("orders.statusUpdated", t("orders.k_1")));
      }
    } catch (err) {
      toast.error(t("orders.updateError", t("orders.k_2")));
    } finally {
      setRefreshingStatuses(false);
    }
  };

  const getStatusCount = (key: string) => {
    if (key === "all") return totalOrders;
    if (serverStatusCounts[key] !== undefined) return serverStatusCounts[key];
    return orders.filter(
      (o) => (o.turboShipmentStatus || "unshipped").toLowerCase() === key
    ).length;
  };

  return {
    orders,
    loading,
    refreshingStatuses,
    creatingShipments,
    page,
    setPage,
    limit,
    setLimit,
    searchQuery,
    setSearchQuery,
    filterType,
    totalPages,
    totalOrders,
    selectedOrders,
    updateUrlParams,
    fetchOrders,
    handleSearchClick,
    handleFilterChange,
    toggleOrderSelection,
    toggleAllSelection,
    handleBulkCreateShipments,
    handleRefreshStatuses,
    getStatusCount,
  };
}

export default useTurboRecordsData;
