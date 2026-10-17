import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign, CreditCard } from 'lucide-react';
import {
  manufacturingApi,
  CustomerOrderPayment,
  CustomerOrder,
} from '../../manufacturingApi';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerOrderId: string;
  payment: CustomerOrderPayment | null;
  currency?: string;
  onPaymentUpdated: (updated: { payment: CustomerOrderPayment; customerOrder: CustomerOrder }) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  customerOrderId,
  payment,
  currency = 'EGP',
  onPaymentUpdated,
}) => {
  if (!isOpen || !payment) return null;

  const [paidAmount, setPaidAmount] = useState<number>(payment.amount || 0);
  const [method, setMethod] = useState<string>('BANK_TRANSFER');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paidAmount <= 0) {
      setError('يرجى إدخال مبلغ سداد صحيح أكبر من الصفر');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await manufacturingApi.updateCustomerOrderPayment(
        customerOrderId,
        payment.id,
        {
          status: 'PAID',
          paidAmount: Number(paidAmount),
          method,
          notes: notes.trim() || null,
          paidAt: new Date().toISOString(),
        }
      );

      onPaymentUpdated(res);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل تسجيل سداد الدفعة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-md flex flex-col rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">تسجيل سداد الدفعة التعاقدية</h2>
              <p className="text-[11px] text-muted-foreground">{payment.label || 'دفعة تعاقد'} — المبلغ المستحق {payment.amount.toLocaleString()} {currency}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              المبلغ المدفوع فعلياً ({currency}) *
            </label>
            <div className="relative">
              <DollarSign className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-2.5 pr-8 py-1.5 text-xs font-mono font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              طريقة / وسيلة الدفع *
            </label>
            <div className="relative">
              <CreditCard className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full pl-2.5 pr-8 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="BANK_TRANSFER">تحويل بنكي / إيداع</option>
                <option value="INSTAPAY">إنستاباي (InstaPay)</option>
                <option value="CASH">نقداً (كاش)</option>
                <option value="CHEQUE">شيك بنكي</option>
                <option value="CREDIT_CARD">بطاقة بنكية / فيزا</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              رقم العملية البنكية / إيصال الإيداع / ملاحظات
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="رقم الحوالة، اسم المودع، أو تفاصيل الإيداع..."
              className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs rounded-lg border border-border hover:bg-muted/50 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? 'جاري التأكيد...' : 'تأكيد السداد وتحديث الرصيد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
