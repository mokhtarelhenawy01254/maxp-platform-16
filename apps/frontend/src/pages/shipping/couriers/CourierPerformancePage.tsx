import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  BarChart3,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Banknotes,
  ArrowRight,
  ArrowLeft,
  Truck,
  TrendingUp,
} from 'lucide-react';
import courierService, { CourierPerformanceRow } from '../../../services/courierService';
import { useCurrency } from '../../../hooks/useCurrency';
import i18n from '../../../i18n';

/**
 * تقرير أداء المناديب الزمني — تسليمات/مرتجعات/كاش محصّل لكل مندوب داخل نطاق تاريخ.
 * نافذة الحركة = آخر تحويل حالة للشحنة (updatedAt).
 */
const CourierPerformancePage: React.FC = () => {
  const { formatPrice } = useCurrency();

  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

  const [from, setFrom] = useState(toDateInput(monthAgo));
  const [to, setTo] = useState(toDateInput(today));
  const [rows, setRows] = useState<CourierPerformanceRow[]>([]);
  const [totals, setTotals] = useState<{ delivered: number; returned: number; collectedCash: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await courierService.getPerformance({
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
      });
      if (res.success) {
        setRows(res.data.rows || []);
        setTotals(res.data.totals || null);
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل تقرير الأداء');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const totalRuns = (totals?.delivered || 0) + (totals?.returned || 0);
  const overallSuccessRate = totalRuns > 0 ? (((totals?.delivered || 0) / totalRuns) * 100).toFixed(1) : null;

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <Link
              to="/shipping/couriers"
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              title="العودة لإدارة المناديب"
            >
              {i18n.dir() === 'rtl' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">تقرير أداء مناديب التوصيل</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  COURIER FLEET KPI
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                معدلات التسليم ونسب المرتجعات والكاش المحصّل لكل مندوب في النطاق الزمني
              </p>
            </div>
          </div>

          {/* Date Filter & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-card border border-border/70 rounded-lg px-2 py-1 gap-2 text-xs">
              <Calendar size={14} className="text-muted-foreground" />
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none font-mono text-xs"
              />
              <span className="text-muted-foreground text-[11px]">إلى</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none font-mono text-xs"
              />
            </div>

            <button
              onClick={load}
              disabled={loading}
              className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-xs"
            >
              <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* Telemetry KPI Ribbon */}
        {totals && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>تسليمات الفترة</span>
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {totals.delivered}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">شحنات تم تسليمها بنجاح</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <XCircle size={13} className="text-rose-500" />
                <span>مرتجعات الفترة</span>
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
                {totals.returned}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">شحنات مرتدة أو ملغاة</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={13} className="text-primary" />
                <span>إجمالي الكاش المحصّل</span>
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {formatPrice(totals.collectedCash)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">مبالغ التوريد المستلمة نقداً</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 size={13} className="text-sky-500" />
                <span>نسبة نجاح الأسطول</span>
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
                {overallSuccessRate ? `${overallSuccessRate}%` : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">متوسط معدل الإنجاز العام</div>
            </div>
          </div>
        )}

        {/* Courier Performance Matrix */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-muted/30 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck size={15} className="text-primary" />
              <span className="text-xs font-bold text-foreground">بيانات الأداء التفصيلية لكل مندوب</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {rows.length} مندوب مسجل
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/15 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">المندوب</th>
                  <th className="py-2.5 px-4 text-center">التسليمات</th>
                  <th className="py-2.5 px-4 text-center">المرتجعات</th>
                  <th className="py-2.5 px-4 text-center">قيد الميدان</th>
                  <th className="py-2.5 px-4 text-left">كاش محصّل</th>
                  <th className="py-2.5 px-4 text-center">نسبة النجاح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      لا توجد شحنات أو حركة مسجلة في هذا النطاق الزمني
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.courierId}
                      className={`hover:bg-muted/10 transition-colors ${!r.isActive ? 'opacity-60' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground text-xs">{r.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground" dir="ltr">
                          {r.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        {r.deliveredCount}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                        {r.returnedCount}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-muted-foreground">
                        {r.openCount}
                      </td>
                      <td className="py-3 px-4 text-left font-mono tabular-nums font-bold text-foreground">
                        {formatPrice(r.collectedCash)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {r.successRate === null ? (
                          <span className="text-muted-foreground font-mono text-xs">—</span>
                        ) : (
                          <span
                            className={`inline-block font-mono tabular-nums font-bold text-xs px-2 py-0.5 rounded-full border ${
                              r.successRate >= 80
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : r.successRate >= 60
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {r.successRate}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CourierPerformancePage;
