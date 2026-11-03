import React, { useState, useEffect } from 'react';
import { X, DollarSign, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SettlementItem, formatEgp } from './SettlementTypes';

interface SettlementPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: SettlementItem | null;
  authHeaders: Record<string, string>;
  onPaid: () => void;
}

export const SettlementPayModal: React.FC<SettlementPayModalProps> = ({
  isOpen,
  onClose,
  settlement,
  authHeaders,
  onPaid,
}) => {
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [accounts, setAccounts] = useState<{ id: string; name: string; balance?: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Attempt to load treasury accounts
    fetch('/api/v1/treasury/accounts', { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setAccounts(data.data);
          if (data.data.length > 0) setTreasuryAccountId(data.data[0].id);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen || !settlement) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) {
      toast.error('يرجى إدخال مرجع عملية التوريد / التحويل');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/shipping-portal/settlements/${settlement.id}/pay`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          method,
          reference: reference.trim(),
          treasuryAccountId: treasuryAccountId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم تسجيل توريد وصرف الكشف بنجاح');
        onPaid();
        onClose();
      } else {
        toast.error(data.message || 'فشل في تسجيل التوريد');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              تسجيل توريد وصرف الكشف
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePay} className="p-5 space-y-4 text-xs">
          <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg p-3 text-center">
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">
              صافي التوريد المستحق لـ {settlement.merchant?.name || 'العميل'}
            </span>
            <span className="text-xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">
              {formatEgp(settlement.netPayout)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
              {settlement.settlementNumber}
            </span>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              طريقة التوريد *
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="BANK_TRANSFER">تحويل بنكي (Bank Wire)</option>
              <option value="INSTAPAY">إنستاباي (InstaPay)</option>
              <option value="CASH">نقدي (Cash / خزينة)</option>
              <option value="CHEQUE">شيك بنكي (Cheque)</option>
              <option value="VODAFONE_CASH">محفظة إلكترونية (E-Wallet)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              مرجع التحويل / الإيصال *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: رقم التحويل البنكي أو إيصال الصرف"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          {accounts.length > 0 && (
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                حساب الخزينة (اختياري للصرف المالي المباشر)
              </label>
              <select
                value={treasuryAccountId}
                onChange={(e) => setTreasuryAccountId(e.target.value)}
                className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">-- بدون ربط خزينة مباشرة --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.balance !== undefined ? `(${formatEgp(acc.balance)})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4" />
              {loading ? 'جارٍ التسجيل...' : 'تأكيد التوريد والصرف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
