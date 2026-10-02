import React from 'react';
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

  const formatTimeAgo = (dateStr: string) => {
    const diffHours = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
    if (diffHours < 1) return isArabic ? 'الآن' : 'Just now';
    if (diffHours < 24) return isArabic ? `منذ ${Math.floor(diffHours)} س` : `${Math.floor(diffHours)}h ago`;
    const days = Math.floor(diffHours / 24);
    return isArabic ? `منذ ${days} ي` : `${days}d ago`;
  };

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
        <p className="mt-3 text-sm font-semibold text-foreground">
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
      {/* Stream list */}
      <div className="flex-1 divide-y divide-border/30 overflow-y-auto">
        {orders.map((order) => {
          const isSelected = order.id === selectedOrderId;
          const overdue = isOrderOverdue(order);
          const location = [order.governorate, order.city].filter(Boolean).join('، ') || '—';

          return (
            <article
              key={order.id}
              onClick={() => onSelectOrder(order.id)}
              className={`group relative cursor-pointer p-3 transition-colors ${
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
                    <span className="rounded bg-muted px-1 py-0.2 text-[10px] font-semibold text-muted-foreground">
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
                <span className="text-[11px] font-mono text-muted-foreground">
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

              {/* Sub-row: Location & Call attempts badge */}
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">{location}</span>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 font-mono font-bold tabular-nums ${
                    order.callAttempts >= 3
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  <PhoneIcon className="h-3 w-3" />
                  {order.callAttempts} / 5
                </span>
              </div>
            </article>
          );
        })}

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
