import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useCheckoutStore } from '../../store/useCheckoutStore';
import { useStorefrontSettings } from '../../hooks/useStorefrontSettings';
import { useStorefrontTheme } from '../../engine/ThemeProvider';
import { storefrontApi } from '../../../utils/storefrontApi';
import { formatStorefrontCurrency } from '../../utils/currency';

export interface CartCouponRowProps {
  cartTotal: number;
  currency: string;
  shopPath: string;
  couponPlaceholder?: string;
  couponButtonText?: string;
  continueShoppingText?: string;
}

export const CartCouponRow: React.FC<CartCouponRowProps> = ({
  cartTotal,
  currency,
  shopPath,
  couponPlaceholder,
  couponButtonText,
  continueShoppingText,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { appliedCoupon, setAppliedCoupon, clearAppliedCoupon } = useCheckoutStore();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const isRtl = theme.direction === 'rtl';

  const placeholder = couponPlaceholder || (isRtl ? 'كود الخصم' : 'Coupon code');
  const buttonText = couponButtonText || (isRtl ? 'تطبيق الكوبون' : 'Apply coupon');
  const continueText = continueShoppingText || (isRtl ? 'متابعة التسوق' : 'Continue Shopping');

  const handleApply = async () => {
    const code = inputCode.trim();
    if (!code) {
      toast.error(isRtl ? 'يرجى إدخال كود الخصم أولاً' : 'Please enter a coupon code first');
      return;
    }

    const companyId = storefrontSettings?.company?.id;
    if (!companyId) {
      toast.error(isRtl ? 'بيانات المتجر غير مكتملة' : 'Store data not available');
      return;
    }

    try {
      setIsLoading(true);
      const normalizedCode = code.toUpperCase();
      const response = await storefrontApi.validateCoupon(companyId, normalizedCode, cartTotal);
      const coupon = response?.data?.coupon;
      if (coupon) {
        const discountAmount = Number(response?.data?.discountAmount || 0);
        const finalAmount = Number(response?.data?.finalAmount || cartTotal);
        setAppliedCoupon({
          code: String(coupon.code || normalizedCode).trim().toUpperCase(),
          name: typeof coupon.name === 'string' ? coupon.name : '',
          discountAmount,
          finalAmount,
          orderAmount: cartTotal,
        });
        setInputCode('');
        toast.success(isRtl ? 'تم تطبيق كود الخصم بنجاح ✓' : 'Coupon applied successfully ✓');
      } else {
        toast.error(isRtl ? 'كود الخصم غير صالح أو منتهي الصلاحية' : 'Invalid or expired coupon code');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        (isRtl ? 'تعذر التحقق من كود الخصم' : 'Failed to validate coupon');
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    clearAppliedCoupon();
    toast.info(isRtl ? 'تمت إزالة كود الخصم' : 'Coupon removed');
  };

  return (
    <div className="flex flex-col gap-4 border-t border-border bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      {appliedCoupon ? (
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <span>🏷️</span>
            <span>{appliedCoupon.code}</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              (-{formatStorefrontCurrency(appliedCoupon.discountAmount, currency)})
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-muted-foreground underline transition-colors hover:text-destructive"
          >
            {isRtl ? 'إزالة الكوبون' : 'Remove coupon'}
          </button>
        </div>
      ) : (
        <div className="flex w-full items-center gap-2 sm:max-w-md">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleApply();
              }
            }}
            placeholder={placeholder}
            className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-secondary px-4 text-sm font-semibold text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            {isLoading ? (isRtl ? 'جارٍ التحقق...' : 'Checking...') : buttonText}
          </button>
        </div>
      )}

      <div className="flex items-center justify-end">
        <Link
          to={shopPath}
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {continueText}
        </Link>
      </div>
    </div>
  );
};

export default CartCouponRow;
