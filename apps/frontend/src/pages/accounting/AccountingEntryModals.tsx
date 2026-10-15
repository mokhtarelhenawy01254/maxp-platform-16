import React, { useState } from 'react';
import { Account, JournalEntry } from './accountingApi';

interface NewEntryModalProps {
  accounts: Account[];
  loading: boolean;
  onClose: () => void;
  onSave: (data: {
    date: string;
    narration: string;
    status: 'DRAFT' | 'POSTED';
    lines: Array<{ accountId: string; debit: number; credit: number; narration?: string }>;
  }) => Promise<void>;
}

export const AccountingNewEntryModal: React.FC<NewEntryModalProps> = ({
  accounts,
  loading,
  onClose,
  onSave,
}) => {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [entryStatus, setEntryStatus] = useState<'DRAFT' | 'POSTED'>('POSTED');
  const [lines, setLines] = useState<Array<{ accountId: string; debit: number; credit: number; narration: string }>>([
    { accountId: '', debit: 0, credit: 0, narration: '' },
    { accountId: '', debit: 0, credit: 0, narration: '' },
  ]);

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const difference = Math.abs(Math.round((totalDebit - totalCredit) * 100) / 100);
  const isBalanced = difference === 0 && totalDebit > 0;

  const handleAddLine = () => {
    setLines([...lines, { accountId: '', debit: 0, credit: 0, narration: '' }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entryStatus === 'POSTED' && !isBalanced) {
      alert(`القيد غير متوازن رياضياً: إجمالي المدين (${totalDebit}) لا يساوي إجمالي الدائن (${totalCredit}) بفارق (${difference})`);
      return;
    }
    await onSave({
      date: entryDate,
      narration,
      status: entryStatus,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        narration: l.narration || undefined,
      })),
    });
  };

  const formatEGP = (num: number) => {
    return (num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold">تسجيل قيد يومية عامة جديد</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">تاريخ القيد</label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">البيان / شرح القيد العام</label>
              <input
                type="text"
                required
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                placeholder="مثال: إثبات سداد إيجار مقر الشركة الشهري..."
              />
            </div>
          </div>

          {/* Lines */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700 dark:text-slate-300">أطراف القيد (المدين والدائن):</span>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                + إضافة طرف آخر
              </button>
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <select
                    required
                    value={line.accountId}
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[idx].accountId = e.target.value;
                      setLines(updated);
                    }}
                    className="flex-1 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value="">-- اختر الحساب --</option>
                    {(accounts || []).map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="مدين"
                    value={line.debit || ''}
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[idx].debit = parseFloat(e.target.value) || 0;
                      if (updated[idx].debit > 0) updated[idx].credit = 0;
                      setLines(updated);
                    }}
                    className="w-24 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono tabular-nums text-left"
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="دائن"
                    value={line.credit || ''}
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[idx].credit = parseFloat(e.target.value) || 0;
                      if (updated[idx].credit > 0) updated[idx].debit = 0;
                      setLines(updated);
                    }}
                    className="w-24 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono tabular-nums text-left"
                  />

                  {lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="text-rose-500 hover:text-rose-700 px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Balance bar */}
          <div
            className={`p-3 rounded-lg border flex items-center justify-between font-mono text-xs ${
              isBalanced
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
            }`}
          >
            <span>المدين: {formatEGP(totalDebit)} ج.م</span>
            <span>الدائن: {formatEGP(totalCredit)} ج.م</span>
            <span className="font-bold">{isBalanced ? '✓ القيد متوازن' : `الفارق: ${formatEGP(difference)} ج.م`}</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                checked={entryStatus === 'POSTED'}
                onChange={() => setEntryStatus('POSTED')}
              />
              <span>ترحيل فوري للقوائم المالية</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                checked={entryStatus === 'DRAFT'}
                onChange={() => setEntryStatus('DRAFT')}
              />
              <span>حفظ كمسودة للمراجعة لاحقاً</span>
            </label>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || (entryStatus === 'POSTED' && !isBalanced)}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'جارٍ الحفظ...' : 'حفظ القيد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface VoidModalProps {
  entry: JournalEntry;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const AccountingVoidModal: React.FC<VoidModalProps> = ({
  entry,
  loading,
  onClose,
  onConfirm,
}) => {
  const [voidReason, setVoidReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(voidReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-4 space-y-3 text-xs">
        <h3 className="text-sm font-bold text-rose-600">إلغاء وعكس القيد رقم ({entry.entryNumber})</h3>
        <p className="text-slate-500 leading-relaxed">
          سيتم إنشاء قيد عكسي آلي يعكس جميع الأطراف الدائنة والمدينة لضمان سلامة التدقيق المالي وميزان المراجعة.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-semibold mb-1">سبب الإلغاء (اختياري)</label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
              rows={3}
              placeholder="أدخل سبب الإلغاء أو التعديل..."
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              تراجع
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700"
            >
              {loading ? 'جارٍ العكس...' : 'تأكيد الإلغاء والعكس'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
