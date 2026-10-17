import React from "react";
import { Calculator } from "lucide-react";
import { OrderDetailsType } from "../../types";

interface TurboCostComparisonCardProps {
  order: OrderDetailsType;
  shippingComparison: any;
  loadingComparison: boolean;
  canManageShipments: boolean;
  onCalculateShipping: () => void;
  formatPrice: (amount: number, currency?: string) => string;
}

export const TurboCostComparisonCard: React.FC<TurboCostComparisonCardProps> = ({
  order,
  shippingComparison,
  loadingComparison,
  canManageShipments,
  onCalculateShipping,
  formatPrice,
}) => {
  if (!shippingComparison && !(order.shipping > 0)) return null;

  return (
    <div className="bg-card rounded-xl border border-border/70 p-4 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1">
        <Calculator size={14} className="text-primary" />
        <span>مقارنة تكلفة الشحن:</span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center py-1 border-b border-border/30">
          <span className="font-medium text-muted-foreground">السعر الفعلي من Turbo:</span>
          {shippingComparison?.actualCost ? (
            <span className="font-bold font-mono tabular-nums text-primary">
              {formatPrice(shippingComparison.actualCost, order.currency)}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono">غير متوفر</span>
              {canManageShipments && (
                <button
                  type="button"
                  onClick={onCalculateShipping}
                  disabled={loadingComparison}
                  className="px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {loadingComparison ? "جاري الحساب…" : "حساب السعر"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center py-1 border-b border-border/30">
          <span className="font-medium text-muted-foreground">السعر المحدد للعميل:</span>
          <span className="font-bold font-mono tabular-nums text-foreground">
            {formatPrice(order.shipping, order.currency)}
          </span>
        </div>

        {shippingComparison && (
          <div
            className={`flex justify-between items-center p-2 rounded-lg border ${
              shippingComparison.difference > 0
                ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                : shippingComparison.difference < 0
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted/30 border-border/50 text-muted-foreground"
            }`}
          >
            <span className="font-bold">فرق التكلفة:</span>
            <span className="font-bold font-mono tabular-nums">
              {shippingComparison.difference > 0 ? "+" : ""}
              {formatPrice(shippingComparison.difference, order.currency)}
              {shippingComparison.difference > 0 && " (خسارة شحن)"}
              {shippingComparison.difference < 0 && " (ربح شحن)"}
              {shippingComparison.difference === 0 && " (مطابق)"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
