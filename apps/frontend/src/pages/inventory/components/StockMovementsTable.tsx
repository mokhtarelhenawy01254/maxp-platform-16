import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Calendar,
  Package,
} from 'lucide-react';
import { type StockMovementRecord } from '../../../services/stockMovementsService';

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  IN: {
    label: 'وارد',
    icon: ArrowDownLeft,
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  },
  OUT: {
    label: 'صادر',
    icon: ArrowUpRight,
    className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  },
  ADJUSTMENT: {
    label: 'تعديل وجرد',
    icon: SlidersHorizontal,
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  },
  TRANSFER: {
    label: 'مناقلة فروع',
    icon: ArrowLeftRight,
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  },
  RETURN: {
    label: 'مرتجع',
    icon: RotateCcw,
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  },
};

interface StockMovementsTableProps {
  movements: StockMovementRecord[];
  loading: boolean;
  formatDate: (date: string) => string;
}

export const StockMovementsTable: React.FC<StockMovementsTableProps> = ({
  movements,
  loading,
  formatDate,
}) => {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
            <tr>
              <th className="py-2.5 px-3.5">التاريخ والوقت</th>
              <th className="py-2.5 px-3.5">المنتج والتفاصيل</th>
              <th className="py-2.5 px-3.5 text-center">نوع الحركة</th>
              <th className="py-2.5 px-3.5 text-center">الكمية</th>
              <th className="py-2.5 px-3.5">السبب / المبرر</th>
              <th className="py-2.5 px-3.5">المرجع</th>
              <th className="py-2.5 px-3.5 text-left">ملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7} className="py-4 px-3.5">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </td>
                </tr>
              ))
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-medium">لا توجد حركات مخزون مسجلة</p>
                  <p className="text-[11px] mt-0.5">جرّب تعديل الفلاتر أو تحديد نطاق زمني أوسع</p>
                </td>
              </tr>
            ) : (
              movements.map((movement) => {
                const cfg = TYPE_CONFIG[movement.type] || {
                  label: movement.type,
                  icon: Layers,
                  className: 'bg-muted text-muted-foreground border-border/70',
                };
                const Icon = cfg.icon;
                const qty =
                  movement.type === 'OUT'
                    ? -Math.abs(movement.quantity)
                    : Math.abs(movement.quantity);
                return (
                  <tr key={movement.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground/60" />
                        {formatDate(movement.createdAt)}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-foreground text-sm">
                        {movement.product?.name || 'صنف بدون اسم'}
                      </div>
                      {movement.product?.sku && (
                        <div className="text-[11px] font-mono text-muted-foreground">
                          SKU: {movement.product.sku}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${cfg.className}`}
                      >
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span
                        className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          qty < 0
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        }`}
                      >
                        {qty > 0 ? `+${qty}` : qty}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-muted-foreground">
                      {movement.reason || '—'}
                    </td>

                    <td className="py-2.5 px-3.5 font-mono text-foreground text-xs">
                      {movement.reference ? (
                        <span className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
                          {movement.reference}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td
                      className="py-2.5 px-3.5 text-left text-muted-foreground text-[11px] truncate max-w-[140px]"
                      title={movement.notes}
                    >
                      {movement.notes || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
        <span>
          إجمالي السجلات المعروضة:{' '}
          <strong className="text-foreground font-mono">{movements.length}</strong>
        </span>
        <span className="text-[11px]">
          تسجيل الحركات فوري ومرتبط بمزامنة الفواتير وأوامر الشراء
        </span>
      </div>
    </>
  );
};
