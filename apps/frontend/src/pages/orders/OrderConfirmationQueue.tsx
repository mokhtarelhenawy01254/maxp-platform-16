import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, CheckCircleIcon, FunnelIcon, XMarkIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import orderConfirmationService, {
  OrderConfirmationSettings,
  OrderConfirmationUser
} from '../../services/orderConfirmationService';

interface ConfirmationOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  total: number;
  status: string;
  sourceType: string;
  createdAt: string;
  governorate?: string;
  assignedTo?: string | null;
  assignedAt?: string | null;
  confirmedAt?: string | null;
  isGuestOrder?: boolean;
  assignedToName?: string | null;
  assignmentStrategy?: string | null;
}

interface ConfirmationStats {
  range: { startDate: string; endDate: string };
  totals: {
    confirmedRegular: number;
    confirmedGuest: number;
    totalConfirmed: number;
    totalAssigned: number;
  };
  assignmentsByUser: Array<{
    userId: string;
    name: string;
    email?: string | null;
    count: number;
  }>;
}

interface OrderRowProps {
  order: ConfirmationOrder;
  assignValue: string;
  eligibleUsers: OrderConfirmationUser[];
  assigningId: string | null;
  cancellingId: string | null;
  settingsEnabled: boolean;
  selectionEnabled: boolean;
  isSelected: boolean;
  formatDate: (value: string) => string;
  formatPrice: (value: number) => string;
  strategyLabelMap: Record<string, string>;
  onAssignChange: (orderId: string, value: string) => void;
  onAssign: (orderId: string, userId: string) => void;
  onConfirm: (orderId: string) => void;
  onCancel: (order: ConfirmationOrder) => void;
  onToggleSelect: (orderId: string) => void;
}

const OrderRow = React.memo(({
  order,
  assignValue,
  eligibleUsers,
  assigningId,
  cancellingId,
  settingsEnabled,
  selectionEnabled,
  isSelected,
  formatDate,
  formatPrice,
  strategyLabelMap,
  onAssignChange,
  onAssign,
  onConfirm,
  onCancel,
  onToggleSelect
}: OrderRowProps) => {
  const isCancelled = String(order.status || '').toUpperCase() === 'CANCELLED';

  return (
    <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="flex-1 flex items-start gap-3">
        {selectionEnabled && (
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600"
            checked={isSelected}
            onChange={() => onToggleSelect(order.id)}
          />
        )}
        <div className="flex-1">
        <div className="flex items-center gap-2">
          <Link
            to={`/orders/${encodeURIComponent(order.orderNumber)}`}
            className="font-bold text-gray-900 dark:text-white hover:text-indigo-600"
          >
            {order.orderNumber}
          </Link>
          {order.isGuestOrder && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              ضيف
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {order.customerName} • {order.customerPhone || 'بدون هاتف'}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {formatDate(order.createdAt)} • {order.sourceType}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          موزع على: {order.assignedToName || order.assignedTo || 'غير موزع'}
          {order.assignmentStrategy
            ? ` • ${strategyLabelMap[order.assignmentStrategy] || order.assignmentStrategy}`
            : ''}
        </div>
        </div>
      </div>
      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        {formatPrice(Number(order.total) || 0)}
      </div>
      <div className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
        {order.status}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {settingsEnabled && (
          <>
            <select
              value={assignValue}
              onChange={(e) => onAssignChange(order.id, e.target.value)}
              className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-xs min-w-[160px]"
              disabled={eligibleUsers.length === 0}
            >
              <option value="">اختر موظف للتوزيع</option>
              {eligibleUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => onAssign(order.id, assignValue)}
              disabled={assigningId === order.id || !assignValue}
              className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs disabled:opacity-60"
            >
              توزيع
            </button>
          </>
        )}
        <button
          onClick={() => onConfirm(order.id)}
          disabled={isCancelled}
          className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircleIcon className="w-4 h-4" />
          تأكيد
        </button>
        <button
          onClick={() => onCancel(order)}
          disabled={isCancelled || cancellingId === order.id}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-100 bg-red-50 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
        >
          <XCircleIcon className={`w-4 h-4 ${cancellingId === order.id ? 'animate-pulse' : ''}`} />
          {cancellingId === order.id ? 'جارٍ الإلغاء...' : 'إلغاء'}
        </button>
      </div>
    </div>
  );
});

OrderRow.displayName = 'OrderRow';

interface OrderConfirmationQueueProps {
  embedded?: boolean;
}

const OrderConfirmationQueue: React.FC<OrderConfirmationQueueProps> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const [settings, setSettings] = useState<OrderConfirmationSettings | null>(null);
  const [orders, setOrders] = useState<ConfirmationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<ConfirmationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsStartDate, setStatsStartDate] = useState('');
  const [statsEndDate, setStatsEndDate] = useState('');
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [statsStrategy, setStatsStrategy] = useState('');
  const [eligibleUsers, setEligibleUsers] = useState<OrderConfirmationUser[]>([]);
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkUserId, setBulkUserId] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const listParentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const sourceOptions = useMemo(
    () => [
      { value: '', label: 'كل المصادر' },
      { value: 'ai_conversation', label: 'محادثة تلقائية' },
      { value: 'manual', label: 'يدوي' },
      { value: 'storefront', label: 'المتجر' },
      { value: 'woocommerce', label: 'WooCommerce' },
      { value: 'pos', label: 'POS' },
      { value: 'api', label: 'API' },
      { value: 'import', label: 'استيراد' },
      { value: 'unknown', label: 'غير معروف' }
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'كل الحالات' },
      { value: 'pending', label: 'جديد / قيد الانتظار' },
      { value: 'confirmed', label: 'مؤكد' },
      { value: 'processing', label: 'قيد المعالجة' },
      { value: 'shipped', label: 'تم الشحن' },
      { value: 'delivered', label: 'تم التسليم' },
      { value: 'cancelled', label: 'ملغي' }
    ],
    []
  );

  const strategyOptions = useMemo(
    () => [
      { value: '', label: 'كل الاستراتيجيات' },
      { value: 'round_robin', label: 'توزيع متساوي' },
      { value: 'by_region', label: 'حسب المنطقة' },
      { value: 'by_specialty', label: 'حسب المنتج' },
      { value: 'by_order_value', label: 'حسب قيمة الأوردر' },
      { value: 'by_workload', label: 'حسب العبء الحالي' },
      { value: 'manual', label: 'توزيع يدوي' }
    ],
    []
  );

  const strategyLabelMap = useMemo(() => {
    return strategyOptions.reduce<Record<string, string>>((acc, opt) => {
      if (opt.value) acc[opt.value] = opt.label;
      return acc;
    }, {});
  }, [strategyOptions]);

  const fetchSettings = async () => {
    try {
      const res = await orderConfirmationService.getSettings();
      setSettings(res.data);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تحميل الإعدادات');
    }
  };

  const fetchEligibleUsers = async () => {
    try {
      const res = await orderConfirmationService.getEligibleUsers();
      setEligibleUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تحميل فريق التوزيع');
    }
  };

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        limit
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.sourceType = sourceFilter;
      if (onlyUnassigned) params.onlyUnassigned = true;

      const res = await orderConfirmationService.getQueue(params);
      setOrders(Array.isArray(res.data) ? res.data : []);
      setTotalOrders(res.pagination?.total || 0);
      setTotalPages(res.pagination?.pages || 1);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const params: Record<string, any> = {};
      if (statsStartDate) params.startDate = statsStartDate;
      if (statsEndDate) params.endDate = statsEndDate;
      if (statsStrategy) params.strategy = statsStrategy;
      const res = await orderConfirmationService.getStats(params);
      setStats(res.data || null);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تحميل تقرير الفريق');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings?.enabled) {
      fetchEligibleUsers();
    }
  }, [settings?.enabled]);

  useEffect(() => {
    fetchQueue();
  }, [page, limit, search, statusFilter, sourceFilter, onlyUnassigned, refreshKey]);

  useEffect(() => {
    if (settings?.enabled) {
      fetchStats();
    }
  }, [settings?.enabled, refreshKey, statsStartDate, statsEndDate, statsRefreshKey]);

  useEffect(() => {
    if (settings?.enabled) {
      fetchStats();
    }
  }, [statsStrategy]);

  const strategyLabel = useMemo(() => {
    const match = strategyOptions.find((opt) => opt.value === statsStrategy);
    return match?.label || '';
  }, [statsStrategy, strategyOptions]);

  const statsSummaryLabel = useMemo(() => {
    if (statsStartDate || statsEndDate) {
      const fromLabel = statsStartDate ? formatDate(statsStartDate) : '—';
      const toLabel = statsEndDate ? formatDate(statsEndDate) : '—';
      const base = `ملخص الفترة من ${fromLabel} إلى ${toLabel}.`;
      return statsStrategy ? `${base} الاستراتيجية: ${strategyLabel}.` : base;
    }
    if (statsStrategy) {
      return `ملخص آخر 30 يوم بناءً على عمليات التأكيد والتوزيع. الاستراتيجية: ${strategyLabel}.`;
    }
    return 'ملخص آخر 30 يوم بناءً على عمليات التأكيد والتوزيع.';
  }, [statsStartDate, statsEndDate, formatDate, statsStrategy, strategyLabel]);

  const activeQueueFilterCount = useMemo(
    () => [statusFilter, sourceFilter, onlyUnassigned].filter(Boolean).length,
    [statusFilter, sourceFilter, onlyUnassigned]
  );

  const resolveCopy = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  }, [t]);

  const statusFilterLabel = useMemo(
    () => statusOptions.find((opt) => opt.value === statusFilter)?.label || 'كل الحالات',
    [statusFilter, statusOptions]
  );

  const sourceFilterLabel = useMemo(
    () => sourceOptions.find((opt) => opt.value === sourceFilter)?.label || 'كل المصادر',
    [sourceFilter, sourceOptions]
  );

  const resetQueueFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setSourceFilter('');
    setOnlyUnassigned(false);
    setPage(1);
  }, []);

  const handleConfirm = useCallback(async (orderId: string) => {
    try {
      const res = await orderConfirmationService.confirmOrder(orderId);
      if (res?.data?.status === 'pending') {
        toast('تم إرسال الطلب للموافقة');
      } else {
        toast.success('تم تأكيد الطلب');
      }
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || 'فشل تأكيد الطلب');
    }
  }, []);

  const handleCancel = useCallback(async (order: ConfirmationOrder) => {
    const cancellationReason = window.prompt(
      resolveCopy('orders.cancellationReasonPrompt', 'اكتب سبب إلغاء الطلب:'),
    );

    if (cancellationReason === null) {
      return;
    }

    const notes = cancellationReason.trim();

    if (!notes) {
      toast.error(resolveCopy('orders.cancellationReasonRequired', 'سبب إلغاء الطلب مطلوب'));
      return;
    }

    try {
      setCancellingId(order.id);
      await orderConfirmationService.cancelOrder(order.id, {
        type: order.isGuestOrder ? 'GUEST' : 'REGULAR',
        notes
      });
      toast.success(resolveCopy('orders.orderCancelled', 'تم إلغاء الطلب'));
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || 'فشل إلغاء الطلب');
    } finally {
      setCancellingId(null);
    }
  }, [resolveCopy]);

  const handleAssign = useCallback(async (orderId: string, userId: string) => {
    if (!userId) {
      toast.error('اختر موظفاً للتوزيع أولاً');
      return;
    }
    try {
      setAssigningId(orderId);
      await orderConfirmationService.assignOrder(orderId, userId, null, 'manual');
      toast.success('تم توزيع الطلب');
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || 'فشل توزيع الطلب');
    } finally {
      setAssigningId(null);
    }
  }, []);

  const handleAssignChange = useCallback((orderId: string, value: string) => {
    setAssignSelections((prev) => ({
      ...prev,
      [orderId]: value
    }));
  }, []);

  const handleToggleSelect = useCallback((orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedOrderIds((prev) => (prev.length === orders.length ? [] : orders.map((order) => order.id)));
  }, [orders]);

  const handleBulkConfirm = useCallback(async () => {
    if (!selectedOrderIds.length) {
      toast.error('اختر طلبات أولاً');
      return;
    }
    try {
      setBulkProcessing(true);
      const res = await orderConfirmationService.confirmOrders(selectedOrderIds);
      const summary = res?.data?.summary;
      if (summary) {
        const parts = [`تم تأكيد ${summary.confirmed} طلب`];
        if (summary.pending) parts.push(`${summary.pending} في انتظار الموافقة`);
        if (summary.failed) parts.push(`${summary.failed} فشل`);
        toast.success(parts.join('، '));
      } else {
        toast.success('تم تأكيد الطلبات');
      }
      setSelectedOrderIds([]);
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || 'فشل تأكيد الطلبات');
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrderIds]);

  const handleBulkAssign = useCallback(async () => {
    if (!selectedOrderIds.length) {
      toast.error('اختر طلبات أولاً');
      return;
    }
    if (!bulkUserId) {
      toast.error('اختر موظفاً للتوزيع أولاً');
      return;
    }
    try {
      setBulkProcessing(true);
      const res = await orderConfirmationService.assignOrders(selectedOrderIds, bulkUserId, null, 'manual');
      const summary = res?.data?.summary;
      if (summary) {
        const parts = [`تم توزيع ${summary.assigned} طلب`];
        if (summary.failed) parts.push(`${summary.failed} فشل`);
        toast.success(parts.join('، '));
      } else {
        toast.success('تم توزيع الطلبات');
      }
      setSelectedOrderIds([]);
      setBulkUserId('');
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || 'فشل توزيع الطلبات');
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrderIds, bulkUserId]);

  useEffect(() => {
    setSelectedOrderIds([]);
    setBulkUserId('');
  }, [orders]);

  const selectedCount = selectedOrderIds.length;
  const allSelected = orders.length > 0 && selectedCount === orders.length;

  const rowVirtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 170,
    overscan: 6
  });


  if (settings && !settings.enabled) {
    return (
      <div className="space-y-6" dir="rtl">
        {!embedded && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">طلبات تحتاج تأكيد</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                هذه الصفحة تعرض الطلبات التي تتطلب تأكيداً قبل التنفيذ.
              </p>
            </div>
          </div>
        )}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-amber-800 dark:text-amber-300">ميزة التأكيد غير مفعّلة</h2>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
            يرجى تفعيل قواعد التأكيد والتوزيع من إعدادات الطلبات.
          </p>
          <Link
            to="/settings/orders?tab=confirmation"
            className="inline-flex mt-4 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold"
          >
            فتح الإعدادات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {!embedded && (
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">طلبات تحتاج تأكيد</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              فلترة وإدارة الطلبات التي تحتاج إلى تأكيد قبل التنفيذ.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:rounded-xl sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="بحث برقم الطلب أو اسم العميل"
              className="min-h-[48px] w-full rounded-2xl border border-gray-300 bg-white py-3 pl-3 pr-10 text-base dark:border-gray-600 dark:bg-gray-900 sm:min-h-0 sm:rounded-lg sm:py-2 sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-200 sm:hidden"
          >
            <FunnelIcon className="h-5 w-5" />
            فلترة
            {activeQueueFilterCount > 0 && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                {activeQueueFilterCount}
              </span>
            )}
          </button>
          <div className="hidden gap-2 flex-wrap sm:flex">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setOnlyUnassigned((prev) => !prev)}
              className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-2 ${onlyUnassigned
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                }`}
            >
              <FunnelIcon className="w-4 h-4" />
              غير موزع
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 sm:hidden">
          <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-900/50">{statusFilterLabel}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-900/50">{sourceFilterLabel}</span>
          {onlyUnassigned && (
            <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
              غير موزع
            </span>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-gray-950/45 p-0 backdrop-blur-sm sm:hidden" role="dialog" aria-modal="true">
          <div className="w-full rounded-t-[2rem] border border-gray-100 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">فلترة طابور التأكيد</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">اختصر النتائج بدون ما تخرج من الشاشة.</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                aria-label="إغلاق الفلاتر"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                الحالة
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="mt-2 min-h-[48px] w-full rounded-2xl border border-gray-300 bg-white px-3 text-base dark:border-gray-600 dark:bg-gray-800"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                المصدر
                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value);
                    setPage(1);
                  }}
                  className="mt-2 min-h-[48px] w-full rounded-2xl border border-gray-300 bg-white px-3 text-base dark:border-gray-600 dark:bg-gray-800"
                >
                  {sourceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setOnlyUnassigned((prev) => !prev)}
                className={`flex min-h-[48px] w-full items-center justify-between rounded-2xl border px-4 text-sm font-bold ${onlyUnassigned
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
                  }`}
              >
                <span>عرض الطلبات غير الموزعة فقط</span>
                <FunnelIcon className="h-5 w-5" />
              </button>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetQueueFilters}
                  className="min-h-[46px] rounded-2xl border border-gray-300 text-sm font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200"
                >
                  إعادة ضبط
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="min-h-[46px] rounded-2xl bg-blue-600 text-sm font-bold text-white"
                >
                  عرض النتائج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:rounded-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">تقرير الفريق</h2>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:hidden">تأكيد وتوزيع آخر 30 يوم</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/25 dark:text-blue-200 sm:hidden">
            {stats?.totals.totalAssigned ?? 0} توزيع
          </span>
        </div>
        <p className="mt-1 hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
          {statsSummaryLabel}
        </p>
        <details className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-900/30 sm:hidden">
          <summary className="cursor-pointer text-sm font-bold text-gray-700 dark:text-gray-200">
            تخصيص التقرير
          </summary>
          <div className="mt-3 space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <label className="block">
              <span className="mb-1 block text-xs text-gray-500 dark:text-gray-400">من</span>
              <input
                type="date"
                value={statsStartDate}
                onChange={(e) => setStatsStartDate(e.target.value)}
                className="min-h-[44px] w-full rounded-2xl border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-500 dark:text-gray-400">إلى</span>
              <input
                type="date"
                value={statsEndDate}
                onChange={(e) => setStatsEndDate(e.target.value)}
                className="min-h-[44px] w-full rounded-2xl border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-500 dark:text-gray-400">الاستراتيجية</span>
              <select
                value={statsStrategy}
                onChange={(e) => setStatsStrategy(e.target.value)}
                className="min-h-[44px] w-full rounded-2xl border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800"
              >
                {strategyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStatsRefreshKey((prev) => prev + 1)}
                className="min-h-[42px] rounded-2xl bg-blue-600 text-xs font-bold text-white"
              >
                تحديث التقرير
              </button>
              <button
                onClick={() => {
                  setStatsStartDate('');
                  setStatsEndDate('');
                  setStatsStrategy('');
                  setStatsRefreshKey((prev) => prev + 1);
                }}
                className="min-h-[42px] rounded-2xl border border-gray-300 text-xs font-bold dark:border-gray-600"
              >
                إعادة ضبط
              </button>
            </div>
          </div>
        </details>
        <div className="mt-3 hidden flex-col gap-3 text-xs text-gray-600 dark:text-gray-300 sm:flex lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <label className="text-gray-500 dark:text-gray-400">من</label>
            <input
              type="date"
              value={statsStartDate}
              onChange={(e) => setStatsStartDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-500 dark:text-gray-400">إلى</label>
            <input
              type="date"
              value={statsEndDate}
              onChange={(e) => setStatsEndDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-500 dark:text-gray-400">الاستراتيجية</label>
            <select
              value={statsStrategy}
              onChange={(e) => setStatsStrategy(e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
            >
              {strategyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatsRefreshKey((prev) => prev + 1)}
              className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs"
            >
              تحديث التقرير
            </button>
            <button
              onClick={() => {
                setStatsStartDate('');
                setStatsEndDate('');
                setStatsStrategy('');
                setStatsRefreshKey((prev) => prev + 1);
              }}
              className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-xs"
            >
              إعادة ضبط
            </button>
          </div>
        </div>
        {statsLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">جاري تحميل التقرير...</div>
        ) : !stats ? (
          <div className="p-4 text-center text-sm text-gray-500">لا توجد بيانات كافية لعرض التقرير.</div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/20 sm:rounded-lg sm:bg-transparent">
                <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">إجمالي المؤكد</div>
                <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-xl sm:font-semibold">
                  {stats.totals.totalConfirmed}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/20 sm:rounded-lg sm:bg-transparent">
                <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">تأكيدات النظام</div>
                <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-xl sm:font-semibold">
                  {stats.totals.confirmedRegular}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/20 sm:rounded-lg sm:bg-transparent">
                <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">تأكيدات الضيوف</div>
                <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-xl sm:font-semibold">
                  {stats.totals.confirmedGuest}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/20 sm:rounded-lg sm:bg-transparent">
                <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">إجمالي التوزيع</div>
                <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-xl sm:font-semibold">
                  {stats.totals.totalAssigned}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 sm:rounded-lg">
              <div className="bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700 dark:bg-gray-900/30 dark:text-gray-200">
                توزيع الطلبات على الفريق
              </div>
              {stats.assignmentsByUser.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">لا توجد توزيعات خلال الفترة المحددة.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {stats.assignmentsByUser.map((entry) => (
                    <div key={entry.userId} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white">{entry.name || entry.userId}</div>
                        {entry.email && (
                          <div className="truncate text-xs text-gray-500 dark:text-gray-400">{entry.email}</div>
                        )}
                      </div>
                      <div className="ms-3 rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-900/25 dark:text-blue-200">
                        {entry.count}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {settings?.enabled && orders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                />
                تحديد الكل
              </label>
              <span className="text-xs text-gray-500">
                تم تحديد {selectedCount} طلب
              </span>
              {selectedCount > 0 && (
                <button
                  onClick={() => setSelectedOrderIds([])}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkUserId}
                onChange={(e) => setBulkUserId(e.target.value)}
                className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-xs min-w-[160px]"
                disabled={eligibleUsers.length === 0 || selectedCount === 0}
              >
                <option value="">اختر موظف للتوزيع</option>
                {eligibleUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.id}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={selectedCount === 0 || !bulkUserId || bulkProcessing}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs disabled:opacity-60"
              >
                توزيع جماعي
              </button>
              <button
                onClick={handleBulkConfirm}
                disabled={selectedCount === 0 || bulkProcessing}
                className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs disabled:opacity-60"
              >
                تأكيد جماعي
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:rounded-xl">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500 sm:p-10">{t('orders.loadingOrders')}</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-center sm:p-10">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div className="font-bold text-gray-800 dark:text-gray-100">كل شيء تحت السيطرة</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">لا توجد طلبات تحتاج تأكيد حالياً</div>
          </div>
        ) : (
          <div ref={listParentRef} className="max-h-[70vh] overflow-auto">
            <div
              className="relative w-full"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const order = orders[virtualRow.index];
                if (!order) return null;
                return (
                  <div
                    key={order.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="border-b border-gray-100 dark:border-gray-700"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  >
                    <OrderRow
                      order={order}
                      assignValue={assignSelections[order.id] || ''}
                      eligibleUsers={eligibleUsers}
                      assigningId={assigningId}
                      cancellingId={cancellingId}
                      settingsEnabled={Boolean(settings?.enabled)}
                      selectionEnabled={Boolean(settings?.enabled)}
                      isSelected={selectedOrderIds.includes(order.id)}
                      formatDate={formatDate}
                      formatPrice={formatPrice}
                      strategyLabelMap={strategyLabelMap}
                      onAssignChange={handleAssignChange}
                      onAssign={handleAssign}
                      onConfirm={handleConfirm}
                      onCancel={handleCancel}
                      onToggleSelect={handleToggleSelect}
                    />
                  </div>
                );
              })}
            </div>
          </div>
      )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>
            عرض {orders.length} من {totalOrders}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              السابق
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderConfirmationQueue;
