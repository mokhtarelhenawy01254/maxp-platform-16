import React from 'react';
import { useTranslation } from 'react-i18next';
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
        className="w-full max-w-md rounded-xl border border-border/50 bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3">
          <h2 className="text-base font-black text-foreground">
            {t('orders.scheduleFollowUp')}
          </h2>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground" dir="ltr">
            #{order.orderNumber} • {order.customerName}
          </p>
        </div>

        {/* Quick Date Presets */}
        <div className="mb-3">
          <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
            {isArabic ? 'مواعيد سريعة:' : 'Quick Presets:'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setPresetDays(1)}
              className="rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/40"
            >
              {isArabic ? 'غداً' : 'Tomorrow'}
            </button>
            <button
              type="button"
              onClick={() => setPresetDays(2)}
              className="rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/40"
            >
              {isArabic ? 'بعد يومين' : 'In 2 Days'}
            </button>
            <button
              type="button"
              onClick={() => setPresetDays(3)}
              className="rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/40"
            >
              {isArabic ? 'بعد 3 أيام' : 'In 3 Days'}
            </button>
          </div>
        </div>

        <label
          htmlFor="follow-up-date-input"
          className="mb-1 block text-xs font-bold text-muted-foreground"
        >
          {t('orders.followUpDateLabel')}
        </label>
        <input
          id="follow-up-date-input"
          type="date"
          value={dateValue}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-md border border-border/60 bg-background p-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
            onClick={onSave}
            disabled={!dateValue || isSubmitting}
            className="rounded-md bg-primary px-3.5 py-1.5 text-xs font-black text-primary-foreground transition-all active:scale-[0.98] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (isArabic ? 'جارٍ الحفظ…' : 'Saving…') : t('orders.followUpSave')}
          </button>
        </div>
      </div>
    </div>
  );
};
