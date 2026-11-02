import React from 'react';
import { X } from 'lucide-react';
import { SampleOrder } from '../../manufacturingApi';
import { DateInput } from '../../../../components/ui/DateInput';

export interface SamplePaymentModalProps {
  sample: SampleOrder;
  isOpen: boolean;
  onClose: () => void;
  paymentAmount: string;
  setPaymentAmount: (val: string) => void;
  paymentMethod: string;
  setPaymentMethod: (val: string) => void;
  paymentPaidAt: string;
  setPaymentPaidAt: (val: string) => void;
  paymentReference: string;
  setPaymentReference: (val: string) => void;
  paymentNotes: string;
  setPaymentNotes: (val: string) => void;
  paymentSubmitting: boolean;
  paymentError: string | null;
  onRecordPayment: (e: React.FormEvent) => void;
}

export const SamplePaymentModal: React.FC<SamplePaymentModalProps> = ({
  sample,
  isOpen,
  onClose,
  paymentAmount,
  setPaymentAmount,
  paymentMethod,
  setPaymentMethod,
  paymentPaidAt,
  setPaymentPaidAt,
  paymentReference,
  setPaymentReference,
  paymentNotes,
  setPaymentNotes,
  paymentSubmitting,
  paymentError,
  onRecordPayment,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-sm text-foreground">
            تسجيل دفعة على أمر العينة ({sample.sampleNumber})
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {paymentError && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300">
            {paymentError}
          </div>
        )}

        <form onSubmit={onRecordPayment} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">
              المبلغ المطلوب سداده (ج.م) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder={`المتبقي: ${sample.remaining ?? ''}`}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary tabular-nums"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">طريقة الدفع *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="CASH">نقدي (CASH)</option>
              <option value="INSTAPAY">انستاباي (InstaPay)</option>
              <option value="BANK_TRANSFER">تحويل بنكي (Bank Transfer)</option>
              <option value="VODAFONE_CASH">فودافون كاش (Vodafone Cash)</option>
              <option value="CREDIT_CARD">بطاقة ائتمان (Credit Card)</option>
              <option value="VISA">فيزا (Visa)</option>
              <option value="MASTERCARD">ماستركارد (MasterCard)</option>
              <option value="WALLET">محفظة إلكترونية (Wallet)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">تاريخ الدفعة *</label>
            <DateInput
              required
              value={paymentPaidAt}
              onChange={(e) => setPaymentPaidAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary tabular-nums"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">
              الرقم المرجعي (إيصال / عملية)
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="مثال: REF-928174 أو رقم التحويل"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">ملاحظات إضافية</label>
            <textarea
              rows={2}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="أي تفاصيل عن الدفعة..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={paymentSubmitting}
              className="px-3.5 py-1.5 rounded-lg border hover:bg-muted"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={paymentSubmitting}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {paymentSubmitting ? 'جاري التسجيل...' : 'تسجيل الدفعة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
