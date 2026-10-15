import React, { useEffect, useState } from 'react';
import {
  BuildingLibraryIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, BalanceSheetReport } from './accountingApi';

export const AccountingBalanceSheetPage: React.FC = () => {
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await accountingApi.getBalanceSheet({ asOfDate });
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
        title="قائمة المركز المالي والميزانية العمومية (Balance Sheet)"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 shadow-sm transition-all"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>طباعة الميزانية</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
        {/* Date Filter Bar */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-600 dark:text-slate-400">حتى تاريخ (As of date):</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
            />
            <button
              onClick={loadReport}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              عرض الميزانية
            </button>
          </div>

          {/* Equality Check Badge */}
          {report && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs ${
                report.summary.isBalanced
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
              }`}
            >
              {report.summary.isBalanced ? (
                <>
                  <CheckBadgeIcon className="w-4 h-4 text-emerald-500" />
                  <span>الميزانية متطابقة ومقفلة بنجاح: (الأصول = الخصوم + حقوق الملكية)</span>
                </>
              ) : (
                <>
                  <ExclamationCircleIcon className="w-4 h-4 text-rose-500" />
                  <span>تنبيه: يوجد فارق قدره {formatEGP(report.summary.difference)} ج.م</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 2-Column Balance Sheet Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Right Column: Assets (الأصول) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-5">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold text-sm text-slate-900 dark:text-white">
              <span>الأصول (Assets)</span>
              <span className="font-mono tabular-nums text-emerald-600 text-base">
                {formatEGP(report?.summary.totalAssets || 0)} ج.م
              </span>
            </div>

            {/* Current Assets */}
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-2">الأصول المتداولة (Current Assets)</span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {(report?.assets.current.items || []).map((item) => (
                  <div key={item.code} className="py-2 flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>
                      <span className="font-mono text-slate-400 ml-2">[{item.code}]</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums">{formatEGP(item.amount)} ج.م</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>إجمالي الأصول المتداولة</span>
                <span className="font-mono tabular-nums">{formatEGP(report?.assets.current.total || 0)} ج.م</span>
              </div>
            </div>

            {/* Fixed Assets */}
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-2">الأصول الثابتة وغير المتداولة (Fixed Assets)</span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {(report?.assets.fixed.items || []).map((item) => (
                  <div key={item.code} className="py-2 flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>
                      <span className="font-mono text-slate-400 ml-2">[{item.code}]</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums">{formatEGP(item.amount)} ج.م</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>إجمالي الأصول الثابتة</span>
                <span className="font-mono tabular-nums">{formatEGP(report?.assets.fixed.total || 0)} ج.م</span>
              </div>
            </div>
          </div>

          {/* Left Column: Liabilities & Equity (الخصوم وحقوق الملكية) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-5">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold text-sm text-slate-900 dark:text-white">
              <span>الخصوم وحقوق الملكية (Liabilities & Equity)</span>
              <span className="font-mono tabular-nums text-slate-900 dark:text-white text-base">
                {formatEGP(report?.summary.totalLiabilitiesAndEquity || 0)} ج.م
              </span>
            </div>

            {/* Current Liabilities */}
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-2">الالتزامات المتداولة (Current Liabilities)</span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {(report?.liabilities.current.items || []).map((item) => (
                  <div key={item.code} className="py-2 flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>
                      <span className="font-mono text-slate-400 ml-2">[{item.code}]</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums">{formatEGP(item.amount)} ج.م</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>إجمالي الالتزامات المتداولة</span>
                <span className="font-mono tabular-nums">{formatEGP(report?.liabilities.current.total || 0)} ج.م</span>
              </div>
            </div>

            {/* Equity */}
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-2">حقوق الملكية (Equity)</span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {(report?.equity.items || []).map((item) => (
                  <div key={item.code} className="py-2 flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>
                      <span className="font-mono text-slate-400 ml-2">[{item.code}]</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums">{formatEGP(item.amount)} ج.م</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>إجمالي حقوق الملكية</span>
                <span className="font-mono tabular-nums">{formatEGP(report?.equity.total || 0)} ج.م</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingBalanceSheetPage;
