import React from 'react';
import { Tag } from 'lucide-react';
import { formatStorefrontCurrency } from '../../utils/currency';
import type { PdpQuickOrderController } from './usePdpQuickOrderController';

export const QuickOrderSummary: React.FC<{
  ctrl: PdpQuickOrderController;
}> = ({ ctrl }) => {
  return (
    <>
      {ctrl.showOrderSummaryBlock ? (
        <div
          className={`space-y-2.5 border-t border-border/60 ${
            ctrl.isCompactMergedQuickOrder
              ? 'pt-2.5'
              : ctrl.isMenShoesQuickOrder
                ? 'pt-2'
                : 'pt-3'
          }`}
        >
          {ctrl.effectiveGovernorateField.enabled &&
          (ctrl.isShippingLoading || Boolean(ctrl.resolvedGovernorate || ctrl.normalizedGovValue || ctrl.formData?.governorate)) ? (
            <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <span>
                {ctrl.shippingLabel}
                {ctrl.shippingMethodSummaryLabel ? (
                  <span className="mt-1 block text-[11px] text-muted-foreground/80">
                    {ctrl.shippingMethodSummaryLabel}
                  </span>
                ) : null}
              </span>
              <span className="font-semibold text-foreground">
                {ctrl.isShippingLoading ? (
                  ctrl.prefersArabicCopy ? 'جارٍ الحساب...' : 'Calculating...'
                ) : ctrl.isFreeShippingEligible ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    {ctrl.shippingCost > 0 ? (
                      <span className="text-xs text-muted-foreground/60 line-through">
                        {formatStorefrontCurrency(ctrl.shippingCost, ctrl.currency)}
                      </span>
                    ) : null}
                    <span>{ctrl.prefersArabicCopy ? 'مجاني' : 'Free'}</span>
                  </span>
                ) : (
                  formatStorefrontCurrency(ctrl.shippingCost, ctrl.currency)
                )}
              </span>
            </div>
          ) : ctrl.configuredShippingSummaryText ? (
            <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <span>{ctrl.configuredShippingSummaryText}</span>
              <span className="font-semibold text-foreground">
                {ctrl.staticShippingValueText}
              </span>
            </div>
          ) : null}

          {ctrl.storePromoDiscount > 0 ? (
            <div className="flex items-center justify-between gap-4 text-sm font-medium">
              <span className="text-emerald-700 dark:text-emerald-400">
                {ctrl.storePromoTier?.label ||
                  (ctrl.prefersArabicCopy ? 'عرض الكمية' : 'Quantity Offer')}
              </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                -{formatStorefrontCurrency(ctrl.storePromoDiscount, ctrl.currency)}
              </span>
            </div>
          ) : null}

          {ctrl.walletDiscount > 0 &&
          ctrl.walletPaymentSettings?.showDiscountBadge !== false ? (
            <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>
                  {ctrl.prefersArabicCopy
                    ? ctrl.paymentMethod === 'card'
                      ? `خصم الدفع بالبطاقة / فيزا (${ctrl.walletDiscountPercent}%)`
                      : `خصم الدفع بالمحفظة (${ctrl.walletDiscountPercent}%)`
                    : ctrl.paymentMethod === 'card'
                      ? `Card payment discount (${ctrl.walletDiscountPercent}%)`
                      : `Wallet payment discount (${ctrl.walletDiscountPercent}%)`}
                </span>
              </span>
              <span className="font-semibold text-emerald-600">
                -{formatStorefrontCurrency(ctrl.walletDiscount, ctrl.currency)}
              </span>
            </div>
          ) : null}

          {ctrl.shouldRenderInlineTotalRow ? (
            <div
              className={`flex items-center justify-between gap-4 text-base font-black ${
                ctrl.isRedlineAutoQuickOrder
                  ? 'rounded-xl border border-red-200/80 bg-red-50/40 px-3.5 py-2.5 dark:border-red-900/30 dark:bg-red-950/20'
                  : ''
              }`}
            >
              <span className="text-foreground">{ctrl.totalLabel}</span>
              <span
                className={
                  ctrl.isRedlineAutoQuickOrder
                    ? 'text-lg font-black text-red-600 dark:text-red-400 tabular-nums'
                    : 'text-foreground'
                }
              >
                {formatStorefrontCurrency(ctrl.total, ctrl.currency)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {ctrl.minimumOrder.blocked ? (
        <div className="space-y-2 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <p className="text-sm font-semibold leading-6">
            {ctrl.minimumOrder.message}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-amber-200">
            <div
              className="h-full rounded-full bg-amber-600 transition-[width] duration-500"
              style={{ width: `${ctrl.minimumOrder.progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
};
