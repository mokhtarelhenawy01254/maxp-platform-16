import React from 'react';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EyeIcon,
  ClipboardDocumentIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { DeliveryRun } from '../../../../services/courierService';
import { STATUS_CONFIG } from '../constants/deliveryRunsConstants';

interface DeliveryRunsTableProps {
  runs: DeliveryRun[];
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pagination: { total: number; page: number; pages: number } | null;
  fetchRuns: () => void;
  handleCopyMobileLink: (run: DeliveryRun) => void;
  handleShareWhatsApp: (run: DeliveryRun) => void;
  handleOpenDetail: (runId: string) => void;
  formatDate: (date: any) => string;
  formatPrice: (price: number) => string;
}

export const DeliveryRunsTable: React.FC<DeliveryRunsTableProps> = ({
  runs,
  loading,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  page,
  setPage,
  pagination,
  fetchRuns,
  handleCopyMobileLink,
  handleShareWhatsApp,
  handleOpenDetail,
  formatDate,
  formatPrice
}) => {
  return (
    <div className="space-y-4">
      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم المأمورية أو اسم المندوب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
          >
            <option value="ALL">كل الحالات</option>
            <option value="UNSETTLED">غير مسوّاة (بانتظار التوريد)</option>
            <option value="DISPATCHED">في الميدان</option>
            <option value="COMPLETED">اكتمل التوصيل</option>
            <option value="SETTLED">تمت التسوية والتوريد</option>
          </select>
          <button
            onClick={fetchRuns}
            title="تحديث"
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Runs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">رقم المأمورية</th>
                <th className="py-3 px-4 font-medium">المندوب</th>
                <th className="py-3 px-4 font-medium">تاريخ الخروج</th>
                <th className="py-3 px-4 font-medium">عدد الطرود</th>
                <th className="py-3 px-4 font-medium">المبلغ المطلوب (COD)</th>
                <th className="py-3 px-4 font-medium">المبلغ المورد</th>
                <th className="py-3 px-4 font-medium">الحالة</th>
                <th className="py-3 px-4 font-medium text-left">إجراءات المأمورية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    لا توجد رحلات توصيل مسجلة حالياً
                  </td>
                </tr>
              ) : (
                runs.map((r) => {
                  const statusConf = STATUS_CONFIG[r.status] || STATUS_CONFIG.DISPATCHED;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {r.runNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{r.courier?.name}</div>
                        <div className="text-xs text-slate-400 font-mono" dir="ltr">{r.courier?.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(r.dispatchDate)}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        <span className="font-semibold font-mono">{r.totalShipments}</span> طرد
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-medium font-mono text-slate-900 dark:text-slate-100">
                        {formatPrice(r.totalCODExpected)}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-medium font-mono">
                        {r.status === 'SETTLED' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{formatPrice(r.totalCODCollected)}</span>
                        ) : (
                          <span className="text-slate-400">بانتظار التوريد</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyMobileLink(r)}
                            title="نسخ رابط المندوب للموبايل"
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <ClipboardDocumentIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(r)}
                            title="إرسال الرابط عبر واتساب للمندوب"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                          >
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDetail(r.id)}
                            title="عرض تفاصيل المانيفست وطباعة البوالص"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <span className="tabular-nums font-mono">
              {pagination.total} مأمورية — صفحة {pagination.page} من {pagination.pages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              >
                السابق
              </button>
              <button
                onClick={() => setPage((p) => (pagination && p < pagination.pages ? p + 1 : p))}
                disabled={!pagination || page >= pagination.pages || loading}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
