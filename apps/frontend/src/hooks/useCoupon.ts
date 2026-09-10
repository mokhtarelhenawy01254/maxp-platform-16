import { useState, useCallback } from "react";
import { storefrontApi } from "../utils/storefrontApi";

interface UseCouponProps {
  companyId: string;
  cartId?: string; // Kept for future use if API requires it
  onSuccess?: (discount: number, code: string) => void;
  onError?: (error: string) => void;
}

export const useCoupon = ({ companyId, onSuccess, onError }: UseCouponProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const applyCoupon = useCallback(async (code: string, orderAmount: number = 0) => {
    if (!code) return;
    
    setIsValidating(true);
    setError(null);
    
    try {
      const response = await storefrontApi.validateCoupon(companyId, code, orderAmount);
      
      // Response structure might vary, adapting to common patterns
      if (response && (response.success || response.valid)) {
        const discountAmount = Number(
          response.data?.discountAmount ??
          response.discountAmount ??
          response.discount ??
          (response.valid ? orderAmount * 0.15 : 0)
        );
        
        setAppliedCoupon(code);
        onSuccess?.(discountAmount, code);
      } else {
        const errorMsg = response.message || "Invalid coupon code";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to validate coupon";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsValidating(false);
    }
  }, [companyId, onSuccess, onError]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setError(null);
  }, []);

  return {
    applyCoupon,
    removeCoupon,
    isValidating,
    error,
    appliedCoupon
  };
};
