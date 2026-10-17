import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X } from 'lucide-react';
import { cancellationService, CancellationReason } from '../../../services/cancellationService';
import { useModalA11y } from '../../../hooks/useModalA11y';
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
  const panelRef = useModalA11y(Boolean(order), onClose);
  const [standardReasons, setStandardReasons] = useState<CancellationReason[]>([]);
  const [, setLoadingReasons] = useState(false);

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
        ref={panelRef}
        className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3.5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle size={15} />
              </span>
              <h2 className="text-base font-bold text-foreground">
                {t('orders.cancelReasonTitle')}
              </h2>
            </div>
            <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground" dir="ltr">
              #{order.orderNumber} • {order.customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Standard Reason Chips */}
        {standardReasons.length > 0 && (
          <div className="mb-3.5">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {isArabic ? 'أسباب معيارية سريعة:' : 'Quick standard reasons:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {standardReasons.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onReasonTextChange(r.reason)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                    reasonText === r.reason
                      ? 'border-destructive bg-destructive/15 text-destructive font-semibold'
                      : 'border-border/70 bg-background text-foreground hover:bg-muted/50'
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
          className="w-full rounded-xl border border-border/70 bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20 transition-all"
        />

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/40 pt-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/70 bg-background px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t('orders.cancelClose')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!reasonText.trim() || isSubmitting}
            className="rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground shadow-xs transition-all active:scale-[0.98] hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (isArabic ? 'جارٍ الإلغاء…' : 'Cancelling…') : t('orders.cancelConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceCancelModal;
