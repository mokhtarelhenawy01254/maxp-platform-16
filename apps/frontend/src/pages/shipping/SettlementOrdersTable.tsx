import React from 'react';
import {
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Receipt,
  RotateUndo,
} from 'lucide-react';
import { SettlementOrder } from '../../services/shippingSettlementService';

interface SettlementOrdersTableProps {
  orders: SettlementOrder[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
  onUnsettle: (id: string) => void;
  processing: boolean;
  totalPages: number;
  page: number;
  setPage: (p: number) => void;
}

export const SettlementOrdersTable: React.FC<SettlementOrdersTableProps> = ({
  orders,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  formatPrice,
  formatDate,
  onUnsettle,
  processing,
  totalPages,
  page,
  setPage,
}) => {
  const getStatusBadge = (order: SettlementOrder) => {
    if (order.settlementStatus === 'SETTLED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          تمت التسوية
        </span>
      );
    }
    if (!order.delivered) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground border border-border/70">
          غير مسلّم
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" />
        قيد التسوية
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-2xs">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground">
            <tr>
              <th className="px-3 py-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-border/80 text-primary focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-right font-semibold">رقم الطلب / التتبع</th>
              <th className="px-4 py-3 text-right font-semibold">العميل</th>
              <th className="px-4 py-3 text-right font-semibold">شركة الشحن</th>
              <th className="px-4 py-3 text-right font-semibold">تحصيل (COD)</th>
              <th className="px-4 py-3 text-right font-semibold">تكلفة الشحن</th>
              <th className="px-4 py-3 text-right font-semibold">الصافي المستحق</th>
              <th className="px-4 py-3 text-right font-semibold">الحالة</th>
              <th className="px-4 py-3 text-center font-semibold">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {orders.map((order) => {
              const isSelected = selectedIds.includes(order.id);

              return (
                <tr
                  key={order.id}
                  className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(order.id)}
                      className="rounded border-border/80 text-primary focus:ring-0 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-foreground text-xs">{order.orderNumber}</div>
                    {order.trackingNumber && (
                      <div className="font-mono text-[11px] text-muted-foreground mt-0.5" dir="ltr">
                        #{order.trackingNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground text-xs">{order.customerName || 'عميل'}</div>
                    {order.customerPhone && (
                      <div className="font-mono text-[11px] text-muted-foreground mt-0.5" dir="ltr">
                        {order.customerPhone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground text-xs">
                      <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                      {order.shippingCompany}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-foreground">
                    {formatPrice(order.codAmount)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                    {formatPrice(order.shippingFee)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums font-bold text-foreground">
                    {formatPrice(order.netAmount)}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(order)}</td>
                  <td className="px-4 py-3 text-center">
                    {order.settlementStatus === 'SETTLED' && (
                      <button
                        type="button"
                        onClick={() => onUnsettle(order.id)}
                        disabled={processing}
                        className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors text-[11px] font-semibold"
                        title="تراجع عن التسوية"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs">
          <span className="text-muted-foreground font-mono tabular-nums">
            صفحة {page} من {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-foreground disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
