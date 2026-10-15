import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Printer,
  RotateCw,
  Calendar,
} from 'lucide-react';
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

  const movements = ledger?.movements || [];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <AccountingHeader
        title="دفتر الأستاذ العام وكشف الحساب التحليلي"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border/70 text-foreground hover:bg-muted/50 shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة كشف الحساب</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadLedger}
              className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 text-[11px] flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {/* Selection Bar */}
        <div className="p-4 rounded-xl bg-card border border-border/70 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="md:col-span-2">
            <label className="block font-medium mb-1 text-muted-foreground">الحساب المالي المطلوب:</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name} ({acc.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1 text-muted-foreground">من تاريخ:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-muted-foreground">إلى تاريخ:</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={loadLedger}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition shadow-sm shrink-0"
              >
                {loading ? 'جارٍ التحميل...' : 'عرض'}
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Summary Cards */}
        {ledger && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs">
              <span className="text-[11px] text-muted-foreground font-medium block">رصيد أول المدة</span>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums text-foreground">
                {formatEGP(ledger.openingBalance || 0)} <span className="text-xs font-normal text-muted-foreground font-sans">ج.م</span>
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs">
              <span className="text-[11px] text-muted-foreground font-medium block">إجمالي الحركات المدينة</span>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatEGP(ledger.totals?.totalDebit || 0)} <span className="text-xs font-normal text-muted-foreground font-sans">ج.م</span>
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs">
              <span className="text-[11px] text-muted-foreground font-medium block">إجمالي الحركات الدائنة</span>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums text-rose-600 dark:text-rose-400">
                {formatEGP(ledger.totals?.totalCredit || 0)} <span className="text-xs font-normal text-muted-foreground font-sans">ج.م</span>
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">رصيد الإقفال الحالي</span>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums text-emerald-800 dark:text-emerald-300">
                {formatEGP(ledger.totals?.closingBalance || 0)} <span className="text-xs font-normal text-muted-foreground font-sans">ج.م</span>
              </p>
            </div>
          </div>
        )}

        {/* Movements Table */}
        <div className="rounded-xl bg-card border border-border/70 shadow-xs overflow-hidden">
          <div className="p-3 bg-muted/20 border-b border-border/60 flex justify-between items-center text-xs">
            <span className="font-bold text-foreground">
              حركات الحساب: {ledger?.account?.code ? `${ledger.account.code} - ${ledger.account.name}` : (accounts.find((a) => a.id === selectedAccountId)?.name || '—')}
            </span>
            <span className="text-muted-foreground font-mono">
              عدد الحركات: {movements.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground bg-muted/10">
                  <th className="py-2.5 px-4 font-semibold">رقم القيد</th>
                  <th className="py-2.5 px-4 font-semibold">التاريخ</th>
                  <th className="py-2.5 px-4 font-semibold">البيان / الشرح</th>
                  <th className="py-2.5 px-4 font-semibold">المصدر</th>
                  <th className="py-2.5 px-4 font-semibold text-left">مدين (Debit)</th>
                  <th className="py-2.5 px-4 font-semibold text-left">دائن (Credit)</th>
                  <th className="py-2.5 px-4 font-semibold text-left">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RotateCw className="w-4 h-4 animate-spin text-primary" />
                          <span>جارٍ احتساب دفتر الأستاذ...</span>
                        </div>
                      ) : (
                        'لا توجد حركات مالية مسجلة على هذا الحساب في الفترة المحددة'
                      )}
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.lineId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-foreground">{m.entryNumber}</td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-muted-foreground">
                        {new Date(m.date).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="py-2.5 px-4 max-w-sm truncate text-foreground">{m.narration}</td>
                      <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px]">{m.sourceType}</td>
                      <td className="py-2.5 px-4 text-left font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {m.debit > 0 ? formatEGP(m.debit) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-left font-mono tabular-nums text-rose-600 dark:text-rose-400">
                        {m.credit > 0 ? formatEGP(m.credit) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-left font-mono font-bold tabular-nums text-foreground">
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
