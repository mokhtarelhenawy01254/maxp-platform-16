import React, { useEffect, useState } from 'react';
import {
  ReceiptPercentIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      <AccountingHeader
        title="تقرير وإقرار ضريبة القيمة المضافة (VAT Report)"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 shadow-sm transition-all"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>طباعة الإقرار الضريبي</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
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
              <span>الفترة من:</span>
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

          <div className="text-xs font-bold text-slate-500">
            السعر العام للضريبة: {report?.taxRate || 14}%
          </div>
        </div>

        {/* VAT Report Summary Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium block">
                ضريبة القيمة المضافة المحصلة على المبيعات (مخرجات)
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-2">
                {formatEGP(report?.outputVatCollected || 0)} <span className="text-xs font-normal">ج.م</span>
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">رصيد حساب مصلحة الضرائب دائن (210202)</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium block">
                ضريبة القيمة المضافة المسددة على المشتريات (مدخلات قابلة للخصم)
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-2">
                {formatEGP(report?.inputVatPaid || 0)} <span className="text-xs font-normal">ج.م</span>
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">رصيد حساب مصلحة الضرائب مدين (110502)</span>
            </div>
          </div>

          {/* Net Settlement Bar */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">إجمالي ضريبة المبيعات المستحقة</span>
              <span className="font-mono tabular-nums font-semibold">{formatEGP(report?.outputVatCollected || 0)} ج.م</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
              <span>يخصم: ضريبة المدخلات على المشتريات</span>
              <span className="font-mono tabular-nums font-semibold">({formatEGP(report?.inputVatPaid || 0)}) ج.م</span>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold text-base">
              <span>
                {report && report.netVatPayable >= 0
                  ? 'صافي الضريبة واجبة السداد لمصلحة الضرائب (Net Payable)'
                  : 'صافي رصيد ضريبي دائن / مسترد للشركة (Credit/Refundable)'}
              </span>
              <span
                className={`font-mono tabular-nums text-xl ${
                  report && report.netVatPayable >= 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatEGP(Math.abs(report?.netVatPayable || 0))} ج.م
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed">
            * يتم احتساب إقرار ضريبة القيمة المضافة طبقاً للقيود المرحلة فعلياً في دفتر الأستاذ العام لحسابات الضرائب المتوافقة مع قانون الضريبة على القيمة المضافة المصري رقم 67 لسنة 2016 ولائحته التنفيذية.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingVatReportPage;
