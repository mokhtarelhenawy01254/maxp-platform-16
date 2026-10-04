import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PhoneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useCurrency } from '../../../hooks/useCurrency';
import { WorkspaceOrder, WorkspacePagination } from './types';
import { isOrderOverdue } from './useAgentWorkspace';

interface WorkspaceOrderQueueProps {
  orders: WorkspaceOrder[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  loading: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  pagination: WorkspacePagination;
  page: number;
  fetchError: string | null;
  onRetry: () => void;
  activeTab: string;
}

export const WorkspaceOrderQueue: React.FC<WorkspaceOrderQueueProps> = ({
  orders,
  selectedOrderId,
  onSelectOrder,
  loading,
  loadingMore,
  onLoadMore,
  pagination,
  page,
  fetchError,
  onRetry,
  activeTab,
}) => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const suppressFocusRef = useRef(false);
  const prevSelectedRef = useRef<string | null>(null);

  // j/k والأسهم يغيّران التحديد داخل الهوك — النقل الفعلي للتركيز هنا حتى يعلن
  // قارئ الشاشة عن الصف الجديد (focus + aria-label) ويتمرر إليه بصريًا.
  // نقرة الفأرة تُلغي النقل كي لا يسرق التركيز من حيث كان المستخدم.
  useEffect(() => {
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = selectedOrderId;
    if (!selectedOrderId || prev === selectedOrderId) return;
    if (suppressFocusRef.current) {
      suppressFocusRef.current = false;
      return;
    }
    const el = rowRefs.current.get(selectedOrderId);
    if (el) {
      el.focus({ preventScroll: true });
      // jsdom لا ينفذ scrollIntoView — الاستدعاء الاختياري يحمي بيئة الاختبار
      el.scrollIntoView?.({ block: 'nearest' });
    }
  }, [selectedOrderId]);

  // Auto-load next page on scroll to bottom
  useEffect(() => {
    if (!sentinelRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && pagination.pages > page && !loadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: '250px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [pagination.pages, page, loadingMore, onLoadMore]);

  // دقة الدقائق أساسية في الكول-سنتر: «منذ 7 د» معلومة تشغيلية، «الآن» لما كان
  // أقل من دقيقة فقط — والقفز من «الآن» للساعات كان يمحو عمر الطلب في أول ساعة كاملة
  const formatTimeAgo = (dateStr: string) => {
    const diffMinutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60));
    if (diffMinutes < 1) return isArabic ? 'الآن' : 'Just now';
    if (diffMinutes < 60) return isArabic ? `منذ ${diffMinutes} د` : `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return isArabic ? `منذ ${diffHours} س` : `${diffHours}h ago`;
    const days = Math.floor(diffHours / 24);
    return isArabic ? `منذ ${days} ي` : `${days}d ago`;
  };

  const exactTimestamp = (dateStr: string) =>
    new Date(dateStr).toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading && orders.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          {t('orders.loadingWorkspace')}
        </p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
          {fetchError ? (
            <ExclamationTriangleIcon className="h-6 w-6 text-destructive" />
          ) : (
            <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
          )}
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground text-balance">
          {fetchError
            ? fetchError
            : activeTab === 'all'
            ? t('orders.noAssignedOrders')
            : isArabic
            ? 'لا توجد طلبات في هذا القسم'
            : 'No orders in this category'}
        </p>
        {fetchError && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isArabic ? 'إعادة المحاولة' : 'Try again'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-card/50">
      {/* Queue Counter Header */}
      <div className="flex items-center justify-between border-b border-border/30 bg-muted/15 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shrink-0">
        <span className="font-mono tabular-nums">
          {isArabic
            ? `معروض ${orders.length} من ${pagination.total || orders.length} طلب`
            : `Showing ${orders.length} of ${pagination.total || orders.length}`}
        </span>
        {loadingMore && (
          <span className="flex items-center gap-1 text-primary">
            <ArrowPathIcon className="h-3 w-3 animate-spin" />
            <span className="text-[10px]">{isArabic ? 'تحميل المزيد…' : 'Loading…'}</span>
          </span>
        )}
      </div>

      {/* Stream list */}
      <div className="flex-1 divide-y divide-border/30 overflow-y-auto overscroll-contain h-full scrollbar-thin scrollbar-thumb-border/60 hover:scrollbar-thumb-border">
        {orders.map((order) => {
          const isSelected = order.id === selectedOrderId;
          const overdue = isOrderOverdue(order);
          const location = [order.governorate, order.city].filter(Boolean).join('، ') || '—';
          const followUpDue = order.followUpDate ? new Date(order.followUpDate).getTime() <= Date.now() : false;

          return (
            <article
              key={order.id || order.cartId || order.orderNumber}
              ref={(el) => {
                if (el) rowRefs.current.set(order.id, el);
                else rowRefs.current.delete(order.id);
              }}
              tabIndex={0}
              role="button"
              aria-current={isSelected ? 'true' : undefined}
              aria-label={`${isArabic ? 'طلب' : 'Order'} #${order.orderNumber} — ${order.customerName || ''} ${formatPrice(order.total)}`}
              onClick={() => {
                suppressFocusRef.current = true;
                onSelectOrder(order.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  suppressFocusRef.current = true;
                  onSelectOrder(order.id);
                }
              }}
              className={`group relative cursor-pointer p-3 outline-none transition-colors focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                isSelected
                  ? 'bg-accent/40 text-accent-foreground'
                  : 'hover:bg-muted/40'
              }`}
            >
              {/* Active selection bar */}
              {isSelected && (
                <div
                  className="absolute inset-y-0 start-0 w-1 bg-primary"
                  aria-hidden="true"
                />
              )}

              {/* Header row: Order number, SLA urgency badge, Time */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-xs font-black text-primary"
                    dir="ltr"
                  >
                    #{order.orderNumber}
                  </span>
                  {order.isIncomplete ? (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {isArabic ? 'سلة متروكة' : 'Abandoned Cart'}
                    </span>
                  ) : order.type === 'GUEST' ? (
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {t('orders.guest')}
                    </span>
                  ) : null}
                  {overdue && (
                    <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                      <ExclamationTriangleIcon className="h-3 w-3" />
                      {t('orders.urgent')}
                    </span>
                  )}
                </div>
                <span
                  className="text-[11px] font-mono text-muted-foreground"
                  title={exactTimestamp(order.createdAt)}
                >
                  {formatTimeAgo(order.createdAt)}
                </span>
              </div>

              {/* Customer info & location */}
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <p className="truncate text-xs font-bold text-foreground">
                  {order.customerName || '—'}
                </p>
                <span className="shrink-0 font-mono text-xs font-black tabular-nums text-foreground">
                  {formatPrice(order.total)}
                </span>
              </div>

              {/* Sub-row: Location & Follow-up & Call attempts badge */}
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">{location}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {order.followUpDate && (
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                        followUpDue
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {followUpDue
                        ? (isArabic ? 'مستحق الآن' : 'Due now')
                        : new Date(order.followUpDate).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 font-mono font-bold tabular-nums ${
                      order.callAttempts >= 3
                        ? 'text-amber-500 dark:text-amber-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <PhoneIcon className="h-3 w-3" />
                    {order.callAttempts} / 5
                  </span>
                </span>
              </div>
            </article>
          );
        })}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />

        {/* Load more trigger */}
        {pagination.pages > page && (
          <div className="p-3 text-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border/60 bg-background py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
            >
              {loadingMore && <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />}
              {loadingMore
                ? t('orders.workspaceLoadingMore')
                : t('orders.workspaceLoadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
