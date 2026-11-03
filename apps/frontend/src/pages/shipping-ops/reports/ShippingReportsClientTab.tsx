import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { ClientReportResponse } from '../../../services/shippingReportsService';
import { formatNumber, formatCurrency } from './shippingReportsHelpers';

interface Props {
  data: ClientReportResponse | null;
  loading: boolean;
}

export const ShippingReportsClientTab: React.FC<Props> = ({ data, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!searchTerm.trim()) return data.rows;
    const q = searchTerm.trim().toLowerCase();
    return data.rows.filter(
      r => r.clientName.toLowerCase().includes(q) || (r.phone && r.phone.includes(q))
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
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        لا توجد بيانات شحنات للعملاء في هذه الفترة
      </div>
    );
  }

  const { totals } = data;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالعميل أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          عدد العملاء: <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{filteredRows.length}</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="py-3 px-4">العميل / التاجر</th>
                <th className="py-3 px-4 text-center">الشحنات</th>
                <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">مسلّمة</th>
                <th className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">مرتجعة</th>
                <th className="py-3 px-4 text-left">COD محصّل</th>
                <th className="py-3 px-4 text-left">رسوم الشحن</th>
                <th className="py-3 px-4 text-left">رسوم المرتجع</th>
                <th className="py-3 px-4 text-left font-bold text-blue-600 dark:text-blue-400">صافي المستحق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row) => (
                <tr key={row.clientId || 'none'} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                    <div>{row.clientName}</div>
                    {row.phone && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal tabular-nums">{row.phone}</div>
                    )}
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
                  <td className="py-2.5 px-4 text-left tabular-nums font-medium text-slate-800 dark:text-slate-200">
                    {formatCurrency(row.codCollected)}
                  </td>
                  <td className="py-2.5 px-4 text-left tabular-nums text-slate-600 dark:text-slate-400">
                    {formatCurrency(row.shippingFees)}
                  </td>
                  <td className="py-2.5 px-4 text-left tabular-nums text-rose-600 dark:text-rose-400">
                    {formatCurrency(row.returnFees)}
                  </td>
                  <td className="py-2.5 px-4 text-left tabular-nums font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(row.net)}
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
                <td className="py-3 px-4 text-left tabular-nums">
                  {formatCurrency(totals.codCollected)}
                </td>
                <td className="py-3 px-4 text-left tabular-nums text-slate-600 dark:text-slate-300">
                  {formatCurrency(totals.shippingFees)}
                </td>
                <td className="py-3 px-4 text-left tabular-nums text-rose-600 dark:text-rose-400">
                  {formatCurrency(totals.returnFees)}
                </td>
                <td className="py-3 px-4 text-left tabular-nums text-blue-600 dark:text-blue-400 font-extrabold">
                  {formatCurrency(totals.net)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
