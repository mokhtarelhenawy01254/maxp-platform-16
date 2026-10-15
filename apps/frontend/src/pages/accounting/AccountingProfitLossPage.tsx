import React, { useEffect, useState } from 'react';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  Printer,
  RotateCw,
  Calendar,
} from 'lucide-react';
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

  const revenuesList = report?.revenues?.items || (Array.isArray(report?.revenues) ? report.revenues : []);
  const cogsList = report?.cogs?.items || (Array.isArray(report?.cogs) ? report.cogs : []);
  const opexList = report?.operatingExpenses?.items || (Array.isArray(report?.expenses) ? report.expenses : []);
  const otherRevenuesList = report?.otherRevenues?.items || [];

  const totalRev = report?.revenues?.total ?? report?.summary?.totalRevenue ?? 0;
  const totalCogs = report?.cogs?.total ?? report?.summary?.totalCogs ?? 0;
  const grossProfit = report?.grossProfit ?? report?.summary?.grossProfit ?? (totalRev - totalCogs);
  const totalOpex = report?.operatingExpenses?.total ?? report?.summary?.totalExpenses ?? 0;
  const operatingProfit = report?.operatingProfit ?? (grossProfit - totalOpex);
  const netProfit = report?.netProfit ?? report?.summary?.netIncome ?? operatingProfit;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <AccountingHeader
        title="قائمة الدخل والأرباح والخسائر (Income Statement)"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border/70 text-foreground hover:bg-muted/50 shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة التقرير</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
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
              <span className="text-muted-foreground font-medium">من:</span>
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

          <div className="text-xs text-muted-foreground font-medium font-mono">
            العملة: الجنيه المصري (EGP)
          </div>
        </div>

        {/* P&L Statement Chassis */}
        <div className="rounded-xl bg-card border border-border/70 shadow-xs overflow-hidden p-6 space-y-6">
          {/* 1. Revenues */}
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-border/60 text-sm font-bold text-foreground">
              <span>إيرادات النشاط التشغيلي الرئيسي (Revenues)</span>
              <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatEGP(totalRev)} ج.م
              </span>
            </div>
            <div className="divide-y divide-border/40 text-xs">
              {revenuesList.length === 0 ? (
                <div className="py-2 text-muted-foreground">لا توجد إيرادات مسجلة في هذه الفترة</div>
              ) : (
                revenuesList.map((item: any) => (
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
          </div>

          {/* 2. COGS */}
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-border/60 text-sm font-bold text-foreground">
              <span>تكلفة النشاط والمبيعات (COGS)</span>
              <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                ({formatEGP(totalCogs)}) ج.م
              </span>
            </div>
            <div className="divide-y divide-border/40 text-xs">
              {cogsList.length === 0 ? (
                <div className="py-2 text-muted-foreground">لا توجد تكاليف مسجلة في هذه الفترة</div>
              ) : (
                cogsList.map((item: any) => (
                  <div key={item.code || item.id} className="py-2 flex justify-between items-center text-foreground hover:bg-muted/20 px-1 rounded transition">
                    <span>
                      <span className="font-mono text-muted-foreground ml-2">[{item.code || '-'}]</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">({formatEGP(item.amount ?? item.balance ?? 0)}) ج.م</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Gross Profit Callout */}
          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/50 flex justify-between items-center font-bold text-sm">
            <span className="text-foreground">مجمل الربح (Gross Profit)</span>
            <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 text-base">
              {formatEGP(grossProfit)} ج.م
            </span>
          </div>

          {/* 3. Operating Expenses */}
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-border/60 text-sm font-bold text-foreground">
              <span>المصروفات التشغيلية والبيعية والإدارية (OPEX)</span>
              <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                ({formatEGP(totalOpex)}) ج.م
              </span>
            </div>
            <div className="divide-y divide-border/40 text-xs">
              {opexList.length === 0 ? (
                <div className="py-2 text-muted-foreground">لا توجد مصروفات تشغيلية مسجلة</div>
              ) : (
                opexList.map((item: any) => (
                  <div key={item.code || item.id} className="py-2 flex justify-between items-center text-foreground hover:bg-muted/20 px-1 rounded transition">
                    <span>
                      <span className="font-mono text-muted-foreground ml-2">[{item.code || '-'}]</span>
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">({formatEGP(item.amount ?? item.balance ?? 0)}) ج.م</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operating Profit Callout */}
          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/50 flex justify-between items-center font-bold text-sm">
            <span className="text-foreground">الربح التشغيلي (Operating Profit / EBIT)</span>
            <span className="font-mono tabular-nums text-foreground text-base">
              {formatEGP(operatingProfit)} ج.م
            </span>
          </div>

          {/* 4. Other Revenues */}
          {(report?.otherRevenues?.total || 0) > 0 && (
            <div>
              <div className="flex justify-between items-center pb-2 border-b border-border/60 text-sm font-bold text-foreground">
                <span>إيرادات أخرى وتمويلية</span>
                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatEGP(report?.otherRevenues?.total || 0)} ج.م
                </span>
              </div>
            </div>
          )}

          {/* Net Profit / Loss Highlight */}
          <div
            className={`p-5 rounded-xl border flex justify-between items-center ${
              netProfit >= 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
            }`}
          >
            <div>
              <span className="text-base font-bold block">
                {netProfit >= 0 ? 'صافي أرباح الفترة (Net Profit)' : 'صافي خسائر الفترة (Net Loss)'}
              </span>
              <span className="text-xs opacity-80 mt-0.5 block">
                {netProfit >= 0 ? 'ربح مالي حقيقي قابل للترحيل للأرباح المبقاة' : 'عجز في نتائج الأعمال'}
              </span>
            </div>
            <div className="text-2xl font-black font-mono tabular-nums">
              {formatEGP(netProfit)} <span className="text-sm font-normal font-sans">ج.م</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingProfitLossPage;
