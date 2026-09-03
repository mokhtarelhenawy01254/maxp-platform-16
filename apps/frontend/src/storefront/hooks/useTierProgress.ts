import { useCallback } from "react";
import { useCheckoutStore } from "../store/useCheckoutStore";
import { storefrontApi } from "../../utils/storefrontApi";
import { isValidStorefrontPhone, normalizeEgyptianPhone } from "../utils/phoneValidation";

/**
 * جلب مستوى العميل + المزايا + التقدم (بناءً على رقم الهاتف في نموذج الدفع)
 */
export function useTierProgress() {
  const tierProgress = useCheckoutStore((s) => s.tierProgress);
  const setTierProgress = useCheckoutStore((s) => s.setTierProgress);

  const refreshTierProgress = useCallback(
    async (phone: string) => {
      const raw = String(phone || "").trim();
      if (!isValidStorefrontPhone(raw)) {
        setTierProgress(null);
        return null;
      }
      const normalized = normalizeEgyptianPhone(raw);
      try {
        const res = await storefrontApi.getTierProgress(normalized);
        const data = res?.data ?? null;
        setTierProgress(data);
        return data;
      } catch (e) {
        setTierProgress(null);
        return null;
      }
    },
    [setTierProgress],
  );

  const clearTierProgress = useCallback(() => {
    setTierProgress(null);
  }, [setTierProgress]);

  return { tierProgress, refreshTierProgress, clearTierProgress };
}
