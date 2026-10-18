import React from "react";
import { ShoppingBag } from "lucide-react";
import { useDateFormat } from "../../../../hooks/useDateFormat";
import type { CustomerFirstOrderInfo } from "../../types";

export interface SessionFirstOrderSectionProps {
  firstOrderInfo?: CustomerFirstOrderInfo | null;
}

export const SessionFirstOrderSection: React.FC<SessionFirstOrderSectionProps> = ({
  firstOrderInfo,
}) => {
  const { formatDateTime } = useDateFormat();

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
        <ShoppingBag className="h-3.5 w-3.5 text-emerald-500" />
        <span>سجل طلبات العميل (أول طلب)</span>
      </div>

      <div className="mt-2 text-xs">
        {firstOrderInfo?.isFirstOrder ? (
          <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>هذا هو أول طلب للعميل على المتجر (عميل جديد).</span>
          </div>
        ) : firstOrderInfo?.firstOrderAt ? (
          <div className="space-y-1 text-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">تاريخ أول طلب:</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {formatDateTime(firstOrderInfo.firstOrderAt)}
              </span>
            </div>
            {firstOrderInfo.firstOrderNumber && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">رقم أول طلب:</span>
                <span className="font-mono text-xs font-semibold tabular-nums text-primary">
                  #{firstOrderInfo.firstOrderNumber}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">إجمالي الطلبات السابقة:</span>
              <span className="font-mono font-bold tabular-nums text-foreground">
                {firstOrderInfo.totalOrdersCount} طلبات
              </span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">
            لا توجد بيانات سابقة مسجلة لهذا العميل.
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionFirstOrderSection;
