import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckSquare, Square } from 'lucide-react';
import { getStatusBadge, formatCurrency, formatDate } from '../shippingOpsShared';

interface BranchCustodyTableProps {
  shipments: any[];
  loading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
}

export const BranchCustodyTable: React.FC<BranchCustodyTableProps> = ({
  shipments,
  loading,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  page,
  totalPages,
  totalCount,
  onPageChange,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
            <tr>
              <th className="px-4 py-3 w-10 text-center">
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {shipments.length > 0 && selectedIds.length === shipments.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3">الشحنة والباركود</th>
              <th className="px-4 py-3">المستلم والوجهة</th>
              <th className="px-3 py-3 text-center">الحالة</th>
              <th className="px-4 py-3 text-left">مبلغ التحصيل (COD)</th>
              <th className="px-4 py-3">تاريخ الوصول للفرع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {shipments.map((s) => {
              const isSelected = selectedIds.includes(s.id);
              const badge = getStatusBadge(s.status, isEn);
              const isAging =
                s.lastBranchAt &&
                Date.now() - new Date(s.lastBranchAt).getTime() > 48 * 3600 * 1000 &&
                !['DELIVERED', 'CANCELLED'].includes(s.status);

              return (
                <tr
                  key={s.id}
                  className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition cursor-pointer ${
                    isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                  onClick={() => onToggleSelect(s.id)}
                >
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onToggleSelect(s.id)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{s.trackingNumber}</span>
                      {isAging && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-sans font-medium">
                          &gt;48h
                        </span>
                      )}
                    </div>
                    {s.barcode && <div className="text-[11px] text-slate-400">{s.barcode}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {s.recipientName || '—'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {s.destinationGovernorate || ''}{' '}
                      {s.destinationCity ? `• ${s.destinationCity}` : ''}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium border ${badge.badgeClass}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(s.codAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                    {formatDate(s.lastBranchAt || s.createdAt)}
                  </td>
                </tr>
              );
            })}

            {shipments.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  لا توجد شحنات بعهدة هذا الفرع حالياً
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-slate-500">
            إجمالي {totalCount} شحنة • صفحة {page} من {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40"
            >
              السابق
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
