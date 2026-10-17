import React from "react";
import {
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Banknote,
} from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";

interface ShipmentStatsBarProps {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  returned: number;
  pendingRemittanceAmount: number;
}

export const ShipmentStatsBar: React.FC<ShipmentStatsBarProps> = ({
  totalShipments,
  inTransit,
  delivered,
  returned,
  pendingRemittanceAmount,
}) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
      {/* 1. Total */}
      <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
          <Truck className="h-3.5 w-3.5 text-primary" />
          <span>إجمالي الشحنات</span>
        </div>
        <p className="text-base sm:text-lg font-bold text-foreground mt-0.5 font-mono tabular-nums">
          {totalShipments}
        </p>
      </div>

      {/* 2. In Transit */}
      <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
          <Clock className="h-3.5 w-3.5 text-indigo-500" />
          <span>قيد التوصيل</span>
        </div>
        <p className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono tabular-nums">
          {inTransit}
        </p>
      </div>

      {/* 3. Delivered */}
      <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>تم التسليم</span>
        </div>
        <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono tabular-nums">
          {delivered}
        </p>
      </div>

      {/* 4. Returned */}
      <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span>مرتجع / ملغي</span>
        </div>
        <p className="text-base sm:text-lg font-bold text-destructive mt-0.5 font-mono tabular-nums">
          {returned}
        </p>
      </div>

      {/* 5. Pending Remittance */}
      <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-card border border-border/70 shadow-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
          <Banknote className="h-3.5 w-3.5 text-amber-500" />
          <span>معلق التحصيل</span>
        </div>
        <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 font-mono tabular-nums">
          {formatPrice(pendingRemittanceAmount || 0)}
        </p>
      </div>
    </div>
  );
};

export default ShipmentStatsBar;
