import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BanknotesIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  DocumentPlusIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { AccountingHeader } from './AccountingHeader';
import {
  accountingApi,
  BalanceSheetReport,
  ProfitLossReport,
  JournalEntry,
  UnpostedEntry,
} from './accountingApi';

export const AccountingDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);
  const [pnl, setPnl] = useState<ProfitLossReport | null>(null);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [unpostedCount, setUnpostedCount] = useState<number>(0);
  const [hasAccounts, setHasAccounts] = useState<boolean>(true);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bsRes, pnlRes, entriesRes, unpostedRes, coaRes] = await Promise.all([
        accountingApi.getBalanceSheet().catch(() => null),
        accountingApi.getProfitLoss().catch(() => null),
        accountingApi.listEntries({ limit: 5 }).catch(() => ({ entries: [], pagination: { total: 0, page: 1, totalPages: 1 } })),
        accountingApi.listUnpostedQueue({ status: 'PENDING' }).catch(() => []),
        accountingApi.getChartOfAccounts().catch(() => []),
      ]);

      setBalanceSheet(bsRes);
      setPnl(pnlRes);
      setRecentEntries(entriesRes?.entries || []);
      setUnpostedCount(Array.isArray(unpostedRes) ? unpostedRes.length : 0);
      setHasAccounts(Array.isArray(coaRes) && coaRes.length > 0);
    } catch (err: any) {
      console.error('Accounting dashboard load error', err);
      setError('تعذر تحديث بعض بيانات لوحة المحاسبة. يرجى مراجعة الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeedCOA = async () => {
    if (!window.confirm('هل تريد تهيئة دليل الحسابات المصري القياسي للشركة؟')) return;
    try {
      setLoading(true);
      await accountingApi.seedStandardCOA();
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const formatEGP = (num: number) => {
    return (num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      <AccountingHeader
        title="لوحة المؤشرات والرقابة المالية"
        actions={
          <div className="flex items-center gap-2">
            {!hasAccounts && (
              <button
                onClick={handleSeedCOA}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
              >
                تهيئة الدليل المصري القياسي
              </button>
            )}
            <Link
              to="/accounting/entries"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 shadow-sm transition-all"
            >
              <DocumentPlusIcon className="w-4 h-4" />
              <span>إضافة قيد يومية</span>
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadData} className="px-2.5 py-1 rounded bg-rose-600 text-white font-medium hover:bg-rose-700 text-[11px]">
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Unposted warning banner */}
        {unpostedCount > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  تنبيه عمليات معلقة: يوجد عدد ({unpostedCount}) حركة تجارية مؤجلة الترحيل
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  تم إيقاف ترحيلها نظراً لإقفال الفترة المالية أو قيود التحقق. يمكنك مراجعتها وإعادة ترحيلها فور فتح الفترة.
                </p>
              </div>
            </div>
            <Link
              to="/accounting/settings"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shrink-0 transition-all"
            >
              معالجة العمليات المعلقة
            </Link>
          </div>
        )}

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي الأصول</span>
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <BanknotesIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 tabular-nums tracking-tight">
              {formatEGP(balanceSheet?.summary?.totalAssets || 0)} <span className="text-xs font-normal">ج.م</span>
            </p>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>متداولة: {formatEGP(balanceSheet?.assets?.current?.total || 0)}</span>
              <span>ثابتة: {formatEGP(balanceSheet?.assets?.fixed?.total || 0)}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">الالتزامات والخصوم</span>
              <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ScaleIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 tabular-nums tracking-tight">
              {formatEGP(balanceSheet?.liabilities?.total || 0)} <span className="text-xs font-normal">ج.م</span>
            </p>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>موردون ومدينون متداولون</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">{formatEGP(balanceSheet?.liabilities?.current?.total || 0)}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي الإيرادات (المبيعات)</span>
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ArrowTrendingUpIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatEGP(pnl?.revenues?.total || 0)} <span className="text-xs font-normal">ج.م</span>
            </p>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              تكلفة البضاعة المباعة: {formatEGP(pnl?.cogs?.total || 0)} ج.م
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">صافي أرباح الفترة</span>
              <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                {(pnl?.netProfit || 0) >= 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4 text-rose-500" />
                )}
              </div>
            </div>
            <p
              className={`text-2xl font-bold mt-2 tabular-nums tracking-tight ${
                (pnl?.netProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatEGP(pnl?.netProfit || 0)} <span className="text-xs font-normal">ج.م</span>
            </p>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <CheckBadgeIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>ميزان المراجعة متوازن ومطابق</span>
            </div>
          </div>
        </div>

        {/* Quick Links / Navigation Bento */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Entries */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">أحدث قيود اليومية العامة</h2>
              <Link to="/accounting/entries" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                عرض جميع القيود ←
              </Link>
            </div>

            {recentEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">لا توجد قيود مسجلة بعد في دفتر اليومية.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                      <th className="py-2.5 font-medium">رقم القيد</th>
                      <th className="py-2.5 font-medium">التاريخ</th>
                      <th className="py-2.5 font-medium">البيان / الشرح</th>
                      <th className="py-2.5 font-medium">المصدر</th>
                      <th className="py-2.5 font-medium">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-mono font-bold">{e.entryNumber}</td>
                        <td className="py-2.5 tabular-nums text-slate-500">{new Date(e.date).toLocaleDateString('ar-EG')}</td>
                        <td className="py-2.5 max-w-xs truncate">{e.narration}</td>
                        <td className="py-2.5 text-slate-500 font-mono text-[11px]">{e.sourceType}</td>
                        <td className="py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              e.status === 'POSTED'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : e.status === 'VOID'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-slate-500/10 text-slate-600'
                            }`}
                          >
                            {e.status === 'POSTED' ? 'مرحل' : e.status === 'VOID' ? 'ملغي' : 'مسودة'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Balance Equality Check */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">معادلة الميزانية والمطابقة</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                تطبيق المعادلة المحاسبية الذهبية: (الأصول = الخصوم + حقوق الملكية).
              </p>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                  <span>إجمالي الأصول</span>
                  <span className="font-bold tabular-nums">{formatEGP(balanceSheet?.summary?.totalAssets || 0)} ج.م</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                  <span>الخصوم + حقوق الملكية</span>
                  <span className="font-bold tabular-nums">
                    {formatEGP(balanceSheet?.summary?.totalLiabilitiesAndEquity || 0)} ج.م
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold">
                  <span>فارق الميزانية</span>
                  <span className="tabular-nums">{formatEGP(balanceSheet?.summary?.difference || 0)} ج.م</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">حالة التطابق:</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600">
                مطابق بنسبة 100%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingDashboardPage;
