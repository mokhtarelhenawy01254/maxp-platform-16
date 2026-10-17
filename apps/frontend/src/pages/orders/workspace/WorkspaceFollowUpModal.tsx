import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, X, Clock } from 'lucide-react';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { WorkspaceOrder } from './types';

interface WorkspaceFollowUpModalProps {
  order: WorkspaceOrder | null;
  dateValue: string;
  onDateChange: (val: string) => void;
  onSave: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export const WorkspaceFollowUpModal: React.FC<WorkspaceFollowUpModalProps> = ({
  order,
  dateValue,
  onDateChange,
  onSave,
  onClose,
  isSubmitting,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');
  const panelRef = useModalA11y(Boolean(order), onClose);

  if (!order) return null;

  const setPresetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().slice(0, 10));
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('orders.scheduleFollowUp') || ''}
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
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar size={15} />
              </span>
              <h2 className="text-base font-bold text-foreground">
                {t('orders.scheduleFollowUp')}
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

        {/* Quick Date Presets */}
        <div className="mb-3.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Clock size={12} />
            <span>{isArabic ? 'مواعيد سريعة:' : 'Quick Presets:'}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setPresetDays(1)}
              className="rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all"
            >
              {isArabic ? 'غداً' : 'Tomorrow'}
            </button>
            <button
              type="button"
              onClick={() => setPresetDays(2)}
              className="rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all"
            >
              {isArabic ? 'بعد يومين' : 'In 2 Days'}
            </button>
            <button
              type="button"
              onClick={() => setPresetDays(3)}
              className="rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all"
            >
              {isArabic ? 'بعد 3 أيام' : 'In 3 Days'}
            </button>
          </div>
        </div>

        <label
          htmlFor="follow-up-date-input"
          className="mb-1.5 block text-xs font-semibold text-foreground"
        >
          {t('orders.followUpDateLabel')}
        </label>
        <input
          id="follow-up-date-input"
          type="date"
          value={dateValue}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-mono tabular-nums text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
            onClick={onSave}
            disabled={!dateValue || isSubmitting}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs transition-all active:scale-[0.98] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (isArabic ? 'جارٍ الحفظ…' : 'Saving…') : t('orders.followUpSave')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceFollowUpModal;
