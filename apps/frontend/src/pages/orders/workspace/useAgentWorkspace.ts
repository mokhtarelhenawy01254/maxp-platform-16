import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useOptionalAuth } from "../../../hooks/useAuthSimple";
import { useWorkspaceShortcuts } from "./useWorkspaceShortcuts";
import {
  FilterTab,
  PerspectiveMode,
  WorkspaceOrder,
  WorkspacePagination,
  WorkspaceStats,
} from "./types";
import {
  normalizeWorkspaceTab,
  getHoursSince,
  isOrderOverdue,
} from "./workspaceHelpers";
import { useWorkspaceSupervisor } from "./hooks/useWorkspaceSupervisor";
import { useWorkspaceOrderActions } from "./hooks/useWorkspaceOrderActions";
import { useWorkspaceOrdersFetcher } from "./hooks/useWorkspaceOrdersFetcher";

export { normalizeWorkspaceTab, getHoursSince, isOrderOverdue };

export function useAgentWorkspace() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth = useOptionalAuth();
  const user = auth?.user;

  const isArabic = i18n.language.toLowerCase().startsWith("ar");

  const isManager = useMemo(() => {
    const role = String(user?.role || "").toUpperCase();
    return ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER", "TEAM_LEADER"].includes(role);
  }, [user?.role]);

  const [orders, setOrders] = useState<WorkspaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [confirmationDisabled, setConfirmationDisabled] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<FilterTab>(() =>
    normalizeWorkspaceTab(searchParams.get("tab")),
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(() => {
    return searchParams.get("order") || null;
  });

  const perspective: PerspectiveMode = isManager ? "supervisor" : "operator";
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"recent" | "oldest" | "attempts">("recent");

  const [page, setPage] = useState<number>(() => {
    const rawPage = searchParams.get("page");
    const parsed = rawPage ? parseInt(rawPage, 10) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [pagination, setPagination] = useState<WorkspacePagination>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
  });

  const [selectedOrderForModal, setSelectedOrderForModal] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const ordersRef = useRef<WorkspaceOrder[]>(orders);
  const selectedOrderIdRef = useRef<string | null>(selectedOrderId);
  const activeTabRef = useRef<FilterTab>(activeTab);
  const isModalOpenRef = useRef(isModalOpen);
  const skipNextTabFetchRef = useRef(false);
  const activeTabHydratedRef = useRef(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const sortOptionRef = useRef(sortOption);
  const searchQueryRef = useRef(searchQuery);
  const selectedAgentIdRef = useRef<string | null>(null);

  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { selectedOrderIdRef.current = selectedOrderId; }, [selectedOrderId]);

  // Fetcher hook
  const { fetchOrders } = useWorkspaceOrdersFetcher({
    activeTabRef,
    sortOptionRef,
    selectedAgentIdRef,
    searchQueryRef,
    searchParams,
    isArabic,
    t,
    setOrders,
    setSelectedOrderId,
    setPage,
    setPagination,
    setStats,
    setLoading,
    setRefreshing,
    setLoadingMore,
    setFetchError,
    setLastFetchedAt,
    setConfirmationDisabled,
  });

  // Supervisor hook
  const {
    teamWorkload,
    loadingWorkload,
    isDistributing,
    selectedAgentId,
    fetchTeamWorkload,
    handleSelectAgent,
    handleAutoDistribute,
    handleAssignOrder,
  } = useWorkspaceSupervisor({
    isManager,
    isArabic,
    fetchOrders,
  });

  useEffect(() => { selectedAgentIdRef.current = selectedAgentId; }, [selectedAgentId]);

  // Actions hook
  const {
    busyOrders,
    cancellingOrder,
    setCancellingOrder,
    cancelReasonText,
    setCancelReasonText,
    followUpOrder,
    setFollowUpOrder,
    followUpDateValue,
    setFollowUpDateValue,
    confirmCancelOrder,
    handleSaveFollowUp,
    handleQuickAction,
    handleLogCall,
    handleConvertIncomplete,
    handleUpdateOrderItems,
    handleUpdateCustomer,
    handleUpdateRating,
  } = useWorkspaceOrderActions({
    ordersRef,
    selectedOrderIdRef,
    isManager,
    isArabic,
    t,
    setOrders,
    setSelectedOrderId,
    fetchOrders,
    fetchTeamWorkload,
  });

  const selectTab = useCallback(
    (nextTab: FilterTab) => {
      if (nextTab === activeTabRef.current) {
        void fetchOrders({ silent: false, tab: nextTab, page: 1 });
        return;
      }

      setActiveTab(nextTab);
      activeTabRef.current = nextTab;

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", nextTab);
      nextParams.delete("order");
      setSelectedOrderId(null);
      setSearchParams(nextParams, { replace: true });

      skipNextTabFetchRef.current = true;
      void fetchOrders({ silent: false, tab: nextTab, page: 1 });
    },
    [searchParams, setSearchParams],
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!query.trim()) {
      void fetchOrders({ silent: true, search: "", page: 1 });
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      void fetchOrders({ silent: true, search: query, page: 1 });
    }, 350);
  }, [fetchOrders]);

  useEffect(() => {
    void fetchOrders();
    if (isManager) void fetchTeamWorkload();

    let pollTick = 0;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !isModalOpenRef.current) {
        pollTick += 1;
        void fetchOrders({ silent: true, withStats: pollTick % 5 === 0 });
        if (isManager) void fetchTeamWorkload();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isManager]);

  useEffect(() => {
    const handleSettingsUpdated = () => {
      void fetchOrders({ silent: true });
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "order-confirmation-settings-updated-at") {
        void fetchOrders({ silent: true });
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchOrders({ silent: true });
      }
    };

    window.addEventListener("order-confirmation-settings-updated", handleSettingsUpdated);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("order-confirmation-settings-updated", handleSettingsUpdated);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { isModalOpenRef.current = isModalOpen; }, [isModalOpen]);
  useEffect(() => { sortOptionRef.current = sortOption; }, [sortOption]);
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);

  useEffect(() => {
    const nextTab = normalizeWorkspaceTab(searchParams.get("tab"));
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (!activeTabHydratedRef.current) {
      activeTabHydratedRef.current = true;
      return;
    }

    if (skipNextTabFetchRef.current) {
      skipNextTabFetchRef.current = false;
      return;
    }

    void fetchOrders({ silent: true });
  }, [activeTab]);

  const sortedOrders = useMemo(() => {
    if (activeTab !== "followup") return orders;
    return [...orders].sort((a, b) => {
      const av = a.followUpDate ? new Date(a.followUpDate).getTime() : Number.POSITIVE_INFINITY;
      const bv = b.followUpDate ? new Date(b.followUpDate).getTime() : Number.POSITIVE_INFINITY;
      return av - bv;
    });
  }, [orders, activeTab]);
  const filteredOrders = sortedOrders;

  const activeSelectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return filteredOrders[0] || null;
    }
    return filteredOrders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || null;
  }, [filteredOrders, selectedOrderId]);

  // Keyboard shortcuts
  useWorkspaceShortcuts({
    orders: filteredOrders,
    selectedOrderId: activeSelectedOrder?.id || null,
    onSelect: setSelectedOrderId,
    onConfirm: () => {
      if (activeSelectedOrder) {
        void handleQuickAction(activeSelectedOrder, "confirm");
      }
    },
    onLogCall: (result) => {
      if (activeSelectedOrder) {
        void handleLogCall(activeSelectedOrder, result);
      }
    },
    blocked: Boolean(cancellingOrder || followUpOrder || isModalOpen),
  });

  // Protect selection from stale orders after filter changes
  useEffect(() => {
    if (selectedOrderId && filteredOrders.length > 0 && !filteredOrders.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  // Synchronize URL query params
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    let changed = false;

    const currentOrderId = activeSelectedOrder?.id || null;
    if (currentOrderId && nextParams.get("order") !== currentOrderId) {
      nextParams.set("order", currentOrderId);
      changed = true;
    } else if (!currentOrderId && nextParams.has("order")) {
      nextParams.delete("order");
      changed = true;
    }

    if (page > 1 && nextParams.get("page") !== String(page)) {
      nextParams.set("page", String(page));
      changed = true;
    } else if (page <= 1 && nextParams.has("page")) {
      nextParams.delete("page");
      changed = true;
    }

    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeSelectedOrder?.id, page, searchParams, setSearchParams]);

  return {
    t,
    isArabic,
    isManager,
    orders: filteredOrders,
    rawOrdersCount: orders.length,
    selectedOrderId: activeSelectedOrder?.id || null,
    selectedOrder: activeSelectedOrder,
    setSelectedOrderId,
    loading,
    refreshing,
    loadingMore,
    fetchError,
    activeTab,
    selectTab,
    perspective,
    searchQuery,
    setSearchQuery,
    handleSearchChange,
    sortOption,
    setSortOption,
    lastFetchedAt,
    stats,
    pagination,
    page,
    busyOrders,
    cancellingOrder,
    setCancellingOrder,
    cancelReasonText,
    setCancelReasonText,
    confirmCancelOrder,
    followUpOrder,
    setFollowUpOrder,
    followUpDateValue,
    setFollowUpDateValue,
    handleSaveFollowUp,
    handleQuickAction,
    handleLogCall,
    fetchOrders,
    // Supervisor additions
    teamWorkload,
    loadingWorkload,
    isDistributing,
    selectedAgentId,
    handleSelectAgent,
    handleAutoDistribute,
    handleAssignOrder,
    handleConvertIncomplete,
    handleUpdateOrderItems,
    handleUpdateCustomer,
    handleUpdateRating,
    selectedOrderForModal,
    setSelectedOrderForModal,
    isModalOpen,
    setIsModalOpen,
    confirmationDisabled,
  };
}
