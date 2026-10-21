import React from 'react';

interface SettlementKpiStripProps {
  totalPending: number;
  totalDelivered: number;
  totalSettled: number;
  formatPrice: (price: number) => string;
  t: (key: string, fallback?: string) => string;
}

export const SettlementKpiStrip: React.FC<SettlementKpiStripProps> = ({
  totalPending,
  totalDelivered,
  totalSettled,
  formatPrice,
  t,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
        <div className="text-xs text-muted-foreground">
          {t('shippingSettlement.pendingAmount', 'مستحق التحصيل من الشركات')}
        </div>
        <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
          {formatPrice(totalPending)}
        </div>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
        <div className="text-xs text-muted-foreground">
          {t('shippingSettlement.deliveredCount', 'شحنات مسلّمة بانتظار التسوية')}
        </div>
        <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-foreground">
          {totalDelivered}
        </div>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
        <div className="text-xs text-muted-foreground">
          {t('shippingSettlement.settledAmount', 'تمت تسويته')}
        </div>
        <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
          {formatPrice(totalSettled)}
        </div>
      </div>
    </div>
  );
};
