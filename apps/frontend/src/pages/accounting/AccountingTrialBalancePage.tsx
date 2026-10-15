import React, { useEffect, useState } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertCircle,
  Printer,
  RotateCw,
  Calendar,
} from 'lucide-react';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, TrialBalanceReport } from './accountingApi';

export const AccountingTrialBalancePage: React.FC = () => {
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountingApi.getTrialBalance({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setReport(data);
    } catch (err: any) {
      console.error('Failed to load trial balance', err);
      setError(err.response?.data?.message || 'تعذر تحميل ميزان المراجعة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const formatEGP = (num: number) => {
    return (num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const rows = report?.rows || (Array.isArray(report?.accounts) ? report.accounts : []);
  const totals = report?.totals || report?.summary;
  const isBalanced = totals?.isBalanced ?? (totals?.totalEndingDebit === totals?.totalEndingCredit);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <AccountingHeader
        title="ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border/70 text-foreground hover:bg-muted/50 shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة الميزان</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadReport}
              className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 text-[11px] flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {/* Date Filter Bar */}
        <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>من:</span>
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-border/70 bg-background font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-border/70 bg-background font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={loadReport}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition shadow-sm"
            >
              {loading ? 'جارٍ التحديث...' : 'تحديث'}
            </button>
          </div>

          {/* Balance Status Badge */}
          {totals && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs border ${
                isBalanced
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              {isBalanced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>الميزان متوازن ومطابق: إجمالي المدين = إجمالي الدائن</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>تحذير: يوجد فارق محاسبي في الميزان!</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Trial Balance Table */}
        <div className="rounded-xl bg-card border border-border/70 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground">
                  <th rowSpan={2} className="py-2.5 px-4 font-semibold border-l border-border/60">كود الحساب</th>
                  <th rowSpan={2} className="py-2.5 px-4 font-semibold border-l border-border/60">اسم الحساب</th>
                  <th colSpan={2} className="py-1.5 px-4 font-semibold text-center border-b border-l border-border/60 bg-muted/30">رصيد أول المدة</th>
                  <th colSpan={2} className="py-1.5 px-4 font-semibold text-center border-b border-l border-border/60 bg-muted/40">حركات الفترة</th>
                  <th colSpan={2} className="py-1.5 px-4 font-semibold text-center bg-muted/30">رصيد آخر المدة (الإقفال)</th>
                </tr>
                <tr className="border-b border-border/60 bg-muted/10 text-muted-foreground font-mono text-[11px]">
                  <th className="py-1 px-3 text-left border-l border-border/60">مدين</th>
                  <th className="py-1 px-3 text-left border-l border-border/60">دائن</th>
                  <th className="py-1 px-3 text-left border-l border-border/60">مدين</th>
                  <th className="py-1 px-3 text-left border-l border-border/60">دائن</th>
                  <th className="py-1 px-3 text-left border-l border-border/60">مدين</th>
                  <th className="py-1 px-3 text-left">دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono tabular-nums">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground font-sans">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RotateCw className="w-4 h-4 animate-spin text-primary" />
                          <span>جارٍ احتساب ميزان المراجعة...</span>
                        </div>
                      ) : (
                        'لا توجد حركات مالية في هذه الفترة'
                      )}
                    </td>
                  </tr>
                ) : (
                  rows.map((row: any) => (
                    <tr key={row.accountId || row.id || row.code} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-4 font-bold border-l border-border/40 text-foreground">{row.code}</td>
                      <td className="py-2 px-4 font-sans font-medium text-foreground border-l border-border/40">
                        {row.name}
                      </td>
                      <td className="py-2 px-3 text-left border-l border-border/40 text-muted-foreground">
                        {row.openingDebit > 0 ? formatEGP(row.openingDebit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-left border-l border-border/40 text-muted-foreground">
                        {row.openingCredit > 0 ? formatEGP(row.openingCredit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-left border-l border-border/40 text-emerald-600 dark:text-emerald-400 font-medium">
                        {row.periodDebit > 0 ? formatEGP(row.periodDebit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-left border-l border-border/40 text-rose-600 dark:text-rose-400 font-medium">
                        {row.periodCredit > 0 ? formatEGP(row.periodCredit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-left border-l border-border/40 font-bold text-foreground">
                        {row.endingDebit > 0 ? formatEGP(row.endingDebit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-left font-bold text-foreground">
                        {row.endingCredit > 0 ? formatEGP(row.endingCredit) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t-2 border-border/80 bg-muted/40 font-mono font-bold text-foreground">
                    <td colSpan={2} className="py-3 px-4 font-sans text-xs sm:text-sm">الإجمالي العام لميزان المراجعة</td>
                    <td className="py-3 px-3 text-left">{formatEGP(totals.totalOpeningDebit || 0)}</td>
                    <td className="py-3 px-3 text-left">{formatEGP(totals.totalOpeningCredit || 0)}</td>
                    <td className="py-3 px-3 text-left text-emerald-600 dark:text-emerald-400">{formatEGP(totals.totalPeriodDebit || 0)}</td>
                    <td className="py-3 px-3 text-left text-rose-600 dark:text-rose-400">{formatEGP(totals.totalPeriodCredit || 0)}</td>
                    <td className="py-3 px-3 text-left text-emerald-600 dark:text-emerald-400">{formatEGP(totals.totalEndingDebit || 0)}</td>
                    <td className="py-3 px-3 text-left text-rose-600 dark:text-rose-400">{formatEGP(totals.totalEndingCredit || 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingTrialBalancePage;
