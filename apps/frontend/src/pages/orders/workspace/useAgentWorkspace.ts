import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../services/apiClient';
import { useOptionalAuth } from '../../../hooks/useAuthSimple';
import { toast } from 'sonner';
import {
  AgentWorkload,
  FilterTab,
  OrderAction,
  PerspectiveMode,
  TeamWorkloadData,
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
    : 'pending';
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
  const auth = useOptionalAuth();
  const user = auth?.user;

  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const isManager = useMemo(() => {
    const role = String(user?.role || '').toUpperCase();
    return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'TEAM_LEADER'].includes(role);
  }, [user?.role]);

  const [orders, setOrders] = useState<WorkspaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<FilterTab>(() =>
    normalizeWorkspaceTab(searchParams.get('tab')),
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<PerspectiveMode>(() =>
    isManager ? 'supervisor' : 'operator',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'recent' | 'oldest' | 'attempts'>('recent');
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Supervisor Dispatch State
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [teamWorkload, setTeamWorkload] = useState<TeamWorkloadData>({
    unassignedCount: 0,
    agents: [],
  });
  const [loadingWorkload, setLoadingWorkload] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

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

  const fetchTeamWorkload = useCallback(async () => {
    if (!isManager) return;
    try {
      setLoadingWorkload(true);
      const response = await apiClient.get('/agent-workspace/team-workload');
      if (response.data?.success && response.data?.data) {
        setTeamWorkload(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load team workload telemetry:', err);
    } finally {
      setLoadingWorkload(false);
    }
  }, [isManager]);

  const selectTab = useCallback(
    (nextTab: FilterTab) => {
      if (nextTab === activeTabRef.current) {
        void fetchOrders({ silent: false, tab: nextTab, page: 1 });
        return;
      }

      setActiveTab(nextTab);
      activeTabRef.current = nextTab;

      const nextParams = new URLSearchParams(searchParams);
      if (nextTab === 'pending') {
        nextParams.delete('tab');
      } else {
        nextParams.set('tab', nextTab);
      }
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
      void fetchOrders({ silent: true, search: '', page: 1 });
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      void fetchOrders({ silent: true, search: query, page: 1 });
    }, 350);
  }, []);

  const fetchOrders = async (options?: {
    silent?: boolean;
    page?: number;
    append?: boolean;
    tab?: FilterTab;
    sort?: 'recent' | 'oldest' | 'attempts';
    assignedTo?: string | null;
    search?: string;
  }) => {
    const {
      silent = false,
      page: targetPage = 1,
      append = false,
      tab,
      sort: targetSort,
      assignedTo: targetAssignedTo,
      search: targetSearch,
    } = options || {};

    const activeTabForRequest = tab ?? activeTabRef.current;
    const resolvedSort = targetSort ?? sortOption;
    const resolvedAssignedTo = targetAssignedTo !== undefined ? targetAssignedTo : selectedAgentId;
    const resolvedSearch = targetSearch !== undefined ? targetSearch : searchQuery;

    if (!append) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
    }
    const signal = abortControllerRef.current?.signal;

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

      if (resolvedAssignedTo) {
        params['assignedTo'] = resolvedAssignedTo;
      }

      if (resolvedSearch && resolvedSearch.trim()) {
        params['search'] = resolvedSearch.trim();
      }

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

      const fetchIncomplete =
        (activeTabForRequest === 'pending' || activeTabForRequest === 'all') && targetPage === 1;

      const [response, incRes] = await Promise.all([
        apiClient.get('/agent-workspace/my-orders', { params, signal }),
        fetchIncomplete
          ? apiClient
              .get('/orders-new/incomplete', {
                params: {
                  limit: 50,
                  hasPhone: 'true',
                  search: resolvedSearch ? resolvedSearch.trim() : undefined,
                },
                signal,
              })
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      const payload = response?.data as any;

      if (!payload?.success) {
        throw new Error(
          (typeof payload?.error === 'string' && payload.error) ||
            payload?.message ||
            t('orders.loadingFailed'),
        );
      }

      let nextOrders: WorkspaceOrder[] = Array.isArray(payload?.data)
        ? payload.data
        : [];

      // Merge incomplete carts into pending and all queues
      if (incRes?.data?.data && Array.isArray(incRes.data.data)) {
        const rawCarts: any[] = incRes.data.data;
        const incompleteOrders: WorkspaceOrder[] = rawCarts
          .filter((cart: any) => cart && (cart.cartId || cart.id))
          .map((cart: any) => {
            const cartId = String(cart.cartId || cart.id);
            const rawItems = Array.isArray(cart.items) ? cart.items : [];

            let cleanAbandonReason = isArabic ? 'سلة متروكة في صفحة الشراء' : 'Abandoned checkout';
            if (typeof cart.abandonReason === 'string') {
              cleanAbandonReason = cart.abandonReason;
            } else if (cart.abandonReason && typeof cart.abandonReason === 'object') {
              const code = cart.abandonReason.code;
              if (code === 'partial_shipping') {
                cleanAbandonReason = isArabic ? 'توقف عند بيانات الشحن (العنوان)' : 'Stopped at shipping address';
              } else if (code === 'partial_payment') {
                cleanAbandonReason = isArabic ? 'توقف عند طريقة الدفع' : 'Stopped at payment method';
              } else if (code) {
                cleanAbandonReason = `${isArabic ? 'سلة متروكة:' : 'Abandoned:'} ${code}`;
              }
            }

            const custName =
              cart.checkoutData?.customerName ||
              cart.checkoutData?.guestName ||
              cart.checkoutData?.name ||
              (isArabic ? 'عميل محتمل' : 'Lead');

            const custPhone =
              cart.checkoutData?.customerPhone ||
              cart.checkoutData?.phone ||
              '';

            const secPhone =
              cart.checkoutData?.phone2 ||
              cart.checkoutData?.alternatePhone ||
              null;

            return {
              id: cartId,
              cartId,
              orderNumber: `CART-${cartId.slice(-6).toUpperCase()}`,
              type: 'GUEST',
              isIncomplete: true,
              abandonReason: cleanAbandonReason,
              customerName: custName,
              customerPhone: custPhone,
              secondaryPhone: secPhone,
              governorate: cart.checkoutData?.governorate || '',
              city: cart.checkoutData?.city || '',
              shippingAddress: cart.checkoutData?.address || cart.checkoutData?.shippingAddress || '',
              total: Number(cart.total || 0),
              subtotal: Number(cart.total || 0),
              shipping: Number(cart.checkoutData?.shippingCost || 0),
              discount: Number(cart.checkoutData?.discountAmount || 0),
              status: 'INCOMPLETE',
              callAttempts: 0,
              lastCallAt: null,
              followUpDate: null,
              createdAt: cart.checkoutStartedAt || cart.updatedAt || new Date().toISOString(),
              notes: cart.checkoutData?.notes || '',
              items: rawItems.map((it: any) => ({
                productName: it.productName || it.name || (isArabic ? 'منتج' : 'Product'),
                quantity: Number(it.quantity) || 1,
                price: Number(it.price || it.basePrice || 0),
                total: (Number(it.price || it.basePrice || 0)) * (Number(it.quantity) || 1),
                productColor: it.color || it.productColor || it.attributes?.Color || it.attributes?.color || null,
                productSize: it.size || it.productSize || it.attributes?.Size || it.attributes?.size || null,
                productImage: it.image || it.productImage || it.attributes?.image || null,
              })),
              attribution: cart.attribution || null,
            };
          });

        if (incompleteOrders.length > 0) {
          const existingIds = new Set(nextOrders.map((o) => o.id));
          const distinctIncomplete = incompleteOrders.filter((inc) => !existingIds.has(inc.id));
          nextOrders = [...nextOrders, ...distinctIncomplete];

          if (resolvedSort === 'oldest') {
            nextOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          } else {
            nextOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          }
        }
      }

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
          incomplete: Number(payload.stats.incomplete) || 0,
        });
      } else {
        setStats(null);
      }

      setFetchError(null);
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || error?.message === 'canceled') {
        return;
      }
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

  const handleSelectAgent = useCallback(
    (agentId: string | null) => {
      setSelectedAgentId(agentId);
      void fetchOrders({ silent: true, assignedTo: agentId });
    },
    [],
  );

  const handleAutoDistribute = async () => {
    try {
      setIsDistributing(true);
      const res = await apiClient.post('/agent-workspace/auto-distribute', { limit: 50 });
      if (res.data?.success) {
        toast.success(
          res.data.message || (isArabic ? 'تم توزيع الطلبات بنجاح' : 'Orders distributed successfully'),
        );
        await Promise.all([fetchTeamWorkload(), fetchOrders({ silent: true })]);
      }
    } catch (err) {
      toast.error(
        extractApiErrorMessage(err) || (isArabic ? 'فشل التوزيع التلقائي' : 'Auto distribute failed'),
      );
    } finally {
      setIsDistributing(false);
    }
  };

  const handleAssignOrder = async (orderId: string, targetUserId: string) => {
    try {
      const res = await apiClient.post('/agent-workspace/assign', { orderId, targetUserId });
      if (res.data?.success) {
        toast.success(isArabic ? 'تم تعيين الطلب بنجاح' : 'Order assigned');
        await Promise.all([fetchTeamWorkload(), fetchOrders({ silent: true })]);
      }
    } catch (err) {
      toast.error(
        extractApiErrorMessage(err) || (isArabic ? 'فشل تعيين الطلب' : 'Failed to assign order'),
      );
    }
  };

  const advanceToNextOrder = useCallback(
    (currentId: string) => {
      if (!autoAdvance) return;
      setOrders((current) => {
        const remaining = current.filter((o) => o.id !== currentId);
        if (remaining.length > 0) {
          setSelectedOrderId(remaining[0].id);
        } else {
          setSelectedOrderId(null);
        }
        return remaining;
      });
    },
    [autoAdvance],
  );

  const handleQuickAction = async (
    order: WorkspaceOrder,
    action: Extract<OrderAction, 'confirm' | 'cancel'>,
    explicitNotes?: string,
  ) => {
    if (order.isIncomplete) {
      if (action === 'confirm') {
        await handleConvertIncomplete(order.cartId || order.id);
        return;
      }
      if (action === 'cancel') {
        advanceToNextOrder(order.id);
        toast.info(isArabic ? 'تم استبعاد السلة المتروكة' : 'Incomplete cart dismissed');
        return;
      }
    }

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

        // Instant zero-delay disappearance from active stream
        advanceToNextOrder(order.id);
        await Promise.all([
          fetchOrders({ silent: true }),
          isManager ? fetchTeamWorkload() : Promise.resolve(),
        ]);
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

  // Keyboard shortcuts (j/k, ArrowDown/ArrowUp)
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

  const handleConvertIncomplete = async (cartId: string) => {
    try {
      setOrderBusyState(cartId, 'confirm');
      const response = await apiClient.post(`/orders-new/incomplete/${cartId}/convert`);
      if (response.data?.success) {
        toast.success(
          isArabic
            ? '⚡ تم استرجاع وتحويل السلة بنجاح إلى طلب مؤكد!'
            : 'Cart recovered and converted to order!',
        );
        advanceToNextOrder(cartId);
        await Promise.all([
          fetchOrders({ silent: true }),
          isManager ? fetchTeamWorkload() : Promise.resolve(),
        ]);
      }
    } catch (err) {
      toast.error(
        extractApiErrorMessage(err) || (isArabic ? 'فشل تحويل السلة المتروكة' : 'Failed to convert cart'),
      );
    } finally {
      setOrderBusyState(cartId, null);
    }
  };

  const handleUpdateOrderItems = async (
    orderId: string,
    newItems: WorkspaceOrderItem[],
    financials: { shipping?: number; discount?: number; notes?: string },
  ) => {
    try {
      const response = await apiClient.put(`/agent-workspace/orders/${orderId}/items`, {
        items: newItems,
        shipping: financials.shipping,
        discount: financials.discount,
        notes: financials.notes,
      });

      if (response.data?.success) {
        toast.success(isArabic ? 'تم تحديث منتجات الطلب بنجاح' : 'Order items updated');
        const updatedTotals = response.data?.data;
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== orderId) return o;
            return {
              ...o,
              items: newItems,
              subtotal: updatedTotals?.subtotal ?? o.subtotal,
              shipping: updatedTotals?.shipping ?? o.shipping,
              discount: updatedTotals?.discount ?? o.discount,
              total: updatedTotals?.total ?? o.total,
            };
          }),
        );
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || (isArabic ? 'فشل تحديث منتجات الطلب' : 'Failed to update items'));
      throw err;
    }
  };

  const handleUpdateCustomer = async (
    orderId: string,
    customerData: {
      customerName?: string;
      customerPhone?: string;
      secondaryPhone?: string;
      governorate?: string;
      city?: string;
      shippingAddress?: string;
      notes?: string;
    },
  ) => {
    try {
      const response = await apiClient.put(`/agent-workspace/orders/${orderId}/customer`, customerData);
      if (response.data?.success) {
        toast.success(isArabic ? 'تم حفظ بيانات العميل والعنوان' : 'Customer info updated');
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== orderId) return o;
            return {
              ...o,
              ...customerData,
            };
          }),
        );
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || (isArabic ? 'فشل تحديث بيانات العميل' : 'Failed to update customer'));
      throw err;
    }
  };

  useEffect(() => {
    void fetchOrders();
    if (isManager) void fetchTeamWorkload();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isModalOpenRef.current) {
        void fetchOrders({ silent: true });
        if (isManager) void fetchTeamWorkload();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isManager]);

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
    selectedOrderForModal,
    setSelectedOrderForModal,
    isModalOpen,
    setIsModalOpen,
  };
}
