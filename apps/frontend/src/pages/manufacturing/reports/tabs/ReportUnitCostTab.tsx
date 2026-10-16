import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { ProductionOrder } from '../../manufacturingApi';

interface ReportUnitCostTabProps {
  orders: ProductionOrder[];
  formatEGP: (num: number) => string;
}

export const ReportUnitCostTab: React.FC<ReportUnitCostTabProps> = ({ orders, formatEGP }) => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-foreground">تطور تكلفة القطعة الفعلية مقارنة بالتكلفة القياسية</h4>
          <p className="text-[11px] text-muted-foreground">
            مقارنة تكلفة الوحدة لكل أمر تشغيل لتقييم كفاءة الورشة وهدر الخامات
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((o) => {
          const stdUnitCost = (o.bom?.laborCostPerUnit || 0) + (o.bom?.overheadCostPerUnit || 0) + 120;
          const diff = (o.unitCost || 0) - stdUnitCost;
          const isHigher = diff > 0;

          return (
            <div key={o.id} className="p-4 rounded-xl bg-card border border-border/70 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div>
                  <span className="font-mono font-bold text-xs text-foreground">{o.orderNumber}</span>
                  <div className="text-[11px] text-muted-foreground">{o.bom?.name || o.bom?.code}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground">
                  {o.producedQuantity} قطعة
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-muted-foreground">التكلفة الفعلية للقطعة</div>
                  <div className="text-lg font-bold text-foreground tabular-nums">
                    {formatEGP(o.unitCost)} <span className="text-xs font-normal text-muted-foreground">ج.م</span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-muted-foreground">الانحراف التقديري</div>
                  <div
                    className={`text-xs font-bold tabular-nums flex items-center gap-1 ${
                      isHigher ? 'text-destructive' : 'text-emerald-600'
                    }`}
                  >
                    {isHigher ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{diff > 0 ? `+${formatEGP(diff)}` : formatEGP(diff)} ج.م</span>
                  </div>
                </div>
              </div>

              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${isHigher ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{
                    width: `${Math.min(100, Math.max(15, (o.unitCost / (stdUnitCost * 1.5)) * 100))}%`,
                  }}
                ></div>
              </div>

              <div className="pt-1 flex justify-end">
                <Link
                  to={`/manufacturing/orders/${o.id}`}
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>تحليل التكلفة التفصيلي</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
