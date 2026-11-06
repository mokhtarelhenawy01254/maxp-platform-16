import React, { useState, useMemo } from 'react';
import { Search, MapPin, CheckCircle, RotateCcw, Clock } from 'lucide-react';
import { GeoReportResponse } from '../../../services/shippingReportsService';
import { formatNumber } from './shippingReportsHelpers';

interface Props {
  data: GeoReportResponse | null;
  loading: boolean;
}

export const ShippingReportsGeoTab: React.FC<Props> = ({ data, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!searchTerm.trim()) return data.rows;
    const q = searchTerm.trim().toLowerCase();
    return data.rows.filter(
      (r) =>
        r.governorate.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q)
    );
  }, [data?.rows, searchTerm]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="font-medium">لا توجد بيانات تحليل جغرافي في هذه الفترة</p>
      </div>
    );
  }

  const { totals } = data;
  const overallSuccessRate = totals.shipments > 0 ? Math.round((totals.delivered / totals.shipments) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[11px] text-slate-500 font-medium">إجمالي الشحنات</span>
          <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
            {formatNumber(totals.shipments)}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            شحنات مسلّمة ({overallSuccessRate}%)
          </span>
          <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatNumber(totals.delivered)}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            مرتجعات (RTO)
          </span>
          <div className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
            {formatNumber(totals.rto)}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            متوسط زمن التوصيل
          </span>
          <div className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
            {totals.avgDays.toFixed(1)} <span className="text-xs font-normal text-slate-400">يوم</span>
          </div>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالمحافظة أو المدينة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          عدد المناطق: <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{filteredRows.length}</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="py-3 px-4">المحافظة</th>
                <th className="py-3 px-4">المدينة / المركز</th>
                <th className="py-3 px-4 text-center">إجمالي الشحنات</th>
                <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">مسلّمة</th>
                <th className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">مرتجعة (RTO)</th>
                <th className="py-3 px-4 text-center">نسبة التسليم</th>
                <th className="py-3 px-4 text-center">متوسط الأيام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row, idx) => {
                const rowRate = row.shipments > 0 ? Math.round((row.delivered / row.shipments) * 100) : 0;
                return (
                  <tr key={`${row.governorate}-${row.city}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {row.governorate}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                      {row.city}
                    </td>
                    <td className="py-2.5 px-4 text-center tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatNumber(row.shipments)}
                    </td>
                    <td className="py-2.5 px-4 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatNumber(row.delivered)}
                    </td>
                    <td className="py-2.5 px-4 text-center tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                      {formatNumber(row.rto)}
                    </td>
                    <td className="py-2.5 px-4 text-center tabular-nums">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        rowRate >= 80
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : rowRate >= 60
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}>
                        {rowRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center tabular-nums text-slate-600 dark:text-slate-400">
                      {row.avgDays.toFixed(1)} يوم
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-800">
              <tr>
                <td colSpan={2} className="py-3 px-4 text-slate-800 dark:text-slate-200">
                  الإجمالي العام
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-slate-900 dark:text-slate-100">
                  {formatNumber(totals.shipments)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatNumber(totals.delivered)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-rose-600 dark:text-rose-400">
                  {formatNumber(totals.rto)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums">
                  {overallSuccessRate}%
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-slate-700 dark:text-slate-300">
                  {totals.avgDays.toFixed(1)} يوم
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
