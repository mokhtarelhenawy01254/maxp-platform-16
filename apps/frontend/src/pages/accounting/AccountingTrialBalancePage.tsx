import React, { useEffect, useState } from 'react';
import {
  ScaleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, TrialBalanceReport } from './accountingApi';

export const AccountingTrialBalancePage: React.FC = () => {
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await accountingApi.getTrialBalance({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setReport(data);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      <AccountingHeader
        title="ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 shadow-sm transition-all"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>طباعة الميزان</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Date Filter Bar */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
              />
            </div>
            <button
              onClick={loadReport}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              تحديث
            </button>
          </div>

          {/* Balance Status Badge */}
          {report && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs ${
                report.totals.isBalanced
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
              }`}
            >
              {report.totals.isBalanced ? (
                <>
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                  <span>الميزان متوازن ومطابق: إجمالي المدين = إجمالي الدائن</span>
                </>
              ) : (
                <>
                  <ExclamationCircleIcon className="w-4 h-4 text-rose-500" />
                  <span>تحذير: يوجد فارق محاسبي في الميزان!</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Trial Balance Table */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
                  <th rowSpan={2} className="py-2.5 px-4 font-semibold border-l border-slate-200 dark:border-slate-800">كود الحساب</th>
                  <th rowSpan={2} className="py-2.5 px-4 font-semibold border-l border-slate-200 dark:border-slate-800">اسم الحساب</th>
                  <th colSpan={2} className="py-1.5 px-4 font-semibold text-center border-b border-l border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-800/60">رصيد أول المدة</th>
                  <th colSpan={2} className="py-1.5 px-4 font-semibold text-center border-b border-l border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/80">حركات الفترة</th>
                  <th colSpan={2} className="py-1.5 px-4 font-semibold text-center bg-slate-100/40 dark:bg-slate-800/60">رصيد آخر المدة (الإقفال)</th>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-mono text-[11px]">
                  <th className="py-1 px-3 text-left border-l border-slate-200 dark:border-slate-800">مدين</th>
                  <th className="py-1 px-3 text-left border-l border-slate-200 dark:border-slate-800">دائن</th>
                  <th className="py-1 px-3 text-left border-l border-slate-200 dark:border-slate-800">مدين</th>
                  <th className="py-1 px-3 text-left border-l border-slate-200 dark:border-slate-800">دائن</th>
                  <th className="py-1 px-3 text-left border-l border-slate-200 dark:border-slate-800">مدين</th>
                  <th className="py-1 px-3 text-left">دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                {!report || report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                      {loading ? 'جارٍ احتساب ميزان المراجعة...' : 'لا توجد حركات مالية في هذه الفترة'}
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row) => (
                    <tr key={row.accountId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-4 font-bold border-l border-slate-100 dark:border-slate-800/60">{row.code}</td>
                      <td className="py-2 px-4 font-sans font-medium text-slate-800 dark:text-slate-200 border-l border-slate-100 dark:border-slate-800/60">
                        {row.name}
                      </td>
                      <td className="py-2 px-3 text-left border-l border-slate-100 dark:border-slate-800/60 text-slate-500">
                        {row.openingDebit > 0 ? formatEGP(row.openingDebit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-left border-l border-slate-100 dark:border-slate-800/60 text-slate-500">
                        {row.openingCredit > 0 ? formatEGP(row.openingCredit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-left border-l border-slate-100 dark:border-slate-800/60 text-emerald-600 dark:text-emerald-400 font-medium">
                        {row.periodDebit > 0 ? formatEGP(row.periodDebit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-left border-l border-slate-100 dark:border-slate-800/60 text-rose-600 dark:text-rose-400 font-medium">
                        {row.periodCredit > 0 ? formatEGP(row.periodCredit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-left border-l border-slate-100 dark:border-slate-800/60 font-bold text-slate-900 dark:text-slate-100">
                        {row.endingDebit > 0 ? formatEGP(row.endingDebit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-left font-bold text-slate-900 dark:text-slate-100">
                        {row.endingCredit > 0 ? formatEGP(row.endingCredit) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {report && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/70 font-mono font-bold text-slate-900 dark:text-white">
                    <td colSpan={2} className="py-3 px-4 font-sans text-sm">الإجمالي العام لميزان المراجعة</td>
                    <td className="py-3 px-3 text-left">{formatEGP(report.totals.totalOpeningDebit)}</td>
                    <td className="py-3 px-3 text-left">{formatEGP(report.totals.totalOpeningCredit)}</td>
                    <td className="py-3 px-3 text-left text-emerald-600 dark:text-emerald-400">{formatEGP(report.totals.totalPeriodDebit)}</td>
                    <td className="py-3 px-3 text-left text-rose-600 dark:text-rose-400">{formatEGP(report.totals.totalPeriodCredit)}</td>
                    <td className="py-3 px-3 text-left text-emerald-600 dark:text-emerald-400">{formatEGP(report.totals.totalEndingDebit)}</td>
                    <td className="py-3 px-3 text-left text-rose-600 dark:text-rose-400">{formatEGP(report.totals.totalEndingCredit)}</td>
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
