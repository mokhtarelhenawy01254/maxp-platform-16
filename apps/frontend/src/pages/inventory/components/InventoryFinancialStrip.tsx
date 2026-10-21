import React from 'react';
import { DollarSign, TrendingUp, ArrowUpRight, Boxes, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';

interface InventoryFinancialStripProps {
  totalValue: number;
  totalStock: number;
  potentialRevenue: number;
  potentialProfit: number;
  profitMargin: number;
  totalProducts: number;
  lowCount: number;
  outCount: number;
  loading: boolean;
  formatPrice: (price: number) => string;
}

export const InventoryFinancialStrip: React.FC<InventoryFinancialStripProps> = ({
  totalValue,
  totalStock,
  potentialRevenue,
  potentialProfit,
  profitMargin,
  totalProducts,
  lowCount,
  outCount,
  loading,
  formatPrice,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card className="border-border/70 shadow-2xs bg-card">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>قيمة المخزون (بالتكلفة)</span>
            <DollarSign className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-foreground">
            {loading ? '...' : formatPrice(totalValue)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span>متوسط القطعة:</span>
            <span className="font-mono text-foreground font-semibold">
              {totalStock > 0 ? formatPrice(totalValue / totalStock) : formatPrice(0)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-2xs bg-card">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إيرادات بيع متوقعة</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {loading ? '...' : formatPrice(potentialRevenue)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span>هامش الربح:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              {profitMargin}%
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-2xs bg-card">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>أرباح تقديرية للمخزون</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-primary">
            {loading ? '...' : formatPrice(potentialProfit)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            صافي الربح عند تصفية الرصيد
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-2xs bg-card">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي الوحدات بالمخزن</span>
            <Boxes className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-foreground">
            {loading ? '...' : totalStock.toLocaleString('en-US')}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            موزعة على {totalProducts} منتج
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-2xs bg-card">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>تنبيهات النواقص</span>
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {lowCount}
            </span>
            <span className="text-xs text-muted-foreground">منخفض /</span>
            <span className="text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {outCount}
            </span>
            <span className="text-xs text-muted-foreground">نافذ</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            تحتاج إعادة طلب عاجلة
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
