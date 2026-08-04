import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useCurrency } from '../../hooks/useCurrency';
import { summarizeOrderDocumentItems } from '../../utils/orderDocumentQuantityOffers';
import OrderConfirmationQueue from './OrderConfirmationQueue';
import {
  PhoneIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  UserIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const EnhancedOrderModal = React.lazy(
  () => import('../../components/orders/EnhancedOrderModal'),
);

type OrderType = 'GUEST' | 'REGULAR';
const WORKSPACE_TAB_KEYS = ['all', 'pending', 'confirmed', 'cancelled', 'followup', 'confirmation'] as const;
type FilterTab = typeof WORKSPACE_TAB_KEYS[number];
type OrderAction = 'log-call' | 'confirm' | 'cancel' | 'details' | 'follow-up';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  city: string;
  governorate: string;
  total: number;
  status: string;
  callAttempts: number;
  lastCallAt: string | null;
  followUpDate: string | null;
  createdAt: string;
  items: any[];
  type?: OrderType;
}

interface WorkspaceStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  followup: number;
}

interface WorkspacePagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
      error?: string | { message?: string };
    };
  };
  message?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  SHIPPED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  DELIVERED: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  RETURNED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PARTIALLY_RETURNED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  PARTIALLY_DELIVERED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  PARTIALLY_REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  DUPLICATE_ORDER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PENDING_CANCELLATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
};

const STATUS_FALLBACKS: Record<string, { ar: string; en: string }> = {
  PENDING: { ar: 'قيد الانتظار', en: 'Pending' },
  CONFIRMED: { ar: 'تم التأكيد', en: 'Confirmed' },
  PROCESSING: { ar: 'قيد التجهيز', en: 'Processing' },
  CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
  SHIPPED: { ar: 'تم الشحن', en: 'Shipped' },
  DELIVERED: { ar: 'تم التوصيل', en: 'Delivered' },
  RETURNED: { ar: 'مرتجع', en: 'Returned' },
  PARTIALLY_RETURNED: { ar: 'مرتجع جزئي', en: 'Partially Returned' },
  PARTIALLY_DELIVERED: { ar: 'تسليم جزئي', en: 'Partially Delivered' },
  REFUNDED: { ar: 'مسترد', en: 'Refunded' },
  PARTIALLY_REFUNDED: { ar: 'مسترد جزئياً', en: 'Partially Refunded' },
  DUPLICATE_ORDER: { ar: 'طلب مكرر', en: 'Duplicate Order' },
  PENDING_CANCELLATION: { ar: 'بانتظار الإلغاء', en: 'Pending Cancellation' },
  OUT_FOR_DELIVERY: { ar: 'خرج للتسليم', en: 'Out for Delivery' },
};

function getNormalizedStatus(status: string | null | undefined): string {
  return String(status || 'PENDING').toUpperCase();
}

function normalizeWorkspaceTab(value: string | null): FilterTab {
  return WORKSPACE_TAB_KEYS.includes(value as FilterTab)
    ? (value as FilterTab)
    : 'all';
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

function getHoursSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

function safeParseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function isOverdue(order: Order): boolean {
  const normalizedStatus = getNormalizedStatus(order.status);

  if (normalizedStatus !== 'PENDING') {
    return false;
  }

  // Alert if no call made and order is older than 24h
  if (order.callAttempts === 0 && getHoursSince(order.createdAt) > 24) return true;
  // Alert if last call was more than 12h ago and order is still pending
  if (order.callAttempts > 0 && getHoursSince(order.lastCallAt) > 12) return true;
  return false;
}

const AgentWorkspace: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>(() =>
    normalizeWorkspaceTab(searchParams.get('tab')),
  );
  const [busyOrders, setBusyOrders] = useState<Record<string, OrderAction>>({});
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<WorkspacePagination>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
  });
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [followUpOrder, setFollowUpOrder] = useState<Order | null>(null);
  const [followUpDateValue, setFollowUpDateValue] = useState('');
  const [callResults, setCallResults] = useState<Record<string, string>>({});
  const detailsCacheRef = useRef<Map<string, any>>(new Map());
  const activeTabRef = useRef<FilterTab>(activeTab);
  const isModalOpenRef = useRef(isModalOpen);
  const skipNextTabFetchRef = useRef(false);
  const activeTabHydratedRef = useRef(false);

  const isArabic = i18n.language.toLowerCase().startsWith('ar');
  const locale = isArabic ? 'ar-EG' : 'en-US';

  const resolveCopy = (key: string, fallbackAr: string, fallbackEn: string) => {
    const translated = t(key);
    if (translated !== key) {
      return translated;
    }

    return isArabic ? fallbackAr : fallbackEn;
  };

  const selectTab = (nextTab: FilterTab) => {
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
  };

  const formatDate = (dateStr: string | null | undefined) => {
    const parsed = safeParseDate(dateStr);
    if (!parsed) return '—';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      parsed,
    );
  };

  const formatTime = (dateStr: string | null | undefined) => {
    const parsed = safeParseDate(dateStr);
    if (!parsed) return '—';
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  };

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

  const fetchOrders = async (options?: {
    silent?: boolean;
    page?: number;
    append?: boolean;
    tab?: FilterTab;
  }) => {
    const { silent = false, page: targetPage = 1, append = false, tab } = options || {};
    const activeTabForRequest = tab ?? activeTabRef.current;

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
      };

      switch (activeTabForRequest) {
        case 'pending':
          params['status'] = 'PENDING';
          params['sort'] = 'oldest';
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

      const response = await apiClient.get('/agent-workspace/my-orders', {
        params,
      });
      const payload = response.data as any;

      if (!payload?.success) {
        throw new Error(
          (typeof payload?.error === 'string' && payload.error) ||
            payload?.message ||
            t('orders.loadingFailed'),
        );
      }

      const nextOrders: Order[] = Array.isArray(payload?.data)
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
      const message =
        extractApiErrorMessage(error) ||
        t('orders.loadingFailed');

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

  useEffect(() => {
    void fetchOrders();
    // Auto-refresh every 60 seconds (only while the tab is visible)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isModalOpenRef.current) {
        void fetchOrders({ silent: true });
      }
    }, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !isModalOpenRef.current) {
        void fetchOrders({ silent: true });
      }
    };

    const handleFocus = () => {
      if (!isModalOpenRef.current) {
        void fetchOrders({ silent: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
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

    if (activeTab === 'confirmation') {
      return;
    }

    if (skipNextTabFetchRef.current) {
      skipNextTabFetchRef.current = false;
      return;
    }

    void fetchOrders({ silent: true });
  }, [activeTab]);

  const handleLogCall = async (order: Order, result?: string) => {
    setOrderBusyState(order.id, 'log-call');

    try {
      const response = await apiClient.post(
        `/agent-workspace/orders/${order.id}/log-call`,
        {
          result: result || 'unreached',
          notes: t('orders.callAttemptNote'),
        },
      );

      if ((response.data as any)?.success) {
        toast.success(
          t('orders.callLogged'),
        );
        await fetchOrders({ silent: true });
      }
    } catch (error) {
      toast.error(
        extractApiErrorMessage(error) ||
          t('orders.logCallFailed'),
      );
    } finally {
      setOrderBusyState(order.id, null);
    }
  };

  const handleQuickAction = async (
    order: Order,
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
          toast.success(
            messages[action] ||
              t('orders.actionSuccess'),
          );
        }
        await fetchOrders({ silent: true });
      }
    } catch (error) {
      toast.error(
        extractApiErrorMessage(error) ||
          t('orders.actionFailed'),
      );
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
    }
  };

  const openFollowUpModal = (order: Order) => {
    setFollowUpDateValue(order.followUpDate ? order.followUpDate.slice(0, 10) : '');
    setFollowUpOrder(order);
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
        await fetchOrders({ silent: true });
      }
    } catch (error) {
      toast.error(
        extractApiErrorMessage(error) ||
          t('orders.actionFailed'),
      );
    } finally {
      setOrderBusyState(followUpOrder.id, null);
    }
  };

  const handleOrderUpdate = (updatedOrder: any) => {
    const updatedId = updatedOrder?.id || selectedOrder?.id;
    if (updatedId) {
      detailsCacheRef.current.delete(updatedId);
    }
    void fetchOrders({ silent: true });
  };

  const normalizeItems = (rawItems: any): any[] => {
    if (!rawItems) return [];
    let items = rawItems;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(items)) return [];

    return items.map((item: any) => {
      const price = parseFloat(item.price ?? item.unitPrice ?? 0);
      const quantity = parseInt(item.quantity ?? 1);
      const safePrice = Number.isFinite(price) ? price : 0;
      const safeQuantity =
        Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      return {
        ...item,
        productName:
          item.productName ||
          item.name ||
          item.product?.name ||
          i18n.t("orders.productNotSpecified"),
        name:
          item.name ||
          item.productName ||
          item.product?.name ||
          i18n.t("orders.productNotSpecified"),
        price: safePrice,
        quantity: safeQuantity,
        total:
          Number.isFinite(parseFloat(item.total))
            ? parseFloat(item.total)
            : safePrice * safeQuantity,
        productColor:
          item.productColor ||
          item.color ||
          item.metadata?.color ||
          item.metadata?.productColor,
        productSize:
          item.productSize ||
          item.size ||
          item.metadata?.size ||
          item.metadata?.productSize,
      };
    });
  };

  const openOrderDetails = async (order: Order) => {
    const orderKey = order.orderNumber || (order as any)?.id;
    const encodedKey = orderKey ? encodeURIComponent(String(orderKey)) : "";

    // Serve from cache when available to avoid repeated endpoint calls
    if (detailsCacheRef.current.has(order.id)) {
      setSelectedOrder(detailsCacheRef.current.get(order.id));
      setIsModalOpen(true);
      return;
    }

    setOrderBusyState(order.id, 'details');

    try {
      // Fetch the full order so the modal gets items + subtotal + shipping
      const response = (await apiClient.get(
        `/orders-new/simple/${encodedKey}`,
        { _skipErrorToast: true },
      )) as any;
      if (response.data?.success && response.data?.data) {
        const fetched = response.data.data;
        const fetchedItems = normalizeItems(fetched.items);
        const workspaceItems = normalizeItems(order.items);
        let merged = {
          ...order,
          ...fetched,
          items: fetchedItems.length > 0 ? fetchedItems : workspaceItems,
        };

        // If still no items, try enhanced endpoint as a fallback
        if (!merged.items || merged.items.length === 0) {
          try {
            const enhanced = (await apiClient.get(
              `/orders-enhanced/${encodedKey}`,
              { _skipErrorToast: true },
            )) as any;
            if (enhanced.data?.success && enhanced.data?.data) {
              const enhancedData = enhanced.data.data;
              const enhancedItems = normalizeItems(
                enhancedData.items || enhancedData.orderItems,
              );
              merged = {
                ...merged,
                ...enhancedData,
                items: enhancedItems.length > 0 ? enhancedItems : merged.items,
              };
            }
          } catch {
            // ignore enhanced fallback errors
          }
        }

        setOrders((current) =>
          current.map((existingOrder) => {
            if (existingOrder.id !== order.id) {
              return existingOrder;
            }

            return {
              ...existingOrder,
              customerName: merged.customerName || existingOrder.customerName,
              customerPhone:
                merged.customerPhone || existingOrder.customerPhone,
              governorate:
                merged.governorate ||
                (typeof merged.shippingAddress === 'object'
                  ? merged.shippingAddress?.governorate
                  : '') ||
                existingOrder.governorate,
              city:
                merged.city ||
                (typeof merged.shippingAddress === 'object'
                  ? merged.shippingAddress?.city
                  : '') ||
                existingOrder.city,
              total:
                Number.isFinite(parseFloat(merged.total))
                  ? parseFloat(merged.total)
                  : existingOrder.total,
              status: merged.status || existingOrder.status,
              items:
                Array.isArray(merged.items) && merged.items.length > 0
                  ? merged.items
                  : existingOrder.items,
            };
          }),
        );

        detailsCacheRef.current.set(order.id, merged);
        setSelectedOrder(merged);
      } else {
        // Fallback: use workspace data with what we have
        setSelectedOrder({ ...order, items: normalizeItems(order.items) });
      }
    } catch {
      // Fallback if endpoint errors
      setSelectedOrder({ ...order, items: normalizeItems(order.items) });
    } finally {
      setOrderBusyState(order.id, null);
    }
    setIsModalOpen(true);
  };

  // ─── Server-driven list ──────────────────────────────────────────────────
  // The list is filtered + sorted server-side by activeTab; `orders` already
  // reflects the active tab, and tab counters come from server `stats`.

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: t('orders.workspaceAll'), count: stats ? stats.total : undefined },
    { key: 'pending', label: t('orders.workspacePending'), count: stats ? stats.pending : undefined },
    { key: 'confirmed', label: t('orders.workspaceConfirmed'), count: stats ? stats.confirmed : undefined },
    { key: 'cancelled', label: t('orders.workspaceCancelled'), count: stats ? stats.cancelled : undefined },
    { key: 'followup', label: t('orders.workspaceFollowUpLater'), count: stats ? stats.followup : undefined },
    { key: 'confirmation', label: t('orders.workspaceConfirmationQueue') },
  ];

  if (activeTab !== 'confirmation' && loading && orders.length === 0) {
    return (
      <div
        className="flex min-h-[400px] flex-col items-center justify-center gap-4"
        role="status"
        aria-live="polite"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('orders.loadingWorkspace')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto p-3 pb-20 sm:p-6">

      <h1 className="sr-only">{t('orders.workspaceTitle')}</h1>
      {/* ─── Compact Control Bar ─────────────────────────────────────────── */}
      <div className="mb-3 flex items-center gap-2 lg:justify-between">
        <label className="sr-only" htmlFor="workspace-mobile-section">
          {t('orders.workspaceSection')}
        </label>
        <select
          id="workspace-mobile-section"
          value={activeTab}
          onChange={(event) => selectTab(event.target.value as FilterTab)}
          className="min-h-[42px] min-w-0 flex-1 rounded-2xl border border-white/70 bg-white/85 px-4 text-sm font-bold text-gray-800 shadow-sm outline-none backdrop-blur transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800/85 dark:text-white sm:hidden"
        >
          {tabs.map(tab => (
            <option key={tab.key} value={tab.key}>
              {typeof tab.count === 'number'
                ? `${tab.label} (${tab.count})`
                : tab.label}
            </option>
          ))}
        </select>

        <div
          className="no-scrollbar hidden w-full items-center gap-2 overflow-x-auto rounded-2xl border border-white/70 bg-white/80 p-1.5 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-800/80 sm:flex lg:w-auto"
          role="tablist"
          aria-label={t('orders.workspaceFilters')}
        >
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
              {typeof tab.count === 'number' && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-black ${
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab !== 'confirmation' && (
          <button
            type="button"
            onClick={() => void fetchOrders({ silent: true })}
            disabled={refreshing}
            aria-busy={refreshing}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing
              ? t('orders.refreshing')
              : t('common.refresh')}
          </button>
        )}
      </div>

      {fetchError && orders.length > 0 && (
        <div
          className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="w-fit rounded-lg border border-amber-300 px-3 py-1.5 font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-900/30"
          >
            {resolveCopy(
              'orders.retryLoading',
              'إعادة المحاولة',
              'Try again',
            )}
          </button>
        </div>
      )}

      {activeTab === 'confirmation' ? (
        <OrderConfirmationQueue embedded />
      ) : (
        <>
      {/* ─── Orders Inbox ────────────────────────────────────────────────── */}
      {orders.length === 0 ? (
        <div
          className="bg-white dark:bg-gray-800 rounded-xl p-8 sm:p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700"
          role={fetchError ? 'alert' : undefined}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            fetchError
              ? 'bg-red-50 dark:bg-red-900/20'
              : 'bg-gray-50 dark:bg-gray-700'
          }`}>
            {fetchError ? (
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500 dark:text-red-300" />
            ) : (
              <CheckCircleIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <p className="text-gray-700 dark:text-gray-200 text-lg font-medium">
            {fetchError
              ? fetchError
              : activeTab === 'all'
                ? t('orders.noAssignedOrders')
                : resolveCopy(
                    'orders.noOrdersInFilter',
                    'لا توجد طلبات في هذه الفئة',
                    'No orders in this category',
                  )}
          </p>
          {fetchError && (
            <button
              type="button"
              onClick={() => void fetchOrders()}
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {resolveCopy(
                'orders.retryLoading',
                'إعادة المحاولة',
                'Try again',
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden rounded-2xl border border-white/70 bg-white/70 px-4 py-2 text-xs font-bold text-gray-500 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-400 md:grid md:grid-cols-[1.05fr_1.25fr_.9fr_.8fr_1.25fr] md:gap-4">
            <span>{t("orders.orderLabel")}</span>
            <span>{t("orders.customer")}</span>
            <span>{t("orders.locationAndValue")}</span>
            <span>{t("orders.followUp")}</span>
            <span className="text-center">{t("orders.actions")}</span>
          </div>

          <div className="space-y-2.5">
            {orders.map((order) => {
              const overdue = isOverdue(order);
              const isHighAttempts = order.callAttempts >= 3;
              const currentAction = busyOrders[order.id];
              const isOrderBusy = Boolean(currentAction);
              const statusKey = getNormalizedStatus(order.status);
              const statusFallback = STATUS_FALLBACKS[statusKey];
              const statusLabel = statusFallback
                ? resolveCopy(
                    `orders.${statusKey.toLowerCase()}`,
                    statusFallback.ar,
                    statusFallback.en,
                  )
                : statusKey;
              const location = [order.governorate, order.city].filter(Boolean).join('، ') || '—';
              const orderItemsSummary = summarizeOrderDocumentItems(order.items);

              return (
                <article
                  key={order.id}
                  className={`group relative overflow-hidden rounded-3xl border bg-white/95 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-800/95 sm:p-4 md:grid md:grid-cols-[1.05fr_1.25fr_.9fr_.8fr_1.25fr] md:items-center md:gap-4 ${
                    overdue
                      ? 'border-red-200 ring-1 ring-red-100 dark:border-red-800 dark:ring-red-900/40'
                      : 'border-white/80 dark:border-gray-700'
                  }`}
                >
                  <div
                    className={`absolute inset-y-0 right-0 w-1.5 ${
                      overdue
                        ? 'bg-red-500'
                        : statusKey === 'CANCELLED'
                          ? 'bg-red-500'
                        : statusKey === 'CONFIRMED'
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                    }`}
                    aria-hidden="true"
                  />

                  <div className="min-w-0 pr-2">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {overdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-black text-red-700 dark:bg-red-900/20 dark:text-red-300">
                          <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                          {t("orders.urgent")}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[statusKey] || STATUS_COLORS.PENDING}`}>
                        {statusLabel}
                      </span>
                      {order.type === 'GUEST' && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          {t("orders.guest")}
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] font-bold text-gray-400 dark:text-gray-500">
                      {formatDate(order.createdAt)}
                    </span>
                    <span className="mt-1 block truncate font-mono text-sm font-black text-blue-600 dark:text-blue-400" dir="ltr">
                      #{order.orderNumber}
                    </span>
                    {orderItemsSummary.hasQuantityOffers && (
                      <span className="mt-2 inline-flex max-w-full rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                        <span className="truncate">{orderItemsSummary.primaryLabel}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex min-w-0 items-center gap-3 border-t border-gray-100 pt-3 dark:border-gray-700 md:mt-0 md:border-0 md:pt-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/25 dark:text-blue-300">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-gray-900 dark:text-white">
                        {order.customerName || '—'}
                      </p>
                      <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                        {order.customerPhone || t("orders.noPhone")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:mt-0 md:block md:space-y-2">
                    <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                      <MapPinIcon className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="min-w-0 truncate">{location}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl bg-green-50 px-3 py-2 font-black text-green-700 dark:bg-green-900/20 dark:text-green-300">
                      <CurrencyDollarIcon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">{formatPrice(order.total)}</span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:block md:space-y-2">
                    <div className="rounded-2xl border border-gray-100 px-3 py-2 dark:border-gray-700">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        {t('orders.attempts')}
                      </span>
                      <span className={`mt-0.5 flex items-center gap-1 text-sm font-black ${isHighAttempts ? 'text-red-600 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
                        <PhoneIcon className="h-4 w-4" />
                        {order.callAttempts} / 5
                      </span>
                    </div>
                    <div className="rounded-2xl border border-gray-100 px-3 py-2 dark:border-gray-700">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        {t('orders.lastCall')}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-300">
                        <ClockIcon className="h-4 w-4" />
                        {order.lastCallAt
                          ? formatTime(order.lastCallAt)
                          : resolveCopy(
                              'orders.noCallsYet',
                              'لا يوجد',
                              'No calls yet',
                            )}
                      </span>
                    </div>
                    {order.followUpDate && (
                      <div className="col-span-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
                        <CalendarIcon className="me-1 inline h-4 w-4 align-text-bottom" />
                        {formatDate(order.followUpDate)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openFollowUpModal(order)}
                      disabled={isOrderBusy}
                      className="col-span-2 inline-flex min-h-[32px] items-center justify-center gap-1 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200"
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {t('orders.scheduleFollowUp')}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:justify-end">
                    <button
                      type="button"
                      onClick={() => void handleQuickAction(order, 'confirm')}
                      disabled={statusKey === 'CONFIRMED' || statusKey === 'CANCELLED' || isOrderBusy}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-2xl bg-green-600 px-3 py-2 text-sm font-black text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-700 dark:disabled:bg-green-900/30 dark:disabled:text-green-200"
                    >
                      <CheckCircleIcon className={`h-4 w-4 ${currentAction === 'confirm' ? 'animate-pulse' : ''}`} />
                      {currentAction === 'confirm'
                        ? resolveCopy(
                            'orders.confirmingOrder',
                            'جارٍ التأكيد…',
                            'Confirming…',
                          )
                        : t('orders.confirmOrder')}
                    </button>
                    <div className="flex items-stretch gap-1.5">
                      <select
                        value={callResults[order.id] || 'unreached'}
                        onChange={(event) =>
                          setCallResults((prev) => ({
                            ...prev,
                            [order.id]: event.target.value,
                          }))
                        }
                        disabled={isOrderBusy}
                        aria-label={t('orders.callResultLabel') || ''}
                        className="min-h-[40px] min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white px-2 py-2 text-xs font-bold text-gray-700 outline-none transition-colors focus:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      >
                        <option value="unreached">{t('orders.callResultUnreached')}</option>
                        <option value="reached">{t('orders.callResultReached')}</option>
                        <option value="busy">{t('orders.callResultBusy')}</option>
                        <option value="wrong_number">{t('orders.callResultWrongNumber')}</option>
                        <option value="callback">{t('orders.callResultCallback')}</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleLogCall(order, callResults[order.id] || 'unreached')}
                        disabled={isOrderBusy}
                        className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <PhoneIcon className={`h-4 w-4 ${currentAction === 'log-call' ? 'animate-pulse' : ''}`} />
                        {currentAction === 'log-call'
                          ? resolveCopy(
                              'orders.loggingCall',
                              'جارٍ التسجيل…',
                              'Logging…',
                            )
                          : t('orders.logCall')}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => void openOrderDetails(order)}
                      disabled={isOrderBusy}
                      className="inline-flex min-h-[36px] items-center justify-center gap-1 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200"
                    >
                      {currentAction === 'details'
                        ? resolveCopy(
                            'orders.loadingDetails',
                            'جارٍ التحميل…',
                            'Loading…',
                          )
                        : t('orders.viewDetails')}
                      <ChevronRightIcon className={`h-3.5 w-3.5 ${currentAction === 'details' ? 'animate-pulse' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCancelReasonText('');
                        setCancellingOrder(order);
                      }}
                      disabled={statusKey === 'CANCELLED' || isOrderBusy}
                      className="inline-flex min-h-[36px] items-center justify-center gap-1 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
                    >
                      <XCircleIcon className={`h-3.5 w-3.5 ${currentAction === 'cancel' ? 'animate-pulse' : ''}`} />
                      {currentAction === 'cancel'
                        ? resolveCopy(
                            'orders.cancellingOrder',
                            'جارٍ الإلغاء…',
                            'Cancelling…',
                          )
                        : t('orders.cancelOrder')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {orders.length > 0 && pagination.pages > page && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => void fetchOrders({ silent: true, page: page + 1, append: true })}
                disabled={loadingMore}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {loadingMore && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                {loadingMore
                  ? t('orders.workspaceLoadingMore')
                  : t('orders.workspaceLoadMore')}
              </button>
            </div>
          )}
        </div>
      )}

      {selectedOrder && (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            </div>
          }
        >
          <EnhancedOrderModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            order={selectedOrder}
            onOrderUpdate={handleOrderUpdate}
          />
        </React.Suspense>
      )}

      {cancellingOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('orders.cancelReasonTitle') || ''}
          onClick={() => setCancellingOrder(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-3 text-base font-black text-gray-900 dark:text-white">
              {t('orders.cancelReasonTitle')}
            </h2>
            <textarea
              value={cancelReasonText}
              onChange={(event) => setCancelReasonText(event.target.value)}
              placeholder={t('orders.cancelReasonPlaceholder') || ''}
              rows={3}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                {t('orders.cancelClose')}
              </button>
              <button
                type="button"
                onClick={() => void confirmCancelOrder()}
                disabled={
                  !cancelReasonText.trim() ||
                  Boolean(cancellingOrder && busyOrders[cancellingOrder.id])
                }
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyOrders[cancellingOrder.id] === 'cancel'
                  ? t('orders.cancellingOrder')
                  : t('orders.cancelConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {followUpOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('orders.scheduleFollowUp') || ''}
          onClick={() => setFollowUpOrder(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-black text-gray-900 dark:text-white">
              {t('orders.scheduleFollowUp')}
            </h2>
            <p className="mb-4 truncate text-xs text-gray-500 dark:text-gray-400" dir="ltr">
              #{followUpOrder.orderNumber}
            </p>

            {followUpOrder.followUpDate && (
              <p className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
                {t('orders.followUpDateLabel')}: {formatDate(followUpOrder.followUpDate)}
              </p>
            )}

            <label
              htmlFor="follow-up-date-input"
              className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-300"
            >
              {t('orders.followUpDateLabel')}
            </label>
            <input
              id="follow-up-date-input"
              type="date"
              value={followUpDateValue}
              onChange={(event) => setFollowUpDateValue(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setFollowUpOrder(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                {t('orders.cancelClose')}
              </button>
              <button
                type="button"
                onClick={() => void handleSaveFollowUp()}
                disabled={
                  !followUpDateValue ||
                  Boolean(followUpOrder && busyOrders[followUpOrder.id])
                }
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyOrders[followUpOrder.id] === 'follow-up'
                  ? resolveCopy(
                      'orders.savingFollowUp',
                      'جارٍ الحفظ…',
                      'Saving…',
                    )
                  : t('orders.followUpSave')}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default AgentWorkspace;
