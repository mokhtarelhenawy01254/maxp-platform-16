import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { PurchaseOrderReportRow } from './reportTypes';

interface OrdersReportTabProps {
  orders: PurchaseOrderReportRow[];
  summary: { totalOrders: number; totalAmount: number; byStatus?: Record<string, { count: number; amount: number }> } | null;
  loading: boolean;
}

const statusMap: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'مسودة', className: 'bg-muted text-muted-foreground' },
  ORDERED: { label: 'تم الطلب', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  PARTIALLY_RECEIVED: { label: 'مستلم جزئياً', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  RECEIVED: { label: 'مستلم بالكامل', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  CANCELLED: { label: 'ملغي', className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

export const OrdersReportTab: React.FC<OrdersReportTabProps> = ({ orders, summary, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return <div className="h-64 bg-muted/40 animate-pulse rounded-xl" />;
  }

  const totalAmount = summary?.totalAmount ?? orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const totalCount = summary?.totalOrders ?? orders.length;

  return (
    <div className="space-y-4">
      {summary?.byStatus && Object.keys(summary.byStatus).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(summary.byStatus).map(([st, val]) => {
            const cfg = statusMap[st] || { label: st, className: 'bg-muted text-muted-foreground' };
            return (
              <div
                key={st}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-card text-xs"
              >
                <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                <span className="font-bold tabular-nums">{val.count}</span>
                <span className="text-muted-foreground">({(Number(val.amount) || 0).toLocaleString()} ج.م)</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-right font-semibold">رقم الأمر</TableHead>
                <TableHead className="text-right font-semibold">المورد</TableHead>
                <TableHead className="text-right font-semibold">تاريخ الطلب</TableHead>
                <TableHead className="text-right font-semibold">تاريخ التسليم</TableHead>
                <TableHead className="text-center font-semibold">الأصناف</TableHead>
                <TableHead className="text-left font-semibold">الإجمالي</TableHead>
                <TableHead className="text-center font-semibold">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد أوامر شراء مطابقة للفترة المحددة
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const cfg = statusMap[order.status] || { label: order.status, className: 'bg-muted text-muted-foreground' };
                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => navigate(`/procurement/purchase-orders/${order.id}`)}
                    >
                      <TableCell className="font-mono text-xs font-medium text-primary">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.supplier?.name || '—'}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString('ar-EG') : '—'}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">
                        {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('ar-EG') : '—'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-xs">
                        {order.purchaseOrderItems?.length || 0}
                      </TableCell>
                      <TableCell className="text-left tabular-nums font-semibold">
                        {(Number(order.totalAmount) || 0).toLocaleString()} ج.م
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {orders.length > 0 && (
              <TableFooter className="bg-muted/30 border-t border-border/60">
                <TableRow className="font-bold text-xs">
                  <TableCell colSpan={5} className="text-right">
                    الإجمالي العام ({totalCount} أمر شراء):
                  </TableCell>
                  <TableCell className="text-left font-bold tabular-nums">
                    {totalAmount.toLocaleString()} ج.م
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
};
