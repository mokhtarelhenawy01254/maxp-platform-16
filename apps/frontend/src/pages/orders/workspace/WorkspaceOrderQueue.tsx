import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useCurrency } from '../../../hooks/useCurrency';
import { WorkspaceOrder, WorkspacePagination } from './types';
import { WorkspaceQueueHeader } from './components/queue/WorkspaceQueueHeader';
import { WorkspaceQueueEmptyState } from './components/queue/WorkspaceQueueEmptyState';
import { WorkspaceOrderQueueItem } from './components/queue/WorkspaceOrderQueueItem';

export interface WorkspaceOrderQueueProps {
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
  confirmationDisabled?: boolean;
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
  confirmationDisabled = false,
}) => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');
  const [riskOnly, setRiskOnly] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const suppressFocusRef = useRef(false);
  const prevSelectedRef = useRef<string | null>(null);

  // j/k navigation focus management
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
      el.scrollIntoView?.({ block: 'nearest' });
    }
  }, [selectedOrderId]);

  // Infinite scroll observer
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

  if (loading && orders.length === 0) {
    return <WorkspaceQueueEmptyState loading isArabic={isArabic} />;
  }

  if (orders.length === 0) {
    return (
      <WorkspaceQueueEmptyState
        confirmationDisabled={confirmationDisabled}
        activeTab={activeTab}
        fetchError={fetchError}
        onRetry={onRetry}
        isArabic={isArabic}
      />
    );
  }

  const displayOrders = riskOnly
    ? orders.filter((o) => o.riskData?.level === 'high')
    : orders;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-card/50 dark:bg-slate-900/40">
      <WorkspaceQueueHeader
        ordersCount={orders.length}
        totalCount={pagination.total}
        activeTab={activeTab}
        riskOnly={riskOnly}
        onToggleRiskOnly={() => setRiskOnly((v) => !v)}
        loadingMore={loadingMore}
        isArabic={isArabic}
      />

      {/* Stream list */}
      <div className="flex-1 overflow-y-auto overscroll-contain h-full scrollbar-thin scrollbar-thumb-border/60 hover:scrollbar-thumb-border dark:scrollbar-thumb-slate-700">
        {displayOrders.length === 0 ? (
          <WorkspaceQueueEmptyState
            confirmationDisabled={confirmationDisabled}
            activeTab={activeTab}
            isArabic={isArabic}
            riskOnly={riskOnly}
            inStream
          />
        ) : (
          displayOrders.map((order) => (
            <WorkspaceOrderQueueItem
              key={order.id || order.cartId || order.orderNumber}
              order={order}
              isSelected={order.id === selectedOrderId}
              onSelectOrder={onSelectOrder}
              formatPrice={formatPrice}
              isArabic={isArabic}
              rowRef={(el) => {
                if (el) rowRefs.current.set(order.id, el);
                else rowRefs.current.delete(order.id);
              }}
              onSuppressFocus={() => {
                suppressFocusRef.current = true;
              }}
            />
          ))
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />

        {/* Load more trigger */}
        {pagination.pages > page && (
          <div className="p-3 text-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border/60 bg-background py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
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

export default WorkspaceOrderQueue;
