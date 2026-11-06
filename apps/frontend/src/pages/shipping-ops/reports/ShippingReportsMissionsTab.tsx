import React, { useState, useMemo } from 'react';
import { Search, Navigation, CheckCircle2, DollarSign, Clock } from 'lucide-react';
import { MissionsReportResponse } from '../../../services/shippingReportsService';
import { formatNumber, formatCurrency } from './shippingReportsHelpers';

interface Props {
  data: MissionsReportResponse | null;
  loading: boolean;
}

export const ShippingReportsMissionsTab: React.FC<Props> = ({ data, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!searchTerm.trim()) return data.rows;
    const q = searchTerm.trim().toLowerCase();
    return data.rows.filter(
      (r) =>
        r.runNumber.toLowerCase().includes(q) ||
        r.courierName.toLowerCase().includes(q)
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
        <Navigation className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="font-medium">لا توجد رحلات توصيل مسجلة في هذه الفترة</p>
      </div>
    );
  }

  const { totals } = data;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[11px] text-slate-500 font-medium">إجمالي الرحلات</span>
          <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
            {formatNumber(totals.totalRuns)} <span className="text-xs font-normal text-slate-400">رحلة</span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            شحنات مسلّمة بالرحلات
          </span>
          <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatNumber(totals.delivered)} / {formatNumber(totals.totalShipments)}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            إجمالي التحصيل الفعلي
          </span>
          <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(totals.collectedAmount)}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            متوسط مدة الرحلة
          </span>
          <div className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
            {Math.round(totals.avgDurationMinutes)} <span className="text-xs font-normal text-slate-400">دقيقة</span>
          </div>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم الرحلة أو المندوب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          عدد الرحلات: <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{filteredRows.length}</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="py-3 px-4">رقم الرحلة</th>
                <th className="py-3 px-4">المندوب</th>
                <th className="py-3 px-4 text-center">الشحنات</th>
                <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">مسلّمة</th>
                <th className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">فاشلة</th>
                <th className="py-3 px-4 text-center">التحصيل (ج.م)</th>
                <th className="py-3 px-4 text-center">المدة</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row) => (
                <tr key={row.runId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {row.runNumber}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{row.courierName}</div>
                    {row.courierPhone && (
                      <div className="text-[11px] text-slate-400 font-mono" dir="ltr">{row.courierPhone}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {formatNumber(row.shipments)}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatNumber(row.delivered)}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                    {formatNumber(row.failed)}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(row.collectedAmount)}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums text-slate-600 dark:text-slate-400">
                    {Math.round(row.durationMinutes)} دقيقة
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 text-[11px] tabular-nums whitespace-nowrap">
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString('ar-EG') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-800">
              <tr>
                <td colSpan={2} className="py-3 px-4 text-slate-800 dark:text-slate-200">
                  الإجمالي العام
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-slate-900 dark:text-slate-100">
                  {formatNumber(totals.totalShipments)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatNumber(totals.delivered)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-rose-600 dark:text-rose-400">
                  {formatNumber(totals.failed)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-slate-900 dark:text-slate-100">
                  {formatCurrency(totals.collectedAmount)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-slate-600 dark:text-slate-400">
                  {Math.round(totals.avgDurationMinutes)} دقيقة
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
