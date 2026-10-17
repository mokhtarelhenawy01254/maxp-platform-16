import React, { useState } from 'react';
import { X, Plus, Calendar, DollarSign, Tag } from 'lucide-react';
import {
  manufacturingApi,
  CustomerOrderPayment,
  CustomerOrderPaymentKind,
  CustomerOrderPaymentDueTrigger,
} from '../../manufacturingApi';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerOrderId: string;
  totalContractValue: number;
  currency?: string;
  onPaymentAdded: (payment: CustomerOrderPayment) => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  customerOrderId,
  totalContractValue,
  currency = 'EGP',
  onPaymentAdded,
}) => {
  if (!isOpen) return null;

  const [label, setLabel] = useState<string>('');
  const [kind, setKind] = useState<CustomerOrderPaymentKind>('INSTALLMENT');
  const [amount, setAmount] = useState<number>(0);
  const [percent, setPercent] = useState<number | ''>('');
  const [dueTrigger, setDueTrigger] = useState<CustomerOrderPaymentDueTrigger>('MANUAL');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePercentChange = (val: string) => {
    if (!val) {
      setPercent('');
      return;
    }
    const p = parseFloat(val) || 0;
    setPercent(p);
    if (totalContractValue > 0) {
      setAmount(Math.round((p / 100) * totalContractValue));
    }
  };

  const handleAmountChange = (val: number) => {
    setAmount(val);
    if (totalContractValue > 0) {
      setPercent(Math.round((val / totalContractValue) * 100));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('يرجى تحديد مبلغ للدفعة أكبر من الصفر');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const created = await manufacturingApi.createCustomerOrderPayment(customerOrderId, {
        label: label.trim() || undefined,
        kind,
        amount: Number(amount),
        percent: percent !== '' ? Number(percent) : undefined,
        dueTrigger,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
        status: 'PENDING',
      });

      onPaymentAdded(created);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل إضافة الدفعة');
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
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">إضافة دفعة سداد جديدة</h2>
              <p className="text-[11px] text-muted-foreground">جدولة قسط أو دفعة مخصصة مرتبطة بالعقد</p>
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

          {/* Label */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              مسمى الدفعة
            </label>
            <div className="relative">
              <Tag className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="مثال: دفعة اعتماد القماش، دفعة تسليم الشحنة الأولى..."
                className="w-full pl-2.5 pr-8 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Kind & Due Trigger */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                نوع الدفعة
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as CustomerOrderPaymentKind)}
                className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="DEPOSIT">دفعة مقدمة (Deposit)</option>
                <option value="INSTALLMENT">قسط تشغيل (Installment)</option>
                <option value="FINAL">دفعة نهائية / تسليم (Final)</option>
                <option value="CUSTOM">مخصصة (Custom)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                شرط الاستحقاق (Trigger)
              </label>
              <select
                value={dueTrigger}
                onChange={(e) => setDueTrigger(e.target.value as CustomerOrderPaymentDueTrigger)}
                className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="ON_CONFIRMATION">عند تأكيد العقد (70% الافتراضي)</option>
                <option value="ON_START">عند بدء التشغيل (20% الافتراضي)</option>
                <option value="ON_DELIVERY">عند الاستلام والتسليم (10% الافتراضي)</option>
                <option value="ON_STAGE">مرتبطة بمرحلة معينة</option>
                <option value="MANUAL">تاريخ أو استحقاق يدوي</option>
              </select>
            </div>
          </div>

          {/* Amount & Percent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                المبلغ ({currency}) *
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                  className="w-full pl-2.5 pr-8 py-1.5 text-xs font-mono font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                النسبة المئوية (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={percent}
                onChange={(e) => handlePercentChange(e.target.value)}
                placeholder="اختياري (مثال: 25)"
                className="w-full p-2 text-xs font-mono font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              تاريخ الاستحقاق المتوقع
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-2.5 pr-8 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              ملاحظات
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="شروط السداد أو تفاصيل إضافية..."
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
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{loading ? 'جاري الإضافة...' : 'إضافة الدفعة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
