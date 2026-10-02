import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../services/apiClient';
import { toast } from 'sonner';
import {
  FilterTab,
  OrderAction,
  PerspectiveMode,
  WORKSPACE_TAB_KEYS,
  WorkspaceOrder,
  WorkspacePagination,
  WorkspaceStats,
} from './types';

interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
      error?: string | { message?: string };
    };
  };
  message?: string;
}

function extractApiErrorMessage(error: unknown): string | null {
  const apiError = error as ApiErrorShape;
  const responseError = apiError.response?.data?.error;

  if (typeof responseError === 'string' && responseError.trim()) {
    return responseError;
  }

  if (
    typeof responseError === 'object' &&
    responseError !== null &&
    typeof responseError.message === 'string' &&
    responseError.message.trim()
  ) {
    return responseError.message;
  }

  if (
    typeof apiError.response?.data?.message === 'string' &&
    apiError.response.data.message.trim()
  ) {
    return apiError.response.data.message;
  }

  if (typeof apiError.message === 'string' && apiError.message.trim()) {
    return apiError.message;
  }

  return null;
}

function normalizeWorkspaceTab(value: string | null): FilterTab {
  return WORKSPACE_TAB_KEYS.includes(value as FilterTab)
    ? (value as FilterTab)
    : 'all';
}

function getHoursSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

export function isOrderOverdue(order: WorkspaceOrder): boolean {
  const status = String(order.status || 'PENDING').toUpperCase();
  if (status !== 'PENDING') {
    return false;
  }

  if (order.callAttempts === 0 && getHoursSince(order.createdAt) > 24) return true;
  if (order.callAttempts > 0 && getHoursSince(order.lastCallAt) > 12) return true;
  return false;
}

export function useAgentWorkspace() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<WorkspaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<FilterTab>(() =>
    normalizeWorkspaceTab(searchParams.get('tab')),
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<PerspectiveMode>('operator');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'recent' | 'oldest' | 'attempts'>('recent');
  const [autoAdvance, setAutoAdvance] = useState(true);

  const [busyOrders, setBusyOrders] = useState<Record<string, OrderAction>>({});
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [pagination, setPagination] = useState<WorkspacePagination>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
  });

  const [cancellingOrder, setCancellingOrder] = useState<WorkspaceOrder | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [followUpOrder, setFollowUpOrder] = useState<WorkspaceOrder | null>(null);
  const [followUpDateValue, setFollowUpDateValue] = useState('');

  const [selectedOrderForModal, setSelectedOrderForModal] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeTabRef = useRef<FilterTab>(activeTab);
  const isModalOpenRef = useRef(isModalOpen);
  const skipNextTabFetchRef = useRef(false);
  const activeTabHydratedRef = useRef(false);

  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const setOrderBusyState = (orderId: string, action: OrderAction | null) => {
    setBusyOrders((current) => {
      const next = { ...current };
      if (action) {
        next[orderId] = action;
      } else {
        delete next[orderId];
      }
      return next;
    });
  };

  const selectTab = useCallback((nextTab: FilterTab) => {
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'all') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    setSearchParams(nextParams, { replace: true });

    if (nextTab === 'confirmation') {
      return;
    }

    skipNextTabFetchRef.current = true;
    void fetchOrders({ silent: true, tab: nextTab });
  }, [searchParams, setSearchParams]);

  const fetchOrders = async (options?: {
    silent?: boolean;
    page?: number;
    append?: boolean;
    tab?: FilterTab;
    sort?: 'recent' | 'oldest' | 'attempts';
  }) => {
    const {
      silent = false,
      page: targetPage = 1,
      append = false,
      tab,
      sort: targetSort,
    } = options || {};

    const activeTabForRequest = tab ?? activeTabRef.current;
    const resolvedSort = targetSort ?? (activeTabForRequest === 'pending' ? 'oldest' : sortOption);

    try {
      if (append) {
        setLoadingMore(true);
      } else if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params: Record<string, string | number> = {
        page: targetPage,
        limit: 50,
        withStats: 1,
        sort: resolvedSort,
      };

      switch (activeTabForRequest) {
        case 'pending':
          params['status'] = 'PENDING';
          break;
        case 'confirmed':
          params['status'] = 'CONFIRMED';
          break;
        case 'cancelled':
          params['status'] = 'CANCELLED';
          break;
        case 'followup':
          params['followUpOnly'] = 'true';
          break;
        case 'all':
        default:
          break;
      }

      const response = await apiClient.get('/agent-workspace/my-orders', { params });
      const payload = response.data as any;

      if (!payload?.success) {
        throw new Error(
          (typeof payload?.error === 'string' && payload.error) ||
            payload?.message ||
            t('orders.loadingFailed'),
        );
      }

      const nextOrders: WorkspaceOrder[] = Array.isArray(payload?.data)
        ? payload.data
        : [];

      const paginationData: any = payload?.pagination;
      const nextTotal = Number(paginationData?.total) || 0;
      const nextPages = Number(paginationData?.pages) || 1;
      const nextPage = Number(paginationData?.page) || targetPage;

      if (append) {
        setOrders((prev) => {
          const byId = new Map(prev.map((o) => [o.id, o]));
          nextOrders.forEach((o) => byId.set(o.id, o));
          return Array.from(byId.values());
        });
      } else {
        setOrders(nextOrders);
        if (nextOrders.length > 0) {
          setSelectedOrderId((prev) => {
            if (prev && nextOrders.some((o) => o.id === prev)) {
              return prev;
            }
            return nextOrders[0].id;
          });
        } else {
          setSelectedOrderId(null);
        }
      }

      setPage(append ? nextPage : 1);
      setPagination({
        total: nextTotal,
        page: nextPage,
        limit: Number(paginationData?.limit) || 50,
        pages: nextPages,
      });

      if (payload?.stats && typeof payload.stats === 'object') {
        setStats({
          total: Number(payload.stats.total) || 0,
          pending: Number(payload.stats.pending) || 0,
          confirmed: Number(payload.stats.confirmed) || 0,
          cancelled: Number(payload.stats.cancelled) || 0,
          followup: Number(payload.stats.followup) || 0,
        });
      } else {
        setStats(null);
      }

      setFetchError(null);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      const message = extractApiErrorMessage(error) || t('orders.loadingFailed');
      if (!silent) {
        setFetchError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const advanceToNextOrder = useCallback((currentId: string) => {
    if (!autoAdvance) return;
    setOrders((current) => {
      const idx = current.findIndex((o) => o.id === currentId);
      if (idx !== -1 && idx + 1 < current.length) {
        setSelectedOrderId(current[idx + 1].id);
      } else if (current.length > 1) {
        setSelectedOrderId(current[0].id);
      }
      return current;
    });
  }, [autoAdvance]);

  const handleQuickAction = async (
    order: WorkspaceOrder,
    action: Extract<OrderAction, 'confirm' | 'cancel'>,
    explicitNotes?: string,
  ) => {
    let actionNotes = t('orders.confirmNote');

    if (action === 'cancel') {
      const reason = (explicitNotes ?? '').trim();
      if (!reason) {
        toast.error(t('orders.cancellationReasonRequired'));
        return;
      }
      actionNotes = reason;
    }

    setOrderBusyState(order.id, action);

    try {
      const response = await apiClient.post(
        `/agent-workspace/orders/${order.id}/quick-action`,
        {
          action,
          notes: actionNotes,
        },
      );

      if ((response.data as any)?.success) {
        const workflowPending =
          (response.data as any)?.data?.workflowStatus === 'pending';
        if (workflowPending) {
          toast.info(t('orders.workspacePendingApproval'));
        } else {
          const messages: Record<string, string> = {
            confirm: t('orders.orderConfirmed'),
            cancel: t('orders.orderCancelled'),
          };
          toast.success(messages[action] || t('orders.actionSuccess'));
        }

        advanceToNextOrder(order.id);
        await fetchOrders({ silent: true });
      }
    } catch (error) {
      toast.error(extractApiErrorMessage(error) || t('orders.actionFailed'));
    } finally {
      setOrderBusyState(order.id, null);
    }
  };

  const handleLogCall = async (
    order: WorkspaceOrder,
    result: string = 'unreached',
    explicitNotes?: string,
  ) => {
    setOrderBusyState(order.id, 'log-call');

    try {
      const response = await apiClient.post(
        `/agent-workspace/orders/${order.id}/log-call`,
        {
          result,
          notes: explicitNotes || t('orders.callAttemptNote'),
        },
      );

      if ((response.data as any)?.success) {
        toast.success(t('orders.callLogged'));
        advanceToNextOrder(order.id);
        await fetchOrders({ silent: true });
      }
    } catch (error) {
      toast.error(extractApiErrorMessage(error) || t('orders.logCallFailed'));
    } finally {
      setOrderBusyState(order.id, null);
    }
  };

  const confirmCancelOrder = async () => {
    if (!cancellingOrder) return;
    const reason = cancelReasonText.trim();
    if (!reason) {
      toast.error(t('orders.cancellationReasonRequired'));
      return;
    }

    try {
      await handleQuickAction(cancellingOrder, 'cancel', reason);
    } finally {
      setCancellingOrder(null);
      setCancelReasonText('');
    }
  };

  const handleSaveFollowUp = async () => {
    if (!followUpOrder) return;

    if (!followUpDateValue) {
      toast.error(t('orders.followUpDateLabel'));
      return;
    }

    setOrderBusyState(followUpOrder.id, 'follow-up');

    try {
      const response = await apiClient.post(
        `/agent-workspace/orders/${followUpOrder.id}/follow-up`,
        {
          followUpDate: new Date(followUpDateValue).toISOString(),
        },
      );

      if ((response.data as any)?.success) {
        toast.success(t('orders.followUpScheduled'));
        setFollowUpOrder(null);
        setFollowUpDateValue('');
        advanceToNextOrder(followUpOrder.id);
        await fetchOrders({ silent: true });
      }
    } catch (error) {
      toast.error(extractApiErrorMessage(error) || t('orders.actionFailed'));
    } finally {
      setOrderBusyState(followUpOrder.id, null);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        cancellingOrder ||
        followUpOrder ||
        isModalOpen
      ) {
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault();
        setOrders((current) => {
          if (current.length === 0) return current;
          const idx = current.findIndex((o) => o.id === selectedOrderId);
          if (idx !== -1 && idx + 1 < current.length) {
            setSelectedOrderId(current[idx + 1].id);
          }
          return current;
        });
      } else if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault();
        setOrders((current) => {
          if (current.length === 0) return current;
          const idx = current.findIndex((o) => o.id === selectedOrderId);
          if (idx > 0) {
            setSelectedOrderId(current[idx - 1].id);
          }
          return current;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrderId, cancellingOrder, followUpOrder, isModalOpen]);

  useEffect(() => {
    void fetchOrders();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isModalOpenRef.current) {
        void fetchOrders({ silent: true });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  useEffect(() => {
    const nextTab = normalizeWorkspaceTab(searchParams.get('tab'));
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (!activeTabHydratedRef.current) {
      activeTabHydratedRef.current = true;
      return;
    }

    if (activeTab === 'confirmation') return;

    if (skipNextTabFetchRef.current) {
      skipNextTabFetchRef.current = false;
      return;
    }

    void fetchOrders({ silent: true });
  }, [activeTab]);

  // Client filtered orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const query = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      return (
        o.orderNumber?.toLowerCase().includes(query) ||
        o.customerName?.toLowerCase().includes(query) ||
        o.customerPhone?.toLowerCase().includes(query) ||
        o.governorate?.toLowerCase().includes(query) ||
        o.city?.toLowerCase().includes(query)
      );
    });
  }, [orders, searchQuery]);

  const activeSelectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return filteredOrders[0] || null;
    }
    return filteredOrders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || null;
  }, [filteredOrders, selectedOrderId]);

  return {
    t,
    isArabic,
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
    setPerspective,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    autoAdvance,
    setAutoAdvance,
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
    selectedOrderForModal,
    setSelectedOrderForModal,
    isModalOpen,
    setIsModalOpen,
  };
}
