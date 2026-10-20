import React from 'react';
import {
  ClockIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import type {
  DeliveryFilter,
  WebhookDelivery,
} from '../types/taskIntegrationTypes';
import { formatDateTime } from '../utils/taskIntegrationConstants';

interface TaskWebhookDeliveriesListProps {
  webhookId: string;
  deliveries: WebhookDelivery[];
  loading: boolean;
  filter: DeliveryFilter;
  retryingDeliveryId: string | null;
  onFilterChange: (filter: DeliveryFilter) => void;
  onRetryDelivery: (delivery: WebhookDelivery) => void;
  onCopySecret: (value: string, message: string) => void;
}

export const TaskWebhookDeliveriesList: React.FC<TaskWebhookDeliveriesListProps> = ({
  webhookId: _webhookId,
  deliveries,
  loading,
  filter,
  retryingDeliveryId,
  onFilterChange,
  onRetryDelivery,
  onCopySecret,
}) => {
  const filteredDeliveries = deliveries.filter((delivery) => {
    if (filter === 'success') return delivery.success;
    if (filter === 'failed') return !delivery.success;
    return true;
  });

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all' as DeliveryFilter, label: 'الكل' },
            { value: 'success' as DeliveryFilter, label: 'الناجح' },
            { value: 'failed' as DeliveryFilter, label: 'الفاشل' },
          ].map((filterOption) => (
            <button
              key={filterOption.value}
              type="button"
              onClick={() => onFilterChange(filterOption.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === filterOption.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border/60 bg-background/75 text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          المعروض: <span className="tabular-nums font-mono">{filteredDeliveries.length}</span> من{' '}
          <span className="tabular-nums font-mono">{deliveries.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[20px] border border-dashed border-border/70 bg-background/55 p-4 text-center text-sm text-muted-foreground">
          جارٍ تحميل السجل...
        </div>
      ) : deliveries.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border/70 bg-background/55 p-4 text-center text-sm text-muted-foreground">
          لا توجد عمليات تسليم بعد.
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border/70 bg-background/55 p-4 text-center text-sm text-muted-foreground">
          لا توجد نتائج مطابقة لهذا الفلتر.
        </div>
      ) : (
        filteredDeliveries.map((delivery) => (
          <details
            key={delivery.id}
            className="rounded-[24px] border border-border/70 bg-background/70 p-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    delivery.success
                      ? 'border border-secondary/20 bg-secondary/10 text-secondary'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
                  }`}
                >
                  {delivery.success ? 'ناجح' : 'فشل'}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {delivery.event}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center">
                  <ClockIcon className="ml-1 h-4 w-4" />
                  <span className="tabular-nums font-mono">
                    {formatDateTime(delivery.createdAt)}
                  </span>
                </span>
                <span className="font-mono tabular-nums">
                  status: {delivery.responseStatus ?? '—'}
                </span>
                <span className="font-mono tabular-nums">
                  {delivery.durationMs ? `${delivery.durationMs}ms` : 'بدون مدة'}
                </span>
              </div>
            </summary>

            {delivery.errorMessage && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                {delivery.errorMessage}
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => onRetryDelivery(delivery)}
                disabled={retryingDeliveryId === delivery.id}
                className="rounded-2xl border border-primary/20 bg-primary/8 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/12 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {retryingDeliveryId === delivery.id
                  ? 'جارٍ الإرسال...'
                  : delivery.success
                    ? 'إعادة الإرسال'
                    : 'إعادة المحاولة'}
              </button>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="rounded-[20px] border border-border/60 bg-foreground/[0.94] p-3 text-xs text-background">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="font-semibold text-background/70">
                    Request Body
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onCopySecret(
                        delivery.requestBody || '',
                        'تم نسخ Request Body',
                      )
                    }
                    className="inline-flex items-center rounded-xl border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-background"
                  >
                    <DocumentDuplicateIcon className="ml-1 h-3.5 w-3.5" />
                    نسخ
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono">
                  {delivery.requestBody}
                </pre>
              </div>
              <div className="rounded-[20px] border border-border/60 bg-foreground/[0.94] p-3 text-xs text-background">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="font-semibold text-background/70">
                    Response Body
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onCopySecret(
                        delivery.responseBody || '',
                        'تم نسخ Response Body',
                      )
                    }
                    className="inline-flex items-center rounded-xl border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-background"
                  >
                    <DocumentDuplicateIcon className="ml-1 h-3.5 w-3.5" />
                    نسخ
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono">
                  {delivery.responseBody || 'لا يوجد محتوى'}
                </pre>
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
};
