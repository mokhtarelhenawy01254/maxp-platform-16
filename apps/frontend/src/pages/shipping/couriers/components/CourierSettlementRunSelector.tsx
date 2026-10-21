import React from 'react';
import { RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { type DeliveryRun } from '../../../../services/courierService';
import { type CourierRunStatusFilter } from '../hooks/useCourierSettlementController';

interface CourierSettlementRunSelectorProps {
  runs: DeliveryRun[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
  runStatusFilter: CourierRunStatusFilter;
  onRunStatusFilterChange: (filter: CourierRunStatusFilter) => void;
  loading: boolean;
  onRefresh: () => void;
  pagination: { total: number; page: number; pages: number } | null;
  page: number;
  onPageChange: (newPage: number) => void;
  formatPrice: (price: number) => string;
}

export const CourierSettlementRunSelector: React.FC<CourierSettlementRunSelectorProps> = ({
  runs,
  selectedRunId,
  onSelectRunId,
  runStatusFilter,
  onRunStatusFilterChange,
  loading,
  onRefresh,
  pagination,
  page,
  onPageChange,
  formatPrice,
}) => {
  return (
    <div className="bg-card border border-border/70 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <h3 className="font-semibold text-xs sm:text-sm text-foreground">
          ورديات التوصيل الجاهزة للتوريد
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-muted-foreground hover:text-foreground transition p-1 rounded-md"
          title="تحديث"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <select
        value={runStatusFilter}
        onChange={(e) => onRunStatusFilterChange(e.target.value as CourierRunStatusFilter)}
        className="w-full px-3 py-2 text-xs bg-background border border-border/70 rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
      >
        <option value="UNSETTLED">بانتظار التوريد (غير مسوّاة)</option>
        <option value="SETTLED">تم توريدها</option>
        <option value="ALL">كل الورديات</option>
      </select>

      <div className="space-y-2 max-h-[550px] overflow-y-auto">
        {runs.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            لا توجد ورديات مسجلة
          </div>
        ) : (
          runs.map((r) => {
            const isSelected = r.id === selectedRunId;
            const isSettled = r.status === 'SETTLED';
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRunId(r.id)}
                className={`w-full text-right p-3 rounded-lg border text-xs transition flex flex-col gap-1.5 ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-2xs'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-foreground">{r.runNumber}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isSettled
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {isSettled ? 'تم التوريد' : 'بانتظار التوريد'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>المندوب: {r.courier?.name || 'غير محدد'}</span>
                  <span className="tabular-nums font-mono font-semibold text-foreground">
                    {formatPrice(r.totalCODExpected || 0)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
          <span className="tabular-nums font-mono">
            {pagination.total} وردية - صفحة {pagination.page} من {pagination.pages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="p-1 rounded-md border border-border/70 hover:bg-muted/50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(pagination && page < pagination.pages ? page + 1 : page)}
              disabled={!pagination || page >= pagination.pages || loading}
              className="p-1 rounded-md border border-border/70 hover:bg-muted/50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
