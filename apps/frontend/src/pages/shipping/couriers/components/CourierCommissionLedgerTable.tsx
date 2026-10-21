import React from 'react';
import { type CourierCommissionEntry } from '../../../../services/courierService';
import { type CourierDuesStatusFilter } from '../hooks/useCourierDuesData';

interface CourierCommissionLedgerTableProps {
  entries: CourierCommissionEntry[];
  statusFilter: CourierDuesStatusFilter;
  onStatusFilterChange: (status: CourierDuesStatusFilter) => void;
  formatPrice: (price: number) => string;
  pagination: { total: number; page: number; pages: number } | null;
  page: number;
  onPageChange: (newPage: number) => void;
}

export const CourierCommissionLedgerTable: React.FC<CourierCommissionLedgerTableProps> = ({
  entries,
  statusFilter,
  onStatusFilterChange,
  formatPrice,
  pagination,
  page,
  onPageChange,
}) => {
  const getCommissionTypeLabel = (type: string) => {
    switch (type) {
      case 'PERCENTAGE':
        return 'نسبة مئوية';
      case 'SALARY_ONLY':
        return 'راتب شهري ثابت';
      default:
        return 'عمولة ثابتة / طلب';
    }
  };

  return (
    <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
      <div className="px-4 py-3 bg-muted/30 border-b border-border/70 flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">تفاصيل قيود العمولات</span>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as CourierDuesStatusFilter)}
            className="text-xs h-8 px-2.5 rounded-lg border border-border/70 bg-card text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-medium"
          >
            <option value="DUE">المعلقة فقط (DUE)</option>
            <option value="PAID">المصروفة (PAID)</option>
            <option value="ALL">جميع الحالات (ALL)</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-muted/15 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-4">المندوب</th>
              <th className="py-2.5 px-4">نوع العمولة</th>
              <th className="py-2.5 px-4 font-mono">المبلغ</th>
              <th className="py-2.5 px-4 text-center">الحالة</th>
              <th className="py-2.5 px-4">ملاحظات وقيد الخزينة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 font-medium">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground font-mono">
                  لا توجد قيود مسجلة لهذا الفلتر
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-foreground">{e.courier?.name || '—'}</td>
                  <td className="py-2.5 px-4 text-muted-foreground text-xs">
                    {getCommissionTypeLabel(e.commissionType)}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums font-bold text-foreground">
                    {formatPrice(e.amount)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        e.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {e.status === 'PAID' ? 'مصروفة' : 'مستحقة'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground text-[11px] truncate max-w-xs font-mono">
                    {e.notes || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/70 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">
            صفحة {pagination.page} من {pagination.pages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-md border border-border/70 hover:bg-muted/30 disabled:opacity-40 transition-colors"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => onPageChange(pagination && page < pagination.pages ? page + 1 : page)}
              disabled={!pagination || page >= pagination.pages}
              className="px-2.5 py-1 rounded-md border border-border/70 hover:bg-muted/30 disabled:opacity-40 transition-colors"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
