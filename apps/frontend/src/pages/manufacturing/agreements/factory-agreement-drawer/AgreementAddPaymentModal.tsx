import React from "react";
import { X } from "lucide-react";
import { DateInput } from '../../../../components/ui/DateInput';

export interface AgreementAddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  actionLoading: boolean;
  paymentLabel: string;
  onPaymentLabelChange: (val: string) => void;
  paymentAmount: string;
  onPaymentAmountChange: (val: string) => void;
  paymentDueDate: string;
  onPaymentDueDateChange: (val: string) => void;
  paymentNotes: string;
  onPaymentNotesChange: (val: string) => void;
}

export const AgreementAddPaymentModal: React.FC<
  AgreementAddPaymentModalProps
> = ({
  isOpen,
  onClose,
  onSubmit,
  actionLoading,
  paymentLabel,
  onPaymentLabelChange,
  paymentAmount,
  onPaymentAmountChange,
  paymentDueDate,
  onPaymentDueDateChange,
  paymentNotes,
  onPaymentNotesChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-sm font-bold text-foreground">
            إضافة دفعة مالية جديدة
          </h3>
          <button
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1">
              مسمى الدفعة
            </label>
            <input
              type="text"
              placeholder="مثال: دفعة فحص الجودة والتسليم الجزئي"
              value={paymentLabel}
              onChange={(e) => onPaymentLabelChange(e.target.value)}
              className="w-full p-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block font-medium text-foreground mb-1">
              المبلغ (ج.م) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="مثال: 3000"
              value={paymentAmount}
              onChange={(e) => onPaymentAmountChange(e.target.value)}
              className="w-full p-2 bg-background border border-border rounded-lg text-foreground font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block font-medium text-foreground mb-1">
              تاريخ الاستحقاق
            </label>
            <DateInput
              value={paymentDueDate}
              onChange={(e) => onPaymentDueDateChange(e.target.value)}
              className="w-full p-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-foreground mb-1">
              ملاحظات
            </label>
            <input
              type="text"
              placeholder="أي تفاصيل حول شروط استحقاق الدفعة..."
              value={paymentNotes}
              onChange={(e) => onPaymentNotesChange(e.target.value)}
              className="w-full p-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
          <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              إضافة الدفعة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
