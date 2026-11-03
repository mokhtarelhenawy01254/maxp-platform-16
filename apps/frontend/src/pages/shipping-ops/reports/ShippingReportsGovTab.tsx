import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { GovernorateReportResponse } from '../../../services/shippingReportsService';
import { formatNumber } from './shippingReportsHelpers';

interface Props {
  data: GovernorateReportResponse | null;
  loading: boolean;
}

export const ShippingReportsGovTab: React.FC<Props> = ({ data, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!searchTerm.trim()) return data.rows;
    const q = searchTerm.trim().toLowerCase();
    return data.rows.filter(r => r.governorate.toLowerCase().includes(q));
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
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        لا توجد بيانات شحنات للمحافظات في هذه الفترة
      </div>
    );
  }

  const { totals } = data;

  return (
    <div className="space-y-4">
      {/* Table search filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالمحافظة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          عدد المحافظات: <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{filteredRows.length}</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="py-3 px-4">المحافظة</th>
                <th className="py-3 px-4 text-center">إجمالي الشحنات</th>
                <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">مسلّمة</th>
                <th className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">مرتجعة</th>
                <th className="py-3 px-4 text-center">نسبة النجاح</th>
                <th className="py-3 px-4 text-center">متوسط زمن التسليم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row) => (
                <tr key={row.governorate} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                    {row.governorate}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {formatNumber(row.shipments)}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatNumber(row.delivered)}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                    {formatNumber(row.returned)}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                      row.successRate >= 80
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : row.successRate >= 60
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}>
                      {row.successRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums text-slate-600 dark:text-slate-400">
                    {row.avgDeliveryHours > 0 ? `${row.avgDeliveryHours} ساعة` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Footer */}
            <tfoot className="bg-slate-100/75 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="py-3 px-4">الإجمالي الكلي</td>
                <td className="py-3 px-4 text-center tabular-nums font-extrabold">
                  {formatNumber(totals.totalShipments)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatNumber(totals.delivered)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-rose-600 dark:text-rose-400">
                  {formatNumber(totals.returned)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums">
                  {totals.successRate}%
                </td>
                <td className="py-3 px-4 text-center tabular-nums">
                  {totals.avgDeliveryHours > 0 ? `${totals.avgDeliveryHours} ساعة` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
