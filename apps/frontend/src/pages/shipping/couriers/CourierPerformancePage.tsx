import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import courierService, { CourierPerformanceRow } from '../../../services/courierService';
import { useCurrency } from '../../../hooks/useCurrency';

/**
 * تقرير أداء المناديب الزمني — تسليمات/مرتجعات/كاش محصّل لكل منديب داخل نطاق تاريخ.
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
        to: to ? `${to}T23:59:59.999Z` : undefined
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

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/shipping/couriers" className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              المناديب ←
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">تقرير أداء المناديب</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            التسليمات والمرتجعات والكاش المحصّل لكل منديب داخل نطاق التاريخ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
          />
          <span className="text-xs text-slate-400">إلى</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
          />
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400">تسليمات الفترة</div>
            <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{totals.delivered}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400">مرتجعات الفترة</div>
            <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">{totals.returned}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400">كاش محصّل</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">{formatPrice(totals.collectedCash)}</div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold">
          <ChartBarIcon className="w-4 h-4 text-slate-400" />
          الأداء لكل منديب
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">المندوب</th>
                <th className="py-3 px-4 font-medium">تسليمات</th>
                <th className="py-3 px-4 font-medium">مرتجعات</th>
                <th className="py-3 px-4 font-medium">قيد الميدان</th>
                <th className="py-3 px-4 font-medium">كاش محصّل</th>
                <th className="py-3 px-4 font-medium">نسبة النجاح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">لا حركة في هذه الفترة</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.courierId} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${!r.isActive ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[11px] text-slate-400" dir="ltr">{r.phone}</div>
                    </td>
                    <td className="py-3 px-4 tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{r.deliveredCount}</td>
                    <td className="py-3 px-4 tabular-nums font-semibold text-rose-600 dark:text-rose-400">{r.returnedCount}</td>
                    <td className="py-3 px-4 tabular-nums text-slate-500">{r.openCount}</td>
                    <td className="py-3 px-4 tabular-nums font-medium">{formatPrice(r.collectedCash)}</td>
                    <td className="py-3 px-4 tabular-nums">
                      {r.successRate === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={`font-semibold ${r.successRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
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
  );
};

export default CourierPerformancePage;
