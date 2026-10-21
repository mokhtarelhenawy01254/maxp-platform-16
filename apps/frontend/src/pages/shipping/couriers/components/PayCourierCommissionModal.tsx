import React from 'react';
import { Banknote, X } from 'lucide-react';
import { type CourierCommissionSummaryRow } from '../../../../services/courierService';
import { type TreasuryAccountOption } from '../hooks/useCourierDuesData';

interface PayCourierCommissionModalProps {
  payingRow: CourierCommissionSummaryRow;
  treasuryAccounts: TreasuryAccountOption[];
  payAccountId: string;
  onPayAccountIdChange: (id: string) => void;
  formatPrice: (price: number) => string;
  onConfirm: () => void;
  onClose: () => void;
}

export const PayCourierCommissionModal: React.FC<PayCourierCommissionModalProps> = ({
  payingRow,
  treasuryAccounts,
  payAccountId,
  onPayAccountIdChange,
  formatPrice,
  onConfirm,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
      <div className="bg-card border border-border/70 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Banknote className="size-5 text-emerald-600" />
            <h3 className="font-bold text-sm text-foreground">صرف مستحقات {payingRow.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30"
          >
            <X size={16} />
          </button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div>المبلغ الإجمالي المستحق:</div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {formatPrice(payingRow.dueAmount)}
            <span className="text-xs font-normal text-muted-foreground mr-1.5">
              ({payingRow.dueCount} قيد معلق)
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground">
            الخزينة المصروف منها (خصم فوري من الرصيد)
          </label>
          <div className="relative">
            <select
              value={payAccountId}
              onChange={(e) => onPayAccountIdChange(e.target.value)}
              className="w-full text-xs h-9 px-3 rounded-lg border border-border/70 bg-card text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-medium"
            >
              <option value="">بدون قيد خزينة (صرف خارج الدفاتر)</option>
              {treasuryAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — رصيد: {formatPrice(a.balance)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 border border-border/70 hover:bg-muted/30 rounded-xl text-xs font-semibold transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold active:scale-[0.98] transition-all shadow-xs"
          >
            تأكيد الصرف
          </button>
        </div>
      </div>
    </div>
  );
};
