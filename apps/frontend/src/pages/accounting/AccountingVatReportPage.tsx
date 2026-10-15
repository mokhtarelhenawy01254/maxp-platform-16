import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Printer,
  RotateCw,
  Calendar,
} from 'lucide-react';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, VatReport } from './accountingApi';

export const AccountingVatReportPage: React.FC = () => {
  const [report, setReport] = useState<VatReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountingApi.getVatReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setReport(data);
    } catch (err: any) {
      console.error('Failed to load VAT report', err);
      setError(err.response?.data?.message || 'تعذر تحميل إقرار ضريبة القيمة المضافة');
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

  const outputVat = report?.outputVatCollected ?? (report as any)?.summary?.outputVat ?? 0;
  const inputVat = report?.inputVatPaid ?? (report as any)?.summary?.inputVat ?? 0;
  const netVatPayable = report?.netVatPayable ?? (report as any)?.summary?.netVatPayable ?? (outputVat - inputVat);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <AccountingHeader
        title="تقرير وإقرار ضريبة القيمة المضافة (VAT Report)"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border/70 text-foreground hover:bg-muted/50 shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة الإقرار الضريبي</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
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
                <span>الفترة من:</span>
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

          <div className="text-xs font-bold font-mono text-muted-foreground">
            السعر العام للضريبة: {report?.taxRate || 14}%
          </div>
        </div>

        {/* VAT Report Summary Card */}
        <div className="rounded-xl bg-card border border-border/70 shadow-xs p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-xs text-muted-foreground font-medium block">
                ضريبة القيمة المضافة المحصلة على المبيعات (مخرجات)
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-2">
                {formatEGP(outputVat)} <span className="text-xs font-normal text-muted-foreground font-sans">ج.م</span>
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block font-mono">رصيد حساب مصلحة الضرائب دائن (210202)</span>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-xs text-muted-foreground font-medium block">
                ضريبة القيمة المضافة المسددة على المشتريات (مدخلات قابلة للخصم)
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-2">
                {formatEGP(inputVat)} <span className="text-xs font-normal text-muted-foreground font-sans">ج.م</span>
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block font-mono">رصيد حساب مصلحة الضرائب مدين (110502)</span>
            </div>
          </div>

          {/* Net Settlement Bar */}
          <div className="p-5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">إجمالي ضريبة المبيعات المستحقة</span>
              <span className="font-mono tabular-nums font-semibold text-foreground">{formatEGP(outputVat)} ج.م</span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>يخصم: ضريبة المدخلات على المشتريات</span>
              <span className="font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">({formatEGP(inputVat)}) ج.م</span>
            </div>
            <div className="pt-3 border-t border-border/60 flex justify-between items-center font-bold text-base">
              <span className="text-foreground">
                {netVatPayable >= 0
                  ? 'صافي الضريبة واجبة السداد لمصلحة الضرائب (Net Payable)'
                  : 'صافي رصيد ضريبي دائن / مسترد للشركة (Credit/Refundable)'}
              </span>
              <span
                className={`font-mono tabular-nums text-xl ${
                  netVatPayable >= 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatEGP(Math.abs(netVatPayable))} ج.م
              </span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground leading-relaxed">
            * يتم احتساب إقرار ضريبة القيمة المضافة طبقاً للقيود المرحلة فعلياً في دفتر الأستاذ العام لحسابات الضرائب المتوافقة مع قانون الضريبة على القيمة المضافة المصري رقم 67 لسنة 2016 ولائحته التنفيذية.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingVatReportPage;
