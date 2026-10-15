import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Printer,
  RotateCw,
  Calendar,
} from 'lucide-react';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, BalanceSheetReport } from './accountingApi';

export const AccountingBalanceSheetPage: React.FC = () => {
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountingApi.getBalanceSheet({ asOfDate });
      setReport(data);
    } catch (err: any) {
      console.error('Failed to load balance sheet', err);
      setError(err.response?.data?.message || 'تعذر تحميل الميزانية العمومية');
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

  // Helper to extract items safely whether nested or flat
  const currentAssetItems = report?.assets?.current?.items || (Array.isArray(report?.assets) ? report.assets : []);
  const fixedAssetItems = report?.assets?.fixed?.items || [];
  const currentLiabilityItems = report?.liabilities?.current?.items || (Array.isArray(report?.liabilities) ? report.liabilities : []);
  const equityItems = report?.equity?.items || (Array.isArray(report?.equity) ? report.equity : []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <AccountingHeader
        title="قائمة المركز المالي والميزانية العمومية (Balance Sheet)"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border/70 text-foreground hover:bg-muted/50 shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة الميزانية</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
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
          <div className="flex items-center gap-3">
            <span className="font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>حتى تاريخ (As of date):</span>
            </span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-border/70 bg-background font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={loadReport}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition shadow-sm"
            >
              {loading ? 'جارٍ التحميل...' : 'عرض الميزانية'}
            </button>
          </div>

          {/* Equality Check Badge */}
          {report?.summary && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs border ${
                report.summary.isBalanced
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              {report.summary.isBalanced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>الميزانية متطابقة ومقفلة بنجاح: (الأصول = الخصوم + حقوق الملكية)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span className="font-mono tabular-nums">
                    تنبيه: يوجد فارق قدره {formatEGP(report.summary.difference || 0)} ج.م
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 2-Column Balance Sheet Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Right Column: Assets (الأصول) */}
          <div className="rounded-xl bg-card border border-border/70 shadow-xs p-5 space-y-5">
            <div className="pb-3 border-b border-border/60 flex justify-between items-center font-bold text-sm text-foreground">
              <span>الأصول (Assets)</span>
              <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 text-base">
                {formatEGP(report?.summary?.totalAssets || 0)} ج.م
              </span>
            </div>

            {/* Current Assets */}
            <div>
              <span className="text-xs font-bold text-muted-foreground block mb-2">الأصول المتداولة (Current Assets)</span>
              <div className="divide-y divide-border/40 text-xs">
                {currentAssetItems.length === 0 ? (
                  <div className="py-2 text-muted-foreground text-xs">لا توجد بنود مسجلة</div>
                ) : (
                  currentAssetItems.map((item: any) => (
                    <div key={item.code || item.id} className="py-2 flex justify-between items-center text-foreground hover:bg-muted/20 px-1 rounded transition">
                      <span>
                        <span className="font-mono text-muted-foreground ml-2">[{item.code || '-'}]</span>
                        {item.name}
                      </span>
                      <span className="font-mono tabular-nums font-semibold">{formatEGP(item.amount ?? item.balance ?? 0)} ج.م</span>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-2 flex justify-between text-xs font-semibold text-foreground border-t border-border/40 mt-1">
                <span>إجمالي الأصول المتداولة</span>
                <span className="font-mono tabular-nums text-primary">{formatEGP(report?.assets?.current?.total || report?.summary?.totalAssets || 0)} ج.م</span>
              </div>
            </div>

            {/* Fixed Assets */}
            <div>
              <span className="text-xs font-bold text-muted-foreground block mb-2">الأصول الثابتة وغير المتداولة (Fixed Assets)</span>
              <div className="divide-y divide-border/40 text-xs">
                {fixedAssetItems.length === 0 ? (
                  <div className="py-2 text-muted-foreground text-xs">لا توجد أصول ثابتة مسجلة</div>
                ) : (
                  fixedAssetItems.map((item: any) => (
                    <div key={item.code || item.id} className="py-2 flex justify-between items-center text-foreground hover:bg-muted/20 px-1 rounded transition">
                      <span>
                        <span className="font-mono text-muted-foreground ml-2">[{item.code || '-'}]</span>
                        {item.name}
                      </span>
                      <span className="font-mono tabular-nums font-semibold">{formatEGP(item.amount ?? item.balance ?? 0)} ج.م</span>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-2 flex justify-between text-xs font-semibold text-foreground border-t border-border/40 mt-1">
                <span>إجمالي الأصول الثابتة</span>
                <span className="font-mono tabular-nums">{formatEGP(report?.assets?.fixed?.total || 0)} ج.م</span>
              </div>
            </div>
          </div>

          {/* Left Column: Liabilities & Equity (الخصوم وحقوق الملكية) */}
          <div className="rounded-xl bg-card border border-border/70 shadow-xs p-5 space-y-5">
            <div className="pb-3 border-b border-border/60 flex justify-between items-center font-bold text-sm text-foreground">
              <span>الخصوم وحقوق الملكية (Liabilities & Equity)</span>
              <span className="font-mono tabular-nums text-foreground text-base">
                {formatEGP(report?.summary?.totalLiabilitiesAndEquity || 0)} ج.م
              </span>
            </div>

            {/* Current Liabilities */}
            <div>
              <span className="text-xs font-bold text-muted-foreground block mb-2">الالتزامات المتداولة (Current Liabilities)</span>
              <div className="divide-y divide-border/40 text-xs">
                {currentLiabilityItems.length === 0 ? (
                  <div className="py-2 text-muted-foreground text-xs">لا توجد التزامات مسجلة</div>
                ) : (
                  currentLiabilityItems.map((item: any) => (
                    <div key={item.code || item.id} className="py-2 flex justify-between items-center text-foreground hover:bg-muted/20 px-1 rounded transition">
                      <span>
                        <span className="font-mono text-muted-foreground ml-2">[{item.code || '-'}]</span>
                        {item.name}
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">{formatEGP(item.amount ?? item.balance ?? 0)} ج.م</span>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-2 flex justify-between text-xs font-semibold text-foreground border-t border-border/40 mt-1">
                <span>إجمالي الالتزامات المتداولة</span>
                <span className="font-mono tabular-nums">{formatEGP(report?.liabilities?.current?.total || report?.summary?.totalLiabilities || 0)} ج.م</span>
              </div>
            </div>

            {/* Equity */}
            <div>
              <span className="text-xs font-bold text-muted-foreground block mb-2">حقوق الملكية (Equity)</span>
              <div className="divide-y divide-border/40 text-xs">
                {equityItems.length === 0 ? (
                  <div className="py-2 text-muted-foreground text-xs">لا توجد حسابات حقوق ملكية مسجلة</div>
                ) : (
                  equityItems.map((item: any) => (
                    <div key={item.code || item.id} className="py-2 flex justify-between items-center text-foreground hover:bg-muted/20 px-1 rounded transition">
                      <span>
                        <span className="font-mono text-muted-foreground ml-2">[{item.code || '-'}]</span>
                        {item.name}
                      </span>
                      <span className="font-mono tabular-nums font-semibold">{formatEGP(item.amount ?? item.balance ?? 0)} ج.م</span>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-2 flex justify-between text-xs font-semibold text-foreground border-t border-border/40 mt-1">
                <span>إجمالي حقوق الملكية</span>
                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{formatEGP(report?.equity?.total || report?.summary?.totalEquity || 0)} ج.م</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingBalanceSheetPage;
