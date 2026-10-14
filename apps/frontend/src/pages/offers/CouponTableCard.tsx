import React from 'react';

export interface Coupon {
  id: string;
  name: string;
  code: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  usageCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

export type StatusBadge = { label: string; color: string };

interface CouponTableCardProps {
  coupons: Coupon[];
  formatDate: (d: string) => string;
  getCouponStatus: (c: Coupon) => StatusBadge;
  getTypeText: (t: string) => string;
  formatPrice: (n: number) => string;
  t: (key: string) => string;
}

export const CouponTableCard: React.FC<CouponTableCardProps> = ({
  coupons,
  formatDate,
  getCouponStatus,
  getTypeText,
  formatPrice,
  t,
}) => (
  <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
    <div className="overflow-x-auto">
      <table className="w-full text-right text-xs">
        <thead className="bg-muted/15 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <tr>
            <th className="py-2.5 px-4">{t('offersReview.tableCode')}</th>
            <th className="py-2.5 px-4">{t('offersReview.tableName')}</th>
            <th className="py-2.5 px-4">{t('offersReview.tableType')}</th>
            <th className="py-2.5 px-4">{t('offersReview.tableValue')}</th>
            <th className="py-2.5 px-4">{t('offersReview.tableUsage')}</th>
            <th className="py-2.5 px-4">{t('offersReview.tablePeriod')}</th>
            <th className="py-2.5 px-4 text-center">{t('offersReview.tableStatus')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 font-medium">
          {coupons.map((coupon) => {
            const status = getCouponStatus(coupon);
            return (
              <tr key={coupon.id} className="hover:bg-muted/10 transition-colors">
                <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                  <span className="px-2 py-0.5 rounded bg-muted/30 border border-border/50 text-xs">
                    {coupon.code}
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  <div className="font-semibold text-foreground text-xs">{coupon.name}</div>
                  {coupon.description && (
                    <div className="text-[10px] text-muted-foreground truncate max-w-xs">{coupon.description}</div>
                  )}
                </td>
                <td className="py-2.5 px-4 text-muted-foreground text-xs">{getTypeText(coupon.type)}</td>
                <td className="py-2.5 px-4 font-mono tabular-nums font-bold text-foreground">
                  {coupon.type === 'PERCENTAGE'
                    ? `${coupon.value}%`
                    : coupon.type === 'FIXED_AMOUNT'
                    ? formatPrice(coupon.value)
                    : '—'}
                </td>
                <td className="py-2.5 px-4 font-mono tabular-nums">
                  <div className="flex items-center gap-2">
                    <span>
                      {coupon.usageCount}
                      {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                    </span>
                    {coupon.usageLimit > 0 && (
                      <div className="w-12 bg-muted/40 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                  <div>{formatDate(coupon.validFrom)}</div>
                  <div className="text-[10px]">→ {formatDate(coupon.validTo)}</div>
                </td>
                <td className="py-2.5 px-4 text-center">
                  <span className={`inline-block font-mono text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default CouponTableCard;
