import React from 'react';
import {
  PhoneIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { WorkspaceOrder } from '../../types';
import { isOrderOverdue } from '../../workspaceHelpers';

interface WorkspaceOrderQueueItemProps {
  order: WorkspaceOrder;
  isSelected: boolean;
  onSelectOrder: (orderId: string) => void;
  formatPrice: (amount: number) => string;
  isArabic: boolean;
  rowRef: (el: HTMLElement | null) => void;
  onSuppressFocus: () => void;
}

export const WorkspaceOrderQueueItem: React.FC<WorkspaceOrderQueueItemProps> = ({
  order,
  isSelected,
  onSelectOrder,
  formatPrice,
  isArabic,
  rowRef,
  onSuppressFocus,
}) => {
  const overdue = isOrderOverdue(order);
  const location = [order.governorate, order.city].filter(Boolean).join('، ') || '—';
  const followUpDue = order.followUpDate ? new Date(order.followUpDate).getTime() <= Date.now() : false;

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

  const handleClick = () => {
    onSuppressFocus();
    onSelectOrder(order.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSuppressFocus();
      onSelectOrder(order.id);
    }
  };

  return (
    <article
      ref={rowRef}
      tabIndex={0}
      role="button"
      aria-current={isSelected ? 'true' : undefined}
      aria-label={`${isArabic ? 'طلب' : 'Order'} #${order.orderNumber} — ${order.customerName || ''} ${formatPrice(order.total)}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative cursor-pointer p-3 outline-none transition-colors border-b border-border/20 dark:border-slate-800/80 focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
        isSelected
          ? 'bg-accent/40 text-accent-foreground dark:bg-slate-800/80 dark:text-slate-100'
          : 'hover:bg-muted/40 dark:hover:bg-slate-800/40 text-foreground dark:text-slate-200'
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
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="font-mono text-xs font-black text-primary dark:text-blue-400"
            dir="ltr"
          >
            #{order.orderNumber}
          </span>
          {order.isIncomplete ? (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:border dark:border-amber-700/60 dark:text-amber-300">
              {isArabic ? 'سلة متروكة' : 'Abandoned Cart'}
            </span>
          ) : order.type === 'GUEST' ? (
            <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-semibold text-muted-foreground dark:bg-slate-800 dark:text-slate-300">
              {isArabic ? 'زائر' : 'Guest'}
            </span>
          ) : null}
          {overdue && (
            <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive dark:bg-red-950/60 dark:border dark:border-red-700/60 dark:text-red-300">
              <ExclamationTriangleIcon className="h-3 w-3" />
              {isArabic ? 'عاجل' : 'Urgent'}
            </span>
          )}
          {order.riskData && order.riskData.level !== 'low' && (
            <span
              title={
                order.riskData.reasons?.length
                  ? order.riskData.reasons.map((r) => r.label).join(' · ')
                  : undefined
              }
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums font-mono ${
                order.riskData.level === 'high'
                  ? 'bg-destructive/15 text-destructive dark:bg-red-950/60 dark:border dark:border-red-700/60 dark:text-red-300'
                  : 'bg-amber-500/15 text-amber-700 dark:bg-amber-950/60 dark:border dark:border-amber-700/60 dark:text-amber-300'
              }`}
              dir="ltr"
            >
              <ExclamationTriangleIcon className="h-2.5 w-2.5 shrink-0" />
              <span>{order.riskData.score}</span>
            </span>
          )}
        </div>
        <span
          className="text-[11px] font-mono text-muted-foreground dark:text-slate-400"
          title={exactTimestamp(order.createdAt)}
        >
          {formatTimeAgo(order.createdAt)}
        </span>
      </div>

      {/* Customer info & location */}
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className="truncate text-xs font-bold text-foreground dark:text-slate-100">
          {order.customerName || '—'}
        </p>
        <span className="shrink-0 font-mono text-xs font-black tabular-nums text-foreground dark:text-slate-100">
          {formatPrice(order.total)}
        </span>
      </div>

      {/* Sub-row: Location & Follow-up & Call attempts badge */}
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground dark:text-slate-400">
        <span className="truncate">{location}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {order.followUpDate && (
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                followUpDue
                  ? 'bg-destructive/15 text-destructive dark:bg-red-950/60 dark:text-red-300'
                  : 'bg-blue-500/10 text-blue-600 dark:bg-blue-950/60 dark:border dark:border-blue-700/60 dark:text-blue-300'
              }`}
            >
              {followUpDue
                ? isArabic ? 'مستحق الآن' : 'Due now'
                : new Date(order.followUpDate).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 font-mono font-bold tabular-nums ${
              order.callAttempts >= 3
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground dark:text-slate-400'
            }`}
          >
            <PhoneIcon className="h-3 w-3" />
            {order.callAttempts} / 5
          </span>
        </span>
      </div>
    </article>
  );
};
