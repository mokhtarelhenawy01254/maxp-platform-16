import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cancellationService, CancellationReason } from '../../../services/cancellationService';
import { WorkspaceOrder } from './types';

interface WorkspaceCancelModalProps {
  order: WorkspaceOrder | null;
  reasonText: string;
  onReasonTextChange: (text: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export const WorkspaceCancelModal: React.FC<WorkspaceCancelModalProps> = ({
  order,
  reasonText,
  onReasonTextChange,
  onConfirm,
  onClose,
  isSubmitting,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');
  const [standardReasons, setStandardReasons] = useState<CancellationReason[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(false);

  useEffect(() => {
    if (!order || standardReasons.length > 0) return;
    let isMounted = true;
    setLoadingReasons(true);
    cancellationService
      .getReasons()
      .then((res) => {
        if (!isMounted) return;
        const reasons = Array.isArray(res.data) ? res.data : [];
        setStandardReasons(reasons.filter((r) => r.isActive !== false));
      })
      .catch(() => {
        // Fallback gracefully if endpoint fails
      })
      .finally(() => {
        if (isMounted) setLoadingReasons(false);
      });

    return () => {
      isMounted = false;
    };
  }, [order, standardReasons.length]);

  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('orders.cancelReasonTitle') || ''}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border/50 bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3">
          <h2 className="text-base font-black text-foreground">
            {t('orders.cancelReasonTitle')}
          </h2>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground" dir="ltr">
            #{order.orderNumber} • {order.customerName}
          </p>
        </div>

        {/* Standard Reason Chips */}
        {standardReasons.length > 0 && (
          <div className="mb-3">
            <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
              {isArabic ? 'أسباب معيارية سريعة:' : 'Quick standard reasons:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {standardReasons.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onReasonTextChange(r.reason)}
                  className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                    reasonText === r.reason
                      ? 'border-destructive bg-destructive/15 text-destructive'
                      : 'border-border/60 bg-background text-foreground hover:bg-muted/40'
                  }`}
                >
                  {r.reason}
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={reasonText}
          onChange={(e) => onReasonTextChange(e.target.value)}
          placeholder={t('orders.cancelReasonPlaceholder') || ''}
          rows={3}
          className="w-full rounded-md border border-border/60 bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
        />

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            {t('orders.cancelClose')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!reasonText.trim() || isSubmitting}
            className="rounded-md bg-destructive px-3.5 py-1.5 text-xs font-black text-destructive-foreground transition-all active:scale-[0.98] hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (isArabic ? 'جارٍ الإلغاء…' : 'Cancelling…') : t('orders.cancelConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
