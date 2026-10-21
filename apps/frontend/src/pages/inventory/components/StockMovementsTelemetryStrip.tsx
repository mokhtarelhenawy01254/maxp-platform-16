import React from 'react';
import { Layers, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';

interface StockMovementsTelemetryStripProps {
  totalCount: number;
  inCount: number;
  outCount: number;
  adjustCount: number;
  transferCount: number;
  loading: boolean;
}

export const StockMovementsTelemetryStrip: React.FC<StockMovementsTelemetryStripProps> = ({
  totalCount,
  inCount,
  outCount,
  adjustCount,
  transferCount,
  loading,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="border-border/70 shadow-2xs bg-card">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي الحركات</span>
            <Layers className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-foreground">
            {loading ? '...' : totalCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            كل القيود المسجلة
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-2xs bg-card">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>حركات وارد (IN)</span>
            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {loading ? '...' : inCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            شحنات توريد واستلام
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-2xs bg-card">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>حركات صادر (OUT)</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {loading ? '...' : outCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            صرف طلبيات وشحن
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-2xs bg-card">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>تسويات ومناقلات</span>
            <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-foreground">
            {loading ? '...' : adjustCount + transferCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            تعديل جرد ({adjustCount}) / تحويل ({transferCount})
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
