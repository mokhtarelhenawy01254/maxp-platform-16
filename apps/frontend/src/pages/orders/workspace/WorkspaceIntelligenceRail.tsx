import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  BarChart2,
  Users,
  ArrowLeft,
  ArrowRight,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Package,
  Copy,
  Check,
  User,
  Phone,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { useCurrency } from '../../../hooks/useCurrency';
import { useDateFormat } from '../../../hooks/useDateFormat';
import {
  CustomerRatingBadge,
  CustomerRatingLevel,
} from '../../../components/orders/CustomerRatingBadge';
import { getOrderStatusDisplay } from '../../../utils/statusRegistry';
import { formatRelativeDays } from '../utils/customerHistoryHelpers';
import type { CustomerOrderHistoryData, CustomerOrderHistoryItem } from '../types';
import type { PerspectiveMode, WorkspaceOrder, WorkspaceStats } from './types';

export interface WorkspaceIntelligenceRailProps {
  order: WorkspaceOrder | null;
  perspective: PerspectiveMode;
  stats: WorkspaceStats | null;
  onClose?: () => void;
  onRatingChange?: (newRating: CustomerRatingLevel) => void;
  onSelectOrder?: (orderId: string) => void;
}

export const WorkspaceIntelligenceRail: React.FC<WorkspaceIntelligenceRailProps> = ({
  order,
  perspective,
  stats,
  onClose,
  onRatingChange,
  onSelectOrder,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const [historyData, setHistoryData] = useState<CustomerOrderHistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'delivered' | 'failed'>('all');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [supervisorTab, setSupervisorTab] = useState<'all' | 'dossier' | 'telemetry'>('all');

  useEffect(() => {
    let cancelled = false;

    if (order?.orderNumber) {
      setLoadingHistory(true);
      setHistoryError(null);
      apiClient
        .get(`/orders-new/simple/${encodeURIComponent(order.orderNumber)}/customer-history`)
        .then((res) => {
          if (!cancelled && res?.data?.success && res.data.data) {
            setHistoryData(res.data.data);
          }
        })
        .catch((err: any) => {
          if (!cancelled) {
            console.warn('Failed to load customer order history in intelligence rail:', err);
            setHistoryError(err?.response?.data?.message || err?.message || 'فشل جلب سجل العميل');
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingHistory(false);
        });
    } else {
      setHistoryData(null);
      setHistoryError(null);
    }

    return () => {
      cancelled = true;
    };
  }, [order?.orderNumber]);

  const handleRefreshHistory = useCallback(async () => {
    if (!order?.orderNumber) return;
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await apiClient.get(
        `/orders-new/simple/${encodeURIComponent(order.orderNumber)}/customer-history`
      );
      if (res?.data?.success && res.data.data) {
        setHistoryData(res.data.data);
      }
    } catch (err: any) {
      setHistoryError(err?.response?.data?.message || err?.message || 'فشل جلب سجل العميل');
    } finally {
      setLoadingHistory(false);
    }
  }, [order?.orderNumber]);

  const handleCopyPhone = (phone: string) => {
    if (!phone) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(phone)
        .then(() => {
          setCopiedPhone(true);
          setTimeout(() => setCopiedPhone(false), 2000);
        })
        .catch(() => {});
    }
  };

  const pastOrders = useMemo(() => {
    return historyData?.orders || [];
  }, [historyData?.orders]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'delivered') {
      return pastOrders.filter(
        (o) =>
          o.category === 'DELIVERED' ||
          (o.status || '').toLowerCase().includes('deliver') ||
          (o.status || '').includes('مستلم')
      );
    }
    if (orderFilter === 'failed') {
      return pastOrders.filter(
        (o) =>
          o.category === 'CANCELLED' ||
          o.category === 'RETURNED' ||
          (o.status || '').toLowerCase().includes('cancel') ||
          (o.status || '').toLowerCase().includes('return') ||
          (o.status || '').includes('ملغي') ||
          (o.status || '').includes('مرتجع')
      );
    }
    return pastOrders;
  }, [pastOrders, orderFilter]);

  const failedCount = useMemo(() => {
    const st = historyData?.stats;
    return (st?.cancelledCount || 0) + (st?.returnedCount || 0);
  }, [historyData?.stats]);

  // Unified telemetry from real history API and order fallback
  const customerStats = order?.customerStats;
  const deliveryRate =
    historyData?.stats?.deliverySuccessRate != null
      ? historyData.stats.deliverySuccessRate
      : typeof customerStats?.deliveryRate === 'number'
      ? customerStats.deliveryRate
      : null;

  const totalDelivered =
    historyData?.stats?.deliveredCount != null
      ? historyData.stats.deliveredCount
      : customerStats?.totalDelivered || 0;

  const totalOrdersCount =
    historyData?.stats?.totalOrders != null
      ? historyData.stats.totalOrders
      : customerStats?.totalOrdersCount || (order ? 1 : 0);

  const isHighRisk = deliveryRate !== null && deliveryRate < 60;
  const isVip = deliveryRate !== null && deliveryRate >= 85 && totalDelivered >= 3;

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-s border-border/60 bg-card/70 p-3 text-xs space-y-3.5 scrollbar-thin">
      {/* ── Mobile Back Header ── */}
      {onClose && (
        <div className="flex items-center justify-between border-b border-border/40 pb-2 md:hidden shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            {isArabic ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            <span>{isArabic ? 'العودة إلى تفاصيل الطلب' : 'Back to Order Details'}</span>
          </button>
        </div>
      )}

      {/* ── Supervisor View Mode Tabs ── */}
      {perspective === 'supervisor' && (
        <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-1 border border-border/40 text-[11px] shrink-0">
          <button
            type="button"
            onClick={() => setSupervisorTab('all')}
            className={`flex-1 rounded py-1 font-semibold transition text-center ${
              supervisorTab === 'all'
                ? 'bg-card text-foreground shadow-xs font-bold border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isArabic ? 'عرض شامل' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setSupervisorTab('dossier')}
            className={`flex-1 rounded py-1 font-semibold transition text-center ${
              supervisorTab === 'dossier'
                ? 'bg-card text-foreground shadow-xs font-bold border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isArabic ? 'سجل العميل' : 'Customer'}
          </button>
          <button
            type="button"
            onClick={() => setSupervisorTab('telemetry')}
            className={`flex-1 rounded py-1 font-semibold transition text-center ${
              supervisorTab === 'telemetry'
                ? 'bg-card text-foreground shadow-xs font-bold border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isArabic ? 'الطابور الحي' : 'Telemetry'}
          </button>
        </div>
      )}

      {/* ── Empty State if no order selected and not in telemetry-only view ── */}
      {!order && supervisorTab !== 'telemetry' && (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-muted-foreground space-y-2 my-auto">
          <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="font-semibold text-foreground">
            {isArabic ? 'لم يتم تحديد طلب' : 'No Order Selected'}
          </p>
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            {isArabic
              ? 'اختر طلباً من طابور التأكيد لاستعراض تقييم العميل وسجل طلباته السابقة.'
              : 'Select an order from the confirmation queue to inspect customer dossier and order history.'}
          </p>
        </div>
      )}

      {/* ── Customer Dossier Content (Rating & History) ── */}
      {order && (supervisorTab === 'all' || supervisorTab === 'dossier') && (
        <div className="space-y-3.5 divide-y divide-border/40">
          {/* 1. Customer Rating & Trust Dossier */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-1.5 font-bold text-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span className="font-bold">{isArabic ? 'تقييم العميل' : 'Customer Rating'}</span>
              </div>
              <CustomerRatingBadge
                rating={order.customerStats?.customerRating || order.customerRating || 'UNKNOWN'}
                orderNumber={order.orderNumber}
                customerId={order.customerId}
                deliveryRate={deliveryRate}
                totalDelivered={totalDelivered}
                totalAttempts={totalOrdersCount}
                orderStatus={order.status}
                interactive={true}
                size="sm"
                showLabel={true}
                onRatingChange={(newRating) => onRatingChange?.(newRating)}
              />
            </div>

            {/* Customer Contact Bar */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-2 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span className="flex items-center gap-1.5 min-w-0">
                  <User className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                  <span className="font-semibold text-foreground truncate max-w-[130px]" title={order.customerName}>
                    {order.customerName || (isArabic ? 'عميل غير مسجل' : 'Customer')}
                  </span>
                </span>
                {order.customerPhone && (
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(order.customerPhone)}
                    className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition active:scale-95 shrink-0"
                    title={isArabic ? 'نسخ رقم الهاتف' : 'Copy phone number'}
                  >
                    <Phone className="h-2.5 w-2.5" />
                    <span dir="ltr">{order.customerPhone}</span>
                    {copiedPhone ? (
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-60 hover:opacity-100" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Delivery Reliability Bar */}
            <div className="space-y-1.5 rounded-lg border border-border/50 bg-muted/10 p-2.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-medium">{isArabic ? 'نسبة الاستلام السابقة' : 'Delivery Rate'}</span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {deliveryRate !== null ? `${Math.round(deliveryRate)}%` : (isArabic ? 'عميل جديد' : 'New Customer')}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    deliveryRate === null
                      ? 'bg-slate-400 w-1/4'
                      : deliveryRate >= 80
                      ? 'bg-emerald-500'
                      : deliveryRate >= 50
                      ? 'bg-amber-500'
                      : 'bg-destructive'
                  }`}
                  style={{
                    width: deliveryRate !== null ? `${Math.max(8, Math.min(100, deliveryRate))}%` : '25%',
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-0.5 text-[10.5px] text-muted-foreground">
                <span>{isArabic ? 'إجمالي الطلبات المستلمة' : 'Total Delivered'}</span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {totalDelivered} / {totalOrdersCount}
                </span>
              </div>
            </div>

            {/* Alert / VIP Badges */}
            {isHighRisk && (
              <div className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-[11px] font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{isArabic ? 'تنبيه: مرتجع مرتفع — يفضل طلب عربون شحن' : 'High return risk — recommend shipping deposit'}</span>
              </div>
            )}

            {isVip && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{isArabic ? 'عميل موثوق VIP — أولوية قصوى للشحن' : 'VIP Customer — top fulfillment priority'}</span>
              </div>
            )}
          </section>

          {/* 2. Customer Order History */}
          <section className="pt-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground min-w-0">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{isArabic ? 'سجل طلبات العميل' : 'Customer History'}</span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {totalOrdersCount}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefreshHistory}
                disabled={loadingHistory}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition active:scale-95 disabled:opacity-50 shrink-0"
                title={isArabic ? 'تحديث سجل طلبات العميل' : 'Refresh customer order history'}
                aria-label={isArabic ? 'تحديث سجل طلبات العميل' : 'Refresh customer order history'}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>

            {/* 2x2 KPI Summary Strip */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="rounded-lg border border-border/50 bg-muted/15 p-2">
                <span className="text-muted-foreground block text-[10px] font-medium">
                  {isArabic ? 'إجمالي الطلبات' : 'Total Orders'}
                </span>
                <span className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5 block">
                  {totalOrdersCount}
                </span>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-medium">
                    {isArabic ? 'مستلمة' : 'Delivered'}
                  </span>
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                  {totalDelivered}
                </span>
              </div>
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-destructive text-[10px] font-medium">
                    {isArabic ? 'ملغية/مرتجعة' : 'Failed'}
                  </span>
                  <XCircle className="h-3 w-3 text-destructive" />
                </div>
                <span className="text-sm font-bold font-mono tabular-nums text-destructive mt-0.5 block">
                  {failedCount}
                </span>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/15 p-2">
                <span className="text-muted-foreground block text-[10px] font-medium">
                  {isArabic ? 'نسبة الاستلام' : 'Success Rate'}
                </span>
                <span className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5 block">
                  {deliveryRate != null ? `${Math.round(deliveryRate)}%` : (isArabic ? 'جديد' : 'New')}
                </span>
              </div>
            </div>

            {/* Filter Pills when multiple orders exist */}
            {pastOrders.length > 1 && (
              <div className="flex items-center gap-1 border-b border-border/40 pb-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setOrderFilter('all')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition ${
                    orderFilter === 'all'
                      ? 'bg-foreground text-background shadow-xs font-bold'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {isArabic ? 'الكل' : 'All'} ({pastOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderFilter('delivered')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition ${
                    orderFilter === 'delivered'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {isArabic ? 'المستلمة' : 'Delivered'} ({totalDelivered})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderFilter('failed')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition ${
                    orderFilter === 'failed'
                      ? 'bg-destructive text-destructive-foreground font-bold'
                      : 'text-destructive hover:bg-destructive/10'
                  }`}
                >
                  {isArabic ? 'الملغية' : 'Failed'} ({failedCount})
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {loadingHistory && (
              <div className="flex items-center justify-center py-5 text-muted-foreground text-xs gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>{isArabic ? 'جاري جلب سجل طلبات العميل...' : 'Loading order history...'}</span>
              </div>
            )}

            {/* Error Message with Retry */}
            {historyError && !loadingHistory && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-[11px] text-destructive flex items-center justify-between">
                <span>{historyError}</span>
                <button
                  type="button"
                  onClick={handleRefreshHistory}
                  className="underline font-bold text-xs ms-2 hover:opacity-80"
                >
                  {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </button>
              </div>
            )}

            {/* Orders List */}
            {!loadingHistory && filteredOrders.length > 0 && (
              <div className="space-y-2">
                {filteredOrders.map((ord: CustomerOrderHistoryItem) => {
                  const statusDisplay = getOrderStatusDisplay({ status: ord.status });
                  const isCurrent =
                    ord.isCurrentOrder ||
                    ord.id === order?.id ||
                    ord.orderNumber === order?.orderNumber;
                  const isExpanded = Boolean(expandedOrders[ord.id || ord.orderNumber]);
                  const items = ord.items || [];

                  return (
                    <div
                      key={ord.id || ord.orderNumber}
                      className={`rounded-lg border p-2.5 transition text-[11px] ${
                        isCurrent
                          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border/60 bg-card hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              onSelectOrder
                                ? onSelectOrder(ord.orderNumber)
                                : window.open(`/orders/${encodeURIComponent(ord.orderNumber)}`, '_blank')
                            }
                            className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                            title={isArabic ? 'عرض تفاصيل هذا الطلب' : 'View order details'}
                          >
                            <span>#{ord.orderNumber}</span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                          </button>

                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-primary/15 text-primary">
                              {isArabic ? 'الطلب الحالي' : 'Current'}
                            </span>
                          )}

                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                              statusDisplay.primary.colorClass ||
                              'bg-muted text-muted-foreground border-border/70'
                            }`}
                          >
                            {statusDisplay.primary.label}
                          </span>
                        </div>

                        <span className="font-mono font-bold tabular-nums text-foreground text-xs shrink-0">
                          {formatPrice(ord.total, ord.currency || 'EGP')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 mt-1.5 text-[10px] text-muted-foreground">
                        <span>
                          {ord.createdAt
                            ? isArabic
                              ? formatRelativeDays(ord.createdAt)
                              : formatDate(ord.createdAt)
                            : '—'}
                        </span>

                        {items.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrders((prev) => ({
                                ...prev,
                                [ord.id || ord.orderNumber]: !prev[ord.id || ord.orderNumber],
                              }))
                            }
                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground py-0.5 px-1 rounded hover:bg-muted/60 transition"
                          >
                            <Package className="h-3 w-3" />
                            <span>
                              {ord.itemsCount || items.length} {isArabic ? 'منتجات' : 'items'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expandable Order Items */}
                      {isExpanded && items.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/40 space-y-1.5">
                          {items.map((it, idx) => (
                            <div
                              key={it.id || idx}
                              className="flex items-center gap-2 text-[10px] text-foreground"
                            >
                              {it.image && (
                                <img
                                  src={it.image}
                                  alt={it.name}
                                  className="h-6 w-6 rounded object-cover border border-border/50 shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="min-w-0 flex-1 truncate">
                                <span className="font-semibold">{it.name}</span>
                                {(it.color || it.size) && (
                                  <span className="text-muted-foreground text-[9px] ms-1">
                                    {[it.color, it.size].filter(Boolean).join(' • ')}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono tabular-nums text-muted-foreground shrink-0">
                                ×{it.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* First time buyer notice */}
            {!loadingHistory && !historyError && historyData && pastOrders.length <= 1 && (
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-2.5 text-xs text-sky-900 dark:text-sky-200">
                <div className="flex items-start gap-2">
                  <ShoppingBag className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[11px] flex items-center gap-1">
                      <span>{isArabic ? 'الطلب الأول لهذا العميل (عميل جديد)' : 'First Order (New Customer)'}</span>
                      <Sparkles className="h-3 w-3 text-sky-500" />
                    </p>
                    <p className="mt-0.5 text-[10px] text-sky-700/80 dark:text-sky-300/80 leading-relaxed">
                      {isArabic
                        ? 'لا توجد طلبات شراء سابقة مسجلة لنفس رقم الهاتف في متجرك. هذا الطلب يمثل بداية السجل الشرائي للعميل.'
                        : 'No past order history exists for this customer phone number in your store.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Supervisor Live Queue Telemetry Section (Supervisors Only) ── */}
      {perspective === 'supervisor' &&
        (supervisorTab === 'all' || supervisorTab === 'telemetry') && (
          <div className="border-t border-border/40 pt-3.5 space-y-3">
            <section>
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <BarChart2 className="h-4 w-4 text-primary" />
                <span>{isArabic ? 'تيليمتري الطابور الحي' : 'Live Queue Telemetry'}</span>
              </div>

              <div className="mt-2.5 space-y-2 rounded-lg border border-border/50 bg-muted/15 p-2.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>{isArabic ? 'الطلبات المعلقة' : 'Pending Queue'}</span>
                  <span className="font-mono font-bold tabular-nums text-foreground">
                    {stats?.pending || 0}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{isArabic ? 'طلبات المتابعة' : 'Follow-up Due'}</span>
                  <span className="font-mono font-bold tabular-nums text-foreground">
                    {stats?.followup || 0}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{isArabic ? 'إجمالي المؤكد' : 'Confirmed'}</span>
                  <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {stats?.confirmed || 0}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{isArabic ? 'الملغية' : 'Cancelled'}</span>
                  <span className="font-mono font-bold tabular-nums text-destructive">
                    {stats?.cancelled || 0}
                  </span>
                </div>
              </div>
            </section>

            <section className="pt-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>{isArabic ? 'إدارة توزيع الفريق' : 'Team Distribution'}</span>
              </div>
              <Link
                to="/settings/orders?tab=confirmation"
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <span>{isArabic ? 'ضبط إعدادات التوزيع' : 'Configure Assignment Rules'}</span>
                {isArabic ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
              </Link>
            </section>
          </div>
        )}
    </aside>
  );
};

export default WorkspaceIntelligenceRail;
