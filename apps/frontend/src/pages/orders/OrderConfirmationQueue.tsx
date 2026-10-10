import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  FunnelIcon,
  XMarkIcon,
  XCircleIcon,
  PhoneIcon,
  CalendarDaysIcon,
  PrinterIcon,
  PencilSquareIcon,
  CreditCardIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useInvoiceSettings } from '../../hooks/useInvoiceSettings';
import { printSingleShippingLabel } from '../../utils/printShippingLabel';
import orderConfirmationService, {
  OrderConfirmationSettings,
  OrderConfirmationUser
} from '../../services/orderConfirmationService';
import api from '../../services/api';
import PostponeOrderModal from './components/PostponeOrderModal';
import { OrderCallButton } from '../../components/telephony/OrderCallButton';

interface ConfirmationOrderItem {
  id: string;
  productId?: string;
  productName?: string;
  name?: string;
  quantity: number;
  price: number;
  total?: number;
  color?: string;
  size?: string;
  sku?: string | null;
  image?: string | null;
}

interface ConfirmationOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  shippingAddress?: string;
  city?: string;
  total: number;
  subtotal?: number;
  discount?: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  sourceType: string;
  createdAt: string;
  governorate?: string;
  assignedTo?: string | null;
  assignedAt?: string | null;
  confirmedAt?: string | null;
  isGuestOrder?: boolean;
  assignedToName?: string | null;
  assignmentStrategy?: string | null;
  callAttempts?: number;
  lastCallAttemptAt?: string | null;
  shipping?: number;
  codDepositAmount?: number;
  notes?: string;
  metadata?: any;
  items?: ConfirmationOrderItem[];
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
  callingId: string | null;
  maxCallsNoAnswer: number;
  intervalMinutes: number;
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
  onLogCall: (order: ConfirmationOrder, result?: string) => void;
  onPostpone: (order: ConfirmationOrder) => void;
  onToggleSelect: (orderId: string) => void;
  onPrintSlip?: (order: ConfirmationOrder) => void;
  onPrintInvoice?: (order: ConfirmationOrder) => void;
}

const OrderRow = React.memo(({
  order,
  assignValue,
  eligibleUsers,
  assigningId,
  cancellingId,
  callingId,
  maxCallsNoAnswer,
  intervalMinutes,
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
  onLogCall,
  onPostpone,
  onToggleSelect,
  onPrintSlip,
  onPrintInvoice,
}: OrderRowProps) => {
  const { t } = useTranslation();
  const isCancelled = String(order.status || '').toUpperCase() === 'CANCELLED';
  const callAttempts = order.callAttempts || 0;
  const deposit = Number(order.codDepositAmount) || 0;
  const shipping = Number(order.shipping) || 0;
  const amountDue = (Number(order.total) || 0) + shipping - deposit;
  const callsLimitReached = maxCallsNoAnswer > 0 && callAttempts >= maxCallsNoAnswer;
  const lastCallAt = order.lastCallAttemptAt ? new Date(order.lastCallAttemptAt) : null;
  const nextCallAllowedAt = lastCallAt && intervalMinutes > 0
    ? new Date(lastCallAt.getTime() + intervalMinutes * 60 * 1000)
    : null;
  const waitingForNextCall = Boolean(nextCallAllowedAt && nextCallAllowedAt.getTime() > Date.now());
  const callBlocked = callsLimitReached || waitingForNextCall;

  const paymentMethodUpper = String(order.paymentMethod || '').toUpperCase();
  const paymentStatusUpper = String(order.paymentStatus || '').toUpperCase();
  const isPaid = paymentStatusUpper === 'COMPLETED' || paymentStatusUpper === 'PAID';
  const isPrepaid = isPaid || ['CREDIT_CARD', 'WALLET', 'INSTAPAY', 'VISA', 'MASTERCARD', 'VODAFONE_CASH'].includes(paymentMethodUpper);

  const getPaymentBadge = () => {
    if (paymentMethodUpper.includes('WALLET') || paymentMethodUpper.includes('VODAFONE')) {
      return {
        label: isPaid ? 'محفظة إلكترونية — مدفوع' : 'محفظة إلكترونية — مراجعة الدفع',
        className: isPaid
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
      };
    }
    if (paymentMethodUpper.includes('INSTAPAY')) {
      return {
        label: isPaid ? 'إنستاباي — مدفوع' : 'إنستاباي — مراجعة الدفع',
        className: isPaid
          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
      };
    }
    if (paymentMethodUpper.includes('CARD') || paymentMethodUpper.includes('VISA') || paymentMethodUpper.includes('MASTERCARD')) {
      return {
        label: isPaid ? 'بطاقة بنكية — مدفوع أونلاين' : 'بطاقة بنكية — مراجعة الدفع',
        className: isPaid
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
      };
    }
    if (isPaid) {
      return {
        label: 'مدفوع مسبقاً',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
      };
    }
    return {
      label: 'دفع عند الاستلام',
      className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    };
  };

  const paymentBadge = getPaymentBadge();

  return (
    <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
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
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/orders/${encodeURIComponent(order.orderNumber)}`}
              className="font-bold text-gray-900 dark:text-white hover:text-indigo-600 transition-colors"
            >
              {order.orderNumber}
            </Link>
            {order.isGuestOrder && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {t('orders.guest')}
              </span>
            )}
            <span className={`text-[11px] px-2 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1 ${paymentBadge.className}`}>
              <CreditCardIcon className="w-3 h-3" />
              {paymentBadge.label}
            </span>
            {isPrepaid && (
              <span className="text-[11px] px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200 font-semibold">
                قيد المراجعة والمطابقة
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            <span className="font-semibold text-gray-800 dark:text-gray-100">{order.customerName}</span>
            {' • '}
            <span dir="ltr">{order.customerPhone || t('orders.noPhone')}</span>
            {order.governorate && <span> • {order.governorate}</span>}
          </div>

          {/* تفاصيل المنتجات داخل الأوردر */}
          {order.items && order.items.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {order.items.map((item, idx) => (
                <span
                  key={item.id || idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700 font-medium"
                >
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.quantity}×</span>
                  <span>{item.productName || item.name}</span>
                  {(item.color || item.size) && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      ({[item.color, item.size].filter(Boolean).join(' - ')})
                    </span>
                  )}
                  {item.sku && (
                    <span className="text-[10px] text-slate-400 font-mono">[{item.sku}]</span>
                  )}
                </span>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-2 flex-wrap">
            <span>{formatDate(order.createdAt)} • {order.sourceType}</span>
            <span>• {t('orders.distributedTo')} {order.assignedToName || order.assignedTo || t('orders.unassigned')}</span>
            {order.assignmentStrategy && (
              <span>• {strategyLabelMap[order.assignmentStrategy] || order.assignmentStrategy}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start gap-1 text-sm min-w-[120px]">
        <span className="font-bold text-gray-800 dark:text-gray-200">
          {t('orders.amountDue', 'المستحق')}: {formatPrice(amountDue)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatPrice(Number(order.total) || 0)}
          {shipping > 0 && ` + ${formatPrice(shipping)} ${t('orders.shippingShort', 'شحن')}`}
          {deposit > 0 && ` - ${formatPrice(deposit)} ${t('orders.depositShort', 'عربون')}`}
        </span>
        {callAttempts > 0 && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${callBlocked ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/50 dark:text-gray-300'}`}>
            {t('orders.callAttemptsCount', 'محاولات الاتصال')}: {callAttempts}/{maxCallsNoAnswer > 0 ? maxCallsNoAnswer : '∞'}
          </span>
        )}
      </div>
      <div className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-semibold">
        {order.status}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {settingsEnabled && (
          <>
            <select
              value={assignValue}
              onChange={(e) => onAssignChange(order.id, e.target.value)}
              className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-xs min-w-[150px]"
              disabled={eligibleUsers.length === 0}
            >
              <option value="">{t('orders.selectEmployeeToAssign')}</option>
              {eligibleUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => onAssign(order.id, assignValue)}
              disabled={assigningId === order.id || !assignValue}
              className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs disabled:opacity-60 font-semibold"
            >
              {t('orders.assign')}
            </button>
          </>
        )}

        {/* زر طباعة تفاصيل التجهيز والأصناف */}
        <button
          type="button"
          onClick={() => onPrintSlip?.(order)}
          disabled={isCancelled}
          title="طباعة قسيمة التجهيز وتفاصيل المنتجات"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <PrinterIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>طباعة الأصناف</span>
        </button>

        {/* زر طباعة الفاتورة */}
        <button
          type="button"
          onClick={() => onPrintInvoice?.(order)}
          disabled={isCancelled}
          title="طباعة الفاتورة"
          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <DocumentTextIcon className="w-4 h-4 text-gray-500" />
          <span className="hidden sm:inline">فاتورة</span>
        </button>

        {/* زر تعديل الطلب */}
        <Link
          to={`/orders/${encodeURIComponent(order.orderNumber)}?edit=1`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          title="تعديل بنود وكميات وبيانات الطلب"
        >
          <PencilSquareIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>تعديل</span>
        </Link>

        {/* زر خيارات الدفع */}
        <Link
          to={`/orders/${encodeURIComponent(order.orderNumber)}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="خيارات وحالة الدفع والمطابقة"
        >
          <CreditCardIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>الدفع</span>
        </Link>

        {/* زر الاتصال الهاتفي الحقيقي عبر هاتف الموظف المقترن */}
        <OrderCallButton
          orderId={order.id}
          orderNumber={order.orderNumber}
          customerName={order.customerName}
          customerPhone={order.customerPhone}
          compact
          onConfirm={() => onConfirm(order.id)}
          onNoAnswer={() => onLogCall(order, 'unreached')}
          onPostpone={() => onPostpone(order)}
          onCancel={() => onCancel(order)}
        />

        <button
          onClick={() => onLogCall(order, 'unreached')}
          disabled={isCancelled || callBlocked || callingId === order.id}
          title={waitingForNextCall && nextCallAllowedAt
            ? `${t('orders.nextCallAfter', 'اتصل بعد')}: ${new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(nextCallAllowedAt)}`
            : callsLimitReached ? String(t('orders.callsLimitReached', 'وصلت لأقصى محاولات الاتصال')) : undefined}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
        >
          <PhoneIcon className="w-4 h-4" />
          {callingId === order.id ? t('orders.loggingCall', 'جاري التسجيل...') : t('orders.noAnswer', 'لا رد')}
        </button>
        <button
          onClick={() => onPostpone(order)}
          disabled={isCancelled}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <CalendarDaysIcon className="w-4 h-4" />
          {t('orders.postponeOrderTitle', 'تأجيل الطلب')}
        </button>
        <button
          onClick={() => onConfirm(order.id)}
          disabled={isCancelled}
          className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
        >
          <CheckCircleIcon className="w-4 h-4" />
          {t('orders.confirmOrder')}
        </button>
        <button
          onClick={() => onCancel(order)}
          disabled={isCancelled || cancellingId === order.id}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-100 bg-red-50 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
        >
          <XCircleIcon className={`w-4 h-4 ${cancellingId === order.id ? 'animate-pulse' : ''}`} />
          {cancellingId === order.id ? t('orders.cancellingOrder') : t('orders.cancelOrder')}
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
  const { settings: invoiceSettings } = useInvoiceSettings();

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
  const [callingId, setCallingId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkUserId, setBulkUserId] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ConfirmationOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [postponeTarget, setPostponeTarget] = useState<ConfirmationOrder | null>(null);
  const [postponeLoading, setPostponeLoading] = useState(false);
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
      { value: '', label: t('orders.allSources') },
      { value: 'ai_conversation', label: t('orders.sourceAutoConversation') },
      { value: 'manual', label: t('orders.sourceManual') },
      { value: 'storefront', label: t('orders.sourceStorefront') },
      { value: 'woocommerce', label: t('orders.sourceWooCommerce') },
      { value: 'pos', label: t('orders.sourcePOS') },
      { value: 'api', label: t('orders.sourceAPI') },
      { value: 'import', label: t('orders.sourceImport') },
      { value: 'unknown', label: t('orders.sourceUnknown') }
    ],
    [t]
  );

  const statusOptions = useMemo(
    () => [
      { value: '', label: t('orders.allStatuses') },
      { value: 'pending', label: t('orders.pendingNew') },
      { value: 'confirmed', label: t('orders.confirmed') },
      { value: 'processing', label: t('orders.processing') },
      { value: 'shipped', label: t('orders.shipped') },
      { value: 'delivered', label: t('orders.delivered') },
      { value: 'cancelled', label: t('orders.cancelled') }
    ],
    [t]
  );

  const strategyOptions = useMemo(
    () => [
      { value: '', label: t('orders.allStrategies') },
      { value: 'round_robin', label: t('orders.strategyRoundRobin') },
      { value: 'by_region', label: t('orders.strategyByRegion') },
      { value: 'by_specialty', label: t('orders.strategyBySpecialty') },
      { value: 'by_order_value', label: t('orders.strategyByOrderValue') },
      { value: 'by_workload', label: t('orders.strategyByWorkload') },
      { value: 'manual', label: t('orders.strategyManualAssign') }
    ],
    [t]
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
      toast.error(error?.message || t('orders.failedToLoadSettings'));
    }
  };

  const fetchEligibleUsers = async () => {
    try {
      const res = await orderConfirmationService.getEligibleUsers();
      setEligibleUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast.error(error?.message || t('orders.failedToLoadDistributionTeam'));
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
      toast.error(error?.message || t('orders.failedToLoadOrders'));
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
      toast.error(error?.message || t('orders.failedToLoadTeamReport'));
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
      const base = t('orders.summaryFromTo', { from: fromLabel, to: toLabel });
      return statsStrategy ? `${base} ${t('orders.summaryStrategy', { strategy: strategyLabel })}` : base;
    }
    if (statsStrategy) {
      return `${t('orders.summaryLast30Days')} ${t('orders.summaryStrategy', { strategy: strategyLabel })}`;
    }
    return t('orders.summaryLast30Days');
  }, [statsStartDate, statsEndDate, formatDate, statsStrategy, strategyLabel, t]);

  const activeQueueFilterCount = useMemo(
    () => [statusFilter, sourceFilter, onlyUnassigned].filter(Boolean).length,
    [statusFilter, sourceFilter, onlyUnassigned]
  );

  const resolveCopy = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  }, [t]);

  const statusFilterLabel = useMemo(
    () => statusOptions.find((opt) => opt.value === statusFilter)?.label || t('orders.allStatuses'),
    [statusFilter, statusOptions, t]
  );

  const sourceFilterLabel = useMemo(
    () => sourceOptions.find((opt) => opt.value === sourceFilter)?.label || t('orders.allSources'),
    [sourceFilter, sourceOptions, t]
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
        toast(t('orders.orderSentForApproval'));
      } else {
        toast.success(t('orders.orderConfirmed'));
      }
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t('orders.failedToConfirmOrder'));
    }
  }, [t]);

  const handlePrintSlip = useCallback(async (order: ConfirmationOrder) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('تم حظر النافذة المنبثقة، يرجى السماح بالنوافذ المنبثقة للطباعة');
        return;
      }
      await printSingleShippingLabel({
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          customerAddress: order.customerAddress || order.shippingAddress || '',
          city: order.city || '',
          governorate: order.governorate || '',
          status: order.status,
          paymentStatus: (order.paymentStatus as any) || 'PENDING',
          paymentMethod: order.paymentMethod || 'CASH',
          total: order.total,
          shipping: order.shipping || 0,
          subtotal: order.subtotal || order.total,
          discount: order.discount || 0,
          notes: order.notes || '',
          createdAt: order.createdAt,
          items: (order.items || []).map((it) => ({
            id: it.id,
            productId: it.productId,
            name: it.productName || it.name,
            productName: it.productName || it.name,
            quantity: it.quantity,
            price: it.price,
            total: it.total,
            color: it.color,
            size: it.size,
            sku: it.sku || undefined,
          }))
        },
        labelType: 'preparation_slip',
        settings: invoiceSettings,
        printWindow
      });
    } catch (err: any) {
      toast.error(err?.message || 'فشلت الطباعة');
    }
  }, [invoiceSettings]);

  const handlePrintInvoice = useCallback(async (order: ConfirmationOrder) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('تم حظر النافذة المنبثقة، يرجى السماح بالنوافذ المنبثقة للطباعة');
        return;
      }
      await printSingleShippingLabel({
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          customerAddress: order.customerAddress || order.shippingAddress || '',
          city: order.city || '',
          governorate: order.governorate || '',
          status: order.status,
          paymentStatus: (order.paymentStatus as any) || 'PENDING',
          paymentMethod: order.paymentMethod || 'CASH',
          total: order.total,
          shipping: order.shipping || 0,
          subtotal: order.subtotal || order.total,
          discount: order.discount || 0,
          notes: order.notes || '',
          createdAt: order.createdAt,
          items: (order.items || []).map((it) => ({
            id: it.id,
            productId: it.productId,
            name: it.productName || it.name,
            productName: it.productName || it.name,
            quantity: it.quantity,
            price: it.price,
            total: it.total,
            color: it.color,
            size: it.size,
            sku: it.sku || undefined,
          }))
        },
        labelType: 'invoice',
        settings: invoiceSettings,
        printWindow
      });
    } catch (err: any) {
      toast.error(err?.message || 'فشلت الطباعة');
    }
  }, [invoiceSettings]);

  const handleCancel = useCallback(async (order: ConfirmationOrder) => {
    setCancelReason('');
    setCancelTarget(order);
  }, []);

  const submitCancel = useCallback(async () => {
    const order = cancelTarget;
    if (!order) return;

    const notes = cancelReason.trim();
    if (!notes) {
      toast.error(resolveCopy('orders.cancellationReasonRequired', 'Cancellation reason is required'));
      return;
    }

    try {
      setCancellingId(order.id);
      await orderConfirmationService.cancelOrder(order.id, {
        type: order.isGuestOrder ? 'GUEST' : 'REGULAR',
        notes
      });
      toast.success(resolveCopy('orders.orderCancelled', 'Order cancelled successfully'));
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t('orders.cancelFailedToast'));
    } finally {
      setCancellingId(null);
      setCancelTarget(null);
      setCancelReason('');
    }
  }, [cancelTarget, cancelReason, resolveCopy, t]);

  const handleLogCall = useCallback(async (order: ConfirmationOrder, result = 'unreached') => {
    try {
      setCallingId(order.id);
      const res = await orderConfirmationService.logCall(order.id, result, null);
      const attempts = res?.data?.callAttempts ?? order.callAttempts;
      toast.success(t('orders.callLogged', 'تم تسجيل محاولة الاتصال'));
      setOrders((prev) => prev.map((o) =>
        o.id === order.id
          ? { ...o, callAttempts: attempts, lastCallAttemptAt: res?.data?.order?.lastCallAttemptAt || res?.data?.order?.lastCallAt || o.lastCallAttemptAt }
          : o
      ));
    } catch (error: any) {
      toast.error(error?.message || t('orders.logCallFailed', 'تعذر تسجيل محاولة الاتصال'));
      setRefreshKey((prev) => prev + 1);
    } finally {
      setCallingId(null);
    }
  }, [t]);

  const handlePostpone = useCallback(async (data: { scheduledDeliveryDate: string; scheduledNotes: string; autoTransitionEnabled: boolean }) => {
    const order = postponeTarget;
    if (!order) return;
    try {
      setPostponeLoading(true);
      await api.post(`/orders-new/simple/${encodeURIComponent(order.orderNumber)}/schedule`, {
        scheduledDeliveryDate: data.scheduledDeliveryDate,
        scheduledNotes: data.scheduledNotes,
        autoTransitionEnabled: data.autoTransitionEnabled,
        changeStatusToScheduled: true
      });
      toast.success(t('orders.orderPostponed', 'تم تأجيل الطلب'));
      setPostponeTarget(null);
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t('orders.postponeFailed', 'تعذر تأجيل الطلب'));
    } finally {
      setPostponeLoading(false);
    }
  }, [postponeTarget, t]);

  const handleAssign = useCallback(async (orderId: string, userId: string) => {
    if (!userId) {
      toast.error(t('orders.selectEmployeeFirst'));
      return;
    }
    try {
      setAssigningId(orderId);
      await orderConfirmationService.assignOrder(orderId, userId, null, 'manual');
      toast.success(t('orders.orderAssigned'));
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t('orders.assignFailedToast'));
    } finally {
      setAssigningId(null);
    }
  }, [t]);

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
      toast.error(t('orders.selectOrdersFirst'));
      return;
    }
    try {
      setBulkProcessing(true);
      const res = await orderConfirmationService.confirmOrders(selectedOrderIds);
      const summary = res?.data?.summary;
      if (summary) {
        const parts = [t('orders.confirmedOrders', { count: summary.confirmed })];
        if (summary.pending) parts.push(t('orders.pendingApproval', { count: summary.pending }));
        if (summary.failed) parts.push(t('orders.confirmFailed', { count: summary.failed }));
        toast.success(parts.join(', '));
      } else {
        toast.success(t('orders.ordersConfirmed'));
      }
      setSelectedOrderIds([]);
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t('orders.bulkConfirmFailed'));
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrderIds, t]);

  const handleBulkAssign = useCallback(async () => {
    if (!selectedOrderIds.length) {
      toast.error(t('orders.selectOrdersFirst'));
      return;
    }
    if (!bulkUserId) {
      toast.error(t('orders.selectEmployeeFirst'));
      return;
    }
    try {
      setBulkProcessing(true);
      const res = await orderConfirmationService.assignOrders(selectedOrderIds, bulkUserId, null, 'manual');
      const summary = res?.data?.summary;
      if (summary) {
        const parts = [t('orders.assignedOrders', { count: summary.assigned })];
        if (summary.failed) parts.push(t('orders.assignFailed', { count: summary.failed }));
        toast.success(parts.join(', '));
      } else {
        toast.success(t('orders.ordersAssigned'));
      }
      setSelectedOrderIds([]);
      setBulkUserId('');
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t('orders.bulkAssignFailed'));
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrderIds, bulkUserId, t]);

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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('orders.ordersNeedingConfirmation')}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {t('orders.ordersNeedingConfirmationDescDisabled')}
              </p>
            </div>
          </div>
        )}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-amber-800 dark:text-amber-300">{t('orders.confirmationFeatureDisabled')}</h2>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
            {t('orders.confirmationFeatureDisabledDesc')}
          </p>
          <Link
            to="/settings/orders?tab=confirmation"
            className="inline-flex mt-4 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold"
          >
            {t('orders.openSettings')}
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('orders.ordersNeedingConfirmation')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('orders.ordersNeedingConfirmationDescEnabled')}
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
              placeholder={t('orders.searchPlaceholder')}
              className="min-h-[48px] w-full rounded-2xl border border-gray-300 bg-white py-3 pl-3 pr-10 text-base dark:border-gray-600 dark:bg-gray-900 sm:min-h-0 sm:rounded-lg sm:py-2 sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-200 sm:hidden"
          >
            <FunnelIcon className="h-5 w-5" />
            {t('orders.filter')}
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
              {t('orders.unassigned')}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 sm:hidden">
          <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-900/50">{statusFilterLabel}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-900/50">{sourceFilterLabel}</span>
          {onlyUnassigned && (
            <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
              {t('orders.unassigned')}
            </span>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-gray-950/45 p-0 backdrop-blur-sm sm:hidden" role="dialog" aria-modal="true">
          <div className="w-full rounded-t-[2rem] border border-gray-100 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('orders.filterConfirmationQueue')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('orders.filterDescription')}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                aria-label={t('orders.closeFilters')}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t('orders.orderStatus')}
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
                {t('orders.source')}
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
                <span>{t('orders.showUnassignedOrders')}</span>
                <FunnelIcon className="h-5 w-5" />
              </button>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetQueueFilters}
                  className="min-h-[46px] rounded-2xl border border-gray-300 text-sm font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200"
                >
                  {t('orders.reset')}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="min-h-[46px] rounded-2xl bg-blue-600 text-sm font-bold text-white"
                >
                  {t('orders.showResults')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:rounded-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">{t('orders.teamReport')}</h2>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:hidden">{t('orders.teamReportShort')}</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/25 dark:text-blue-200 sm:hidden">
            {stats?.totals.totalAssigned ?? 0} {t('orders.totalAssigned')}
          </span>
        </div>
        <p className="mt-1 hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
          {statsSummaryLabel}
        </p>
        <details className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-900/30 sm:hidden">
          <summary className="cursor-pointer text-sm font-bold text-gray-700 dark:text-gray-200">
            {t('orders.customizeReport')}
          </summary>
          <div className="mt-3 space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <label className="block">
              <span className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{t('orders.from')}</span>
              <input
                type="date"
                value={statsStartDate}
                onChange={(e) => setStatsStartDate(e.target.value)}
                className="min-h-[44px] w-full rounded-2xl border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{t('orders.to')}</span>
              <input
                type="date"
                value={statsEndDate}
                onChange={(e) => setStatsEndDate(e.target.value)}
                className="min-h-[44px] w-full rounded-2xl border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{t('orders.strategy')}</span>
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
                {t('orders.updateReport')}
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
                {t('orders.reset')}
              </button>
            </div>
          </div>
        </details>
        <div className="mt-3 hidden flex-col gap-3 text-xs text-gray-600 dark:text-gray-300 sm:flex lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <label className="text-gray-500 dark:text-gray-400">{t('orders.from')}</label>
            <input
              type="date"
              value={statsStartDate}
              onChange={(e) => setStatsStartDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-500 dark:text-gray-400">{t('orders.to')}</label>
            <input
              type="date"
              value={statsEndDate}
              onChange={(e) => setStatsEndDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-500 dark:text-gray-400">{t('orders.strategy')}</label>
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
              {t('orders.updateReport')}
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
              {t('orders.reset')}
            </button>
          </div>
        </div>
        {statsLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">{t('orders.loadingReport')}</div>
        ) : !stats ? (
          <div className="p-4 text-center text-sm text-gray-500">{t('orders.notEnoughData')}</div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/20 sm:rounded-lg sm:bg-transparent">
                <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{t('orders.totalConfirmed')}</div>
                <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-xl sm:font-semibold">
                  {stats.totals.totalConfirmed}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/20 sm:rounded-lg sm:bg-transparent">
                <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{t('orders.systemConfirmations')}</div>
                <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-xl sm:font-semibold">
                  {stats.totals.confirmedRegular}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/20 sm:rounded-lg sm:bg-transparent">
                <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{t('orders.guestConfirmations')}</div>
                <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-xl sm:font-semibold">
                  {stats.totals.confirmedGuest}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/20 sm:rounded-lg sm:bg-transparent">
                <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{t('orders.totalAssignedLabel')}</div>
                <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-xl sm:font-semibold">
                  {stats.totals.totalAssigned}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 sm:rounded-lg">
              <div className="bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700 dark:bg-gray-900/30 dark:text-gray-200">
                {t('orders.distributionByTeam')}
              </div>
              {stats.assignmentsByUser.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">{t('orders.noDistributions')}</div>
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
                {t('orders.selectAll')}
              </label>
              <span className="text-xs text-gray-500">
                {t('orders.selectedCount', { selectedCount })}
              </span>
              {selectedCount > 0 && (
                <button
                  onClick={() => setSelectedOrderIds([])}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {t('orders.deselect')}
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
                <option value="">{t('orders.selectEmployeeToAssign')}</option>
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
                {t('orders.bulkAssign')}
              </button>
              <button
                onClick={handleBulkConfirm}
                disabled={selectedCount === 0 || bulkProcessing}
                className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs disabled:opacity-60"
              >
                {t('orders.bulkConfirm')}
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
            <div className="font-bold text-gray-800 dark:text-gray-100">{t('orders.everythingUnderControl')}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('orders.noOrdersNeedConfirmation')}</div>
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
                      callingId={callingId}
                      maxCallsNoAnswer={settings?.maxCallsNoAnswer ?? 3}
                      intervalMinutes={settings?.intervalMinutes ?? 30}
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
                      onLogCall={handleLogCall}
                      onPostpone={(o) => setPostponeTarget(o)}
                      onToggleSelect={handleToggleSelect}
                      onPrintSlip={handlePrintSlip}
                      onPrintInvoice={handlePrintInvoice}
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
            {t('orders.showingFrom', { count: orders.length, total: totalOrders })}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              {t('orders.previous')}
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              {t('orders.next')}
            </button>
          </div>
        </div>
      )}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={resolveCopy('orders.cancelReasonTitle', 'Cancellation reason')}
          onClick={() => setCancelTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-white">
              {resolveCopy('orders.cancelReasonPrompt', 'Write the reason for cancelling this order:')}
            </h2>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder={resolveCopy('orders.cancelReasonPlaceholder', 'Write the cancellation reason...')}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                {resolveCopy('orders.cancelClose', 'Close')}
              </button>
              <button
                type="button"
                onClick={submitCancel}
                disabled={!cancelReason.trim() || cancellingId === cancelTarget.id}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancellingId === cancelTarget.id
                  ? resolveCopy('orders.cancellingOrder', 'Cancelling...')
                  : resolveCopy('orders.cancelConfirm', 'Confirm cancellation')}
              </button>
            </div>
          </div>
        </div>
      )}
      <PostponeOrderModal
        isOpen={Boolean(postponeTarget)}
        onClose={() => setPostponeTarget(null)}
        onConfirm={handlePostpone}
        loading={postponeLoading}
      />
    </div>
  );
};

export default OrderConfirmationQueue;
