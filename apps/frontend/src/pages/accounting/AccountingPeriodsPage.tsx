import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, FiscalPeriod } from './accountingApi';

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export const AccountingPeriodsPage: React.FC = () => {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const loadPeriods = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountingApi.listPeriods(selectedYear);
      setPeriods(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load periods', err);
      setError(err.response?.data?.message || 'تعذر تحميل الفترات المالية');
      setPeriods([]);
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
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <AccountingHeader
        title="إدارة الفترات المالية والإقفال الشهري والسنوي"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">السنة المالية:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 rounded-lg border border-border/70 bg-card text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadPeriods}
              className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 text-[11px] flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {/* Information Callout */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-start gap-3">
          <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">قواعد الرقابة على الفترات المالية والإقفال المحاسبي:</p>
            <p className="text-muted-foreground leading-relaxed">
              عند إقفال فترة مالية، يُمنع تسجيل أي قيود يدوية أو تعديلات بأثر رجعي في ذلك الشهر. الحركات الآلية الجديدة ستكتمل تشغيلياً دون انقطاع ويتم ترحيل قيودها إلى قائمة الانتظار المعلقة لحين فتح الفترة أو معالجتها محاسبياً.
            </p>
          </div>
        </div>

        {/* 12 Months Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const period = (periods || []).find((p) => p.month === m);
            const isClosed = period?.status === 'CLOSED';

            return (
              <div
                key={m}
                className={`p-4 rounded-xl border transition-all ${
                  isClosed
                    ? 'bg-muted/30 border-border/50 opacity-90'
                    : 'bg-card border-border/70 shadow-xs'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground block">{selectedYear}/{String(m).padStart(2, '0')}</span>
                    <h3 className="font-bold text-sm text-foreground mt-0.5">شهر {MONTH_NAMES[m - 1]}</h3>
                  </div>

                  <span
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isClosed
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {isClosed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>{isClosed ? 'مقفلة' : 'مفتوحة'}</span>
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground text-[11px] font-mono">
                    {isClosed && period?.closedAt
                      ? `أقفلت: ${new Date(period.closedAt).toLocaleDateString('ar-EG')}`
                      : 'تقبل حركات وقيود'}
                  </span>

                  <button
                    onClick={() => handleTogglePeriod(m, isClosed ? 'CLOSED' : 'OPEN')}
                    disabled={loading}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isClosed
                        ? 'bg-muted text-foreground hover:bg-muted/80'
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
