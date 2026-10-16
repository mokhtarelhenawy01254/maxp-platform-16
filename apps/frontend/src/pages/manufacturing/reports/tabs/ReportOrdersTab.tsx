import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { ProductionOrder } from '../../manufacturingApi';

interface ReportOrdersTabProps {
  orders: ProductionOrder[];
  formatEGP: (num: number) => string;
}

export const ReportOrdersTab: React.FC<ReportOrdersTabProps> = ({ orders, formatEGP }) => {
  return (
    <div className="rounded-xl bg-card border border-border/70 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground font-medium">
              <th className="py-3 px-4">رقم الأمر</th>
              <th className="py-3 px-4">المنتج / نمط BOM</th>
              <th className="py-3 px-4">الحالة</th>
              <th className="py-3 px-4">مخطط / منجز / هالك</th>
              <th className="py-3 px-4">تكلفة الخامات</th>
              <th className="py-3 px-4">تكلفة الأجور</th>
              <th className="py-3 px-4">الأعباء MOH</th>
              <th className="py-3 px-4">إجمالي التكلفة</th>
              <th className="py-3 px-4">تكلفة القطعة</th>
              <th className="py-3 px-4 text-center">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-muted-foreground">
                  لا توجد أوامر إنتاج مطابقة لمعايير الفلترة المحددة.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-foreground">{o.orderNumber}</td>
                  <td className="py-3 px-4 font-medium text-foreground">
                    {o.bom?.name || o.bom?.code || 'نمط تشغيل'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                        o.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : o.status === 'IN_PROGRESS'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                          : o.status === 'CANCELLED'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 tabular-nums">
                    <span className="font-semibold text-foreground">{o.plannedQuantity}</span> مخطط /{' '}
                    <span className="text-emerald-600 font-semibold">{o.producedQuantity}</span> منجز /{' '}
                    <span className="text-destructive font-semibold">{o.scrappedQuantity}</span> هالك
                  </td>
                  <td className="py-3 px-4 tabular-nums text-foreground">{formatEGP(o.actualMaterialCost)} ج.م</td>
                  <td className="py-3 px-4 tabular-nums text-foreground">{formatEGP(o.actualLaborCost)} ج.م</td>
                  <td className="py-3 px-4 tabular-nums text-foreground">{formatEGP(o.actualOverheadCost)} ج.م</td>
                  <td className="py-3 px-4 tabular-nums font-bold text-foreground">{formatEGP(o.totalCost)} ج.م</td>
                  <td className="py-3 px-4 tabular-nums font-bold text-emerald-600">{formatEGP(o.unitCost)} ج.م</td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      to={`/manufacturing/orders/${o.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span>التفاصيل</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
