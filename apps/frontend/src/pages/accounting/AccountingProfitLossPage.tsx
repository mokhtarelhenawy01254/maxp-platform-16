import React, { useEffect, useState } from 'react';
import {
  PresentationChartLineIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, ProfitLossReport } from './accountingApi';

export const AccountingProfitLossPage: React.FC = () => {
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountingApi.getProfitLoss({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setReport(data);
    } catch (err: any) {
      console.error('Failed to load profit and loss report', err);
      setError(err.response?.data?.message || 'تعذر تحميل قائمة الدخل والأرباح والخسائر');
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
        title="قائمة الدخل والأرباح والخسائر (Income Statement)"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 shadow-sm transition-all"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadReport} className="px-2.5 py-1 rounded bg-rose-600 text-white font-medium hover:bg-rose-700 text-[11px]">
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Date Filter Bar */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
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

          <div className="text-xs text-slate-500 font-medium">
            العملة: الجنيه المصري (EGP)
          </div>
        </div>

        {/* P&L Statement Chassis */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6">
          {/* 1. Revenues */}
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
              <span>إيرادات النشاط التشغيلي الرئيسي (Revenues)</span>
              <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatEGP(report?.revenues?.total || 0)} ج.م
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {(report?.revenues?.items || []).map((item) => (
                <div key={item.code} className="py-2 flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>
                    <span className="font-mono text-slate-400 ml-2">[{item.code}]</span>
                    {item.name}
                  </span>
                  <span className="font-mono tabular-nums">{formatEGP(item.amount)} ج.م</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. COGS */}
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
              <span>تكلفة النشاط والمبيعات (COGS)</span>
              <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                ({formatEGP(report?.cogs?.total || 0)}) ج.م
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {(report?.cogs?.items || []).map((item) => (
                <div key={item.code} className="py-2 flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>
                    <span className="font-mono text-slate-400 ml-2">[{item.code}]</span>
                    {item.name}
                  </span>
                  <span className="font-mono tabular-nums">{formatEGP(item.amount)} ج.م</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gross Profit Callout */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex justify-between items-center font-bold text-sm">
            <span>مجمل الربح (Gross Profit)</span>
            <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 text-base">
              {formatEGP(report?.grossProfit || 0)} ج.م
            </span>
          </div>

          {/* 3. Operating Expenses */}
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
              <span>المصروفات التشغيلية والبيعية والإدارية (OPEX)</span>
              <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                ({formatEGP(report?.operatingExpenses?.total || 0)}) ج.م
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {(report?.operatingExpenses?.items || []).map((item) => (
                <div key={item.code} className="py-2 flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>
                    <span className="font-mono text-slate-400 ml-2">[{item.code}]</span>
                    {item.name}
                  </span>
                  <span className="font-mono tabular-nums">{formatEGP(item.amount)} ج.م</span>
                </div>
              ))}
            </div>
          </div>

          {/* Operating Profit Callout */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex justify-between items-center font-bold text-sm">
            <span>الربح التشغيلي (Operating Profit / EBIT)</span>
            <span className="font-mono tabular-nums text-slate-900 dark:text-white text-base">
              {formatEGP(report?.operatingProfit || 0)} ج.م
            </span>
          </div>

          {/* 4. Other Revenues */}
          {(report?.otherRevenues?.total || 0) > 0 && (
            <div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                <span>إيرادات أخرى وتمويلية</span>
                <span className="font-mono tabular-nums text-emerald-600">
                  {formatEGP(report?.otherRevenues?.total || 0)} ج.م
                </span>
              </div>
            </div>
          )}

          {/* Net Profit / Loss Highlight */}
          <div
            className={`p-5 rounded-2xl border flex justify-between items-center ${
              (report?.netProfit || 0) >= 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
            }`}
          >
            <div>
              <span className="text-base font-bold block">
                {(report?.netProfit || 0) >= 0 ? 'صافي أرباح الفترة (Net Profit)' : 'صافي خسائر الفترة (Net Loss)'}
              </span>
              <span className="text-xs opacity-75">
                {(report?.netProfit || 0) >= 0 ? 'ربح مالي حقيقي قابل للترحيل للأرباح المبقاة' : 'عجز في نتائج الأعمال'}
              </span>
            </div>
            <div className="text-2xl font-black font-mono tabular-nums">
              {formatEGP(report?.netProfit || 0)} <span className="text-sm font-normal">ج.م</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingProfitLossPage;
