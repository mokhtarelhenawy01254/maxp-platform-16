import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../services/apiClient';
import { useOptionalAuth } from '../../../hooks/useAuthSimple';
import { toast } from 'sonner';
import { extractApiErrorMessage } from './apiError';
import { mapIncompleteCart } from './incompleteCartMapper';
import { buildQueueParams } from './workspaceQueueParams';
import { useWorkspaceShortcuts } from './useWorkspaceShortcuts';
import {
  AgentWorkload,
  FilterTab,
  OrderAction,
  PerspectiveMode,
  TeamWorkloadData,
  WORKSPACE_TAB_KEYS,
  WorkspaceOrder,
  WorkspaceOrderItem,
  WorkspacePagination,
  WorkspaceStats,
} from './types';

function normalizeWorkspaceTab(value: string | null): FilterTab {
  if (!value) return 'all';
  const val = value.toLowerCase();
  if (val === 'confirmation') return 'pending';
  return WORKSPACE_TAB_KEYS.includes(val as FilterTab)
    ? (val as FilterTab)
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
  // العدسة تلقائية حسب الدور — لا مفتاح يدوي (توحيد قوائم التحكم مع باقي الموقع)
  const perspective: PerspectiveMode = isManager ? 'supervisor' : 'operator';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'recent' | 'oldest' | 'attempts'>('recent');

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
  // آخر جلب ناجح — يغذي شارة «حدث قبل X» في الشريط العلوي
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
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

  // أحدث قيم الفلاتر للقراءة داخل fetchOrders — يكسر الـ stale closure الذي
  // كان يُطفئ فلاتر المستخدم (فرز/وكيل/بحث) في الـ interval ومعالجات useCallback([]) القديمة
  const sortOptionRef = useRef(sortOption);
  const selectedAgentIdRef = useRef(selectedAgentId);
  const searchQueryRef = useRef(searchQuery);

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
      if (nextTab === 'all') {
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
    /** poll خفيف: استبعاد الإحصائيات الثقيلة (6 عدّادات) مع الإبقاء على العدادات المعروضة */
    withStats?: boolean;
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
    const resolvedSort = targetSort ?? sortOptionRef.current;
    const resolvedAssignedTo = targetAssignedTo !== undefined ? targetAssignedTo : selectedAgentIdRef.current;
    const resolvedSearch = targetSearch !== undefined ? targetSearch : searchQueryRef.current;

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

      const { params, fetchIncomplete } = buildQueueParams({
        activeTab: activeTabForRequest,
        sort: resolvedSort,
        assignedTo: resolvedAssignedTo,
        search: resolvedSearch,
        page: targetPage,
        withStats: options?.withStats !== false,
      });

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

      let extraIncompleteCount = 0;
      // Merge incomplete carts into pending and all queues
      if (incRes?.data?.data && Array.isArray(incRes.data.data)) {
        const incompleteOrders: WorkspaceOrder[] = (incRes.data.data as any[])
          .filter((cart: any) => cart && (cart.cartId || cart.id))
          .map((cart: any) => mapIncompleteCart(cart, isArabic));

        if (incompleteOrders.length > 0) {
          const existingIds = new Set(nextOrders.map((o) => o.id));
          const distinctIncomplete = incompleteOrders.filter((inc) => !existingIds.has(inc.id));
          extraIncompleteCount = distinctIncomplete.length;
          nextOrders = [...nextOrders, ...distinctIncomplete];
        }
      }

      if (resolvedSort === 'oldest') {
        nextOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else if (resolvedSort === 'attempts') {
        nextOrders.sort((a, b) => (b.callAttempts || 0) - (a.callAttempts || 0));
      } else {
        nextOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
        total: nextTotal + extraIncompleteCount,
        page: nextPage,
        limit: Number(paginationData?.limit) || 50,
        pages: nextPages,
      });

      if (payload?.stats && typeof payload.stats === 'object') {
        setStats({
          total: Number(payload.stats.total) || 0,
          all: Number(payload.stats.all ?? payload.stats.total) || 0,
          today: Number(payload.stats.today) || 0,
          pending: Number(payload.stats.pending) || 0,
          processing: Number(payload.stats.processing) || 0,
          confirmed: Number(payload.stats.confirmed) || 0,
          cancelled: Number(payload.stats.cancelled) || 0,
          followup: Number(payload.stats.followup) || 0,
          incomplete: Number(payload.stats.incomplete) || 0,
        });
      }
      // عند الاستبعاد المتعمد للإحصائيات (poll خفيف) نُبقي العدادات السابقة كما هي

      setFetchError(null);
      setLastFetchedAt(Date.now());
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
      } else {
        toast.error(extractApiErrorMessage(res.data) || (isArabic ? 'فشل التوزيع التلقائي' : 'Auto distribute failed'));
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
      } else {
        toast.error(extractApiErrorMessage(res.data) || (isArabic ? 'فشل تعيين الطلب' : 'Failed to assign order'));
      }
    } catch (err) {
      toast.error(
        extractApiErrorMessage(err) || (isArabic ? 'فشل تعيين الطلب' : 'Failed to assign order'),
      );
    }
  };

  const advanceToNextOrder = useCallback(
    (currentId: string) => {
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
    [],
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
        // استبعاد حقيقي: السبب الإلزامي من المودال يُسجل في cartContactLog
        // والسلة تُستبعد من القائمة على الخادم — لم تعد تعود مع الـ poll
        const reason = (explicitNotes ?? '').trim();
        if (!reason) {
          toast.error(t('orders.cancellationReasonRequired'));
          return;
        }

        setOrderBusyState(order.id, 'cancel');
        try {
          const response = await apiClient.post(
            `/orders-new/incomplete/${order.cartId || order.id}/dismiss`,
            { reason },
          );
          if (response.data?.success) {
            toast.success(isArabic ? 'تم استبعاد السلة المتروكة' : 'Incomplete cart dismissed');
            advanceToNextOrder(order.id);
            await fetchOrders({ silent: true });
          } else {
            toast.error(
              extractApiErrorMessage(response.data) ||
                (isArabic ? 'فشل استبعاد السلة المتروكة' : 'Failed to dismiss cart'),
            );
          }
        } catch (error) {
          toast.error(
            extractApiErrorMessage(error) ||
              (isArabic ? 'فشل استبعاد السلة المتروكة' : 'Failed to dismiss cart'),
          );
        } finally {
          setOrderBusyState(order.id, null);
        }
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
          // الطلب لم يتغير فعليًا — بلا تقديم للطلب التالي وإلا عاد مع الجلب وومض أمام الموظف
          toast.info(t('orders.workspacePendingApproval'));
          await fetchOrders({ silent: true });
        } else {
          const messages: Record<string, string> = {
            confirm: t('orders.orderConfirmed'),
            cancel: t('orders.orderCancelled'),
          };
          toast.success(messages[action] || t('orders.actionSuccess'));

          // Instant zero-delay disappearance from active stream
          advanceToNextOrder(order.id);
          await Promise.all([
            fetchOrders({ silent: true }),
            isManager ? fetchTeamWorkload() : Promise.resolve(),
          ]);
        }
      } else {
        toast.error(extractApiErrorMessage(response.data) || t('orders.actionFailed'));
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
      } else {
        toast.error(extractApiErrorMessage(response.data) || t('orders.logCallFailed'));
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
      } else {
        toast.error(extractApiErrorMessage(response.data) || t('orders.actionFailed'));
      }
    } catch (error) {
      toast.error(extractApiErrorMessage(error) || t('orders.actionFailed'));
    } finally {
      setOrderBusyState(followUpOrder.id, null);
    }
  };

  // Keyboard shortcuts (j/k, ArrowDown/ArrowUp) — مع التركيز الفعلي في WorkspaceOrderQueue
  useWorkspaceShortcuts({
    orders,
    selectedOrderId,
    onSelect: setSelectedOrderId,
    blocked: Boolean(cancellingOrder || followUpOrder || isModalOpen),
  });

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
      } else {
        toast.error(
          extractApiErrorMessage(response.data) || (isArabic ? 'فشل تحويل السلة المتروكة' : 'Failed to convert cart'),
        );
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
      } else {
        // الـ catch أسفل الدالة يعرض الخطأ ويعيد الرمي كي يُبقي المحرر حالته
        throw new Error(extractApiErrorMessage(response.data) || (isArabic ? 'فشل تحديث منتجات الطلب' : 'Failed to update items'));
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
      } else {
        throw new Error(extractApiErrorMessage(response.data) || (isArabic ? 'فشل تحديث بيانات العميل' : 'Failed to update customer'));
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err) || (isArabic ? 'فشل تحديث بيانات العميل' : 'Failed to update customer'));
      throw err;
    }
  };

  useEffect(() => {
    void fetchOrders();
    if (isManager) void fetchTeamWorkload();

    let pollTick = 0;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isModalOpenRef.current) {
        pollTick += 1;
        // Poll خفيف: حمولة my-orders فقط — عدّادات الإحصائيات الستة كل 5 دورات (5 دقائق)
        void fetchOrders({ silent: true, withStats: pollTick % 5 === 0 });
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
    sortOptionRef.current = sortOption;
  }, [sortOption]);

  useEffect(() => {
    selectedAgentIdRef.current = selectedAgentId;
  }, [selectedAgentId]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

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

  // البحث خادمي الآن (my-orders و incomplete كلاهما يستقبل search) — لا فلترة محلية فوق
  // النتائج حتى لا تُخفى مطابقات في العنوان أو الملاحظات لا يغطيها الفلتر المحلي.
  // تاب المتابعات يرتتب بالميعاد: الأبقر استحقاقًا أولًا بدل ترتيب assignedAt الخادمي
  const sortedOrders = useMemo(() => {
    if (activeTab !== 'followup') return orders;
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
    selectedOrderForModal,
    setSelectedOrderForModal,
    isModalOpen,
    setIsModalOpen,
  };
}
