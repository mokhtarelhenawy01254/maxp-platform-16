import React, { useEffect, useState } from 'react';
import {
  CalendarDaysIcon,
  LockClosedIcon,
  LockOpenIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, FiscalPeriod } from './accountingApi';

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export const AccountingPeriodsPage: React.FC = () => {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const data = await accountingApi.listPeriods(selectedYear);
      setPeriods(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, [selectedYear]);

  const handleTogglePeriod = async (month: number, currentStatus: 'OPEN' | 'CLOSED') => {
    const isClosing = currentStatus === 'OPEN';
    const actionText = isClosing ? 'إقفال' : 'إعادة فتح';
    if (!window.confirm(`هل أنت متأكد من ${actionText} الفترة المالية لشهر (${MONTH_NAMES[month - 1]} ${selectedYear})؟`)) {
      return;
    }

    try {
      setLoading(true);
      if (isClosing) {
        await accountingApi.closePeriod(selectedYear, month);
      } else {
        await accountingApi.openPeriod(selectedYear, month);
      }
      await loadPeriods();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      <AccountingHeader
        title="إدارة الفترات المالية والإقفال الشهري والسنوي"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">السنة المالية:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold font-mono"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Information Callout */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
          <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">قواعد الرقابة على الفترات المالية والإقفال المحاسبي:</p>
            <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
              عند إقفال فترة مالية، يُمنع تسجيل أي قيود يدوية أو تعديلات بأثر رجعي في ذلك الشهر. الحركات الآلية الجديدة (فواتير/مصروفات) ستكتمل تشغيلياً دون انقطاع ويتم ترحيل قيودها إلى قائمة الانتظار المعلقة لحين فتح الفترة أو معالجتها محاسبياً.
            </p>
          </div>
        </div>

        {/* 12 Months Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const period = periods.find((p) => p.month === m);
            const isClosed = period?.status === 'CLOSED';

            return (
              <div
                key={m}
                className={`p-4 rounded-2xl border transition-all ${
                  isClosed
                    ? 'bg-slate-100 dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 opacity-90'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs text-slate-400 block">{selectedYear}/{String(m).padStart(2, '0')}</span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">شهر {MONTH_NAMES[m - 1]}</h3>
                  </div>

                  <span
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isClosed
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {isClosed ? <LockClosedIcon className="w-3 h-3" /> : <LockOpenIcon className="w-3 h-3" />}
                    <span>{isClosed ? 'مقفلة' : 'مفتوحة'}</span>
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {isClosed && period?.closedAt
                      ? `أقفلت: ${new Date(period.closedAt).toLocaleDateString('ar-EG')}`
                      : 'تقبل حركات وقيود'}
                  </span>

                  <button
                    onClick={() => handleTogglePeriod(m, isClosed ? 'CLOSED' : 'OPEN')}
                    disabled={loading}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isClosed
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                        : 'bg-rose-600 text-white hover:bg-rose-700'
                    }`}
                  >
                    {isClosed ? 'إعادة فتح' : 'إقفال الفترة'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AccountingPeriodsPage;
