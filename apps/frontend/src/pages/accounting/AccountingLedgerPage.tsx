import React, { useEffect, useState } from 'react';
import {
  BookOpenIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, GeneralLedgerReport, Account } from './accountingApi';

export const AccountingLedgerPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledger, setLedger] = useState<GeneralLedgerReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    accountingApi
      .getChartOfAccounts()
      .then((data) => {
        const postable = Array.isArray(data) ? data.filter((a) => a.isPostable) : [];
        setAccounts(postable);
        if (postable.length > 0) {
          setSelectedAccountId(postable[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load accounts for ledger', err);
        setError('تعذر تحميل قائمة الحسابات لدفتر الأستاذ');
        setAccounts([]);
      });
  }, []);

  const loadLedger = async () => {
    if (!selectedAccountId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await accountingApi.getGeneralLedger({
        accountId: selectedAccountId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLedger(data);
    } catch (err: any) {
      console.error('Failed to load ledger', err);
      setError(err.response?.data?.message || 'تعذر تحميل بيانات دفتر الأستاذ العام');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId) {
      loadLedger();
    }
  }, [selectedAccountId]);

  const formatEGP = (num: number) => {
    return (num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      <AccountingHeader
        title="دفتر الأستاذ العام وكشف الحساب التحليلي"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 shadow-sm transition-all"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>طباعة كشف الحساب</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadLedger} className="px-2.5 py-1 rounded bg-rose-600 text-white font-medium hover:bg-rose-700 text-[11px]">
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Selection Bar */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="md:col-span-2">
            <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">الحساب المالي المطلوب:</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name} ({acc.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">من تاريخ:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">إلى تاريخ:</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs"
              />
              <button
                onClick={loadLedger}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shrink-0"
              >
                عرض
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Summary Cards */}
        {ledger && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium block">رصيد أول المدة</span>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                {formatEGP(ledger.openingBalance || 0)} ج.م
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium block">إجمالي الحركات المدينة</span>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatEGP(ledger.totals?.totalDebit || 0)} ج.م
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium block">إجمالي الحركات الدائنة</span>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums text-rose-600 dark:text-rose-400">
                {formatEGP(ledger.totals?.totalCredit || 0)} ج.م
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 shadow-sm">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">رصيد الإقفال الحالي</span>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums text-emerald-800 dark:text-emerald-300">
                {formatEGP(ledger.totals?.closingBalance || 0)} ج.م
              </p>
            </div>
          </div>
        )}

        {/* Movements Table */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              حركات الحساب: {ledger?.account?.code ? `${ledger.account.code} - ${ledger.account.name}` : (accounts.find((a) => a.id === selectedAccountId)?.name || '—')}
            </span>
            <span className="text-slate-400 font-mono">
              عدد الحركات: {ledger?.movements?.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50/30">
                  <th className="py-2.5 px-4 font-semibold">رقم القيد</th>
                  <th className="py-2.5 px-4 font-semibold">التاريخ</th>
                  <th className="py-2.5 px-4 font-semibold">البيان / الشرح</th>
                  <th className="py-2.5 px-4 font-semibold">المصدر</th>
                  <th className="py-2.5 px-4 font-semibold text-left">مدين (Debit)</th>
                  <th className="py-2.5 px-4 font-semibold text-left">دائن (Credit)</th>
                  <th className="py-2.5 px-4 font-semibold text-left">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {!ledger || !ledger.movements || ledger.movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {loading ? 'جارٍ احتساب دفتر الأستاذ...' : 'لا توجد حركات مالية مسجلة على هذا الحساب في الفترة المحددة'}
                    </td>
                  </tr>
                ) : (
                  ledger.movements.map((m) => (
                    <tr key={m.lineId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold">{m.entryNumber}</td>
                      <td className="py-2.5 px-4 tabular-nums text-slate-500">
                        {new Date(m.date).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="py-2.5 px-4 max-w-sm truncate">{m.narration}</td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{m.sourceType}</td>
                      <td className="py-2.5 px-4 text-left font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {m.debit > 0 ? formatEGP(m.debit) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-left font-mono tabular-nums text-rose-600 dark:text-rose-400">
                        {m.credit > 0 ? formatEGP(m.credit) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-left font-mono font-bold tabular-nums">
                        {formatEGP(m.runningBalance)} ج.م
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingLedgerPage;
