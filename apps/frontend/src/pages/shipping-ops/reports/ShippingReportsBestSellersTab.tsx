import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag, Package, DollarSign, Layers } from 'lucide-react';
import { BestSellersReportResponse } from '../../../services/shippingReportsService';
import { formatNumber, formatCurrency } from './shippingReportsHelpers';

interface Props {
  data: BestSellersReportResponse | null;
  loading: boolean;
}

export const ShippingReportsBestSellersTab: React.FC<Props> = ({ data, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!searchTerm.trim()) return data.rows;
    const q = searchTerm.trim().toLowerCase();
    return data.rows.filter((r) => r.productName.toLowerCase().includes(q));
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
        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="font-medium">لا توجد بيانات للأصناف والمنتجات الأكثر طلباً في هذه الفترة</p>
        <p className="text-xs text-slate-400 mt-1">تأكد من إدراج بنود الأصناف في تفاصيل الشحنات والأوردرات</p>
      </div>
    );
  }

  const { totals } = data;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">إجمالي القطع المطلوبة</span>
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {formatNumber(totals.totalQuantity)} <span className="text-xs font-normal text-slate-400">قطعة</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">إجمالي قيمة المبيعات للبنود</span>
            <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(totals.totalValue)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">عدد الأوردرات المتضمنة</span>
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {formatNumber(totals.totalOrders)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث باسم المنتج..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          عدد الأصناف: <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{filteredRows.length}</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">اسم المنتج / الصنف</th>
                <th className="py-3 px-4 text-center">الكمية المباعة</th>
                <th className="py-3 px-4 text-center">إجمالي القيمة</th>
                <th className="py-3 px-4 text-center">عدد الأوردرات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row, idx) => (
                <tr key={`${row.productName}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-center tabular-nums font-bold text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                    {row.productName}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums font-bold text-blue-600 dark:text-blue-400">
                    {formatNumber(row.quantity)}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.totalValue)}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums text-slate-600 dark:text-slate-400">
                    {formatNumber(row.ordersCount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-800">
              <tr>
                <td colSpan={2} className="py-3 px-4 text-slate-800 dark:text-slate-200">
                  الإجمالي العام
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-blue-600 dark:text-blue-400">
                  {formatNumber(totals.totalQuantity)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totals.totalValue)}
                </td>
                <td className="py-3 px-4 text-center tabular-nums text-slate-900 dark:text-slate-100">
                  {formatNumber(totals.totalOrders)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
